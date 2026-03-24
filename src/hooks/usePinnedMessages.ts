import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PinnedMessage, ChatMessage } from '@/types/community';
import { RealtimeChannel } from '@supabase/supabase-js';

export function usePinnedMessages(roomId: string | null) {
  const [pinnedMessages, setPinnedMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Fetch pinned messages for the room
  const fetchPinnedMessages = useCallback(async () => {
    if (!roomId) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('pinned_messages')
        .select(`
          *,
          message:chat_messages(
            *,
            message_reactions(*)
          )
        `)
        .eq('room_id', roomId)
        .order('pinned_at', { ascending: false });

      if (error) throw error;

      // Fetch user profiles for pinned messages
      const messages = (data || [])
        .filter(pm => pm.message)
        .map(pm => ({
          ...pm.message,
          isPinned: true,
          reactions: pm.message.message_reactions || [],
        })) as ChatMessage[];

      // Fetch profiles and admin status
      const userIds = [...new Set(messages.map(m => m.user_id))];
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url, is_anonymous')
          .in('user_id', userIds),
        supabase
          .from('user_roles')
          .select('user_id, role')
          .in('user_id', userIds)
          .eq('role', 'admin'),
      ]);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      const adminSet = new Set(roles?.map(r => r.user_id) || []);

      const messagesWithProfiles = messages.map(m => {
        const p = profileMap.get(m.user_id);
        return {
          ...m,
          user_profile: {
            full_name: p?.is_anonymous ? 'Anonymous' : (p?.full_name || null),
            avatar_url: p?.is_anonymous ? null : (p?.avatar_url || null),
            is_anonymous: p?.is_anonymous || false,
            is_admin: adminSet.has(m.user_id),
          },
        };
      });

      setPinnedMessages(messagesWithProfiles);
    } catch (err) {
      console.error('Error fetching pinned messages:', err);
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  // Pin a message
  const pinMessage = useCallback(async (messageId: string) => {
    if (!user || !roomId) throw new Error('Must be authenticated and in a room');

    const { error } = await supabase
      .from('pinned_messages')
      .insert({
        message_id: messageId,
        room_id: roomId,
        pinned_by: user.id,
      });

    if (error) throw error;
  }, [user, roomId]);

  // Unpin a message
  const unpinMessage = useCallback(async (messageId: string) => {
    if (!user) throw new Error('Must be authenticated');

    const { error } = await supabase
      .from('pinned_messages')
      .delete()
      .eq('message_id', messageId);

    if (error) throw error;
  }, [user]);

  // Check if a message is pinned
  const isMessagePinned = useCallback((messageId: string): boolean => {
    return pinnedMessages.some(m => m.id === messageId);
  }, [pinnedMessages]);

  // Subscribe to pinned messages changes
  useEffect(() => {
    if (!roomId) return;

    fetchPinnedMessages();

    const channel = supabase
      .channel(`pinned-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pinned_messages',
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          // Refresh pinned messages on any change
          fetchPinnedMessages();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [roomId, fetchPinnedMessages]);

  return {
    pinnedMessages,
    loading,
    pinMessage,
    unpinMessage,
    isMessagePinned,
    refreshPinnedMessages: fetchPinnedMessages,
  };
}
