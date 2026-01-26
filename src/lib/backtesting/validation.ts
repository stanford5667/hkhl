/**
 * Backtesting Parameter Validation
 * Validates all input parameters before running backtest
 */

import {
  BacktestRequest,
  BacktestConfig,
  StrategyDefinition,
  PositionSizingConfig,
  RiskManagementConfig,
  ValidationResult,
  ValidationError,
  StrategyParameters,
  PREBUILT_STRATEGIES,
} from './types'

/**
 * Main validation function - validates entire backtest request
 */
export function validateBacktestRequest(request: BacktestRequest): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: string[] = []

  // Validate ticker
  const tickerValidation = validateTicker(request.ticker)
  errors.push(...tickerValidation.errors)
  warnings.push(...tickerValidation.warnings)

  // Validate strategy
  const strategyValidation = validateStrategy(request.strategy)
  errors.push(...strategyValidation.errors)
  warnings.push(...strategyValidation.warnings)

  // Validate config
  const configValidation = validateConfig(request.config)
  errors.push(...configValidation.errors)
  warnings.push(...configValidation.warnings)

  // Cross-field validations
  const crossValidation = validateCrossFields(request)
  errors.push(...crossValidation.errors)
  warnings.push(...crossValidation.warnings)

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Validate ticker symbol
 */
function validateTicker(ticker: string): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: string[] = []

  if (!ticker || ticker.trim() === '') {
    errors.push({
      field: 'ticker',
      message: 'Ticker symbol is required',
      code: 'TICKER_REQUIRED',
    })
  } else if (ticker.length > 10) {
    errors.push({
      field: 'ticker',
      message: 'Ticker symbol must be 10 characters or less',
      code: 'TICKER_TOO_LONG',
    })
  } else if (!/^[A-Z0-9.-]+$/.test(ticker.toUpperCase())) {
    errors.push({
      field: 'ticker',
      message: 'Ticker symbol contains invalid characters. Use only letters, numbers, dots, and hyphens.',
      code: 'TICKER_INVALID_FORMAT',
    })
  }

  return { valid: errors.length === 0, errors, warnings }
}

/**
 * Validate strategy definition
 */
function validateStrategy(strategy: StrategyDefinition): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: string[] = []

  if (!strategy.type) {
    errors.push({
      field: 'strategy.type',
      message: 'Strategy type is required (prebuilt, custom, or ai-generated)',
      code: 'STRATEGY_TYPE_REQUIRED',
    })
    return { valid: false, errors, warnings }
  }

  switch (strategy.type) {
    case 'prebuilt':
      if (!strategy.prebuilt) {
        errors.push({
          field: 'strategy.prebuilt',
          message: 'Prebuilt strategy configuration is required',
          code: 'PREBUILT_CONFIG_REQUIRED',
        })
      } else {
        const prebuiltValidation = validatePrebuiltStrategy(strategy.prebuilt)
        errors.push(...prebuiltValidation.errors)
        warnings.push(...prebuiltValidation.warnings)
      }
      break

    case 'custom':
      if (!strategy.custom) {
        errors.push({
          field: 'strategy.custom',
          message: 'Custom strategy code is required',
          code: 'CUSTOM_CODE_REQUIRED',
        })
      } else {
        const customValidation = validateCustomStrategy(strategy.custom)
        errors.push(...customValidation.errors)
        warnings.push(...customValidation.warnings)
      }
      break

    case 'ai-generated':
      if (!strategy.aiGenerated) {
        errors.push({
          field: 'strategy.aiGenerated',
          message: 'AI-generated strategy configuration is required',
          code: 'AI_CONFIG_REQUIRED',
        })
      } else {
        const aiValidation = validateCustomStrategy(strategy.aiGenerated)
        errors.push(...aiValidation.errors)
        warnings.push(...aiValidation.warnings)
      }
      break

    default:
      errors.push({
        field: 'strategy.type',
        message: `Invalid strategy type: ${strategy.type}`,
        code: 'STRATEGY_TYPE_INVALID',
      })
  }

  return { valid: errors.length === 0, errors, warnings }
}

/**
 * Validate prebuilt strategy
 */
