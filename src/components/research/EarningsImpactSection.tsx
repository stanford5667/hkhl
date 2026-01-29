import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Calendar, Target, BarChart3, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO } from 'date-fns';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  ReferenceLine,
} from 'recharts';

type ReturnPeriod = '1W' | '2W' | '1M' | '3M';

interface EarningsHistoryRecord {
  id: string;
  symbol: string;
  report_date: string;
  fiscal_period: string | null;
  eps_actual: number | null;
  eps_estimate: number | null;
  eps_surprise_pct: number | null;
  revenue_actual: number | null;
  revenue_estimate: number | null;
  revenue_surprise_pct: number | null;
  price_before: number | null;
  price_after: number | null;
  price_change_pct: number | null;
  return_1w: number | null;
  return_2w: number | null;
  return_1m: number | null;
  return_3m: number | null;
}

interface EarningsCalendarRecord {
  id: string;
  symbol: string;
  report_date: string;
  time_of_day: string | null;
  eps_estimate: number | null;
  fiscal_period: string | null;
}

interface EarningsImpactSectionProps {
  ticker: string;
  nextEarnings?: string; // Fallback from Finnhub
}

// Hook to fetch earnings history from DB
function useEarningsHistoryData(symbol: string) {
  return useQuery({
    queryKey: ['earnings-history-impact', symbol],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('earnings_history')
        .select('*')
        .eq('symbol', symbol.toUpperCase())
        .order('report_date', { ascending: false })
        .limit(12);

      if (error) throw error;
      return data as EarningsHistoryRecord[];
    },
    enabled: !!symbol,
    staleTime: 5 * 60 * 1000,
  });
}

// Hook to fetch next earnings from calendar
function useNextEarningsFromCalendar(symbol: string) {
  return useQuery({
    queryKey: ['next-earnings-calendar', symbol],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('earnings_calendar')
        .select('*')
        .eq('symbol', symbol.toUpperCase())
        .gte('report_date', today)
        .order('report_date', { ascending: true })
        .limit(1);

      if (error) throw error;
      return data?.[0] as EarningsCalendarRecord | undefined;
    },
    enabled: !!symbol,
    staleTime: 5 * 60 * 1000,
  });
}

