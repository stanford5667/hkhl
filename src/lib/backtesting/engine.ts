/**
 * Backtesting Engine
 * Main execution engine that processes parameters and runs backtests
 */

import {
  BacktestRequest,
  BacktestResponse,
  BacktestConfig,
  StrategyDefinition,
  Candle,
  Trade,
  Position,
  Portfolio,
  Order,
  PerformanceMetrics,
  EquityCurvePoint,
  Distribution,
  DistributionBucket,
  StrategyContext,
  PREBUILT_STRATEGIES,
} from './types'
import { validateBacktestRequest, formatValidationErrors } from './validation'
import { TechnicalIndicators } from './indicators'
import { isTradingDay, getHolidayName } from './marketHolidays'

export class BacktestEngine {
  private request: BacktestRequest
  private config: BacktestConfig
  private strategy: StrategyDefinition
  private candles: Candle[] = []
  private portfolio: Portfolio
  private trades: Trade[] = []
  private equityCurve: EquityCurvePoint[] = []
  private currentPosition: Position | null = null
  private indicators: TechnicalIndicators
  private logs: string[] = []
  private positionEntryIndex: number | null = null

  constructor(request: BacktestRequest) {
    this.request = request
    this.config = request.config
    this.strategy = request.strategy

    // Initialize portfolio with starting capital
    this.portfolio = {
      cash: this.config.startingCapital,
      equity: this.config.startingCapital,
      positions: [],
      totalValue: this.config.startingCapital,
      initialCapital: this.config.startingCapital,
    }

    this.indicators = new TechnicalIndicators()
  }

  /**
   * Main execution method
   */
  async run(): Promise<BacktestResponse> {
    const startTime = Date.now()

    try {
      // 1. Validate request
      const validation = validateBacktestRequest(this.request)
      if (!validation.valid) {
        const errorMessages = formatValidationErrors(validation)
        throw new Error(`Validation failed:\n${errorMessages.join('\n')}`)
      }

      // 2. Load market data
      await this.loadMarketData()

      // 3. Initialize indicators with loaded data
      this.indicators.initialize(this.candles)

      // 4. Execute strategy
      await this.executeStrategy()

      // 5. Calculate performance metrics
      const performance = this.calculatePerformance()

      // 6. Generate distribution
      const distribution = this.calculateDistribution()

      // 7. Generate warnings and recommendations
      const { warnings, recommendations } = this.generateInsights(performance)

      // 8. Build response
      const response: BacktestResponse = {
        success: true,
        backtestId: this.generateBacktestId(),
        ticker: this.request.ticker,
        strategy: {
          name: this.getStrategyName(),
          type: this.strategy.type,
        },
        config: this.config,
        performance,
        equityCurve: this.equityCurve,
        trades: this.trades,
        distribution,
        warnings: [...validation.warnings, ...warnings],
        recommendations,
        executionTime: Date.now() - startTime,
        dataPoints: this.candles.length,
        timestamp: new Date().toISOString(),
      }

      return response
    } catch (error: any) {
      throw new Error(`Backtest execution failed: ${error.message}`)
    }
  }

  /**
   * Load market data from source
   */
  private async loadMarketData(): Promise<void> {
    // This would integrate with your data provider (Polygon, Finnhub, etc.)
    // For now, this is a placeholder that should be replaced with actual data fetching

    const { startDate, endDate, dataFrequency } = this.config

    // TODO: Replace with actual data fetching
    // const response = await fetch(`/api/market-data/${this.request.ticker}?start=${startDate}&end=${endDate}&frequency=${dataFrequency}`)
    // this.candles = await response.json()

    throw new Error(
      'Market data loading not implemented. Integrate with Polygon.io, Finnhub, or your data provider.'
    )
  }

  /**
   * Execute the strategy based on type
   */
  private async executeStrategy(): Promise<void> {
    switch (this.strategy.type) {
      case 'prebuilt':
        if (!this.strategy.prebuilt) {
          throw new Error('Prebuilt strategy configuration missing')
        }
        await this.executePrebuiltStrategy(this.strategy.prebuilt.id)
        break

      case 'custom':
      case 'ai-generated':
        if (!this.strategy.custom && !this.strategy.aiGenerated) {
          throw new Error('Custom strategy code missing')
        }
        const code = this.strategy.custom?.code || this.strategy.aiGenerated?.code
        if (!code) {
          throw new Error('Strategy code is empty')
        }
        await this.executeCustomStrategy(code)
        break

      default:
        throw new Error(`Unknown strategy type: ${this.strategy.type}`)
    }
  }

