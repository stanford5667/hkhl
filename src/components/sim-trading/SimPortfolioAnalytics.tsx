/**
 * SimPortfolioAnalytics
 * Full Portfolio Builder-style analytics for sim trading portfolios.
 * Uses sim_snapshots for portfolio value time series, then computes
 * the same metrics shown in the Portfolio Visualizer results dashboard.
 */

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Loader2, Download, TrendingUp, TrendingDown, Target, Activity, BarChart3, Percent, AlertTriangle } from 'lucide-react';
import { PortfolioGrowthChart } from '@/components/portfolio/PortfolioGrowthChart';
import { DrawdownChart } from '@/components/portfolio/DrawdownChart';
import { AnnualReturnsChart } from '@/components/portfolio/AnnualReturnsChart';
import { PerformanceSummaryTable } from '@/components/portfolio/PerformanceSummaryTable';
import { AdvancedMetricsDashboard } from '@/components/backtester/AdvancedMetricsDashboard';
import { calculateSimpleReturns } from '@/services/portfolioMetricsService';
import { calculateAllAdvancedMetrics, type AdvancedRiskMetrics } from '@/services/advancedMetricsService';
import { calculateMaxDrawdown } from '@/services/portfolioMetricsService';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { SimTrade } from './SimPortfolioDetail';

interface Props {
  portfolioId: string;
  initialCapital: number;
  trades: SimTrade[];
}

interface ClosedTrade {
  ticker: string;
  entryDate: string;
  exitDate: string;
  quantity: number;
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  pnlPct: number;
}

function computeClosedTrades(trades: SimTrade[]): ClosedTrade[] {
  const sorted = [...trades].sort((a, b) => new Date(a.executed_at).getTime() - new Date(b.executed_at).getTime());
  const openLots = new Map<string, { qty: number; price: number; date: string }[]>();
  const closed: ClosedTrade[] = [];

  for (const t of sorted) {
    const key = t.ticker.toUpperCase();
    if (t.action === 'buy' && t.instrument_type === 'stock') {
      const lots = openLots.get(key) || [];
      lots.push({ qty: t.quantity, price: t.price_at_execution, date: t.executed_at });
      openLots.set(key, lots);
    } else if (t.action === 'sell' && t.instrument_type === 'stock') {
      let remaining = t.quantity;
      const lots = openLots.get(key) || [];
      while (remaining > 0 && lots.length > 0) {
        const lot = lots[0];
        const filled = Math.min(remaining, lot.qty);
        const pnl = (t.price_at_execution - lot.price) * filled;
        const pnlPct = lot.price > 0 ? ((t.price_at_execution - lot.price) / lot.price) * 100 : 0;
        closed.push({
          ticker: key,
          entryDate: lot.date,
          exitDate: t.executed_at,
          quantity: filled,
          entryPrice: lot.price,
          exitPrice: t.price_at_execution,
          pnl,
          pnlPct,
        });
        lot.qty -= filled;
        remaining -= filled;
        if (lot.qty <= 0) lots.shift();
      }
      openLots.set(key, lots);
    }
  }
  return closed;
}

