import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

import type { SimTrade } from './SimPortfolioDetail';
import type { Position } from './SimPortfolioDetail';
import {
  BookOpen, RefreshCw, Clock, ChevronDown, ChevronUp,
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Shield
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

export function PortfolioJournal({ portfolioId, initialCapital, currentValue, cashBalance, trades, positions, backtestResults, strategyName }: Props) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [goals, setGoals] = useState<Goals | null>(null);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [autoGenAttempted, setAutoGenAttempted] = useState(false);
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const prevPositionsRef = useRef<string>('');

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [journalRes, goalsRes] = await Promise.all([
      supabase
        .from('sim_portfolio_journal')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .order('created_at', { ascending: false })
        .limit(200),
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

  // Auto-generate once daily
  useEffect(() => {
    if (autoGenAttempted || !goals || loading || generating) return;
    const today = new Date().toISOString().split('T')[0];
    const hasEntryToday = entries.some(e => e.created_at.startsWith(today));
    if (!hasEntryToday && positions.length > 0) {
      setAutoGenAttempted(true);
      generateOrUpdateTodayEntry(true);
    } else {
      setAutoGenAttempted(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goals, loading, autoGenAttempted, entries]);

  // Auto-update when positions change
  useEffect(() => {
    if (!goals || loading || generating) return;
    const fingerprint = positions
      .map(p => `${p.ticker}:${p.quantity}:${p.instrument_type}`)
      .sort()
      .join('|');
    if (prevPositionsRef.current && prevPositionsRef.current !== fingerprint && positions.length > 0) {
      generateOrUpdateTodayEntry(true);
    }
    prevPositionsRef.current = fingerprint;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positions]);

  const buildJournalContent = () => {
    const totalReturn = ((currentValue - initialCapital) / initialCapital) * 100;
    const daysActive = trades.length > 0
      ? differenceInDays(new Date(), parseISO(trades[trades.length - 1]?.executed_at || new Date().toISOString()))
      : 0;
    const annualizedReturn = daysActive > 30
      ? (Math.pow(currentValue / initialCapital, 365 / Math.max(daysActive, 1)) - 1) * 100
      : totalReturn;

    // Drawdown
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

    // Position data
    const posValues = positions.map(p => ({
      ticker: p.ticker,
      value: p.current_value || 0,
      pct: ((p.current_value || 0) / currentValue) * 100,
      pnl: p.pnl ?? 0,
      pnl_pct: p.pnl_pct ?? 0,
    }));
    const sortedPositions = [...posValues].sort((a, b) => b.pct - a.pct);
    const cashPct = (cashBalance / currentValue) * 100;

    if (!goals) return null;

    const onTrack = annualizedReturn >= goals.target_annual_return_pct;

    // ---- Build human-readable narrative ----
    const paragraphs: string[] = [];

    // Opening summary
    const portfolioDirection = totalReturn >= 0 ? 'up' : 'down';
    const returnAbs = Math.abs(totalReturn).toFixed(1);
    paragraphs.push(
      `Your portfolio is ${portfolioDirection} ${returnAbs}% overall since you started${daysActive > 0 ? ` ${daysActive} days ago` : ''}. ` +
      `Right now it's worth $${currentValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}, ` +
      `and you have $${cashBalance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} in cash (${cashPct.toFixed(0)}% of your portfolio).`
    );

    // Goal progress
    if (onTrack) {
      paragraphs.push(
        `Good news — you're on track to hit your ${goals.target_annual_return_pct}% annual return target. ` +
        `Your annualized pace is ${annualizedReturn.toFixed(1)}%, which is ${(annualizedReturn - goals.target_annual_return_pct).toFixed(1)} percentage points ahead of where you need to be.`
      );
    } else {
      paragraphs.push(
        `You're currently behind your ${goals.target_annual_return_pct}% annual return target. ` +
        `At your current pace of ${annualizedReturn.toFixed(1)}% annualized, you're ${(goals.target_annual_return_pct - annualizedReturn).toFixed(1)} percentage points below your goal. ` +
        `This doesn't mean you need to trade more — sometimes patience is the best strategy.`
      );
    }

    // Holdings narrative
    if (sortedPositions.length > 0) {
      const holdingParts = sortedPositions.slice(0, 5).map(p => {
        const dir = p.pnl >= 0 ? 'up' : 'down';
        return `${p.ticker} (${p.pct.toFixed(0)}% of your portfolio, ${dir} ${Math.abs(p.pnl_pct).toFixed(1)}%)`;
      });
      const holdingsText = holdingParts.length <= 2
        ? holdingParts.join(' and ')
        : holdingParts.slice(0, -1).join(', ') + ', and ' + holdingParts[holdingParts.length - 1];
      
      paragraphs.push(
        `You're holding ${positions.length} position${positions.length !== 1 ? 's' : ''}: ${holdingsText}.` +
        (sortedPositions.length > 5 ? ` Plus ${sortedPositions.length - 5} more.` : '')
      );

      // Concentration warning
      const concentrated = sortedPositions.filter(p => p.pct > 25);
      if (concentrated.length > 0) {
        paragraphs.push(
          `⚠️ Heads up: ${concentrated.map(c => c.ticker).join(' and ')} make${concentrated.length === 1 ? 's' : ''} up more than 25% of your portfolio. ` +
          `That's a lot of eggs in one basket. If ${concentrated[0].ticker} has a bad day, it'll hit your whole portfolio hard. Consider whether you're comfortable with that level of concentration.`
        );
      }
    } else {
      paragraphs.push(
        `You don't have any open positions right now — you're 100% in cash. If you're waiting for the right opportunity, that's totally fine. ` +
        `Cash is a position too.`
      );
    }

    // Risk check
    if (maxDrawdown > goals.max_drawdown_pct) {
      paragraphs.push(
        `🚨 Your biggest drawdown so far has been ${maxDrawdown.toFixed(1)}%, which exceeds your ${goals.max_drawdown_pct}% limit. ` +
        `This means at some point you lost more than you said you were comfortable with. ` +
        `Think about whether your position sizes are too large, or if you need tighter stop-losses.`
      );
    } else if (maxDrawdown > goals.max_drawdown_pct * 0.7) {
      paragraphs.push(
        `Your max drawdown is ${maxDrawdown.toFixed(1)}%, getting close to your ${goals.max_drawdown_pct}% limit. ` +
        `You still have ${(goals.max_drawdown_pct - maxDrawdown).toFixed(1)}% of buffer left. Keep an eye on this — one bad trade could push you over.`
      );
    } else {
      paragraphs.push(
        `Your risk is well managed — your worst drawdown has only been ${maxDrawdown.toFixed(1)}%, well within your ${goals.max_drawdown_pct}% comfort zone.`
      );
    }

    // Win rate insight
    if (closedTrades.length > 0) {
      const lossCount = closedTrades.length - winCount;
      if (winRate >= 60) {
        paragraphs.push(
          `You've closed ${closedTrades.length} trades so far with a ${winRate.toFixed(0)}% win rate (${winCount} winners, ${lossCount} losers). That's solid — keep doing what's working.`
        );
      } else if (winRate >= 40) {
        paragraphs.push(
          `Your win rate is ${winRate.toFixed(0)}% across ${closedTrades.length} closed trades. That's in the average range. ` +
          `What matters more than win rate is whether your winners are bigger than your losers. Review your recent trades to check that.`
        );
      } else {
        paragraphs.push(
          `Your win rate is ${winRate.toFixed(0)}% — you've had more losing trades than winning ones. ` +
          `Don't panic though. Many successful strategies have low win rates but large winners. ` +
          `The key question: are your gains on winners bigger than your losses? If not, it might be time to tighten your entry criteria.`
        );
      }
    }

    // Backtest comparison
    if (backtestResults) {
      const bt = backtestResults;
      const btReturn = bt.totalReturn ?? bt.total_return ?? bt.cagr ?? null;
      if (btReturn !== null) {
        const diff = totalReturn - btReturn;
        if (diff > 0) {
          paragraphs.push(
            `Compared to your backtest${strategyName ? ` (${strategyName})` : ''}, you're actually doing ${diff.toFixed(1)} percentage points better. ` +
            `Real trading is beating the model — nice work sticking to the plan (or improving on it).`
          );
        } else {
          paragraphs.push(
            `Your backtest${strategyName ? ` (${strategyName})` : ''} predicted ${btReturn.toFixed(1)}% returns, but you're at ${totalReturn.toFixed(1)}%. ` +
            `That ${Math.abs(diff).toFixed(1)} point gap could be from timing differences, emotional decisions, or just market conditions. ` +
            `Review whether you've been following the strategy closely.`
          );
        }
      }
    }

    // Daily tip
    const tips = [
      'Remember: the best traders aren\'t right the most — they manage risk the best.',
      'Before your next trade, write down why you\'re making it. If you can\'t explain it in one sentence, reconsider.',
      'Check if any of your positions have changed their fundamental story. If the reason you bought no longer holds, it might be time to exit.',
      'Zoom out. Daily fluctuations don\'t matter much — focus on whether your process is sound.',
      'Ask yourself: would I buy this position today at this price? If not, why are you still holding it?',
    ];
    const tipIndex = new Date().getDate() % tips.length;
    paragraphs.push(`💡 Today's thought: ${tips[tipIndex]}`);

    // Title
    const emoji = onTrack ? '✅' : (totalReturn >= 0 ? '📈' : '📉');
    const title = `${emoji} ${format(new Date(), 'MMMM d, yyyy')} — Portfolio ${portfolioDirection} ${returnAbs}%`;

    const metrics = {
      totalReturn: parseFloat(totalReturn.toFixed(2)),
      annualizedReturn: parseFloat(annualizedReturn.toFixed(2)),
      maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
      winRate: parseFloat(winRate.toFixed(1)),
      positionCount: positions.length,
      cashPct: parseFloat(cashPct.toFixed(1)),
      daysActive,
    };

    const benchmarkComparison = {
      benchmark: goals.benchmark_ticker,
      note: `Compare against ${goals.benchmark_ticker} over the same period.`,
    };

    return {
      title,
      content: paragraphs.join('\n\n'),
      metrics,
      benchmarkComparison,
    };
  };

  const generateOrUpdateTodayEntry = async (silent = false) => {
    if (!user || !goals) {
      if (!silent) toast.error('Set your goals first before generating a journal entry');
      return;
    }
    setGenerating(true);

    try {
      const result = buildJournalContent();
      if (!result) throw new Error('Could not build journal content');

      const today = new Date().toISOString().split('T')[0];
      const todayEntry = entries.find(e => e.created_at.startsWith(today) && e.entry_type === 'auto');

      if (todayEntry) {
        const { error } = await supabase
          .from('sim_portfolio_journal')
          .update({
            title: result.title,
            content: result.content,
            metrics: result.metrics,
            benchmark_comparison: result.benchmarkComparison,
          })
          .eq('id', todayEntry.id);
        if (error) throw error;
        if (!silent) toast.success('Today\'s journal updated');
      } else {
        const { error } = await supabase.from('sim_portfolio_journal').insert({
          portfolio_id: portfolioId,
          user_id: user.id,
          entry_type: 'auto',
          category: 'daily_review',
          title: result.title,
          content: result.content,
          metrics: result.metrics,
          benchmark_comparison: result.benchmarkComparison,
        });
        if (error) throw error;
        if (!silent) toast.success('Journal entry created');
      }

      fetchData();
    } catch (e: any) {
      if (!silent) toast.error(e.message || 'Failed to generate journal');
    } finally {
      setGenerating(false);
    }
  };

  const sortedDates = [...new Set(entries.map(e => e.created_at.split('T')[0]))].sort((a, b) => b.localeCompare(a));
  const groupedEntries = entries.reduce((acc, entry) => {
    const date = entry.created_at.split('T')[0];
    if (!acc[date]) acc[date] = [];
    acc[date].push(entry);
    return acc;
  }, {} as Record<string, JournalEntry[]>);

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-4">
      <Card className="border-border/50">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            Portfolio Journal
            <Badge variant="secondary" className="text-[10px] ml-1">{entries.length} entries</Badge>
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => generateOrUpdateTodayEntry(false)}
            disabled={generating || !goals}
            className="h-8 text-xs"
          >
            <RefreshCw className={`h-3 w-3 mr-1.5 ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'Writing...' : 'Update Today'}
          </Button>
        </CardHeader>
        <CardContent>
          {!goals && (
            <div className="text-sm text-muted-foreground py-6 text-center space-y-1">
              <p className="font-medium">Set your goals first</p>
              <p className="text-xs">Go to the Goals tab to define your targets — the journal will automatically write daily entries based on your progress.</p>
            </div>
          )}

          {goals && entries.length === 0 && !loading && (
            <div className="text-sm text-muted-foreground py-6 text-center space-y-1">
              <p className="font-medium">No entries yet</p>
              <p className="text-xs">Your first daily journal entry will generate automatically when you open positions.</p>
            </div>
          )}

          <ScrollArea className="max-h-[600px]">
            <div className="space-y-1">
              {sortedDates.map((date) => {
                const dateEntries = groupedEntries[date] || [];
                const isToday = date === today;
                
                return dateEntries.map((entry) => {
                  const isExpanded = expandedEntryId === entry.id;
                  const metrics = entry.metrics as Record<string, any>;
                  const returnVal = metrics?.totalReturn;
                  const isPositive = returnVal !== undefined && returnVal >= 0;

                  return (
                    <div key={entry.id} className="group">
                      {/* Entry row */}
                      <button
                        type="button"
                        onClick={() => setExpandedEntryId(isExpanded ? null : entry.id)}
                        className={`w-full text-left px-3 py-3 rounded-lg transition-all ${
                          isExpanded
                            ? 'bg-muted/60 border border-border/50'
                            : 'hover:bg-muted/30'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Date circle */}
                            <div className={`shrink-0 w-10 h-10 rounded-full flex flex-col items-center justify-center text-[10px] font-medium ${
                              isToday ? 'bg-primary/15 text-primary border border-primary/30' : 'bg-muted text-muted-foreground'
                            }`}>
                              <span className="leading-none">{format(parseISO(date), 'MMM')}</span>
                              <span className="text-sm font-bold leading-none">{format(parseISO(date), 'd')}</span>
                            </div>
                            
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium truncate">
                                  {format(parseISO(date), 'EEEE')}
                                </span>
                                {isToday && (
                                  <Badge className="text-[9px] h-4 bg-primary/20 text-primary border-primary/30">Today</Badge>
                                )}
                              </div>
                              <p className="text-[11px] text-muted-foreground truncate max-w-md">
                                {entry.content.split('\n\n')[0]?.slice(0, 80)}...
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            {returnVal !== undefined && (
                              <div className={`flex items-center gap-1 text-xs font-mono font-medium ${isPositive ? 'text-success' : 'text-destructive'}`}>
                                {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                {isPositive ? '+' : ''}{returnVal}%
                              </div>
                            )}
                            {isExpanded
                              ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                              : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            }
                          </div>
                        </div>
                      </button>

                      {/* Expanded content */}
                      {isExpanded && (
                        <div className="px-3 pb-4 pt-1 ml-[52px]">
                          {/* Metric pills */}
                          {metrics && (
                            <div className="flex flex-wrap gap-1.5 mb-3">
                              {metrics.maxDrawdown !== undefined && (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                  Max Drawdown: -{metrics.maxDrawdown}%
                                </span>
                              )}
                              {metrics.winRate !== undefined && (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
                                  Win Rate: {metrics.winRate}%
                                </span>
                              )}
                              {metrics.positionCount !== undefined && (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/30">
                                  {metrics.positionCount} positions
                                </span>
                              )}
                              {metrics.cashPct !== undefined && (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/30">
                                  {metrics.cashPct}% cash
                                </span>
                              )}
                              {metrics.daysActive !== undefined && metrics.daysActive > 0 && (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/30">
                                  Day {metrics.daysActive}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Written narrative */}
                          <div className="space-y-3">
                            {entry.content.split('\n\n').map((paragraph, i) => {
                              const hasWarning = paragraph.includes('⚠️') || paragraph.includes('🚨');
                              const hasTip = paragraph.includes('💡');

                              if (hasWarning) {
                                return (
                                  <div key={i} className="flex gap-2 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20">
                                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                                    <p className="text-xs text-foreground/90 leading-relaxed">{paragraph.replace(/⚠️|🚨/g, '').trim()}</p>
                                  </div>
                                );
                              }
                              if (hasTip) {
                                return (
                                  <div key={i} className="flex gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/20">
                                    <span className="text-sm shrink-0">💡</span>
                                    <p className="text-xs text-muted-foreground leading-relaxed italic">{paragraph.replace('💡', '').trim()}</p>
                                  </div>
                                );
                              }
                              return (
                                <p key={i} className="text-xs text-foreground/80 leading-relaxed">
                                  {paragraph}
                                </p>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                });
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
