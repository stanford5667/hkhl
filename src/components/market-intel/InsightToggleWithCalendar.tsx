import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { 
  Lightbulb, 
  TrendingUp, 
  TrendingDown,
  Calendar, 
  Clock, 
  ChevronRight,
  Zap,
  Building2,
  LineChart,
  Users,
  Megaphone,
  FileText,
  AlertTriangle,
  Target
} from 'lucide-react';
import { FeaturedInsightCard } from './FeaturedInsightCard';
import { MarketImpactCard } from './MarketImpactCard';
import { useEconomicCalendar } from '@/hooks/useEconomicCalendar';
import { differenceInDays, parseISO, format, isToday, isTomorrow } from 'date-fns';
import { EventDetailSheet } from './EventDetailSheet';
import type { CalendarEvent } from '@/hooks/useEconomicCalendar';

// Trader Summary Component
function TraderSummary({ events }: { events: CalendarEvent[] }) {
  const todayEvents = events.filter(e => isToday(parseISO(e.event_date)));
  const tomorrowEvents = events.filter(e => isTomorrow(parseISO(e.event_date)));
  const highImpactEvents = events.filter(e => e.importance?.toLowerCase() === 'high');
  
  const fedEvents = events.filter(e => 
    e.event_type?.toLowerCase().includes('fed') || 
    e.event_type?.toLowerCase().includes('fomc') ||
    e.event_name?.toLowerCase().includes('fed') ||
    e.event_name?.toLowerCase().includes('fomc')
  );

  return (
    <div className="bg-gradient-to-r from-amber-500/10 via-secondary/30 to-rose-500/10 rounded-lg p-3 border border-amber-500/20">
      <div className="flex items-center gap-2 mb-2">
        <Target className="h-4 w-4 text-amber-400" />
        <span className="text-sm font-semibold">Trader's Watch</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-1.5">
          <div className={cn(
            "w-2 h-2 rounded-full",
            todayEvents.length > 0 ? "bg-rose-400 animate-pulse" : "bg-muted"
          )} />
          <span className="text-muted-foreground">Today:</span>
          <span className="font-medium">{todayEvents.length} events</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className={cn(
            "w-2 h-2 rounded-full",
            tomorrowEvents.length > 0 ? "bg-amber-400" : "bg-muted"
          )} />
          <span className="text-muted-foreground">Tomorrow:</span>
          <span className="font-medium">{tomorrowEvents.length} events</span>
        </div>
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="h-3 w-3 text-rose-400" />
          <span className="text-muted-foreground">High Impact:</span>
          <span className="font-medium text-rose-400">{highImpactEvents.length}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Building2 className="h-3 w-3 text-primary" />
          <span className="text-muted-foreground">Fed Events:</span>
          <span className="font-medium text-primary">{fedEvents.length}</span>
        </div>
      </div>
      {highImpactEvents.length > 0 && (
        <div className="mt-2 pt-2 border-t border-border/50">
          <p className="text-xs text-amber-400 font-medium">
            ⚡ {highImpactEvents[0].event_name} - {format(parseISO(highImpactEvents[0].event_date), 'EEE')}
          </p>
        </div>
      )}
    </div>
  );
}

type InsightView = 'featured' | 'impact';

const getEventIcon = (event: CalendarEvent) => {
  const type = event.event_type?.toLowerCase() || '';
  if (type.includes('central') || type.includes('fomc') || type.includes('fed')) return Building2;
  if (type.includes('gdp') || type.includes('economic')) return LineChart;
  if (type.includes('employment') || type.includes('labor')) return Users;
  if (type.includes('speech') || type.includes('conference')) return Megaphone;
  return FileText;
};

const getImportanceBadge = (importance: string | null) => {
  const level = importance?.toLowerCase() || 'low';
  if (level === 'high') return { 
    label: 'High', 
    color: 'text-rose-400', 
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30'
  };
  if (level === 'medium') return { 
    label: 'Med', 
    color: 'text-amber-400', 
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30'
  };
  return { 
    label: 'Low', 
    color: 'text-emerald-400', 
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30'
  };
};