  /**
   * Execute prebuilt strategy
   */
  private async executePrebuiltStrategy(strategyId: string): Promise<void> {
    const strategyConfig = PREBUILT_STRATEGIES[strategyId as keyof typeof PREBUILT_STRATEGIES]
    if (!strategyConfig) {
      throw new Error(`Unknown prebuilt strategy: ${strategyId}`)
    }

    // Get parameters (user-provided or defaults)
    const params = {
      ...strategyConfig.defaultParameters,
      ...(this.strategy.prebuilt?.parameters || {}),
    }

    // Execute strategy-specific logic
    switch (strategyId) {
      case 'consecutive_days_reversal':
        await this.executeConsecutiveDaysReversal(params)
        break

      case 'rsi_oversold_bounce':
        await this.executeRSIOversoldBounce(params)
        break

      case 'ma_crossover':
        await this.executeMovingAverageCrossover(params)
        break

      case 'gap_fill':
        await this.executeGapFillStrategy(params)
        break

      case 'bollinger_reversal':
        await this.executeBollingerReversal(params)
        break

      // Add other strategies as needed
      default:
        throw new Error(`Prebuilt strategy not implemented: ${strategyId}`)
    }
  }

  /**
   * Execute custom JavaScript strategy
   */
  private async executeCustomStrategy(code: string): Promise<void> {
    // TODO: Implement sandboxed execution using VM2 or similar
    // This is a security-critical component

    throw new Error(
      'Custom strategy execution not implemented. Requires secure JavaScript sandbox (VM2).'
    )
  }

  // ==================== PREBUILT STRATEGY IMPLEMENTATIONS ====================

  /**
   * Consecutive Days Reversal Strategy
   */
  private async executeConsecutiveDaysReversal(params: any): Promise<void> {
    const { consecutiveDays = 3, holdingPeriod = 5, minDailyDrop = 0.5 } = params

    for (let i = consecutiveDays; i < this.candles.length; i++) {
      const bar = this.candles[i]

      // Check if we're in a position
      if (this.currentPosition) {
        // Check exit conditions
        const daysHeld = this.positionEntryIndex !== null ? i - this.positionEntryIndex : 0
        if (daysHeld >= holdingPeriod) {
          this.closePosition(i, bar.close, 'Holding period reached')
        }
        continue
      }

      // Check for N consecutive down days
      let consecutiveDownDays = 0
      for (let j = 0; j < consecutiveDays; j++) {
        const prevBar = this.candles[i - j - 1]
        const beforePrevBar = this.candles[i - j - 2]
        const dailyChange = ((prevBar.close - beforePrevBar.close) / beforePrevBar.close) * 100

        if (dailyChange < -minDailyDrop) {
          consecutiveDownDays++
        } else {
          break
        }
      }

      // Entry signal: N consecutive down days
      if (consecutiveDownDays >= consecutiveDays) {
        const shares = this.calculateShares(bar.close)
        if (shares > 0) {
          this.openPosition(i, bar.close, shares, `${consecutiveDays} consecutive down days`)
        }
      }
    }

    // Close any open position at the end
    if (this.currentPosition) {
      const lastBar = this.candles[this.candles.length - 1]
      this.closePosition(this.candles.length - 1, lastBar.close, 'Backtest ended')
    }
  }

  /**
   * RSI Oversold Bounce Strategy
   */
  private async executeRSIOversoldBounce(params: any): Promise<void> {
    const { rsiPeriod = 14, rsiOversold = 30, rsiOverbought = 50 } = params

    for (let i = rsiPeriod; i < this.candles.length; i++) {
      const bar = this.candles[i]
      const rsi = this.indicators.rsi(rsiPeriod, i)

      // Check if we're in a position
      if (this.currentPosition) {
        // Exit when RSI crosses above target
        if (rsi > rsiOverbought) {
          this.closePosition(i, bar.close, `RSI crossed above ${rsiOverbought}`)
        }
        continue
      }

      // Entry signal: RSI below oversold
      if (rsi < rsiOversold) {
        const shares = this.calculateShares(bar.close)
        if (shares > 0) {
          this.openPosition(i, bar.close, shares, `RSI oversold at ${rsi.toFixed(2)}`)
        }
      }
    }

    // Close any open position at the end
    if (this.currentPosition) {
      const lastBar = this.candles[this.candles.length - 1]
      this.closePosition(this.candles.length - 1, lastBar.close, 'Backtest ended')
    }
  }

