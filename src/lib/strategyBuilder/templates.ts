/**
 * Visual Strategy Builder - Pre-built Templates
 * 
 * Ready-to-use strategy configurations that can be loaded into the canvas.
 */

import type { CanvasBlock, PaletteBlock } from './types';

// Source selector config shared by most indicator blocks
const SOURCE_CONFIG = {
  key: 'source', label: 'Source', type: 'select' as const,
  options: [
    { value: 'close', label: 'Close' },
    { value: 'open', label: 'Open' },
    { value: 'high', label: 'High' },
    { value: 'low', label: 'Low' },
    { value: 'hlc3', label: 'HLC/3' },
    { value: 'ohlc4', label: 'OHLC/4' },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// PALETTE BLOCKS (Draggable items)
// ═══════════════════════════════════════════════════════════════════════════════

export const INDICATOR_BLOCKS: PaletteBlock[] = [
  {
    type: 'indicator', subtype: 'RSI', label: 'RSI',
    description: 'Relative Strength Index - measures momentum',
    icon: '📊', color: 'bg-blue-500/20 border-blue-500/50',
    defaultParameters: { period: 14, source: 'close' },
    parameterConfig: [
      { key: 'period', label: 'Period', type: 'number', min: 5, max: 30, step: 1 },
      SOURCE_CONFIG,
    ],
  },
  {
    type: 'indicator', subtype: 'SMA', label: 'SMA',
    description: 'Simple Moving Average',
    icon: '📈', color: 'bg-emerald-500/20 border-emerald-500/50',
    defaultParameters: { period: 20, source: 'close' },
    parameterConfig: [
      { key: 'period', label: 'Period', type: 'number', min: 5, max: 200, step: 5 },
      SOURCE_CONFIG,
    ],
  },
  {
    type: 'indicator', subtype: 'EMA', label: 'EMA',
    description: 'Exponential Moving Average',
    icon: '📉', color: 'bg-teal-500/20 border-teal-500/50',
    defaultParameters: { period: 12, source: 'close' },
    parameterConfig: [
      { key: 'period', label: 'Period', type: 'number', min: 5, max: 200, step: 5 },
      SOURCE_CONFIG,
    ],
  },
  {
    type: 'indicator', subtype: 'WMA', label: 'WMA',
    description: 'Weighted Moving Average',
    icon: '⚖️', color: 'bg-cyan-500/20 border-cyan-500/50',
    defaultParameters: { period: 20, source: 'close' },
    parameterConfig: [
      { key: 'period', label: 'Period', type: 'number', min: 5, max: 200, step: 5 },
      SOURCE_CONFIG,
    ],
  },
  {
    type: 'indicator', subtype: 'HMA', label: 'HMA',
    description: 'Hull Moving Average - reduced lag',
    icon: '🚀', color: 'bg-sky-500/20 border-sky-500/50',
    defaultParameters: { period: 14, source: 'close' },
    parameterConfig: [
      { key: 'period', label: 'Period', type: 'number', min: 5, max: 100, step: 1 },
      SOURCE_CONFIG,
    ],
  },
  {
    type: 'indicator', subtype: 'MACD', label: 'MACD',
    description: 'Moving Average Convergence Divergence',
    icon: '📊', color: 'bg-indigo-500/20 border-indigo-500/50',
    defaultParameters: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, source: 'close' },
    parameterConfig: [
      { key: 'fastPeriod', label: 'Fast', type: 'number', min: 5, max: 30, step: 1 },
      { key: 'slowPeriod', label: 'Slow', type: 'number', min: 10, max: 50, step: 1 },
      { key: 'signalPeriod', label: 'Signal', type: 'number', min: 3, max: 20, step: 1 },
      SOURCE_CONFIG,
    ],
  },
  {
    type: 'indicator', subtype: 'BOLLINGER', label: 'Bollinger',
    description: 'Bollinger Bands - volatility indicator',
    icon: '📏', color: 'bg-violet-500/20 border-violet-500/50',
    defaultParameters: { period: 20, stdDev: 2, source: 'close' },
    parameterConfig: [
      { key: 'period', label: 'Period', type: 'number', min: 10, max: 50, step: 1 },
      { key: 'stdDev', label: 'Std Dev', type: 'number', min: 1, max: 4, step: 0.5 },
      SOURCE_CONFIG,
    ],
  },
  {
    type: 'indicator', subtype: 'STOCHASTIC', label: 'Stochastic',
    description: 'Stochastic Oscillator (%K / %D)',
    icon: '🔄', color: 'bg-fuchsia-500/20 border-fuchsia-500/50',
    defaultParameters: { kPeriod: 14, dPeriod: 3 },
    parameterConfig: [
      { key: 'kPeriod', label: '%K Period', type: 'number', min: 5, max: 30, step: 1 },
      { key: 'dPeriod', label: '%D Period', type: 'number', min: 2, max: 10, step: 1 },
    ],
  },
  {
    type: 'indicator', subtype: 'CCI', label: 'CCI',
    description: 'Commodity Channel Index',
    icon: '〰️', color: 'bg-amber-500/20 border-amber-500/50',
    defaultParameters: { period: 20 },
    parameterConfig: [
      { key: 'period', label: 'Period', type: 'number', min: 10, max: 40, step: 1 },
    ],
  },
  {
    type: 'indicator', subtype: 'MOMENTUM', label: 'Momentum',
    description: 'Price change over N periods',
    icon: '💨', color: 'bg-lime-500/20 border-lime-500/50',
    defaultParameters: { period: 10, source: 'close' },
    parameterConfig: [
      { key: 'period', label: 'Period', type: 'number', min: 1, max: 50, step: 1 },
      SOURCE_CONFIG,
    ],
  },
  {
    type: 'indicator', subtype: 'ADX', label: 'ADX',
    description: 'Average Directional Index - trend strength',
    icon: '📐', color: 'bg-red-500/20 border-red-500/50',
    defaultParameters: { period: 14 },
    parameterConfig: [
      { key: 'period', label: 'Period', type: 'number', min: 7, max: 30, step: 1 },
    ],
  },
  {
    type: 'indicator', subtype: 'SUPERTREND', label: 'Supertrend',
    description: 'Trend-following overlay indicator',
    icon: '⚡', color: 'bg-yellow-500/20 border-yellow-500/50',
    defaultParameters: { period: 10, multiplier: 3 },
    parameterConfig: [
      { key: 'period', label: 'ATR Period', type: 'number', min: 5, max: 30, step: 1 },
      { key: 'multiplier', label: 'Multiplier', type: 'number', min: 1, max: 5, step: 0.5 },
    ],
  },
  {
    type: 'indicator', subtype: 'VWAP', label: 'VWAP',
    description: 'Volume Weighted Average Price',
    icon: '📊', color: 'bg-pink-500/20 border-pink-500/50',
    defaultParameters: {},
    parameterConfig: [],
  },
  {
    type: 'indicator', subtype: 'OBV', label: 'OBV',
    description: 'On-Balance Volume',
    icon: '📶', color: 'bg-green-500/20 border-green-500/50',
    defaultParameters: {},
    parameterConfig: [],
  },
  {
    type: 'indicator', subtype: 'CMF', label: 'CMF',
    description: 'Chaikin Money Flow',
    icon: '💰', color: 'bg-emerald-500/20 border-emerald-500/50',
    defaultParameters: { period: 20 },
    parameterConfig: [
      { key: 'period', label: 'Period', type: 'number', min: 10, max: 40, step: 1 },
    ],
  },
  {
    type: 'indicator', subtype: 'DONCHIAN', label: 'Donchian',
    description: 'Donchian Channels - breakout detection',
    icon: '📐', color: 'bg-orange-500/20 border-orange-500/50',
    defaultParameters: { period: 20 },
    parameterConfig: [
      { key: 'period', label: 'Period', type: 'number', min: 10, max: 50, step: 1 },
    ],
  },
  {
    type: 'indicator', subtype: 'KELTNER', label: 'Keltner',
    description: 'Keltner Channels - EMA ± ATR',
    icon: '📏', color: 'bg-rose-500/20 border-rose-500/50',
    defaultParameters: { emaPeriod: 20, atrPeriod: 10, multiplier: 1.5, source: 'close' },
    parameterConfig: [
      { key: 'emaPeriod', label: 'EMA Period', type: 'number', min: 10, max: 50, step: 1 },
      { key: 'atrPeriod', label: 'ATR Period', type: 'number', min: 5, max: 30, step: 1 },
      { key: 'multiplier', label: 'Multiplier', type: 'number', min: 0.5, max: 3, step: 0.5 },
      SOURCE_CONFIG,
    ],
  },
  {
    type: 'indicator', subtype: 'PARABOLIC_SAR', label: 'Parabolic SAR',
    description: 'Parabolic Stop and Reverse',
    icon: '🔃', color: 'bg-slate-500/20 border-slate-500/50',
    defaultParameters: { step: 0.02, maxStep: 0.2 },
    parameterConfig: [
      { key: 'step', label: 'Step', type: 'number', min: 0.01, max: 0.1, step: 0.01 },
      { key: 'maxStep', label: 'Max Step', type: 'number', min: 0.1, max: 0.5, step: 0.05 },
    ],
  },
  {
    type: 'indicator', subtype: 'VOLUME', label: 'Volume',
    description: 'Trading volume indicator',
    icon: '📊', color: 'bg-purple-500/20 border-purple-500/50',
    defaultParameters: { period: 20 },
    parameterConfig: [
      { key: 'period', label: 'Average Period', type: 'number', min: 5, max: 50, step: 5 },
    ],
  },
  {
    type: 'indicator', subtype: 'GAP_DOWN', label: 'Gap Down',
    description: 'Detects gap down at market open',
    icon: '⬇️', color: 'bg-rose-500/20 border-rose-500/50',
    defaultParameters: { threshold: 2 },
    parameterConfig: [
      { key: 'threshold', label: 'Gap %', type: 'number', min: 1, max: 10, step: 0.5, suffix: '%' },
    ],
  },
  {
    type: 'indicator', subtype: 'CONSECUTIVE_DOWN', label: 'Down Days',
    description: 'Consecutive losing days',
    icon: '📅', color: 'bg-orange-500/20 border-orange-500/50',
    defaultParameters: { days: 3 },
    parameterConfig: [
      { key: 'days', label: 'Days', type: 'number', min: 2, max: 7, step: 1 },
    ],
  },
];

export const CONDITION_BLOCKS: PaletteBlock[] = [
  {
    type: 'condition', subtype: 'LESS_THAN', label: '< Less Than',
    description: 'Value is less than threshold',
    icon: '<', color: 'bg-amber-500/20 border-amber-500/50',
    defaultParameters: { value: 30 },
    parameterConfig: [
      { key: 'value', label: 'Value', type: 'number', min: 0, max: 100, step: 5 },
    ],
  },
  {
    type: 'condition', subtype: 'GREATER_THAN', label: '> Greater Than',
    description: 'Value is greater than threshold',
    icon: '>', color: 'bg-amber-500/20 border-amber-500/50',
    defaultParameters: { value: 70 },
    parameterConfig: [
      { key: 'value', label: 'Value', type: 'number', min: 0, max: 100, step: 5 },
    ],
  },
  {
    type: 'condition', subtype: 'CROSSES_ABOVE', label: 'Crosses Above',
    description: 'Value crosses above another',
    icon: '↗', color: 'bg-emerald-500/20 border-emerald-500/50',
    defaultParameters: {},
  },
  {
    type: 'condition', subtype: 'CROSSES_BELOW', label: 'Crosses Below',
    description: 'Value crosses below another',
    icon: '↘', color: 'bg-rose-500/20 border-rose-500/50',
    defaultParameters: {},
  },
  {
    type: 'condition', subtype: 'BETWEEN', label: 'Between',
    description: 'Value is between min and max',
    icon: '↔', color: 'bg-cyan-500/20 border-cyan-500/50',
    defaultParameters: { min: 30, max: 70 },
    parameterConfig: [
      { key: 'min', label: 'Min', type: 'number', min: 0, max: 100, step: 5 },
      { key: 'max', label: 'Max', type: 'number', min: 0, max: 100, step: 5 },
    ],
  },
  {
    type: 'condition', subtype: 'IS_RISING', label: 'Is Rising',
    description: 'Value is increasing over N bars',
    icon: '📈', color: 'bg-green-500/20 border-green-500/50',
    defaultParameters: { bars: 3 },
    parameterConfig: [
      { key: 'bars', label: 'Bars', type: 'number', min: 2, max: 10, step: 1 },
    ],
  },
  {
    type: 'condition', subtype: 'IS_FALLING', label: 'Is Falling',
    description: 'Value is decreasing over N bars',
    icon: '📉', color: 'bg-red-500/20 border-red-500/50',
    defaultParameters: { bars: 3 },
    parameterConfig: [
      { key: 'bars', label: 'Bars', type: 'number', min: 2, max: 10, step: 1 },
    ],
  },
];

export const LOGIC_BLOCKS: PaletteBlock[] = [
  {
    type: 'logic', subtype: 'AND', label: 'AND',
    description: 'All conditions must be true',
    icon: '&', color: 'bg-indigo-500/20 border-indigo-500/50',
    defaultParameters: {},
  },
  {
    type: 'logic', subtype: 'OR', label: 'OR',
    description: 'Any condition can be true',
    icon: '|', color: 'bg-violet-500/20 border-violet-500/50',
    defaultParameters: {},
  },
];

export const EXIT_BLOCKS: PaletteBlock[] = [
  {
    type: 'exit', subtype: 'TAKE_PROFIT', label: 'Take Profit',
    description: 'Exit when profit target reached',
    icon: '💰', color: 'bg-emerald-500/20 border-emerald-500/50',
    defaultParameters: { percent: 5 },
    parameterConfig: [
      { key: 'percent', label: 'Profit %', type: 'number', min: 1, max: 50, step: 1, suffix: '%' },
    ],
  },
  {
    type: 'exit', subtype: 'STOP_LOSS', label: 'Stop Loss',
    description: 'Exit when loss limit reached',
    icon: '🛑', color: 'bg-rose-500/20 border-rose-500/50',
    defaultParameters: { percent: 2 },
    parameterConfig: [
      { key: 'percent', label: 'Loss %', type: 'number', min: 1, max: 20, step: 0.5, suffix: '%' },
    ],
  },
  {
    type: 'exit', subtype: 'TRAILING_STOP', label: 'Trailing Stop',
    description: 'Dynamic stop that follows price up',
    icon: '📈', color: 'bg-amber-500/20 border-amber-500/50',
    defaultParameters: { percent: 3, activationPercent: 0 },
    parameterConfig: [
      { key: 'percent', label: 'Trail Distance', type: 'number', min: 0.5, max: 20, step: 0.5, suffix: '%' },
      { key: 'activationPercent', label: 'Activate After Gain', type: 'number', min: 0, max: 15, step: 0.5, suffix: '%' },
    ],
  },
  {
    type: 'exit', subtype: 'TIME_EXIT', label: 'Time Exit',
    description: 'Exit after N days',
    icon: '⏰', color: 'bg-sky-500/20 border-sky-500/50',
    defaultParameters: { days: 5 },
    parameterConfig: [
      { key: 'days', label: 'Days', type: 'number', min: 1, max: 30, step: 1 },
    ],
  },
];

export const ACTION_BLOCKS: PaletteBlock[] = [
  {
    type: 'action', subtype: 'BUY', label: 'BUY Signal',
    description: 'Enter long position',
    icon: '🟢', color: 'bg-emerald-500/20 border-emerald-500/50',
    defaultParameters: {},
  },
  {
    type: 'action', subtype: 'SELL', label: 'SELL Signal',
    description: 'Exit position',
    icon: '🔴', color: 'bg-rose-500/20 border-rose-500/50',
    defaultParameters: {},
  },
  {
    type: 'action', subtype: 'SHORT', label: 'SHORT Signal',
    description: 'Enter short position',
    icon: '🔻', color: 'bg-orange-500/20 border-orange-500/50',
    defaultParameters: {},
  },
];

export const ALL_PALETTE_BLOCKS = [
  ...INDICATOR_BLOCKS,
  ...CONDITION_BLOCKS,
  ...LOGIC_BLOCKS,
  ...EXIT_BLOCKS,
  ...ACTION_BLOCKS,
];

// ═══════════════════════════════════════════════════════════════════════════════
// PRE-BUILT STRATEGY TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════

export interface StrategyTemplate {
  id: string;
  name: string;
  description: string;
  blocks: CanvasBlock[];
}

export const RSI_BOUNCE_TEMPLATE: StrategyTemplate = {
  id: 'rsi-bounce',
  name: 'RSI Oversold Bounce',
  description: 'Buy when RSI drops below 30, exit on profit target or RSI > 70',
  blocks: [
    { id: 'rsi-1', type: 'indicator', subtype: 'RSI', position: { x: 50, y: 100 }, parameters: { period: 14 }, connections: { inputs: [], outputs: ['cond-1'] } },
    { id: 'cond-1', type: 'condition', subtype: 'LESS_THAN', position: { x: 220, y: 100 }, parameters: { value: 30 }, connections: { inputs: ['rsi-1'], outputs: ['buy-1'] } },
    { id: 'buy-1', type: 'action', subtype: 'BUY', position: { x: 390, y: 100 }, parameters: {}, connections: { inputs: ['cond-1'], outputs: [] } },
    { id: 'tp-1', type: 'exit', subtype: 'TAKE_PROFIT', position: { x: 50, y: 220 }, parameters: { percent: 5 }, connections: { inputs: [], outputs: [] } },
    { id: 'sl-1', type: 'exit', subtype: 'STOP_LOSS', position: { x: 220, y: 220 }, parameters: { percent: 2 }, connections: { inputs: [], outputs: [] } },
  ],
};

export const MA_CROSSOVER_TEMPLATE: StrategyTemplate = {
  id: 'ma-crossover',
  name: 'Moving Average Crossover',
  description: 'Buy when fast MA crosses above slow MA (Golden Cross)',
  blocks: [
    { id: 'ema-1', type: 'indicator', subtype: 'EMA', position: { x: 50, y: 80 }, parameters: { period: 10 }, connections: { inputs: [], outputs: ['cross-1'] } },
    { id: 'sma-1', type: 'indicator', subtype: 'SMA', position: { x: 50, y: 180 }, parameters: { period: 50 }, connections: { inputs: [], outputs: ['cross-1'] } },
    { id: 'cross-1', type: 'condition', subtype: 'CROSSES_ABOVE', position: { x: 220, y: 130 }, parameters: {}, connections: { inputs: ['ema-1', 'sma-1'], outputs: ['buy-1'] } },
    { id: 'buy-1', type: 'action', subtype: 'BUY', position: { x: 390, y: 130 }, parameters: {}, connections: { inputs: ['cross-1'], outputs: [] } },
    { id: 'sl-1', type: 'exit', subtype: 'STOP_LOSS', position: { x: 50, y: 280 }, parameters: { percent: 3 }, connections: { inputs: [], outputs: [] } },
  ],
};

export const GAP_FILL_TEMPLATE: StrategyTemplate = {
  id: 'gap-fill',
  name: 'Gap Fill Strategy',
  description: 'Buy on gap down > 2%, exit when gap fills',
  blocks: [
    { id: 'gap-1', type: 'indicator', subtype: 'GAP_DOWN', position: { x: 50, y: 100 }, parameters: { threshold: 2 }, connections: { inputs: [], outputs: ['buy-1'] } },
    { id: 'buy-1', type: 'action', subtype: 'BUY', position: { x: 220, y: 100 }, parameters: {}, connections: { inputs: ['gap-1'], outputs: [] } },
    { id: 'tp-1', type: 'exit', subtype: 'TAKE_PROFIT', position: { x: 50, y: 220 }, parameters: { percent: 3 }, connections: { inputs: [], outputs: [] } },
    { id: 'sl-1', type: 'exit', subtype: 'STOP_LOSS', position: { x: 220, y: 220 }, parameters: { percent: 1.5 }, connections: { inputs: [], outputs: [] } },
  ],
};

export const CONSECUTIVE_DAYS_TEMPLATE: StrategyTemplate = {
  id: 'consecutive-days',
  name: 'Consecutive Days Reversal',
  description: 'Buy after 3 down days, hold for 5 days',
  blocks: [
    { id: 'consec-1', type: 'indicator', subtype: 'CONSECUTIVE_DOWN', position: { x: 50, y: 100 }, parameters: { days: 3 }, connections: { inputs: [], outputs: ['buy-1'] } },
    { id: 'buy-1', type: 'action', subtype: 'BUY', position: { x: 220, y: 100 }, parameters: {}, connections: { inputs: ['consec-1'], outputs: [] } },
    { id: 'time-1', type: 'exit', subtype: 'TIME_EXIT', position: { x: 50, y: 220 }, parameters: { days: 5 }, connections: { inputs: [], outputs: [] } },
    { id: 'sl-1', type: 'exit', subtype: 'STOP_LOSS', position: { x: 220, y: 220 }, parameters: { percent: 3 }, connections: { inputs: [], outputs: [] } },
  ],
};

export const MACD_DIVERGENCE_TEMPLATE: StrategyTemplate = {
  id: 'macd-divergence',
  name: 'MACD Signal Cross',
  description: 'Buy when MACD crosses above signal line',
  blocks: [
    { id: 'macd-1', type: 'indicator', subtype: 'MACD', position: { x: 50, y: 100 }, parameters: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 }, connections: { inputs: [], outputs: ['cross-1'] } },
    { id: 'cross-1', type: 'condition', subtype: 'CROSSES_ABOVE', position: { x: 220, y: 100 }, parameters: {}, connections: { inputs: ['macd-1'], outputs: ['buy-1'] } },
    { id: 'buy-1', type: 'action', subtype: 'BUY', position: { x: 390, y: 100 }, parameters: {}, connections: { inputs: ['cross-1'], outputs: [] } },
    { id: 'tp-1', type: 'exit', subtype: 'TAKE_PROFIT', position: { x: 50, y: 220 }, parameters: { percent: 6 }, connections: { inputs: [], outputs: [] } },
    { id: 'sl-1', type: 'exit', subtype: 'STOP_LOSS', position: { x: 220, y: 220 }, parameters: { percent: 3 }, connections: { inputs: [], outputs: [] } },
  ],
};

