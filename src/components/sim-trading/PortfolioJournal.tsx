import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { PortfolioGoalsSetup } from './PortfolioGoalsSetup';
import type { SimTrade } from './SimPortfolioDetail';
import type { Position } from './SimPortfolioDetail';
import {
  BookOpen, RefreshCw, TrendingUp, TrendingDown, AlertTriangle,
  CheckCircle, BarChart3, Clock, ArrowUpDown
} from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';

interface Props {
  portfolioId: string;
  initialCapital: number;
  currentValue: number;
  cashBalance: number;
  trades: SimTrade[];
  positions: Position[];
  backtestResults?: any;
  strategyName?: string | null;
}

interface JournalEntry {
  id: string;
  entry_type: string;
  category: string;
  title: string;
  content: string;
  metrics: Record<string, any>;
  benchmark_comparison: Record<string, any>;
  created_at: string;
}

interface Goals {
  goal_type: string;
  target_annual_return_pct: number;
  max_drawdown_pct: number;
  benchmark_ticker: string;
  risk_budget_pct: number;
}

const CATEGORY_CONFIG: Record<string, { icon: typeof TrendingUp; color: string }> = {
  performance: { icon: BarChart3, color: 'text-blue-400' },
  drawdown: { icon: AlertTriangle, color: 'text-amber-400' },
  milestone: { icon: CheckCircle, color: 'text-emerald-400' },
  rebalance: { icon: ArrowUpDown, color: 'text-purple-400' },
  risk: { icon: AlertTriangle, color: 'text-red-400' },
  benchmark: { icon: TrendingUp, color: 'text-cyan-400' },
  asset: { icon: BarChart3, color: 'text-indigo-400' },
  backtest_delta: { icon: ArrowUpDown, color: 'text-orange-400' },
};

