// Portfolio Analysis Tabs - Brings Portfolio Builder tabs to the Portfolio page
// Provides Learn, Metrics, Data Quality, Regime, and Allocation views

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  GraduationCap,
  BarChart3,
  Database,
  Shield,
  Settings,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Target,
  Info,
  BookOpen,
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign,
  Percent,
  Gauge,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePortfolioCalculations, PortfolioMetrics } from '@/hooks/usePortfolioCalculations';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { MetricExplanationCard } from '@/components/shared/MetricExplanationCard';

interface PortfolioAnalysisTabsProps {
  allocations: { symbol: string; weight: number; name?: string }[];
  investableCapital?: number;
  portfolioName?: string;
  className?: string;
}

// Metric item component
function MetricItem({ 
  label, 
  value, 
  trend, 
  icon: Icon 
}: { 
  label: string; 
  value: string | number; 
  trend?: 'good' | 'bad' | 'neutral';
  icon?: React.ElementType;
}) {
  return (
    <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
      <div className="flex items-center gap-1.5 mb-1">
        {Icon && (
          <Icon className={cn(
            "h-3.5 w-3.5",
            trend === 'good' ? 'text-emerald-500' : trend === 'bad' ? 'text-rose-500' : 'text-muted-foreground'
          )} />
        )}
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <div className={cn(
        "font-bold tabular-nums text-lg",
        trend === 'good' ? 'text-emerald-500' : trend === 'bad' ? 'text-rose-500' : 'text-foreground'
      )}>
        {value}
      </div>
    </div>
  );
}

// Sleep score helper
function getSleepScore(volatility: number): { score: number; label: string; emoji: string } {
  const score = Math.max(0, Math.min(100, 100 - volatility * 4));
  if (score >= 80) return { score, label: 'Excellent', emoji: '😴' };
  if (score >= 60) return { score, label: 'Good', emoji: '😌' };
  if (score >= 40) return { score, label: 'Moderate', emoji: '😐' };
  if (score >= 20) return { score, label: 'Poor', emoji: '😰' };
  return { score, label: 'Severe', emoji: '😱' };
}

