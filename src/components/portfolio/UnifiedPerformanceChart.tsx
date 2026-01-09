/**
 * Unified Performance Chart
 * Switchable between chart types with time frame controls
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Loader2,
  AlertTriangle,
  BarChart3,
  LineChartIcon,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePortfolioCalculations } from '@/hooks/usePortfolioCalculations';
import { format, subYears, subMonths, subDays, startOfYear } from 'date-fns';

type ChartType = 'growth' | 'annual' | 'monthly' | 'drawdown';
type TimeFrame = '1M' | '3M' | '6M' | 'YTD' | '1Y' | '3Y' | '5Y' | 'ALL';

interface UnifiedPerformanceChartProps {
  allocations: { symbol: string; weight: number }[];
  investableCapital?: number;
  className?: string;
}

const CHART_TYPES: { value: ChartType; label: string }[] = [
  { value: 'growth', label: 'Portfolio Growth' },
  { value: 'annual', label: 'Annual Returns' },
  { value: 'monthly', label: 'Monthly Returns' },
  { value: 'drawdown', label: 'Drawdown' },
];

const TIME_FRAMES: { value: TimeFrame; label: string }[] = [
  { value: '1M', label: '1M' },
  { value: '3M', label: '3M' },
  { value: '6M', label: '6M' },
  { value: 'YTD', label: 'YTD' },
  { value: '1Y', label: '1Y' },
  { value: '3Y', label: '3Y' },
  { value: '5Y', label: '5Y' },
  { value: 'ALL', label: 'All' },
];

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (Math.abs(value) >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function getDateRange(timeFrame: TimeFrame): { startDate: string; endDate: string } {
  const end = new Date();
  let start: Date;

  switch (timeFrame) {
    case '1M':
      start = subMonths(end, 1);
      break;
    case '3M':
      start = subMonths(end, 3);
      break;
    case '6M':
      start = subMonths(end, 6);
      break;
    case 'YTD':
      start = startOfYear(end);
      break;
    case '1Y':
      start = subYears(end, 1);
      break;
    case '3Y':
      start = subYears(end, 3);
      break;
    case '5Y':
      start = subYears(end, 5);
      break;
    case 'ALL':
    default:
      start = subYears(end, 10);
      break;
  }

  return {
    startDate: format(start, 'yyyy-MM-dd'),
    endDate: format(end, 'yyyy-MM-dd'),
  };
}

export function UnifiedPerformanceChart({
  allocations,
  investableCapital = 100000,
  className,
}: UnifiedPerformanceChartProps) {
  const [chartType, setChartType] = useState<ChartType>('growth');
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('5Y');

  const { startDate, endDate } = useMemo(() => getDateRange(timeFrame), [timeFrame]);

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

  // Growth chart data
  const growthData = useMemo(() => {
    if (!portfolioValues.length || !dates.length) return [];
    const scaleFactor = investableCapital / 100000;
    return dates.map((date, i) => ({
      date: format(new Date(date), 'MMM d, yy'),
      fullDate: date,
      portfolio: portfolioValues[i] * scaleFactor,
    }));
  }, [portfolioValues, dates, investableCapital]);

  // Annual returns data
  const annualData = useMemo(() => {
    if (!dates.length || !portfolioReturns?.length) return [];
    
    const yearlyReturns: Record<string, number[]> = {};
    
    dates.forEach((date, i) => {
      const year = new Date(date).getFullYear().toString();
      if (!yearlyReturns[year]) {
        yearlyReturns[year] = [];
      }
      if (portfolioReturns[i] !== undefined && !isNaN(portfolioReturns[i])) {
        yearlyReturns[year].push(portfolioReturns[i]);
      }
    });
    
    return Object.entries(yearlyReturns)
      .filter(([_, data]) => data.length > 20)
      .map(([year, data]) => {
        const portfolioAnnual = data.reduce((acc, r) => acc * (1 + r), 1) - 1;
        
        return {
          year,
          portfolio: portfolioAnnual * 100,
        };
      })
      .sort((a, b) => a.year.localeCompare(b.year));
  }, [dates, portfolioReturns]);

  // Monthly returns data
  const monthlyData = useMemo(() => {
    if (!dates.length || !portfolioReturns?.length) return [];
    
    const monthlyReturns: Record<string, number[]> = {};
    
    dates.forEach((date, i) => {
      const monthKey = format(new Date(date), 'MMM yy');
      if (!monthlyReturns[monthKey]) {
        monthlyReturns[monthKey] = [];
      }
      if (portfolioReturns[i] !== undefined && !isNaN(portfolioReturns[i])) {
        monthlyReturns[monthKey].push(portfolioReturns[i]);
      }
    });
    
    // Keep only last 24 months for readability
    const sortedMonths = Object.entries(monthlyReturns)
      .map(([month, data]) => {
        const portfolioMonthly = data.reduce((acc, r) => acc * (1 + r), 1) - 1;
        
        return {
          month,
          portfolio: portfolioMonthly * 100,
        };
      });
    
    return sortedMonths.slice(-24);
  }, [dates, portfolioReturns]);

  // Drawdown data
  const drawdownData = useMemo(() => {
    if (!portfolioValues.length || !dates.length) return [];
    
    let peak = portfolioValues[0];
    const scaleFactor = investableCapital / 100000;
    
    return dates.map((date, i) => {
      const value = portfolioValues[i];
      if (value > peak) peak = value;
      const drawdown = ((value - peak) / peak) * 100;
      
      return {
        date: format(new Date(date), 'MMM d, yy'),
        fullDate: date,
        drawdown,
        value: value * scaleFactor,
      };
    });
  }, [portfolioValues, dates, investableCapital]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!growthData.length) return null;
    
    const startValue = investableCapital;
    const endValue = growthData[growthData.length - 1]?.portfolio || investableCapital;
    const totalReturn = endValue - startValue;
    const totalReturnPercent = (totalReturn / startValue) * 100;
    
    return {
      currentValue: endValue,
      totalReturn,
      totalReturnPercent,
      isPositive: totalReturn >= 0,
    };
  }, [growthData, investableCapital]);

  if (allocations.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Portfolio Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex flex-col items-center justify-center border border-dashed rounded-lg bg-muted/20">
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
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Portfolio Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={(progress.current / Math.max(progress.total, 1)) * 100} className="h-1" />
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-8">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{progress.message || 'Loading historical data...'}</span>
          </div>
          <Skeleton className="h-64 w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Portfolio Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex flex-col items-center justify-center">
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

  const gradientId = 'unified-performance-gradient';

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-4">
          {/* Title and Value Row */}
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Portfolio Performance
              </CardTitle>
              {stats && (
                <div className="flex items-baseline gap-3 mt-1">
                  <span className="text-2xl font-bold text-foreground">
                    {formatCurrency(stats.currentValue)}
                  </span>
                  <div className={cn(
                    "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                    stats.isPositive 
                      ? "bg-emerald-500/10 text-emerald-500" 
                      : "bg-rose-500/10 text-rose-500"
                  )}>
                    {stats.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {stats.totalReturnPercent >= 0 ? '+' : ''}{stats.totalReturnPercent.toFixed(2)}%
                  </div>
                </div>
              )}
            </div>
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

          {/* Controls Row */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Chart Type Toggle */}
            <ToggleGroup
              type="single"
              value={chartType}
              onValueChange={(v) => v && setChartType(v as ChartType)}
              className="bg-muted/50 p-1 rounded-lg"
            >
              {CHART_TYPES.map((type) => (
                <ToggleGroupItem
                  key={type.value}
                  value={type.value}
                  className="text-xs px-3 py-1.5 data-[state=on]:bg-background data-[state=on]:shadow-sm"
                >
                  {type.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>

            {/* Time Frame Toggle */}
            <ToggleGroup
              type="single"
              value={timeFrame}
              onValueChange={(v) => v && setTimeFrame(v as TimeFrame)}
              className="bg-muted/50 p-1 rounded-lg"
            >
              {TIME_FRAMES.map((tf) => (
                <ToggleGroupItem
                  key={tf.value}
                  value={tf.value}
                  className="text-xs px-2.5 py-1.5 data-[state=on]:bg-background data-[state=on]:shadow-sm"
                >
                  {tf.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {/* Growth Chart */}
        {chartType === 'growth' && growthData.length > 1 && (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growthData}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop 
                      offset="5%" 
                      stopColor={stats?.isPositive ? 'hsl(var(--chart-1))' : 'hsl(var(--destructive))'} 
                      stopOpacity={0.3} 
                    />
                    <stop 
                      offset="95%" 
                      stopColor={stats?.isPositive ? 'hsl(var(--chart-1))' : 'hsl(var(--destructive))'} 
                      stopOpacity={0} 
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10 }} 
                  tickLine={false} 
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  tickFormatter={formatCurrency}
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  width={70}
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
                  formatter={(value: number, name: string) => [
                    formatCurrency(value), 
                    name === 'portfolio' ? 'Portfolio' : 'Benchmark'
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="portfolio"
                  name="portfolio"
                  stroke={stats?.isPositive ? 'hsl(var(--chart-1))' : 'hsl(var(--destructive))'}
                  strokeWidth={2}
                  fill={`url(#${gradientId})`}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Annual Returns Chart */}
        {chartType === 'annual' && annualData.length > 0 && (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={annualData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" vertical={false} />
                <XAxis 
                  dataKey="year" 
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  tickFormatter={(v) => `${v.toFixed(0)}%`}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`,
                    name === 'portfolio' ? 'Portfolio' : 'Benchmark'
                  ]}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeWidth={1} />
                <Bar 
                  dataKey="portfolio" 
                  name="portfolio"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={50}
                >
                  {annualData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`}
                      fill={entry.portfolio >= 0 ? 'hsl(var(--primary))' : 'hsl(var(--destructive))'}
                    />
                  ))}
                </Bar>
                <Bar 
                  dataKey="benchmark" 
                  name="benchmark"
                  fill="hsl(var(--muted-foreground))"
                  opacity={0.4}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={50}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Monthly Returns Chart */}
        {chartType === 'monthly' && monthlyData.length > 0 && (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" vertical={false} />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 9 }}
                  tickLine={false}
                  axisLine={false}
                  interval={2}
                />
                <YAxis 
                  tickFormatter={(v) => `${v.toFixed(0)}%`}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`,
                    name === 'portfolio' ? 'Portfolio' : 'Benchmark'
                  ]}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeWidth={1} />
                <Bar 
                  dataKey="portfolio" 
                  name="portfolio"
                  radius={[2, 2, 0, 0]}
                  maxBarSize={20}
                >
                  {monthlyData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`}
                      fill={entry.portfolio >= 0 ? 'hsl(var(--primary))' : 'hsl(var(--destructive))'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Drawdown Chart */}
        {chartType === 'drawdown' && drawdownData.length > 0 && (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={drawdownData}>
                <defs>
                  <linearGradient id="drawdown-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10 }} 
                  tickLine={false} 
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  tickFormatter={(v) => `${v.toFixed(0)}%`}
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  domain={['dataMin', 0]}
                />
                <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeWidth={1} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`${value.toFixed(2)}%`, 'Drawdown']}
                />
                <Area
                  type="monotone"
                  dataKey="drawdown"
                  stroke="hsl(var(--destructive))"
                  strokeWidth={2}
                  fill="url(#drawdown-gradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* No data fallback */}
        {((chartType === 'growth' && growthData.length <= 1) ||
          (chartType === 'annual' && annualData.length === 0) ||
          (chartType === 'monthly' && monthlyData.length === 0) ||
          (chartType === 'drawdown' && drawdownData.length === 0)) && (
          <div className="h-[300px] flex flex-col items-center justify-center border border-dashed rounded-lg bg-muted/20">
            <BarChart3 className="h-8 w-8 mb-2 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">Insufficient data for this view</p>
            <p className="text-xs text-muted-foreground mt-1">Try selecting a longer time frame</p>
          </div>
        )}

        {/* Data Info */}
        {dataInfo && (
          <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{dataInfo.tradingDays} trading days</span>
            </div>
            <span>{dataInfo.startDate} to {dataInfo.endDate}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
