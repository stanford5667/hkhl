/**
 * Backtesting Type Definitions
 * All parameter interfaces for the backtesting engine
 */

// ==================== STRATEGY TYPES ====================

export type StrategyType = 'prebuilt' | 'custom' | 'ai-generated'
export type PrebuiltStrategyId = 
  | 'consecutive_days_reversal'
  | 'rsi_oversold_bounce'
  | 'ma_crossover'
  | 'gap_fill'
  | 'post_earnings_drift'
  | 'volatility_breakout'
  | 'yield_optimizer'
  | 'macd_divergence'
  | 'bollinger_reversal'
  | 'volume_spike'

export type OrderType = 'MARKET' | 'LIMIT' | 'STOP' | 'STOP_LIMIT'
export type PositionType = 'LONG' | 'SHORT'
export type OrderAction = 'BUY' | 'SELL' | 'HOLD'

// ==================== CONFIGURATION TYPES ====================

export interface PositionSizingConfig {
  method: 'fixed-dollar' | 'fixed-shares' | 'percent-portfolio' | 'risk-based'
  value: number
  maxPositions?: number
  allowFractional?: boolean
}

export interface StopLossConfig {
  type: 'percent' | 'fixed' | 'atr' | 'none'
  value: number
}

export interface TakeProfitConfig {
  type: 'percent' | 'fixed' | 'ratio' | 'none'
  value: number
}

export interface TrailingStopConfig {
  enabled: boolean
  percent: number
}

export interface RiskManagementConfig {
  stopLoss?: StopLossConfig
  takeProfit?: TakeProfitConfig
  trailingStop?: TrailingStopConfig
  maxLossPerTrade?: number // Percent of account
}

export interface TradingRulesConfig {
  commission: number
  slippage: number // Percent
  fillAssumptions: {
    marketOrders: 'next-bar-open' | 'next-bar-close'
    limitOrders: 'if-price-reached'
    stopOrders: 'when-triggered'
  }
  tradeDuringMarketHoursOnly: boolean
  allowShortSelling: boolean
}

export interface BacktestConfig {
  startDate: string // ISO date
  endDate: string // ISO date
  startingCapital: number
  positionSizing: PositionSizingConfig
  riskManagement: RiskManagementConfig
  tradingRules: TradingRulesConfig
  dataFrequency: '1min' | '5min' | '15min' | '1hour' | 'daily'
}

// ==================== STRATEGY DEFINITION ====================

export interface StrategyParameters {
  [key: string]: any
  // Common parameters
  rsiPeriod?: number
  rsiOversold?: number
  rsiOverbought?: number
  smaPeriodFast?: number
  smaPeriodSlow?: number
  emaPeriodFast?: number
  emaPeriodSlow?: number
  consecutiveDays?: number
  gapThreshold?: number
  volumeMultiplier?: number
  atrPeriod?: number
  bolllingerPeriod?: number
  bollingerStdDev?: number
  // Options parameters
  optionDelta?: number
}

export interface PrebuiltStrategy {
  id: PrebuiltStrategyId
  name: string
  description: string
  category: 'reversal' | 'momentum' | 'volatility' | 'options' | 'technical'
  riskLevel: 'conservative' | 'moderate' | 'aggressive'
  parameters: StrategyParameters
  defaultParameters: StrategyParameters
}

export interface CustomStrategy {
  code: string
  name: string
  description?: string
  parameters?: StrategyParameters
}

export interface AIGeneratedStrategy extends CustomStrategy {
  explanation: string
  warnings: string[]
  suggestedParameters: {
    [key: string]: {
      value: any
      reasoning: string
    }
  }
  expectedPerformance: {
    winRate: string
    avgTrade: string
    maxDrawdown: string
  }
}

export interface StrategyDefinition {
  type: StrategyType
  prebuilt?: PrebuiltStrategy
  custom?: CustomStrategy
  aiGenerated?: AIGeneratedStrategy
}

// ==================== MARKET DATA TYPES ====================

export interface Candle {
  timestamp: number
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  adjustedClose?: number
}

export interface MarketData {
  ticker: string
  candles: Candle[]
  frequency: string
  startDate: string
  endDate: string
}

// ==================== POSITION & PORTFOLIO TYPES ====================

export interface Position {
  ticker: string
  shares: number
  avgPrice: number
  currentPrice: number
  entryDate: string
  entryPrice: number
  positionType: PositionType
  stopLoss?: number
  takeProfit?: number
  trailingStopPrice?: number
  unrealizedPL: number
  unrealizedPLPercent: number
}

export interface Portfolio {
  cash: number
  equity: number
  positions: Position[]
  totalValue: number
  initialCapital: number
}

