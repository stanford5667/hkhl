/**
 * Weekly Portfolio Report Card
 * Grades the user's trading discipline across multiple dimensions
 */
import { differenceInDays, parseISO, startOfWeek, format } from 'date-fns';
import type { SimTrade } from '../SimPortfolioDetail';
import type { Position } from '../SimPortfolioDetail';

export interface ReportGrade {
  category: string;
  grade: string;
  score: number;
  detail: string;
  tip: string;
  icon: string;
}

export interface WeeklyReport {
  weekStart: string;
  overallGrade: string;
  grades: ReportGrade[];
  insights: string[];
  improvementTips: string[];
  metrics: Record<string, number>;
}

function letterGrade(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

export function generateWeeklyReport(
  trades: SimTrade[],
  positions: Position[],
  initialCapital: number,
  currentValue: number,
  cashBalance: number,
  goals: { max_drawdown_pct: number; risk_budget_pct: number; target_annual_return_pct: number } | null,
  reflectionCount: number,
  journalEntryCount: number,
): WeeklyReport {
  const now = new Date();
  const weekStartDate = startOfWeek(now, { weekStartsOn: 1 });
  const weekStart = format(weekStartDate, 'yyyy-MM-dd');

  const weekTrades = trades.filter(t => {
    const td = new Date(t.executed_at);
    return td >= weekStartDate && td <= now;
  });

  const grades: ReportGrade[] = [];
  const insights: string[] = [];
  const tips: string[] = [];

  // 1. Diversification Score
  const posValues = positions.map(p => ((p.current_value || 0) / currentValue) * 100);
  const maxPosWeight = posValues.length > 0 ? Math.max(...posValues) : 0;
  const numPositions = positions.length;
  let divScore = 100;
  if (numPositions === 0) divScore = 50;
  else if (numPositions === 1) divScore = 30;
  else if (numPositions <= 3) divScore = 60;
  else if (numPositions <= 5) divScore = 75;
  else divScore = 90;
  if (maxPosWeight > 30) divScore -= 30;
  else if (maxPosWeight > 20) divScore -= 15;
  else if (maxPosWeight > 15) divScore -= 5;
  divScore = Math.max(0, Math.min(100, divScore));

  grades.push({
    category: 'Diversification',
    grade: letterGrade(divScore),
    score: divScore,
    detail: `${numPositions} positions, largest is ${maxPosWeight.toFixed(1)}% of portfolio.`,
    tip: divScore < 80 ? 'Add more positions across different sectors to reduce concentration risk.' : 'Good diversification! Keep monitoring position weights.',
    icon: '🌈',
  });

  // 2. Risk Management Score
  let riskScore = 80;
  const cashPct = (cashBalance / currentValue) * 100;
  if (cashPct < 5) riskScore -= 30;
  else if (cashPct < 10) riskScore -= 10;
  if (goals) {
    const deployedPct = 100 - cashPct;
    if (deployedPct > goals.risk_budget_pct) riskScore -= 25;
    else if (deployedPct > goals.risk_budget_pct * 0.9) riskScore -= 10;
  }
  // Bonus for using stop orders
  const stopOrders = weekTrades.filter(t => t.action === 'sell').length;
  if (stopOrders > 0) riskScore += 5;
  riskScore = Math.max(0, Math.min(100, riskScore));

  grades.push({
    category: 'Risk Management',
    grade: letterGrade(riskScore),
    score: riskScore,
    detail: `Cash: ${cashPct.toFixed(1)}%. ${goals ? `Deployed: ${(100 - cashPct).toFixed(0)}% of ${goals.risk_budget_pct}% budget.` : 'No goals set.'}`,
    tip: riskScore < 80 ? 'Maintain more cash buffer and stay within your risk budget constraints.' : 'Solid risk management this week.',
    icon: '🛡️',
  });

  // 3. Trade Discipline Score
  let disciplineScore = 70;
  const weekTradeCount = weekTrades.length;
  if (weekTradeCount === 0) {
    disciplineScore = 80; // Patience is discipline
    insights.push('No trades this week — patience is a sign of discipline.');
  } else if (weekTradeCount > 10) {
    disciplineScore -= 20;
    insights.push(`${weekTradeCount} trades this week — consider slowing down.`);
  }
  // Bonus for reflections
  if (reflectionCount > 0) disciplineScore += 15;
  disciplineScore = Math.max(0, Math.min(100, disciplineScore));

  grades.push({
    category: 'Trade Discipline',
    grade: letterGrade(disciplineScore),
    score: disciplineScore,
    detail: `${weekTradeCount} trades this week. ${reflectionCount} reflections recorded.`,
    tip: disciplineScore < 80 ? 'Write a thesis before each trade and review with reflections after.' : 'Great discipline — keep reflecting on your trades.',
    icon: '🎯',
  });

  // 4. Learning & Growth Score
  let learningScore = 50;
  if (reflectionCount >= 1) learningScore += 15;
  if (reflectionCount >= 3) learningScore += 10;
  if (journalEntryCount >= 3) learningScore += 15;
  if (journalEntryCount >= 5) learningScore += 10;
  learningScore = Math.max(0, Math.min(100, learningScore));

  grades.push({
    category: 'Learning & Growth',
    grade: letterGrade(learningScore),
    score: learningScore,
    detail: `${reflectionCount} trade reflections, ${journalEntryCount} journal entries this period.`,
    tip: learningScore < 80 ? 'Reflect on more trades and review your journal daily to accelerate learning.' : 'Excellent learning habits!',
    icon: '📚',
  });

  // 5. Goal Alignment
  if (goals) {
    let goalScore = 80;
    const totalReturn = ((currentValue - initialCapital) / initialCapital) * 100;
    const annualizedTarget = goals.target_annual_return_pct;

    if (totalReturn < 0) goalScore -= 15;
    // Check if on track
    const daysActive = trades.length > 0
      ? differenceInDays(now, parseISO(trades[0].executed_at))
      : 0;
    if (daysActive > 30) {
      const annualizedReturn = (Math.pow(currentValue / initialCapital, 365 / Math.max(daysActive, 1)) - 1) * 100;
      if (annualizedReturn >= annualizedTarget) goalScore += 10;
      else goalScore -= 10;
    }
    goalScore = Math.max(0, Math.min(100, goalScore));

    grades.push({
      category: 'Goal Alignment',
      grade: letterGrade(goalScore),
      score: goalScore,
      detail: `Target: ${annualizedTarget}% annual return. Current portfolio return: ${((currentValue - initialCapital) / initialCapital * 100).toFixed(1)}%.`,
      tip: goalScore < 80 ? 'Review your positions against your stated goals. Are you taking trades that serve your objective?' : 'Portfolio is aligned with your goals.',
      icon: '🎯',
    });
  }

  // Overall grade
  const avgScore = grades.reduce((sum, g) => sum + g.score, 0) / grades.length;
  const overallGrade = letterGrade(avgScore);

  // Generate improvement tips
  const weakest = [...grades].sort((a, b) => a.score - b.score).slice(0, 2);
  for (const w of weakest) {
    if (w.score < 80) {
      tips.push(`${w.icon} ${w.category}: ${w.tip}`);
    }
  }

  return {
    weekStart,
    overallGrade,
    grades,
    insights,
    improvementTips: tips,
    metrics: {
      avgScore: Math.round(avgScore),
      weekTrades: weekTrades.length,
      positionCount: numPositions,
      cashPct: Math.round(cashPct),
    },
  };
}