  /**
   * Moving Average Crossover Strategy
   */
  private async executeMovingAverageCrossover(params: any): Promise<void> {
    const { smaPeriodFast = 50, smaPeriodSlow = 200 } = params

    let prevFastSMA = 0
    let prevSlowSMA = 0

    for (let i = smaPeriodSlow; i < this.candles.length; i++) {
      const bar = this.candles[i]
      const fastSMA = this.indicators.sma(smaPeriodFast, i)
      const slowSMA = this.indicators.sma(smaPeriodSlow, i)

      // Check if we're in a position
      if (this.currentPosition) {
        // Exit on death cross (fast crosses below slow)
        if (prevFastSMA > prevSlowSMA && fastSMA <= slowSMA) {
          this.closePosition(i, bar.close, 'Death cross (fast MA crossed below slow MA)')
        }
      } else {
        // Entry on golden cross (fast crosses above slow)
        if (prevFastSMA <= prevSlowSMA && fastSMA > slowSMA) {
          const shares = this.calculateShares(bar.close)
          if (shares > 0) {
            this.openPosition(i, bar.close, shares, 'Golden cross (fast MA crossed above slow MA)')
          }
        }
      }

      prevFastSMA = fastSMA
      prevSlowSMA = slowSMA
    }

    // Close any open position at the end
    if (this.currentPosition) {
      const lastBar = this.candles[this.candles.length - 1]
      this.closePosition(this.candles.length - 1, lastBar.close, 'Backtest ended')
    }
  }

  /**
   * Gap Fill Strategy
   */
  private async executeGapFillStrategy(params: any): Promise<void> {
    const { gapThreshold = 2.0, maxDaysToFill = 5 } = params

    for (let i = 1; i < this.candles.length; i++) {
      const bar = this.candles[i]
      const prevBar = this.candles[i - 1]

      // Check if we're in a position
      if (this.currentPosition) {
        const daysHeld = this.positionEntryIndex !== null ? i - this.positionEntryIndex : 0

        // Exit if gap filled or max days reached
        if (bar.high >= prevBar.close || daysHeld >= maxDaysToFill) {
          this.closePosition(
            i,
            bar.close,
            bar.high >= prevBar.close ? 'Gap filled' : 'Max days to fill reached'
          )
        }
        continue
      }

      // Check for gap down (open significantly below previous close)
      const gapPercent = ((bar.open - prevBar.close) / prevBar.close) * 100
      if (gapPercent < -gapThreshold) {
        const shares = this.calculateShares(bar.open)
        if (shares > 0) {
          this.openPosition(
            i,
            bar.open,
            shares,
            `Gap down ${Math.abs(gapPercent).toFixed(2)}%`
          )
        }
      }
    }

    // Close any open position at the end
    if (this.currentPosition) {
      const lastBar = this.candles[this.candles.length - 1]
      this.closePosition(this.candles.length - 1, lastBar.close, 'Backtest ended')
    }
  }

  /**
   * Bollinger Band Reversal Strategy
   */
  private async executeBollingerReversal(params: any): Promise<void> {
    const { bollingerPeriod = 20, bollingerStdDev = 2.0 } = params

    for (let i = bollingerPeriod; i < this.candles.length; i++) {
      const bar = this.candles[i]
      const bb = this.indicators.bollinger(bollingerPeriod, bollingerStdDev, i)

      // Check if we're in a position
      if (this.currentPosition) {
        // Exit when price touches upper band
        if (bar.close >= bb.upper) {
          this.closePosition(i, bar.close, 'Price reached upper Bollinger Band')
        }
        continue
      }

      // Entry when price touches lower band
      if (bar.close <= bb.lower) {
        const shares = this.calculateShares(bar.close)
        if (shares > 0) {
          this.openPosition(i, bar.close, shares, 'Price at lower Bollinger Band')
        }
      }
    }

    // Close any open position at the end
    if (this.currentPosition) {
      const lastBar = this.candles[this.candles.length - 1]
      this.closePosition(this.candles.length - 1, lastBar.close, 'Backtest ended')
    }
  }

