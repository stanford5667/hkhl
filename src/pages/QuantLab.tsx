/**
 * QUANT LAB - "Canva for Quants"
 * 
 * A beginner-friendly quantitative analysis tool that makes
 * professional-grade studies accessible to everyone.
 * 
 * Features:
 * - Visual parameter controls (sliders, toggles)
 * - Plain-English explanations
 * - Real-time preview
 * - Study templates for beginners
 * - No coding required
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  FlaskConical, Search, Play, Plus, Trash2, Save,
  TrendingUp, TrendingDown, BarChart3, Activity, Info,
  Calendar, Zap, Layers, Volume2, Crosshair, LineChart,
  Gauge, ArrowLeftRight, Mountain, ArrowUpDown, Settings2,
  Sparkles, HelpCircle, Lightbulb, Target, Shield, Loader2,
  CheckCircle2, X, RotateCcw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ===========================================
// STUDY DEFINITIONS WITH BEGINNER-FRIENDLY EXPLANATIONS
// ===========================================

interface StudyParam {
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

interface StudyDefinition {
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
}

const STUDY_DEFINITIONS: StudyDefinition[] = [
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
    params: [
      {
        key: 'minGapPercent',
        label: 'Minimum Gap',
        description: 'Only count days with at least this much gain',
        type: 'slider',
        min: 0,
        max: 2,
        step: 0.1,
        default: 0,
        beginner: 'Set to 0 to count all up days, or higher to only count significant moves'
      }
    ]
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
    params: [
      {
        key: 'minChangePercent',
        label: 'Minimum Change',
        description: 'Only count days with at least this much change',
        type: 'slider',
        min: 0,
        max: 1,
        step: 0.1,
        default: 0,
        beginner: 'Set higher to filter out tiny moves'
      }
    ]
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
    params: [
      {
        key: 'bucketSize',
        label: 'Histogram Bucket Size',
        description: 'Width of each bar in the histogram',
        type: 'slider',
        min: 0.25,
        max: 2,
        step: 0.25,
        default: 0.5,
        beginner: 'Smaller = more detailed chart, larger = simpler view'
      },
      {
        key: 'outlierThreshold',
        label: 'Outlier Threshold',
        description: 'Standard deviations to flag as outlier',
        type: 'slider',
        min: 2,
        max: 4,
        step: 0.5,
        default: 3,
        beginner: 'How extreme a move needs to be to flag it as unusual'
      }
    ]
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
    params: [
      {
        key: 'minStreakLength',
        label: 'Min Streak to Count',
        description: 'Minimum days in a row to be considered a streak',
        type: 'slider',
        min: 2,
        max: 5,
        step: 1,
        default: 2,
        beginner: 'Set to 3+ to only see significant streaks'
      }
    ]
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
    params: [
      {
        key: 'forwardDays',
        label: 'Holding Period',
        description: 'How many days to measure return',
        type: 'slider',
        min: 1,
        max: 5,
        step: 1,
        default: 1,
        beginner: '1 = next day return, 5 = week-long return'
      }
    ]
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
    params: []
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
    params: [
      {
        key: 'period',
        label: 'RSI Period',
        description: 'Number of days for RSI calculation',
        type: 'slider',
        min: 5,
        max: 30,
        step: 1,
        default: 14,
        beginner: '14 is standard. Lower = more sensitive. Higher = smoother.'
      },
      {
        key: 'overbought',
        label: 'Overbought Level',
        description: 'RSI above this is considered overbought',
        type: 'slider',
        min: 60,
        max: 90,
        step: 5,
        default: 70,
        beginner: '70 is standard. Set higher for fewer, stronger signals.'
      },
      {
        key: 'oversold',
        label: 'Oversold Level',
        description: 'RSI below this is considered oversold',
        type: 'slider',
        min: 10,
        max: 40,
        step: 5,
        default: 30,
        beginner: '30 is standard. Set lower for fewer, stronger signals.'
      },
      {
        key: 'forwardDays',
        label: 'Days to Measure',
        description: 'How many days forward to check return',
        type: 'slider',
        min: 1,
        max: 20,
        step: 1,
        default: 5,
        beginner: 'After an overbought/oversold signal, how long to wait'
      }
    ]
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
    params: [
      {
        key: 'shortPeriod',
        label: 'Short MA',
        description: 'Fast moving average period',
        type: 'slider',
        min: 5,
        max: 50,
        step: 5,
        default: 20,
        beginner: '20 days is common. Shows recent trend.'
      },
      {
        key: 'mediumPeriod',
        label: 'Medium MA',
        description: 'Medium moving average period',
        type: 'slider',
        min: 20,
        max: 100,
        step: 10,
        default: 50,
        beginner: '50 days. Important support/resistance level.'
      },
      {
        key: 'longPeriod',
        label: 'Long MA',
        description: 'Long moving average period',
        type: 'slider',
        min: 100,
        max: 300,
        step: 50,
        default: 200,
        beginner: '200 days. The "big picture" trend.'
      },
      {
        key: 'maType',
        label: 'MA Type',
        description: 'Simple or Exponential',
        type: 'select',
        default: 'sma',
        options: [
          { value: 'sma', label: 'Simple (SMA)' },
          { value: 'ema', label: 'Exponential (EMA)' }
        ],
        beginner: 'SMA = equal weight to all days. EMA = more weight to recent days.'
      }
    ]
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
    params: [
      {
        key: 'shortMa',
        label: 'Short MA',
        description: 'Fast moving average',
        type: 'slider',
        min: 5,
        max: 50,
        step: 5,
        default: 20,
        beginner: 'Short-term trend indicator'
      },
      {
        key: 'mediumMa',
        label: 'Medium MA',
        description: 'Medium moving average',
        type: 'slider',
        min: 20,
        max: 100,
        step: 10,
        default: 50,
        beginner: 'Medium-term trend indicator'
      },
      {
        key: 'longMa',
        label: 'Long MA',
        description: 'Long moving average',
        type: 'slider',
        min: 100,
        max: 300,
        step: 50,
        default: 200,
        beginner: 'Long-term trend indicator'
      },
      {
        key: 'recentDays',
        label: 'Recent Days',
        description: 'Days to check for higher highs/lows',
        type: 'slider',
        min: 5,
        max: 60,
        step: 5,
        default: 20,
        beginner: 'How far back to check price pattern'
      }
    ]
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
    params: [
      {
        key: 'fastPeriod',
        label: 'Fast Period',
        description: 'Fast EMA period',
        type: 'slider',
        min: 8,
        max: 20,
        step: 1,
        default: 12,
        beginner: 'Standard is 12'
      },
      {
        key: 'slowPeriod',
        label: 'Slow Period',
        description: 'Slow EMA period',
        type: 'slider',
        min: 20,
        max: 35,
        step: 1,
        default: 26,
        beginner: 'Standard is 26'
      },
      {
        key: 'signalPeriod',
        label: 'Signal Period',
        description: 'Signal line EMA period',
        type: 'slider',
        min: 5,
        max: 15,
        step: 1,
        default: 9,
        beginner: 'Standard is 9'
      }
    ]
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
    params: [
      {
        key: 'period',
        label: 'Period',
        description: 'Moving average period',
        type: 'slider',
        min: 10,
        max: 50,
        step: 5,
        default: 20,
        beginner: '20 is standard'
      },
      {
        key: 'stdDevMultiplier',
        label: 'Band Width',
        description: 'Standard deviations for bands',
        type: 'slider',
        min: 1,
        max: 3,
        step: 0.5,
        default: 2,
        beginner: '2 captures 95% of price action'
      }
    ]
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
    params: [
      {
        key: 'kPeriod',
        label: '%K Period',
        description: 'Lookback period',
        type: 'slider',
        min: 5,
        max: 21,
        step: 1,
        default: 14,
        beginner: 'Standard is 14 days'
      },
      {
        key: 'dPeriod',
        label: '%D Period',
        description: 'Signal line smoothing',
        type: 'slider',
        min: 1,
        max: 7,
        step: 1,
        default: 3,
        beginner: 'Standard is 3 days'
      },
      {
        key: 'overbought',
        label: 'Overbought',
        description: 'Overbought threshold',
        type: 'slider',
        min: 70,
        max: 90,
        step: 5,
        default: 80,
        beginner: 'Standard is 80'
      },
      {
        key: 'oversold',
        label: 'Oversold',
        description: 'Oversold threshold',
        type: 'slider',
        min: 10,
        max: 30,
        step: 5,
        default: 20,
        beginner: 'Standard is 20'
      }
    ]
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
    params: [
      {
        key: 'atrPeriod',
        label: 'ATR Period',
        description: 'Days for ATR calculation',
        type: 'slider',
        min: 5,
        max: 30,
        step: 1,
        default: 14,
        beginner: '14 is standard. Measures average daily movement.'
      },
      {
        key: 'volLookback',
        label: 'Vol Lookback',
        description: 'Days for volatility calculation',
        type: 'slider',
        min: 10,
        max: 60,
        step: 5,
        default: 20,
        beginner: 'Period for calculating annualized volatility'
      }
    ]
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
    params: [
      {
        key: 'significantThreshold',
        label: 'Significant Threshold',
        description: 'Minimum % drop to flag as significant',
        type: 'slider',
        min: 3,
        max: 15,
        step: 1,
        default: 5,
        beginner: 'Only show drawdowns bigger than this %'
      }
    ]
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
    params: [
      {
        key: 'stdDevThreshold',
        label: 'Extreme Move Size',
        description: 'Standard deviations for "large" move',
        type: 'slider',
        min: 1,
        max: 4,
        step: 0.5,
        default: 2,
        beginner: '2 = roughly top/bottom 5% of days'
      },
      {
        key: 'lookbackDays',
        label: 'Days After',
        description: 'Days to check for reversal',
        type: 'slider',
        min: 1,
        max: 5,
        step: 1,
        default: 1,
        beginner: 'How many days after the big move to check'
      }
    ]
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
    params: [
      {
        key: 'minGapPercent',
        label: 'Minimum Gap',
        description: 'Minimum gap size to analyze',
        type: 'slider',
        min: 0.25,
        max: 2,
        step: 0.25,
        default: 0.5,
        beginner: 'Only count gaps bigger than this %'
      },
      {
        key: 'forwardDays',
        label: 'Days to Track',
        description: 'Days after gap to measure',
        type: 'slider',
        min: 1,
        max: 5,
        step: 1,
        default: 1,
        beginner: 'How long after the gap to track'
      }
    ]
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
    params: [
      {
        key: 'dojiThreshold',
        label: 'Doji Threshold',
        description: 'Max body % of range to be a doji',
        type: 'slider',
        min: 5,
        max: 20,
        step: 5,
        default: 10,
        beginner: 'How small the body needs to be for a doji'
      }
    ]
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
    params: [
      {
        key: 'lookbackPeriod',
        label: 'Lookback Period',
        description: 'Days to define "new high"',
        type: 'slider',
        min: 5,
        max: 60,
        step: 5,
        default: 20,
        beginner: '20 = monthly high. 60 = quarterly high.'
      },
      {
        key: 'forwardDays',
        label: 'Forward Days',
        description: 'Days to measure performance after breakout',
        type: 'slider',
        min: 1,
        max: 20,
        step: 1,
        default: 5,
        beginner: 'How long after the breakout to check'
      }
    ]
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
    params: [
      {
        key: 'avgPeriod',
        label: 'Average Period',
        description: 'Days for volume average',
        type: 'slider',
        min: 5,
        max: 50,
        step: 5,
        default: 20,
        beginner: 'Period to calculate average volume'
      },
      {
        key: 'highVolThreshold',
        label: 'High Volume Threshold',
        description: 'Multiplier for "high volume" day',
        type: 'slider',
        min: 1.25,
        max: 3,
        step: 0.25,
        default: 1.5,
        beginner: '1.5x = 50% above average volume'
      }
    ]
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
    params: [
      {
        key: 'confidenceLevel',
        label: 'Confidence Range',
        description: 'Standard deviations for bull/bear',
        type: 'slider',
        min: 0.5,
        max: 2,
        step: 0.5,
        default: 1,
        beginner: '1 = ~68% confidence. 2 = ~95% confidence.'
      }
    ]
  }
];

// Study Categories
const STUDY_CATEGORIES = [
  { id: 'basic', name: 'Basic Stats', icon: BarChart3, description: 'Simple statistics anyone can understand' },
  { id: 'seasonality', name: 'Timing', icon: Calendar, description: 'Best days, weeks, and months' },
  { id: 'technical', name: 'Technical', icon: LineChart, description: 'RSI, MACD, Moving Averages' },
  { id: 'volatility', name: 'Risk', icon: Shield, description: 'Volatility and drawdown analysis' },
  { id: 'patterns', name: 'Patterns', icon: Layers, description: 'Gaps, ranges, and breakouts' },
  { id: 'volume', name: 'Volume', icon: Volume2, description: 'Buying and selling pressure' },
  { id: 'projections', name: 'Targets', icon: Target, description: 'Price projections' }
];

// Preset Templates
const STUDY_TEMPLATES = [
  {
    id: 'quick-health-check',
    name: '🩺 Quick Health Check',
    description: 'Get a fast overview of any stock',
    studies: ['trend_strength', 'rsi_analysis', 'volume_analysis'],
    difficulty: 'beginner'
  },
  {
    id: 'momentum-scanner',
    name: '🚀 Momentum Check',
    description: 'Is momentum building or fading?',
    studies: ['rsi_analysis', 'macd_analysis', 'up_down_streaks'],
    difficulty: 'beginner'
  },
  {
    id: 'trend-analysis',
    name: '📈 Trend Analysis',
    description: 'Full trend breakdown with MAs',
    studies: ['moving_average_analysis', 'trend_strength', 'high_low_analysis'],
    difficulty: 'intermediate'
  },
  {
    id: 'risk-assessment',
    name: '⚠️ Risk Assessment',
    description: 'How risky is this stock?',
    studies: ['volatility_analysis', 'drawdown_analysis', 'daily_return_distribution'],
    difficulty: 'intermediate'
  },
  {
    id: 'timing-optimizer',
    name: '⏰ Best Time to Trade',
    description: 'Find optimal entry points',
    studies: ['day_of_week_returns', 'month_of_year_returns', 'gap_analysis'],
    difficulty: 'beginner'
  },
  {
    id: 'full-analysis',
    name: '🔬 Complete Analysis',
    description: 'Run all major studies',
    studies: ['trend_strength', 'rsi_analysis', 'moving_average_analysis', 'volume_analysis', 'volatility_analysis', 'drawdown_analysis'],
    difficulty: 'advanced'
  }
];

// Time Period Options
const PERIOD_OPTIONS = [
  { value: '6m', label: '6 Months', days: 126 },
  { value: '1y', label: '1 Year', days: 252 },
  { value: '2y', label: '2 Years', days: 504 },
  { value: '3y', label: '3 Years', days: 756 },
  { value: '5y', label: '5 Years', days: 1260 },
  { value: '10y', label: '10 Years', days: 2520 }
];

// ===========================================
// MAIN COMPONENT
// ===========================================

export default function QuantLab() {
  const { user } = useAuth();
  
  // State
  const [ticker, setTicker] = useState('');
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [period, setPeriod] = useState('3y');
  const [selectedStudies, setSelectedStudies] = useState<string[]>([]);
  const [studyParams, setStudyParams] = useState<Record<string, Record<string, any>>>({});
  const [results, setResults] = useState<Record<string, any>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [runningStudy, setRunningStudy] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(true);
  const [activeCategory, setActiveCategory] = useState('basic');
  const [isSaving, setIsSaving] = useState<string | null>(null);

  // Initialize params with defaults
  const initStudyParams = useCallback((studyId: string) => {
    const study = STUDY_DEFINITIONS.find(s => s.id === studyId);
    if (!study) return;
    
    const defaults: Record<string, any> = {};
    study.params.forEach(p => {
      defaults[p.key] = p.default;
    });
    
    setStudyParams(prev => ({
      ...prev,
      [studyId]: defaults
    }));
  }, []);

  // Add a study
  const addStudy = useCallback((studyId: string) => {
    if (!selectedStudies.includes(studyId)) {
      setSelectedStudies(prev => [...prev, studyId]);
      initStudyParams(studyId);
    }
  }, [selectedStudies, initStudyParams]);

  // Remove a study
  const removeStudy = useCallback((studyId: string) => {
    setSelectedStudies(prev => prev.filter(s => s !== studyId));
    setResults(prev => {
      const next = { ...prev };
      delete next[studyId];
      return next;
    });
  }, []);

  // Update a parameter
  const updateParam = useCallback((studyId: string, key: string, value: any) => {
    setStudyParams(prev => ({
      ...prev,
      [studyId]: {
        ...(prev[studyId] || {}),
        [key]: value
      }
    }));
  }, []);

  // Reset params to defaults
  const resetParams = useCallback((studyId: string) => {
    initStudyParams(studyId);
    toast.success('Parameters reset to defaults');
  }, [initStudyParams]);

  // Load a template
  const loadTemplate = useCallback((templateId: string) => {
    const template = STUDY_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;
    
    setSelectedStudies(template.studies);
    template.studies.forEach(initStudyParams);
    toast.success(`Loaded "${template.name}" template`);
  }, [initStudyParams]);

  // Set ticker
  const handleSetTicker = useCallback((t: string) => {
    const normalized = t.toUpperCase().trim();
    if (normalized) {
      setSelectedTicker(normalized);
      setResults({});
    }
  }, []);

  // Run a single study
  const runStudy = useCallback(async (studyId: string) => {
    if (!selectedTicker) {
      toast.error('Please enter a ticker symbol');
      return;
    }

    setRunningStudy(studyId);
    
    try {
      const periodData = PERIOD_OPTIONS.find(p => p.value === period);
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (periodData?.days || 756));

      const { data, error } = await supabase.functions.invoke('run-asset-study', {
        body: {
          ticker: selectedTicker,
          studyType: studyId,
          startDate: startDate.toISOString().split('T')[0],
          endDate,
          params: studyParams[studyId] || {}
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      setResults(prev => ({
        ...prev,
        [studyId]: {
          ...data.result,
          barsAnalyzed: data.barsAnalyzed,
          dateRange: data.dateRange,
          usedMockData: data.useMockData
        }
      }));

      toast.success(`${STUDY_DEFINITIONS.find(s => s.id === studyId)?.name} completed`);
    } catch (error: any) {
      console.error('Study error:', error);
      toast.error(error.message || 'Failed to run study');
    } finally {
      setRunningStudy(null);
    }
  }, [selectedTicker, period, studyParams]);

  // Run all selected studies
  const runAllStudies = useCallback(async () => {
    if (!selectedTicker) {
      toast.error('Please enter a ticker symbol');
      return;
    }

    if (selectedStudies.length === 0) {
      toast.error('Please select at least one study');
      return;
    }

    setIsRunning(true);

    for (const studyId of selectedStudies) {
      await runStudy(studyId);
    }

    setIsRunning(false);
    toast.success('All studies completed!');
  }, [selectedTicker, selectedStudies, runStudy]);

  // Save study result
  const saveStudyResult = useCallback(async (studyId: string) => {
    if (!user) {
      toast.info('Create a free account to save unlimited study results', { 
        description: 'Build your personal research library.',
        action: { label: 'Sign Up', onClick: () => window.location.href = '/login' }
      });
      return;
    }

    const result = results[studyId];
    const study = STUDY_DEFINITIONS.find(s => s.id === studyId);
    if (!result || !study) {
      toast.error('No results to save');
      return;
    }

    setIsSaving(studyId);
    try {
      const { error } = await supabase.from('saved_studies').insert({
        user_id: user.id,
        ticker: selectedTicker,
        study_type: studyId,
        study_name: study.name,
        period,
        params: studyParams[studyId] || {},
        result,
        bars_analyzed: result.barsAnalyzed,
        date_range: result.dateRange
      });

      if (error) throw error;
      toast.success('Study saved to your library!');
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(error.message || 'Failed to save study');
    } finally {
      setIsSaving(null);
    }
  }, [user, results, selectedTicker, period, studyParams]);

  // Get study definition
  const getStudy = (id: string) => STUDY_DEFINITIONS.find(s => s.id === id);

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 sm:p-6 space-y-6 pb-20 md:pb-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
              <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg shadow-purple-500/25">
                <FlaskConical className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
              </div>
              Quant Lab
            </h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Professional stock analysis made simple — no coding required
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHelp(!showHelp)}
            >
              <HelpCircle className="h-4 w-4 mr-1" />
              {showHelp ? 'Hide' : 'Show'} Tips
            </Button>
          </div>
        </div>

        {/* Getting Started Card */}
        <AnimatePresence>
          {showHelp && !selectedTicker && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Card className="bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 border-primary/20">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <Lightbulb className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-2">Welcome to Quant Lab! 👋</h3>
                      <p className="text-muted-foreground mb-4">
                        Run professional-grade stock analysis with just a few clicks. Here's how:
                      </p>
                      <ol className="space-y-2 text-sm">
                        <li className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">1</span>
                          <span>Enter a stock ticker (like AAPL, MSFT, or TSLA)</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">2</span>
                          <span>Pick studies from the categories or use a template</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">3</span>
                          <span>Adjust parameters with the sliders (or use defaults)</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">4</span>
                          <span>Click "Run Studies" to see your results!</span>
                        </li>
                      </ol>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setShowHelp(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Ticker Input + Period Selection */}
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Label className="text-sm font-medium mb-2 block">Stock Ticker</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter ticker (e.g., AAPL)"
                    value={ticker}
                    onChange={(e) => setTicker(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && handleSetTicker(ticker)}
                    className="text-lg font-mono"
                  />
                  <Button onClick={() => handleSetTicker(ticker)} disabled={!ticker}>
                    <Search className="h-4 w-4 mr-2" />
                    Analyze
                  </Button>
                </div>
                
                {/* Quick Tickers */}
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="text-xs text-muted-foreground">Popular:</span>
                  {['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'SPY', 'QQQ'].map((t) => (
                    <Badge
                      key={t}
                      variant={selectedTicker === t ? 'default' : 'outline'}
                      className="cursor-pointer hover:bg-secondary"
                      onClick={() => handleSetTicker(t)}
                    >
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="w-full sm:w-48">
                <Label className="text-sm font-medium mb-2 block">Time Period</Label>
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    {PERIOD_OPTIONS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  More data = more reliable results
                </p>
              </div>
            </div>

            {selectedTicker && (
              <div className="mt-4 p-3 bg-muted/50 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="font-semibold">{selectedTicker}</span>
                  <span className="text-muted-foreground">ready for analysis</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedTicker(null)}>
                  Change
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Templates */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              Quick Templates
            </CardTitle>
            <CardDescription>
              One-click analysis packages for common scenarios
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {STUDY_TEMPLATES.map((template) => (
                <Button
                  key={template.id}
                  variant="outline"
                  className="h-auto py-3 px-4 justify-start text-left"
                  onClick={() => loadTemplate(template.id)}
                >
                  <div>
                    <p className="font-medium">{template.name}</p>
                    <p className="text-xs text-muted-foreground">{template.description}</p>
                    <div className="flex gap-1 mt-2">
                      {template.studies.slice(0, 3).map((s) => (
                        <Badge key={s} variant="secondary" className="text-[10px]">
                          {STUDY_DEFINITIONS.find(sd => sd.id === s)?.name.slice(0, 10)}...
                        </Badge>
                      ))}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Study Selection */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Select Studies</CardTitle>
                <CardDescription>
                  Click to add studies to your analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Tabs value={activeCategory} onValueChange={setActiveCategory}>
                  <TabsList className="w-full flex-wrap h-auto gap-1 bg-muted/50 p-1 rounded-none border-b">
                    {STUDY_CATEGORIES.map((cat) => (
                      <TabsTrigger 
                        key={cat.id} 
                        value={cat.id} 
                        className="gap-1.5 text-xs flex-1 min-w-[80px]"
                      >
                        <cat.icon className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{cat.name}</span>
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {STUDY_CATEGORIES.map((cat) => (
                    <TabsContent key={cat.id} value={cat.id} className="mt-0 p-3">
                      <div className="space-y-2">
                        {STUDY_DEFINITIONS.filter(s => s.category === cat.id).map((study) => (
                          <button
                            key={study.id}
                            onClick={() => addStudy(study.id)}
                            disabled={selectedStudies.includes(study.id)}
                            className={cn(
                              "w-full p-3 rounded-lg border text-left transition-all",
                              selectedStudies.includes(study.id)
                                ? "border-primary bg-primary/5 opacity-50"
                                : "border-border hover:border-primary/50 hover:bg-muted/50"
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <div className={cn(
                                "p-2 rounded-lg shrink-0",
                                selectedStudies.includes(study.id) ? "bg-primary/20" : "bg-muted"
                              )}>
                                <study.icon className={cn(
                                  "h-4 w-4",
                                  selectedStudies.includes(study.id) ? "text-primary" : "text-muted-foreground"
                                )} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm">{study.name}</span>
                                  <Badge variant="outline" className="text-[10px]">
                                    {study.difficulty}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                  {study.description}
                                </p>
                              </div>
                              {selectedStudies.includes(study.id) ? (
                                <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                              ) : (
                                <Plus className="h-5 w-5 text-muted-foreground shrink-0" />
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Selected Studies & Results */}
          <div className="lg:col-span-2 space-y-4">
            {/* Selected Studies */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Your Analysis</CardTitle>
                    <CardDescription>
                      {selectedStudies.length} studies selected
                    </CardDescription>
                  </div>
                  <Button
                    onClick={runAllStudies}
                    disabled={!selectedTicker || selectedStudies.length === 0 || isRunning}
                    className="gap-2"
                  >
                    {isRunning ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    Run All Studies
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {selectedStudies.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FlaskConical className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No studies selected yet</p>
                    <p className="text-sm">Click on studies in the left panel to add them</p>
                  </div>
                ) : (
                  <Accordion type="multiple" defaultValue={selectedStudies} className="space-y-2">
                    {selectedStudies.map((studyId) => {
                      const study = getStudy(studyId);
                      if (!study) return null;
                      const result = results[studyId];
                      const params = studyParams[studyId] || {};

                      return (
                        <AccordionItem
                          key={studyId}
                          value={studyId}
                          className="border rounded-lg px-4"
                        >
                          <AccordionTrigger className="hover:no-underline py-3">
                            <div className="flex items-center gap-3 flex-1">
                              <div className={cn(
                                "p-2 rounded-lg",
                                result ? "bg-green-500/10" : "bg-muted"
                              )}>
                                <study.icon className={cn(
                                  "h-4 w-4",
                                  result ? "text-green-500" : "text-muted-foreground"
                                )} />
                              </div>
                              <div className="text-left">
                                <p className="font-medium text-sm">{study.name}</p>
                                {result && (
                                  <p className="text-xs text-muted-foreground">
                                    {result.interpretation?.slice(0, 50)}...
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 mr-2">
                              {runningStudy === studyId && (
                                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                              )}
                              {result && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeStudy(studyId);
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pt-0 pb-4">
                            {/* Help Section */}
                            {showHelp && (
                              <div className="mb-4 p-3 bg-blue-500/5 rounded-lg border border-blue-500/10">
                                <div className="flex items-start gap-2">
                                  <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                                  <div className="text-sm">
                                    <p className="font-medium text-blue-500">What this measures:</p>
                                    <p className="text-muted-foreground">{study.whatItMeasures}</p>
                                    <p className="font-medium text-blue-500 mt-2">Why it matters:</p>
                                    <p className="text-muted-foreground">{study.whyItMatters}</p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Parameters */}
                            {study.params.length > 0 && (
                              <div className="mb-4 space-y-4">
                                <div className="flex items-center justify-between">
                                  <Label className="text-sm font-medium flex items-center gap-2">
                                    <Settings2 className="h-4 w-4" />
                                    Parameters
                                  </Label>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => resetParams(studyId)}
                                  >
                                    <RotateCcw className="h-3 w-3 mr-1" />
                                    Reset
                                  </Button>
                                </div>
                                
                                {study.params.map((param) => (
                                  <div key={param.key} className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <Label className="text-sm flex items-center gap-2">
                                        {param.label}
                                        {param.beginner && showHelp && (
                                          <Tooltip>
                                            <TooltipTrigger>
                                              <HelpCircle className="h-3 w-3 text-muted-foreground" />
                                            </TooltipTrigger>
                                            <TooltipContent className="max-w-xs">
                                              {param.beginner}
                                            </TooltipContent>
                                          </Tooltip>
                                        )}
                                      </Label>
                                      <span className="text-sm font-mono">
                                        {params[param.key] ?? param.default}
                                      </span>
                                    </div>
                                    
                                    {param.type === 'slider' && (
                                      <Slider
                                        value={[params[param.key] ?? param.default]}
                                        onValueChange={([v]) => updateParam(studyId, param.key, v)}
                                        min={param.min}
                                        max={param.max}
                                        step={param.step}
                                        className="w-full"
                                      />
                                    )}
                                    
                                    {param.type === 'select' && param.options && (
                                      <Select
                                        value={String(params[param.key] ?? param.default)}
                                        onValueChange={(v) => updateParam(studyId, param.key, v)}
                                      >
                                        <SelectTrigger className="h-8">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {param.options.map((opt) => (
                                            <SelectItem key={String(opt.value)} value={String(opt.value)}>
                                              {opt.label}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Run Button */}
                            <Button
                              onClick={() => runStudy(studyId)}
                              disabled={!selectedTicker || runningStudy === studyId}
                              className="w-full mb-4"
                              variant="outline"
                            >
                              {runningStudy === studyId ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Play className="h-4 w-4 mr-2" />
                              )}
                              Run This Study
                            </Button>

                            {/* Results */}
                            {result && (
                              <div className="space-y-4">
                                {/* Interpretation */}
                                <div className={cn(
                                  "p-4 rounded-lg border",
                                  result.interpretation?.includes('🟢') ? "bg-green-500/5 border-green-500/20" :
                                  result.interpretation?.includes('🔴') ? "bg-red-500/5 border-red-500/20" :
                                  result.interpretation?.includes('🟡') ? "bg-yellow-500/5 border-yellow-500/20" :
                                  "bg-muted/50"
                                )}>
                                  <p className="text-sm font-medium">{result.interpretation}</p>
                                </div>

                                {/* Key Metrics */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                  {Object.entries(result).slice(0, 8).map(([key, value]) => {
                                    if (['type', 'studyName', 'params', 'interpretation', 'histogram', 'distribution', 'stats', 'recentGaps', 'recentDrawdowns', 'recentNewHighs', 'recentNewLows', 'components', 'barsAnalyzed', 'dateRange', 'usedMockData'].includes(key)) return null;
                                    if (typeof value === 'object') return null;
                                    
                                    return (
                                      <div key={key} className="p-2 bg-muted/50 rounded-lg text-center">
                                        <p className="text-xs text-muted-foreground capitalize">
                                          {key.replace(/([A-Z])/g, ' $1').trim()}
                                        </p>
                                        <p className="font-mono font-medium">
                                          {typeof value === 'number' 
                                            ? value.toFixed(value < 1 && value !== 0 ? 3 : 1)
                                            : String(value)}
                                        </p>
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* Save Button */}
                                <div className="flex items-center justify-between pt-2 border-t">
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>{result.barsAnalyzed} trading days analyzed</span>
                                    <span>•</span>
                                    <span>{result.dateRange?.start} to {result.dateRange?.end}</span>
                                  </div>
                                  <Button
                                    size="sm"
                                    onClick={() => saveStudyResult(studyId)}
                                    disabled={isSaving === studyId}
                                    className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0 shadow-lg shadow-amber-500/20"
                                  >
                                    {isSaving === studyId ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Save className="h-4 w-4" />
                                    )}
                                    Save to Library
                                    <Badge variant="secondary" className="ml-1 bg-white/20 text-white text-[10px] px-1.5 py-0">
                                      {user ? 'PRO' : 'FREE'}
                                    </Badge>
                                  </Button>
                                </div>
                              </div>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
