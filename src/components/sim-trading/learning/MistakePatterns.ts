/**
 * Mistake Pattern Detection
 * Analyzes trade history to identify recurring behavioral biases
 */
import { useMemo } from 'react';
import type { SimTrade } from '../SimPortfolioDetail';
import type { Position } from '../SimPortfolioDetail';

export interface MistakePattern {
  id: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  occurrences: number;
  icon: string;
  lesson: string;
  howToFix: string;
}

interface AnalysisInput {
  trades: SimTrade[];
  positions: Position[];
  initialCapital: number;
  currentValue: number;
  cashBalance: number;
  goals?: { max_drawdown_pct: number; risk_budget_pct: number; target_annual_return_pct: number } | null;
}

export function detectMistakePatterns(input: AnalysisInput): MistakePattern[] {
  const { trades, positions, initialCapital, currentValue, cashBalance, goals } = input;
  const patterns: MistakePattern[] = [];

  if (trades.length < 2) return patterns;

  const sortedTrades = [...trades].sort((a, b) =>
    new Date(a.executed_at).getTime() - new Date(b.executed_at).getTime()
  );

  // 1. Concentration repeat offender
  const concentrationViolations = positions.filter(p => {
    const pct = ((p.current_value || 0) / currentValue) * 100;
    return pct > 20;
  });
  if (concentrationViolations.length >= 2) {
    patterns.push({
      id: 'concentration_repeat',
      name: 'Concentration Repeat Offender',
      description: `You have ${concentrationViolations.length} positions exceeding 20% of your portfolio (${concentrationViolations.map(p => p.ticker).join(', ')}). This pattern significantly increases idiosyncratic risk.`,
      severity: 'high',
      occurrences: concentrationViolations.length,
      icon: '🎯',
      lesson: 'Concentration bias — overconfidence in a few names leads to outsized losses when they move against you.',
      howToFix: 'Before adding to a position >10%, ask: "Would I bet my whole portfolio on this?" If not, trim to 5-10%.',
    });
  }

  // 2. Chasing — buying after big up moves
  const buyTrades = sortedTrades.filter(t => t.action === 'buy');
  const sameDayDoubleBuys = new Map<string, number>();
  for (const t of buyTrades) {
    const key = `${t.ticker}-${t.executed_at.split('T')[0]}`;
    sameDayDoubleBuys.set(key, (sameDayDoubleBuys.get(key) || 0) + 1);
  }
  const chasingCount = [...sameDayDoubleBuys.values()].filter(v => v > 1).length;
  if (chasingCount >= 2) {
    patterns.push({
      id: 'chasing',
      name: 'Chasing Momentum',
      description: `You've made multiple buys of the same stock on the same day ${chasingCount} times. This often indicates FOMO — buying because price is moving up rather than based on analysis.`,
      severity: 'medium',
      occurrences: chasingCount,
      icon: '🏃',
      lesson: 'FOMO (Fear Of Missing Out) leads to buying at highs. The best entries come from patience, not urgency.',
      howToFix: 'Use limit orders placed the night before instead of market orders during volatile sessions. Wait 24 hours before adding to a position.',
    });
  }

  // 3. Selling winners too early, holding losers too long (disposition effect)
  const sells = sortedTrades.filter(t => t.action === 'sell' && t.instrument_type === 'stock');
  let winnersSoldEarly = 0;
  let losersHeld = 0;
  for (const sell of sells) {
    const buys = sortedTrades.filter(t =>
      t.action === 'buy' && t.ticker === sell.ticker &&
      new Date(t.executed_at) < new Date(sell.executed_at)
    );
    const avgBuyPrice = buys.length > 0
      ? buys.reduce((s, b) => s + b.price_at_execution, 0) / buys.length
      : sell.price_at_execution;

    const pnlPct = ((sell.price_at_execution - avgBuyPrice) / avgBuyPrice) * 100;
    const holdDays = (new Date(sell.executed_at).getTime() - new Date(buys[buys.length - 1]?.executed_at || sell.executed_at).getTime()) / (1000 * 60 * 60 * 24);

    if (pnlPct > 0 && holdDays < 3) winnersSoldEarly++;
    if (pnlPct < -10 && holdDays > 14) losersHeld++;
  }

  if (winnersSoldEarly >= 2) {
    patterns.push({
      id: 'disposition_winners',
      name: 'Cutting Winners Short',
      description: `You've sold ${winnersSoldEarly} profitable positions within 3 days of buying. Profitable trades need room to run.`,
      severity: 'medium',
      occurrences: winnersSoldEarly,
      icon: '✂️',
      lesson: 'The Disposition Effect — the tendency to sell winners too early and hold losers too long. It feels good to lock in profits, but it caps your upside.',
      howToFix: 'Set a profit target before entering (e.g., "I\'ll hold until 15% gain or until my thesis breaks"). Use trailing stops instead of market sells.',
    });
  }

  if (losersHeld >= 2) {
    patterns.push({
      id: 'disposition_losers',
      name: 'Holding Losers Too Long',
      description: `You've held ${losersHeld} losing positions (>10% loss) for over 2 weeks without cutting them. This ties up capital and amplifies drawdowns.`,
      severity: 'high',
      occurrences: losersHeld,
      icon: '🪤',
      lesson: 'Loss aversion — we hate realizing losses, so we hold and hope. But hope is not a strategy. The market doesn\'t know your cost basis.',
      howToFix: 'Set a max loss per position before entering (e.g., 7-10%). If a stock hits your stop, sell immediately. Pre-commit with stop-loss orders.',
    });
  }

  // 4. Overtrading
  const tradesByWeek = new Map<string, number>();
  for (const t of sortedTrades) {
    const d = new Date(t.executed_at);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toISOString().split('T')[0];
    tradesByWeek.set(key, (tradesByWeek.get(key) || 0) + 1);
  }
  const highTradeWeeks = [...tradesByWeek.values()].filter(v => v > 10).length;
  if (highTradeWeeks >= 2) {
    patterns.push({
      id: 'overtrading',
      name: 'Overtrading',
      description: `You've had ${highTradeWeeks} weeks with 10+ trades. High-frequency trading in a sim portfolio usually signals impulsive behavior rather than strategy execution.`,
      severity: 'medium',
      occurrences: highTradeWeeks,
      icon: '🔄',
      lesson: 'Activity bias — we feel productive when trading, but fees and bad timing eat returns. Most outperforming portfolios trade infrequently.',
      howToFix: 'Limit yourself to 3-5 trades per week. Before each trade, write down your thesis in one sentence. If you can\'t, don\'t trade.',
    });
  }

  // 5. All-in behavior (deploying >90% in one session)
  if (goals) {
    const deployedPct = ((currentValue - cashBalance) / currentValue) * 100;
    if (deployedPct > 95 && positions.length <= 3) {
      patterns.push({
        id: 'all_in',
        name: 'All-In Behavior',
        description: `You're ${deployedPct.toFixed(0)}% deployed across only ${positions.length} positions with almost no cash buffer. This maximizes risk.`,
        severity: 'high',
        occurrences: 1,
        icon: '🎰',
        lesson: 'Going all-in feels decisive but it leaves zero room for error. Professional fund managers always keep dry powder.',
        howToFix: `Keep at least ${100 - goals.risk_budget_pct}% in cash per your risk budget. Never deploy more than 10% per position without a clear thesis.`,
      });
    }
  }

  return patterns;
}
