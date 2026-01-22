/**
 * Shared Study Definitions for Quant Lab
 * Used by both standalone QuantLab page and embedded EmbeddedQuantLab component
 */

import {
  TrendingUp, TrendingDown, BarChart3, Activity,
  Calendar, Zap, Layers, Volume2, Crosshair, LineChart,
  Gauge, ArrowLeftRight, Mountain, ArrowUpDown,
  Target, Shield, GitBranch, Landmark
} from 'lucide-react';

export interface StudyParam {
  key: string;
  label: string;
  description: string;
  type: 'slider' | 'number' | 'select';
  min?: number;
  max?: number;
  step?: number;
  default: number | string;
  options?: { value: string | number; label: string }[];
  beginner?: string;
}

export interface StudyDefinition {
  id: string;
  name: string;
  category: string;
  icon: any;
  description: string;
  whatItMeasures: string;
  whyItMatters: string;
  howToUse: string;
  params: StudyParam[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  isPremium?: boolean;
}

export interface StudyCategory {
  id: string;
  name: string;
  icon: any;
  description: string;
}

export const STUDY_DEFINITIONS: StudyDefinition[] = [
  // ========== BASIC STATISTICS ==========
  {
    id: 'daily_close_gt_open',
    name: 'Intraday Direction',
    category: 'basic',
    icon: TrendingUp,
    description: 'How often does the stock go UP during trading hours?',
    whatItMeasures: 'The percentage of days where the closing price is higher than the opening price.',
    whyItMatters: 'Stocks that consistently close higher than they open show intraday buying pressure.',
    howToUse: 'Values above 55% suggest bullish intraday bias. Below 45% suggests bearish bias.',
    difficulty: 'beginner',
    tags: ['momentum', 'direction', 'daily'],
    params: [],
    isPremium: false,
  },
  {
    id: 'daily_close_gt_prior',
    name: 'Daily Win Rate',
    category: 'basic',
    icon: Target,
    description: 'What percentage of days does the stock go UP?',
    whatItMeasures: 'How often the stock closes higher than the previous day.',
    whyItMatters: 'A win rate above 53% indicates positive momentum over time.',
    howToUse: 'Most stocks hover around 52-54%. Higher is bullish, lower is concerning.',
    difficulty: 'beginner',
    tags: ['momentum', 'win-rate'],
    params: [],
    isPremium: false,
  },
  {
    id: 'daily_return_distribution',
    name: 'Return Profile',
    category: 'basic',
    icon: BarChart3,
    description: 'What does the typical daily move look like?',
    whatItMeasures: 'The distribution of daily returns - average, volatility, and extreme moves.',
    whyItMatters: 'Understanding typical moves helps set realistic expectations.',
    howToUse: 'Look at the mean (average daily gain), std dev (typical range), and outliers.',
    difficulty: 'intermediate',
    tags: ['volatility', 'statistics'],
    params: [],
    isPremium: true,
  },
  {
    id: 'up_down_streaks',
    name: 'Win & Loss Streaks',
    category: 'basic',
    icon: Activity,
    description: 'How long do winning and losing runs last?',
    whatItMeasures: 'The length and frequency of consecutive up or down days.',
    whyItMatters: 'Long streaks indicate momentum; short streaks suggest choppiness.',
    howToUse: 'Compare max win streak vs loss streak. Longer win streaks = stronger momentum.',
    difficulty: 'beginner',
    tags: ['momentum', 'streaks'],
    params: [],
    isPremium: true,
  },
  
  // ========== SEASONALITY ==========
  {
    id: 'day_of_week_returns',
    name: 'Best Days of the Week',
    category: 'seasonality',
    icon: Calendar,
    description: 'Which weekdays perform best?',
    whatItMeasures: 'Average return and win rate for each day of the week.',
    whyItMatters: 'Some stocks have day-of-week patterns (e.g., "Turnaround Tuesday").',
    howToUse: 'Look for days with consistently positive returns and high win rates.',
    difficulty: 'beginner',
    tags: ['seasonality', 'timing'],
    params: [],
    isPremium: true,
  },
  {
    id: 'month_of_year_returns',
    name: 'Best Months',
    category: 'seasonality',
    icon: Calendar,
    description: 'Which months historically perform best?',
    whatItMeasures: 'Average monthly return for each calendar month.',
    whyItMatters: 'Seasonal patterns like "Sell in May" affect many stocks.',
    howToUse: 'Identify strong and weak months for timing entries/exits.',
    difficulty: 'beginner',
    tags: ['seasonality', 'timing'],
    params: [],
    isPremium: true,
  },
  
  // ========== TECHNICAL ANALYSIS ==========
  {
    id: 'rsi_analysis',
    name: 'RSI (Overbought/Oversold)',
    category: 'technical',
    icon: Gauge,
    description: 'Is the stock overbought or oversold?',
    whatItMeasures: 'The Relative Strength Index measures momentum on a 0-100 scale.',
    whyItMatters: 'RSI above 70 = overbought (may drop). Below 30 = oversold (may rise).',
    howToUse: 'Look for extreme readings and check historical accuracy.',
    difficulty: 'intermediate',
    tags: ['momentum', 'overbought', 'oversold'],
    params: [],
    isPremium: true,
  },
  {
    id: 'moving_average_analysis',
    name: 'Moving Averages',
    category: 'technical',
    icon: LineChart,
    description: 'Is the stock in an uptrend or downtrend?',
    whatItMeasures: 'Price position relative to short, medium, and long-term averages.',
    whyItMatters: 'Price above moving averages = uptrend. Golden/Death crosses signal changes.',
    howToUse: 'Look for price above all MAs and short MA above long MA for strongest uptrends.',
    difficulty: 'intermediate',
    tags: ['trend', 'moving-average'],
    params: [],
    isPremium: true,
  },
  {
    id: 'trend_strength',
    name: 'Trend Strength Score',
    category: 'technical',
    icon: TrendingUp,
    description: 'How strong is the current trend?',
    whatItMeasures: 'A composite score based on price vs MAs and MA alignment.',
    whyItMatters: 'Strong trends (5/5) tend to continue. Weak trends may reverse.',
    howToUse: 'Score of 4-5 = strong uptrend. 0-1 = strong downtrend. 2-3 = mixed.',
    difficulty: 'beginner',
    tags: ['trend', 'strength'],
    params: [],
    isPremium: true,
  },
  {
    id: 'macd_analysis',
    name: 'MACD Momentum',
    category: 'technical',
    icon: Activity,
    description: 'Is momentum accelerating or decelerating?',
    whatItMeasures: 'The MACD shows changes in trend momentum.',
    whyItMatters: 'MACD crossovers signal trend changes before price does.',
    howToUse: 'Buy when MACD crosses above signal. Sell when it crosses below.',
    difficulty: 'intermediate',
    tags: ['momentum', 'trend'],
    params: [],
    isPremium: true,
  },
  {
    id: 'bollinger_analysis',
    name: 'Bollinger Bands',
    category: 'technical',
    icon: Layers,
    description: 'Is the stock at price extremes?',
    whatItMeasures: 'Price position relative to its typical range.',
    whyItMatters: 'Price at upper band = extended. Lower band = potential bounce.',
    howToUse: 'Look for touches of bands and band squeezes before breakouts.',
    difficulty: 'intermediate',
    tags: ['volatility', 'bands'],
    params: [],
    isPremium: true,
  },
  {
    id: 'stochastic_analysis',
    name: 'Stochastic Oscillator',
    category: 'technical',
    icon: Gauge,
    description: 'Where is price within its recent range?',
    whatItMeasures: 'Price position on a 0-100 scale within the recent high-low range.',
    whyItMatters: 'Similar to RSI but based on price range, not momentum.',
    howToUse: 'Above 80 = near highs. Below 20 = near lows. Crossovers signal turns.',
    difficulty: 'intermediate',
    tags: ['momentum', 'overbought', 'oversold'],
    params: [],
    isPremium: true,
  },
  
  // ========== VOLATILITY & RISK ==========
  {
    id: 'volatility_analysis',
    name: 'Volatility Profile',
    category: 'volatility',
    icon: Zap,
    description: 'How much does the stock typically move?',
    whatItMeasures: 'ATR (Average True Range), daily range, and volatility clustering.',
    whyItMatters: 'High volatility = bigger swings. Low volatility may precede breakouts.',
    howToUse: 'Compare current volatility to average. Use for position sizing.',
    difficulty: 'intermediate',
    tags: ['volatility', 'risk'],
    params: [],
    isPremium: true,
  },
  {
    id: 'drawdown_analysis',
    name: 'Drawdown Analysis',
    category: 'volatility',
    icon: TrendingDown,
    description: 'How bad have the drops been?',
    whatItMeasures: 'Peak-to-trough declines and recovery times.',
    whyItMatters: 'Understanding worst-case scenarios helps manage risk.',
    howToUse: 'Know the max drawdown before investing. Can you handle it?',
    difficulty: 'beginner',
    tags: ['risk', 'drawdown'],
    params: [],
    isPremium: true,
  },
  {
    id: 'mean_reversion',
    name: 'Mean Reversion',
    category: 'volatility',
    icon: ArrowLeftRight,
    description: 'Do big moves reverse or continue?',
    whatItMeasures: 'What happens after large up or down days.',
    whyItMatters: 'Mean-reverting stocks fade extremes. Trending stocks continue.',
    howToUse: 'High reversal rate = fade big moves. Low = ride momentum.',
    difficulty: 'intermediate',
    tags: ['reversal', 'momentum'],
    params: [],
    isPremium: true,
  },
  
  // ========== PRICE PATTERNS ==========
  {
    id: 'gap_analysis',
    name: 'Gap Analysis',
    category: 'patterns',
    icon: ArrowUpDown,
    description: 'What happens when the stock gaps up or down?',
    whatItMeasures: 'Overnight gaps - do they fill or continue?',
    whyItMatters: 'Gap fills = fade the gap. Gap continuation = ride momentum.',
    howToUse: 'High fill rate = gaps tend to close. Low = gaps often continue.',
    difficulty: 'intermediate',
    tags: ['gaps', 'patterns'],
    params: [],
    isPremium: true,
  },
  {
    id: 'range_analysis',
    name: 'Range Patterns',
    category: 'patterns',
    icon: Layers,
    description: 'Inside days, outside days, and doji patterns',
    whatItMeasures: 'Trading range patterns and their implications.',
    whyItMatters: 'Inside days = consolidation. Outside days = expansion.',
    howToUse: 'Many inside days = breakout coming. Doji = indecision.',
    difficulty: 'intermediate',
    tags: ['patterns', 'consolidation'],
    params: [],
    isPremium: true,
  },
  {
    id: 'high_low_analysis',
    name: 'Breakout Analysis',
    category: 'patterns',
    icon: Mountain,
    description: 'What happens after new highs or lows?',
    whatItMeasures: 'Performance after making new highs or lows.',
    whyItMatters: 'New highs can lead to more highs (momentum) or exhaustion.',
    howToUse: 'Check if new highs lead to gains (trend) or losses (reversal).',
    difficulty: 'intermediate',
    tags: ['breakout', 'momentum'],
    params: [],
    isPremium: true,
  },
  {
    id: 'close_to_open_analysis',
    name: 'Close vs Open',
    category: 'patterns',
    icon: Activity,
    description: 'Where does price close within the day\'s range?',
    whatItMeasures: 'Close position (near high vs near low), green/red bias, and doji/strong-day patterns.',
    whyItMatters: 'Closes near highs suggest buying pressure; near lows suggest selling pressure.',
    howToUse: 'Use this to gauge intraday conviction and the typical follow-through after strong/indecision days.',
    difficulty: 'intermediate',
    tags: ['patterns', 'candles', 'pressure'],
    params: [],
    isPremium: true,
  },
  
  // ========== VOLUME ==========
  {
    id: 'volume_analysis',
    name: 'Volume Profile',
    category: 'volume',
    icon: Volume2,
    description: 'Is the stock being accumulated or distributed?',
    whatItMeasures: 'Volume patterns on up days vs down days.',
    whyItMatters: 'Higher volume on up days = buying pressure (bullish).',
    howToUse: 'Look for accumulation (up volume > down volume) for bullish bias.',
    difficulty: 'intermediate',
    tags: ['volume', 'accumulation'],
    params: [],
    isPremium: true,
  },
  
  // ========== PROJECTIONS ==========
  {
    id: 'price_targets',
    name: 'Price Targets',
    category: 'projections',
    icon: Crosshair,
    description: 'Where might the stock go based on history?',
    whatItMeasures: 'Statistical price projections based on historical returns.',
    whyItMatters: 'Gives probability-based scenarios, not predictions.',
    howToUse: 'Use bull/bear scenarios for planning, not as guarantees.',
    difficulty: 'intermediate',
    tags: ['targets', 'projections'],
    params: [],
    isPremium: true,
  },
  
  // ========== CONDITIONAL PROBABILITY ==========
  {
    id: 'after_down_x',
    name: 'After Down X%',
    category: 'conditional',
    icon: TrendingDown,
    description: 'What happens after the stock drops by X%?',
    whatItMeasures: 'Forward returns after big down days at various time horizons.',
    whyItMatters: 'Helps determine if big drops are buying opportunities or warning signs.',
    howToUse: 'High win rate after drops = mean reversion. Low win rate = momentum continues.',
    difficulty: 'intermediate',
    tags: ['conditional', 'reversal', 'drops'],
    params: [
      {
        key: 'threshold',
        label: 'Drop Threshold (%)',
        description: 'Minimum % drop to trigger analysis',
        type: 'slider',
        min: 1,
        max: 10,
        step: 0.5,
        default: 2,
        beginner: '2% is a significant daily drop for most stocks'
      },
      {
        key: 'forwardDays',
        label: 'Result Timeline',
        description: 'How many days forward to measure returns',
        type: 'select',
        default: '5',
        options: [
          { value: '1', label: '1 Day' },
          { value: '5', label: '1 Week' },
          { value: '21', label: '1 Month' },
          { value: '63', label: '3 Months' },
          { value: '126', label: '6 Months' },
          { value: '252', label: '1 Year' }
        ],
        beginner: 'Choose how far ahead to measure the outcome'
      }
    ],
    isPremium: false,
  },
  {
    id: 'after_up_x',
    name: 'After Up X%',
    category: 'conditional',
    icon: TrendingUp,
    description: 'What happens after the stock jumps by X%?',
    whatItMeasures: 'Forward returns after big up days at various time horizons.',
    whyItMatters: 'Determines if big gains continue (momentum) or reverse (exhaustion).',
    howToUse: 'High win rate = momentum. Low win rate = exhaustion/profit-taking.',
    difficulty: 'intermediate',
    tags: ['conditional', 'momentum', 'gains'],
    params: [
      {
        key: 'threshold',
        label: 'Gain Threshold (%)',
        description: 'Minimum % gain to trigger analysis',
        type: 'slider',
        min: 1,
        max: 10,
        step: 0.5,
        default: 2,
        beginner: '2% is a significant daily gain for most stocks'
      },
      {
        key: 'forwardDays',
        label: 'Result Timeline',
        description: 'How many days forward to measure returns',
        type: 'select',
        default: '5',
        options: [
          { value: '1', label: '1 Day' },
          { value: '5', label: '1 Week' },
          { value: '21', label: '1 Month' },
          { value: '63', label: '3 Months' },
          { value: '126', label: '6 Months' },
          { value: '252', label: '1 Year' }
        ],
        beginner: 'Choose how far ahead to measure the outcome'
      }
    ],
    isPremium: true,
  },
  {
    id: 'after_consecutive_days',
    name: 'After Consecutive Days',
    category: 'conditional',
    icon: Activity,
    description: 'What happens after N consecutive up/down days?',
    whatItMeasures: 'Forward returns after winning or losing streaks.',
    whyItMatters: 'Long streaks may signal exhaustion or strong momentum.',
    howToUse: 'If reversals are common, fade streaks. If not, ride momentum.',
    difficulty: 'intermediate',
    tags: ['conditional', 'streaks', 'reversal'],
    params: [
      {
        key: 'consecutiveDays',
        label: 'Consecutive Days',
        description: 'Number of days in a row',
        type: 'slider',
        min: 2,
        max: 7,
        step: 1,
        default: 3,
        beginner: '3 days in a row is a notable streak'
      },
      {
        key: 'direction',
        label: 'Direction',
        description: 'Track up streaks or down streaks',
        type: 'select',
        default: 'down',
        options: [
          { value: 'down', label: 'Down Days' },
          { value: 'up', label: 'Up Days' }
        ],
        beginner: 'Down = look for bounce after losing streak'
      },
      {
        key: 'forwardDays',
        label: 'Result Timeline',
        description: 'How many days forward to measure returns',
        type: 'select',
        default: '5',
        options: [
          { value: '1', label: '1 Day' },
          { value: '5', label: '1 Week' },
          { value: '21', label: '1 Month' },
          { value: '63', label: '3 Months' },
          { value: '126', label: '6 Months' },
          { value: '252', label: '1 Year' }
        ],
        beginner: 'Choose how far ahead to measure the outcome'
      }
    ],
    isPremium: true,
  },
  {
    id: 'after_high_volume',
    name: 'After High Volume',
    category: 'conditional',
    icon: Volume2,
    description: 'What happens after unusually high volume days?',
    whatItMeasures: 'Forward returns after volume spikes (up or down days separately).',
    whyItMatters: 'High volume can signal capitulation, breakouts, or climax moves.',
    howToUse: 'Check if high volume up days continue or exhaust, same for down days.',
    difficulty: 'intermediate',
    tags: ['conditional', 'volume', 'climax'],
    params: [
      {
        key: 'volumeMultiplier',
        label: 'Volume Multiplier',
        description: 'How many times above average volume',
        type: 'slider',
        min: 1.5,
        max: 5,
        step: 0.5,
        default: 2,
        beginner: '2x = double the average volume'
      },
      {
        key: 'avgPeriod',
        label: 'Average Period',
        description: 'Days for calculating average volume',
        type: 'slider',
        min: 10,
        max: 50,
        step: 5,
        default: 20,
        beginner: '20-day average is standard'
      },
      {
        key: 'forwardDays',
        label: 'Result Timeline',
        description: 'How many days forward to measure returns',
        type: 'select',
        default: '5',
        options: [
          { value: '1', label: '1 Day' },
          { value: '5', label: '1 Week' },
          { value: '21', label: '1 Month' },
          { value: '63', label: '3 Months' },
          { value: '126', label: '6 Months' },
          { value: '252', label: '1 Year' }
        ],
        beginner: 'Choose how far ahead to measure the outcome'
      }
    ],
    isPremium: true,
  },
  {
    id: 'after_gap',
    name: 'After Gap Up/Down',
    category: 'conditional',
    icon: ArrowUpDown,
    description: 'What happens after overnight gaps?',
    whatItMeasures: 'Forward returns after gap ups and gap downs, plus fill rates.',
    whyItMatters: 'Gaps often signal strong sentiment. Do they continue or fill?',
    howToUse: 'High fill rate = fade gaps. Continuation = ride the gap direction.',
    difficulty: 'intermediate',
    tags: ['conditional', 'gaps', 'overnight'],
    params: [
      {
        key: 'minGapPercent',
        label: 'Minimum Gap (%)',
        description: 'Minimum gap size to analyze',
        type: 'slider',
        min: 0.5,
        max: 5,
        step: 0.5,
        default: 1,
        beginner: '1% gap is significant for most stocks'
      },
      {
        key: 'forwardDays',
        label: 'Result Timeline',
        description: 'How many days forward to measure returns',
        type: 'select',
        default: '5',
        options: [
          { value: '1', label: '1 Day' },
          { value: '5', label: '1 Week' },
          { value: '21', label: '1 Month' },
          { value: '63', label: '3 Months' },
          { value: '126', label: '6 Months' },
          { value: '252', label: '1 Year' }
        ],
        beginner: 'Choose how far ahead to measure the outcome'
      }
    ],
    isPremium: true,
  },
  {
    id: 'below_ma',
    name: 'Below Moving Average',
    category: 'conditional',
    icon: LineChart,
    description: 'What happens when price is X% below moving average?',
    whatItMeasures: 'Forward returns when stock is extended below its moving average.',
    whyItMatters: 'Stocks far below MA may bounce (mean reversion) or continue falling.',
    howToUse: 'High win rate = buy the dip works. Low = broken stocks stay down.',
    difficulty: 'intermediate',
    tags: ['conditional', 'moving-average', 'dip'],
    params: [
      {
        key: 'maPeriod',
        label: 'MA Period',
        description: 'Moving average period',
        type: 'slider',
        min: 20,
        max: 200,
        step: 10,
        default: 50,
        beginner: '50-day MA is commonly watched'
      },
      {
        key: 'threshold',
        label: 'Below Threshold (%)',
        description: 'How far below MA to trigger',
        type: 'slider',
        min: 2,
        max: 20,
        step: 1,
        default: 5,
        beginner: '5% below MA is notably oversold'
      },
      {
        key: 'forwardDays',
        label: 'Result Timeline',
        description: 'How many days forward to measure returns',
        type: 'select',
        default: '5',
        options: [
          { value: '1', label: '1 Day' },
          { value: '5', label: '1 Week' },
          { value: '21', label: '1 Month' },
          { value: '63', label: '3 Months' },
          { value: '126', label: '6 Months' },
          { value: '252', label: '1 Year' }
        ],
        beginner: 'Choose how far ahead to measure the outcome'
      }
    ],
    isPremium: true,
  },
  {
    id: 'after_drawdown',
    name: 'After Drawdown X%',
    category: 'conditional',
    icon: TrendingDown,
    description: 'What happens after a X% drawdown from peak?',
    whatItMeasures: 'Forward returns after entering significant drawdown territory.',
    whyItMatters: 'Drawdowns can signal buying opportunities or the start of longer declines.',
    howToUse: 'Strong recovery stats = buy drawdowns. Weak = wait for stabilization.',
    difficulty: 'intermediate',
    tags: ['conditional', 'drawdown', 'recovery'],
    params: [
      {
        key: 'drawdownThreshold',
        label: 'Drawdown Threshold (%)',
        description: 'Minimum drawdown to trigger',
        type: 'slider',
        min: 5,
        max: 30,
        step: 5,
        default: 10,
        beginner: '10% drawdown is correction territory'
      },
      {
        key: 'forwardDays',
        label: 'Result Timeline',
        description: 'How many days forward to measure returns',
        type: 'select',
        default: '5',
        options: [
          { value: '1', label: '1 Day' },
          { value: '5', label: '1 Week' },
          { value: '21', label: '1 Month' },
          { value: '63', label: '3 Months' },
          { value: '126', label: '6 Months' },
          { value: '252', label: '1 Year' }
        ],
        beginner: 'Choose how far ahead to measure the outcome'
      }
    ],
    isPremium: true,
  }
];

// Study Categories
export const STUDY_CATEGORIES: StudyCategory[] = [
  { id: 'conditional', name: 'Conditional', icon: GitBranch, description: 'What happens after X?' },
  { id: 'basic', name: 'Basic Stats', icon: BarChart3, description: 'Simple statistics anyone can understand' },
  { id: 'seasonality', name: 'Timing', icon: Calendar, description: 'Best days, weeks, and months' },
  { id: 'technical', name: 'Technical', icon: LineChart, description: 'RSI, MACD, Moving Averages' },
  { id: 'volatility', name: 'Risk', icon: Shield, description: 'Volatility and drawdown analysis' },
  { id: 'patterns', name: 'Patterns', icon: Layers, description: 'Gaps, ranges, and breakouts' },
  { id: 'volume', name: 'Volume', icon: Volume2, description: 'Buying and selling pressure' },
  { id: 'projections', name: 'Targets', icon: Target, description: 'Price projections' },
  { id: 'fundamental', name: 'Fundamentals', icon: Landmark, description: 'Earnings, Fed, economic events' }
];

// Time Period Options
export const PERIOD_OPTIONS = [
  { value: '6m', label: '6 Months', days: 126 },
  { value: '1y', label: '1 Year', days: 252 },
  { value: '2y', label: '2 Years', days: 504 },
  { value: '3y', label: '3 Years', days: 756 },
  { value: '5y', label: '5 Years', days: 1260 },
  { value: '10y', label: '10 Years', days: 2520 }
];
