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
import { calculateSimpleReturns, calculateMaxDrawdown, calculateCAGR, annualizedVolatility, calculateSharpeRatio, calculateSortinoRatio, calculateVaR, calculateCVaR, calculateBetaAlpha } from '@/services/portfolioMetricsService';
import { calculateAllAdvancedMetrics, type AdvancedRiskMetrics } from '@/services/advancedMetricsService';
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
// Sub-section: Historical Backtested Performance
// Uses market_daily_bars to backtest current holdings over selected timeframe
// ────────────────────────────────────────────────

const TIMEFRAMES = [
  { label: '1M', months: 1 },
  { label: '3M', months: 3 },
  { label: '6M', months: 6 },
  { label: '1Y', months: 12 },
  { label: '3Y', months: 36 },
  { label: '5Y', months: 60 },
];

interface BacktestResult {
  dates: string[];
  portfolioValues: number[];
  benchmarkValues: number[];
  dailyReturns: number[];
  benchmarkReturns: number[];
  drawdownSeries: number[];
  metrics: {
    totalReturn: number;
    cagr: number;
    volatility: number;
    sharpeRatio: number;
    sortinoRatio: number;
    maxDrawdown: number;
    beta: number;
    alpha: number;
    var95: number;
    cvar95: number;
    calmarRatio: number;
    bestYear: number;
    worstYear: number;
  };
  yearlyReturns: { year: number; return: number; benchmark: number }[];
}

