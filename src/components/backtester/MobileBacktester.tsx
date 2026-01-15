/**
 * Mobile-First Portfolio Backtester
 * 
 * Three-tab layout:
 * - Settings: Date range, capital, max drawdown
 * - Portfolio: Ticker search and allocation (center)
 * - Templates: Pre-built portfolio templates
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
  TrendingUp,
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
  ExternalLink,
  Building,
  Percent,
  Sparkles,
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
  // Live stats
  price?: number;
  change?: number;
  changePercent?: number;
  marketCap?: number;
  volume?: number;
  high52w?: number;
  low52w?: number;
  beta?: number;
  peRatio?: number;
  dividendYield?: number;
  sector?: string;
  isLoadingStats?: boolean;
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
  // Default 5 positions
  const DEFAULT_POSITIONS: Asset[] = [
    { symbol: 'VTI', weight: 40, color: COLORS[0], name: 'Total Stock Market' },
    { symbol: 'VXUS', weight: 20, color: COLORS[1], name: 'International' },
    { symbol: 'BND', weight: 20, color: COLORS[2], name: 'Total Bond' },
    { symbol: 'GLD', weight: 10, color: COLORS[3], name: 'Gold' },
    { symbol: 'VNQ', weight: 10, color: COLORS[4], name: 'Real Estate' },
  ];

  // Portfolio state
  const [assets, setAssets] = useState<Asset[]>(DEFAULT_POSITIONS);
  const [newSymbol, setNewSymbol] = useState('');
  
  // Asset detail popup state
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [assetDetailOpen, setAssetDetailOpen] = useState(false);
  
  // Max drawdown dial state
  const [maxDrawdownTarget, setMaxDrawdownTarget] = useState(20);
  
  // Config state
  const [period, setPeriod] = useState('5Y');
  const [benchmark, setBenchmark] = useState('SPY');
  const [initialCapital, setInitialCapital] = useState(100000);
  
  // UI state - three tabs: portfolio, templates, settings
  const [activeTab, setActiveTab] = useState<'portfolio' | 'templates' | 'settings'>('settings');
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

  // Normalize weights to 100%
  const normalizeWeights = () => {
    if (totalWeight === 0) return;
    setAssets(assets.map(a => ({ ...a, weight: Math.round((a.weight / totalWeight) * 100 * 10) / 10 })));
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

  // Fetch asset stats (price, change, etc.)
  const fetchAssetStats = useCallback(async (symbol: string) => {
    try {
      // Get latest price data
      const { data: latestBar } = await supabase
        .from('market_daily_bars')
        .select('close, open, high, low, volume, bar_date')
        .eq('ticker', symbol)
        .order('bar_date', { ascending: false })
        .limit(2);

      if (latestBar && latestBar.length >= 2) {
        const current = latestBar[0];
        const previous = latestBar[1];
        const change = current.close - previous.close;
        const changePercent = (change / previous.close) * 100;

        // Get 52-week high/low
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        
        const { data: yearData } = await supabase
          .from('market_daily_bars')
          .select('high, low')
          .eq('ticker', symbol)
          .gte('bar_date', oneYearAgo.toISOString().split('T')[0])
          .order('bar_date', { ascending: false });

        let high52w = current.high;
        let low52w = current.low;
        if (yearData) {
          high52w = Math.max(...yearData.map(d => d.high));
          low52w = Math.min(...yearData.map(d => d.low));
        }

        setAssets(prev => prev.map(a => 
          a.symbol === symbol 
            ? { 
                ...a, 
                price: current.close, 
                change, 
                changePercent,
                volume: current.volume,
                high52w,
                low52w,
                isLoadingStats: false
              } 
            : a
        ));
      }
    } catch (error) {
      console.error(`Failed to fetch stats for ${symbol}:`, error);
    }
  }, []);

  // Fetch stats for all assets on mount and when assets change
  useEffect(() => {
    assets.forEach(asset => {
      if (asset.price === undefined && !asset.isLoadingStats) {
        setAssets(prev => prev.map(a => 
          a.symbol === asset.symbol ? { ...a, isLoadingStats: true } : a
        ));
        fetchAssetStats(asset.symbol);
      }
    });
  }, [assets.map(a => a.symbol).join(','), fetchAssetStats]);

  // Open asset detail popup
  const openAssetDetail = (asset: Asset) => {
    setSelectedAsset(asset);
    setAssetDetailOpen(true);
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
      const endStr = endDate.toISOString().split('T')[0];
      
      // First, fetch ALL available data for each asset to find the common date range
      const assetData: Record<string, { date: string; return: number }[]> = {};
      const assetDateRanges: Record<string, { min: string; max: string }> = {};
      const missingTickers: string[] = [];
      
      for (const asset of assets) {
        const { data, error } = await supabase
          .from('market_daily_bars')
          .select('bar_date, daily_return')
          .eq('ticker', asset.symbol)
          .lte('bar_date', endStr)
          .order('bar_date', { ascending: true });
        
        if (!error && data && data.length >= 20) {
          assetData[asset.symbol] = data.map(d => ({
            date: d.bar_date,
            return: d.daily_return || 0,
          }));
          assetDateRanges[asset.symbol] = {
            min: data[0].bar_date,
            max: data[data.length - 1].bar_date
          };
        } else {
          missingTickers.push(asset.symbol);
        }
      }
      
      // Check if we have enough tickers with data
      if (Object.keys(assetData).length === 0) {
        toast.error(`No historical data available for: ${assets.map(a => a.symbol).join(', ')}. Try major ETFs like SPY, QQQ, VTI.`);
        setIsLoading(false);
        return;
      }
      
      // Filter assets to only those with data and renormalize weights
      const validSymbols = new Set(Object.keys(assetData));
      const validAssets = assets.filter(a => validSymbols.has(a.symbol)).map(a => ({ ...a }));
      
      if (missingTickers.length > 0) {
        toast.warning(`Limited data for: ${missingTickers.join(', ')} - excluded from backtest`);
      }
      
      // Renormalize weights for valid assets
      const totalWeight = validAssets.reduce((sum, a) => sum + a.weight, 0);
      validAssets.forEach(a => a.weight = (a.weight / totalWeight) * 100);
      
      // Calculate the effective date range based on user's period selection
      const years = PERIODS.find(p => p.value === period)?.years || 5;
      const requestedStartDate = new Date();
      requestedStartDate.setFullYear(endDate.getFullYear() - years);
      const requestedStartStr = requestedStartDate.toISOString().split('T')[0];
      
      // Find the latest start date among all valid assets (the limiting factor)
      const latestAssetStart = Object.values(assetDateRanges).reduce((latest, range) => 
        range.min > latest ? range.min : latest, '1900-01-01');
      
      // Use the later of: user's requested start OR the latest asset start date
      const effectiveStartStr = requestedStartStr > latestAssetStart ? requestedStartStr : latestAssetStart;
      
      // Filter asset data to the effective date range
      for (const symbol of Object.keys(assetData)) {
        assetData[symbol] = assetData[symbol].filter(d => d.date >= effectiveStartStr);
      }
      
      // Fetch benchmark
      let benchmarkData: { date: string; return: number }[] = [];
      if (benchmark !== 'NONE') {
        const { data } = await supabase
          .from('market_daily_bars')
          .select('bar_date, daily_return')
          .eq('ticker', benchmark)
          .gte('bar_date', effectiveStartStr)
          .lte('bar_date', endStr)
          .order('bar_date', { ascending: true });
        
        if (data && data.length >= 20) {
          benchmarkData = data.map(d => ({ date: d.bar_date, return: d.daily_return || 0 }));
        }
      }
      
      // Find common dates
      const allDateSets = Object.values(assetData).map(d => new Set(d.map(x => x.date)));
      if (benchmarkData.length > 0) allDateSets.push(new Set(benchmarkData.map(d => d.date)));
      
      if (allDateSets.length === 0 || allDateSets[0].size === 0) {
        toast.error('No overlapping data found. Try different tickers.');
        setIsLoading(false);
        return;
      }
      
      const commonDates = [...allDateSets[0]].filter(date =>
        allDateSets.every(set => set.has(date))
      ).sort();
      
      if (commonDates.length < 20) {
        const tickerInfo = Object.entries(assetDateRanges)
          .map(([t, r]) => `${t}: ${r.min.slice(0, 7)}`)
          .join(', ');
        toast.error(`Only ${commonDates.length} days overlap. Data starts: ${tickerInfo}`);
        setIsLoading(false);
        return;
      }
      
      // Notify user if date range was adjusted
      if (effectiveStartStr > requestedStartStr) {
        const actualYears = ((new Date(endStr).getTime() - new Date(effectiveStartStr).getTime()) / (365.25 * 24 * 60 * 60 * 1000)).toFixed(1);
        toast.info(`Backtest adjusted to ${actualYears} years based on available data (from ${effectiveStartStr.slice(0, 7)})`);
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
        for (const asset of validAssets) {
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
    <div className="flex flex-col h-full min-h-0 bg-background">
      {/* Header Bar - Portfolio Lab Style */}
      <header className="flex-shrink-0 px-4 py-2.5 border-b bg-background/95 backdrop-blur">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Title + Time Period */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <BarChart3 className="h-4 w-4 text-primary" />
              </div>
              <h1 className="font-semibold text-lg">Portfolio Lab</h1>
            </div>
            
            {/* Time Period Pills */}
            <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
              {PERIODS.filter(p => ['1Y', '3Y', '5Y', 'MAX'].includes(p.value)).map(p => (
                <button
                  key={p.value}
                  onClick={() => setPeriod(p.value)}
                  className={cn(
                    "px-2.5 py-1 text-xs font-medium rounded-md transition-all",
                    period === p.value
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  {p.value}
                </button>
              ))}
            </div>
          </div>
          
          {/* Right: Benchmark + Allocation + Run */}
          <div className="flex items-center gap-3">
            {/* Benchmark chips */}
            <div className="hidden md:flex items-center gap-1 text-xs text-muted-foreground">
              <span className="mr-1">vs</span>
              {BENCHMARKS.filter(b => b.value !== 'NONE').map(b => (
                <button
                  key={b.value}
                  onClick={() => setBenchmark(b.value)}
                  className={cn(
                    "px-2 py-1 rounded text-xs font-mono transition-all",
                    benchmark === b.value
                      ? "bg-muted text-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {b.value}
                </button>
              ))}
            </div>
            
            {/* Allocation indicator */}
            <div className={cn(
              "px-2.5 py-1 rounded-md text-xs font-mono font-bold",
              isValid 
                ? "bg-emerald-500/20 text-emerald-500" 
                : "bg-amber-500/20 text-amber-500"
            )}>
              {totalWeight.toFixed(0)}%
            </div>
            
            {/* Run button */}
            <Button 
              onClick={runBacktest} 
              disabled={isLoading || !isValid || assets.length === 0}
              size="sm"
              className={cn(
                "gap-1.5 px-4 font-semibold",
                "bg-emerald-500 hover:bg-emerald-600 text-white",
                !isLoading && isValid && assets.length > 0 && "shadow-[0_0_15px_rgba(16,185,129,0.4)]"
              )}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4 fill-current" />
              )}
              RUN
            </Button>
          </div>
        </div>
      </header>

      {/* Ticker Search - Always Visible at Top */}
      <div className="px-4 py-3 border-b border-border/50 bg-card/50">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && addAsset(newSymbol)}
              placeholder="Search ticker..."
              className="pl-9 h-9 text-sm bg-background"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-muted rounded border text-muted-foreground">K</kbd>
            </div>
          </div>
          {/* Quick Add Chips */}
          <div className="flex gap-1.5 flex-shrink-0">
            {POPULAR_ETFS.filter(e => !assets.find(a => a.symbol === e.symbol)).slice(0, 5).map((etf) => (
              <button
                key={etf.symbol}
                onClick={() => addAsset(etf.symbol)}
                className="px-2 py-1 text-xs font-mono rounded border bg-background hover:bg-muted/50 transition-colors"
              >
                {etf.symbol}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Three-Panel Layout */}
      <div className="flex-1 flex min-h-0">
        {/* Vertical Side Tab Navigation */}
        <div className="w-12 flex-shrink-0 border-r border-border/50 flex flex-col py-3 bg-muted/20 gap-0.5">
          <button
            onClick={() => setActiveTab('settings')}
            className={cn(
              "w-full py-2.5 flex items-center justify-center transition-all relative",
              activeTab === 'settings'
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
            title="Settings"
          >
            {activeTab === 'settings' && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r" />
            )}
            <div className="flex flex-col items-center gap-0.5">
              <Activity className="h-4 w-4" />
            </div>
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={cn(
              "w-full py-2.5 flex items-center justify-center transition-all relative",
              activeTab === 'templates'
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
            title="Presets"
          >
            {activeTab === 'templates' && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r" />
            )}
            <div className="flex flex-col items-center gap-0.5">
              <LayoutGrid className="h-4 w-4" />
            </div>
          </button>
        </div>
        
        {/* Left Panel - Settings/Templates/Search */}
        <div className="w-64 flex-shrink-0 border-r border-border/50 flex flex-col min-h-0 bg-card/50">
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-3">
              {/* Settings Tab Content (Default) */}
              {activeTab === 'settings' && (
                <div className="space-y-4">
                  {/* Time Period */}
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Calendar className="h-3 w-3" />
                      TIME PERIOD
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {PERIODS.map(p => (
                        <Button
                          key={p.value}
                          variant={period === p.value ? "default" : "outline"}
                          size="sm"
                          onClick={() => setPeriod(p.value)}
                          className="text-xs h-7 px-2.5"
                        >
                          {p.value}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Initial Capital */}
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                      <DollarSign className="h-3 w-3" />
                      INITIAL CAPITAL
                    </p>
                    <div className="relative mb-2">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        value={initialCapital}
                        onChange={(e) => setInitialCapital(Number(e.target.value))}
                        className="h-9 text-sm pl-8 font-mono bg-background"
                      />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[10000, 50000, 100000, 500000].map(amount => (
                        <Button
                          key={amount}
                          variant={initialCapital === amount ? "default" : "outline"}
                          size="sm"
                          onClick={() => setInitialCapital(amount)}
                          className="text-xs font-mono h-7 px-2"
                        >
                          ${amount >= 1000000 ? `${amount / 1000000}M` : `${amount / 1000}K`}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Benchmark */}
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Scale className="h-3 w-3" />
                      BENCHMARK
                    </p>
                    <Select value={benchmark} onValueChange={setBenchmark}>
                      <SelectTrigger className="h-9 text-sm bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BENCHMARKS.map(b => (
                          <SelectItem key={b.value} value={b.value} className="text-sm">
                            {b.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Max Drawdown Target */}
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Shield className="h-3 w-3" />
                      RISK TOLERANCE
                    </p>
                    <div className={cn(
                      "p-3 rounded-lg bg-gradient-to-b mb-3",
                      getRiskGradient(maxDrawdownTarget)
                    )}>
                      <div className={cn("text-2xl font-black font-mono text-center", getRiskColor(maxDrawdownTarget))}>
                        {maxDrawdownTarget}%
                      </div>
                      <div className="text-[10px] text-muted-foreground text-center mt-0.5">
                        {suggestedPortfolio?.name || 'Max Drawdown Target'}
                      </div>
                    </div>
                    <Slider
                      value={[maxDrawdownTarget]}
                      onValueChange={([v]) => setMaxDrawdownTarget(v)}
                      min={5}
                      max={50}
                      step={5}
                      className="w-full"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                      <span>Conservative</span>
                      <span>Aggressive</span>
                    </div>
                    {suggestedPortfolio && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={applySuggestedPortfolio}
                        className="w-full mt-3 gap-1.5 h-8 text-xs"
                      >
                        <Sparkles className="h-3 w-3" />
                        Apply {suggestedPortfolio.name}
                      </Button>
                    )}
                  </div>
                </div>
              )}
              
              {/* Templates Tab Content */}
              {activeTab === 'templates' && (
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">PORTFOLIO TEMPLATES</p>
                  {TEMPLATES.map((template) => (
                    <button
                      key={template.name}
                      onClick={() => {
                        loadTemplate(template);
                      }}
                      className="w-full p-3 rounded-lg border bg-background text-left hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-medium text-sm">{template.name}</span>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <p className="text-[10px] text-muted-foreground mb-2">{template.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {template.assets.map((a) => (
                          <Badge key={a.symbol} variant="secondary" className="text-[10px] font-mono px-1.5 py-0">
                            {a.symbol} {a.weight}%
                          </Badge>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              
            </div>
          </ScrollArea>
        </div>
        
        {/* Middle Panel - Holdings with Sliders */}
        <div className="flex-1 min-w-0 border-r border-border/50 flex flex-col min-h-0 bg-background">
          <div className="p-3 border-b border-border/50">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                HOLDINGS ({assets.length})
              </p>
              <div className="flex gap-1">
                <button
                  onClick={equalizeWeights}
                  disabled={assets.length === 0}
                  className="text-[10px] text-primary hover:underline disabled:opacity-50"
                >
                  Equal
                </button>
                <span className="text-muted-foreground">|</span>
                <button
                  onClick={normalizeWeights}
                  disabled={assets.length === 0 || totalWeight === 0}
                  className="text-[10px] text-primary hover:underline disabled:opacity-50"
                >
                  Normalize
                </button>
              </div>
            </div>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-1.5">
              {assets.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  <Search className="h-8 w-8 mx-auto mb-3 opacity-30" />
                  <p>Add tickers to build your portfolio</p>
                  <p className="text-xs mt-1">Use the search bar above</p>
                </div>
              ) : (
                assets.map((asset) => (
                  <div
                    key={asset.symbol}
                    className="p-2.5 rounded-lg border bg-card hover:bg-muted/30 transition-colors cursor-pointer group"
                    onClick={() => openAssetDetail(asset)}
                  >
                    <div className="flex items-center gap-2">
                      {/* Color indicator */}
                      <div 
                        className="w-1 h-8 rounded-full flex-shrink-0"
                        style={{ backgroundColor: asset.color }}
                      />
                      
                      {/* Symbol info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-semibold text-sm">{asset.symbol}</span>
                          {asset.changePercent !== undefined && (
                            <span className={cn(
                              "text-[10px] font-mono",
                              asset.changePercent >= 0 ? "text-emerald-500" : "text-rose-500"
                            )}>
                              {asset.changePercent >= 0 ? '+' : ''}{asset.changePercent.toFixed(1)}%
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {asset.name || 'Loading...'}
                        </div>
                      </div>
                      
                      {/* Weight controls */}
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => updateWeight(asset.symbol, Math.max(0, asset.weight - 5))}
                          className="w-6 h-6 rounded border bg-muted/50 hover:bg-muted flex items-center justify-center text-xs"
                        >
                          −
                        </button>
                        <span className="font-mono font-semibold text-sm w-10 text-center">
                          {asset.weight.toFixed(0)}
                        </span>
                        <span className="text-muted-foreground text-xs">%</span>
                        <button
                          onClick={() => updateWeight(asset.symbol, Math.min(100, asset.weight + 5))}
                          className="w-6 h-6 rounded border bg-muted/50 hover:bg-muted flex items-center justify-center text-xs"
                        >
                          +
                        </button>
                        <div className="w-16 ml-1">
                          <Slider
                            value={[asset.weight]}
                            onValueChange={([v]) => updateWeight(asset.symbol, v)}
                            max={100}
                            step={1}
                            className="cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
        
        {/* Right Panel - Visualization */}
        <div className="w-72 flex-shrink-0 flex flex-col min-h-0 bg-muted/10">
          {assets.length === 0 ? (
            /* Empty State */
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <div className="mb-4">
                <Activity className="h-12 w-12 text-muted-foreground/30 mx-auto" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Build Your Portfolio</h3>
              <p className="text-sm text-muted-foreground max-w-xs mb-6">
                Add assets to visualize your allocation.
              </p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 font-mono bg-muted rounded border">K</kbd>
                  <span>to search</span>
                </div>
              </div>
            </div>
          ) : (
            /* Portfolio Preview */
            <div className="flex-1 flex flex-col p-4">
              {/* Allocation Header */}
              <div className="text-center mb-4">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">ALLOCATION</p>
                <div className={cn(
                  "inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-mono font-bold",
                  isValid 
                    ? "bg-emerald-500/20 text-emerald-500" 
                    : "bg-amber-500/20 text-amber-500"
                )}>
                  {totalWeight.toFixed(0)}%
                  {!isValid && <span className="text-xs font-normal">→ 100%</span>}
                </div>
              </div>
              
              {/* Pie Chart */}
              <div className="flex-1 flex items-center justify-center">
                <div className="relative w-40 h-40">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    {(() => {
                      let cumulativePercent = 0;
                      return assets.map((asset, i) => {
                        const percent = (asset.weight / Math.max(totalWeight, 1)) * 100;
                        const startAngle = cumulativePercent * 3.6;
                        const endAngle = (cumulativePercent + percent) * 3.6;
                        cumulativePercent += percent;
                        
                        const largeArc = percent > 50 ? 1 : 0;
                        const startX = 50 + 40 * Math.cos((startAngle - 90) * Math.PI / 180);
                        const startY = 50 + 40 * Math.sin((startAngle - 90) * Math.PI / 180);
                        const endX = 50 + 40 * Math.cos((endAngle - 90) * Math.PI / 180);
                        const endY = 50 + 40 * Math.sin((endAngle - 90) * Math.PI / 180);
                        
                        if (percent === 0) return null;
                        
                        return (
                          <path
                            key={asset.symbol}
                            d={`M 50 50 L ${startX} ${startY} A 40 40 0 ${largeArc} 1 ${endX} ${endY} Z`}
                            fill={asset.color}
                            className="transition-all duration-300"
                          />
                        );
                      });
                    })()}
                    <circle cx="50" cy="50" r="25" fill="hsl(var(--background))" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-xl font-bold font-mono">{assets.length}</div>
                      <div className="text-[10px] text-muted-foreground">Assets</div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Legend */}
              <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-4">
                {assets.map((asset) => (
                  <div key={asset.symbol} className="flex items-center gap-1.5">
                    <div 
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: asset.color }}
                    />
                    <span className="text-[10px] font-mono">{asset.symbol}</span>
                    <span className="text-[10px] text-muted-foreground">{asset.weight.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
              
              {/* Estimated Value */}
              <div className="mt-4 p-3 rounded-xl bg-muted/30 text-center">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">STARTING VALUE</p>
                <p className="text-xl font-bold font-mono">
                  ${initialCapital.toLocaleString()}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {PERIODS.find(p => p.value === period)?.label} backtest
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Asset Detail Popup - Styled like Market Intel */}
      <Sheet open={assetDetailOpen} onOpenChange={setAssetDetailOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto p-0">
          {selectedAsset && (
            <div className="flex flex-col h-full">
              {/* Header - Fixed */}
              <SheetHeader className="p-4 sm:p-6 pb-2 sm:pb-4 border-b border-border/50 shrink-0">
                <div className="flex items-start gap-3">
                  <div 
                    className="p-3 rounded-xl bg-secondary shrink-0 flex items-center justify-center"
                    style={{ backgroundColor: `${selectedAsset.color}20` }}
                  >
                    <div 
                      className="w-6 h-6 rounded-full"
                      style={{ backgroundColor: selectedAsset.color }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <SheetTitle className="text-lg sm:text-xl flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold">{selectedAsset.symbol}</span>
                      <Badge variant="outline" className="text-[10px] sm:text-xs shrink-0">
                        ETF
                      </Badge>
                    </SheetTitle>
                    <SheetDescription className="mt-1 text-left">
                      {selectedAsset.name || 'Exchange Traded Fund'}
                    </SheetDescription>
                  </div>
                </div>

                {/* Current Price Banner */}
                <div className="flex items-center gap-4 sm:gap-6 mt-4 p-4 rounded-xl bg-secondary/50">
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Current Price</p>
                    <p className="text-2xl sm:text-3xl font-bold tabular-nums font-mono">
                      ${selectedAsset.price?.toFixed(2) || '—'}
                    </p>
                  </div>
                  <div className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-lg",
                    (selectedAsset.changePercent || 0) >= 0 
                      ? "bg-emerald-500/10 text-emerald-500" 
                      : "bg-rose-500/10 text-rose-500"
                  )}>
                    {(selectedAsset.changePercent || 0) >= 0 ? (
                      <TrendingUp className="h-5 w-5" />
                    ) : (
                      <TrendingDown className="h-5 w-5" />
                    )}
                    <div>
                      <p className="font-bold tabular-nums font-mono text-sm">
                        {(selectedAsset.change || 0) >= 0 ? '+' : ''}${selectedAsset.change?.toFixed(2) || '0.00'}
                      </p>
                      <p className="text-xs tabular-nums font-mono">
                        ({(selectedAsset.changePercent || 0) >= 0 ? '+' : ''}{selectedAsset.changePercent?.toFixed(2) || '0.00'}%)
                      </p>
                    </div>
                  </div>
                </div>
              </SheetHeader>

              {/* Scrollable Content */}
              <ScrollArea className="flex-1">
                <div className="p-4 sm:p-6 space-y-4">
                  {/* Key Statistics */}
                  <Card className="border-border/50">
                    <CardHeader className="pb-2 sm:pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
                      <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                        <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
                        Key Statistics
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 rounded-lg bg-secondary/30">
                          <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">52W High</p>
                          <p className="font-mono font-semibold text-emerald-500 text-sm sm:text-base">
                            ${selectedAsset.high52w?.toFixed(2) || 'N/A'}
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-secondary/30">
                          <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">52W Low</p>
                          <p className="font-mono font-semibold text-rose-500 text-sm sm:text-base">
                            ${selectedAsset.low52w?.toFixed(2) || 'N/A'}
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-secondary/30">
                          <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">Volume</p>
                          <p className="font-mono font-semibold text-sm sm:text-base">
                            {selectedAsset.volume 
                              ? (selectedAsset.volume >= 1000000 
                                  ? `${(selectedAsset.volume / 1000000).toFixed(1)}M` 
                                  : `${(selectedAsset.volume / 1000).toFixed(0)}K`)
                              : 'N/A'}
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-primary/10">
                          <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">Weight</p>
                          <p className="font-mono font-semibold text-primary text-sm sm:text-base">
                            {selectedAsset.weight.toFixed(0)}%
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 52-Week Range Visual */}
                  {selectedAsset.high52w && selectedAsset.low52w && selectedAsset.price && (
                    <Card className="border-border/50">
                      <CardHeader className="pb-2 sm:pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
                        <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                          <Scale className="h-4 w-4 sm:h-5 sm:w-5 text-amber-400 shrink-0" />
                          52-Week Range
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                        <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="absolute h-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-500"
                            style={{ width: '100%' }}
                          />
                          <div 
                            className="absolute top-1/2 w-4 h-4 bg-background rounded-full border-2 border-primary shadow-lg"
                            style={{ 
                              left: `${Math.min(100, Math.max(0, ((selectedAsset.price - selectedAsset.low52w) / (selectedAsset.high52w - selectedAsset.low52w)) * 100))}%`,
                              transform: 'translate(-50%, -50%)'
                            }}
                          />
                        </div>
                        <div className="flex justify-between mt-3 text-xs text-muted-foreground font-mono">
                          <span>${selectedAsset.low52w.toFixed(2)}</span>
                          <span className="font-semibold text-foreground bg-secondary px-2 py-0.5 rounded">
                            ${selectedAsset.price.toFixed(2)}
                          </span>
                          <span>${selectedAsset.high52w.toFixed(2)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Portfolio Allocation */}
                  <Card className="border-border/50">
                    <CardHeader className="pb-2 sm:pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
                      <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                        <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400 shrink-0" />
                        Portfolio Allocation
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                      <div className="space-y-4">
                        <Slider
                          value={[selectedAsset.weight]}
                          onValueChange={([v]) => {
                            updateWeight(selectedAsset.symbol, v);
                            setSelectedAsset(prev => prev ? { ...prev, weight: v } : null);
                          }}
                          max={100}
                          step={1}
                          className="py-2"
                        />
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Target Allocation</span>
                          <span className="font-mono font-bold text-lg">{selectedAsset.weight.toFixed(0)}%</span>
                        </div>
                        {selectedAsset.price && (
                          <div className="flex justify-between text-sm p-3 rounded-lg bg-secondary/30">
                            <span className="text-muted-foreground">Estimated Value</span>
                            <span className="font-mono font-bold text-primary">
                              ${((initialCapital * selectedAsset.weight / 100)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>

              {/* Fixed Footer Actions */}
              <div className="p-4 sm:p-6 border-t border-border/50 shrink-0 bg-background">
                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => {
                      removeAsset(selectedAsset.symbol);
                      setAssetDetailOpen(false);
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Remove Asset
                  </Button>
                  <Button 
                    className="flex-1"
                    onClick={() => setAssetDetailOpen(false)}
                  >
                    Done
                  </Button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default MobileBacktester;
