/**
 * Technical Indicators Library
 * Calculations for all supported chart indicators
 */

import { OHLCVData, IndicatorDefinition, IndicatorType } from '@/types/charting';

// Indicator Definitions Registry
export const INDICATOR_DEFINITIONS: Record<IndicatorType, IndicatorDefinition> = {
  // Trend Indicators
  sma: {
    type: 'sma',
    name: 'Simple Moving Average',
    shortName: 'SMA',
    description: 'Average of closing prices over a specified period',
    category: 'trend',
    overlay: true,
    defaultParams: { length: 20 },
    paramLabels: { length: 'Period' },
    defaultColors: ['#2196F3'],
  },
  ema: {
    type: 'ema',
    name: 'Exponential Moving Average',
    shortName: 'EMA',
    description: 'Weighted average giving more importance to recent prices',
    category: 'trend',
    overlay: true,
    defaultParams: { length: 20 },
    paramLabels: { length: 'Period' },
    defaultColors: ['#FF9800'],
  },
  wma: {
    type: 'wma',
    name: 'Weighted Moving Average',
    shortName: 'WMA',
    description: 'Linearly weighted average of prices',
    category: 'trend',
    overlay: true,
    defaultParams: { length: 20 },
    paramLabels: { length: 'Period' },
    defaultColors: ['#9C27B0'],
  },
  hma: {
    type: 'hma',
    name: 'Hull Moving Average',
    shortName: 'HMA',
    description: 'Responsive moving average with reduced lag',
    category: 'trend',
    overlay: true,
    defaultParams: { length: 20 },
    paramLabels: { length: 'Period' },
    defaultColors: ['#4CAF50'],
  },
  vwma: {
    type: 'vwma',
    name: 'Volume Weighted Moving Average',
    shortName: 'VWMA',
    description: 'Moving average weighted by volume',
    category: 'trend',
    overlay: true,
    defaultParams: { length: 20 },
    paramLabels: { length: 'Period' },
    defaultColors: ['#00BCD4'],
  },
  dema: {
    type: 'dema',
    name: 'Double Exponential Moving Average',
    shortName: 'DEMA',
    description: 'EMA of EMA for reduced lag',
    category: 'trend',
    overlay: true,
    defaultParams: { length: 20 },
    paramLabels: { length: 'Period' },
    defaultColors: ['#E91E63'],
  },
  tema: {
    type: 'tema',
    name: 'Triple Exponential Moving Average',
    shortName: 'TEMA',
    description: 'EMA of EMA of EMA for minimal lag',
    category: 'trend',
    overlay: true,
    defaultParams: { length: 20 },
    paramLabels: { length: 'Period' },
    defaultColors: ['#673AB7'],
  },

  // Oscillators
  rsi: {
    type: 'rsi',
    name: 'Relative Strength Index',
    shortName: 'RSI',
    description: 'Momentum oscillator measuring speed of price changes',
    category: 'oscillator',
    overlay: false,
    defaultParams: { length: 14, overbought: 70, oversold: 30 },
    paramLabels: { length: 'Period', overbought: 'Overbought', oversold: 'Oversold' },
    defaultColors: ['#7C4DFF', '#FF5252', '#69F0AE'],
  },
  macd: {
    type: 'macd',
    name: 'Moving Average Convergence Divergence',
    shortName: 'MACD',
    description: 'Trend-following momentum indicator',
    category: 'oscillator',
    overlay: false,
    defaultParams: { fast: 12, slow: 26, signal: 9 },
    paramLabels: { fast: 'Fast', slow: 'Slow', signal: 'Signal' },
    defaultColors: ['#2196F3', '#FF9800', '#4CAF50'],
  },
  stochastic: {
    type: 'stochastic',
    name: 'Stochastic Oscillator',
    shortName: 'STOCH',
    description: 'Momentum comparing closing price to price range',
    category: 'oscillator',
    overlay: false,
    defaultParams: { k: 14, d: 3, smooth: 3 },
    paramLabels: { k: '%K Period', d: '%D Period', smooth: 'Smooth' },
    defaultColors: ['#2196F3', '#FF9800'],
  },
  'williams-r': {
    type: 'williams-r',
    name: 'Williams %R',
    shortName: 'W%R',
    description: 'Momentum indicator measuring overbought/oversold levels',
    category: 'oscillator',
    overlay: false,
    defaultParams: { length: 14 },
    paramLabels: { length: 'Period' },
    defaultColors: ['#9C27B0'],
  },
  cci: {
    type: 'cci',
    name: 'Commodity Channel Index',
    shortName: 'CCI',
    description: 'Measures price deviation from statistical mean',
    category: 'oscillator',
    overlay: false,
    defaultParams: { length: 20 },
    paramLabels: { length: 'Period' },
    defaultColors: ['#00BCD4'],
  },
  momentum: {
    type: 'momentum',
    name: 'Momentum',
    shortName: 'MOM',
    description: 'Price change over specified period',
    category: 'oscillator',
    overlay: false,
    defaultParams: { length: 10 },
    paramLabels: { length: 'Period' },
    defaultColors: ['#FF5722'],
  },
  roc: {
    type: 'roc',
    name: 'Rate of Change',
    shortName: 'ROC',
    description: 'Percentage change in price over time',
    category: 'oscillator',
    overlay: false,
    defaultParams: { length: 10 },
    paramLabels: { length: 'Period' },
    defaultColors: ['#795548'],
  },

  // Volume Indicators
  volume: {
    type: 'volume',
    name: 'Volume',
    shortName: 'VOL',
    description: 'Trading volume histogram',
    category: 'volume',
    overlay: false,
    defaultParams: { showMA: true, maLength: 20 },
    paramLabels: { showMA: 'Show MA', maLength: 'MA Period' },
    defaultColors: ['#6366f1', '#22c55e', '#ef4444'],
  },
  vwap: {
    type: 'vwap',
    name: 'Volume Weighted Average Price',
    shortName: 'VWAP',
    description: 'Average price weighted by volume (intraday)',
    category: 'volume',
    overlay: true,
    defaultParams: { anchor: 'session' },
    paramLabels: { anchor: 'Anchor' },
    defaultColors: ['#FF6B6B'],
  },
  obv: {
    type: 'obv',
    name: 'On Balance Volume',
    shortName: 'OBV',
    description: 'Cumulative volume based on price direction',
    category: 'volume',
    overlay: false,
    defaultParams: {},
    paramLabels: {},
    defaultColors: ['#4ECDC4'],
  },
  mfi: {
    type: 'mfi',
    name: 'Money Flow Index',
    shortName: 'MFI',
    description: 'Volume-weighted RSI',
    category: 'volume',
    overlay: false,
    defaultParams: { length: 14 },
    paramLabels: { length: 'Period' },
    defaultColors: ['#45B7D1'],
  },
  cmf: {
    type: 'cmf',
    name: 'Chaikin Money Flow',
    shortName: 'CMF',
    description: 'Measures buying/selling pressure',
    category: 'volume',
    overlay: false,
    defaultParams: { length: 20 },
    paramLabels: { length: 'Period' },
    defaultColors: ['#96CEB4'],
  },
  adl: {
    type: 'adl',
    name: 'Accumulation/Distribution Line',
    shortName: 'A/D',
    description: 'Cumulative indicator using volume and price',
    category: 'volume',
    overlay: false,
    defaultParams: {},
    paramLabels: {},
    defaultColors: ['#FFEAA7'],
  },

  // Volatility Indicators
  'bollinger-bands': {
    type: 'bollinger-bands',
    name: 'Bollinger Bands',
    shortName: 'BB',
    description: 'Volatility bands around a moving average',
    category: 'volatility',
    overlay: true,
    defaultParams: { length: 20, stdDev: 2 },
    paramLabels: { length: 'Period', stdDev: 'Std Dev' },
    defaultColors: ['#2196F3', '#2196F380', '#2196F380'],
  },
  atr: {
    type: 'atr',
    name: 'Average True Range',
    shortName: 'ATR',
    description: 'Measures market volatility',
    category: 'volatility',
    overlay: false,
    defaultParams: { length: 14 },
    paramLabels: { length: 'Period' },
    defaultColors: ['#FF6B6B'],
  },
  'keltner-channels': {
    type: 'keltner-channels',
    name: 'Keltner Channels',
    shortName: 'KC',
    description: 'Volatility-based envelope around EMA',
    category: 'volatility',
    overlay: true,
    defaultParams: { length: 20, atrLength: 10, multiplier: 1.5 },
    paramLabels: { length: 'EMA Period', atrLength: 'ATR Period', multiplier: 'Multiplier' },
    defaultColors: ['#9C27B0', '#9C27B080', '#9C27B080'],
  },
  'donchian-channels': {
    type: 'donchian-channels',
    name: 'Donchian Channels',
    shortName: 'DC',
    description: 'Highest high and lowest low over period',
    category: 'volatility',
    overlay: true,
    defaultParams: { length: 20 },
    paramLabels: { length: 'Period' },
    defaultColors: ['#00BCD4', '#00BCD480', '#00BCD480'],
  },
  'std-dev': {
    type: 'std-dev',
    name: 'Standard Deviation',
    shortName: 'STDDEV',
    description: 'Statistical measure of price volatility',
    category: 'volatility',
    overlay: false,
    defaultParams: { length: 20 },
    paramLabels: { length: 'Period' },
    defaultColors: ['#607D8B'],
  },

  // Other Indicators
  ichimoku: {
    type: 'ichimoku',
    name: 'Ichimoku Cloud',
    shortName: 'ICHI',
    description: 'Comprehensive trend and momentum indicator',
    category: 'other',
    overlay: true,
    defaultParams: { tenkan: 9, kijun: 26, senkou: 52 },
    paramLabels: { tenkan: 'Tenkan', kijun: 'Kijun', senkou: 'Senkou' },
    defaultColors: ['#2196F3', '#FF9800', '#4CAF50', '#E91E6340', '#4CAF5040'],
  },
  'pivot-points': {
    type: 'pivot-points',
    name: 'Pivot Points',
    shortName: 'PIVOT',
    description: 'Support and resistance levels based on prior period',
    category: 'other',
    overlay: true,
    defaultParams: { type: 'traditional' },
    paramLabels: { type: 'Type' },
    defaultColors: ['#FF9800', '#4CAF50', '#4CAF50', '#ef4444', '#ef4444'],
  },
  zigzag: {
    type: 'zigzag',
    name: 'ZigZag',
    shortName: 'ZZ',
    description: 'Filters minor price movements to show trends',
    category: 'other',
    overlay: true,
    defaultParams: { deviation: 5, depth: 10 },
    paramLabels: { deviation: 'Deviation %', depth: 'Depth' },
    defaultColors: ['#9C27B0'],
  },
  supertrend: {
    type: 'supertrend',
    name: 'Supertrend',
    shortName: 'ST',
    description: 'Trend-following indicator based on ATR',
    category: 'other',
    overlay: true,
    defaultParams: { length: 10, multiplier: 3 },
    paramLabels: { length: 'ATR Period', multiplier: 'Multiplier' },
    defaultColors: ['#4CAF50', '#ef4444'],
  },
};

