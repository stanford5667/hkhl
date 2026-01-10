/**
 * Live Macro Content Component
 * 
 * Displays real-time economic data from FRED and other sources.
 */

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  DollarSign, 
  BarChart3, 
  LineChart, 
  RefreshCw,
  AlertTriangle,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Globe,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useYieldCurve,
  useSectorPerformance,
  useEconomicCalendar,
  useEconomicDataWithRefresh,
  formatIndicatorChange,
  calculateMarketHealthScore,
  type EconomicIndicator,
} from '@/hooks/useEconomicData';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface MacroDataItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  type: 'economic' | 'index' | 'rate' | 'commodity' | 'forex' | 'fund';
  category?: string;
  description?: string;
  high?: number;
  low?: number;
  open?: number;
  prevClose?: number;
  timestamp?: string;
  unit?: string;
  base?: string;
  quote?: string;
}

interface LiveMacroContentProps {
  onItemClick?: (item: MacroDataItem) => void;
}

export function LiveMacroContent({ onItemClick }: LiveMacroContentProps) {
  const { 
    byCategory, 
    useMockData, 
    lastUpdated, 
    isLoading, 
    error,
    refresh,
    isFetching,
  } = useEconomicDataWithRefresh();
  
  const { data: yieldCurve } = useYieldCurve();
  const { data: sectors } = useSectorPerformance();
  const { data: calendar } = useEconomicCalendar();
  
  const rates = byCategory?.rates || [];
  const economic = byCategory?.economic || [];
  const markets = byCategory?.markets || [];
  
  // Calculate market health score
  const allIndicators = [...rates, ...economic, ...markets];
  const healthScore = allIndicators.length > 0 
    ? calculateMarketHealthScore(allIndicators) 
    : { score: 50, label: 'Loading...', factors: [] };

  if (error) {
    return (
      <Card className="bg-rose-500/10 border-rose-500/20 p-6">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-rose-400" />
          <div>
            <p className="font-medium text-rose-400">Error loading economic data</p>
            <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
          </div>
          <Button variant="outline" size="sm" onClick={refresh} className="ml-auto">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with data source indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Globe className="h-5 w-5 text-primary" />
          <div>
            <h3 className="font-semibold">Live Economic Data</h3>
            <p className="text-xs text-muted-foreground">
              {useMockData ? (
                <span className="text-amber-400">Using demo data • Add FRED_API_KEY for live data</span>
              ) : (
                <span className="text-emerald-400">Live from FRED • Updated {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : 'now'}</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge 
            variant={useMockData ? 'secondary' : 'default'}
            className={useMockData ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}
          >
            {useMockData ? 'Demo' : 'Live'}
          </Badge>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refresh}
            disabled={isFetching}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Market Health Score */}
      <Card className="bg-gradient-to-br from-card to-secondary/20 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Market Health Score</p>
              <div className="flex items-center gap-3">
                <span className={cn(
                  "text-4xl font-bold",
                  healthScore.score >= 60 ? "text-emerald-400" :
                  healthScore.score <= 40 ? "text-rose-400" : "text-amber-400"
                )}>
                  {healthScore.score}
                </span>
                <Badge variant="outline" className={cn(
                  healthScore.score >= 60 ? "border-emerald-500/30 text-emerald-400" :
                  healthScore.score <= 40 ? "border-rose-500/30 text-rose-400" : 
                  "border-amber-500/30 text-amber-400"
                )}>
                  {healthScore.label}
                </Badge>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 max-w-md">
              {healthScore.factors.slice(0, 4).map((f, i) => (
                <Badge 
                  key={i}
                  variant="outline"
                  className={cn(
                    "text-xs",
                    f.impact === 'positive' ? "border-emerald-500/30 text-emerald-400" :
                    f.impact === 'negative' ? "border-rose-500/30 text-rose-400" :
                    "border-muted"
                  )}
                >
                  {f.impact === 'positive' ? '✓' : f.impact === 'negative' ? '✗' : '○'} {f.name}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Indicators Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Rates & Credit */}
        <IndicatorCard
          title="Rates & Credit"
          icon={<DollarSign className="h-5 w-5 text-blue-400" />}
          indicators={rates}
          isLoading={isLoading}
          insight={yieldCurve?.inverted ? "⚠️ Yield curve inverted - recession signal" : "💡 Consider refinancing floating debt"}
          insightType={yieldCurve?.inverted ? 'warning' : 'info'}
          onItemClick={onItemClick}
        />

        {/* Economic */}
        <IndicatorCard
          title="Economic"
          icon={<BarChart3 className="h-5 w-5 text-emerald-400" />}
          indicators={economic}
          isLoading={isLoading}
          onItemClick={onItemClick}
        />

        {/* Markets */}
        <IndicatorCard
          title="Markets"
          icon={<LineChart className="h-5 w-5 text-purple-400" />}
          indicators={markets}
          isLoading={isLoading}
          onItemClick={onItemClick}
        />
      </div>

      {/* Yield Curve & Sectors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Yield Curve */}
        <Card className="bg-secondary/50 border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Treasury Yield Curve</h3>
              {yieldCurve?.inverted && (
                <Badge variant="destructive" className="bg-rose-500/20 text-rose-400 border-rose-500/30">
                  Inverted
                </Badge>
              )}
            </div>
            
            {isLoading ? (
              <div className="h-32 flex items-center justify-center">
                <Skeleton className="h-full w-full" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Simple yield curve visualization */}
                <div className="flex items-end justify-between h-24 gap-1">
                  {yieldCurve?.curve.map((point: any, i: number) => (
                    <TooltipProvider key={point.name}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex-1 flex flex-col items-center gap-1">
                            <div 
                              className={cn(
                                "w-full rounded-t transition-all",
                                yieldCurve?.inverted && i < 3 ? "bg-rose-500" : "bg-primary"
                              )}
                              style={{ height: `${(point.yield / 6) * 100}%`, minHeight: '4px' }}
                            />
                            <span className="text-[10px] text-muted-foreground">{point.name}</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{point.name}: {point.yield.toFixed(2)}%</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>
                
                {/* Spread indicator */}
                <div className="flex justify-between items-center pt-2 border-t border-border">
                  <span className="text-sm text-muted-foreground">10Y - 2Y Spread</span>
                  <span className={cn(
                    "font-mono font-medium",
                    (yieldCurve?.spread_10y_2y || 0) < 0 ? "text-rose-400" : "text-emerald-400"
                  )}>
                    {(yieldCurve?.spread_10y_2y || 0) >= 0 ? '+' : ''}{(yieldCurve?.spread_10y_2y || 0).toFixed(2)}%
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sector Performance */}
        <Card className="bg-secondary/50 border-border">
          <CardContent className="p-6">
            <h3 className="text-lg font-medium mb-4">Sector Performance (YTD)</h3>
            
            {isLoading ? (
              <div className="grid grid-cols-3 gap-2">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 lg:grid-cols-4 gap-2">
                {sectors?.slice(0, 8).map((s: any) => (
                  <div 
                    key={s.name} 
                    className={cn(
                      "p-2 rounded-lg text-center cursor-pointer transition-all hover:ring-1 hover:ring-primary/50",
                      s.ytd >= 0 ? "bg-emerald-500/10 hover:bg-emerald-500/20" : "bg-rose-500/10 hover:bg-rose-500/20"
                    )}
                    onClick={() => onItemClick?.({
                      symbol: s.symbol || s.name.toUpperCase().replace(/\s/g, ''),
                      name: s.name,
                      price: s.ytd,
                      change: s.ytd,
                      changePercent: s.ytd,
                      type: 'index',
                      category: 'sector',
                      description: `${s.name} sector YTD performance`
                    })}
                  >
                    <div className="text-xs text-muted-foreground truncate">{s.name}</div>
                    <div className={cn(
                      "text-sm font-bold",
                      s.ytd >= 0 ? "text-emerald-400" : "text-rose-400"
                    )}>
                      {s.ytd > 0 ? '+' : ''}{s.ytd.toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Economic Calendar */}
      <Card className="bg-secondary/50 border-border">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-medium">Upcoming Events</h3>
          </div>
          
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {calendar?.slice(0, 8).map((event: any, i: number) => (
                <div 
                  key={`${event.type}-${event.date}-${i}`}
                  className={cn(
                    "p-3 rounded-lg border",
                    event.importance === 'high' 
                      ? "bg-amber-500/5 border-amber-500/20" 
                      : "bg-card/50 border-border"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-xs",
                        event.importance === 'high' && "border-amber-500/30 text-amber-400"
                      )}
                    >
                      {event.type}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {event.daysUntil}d
                    </span>
                  </div>
                  <p className="text-sm font-medium truncate">{event.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(event.date).toLocaleDateString('en-US', { 
                      weekday: 'short', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Portfolio Sensitivity */}
      <Card className="bg-secondary/50 border-border">
        <CardContent className="p-6">
          <h3 className="text-lg font-medium mb-4">Portfolio Sensitivity Analysis</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { scenario: '+100bps Rates', impact: -12.4, description: 'Duration risk from rate hike' },
              { scenario: '-100bps Rates', impact: 8.2, description: 'Benefit from rate cuts' },
              { scenario: 'Recession', impact: -24.6, description: 'GDP -2% scenario' },
            ].map((s) => (
              <div key={s.scenario} className="p-4 rounded-lg bg-card/50">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">{s.scenario}</span>
                  <span className={cn(
                    "font-bold",
                    s.impact >= 0 ? "text-emerald-400" : "text-rose-400"
                  )}>
                    {s.impact > 0 ? '+' : ''}{s.impact}% NAV
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{s.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Indicator card component
interface IndicatorCardProps {
  title: string;
  icon: React.ReactNode;
  indicators: EconomicIndicator[];
  isLoading: boolean;
  insight?: string;
  insightType?: 'info' | 'warning';
  onItemClick?: (item: MacroDataItem) => void;
}

function IndicatorCard({ title, icon, indicators, isLoading, insight, insightType = 'info', onItemClick }: IndicatorCardProps) {
  const handleClick = (indicator: EconomicIndicator) => {
    if (onItemClick) {
      onItemClick({
        symbol: indicator.id,
        name: indicator.indicator_name,
        price: parseFloat(String(indicator.current_value)) || 0,
        change: indicator.change_value || 0,
        changePercent: 0,
        type: indicator.category === 'rates' ? 'rate' : 'economic',
        category: indicator.category,
        description: indicator.description,
      });
    }
  };

  return (
    <Card className="bg-secondary/50 border-border">
      <CardContent className="p-6">
        <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
          {icon}
          {title}
        </h3>
        
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-8" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {indicators.slice(0, 8).map((indicator) => {
              const change = formatIndicatorChange(indicator);
              
              return (
                <TooltipProvider key={indicator.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div 
                        className="flex justify-between items-center py-2 border-b border-border last:border-0 hover:bg-primary/5 rounded px-2 -mx-2 cursor-pointer transition-colors"
                        onClick={() => handleClick(indicator)}
                      >
                        <span className="text-muted-foreground text-sm">{indicator.indicator_name}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium font-mono">{indicator.current_value}</span>
                          {indicator.change_value !== 0 && (
                            <span className={cn("text-xs flex items-center gap-0.5", change.color)}>
                              {change.icon === 'up' ? (
                                <ArrowUpRight className="h-3 w-3" />
                              ) : change.icon === 'down' ? (
                                <ArrowDownRight className="h-3 w-3" />
                              ) : (
                                <Minus className="h-3 w-3" />
                              )}
                              {change.text}
                            </span>
                          )}
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-xs">
                      <p className="font-medium">{indicator.indicator_name}</p>
                      <p className="text-xs text-muted-foreground">{indicator.description}</p>
                      <p className="text-xs mt-1">
                        Previous: {indicator.previous_value} • Updated: {indicator.last_updated}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>
        )}
        
        {insight && (
          <div className={cn(
            "mt-4 p-3 rounded text-sm",
            insightType === 'warning' 
              ? "bg-amber-900/20 border border-amber-700/30 text-amber-400"
              : "bg-blue-900/20 border border-blue-700/30 text-blue-400"
          )}>
            {insight}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default LiveMacroContent;
