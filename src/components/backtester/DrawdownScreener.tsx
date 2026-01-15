/**
 * Risk-Based Screener - Suggest portfolios based on multiple risk metrics
 * A visually stunning interface for screening portfolios by risk appetite
 * Now with real backtested data from the portfolio-screener edge function
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingDown,
  TrendingUp,
  Shield,
  Zap,
  Target,
  Info,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  DollarSign,
  Clock,
  Scale,
  BarChart3,
  Flame,
  Snowflake,
  AlertTriangle,
  Trash2,
  Plus,
  Activity,
  Gauge,
  Award,
  Loader2,
  RefreshCw,
  History,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { PortfolioAllocation, AssetClass, ASSET_CLASS_ETFS } from '@/types/portfolio';
import { POLYGON_CONFIG } from '@/config/apiConfig';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Screened portfolio result from edge function
interface ScreenedPortfolio {
  id: string;
  name: string;
  description: string;
  allocations: { symbol: string; weight: number; name: string }[];
  metrics: {
    annualizedReturn: number;
    maxDrawdown: number;
    volatility: number;
    sharpe: number;
    maxGain: number;
    calmar: number;
    sortino: number;
  };
  matchScore: number;
  isBacktested: boolean;
}

// Screening metric types
type ScreeningMetric = 'drawdown' | 'volatility' | 'maxGain' | 'sharpe';

interface MetricConfig {
  id: ScreeningMetric;
  name: string;
  shortName: string;
  description: string;
  icon: React.ElementType;
  min: number;
  max: number;
  step: number;
  unit: string;
  defaultValue: number;
  colorGradient: string;
  labels: { value: number; label: string; icon: React.ElementType }[];
  getLabel: (value: number) => { label: string; color: string };
  getContext: (value: number) => string;
  filterPresets: (value: number, preset: typeof PRESET_PORTFOLIOS[keyof typeof PRESET_PORTFOLIOS]) => boolean;
}

// Preset portfolios with expanded metrics
const PRESET_PORTFOLIOS = {
  conservative: {
    name: 'Capital Preservation',
    description: 'Minimal volatility, focused on wealth protection',
    maxDrawdown: 10,
    expectedReturn: 5,
    volatility: 6,
    maxGain: 12,
    sharpe: 0.6,
    icon: Snowflake,
    color: 'from-blue-500 to-cyan-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    textColor: 'text-blue-500',
    allocations: [
      { symbol: 'BND', weight: 50, assetClass: 'bonds' as AssetClass, name: 'Total Bond Market' },
      { symbol: 'VCSH', weight: 20, assetClass: 'bonds' as AssetClass, name: 'Short-Term Corp Bond' },
      { symbol: 'VTI', weight: 20, assetClass: 'stocks' as AssetClass, name: 'Total Stock Market' },
      { symbol: 'GLD', weight: 10, assetClass: 'commodities' as AssetClass, name: 'Gold' },
    ],
  },
  moderate: {
    name: 'Balanced Growth',
    description: 'Classic 60/40 allocation with global diversification',
    maxDrawdown: 20,
    expectedReturn: 7.5,
    volatility: 11,
    maxGain: 25,
    sharpe: 0.8,
    icon: Scale,
    color: 'from-emerald-500 to-teal-500',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    textColor: 'text-emerald-500',
    allocations: [
      { symbol: 'VTI', weight: 40, assetClass: 'stocks' as AssetClass, name: 'Total Stock Market' },
      { symbol: 'VXUS', weight: 20, assetClass: 'stocks' as AssetClass, name: 'International Stocks' },
      { symbol: 'BND', weight: 30, assetClass: 'bonds' as AssetClass, name: 'Total Bond Market' },
      { symbol: 'GLD', weight: 10, assetClass: 'commodities' as AssetClass, name: 'Gold' },
    ],
  },
  growth: {
    name: 'Growth Focus',
    description: 'Higher equity exposure for long-term wealth building',
    maxDrawdown: 30,
    expectedReturn: 9,
    volatility: 15,
    maxGain: 40,
    sharpe: 0.7,
    icon: TrendingUp,
    color: 'from-amber-500 to-orange-500',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    textColor: 'text-amber-500',
    allocations: [
      { symbol: 'VTI', weight: 50, assetClass: 'stocks' as AssetClass, name: 'Total Stock Market' },
      { symbol: 'VGT', weight: 20, assetClass: 'stocks' as AssetClass, name: 'Tech Sector' },
      { symbol: 'VXUS', weight: 15, assetClass: 'stocks' as AssetClass, name: 'International Stocks' },
      { symbol: 'BND', weight: 15, assetClass: 'bonds' as AssetClass, name: 'Total Bond Market' },
    ],
  },
  aggressive: {
    name: 'Maximum Growth',
    description: 'All-equity portfolio for maximum long-term returns',
    maxDrawdown: 45,
    expectedReturn: 11,
    volatility: 20,
    maxGain: 60,
    sharpe: 0.65,
    icon: Flame,
    color: 'from-rose-500 to-pink-500',
    bgColor: 'bg-rose-500/10',
    borderColor: 'border-rose-500/30',
    textColor: 'text-rose-500',
    allocations: [
      { symbol: 'VTI', weight: 40, assetClass: 'stocks' as AssetClass, name: 'Total Stock Market' },
      { symbol: 'QQQ', weight: 25, assetClass: 'stocks' as AssetClass, name: 'NASDAQ 100' },
      { symbol: 'VGT', weight: 20, assetClass: 'stocks' as AssetClass, name: 'Tech Sector' },
      { symbol: 'VXUS', weight: 15, assetClass: 'stocks' as AssetClass, name: 'International Stocks' },
    ],
  },
};

// Metric configurations
const METRIC_CONFIGS: Record<ScreeningMetric, MetricConfig> = {
  drawdown: {
    id: 'drawdown',
    name: 'Maximum Drawdown',
    shortName: 'Max DD',
    description: 'How much could your portfolio decline before you\'d panic sell?',
    icon: TrendingDown,
    min: 5,
    max: 50,
    step: 1,
    unit: '%',
    defaultValue: 20,
    colorGradient: 'from-blue-500 via-emerald-500 via-amber-500 to-rose-500',
    labels: [
      { value: 5, label: 'Ultra Safe', icon: Shield },
      { value: 20, label: 'Balanced', icon: Scale },
      { value: 35, label: 'Growth', icon: TrendingUp },
      { value: 50, label: 'Aggressive', icon: Flame },
    ],
    getLabel: (value) => {
      if (value <= 10) return { label: 'Very Conservative', color: 'text-blue-500' };
      if (value <= 20) return { label: 'Conservative', color: 'text-emerald-500' };
      if (value <= 30) return { label: 'Moderate', color: 'text-amber-500' };
      if (value <= 40) return { label: 'Aggressive', color: 'text-orange-500' };
      return { label: 'Very Aggressive', color: 'text-rose-500' };
    },
    getContext: (value) => {
      if (value <= 15) return `During 2008, even conservative portfolios saw 15-20% declines. A -${value}% tolerance means prioritizing capital preservation over growth.`;
      if (value <= 25) return `A 60/40 portfolio historically sees drawdowns around -30% during major crashes. Your -${value}% tolerance balances growth with reasonable protection.`;
      if (value <= 40) return `Equity-heavy portfolios can drop 40-50% in severe downturns. Your -${value}% tolerance prioritizes long-term growth over short-term stability.`;
      return `With -${value}% tolerance, you're prepared for extreme scenarios like 2008 (-56% S&P). This allows maximum equity exposure for long-term compounding.`;
    },
    filterPresets: (value, preset) => preset.maxDrawdown <= value + 5,
  },
  volatility: {
    id: 'volatility',
    name: 'Standard Deviation',
    shortName: 'Volatility',
    description: 'How much price swing can you handle day-to-day?',
    icon: Activity,
    min: 3,
    max: 25,
    step: 1,
    unit: '%',
    defaultValue: 12,
    colorGradient: 'from-cyan-500 via-blue-500 via-purple-500 to-pink-500',
    labels: [
      { value: 3, label: 'Stable', icon: Shield },
      { value: 10, label: 'Normal', icon: Scale },
      { value: 17, label: 'Volatile', icon: Activity },
      { value: 25, label: 'Wild', icon: Zap },
    ],
    getLabel: (value) => {
      if (value <= 8) return { label: 'Low Volatility', color: 'text-cyan-500' };
      if (value <= 13) return { label: 'Moderate Volatility', color: 'text-blue-500' };
      if (value <= 18) return { label: 'High Volatility', color: 'text-purple-500' };
      return { label: 'Very High Volatility', color: 'text-pink-500' };
    },
    getContext: (value) => {
      if (value <= 8) return `${value}% annual volatility means smooth sailing—expect daily moves of ~0.5% or less. Great for peace of mind but may limit upside.`;
      if (value <= 13) return `${value}% volatility is typical for balanced portfolios. Expect occasional 2-3% daily swings during market stress.`;
      if (value <= 18) return `${value}% volatility means meaningful price swings. A $100K portfolio might move $1,000+ in a single day during volatile periods.`;
      return `${value}% volatility is S&P 500 territory or higher. Buckle up for wild rides, but historically higher returns over time.`;
    },
    filterPresets: (value, preset) => preset.volatility <= value + 3,
  },
  maxGain: {
    id: 'maxGain',
    name: 'Maximum Gain Target',
    shortName: 'Max Gain',
    description: 'What\'s your minimum upside expectation in a good year?',
    icon: TrendingUp,
    min: 5,
    max: 80,
    step: 5,
    unit: '%',
    defaultValue: 25,
    colorGradient: 'from-emerald-500 via-green-500 via-lime-500 to-yellow-500',
    labels: [
      { value: 5, label: 'Modest', icon: Shield },
      { value: 25, label: 'Good', icon: Target },
      { value: 50, label: 'Strong', icon: TrendingUp },
      { value: 80, label: 'Moon', icon: Flame },
    ],
    getLabel: (value) => {
      if (value <= 15) return { label: 'Conservative Target', color: 'text-emerald-500' };
      if (value <= 30) return { label: 'Moderate Target', color: 'text-green-500' };
      if (value <= 50) return { label: 'Ambitious Target', color: 'text-lime-500' };
      return { label: 'Aggressive Target', color: 'text-yellow-500' };
    },
    getContext: (value) => {
      if (value <= 15) return `Targeting ${value}%+ max gain keeps you in conservative territory. This typically requires 40%+ bonds and defensive positions.`;
      if (value <= 30) return `A ${value}%+ gain target is achievable with a balanced 60/40 or 70/30 portfolio in strong bull markets.`;
      if (value <= 50) return `${value}%+ gains require significant equity exposure. In years like 2019 or 2021, even S&P 500 hit 25-30%.`;
      return `${value}%+ gains need concentrated bets—tech, growth stocks, or leverage. High reward, but be ready for equally large drawdowns.`;
    },
    filterPresets: (value, preset) => preset.maxGain >= value - 10,
  },
  sharpe: {
    id: 'sharpe',
    name: 'Sharpe Ratio',
    shortName: 'Sharpe',
    description: 'Risk-adjusted return efficiency—higher is better',
    icon: Award,
    min: 0.2,
    max: 1.5,
    step: 0.1,
    unit: '',
    defaultValue: 0.7,
    colorGradient: 'from-slate-500 via-zinc-500 via-amber-500 to-yellow-500',
    labels: [
      { value: 0.2, label: 'Poor', icon: AlertTriangle },
      { value: 0.5, label: 'Fair', icon: Scale },
      { value: 0.8, label: 'Good', icon: Target },
      { value: 1.5, label: 'Excellent', icon: Award },
    ],
    getLabel: (value) => {
      if (value < 0.4) return { label: 'Below Average', color: 'text-slate-500' };
      if (value < 0.7) return { label: 'Average', color: 'text-zinc-500' };
      if (value < 1.0) return { label: 'Good', color: 'text-amber-500' };
      return { label: 'Excellent', color: 'text-yellow-500' };
    },
    getContext: (value) => {
      if (value < 0.5) return `A Sharpe of ${value.toFixed(1)} is below average. You're not being well-compensated for the risk you're taking.`;
      if (value < 0.7) return `${value.toFixed(1)} Sharpe is typical for broad market indices. Decent but room for optimization.`;
      if (value < 1.0) return `${value.toFixed(1)} Sharpe indicates good risk-adjusted returns. Your portfolio is working efficiently.`;
      return `${value.toFixed(1)} Sharpe is excellent—professional hedge fund territory. Hard to sustain long-term but worth targeting.`;
    },
    filterPresets: (value, preset) => preset.sharpe >= value - 0.2,
  },
};

type PresetKey = keyof typeof PRESET_PORTFOLIOS;

interface DrawdownScreenerProps {
  onComplete: (data: {
    capital: number;
    horizon: number;
    allocations: PortfolioAllocation[];
  }) => void;
}

export function DrawdownScreener({ onComplete }: DrawdownScreenerProps) {
  const { toast } = useToast();
  
  // Screening state
  const [activeMetric, setActiveMetric] = useState<ScreeningMetric>('drawdown');
  const [metricValues, setMetricValues] = useState<Record<ScreeningMetric, number>>({
    drawdown: 20,
    volatility: 12,
    maxGain: 25,
    sharpe: 0.7,
  });
  const [selectedPortfolio, setSelectedPortfolio] = useState<ScreenedPortfolio | null>(null);
  
  // Backtested portfolios from edge function
  const [screenedPortfolios, setScreenedPortfolios] = useState<ScreenedPortfolio[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastScreenTime, setLastScreenTime] = useState<Date | null>(null);
  const [lookbackYears, setLookbackYears] = useState(5);
  
  // Portfolio configuration state
  const [capital, setCapital] = useState(100000);
  const [horizon, setHorizon] = useState(5);
  const [allocations, setAllocations] = useState<PortfolioAllocation[]>([]);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [newSymbol, setNewSymbol] = useState('');

  // Get current metric config
  const currentMetric = METRIC_CONFIGS[activeMetric];
  const currentValue = metricValues[activeMetric];
  const metricInfo = currentMetric.getLabel(currentValue);

  // Update metric value
  const updateMetricValue = (metric: ScreeningMetric, value: number) => {
    setMetricValues(prev => ({ ...prev, [metric]: value }));
  };

  // Screen portfolios from edge function
  const screenPortfolios = useCallback(async () => {
    setIsLoading(true);
    try {
      const criteria = {
        maxDrawdown: metricValues.drawdown,
        maxVolatility: metricValues.volatility,
        minSharpe: metricValues.sharpe,
        maxGain: metricValues.maxGain,
        lookbackYears,
      };

      const { data, error } = await supabase.functions.invoke('portfolio-screener', {
        body: { criteria },
      });

      if (error) throw error;

      if (data?.results) {
        setScreenedPortfolios(data.results);
        setLastScreenTime(new Date());
        toast({
          title: 'Screening Complete',
          description: `Found ${data.results.length} portfolios matching your criteria`,
        });
      }
    } catch (error) {
      console.error('Portfolio screening error:', error);
      toast({
        title: 'Screening Failed',
        description: 'Could not screen portfolios. Using fallback data.',
        variant: 'destructive',
      });
      // Use fallback static presets if edge function fails
      setScreenedPortfolios(getFallbackPortfolios());
    } finally {
      setIsLoading(false);
    }
  }, [metricValues, lookbackYears, toast]);

  // Initial load
  useEffect(() => {
    screenPortfolios();
  }, []);

  // Get fallback portfolios when edge function fails
  const getFallbackPortfolios = (): ScreenedPortfolio[] => {
    return (Object.entries(PRESET_PORTFOLIOS) as [PresetKey, typeof PRESET_PORTFOLIOS[PresetKey]][]).map(([key, preset]) => ({
      id: key,
      name: preset.name,
      description: preset.description,
      allocations: preset.allocations.map(a => ({ symbol: a.symbol, weight: a.weight, name: a.name || a.symbol })),
      metrics: {
        annualizedReturn: preset.expectedReturn,
        maxDrawdown: preset.maxDrawdown,
        volatility: preset.volatility,
        sharpe: preset.sharpe,
        maxGain: preset.maxGain,
        calmar: preset.expectedReturn / preset.maxDrawdown,
        sortino: preset.sharpe * 1.3,
      },
      matchScore: 80,
      isBacktested: false,
    }));
  };

  // Filter and sort portfolios based on current criteria
  const filteredPortfolios = useMemo(() => {
    return screenedPortfolios
      .filter(p => {
        if (activeMetric === 'drawdown') return p.metrics.maxDrawdown <= metricValues.drawdown + 10;
        if (activeMetric === 'volatility') return p.metrics.volatility <= metricValues.volatility + 5;
        if (activeMetric === 'sharpe') return p.metrics.sharpe >= metricValues.sharpe - 0.3;
        if (activeMetric === 'maxGain') return p.metrics.maxGain >= metricValues.maxGain - 10;
        return true;
      })
      .sort((a, b) => b.matchScore - a.matchScore);
  }, [screenedPortfolios, activeMetric, metricValues]);

  // Get best match portfolio
  const bestMatch = useMemo(() => filteredPortfolios[0] || null, [filteredPortfolios]);

  // Select a portfolio
  const selectPortfolio = (portfolio: ScreenedPortfolio) => {
    setSelectedPortfolio(portfolio);
    setAllocations(portfolio.allocations.map(a => ({
      symbol: a.symbol,
      weight: a.weight,
      name: a.name,
      assetClass: getAssetClass(a.symbol),
    })));
    setIsCustomizing(false);
  };

  // Helper to determine asset class
  const getAssetClass = (symbol: string): AssetClass => {
    for (const [cls, etfs] of Object.entries(ASSET_CLASS_ETFS)) {
      if (etfs.includes(symbol)) return cls as AssetClass;
    }
    return 'stocks';
  };

  // Total weight calculation
  const totalWeight = useMemo(() => 
    allocations.reduce((sum, a) => sum + a.weight, 0), 
    [allocations]
  );

  const isValidAllocation = Math.abs(totalWeight - 100) < 0.1;
  const canProceed = capital > 0 && horizon > 0 && allocations.length > 0 && isValidAllocation;

  // Asset management functions
  const addAllocation = () => {
    const symbol = newSymbol.toUpperCase().trim();
    if (!symbol || allocations.find(a => a.symbol === symbol)) return;
    
    let assetClass: AssetClass = 'stocks';
    for (const [cls, etfs] of Object.entries(ASSET_CLASS_ETFS)) {
      if (etfs.includes(symbol)) {
        assetClass = cls as AssetClass;
        break;
      }
    }
    
    setAllocations([...allocations, { symbol, weight: 0, assetClass }]);
    setNewSymbol('');
    setIsCustomizing(true);
  };

  const removeAllocation = (symbol: string) => {
    setAllocations(allocations.filter(a => a.symbol !== symbol));
  };

  const updateWeight = (symbol: string, weight: number) => {
    setAllocations(
      allocations.map(a => a.symbol === symbol ? { ...a, weight } : a)
    );
    setIsCustomizing(true);
  };

  const equalizeWeights = () => {
    if (allocations.length === 0) return;
    const equalWeight = Math.round((100 / allocations.length) * 10) / 10;
    const updated = allocations.map((a, i) => ({ 
      ...a, 
      weight: i === 0 ? 100 - (equalWeight * (allocations.length - 1)) : equalWeight 
    }));
    setAllocations(updated);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      maximumFractionDigits: 0 
    }).format(value);
  };

  // Quick add tickers
  const quickTickers = ['SPY', 'QQQ', 'VTI', 'VXUS', 'BND', 'GLD', 'VNQ', 'NVDA']
    .filter(t => !allocations.find(a => a.symbol === t))
    .slice(0, 6);

  const handleSubmit = () => {
    if (canProceed) {
      onComplete({ capital, horizon, allocations });
    }
  };

  // Format display value for current metric
  const formatMetricValue = (value: number) => {
    if (activeMetric === 'sharpe') return value.toFixed(1);
    return value.toString();
  };

  return (
    <div className="min-h-screen w-full">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-6 sm:space-y-8"
        >
          {/* Hero Header */}
          <div className="text-center space-y-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.3 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary/20 to-primary/5 border border-primary/20 mb-4">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">Risk-Based Screener</span>
              </div>
            </motion.div>
            
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text">
              Screen by Risk Metrics
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
              Choose a risk metric that matters to you, set your tolerance, and we'll suggest portfolios that fit
            </p>
          </div>

          {/* Metric Selection Tabs */}
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-card to-card/50 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
            
            <CardContent className="relative pt-6 space-y-6">
              {/* Metric Tabs */}
              <Tabs value={activeMetric} onValueChange={(v) => setActiveMetric(v as ScreeningMetric)}>
                <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full h-auto gap-2 bg-transparent p-0">
                  {(Object.values(METRIC_CONFIGS) as MetricConfig[]).map((metric) => {
                    const Icon = metric.icon;
                    const isActive = activeMetric === metric.id;
                    return (
                      <TabsTrigger
                        key={metric.id}
                        value={metric.id}
                        className={cn(
                          "flex flex-col items-center gap-1 p-3 rounded-lg border transition-all data-[state=active]:bg-primary/10 data-[state=active]:border-primary",
                          "hover:bg-muted/50"
                        )}
                      >
                        <Icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-muted-foreground")} />
                        <span className={cn("text-xs font-medium", isActive ? "text-primary" : "text-muted-foreground")}>
                          {metric.shortName}
                        </span>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>

                {/* Active Metric Content */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeMetric}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="mt-6"
                  >
                    {/* Metric Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                      <div>
                        <div className="flex items-center gap-2">
                          {(() => {
                            const Icon = currentMetric.icon;
                            return <Icon className="h-5 w-5 text-primary" />;
                          })()}
                          <CardTitle className="text-lg sm:text-xl">{currentMetric.name}</CardTitle>
                        </div>
                        <CardDescription className="mt-1">
                          {currentMetric.description}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge 
                          variant="outline" 
                          className={cn("text-lg font-bold px-4 py-2", metricInfo.color)}
                        >
                          {activeMetric === 'drawdown' ? '-' : ''}{formatMetricValue(currentValue)}{currentMetric.unit}
                        </Badge>
                        <Badge variant="secondary" className={cn("text-sm", metricInfo.color)}>
                          {metricInfo.label}
                        </Badge>
                      </div>
                    </div>

                    {/* Slider */}
                    <div className="space-y-4">
                      <div className="relative pt-2 pb-8">
                        
                        <Slider
                          value={[currentValue]}
                          onValueChange={([v]) => {
                            updateMetricValue(activeMetric, v);
                          }}
                          min={currentMetric.min}
                          max={currentMetric.max}
                          step={currentMetric.step}
                          className="relative z-10"
                        />
                        
                        {/* Scale labels */}
                        <div className="flex justify-between text-xs text-muted-foreground mt-2">
                          {currentMetric.labels.map((label, idx) => {
                            const LabelIcon = label.icon;
                            return (
                              <span 
                                key={label.value} 
                                className={cn(
                                  "flex flex-col",
                                  idx === 0 ? "items-start" : idx === currentMetric.labels.length - 1 ? "items-end" : "items-center"
                                )}
                              >
                                <LabelIcon className="h-3 w-3 mb-1 text-muted-foreground" />
                                <span>{label.value}{currentMetric.unit}</span>
                                <span className="text-[10px] hidden sm:block">{label.label}</span>
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      {/* Context info */}
                      <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
                        <div className="flex items-start gap-3">
                          <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                          <p className="text-sm text-muted-foreground">
                            {currentMetric.getContext(currentValue)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </Tabs>
            </CardContent>
          </Card>

          {/* Backtested Portfolio Suggestions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Backtested Portfolios
                {lastScreenTime && (
                  <Badge variant="outline" className="text-xs ml-2">
                    <History className="h-3 w-3 mr-1" />
                    {lookbackYears}yr history
                  </Badge>
                )}
              </h2>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {filteredPortfolios.length} matching
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={screenPortfolios}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  <span className="ml-2 hidden sm:inline">Screen</span>
                </Button>
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center space-y-3">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                  <p className="text-sm text-muted-foreground">Analyzing historical performance...</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {filteredPortfolios.map((portfolio, idx) => {
                  const isSelected = selectedPortfolio?.id === portfolio.id;
                  const isBestMatch = idx === 0 && portfolio.matchScore >= 80;
                  
                  // Determine icon and colors based on volatility/risk
                  const Icon = portfolio.metrics.volatility < 8 ? Snowflake 
                    : portfolio.metrics.volatility < 12 ? Scale 
                    : portfolio.metrics.volatility < 16 ? TrendingUp 
                    : Flame;
                  const colorClass = portfolio.metrics.volatility < 8 ? 'from-blue-500 to-cyan-500'
                    : portfolio.metrics.volatility < 12 ? 'from-emerald-500 to-teal-500'
                    : portfolio.metrics.volatility < 16 ? 'from-amber-500 to-orange-500'
                    : 'from-rose-500 to-pink-500';
                  const textColor = portfolio.metrics.volatility < 8 ? 'text-blue-500'
                    : portfolio.metrics.volatility < 12 ? 'text-emerald-500'
                    : portfolio.metrics.volatility < 16 ? 'text-amber-500'
                    : 'text-rose-500';
                  
                  return (
                    <motion.div
                      key={portfolio.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Card 
                        className={cn(
                          "cursor-pointer transition-all duration-200 relative overflow-hidden h-full",
                          isSelected && "ring-2 ring-primary border-primary",
                        )}
                        onClick={() => selectPortfolio(portfolio)}
                      >
                        {isBestMatch && (
                          <div className="absolute top-0 right-0">
                            <div className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">
                              BEST FIT
                            </div>
                          </div>
                        )}
                        
                        {portfolio.isBacktested && (
                          <div className="absolute top-0 left-0">
                            <div className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-br-lg">
                              VERIFIED
                            </div>
                          </div>
                        )}
                        
                        <div className={cn(
                          "absolute inset-0 opacity-5 bg-gradient-to-br",
                          colorClass
                        )} />
                        
                        <CardContent className="p-4 relative space-y-3">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "p-2 rounded-lg bg-gradient-to-br",
                              colorClass
                            )}>
                              <Icon className="h-4 w-4 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-sm truncate">{portfolio.name}</h3>
                            </div>
                            {isSelected && (
                              <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                            )}
                          </div>
                          
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {portfolio.description}
                          </p>
                          
                          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/50">
                            <div className="text-center">
                              <p className={cn("text-sm font-bold", textColor)}>
                                {portfolio.metrics.annualizedReturn.toFixed(1)}%
                              </p>
                              <p className="text-[10px] text-muted-foreground">Return</p>
                            </div>
                            <div className="text-center">
                              <p className="text-sm font-bold text-rose-500">
                                -{portfolio.metrics.maxDrawdown.toFixed(1)}%
                              </p>
                              <p className="text-[10px] text-muted-foreground">Max DD</p>
                            </div>
                            <div className="text-center">
                              <p className="text-sm font-bold text-muted-foreground">
                                {portfolio.metrics.volatility.toFixed(1)}%
                              </p>
                              <p className="text-[10px] text-muted-foreground">Vol</p>
                            </div>
                          </div>
                          
                          {/* Match score bar */}
                          <div className="pt-2">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-muted-foreground">Match</span>
                              <span className={cn("font-medium", portfolio.matchScore >= 80 ? "text-emerald-500" : portfolio.matchScore >= 60 ? "text-amber-500" : "text-muted-foreground")}>
                                {portfolio.matchScore}%
                              </span>
                            </div>
                            <Progress value={portfolio.matchScore} className="h-1.5" />
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
            
            {!isLoading && filteredPortfolios.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No portfolios match your current criteria</p>
                <Button variant="outline" onClick={screenPortfolios}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Different Criteria
                </Button>
              </div>
            )}
          </div>

          {/* Portfolio Configuration */}
          <AnimatePresence mode="wait">
            {selectedPortfolio && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left: Portfolio Details */}
                  <Card className="lg:col-span-1">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-primary" />
                        Portfolio Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div>
                        <Label className="text-sm mb-2 block">Starting Capital</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="text"
                            value={capital.toLocaleString()}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^0-9]/g, '');
                              setCapital(parseInt(value) || 0);
                            }}
                            className="pl-10"
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm mb-2 flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-primary" />
                            Analysis Period
                          </span>
                          <Badge variant="outline">{horizon} years</Badge>
                        </Label>
                        <Slider
                          value={[horizon]}
                          onValueChange={([v]) => setHorizon(v)}
                          min={1}
                          max={POLYGON_CONFIG.MAX_HISTORY_YEARS}
                          step={1}
                          className="mt-3"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>1 year</span>
                          <span>{POLYGON_CONFIG.MAX_HISTORY_YEARS} years</span>
                        </div>
                      </div>

                      {/* Add custom ticker */}
                      <Separator />
                      
                      <div>
                        <Label className="text-sm mb-2 block">Add Custom Assets</Label>
                        <div className="flex gap-2">
                          <Input
                            value={newSymbol}
                            onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                            onKeyDown={(e) => e.key === 'Enter' && addAllocation()}
                            placeholder="AAPL, MSFT..."
                            className="flex-1"
                            maxLength={10}
                          />
                          <Button 
                            onClick={addAllocation} 
                            disabled={!newSymbol.trim()} 
                            size="icon"
                            variant="secondary"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        {quickTickers.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {quickTickers.map(ticker => (
                              <button
                                key={ticker}
                                onClick={() => {
                                  setAllocations(prev => [
                                    ...prev,
                                    { symbol: ticker, weight: 0, assetClass: 'stocks' as AssetClass }
                                  ]);
                                  setIsCustomizing(true);
                                }}
                                className="px-2 py-0.5 text-xs rounded border border-border hover:bg-muted transition-colors"
                              >
                                {ticker}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Right: Allocations */}
                  <Card className="lg:col-span-2">
                    <CardHeader className="pb-3">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          <CardTitle className="text-sm flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-primary" />
                            Portfolio Allocations
                            {isCustomizing && (
                              <Badge variant="secondary" className="text-xs">Customized</Badge>
                            )}
                          </CardTitle>
                          <CardDescription className="text-xs mt-1">
                            Adjust weights to customize your allocation
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={equalizeWeights} 
                            disabled={allocations.length === 0}
                            className="text-xs"
                          >
                            <Scale className="h-3 w-3 mr-1" />
                            Equal
                          </Button>
                          {selectedPortfolio && isCustomizing && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => selectPortfolio(selectedPortfolio)}
                              className="text-xs"
                            >
                              Reset
                            </Button>
                          )}
                          <Badge 
                            variant={isValidAllocation ? 'default' : 'destructive'}
                            className="whitespace-nowrap"
                          >
                            {totalWeight.toFixed(1)}%
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                        {allocations.map((allocation) => (
                          <motion.div 
                            key={allocation.symbol}
                            layout
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className="p-3 sm:p-4 rounded-lg border border-border bg-muted/30"
                          >
                            <div className="flex items-center justify-between gap-2 mb-3">
                              <div className="flex items-center gap-2 min-w-0">
                                <Badge variant="outline" className="font-mono text-sm shrink-0">
                                  {allocation.symbol}
                                </Badge>
                                {allocation.name && (
                                  <span className="text-xs text-muted-foreground truncate hidden sm:block">
                                    {allocation.name}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  value={allocation.weight}
                                  onChange={(e) => updateWeight(allocation.symbol, parseFloat(e.target.value) || 0)}
                                  className="w-16 sm:w-20 text-right text-sm h-8"
                                  min={0}
                                  max={100}
                                  step={0.5}
                                />
                                <span className="text-sm font-bold">%</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  onClick={() => removeAllocation(allocation.symbol)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            
                            <Slider
                              value={[allocation.weight]}
                              onValueChange={([value]) => updateWeight(allocation.symbol, value)}
                              max={100}
                              step={0.5}
                              className="w-full"
                            />
                          </motion.div>
                        ))}
                      </div>

                      {/* Validation messages */}
                      {!isValidAllocation && allocations.length > 0 && (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 flex items-center gap-3"
                        >
                          <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-destructive">
                              Allocations must sum to 100%
                            </p>
                            <p className="text-xs text-destructive/80">
                              {totalWeight < 100 
                                ? `Add ${(100 - totalWeight).toFixed(1)}% more` 
                                : `Remove ${(totalWeight - 100).toFixed(1)}%`}
                            </p>
                          </div>
                        </motion.div>
                      )}
                      
                      {isValidAllocation && allocations.length > 0 && (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3"
                        >
                          <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-emerald-500">
                              Ready to analyze
                            </p>
                            <p className="text-xs text-emerald-500/80">
                              {formatCurrency(capital)} across {allocations.length} assets
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Action Button */}
                <div className="flex justify-center pt-6">
                  <Button 
                    onClick={handleSubmit} 
                    disabled={!canProceed}
                    size="lg"
                    className="px-8 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25"
                  >
                    <BarChart3 className="h-5 w-5 mr-2" />
                    Analyze Portfolio
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Initial CTA if no preset selected */}
          {!selectedPortfolio && !isLoading && filteredPortfolios.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8"
            >
              <p className="text-muted-foreground mb-4">
                Set your risk tolerance above and select a portfolio to get started
              </p>
              <Button
                variant="outline"
                size="lg"
                onClick={() => bestMatch && selectPortfolio(bestMatch)}
                disabled={!bestMatch}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Use Best Match Portfolio
              </Button>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
