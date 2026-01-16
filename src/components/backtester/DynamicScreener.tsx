/**
 * Dynamic Portfolio Screener
 * 
 * Discovers ALL available tickers from the database and generates
 * ANY portfolio combination that meets user-specified criteria.
 * 
 * Features:
 * - Auto-discovers tickers with sufficient historical data
 * - Generates portfolio combinations dynamically
 * - Real-time progress feedback
 * - Filters ALL matching portfolios
 * - Sorts by match score, returns, risk metrics
 */

import { AssetClass } from '@/types/portfolio';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  TrendingUp,
  TrendingDown,
  Shield,
  Scale,
  Snowflake,
  Flame,
  Loader2,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Filter,
  Zap,
  Database,
  Settings,
  Play,
  Clock,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { MetricInfoIcon } from '@/components/shared/MetricInfoIcon';
import { MetricEducationalPopover } from '@/components/shared/MetricEducationalPopover';
import {
  quickScreenPortfolios,
  fetchTickerCounts,
  ScreeningCriteria,
  GeneratedPortfolio,
  TickerStats,
  ScreeningProgress,
  ScreeningResult,
} from '@/services/dynamicPortfolioScreenerService';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

type SortField = 'cagr' | 'totalReturn' | 'sharpe' | 'maxDrawdown' | 'volatility' | 'sortino' | 'stdDev';
type SortDirection = 'asc' | 'desc';
type ScreenMode = 'quick' | 'full';
type MetricKey = 'maxDrawdown' | 'maxVolatility' | 'minSharpe' | 'minCagr' | 'maxStdDev';

interface DynamicScreenerProps {
  onSelect?: (allocations: { symbol: string; weight: number }[]) => void;
  onComplete?: (data: { 
    capital: number; 
    horizon: number; 
    allocations: { symbol: string; weight: number; assetClass: AssetClass }[] 
  }) => void;
}

const ITEMS_PER_PAGE = 50;

