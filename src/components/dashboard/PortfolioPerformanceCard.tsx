import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  LineChart, 
  ChevronRight, 
  ArrowUpRight, 
  ArrowDownRight,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePortfolioPerformance } from '@/hooks/usePortfolioPerformance';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface PortfolioPerformanceCardProps {
  days?: number;
  showAllocation?: boolean;
  className?: string;
}

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
  if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (Math.abs(value) >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

const ASSET_CLASS_COLORS: Record<string, string> = {
  public_equity: 'hsl(var(--chart-1))',
  private_equity: 'hsl(var(--chart-2))',
  real_estate: 'hsl(var(--chart-3))',
  credit: 'hsl(var(--chart-4))',
  other: 'hsl(var(--chart-5))',
};

const ASSET_CLASS_LABELS: Record<string, string> = {
  public_equity: 'Public Equity',
  private_equity: 'Private Equity',
  real_estate: 'Real Estate',
  credit: 'Credit',
  other: 'Other',
};

export function PortfolioPerformanceCard({ 
  days = 30,
  showAllocation = true,
  className,
}: PortfolioPerformanceCardProps) {
  const {
    totalValue,
    totalCostBasis,
    todayChange,
    todayChangePercent,
    totalGainLoss,
    totalGainLossPercent,
    byAssetClass,
    chartData,
    periodReturn,
    periodReturnPercent,
    isLoading,
    hasHistory,
    refresh,
    generateDemoHistory,
  } = usePortfolioPerformance(days);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  };

  // Prepare allocation data for pie chart
  const allocationData = Object.entries(byAssetClass)
    .filter(([_, data]) => data.value > 0)
    .map(([key, data]) => ({
      name: ASSET_CLASS_LABELS[key] || key,
      value: data.value,
      color: ASSET_CLASS_COLORS[key] || 'hsl(var(--muted))',
    }));

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  const isTodayPositive = todayChange >= 0;
  const isGainPositive = totalGainLoss >= 0;
  const isPeriodPositive = periodReturn >= 0;

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <LineChart className="h-4 w-4" />
              Portfolio Performance
            </CardTitle>
            <div className="flex items-baseline gap-3 mt-1">
              <CardDescription className="text-2xl font-bold text-foreground">
                {formatCurrency(totalValue)}
              </CardDescription>
              {totalValue > 0 && (
                <div className={cn(
                  "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                  isTodayPositive 
                    ? "bg-emerald-500/10 text-emerald-500" 
                    : "bg-rose-500/10 text-rose-500"
                )}>
                  {isTodayPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {formatCurrency(Math.abs(todayChange))} today
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-8 w-8"
            >
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            </Button>
            <Link to="/markets">
              <Button variant="ghost" size="sm">
                View Holdings
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Stats row */}
        <div className="flex gap-6 mb-4 text-sm">
          <div>
            <span className="text-muted-foreground">{days}d Return: </span>
            <span className={cn("font-medium", isPeriodPositive ? "text-emerald-500" : "text-rose-500")}>
              {formatPercent(periodReturnPercent)}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Total Return: </span>
            <span className={cn("font-medium", isGainPositive ? "text-emerald-500" : "text-rose-500")}>
              {formatCurrency(totalGainLoss)} ({formatPercent(totalGainLossPercent)})
            </span>
          </div>
        </div>

        {/* Chart */}
        {chartData.length > 1 ? (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorPublic" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={ASSET_CLASS_COLORS.public_equity} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={ASSET_CLASS_COLORS.public_equity} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorPrivate" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={ASSET_CLASS_COLORS.private_equity} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={ASSET_CLASS_COLORS.private_equity} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorRealEstate" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={ASSET_CLASS_COLORS.real_estate} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={ASSET_CLASS_COLORS.real_estate} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorCredit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={ASSET_CLASS_COLORS.credit} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={ASSET_CLASS_COLORS.credit} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorOther" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={ASSET_CLASS_COLORS.other} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={ASSET_CLASS_COLORS.other} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10 }} 
                  tickLine={false} 
                  axisLine={false} 
                  interval="preserveStartEnd" 
                />
                <YAxis hide domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number, name: string) => [
                    formatCurrency(value), 
                    ASSET_CLASS_LABELS[name] || name
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="public_equity"
                  stackId="1"
                  stroke={ASSET_CLASS_COLORS.public_equity}
                  fill="url(#colorPublic)"
                  name="public_equity"
                />
                <Area
                  type="monotone"
                  dataKey="private_equity"
                  stackId="1"
                  stroke={ASSET_CLASS_COLORS.private_equity}
                  fill="url(#colorPrivate)"
                  name="private_equity"
                />
                <Area
                  type="monotone"
                  dataKey="real_estate"
                  stackId="1"
                  stroke={ASSET_CLASS_COLORS.real_estate}
                  fill="url(#colorRealEstate)"
                  name="real_estate"
                />
                <Area
                  type="monotone"
                  dataKey="credit"
                  stackId="1"
                  stroke={ASSET_CLASS_COLORS.credit}
                  fill="url(#colorCredit)"
                  name="credit"
                />
                <Area
                  type="monotone"
                  dataKey="other"
                  stackId="1"
                  stroke={ASSET_CLASS_COLORS.other}
                  fill="url(#colorOther)"
                  name="other"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-48 flex flex-col items-center justify-center border border-dashed rounded-lg bg-muted/20">
            <p className="text-sm text-muted-foreground mb-3">
              No historical data yet
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={generateDemoHistory}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Generate Demo History
            </Button>
          </div>
        )}

        {/* Legend and Allocation */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex gap-4 text-xs flex-wrap">
            {Object.entries(byAssetClass)
              .filter(([_, data]) => data.value > 0)
              .map(([key, data]) => (
                <div key={key} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: ASSET_CLASS_COLORS[key] }}
                  />
                  <span className="text-muted-foreground">
                    {ASSET_CLASS_LABELS[key]} ({formatCurrency(data.value)})
                  </span>
                </div>
              ))
            }
          </div>
          
          {/* Mini Pie Chart */}
          {showAllocation && allocationData.length > 1 && (
            <div className="w-16 h-16">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={allocationData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={12}
                    outerRadius={28}
                    paddingAngle={2}
                  >
                    {allocationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
