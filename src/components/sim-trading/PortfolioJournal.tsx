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
};

export function PortfolioJournal({ portfolioId, initialCapital, currentValue, cashBalance, trades, positions }: Props) {
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
      const entries: { category: string; title: string; content: string }[] = [];

      // Performance vs goal
      const onTrack = annualizedReturn >= goals.target_annual_return_pct;
      entries.push({
        category: 'performance',
        title: onTrack ? 'On Track — Return Target' : 'Below Target Return',
        content: `Portfolio return: ${totalReturn.toFixed(2)}% total (${annualizedReturn.toFixed(2)}% annualized). ` +
          `Your target is ${goals.target_annual_return_pct}% annually. ` +
          (onTrack
            ? `Currently exceeding target by ${(annualizedReturn - goals.target_annual_return_pct).toFixed(1)} percentage points.`
            : `Gap of ${(goals.target_annual_return_pct - annualizedReturn).toFixed(1)} percentage points to close.`) +
          ` Win rate on closed trades: ${winRate.toFixed(0)}% (${winCount}/${closedTrades.length}).`,
      });

      // Drawdown check
      if (maxDrawdown > goals.max_drawdown_pct) {
        entries.push({
          category: 'drawdown',
          title: `⚠️ Drawdown Exceeded — ${maxDrawdown.toFixed(1)}%`,
          content: `Peak drawdown of ${maxDrawdown.toFixed(1)}% has breached your ${goals.max_drawdown_pct}% constraint. ` +
            `Industry practice: review position sizing, consider reducing exposure, or tighten stop levels. ` +
            `Current cash allocation: ${cashPct.toFixed(1)}%.`,
        });
      } else if (maxDrawdown > goals.max_drawdown_pct * 0.75) {
        entries.push({
          category: 'risk',
          title: `Drawdown Approaching Limit — ${maxDrawdown.toFixed(1)}%`,
          content: `Drawdown at ${maxDrawdown.toFixed(1)}% is within 25% of your ${goals.max_drawdown_pct}% limit. ` +
            `Monitor closely. Remaining drawdown budget: ${(goals.max_drawdown_pct - maxDrawdown).toFixed(1)}%.`,
        });
      }

      // Concentration risk
      if (topPosition && topPosition.pct > 30) {
        entries.push({
          category: 'risk',
          title: `Concentration Alert — ${topPosition.ticker} at ${topPosition.pct.toFixed(0)}%`,
          content: `${topPosition.ticker} represents ${topPosition.pct.toFixed(1)}% of portfolio value. ` +
            `Institutional standard: no single position >5-10% for diversified portfolios. ` +
            `Consider if this aligns with your ${goals.goal_type} objective and ${goals.risk_budget_pct}% risk budget.`,
        });
      }

      // Milestones
      if (totalReturn > 0 && Math.floor(totalReturn / 5) > 0) {
        const milestone = Math.floor(totalReturn / 5) * 5;
        entries.push({
          category: 'milestone',
          title: `Milestone Reached: +${milestone}% Return`,
          content: `Portfolio has crossed the ${milestone}% return threshold. ` +
            `Active days: ${daysActive}. Positions held: ${positions.length}. Cash: ${cashPct.toFixed(1)}%.`,
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
      };

      const benchmarkComparison = {
        benchmark: goals.benchmark_ticker,
        note: `Compare your ${annualizedReturn.toFixed(1)}% annualized return against ${goals.benchmark_ticker} performance over the same period.`,
      };

      // Insert the primary entry (first one which is always performance)
      const primaryEntry = entries[0];
      const allInserts = entries.map(e => ({
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
