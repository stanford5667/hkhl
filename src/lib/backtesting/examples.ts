/**
 * Backtesting Usage Examples
 * Shows how to properly pass parameters to the backtesting engine
 */

import { BacktestEngine } from './engine'
import {
  BacktestRequest,
  BacktestConfig,
  StrategyDefinition,
  PositionSizingConfig,
  RiskManagementConfig,
  TradingRulesConfig,
} from './types'

// ==================== EXAMPLE 1: PREBUILT STRATEGY (RSI OVERSOLD) ====================

export async function example1_PrebuiltRSI() {
  // Define position sizing configuration
  const positionSizing: PositionSizingConfig = {
    method: 'percent-portfolio',
    value: 10, // 10% of portfolio per trade
    maxPositions: 3,
    allowFractional: false,
  }

  // Define risk management configuration
  const riskManagement: RiskManagementConfig = {
    stopLoss: {
      type: 'percent',
      value: 5, // 5% stop loss
    },
    takeProfit: {
      type: 'percent',
      value: 10, // 10% take profit
    },
    trailingStop: {
      enabled: false,
      percent: 0,
    },
    maxLossPerTrade: 2, // Max 2% of account per trade
  }

  // Define trading rules
  const tradingRules: TradingRulesConfig = {
    commission: 0, // $0 commission (Robinhood/Webull)
    slippage: 0.1, // 0.1% slippage
    fillAssumptions: {
      marketOrders: 'next-bar-open',
      limitOrders: 'if-price-reached',
      stopOrders: 'when-triggered',
    },
    tradeDuringMarketHoursOnly: true,
    allowShortSelling: false,
  }

  // Define backtest configuration
  const config: BacktestConfig = {
    startDate: '2023-01-01',
    endDate: '2024-01-01',
    startingCapital: 10000,
    positionSizing,
    riskManagement,
    tradingRules,
    dataFrequency: 'daily',
  }

  // Define strategy (RSI Oversold Bounce with custom parameters)
  const strategy: StrategyDefinition = {
    type: 'prebuilt',
    prebuilt: {
      id: 'rsi_oversold_bounce',
      name: 'RSI Oversold Bounce',
      description: 'Buy when RSI < 30, sell when RSI > 50',
      category: 'reversal',
      riskLevel: 'moderate',
      parameters: {
        rsiPeriod: 14, // Custom RSI period
        rsiOversold: 25, // Custom oversold level (more aggressive)
        rsiOverbought: 55, // Custom exit level
      },
      defaultParameters: {
        rsiPeriod: 14,
        rsiOversold: 30,
        rsiOverbought: 50,
      },
    },
  }

  // Create backtest request
  const request: BacktestRequest = {
    ticker: 'AAPL',
    strategy,
    config,
    organizationId: 'org_123',
    userId: 'user_456',
  }

  // Run backtest
  const engine = new BacktestEngine(request)
  const result = await engine.run()

  console.log('Backtest Results:')
  console.log(`Total Return: ${result.performance.totalReturnPercent.toFixed(2)}%`)
  console.log(`Win Rate: ${result.performance.winRate.toFixed(1)}%`)
  console.log(`Sharpe Ratio: ${result.performance.sharpeRatio.toFixed(2)}`)
  console.log(`Total Trades: ${result.performance.totalTrades}`)

  return result
}

// ==================== EXAMPLE 2: MOVING AVERAGE CROSSOVER ====================

export async function example2_MACrossover() {
  const request: BacktestRequest = {
    ticker: 'TSLA',
    strategy: {
      type: 'prebuilt',
      prebuilt: {
        id: 'ma_crossover',
        name: 'Moving Average Crossover',
        description: 'Buy when fast MA crosses above slow MA',
        category: 'momentum',
        riskLevel: 'moderate',
        parameters: {
          smaPeriodFast: 20, // 20-day fast MA
          smaPeriodSlow: 50, // 50-day slow MA
        },
        defaultParameters: {
          smaPeriodFast: 50,
          smaPeriodSlow: 200,
        },
      },
    },
    config: {
      startDate: '2022-01-01',
      endDate: '2024-01-01',
      startingCapital: 25000,
      positionSizing: {
        method: 'fixed-dollar',
        value: 5000, // $5,000 per trade
        allowFractional: true,
      },
      riskManagement: {
        stopLoss: {
          type: 'percent',
          value: 10,
        },
        takeProfit: {
          type: 'none',
          value: 0,
        },
        trailingStop: {
          enabled: true,
          percent: 8, // 8% trailing stop
        },
      },
      tradingRules: {
        commission: 1, // $1 per trade
        slippage: 0.05,
        fillAssumptions: {
          marketOrders: 'next-bar-open',
          limitOrders: 'if-price-reached',
          stopOrders: 'when-triggered',
        },
        tradeDuringMarketHoursOnly: true,
        allowShortSelling: false,
      },
      dataFrequency: 'daily',
    },
    organizationId: 'org_123',
    userId: 'user_456',
  }

  const engine = new BacktestEngine(request)
  return await engine.run()
}

