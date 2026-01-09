/**
 * Drawdown Chart
 * Visualizes portfolio drawdowns over time
 */

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
} from 'recharts';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DrawdownChartProps {
  dates: string[];
  portfolioValues: number[];
  className?: string;
}

export function DrawdownChart({
  dates,
  portfolioValues,
  className
}: DrawdownChartProps) {
  // Calculate drawdown series
  const chartData = useMemo(() => {
    if (!dates.length || !portfolioValues.length) return [];
    
    let peak = portfolioValues[0];
    
    return dates.map((date, i) => {
      const value = portfolioValues[i];
      if (value > peak) peak = value;
      
      const drawdown = ((value - peak) / peak) * 100;
      
      return {
        date,
        displayDate: new Date(date).toLocaleDateString('en-US', { 
          month: 'short', 
          year: '2-digit' 
        }),
        drawdown,
        value,
        peak,
      };
    });
  }, [dates, portfolioValues]);

  // Stats
  const stats = useMemo(() => {
    if (!chartData.length) return null;
    
    const drawdowns = chartData.map(d => d.drawdown);
    const maxDrawdown = Math.min(...drawdowns);
    const maxDrawdownIdx = drawdowns.indexOf(maxDrawdown);
    const maxDrawdownDate = chartData[maxDrawdownIdx]?.date;
    
    // Find drawdown periods (consecutive negative drawdowns)
    let currentDrawdownStart: string | null = null;
    let longestDrawdownDays = 0;
    let currentDrawdownDays = 0;
    
    chartData.forEach((d, i) => {
      if (d.drawdown < -1) { // In drawdown (more than 1%)
        if (!currentDrawdownStart) {
          currentDrawdownStart = d.date;
        }
        currentDrawdownDays++;
        if (currentDrawdownDays > longestDrawdownDays) {
          longestDrawdownDays = currentDrawdownDays;
        }
      } else {
        currentDrawdownStart = null;
        currentDrawdownDays = 0;
      }
    });
    
    // Average drawdown (when in drawdown)
    const inDrawdown = drawdowns.filter(d => d < 0);
    const avgDrawdown = inDrawdown.length > 0 
      ? inDrawdown.reduce((a, b) => a + b, 0) / inDrawdown.length 
      : 0;
    
    return {
      maxDrawdown,
      maxDrawdownDate,
      avgDrawdown,
      longestRecoveryDays: longestDrawdownDays,
      timeInDrawdown: (inDrawdown.length / drawdowns.length) * 100,
    };
  }, [chartData]);

  if (!chartData.length || !stats) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Drawdown Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
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
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            Drawdown Analysis
            {Math.abs(stats.maxDrawdown) > 20 && (
              <Badge variant="outline" className="border-rose-500/30 text-rose-600 bg-rose-500/10">
                <AlertTriangle className="h-3 w-3 mr-1" />
                High Risk
              </Badge>
            )}
          </CardTitle>
          <span className="text-sm text-muted-foreground">
            Max: <span className="font-semibold text-rose-600">{stats.maxDrawdown.toFixed(2)}%</span>
          </span>
        </div>
      </CardHeader>
      
      <CardContent className="pt-4">
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="drawdownGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
              <XAxis 
                dataKey="displayDate" 
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
                domain={['dataMin - 2', 2]}
              />
              <Tooltip 
                formatter={(value: number) => [`${value.toFixed(2)}%`, 'Drawdown']}
                labelFormatter={(label) => `Date: ${label}`}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeWidth={1} />
              <ReferenceLine 
                y={stats.maxDrawdown} 
                stroke="hsl(var(--destructive))" 
                strokeDasharray="5 5"
                label={{ 
                  value: `Max: ${stats.maxDrawdown.toFixed(1)}%`, 
                  position: 'insideTopRight',
                  className: 'text-xs fill-destructive'
                }}
              />
              <Area
                type="monotone"
                dataKey="drawdown"
                stroke="hsl(var(--destructive))"
                strokeWidth={1.5}
                fillOpacity={1}
                fill="url(#drawdownGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        {/* Stats Summary */}
        <div className="mt-4 pt-4 border-t grid grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Max Drawdown</p>
            <p className="text-sm font-semibold text-rose-600">{stats.maxDrawdown.toFixed(2)}%</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Avg Drawdown</p>
            <p className="text-sm font-semibold">{stats.avgDrawdown.toFixed(2)}%</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Longest Recovery</p>
            <p className="text-sm font-semibold">{stats.longestRecoveryDays} days</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Time in Drawdown</p>
            <p className="text-sm font-semibold">{stats.timeInDrawdown.toFixed(1)}%</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
