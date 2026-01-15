/**
 * Traditional Portfolio Backtester
 * 
 * A comprehensive backtesting interface that allows users to:
 * 1. Manually build portfolios with any ticker symbols
 * 2. Find portfolios that match specific constraints (max drawdown, target return)
 * 3. View detailed historical performance analysis
 * 4. Compare against benchmarks
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  ReferenceLine,
  Legend,
  ComposedChart,
  Bar,
} from 'recharts';
import {
  Plus,
  Trash2,
  Play,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Shield,
  Target,
  Activity,
  BarChart3,
  Scale,
  AlertTriangle,
  CheckCircle2,
  Search,
  Sparkles,
  Download,
  Share2,
  Calendar,
  DollarSign,
  Percent,
  Info,
  Settings2,
  Zap,
  Clock,
  LineChart as LineChartIcon,
  PieChart,
  Loader2,
  X,
  ChevronDown,
  ChevronUp,
  Copy,
  Gauge,
  ArrowUpRight,
  ArrowDownRight,
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
import { InlineDisclaimer, SimulationDisclaimer, EducationalBadge } from '@/components/legal';
import { PortfolioConstraintOptimizer, OptimizedPortfolio } from './PortfolioConstraintOptimizer';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface Asset {
  symbol: string;
  name?: string;
  weight: number;
  color?: string;
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
  { value: '15Y', label: '15 Years', years: 15 },
  { value: 'MAX', label: 'Max', years: 30 },
];

const BENCHMARKS = [
  { value: 'SPY', label: 'S&P 500 (SPY)' },
  { value: 'QQQ', label: 'NASDAQ 100 (QQQ)' },
  { value: 'IWM', label: 'Russell 2000 (IWM)' },
  { value: 'VTI', label: 'Total Stock Market (VTI)' },
  { value: 'AGG', label: 'Aggregate Bond (AGG)' },
  { value: 'NONE', label: 'No Benchmark' },
];

const POPULAR_ETFS = [
  { symbol: 'VTI', name: 'Total Stock Market', category: 'US Equity' },
  { symbol: 'VOO', name: 'S&P 500', category: 'US Equity' },
  { symbol: 'QQQ', name: 'NASDAQ 100', category: 'US Equity' },
  { symbol: 'VGT', name: 'Technology Sector', category: 'Sector' },
  { symbol: 'VXUS', name: 'International Stocks', category: 'International' },
  { symbol: 'VWO', name: 'Emerging Markets', category: 'International' },
  { symbol: 'BND', name: 'Total Bond Market', category: 'Fixed Income' },
  { symbol: 'TLT', name: '20+ Year Treasury', category: 'Fixed Income' },
  { symbol: 'LQD', name: 'Investment Grade Corp', category: 'Fixed Income' },
  { symbol: 'GLD', name: 'Gold', category: 'Commodity' },
  { symbol: 'VNQ', name: 'Real Estate', category: 'Real Estate' },
  { symbol: 'SCHD', name: 'Dividend Growth', category: 'Dividend' },
];

const ASSET_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#f97316', '#14b8a6', '#6366f1',
];

// ═══════════════════════════════════════════════════════════════════════════════
// PRESET PORTFOLIO TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════

const PORTFOLIO_TEMPLATES = [
  {
    name: '60/40 Classic',
    description: 'Traditional balanced allocation',
    assets: [
      { symbol: 'VTI', weight: 60 },
      { symbol: 'BND', weight: 40 },
    ],
  },
  {
    name: 'Three-Fund',
    description: 'Bogleheads favorite',
    assets: [
      { symbol: 'VTI', weight: 50 },
      { symbol: 'VXUS', weight: 30 },
      { symbol: 'BND', weight: 20 },
    ],
  },
  {
    name: 'All-Weather',
    description: 'Ray Dalio inspired',
    assets: [
      { symbol: 'VTI', weight: 30 },
      { symbol: 'TLT', weight: 40 },
      { symbol: 'IEF', weight: 15 },
      { symbol: 'GLD', weight: 7.5 },
      { symbol: 'DBC', weight: 7.5 },
    ],
  },
  {
    name: 'Growth Tilt',
    description: 'Tech-heavy growth focus',
    assets: [
      { symbol: 'VTI', weight: 40 },
      { symbol: 'QQQ', weight: 30 },
      { symbol: 'VGT', weight: 20 },
      { symbol: 'BND', weight: 10 },
    ],
  },
  {
    name: 'Income Focus',
    description: 'Dividend and yield emphasis',
    assets: [
      { symbol: 'SCHD', weight: 30 },
      { symbol: 'VYM', weight: 20 },
      { symbol: 'BND', weight: 25 },
      { symbol: 'LQD', weight: 15 },
      { symbol: 'VNQ', weight: 10 },
    ],
  },
  {
    name: 'Global Diversified',
    description: 'Worldwide exposure',
    assets: [
      { symbol: 'VTI', weight: 35 },
      { symbol: 'VXUS', weight: 25 },
      { symbol: 'VWO', weight: 10 },
      { symbol: 'BND', weight: 20 },
      { symbol: 'GLD', weight: 10 },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

// Risk-based preset portfolios for drawdown screening
const DRAWDOWN_PORTFOLIOS = [
  {
    maxDrawdown: 10,
    name: 'Capital Preservation',
    assets: [
      { symbol: 'BND', weight: 60 },
      { symbol: 'TLT', weight: 20 },
      { symbol: 'VTI', weight: 15 },
      { symbol: 'GLD', weight: 5 },
    ],
  },
  {
    maxDrawdown: 20,
    name: 'Conservative',
    assets: [
      { symbol: 'VTI', weight: 40 },
      { symbol: 'BND', weight: 40 },
      { symbol: 'VXUS', weight: 10 },
      { symbol: 'GLD', weight: 10 },
    ],
  },
  {
    maxDrawdown: 30,
    name: 'Balanced Growth',
    assets: [
      { symbol: 'VTI', weight: 50 },
      { symbol: 'VXUS', weight: 20 },
      { symbol: 'BND', weight: 20 },
      { symbol: 'VNQ', weight: 10 },
    ],
  },
  {
    maxDrawdown: 40,
    name: 'Growth Focus',
    assets: [
      { symbol: 'VTI', weight: 50 },
      { symbol: 'QQQ', weight: 25 },
      { symbol: 'VXUS', weight: 15 },
      { symbol: 'BND', weight: 10 },
    ],
  },
  {
    maxDrawdown: 50,
    name: 'Maximum Growth',
    assets: [
      { symbol: 'VTI', weight: 40 },
      { symbol: 'QQQ', weight: 35 },
      { symbol: 'VGT', weight: 15 },
      { symbol: 'VWO', weight: 10 },
    ],
  },
];

export function TraditionalBacktester() {
  // Portfolio state
  const [assets, setAssets] = useState<Asset[]>([
    { symbol: 'VTI', weight: 60, color: ASSET_COLORS[0] },
    { symbol: 'BND', weight: 40, color: ASSET_COLORS[1] },
  ]);
  const [newSymbol, setNewSymbol] = useState('');
  const [searchResults, setSearchResults] = useState<typeof POPULAR_ETFS>([]);
  const [showSearch, setShowSearch] = useState(false);
  
  // Max drawdown constraint
  const [maxDrawdownTarget, setMaxDrawdownTarget] = useState(30);
  
  // Backtest configuration
  const [period, setPeriod] = useState('5Y');
  const [benchmark, setBenchmark] = useState('SPY');
  const [initialCapital, setInitialCapital] = useState(100000);
  const [rebalanceFrequency, setRebalanceFrequency] = useState<'monthly' | 'quarterly' | 'annually' | 'none'>('annually');
  
  // Constraint-based optimization
  const [showOptimizer, setShowOptimizer] = useState(false);
  
  // Results state
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Calculate total weight
  const totalWeight = useMemo(() => 
    assets.reduce((sum, a) => sum + a.weight, 0),
    [assets]
  );
  const isValidAllocation = Math.abs(totalWeight - 100) < 0.1;

  // Get suggested portfolio based on drawdown target
  const suggestedPortfolio = useMemo(() => {
    return DRAWDOWN_PORTFOLIOS.find(p => maxDrawdownTarget <= p.maxDrawdown) || DRAWDOWN_PORTFOLIOS[DRAWDOWN_PORTFOLIOS.length - 1];
  }, [maxDrawdownTarget]);

  // Apply suggested portfolio from drawdown dial
  const applySuggestedPortfolio = () => {
    const newAssets = suggestedPortfolio.assets.map((a, i) => ({
      symbol: a.symbol,
      weight: a.weight,
      color: ASSET_COLORS[i % ASSET_COLORS.length],
    }));
    setAssets(newAssets);
    toast.success(`Applied ${suggestedPortfolio.name} portfolio`);
  };

  // Get risk color based on drawdown
  const getRiskColor = (drawdown: number) => {
    if (drawdown <= 15) return 'text-emerald-500';
    if (drawdown <= 25) return 'text-green-500';
    if (drawdown <= 35) return 'text-yellow-500';
    if (drawdown <= 45) return 'text-orange-500';
    return 'text-red-500';
  };

  const getRiskGradient = (drawdown: number) => {
    const percent = ((drawdown - 5) / 45) * 100;
    return `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${percent}%, hsl(var(--muted)) ${percent}%, hsl(var(--muted)) 100%)`;
  };

  // Search assets
  const handleSearch = (query: string) => {
    setNewSymbol(query.toUpperCase());
    if (query.length > 0) {
      const filtered = POPULAR_ETFS.filter(
        etf => 
          etf.symbol.toLowerCase().includes(query.toLowerCase()) ||
          etf.name.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(filtered);
      setShowSearch(true);
    } else {
      setShowSearch(false);
    }
  };

  // Add asset
  const addAsset = (symbol: string) => {
    const upperSymbol = symbol.toUpperCase().trim();
    if (!upperSymbol || assets.find(a => a.symbol === upperSymbol)) {
      toast.error('Asset already in portfolio');
      return;
    }
    
    const etf = POPULAR_ETFS.find(e => e.symbol === upperSymbol);
    const newAsset: Asset = {
      symbol: upperSymbol,
      name: etf?.name,
      weight: 0,
      color: ASSET_COLORS[assets.length % ASSET_COLORS.length],
    };
    
    setAssets([...assets, newAsset]);
    setNewSymbol('');
    setShowSearch(false);
    toast.success(`Added ${upperSymbol}`);
  };

  // Remove asset
  const removeAsset = (symbol: string) => {
    setAssets(assets.filter(a => a.symbol !== symbol));
  };

  // Update weight
  const updateWeight = (symbol: string, weight: number) => {
    setAssets(assets.map(a => 
      a.symbol === symbol ? { ...a, weight } : a
    ));
  };

  // Equal weight
  const equalizeWeights = () => {
    const equalWeight = Math.round((100 / assets.length) * 10) / 10;
    setAssets(assets.map(a => ({ ...a, weight: equalWeight })));
  };

  // Load template
  const loadTemplate = (template: typeof PORTFOLIO_TEMPLATES[0]) => {
    const newAssets = template.assets.map((a, i) => ({
      ...a,
      color: ASSET_COLORS[i % ASSET_COLORS.length],
    }));
    setAssets(newAssets);
    toast.success(`Loaded ${template.name} template`);
  };

  // Handle optimized portfolio
  const handleOptimized = (portfolio: OptimizedPortfolio) => {
    const newAssets = portfolio.assets.map((a, i) => ({
      symbol: a.symbol,
      name: a.name,
      weight: a.weight,
      color: ASSET_COLORS[i % ASSET_COLORS.length],
    }));
    setAssets(newAssets);
    toast.success('Applied optimized portfolio');
  };

  // Run backtest
  const runBacktest = useCallback(async () => {
    if (!isValidAllocation) {
      toast.error('Weights must sum to 100%');
      return;
    }
    
    setIsLoading(true);
    setResult(null);
    
    try {
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      const periodYears = PERIODS.find(p => p.value === period)?.years || 5;
      startDate.setFullYear(endDate.getFullYear() - periodYears);
      
      const startStr = startDate.toISOString().split('T')[0];
      const endStr = endDate.toISOString().split('T')[0];
      
      // Fetch historical data for all assets
      const assetData: Record<string, { date: string; close: number; return: number }[]> = {};
      
      for (const asset of assets) {
        const { data, error } = await supabase
          .from('market_daily_bars')
          .select('bar_date, close, daily_return')
          .eq('ticker', asset.symbol)
          .gte('bar_date', startStr)
          .lte('bar_date', endStr)
          .order('bar_date', { ascending: true });
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          assetData[asset.symbol] = data.map(d => ({
            date: d.bar_date,
            close: d.close || 0,
            return: d.daily_return || 0,
          }));
        }
      }
      
      // Fetch benchmark data
      let benchmarkData: { date: string; close: number; return: number }[] = [];
      if (benchmark !== 'NONE') {
        const { data, error } = await supabase
          .from('market_daily_bars')
          .select('bar_date, close, daily_return')
          .eq('ticker', benchmark)
          .gte('bar_date', startStr)
          .lte('bar_date', endStr)
          .order('bar_date', { ascending: true });
        
        if (!error && data) {
          benchmarkData = data.map(d => ({
            date: d.bar_date,
            close: d.close || 0,
            return: d.daily_return || 0,
          }));
        }
      }
      
      // Find common dates
      const allDateSets = Object.values(assetData).map(d => new Set(d.map(x => x.date)));
      if (benchmarkData.length > 0) {
        allDateSets.push(new Set(benchmarkData.map(d => d.date)));
      }
      
      const commonDates = [...allDateSets[0]].filter(date =>
        allDateSets.every(set => set.has(date))
      ).sort();
      
      if (commonDates.length < 20) {
        toast.error('Insufficient historical data for this combination');
        setIsLoading(false);
        return;
      }
      
      // Build date-indexed data
      const indexedAssetData: Record<string, Record<string, { close: number; return: number }>> = {};
      for (const [symbol, data] of Object.entries(assetData)) {
        indexedAssetData[symbol] = {};
        for (const d of data) {
          indexedAssetData[symbol][d.date] = { close: d.close, return: d.return };
        }
      }
      
      const indexedBenchmark: Record<string, { close: number; return: number }> = {};
      for (const d of benchmarkData) {
        indexedBenchmark[d.date] = { close: d.close, return: d.return };
      }
      
      // Calculate portfolio values
      const portfolioValues: number[] = [initialCapital];
      const benchmarkValues: number[] = [initialCapital];
      const dailyReturns: number[] = [];
      const benchmarkReturns: number[] = [];
      const dates: string[] = [commonDates[0]];
      
      for (let i = 1; i < commonDates.length; i++) {
        const date = commonDates[i];
        
        // Calculate weighted portfolio return
        let portfolioReturn = 0;
        for (const asset of assets) {
          const assetReturn = indexedAssetData[asset.symbol]?.[date]?.return || 0;
          portfolioReturn += assetReturn * (asset.weight / 100);
        }
        
        dailyReturns.push(portfolioReturn);
        const newPortfolioValue = portfolioValues[portfolioValues.length - 1] * (1 + portfolioReturn);
        portfolioValues.push(newPortfolioValue);
        
        // Benchmark
        const bmReturn = indexedBenchmark[date]?.return || 0;
        benchmarkReturns.push(bmReturn);
        const newBenchmarkValue = benchmarkValues[benchmarkValues.length - 1] * (1 + bmReturn);
        benchmarkValues.push(newBenchmarkValue);
        
        dates.push(date);
      }
      
      // Calculate metrics
      const years = commonDates.length / 252;
      const totalReturn = ((portfolioValues[portfolioValues.length - 1] - initialCapital) / initialCapital) * 100;
      const cagr = calculateCAGR(initialCapital, portfolioValues[portfolioValues.length - 1], years) * 100;
      const volatility = annualizedVolatility(dailyReturns) * 100;
      const sharpeRatio = calculateSharpeRatio(dailyReturns, 0.05);
      const sortinoRatio = calculateSortinoRatio(dailyReturns, 0.05);
      const { maxDrawdownPercent, drawdownSeries } = calculateMaxDrawdown(portfolioValues);
      const var95 = calculateVaR(dailyReturns, 0.95);
      const cvar95 = calculateCVaR(dailyReturns, 0.95);
      const { beta, alpha } = calculateBetaAlpha(dailyReturns, benchmarkReturns, 0.05);
      const calmarRatio = maxDrawdownPercent > 0 ? cagr / maxDrawdownPercent : 0;
      
      // Calculate yearly returns
      const yearlyReturns: { year: number; return: number; benchmark: number }[] = [];
      const yearMap: Record<number, { portfolio: number[]; benchmark: number[] }> = {};
      
      for (let i = 0; i < dates.length; i++) {
        const year = new Date(dates[i]).getFullYear();
        if (!yearMap[year]) {
          yearMap[year] = { portfolio: [], benchmark: [] };
        }
        if (i > 0) {
          yearMap[year].portfolio.push(dailyReturns[i - 1]);
          yearMap[year].benchmark.push(benchmarkReturns[i - 1]);
        }
      }
      
      for (const [year, data] of Object.entries(yearMap)) {
        if (data.portfolio.length > 0) {
          const portfolioYearReturn = data.portfolio.reduce((acc, r) => acc * (1 + r), 1) - 1;
          const benchmarkYearReturn = data.benchmark.reduce((acc, r) => acc * (1 + r), 1) - 1;
          yearlyReturns.push({
            year: parseInt(year),
            return: portfolioYearReturn * 100,
            benchmark: benchmarkYearReturn * 100,
          });
        }
      }
      
      // Calculate monthly returns
      const monthlyReturns: { month: string; return: number }[] = [];
      const monthMap: Record<string, number[]> = {};
      
      for (let i = 0; i < dates.length - 1; i++) {
        const monthKey = dates[i].slice(0, 7);
        if (!monthMap[monthKey]) {
          monthMap[monthKey] = [];
        }
        monthMap[monthKey].push(dailyReturns[i]);
      }
      
      for (const [month, returns] of Object.entries(monthMap)) {
        const monthReturn = returns.reduce((acc, r) => acc * (1 + r), 1) - 1;
        monthlyReturns.push({ month, return: monthReturn * 100 });
      }
      
      const allMonthlyReturns = monthlyReturns.map(m => m.return);
      const bestMonth = Math.max(...allMonthlyReturns);
      const worstMonth = Math.min(...allMonthlyReturns);
      const avgMonthlyReturn = arithmeticMean(allMonthlyReturns);
      
      const allYearlyReturns = yearlyReturns.map(y => y.return);
      const bestYear = Math.max(...allYearlyReturns);
      const worstYear = Math.min(...allYearlyReturns);
      const positiveYears = (allYearlyReturns.filter(r => r > 0).length / allYearlyReturns.length) * 100;
      
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
          bestYear,
          worstYear,
          positiveYears,
          avgMonthlyReturn,
          bestMonth,
          worstMonth,
        },
        yearlyReturns,
        monthlyReturns,
      });
      
      toast.success('Backtest completed');
    } catch (error) {
      console.error('Backtest error:', error);
      toast.error('Failed to run backtest');
    } finally {
      setIsLoading(false);
    }
  }, [assets, period, benchmark, initialCapital, isValidAllocation]);

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!result) return [];
    
    return result.dates.map((date, i) => ({
      date,
      portfolio: result.portfolioValues[i],
      benchmark: result.benchmarkValues[i],
      drawdown: result.drawdownSeries[i],
    }));
  }, [result]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              Portfolio Backtester
            </h1>
            <EducationalBadge variant="simulation" />
          </div>
          <p className="text-muted-foreground">
            Build and test portfolios against historical data
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setShowOptimizer(true)}>
            <Target className="h-4 w-4" />
            Find Portfolio
          </Button>
          
          <Button 
            onClick={runBacktest} 
            disabled={isLoading || !isValidAllocation}
            className="gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Run Backtest
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Portfolio Constraint Optimizer Dialog */}
      <PortfolioConstraintOptimizer
        open={showOptimizer}
        onOpenChange={setShowOptimizer}
        onOptimized={handleOptimized}
      />

      <InlineDisclaimer variant="simulation" />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Portfolio Builder */}
        <div className="lg:col-span-1 space-y-4">
          {/* Add Asset */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Portfolio Assets</CardTitle>
              <CardDescription>Add tickers and set weights</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Max Drawdown Constraint Dial */}
              <div className="p-4 rounded-xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Shield className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <span className="text-sm font-semibold">Max Drawdown Target</span>
                      <p className="text-xs text-muted-foreground">Set your risk tolerance</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={cn("text-2xl font-bold", getRiskColor(maxDrawdownTarget))}>
                      {maxDrawdownTarget}%
                    </span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="relative">
                    <Slider
                      value={[maxDrawdownTarget]}
                      onValueChange={([v]) => setMaxDrawdownTarget(v)}
                      min={5}
                      max={50}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                      <span>5% (Safe)</span>
                      <span>25%</span>
                      <span>50% (Aggressive)</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-2 rounded-lg bg-background/50 border">
                    <div>
                      <span className="text-xs text-muted-foreground">Suggested:</span>
                      <span className="ml-2 text-sm font-medium">{suggestedPortfolio.name}</span>
                    </div>
                    <Button 
                      size="sm" 
                      variant="secondary"
                      onClick={applySuggestedPortfolio}
                      className="h-7 text-xs gap-1"
                    >
                      <Sparkles className="h-3 w-3" />
                      Apply
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Search Input */}
              <div className="relative">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={newSymbol}
                      onChange={(e) => handleSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addAsset(newSymbol)}
                      placeholder="Search ticker..."
                      className="pl-9"
                    />
                  </div>
                  <Button onClick={() => addAsset(newSymbol)} disabled={!newSymbol}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Search Results Dropdown */}
                {showSearch && searchResults.length > 0 && (
                  <Card className="absolute z-50 top-full left-0 right-0 mt-1 max-h-48 overflow-auto bg-background">
                    <CardContent className="p-1">
                      {searchResults.map((etf) => (
                        <button
                          key={etf.symbol}
                          onClick={() => addAsset(etf.symbol)}
                          className="w-full text-left px-3 py-2 rounded hover:bg-muted transition-colors flex items-center justify-between"
                        >
                          <div>
                            <span className="font-mono font-medium">{etf.symbol}</span>
                            <span className="text-sm text-muted-foreground ml-2">{etf.name}</span>
                          </div>
                          <Badge variant="outline" className="text-xs">{etf.category}</Badge>
                        </button>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
              
              {/* Quick Add */}
              <div className="flex flex-wrap gap-1">
                {POPULAR_ETFS.slice(0, 6).map((etf) => (
                  <button
                    key={etf.symbol}
                    onClick={() => addAsset(etf.symbol)}
                    disabled={assets.find(a => a.symbol === etf.symbol) !== undefined}
                    className={cn(
                      "px-2 py-1 text-xs rounded border transition-colors",
                      assets.find(a => a.symbol === etf.symbol)
                        ? "border-muted bg-muted text-muted-foreground cursor-not-allowed"
                        : "border-border hover:bg-muted"
                    )}
                  >
                    {etf.symbol}
                  </button>
                ))}
              </div>
              
              <Separator />
              
              {/* Asset List */}
              <div className="space-y-3">
                {assets.map((asset, idx) => (
                  <div key={asset.symbol} className="p-3 rounded-lg border bg-card">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: asset.color }}
                        />
                        <span className="font-mono font-medium">{asset.symbol}</span>
                        {asset.name && (
                          <span className="text-xs text-muted-foreground hidden sm:inline">
                            {asset.name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold w-12 text-right">
                          {asset.weight.toFixed(1)}%
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
                    <Slider
                      value={[asset.weight]}
                      onValueChange={([v]) => updateWeight(asset.symbol, v)}
                      max={100}
                      step={0.5}
                      className="w-full"
                    />
                  </div>
                ))}
                
                {assets.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <PieChart className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Add assets to build your portfolio</p>
                  </div>
                )}
              </div>
              
              {/* Weight Summary */}
              {assets.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Button variant="outline" size="sm" onClick={equalizeWeights}>
                      <Scale className="h-4 w-4 mr-2" />
                      Equal Weight
                    </Button>
                    <Badge variant={isValidAllocation ? 'default' : 'destructive'}>
                      {totalWeight.toFixed(1)}% / 100%
                    </Badge>
                  </div>
                  
                  {!isValidAllocation && (
                    <div className="p-2 rounded bg-destructive/10 border border-destructive/30 flex items-center gap-2 text-xs text-destructive">
                      <AlertTriangle className="h-4 w-4" />
                      Weights must sum to 100%
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Templates */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {PORTFOLIO_TEMPLATES.map((template) => (
                  <button
                    key={template.name}
                    onClick={() => loadTemplate(template)}
                    className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{template.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {template.assets.length} assets
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{template.description}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
          
          {/* Configuration */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Time Period</Label>
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PERIODS.map(p => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs">Benchmark</Label>
                <Select value={benchmark} onValueChange={setBenchmark}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BENCHMARKS.map(b => (
                      <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs">Initial Capital</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    value={initialCapital}
                    onChange={(e) => setInitialCapital(Number(e.target.value))}
                    className="pl-9"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs">Rebalancing</Label>
                <Select 
                  value={rebalanceFrequency} 
                  onValueChange={(v: any) => setRebalanceFrequency(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Rebalancing</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="annually">Annually</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Results */}
        <div className="lg:col-span-2 space-y-4">
          {result ? (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-4">
                <TabsTrigger value="overview" className="gap-1">
                  <BarChart3 className="h-4 w-4" />
                  <span className="hidden sm:inline">Overview</span>
                </TabsTrigger>
                <TabsTrigger value="chart" className="gap-1">
                  <LineChartIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Chart</span>
                </TabsTrigger>
                <TabsTrigger value="drawdown" className="gap-1">
                  <TrendingDown className="h-4 w-4" />
                  <span className="hidden sm:inline">Drawdown</span>
                </TabsTrigger>
                <TabsTrigger value="returns" className="gap-1">
                  <Calendar className="h-4 w-4" />
                  <span className="hidden sm:inline">Returns</span>
                </TabsTrigger>
              </TabsList>
              
              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4">
                {/* Key Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <Card className="p-4 bg-emerald-500/10 border-emerald-500/30">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-emerald-400" />
                      <span className="text-xs text-muted-foreground">Total Return</span>
                    </div>
                    <p className={cn(
                      "text-2xl font-bold font-mono",
                      result.metrics.totalReturn >= 0 ? "text-emerald-400" : "text-rose-400"
                    )}>
                      {result.metrics.totalReturn >= 0 ? '+' : ''}{result.metrics.totalReturn.toFixed(1)}%
                    </p>
                  </Card>
                  
                  <Card className="p-4 bg-blue-500/10 border-blue-500/30">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-blue-400" />
                      <span className="text-xs text-muted-foreground">CAGR</span>
                    </div>
                    <p className={cn(
                      "text-2xl font-bold font-mono",
                      result.metrics.cagr >= 0 ? "text-blue-400" : "text-rose-400"
                    )}>
                      {result.metrics.cagr >= 0 ? '+' : ''}{result.metrics.cagr.toFixed(2)}%
                    </p>
                  </Card>
                  
                  <Card className="p-4 bg-purple-500/10 border-purple-500/30">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="h-4 w-4 text-purple-400" />
                      <span className="text-xs text-muted-foreground">Sharpe Ratio</span>
                    </div>
                    <p className={cn(
                      "text-2xl font-bold font-mono",
                      result.metrics.sharpeRatio >= 1 ? "text-emerald-400" : 
                      result.metrics.sharpeRatio >= 0.5 ? "text-purple-400" : "text-rose-400"
                    )}>
                      {result.metrics.sharpeRatio.toFixed(2)}
                    </p>
                  </Card>
                  
                  <Card className="p-4 bg-rose-500/10 border-rose-500/30">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingDown className="h-4 w-4 text-rose-400" />
                      <span className="text-xs text-muted-foreground">Max Drawdown</span>
                    </div>
                    <p className="text-2xl font-bold font-mono text-rose-400">
                      -{result.metrics.maxDrawdown.toFixed(1)}%
                    </p>
                  </Card>
                </div>
                
                {/* Secondary Metrics */}
                <Card>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="text-center p-3 rounded-lg bg-secondary/50">
                        <p className="text-xs text-muted-foreground mb-1">Volatility</p>
                        <p className="text-lg font-bold font-mono">{result.metrics.volatility.toFixed(1)}%</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-secondary/50">
                        <p className="text-xs text-muted-foreground mb-1">Sortino</p>
                        <p className="text-lg font-bold font-mono">{result.metrics.sortinoRatio.toFixed(2)}</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-secondary/50">
                        <p className="text-xs text-muted-foreground mb-1">Beta</p>
                        <p className="text-lg font-bold font-mono">{result.metrics.beta.toFixed(2)}</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-secondary/50">
                        <p className="text-xs text-muted-foreground mb-1">Alpha</p>
                        <p className={cn(
                          "text-lg font-bold font-mono",
                          result.metrics.alpha >= 0 ? "text-emerald-400" : "text-rose-400"
                        )}>
                          {result.metrics.alpha >= 0 ? '+' : ''}{result.metrics.alpha.toFixed(2)}%
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Risk Metrics */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Shield className="h-4 w-4 text-amber-400" />
                      Risk Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="text-center p-3 rounded-lg bg-secondary/50">
                        <p className="text-xs text-muted-foreground mb-1">VaR (95%)</p>
                        <p className="text-lg font-bold font-mono text-rose-400">
                          -{result.metrics.var95.toFixed(2)}%
                        </p>
                        <p className="text-xs text-muted-foreground">Daily</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-secondary/50">
                        <p className="text-xs text-muted-foreground mb-1">CVaR (95%)</p>
                        <p className="text-lg font-bold font-mono text-rose-400">
                          -{result.metrics.cvar95.toFixed(2)}%
                        </p>
                        <p className="text-xs text-muted-foreground">Expected Shortfall</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-secondary/50">
                        <p className="text-xs text-muted-foreground mb-1">Calmar Ratio</p>
                        <p className="text-lg font-bold font-mono">
                          {result.metrics.calmarRatio.toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">Return/Drawdown</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-secondary/50">
                        <p className="text-xs text-muted-foreground mb-1">Positive Years</p>
                        <p className={cn(
                          "text-lg font-bold font-mono",
                          result.metrics.positiveYears >= 70 ? "text-emerald-400" : "text-amber-400"
                        )}>
                          {result.metrics.positiveYears.toFixed(0)}%
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Final Value */}
                <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Final Portfolio Value</p>
                        <p className="text-3xl font-bold">
                          ${result.portfolioValues[result.portfolioValues.length - 1].toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          From ${initialCapital.toLocaleString()} initial investment
                        </p>
                      </div>
                      <div className={cn(
                        "text-right",
                        result.metrics.totalReturn >= 0 ? "text-emerald-400" : "text-rose-400"
                      )}>
                        {result.metrics.totalReturn >= 0 ? (
                          <ArrowUpRight className="h-10 w-10" />
                        ) : (
                          <ArrowDownRight className="h-10 w-10" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Chart Tab */}
              <TabsContent value="chart">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Portfolio Growth</CardTitle>
                    <CardDescription>
                      Portfolio value over time vs benchmark
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="benchmarkGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis 
                            dataKey="date" 
                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                            tickFormatter={(v) => new Date(v).getFullYear().toString()}
                          />
                          <YAxis 
                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                          />
                          <RechartsTooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--popover))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                            formatter={(value: number, name: string) => [
                              `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
                              name === 'portfolio' ? 'Portfolio' : 'Benchmark'
                            ]}
                            labelFormatter={(label) => new Date(label).toLocaleDateString()}
                          />
                          <Legend />
                          <Area
                            type="monotone"
                            dataKey="benchmark"
                            stroke="hsl(var(--muted-foreground))"
                            strokeWidth={1}
                            fill="url(#benchmarkGradient)"
                            name="Benchmark"
                          />
                          <Area
                            type="monotone"
                            dataKey="portfolio"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            fill="url(#portfolioGradient)"
                            name="Portfolio"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Drawdown Tab */}
              <TabsContent value="drawdown">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Underwater Chart</CardTitle>
                    <CardDescription>
                      Drawdown from peak over time
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="drawdownGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.5}/>
                              <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0.1}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis 
                            dataKey="date" 
                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                            tickFormatter={(v) => new Date(v).getFullYear().toString()}
                          />
                          <YAxis 
                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                            tickFormatter={(v) => `${v.toFixed(0)}%`}
                            domain={['auto', 0]}
                          />
                          <RechartsTooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--popover))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                            formatter={(value: number) => [`${value.toFixed(2)}%`, 'Drawdown']}
                            labelFormatter={(label) => new Date(label).toLocaleDateString()}
                          />
                          <ReferenceLine y={-result.metrics.maxDrawdown} stroke="hsl(var(--destructive))" strokeDasharray="5 5" />
                          <Area
                            type="monotone"
                            dataKey="drawdown"
                            stroke="hsl(var(--destructive))"
                            strokeWidth={1}
                            fill="url(#drawdownGradient)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    
                    <div className="mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30">
                      <p className="text-sm">
                        <span className="font-medium text-rose-400">Maximum Drawdown: -{result.metrics.maxDrawdown.toFixed(1)}%</span>
                        <span className="text-muted-foreground ml-2">
                          This is the largest peak-to-trough decline experienced.
                        </span>
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Returns Tab */}
              <TabsContent value="returns" className="space-y-4">
                {/* Yearly Returns */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Annual Returns</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-48">
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
                          />
                          <RechartsTooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--popover))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                            formatter={(value: number, name: string) => [
                              `${value.toFixed(1)}%`,
                              name === 'return' ? 'Portfolio' : 'Benchmark'
                            ]}
                          />
                          <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" />
                          <Bar dataKey="return" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="return" />
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
                    </div>
                  </CardContent>
                </Card>
                
                {/* Monthly Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <Card className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">Best Year</p>
                    <p className="text-xl font-bold font-mono text-emerald-400">
                      +{result.metrics.bestYear.toFixed(1)}%
                    </p>
                  </Card>
                  <Card className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">Worst Year</p>
                    <p className="text-xl font-bold font-mono text-rose-400">
                      {result.metrics.worstYear.toFixed(1)}%
                    </p>
                  </Card>
                  <Card className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">Best Month</p>
                    <p className="text-xl font-bold font-mono text-emerald-400">
                      +{result.metrics.bestMonth.toFixed(1)}%
                    </p>
                  </Card>
                  <Card className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">Worst Month</p>
                    <p className="text-xl font-bold font-mono text-rose-400">
                      {result.metrics.worstMonth.toFixed(1)}%
                    </p>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            /* Empty State */
            <Card className="h-96 flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
                <h3 className="text-lg font-medium mb-2">Build Your Portfolio</h3>
                <p className="text-muted-foreground max-w-sm mx-auto mb-4">
                  Add assets on the left, set weights to 100%, then click "Run Backtest" to see historical performance.
                </p>
                <Button onClick={runBacktest} disabled={!isValidAllocation || isLoading}>
                  <Play className="h-4 w-4 mr-2" />
                  Run Backtest
                </Button>
              </div>
            </Card>
          )}
          
          {/* Disclaimer */}
          {result && <SimulationDisclaimer />}
        </div>
      </div>
    </div>
  );
}

export default TraditionalBacktester;
