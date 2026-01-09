// Real Portfolio Performance Chart - Uses actual calculation data
// Displays real historical returns, not mock/demo data

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  LineChart,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  AlertTriangle,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePortfolioCalculations, PortfolioMetrics } from '@/hooks/usePortfolioCalculations';
import { format, subYears } from 'date-fns';

// Pre-calculated metrics that can be passed from parent
interface PreCalculatedMetrics {
  cagr?: number;
  volatility?: number;
  sharpeRatio?: number;
  maxDrawdown?: number;
  totalReturn?: number;
}

interface RealPerformanceChartProps {
  allocations: { symbol: string; weight: number }[];
  investableCapital?: number;
  portfolioName?: string;
  className?: string;
  showMetrics?: boolean;
  // Optional: pass pre-calculated metrics to ensure consistency with Portfolio Builder
  preCalculatedMetrics?: PreCalculatedMetrics;
  // Optional: investment horizon in years (defaults to 5)
  investmentHorizon?: number;
}

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (Math.abs(value) >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

export function RealPerformanceChart({
  allocations,
  investableCapital = 100000,
  portfolioName,
  className,
  showMetrics = true,
  preCalculatedMetrics,
  investmentHorizon = 5,
}: RealPerformanceChartProps) {
  // Calculate date range based on investment horizon (matching Portfolio Builder)
  const { startDate, endDate } = useMemo(() => {
    const end = new Date();
    const start = subYears(end, investmentHorizon);
    return {
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd'),
    };
  }, [investmentHorizon]);

  // Convert allocations - weights come as percentages (0-100), need decimals (0-1)
  const calcAllocations = useMemo(() => {
    return allocations.map(a => ({
      ticker: a.symbol,
      weight: a.weight > 1 ? a.weight / 100 : a.weight,
    }));
  }, [allocations]);

  const {
    metrics,
    portfolioValues,
    portfolioReturns,
    dates,
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
    enabled: allocations.length > 0,
    includeAIAnalysis: false,
    generateTraces: false,
  });

  // Build chart data from real returns
  // portfolioValues are already absolute dollar amounts (starting from investableCapital)
  const chartData = useMemo(() => {
    if (!portfolioValues.length || !dates.length) return [];

    // Scale the values to match the user's investableCapital (data comes scaled to $100k)
    const scaleFactor = investableCapital / 100000;

    return dates.map((date, i) => ({
      date: format(new Date(date), 'MMM d'),
      fullDate: date,
      value: portfolioValues[i] * scaleFactor,
      return: portfolioReturns[i] ? portfolioReturns[i] * 100 : 0,
    }));
  }, [portfolioValues, portfolioReturns, dates, investableCapital]);

  // Calculate current value and changes
  // Use preCalculatedMetrics.totalReturn if provided for consistency with Portfolio Builder
  const { currentValue, totalReturn, totalReturnPercent, isPositive } = useMemo(() => {
    // If we have pre-calculated metrics from Portfolio Builder, use those for consistency
    if (preCalculatedMetrics?.totalReturn !== undefined) {
      const returnPercent = preCalculatedMetrics.totalReturn;
      const returnDollars = investableCapital * (returnPercent / 100);
      const endValue = investableCapital + returnDollars;
      return {
        currentValue: endValue,
        totalReturn: returnDollars,
        totalReturnPercent: returnPercent,
        isPositive: returnPercent >= 0,
      };
    }
    
    // Fallback to chart data calculation
    if (!chartData.length) {
      return { currentValue: investableCapital, totalReturn: 0, totalReturnPercent: 0, isPositive: true };
    }

    const startValue = investableCapital;
    const endValue = chartData[chartData.length - 1]?.value || investableCapital;
    const totalReturnVal = endValue - startValue;
    const totalReturnPercentVal = (totalReturnVal / startValue) * 100;

    return {
      currentValue: endValue,
      totalReturn: totalReturnVal,
      totalReturnPercent: totalReturnPercentVal,
      isPositive: totalReturnVal >= 0,
    };
  }, [chartData, investableCapital, preCalculatedMetrics]);

  if (allocations.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Portfolio Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex flex-col items-center justify-center border border-dashed rounded-lg bg-muted/20">
            <TrendingUp className="h-8 w-8 mb-2 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">Add allocations to see performance</p>
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
            <TrendingUp className="h-4 w-4 text-primary" />
            Portfolio Performance
            {portfolioName && <Badge variant="outline" className="ml-2">{portfolioName}</Badge>}
          </CardTitle>
          <CardDescription>
            {progress.message || 'Loading historical data...'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={(progress.current / Math.max(progress.total, 1)) * 100} className="h-1" />
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-8">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Fetching real market data...</span>
          </div>
          <Skeleton className="h-48 w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
    <Card className={className} data-performance-chart>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Portfolio Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex flex-col items-center justify-center">
            <AlertTriangle className="h-8 w-8 mb-2 text-amber-500" />
            <p className="text-sm text-muted-foreground mb-3">Unable to load performance data</p>
            <Button variant="outline" size="sm" onClick={recalculate}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const gradientId = `performance-gradient-${portfolioName?.replace(/\s/g, '') || 'default'}`;

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              {portfolioName ? `${portfolioName} Performance` : 'Portfolio Performance'}
            </CardTitle>
            <div className="flex items-baseline gap-3 mt-1">
              <span className="text-2xl font-bold text-foreground">
                {formatCurrency(currentValue)}
              </span>
              <div className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                isPositive 
                  ? "bg-emerald-500/10 text-emerald-500" 
                  : "bg-rose-500/10 text-rose-500"
              )}>
                {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {formatPercent(totalReturnPercent)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={recalculate}
              className="h-8 w-8"
              title="Refresh data"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {dataInfo && (
          <CardDescription className="flex items-center gap-1 mt-1">
            <Calendar className="h-3 w-3" />
            {dataInfo.tradingDays} trading days • {dataInfo.startDate} to {dataInfo.endDate}
          </CardDescription>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Quick Stats Row - Use preCalculatedMetrics if provided for consistency */}
        {showMetrics && (preCalculatedMetrics || metrics) && (
          <div className="flex gap-4 text-sm flex-wrap">
            <div>
              <span className="text-muted-foreground">CAGR: </span>
              <span className={cn("font-medium", (preCalculatedMetrics?.cagr ?? metrics?.cagr ?? 0) >= 0 ? "text-emerald-500" : "text-rose-500")}>
                {formatPercent(preCalculatedMetrics?.cagr ?? metrics?.cagr ?? 0)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Volatility: </span>
              <span className="font-medium">{(preCalculatedMetrics?.volatility ?? metrics?.volatility ?? 0).toFixed(1)}%</span>
            </div>
            <div>
              <span className="text-muted-foreground">Sharpe: </span>
              <span className={cn(
                "font-medium",
                (preCalculatedMetrics?.sharpeRatio ?? metrics?.sharpeRatio ?? 0) >= 1 ? "text-emerald-500" : (preCalculatedMetrics?.sharpeRatio ?? metrics?.sharpeRatio ?? 0) >= 0.5 ? "text-amber-500" : "text-rose-500"
              )}>
                {(preCalculatedMetrics?.sharpeRatio ?? metrics?.sharpeRatio ?? 0).toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Max DD: </span>
              <span className="font-medium text-rose-500">{(preCalculatedMetrics?.maxDrawdown ?? metrics?.maxDrawdown ?? 0).toFixed(1)}%</span>
            </div>
          </div>
        )}

        {/* Performance Chart */}
        {chartData.length > 1 ? (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop 
                      offset="5%" 
                      stopColor={isPositive ? 'hsl(var(--chart-1))' : 'hsl(var(--destructive))'} 
                      stopOpacity={0.3} 
                    />
                    <stop 
                      offset="95%" 
                      stopColor={isPositive ? 'hsl(var(--chart-1))' : 'hsl(var(--destructive))'} 
                      stopOpacity={0} 
                    />
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10 }} 
                  tickLine={false} 
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  hide 
                  domain={['auto', 'auto']} 
                />
                <ReferenceLine 
                  y={investableCapital} 
                  stroke="hsl(var(--muted-foreground))" 
                  strokeDasharray="3 3" 
                  strokeOpacity={0.5}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [formatCurrency(value), 'Value']}
                  labelFormatter={(label) => label}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={isPositive ? 'hsl(var(--chart-1))' : 'hsl(var(--destructive))'}
                  strokeWidth={2}
                  fill={`url(#${gradientId})`}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-48 flex flex-col items-center justify-center border border-dashed rounded-lg bg-muted/20">
            <p className="text-sm text-muted-foreground">
              Insufficient data for chart
            </p>
          </div>
        )}

        {/* Period Summary */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Started: {formatCurrency(investableCapital)}</span>
          <span className={cn("font-medium", isPositive ? "text-emerald-500" : "text-rose-500")}>
            {isPositive ? '+' : ''}{formatCurrency(totalReturn)} ({formatPercent(totalReturnPercent)})
          </span>
        </div>
      </CardContent>
    </Card>
  );
}