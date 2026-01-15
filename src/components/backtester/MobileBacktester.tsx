/**
 * Mobile-First Portfolio Backtester
 * 
 * Three-tab layout:
 * - Settings: Date range, capital, max drawdown
 * - Portfolio: Ticker search and allocation (center)
 * - Templates: Pre-built portfolio templates
 */

import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
  ComposedChart,
  Bar,
  Line,
} from 'recharts';
import {
  Plus,
  Play,
  TrendingDown,
  Activity,
  BarChart3,
  Scale,
  Search,
  Loader2,
  X,
  ChevronRight,
  LayoutGrid,
  Layers,
  Info,
  DollarSign,
  Wallet,
  Calendar,
  Shield,
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
  calculateVaR,
  calculateCVaR,
  calculateBetaAlpha,
  arithmeticMean,
} from '@/services/portfolioMetricsService';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface Asset {
  symbol: string;
  name?: string;
  weight: number;
  color: string;
}

interface BacktestResult {
  dates: string[];
  portfolioValues: number[];
  benchmarkValues: number[];
  dailyReturns: number[];
  benchmarkReturns: number[];
  drawdownSeries: number[];
  metrics: {
    totalReturn: number;
    cagr: number;
    volatility: number;
    sharpeRatio: number;
    sortinoRatio: number;
    maxDrawdown: number;
    beta: number;
    alpha: number;
    var95: number;
    cvar95: number;
    calmarRatio: number;
    bestYear: number;
    worstYear: number;
    positiveYears: number;
    avgMonthlyReturn: number;
    bestMonth: number;
    worstMonth: number;
  };
  yearlyReturns: { year: number; return: number; benchmark: number }[];
  monthlyReturns: { month: string; return: number }[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const PERIODS = [
  { value: '1Y', label: '1 Year', years: 1 },
  { value: '3Y', label: '3 Years', years: 3 },
  { value: '5Y', label: '5 Years', years: 5 },
  { value: '10Y', label: '10 Years', years: 10 },
  { value: 'MAX', label: 'Max Available', years: 30 },
];

const BENCHMARKS = [
  { value: 'SPY', label: 'S&P 500 (SPY)' },
  { value: 'QQQ', label: 'NASDAQ 100 (QQQ)' },
  { value: 'VTI', label: 'Total Market (VTI)' },
  { value: 'AGG', label: 'Bonds (AGG)' },
  { value: 'NONE', label: 'No Benchmark' },
];

const POPULAR_ETFS = [
  { symbol: 'VTI', name: 'Total Stock Market', category: 'US' },
  { symbol: 'VOO', name: 'S&P 500', category: 'US' },
  { symbol: 'QQQ', name: 'NASDAQ 100', category: 'US' },
  { symbol: 'VGT', name: 'Technology', category: 'Sector' },
  { symbol: 'VXUS', name: 'International', category: 'Intl' },
  { symbol: 'VWO', name: 'Emerging Mkts', category: 'Intl' },
  { symbol: 'BND', name: 'Total Bond', category: 'Bond' },
  { symbol: 'TLT', name: 'Long Treasury', category: 'Bond' },
  { symbol: 'GLD', name: 'Gold', category: 'Cmdty' },
  { symbol: 'VNQ', name: 'Real Estate', category: 'REIT' },
  { symbol: 'SCHD', name: 'Dividend', category: 'Div' },
  { symbol: 'IEF', name: 'Med Treasury', category: 'Bond' },
];

const COLORS = [
  'hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 
  'hsl(var(--chart-4))', 'hsl(var(--chart-5))',
  '#06b6d4', '#ec4899', '#f97316', '#14b8a6', '#6366f1',
];

const TEMPLATES = [
  { name: '60/40 Classic', description: 'Traditional balanced portfolio', assets: [{ symbol: 'VTI', weight: 60 }, { symbol: 'BND', weight: 40 }] },
  { name: 'Three-Fund', description: 'Bogleheads favorite', assets: [{ symbol: 'VTI', weight: 50 }, { symbol: 'VXUS', weight: 30 }, { symbol: 'BND', weight: 20 }] },
  { name: 'All-Weather', description: 'Ray Dalio inspired', assets: [{ symbol: 'VTI', weight: 30 }, { symbol: 'TLT', weight: 40 }, { symbol: 'IEF', weight: 15 }, { symbol: 'GLD', weight: 15 }] },
  { name: 'Growth Tilt', description: 'Tech-heavy growth', assets: [{ symbol: 'VTI', weight: 40 }, { symbol: 'QQQ', weight: 30 }, { symbol: 'VGT', weight: 20 }, { symbol: 'BND', weight: 10 }] },
  { name: 'Income Focus', description: 'Dividend and bonds', assets: [{ symbol: 'SCHD', weight: 40 }, { symbol: 'BND', weight: 40 }, { symbol: 'VNQ', weight: 20 }] },
  { name: 'Global Diversified', description: 'Worldwide exposure', assets: [{ symbol: 'VTI', weight: 40 }, { symbol: 'VXUS', weight: 30 }, { symbol: 'BND', weight: 20 }, { symbol: 'GLD', weight: 10 }] },
  { name: 'Conservative', description: 'Low volatility focus', assets: [{ symbol: 'BND', weight: 50 }, { symbol: 'VTI', weight: 30 }, { symbol: 'GLD', weight: 10 }, { symbol: 'IEF', weight: 10 }] },
  { name: 'Aggressive Growth', description: 'Max equity exposure', assets: [{ symbol: 'QQQ', weight: 40 }, { symbol: 'VTI', weight: 30 }, { symbol: 'VGT', weight: 20 }, { symbol: 'VXUS', weight: 10 }] },
];

// Drawdown-based portfolio suggestions
const DRAWDOWN_PORTFOLIOS: Record<number, { name: string; description: string; assets: { symbol: string; weight: number }[] }> = {
  5: { name: 'Ultra Conservative', description: 'Treasury focused, minimal equity', assets: [{ symbol: 'BND', weight: 70 }, { symbol: 'IEF', weight: 20 }, { symbol: 'VTI', weight: 10 }] },
  10: { name: 'Conservative', description: 'Bond heavy with some growth', assets: [{ symbol: 'BND', weight: 50 }, { symbol: 'VTI', weight: 30 }, { symbol: 'GLD', weight: 10 }, { symbol: 'IEF', weight: 10 }] },
  15: { name: 'Moderate Conservative', description: 'Balanced with downside protection', assets: [{ symbol: 'VTI', weight: 40 }, { symbol: 'BND', weight: 40 }, { symbol: 'GLD', weight: 10 }, { symbol: 'VXUS', weight: 10 }] },
  20: { name: 'Balanced', description: 'Classic 60/40 with diversification', assets: [{ symbol: 'VTI', weight: 50 }, { symbol: 'BND', weight: 30 }, { symbol: 'VXUS', weight: 15 }, { symbol: 'GLD', weight: 5 }] },
  25: { name: 'Growth Tilt', description: 'Equity focused with some protection', assets: [{ symbol: 'VTI', weight: 55 }, { symbol: 'VXUS', weight: 20 }, { symbol: 'BND', weight: 15 }, { symbol: 'VNQ', weight: 10 }] },
  30: { name: 'Growth', description: 'Higher equity, accept volatility', assets: [{ symbol: 'VTI', weight: 50 }, { symbol: 'QQQ', weight: 20 }, { symbol: 'VXUS', weight: 20 }, { symbol: 'BND', weight: 10 }] },
  35: { name: 'Aggressive Growth', description: 'Max growth, significant swings ok', assets: [{ symbol: 'VTI', weight: 40 }, { symbol: 'QQQ', weight: 30 }, { symbol: 'VXUS', weight: 20 }, { symbol: 'VGT', weight: 10 }] },
  40: { name: 'Very Aggressive', description: 'Tech heavy, high risk tolerance', assets: [{ symbol: 'QQQ', weight: 40 }, { symbol: 'VTI', weight: 30 }, { symbol: 'VGT', weight: 20 }, { symbol: 'VXUS', weight: 10 }] },
  50: { name: 'Maximum Risk', description: 'Full equity, sector concentrated', assets: [{ symbol: 'QQQ', weight: 50 }, { symbol: 'VGT', weight: 30 }, { symbol: 'VTI', weight: 20 }] },
};

// ═══════════════════════════════════════════════════════════════════════════════
// METRIC CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const METRIC_INFO: Record<string, string> = {
  'CAGR': 'Compound Annual Growth Rate - your annualized return',
  'Sharpe': 'Risk-adjusted return (higher = better). Above 1 is good.',
  'Sortino': 'Like Sharpe but only penalizes downside risk',
  'Vol': 'Annualized volatility - how much the portfolio swings',
  'Beta': 'Market sensitivity. 1 = moves with market',
  'Alpha': 'Excess return vs benchmark. Positive = outperformance',
  'Max DD': 'Largest peak-to-trough decline',
  'VaR': 'Value at Risk - max daily loss at 95% confidence',
  'CVaR': 'Expected loss when VaR is exceeded',
};

function MetricPill({ 
  label, 
  value, 
  suffix = '', 
  trend,
  icon: Icon,
}: { 
  label: string; 
  value: string | number; 
  suffix?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ElementType;
}) {
  const info = METRIC_INFO[label];
  
  const content = (
    <div className={cn(
      "flex-shrink-0 px-3 py-2.5 rounded-xl bg-card border min-w-[100px] transition-colors",
      "hover:bg-muted/50 cursor-default"
    )}>
      <div className="flex items-center gap-1 mb-0.5">
        {Icon && <Icon className={cn(
          "h-3 w-3",
          trend === 'up' && "text-emerald-500",
          trend === 'down' && "text-destructive",
          trend === 'neutral' && "text-muted-foreground"
        )} />}
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          {label}
        </span>
        {info && <Info className="h-2.5 w-2.5 text-muted-foreground/50" />}
      </div>
      <p className={cn(
        "text-base font-bold font-mono leading-tight",
        trend === 'up' && "text-emerald-500",
        trend === 'down' && "text-destructive"
      )}>
        {typeof value === 'number' ? value.toFixed(value < 10 ? 2 : 1) : value}{suffix}
      </p>
    </div>
  );

  if (!info) return content;

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          {content}
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[200px] text-xs">
          {info}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function MobileBacktester() {
  // Portfolio state
  const [assets, setAssets] = useState<Asset[]>([
    { symbol: 'VTI', weight: 60, color: COLORS[0] },
    { symbol: 'BND', weight: 40, color: COLORS[1] },
  ]);
  const [newSymbol, setNewSymbol] = useState('');
  
  // Max drawdown dial state
  const [maxDrawdownTarget, setMaxDrawdownTarget] = useState(20);
  
  // Config state
  const [period, setPeriod] = useState('5Y');
  const [benchmark, setBenchmark] = useState('SPY');
  const [initialCapital, setInitialCapital] = useState(100000);
  
  // UI state - two tabs: portfolio, templates
  const [activeTab, setActiveTab] = useState<'portfolio' | 'templates'>('portfolio');
  const [showResults, setShowResults] = useState(false);
  
  // Results state
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Computed
  const totalWeight = useMemo(() => assets.reduce((sum, a) => sum + a.weight, 0), [assets]);
  const isValid = Math.abs(totalWeight - 100) < 0.1;

  // Suggested portfolio based on drawdown target
  const suggestedPortfolio = useMemo(() => {
    const thresholds = [5, 10, 15, 20, 25, 30, 35, 40, 50];
    const closest = thresholds.reduce((prev, curr) => 
      Math.abs(curr - maxDrawdownTarget) < Math.abs(prev - maxDrawdownTarget) ? curr : prev
    );
    return DRAWDOWN_PORTFOLIOS[closest];
  }, [maxDrawdownTarget]);

  // Apply suggested portfolio
  const applySuggestedPortfolio = () => {
    if (!suggestedPortfolio) return;
    setAssets(suggestedPortfolio.assets.map((a, i) => ({
      ...a,
      color: COLORS[i % COLORS.length],
    })));
    setActiveTab('portfolio');
    toast.success(`Applied ${suggestedPortfolio.name}`);
  };

  // Risk color based on drawdown target
  const getRiskColor = (dd: number) => {
    if (dd <= 10) return 'text-emerald-500';
    if (dd <= 20) return 'text-yellow-500';
    if (dd <= 30) return 'text-orange-500';
    return 'text-destructive';
  };

  const getRiskGradient = (dd: number) => {
    if (dd <= 10) return 'from-emerald-500/20 to-emerald-500/5';
    if (dd <= 20) return 'from-yellow-500/20 to-yellow-500/5';
    if (dd <= 30) return 'from-orange-500/20 to-orange-500/5';
    return 'from-destructive/20 to-destructive/5';
  };

  // Add asset
  const addAsset = (symbol: string) => {
    const s = symbol.toUpperCase().trim();
    if (!s || assets.find(a => a.symbol === s)) return;
    
    const etf = POPULAR_ETFS.find(e => e.symbol === s);
    setAssets([...assets, {
      symbol: s,
      name: etf?.name,
      weight: 0,
      color: COLORS[assets.length % COLORS.length],
    }]);
    setNewSymbol('');
    toast.success(`Added ${s}`);
  };

  // Remove asset
  const removeAsset = (symbol: string) => {
    setAssets(assets.filter(a => a.symbol !== symbol));
  };

  // Update weight
  const updateWeight = (symbol: string, weight: number) => {
    setAssets(assets.map(a => a.symbol === symbol ? { ...a, weight } : a));
  };

  // Equal weight
  const equalizeWeights = () => {
    const w = Math.round((100 / assets.length) * 10) / 10;
    setAssets(assets.map(a => ({ ...a, weight: w })));
  };

  // Load template
  const loadTemplate = (template: typeof TEMPLATES[0]) => {
    setAssets(template.assets.map((a, i) => ({
      ...a,
      color: COLORS[i % COLORS.length],
    })));
    setActiveTab('portfolio');
    toast.success(`Loaded ${template.name}`);
  };

  // Run backtest
  const runBacktest = useCallback(async () => {
    if (!isValid) {
      toast.error('Weights must sum to 100%');
      return;
    }
    
    setIsLoading(true);
    setShowResults(true);
    
    try {
      const endDate = new Date();
      const startDate = new Date();
      const years = PERIODS.find(p => p.value === period)?.years || 5;
      startDate.setFullYear(endDate.getFullYear() - years);
      
      const startStr = startDate.toISOString().split('T')[0];
      const endStr = endDate.toISOString().split('T')[0];
      
      // Fetch data for all assets
      const assetData: Record<string, { date: string; return: number }[]> = {};
      
      for (const asset of assets) {
        const { data, error } = await supabase
          .from('market_daily_bars')
          .select('bar_date, daily_return')
          .eq('ticker', asset.symbol)
          .gte('bar_date', startStr)
          .lte('bar_date', endStr)
          .order('bar_date', { ascending: true });
        
        if (!error && data) {
          assetData[asset.symbol] = data.map(d => ({
            date: d.bar_date,
            return: d.daily_return || 0,
          }));
        }
      }
      
      // Fetch benchmark
      let benchmarkData: { date: string; return: number }[] = [];
      if (benchmark !== 'NONE') {
        const { data } = await supabase
          .from('market_daily_bars')
          .select('bar_date, daily_return')
          .eq('ticker', benchmark)
          .gte('bar_date', startStr)
          .lte('bar_date', endStr)
          .order('bar_date', { ascending: true });
        
        if (data) {
          benchmarkData = data.map(d => ({ date: d.bar_date, return: d.daily_return || 0 }));
        }
      }
      
      // Find common dates
      const allDateSets = Object.values(assetData).map(d => new Set(d.map(x => x.date)));
      if (benchmarkData.length > 0) allDateSets.push(new Set(benchmarkData.map(d => d.date)));
      
      const commonDates = [...allDateSets[0]].filter(date =>
        allDateSets.every(set => set.has(date))
      ).sort();
      
      if (commonDates.length < 20) {
        toast.error('Insufficient data');
        setIsLoading(false);
        return;
      }
      
      // Index data
      const indexed: Record<string, Record<string, number>> = {};
      for (const [symbol, data] of Object.entries(assetData)) {
        indexed[symbol] = {};
        for (const d of data) indexed[symbol][d.date] = d.return;
      }
      const indexedBm: Record<string, number> = {};
      for (const d of benchmarkData) indexedBm[d.date] = d.return;
      
      // Calculate values
      const portfolioValues: number[] = [initialCapital];
      const benchmarkValues: number[] = [initialCapital];
      const dailyReturns: number[] = [];
      const benchmarkReturns: number[] = [];
      const dates: string[] = [commonDates[0]];
      
      for (let i = 1; i < commonDates.length; i++) {
        const date = commonDates[i];
        
        let portfolioReturn = 0;
        for (const asset of assets) {
          portfolioReturn += (indexed[asset.symbol]?.[date] || 0) * (asset.weight / 100);
        }
        
        dailyReturns.push(portfolioReturn);
        portfolioValues.push(portfolioValues[portfolioValues.length - 1] * (1 + portfolioReturn));
        
        const bmReturn = indexedBm[date] || 0;
        benchmarkReturns.push(bmReturn);
        benchmarkValues.push(benchmarkValues[benchmarkValues.length - 1] * (1 + bmReturn));
        
        dates.push(date);
      }
      
      // Calculate metrics
      const totalYears = commonDates.length / 252;
      const totalReturn = ((portfolioValues[portfolioValues.length - 1] - initialCapital) / initialCapital) * 100;
      const cagr = calculateCAGR(initialCapital, portfolioValues[portfolioValues.length - 1], totalYears) * 100;
      const volatility = annualizedVolatility(dailyReturns) * 100;
      const sharpeRatio = calculateSharpeRatio(dailyReturns, 0.05);
      const sortinoRatio = calculateSortinoRatio(dailyReturns, 0.05);
      const { maxDrawdownPercent, drawdownSeries } = calculateMaxDrawdown(portfolioValues);
      const var95 = calculateVaR(dailyReturns, 0.95);
      const cvar95 = calculateCVaR(dailyReturns, 0.95);
      const { beta, alpha } = calculateBetaAlpha(dailyReturns, benchmarkReturns, 0.05);
      const calmarRatio = maxDrawdownPercent > 0 ? cagr / maxDrawdownPercent : 0;
      
      // Yearly returns
      const yearMap: Record<number, { p: number[]; b: number[] }> = {};
      for (let i = 0; i < dates.length; i++) {
        const year = new Date(dates[i]).getFullYear();
        if (!yearMap[year]) yearMap[year] = { p: [], b: [] };
        if (i > 0) {
          yearMap[year].p.push(dailyReturns[i - 1]);
          yearMap[year].b.push(benchmarkReturns[i - 1]);
        }
      }
      
      const yearlyReturns = Object.entries(yearMap).map(([year, data]) => ({
        year: parseInt(year),
        return: (data.p.reduce((acc, r) => acc * (1 + r), 1) - 1) * 100,
        benchmark: (data.b.reduce((acc, r) => acc * (1 + r), 1) - 1) * 100,
      }));
      
      // Monthly returns
      const monthMap: Record<string, number[]> = {};
      for (let i = 0; i < dates.length - 1; i++) {
        const key = dates[i].slice(0, 7);
        if (!monthMap[key]) monthMap[key] = [];
        monthMap[key].push(dailyReturns[i]);
      }
      
      const monthlyReturns = Object.entries(monthMap).map(([month, returns]) => ({
        month,
        return: (returns.reduce((acc, r) => acc * (1 + r), 1) - 1) * 100,
      }));
      
      const allMonthly = monthlyReturns.map(m => m.return);
      const allYearly = yearlyReturns.map(y => y.return);
      
      setResult({
        dates,
        portfolioValues,
        benchmarkValues,
        dailyReturns,
        benchmarkReturns,
        drawdownSeries,
        metrics: {
          totalReturn,
          cagr,
          volatility,
          sharpeRatio,
          sortinoRatio,
          maxDrawdown: maxDrawdownPercent,
          beta,
          alpha: alpha * 100,
          var95,
          cvar95,
          calmarRatio,
          bestYear: Math.max(...allYearly),
          worstYear: Math.min(...allYearly),
          positiveYears: (allYearly.filter(r => r > 0).length / allYearly.length) * 100,
          avgMonthlyReturn: arithmeticMean(allMonthly),
          bestMonth: Math.max(...allMonthly),
          worstMonth: Math.min(...allMonthly),
        },
        yearlyReturns,
        monthlyReturns,
      });
      
      toast.success('Backtest complete');
    } catch (error) {
      console.error(error);
      toast.error('Backtest failed');
    } finally {
      setIsLoading(false);
    }
  }, [assets, period, benchmark, initialCapital, isValid]);

  // Chart data
  const chartData = useMemo(() => {
    if (!result) return [];
    return result.dates.map((date, i) => ({
      date,
      portfolio: result.portfolioValues[i],
      benchmark: result.benchmarkValues[i],
      drawdown: result.drawdownSeries[i],
    }));
  }, [result]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // RESULTS VIEW
  // ═══════════════════════════════════════════════════════════════════════════════

  if (showResults && result) {
    return (
      <div className="flex flex-col h-[100dvh] bg-background">
        {/* Results Header */}
        <header className="flex-shrink-0 px-4 py-3 border-b bg-background/95 backdrop-blur">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowResults(false)}>
                ← Back
              </Button>
              <h1 className="font-semibold">Results</h1>
            </div>
            <Badge variant="secondary" className="font-mono">
              {PERIODS.find(p => p.value === period)?.label}
            </Badge>
          </div>
        </header>

        {/* Results Content */}
        <div className="flex-1 flex flex-col min-h-0 overflow-auto">
          {/* Key metrics cards */}
          <div className="flex-shrink-0 px-4 pt-4">
            <div className="grid grid-cols-2 gap-3">
              <Card className={cn(
                "p-3",
                result.metrics.totalReturn >= 0 
                  ? "bg-emerald-500/10 border-emerald-500/30" 
                  : "bg-destructive/10 border-destructive/30"
              )}>
                <div className="flex items-center gap-1.5 mb-0.5">
                  {result.metrics.totalReturn >= 0 ? (
                    <Activity className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-destructive" />
                  )}
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Total Return
                  </span>
                </div>
                <p className={cn(
                  "text-2xl font-bold font-mono",
                  result.metrics.totalReturn >= 0 ? "text-emerald-500" : "text-destructive"
                )}>
                  {result.metrics.totalReturn >= 0 ? '+' : ''}{result.metrics.totalReturn.toFixed(1)}%
                </p>
              </Card>
              
              <Card className="p-3 bg-destructive/10 border-destructive/30">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <TrendingDown className="h-4 w-4 text-destructive" />
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Max Drawdown
                  </span>
                </div>
                <p className="text-2xl font-bold font-mono text-destructive">
                  -{result.metrics.maxDrawdown.toFixed(1)}%
                </p>
              </Card>
            </div>
          </div>

          {/* Scrollable metrics */}
          <ScrollArea className="flex-shrink-0 w-full">
            <div className="flex gap-2 px-4 py-3">
              <MetricPill 
                label="CAGR" 
                value={result.metrics.cagr} 
                suffix="%" 
                trend={result.metrics.cagr >= 0 ? 'up' : 'down'}
                icon={Calendar}
              />
              <MetricPill 
                label="Sharpe" 
                value={result.metrics.sharpeRatio} 
                trend={result.metrics.sharpeRatio >= 1 ? 'up' : result.metrics.sharpeRatio >= 0.5 ? 'neutral' : 'down'}
                icon={Activity}
              />
              <MetricPill 
                label="Sortino" 
                value={result.metrics.sortinoRatio}
                trend={result.metrics.sortinoRatio >= 1.5 ? 'up' : 'neutral'}
                icon={Shield}
              />
              <MetricPill 
                label="Vol" 
                value={result.metrics.volatility} 
                suffix="%"
                trend={result.metrics.volatility <= 15 ? 'up' : result.metrics.volatility <= 25 ? 'neutral' : 'down'}
                icon={Activity}
              />
              <MetricPill 
                label="Beta" 
                value={result.metrics.beta}
                trend="neutral"
              />
              <MetricPill 
                label="Alpha" 
                value={result.metrics.alpha} 
                suffix="%"
                trend={result.metrics.alpha > 0 ? 'up' : 'down'}
              />
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          {/* Chart */}
          <div className="flex-1 min-h-[300px] px-4 pb-4">
            <Card className="h-full">
              <CardContent className="p-2 h-full">
                <Tabs defaultValue="growth" className="h-full flex flex-col">
                  <TabsList className="flex-shrink-0 h-8 w-full grid grid-cols-3">
                    <TabsTrigger value="growth" className="text-xs">Growth</TabsTrigger>
                    <TabsTrigger value="drawdown" className="text-xs">Drawdown</TabsTrigger>
                    <TabsTrigger value="yearly" className="text-xs">Yearly</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="growth" className="flex-1 min-h-0 mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                          tickFormatter={(v) => new Date(v).getFullYear().toString()}
                          interval="preserveStartEnd"
                        />
                        <YAxis 
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                          width={45}
                        />
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--popover))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            fontSize: 12,
                          }}
                          formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                          labelFormatter={(label) => new Date(label).toLocaleDateString()}
                        />
                        <Area
                          type="monotone"
                          dataKey="benchmark"
                          stroke="hsl(var(--muted-foreground))"
                          strokeWidth={1}
                          fill="none"
                        />
                        <Area
                          type="monotone"
                          dataKey="portfolio"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          fill="url(#portfolioGrad)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </TabsContent>
                  
