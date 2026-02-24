/**
 * Technical Indicators
 * Helper class for calculating technical indicators from price data
 * Supports source flexibility: open, high, low, close, hl2, hlc3, ohlc4
 */

import { Candle } from './types'

export type PriceSource = 'open' | 'high' | 'low' | 'close' | 'hl2' | 'hlc3' | 'ohlc4';

export class TechnicalIndicators {
  private candles: Candle[] = []

  initialize(candles: Candle[]): void {
    this.candles = candles
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SOURCE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  private getSourceValue(index: number, source: PriceSource = 'close'): number {
    const c = this.candles[index]
    switch (source) {
      case 'open': return c.open
      case 'high': return c.high
      case 'low': return c.low
      case 'close': return c.close
      case 'hl2': return (c.high + c.low) / 2
      case 'hlc3': return (c.high + c.low + c.close) / 3
      case 'ohlc4': return (c.open + c.high + c.low + c.close) / 4
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MOVING AVERAGES
  // ═══════════════════════════════════════════════════════════════════════════

  sma(period: number, index?: number, source: PriceSource = 'close'): number {
    const endIndex = index ?? this.candles.length - 1
    const startIndex = endIndex - period + 1
    if (startIndex < 0) return 0

    let sum = 0
    for (let i = startIndex; i <= endIndex; i++) {
      sum += this.getSourceValue(i, source)
    }
    return sum / period
  }

  ema(period: number, index?: number, source: PriceSource = 'close'): number {
    const endIndex = index ?? this.candles.length - 1
    if (endIndex < period - 1) return 0

    const multiplier = 2 / (period + 1)
    let ema = this.sma(period, period - 1, source)

    for (let i = period; i <= endIndex; i++) {
      ema = (this.getSourceValue(i, source) - ema) * multiplier + ema
    }
    return ema
  }

  /** Weighted Moving Average */
  wma(period: number, index?: number, source: PriceSource = 'close'): number {
    const endIndex = index ?? this.candles.length - 1
    const startIndex = endIndex - period + 1
    if (startIndex < 0) return 0

    let weightedSum = 0
    let weightTotal = 0
    for (let i = startIndex; i <= endIndex; i++) {
      const weight = i - startIndex + 1
      weightedSum += this.getSourceValue(i, source) * weight
      weightTotal += weight
    }
    return weightedSum / weightTotal
  }

  /** Hull Moving Average: WMA(2*WMA(n/2) - WMA(n), sqrt(n)) */
  hma(period: number, index?: number, source: PriceSource = 'close'): number {
    const endIndex = index ?? this.candles.length - 1
    const halfPeriod = Math.floor(period / 2)
    const sqrtPeriod = Math.floor(Math.sqrt(period))

    if (endIndex < period + sqrtPeriod - 1) return 0

    // Build the diff series: 2*WMA(n/2) - WMA(n) for each bar
    const diffSeries: number[] = []
    for (let i = endIndex - sqrtPeriod + 1; i <= endIndex; i++) {
      const halfWma = this.wma(halfPeriod, i, source)
      const fullWma = this.wma(period, i, source)
      diffSeries.push(2 * halfWma - fullWma)
    }

    // WMA of the diff series
    let weightedSum = 0
    let weightTotal = 0
    for (let i = 0; i < diffSeries.length; i++) {
      const weight = i + 1
      weightedSum += diffSeries[i] * weight
      weightTotal += weight
    }
    return weightedSum / weightTotal
  }

  /** Volume Weighted Average Price */
  vwap(index?: number): number {
    const endIndex = index ?? this.candles.length - 1
    let cumulativeTPV = 0
    let cumulativeVolume = 0

    for (let i = 0; i <= endIndex; i++) {
      const tp = (this.candles[i].high + this.candles[i].low + this.candles[i].close) / 3
      cumulativeTPV += tp * this.candles[i].volume
      cumulativeVolume += this.candles[i].volume
    }
    return cumulativeVolume > 0 ? cumulativeTPV / cumulativeVolume : 0
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OSCILLATORS
  // ═══════════════════════════════════════════════════════════════════════════

  rsi(period: number = 14, index?: number, source: PriceSource = 'close'): number {
    const endIndex = index ?? this.candles.length - 1
    const startIndex = endIndex - period
    if (startIndex < 0) return 50

    let gains = 0
    let losses = 0
    for (let i = startIndex + 1; i <= endIndex; i++) {
      const change = this.getSourceValue(i, source) - this.getSourceValue(i - 1, source)
      if (change > 0) gains += change
      else losses += Math.abs(change)
    }

    const avgGain = gains / period
    const avgLoss = losses / period
    if (avgLoss === 0) return 100

    const rs = avgGain / avgLoss
    return 100 - 100 / (1 + rs)
  }

  /** MACD with proper EMA-of-MACD signal line */
  macd(
    fastPeriod: number = 12,
    slowPeriod: number = 26,
    signalPeriod: number = 9,
    index?: number,
    source: PriceSource = 'close'
  ): { macd: number; signal: number; histogram: number } {
    const endIndex = index ?? this.candles.length - 1

    // Need enough data for slowPeriod + signalPeriod
    if (endIndex < slowPeriod + signalPeriod - 1) {
      const fastEMA = this.ema(fastPeriod, endIndex, source)
      const slowEMA = this.ema(slowPeriod, endIndex, source)
      const macdLine = fastEMA - slowEMA
      return { macd: macdLine, signal: 0, histogram: macdLine }
    }

    // Build MACD line series for signal EMA
    const macdSeries: number[] = []
    const startCalc = Math.max(slowPeriod - 1, 0)
    for (let i = startCalc; i <= endIndex; i++) {
      const f = this.ema(fastPeriod, i, source)
      const s = this.ema(slowPeriod, i, source)
      macdSeries.push(f - s)
    }

    // EMA of MACD series for signal line
    const macdLine = macdSeries[macdSeries.length - 1]
    let signal = 0
    if (macdSeries.length >= signalPeriod) {
      const mult = 2 / (signalPeriod + 1)
      signal = macdSeries.slice(0, signalPeriod).reduce((a, b) => a + b, 0) / signalPeriod
      for (let i = signalPeriod; i < macdSeries.length; i++) {
        signal = (macdSeries[i] - signal) * mult + signal
      }
    }

    return { macd: macdLine, signal, histogram: macdLine - signal }
  }

  /** Stochastic with proper %D (SMA of %K) */
  stochastic(
    kPeriod: number = 14,
    dPeriod: number = 3,
    index?: number
  ): { k: number; d: number } {
    const endIndex = index ?? this.candles.length - 1
    if (endIndex < kPeriod - 1 + dPeriod - 1) return { k: 0, d: 0 }

    // Calculate %K for last dPeriod bars to get %D
    const kValues: number[] = []
    for (let j = endIndex - dPeriod + 1; j <= endIndex; j++) {
      const start = j - kPeriod + 1
      if (start < 0) { kValues.push(50); continue }
      let highestHigh = -Infinity
      let lowestLow = Infinity
      for (let i = start; i <= j; i++) {
        if (this.candles[i].high > highestHigh) highestHigh = this.candles[i].high
        if (this.candles[i].low < lowestLow) lowestLow = this.candles[i].low
      }
      const range = highestHigh - lowestLow
      kValues.push(range > 0 ? ((this.candles[j].close - lowestLow) / range) * 100 : 50)
    }

    const k = kValues[kValues.length - 1]
    const d = kValues.reduce((a, b) => a + b, 0) / kValues.length
    return { k, d }
  }

  /** Commodity Channel Index */
  cci(period: number = 20, index?: number): number {
    const endIndex = index ?? this.candles.length - 1
    const startIndex = endIndex - period + 1
    if (startIndex < 0) return 0

    // Typical price
    const tpValues: number[] = []
    for (let i = startIndex; i <= endIndex; i++) {
      tpValues.push((this.candles[i].high + this.candles[i].low + this.candles[i].close) / 3)
    }

    const meanTP = tpValues.reduce((a, b) => a + b, 0) / period
    const meanDeviation = tpValues.reduce((sum, tp) => sum + Math.abs(tp - meanTP), 0) / period

    return meanDeviation > 0 ? (tpValues[tpValues.length - 1] - meanTP) / (0.015 * meanDeviation) : 0
  }

  /** Momentum */
  momentum(period: number = 10, index?: number, source: PriceSource = 'close'): number {
    const endIndex = index ?? this.candles.length - 1
    if (endIndex < period) return 0
    return this.getSourceValue(endIndex, source) - this.getSourceValue(endIndex - period, source)
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VOLATILITY & BANDS
  // ═══════════════════════════════════════════════════════════════════════════

  bollinger(
    period: number = 20,
    stdDev: number = 2,
    index?: number,
    source: PriceSource = 'close'
  ): { upper: number; middle: number; lower: number } {
    const endIndex = index ?? this.candles.length - 1
    const middle = this.sma(period, endIndex, source)
    const startIndex = endIndex - period + 1
    if (startIndex < 0) return { upper: 0, middle: 0, lower: 0 }

    let sumSquaredDiff = 0
    for (let i = startIndex; i <= endIndex; i++) {
      const diff = this.getSourceValue(i, source) - middle
      sumSquaredDiff += diff * diff
    }
    const standardDeviation = Math.sqrt(sumSquaredDiff / period)

    return {
      upper: middle + standardDeviation * stdDev,
      middle,
      lower: middle - standardDeviation * stdDev,
    }
  }

  atr(period: number = 14, index?: number): number {
    const endIndex = index ?? this.candles.length - 1
    const startIndex = endIndex - period
    if (startIndex < 0) return 0

    let sum = 0
    for (let i = startIndex + 1; i <= endIndex; i++) {
      sum += this.trueRange(i)
    }
    return sum / period
  }

  private trueRange(index: number): number {
    if (index === 0) return this.candles[0].high - this.candles[0].low
    const high = this.candles[index].high
    const low = this.candles[index].low
    const prevClose = this.candles[index - 1].close
    return Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose))
  }

  /** Donchian Channels */
  donchian(period: number = 20, index?: number): { upper: number; middle: number; lower: number } {
    const endIndex = index ?? this.candles.length - 1
    const startIndex = endIndex - period + 1
    if (startIndex < 0) return { upper: 0, middle: 0, lower: 0 }

    let highestHigh = -Infinity
    let lowestLow = Infinity
    for (let i = startIndex; i <= endIndex; i++) {
      if (this.candles[i].high > highestHigh) highestHigh = this.candles[i].high
      if (this.candles[i].low < lowestLow) lowestLow = this.candles[i].low
    }
    return { upper: highestHigh, middle: (highestHigh + lowestLow) / 2, lower: lowestLow }
  }

  /** Keltner Channels */
  keltner(
    emaPeriod: number = 20,
    atrPeriod: number = 10,
    multiplier: number = 1.5,
    index?: number,
    source: PriceSource = 'close'
  ): { upper: number; middle: number; lower: number } {
    const endIndex = index ?? this.candles.length - 1
    const middle = this.ema(emaPeriod, endIndex, source)
    const atrVal = this.atr(atrPeriod, endIndex)
    return {
      upper: middle + atrVal * multiplier,
      middle,
      lower: middle - atrVal * multiplier,
    }
  }

  /** Supertrend */
  supertrend(
    period: number = 10,
    multiplier: number = 3,
    index?: number
  ): { value: number; direction: 'up' | 'down' } {
    const endIndex = index ?? this.candles.length - 1
    if (endIndex < period) return { value: this.candles[endIndex]?.close || 0, direction: 'up' }

    let upperBand = 0
    let lowerBand = 0
    let supertrend = 0
    let direction: 'up' | 'down' = 'up'

    for (let i = period; i <= endIndex; i++) {
      const atrVal = this.atr(period, i)
      const hl2 = (this.candles[i].high + this.candles[i].low) / 2
      const basicUpper = hl2 + multiplier * atrVal
      const basicLower = hl2 - multiplier * atrVal

      upperBand = i === period ? basicUpper : (basicUpper < upperBand || this.candles[i - 1].close > upperBand ? basicUpper : upperBand)
      lowerBand = i === period ? basicLower : (basicLower > lowerBand || this.candles[i - 1].close < lowerBand ? basicLower : lowerBand)

      if (i === period) {
        supertrend = this.candles[i].close > upperBand ? lowerBand : upperBand
        direction = this.candles[i].close > upperBand ? 'up' : 'down'
      } else {
        if (direction === 'up') {
          if (this.candles[i].close < lowerBand) { direction = 'down'; supertrend = upperBand }
          else supertrend = lowerBand
        } else {
          if (this.candles[i].close > upperBand) { direction = 'up'; supertrend = lowerBand }
          else supertrend = upperBand
        }
      }
    }

    return { value: supertrend, direction }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TREND
  // ═══════════════════════════════════════════════════════════════════════════

  /** Average Directional Index */
  adx(period: number = 14, index?: number): number {
    const endIndex = index ?? this.candles.length - 1
    if (endIndex < period * 2) return 0

    const dxValues: number[] = []
    for (let i = period; i <= endIndex; i++) {
      let plusDM = 0, minusDM = 0, trSum = 0
      for (let j = i - period + 1; j <= i; j++) {
        const upMove = this.candles[j].high - this.candles[j - 1].high
        const downMove = this.candles[j - 1].low - this.candles[j].low
        if (upMove > downMove && upMove > 0) plusDM += upMove
        if (downMove > upMove && downMove > 0) minusDM += downMove
        trSum += this.trueRange(j)
      }
      if (trSum === 0) { dxValues.push(0); continue }
      const plusDI = (plusDM / trSum) * 100
      const minusDI = (minusDM / trSum) * 100
      const diSum = plusDI + minusDI
      dxValues.push(diSum > 0 ? Math.abs(plusDI - minusDI) / diSum * 100 : 0)
    }

    if (dxValues.length === 0) return 0
    // ADX = SMA of DX over period
    const recent = dxValues.slice(-period)
    return recent.reduce((a, b) => a + b, 0) / recent.length
  }

  /** Parabolic SAR */
  parabolicSar(
    step: number = 0.02,
    maxStep: number = 0.2,
    index?: number
  ): { value: number; isUptrend: boolean } {
    const endIndex = index ?? this.candles.length - 1
    if (endIndex < 2) return { value: this.candles[0]?.low || 0, isUptrend: true }

    let isUptrend = this.candles[1].close > this.candles[0].close
    let sar = isUptrend ? this.candles[0].low : this.candles[0].high
    let ep = isUptrend ? this.candles[1].high : this.candles[1].low
    let af = step

    for (let i = 2; i <= endIndex; i++) {
      const prevSar = sar
      sar = prevSar + af * (ep - prevSar)

      if (isUptrend) {
        sar = Math.min(sar, this.candles[i - 1].low, this.candles[i - 2].low)
        if (this.candles[i].low < sar) {
          isUptrend = false
          sar = ep
          ep = this.candles[i].low
          af = step
        } else {
          if (this.candles[i].high > ep) {
            ep = this.candles[i].high
            af = Math.min(af + step, maxStep)
          }
        }
      } else {
        sar = Math.max(sar, this.candles[i - 1].high, this.candles[i - 2].high)
        if (this.candles[i].high > sar) {
          isUptrend = true
          sar = ep
          ep = this.candles[i].high
          af = step
        } else {
          if (this.candles[i].low < ep) {
            ep = this.candles[i].low
            af = Math.min(af + step, maxStep)
          }
        }
      }
    }

    return { value: sar, isUptrend }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VOLUME
  // ═══════════════════════════════════════════════════════════════════════════

  /** On-Balance Volume */
  obv(index?: number): number {
    const endIndex = index ?? this.candles.length - 1
    let obv = 0
    for (let i = 1; i <= endIndex; i++) {
      if (this.candles[i].close > this.candles[i - 1].close) obv += this.candles[i].volume
      else if (this.candles[i].close < this.candles[i - 1].close) obv -= this.candles[i].volume
    }
    return obv
  }

  /** Chaikin Money Flow */
  cmf(period: number = 20, index?: number): number {
    const endIndex = index ?? this.candles.length - 1
    const startIndex = endIndex - period + 1
    if (startIndex < 0) return 0

    let mfvSum = 0
    let volSum = 0
    for (let i = startIndex; i <= endIndex; i++) {
      const c = this.candles[i]
      const range = c.high - c.low
      const mfm = range > 0 ? ((c.close - c.low) - (c.high - c.close)) / range : 0
      mfvSum += mfm * c.volume
      volSum += c.volume
    }
    return volSum > 0 ? mfvSum / volSum : 0
  }

  volumeRatio(period: number = 20, index?: number): number {
    const endIndex = index ?? this.candles.length - 1
    const startIndex = endIndex - period + 1
    if (startIndex < 0) return 1

    let sum = 0
    for (let i = startIndex; i < endIndex; i++) {
      sum += this.candles[i].volume
    }
    const avgVolume = sum / (period - 1)
    return avgVolume > 0 ? this.candles[endIndex].volume / avgVolume : 1
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILITY
  // ═══════════════════════════════════════════════════════════════════════════

  isNewHigh(period: number = 20, index?: number): boolean {
    const endIndex = index ?? this.candles.length - 1
    const startIndex = endIndex - period
    if (startIndex < 0) return false
    const currentHigh = this.candles[endIndex].high
    for (let i = startIndex; i < endIndex; i++) {
      if (this.candles[i].high > currentHigh) return false
    }
    return true
  }

  isNewLow(period: number = 20, index?: number): boolean {
    const endIndex = index ?? this.candles.length - 1
    const startIndex = endIndex - period
    if (startIndex < 0) return false
    const currentLow = this.candles[endIndex].low
    for (let i = startIndex; i < endIndex; i++) {
      if (this.candles[i].low < currentLow) return false
    }
    return true
  }
}
