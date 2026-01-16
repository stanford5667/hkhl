import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface EventAlertSubscription {
  id: string;
  user_id: string;
  event_type: string | null;
  event_name: string | null;
  importance: string[];
  countries: string[];
  alert_before_hours: number;
  alert_on_release: boolean;
  in_app: boolean;
  email: boolean;
  push: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateEventAlertInput {
  event_type?: string | null;
  event_name?: string | null;
  importance?: string[];
  countries?: string[];
  alert_before_hours?: number;
  alert_on_release?: boolean;
  in_app?: boolean;
  email?: boolean;
  push?: boolean;
}

export function useEventAlertSubscriptions() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['event-alert-subscriptions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('event_alert_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as EventAlertSubscription[];
    },
    enabled: !!user?.id,
  });
}

export function useCreateEventAlert() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: CreateEventAlertInput) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('event_alert_subscriptions')
        .insert({
          user_id: user.id,
          event_type: input.event_type || null,
          event_name: input.event_name || null,
          importance: input.importance || ['high'],
          countries: input.countries || ['US'],
          alert_before_hours: input.alert_before_hours ?? 24,
          alert_on_release: input.alert_on_release ?? true,
          in_app: input.in_app ?? true,
          email: input.email ?? false,
          push: input.push ?? false,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-alert-subscriptions'] });
      toast.success('Alert created successfully');
    },
    onError: (error) => {
      console.error('Error creating alert:', error);
      toast.error('Failed to create alert');
    },
  });
}

export function useUpdateEventAlert() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EventAlertSubscription> & { id: string }) => {
      const { data, error } = await supabase
        .from('event_alert_subscriptions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-alert-subscriptions'] });
    },
    onError: (error) => {
      console.error('Error updating alert:', error);
      toast.error('Failed to update alert');
    },
  });
}

export function useDeleteEventAlert() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('event_alert_subscriptions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-alert-subscriptions'] });
      toast.success('Alert deleted');
    },
    onError: (error) => {
      console.error('Error deleting alert:', error);
      toast.error('Failed to delete alert');
    },
  });
}

export function useToggleEventAlert() {
  const updateAlert = useUpdateEventAlert();
  
  return (id: string, isActive: boolean) => {
    updateAlert.mutate({ id, is_active: isActive });
  };
}

// Utility to get distinct event types from economic calendar
export function useEventTypes() {
  return useQuery({
    queryKey: ['event-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('economic_calendar')
        .select('event_type, event_name')
        .order('event_type');
      
      if (error) throw error;
      
      // Get unique event types and names
      const types = [...new Set(data?.map(e => e.event_type).filter(Boolean))] as string[];
      const names = [...new Set(data?.map(e => e.event_name).filter(Boolean))] as string[];
      
      return { types, names };
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}