// ============ Calculation Functions ============

/**
 * Simple Moving Average
 */
export function calculateSMA(data: number[], length: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < length - 1) {
      result.push(null);
    } else {
      const sum = data.slice(i - length + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push(sum / length);
    }
  }
  return result;
}

/**
 * Exponential Moving Average
 */
export function calculateEMA(data: number[], length: number): (number | null)[] {
  const result: (number | null)[] = [];
  const multiplier = 2 / (length + 1);
  
  for (let i = 0; i < data.length; i++) {
    if (i < length - 1) {
      result.push(null);
    } else if (i === length - 1) {
      // First EMA is SMA
      const sum = data.slice(0, length).reduce((a, b) => a + b, 0);
      result.push(sum / length);
    } else {
      const prevEMA = result[i - 1]!;
      result.push((data[i] - prevEMA) * multiplier + prevEMA);
    }
  }
  return result;
}

/**
 * Relative Strength Index
 */
export function calculateRSI(closes: number[], length: number): (number | null)[] {
  const result: (number | null)[] = [];
  const gains: number[] = [];
  const losses: number[] = [];
  
  // Calculate price changes
  for (let i = 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? -change : 0);
  }
  
  // First value is null
  result.push(null);
  
  for (let i = 0; i < gains.length; i++) {
    if (i < length - 1) {
      result.push(null);
    } else if (i === length - 1) {
      const avgGain = gains.slice(0, length).reduce((a, b) => a + b, 0) / length;
      const avgLoss = losses.slice(0, length).reduce((a, b) => a + b, 0) / length;
      if (avgLoss === 0) {
        result.push(100);
      } else {
        const rs = avgGain / avgLoss;
        result.push(100 - (100 / (1 + rs)));
      }
    } else {
      // Use smoothed averages
      const prevRSI = result[i] as number;
      const prevAvgGain = (100 - prevRSI) === 0 ? gains[i] : 
        ((prevRSI / (100 - prevRSI)) * (length - 1) + gains[i]) / length;
      const avgLoss = ((100 / (100 - prevRSI) - 1) * (length - 1) + losses[i]) / length;
      
      if (avgLoss === 0) {
        result.push(100);
      } else {
        const rs = prevAvgGain / avgLoss;
        result.push(100 - (100 / (1 + rs)));
      }
    }
  }
  
  return result;
}