// ==================== EXAMPLE 3: GAP FILL STRATEGY ====================

export async function example3_GapFill() {
  const request: BacktestRequest = {
    ticker: 'NVDA',
    strategy: {
      type: 'prebuilt',
      prebuilt: {
        id: 'gap_fill',
        name: 'Gap Fill Strategy',
        description: 'Buy gap downs, sell when gap fills',
        category: 'reversal',
        riskLevel: 'moderate',
        parameters: {
          gapThreshold: 3.0, // Buy gaps down 3% or more
          maxDaysToFill: 7, // Exit after 7 days if gap doesn't fill
        },
        defaultParameters: {
          gapThreshold: 2.0,
          maxDaysToFill: 5,
        },
      },
    },
    config: {
      startDate: '2023-01-01',
      endDate: '2024-01-01',
      startingCapital: 50000,
      positionSizing: {
        method: 'risk-based',
        value: 1.5, // Risk 1.5% of account per trade
        allowFractional: true,
      },
      riskManagement: {
        stopLoss: {
          type: 'percent',
          value: 3, // Tight 3% stop
        },
        takeProfit: {
          type: 'ratio',
          value: 2, // 2:1 risk/reward
        },
      },
      tradingRules: {
        commission: 0,
        slippage: 0.2, // Higher slippage for volatile gaps
        fillAssumptions: {
          marketOrders: 'next-bar-open',
          limitOrders: 'if-price-reached',
          stopOrders: 'when-triggered',
        },
        tradeDuringMarketHoursOnly: true,
        allowShortSelling: false,
      },
      dataFrequency: 'daily',
    },
    organizationId: 'org_123',
    userId: 'user_456',
  }

  const engine = new BacktestEngine(request)
  return await engine.run()
}

// ==================== EXAMPLE 4: CUSTOM STRATEGY CODE ====================

export async function example4_CustomStrategy() {
  // Custom strategy JavaScript code
  const customCode = `
// Custom Mean Reversion Strategy
{
  name: "Custom Mean Reversion",
  description: "Buy when price is 2 standard deviations below 20-day SMA",
  
  parameters: {
    period: 20,
    stdDevMultiplier: 2.0,
    exitMultiplier: 0.5
  },
  
  onBar: (bar, position, portfolio, context) => {
    const { indicators, parameters } = context
    const bb = indicators.bollinger(parameters.period, parameters.stdDevMultiplier)
    
    // Entry: Price below lower band
    if (!position && bar.close < bb.lower) {
      const shares = context.calculatePositionSize(2, 5) // Risk 2%, 5% stop
      return {
        action: 'BUY',
        shares: shares,
        stopLoss: bar.close * 0.95, // 5% stop
        takeProfit: bb.middle // Exit at middle band
      }
    }
    
    // Exit: Price above middle band
    if (position && bar.close > bb.middle) {
      return {
        action: 'SELL',
        shares: position.shares
      }
    }
    
    return { action: 'HOLD' }
  }
}
  `

  const request: BacktestRequest = {
    ticker: 'SPY',
    strategy: {
      type: 'custom',
      custom: {
        code: customCode,
        name: 'Custom Mean Reversion',
        description: 'Buy when price is 2 standard deviations below 20-day SMA',
        parameters: {
          period: 20,
          stdDevMultiplier: 2.0,
          exitMultiplier: 0.5,
        },
      },
    },
    config: {
      startDate: '2022-01-01',
      endDate: '2024-01-01',
      startingCapital: 100000,
      positionSizing: {
        method: 'percent-portfolio',
        value: 20,
        maxPositions: 5,
        allowFractional: true,
      },
      riskManagement: {
        stopLoss: {
          type: 'percent',
          value: 5,
        },
        takeProfit: {
          type: 'percent',
          value: 8,
        },
      },
      tradingRules: {
        commission: 0,
        slippage: 0.05,
        fillAssumptions: {
          marketOrders: 'next-bar-open',
          limitOrders: 'if-price-reached',
          stopOrders: 'when-triggered',
        },
        tradeDuringMarketHoursOnly: true,
        allowShortSelling: false,
      },
      dataFrequency: 'daily',
    },
    organizationId: 'org_123',
    userId: 'user_456',
  }

  const engine = new BacktestEngine(request)
  return await engine.run()
}

