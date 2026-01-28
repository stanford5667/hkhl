import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Calendar, Target, BarChart3, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
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
      let beatOrMiss: 'beat' | 'miss' = 'beat';
      if (epsSurprise !== null) {
        beatOrMiss = epsSurprise >= 0 ? 'beat' : 'miss';
      } else if (record.eps_actual !== null && record.eps_estimate !== null) {
        beatOrMiss = record.eps_actual >= record.eps_estimate ? 'beat' : 'miss';
      }

      return {
        date: record.report_date,
        quarter: record.fiscal_period || format(parseISO(record.report_date), "'Q'Q yyyy"),
        epsActual: record.eps_actual,
        epsEstimate: record.eps_estimate,
        epsSurprise: epsSurprise ?? 0,
        priceReturn5Day: record.price_change_pct ?? 0,
        beatOrMiss,
      };
    });
  }, [historyData]);

  const stats = useMemo(() => {
    if (earningsHistory.length === 0) {
      return {
        totalReports: 0,
        beatCount: 0,
        beatRate: '0',
        avgSurprise: '0.0',
        avgReturnOnBeat: '0.0',
        avgReturnOnMiss: '0.0',
      };
    }

    const beats = earningsHistory.filter(e => e.beatOrMiss === 'beat');
    const misses = earningsHistory.filter(e => e.beatOrMiss === 'miss');
    
    return {
      totalReports: earningsHistory.length,
      beatCount: beats.length,
      beatRate: ((beats.length / earningsHistory.length) * 100).toFixed(0),
      avgSurprise: (earningsHistory.reduce((sum, e) => sum + e.epsSurprise, 0) / earningsHistory.length).toFixed(1),
      avgReturnOnBeat: beats.length > 0 
        ? (beats.reduce((sum, e) => sum + e.priceReturn5Day, 0) / beats.length).toFixed(1) 
        : '0.0',
      avgReturnOnMiss: misses.length > 0
        ? (misses.reduce((sum, e) => sum + e.priceReturn5Day, 0) / misses.length).toFixed(1)
        : '0.0',
    };
  }, [earningsHistory]);

  // Chart data for surprise vs return
  const surpriseReturnData = useMemo(() => {
    return [...earningsHistory].reverse().slice(-6).map(e => ({
      quarter: e.quarter.replace('20', "'").replace(' ', ' '),
      surprise: parseFloat(e.epsSurprise.toFixed(1)),
      return: e.priceReturn5Day,
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
          ? parseFloat((beats.reduce((sum, e) => sum + e.priceReturn5Day, 0) / beats.length).toFixed(1))
          : 0,
        fill: 'hsl(var(--primary))',
      },
      {
        name: 'On Misses',
        return: misses.length > 0
          ? parseFloat((misses.reduce((sum, e) => sum + e.priceReturn5Day, 0) / misses.length).toFixed(1))
          : 0,
        fill: 'hsl(var(--destructive))',
      },
    ];
  }, [earningsHistory]);

  if (historyLoading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-2 space-y-2">
          <div className="flex items-center gap-1.5">
            <BarChart3 className="h-3 w-3 text-primary" />
            <span className="text-[10px] md:text-xs font-medium">Earnings Impact</span>
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
            <p className="text-xs md:text-sm font-bold text-primary">{stats.beatRate}%</p>
          </div>
          <div className="text-center">
            <p className="text-[7px] md:text-[8px] text-muted-foreground uppercase">Avg Surprise</p>
            <p className={cn(
              "text-xs md:text-sm font-bold",
              parseFloat(stats.avgSurprise) >= 0 ? "text-primary" : "text-destructive"
            )}>
              {parseFloat(stats.avgSurprise) >= 0 ? '+' : ''}{stats.avgSurprise}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-[7px] md:text-[8px] text-muted-foreground uppercase">5D on Beat</p>
            <p className={cn(
              "text-xs md:text-sm font-bold",
              parseFloat(stats.avgReturnOnBeat) >= 0 ? "text-primary" : "text-destructive"
            )}>
              {parseFloat(stats.avgReturnOnBeat) >= 0 ? '+' : ''}{stats.avgReturnOnBeat}%
            </p>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-1.5 border-b border-border">
          {/* Surprise vs Return Chart */}
          <div>
            <p className="text-[8px] text-muted-foreground uppercase mb-1">Surprise vs 5-Day Return</p>
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
                    name="5D Return"
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
            <p className="text-[8px] text-muted-foreground uppercase mb-1">Avg 5-Day Return by Outcome</p>
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
          <p className="text-[8px] text-muted-foreground uppercase">Earnings History</p>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {earningsHistory.slice(0, 8).map((earning, idx) => (
              <div 
                key={idx} 
                className="flex items-center justify-between py-1 px-1.5 bg-secondary/30 rounded text-[9px] md:text-[10px]"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-muted-foreground w-16">{earning.quarter}</span>
                  <Badge 
                    variant={earning.beatOrMiss === 'beat' ? 'default' : 'destructive'} 
                    className="h-4 px-1.5 text-[8px]"
                  >
                    {earning.beatOrMiss === 'beat' ? 'BEAT' : 'MISS'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  {/* Actual EPS */}
                  <div className="flex items-center gap-0.5" title="Actual EPS">
                    <DollarSign className="h-2.5 w-2.5 text-muted-foreground" />
                    <span className="font-semibold tabular-nums text-foreground">
                      {earning.epsActual !== null ? `$${earning.epsActual.toFixed(2)}` : '—'}
                    </span>
                  </div>
                  {/* EPS Surprise % */}
                  <div className="flex items-center gap-0.5 min-w-[50px]" title="EPS Surprise %">
                    <Target className="h-2.5 w-2.5 text-muted-foreground" />
                    <span className={cn(
                      "font-medium tabular-nums",
                      earning.epsSurprise >= 0 ? "text-primary" : "text-destructive"
                    )}>
                      {earning.epsSurprise >= 0 ? '+' : ''}{earning.epsSurprise.toFixed(1)}%
                    </span>
                  </div>
                  {/* 5D Price Return */}
                  {earning.priceReturn5Day !== 0 && (
                    <div className="flex items-center gap-0.5 min-w-[50px]" title="5-Day Price Return">
                      {earning.priceReturn5Day >= 0 ? (
                        <TrendingUp className="h-2.5 w-2.5 text-primary" />
                      ) : (
                        <TrendingDown className="h-2.5 w-2.5 text-destructive" />
                      )}
                      <span className={cn(
                        "font-medium tabular-nums",
                        earning.priceReturn5Day >= 0 ? "text-primary" : "text-destructive"
                      )}>
                        {earning.priceReturn5Day >= 0 ? '+' : ''}{earning.priceReturn5Day.toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
