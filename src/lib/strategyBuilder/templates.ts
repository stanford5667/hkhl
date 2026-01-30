/**
 * Visual Strategy Builder - Pre-built Templates
 * 
 * Ready-to-use strategy configurations that can be loaded into the canvas.
 */

import type { CanvasBlock, PaletteBlock } from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// PALETTE BLOCKS (Draggable items)
// ═══════════════════════════════════════════════════════════════════════════════

export const INDICATOR_BLOCKS: PaletteBlock[] = [
  {
    type: 'indicator',
    subtype: 'RSI',
    label: 'RSI',
    description: 'Relative Strength Index - measures momentum',
    icon: '📊',
    color: 'bg-blue-500/20 border-blue-500/50',
    defaultParameters: { period: 14 },
    parameterConfig: [
      { key: 'period', label: 'Period', type: 'number', min: 5, max: 30, step: 1 },
    ],
  },
  {
    type: 'indicator',
    subtype: 'SMA',
    label: 'SMA',
    description: 'Simple Moving Average',
    icon: '📈',
    color: 'bg-emerald-500/20 border-emerald-500/50',
    defaultParameters: { period: 20 },
    parameterConfig: [
      { key: 'period', label: 'Period', type: 'number', min: 5, max: 200, step: 5 },
    ],
  },
  {
    type: 'indicator',
    subtype: 'EMA',
    label: 'EMA',
    description: 'Exponential Moving Average',
    icon: '📉',
    color: 'bg-teal-500/20 border-teal-500/50',
    defaultParameters: { period: 12 },
    parameterConfig: [
      { key: 'period', label: 'Period', type: 'number', min: 5, max: 200, step: 5 },
    ],
  },
  {
    type: 'indicator',
    subtype: 'VOLUME',
    label: 'Volume',
    description: 'Trading volume indicator',
    icon: '📊',
    color: 'bg-purple-500/20 border-purple-500/50',
    defaultParameters: { period: 20 },
    parameterConfig: [
      { key: 'period', label: 'Average Period', type: 'number', min: 5, max: 50, step: 5 },
    ],
  },
  {
    type: 'indicator',
    subtype: 'GAP_DOWN',
    label: 'Gap Down',
    description: 'Detects gap down at market open',
    icon: '⬇️',
    color: 'bg-rose-500/20 border-rose-500/50',
    defaultParameters: { threshold: 2 },
    parameterConfig: [
      { key: 'threshold', label: 'Gap %', type: 'number', min: 1, max: 10, step: 0.5, suffix: '%' },
    ],
  },
  {
    type: 'indicator',
    subtype: 'CONSECUTIVE_DOWN',
    label: 'Down Days',
    description: 'Consecutive losing days',
    icon: '📅',
    color: 'bg-orange-500/20 border-orange-500/50',
    defaultParameters: { days: 3 },
    parameterConfig: [
      { key: 'days', label: 'Days', type: 'number', min: 2, max: 7, step: 1 },
    ],
  },
];

export const CONDITION_BLOCKS: PaletteBlock[] = [
  {
    type: 'condition',
    subtype: 'LESS_THAN',
    label: '< Less Than',
    description: 'Value is less than threshold',
    icon: '<',
    color: 'bg-amber-500/20 border-amber-500/50',
    defaultParameters: { value: 30 },
    parameterConfig: [
      { key: 'value', label: 'Value', type: 'number', min: 0, max: 100, step: 5 },
    ],
  },
  {
    type: 'condition',
    subtype: 'GREATER_THAN',
    label: '> Greater Than',
    description: 'Value is greater than threshold',
    icon: '>',
    color: 'bg-amber-500/20 border-amber-500/50',
    defaultParameters: { value: 70 },
    parameterConfig: [
      { key: 'value', label: 'Value', type: 'number', min: 0, max: 100, step: 5 },
    ],
  },
  {
    type: 'condition',
    subtype: 'CROSSES_ABOVE',
    label: 'Crosses Above',
    description: 'Value crosses above another',
    icon: '↗',
    color: 'bg-emerald-500/20 border-emerald-500/50',
    defaultParameters: {},
  },
  {
    type: 'condition',
    subtype: 'CROSSES_BELOW',
    label: 'Crosses Below',
    description: 'Value crosses below another',
    icon: '↘',
    color: 'bg-rose-500/20 border-rose-500/50',
    defaultParameters: {},
  },
];

