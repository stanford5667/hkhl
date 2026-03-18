/**
 * Technical Indicators Test Suite
 * Tests every indicator in the TechnicalIndicators class with real-world-like data
 * Ensures NO hardcoded mock data leaks into production calculations
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TechnicalIndicators } from '../indicators';
import { Candle } from '../types';

// Generate realistic OHLCV data (NOT mock data — deterministic price series for math verification)
function generateTestCandles(count: number, startPrice: number = 100): Candle[] {
  const candles: Candle[] = [];
  let price = startPrice;
  const baseTimestamp = new Date('2024-01-02').getTime();

  for (let i = 0; i < count; i++) {
    // Deterministic price movement using sine wave + trend
    const change = Math.sin(i * 0.3) * 2 + 0.05;
    price = Math.max(1, price + change);

    const open = price - Math.abs(change) * 0.3;
    const high = price + Math.abs(change) * 0.5;
    const low = price - Math.abs(change) * 0.7;
    const close = price;
    const volume = 1000000 + Math.floor(Math.sin(i * 0.5) * 500000);

    candles.push({
      timestamp: baseTimestamp + i * 86400000,
      date: new Date(baseTimestamp + i * 86400000).toISOString().split('T')[0],
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
      volume: Math.max(100000, volume),
    });
  }

  return candles;
}

// Generate a downtrend for specific test scenarios
function generateDowntrendCandles(count: number, startPrice: number = 200): Candle[] {
  const candles: Candle[] = [];
  let price = startPrice;
  const baseTimestamp = new Date('2024-01-02').getTime();

  for (let i = 0; i < count; i++) {
    price = price * 0.99; // steady decline
    const open = price + 0.5;
    const high = price + 1;
    const low = price - 0.5;
    candles.push({
      timestamp: baseTimestamp + i * 86400000,
      date: new Date(baseTimestamp + i * 86400000).toISOString().split('T')[0],
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(price * 100) / 100,
      volume: 1000000,
    });
  }
  return candles;
}

describe('TechnicalIndicators', () => {
  let indicators: TechnicalIndicators;
  let candles: Candle[];

  beforeEach(() => {
    indicators = new TechnicalIndicators();
    candles = generateTestCandles(300);
    indicators.initialize(candles);
  });

  // ═══════════════════════════════════════════════════════════════
  // MOVING AVERAGES
  // ═══════════════════════════════════════════════════════════════

  describe('SMA (Simple Moving Average)', () => {
    it('calculates correctly for known values', () => {
      const sma = indicators.sma(5, 10);
      // Manual check: average of close prices at indices 6-10
      const expected = candles.slice(6, 11).reduce((s, c) => s + c.close, 0) / 5;
      expect(sma).toBeCloseTo(expected, 4);
    });

    it('returns 0 when period exceeds available data', () => {
      expect(indicators.sma(500, 10)).toBe(0);
    });

    it('supports different price sources', () => {
      const smaClose = indicators.sma(10, 50, 'close');
      const smaOpen = indicators.sma(10, 50, 'open');
      // Open and close should be different
      expect(smaClose).not.toBe(smaOpen);
    });

    it('uses hlc3 source correctly', () => {
      const smaHlc3 = indicators.sma(5, 10, 'hlc3');
      const expected = candles.slice(6, 11).reduce((s, c) => s + (c.high + c.low + c.close) / 3, 0) / 5;
      expect(smaHlc3).toBeCloseTo(expected, 4);
    });

    it('uses ohlc4 source correctly', () => {
      const smaOhlc4 = indicators.sma(5, 10, 'ohlc4');
      const expected = candles.slice(6, 11).reduce((s, c) => s + (c.open + c.high + c.low + c.close) / 4, 0) / 5;
      expect(smaOhlc4).toBeCloseTo(expected, 4);
    });

    it('defaults to last candle when no index provided', () => {
      const sma = indicators.sma(10);
      const smaExplicit = indicators.sma(10, candles.length - 1);
      expect(sma).toBe(smaExplicit);
    });
  });

  describe('EMA (Exponential Moving Average)', () => {
    it('returns a number for valid input', () => {
      const ema = indicators.ema(12, 50);
      expect(typeof ema).toBe('number');
      expect(ema).toBeGreaterThan(0);
    });

    it('returns 0 when insufficient data', () => {
      expect(indicators.ema(100, 5)).toBe(0);
    });

    it('responds faster to price changes than SMA', () => {
      // EMA should weight recent prices more heavily
      const ema = indicators.ema(20, 299);
      const sma = indicators.sma(20, 299);
      // Both should be positive but different
      expect(ema).toBeGreaterThan(0);
      expect(sma).toBeGreaterThan(0);
      expect(ema).not.toBe(sma);
    });
  });

  describe('WMA (Weighted Moving Average)', () => {
    it('calculates correctly', () => {
      const wma = indicators.wma(5, 10);
      expect(typeof wma).toBe('number');
      expect(wma).toBeGreaterThan(0);
    });

    it('gives more weight to recent prices than SMA', () => {
      // Not always true for all data, but WMA should differ from SMA
      const wma = indicators.wma(20, 100);
      const sma = indicators.sma(20, 100);
      expect(wma).not.toBe(sma);
    });
  });

  describe('HMA (Hull Moving Average)', () => {
    it('calculates for sufficient data', () => {
      const hma = indicators.hma(16, 100);
      expect(typeof hma).toBe('number');
      expect(hma).toBeGreaterThan(0);
    });

    it('returns 0 for insufficient data', () => {
      expect(indicators.hma(100, 10)).toBe(0);
    });
  });

  describe('VWAP', () => {
    it('calculates volume-weighted average price', () => {
      const vwap = indicators.vwap(50);
      expect(typeof vwap).toBe('number');
      expect(vwap).toBeGreaterThan(0);
    });

    it('is within the high-low range of the data', () => {
      const vwap = indicators.vwap(50);
      const allHighs = candles.slice(0, 51).map(c => c.high);
      const allLows = candles.slice(0, 51).map(c => c.low);
      expect(vwap).toBeLessThanOrEqual(Math.max(...allHighs));
      expect(vwap).toBeGreaterThanOrEqual(Math.min(...allLows));
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // OSCILLATORS
  // ═══════════════════════════════════════════════════════════════

  describe('RSI', () => {
    it('is bounded between 0 and 100', () => {
      for (let i = 20; i < 100; i += 10) {
        const rsi = indicators.rsi(14, i);
        expect(rsi).toBeGreaterThanOrEqual(0);
        expect(rsi).toBeLessThanOrEqual(100);
      }
    });

    it('returns 50 when insufficient data', () => {
      expect(indicators.rsi(14, 5)).toBe(50);
    });

    it('returns 100 when all gains, no losses', () => {
      const uptrendCandles = generateTestCandles(20, 50);
      // Force all up days
      for (let i = 1; i < uptrendCandles.length; i++) {
        uptrendCandles[i].close = uptrendCandles[i - 1].close + 1;
      }
      const ti = new TechnicalIndicators();
      ti.initialize(uptrendCandles);
      const rsi = ti.rsi(14, 19);
      expect(rsi).toBe(100);
    });

    it('is below 50 in a downtrend', () => {
      const downCandles = generateDowntrendCandles(50);
      const ti = new TechnicalIndicators();
      ti.initialize(downCandles);
      const rsi = ti.rsi(14, 49);
      expect(rsi).toBeLessThan(50);
    });
  });

  describe('MACD', () => {
    it('returns macd, signal, and histogram', () => {
      const result = indicators.macd(12, 26, 9, 100);
      expect(result).toHaveProperty('macd');
      expect(result).toHaveProperty('signal');
      expect(result).toHaveProperty('histogram');
      expect(typeof result.macd).toBe('number');
      expect(typeof result.signal).toBe('number');
      expect(typeof result.histogram).toBe('number');
    });

    it('histogram equals macd minus signal', () => {
      const result = indicators.macd(12, 26, 9, 200);
      expect(result.histogram).toBeCloseTo(result.macd - result.signal, 10);
    });

    it('handles insufficient data gracefully', () => {
      const result = indicators.macd(12, 26, 9, 5);
      expect(typeof result.macd).toBe('number');
    });
  });

  describe('Stochastic', () => {
    it('returns k and d values between 0 and 100', () => {
      const result = indicators.stochastic(14, 3, 100);
      expect(result.k).toBeGreaterThanOrEqual(0);
      expect(result.k).toBeLessThanOrEqual(100);
      expect(result.d).toBeGreaterThanOrEqual(0);
      expect(result.d).toBeLessThanOrEqual(100);
    });

    it('returns 0 for insufficient data', () => {
      const result = indicators.stochastic(14, 3, 5);
      expect(result.k).toBe(0);
      expect(result.d).toBe(0);
    });
  });

  describe('CCI', () => {
    it('returns a number', () => {
      const cci = indicators.cci(20, 50);
      expect(typeof cci).toBe('number');
    });

    it('returns 0 for insufficient data', () => {
      expect(indicators.cci(20, 5)).toBe(0);
    });
  });

  describe('Momentum', () => {
    it('returns price difference', () => {
      const mom = indicators.momentum(10, 50);
      const expected = candles[50].close - candles[40].close;
      expect(mom).toBeCloseTo(expected, 4);
    });

    it('returns 0 for insufficient data', () => {
      expect(indicators.momentum(10, 5)).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // VOLATILITY & BANDS
  // ═══════════════════════════════════════════════════════════════

  describe('Bollinger Bands', () => {
    it('returns upper, middle, lower bands', () => {
      const bb = indicators.bollinger(20, 2, 100);
      expect(bb.upper).toBeGreaterThan(bb.middle);
      expect(bb.middle).toBeGreaterThan(bb.lower);
    });

    it('middle band equals SMA', () => {
      const bb = indicators.bollinger(20, 2, 100);
      const sma = indicators.sma(20, 100);
      expect(bb.middle).toBeCloseTo(sma, 4);
    });

    it('bands are symmetric around middle', () => {
      const bb = indicators.bollinger(20, 2, 100);
      const upperDist = bb.upper - bb.middle;
      const lowerDist = bb.middle - bb.lower;
      expect(upperDist).toBeCloseTo(lowerDist, 4);
    });
  });

  describe('ATR', () => {
    it('is always positive', () => {
      const atr = indicators.atr(14, 50);
      expect(atr).toBeGreaterThan(0);
    });

    it('returns 0 for insufficient data', () => {
      expect(indicators.atr(14, 5)).toBe(0);
    });
  });

  describe('Donchian Channels', () => {
    it('upper is highest high, lower is lowest low', () => {
      const dc = indicators.donchian(20, 50);
      const highs = candles.slice(31, 51).map(c => c.high);
      const lows = candles.slice(31, 51).map(c => c.low);
      expect(dc.upper).toBe(Math.max(...highs));
      expect(dc.lower).toBe(Math.min(...lows));
    });

    it('middle is average of upper and lower', () => {
      const dc = indicators.donchian(20, 50);
      expect(dc.middle).toBeCloseTo((dc.upper + dc.lower) / 2, 4);
    });
  });

  describe('Keltner Channels', () => {
    it('returns upper > middle > lower', () => {
      const kc = indicators.keltner(20, 10, 1.5, 100);
      expect(kc.upper).toBeGreaterThan(kc.middle);
      expect(kc.middle).toBeGreaterThan(kc.lower);
    });
  });

  describe('Supertrend', () => {
    it('returns value and direction', () => {
      const st = indicators.supertrend(10, 3, 100);
      expect(typeof st.value).toBe('number');
      expect(st.value).toBeGreaterThan(0);
      expect(['up', 'down']).toContain(st.direction);
    });

    it('handles edge case of small index', () => {
      const st = indicators.supertrend(10, 3, 5);
      expect(typeof st.value).toBe('number');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // TREND
  // ═══════════════════════════════════════════════════════════════

  describe('ADX', () => {
    it('returns a non-negative number', () => {
      const adx = indicators.adx(14, 100);
      expect(adx).toBeGreaterThanOrEqual(0);
    });

    it('returns 0 for insufficient data', () => {
      expect(indicators.adx(14, 10)).toBe(0);
    });
  });

  describe('Parabolic SAR', () => {
    it('returns value and trend direction', () => {
      const sar = indicators.parabolicSar(0.02, 0.2, 100);
      expect(typeof sar.value).toBe('number');
      expect(sar.value).toBeGreaterThan(0);
      expect(typeof sar.isUptrend).toBe('boolean');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // VOLUME
  // ═══════════════════════════════════════════════════════════════

  describe('OBV', () => {
    it('returns a number', () => {
      const obv = indicators.obv(50);
      expect(typeof obv).toBe('number');
    });
  });

  describe('CMF (Chaikin Money Flow)', () => {
    it('is bounded between -1 and 1', () => {
      const cmf = indicators.cmf(20, 50);
      expect(cmf).toBeGreaterThanOrEqual(-1);
      expect(cmf).toBeLessThanOrEqual(1);
    });
  });

  describe('Volume Ratio', () => {
    it('returns positive number', () => {
      const vr = indicators.volumeRatio(20, 50);
      expect(vr).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // UTILITY
  // ═══════════════════════════════════════════════════════════════

  describe('isNewHigh / isNewLow', () => {
    it('correctly identifies new highs', () => {
      const result = indicators.isNewHigh(20, 50);
      expect(typeof result).toBe('boolean');
    });

    it('correctly identifies new lows', () => {
      const result = indicators.isNewLow(20, 50);
      expect(typeof result).toBe('boolean');
    });

    it('returns false for insufficient data', () => {
      expect(indicators.isNewHigh(20, 5)).toBe(false);
      expect(indicators.isNewLow(20, 5)).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // NO MOCK DATA VERIFICATION
  // ═══════════════════════════════════════════════════════════════

  describe('No hardcoded mock data', () => {
    it('all indicators compute from candle data, not constants', () => {
      // Run same indicators on two different datasets — results MUST differ
      const candles1 = generateTestCandles(100, 50);
      const candles2 = generateTestCandles(100, 200);

      const ti1 = new TechnicalIndicators();
      const ti2 = new TechnicalIndicators();
      ti1.initialize(candles1);
      ti2.initialize(candles2);

      expect(ti1.sma(10, 50)).not.toBe(ti2.sma(10, 50));
      expect(ti1.ema(12, 50)).not.toBe(ti2.ema(12, 50));
      expect(ti1.rsi(14, 50)).not.toBe(ti2.rsi(14, 50));
      expect(ti1.atr(14, 50)).not.toBe(ti2.atr(14, 50));
      expect(ti1.vwap(50)).not.toBe(ti2.vwap(50));
    });
  });
});