export function PortfolioJournal({ portfolioId, initialCapital, currentValue, cashBalance, trades, positions, backtestResults, strategyName }: Props) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [goals, setGoals] = useState<Goals | null>(null);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [journalRes, goalsRes] = await Promise.all([
      supabase
        .from('sim_portfolio_journal')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('sim_portfolio_goals')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .maybeSingle(),
    ]);
    if (journalRes.data) setEntries(journalRes.data as JournalEntry[]);
    if (goalsRes.data) setGoals(goalsRes.data as Goals);
    setLoading(false);
  }, [portfolioId, user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const generateJournalEntry = async () => {
    if (!user || !goals) {
      toast.error('Set your goals first before generating a journal entry');
      return;
    }
    setGenerating(true);

    try {
      // Calculate portfolio metrics
      const totalReturn = ((currentValue - initialCapital) / initialCapital) * 100;
      const daysActive = trades.length > 0
        ? differenceInDays(new Date(), parseISO(trades[trades.length - 1]?.executed_at || new Date().toISOString()))
        : 0;
      const annualizedReturn = daysActive > 30
        ? (Math.pow(currentValue / initialCapital, 365 / Math.max(daysActive, 1)) - 1) * 100
        : totalReturn;

      // Calculate drawdown from trade history
      let peak = initialCapital;
      let maxDrawdown = 0;
      let runningValue = initialCapital;
      const sortedTrades = [...trades].sort((a, b) =>
        new Date(a.executed_at).getTime() - new Date(b.executed_at).getTime()
      );
      for (const t of sortedTrades) {
        if (t.action === 'sell') runningValue += t.total_cost;
        else runningValue -= t.total_cost;
        if (runningValue > peak) peak = runningValue;
        const dd = ((peak - runningValue) / peak) * 100;
        if (dd > maxDrawdown) maxDrawdown = dd;
      }

      // Win rate
      const closedTrades = sortedTrades.filter(t => t.action === 'sell');
      const winCount = closedTrades.filter(t => {
        const buyTrade = sortedTrades.find(
          bt => bt.ticker === t.ticker && bt.action === 'buy' && new Date(bt.executed_at) < new Date(t.executed_at)
        );
        return buyTrade ? t.price_at_execution > buyTrade.price_at_execution : false;
      }).length;
      const winRate = closedTrades.length > 0 ? (winCount / closedTrades.length) * 100 : 0;

      // Position concentration
      const posValues = positions.map(p => ({
        ticker: p.ticker,
        value: p.current_value || 0,
        pct: ((p.current_value || 0) / currentValue) * 100,
      }));
      const topPosition = posValues.sort((a, b) => b.pct - a.pct)[0];
      const cashPct = (cashBalance / currentValue) * 100;

      // Determine category & generate content
      const journalEntries: { category: string; title: string; content: string }[] = [];

      // 1. Performance vs goal
      const onTrack = annualizedReturn >= goals.target_annual_return_pct;
      journalEntries.push({
        category: 'performance',
        title: onTrack ? 'On Track — Return Target' : 'Below Target Return',
        content: `Portfolio return: ${totalReturn.toFixed(2)}% total (${annualizedReturn.toFixed(2)}% annualized). ` +
          `Your target is ${goals.target_annual_return_pct}% annually. ` +
          (onTrack
            ? `Exceeding target by ${(annualizedReturn - goals.target_annual_return_pct).toFixed(1)}pp.`
            : `Gap of ${(goals.target_annual_return_pct - annualizedReturn).toFixed(1)}pp to close.`) +
          ` Win rate: ${winRate.toFixed(0)}% (${winCount}/${closedTrades.length}).`,
      });

      // 2. Per-asset breakdown — every position gets a note
      const sortedPositions = [...posValues].sort((a, b) => b.pct - a.pct);
      if (sortedPositions.length > 0) {
        const assetLines = sortedPositions.map(p => {
          const pos = positions.find(pos => pos.ticker === p.ticker);
          const pnlStr = pos?.pnl !== null && pos?.pnl !== undefined
            ? `${pos.pnl >= 0 ? '+' : ''}$${pos.pnl.toFixed(2)} (${pos.pnl_pct?.toFixed(1)}%)`
            : 'N/A';
          const typeLabel = pos?.instrument_type === 'option'
            ? ` [${pos.option_type?.toUpperCase()} $${pos.strike_price} exp ${pos.expiration_date}]`
            : '';
          return `• ${p.ticker}${typeLabel}: ${p.pct.toFixed(1)}% of portfolio, P&L ${pnlStr}, avg cost $${pos?.avg_cost?.toFixed(2) || '?'}`;
        });

        // Flag concentration
        const concentrated = sortedPositions.filter(p => p.pct > 20);
        const concNote = concentrated.length > 0
          ? ` ⚠ ${concentrated.map(c => c.ticker).join(', ')} exceed${concentrated.length === 1 ? 's' : ''} 20% concentration (institutional guideline: 5-10% max per position).`
          : ' Position sizing within institutional norms.';

        journalEntries.push({
          category: 'asset',
          title: `Holdings Review — ${positions.length} Position${positions.length !== 1 ? 's' : ''}`,
          content: assetLines.join('\n') + '\n' + concNote,
        });
      }

      // 3. Sector/asset-class diversification
      const assetTypes = positions.reduce((acc, p) => {
        const type = p.instrument_type === 'option' ? 'Options' : 'Equities';
        acc[type] = (acc[type] || 0) + (p.current_value || 0);
        return acc;
      }, {} as Record<string, number>);
      const typeLines = Object.entries(assetTypes).map(([type, val]) =>
        `${type}: $${val.toFixed(0)} (${((val / currentValue) * 100).toFixed(1)}%)`
      ).join(', ');
      if (Object.keys(assetTypes).length > 0) {
        journalEntries.push({
          category: 'asset',
          title: 'Asset Class Allocation',
          content: `${typeLines}. Cash: $${cashBalance.toFixed(0)} (${cashPct.toFixed(1)}%). ` +
            `Risk budget usage: ${((1 - cashPct / 100) * 100).toFixed(0)}% of ${goals.risk_budget_pct}% allowed.`,
        });
      }

      // 4. Backtest vs Actual delta (if backtest results exist)
      if (backtestResults) {
        const bt = backtestResults;
        const btReturn = bt.totalReturn ?? bt.total_return ?? bt.cagr ?? null;
        const btMaxDD = bt.maxDrawdown ?? bt.max_drawdown ?? null;
        const btSharpe = bt.sharpeRatio ?? bt.sharpe_ratio ?? bt.sharpe ?? null;
        const btWinRate = bt.winRate ?? bt.win_rate ?? null;

        const deltas: string[] = [];
        if (btReturn !== null) {
          const diff = totalReturn - btReturn;
          deltas.push(`Return: actual ${totalReturn.toFixed(1)}% vs backtest ${btReturn.toFixed(1)}% (${diff >= 0 ? '+' : ''}${diff.toFixed(1)}pp)`);
        }
        if (btMaxDD !== null) {
          const ddDiff = maxDrawdown - Math.abs(btMaxDD);
          deltas.push(`Max DD: actual -${maxDrawdown.toFixed(1)}% vs backtest -${Math.abs(btMaxDD).toFixed(1)}% (${ddDiff > 0 ? 'worse' : 'better'} by ${Math.abs(ddDiff).toFixed(1)}pp)`);
        }
        if (btWinRate !== null) {
          const wrDiff = winRate - btWinRate;
          deltas.push(`Win Rate: actual ${winRate.toFixed(0)}% vs backtest ${btWinRate.toFixed(0)}% (${wrDiff >= 0 ? '+' : ''}${wrDiff.toFixed(0)}pp)`);
        }
        if (btSharpe !== null) {
          deltas.push(`Backtest Sharpe: ${btSharpe.toFixed(2)}`);
        }

        if (deltas.length > 0) {
          const stratLabel = strategyName ? ` (${strategyName})` : '';
          journalEntries.push({
            category: 'backtest_delta',
            title: `Backtest vs Actual${stratLabel}`,
            content: deltas.join('. ') + '. ' +
              (btReturn !== null && totalReturn < btReturn
                ? 'Actual performance is lagging the backtest — common causes: execution timing, slippage, regime change.'
                : 'Actual performance is meeting or exceeding backtest expectations.'),
          });
        }
      }

      // 5. Drawdown check
      if (maxDrawdown > goals.max_drawdown_pct) {
        journalEntries.push({
          category: 'drawdown',
          title: `⚠️ Drawdown Exceeded — ${maxDrawdown.toFixed(1)}%`,
          content: `Peak drawdown of ${maxDrawdown.toFixed(1)}% has breached your ${goals.max_drawdown_pct}% constraint. ` +
            `Review position sizing and consider reducing exposure. Cash: ${cashPct.toFixed(1)}%.`,
        });
      } else if (maxDrawdown > goals.max_drawdown_pct * 0.75) {
        journalEntries.push({
          category: 'risk',
          title: `Drawdown Approaching Limit — ${maxDrawdown.toFixed(1)}%`,
          content: `Drawdown at ${maxDrawdown.toFixed(1)}% is within 25% of your ${goals.max_drawdown_pct}% limit. ` +
            `Remaining budget: ${(goals.max_drawdown_pct - maxDrawdown).toFixed(1)}%.`,
        });
      }

      // 6. Milestones
      if (totalReturn > 0 && Math.floor(totalReturn / 5) > 0) {
        const milestone = Math.floor(totalReturn / 5) * 5;
        journalEntries.push({
          category: 'milestone',
          title: `Milestone: +${milestone}% Return`,
          content: `Crossed ${milestone}% return. Active days: ${daysActive}. Positions: ${positions.length}. Cash: ${cashPct.toFixed(1)}%.`,
        });
      }

      const metrics = {
        totalReturn: parseFloat(totalReturn.toFixed(2)),
        annualizedReturn: parseFloat(annualizedReturn.toFixed(2)),
        maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
        winRate: parseFloat(winRate.toFixed(1)),
        positionCount: positions.length,
        cashPct: parseFloat(cashPct.toFixed(1)),
        daysActive,
        topHolding: topPosition?.ticker || 'N/A',
        topHoldingPct: topPosition ? parseFloat(topPosition.pct.toFixed(1)) : 0,
        holdings: sortedPositions.map(p => ({ ticker: p.ticker, pct: parseFloat(p.pct.toFixed(1)), value: parseFloat(p.value.toFixed(2)) })),
      };

      const benchmarkComparison = {
        benchmark: goals.benchmark_ticker,
        note: `Compare your ${annualizedReturn.toFixed(1)}% annualized return against ${goals.benchmark_ticker} over the same period.`,
      };

      const allInserts = journalEntries.map(e => ({
        portfolio_id: portfolioId,
        user_id: user.id,
        entry_type: 'auto',
        category: e.category,
        title: e.title,
        content: e.content,
        metrics,
        benchmark_comparison: benchmarkComparison,
      }));

      const { error } = await supabase.from('sim_portfolio_journal').insert(allInserts);
      if (error) throw error;

      toast.success(`Generated ${journalEntries.length} journal entries`);

      toast.success(`Generated ${entries.length} journal entries`);
      fetchData();
    } catch (e: any) {
      toast.error(e.message || 'Failed to generate journal');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <PortfolioGoalsSetup portfolioId={portfolioId} onSaved={fetchData} />

      <Card className="border-border/50">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            Portfolio Journal
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={generateJournalEntry}
            disabled={generating || !goals}
            className="h-8 text-xs"
          >
            <RefreshCw className={`h-3 w-3 mr-1.5 ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'Analyzing...' : 'Generate Entry'}
          </Button>
        </CardHeader>
        <CardContent>
          {!goals && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Set your goals above first, then generate journal entries to track progress.
            </p>
          )}

          {goals && entries.length === 0 && !loading && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No entries yet. Click "Generate Entry" to create your first portfolio review.
            </p>
          )}

          <ScrollArea className="max-h-[500px]">
            <div className="space-y-3">
              {entries.map((entry, i) => {
                const config = CATEGORY_CONFIG[entry.category] || CATEGORY_CONFIG.performance;
                const Icon = config.icon;
                const metrics = entry.metrics as Record<string, any>;

                return (
                  <div key={entry.id}>
                    {i > 0 && <Separator className="mb-3" />}
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon className={`h-4 w-4 shrink-0 ${config.color}`} />
                          <span className="text-sm font-medium truncate">{entry.title}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {entry.category}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Clock className="h-2.5 w-2.5" />
                            {format(parseISO(entry.created_at), 'MMM d, h:mm a')}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground leading-relaxed pl-6">
                        {entry.content}
                      </p>

                      {/* Quick metrics strip */}
                      {metrics && (
                        <div className="flex flex-wrap gap-2 pl-6">
                          {metrics.totalReturn !== undefined && (
                            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${metrics.totalReturn >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                              Return: {metrics.totalReturn > 0 ? '+' : ''}{metrics.totalReturn}%
                            </span>
                          )}
                          {metrics.maxDrawdown !== undefined && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">
                              Max DD: -{metrics.maxDrawdown}%
                            </span>
                          )}
                          {metrics.winRate !== undefined && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">
                              Win: {metrics.winRate}%
                            </span>
                          )}
                          {metrics.cashPct !== undefined && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                              Cash: {metrics.cashPct}%
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
