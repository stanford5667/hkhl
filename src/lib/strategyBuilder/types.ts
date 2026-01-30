/**
 * Visual Strategy Builder - Type Definitions
 * 
 * Types for the drag-and-drop strategy builder that exports
 * parameters to the existing StrategyBacktester component.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// BLOCK TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type BlockType = 'indicator' | 'condition' | 'logic' | 'exit' | 'action';

export type IndicatorSubtype = 'RSI' | 'SMA' | 'EMA' | 'MACD' | 'VOLUME' | 'BOLLINGER' | 'GAP_DOWN' | 'CONSECUTIVE_DOWN';
export type ConditionSubtype = 'LESS_THAN' | 'GREATER_THAN' | 'CROSSES_ABOVE' | 'CROSSES_BELOW' | 'EQUALS';
export type LogicSubtype = 'AND' | 'OR';
export type ExitSubtype = 'TAKE_PROFIT' | 'STOP_LOSS' | 'TIME_EXIT';
export type ActionSubtype = 'BUY' | 'SELL';

export type BlockSubtype = IndicatorSubtype | ConditionSubtype | LogicSubtype | ExitSubtype | ActionSubtype;

// ═══════════════════════════════════════════════════════════════════════════════
// CANVAS BLOCK (Dropped on canvas)
// ═══════════════════════════════════════════════════════════════════════════════

export interface CanvasBlock {
  id: string;
  type: BlockType;
  subtype: BlockSubtype;
  position: { x: number; y: number };
  parameters: Record<string, number | string>;
  connections: {
    inputs: string[];  // IDs of blocks connecting INTO this one
    outputs: string[]; // IDs of blocks this connects TO
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONNECTION
// ═══════════════════════════════════════════════════════════════════════════════

export interface Connection {
  id: string;
  fromBlockId: string;
  fromPort: 'output';
  toBlockId: string;
  toPort: 'input';
}

// ═══════════════════════════════════════════════════════════════════════════════
// BUILDER STATE
// ═══════════════════════════════════════════════════════════════════════════════

export interface BuilderState {
  blocks: CanvasBlock[];
  connections: Connection[];
  selectedBlockId: string | null;
  strategyName: string;
  ticker: string;
  isDirty: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PALETTE BLOCK (Template for dragging)
// ═══════════════════════════════════════════════════════════════════════════════

export interface PaletteBlock {
  type: BlockType;
  subtype: BlockSubtype;
  label: string;
  description: string;
  icon: string;
  color: string;
  defaultParameters: Record<string, number | string>;
  parameterConfig?: ParameterConfig[];
}

export interface ParameterConfig {
  key: string;
  label: string;
  type: 'number' | 'select';
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  options?: { value: string | number; label: string }[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERIALIZED OUTPUT (For existing backtest)
// ═══════════════════════════════════════════════════════════════════════════════

export type StrategyType = 'rsi' | 'ma-crossover' | 'gap-fill' | 'consecutive-days' | 'visual-custom';

export interface VisualStrategyOutput {
  strategy: StrategyType;
  ticker: string;
  params: {
    // RSI parameters
    rsiPeriod?: number;
    rsiOversold?: number;
    rsiOverbought?: number;
    // MA parameters
    fastMaPeriod?: number;
    slowMaPeriod?: number;
    // Gap parameters
    gapThreshold?: number;
    // Consecutive days parameters
    consecutiveDays?: number;
    holdingPeriod?: number;
    // Risk management (always available)
    stopLossPercent?: number;
    takeProfitPercent?: number;
  };
  // For display in builder
  summary: {
    entryCondition: string;
    exitCondition: string;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONNECTION VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface ConnectionRule {
  fromType: BlockType;
  toTypes: BlockType[];
}

export const CONNECTION_RULES: ConnectionRule[] = [
  { fromType: 'indicator', toTypes: ['condition'] },
  { fromType: 'condition', toTypes: ['logic', 'action'] },
  { fromType: 'logic', toTypes: ['action'] },
  // Exit blocks don't connect - they're standalone
];

export function canConnect(fromBlock: CanvasBlock, toBlock: CanvasBlock): boolean {
  // Exits don't connect to anything
  if (fromBlock.type === 'exit' || toBlock.type === 'exit') return false;
  
  // Actions can't connect to anything (they're terminals)
  if (fromBlock.type === 'action') return false;
  
  const rule = CONNECTION_RULES.find(r => r.fromType === fromBlock.type);
  if (!rule) return false;
  
  return rule.toTypes.includes(toBlock.type);
}
