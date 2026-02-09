import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { UserPresence, UserPresenceStatus } from '@/types/community';
import { RealtimeChannel } from '@supabase/supabase-js';

const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const PRESENCE_UPDATE_INTERVAL = 30 * 1000; // 30 seconds

export function useUserPresence(roomId?: string | null) {
  const [onlineUsers, setOnlineUsers] = useState<Map<string, UserPresence>>(new Map());
  const { user } = useAuth();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // Update presence in database
  const updatePresence = useCallback(async (status: UserPresenceStatus, currentRoomId?: string | null) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_presence')
        .upsert({
          user_id: user.id,
          status,
          current_room_id: currentRoomId ?? null,
          last_seen_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (error) console.error('Error updating presence:', error);
    } catch (err) {
      console.error('Error updating presence:', err);
    }
  }, [user]);

  // Handle user activity
  const handleActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    updatePresence('online', roomId);

    // Reset idle timeout
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
    }

    idleTimeoutRef.current = setTimeout(() => {
      updatePresence('idle', roomId);
    }, IDLE_TIMEOUT);
  }, [updatePresence, roomId]);

  // Set up presence tracking
  useEffect(() => {
    if (!user) return;

    // Initial presence
    updatePresence('online', roomId);

    // Set up activity listeners
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Periodic presence update
    updateIntervalRef.current = setInterval(() => {
      const isIdle = Date.now() - lastActivityRef.current > IDLE_TIMEOUT;
      updatePresence(isIdle ? 'idle' : 'online', roomId);
    }, PRESENCE_UPDATE_INTERVAL);

    // Subscribe to presence changes
    const channel = supabase
      .channel('presence-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_presence',
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            const oldPresence = payload.old as UserPresence;
            setOnlineUsers(prev => {
              const next = new Map(prev);
              next.delete(oldPresence.user_id);
              return next;
            });
          } else {
            const newPresence = payload.new as UserPresence;
            setOnlineUsers(prev => {
              const next = new Map(prev);
              next.set(newPresence.user_id, newPresence);
              return next;
            });
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    // Handle page visibility
    const handleVisibilityChange = () => {
      if (document.hidden) {
        updatePresence('idle', roomId);
      } else {
        handleActivity();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Handle page unload
    const handleUnload = () => {
      updatePresence('offline', null);
    };
    window.addEventListener('beforeunload', handleUnload);

    // Fetch initial presence data
    const fetchPresence = async () => {
      const { data } = await supabase
        .from('user_presence')
        .select('*')
        .neq('status', 'offline');

      if (data) {
        const presenceMap = new Map<string, UserPresence>();
        data.forEach(p => presenceMap.set(p.user_id, p as UserPresence));
        setOnlineUsers(presenceMap);
      }
    };
    fetchPresence();

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleUnload);

      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
      if (updateIntervalRef.current) clearInterval(updateIntervalRef.current);
      if (channelRef.current) supabase.removeChannel(channelRef.current);

      // Set offline on cleanup
      updatePresence('offline', null);
    };
  }, [user, roomId, updatePresence, handleActivity]);

  const getUserPresence = useCallback((userId: string): UserPresenceStatus => {
    const presence = onlineUsers.get(userId);
    if (!presence) return 'offline';
    
    // Check if presence is stale (more than 2 minutes old)
    const lastSeen = new Date(presence.last_seen_at).getTime();
    if (Date.now() - lastSeen > 2 * 60 * 1000) {
      return 'offline';
    }
    
    return presence.status;
  }, [onlineUsers]);

  return {
    onlineUsers,
    getUserPresence,
    updatePresence,
  };
}
