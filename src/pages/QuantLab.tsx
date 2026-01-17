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

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  FlaskConical, Search, Play, Plus, Save,
  TrendingUp, TrendingDown, BarChart3, Activity, Info,
  Calendar, Zap, Layers, Volume2, Crosshair, LineChart,
  Gauge, ArrowLeftRight, Mountain, ArrowUpDown,
  Target, Shield, Loader2,
  CheckCircle2, X, ExternalLink
} from 'lucide-react';
import { InlinePrice } from '@/components/shared/PriceDisplay';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { StudyVisualizations } from '@/components/quant-lab/StudyVisualizations';

// Interactive Learning Components
import { LearningProvider, useLearning } from '@/components/quant-lab/LearningContext';
import { TutorialOverlay } from '@/components/quant-lab/TutorialOverlay';
import { MetricDetailModal } from '@/components/quant-lab/MetricDetailModal';
import { StudyAuditDashboard } from '@/components/quant-lab/StudyAuditDashboard';
import { MobileAuthSheet } from '@/components/auth/MobileAuthSheet';

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
    params: [
      {
        key: 'dojiThreshold',
        label: 'Doji Threshold',
        description: 'Body % of range to consider a doji',
        type: 'slider',
        min: 0.05,
        max: 0.25,
        step: 0.05,
        default: 0.1,
        beginner: '0.10 means body is 10% of the candle\'s range'
      },
      {
        key: 'strongMoveThreshold',
        label: 'Strong Move Threshold',
        description: '% move to consider a strong day',
        type: 'slider',
        min: 0.5,
        max: 3,
        step: 0.25,
        default: 1.5,
        beginner: '1.5 means a 1.5% move from open to close'
      },
      {
        key: 'forwardDays',
        label: 'Forward Days',
        description: 'Days to measure follow-through',
        type: 'slider',
        min: 1,
        max: 10,
        step: 1,
        default: 1,
        beginner: 'How many days ahead to measure what happens next'
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

// Time Period Options
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
  
  // State - Initialize with default ticker and study for immediate interactivity
  const [ticker, setTicker] = useState('AAPL');
  const [selectedTicker, setSelectedTicker] = useState<string>('AAPL');
  const [period, setPeriod] = useState('3y');
  const [selectedStudies, setSelectedStudies] = useState<string[]>(['daily_close_gt_prior']);
  const [studyParams, setStudyParams] = useState<Record<string, Record<string, any>>>({
    'daily_close_gt_prior': { minChangePercent: 0 }
  });
  const [results, setResults] = useState<Record<string, any>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [runningStudy, setRunningStudy] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
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

  // Add a study - only allow 1 at a time
  const addStudy = useCallback((studyId: string) => {
    // Replace any existing study with the new one (single study mode)
    setSelectedStudies([studyId]);
    setResults({});
    initStudyParams(studyId);
  }, [initStudyParams]);

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
  const getDisplayMetrics = (result: any): Array<[string, any]> => {
    // Special-case: close_to_open returns nested objects (summary/followThrough/etc.), so flatten summary into metrics.
    if (result?.type === 'close_to_open' && result?.summary) {
      const s = result.summary;
      const safePct = (v: any) => (typeof v === 'number' ? v : typeof v?.pct === 'number' ? v.pct : undefined);

      const metrics: Array<[string, any | undefined]> = [
        ['bias', s.bias],
        ['avgClosePositionPct', s.avgClosePosition],
        ['greenDaysPct', safePct(s.greenDays)],
        ['closedNearHighPct', safePct(s.closedNearHigh)],
        ['dojiDaysPct', safePct(s.dojiDays)],
        ['strongGreenDaysPct', safePct(s.strongGreenDays)],
        ['closedNearLowPct', safePct(s.closedNearLow)],
        ['redDaysPct', safePct(s.redDays)],
        ['strongRedDaysPct', safePct(s.strongRedDays)],
      ];

      return metrics.filter((entry): entry is [string, any] => entry[1] !== undefined);
    }

    const excludeKeys = ['type', 'studyName', 'params', 'interpretation', 'histogram', 'distribution', 'stats', 'recentGaps', 'recentDrawdowns', 'recentNewHighs', 'recentNewLows', 'components', 'barsAnalyzed', 'dateRange', 'usedMockData', 'dayStats', 'monthStats'];
    return Object.entries(result).filter(([key, value]) => {
      if (excludeKeys.includes(key)) return false;
      if (typeof value === 'object') return false;
      return true;
    }) as Array<[string, any]>;
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
    isSaving, initStudyParams, addStudy, removeStudy, handleSetTicker,
    runStudy, runAllStudies, saveStudyResult, getStudy, formatValue, getSentimentStyle, getDisplayMetrics
  } = props;

  const { markStudyCompleted, checkAndUnlockAchievements, addXp } = useLearning();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Auth state for prompting sign in/up
  const [showAuthSheet, setShowAuthSheet] = useState(false);
  
  // Metric detail modal state
  const [selectedMetric, setSelectedMetric] = useState<{
    key: string;
    value: any;
    studyName: string;
    studyResult: any;
  } | null>(null);

  // Enhanced run study that tracks learning
  const handleRunStudy = async (studyId: string) => {
    await runStudy(studyId);
    markStudyCompleted(studyId);
    checkAndUnlockAchievements({ studyId });
    addXp(15);
  };

  // Run all studies with auth check
  const handleRunAllStudies = () => {
    if (!user) {
      setShowAuthSheet(true);
      return;
    }
    runAllStudies();
  };

  // Mobile panel state
  const [showStudyPanel, setShowStudyPanel] = useState(true);
  
  // Study search filter
  const [studySearch, setStudySearch] = useState('');

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Tutorial Overlay for new users */}
      <TutorialOverlay />
      
      {/* Header with Prominent Search - Mobile Optimized */}
      <div className="shrink-0 border-b bg-card/50 backdrop-blur-sm">
        <div className="flex flex-col md:flex-row md:items-center gap-3 px-3 md:px-6 py-3">
          {/* Top row on mobile: Logo + Quick Actions */}
          <div className="flex items-center gap-3">
            <div className="p-2 md:p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shrink-0">
              <FlaskConical className="h-4 w-4 md:h-5 md:w-5 text-white" />
            </div>
            <div className="md:hidden flex-1">
              <h1 className="text-base font-bold">Quant Lab</h1>
            </div>
            <div className="hidden md:block">
              <h1 className="text-lg font-bold">Quant Lab</h1>
              <p className="text-xs text-muted-foreground">Professional-grade quantitative analysis</p>
            </div>
            
            {/* Mobile toggle for study panel - Larger touch target */}
            <Button
              variant={showStudyPanel ? "default" : "outline"}
              size="sm"
              className="md:hidden h-10 gap-2 px-4"
              onClick={() => setShowStudyPanel(!showStudyPanel)}
            >
              <Layers className="h-5 w-5" />
              Studies
              {selectedStudies.length > 0 && (
                <Badge variant="secondary" className="h-6 px-2 text-xs">
                  {selectedStudies.length}
                </Badge>
              )}
            </Button>
          </div>
          
          {/* CENTRAL CONTROL BAR - Ticker, Period, Study Search, Analyze */}
          <div className="flex items-center justify-center gap-4 flex-1">
            {/* Time Period */}
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="h-14 w-32 text-base font-bold shrink-0 rounded-xl border-2 border-muted-foreground/30 bg-background shadow-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map((p) => (
                  <SelectItem key={p.value} value={p.value} className="text-base font-medium">{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Ticker Search - PROMINENT CENTER */}
            <div className="relative w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-primary" />
              <Input
                placeholder="TICKER"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSetTicker(ticker);
                    if (selectedStudies.length > 0) handleRunAllStudies();
                  }
                }}
                className="h-14 pl-14 pr-4 text-xl font-bold font-mono tracking-wider bg-background border-3 border-primary focus:ring-2 focus:ring-primary/30 transition-all rounded-xl shadow-lg text-center placeholder:text-muted-foreground/40 placeholder:font-normal"
              />
            </div>
            
            {/* Study Search */}
            <div className="relative hidden md:block">
              <FlaskConical className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Filter studies..."
                value={studySearch}
                onChange={(e) => setStudySearch(e.target.value)}
                className="h-14 w-44 pl-10 pr-4 text-sm bg-background border-2 border-muted-foreground/30 focus:border-primary rounded-xl shadow-lg placeholder:text-muted-foreground/50"
              />
            </div>
            
            {/* Analyze Button */}
            <Button
              onClick={() => {
                handleSetTicker(ticker);
                if (selectedStudies.length > 0) handleRunAllStudies();
              }}
              disabled={!ticker.trim()}
              variant="success"
              className="h-14 px-8 text-base font-bold rounded-xl shadow-lg"
            >
              <Play className="h-5 w-5 mr-2" />
              Analyze
            </Button>
          </div>
          
          {/* Quick Tickers - Hidden on mobile */}
          <div className="hidden md:flex gap-2 overflow-x-auto">
            {['AAPL', 'MSFT', 'NVDA', 'SPY', 'QQQ'].map((t) => (
              <Button
                key={t}
                variant={selectedTicker === t ? 'default' : 'outline'}
                size="sm"
                className="h-9 px-4 font-mono text-sm shrink-0"
                onClick={() => handleSetTicker(t)}
              >
                {t}
              </Button>
            ))}
          </div>
        </div>
        
        {/* Selected Ticker Indicator - Always visible and clickable */}
        <div className="px-3 md:px-6 pb-3 flex items-center gap-3 flex-wrap">
          <button
            onClick={() => selectedTicker && navigate(`/stock/${selectedTicker}`)}
            disabled={!selectedTicker}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border-2 border-primary/30 transition-all duration-200",
              selectedTicker && "hover:border-primary/50 hover:bg-primary/15 cursor-pointer active:scale-[0.98]"
            )}
          >
            <TrendingUp className="h-5 w-5 text-primary" />
            <span className="text-xs font-medium text-muted-foreground">Analyzing:</span>
            <span className="text-xl font-bold font-mono text-primary">${selectedTicker || 'Select Ticker'}</span>
            {selectedTicker && (
              <>
                <span className="text-muted-foreground mx-1">•</span>
                <InlinePrice ticker={selectedTicker} showStaleness={false} className="text-base font-semibold" />
                <ExternalLink className="h-4 w-4 text-muted-foreground ml-1" />
              </>
            )}
          </button>
          <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground ml-auto">
            <span className="px-2 py-1 bg-muted rounded">{period}</span>
            <span>•</span>
            <span>1 study selected</span>
          </div>
        </div>
        
        {/* Mobile Quick Tickers - Larger buttons */}
        <div className="md:hidden flex gap-2 px-3 pb-3 overflow-x-auto">
          {['AAPL', 'MSFT', 'NVDA', 'SPY', 'QQQ', 'TSLA', 'AMZN'].map((t) => (
            <Button
              key={t}
              variant={selectedTicker === t ? 'default' : 'outline'}
              size="sm"
              className="h-10 px-4 font-mono text-sm shrink-0 rounded-lg"
              onClick={() => handleSetTicker(t)}
            >
              {t}
            </Button>
          ))}
        </div>
      </div>

      {/* Main Content - Responsive Layout */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* Study Selection Panel - Full screen overlay on mobile, sidebar on desktop */}
        <AnimatePresence>
          {showStudyPanel && (
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="fixed inset-x-0 bottom-16 top-auto md:relative md:inset-auto md:w-72 lg:w-80 shrink-0 md:border-r bg-card z-40 flex flex-col overflow-hidden md:!h-full rounded-t-2xl md:rounded-none shadow-2xl md:shadow-none max-h-[60vh] md:max-h-none pb-safe"
            >
              {/* Mobile drag handle */}
              <div className="md:hidden flex justify-center pt-2 pb-1">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
              </div>
              
              {/* Panel Header with Ticker */}
              <div className="px-4 py-3 border-b bg-muted/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold">Select Quant Studies</span>
                  <div className="flex items-center gap-2">
                    {selectedStudies.length > 0 && (
                      <Badge variant="default" className="text-xs px-2.5 py-1">
                        {selectedStudies.length} selected
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="md:hidden h-8 w-8 p-0"
                      onClick={() => setShowStudyPanel(false)}
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              {/* Ticker input in panel - editable */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
                  <span className="text-[11px] text-muted-foreground shrink-0">For:</span>
                  <Input
                    value={ticker}
                    onChange={(e) => setTicker(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && ticker.trim()) {
                        handleSetTicker(ticker.trim());
                      }
                    }}
                    onBlur={() => {
                      if (ticker.trim()) {
                        handleSetTicker(ticker.trim());
                      }
                    }}
                    placeholder="AAPL"
                    className="h-7 px-2 text-sm font-bold font-mono text-primary bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
              </div>
              
              {/* Category Tabs - Larger touch targets */}
              <div className="flex-1 overflow-hidden flex flex-col">
                <Tabs value={activeCategory} onValueChange={setActiveCategory} className="flex-1 flex flex-col overflow-hidden">
                  {/* Horizontal scrollable tabs */}
                  <div className="px-3 pt-3 overflow-x-auto flex-shrink-0">
                    <div className="flex gap-2 pb-2">
                      {STUDY_CATEGORIES.map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => setActiveCategory(cat.id)}
                          className={cn(
                            "flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl transition-all shrink-0 min-w-[72px]",
                            activeCategory === cat.id
                              ? "bg-primary text-primary-foreground shadow-md"
                              : "bg-muted/50 hover:bg-muted"
                          )}
                        >
                          <cat.icon className="h-5 w-5" />
                          <span className="text-xs font-medium">{cat.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Studies List - Better spacing for touch */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {STUDY_CATEGORIES.map((cat) => (
                      <TabsContent key={cat.id} value={cat.id} className="mt-0 space-y-2">
                        {STUDY_DEFINITIONS.filter(s => s.category === cat.id && (studySearch === '' || s.name.toLowerCase().includes(studySearch.toLowerCase()) || s.tags.some(tag => tag.toLowerCase().includes(studySearch.toLowerCase())))).map((study) => (
                          <button
                            key={study.id}
                            onClick={() => {
                              addStudy(study.id);
                              // Auto-hide panel on mobile after selection
                              if (window.innerWidth < 768) {
                                setTimeout(() => setShowStudyPanel(false), 150);
                              }
                            }}
                            disabled={selectedStudies.includes(study.id)}
                            className={cn(
                              "w-full p-4 rounded-xl border-2 text-left transition-all active:scale-[0.98]",
                              selectedStudies.includes(study.id)
                                ? "border-primary bg-primary/10"
                                : "border-border hover:border-primary/50 hover:bg-muted/50"
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <div className={cn(
                                "p-2.5 rounded-xl shrink-0",
                                selectedStudies.includes(study.id) ? "bg-primary/20" : "bg-muted"
                              )}>
                                <study.icon className={cn(
                                  "h-5 w-5",
                                  selectedStudies.includes(study.id) ? "text-primary" : "text-muted-foreground"
                                )} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-sm">{study.name}</span>
                                  {selectedStudies.includes(study.id) ? (
                                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                                  ) : (
                                    <Plus className="h-5 w-5 text-muted-foreground shrink-0" />
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {study.description}
                                </p>
                                <Badge variant="outline" className="mt-2 text-[10px] capitalize px-2 py-0.5">
                                  {study.difficulty}
                                </Badge>
                              </div>
                            </div>
                          </button>
                        ))}
                      </TabsContent>
                    ))}
                  </div>
                </Tabs>
              </div>
              
              {/* Mobile: Run button in panel - Always visible at bottom */}
              {selectedStudies.length > 0 && (
                <div className="md:hidden p-4 border-t bg-card shrink-0">
                    <Button
                      onClick={() => {
                        setShowStudyPanel(false);
                        handleRunAllStudies();
                      }}
                      disabled={!selectedTicker || isRunning}
                      variant="success"
                      className="w-full h-14 text-lg font-bold gap-3 shadow-xl rounded-xl"
                    >
                      <Play className="h-6 w-6" />
                      Analyze
                    </Button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Mobile overlay backdrop */}
        <AnimatePresence>
          {showStudyPanel && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 bg-black/50 z-30"
              onClick={() => setShowStudyPanel(false)}
            />
          )}
        </AnimatePresence>

        {/* Right Panel - Results */}
        <div className="flex-1 flex flex-col overflow-hidden bg-background">
          {/* Selected Studies Bar with Ticker */}
          {selectedStudies.length > 0 && (
            <div className="shrink-0 px-3 md:px-4 py-2.5 md:py-3 border-b bg-muted/20">
              {/* Ticker + Period context */}
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20">
                  <span className="text-[10px] text-muted-foreground">Ticker:</span>
                  <span className="font-bold font-mono text-sm text-primary">${selectedTicker}</span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted border">
                  <span className="text-[10px] text-muted-foreground">Period:</span>
                  <span className="font-medium text-sm">{period}</span>
                </div>
              </div>
              {/* Study queue */}
              <div className="flex items-center gap-2 md:gap-3 overflow-x-auto">
                <span className="text-xs text-muted-foreground shrink-0 font-medium">Queue:</span>
                {selectedStudies.map((studyId) => {
                  const study = getStudy(studyId);
                  const hasResult = !!results[studyId];
                  return (
                    <Badge
                      key={studyId}
                      variant={hasResult ? 'default' : 'secondary'}
                      className={cn(
                        "gap-1.5 pr-1.5 text-xs shrink-0 py-1 h-7",
                        hasResult && "bg-emerald-500 hover:bg-emerald-600"
                      )}
                    >
                      <span className="max-w-[100px] truncate">{study?.name}</span>
                      {hasResult && <CheckCircle2 className="h-3.5 w-3.5" />}
                      <button
                        onClick={() => removeStudy(studyId)}
                        className="ml-1 hover:bg-black/20 rounded p-0.5"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </Badge>
                  );
                })}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setSelectedStudies([]); setResults({}); }}
                  className="h-7 px-3 text-xs ml-auto shrink-0"
                >
                  Clear
                </Button>
              </div>
            </div>
          )}

          {/* Results - Single Study Full View */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            {Object.keys(results).length > 0 ? (
              <div className="max-w-3xl mx-auto">
                {selectedStudies.map((studyId) => {
                  const study = getStudy(studyId);
                  const result = results[studyId];
                  if (!study || !result) return null;
                  
                  const sentiment = getSentimentStyle(result.interpretation);
                  const metrics = getDisplayMetrics(result);

                  return (
                    <motion.div
                      key={studyId}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "rounded-2xl border-2 overflow-hidden shadow-lg",
                        sentiment.border
                      )}
                    >
                      {/* Card Header - Expanded */}
                      <div className={cn("px-6 py-5", sentiment.bg)}>
                        {/* Ticker badge */}
                        <div className="flex items-center gap-3 mb-4">
                          <Badge variant="outline" className="font-mono font-bold text-sm bg-background/80 border-primary/30 text-primary px-3 py-1">
                            ${selectedTicker}
                          </Badge>
                          <span className="text-sm text-muted-foreground">• {period}</span>
                        </div>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4">
                            <div className={cn("p-3 rounded-xl bg-background/80 shrink-0")}>
                              <study.icon className={cn("h-7 w-7", sentiment.text)} />
                            </div>
                            <div>
                              <h4 className="font-bold text-xl mb-2">{study.name}</h4>
                              <p className="text-sm text-muted-foreground leading-relaxed">{study.description}</p>
                              <p className="text-sm text-muted-foreground/80 mt-2">{study.whatItMeasures}</p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => saveStudyResult(studyId)}
                            disabled={isSaving === studyId}
                            className="h-10 px-4 gap-2 text-sm text-amber-600 hover:text-amber-700 hover:bg-amber-50 shrink-0"
                          >
                            {isSaving === studyId ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                            Save
                          </Button>
                        </div>
                      </div>

                      {/* Interpretation - Larger */}
                      <div className="px-6 py-4 border-b bg-background">
                        <p className={cn("text-base font-semibold leading-relaxed", sentiment.text)}>
                          {result.interpretation || 'Analysis complete'}
                        </p>
                      </div>

                      {/* Key Metrics Grid - Larger */}
                      <div className="p-6">
                        <h5 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Key Metrics</h5>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {metrics.map(([key, value]) => (
                            <button
                              key={key}
                              onClick={() => setSelectedMetric({ 
                                key, value, studyName: study.name, studyResult: result
                              })}
                              className="text-center p-5 bg-muted/50 rounded-xl hover:bg-muted active:scale-[0.98] hover:ring-2 hover:ring-primary/30 transition-all cursor-pointer group"
                            >
                              <p className="text-xs text-muted-foreground capitalize mb-2 group-hover:text-foreground transition-colors">
                                {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()}
                              </p>
                              <p className="text-2xl font-bold font-mono">
                                {formatValue(key, value)}
                              </p>
                              <p className="text-[10px] text-primary/70 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                Click for details
                              </p>
                            </button>
                          ))}
                      </div>
                      </div>

                      {/* Visualizations Section */}
                      <div className="px-6 py-6 border-t">
                        <h5 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Visual Analysis</h5>
                        <StudyVisualizations studyId={studyId} result={result} />
                      </div>

                      {/* How to Use - Educational */}
                      <div className="px-6 py-4 border-t bg-muted/20">
                        <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">How to Use This</h5>
                        <p className="text-sm text-muted-foreground">{study.howToUse}</p>
                      </div>

                      {/* Footer */}
                      <div className="px-6 py-3 bg-muted/30 text-sm text-muted-foreground flex items-center justify-between">
                        <span className="font-medium">{result.barsAnalyzed} trading days analyzed</span>
                        <span>{result.dateRange?.start} → {result.dateRange?.end}</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : isRunning ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className="p-6 rounded-2xl bg-primary/5 border-2 border-primary/20 mb-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
                <p className="text-lg font-semibold">Running Analysis...</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {runningStudy && getStudy(runningStudy)?.name}
                </p>
              </div>
            ) : selectedStudies.length > 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                {/* Big Ticker Display */}
                <div className="mb-4 flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-primary/10 to-primary/5 border-2 border-primary/30">
                  <TrendingUp className="h-8 w-8 text-primary" />
                  <span className="text-3xl md:text-4xl font-bold font-mono text-primary">${selectedTicker || '---'}</span>
                </div>
                <div className="p-6 rounded-2xl bg-gradient-to-br from-violet-500/10 to-purple-500/10 border-2 border-violet-500/20 mb-6">
                  <Play className="h-12 w-12 text-violet-500" />
                </div>
                <p className="text-xl font-bold mb-2">Ready to Analyze</p>
                <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                  Run <span className="font-semibold text-foreground">{getStudy(selectedStudies[0])?.name}</span> on <span className="font-mono font-bold text-foreground">${selectedTicker}</span>
                </p>
                {/* BIG RUN BUTTON */}
                <Button
                  onClick={handleRunAllStudies}
                  disabled={!selectedTicker || isRunning}
                  size="lg"
                  className="h-14 px-10 text-lg gap-3 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 shadow-xl hover:shadow-2xl transition-all rounded-xl"
                >
                  <Play className="h-6 w-6" />
                  Analyze ${selectedTicker}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <div className="p-6 rounded-2xl bg-muted/50 border-2 border-border mb-6">
                  <FlaskConical className="h-12 w-12 text-muted-foreground" />
                </div>
                <p className="text-xl font-bold mb-2">Select a Study to Begin</p>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Choose a quantitative analysis to run on your selected stock
                </p>
                {/* Mobile CTA to show studies */}
                <Button
                  variant="default"
                  size="lg"
                  className="md:hidden mt-6 h-14 gap-3 text-base font-semibold rounded-xl w-full max-w-xs"
                  onClick={() => setShowStudyPanel(true)}
                >
                  <Layers className="h-5 w-5" />
                  Browse Studies
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Metric Detail Modal */}
      <MetricDetailModal
        isOpen={!!selectedMetric}
        onClose={() => setSelectedMetric(null)}
        metricKey={selectedMetric?.key || ''}
        metricValue={selectedMetric?.value}
        studyName={selectedMetric?.studyName || ''}
        ticker={selectedTicker || ''}
        studyResult={selectedMetric?.studyResult}
      />

      {/* Auth Sheet for unauthenticated users */}
      <MobileAuthSheet
        open={showAuthSheet}
        onOpenChange={setShowAuthSheet}
        title="Sign in to run studies"
        description="Create a free account to analyze stocks with our quant tools."
      />
    </div>
  );
}