export function EarningsImpactSection({ ticker, nextEarnings: fallbackNextEarnings }: EarningsImpactSectionProps) {
  const { data: historyData, isLoading: historyLoading } = useEarningsHistoryData(ticker);
  const { data: nextEarningsData } = useNextEarningsFromCalendar(ticker);
  const queryClient = useQueryClient();
  const backfillStartedRef = useRef<Set<string>>(new Set());
  const tickerKey = (ticker || '').toUpperCase();

  const backfillMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('backfill-earnings-history', {
        body: { symbol: ticker, years: 4 },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['earnings-history-impact', ticker] });
      queryClient.invalidateQueries({ queryKey: ['earnings-history', ticker] });
    },
  });

  // State for return period selector
  const [returnPeriod, setReturnPeriod] = useState<ReturnPeriod>('1W');

  // Reset backfill tracker when ticker changes
  useEffect(() => {
    backfillStartedRef.current = new Set();
  }, [tickerKey]);

  // ALWAYS trigger backfill on ticker load to ensure data is populated
  // This runs once per ticker, regardless of existing data state
  useEffect(() => {
    if (!tickerKey) return;
    if (historyLoading) return;
    if (backfillMutation.isPending) return;

    const runKey = `${tickerKey}:initial`;
    if (backfillStartedRef.current.has(runKey)) return;
    backfillStartedRef.current.add(runKey);

    // Always trigger backfill to ensure earnings data + returns are calculated
    backfillMutation.mutate();
  }, [tickerKey, historyLoading, backfillMutation]);

  // Also trigger when user switches return period if that period has missing data
  const needsPeriodBackfill = useMemo(() => {
    if (!historyData || historyData.length === 0) return false;
    return historyData.some(r => {
      switch (returnPeriod) {
        case '1W': return (r.return_1w ?? r.price_change_pct) === null;
        case '2W': return r.return_2w === null;
        case '1M': return r.return_1m === null;
        case '3M': return r.return_3m === null;
        default: return true;
      }
    });
  }, [historyData, returnPeriod]);

  useEffect(() => {
    if (!tickerKey) return;
    if (!needsPeriodBackfill) return;
    if (historyLoading) return;
    if (backfillMutation.isPending) return;

    const runKey = `${tickerKey}:${returnPeriod}`;
    if (backfillStartedRef.current.has(runKey)) return;
    backfillStartedRef.current.add(runKey);

    backfillMutation.mutate();
  }, [tickerKey, returnPeriod, needsPeriodBackfill, historyLoading, backfillMutation]);

  // Format next earnings date from DB (preferred) or fallback
  const nextEarningsDisplay = useMemo(() => {
    if (nextEarningsData?.report_date) {
      try {
        const date = parseISO(nextEarningsData.report_date);
        const formatted = format(date, 'MMM d, yyyy');
        const timeOfDay = nextEarningsData.time_of_day === 'BMO' ? ' (Pre-market)' 
          : nextEarningsData.time_of_day === 'AMC' ? ' (After-close)' 
          : '';
        return formatted + timeOfDay;
      } catch {
        return fallbackNextEarnings;
      }
    }
    return fallbackNextEarnings;
  }, [nextEarningsData, fallbackNextEarnings]);

  // Get label for selected period
  const getPeriodLabel = (period: ReturnPeriod): string => {
    switch (period) {
      case '1W': return '5D';
      case '2W': return '2W';
      case '1M': return '1M';
      case '3M': return '3M';
    }
  };

  // Helper to get return value based on selected period
  const getReturnForPeriod = (record: EarningsHistoryRecord, period: ReturnPeriod): number | null => {
    switch (period) {
      case '1W': return record.return_1w ?? record.price_change_pct;
      case '2W': return record.return_2w;
      case '1M': return record.return_1m;
      case '3M': return record.return_3m;
      default: return record.return_1w ?? record.price_change_pct;
    }
  };

  // Process earnings history for display
  const earningsHistory = useMemo(() => {
    if (!historyData || historyData.length === 0) return [];

    return historyData.map(record => {
      // Calculate surprise % if we have both actual and estimate
      let epsSurprise = record.eps_surprise_pct;
      if (epsSurprise === null && record.eps_actual !== null && record.eps_estimate !== null && record.eps_estimate !== 0) {
        epsSurprise = ((record.eps_actual - record.eps_estimate) / Math.abs(record.eps_estimate)) * 100;
      }

      // Determine beat/miss based on surprise or comparison
      // If no estimate available, we can't determine beat/miss - mark as null
      let beatOrMiss: 'beat' | 'miss' | null = null;
      if (epsSurprise !== null) {
        beatOrMiss = epsSurprise >= 0 ? 'beat' : 'miss';
      } else if (record.eps_actual !== null && record.eps_estimate !== null) {
        beatOrMiss = record.eps_actual >= record.eps_estimate ? 'beat' : 'miss';
      }

      const priceReturn = getReturnForPeriod(record, returnPeriod);

      return {
        date: record.report_date,
        quarter: record.fiscal_period || format(parseISO(record.report_date), "'Q'Q yyyy"),
        epsActual: record.eps_actual,
        epsEstimate: record.eps_estimate,
        epsSurprise: epsSurprise,
        priceReturn: priceReturn ?? 0,
        priceReturnAvailable: priceReturn !== null,
        beatOrMiss,
        hasEstimate: record.eps_estimate !== null,
      };
    });
  }, [historyData, returnPeriod]);

  const stats = useMemo(() => {
    if (earningsHistory.length === 0) {
      return {
        totalReports: 0,
        beatCount: 0,
        beatRate: null,
        avgSurprise: null,
        avgReturnOnBeat: null,
        avgReturnOnMiss: null,
        hasEstimates: false,
      };
    }

    const withEstimates = earningsHistory.filter(e => e.hasEstimate);
    const beats = earningsHistory.filter(e => e.beatOrMiss === 'beat');
    const misses = earningsHistory.filter(e => e.beatOrMiss === 'miss');
    const hasEstimates = withEstimates.length > 0;
    
    return {
      totalReports: earningsHistory.length,
      beatCount: beats.length,
      beatRate: hasEstimates ? ((beats.length / withEstimates.length) * 100).toFixed(0) : null,
      avgSurprise: hasEstimates 
        ? (withEstimates.reduce((sum, e) => sum + (e.epsSurprise || 0), 0) / withEstimates.length).toFixed(1) 
        : null,
      avgReturnOnBeat: beats.length > 0 && beats.some(e => e.priceReturn !== 0)
        ? (beats.reduce((sum, e) => sum + e.priceReturn, 0) / beats.length).toFixed(1) 
        : null,
      avgReturnOnMiss: misses.length > 0 && misses.some(e => e.priceReturn !== 0)
        ? (misses.reduce((sum, e) => sum + e.priceReturn, 0) / misses.length).toFixed(1)
        : null,
      hasEstimates,
    };
  }, [earningsHistory]);

  // Chart data for surprise vs return - only show if we have estimates
  const surpriseReturnData = useMemo(() => {
    const withEstimates = earningsHistory.filter(e => e.hasEstimate);
    if (withEstimates.length === 0) return [];
    
    return [...withEstimates].reverse().slice(-6).map(e => ({
      quarter: e.quarter.replace('20', "'").replace(' ', ' '),
      surprise: parseFloat((e.epsSurprise || 0).toFixed(1)),
      return: e.priceReturn,
    }));
  }, [earningsHistory]);

  // Chart data for beat vs miss comparison
  const beatMissData = useMemo(() => {
    const beats = earningsHistory.filter(e => e.beatOrMiss === 'beat');
    const misses = earningsHistory.filter(e => e.beatOrMiss === 'miss');
    
    return [
      {
        name: 'On Beats',
        return: beats.length > 0 
          ? parseFloat((beats.reduce((sum, e) => sum + e.priceReturn, 0) / beats.length).toFixed(1))
          : 0,
        fill: 'hsl(var(--primary))',
      },
      {
        name: 'On Misses',
        return: misses.length > 0
          ? parseFloat((misses.reduce((sum, e) => sum + e.priceReturn, 0) / misses.length).toFixed(1))
          : 0,
        fill: 'hsl(var(--destructive))',
      },
    ];
  }, [earningsHistory]);

  // Show loading state while fetching data OR while backfill is running with no data yet
  const isLoadingData = historyLoading || (backfillMutation.isPending && earningsHistory.length === 0);

  if (isLoadingData) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-2 space-y-2">
          <div className="flex items-center gap-1.5">
            <BarChart3 className="h-3 w-3 text-primary" />
            <span className="text-[10px] md:text-xs font-medium">Earnings Impact</span>
            {backfillMutation.isPending && (
              <span className="text-[8px] text-muted-foreground animate-pulse ml-1">
                Loading earnings data...
              </span>
            )}
          </div>
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (earningsHistory.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-2 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <BarChart3 className="h-3 w-3 text-primary" />
              <span className="text-[10px] md:text-xs font-medium">Earnings Impact</span>
            </div>
            {nextEarningsDisplay && (
              <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                <Calendar className="h-2.5 w-2.5" />
                <span>Next: {nextEarningsDisplay}</span>
              </div>
            )}
          </div>
          <div className="py-6 text-center text-muted-foreground text-xs">
            No earnings history available for {ticker.toUpperCase()}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-2 space-y-2">
        {/* Header with next earnings */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <BarChart3 className="h-3 w-3 text-primary" />
            <span className="text-[10px] md:text-xs font-medium">Earnings Impact</span>
          </div>
          {nextEarningsDisplay && (
            <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
              <Calendar className="h-2.5 w-2.5" />
              <span>Next: {nextEarningsDisplay}</span>
            </div>
          )}
        </div>

        {/* Summary Stats Row */}
        <div className="grid grid-cols-4 gap-2 py-1.5 border-b border-border">
          <div className="text-center">
            <p className="text-[7px] md:text-[8px] text-muted-foreground uppercase">Reports</p>
            <p className="text-xs md:text-sm font-bold">{stats.totalReports}</p>
          </div>
          <div className="text-center">
            <p className="text-[7px] md:text-[8px] text-muted-foreground uppercase">Beat Rate</p>
            <p className="text-xs md:text-sm font-bold text-primary">
              {stats.beatRate !== null ? `${stats.beatRate}%` : '—'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[7px] md:text-[8px] text-muted-foreground uppercase">Avg Surprise</p>
            <p className={cn(
              "text-xs md:text-sm font-bold",
              stats.avgSurprise !== null && parseFloat(stats.avgSurprise) >= 0 ? "text-primary" : "text-destructive"
            )}>
              {stats.avgSurprise !== null 
                ? `${parseFloat(stats.avgSurprise) >= 0 ? '+' : ''}${stats.avgSurprise}%`
                : '—'
              }
            </p>
          </div>
          <div className="text-center">
            <p className="text-[7px] md:text-[8px] text-muted-foreground uppercase">{getPeriodLabel(returnPeriod)} on Beat</p>
            <p className={cn(
              "text-xs md:text-sm font-bold",
              stats.avgReturnOnBeat !== null && parseFloat(stats.avgReturnOnBeat) >= 0 ? "text-primary" : "text-destructive"
            )}>
              {stats.avgReturnOnBeat !== null 
                ? `${parseFloat(stats.avgReturnOnBeat) >= 0 ? '+' : ''}${stats.avgReturnOnBeat}%`
                : '—'
              }
            </p>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-1.5 border-b border-border">
          {/* Surprise vs Return Chart */}
          <div>
            <p className="text-[8px] text-muted-foreground uppercase mb-1">Surprise vs {getPeriodLabel(returnPeriod)} Return</p>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={surpriseReturnData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis 
                    dataKey="quarter" 
                    tick={{ fontSize: 8, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 8, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                      fontSize: '10px',
                    }}
                    formatter={(value: number) => [`${value}%`]}
                  />
                  <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                  <Line
                    type="monotone"
                    dataKey="surprise"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))', r: 3 }}
                    name="EPS Surprise"
                  />
                  <Line
                    type="monotone"
                    dataKey="return"
                    stroke="hsl(var(--chart-2))"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--chart-2))', r: 3 }}
                    name={`${getPeriodLabel(returnPeriod)} Return`}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: '8px' }}
                    iconSize={8}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Beat vs Miss Bar Chart */}
          <div>
            <p className="text-[8px] text-muted-foreground uppercase mb-1">Avg {getPeriodLabel(returnPeriod)} Return by Outcome</p>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={beatMissData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 8, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                      fontSize: '10px',
                    }}
                    formatter={(value: number) => [`${value}%`, 'Avg Return']}
                  />
                  <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                  <Bar 
                    dataKey="return" 
                    radius={[4, 4, 0, 0]}
                    maxBarSize={60}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Full Earnings History - Now with actual EPS values */}
        <div className="space-y-1">
          <div className="flex items-center justify-between px-1.5">
            <p className="text-[8px] text-muted-foreground uppercase">Earnings History</p>
            <div className="flex items-center gap-2">
              {/* Period selector */}
              <div className="flex items-center gap-0.5 text-[7px]">
                {(['1W', '2W', '1M', '3M'] as ReturnPeriod[]).map((period) => (
                  <button
                    key={period}
                    onClick={() => setReturnPeriod(period)}
                    className={cn(
                      "px-1.5 py-0.5 rounded transition-colors",
                      returnPeriod === period 
                        ? "bg-primary text-primary-foreground" 
                        : "text-muted-foreground hover:bg-secondary"
                    )}
                  >
                    {period}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 text-[7px] text-muted-foreground uppercase">
                <span className="w-10 text-right">EPS</span>
                <span className="w-12 text-right">Surprise</span>
                <span className="w-12 text-right">Return</span>
              </div>
            </div>
          </div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {earningsHistory.slice(0, 8).map((earning, idx) => (
              <div 
                key={idx} 
                className="flex items-center justify-between py-1 px-1.5 bg-secondary/30 rounded text-[9px] md:text-[10px]"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-muted-foreground w-16">{earning.quarter}</span>
                  {earning.beatOrMiss !== null ? (
                    <Badge 
                      variant={earning.beatOrMiss === 'beat' ? 'default' : 'destructive'} 
                      className="h-4 px-1.5 text-[8px]"
                    >
                      {earning.beatOrMiss === 'beat' ? 'BEAT' : 'MISS'}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="h-4 px-1.5 text-[8px] text-muted-foreground">
                      N/A
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {/* Actual EPS */}
                  <div className="flex items-center gap-0.5" title="Actual EPS">
                    <DollarSign className="h-2.5 w-2.5 text-muted-foreground" />
                    <span className="font-semibold tabular-nums text-foreground">
                      {earning.epsActual !== null ? `$${earning.epsActual.toFixed(2)}` : '—'}
                    </span>
                  </div>
                  {/* EPS Surprise % - always show column for alignment */}
                  <div className="flex items-center gap-0.5 min-w-[50px] justify-end" title="EPS Surprise %">
                    {earning.hasEstimate && earning.epsSurprise !== null ? (
                      <>
                        <Target className="h-2.5 w-2.5 text-muted-foreground" />
                        <span className={cn(
                          "font-medium tabular-nums",
                          earning.epsSurprise >= 0 ? "text-primary" : "text-destructive"
                        )}>
                          {earning.epsSurprise >= 0 ? '+' : ''}{earning.epsSurprise.toFixed(1)}%
                        </span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                  {/* Price Return for selected period - always show column for alignment */}
                  <div className="flex items-center gap-0.5 min-w-[50px] justify-end" title={`${getPeriodLabel(returnPeriod)} Price Return`}>
                    {earning.priceReturnAvailable ? (
                      <>
                        {earning.priceReturn >= 0 ? (
                          <TrendingUp className="h-2.5 w-2.5 text-primary" />
                        ) : (
                          <TrendingDown className="h-2.5 w-2.5 text-destructive" />
                        )}
                        <span className={cn(
                          "font-medium tabular-nums",
                          earning.priceReturn >= 0 ? "text-primary" : "text-destructive"
                        )}>
                          {earning.priceReturn >= 0 ? '+' : ''}{earning.priceReturn.toFixed(1)}%
                        </span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
