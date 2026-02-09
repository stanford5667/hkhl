import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { QuickHistoricalInsights, StreakData, HistoricalPattern } from './QuickHistoricalInsights';
import { EarningsImpactSection } from './EarningsImpactSection';
import { BasicStatsData } from './BasicStatistics';
import { IntegratedStockChart } from './IntegratedStockChart';
import { useTickerSnapshot } from '@/hooks/useTickerSnapshot';
import { useTickerAnalystData } from '@/hooks/useTickerAnalystData';
import { PerformanceMetricsSection } from './PerformanceMetricsSection';
import { useProductSegments } from '@/hooks/useProductSegments';
import { RevenueSegmentsCard } from './RevenueSegmentsCard';
import { useComprehensiveFundamentals } from '@/hooks/useComprehensiveFundamentals';
import { ComprehensiveMetricsCard } from './ComprehensiveMetricsCard';
import { RiskPerformanceCard } from './RiskPerformanceCard';
import { EarningsIntelCard } from './EarningsIntelCard';
import { 
  MobileStockHeader, 
  MetricsCarousel, 
  InsightsDeck, 
  FloatingActionMenu,
  MobileChartCard,
  type MetricData,
  type InsightData,
  type ChartTimeframe 
} from './mobile';
import { Activity, RefreshCw } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

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
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [lookbackDays, setLookbackDays] = useState<number | undefined>(undefined);
  const [chartTimeframe, setChartTimeframe] = useState<ChartTimeframe>('3M');

  // Fetch real data from edge functions
  const { data: snapshot, isLoading: snapshotLoading, isFetching: snapshotFetching } = useTickerSnapshot(ticker, lookbackDays);
  const comprehensiveFundamentals = useComprehensiveFundamentals(ticker);
  const { data: analystData, isLoading: analystLoading } = useTickerAnalystData(ticker);
  const { data: segmentsData, isLoading: segmentsLoading } = useProductSegments(ticker);

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

  // Build metrics for carousel
  const carouselMetrics: MetricData[] = useMemo(() => {
    const metrics: MetricData[] = [];
    
    // Performance metric
    if (quote) {
      metrics.push({
        id: 'performance',
        title: '24H Performance',
        value: `${quote.changePercent >= 0 ? '+' : ''}${quote.changePercent.toFixed(2)}%`,
        trend: quote.changePercent >= 0 ? 'up' : 'down',
        trendValue: `$${Math.abs(quote.change).toFixed(2)}`,
        icon: 'performance',
      });
    }

    // Volume metric
    if (quote?.volume) {
      metrics.push({
        id: 'volume',
        title: 'Volume',
        value: formatVolume(quote.volume),
        icon: 'volume',
      });
    }

    // Market Cap
    const marketCap = comprehensiveFundamentals.marketCap || quote?.marketCap;
    if (marketCap) {
      metrics.push({
        id: 'marketcap',
        title: 'Market Cap',
        value: formatMarketCap(marketCap),
        icon: 'fundamentals',
      });
    }

    // P/E Ratio
    if (comprehensiveFundamentals.pe) {
      metrics.push({
        id: 'pe',
        title: 'P/E Ratio',
        value: comprehensiveFundamentals.pe.toFixed(2),
        icon: 'fundamentals',
      });
    }

    // Beta
    if (comprehensiveFundamentals.beta) {
      const beta = comprehensiveFundamentals.beta;
      metrics.push({
        id: 'beta',
        title: 'Beta',
        value: beta.toFixed(2),
        trend: beta > 1.2 ? 'up' : beta < 0.8 ? 'down' : 'neutral',
        trendValue: beta > 1 ? 'High Vol' : 'Low Vol',
        icon: 'volatility',
      });
    }

    // Volatility
    if (basicStats?.avgDailyMovePercent) {
      metrics.push({
        id: 'volatility',
        title: 'Avg Daily Move',
        value: `${basicStats.avgDailyMovePercent.toFixed(2)}%`,
        icon: 'volatility',
      });
    }

    return metrics;
  }, [quote, comprehensiveFundamentals, basicStats]);

  // Build insights from patterns
  const insights: InsightData[] = useMemo(() => {
    const items: InsightData[] = [];

    // Add pattern-based insights
    activePatterns.forEach(pattern => {
      let sentiment: InsightData['sentiment'] = 'neutral';
      if (pattern.name.includes('Oversold') || pattern.name.includes('Lower')) {
        sentiment = 'bullish';
      } else if (pattern.name.includes('Overbought') || pattern.name.includes('Upper')) {
        sentiment = 'bearish';
      }

      items.push({
        id: pattern.id,
        title: pattern.name,
        summary: `Historical win rate of ${pattern.winRate.toFixed(0)}% based on similar patterns`,
        confidence: pattern.winRate,
        sentiment,
        details: `This pattern has historically resulted in a ${sentiment === 'bullish' ? 'bounce' : 'pullback'} ${pattern.winRate.toFixed(0)}% of the time. Based on analysis of past trading data.`,
        source: 'Technical Analysis',
      });
    });

    // Add streak insight
    if (streakData && streakData.consecutiveDays >= 3) {
      items.push({
        id: 'streak',
        title: `${streakData.consecutiveDays}-Day ${streakData.direction === 'up' ? 'Win' : 'Loss'} Streak`,
        summary: `${streakData.bounceProbability.toFixed(0)}% probability of reversal based on historical data`,
        confidence: streakData.bounceProbability,
        sentiment: streakData.direction === 'up' ? 'caution' : 'bullish',
        details: `The stock has moved ${streakData.direction} for ${streakData.consecutiveDays} consecutive days with a total change of ${streakData.totalChange >= 0 ? '+' : ''}${streakData.totalChange.toFixed(2)}%. Historical data suggests a ${streakData.bounceProbability.toFixed(0)}% chance of reversal.`,
        source: 'Streak Analysis',
      });
    }

    return items;
  }, [activePatterns, streakData]);

  const isDataLoading = snapshotLoading || comprehensiveFundamentals.isLoading || analystLoading;
  const nextEarnings = analystData?.nextEarnings?.formatted;

  // Floating action handlers
  const handleAnalyze = () => navigate(`/stock/${ticker}?tab=quant-lab`);
  const handleBacktest = () => navigate(`/stock/${ticker}?tab=backtest`);
  const handleWatchlist = () => toast.success(`${ticker} added to watchlist`);
  const handleAlert = () => toast.info('Price alerts coming soon');

  if (isLoadingQuote || isDataLoading) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-[280px] w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  // Mobile Layout
  if (isMobile) {
    return (
      <div className="relative min-h-screen pb-24">
        {/* Sticky Header */}
        <MobileStockHeader
          ticker={ticker}
          companyName={companyName}
          price={quote?.price || 0}
          change={quote?.change || 0}
          changePercent={quote?.changePercent || 0}
          exchange={exchange}
          sector={sector}
          onWatchlist={handleWatchlist}
          onAlert={handleAlert}
        />

        {/* Content Stack */}
        <div className="p-4 space-y-4">
          {/* Chart Card with Gesture Support */}
          <MobileChartCard
            defaultTimeframe={chartTimeframe}
            onTimeframeChange={setChartTimeframe}
          >
            <IntegratedStockChart 
              symbol={ticker} 
              height={240}
              showVolume={false}
              defaultRange={chartTimeframe === 'ALL' ? '5Y' : chartTimeframe}
              onRefresh={onRefresh}
              isRefreshing={isRefreshing}
            />
          </MobileChartCard>

          {/* Metrics Carousel */}
          {carouselMetrics.length > 0 && (
            <MetricsCarousel 
              metrics={carouselMetrics}
              onMetricTap={(metric) => toast.info(`${metric.title}: ${metric.value}`)}
            />
          )}

          {/* AI Insights Deck */}
          {insights.length > 0 && (
            <InsightsDeck 
              insights={insights}
              onInsightExpand={(insight) => console.log('Expanded:', insight.id)}
            />
          )}

          {/* Quick Historical Insights */}
          <QuickHistoricalInsights 
            ticker={ticker} 
            streakData={streakData}
            activePatterns={activePatterns}
            isLoading={snapshotLoading}
          />

          {/* Earnings Impact */}
          <EarningsImpactSection ticker={ticker} nextEarnings={nextEarnings} />

          {/* Fundamentals Cards */}
          <ComprehensiveMetricsCard 
            data={comprehensiveFundamentals} 
            isLoading={comprehensiveFundamentals.isLoading} 
          />

          <RiskPerformanceCard 
            data={comprehensiveFundamentals} 
            isLoading={comprehensiveFundamentals.isLoading} 
          />

          <EarningsIntelCard 
            data={comprehensiveFundamentals} 
            isLoading={comprehensiveFundamentals.isLoading} 
          />

          <RevenueSegmentsCard 
            segments={segmentsData?.segments}
            isLoading={segmentsLoading}
            useMockData={segmentsData?.useMockData}
            ticker={ticker}
          />

          {/* Trading Days Stats */}
          {basicStats && (
            <Card className="bg-card border-border">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Activity className="h-3 w-3 text-primary" />
                    <span className="text-xs font-medium">
                      Past {basicStats.totalDays} Trading Days
                    </span>
                    {snapshotFetching && <RefreshCw className="h-2.5 w-2.5 animate-spin ml-1 text-muted-foreground" />}
                  </div>
                  <Select 
                    value={lookbackDays?.toString() || 'all'} 
                    onValueChange={(val) => setLookbackDays(val === 'all' ? undefined : parseInt(val))}
                  >
                    <SelectTrigger className="h-6 w-[80px] text-[10px] bg-secondary/50 border-border px-2">
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
                
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2 bg-secondary/30 rounded text-center">
                    <span className="text-[9px] text-muted-foreground uppercase block">Up</span>
                    <p className="text-sm font-bold text-success">{basicStats.upDays}</p>
                  </div>
                  <div className="p-2 bg-secondary/30 rounded text-center">
                    <span className="text-[9px] text-muted-foreground uppercase block">Down</span>
                    <p className="text-sm font-bold text-destructive">{basicStats.downDays}</p>
                  </div>
                  <div className="p-2 bg-secondary/30 rounded text-center">
                    <span className="text-[9px] text-muted-foreground uppercase block">Avg Move</span>
                    <p className="text-sm font-bold">{basicStats.avgDailyMovePercent.toFixed(2)}%</p>
                  </div>
                </div>
                
                <PerformanceMetricsSection ticker={ticker} compact />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Floating Action Menu */}
        <FloatingActionMenu
          secondaryActions={[
            { id: 'analyze', icon: <Activity className="h-5 w-5" />, label: 'Analyze', onClick: handleAnalyze },
            { id: 'backtest', icon: <Activity className="h-5 w-5" />, label: 'Backtest', onClick: handleBacktest },
          ]}
        />
      </div>
    );
  }

  // Desktop Layout (original)
  return (
    <div className="space-y-2">
      {/* Main Grid: Chart + Stats Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        {/* Chart Column - 2/3 width */}
        <Card className="bg-card border-border lg:col-span-2 overflow-hidden">
          {/* Price Header */}
          <div className="px-3 pt-3 pb-2 space-y-1.5">
            <h2 className="text-sm md:text-base font-semibold text-foreground truncate">
              {companyName || ticker}
            </h2>
            
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
              <div className="flex items-baseline gap-2.5">
                <span className="text-2xl md:text-3xl font-bold tabular-nums text-foreground">
                  ${(quote?.price || 0).toFixed(2)}
                </span>
                <div className={cn(
                  "flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold",
                  (quote?.change || 0) >= 0 ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                )}>
                  <span className="tabular-nums">
                    {(quote?.change || 0) >= 0 ? '+' : ''}{(quote?.change || 0).toFixed(2)} ({(quote?.change || 0) >= 0 ? '+' : ''}{(quote?.changePercent || 0).toFixed(2)}%)
                  </span>
                </div>
              </div>
            </div>

            {description && (
              <p className="text-[9px] md:text-[10px] text-muted-foreground leading-relaxed line-clamp-2">{description}</p>
            )}
          </div>

          {/* Chart Section */}
          <div className="w-full">
            <IntegratedStockChart 
              symbol={ticker} 
              height={320}
              showVolume={true}
              defaultRange="3M"
              onRefresh={onRefresh}
              isRefreshing={isRefreshing}
            />
          </div>
        </Card>

        {/* Stats Column */}
        <div className="space-y-2">
          <ComprehensiveMetricsCard data={comprehensiveFundamentals} isLoading={comprehensiveFundamentals.isLoading} />
          <RiskPerformanceCard data={comprehensiveFundamentals} isLoading={comprehensiveFundamentals.isLoading} />
          <EarningsIntelCard data={comprehensiveFundamentals} isLoading={comprehensiveFundamentals.isLoading} />
          <RevenueSegmentsCard segments={segmentsData?.segments} isLoading={segmentsLoading} useMockData={segmentsData?.useMockData} ticker={ticker} />
          
          {basicStats && (
            <Card className="bg-card border-border">
              <CardContent className="p-2 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Activity className="h-3 w-3 text-primary" />
                    <span className="text-[10px] md:text-xs font-medium">Past {basicStats.totalDays} Trading Days</span>
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
                        <SelectItem key={opt.value} value={opt.value} className="text-[10px]">{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-3 gap-1">
                  <div className="p-1.5 bg-secondary/30 rounded text-center">
                    <span className="text-[7px] text-muted-foreground uppercase block">Up Days</span>
                    <p className="text-xs font-bold text-success">{basicStats.upDays}</p>
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
                    <p className="text-xs font-bold text-success">+{basicStats.bestDay.change.toFixed(1)}%</p>
                  </div>
                  <div className="p-1.5 bg-secondary/30 rounded text-center">
                    <span className="text-[7px] text-muted-foreground uppercase block">Worst Day</span>
                    <p className="text-xs font-bold text-destructive">{basicStats.worstDay.change.toFixed(1)}%</p>
                  </div>
                </div>
                
                <div className="border-t border-border my-1" />
                <PerformanceMetricsSection ticker={ticker} compact />
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Quick Insights + Earnings Impact Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        <QuickHistoricalInsights ticker={ticker} streakData={streakData} activePatterns={activePatterns} isLoading={snapshotLoading} />
        <EarningsImpactSection ticker={ticker} nextEarnings={nextEarnings} />
      </div>
    </div>
  );
}

export default ALAOverviewTab;