  // ==================== POSITION MANAGEMENT ====================

  /**
   * Calculate number of shares to buy based on position sizing method
   */
  private calculateShares(price: number): number {
    const { method, value, allowFractional = false } = this.config.positionSizing

    let dollarAmount = 0

    switch (method) {
      case 'fixed-dollar':
        dollarAmount = value
        break

      case 'fixed-shares':
        return allowFractional ? value : Math.floor(value)

      case 'percent-portfolio':
        dollarAmount = this.portfolio.totalValue * (value / 100)
        break

      case 'risk-based':
        // Calculate based on stop loss
        const stopLossPercent = this.config.riskManagement.stopLoss?.value || 5
        const riskAmount = this.portfolio.totalValue * (value / 100)
        dollarAmount = riskAmount / (stopLossPercent / 100)
        break
    }

    // Calculate shares
    const shares = dollarAmount / price

    // Apply commission and ensure we have enough cash
    const totalCost = shares * price + this.config.tradingRules.commission
    if (totalCost > this.portfolio.cash) {
      // Reduce shares to fit available cash
      const maxShares = (this.portfolio.cash - this.config.tradingRules.commission) / price
      return allowFractional ? maxShares : Math.floor(maxShares)
    }

    return allowFractional ? shares : Math.floor(shares)
  }

  /**
   * Open a new position
   */
  private openPosition(
    barIndex: number,
    price: number,
    shares: number,
    signal: string
  ): void {
    const bar = this.candles[barIndex]

    // Apply slippage
    const slippageMultiplier = 1 + this.config.tradingRules.slippage / 100
    const executionPrice = price * slippageMultiplier

    const totalCost = shares * executionPrice + this.config.tradingRules.commission

    // Check if we have enough cash
    if (totalCost > this.portfolio.cash) {
      return
    }

    // Deduct from cash
    this.portfolio.cash -= totalCost

    // Calculate stop loss and take profit prices
    let stopLoss: number | undefined
    let takeProfit: number | undefined

    if (this.config.riskManagement.stopLoss?.type === 'percent') {
      stopLoss = executionPrice * (1 - this.config.riskManagement.stopLoss.value / 100)
    }

    if (this.config.riskManagement.takeProfit?.type === 'percent') {
      takeProfit = executionPrice * (1 + this.config.riskManagement.takeProfit.value / 100)
    }

    // Create position
    this.currentPosition = {
      ticker: this.request.ticker,
      shares,
      avgPrice: executionPrice,
      currentPrice: executionPrice,
      entryDate: bar.date,
      entryPrice: executionPrice,
      positionType: 'LONG',
      stopLoss,
      takeProfit,
      unrealizedPL: 0,
      unrealizedPLPercent: 0,
    }

    this.portfolio.positions.push(this.currentPosition)
    this.updatePortfolioValue(barIndex)
    this.positionEntryIndex = barIndex

    this.log(`OPEN: ${signal} | Price: $${executionPrice.toFixed(2)} | Shares: ${shares}`)
  }