// ==================== EXAMPLE 5: AI-GENERATED STRATEGY ====================

export async function example5_AIGenerated() {
  const request: BacktestRequest = {
    ticker: 'MSFT',
    strategy: {
      type: 'ai-generated',
      aiGenerated: {
        code: `
// AI-Generated: Buy 3 consecutive down days, sell after 1 week
{
  name: "AI: 3 Down Days Reversal",
  onBar: (bar, position, portfolio, context) => {
    const { bars, currentIndex } = context
    
    if (position) {
      const entryIndex = bars.findIndex(b => b.date === position.entryDate)
      if (currentIndex - entryIndex >= 7) {
        return { action: 'SELL', shares: position.shares }
      }
      return { action: 'HOLD' }
    }
    
    // Check for 3 consecutive down days
    if (currentIndex < 3) return { action: 'HOLD' }
    
    let downDays = 0
    for (let i = 0; i < 3; i++) {
      if (bars[currentIndex - i].close < bars[currentIndex - i - 1].close) {
        downDays++
      }
    }
    
    if (downDays === 3) {
      return {
        action: 'BUY',
        shares: Math.floor(portfolio.cash * 0.1 / bar.close)
      }
    }
    
    return { action: 'HOLD' }
  }
}
        `,
        name: 'AI: 3 Down Days Reversal',
        explanation:
          'This strategy buys after 3 consecutive down days and holds for exactly 7 days, capitalizing on short-term mean reversion.',
        warnings: [
          'This strategy performs poorly in strong downtrends',
          'Consider adding a stop loss to limit downside',
          'Holding for exactly 7 days may not be optimal for all stocks',
        ],
        suggestedParameters: {
          consecutiveDays: {
            value: 3,
            reasoning: 'Three days provides a good balance between frequency and signal strength',
          },
          holdingPeriod: {
            value: 7,
            reasoning: 'Seven days allows time for mean reversion without overexposure',
          },
        },
        expectedPerformance: {
          winRate: '55-65%',
          avgTrade: '1.5-2.5%',
          maxDrawdown: '8-12%',
        },
      },
    },
    config: {
      startDate: '2023-01-01',
      endDate: '2024-01-01',
      startingCapital: 10000,
      positionSizing: {
        method: 'percent-portfolio',
        value: 10,
        allowFractional: false,
      },
      riskManagement: {
        stopLoss: {
          type: 'percent',
          value: 5,
        },
      },
      tradingRules: {
        commission: 0,
        slippage: 0.1,
        fillAssumptions: {
          marketOrders: 'next-bar-open',
          limitOrders: 'if-price-reached',
          stopOrders: 'when-triggered',
        },
        tradeDuringMarketHoursOnly: true,
        allowShortSelling: false,
      },
      dataFrequency: 'daily',
    },
    organizationId: 'org_123',
    userId: 'user_456',
  }

  const engine = new BacktestEngine(request)
  return await engine.run()
}

// ==================== EXAMPLE 6: MULTIPLE STRATEGIES COMPARISON ====================

