import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, RefreshCw, Building2, ChevronDown, Activity, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { QuickHistoricalInsights, StreakData, HistoricalPattern } from './QuickHistoricalInsights';
import { EarningsImpactSection } from './EarningsImpactSection';
import { AutoStudiesSection } from './AutoStudiesSection';
import { BasicStatsData, BasicStatistics } from './BasicStatistics';
import { CandlestickChart } from '@/components/charts/CandlestickChart';
import { useTickerSnapshot } from '@/hooks/useTickerSnapshot';
import { useTickerFundamentals } from '@/hooks/useTickerFundamentals';
import { useTickerAnalystData } from '@/hooks/useTickerAnalystData';
import { PerformanceMetricsSection } from './PerformanceMetricsSection';
import { useProductSegments } from '@/hooks/useProductSegments';

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
  const { data: segmentsData, isLoading: segmentsLoading } = useProductSegments(ticker);

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
          {/* Price Header - Refined hierarchy */}
          <div className="px-3 pt-3 pb-2 space-y-1.5">
            {/* Row 1: Company name */}
            <h2 className="text-sm md:text-base font-semibold text-foreground truncate">
              {companyName || ticker}
            </h2>
            
            {/* Row 2: Price, Change + 52W Range */}
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
              <div className="flex items-baseline gap-2.5">
                <span className="text-2xl md:text-3xl font-bold tabular-nums text-foreground">
                  {formatCurrency(quote?.price || 0)}
                </span>
                <div className={cn(
                  "flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold",
                  isPositive ? "bg-emerald-500/15 text-emerald-500" : "bg-destructive/15 text-destructive"
                )}>
                  {isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                  <span className="tabular-nums">
                    {isPositive ? '+' : ''}{(quote?.change || 0).toFixed(2)} ({isPositive ? '+' : ''}{(quote?.changePercent || 0).toFixed(2)}%)
                  </span>
                </div>
              </div>
              
              {/* 52W Range - Desktop only (right of price) */}
              <div className="hidden lg:flex items-center gap-2 text-[10px]">
                <span className="text-muted-foreground font-medium">52W:</span>
                <span className="tabular-nums text-destructive font-medium">${week52Low?.toFixed(2) || '—'}</span>
                <div className="relative w-20 h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-destructive/40 via-muted to-emerald-500/40 rounded-full" />
                  <div 
                    className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-primary rounded-full shadow-md shadow-primary/50 border border-primary-foreground/20"
                    style={{ left: `calc(${Math.min(100, Math.max(0, rangePosition))}% - 5px)` }}
                  />
                </div>
                <span className="tabular-nums text-emerald-500 font-medium">${week52High?.toFixed(2) || '—'}</span>
              </div>
            </div>
            {/* Row 3: OHLC + Prev inline */}
            <div className="flex items-center gap-3 md:gap-4 text-[10px] md:text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <span className="opacity-70">O:</span>
                <span className="font-medium tabular-nums text-foreground">{formatCurrency(quote?.open || 0)}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="opacity-70">H:</span>
                <span className="font-medium tabular-nums text-emerald-500">{formatCurrency(quote?.high || 0)}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="opacity-70">L:</span>
                <span className="font-medium tabular-nums text-destructive">{formatCurrency(quote?.low || 0)}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="opacity-70">Prev:</span>
                <span className="font-medium tabular-nums text-foreground">{quote?.previousClose ? formatCurrency(quote.previousClose) : '—'}</span>
              </div>
            </div>
            
            {/* 52W Range - Mobile only */}
            <div className="flex lg:hidden items-center gap-2 text-[10px]">
              <span className="text-muted-foreground font-medium">52W:</span>
              <span className="tabular-nums text-destructive font-medium">${week52Low?.toFixed(2) || '—'}</span>
              <div className="relative flex-1 max-w-[120px] h-1.5 bg-secondary rounded-full overflow-hidden">
                <div className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-destructive/40 via-muted to-emerald-500/40 rounded-full" />
                <div 
                  className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-primary rounded-full shadow-md shadow-primary/50 border border-primary-foreground/20"
                  style={{ left: `calc(${Math.min(100, Math.max(0, rangePosition))}% - 5px)` }}
                />
              </div>
              <span className="tabular-nums text-emerald-500 font-medium">${week52High?.toFixed(2) || '—'}</span>
            </div>
            
            {/* Exchange + Sector badges */}
            <div className="flex items-center gap-1.5">
              {exchange && (
                <Badge variant="outline" className="text-[8px] px-1.5 py-0.5 h-5 bg-secondary/50 font-medium">
                  {exchange}
                </Badge>
              )}
              {sector && (
                <Badge variant="outline" className="text-[8px] px-1.5 py-0.5 h-5 bg-secondary/50 font-medium">
                  {sector}
                </Badge>
              )}
            </div>
          </div>

          {/* About Summary - Below price header, above chart */}
          {description && (
            <div className="px-3 pb-2">
              <p className="text-[9px] md:text-[10px] text-muted-foreground leading-relaxed line-clamp-2">{description}</p>
            </div>
          )}

          {/* Chart Section - Larger on desktop */}
          <div className="w-full">
            <CandlestickChart 
              symbol={ticker} 
              height={320}
              showVolume={true}
              showRangeSelector={true}
              defaultRange="3M"
              onRefresh={onRefresh}
              isRefreshing={isRefreshing}
            />
          </div>
        </Card>

        {/* Stats Column - 1/3 width */}
        <div className="space-y-2">
          {/* Key Financials Card */}
          <Card className="bg-card border-border">
            <CardContent className="p-2 space-y-2">
              <div className="flex items-center gap-1">
                <Building2 className="h-3 w-3 text-primary" />
                <span className="text-[10px] md:text-xs font-medium">Key Financials</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-1.5 bg-secondary/30 rounded text-center">
                  <p className="text-[7px] md:text-[8px] text-muted-foreground uppercase">Mkt Cap</p>
                  <p className="text-[10px] md:text-xs font-bold text-primary">{formatMarketCap(marketCap)}</p>
                </div>
                <div className="p-1.5 bg-secondary/30 rounded text-center">
                  <p className="text-[7px] md:text-[8px] text-muted-foreground uppercase">EPS</p>
                  <p className="text-[10px] md:text-xs font-bold">{eps ? `$${eps.toFixed(2)}` : '—'}</p>
                </div>
                <div className="p-1.5 bg-secondary/30 rounded text-center">
                  <p className="text-[7px] md:text-[8px] text-muted-foreground uppercase">P/E Ratio</p>
                  <p className="text-[10px] md:text-xs font-bold">{peRatio ? peRatio.toFixed(2) : '—'}</p>
                </div>
                <div className="p-1.5 bg-secondary/30 rounded text-center">
                  <p className="text-[7px] md:text-[8px] text-muted-foreground uppercase">Earnings</p>
                  <p className="text-[10px] md:text-xs font-bold">{nextEarnings || '—'}</p>
                </div>
            </div>
            </CardContent>
          </Card>

          {/* Top Products/Services Card */}
          <Card className="bg-card border-border">
            <CardContent className="p-2 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Package className="h-3 w-3 text-primary" />
                  <span className="text-[10px] md:text-xs font-medium">Revenue by Segment</span>
                </div>
                {segmentsData?.useMockData && (
                  <span className="text-[7px] text-muted-foreground">Demo</span>
                )}
              </div>
              
              {segmentsLoading ? (
                <div className="space-y-1.5">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : segmentsData?.segments && segmentsData.segments.length > 0 ? (
                <div className="space-y-1.5">
                  {segmentsData.segments.map((segment, index) => (
                    <div key={index} className="p-1.5 bg-secondary/30 rounded">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] md:text-[10px] font-medium truncate flex-1 pr-2">
                          {segment.name}
                        </span>
                        <span className="text-[9px] md:text-[10px] font-bold text-primary tabular-nums">
                          {segment.percentage.toFixed(0)}%
                        </span>
                      </div>
                      {/* Revenue bar */}
                      <div className="relative w-full h-1 bg-secondary rounded-full overflow-hidden">
                        <div 
                          className="absolute top-0 left-0 h-full bg-primary/60 rounded-full"
                          style={{ width: `${Math.min(100, segment.percentage)}%` }}
                        />
                      </div>
                      <div className="text-[7px] text-muted-foreground mt-0.5">
                        {segment.revenue >= 1e9 
                          ? `$${(segment.revenue / 1e9).toFixed(1)}B`
                          : segment.revenue >= 1e6 
                            ? `$${(segment.revenue / 1e6).toFixed(0)}M`
                            : `$${segment.revenue.toLocaleString()}`
                        }
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-2 text-center">
                  <p className="text-[9px] text-muted-foreground">Segment data not available</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Performance + Trading Days Card */}
          {basicStats && (
            <Card className="bg-card border-border">
              <CardContent className="p-2 space-y-2">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Activity className="h-3 w-3 text-primary" />
                    <span className="text-[10px] md:text-xs font-medium">
                      Past {basicStats.totalDays} Trading Days
                    </span>
                    {snapshotFetching && <RefreshCw className="h-2.5 w-2.5 animate-spin ml-1 text-muted-foreground" />}
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
                
                {/* Trading Day Stats */}
                <div className="grid grid-cols-3 gap-1">
                  <div className="p-1.5 bg-secondary/30 rounded text-center">
                    <span className="text-[7px] text-muted-foreground uppercase block">Up Days</span>
                    <p className="text-xs font-bold text-emerald-500">{basicStats.upDays}</p>
                  </div>
                  <div className="p-1.5 bg-secondary/30 rounded text-center">
                    <span className="text-[7px] text-muted-foreground uppercase block">Down Days</span>
                    <p className="text-xs font-bold text-destructive">{basicStats.downDays}</p>
                  </div>
                  <div className="p-1.5 bg-secondary/30 rounded text-center">
                    <span className="text-[7px] text-muted-foreground uppercase block">Flat Days</span>
                    <p className="text-xs font-bold">{basicStats.flatDays}</p>
                  </div>
                  <div className="p-1.5 bg-secondary/30 rounded text-center">
                    <span className="text-[7px] text-muted-foreground uppercase block">Avg Move</span>
                    <p className="text-xs font-bold">{basicStats.avgDailyMovePercent.toFixed(2)}%</p>
                  </div>
                  <div className="p-1.5 bg-secondary/30 rounded text-center">
                    <span className="text-[7px] text-muted-foreground uppercase block">Best Day</span>
                    <p className="text-xs font-bold text-emerald-500">+{basicStats.bestDay.change.toFixed(1)}%</p>
                  </div>
                  <div className="p-1.5 bg-secondary/30 rounded text-center">
                    <span className="text-[7px] text-muted-foreground uppercase block">Worst Day</span>
                    <p className="text-xs font-bold text-destructive">{basicStats.worstDay.change.toFixed(1)}%</p>
                  </div>
                </div>
                
                {/* Divider */}
                <div className="border-t border-border my-1" />
                
                {/* Performance Metrics */}
                <PerformanceMetricsSection ticker={ticker} compact />
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Quick Insights + Earnings Impact Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        <QuickHistoricalInsights 
          ticker={ticker} 
          streakData={streakData}
          activePatterns={activePatterns}
          isLoading={snapshotLoading}
        />
        <EarningsImpactSection ticker={ticker} nextEarnings={nextEarnings} />
      </div>

      {/* Auto Studies Section */}
      <AutoStudiesSection ticker={ticker} />
    </div>
  );
}

export default ALAOverviewTab;