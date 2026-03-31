import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ChatRoom, RoomType } from '@/types/community';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/useAdmin';

export function useChatRooms() {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { isAdmin } = useAdmin();

  const fetchRooms = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('chat_rooms')
        .select('*')
        .order('member_count', { ascending: false });

      if (fetchError) throw fetchError;

      // Filter out admin-only rooms for non-admin users
      const filtered = isAdmin
        ? (data || [])
        : (data || []).filter((room: any) => !room.is_admin_only);

      setRooms(filtered as ChatRoom[]);
    } catch (err: any) {
      console.error('Error fetching chat rooms:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const createRoom = async (
    name: string,
    description: string,
    roomType: RoomType = 'public',
    ticker?: string,
    icon: string = '💬',
    isAdminOnly: boolean = false
  ) => {
    if (!user) throw new Error('Must be authenticated to create a room');

    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const { data, error } = await supabase
      .from('chat_rooms')
      .insert({
        name,
        slug,
        description,
        room_type: roomType,
        ticker: ticker || null,
        icon,
        created_by: user.id,
        is_admin_only: isAdminOnly,
      })
      .select()
      .single();

    if (error) throw error;
    
    // Refresh rooms list
    await fetchRooms();
    
    return data as ChatRoom;
  };

  const getOrCreateStockRoom = async (ticker: string, companyName: string) => {
    // Check if room already exists
    const existing = rooms.find(r => r.ticker === ticker);
    if (existing) return existing;

    // Check in database (in case not in local state yet)
    const { data: existingRoom } = await supabase
      .from('chat_rooms')
      .select('*')
      .eq('ticker', ticker)
      .single();

    if (existingRoom) return existingRoom as ChatRoom;

    // Create new stock room
    return createRoom(
      `${ticker} Discussion`,
      `Discuss ${companyName} ($${ticker}) - earnings, news, and trading ideas`,
      'stock',
      ticker,
      '📈'
    );
  };

  const getRoomsByType = (type: RoomType) => {
    return rooms.filter(room => room.room_type === type);
  };

  const setRoomPremium = async (roomId: string, isPremium: boolean) => {
    const { error } = await supabase
      .from('chat_rooms')
      .update({ is_premium: isPremium })
      .eq('id', roomId);

    if (error) throw error;
    await fetchRooms();
  };

  const updateRoomSettings = async (roomId: string, settings: { posting_mode?: string; requires_approval?: boolean }) => {
    const { error } = await supabase
      .from('chat_rooms')
      .update(settings)
      .eq('id', roomId);

    if (error) throw error;
    await fetchRooms();
  };

  const deleteRoom = async (roomId: string) => {
    const { error } = await supabase
      .from('chat_rooms')
      .delete()
      .eq('id', roomId);

    if (error) throw error;
    await fetchRooms();
  };

  const startLivestream = async (roomId: string, streamUrl: string) => {
    if (!user) throw new Error('Must be authenticated');
    const { error } = await supabase
      .from('chat_rooms')
      .update({
        is_live: true,
        live_stream_url: streamUrl,
        live_started_by: user.id,
        live_started_at: new Date().toISOString(),
      })
      .eq('id', roomId);
    if (error) throw error;
    await fetchRooms();
  };

  const stopLivestream = async (roomId: string) => {
    const { error } = await supabase
      .from('chat_rooms')
      .update({
        is_live: false,
        live_stream_url: null,
        live_started_by: null,
        live_started_at: null,
      })
      .eq('id', roomId);
    if (error) throw error;
    await fetchRooms();
  };

  return {
    rooms,
    loading,
    error,
    fetchRooms,
    createRoom,
    getOrCreateStockRoom,
    getRoomsByType,
    setRoomPremium,
    updateRoomSettings,
    deleteRoom,
    startLivestream,
    stopLivestream,
    publicRooms: getRoomsByType('public'),
    stockRooms: getRoomsByType('stock'),
  };
}