export async function example6_CompareStrategies() {
  const baseConfig: BacktestConfig = {
    startDate: '2022-01-01',
    endDate: '2024-01-01',
    startingCapital: 10000,
    positionSizing: {
      method: 'percent-portfolio',
      value: 10,
      allowFractional: true,
    },
    riskManagement: {
      stopLoss: {
        type: 'percent',
        value: 5,
      },
      takeProfit: {
        type: 'percent',
        value: 10,
      },
    },
    tradingRules: {
      commission: 0,
      slippage: 0.1,
      fillAssumptions: {
        marketOrders: 'next-bar-open',
        limitOrders: 'if-price-reached',
        stopOrders: 'when-triggered',
      },
      tradeDuringMarketHoursOnly: true,
      allowShortSelling: false,
    },
    dataFrequency: 'daily',
  }

  const strategies = [
    {
      name: 'RSI Oversold',
      strategy: {
        type: 'prebuilt' as const,
        prebuilt: {
          id: 'rsi_oversold_bounce' as const,
          name: 'RSI Oversold',
          description: 'Buy RSI < 30',
          category: 'reversal' as const,
          riskLevel: 'moderate' as const,
          parameters: { rsiPeriod: 14, rsiOversold: 30, rsiOverbought: 50 },
          defaultParameters: { rsiPeriod: 14, rsiOversold: 30, rsiOverbought: 50 },
        },
      },
    },
    {
      name: 'MA Crossover',
      strategy: {
        type: 'prebuilt' as const,
        prebuilt: {
          id: 'ma_crossover' as const,
          name: 'MA Crossover',
          description: 'Golden/Death cross',
          category: 'momentum' as const,
          riskLevel: 'moderate' as const,
          parameters: { smaPeriodFast: 50, smaPeriodSlow: 200 },
          defaultParameters: { smaPeriodFast: 50, smaPeriodSlow: 200 },
        },
      },
    },
    {
      name: 'Bollinger Reversal',
      strategy: {
        type: 'prebuilt' as const,
        prebuilt: {
          id: 'bollinger_reversal' as const,
          name: 'Bollinger Reversal',
          description: 'Buy at lower band',
          category: 'reversal' as const,
          riskLevel: 'moderate' as const,
          parameters: { bollingerPeriod: 20, bollingerStdDev: 2.0 },
          defaultParameters: { bollingerPeriod: 20, bollingerStdDev: 2.0 },
        },
      },
    },
  ]

  const results = []

  for (const strategyDef of strategies) {
    const request: BacktestRequest = {
      ticker: 'AAPL',
      strategy: strategyDef.strategy,
      config: baseConfig,
      organizationId: 'org_123',
      userId: 'user_456',
    }

    const engine = new BacktestEngine(request)
    const result = await engine.run()

    results.push({
      name: strategyDef.name,
      totalReturn: result.performance.totalReturnPercent,
      winRate: result.performance.winRate,
      sharpeRatio: result.performance.sharpeRatio,
      maxDrawdown: result.performance.maxDrawdownPercent,
      trades: result.performance.totalTrades,
    })
  }

  console.log('\n=== STRATEGY COMPARISON ===')
  console.table(results)

  return results
}

// ==================== PARAMETER VALIDATION EXAMPLE ====================

export function example7_ParameterValidation() {
  const { validateBacktestRequest, formatValidationErrors } = require('./validation')

  // Invalid request (will fail validation)
  const invalidRequest: BacktestRequest = {
    ticker: '', // Empty ticker - INVALID
    strategy: {
      type: 'prebuilt',
      prebuilt: {
        id: 'rsi_oversold_bounce',
        name: 'RSI Oversold',
        description: 'Buy RSI < 30',
        category: 'reversal',
        riskLevel: 'moderate',
        parameters: {
          rsiPeriod: 100, // Out of range (5-50) - INVALID
          rsiOversold: 50, // Greater than overbought - INVALID
          rsiOverbought: 40,
        },
        defaultParameters: {},
      },
    },
    config: {
      startDate: '2024-01-01',
      endDate: '2023-01-01', // End before start - INVALID
      startingCapital: 50, // Too low - INVALID
      positionSizing: {
        method: 'percent-portfolio',
        value: 150, // Over 100% - INVALID
      },
      riskManagement: {
        stopLoss: {
          type: 'percent',
          value: 15, // Stop loss
        },
        takeProfit: {
          type: 'percent',
          value: 5, // Take profit less than stop loss - INVALID
        },
      },
      tradingRules: {
        commission: 0,
        slippage: 0.1,
        fillAssumptions: {
          marketOrders: 'next-bar-open',
          limitOrders: 'if-price-reached',
          stopOrders: 'when-triggered',
        },
        tradeDuringMarketHoursOnly: true,
        allowShortSelling: false,
      },
      dataFrequency: 'daily',
    },
    organizationId: 'org_123',
    userId: 'user_456',
  }

  const validation = validateBacktestRequest(invalidRequest)

  if (!validation.valid) {
    console.log('\n=== VALIDATION ERRORS ===')
    const errors = formatValidationErrors(validation)
    errors.forEach((error) => console.log(error))
  }

  console.log('\n=== WARNINGS ===')
  validation.warnings.forEach((warning) => console.log(`⚠️ ${warning}`))

  return validation
}

// ==================== EXPORT ALL EXAMPLES ====================

export const examples = {
  example1_PrebuiltRSI,
  example2_MACrossover,
  example3_GapFill,
  example4_CustomStrategy,
  example5_AIGenerated,
  example6_CompareStrategies,
  example7_ParameterValidation,
}

// Usage:
// import { examples } from './examples'
// const result = await examples.example1_PrebuiltRSI()
