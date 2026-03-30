/**
 * Trading Skill Badges & Achievements
 * Gamified progression for disciplined trading habits
 */

export interface TradingBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'discipline' | 'risk' | 'learning' | 'milestone';
  requirement: string;
  tier: 'bronze' | 'silver' | 'gold';
}

export const TRADING_BADGES: TradingBadge[] = [
  // Discipline
  { id: 'first_reflection', name: 'Self-Aware Trader', description: 'Complete your first post-trade reflection', icon: '🪞', category: 'discipline', requirement: '1 reflection', tier: 'bronze' },
  { id: 'five_reflections', name: 'Reflective Mind', description: 'Complete 5 post-trade reflections', icon: '🧠', category: 'discipline', requirement: '5 reflections', tier: 'silver' },
  { id: 'journal_streak_7', name: 'Journal Streak', description: 'Have journal entries for 7 consecutive days', icon: '📔', category: 'discipline', requirement: '7-day streak', tier: 'silver' },
  { id: 'thesis_trader', name: 'Thesis-Driven', description: 'Write a thesis for 10 trades in a row', icon: '📝', category: 'discipline', requirement: '10 thesis entries', tier: 'gold' },

  // Risk management
  { id: 'diversified_5', name: 'Diversifier', description: 'Hold 5+ positions simultaneously', icon: '🌈', category: 'risk', requirement: '5+ positions', tier: 'bronze' },
  { id: 'diversified_10', name: 'Truly Diversified', description: 'Hold 10+ positions with no single position >15%', icon: '🏛️', category: 'risk', requirement: '10+ positions, <15% each', tier: 'gold' },
  { id: 'risk_budget_30d', name: 'Risk Disciplined', description: 'Stay within risk budget for 30 days', icon: '🛡️', category: 'risk', requirement: '30 days within budget', tier: 'gold' },
  { id: 'drawdown_survivor', name: 'Drawdown Survivor', description: 'Recover from a 10%+ drawdown', icon: '🔥', category: 'risk', requirement: 'Recover from >10% DD', tier: 'silver' },
  { id: 'stop_loss_user', name: 'Controlled Exits', description: 'Use stop-loss orders on 5 trades', icon: '🚪', category: 'risk', requirement: '5 stop orders', tier: 'bronze' },

  // Learning
  { id: 'first_report', name: 'Report Card Reader', description: 'View your first weekly report card', icon: '📊', category: 'learning', requirement: 'View 1 report', tier: 'bronze' },
  { id: 'mistake_acknowledger', name: 'Growth Mindset', description: 'Acknowledge a mistake pattern', icon: '🌱', category: 'learning', requirement: 'View mistake patterns', tier: 'bronze' },
  { id: 'all_a_grades', name: 'Honor Roll', description: 'Get all A grades on a weekly report', icon: '🏆', category: 'learning', requirement: 'All A grades in a week', tier: 'gold' },
  { id: 'education_explorer', name: 'Knowledge Seeker', description: 'Read 10 educational explanations', icon: '📚', category: 'learning', requirement: '10 learn-more clicks', tier: 'silver' },

  // Milestones
  { id: 'first_trade', name: 'Market Debut', description: 'Execute your first simulated trade', icon: '🎬', category: 'milestone', requirement: '1 trade', tier: 'bronze' },
  { id: 'ten_trades', name: 'Active Trader', description: 'Execute 10 simulated trades', icon: '📈', category: 'milestone', requirement: '10 trades', tier: 'bronze' },
  { id: 'fifty_trades', name: 'Seasoned Trader', description: 'Execute 50 simulated trades', icon: '🎖️', category: 'milestone', requirement: '50 trades', tier: 'silver' },
  { id: 'positive_month', name: 'Green Month', description: 'Finish a calendar month with positive returns', icon: '💚', category: 'milestone', requirement: 'Monthly return > 0%', tier: 'silver' },
  { id: 'beat_benchmark', name: 'Alpha Generator', description: 'Outperform SPY over a 30-day period', icon: '👑', category: 'milestone', requirement: 'Beat SPY for 30 days', tier: 'gold' },
];

export function checkBadgeEligibility(context: {
  tradeCount: number;
  positionCount: number;
  reflectionCount: number;
  maxPositionPct: number;
  stopOrderCount: number;
  journalStreakDays: number;
  hasViewedReport: boolean;
  hasViewedMistakes: boolean;
  educationClicks: number;
}): string[] {
  const earned: string[] = [];
  const c = context;

  if (c.tradeCount >= 1) earned.push('first_trade');
  if (c.tradeCount >= 10) earned.push('ten_trades');
  if (c.tradeCount >= 50) earned.push('fifty_trades');
  if (c.reflectionCount >= 1) earned.push('first_reflection');
  if (c.reflectionCount >= 5) earned.push('five_reflections');
  if (c.positionCount >= 5) earned.push('diversified_5');
  if (c.positionCount >= 10 && c.maxPositionPct < 15) earned.push('diversified_10');
  if (c.stopOrderCount >= 5) earned.push('stop_loss_user');
  if (c.journalStreakDays >= 7) earned.push('journal_streak_7');
  if (c.hasViewedReport) earned.push('first_report');
  if (c.hasViewedMistakes) earned.push('mistake_acknowledger');
  if (c.educationClicks >= 10) earned.push('education_explorer');

  return earned;
}