const getEventTypeColor = (type: string | null) => {
  const t = type?.toLowerCase() || '';
  if (t.includes('central') || t.includes('fomc') || t.includes('fed')) return 'bg-primary/20 text-primary';
  if (t.includes('gdp') || t.includes('economic')) return 'bg-blue-500/20 text-blue-400';
  if (t.includes('employment') || t.includes('labor')) return 'bg-emerald-500/20 text-emerald-400';
  if (t.includes('speech') || t.includes('conference')) return 'bg-purple-500/20 text-purple-400';
  return 'bg-secondary text-muted-foreground';
};

const getRelativeDate = (dateStr: string) => {
  const date = parseISO(dateStr);
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  const days = differenceInDays(date, new Date());
  if (days < 7) return format(date, 'EEEE');
  return format(date, 'MMM d');
};

export function InsightToggleWithCalendar() {
  const [activeView, setActiveView] = useState<InsightView>('featured');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [eventDetailOpen, setEventDetailOpen] = useState(false);
  
  const { data: calendarEvents = [], isLoading } = useEconomicCalendar(30);
  
  const upcomingEvents = calendarEvents.slice(0, 10);

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setEventDetailOpen(true);
  };

  return (
    <>
      <div className="grid lg:grid-cols-2 gap-3 sm:gap-4">
        {/* Left Side: Toggle between Featured Insight and Market Impact */}
        <div className="space-y-3">
          {/* Toggle Buttons */}
          <div className="flex gap-2">
            <Button
              variant={activeView === 'featured' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveView('featured')}
              className="flex-1 gap-2"
            >
              <Lightbulb className="h-4 w-4" />
              Featured Insight
            </Button>
            <Button
              variant={activeView === 'impact' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveView('impact')}
              className="flex-1 gap-2"
            >
              <TrendingUp className="h-4 w-4" />
              Market Impact
            </Button>
          </div>
          
          {/* Active Card */}
          <div className="min-h-[400px]">
            {activeView === 'featured' ? (
              <FeaturedInsightCard />
            ) : (
              <MarketImpactCard />
            )}
          </div>
        </div>

        {/* Right Side: Economic Calendar with Trader Summary */}
        <Card className="bg-gradient-to-br from-card to-secondary/10">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Economic Calendar
              </CardTitle>
              <Badge variant="secondary" className="text-xs">
                {upcomingEvents.length} upcoming
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {/* Trader Summary */}
            <TraderSummary events={upcomingEvents} />
            
            <ScrollArea className="h-[320px] pr-2">
              <div className="space-y-2">
                {isLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="text-sm text-muted-foreground">Loading events...</div>
                  </div>
                ) : upcomingEvents.length === 0 ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="text-sm text-muted-foreground">No upcoming events</div>
                  </div>
                ) : (
                  upcomingEvents.map(event => {
                    const Icon = getEventIcon(event);
                    const importance = getImportanceBadge(event.importance);
                    const relativeDate = getRelativeDate(event.event_date);
                    const isUpcoming = isToday(parseISO(event.event_date)) || isTomorrow(parseISO(event.event_date));
                    
                    return (
                      <div
                        key={event.id}
                        onClick={() => handleEventClick(event)}
                        className={cn(
                          "flex items-start gap-3 p-3 rounded-lg transition-colors cursor-pointer group",
                          isUpcoming 
                            ? "bg-primary/5 border border-primary/20 hover:bg-primary/10" 
                            : "bg-secondary/30 hover:bg-secondary/50"
                        )}
                      >
                        <div className={cn("p-2 rounded-lg shrink-0", getEventTypeColor(event.event_type))}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm leading-tight truncate">
                            {event.event_name}
                          </p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className={cn(
                              "text-xs flex items-center gap-1",
                              isUpcoming ? "text-primary font-medium" : "text-muted-foreground"
                            )}>
                              {isUpcoming && <Zap className="h-3 w-3" />}
                              {relativeDate}
                            </span>
                            {event.event_time && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {event.event_time}
                              </span>
                            )}
                          </div>
                          {event.country && (
                            <span className="text-xs text-muted-foreground mt-1 block">
                              {event.country}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <Badge 
                            variant="outline" 
                            className={cn("text-[10px]", importance.color, importance.bg, importance.border)}
                          >
                            {importance.label}
                          </Badge>
                          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <EventDetailSheet 
        event={selectedEvent}
        open={eventDetailOpen}
        onOpenChange={setEventDetailOpen}
      />
    </>
  );
}
