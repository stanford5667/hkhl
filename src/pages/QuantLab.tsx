/**
 * QUANT LAB - "Canva for Quants"
 * 
 * An INTERACTIVE LEARNING experience that makes
 * professional-grade quantitative analysis accessible to everyone.
 * 
 * Features:
 * - Visual parameter controls (sliders, toggles)
 * - Plain-English explanations with educational tooltips
 * - Tutorial system for beginners
 * - XP, achievements, and progress tracking
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
  CheckCircle2, X, RotateCcw, GraduationCap, Trophy, Brain
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Interactive Learning Components
import { LearningProvider, useLearning } from '@/components/quant-lab/LearningContext';
import { TutorialOverlay } from '@/components/quant-lab/TutorialOverlay';
import { ProgressHeader } from '@/components/quant-lab/ProgressHeader';
import { StudyExplainer } from '@/components/quant-lab/StudyExplainer';
import { ResultInterpreter } from '@/components/quant-lab/ResultInterpreter';
import { MetricDetailModal } from '@/components/quant-lab/MetricDetailModal';

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

  // Helper to format result values nicely
  const formatValue = (key: string, value: any): string => {
    if (typeof value !== 'number') return String(value);
    if (key.toLowerCase().includes('percent') || key.toLowerCase().includes('rate') || key.toLowerCase().includes('pct')) {
      return `${value.toFixed(1)}%`;
    }
    if (key.toLowerCase().includes('score')) {
      return value.toFixed(1);
    }
    if (Math.abs(value) < 1 && value !== 0) {
      return value.toFixed(3);
    }
    return value.toFixed(1);
  };

  // Get sentiment color based on interpretation
  const getSentimentStyle = (interpretation?: string) => {
    if (!interpretation) return { bg: 'bg-muted/50', border: 'border-border', text: 'text-muted-foreground' };
    if (interpretation.includes('🟢') || interpretation.toLowerCase().includes('bullish') || interpretation.toLowerCase().includes('strong')) {
      return { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-600 dark:text-emerald-400' };
    }
    if (interpretation.includes('🔴') || interpretation.toLowerCase().includes('bearish') || interpretation.toLowerCase().includes('weak')) {
      return { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-600 dark:text-red-400' };
    }
    if (interpretation.includes('🟡') || interpretation.toLowerCase().includes('neutral') || interpretation.toLowerCase().includes('mixed')) {
      return { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-600 dark:text-amber-400' };
    }
    return { bg: 'bg-muted/50', border: 'border-border', text: 'text-foreground' };
  };

  // Filter out internal/display keys from results
  const getDisplayMetrics = (result: any) => {
    const excludeKeys = ['type', 'studyName', 'params', 'interpretation', 'histogram', 'distribution', 'stats', 'recentGaps', 'recentDrawdowns', 'recentNewHighs', 'recentNewLows', 'components', 'barsAnalyzed', 'dateRange', 'usedMockData', 'dayStats', 'monthStats'];
    return Object.entries(result).filter(([key, value]) => {
      if (excludeKeys.includes(key)) return false;
      if (typeof value === 'object') return false;
      return true;
    });
  };

  return (
    <LearningProvider>
      <QuantLabContent 
        ticker={ticker}
        setTicker={setTicker}
        selectedTicker={selectedTicker}
        setSelectedTicker={setSelectedTicker}
        period={period}
        setPeriod={setPeriod}
        selectedStudies={selectedStudies}
        setSelectedStudies={setSelectedStudies}
        studyParams={studyParams}
        setStudyParams={setStudyParams}
        results={results}
        setResults={setResults}
        isRunning={isRunning}
        setIsRunning={setIsRunning}
        runningStudy={runningStudy}
        setRunningStudy={setRunningStudy}
        showHelp={showHelp}
        setShowHelp={setShowHelp}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        isSaving={isSaving}
        setIsSaving={setIsSaving}
        initStudyParams={initStudyParams}
        addStudy={addStudy}
        removeStudy={removeStudy}
        updateParam={updateParam}
        resetParams={resetParams}
        loadTemplate={loadTemplate}
        handleSetTicker={handleSetTicker}
        runStudy={runStudy}
        runAllStudies={runAllStudies}
        saveStudyResult={saveStudyResult}
        getStudy={getStudy}
        formatValue={formatValue}
        getSentimentStyle={getSentimentStyle}
        getDisplayMetrics={getDisplayMetrics}
      />
    </LearningProvider>
  );
}

// Separate component to use learning context
function QuantLabContent(props: any) {
  const {
    ticker, setTicker, selectedTicker, setSelectedTicker, period, setPeriod,
    selectedStudies, setSelectedStudies, studyParams, results, setResults,
    isRunning, runningStudy, showHelp, setShowHelp, activeCategory, setActiveCategory,
    isSaving, initStudyParams, addStudy, removeStudy, loadTemplate, handleSetTicker,
    runStudy, runAllStudies, saveStudyResult, getStudy, formatValue, getSentimentStyle, getDisplayMetrics
  } = props;

  const { progress, learningMode, markStudyCompleted, checkAndUnlockAchievements, addXp } = useLearning();
  
  // Metric detail modal state
  const [selectedMetric, setSelectedMetric] = useState<{
    key: string;
    value: any;
    studyName: string;
  } | null>(null);

  // Enhanced run study that tracks learning
  const handleRunStudy = async (studyId: string) => {
    await runStudy(studyId);
    markStudyCompleted(studyId);
    checkAndUnlockAchievements({ studyId });
    addXp(15);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Tutorial Overlay for new users */}
      <TutorialOverlay />
      
      <div className="p-4 sm:p-6 space-y-6 pb-20 md:pb-6 max-w-7xl mx-auto">
        {/* Progress Header with XP & Achievements */}
        <ProgressHeader />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
              <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg shadow-purple-500/25">
                <FlaskConical className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
              </div>
              Quant Lab
              {learningMode && (
                <Badge className="bg-gradient-to-r from-purple-500 to-primary text-white border-0 gap-1">
                  <GraduationCap className="h-3 w-3" />
                  Learning Mode
                </Badge>
              )}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Interactive learning experience for stock analysis — no coding required
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Trophy className="h-3 w-3 text-amber-500" />
              {progress.xp} XP
            </Badge>
          </div>
        </div>

        {/* STEP 1: Stock Selection - Always visible, prominent */}
        <Card className={cn(
          "transition-all border-2",
          !selectedTicker ? "border-primary shadow-lg shadow-primary/10" : "border-border"
        )}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                selectedTicker ? "bg-emerald-500 text-white" : "bg-primary text-primary-foreground"
              )}>
                {selectedTicker ? <CheckCircle2 className="h-5 w-5" /> : '1'}
              </div>
              <div>
                <CardTitle className="text-lg">Choose a Stock</CardTitle>
                <CardDescription>Enter any ticker symbol to analyze</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter ticker (e.g., AAPL, MSFT, SPY)"
                    value={ticker}
                    onChange={(e) => setTicker(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && handleSetTicker(ticker)}
                    className="text-lg font-mono h-12"
                  />
                  <Button onClick={() => handleSetTicker(ticker)} disabled={!ticker} size="lg" className="px-6">
                    <Search className="h-4 w-4 mr-2" />
                    Go
                  </Button>
                </div>
                
                {/* Quick Tickers */}
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="text-xs text-muted-foreground self-center">Try:</span>
                  {['AAPL', 'MSFT', 'GOOGL', 'NVDA', 'TSLA', 'SPY', 'QQQ'].map((t) => (
                    <Badge
                      key={t}
                      variant={selectedTicker === t ? 'default' : 'outline'}
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                      onClick={() => handleSetTicker(t)}
                    >
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="w-full sm:w-48">
                <Label className="text-xs text-muted-foreground mb-1 block">Time Period</Label>
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    {PERIOD_OPTIONS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedTicker && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                  <div>
                    <span className="text-2xl font-bold font-mono">{selectedTicker}</span>
                    <span className="text-muted-foreground ml-2">• {PERIOD_OPTIONS.find(p => p.value === period)?.label}</span>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setSelectedTicker(null); setResults({}); }}>
                  Change
                </Button>
              </motion.div>
            )}
          </CardContent>
        </Card>

        {/* STEP 2: Pick Studies - Only show after ticker is selected */}
        <AnimatePresence>
          {selectedTicker && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <Card className={cn(
                "transition-all border-2",
                selectedStudies.length === 0 ? "border-primary shadow-lg shadow-primary/10" : "border-border"
              )}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                        selectedStudies.length > 0 ? "bg-emerald-500 text-white" : "bg-primary text-primary-foreground"
                      )}>
                        {selectedStudies.length > 0 ? <CheckCircle2 className="h-5 w-5" /> : '2'}
                      </div>
                      <div>
                        <CardTitle className="text-lg">Pick Your Analysis</CardTitle>
                        <CardDescription>Choose a template or individual studies</CardDescription>
                      </div>
                    </div>
                    {selectedStudies.length > 0 && (
                      <Badge variant="secondary" className="text-sm">
                        {selectedStudies.length} selected
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-4">
                  {/* Quick Templates */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                    {STUDY_TEMPLATES.map((template) => (
                      <Button
                        key={template.id}
                        variant="outline"
                        className="h-auto py-3 px-3 flex flex-col items-center text-center hover:border-primary hover:bg-primary/5"
                        onClick={() => loadTemplate(template.id)}
                      >
                        <span className="text-lg mb-1">{template.name.split(' ')[0]}</span>
                        <span className="text-xs font-medium">{template.name.split(' ').slice(1).join(' ')}</span>
                        <span className="text-[10px] text-muted-foreground mt-1">{template.studies.length} studies</span>
                      </Button>
                    ))}
                  </div>

                  {/* Or pick individual */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">or pick individual studies</span>
                    </div>
                  </div>

                  {/* Category Tabs */}
                  <Tabs value={activeCategory} onValueChange={setActiveCategory}>
                    <TabsList className="w-full flex-wrap h-auto gap-1 bg-muted/50 p-1">
                      {STUDY_CATEGORIES.map((cat) => (
                        <TabsTrigger 
                          key={cat.id} 
                          value={cat.id} 
                          className="gap-1.5 text-xs flex-1 min-w-[70px]"
                        >
                          <cat.icon className="h-3.5 w-3.5" />
                          {cat.name}
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    {STUDY_CATEGORIES.map((cat) => (
                      <TabsContent key={cat.id} value={cat.id} className="mt-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {STUDY_DEFINITIONS.filter(s => s.category === cat.id).map((study) => (
                            <button
                              key={study.id}
                              onClick={() => addStudy(study.id)}
                              disabled={selectedStudies.includes(study.id)}
                              className={cn(
                                "p-3 rounded-lg border text-left transition-all flex items-center gap-3",
                                selectedStudies.includes(study.id)
                                  ? "border-primary bg-primary/10 opacity-70"
                                  : "border-border hover:border-primary/50 hover:bg-muted/50"
                              )}
                            >
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
                                <span className="font-medium text-sm block">{study.name}</span>
                                <span className="text-xs text-muted-foreground line-clamp-1">{study.description}</span>
                              </div>
                              {selectedStudies.includes(study.id) ? (
                                <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                              ) : (
                                <Plus className="h-5 w-5 text-muted-foreground shrink-0" />
                              )}
                            </button>
                          ))}
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>
                </CardContent>
              </Card>

              {/* STEP 3: Run & Results */}
              {selectedStudies.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="border-2 border-primary shadow-lg shadow-primary/10">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                            3
                          </div>
                          <div>
                            <CardTitle className="text-lg">Run Analysis</CardTitle>
                            <CardDescription>
                              {Object.keys(results).length === 0 
                                ? `Ready to analyze ${selectedTicker} with ${selectedStudies.length} studies`
                                : `${Object.keys(results).length}/${selectedStudies.length} studies complete`
                              }
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setSelectedStudies([]); setResults({}); }}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Clear All
                          </Button>
                          <Button
                            onClick={runAllStudies}
                            disabled={isRunning}
                            size="lg"
                            className="gap-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 shadow-lg"
                          >
                            {isRunning ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                              <Play className="h-5 w-5" />
                            )}
                            Run All Studies
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {/* Selected studies chips */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {selectedStudies.map((studyId) => {
                          const study = getStudy(studyId);
                          const hasResult = !!results[studyId];
                          return (
                            <Badge
                              key={studyId}
                              variant={hasResult ? 'default' : 'secondary'}
                              className={cn(
                                "gap-1 pr-1 cursor-pointer",
                                hasResult && "bg-emerald-500 hover:bg-emerald-600"
                              )}
                            >
                              {study?.name}
                              {hasResult && <CheckCircle2 className="h-3 w-3" />}
                              <button
                                onClick={() => removeStudy(studyId)}
                                className="ml-1 hover:bg-black/20 rounded p-0.5"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          );
                        })}
                      </div>

                      {/* Results Grid */}
                      {Object.keys(results).length > 0 && (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            <BarChart3 className="h-4 w-4" />
                            Results
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {selectedStudies.map((studyId) => {
                              const study = getStudy(studyId);
                              const result = results[studyId];
                              if (!study || !result) return null;
                              
                              const sentiment = getSentimentStyle(result.interpretation);
                              const metrics = getDisplayMetrics(result);

                              return (
                                <motion.div
                                  key={studyId}
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  className={cn(
                                    "rounded-xl border-2 overflow-hidden",
                                    sentiment.border
                                  )}
                                >
                                  {/* Card Header */}
                                  <div className={cn("p-4", sentiment.bg)}>
                                    <div className="flex items-start justify-between">
                                      <div className="flex items-center gap-3">
                                        <div className={cn("p-2 rounded-lg bg-background/80")}>
                                          <study.icon className={cn("h-5 w-5", sentiment.text)} />
                                        </div>
                                        <div>
                                          <h4 className="font-semibold">{study.name}</h4>
                                          <p className="text-xs text-muted-foreground">{study.description}</p>
                                        </div>
                                      </div>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => saveStudyResult(studyId)}
                                        disabled={isSaving === studyId}
                                        className="gap-1 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                      >
                                        {isSaving === studyId ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                          <Save className="h-4 w-4" />
                                        )}
                                        Save
                                      </Button>
                                    </div>
                                  </div>

                                  {/* Interpretation */}
                                  <div className="p-4 border-b">
                                    <p className={cn("text-sm font-medium", sentiment.text)}>
                                      {result.interpretation || 'Analysis complete'}
                                    </p>
                                  </div>

                                  {/* Key Metrics - CLICKABLE */}
                                  <div className="p-4">
                                    <div className="flex items-center gap-1 mb-2 text-xs text-muted-foreground">
                                      <Info className="h-3 w-3" />
                                      Click any metric to learn more
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                      {metrics.slice(0, 4).map(([key, value]) => (
                                        <button
                                          key={key}
                                          onClick={() => setSelectedMetric({ 
                                            key, 
                                            value, 
                                            studyName: study.name 
                                          })}
                                          className="text-center p-2 bg-muted/50 rounded-lg hover:bg-muted hover:ring-2 hover:ring-primary/30 transition-all cursor-pointer group"
                                        >
                                          <p className="text-xs text-muted-foreground capitalize mb-1 group-hover:text-primary transition-colors">
                                            {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()}
                                          </p>
                                          <p className="text-lg font-bold font-mono group-hover:text-primary transition-colors">
                                            {formatValue(key, value)}
                                          </p>
                                        </button>
                                      ))}
                                    </div>
                                    
                                    {/* More metrics if available - also clickable */}
                                    {metrics.length > 4 && (
                                      <div className="mt-3 flex flex-wrap gap-2">
                                        {metrics.slice(4, 8).map(([key, value]) => (
                                          <Badge 
                                            key={key} 
                                            variant="outline" 
                                            className="text-xs cursor-pointer hover:bg-primary/10 hover:border-primary transition-colors"
                                            onClick={() => setSelectedMetric({ 
                                              key, 
                                              value, 
                                              studyName: study.name 
                                            })}
                                          >
                                            {key.replace(/([A-Z])/g, ' $1').trim()}: {formatValue(key, value)}
                                          </Badge>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  {/* Footer */}
                                  <div className="px-4 py-2 bg-muted/30 text-xs text-muted-foreground flex items-center justify-between">
                                    <span>{result.barsAnalyzed} days analyzed</span>
                                    <span>{result.dateRange?.start} → {result.dateRange?.end}</span>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Empty state */}
                      {Object.keys(results).length === 0 && !isRunning && (
                        <div className="text-center py-8 text-muted-foreground">
                          <Play className="h-12 w-12 mx-auto mb-3 opacity-30" />
                          <p className="font-medium">Ready to analyze</p>
                          <p className="text-sm">Click "Run All Studies" to see your results</p>
                        </div>
                      )}

                      {/* Loading state */}
                      {isRunning && (
                        <div className="text-center py-8">
                          <Loader2 className="h-12 w-12 mx-auto mb-3 animate-spin text-primary" />
                          <p className="font-medium">Running analysis...</p>
                          <p className="text-sm text-muted-foreground">
                            {runningStudy && `Currently: ${getStudy(runningStudy)?.name}`}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Help for new users */}
        {!selectedTicker && showHelp && (
          <Card className="bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 border-primary/10">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-primary/10 shrink-0">
                  <Lightbulb className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-2">Getting Started</h3>
                  <p className="text-muted-foreground text-sm">
                    Enter a stock ticker above to begin. You can type any symbol (like AAPL, TSLA, or SPY) 
                    or click one of the popular options. Then pick from our pre-built analysis templates 
                    or choose individual studies to run.
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowHelp(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Metric Detail Modal */}
      <MetricDetailModal
        isOpen={!!selectedMetric}
        onClose={() => setSelectedMetric(null)}
        metricKey={selectedMetric?.key || ''}
        metricValue={selectedMetric?.value}
        studyName={selectedMetric?.studyName || ''}
        ticker={selectedTicker || ''}
      />
    </div>
  );
}
