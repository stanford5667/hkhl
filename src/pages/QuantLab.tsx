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

import { useState, useCallback, useEffect } from 'react';
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
import { Slider } from '@/components/ui/slider';
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
  Target, Shield, Loader2, GitBranch, Lightbulb,
  CheckCircle2, X, ExternalLink, ChevronLeft, ChevronDown, ChevronRight
} from 'lucide-react';
import { InlinePrice } from '@/components/shared/PriceDisplay';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { StudyVisualizations } from '@/components/quant-lab/StudyVisualizations';
import { StudyResultCard } from '@/components/quant-lab/StudyResultCard';
import { StudySetupCard } from '@/components/quant-lab/StudySetupCard';
// Interactive Learning Components
import { LearningProvider, useLearning } from '@/components/quant-lab/LearningContext';
import { TutorialOverlay } from '@/components/quant-lab/TutorialOverlay';
import { MetricDetailModal } from '@/components/quant-lab/MetricDetailModal';
import { StudyAuditDashboard } from '@/components/quant-lab/StudyAuditDashboard';
import { MobileAuthSheet } from '@/components/auth/MobileAuthSheet';
import { IntegratedQuantStudiesPanel } from '@/components/equity/IntegratedQuantStudiesPanel';
import { EnhancedResultView } from '@/components/quant-lab/EnhancedResultViews';

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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
  }
];