const RISK_STYLES = {
  conservative: { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: Snowflake },
  moderate: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: Scale },
  growth: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: TrendingUp },
  aggressive: { color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30', icon: Flame },
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function DynamicScreener({ onSelect, onComplete }: DynamicScreenerProps) {
  // ─────────────────────────────────────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────────────────────────────────────
  
  // Results
  const [portfolios, setPortfolios] = useState<GeneratedPortfolio[]>([]);
  const [tickerStats, setTickerStats] = useState<TickerStats[]>([]);
  const [availableTickers, setAvailableTickers] = useState<{ ticker: string; count: number }[]>([]);
  
  // Screening state
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<ScreeningProgress | null>(null);
  const [lastResult, setLastResult] = useState<ScreeningResult | null>(null);
  
  // Criteria (store values, but only ONE is active at a time)
  const [activeMetric, setActiveMetric] = useState<MetricKey>('maxDrawdown');
  const [maxDrawdown, setMaxDrawdown] = useState(30);
  const [maxVolatility, setMaxVolatility] = useState(20);
  const [minSharpe, setMinSharpe] = useState(0.3);
  const [minCagr, setMinCagr] = useState(-5);
  const [maxStdDev, setMaxStdDev] = useState(18);
  
  // Config
  // Always use quick mode
  const screenMode: ScreenMode = 'quick';
  const [lookbackYears, setLookbackYears] = useState(5); // Match typical backtest period
  const [minAssets, setMinAssets] = useState(2);
  const [maxAssets, setMaxAssets] = useState(5);
  const [maxPortfolios, setMaxPortfolios] = useState(10000);
  
  // UI state
  const [sortField, setSortField] = useState<SortField>('cagr');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedPortfolio, setSelectedPortfolio] = useState<GeneratedPortfolio | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [capital, setCapital] = useState(100000);
  const [horizon, setHorizon] = useState(5);
  
  // Filters
  const [filterRiskLevel, setFilterRiskLevel] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // ─────────────────────────────────────────────────────────────────────────────
  // Load available tickers on mount
  // ─────────────────────────────────────────────────────────────────────────────
  
  useEffect(() => {
    async function loadTickers() {
      try {
        const counts = await fetchTickerCounts();
        setAvailableTickers(counts.filter(t => t.count >= 100));
      } catch (error) {
        console.error('Failed to load tickers:', error);
      }
    }
    loadTickers();
  }, []);

  // Auto-run quick screening on mount to show templates
  useEffect(() => {
    runScreening();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // Run screening
  // ─────────────────────────────────────────────────────────────────────────────
  
  const runScreening = useCallback(async () => {
    setIsLoading(true);
    setProgress(null);
    setPortfolios([]);
    
    const criteria: ScreeningCriteria = {};
    switch (activeMetric) {
      case 'maxDrawdown':
        criteria.maxDrawdown = maxDrawdown;
        break;
      case 'maxVolatility':
        criteria.maxVolatility = maxVolatility;
        break;
      case 'minSharpe':
        criteria.minSharpe = minSharpe;
        break;
      case 'minCagr':
        criteria.minCagr = minCagr;
        break;
      case 'maxStdDev':
        // Standard deviation = volatility in this context
        criteria.maxVolatility = maxStdDev;
        break;
    }
    
    
    try {
      let result: ScreeningResult;
      
      // Always use quick screening
      result = await quickScreenPortfolios(criteria, lookbackYears, setProgress);
      
      setPortfolios(result.portfolios);
      setTickerStats(result.tickerStats);
      setLastResult(result);
      
      toast.success(`Found ${result.totalMatched} portfolios matching your criteria`, {
        description: `Screened ${result.totalGenerated} combinations in ${(result.screeningTime / 1000).toFixed(1)}s`,
      });
    } catch (error) {
      console.error('Screening failed:', error);
      toast.error('Screening failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsLoading(false);
    }
  }, [activeMetric, maxDrawdown, maxVolatility, minSharpe, minCagr, screenMode, minAssets, maxAssets, maxPortfolios, lookbackYears]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Filtered and sorted portfolios
  // ─────────────────────────────────────────────────────────────────────────────
  
  const filteredPortfolios = useMemo(() => {
    let filtered = [...portfolios];
    
    // Filter by risk level
    if (filterRiskLevel !== 'all') {
      filtered = filtered.filter(p => p.riskLevel === filterRiskLevel);
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.allocations.some(a => a.ticker.toLowerCase().includes(query))
      );
    }
    
    // Sort
    filtered.sort((a, b) => {
      let aVal: number, bVal: number;
      
      switch (sortField) {
        case 'cagr':
          aVal = a.metrics.cagr;
          bVal = b.metrics.cagr;
          break;
        case 'totalReturn':
          aVal = a.metrics.totalReturn;
          bVal = b.metrics.totalReturn;
          break;
        case 'sharpe':
          aVal = a.metrics.sharpe;
          bVal = b.metrics.sharpe;
          break;
        case 'maxDrawdown':
          aVal = a.metrics.maxDrawdown;
          bVal = b.metrics.maxDrawdown;
          break;
        case 'volatility':
        case 'stdDev':
          aVal = a.metrics.volatility;
          bVal = b.metrics.volatility;
          break;
        case 'sortino':
          aVal = a.metrics.sortino;
          bVal = b.metrics.sortino;
          break;
        default:
          aVal = a.metrics.cagr;
          bVal = b.metrics.cagr;
      }
      
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });
    
    return filtered;
  }, [portfolios, filterRiskLevel, searchQuery, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredPortfolios.length / ITEMS_PER_PAGE);
  const paginatedPortfolios = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredPortfolios.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredPortfolios, currentPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterRiskLevel, searchQuery, sortField, sortDirection, portfolios]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────────────
  
  const handleSelect = (p: GeneratedPortfolio) => {
    setSelectedPortfolio(p);
    setDetailsOpen(true);
  };

  const handleUsePortfolio = () => {
    if (!selectedPortfolio) return;
    
    const allocations: { symbol: string; weight: number; assetClass: AssetClass }[] = 
      selectedPortfolio.allocations.map(a => ({ 
        symbol: a.ticker, 
        weight: a.weight,
        assetClass: 'etfs' as AssetClass,
      }));
    
    if (onComplete) {
      onComplete({ capital, horizon, allocations });
      toast.success(`Using ${selectedPortfolio.name}`);
      setDetailsOpen(false);
    } else if (onSelect) {
      onSelect(allocations.map(a => ({ symbol: a.symbol, weight: a.weight })));
      toast.success(`Using ${selectedPortfolio.name}`);
      setDetailsOpen(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────
  
  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-4 border-b space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Dynamic Screener</h2>
            <Badge variant="secondary" className="text-[10px]">
              20 Templates
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setConfigOpen(!configOpen)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Quick screening mode indicator */}
        <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg">
          <Zap className="h-4 w-4 text-primary" />
          <span className="text-xs text-muted-foreground">Quick Screening (20 Templates)</span>
        </div>

        {/* Screening metric (one at a time) */}
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <Label className="text-xs">Filter By</Label>
              <MetricInfoIcon termKey="riskAdjustedReturn" iconSize={12} />
            </div>
            <Select value={activeMetric} onValueChange={(v) => setActiveMetric(v as MetricKey)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[100]">
                <SelectItem value="maxDrawdown">
                  <span className="flex items-center gap-1.5 w-full justify-between">
                    <span>Max Decline (Drawdown)</span>
                    <MetricInfoIcon termKey="maxDrawdown" iconSize={12} />
                  </span>
                </SelectItem>
                <SelectItem value="maxVolatility">
                  <span className="flex items-center gap-1.5 w-full justify-between">
                    <span>Max Price Swings (Volatility)</span>
                    <MetricInfoIcon termKey="volatility" iconSize={12} />
                  </span>
                </SelectItem>
                <SelectItem value="maxStdDev">
                  <span className="flex items-center gap-1.5 w-full justify-between">
                    <span>Max Std. Deviation</span>
                    <MetricInfoIcon termKey="standardDeviation" iconSize={12} />
                  </span>
                </SelectItem>
                <SelectItem value="minSharpe">
                  <span className="flex items-center gap-1.5 w-full justify-between">
                    <span>Min Risk-Adjusted Return (Sharpe)</span>
                    <MetricInfoIcon termKey="sharpeRatio" iconSize={12} />
                  </span>
                </SelectItem>
                <SelectItem value="minCagr">
                  <span className="flex items-center gap-1.5 w-full justify-between">
                    <span>Min Annual Growth (CAGR)</span>
                    <MetricInfoIcon termKey="cagr" iconSize={12} />
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {activeMetric === 'maxDrawdown' && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs items-center">
                <span className="text-muted-foreground flex items-center gap-1">
                  Max Decline
                  <MetricInfoIcon termKey="maxDrawdown" iconSize={12} />
                </span>
                <span className="font-mono font-bold">≤{maxDrawdown}%</span>
              </div>
              <Slider
                value={[maxDrawdown]}
                onValueChange={([v]) => setMaxDrawdown(v)}
                min={5}
                max={60}
                step={5}
              />
              <p className="text-[10px] text-muted-foreground/70">
                Worst peak-to-bottom drop you'd accept
              </p>
            </div>
          )}

          {activeMetric === 'maxVolatility' && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs items-center">
                <span className="text-muted-foreground flex items-center gap-1">
                  Max Price Swings
                  <MetricInfoIcon termKey="volatility" iconSize={12} />
                </span>
                <span className="font-mono font-bold">≤{maxVolatility}%</span>
              </div>
              <Slider
                value={[maxVolatility]}
                onValueChange={([v]) => setMaxVolatility(v)}
                min={5}
                max={40}
                step={5}
              />
              <p className="text-[10px] text-muted-foreground/70">
                How much daily ups and downs you're comfortable with
              </p>
            </div>
          )}

          {activeMetric === 'maxStdDev' && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs items-center">
                <span className="text-muted-foreground flex items-center gap-1">
                  Max Std. Deviation
                  <MetricInfoIcon termKey="standardDeviation" iconSize={12} />
                </span>
                <span className="font-mono font-bold">≤{maxStdDev}%</span>
              </div>
              <Slider
                value={[maxStdDev]}
                onValueChange={([v]) => setMaxStdDev(v)}
                min={5}
                max={35}
                step={1}
              />
              <p className="text-[10px] text-muted-foreground/70">
                How spread out returns are from the average
              </p>
            </div>
          )}

          {activeMetric === 'minSharpe' && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs items-center">
                <span className="text-muted-foreground flex items-center gap-1">
                  Min Sharpe Ratio
                  <MetricInfoIcon termKey="sharpeRatio" iconSize={12} />
                </span>
                <span className="font-mono font-bold">≥{minSharpe.toFixed(1)}</span>
              </div>
              <Slider
                value={[minSharpe]}
                onValueChange={([v]) => setMinSharpe(v)}
                min={-0.5}
                max={1.5}
                step={0.1}
              />
              <p className="text-[10px] text-muted-foreground/70">
                Return per unit of risk (higher = better reward for risk)
              </p>
            </div>
          )}

          {activeMetric === 'minCagr' && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs items-center">
                <span className="text-muted-foreground flex items-center gap-1">
                  Min Annual Growth
                  <MetricInfoIcon termKey="cagr" iconSize={12} />
                </span>
                <span className="font-mono font-bold">≥{minCagr}%</span>
              </div>
              <Slider
                value={[minCagr]}
                onValueChange={([v]) => setMinCagr(v)}
                min={-20}
                max={20}
                step={5}
              />
              <p className="text-[10px] text-muted-foreground/70">
                Smoothed yearly return target
              </p>
            </div>
          )}
        </div>

        {/* Advanced config */}
        <Collapsible open={configOpen} onOpenChange={setConfigOpen}>
          <CollapsibleContent className="space-y-3 pt-3 border-t">
            {/* Lookback period selector */}
            <div className="space-y-1">
              <Label className="text-xs">Lookback Period</Label>
              <div className="grid grid-cols-4 gap-1">
                {[
                  { value: 1, label: '1Y' },
                  { value: 3, label: '3Y' },
                  { value: 5, label: '5Y' },
                  { value: 10, label: '10Y' },
                ].map(option => (
                  <Button
                    key={option.value}
                    variant={lookbackYears === option.value ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setLookbackYears(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Min Assets</Label>
                <Input
                  type="number"
                  value={minAssets}
                  onChange={(e) => setMinAssets(Number(e.target.value))}
                  min={1}
                  max={10}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Max Assets</Label>
                <Input
                  type="number"
                  value={maxAssets}
                  onChange={(e) => setMaxAssets(Number(e.target.value))}
                  min={1}
                  max={10}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Max Results</Label>
                <Input
                  type="number"
                  value={maxPortfolios}
                  onChange={(e) => setMaxPortfolios(Number(e.target.value))}
                  min={100}
                  max={50000}
                  step={100}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Run button */}
        <Button 
          className="w-full" 
          onClick={runScreening}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Screening...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Screen Portfolios
            </>
          )}
        </Button>

        {/* Progress */}
        {progress && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{progress.message}</span>
              <span className="font-mono">{Math.round(progress.current)}%</span>
            </div>
            <Progress value={progress.current} className="h-1" />
          </div>
        )}
      </div>

      {/* Filters & Stats - only show when we have results */}
      {filteredPortfolios.length > 0 && (
        <div className="flex-shrink-0 px-4 py-2 border-b bg-muted/30">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-7 text-xs pl-7"
                />
              </div>
              <Select value={filterRiskLevel} onValueChange={setFilterRiskLevel}>
                <SelectTrigger className="h-7 w-[100px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Risk</SelectItem>
                  <SelectItem value="conservative">Conservative</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="growth">Growth</SelectItem>
                  <SelectItem value="aggressive">Aggressive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1">
              <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
                <SelectTrigger className="h-7 w-[120px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[100]">
                  <SelectItem value="totalReturn">
                    <span className="flex items-center gap-1.5 w-full justify-between">
                      <span>Total Return</span>
                      <MetricInfoIcon termKey="totalReturn" iconSize={11} />
                    </span>
                  </SelectItem>
                  <SelectItem value="cagr">
                    <span className="flex items-center gap-1.5 w-full justify-between">
                      <span>Annual Growth</span>
                      <MetricInfoIcon termKey="cagr" iconSize={11} />
                    </span>
                  </SelectItem>
                  <SelectItem value="sharpe">
                    <span className="flex items-center gap-1.5 w-full justify-between">
                      <span>Risk Score</span>
                      <MetricInfoIcon termKey="sharpeRatio" iconSize={11} />
                    </span>
                  </SelectItem>
                  <SelectItem value="sortino">
                    <span className="flex items-center gap-1.5 w-full justify-between">
                      <span>Safety</span>
                      <MetricInfoIcon termKey="sortinoRatio" iconSize={11} />
                    </span>
                  </SelectItem>
                  <SelectItem value="maxDrawdown">
                    <span className="flex items-center gap-1.5 w-full justify-between">
                      <span>Max Drop</span>
                      <MetricInfoIcon termKey="maxDrawdown" iconSize={11} />
                    </span>
                  </SelectItem>
                  <SelectItem value="stdDev">
                    <span className="flex items-center gap-1.5 w-full justify-between">
                      <span>Volatility</span>
                      <MetricInfoIcon termKey="standardDeviation" iconSize={11} />
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2 gap-1"
                onClick={() => setSortDirection(d => d === 'asc' ? 'desc' : 'asc')}
              >
                {sortDirection === 'desc' ? (
                  <>
                    <TrendingDown className="h-3 w-3" />
                    High→Low
                  </>
                ) : (
                  <>
                    <TrendingUp className="h-3 w-3" />
                    Low→High
                  </>
                )}
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <span>
              Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredPortfolios.length)} of {filteredPortfolios.length}
            </span>
            {lastResult && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {(lastResult.screeningTime / 1000).toFixed(1)}s
              </span>
            )}
          </div>
        </div>
      )}

      {/* Results */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {!isLoading && portfolios.length === 0 && !progress && !lastResult && (
            <div className="text-center py-16 text-muted-foreground">
              <Database className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No portfolios screened yet</p>
              <p className="text-xs mt-1">Set your criteria and click "Screen Portfolios"</p>
            </div>
          )}
          
          {!isLoading && portfolios.length === 0 && lastResult && (
            <div className="text-center py-16 text-muted-foreground">
              <Filter className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No portfolios matched your criteria</p>
              <p className="text-xs mt-1">
                Screened {lastResult.totalGenerated} combinations. Try relaxing your criteria (higher max drawdown, lower min Sharpe, etc.)
              </p>
            </div>
          )}
          
          {isLoading && portfolios.length === 0 && (
            <div className="text-center py-16">
              <Loader2 className="h-10 w-10 mx-auto mb-3 animate-spin text-primary" />
              <p className="text-sm">{progress?.message || 'Initializing...'}</p>
            </div>
          )}
          
          {filteredPortfolios.length === 0 && portfolios.length > 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <Filter className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No portfolios match your filters</p>
              <p className="text-xs mt-1">Try adjusting the risk level or search query</p>
            </div>
          )}
          
          {paginatedPortfolios.map((p, idx) => {
            const style = RISK_STYLES[p.riskLevel];
            const Icon = style.icon;
            const isTop = idx === 0 && currentPage === 1;
            
            return (
              <Card
                key={p.id}
                className={cn(
                  "cursor-pointer transition-all active:scale-[0.98]",
                  isTop && "ring-2 ring-primary"
                )}
                onClick={() => handleSelect(p)}
              >
                <CardContent className="p-3">
                  {/* Header row */}
                  <div className="flex items-center gap-3 mb-2">
                    <div className={cn("p-1.5 rounded-lg", style.bg)}>
                      <Icon className={cn("h-4 w-4", style.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-sm truncate">{p.name}</h3>
                        {isTop && <Badge className="text-[9px] h-4">Best</Badge>}
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">{p.description}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="secondary" className="font-mono text-xs">
                        {p.matchScore}%
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                  
                  {/* Metrics row - tap any metric to learn more */}
                  {/* Return metrics first */}
                  <div className="grid grid-cols-6 gap-1 text-center">
                    <MetricEducationalPopover
                      label="Total Return"
                      value={`${p.metrics.totalReturn >= 0 ? '+' : ''}${p.metrics.totalReturn}%`}
                      termKey="totalReturn"
                      isPrimary
                      isNegative={p.metrics.totalReturn < 0}
                    />
                    
                    <MetricEducationalPopover
                      label="Annual"
                      value={`${p.metrics.cagr >= 0 ? '+' : ''}${p.metrics.cagr}%`}
                      termKey="cagr"
                      isHighlighted={p.metrics.cagr >= minCagr}
                      isNegative={p.metrics.cagr < 0}
                    />
                    
                    <MetricEducationalPopover
                      label="Risk Score"
                      value={p.metrics.sharpe.toFixed(2)}
                      termKey="sharpeRatio"
                      isHighlighted={p.metrics.sharpe >= minSharpe}
                    />
                    
                    <MetricEducationalPopover
                      label="Safety"
                      value={p.metrics.sortino.toFixed(2)}
                      termKey="sortinoRatio"
                    />
                    
                    <MetricEducationalPopover
                      label="Max Drop"
                      value={`-${p.metrics.maxDrawdown}%`}
                      termKey="drawdown"
                      isHighlighted={p.metrics.maxDrawdown <= maxDrawdown}
                    />
                    
                    <MetricEducationalPopover
                      label="Volatility"
                      value={`${p.metrics.volatility}%`}
                      termKey="standardDeviation"
                      isHighlighted={p.metrics.volatility <= maxVolatility}
                    />
                  </div>
                  
                  {/* Allocation pills */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {p.allocations.map(a => (
                      <Badge key={a.ticker} variant="outline" className="text-[9px] h-5 font-mono">
                        {a.ticker} {a.weight}%
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 py-4 border-t mt-4">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm px-3 font-mono">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Details Sheet */}
      <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
        <SheetContent side="bottom" className="h-[85vh] max-h-[85vh] flex flex-col">
          {selectedPortfolio && (
            <div className="flex flex-col h-full overflow-hidden">
              <SheetHeader className="flex-shrink-0 pb-4">
                <SheetTitle className="flex items-center gap-2">
                  {(() => {
                    const Icon = RISK_STYLES[selectedPortfolio.riskLevel].icon;
                    return <Icon className={cn("h-5 w-5", RISK_STYLES[selectedPortfolio.riskLevel].color)} />;
                  })()}
                  {selectedPortfolio.name}
                  <Badge variant="secondary" className="ml-2">
                    {selectedPortfolio.matchScore}% Match
                  </Badge>
                </SheetTitle>
              </SheetHeader>
              
              <ScrollArea className="flex-1">
                <div className="space-y-4 pr-2">
                  <p className="text-sm text-muted-foreground">{selectedPortfolio.description}</p>
                  
                  {/* Key metrics */}
                  <div className="grid grid-cols-2 gap-2">
                    <Card className="p-3 bg-emerald-500/10 border-emerald-500/30">
                      <p className="text-[10px] text-muted-foreground uppercase">CAGR</p>
                      <p className="text-xl font-bold text-emerald-400 font-mono">
                        {selectedPortfolio.metrics.cagr >= 0 ? '+' : ''}{selectedPortfolio.metrics.cagr}%
                      </p>
                    </Card>
                    <Card className="p-3 bg-rose-500/10 border-rose-500/30">
                      <p className="text-[10px] text-muted-foreground uppercase">Max Drawdown</p>
                      <p className="text-xl font-bold text-rose-400 font-mono">
                        -{selectedPortfolio.metrics.maxDrawdown}%
                      </p>
                    </Card>
                    <Card className="p-3">
                      <p className="text-[10px] text-muted-foreground uppercase">Volatility</p>
                      <p className="text-lg font-bold font-mono">{selectedPortfolio.metrics.volatility}%</p>
                    </Card>
                    <Card className="p-3">
                      <p className="text-[10px] text-muted-foreground uppercase">Sharpe Ratio</p>
                      <p className="text-lg font-bold font-mono">{selectedPortfolio.metrics.sharpe.toFixed(2)}</p>
                    </Card>
                  </div>
                  
                  <Card className="p-3">
                    <p className="text-[10px] text-muted-foreground uppercase">Sortino Ratio</p>
                    <p className="text-lg font-bold font-mono">{selectedPortfolio.metrics.sortino.toFixed(2)}</p>
                  </Card>
                  
                  {/* Allocations */}
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">Allocations</h4>
                    <div className="space-y-1.5">
                      {selectedPortfolio.allocations.map(a => (
                        <div key={a.ticker} className="flex items-center justify-between p-2 rounded bg-muted/50">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono text-xs">{a.ticker}</Badge>
                            <span className="text-xs text-muted-foreground">{a.name}</span>
                          </div>
                          <span className="font-bold text-sm">{a.weight}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </ScrollArea>
              
              {/* Action button */}
              {(onSelect || onComplete) && (
                <div className="flex-shrink-0 pt-4 border-t border-border mt-4 space-y-3">
                  {onComplete && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-[10px] text-muted-foreground uppercase">Initial Capital</Label>
                        <Input
                          type="number"
                          value={capital}
                          onChange={(e) => setCapital(Number(e.target.value))}
                          className="h-9 font-mono"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground uppercase">Horizon (years)</Label>
                        <Input
                          type="number"
                          value={horizon}
                          onChange={(e) => setHorizon(Number(e.target.value))}
                          className="h-9 font-mono"
                        />
                      </div>
                    </div>
                  )}
                  <Button className="w-full h-11" onClick={handleUsePortfolio}>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    {onComplete ? 'Analyze Portfolio' : 'Use This Portfolio'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default DynamicScreener;
