/**
 * Technical Indicators
 * Helper class for calculating technical indicators from price data
 */

import { Candle } from './types'

export class TechnicalIndicators {
  private candles: Candle[] = []

  /**
   * Initialize with candle data
   */
  initialize(candles: Candle[]): void {
    this.candles = candles
  }

  /**
   * Calculate RSI (Relative Strength Index)
   */
  rsi(period: number = 14, index?: number): number {
    const endIndex = index ?? this.candles.length - 1
    const startIndex = endIndex - period

    if (startIndex < 0) {
      return 50 // Not enough data
    }

    let gains = 0
    let losses = 0

    for (let i = startIndex + 1; i <= endIndex; i++) {
      const change = this.candles[i].close - this.candles[i - 1].close
      if (change > 0) {
        gains += change
      } else {
        losses += Math.abs(change)
      }
    }

    const avgGain = gains / period
    const avgLoss = losses / period

    if (avgLoss === 0) {
      return 100
    }

    const rs = avgGain / avgLoss
    return 100 - 100 / (1 + rs)
  }

  /**
   * Calculate SMA (Simple Moving Average)
   */
  sma(period: number, index?: number): number {
    const endIndex = index ?? this.candles.length - 1
    const startIndex = endIndex - period + 1

    if (startIndex < 0) {
      return 0
    }

    let sum = 0
    for (let i = startIndex; i <= endIndex; i++) {
      sum += this.candles[i].close
    }

    return sum / period
  }

  /**
   * Calculate EMA (Exponential Moving Average)
   */
  ema(period: number, index?: number): number {
    const endIndex = index ?? this.candles.length - 1

    if (endIndex < period - 1) {
      return 0
    }

    const multiplier = 2 / (period + 1)

    // Start with SMA
    let ema = this.sma(period, period - 1)

    // Calculate EMA
    for (let i = period; i <= endIndex; i++) {
      ema = (this.candles[i].close - ema) * multiplier + ema
    }

    return ema
  }

  /**
   * Calculate MACD (Moving Average Convergence Divergence)
   */
  macd(
    fastPeriod: number = 12,
    slowPeriod: number = 26,
    signalPeriod: number = 9,
    index?: number
  ): {
    macd: number
    signal: number
    histogram: number
  } {
    const endIndex = index ?? this.candles.length - 1

    const fastEMA = this.ema(fastPeriod, endIndex)
    const slowEMA = this.ema(slowPeriod, endIndex)
    const macdLine = fastEMA - slowEMA

    // Calculate signal line (EMA of MACD)
    // For simplicity, we'll use a basic SMA here
    // In production, calculate proper EMA of MACD values
    const signalLine = macdLine * 0.9 // Simplified

    return {
      macd: macdLine,
      signal: signalLine,
      histogram: macdLine - signalLine,
    }
  }

  /**
   * Calculate Bollinger Bands
   */
  bollinger(
    period: number = 20,
    stdDev: number = 2,
    index?: number
  ): {
    upper: number
    middle: number
    lower: number
  } {
    const endIndex = index ?? this.candles.length - 1
    const middle = this.sma(period, endIndex)

    // Calculate standard deviation
    const startIndex = endIndex - period + 1
    if (startIndex < 0) {
      return { upper: 0, middle: 0, lower: 0 }
    }

    let sumSquaredDiff = 0
    for (let i = startIndex; i <= endIndex; i++) {
      const diff = this.candles[i].close - middle
      sumSquaredDiff += diff * diff
    }

    const variance = sumSquaredDiff / period
    const standardDeviation = Math.sqrt(variance)

    return {
      upper: middle + standardDeviation * stdDev,
      middle,
      lower: middle - standardDeviation * stdDev,
    }
  }

  /**
   * Calculate ATR (Average True Range)
   */
  atr(period: number = 14, index?: number): number {
    const endIndex = index ?? this.candles.length - 1
    const startIndex = endIndex - period

    if (startIndex < 0) {
      return 0
    }

    let sum = 0
    for (let i = startIndex + 1; i <= endIndex; i++) {
      const tr = this.trueRange(i)
      sum += tr
    }

    return sum / period
  }

  /**
   * Calculate True Range
   */
  private trueRange(index: number): number {
    if (index === 0) {
      return this.candles[0].high - this.candles[0].low
    }

    const high = this.candles[index].high
    const low = this.candles[index].low
    const prevClose = this.candles[index - 1].close

    return Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose))
  }

  /**
   * Calculate Stochastic Oscillator
   */
  stochastic(
    period: number = 14,
    index?: number
  ): {
    k: number
    d: number
  } {
    const endIndex = index ?? this.candles.length - 1
    const startIndex = endIndex - period + 1

    if (startIndex < 0) {
      return { k: 0, d: 0 }
    }

    // Find highest high and lowest low
    let highestHigh = -Infinity
    let lowestLow = Infinity

    for (let i = startIndex; i <= endIndex; i++) {
      if (this.candles[i].high > highestHigh) {
        highestHigh = this.candles[i].high
      }
      if (this.candles[i].low < lowestLow) {
        lowestLow = this.candles[i].low
      }
    }

    const currentClose = this.candles[endIndex].close
    const k = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100

    // %D is typically a 3-period SMA of %K
    // For simplicity, we'll just return K here
    const d = k * 0.9 // Simplified

    return { k, d }
  }

  /**
   * Calculate Volume Ratio (current vs average)
   */
  volumeRatio(period: number = 20, index?: number): number {
    const endIndex = index ?? this.candles.length - 1
    const startIndex = endIndex - period + 1

    if (startIndex < 0) {
      return 1
    }

    let sum = 0
    for (let i = startIndex; i < endIndex; i++) {
      sum += this.candles[i].volume
    }

    const avgVolume = sum / (period - 1)
    const currentVolume = this.candles[endIndex].volume

    return avgVolume > 0 ? currentVolume / avgVolume : 1
  }

  /**
   * Check if price is making new highs
   */
  isNewHigh(period: number = 20, index?: number): boolean {
    const endIndex = index ?? this.candles.length - 1
    const startIndex = endIndex - period

    if (startIndex < 0) {
      return false
    }

    const currentHigh = this.candles[endIndex].high

    for (let i = startIndex; i < endIndex; i++) {
      if (this.candles[i].high > currentHigh) {
        return false
      }
    }

    return true
  }

  /**
   * Check if price is making new lows
   */
  isNewLow(period: number = 20, index?: number): boolean {
    const endIndex = index ?? this.candles.length - 1
    const startIndex = endIndex - period

    if (startIndex < 0) {
      return false
    }

    const currentLow = this.candles[endIndex].low

    for (let i = startIndex; i < endIndex; i++) {
      if (this.candles[i].low < currentLow) {
        return false
      }
    }

    return true
  }
}
