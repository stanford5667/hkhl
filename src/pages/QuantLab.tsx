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
  FlaskConical, Search, Play, Plus, Save, Bookmark,
  TrendingUp, TrendingDown, BarChart3, Activity, Info,
  Calendar, Zap, Layers, Volume2, Crosshair, LineChart,
  Gauge, ArrowLeftRight, Mountain, ArrowUpDown,
  Target, Shield, Loader2, GitBranch, Lightbulb,
  CheckCircle2, X, ExternalLink, ChevronLeft, ChevronDown, ChevronRight, Crown, Lock
} from 'lucide-react';
import { InlinePrice } from '@/components/shared/PriceDisplay';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUsage } from '@/contexts/UsageContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { StudyVisualizations } from '@/components/quant-lab/StudyVisualizations';
import { StudyResultCard } from '@/components/quant-lab/StudyResultCard';
import { StudySetupCard } from '@/components/quant-lab/StudySetupCard';
import { SavedStudiesPanel } from '@/components/quant-lab/SavedStudiesPanel';
// Interactive Learning Components
import { LearningProvider, useLearning } from '@/components/quant-lab/LearningContext';
import { TutorialOverlay } from '@/components/quant-lab/TutorialOverlay';
import { MetricDetailModal } from '@/components/quant-lab/MetricDetailModal';
import { StudyAuditDashboard } from '@/components/quant-lab/StudyAuditDashboard';
import { MobileAuthSheet } from '@/components/auth/MobileAuthSheet';
import { IntegratedQuantStudiesPanel } from '@/components/equity/IntegratedQuantStudiesPanel';
import { EnhancedResultView } from '@/components/quant-lab/EnhancedResultViews';
import { StudyRunningOverlay } from '@/components/quant-lab/StudyRunningOverlay';
import { QuantLabWelcomeHero } from '@/components/quant-lab/QuantLabWelcomeHero';

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
  isPremium?: boolean; // Premium studies require subscription
}

