/**
 * Live Macro Content Component
 * 
 * Displays real-time economic data from FRED and other sources.
 * All items are clickable and connected to detail sheets for educational content.
 * Supports both card and tabular views with study integration.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { MarketHealthCard } from './MarketHealthCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Clock,
  ChevronRight,
  Landmark,
  Briefcase,
  Percent,
  TrendingUp,
  Table as TableIcon,
  LayoutGrid,
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
import { EventDetailSheet } from '@/components/market-intel/EventDetailSheet';
import { MarketDataTable, type MarketDataRow } from '@/components/market-intel/MarketDataTable';
import type { CalendarEvent } from '@/hooks/useEconomicCalendar';


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


// Get event icon based on event type
function getEventIcon(eventType: string) {
  const type = eventType?.toLowerCase() || '';
  if (type.includes('fed') || type.includes('fomc') || type.includes('monetary')) return Landmark;
  if (type.includes('employment') || type.includes('job') || type.includes('labor')) return Briefcase;
  if (type.includes('inflation') || type.includes('cpi') || type.includes('ppi')) return Percent;
  return TrendingUp;
}

// Re-export MarketHealthCard for use in other components
export { MarketHealthCard } from './MarketHealthCard';

interface LiveMacroContentProps {
  onItemClick?: (item: MacroDataItem) => void;
  onPerformanceUpdate?: (loadTimeMs: number, accuracy: number, issues: string[]) => void;
  /** Render slot for content to appear between Market Health and Economic Data */
  renderAfterMarketHealth?: React.ReactNode;
  /** Hide the header card (when displayed separately) */
  hideHeader?: boolean;
}

