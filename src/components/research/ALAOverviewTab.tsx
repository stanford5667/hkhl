import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { TrendingUp, TrendingDown, Layers, Activity, RefreshCw, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ALAStockInfoCard, ALAStockInfoCardProps } from './ALAStockInfoCard';
import { QuickHistoricalInsights, StreakData, HistoricalPattern } from './QuickHistoricalInsights';
import { BasicStatistics, BasicStatsData } from './BasicStatistics';
import { CandlestickChart } from '@/components/charts/CandlestickChart';

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

interface KeyLevel {
  price: number;
  winRate: number;
  type: 'support' | 'resistance';
}

function generateMockKeyLevels(ticker: string, currentPrice: number): KeyLevel[] {
  const hash = ticker.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  return [
    { price: currentPrice * 0.90, winRate: 52 + (hash % 10), type: 'support' },
    { price: currentPrice * 0.93, winRate: 60 + (hash % 8), type: 'support' },
    { price: currentPrice * 0.88, winRate: 82 + (hash % 5), type: 'support' },
    { price: currentPrice * 0.86, winRate: 82 + (hash % 6), type: 'support' },
  ];
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

  // Mock data for key levels
  const keyLevels = useMemo(() => {
    if (!quote?.price) return [];
    return generateMockKeyLevels(ticker, quote.price);
  }, [ticker, quote?.price]);

  // Chart change calculation (mock)
  const chartChange = useMemo(() => {
    const hash = ticker.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return {
      value: 3 + (hash % 8) + Math.random() * 2,
      percent: 2 + (hash % 5) + Math.random(),
    };
  }, [ticker]);

  const isChartPositive = chartChange.value >= 0;

  return (
    <div className="space-y-6">
      {/* Two-Column Layout: Stock Info + Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
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
          marketCap={quote?.marketCap}
          volume={quote?.volume}
          beta={1.28}
          peRatio={31.2}
          forwardPE={28.5}
          eps={6.36}
          dividend={0.48}
          analystRating="Buy"
          priceTarget={quote?.price ? quote.price * 1.13 : undefined}
          nextEarnings="Jan 30, 2026"
          week52High={quote?.price ? quote.price * 1.09 : undefined}
          week52Low={quote?.price ? quote.price * 0.83 : undefined}
          isLoading={isLoadingQuote}
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
        />

        {/* Right: Price Chart */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <CardTitle className="text-base font-medium">Price Chart</CardTitle>
                <div className="flex items-center gap-1">
                  <TrendingUp className={cn("h-4 w-4", isChartPositive ? "text-emerald-400" : "text-rose-400")} />
                  <span className={cn("text-sm font-medium", isChartPositive ? "text-emerald-400" : "text-rose-400")}>
                    +{chartChange.value.toFixed(2)} ({chartChange.percent.toFixed(2)}%)
                  </span>
                </div>
                <Badge variant="secondary" className="text-xs">{chartTimeframe}</Badge>
              </div>
              
              <div className="flex items-center gap-4">
                {/* Toggle Controls */}
                <div className="flex items-center gap-2">
                  <Switch 
                    id="levels" 
                    checked={showLevels} 
                    onCheckedChange={setShowLevels}
                    className="data-[state=checked]:bg-primary"
                  />
                  <label htmlFor="levels" className="text-xs text-muted-foreground flex items-center gap-1">
                    <Layers className="h-3.5 w-3.5" />
                    Levels
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch 
                    id="probability" 
                    checked={showProbability} 
                    onCheckedChange={setShowProbability}
                    className="data-[state=checked]:bg-primary"
                  />
                  <label htmlFor="probability" className="text-xs text-muted-foreground flex items-center gap-1">
                    <Activity className="h-3.5 w-3.5" />
                    Probability
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
                        "text-xs px-2.5 py-1 h-7 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground",
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
          
          <CardContent className="pt-0">
            {/* Chart Container */}
            <div className="h-[350px] relative">
              {isLoadingQuote ? (
                <div className="w-full h-full flex items-center justify-center">
                  <Skeleton className="w-full h-full" />
                </div>
              ) : (
                <CandlestickChart 
                  symbol={ticker} 
                  height={350}
                  showVolume={true}
                  showRangeSelector={false}
                  defaultRange={chartTimeframe as any}
                />
              )}
              
              {/* Level Annotations (overlay) */}
              {showLevels && !isLoadingQuote && (
                <div className="absolute right-2 top-2 space-y-1 pointer-events-none">
                  {/* These would normally be positioned based on price levels */}
                  <div className="text-[10px] text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded">
                    Unfilled Gap Up (82%)... ${(quote?.price || 0 * 0.99).toFixed(0)}
                  </div>
                  <div className="text-[10px] text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded">
                    Overbought Zone (86%)... ${(quote?.price || 0 * 0.98).toFixed(0)}
                  </div>
                </div>
              )}
            </div>
            
            {/* Key Levels Footer */}
            {showLevels && (
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
      <QuickHistoricalInsights ticker={ticker} />

      {/* Basic Statistics */}
      <BasicStatistics 
        ticker={ticker} 
        timeRange={statsTimeRange}
        onTimeRangeChange={setStatsTimeRange}
      />
    </div>
  );
}

export default ALAOverviewTab;
