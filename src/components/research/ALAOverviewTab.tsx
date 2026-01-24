import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { TrendingUp, Layers, Activity, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ALAStockInfoCard } from './ALAStockInfoCard';
import { QuickHistoricalInsights, StreakData, HistoricalPattern } from './QuickHistoricalInsights';
import { BasicStatistics, BasicStatsData } from './BasicStatistics';
import { CandlestickChart } from '@/components/charts/CandlestickChart';
import { useTickerSnapshot, TickerSnapshotData } from '@/hooks/useTickerSnapshot';
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
  const [showLevels, setShowLevels] = useState(true);
  const [showProbability, setShowProbability] = useState(false);
  const [statsTimeRange, setStatsTimeRange] = useState<'1Y' | '3Y' | '5Y'>('3Y');

  // Fetch real data from edge functions
  const { data: snapshot, isLoading: snapshotLoading } = useTickerSnapshot(ticker);
  const { data: fundamentals, isLoading: fundLoading } = useTickerFundamentals(ticker);
  const { data: analystData, isLoading: analystLoading } = useTickerAnalystData(ticker);

  // Derive streak data from snapshot - now with real data
  const streakData: StreakData | null = useMemo(() => {
    if (!snapshot?.streaks) return null;
    
    const streaks = snapshot.streaks;
    const currentStreak = streaks.currentStreak;
    const direction = currentStreak >= 0 ? 'up' : 'down';
    const absStreak = Math.abs(currentStreak);
    
    // Find matching streak analysis
    const streakAnalysis = streaks.analysis.find(a => a.streak === currentStreak);
    const continuationRate = streakAnalysis?.continuationRate || 50;
    const avgNextDayReturn = streakAnalysis?.avgNextDayReturn || 0;
    
    // Calculate max streak from analysis
    const allStreaks = streaks.analysis.map(a => Math.abs(a.streak));
    const maxStreak = allStreaks.length > 0 ? Math.max(...allStreaks) : absStreak;
    const avgStreak = allStreaks.length > 0 ? allStreaks.reduce((a, b) => a + b, 0) / allStreaks.length : absStreak;
    
    // Use real data from edge function
    const totalChange = streaks.actualTotalChange ?? (snapshot.dailyVolatility * absStreak * (direction === 'down' ? -1 : 1));
    const startDate = streaks.streakStartDate 
      ? new Date(streaks.streakStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : new Date(Date.now() - absStreak * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    
    // Real recovery period from edge function
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
    
    // RSI patterns
    if (snapshot.rsi?.signal === 'oversold') {
      patterns.push({ 
        id: 'rsi_oversold', 
        name: 'RSI Oversold', 
        winRate: snapshot.rsi.oversoldBounces?.winRate || 55 
      });
    }
    if (snapshot.rsi?.signal === 'overbought') {
      patterns.push({ 
        id: 'rsi_overbought', 
        name: 'RSI Overbought', 
        winRate: snapshot.rsi.overboughtDrops?.winRate || 52 
      });
    }
    
    // Bollinger patterns
    if (snapshot.bollinger?.signal === 'oversold') {
      patterns.push({ 
        id: 'bollinger_low', 
        name: 'Near Lower Band', 
        winRate: snapshot.bollinger.lowerBounceRate || 60 
      });
    }
    if (snapshot.bollinger?.signal === 'overbought') {
      patterns.push({ 
        id: 'bollinger_high', 
        name: 'Near Upper Band', 
        winRate: snapshot.bollinger.upperRejectionRate || 55 
      });
    }
    
    // Gap patterns
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

  // Key levels from real data (gaps + bollinger)
  const keyLevels = useMemo(() => {
    if (!snapshot || !quote?.price) return [];
    
    const levels: { price: number; winRate: number; type: 'support' | 'resistance'; label?: string }[] = [];
    
    // Add Bollinger bands as levels
    if (snapshot.bollinger) {
      levels.push({ 
        price: snapshot.bollinger.lower, 
        winRate: snapshot.bollinger.lowerBounceRate || 60, 
        type: 'support',
        label: 'Bollinger Lower'
      });
      levels.push({ 
        price: snapshot.bollinger.upper, 
        winRate: snapshot.bollinger.upperRejectionRate || 55, 
        type: 'resistance',
        label: 'Bollinger Upper'
      });
    }
    
    // Add unfilled gaps as levels
    if (snapshot.gaps?.recentGaps) {
      snapshot.gaps.recentGaps
        .filter(g => !g.filled)
        .slice(0, 2)
        .forEach((gap, i) => {
          const gapPrice = quote.price * (1 + gap.gapPercent / 100);
          levels.push({
            price: gapPrice,
            winRate: gap.gapPercent > 0 ? snapshot.gaps.upGapFillRate : snapshot.gaps.downGapFillRate,
            type: gap.gapPercent > 0 ? 'resistance' : 'support',
            label: `Gap ${gap.date}`
          });
        });
    }
    
    // Add 52-week levels if available
    if (snapshot.yearRange) {
      levels.push({
        price: snapshot.yearRange.week52Low,
        winRate: 75,
        type: 'support',
        label: '52-Week Low'
      });
      levels.push({
        price: snapshot.yearRange.week52High,
        winRate: 70,
        type: 'resistance',
        label: '52-Week High'
      });
    }
    
    return levels.filter(l => l.price > 0).slice(0, 4);
  }, [snapshot, quote?.price]);

  // Chart change display from real data
  const chartChange = useMemo(() => {
    if (!snapshot?.closeVsPrior) {
      return { value: quote?.change || 0, percent: quote?.changePercent || 0 };
    }
    return { 
      value: quote?.change || 0, 
      percent: quote?.changePercent || 0 
    };
  }, [quote, snapshot]);

  const isChartPositive = chartChange.percent >= 0;
  const isDataLoading = snapshotLoading || fundLoading || analystLoading;

  // Extract analyst data for card
  const analystRating = analystData?.analyst?.rating || undefined;
  const priceTarget = analystData?.priceTarget?.targetMean || undefined;
  const nextEarnings = analystData?.nextEarnings?.formatted || undefined;
  const dividend = analystData?.financials?.dividendYieldIndicatedAnnual || undefined;
  const forwardPE = analystData?.financials?.forwardPE || undefined;
  const realBeta = analystData?.financials?.beta || undefined;

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Two-Column Layout: Stock Info + Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4 md:gap-6">
        {/* Left: Stock Info Card */}
        <ALAStockInfoCard
          ticker={ticker}
          companyName={companyName}
          exchange={exchange}
          sector={sector}
          price={quote?.price || 0}
          change={quote?.change || 0}
          changePercent={quote?.changePercent || 0}
          open={quote?.open || 0}
          high={quote?.high || 0}
          low={quote?.low || 0}
          previousClose={quote?.previousClose}
          marketCap={fundamentals?.marketCap || quote?.marketCap}
          volume={quote?.volume}
          beta={snapshot?.volatility?.annualizedVolatility ? snapshot.volatility.annualizedVolatility / 15 : undefined}
          peRatio={fundamentals?.peRatio || undefined}
          eps={fundamentals?.eps || undefined}
          week52High={snapshot?.yearRange?.week52High}
          week52Low={snapshot?.yearRange?.week52Low}
          isLoading={isLoadingQuote || isDataLoading}
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
        />

        {/* Right: Price Chart */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2 md:pb-3 px-3 md:px-6 pt-3 md:pt-6">
            <div className="flex items-center justify-between flex-wrap gap-1.5 md:gap-2">
              <div className="flex items-center gap-1.5 md:gap-3">
                <CardTitle className="text-sm md:text-base font-medium">Chart</CardTitle>
                <div className="flex items-center gap-0.5 md:gap-1">
                  <TrendingUp className={cn("h-3 w-3 md:h-4 md:w-4", isChartPositive ? "text-emerald-400" : "text-rose-400")} />
                  <span className={cn("text-xs md:text-sm font-medium", isChartPositive ? "text-emerald-400" : "text-rose-400")}>
                    {chartChange.percent >= 0 ? '+' : ''}{chartChange.percent.toFixed(2)}%
                  </span>
                </div>
                <Badge variant="secondary" className="text-[10px] md:text-xs px-1.5">{chartTimeframe}</Badge>
              </div>
              
              <div className="flex items-center gap-2 md:gap-4 flex-wrap">
                {/* Toggle Controls - Hidden on mobile */}
                <div className="hidden md:flex items-center gap-2">
                  <Switch 
                    id="levels" 
                    checked={showLevels} 
                    onCheckedChange={setShowLevels}
                    className="data-[state=checked]:bg-primary scale-90"
                  />
                  <label htmlFor="levels" className="text-[10px] md:text-xs text-muted-foreground flex items-center gap-1">
                    <Layers className="h-3 w-3" />
                    Levels
                  </label>
                </div>
                <div className="hidden md:flex items-center gap-2">
                  <Switch 
                    id="probability" 
                    checked={showProbability} 
                    onCheckedChange={setShowProbability}
                    className="data-[state=checked]:bg-primary scale-90"
                  />
                  <label htmlFor="probability" className="text-[10px] md:text-xs text-muted-foreground flex items-center gap-1">
                    <Activity className="h-3 w-3" />
                    Prob
                  </label>
                </div>
                
                {/* Timeframe Selector */}
                <ToggleGroup 
                  type="single" 
                  value={chartTimeframe} 
                  onValueChange={(v) => v && setChartTimeframe(v)}
                  className="bg-secondary/50 rounded-md p-0.5"
                >
                  {['1D', '1W', '1M', '3M', '6M', '1Y', '5Y'].map((tf) => (
                    <ToggleGroupItem 
                      key={tf} 
                      value={tf} 
                      className={cn(
                        "text-[10px] md:text-xs px-1.5 md:px-2.5 py-0.5 md:py-1 h-6 md:h-7 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground",
                        chartTimeframe === tf && "bg-primary text-primary-foreground"
                      )}
                    >
                      {tf}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="pt-0 px-2 md:px-6 pb-3 md:pb-6">
            {/* Chart Container */}
            <div className="h-[250px] md:h-[350px] relative">
              {isLoadingQuote ? (
                <div className="w-full h-full flex items-center justify-center">
                  <Skeleton className="w-full h-full" />
                </div>
              ) : (
                <CandlestickChart 
                  symbol={ticker} 
                  height={250}
                  showVolume={true}
                  showRangeSelector={false}
                  defaultRange={chartTimeframe as any}
                />
              )}
              
              {/* Level Annotations (overlay) - now from real data */}
              {showLevels && !isLoadingQuote && keyLevels.length > 0 && (
                <div className="absolute right-2 top-2 space-y-1 pointer-events-none">
                  {keyLevels.slice(0, 2).map((level, i) => (
                    <div 
                      key={i}
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded",
                        level.type === 'resistance' 
                          ? "text-rose-400 bg-rose-500/10" 
                          : "text-emerald-400 bg-emerald-500/10"
                      )}
                    >
                      {level.label || level.type} ({level.winRate}%)... ${level.price.toFixed(0)}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Key Levels Footer */}
            {showLevels && keyLevels.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground font-medium">Key Levels</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {keyLevels.map((level, i) => (
                    <Badge 
                      key={i}
                      variant="outline" 
                      className={cn(
                        "text-xs font-mono",
                        level.type === 'support' 
                          ? "border-emerald-500/50 text-emerald-400" 
                          : "border-rose-500/50 text-rose-400"
                      )}
                    >
                      ● ${level.price.toFixed(2)} ({level.winRate}%)
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
