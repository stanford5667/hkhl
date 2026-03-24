import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ChatNotificationPref {
  id: string;
  room_id: string;
  in_app: boolean;
  email: boolean;
  sms: boolean;
}

export function useChatNotificationPreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<ChatNotificationPref[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPreferences = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('chat_notification_preferences')
        .select('*')
        .eq('user_id', user.id);
      setPreferences((data as ChatNotificationPref[]) || []);
    } catch (err) {
      console.error('Error fetching notification preferences:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const getPreference = useCallback((roomId: string): ChatNotificationPref | undefined => {
    return preferences.find(p => p.room_id === roomId);
  }, [preferences]);

  const upsertPreference = useCallback(async (
    roomId: string,
    updates: Partial<Pick<ChatNotificationPref, 'in_app' | 'email' | 'sms'>>
  ) => {
    if (!user) return;

    const existing = preferences.find(p => p.room_id === roomId);
    
    if (existing) {
      const { error } = await supabase
        .from('chat_notification_preferences')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
      if (error) throw error;
      
      setPreferences(prev => prev.map(p => 
        p.id === existing.id ? { ...p, ...updates } : p
      ));
    } else {
      const { data, error } = await supabase
        .from('chat_notification_preferences')
        .insert({
          user_id: user.id,
          room_id: roomId,
          in_app: true,
          email: false,
          sms: false,
          ...updates,
        })
        .select()
        .single();
      if (error) throw error;
      if (data) setPreferences(prev => [...prev, data as ChatNotificationPref]);
    }
  }, [user, preferences]);

  return { preferences, loading, getPreference, upsertPreference, refetch: fetchPreferences };
}