const STUDY_DEFINITIONS: StudyDefinition[] = [
  // ========== BASIC STATISTICS ==========
  // ========== BASIC STATISTICS (no editable params - pure analysis) ==========
  // FREE: First 2 basic studies
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
    params: [], // No adjustable params - pure factual analysis
    isPremium: false, // FREE
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
    params: [], // No adjustable params - pure factual analysis
    isPremium: false, // FREE
  },
  // PREMIUM: Remaining basic studies
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
    params: [], // No adjustable params - shows full distribution automatically
    isPremium: true, // PREMIUM
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
    params: [], // No adjustable params - analyzes all streaks
    isPremium: true, // PREMIUM
  },
  
  // ========== SEASONALITY (simple or no params) ==========
  // ALL PREMIUM
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
    params: [], // Analyzes all days automatically
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
    params: [], // Analyzes all months automatically
    isPremium: true,
  },
  
  // ========== TECHNICAL ANALYSIS (uses industry-standard defaults) ==========
  // ALL PREMIUM
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
    params: [], // Uses industry-standard RSI(14) with 70/30 levels
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
    params: [], // Uses standard 20/50/200 moving averages
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
    params: [], // Uses standard moving average configuration
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
    params: [], // Uses standard MACD(12, 26, 9)
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
    params: [], // Uses standard Bollinger(20, 2)
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
    params: [], // Uses standard Stochastic(14, 3) with 80/20 levels
    isPremium: true,
  },
  
  // ========== VOLATILITY & RISK (no editable params) ==========
  // ALL PREMIUM
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
    params: [], // Uses standard ATR(14) and 20-day volatility
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
    params: [], // Shows all significant drawdowns automatically
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
    params: [], // Uses standard 2 standard deviation threshold
    isPremium: true,
  },
  
  // ========== PRICE PATTERNS ==========
  // ALL PREMIUM
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
    params: [], // Analyzes all significant gaps automatically
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
    params: [], // Uses standard definitions for patterns
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
    params: [], // Uses 20-day high/low as standard
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
    params: [], // Uses standard pattern definitions
    isPremium: true,
  },
  
  // ========== VOLUME (no editable params) ==========
  // ALL PREMIUM
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
    params: [], // Uses 20-day volume average
    isPremium: true,
  },
  
  // ========== PROJECTIONS (no editable params) ==========
  // ALL PREMIUM
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
    params: [], // Uses 1 standard deviation for projection range
    isPremium: true,
  },
  
  // ========== CONDITIONAL PROBABILITY ==========
  // FREE: First conditional study
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
    isPremium: false, // FREE
  },
  // PREMIUM: Rest of conditional studies
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
    isPremium: true, // PREMIUM
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
    isPremium: true, // PREMIUM
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
    isPremium: true, // PREMIUM
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
    isPremium: true, // PREMIUM
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
    isPremium: true, // PREMIUM
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
    isPremium: true, // PREMIUM
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
  const { usage, isPro, canUse, trackUsage, showUpgradeModal } = useUsage();
  
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

    // Check study definition
    const study = STUDY_DEFINITIONS.find(s => s.id === studyId);
    if (!study) {
      toast.error('Study not found');
      return;
    }

    // Check free tier usage limit for non-premium users
    if (!isPro) {
      if (!canUse('quantStudies')) {
        showUpgradeModal('quantStudies');
        toast.error('Daily free study limit reached', {
          description: `You've used ${usage.quantStudies.used}/${usage.quantStudies.limit} free studies today. Upgrade to Pro for unlimited access.`,
        });
        return;
      }
    }

    // For conditional probability studies, verify required condition variables are set
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
      // Track usage for free users (before running the study)
      if (!isPro && user) {
        await trackUsage('quantStudies');
      }

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
  }, [selectedTicker, period, studyParams, isPro, canUse, trackUsage, showUpgradeModal, usage.quantStudies, user]);

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
        isPro={isPro}
        usage={usage}
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
    runStudy, runAllStudies, saveStudyResult, getStudy, formatValue, getSentimentStyle, getDisplayMetrics,
    isPro, usage
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
  
  // Track if user has interacted (to show welcome vs regular UI)
  const [hasInteracted, setHasInteracted] = useState(false);
  
  // Saved studies panel
  const [showSavedStudies, setShowSavedStudies] = useState(false);
  
  // Track if initial auto-run has been done this session
  const [hasAutoRun, setHasAutoRun] = useState(false);
  
  // Determine if we should show the welcome hero
  // Show for ALL logged-out users to maximize conversion
  const showWelcomeHero = !user;
  
  // Handler to select study from welcome hero
  const handleWelcomeSelectStudy = (studyId: string) => {
    setHasInteracted(true);
    addStudy(studyId);
  };
  
  // Handler for "Run Demo" from welcome hero
  const handleWelcomeRunDemo = () => {
    setHasInteracted(true);
    addStudy('after_consecutive_days');
    setTimeout(() => handleRunStudy('after_consecutive_days'), 100);
  };
  
  // Auto-select default study on first load ONLY for logged-in users (NO auto-run)
  useEffect(() => {
    // Skip for guests - they see the welcome hero
    if (!user) return;
    if (hasAutoRun) return;
    
    // Mark as handled
    setHasAutoRun(true);
    
    // If no study is selected, auto-select a default one (but don't run it)
    if (selectedStudies.length === 0) {
      addStudy('after_consecutive_days');
    }
  }, [user, selectedStudies, hasAutoRun, addStudy]);


  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Magic Moment: Study Running Overlay */}
      <StudyRunningOverlay 
        isRunning={!!runningStudy}
        studyName={STUDY_DEFINITIONS.find(s => s.id === runningStudy)?.name || 'Study'}
        ticker={selectedTicker}
        isGuest={!user}
      />
      
      {/* Tutorial Overlay for new users - Only show when not displaying welcome hero */}
      {!showWelcomeHero && <TutorialOverlay />}
      
      {/* Header with Prominent Search - Hidden on welcome hero for cleaner experience */}
      {!showWelcomeHero && (
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
          
          {/* Saved Studies Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSavedStudies(true)}
            className="hidden md:flex h-9 gap-2 px-4 border-amber-500/50 text-amber-600 hover:bg-amber-50"
          >
            <Bookmark className="h-4 w-4" />
            <span>Saved</span>
          </Button>
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
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* Desktop: Always-visible Study Sidebar - Hidden when showing welcome hero */}
        {!showWelcomeHero && (
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
        )}

        {/* Mobile: Study Selection Panel - Full screen overlay - Only show for logged-in users */}
        <AnimatePresence>
          {showStudyPanel && !showWelcomeHero && (
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
                {/* Fixed bottom action bar */}
                <div className="shrink-0 border-t bg-card px-4 pt-3 pb-20">
                  {!isPro && (
                    <div className="flex items-center justify-between mb-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <div className="flex items-center gap-2">
                        <FlaskConical className="h-3.5 w-3.5 text-amber-600" />
                        <span className="text-xs text-amber-700 dark:text-amber-400">
                          {usage?.quantStudies?.used ?? 0}/{usage?.quantStudies?.limit ?? 3} free studies used today
                        </span>
                      </div>
                      <Badge variant="outline" className="text-[9px] border-amber-500/50 text-amber-600">
                        <Crown className="h-2.5 w-2.5 mr-0.5" />
                        Upgrade
                      </Badge>
                    </div>
                  )}
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
              <div className="flex flex-col items-center h-full text-center px-6 pt-4">
                {showWelcomeHero ? (
                  /* Guest Welcome Hero - Show FIRST for logged out users */
                  <QuantLabWelcomeHero
                    onSelectStudy={handleWelcomeSelectStudy}
                    onRunDemo={handleWelcomeRunDemo}
                    isGuest={!user}
                    onSignUp={() => setShowAuthSheet(true)}
                  />
                ) : selectedStudies.length > 0 ? (
                  <div className="w-full max-w-2xl mx-auto space-y-3">
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
                          period={period}
                          onPeriodChange={setPeriod}
                          periodOptions={PERIOD_OPTIONS}
                          onTickerChange={(val) => setTicker(val.toUpperCase())}
                          onTickerBlur={() => ticker.trim() && handleSetTicker(ticker.trim())}
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
        title="Unlock Your Quant Edge"
        description="Free no-code tools to backtest strategies and find statistical edges—in seconds."
      />

      {/* Saved Studies Panel */}
      <AnimatePresence>
        {showSavedStudies && (
          <SavedStudiesPanel
            isOpen={showSavedStudies}
            onClose={() => setShowSavedStudies(false)}
            onNavigateToTicker={(t) => {
              handleSetTicker(t);
              setShowSavedStudies(false);
            }}
            onViewOriginalResults={(savedStudy) => {
              // Restore the ticker, params, and results from the saved study
              handleSetTicker(savedStudy.ticker);
              
              // Restore study parameters
              if (savedStudy.params && Object.keys(savedStudy.params).length > 0) {
                setStudyParams(prev => ({
                  ...prev,
                  [savedStudy.study_type]: savedStudy.params
                }));
              }
              
              // Restore the result
              setResults(prev => ({
                ...prev,
                [savedStudy.study_type]: savedStudy.result
              }));
              
              setShowSavedStudies(false);
              toast.success('Restored saved study results', {
                description: `${savedStudy.ticker} - ${savedStudy.study_name}`
              });
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