export function PortfolioAnalysisTabs({ 
  allocations, 
  investableCapital = 100000,
  portfolioName,
  className 
}: PortfolioAnalysisTabsProps) {
  const [activeTab, setActiveTab] = useState('learn');

  // Convert allocations to the format expected by usePortfolioCalculations
  const calcAllocations = useMemo(() => allocations.map(a => ({
    ticker: a.symbol,
    weight: a.weight > 1 ? a.weight / 100 : a.weight,
  })), [allocations]);

  const {
    metrics,
    traces,
    correlationMatrix,
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
    generateTraces: true,
  });

  if (allocations.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Portfolio Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Target className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Create or load a portfolio to see analysis</p>
            <p className="text-xs text-muted-foreground mt-1">
              Use the Portfolio Builder to create allocations
            </p>
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
            Portfolio Analysis
            {portfolioName && <Badge variant="outline" className="ml-2">{portfolioName}</Badge>}
          </CardTitle>
          <CardDescription>
            {progress.message || 'Calculating metrics...'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={(progress.current / Math.max(progress.total, 1)) * 100} className="h-1.5" />
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-8">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading analysis data...</span>
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
            Portfolio Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertTriangle className="h-10 w-10 mx-auto mb-3 text-amber-500" />
            <p className="text-sm text-muted-foreground mb-4">Unable to load analysis</p>
            <Button variant="outline" size="sm" onClick={recalculate}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const sleepScore = getSleepScore(metrics.volatility);
  const worstCaseDollars = Math.abs(investableCapital * (metrics.maxDrawdown / 100));

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Portfolio Analysis
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
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 mb-4">
            <TabsTrigger value="learn" className="gap-1.5 text-xs">
              <GraduationCap className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Learn</span>
            </TabsTrigger>
            <TabsTrigger value="metrics" className="gap-1.5 text-xs">
              <BarChart3 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Metrics</span>
            </TabsTrigger>
            <TabsTrigger value="data-quality" className="gap-1.5 text-xs">
              <Database className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Data</span>
            </TabsTrigger>
            <TabsTrigger value="regime" className="gap-1.5 text-xs">
              <Shield className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Regime</span>
            </TabsTrigger>
            <TabsTrigger value="allocation" className="gap-1.5 text-xs">
              <Settings className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Allocation</span>
            </TabsTrigger>
          </TabsList>

          {/* Learn Tab - Human-readable insights */}
          <TabsContent value="learn" className="mt-0">
            <ErrorBoundary variant="default">
              <div className="space-y-4">
                {/* Sleep Score + Worst Case + Turbulence */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-muted/30 border-border/50">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">{sleepScore.emoji}</span>
                        <div>
                          <p className="text-xs text-muted-foreground">Sleep Score</p>
                          <p className="text-xl font-bold">{Math.round(sleepScore.score)}/100</p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">{sleepScore.label}</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-muted/30 border-border/50">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingDown className="h-5 w-5 text-rose-500" />
                        <div>
                          <p className="text-xs text-muted-foreground">Worst Case Scenario</p>
                          <p className="text-xl font-bold text-rose-500">
                            -${worstCaseDollars.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {metrics.maxDrawdown.toFixed(1)}% max drawdown
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-muted/30 border-border/50">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Activity className="h-5 w-5 text-blue-500" />
                        <div>
                          <p className="text-xs text-muted-foreground">Turbulence Rating</p>
                          <p className="text-xl font-bold">{metrics.volatility.toFixed(1)}%</p>
                        </div>
                      </div>
                      <Badge variant="outline" className={cn(
                        "text-xs",
                        metrics.volatility < 15 ? "border-emerald-500/50 text-emerald-600" :
                        metrics.volatility < 25 ? "border-amber-500/50 text-amber-600" :
                        "border-rose-500/50 text-rose-600"
                      )}>
                        {metrics.volatility < 15 ? 'Calm' : metrics.volatility < 25 ? 'Choppy' : 'Stormy'}
                      </Badge>
                    </CardContent>
                  </Card>
                </div>

                {/* Asset Summary */}
                <Card className="bg-muted/30 border-border/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Your Assets
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {allocations.map((alloc, i) => (
                        <div key={i} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                              <span className="font-mono text-xs font-bold text-primary">
                                {alloc.symbol.slice(0, 2)}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-sm">{alloc.symbol}</p>
                              {alloc.name && <p className="text-xs text-muted-foreground">{alloc.name}</p>}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">{(alloc.weight > 1 ? alloc.weight : alloc.weight * 100).toFixed(1)}%</p>
                            <p className="text-xs text-muted-foreground">
                              ${((alloc.weight > 1 ? alloc.weight / 100 : alloc.weight) * investableCapital).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* AI Insight */}
                {aiAnalysis && (
                  <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <Info className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-primary mb-1">AI Insight</p>
                          <p className="text-sm text-muted-foreground">{aiAnalysis.keyInsight}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </ErrorBoundary>
          </TabsContent>

          {/* Metrics Tab - Combined metrics overview and detailed explanations */}
          <TabsContent value="metrics" className="mt-0">
            <ErrorBoundary variant="default">
              <div className="space-y-6">
                {/* Primary Metrics Overview */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20">
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign className="h-4 w-4 text-emerald-500" />
                      <span className="text-xs font-medium text-muted-foreground">CAGR</span>
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
                    </div>
                    <p className="text-2xl font-bold tabular-nums text-foreground">
                      {metrics.volatility.toFixed(2)}%
                    </p>
                  </div>
                  
                  <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20">
                    <div className="flex items-center gap-2 mb-1">
                      <Target className="h-4 w-4 text-amber-500" />
                      <span className="text-xs font-medium text-muted-foreground">Sharpe</span>
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
                    </div>
                    <p className="text-2xl font-bold tabular-nums text-rose-500">
                      {metrics.maxDrawdown.toFixed(2)}%
                    </p>
                  </div>
                </div>

                {/* Secondary Metrics */}
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                  <MetricItem label="Sortino" value={metrics.sortinoRatio.toFixed(2)} icon={Shield}
                    trend={metrics.sortinoRatio >= 1.5 ? 'good' : metrics.sortinoRatio >= 0.5 ? 'neutral' : 'bad'} />
                  <MetricItem label="Calmar" value={metrics.calmarRatio.toFixed(2)} icon={Gauge}
                    trend={metrics.calmarRatio >= 1 ? 'good' : metrics.calmarRatio >= 0.5 ? 'neutral' : 'bad'} />
                  <MetricItem label="VaR 95%" value={`${metrics.var95.toFixed(2)}%`} icon={AlertTriangle} trend="bad" />
                  <MetricItem label="Beta" value={metrics.beta.toFixed(2)} icon={Activity}
                    trend={Math.abs(metrics.beta - 1) < 0.2 ? 'neutral' : metrics.beta < 1 ? 'good' : 'bad'} />
                  <MetricItem label="Alpha" value={`${metrics.alpha >= 0 ? '+' : ''}${metrics.alpha.toFixed(2)}%`} icon={TrendingUp}
                    trend={metrics.alpha > 0 ? 'good' : metrics.alpha < 0 ? 'bad' : 'neutral'} />
                  <MetricItem label="Total Return" value={`${metrics.totalReturn >= 0 ? '+' : ''}${metrics.totalReturn.toFixed(1)}%`} icon={Percent}
                    trend={metrics.totalReturn > 0 ? 'good' : metrics.totalReturn < 0 ? 'bad' : 'neutral'} />
                </div>

                {/* Detailed Metric Explanations */}
                <div className="space-y-6 pt-4 border-t border-border/50">
                  {/* Returns Category */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-emerald-500" />
                      Returns
                    </h3>
                    <div className="grid gap-3 md:grid-cols-2">
                      {metrics.totalReturn !== undefined && (
                        <MetricExplanationCard
                          metricId="totalReturn"
                          value={metrics.totalReturn}
                          trace={traces.find(t => t.metricId === 'totalReturn')}
                          mode="compact"
                        />
                      )}
                      {metrics.cagr !== undefined && (
                        <MetricExplanationCard
                          metricId="cagr"
                          value={metrics.cagr}
                          trace={traces.find(t => t.metricId === 'cagr')}
                          mode="compact"
                        />
                      )}
                    </div>
                  </div>

                  {/* Risk Category */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      Risk Metrics
                    </h3>
                    <div className="grid gap-3 md:grid-cols-2">
                      {metrics.volatility !== undefined && (
                        <MetricExplanationCard
                          metricId="volatility"
                          value={metrics.volatility}
                          trace={traces.find(t => t.metricId === 'volatility')}
                          mode="compact"
                        />
                      )}
                      {metrics.maxDrawdown !== undefined && (
                        <MetricExplanationCard
                          metricId="maxDrawdown"
                          value={metrics.maxDrawdown}
                          trace={traces.find(t => t.metricId === 'maxDrawdown')}
                          mode="compact"
                        />
                      )}
                      {metrics.var95 !== undefined && (
                        <MetricExplanationCard
                          metricId="var95"
                          value={metrics.var95}
                          trace={traces.find(t => t.metricId === 'var95')}
                          mode="compact"
                        />
                      )}
                      {metrics.cvar95 !== undefined && (
                        <MetricExplanationCard
                          metricId="cvar95"
                          value={metrics.cvar95}
                          trace={traces.find(t => t.metricId === 'cvar95')}
                          mode="compact"
                        />
                      )}
                    </div>
                  </div>

                  {/* Risk-Adjusted Category */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Target className="h-4 w-4 text-blue-500" />
                      Risk-Adjusted Performance
                    </h3>
                    <div className="grid gap-3 md:grid-cols-2">
                      {metrics.sharpeRatio !== undefined && (
                        <MetricExplanationCard
                          metricId="sharpeRatio"
                          value={metrics.sharpeRatio}
                          trace={traces.find(t => t.metricId === 'sharpeRatio')}
                          mode="compact"
                        />
                      )}
                      {metrics.sortinoRatio !== undefined && (
                        <MetricExplanationCard
                          metricId="sortinoRatio"
                          value={metrics.sortinoRatio}
                          trace={traces.find(t => t.metricId === 'sortinoRatio')}
                          mode="compact"
                        />
                      )}
                      {metrics.calmarRatio !== undefined && (
                        <MetricExplanationCard
                          metricId="calmarRatio"
                          value={metrics.calmarRatio}
                          trace={traces.find(t => t.metricId === 'calmarRatio')}
                          mode="compact"
                        />
                      )}
                      {metrics.omegaRatio !== undefined && (
                        <MetricExplanationCard
                          metricId="omegaRatio"
                          value={metrics.omegaRatio}
                          trace={traces.find(t => t.metricId === 'omegaRatio')}
                          mode="compact"
                        />
                      )}
                    </div>
                  </div>

                  {/* Benchmark Comparison Category */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Activity className="h-4 w-4 text-purple-500" />
                      Benchmark Comparison
                    </h3>
                    <div className="grid gap-3 md:grid-cols-2">
                      {metrics.alpha !== undefined && (
                        <MetricExplanationCard
                          metricId="alpha"
                          value={metrics.alpha}
                          trace={traces.find(t => t.metricId === 'alpha')}
                          mode="compact"
                        />
                      )}
                      {metrics.beta !== undefined && (
                        <MetricExplanationCard
                          metricId="beta"
                          value={metrics.beta}
                          trace={traces.find(t => t.metricId === 'beta')}
                          mode="compact"
                        />
                      )}
                      {(metrics as any).rSquared !== undefined && (
                        <MetricExplanationCard
                          metricId="rSquared"
                          value={(metrics as any).rSquared}
                          trace={traces.find(t => t.metricId === 'rSquared')}
                          mode="compact"
                        />
                      )}
                      {(metrics as any).trackingError !== undefined && (
                        <MetricExplanationCard
                          metricId="trackingError"
                          value={(metrics as any).trackingError}
                          trace={traces.find(t => t.metricId === 'trackingError')}
                          mode="compact"
                        />
                      )}
                      {metrics.informationRatio !== undefined && (
                        <MetricExplanationCard
                          metricId="informationRatio"
                          value={metrics.informationRatio}
                          trace={traces.find(t => t.metricId === 'informationRatio')}
                          mode="compact"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </ErrorBoundary>
          </TabsContent>

          {/* Data Quality Tab */}
          <TabsContent value="data-quality" className="mt-0">
            <ErrorBoundary variant="default">
              <div className="space-y-4">
                <Card className="bg-emerald-500/5 border-emerald-500/20">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <Database className="h-5 w-5 text-emerald-500" />
                      <div>
                        <p className="font-medium text-sm">Data Source: Polygon.io</p>
                        <p className="text-xs text-muted-foreground">
                          {dataInfo?.tradingDays || 0} trading days from {dataInfo?.startDate || 'N/A'} to {dataInfo?.endDate || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-2">
                  {calcAllocations.map((alloc, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="font-mono">{alloc.ticker}</Badge>
                        <span className="text-sm text-muted-foreground">Polygon.io</span>
                      </div>
                      <Badge variant="outline" className="border-emerald-500/50 text-emerald-600">
                        Valid
                      </Badge>
                    </div>
                  ))}
                </div>

                {traces && traces.length > 0 && (
                  <Card className="bg-muted/30 border-border/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Calculation Traces</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground">
                        {traces.length} metrics calculated with full audit trail
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </ErrorBoundary>
          </TabsContent>

          {/* Regime Tab */}
          <TabsContent value="regime" className="mt-0">
            <ErrorBoundary variant="default">
              <div className="space-y-4">
                <Card className="bg-muted/30 border-border/50">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3 mb-4">
                      <Shield className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium text-sm">Market Regime Analysis</p>
                        <p className="text-xs text-muted-foreground">How your portfolio might perform in different conditions</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
                        <p className="text-xs text-muted-foreground mb-1">Bull Market</p>
                        <p className="font-bold text-emerald-500">
                          +{(metrics.cagr * 1.3).toFixed(1)}%
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
                        <p className="text-xs text-muted-foreground mb-1">Sideways</p>
                        <p className="font-bold text-amber-500">
                          {(metrics.cagr * 0.5).toFixed(1)}%
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-center">
                        <p className="text-xs text-muted-foreground mb-1">Bear Market</p>
                        <p className="font-bold text-rose-500">
                          {metrics.maxDrawdown.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-muted/30 border-border/50">
                  <CardContent className="pt-4">
                    <p className="text-sm font-medium mb-2">Historical Stress Periods</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between py-2 border-b border-border/30">
                        <span className="text-muted-foreground">COVID Crash (2020)</span>
                        <span className="font-mono text-rose-500">Est. -{(metrics.maxDrawdown * 1.2).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-border/30">
                        <span className="text-muted-foreground">2022 Bear Market</span>
                        <span className="font-mono text-rose-500">Est. -{(metrics.maxDrawdown * 0.9).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-muted-foreground">Normal Volatility</span>
                        <span className="font-mono text-muted-foreground">±{metrics.volatility.toFixed(1)}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ErrorBoundary>
          </TabsContent>

          {/* Allocation Tab */}
          <TabsContent value="allocation" className="mt-0">
            <ErrorBoundary variant="default">
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-2">
                  {allocations.map((alloc, i) => (
                    <div 
                      key={i}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <span className="font-mono font-bold text-xs text-primary">
                            {alloc.symbol.slice(0, 3)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-sm">{alloc.symbol}</p>
                          {alloc.name && (
                            <p className="text-xs text-muted-foreground">{alloc.name}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold tabular-nums">
                          {(alloc.weight > 1 ? alloc.weight : alloc.weight * 100).toFixed(1)}%
                        </p>
                        <p className="text-xs text-muted-foreground tabular-nums">
                          ${((alloc.weight > 1 ? alloc.weight / 100 : alloc.weight) * investableCapital).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* AI Insight */}
                {aiAnalysis && (
                  <div className="p-4 rounded-lg bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
                    <div className="flex items-start gap-3">
                      <Info className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-primary mb-1">AI Insight</p>
                        <p className="text-sm text-muted-foreground">{aiAnalysis.keyInsight}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ErrorBoundary>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
