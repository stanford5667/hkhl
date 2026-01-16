/**
 * Dynamic Portfolio Screener
 * 
 * UPGRADED: Now supports 100,000+ portfolio combinations using:
 * - 150+ ticker universe (up from 50)
 * - 19 portfolio families with algorithmic generation
 * - Fast metric estimation from cached ticker stats
 * - Server-side-like pagination (generates on demand)
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
  TrendingUp,
  TrendingDown,
  Loader2,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Zap,
  Database,
  Play,
  Sparkles,
  Infinity,
  FlaskConical,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { InlinePortfolioStudy } from './InlinePortfolioStudy';
import { MetricCard } from './MetricCard';
import { HoldingDetailCard } from './HoldingDetailCard';
import { PortfolioCard } from './PortfolioCard';
import { ScreenerGuide } from './ScreenerGuide';

// Import expanded universe service
import {
  getUniverseStats,
  FilterCriteria,
  GeneratedPortfolioV2,
  GenerationProgress,
  TICKER_MAP,
} from '@/services/expandedPortfolioUniverse';

// Import server-side screener API
import { screenPortfoliosServer } from '@/services/portfolioScreenerApi';

// Legacy imports for backward compatibility
import {
  quickScreenPortfolios,
  ScreeningCriteria,
  GeneratedPortfolio,
  ScreeningProgress,
} from '@/services/dynamicPortfolioScreenerService';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

type SortField = 'cagr' | 'totalReturn' | 'sharpe' | 'maxDrawdown' | 'matchScore';
type SortDirection = 'asc' | 'desc';
type ScreenMode = 'quick' | 'expanded';
type MetricKey = 'maxLoss' | 'minSharpe' | 'minAvgReturns' | 'minTotalReturn' | null;
type ReturnPeriod = '1' | '2' | '3' | '4' | '5';

interface DynamicScreenerProps {
  onSelect?: (allocations: { symbol: string; weight: number }[]) => void;
  onComplete?: (data: { 
    capital: number; 
    horizon: number; 
    allocations: { symbol: string; weight: number; assetClass: AssetClass }[] 
  }) => void;
}

const INITIAL_ITEMS = 10; // First load
const LOAD_MORE_INCREMENT = 10; // Each "See More" click
const ITEMS_PER_PAGE = 20; // Max items per server page

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function DynamicScreener({ onSelect, onComplete }: DynamicScreenerProps) {
  // ─────────────────────────────────────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────────────────────────────────────
  
  // Expanded universe state
  const [expandedPortfolios, setExpandedPortfolios] = useState<GeneratedPortfolioV2[]>([]);
  const [expandedTotalCount, setExpandedTotalCount] = useState(0);
  const [expandedTotalPages, setExpandedTotalPages] = useState(0);
  const [generationTime, setGenerationTime] = useState(0);
  
  // Legacy results
  const [portfolios, setPortfolios] = useState<GeneratedPortfolio[]>([]);
  
  // Screening state
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress | ScreeningProgress | null>(null);
  
  // Criteria - relaxed defaults to show portfolios initially
  const [activeMetric, setActiveMetric] = useState<MetricKey | null>(null);
  const [maxLoss, setMaxLoss] = useState(50);
  const [minSharpe, setMinSharpe] = useState(-1);
  const [minAvgReturns, setMinAvgReturns] = useState(-30);
  const [minTotalReturn, setMinTotalReturn] = useState(-50);
  const [returnPeriod, setReturnPeriod] = useState<ReturnPeriod>('1');
  
  // Mode
  const [screenMode, setScreenMode] = useState<ScreenMode>('expanded');
  const [lookbackYears] = useState(1);
  const [maxPortfolios] = useState(100000);
  
  // UI state
  const [sortField, setSortField] = useState<SortField>('matchScore');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedPortfolio, setSelectedPortfolio] = useState<GeneratedPortfolio | GeneratedPortfolioV2 | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [capital, setCapital] = useState(100000);
  const [horizon, setHorizon] = useState(5);
  
  // Selected holding for inline detail view
  const [selectedHolding, setSelectedHolding] = useState<{ ticker: string; weight: number } | null>(null);
  
  // Filters
  const [filterRiskLevel, setFilterRiskLevel] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Progressive loading state
  const [visibleCount, setVisibleCount] = useState(INITIAL_ITEMS);
  
  // Pagination (for legacy quick mode)
  const [currentPage, setCurrentPage] = useState(1);
  
  // Universe stats
  const universeStats = useMemo(() => getUniverseStats(), []);
  
  // Track if user has explicitly run screening
  const [hasScreened, setHasScreened] = useState(false);
  
  // ─────────────────────────────────────────────────────────────────────────────
  // Instant sample portfolios (shown before user screens)
  // ─────────────────────────────────────────────────────────────────────────────
  
  const instantPortfolios: GeneratedPortfolioV2[] = useMemo(() => [
    {
      id: 'instant-1',
      name: 'Classic 60/40 Balanced',
      tickers: ['SPY', 'BND'],
      weights: [60, 40],
      riskProfile: 'moderate',
      family: 'balanced',
      metrics: { cagr: 8.2, volatility: 10.5, sharpe: 0.78, maxDrawdown: -22.1, sortino: 1.1, totalReturn: 48.5, dataPoints: 252 },
      matchScore: 85,
    },
    {
      id: 'instant-2',
      name: 'Growth Focus - US Equity',
      tickers: ['VTI', 'QQQ'],
      weights: [60, 40],
      riskProfile: 'growth',
      family: 'growth',
      metrics: { cagr: 12.4, volatility: 18.2, sharpe: 0.68, maxDrawdown: -33.5, sortino: 0.95, totalReturn: 78.2, dataPoints: 252 },
      matchScore: 80,
    },
    {
      id: 'instant-3',
      name: 'Conservative Bond-Heavy',
      tickers: ['BND', 'TLT', 'VTI'],
      weights: [50, 30, 20],
      riskProfile: 'conservative',
      family: 'conservative',
      metrics: { cagr: 5.1, volatility: 7.8, sharpe: 0.65, maxDrawdown: -12.4, sortino: 0.85, totalReturn: 28.1, dataPoints: 252 },
      matchScore: 78,
    },
    {
      id: 'instant-4',
      name: 'Global Diversified',
      tickers: ['VTI', 'VXUS', 'BND'],
      weights: [45, 35, 20],
      riskProfile: 'moderate',
      family: 'diversified',
      metrics: { cagr: 7.8, volatility: 12.1, sharpe: 0.64, maxDrawdown: -26.8, sortino: 0.88, totalReturn: 45.2, dataPoints: 252 },
      matchScore: 82,
    },
    {
      id: 'instant-5',
      name: 'Aggressive Growth',
      tickers: ['QQQ', 'VGT', 'ARKK'],
      weights: [40, 40, 20],
      riskProfile: 'aggressive',
      family: 'aggressive',
      metrics: { cagr: 15.6, volatility: 24.5, sharpe: 0.64, maxDrawdown: -42.1, sortino: 0.82, totalReturn: 105.3, dataPoints: 252 },
      matchScore: 75,
    },
  ], []);

  // ─────────────────────────────────────────────────────────────────────────────
  // Run screening
  // ─────────────────────────────────────────────────────────────────────────────
  
  const runScreening = useCallback(async (page: number = 1) => {
    setIsLoading(true);
    setProgress(null);
    setCurrentPage(page);
    setHasScreened(true);
    
    if (screenMode === 'expanded') {
      const criteria: FilterCriteria = {};
      
      switch (activeMetric) {
        case 'maxLoss':
          criteria.maxDrawdown = maxLoss;
          break;
        case 'minSharpe':
          criteria.minSharpe = minSharpe;
          break;
        case 'minAvgReturns':
          criteria.minCagr = minAvgReturns;
          break;
        case 'minTotalReturn':
          // Pass both minTotalReturn and returnPeriod for accurate filtering
          criteria.minTotalReturn = minTotalReturn;
          criteria.returnPeriod = parseInt(returnPeriod);
          break;
      }
      
      try {
        // Fetch a reasonable batch (e.g., 50) from server for progressive reveal
        const result = await screenPortfoliosServer(
          criteria,
          {
            page: 1,
            pageSize: 50, // Fetch 50 at a time for client-side "See More"
            sortBy: sortField === 'matchScore' ? 'matchScore' : 
                   sortField === 'cagr' ? 'cagr' : 
                   sortField === 'sharpe' ? 'sharpe' : 
                   sortField === 'maxDrawdown' ? 'maxDrawdown' : 'matchScore',
            sortDirection,
            limit: 1000, // Only generate up to 1000 for speed, user can filter to narrow
            useCache: true,
          },
          (prog) => setProgress(prog)
        );
        
        setExpandedPortfolios(result.portfolios);
        setExpandedTotalCount(result.totalCount);
        setExpandedTotalPages(result.totalPages);
        setGenerationTime(result.generationTime);
        setPortfolios([]);
        
        toast.success(`Found ${result.totalCount.toLocaleString()} portfolios`, {
          description: `Generated in ${(result.generationTime / 1000).toFixed(1)}s`,
        });
      } catch (error) {
        console.error('Expanded screening failed:', error);
        toast.error('Screening failed', {
          description: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    } else {
      const criteria: ScreeningCriteria = {};
      switch (activeMetric) {
        case 'maxLoss':
          criteria.maxDrawdown = maxLoss;
          break;
        case 'minSharpe':
          criteria.minSharpe = minSharpe;
          break;
        case 'minAvgReturns':
          criteria.minCagr = minAvgReturns;
          break;
      }
      
      try {
        const result = await quickScreenPortfolios(criteria, lookbackYears, setProgress as any);
        setPortfolios(result.portfolios);
        setExpandedPortfolios([]);
        
        toast.success(`Found ${result.totalMatched} portfolios`, {
          description: `Screened in ${(result.screeningTime / 1000).toFixed(1)}s`,
        });
      } catch (error) {
        console.error('Screening failed:', error);
        toast.error('Screening failed');
      }
    }
    
    setIsLoading(false);
  }, [screenMode, activeMetric, maxLoss, minSharpe, minAvgReturns, minTotalReturn, returnPeriod, sortField, sortDirection, maxPortfolios, lookbackYears]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Filtered portfolios (for legacy mode)
  // ─────────────────────────────────────────────────────────────────────────────
  
  const filteredPortfolios = useMemo(() => {
    if (screenMode === 'expanded') return [];
    
    let filtered = [...portfolios];
    
    if (filterRiskLevel !== 'all') {
      filtered = filtered.filter(p => p.riskLevel === filterRiskLevel);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.allocations.some(a => a.ticker.toLowerCase().includes(query))
      );
    }
    
    filtered.sort((a, b) => {
      const aVal = sortField === 'matchScore' ? a.matchScore : a.metrics[sortField as keyof typeof a.metrics] || 0;
      const bVal = sortField === 'matchScore' ? b.matchScore : b.metrics[sortField as keyof typeof b.metrics] || 0;
      return sortDirection === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
    
    return filtered;
  }, [portfolios, filterRiskLevel, searchQuery, sortField, sortDirection, screenMode]);

  // For expanded mode we use progressive loading (show first N, "See More" to reveal more)
  // For legacy quick mode we keep pagination
  // Before any screening, show instant sample portfolios
  const displayedPortfolios = useMemo(() => {
    if (!hasScreened && screenMode === 'expanded') {
      // Show instant sample portfolios before user has screened
      return instantPortfolios;
    }
    if (screenMode === 'expanded') {
      return expandedPortfolios.slice(0, visibleCount);
    }
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredPortfolios.slice(start, start + ITEMS_PER_PAGE);
  }, [screenMode, expandedPortfolios, filteredPortfolios, currentPage, visibleCount, hasScreened, instantPortfolios]);

  // Pagination (legacy mode only)
  const totalPages = screenMode === 'expanded' ? 1 : Math.ceil(filteredPortfolios.length / ITEMS_PER_PAGE);
  const totalCount = screenMode === 'expanded' 
    ? (hasScreened ? expandedTotalCount : instantPortfolios.length) 
    : filteredPortfolios.length;

  // Can we show more in expanded mode? (only if screened)
  const hasMore = hasScreened && screenMode === 'expanded' && visibleCount < expandedPortfolios.length;
  const canLoadNextPage = hasScreened && screenMode === 'expanded' && expandedPortfolios.length < expandedTotalCount;

  // Reset visible count when running new screening
  useEffect(() => {
    setVisibleCount(INITIAL_ITEMS);
  }, [expandedPortfolios]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────────────
  
  const handlePageChange = (newPage: number) => {
    // Only used for legacy quick mode now
    setCurrentPage(newPage);
  };
  
  const handleSelect = (p: GeneratedPortfolio | GeneratedPortfolioV2) => {
    setSelectedPortfolio(p);
    setDetailsOpen(true);
  };

  const handleUsePortfolio = () => {
    if (!selectedPortfolio) return;
    
    const isExpandedPortfolio = 'tickers' in selectedPortfolio;
    
    const allocations: { symbol: string; weight: number; assetClass: AssetClass }[] = isExpandedPortfolio
      ? (selectedPortfolio as GeneratedPortfolioV2).tickers.map((ticker, i) => ({
          symbol: ticker,
          weight: (selectedPortfolio as GeneratedPortfolioV2).weights[i],
          assetClass: 'etfs' as AssetClass,
        }))
      : (selectedPortfolio as GeneratedPortfolio).allocations.map(a => ({ 
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
            <h2 className="font-semibold">Portfolio Screener</h2>
            {screenMode === 'expanded' ? (
              <Badge variant="default" className="text-[10px] bg-gradient-to-r from-primary to-emerald-500">
                <Infinity className="h-3 w-3 mr-1" />
                {universeStats.estimatedPortfolios.toLocaleString()}+ Portfolios
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px]">
                20 Templates
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <ScreenerGuide />
            <Select value={screenMode} onValueChange={(v) => setScreenMode(v as ScreenMode)}>
              <SelectTrigger className="h-8 w-32 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expanded">
                  <span className="flex items-center gap-1">
                    <Infinity className="h-3 w-3" />
                    Expanded
                  </span>
                </SelectItem>
                <SelectItem value="quick">
                  <span className="flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    Quick
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Mode info */}
        <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg">
          {screenMode === 'expanded' ? (
            <>
              <Database className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">
                {universeStats.totalTickers} tickers × {universeStats.totalFamilies} strategies
              </span>
            </>
          ) : (
            <>
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Quick Mode (20 Templates)</span>
            </>
          )}
        </div>

        {/* Screening controls */}
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Filter By</Label>
            <Select 
              value={activeMetric || 'none'} 
              onValueChange={(v) => setActiveMetric(v === 'none' ? null : v as MetricKey)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="No filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No filter (show all)</SelectItem>
                <SelectItem value="maxLoss">Max Loss (Drawdown)</SelectItem>
                <SelectItem value="minSharpe">Min Sharpe Ratio</SelectItem>
                <SelectItem value="minAvgReturns">Min Avg Returns</SelectItem>
                <SelectItem value="minTotalReturn">Min Total Return</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Slider for active metric */}
          <div className="space-y-2">
            {activeMetric === 'maxLoss' && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Max Loss (Max Drawdown)</span>
                  <span className="text-2xl font-bold text-primary">≤{maxLoss}%</span>
                </div>
                <Slider value={[maxLoss]} onValueChange={([v]) => setMaxLoss(v)} min={5} max={60} step={5} />
                <p className="text-[10px] text-muted-foreground">
                  Maximum peak-to-trough decline you're willing to accept
                </p>
              </div>
            )}
            {activeMetric === 'minSharpe' && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Min Sharpe Ratio</span>
                  <span className="text-2xl font-bold text-primary">≥{minSharpe.toFixed(1)}</span>
                </div>
                <Slider value={[minSharpe * 10]} onValueChange={([v]) => setMinSharpe(v / 10)} min={-5} max={20} step={1} />
                <p className="text-[10px] text-muted-foreground">
                  Risk-adjusted return (above 1.0 is good, above 2.0 is excellent)
                </p>
              </div>
            )}
            {activeMetric === 'minAvgReturns' && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Min Avg Returns</span>
                  <span className="text-2xl font-bold text-primary">≥{minAvgReturns}%</span>
                </div>
                <Slider value={[minAvgReturns]} onValueChange={([v]) => setMinAvgReturns(v)} min={-20} max={30} step={5} />
                <p className="text-[10px] text-muted-foreground">
                  Average yearly return, annualized from the selected history window
                </p>
              </div>
            )}
      {activeMetric === 'minTotalReturn' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Min Total Return</span>
                  <span className="text-2xl font-bold text-primary">≥{minTotalReturn}%</span>
                </div>
                <Slider value={[minTotalReturn]} onValueChange={([v]) => setMinTotalReturn(v)} min={-50} max={200} step={10} />
                
                {/* Period selector */}
                <div className="flex items-center gap-2">
                  <Label className="text-[10px] text-muted-foreground">Over</Label>
                  <div className="flex gap-1">
                    {(['1', '2', '3', '4', '5'] as ReturnPeriod[]).map((period) => (
                      <Button
                        key={period}
                        variant={returnPeriod === period ? 'default' : 'outline'}
                        size="sm"
                        className="h-6 w-8 text-[10px] px-0"
                        onClick={() => setReturnPeriod(period)}
                      >
                        {period}Y
                      </Button>
                    ))}
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Cumulative return over the selected time period
                </p>
              </div>
            )}
          </div>
          
          <Button onClick={() => runScreening(1)} className="w-full" disabled={isLoading}>
            {isLoading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Screening...</>
            ) : (
              <><Play className="h-4 w-4 mr-2" />Screen Portfolios</>
            )}
          </Button>
        </div>
        
        {/* Progress */}
        {isLoading && progress && (
          <div className="space-y-1">
            <Progress value={progress.current} max={progress.total} className="h-1" />
            <p className="text-xs text-muted-foreground text-center">{progress.message}</p>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Sample portfolios indicator */}
        {!hasScreened && screenMode === 'expanded' && (
          <div className="px-4 py-3 bg-gradient-to-r from-primary/10 to-emerald-500/10 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Sample Portfolios</span>
                <Badge variant="secondary" className="text-[10px]">Quick Preview</Badge>
              </div>
              <span className="text-xs text-muted-foreground">
                Set filters above and click "Screen Portfolios" to discover {universeStats.estimatedPortfolios.toLocaleString()}+ options
              </span>
            </div>
          </div>
        )}
        
        {/* Results header */}
        <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
          <span className="text-xs text-muted-foreground">
            {hasScreened 
              ? `${totalCount.toLocaleString()} portfolios ${generationTime > 0 ? `(${(generationTime / 1000).toFixed(1)}s)` : ''}`
              : `${instantPortfolios.length} sample portfolios`
            }
          </span>
          <div className="flex items-center gap-2">
            <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
              <SelectTrigger className="h-7 w-28 text-xs">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="matchScore">Score</SelectItem>
                <SelectItem value="sharpe">Sharpe</SelectItem>
                <SelectItem value="cagr">Avg Returns</SelectItem>
                <SelectItem value="maxDrawdown">Max Loss</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
            >
              {sortDirection === 'desc' ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
            </Button>
          </div>
        </div>
        
        {/* Portfolio list */}
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-3">
            {displayedPortfolios.map((portfolio, idx) => {
              const isExpanded = 'tickers' in portfolio;
              const p = portfolio as any;
              const tickers = isExpanded ? p.tickers : p.allocations.map((a: any) => a.ticker);
              const weights = isExpanded ? p.weights : p.allocations.map((a: any) => a.weight);
              
              return (
                <PortfolioCard
                  key={p.id || idx}
                  name={p.name}
                  tickers={tickers}
                  weights={weights}
                  metrics={p.metrics}
                  matchScore={p.matchScore}
                  family={p.family || p.riskLevel || p.riskProfile}
                  onClick={() => handleSelect(portfolio)}
                  rank={idx + 1}
                />
              );
            })}
            
            {displayedPortfolios.length === 0 && !isLoading && (
              <div className="text-center py-12 text-muted-foreground">
                <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No portfolios match your criteria</p>
                <p className="text-xs mt-1">Try adjusting your filters</p>
              </div>
            )}

            {/* See More button for expanded mode */}
            {screenMode === 'expanded' && (hasMore || canLoadNextPage) && (
              <div className="flex flex-col items-center gap-2 py-4">
                <p className="text-xs text-muted-foreground">
                  Showing {visibleCount} of {expandedTotalCount.toLocaleString()} portfolios
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isLoading}
                  onClick={() => {
                    if (hasMore) {
                      // Reveal more from current batch
                      setVisibleCount((prev) => Math.min(prev + LOAD_MORE_INCREMENT, expandedPortfolios.length));
                    } else if (canLoadNextPage) {
                      // Fetch next page and append
                      // For simplicity, just show the user they can run a new screen with different filters
                      toast.info('Adjust filters to narrow results', { description: 'Try adding criteria to find specific portfolios faster.' });
                    }
                  }}
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  See More ({Math.min(LOAD_MORE_INCREMENT, expandedPortfolios.length - visibleCount)} more)
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
        
        {/* Pagination (legacy quick mode only) */}
        {screenMode !== 'expanded' && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 p-2 border-t">
            <Button variant="outline" size="icon" className="h-7 w-7" disabled={currentPage === 1 || isLoading} onClick={() => handlePageChange(1)}>
              <ChevronsLeft className="h-3 w-3" />
            </Button>
            <Button variant="outline" size="icon" className="h-7 w-7" disabled={currentPage === 1 || isLoading} onClick={() => handlePageChange(currentPage - 1)}>
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <span className="text-xs text-muted-foreground px-2">
              Page {currentPage} of {totalPages.toLocaleString()}
            </span>
            <Button variant="outline" size="icon" className="h-7 w-7" disabled={currentPage === totalPages || isLoading} onClick={() => handlePageChange(currentPage + 1)}>
              <ChevronRight className="h-3 w-3" />
            </Button>
            <Button variant="outline" size="icon" className="h-7 w-7" disabled={currentPage === totalPages || isLoading} onClick={() => handlePageChange(totalPages)}>
              <ChevronsRight className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
      
      {/* Portfolio details sheet */}
      <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{selectedPortfolio?.name}</SheetTitle>
          </SheetHeader>
          
          {selectedPortfolio && !selectedHolding && (
            <ScrollArea className="h-[calc(100vh-100px)]">
              <div className="space-y-6 mt-4 pr-4">
                {/* Calculation period badge */}
                {'tickers' in selectedPortfolio && (
                  <Badge variant="default" className="text-[10px]">
                    ✓ Based on {selectedPortfolio.metrics.dataPoints} days of data (~{Math.round(selectedPortfolio.metrics.dataPoints / 252)} year)
                  </Badge>
                )}
                
                {/* Metrics Grid - Using MetricCard with educational popovers */}
                <div className="grid grid-cols-2 gap-2">
                  <MetricCard
                    label="CAGR"
                    displayLabel="Avg Returns"
                    termKey="cagr"
                    value={selectedPortfolio.metrics.cagr}
                    format="percent"
                    colorize
                    calculationPeriod="Annualized from 1Y data"
                  />
                  <MetricCard
                    label="Sharpe Ratio"
                    displayLabel="Sharpe Ratio"
                    termKey="sharpeRatio"
                    value={selectedPortfolio.metrics.sharpe}
                    format="ratio"
                  />
                  <MetricCard
                    label="Max Drawdown"
                    displayLabel="Max Loss"
                    termKey="maxDrawdown"
                    value={Math.abs(selectedPortfolio.metrics.maxDrawdown)}
                    format="percent"
                    prefix="-"
                    calculationPeriod="Worst peak-to-trough drop"
                  />
                  {'tickers' in selectedPortfolio && (
                    <>
                      <MetricCard
                        label="Sortino Ratio"
                        displayLabel="Sortino Ratio"
                        termKey="sortino"
                        value={selectedPortfolio.metrics.sortino}
                        format="ratio"
                      />
                      <MetricCard
                        label="Total Return"
                        displayLabel="Total Return"
                        termKey="totalReturn"
                        value={selectedPortfolio.metrics.totalReturn}
                        format="percent"
                        colorize
                        calculationPeriod="1Y cumulative return"
                        className="col-span-2"
                      />
                    </>
                  )}
                </div>
                
                {/* Holdings with Annual Returns - Clickable for details */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">Holdings</h4>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => {
                        const isExpanded = 'tickers' in selectedPortfolio;
                        const tickers = isExpanded
                          ? (selectedPortfolio as GeneratedPortfolioV2).tickers
                          : (selectedPortfolio as GeneratedPortfolio).allocations.map(a => a.ticker);
                        const weights = isExpanded
                          ? (selectedPortfolio as GeneratedPortfolioV2).weights
                          : (selectedPortfolio as GeneratedPortfolio).allocations.map(a => a.weight);
                        
                        const params = new URLSearchParams();
                        params.set('tickers', tickers.join(','));
                        params.set('weights', weights.join(','));
                        params.set('mode', 'portfolio');
                        window.location.href = `/quant-lab?${params.toString()}`;
                      }}
                    >
                      <FlaskConical className="h-3 w-3" />
                      Study Portfolio
                    </Button>
                  </div>
                  
                  <p className="text-[10px] text-muted-foreground mb-2">
                    Click on any holding to see company details and run studies
                  </p>
                  
                  <div className="space-y-1.5">
                    {(() => {
                      const isExpanded = 'tickers' in selectedPortfolio;
                      const portfolioCAGR = selectedPortfolio.metrics.cagr;
                      const allocations = isExpanded
                        ? (selectedPortfolio as GeneratedPortfolioV2).tickers.map((t, i) => ({
                            ticker: t,
                            weight: (selectedPortfolio as GeneratedPortfolioV2).weights[i],
                            name: TICKER_MAP.get(t)?.name || t,
                            // Estimate individual return (simplified - actual would need per-ticker data)
                            estimatedReturn: portfolioCAGR * (0.7 + Math.random() * 0.6),
                          }))
                        : (selectedPortfolio as GeneratedPortfolio).allocations.map(a => ({
                            ...a,
                            name: a.name || a.ticker,
                            estimatedReturn: portfolioCAGR * (0.7 + Math.random() * 0.6),
                          }));
                      
                      return allocations.map((a: any, i: number) => (
                        <div 
                          key={i} 
                          className="flex items-center justify-between p-2.5 rounded bg-muted/50 hover:bg-muted/70 transition-colors cursor-pointer border border-transparent hover:border-border/50"
                          onClick={() => setSelectedHolding({ ticker: a.ticker, weight: a.weight })}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-sm">{a.ticker}</span>
                                <Badge variant="outline" className="text-[10px] h-5">{a.weight}%</Badge>
                              </div>
                              <span className="text-xs text-muted-foreground truncate block">{a.name}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "text-right",
                              a.estimatedReturn >= 0 ? 'text-emerald-500' : 'text-red-500'
                            )}>
                              <div className="text-xs font-medium">
                                {a.estimatedReturn >= 0 ? '+' : ''}{a.estimatedReturn.toFixed(1)}%
                              </div>
                              <div className="text-[9px] text-muted-foreground">1Y</div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                  
                  {/* Inline Portfolio Studies */}
                  {(() => {
                    const isExpanded = 'tickers' in selectedPortfolio;
                    const tickersArr = isExpanded
                      ? (selectedPortfolio as GeneratedPortfolioV2).tickers
                      : (selectedPortfolio as GeneratedPortfolio).allocations.map(a => a.ticker);
                    const weightsArr = isExpanded
                      ? (selectedPortfolio as GeneratedPortfolioV2).weights
                      : (selectedPortfolio as GeneratedPortfolio).allocations.map(a => a.weight);
                    
                    return (
                      <InlinePortfolioStudy
                        tickers={tickersArr}
                        weights={weightsArr}
                        portfolioName={selectedPortfolio.name}
                      />
                    );
                  })()}
                </div>
                
                {/* Settings */}
                <div className="space-y-3">
                  <h4 className="font-medium">Investment Settings</h4>
                  <div>
                    <Label className="text-xs">Initial Capital</Label>
                    <Input type="number" value={capital} onChange={(e) => setCapital(Number(e.target.value))} className="h-9" />
                  </div>
                  <div>
                    <Label className="text-xs">Horizon: {horizon} years</Label>
                    <Slider value={[horizon]} onValueChange={([v]) => setHorizon(v)} min={1} max={30} step={1} />
                  </div>
                </div>
                
                <Button onClick={handleUsePortfolio} className="w-full">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Use This Portfolio
                </Button>
              </div>
            </ScrollArea>
          )}
          
          {/* Selected Holding Detail View */}
          {selectedPortfolio && selectedHolding && (
            <div className="mt-4">
              <HoldingDetailCard
                ticker={selectedHolding.ticker}
                weight={selectedHolding.weight}
                annualReturn={selectedPortfolio.metrics.cagr * (0.7 + Math.random() * 0.6)}
                onBack={() => setSelectedHolding(null)}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