  /**
   * Close the current position
   */
  private closePosition(barIndex: number, price: number, signal: string): void {
    if (!this.currentPosition) return

    const bar = this.candles[barIndex]

    // Apply slippage
    const slippageMultiplier = 1 - this.config.tradingRules.slippage / 100
    const executionPrice = price * slippageMultiplier

    const proceeds = this.currentPosition.shares * executionPrice
    const totalProceeds = proceeds - this.config.tradingRules.commission

    // Add to cash
    this.portfolio.cash += totalProceeds

    // Calculate P&L
    const entryValue =
      this.currentPosition.shares * this.currentPosition.entryPrice +
      this.config.tradingRules.commission
    const exitValue = totalProceeds
    const netReturn = exitValue - entryValue
    const netReturnPercent = (netReturn / entryValue) * 100

    // Find entry bar
    const entryBarIndex = this.candles.findIndex(
      (c) => c.date === this.currentPosition!.entryDate
    )
    const holdingPeriod = barIndex - entryBarIndex

    // Create trade record
    const trade: Trade = {
      tradeNumber: this.trades.length + 1,
      ticker: this.request.ticker,
      positionType: 'LONG',
      entryDate: this.currentPosition.entryDate,
      exitDate: bar.date,
      entryPrice: this.currentPosition.entryPrice,
      exitPrice: executionPrice,
      shares: this.currentPosition.shares,
      entryValue,
      exitValue,
      commission: this.config.tradingRules.commission * 2, // Entry + exit
      slippage: this.config.tradingRules.slippage,
      grossReturn: proceeds - this.currentPosition.shares * this.currentPosition.entryPrice,
      grossReturnPercent:
        ((executionPrice - this.currentPosition.entryPrice) / this.currentPosition.entryPrice) *
        100,
      netReturn,
      netReturnPercent,
      holdingPeriod,
      entrySignal: this.logs[this.logs.length - 1] || 'Unknown',
      exitSignal: signal,
      stopLossHit: this.currentPosition.stopLoss
        ? executionPrice <= this.currentPosition.stopLoss
        : false,
      takeProfitHit: this.currentPosition.takeProfit
        ? executionPrice >= this.currentPosition.takeProfit
        : false,
    }

    this.trades.push(trade)

    // Remove from positions
    this.portfolio.positions = this.portfolio.positions.filter(
      (p) => p !== this.currentPosition
    )
    this.currentPosition = null
    this.positionEntryIndex = null

    this.updatePortfolioValue(barIndex)

    this.log(
      `CLOSE: ${signal} | Price: $${executionPrice.toFixed(2)} | P&L: ${netReturn >= 0 ? '+' : ''}$${netReturn.toFixed(2)} (${netReturnPercent >= 0 ? '+' : ''}${netReturnPercent.toFixed(2)}%)`
    )
  }

  /**
   * Update portfolio value and equity curve
   */
  private updatePortfolioValue(barIndex: number): void {
    const bar = this.candles[barIndex]
    let positionsValue = 0

    // Update current position value
    if (this.currentPosition) {
      this.currentPosition.currentPrice = bar.close
      this.currentPosition.unrealizedPL =
        (bar.close - this.currentPosition.avgPrice) * this.currentPosition.shares
      this.currentPosition.unrealizedPLPercent =
        (this.currentPosition.unrealizedPL /
          (this.currentPosition.avgPrice * this.currentPosition.shares)) *
        100
      positionsValue = bar.close * this.currentPosition.shares
    }

    const totalValue = this.portfolio.cash + positionsValue
    this.portfolio.equity = totalValue
    this.portfolio.totalValue = totalValue

    // Calculate drawdown
    const peak = Math.max(
      ...this.equityCurve.map((p) => p.portfolioValue),
      this.config.startingCapital
    )
    const drawdown = peak - totalValue
    const drawdownPercent = (drawdown / peak) * 100

    // Add to equity curve
    this.equityCurve.push({
      date: bar.date,
      timestamp: bar.timestamp,
      portfolioValue: totalValue,
      cash: this.portfolio.cash,
      positionsValue,
      drawdown,
      drawdownPercent,
      cumulativeReturn: totalValue - this.config.startingCapital,
      cumulativeReturnPercent:
        ((totalValue - this.config.startingCapital) / this.config.startingCapital) * 100,
    })
  }

  // ==================== PERFORMANCE CALCULATIONS ====================

