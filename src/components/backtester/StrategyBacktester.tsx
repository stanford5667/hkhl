/**
 * Strategy Backtester Component
 * 
 * Professional backtesting interface with prebuilt strategies,
 * real historical data, and institutional-grade metrics.
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
  BarChart,
  Bar,
} from 'recharts';
import {
  Play,
  Loader2,
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  AlertTriangle,
  Shield,
  Award,
  Info,
  Calendar,
  DollarSign,
  BarChart3,
  Zap,
  BookOpen,
  ChevronRight,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format, subYears, subMonths } from 'date-fns';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface StrategyBacktesterProps {
  ticker: string;
  companyName: string;
}

interface StrategyOption {
  id: string;
  name: string;
  description: string;
  whyItWorks: string;
  riskLevel: 'Conservative' | 'Moderate' | 'Aggressive';
  icon: React.ElementType;
  defaultParams: Record<string, number>;
  paramConfig: ParamConfig[];
}

interface ParamConfig {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  suffix?: string;
}

interface Trade {
  entryDate: string;
  exitDate: string;
  entryPrice: number;
  exitPrice: number;
  shares: number;
  pnl: number;
  pnlPercent: number;
  type: 'LONG' | 'SHORT';
  entryReason: string;
  exitReason: string;
  holdingDays: number;
}

interface PortfolioSnapshot {
  date: string;
  value: number;
  cash: number;
  positionValue: number;
  inPosition: boolean;
}

interface BacktestResult {
  success: boolean;
  strategy: string;
  ticker: string;
  startDate: string;
  endDate: string;
  initialCapital: number;
  finalValue: number;
  totalReturn: number;
  annualizedReturn: number;
  buyHoldReturn: number;
  outperformance: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  maxDrawdownDate: string;
  volatility: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  bestTrade: number;
  worstTrade: number;
  expectedValue: number;
  profitFactor: number;
  avgHoldingDays: number;
  trades: Trade[];
  portfolioHistory: PortfolioSnapshot[];
  tradingDays: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STRATEGY DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

const STRATEGIES: StrategyOption[] = [
  {
    id: 'rsi',
    name: 'RSI Oversold Bounce',
    description: 'Buy when RSI < 30 (oversold), sell when RSI > 70 (overbought)',
    whyItWorks: 'Stocks become oversold due to panic selling, then snap back to fair value when fear subsides.',
    riskLevel: 'Moderate',
    icon: Activity,
    defaultParams: { rsiPeriod: 14, rsiOversold: 30, rsiOverbought: 70 },
    paramConfig: [
      { key: 'rsiPeriod', label: 'RSI Period', min: 5, max: 30, step: 1 },
      { key: 'rsiOversold', label: 'Oversold Level', min: 10, max: 40, step: 5 },
      { key: 'rsiOverbought', label: 'Overbought Level', min: 60, max: 90, step: 5 },
    ]
  },
  {
    id: 'ma-crossover',
    name: 'Moving Average Crossover',
    description: 'Buy when fast MA crosses above slow MA, sell on death cross',
    whyItWorks: 'Trend following - the trend is your friend. Captures momentum when it shifts direction.',
    riskLevel: 'Moderate',
    icon: TrendingUp,
    defaultParams: { fastMaPeriod: 10, slowMaPeriod: 50 },
    paramConfig: [
      { key: 'fastMaPeriod', label: 'Fast MA Period', min: 5, max: 30, step: 1 },
      { key: 'slowMaPeriod', label: 'Slow MA Period', min: 20, max: 200, step: 10 },
    ]
  },
  {
    id: 'gap-fill',
    name: 'Gap Fill Strategy',
    description: 'Buy gap downs larger than 2%, sell when price returns to previous close',
    whyItWorks: 'Gaps tend to fill 70%+ of the time. Opening gaps often represent overreaction.',
    riskLevel: 'Aggressive',
    icon: Zap,
    defaultParams: { gapThreshold: 2 },
    paramConfig: [
      { key: 'gapThreshold', label: 'Gap Threshold', min: 1, max: 5, step: 0.5, suffix: '%' },
    ]
  },
  {
    id: 'consecutive-days',
    name: 'Consecutive Days Reversal',
    description: 'Buy after N consecutive down days, sell after M days holding',
    whyItWorks: 'Mean reversion - extreme moves tend to bounce back. Markets overcorrect in the short term.',
    riskLevel: 'Conservative',
    icon: Target,
    defaultParams: { consecutiveDays: 3, holdingPeriod: 5 },
    paramConfig: [
      { key: 'consecutiveDays', label: 'Down Days Required', min: 2, max: 5, step: 1 },
      { key: 'holdingPeriod', label: 'Holding Period (days)', min: 3, max: 15, step: 1 },
    ]
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function MetricCard({ 
  label, 
  value, 
  description, 
  trend 
}: { 
  label: string; 
  value: string; 
  description: string; 
  trend?: 'good' | 'bad' | 'neutral';
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="p-3 rounded-lg bg-secondary/50 border border-border cursor-help">
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className={cn(
              "text-xl font-bold tabular-nums font-mono",
              trend === 'good' && 'text-emerald-400',
              trend === 'bad' && 'text-rose-400'
            )}>
              {value}
            </p>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs text-xs">{description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function SmoothnessScore({ sharpe }: { sharpe: number }) {
  const stars = Math.min(5, Math.max(0, Math.floor(sharpe * 2)));
  const labels = ['Rough Ride', 'Bumpy', 'Smooth', 'Very Smooth', 'Extremely Smooth'];
  const label = labels[Math.min(stars, 4)];
  
  return (
    <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-secondary/30 border border-primary/20">
      <div className="flex items-center gap-2 mb-2">
        <Shield className="h-5 w-5 text-primary" />
        <span className="text-sm font-medium">Smoothness Score</span>
      </div>
      <p className="text-3xl font-bold tabular-nums font-mono mb-1">{sharpe.toFixed(2)}</p>
      <div className="flex gap-0.5 mb-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <span key={i} className={cn("text-lg", i < stars ? "text-amber-400" : "text-muted-foreground/30")}>★</span>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xs text-muted-foreground mt-2">
        For every 1% of stress (volatility), you earned {sharpe > 0 ? sharpe.toFixed(2) : '0'}% return.
      </p>
    </div>
  );
}

function ExpectedValueCard({ winRate, avgWin, avgLoss, ev }: { winRate: number; avgWin: number; avgLoss: number; ev: number }) {
  return (
    <div className="p-4 rounded-lg bg-gradient-to-br from-emerald-500/10 to-secondary/30 border border-emerald-500/20">
      <div className="flex items-center gap-2 mb-2">
        <DollarSign className="h-5 w-5 text-emerald-400" />
        <span className="text-sm font-medium">Expected Value Per Trade</span>
      </div>
      <p className={cn(
        "text-3xl font-bold tabular-nums font-mono mb-3",
        ev >= 0 ? "text-emerald-400" : "text-rose-400"
      )}>
        {ev >= 0 ? '+' : ''}{ev.toFixed(2)}%
      </p>
      <div className="text-xs text-muted-foreground space-y-1 font-mono">
        <p>EV = ({winRate.toFixed(0)}% × {avgWin.toFixed(1)}%) − ({(100 - winRate).toFixed(0)}% × {avgLoss.toFixed(1)}%)</p>
      </div>
      <p className="text-xs text-muted-foreground mt-3">
        {ev >= 0 
          ? `On average, you expect to make ${ev.toFixed(2)}% per trade over many repetitions.`
          : `This strategy has negative expected value - you'd lose money over time.`}
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function StrategyBacktester({ ticker, companyName }: StrategyBacktesterProps) {
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyOption | null>(null);
  const [params, setParams] = useState<Record<string, number>>({});
  const [period, setPeriod] = useState<'1Y' | '3Y' | '5Y'>('3Y');
  const [initialCapital, setInitialCapital] = useState(10000);
  const [stopLoss, setStopLoss] = useState<number | null>(null);
  const [takeProfit, setTakeProfit] = useState<number | null>(null);
  
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [showEducation, setShowEducation] = useState(false);

  const handleSelectStrategy = useCallback((strategy: StrategyOption) => {
    setSelectedStrategy(strategy);
    setParams(strategy.defaultParams);
    setResult(null);
    setError(null);
  }, []);

  const handleRunBacktest = useCallback(async () => {
    if (!selectedStrategy) {
      toast.error('Please select a strategy first');
      return;
    }

    setIsRunning(true);
    setError(null);
    setResult(null);

    try {
      const endDate = new Date();
      const startDate = new Date();
      switch (period) {
        case '1Y': startDate.setFullYear(endDate.getFullYear() - 1); break;
        case '3Y': startDate.setFullYear(endDate.getFullYear() - 3); break;
        case '5Y': startDate.setFullYear(endDate.getFullYear() - 5); break;
      }

      const { data, error: fnError } = await supabase.functions.invoke('strategy-backtest', {
        body: {
          ticker,
          strategy: selectedStrategy.id,
          startDate: format(startDate, 'yyyy-MM-dd'),
          endDate: format(endDate, 'yyyy-MM-dd'),
          initialCapital,
          params: {
            ...params,
            stopLossPercent: stopLoss,
            takeProfitPercent: takeProfit,
          }
        }
      });

      if (fnError) throw fnError;

      if (!data.success) {
        throw new Error(data.error || 'Backtest failed');
      }

      setResult(data as BacktestResult);
      toast.success(`Backtest complete: ${data.totalTrades} trades, ${data.totalReturn.toFixed(2)}% return`);

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Backtest failed';
      setError(message);
      toast.error(message);
    } finally {
      setIsRunning(false);
    }
  }, [selectedStrategy, ticker, period, initialCapital, params, stopLoss, takeProfit]);

  // Prepare chart data
  const chartData = result?.portfolioHistory.map((p, i) => {
    const buyHoldValue = result.portfolioHistory[0]?.value * 
      (1 + (result.buyHoldReturn / 100) * (i / (result.portfolioHistory.length - 1)));
    return {
      date: p.date,
      value: p.value,
      buyHold: buyHoldValue,
    };
  }) || [];

  // Distribution histogram data
  const distributionData = result?.trades.reduce((acc, trade) => {
    const bucket = Math.floor(trade.pnlPercent / 2) * 2;
    const key = `${bucket} to ${bucket + 2}`;
    const existing = acc.find(a => a.bucket === key);
    if (existing) {
      existing.count++;
    } else {
      acc.push({ bucket: key, bucketValue: bucket, count: 1, isPositive: bucket >= 0 });
    }
    return acc;
  }, [] as { bucket: string; bucketValue: number; count: number; isPositive: boolean }[])
    .sort((a, b) => a.bucketValue - b.bucketValue) || [];

  return (
    <div className="space-y-6">
      {/* Strategy Selection */}
      {!selectedStrategy ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Strategy Backtester</h2>
              <p className="text-sm text-muted-foreground">
                Test trading strategies on {companyName} ({ticker}) with real historical data
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {STRATEGIES.map((strategy) => {
              const Icon = strategy.icon;
              return (
                <Card 
                  key={strategy.id}
                  className="cursor-pointer hover:border-primary/50 transition-all group"
                  onClick={() => handleSelectStrategy(strategy)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-sm">{strategy.name}</h3>
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-[10px]",
                              strategy.riskLevel === 'Conservative' && 'border-emerald-500/50 text-emerald-400',
                              strategy.riskLevel === 'Moderate' && 'border-amber-500/50 text-amber-400',
                              strategy.riskLevel === 'Aggressive' && 'border-rose-500/50 text-rose-400',
                            )}
                          >
                            {strategy.riskLevel}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">{strategy.description}</p>
                        <p className="text-xs text-primary/80 italic">{strategy.whyItWorks}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Configuration Panel */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedStrategy(null)}>
                    ← Back
                  </Button>
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {selectedStrategy.name}
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-[10px]",
                          selectedStrategy.riskLevel === 'Conservative' && 'border-emerald-500/50 text-emerald-400',
                          selectedStrategy.riskLevel === 'Moderate' && 'border-amber-500/50 text-amber-400',
                          selectedStrategy.riskLevel === 'Aggressive' && 'border-rose-500/50 text-rose-400',
                        )}
                      >
                        {selectedStrategy.riskLevel}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="text-xs">{selectedStrategy.description}</CardDescription>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowEducation(true)}
                  className="text-primary"
                >
                  <BookOpen className="h-4 w-4 mr-1" />
                  Why It Works
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Strategy Parameters */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {selectedStrategy.paramConfig.map((param) => (
                  <div key={param.key} className="space-y-2">
                    <Label className="text-xs">{param.label}</Label>
                    <div className="flex items-center gap-2">
                      <Slider
                        value={[params[param.key] ?? selectedStrategy.defaultParams[param.key]]}
                        min={param.min}
                        max={param.max}
                        step={param.step}
                        onValueChange={([v]) => setParams(p => ({ ...p, [param.key]: v }))}
                        className="flex-1"
                      />
                      <span className="text-sm font-mono w-12 text-right">
                        {params[param.key] ?? selectedStrategy.defaultParams[param.key]}{param.suffix || ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Backtest Settings */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Time Period</Label>
                  <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1Y">1 Year</SelectItem>
                      <SelectItem value="3Y">3 Years</SelectItem>
                      <SelectItem value="5Y">5 Years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Initial Capital</Label>
                  <Select value={initialCapital.toString()} onValueChange={(v) => setInitialCapital(Number(v))}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10000">$10,000</SelectItem>
                      <SelectItem value="25000">$25,000</SelectItem>
                      <SelectItem value="50000">$50,000</SelectItem>
                      <SelectItem value="100000">$100,000</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Stop Loss %</Label>
                  <Select 
                    value={stopLoss?.toString() || 'none'} 
                    onValueChange={(v) => setStopLoss(v === 'none' ? null : Number(v))}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="5">-5%</SelectItem>
                      <SelectItem value="10">-10%</SelectItem>
                      <SelectItem value="15">-15%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Take Profit %</Label>
                  <Select 
                    value={takeProfit?.toString() || 'none'} 
                    onValueChange={(v) => setTakeProfit(v === 'none' ? null : Number(v))}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="10">+10%</SelectItem>
                      <SelectItem value="20">+20%</SelectItem>
                      <SelectItem value="30">+30%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button 
                    onClick={handleRunBacktest} 
                    disabled={isRunning}
                    className="w-full h-9"
                  >
                    {isRunning ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Running...</>
                    ) : (
                      <><Play className="h-4 w-4 mr-2" /> Run Backtest</>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Error Display */}
          {error && (
            <Card className="border-rose-500/30 bg-rose-500/5">
              <CardContent className="py-4">
                <div className="flex items-center gap-2 text-rose-400">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">{error}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Loading State */}
          {isRunning && (
            <Card>
              <CardContent className="py-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-sm text-muted-foreground">Running backtest on {ticker}...</p>
                <p className="text-xs text-muted-foreground mt-1">Analyzing {period} of historical data</p>
              </CardContent>
            </Card>
          )}

          {/* Results Dashboard */}
          {result && !isRunning && (
            <div className="space-y-6">
              {/* Performance Overview */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">📊 Backtest Results</CardTitle>
                    <Badge variant={result.totalReturn >= 0 ? 'default' : 'destructive'}>
                      {result.totalReturn >= 0 ? '+' : ''}{result.totalReturn.toFixed(2)}% Total Return
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    <MetricCard
                      label="Starting Capital"
                      value={`$${result.initialCapital.toLocaleString()}`}
                      description="The amount of capital used to start the backtest"
                      trend="neutral"
                    />
                    <MetricCard
                      label="Ending Value"
                      value={`$${result.finalValue.toLocaleString()}`}
                      description="The final portfolio value at the end of the backtest"
                      trend={result.finalValue > result.initialCapital ? 'good' : 'bad'}
                    />
                    <MetricCard
                      label="Annualized Return"
                      value={`${result.annualizedReturn >= 0 ? '+' : ''}${result.annualizedReturn.toFixed(2)}%`}
                      description="The compound annual growth rate (CAGR) of the strategy"
                      trend={result.annualizedReturn >= 0 ? 'good' : 'bad'}
                    />
                    <MetricCard
                      label="vs Buy & Hold"
                      value={`${result.outperformance >= 0 ? '+' : ''}${result.outperformance.toFixed(2)}%`}
                      description={`Strategy ${result.outperformance >= 0 ? 'outperformed' : 'underperformed'} simple buy-and-hold by this amount`}
                      trend={result.outperformance >= 0 ? 'good' : 'bad'}
                    />
                  </div>

                  {/* Equity Curve */}
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="strategyGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 10 }}
                          tickFormatter={(v) => format(new Date(v), 'MMM yy')}
                          className="text-muted-foreground"
                        />
                        <YAxis 
                          tick={{ fontSize: 10 }}
                          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                          className="text-muted-foreground"
                        />
                        <RechartsTooltip
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            fontSize: '12px'
                          }}
                          formatter={(value: number) => [`$${value.toFixed(2)}`, '']}
                          labelFormatter={(label) => format(new Date(label), 'MMM dd, yyyy')}
                        />
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke="hsl(var(--primary))"
                          fill="url(#strategyGradient)"
                          strokeWidth={2}
                          name="Strategy"
                        />
                        <Area
                          type="monotone"
                          dataKey="buyHold"
                          stroke="hsl(var(--muted-foreground))"
                          fill="none"
                          strokeWidth={1}
                          strokeDasharray="4 4"
                          name="Buy & Hold"
                        />
                        <ReferenceLine y={result.initialCapital} stroke="hsl(var(--muted-foreground))" strokeDasharray="2 2" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center gap-6 mt-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-0.5 bg-primary" />
                      <span>Strategy: {result.totalReturn >= 0 ? '+' : ''}{result.totalReturn.toFixed(2)}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-0.5 bg-muted-foreground border-dashed" />
                      <span>Buy & Hold: {result.buyHoldReturn >= 0 ? '+' : ''}{result.buyHoldReturn.toFixed(2)}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Risk-Adjusted Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SmoothnessScore sharpe={result.sharpeRatio} />
                <ExpectedValueCard 
                  winRate={result.winRate} 
                  avgWin={result.avgWin} 
                  avgLoss={result.avgLoss}
                  ev={result.expectedValue}
                />
                <div className="p-4 rounded-lg bg-gradient-to-br from-rose-500/10 to-secondary/30 border border-rose-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-5 w-5 text-rose-400" />
                    <span className="text-sm font-medium">Maximum Drawdown</span>
                  </div>
                  <p className="text-3xl font-bold tabular-nums font-mono text-rose-400 mb-1">
                    -{result.maxDrawdown.toFixed(2)}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    The worst peak-to-valley decline during the backtest period.
                  </p>
                  {result.maxDrawdownDate && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Occurred on {format(new Date(result.maxDrawdownDate), 'MMM dd, yyyy')}
                    </p>
                  )}
                </div>
              </div>

              {/* Trade Statistics */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Trade Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                    <MetricCard
                      label="Total Trades"
                      value={result.totalTrades.toString()}
                      description="Number of completed round-trip trades"
                      trend="neutral"
                    />
                    <MetricCard
                      label="Win Rate"
                      value={`${result.winRate.toFixed(1)}%`}
                      description="Percentage of trades that were profitable"
                      trend={result.winRate >= 50 ? 'good' : 'bad'}
                    />
                    <MetricCard
                      label="Avg Win"
                      value={`+${result.avgWin.toFixed(2)}%`}
                      description="Average return on winning trades"
                      trend="good"
                    />
                    <MetricCard
                      label="Avg Loss"
                      value={`-${result.avgLoss.toFixed(2)}%`}
                      description="Average return on losing trades"
                      trend="bad"
                    />
                    <MetricCard
                      label="Best Trade"
                      value={`+${result.bestTrade.toFixed(2)}%`}
                      description="The most profitable single trade"
                      trend="good"
                    />
                    <MetricCard
                      label="Worst Trade"
                      value={`${result.worstTrade.toFixed(2)}%`}
                      description="The least profitable single trade"
                      trend="bad"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Distribution Histogram */}
              {distributionData.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Return Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={distributionData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                          <XAxis 
                            dataKey="bucket" 
                            tick={{ fontSize: 10 }}
                            className="text-muted-foreground"
                          />
                          <YAxis 
                            tick={{ fontSize: 10 }}
                            className="text-muted-foreground"
                          />
                          <RechartsTooltip
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))', 
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                              fontSize: '12px'
                            }}
                          />
                          <Bar 
                            dataKey="count" 
                            fill="hsl(var(--primary))"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Trade Table */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Trade History ({result.trades.length} trades)</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[300px]">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-card border-b">
                        <tr>
                          <th className="text-left p-3 font-medium">#</th>
                          <th className="text-left p-3 font-medium">Entry</th>
                          <th className="text-left p-3 font-medium">Exit</th>
                          <th className="text-right p-3 font-medium">Entry $</th>
                          <th className="text-right p-3 font-medium">Exit $</th>
                          <th className="text-right p-3 font-medium">Return</th>
                          <th className="text-right p-3 font-medium">P&L</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.trades.map((trade, i) => (
                          <tr 
                            key={i} 
                            className="border-b cursor-pointer hover:bg-secondary/50 transition-colors"
                            onClick={() => setSelectedTrade(trade)}
                          >
                            <td className="p-3 font-mono">{i + 1}</td>
                            <td className="p-3">{format(new Date(trade.entryDate), 'MMM dd, yy')}</td>
                            <td className="p-3">{format(new Date(trade.exitDate), 'MMM dd, yy')}</td>
                            <td className="p-3 text-right font-mono">${trade.entryPrice.toFixed(2)}</td>
                            <td className="p-3 text-right font-mono">${trade.exitPrice.toFixed(2)}</td>
                            <td className={cn(
                              "p-3 text-right font-mono font-semibold",
                              trade.pnlPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            )}>
                              {trade.pnlPercent >= 0 ? '+' : ''}{trade.pnlPercent.toFixed(2)}%
                            </td>
                            <td className={cn(
                              "p-3 text-right font-mono",
                              trade.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            )}>
                              {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Trade Detail Modal */}
      <Dialog open={!!selectedTrade} onOpenChange={() => setSelectedTrade(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Trade Details</DialogTitle>
            <DialogDescription>
              {selectedTrade?.entryDate} → {selectedTrade?.exitDate}
            </DialogDescription>
          </DialogHeader>
          {selectedTrade && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">Entry</p>
                  <p className="font-semibold">${selectedTrade.entryPrice.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(selectedTrade.entryDate), 'MMMM dd, yyyy')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Exit</p>
                  <p className="font-semibold">${selectedTrade.exitPrice.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(selectedTrade.exitDate), 'MMMM dd, yyyy')}</p>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">Shares</p>
                  <p className="font-semibold">{selectedTrade.shares}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Duration</p>
                  <p className="font-semibold">{selectedTrade.holdingDays} days</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Return</p>
                  <p className={cn(
                    "font-semibold",
                    selectedTrade.pnlPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  )}>
                    {selectedTrade.pnlPercent >= 0 ? '+' : ''}{selectedTrade.pnlPercent.toFixed(2)}% (${selectedTrade.pnl.toFixed(2)})
                  </p>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-muted-foreground mb-1 text-sm">Entry Signal</p>
                <p className="text-sm bg-secondary/50 p-2 rounded">{selectedTrade.entryReason}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1 text-sm">Exit Signal</p>
                <p className="text-sm bg-secondary/50 p-2 rounded">{selectedTrade.exitReason}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Educational Modal */}
      <Dialog open={showEducation} onOpenChange={setShowEducation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedStrategy?.name}</DialogTitle>
          </DialogHeader>
          {selectedStrategy && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2 text-sm">How It Works</h4>
                <p className="text-sm text-muted-foreground">{selectedStrategy.description}</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2 text-sm">Why It Works</h4>
                <p className="text-sm text-muted-foreground">{selectedStrategy.whyItWorks}</p>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                <h4 className="font-semibold mb-2 text-sm text-amber-400 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Things to Consider
                </h4>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Past performance does not guarantee future results</li>
                  <li>This backtest does not include transaction costs beyond what you specified</li>
                  <li>Real-world slippage and liquidity may affect actual performance</li>
                  <li>Consider combining with other analysis before trading real money</li>
                </ul>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
