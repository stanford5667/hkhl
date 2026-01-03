// Advanced Metrics Dashboard - CVaR, Sortino, Liquidity Score
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  AlertTriangle, 
  TrendingDown, 
  Droplets, 
  BarChart3,
  Shield,
  Target,
  Activity,
  Gauge
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

export function AdvancedMetricsDashboard({ metrics }: AdvancedMetricsDashboardProps) {
  return (
    <div className="space-y-6">
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
              <p className="text-xs text-muted-foreground mb-1">Max Drawdown</p>
              <p className="text-xl font-bold text-rose-500">
                -{metrics.maxDrawdown.toFixed(2)}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Largest peak-to-trough decline
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
