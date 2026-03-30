import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getCachedQuotes } from '@/services/quoteCacheService';
import type { StockQuote } from '@/services/finnhubService';

import type { SimTrade } from './SimPortfolioDetail';
import type { Position } from './SimPortfolioDetail';
import {
  BookOpen, RefreshCw, Clock,
  TrendingUp, TrendingDown, AlertTriangle
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

// Helper: format dollar amounts naturally
function fmtUSD(n: number, decimals = 0): string {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtPct(n: number, decimals = 1): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(decimals)}%`;
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

  /**
   * Build journal content using LIVE market data from Polygon.
   * Every number comes from either:
   *  - The user's actual trade/position data in the DB
   *  - Live quotes fetched via getCachedQuotes (Polygon API)
   *  - Calculations derived from the above
   */
  const buildJournalContent = async () => {
    if (!goals) return null;

    // ── Fetch live quotes for all held tickers + benchmark ──
    const tickers = [...new Set([
      ...positions.map(p => p.ticker),
      goals.benchmark_ticker || 'SPY',
    ])];
    
    let quotes = new Map<string, StockQuote>();
    try {
      quotes = await getCachedQuotes(tickers);
    } catch (e) {
      console.warn('[Journal] Quote fetch failed, proceeding with position data only:', e);
    }

    const benchmarkTicker = goals.benchmark_ticker || 'SPY';
    const benchmarkQuote = quotes.get(benchmarkTicker.toUpperCase()) || quotes.get(benchmarkTicker);

    // ── Core calculations from real trade data ──
    const totalReturn = ((currentValue - initialCapital) / initialCapital) * 100;
    const totalPnL = currentValue - initialCapital;
    const daysActive = trades.length > 0
      ? differenceInDays(new Date(), parseISO(trades[0]?.executed_at || new Date().toISOString()))
      : 0;
    const annualizedReturn = daysActive > 30
      ? (Math.pow(currentValue / initialCapital, 365 / Math.max(daysActive, 1)) - 1) * 100
      : totalReturn;

    // Drawdown from actual trade sequence
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

    // Win rate from closed trades
    const closedTrades = sortedTrades.filter(t => t.action === 'sell');
    const winCount = closedTrades.filter(t => {
      const buyTrade = sortedTrades.find(
        bt => bt.ticker === t.ticker && bt.action === 'buy' && new Date(bt.executed_at) < new Date(t.executed_at)
      );
      return buyTrade ? t.price_at_execution > buyTrade.price_at_execution : false;
    }).length;
    const winRate = closedTrades.length > 0 ? (winCount / closedTrades.length) * 100 : 0;

    // Per-position enrichment with live quotes
    const enrichedPositions = positions.map(p => {
      const quote = quotes.get(p.ticker.toUpperCase()) || quotes.get(p.ticker);
      const livePrice = quote?.price ?? p.current_price ?? 0;
      const dayChange = quote?.changePercent ?? 0;
      const dayChangeDollar = quote?.change ?? 0;
      const todayHigh = quote?.high ?? 0;
      const todayLow = quote?.low ?? 0;
      const volume = quote?.volume ?? '';
      const companyName = quote?.companyName ?? p.ticker;
      const posValue = (p.current_value || 0);
      const weight = currentValue > 0 ? (posValue / currentValue) * 100 : 0;
      const positionDayPnL = (p.quantity || 0) * (dayChangeDollar) * (p.instrument_type === 'option' ? (p.contract_multiplier || 100) : 1);

      return {
        ...p,
        livePrice,
        dayChange,
        dayChangeDollar,
        todayHigh,
        todayLow,
        volume,
        companyName,
        weight,
        positionDayPnL,
      };
    }).sort((a, b) => b.weight - a.weight);

    const cashPct = currentValue > 0 ? (cashBalance / currentValue) * 100 : 100;
    const onTrack = annualizedReturn >= goals.target_annual_return_pct;

    // Today's trades
    const todayStr = new Date().toISOString().split('T')[0];
    const todayTrades = sortedTrades.filter(t => t.executed_at.startsWith(todayStr));

    // Portfolio-wide today P&L from live quotes
    const portfolioDayPnL = enrichedPositions.reduce((sum, p) => sum + p.positionDayPnL, 0);

    // ── Build rich narrative paragraphs ──
    const paragraphs: string[] = [];

    // §1 — Portfolio Overview
    const direction = totalReturn >= 0 ? 'gained' : 'lost';
    paragraphs.push(
      `Today is ${format(new Date(), 'EEEE, MMMM d, yyyy')}. Your simulated portfolio is currently valued at ${fmtUSD(currentValue)}, ` +
      `which means you've ${direction} ${fmtUSD(Math.abs(totalPnL))} (${fmtPct(totalReturn)}) since you started with ${fmtUSD(initialCapital)} ` +
      `${daysActive > 0 ? `${daysActive} days ago` : 'recently'}. ` +
      `You're holding ${fmtUSD(cashBalance)} in cash, which represents ${cashPct.toFixed(0)}% of your total portfolio value.`
    );

    // §2 — Today's Market Action (from live quotes)
    if (benchmarkQuote) {
      const bmDir = benchmarkQuote.changePercent >= 0 ? 'up' : 'down';
      const bmName = benchmarkQuote.companyName || benchmarkTicker;
      paragraphs.push(
        `The broader market (${bmName}, ${benchmarkTicker}) is ${bmDir} ${Math.abs(benchmarkQuote.changePercent).toFixed(2)}% today, ` +
        `trading at $${benchmarkQuote.price.toFixed(2)}. ` +
        (portfolioDayPnL !== 0
          ? `Meanwhile, your portfolio ${portfolioDayPnL >= 0 ? 'gained' : 'lost'} an estimated ${fmtUSD(Math.abs(portfolioDayPnL))} today based on live price movements. ` +
            (portfolioDayPnL >= 0 && benchmarkQuote.changePercent < 0
              ? `That's a good sign — you're holding up while the market pulls back.`
              : portfolioDayPnL < 0 && benchmarkQuote.changePercent >= 0
              ? `Your positions are lagging the broader market today. Worth keeping an eye on.`
              : `Your portfolio is moving roughly in line with the market.`)
          : `No significant portfolio movement to report from today's session.`)
      );
    }

    // §3 — Position-by-Position Update (live data)
    if (enrichedPositions.length > 0) {
      const posNarratives = enrichedPositions.slice(0, 8).map(p => {
        const name = p.companyName !== p.ticker ? `${p.companyName} (${p.ticker})` : p.ticker;
        const pnlDir = (p.pnl ?? 0) >= 0 ? 'up' : 'down';
        const pnlAbs = Math.abs(p.pnl ?? 0);
        const pnlPctAbs = Math.abs(p.pnl_pct ?? 0);
        const dayDir = p.dayChange >= 0 ? 'up' : 'down';
        const isOption = p.instrument_type === 'option';
        const optLabel = isOption ? ` ${p.option_type?.toUpperCase()} $${p.strike_price} exp ${p.expiration_date}` : '';
        
        let line = `${name}${optLabel} — ${p.weight.toFixed(1)}% of your portfolio. ` +
          `You're ${pnlDir} ${fmtUSD(pnlAbs)} (${pnlPctAbs.toFixed(1)}%) on this position overall. `;

        if (p.livePrice > 0) {
          line += `The stock is trading at $${p.livePrice.toFixed(2)}, ${dayDir} ${Math.abs(p.dayChange).toFixed(2)}% today`;
          if (p.todayHigh > 0 && p.todayLow > 0) {
            line += ` with a range of $${p.todayLow.toFixed(2)}–$${p.todayHigh.toFixed(2)}`;
          }
          line += '. ';
        }

        // Your avg cost vs current price
        if (p.avg_cost > 0 && p.livePrice > 0 && !isOption) {
          const gap = ((p.livePrice - p.avg_cost) / p.avg_cost * 100);
          if (gap > 20) {
            line += `Your average cost is $${p.avg_cost.toFixed(2)}, so the stock is trading ${gap.toFixed(0)}% above your entry — a solid cushion.`;
          } else if (gap < -10) {
            line += `Your average cost is $${p.avg_cost.toFixed(2)}, meaning the stock is ${Math.abs(gap).toFixed(0)}% below where you bought in. Consider whether your thesis still holds.`;
          }
        }

        return line;
      });

      paragraphs.push(
        `Here's what's happening with your ${positions.length} position${positions.length !== 1 ? 's' : ''}:\n\n` +
        posNarratives.join('\n\n')
      );
    } else {
      paragraphs.push(
        `You don't have any open positions right now — you're sitting in 100% cash at ${fmtUSD(cashBalance)}. ` +
        `There's nothing wrong with that. Cash gives you optionality to act when you see a high-conviction setup. ` +
        `The best traders are often the most patient ones.`
      );
    }

    // §4 — Concentration & Diversification Analysis
    if (enrichedPositions.length > 0) {
      const concentrated = enrichedPositions.filter(p => p.weight > 25);
      const topWeight = enrichedPositions[0]?.weight || 0;
      
      if (concentrated.length > 0) {
        const names = concentrated.map(c => c.ticker).join(', ');
        paragraphs.push(
          `⚠️ Concentration alert: ${names} ${concentrated.length === 1 ? 'represents' : 'together represent'} a large chunk of your portfolio ` +
          `(${concentrated.map(c => `${c.ticker} at ${c.weight.toFixed(0)}%`).join(', ')}). ` +
          `Professional fund managers typically cap individual positions at 5-10%. ` +
          `If one of these names drops 10%, it could drag your entire portfolio down by ${(topWeight * 0.10).toFixed(1)}% or more. ` +
          `Think about whether you'd be comfortable with that outcome.`
        );
      } else if (enrichedPositions.length >= 5) {
        paragraphs.push(
          `Your portfolio is reasonably diversified across ${enrichedPositions.length} positions. ` +
          `Your largest holding (${enrichedPositions[0].ticker}) represents ${topWeight.toFixed(0)}% of the portfolio, which is within a healthy range. ` +
          `Good diversification doesn't eliminate risk, but it does prevent any single bad trade from causing catastrophic damage.`
        );
      }
    }

    // §5 — Today's Trading Activity
    if (todayTrades.length > 0) {
      const buyTrades = todayTrades.filter(t => t.action === 'buy');
      const sellTrades = todayTrades.filter(t => t.action === 'sell');
      let activityText = `You made ${todayTrades.length} trade${todayTrades.length !== 1 ? 's' : ''} today: `;
      const parts: string[] = [];
      
      buyTrades.forEach(t => {
        parts.push(`bought ${t.quantity} shares of ${t.ticker} at $${t.price_at_execution.toFixed(2)} (${fmtUSD(t.total_cost)} total)`);
      });
      sellTrades.forEach(t => {
        parts.push(`sold ${t.quantity} shares of ${t.ticker} at $${t.price_at_execution.toFixed(2)} (${fmtUSD(t.total_cost)} total)`);
      });
      activityText += parts.join('; ') + '. ';

      if (todayTrades.length > 5) {
        activityText += `That's a lot of activity for one day. High-frequency trading tends to increase costs and emotional decision-making. Make sure each trade has a clear thesis behind it.`;
      }
      paragraphs.push(activityText);
    }

    // §6 — Goal Progress & Performance Context
    if (onTrack) {
      paragraphs.push(
        `You're on pace to hit your ${goals.target_annual_return_pct}% annual return goal. ` +
        `Your annualized return is currently ${annualizedReturn.toFixed(1)}%, which puts you ${(annualizedReturn - goals.target_annual_return_pct).toFixed(1)} percentage points ahead of target. ` +
        `That said, markets can shift quickly — don't let a good run make you overconfident or take on more risk than your plan allows.`
      );
    } else {
      const gap = goals.target_annual_return_pct - annualizedReturn;
      paragraphs.push(
        `You're currently trailing your ${goals.target_annual_return_pct}% annual return target by ${gap.toFixed(1)} percentage points ` +
        `(your annualized pace is ${annualizedReturn.toFixed(1)}%). ` +
        `Before making changes, ask yourself: is this a process problem or just bad timing? ` +
        `If your thesis for each trade was solid, stick with your approach. ` +
        `If you notice repeated mistakes (like chasing momentum or holding losers too long), that's what needs fixing — not the target.`
      );
    }

    // §7 — Risk Assessment
    const ddPct = maxDrawdown;
    const ddLimit = goals.max_drawdown_pct;
    if (ddPct > ddLimit) {
      paragraphs.push(
        `🚨 Your maximum drawdown has reached ${ddPct.toFixed(1)}%, which exceeds your ${ddLimit}% risk limit. ` +
        `This is a serious concern. At some point during your trading, you lost more than you said you were willing to lose. ` +
        `This usually happens when position sizes are too large relative to the portfolio, or when losses are left to run without stop-losses. ` +
        `Consider reducing position sizes on your next trades and setting firm exit points before entering.`
      );
    } else if (ddPct > ddLimit * 0.7) {
      paragraphs.push(
        `Your maximum drawdown stands at ${ddPct.toFixed(1)}%, which is approaching your ${ddLimit}% limit ` +
        `(only ${(ddLimit - ddPct).toFixed(1)}% of buffer remaining). ` +
        `You're not in the danger zone yet, but one bad position could push you over. ` +
        `This might be a good time to tighten stop-losses on your weaker holdings and avoid adding new risk.`
      );
    } else {
      paragraphs.push(
        `Your risk management looks solid. The worst drawdown you've experienced is ${ddPct.toFixed(1)}%, ` +
        `well within your ${ddLimit}% comfort zone with ${(ddLimit - ddPct).toFixed(1)}% of buffer. ` +
        `Keep doing what you're doing — protecting capital is just as important as growing it.`
      );
    }

    // §8 — Win/Loss Analysis
    if (closedTrades.length >= 3) {
      const lossCount = closedTrades.length - winCount;
      // Calculate average win/loss size
      let totalWinAmt = 0, totalLossAmt = 0;
      closedTrades.forEach(t => {
        const buyTrade = sortedTrades.find(
          bt => bt.ticker === t.ticker && bt.action === 'buy' && new Date(bt.executed_at) < new Date(t.executed_at)
        );
        if (buyTrade) {
          const profit = (t.price_at_execution - buyTrade.price_at_execution) * t.quantity;
          if (profit >= 0) totalWinAmt += profit;
          else totalLossAmt += Math.abs(profit);
        }
      });
      const avgWin = winCount > 0 ? totalWinAmt / winCount : 0;
      const avgLoss = lossCount > 0 ? totalLossAmt / lossCount : 0;
      const profitFactor = totalLossAmt > 0 ? totalWinAmt / totalLossAmt : totalWinAmt > 0 ? Infinity : 0;

      paragraphs.push(
        `Across your ${closedTrades.length} closed trades, you've won ${winCount} and lost ${lossCount} (${winRate.toFixed(0)}% win rate). ` +
        (avgWin > 0 || avgLoss > 0
          ? `Your average winner made ${fmtUSD(avgWin, 2)} and your average loser cost ${fmtUSD(avgLoss, 2)}. ` +
            (profitFactor >= 1.5
              ? `Your profit factor is ${profitFactor.toFixed(1)}x, meaning your winners significantly outpace your losers. That's a strong edge — keep it up.`
              : profitFactor >= 1.0
              ? `Your profit factor is ${profitFactor.toFixed(1)}x — you're making money, but the margin is thin. Try to let your winners run longer or cut your losers earlier.`
              : `Your profit factor is below 1.0, which means your losses are outpacing your gains. Focus on position sizing and stricter stop-losses.`)
          : '')
      );
    } else if (closedTrades.length > 0) {
      paragraphs.push(
        `You've closed ${closedTrades.length} trade${closedTrades.length !== 1 ? 's' : ''} so far. ` +
        `Once you have a few more, the journal will start tracking your win rate and average gain/loss to help you spot patterns.`
      );
    }

    // §9 — Backtest Comparison
    if (backtestResults) {
      const bt = backtestResults;
      const btReturn = bt.totalReturn ?? bt.total_return ?? bt.cagr ?? null;
      if (btReturn !== null) {
        const diff = totalReturn - btReturn;
        paragraphs.push(
          diff >= 0
            ? `Your live performance (${fmtPct(totalReturn)}) is beating your backtest${strategyName ? ` (${strategyName})` : ''} ` +
              `projection of ${fmtPct(btReturn)} by ${diff.toFixed(1)} percentage points. ` +
              `This suggests either good execution, favorable market conditions, or improvements you've made to the strategy. Keep tracking this gap over time.`
            : `Your live performance (${fmtPct(totalReturn)}) is behind your backtest${strategyName ? ` (${strategyName})` : ''} ` +
              `expectation of ${fmtPct(btReturn)} by ${Math.abs(diff).toFixed(1)} points. ` +
              `Slippage between backtest and live trading is normal — it can come from timing, fees, or emotional exits. ` +
              `Review your last few trades to see if you deviated from the strategy.`
        );
      }
    }

    // §10 — Cash Deployment Context
    const deployedPct = 100 - cashPct;
    if (goals.risk_budget_pct > 0) {
      if (deployedPct > goals.risk_budget_pct) {
        paragraphs.push(
          `⚠️ You currently have ${deployedPct.toFixed(0)}% of your capital deployed in positions, which exceeds your ${goals.risk_budget_pct}% risk budget. ` +
          `This means you have less cash reserve than planned. If the market drops, you won't have dry powder to buy the dip or manage margin. ` +
          `Consider trimming a position to bring your deployment back within budget.`
        );
      } else if (deployedPct < goals.risk_budget_pct * 0.5 && positions.length > 0) {
        paragraphs.push(
          `You're only using ${deployedPct.toFixed(0)}% of your ${goals.risk_budget_pct}% risk budget. ` +
          `Having extra cash is conservative and safe, but if you have high-conviction ideas, you have room to add exposure. ` +
          `Just make sure any new position fits your overall strategy and doesn't concentrate risk.`
        );
      }
    }

    // Title
    const emoji = onTrack ? '✅' : (totalReturn >= 0 ? '📈' : '📉');
    const title = `${emoji} ${format(new Date(), 'MMMM d, yyyy')} — ${fmtPct(totalReturn)} overall, portfolio at ${fmtUSD(currentValue)}`;

    const metrics = {
      totalReturn: parseFloat(totalReturn.toFixed(2)),
      annualizedReturn: parseFloat(annualizedReturn.toFixed(2)),
      maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
      winRate: parseFloat(winRate.toFixed(1)),
      positionCount: positions.length,
      cashPct: parseFloat(cashPct.toFixed(1)),
      daysActive,
      portfolioDayPnL: parseFloat(portfolioDayPnL.toFixed(2)),
      benchmarkDayChange: benchmarkQuote?.changePercent ? parseFloat(benchmarkQuote.changePercent.toFixed(2)) : null,
    };

    const benchmarkComparison = {
      benchmark: benchmarkTicker,
      benchmarkPrice: benchmarkQuote?.price ?? null,
      benchmarkChange: benchmarkQuote?.changePercent ?? null,
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
      const result = await buildJournalContent();
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

          <ScrollArea className="max-h-[700px]">
            <div className="space-y-6">
              {sortedDates.map((date) => {
                const dateEntries = groupedEntries[date] || [];
                const isToday = date === today;
                
                return dateEntries.map((entry) => {
                  const metrics = entry.metrics as Record<string, any>;
                  const returnVal = metrics?.totalReturn;
                  const isPositive = returnVal !== undefined && returnVal >= 0;

                  return (
                    <div key={entry.id} className="border-b border-border/30 pb-5 last:border-b-0 last:pb-0">
                      {/* Date header */}
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`shrink-0 w-10 h-10 rounded-full flex flex-col items-center justify-center text-[10px] font-medium ${
                          isToday ? 'bg-primary/15 text-primary border border-primary/30' : 'bg-muted text-muted-foreground'
                        }`}>
                          <span className="leading-none">{format(parseISO(date), 'MMM')}</span>
                          <span className="text-sm font-bold leading-none">{format(parseISO(date), 'd')}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{format(parseISO(date), 'EEEE, MMMM d, yyyy')}</span>
                            {isToday && (
                              <Badge className="text-[9px] h-4 bg-primary/20 text-primary border-primary/30">Today</Badge>
                            )}
                          </div>
                          {returnVal !== undefined && (
                            <div className={`flex items-center gap-1 text-xs font-mono font-medium mt-0.5 ${isPositive ? 'text-success' : 'text-destructive'}`}>
                              {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                              {isPositive ? '+' : ''}{returnVal}% overall
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Full narrative — always visible */}
                      <div className="space-y-3 mb-3">
                        {entry.content.split('\n\n').map((paragraph, i) => {
                          const hasWarning = paragraph.includes('⚠️') || paragraph.includes('🚨');

                          if (hasWarning) {
                            return (
                              <div key={i} className="flex gap-2 p-2.5 rounded-lg border bg-destructive/5 border-destructive/20">
                                <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                                <p className="text-xs text-foreground/90 leading-relaxed">{paragraph.replace(/⚠️|🚨/g, '').trim()}</p>
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

                      {/* Metric pills underneath */}
                      {metrics && (
                        <div className="flex flex-wrap gap-1.5">
                          {metrics.portfolioDayPnL != null && metrics.portfolioDayPnL !== 0 && (
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                              metrics.portfolioDayPnL >= 0
                                ? 'bg-success/10 text-success border-success/20'
                                : 'bg-destructive/10 text-destructive border-destructive/20'
                            }`}>
                              Day P&L: {metrics.portfolioDayPnL >= 0 ? '+' : ''}{fmtUSD(metrics.portfolioDayPnL, 2)}
                            </span>
                          )}
                          {metrics.benchmarkDayChange != null && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/30">
                              SPY: {fmtPct(metrics.benchmarkDayChange, 2)}
                            </span>
                          )}
                          {metrics.maxDrawdown !== undefined && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/30">
                              Max DD: -{metrics.maxDrawdown}%
                            </span>
                          )}
                          {metrics.winRate !== undefined && metrics.winRate > 0 && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/30">
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
                              Cash: {metrics.cashPct}%
                            </span>
                          )}
                          {metrics.daysActive !== undefined && metrics.daysActive > 0 && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/30">
                              Day {metrics.daysActive}
                            </span>
                          )}
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
