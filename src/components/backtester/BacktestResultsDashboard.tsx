/**
 * Comprehensive Backtest Results Dashboard
 * 
 * Professional-grade results display with TradingView-equivalent metrics
 * plus advanced institutional analytics.
 */

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
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
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ComposedChart,
  Line,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  AlertTriangle,
  Shield,
  DollarSign,
  BarChart3,
  PieChart as PieIcon,
  Calendar,
  Clock,
  Award,
  Zap,
  Info,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';
import { parseDateOnly } from '@/lib/date';
import { HealthScore } from '@/components/ui/HealthScore';
import { TradeExport } from './TradeExport';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

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

export interface BacktestResultData {
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
  dataSource: 'database' | 'polygon';
  // Advanced metrics (calculated client-side if not from server)
  calmarRatio?: number;
  consecutiveWins?: number;
  consecutiveLosses?: number;
  avgConsecutiveWins?: number;
  avgConsecutiveLosses?: number;
  timeInDrawdown?: number;
  avgDrawdownDuration?: number;
  recoveryFactor?: number;
  payoffRatio?: number;
  kellyPercent?: number;
  rMultiples?: number[];
  // Execution costs (applied to all metrics by default)
  executionConfig?: { slippageBps: number; commissionPerTrade: number; applySlippage: boolean; applyCommission: boolean };
  totalSlippageCost?: number;
  totalCommissionCost?: number;

  // Integrity + labeling (provided by backend)
  dataWindow?: {
    requestedStartDate: string;
    requestedEndDate: string;
    effectiveStartDate: string;
    effectiveEndDate: string;
    lastAvailableBarDate: string;
    wasEndDateClamped: boolean;
    isForwardSimulated: boolean;
  };
}