export const LOGIC_BLOCKS: PaletteBlock[] = [
  {
    type: 'logic',
    subtype: 'AND',
    label: 'AND',
    description: 'All conditions must be true',
    icon: '&',
    color: 'bg-indigo-500/20 border-indigo-500/50',
    defaultParameters: {},
  },
  {
    type: 'logic',
    subtype: 'OR',
    label: 'OR',
    description: 'Any condition can be true',
    icon: '|',
    color: 'bg-violet-500/20 border-violet-500/50',
    defaultParameters: {},
  },
];

export const EXIT_BLOCKS: PaletteBlock[] = [
  {
    type: 'exit',
    subtype: 'TAKE_PROFIT',
    label: 'Take Profit',
    description: 'Exit when profit target reached',
    icon: '💰',
    color: 'bg-emerald-500/20 border-emerald-500/50',
    defaultParameters: { percent: 5 },
    parameterConfig: [
      { key: 'percent', label: 'Profit %', type: 'number', min: 1, max: 50, step: 1, suffix: '%' },
    ],
  },
  {
    type: 'exit',
    subtype: 'STOP_LOSS',
    label: 'Stop Loss',
    description: 'Exit when loss limit reached',
    icon: '🛑',
    color: 'bg-rose-500/20 border-rose-500/50',
    defaultParameters: { percent: 2 },
    parameterConfig: [
      { key: 'percent', label: 'Loss %', type: 'number', min: 1, max: 20, step: 0.5, suffix: '%' },
    ],
  },
  {
    type: 'exit',
    subtype: 'TIME_EXIT',
    label: 'Time Exit',
    description: 'Exit after N days',
    icon: '⏰',
    color: 'bg-sky-500/20 border-sky-500/50',
    defaultParameters: { days: 5 },
    parameterConfig: [
      { key: 'days', label: 'Days', type: 'number', min: 1, max: 30, step: 1 },
    ],
  },
];

export const ACTION_BLOCKS: PaletteBlock[] = [
  {
    type: 'action',
    subtype: 'BUY',
    label: 'BUY Signal',
    description: 'Enter long position',
    icon: '🟢',
    color: 'bg-emerald-500/20 border-emerald-500/50',
    defaultParameters: {},
  },
  {
    type: 'action',
    subtype: 'SELL',
    label: 'SELL Signal',
    description: 'Exit position',
    icon: '🔴',
    color: 'bg-rose-500/20 border-rose-500/50',
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
    {
      id: 'rsi-1',
      type: 'indicator',
      subtype: 'RSI',
      position: { x: 50, y: 100 },
      parameters: { period: 14 },
      connections: { inputs: [], outputs: ['cond-1'] },
    },
    {
      id: 'cond-1',
      type: 'condition',
      subtype: 'LESS_THAN',
      position: { x: 220, y: 100 },
      parameters: { value: 30 },
      connections: { inputs: ['rsi-1'], outputs: ['buy-1'] },
    },
    {
      id: 'buy-1',
      type: 'action',
      subtype: 'BUY',
      position: { x: 390, y: 100 },
      parameters: {},
      connections: { inputs: ['cond-1'], outputs: [] },
    },
    {
      id: 'tp-1',
      type: 'exit',
      subtype: 'TAKE_PROFIT',
      position: { x: 50, y: 220 },
      parameters: { percent: 5 },
      connections: { inputs: [], outputs: [] },
    },
    {
      id: 'sl-1',
      type: 'exit',
      subtype: 'STOP_LOSS',
      position: { x: 220, y: 220 },
      parameters: { percent: 2 },
      connections: { inputs: [], outputs: [] },
    },
  ],
};

