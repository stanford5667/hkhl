/**
 * Study Tiers Configuration
 * Defines which studies run automatically (Tier 1) vs on-demand (Tier 2)
 * 
 * TIER 1 (AUTO): Fast execution, high viral value, instant insights
 * TIER 2 (MANUAL): Deeper analysis, slower computation, user-triggered
 */

export interface StudyTier {
  AUTO: string[]
  MANUAL: string[]
}

export const STUDY_TIERS: StudyTier = {
  // ========== TIER 1: AUTO-RUN (Instant Insights) ==========
  // These run immediately when a ticker is viewed
  // Target: < 500ms total execution time
  // Focus: Answering "Is this a good setup RIGHT NOW?"
  
  AUTO: [
    // Technical Momentum (Quick to calculate)
    'rsi_analysis',              // "Is it oversold/overbought?"
    'trend_strength',            // "Is it trending?"
    'moving_average_analysis',   // "Where is it vs key MAs?"
    
    // Recent Price Action (High viral value)
    'after_down_x',              // "Did it crash? Buy the dip?"
    'after_up_x',                // "Rally too far? Pullback coming?"
    'up_down_streaks',           // "Is momentum accelerating?"
    
    // Critical Pattern Signals
    'gap_analysis',              // "Gaps to watch"
    'consecutive_days',          // "Streak exhaustion?"
    
    // Basic Stats (Foundation)
    'daily_close_gt_open',       // "Intraday bias"
    'daily_close_gt_prior',      // "Win rate"
    
    // Current Risk Profile
    'volatility_analysis',       // "How much does it move?"
    'bollinger_analysis',        // "At extremes?"
  ],

  // ========== TIER 2: MANUAL (Deep Dive) ==========
  // User clicks "Run Study" to execute these
  // Can take 1-3 seconds each
  // Focus: Comprehensive analysis, edge validation
  
  MANUAL: [
    // Seasonality (Slower - needs multi-year data)
    'day_of_week_returns',       // "Best days to trade"
    'month_of_year_returns',     // "Seasonal patterns"
    
    // Advanced Technical
    'macd_analysis',             // "MACD signals"
    'stochastic_analysis',       // "Stochastic levels"
    
    // Risk & Statistics
    'daily_return_distribution', // "Full distribution analysis"
    'drawdown_analysis',         // "Worst-case scenarios"
    'mean_reversion',            // "Reversal vs continuation"
    
    // Pattern Analysis
    'range_analysis',            // "Inside/outside days"
    'high_low_analysis',         // "Breakout patterns"
    
    // Volume Studies
    'volume_analysis',           // "Volume patterns"
    'volume_price_correlation',  // "Volume-price relationship"
    
    // Advanced Projections
    'price_targets',             // "Projected ranges"
    'probability_distribution',  // "Monte Carlo outcomes"
    'support_resistance',        // "Key levels"
    
    // Earnings & Events
    'earnings_impact',           // "Earnings patterns"
    'event_study',               // "FOMC, Fed events"
    
    // Correlation & Relative
    'sector_correlation',        // "Sector dynamics"
    'spy_correlation',           // "Market correlation"
  ]
}

/**
 * Get tier for a specific study
 */
export function getStudyTier(studyId: string): 'AUTO' | 'MANUAL' | null {
  if (STUDY_TIERS.AUTO.includes(studyId)) return 'AUTO'
  if (STUDY_TIERS.MANUAL.includes(studyId)) return 'MANUAL'
  return null
}

/**
 * Check if study should auto-run
 */
export function shouldAutoRun(studyId: string): boolean {
  return STUDY_TIERS.AUTO.includes(studyId)
}

/**
 * Get all auto-run studies for snapshot
 */
export function getAutoRunStudies(): string[] {
  return STUDY_TIERS.AUTO
}

/**
 * Get study metadata for UI display
 */
export interface StudyTierMetadata {
  studyId: string
  tier: 'AUTO' | 'MANUAL'
  displayName: string
  quickDescription: string
  category: string
  estimatedTime: string
  chartLevelCapable: boolean
}