/**
 * MACD
 */
export function calculateMACD(
  closes: number[],
  fastLength: number,
  slowLength: number,
  signalLength: number
): { macd: (number | null)[]; signal: (number | null)[]; histogram: (number | null)[] } {
  const fastEMA = calculateEMA(closes, fastLength);
  const slowEMA = calculateEMA(closes, slowLength);
  
  const macd: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (fastEMA[i] === null || slowEMA[i] === null) {
      macd.push(null);
    } else {
      macd.push(fastEMA[i]! - slowEMA[i]!);
    }
  }
  
  // Calculate signal line
  const macdValues = macd.filter((v): v is number => v !== null);
  const signalEMA = calculateEMA(macdValues, signalLength);
  
  const signal: (number | null)[] = [];
  const histogram: (number | null)[] = [];
  let signalIdx = 0;
  
  for (let i = 0; i < macd.length; i++) {
    if (macd[i] === null) {
      signal.push(null);
      histogram.push(null);
    } else {
      const signalVal = signalEMA[signalIdx];
      signal.push(signalVal);
      histogram.push(signalVal !== null ? macd[i]! - signalVal : null);
      signalIdx++;
    }
  }
  
  return { macd, signal, histogram };
}

/**
 * Bollinger Bands
 */
export function calculateBollingerBands(
  closes: number[],
  length: number,
  stdDev: number
): { upper: (number | null)[]; middle: (number | null)[]; lower: (number | null)[] } {
  const middle = calculateSMA(closes, length);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];
  
  for (let i = 0; i < closes.length; i++) {
    if (i < length - 1 || middle[i] === null) {
      upper.push(null);
      lower.push(null);
    } else {
      const slice = closes.slice(i - length + 1, i + 1);
      const mean = middle[i]!;
      const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / length;
      const std = Math.sqrt(variance);
      upper.push(mean + stdDev * std);
      lower.push(mean - stdDev * std);
    }
  }
  
  return { upper, middle, lower };
}

