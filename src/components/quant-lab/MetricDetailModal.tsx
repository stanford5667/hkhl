/**
 * MetricDetailModal - Interactive metric explanation component
 * Shows detailed information about each metric when clicked
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Calculator, TrendingUp, TrendingDown, Minus, 
  Lightbulb, BookOpen, Target, BarChart3, Info,
  ChevronRight, Database, ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Comprehensive metric definitions with formulas and explanations
const METRIC_DEFINITIONS: Record<string, {
  name: string;
  description: string;
  formula: string;
  interpretation: string;
  example: string;
  category: string;
  goodRange?: string;
  badRange?: string;
}> = {
  // Basic Statistics
  upDays: {
    name: 'Up Days',
    description: 'The number of trading days where the stock closed higher than it opened.',
    formula: 'Count of days where Close > Open',
    interpretation: 'A higher number of up days suggests the stock tends to gain during trading hours.',
    example: 'If a stock has 150 up days out of 252 trading days, it went up during trading 60% of the time.',
    category: 'Direction',
  },
  downDays: {
    name: 'Down Days',
    description: 'The number of trading days where the stock closed lower than it opened.',
    formula: 'Count of days where Close < Open',
    interpretation: 'More down days than up days may indicate persistent selling pressure.',
    example: 'A stock with 130 down days out of 252 was negative during trading on about 52% of days.',
    category: 'Direction',
  },
  upDayPercent: {
    name: 'Up Day %',
    description: 'The percentage of trading days that were positive (intraday).',
    formula: '(Up Days ÷ Total Days) × 100',
    interpretation: 'Above 50% means the stock goes up more often than down during trading hours.',
    example: 'An up day percent of 55% means the stock typically gains during the trading day.',
    category: 'Direction',
    goodRange: '> 52%',
    badRange: '< 48%',
  },
  winRate: {
    name: 'Win Rate',
    description: 'The percentage of days the stock closes higher than the previous day\'s close.',
    formula: '(Days with positive return ÷ Total Days) × 100',
    interpretation: 'A win rate above 50% means the stock goes up more days than it goes down.',
    example: 'SPY historically has a win rate around 53%, meaning it goes up more days than down.',
    category: 'Performance',
    goodRange: '> 52%',
    badRange: '< 48%',
  },
  avgGain: {
    name: 'Average Gain',
    description: 'The average percentage return on days when the stock goes up.',
    formula: 'Sum of positive returns ÷ Count of positive days',
    interpretation: 'Larger average gains paired with high win rate = strong upward momentum.',
    example: 'An average gain of 1.2% means on up days, the stock typically rises 1.2%.',
    category: 'Returns',
    goodRange: '> 1.0%',
  },
  avgLoss: {
    name: 'Average Loss',
    description: 'The average percentage loss on days when the stock goes down.',
    formula: 'Sum of negative returns ÷ Count of negative days',
    interpretation: 'Smaller average losses mean better downside protection.',
    example: 'An average loss of -0.8% means on down days, the stock typically falls 0.8%.',
    category: 'Returns',
    goodRange: '< 1.0%',
    badRange: '> 1.5%',
  },
  
  // Technical Indicators
  currentRsi: {
    name: 'Current RSI',
    description: 'Relative Strength Index measures momentum on a 0-100 scale.',
    formula: '100 - (100 ÷ (1 + (Avg Gain ÷ Avg Loss)))',
    interpretation: 'RSI > 70 = overbought (may pull back). RSI < 30 = oversold (may bounce).',
    example: 'An RSI of 75 suggests the stock has been rising quickly and may be due for a pause.',
    category: 'Momentum',
    goodRange: '30-70 (neutral)',
    badRange: '> 80 or < 20 (extreme)',
  },
  overboughtDays: {
    name: 'Overbought Days',
    description: 'Number of days when RSI was above the overbought threshold.',
    formula: 'Count of days where RSI > 70 (or your threshold)',
    interpretation: 'Many overbought days may signal a strong uptrend, but also potential reversal risk.',
    example: '50 overbought days in a year suggests strong bullish momentum.',
    category: 'Momentum',
  },
  oversoldDays: {
    name: 'Oversold Days',
    description: 'Number of days when RSI was below the oversold threshold.',
    formula: 'Count of days where RSI < 30 (or your threshold)',
    interpretation: 'Oversold conditions often precede bounces, but can persist in downtrends.',
    example: '20 oversold days may indicate periods of heavy selling.',
    category: 'Momentum',
  },
  returnAfterOverbought: {
    name: 'Return After Overbought',
    description: 'Average return in the days following an overbought signal.',
    formula: 'Average of N-day returns after RSI > 70',
    interpretation: 'Negative returns suggest overbought signals lead to pullbacks.',
    example: 'A -0.5% return after overbought means the stock typically dips 0.5% in the following days.',
    category: 'Signals',
  },
  returnAfterOversold: {
    name: 'Return After Oversold',
    description: 'Average return in the days following an oversold signal.',
    formula: 'Average of N-day returns after RSI < 30',
    interpretation: 'Positive returns suggest oversold signals are good buying opportunities.',
    example: 'A 1.2% return after oversold means the stock typically bounces 1.2% after being oversold.',
    category: 'Signals',
    goodRange: '> 0.5%',
  },
  
  // Moving Averages
  priceVsShortMa: {
    name: 'Price vs Short MA',
    description: 'How far the current price is from the short-term moving average.',
    formula: '((Price - Short MA) ÷ Short MA) × 100',
    interpretation: 'Positive = price above average (bullish). Negative = price below (bearish).',
    example: '+5% means price is 5% above the short-term average - could be extended.',
    category: 'Trend',
  },
  priceVsMediumMa: {
    name: 'Price vs Medium MA',
    description: 'How far the current price is from the medium-term (50-day) moving average.',
    formula: '((Price - 50 MA) ÷ 50 MA) × 100',
    interpretation: 'Price above 50 MA = intermediate uptrend. Below = intermediate downtrend.',
    example: '-3% means price is 3% below the 50-day average - short-term weakness.',
    category: 'Trend',
  },
  priceVsLongMa: {
    name: 'Price vs Long MA',
    description: 'How far the current price is from the long-term (200-day) moving average.',
    formula: '((Price - 200 MA) ÷ 200 MA) × 100',
    interpretation: 'Above 200 MA = long-term uptrend (bull market). Below = bear market.',
    example: '+15% above 200 MA indicates a strong bull market.',
    category: 'Trend',
    goodRange: '> 0%',
    badRange: '< 0%',
  },
  maAlignment: {
    name: 'MA Alignment',
    description: 'Whether moving averages are properly stacked for a trend.',
    formula: 'Check if Short MA > Medium MA > Long MA (bullish) or reverse (bearish)',
    interpretation: 'Aligned MAs confirm trend. Crossed/tangled MAs suggest transition.',
    example: '"Bullish" alignment means 20 MA > 50 MA > 200 MA - strong uptrend.',
    category: 'Trend',
  },
  
  // Trend Strength
  trendScore: {
    name: 'Trend Score',
    description: 'A composite score (1-5) measuring overall trend strength.',
    formula: 'Sum of: MA alignment (+1-2), Higher highs (+1), Price position (+1)',
    interpretation: '5 = very strong uptrend, 1 = strong downtrend, 3 = neutral/mixed.',
    example: 'A score of 4.5 indicates a strong uptrend with most indicators aligned.',
    category: 'Trend',
    goodRange: '≥ 4',
    badRange: '≤ 2',
  },
  
  // Volatility
  volatility: {
    name: 'Volatility',
    description: 'How much the stock\'s price typically moves (annualized standard deviation).',
    formula: 'Standard Deviation of daily returns × √252',
    interpretation: 'Higher volatility = larger price swings (more risk and opportunity).',
    example: '30% volatility means the stock could move ±30% in a year (1 std dev).',
    category: 'Risk',
    goodRange: '15-30%',
    badRange: '> 50%',
  },
  atr: {
    name: 'ATR (Average True Range)',
    description: 'The average daily trading range in dollars.',
    formula: 'Average of: Max(High-Low, |High-PrevClose|, |Low-PrevClose|)',
    interpretation: 'Larger ATR = more volatile. Use for stop-loss and position sizing.',
    example: 'ATR of $5 on a $100 stock means it typically moves $5/day.',
    category: 'Risk',
  },
  atrPercent: {
    name: 'ATR %',
    description: 'Average True Range as a percentage of price.',
    formula: '(ATR ÷ Current Price) × 100',
    interpretation: 'Better for comparing volatility across different priced stocks.',
    example: '2% ATR means the stock moves about 2% on a typical day.',
    category: 'Risk',
    goodRange: '1-3%',
    badRange: '> 5%',
  },
  
  // Drawdown
  maxDrawdown: {
    name: 'Max Drawdown',
    description: 'The largest peak-to-trough decline during the period.',
    formula: 'Max(Peak Price - Trough Price) ÷ Peak Price × 100',
    interpretation: 'Shows worst-case historical loss. Important for risk management.',
    example: 'A 35% max drawdown means at worst, the stock fell 35% from its high.',
    category: 'Risk',
    goodRange: '< 20%',
    badRange: '> 40%',
  },
  currentDrawdown: {
    name: 'Current Drawdown',
    description: 'How far below the all-time high the stock currently is.',
    formula: '(Current Price - All-Time High) ÷ All-Time High × 100',
    interpretation: '0% = at highs. Large negative = potentially oversold or in trouble.',
    example: '-15% current drawdown means the stock is 15% below its peak.',
    category: 'Risk',
  },
  avgRecoveryDays: {
    name: 'Avg Recovery Days',
    description: 'How long it typically takes to recover from significant drops.',
    formula: 'Average days from drawdown trough to new high',
    interpretation: 'Shorter recovery = more resilient stock. Longer = more patience needed.',
    example: 'Average recovery of 45 days means drops typically recover in 1.5 months.',
    category: 'Risk',
    goodRange: '< 60 days',
    badRange: '> 120 days',
  },
  
  // Volume
  avgVolume: {
    name: 'Average Volume',
    description: 'The average number of shares traded per day.',
    formula: 'Sum of daily volume ÷ Number of days',
    interpretation: 'Higher volume = more liquidity and easier to trade without moving price.',
    example: '10M average volume means 10 million shares change hands daily.',
    category: 'Volume',
  },
  volumeTrend: {
    name: 'Volume Trend',
    description: 'Whether volume is increasing or decreasing over time.',
    formula: 'Compare recent average volume to longer-term average',
    interpretation: 'Rising volume with price = strong conviction. Falling volume = weakening.',
    example: '"Increasing" volume trend suggests growing interest in the stock.',
    category: 'Volume',
  },
  upDayVolRatio: {
    name: 'Up Day Volume Ratio',
    description: 'Ratio of volume on up days vs down days.',
    formula: 'Average volume on up days ÷ Average volume on down days',
    interpretation: '> 1 = more volume on up days (accumulation). < 1 = distribution.',
    example: 'Ratio of 1.3 means 30% more volume on up days - healthy buying pressure.',
    category: 'Volume',
    goodRange: '> 1.0',
    badRange: '< 0.8',
  },
  
  // Seasonality
  bestDay: {
    name: 'Best Day',
    description: 'The day of the week with the highest average return.',
    formula: 'Day with highest mean return across all weeks',
    interpretation: 'Some stocks show consistent day-of-week patterns.',
    example: '"Monday" being best might suggest weekend news creates buying opportunity.',
    category: 'Timing',
  },
  worstDay: {
    name: 'Worst Day',
    description: 'The day of the week with the lowest average return.',
    formula: 'Day with lowest mean return across all weeks',
    interpretation: 'Avoid buying on historically weak days.',
    example: '"Friday" being worst might indicate end-of-week profit taking.',
    category: 'Timing',
  },
  bestMonth: {
    name: 'Best Month',
    description: 'The calendar month with the highest average return.',
    formula: 'Month with highest mean return across all years',
    interpretation: 'Seasonal patterns can inform timing of entries.',
    example: '"November" historically strong for many stocks (holiday effect).',
    category: 'Timing',
  },
  worstMonth: {
    name: 'Worst Month',
    description: 'The calendar month with the lowest average return.',
    formula: 'Month with lowest mean return across all years',
    interpretation: '"Sell in May" reflects common seasonal weakness.',
    example: '"September" is historically the worst month for stocks.',
    category: 'Timing',
  },
  
  // Gaps
  avgGapUp: {
    name: 'Avg Gap Up',
    description: 'The average size of gap-up opens (open above prior close).',
    formula: 'Average of (Open - Prior Close) when positive',
    interpretation: 'Larger gap-ups suggest strong overnight news/sentiment.',
    example: 'Avg gap up of 0.8% means the stock opens 0.8% higher after positive overnight news.',
    category: 'Patterns',
  },
  avgGapDown: {
    name: 'Avg Gap Down',
    description: 'The average size of gap-down opens (open below prior close).',
    formula: 'Average of (Open - Prior Close) when negative',
    interpretation: 'Larger gap-downs suggest vulnerability to overnight risk.',
    example: 'Avg gap down of -1.2% means bad news causes the stock to open 1.2% lower.',
    category: 'Patterns',
  },
  gapFillRate: {
    name: 'Gap Fill Rate',
    description: 'How often gaps get filled during the same trading day.',
    formula: '(Gaps that filled ÷ Total gaps) × 100',
    interpretation: 'High fill rate = gaps are trading opportunities. Low = gaps predict direction.',
    example: '60% gap fill rate means most gaps reverse during the day.',
    category: 'Patterns',
  },
  
  // Mean Reversion
  meanReversionRate: {
    name: 'Mean Reversion Rate',
    description: 'How often extreme moves reverse the next day.',
    formula: '(Reversals after large moves ÷ Total large moves) × 100',
    interpretation: 'High rate = buy dips, sell rips works. Low rate = trend following works.',
    example: '65% mean reversion suggests buying after big drops is usually profitable.',
    category: 'Patterns',
    goodRange: '> 55%',
  },
  avgBounce: {
    name: 'Avg Bounce',
    description: 'Average return after large down moves.',
    formula: 'Average next-day return after moves below -2 std devs',
    interpretation: 'Larger bounces = better opportunities to buy the dip.',
    example: 'Avg bounce of 1.5% means buying after big drops typically yields 1.5% gain.',
    category: 'Patterns',
  },
  
  // Streaks
  longestUpStreak: {
    name: 'Longest Up Streak',
    description: 'The maximum consecutive up days in the period.',
    formula: 'Max count of consecutive days with positive returns',
    interpretation: 'Longer streaks = stronger momentum but also potential exhaustion.',
    example: 'Longest up streak of 12 days shows the stock can have extended rallies.',
    category: 'Patterns',
  },
  longestDownStreak: {
    name: 'Longest Down Streak',
    description: 'The maximum consecutive down days in the period.',
    formula: 'Max count of consecutive days with negative returns',
    interpretation: 'Longer down streaks = capitulation risk but also buying opportunities.',
    example: 'Longest down streak of 8 days shows the stock can have painful corrections.',
    category: 'Patterns',
  },
  avgUpStreak: {
    name: 'Avg Up Streak',
    description: 'Average length of consecutive up days.',
    formula: 'Mean length of all up streaks',
    interpretation: 'Typical duration of rallies - helps set expectations.',
    example: 'Avg up streak of 3.2 days means rallies typically last about 3 days.',
    category: 'Patterns',
  },
  
  // Price Targets
  target1StdUp: {
    name: 'Target (+1 Std)',
    description: 'Price target one standard deviation above current price.',
    formula: 'Current Price × (1 + Volatility ÷ √252 × Days)',
    interpretation: '~68% probability price stays within ±1 std dev range.',
    example: '$115 target at +1 std means there\'s ~16% chance price exceeds this.',
    category: 'Targets',
  },
  target1StdDown: {
    name: 'Target (-1 Std)',
    description: 'Price target one standard deviation below current price.',
    formula: 'Current Price × (1 - Volatility ÷ √252 × Days)',
    interpretation: 'Potential downside at normal volatility - use for stop placement.',
    example: '$92 target at -1 std means ~16% chance price falls below this.',
    category: 'Targets',
  },
  
  // Close vs Open Analysis
  bias: {
    name: 'Bias',
    description: 'The overall directional tendency based on close positions - bullish (closes near highs), bearish (closes near lows), or neutral.',
    formula: 'Based on avgClosePosition: > 55% = Bullish, < 45% = Bearish, else Neutral',
    interpretation: 'A bullish bias suggests buyers are in control; bearish bias suggests sellers dominate.',
    example: 'Bullish bias means the stock tends to close near its daily highs more often.',
    category: 'Pressure',
  },
  avgClosePositionPct: {
    name: 'Avg Close Position',
    description: 'Where price closes within the day\'s range on average. 100% = closes at high, 0% = closes at low.',
    formula: 'Average of [(Close - Low) ÷ (High - Low) × 100] for each day',
    interpretation: 'Above 50% suggests buying pressure; below 50% suggests selling pressure.',
    example: 'Avg close position of 62% means the stock typically closes in the upper portion of its daily range.',
    category: 'Pressure',
    goodRange: '> 55%',
    badRange: '< 45%',
  },
  greenDaysPct: {
    name: 'Green Days %',
    description: 'Percentage of days where close > open (intraday gains).',
    formula: '(Days where Close > Open) ÷ Total Days × 100',
    interpretation: 'Above 50% means the stock goes up more often than down during trading hours.',
    example: 'Green days of 58% means the stock gains during the trading session 58% of the time.',
    category: 'Direction',
    goodRange: '> 52%',
    badRange: '< 48%',
  },
  redDaysPct: {
    name: 'Red Days %',
    description: 'Percentage of days where close < open (intraday losses).',
    formula: '(Days where Close < Open) ÷ Total Days × 100',
    interpretation: 'Below 50% is healthy; consistently above 50% suggests persistent selling pressure.',
    example: 'Red days of 42% means the stock declines during trading on 42% of days.',
    category: 'Direction',
    goodRange: '< 48%',
    badRange: '> 52%',
  },
  closedNearHighPct: {
    name: 'Closed Near High %',
    description: 'Percentage of days where price closed in the top 20% of the day\'s range.',
    formula: '(Days where ClosePosition > 80%) ÷ Total Days × 100',
    interpretation: 'High percentage = strong buying conviction; buyers push price up into close.',
    example: 'Closed near high 35% of the time means buyers frequently took control into the close.',
    category: 'Pressure',
    goodRange: '> 25%',
  },
  closedNearLowPct: {
    name: 'Closed Near Low %',
    description: 'Percentage of days where price closed in the bottom 20% of the day\'s range.',
    formula: '(Days where ClosePosition < 20%) ÷ Total Days × 100',
    interpretation: 'High percentage = selling pressure dominates; sellers push price down into close.',
    example: 'Closed near low 30% of the time suggests sellers frequently won by end of day.',
    category: 'Pressure',
    badRange: '> 30%',
  },
  dojiDaysPct: {
    name: 'Doji Days %',
    description: 'Percentage of days with very small body relative to range (indecision candles).',
    formula: '(Days where |Close - Open| / Range < Threshold) ÷ Total Days × 100',
    interpretation: 'High doji % = market indecision; often precedes breakouts or reversals.',
    example: 'Doji days of 15% means about 1 in 7 days shows indecision between buyers and sellers.',
    category: 'Patterns',
  },
  strongGreenDaysPct: {
    name: 'Strong Green Days %',
    description: 'Percentage of days with a large positive move from open to close.',
    formula: '(Days where (Close - Open) / Open ≥ Threshold%) ÷ Total Days × 100',
    interpretation: 'High strong green % = bullish momentum with conviction moves.',
    example: 'Strong green days of 20% means 1 in 5 days sees a significant intraday rally.',
    category: 'Momentum',
    goodRange: '> 15%',
  },
  strongRedDaysPct: {
    name: 'Strong Red Days %',
    description: 'Percentage of days with a large negative move from open to close.',
    formula: '(Days where (Open - Close) / Open ≥ Threshold%) ÷ Total Days × 100',
    interpretation: 'High strong red % = vulnerability to sharp intraday selloffs.',
    example: 'Strong red days of 12% means about 1 in 8 days sees a significant intraday decline.',
    category: 'Momentum',
    badRange: '> 20%',
  },
  
  // Conditional Probability Studies
  occurrences: {
    name: 'Occurrences',
    description: 'The number of times this specific condition was triggered in the historical data.',
    formula: 'Count of days where condition = TRUE',
    interpretation: 'More occurrences = more reliable statistics. Less than 30 occurrences may not be statistically significant.',
    example: 'If "After -3% Drop" shows 47 occurrences, the condition happened 47 times in the analyzed period.',
    category: 'Conditional',
  },
  forwardReturn: {
    name: 'Forward Return',
    description: 'The average return over the forward period after the condition was triggered.',
    formula: 'Mean of [(Price at T+N - Price at T) ÷ Price at T × 100] for all trigger dates',
    interpretation: 'Positive = condition leads to gains. Negative = condition leads to losses. Compare to unconditional average.',
    example: 'Forward return of +2.3% means after the condition, the stock gained 2.3% on average over the forward period.',
    category: 'Conditional',
    goodRange: '> 0%',
  },
  avgForwardReturn: {
    name: 'Avg Forward Return',
    description: 'The average percentage return in the N days following the trigger condition.',
    formula: 'Σ(Forward Returns) ÷ Number of Occurrences',
    interpretation: 'Compare to the unconditional average return. Significant deviation indicates predictive value.',
    example: 'If avg forward return is +1.8% vs unconditional +0.5%, the condition predicts above-average gains.',
    category: 'Conditional',
  },
  medianForwardReturn: {
    name: 'Median Forward Return',
    description: 'The middle value of all forward returns, less affected by outliers than the mean.',
    formula: 'Middle value when all forward returns are sorted',
    interpretation: 'If median differs significantly from mean, there are outliers skewing the average.',
    example: 'Median of +1.2% with mean of +2.5% suggests a few large gains are pulling up the average.',
    category: 'Conditional',
  },
  forwardWinRate: {
    name: 'Forward Win Rate',
    description: 'The percentage of times the forward return was positive after the condition triggered.',
    formula: '(Positive forward returns ÷ Total occurrences) × 100',
    interpretation: '> 50% = condition predicts up moves more often. > 60% = strong predictive signal.',
    example: 'Win rate of 68% means after this condition, the stock went up 68% of the time.',
    category: 'Conditional',
    goodRange: '> 55%',
    badRange: '< 45%',
  },
  forwardVolatility: {
    name: 'Forward Volatility',
    description: 'Standard deviation of forward returns after the condition.',
    formula: '√[Σ(Returnᵢ - Mean)² ÷ (n-1)]',
    interpretation: 'Higher volatility = less reliable prediction. Low volatility = more consistent outcomes.',
    example: 'Forward volatility of 3.2% means outcomes after the condition vary by about ±3.2%.',
    category: 'Conditional',
  },
  bestOutcome: {
    name: 'Best Outcome',
    description: 'The maximum forward return observed after the condition triggered.',
    formula: 'Max(all forward returns)',
    interpretation: 'Shows the upside potential after this condition occurs.',
    example: 'Best outcome of +12.5% means the biggest gain after this condition was 12.5%.',
    category: 'Conditional',
  },
  worstOutcome: {
    name: 'Worst Outcome',
    description: 'The minimum forward return observed after the condition triggered.',
    formula: 'Min(all forward returns)',
    interpretation: 'Shows the downside risk after this condition occurs.',
    example: 'Worst outcome of -8.3% means the biggest loss after this condition was 8.3%.',
    category: 'Conditional',
  },
  unconditionalReturn: {
    name: 'Unconditional Return',
    description: 'The average return over any random N-day period (baseline comparison).',
    formula: 'Mean of all N-day returns in the dataset',
    interpretation: 'Compare forward return to this baseline. If forward > unconditional, condition has edge.',
    example: 'If unconditional is +0.3% but forward return is +1.8%, the condition adds +1.5% edge.',
    category: 'Conditional',
  },
  edge: {
    name: 'Edge',
    description: 'The excess return from the condition vs random entry (forward return - unconditional return).',
    formula: 'Forward Return - Unconditional Return',
    interpretation: 'Positive edge = condition provides advantage. Negative = condition is harmful signal.',
    example: 'Edge of +1.5% means this condition provides 1.5% better returns than random timing.',
    category: 'Conditional',
    goodRange: '> 0.5%',
    badRange: '< 0%',
  },
  tStatistic: {
    name: 'T-Statistic',
    description: 'Statistical measure of how significant the edge is (accounts for sample size and volatility).',
    formula: '(Mean - Expected) ÷ (StdDev ÷ √n)',
    interpretation: '|t| > 2 = statistically significant at 95% confidence. |t| > 3 = very significant.',
    example: 't-stat of 2.5 means there\'s less than 2% chance this edge is due to random luck.',
    category: 'Conditional',
    goodRange: '> 2.0',
  },
  pValue: {
    name: 'P-Value',
    description: 'Probability that the observed edge is due to chance rather than a real pattern.',
    formula: 'Derived from t-distribution based on t-statistic and degrees of freedom',
    interpretation: 'p < 0.05 = statistically significant. p < 0.01 = highly significant.',
    example: 'p-value of 0.02 means only 2% chance this pattern is random noise.',
    category: 'Conditional',
    goodRange: '< 0.05',
    badRange: '> 0.10',
  },
  consecutiveDays: {
    name: 'Consecutive Days',
    description: 'The number of consecutive days in the same direction before measuring forward return.',
    formula: 'User-defined parameter (e.g., 3 consecutive up days)',
    interpretation: 'More consecutive days = rarer condition but potentially stronger signal.',
    example: '5 consecutive down days is a rarer event than 2 consecutive down days.',
    category: 'Conditional',
  },
  thresholdPercent: {
    name: 'Threshold %',
    description: 'The percentage move that triggers the condition (e.g., -3% drop).',
    formula: 'User-defined parameter',
    interpretation: 'Larger thresholds = more extreme events = rarer but potentially more predictive.',
    example: '-5% threshold triggers only on days with 5%+ drops, which are rare but significant.',
    category: 'Conditional',
  },
  forwardDays: {
    name: 'Forward Days',
    description: 'The number of days over which forward return is measured.',
    formula: 'User-defined parameter (e.g., 5 days)',
    interpretation: 'Shorter periods = noise. Longer periods = more time for signal to play out.',
    example: '20 forward days measures the return over approximately one month after the trigger.',
    category: 'Conditional',
  },
  sampleSize: {
    name: 'Sample Size',
    description: 'The number of occurrences used to calculate statistics.',
    formula: 'Count of times condition was triggered',
    interpretation: 'n > 30 is preferred for statistical reliability. n < 10 = take results with caution.',
    example: 'Sample size of 52 means we have 52 data points to analyze this pattern.',
    category: 'Conditional',
    goodRange: '> 30',
    badRange: '< 10',
  },
  sharpeRatio: {
    name: 'Sharpe Ratio (Conditional)',
    description: 'Risk-adjusted return of the conditional strategy.',
    formula: '(Forward Return - Risk-Free Rate) ÷ Forward Volatility',
    interpretation: '> 1.0 = good risk-adjusted return. > 2.0 = excellent.',
    example: 'Sharpe of 1.5 means the conditional strategy has solid risk-adjusted performance.',
    category: 'Conditional',
    goodRange: '> 1.0',
  },
  profitFactor: {
    name: 'Profit Factor',
    description: 'Ratio of total gains to total losses from the conditional entries.',
    formula: 'Sum(winning trades) ÷ |Sum(losing trades)|',
    interpretation: '> 1.0 = profitable strategy. > 2.0 = very strong. < 1.0 = losing strategy.',
    example: 'Profit factor of 1.8 means gains are 1.8x larger than losses.',
    category: 'Conditional',
    goodRange: '> 1.5',
    badRange: '< 1.0',
  },
  avgWin: {
    name: 'Avg Win',
    description: 'Average return on winning trades after the condition.',
    formula: 'Sum(positive forward returns) ÷ Count(positive forward returns)',
    interpretation: 'Compare to avg loss. Ideally avg win > avg loss.',
    example: 'Avg win of +3.2% means profitable trades after this condition gain 3.2% on average.',
    category: 'Conditional',
  },
  avgLossConditional: {
    name: 'Avg Loss',
    description: 'Average return on losing trades after the condition.',
    formula: 'Sum(negative forward returns) ÷ Count(negative forward returns)',
    interpretation: 'Smaller avg loss = better downside control.',
    example: 'Avg loss of -1.8% means losing trades after this condition lose 1.8% on average.',
    category: 'Conditional',
  },
  winLossRatio: {
    name: 'Win/Loss Ratio',
    description: 'Ratio of average winning trade to average losing trade.',
    formula: 'Avg Win ÷ |Avg Loss|',
    interpretation: '> 1.0 = winners bigger than losers. Combined with win rate gives expected value.',
    example: 'Win/loss ratio of 1.8 means winners are 1.8x bigger than losers.',
    category: 'Conditional',
    goodRange: '> 1.0',
  },
  expectancy: {
    name: 'Expectancy',
    description: 'Expected value per trade using the conditional strategy.',
    formula: '(Win Rate × Avg Win) - (Loss Rate × |Avg Loss|)',
    interpretation: 'Positive = profitable strategy. Higher = better. Measures expected return per trade.',
    example: 'Expectancy of +0.8% means each conditional trade is expected to return +0.8%.',
    category: 'Conditional',
    goodRange: '> 0%',
  },
};

// Fallback for metrics not in the dictionary
const getDefaultDefinition = (key: string): {
  name: string;
  description: string;
  formula: string;
  interpretation: string;
  example: string;
  category: string;
  goodRange?: string;
  badRange?: string;
} => ({
  name: key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim(),
  description: 'A metric calculated from the stock\'s price history.',
  formula: 'Calculated from historical data',
  interpretation: 'Review the value in context of the overall analysis.',
  example: 'Compare this value to similar stocks or historical ranges.',
  category: 'General',
  goodRange: undefined,
  badRange: undefined,
});

interface MetricDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  metricKey: string;
  metricValue: any;
  studyName: string;
  ticker: string;
  studyResult?: any;
}

// Generate exact calculation trace from study result data
function generateCalculationTrace(metricKey: string, metricValue: any, studyResult: any): {
  steps: { label: string; value: string; formula?: string }[];
  inputs: { name: string; value: string }[];
} | null {
  if (!studyResult) return null;
  
  const steps: { label: string; value: string; formula?: string }[] = [];
  const inputs: { name: string; value: string }[] = [];
  
  // Add common inputs from study result
  if (studyResult.barsAnalyzed) {
    inputs.push({ name: 'Days Analyzed', value: studyResult.barsAnalyzed.toString() });
  }
  if (studyResult.dateRange) {
    inputs.push({ name: 'Date Range', value: `${studyResult.dateRange.start} to ${studyResult.dateRange.end}` });
  }

  // Generate specific traces based on metric type and study data
  switch (metricKey) {
    case 'percentage':
    case 'upDayPercent':
      if (studyResult.up_days !== undefined && studyResult.total_days !== undefined) {
        inputs.push({ name: 'Up Days', value: studyResult.up_days.toString() });
        inputs.push({ name: 'Total Days', value: studyResult.total_days.toString() });
        steps.push({ label: 'Count up days', value: studyResult.up_days.toString(), formula: 'Days where Close > Open' });
        steps.push({ label: 'Divide by total', value: `${studyResult.up_days} ÷ ${studyResult.total_days}`, formula: 'Up Days ÷ Total Days' });
        steps.push({ label: 'Multiply by 100', value: `${((studyResult.up_days / studyResult.total_days) * 100).toFixed(2)}%`, formula: 'Result × 100' });
      }
      break;
      
    case 'winRate':
      if (studyResult.up_days !== undefined && studyResult.total_days !== undefined) {
        inputs.push({ name: 'Days Up (vs prior close)', value: studyResult.up_days.toString() });
        inputs.push({ name: 'Total Trading Days', value: studyResult.total_days.toString() });
        steps.push({ label: 'Count winning days', value: studyResult.up_days.toString(), formula: 'Days where Close > Prior Close' });
        steps.push({ label: 'Calculate win rate', value: `${studyResult.up_days} ÷ ${studyResult.total_days} × 100`, formula: '(Wins ÷ Total) × 100' });
        steps.push({ label: 'Final result', value: `${typeof metricValue === 'number' ? metricValue.toFixed(2) : metricValue}%` });
      }
      break;
      
    case 'mean':
    case 'avgReturn':
      if (studyResult.count !== undefined) {
        inputs.push({ name: 'Number of Returns', value: studyResult.count.toString() });
        if (studyResult.stdDev) inputs.push({ name: 'Standard Deviation', value: `${studyResult.stdDev.toFixed(4)}%` });
        steps.push({ label: 'Sum all daily returns', value: `Σ(daily returns)` });
        steps.push({ label: 'Divide by count', value: `Sum ÷ ${studyResult.count}`, formula: 'Σ(returns) ÷ n' });
        steps.push({ label: 'Mean daily return', value: `${typeof metricValue === 'number' ? metricValue.toFixed(4) : metricValue}%` });
      }
      break;
      
    case 'stdDev':
    case 'volatility':
      if (studyResult.count !== undefined && studyResult.mean !== undefined) {
        inputs.push({ name: 'Mean Return', value: `${studyResult.mean.toFixed(4)}%` });
        inputs.push({ name: 'Sample Size', value: studyResult.count.toString() });
        steps.push({ label: 'Calculate mean', value: `μ = ${studyResult.mean.toFixed(4)}%` });
        steps.push({ label: 'Calculate variance', value: `Σ(rᵢ - μ)² ÷ n`, formula: 'Sum of squared deviations ÷ n' });
        steps.push({ label: 'Take square root', value: `√variance`, formula: '√(variance)' });
        steps.push({ label: 'Standard deviation', value: `${typeof metricValue === 'number' ? metricValue.toFixed(4) : metricValue}%` });
      }
      break;
      
    case 'annualizedVol':
      if (studyResult.stdDev !== undefined) {
        inputs.push({ name: 'Daily Std Dev', value: `${studyResult.stdDev.toFixed(4)}%` });
        inputs.push({ name: 'Trading Days/Year', value: '252' });
        steps.push({ label: 'Daily volatility', value: `${studyResult.stdDev.toFixed(4)}%` });
        steps.push({ label: 'Annualize', value: `${studyResult.stdDev.toFixed(4)} × √252`, formula: 'Daily Vol × √252' });
        steps.push({ label: 'Annualized volatility', value: `${(studyResult.stdDev * Math.sqrt(252)).toFixed(2)}%` });
      }
      break;

    case 'maxUpStreak':
    case 'maxDownStreak':
    case 'longestUpStreak':
    case 'longestDownStreak':
      if (studyResult.totalUpStreaks !== undefined || studyResult.totalDownStreaks !== undefined) {
        inputs.push({ name: 'Total Up Streaks', value: (studyResult.totalUpStreaks || 0).toString() });
        inputs.push({ name: 'Total Down Streaks', value: (studyResult.totalDownStreaks || 0).toString() });
        steps.push({ label: 'Track consecutive days', value: 'Count same-direction days' });
        steps.push({ label: 'Find maximum', value: `Max(all streaks)` });
        steps.push({ label: `Longest ${metricKey.includes('Up') ? 'up' : 'down'} streak`, value: `${metricValue} days` });
      }
      break;

    case 'avgUpStreak':
    case 'avgDownStreak':
      if (studyResult.totalUpStreaks !== undefined) {
        const isUp = metricKey.includes('Up');
        const total = isUp ? studyResult.totalUpStreaks : studyResult.totalDownStreaks;
        inputs.push({ name: `Total ${isUp ? 'Up' : 'Down'} Streaks`, value: total?.toString() || '0' });
        steps.push({ label: 'Sum all streak lengths', value: `Σ(streak lengths)` });
        steps.push({ label: 'Divide by count', value: `Sum ÷ ${total}` });
        steps.push({ label: 'Average streak', value: `${typeof metricValue === 'number' ? metricValue.toFixed(2) : metricValue} days` });
      }
      break;

    case 'maxDrawdown':
    case 'currentDrawdown':
      if (studyResult.maxDrawdown !== undefined) {
        inputs.push({ name: 'Peak Price', value: 'Highest close in period' });
        inputs.push({ name: 'Trough Price', value: 'Lowest close after peak' });
        steps.push({ label: 'Find peak price', value: 'Max(close prices)' });
        steps.push({ label: 'Find subsequent trough', value: 'Min(close prices after peak)' });
        steps.push({ label: 'Calculate decline', value: '(Peak - Trough) ÷ Peak × 100', formula: '(Peak - Trough) ÷ Peak × 100' });
        steps.push({ label: 'Max drawdown', value: `${typeof metricValue === 'number' ? metricValue.toFixed(2) : metricValue}%` });
      }
      break;

    case 'currentRsi':
    case 'rsi':
      if (studyResult.avgGain !== undefined || studyResult.currentRsi !== undefined) {
        inputs.push({ name: 'RSI Period', value: studyResult.period?.toString() || '14' });
        steps.push({ label: 'Calculate avg gains', value: 'Avg(gains over period)', formula: 'Avg of positive price changes' });
        steps.push({ label: 'Calculate avg losses', value: 'Avg(losses over period)', formula: 'Avg of negative price changes' });
        steps.push({ label: 'Calculate RS', value: 'Avg Gain ÷ Avg Loss', formula: 'Relative Strength = Gain/Loss' });
        steps.push({ label: 'Calculate RSI', value: '100 - (100 ÷ (1 + RS))', formula: 'RSI = 100 - (100 ÷ (1 + RS))' });
        steps.push({ label: 'Current RSI', value: `${typeof metricValue === 'number' ? metricValue.toFixed(2) : metricValue}` });
      }
      break;

    case 'avgGapUp':
    case 'avgGapDown':
      if (studyResult.gapsUp || studyResult.gapsDown) {
        const gapData = metricKey === 'avgGapUp' ? studyResult.gapsUp : studyResult.gapsDown;
        if (gapData) {
          inputs.push({ name: 'Gap Count', value: gapData.count?.toString() || '0' });
          steps.push({ label: 'Identify gaps', value: `Days where Open ${metricKey === 'avgGapUp' ? '>' : '<'} Prior Close` });
          steps.push({ label: 'Calculate each gap', value: '(Open - Prior Close) ÷ Prior Close × 100' });
          steps.push({ label: 'Average all gaps', value: `Sum(gaps) ÷ ${gapData.count}` });
          steps.push({ label: 'Average gap', value: `${typeof metricValue === 'number' ? metricValue.toFixed(2) : metricValue}%` });
        }
      }
      break;

    case 'gapFillRate':
    case 'fillRate':
      if (studyResult.gapsUp || studyResult.gapsDown) {
        steps.push({ label: 'Count total gaps', value: 'Gaps > 0.5% threshold' });
        steps.push({ label: 'Count filled gaps', value: 'Gaps where price returned to prior close' });
        steps.push({ label: 'Calculate fill rate', value: 'Filled ÷ Total × 100' });
        steps.push({ label: 'Gap fill rate', value: `${typeof metricValue === 'number' ? metricValue.toFixed(2) : metricValue}%` });
      }
      break;

    // Close vs Open Analysis metrics
    case 'bias':
      if (studyResult?.summary?.avgClosePosition !== undefined) {
        const avgPos = studyResult.summary.avgClosePosition;
        inputs.push({ name: 'Avg Close Position', value: `${avgPos.toFixed(1)}%` });
        steps.push({ label: 'Calculate avg close position', value: `${avgPos.toFixed(1)}%`, formula: 'Average of (Close - Low) / (High - Low) × 100' });
        steps.push({ label: 'Apply bias threshold', value: avgPos > 55 ? '> 55% → Bullish' : avgPos < 45 ? '< 45% → Bearish' : '45-55% → Neutral' });
        steps.push({ label: 'Final bias', value: metricValue });
      }
      break;

    case 'avgClosePositionPct':
      if (studyResult?.barsAnalyzed !== undefined) {
        inputs.push({ name: 'Days Analyzed', value: studyResult.barsAnalyzed.toString() });
        steps.push({ label: 'For each day, calculate', value: '(Close - Low) ÷ (High - Low)', formula: 'Close Position = (Close - Low) ÷ (High - Low) × 100' });
        steps.push({ label: 'Example: Day with H=$150, L=$145, C=$148', value: '(148-145) ÷ (150-145) = 60%', formula: '(148 - 145) ÷ (150 - 145) × 100' });
        steps.push({ label: 'Sum all daily positions', value: 'Σ(close positions)' });
        steps.push({ label: 'Divide by count', value: `Sum ÷ ${studyResult.barsAnalyzed}` });
        steps.push({ label: 'Average close position', value: `${typeof metricValue === 'number' ? metricValue.toFixed(1) : metricValue}%` });
      }
      break;

    case 'greenDaysPct':
      if (studyResult?.summary?.greenDays !== undefined) {
        const gd = studyResult.summary.greenDays;
        inputs.push({ name: 'Green Days', value: gd.count?.toString() || 'N/A' });
        inputs.push({ name: 'Total Days', value: studyResult.barsAnalyzed?.toString() || 'N/A' });
        steps.push({ label: 'Count days where Close > Open', value: gd.count?.toString() || 'N/A', formula: 'Green Day = Close > Open' });
        steps.push({ label: 'Divide by total days', value: `${gd.count} ÷ ${studyResult.barsAnalyzed}`, formula: 'Green Days ÷ Total Days' });
        steps.push({ label: 'Multiply by 100', value: `${typeof metricValue === 'number' ? metricValue.toFixed(1) : metricValue}%` });
      }
      break;

    case 'redDaysPct':
      if (studyResult?.summary?.redDays !== undefined) {
        const rd = studyResult.summary.redDays;
        inputs.push({ name: 'Red Days', value: rd.count?.toString() || 'N/A' });
        inputs.push({ name: 'Total Days', value: studyResult.barsAnalyzed?.toString() || 'N/A' });
        steps.push({ label: 'Count days where Close < Open', value: rd.count?.toString() || 'N/A', formula: 'Red Day = Close < Open' });
        steps.push({ label: 'Divide by total days', value: `${rd.count} ÷ ${studyResult.barsAnalyzed}`, formula: 'Red Days ÷ Total Days' });
        steps.push({ label: 'Multiply by 100', value: `${typeof metricValue === 'number' ? metricValue.toFixed(1) : metricValue}%` });
      }
      break;

    case 'closedNearHighPct':
      if (studyResult?.summary?.closedNearHigh !== undefined) {
        const cnh = studyResult.summary.closedNearHigh;
        inputs.push({ name: 'Near High Days', value: cnh.count?.toString() || 'N/A' });
        inputs.push({ name: 'Total Days', value: studyResult.barsAnalyzed?.toString() || 'N/A' });
        inputs.push({ name: 'Near High Threshold', value: '> 80%' });
        steps.push({ label: 'Calculate close position for each day', value: '(Close - Low) ÷ (High - Low) × 100' });
        steps.push({ label: 'Count days with position > 80%', value: cnh.count?.toString() || 'N/A', formula: 'ClosePosition > 80% = Near High' });
        steps.push({ label: 'Calculate percentage', value: `${cnh.count} ÷ ${studyResult.barsAnalyzed} × 100` });
        steps.push({ label: 'Closed near high %', value: `${typeof metricValue === 'number' ? metricValue.toFixed(1) : metricValue}%` });
      }
      break;

    case 'closedNearLowPct':
      if (studyResult?.summary?.closedNearLow !== undefined) {
        const cnl = studyResult.summary.closedNearLow;
        inputs.push({ name: 'Near Low Days', value: cnl.count?.toString() || 'N/A' });
        inputs.push({ name: 'Total Days', value: studyResult.barsAnalyzed?.toString() || 'N/A' });
        inputs.push({ name: 'Near Low Threshold', value: '< 20%' });
        steps.push({ label: 'Calculate close position for each day', value: '(Close - Low) ÷ (High - Low) × 100' });
        steps.push({ label: 'Count days with position < 20%', value: cnl.count?.toString() || 'N/A', formula: 'ClosePosition < 20% = Near Low' });
        steps.push({ label: 'Calculate percentage', value: `${cnl.count} ÷ ${studyResult.barsAnalyzed} × 100` });
        steps.push({ label: 'Closed near low %', value: `${typeof metricValue === 'number' ? metricValue.toFixed(1) : metricValue}%` });
      }
      break;

    case 'dojiDaysPct':
      if (studyResult?.summary?.dojiDays !== undefined) {
        const doji = studyResult.summary.dojiDays;
        const threshold = studyResult.params?.dojiThreshold || 0.1;
        inputs.push({ name: 'Doji Days', value: doji.count?.toString() || 'N/A' });
        inputs.push({ name: 'Total Days', value: studyResult.barsAnalyzed?.toString() || 'N/A' });
        inputs.push({ name: 'Doji Threshold', value: `${(threshold * 100).toFixed(0)}% body/range` });
        steps.push({ label: 'Calculate body %', value: '|Close - Open| ÷ (High - Low)', formula: 'Body % = |Close - Open| ÷ Range' });
        steps.push({ label: 'Count doji days', value: `Body % < ${(threshold * 100).toFixed(0)}%`, formula: `Doji = Body % < ${(threshold * 100).toFixed(0)}%` });
        steps.push({ label: 'Calculate percentage', value: `${doji.count} ÷ ${studyResult.barsAnalyzed} × 100` });
        steps.push({ label: 'Doji days %', value: `${typeof metricValue === 'number' ? metricValue.toFixed(1) : metricValue}%` });
      }
      break;

    case 'strongGreenDaysPct':
      if (studyResult?.summary?.strongGreenDays !== undefined) {
        const sg = studyResult.summary.strongGreenDays;
        const threshold = studyResult.params?.strongMoveThreshold || 1.5;
        inputs.push({ name: 'Strong Green Days', value: sg.count?.toString() || 'N/A' });
        inputs.push({ name: 'Total Days', value: studyResult.barsAnalyzed?.toString() || 'N/A' });
        inputs.push({ name: 'Strong Move Threshold', value: `≥ ${threshold}%` });
        steps.push({ label: 'Calculate daily move', value: '(Close - Open) ÷ Open × 100', formula: 'Daily Move % = (Close - Open) ÷ Open × 100' });
        steps.push({ label: 'Count strong green days', value: `Move ≥ ${threshold}%`, formula: `Strong Green = Move ≥ ${threshold}%` });
        steps.push({ label: 'Calculate percentage', value: `${sg.count} ÷ ${studyResult.barsAnalyzed} × 100` });
        steps.push({ label: 'Strong green days %', value: `${typeof metricValue === 'number' ? metricValue.toFixed(1) : metricValue}%` });
      }
      break;

    case 'strongRedDaysPct':
      if (studyResult?.summary?.strongRedDays !== undefined) {
        const sr = studyResult.summary.strongRedDays;
        const threshold = studyResult.params?.strongMoveThreshold || 1.5;
        inputs.push({ name: 'Strong Red Days', value: sr.count?.toString() || 'N/A' });
        inputs.push({ name: 'Total Days', value: studyResult.barsAnalyzed?.toString() || 'N/A' });
        inputs.push({ name: 'Strong Move Threshold', value: `≥ ${threshold}%` });
        steps.push({ label: 'Calculate daily move', value: '(Open - Close) ÷ Open × 100', formula: 'Daily Loss % = (Open - Close) ÷ Open × 100' });
        steps.push({ label: 'Count strong red days', value: `Loss ≥ ${threshold}%`, formula: `Strong Red = Loss ≥ ${threshold}%` });
        steps.push({ label: 'Calculate percentage', value: `${sr.count} ÷ ${studyResult.barsAnalyzed} × 100` });
        steps.push({ label: 'Strong red days %', value: `${typeof metricValue === 'number' ? metricValue.toFixed(1) : metricValue}%` });
      }
      break;

    default:
      // Generic trace for any numeric value
      if (typeof metricValue === 'number') {
        steps.push({ label: 'Raw calculation', value: metricValue.toFixed(4) });
        steps.push({ label: 'Formatted result', value: formatMetricForTrace(metricKey, metricValue) });
      }
      break;
  }

  return steps.length > 0 ? { steps, inputs } : null;
}

function formatMetricForTrace(key: string, value: number): string {
  if (key.toLowerCase().includes('percent') || 
      key.toLowerCase().includes('rate') ||
      key.toLowerCase().includes('volatility') ||
      key.toLowerCase().includes('drawdown')) {
    return `${value.toFixed(2)}%`;
  }
  if (value > 1000000) return `${(value / 1000000).toFixed(2)}M`;
  if (value > 1000) return `${(value / 1000).toFixed(2)}K`;
  return value.toFixed(value < 10 ? 2 : 0);
}

export function MetricDetailModal({ 
  isOpen, 
  onClose, 
  metricKey, 
  metricValue, 
  studyName,
  ticker,
  studyResult
}: MetricDetailModalProps) {
  const definition = METRIC_DEFINITIONS[metricKey] || getDefaultDefinition(metricKey);
  const calculationTrace = generateCalculationTrace(metricKey, metricValue, studyResult);
  
  // Determine if the value is good, bad, or neutral
  const getValueSentiment = () => {
    if (typeof metricValue !== 'number') return 'neutral';
    
    if (definition.goodRange && definition.badRange) {
      // Parse ranges and compare
      const isGood = definition.goodRange.includes('>') 
        ? metricValue > parseFloat(definition.goodRange.replace(/[^0-9.-]/g, ''))
        : definition.goodRange.includes('<')
        ? metricValue < parseFloat(definition.goodRange.replace(/[^0-9.-]/g, ''))
        : false;
      
      if (isGood) return 'good';
      
      const isBad = definition.badRange.includes('>')
        ? metricValue > parseFloat(definition.badRange.replace(/[^0-9.-]/g, ''))
        : definition.badRange.includes('<')
        ? metricValue < parseFloat(definition.badRange.replace(/[^0-9.-]/g, ''))
        : false;
        
      if (isBad) return 'bad';
    }
    
    return 'neutral';
  };
  
  const sentiment = getValueSentiment();
  
  const formatDisplayValue = () => {
    if (typeof metricValue === 'number') {
      if (metricKey.toLowerCase().includes('percent') || 
          metricKey.toLowerCase().includes('rate') ||
          metricKey.toLowerCase().includes('ratio') ||
          metricKey.toLowerCase().includes('volatility') ||
          metricKey.toLowerCase().includes('drawdown')) {
        return `${metricValue.toFixed(2)}%`;
      }
      if (metricValue > 1000000) return `${(metricValue / 1000000).toFixed(2)}M`;
      if (metricValue > 1000) return `${(metricValue / 1000).toFixed(2)}K`;
      return metricValue.toFixed(metricValue < 10 ? 2 : 0);
    }
    return String(metricValue);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className={cn(
              "p-2 rounded-lg",
              sentiment === 'good' && "bg-emerald-100 dark:bg-emerald-900/30",
              sentiment === 'bad' && "bg-red-100 dark:bg-red-900/30",
              sentiment === 'neutral' && "bg-muted"
            )}>
              <Calculator className={cn(
                "h-5 w-5",
                sentiment === 'good' && "text-emerald-600",
                sentiment === 'bad' && "text-red-600",
                sentiment === 'neutral' && "text-muted-foreground"
              )} />
            </div>
            <div>
              <DialogTitle className="flex items-center gap-2">
                {definition.name}
                <Badge variant="outline" className="text-xs font-normal">
                  {definition.category}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs">
                From {studyName} • {ticker}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4 pb-2">
            {/* Current Value */}
            <div className={cn(
              "rounded-lg p-4 text-center",
              sentiment === 'good' && "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800",
              sentiment === 'bad' && "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800",
              sentiment === 'neutral' && "bg-muted border"
            )}>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Current Value</p>
              <p className={cn(
                "text-3xl font-bold font-mono",
                sentiment === 'good' && "text-emerald-600",
                sentiment === 'bad' && "text-red-600",
                sentiment === 'neutral' && "text-foreground"
              )}>
                {formatDisplayValue()}
              </p>
              {(definition.goodRange || definition.badRange) && (
                <div className="flex items-center justify-center gap-4 mt-2 text-xs">
                  {definition.goodRange && (
                    <span className="text-emerald-600 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      Good: {definition.goodRange}
                    </span>
                  )}
                  {definition.badRange && (
                    <span className="text-red-600 flex items-center gap-1">
                      <TrendingDown className="h-3 w-3" />
                      Concerning: {definition.badRange}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* EXACT CALCULATION - The new section showing actual calculation steps */}
            {calculationTrace && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Database className="h-4 w-4 text-indigo-500" />
                    Exact Calculation Used
                  </div>
                  
                  {/* Input Values */}
                  {calculationTrace.inputs.length > 0 && (
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3 border border-indigo-200 dark:border-indigo-800">
                      <p className="text-xs font-medium text-indigo-700 dark:text-indigo-300 mb-2">Data Inputs:</p>
                      <div className="grid grid-cols-2 gap-2">
                        {calculationTrace.inputs.map((input, idx) => (
                          <div key={idx} className="flex justify-between text-xs">
                            <span className="text-indigo-600 dark:text-indigo-400">{input.name}:</span>
                            <span className="font-mono font-medium text-indigo-800 dark:text-indigo-200">{input.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Calculation Steps */}
                  <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Step-by-step calculation:</p>
                    {calculationTrace.steps.map((step, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <div className="flex items-center gap-1 min-w-[20px]">
                          <span className="text-xs font-bold text-primary bg-primary/10 rounded-full w-5 h-5 flex items-center justify-center">
                            {idx + 1}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-muted-foreground">{step.label}</span>
                            <ArrowRight className="h-3 w-3 text-muted-foreground/50" />
                            <span className="text-sm font-mono font-medium text-foreground">{step.value}</span>
                          </div>
                          {step.formula && (
                            <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">{step.formula}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* What It Is */}
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 text-base font-semibold mb-2">
                  <BookOpen className="h-5 w-5 text-blue-500" />
                  What It Measures
                </div>
                <p className="text-base text-muted-foreground leading-relaxed">{definition.description}</p>
              </div>

              {/* Formula */}
              <div>
                <div className="flex items-center gap-2 text-base font-semibold mb-2">
                  <Calculator className="h-5 w-5 text-purple-500" />
                  Formula
                </div>
                <div className="bg-muted/50 rounded-lg p-4 font-mono text-base leading-relaxed">
                  {definition.formula}
                </div>
              </div>

              {/* How to Interpret */}
              <div>
                <div className="flex items-center gap-2 text-base font-semibold mb-2">
                  <Target className="h-5 w-5 text-amber-500" />
                  How to Interpret
                </div>
                <p className="text-base text-muted-foreground leading-relaxed">{definition.interpretation}</p>
              </div>

              {/* Good/Bad Range if available */}
              {(definition.goodRange || definition.badRange) && (
                <div className="flex gap-4 flex-wrap">
                  {definition.goodRange && (
                    <div className="flex items-center gap-2 text-sm bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-3 py-1.5 rounded-full">
                      <span className="font-medium">Good:</span> {definition.goodRange}
                    </div>
                  )}
                  {definition.badRange && (
                    <div className="flex items-center gap-2 text-sm bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 px-3 py-1.5 rounded-full">
                      <span className="font-medium">Caution:</span> {definition.badRange}
                    </div>
                  )}
                </div>
              )}

              {/* Example */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 text-base font-semibold text-blue-700 dark:text-blue-300 mb-2">
                  <Lightbulb className="h-5 w-5" />
                  Example
                </div>
                <p className="text-base text-blue-600 dark:text-blue-400 leading-relaxed">{definition.example}</p>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