export interface Order {
  ticker: string
  action: 'BUY' | 'SELL'
  shares: number
  orderType: OrderType
  price?: number
  stopPrice?: number
  stopLoss?: number
  takeProfit?: number
}

// ==================== TRADE RESULT TYPES ====================

export interface Trade {
  tradeNumber: number
  ticker: string
  positionType: PositionType
  entryDate: string
  exitDate: string
  entryPrice: number
  exitPrice: number
  shares: number
  entryValue: number
  exitValue: number
  commission: number
  slippage: number
  grossReturn: number
  grossReturnPercent: number
  netReturn: number
  netReturnPercent: number
  holdingPeriod: number // days
  entrySignal: string
  exitSignal: string
  stopLossHit?: boolean
  takeProfitHit?: boolean
}

// ==================== PERFORMANCE METRICS ====================

export interface PerformanceMetrics {
  // Overall performance
  startingCapital: number
  endingCapital: number
  totalReturn: number
  totalReturnPercent: number
  annualizedReturn: number
  buyAndHoldReturn?: number
  outperformance?: number
  
  // Trade statistics
  totalTrades: number
  winningTrades: number
  losingTrades: number
  winRate: number
  avgWin: number
  avgWinPercent: number
  avgLoss: number
  avgLossPercent: number
  bestTrade: number
  bestTradePercent: number
  worstTrade: number
  worstTradePercent: number
  avgTrade: number
  avgTradePercent: number
  
  // Risk-adjusted metrics
  sharpeRatio: number
  smoothnessScore: number // User-friendly Sharpe
  expectedValue: number
  expectedValuePercent: number
  
  // Drawdown metrics
  maxDrawdown: number
  maxDrawdownPercent: number
  maxDrawdownDate: string
  maxDrawdownPeakDate: string
  maxDrawdownValleyDate: string
  recoveryTime: number // days
  avgDrawdown: number
  avgDrawdownPercent: number
  
  // Additional metrics
  profitFactor: number // Gross profit / Gross loss
  payoffRatio: number // Avg win / Avg loss
  averageHoldingPeriod: number
  tradingFrequency: number // Trades per month
}

export interface EquityCurvePoint {
  date: string
  timestamp: number
  portfolioValue: number
  cash: number
  positionsValue: number
  drawdown: number
  drawdownPercent: number
  cumulativeReturn: number
  cumulativeReturnPercent: number
}

export interface DistributionBucket {
  range: string
  rangeMin: number
  rangeMax: number
  count: number
  percent: number
  trades: number[]
}

export interface Distribution {
  buckets: DistributionBucket[]
  mean: number
  median: number
  stdDev: number
  skewness: number
  kurtosis: number
}

// ==================== BACKTEST REQUEST/RESPONSE ====================

export interface BacktestRequest {
  ticker: string
  strategy: StrategyDefinition
  config: BacktestConfig
  organizationId: string
  userId: string
}

export interface BacktestResponse {
  success: boolean
  backtestId: string
  ticker: string
  strategy: {
    name: string
    type: StrategyType
  }
  config: BacktestConfig
  
  performance: PerformanceMetrics
  equityCurve: EquityCurvePoint[]
  trades: Trade[]
  distribution: Distribution
  
  // Portfolio correlation (if user has portfolio)
  correlation?: {
    currentExposure: {
      [sector: string]: number
    }
    thisStrategySector: string
    correlationWithPortfolio: {
      [ticker: string]: number
    }
    warnings: string[]
    recommendations: string[]
  }
  
  // Options-specific metrics (if applicable)
  optionsMetrics?: {
    contractsSold: number
    premiumCollected: number
    avgPremiumPerTrade: number
    assignmentRate: number
    expiredWorthless: number
    assigned: number
    incomeBreakdown: {
      optionPremium: number
      stockAppreciation: number
      totalReturn: number
    }
    annualIncomeYield: number
  }
  
  // Warnings and recommendations
  warnings: string[]
  recommendations: string[]
  
  // Execution metadata
  executionTime: number // milliseconds
  dataPoints: number
  timestamp: string
}

// ==================== STRATEGY CONTEXT (for custom code) ====================

export interface StrategyContext {
  // Market data
  bars: Candle[]
  currentBar: Candle
  currentIndex: number
  
  // Position & portfolio
  position: Position | null
  portfolio: Portfolio
  
  // Configuration
  config: BacktestConfig
  parameters: StrategyParameters
  
  // Helper functions available to strategy
  indicators: {
    rsi: (period: number, index?: number) => number
    sma: (period: number, index?: number) => number
    ema: (period: number, index?: number) => number
    macd: (fast: number, slow: number, signal: number) => {
      macd: number
      signal: number
      histogram: number
    }
    bollinger: (period: number, stdDev: number) => {
      upper: number
      middle: number
      lower: number
    }
    atr: (period: number) => number
    stochastic: (period: number) => {
      k: number
      d: number
    }
    volumeRatio: () => number
  }
  
