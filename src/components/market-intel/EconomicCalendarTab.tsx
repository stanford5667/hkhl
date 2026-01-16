import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Calendar, 
  Landmark, 
  TrendingUp, 
  Building2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay } from 'date-fns';
import { 
  useEconomicCalendar, 
  useSyncStatus,
  groupEventsByDate, 
  getEventTypeColor,
  getImportanceColor,
  type CalendarEvent 
} from '@/hooks/useEconomicCalendar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const eventTypeIcons: Record<string, React.ElementType> = {
  fed: Landmark,
  earnings: Building2,
  economic: TrendingUp,
  holiday: Calendar,
};

export function EconomicCalendarTab() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const { data: events = [], isLoading, refetch } = useEconomicCalendar(180);
  const { data: syncStatus = [] } = useSyncStatus();

  const groupedEvents = groupEventsByDate(events);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const { error } = await supabase.functions.invoke('scheduled-data-sync', {
        body: { syncType: 'all' }
      });
      
      if (error) throw error;
      
      toast.success('Data sync initiated');
      refetch();
    } catch (err: any) {
      toast.error('Sync failed: ' + err.message);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Get upcoming events for the list view
  const upcomingEvents = events.slice(0, 10);

  if (isLoading) {
    return (
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Skeleton className="h-[400px] w-full" />
        </div>
        <div>
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sync Status Bar */}
      <Card className="bg-secondary/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {syncStatus.map(sync => (
                <div key={sync.sync_type} className="flex items-center gap-2 text-sm">
                  <div className={`h-2 w-2 rounded-full ${
                    sync.status === 'success' ? 'bg-emerald-500' : 
                    sync.status === 'running' ? 'bg-amber-500 animate-pulse' : 
                    sync.status === 'failed' ? 'bg-rose-500' : 'bg-muted'
                  }`} />
                  <span className="text-muted-foreground capitalize">{sync.sync_type}</span>
                  {sync.last_sync_at && (
                    <span className="text-xs text-muted-foreground/70">
                      {format(parseISO(sync.last_sync_at), 'MMM d, HH:mm')}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Sync Now
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar View */}
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">
                {format(currentMonth, 'MMMM yyyy')}
              </h3>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={prevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>
                  Today
                </Button>
                <Button variant="outline" size="icon" onClick={nextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Day Headers */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                  {day}
                </div>
              ))}

              {/* Empty cells for start of month */}
              {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                <div key={`empty-start-${i}`} className="h-20" />
              ))}

              {/* Day Cells */}
              {daysInMonth.map(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const dayEvents = groupedEvents[dateStr] || [];
                const hasHighImportance = dayEvents.some(e => e.importance === 'high');

                return (
                  <div
                    key={dateStr}
                    className={`h-20 p-1 border rounded-lg transition-colors ${
                      isToday(day) 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border/50 hover:border-border'
                    } ${!isSameMonth(day, currentMonth) ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-medium ${
                        isToday(day) ? 'text-primary' : 'text-foreground'
                      }`}>
                        {format(day, 'd')}
                      </span>
                      {hasHighImportance && (
                        <AlertCircle className="h-3 w-3 text-rose-400" />
                      )}
                    </div>
                    <div className="mt-1 space-y-0.5 overflow-hidden">
                      {dayEvents.slice(0, 2).map(event => {
                        const Icon = eventTypeIcons[event.event_type] || Calendar;
                        return (
                          <div
                            key={event.id}
                            className={`text-[10px] px-1 py-0.5 rounded truncate flex items-center gap-1 ${getEventTypeColor(event.event_type)}`}
                          >
                            <Icon className="h-2 w-2 shrink-0" />
                            <span className="truncate">{event.event_name}</span>
                          </div>
                        );
                      })}
                      {dayEvents.length > 2 && (
                        <div className="text-[10px] text-muted-foreground px-1">
                          +{dayEvents.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Events List */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Upcoming Events</h3>
            <div className="space-y-3">
              {upcomingEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No upcoming events
                </p>
              ) : (
                upcomingEvents.map(event => {
                  const Icon = eventTypeIcons[event.event_type] || Calendar;
                  return (
                    <div
                      key={event.id}
                      className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                    >
                      <div className={`p-2 rounded-lg ${getEventTypeColor(event.event_type)}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">{event.event_name}</p>
                          <span className={`text-xs ${getImportanceColor(event.importance)}`}>
                            •
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(event.event_date), 'MMM d, yyyy')}
                          {event.event_time && ` at ${event.event_time}`}
                        </p>
                        {event.description && (
                          <p className="text-xs text-muted-foreground/80 mt-1 truncate">
                            {event.description}
                          </p>
                        )}
                      </div>
                      <Badge 
                        variant="outline" 
                        className={`text-[10px] shrink-0 ${getEventTypeColor(event.event_type)}`}
                      >
                        {event.event_type}
                      </Badge>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs">
        <span className="text-muted-foreground">Event Types:</span>
        {Object.entries(eventTypeIcons).map(([type, Icon]) => (
          <div key={type} className={`flex items-center gap-1.5 px-2 py-1 rounded ${getEventTypeColor(type)}`}>
            <Icon className="h-3 w-3" />
            <span className="capitalize">{type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