export function LiveMacroContent({ onItemClick, onPerformanceUpdate, renderAfterMarketHealth, hideHeader = false }: LiveMacroContentProps) {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [eventDetailOpen, setEventDetailOpen] = useState(false);
  const [loadStartTime] = useState(() => performance.now());
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  
  const { 
    byCategory, 
    useMockData, 
    lastUpdated, 
    isLoading, 
    error,
    refresh,
    isFetching,
  } = useEconomicDataWithRefresh();
  
  // Track performance when data loads
  useEffect(() => {
    if (!isLoading && byCategory && onPerformanceUpdate) {
      const loadTimeMs = performance.now() - loadStartTime;
      const issues: string[] = [];
      
      if (error) issues.push('Failed to fetch economic data');
      if (useMockData) issues.push('Using demo data');
      
      // Validate Fed rate data - Expected: 3.50-3.75% target, 3.64% effective
      const fedRate = byCategory?.rates?.find((r) => 
        r.indicator_name?.toLowerCase().includes('fed') || r.indicator_name?.toLowerCase().includes('funds')
      );
      
      let dataAccuracy = 10;
      if (fedRate) {
        const rateValue = fedRate.current_raw;
        if (rateValue && Math.abs(rateValue - 3.64) > 0.1) {
          issues.push('Fed rate may not reflect current 3.64% effective rate');
          dataAccuracy = 8;
        }
      }
      
      if (issues.length > 0) dataAccuracy = Math.max(5, dataAccuracy - issues.length);
      
      onPerformanceUpdate(loadTimeMs, dataAccuracy, issues);
    }
  }, [isLoading, byCategory, error, useMockData, onPerformanceUpdate, loadStartTime]);
  
  const { data: yieldCurve } = useYieldCurve();
  const { data: sectors } = useSectorPerformance();
  const { data: calendar } = useEconomicCalendar();

  const handleEventClick = (event: any) => {
    // Convert to CalendarEvent format
    const calendarEvent: CalendarEvent = {
      id: event.id || `event-${event.name}-${event.date}`,
      event_date: event.date,
      event_time: event.time || null,
      event_name: event.name,
      event_type: event.type || 'economic',
      description: event.description || null,
      importance: event.importance || 'medium',
      actual_value: null,
      forecast_value: event.forecast || null,
      previous_value: event.previous || null,
      currency: 'USD',
      country: 'US',
    };
    setSelectedEvent(calendarEvent);
    setEventDetailOpen(true);
  };
  
  // Get all indicators from byCategory
  const allRates = byCategory?.rates || [];
  const allEconomic = byCategory?.economic || [];
  const allMarkets = byCategory?.markets || [];
  
  // Use all indicators directly (no filtering)
  const rates = allRates;
  const economic = allEconomic;
  const markets = allMarkets;
  
  // Calculate market health score (always use all indicators)
  const allIndicators = [...allRates, ...allEconomic, ...allMarkets];
  const healthScore = allIndicators.length > 0 
    ? calculateMarketHealthScore(allIndicators) 
    : { score: 50, label: 'Loading...', factors: [] };

  // Convert indicators to table format
  const tableData: MarketDataRow[] = useMemo(() => {
    const allFiltered = [...rates, ...economic, ...markets];
    return allFiltered.map((indicator) => ({
      id: indicator.id,
      symbol: indicator.id.toUpperCase(),
      name: indicator.indicator_name,
      currentValue: indicator.current_raw ?? (parseFloat(String(indicator.current_value)) || 0),
      previousValue: indicator.previous_raw ?? indicator.previous_value,
      change: indicator.change_value || 0,
      changePercent: 0,
      category: indicator.category || 'economic',
      type: (indicator.category === 'rates' ? 'rate' : 'economic') as 'rate' | 'economic',
      unit: undefined,
      lastUpdated: indicator.last_updated,
      description: indicator.description,
      importance: undefined,
    }));
  }, [rates, economic, markets]);

  // Handle table row click
  const handleTableRowClick = (row: MarketDataRow) => {
    if (onItemClick) {
      onItemClick({
        symbol: row.symbol,
        name: row.name,
        price: typeof row.currentValue === 'number' ? row.currentValue : parseFloat(String(row.currentValue)) || 0,
        change: row.change || 0,
        changePercent: row.changePercent || 0,
        type: row.type as 'economic' | 'index' | 'rate' | 'commodity' | 'forex' | 'fund',
        category: row.category,
        description: row.description,
      });
    }
  };

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

  // Check if any indicators available
  const totalCount = rates.length + economic.length + markets.length;
  const hasNoResults = totalCount === 0 && !isLoading;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header - Compact with Live status and Market Health inline */}
      {!hideHeader && (
        <Card className="bg-gradient-to-r from-primary/10 via-card to-primary/10 border-primary/20">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
              <div className="flex items-center gap-2 sm:gap-3">
                <Globe className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
                <div>
                  <h2 className="text-sm sm:text-lg font-semibold">Live Economic Data</h2>
                  <p className="text-[10px] sm:text-xs">
                    {useMockData ? (
                      <span className="text-amber-400">Using demo data</span>
                    ) : (
                      <span className="text-emerald-400">Live from FRED</span>
                    )}
                  </p>
                </div>
              </div>
              {/* Inline Market Health */}
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="text-right">
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Market Health</p>
                  <div className="flex items-center gap-1.5 sm:gap-2 justify-end">
                    <span className={cn(
                      "text-2xl sm:text-4xl font-bold tabular-nums",
                      healthScore.score >= 60 ? "text-emerald-400" :
                      healthScore.score <= 40 ? "text-rose-400" : "text-amber-400"
                    )}>
                      {healthScore.score}
                    </span>
                    <Badge variant="outline" className={cn(
                      "text-[10px] sm:text-xs px-1.5 sm:px-2",
                      healthScore.score >= 60 ? "border-emerald-500/30 text-emerald-400" :
                      healthScore.score <= 40 ? "border-rose-500/30 text-rose-400" : 
                      "border-amber-500/30 text-amber-400"
                    )}>
                      {healthScore.label}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Results Message */}
      {hasNoResults && (
        <Card className="bg-secondary/30 border-border/50 p-6 sm:p-8 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="p-3 rounded-full bg-muted/50">
              <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
            </div>
            <div>
              <h4 className="font-medium text-sm sm:text-base">No economic indicators available</h4>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Data is currently loading or unavailable
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Render slot for content between header and Economic Data */}
      {renderAfterMarketHealth}

      {/* Table View - Full tabular data with study integration */}
      {viewMode === 'table' && !hasNoResults && (
        <MarketDataTable
          data={tableData}
          title="All Economic Indicators"
          onRowClick={handleTableRowClick}
          showStudyActions={true}
        />
      )}

      {/* Cards View - Main Indicators Grid - Only show if we have results */}
      {viewMode === 'cards' && !hasNoResults && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Rates & Credit */}
          {rates.length > 0 && (
            <IndicatorCard
              title="Rates & Credit"
              icon={<DollarSign className="h-5 w-5 text-blue-400" />}
              indicators={rates}
              isLoading={isLoading}
              insight={yieldCurve?.inverted ? "⚠️ Yield curve inverted - recession signal" : undefined}
              insightType={yieldCurve?.inverted ? 'warning' : 'info'}
              onItemClick={onItemClick}
            />
          )}

          {/* Economic */}
          {economic.length > 0 && (
            <IndicatorCard
              title="Economic"
              icon={<BarChart3 className="h-5 w-5 text-emerald-400" />}
              indicators={economic}
              isLoading={isLoading}
              onItemClick={onItemClick}
            />
          )}

          {/* Markets */}
          {markets.length > 0 && (
            <IndicatorCard
              title="Markets"
              icon={<LineChart className="h-5 w-5 text-purple-400" />}
              indicators={markets}
              isLoading={isLoading}
              onItemClick={onItemClick}
            />
          )}
        </div>
      )}

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
            <Badge variant="outline" className="ml-auto text-xs">
              Click any event for details
            </Badge>
          </div>
          
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {calendar?.slice(0, 8).map((event: any, i: number) => {
                const EventIcon = getEventIcon(event.type);
                return (
                  <div 
                    key={`${event.type}-${event.date}-${i}`}
                    onClick={() => handleEventClick(event)}
                    className={cn(
                      "p-3 rounded-lg border cursor-pointer transition-all group hover:ring-1 hover:ring-primary/50",
                      event.importance === 'high' 
                        ? "bg-amber-500/5 border-amber-500/20 hover:bg-amber-500/10" 
                        : "bg-card/50 border-border hover:bg-primary/5"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <EventIcon className={cn(
                          "h-3 w-3",
                          event.importance === 'high' ? "text-amber-400" : "text-muted-foreground"
                        )} />
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-xs",
                            event.importance === 'high' && "border-amber-500/30 text-amber-400"
                          )}
                        >
                          {event.type}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {event.daysUntil}d
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                        {event.name}
                      </p>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(event.date).toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                );
              })}
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

      {/* Event Detail Sheet */}
      <EventDetailSheet
        event={selectedEvent}
        open={eventDetailOpen}
        onOpenChange={setEventDetailOpen}
      />
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
  const [expanded, setExpanded] = useState(false);

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

  const canToggle = indicators.length > 8;
  const visibleIndicators = expanded ? indicators : indicators.slice(0, 8);

  return (
    <Card className="bg-secondary/50 border-border">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium flex items-center gap-2">
            {icon}
            {title}
          </h3>
          {canToggle && (
            <Badge variant="outline" className="text-xs">
              {indicators.length}
            </Badge>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-8" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {visibleIndicators.map((indicator) => {
              const change = formatIndicatorChange(indicator);

              return (
                <TooltipProvider key={indicator.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className="flex justify-between items-center py-2 border-b border-border last:border-0 hover:bg-primary/5 rounded px-2 -mx-2 cursor-pointer transition-colors group"
                        onClick={() => handleClick(indicator)}
                      >
                        <span className="text-muted-foreground text-sm group-hover:text-foreground transition-colors">
                          {indicator.indicator_name}
                        </span>
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
                          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
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

            {canToggle && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded ? 'Show less' : `Show all (${indicators.length})`}
              </Button>
            )}
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