// Study Categories
const STUDY_CATEGORIES = [
  { id: 'conditional', name: 'Conditional', icon: GitBranch, description: 'What happens after X?' },
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
  
  // Local storage key for persistence
  const STORAGE_KEY = 'quantlab_state';
  
  // Load initial state from localStorage
  const loadSavedState = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load saved QuantLab state:', e);
    }
    return null;
  };
  
  const savedState = loadSavedState();
  
  // State - Initialize from localStorage or defaults
  const [ticker, setTicker] = useState(savedState?.ticker || 'AAPL');
  const [selectedTicker, setSelectedTicker] = useState<string>(savedState?.selectedTicker || 'AAPL');
  const [period, setPeriod] = useState(savedState?.period || '3y');
  const [selectedStudies, setSelectedStudies] = useState<string[]>(savedState?.selectedStudies || ['daily_close_gt_prior']);
  const [studyParams, setStudyParams] = useState<Record<string, Record<string, any>>>(
    savedState?.studyParams || { 'daily_close_gt_prior': { minChangePercent: 0 } }
  );
  const [results, setResults] = useState<Record<string, any>>(savedState?.results || {});
  const [isRunning, setIsRunning] = useState(false);
  const [runningStudy, setRunningStudy] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [activeCategory, setActiveCategory] = useState(savedState?.activeCategory || 'basic');
  const [isSaving, setIsSaving] = useState<string | null>(null);

  // Persist state to localStorage whenever key values change
  useEffect(() => {
    const stateToSave = {
      ticker,
      selectedTicker,
      period,
      selectedStudies,
      studyParams,
      results,
      activeCategory
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (e) {
      console.warn('Failed to save QuantLab state:', e);
    }
  }, [ticker, selectedTicker, period, selectedStudies, studyParams, results, activeCategory]);

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

    // For conditional probability studies, verify required condition variables are set
    const study = STUDY_DEFINITIONS.find(s => s.id === studyId);
    if (study?.category === 'conditional' && study.params?.length > 0) {
      const params = studyParams[studyId] || {};
      // Check that all defined params have values (use defaults if not set)
      const missingParams = study.params.filter(p => {
        const value = params[p.key];
        // If param has no value AND no default, it's missing
        return value === undefined && p.default === undefined;
      });
      
      if (missingParams.length > 0) {
        toast.error('Please set the condition variables before running', {
          description: `Missing: ${missingParams.map(p => p.label).join(', ')}`,
        });
        return;
      }
    }

    setRunningStudy(studyId);
    
    try {
      const periodData = PERIOD_OPTIONS.find(p => p.value === period);
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (periodData?.days || 756));

      // Prepare params - convert forwardDays from single value to array for edge function
      const rawParams = studyParams[studyId] || {};
      const formattedParams: Record<string, any> = { ...rawParams };
      
      // Edge function expects forwardDays as an array of numbers [1, 3, 5, 10]
      // Frontend stores it as a single selected value like '5' or 5
      if (formattedParams.forwardDays !== undefined) {
        const fd = parseInt(String(formattedParams.forwardDays), 10);
        // Create an array with common forward-looking periods up to and including the selected value
        const allPeriods = [1, 3, 5, 10, 21, 63, 126, 252];
        const filteredPeriods = allPeriods.filter(p => p <= fd || p === 1 || p === fd);
        // Always include at least [1, fd] if fd is valid
        if (fd && !filteredPeriods.includes(fd)) {
          filteredPeriods.push(fd);
        }
        formattedParams.forwardDays = [...new Set(filteredPeriods)].sort((a: number, b: number) => a - b);
      }
      
      // Ensure threshold is a number
      if (formattedParams.threshold !== undefined) {
        formattedParams.threshold = parseFloat(String(formattedParams.threshold));
      }

      const { data, error } = await supabase.functions.invoke('run-asset-study', {
        body: {
          ticker: selectedTicker,
          studyType: studyId,
          startDate: startDate.toISOString().split('T')[0],
          endDate,
          params: formattedParams
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

    // Check if any conditional studies are missing required variables
    const conditionalStudiesWithoutVars = selectedStudies.filter(studyId => {
      const study = STUDY_DEFINITIONS.find(s => s.id === studyId);
      if (study?.category !== 'conditional' || !study.params?.length) return false;
      const params = studyParams[studyId] || {};
      // Check that all params have values or defaults
      return study.params.some(p => params[p.key] === undefined && p.default === undefined);
    });

    if (conditionalStudiesWithoutVars.length > 0) {
      const studyNames = conditionalStudiesWithoutVars
        .map(id => STUDY_DEFINITIONS.find(s => s.id === id)?.name)
        .filter(Boolean)
        .join(', ');
      toast.error('Configure condition variables first', {
        description: `Missing parameters for: ${studyNames}`,
      });
      return;
    }

    setIsRunning(true);

    for (const studyId of selectedStudies) {
      await runStudy(studyId);
    }

    setIsRunning(false);
    toast.success('All studies completed!');
  }, [selectedTicker, selectedStudies, runStudy, studyParams]);

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

    const excludeKeys = ['type', 'studyName', 'params', 'interpretation', 'histogram', 'distribution', 'stats', 'recentGaps', 'recentDrawdowns', 'recentNewHighs', 'recentNewLows', 'components', 'barsAnalyzed', 'dateRange', 'usedMockData', 'dayStats', 'monthStats', 'label', 'total_days'];
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
    selectedStudies, setSelectedStudies, studyParams, setStudyParams, results, setResults,
    isRunning, runningStudy, showHelp, setShowHelp, activeCategory, setActiveCategory,
    isSaving, initStudyParams, addStudy, removeStudy, updateParam, handleSetTicker,
    runStudy, runAllStudies, saveStudyResult, getStudy, formatValue, getSentimentStyle, getDisplayMetrics
  } = props;

  const { markStudyCompleted, checkAndUnlockAchievements, addXp } = useLearning();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Auth state for prompting sign in/up
  const [showAuthSheet, setShowAuthSheet] = useState(false);
  
  // Mobile panel state
  const [showStudyPanel, setShowStudyPanel] = useState(true);
  
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
  const handleRunAllStudies = async () => {
    if (!user) {
      setShowAuthSheet(true);
      return;
    }
    await runAllStudies();
    // Auto-close study panel on mobile after running
    setShowStudyPanel(false);
  };

  // Study search filter
  const [studySearch, setStudySearch] = useState('');
  
  // Track if initial auto-run has been done this session
  const [hasAutoRun, setHasAutoRun] = useState(false);
  
  // Auto-run default study on first load if no results exist
  useEffect(() => {
    if (hasAutoRun) return;
    
    // Check if we already have results (from localStorage or previous run)
    if (Object.keys(results).length > 0) {
      setHasAutoRun(true);
      return;
    }
    
    // Ensure we have a ticker and a study selected
    if (!selectedTicker) return;
    
    // Set default study if none selected
    if (selectedStudies.length === 0) {
      addStudy('after_consecutive_days');
    }
    
    // Auto-run the study after a brief delay to allow UI to settle
    const timer = setTimeout(async () => {
      const studyToRun = selectedStudies[0] || 'after_consecutive_days';
      if (!selectedStudies.includes(studyToRun)) {
        addStudy(studyToRun);
      }
      setHasAutoRun(true);
      await handleRunStudy(studyToRun);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [selectedTicker, selectedStudies, results, hasAutoRun, addStudy, handleRunStudy]);


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
          
          {/* Prominent Ticker Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search ticker (e.g. AAPL, TSLA, SPY)"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                onBlur={() => { if (ticker.trim()) handleSetTicker(ticker.trim()); }}
                onKeyDown={(e) => { 
                  if (e.key === 'Enter' && ticker.trim()) {
                    handleSetTicker(ticker.trim());
                    // Auto-run current study with new ticker
                    if (selectedStudies.length > 0) {
                      setTimeout(() => handleRunStudy(selectedStudies[0]), 100);
                    }
                  }
                }}
                className="h-10 pl-10 pr-20 font-mono font-bold bg-background rounded-xl border-2 focus:border-primary"
              />
              <Button
                size="sm"
                variant="default"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 px-3 text-xs"
                onClick={() => {
                  if (ticker.trim()) {
                    handleSetTicker(ticker.trim());
                    if (selectedStudies.length > 0) {
                      setTimeout(() => handleRunStudy(selectedStudies[0]), 100);
                    }
                  }
                }}
                disabled={!ticker.trim() || isRunning}
              >
                {isRunning ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Go'}
              </Button>
            </div>
          </div>
          
          {/* Quick Tickers - Hidden on mobile */}
          <div className="hidden md:flex gap-2 overflow-x-auto">
            {['AAPL', 'MSFT', 'NVDA', 'SPY', 'QQQ'].map((t) => (
              <Button
                key={t}
                variant={selectedTicker === t ? 'default' : 'outline'}
                size="sm"
                className="h-9 px-4 font-mono text-sm shrink-0"
                onClick={() => {
                  handleSetTicker(t);
                  // Auto-run with new ticker
                  if (selectedStudies.length > 0) {
                    setTimeout(() => handleRunStudy(selectedStudies[0]), 100);
                  }
                }}
              >
                {t}
              </Button>
            ))}
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
              onClick={() => {
                handleSetTicker(t);
                // Auto-run with new ticker
                if (selectedStudies.length > 0) {
                  setTimeout(() => handleRunStudy(selectedStudies[0]), 100);
                }
              }}
            >
              {t}
            </Button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* Desktop: Always-visible Study Sidebar */}
        <div className="hidden md:flex md:w-80 lg:w-96 shrink-0 md:border-r bg-card flex-col overflow-hidden h-full">
          {/* Panel Header */}
          <div className="px-4 py-3 border-b bg-muted/30">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold">Select Quant Studies</span>
              {selectedStudies.length > 0 && (
                <Badge variant="default" className="text-xs px-2.5 py-1">
                  {selectedStudies.length} selected
                </Badge>
              )}
            </div>
          </div>
          
          {/* Study List - All categories with separators */}
          <div className="flex-1 overflow-y-auto px-3 py-2">
            {STUDY_CATEGORIES.map((category, catIndex) => {
              const categoryStudies = STUDY_DEFINITIONS.filter((s) => s.category === category.id);
              if (categoryStudies.length === 0) return null;
              
              return (
                <div key={category.id}>
                  {/* Category separator line (except first) */}
                  {catIndex > 0 && (
                    <div className="my-4 border-t border-border" />
                  )}
                  
                  {/* Category header */}
                  <div className="flex items-center gap-2 px-1 py-2 mb-2">
                    <category.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold text-foreground">{category.name}</span>
                    <span className="text-xs text-muted-foreground">• {category.description}</span>
                  </div>
                  
                  {/* Studies in this category */}
                  <div className="space-y-2">
                    {categoryStudies.map((study) => {
                      const isSelected = selectedStudies.includes(study.id);
                      return (
                        <button
                          key={study.id}
                          onClick={() => isSelected ? removeStudy(study.id) : addStudy(study.id)}
                          className={cn(
                            "w-full text-left p-3 rounded-xl border-2 transition-all duration-200",
                            isSelected
                              ? "border-primary bg-primary/5"
                              : "border-transparent bg-muted/50 hover:bg-muted active:scale-[0.98]"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "p-2 rounded-lg shrink-0",
                              isSelected ? "bg-primary text-primary-foreground" : "bg-background"
                            )}>
                              <study.icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm">{study.name}</span>
                                <Badge variant="outline" className={cn(
                                  "text-[9px] px-1.5",
                                  study.difficulty === 'beginner' && "border-emerald-500/50 text-emerald-600",
                                  study.difficulty === 'intermediate' && "border-amber-500/50 text-amber-600",
                                  study.difficulty === 'advanced' && "border-red-500/50 text-red-600"
                                )}>
                                  {study.difficulty}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{study.description}</p>
                            </div>
                            {isSelected && (
                              <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          {/* Run Button at bottom (removed - run per-study from setup cards) */}
          <div className="shrink-0 border-t bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">
              Select a study, set its variables, then hit <span className="font-semibold text-foreground">Run</span> on the study card.
            </p>
          </div>
        </div>

        {/* Mobile: Study Selection Panel - Full screen overlay */}
        <AnimatePresence>
          {showStudyPanel && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 bg-background z-50 flex flex-col"
            >
                {/* Header with close button */}
                <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <FlaskConical className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-base font-bold">Quant Lab</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-10 w-10 p-0"
                    onClick={() => setShowStudyPanel(false)}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                
                {/* Ticker Search Section */}
                <div className="px-4 py-4 border-b bg-muted/30 space-y-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">1. Select Ticker</p>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      placeholder="Enter ticker (e.g. AAPL)"
                      value={ticker}
                      onChange={(e) => setTicker(e.target.value.toUpperCase())}
                      onBlur={() => { if (ticker.trim()) handleSetTicker(ticker.trim()); }}
                      onKeyDown={(e) => { if (e.key === 'Enter' && ticker.trim()) handleSetTicker(ticker.trim()); }}
                      className="h-12 pl-10 text-lg font-mono font-bold bg-background rounded-xl border-2 focus:border-primary"
                    />
                  </div>
                </div>
                
                {/* Study Selection Section */}
                <div className="flex-1 overflow-hidden flex flex-col">
                  <div className="px-4 py-3 border-b flex items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">2. Select Study</p>
                    {selectedStudies.length > 0 && (
                      <Badge variant="default" className="text-xs">
                        {selectedStudies.length} selected
                      </Badge>
                    )}
                  </div>

                  {/* Study List - All categories with separators */}
                  <div className="flex-1 overflow-y-auto px-3 py-2">
                    {STUDY_CATEGORIES.map((category, catIndex) => {
                      const categoryStudies = STUDY_DEFINITIONS.filter((s) => s.category === category.id);
                      if (categoryStudies.length === 0) return null;
                      
                      return (
                        <div key={category.id}>
                          {/* Category separator line (except first) */}
                          {catIndex > 0 && (
                            <div className="my-4 border-t border-border" />
                          )}
                          
                          {/* Category header */}
                          <div className="flex items-center gap-2 px-1 py-2 mb-2">
                            <category.icon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-semibold text-foreground">{category.name}</span>
                            <span className="text-xs text-muted-foreground">• {category.description}</span>
                          </div>
                          
                          {/* Studies in this category */}
                          <div className="space-y-2">
                            {categoryStudies.map((study) => {
                              const isSelected = selectedStudies.includes(study.id);
                              return (
                                <button
                                  key={study.id}
                                  onClick={() => {
                                    if (isSelected) {
                                      removeStudy(study.id);
                                    } else {
                                      addStudy(study.id);
                                      setShowStudyPanel(false); // Close panel on mobile to show run card
                                    }
                                  }}
                                  className={cn(
                                    "w-full text-left p-3 rounded-xl border-2 transition-all",
                                    isSelected
                                      ? "border-primary bg-primary/5"
                                      : "border-transparent bg-muted/50 active:scale-[0.98]"
                                  )}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={cn(
                                      "p-2 rounded-lg shrink-0",
                                      isSelected ? "bg-primary text-primary-foreground" : "bg-background"
                                    )}>
                                      <study.icon className="h-4 w-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="font-semibold text-sm">{study.name}</span>
                                        <Badge variant="outline" className={cn(
                                          "text-[9px] px-1.5",
                                          study.difficulty === 'beginner' && "border-emerald-500/50 text-emerald-600",
                                          study.difficulty === 'intermediate' && "border-amber-500/50 text-amber-600",
                                          study.difficulty === 'advanced' && "border-red-500/50 text-red-600"
                                        )}>
                                          {study.difficulty}
                                        </Badge>
                                      </div>
                                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{study.description}</p>
                                    </div>
                                    {isSelected && (
                                      <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {/* Fixed bottom action bar - removed (run per-study from setup cards) */}
                <div className="shrink-0 border-t bg-card px-4 pt-3 pb-20">
                  <p className="text-xs text-muted-foreground">
                    Select a study, set its variables, then run it from the study card.
                  </p>
                </div>
              </motion.div>
          )}
        </AnimatePresence>

        {/* Results Panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Selected Studies Queue - Mobile optimized */}
          {selectedStudies.length > 0 && (
            <div className="shrink-0 border-b px-3 md:px-4 py-2.5 bg-muted/30">
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

          {/* Results - Compact on mobile, full on desktop */}
          <div className="flex-1 overflow-y-auto p-2 md:p-6">
            {Object.keys(results).length > 0 ? (
              <div className="max-w-3xl mx-auto space-y-4 md:space-y-6">
                {selectedStudies.map((studyId) => {
                  const study = getStudy(studyId);
                  const result = results[studyId];
                  if (!study || !result) return null;
                  
                  return (
                    <StudyResultCard
                      key={studyId}
                      study={study}
                      result={result}
                      ticker={selectedTicker || ''}
                      studyParams={studyParams}
                      updateParam={updateParam}
                      runStudy={handleRunStudy}
                      saveStudy={saveStudyResult}
                      isRunning={isRunning}
                      isSaving={isSaving}
                      onNavigate={navigate}
                    />
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
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center px-6">
                {selectedStudies.length > 0 ? (
                  <div className="w-full max-w-3xl mx-auto space-y-4">
                    {/* Compact controls (no giant run button) */}
                    <div className="rounded-2xl border-2 bg-card p-4 text-left">
                      <div className="grid gap-3 md:grid-cols-3 md:items-end">
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold mb-1">Period</p>
                          <Select value={period} onValueChange={setPeriod}>
                            <SelectTrigger className="h-10 w-full rounded-xl border-2">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PERIOD_OPTIONS.map((p) => (
                                <SelectItem key={p.value} value={p.value} className="text-sm">
                                  {p.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="md:col-span-2">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold mb-1">Ticker</p>
                          <Input
                            placeholder="AAPL"
                            value={ticker}
                            onChange={(e) => setTicker(e.target.value.toUpperCase())}
                            onBlur={() => ticker.trim() && handleSetTicker(ticker.trim())}
                            className="h-10 font-mono font-bold tracking-wider rounded-xl border-2"
                          />
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Set variables below, then run the study.
                      </p>
                    </div>

                    {selectedStudies.map((studyId) => {
                      const study = getStudy(studyId);
                      if (!study) return null;
                      return (
                        <StudySetupCard
                          key={studyId}
                          study={study}
                          ticker={selectedTicker || ticker || ''}
                          studyParams={studyParams}
                          updateParam={updateParam}
                          runStudy={handleRunStudy}
                          isRunning={isRunning}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <>
                    {/* Arrow pointing to sidebar on desktop */}
                    <div className="hidden md:flex items-center gap-4 mb-6 text-primary animate-pulse">
                      <ChevronLeft className="h-8 w-8" />
                      <span className="text-lg font-semibold">Select a Quant Study</span>
                    </div>

                    <div className="p-8 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/30 border-dashed mb-6">
                      <FlaskConical className="h-16 w-16 text-primary/60" />
                    </div>
                    <p className="text-2xl font-bold mb-3 text-primary">No Study Selected</p>
                    <p className="text-base text-muted-foreground max-w-sm mb-2">
                      Choose a <span className="font-semibold text-foreground">Quant Study</span> from the panel to analyze your stock
                    </p>
                    <p className="text-xs text-muted-foreground/70 max-w-xs">
                      Pick from categories like Risk, Momentum, Volatility & more
                    </p>
                    {/* Mobile CTA to show studies */}
                    <Button
                      variant="default"
                      size="lg"
                      className="md:hidden mt-6 h-14 gap-3 text-base font-semibold rounded-xl w-full max-w-xs"
                      onClick={() => setShowStudyPanel(true)}
                    >
                      <Layers className="h-5 w-5" />
                      Browse Quant Studies
                    </Button>
                  </>
                )}
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