interface BacktestResultsDashboardProps {
  result: BacktestResultData;
  compact?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function calculateAdvancedMetrics(result: BacktestResultData) {
  const { trades, portfolioHistory, maxDrawdown, totalReturn, annualizedReturn, initialCapital } = result;
  
  // Calmar Ratio = Annualized Return / Max Drawdown
  const calmarRatio = maxDrawdown > 0 ? annualizedReturn / maxDrawdown : 0;
  
  // Consecutive wins/losses
  let currentStreak = 0;
  let maxConsecutiveWins = 0;
  let maxConsecutiveLosses = 0;
  let winStreaks: number[] = [];
  let lossStreaks: number[] = [];
  
  trades.forEach((trade, i) => {
    const isWin = trade.pnl > 0;
    const prevWin = i > 0 ? trades[i - 1].pnl > 0 : isWin;
    
    if (isWin === prevWin || i === 0) {
      currentStreak++;
    } else {
      if (prevWin) {
        winStreaks.push(currentStreak);
        maxConsecutiveWins = Math.max(maxConsecutiveWins, currentStreak);
      } else {
        lossStreaks.push(currentStreak);
        maxConsecutiveLosses = Math.max(maxConsecutiveLosses, currentStreak);
      }
      currentStreak = 1;
    }
  });
  
  // Final streak
  if (trades.length > 0) {
    if (trades[trades.length - 1].pnl > 0) {
      winStreaks.push(currentStreak);
      maxConsecutiveWins = Math.max(maxConsecutiveWins, currentStreak);
    } else {
      lossStreaks.push(currentStreak);
      maxConsecutiveLosses = Math.max(maxConsecutiveLosses, currentStreak);
    }
  }
  
  const avgConsecutiveWins = winStreaks.length > 0 
    ? winStreaks.reduce((a, b) => a + b, 0) / winStreaks.length 
    : 0;
  const avgConsecutiveLosses = lossStreaks.length > 0 
    ? lossStreaks.reduce((a, b) => a + b, 0) / lossStreaks.length 
    : 0;
  
  // Time in drawdown (percentage of time below peak)
  let peak = initialCapital;
  let daysInDrawdown = 0;
  
  portfolioHistory.forEach(snapshot => {
    if (snapshot.value >= peak) {
      peak = snapshot.value;
    } else {
      daysInDrawdown++;
    }
  });
  
  const timeInDrawdown = portfolioHistory.length > 0 
    ? (daysInDrawdown / portfolioHistory.length) * 100 
    : 0;
  
  // Recovery Factor = Total Return / Max Drawdown
  const recoveryFactor = maxDrawdown > 0 ? totalReturn / maxDrawdown : 0;
  
  // Payoff Ratio = Avg Win / Avg Loss
  const payoffRatio = result.avgLoss > 0 ? result.avgWin / result.avgLoss : 0;
  
  // Kelly Criterion = W - [(1-W)/R] where W = win rate, R = payoff ratio
  const winRateDecimal = result.winRate / 100;
  const kellyPercent = payoffRatio > 0 
    ? (winRateDecimal - ((1 - winRateDecimal) / payoffRatio)) * 100
    : 0;
  
  // R-Multiples (returns expressed as multiples of risk)
  // Using a baseline risk of 2% per trade
  const baselineRisk = 2;
  const rMultiples = trades.map(t => t.pnlPercent / baselineRisk);
  
  return {
    calmarRatio: Math.round(calmarRatio * 100) / 100,
    consecutiveWins: maxConsecutiveWins,
    consecutiveLosses: maxConsecutiveLosses,
    avgConsecutiveWins: Math.round(avgConsecutiveWins * 10) / 10,
    avgConsecutiveLosses: Math.round(avgConsecutiveLosses * 10) / 10,
    timeInDrawdown: Math.round(timeInDrawdown * 10) / 10,
    recoveryFactor: Math.round(recoveryFactor * 100) / 100,
    payoffRatio: Math.round(payoffRatio * 100) / 100,
    kellyPercent: Math.round(kellyPercent * 10) / 10,
    rMultiples,
  };
}

function getHealthScore(result: BacktestResultData, advanced: ReturnType<typeof calculateAdvancedMetrics>): number {
  let score = 50; // Baseline
  
  // Positive factors
  if (result.totalReturn > 0) score += 10;
  if (result.winRate >= 50) score += 5;
  if (result.sharpeRatio >= 1) score += 10;
  if (result.sortinoRatio >= 1.5) score += 5;
  if (result.profitFactor >= 1.5) score += 5;
  if (result.outperformance > 0) score += 5;
  if (advanced.calmarRatio >= 1) score += 5;
  if (advanced.payoffRatio >= 1.5) score += 5;
  
  // Negative factors
  if (result.maxDrawdown > 20) score -= 10;
  if (result.maxDrawdown > 40) score -= 10;
  if (result.winRate < 40) score -= 10;
  if (result.totalTrades < 10) score -= 5;
  if (advanced.timeInDrawdown > 50) score -= 5;
  
  return Math.max(0, Math.min(100, score));
}

// ═══════════════════════════════════════════════════════════════════════════════
// METRIC COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function MetricCard({ 
  label, 
  value, 
  description, 
  trend, 
  icon: Icon,
  className 
}: { 
  label: string; 
  value: string | number; 
  description?: string;
  trend?: 'good' | 'bad' | 'neutral';
  icon?: React.ElementType;
  className?: string;
}) {
  return (
    <div className={cn("p-3 rounded-lg bg-secondary/30 border", className)}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
      </div>
      <p className={cn(
        "text-lg font-bold font-mono",
        trend === 'good' && "text-emerald-400",
        trend === 'bad' && "text-rose-400",
        trend === 'neutral' && "text-foreground"
      )}>
        {value}
      </p>
      {description && (
        <p className="text-[10px] text-muted-foreground mt-1">{description}</p>
      )}
    </div>
  );
}

function RiskRewardRadar({ result, advanced }: { result: BacktestResultData; advanced: ReturnType<typeof calculateAdvancedMetrics> }) {
  const data = [
    { metric: 'Win Rate', value: Math.min(result.winRate, 100), max: 100 },
    { metric: 'Sharpe', value: Math.min(Math.max(result.sharpeRatio * 25 + 50, 0), 100), max: 100 },
    { metric: 'Profit Factor', value: Math.min(result.profitFactor * 20, 100), max: 100 },
    { metric: 'Calmar', value: Math.min(advanced.calmarRatio * 25, 100), max: 100 },
    { metric: 'Recovery', value: Math.min(advanced.recoveryFactor * 10, 100), max: 100 },
    { metric: 'Payoff', value: Math.min(advanced.payoffRatio * 25, 100), max: 100 },
  ];

  return (
    <ResponsiveContainer width="100%" height={200}>
      <RadarChart data={data}>
        <PolarGrid className="stroke-muted/30" />
        <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10 }} className="text-muted-foreground" />
        <PolarRadiusAxis tick={false} axisLine={false} />
        <Radar
          name="Strategy"
          dataKey="value"
          stroke="hsl(var(--primary))"
          fill="hsl(var(--primary))"
          fillOpacity={0.3}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}

