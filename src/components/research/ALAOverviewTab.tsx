import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, RefreshCw, Building2, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { QuickHistoricalInsights, StreakData, HistoricalPattern } from './QuickHistoricalInsights';
import { BasicStatsData } from './BasicStatistics';
import { CandlestickChart } from '@/components/charts/CandlestickChart';
import { useTickerSnapshot } from '@/hooks/useTickerSnapshot';
import { useTickerFundamentals } from '@/hooks/useTickerFundamentals';
import { useTickerAnalystData } from '@/hooks/useTickerAnalystData';

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
    <div className="space-y-2">
      {/* TOP CARD: Price + OHLC + Key Stats - Ultra Compact */}
      <Card className="bg-card border-border">
        <CardContent className="p-1.5 md:p-2">
          {/* Row 1: Price & Change + Refresh */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-baseline gap-2 min-w-0">
              <span className="text-lg md:text-xl font-bold tabular-nums text-foreground">
                {formatCurrency(quote?.price || 0)}
              </span>
              <span className="flex items-center gap-0.5 text-[10px] md:text-xs font-medium shrink-0 text-muted-foreground">
                {isPositive ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                <span className="tabular-nums">
                  {isPositive ? '+' : ''}{(quote?.change || 0).toFixed(2)} ({isPositive ? '+' : ''}{(quote?.changePercent || 0).toFixed(2)}%)
                </span>
              </span>
            </div>
            {onRefresh && (
              <Button variant="ghost" size="icon" onClick={onRefresh} disabled={isRefreshing} className="h-5 w-5 shrink-0">
                <RefreshCw className={cn("h-2.5 w-2.5", isRefreshing && "animate-spin")} />
              </Button>
            )}
          </div>

          {/* Row 2: OHLC + Key Stats inline - compact */}
          <div className="grid grid-cols-4 md:grid-cols-8 gap-1 text-center">
            <div>
              <p className="text-[7px] md:text-[8px] text-muted-foreground uppercase">Open</p>
              <p className="text-[9px] md:text-[10px] font-semibold tabular-nums">{formatCurrency(quote?.open || 0)}</p>
            </div>
            <div>
              <p className="text-[7px] md:text-[8px] text-muted-foreground uppercase">High</p>
              <p className="text-[9px] md:text-[10px] font-semibold tabular-nums">{formatCurrency(quote?.high || 0)}</p>
            </div>
            <div>
              <p className="text-[7px] md:text-[8px] text-muted-foreground uppercase">Low</p>
              <p className="text-[9px] md:text-[10px] font-semibold tabular-nums">{formatCurrency(quote?.low || 0)}</p>
            </div>
            <div>
              <p className="text-[7px] md:text-[8px] text-muted-foreground uppercase">Prev</p>
              <p className="text-[9px] md:text-[10px] font-semibold tabular-nums">{quote?.previousClose ? formatCurrency(quote.previousClose) : '—'}</p>
            </div>
            <div className="hidden md:block">
              <p className="text-[7px] md:text-[8px] text-muted-foreground uppercase">Mkt Cap</p>
              <p className="text-[9px] md:text-[10px] font-semibold">{formatMarketCap(marketCap)}</p>
            </div>
            <div className="hidden md:block">
              <p className="text-[7px] md:text-[8px] text-muted-foreground uppercase">Volume</p>
              <p className="text-[9px] md:text-[10px] font-semibold">{formatVolume(quote?.volume)}</p>
            </div>
            <div className="hidden md:block">
              <p className="text-[7px] md:text-[8px] text-muted-foreground uppercase">P/E</p>
              <p className="text-[9px] md:text-[10px] font-semibold">{peRatio?.toFixed(1) || '—'}</p>
            </div>
            <div className="hidden md:block">
              <p className="text-[7px] md:text-[8px] text-muted-foreground uppercase">Beta</p>
              <p className="text-[9px] md:text-[10px] font-semibold">{beta?.toFixed(2) || '—'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CHART with 52W Range inline */}
      <div className="space-y-1">
        <CandlestickChart 
          symbol={ticker} 
          height={200}
          showVolume={true}
          showRangeSelector={true}
          defaultRange="3M"
        />
        
        {/* 52-Week Range - Inline bar, no card wrapper */}
        <div className="flex items-center gap-2 px-1">
          <span className="text-[7px] md:text-[8px] text-muted-foreground">52W Range</span>
          <div className="flex-1 relative h-1 bg-secondary rounded-full overflow-hidden">
            <div className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-muted-foreground/40 via-muted-foreground/60 to-muted-foreground/80 rounded-full" />
            <div 
              className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-foreground rounded-full border border-primary"
              style={{ left: `calc(${Math.min(100, Math.max(0, rangePosition))}% - 3px)` }}
            />
          </div>
          <span className="text-[7px] md:text-[8px] text-muted-foreground tabular-nums">
            ${week52Low?.toFixed(0) || '—'} - ${week52High?.toFixed(0) || '—'}
          </span>
        </div>
      </div>

      {/* Trading Day Summary - Clear descriptive labels */}
      {basicStats && (
        <Card className="bg-card border-border">
          <CardContent className="p-2">
            <p className="text-[9px] text-muted-foreground mb-1.5">Past {basicStats.totalDays} trading days breakdown</p>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-1">
              <div className="bg-secondary/50 border border-border rounded px-1.5 py-1 text-center">
                <span className="text-[8px] text-muted-foreground block">Days Closing Higher</span>
                <p className="text-xs font-bold leading-tight">{basicStats.upDays}</p>
              </div>
              <div className="bg-secondary/50 border border-border rounded px-1.5 py-1 text-center">
                <span className="text-[8px] text-muted-foreground block">Days Closing Lower</span>
                <p className="text-xs font-bold leading-tight">{basicStats.downDays}</p>
              </div>
              <div className="bg-secondary/50 border border-border rounded px-1.5 py-1 text-center">
                <span className="text-[8px] text-muted-foreground block">Unchanged Days</span>
                <p className="text-xs font-bold leading-tight">{basicStats.flatDays}</p>
              </div>
              <div className="bg-secondary/50 border border-border rounded px-1.5 py-1 text-center">
                <span className="text-[8px] text-muted-foreground block">Biggest Single-Day Gain</span>
                <p className="text-xs font-bold leading-tight">+{basicStats.bestDay.change.toFixed(1)}%</p>
              </div>
              <div className="bg-secondary/50 border border-border rounded px-1.5 py-1 text-center">
                <span className="text-[8px] text-muted-foreground block">Biggest Single-Day Loss</span>
                <p className="text-xs font-bold leading-tight">{basicStats.worstDay.change.toFixed(1)}%</p>
              </div>
              <div className="bg-secondary/50 border border-border rounded px-1.5 py-1 text-center">
                <span className="text-[8px] text-muted-foreground block">Avg Daily Movement</span>
                <p className="text-xs font-bold leading-tight">{basicStats.avgDailyMovePercent.toFixed(2)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analyst & Financials Card - Compact */}
      <Card className="bg-card border-border">
        <CardContent className="p-1.5 md:p-2">
          <div className="grid grid-cols-3 md:grid-cols-6 gap-1 md:gap-2 text-center">
            <div>
              <p className="text-[7px] md:text-[8px] text-muted-foreground uppercase">Rating</p>
              <Badge className={cn("text-[8px] md:text-[9px] px-1 py-0", ratingColors[analystRating] || ratingColors['Buy'])}>
                {analystRating}
              </Badge>
            </div>
            <div>
              <p className="text-[7px] md:text-[8px] text-muted-foreground uppercase">Target</p>
              {priceTarget ? (
                <p className="text-[9px] md:text-[10px] font-semibold">
                  {formatCurrency(priceTarget)}
                  <span className="ml-0.5 text-[7px] text-muted-foreground">
                    ({priceTarget > (quote?.price || 0) ? '+' : ''}{(((priceTarget - (quote?.price || 0)) / (quote?.price || 1)) * 100).toFixed(0)}%)
                  </span>
                </p>
              ) : <p className="text-[9px] md:text-[10px] font-semibold">—</p>}
            </div>
            <div>
              <p className="text-[7px] md:text-[8px] text-muted-foreground uppercase">Earnings</p>
              <p className="text-[9px] md:text-[10px] font-semibold">{nextEarnings || '—'}</p>
            </div>
            <div className="hidden md:block">
              <p className="text-[7px] md:text-[8px] text-muted-foreground uppercase">EPS</p>
              <p className="text-[9px] md:text-[10px] font-semibold">{eps ? `$${eps.toFixed(2)}` : '—'}</p>
            </div>
            <div className="hidden md:block">
              <p className="text-[7px] md:text-[8px] text-muted-foreground uppercase">Mkt Cap</p>
              <p className="text-[9px] md:text-[10px] font-semibold">{formatMarketCap(marketCap)}</p>
            </div>
            <div className="hidden md:block">
              <p className="text-[7px] md:text-[8px] text-muted-foreground uppercase">Volume</p>
              <p className="text-[9px] md:text-[10px] font-semibold">{formatVolume(quote?.volume)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ABOUT SECTION: Compact */}
      {description && (
        <Card className="bg-card border-border">
          <CardContent className="p-2">
            <div className="flex items-center gap-1.5 mb-1">
              <Building2 className="h-3 w-3" />
              <span className="text-[10px] md:text-xs font-medium">About {companyName || ticker}</span>
            </div>
            <p className="text-[9px] md:text-[10px] text-muted-foreground leading-relaxed line-clamp-3 mb-1.5">{description}</p>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1.5 border-t border-border">
              <div>
                <p className="text-[7px] md:text-[8px] text-muted-foreground uppercase">Sector</p>
                <p className="text-[9px] md:text-[10px] font-medium">{sector || '—'}</p>
              </div>
              <div>
                <p className="text-[7px] md:text-[8px] text-muted-foreground uppercase">Industry</p>
                <p className="text-[9px] md:text-[10px] font-medium">{industry || '—'}</p>
              </div>
              <div>
                <p className="text-[7px] md:text-[8px] text-muted-foreground uppercase">Exchange</p>
                <p className="text-[9px] md:text-[10px] font-medium">{exchange || '—'}</p>
              </div>
              {homepageUrl && (
                <div>
                  <p className="text-[7px] md:text-[8px] text-muted-foreground uppercase">Website</p>
                  <a 
                    href={homepageUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[9px] md:text-[10px] text-primary hover:underline font-medium flex items-center gap-0.5"
                  >
                    <Globe className="h-2.5 w-2.5" />
                    Visit
                  </a>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

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