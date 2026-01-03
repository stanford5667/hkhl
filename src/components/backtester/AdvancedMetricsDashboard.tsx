// Advanced Metrics Dashboard - Returns Analysis + CVaR, Sortino, Liquidity Score
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  AlertTriangle, 
  TrendingDown, 
  TrendingUp,
  Droplets, 
  BarChart3,
  Shield,
  Target,
  Activity,
  Gauge,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
  DollarSign
} from 'lucide-react';
import { AdvancedRiskMetrics } from '@/services/advancedMetricsService';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface AdvancedMetricsDashboardProps {
  metrics: AdvancedRiskMetrics;
}

interface MetricCardProps {
  label: string;
  value: string | number;
  description: string;
  icon: React.ElementType;
  trend?: 'good' | 'bad' | 'neutral';
  benchmark?: string;
}

function MetricCard({ label, value, description, icon: Icon, trend, benchmark }: MetricCardProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="p-4 rounded-lg bg-muted/30 border border-border/50 cursor-help hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <Icon className={cn(
                "h-4 w-4",
                trend === 'good' ? 'text-emerald-500' : trend === 'bad' ? 'text-rose-500' : 'text-muted-foreground'
              )} />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
            </div>
            <div className={cn(
              "text-2xl font-bold tabular-nums",
              trend === 'good' ? 'text-emerald-500' : trend === 'bad' ? 'text-rose-500' : 'text-foreground'
            )}>
              {value}
            </div>
            {benchmark && <div className="text-xs text-muted-foreground mt-1">{benchmark}</div>}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p>{description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Compact metric display for return grids
function CompactMetric({ 
  label, 
  value, 
  isPositive, 
  suffix = '%' 
}: { 
  label: string; 
  value: number; 
  isPositive?: boolean;
  suffix?: string;
}) {
  const positive = isPositive ?? value >= 0;
  return (
    <div className="text-center p-3 rounded-lg bg-muted/30 border border-border/50">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={cn(
        "text-lg font-bold tabular-nums",
        positive ? "text-emerald-500" : "text-rose-500"
      )}>
        {value >= 0 ? '+' : ''}{value.toFixed(2)}{suffix}
      </p>
    </div>
  );
}

export function AdvancedMetricsDashboard({ metrics }: AdvancedMetricsDashboardProps) {
  return (
    <div className="space-y-6">
      {/* Portfolio Returns Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            Portfolio Returns Analysis
          </CardTitle>
          <CardDescription>
            Comprehensive return metrics and performance breakdown
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Primary Return Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-emerald-500" />
                <span className="text-xs font-medium text-muted-foreground">Total Return</span>
              </div>
              <p className={cn(
                "text-3xl font-bold tabular-nums",
                metrics.totalReturn >= 0 ? "text-emerald-500" : "text-rose-500"
              )}>
                {metrics.totalReturn >= 0 ? '+' : ''}{metrics.totalReturn.toFixed(2)}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">Cumulative</p>
            </div>
            
            <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Percent className="h-4 w-4 text-blue-500" />
                <span className="text-xs font-medium text-muted-foreground">CAGR</span>
              </div>
              <p className={cn(
                "text-3xl font-bold tabular-nums",
                metrics.cagr >= 0 ? "text-blue-500" : "text-rose-500"
              )}>
                {metrics.cagr >= 0 ? '+' : ''}{metrics.cagr.toFixed(2)}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">Annualized</p>
            </div>
            
            <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-4 w-4 text-purple-500" />
                <span className="text-xs font-medium text-muted-foreground">Sharpe Ratio</span>
              </div>
              <p className={cn(
                "text-3xl font-bold tabular-nums",
                metrics.sharpeRatio >= 1 ? "text-emerald-500" : 
                metrics.sharpeRatio >= 0.5 ? "text-purple-500" : "text-rose-500"
              )}>
                {metrics.sharpeRatio.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Risk-adjusted</p>
            </div>
            
            <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-medium text-muted-foreground">Max Drawdown</span>
              </div>
              <p className="text-3xl font-bold tabular-nums text-rose-500">
                -{metrics.maxDrawdown.toFixed(2)}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">Peak to trough</p>
            </div>
          </div>
          
          {/* Monthly Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <CompactMetric 
              label="Avg Monthly" 
              value={metrics.avgMonthlyReturn} 
            />
            <CompactMetric 
              label="Monthly Vol" 
              value={metrics.monthlyVolatility}
              isPositive={metrics.monthlyVolatility < 5}
            />
            <CompactMetric 
              label="Best Month" 
              value={metrics.bestMonth}
              isPositive={true}
            />
            <CompactMetric 
              label="Worst Month" 
              value={metrics.worstMonth}
              isPositive={false}
            />
            <div className="text-center p-3 rounded-lg bg-muted/30 border border-border/50">
              <p className="text-xs text-muted-foreground mb-1">Positive Months</p>
              <p className={cn(
                "text-lg font-bold tabular-nums",
                metrics.positiveMonths >= 60 ? "text-emerald-500" : 
                metrics.positiveMonths >= 50 ? "text-foreground" : "text-rose-500"
              )}>
                {metrics.positiveMonths.toFixed(0)}%
              </p>
            </div>
          </div>
          
          {/* Yearly Returns */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5">
              <div className="flex items-center gap-2 mb-2">
                <ArrowUpRight className="h-5 w-5 text-emerald-500" />
                <span className="font-medium">Best Year</span>
              </div>
              <p className="text-2xl font-bold text-emerald-500 tabular-nums">
                +{metrics.bestYear.toFixed(2)}%
              </p>
            </div>
            <div className="p-4 rounded-lg border border-rose-500/30 bg-rose-500/5">
              <div className="flex items-center gap-2 mb-2">
                <ArrowDownRight className="h-5 w-5 text-rose-500" />
                <span className="font-medium">Worst Year</span>
              </div>
              <p className="text-2xl font-bold text-rose-500 tabular-nums">
                {metrics.worstYear.toFixed(2)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Benchmark Comparison */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="h-4 w-4 text-blue-500" />
            Benchmark Comparison (S&P 500)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              label="Alpha"
              value={`${metrics.alpha >= 0 ? '+' : ''}${metrics.alpha.toFixed(2)}%`}
              description="Excess return above what CAPM predicts. Positive alpha indicates outperformance vs benchmark."
              icon={TrendingUp}
              trend={metrics.alpha > 1 ? 'good' : metrics.alpha > 0 ? 'neutral' : 'bad'}
              benchmark="Target: >0%"
            />
            <MetricCard
              label="Beta"
              value={metrics.beta.toFixed(2)}
              description="Sensitivity to market movements. Beta 1.0 = moves with market. <1 = less volatile, >1 = more volatile."
              icon={Activity}
              trend={metrics.beta >= 0.8 && metrics.beta <= 1.2 ? 'neutral' : metrics.beta < 0.8 ? 'good' : 'bad'}
              benchmark="Market = 1.0"
            />
            <MetricCard
              label="R-Squared"
              value={`${metrics.rSquared.toFixed(1)}%`}
              description="How much of portfolio variance is explained by benchmark. Higher = more correlated to market."
              icon={BarChart3}
              trend="neutral"
              benchmark="Benchmark correlation"
            />
            <MetricCard
              label="Tracking Error"
              value={`${metrics.trackingError.toFixed(2)}%`}
              description="Annualized standard deviation of active returns vs benchmark. Lower = closer to benchmark."
              icon={Target}
              trend={metrics.trackingError < 5 ? 'neutral' : 'bad'}
              benchmark="Active risk"
            />
          </div>
          
          {/* Capture Ratios */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium flex items-center gap-2">
                  <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                  Upside Capture
                </span>
                <Badge variant={metrics.upCapture >= 100 ? 'default' : 'secondary'}>
                  {metrics.upCapture.toFixed(0)}%
                </Badge>
              </div>
              <Progress 
                value={Math.min(metrics.upCapture, 150)} 
                max={150}
                className={cn(
                  "h-2",
                  metrics.upCapture >= 100 && "[&>div]:bg-emerald-500"
                )}
              />
              <p className="text-xs text-muted-foreground mt-2">
                {metrics.upCapture >= 100 
                  ? "Capturing more than 100% of market gains"
                  : `Capturing ${metrics.upCapture.toFixed(0)}% of up markets`}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium flex items-center gap-2">
                  <ArrowDownRight className="h-4 w-4 text-rose-500" />
                  Downside Capture
                </span>
                <Badge variant={metrics.downCapture <= 100 ? 'default' : 'destructive'}>
                  {metrics.downCapture.toFixed(0)}%
                </Badge>
              </div>
              <Progress 
                value={Math.min(metrics.downCapture, 150)} 
                max={150}
                className={cn(
                  "h-2",
                  metrics.downCapture <= 80 && "[&>div]:bg-emerald-500",
                  metrics.downCapture > 80 && metrics.downCapture <= 100 && "[&>div]:bg-amber-500",
                  metrics.downCapture > 100 && "[&>div]:bg-rose-500"
                )}
              />
              <p className="text-xs text-muted-foreground mt-2">
                {metrics.downCapture <= 80 
                  ? "Good downside protection"
                  : metrics.downCapture <= 100 
                  ? "Average downside participation"
                  : "More volatile than market in downturns"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tail Risk Metrics */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-500" />
            Tail Risk Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              label="CVaR (95%)"
              value={`-${metrics.cvar95.toFixed(2)}%`}
              description="Expected loss in the worst 5% of days. Lower is better. This is more informative than VaR as it shows average tail loss."
              icon={TrendingDown}
              trend={metrics.cvar95 < 3 ? 'good' : metrics.cvar95 < 5 ? 'neutral' : 'bad'}
              benchmark="Target: <3%"
            />
            <MetricCard
              label="CVaR (99%)"
              value={`-${metrics.cvar99.toFixed(2)}%`}
              description="Expected loss in the worst 1% of days. Critical for understanding extreme scenarios."
              icon={TrendingDown}
              trend={metrics.cvar99 < 5 ? 'good' : metrics.cvar99 < 8 ? 'neutral' : 'bad'}
              benchmark="Target: <5%"
            />
            <MetricCard
              label="Tail Ratio"
              value={metrics.tailRatio.toFixed(2)}
              description="Ratio of average gains to average losses in extreme scenarios. Higher is better - indicates positive skew."
              icon={BarChart3}
              trend={metrics.tailRatio > 1.2 ? 'good' : metrics.tailRatio > 0.8 ? 'neutral' : 'bad'}
              benchmark="Target: >1.0"
            />
            <MetricCard
              label="Ulcer Index"
              value={metrics.ulcerIndex.toFixed(2)}
              description="Measures depth and duration of drawdowns. Lower indicates less painful drawdown periods."
              icon={Activity}
              trend={metrics.ulcerIndex < 5 ? 'good' : metrics.ulcerIndex < 10 ? 'neutral' : 'bad'}
              benchmark="Target: <5"
            />
          </div>
        </CardContent>
      </Card>

      {/* Risk-Adjusted Returns */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="h-4 w-4 text-emerald-500" />
            Risk-Adjusted Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              label="Sortino Ratio"
              value={metrics.sortinoRatio.toFixed(2)}
              description="Like Sharpe ratio but only penalizes downside volatility. Better for asymmetric return distributions."
              icon={Target}
              trend={metrics.sortinoRatio > 2 ? 'good' : metrics.sortinoRatio > 1 ? 'neutral' : 'bad'}
              benchmark="Target: >2.0"
            />
            <MetricCard
              label="Calmar Ratio"
              value={metrics.calmarRatio.toFixed(2)}
              description="CAGR divided by max drawdown. Measures return per unit of drawdown risk."
              icon={Gauge}
              trend={metrics.calmarRatio > 1 ? 'good' : metrics.calmarRatio > 0.5 ? 'neutral' : 'bad'}
              benchmark="Target: >1.0"
            />
            <MetricCard
              label="Omega Ratio"
              value={metrics.omega.toFixed(2)}
              description="Probability-weighted ratio of gains to losses. Captures entire return distribution."
              icon={BarChart3}
              trend={metrics.omega > 2 ? 'good' : metrics.omega > 1.5 ? 'neutral' : 'bad'}
              benchmark="Target: >1.5"
            />
            <MetricCard
              label="Info Ratio"
              value={metrics.informationRatio.toFixed(2)}
              description="Active return per unit of active risk vs benchmark. Measures manager skill."
              icon={Target}
              trend={metrics.informationRatio > 0.5 ? 'good' : metrics.informationRatio > 0 ? 'neutral' : 'bad'}
              benchmark="Target: >0.5"
            />
          </div>
        </CardContent>
      </Card>

      {/* Liquidity Analysis */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Droplets className="h-4 w-4 text-blue-500" />
            Liquidity Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Liquidity Score</span>
                <Badge variant={
                  metrics.liquidityScore >= 80 ? 'default' : 
                  metrics.liquidityScore >= 50 ? 'secondary' : 'destructive'
                }>
                  {metrics.liquidityScore.toFixed(0)} / 100
                </Badge>
              </div>
              <Progress 
                value={metrics.liquidityScore} 
                className={cn(
                  "h-3",
                  metrics.liquidityScore >= 80 && "[&>div]:bg-emerald-500",
                  metrics.liquidityScore < 80 && metrics.liquidityScore >= 50 && "[&>div]:bg-amber-500",
                  metrics.liquidityScore < 50 && "[&>div]:bg-rose-500"
                )}
              />
              <p className="text-xs text-muted-foreground mt-2">
                {metrics.liquidityScore >= 80 
                  ? "Highly liquid - can exit most positions within 1 day"
                  : metrics.liquidityScore >= 50
                  ? "Moderate liquidity - some positions may take days to exit"
                  : "Low liquidity - significant slippage risk on exit"}
              </p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Est. Days to Liquidate</span>
                <Badge variant={
                  metrics.daysToLiquidate <= 1 ? 'default' : 
                  metrics.daysToLiquidate <= 5 ? 'secondary' : 'destructive'
                }>
                  {metrics.daysToLiquidate} days
                </Badge>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">
                  Time to fully liquidate portfolio without exceeding 10% of average daily volume for any position.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Distribution Metrics */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-purple-500" />
            Return Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
              <p className="text-xs text-muted-foreground mb-1">Skewness</p>
              <p className={cn(
                "text-xl font-bold",
                metrics.skewness > 0 ? "text-emerald-500" : metrics.skewness < -0.5 ? "text-rose-500" : "text-foreground"
              )}>
                {metrics.skewness.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics.skewness > 0 ? "Positive skew (good)" : metrics.skewness < -0.5 ? "Negative skew (caution)" : "Symmetric"}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
              <p className="text-xs text-muted-foreground mb-1">Excess Kurtosis</p>
              <p className={cn(
                "text-xl font-bold",
                metrics.kurtosis < 1 ? "text-emerald-500" : metrics.kurtosis > 3 ? "text-rose-500" : "text-foreground"
              )}>
                {metrics.kurtosis.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics.kurtosis > 3 ? "Fat tails (high)" : metrics.kurtosis < 1 ? "Thin tails (low)" : "Normal tails"}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
              <p className="text-xs text-muted-foreground mb-1">VaR (95%)</p>
              <p className="text-xl font-bold text-rose-500">
                -{metrics.var95.toFixed(2)}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Daily loss threshold (5% prob)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