export function SimPortfolioAnalytics({ portfolioId, initialCapital, trades }: Props) {
  const [snapshots, setSnapshots] = useState<{ date: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyticsTab, setAnalyticsTab] = useState('performance');

  // Fetch snapshots
  useEffect(() => {
    const fetchSnapshots = async () => {
      const { data } = await supabase
        .from('sim_snapshots')
        .select('snapshot_date, total_value')
        .eq('portfolio_id', portfolioId)
        .order('snapshot_date', { ascending: true });

      if (data && data.length > 0) {
        setSnapshots(data.map((s: any) => ({
          date: s.snapshot_date,
          value: Number(s.total_value),
        })));
      }
      setLoading(false);
    };
    fetchSnapshots();
  }, [portfolioId]);

  // Derive arrays for chart components
  const dates = useMemo(() => snapshots.map(s => s.date), [snapshots]);
  const portfolioValues = useMemo(() => snapshots.map(s => s.value), [snapshots]);
  const dailyReturns = useMemo(() => calculateSimpleReturns(portfolioValues), [portfolioValues]);

  // Compute advanced metrics
  const advancedMetrics: AdvancedRiskMetrics | null = useMemo(() => {
    if (dailyReturns.length < 2 || portfolioValues.length < 2) return null;

    const maxDD = calculateMaxDrawdown(portfolioValues);
    const years = dailyReturns.length / 252;
    const startVal = portfolioValues[0];
    const endVal = portfolioValues[portfolioValues.length - 1];
    const annualizedReturn = years > 0 ? (Math.pow(endVal / startVal, 1 / years) - 1) * 100 : 0;

    return calculateAllAdvancedMetrics(
      dailyReturns,
      portfolioValues,
      new Map(), // no weight data for sim
      annualizedReturn,
      maxDD,
      1, // beta default
      undefined // no benchmark
    );
  }, [dailyReturns, portfolioValues]);

  // Performance summary props
  const perfSummary = useMemo(() => {
    if (!advancedMetrics) return null;
    return {
      startBalance: initialCapital,
      endBalance: portfolioValues[portfolioValues.length - 1] ?? initialCapital,
      cagr: advancedMetrics.cagr,
      volatility: advancedMetrics.monthlyVolatility * Math.sqrt(12), // annualize
      sharpeRatio: advancedMetrics.sharpeRatio,
      sortinoRatio: advancedMetrics.sortinoRatio,
      maxDrawdown: advancedMetrics.maxDrawdown,
      bestYear: advancedMetrics.bestYear,
      worstYear: advancedMetrics.worstYear,
      beta: advancedMetrics.beta,
      alpha: advancedMetrics.alpha,
    };
  }, [advancedMetrics, initialCapital, portfolioValues]);

  // Trade-based metrics
  const closedTrades = useMemo(() => computeClosedTrades(trades), [trades]);
  const tradeMetrics = useMemo(() => {
    if (closedTrades.length === 0) return null;
    const wins = closedTrades.filter(t => t.pnl > 0);
    const losses = closedTrades.filter(t => t.pnl < 0);
    const totalPnl = closedTrades.reduce((s, t) => s + t.pnl, 0);
    const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? losses.reduce((s, t) => s + t.pnl, 0) / losses.length : 0;
    const grossProfit = wins.reduce((s, t) => s + t.pnl, 0);
    const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

    return {
      totalTrades: closedTrades.length,
      winRate: (wins.length / closedTrades.length) * 100,
      totalPnl,
      avgWin,
      avgLoss,
      profitFactor,
      bestTrade: closedTrades.reduce((best, t) => t.pnl > best.pnl ? t : best, closedTrades[0]),
      worstTrade: closedTrades.reduce((worst, t) => t.pnl < worst.pnl ? t : worst, closedTrades[0]),
    };
  }, [closedTrades]);

  // P&L distribution
  const distribution = useMemo(() => {
    if (closedTrades.length === 0) return [];
    const buckets = [
      { label: '< -10%', min: -Infinity, max: -10 },
      { label: '-10 to -5%', min: -10, max: -5 },
      { label: '-5 to 0%', min: -5, max: 0 },
      { label: '0 to 5%', min: 0, max: 5 },
      { label: '5 to 10%', min: 5, max: 10 },
      { label: '> 10%', min: 10, max: Infinity },
    ];
    return buckets.map(b => ({
      label: b.label,
      count: closedTrades.filter(t => t.pnlPct >= b.min && t.pnlPct < b.max).length,
      isPositive: b.min >= 0,
    }));
  }, [closedTrades]);

  const exportCSV = () => {
    const sorted = [...trades].sort((a, b) => new Date(b.executed_at).getTime() - new Date(a.executed_at).getTime());
    const header = 'Date,Ticker,Type,Action,Quantity,Price,Total Cost\n';
    const rows = sorted.map(t =>
      `${new Date(t.executed_at).toISOString()},${t.ticker},${t.instrument_type},${t.action},${t.quantity},${t.price_at_execution},${t.total_cost}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sim-trades-${portfolioId.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading analytics...
      </div>
    );
  }

  const hasSnapshotData = snapshots.length >= 2;

  return (
    <div className="space-y-4">
      {/* Export */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={exportCSV} disabled={trades.length === 0}>
          <Download className="w-4 h-4 mr-2" /> Export CSV
        </Button>
      </div>

      {/* Trade-based quick metrics */}
      {tradeMetrics && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Win Rate', value: `${tradeMetrics.winRate.toFixed(1)}%`, icon: Target, color: tradeMetrics.winRate >= 50 ? 'text-success' : 'text-destructive' },
            { label: 'Total P&L', value: `${tradeMetrics.totalPnl >= 0 ? '+' : ''}$${tradeMetrics.totalPnl.toFixed(2)}`, icon: TrendingUp, color: tradeMetrics.totalPnl >= 0 ? 'text-success' : 'text-destructive' },
            { label: 'Profit Factor', value: tradeMetrics.profitFactor === Infinity ? '∞' : tradeMetrics.profitFactor.toFixed(2), icon: BarChart3, color: tradeMetrics.profitFactor >= 1 ? 'text-success' : 'text-destructive' },
            { label: 'Sharpe Ratio', value: advancedMetrics ? advancedMetrics.sharpeRatio.toFixed(2) : '—', icon: Activity, color: (advancedMetrics?.sharpeRatio ?? 0) >= 1 ? 'text-success' : 'text-foreground' },
            { label: 'Max Drawdown', value: advancedMetrics ? `${advancedMetrics.maxDrawdown.toFixed(1)}%` : '—', icon: TrendingDown, color: 'text-destructive' },
            { label: 'Avg Win / Loss', value: `$${tradeMetrics.avgWin.toFixed(0)} / $${tradeMetrics.avgLoss.toFixed(0)}`, icon: Percent, color: 'text-foreground' },
          ].map(m => (
            <Card key={m.label}>
              <CardContent className="pt-3 pb-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <m.icon className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{m.label}</span>
                </div>
                <p className={`text-lg font-bold font-mono ${m.color}`}>{m.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!hasSnapshotData && (
        <Card>
          <CardContent className="py-8 text-center">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground">Not enough snapshot data for charts yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Portfolio value is recorded each time you visit. Come back over multiple sessions to build history.</p>
          </CardContent>
        </Card>
      )}

      {/* Full analytics tabs — mirrors Portfolio Builder */}
      {hasSnapshotData && (
        <Tabs value={analyticsTab} onValueChange={setAnalyticsTab}>
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="performance" className="text-xs">Performance</TabsTrigger>
            <TabsTrigger value="risk" className="text-xs">Risk Metrics</TabsTrigger>
            <TabsTrigger value="trades" className="text-xs">Trade Analysis</TabsTrigger>
            <TabsTrigger value="advanced" className="text-xs">Advanced</TabsTrigger>
          </TabsList>

          {/* Performance Tab — Growth Chart, Performance Summary, Drawdown, Annual Returns */}
          <TabsContent value="performance" className="space-y-6 mt-4">
            <PortfolioGrowthChart
              dates={dates}
              portfolioValues={portfolioValues}
              initialCapital={initialCapital}
            />

            <div className="grid gap-6 lg:grid-cols-2">
              {perfSummary && (
                <PerformanceSummaryTable {...perfSummary} />
              )}
              <DrawdownChart
                dates={dates}
                portfolioValues={portfolioValues}
              />
            </div>

            <AnnualReturnsChart
              dates={dates}
              portfolioReturns={dailyReturns}
            />
          </TabsContent>

          {/* Risk Metrics Tab */}
          <TabsContent value="risk" className="mt-4">
            {advancedMetrics ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'VaR (95%)', value: `${(advancedMetrics.var95 * 100).toFixed(2)}%`, desc: 'Max daily loss at 95% confidence' },
                    { label: 'CVaR (95%)', value: `${(advancedMetrics.cvar95 * 100).toFixed(2)}%`, desc: 'Expected loss beyond VaR' },
                    { label: 'Sortino', value: advancedMetrics.sortinoRatio.toFixed(2), desc: 'Return per unit downside risk' },
                    { label: 'Calmar', value: advancedMetrics.calmarRatio.toFixed(2), desc: 'Return / Max Drawdown' },
                    { label: 'Skewness', value: advancedMetrics.skewness.toFixed(2), desc: 'Return distribution asymmetry' },
                    { label: 'Kurtosis', value: advancedMetrics.kurtosis.toFixed(2), desc: 'Tail risk (fat tails)' },
                    { label: 'Ulcer Index', value: advancedMetrics.ulcerIndex.toFixed(2), desc: 'Drawdown pain measure' },
                    { label: 'Omega', value: advancedMetrics.omega.toFixed(2), desc: 'Gain/loss probability ratio' },
                  ].map(m => (
                    <Card key={m.label}>
                      <CardContent className="pt-3 pb-2">
                        <span className="text-[10px] text-muted-foreground">{m.label}</span>
                        <p className="text-lg font-bold font-mono">{m.value}</p>
                        <p className="text-[10px] text-muted-foreground">{m.desc}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              <Card><CardContent className="py-8 text-center text-muted-foreground">Insufficient data for risk metrics</CardContent></Card>
            )}
          </TabsContent>

          {/* Trade Analysis Tab */}
          <TabsContent value="trades" className="space-y-4 mt-4">
            {/* P&L Distribution */}
            {distribution.length > 0 && closedTrades.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">P&L Distribution (Closed Trades)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={distribution}>
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {distribution.map((entry, idx) => (
                          <Cell key={idx} fill={entry.isPositive ? 'hsl(var(--success))' : 'hsl(var(--destructive))'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Best/Worst Trades */}
            {tradeMetrics && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Card>
                  <CardContent className="pt-3 pb-2">
                    <p className="text-xs text-muted-foreground mb-1">Best Trade</p>
                    <p className="font-medium text-foreground">{tradeMetrics.bestTrade.ticker}</p>
                    <p className="text-sm text-success font-mono">+${tradeMetrics.bestTrade.pnl.toFixed(2)} ({tradeMetrics.bestTrade.pnlPct.toFixed(1)}%)</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-3 pb-2">
                    <p className="text-xs text-muted-foreground mb-1">Worst Trade</p>
                    <p className="font-medium text-foreground">{tradeMetrics.worstTrade.ticker}</p>
                    <p className="text-sm text-destructive font-mono">${tradeMetrics.worstTrade.pnl.toFixed(2)} ({tradeMetrics.worstTrade.pnlPct.toFixed(1)}%)</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {closedTrades.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Close some positions to see trade analysis
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Advanced Tab — Full AdvancedMetricsDashboard */}
          <TabsContent value="advanced" className="mt-4">
            {advancedMetrics ? (
              <AdvancedMetricsDashboard metrics={advancedMetrics} />
            ) : (
              <Card><CardContent className="py-8 text-center text-muted-foreground">Need more data points for advanced metrics</CardContent></Card>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
