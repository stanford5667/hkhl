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

import { useState, useCallback, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Search,
  Filter,
  Zap,
  Database,
  Settings,
  Play,
  Layers,
  Clock,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  screenAllPortfolios,
  quickScreenPortfolios,
  fetchTickerCounts,
  ScreeningCriteria,
  GenerationConfig,
  GeneratedPortfolio,
  TickerStats,
  ScreeningProgress,
  ScreeningResult,
} from '@/services/dynamicPortfolioScreenerService';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

type SortField = 'matchScore' | 'cagr' | 'sharpe' | 'maxDrawdown' | 'volatility' | 'sortino';
type SortDirection = 'asc' | 'desc';
type ScreenMode = 'quick' | 'full';

interface DynamicScreenerProps {
  onSelect?: (allocations: { symbol: string; weight: number }[]) => void;
  onComplete?: (data: { 
    capital: number; 
    horizon: number; 
    allocations: { symbol: string; weight: number; assetClass?: string }[] 
  }) => void;
}

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
  
  // Criteria
  const [maxDrawdown, setMaxDrawdown] = useState(30);
  const [maxVolatility, setMaxVolatility] = useState(20);
  const [minSharpe, setMinSharpe] = useState(0.3);
  const [minCagr, setMinCagr] = useState(-5);
  
  // Config
  const [screenMode, setScreenMode] = useState<ScreenMode>('quick');
  const [minAssets, setMinAssets] = useState(2);
  const [maxAssets, setMaxAssets] = useState(5);
  const [maxPortfolios, setMaxPortfolios] = useState(10000);
  
  // UI state
  const [sortField, setSortField] = useState<SortField>('matchScore');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedPortfolio, setSelectedPortfolio] = useState<GeneratedPortfolio | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [capital, setCapital] = useState(100000);
  const [horizon, setHorizon] = useState(5);
  
  // Filters
  const [filterRiskLevel, setFilterRiskLevel] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

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

  // ─────────────────────────────────────────────────────────────────────────────
  // Run screening
  // ─────────────────────────────────────────────────────────────────────────────
  
  const runScreening = useCallback(async () => {
    setIsLoading(true);
    setProgress(null);
    setPortfolios([]);
    
    const criteria: ScreeningCriteria = {
      maxDrawdown,
      maxVolatility,
      minSharpe,
      minCagr,
    };
    
    const config: GenerationConfig = {
      minAssets,
      maxAssets,
      weightStep: 10,
      maxPortfolios,
    };
    
    try {
      let result: ScreeningResult;
      
      if (screenMode === 'quick') {
        result = await quickScreenPortfolios(criteria, setProgress);
      } else {
        result = await screenAllPortfolios(criteria, config, setProgress);
      }
      
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
  }, [maxDrawdown, maxVolatility, minSharpe, minCagr, screenMode, minAssets, maxAssets, maxPortfolios]);

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
        case 'sharpe':
          aVal = a.metrics.sharpe;
          bVal = b.metrics.sharpe;
          break;
        case 'maxDrawdown':
          aVal = a.metrics.maxDrawdown;
          bVal = b.metrics.maxDrawdown;
          break;
        case 'volatility':
          aVal = a.metrics.volatility;
          bVal = b.metrics.volatility;
          break;
        case 'sortino':
          aVal = a.metrics.sortino;
          bVal = b.metrics.sortino;
          break;
        case 'matchScore':
        default:
          aVal = a.matchScore;
          bVal = b.matchScore;
      }
      
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });
    
    return filtered;
  }, [portfolios, filterRiskLevel, searchQuery, sortField, sortDirection]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────────────
  
  const handleSelect = (p: GeneratedPortfolio) => {
    setSelectedPortfolio(p);
    setDetailsOpen(true);
  };

  const handleUsePortfolio = () => {
    if (!selectedPortfolio) return;
    
    const allocations = selectedPortfolio.allocations.map(a => ({ 
      symbol: a.ticker, 
      weight: a.weight,
      assetClass: 'etfs' as const,
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
              {availableTickers.length} tickers
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

        {/* Mode selector */}
        <Tabs value={screenMode} onValueChange={(v) => setScreenMode(v as ScreenMode)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="quick" className="text-xs">
              <Zap className="h-3 w-3 mr-1" />
              Quick (20 Templates)
            </TabsTrigger>
            <TabsTrigger value="full" className="text-xs">
              <Layers className="h-3 w-3 mr-1" />
              Full Generation
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Criteria sliders */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Max Drawdown</span>
              <span className="font-mono font-bold">≤{maxDrawdown}%</span>
            </div>
            <Slider
              value={[maxDrawdown]}
              onValueChange={([v]) => setMaxDrawdown(v)}
              min={5}
              max={60}
              step={5}
            />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Max Volatility</span>
              <span className="font-mono font-bold">≤{maxVolatility}%</span>
            </div>
            <Slider
              value={[maxVolatility]}
              onValueChange={([v]) => setMaxVolatility(v)}
              min={5}
              max={40}
              step={5}
            />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Min Sharpe</span>
              <span className="font-mono font-bold">≥{minSharpe.toFixed(1)}</span>
            </div>
            <Slider
              value={[minSharpe]}
              onValueChange={([v]) => setMinSharpe(v)}
              min={-0.5}
              max={1.5}
              step={0.1}
            />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Min CAGR</span>
              <span className="font-mono font-bold">≥{minCagr}%</span>
            </div>
            <Slider
              value={[minCagr]}
              onValueChange={([v]) => setMinCagr(v)}
              min={-20}
              max={20}
              step={5}
            />
          </div>
        </div>

        {/* Advanced config */}
        <Collapsible open={configOpen} onOpenChange={setConfigOpen}>
          <CollapsibleContent className="space-y-3 pt-3 border-t">
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
                  min={10}
                  max={500}
                  step={10}
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

      {/* Filters & Stats */}
      {portfolios.length > 0 && (
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
                <SelectTrigger className="h-7 w-[90px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="matchScore">Match %</SelectItem>
                  <SelectItem value="cagr">CAGR</SelectItem>
                  <SelectItem value="sharpe">Sharpe</SelectItem>
                  <SelectItem value="maxDrawdown">Drawdown</SelectItem>
                  <SelectItem value="volatility">Volatility</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setSortDirection(d => d === 'asc' ? 'desc' : 'asc')}
              >
                {sortDirection === 'desc' ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <span>Showing {filteredPortfolios.length} of {portfolios.length} portfolios</span>
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
          {!isLoading && portfolios.length === 0 && !progress && (
            <div className="text-center py-16 text-muted-foreground">
              <Database className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No portfolios screened yet</p>
              <p className="text-xs mt-1">Set your criteria and click "Screen Portfolios"</p>
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
          
          {filteredPortfolios.map((p, idx) => {
            const style = RISK_STYLES[p.riskLevel];
            const Icon = style.icon;
            const isTop = idx === 0;
            
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
                  
                  {/* Metrics row */}
                  <div className="grid grid-cols-5 gap-1 text-center">
                    <div className="p-1 rounded bg-muted/50 text-[9px]">
                      <p className="text-muted-foreground">DD</p>
                      <p className={cn(
                        "font-mono font-bold",
                        p.metrics.maxDrawdown <= maxDrawdown ? "text-emerald-400" : ""
                      )}>
                        -{p.metrics.maxDrawdown}%
                      </p>
                    </div>
                    <div className="p-1 rounded bg-muted/50 text-[9px]">
                      <p className="text-muted-foreground">Vol</p>
                      <p className={cn(
                        "font-mono font-bold",
                        p.metrics.volatility <= maxVolatility ? "text-emerald-400" : ""
                      )}>
                        {p.metrics.volatility}%
                      </p>
                    </div>
                    <div className="p-1 rounded bg-muted/50 text-[9px]">
                      <p className="text-muted-foreground">Sharpe</p>
                      <p className={cn(
                        "font-mono font-bold",
                        p.metrics.sharpe >= minSharpe ? "text-emerald-400" : ""
                      )}>
                        {p.metrics.sharpe.toFixed(2)}
                      </p>
                    </div>
                    <div className="p-1 rounded bg-muted/50 text-[9px]">
                      <p className="text-muted-foreground">Sortino</p>
                      <p className="font-mono font-bold">
                        {p.metrics.sortino.toFixed(2)}
                      </p>
                    </div>
                    <div className="p-1 rounded bg-muted/50 text-[9px]">
                      <p className="text-muted-foreground">CAGR</p>
                      <p className={cn(
                        "font-mono font-bold",
                        p.metrics.cagr >= minCagr ? "text-emerald-400" : "text-rose-400"
                      )}>
                        {p.metrics.cagr >= 0 ? '+' : ''}{p.metrics.cagr}%
                      </p>
                    </div>
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