export const STUDY_TIER_METADATA: Record<string, StudyTierMetadata> = {
  // AUTO TIER
  rsi_analysis: {
    studyId: 'rsi_analysis',
    tier: 'AUTO',
    displayName: 'RSI Analysis',
    quickDescription: 'Oversold/overbought levels',
    category: 'Momentum',
    estimatedTime: '< 100ms',
    chartLevelCapable: true
  },
  trend_strength: {
    studyId: 'trend_strength',
    tier: 'AUTO',
    displayName: 'Trend Strength',
    quickDescription: 'How strong is the trend?',
    category: 'Trend',
    estimatedTime: '< 100ms',
    chartLevelCapable: false
  },
  moving_average_analysis: {
    studyId: 'moving_average_analysis',
    tier: 'AUTO',
    displayName: 'Moving Averages',
    quickDescription: 'Position vs MAs',
    category: 'Trend',
    estimatedTime: '< 100ms',
    chartLevelCapable: true
  },
  after_down_x: {
    studyId: 'after_down_x',
    tier: 'AUTO',
    displayName: 'After Down X%',
    quickDescription: 'Recovery probability',
    category: 'Pattern',
    estimatedTime: '< 150ms',
    chartLevelCapable: true
  },
  after_up_x: {
    studyId: 'after_up_x',
    tier: 'AUTO',
    displayName: 'After Up X%',
    quickDescription: 'Pullback probability',
    category: 'Pattern',
    estimatedTime: '< 150ms',
    chartLevelCapable: true
  },
  up_down_streaks: {
    studyId: 'up_down_streaks',
    tier: 'AUTO',
    displayName: 'Streaks',
    quickDescription: 'Consecutive days analysis',
    category: 'Momentum',
    estimatedTime: '< 100ms',
    chartLevelCapable: false
  },
  gap_analysis: {
    studyId: 'gap_analysis',
    tier: 'AUTO',
    displayName: 'Gap Analysis',
    quickDescription: 'Unfilled gaps',
    category: 'Pattern',
    estimatedTime: '< 150ms',
    chartLevelCapable: true
  },
  consecutive_days: {
    studyId: 'consecutive_days',
    tier: 'AUTO',
    displayName: 'Consecutive Days',
    quickDescription: 'Streak reversal odds',
    category: 'Pattern',
    estimatedTime: '< 100ms',
    chartLevelCapable: true
  },
  daily_close_gt_open: {
    studyId: 'daily_close_gt_open',
    tier: 'AUTO',
    displayName: 'Intraday Direction',
    quickDescription: 'Close > Open %',
    category: 'Basic Stats',
    estimatedTime: '< 50ms',
    chartLevelCapable: false
  },
  daily_close_gt_prior: {
    studyId: 'daily_close_gt_prior',
    tier: 'AUTO',
    displayName: 'Daily Win Rate',
    quickDescription: 'Up days %',
    category: 'Basic Stats',
    estimatedTime: '< 50ms',
    chartLevelCapable: false
  },
  volatility_analysis: {
    studyId: 'volatility_analysis',
    tier: 'AUTO',
    displayName: 'Volatility',
    quickDescription: 'ATR & daily range',
    category: 'Risk',
    estimatedTime: '< 100ms',
    chartLevelCapable: true
  },
  bollinger_analysis: {
    studyId: 'bollinger_analysis',
    tier: 'AUTO',
    displayName: 'Bollinger Bands',
    quickDescription: 'Band position',
    category: 'Volatility',
    estimatedTime: '< 100ms',
    chartLevelCapable: true
  },
  
  // MANUAL TIER (selected examples)
  day_of_week_returns: {
    studyId: 'day_of_week_returns',
    tier: 'MANUAL',
    displayName: 'Day of Week',
    quickDescription: 'Best trading days',
    category: 'Seasonality',
    estimatedTime: '~ 800ms',
    chartLevelCapable: false
  },
  month_of_year_returns: {
    studyId: 'month_of_year_returns',
    tier: 'MANUAL',
    displayName: 'Monthly Seasonality',
    quickDescription: 'Best months',
    category: 'Seasonality',
    estimatedTime: '~ 900ms',
    chartLevelCapable: false
  },
  daily_return_distribution: {
    studyId: 'daily_return_distribution',
    tier: 'MANUAL',
    displayName: 'Return Distribution',
    quickDescription: 'Full histogram',
    category: 'Statistics',
    estimatedTime: '~ 1.2s',
    chartLevelCapable: false
  },
  drawdown_analysis: {
    studyId: 'drawdown_analysis',
    tier: 'MANUAL',
    displayName: 'Drawdown Analysis',
    quickDescription: 'Max drawdowns',
    category: 'Risk',
    estimatedTime: '~ 1.0s',
    chartLevelCapable: false
  },
  price_targets: {
    studyId: 'price_targets',
    tier: 'MANUAL',
    displayName: 'Price Targets',
    quickDescription: 'Projected levels',
    category: 'Projection',
    estimatedTime: '~ 1.5s',
    chartLevelCapable: true
  }
}

/**
 * Get chart-level capable studies
 */
export function getChartLevelStudies(): string[] {
  return Object.values(STUDY_TIER_METADATA)
    .filter(meta => meta.chartLevelCapable)
    .map(meta => meta.studyId)
}

/**
 * Priority order for chart level rendering
 * Studies earlier in array have higher visual priority
 */
export const CHART_LEVEL_PRIORITY = [
  'gap_analysis',              // Gaps are magnetic - highest priority
  'rsi_analysis',              // Clear overbought/oversold
  'after_down_x',              // Recovery targets
  'after_up_x',                // Resistance zones
  'moving_average_analysis',   // Key MAs
  'consecutive_days',          // Streak reversals
  'bollinger_analysis',        // Bands
  'price_targets',             // Projections
  'volatility_analysis',       // Volatility-based levels
]

/**
 * Get display configuration for study tiers
 */
export interface TierDisplayConfig {
  name: string
  color: string
  badge: string
  description: string
  icon: string
}

export const TIER_DISPLAY: Record<'AUTO' | 'MANUAL', TierDisplayConfig> = {
  AUTO: {
    name: 'Instant Insights',
    color: '#3b82f6',
    badge: '⚡ Auto',
    description: 'Runs automatically when you view the ticker',
    icon: '⚡'
  },
  MANUAL: {
    name: 'Deep Dive',
    color: '#8b5cf6',
    badge: '🧠 On-Demand',
    description: 'Run these studies when you need comprehensive analysis',
    icon: '🔬'
  }
}