  /**
   * Calculate all performance metrics
   */
  private calculatePerformance(): PerformanceMetrics {
    const finalValue = this.portfolio.totalValue
    const totalReturn = finalValue - this.config.startingCapital
    const totalReturnPercent = (totalReturn / this.config.startingCapital) * 100

    // Calculate annualized return
    const startDate = new Date(this.config.startDate)
    const endDate = new Date(this.config.endDate)
    const yearsDiff =
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
    const annualizedReturn =
      (Math.pow(finalValue / this.config.startingCapital, 1 / yearsDiff) - 1) * 100

    // Winning and losing trades
    const winningTrades = this.trades.filter((t) => t.netReturn > 0)
    const losingTrades = this.trades.filter((t) => t.netReturn < 0)

    const winRate = this.trades.length > 0 ? (winningTrades.length / this.trades.length) * 100 : 0

    // Average win/loss
    const avgWin =
      winningTrades.length > 0
        ? winningTrades.reduce((sum, t) => sum + t.netReturn, 0) / winningTrades.length
        : 0
    const avgWinPercent =
      winningTrades.length > 0
        ? winningTrades.reduce((sum, t) => sum + t.netReturnPercent, 0) / winningTrades.length
        : 0

    const avgLoss =
      losingTrades.length > 0
        ? losingTrades.reduce((sum, t) => sum + t.netReturn, 0) / losingTrades.length
        : 0
    const avgLossPercent =
      losingTrades.length > 0
        ? losingTrades.reduce((sum, t) => sum + t.netReturnPercent, 0) / losingTrades.length
        : 0

    // Best/worst trades
    const bestTrade = this.trades.length > 0 ? Math.max(...this.trades.map((t) => t.netReturn)) : 0
    const bestTradePercent =
      this.trades.length > 0 ? Math.max(...this.trades.map((t) => t.netReturnPercent)) : 0

    const worstTrade =
      this.trades.length > 0 ? Math.min(...this.trades.map((t) => t.netReturn)) : 0
    const worstTradePercent =
      this.trades.length > 0 ? Math.min(...this.trades.map((t) => t.netReturnPercent)) : 0

    // Average trade
    const avgTrade =
      this.trades.length > 0
        ? this.trades.reduce((sum, t) => sum + t.netReturn, 0) / this.trades.length
        : 0
    const avgTradePercent =
      this.trades.length > 0
        ? this.trades.reduce((sum, t) => sum + t.netReturnPercent, 0) / this.trades.length
        : 0

    // Calculate Sharpe Ratio (simplified)
    const returns = this.trades.map((t) => t.netReturnPercent)
    const meanReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0
    const variance =
      returns.length > 0
        ? returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / returns.length
        : 0
    const stdDev = Math.sqrt(variance)
    const sharpeRatio = stdDev > 0 ? meanReturn / stdDev : 0

    // Expected Value
    const expectedValue = winRate / 100 * avgWin + (1 - winRate / 100) * avgLoss
    const expectedValuePercent =
      winRate / 100 * avgWinPercent + (1 - winRate / 100) * avgLossPercent

    // Max Drawdown
    let maxDrawdown = 0
    let maxDrawdownPercent = 0
    let maxDrawdownDate = ''
    let maxDrawdownPeakDate = ''
    let maxDrawdownValleyDate = ''

    for (let i = 0; i < this.equityCurve.length; i++) {
      if (this.equityCurve[i].drawdown > maxDrawdown) {
        maxDrawdown = this.equityCurve[i].drawdown
        maxDrawdownPercent = this.equityCurve[i].drawdownPercent
        maxDrawdownDate = this.equityCurve[i].date
      }
    }

    // Recovery time (simplified - days from valley to recovery)
    const valleyIndex = this.equityCurve.findIndex((p) => p.drawdown === maxDrawdown)
    let recoveryTime = 0
    if (valleyIndex >= 0) {
      const peakValue = this.equityCurve[valleyIndex].portfolioValue + maxDrawdown
      for (let i = valleyIndex + 1; i < this.equityCurve.length; i++) {
        if (this.equityCurve[i].portfolioValue >= peakValue) {
          recoveryTime = i - valleyIndex
          break
        }
      }
    }

    // Average holding period
    const avgHoldingPeriod =
      this.trades.length > 0
        ? this.trades.reduce((sum, t) => sum + t.holdingPeriod, 0) / this.trades.length
        : 0

    // Trading frequency (trades per month)
    const tradingFrequency = (this.trades.length / yearsDiff) / 12

    // Profit factor
    const grossProfit = winningTrades.reduce((sum, t) => sum + t.netReturn, 0)
    const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.netReturn, 0))
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : 0

    // Payoff ratio
    const payoffRatio = Math.abs(avgLoss) > 0 ? avgWin / Math.abs(avgLoss) : 0

    return {
      startingCapital: this.config.startingCapital,
      endingCapital: finalValue,
      totalReturn,
      totalReturnPercent,
      annualizedReturn,
      totalTrades: this.trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate,
      avgWin,
      avgWinPercent,
      avgLoss,
      avgLossPercent,
      bestTrade,
      bestTradePercent,
      worstTrade,
      worstTradePercent,
      avgTrade,
      avgTradePercent,
      sharpeRatio,
      smoothnessScore: sharpeRatio,
      expectedValue,
      expectedValuePercent,
      maxDrawdown,
      maxDrawdownPercent,
      maxDrawdownDate,
      maxDrawdownPeakDate,
      maxDrawdownValleyDate,
      recoveryTime,
      avgDrawdown: maxDrawdown, // Simplified
      avgDrawdownPercent: maxDrawdownPercent,
      profitFactor,
      payoffRatio,
      averageHoldingPeriod: avgHoldingPeriod,
      tradingFrequency,
    }
  }

  /**
   * Calculate return distribution
   */
  private calculateDistribution(): Distribution {
    const returns = this.trades.map((t) => t.netReturnPercent)

    if (returns.length === 0) {
      return {
        buckets: [],
        mean: 0,
        median: 0,
        stdDev: 0,
        skewness: 0,
        kurtosis: 0,
      }
    }

    // Calculate statistics
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length
    const sortedReturns = [...returns].sort((a, b) => a - b)
    const median = sortedReturns[Math.floor(sortedReturns.length / 2)]
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length
    const stdDev = Math.sqrt(variance)

    // Create buckets
    const min = Math.min(...returns)
    const max = Math.max(...returns)
    const bucketSize = 2 // 2% buckets
    const buckets: DistributionBucket[] = []

    for (let i = Math.floor(min / bucketSize) * bucketSize; i <= max; i += bucketSize) {
      const rangeMin = i
      const rangeMax = i + bucketSize
      const tradesInBucket = this.trades
        .filter((t) => t.netReturnPercent >= rangeMin && t.netReturnPercent < rangeMax)
        .map((t) => t.tradeNumber)

      buckets.push({
        range: `${rangeMin.toFixed(0)}% to ${rangeMax.toFixed(0)}%`,
        rangeMin,
        rangeMax,
        count: tradesInBucket.length,
        percent: (tradesInBucket.length / this.trades.length) * 100,
        trades: tradesInBucket,
      })
    }

    return {
      buckets,
      mean,
      median,
      stdDev,
      skewness: 0, // TODO: Calculate actual skewness
      kurtosis: 0, // TODO: Calculate actual kurtosis
    }
  }

  /**
   * Generate warnings and recommendations based on results
   */
  private generateInsights(performance: PerformanceMetrics): {
    warnings: string[]
    recommendations: string[]
  } {
    const warnings: string[] = []
    const recommendations: string[] = []

    // Low sample size warning
    if (performance.totalTrades < 10) {
      warnings.push(
        `⚠️ Low Sample Size: Only ${performance.totalTrades} trades executed. Results may not be statistically significant. Try a longer time period or adjust your entry conditions.`
      )
    }

    // Poor win rate
    if (performance.winRate < 40 && performance.totalTrades > 5) {
      warnings.push(
        `⚠️ Low Win Rate: Only ${performance.winRate.toFixed(0)}% of trades were profitable. Consider refining your entry/exit rules.`
      )
    }

    // Large drawdown
    if (performance.maxDrawdownPercent > 20) {
      warnings.push(
        `⚠️ Large Drawdown: Maximum drawdown was ${performance.maxDrawdownPercent.toFixed(1)}%. Consider tighter risk management or smaller position sizes.`
      )
    }

    // Poor risk/reward
    if (performance.payoffRatio < 1 && performance.totalTrades > 5) {
      recommendations.push(
        `💡 Improve Risk/Reward: Your average win ($${performance.avgWin.toFixed(2)}) is smaller than your average loss ($${Math.abs(performance.avgLoss).toFixed(2)}). Consider letting winners run longer or cutting losses sooner.`
      )
    }

    // Good Sharpe ratio
    if (performance.sharpeRatio > 1.5) {
      recommendations.push(
        `✅ Excellent Risk-Adjusted Returns: Your Smoothness Score (${performance.sharpeRatio.toFixed(2)}) is above 1.5, indicating smooth, consistent returns.`
      )
    }

    // Overtrading
    if (performance.tradingFrequency > 10) {
      warnings.push(
        `⚠️ High Trading Frequency: You're making ${performance.tradingFrequency.toFixed(1)} trades per month. Consider if transaction costs are eating into your returns.`
      )
    }

    return { warnings, recommendations }
  }

  // ==================== UTILITY METHODS ====================

  private getStrategyName(): string {
    if (this.strategy.prebuilt) {
      return this.strategy.prebuilt.name
    }
    if (this.strategy.custom) {
      return this.strategy.custom.name || 'Custom Strategy'
    }
    if (this.strategy.aiGenerated) {
      return this.strategy.aiGenerated.name || 'AI-Generated Strategy'
    }
    return 'Unknown Strategy'
  }

  private generateBacktestId(): string {
    return `bt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private log(message: string): void {
    this.logs.push(message)
  }
}
