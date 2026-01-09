/**
 * Portfolio Growth Chart
 * Shows portfolio value over time vs benchmark with professional styling
 */

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PortfolioGrowthChartProps {
  dates: string[];
  portfolioValues: number[];
  benchmarkValues?: number[];
  initialCapital: number;
  className?: string;
}

export function PortfolioGrowthChart({
  dates,
  portfolioValues,
  benchmarkValues,
  initialCapital,
  className
}: PortfolioGrowthChartProps) {
  const [useLogScale, setUseLogScale] = useState(false);
  
  // Process data for chart
  const chartData = useMemo(() => {
    if (!dates.length || !portfolioValues.length) return [];
    
    return dates.map((date, i) => {
      const portfolioValue = portfolioValues[i] ?? initialCapital;
      const benchValue = benchmarkValues?.[i] ?? initialCapital;
      
      return {
        date,
        displayDate: new Date(date).toLocaleDateString('en-US', { 
          month: 'short', 
          year: '2-digit' 
        }),
        portfolio: portfolioValue,
        benchmark: benchValue,
      };
    });
  }, [dates, portfolioValues, benchmarkValues, initialCapital]);

  // Calculate summary stats
  const stats = useMemo(() => {
    if (!portfolioValues.length) return null;
    
    const finalValue = portfolioValues[portfolioValues.length - 1];
    const totalReturn = ((finalValue - initialCapital) / initialCapital) * 100;
    const benchFinal = benchmarkValues?.[benchmarkValues.length - 1] ?? initialCapital;
    const benchReturn = ((benchFinal - initialCapital) / initialCapital) * 100;
    const excessReturn = totalReturn - benchReturn;
    
    return {
      finalValue,
      totalReturn,
      benchReturn,
      excessReturn,
      isOutperforming: excessReturn > 0
    };
  }, [portfolioValues, benchmarkValues, initialCapital]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatTooltipValue = (value: number) => formatCurrency(value);

  if (!chartData.length || !stats) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Portfolio Growth</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              Portfolio Growth
              {stats.isOutperforming ? (
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 bg-emerald-500/10">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Outperforming
                </Badge>
              ) : (
                <Badge variant="outline" className="border-amber-500/30 text-amber-600 bg-amber-500/10">
                  <TrendingDown className="h-3 w-3 mr-1" />
                  Underperforming
                </Badge>
              )}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {formatCurrency(initialCapital)} → {formatCurrency(stats.finalValue)} 
              <span className={cn(
                "ml-2 font-medium",
                stats.totalReturn >= 0 ? "text-emerald-600" : "text-rose-600"
              )}>
                ({stats.totalReturn >= 0 ? '+' : ''}{stats.totalReturn.toFixed(2)}%)
              </span>
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="log-scale"
                checked={useLogScale}
                onCheckedChange={setUseLogScale}
              />
              <Label htmlFor="log-scale" className="text-xs text-muted-foreground">
                Log scale
              </Label>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-4">
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
              <XAxis 
                dataKey="displayDate" 
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                className="text-muted-foreground"
              />
              <YAxis 
                scale={useLogScale ? 'log' : 'auto'}
                domain={useLogScale ? ['auto', 'auto'] : ['dataMin - 5000', 'dataMax + 5000']}
                tickFormatter={formatCurrency}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                className="text-muted-foreground"
                width={80}
              />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  formatTooltipValue(value),
                  name === 'portfolio' ? 'Portfolio' : 'Benchmark (SPY)'
                ]}
                labelFormatter={(label) => `Date: ${label}`}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                formatter={(value) => (
                  <span className="text-sm text-muted-foreground">
                    {value === 'portfolio' ? 'Portfolio' : 'Benchmark (SPY)'}
                  </span>
                )}
              />
              <ReferenceLine 
                y={initialCapital} 
                stroke="hsl(var(--muted-foreground))" 
                strokeDasharray="5 5"
                label={{ 
                  value: 'Start', 
                  position: 'insideTopRight',
                  className: 'text-xs fill-muted-foreground'
                }}
              />
              <Line
                type="monotone"
                dataKey="portfolio"
                name="portfolio"
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 6, strokeWidth: 2 }}
              />
              {benchmarkValues && (
                <Line
                  type="monotone"
                  dataKey="benchmark"
                  name="benchmark"
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={1.5}
                  strokeDasharray="5 5"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {/* Summary Stats Bar */}
        <div className="mt-4 pt-4 border-t grid grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Starting Value</p>
            <p className="text-sm font-semibold">{formatCurrency(initialCapital)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Ending Value</p>
            <p className={cn(
              "text-sm font-semibold",
              stats.totalReturn >= 0 ? "text-emerald-600" : "text-rose-600"
            )}>
              {formatCurrency(stats.finalValue)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Total Return</p>
            <p className={cn(
              "text-sm font-semibold",
              stats.totalReturn >= 0 ? "text-emerald-600" : "text-rose-600"
            )}>
              {stats.totalReturn >= 0 ? '+' : ''}{stats.totalReturn.toFixed(2)}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">vs Benchmark</p>
            <p className={cn(
              "text-sm font-semibold",
              stats.excessReturn >= 0 ? "text-emerald-600" : "text-rose-600"
            )}>
              {stats.excessReturn >= 0 ? '+' : ''}{stats.excessReturn.toFixed(2)}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
