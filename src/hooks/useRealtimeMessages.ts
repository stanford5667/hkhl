import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ChatMessage, MessageReaction } from '@/types/community';
import { useAuth } from '@/contexts/AuthContext';
import { extractTickers } from '@/utils/tickerParser';
import { RealtimeChannel } from '@supabase/supabase-js';

const MESSAGES_PER_PAGE = 50;

export function useRealtimeMessages(roomId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Cache for user profiles to avoid repeated fetches
  const profileCacheRef = useRef<Map<string, { full_name: string | null; avatar_url: string | null }>>(new Map());

  // Fetch user profile and cache it
  const fetchUserProfile = useCallback(async (userId: string) => {
    if (profileCacheRef.current.has(userId)) {
      return profileCacheRef.current.get(userId)!;
    }

    const { data } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('user_id', userId)
      .single();

    const profile = data || { full_name: null, avatar_url: null };
    profileCacheRef.current.set(userId, profile);
    return profile;
  }, []);

  // Fetch initial messages
  const fetchMessages = useCallback(async (beforeTimestamp?: string) => {
    if (!roomId) return;

    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('chat_messages')
        .select(`
          *,
          message_reactions (*)
        `)
        .eq('room_id', roomId)
        .order('created_at', { ascending: false })
        .limit(MESSAGES_PER_PAGE);

      if (beforeTimestamp) {
        query = query.lt('created_at', beforeTimestamp);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Fetch profiles for all unique user IDs
      const userIds = [...new Set((data || []).map(msg => msg.user_id))];
      const profiles = await Promise.all(userIds.map(id => fetchUserProfile(id)));
      const profileMap = new Map(userIds.map((id, i) => [id, profiles[i]]));

      const messagesWithData = (data || []).map(msg => ({
        ...msg,
        reactions: msg.message_reactions || [],
        user_profile: profileMap.get(msg.user_id) || { full_name: null, avatar_url: null },
      })) as ChatMessage[];

      if (beforeTimestamp) {
        setMessages(prev => [...prev, ...messagesWithData.reverse()]);
      } else {
        setMessages(messagesWithData.reverse());
      }

      setHasMore(messagesWithData.length === MESSAGES_PER_PAGE);
    } catch (err: any) {
      console.error('Error fetching messages:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [roomId, fetchUserProfile]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!roomId) return;

    fetchMessages();

    // Set up realtime subscription
    const channel = supabase
      .channel(`room-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          const newMessage = payload.new as ChatMessage;
          newMessage.reactions = [];
          // Fetch profile for the new message
          const profile = await fetchUserProfile(newMessage.user_id);
          newMessage.user_profile = profile;
          setMessages(prev => [...prev, newMessage]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const updatedMessage = payload.new as ChatMessage;
          setMessages(prev =>
            prev.map(msg =>
              msg.id === updatedMessage.id
                ? { ...updatedMessage, reactions: msg.reactions }
                : msg
            )
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const deletedId = payload.old.id;
          setMessages(prev => prev.filter(msg => msg.id !== deletedId));
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_reactions',
        },
        (payload) => {
          // Refresh reactions for the affected message
          const newRecord = payload.new as { message_id?: string } | null;
          const oldRecord = payload.old as { message_id?: string } | null;
          const messageId = newRecord?.message_id || oldRecord?.message_id;
          if (messageId) {
            refreshMessageReactions(messageId);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [roomId, fetchMessages]);

  const refreshMessageReactions = async (messageId: string) => {
    const { data } = await supabase
      .from('message_reactions')
      .select('*')
      .eq('message_id', messageId);

    if (data) {
      setMessages(prev =>
        prev.map(msg =>
          msg.id === messageId
            ? { ...msg, reactions: data as MessageReaction[] }
            : msg
        )
      );
    }
  };

  const sendMessage = async (content: string, replyTo?: string) => {
    if (!user || !roomId) throw new Error('Must be authenticated and in a room');

    const detectedTickers = extractTickers(content);

    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        room_id: roomId,
        user_id: user.id,
        content,
        detected_tickers: detectedTickers,
        reply_to: replyTo || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data as ChatMessage;
  };

  const editMessage = async (messageId: string, newContent: string) => {
    if (!user) throw new Error('Must be authenticated');

    const detectedTickers = extractTickers(newContent);

    const { error } = await supabase
      .from('chat_messages')
      .update({
        content: newContent,
        detected_tickers: detectedTickers,
        is_edited: true,
      })
      .eq('id', messageId)
      .eq('user_id', user.id);

    if (error) throw error;
  };

  const deleteMessage = async (messageId: string, isAdminDelete = false) => {
    if (!user) throw new Error('Must be authenticated');

    let query = supabase
      .from('chat_messages')
      .delete()
      .eq('id', messageId);

    // Admin can delete any message; regular users can only delete their own
    if (!isAdminDelete) {
      query = query.eq('user_id', user.id);
    }

    const { error } = await query;
    if (error) throw error;
  };

  const addReaction = async (messageId: string, emoji: string) => {
    if (!user) throw new Error('Must be authenticated');

    const { error } = await supabase
      .from('message_reactions')
      .insert({
        message_id: messageId,
        user_id: user.id,
        emoji,
      });

    // Ignore duplicate errors (user already reacted with this emoji)
    if (error && !error.message.includes('duplicate')) throw error;
  };

  const removeReaction = async (messageId: string, emoji: string) => {
    if (!user) throw new Error('Must be authenticated');

    const { error } = await supabase
      .from('message_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', user.id)
      .eq('emoji', emoji);

    if (error) throw error;
  };

  const setMessagePremium = async (messageId: string, isPremium: boolean) => {
    const { error } = await supabase
      .from('chat_messages')
      .update({ is_premium: isPremium })
      .eq('id', messageId);

    if (error) throw error;
  };

  const loadMoreMessages = () => {
    if (!hasMore || loading || messages.length === 0) return;
    const oldestMessage = messages[0];
    fetchMessages(oldestMessage.created_at);
  };

  return {
    messages,
    loading,
    hasMore,
    error,
    sendMessage,
    editMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    setMessagePremium,
    loadMoreMessages,
    refreshMessages: fetchMessages,
  };
}