function validatePrebuiltStrategy(prebuilt: any): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: string[] = []

  if (!prebuilt.id) {
    errors.push({
      field: 'strategy.prebuilt.id',
      message: 'Strategy ID is required',
      code: 'STRATEGY_ID_REQUIRED',
    })
    return { valid: false, errors, warnings }
  }

  // Check if strategy ID exists
  if (!PREBUILT_STRATEGIES[prebuilt.id as keyof typeof PREBUILT_STRATEGIES]) {
    errors.push({
      field: 'strategy.prebuilt.id',
      message: `Unknown strategy ID: ${prebuilt.id}`,
      code: 'STRATEGY_ID_UNKNOWN',
    })
    return { valid: false, errors, warnings }
  }

  // Validate parameters
  const paramValidation = validateStrategyParameters(
    prebuilt.id,
    prebuilt.parameters || {}
  )
  errors.push(...paramValidation.errors)
  warnings.push(...paramValidation.warnings)

  return { valid: errors.length === 0, errors, warnings }
}

/**
 * Validate custom strategy code
 */
function validateCustomStrategy(custom: any): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: string[] = []

  if (!custom.code || custom.code.trim() === '') {
    errors.push({
      field: 'strategy.custom.code',
      message: 'Strategy code is required',
      code: 'CODE_REQUIRED',
    })
    return { valid: false, errors, warnings }
  }

  if (!custom.name || custom.name.trim() === '') {
    warnings.push('Strategy name is recommended for better organization')
  }

  // Basic syntax validation
  try {
    // Check for required function
    if (!custom.code.includes('onBar')) {
      errors.push({
        field: 'strategy.custom.code',
        message: 'Strategy code must include an onBar function',
        code: 'MISSING_ONBAR_FUNCTION',
      })
    }

    // Check for dangerous patterns
    const dangerousPatterns = [
      'eval(',
      'Function(',
      'require(',
      'import(',
      'fetch(',
      'XMLHttpRequest',
      'process.',
      '__dirname',
      '__filename',
    ]

    for (const pattern of dangerousPatterns) {
      if (custom.code.includes(pattern)) {
        errors.push({
          field: 'strategy.custom.code',
          message: `Code contains prohibited pattern: ${pattern}`,
          code: 'PROHIBITED_CODE_PATTERN',
        })
      }
    }
  } catch (error: any) {
    errors.push({
      field: 'strategy.custom.code',
      message: `Syntax error in code: ${error.message}`,
      code: 'SYNTAX_ERROR',
    })
  }

  return { valid: errors.length === 0, errors, warnings }
}

/**
 * Validate strategy parameters
 */
function validateStrategyParameters(
  strategyId: string,
  parameters: StrategyParameters
): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: string[] = []

  // Get default parameters for this strategy
  const strategyConfig = PREBUILT_STRATEGIES[strategyId as keyof typeof PREBUILT_STRATEGIES]
  if (!strategyConfig) {
    return { valid: true, errors, warnings }
  }

  const defaults = strategyConfig.defaultParameters

  // Validate common parameters
  if (parameters.rsiPeriod !== undefined) {
    if (parameters.rsiPeriod < 5 || parameters.rsiPeriod > 50) {
      errors.push({
        field: 'strategy.parameters.rsiPeriod',
        message: 'RSI period must be between 5 and 50',
        code: 'RSI_PERIOD_OUT_OF_RANGE',
      })
    }
  }

  if (parameters.rsiOversold !== undefined) {
    if (parameters.rsiOversold < 10 || parameters.rsiOversold > 40) {
      errors.push({
        field: 'strategy.parameters.rsiOversold',
        message: 'RSI oversold level must be between 10 and 40',
        code: 'RSI_OVERSOLD_OUT_OF_RANGE',
      })
    }
  }

  if (parameters.rsiOverbought !== undefined) {
    if (parameters.rsiOverbought < 60 || parameters.rsiOverbought > 90) {
      errors.push({
        field: 'strategy.parameters.rsiOverbought',
        message: 'RSI overbought level must be between 60 and 90',
        code: 'RSI_OVERBOUGHT_OUT_OF_RANGE',
      })
    }
  }

  if (
    parameters.rsiOversold !== undefined &&
    parameters.rsiOverbought !== undefined &&
    parameters.rsiOversold >= parameters.rsiOverbought
  ) {
    errors.push({
      field: 'strategy.parameters',
      message: 'RSI oversold level must be less than overbought level',
      code: 'RSI_LEVELS_INVALID',
    })
  }

  if (parameters.smaPeriodFast !== undefined && parameters.smaPeriodSlow !== undefined) {
    if (parameters.smaPeriodFast >= parameters.smaPeriodSlow) {
      errors.push({
        field: 'strategy.parameters',
        message: 'Fast SMA period must be less than slow SMA period',
        code: 'SMA_PERIODS_INVALID',
      })
    }
  }

  if (parameters.consecutiveDays !== undefined) {
    if (parameters.consecutiveDays < 2 || parameters.consecutiveDays > 10) {
      errors.push({
        field: 'strategy.parameters.consecutiveDays',
        message: 'Consecutive days must be between 2 and 10',
        code: 'CONSECUTIVE_DAYS_OUT_OF_RANGE',
      })
    }
  }

  return { valid: errors.length === 0, errors, warnings }
}