export const MA_CROSSOVER_TEMPLATE: StrategyTemplate = {
  id: 'ma-crossover',
  name: 'Moving Average Crossover',
  description: 'Buy when fast MA crosses above slow MA (Golden Cross)',
  blocks: [
    {
      id: 'ema-1',
      type: 'indicator',
      subtype: 'EMA',
      position: { x: 50, y: 80 },
      parameters: { period: 10 },
      connections: { inputs: [], outputs: ['cross-1'] },
    },
    {
      id: 'sma-1',
      type: 'indicator',
      subtype: 'SMA',
      position: { x: 50, y: 180 },
      parameters: { period: 50 },
      connections: { inputs: [], outputs: ['cross-1'] },
    },
    {
      id: 'cross-1',
      type: 'condition',
      subtype: 'CROSSES_ABOVE',
      position: { x: 220, y: 130 },
      parameters: {},
      connections: { inputs: ['ema-1', 'sma-1'], outputs: ['buy-1'] },
    },
    {
      id: 'buy-1',
      type: 'action',
      subtype: 'BUY',
      position: { x: 390, y: 130 },
      parameters: {},
      connections: { inputs: ['cross-1'], outputs: [] },
    },
    {
      id: 'sl-1',
      type: 'exit',
      subtype: 'STOP_LOSS',
      position: { x: 50, y: 280 },
      parameters: { percent: 3 },
      connections: { inputs: [], outputs: [] },
    },
  ],
};

export const GAP_FILL_TEMPLATE: StrategyTemplate = {
  id: 'gap-fill',
  name: 'Gap Fill Strategy',
  description: 'Buy on gap down > 2%, exit when gap fills',
  blocks: [
    {
      id: 'gap-1',
      type: 'indicator',
      subtype: 'GAP_DOWN',
      position: { x: 50, y: 100 },
      parameters: { threshold: 2 },
      connections: { inputs: [], outputs: ['buy-1'] },
    },
    {
      id: 'buy-1',
      type: 'action',
      subtype: 'BUY',
      position: { x: 220, y: 100 },
      parameters: {},
      connections: { inputs: ['gap-1'], outputs: [] },
    },
    {
      id: 'tp-1',
      type: 'exit',
      subtype: 'TAKE_PROFIT',
      position: { x: 50, y: 220 },
      parameters: { percent: 3 },
      connections: { inputs: [], outputs: [] },
    },
    {
      id: 'sl-1',
      type: 'exit',
      subtype: 'STOP_LOSS',
      position: { x: 220, y: 220 },
      parameters: { percent: 1.5 },
      connections: { inputs: [], outputs: [] },
    },
  ],
};

export const CONSECUTIVE_DAYS_TEMPLATE: StrategyTemplate = {
  id: 'consecutive-days',
  name: 'Consecutive Days Reversal',
  description: 'Buy after 3 down days, hold for 5 days',
  blocks: [
    {
      id: 'consec-1',
      type: 'indicator',
      subtype: 'CONSECUTIVE_DOWN',
      position: { x: 50, y: 100 },
      parameters: { days: 3 },
      connections: { inputs: [], outputs: ['buy-1'] },
    },
    {
      id: 'buy-1',
      type: 'action',
      subtype: 'BUY',
      position: { x: 220, y: 100 },
      parameters: {},
      connections: { inputs: ['consec-1'], outputs: [] },
    },
    {
      id: 'time-1',
      type: 'exit',
      subtype: 'TIME_EXIT',
      position: { x: 50, y: 220 },
      parameters: { days: 5 },
      connections: { inputs: [], outputs: [] },
    },
    {
      id: 'sl-1',
      type: 'exit',
      subtype: 'STOP_LOSS',
      position: { x: 220, y: 220 },
      parameters: { percent: 3 },
      connections: { inputs: [], outputs: [] },
    },
  ],
};

export const STRATEGY_TEMPLATES: StrategyTemplate[] = [
  RSI_BOUNCE_TEMPLATE,
  MA_CROSSOVER_TEMPLATE,
  GAP_FILL_TEMPLATE,
  CONSECUTIVE_DAYS_TEMPLATE,
];

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: Get palette block by subtype
// ═══════════════════════════════════════════════════════════════════════════════

export function getPaletteBlock(subtype: string): PaletteBlock | undefined {
  return ALL_PALETTE_BLOCKS.find(b => b.subtype === subtype);
}
