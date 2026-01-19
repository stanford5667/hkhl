import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, TrendingUp, AlertCircle, DollarSign, Building2, LineChart } from 'lucide-react';
import { format, isToday, isTomorrow, isBefore, addDays } from 'date-fns';

interface FundamentalEvent {
  id: string;
  type: 'earnings' | 'fed_meeting' | 'economic_data' | 'dividend' | 'corporate';
  title: string;
  symbol?: string;
  scheduledDate: Date;
  importance: 'high' | 'medium' | 'low';
  details?: {
    epsEstimate?: number;
    revenueEstimate?: number;
    previousValue?: number;
    forecastValue?: number;
    historicalImpact?: number;
  };
}

interface FundamentalEventCalendarProps {
  onEventClick?: (event: FundamentalEvent) => void;
}

export default function FundamentalEventCalendar({ onEventClick }: FundamentalEventCalendarProps) {
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'month'>('week');

  // Mock data - replace with actual API call
  // Accurate dates for Jan 2026
  const events: FundamentalEvent[] = [
    {
      id: '1',
      type: 'fed_meeting',
      title: 'FOMC Meeting Decision',
      scheduledDate: new Date('2026-01-28'),
      importance: 'high',
      details: {
        historicalImpact: 1.8,
      },
    },
    {
      id: '2',
      type: 'earnings',
      title: 'Apple Q1 FY26 Earnings',
      symbol: 'AAPL',
      scheduledDate: new Date('2026-01-29'),
      importance: 'high',
      details: {
        epsEstimate: 2.65,
        revenueEstimate: 123.5,
        historicalImpact: 3.2,
      },
    },
    {
      id: '3',
      type: 'earnings',
      title: 'Microsoft Q2 FY26 Earnings',
      symbol: 'MSFT',
      scheduledDate: new Date('2026-01-29'),
      importance: 'high',
      details: {
        epsEstimate: 3.12,
        revenueEstimate: 68.2,
        historicalImpact: 2.8,
      },
    },
    {
      id: '4',
      type: 'earnings',
      title: 'Meta Q4 Earnings',
      symbol: 'META',
      scheduledDate: new Date('2026-01-29'),
      importance: 'high',
      details: {
        epsEstimate: 5.22,
        revenueEstimate: 45.8,
        historicalImpact: 4.5,
      },
    },
    {
      id: '5',
      type: 'earnings',
      title: 'Alphabet Q4 Earnings',
      symbol: 'GOOGL',
      scheduledDate: new Date('2026-02-04'),
      importance: 'high',
      details: {
        epsEstimate: 1.89,
        revenueEstimate: 92.1,
        historicalImpact: 3.5,
      },
    },
    {
      id: '6',
      type: 'earnings',
      title: 'Amazon Q4 Earnings',
      symbol: 'AMZN',
      scheduledDate: new Date('2026-02-06'),
      importance: 'high',
      details: {
        epsEstimate: 1.45,
        revenueEstimate: 186.4,
        historicalImpact: 4.1,
      },
    },
    {
      id: '7',
      type: 'economic_data',
      title: 'January Jobs Report (NFP)',
      scheduledDate: new Date('2026-02-07'),
      importance: 'high',
      details: {
        previousValue: 256,
        forecastValue: 170,
        historicalImpact: 1.9,
      },
    },
    {
      id: '8',
      type: 'economic_data',
      title: 'January CPI Report',
      scheduledDate: new Date('2026-02-12'),
      importance: 'high',
      details: {
        previousValue: 2.9,
        forecastValue: 2.8,
        historicalImpact: 2.5,
      },
    },
  ];

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'earnings':
        return <DollarSign className="w-5 h-5" />;
      case 'fed_meeting':
        return <Building2 className="w-5 h-5" />;
      case 'economic_data':
        return <LineChart className="w-5 h-5" />;
      case 'dividend':
        return <TrendingUp className="w-5 h-5" />;
      default:
        return <Calendar className="w-5 h-5" />;
    }
  };

  const getImportanceBadge = (importance: string) => {
    const variants: Record<string, string> = {
      high: 'bg-destructive/20 text-destructive border-destructive/30',
      medium: 'bg-warning/20 text-warning border-warning/30',
      low: 'bg-muted text-muted-foreground border-border',
    };

    return (
      <Badge variant="outline" className={variants[importance]}>
        {importance.toUpperCase()}
      </Badge>
    );
  };

  const getDateDisplay = (date: Date) => {
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'MMM d, yyyy');
  };

  const filteredEvents = events.filter((event) => {
    if (selectedFilter !== 'all' && event.type !== selectedFilter) return false;
    
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Start of today
    
    // Only show today and future events
    if (isBefore(event.scheduledDate, now)) return false;
    
    switch (timeFilter) {
      case 'today':
        return isToday(event.scheduledDate);
      case 'week':
        return event.scheduledDate <= addDays(now, 7);
      case 'month':
        return event.scheduledDate <= addDays(now, 30);
      default:
        return true;
    }
  });

  const groupedEvents = filteredEvents.reduce((acc, event) => {
    const dateKey = format(event.scheduledDate, 'yyyy-MM-dd');
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(event);
    return acc;
  }, {} as Record<string, FundamentalEvent[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Event Calendar</h2>
          <p className="text-muted-foreground text-sm">
            Track earnings, Fed meetings, and economic data releases
          </p>
        </div>
        <Button variant="outline" size="sm">
          <AlertCircle className="w-4 h-4 mr-2" />
          Set Alerts
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-card/50 border-border/50">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Time filter */}
            <Tabs value={timeFilter} onValueChange={(v: any) => setTimeFilter(v)} className="flex-1">
              <TabsList className="grid w-full grid-cols-3 bg-background/50">
                <TabsTrigger value="today">Today</TabsTrigger>
                <TabsTrigger value="week">This Week</TabsTrigger>
                <TabsTrigger value="month">This Month</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Event type filter */}
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={selectedFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedFilter('all')}
              >
                All Events
              </Button>
              <Button
                variant={selectedFilter === 'earnings' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedFilter('earnings')}
              >
                <DollarSign className="w-4 h-4 mr-1" />
                Earnings
              </Button>
              <Button
                variant={selectedFilter === 'fed_meeting' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedFilter('fed_meeting')}
              >
                <Building2 className="w-4 h-4 mr-1" />
                Fed
              </Button>
              <Button
                variant={selectedFilter === 'economic_data' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedFilter('economic_data')}
              >
                <LineChart className="w-4 h-4 mr-1" />
                Economic
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Event List */}
      <div className="space-y-4">
        {Object.entries(groupedEvents).length === 0 ? (
          <Card className="bg-card/50 border-border/50">
            <CardContent className="text-center py-12">
              <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No events scheduled</h3>
              <p className="text-muted-foreground">
                Check back later for upcoming events
              </p>
            </CardContent>
          </Card>
        ) : (
          Object.entries(groupedEvents)
            .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
            .map(([date, dayEvents]) => (
              <Card key={date} className="bg-card/50 border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Calendar className="w-5 h-5 text-primary" />
                    {getDateDisplay(new Date(date))}
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      {format(new Date(date), 'EEEE')}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {dayEvents.map((event) => (
                      <div
                        key={event.id}
                        onClick={() => onEventClick?.(event)}
                        className="flex items-start gap-4 p-4 border border-border/50 rounded-lg hover:bg-secondary/30 transition-colors cursor-pointer"
                      >
                        {/* Icon */}
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                          {getEventIcon(event.type)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <h4 className="font-semibold">{event.title}</h4>
                              {event.symbol && (
                                <p className="text-sm text-muted-foreground font-mono">
                                  {event.symbol}
                                </p>
                              )}
                            </div>
                            {getImportanceBadge(event.importance)}
                          </div>

                          {/* Event Details */}
                          {event.details && (
                            <div className="flex flex-wrap gap-4 text-sm">
                              {event.details.epsEstimate && (
                                <div>
                                  <span className="text-muted-foreground">EPS Est:</span>
                                  <span className="font-semibold ml-1">
                                    ${event.details.epsEstimate}
                                  </span>
                                </div>
                              )}
                              {event.details.revenueEstimate && (
                                <div>
                                  <span className="text-muted-foreground">Rev Est:</span>
                                  <span className="font-semibold ml-1">
                                    ${event.details.revenueEstimate}B
                                  </span>
                                </div>
                              )}
                              {event.details.forecastValue !== undefined && (
                                <div>
                                  <span className="text-muted-foreground">Forecast:</span>
                                  <span className="font-semibold ml-1">
                                    {event.details.forecastValue}%
                                  </span>
                                </div>
                              )}
                              {event.details.historicalImpact !== undefined && (
                                <div className="flex items-center gap-1">
                                  <TrendingUp className="w-4 h-4 text-primary" />
                                  <span className="text-muted-foreground">Avg Impact:</span>
                                  <span className="font-semibold ml-1 text-primary">
                                    {event.details.historicalImpact > 0 ? '+' : ''}
                                    {event.details.historicalImpact}%
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Action */}
                        <Button variant="ghost" size="sm">
                          View Study
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-4 pb-4 text-center">
            <div className="text-2xl font-bold text-primary">
              {filteredEvents.length}
            </div>
            <p className="text-xs text-muted-foreground">Total Events</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-4 pb-4 text-center">
            <div className="text-2xl font-bold text-destructive">
              {filteredEvents.filter((e) => e.importance === 'high').length}
            </div>
            <p className="text-xs text-muted-foreground">High Impact</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-4 pb-4 text-center">
            <div className="text-2xl font-bold text-success">
              {filteredEvents.filter((e) => e.type === 'earnings').length}
            </div>
            <p className="text-xs text-muted-foreground">Earnings Reports</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-4 pb-4 text-center">
            <div className="text-2xl font-bold text-warning">
              {
                filteredEvents.filter(
                  (e) => e.type === 'fed_meeting' || e.type === 'economic_data'
                ).length
              }
            </div>
            <p className="text-xs text-muted-foreground">Economic Events</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
