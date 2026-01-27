// src/components/earnings/EarningsCalendar.tsx

import { useState, useEffect, useRef } from 'react';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { Calendar, RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEarningsCalendar, useFetchEarningsData, useGeneratePredictions } from '@/hooks/useEarningsCalendar';
import { EarningsCalendarFilters } from '@/types/earnings';
import { EarningsFilters } from './EarningsFilters';
import { EarningsTable } from './EarningsTable';
import { EarningsScreener } from './EarningsScreener';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const EarningsCalendar = () => {
  const [activeTab, setActiveTab] = useState<'calendar' | 'screener'>('calendar');
  const [filters, setFilters] = useState<EarningsCalendarFilters>({
    // Default to a broader window so users see upcoming events even if the next week is quiet.
    dateRange: 'month',
    timeOfDay: 'all',
  });
  const hasAutoFetched = useRef(false);

  const { data: earnings, isLoading, error, isFetched } = useEarningsCalendar(filters);
  const fetchEarnings = useFetchEarningsData();
  const generatePredictions = useGeneratePredictions();

  // Auto-fetch earnings data on first load if empty
  useEffect(() => {
    if (isFetched && !isLoading && !hasAutoFetched.current && (!earnings || earnings.length === 0)) {
      hasAutoFetched.current = true;
      const today = new Date().toISOString().split('T')[0];
      const monthAhead = new Date();
      monthAhead.setDate(monthAhead.getDate() + 30);
      
      fetchEarnings.mutate({
        startDate: today,
        endDate: monthAhead.toISOString().split('T')[0],
      });
    }
  }, [isFetched, isLoading, earnings, fetchEarnings]);

  const handleRefresh = () => {
    const today = new Date().toISOString().split('T')[0];
    const monthAhead = new Date();
    monthAhead.setDate(monthAhead.getDate() + 30);
    
    fetchEarnings.mutate({
      startDate: today,
      endDate: monthAhead.toISOString().split('T')[0],
    });
  };

  const handleGeneratePredictions = () => {
    if (!earnings || earnings.length === 0) return;
    
    const symbols = [...new Set(earnings.map(e => e.symbol))];
    generatePredictions.mutate({ symbols, useBulkPrediction: true });
  };

  // Group earnings by date
  const earningsByDate = earnings?.reduce((acc, event) => {
    const date = event.report_date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(event);
    return acc;
  }, {} as Record<string, typeof earnings>);

  const getDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEEE, MMMM d, yyyy');
  };

  const stats = {
    total: earnings?.length || 0,
    withPredictions: earnings?.filter(e => e.prediction).length || 0,
    expectedBeats: earnings?.filter(e => e.prediction?.predicted_outcome === 'beat').length || 0,
    expectedMisses: earnings?.filter(e => e.prediction?.predicted_outcome === 'miss').length || 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Earnings Calendar</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track upcoming earnings and predict beats/misses
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={fetchEarnings.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${fetchEarnings.isPending ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
          <Button
            size="sm"
            onClick={handleGeneratePredictions}
            disabled={generatePredictions.isPending || !earnings || earnings.length === 0}
          >
            <Sparkles className={`h-4 w-4 mr-2 ${generatePredictions.isPending ? 'animate-pulse' : ''}`} />
            Generate Predictions
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <p className="text-xs text-muted-foreground">Upcoming Earnings</p>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <p className="text-xs text-muted-foreground">With Predictions</p>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.withPredictions}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.total > 0 ? Math.round((stats.withPredictions / stats.total) * 100) : 0}% coverage
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <p className="text-xs text-muted-foreground">Expected Beats</p>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{stats.expectedBeats}</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <p className="text-xs text-muted-foreground">Expected Misses</p>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.expectedMisses}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'calendar' | 'screener')}>
        <TabsList>
          <TabsTrigger value="calendar">
            <Calendar className="h-4 w-4 mr-2" />
            Calendar View
          </TabsTrigger>
          <TabsTrigger value="screener">
            <Sparkles className="h-4 w-4 mr-2" />
            Screener
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-4">
          <EarningsFilters filters={filters} onFiltersChange={setFilters} />

          {error && (
            <Alert variant="destructive">
              <AlertDescription>
                Failed to load earnings calendar: {error.message}
              </AlertDescription>
            </Alert>
          )}

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Card key={i} className="bg-card/50 border-border/50">
                  <CardHeader>
                    <Skeleton className="h-6 w-48" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-32 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : earningsByDate && Object.keys(earningsByDate).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(earningsByDate).map(([date, events]) => (
                <Card key={date} className="bg-card/50 border-border/50">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span>{getDateLabel(date)}</span>
                      <Badge variant="secondary">{events.length} companies</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <EarningsTable earnings={events} />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-card/50 border-border/50">
              <CardContent className="py-12 text-center text-muted-foreground">
                No earnings events found. Click "Refresh Data" to fetch upcoming earnings.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="screener">
          <EarningsScreener />
        </TabsContent>
      </Tabs>
    </div>
  );
};
