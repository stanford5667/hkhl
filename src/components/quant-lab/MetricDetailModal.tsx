/**
 * MetricDetailModal - Interactive metric explanation component
 * Shows detailed information about each metric when clicked
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Calculator, TrendingUp, TrendingDown, Minus, 
  Lightbulb, BookOpen, Target, BarChart3, Info
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
}

export function MetricDetailModal({ 
  isOpen, 
  onClose, 
  metricKey, 
  metricValue, 
  studyName,
  ticker 
}: MetricDetailModalProps) {
  const definition = METRIC_DEFINITIONS[metricKey] || getDefaultDefinition(metricKey);
  
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
      <DialogContent className="max-w-lg">
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

        <Separator />

        {/* What It Is */}
        <div className="space-y-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium mb-1">
              <BookOpen className="h-4 w-4 text-blue-500" />
              What It Measures
            </div>
            <p className="text-sm text-muted-foreground">{definition.description}</p>
          </div>

          {/* Formula */}
          <div>
            <div className="flex items-center gap-2 text-sm font-medium mb-1">
              <Calculator className="h-4 w-4 text-purple-500" />
              How It's Calculated
            </div>
            <div className="bg-muted/50 rounded-lg p-3 font-mono text-sm">
              {definition.formula}
            </div>
          </div>

          {/* How to Interpret */}
          <div>
            <div className="flex items-center gap-2 text-sm font-medium mb-1">
              <Target className="h-4 w-4 text-amber-500" />
              How to Interpret
            </div>
            <p className="text-sm text-muted-foreground">{definition.interpretation}</p>
          </div>

          {/* Example */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">
              <Lightbulb className="h-4 w-4" />
              Example
            </div>
            <p className="text-sm text-blue-600 dark:text-blue-400">{definition.example}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
