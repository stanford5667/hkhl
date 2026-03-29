/**
 * Backtest Comparison Overlay
 * 
 * Renders the backtest equity curve as a ghost line alongside
 * the sim portfolio's actual performance on the same chart.
 */

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart,
} from 'recharts';
import { GitCompare, TrendingUp, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';

interface BacktestSnapshot {
  date: string;
  value: number;
}

interface BacktestComparisonOverlayProps {
  backtestResults: {
    totalReturn: number;
    annualizedReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
    winRate: number;
    profitFactor: number;
    portfolioHistory?: BacktestSnapshot[];
    startDate?: string;
    endDate?: string;
  } | null;
  strategyName: string | null;
  simStartDate: string;
  simInitialCapital: number;
  simCurrentValue: number;
}

export function BacktestComparisonOverlay({
  backtestResults,
  strategyName,
  simStartDate,
  simInitialCapital,
  simCurrentValue,
}: BacktestComparisonOverlayProps) {
  const simReturn = simInitialCapital > 0
    ? ((simCurrentValue - simInitialCapital) / simInitialCapital) * 100
    : 0;
  const backtestReturn = backtestResults?.totalReturn ?? 0;
  const delta = simReturn - backtestReturn;
  const isOutperforming = delta >= 0;

  // Build comparison chart data from backtest equity curve
  const chartData = useMemo(() => {
    if (!backtestResults?.portfolioHistory?.length) return [];
    // Normalize backtest curve to start at simInitialCapital
    const btHistory = backtestResults.portfolioHistory!;
    const btStartValue = btHistory[0]?.value || 1;
    const normalizationFactor = simInitialCapital / btStartValue;

    // Sample every Nth point to keep chart performant
    const sampleRate = Math.max(1, Math.floor(btHistory.length / 60));

    return btHistory
      .filter((_, i) => i % sampleRate === 0 || i === btHistory.length - 1)
      .map(snap => ({
        date: snap.date,
        backtestValue: Math.round(snap.value * normalizationFactor * 100) / 100,
      }));
  }, [backtestResults?.portfolioHistory, simInitialCapital]);

  if (!backtestResults || !strategyName) return null;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <GitCompare className="w-4 h-4 text-primary" />
            Strategy Comparison
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {strategyName}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Comparison metrics */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Your Return</p>
            <p className={`text-sm font-bold font-mono ${simReturn >= 0 ? 'text-success' : 'text-destructive'}`}>
              {simReturn >= 0 ? '+' : ''}{simReturn.toFixed(2)}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Backtest Predicted</p>
            <p className={`text-sm font-bold font-mono ${backtestReturn >= 0 ? 'text-success' : 'text-destructive'}`}>
              {backtestReturn >= 0 ? '+' : ''}{backtestReturn.toFixed(2)}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Delta</p>
            <div className="flex items-center justify-center gap-1">
              {isOutperforming ? (
                <TrendingUp className="w-3 h-3 text-success" />
              ) : (
                <TrendingDown className="w-3 h-3 text-destructive" />
              )}
              <p className={`text-sm font-bold font-mono ${isOutperforming ? 'text-success' : 'text-destructive'}`}>
                {delta >= 0 ? '+' : ''}{delta.toFixed(2)}%
              </p>
            </div>
          </div>
        </div>

        {/* Backtest metrics reference */}
        <div className="grid grid-cols-4 gap-2 pt-2 border-t border-border">
          <div>
            <p className="text-[10px] text-muted-foreground">Win Rate</p>
            <p className="text-xs font-mono">{backtestResults.winRate.toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Sharpe</p>
            <p className="text-xs font-mono">{backtestResults.sharpeRatio.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Max DD</p>
            <p className="text-xs font-mono text-destructive">{backtestResults.maxDrawdown.toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Profit Factor</p>
            <p className="text-xs font-mono">{backtestResults.profitFactor.toFixed(2)}</p>
          </div>
        </div>

        {/* Mini equity curve comparison */}
        {chartData.length > 2 && (
          <div className="pt-2">
            <p className="text-[10px] text-muted-foreground mb-1">Backtest Equity Curve (normalized to your capital)</p>
            <ResponsiveContainer width="100%" height={120}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 9 }}
                  tickFormatter={(d) => {
                    try { return format(new Date(d), 'MMM yy'); } catch { return d; }
                  }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 9 }}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  domain={['auto', 'auto']}
                  width={45}
                />
                <Tooltip
                  formatter={(value: number) => [`$${value.toLocaleString()}`, 'Backtest']}
                  labelFormatter={(d) => {
                    try { return format(new Date(d), 'MMM d, yyyy'); } catch { return d; }
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="backtestValue"
                  fill="hsl(var(--primary) / 0.1)"
                  stroke="hsl(var(--primary))"
                  strokeWidth={1.5}
                  strokeDasharray="4 2"
                  name="Backtest"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