                  <TabsContent value="drawdown" className="flex-1 min-h-0 mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0.1}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                          tickFormatter={(v) => new Date(v).getFullYear().toString()}
                          interval="preserveStartEnd"
                        />
                        <YAxis 
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                          tickFormatter={(v) => `${v.toFixed(0)}%`}
                          domain={['auto', 0]}
                          width={40}
                        />
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--popover))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            fontSize: 12,
                          }}
                          formatter={(value: number) => [`${value.toFixed(2)}%`, 'Drawdown']}
                          labelFormatter={(label) => new Date(label).toLocaleDateString()}
                        />
                        <ReferenceLine y={-result.metrics.maxDrawdown} stroke="hsl(var(--destructive))" strokeDasharray="5 5" />
                        <Area
                          type="monotone"
                          dataKey="drawdown"
                          stroke="hsl(var(--destructive))"
                          fill="url(#ddGrad)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </TabsContent>
                  
                  <TabsContent value="yearly" className="flex-1 min-h-0 mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={result.yearlyReturns}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis 
                          dataKey="year" 
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                        />
                        <YAxis 
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                          tickFormatter={(v) => `${v.toFixed(0)}%`}
                          width={40}
                        />
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--popover))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            fontSize: 12,
                          }}
                          formatter={(value: number, name: string) => [
                            `${value.toFixed(1)}%`,
                            name === 'return' ? 'Portfolio' : 'Benchmark'
                          ]}
                        />
                        <ReferenceLine y={0} stroke="hsl(var(--border))" />
                        <Bar 
                          dataKey="return" 
                          fill="hsl(var(--primary))" 
                          radius={[4, 4, 0, 0]}
                          name="return"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="benchmark" 
                          stroke="hsl(var(--muted-foreground))" 
                          strokeWidth={2}
                          dot={false}
                          name="benchmark"
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Final value */}
          <div className="flex-shrink-0 px-4 pb-4">
            <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/30">
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Final Value</p>
                  <p className="text-xl font-bold font-mono">
                    ${result.portfolioValues[result.portfolioValues.length - 1].toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <p>from ${initialCapital.toLocaleString()}</p>
                  <p>{PERIODS.find(p => p.value === period)?.label}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // MAIN BUILD VIEW
  // ═══════════════════════════════════════════════════════════════════════════════

  return (
    <div className="flex flex-col h-[100dvh] bg-background">
      {/* Header with Run button */}
      <header className="flex-shrink-0 px-4 py-3 border-b bg-background/95 backdrop-blur">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h1 className="font-semibold">Backtester</h1>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Weight indicator */}
            <Badge variant={isValid ? 'secondary' : 'destructive'} className="font-mono text-xs">
              {totalWeight.toFixed(0)}%
            </Badge>
            
            {/* Run button in header */}
            <Button 
              onClick={runBacktest} 
              disabled={isLoading || !isValid || assets.length === 0}
              size="sm"
              className="gap-1.5"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Run
            </Button>
          </div>
        </div>
      </header>

      {/* Two-tab navigation */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex-1 flex flex-col min-h-0">
        <TabsList className="flex-shrink-0 mx-4 mt-3 grid grid-cols-2 h-9">
          <TabsTrigger value="portfolio" className="text-xs gap-1.5">
            <Wallet className="h-3.5 w-3.5" />
            Portfolio
          </TabsTrigger>
          <TabsTrigger value="templates" className="text-xs gap-1.5">
            <LayoutGrid className="h-3.5 w-3.5" />
            Templates
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════════════════════════════════
            PORTFOLIO TAB
        ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="portfolio" className="flex-1 flex flex-col min-h-0 mt-3 overflow-hidden">
          <div className="flex-1 flex flex-col overflow-auto px-4 pb-4">
            <div className="space-y-3">
              {/* Settings + Ticker Input in one card */}
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-3 space-y-3">
                  {/* Settings row */}
                  <div className="grid grid-cols-3 gap-3">
                    {/* Date Range */}
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">Period</label>
                      <Select value={period} onValueChange={setPeriod}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PERIODS.map(p => (
                            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Capital */}
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">Capital</label>
                      <div className="relative">
                        <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                        <Input
                          type="number"
                          value={initialCapital}
                          onChange={(e) => setInitialCapital(Number(e.target.value))}
                          className="h-8 text-xs pl-6 font-mono"
                        />
                      </div>
                    </div>
                    
                    {/* Benchmark */}
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">Benchmark</label>
                      <Select value={benchmark} onValueChange={setBenchmark}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {BENCHMARKS.map(b => (
                            <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {/* Divider */}
                  <div className="border-t border-border/50" />
                  
                  {/* Ticker input */}
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={newSymbol}
                        onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === 'Enter' && addAsset(newSymbol)}
                        placeholder="Enter ticker symbol..."
                        className="pl-9 h-11 text-base"
                      />
                    </div>
                    <Button onClick={() => addAsset(newSymbol)} disabled={!newSymbol} className="h-11 px-4">
                      <Plus className="h-5 w-5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Quick add pills */}
              <ScrollArea className="w-full">
                <div className="flex gap-1.5 pb-2">
                  {POPULAR_ETFS.filter(e => !assets.find(a => a.symbol === e.symbol)).slice(0, 10).map((etf) => (
                    <button
                      key={etf.symbol}
                      onClick={() => addAsset(etf.symbol)}
                      className="flex-shrink-0 px-2.5 py-1.5 text-xs rounded-full border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <span className="font-mono font-medium">{etf.symbol}</span>
                      <span className="text-muted-foreground ml-1">{etf.name}</span>
                    </button>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>

              {/* Toolbar */}
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-sm text-muted-foreground">
                  Your Portfolio ({assets.length} assets)
                </h3>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-7 gap-1.5 text-xs"
                  onClick={equalizeWeights}
                  disabled={assets.length === 0}
                >
                  <Scale className="h-3 w-3" />
                  Equal Weight
                </Button>
              </div>

              {/* Asset cards */}
              <div className="space-y-2">
                {assets.length === 0 ? (
                  <Card className="p-8 text-center">
                    <Layers className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                    <p className="text-muted-foreground text-sm">
                      No assets yet. Add tickers above or choose a template.
                    </p>
                  </Card>
                ) : (
                  assets.map((asset) => (
                    <div 
                      key={asset.symbol}
                      className="flex items-center gap-3 p-3 rounded-xl border bg-card"
                    >
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: asset.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold">{asset.symbol}</span>
                          <span className="text-xs text-muted-foreground truncate">
                            {asset.name}
                          </span>
                        </div>
                        <Slider
                          value={[asset.weight]}
                          onValueChange={([v]) => updateWeight(asset.symbol, v)}
                          max={100}
                          step={1}
                          className="mt-2"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm w-10 text-right">
                          {asset.weight.toFixed(0)}%
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => removeAsset(asset.symbol)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════
            TEMPLATES TAB
        ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="templates" className="flex-1 flex flex-col min-h-0 mt-3 overflow-hidden">
          <div className="flex-1 overflow-auto px-4 pb-4 space-y-2">
              {TEMPLATES.map((template) => (
                <button
                  key={template.name}
                  onClick={() => loadTemplate(template)}
                  className="w-full p-4 rounded-xl border bg-card text-left hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-medium">{template.name}</span>
                      <p className="text-xs text-muted-foreground">{template.description}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {template.assets.map((a) => (
                      <Badge key={a.symbol} variant="secondary" className="text-xs font-mono">
                        {a.symbol} {a.weight}%
                      </Badge>
                    ))}
                  </div>
                </button>
              ))}
            </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default MobileBacktester;
