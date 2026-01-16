import { useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Bell, Calendar, TrendingUp } from 'lucide-react';
import React from 'react';

interface EconomicEvent {
  id: string;
  event_name: string;
  event_type: string;
  event_date: string;
  event_time: string | null;
  importance: string | null;
  country: string | null;
}

interface EventAlertSubscription {
  id: string;
  event_type: string | null;
  event_name: string | null;
  importance: string[];
  countries: string[];
  alert_before_hours: number;
  alert_on_release: boolean;
  in_app: boolean;
  is_active: boolean;
}

// Track which notifications have been shown to avoid duplicates
const shownNotifications = new Set<string>();

export function useEventNotifications() {
  const { user } = useAuth();
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch user's active alert subscriptions
  const { data: subscriptions } = useQuery({
    queryKey: ['event-alert-subscriptions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('event_alert_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);
      
      if (error) throw error;
      return data as EventAlertSubscription[];
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch upcoming events
  const { data: upcomingEvents } = useQuery({
    queryKey: ['upcoming-events-for-alerts'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('economic_calendar')
        .select('id, event_name, event_type, event_date, event_time, importance, country')
        .gte('event_date', today)
        .lte('event_date', nextWeek)
        .order('event_date', { ascending: true });
      
      if (error) throw error;
      return data as EconomicEvent[];
    },
    staleTime: 1000 * 60 * 15, // 15 minutes
  });

  // Check if an event matches a subscription
  const eventMatchesSubscription = useCallback((event: EconomicEvent, sub: EventAlertSubscription): boolean => {
    // Check event type match (null means all types)
    if (sub.event_type && !event.event_type?.toLowerCase().includes(sub.event_type.toLowerCase())) {
      return false;
    }

    // Check event name match if specified
    if (sub.event_name && !event.event_name?.toLowerCase().includes(sub.event_name.toLowerCase())) {
      return false;
    }

    // Check importance match
    if (sub.importance.length > 0 && event.importance) {
      if (!sub.importance.includes(event.importance.toLowerCase())) {
        return false;
      }
    }

    // Check country match
    if (sub.countries.length > 0 && event.country) {
      if (!sub.countries.some(c => c.toLowerCase() === event.country?.toLowerCase())) {
        return false;
      }
    }

    return true;
  }, []);

  // Calculate hours until event
  const getHoursUntilEvent = useCallback((event: EconomicEvent): number => {
    const eventDateTime = event.event_time 
      ? new Date(`${event.event_date}T${event.event_time}`)
      : new Date(`${event.event_date}T09:00:00`); // Default to 9 AM if no time
    
    const now = new Date();
    const diffMs = eventDateTime.getTime() - now.getTime();
    return diffMs / (1000 * 60 * 60);
  }, []);

  // Show notification for an event
  const showEventNotification = useCallback((event: EconomicEvent, hoursUntil: number) => {
    const notificationKey = `${event.id}-${Math.floor(hoursUntil)}`;
    
    // Don't show if already shown
    if (shownNotifications.has(notificationKey)) return;
    shownNotifications.add(notificationKey);

    const timeText = hoursUntil < 1 
      ? 'less than an hour'
      : hoursUntil < 24 
        ? `${Math.round(hoursUntil)} hours`
        : `${Math.round(hoursUntil / 24)} days`;

    const importanceColors: Record<string, string> = {
      high: '#ef4444',
      medium: '#f59e0b',
      low: '#6b7280',
    };

    toast(
      React.createElement('div', { className: 'flex flex-col gap-1' },
        React.createElement('div', { className: 'flex items-center gap-2 font-medium' },
          React.createElement(Calendar, { className: 'h-4 w-4' }),
          `${event.event_name}`
        ),
        React.createElement('p', { className: 'text-sm text-muted-foreground' },
          `Scheduled in ${timeText}`
        ),
        event.importance && React.createElement('div', { 
          className: 'flex items-center gap-1 text-xs',
          style: { color: importanceColors[event.importance.toLowerCase()] || '#6b7280' }
        },
          React.createElement('span', { 
            className: 'h-2 w-2 rounded-full',
            style: { backgroundColor: importanceColors[event.importance.toLowerCase()] || '#6b7280' }
          }),
          `${event.importance.charAt(0).toUpperCase() + event.importance.slice(1)} Impact`
        )
      ),
      {
        duration: 8000,
        icon: React.createElement(Bell, { className: 'h-5 w-5 text-primary' }),
        action: {
          label: 'View',
          onClick: () => {
            // Could navigate to the event or open event details
            console.log('View event:', event.id);
          },
        },
      }
    );
  }, []);

  // Check for events that need notifications
  const checkForUpcomingAlerts = useCallback(() => {
    if (!subscriptions || !upcomingEvents) return;

    for (const event of upcomingEvents) {
      const hoursUntil = getHoursUntilEvent(event);
      
      // Skip past events
      if (hoursUntil < 0) continue;

      // Check each subscription
      for (const sub of subscriptions) {
        if (!sub.in_app) continue;
        
        if (eventMatchesSubscription(event, sub)) {
          // Check if within alert window
          if (hoursUntil <= sub.alert_before_hours && hoursUntil > 0) {
            showEventNotification(event, hoursUntil);
          }
        }
      }
    }
  }, [subscriptions, upcomingEvents, eventMatchesSubscription, getHoursUntilEvent, showEventNotification]);

  // Run check on mount and periodically
  useEffect(() => {
    if (!user?.id || !subscriptions || !upcomingEvents) return;

    // Initial check
    checkForUpcomingAlerts();

    // Check every 30 minutes
    checkIntervalRef.current = setInterval(checkForUpcomingAlerts, 30 * 60 * 1000);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [user?.id, subscriptions, upcomingEvents, checkForUpcomingAlerts]);

  return {
    subscriptions,
    upcomingEvents,
    checkForUpcomingAlerts,
  };
}

// Manual trigger for testing
export function triggerTestNotification() {
  toast(
    React.createElement('div', { className: 'flex flex-col gap-1' },
      React.createElement('div', { className: 'flex items-center gap-2 font-medium' },
        React.createElement(Calendar, { className: 'h-4 w-4' }),
        'FOMC Interest Rate Decision'
      ),
      React.createElement('p', { className: 'text-sm text-muted-foreground' },
        'Scheduled in 24 hours'
      ),
      React.createElement('div', { 
        className: 'flex items-center gap-1 text-xs text-red-500'
      },
        React.createElement('span', { 
          className: 'h-2 w-2 rounded-full bg-red-500'
        }),
        'High Impact'
      )
    ),
    {
      duration: 8000,
      icon: React.createElement(Bell, { className: 'h-5 w-5 text-primary' }),
    }
  );
}