function DrawdownChart({ portfolioHistory, initialCapital }: { portfolioHistory: PortfolioSnapshot[]; initialCapital: number }) {
  const drawdownData = useMemo(() => {
    let peak = initialCapital;
    return portfolioHistory.map(snapshot => {
      if (snapshot.value > peak) peak = snapshot.value;
      const drawdown = ((snapshot.value - peak) / peak) * 100;
      return {
        date: snapshot.date,
        drawdown,
        value: snapshot.value,
      };
    });
  }, [portfolioHistory, initialCapital]);

  return (
    <ResponsiveContainer width="100%" height={150}>
      <AreaChart data={drawdownData}>
        <defs>
          <linearGradient id="drawdownGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(0 84% 60%)" stopOpacity={0.4}/>
            <stop offset="95%" stopColor="hsl(0 84% 60%)" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
        <XAxis 
          dataKey="date" 
          tick={{ fontSize: 9 }}
          tickFormatter={(v) => format(new Date(v), 'MMM yy')}
          className="text-muted-foreground"
        />
        <YAxis 
          tick={{ fontSize: 9 }}
          tickFormatter={(v) => `${v.toFixed(0)}%`}
          className="text-muted-foreground"
          domain={['auto', 0]}
        />
        <RechartsTooltip
          contentStyle={{ 
            backgroundColor: 'hsl(var(--card))', 
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            fontSize: '11px'
          }}
          formatter={(value: number) => [`${value.toFixed(2)}%`, 'Drawdown']}
        />
        <Area
          type="monotone"
          dataKey="drawdown"
          stroke="hsl(0 84% 60%)"
          fill="url(#drawdownGradient)"
          strokeWidth={1.5}
        />
        <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function MonthlyReturnsHeatmap({ trades }: { trades: Trade[] }) {
  const monthlyReturns = useMemo(() => {
    const byMonth: Record<string, number> = {};
    
    trades.forEach(trade => {
      const month = format(parseDateOnly(trade.exitDate), 'yyyy-MM');
      byMonth[month] = (byMonth[month] || 0) + trade.pnlPercent;
    });
    
    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12) // Last 12 months
      .map(([month, ret]) => ({
        month: format(parseDateOnly(month + '-01'), 'MMM yy'),
        return: Math.round(ret * 100) / 100,
      }));
  }, [trades]);

  if (monthlyReturns.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={100}>
      <BarChart data={monthlyReturns}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
        <XAxis dataKey="month" tick={{ fontSize: 9 }} className="text-muted-foreground" />
        <YAxis tick={{ fontSize: 9 }} tickFormatter={v => `${v}%`} className="text-muted-foreground" />
        <RechartsTooltip
          contentStyle={{ 
            backgroundColor: 'hsl(var(--card))', 
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            fontSize: '11px'
          }}
        />
        <Bar dataKey="return" radius={[2, 2, 0, 0]}>
          {monthlyReturns.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={entry.return >= 0 ? 'hsl(142 76% 36%)' : 'hsl(0 84% 60%)'} 
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function RMultipleDistribution({ rMultiples }: { rMultiples: number[] }) {
  const distribution = useMemo(() => {
    const buckets: Record<string, number> = {
      '< -2R': 0,
      '-2R to -1R': 0,
      '-1R to 0': 0,
      '0 to 1R': 0,
      '1R to 2R': 0,
      '> 2R': 0,
    };
    
    rMultiples.forEach(r => {
      if (r < -2) buckets['< -2R']++;
      else if (r < -1) buckets['-2R to -1R']++;
      else if (r < 0) buckets['-1R to 0']++;
      else if (r < 1) buckets['0 to 1R']++;
      else if (r < 2) buckets['1R to 2R']++;
      else buckets['> 2R']++;
    });
    
    return Object.entries(buckets).map(([bucket, count]) => ({
      bucket,
      count,
      isPositive: bucket.includes('0 to') || bucket.includes('1R to') || bucket.includes('> 2R'),
    }));
  }, [rMultiples]);

  if (rMultiples.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={120}>
      <BarChart data={distribution}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
        <XAxis dataKey="bucket" tick={{ fontSize: 8 }} className="text-muted-foreground" />
        <YAxis tick={{ fontSize: 9 }} className="text-muted-foreground" />
        <RechartsTooltip
          contentStyle={{ 
            backgroundColor: 'hsl(var(--card))', 
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            fontSize: '11px'
          }}
        />
        <Bar dataKey="count" radius={[2, 2, 0, 0]}>
          {distribution.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={entry.isPositive ? 'hsl(142 76% 36%)' : 'hsl(0 84% 60%)'} 
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function BacktestResultsDashboard({ result, compact = false }: BacktestResultsDashboardProps) {
  const advanced = useMemo(() => calculateAdvancedMetrics(result), [result]);
  const healthScore = useMemo(() => getHealthScore(result, advanced), [result, advanced]);
  
  const equityData = useMemo(() => {
    const firstClose = result.portfolioHistory[0]?.value || result.initialCapital;
    return result.portfolioHistory.map((snapshot, idx) => ({
      date: snapshot.date,
      value: snapshot.value,
      buyHold: result.initialCapital * (1 + (result.buyHoldReturn / 100) * (idx / result.portfolioHistory.length)),
    }));
  }, [result]);

  if (compact) {
    // Compact view for inline display
    return (
      <Card className="border-primary/20">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Backtest Results
            </CardTitle>
            <HealthScore score={healthScore} size="sm" showLabel />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Key Metrics Row */}
          <div className="grid grid-cols-4 gap-2">
            <MetricCard 
              label="Total Return" 
              value={`${result.totalReturn >= 0 ? '+' : ''}${result.totalReturn.toFixed(2)}%`}
              trend={result.totalReturn >= 0 ? 'good' : 'bad'}
            />
            <MetricCard 
              label="Win Rate" 
              value={`${result.winRate.toFixed(1)}%`}
              trend={result.winRate >= 50 ? 'good' : 'bad'}
            />
            <MetricCard 
              label="Trades" 
              value={result.totalTrades}
              trend="neutral"
            />
            <MetricCard 
              label="Sharpe" 
              value={result.sharpeRatio.toFixed(2)}
              trend={result.sharpeRatio >= 1 ? 'good' : result.sharpeRatio >= 0 ? 'neutral' : 'bad'}
            />
          </div>
          
          {/* Mini Equity Curve */}
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equityData}>
                <defs>
                  <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  fill="url(#equityGradient)"
                  strokeWidth={2}
                />
                <ReferenceLine y={result.initialCapital} stroke="hsl(var(--muted-foreground))" strokeDasharray="2 2" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center p-2 rounded bg-secondary/50">
              <p className="text-muted-foreground">Max DD</p>
              <p className="font-mono font-semibold text-rose-400">-{result.maxDrawdown.toFixed(1)}%</p>
            </div>
            <div className="text-center p-2 rounded bg-secondary/50">
              <p className="text-muted-foreground">Profit Factor</p>
              <p className="font-mono font-semibold">{result.profitFactor != null ? result.profitFactor.toFixed(2) : '∞'}</p>
            </div>
            <div className="text-center p-2 rounded bg-secondary/50">
              <p className="text-muted-foreground">vs Buy & Hold</p>
              <p className={cn(
                "font-mono font-semibold",
                result.outperformance >= 0 ? "text-emerald-400" : "text-rose-400"
              )}>
                {result.outperformance >= 0 ? '+' : ''}{result.outperformance.toFixed(1)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Full Dashboard View
  return (
    <div className="space-y-4">
      {/* Header with Health Score */}
      <Card className="border-primary/20">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Activity className="h-5 w-5" />
                {result.ticker} - {result.strategy.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())} Strategy
              </h3>
              <p className="text-sm text-muted-foreground">
                {format(new Date(result.startDate), 'MMM dd, yyyy')} → {format(new Date(result.endDate), 'MMM dd, yyyy')} • {result.tradingDays} trading days
              </p>

              {result.dataWindow && (result.dataWindow.wasEndDateClamped || result.dataWindow.isForwardSimulated) && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {result.dataWindow.wasEndDateClamped && (
                    <Badge variant="secondary" className="text-xs">
                      Clamped to last real bar ({result.dataWindow.effectiveEndDate})
                    </Badge>
                  )}
                  {result.dataWindow.isForwardSimulated && (
                    <Badge variant="destructive" className="text-xs">
                      Forward simulated
                    </Badge>
                  )}
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Strategy Health</p>
                  <HealthScore score={healthScore} size="lg" showLabel />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 h-9">
          <TabsTrigger value="performance" className="text-xs">Performance</TabsTrigger>
          <TabsTrigger value="risk" className="text-xs">Risk</TabsTrigger>
          <TabsTrigger value="trades" className="text-xs">Trade Analysis</TabsTrigger>
          <TabsTrigger value="advanced" className="text-xs">Advanced</TabsTrigger>
          <TabsTrigger value="behavioral" className="text-xs">Behavioral</TabsTrigger>
        </TabsList>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          {/* Execution Costs Summary - simplified single-scenario display */}
          {result.executionConfig && (result.totalSlippageCost || result.totalCommissionCost) ? (
            <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 border text-xs">
              <span className="text-muted-foreground">Execution Costs Applied:</span>
              <Badge variant="outline" className="font-mono">
                Slippage: ${(result.totalSlippageCost || 0).toFixed(2)}
              </Badge>
              <Badge variant="outline" className="font-mono">
                Commission: ${(result.totalCommissionCost || 0).toFixed(2)}
              </Badge>
              <span className="text-muted-foreground ml-auto">
                ({result.executionConfig.slippageBps} bps + ${result.executionConfig.commissionPerTrade}/trade)
              </span>
            </div>
          ) : null}
          
          {/* Key Performance Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard 
              label="Net Profit" 
              value={`$${(result.finalValue - result.initialCapital).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
              description={`${result.totalReturn >= 0 ? '+' : ''}${result.totalReturn.toFixed(2)}% return`}
              trend={result.totalReturn >= 0 ? 'good' : 'bad'}
              icon={DollarSign}
            />
            <MetricCard 
              label="Annualized Return" 
              value={`${result.annualizedReturn >= 0 ? '+' : ''}${result.annualizedReturn.toFixed(2)}%`}
              description="CAGR"
              trend={result.annualizedReturn >= 0 ? 'good' : 'bad'}
              icon={TrendingUp}
            />
            <MetricCard 
              label="Buy & Hold Return" 
              value={`${result.buyHoldReturn >= 0 ? '+' : ''}${result.buyHoldReturn.toFixed(2)}%`}
              description="Benchmark comparison"
              trend="neutral"
              icon={Target}
            />
            <MetricCard 
              label="Outperformance" 
              value={`${result.outperformance >= 0 ? '+' : ''}${result.outperformance.toFixed(2)}%`}
              description="Alpha generated"
              trend={result.outperformance >= 0 ? 'good' : 'bad'}
              icon={Award}
            />
          </div>

          {/* Equity Curve */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Equity Curve with Benchmark</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={equityData}>
                    <defs>
                      <linearGradient id="fullEquityGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 10 }}
          tickFormatter={(v) => format(parseDateOnly(String(v)), 'MMM yy')}
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
                        fontSize: '11px'
                      }}
                      formatter={(value: number, name: string) => [
                        `$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
                        name === 'value' ? 'Strategy' : 'Buy & Hold'
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="hsl(var(--primary))"
                      fill="url(#fullEquityGradient)"
                      strokeWidth={2}
                      name="Strategy"
                    />
                    <Line
                      type="monotone"
                      dataKey="buyHold"
                      stroke="hsl(var(--muted-foreground))"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      dot={false}
                      name="Buy & Hold"
                    />
                    <ReferenceLine y={result.initialCapital} stroke="hsl(var(--muted-foreground))" strokeDasharray="2 2" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 mt-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5 bg-primary" />
                  <span>Strategy</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5 bg-muted-foreground border-dashed" />
                  <span>Buy & Hold</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Returns */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Monthly Returns</CardTitle>
            </CardHeader>
            <CardContent>
              <MonthlyReturnsHeatmap trades={result.trades} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Risk Tab */}
        <TabsContent value="risk" className="space-y-4">
          {/* Risk Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard 
              label="Sharpe Ratio" 
              value={result.sharpeRatio.toFixed(2)}
              description="Risk-adjusted return"
              trend={result.sharpeRatio >= 1 ? 'good' : result.sharpeRatio >= 0 ? 'neutral' : 'bad'}
              icon={Shield}
            />
            <MetricCard 
              label="Sortino Ratio" 
              value={result.sortinoRatio.toFixed(2)}
              description="Downside-adjusted"
              trend={result.sortinoRatio >= 1.5 ? 'good' : result.sortinoRatio >= 0 ? 'neutral' : 'bad'}
              icon={Shield}
            />
            <MetricCard 
              label="Calmar Ratio" 
              value={advanced.calmarRatio.toFixed(2)}
              description="Return / Max DD"
              trend={advanced.calmarRatio >= 1 ? 'good' : 'neutral'}
              icon={Activity}
            />
            <MetricCard 
              label="Max Drawdown" 
              value={`-${result.maxDrawdown.toFixed(2)}%`}
              description={format(new Date(result.maxDrawdownDate), 'MMM dd, yyyy')}
              trend="bad"
              icon={AlertTriangle}
            />
          </div>

          {/* More Risk Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard 
              label="Volatility" 
              value={`${result.volatility.toFixed(2)}%`}
              description="Annualized std dev"
              trend="neutral"
            />
            <MetricCard 
              label="Recovery Factor" 
              value={advanced.recoveryFactor.toFixed(2)}
              description="Return / Max DD"
              trend={advanced.recoveryFactor >= 2 ? 'good' : 'neutral'}
            />
            <MetricCard 
              label="Time in Drawdown" 
              value={`${advanced.timeInDrawdown.toFixed(1)}%`}
              description="% of time below peak"
              trend={advanced.timeInDrawdown < 30 ? 'good' : advanced.timeInDrawdown < 50 ? 'neutral' : 'bad'}
            />
            <MetricCard 
              label="Profit Factor" 
              value={result.profitFactor != null ? result.profitFactor.toFixed(2) : '∞'}
              description="Gross profit / loss"
              trend={result.profitFactor == null || result.profitFactor >= 1.5 ? 'good' : result.profitFactor >= 1 ? 'neutral' : 'bad'}
            />
          </div>

          {/* Drawdown Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-rose-400" />
                Underwater Equity (Drawdown)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DrawdownChart portfolioHistory={result.portfolioHistory} initialCapital={result.initialCapital} />
            </CardContent>
          </Card>

          {/* Risk Radar */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Risk-Reward Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <RiskRewardRadar result={result} advanced={advanced} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trades Tab */}
        <TabsContent value="trades" className="space-y-4">
          {/* Trade Summary */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            <MetricCard label="Total Trades" value={result.totalTrades} trend="neutral" />
            <MetricCard 
              label="Win Rate" 
              value={`${result.winRate.toFixed(1)}%`} 
              trend={result.winRate >= 50 ? 'good' : 'bad'} 
            />
            <MetricCard label="Avg Win" value={`+${result.avgWin.toFixed(2)}%`} trend="good" />
            <MetricCard label="Avg Loss" value={`-${result.avgLoss.toFixed(2)}%`} trend="bad" />
            <MetricCard label="Best Trade" value={`+${result.bestTrade.toFixed(2)}%`} trend="good" />
            <MetricCard label="Worst Trade" value={`${result.worstTrade.toFixed(2)}%`} trend="bad" />
          </div>

          {/* More Trade Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard 
              label="Expected Value" 
              value={`${result.expectedValue >= 0 ? '+' : ''}${result.expectedValue.toFixed(2)}%`}
              description="Per trade"
              trend={result.expectedValue >= 0 ? 'good' : 'bad'}
            />
            <MetricCard 
              label="Payoff Ratio" 
              value={advanced.payoffRatio.toFixed(2)}
              description="Avg Win / Avg Loss"
              trend={advanced.payoffRatio >= 1.5 ? 'good' : 'neutral'}
            />
            <MetricCard 
              label="Avg Hold (trading)" 
              value={`${result.avgHoldingDays.toFixed(1)} trading days`}
              description="Excludes weekends/holidays"
              trend="neutral"
            />
            <MetricCard 
              label="Kelly %" 
              value={`${advanced.kellyPercent.toFixed(1)}%`}
              description="Optimal position size"
              trend={advanced.kellyPercent > 0 ? 'good' : 'bad'}
            />
          </div>

          {/* Trade Distribution */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Trade Return Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <RMultipleDistribution rMultiples={advanced.rMultiples} />
            </CardContent>
          </Card>

          {/* Trade List */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm">Trade History</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Detailed execution log with fill prices and signals
                  </CardDescription>
                </div>
                <TradeExport 
                  trades={result.trades} 
                  ticker={result.ticker} 
                  strategy={result.strategy} 
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[300px]">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-card border-b z-10">
                    <tr>
                      <th className="text-left p-2 font-medium">#</th>
                      <th className="text-left p-2 font-medium">Entry Date</th>
                      <th className="text-right p-2 font-medium">Fill $</th>
                      <th className="text-left p-2 font-medium">Exit Date</th>
                      <th className="text-right p-2 font-medium">Fill $</th>
                      <th className="text-right p-2 font-medium">Shares</th>
                      <th className="text-right p-2 font-medium">Trading days</th>
                      <th className="text-right p-2 font-medium">Return</th>
                      <th className="text-right p-2 font-medium">P&L</th>
                      <th className="text-left p-2 font-medium">Signal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.trades.map((trade, i) => (
                      <tr key={i} className="border-b hover:bg-secondary/30">
                        <td className="p-2 font-mono text-muted-foreground">{i + 1}</td>
                        <td className="p-2">
                    <span className="font-medium">{format(parseDateOnly(trade.entryDate), 'MMM dd, yy')}</span>
                        </td>
                        <td className="p-2 text-right font-mono text-cyan-400">
                          ${trade.entryPrice.toFixed(2)}
                        </td>
                        <td className="p-2">
                          <span className="font-medium">{format(parseDateOnly(trade.exitDate), 'MMM dd, yy')}</span>
                        </td>
                        <td className="p-2 text-right font-mono text-cyan-400">
                          ${trade.exitPrice.toFixed(2)}
                        </td>
                        <td className="p-2 text-right font-mono text-muted-foreground">
                          {trade.shares.toLocaleString()}
                        </td>
                        <td className="p-2 text-right font-mono">{trade.holdingDays}</td>
                        <td className={cn(
                          "p-2 text-right font-mono font-semibold",
                          trade.pnlPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        )}>
                          {trade.pnlPercent >= 0 ? '+' : ''}{trade.pnlPercent.toFixed(2)}%
                        </td>
                        <td className={cn(
                          "p-2 text-right font-mono",
                          trade.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        )}>
                          ${trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(0)}
                        </td>
                        <td className="p-2 max-w-[120px]">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-muted-foreground truncate block cursor-help">
                                  {trade.exitReason || 'Strategy signal'}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="left" className="max-w-[250px]">
                                <div className="text-xs space-y-1">
                                  <p><span className="text-emerald-400">Entry:</span> {trade.entryReason || 'Strategy signal'}</p>
                                  <p><span className="text-rose-400">Exit:</span> {trade.exitReason || 'Strategy signal'}</p>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Tab */}
        <TabsContent value="advanced" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Statistical Validity Metrics
              </CardTitle>
              <CardDescription className="text-xs">
                Advanced metrics for evaluating strategy robustness
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-3 rounded-lg bg-secondary/30 border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">Sample Size</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs max-w-[200px]">
                            More trades = more statistically significant results. 30+ trades recommended.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <p className={cn(
                    "text-xl font-bold font-mono",
                    result.totalTrades >= 30 ? "text-emerald-400" : result.totalTrades >= 10 ? "text-amber-400" : "text-rose-400"
                  )}>
                    {result.totalTrades} trades
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {result.totalTrades >= 30 ? 'Sufficient' : result.totalTrades >= 10 ? 'Marginal' : 'Low'} sample size
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-secondary/30 border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">Win/Loss Ratio</span>
                  </div>
                  <p className="text-xl font-bold font-mono">
                    {result.winningTrades}W / {result.losingTrades}L
                  </p>
                  <Progress 
                    value={result.winRate} 
                    className="h-1.5 mt-2"
                  />
                </div>

                <div className="p-3 rounded-lg bg-secondary/30 border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">Expectancy</span>
                  </div>
                  <p className={cn(
                    "text-xl font-bold font-mono",
                    result.expectedValue >= 0 ? "text-emerald-400" : "text-rose-400"
                  )}>
                    {result.expectedValue >= 0 ? '+' : ''}{result.expectedValue.toFixed(2)}%
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Expected return per trade
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Streak Analysis */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Streak Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MetricCard 
                  label="Max Consecutive Wins" 
                  value={advanced.consecutiveWins}
                  trend="good"
                />
                <MetricCard 
                  label="Avg Win Streak" 
                  value={advanced.avgConsecutiveWins.toFixed(1)}
                  trend="neutral"
                />
                <MetricCard 
                  label="Max Consecutive Losses" 
                  value={advanced.consecutiveLosses}
                  trend="bad"
                />
                <MetricCard 
                  label="Avg Loss Streak" 
                  value={advanced.avgConsecutiveLosses.toFixed(1)}
                  trend="neutral"
                />
              </div>
            </CardContent>
          </Card>

          {/* Position Sizing */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Optimal Position Sizing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-secondary/30 border text-center">
                  <p className="text-xs text-muted-foreground mb-1">Kelly Criterion</p>
                  <p className={cn(
                    "text-2xl font-bold font-mono",
                    advanced.kellyPercent > 0 ? "text-emerald-400" : "text-rose-400"
                  )}>
                    {advanced.kellyPercent.toFixed(1)}%
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Theoretical optimal
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/30 border text-center">
                  <p className="text-xs text-muted-foreground mb-1">Half Kelly (Recommended)</p>
                  <p className="text-2xl font-bold font-mono text-primary">
                    {(advanced.kellyPercent / 2).toFixed(1)}%
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Conservative approach
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/30 border text-center">
                  <p className="text-xs text-muted-foreground mb-1">Quarter Kelly</p>
                  <p className="text-2xl font-bold font-mono">
                    {(advanced.kellyPercent / 4).toFixed(1)}%
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Very conservative
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Behavioral Tab */}
        <TabsContent value="behavioral" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Behavioral Metrics
              </CardTitle>
              <CardDescription className="text-xs">
                How this strategy might feel psychologically
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-secondary/30 border">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Time in Pain</span>
                  </div>
                  <p className={cn(
                    "text-2xl font-bold font-mono",
                    advanced.timeInDrawdown < 30 ? "text-emerald-400" : 
                    advanced.timeInDrawdown < 50 ? "text-amber-400" : "text-rose-400"
                  )}>
                    {advanced.timeInDrawdown.toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    of the time you'd be below your peak equity
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-secondary/30 border">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown className="h-4 w-4 text-rose-400" />
                    <span className="text-sm font-medium">Worst Peak-to-Valley</span>
                  </div>
                  <p className="text-2xl font-bold font-mono text-rose-400">
                    -{result.maxDrawdown.toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Maximum loss from peak before recovery
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-secondary/30 border">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                    <span className="text-sm font-medium">Longest Losing Streak</span>
                  </div>
                  <p className="text-2xl font-bold font-mono text-amber-400">
                    {advanced.consecutiveLosses} trades
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Maximum consecutive losses
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Psychological Difficulty Score */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Psychological Difficulty Assessment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Difficulty factors */}
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Drawdown Severity</span>
                      <span className="font-mono">{Math.min(result.maxDrawdown / 50 * 100, 100).toFixed(0)}%</span>
                    </div>
                    <Progress value={Math.min(result.maxDrawdown / 50 * 100, 100)} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Time Under Pressure</span>
                      <span className="font-mono">{advanced.timeInDrawdown.toFixed(0)}%</span>
                    </div>
                    <Progress value={advanced.timeInDrawdown} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Loss Streak Risk</span>
                      <span className="font-mono">{Math.min(advanced.consecutiveLosses / 10 * 100, 100).toFixed(0)}%</span>
                    </div>
                    <Progress value={Math.min(advanced.consecutiveLosses / 10 * 100, 100)} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Volatility Stress</span>
                      <span className="font-mono">{Math.min(result.volatility / 40 * 100, 100).toFixed(0)}%</span>
                    </div>
                    <Progress value={Math.min(result.volatility / 40 * 100, 100)} className="h-2" />
                  </div>
                </div>

                {/* Summary */}
                <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                  <p>
                    <strong>Key Insight:</strong> This strategy would have you below your peak equity{' '}
                    {advanced.timeInDrawdown.toFixed(0)}% of the time, with a worst-case drop of{' '}
                    {result.maxDrawdown.toFixed(1)}%. You'd need to endure up to {advanced.consecutiveLosses}{' '}
                    consecutive losing trades. Consider if you can psychologically handle these scenarios.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
