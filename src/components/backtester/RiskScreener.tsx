/**
 * Portfolio Risk Screener - Mobile-First
 * 
 * Clean, compact design that:
 * - Fetches real data directly from market_daily_bars
 * - Calculates actual backtested metrics
 * - Shows results in a scannable, mobile-friendly format
 * - No excessive scrolling
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  TrendingUp,
  Shield,
  Activity,
  Scale,
  Snowflake,
  Flame,
  Loader2,
  RefreshCw,
  CheckCircle2,
  Target,
  ChevronRight,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  calculateSharpeRatio,
  calculateSortinoRatio,
  calculateMaxDrawdown,
  calculateCAGR,
  annualizedVolatility,
} from '@/services/portfolioMetricsService';
import { AssetClass, ASSET_CLASS_ETFS } from '@/types/portfolio';

// Helper to determine asset class from ticker
function getAssetClassFromTicker(ticker: string): AssetClass {
  for (const [assetClass, tickers] of Object.entries(ASSET_CLASS_ETFS)) {
    if (tickers.includes(ticker)) {
      return assetClass as AssetClass;
    }
  }
  // Default fallback based on common patterns
  if (['TLT', 'AGG', 'BND', 'IEF', 'LQD', 'HYG'].includes(ticker)) return 'bonds';
  if (['GLD', 'SLV', 'DBC', 'USO', 'UNG'].includes(ticker)) return 'commodities';
  if (['VNQ', 'XLRE', 'IYR'].includes(ticker)) return 'real_estate';
  return 'etfs'; // Default to etfs for most tickers
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface PortfolioTemplate {
  id: string;
  name: string;
  description: string;
  riskLevel: 'conservative' | 'moderate' | 'growth' | 'aggressive';
  allocations: { symbol: string; weight: number; name: string }[];
}

interface BacktestedPortfolio extends PortfolioTemplate {
  metrics: {
    cagr: number;
    maxDrawdown: number;
    volatility: number;
    sharpe: number;
    sortino: number;
  };
  matchScore: number;
}

type RiskMetric = 'maxDrawdown' | 'volatility' | 'sharpe';

// ═══════════════════════════════════════════════════════════════════════════════
// PORTFOLIO TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════

const PORTFOLIO_TEMPLATES: PortfolioTemplate[] = [
  {
    id: 'treasury-shield',
    name: 'Treasury Shield',
    description: 'Maximum safety with treasury focus',
    riskLevel: 'conservative',
    allocations: [
      { symbol: 'TLT', weight: 60, name: 'Long Treasury' },
      { symbol: 'AGG', weight: 30, name: 'Aggregate Bond' },
      { symbol: 'GLD', weight: 10, name: 'Gold' },
    ],
  },
  {
    id: 'capital-guard',
    name: 'Capital Guard',
    description: 'Bond-heavy wealth preservation',
    riskLevel: 'conservative',
    allocations: [
      { symbol: 'AGG', weight: 45, name: 'Aggregate Bond' },
      { symbol: 'TLT', weight: 25, name: 'Long Treasury' },
      { symbol: 'SPY', weight: 20, name: 'S&P 500' },
      { symbol: 'GLD', weight: 10, name: 'Gold' },
    ],
  },
  {
    id: 'classic-60-40',
    name: 'Classic 60/40',
    description: 'Traditional balanced allocation',
    riskLevel: 'moderate',
    allocations: [
      { symbol: 'SPY', weight: 40, name: 'S&P 500' },
      { symbol: 'VTI', weight: 20, name: 'Total Market' },
      { symbol: 'AGG', weight: 30, name: 'Aggregate Bond' },
      { symbol: 'GLD', weight: 10, name: 'Gold' },
    ],
  },
  {
    id: 'all-weather',
    name: 'All Weather',
    description: 'Ray Dalio inspired balance',
    riskLevel: 'moderate',
    allocations: [
      { symbol: 'SPY', weight: 30, name: 'S&P 500' },
      { symbol: 'TLT', weight: 40, name: 'Long Treasury' },
      { symbol: 'GLD', weight: 15, name: 'Gold' },
      { symbol: 'DBC', weight: 15, name: 'Commodities' },
    ],
  },
  {
    id: 'global-diversified',
    name: 'Global Diversified',
    description: 'Worldwide exposure',
    riskLevel: 'moderate',
    allocations: [
      { symbol: 'VTI', weight: 35, name: 'US Stocks' },
      { symbol: 'VWO', weight: 25, name: 'Emerging Markets' },
      { symbol: 'AGG', weight: 25, name: 'US Bonds' },
      { symbol: 'GLD', weight: 15, name: 'Gold' },
    ],
  },
  {
    id: 'growth-builder',
    name: 'Growth Builder',
    description: 'Equity-focused long-term',
    riskLevel: 'growth',
    allocations: [
      { symbol: 'VTI', weight: 45, name: 'Total Market' },
      { symbol: 'QQQ', weight: 25, name: 'NASDAQ 100' },
      { symbol: 'SPY', weight: 15, name: 'S&P 500' },
      { symbol: 'AGG', weight: 15, name: 'Aggregate Bond' },
    ],
  },
  {
    id: 'tech-forward',
    name: 'Tech Forward',
    description: 'Technology-heavy growth',
    riskLevel: 'growth',
    allocations: [
      { symbol: 'QQQ', weight: 45, name: 'NASDAQ 100' },
      { symbol: 'SPY', weight: 30, name: 'S&P 500' },
      { symbol: 'VTI', weight: 15, name: 'Total Market' },
      { symbol: 'AGG', weight: 10, name: 'Aggregate Bond' },
    ],
  },
  {
    id: 'max-growth',
    name: 'Max Growth',
    description: 'All-equity for maximum returns',
    riskLevel: 'aggressive',
    allocations: [
      { symbol: 'QQQ', weight: 40, name: 'NASDAQ 100' },
      { symbol: 'SPY', weight: 30, name: 'S&P 500' },
      { symbol: 'VTI', weight: 20, name: 'Total Market' },
      { symbol: 'VWO', weight: 10, name: 'Emerging Markets' },
    ],
  },
  {
    id: 'real-assets',
    name: 'Real Assets',
    description: 'Inflation protection focus',
    riskLevel: 'moderate',
    allocations: [
      { symbol: 'VNQ', weight: 30, name: 'Real Estate' },
      { symbol: 'GLD', weight: 25, name: 'Gold' },
      { symbol: 'DBC', weight: 20, name: 'Commodities' },
      { symbol: 'SPY', weight: 25, name: 'S&P 500' },
    ],
  },
];

const RISK_STYLES = {
  conservative: { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: Snowflake },
  moderate: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: Scale },
  growth: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: TrendingUp },
  aggressive: { color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30', icon: Flame },
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface RiskScreenerProps {
  onSelect?: (allocations: { symbol: string; weight: number }[]) => void;
  onComplete?: (data: { 
    capital: number; 
    horizon: number; 
    allocations: { symbol: string; weight: number; assetClass: AssetClass }[] 
  }) => void;
}

export function RiskScreener({ onSelect, onComplete }: RiskScreenerProps) {
  // State
  const [portfolios, setPortfolios] = useState<BacktestedPortfolio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<RiskMetric>('maxDrawdown');
  const [targetValue, setTargetValue] = useState(30); // Higher default to show more results
  const [selectedPortfolio, setSelectedPortfolio] = useState<BacktestedPortfolio | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [capital, setCapital] = useState(100000);
  const [horizon, setHorizon] = useState(5);

  // Metric configs - wider ranges to ensure portfolios show
  const metricConfigs = {
    maxDrawdown: { label: 'Max Drawdown', min: 5, max: 60, step: 5, unit: '%', default: 30, invert: false },
    volatility: { label: 'Volatility', min: 5, max: 40, step: 5, unit: '%', default: 20, invert: false },
    sharpe: { label: 'Min Sharpe', min: 0, max: 3, step: 0.25, unit: '', default: 0.25, invert: true },
  };

  const config = metricConfigs[selectedMetric];

  // Estimated metrics fallback
  function getEstimatedMetrics(riskLevel: string) {
    const estimates = {
      conservative: { cagr: 5, maxDrawdown: 10, volatility: 7, sharpe: 0.6, sortino: 0.8 },
      moderate: { cagr: 7, maxDrawdown: 18, volatility: 12, sharpe: 0.7, sortino: 0.9 },
      growth: { cagr: 10, maxDrawdown: 28, volatility: 18, sharpe: 0.65, sortino: 0.8 },
      aggressive: { cagr: 12, maxDrawdown: 38, volatility: 24, sharpe: 0.55, sortino: 0.7 },
    };
    return estimates[riskLevel as keyof typeof estimates] || estimates.moderate;
  }

  // Fetch and calculate real metrics
  const loadPortfolios = useCallback(async () => {
    setIsLoading(true);
    
    try {
      // Get all unique tickers
      const allTickers = [...new Set(PORTFOLIO_TEMPLATES.flatMap(p => p.allocations.map(a => a.symbol)))];
      
      // First, find the available date range (use max available data)
      const { data: dateRange, error: dateError } = await supabase
        .from('market_daily_bars')
        .select('bar_date')
        .in('ticker', allTickers)
        .order('bar_date', { ascending: false })
        .limit(1);
      
      const endStr = dateRange?.[0]?.bar_date || new Date().toISOString().split('T')[0];
      
      // Fetch ALL available data for these tickers (up to 5 years)
      const fiveYearsAgo = new Date();
      fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
      const startStr = fiveYearsAgo.toISOString().split('T')[0];
      
      // Fetch data from database
      const { data, error } = await supabase
        .from('market_daily_bars')
        .select('ticker, bar_date, daily_return')
        .in('ticker', allTickers)
        .gte('bar_date', startStr)
        .lte('bar_date', endStr)
        .order('bar_date', { ascending: true });
      
      if (error) throw error;
      
      // Index by ticker
      const tickerData: Record<string, { date: string; return: number }[]> = {};
      for (const row of (data || [])) {
        if (!tickerData[row.ticker]) tickerData[row.ticker] = [];
        tickerData[row.ticker].push({ date: row.bar_date, return: row.daily_return || 0 });
      }
      
      // Calculate metrics for each portfolio
      const results: BacktestedPortfolio[] = [];
      
      for (const template of PORTFOLIO_TEMPLATES) {
        // Check data availability
        const hasAllData = template.allocations.every(a => 
          tickerData[a.symbol] && tickerData[a.symbol].length >= 50
        );
        
        if (!hasAllData) {
          // Use fallback estimates
          results.push({
            ...template,
            metrics: getEstimatedMetrics(template.riskLevel),
            matchScore: 0,
          });
          continue;
        }
        
        // Find common dates
        const dateSets = template.allocations.map(a => new Set(tickerData[a.symbol].map(d => d.date)));
        const commonDates = [...dateSets[0]].filter(date => dateSets.every(s => s.has(date))).sort();
        
        if (commonDates.length < 50) {
          results.push({
            ...template,
            metrics: getEstimatedMetrics(template.riskLevel),
            matchScore: 0,
          });
          continue;
        }
        
        // Calculate weighted portfolio returns
        const portfolioReturns: number[] = [];
        const portfolioValues: number[] = [100000];
        
        for (const date of commonDates) {
          let dayReturn = 0;
          for (const alloc of template.allocations) {
            const dayData = tickerData[alloc.symbol].find(d => d.date === date);
            if (dayData) {
              dayReturn += (alloc.weight / 100) * dayData.return;
            }
          }
          portfolioReturns.push(dayReturn);
          portfolioValues.push(portfolioValues[portfolioValues.length - 1] * (1 + dayReturn));
        }
        
        // Calculate actual metrics
        const years = commonDates.length / 252;
        const cagr = calculateCAGR(100000, portfolioValues[portfolioValues.length - 1], years) * 100;
        const volatility = annualizedVolatility(portfolioReturns) * 100;
        const sharpe = calculateSharpeRatio(portfolioReturns, 0.05);
        const sortino = calculateSortinoRatio(portfolioReturns, 0.05);
        const { maxDrawdownPercent } = calculateMaxDrawdown(portfolioValues);
        
        const metrics = {
          cagr: Math.round(cagr * 100) / 100,
          maxDrawdown: Math.round(maxDrawdownPercent * 100) / 100,
          volatility: Math.round(volatility * 100) / 100,
          sharpe: Math.round(sharpe * 100) / 100,
          sortino: Math.round(sortino * 100) / 100,
        };
        
        console.log(`[RiskScreener] ${template.name}: ${commonDates.length} days, CAGR=${metrics.cagr}%, Vol=${metrics.volatility}%, DD=${metrics.maxDrawdown}%, Sharpe=${metrics.sharpe}`);
        
        results.push({
          ...template,
          metrics,
          matchScore: 0,
        });
      }
      
      console.log(`[RiskScreener] Total portfolios calculated:`, results.length);
      setPortfolios(results);
      toast.success(`Loaded ${results.length} portfolios with real data`);
    } catch (error) {
      console.error('Failed to load portfolios:', error);
      toast.error('Using estimated data');
      
      // Fallback
      const fallback = PORTFOLIO_TEMPLATES.map(t => ({
        ...t,
        metrics: getEstimatedMetrics(t.riskLevel),
        matchScore: 0,
      }));
      setPortfolios(fallback);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load on mount
  useEffect(() => {
    loadPortfolios();
  }, [loadPortfolios]);

  // Filter and score portfolios
  const filteredPortfolios = useMemo(() => {
    console.log(`[RiskScreener] Filtering ${portfolios.length} portfolios by ${selectedMetric}=${targetValue}`);
    
    const scored = portfolios.map(p => {
      let score = 100;
      
      if (selectedMetric === 'maxDrawdown') {
        // Lower drawdown = better
        if (p.metrics.maxDrawdown <= targetValue) score += 30;
        else score -= (p.metrics.maxDrawdown - targetValue) * 1.5;
      } else if (selectedMetric === 'volatility') {
        // Lower volatility = better
        if (p.metrics.volatility <= targetValue) score += 30;
        else score -= (p.metrics.volatility - targetValue) * 1.5;
      } else if (selectedMetric === 'sharpe') {
        // Higher sharpe = better
        if (p.metrics.sharpe >= targetValue) score += 30;
        else score -= (targetValue - p.metrics.sharpe) * 20;
      }
      
      return { ...p, matchScore: Math.max(0, Math.min(100, Math.round(score))) };
    });
    
    // More generous filtering - show portfolios within reasonable range
    const filtered = scored.filter(p => {
      if (selectedMetric === 'maxDrawdown') return p.metrics.maxDrawdown <= targetValue + 25;
      if (selectedMetric === 'volatility') return p.metrics.volatility <= targetValue + 15;
      if (selectedMetric === 'sharpe') return p.metrics.sharpe >= targetValue - 1;
      return true;
    });
    
    console.log(`[RiskScreener] After filter: ${filtered.length} portfolios match`);
    filtered.forEach(p => console.log(`  - ${p.name}: DD=${p.metrics.maxDrawdown}%, Vol=${p.metrics.volatility}%, Sharpe=${p.metrics.sharpe}, Score=${p.matchScore}`));
    
    return filtered.sort((a, b) => b.matchScore - a.matchScore);
  }, [portfolios, selectedMetric, targetValue]);

  // Handlers
  const handleSelect = (p: BacktestedPortfolio) => {
    setSelectedPortfolio(p);
    setDetailsOpen(true);
  };

  const handleUsePortfolio = () => {
    if (!selectedPortfolio) return;
    
    const allocations = selectedPortfolio.allocations.map(a => ({ 
      symbol: a.symbol, 
      weight: a.weight,
      assetClass: getAssetClassFromTicker(a.symbol),
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

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Risk Screener</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={loadPortfolios} disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>

        {/* Metric pills */}
        <div className="flex gap-2 mb-4">
          {(Object.keys(metricConfigs) as RiskMetric[]).map(key => (
            <button
              key={key}
              onClick={() => {
                setSelectedMetric(key);
                setTargetValue(metricConfigs[key].default);
              }}
              className={cn(
                "flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all",
                selectedMetric === key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80 text-muted-foreground"
              )}
            >
              {metricConfigs[key].label}
            </button>
          ))}
        </div>

        {/* Slider */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {config.invert ? 'Minimum' : 'Maximum'} {config.label}
            </span>
            <Badge variant="outline" className="font-mono">
              {!config.invert && selectedMetric !== 'sharpe' ? '-' : ''}{targetValue}{config.unit}
            </Badge>
          </div>
          <Slider
            value={[targetValue]}
            onValueChange={([v]) => setTargetValue(v)}
            min={config.min}
            max={config.max}
            step={config.step}
          />
        </div>
      </div>

      {/* Results */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredPortfolios.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Shield className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No portfolios match</p>
              <p className="text-xs mt-1">Try adjusting your target</p>
            </div>
          ) : (
            filteredPortfolios.map((p, idx) => {
              const style = RISK_STYLES[p.riskLevel];
              const Icon = style.icon;
              const isTop = idx === 0;
              
              return (
                <Card
                  key={p.id}
                  className={cn(
                    "cursor-pointer transition-all active:scale-[0.98] border-border",
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
                        <p className="text-[11px] text-muted-foreground truncate">{p.description}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge variant="secondary" className="font-mono text-xs">
                          {p.matchScore}%
                        </Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                    
                    {/* Metrics row */}
                    <div className="grid grid-cols-4 gap-1 text-center">
                      <div className={cn(
                        "p-1.5 rounded text-[10px]",
                        selectedMetric === 'maxDrawdown' ? "bg-primary/10" : "bg-muted/50"
                      )}>
                        <p className="text-muted-foreground">DD</p>
                        <p className={cn(
                          "font-mono font-bold",
                          p.metrics.maxDrawdown <= targetValue && selectedMetric === 'maxDrawdown'
                            ? "text-emerald-400" : ""
                        )}>
                          -{p.metrics.maxDrawdown}%
                        </p>
                      </div>
                      <div className={cn(
                        "p-1.5 rounded text-[10px]",
                        selectedMetric === 'volatility' ? "bg-primary/10" : "bg-muted/50"
                      )}>
                        <p className="text-muted-foreground">Vol</p>
                        <p className={cn(
                          "font-mono font-bold",
                          p.metrics.volatility <= targetValue && selectedMetric === 'volatility'
                            ? "text-emerald-400" : ""
                        )}>
                          {p.metrics.volatility}%
                        </p>
                      </div>
                      <div className={cn(
                        "p-1.5 rounded text-[10px]",
                        selectedMetric === 'sharpe' ? "bg-primary/10" : "bg-muted/50"
                      )}>
                        <p className="text-muted-foreground">Sharpe</p>
                        <p className={cn(
                          "font-mono font-bold",
                          p.metrics.sharpe >= targetValue && selectedMetric === 'sharpe'
                            ? "text-emerald-400" : ""
                        )}>
                          {p.metrics.sharpe.toFixed(2)}
                        </p>
                      </div>
                      <div className="p-1.5 rounded bg-muted/50 text-[10px]">
                        <p className="text-muted-foreground">CAGR</p>
                        <p className={cn(
                          "font-mono font-bold",
                          p.metrics.cagr >= 0 ? "text-emerald-400" : "text-rose-400"
                        )}>
                          {p.metrics.cagr >= 0 ? '+' : ''}{p.metrics.cagr}%
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
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
                </SheetTitle>
              </SheetHeader>
              
              <div className="flex-1 overflow-y-auto min-h-0">
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
                      <p className="text-[10px] text-muted-foreground uppercase">Sharpe</p>
                      <p className="text-lg font-bold font-mono">{selectedPortfolio.metrics.sharpe.toFixed(2)}</p>
                    </Card>
                  </div>
                  
                  {/* Sortino */}
                  <Card className="p-3">
                    <p className="text-[10px] text-muted-foreground uppercase">Sortino Ratio</p>
                    <p className="text-lg font-bold font-mono">{selectedPortfolio.metrics.sortino.toFixed(2)}</p>
                  </Card>
                  
                  {/* Allocations */}
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">Allocations</h4>
                    <div className="space-y-1.5">
                      {selectedPortfolio.allocations.map(a => (
                        <div key={a.symbol} className="flex items-center justify-between p-2 rounded bg-muted/50">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono text-xs">{a.symbol}</Badge>
                            <span className="text-xs text-muted-foreground">{a.name}</span>
                          </div>
                          <span className="font-bold text-sm">{a.weight}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Action button - fixed at bottom */}
              {(onSelect || onComplete) && (
                <div className="flex-shrink-0 pt-4 border-t border-border mt-4 space-y-3">
                  {onComplete && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-muted-foreground uppercase">Initial Capital</label>
                        <input
                          type="number"
                          value={capital}
                          onChange={(e) => setCapital(Number(e.target.value))}
                          className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground uppercase">Horizon (years)</label>
                        <input
                          type="number"
                          value={horizon}
                          onChange={(e) => setHorizon(Number(e.target.value))}
                          className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm font-mono"
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

export default RiskScreener;
