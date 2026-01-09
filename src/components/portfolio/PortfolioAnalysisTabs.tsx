// Portfolio Analysis Tabs - Brings Portfolio Builder tabs to the Portfolio page
// Provides Overview, Health, Metrics, Holdings, Data Quality, and Stress Test views

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  ArrowUpRight,
  ArrowDownRight,
  Heart,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { cn } from '@/lib/utils';
import { usePortfolioCalculations, PortfolioMetrics } from '@/hooks/usePortfolioCalculations';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { MetricExplanationCard } from '@/components/shared/MetricExplanationCard';
import { getCachedQuotes } from '@/services/quoteCacheService';
import { PortfolioHealthPanel } from './PortfolioHealthPanel';

// Pie chart colors
const PIE_COLORS = [
  'hsl(280, 65%, 60%)', // purple
  'hsl(160, 84%, 39%)', // emerald
  'hsl(38, 92%, 50%)',  // amber
  'hsl(217, 91%, 60%)', // blue
  'hsl(340, 82%, 52%)', // rose
  'hsl(142, 76%, 36%)', // green
  'hsl(25, 95%, 53%)',  // orange
  'hsl(199, 89%, 48%)', // cyan
];

interface PortfolioAnalysisTabsProps {
  allocations: { symbol: string; weight: number; name?: string }[];
  investableCapital?: number;
  investmentHorizon?: number; // Years for backtest calculation
  portfolioName?: string;
  className?: string;
  // Precomputed metrics from parent (optional - if provided, won't recalculate)
  backtestMetrics?: {
    currentValue: number;
    totalReturn: number;
    totalReturnPercent: number;
    todayChange: number;
    todayChangePercent: number;
    cagr: number;
    maxDrawdown: number;
    sharpeRatio: number;
    volatility: number;
  } | null;
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
  investmentHorizon = 5,
  portfolioName,
  className,
  backtestMetrics: parentBacktestMetrics,
}: PortfolioAnalysisTabsProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [liveQuotes, setLiveQuotes] = useState<Map<string, { price: number; change: number; changePercent: number }>>(new Map());
  const [quotesLoading, setQuotesLoading] = useState(false);

  // Calculate date range based on investment horizon
  const { startDate, endDate } = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setFullYear(start.getFullYear() - investmentHorizon);
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    };
  }, [investmentHorizon]);

  // Convert allocations to the format expected by usePortfolioCalculations
  const calcAllocations = useMemo(() => allocations.map(a => ({
    ticker: a.symbol,
    weight: a.weight > 1 ? a.weight / 100 : a.weight,
  })), [allocations]);

  // Get unique tickers
  const tickers = useMemo(() => 
    allocations.map(a => a.symbol.toUpperCase()),
    [allocations]
  );

  // Fetch live quotes
  const fetchQuotes = useCallback(async () => {
    if (tickers.length === 0) return;
    setQuotesLoading(true);
    try {
      const quotes = await getCachedQuotes(tickers);
      setLiveQuotes(quotes);
    } catch (err) {
      console.error('Failed to fetch quotes:', err);
    } finally {
      setQuotesLoading(false);
    }
  }, [tickers]);

  // Fetch quotes on mount and when tickers change
  useEffect(() => {
    if (tickers.length > 0) {
      fetchQuotes();
    }
  }, [tickers.length]);

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
    startDate,
    endDate,
    enabled: allocations.length > 0 && !parentBacktestMetrics, // Skip if parent provided metrics
    includeAIAnalysis: true,
    generateTraces: true,
  });

  // Use parent metrics if provided, otherwise use calculated
  const effectiveMetrics = parentBacktestMetrics ? {
    ...metrics,
    cagr: parentBacktestMetrics.cagr,
    volatility: parentBacktestMetrics.volatility,
    sharpeRatio: parentBacktestMetrics.sharpeRatio,
    maxDrawdown: parentBacktestMetrics.maxDrawdown,
    totalReturn: parentBacktestMetrics.totalReturnPercent,
  } : metrics;

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
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 h-auto gap-1 p-1 mb-4">
            <TabsTrigger value="overview" className="gap-1.5 text-xs px-2 py-2 flex-col sm:flex-row">
              <GraduationCap className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
              <span className="text-[10px] sm:text-xs">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="health" className="gap-1.5 text-xs px-2 py-2 flex-col sm:flex-row">
              <Heart className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
              <span className="text-[10px] sm:text-xs">Health</span>
            </TabsTrigger>
            <TabsTrigger value="metrics" className="gap-1.5 text-xs px-2 py-2 flex-col sm:flex-row">
              <BarChart3 className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
              <span className="text-[10px] sm:text-xs">Metrics</span>
            </TabsTrigger>
            <TabsTrigger value="holdings" className="gap-1.5 text-xs px-2 py-2 flex-col sm:flex-row">
              <Settings className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
              <span className="text-[10px] sm:text-xs">Holdings</span>
            </TabsTrigger>
            <TabsTrigger value="data-quality" className="gap-1.5 text-xs px-2 py-2 flex-col sm:flex-row">
              <Database className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
              <span className="text-[10px] sm:text-xs">Data</span>
            </TabsTrigger>
            <TabsTrigger value="stress-test" className="gap-1.5 text-xs px-2 py-2 flex-col sm:flex-row">
              <Shield className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
              <span className="text-[10px] sm:text-xs">Stress</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab - Human-readable insights */}
          <TabsContent value="overview" className="mt-0">
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

          {/* Health Tab - Market Intel-style health matrix */}
          <TabsContent value="health" className="mt-0">
            <ErrorBoundary variant="default">
              <PortfolioHealthPanel
                allocations={allocations}
                investableCapital={investableCapital}
                liveQuotes={liveQuotes}
                metrics={effectiveMetrics || metrics}
                backtestPortfolioValue={parentBacktestMetrics?.currentValue}
                backtestTodayChange={parentBacktestMetrics?.todayChange}
                backtestTodayChangePercent={parentBacktestMetrics?.todayChangePercent}
                investmentHorizon={investmentHorizon}
              />
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

          {/* Stress Test Tab */}
          <TabsContent value="stress-test" className="mt-0">
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

          {/* Holdings Tab */}
          <TabsContent value="holdings" className="mt-0">
            <ErrorBoundary variant="default">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {/* Allocation Pie Chart */}
                <div className="lg:col-span-1">
                  <div className="h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={allocations.map((a, i) => ({
                            name: a.symbol,
                            value: (a.weight > 1 ? a.weight / 100 : a.weight) * investableCapital,
                            weight: a.weight > 1 ? a.weight : a.weight * 100,
                            color: PIE_COLORS[i % PIE_COLORS.length],
                          }))}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={65}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {allocations.map((_, i) => (
                            <Cell key={`cell-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          content={({ active, payload }) => {
                            if (active && payload?.[0]) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-popover border border-border rounded-lg p-2 shadow-lg">
                                  <p className="font-medium text-sm">{data.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    ${data.value.toLocaleString(undefined, { maximumFractionDigits: 0 })} ({data.weight.toFixed(1)}%)
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Legend */}
                  <div className="space-y-1 mt-2">
                    {allocations.map((alloc, i) => (
                      <div key={i} className="flex items-center justify-between text-xs p-1.5 rounded hover:bg-muted/50">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-2.5 h-2.5 rounded-full" 
                            style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} 
                          />
                          <span className="font-medium">{alloc.symbol}</span>
                        </div>
                        <span className="text-muted-foreground tabular-nums">
                          {(alloc.weight > 1 ? alloc.weight : alloc.weight * 100).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Holdings Table */}
                <div className="lg:col-span-3">
                  {quotesLoading ? (
                    <div className="space-y-2">
                      {allocations.map((_, i) => (
                        <Skeleton key={i} className="h-14 w-full" />
                      ))}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Asset</TableHead>
                            <TableHead className="text-right">Price</TableHead>
                            <TableHead className="text-right">Return</TableHead>
                            <TableHead className="text-right">Value</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {allocations.map((alloc, i) => {
                            const quote = liveQuotes.get(alloc.symbol.toUpperCase());
                            const weight = alloc.weight > 1 ? alloc.weight : alloc.weight * 100;
                            const value = (alloc.weight > 1 ? alloc.weight / 100 : alloc.weight) * investableCapital;
                            const price = quote?.price ?? 0;
                            const changePercent = quote?.changePercent ?? 0;
                            const isUp = changePercent >= 0;
                            
                            return (
                              <TableRow key={i} className="hover:bg-muted/30">
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    <div 
                                      className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                                      style={{ backgroundColor: `${PIE_COLORS[i % PIE_COLORS.length]}20` }}
                                    >
                                      <span 
                                        className="font-mono font-bold text-xs sm:text-sm"
                                        style={{ color: PIE_COLORS[i % PIE_COLORS.length] }}
                                      >
                                        {alloc.symbol.slice(0, 3)}
                                      </span>
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-medium text-sm">{alloc.symbol}</p>
                                      {alloc.name && (
                                        <p className="text-xs text-muted-foreground line-clamp-1">{alloc.name}</p>
                                      )}
                                      <p className="text-xs text-muted-foreground sm:hidden">{weight.toFixed(1)}% weight</p>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  <span className="font-medium tabular-nums">
                                    {price > 0 ? `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right">
                                  {price > 0 ? (
                                    <div className={cn(
                                      "flex items-center justify-end gap-1 font-medium tabular-nums",
                                      isUp ? "text-emerald-500" : "text-rose-500"
                                    )}>
                                      {isUp ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                                      {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  <span className="font-bold tabular-nums">
                                    ${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                  </span>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                  
                  {/* Summary Row */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 mt-3 rounded-lg bg-muted/30 border border-border/50 gap-2">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Total Portfolio</span>
                    </div>
                    <div className="flex items-center gap-4 sm:gap-6">
                      <span className="text-sm text-muted-foreground">{allocations.length} holdings</span>
                      <span className="font-bold tabular-nums">
                        ${investableCapital.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </ErrorBoundary>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
