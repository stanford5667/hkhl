import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CalendarEvent {
  id: string;
  event_date: string;
  event_time: string | null;
  event_name: string;
  event_type: string;
  description: string | null;
  importance: string;
  actual_value: string | null;
  forecast_value: string | null;
  previous_value: string | null;
  currency: string;
  country: string;
}

export interface SyncStatus {
  id: string;
  sync_type: string;
  last_sync_at: string | null;
  next_sync_at: string | null;
  status: string;
  records_updated: number;
  error_message: string | null;
}

export function useEconomicCalendar(daysAhead: number = 90) {
  return useQuery({
    queryKey: ['economic-calendar', daysAhead],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const futureDate = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('economic_calendar')
        .select('*')
        .gte('event_date', today)
        .lte('event_date', futureDate)
        .order('event_date', { ascending: true });
      
      if (error) throw error;
      return (data || []) as CalendarEvent[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

export function useUpcomingEvents(limit: number = 5) {
  return useQuery({
    queryKey: ['upcoming-events', limit],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('economic_calendar')
        .select('*')
        .gte('event_date', today)
        .order('event_date', { ascending: true })
        .limit(limit);
      
      if (error) throw error;
      return (data || []) as CalendarEvent[];
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useSyncStatus() {
  return useQuery({
    queryKey: ['sync-status'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('data_sync_status')
        .select('*')
        .order('sync_type');
      
      if (error) throw error;
      return (data || []) as SyncStatus[];
    },
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: false,
  });
}

export function groupEventsByDate(events: CalendarEvent[]) {
  return events.reduce((acc, event) => {
    const date = event.event_date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(event);
    return acc;
  }, {} as Record<string, CalendarEvent[]>);
}

export function getEventTypeColor(type: string): string {
  switch (type) {
    case 'fed':
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'earnings':
      return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    case 'economic':
      return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    case 'holiday':
      return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

export function getImportanceColor(importance: string): string {
  switch (importance) {
    case 'high':
      return 'text-rose-400';
    case 'medium':
      return 'text-amber-400';
    case 'low':
      return 'text-muted-foreground';
    default:
      return 'text-muted-foreground';
  }
}
