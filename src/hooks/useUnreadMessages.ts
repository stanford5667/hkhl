import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { RoomReadReceipt } from '@/types/community';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UnreadCount {
  roomId: string;
  count: number;
  lastMessageId: string | null;
}

export function useUnreadMessages() {
  const [unreadCounts, setUnreadCounts] = useState<Map<string, UnreadCount>>(new Map());
  const [readReceipts, setReadReceipts] = useState<Map<string, RoomReadReceipt>>(new Map());
  const { user } = useAuth();
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Fetch read receipts and calculate unread counts
  const fetchUnreadCounts = useCallback(async () => {
    if (!user) return;

    try {
      // Fetch user's read receipts
      const { data: receipts } = await supabase
        .from('room_read_receipts')
        .select('*')
        .eq('user_id', user.id);

      if (receipts) {
        const receiptMap = new Map<string, RoomReadReceipt>();
        receipts.forEach(r => receiptMap.set(r.room_id, r as RoomReadReceipt));
        setReadReceipts(receiptMap);
      }

      // Fetch rooms and their latest messages
      const { data: rooms } = await supabase
        .from('chat_rooms')
        .select('id');

      if (!rooms) return;

      // For each room, count messages after last read
      const counts = new Map<string, UnreadCount>();

      await Promise.all(
        rooms.map(async (room) => {
          const receipt = receipts?.find(r => r.room_id === room.id);
          
          let query = supabase
            .from('chat_messages')
            .select('id, created_at', { count: 'exact', head: false })
            .eq('room_id', room.id)
            .neq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1);

          if (receipt?.last_read_at) {
            query = query.gt('created_at', receipt.last_read_at);
          }

          const { count, data: messages } = await query;

          if (count && count > 0) {
            counts.set(room.id, {
              roomId: room.id,
              count: count,
              lastMessageId: messages?.[0]?.id || null,
            });
          }
        })
      );

      setUnreadCounts(counts);
    } catch (err) {
      console.error('Error fetching unread counts:', err);
    }
  }, [user]);

  // Mark room as read
  const markRoomAsRead = useCallback(async (roomId: string, lastMessageId?: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('room_read_receipts')
        .upsert({
          room_id: roomId,
          user_id: user.id,
          last_read_message_id: lastMessageId || null,
          last_read_at: new Date().toISOString(),
        }, {
          onConflict: 'room_id,user_id',
        });

      if (error) throw error;

      // Update local state
      setUnreadCounts(prev => {
        const next = new Map(prev);
        next.delete(roomId);
        return next;
      });
    } catch (err) {
      console.error('Error marking room as read:', err);
    }
  }, [user]);

  // Subscribe to new messages for unread updates
  useEffect(() => {
    if (!user) return;

    fetchUnreadCounts();

    const channel = supabase
      .channel('unread-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        (payload) => {
          const newMessage = payload.new as { room_id: string; user_id: string; id: string };
          
          // Don't count own messages
          if (newMessage.user_id === user.id) return;

          setUnreadCounts(prev => {
            const next = new Map(prev);
            const current = next.get(newMessage.room_id);
            next.set(newMessage.room_id, {
              roomId: newMessage.room_id,
              count: (current?.count || 0) + 1,
              lastMessageId: newMessage.id,
            });
            return next;
          });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [user, fetchUnreadCounts]);

  const getUnreadCount = useCallback((roomId: string): number => {
    return unreadCounts.get(roomId)?.count || 0;
  }, [unreadCounts]);

  const getTotalUnreadCount = useCallback((): number => {
    let total = 0;
    unreadCounts.forEach(c => total += c.count);
    return total;
  }, [unreadCounts]);

  return {
    unreadCounts,
    getUnreadCount,
    getTotalUnreadCount,
    markRoomAsRead,
    refreshUnreadCounts: fetchUnreadCounts,
  };
}
