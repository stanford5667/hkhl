import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EquityCurve } from './EquityCurve';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Download, TrendingUp, TrendingDown, Target, Activity, BarChart3, Percent } from 'lucide-react';
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
  // Process chronologically
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

export function PerformanceAnalytics({ portfolioId, initialCapital, trades }: Props) {
  const closedTrades = useMemo(() => computeClosedTrades(trades), [trades]);

  const metrics = useMemo(() => {
    if (closedTrades.length === 0) return null;
    const wins = closedTrades.filter(t => t.pnl > 0);
    const losses = closedTrades.filter(t => t.pnl < 0);
    const totalPnl = closedTrades.reduce((s, t) => s + t.pnl, 0);
    const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? losses.reduce((s, t) => s + t.pnl, 0) / losses.length : 0;
    const grossProfit = wins.reduce((s, t) => s + t.pnl, 0);
    const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

    // Max drawdown from cumulative P&L
    let peak = 0;
    let maxDD = 0;
    let cumPnl = 0;
    for (const t of closedTrades) {
      cumPnl += t.pnl;
      if (cumPnl > peak) peak = cumPnl;
      const dd = peak - cumPnl;
      if (dd > maxDD) maxDD = dd;
    }

    // Simple Sharpe approximation (annualized, using daily returns proxy)
    const returns = closedTrades.map(t => t.pnlPct / 100);
    const avgReturn = returns.reduce((s, r) => s + r, 0) / returns.length;
    const stdDev = Math.sqrt(returns.reduce((s, r) => s + Math.pow(r - avgReturn, 2), 0) / returns.length);
    const sharpe = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;

    return {
      totalTrades: closedTrades.length,
      winRate: (wins.length / closedTrades.length) * 100,
      totalPnl,
      avgWin,
      avgLoss,
      maxDrawdown: maxDD,
      maxDrawdownPct: initialCapital > 0 ? (maxDD / initialCapital) * 100 : 0,
      sharpe,
      profitFactor,
      bestTrade: closedTrades.reduce((best, t) => t.pnl > best.pnl ? t : best, closedTrades[0]),
      worstTrade: closedTrades.reduce((worst, t) => t.pnl < worst.pnl ? t : worst, closedTrades[0]),
    };
  }, [closedTrades, initialCapital]);

  // P&L distribution buckets
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
    const sortedTrades = [...trades].sort((a, b) => new Date(b.executed_at).getTime() - new Date(a.executed_at).getTime());
    const header = 'Date,Ticker,Type,Action,Quantity,Price,Total Cost\n';
    const rows = sortedTrades.map(t =>
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

  const metricCards = metrics ? [
    { label: 'Win Rate', value: `${metrics.winRate.toFixed(1)}%`, icon: Target, color: metrics.winRate >= 50 ? 'text-success' : 'text-destructive' },
    { label: 'Total P&L', value: `${metrics.totalPnl >= 0 ? '+' : ''}$${metrics.totalPnl.toFixed(2)}`, icon: TrendingUp, color: metrics.totalPnl >= 0 ? 'text-success' : 'text-destructive' },
    { label: 'Profit Factor', value: metrics.profitFactor === Infinity ? '∞' : metrics.profitFactor.toFixed(2), icon: BarChart3, color: metrics.profitFactor >= 1 ? 'text-success' : 'text-destructive' },
    { label: 'Sharpe Ratio', value: metrics.sharpe.toFixed(2), icon: Activity, color: metrics.sharpe >= 1 ? 'text-success' : metrics.sharpe >= 0 ? 'text-foreground' : 'text-destructive' },
    { label: 'Max Drawdown', value: `${metrics.maxDrawdownPct.toFixed(1)}%`, icon: TrendingDown, color: 'text-destructive' },
    { label: 'Avg Win / Loss', value: `$${metrics.avgWin.toFixed(0)} / $${metrics.avgLoss.toFixed(0)}`, icon: Percent, color: 'text-foreground' },
  ] : [];

  return (
    <div className="space-y-4">
      {/* Export */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={exportCSV} disabled={trades.length === 0}>
          <Download className="w-4 h-4 mr-2" /> Export CSV
        </Button>
      </div>

      {/* Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {metricCards.map(m => (
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

      {/* Equity Curve */}
      <EquityCurve portfolioId={portfolioId} initialCapital={initialCapital} />

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
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card>
            <CardContent className="pt-3 pb-2">
              <p className="text-xs text-muted-foreground mb-1">Best Trade</p>
              <p className="font-medium text-foreground">{metrics.bestTrade.ticker}</p>
              <p className="text-sm text-success font-mono">+${metrics.bestTrade.pnl.toFixed(2)} ({metrics.bestTrade.pnlPct.toFixed(1)}%)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-3 pb-2">
              <p className="text-xs text-muted-foreground mb-1">Worst Trade</p>
              <p className="font-medium text-foreground">{metrics.worstTrade.ticker}</p>
              <p className="text-sm text-destructive font-mono">${metrics.worstTrade.pnl.toFixed(2)} ({metrics.worstTrade.pnlPct.toFixed(1)}%)</p>
            </CardContent>
          </Card>
        </div>
      )}

      {closedTrades.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Close some positions to see performance analytics</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