/**
 * Validate backtest configuration
 */
function validateConfig(config: BacktestConfig): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: string[] = []

  // Validate dates
  const dateValidation = validateDates(config.startDate, config.endDate)
  errors.push(...dateValidation.errors)
  warnings.push(...dateValidation.warnings)

  // Validate starting capital
  if (config.startingCapital < 100) {
    errors.push({
      field: 'config.startingCapital',
      message: 'Starting capital must be at least $100. Try $1,000 for more realistic results.',
      code: 'CAPITAL_TOO_LOW',
    })
  } else if (config.startingCapital > 10000000) {
    errors.push({
      field: 'config.startingCapital',
      message: 'Starting capital must be $10,000,000 or less',
      code: 'CAPITAL_TOO_HIGH',
    })
  }

  // Validate position sizing
  const positionValidation = validatePositionSizing(config.positionSizing)
  errors.push(...positionValidation.errors)
  warnings.push(...positionValidation.warnings)

  // Validate risk management
  const riskValidation = validateRiskManagement(config.riskManagement)
  errors.push(...riskValidation.errors)
  warnings.push(...riskValidation.warnings)

  // Validate trading rules
  const rulesValidation = validateTradingRules(config.tradingRules)
  errors.push(...rulesValidation.errors)
  warnings.push(...rulesValidation.warnings)

  return { valid: errors.length === 0, errors, warnings }
}

/**
 * Validate date range
 */
function validateDates(startDate: string, endDate: string): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: string[] = []

  let start: Date, end: Date

  try {
    start = new Date(startDate)
    if (isNaN(start.getTime())) {
      errors.push({
        field: 'config.startDate',
        message: 'Invalid start date format. Use YYYY-MM-DD.',
        code: 'START_DATE_INVALID',
      })
      return { valid: false, errors, warnings }
    }
  } catch (error) {
    errors.push({
      field: 'config.startDate',
      message: 'Invalid start date format. Use YYYY-MM-DD.',
      code: 'START_DATE_INVALID',
    })
    return { valid: false, errors, warnings }
  }

  try {
    end = new Date(endDate)
    if (isNaN(end.getTime())) {
      errors.push({
        field: 'config.endDate',
        message: 'Invalid end date format. Use YYYY-MM-DD.',
        code: 'END_DATE_INVALID',
      })
      return { valid: false, errors, warnings }
    }
  } catch (error) {
    errors.push({
      field: 'config.endDate',
      message: 'Invalid end date format. Use YYYY-MM-DD.',
      code: 'END_DATE_INVALID',
    })
    return { valid: false, errors, warnings }
  }

  if (start >= end) {
    errors.push({
      field: 'config.dates',
      message: 'Start date must be before end date',
      code: 'DATE_RANGE_INVALID',
    })
  }

  // Check if date range is too short
  const daysDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  if (daysDiff < 30) {
    warnings.push(
      'Date range is less than 30 days. Results may not be statistically significant. Consider using a longer period.'
    )
  }

  // Check if start date is too far in the past
  const fiveYearsAgo = new Date()
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5)
  if (start < fiveYearsAgo) {
    warnings.push(
      'Start date is more than 5 years ago. Data availability may be limited for some tickers.'
    )
  }

  // Check if end date is in the future
  const now = new Date()
  if (end > now) {
    errors.push({
      field: 'config.endDate',
      message: 'End date cannot be in the future',
      code: 'END_DATE_FUTURE',
    })
  }

  return { valid: errors.length === 0, errors, warnings }
}

