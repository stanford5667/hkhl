/**
 * Annual Returns Bar Chart
 * Shows year-by-year returns comparison with benchmark
 */

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
  Cell,
} from 'recharts';
import { cn } from '@/lib/utils';

interface AnnualReturnsChartProps {
  dates: string[];
  portfolioReturns: number[];
  benchmarkReturns?: number[];
  className?: string;
}

export function AnnualReturnsChart({
  dates,
  portfolioReturns,
  benchmarkReturns,
  className
}: AnnualReturnsChartProps) {
  // Aggregate daily returns to annual returns
  const annualData = useMemo(() => {
    if (!dates.length || !portfolioReturns.length) return [];
    
    // Group returns by year
    const yearlyReturns: Record<string, { portfolio: number[], benchmark: number[] }> = {};
    
    dates.forEach((date, i) => {
      const year = new Date(date).getFullYear().toString();
      if (!yearlyReturns[year]) {
        yearlyReturns[year] = { portfolio: [], benchmark: [] };
      }
      if (portfolioReturns[i] !== undefined && !isNaN(portfolioReturns[i])) {
        yearlyReturns[year].portfolio.push(portfolioReturns[i]);
      }
      if (benchmarkReturns?.[i] !== undefined && !isNaN(benchmarkReturns[i])) {
        yearlyReturns[year].benchmark.push(benchmarkReturns[i]);
      }
    });
    
    // Calculate compounded annual returns
    return Object.entries(yearlyReturns)
      .filter(([_, data]) => data.portfolio.length > 20) // At least 1 month of data
      .map(([year, data]) => {
        // Compound daily returns: (1 + r1) * (1 + r2) * ... - 1
        const portfolioAnnual = data.portfolio.reduce((acc, r) => acc * (1 + r), 1) - 1;
        const benchmarkAnnual = data.benchmark.length > 0 
          ? data.benchmark.reduce((acc, r) => acc * (1 + r), 1) - 1 
          : 0;
        
        return {
          year,
          portfolio: portfolioAnnual * 100,
          benchmark: benchmarkAnnual * 100,
        };
      })
      .sort((a, b) => a.year.localeCompare(b.year));
  }, [dates, portfolioReturns, benchmarkReturns]);

  // Stats summary
  const stats = useMemo(() => {
    if (!annualData.length) return null;
    
    const portfolioReturns = annualData.map(d => d.portfolio);
    const positiveYears = portfolioReturns.filter(r => r >= 0).length;
    const bestYear = Math.max(...portfolioReturns);
    const worstYear = Math.min(...portfolioReturns);
    const avgReturn = portfolioReturns.reduce((a, b) => a + b, 0) / portfolioReturns.length;
    
    return {
      positiveYears,
      totalYears: annualData.length,
      positiveRate: (positiveYears / annualData.length) * 100,
      bestYear,
      worstYear,
      avgReturn,
    };
  }, [annualData]);

  if (!annualData.length || !stats) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Annual Returns</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] flex items-center justify-center text-muted-foreground">
            Insufficient data for annual breakdown
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Annual Returns</CardTitle>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-primary" />
              <span className="text-muted-foreground">Portfolio</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-muted-foreground/50" />
              <span className="text-muted-foreground">Benchmark</span>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-4">
        <div className="h-[250px]">
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
                domain={['dataMin - 5', 'dataMax + 5']}
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
        
        {/* Summary Stats */}
        <div className="mt-4 pt-4 border-t grid grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Positive Years</p>
            <p className="text-sm font-semibold">
              {stats.positiveYears}/{stats.totalYears} ({stats.positiveRate.toFixed(0)}%)
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Best Year</p>
            <p className="text-sm font-semibold text-emerald-600">
              +{stats.bestYear.toFixed(2)}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Worst Year</p>
            <p className={cn(
              "text-sm font-semibold",
              stats.worstYear >= 0 ? "text-emerald-600" : "text-rose-600"
            )}>
              {stats.worstYear >= 0 ? '+' : ''}{stats.worstYear.toFixed(2)}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Avg Return</p>
            <p className={cn(
              "text-sm font-semibold",
              stats.avgReturn >= 0 ? "text-emerald-600" : "text-rose-600"
            )}>
              {stats.avgReturn >= 0 ? '+' : ''}{stats.avgReturn.toFixed(2)}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
