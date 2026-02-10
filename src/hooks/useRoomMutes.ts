import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface MutedUser {
  id: string;
  room_id: string;
  user_id: string;
  muted_by: string;
  reason: string | null;
  created_at: string;
}

export function useRoomMutes(roomId: string | null) {
  const [mutedUsers, setMutedUsers] = useState<MutedUser[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const { user } = useAuth();

  const fetchMutedUsers = useCallback(async () => {
    if (!roomId) return;
    const { data } = await supabase
      .from('room_muted_users')
      .select('*')
      .eq('room_id', roomId);
    setMutedUsers((data || []) as MutedUser[]);
  }, [roomId]);

  useEffect(() => {
    fetchMutedUsers();
  }, [fetchMutedUsers]);

  useEffect(() => {
    if (!user) {
      setIsMuted(false);
      return;
    }
    setIsMuted(mutedUsers.some(m => m.user_id === user.id));
  }, [mutedUsers, user]);

  const muteUser = async (userId: string, reason?: string) => {
    if (!user || !roomId) throw new Error('Not authenticated');
    const { error } = await supabase
      .from('room_muted_users')
      .insert({ room_id: roomId, user_id: userId, muted_by: user.id, reason: reason || null });
    if (error) throw error;
    await fetchMutedUsers();
  };

  const unmuteUser = async (userId: string) => {
    if (!roomId) return;
    const { error } = await supabase
      .from('room_muted_users')
      .delete()
      .eq('room_id', roomId)
      .eq('user_id', userId);
    if (error) throw error;
    await fetchMutedUsers();
  };

  return { mutedUsers, isMuted, muteUser, unmuteUser, refetch: fetchMutedUsers };
}