/**
 * Validate position sizing configuration
 */
function validatePositionSizing(sizing: PositionSizingConfig): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: string[] = []

  if (!sizing.method) {
    errors.push({
      field: 'config.positionSizing.method',
      message: 'Position sizing method is required',
      code: 'POSITION_METHOD_REQUIRED',
    })
    return { valid: false, errors, warnings }
  }

  switch (sizing.method) {
    case 'fixed-dollar':
      if (sizing.value < 100) {
        errors.push({
          field: 'config.positionSizing.value',
          message: 'Fixed dollar amount must be at least $100',
          code: 'POSITION_VALUE_TOO_LOW',
        })
      }
      break

    case 'fixed-shares':
      if (sizing.value < 1) {
        errors.push({
          field: 'config.positionSizing.value',
          message: 'Fixed shares must be at least 1',
          code: 'POSITION_VALUE_TOO_LOW',
        })
      }
      break

    case 'percent-portfolio':
      if (sizing.value < 1 || sizing.value > 100) {
        errors.push({
          field: 'config.positionSizing.value',
          message: 'Percent of portfolio must be between 1% and 100%',
          code: 'POSITION_PERCENT_OUT_OF_RANGE',
        })
      }
      if (sizing.value > 50) {
        warnings.push(
          'Using more than 50% of portfolio per position is very risky. Consider diversifying.'
        )
      }
      break

    case 'risk-based':
      if (sizing.value < 0.1 || sizing.value > 10) {
        errors.push({
          field: 'config.positionSizing.value',
          message: 'Risk-based sizing must be between 0.1% and 10% of account',
          code: 'POSITION_RISK_OUT_OF_RANGE',
        })
      }
      if (sizing.value > 5) {
        warnings.push(
          'Risking more than 5% per trade is very aggressive. Most professionals risk 1-2% per trade.'
        )
      }
      break
  }

  if (sizing.maxPositions !== undefined) {
    if (sizing.maxPositions < 1 || sizing.maxPositions > 20) {
      errors.push({
        field: 'config.positionSizing.maxPositions',
        message: 'Maximum positions must be between 1 and 20',
        code: 'MAX_POSITIONS_OUT_OF_RANGE',
      })
    }
  }

  return { valid: errors.length === 0, errors, warnings }
}

/**
 * Validate risk management configuration
 */