  // Order functions
  buy: (shares: number, price?: number, stopLoss?: number, takeProfit?: number) => void
  sell: (shares: number, price?: number) => void
  sellAll: () => void
  
  // Risk management helpers
  calculatePositionSize: (riskPercent: number, stopLoss: number) => number
  setTrailingStop: (percent: number) => void
  
  // Utility
  log: (message: string, data?: any) => void
}

// ==================== VALIDATION TYPES ====================

export interface ValidationError {
  field: string
  message: string
  code: string
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: string[]
}

// ==================== PREBUILT STRATEGY CONFIGS ====================

export const PREBUILT_STRATEGIES: Record<PrebuiltStrategyId, Omit<PrebuiltStrategy, 'parameters'> & { defaultParameters: StrategyParameters }> = {
  consecutive_days_reversal: {
    id: 'consecutive_days_reversal',
    name: 'Consecutive Days Reversal',
    description: 'Buy after N consecutive down days, sell after M days',
    category: 'reversal',
    riskLevel: 'moderate',
    defaultParameters: {
      consecutiveDays: 3,
      holdingPeriod: 5,
      minDailyDrop: 0.5, // percent
    }
  },
  rsi_oversold_bounce: {
    id: 'rsi_oversold_bounce',
    name: 'RSI Oversold Bounce',
    description: 'Buy when RSI < 30, sell when RSI > 50',
    category: 'reversal',
    riskLevel: 'moderate',
    defaultParameters: {
      rsiPeriod: 14,
      rsiOversold: 30,
      rsiOverbought: 50,
    }
  },
  ma_crossover: {
    id: 'ma_crossover',
    name: 'Moving Average Crossover',
    description: 'Buy when fast MA crosses above slow MA',
    category: 'momentum',
    riskLevel: 'moderate',
    defaultParameters: {
      smaPeriodFast: 50,
      smaPeriodSlow: 200,
    }
  },
  gap_fill: {
    id: 'gap_fill',
    name: 'Gap Fill Strategy',
    description: 'Buy gap downs, sell when gap fills',
    category: 'reversal',
    riskLevel: 'moderate',
    defaultParameters: {
      gapThreshold: 2.0, // percent
      maxDaysToFill: 5,
    }
  },
  post_earnings_drift: {
    id: 'post_earnings_drift',
    name: 'Post-Earnings Drift',
    description: 'Buy earnings beats, hold for drift period',
    category: 'momentum',
    riskLevel: 'moderate',
    defaultParameters: {
      minEarningsBeat: 5, // percent above estimate
      driftPeriod: 20, // days
    }
  },
  volatility_breakout: {
    id: 'volatility_breakout',
    name: 'Volatility Breakout',
    description: 'Buy when price breaks out of low volatility period',
    category: 'volatility',
    riskLevel: 'aggressive',
    defaultParameters: {
      atrPeriod: 14,
      lowVolatilityThreshold: 0.5,
      breakoutMultiplier: 2.0,
    }
  },
  yield_optimizer: {
    id: 'yield_optimizer',
    name: 'Yield Optimizer (Covered Calls)',
    description: 'Sell covered calls at specific delta levels',
    category: 'options',
    riskLevel: 'conservative',
    defaultParameters: {
      optionDelta: 30,
      rsiOverbought: 70,
      minDaysToExpiration: 30,
    }
  },
  macd_divergence: {
    id: 'macd_divergence',
    name: 'MACD Divergence',
    description: 'Buy when price makes new low but MACD doesn\'t',
    category: 'momentum',
    riskLevel: 'moderate',
    defaultParameters: {
      macdFast: 12,
      macdSlow: 26,
      macdSignal: 9,
      lookbackPeriod: 20,
    }
  },
  bollinger_reversal: {
    id: 'bollinger_reversal',
    name: 'Bollinger Band Reversal',
    description: 'Buy at lower band, sell at upper band',
    category: 'reversal',
    riskLevel: 'moderate',
    defaultParameters: {
      bollingerPeriod: 20,
      bollingerStdDev: 2.0,
    }
  },
  volume_spike: {
    id: 'volume_spike',
    name: 'Volume Spike Follow-Through',
    description: 'Buy unusual volume days with positive price action',
    category: 'momentum',
    riskLevel: 'aggressive',
    defaultParameters: {
      volumeMultiplier: 2.0,
      minPriceChange: 1.0, // percent
      holdingPeriod: 3,
    }
  },
}
