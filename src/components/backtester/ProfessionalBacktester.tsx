/**
 * Professional Terminal Backtester
 * 
 * Bloomberg-terminal inspired portfolio analysis interface.
 * Features:
 * - High information density
 * - Real-time data aesthetics
 * - Professional typography (monospace numbers)
 * - Keyboard shortcuts
 * - Multi-panel layout
 * - Sparklines and mini-charts
 * - Heat maps for correlations
 * - Institutional-grade metrics
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Play,
  Search,
  Loader2,
  X,
  Plus,
  Minus,
  Percent,
  BarChart3,
  Activity,
  Layers,
  Workflow,
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
import {
  Sparkline,
  MetricCell,
  PanelHeader,
  Kbd,
  ProgressBar,
  HeatMapCell,
  SectionDivider,
} from './TerminalDesignSystem';
import { AllocationDonut, RiskScore } from './AdvancedAnalytics';
import { VisualStrategyBuilder } from '@/components/builder/VisualStrategyBuilder';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface Asset {
  symbol: string;
  name?: string;
  weight: number;
  color: string;
  price?: number;
  change?: number;
  sparkline?: number[];
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
    treynorRatio: number;
    informationRatio: number;
    trackingError: number;
    upCapture: number;
    downCapture: number;
    winRate: number;
    avgWin: number;
    avgLoss: number;
    bestDay: number;
    worstDay: number;
    bestMonth: number;
    worstMonth: number;
    bestYear: number;
    worstYear: number;
    positiveMonths: number;
    positiveYears: number;
    currentDrawdown: number;
    drawdownDuration: number;
    recoveryTime: number;
    ulcerIndex: number;
    painIndex: number;
  };
  yearlyReturns: { year: number; return: number; benchmark: number }[];
  monthlyReturns: { month: string; return: number }[];
  rollingReturns: { date: string; return1y: number; return3y: number; return5y: number }[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const PERIODS = [
  { value: '1Y', label: '1Y', years: 1 },
  { value: '3Y', label: '3Y', years: 3 },
  { value: '5Y', label: '5Y', years: 5 },
  { value: 'MAX', label: 'MAX', years: 5 },
];

const BENCHMARKS = [
  { value: 'SPY', label: 'SPY' },
  { value: 'QQQ', label: 'QQQ' },
  { value: 'VTI', label: 'VTI' },
  { value: 'AGG', label: 'AGG' },
];

const COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#06B6D4', '#EC4899', '#F97316', '#14B8A6', '#6366F1',
];

const POPULAR_TICKERS = [
  { symbol: 'SPY', name: 'S&P 500' },
  { symbol: 'QQQ', name: 'NASDAQ 100' },
  { symbol: 'VTI', name: 'Total Market' },
  { symbol: 'BND', name: 'Total Bond' },
  { symbol: 'TLT', name: 'Long Treasury' },
  { symbol: 'GLD', name: 'Gold' },
  { symbol: 'VNQ', name: 'Real Estate' },
  { symbol: 'VWO', name: 'Emerging Mkts' },
  { symbol: 'SCHD', name: 'Dividend' },
  { symbol: 'IEF', name: 'Med Treasury' },
];

const TEMPLATES = [
  { 
    name: '60/40 Classic', 
    description: 'Traditional balanced',
    assets: [{ symbol: 'VTI', weight: 60 }, { symbol: 'BND', weight: 40 }] 
  },
  { 
    name: 'Three-Fund', 
    description: 'Bogleheads favorite',
    assets: [{ symbol: 'VTI', weight: 50 }, { symbol: 'VXUS', weight: 30 }, { symbol: 'BND', weight: 20 }] 
  },
  { 
    name: 'All-Weather', 
    description: 'Dalio inspired',
    assets: [{ symbol: 'VTI', weight: 30 }, { symbol: 'TLT', weight: 40 }, { symbol: 'IEF', weight: 15 }, { symbol: 'GLD', weight: 15 }] 
  },
  { 
    name: 'Growth Tilt', 
    description: 'Tech-heavy',
    assets: [{ symbol: 'VTI', weight: 40 }, { symbol: 'QQQ', weight: 35 }, { symbol: 'VGT', weight: 15 }, { symbol: 'BND', weight: 10 }] 
  },
  { 
    name: 'Income Focus', 
    description: 'Dividend oriented',
    assets: [{ symbol: 'SCHD', weight: 35 }, { symbol: 'BND', weight: 35 }, { symbol: 'VNQ', weight: 15 }, { symbol: 'VYM', weight: 15 }] 
  },
  { 
    name: 'Aggressive', 
    description: 'Max equity',
    assets: [{ symbol: 'QQQ', weight: 40 }, { symbol: 'VTI', weight: 30 }, { symbol: 'VGT', weight: 20 }, { symbol: 'VXUS', weight: 10 }] 
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function ProfessionalBacktester() {
  // ─────────────────────────────────────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────────────────────────────────────
  
  // Portfolio state
  const [assets, setAssets] = useState<Asset[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ symbol: string; name: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Settings
  const [period, setPeriod] = useState('5Y');
  const [benchmark, setBenchmark] = useState('SPY');
  const [initialCapital] = useState(100000);
  
  // Results
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  
  // UI state
  const [activeTab, setActiveTab] = useState('overview');
  const [activeLeftTab, setActiveLeftTab] = useState<'portfolio' | 'templates' | 'strategy-builder'>('portfolio');
  const [showStrategyBuilder, setShowStrategyBuilder] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  
  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ─────────────────────────────────────────────────────────────────────────────
  // Computed values
  // ─────────────────────────────────────────────────────────────────────────────
  
  const totalWeight = useMemo(() => 
    assets.reduce((sum, a) => sum + a.weight, 0), 
    [assets]
  );
  
  const isValid = useMemo(() => 
    Math.abs(totalWeight - 100) < 0.01 && assets.length > 0,
    [totalWeight, assets.length]
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // Keyboard shortcuts
  // ─────────────────────────────────────────────────────────────────────────────
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K: Focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      // Cmd/Ctrl + Enter: Run backtest
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && isValid) {
        e.preventDefault();
        runBacktest();
      }
      // Escape: Clear search
      if (e.key === 'Escape') {
        setSearchQuery('');
        setSearchResults([]);
        searchInputRef.current?.blur();
      }
      // ?: Show shortcuts
      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        setShowShortcuts(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isValid]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Search handler
  // ─────────────────────────────────────────────────────────────────────────────
  
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    
    if (query.length < 1) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // First check local popular tickers
      const localMatches = POPULAR_TICKERS.filter(t =>
        t.symbol.toLowerCase().includes(query.toLowerCase()) ||
        t.name.toLowerCase().includes(query.toLowerCase())
      );
      
      if (localMatches.length > 0) {
        setSearchResults(localMatches.slice(0, 5));
      } else {
        // Search database
        const { data } = await supabase
          .from('market_daily_bars')
          .select('ticker')
          .ilike('ticker', `%${query}%`)
          .limit(10);
        
        if (data) {
          const unique = [...new Set(data.map(d => d.ticker))].slice(0, 5);
          setSearchResults(unique.map(s => ({ symbol: s, name: s })));
        }
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // Asset management
  // ─────────────────────────────────────────────────────────────────────────────
  
  const addAsset = useCallback((symbol: string, name?: string) => {
    if (assets.some(a => a.symbol === symbol)) {
      toast.error(`${symbol} already in portfolio`);
      return;
    }
    
    const remainingWeight = 100 - totalWeight;
    const newWeight = assets.length === 0 ? 100 : Math.min(remainingWeight, 20);
    
    setAssets(prev => [...prev, {
      symbol: symbol.toUpperCase(),
      name,
      weight: newWeight,
      color: COLORS[prev.length % COLORS.length],
    }]);
    
    setSearchQuery('');
    setSearchResults([]);
  }, [assets, totalWeight]);

  const removeAsset = useCallback((symbol: string) => {
    setAssets(prev => prev.filter(a => a.symbol !== symbol));
  }, []);

  const updateWeight = useCallback((symbol: string, weight: number) => {
    setAssets(prev => prev.map(a =>
      a.symbol === symbol ? { ...a, weight: Math.max(0, Math.min(100, weight)) } : a
    ));
  }, []);

  const applyTemplate = useCallback((template: typeof TEMPLATES[0]) => {
    setAssets(template.assets.map((a, i) => ({
      symbol: a.symbol,
      name: POPULAR_TICKERS.find(t => t.symbol === a.symbol)?.name,
      weight: a.weight,
      color: COLORS[i % COLORS.length],
    })));
    toast.success(`Applied "${template.name}" template`);
  }, []);

  const normalizeWeights = useCallback(() => {
    if (assets.length === 0) return;
    const factor = 100 / totalWeight;
    setAssets(prev => prev.map(a => ({
      ...a,
      weight: Math.round(a.weight * factor * 10) / 10,
    })));
  }, [assets, totalWeight]);

  const equalizeWeights = useCallback(() => {
    if (assets.length === 0) return;
    const equalWeight = Math.round(100 / assets.length * 10) / 10;
    setAssets(prev => prev.map(a => ({ ...a, weight: equalWeight })));
  }, [assets]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Run backtest
  // ─────────────────────────────────────────────────────────────────────────────
  
  const runBacktest = useCallback(async () => {
    if (!isValid) return;
    
    setIsLoading(true);
    setLoadingProgress(0);
    
    try {
      const periodYears = PERIODS.find(p => p.value === period)?.years || 5;
      const endDate = new Date();
      const startDate = new Date();
      startDate.setFullYear(endDate.getFullYear() - periodYears);
      
      setLoadingProgress(10);
      
      // Fetch data for all assets + benchmark
      const allTickers = [...assets.map(a => a.symbol), benchmark].filter(Boolean);
      
      const { data, error } = await supabase
        .from('market_daily_bars')
        .select('ticker, bar_date, close, daily_return')
        .in('ticker', allTickers)
        .gte('bar_date', startDate.toISOString().split('T')[0])
        .lte('bar_date', endDate.toISOString().split('T')[0])
        .order('bar_date', { ascending: true });
      
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('No data found for any tickers. Try major ETFs like SPY, QQQ, VTI.');
      
      setLoadingProgress(40);
      
      // Organize data by ticker
      const tickerData: Record<string, { date: string; close: number; return: number }[]> = {};
      for (const row of data) {
        if (!tickerData[row.ticker]) tickerData[row.ticker] = [];
        tickerData[row.ticker].push({
          date: String(row.bar_date).split('T')[0], // Normalize date format
          close: row.close,
          return: row.daily_return || 0,
        });
      }
      
      // Check which tickers have enough data
      const tickersWithData = Object.keys(tickerData).filter(t => tickerData[t].length >= 20);
      const missingTickers = allTickers.filter(t => !tickersWithData.includes(t));
      
      if (missingTickers.length > 0) {
        toast.warning(`Limited data for: ${missingTickers.join(', ')}`);
      }
      
      // Filter assets to only those with data
      const validAssets = assets.filter(a => tickersWithData.includes(a.symbol));
      
      if (validAssets.length === 0) {
        throw new Error(`No valid data found for any portfolio assets. Try different tickers or a shorter time period.`);
      }
      
      // Renormalize weights
      const totalWeight = validAssets.reduce((sum, a) => sum + a.weight, 0);
      validAssets.forEach(a => a.weight = (a.weight / totalWeight) * 100);
      
      // Find common dates - only include tickers with data
      const tickersToAnalyze = [...validAssets.map(a => a.symbol)];
      if (tickersWithData.includes(benchmark)) {
        tickersToAnalyze.push(benchmark);
      }
      
      const allDates = tickersToAnalyze
        .filter(t => tickerData[t] && tickerData[t].length > 0)
        .map(t => new Set(tickerData[t].map(r => r.date)));
      
      if (allDates.length === 0 || allDates[0].size === 0) {
        throw new Error('No trading data found in the selected date range');
      }
      
      const commonDates = [...allDates[0]].filter(d => allDates.every(s => s.has(d))).sort();
      
      if (commonDates.length < 20) {
        const dateInfo = tickersToAnalyze
          .filter(t => tickerData[t])
          .map(t => `${t}: ${tickerData[t][0]?.date?.slice(0, 10) || 'N/A'}`)
          .join(', ');
        throw new Error(`Only ${commonDates.length} overlapping days found (need 20+). Data starts: ${dateInfo}`);
      }
      
      setLoadingProgress(60);
      
      // Calculate portfolio values
      const portfolioValues: number[] = [initialCapital];
      const benchmarkValues: number[] = [initialCapital];
      const dailyReturns: number[] = [];
      const benchmarkReturns: number[] = [];
      
      for (let i = 1; i < commonDates.length; i++) {
        const date = commonDates[i];
        
        // Portfolio return
        let portfolioReturn = 0;
        for (const asset of validAssets) {
          const assetData = tickerData[asset.symbol]?.find(d => d.date === date);
          if (assetData) {
            portfolioReturn += (asset.weight / 100) * assetData.return;
          }
        }
        
        dailyReturns.push(portfolioReturn);
        portfolioValues.push(portfolioValues[portfolioValues.length - 1] * (1 + portfolioReturn));
        
        // Benchmark return
        const benchData = tickerData[benchmark]?.find(d => d.date === date);
        const benchReturn = benchData?.return || 0;
        benchmarkReturns.push(benchReturn);
        benchmarkValues.push(benchmarkValues[benchmarkValues.length - 1] * (1 + benchReturn));
      }
      
      setLoadingProgress(80);
      
      // Calculate metrics
      const years = commonDates.length / 252;
      const totalReturn = ((portfolioValues[portfolioValues.length - 1] - initialCapital) / initialCapital) * 100;
      const cagr = calculateCAGR(initialCapital, portfolioValues[portfolioValues.length - 1], years) * 100;
      const volatility = annualizedVolatility(dailyReturns) * 100;
      const sharpeRatio = calculateSharpeRatio(dailyReturns, 0.05);
      const sortinoRatio = calculateSortinoRatio(dailyReturns, 0.05);
      const { maxDrawdownPercent, drawdownSeries } = calculateMaxDrawdown(portfolioValues);
      const var95 = calculateVaR(dailyReturns, 0.95) * 100;
      const cvar95 = calculateCVaR(dailyReturns, 0.95) * 100;
      const { beta, alpha } = calculateBetaAlpha(dailyReturns, benchmarkReturns);
      
      // Additional metrics
      const calmarRatio = maxDrawdownPercent > 0 ? cagr / maxDrawdownPercent : 0;
      const treynorRatio = beta !== 0 ? (cagr - 5) / beta : 0;
      
      // Up/Down capture
      const upMonths = benchmarkReturns.filter(r => r > 0);
      const downMonths = benchmarkReturns.filter(r => r < 0);
      const upPortfolioReturns = dailyReturns.filter((_, i) => benchmarkReturns[i] > 0);
      const downPortfolioReturns = dailyReturns.filter((_, i) => benchmarkReturns[i] < 0);
      
      const upCapture = upMonths.length > 0 
        ? (arithmeticMean(upPortfolioReturns) / arithmeticMean(upMonths)) * 100 
        : 100;
      const downCapture = downMonths.length > 0 
        ? (arithmeticMean(downPortfolioReturns) / arithmeticMean(downMonths)) * 100 
        : 100;
      
      // Win rate
      const positiveReturns = dailyReturns.filter(r => r > 0);
      const negativeReturns = dailyReturns.filter(r => r < 0);
      const winRate = (positiveReturns.length / dailyReturns.length) * 100;
      const avgWin = arithmeticMean(positiveReturns) * 100;
      const avgLoss = arithmeticMean(negativeReturns) * 100;
      
      // Best/worst days
      const bestDay = Math.max(...dailyReturns) * 100;
      const worstDay = Math.min(...dailyReturns) * 100;
      
      // Yearly returns
      const yearlyReturns: { year: number; return: number; benchmark: number }[] = [];
      const yearGroups: Record<number, { portfolio: number[]; benchmark: number[] }> = {};
      
      for (let i = 0; i < commonDates.length; i++) {
        const year = new Date(commonDates[i]).getFullYear();
        if (!yearGroups[year]) yearGroups[year] = { portfolio: [], benchmark: [] };
        if (i > 0) {
          yearGroups[year].portfolio.push(dailyReturns[i - 1]);
          yearGroups[year].benchmark.push(benchmarkReturns[i - 1]);
        }
      }
      
      for (const [year, returns] of Object.entries(yearGroups)) {
        const portfolioYearReturn = returns.portfolio.reduce((a, b) => (1 + a) * (1 + b) - 1, 0) * 100;
        const benchmarkYearReturn = returns.benchmark.reduce((a, b) => (1 + a) * (1 + b) - 1, 0) * 100;
        yearlyReturns.push({ 
          year: parseInt(year), 
          return: portfolioYearReturn, 
          benchmark: benchmarkYearReturn 
        });
      }
      
      const bestYear = Math.max(...yearlyReturns.map(y => y.return));
      const worstYear = Math.min(...yearlyReturns.map(y => y.return));
      const positiveYears = yearlyReturns.filter(y => y.return > 0).length;
      
      // Monthly returns
      const monthlyReturns: { month: string; return: number }[] = [];
      const monthGroups: Record<string, number[]> = {};
      
      for (let i = 1; i < commonDates.length; i++) {
        const month = commonDates[i].substring(0, 7);
        if (!monthGroups[month]) monthGroups[month] = [];
        monthGroups[month].push(dailyReturns[i - 1]);
      }
      
      for (const [month, returns] of Object.entries(monthGroups)) {
        const monthReturn = returns.reduce((a, b) => (1 + a) * (1 + b) - 1, 0) * 100;
        monthlyReturns.push({ month, return: monthReturn });
      }
      
      const monthReturnsOnly = monthlyReturns.map(m => m.return);
      const bestMonth = Math.max(...monthReturnsOnly);
      const worstMonth = Math.min(...monthReturnsOnly);
      const positiveMonths = monthlyReturns.filter(m => m.return > 0).length;
      
      // Current drawdown
      const peak = Math.max(...portfolioValues);
      const currentValue = portfolioValues[portfolioValues.length - 1];
      const currentDrawdown = ((peak - currentValue) / peak) * 100;
      
      // Information ratio and tracking error
      const excessReturns = dailyReturns.map((r, i) => r - benchmarkReturns[i]);
      const trackingError = annualizedVolatility(excessReturns) * 100;
      const informationRatio = trackingError > 0 
        ? (arithmeticMean(excessReturns) * 252) / (trackingError / 100)
        : 0;
      
      // Ulcer Index (measure of downside volatility)
      const squaredDrawdowns = drawdownSeries.map(d => d * d);
      const ulcerIndex = Math.sqrt(arithmeticMean(squaredDrawdowns));
      const painIndex = Math.abs(arithmeticMean(drawdownSeries));
      
      setLoadingProgress(100);
      
      setResult({
        dates: commonDates,
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
          var95: var95 * 100,
          cvar95: cvar95 * 100,
          calmarRatio,
          treynorRatio,
          informationRatio,
          trackingError,
          upCapture,
          downCapture,
          winRate,
          avgWin,
          avgLoss,
          bestDay,
          worstDay,
          bestMonth,
          worstMonth,
          bestYear,
          worstYear,
          positiveMonths: (positiveMonths / monthlyReturns.length) * 100,
          positiveYears: (positiveYears / yearlyReturns.length) * 100,
          currentDrawdown,
          drawdownDuration: 0,
          recoveryTime: 0,
          ulcerIndex,
          painIndex,
        },
        yearlyReturns,
        monthlyReturns,
        rollingReturns: [],
      });
      
      toast.success('Backtest complete', {
        description: `${commonDates.length} days analyzed`,
      });
      
    } catch (error) {
      console.error('Backtest error:', error);
      toast.error('Backtest failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsLoading(false);
    }
  }, [assets, benchmark, period, initialCapital, isValid]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Handle Visual Strategy Builder backtest
  // ─────────────────────────────────────────────────────────────────────────────
  
  const handleVisualBuilderBacktest = useCallback(async (params: { 
    strategy: string; 
    ticker: string; 
    params: Record<string, number | string | undefined> 
  }) => {
    setIsLoading(true);
    setLoadingProgress(10);
    
    try {
      const periodYears = PERIODS.find(p => p.value === period)?.years || 5;
      const endDate = new Date();
      const startDate = new Date();
      startDate.setFullYear(endDate.getFullYear() - periodYears);
      
      setLoadingProgress(20);
      
      // Call the strategy backtest edge function
      const { data, error } = await supabase.functions.invoke('strategy-backtest', {
        body: {
          ticker: params.ticker,
          strategy: params.strategy,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          initialCapital,
          params: {
            ...params.params,
            stopLossPercent: params.params.stopLoss,
            takeProfitPercent: params.params.takeProfit,
          }
        }
      });
      
      setLoadingProgress(80);
      
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Backtest failed');
      
      const backtestResult = data.result;
      
      // Convert strategy backtest result to portfolio format for display
      const dates = backtestResult.trades?.map((t: any) => t.entryDate) || [];
      const portfolioValues = dates.map((_: any, i: number) => 
        initialCapital * (1 + (backtestResult.metrics?.netProfit || 0) / 100 * (i / Math.max(dates.length - 1, 1)))
      );
      
      setResult({
        dates,
        portfolioValues,
        benchmarkValues: portfolioValues.map((v: number) => v * 0.95), // Placeholder
        dailyReturns: [],
        benchmarkReturns: [],
        drawdownSeries: portfolioValues.map(() => 0),
        metrics: {
          totalReturn: backtestResult.metrics?.netProfit || 0,
          cagr: backtestResult.metrics?.cagr || 0,
          volatility: backtestResult.metrics?.annualizedVolatility || 0,
          sharpeRatio: backtestResult.metrics?.sharpeRatio || 0,
          sortinoRatio: backtestResult.metrics?.sortinoRatio || 0,
          maxDrawdown: backtestResult.metrics?.maxDrawdown || 0,
          var95: 0,
          cvar95: 0,
          alpha: 0,
          beta: 0,
          calmarRatio: 0,
          treynorRatio: 0,
          informationRatio: 0,
          trackingError: 0,
          upCapture: 0,
          downCapture: 0,
          winRate: backtestResult.metrics?.winRate || 0,
          avgWin: backtestResult.metrics?.avgWin || 0,
          avgLoss: backtestResult.metrics?.avgLoss || 0,
          bestDay: 0,
          worstDay: 0,
          bestMonth: 0,
          worstMonth: 0,
          bestYear: 0,
          worstYear: 0,
          positiveMonths: 0,
          positiveYears: 0,
          currentDrawdown: 0,
          drawdownDuration: 0,
          recoveryTime: 0,
          ulcerIndex: 0,
          painIndex: 0,
        },
        yearlyReturns: [],
        monthlyReturns: [],
        rollingReturns: [],
      });
      
      toast.success('Strategy backtest complete', {
        description: `${backtestResult.metrics?.totalTrades || 0} trades analyzed`,
      });
      
      // Switch to portfolio tab to show results
      setActiveLeftTab('portfolio');
      
    } catch (error) {
      console.error('Visual builder backtest error:', error);
      toast.error('Backtest failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsLoading(false);
      setLoadingProgress(100);
    }
  }, [period, initialCapital]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Chart data
  // ─────────────────────────────────────────────────────────────────────────────
  
  const chartData = useMemo(() => {
    if (!result) return [];
    
    return result.dates.map((date, i) => ({
      date,
      portfolio: result.portfolioValues[i],
      benchmark: result.benchmarkValues[i],
      drawdown: result.drawdownSeries[i],
    }));
  }, [result]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────
  
  return (
    <div 
      ref={containerRef}
      className={cn(
        "h-screen flex flex-col overflow-hidden",
        "bg-[rgb(8,12,16)] text-[rgb(230,237,243)]",
        "font-sans selection:bg-[rgb(56,139,253)] selection:text-white"
      )}
    >
      {/* ═══════════════════════════════════════════════════════════════════════════
          HEADER
          ═══════════════════════════════════════════════════════════════════════════ */}
      <header className="flex-shrink-0 h-12 px-4 flex items-center justify-between border-b border-[rgb(33,38,45)] bg-[rgb(13,17,23)]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-[rgb(56,139,253)] to-[rgb(35,197,94)] flex items-center justify-center">
              <BarChart3 className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-semibold text-sm tracking-tight">Portfolio Lab</span>
          </div>
          
          <div className="h-4 w-px bg-[rgb(33,38,45)]" />
          
          {/* Period selector */}
          <div className="flex items-center gap-1">
            {PERIODS.map(p => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={cn(
                  "px-2 py-1 text-[10px] font-medium rounded transition-colors",
                  period === p.value
                    ? "bg-[rgb(56,139,253)] text-white"
                    : "text-[rgb(139,148,158)] hover:text-[rgb(230,237,243)] hover:bg-[rgb(27,32,40)]"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          
          <div className="h-4 w-px bg-[rgb(33,38,45)]" />
          
          {/* Benchmark selector */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-[rgb(87,96,106)] mr-1">vs</span>
            {BENCHMARKS.map(b => (
              <button
                key={b.value}
                onClick={() => setBenchmark(b.value)}
                className={cn(
                  "px-2 py-1 text-[10px] font-mono rounded transition-colors",
                  benchmark === b.value
                    ? "bg-[rgb(33,38,45)] text-[rgb(230,237,243)]"
                    : "text-[rgb(87,96,106)] hover:text-[rgb(139,148,158)]"
                )}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Weight indicator */}
          <div className={cn(
            "flex items-center gap-2 px-3 py-1 rounded text-xs font-mono",
            isValid
              ? "bg-[rgba(35,197,94,0.1)] text-[rgb(35,197,94)]"
              : "bg-[rgba(248,81,73,0.1)] text-[rgb(248,81,73)]"
          )}>
            <Percent className="h-3 w-3" />
            {totalWeight.toFixed(0)}%
            {!isValid && totalWeight !== 100 && (
              <span className="text-[10px]">
                ({totalWeight > 100 ? '+' : ''}{(totalWeight - 100).toFixed(0)})
              </span>
            )}
          </div>
          
          {/* Shortcuts hint */}
          <button
            onClick={() => setShowShortcuts(true)}
            className="flex items-center gap-1 text-[10px] text-[rgb(87,96,106)] hover:text-[rgb(139,148,158)]"
          >
            <Kbd>?</Kbd>
            <span>Shortcuts</span>
          </button>
          
          {/* Run button */}
          <Button
            onClick={runBacktest}
            disabled={!isValid || isLoading}
            className={cn(
              "h-8 px-4 gap-2 text-xs font-semibold",
              "bg-[rgb(35,197,94)] hover:bg-[rgb(28,158,75)]",
              "disabled:bg-[rgb(33,38,45)] disabled:text-[rgb(87,96,106)]"
            )}
          >
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5 fill-current" />
            )}
            RUN
            <Kbd className="ml-1">⌘↵</Kbd>
          </Button>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════════════════
          MAIN CONTENT
          ═══════════════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex min-h-0">
        
        {/* ─────────────────────────────────────────────────────────────────────────
            LEFT PANEL - Portfolio Builder with Side Tabs
            ───────────────────────────────────────────────────────────────────────── */}
        <div className="w-80 flex-shrink-0 border-r border-[rgb(33,38,45)] flex bg-[rgb(13,17,23)]">
          
          {/* Side Tab Navigation */}
          <div className="w-10 flex-shrink-0 border-r border-[rgb(33,38,45)] flex flex-col py-2 bg-[rgb(10,13,18)]">
            <button
              onClick={() => setActiveLeftTab('portfolio')}
              className={cn(
                "w-full aspect-square flex items-center justify-center transition-all relative",
                activeLeftTab === 'portfolio'
                  ? "text-[rgb(56,139,253)]"
                  : "text-[rgb(87,96,106)] hover:text-[rgb(139,148,158)]"
              )}
              title="Portfolio"
            >
              {activeLeftTab === 'portfolio' && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-[rgb(56,139,253)] rounded-r" />
              )}
              <Layers className="h-4 w-4" />
            </button>
            <button
              onClick={() => setActiveLeftTab('templates')}
              className={cn(
                "w-full aspect-square flex items-center justify-center transition-all relative",
                activeLeftTab === 'templates'
                  ? "text-[rgb(56,139,253)]"
                  : "text-[rgb(87,96,106)] hover:text-[rgb(139,148,158)]"
              )}
              title="Templates"
            >
              {activeLeftTab === 'templates' && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-[rgb(56,139,253)] rounded-r" />
              )}
              <BarChart3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setActiveLeftTab('strategy-builder')}
              className={cn(
                "w-full aspect-square flex items-center justify-center transition-all relative",
                activeLeftTab === 'strategy-builder'
                  ? "text-[rgb(56,139,253)]"
                  : "text-[rgb(87,96,106)] hover:text-[rgb(139,148,158)]"
              )}
              title="Visual Strategy Builder"
            >
              {activeLeftTab === 'strategy-builder' && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-[rgb(56,139,253)] rounded-r" />
              )}
              <Workflow className="h-4 w-4" />
            </button>
          </div>
          
          {/* Tab Content */}
          <div className="flex-1 flex flex-col min-w-0">
            {activeLeftTab === 'portfolio' ? (
              <>
                {/* Search */}
                <div className="p-3 border-b border-[rgb(33,38,45)]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgb(87,96,106)]" />
                    <Input
                      ref={searchInputRef}
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      placeholder="Search ticker..."
                      className={cn(
                        "h-9 pl-9 pr-16 bg-[rgb(17,21,28)] border-[rgb(33,38,45)]",
                        "text-sm font-mono placeholder:text-[rgb(87,96,106)]",
                        "focus:border-[rgb(56,139,253)] focus:ring-1 focus:ring-[rgb(56,139,253)]"
                      )}
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <Kbd>⌘</Kbd>
                      <Kbd>K</Kbd>
                    </div>
                  </div>
                  
                  {/* Search results dropdown */}
                  {searchResults.length > 0 && (
                    <div className="absolute mt-1 w-[calc(100%-64px)] bg-[rgb(17,21,28)] border border-[rgb(33,38,45)] rounded-lg shadow-xl z-50">
                      {searchResults.map((r, i) => (
                        <button
                          key={r.symbol}
                          onClick={() => addAsset(r.symbol, r.name)}
                          className={cn(
                            "w-full px-3 py-2 flex items-center justify-between text-left",
                            "hover:bg-[rgb(22,27,34)] transition-colors",
                            i === 0 && "rounded-t-lg",
                            i === searchResults.length - 1 && "rounded-b-lg"
                          )}
                        >
                          <div>
                            <span className="font-mono font-semibold text-sm">{r.symbol}</span>
                            {r.name && <span className="text-[rgb(87,96,106)] text-xs ml-2">{r.name}</span>}
                          </div>
                          <Plus className="h-4 w-4 text-[rgb(87,96,106)]" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Quick add popular tickers */}
                <div className="p-3 border-b border-[rgb(33,38,45)]">
                  <p className="text-[9px] uppercase tracking-wider text-[rgb(87,96,106)] mb-2">Quick Add</p>
                  <div className="flex flex-wrap gap-1">
                    {POPULAR_TICKERS.slice(0, 8).map(t => (
                      <button
                        key={t.symbol}
                        onClick={() => addAsset(t.symbol, t.name)}
                        disabled={assets.some(a => a.symbol === t.symbol)}
                        className={cn(
                          "px-2 py-1 text-[10px] font-mono rounded border transition-colors",
                          assets.some(a => a.symbol === t.symbol)
                            ? "border-[rgb(33,38,45)] text-[rgb(87,96,106)] cursor-not-allowed"
                            : "border-[rgb(33,38,45)] text-[rgb(139,148,158)] hover:border-[rgb(56,139,253)] hover:text-[rgb(56,139,253)]"
                        )}
                      >
                        {t.symbol}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Portfolio holdings */}
                <ScrollArea className="flex-1">
                  <div className="p-3 space-y-2">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[9px] uppercase tracking-wider text-[rgb(87,96,106)]">
                        Holdings ({assets.length})
                      </p>
                      {assets.length > 1 && (
                        <div className="flex gap-1">
                          <button
                            onClick={equalizeWeights}
                            className="text-[9px] text-[rgb(56,139,253)] hover:underline"
                          >
                            Equal
                          </button>
                          <span className="text-[rgb(33,38,45)]">|</span>
                          <button
                            onClick={normalizeWeights}
                            className="text-[9px] text-[rgb(56,139,253)] hover:underline"
                          >
                            Normalize
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {assets.length === 0 ? (
                      <div className="py-8 text-center">
                        <div className="w-10 h-10 rounded-full bg-[rgb(17,21,28)] mx-auto mb-3 flex items-center justify-center">
                          <Layers className="h-5 w-5 text-[rgb(87,96,106)]" />
                        </div>
                        <p className="text-xs text-[rgb(87,96,106)]">No assets added</p>
                        <p className="text-[10px] text-[rgb(87,96,106)] mt-1">Search or pick from templates</p>
                      </div>
                    ) : (
                      assets.map(asset => (
                        <div
                          key={asset.symbol}
                          className="p-3 bg-[rgb(17,21,28)] rounded-lg border border-[rgb(33,38,45)] group hover:border-[rgb(48,54,61)] transition-colors"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2 flex-1">
                              <div
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: asset.color }}
                              />
                              <Input
                                value={asset.symbol}
                                onChange={(e) => {
                                  const newSymbol = e.target.value.toUpperCase();
                                  setAssets(prev => prev.map(a => 
                                    a.symbol === asset.symbol 
                                      ? { ...a, symbol: newSymbol, name: undefined }
                                      : a
                                  ));
                                }}
                                onBlur={(e) => {
                                  const symbol = e.target.value.toUpperCase().trim();
                                  if (!symbol) {
                                    removeAsset(asset.symbol);
                                  }
                                }}
                                className={cn(
                                  "h-7 w-20 px-2 font-mono font-bold text-sm uppercase",
                                  "bg-transparent border-transparent",
                                  "hover:bg-[rgb(22,27,34)] hover:border-[rgb(48,54,61)]",
                                  "focus:bg-[rgb(13,17,23)] focus:border-[rgb(56,139,253)]",
                                  "transition-all cursor-text"
                                )}
                                placeholder="TICKER"
                              />
                              {asset.name && (
                                <span className="text-[10px] text-[rgb(87,96,106)] truncate max-w-[80px]">
                                  {asset.name}
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => removeAsset(asset.symbol)}
                              className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-[rgb(248,81,73,0.15)] rounded transition-all"
                              title="Remove asset"
                            >
                              <X className="h-3.5 w-3.5 text-[rgb(248,81,73)]" />
                            </button>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateWeight(asset.symbol, Math.max(0, asset.weight - 5))}
                              className="p-1.5 hover:bg-[rgb(27,32,40)] rounded transition-colors"
                              title="-5%"
                            >
                              <Minus className="h-3.5 w-3.5 text-[rgb(139,148,158)]" />
                            </button>
                            
                            <div className="flex-1 flex items-center gap-2">
                              <div className="relative">
                                <Input
                                  type="number"
                                  value={asset.weight}
                                  onChange={(e) => updateWeight(asset.symbol, parseFloat(e.target.value) || 0)}
                                  min={0}
                                  max={100}
                                  className="h-8 w-16 text-center font-mono text-sm bg-[rgb(13,17,23)] border-[rgb(33,38,45)] pr-5"
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[rgb(87,96,106)]">%</span>
                              </div>
                              <div className="flex-1 h-2 bg-[rgb(27,32,40)] rounded-full overflow-hidden cursor-pointer group/slider"
                                onClick={(e) => {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const percent = Math.round(((e.clientX - rect.left) / rect.width) * 100);
                                  updateWeight(asset.symbol, Math.max(0, Math.min(100, percent)));
                                }}
                              >
                                <div
                                  className="h-full rounded-full transition-all group-hover/slider:opacity-90"
                                  style={{ 
                                    width: `${Math.min(100, asset.weight)}%`,
                                    backgroundColor: asset.color,
                                  }}
                                />
                              </div>
                            </div>
                            
                            <button
                              onClick={() => updateWeight(asset.symbol, Math.min(100, asset.weight + 5))}
                              className="p-1.5 hover:bg-[rgb(27,32,40)] rounded transition-colors"
                              title="+5%"
                            >
                              <Plus className="h-3.5 w-3.5 text-[rgb(139,148,158)]" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
                
                {/* Allocation Chart */}
                {assets.length > 0 && (
                  <div className="border-t border-[rgb(33,38,45)] p-3">
                    <p className="text-[9px] uppercase tracking-wider text-[rgb(87,96,106)] mb-2">Allocation</p>
                    <AllocationDonut 
                      data={assets.map(a => ({ symbol: a.symbol, weight: a.weight, color: a.color }))} 
                      className="h-32"
                    />
                  </div>
                )}
              </>
            ) : activeLeftTab === 'templates' ? (
              /* Templates Tab */
              <ScrollArea className="flex-1">
                <div className="p-3">
                  <p className="text-[9px] uppercase tracking-wider text-[rgb(87,96,106)] mb-3">Portfolio Templates</p>
                  <div className="space-y-2">
                    {TEMPLATES.map(t => (
                      <button
                        key={t.name}
                        onClick={() => {
                          applyTemplate(t);
                          setActiveLeftTab('portfolio');
                        }}
                        className="w-full p-3 text-left rounded-lg bg-[rgb(17,21,28)] border border-[rgb(33,38,45)] hover:border-[rgb(48,54,61)] transition-all group"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{t.name}</span>
                          <span className="text-[10px] text-[rgb(56,139,253)] opacity-0 group-hover:opacity-100 transition-opacity">
                            Apply →
                          </span>
                        </div>
                        <p className="text-[11px] text-[rgb(87,96,106)] mb-2">{t.description}</p>
                        <div className="flex flex-wrap gap-1">
                          {t.assets.slice(0, 4).map(a => (
                            <span key={a.symbol} className="px-1.5 py-0.5 text-[9px] font-mono bg-[rgb(27,32,40)] rounded text-[rgb(139,148,158)]">
                              {a.symbol} {a.weight}%
                            </span>
                          ))}
                          {t.assets.length > 4 && (
                            <span className="px-1.5 py-0.5 text-[9px] font-mono text-[rgb(87,96,106)]">
                              +{t.assets.length - 4} more
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </ScrollArea>
            ) : (
              /* Visual Strategy Builder Tab */
              <div className="flex-1 flex flex-col min-h-0 bg-[rgb(8,12,16)]">
                <VisualStrategyBuilder 
                  embedded 
                  onRunBacktest={handleVisualBuilderBacktest}
                />
              </div>
            )}
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────────────────
            CENTER - Results
            ───────────────────────────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">
          {result ? (
            <>
              {/* Metrics bar */}
              <div className="flex-shrink-0 p-3 border-b border-[rgb(33,38,45)] bg-[rgb(13,17,23)]">
                <div className="grid grid-cols-6 gap-2">
                  <MetricCell
                    label="Total Return"
                    value={`${result.metrics.totalReturn >= 0 ? '+' : ''}${result.metrics.totalReturn.toFixed(1)}%`}
                    size="sm"
                    variant={result.metrics.totalReturn >= 0 ? 'default' : 'danger'}
                  />
                  <MetricCell
                    label="CAGR"
                    value={`${result.metrics.cagr >= 0 ? '+' : ''}${result.metrics.cagr.toFixed(1)}%`}
                    size="sm"
                  />
                  <MetricCell
                    label="Volatility"
                    value={`${result.metrics.volatility.toFixed(1)}%`}
                    size="sm"
                  />
                  <MetricCell
                    label="Sharpe"
                    value={result.metrics.sharpeRatio.toFixed(2)}
                    size="sm"
                    variant={result.metrics.sharpeRatio >= 1 ? 'highlight' : 'default'}
                  />
                  <MetricCell
                    label="Max DD"
                    value={`-${result.metrics.maxDrawdown.toFixed(1)}%`}
                    size="sm"
                    variant={result.metrics.maxDrawdown > 30 ? 'danger' : result.metrics.maxDrawdown > 20 ? 'warning' : 'default'}
                  />
                  <MetricCell
                    label="Final Value"
                    value={`$${(result.portfolioValues[result.portfolioValues.length - 1] / 1000).toFixed(0)}k`}
                    subValue={`from $${(initialCapital / 1000).toFixed(0)}k`}
                    size="sm"
                  />
                </div>
              </div>
              
              {/* Chart tabs */}
              <div className="flex-1 flex flex-col min-h-0">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                  <div className="flex-shrink-0 px-3 pt-2 border-b border-[rgb(33,38,45)] bg-[rgb(13,17,23)]">
                    <TabsList className="h-8 bg-transparent gap-1 p-0">
                      {[
                        { value: 'overview', label: 'Growth' },
                        { value: 'drawdown', label: 'Drawdown' },
                        { value: 'yearly', label: 'Annual' },
                        { value: 'monthly', label: 'Monthly' },
                      ].map(tab => (
                        <TabsTrigger
                          key={tab.value}
                          value={tab.value}
                          className={cn(
                            "h-8 px-3 text-xs font-medium rounded-none border-b-2 border-transparent",
                            "data-[state=active]:border-[rgb(56,139,253)] data-[state=active]:text-[rgb(230,237,243)]",
                            "text-[rgb(87,96,106)] hover:text-[rgb(139,148,158)]"
                          )}
                        >
                          {tab.label}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </div>
                  
                  <TabsContent value="overview" className="flex-1 p-3 mt-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="rgb(56,139,253)" stopOpacity={0.3}/>
                            <stop offset="100%" stopColor="rgb(56,139,253)" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgb(33,38,45)" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fill: 'rgb(87,96,106)', fontSize: 10, fontFamily: 'monospace' }}
                          tickFormatter={(v) => new Date(v).getFullYear().toString()}
                          axisLine={{ stroke: 'rgb(33,38,45)' }}
                          tickLine={{ stroke: 'rgb(33,38,45)' }}
                        />
                        <YAxis 
                          tick={{ fill: 'rgb(87,96,106)', fontSize: 10, fontFamily: 'monospace' }}
                          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                          width={50}
                          axisLine={{ stroke: 'rgb(33,38,45)' }}
                          tickLine={{ stroke: 'rgb(33,38,45)' }}
                        />
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: 'rgb(17,21,28)',
                            border: '1px solid rgb(33,38,45)',
                            borderRadius: '8px',
                            fontSize: 11,
                            fontFamily: 'monospace',
                          }}
                          formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                          labelFormatter={(label) => new Date(label).toLocaleDateString()}
                        />
                        <Area
                          type="monotone"
                          dataKey="benchmark"
                          stroke="rgb(87,96,106)"
                          strokeWidth={1}
                          fill="none"
                          strokeDasharray="4 4"
                        />
                        <Area
                          type="monotone"
                          dataKey="portfolio"
                          stroke="rgb(56,139,253)"
                          strokeWidth={2}
                          fill="url(#portfolioGrad)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </TabsContent>
                  
                  <TabsContent value="drawdown" className="flex-1 p-3 mt-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="rgb(248,81,73)" stopOpacity={0.3}/>
                            <stop offset="100%" stopColor="rgb(248,81,73)" stopOpacity={0.05}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgb(33,38,45)" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fill: 'rgb(87,96,106)', fontSize: 10, fontFamily: 'monospace' }}
                          tickFormatter={(v) => new Date(v).getFullYear().toString()}
                          axisLine={{ stroke: 'rgb(33,38,45)' }}
                        />
                        <YAxis 
                          tick={{ fill: 'rgb(87,96,106)', fontSize: 10, fontFamily: 'monospace' }}
                          tickFormatter={(v) => `${v.toFixed(0)}%`}
                          domain={['auto', 0]}
                          width={40}
                          axisLine={{ stroke: 'rgb(33,38,45)' }}
                        />
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: 'rgb(17,21,28)',
                            border: '1px solid rgb(33,38,45)',
                            borderRadius: '8px',
                            fontSize: 11,
                            fontFamily: 'monospace',
                          }}
                          formatter={(value: number) => [`${value.toFixed(2)}%`, 'Drawdown']}
                          labelFormatter={(label) => new Date(label).toLocaleDateString()}
                        />
                        <ReferenceLine 
                          y={-result.metrics.maxDrawdown} 
                          stroke="rgb(248,81,73)" 
                          strokeDasharray="5 5"
                          label={{ 
                            value: `Max: -${result.metrics.maxDrawdown.toFixed(1)}%`, 
                            fill: 'rgb(248,81,73)', 
                            fontSize: 10,
                            fontFamily: 'monospace',
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="drawdown"
                          stroke="rgb(248,81,73)"
                          strokeWidth={1.5}
                          fill="url(#ddGrad)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </TabsContent>
                  
                  <TabsContent value="yearly" className="flex-1 p-3 mt-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={result.yearlyReturns}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgb(33,38,45)" />
                        <XAxis 
                          dataKey="year" 
                          tick={{ fill: 'rgb(87,96,106)', fontSize: 10, fontFamily: 'monospace' }}
                          axisLine={{ stroke: 'rgb(33,38,45)' }}
                        />
                        <YAxis 
                          tick={{ fill: 'rgb(87,96,106)', fontSize: 10, fontFamily: 'monospace' }}
                          tickFormatter={(v) => `${v.toFixed(0)}%`}
                          width={40}
                          axisLine={{ stroke: 'rgb(33,38,45)' }}
                        />
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: 'rgb(17,21,28)',
                            border: '1px solid rgb(33,38,45)',
                            borderRadius: '8px',
                            fontSize: 11,
                            fontFamily: 'monospace',
                          }}
                          formatter={(value: number, name: string) => [
                            `${value.toFixed(1)}%`,
                            name === 'return' ? 'Portfolio' : 'Benchmark'
                          ]}
                        />
                        <ReferenceLine y={0} stroke="rgb(48,54,61)" />
                        <Bar 
                          dataKey="return" 
                          radius={[2, 2, 0, 0]}
                          name="return"
                        >
                          {result.yearlyReturns.map((entry, index) => (
                            <rect
                              key={index}
                              fill={entry.return >= 0 ? 'rgb(35,197,94)' : 'rgb(248,81,73)'}
                            />
                          ))}
                        </Bar>
                        <Line 
                          type="monotone" 
                          dataKey="benchmark" 
                          stroke="rgb(139,148,158)" 
                          strokeWidth={2}
                          dot={{ fill: 'rgb(139,148,158)', r: 3 }}
                          name="benchmark"
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </TabsContent>
                  
                  <TabsContent value="monthly" className="flex-1 p-3 mt-0 overflow-auto">
                    <div className="grid grid-cols-13 gap-0.5 text-center">
                      <div className="text-[9px] font-medium text-[rgb(87,96,106)]">Year</div>
                      {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(m => (
                        <div key={m} className="text-[9px] font-medium text-[rgb(87,96,106)]">{m}</div>
                      ))}
                      
                      {/* Group monthly returns by year */}
                      {Object.entries(
                        result.monthlyReturns.reduce((acc, m) => {
                          const [year, month] = m.month.split('-');
                          if (!acc[year]) acc[year] = {};
                          acc[year][parseInt(month)] = m.return;
                          return acc;
                        }, {} as Record<string, Record<number, number>>)
                      ).map(([year, months]) => (
                        <React.Fragment key={year}>
                          <div className="text-[10px] font-mono text-[rgb(139,148,158)] py-1">{year}</div>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                            <HeatMapCell
                              key={m}
                              value={months[m] || 0}
                              min={-15}
                              max={15}
                              format={(v) => v !== 0 ? `${v.toFixed(1)}` : '-'}
                            />
                          ))}
                        </React.Fragment>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </>
          ) : (
            /* Empty state */
            <div className="flex-1 flex items-center justify-center bg-[rgb(8,12,16)]">
              <div className="text-center max-w-md px-6">
                <div className="w-16 h-16 rounded-2xl bg-[rgb(17,21,28)] mx-auto mb-4 flex items-center justify-center">
                  <Activity className="h-8 w-8 text-[rgb(87,96,106)]" />
                </div>
                <h3 className="text-lg font-semibold text-[rgb(230,237,243)] mb-2">
                  Build Your Portfolio
                </h3>
                <p className="text-sm text-[rgb(87,96,106)] mb-6">
                  Add assets to your portfolio, adjust weights, then run a backtest to see historical performance.
                </p>
                <div className="flex items-center justify-center gap-2 text-[10px] text-[rgb(87,96,106)]">
                  <Kbd>⌘</Kbd>
                  <Kbd>K</Kbd>
                  <span>to search</span>
                  <span className="mx-2">•</span>
                  <Kbd>⌘</Kbd>
                  <Kbd>↵</Kbd>
                  <span>to run</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ─────────────────────────────────────────────────────────────────────────
            RIGHT PANEL - Advanced Metrics (only when results exist)
            ───────────────────────────────────────────────────────────────────────── */}
        {result && (
          <div className="w-72 flex-shrink-0 border-l border-[rgb(33,38,45)] bg-[rgb(13,17,23)] overflow-y-auto">
            <PanelHeader title="Risk Analytics" />
            
            <div className="p-3 space-y-4">
              {/* Overall Risk Score */}
              <RiskScore 
                score={Math.max(0, Math.min(100, 
                  50 + 
                  result.metrics.sharpeRatio * 15 + 
                  (result.metrics.alpha > 0 ? 10 : -5) +
                  (result.metrics.maxDrawdown < 20 ? 15 : result.metrics.maxDrawdown < 30 ? 5 : -10) +
                  (result.metrics.sortinoRatio > 1 ? 10 : 0)
                ))}
                label="Portfolio Score"
                description="Based on risk-adjusted returns, drawdown, and alpha"
              />
              
              {/* Risk-adjusted returns */}
              <div>
                <SectionDivider label="Risk-Adjusted" className="mb-2" />
                <div className="grid grid-cols-2 gap-2">
                  <MetricCell label="Sharpe" value={result.metrics.sharpeRatio.toFixed(2)} size="sm" />
                  <MetricCell label="Sortino" value={result.metrics.sortinoRatio.toFixed(2)} size="sm" />
                  <MetricCell label="Calmar" value={result.metrics.calmarRatio.toFixed(2)} size="sm" />
                  <MetricCell label="Treynor" value={result.metrics.treynorRatio.toFixed(2)} size="sm" />
                </div>
              </div>
              
              {/* Drawdown metrics */}
              <div>
                <SectionDivider label="Drawdown" className="mb-2" />
                <div className="grid grid-cols-2 gap-2">
                  <MetricCell 
                    label="Max DD" 
                    value={`-${result.metrics.maxDrawdown.toFixed(1)}%`} 
                    size="sm"
                    variant="danger"
                  />
                  <MetricCell 
                    label="Current DD" 
                    value={`-${result.metrics.currentDrawdown.toFixed(1)}%`} 
                    size="sm"
                    variant={result.metrics.currentDrawdown > 10 ? 'warning' : 'default'}
                  />
                  <MetricCell label="Ulcer Index" value={result.metrics.ulcerIndex.toFixed(2)} size="sm" />
                  <MetricCell label="Pain Index" value={result.metrics.painIndex.toFixed(2)} size="sm" />
                </div>
              </div>
              
              {/* Benchmark comparison */}
              <div>
                <SectionDivider label="vs Benchmark" className="mb-2" />
                <div className="grid grid-cols-2 gap-2">
                  <MetricCell label="Beta" value={result.metrics.beta.toFixed(2)} size="sm" />
                  <MetricCell 
                    label="Alpha" 
                    value={`${result.metrics.alpha >= 0 ? '+' : ''}${result.metrics.alpha.toFixed(2)}%`} 
                    size="sm"
                    variant={result.metrics.alpha >= 0 ? 'highlight' : 'danger'}
                  />
                  <MetricCell label="Up Capture" value={`${result.metrics.upCapture.toFixed(0)}%`} size="sm" />
                  <MetricCell label="Down Capture" value={`${result.metrics.downCapture.toFixed(0)}%`} size="sm" />
                  <MetricCell label="Info Ratio" value={result.metrics.informationRatio.toFixed(2)} size="sm" />
                  <MetricCell label="Track Error" value={`${result.metrics.trackingError.toFixed(1)}%`} size="sm" />
                </div>
              </div>
              
              {/* Tail risk */}
              <div>
                <SectionDivider label="Tail Risk" className="mb-2" />
                <div className="grid grid-cols-2 gap-2">
                  <MetricCell label="VaR 95%" value={`${result.metrics.var95.toFixed(2)}%`} size="sm" />
                  <MetricCell label="CVaR 95%" value={`${result.metrics.cvar95.toFixed(2)}%`} size="sm" />
                </div>
              </div>
              
              {/* Return distribution */}
              <div>
                <SectionDivider label="Returns" className="mb-2" />
                <div className="grid grid-cols-2 gap-2">
                  <MetricCell label="Win Rate" value={`${result.metrics.winRate.toFixed(0)}%`} size="sm" />
                  <MetricCell label="Avg Win" value={`+${result.metrics.avgWin.toFixed(2)}%`} size="sm" />
                  <MetricCell label="Avg Loss" value={`${result.metrics.avgLoss.toFixed(2)}%`} size="sm" />
                  <MetricCell 
                    label="Best Day" 
                    value={`+${result.metrics.bestDay.toFixed(2)}%`} 
                    size="sm"
                    variant="highlight"
                  />
                  <MetricCell 
                    label="Worst Day" 
                    value={`${result.metrics.worstDay.toFixed(2)}%`} 
                    size="sm"
                    variant="danger"
                  />
                  <MetricCell 
                    label="Best Month" 
                    value={`+${result.metrics.bestMonth.toFixed(1)}%`} 
                    size="sm"
                  />
                  <MetricCell 
                    label="Worst Month" 
                    value={`${result.metrics.worstMonth.toFixed(1)}%`} 
                    size="sm"
                  />
                  <MetricCell 
                    label="Best Year" 
                    value={`+${result.metrics.bestYear.toFixed(1)}%`} 
                    size="sm"
                  />
                  <MetricCell 
                    label="Worst Year" 
                    value={`${result.metrics.worstYear.toFixed(1)}%`} 
                    size="sm"
                  />
                  <MetricCell 
                    label="% Pos Months" 
                    value={`${result.metrics.positiveMonths.toFixed(0)}%`} 
                    size="sm"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════════
          KEYBOARD SHORTCUTS MODAL
          ═══════════════════════════════════════════════════════════════════════════ */}
      {showShortcuts && (
        <div 
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          onClick={() => setShowShortcuts(false)}
        >
          <div 
            className="bg-[rgb(17,21,28)] border border-[rgb(33,38,45)] rounded-xl p-6 max-w-md w-full mx-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Keyboard Shortcuts</h3>
              <button
                onClick={() => setShowShortcuts(false)}
                className="p-1 hover:bg-[rgb(27,32,40)] rounded"
              >
                <X className="h-4 w-4 text-[rgb(139,148,158)]" />
              </button>
            </div>
            
            <div className="space-y-3">
              {[
                { keys: ['⌘', 'K'], label: 'Focus search' },
                { keys: ['⌘', '↵'], label: 'Run backtest' },
                { keys: ['Esc'], label: 'Clear search / Close modal' },
                { keys: ['?'], label: 'Toggle shortcuts' },
              ].map((shortcut, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-[rgb(139,148,158)]">{shortcut.label}</span>
                  <div className="flex items-center gap-1">
                    {shortcut.keys.map((k, j) => (
                      <Kbd key={j}>{k}</Kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          LOADING OVERLAY
          ═══════════════════════════════════════════════════════════════════════════ */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[rgb(17,21,28)] border border-[rgb(33,38,45)] rounded-xl p-6 w-80">
            <div className="flex items-center gap-3 mb-4">
              <Loader2 className="h-5 w-5 animate-spin text-[rgb(56,139,253)]" />
              <span className="text-sm font-medium">Running Backtest...</span>
            </div>
            <ProgressBar value={loadingProgress} variant="default" showLabel />
            <p className="text-[10px] text-[rgb(87,96,106)] mt-3">
              Analyzing {assets.length} assets over {PERIODS.find(p => p.value === period)?.label}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfessionalBacktester;
