/**
 * Drawdown Screener - Suggest portfolios based on max drawdown tolerance
 * A visually stunning interface for screening portfolios by risk appetite
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
  CircleDot,
  AlertTriangle,
  Trash2,
  Plus,
  ChevronDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { PortfolioAllocation, AssetClass, ASSET_CLASS_ETFS } from '@/types/portfolio';
import { POLYGON_CONFIG } from '@/config/apiConfig';

// Preset portfolios based on drawdown tolerance
const PRESET_PORTFOLIOS = {
  conservative: {
    name: 'Capital Preservation',
    description: 'Minimal volatility, focused on wealth protection',
    maxDrawdown: 10,
    expectedReturn: 5,
    volatility: 6,
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

type PresetKey = keyof typeof PRESET_PORTFOLIOS;

interface DrawdownScreenerProps {
  onComplete: (data: {
    capital: number;
    horizon: number;
    allocations: PortfolioAllocation[];
  }) => void;
}

export function DrawdownScreener({ onComplete }: DrawdownScreenerProps) {
  // Screening state
  const [maxDrawdownTolerance, setMaxDrawdownTolerance] = useState(20);
  const [selectedPreset, setSelectedPreset] = useState<PresetKey | null>(null);
  
  // Portfolio configuration state
  const [capital, setCapital] = useState(100000);
  const [horizon, setHorizon] = useState(5);
  const [allocations, setAllocations] = useState<PortfolioAllocation[]>([]);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [newSymbol, setNewSymbol] = useState('');

  // Calculate which presets match the drawdown tolerance
  const matchingPresets = useMemo(() => {
    return (Object.entries(PRESET_PORTFOLIOS) as [PresetKey, typeof PRESET_PORTFOLIOS[PresetKey]][])
      .filter(([_, preset]) => preset.maxDrawdown <= maxDrawdownTolerance + 5)
      .sort((a, b) => b[1].expectedReturn - a[1].expectedReturn);
  }, [maxDrawdownTolerance]);

  // Get recommended preset based on tolerance
  const recommendedPreset = useMemo(() => {
    const presets = Object.entries(PRESET_PORTFOLIOS) as [PresetKey, typeof PRESET_PORTFOLIOS[PresetKey]][];
    // Find the preset with highest return that's within tolerance
    const matching = presets
      .filter(([_, p]) => p.maxDrawdown <= maxDrawdownTolerance + 5)
      .sort((a, b) => b[1].expectedReturn - a[1].expectedReturn);
    return matching[0]?.[0] || 'conservative';
  }, [maxDrawdownTolerance]);

  // Select a preset
  const selectPreset = (key: PresetKey) => {
    setSelectedPreset(key);
    setAllocations(PRESET_PORTFOLIOS[key].allocations.map(a => ({
      ...a,
      assetClass: a.assetClass as AssetClass
    })));
    setIsCustomizing(false);
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

  // Get drawdown label
  const getDrawdownLabel = (value: number) => {
    if (value <= 10) return { label: 'Very Conservative', color: 'text-blue-500' };
    if (value <= 20) return { label: 'Conservative', color: 'text-emerald-500' };
    if (value <= 30) return { label: 'Moderate', color: 'text-amber-500' };
    if (value <= 40) return { label: 'Aggressive', color: 'text-orange-500' };
    return { label: 'Very Aggressive', color: 'text-rose-500' };
  };

  const drawdownInfo = getDrawdownLabel(maxDrawdownTolerance);

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
                <span className="text-sm font-medium text-primary">Portfolio Builder</span>
              </div>
            </motion.div>
            
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text">
              What's your risk tolerance?
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
              Tell us the maximum decline you could stomach, and we'll suggest a portfolio that historically stayed within that range
            </p>
          </div>

          {/* Main Drawdown Screener */}
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-card to-card/50 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
            
            <CardHeader className="relative pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-rose-500" />
                    Maximum Drawdown Tolerance
                  </CardTitle>
                  <CardDescription className="mt-1">
                    How much could your portfolio decline before you'd panic sell?
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-lg font-bold px-4 py-2",
                      drawdownInfo.color
                    )}
                  >
                    -{maxDrawdownTolerance}%
                  </Badge>
                  <Badge 
                    variant="secondary"
                    className={cn("text-sm", drawdownInfo.color)}
                  >
                    {drawdownInfo.label}
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="relative space-y-6">
              {/* Visual Drawdown Slider */}
              <div className="space-y-4">
                <div className="relative pt-2 pb-8">
                  <div className="absolute inset-x-0 top-8 h-3 rounded-full bg-gradient-to-r from-blue-500 via-emerald-500 via-amber-500 to-rose-500 opacity-20" />
                  
                  <Slider
                    value={[maxDrawdownTolerance]}
                    onValueChange={([v]) => {
                      setMaxDrawdownTolerance(v);
                      // Auto-select best matching preset
                      const presets = Object.entries(PRESET_PORTFOLIOS) as [PresetKey, typeof PRESET_PORTFOLIOS[PresetKey]][];
                      const best = presets
                        .filter(([_, p]) => p.maxDrawdown <= v + 5)
                        .sort((a, b) => b[1].expectedReturn - a[1].expectedReturn)[0];
                      if (best && !isCustomizing) {
                        selectPreset(best[0]);
                      }
                    }}
                    min={5}
                    max={50}
                    step={1}
                    className="relative z-10"
                  />
                  
                  {/* Scale labels */}
                  <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    <span className="flex flex-col items-start">
                      <Shield className="h-3 w-3 mb-1 text-blue-500" />
                      <span>5%</span>
                      <span className="text-[10px] hidden sm:block">Ultra Safe</span>
                    </span>
                    <span className="flex flex-col items-center">
                      <Scale className="h-3 w-3 mb-1 text-emerald-500" />
                      <span>20%</span>
                      <span className="text-[10px] hidden sm:block">Balanced</span>
                    </span>
                    <span className="flex flex-col items-center">
                      <TrendingUp className="h-3 w-3 mb-1 text-amber-500" />
                      <span>35%</span>
                      <span className="text-[10px] hidden sm:block">Growth</span>
                    </span>
                    <span className="flex flex-col items-end">
                      <Flame className="h-3 w-3 mb-1 text-rose-500" />
                      <span>50%</span>
                      <span className="text-[10px] hidden sm:block">Aggressive</span>
                    </span>
                  </div>
                </div>

                {/* Context info */}
                <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">
                        {maxDrawdownTolerance <= 15 && (
                          <>During 2008, even conservative portfolios saw 15-20% declines. A -{maxDrawdownTolerance}% tolerance means prioritizing capital preservation over growth.</>
                        )}
                        {maxDrawdownTolerance > 15 && maxDrawdownTolerance <= 25 && (
                          <>A 60/40 portfolio historically sees drawdowns around -30% during major crashes. Your -{maxDrawdownTolerance}% tolerance balances growth with reasonable protection.</>
                        )}
                        {maxDrawdownTolerance > 25 && maxDrawdownTolerance <= 40 && (
                          <>Equity-heavy portfolios can drop 40-50% in severe downturns. Your -{maxDrawdownTolerance}% tolerance prioritizes long-term growth over short-term stability.</>
                        )}
                        {maxDrawdownTolerance > 40 && (
                          <>With -{maxDrawdownTolerance}% tolerance, you're prepared for extreme scenarios like 2008 (-56% S&P). This allows maximum equity exposure for long-term compounding.</>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preset Portfolio Suggestions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Suggested Portfolios
              </h2>
              <Badge variant="outline" className="text-xs">
                Based on -{maxDrawdownTolerance}% tolerance
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {(Object.entries(PRESET_PORTFOLIOS) as [PresetKey, typeof PRESET_PORTFOLIOS[PresetKey]][]).map(([key, preset]) => {
                const Icon = preset.icon;
                const isSelected = selectedPreset === key;
                const isRecommended = key === recommendedPreset;
                const isWithinTolerance = preset.maxDrawdown <= maxDrawdownTolerance + 5;
                
                return (
                  <motion.div
                    key={key}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Card 
                      className={cn(
                        "cursor-pointer transition-all duration-200 relative overflow-hidden h-full",
                        isSelected && "ring-2 ring-primary border-primary",
                        !isWithinTolerance && "opacity-50",
                        preset.borderColor
                      )}
                      onClick={() => isWithinTolerance && selectPreset(key)}
                    >
                      {isRecommended && isWithinTolerance && (
                        <div className="absolute top-0 right-0">
                          <div className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">
                            BEST FIT
                          </div>
                        </div>
                      )}
                      
                      <div className={cn(
                        "absolute inset-0 opacity-5 bg-gradient-to-br",
                        preset.color
                      )} />
                      
                      <CardContent className="p-4 relative space-y-3">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "p-2 rounded-lg bg-gradient-to-br",
                            preset.color
                          )}>
                            <Icon className="h-4 w-4 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm truncate">{preset.name}</h3>
                          </div>
                          {isSelected && (
                            <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                          )}
                        </div>
                        
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {preset.description}
                        </p>
                        
                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/50">
                          <div className="text-center">
                            <p className={cn("text-sm font-bold", preset.textColor)}>
                              {preset.expectedReturn}%
                            </p>
                            <p className="text-[10px] text-muted-foreground">Return</p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-bold text-rose-500">
                              -{preset.maxDrawdown}%
                            </p>
                            <p className="text-[10px] text-muted-foreground">Max DD</p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-bold text-muted-foreground">
                              {preset.volatility}%
                            </p>
                            <p className="text-[10px] text-muted-foreground">Vol</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Portfolio Configuration */}
          <AnimatePresence mode="wait">
            {selectedPreset && (
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
                          {selectedPreset && isCustomizing && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => selectPreset(selectedPreset)}
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
          {!selectedPreset && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8"
            >
              <p className="text-muted-foreground mb-4">
                Set your drawdown tolerance above and select a portfolio to get started
              </p>
              <Button
                variant="outline"
                size="lg"
                onClick={() => selectPreset(recommendedPreset)}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Use Recommended Portfolio
              </Button>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
