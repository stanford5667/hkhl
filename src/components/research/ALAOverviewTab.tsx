import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, RefreshCw, Building2, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { QuickHistoricalInsights, StreakData, HistoricalPattern } from './QuickHistoricalInsights';
import { BasicStatsData } from './BasicStatistics';
import { CandlestickChart } from '@/components/charts/CandlestickChart';
import { useTickerSnapshot } from '@/hooks/useTickerSnapshot';
import { useTickerFundamentals } from '@/hooks/useTickerFundamentals';
import { useTickerAnalystData } from '@/hooks/useTickerAnalystData';

const LOOKBACK_OPTIONS = [
  { value: '90', label: '90 Days' },
  { value: '180', label: '180 Days' },
  { value: '365', label: '1 Year' },
  { value: '730', label: '2 Years' },
  { value: 'all', label: 'All Data' },
];
interface ALAOverviewTabProps {
  ticker: string;
  companyName?: string;
  exchange?: string;
  sector?: string;
  industry?: string;
  description?: string;
  homepageUrl?: string;
  quote: {
    price: number;
    change: number;
    changePercent: number;
    open: number;
    high: number;
    low: number;
    previousClose?: number;
    marketCap?: number;
    volume?: number;
  } | null;
  isLoadingQuote?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function ALAOverviewTab({
  ticker,
  companyName,
  exchange,
  sector,
  industry,
  description,
  homepageUrl,
  quote,
  isLoadingQuote = false,
  onRefresh,
  isRefreshing = false,
}: ALAOverviewTabProps) {
  // Lookback state for trading days stats
  const [lookbackDays, setLookbackDays] = useState<number | undefined>(undefined);

  // Fetch real data from edge functions
  const { data: snapshot, isLoading: snapshotLoading, isFetching: snapshotFetching } = useTickerSnapshot(ticker, lookbackDays);
  const { data: fundamentals, isLoading: fundLoading } = useTickerFundamentals(ticker);
  const { data: analystData, isLoading: analystLoading } = useTickerAnalystData(ticker);

  const isPositive = (quote?.change || 0) >= 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatMarketCap = (value: number | undefined) => {
    if (!value) return '—';
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    return `$${value.toLocaleString()}`;
  };

  const formatVolume = (value: number | undefined) => {
    if (!value) return '—';
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
    return value.toLocaleString();
  };

  // Calculate 52-week range position
  const week52High = snapshot?.yearRange?.week52High;
  const week52Low = snapshot?.yearRange?.week52Low;
  const rangePosition = week52High && week52Low && quote?.price
    ? ((quote.price - week52Low) / (week52High - week52Low)) * 100
    : 50;

  // Derive streak data from snapshot
  const streakData: StreakData | null = useMemo(() => {
    if (!snapshot?.streaks) return null;
    
    const streaks = snapshot.streaks;
    const currentStreak = streaks.currentStreak;
    const direction = currentStreak >= 0 ? 'up' : 'down';
    const absStreak = Math.abs(currentStreak);
    
    const streakAnalysis = streaks.analysis.find(a => a.streak === currentStreak);
    const continuationRate = streakAnalysis?.continuationRate || 50;
    const avgNextDayReturn = streakAnalysis?.avgNextDayReturn || 0;
    
    const allStreaks = streaks.analysis.map(a => Math.abs(a.streak));
    const maxStreak = allStreaks.length > 0 ? Math.max(...allStreaks) : absStreak;
    const avgStreak = allStreaks.length > 0 ? allStreaks.reduce((a, b) => a + b, 0) / allStreaks.length : absStreak;
    
    const totalChange = streaks.actualTotalChange ?? (snapshot.dailyVolatility * absStreak * (direction === 'down' ? -1 : 1));
    const startDate = streaks.streakStartDate 
      ? new Date(streaks.streakStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : new Date(Date.now() - absStreak * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    
    const recoveryDays = streaks.avgRecoveryDays;
    const recoveryPeriod = recoveryDays 
      ? (recoveryDays <= 5 ? `${recoveryDays} days` : recoveryDays <= 7 ? '1 week' : `${Math.round(recoveryDays / 7)} weeks`)
      : 'N/A';
    
    return {
      direction,
      consecutiveDays: absStreak,
      totalChange,
      startDate,
      maxStreak,
      avgStreak,
      sampleSize: streaks.historicalStreakCount || streakAnalysis?.occurrences || streaks.analysis.reduce((sum, a) => sum + a.occurrences, 0),
      percentile: Math.round((absStreak / maxStreak) * 100),
      bounceProbability: 100 - continuationRate,
      avgRecovery: Math.abs(avgNextDayReturn),
      recoveryPeriod,
    };
  }, [snapshot]);

  // Derive active patterns from snapshot signals
  const activePatterns: HistoricalPattern[] = useMemo(() => {
    if (!snapshot) return [];
    
    const patterns: HistoricalPattern[] = [];
    
    if (snapshot.rsi?.signal === 'oversold') {
      patterns.push({ id: 'rsi_oversold', name: 'RSI Oversold', winRate: snapshot.rsi.oversoldBounces?.winRate || 55 });
    }
    if (snapshot.rsi?.signal === 'overbought') {
      patterns.push({ id: 'rsi_overbought', name: 'RSI Overbought', winRate: snapshot.rsi.overboughtDrops?.winRate || 52 });
    }
    if (snapshot.bollinger?.signal === 'oversold') {
      patterns.push({ id: 'bollinger_low', name: 'Near Lower Band', winRate: snapshot.bollinger.lowerBounceRate || 60 });
    }
    if (snapshot.bollinger?.signal === 'overbought') {
      patterns.push({ id: 'bollinger_high', name: 'Near Upper Band', winRate: snapshot.bollinger.upperRejectionRate || 55 });
    }
    if (snapshot.gaps?.recentGaps?.length > 0) {
      const recentUnfilled = snapshot.gaps.recentGaps.filter(g => !g.filled);
      if (recentUnfilled.length > 0) {
        patterns.push({
          id: 'unfilled_gap',
          name: 'Unfilled Gap',
          winRate: snapshot.gaps.upGapFillRate || snapshot.gaps.downGapFillRate || 65
        });
      }
    }
    
    return patterns;
  }, [snapshot]);

  // Derive basic stats from snapshot
  const basicStats: BasicStatsData | null = useMemo(() => {
    if (!snapshot?.extremeDays) return null;
    
    const extremes = snapshot.extremeDays;
    
    return {
      avgDailyMove: extremes.avgDailyMove,
      avgDailyMovePercent: extremes.avgDailyMovePercent,
      upDays: extremes.upDays,
      downDays: extremes.downDays,
      flatDays: extremes.flatDays,
      totalDays: extremes.totalDays,
      bestDay: extremes.bestDay,
      worstDay: extremes.worstDay,
      topBestDays: extremes.topBest?.map(d => d.change) || [],
      topWorstDays: extremes.topWorst?.map(d => d.change) || [],
    };
  }, [snapshot]);

  const isDataLoading = snapshotLoading || fundLoading || analystLoading;
  const analystRating = analystData?.analyst?.rating || 'Buy';
  const priceTarget = analystData?.priceTarget?.targetMean;
  const nextEarnings = analystData?.nextEarnings?.formatted;
  const peRatio = fundamentals?.peRatio;
  const eps = fundamentals?.eps;
  const marketCap = fundamentals?.marketCap || quote?.marketCap;
  const beta = snapshot?.volatility?.annualizedVolatility ? snapshot.volatility.annualizedVolatility / 15 : undefined;

  const ratingColors: Record<string, string> = {
    'Strong Buy': 'bg-emerald-500/20 text-emerald-400',
    'Buy': 'bg-emerald-500/20 text-emerald-400',
    'Hold': 'bg-amber-500/20 text-amber-400',
    'Sell': 'bg-rose-500/20 text-rose-400',
  };

  if (isLoadingQuote || isDataLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-[300px] w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Main Grid: Chart + Stats Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        {/* Chart Column - 2/3 width */}
        <Card className="bg-card border-border lg:col-span-2 overflow-hidden">
          {/* Price Header */}
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-3 pt-3 pb-2">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-sm md:text-base font-medium text-muted-foreground truncate max-w-[200px]">
                {companyName || ticker}
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-xl md:text-2xl font-bold tabular-nums text-foreground">
                  {formatCurrency(quote?.price || 0)}
                </span>
                <span className={cn(
                  "flex items-center gap-0.5 text-xs font-medium",
                  isPositive ? "text-primary" : "text-destructive"
                )}>
                  {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  <span className="tabular-nums">
                    {isPositive ? '+' : ''}{(quote?.change || 0).toFixed(2)} ({isPositive ? '+' : ''}{(quote?.changePercent || 0).toFixed(2)}%)
                  </span>
                </span>
              </div>
            </div>
            
            {/* OHLC + Prev inline */}
            <div className="flex items-center gap-3 text-[10px] md:text-xs">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">O:</span>
                <span className="font-medium tabular-nums">{formatCurrency(quote?.open || 0)}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">H:</span>
                <span className="font-medium tabular-nums">{formatCurrency(quote?.high || 0)}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">L:</span>
                <span className="font-medium tabular-nums">{formatCurrency(quote?.low || 0)}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Prev:</span>
                <span className="font-medium tabular-nums">{quote?.previousClose ? formatCurrency(quote.previousClose) : '—'}</span>
              </div>
            </div>

            {onRefresh && (
              <Button variant="ghost" size="icon" onClick={onRefresh} disabled={isRefreshing} className="h-6 w-6 shrink-0">
                <RefreshCw className={cn("h-3 w-3", isRefreshing && "animate-spin")} />
              </Button>
            )}
          </div>

          {/* Chart - full width, no side padding */}
          <div className="w-full">
            <CandlestickChart 
              symbol={ticker} 
              height={200}
              showVolume={true}
              showRangeSelector={true}
              defaultRange="3M"
            />
          </div>
          
          {/* 52-Week Range */}
          <div className="flex items-center gap-2 px-3 py-2">
            <span className="text-[8px] text-muted-foreground font-medium">52W</span>
            <div className="flex-1 relative h-1.5 bg-secondary rounded-full overflow-hidden">
              <div className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-primary/20 via-primary/40 to-primary/60 rounded-full" />
              <div 
                className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-primary rounded-full shadow-sm shadow-primary/50"
                style={{ left: `calc(${Math.min(100, Math.max(0, rangePosition))}% - 4px)` }}
              />
            </div>
            <span className="text-[8px] text-muted-foreground tabular-nums">
              ${week52Low?.toFixed(0) || '—'} — ${week52High?.toFixed(0) || '—'}
            </span>
          </div>
        </Card>

        {/* Stats Column - 1/3 width */}
        <div className="space-y-2">
          {/* ABOUT SECTION - moved above stats */}
          {description && (
            <Card className="bg-card border-border">
              <CardContent className="p-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <Building2 className="h-3 w-3" />
                  <span className="text-[10px] md:text-xs font-medium">About {companyName || ticker}</span>
                </div>
                <p className="text-[9px] md:text-[10px] text-muted-foreground leading-relaxed line-clamp-4 mb-1.5">{description}</p>
                
                <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-border">
                  <div>
                    <p className="text-[7px] md:text-[8px] text-muted-foreground uppercase">Sector</p>
                    <p className="text-[9px] md:text-[10px] font-medium">{sector || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[7px] md:text-[8px] text-muted-foreground uppercase">Exchange</p>
                    <p className="text-[9px] md:text-[10px] font-medium">{exchange || '—'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Trading Stats Card */}
          {basicStats && (
            <Card className="bg-card border-border">
              <CardContent className="p-2">
                {/* Mkt Cap, EPS, Next Earnings Row */}
                <div className="grid grid-cols-3 gap-1.5 mb-2">
                  <div className="bg-primary/5 border border-primary/20 rounded px-2 py-1 text-center">
                    <span className="text-[7px] text-primary/80 block leading-tight uppercase font-medium">Mkt Cap</span>
                    <p className="text-[10px] font-bold text-foreground">{formatMarketCap(marketCap)}</p>
                  </div>
                  <div className="bg-secondary/50 border border-border rounded px-2 py-1 text-center">
                    <span className="text-[7px] text-muted-foreground block leading-tight uppercase">EPS</span>
                    <p className="text-[10px] font-bold">{eps ? `$${eps.toFixed(2)}` : '—'}</p>
                  </div>
                  <div className="bg-secondary/50 border border-border rounded px-2 py-1 text-center">
                    <span className="text-[7px] text-muted-foreground block leading-tight uppercase">Earnings</span>
                    <p className="text-[10px] font-bold">{nextEarnings || '—'}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                    Past {basicStats.totalDays} trading days
                    {snapshotFetching && <RefreshCw className="h-2.5 w-2.5 animate-spin ml-1" />}
                  </div>
                  <Select 
                    value={lookbackDays?.toString() || 'all'} 
                    onValueChange={(val) => setLookbackDays(val === 'all' ? undefined : parseInt(val))}
                  >
                    <SelectTrigger className="h-5 w-[80px] text-[8px] bg-secondary/50 border-border px-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border z-50">
                      {LOOKBACK_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value} className="text-[10px]">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="bg-primary/5 border border-primary/20 rounded px-2 py-1.5 text-center">
                    <span className="text-[7px] text-muted-foreground block leading-tight">Days Closing Higher</span>
                    <p className="text-sm font-bold text-foreground">{basicStats.upDays}</p>
                  </div>
                  <div className="bg-secondary/50 border border-border rounded px-2 py-1.5 text-center">
                    <span className="text-[7px] text-muted-foreground block leading-tight">Days Closing Lower</span>
                    <p className="text-sm font-bold">{basicStats.downDays}</p>
                  </div>
                  <div className="bg-secondary/50 border border-border rounded px-2 py-1.5 text-center">
                    <span className="text-[7px] text-muted-foreground block leading-tight">Unchanged Days</span>
                    <p className="text-sm font-bold">{basicStats.flatDays}</p>
                  </div>
                  <div className="bg-secondary/50 border border-border rounded px-2 py-1.5 text-center">
                    <span className="text-[7px] text-muted-foreground block leading-tight">Avg Daily Move</span>
                    <p className="text-sm font-bold">{basicStats.avgDailyMovePercent.toFixed(2)}%</p>
                  </div>
                  <div className="bg-primary/5 border border-primary/20 rounded px-2 py-1.5 text-center">
                    <span className="text-[7px] text-muted-foreground block leading-tight">Best Day</span>
                    <p className="text-sm font-bold text-foreground">+{basicStats.bestDay.change.toFixed(1)}%</p>
                  </div>
                  <div className="bg-secondary/50 border border-border rounded px-2 py-1.5 text-center">
                    <span className="text-[7px] text-muted-foreground block leading-tight">Worst Day</span>
                    <p className="text-sm font-bold">{basicStats.worstDay.change.toFixed(1)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Quick Historical Insights */}
      <QuickHistoricalInsights 
        ticker={ticker} 
        streakData={streakData}
        activePatterns={activePatterns}
        isLoading={snapshotLoading}
      />
    </div>
  );
}

export default ALAOverviewTab;