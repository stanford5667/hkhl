/**
 * Performance Summary Table
 * Clean tabular display of key portfolio metrics vs benchmark
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Info, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PerformanceSummaryTableProps {
  startBalance: number;
  endBalance: number;
  cagr: number;
  volatility: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  bestYear?: number;
  worstYear?: number;
  beta?: number;
  alpha?: number;
  // Benchmark comparison (optional)
  benchmarkEndBalance?: number;
  benchmarkCagr?: number;
  benchmarkVolatility?: number;
  benchmarkSharpe?: number;
  benchmarkMaxDrawdown?: number;
  className?: string;
}

interface MetricRowProps {
  label: string;
  tooltip?: string;
  portfolioValue: string | number;
  benchmarkValue?: string | number;
  isBetter?: boolean | null; // true = portfolio better, false = benchmark better, null = neutral
  format?: 'currency' | 'percent' | 'ratio' | 'number';
  higherIsBetter?: boolean;
}

function MetricRow({ 
  label, 
  tooltip, 
  portfolioValue, 
  benchmarkValue, 
  isBetter,
  format = 'number',
  higherIsBetter = true
}: MetricRowProps) {
  const formatValue = (value: string | number) => {
    if (typeof value === 'string') return value;
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', { 
          style: 'currency', 
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0 
        }).format(value);
      case 'percent':
        return `${value >= 0 ? '' : ''}${value.toFixed(2)}%`;
      case 'ratio':
        return value.toFixed(2);
      default:
        return value.toFixed(2);
    }
  };

  return (
    <tr className="border-b border-border/50 hover:bg-muted/30 transition-colors">
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{label}</span>
          {tooltip && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3.5 w-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-[250px]">
                  <p className="text-xs">{tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </td>
      <td className="py-3 px-4 text-right">
        <div className="flex items-center justify-end gap-2">
          <span className={cn(
            "font-mono text-sm font-medium",
            isBetter === true && "text-emerald-600",
            isBetter === false && "text-muted-foreground"
          )}>
            {formatValue(portfolioValue)}
          </span>
          {isBetter === true && (
            <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
          )}
          {isBetter === false && benchmarkValue !== undefined && (
            <TrendingDown className="h-3.5 w-3.5 text-amber-500" />
          )}
        </div>
      </td>
      {benchmarkValue !== undefined && (
        <td className="py-3 px-4 text-right">
          <span className="font-mono text-sm text-muted-foreground">
            {formatValue(benchmarkValue)}
          </span>
        </td>
      )}
    </tr>
  );
}

export function PerformanceSummaryTable({
  startBalance,
  endBalance,
  cagr,
  volatility,
  sharpeRatio,
  sortinoRatio,
  maxDrawdown,
  bestYear,
  worstYear,
  beta,
  alpha,
  benchmarkEndBalance,
  benchmarkCagr,
  benchmarkVolatility,
  benchmarkSharpe,
  benchmarkMaxDrawdown,
  className
}: PerformanceSummaryTableProps) {
  const hasBenchmark = benchmarkCagr !== undefined;
  
  // Determine which is better for each metric
  const comparisons = {
    endBalance: hasBenchmark ? endBalance > (benchmarkEndBalance ?? 0) : null,
    cagr: hasBenchmark ? cagr > (benchmarkCagr ?? 0) : null,
    volatility: hasBenchmark ? volatility < (benchmarkVolatility ?? 0) : null, // Lower is better
    sharpe: hasBenchmark ? sharpeRatio > (benchmarkSharpe ?? 0) : null,
    maxDrawdown: hasBenchmark ? Math.abs(maxDrawdown) < Math.abs(benchmarkMaxDrawdown ?? 0) : null, // Smaller is better
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Performance Summary</CardTitle>
          {hasBenchmark && (
            <Badge variant="outline" className="text-xs">
              vs S&P 500
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Metric
                </th>
                <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Portfolio
                </th>
                {hasBenchmark && (
                  <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Benchmark
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              <MetricRow
                label="Start Balance"
                portfolioValue={startBalance}
                benchmarkValue={hasBenchmark ? startBalance : undefined}
                format="currency"
              />
              <MetricRow
                label="End Balance"
                tooltip="Final portfolio value at end of period"
                portfolioValue={endBalance}
                benchmarkValue={benchmarkEndBalance}
                isBetter={comparisons.endBalance}
                format="currency"
              />
              <MetricRow
                label="Annualized Return (CAGR)"
                tooltip="Compound Annual Growth Rate - average yearly return"
                portfolioValue={cagr}
                benchmarkValue={benchmarkCagr}
                isBetter={comparisons.cagr}
                format="percent"
              />
              <MetricRow
                label="Standard Deviation"
                tooltip="Measure of return volatility - lower means more stable"
                portfolioValue={volatility}
                benchmarkValue={benchmarkVolatility}
                isBetter={comparisons.volatility}
                format="percent"
                higherIsBetter={false}
              />
              {bestYear !== undefined && (
                <MetricRow
                  label="Best Year"
                  tooltip="Highest annual return achieved"
                  portfolioValue={bestYear}
                  format="percent"
                />
              )}
              {worstYear !== undefined && (
                <MetricRow
                  label="Worst Year"
                  tooltip="Lowest annual return experienced"
                  portfolioValue={worstYear}
                  format="percent"
                />
              )}
              <MetricRow
                label="Maximum Drawdown"
                tooltip="Largest peak-to-trough decline - smaller is better"
                portfolioValue={-Math.abs(maxDrawdown)}
                benchmarkValue={benchmarkMaxDrawdown ? -Math.abs(benchmarkMaxDrawdown) : undefined}
                isBetter={comparisons.maxDrawdown}
                format="percent"
                higherIsBetter={false}
              />
              <MetricRow
                label="Sharpe Ratio"
                tooltip="Risk-adjusted return measure - higher is better"
                portfolioValue={sharpeRatio}
                benchmarkValue={benchmarkSharpe}
                isBetter={comparisons.sharpe}
                format="ratio"
              />
              <MetricRow
                label="Sortino Ratio"
                tooltip="Downside risk-adjusted return - higher is better"
                portfolioValue={sortinoRatio}
                format="ratio"
              />
              {beta !== undefined && (
                <MetricRow
                  label="Beta"
                  tooltip="Sensitivity to market movements - 1.0 = moves with market"
                  portfolioValue={beta}
                  benchmarkValue={1.0}
                  format="ratio"
                />
              )}
              {alpha !== undefined && (
                <MetricRow
                  label="Alpha"
                  tooltip="Excess return vs benchmark after adjusting for risk"
                  portfolioValue={alpha}
                  format="percent"
                  isBetter={alpha > 0 ? true : alpha < 0 ? false : null}
                />
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
