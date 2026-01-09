// Portfolio Metrics Panel - Displays key metrics matching Portfolio Builder
// Uses the same calculation logic as the Portfolio Visualizer

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown,
  Shield,
  Target,
  Activity,
  Gauge,
  RefreshCw,
  Info,
  AlertTriangle,
  Percent,
  DollarSign,
  BarChart3,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { usePortfolioCalculations, PortfolioMetrics } from '@/hooks/usePortfolioCalculations';
import { getMetricDefinition, formatMetricValue, getInterpretation } from '@/data/metricDefinitions';
import { MetricInfoIcon } from '@/components/shared/MetricInfoIcon';
import { KeyTakeawayCard } from '@/components/shared/KeyTakeawayCard';

interface PortfolioMetricsPanelProps {
  allocations: { symbol: string; weight: number }[];
  investableCapital?: number;
  portfolioName?: string;
  className?: string;
}

interface MetricItemProps {
  label: string;
  value: string | number;
  metricId?: string;
  trend?: 'good' | 'bad' | 'neutral';
  icon?: React.ElementType;
  size?: 'sm' | 'md' | 'lg';
}

function MetricItem({ label, value, metricId, trend, icon: Icon, size = 'md' }: MetricItemProps) {
  const definition = metricId ? getMetricDefinition(metricId) : null;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            "p-3 rounded-lg bg-muted/30 border border-border/50 cursor-help hover:bg-muted/50 transition-colors group",
            size === 'lg' && "p-4"
          )}>
            <div className="flex items-center gap-1.5 mb-1">
              {Icon && (
                <Icon className={cn(
                  "h-3.5 w-3.5",
                  trend === 'good' ? 'text-emerald-500' : trend === 'bad' ? 'text-rose-500' : 'text-muted-foreground'
                )} />
              )}
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
              {definition && (
                <Info className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
              )}
            </div>
            <div className={cn(
              "font-bold tabular-nums",
              size === 'lg' ? "text-2xl" : size === 'sm' ? "text-base" : "text-lg",
              trend === 'good' ? 'text-emerald-500' : trend === 'bad' ? 'text-rose-500' : 'text-foreground'
            )}>
              {value}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          {definition ? (
            <div className="space-y-2">
              <p className="font-medium">{definition.name}</p>
              <p className="text-sm text-muted-foreground">{definition.plainEnglish}</p>
              <div className="text-xs font-mono bg-muted/50 p-2 rounded border border-border/50">
                {definition.formula}
              </div>
              <p className="text-xs text-muted-foreground italic">{definition.whyItMatters}</p>
            </div>
          ) : (
            <p>{label}</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function PortfolioMetricsPanel({ 
  allocations, 
  investableCapital = 100000,
  portfolioName,
  className 
}: PortfolioMetricsPanelProps) {
  // Convert allocations to the format expected by usePortfolioCalculations
  // Weights come in as percentages (0-100) but the edge function expects decimals (0-1)
  const calcAllocations = allocations.map(a => ({
    ticker: a.symbol,
    weight: a.weight > 1 ? a.weight / 100 : a.weight, // Convert percentage to decimal if needed
  }));

  const {
    metrics,
    aiAnalysis,
    dataInfo,
    isLoading,
    isError,
    progress,
    recalculate,
  } = usePortfolioCalculations({
    allocations: calcAllocations,
    investableCapital,
    enabled: allocations.length > 0,
    includeAIAnalysis: true,
    generateTraces: false,
  });

  if (allocations.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Portfolio Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Add allocations to see portfolio metrics</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Portfolio Analytics
            {portfolioName && <Badge variant="outline" className="ml-2">{portfolioName}</Badge>}
          </CardTitle>
          <CardDescription>
            {progress.message || 'Calculating metrics...'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={(progress.current / Math.max(progress.total, 1)) * 100} className="h-1" />
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Fetching market data and running calculations...</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError || !metrics) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Portfolio Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-amber-500" />
            <p className="text-sm text-muted-foreground mb-3">Unable to calculate metrics</p>
            <Button variant="outline" size="sm" onClick={recalculate}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getTrend = (value: number, higher_is_better: boolean): 'good' | 'bad' | 'neutral' => {
    if (value === 0) return 'neutral';
    return (value > 0) === higher_is_better ? 'good' : 'bad';
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Portfolio Analytics
              {portfolioName && <Badge variant="outline" className="ml-2">{portfolioName}</Badge>}
            </CardTitle>
            {dataInfo && (
              <CardDescription className="mt-1">
                {dataInfo.tradingDays} trading days • {dataInfo.startDate} to {dataInfo.endDate}
              </CardDescription>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={recalculate} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            Update
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Primary Metrics Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-emerald-500" />
              <span className="text-xs font-medium text-muted-foreground">CAGR</span>
              <MetricInfoIcon termKey="cagr" iconSize={12} />
            </div>
            <p className={cn(
              "text-2xl font-bold tabular-nums",
              metrics.cagr >= 0 ? "text-emerald-500" : "text-rose-500"
            )}>
              {metrics.cagr >= 0 ? '+' : ''}{metrics.cagr.toFixed(2)}%
            </p>
          </div>
          
          <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-4 w-4 text-blue-500" />
              <span className="text-xs font-medium text-muted-foreground">Volatility</span>
              <MetricInfoIcon termKey="volatility" iconSize={12} />
            </div>
            <p className="text-2xl font-bold tabular-nums text-foreground">
              {metrics.volatility.toFixed(2)}%
            </p>
          </div>
          
          <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-medium text-muted-foreground">Sharpe</span>
              <MetricInfoIcon termKey="sharpeRatio" iconSize={12} />
            </div>
            <p className={cn(
              "text-2xl font-bold tabular-nums",
              metrics.sharpeRatio >= 1 ? "text-emerald-500" : metrics.sharpeRatio >= 0.5 ? "text-amber-500" : "text-rose-500"
            )}>
              {metrics.sharpeRatio.toFixed(2)}
            </p>
          </div>
          
          <div className="p-4 rounded-xl bg-gradient-to-br from-rose-500/10 to-rose-500/5 border border-rose-500/20">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-rose-500" />
              <span className="text-xs font-medium text-muted-foreground">Max DD</span>
              <MetricInfoIcon termKey="maxDrawdown" iconSize={12} />
            </div>
            <p className="text-2xl font-bold tabular-nums text-rose-500">
              {metrics.maxDrawdown.toFixed(2)}%
            </p>
          </div>
        </div>

        {/* Secondary Metrics Grid */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          <MetricItem
            label="Sortino"
            value={metrics.sortinoRatio.toFixed(2)}
            metricId="sortinoRatio"
            trend={metrics.sortinoRatio >= 1.5 ? 'good' : metrics.sortinoRatio >= 0.5 ? 'neutral' : 'bad'}
            icon={Shield}
            size="sm"
          />
          <MetricItem
            label="Calmar"
            value={metrics.calmarRatio.toFixed(2)}
            metricId="calmarRatio"
            trend={metrics.calmarRatio >= 1 ? 'good' : metrics.calmarRatio >= 0.5 ? 'neutral' : 'bad'}
            icon={Gauge}
            size="sm"
          />
          <MetricItem
            label="VaR 95%"
            value={`${metrics.var95.toFixed(2)}%`}
            metricId="var95"
            trend="bad"
            icon={AlertTriangle}
            size="sm"
          />
          <MetricItem
            label="Beta"
            value={metrics.beta.toFixed(2)}
            metricId="beta"
            trend={Math.abs(metrics.beta - 1) < 0.2 ? 'neutral' : metrics.beta < 1 ? 'good' : 'bad'}
            icon={Activity}
            size="sm"
          />
          <MetricItem
            label="Alpha"
            value={`${metrics.alpha >= 0 ? '+' : ''}${metrics.alpha.toFixed(2)}%`}
            metricId="alpha"
            trend={getTrend(metrics.alpha, true)}
            icon={TrendingUp}
            size="sm"
          />
          <MetricItem
            label="Total Return"
            value={`${metrics.totalReturn >= 0 ? '+' : ''}${metrics.totalReturn.toFixed(1)}%`}
            metricId="totalReturn"
            trend={getTrend(metrics.totalReturn, true)}
            icon={Percent}
            size="sm"
          />
        </div>

        {/* Key Takeaway Card */}
        <KeyTakeawayCard
          data={{
            cagr: metrics.cagr,
            volatility: metrics.volatility,
            sharpeRatio: metrics.sharpeRatio,
            maxDrawdown: metrics.maxDrawdown,
            alpha: metrics.alpha,
            beta: metrics.beta,
            totalReturn: metrics.totalReturn,
          }}
          chartType="performance"
        />

        {/* AI Insight Summary */}
        {aiAnalysis && (
          <div className="p-3 rounded-lg bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
            <div className="flex items-start gap-2">
              <div className="p-1.5 rounded-md bg-primary/20">
                <Target className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-primary mb-0.5">AI Insight</p>
                <p className="text-sm text-muted-foreground line-clamp-2">{aiAnalysis.keyInsight}</p>
              </div>
              <Badge variant="outline" className={cn(
                "text-xs shrink-0",
                aiAnalysis.riskLevel === 'Low' ? 'border-emerald-500/50 text-emerald-600' :
                aiAnalysis.riskLevel === 'Moderate' ? 'border-amber-500/50 text-amber-600' :
                'border-rose-500/50 text-rose-600'
              )}>
                {aiAnalysis.riskLevel} Risk
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
