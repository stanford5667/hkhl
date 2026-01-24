import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { QuickHistoricalInsights, StreakData, HistoricalPattern } from './QuickHistoricalInsights';
import { BasicStatistics, BasicStatsData } from './BasicStatistics';
import { CandlestickChart } from '@/components/charts/CandlestickChart';
import { useTickerSnapshot } from '@/hooks/useTickerSnapshot';
import { useTickerFundamentals } from '@/hooks/useTickerFundamentals';
import { useTickerAnalystData } from '@/hooks/useTickerAnalystData';

interface ALAOverviewTabProps {
  ticker: string;
  companyName?: string;
  exchange?: string;
  sector?: string;
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
  quote,
  isLoadingQuote = false,
  onRefresh,
  isRefreshing = false,
}: ALAOverviewTabProps) {
  const [chartTimeframe, setChartTimeframe] = useState<string>('3M');
  const [statsTimeRange, setStatsTimeRange] = useState<'1Y' | '3Y' | '5Y'>('3Y');

  // Fetch real data from edge functions
  const { data: snapshot, isLoading: snapshotLoading } = useTickerSnapshot(ticker);
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
    <div className="space-y-3 md:space-y-4">
      {/* TOP CARD: Price + OHLC + Key Stats + 52-Week Range */}
      <Card className="bg-card border-border">
        <CardContent className="p-2 md:p-4 space-y-2 md:space-y-3">
          {/* Row 1: Price & Change + Refresh */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-baseline gap-2 md:gap-3 min-w-0">
              <span className="text-xl md:text-2xl font-bold tabular-nums text-foreground">
                {formatCurrency(quote?.price || 0)}
              </span>
              <span className={cn(
                "flex items-center gap-0.5 text-xs md:text-sm font-medium shrink-0",
                isPositive ? "text-emerald-400" : "text-rose-400"
              )}>
                {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                <span className="tabular-nums">
                  {isPositive ? '+' : ''}{(quote?.change || 0).toFixed(2)} ({isPositive ? '+' : ''}{(quote?.changePercent || 0).toFixed(2)}%)
                </span>
              </span>
            </div>
            {onRefresh && (
              <Button variant="ghost" size="icon" onClick={onRefresh} disabled={isRefreshing} className="h-6 w-6 shrink-0">
                <RefreshCw className={cn("h-3 w-3", isRefreshing && "animate-spin")} />
              </Button>
            )}
          </div>

          {/* Row 2: OHLC + Key Stats inline */}
          <div className="grid grid-cols-4 md:grid-cols-8 gap-1.5 md:gap-3 text-center">
            <div>
              <p className="text-[8px] md:text-[10px] text-muted-foreground uppercase">Open</p>
              <p className="text-[10px] md:text-xs font-semibold tabular-nums">{formatCurrency(quote?.open || 0)}</p>
            </div>
            <div>
              <p className="text-[8px] md:text-[10px] text-muted-foreground uppercase">High</p>
              <p className="text-[10px] md:text-xs font-semibold tabular-nums text-emerald-400">{formatCurrency(quote?.high || 0)}</p>
            </div>
            <div>
              <p className="text-[8px] md:text-[10px] text-muted-foreground uppercase">Low</p>
              <p className="text-[10px] md:text-xs font-semibold tabular-nums text-rose-400">{formatCurrency(quote?.low || 0)}</p>
            </div>
            <div>
              <p className="text-[8px] md:text-[10px] text-muted-foreground uppercase">Prev</p>
              <p className="text-[10px] md:text-xs font-semibold tabular-nums">{quote?.previousClose ? formatCurrency(quote.previousClose) : '—'}</p>
            </div>
            <div className="hidden md:block">
              <p className="text-[8px] md:text-[10px] text-muted-foreground uppercase">Mkt Cap</p>
              <p className="text-[10px] md:text-xs font-semibold">{formatMarketCap(marketCap)}</p>
            </div>
            <div className="hidden md:block">
              <p className="text-[8px] md:text-[10px] text-muted-foreground uppercase">Volume</p>
              <p className="text-[10px] md:text-xs font-semibold">{formatVolume(quote?.volume)}</p>
            </div>
            <div className="hidden md:block">
              <p className="text-[8px] md:text-[10px] text-muted-foreground uppercase">P/E</p>
              <p className="text-[10px] md:text-xs font-semibold">{peRatio?.toFixed(1) || '—'}</p>
            </div>
            <div className="hidden md:block">
              <p className="text-[8px] md:text-[10px] text-muted-foreground uppercase">Beta</p>
              <p className="text-[10px] md:text-xs font-semibold">{beta?.toFixed(2) || '—'}</p>
            </div>
          </div>

          {/* Row 3: 52-Week Range */}
          <div className="space-y-0.5">
            <div className="flex items-center justify-between text-[8px] md:text-[10px] text-muted-foreground">
              <span>52W Low: {week52Low ? formatCurrency(week52Low) : '—'}</span>
              <span>52W High: {week52High ? formatCurrency(week52High) : '—'}</span>
            </div>
            <div className="relative h-1.5 bg-secondary rounded-full overflow-hidden">
              <div className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500 rounded-full" />
              <div 
                className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full border-2 border-primary shadow-md"
                style={{ left: `calc(${Math.min(100, Math.max(0, rangePosition))}% - 4px)` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CHART: Full width */}
      <Card className="bg-card border-border">
        <CardContent className="p-2 md:p-4">
          <div className="flex items-center justify-between mb-2">
            <ToggleGroup 
              type="single" 
              value={chartTimeframe} 
              onValueChange={(v) => v && setChartTimeframe(v)}
              className="bg-secondary/50 rounded-md p-0.5"
            >
              {['1D', '1W', '1M', '3M', '6M', '1Y'].map((tf) => (
                <ToggleGroupItem 
                  key={tf} 
                  value={tf} 
                  className={cn(
                    "text-[9px] md:text-xs px-1.5 md:px-2.5 py-0.5 h-5 md:h-7 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                  )}
                >
                  {tf}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <Badge variant="secondary" className="text-[9px] md:text-xs">{chartTimeframe}</Badge>
          </div>
          <div className="h-[220px] md:h-[320px]">
            <CandlestickChart 
              symbol={ticker} 
              height={220}
              showVolume={true}
              showRangeSelector={false}
              defaultRange={chartTimeframe as any}
            />
          </div>
        </CardContent>
      </Card>

      {/* BELOW CHART: Analyst & Financials Card */}
      <Card className="bg-card border-border">
        <CardContent className="p-2 md:p-4">
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-4 text-center">
            <div>
              <p className="text-[8px] md:text-[10px] text-muted-foreground uppercase">Rating</p>
              <Badge className={cn("mt-0.5 text-[9px] md:text-xs px-1.5 py-0", ratingColors[analystRating] || ratingColors['Buy'])}>
                {analystRating}
              </Badge>
            </div>
            <div>
              <p className="text-[8px] md:text-[10px] text-muted-foreground uppercase">Target</p>
              {priceTarget ? (
                <p className="text-[10px] md:text-xs font-semibold">
                  {formatCurrency(priceTarget)}
                  <span className={cn("ml-0.5 text-[8px]", priceTarget > (quote?.price || 0) ? "text-emerald-400" : "text-rose-400")}>
                    ({priceTarget > (quote?.price || 0) ? '+' : ''}{(((priceTarget - (quote?.price || 0)) / (quote?.price || 1)) * 100).toFixed(0)}%)
                  </span>
                </p>
              ) : <p className="text-[10px] md:text-xs font-semibold">—</p>}
            </div>
            <div>
              <p className="text-[8px] md:text-[10px] text-muted-foreground uppercase">Earnings</p>
              <p className="text-[10px] md:text-xs font-semibold">{nextEarnings || '—'}</p>
            </div>
            <div className="hidden md:block">
              <p className="text-[8px] md:text-[10px] text-muted-foreground uppercase">EPS</p>
              <p className="text-[10px] md:text-xs font-semibold">{eps ? `$${eps.toFixed(2)}` : '—'}</p>
            </div>
            <div className="hidden md:block">
              <p className="text-[8px] md:text-[10px] text-muted-foreground uppercase">Mkt Cap</p>
              <p className="text-[10px] md:text-xs font-semibold">{formatMarketCap(marketCap)}</p>
            </div>
            <div className="hidden md:block">
              <p className="text-[8px] md:text-[10px] text-muted-foreground uppercase">Volume</p>
              <p className="text-[10px] md:text-xs font-semibold">{formatVolume(quote?.volume)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Historical Insights */}
      <QuickHistoricalInsights 
        ticker={ticker} 
        streakData={streakData}
        activePatterns={activePatterns}
        isLoading={snapshotLoading}
      />

      {/* Basic Statistics */}
      <BasicStatistics 
        ticker={ticker} 
        stats={basicStats}
        timeRange={statsTimeRange}
        onTimeRangeChange={setStatsTimeRange}
        isLoading={snapshotLoading}
      />
    </div>
  );
}

export default ALAOverviewTab;