export const SUPERTREND_TEMPLATE: StrategyTemplate = {
  id: 'supertrend-follow',
  name: 'Supertrend Follow',
  description: 'Buy on Supertrend flip to bullish, ride with trailing stop',
  blocks: [
    { id: 'st-1', type: 'indicator', subtype: 'SUPERTREND', position: { x: 50, y: 100 }, parameters: { period: 10, multiplier: 3 }, connections: { inputs: [], outputs: ['cross-1'] } },
    { id: 'cross-1', type: 'condition', subtype: 'CROSSES_ABOVE', position: { x: 220, y: 100 }, parameters: {}, connections: { inputs: ['st-1'], outputs: ['buy-1'] } },
    { id: 'buy-1', type: 'action', subtype: 'BUY', position: { x: 390, y: 100 }, parameters: {}, connections: { inputs: ['cross-1'], outputs: [] } },
    { id: 'sl-1', type: 'exit', subtype: 'STOP_LOSS', position: { x: 50, y: 220 }, parameters: { percent: 5 }, connections: { inputs: [], outputs: [] } },
  ],
};

export const BOLLINGER_SQUEEZE_TEMPLATE: StrategyTemplate = {
  id: 'bollinger-squeeze',
  name: 'Bollinger Squeeze',
  description: 'Buy at lower Bollinger Band, exit at upper band',
  blocks: [
    { id: 'bb-1', type: 'indicator', subtype: 'BOLLINGER', position: { x: 50, y: 100 }, parameters: { period: 20, stdDev: 2 }, connections: { inputs: [], outputs: ['cond-1'] } },
    { id: 'cond-1', type: 'condition', subtype: 'LESS_THAN', position: { x: 220, y: 100 }, parameters: { value: 0 }, connections: { inputs: ['bb-1'], outputs: ['buy-1'] } },
    { id: 'buy-1', type: 'action', subtype: 'BUY', position: { x: 390, y: 100 }, parameters: {}, connections: { inputs: ['cond-1'], outputs: [] } },
    { id: 'time-1', type: 'exit', subtype: 'TIME_EXIT', position: { x: 50, y: 220 }, parameters: { days: 10 }, connections: { inputs: [], outputs: [] } },
    { id: 'sl-1', type: 'exit', subtype: 'STOP_LOSS', position: { x: 220, y: 220 }, parameters: { percent: 3 }, connections: { inputs: [], outputs: [] } },
  ],
};

export const STRATEGY_TEMPLATES: StrategyTemplate[] = [
  RSI_BOUNCE_TEMPLATE,
  MA_CROSSOVER_TEMPLATE,
  GAP_FILL_TEMPLATE,
  CONSECUTIVE_DAYS_TEMPLATE,
  MACD_DIVERGENCE_TEMPLATE,
  SUPERTREND_TEMPLATE,
  BOLLINGER_SQUEEZE_TEMPLATE,
];

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: Get palette block by subtype
// ═══════════════════════════════════════════════════════════════════════════════

export function getPaletteBlock(subtype: string): PaletteBlock | undefined {
  return ALL_PALETTE_BLOCKS.find(b => b.subtype === subtype);
}
