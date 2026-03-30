import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

import type { SimTrade } from './SimPortfolioDetail';
import type { Position } from './SimPortfolioDetail';
import {
  BookOpen, RefreshCw, TrendingUp, TrendingDown, AlertTriangle,
  CheckCircle, BarChart3, Clock, ArrowUpDown, Plus,
  ChevronDown, ChevronUp, GraduationCap, Lightbulb
} from 'lucide-react';
import { getJournalTopics, EDUCATION_TOPICS } from './learning/tradeEducation';
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
  
  // Track positions fingerprint to detect changes
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

  // Auto-generate once daily if goals exist and no entry today
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

  // Auto-update today's entry when positions change (add/remove/value change)
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
    }));
    const sortedPositions = [...posValues].sort((a, b) => b.pct - a.pct);
    const topPosition = sortedPositions[0];
    const cashPct = (cashBalance / currentValue) * 100;

    if (!goals) return null;

    // Build single consolidated content
    const sections: string[] = [];

    // --- Performance Summary ---
    const onTrack = annualizedReturn >= goals.target_annual_return_pct;
    sections.push(
      `📊 PERFORMANCE\n` +
      `Total return: ${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(2)}% | Annualized: ${annualizedReturn.toFixed(2)}% | Target: ${goals.target_annual_return_pct}%\n` +
      (onTrack
        ? `✅ Exceeding target by ${(annualizedReturn - goals.target_annual_return_pct).toFixed(1)}pp`
        : `⚠️ Below target by ${(goals.target_annual_return_pct - annualizedReturn).toFixed(1)}pp`) +
      ` | Win rate: ${winRate.toFixed(0)}% (${winCount}/${closedTrades.length})`
    );

    // --- Holdings Breakdown ---
    if (sortedPositions.length > 0) {
      const assetLines = sortedPositions.map(p => {
        const pos = positions.find(pos => pos.ticker === p.ticker);
        const pnlStr = pos?.pnl !== null && pos?.pnl !== undefined
          ? `${pos.pnl >= 0 ? '+' : ''}$${pos.pnl.toFixed(2)} (${pos.pnl_pct?.toFixed(1)}%)`
          : 'N/A';
        const typeLabel = pos?.instrument_type === 'option'
          ? ` [${pos.option_type?.toUpperCase()} $${pos.strike_price} exp ${pos.expiration_date}]`
          : '';
        return `  • ${p.ticker}${typeLabel}: ${p.pct.toFixed(1)}% of portfolio, P&L ${pnlStr}, avg cost $${pos?.avg_cost?.toFixed(2) || '?'}`;
      });

      const concentrated = sortedPositions.filter(p => p.pct > 20);
      const concNote = concentrated.length > 0
        ? `⚠️ ${concentrated.map(c => c.ticker).join(', ')} exceed${concentrated.length === 1 ? 's' : ''} 20% concentration`
        : '✅ Position sizing within institutional norms';

      sections.push(`📋 HOLDINGS (${positions.length})\n${assetLines.join('\n')}\n${concNote}`);
    }

    // --- Allocation ---
    const assetTypes = positions.reduce((acc, p) => {
      const type = p.instrument_type === 'option' ? 'Options' : 'Equities';
      acc[type] = (acc[type] || 0) + (p.current_value || 0);
      return acc;
    }, {} as Record<string, number>);
    const typeLines = Object.entries(assetTypes).map(([type, val]) =>
      `${type}: $${val.toFixed(0)} (${((val / currentValue) * 100).toFixed(1)}%)`
    ).join(' | ');
    const deployedPct = ((1 - cashPct / 100) * 100);
    sections.push(
      `💰 ALLOCATION\n${typeLines} | Cash: $${cashBalance.toFixed(0)} (${cashPct.toFixed(1)}%)\n` +
      `Risk budget: ${deployedPct.toFixed(0)}% deployed of ${goals.risk_budget_pct}% allowed`
    );

    // --- Risk ---
    let riskSection = `🛡️ RISK\nMax drawdown: -${maxDrawdown.toFixed(1)}% (limit: ${goals.max_drawdown_pct}%)`;
    if (maxDrawdown > goals.max_drawdown_pct) {
      riskSection += `\n🚨 BREACHED — Drawdown exceeds your ${goals.max_drawdown_pct}% constraint. Review position sizing.`;
    } else if (maxDrawdown > goals.max_drawdown_pct * 0.75) {
      riskSection += `\n⚠️ Approaching limit — ${(goals.max_drawdown_pct - maxDrawdown).toFixed(1)}% remaining budget`;
    } else {
      riskSection += `\n✅ Within tolerance — ${(goals.max_drawdown_pct - maxDrawdown).toFixed(1)}% remaining budget`;
    }
    sections.push(riskSection);

    // --- Backtest vs Actual ---
    if (backtestResults) {
      const bt = backtestResults;
      const btReturn = bt.totalReturn ?? bt.total_return ?? bt.cagr ?? null;
      const btMaxDD = bt.maxDrawdown ?? bt.max_drawdown ?? null;
      const btSharpe = bt.sharpeRatio ?? bt.sharpe_ratio ?? bt.sharpe ?? null;
      const btWinRate = bt.winRate ?? bt.win_rate ?? null;

      const deltas: string[] = [];
      if (btReturn !== null) {
        const diff = totalReturn - btReturn;
        deltas.push(`Return: ${totalReturn.toFixed(1)}% vs backtest ${btReturn.toFixed(1)}% (${diff >= 0 ? '+' : ''}${diff.toFixed(1)}pp)`);
      }
      if (btMaxDD !== null) {
        deltas.push(`Max DD: -${maxDrawdown.toFixed(1)}% vs backtest -${Math.abs(btMaxDD).toFixed(1)}%`);
      }
      if (btWinRate !== null) {
        deltas.push(`Win rate: ${winRate.toFixed(0)}% vs backtest ${btWinRate.toFixed(0)}%`);
      }
      if (btSharpe !== null) {
        deltas.push(`Backtest Sharpe: ${btSharpe.toFixed(2)}`);
      }
      if (deltas.length > 0) {
        const stratLabel = strategyName ? ` (${strategyName})` : '';
        sections.push(`🔬 BACKTEST vs ACTUAL${stratLabel}\n${deltas.join('\n')}`);
      }
    }

    // --- Milestones ---
    if (totalReturn > 0 && Math.floor(totalReturn / 5) > 0) {
      const milestone = Math.floor(totalReturn / 5) * 5;
      sections.push(`🏆 MILESTONE: +${milestone}% return reached | ${daysActive} days active`);
    }

    // Determine title
    const statusEmoji = onTrack ? '✅' : '⚠️';
    const title = `${statusEmoji} Daily Review — ${format(new Date(), 'MMM d, yyyy')} | ${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(1)}%`;

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

    return {
      title,
      content: sections.join('\n\n'),
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
      // Find today's existing auto entry
      const todayEntry = entries.find(e => e.created_at.startsWith(today) && e.entry_type === 'auto');

      if (todayEntry) {
        // Update existing entry
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
        if (!silent) toast.success('Journal entry updated');
      } else {
        // Insert new single entry
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
        if (!silent) toast.success('Journal entry generated');
      }

      fetchData();
    } catch (e: any) {
      if (!silent) toast.error(e.message || 'Failed to generate journal');
    } finally {
      setGenerating(false);
    }
  };

  // Group entries by date for display
  const groupedEntries = entries.reduce((acc, entry) => {
    const date = entry.created_at.split('T')[0];
    if (!acc[date]) acc[date] = [];
    acc[date].push(entry);
    return acc;
  }, {} as Record<string, JournalEntry[]>);

  const sortedDates = Object.keys(groupedEntries).sort((a, b) => b.localeCompare(a));

  const EducationCard = ({ topic }: { topic: typeof EDUCATION_TOPICS[string] }) => (
    <div className="rounded bg-muted/40 border border-border/30 p-2 space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Lightbulb className="h-3 w-3 text-primary" />
        <span className="text-[10px] font-semibold text-primary">{topic.title}</span>
      </div>
      <p className="text-[10px] text-muted-foreground leading-relaxed">{topic.summary}</p>
      <p className="text-[10px] text-emerald-400 font-medium">💡 {topic.keyTakeaway}</p>
    </div>
  );

  return (
    <div className="space-y-4">

      <Card className="border-border/50">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            Portfolio Journal
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => generateOrUpdateTodayEntry(false)}
              disabled={generating || !goals}
              className="h-8 text-xs"
            >
              <RefreshCw className={`h-3 w-3 mr-1.5 ${generating ? 'animate-spin' : ''}`} />
              {generating ? 'Analyzing...' : 'Update Today\'s Entry'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!goals && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Set your goals above first, then journal entries will be generated automatically.
            </p>
          )}

          {goals && entries.length === 0 && !loading && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No entries yet. Your first daily review will generate automatically when you have positions.
            </p>
          )}

          <ScrollArea className="max-h-[500px]">
            <div className="space-y-4">
              {sortedDates.map((date) => (
                <div key={date}>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className="text-[10px] font-mono">
                      {format(parseISO(date), 'EEEE, MMM d, yyyy')}
                    </Badge>
                    {date === new Date().toISOString().split('T')[0] && (
                      <Badge className="text-[10px] bg-primary/20 text-primary border-primary/30">Today</Badge>
                    )}
                  </div>
                  {groupedEntries[date].map((entry) => {
                    const metrics = entry.metrics as Record<string, any>;
                    const isExpanded = expandedEntryId === entry.id;
                    const sections = entry.content.split('\n\n');
                    const topicIds = getJournalTopics(entry.content);
                    const topics = topicIds.map(id => EDUCATION_TOPICS[id]).filter(Boolean);

                    return (
                      <div key={entry.id} className="space-y-2 pl-2 border-l-2 border-border/50 ml-1">
                        {/* Clickable header */}
                        <button
                          type="button"
                          onClick={() => setExpandedEntryId(isExpanded ? null : entry.id)}
                          className="flex items-start justify-between gap-2 w-full text-left group"
                        >
                          <span className="text-sm font-medium group-hover:text-primary transition-colors">{entry.title}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                              <Clock className="h-2.5 w-2.5" />
                              {format(parseISO(entry.created_at), 'h:mm a')}
                            </span>
                            {isExpanded
                              ? <ChevronUp className="h-3 w-3 text-muted-foreground" />
                              : <ChevronDown className="h-3 w-3 text-muted-foreground" />
                            }
                          </div>
                        </button>

                        {/* Metric badges — always visible */}
                        {metrics && (
                          <div className="flex flex-wrap gap-2">
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
                            {metrics.positionCount !== undefined && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                {metrics.positionCount} positions
                              </span>
                            )}
                            {metrics.cashPct !== undefined && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                Cash: {metrics.cashPct}%
                              </span>
                            )}
                          </div>
                        )}

                        {/* Collapsed preview */}
                        {!isExpanded && sections.length > 0 && (
                          <p className="text-[11px] text-muted-foreground truncate">
                            {sections[0]?.replace(/📊|📋|💰|🛡️|🔬|🏆|⚠️|✅|🚨/g, '').trim().slice(0, 100)}...
                            <span className="text-primary/70 ml-1 text-[10px]">click to expand & learn</span>
                          </p>
                        )}

                        {/* Expanded content + education */}
                        {isExpanded && (
                          <div className="space-y-3">
                            {sections.map((section, si) => {
                              const sectionTopics = getJournalTopics(section);
                              const sectionEducation = sectionTopics.map(id => EDUCATION_TOPICS[id]).filter(Boolean);
                              const hasWarning = section.includes('⚠️') || section.includes('🚨') || section.includes('BREACHED');
                              const hasOk = section.includes('✅');

                              return (
                                <div key={si} className={`rounded border p-2 text-xs ${
                                  hasWarning ? 'border-amber-500/30 bg-amber-500/5' :
                                  hasOk ? 'border-emerald-500/30 bg-emerald-500/5' :
                                  'border-border/30 bg-muted/20'
                                }`}>
                                  <pre className="text-muted-foreground leading-relaxed whitespace-pre-wrap font-sans text-xs">
                                    {section}
                                  </pre>

                                  {sectionEducation.length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-border/20 space-y-2">
                                      {sectionEducation.map(topic => (
                                        <EducationCard key={topic.id} topic={topic} />
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}

                            {/* Overall learning section */}
                            {topics.length > 0 && (
                              <div className="rounded border border-primary/20 bg-primary/5 p-3">
                                <div className="flex items-center gap-1.5 mb-2">
                                  <GraduationCap className="h-3.5 w-3.5 text-primary" />
                                  <span className="text-xs font-semibold text-primary">What to Learn From This Entry</span>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {topics.map(t => (
                                    <span key={t.id} className="text-[10px] px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                                      {t.title}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