/**
 * Average True Range
 */
export function calculateATR(data: OHLCVData[], length: number): (number | null)[] {
  const trueRanges: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      trueRanges.push(data[i].high - data[i].low);
    } else {
      const high = data[i].high;
      const low = data[i].low;
      const prevClose = data[i - 1].close;
      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );
      trueRanges.push(tr);
    }
  }
  
  return calculateEMA(trueRanges, length);
}

/**
 * Stochastic Oscillator
 */
export function calculateStochastic(
  data: OHLCVData[],
  kLength: number,
  dLength: number,
  smooth: number
): { k: (number | null)[]; d: (number | null)[] } {
  const rawK: (number | null)[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < kLength - 1) {
      rawK.push(null);
    } else {
      const slice = data.slice(i - kLength + 1, i + 1);
      const highestHigh = Math.max(...slice.map(d => d.high));
      const lowestLow = Math.min(...slice.map(d => d.low));
      const range = highestHigh - lowestLow;
      if (range === 0) {
        rawK.push(50);
      } else {
        rawK.push(((data[i].close - lowestLow) / range) * 100);
      }
    }
  }
  
  // Smooth %K
  const kValues = rawK.filter((v): v is number => v !== null);
  const smoothedK = smooth > 1 ? calculateSMA(kValues, smooth) : kValues;
  
  // Calculate %D
  const dValues = calculateSMA(smoothedK.filter((v): v is number => v !== null), dLength);
  
  // Reconstruct arrays with nulls
  const k: (number | null)[] = [];
  const d: (number | null)[] = [];
  let kIdx = 0;
  let dIdx = 0;
  
  for (let i = 0; i < data.length; i++) {
    if (rawK[i] === null) {
      k.push(null);
      d.push(null);
    } else {
      k.push(smoothedK[kIdx] ?? null);
      d.push(dValues[dIdx] ?? null);
      kIdx++;
      if (smoothedK[kIdx - 1] !== null) dIdx++;
    }
  }
  
  return { k, d };
}

/**
 * Get list of indicators by category
 */
export function getIndicatorsByCategory(category: IndicatorDefinition['category']): IndicatorDefinition[] {
  return Object.values(INDICATOR_DEFINITIONS).filter(ind => ind.category === category);
}

/**
 * Search indicators by name
 */
export function searchIndicators(query: string): IndicatorDefinition[] {
  const lowerQuery = query.toLowerCase();
  return Object.values(INDICATOR_DEFINITIONS).filter(
    ind => 
      ind.name.toLowerCase().includes(lowerQuery) ||
      ind.shortName.toLowerCase().includes(lowerQuery)
  );
}
