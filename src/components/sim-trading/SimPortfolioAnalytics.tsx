/**
 * SimPortfolioAnalytics
 * Separated into two major sections:
 * 1. Portfolio Performance — historical snapshot-based (equity curve, drawdown, risk)
 * 2. Trade Performance — since positions were taken (closed P&L, win rate, distribution)
 */

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Loader2, Download, TrendingUp, TrendingDown, Target, Activity, BarChart3, Percent, AlertTriangle, LineChart as LineChartIcon, Briefcase } from 'lucide-react';
import { PortfolioGrowthChart } from '@/components/portfolio/PortfolioGrowthChart';
import { DrawdownChart } from '@/components/portfolio/DrawdownChart';
import { AnnualReturnsChart } from '@/components/portfolio/AnnualReturnsChart';
import { PerformanceSummaryTable } from '@/components/portfolio/PerformanceSummaryTable';
import { AdvancedMetricsDashboard } from '@/components/backtester/AdvancedMetricsDashboard';
import { calculateSimpleReturns } from '@/services/portfolioMetricsService';
import { calculateAllAdvancedMetrics, type AdvancedRiskMetrics } from '@/services/advancedMetricsService';
import { calculateMaxDrawdown } from '@/services/portfolioMetricsService';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line, CartesianGrid } from 'recharts';
import { format, parseISO, differenceInDays } from 'date-fns';
import type { SimTrade } from './SimPortfolioDetail';
import type { Position } from './SimPortfolioDetail';