function validateRiskManagement(risk: RiskManagementConfig): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: string[] = []

  // Validate stop loss
  if (risk.stopLoss && risk.stopLoss.type !== 'none') {
    if (risk.stopLoss.type === 'percent') {
      if (risk.stopLoss.value < 0.5 || risk.stopLoss.value > 50) {
        errors.push({
          field: 'config.riskManagement.stopLoss.value',
          message: 'Stop loss percent must be between 0.5% and 50%',
          code: 'STOP_LOSS_OUT_OF_RANGE',
        })
      }
      if (risk.stopLoss.value > 20) {
        warnings.push(
          'Stop loss greater than 20% is very wide. Consider tightening to limit losses.'
        )
      }
    }
  } else {
    warnings.push(
      'No stop loss configured. Consider adding a stop loss to limit downside risk.'
    )
  }

  // Validate take profit
  if (risk.takeProfit && risk.takeProfit.type !== 'none') {
    if (risk.takeProfit.type === 'percent') {
      if (risk.takeProfit.value < 0.5 || risk.takeProfit.value > 100) {
        errors.push({
          field: 'config.riskManagement.takeProfit.value',
          message: 'Take profit percent must be between 0.5% and 100%',
          code: 'TAKE_PROFIT_OUT_OF_RANGE',
        })
      }
    }

    if (risk.takeProfit.type === 'ratio') {
      if (risk.takeProfit.value < 0.5 || risk.takeProfit.value > 10) {
        errors.push({
          field: 'config.riskManagement.takeProfit.value',
          message: 'Risk/reward ratio must be between 0.5:1 and 10:1',
          code: 'RATIO_OUT_OF_RANGE',
        })
      }
    }
  }

  // Cross-validate stop loss and take profit
  if (
    risk.stopLoss &&
    risk.stopLoss.type === 'percent' &&
    risk.takeProfit &&
    risk.takeProfit.type === 'percent'
  ) {
    if (risk.stopLoss.value >= risk.takeProfit.value) {
      errors.push({
        field: 'config.riskManagement',
        message: `Stop loss (${risk.stopLoss.value}%) must be less than take profit (${risk.takeProfit.value}%). You're risking more than you could gain.`,
        code: 'STOP_LOSS_GREATER_THAN_TAKE_PROFIT',
      })
    }

    const ratio = risk.takeProfit.value / risk.stopLoss.value
    if (ratio < 1.5) {
      warnings.push(
        `Your risk/reward ratio is ${ratio.toFixed(1)}:1. Consider aiming for at least 2:1 (risk $1 to make $2).`
      )
    }
  }

  // Validate trailing stop
  if (risk.trailingStop?.enabled) {
    if (risk.trailingStop.percent < 1 || risk.trailingStop.percent > 50) {
      errors.push({
        field: 'config.riskManagement.trailingStop.percent',
        message: 'Trailing stop percent must be between 1% and 50%',
        code: 'TRAILING_STOP_OUT_OF_RANGE',
      })
    }
  }

  return { valid: errors.length === 0, errors, warnings }
}

/**
 * Validate trading rules
 */
function validateTradingRules(rules: any): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: string[] = []

  if (rules.commission < 0 || rules.commission > 100) {
    errors.push({
      field: 'config.tradingRules.commission',
      message: 'Commission must be between $0 and $100 per trade',
      code: 'COMMISSION_OUT_OF_RANGE',
    })
  }

  if (rules.slippage < 0 || rules.slippage > 5) {
    errors.push({
      field: 'config.tradingRules.slippage',
      message: 'Slippage must be between 0% and 5%',
      code: 'SLIPPAGE_OUT_OF_RANGE',
    })
  }

  if (rules.slippage > 1) {
    warnings.push(
      'Slippage above 1% is very high. Most liquid stocks have slippage < 0.1%.'
    )
  }

  return { valid: errors.length === 0, errors, warnings }
}

/**
 * Cross-field validations
 */
function validateCrossFields(request: BacktestRequest): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: string[] = []

  // Check if position sizing is compatible with starting capital
  if (request.config.positionSizing.method === 'fixed-dollar') {
    if (request.config.positionSizing.value > request.config.startingCapital * 0.5) {
      warnings.push(
        'Position size is more than 50% of starting capital. This limits diversification.'
      )
    }
  }

  return { valid: errors.length === 0, errors, warnings }
}

/**
 * User-friendly error messages
 */
export function formatValidationErrors(result: ValidationResult): string[] {
  return result.errors.map((error) => {
    switch (error.code) {
      case 'TICKER_REQUIRED':
        return '❌ Please enter a ticker symbol (e.g., AAPL, MSFT, TSLA)'

      case 'START_DATE_INVALID':
      case 'END_DATE_INVALID':
        return `❌ ${error.message}`

      case 'DATE_RANGE_INVALID':
        return '❌ Start date must be before end date. Please check your date range.'

      case 'CAPITAL_TOO_LOW':
        return '❌ Starting capital must be at least $100. Try $1,000 to see more realistic results.'

      case 'STOP_LOSS_GREATER_THAN_TAKE_PROFIT':
        return `❌ ${error.message}`

      default:
        return `❌ ${error.message}`
    }
  })
}

/**
 * Pre-flight check - returns boolean for quick validation
 */
export function canRunBacktest(request: BacktestRequest): boolean {
  const result = validateBacktestRequest(request)
  return result.valid
}
