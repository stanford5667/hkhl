/**
 * Backtest Results Panel
 * Displays results matching the portfolio tracker style
 */

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Badge } from '@/components/ui/badge';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  ComposedChart,
  Line,
  Bar,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign,
  Gauge,
  Shield,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type ChartType = 'growth' | 'annual' | 'monthly' | 'drawdown';

// Local interface matching what the backtester components produce
export interface BacktestResultData {
  dates: string[];
  portfolioValues: number[];
  benchmarkValues: number[];
  dailyReturns: number[];
  benchmarkReturns: number[];
  drawdowns: number[];
  metrics: {
    totalReturn: number;
    cagr: number;
    volatility: number;
    sharpeRatio: number;
    sortinoRatio: number;
    maxDrawdown: number;
    beta: number;
    alpha: number;
    calmarRatio: number;
    treynorRatio: number;
  };
  yearlyReturns: { year: number; return: number; benchmark: number }[];
  monthlyReturns: { month: string; return: number }[];
}

interface BacktestResultsPanelProps {
  result: BacktestResultData;
  initialCapital: number;
  className?: string;
}

// Stat Card Component (matching Portfolio Tracker style)
function StatCard({ 
  label, 
  value, 
  change, 
  subtitle, 
  icon, 
  color = 'text-primary',
}: { 
  label: string;
  value: string;
  change?: number;
  subtitle?: string;
  icon: React.ReactNode;
  color?: string;
}) {
  return (
    <Card className="bg-gradient-to-br from-card to-secondary/20">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">{label}</span>
          <span className={color}>{icon}</span>
        </div>
        <p className="text-xl font-bold">{value}</p>
        {change !== undefined && (
          <p className={cn(
            "text-xs flex items-center gap-1",
            change >= 0 ? 'text-emerald-400' : 'text-rose-400'
          )}>
            {change >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(change).toFixed(2)}%
          </p>
        )}
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (Math.abs(value) >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

export function BacktestResultsPanel({
  result,
  initialCapital,
  className,
}: BacktestResultsPanelProps) {
  const [chartType, setChartType] = useState<ChartType>('growth');
  const { metrics } = result;
  
  // Calculate portfolio health score
  const healthScore = useMemo(() => {
    let score = 50;
    
    if (metrics.sharpeRatio >= 1) score += 15;
    else if (metrics.sharpeRatio >= 0.5) score += 10;
    else if (metrics.sharpeRatio >= 0) score += 5;
    else score -= 10;
    
    if (metrics.volatility < 15) score += 10;
    else if (metrics.volatility < 25) score += 5;
    else score -= 10;
    
    if (Math.abs(metrics.maxDrawdown) < 10) score += 10;
    else if (Math.abs(metrics.maxDrawdown) < 20) score += 5;
    else score -= 10;
    
    if (metrics.cagr > 10) score += 15;
    else if (metrics.cagr > 5) score += 10;
    else if (metrics.cagr > 0) score += 5;
    else score -= 10;

    score = Math.max(0, Math.min(100, score));
    
    const label = score >= 70 ? 'Strong' : score >= 50 ? 'Monitor' : 'At Risk';
    const color = score >= 70 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-rose-400';
    
    return { score, label, color };
  }, [metrics]);

  // Chart data
  const chartData = useMemo(() => {
    return result.portfolioValues.map((value: number, i: number) => ({
      date: result.dates[i],
      portfolio: value,
      benchmark: result.benchmarkValues[i],
      drawdown: result.drawdowns[i],
    }));
  }, [result]);

  // Annual returns data
  const annualData = useMemo(() => {
    return result.yearlyReturns.map((yr) => ({
      year: yr.year.toString(),
      portfolio: yr.return,
      benchmark: yr.benchmark,
    }));
  }, [result.yearlyReturns]);

  // Monthly heatmap data
  const monthlyByYear = useMemo(() => {
    const grouped: Record<string, Record<number, number>> = {};
    result.monthlyReturns.forEach((m) => {
      const [year, month] = m.month.split('-');
      if (!grouped[year]) grouped[year] = {};
      grouped[year][parseInt(month)] = m.return;
    });
    return grouped;
  }, [result.monthlyReturns]);

  const finalValue = result.portfolioValues[result.portfolioValues.length - 1];
  const totalGain = finalValue - initialCapital;
  const isPositive = totalGain >= 0;
  
  // Calculate yearly stats for best/worst
  const bestYear = useMemo(() => {
    if (!result.yearlyReturns.length) return null;
    return result.yearlyReturns.reduce((best, yr) => yr.return > best.return ? yr : best);
  }, [result.yearlyReturns]);
  
  const worstYear = useMemo(() => {
    if (!result.yearlyReturns.length) return null;
    return result.yearlyReturns.reduce((worst, yr) => yr.return < worst.return ? yr : worst);
  }, [result.yearlyReturns]);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Quick Stats Row - Market Intel Style */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          label="Final Value"
          value={formatCurrency(finalValue)}
          change={metrics.totalReturn}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <StatCard
          label="Total Return"
          value={`${metrics.totalReturn >= 0 ? '+' : ''}${metrics.totalReturn.toFixed(1)}%`}
          subtitle={`${(result.dates.length / 252).toFixed(1)} years`}
          icon={isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          color={isPositive ? 'text-emerald-400' : 'text-rose-400'}
        />
        <StatCard
          label="CAGR"
          value={`${metrics.cagr >= 0 ? '+' : ''}${metrics.cagr.toFixed(2)}%`}
          subtitle={metrics.cagr >= 10 ? 'Excellent' : metrics.cagr >= 5 ? 'Good' : 'Below avg'}
          icon={<Target className="h-4 w-4" />}
          color={metrics.cagr >= 0 ? 'text-emerald-400' : 'text-rose-400'}
        />
        <StatCard
          label="Sharpe Ratio"
          value={metrics.sharpeRatio.toFixed(2)}
          subtitle={metrics.sharpeRatio >= 1 ? 'Excellent' : metrics.sharpeRatio >= 0.5 ? 'Good' : 'Needs work'}
          icon={<Gauge className="h-4 w-4" />}
          color={metrics.sharpeRatio >= 1 ? 'text-emerald-400' : metrics.sharpeRatio >= 0.5 ? 'text-amber-400' : 'text-rose-400'}
        />
        <StatCard
          label="Max Drawdown"
          value={`-${metrics.maxDrawdown.toFixed(1)}%`}
          subtitle={metrics.maxDrawdown < 20 ? 'Moderate' : 'High risk'}
          icon={<TrendingDown className="h-4 w-4" />}
          color="text-rose-400"
        />
        <StatCard
          label="Portfolio Score"
          value={`${healthScore.score}`}
          subtitle={healthScore.label}
          icon={<Shield className="h-4 w-4" />}
          color={healthScore.color}
        />
      </div>

      {/* Performance Chart Card */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Portfolio Performance
              </CardTitle>
              <div className="flex items-baseline gap-3">
                <span className="text-2xl font-bold">{formatCurrency(finalValue)}</span>
                <Badge variant={isPositive ? "default" : "destructive"} className="gap-1">
                  {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {metrics.totalReturn >= 0 ? '+' : ''}{metrics.totalReturn.toFixed(2)}%
                </Badge>
              </div>
            </div>
            
            {/* Chart Type Toggle */}
            <ToggleGroup
              type="single"
              value={chartType}
              onValueChange={(v) => v && setChartType(v as ChartType)}
              className="bg-muted/50 p-1 rounded-lg w-fit"
            >
              {[
                { value: 'growth', label: 'Portfolio Growth' },
                { value: 'annual', label: 'Annual Returns' },
                { value: 'monthly', label: 'Monthly Returns' },
                { value: 'drawdown', label: 'Drawdown' },
              ].map((type) => (
                <ToggleGroupItem
                  key={type.value}
                  value={type.value}
                  className="text-xs px-3 py-1.5 data-[state=on]:bg-background data-[state=on]:shadow-sm"
                >
                  {type.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        </CardHeader>
        
        <CardContent className="pt-4">
          {/* Growth Chart */}
          {chartType === 'growth' && (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="backtestGrowthGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={isPositive ? 'hsl(var(--chart-1))' : 'hsl(var(--destructive))'} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={isPositive ? 'hsl(var(--chart-1))' : 'hsl(var(--destructive))'} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10 }} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(v) => new Date(v).getFullYear().toString()}
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
                    y={initialCapital} 
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
                    labelFormatter={(label) => new Date(label).toLocaleDateString()}
                  />
                  <Area
                    type="monotone"
                    dataKey="benchmark"
                    name="benchmark"
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth={1}
                    strokeDasharray="4 4"
                    fill="none"
                  />
                  <Area
                    type="monotone"
                    dataKey="portfolio"
                    name="portfolio"
                    stroke={isPositive ? 'hsl(var(--chart-1))' : 'hsl(var(--destructive))'}
                    strokeWidth={2}
                    fill="url(#backtestGrowthGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
          
          {/* Annual Returns Chart */}
          {chartType === 'annual' && (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={annualData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
                      backgroundColor: 'hsl(var(--popover))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeWidth={1} />
                  <Bar 
                    dataKey="portfolio" 
                    name="portfolio"
                    radius={[4, 4, 0, 0]}
                  >
                    {annualData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.portfolio >= 0 ? 'hsl(var(--chart-1))' : 'hsl(var(--destructive))'} 
                      />
                    ))}
                  </Bar>
                  <Line 
                    type="monotone" 
                    dataKey="benchmark" 
                    name="benchmark"
                    stroke="hsl(var(--muted-foreground))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--muted-foreground))', r: 3 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
          
          {/* Monthly Heatmap */}
          {chartType === 'monthly' && (
            <div className="overflow-x-auto">
              <div className="grid gap-0.5 text-center min-w-[600px]" style={{ gridTemplateColumns: 'auto repeat(12, 1fr)' }}>
                <div className="text-xs font-medium text-muted-foreground p-1">Year</div>
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(m => (
                  <div key={m} className="text-xs font-medium text-muted-foreground p-1">{m}</div>
                ))}
                
                {Object.entries(monthlyByYear).sort(([a], [b]) => a.localeCompare(b)).map(([year, months]) => (
                  <React.Fragment key={`row-${year}`}>
                    <div className="text-xs font-mono text-muted-foreground py-2">{year}</div>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => {
                      const value = months[m] || 0;
                      const intensity = Math.min(Math.abs(value) / 10, 1);
                      const bgColor = value > 0 
                        ? `rgba(34, 197, 94, ${0.2 + intensity * 0.6})` 
                        : value < 0 
                          ? `rgba(239, 68, 68, ${0.2 + intensity * 0.6})`
                          : 'transparent';
                      return (
                        <div 
                          key={`${year}-${m}`}
                          className="text-[10px] font-mono py-2 rounded"
                          style={{ backgroundColor: bgColor }}
                        >
                          {value !== 0 ? `${value > 0 ? '+' : ''}${value.toFixed(1)}` : '-'}
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}
          
          {/* Drawdown Chart */}
          {chartType === 'drawdown' && (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="backtestDdGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10 }} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(v) => new Date(v).getFullYear().toString()}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    tickFormatter={(v) => `${v.toFixed(0)}%`}
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    domain={['auto', 0]}
                    width={50}
                  />
                  <ReferenceLine 
                    y={-metrics.maxDrawdown} 
                    stroke="hsl(var(--destructive))" 
                    strokeDasharray="5 5"
                    label={{ 
                      value: `Max: -${metrics.maxDrawdown.toFixed(1)}%`, 
                      fill: 'hsl(var(--destructive))', 
                      fontSize: 10,
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`${value.toFixed(2)}%`, 'Drawdown']}
                    labelFormatter={(label) => new Date(label).toLocaleDateString()}
                  />
                  <Area
                    type="monotone"
                    dataKey="drawdown"
                    stroke="hsl(var(--destructive))"
                    strokeWidth={1.5}
                    fill="url(#backtestDdGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Secondary Metrics Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Risk Metrics */}
        <Card className="bg-secondary/50 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Risk Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Volatility</span>
                <span className="font-medium">{metrics.volatility.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Sharpe</span>
                <span className="font-medium">{metrics.sharpeRatio.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Sortino</span>
                <span className="font-medium">{metrics.sortinoRatio.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Max DD</span>
                <span className="font-medium text-rose-400">-{metrics.maxDrawdown.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Calmar</span>
                <span className="font-medium">{metrics.calmarRatio.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Beta</span>
                <span className="font-medium">{metrics.beta.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance Stats */}
        <Card className="bg-secondary/50 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Performance Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Best Year</span>
                <span className="font-medium text-emerald-400">
                  {bestYear ? `+${bestYear.return.toFixed(1)}% (${bestYear.year})` : '--'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Worst Year</span>
                <span className="font-medium text-rose-400">
                  {worstYear ? `${worstYear.return.toFixed(1)}% (${worstYear.year})` : '--'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Alpha</span>
                <span className={cn("font-medium", metrics.alpha >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
                  {metrics.alpha >= 0 ? '+' : ''}{metrics.alpha.toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Treynor</span>
                <span className="font-medium">{metrics.treynorRatio.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Start</span>
                <span className="font-medium">{formatCurrency(initialCapital)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">End</span>
                <span className={cn("font-medium", isPositive ? 'text-emerald-400' : 'text-rose-400')}>
                  {formatCurrency(finalValue)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Risk Alert if needed */}
      {metrics.maxDrawdown > 30 && (
        <Card className="bg-rose-900/20 border border-rose-500/30">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-400" />
            <div>
              <p className="font-medium text-rose-400">
                High drawdown risk detected
              </p>
              <p className="text-sm text-muted-foreground">
                This portfolio experienced a -{metrics.maxDrawdown.toFixed(1)}% maximum drawdown. Consider diversifying or adjusting allocations.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