interface Props {
  portfolioId: string;
  initialCapital: number;
  trades: SimTrade[];
  positions?: Position[];
  currentValue?: number;
  cashBalance?: number;
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
  holdingDays: number;
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
        const holdingDays = differenceInDays(new Date(t.executed_at), new Date(lot.date));
        closed.push({
          ticker: key,
          entryDate: lot.date,
          exitDate: t.executed_at,
          quantity: filled,
          entryPrice: lot.price,
          exitPrice: t.price_at_execution,
          pnl,
          pnlPct,
          holdingDays: Math.max(holdingDays, 0),
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

// ────────────────────────────────────────────────
// Sub-section: Historical Portfolio Performance
// ────────────────────────────────────────────────

function HistoricalPerformance({
  snapshots,
  initialCapital,
  advancedMetrics,
  dailyReturns,
  portfolioValues,
  dates,
  perfSummary,
}: {
  snapshots: { date: string; value: number }[];
  initialCapital: number;
  advancedMetrics: AdvancedRiskMetrics | null;
  dailyReturns: number[];
  portfolioValues: number[];
  dates: string[];
  perfSummary: any;
}) {
  const [histTab, setHistTab] = useState('growth');
  const hasData = snapshots.length >= 1;

  if (!hasData) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground">Not enough snapshot data for historical charts yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Portfolio value is recorded each visit. Come back over multiple sessions to build history.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs value={histTab} onValueChange={setHistTab}>
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="growth" className="text-xs">Growth & Drawdown</TabsTrigger>
          <TabsTrigger value="risk" className="text-xs">Risk Metrics</TabsTrigger>
          <TabsTrigger value="returns" className="text-xs">Returns</TabsTrigger>
          <TabsTrigger value="advanced" className="text-xs">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="growth" className="space-y-6 mt-4">
          <PortfolioGrowthChart dates={dates} portfolioValues={portfolioValues} initialCapital={initialCapital} />
          <div className="grid gap-6 lg:grid-cols-2">
            {perfSummary && <PerformanceSummaryTable {...perfSummary} />}
            <DrawdownChart dates={dates} portfolioValues={portfolioValues} />
          </div>
        </TabsContent>

        <TabsContent value="risk" className="mt-4">
          {advancedMetrics ? (
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
          ) : (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Insufficient data for risk metrics</CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="returns" className="mt-4">
          <AnnualReturnsChart dates={dates} portfolioReturns={dailyReturns} />
        </TabsContent>

        <TabsContent value="advanced" className="mt-4">
          {advancedMetrics ? (
            <AdvancedMetricsDashboard metrics={advancedMetrics} />
          ) : (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Need more data points for advanced metrics</CardContent></Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ────────────────────────────────────────────────
// Sub-section: Trade / Position Performance
// ────────────────────────────────────────────────

function TradePerformanceSection({
  trades,
  closedTrades,
  tradeMetrics,
  distribution,
  positions,
}: {
  trades: SimTrade[];
  closedTrades: ClosedTrade[];
  tradeMetrics: ReturnType<typeof computeTradeMetrics>;
  distribution: { label: string; count: number; isPositive: boolean }[];
  positions?: Position[];
}) {
  const [tradeTab, setTradeTab] = useState('overview');

  // Build cumulative P&L curve from closed trades
  const cumulativePnl = useMemo(() => {
    if (closedTrades.length === 0) return [];
    const sorted = [...closedTrades].sort((a, b) => new Date(a.exitDate).getTime() - new Date(b.exitDate).getTime());
    let running = 0;
    return sorted.map(t => {
      running += t.pnl;
      return { date: t.exitDate.split('T')[0], pnl: running, ticker: t.ticker };
    });
  }, [closedTrades]);

  // Open positions summary
  const openPositionsSummary = useMemo(() => {
    if (!positions || positions.length === 0) return null;
    const totalUnrealized = positions.reduce((s, p) => s + (p.pnl ?? 0), 0);
    const totalCost = positions.reduce((s, p) => s + p.total_cost, 0);
    const totalValue = positions.reduce((s, p) => s + (p.current_value ?? p.total_cost), 0);
    const winners = positions.filter(p => (p.pnl ?? 0) > 0).length;
    return { totalUnrealized, totalCost, totalValue, count: positions.length, winners };
  }, [positions]);

  return (
    <div className="space-y-4">
      {/* Quick stats row */}
      {tradeMetrics && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Closed Trades', value: `${tradeMetrics.totalTrades}`, icon: BarChart3, color: 'text-foreground' },
            { label: 'Win Rate', value: `${tradeMetrics.winRate.toFixed(1)}%`, icon: Target, color: tradeMetrics.winRate >= 50 ? 'text-success' : 'text-destructive' },
            { label: 'Total Realized', value: `${tradeMetrics.totalPnl >= 0 ? '+' : ''}$${tradeMetrics.totalPnl.toFixed(2)}`, icon: TrendingUp, color: tradeMetrics.totalPnl >= 0 ? 'text-success' : 'text-destructive' },
            { label: 'Profit Factor', value: tradeMetrics.profitFactor === Infinity ? '∞' : tradeMetrics.profitFactor.toFixed(2), icon: Activity, color: tradeMetrics.profitFactor >= 1 ? 'text-success' : 'text-destructive' },
            { label: 'Avg Win', value: `$${tradeMetrics.avgWin.toFixed(0)}`, icon: TrendingUp, color: 'text-success' },
            { label: 'Avg Loss', value: `$${Math.abs(tradeMetrics.avgLoss).toFixed(0)}`, icon: TrendingDown, color: 'text-destructive' },
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

      {/* Open positions summary */}
      {openPositionsSummary && (
        <Card className="border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Briefcase className="w-4 h-4" /> Open Positions ({openPositionsSummary.count})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Total Cost Basis</p>
                <p className="text-base font-bold font-mono">${openPositionsSummary.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Current Value</p>
                <p className="text-base font-bold font-mono">${openPositionsSummary.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Unrealized P&L</p>
                <p className={`text-base font-bold font-mono ${openPositionsSummary.totalUnrealized >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {openPositionsSummary.totalUnrealized >= 0 ? '+' : ''}${openPositionsSummary.totalUnrealized.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Winners / Total</p>
                <p className="text-base font-bold font-mono">{openPositionsSummary.winners} / {openPositionsSummary.count}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={tradeTab} onValueChange={setTradeTab}>
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="overview" className="text-xs">P&L Curve</TabsTrigger>
          <TabsTrigger value="distribution" className="text-xs">Distribution</TabsTrigger>
          <TabsTrigger value="details" className="text-xs">Closed Trades</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          {cumulativePnl.length > 0 ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Cumulative Realized P&L</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={cumulativePnl}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={v => { try { return format(parseISO(v), 'MM/dd'); } catch { return v; } }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${v >= 1000 ? `${(v/1000).toFixed(1)}k` : v.toFixed(0)}`} />
                    <Tooltip
                      formatter={(value: number) => [`$${value.toFixed(2)}`, 'Cumulative P&L']}
                      labelFormatter={v => { try { return format(parseISO(v as string), 'MMM d, yyyy'); } catch { return v as string; } }}
                    />
                    <Line
                      type="monotone"
                      dataKey="pnl"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ) : (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Close some positions to see the P&L curve</CardContent></Card>
          )}

          {/* Best / worst trades */}
          {tradeMetrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
              <Card>
                <CardContent className="pt-3 pb-2">
                  <p className="text-xs text-muted-foreground mb-1">Best Trade</p>
                  <p className="font-medium text-foreground">{tradeMetrics.bestTrade.ticker}</p>
                  <p className="text-sm text-success font-mono">+${tradeMetrics.bestTrade.pnl.toFixed(2)} ({tradeMetrics.bestTrade.pnlPct.toFixed(1)}%)</p>
                  <p className="text-[10px] text-muted-foreground">Held {tradeMetrics.bestTrade.holdingDays}d</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-3 pb-2">
                  <p className="text-xs text-muted-foreground mb-1">Worst Trade</p>
                  <p className="font-medium text-foreground">{tradeMetrics.worstTrade.ticker}</p>
                  <p className="text-sm text-destructive font-mono">${tradeMetrics.worstTrade.pnl.toFixed(2)} ({tradeMetrics.worstTrade.pnlPct.toFixed(1)}%)</p>
                  <p className="text-[10px] text-muted-foreground">Held {tradeMetrics.worstTrade.holdingDays}d</p>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="distribution" className="mt-4">
          {distribution.length > 0 && closedTrades.length > 0 ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">P&L Distribution (Closed Trades)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
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
          ) : (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No closed trades yet</CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="details" className="mt-4">
          {closedTrades.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-2 text-xs text-muted-foreground font-medium">Ticker</th>
                        <th className="text-left p-2 text-xs text-muted-foreground font-medium">Entry</th>
                        <th className="text-left p-2 text-xs text-muted-foreground font-medium">Exit</th>
                        <th className="text-right p-2 text-xs text-muted-foreground font-medium">Qty</th>
                        <th className="text-right p-2 text-xs text-muted-foreground font-medium">Entry $</th>
                        <th className="text-right p-2 text-xs text-muted-foreground font-medium">Exit $</th>
                        <th className="text-right p-2 text-xs text-muted-foreground font-medium">P&L</th>
                        <th className="text-right p-2 text-xs text-muted-foreground font-medium">%</th>
                        <th className="text-right p-2 text-xs text-muted-foreground font-medium">Days</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...closedTrades].reverse().map((t, i) => (
                        <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="p-2 font-mono font-bold">{t.ticker}</td>
                          <td className="p-2 text-xs">{format(new Date(t.entryDate), 'MM/dd/yy')}</td>
                          <td className="p-2 text-xs">{format(new Date(t.exitDate), 'MM/dd/yy')}</td>
                          <td className="p-2 text-right font-mono">{t.quantity}</td>
                          <td className="p-2 text-right font-mono">${t.entryPrice.toFixed(2)}</td>
                          <td className="p-2 text-right font-mono">${t.exitPrice.toFixed(2)}</td>
                          <td className={`p-2 text-right font-mono ${t.pnl >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(2)}
                          </td>
                          <td className={`p-2 text-right font-mono ${t.pnlPct >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {t.pnlPct >= 0 ? '+' : ''}{t.pnlPct.toFixed(1)}%
                          </td>
                          <td className="p-2 text-right text-muted-foreground">{t.holdingDays}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No closed trades yet</CardContent></Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper to compute trade metrics
function computeTradeMetrics(closedTrades: ClosedTrade[]) {
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
    avgHoldingDays: closedTrades.reduce((s, t) => s + t.holdingDays, 0) / closedTrades.length,
  };
}

// ────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────

export function SimPortfolioAnalytics({ portfolioId, initialCapital, trades, positions, currentValue, cashBalance }: Props) {
  const [snapshots, setSnapshots] = useState<{ date: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState('trades');

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

  const dates = useMemo(() => snapshots.map(s => s.date), [snapshots]);
  const portfolioValues = useMemo(() => snapshots.map(s => s.value), [snapshots]);
  const dailyReturns = useMemo(() => calculateSimpleReturns(portfolioValues), [portfolioValues]);

  const advancedMetrics: AdvancedRiskMetrics | null = useMemo(() => {
    if (dailyReturns.length < 2 || portfolioValues.length < 2) return null;
    const ddResult = calculateMaxDrawdown(portfolioValues);
    const maxDD = ddResult.maxDrawdownPercent;
    const years = dailyReturns.length / 252;
    const startVal = portfolioValues[0];
    const endVal = portfolioValues[portfolioValues.length - 1];
    const annualizedReturn = years > 0 ? (Math.pow(endVal / startVal, 1 / years) - 1) * 100 : 0;
    return calculateAllAdvancedMetrics(dailyReturns, portfolioValues, new Map(), annualizedReturn, maxDD, 1, undefined);
  }, [dailyReturns, portfolioValues]);

  const perfSummary = useMemo(() => {
    if (!advancedMetrics) return null;
    return {
      startBalance: initialCapital,
      endBalance: portfolioValues[portfolioValues.length - 1] ?? initialCapital,
      cagr: advancedMetrics.cagr,
      volatility: advancedMetrics.monthlyVolatility * Math.sqrt(12),
      sharpeRatio: advancedMetrics.sharpeRatio,
      sortinoRatio: advancedMetrics.sortinoRatio,
      maxDrawdown: advancedMetrics.maxDrawdown,
      bestYear: advancedMetrics.bestYear,
      worstYear: advancedMetrics.worstYear,
      beta: advancedMetrics.beta,
      alpha: advancedMetrics.alpha,
    };
  }, [advancedMetrics, initialCapital, portfolioValues]);

  const closedTrades = useMemo(() => computeClosedTrades(trades), [trades]);
  const tradeMetrics = useMemo(() => computeTradeMetrics(closedTrades), [closedTrades]);

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

  return (
    <div className="space-y-4">
      {/* Export & section toggle */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={section === 'trades' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSection('trades')}
          >
            <Briefcase className="w-4 h-4 mr-2" /> Since Positions Taken
          </Button>
          <Button
            variant={section === 'historical' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSection('historical')}
          >
            <LineChartIcon className="w-4 h-4 mr-2" /> Historical Performance
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV} disabled={trades.length === 0}>
          <Download className="w-4 h-4 mr-2" /> Export CSV
        </Button>
      </div>

      {section === 'trades' ? (
        <TradePerformanceSection
          trades={trades}
          closedTrades={closedTrades}
          tradeMetrics={tradeMetrics}
          distribution={distribution}
          positions={positions}
        />
      ) : (
        <HistoricalPerformance
          snapshots={snapshots}
          initialCapital={initialCapital}
          advancedMetrics={advancedMetrics}
          dailyReturns={dailyReturns}
          portfolioValues={portfolioValues}
          dates={dates}
          perfSummary={perfSummary}
        />
      )}
    </div>
  );
}