function HistoricalPerformance({
  positions,
  initialCapital,
}: {
  positions: Position[];
  initialCapital: number;
}) {
  const [histTab, setHistTab] = useState('growth');
  const [timeframe, setTimeframe] = useState(12); // months
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get stock tickers with weights based on cost basis
  const holdingsInfo = useMemo(() => {
    const stockPositions = positions.filter(p => p.instrument_type === 'stock' && p.ticker);
    if (stockPositions.length === 0) return null;

    const totalCost = stockPositions.reduce((s, p) => s + p.total_cost, 0);
    if (totalCost <= 0) return null;

    return stockPositions.map(p => ({
      ticker: p.ticker.toUpperCase(),
      weight: p.total_cost / totalCost, // weight by cost basis
    }));
  }, [positions]);

  // Run backtest when timeframe or holdings change
  useEffect(() => {
    if (!holdingsInfo || holdingsInfo.length === 0) {
      setResult(null);
      return;
    }

    const runBacktest = async () => {
      setLoading(true);
      setError(null);

      try {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - timeframe);
        const startStr = startDate.toISOString().split('T')[0];
        const endStr = endDate.toISOString().split('T')[0];

        const tickers = holdingsInfo.map(h => h.ticker);
        const uniqueTickers = [...new Set([...tickers, 'SPY'])]; // include benchmark

        // Fetch all ticker data in one query
        const { data: bars, error: dbError } = await supabase
          .from('market_daily_bars')
          .select('ticker, bar_date, close, daily_return')
          .in('ticker', uniqueTickers)
          .gte('bar_date', startStr)
          .lte('bar_date', endStr)
          .order('bar_date', { ascending: true });

        if (dbError) throw dbError;
        if (!bars || bars.length === 0) {
          setError('No historical data found for these tickers');
          setLoading(false);
          return;
        }

        // Index by ticker then date
        const indexed: Record<string, Record<string, { close: number; return: number }>> = {};
        for (const bar of bars) {
          if (!indexed[bar.ticker]) indexed[bar.ticker] = {};
          indexed[bar.ticker][bar.bar_date] = { close: bar.close || 0, return: bar.daily_return || 0 };
        }

        // Find common dates across all holdings
        const holdingDateSets = tickers.map(t => new Set(Object.keys(indexed[t] || {})));
        const benchmarkDates = new Set(Object.keys(indexed['SPY'] || {}));
        const allSets = [...holdingDateSets, benchmarkDates];

        if (allSets.length === 0 || allSets[0].size === 0) {
          setError('Insufficient data coverage for backtest');
          setLoading(false);
          return;
        }

        const commonDates = [...allSets[0]].filter(d => allSets.every(s => s.has(d))).sort();

        if (commonDates.length < 10) {
          setError(`Only ${commonDates.length} common trading days found. Need at least 10.`);
          setLoading(false);
          return;
        }

        // Build portfolio & benchmark value series
        const portfolioValues: number[] = [initialCapital];
        const benchmarkValues: number[] = [initialCapital];
        const dailyReturns: number[] = [];
        const benchmarkReturns: number[] = [];
        const dates: string[] = [commonDates[0]];

        for (let i = 1; i < commonDates.length; i++) {
          const date = commonDates[i];

          // Weighted portfolio return
          let portReturn = 0;
          for (const h of holdingsInfo) {
            const r = indexed[h.ticker]?.[date]?.return || 0;
            portReturn += r * h.weight;
          }
          dailyReturns.push(portReturn);
          portfolioValues.push(portfolioValues[portfolioValues.length - 1] * (1 + portReturn));

          // Benchmark
          const bmReturn = indexed['SPY']?.[date]?.return || 0;
          benchmarkReturns.push(bmReturn);
          benchmarkValues.push(benchmarkValues[benchmarkValues.length - 1] * (1 + bmReturn));

          dates.push(date);
        }

        // Calculate metrics using existing service functions
        const years = commonDates.length / 252;
        const totalReturn = ((portfolioValues[portfolioValues.length - 1] - initialCapital) / initialCapital) * 100;
        const cagr = calculateCAGR(initialCapital, portfolioValues[portfolioValues.length - 1], years) * 100;
        const volatility = annualizedVolatility(dailyReturns) * 100;
        const sharpe = calculateSharpeRatio(dailyReturns, 0.05);
        const sortino = calculateSortinoRatio(dailyReturns, 0.05);
        const { maxDrawdownPercent, drawdownSeries } = calculateMaxDrawdown(portfolioValues);
        const var95 = calculateVaR(dailyReturns, 0.95);
        const cvar95 = calculateCVaR(dailyReturns, 0.95);
        const { beta, alpha } = calculateBetaAlpha(dailyReturns, benchmarkReturns, 0.05);
        const calmarRatio = maxDrawdownPercent > 0 ? cagr / maxDrawdownPercent : 0;

        // Yearly returns
        const yearMap: Record<number, { portfolio: number[]; benchmark: number[] }> = {};
        for (let i = 1; i < dates.length; i++) {
          const year = new Date(dates[i]).getFullYear();
          if (!yearMap[year]) yearMap[year] = { portfolio: [], benchmark: [] };
          yearMap[year].portfolio.push(dailyReturns[i - 1]);
          yearMap[year].benchmark.push(benchmarkReturns[i - 1]);
        }
        const yearlyReturns = Object.entries(yearMap).map(([year, data]) => ({
          year: parseInt(year),
          return: (data.portfolio.reduce((acc, r) => acc * (1 + r), 1) - 1) * 100,
          benchmark: (data.benchmark.reduce((acc, r) => acc * (1 + r), 1) - 1) * 100,
        }));

        const allYearlyReturns = yearlyReturns.map(y => y.return);

        setResult({
          dates,
          portfolioValues,
          benchmarkValues,
          dailyReturns,
          benchmarkReturns,
          drawdownSeries,
          metrics: {
            totalReturn,
            cagr,
            volatility,
            sharpeRatio: sharpe,
            sortinoRatio: sortino,
            maxDrawdown: maxDrawdownPercent,
            beta,
            alpha: alpha * 100,
            var95,
            cvar95,
            calmarRatio,
            bestYear: allYearlyReturns.length > 0 ? Math.max(...allYearlyReturns) : 0,
            worstYear: allYearlyReturns.length > 0 ? Math.min(...allYearlyReturns) : 0,
          },
          yearlyReturns,
        });
      } catch (e: any) {
        console.error('Historical backtest error:', e);
        setError(e.message || 'Failed to run historical analysis');
      }
      setLoading(false);
    };

    runBacktest();
  }, [holdingsInfo, timeframe, initialCapital]);

  if (!holdingsInfo || holdingsInfo.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground">No stock positions to analyze historically.</p>
          <p className="text-xs text-muted-foreground mt-1">Buy some stocks first, then view their historical backtested performance here.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Timeframe selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Timeframe:</span>
        <div className="flex gap-1">
          {TIMEFRAMES.map(tf => (
            <Button
              key={tf.months}
              variant={timeframe === tf.months ? 'default' : 'outline'}
              size="sm"
              className="h-7 px-3 text-xs"
              onClick={() => setTimeframe(tf.months)}
            >
              {tf.label}
            </Button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground ml-2">
          Holdings: {holdingsInfo.map(h => h.ticker).join(', ')}
        </span>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Running historical analysis...
        </div>
      )}

      {error && (
        <Card>
          <CardContent className="py-8 text-center">
            <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-destructive" />
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      )}

      {!loading && result && (
        <>
          {/* Key metrics row */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
            {[
              { label: 'Total Return', value: `${result.metrics.totalReturn >= 0 ? '+' : ''}${result.metrics.totalReturn.toFixed(1)}%`, color: result.metrics.totalReturn >= 0 ? 'text-success' : 'text-destructive' },
              { label: 'CAGR', value: `${result.metrics.cagr.toFixed(1)}%`, color: result.metrics.cagr >= 0 ? 'text-success' : 'text-destructive' },
              { label: 'Volatility', value: `${result.metrics.volatility.toFixed(1)}%`, color: 'text-foreground' },
              { label: 'Sharpe', value: result.metrics.sharpeRatio.toFixed(2), color: result.metrics.sharpeRatio >= 1 ? 'text-success' : 'text-foreground' },
              { label: 'Sortino', value: result.metrics.sortinoRatio.toFixed(2), color: result.metrics.sortinoRatio >= 1 ? 'text-success' : 'text-foreground' },
              { label: 'Max DD', value: `${result.metrics.maxDrawdown.toFixed(1)}%`, color: 'text-destructive' },
              { label: 'Beta', value: result.metrics.beta.toFixed(2), color: 'text-foreground' },
              { label: 'Alpha', value: `${result.metrics.alpha >= 0 ? '+' : ''}${result.metrics.alpha.toFixed(1)}%`, color: result.metrics.alpha >= 0 ? 'text-success' : 'text-destructive' },
            ].map(m => (
              <Card key={m.label}>
                <CardContent className="pt-2 pb-1.5 px-2">
                  <span className="text-[10px] text-muted-foreground">{m.label}</span>
                  <p className={`text-sm font-bold font-mono ${m.color}`}>{m.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Tabs value={histTab} onValueChange={setHistTab}>
            <TabsList className="w-full grid grid-cols-4">
              <TabsTrigger value="growth" className="text-xs">Growth vs SPY</TabsTrigger>
              <TabsTrigger value="drawdown" className="text-xs">Drawdown</TabsTrigger>
              <TabsTrigger value="risk" className="text-xs">Risk Metrics</TabsTrigger>
              <TabsTrigger value="returns" className="text-xs">Annual Returns</TabsTrigger>
            </TabsList>

            <TabsContent value="growth" className="mt-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Growth of ${(initialCapital / 1000).toFixed(0)}k — Portfolio vs SPY</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={result.dates.map((d, i) => ({ date: d, portfolio: result.portfolioValues[i], benchmark: result.benchmarkValues[i] }))}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={v => { try { return format(parseISO(v), 'MM/yy'); } catch { return v; } }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v.toFixed(0)}`} />
                      <Tooltip
                        formatter={(value: number, name: string) => [`$${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, name === 'portfolio' ? 'Portfolio' : 'SPY']}
                        labelFormatter={v => { try { return format(parseISO(v as string), 'MMM d, yyyy'); } catch { return v as string; } }}
                      />
                      <Line type="monotone" dataKey="portfolio" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="portfolio" />
                      <Line type="monotone" dataKey="benchmark" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} strokeDasharray="4 2" dot={false} name="benchmark" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="drawdown" className="mt-4">
              <DrawdownChart dates={result.dates} portfolioValues={result.portfolioValues} />
            </TabsContent>

            <TabsContent value="risk" className="mt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'VaR (95%)', value: `${(result.metrics.var95 * 100).toFixed(2)}%`, desc: 'Max daily loss at 95% confidence' },
                  { label: 'CVaR (95%)', value: `${(result.metrics.cvar95 * 100).toFixed(2)}%`, desc: 'Expected loss beyond VaR' },
                  { label: 'Calmar', value: result.metrics.calmarRatio.toFixed(2), desc: 'Return / Max Drawdown' },
                  { label: 'Best Year', value: `${result.metrics.bestYear.toFixed(1)}%`, desc: 'Best annual return' },
                  { label: 'Worst Year', value: `${result.metrics.worstYear.toFixed(1)}%`, desc: 'Worst annual return' },
                  { label: 'Max Drawdown', value: `${result.metrics.maxDrawdown.toFixed(1)}%`, desc: 'Largest peak-to-trough decline' },
                  { label: 'Beta (SPY)', value: result.metrics.beta.toFixed(2), desc: 'Systematic risk vs market' },
                  { label: 'Alpha', value: `${result.metrics.alpha.toFixed(2)}%`, desc: 'Excess return vs benchmark' },
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
            </TabsContent>

            <TabsContent value="returns" className="mt-4">
              {result.yearlyReturns.length > 0 ? (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Annual Returns — Portfolio vs SPY</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={result.yearlyReturns}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                        <YAxis tickFormatter={v => `${v.toFixed(0)}%`} tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(v: number) => [`${v.toFixed(2)}%`]} />
                        <Bar dataKey="return" name="Portfolio" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="benchmark" name="SPY" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              ) : (
                <Card><CardContent className="py-8 text-center text-muted-foreground">Need at least 1 year of data for annual returns</CardContent></Card>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
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
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState('trades');

  useEffect(() => {
    // Just set loading false — historical data is now fetched inside HistoricalPerformance
    setLoading(false);
  }, [portfolioId]);

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
          positions={positions || []}
          initialCapital={initialCapital}
        />
      )}
    </div>
  );
}
