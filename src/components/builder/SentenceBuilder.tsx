/**
 * Sentence Builder Component
 * 
 * Supports multiple entry signals and exit rules connected with AND/OR logic.
 */

import { memo, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ChevronDown, X, Check, Plus, ArrowRight, Settings2, Lock, Crown } from 'lucide-react';
import { useUsage } from '@/contexts/UsageContext';
import { useUpgrade } from '@/hooks/useUpgrade';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  EXIT_BLOCKS,
} from '@/lib/strategyBuilder/templates';
import type { PaletteBlock, BlockSubtype } from '@/lib/strategyBuilder/types';

export interface BacktestParams {
  strategy: string;
  ticker: string;
  params: Record<string, number | string | undefined>;
}

export interface SelectedSignal {
  preset: SignalPreset;
  parameters: Record<string, number>;
}

export interface SelectedExit {
  block: PaletteBlock;
  parameters: Record<string, number>;
}

export type LogicOperator = 'AND' | 'OR';

export interface SentenceBuilderState {
  entrySignals: SelectedSignal[];
  entryLogic: LogicOperator;
  exitRules: SelectedExit[];
  exitLogic: LogicOperator;
}

interface SentenceBuilderProps {
  onAddBlock: (subtype: BlockSubtype, parameters?: Record<string, number>) => void;
  onComplete?: () => void;
  onRunBacktest?: (params: BacktestParams) => void;
  onClear?: () => void;
  ticker?: string;
  className?: string;
  // Controlled state for persistence
  state?: SentenceBuilderState;
  onStateChange?: (state: SentenceBuilderState) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRADING SIGNAL PRESETS - How traders actually think
// ═══════════════════════════════════════════════════════════════════════════════

interface SignalPreset {
  id: string;
  label: string;
  description: string;
  icon: string;
  category: 'momentum' | 'trend' | 'pattern' | 'oscillator' | 'fundamental';
  indicator: BlockSubtype;
  condition: BlockSubtype;
  premium?: boolean;
  parameters: {
    period?: number;
    threshold?: number;
    days?: number;
  };
  parameterConfig: {
    key: string;
    label: string;
    min: number;
    max: number;
    step: number;
    suffix?: string;
  }[];
}

// Free signals: rsi-oversold, price-above-sma, price-below-sma, consecutive-down, gap-down
const FREE_SIGNAL_IDS = new Set(['rsi-oversold', 'price-above-sma', 'price-below-sma', 'consecutive-down', 'gap-down']);

const SIGNAL_PRESETS: SignalPreset[] = [
  {
    id: 'rsi-oversold',
    label: 'RSI Oversold',
    description: 'RSI drops below threshold (typically 30)',
    icon: '📉',
    category: 'momentum',
    indicator: 'RSI',
    condition: 'LESS_THAN',
    parameters: { period: 14, threshold: 30 },
    parameterConfig: [
      { key: 'period', label: 'RSI Period', min: 5, max: 30, step: 1 },
      { key: 'threshold', label: 'Below', min: 10, max: 50, step: 5 },
    ],
  },
  {
    id: 'rsi-overbought',
    label: 'RSI Overbought',
    description: 'RSI rises above threshold (typically 70)',
    icon: '📈',
    category: 'momentum',
    indicator: 'RSI',
    condition: 'GREATER_THAN',
    parameters: { period: 14, threshold: 70 },
    parameterConfig: [
      { key: 'period', label: 'RSI Period', min: 5, max: 30, step: 1 },
      { key: 'threshold', label: 'Above', min: 50, max: 90, step: 5 },
    ],
  },
  {
    id: 'macd-bullish',
    label: 'MACD Bullish Cross',
    description: 'MACD histogram crosses above zero',
    icon: '🔼',
    category: 'oscillator',
    indicator: 'EMA',
    condition: 'CROSSES_ABOVE',
    parameters: { period: 12 },
    parameterConfig: [
      { key: 'period', label: 'Fast EMA', min: 5, max: 26, step: 1 },
    ],
  },
  {
    id: 'macd-bearish',
    label: 'MACD Bearish Cross',
    description: 'MACD histogram crosses below zero',
    icon: '🔽',
    category: 'oscillator',
    indicator: 'EMA',
    condition: 'CROSSES_BELOW',
    parameters: { period: 12 },
    parameterConfig: [
      { key: 'period', label: 'Fast EMA', min: 5, max: 26, step: 1 },
    ],
  },
  {
    id: 'bollinger-lower',
    label: 'Bollinger Lower Touch',
    description: 'Price touches lower Bollinger Band',
    icon: '⬇️',
    category: 'oscillator',
    indicator: 'SMA',
    condition: 'LESS_THAN',
    parameters: { period: 20, threshold: 2 },
    parameterConfig: [
      { key: 'period', label: 'BB Period', min: 10, max: 50, step: 5 },
      { key: 'threshold', label: 'Std Dev', min: 1, max: 3, step: 0.5 },
    ],
  },
  {
    id: 'bollinger-upper',
    label: 'Bollinger Upper Touch',
    description: 'Price touches upper Bollinger Band',
    icon: '⬆️',
    category: 'oscillator',
    indicator: 'SMA',
    condition: 'GREATER_THAN',
    parameters: { period: 20, threshold: 2 },
    parameterConfig: [
      { key: 'period', label: 'BB Period', min: 10, max: 50, step: 5 },
      { key: 'threshold', label: 'Std Dev', min: 1, max: 3, step: 0.5 },
    ],
  },
  {
    id: 'stochastic-oversold',
    label: 'Stochastic Oversold',
    description: 'Stochastic %K drops below 20',
    icon: '📊',
    category: 'oscillator',
    indicator: 'RSI',
    condition: 'LESS_THAN',
    parameters: { period: 14, threshold: 20 },
    parameterConfig: [
      { key: 'period', label: 'Stoch Period', min: 5, max: 21, step: 1 },
      { key: 'threshold', label: 'Below', min: 10, max: 30, step: 5 },
    ],
  },
  {
    id: 'price-above-sma',
    label: 'Price Above SMA',
    description: 'Price crosses above moving average',
    icon: '↗️',
    category: 'trend',
    indicator: 'SMA',
    condition: 'CROSSES_ABOVE',
    parameters: { period: 50 },
    parameterConfig: [
      { key: 'period', label: 'SMA Period', min: 10, max: 200, step: 10 },
    ],
  },
  {
    id: 'price-below-sma',
    label: 'Price Below SMA',
    description: 'Price crosses below moving average',
    icon: '↘️',
    category: 'trend',
    indicator: 'SMA',
    condition: 'CROSSES_BELOW',
    parameters: { period: 50 },
    parameterConfig: [
      { key: 'period', label: 'SMA Period', min: 10, max: 200, step: 10 },
    ],
  },
  {
    id: 'ema-crossover',
    label: 'EMA Crossover',
    description: 'Fast EMA crosses above slow EMA',
    icon: '⚡',
    category: 'trend',
    indicator: 'EMA',
    condition: 'CROSSES_ABOVE',
    parameters: { period: 12 },
    parameterConfig: [
      { key: 'period', label: 'Fast EMA', min: 5, max: 50, step: 1 },
    ],
  },
  {
    id: 'gap-down',
    label: 'Gap Down',
    description: 'Stock gaps down at open',
    icon: '⬇️',
    category: 'pattern',
    indicator: 'GAP_DOWN',
    condition: 'GREATER_THAN',
    parameters: { threshold: 2 },
    parameterConfig: [
      { key: 'threshold', label: 'Gap %', min: 1, max: 10, step: 0.5, suffix: '%' },
    ],
  },
  {
    id: 'consecutive-down',
    label: 'Down Days',
    description: 'Multiple consecutive losing days',
    icon: '📅',
    category: 'pattern',
    indicator: 'CONSECUTIVE_DOWN',
    condition: 'GREATER_THAN',
    parameters: { days: 3 },
    parameterConfig: [
      { key: 'days', label: 'Down Days', min: 2, max: 7, step: 1 },
    ],
  },
  {
    id: 'volume-spike',
    label: 'Volume Spike',
    description: 'Volume exceeds moving average',
    icon: '📊',
    category: 'pattern',
    indicator: 'VOLUME',
    condition: 'GREATER_THAN',
    parameters: { period: 20, threshold: 150 },
    parameterConfig: [
      { key: 'period', label: 'Avg Period', min: 5, max: 50, step: 5 },
      { key: 'threshold', label: '% of Avg', min: 100, max: 300, step: 25, suffix: '%' },
    ],
  },
  // ── Quant Study Signals ──
  {
    id: 'drawdown-recovery',
    label: 'Drawdown Recovery',
    description: 'Buy after price drops X% from recent high',
    icon: '📉',
    category: 'pattern',
    indicator: 'RSI',
    condition: 'LESS_THAN',
    parameters: { threshold: 10, period: 20 },
    parameterConfig: [
      { key: 'threshold', label: 'Drawdown %', min: 3, max: 30, step: 1, suffix: '%' },
      { key: 'period', label: 'Lookback', min: 10, max: 60, step: 5 },
    ],
  },
  {
    id: 'mean-reversion',
    label: 'Mean Reversion',
    description: 'Buy when price is far below its moving average',
    icon: '🔄',
    category: 'momentum',
    indicator: 'SMA',
    condition: 'LESS_THAN',
    parameters: { period: 20, threshold: 2 },
    parameterConfig: [
      { key: 'period', label: 'MA Period', min: 10, max: 50, step: 5 },
      { key: 'threshold', label: 'Std Devs Below', min: 1, max: 3, step: 0.5 },
    ],
  },
  {
    id: 'volatility-squeeze',
    label: 'Volatility Squeeze',
    description: 'Bollinger Bands narrow — breakout expected',
    icon: '🔋',
    category: 'pattern',
    indicator: 'SMA',
    condition: 'LESS_THAN',
    parameters: { period: 20, threshold: 1 },
    parameterConfig: [
      { key: 'period', label: 'BB Period', min: 10, max: 50, step: 5 },
      { key: 'threshold', label: 'Bandwidth <', min: 0.5, max: 3, step: 0.25 },
    ],
  },
  {
    id: 'consecutive-up',
    label: 'Up Days Streak',
    description: 'Multiple consecutive gaining days (contrarian short)',
    icon: '🔺',
    category: 'pattern',
    indicator: 'CONSECUTIVE_DOWN',
    condition: 'GREATER_THAN',
    parameters: { days: 4 },
    parameterConfig: [
      { key: 'days', label: 'Up Days', min: 2, max: 7, step: 1 },
    ],
  },
  {
    id: 'oversold-bounce',
    label: 'Oversold Bounce',
    description: 'RSI exits oversold territory (crosses above 30)',
    icon: '🚀',
    category: 'momentum',
    indicator: 'RSI',
    condition: 'CROSSES_ABOVE',
    parameters: { period: 14, threshold: 30 },
    parameterConfig: [
      { key: 'period', label: 'RSI Period', min: 5, max: 30, step: 1 },
      { key: 'threshold', label: 'Crosses Above', min: 20, max: 40, step: 5 },
    ],
  },
  {
    id: 'gap-up',
    label: 'Gap Up',
    description: 'Stock gaps up at open',
    icon: '⬆️',
    category: 'pattern',
    indicator: 'GAP_DOWN',
    condition: 'GREATER_THAN',
    parameters: { threshold: 2 },
    parameterConfig: [
      { key: 'threshold', label: 'Gap %', min: 1, max: 10, step: 0.5, suffix: '%' },
    ],
  },
  // ── Fundamental / Earnings Signals ──
  {
    id: 'earnings-beat-buy',
    label: 'Buy Before Earnings',
    description: 'Enter N days before earnings if beat rate is high',
    icon: '📊',
    category: 'fundamental',
    indicator: 'RSI',
    condition: 'GREATER_THAN',
    parameters: { threshold: 60, period: 5 },
    parameterConfig: [
      { key: 'period', label: 'Days Before', min: 1, max: 10, step: 1 },
      { key: 'threshold', label: 'Min Beat Rate', min: 50, max: 100, step: 5, suffix: '%' },
    ],
  },
  {
    id: 'post-earnings-drift',
    label: 'Post-Earnings Drift',
    description: 'Buy after an earnings beat, ride the drift',
    icon: '🚀',
    category: 'fundamental',
    indicator: 'RSI',
    condition: 'GREATER_THAN',
    parameters: { threshold: 5, period: 10 },
    parameterConfig: [
      { key: 'threshold', label: 'Min Surprise %', min: 1, max: 20, step: 1, suffix: '%' },
      { key: 'period', label: 'Hold Days', min: 5, max: 30, step: 1 },
    ],
  },
  {
    id: 'earnings-miss-short',
    label: 'Sell After Miss',
    description: 'Sell after a significant earnings miss',
    icon: '📉',
    category: 'fundamental',
    indicator: 'RSI',
    condition: 'LESS_THAN',
    parameters: { threshold: -5, period: 10 },
    parameterConfig: [
      { key: 'threshold', label: 'Max Surprise %', min: -20, max: -1, step: 1, suffix: '%' },
      { key: 'period', label: 'Hold Days', min: 5, max: 30, step: 1 },
    ],
  },
  {
    id: 'pre-earnings-run',
    label: 'Pre-Earnings Run',
    description: 'Buy N days before earnings, sell day before',
    icon: '⏰',
    category: 'fundamental',
    indicator: 'RSI',
    condition: 'GREATER_THAN',
    parameters: { period: 10 },
    parameterConfig: [
      { key: 'period', label: 'Days Before', min: 5, max: 20, step: 1 },
    ],
  },
];

// Types moved to top for export

// ═══════════════════════════════════════════════════════════════════════════════
// LOGIC TOGGLE BUTTON
// ═══════════════════════════════════════════════════════════════════════════════

const LogicToggle = memo(function LogicToggle({
  value,
  onChange,
}: {
  value: LogicOperator;
  onChange: (op: LogicOperator) => void;
}) {
  return (
    <div className="flex items-center justify-center py-2">
      <div className="inline-flex items-center bg-muted rounded-full p-0.5 gap-0.5">
        <button
          onClick={() => onChange('AND')}
          className={cn(
            "px-4 py-1.5 rounded-full text-xs font-bold transition-all",
            value === 'AND' 
              ? "bg-primary text-primary-foreground shadow-sm" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          AND
        </button>
        <button
          onClick={() => onChange('OR')}
          className={cn(
            "px-4 py-1.5 rounded-full text-xs font-bold transition-all",
            value === 'OR' 
              ? "bg-primary text-primary-foreground shadow-sm" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          OR
        </button>
      </div>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLE SIGNAL CARD WITH INLINE PARAMS
// ═══════════════════════════════════════════════════════════════════════════════

const SignalCard = memo(function SignalCard({
  signal,
  onRemove,
  onParamsChange,
}: {
  signal: SelectedSignal;
  onRemove: () => void;
  onParamsChange: (params: Record<string, number>) => void;
}) {
  const getDisplayValue = () => {
    const parts: string[] = [];
    signal.preset.parameterConfig.forEach(config => {
      const val = signal.parameters[config.key];
      if (val !== undefined) {
        parts.push(`${val}${config.suffix || ''}`);
      }
    });
    return parts.join(', ');
  };

  return (
    <div className="border rounded-lg bg-card shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/30">
        <span className="text-xl">{signal.preset.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">{signal.preset.label}</div>
          <div className="text-xs text-muted-foreground font-mono">{getDisplayValue()}</div>
        </div>
        <button
          onClick={onRemove}
          className="p-1.5 rounded-full hover:bg-destructive/20 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      
      {signal.preset.parameterConfig.length > 0 && (
        <div className="px-3 py-2 space-y-2 border-t">
          {signal.preset.parameterConfig.map((config) => (
            <div key={config.key} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{config.label}</span>
                <span className="font-mono font-semibold text-foreground">
                  {signal.parameters[config.key] ?? config.min}
                  {config.suffix || ''}
                </span>
              </div>
              <Slider
                value={[signal.parameters[config.key] ?? config.min]}
                min={config.min}
                max={config.max}
                step={config.step}
                onValueChange={([value]) => onParamsChange({ ...signal.parameters, [config.key]: value })}
                className="w-full"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// EXIT CARD WITH INLINE PARAMS
// ═══════════════════════════════════════════════════════════════════════════════

const ExitCard = memo(function ExitCard({
  exit,
  onRemove,
  onParamsChange,
}: {
  exit: SelectedExit;
  onRemove: () => void;
  onParamsChange: (params: Record<string, number>) => void;
}) {
  return (
    <div className={cn("border rounded-lg bg-card shadow-sm overflow-hidden", exit.block.color)}>
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/30">
        <span className="text-lg">{exit.block.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">{exit.block.label}</div>
        </div>
        <button
          onClick={onRemove}
          className="p-1.5 rounded-full hover:bg-destructive/20 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      
      {exit.block.parameterConfig && exit.block.parameterConfig.length > 0 && (
        <div className="px-3 py-2 space-y-2 border-t">
          {exit.block.parameterConfig.map((config) => (
            <div key={config.key} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{config.label}</span>
                <span className="font-mono font-semibold">
                  {exit.parameters[config.key] ?? (exit.block.defaultParameters?.[config.key] as number) ?? config.min}
                  {config.suffix || ''}
                </span>
              </div>
              <Slider
                value={[exit.parameters[config.key] ?? (exit.block.defaultParameters?.[config.key] as number) ?? config.min]}
                min={config.min}
                max={config.max}
                step={config.step}
                onValueChange={([value]) => onParamsChange({ ...exit.parameters, [config.key]: value })}
                className="w-full"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// SIGNAL ADD BUTTON (Popover)
// ═══════════════════════════════════════════════════════════════════════════════

const SignalAddButton = memo(function SignalAddButton({
  onSelect,
  selectedIds,
  isRequired,
}: {
  onSelect: (preset: SignalPreset) => void;
  selectedIds: string[];
  isRequired: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { isPro } = useUsage();
  const { promptUpgrade } = useUpgrade();

  const categories = [
    { id: 'momentum', label: 'Momentum' },
    { id: 'oscillator', label: 'Oscillator' },
    { id: 'trend', label: 'Trend' },
    { id: 'pattern', label: 'Pattern' },
    { id: 'fundamental', label: 'Fundamental' },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 border-dashed transition-all",
            "hover:border-primary hover:bg-primary/5",
            "focus:outline-none focus:ring-2 focus:ring-primary/50",
            isRequired && "border-destructive/50 animate-pulse"
          )}
        >
          <Plus className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {selectedIds.length === 0 ? 'Add Signal' : 'Add Another'}
          </span>
          {isRequired && <span className="text-destructive text-xs">*</span>}
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="start">
        <div className="text-xs font-medium text-muted-foreground mb-3">
          Choose entry signal
        </div>
        <div className="space-y-4 max-h-72 overflow-auto">
          {categories.map(cat => (
            <div key={cat.id}>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {cat.label}
              </div>
              <div className="space-y-1">
                {SIGNAL_PRESETS.filter(p => p.category === cat.id).map(preset => {
                  const isAlreadyAdded = selectedIds.includes(preset.id);
                  const isLocked = !isPro && !FREE_SIGNAL_IDS.has(preset.id);
                  return (
                    <button
                      key={preset.id}
                      onClick={() => {
                        if (isLocked) {
                          promptUpgrade('strategy-signals');
                          setOpen(false);
                          return;
                        }
                        if (!isAlreadyAdded) {
                          onSelect(preset);
                          setOpen(false);
                        }
                      }}
                      disabled={isAlreadyAdded}
                      className={cn(
                        "flex items-center gap-3 w-full px-3 py-2 rounded-md text-left transition-colors",
                        isAlreadyAdded ? "opacity-40 cursor-not-allowed" : "hover:bg-muted",
                        isLocked && !isAlreadyAdded && "opacity-70"
                      )}
                    >
                      <span className="text-xl">{preset.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm flex items-center gap-1.5">
                          {preset.label}
                          {isLocked && <Lock className="h-3 w-3 text-amber-400 flex-shrink-0" />}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{preset.description}</div>
                      </div>
                      {isAlreadyAdded && <Check className="h-4 w-4 text-muted-foreground" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        {!isPro && (
          <div className="mt-3 pt-3 border-t border-border">
            <button
              onClick={() => {
                promptUpgrade('strategy-signals');
                setOpen(false);
              }}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-left hover:bg-amber-500/10 transition-colors"
            >
              <Crown className="h-4 w-4 text-amber-400" />
              <div className="flex-1">
                <div className="font-medium text-sm text-amber-400">Unlock All Signals</div>
                <div className="text-xs text-muted-foreground">20+ indicators & strategies</div>
              </div>
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// EXIT ADD BUTTON (Popover)
// ═══════════════════════════════════════════════════════════════════════════════

const ExitAddButton = memo(function ExitAddButton({
  onSelect,
  selectedSubtypes,
  isRequired,
}: {
  onSelect: (block: PaletteBlock) => void;
  selectedSubtypes: string[];
  isRequired: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 border-dashed transition-all",
            "hover:border-primary hover:bg-primary/5",
            "focus:outline-none focus:ring-2 focus:ring-primary/50",
            isRequired && "border-destructive/50 animate-pulse"
          )}
        >
          <Plus className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {selectedSubtypes.length === 0 ? 'Add Exit Rule' : 'Add Another'}
          </span>
          {isRequired && <span className="text-destructive text-xs">*</span>}
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div className="text-xs font-medium text-muted-foreground mb-2 px-1">
          Select Exit Rule
        </div>
        <div className="grid gap-1 max-h-48 overflow-auto">
          {EXIT_BLOCKS.map((block) => {
            const isAlreadyAdded = selectedSubtypes.includes(block.subtype);
            return (
              <button
                key={block.subtype}
                onClick={() => {
                  if (!isAlreadyAdded) {
                    onSelect(block);
                    setOpen(false);
                  }
                }}
                disabled={isAlreadyAdded}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-left transition-colors",
                  isAlreadyAdded ? "opacity-40 cursor-not-allowed" : "hover:bg-muted",
                  block.color
                )}
              >
                <span className="text-lg">{block.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{block.label}</div>
                  <div className="text-xs text-muted-foreground">{block.description}</div>
                </div>
                {isAlreadyAdded && <Check className="h-4 w-4 text-muted-foreground" />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SENTENCE BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

export const SentenceBuilder = memo(function SentenceBuilder({
  onAddBlock,
  onComplete,
  onRunBacktest,
  onClear,
  ticker = 'AAPL',
  className,
  state,
  onStateChange,
}: SentenceBuilderProps) {
  // Use controlled state if provided, otherwise fall back to local state
  const [localEntrySignals, setLocalEntrySignals] = useState<SelectedSignal[]>([]);
  const [localEntryLogic, setLocalEntryLogic] = useState<LogicOperator>('AND');
  const [localExitRules, setLocalExitRules] = useState<SelectedExit[]>([]);
  const [localExitLogic, setLocalExitLogic] = useState<LogicOperator>('OR');
  
  // Controlled vs uncontrolled pattern
  const isControlled = state !== undefined && onStateChange !== undefined;
  
  const entrySignals = isControlled ? state.entrySignals : localEntrySignals;
  const entryLogic = isControlled ? state.entryLogic : localEntryLogic;
  const exitRules = isControlled ? state.exitRules : localExitRules;
  const exitLogic = isControlled ? state.exitLogic : localExitLogic;
  
  const setEntrySignals = useCallback((updater: SelectedSignal[] | ((prev: SelectedSignal[]) => SelectedSignal[])) => {
    if (isControlled) {
      const newValue = typeof updater === 'function' ? updater(state.entrySignals) : updater;
      onStateChange({ ...state, entrySignals: newValue });
    } else {
      setLocalEntrySignals(updater);
    }
  }, [isControlled, state, onStateChange]);
  
  const setEntryLogic = useCallback((value: LogicOperator) => {
    if (isControlled) {
      onStateChange({ ...state, entryLogic: value });
    } else {
      setLocalEntryLogic(value);
    }
  }, [isControlled, state, onStateChange]);
  
  const setExitRules = useCallback((updater: SelectedExit[] | ((prev: SelectedExit[]) => SelectedExit[])) => {
    if (isControlled) {
      const newValue = typeof updater === 'function' ? updater(state.exitRules) : updater;
      onStateChange({ ...state, exitRules: newValue });
    } else {
      setLocalExitRules(updater);
    }
  }, [isControlled, state, onStateChange]);
  
  const setExitLogic = useCallback((value: LogicOperator) => {
    if (isControlled) {
      onStateChange({ ...state, exitLogic: value });
    } else {
      setLocalExitLogic(value);
    }
  }, [isControlled, state, onStateChange]);

  // State tracking
  const entryComplete = entrySignals.length > 0;
  const exitComplete = exitRules.length > 0;
  const activeSection = !entryComplete ? 'entry' : !exitComplete ? 'exit' : 'complete';
  const isComplete = entryComplete && exitComplete;
  const hasAnySelection = entrySignals.length > 0 || exitRules.length > 0;

  const handleAddSignal = (preset: SignalPreset) => {
    setEntrySignals(prev => [...prev, {
      preset,
      parameters: { ...preset.parameters },
    }]);
  };

  const handleRemoveSignal = (index: number) => {
    setEntrySignals(prev => prev.filter((_, i) => i !== index));
  };

  const handleSignalParamsChange = (index: number, params: Record<string, number>) => {
    setEntrySignals(prev => prev.map((s, i) => 
      i === index ? { ...s, parameters: params } : s
    ));
  };

  const handleAddExit = (block: PaletteBlock) => {
    setExitRules(prev => [...prev, { 
      block, 
      parameters: { ...block.defaultParameters } as Record<string, number> 
    }]);
  };

  const handleRemoveExit = (index: number) => {
    setExitRules(prev => prev.filter((_, i) => i !== index));
  };

  const handleExitParamsChange = (index: number, params: Record<string, number>) => {
    setExitRules(prev => prev.map((e, i) => 
      i === index ? { ...e, parameters: params } : e
    ));
  };

  const handleRunBacktest = useCallback(() => {
    if (entrySignals.length === 0 || exitRules.length === 0) return;
    
    // Build strategy params from the sentence builder state
    const firstSignal = entrySignals[0];
    const stopLoss = exitRules.find(e => e.block.subtype === 'STOP_LOSS');
    const takeProfit = exitRules.find(e => e.block.subtype === 'TAKE_PROFIT');
    const timeExit = exitRules.find(e => e.block.subtype === 'TIME_EXIT');
    
    // Determine strategy type based on signal
    // IMPORTANT: These IDs must match what the `strategy-backtest` backend function supports.
    let strategy = 'rsi';
    const params: Record<string, number | string | undefined> = {};
    
    switch (firstSignal.preset.id) {
      case 'rsi-oversold':
        strategy = 'rsi';
        params.rsiPeriod = firstSignal.parameters.period;
        params.rsiOversold = firstSignal.parameters.threshold;
        params.rsiOverbought = 70;
        break;
      case 'rsi-overbought':
        strategy = 'rsi';
        params.rsiPeriod = firstSignal.parameters.period;
        params.rsiOversold = 30;
        params.rsiOverbought = firstSignal.parameters.threshold;
        break;
      case 'macd-bullish':
        strategy = 'macd';
        params.fastMaPeriod = firstSignal.parameters.period;
        params.slowMaPeriod = 26;
        params.direction = 'bullish';
        break;
      case 'macd-bearish':
        strategy = 'macd';
        params.fastMaPeriod = firstSignal.parameters.period;
        params.slowMaPeriod = 26;
        params.direction = 'bearish';
        break;
      case 'bollinger-lower':
        strategy = 'bollinger';
        params.bbPeriod = firstSignal.parameters.period;
        params.bbStdDev = firstSignal.parameters.threshold;
        params.direction = 'lower';
        break;
      case 'bollinger-upper':
        strategy = 'bollinger';
        params.bbPeriod = firstSignal.parameters.period;
        params.bbStdDev = firstSignal.parameters.threshold;
        params.direction = 'upper';
        break;
      case 'stochastic-oversold':
        strategy = 'stochastic';
        params.stochPeriod = firstSignal.parameters.period;
        params.stochOversold = firstSignal.parameters.threshold;
        params.stochOverbought = 80;
        break;
      case 'price-above-sma':
      case 'price-below-sma':
        strategy = 'ma-crossover';
        params.fastMaPeriod = firstSignal.parameters.period;
        params.slowMaPeriod = Math.max(20, firstSignal.parameters.period * 5);
        break;
      case 'ema-crossover':
        strategy = 'ma-crossover';
        params.fastMaPeriod = firstSignal.parameters.period;
        params.slowMaPeriod = Math.max(20, firstSignal.parameters.period * 5);
        break;
      case 'gap-down':
        strategy = 'gap-fill';
        params.gapThreshold = firstSignal.parameters.threshold;
        break;
      case 'consecutive-down':
        strategy = 'consecutive-days';
        params.consecutiveDays = firstSignal.parameters.days;
        params.holdingPeriod = 5;
        break;
      case 'volume-spike':
        strategy = 'ma-crossover';
        params.fastMaPeriod = Math.max(5, Math.round(firstSignal.parameters.period / 2));
        params.slowMaPeriod = Math.max(20, firstSignal.parameters.period);
        break;
      case 'drawdown-recovery':
        strategy = 'drawdown-recovery';
        params.drawdownPeriod = firstSignal.parameters.period;
        params.drawdownThreshold = firstSignal.parameters.threshold;
        break;
      case 'mean-reversion':
        strategy = 'mean-reversion';
        params.bbPeriod = firstSignal.parameters.period;
        params.deviationThreshold = firstSignal.parameters.threshold;
        break;
      case 'volatility-squeeze':
        strategy = 'volatility-squeeze';
        params.squeezePeriod = firstSignal.parameters.period;
        params.squeezeLookback = firstSignal.parameters.period * 6;
        params.bbPeriod = firstSignal.parameters.period;
        break;
      case 'consecutive-up':
        strategy = 'consecutive-days';
        params.consecutiveDays = firstSignal.parameters.days;
        params.holdingPeriod = 5;
        params.direction = 'up';
        break;
      case 'oversold-bounce':
        strategy = 'rsi';
        params.rsiPeriod = firstSignal.parameters.period;
        params.rsiOversold = firstSignal.parameters.threshold;
        params.rsiOverbought = 70;
        break;
      case 'gap-up':
        strategy = 'gap-fill';
        params.gapThreshold = firstSignal.parameters.threshold;
        params.direction = 'up';
        break;
      case 'earnings-beat-buy':
        strategy = 'earnings-beat-buy';
        params.daysBefore = firstSignal.parameters.period;
        params.minBeatRate = firstSignal.parameters.threshold;
        break;
      case 'post-earnings-drift':
        strategy = 'post-earnings-drift';
        params.minSurprise = firstSignal.parameters.threshold;
        params.holdingPeriod = firstSignal.parameters.period;
        break;
      case 'earnings-miss-short':
        strategy = 'earnings-miss-short';
        params.maxSurprise = firstSignal.parameters.threshold;
        params.holdingPeriod = firstSignal.parameters.period;
        break;
      case 'pre-earnings-run':
        strategy = 'pre-earnings-run';
        params.daysBefore = firstSignal.parameters.period;
        break;
      default:
        strategy = 'rsi';
        params.rsiPeriod = 14;
        params.rsiOversold = 30;
        params.rsiOverbought = 70;
        break;
    }
    
    // Add exit params
    if (stopLoss) {
      params.stopLoss = stopLoss.parameters.percent;
    }
    if (takeProfit) {
      params.takeProfit = takeProfit.parameters.percent;
    }
    if (timeExit) {
      params.holdingPeriod = timeExit.parameters.days;
    }
    
    const trailingStop = exitRules.find(e => e.block.subtype === 'TRAILING_STOP');
    if (trailingStop) {
      params.trailingStopPercent = trailingStop.parameters.percent;
      if (trailingStop.parameters.activationPercent > 0) {
        params.trailingStopActivation = 'after-profit';
        params.trailingStopActivationPercent = trailingStop.parameters.activationPercent;
      }
    }
    
    // Call onRunBacktest if provided
    if (onRunBacktest) {
      onRunBacktest({
        strategy,
        ticker,
        params,
      });
      return;
    }
    
    // Fallback: add blocks to canvas and call onComplete
    entrySignals.forEach((signal, idx) => {
      const indicatorParams: Record<string, number> = {};
      const conditionParams: Record<string, number> = {};
      
      signal.preset.parameterConfig.forEach(config => {
        const value = signal.parameters[config.key];
        if (value !== undefined) {
          if (config.key === 'period' || config.key === 'days') {
            indicatorParams[config.key] = value;
          } else if (config.key === 'threshold') {
            conditionParams['value'] = value;
          }
        }
      });

      onAddBlock(signal.preset.indicator, indicatorParams);
      onAddBlock(signal.preset.condition, conditionParams);
      
      if (idx < entrySignals.length - 1) {
        onAddBlock(entryLogic, {});
      }
    });
    
    onAddBlock('BUY', {});
    
    exitRules.forEach((exit, idx) => {
      onAddBlock(exit.block.subtype, exit.parameters);
      if (idx < exitRules.length - 1) {
        onAddBlock(exitLogic, {});
      }
    });
    
    onComplete?.();
  }, [entrySignals, entryLogic, exitRules, exitLogic, onAddBlock, onComplete, onRunBacktest, ticker]);

  const handleClear = () => {
    setEntrySignals([]);
    setExitRules([]);
    onClear?.();
  };

  return (
    <div className={cn("p-4 space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Build Your Trading Strategy</h3>
        {hasAnySelection && (
          <Button variant="ghost" size="sm" onClick={handleClear} className="h-7 text-xs">
            Clear all
          </Button>
        )}
      </div>

      {/* ENTRY SIGNALS SECTION */}
      <div className={cn(
        "p-4 rounded-lg border-2 transition-all",
        activeSection === 'entry' ? "border-primary bg-primary/5" : entryComplete ? "border-emerald-500/50 bg-emerald-500/5" : "border-border"
      )}>
        <div className="flex items-center gap-2 mb-3">
          <div className={cn(
            "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
            entryComplete ? "bg-emerald-500 text-white" : "bg-primary text-primary-foreground"
          )}>
            {entryComplete ? '✓' : '1'}
          </div>
          <span className="font-semibold text-sm">Entry Signals</span>
          <span className="text-xs text-muted-foreground">— When should we buy?</span>
        </div>
        
        <div className="space-y-2">
          {entrySignals.map((signal, idx) => (
            <div key={`${signal.preset.id}-${idx}`}>
              <SignalCard
                signal={signal}
                onRemove={() => handleRemoveSignal(idx)}
                onParamsChange={(params) => handleSignalParamsChange(idx, params)}
              />
              {idx < entrySignals.length - 1 && (
                <LogicToggle value={entryLogic} onChange={setEntryLogic} />
              )}
            </div>
          ))}
          
          <SignalAddButton
            onSelect={handleAddSignal}
            selectedIds={entrySignals.map(s => s.preset.id)}
            isRequired={entrySignals.length === 0}
          />
        </div>
      </div>

      {/* Arrow between sections */}
      <div className="flex justify-center">
        <ArrowRight className={cn(
          "h-4 w-4 rotate-90",
          entryComplete ? "text-primary" : "text-muted-foreground/30"
        )} />
      </div>

      {/* EXIT RULES SECTION */}
      <div className={cn(
        "p-4 rounded-lg border-2 transition-all",
        activeSection === 'exit' ? "border-primary bg-primary/5" : exitComplete ? "border-emerald-500/50 bg-emerald-500/5" : "border-border",
        !entryComplete && "opacity-50 pointer-events-none"
      )}>
        <div className="flex items-center gap-2 mb-3">
          <div className={cn(
            "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
            exitComplete ? "bg-emerald-500 text-white" : entryComplete ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          )}>
            {exitComplete ? '✓' : '2'}
          </div>
          <span className="font-semibold text-sm">Exit Rules</span>
          <span className="text-xs text-destructive">(Required)</span>
        </div>
        
        <div className="space-y-2">
          {exitRules.map((exit, idx) => (
            <div key={`${exit.block.subtype}-${idx}`}>
              <ExitCard
                exit={exit}
                onRemove={() => handleRemoveExit(idx)}
                onParamsChange={(params) => handleExitParamsChange(idx, params)}
              />
              {idx < exitRules.length - 1 && (
                <LogicToggle value={exitLogic} onChange={setExitLogic} />
              )}
            </div>
          ))}
          
          <ExitAddButton
            onSelect={handleAddExit}
            selectedSubtypes={exitRules.map(e => e.block.subtype)}
            isRequired={exitRules.length === 0}
          />
        </div>
      </div>

      {/* RUN BACKTEST BUTTON */}
      <Button
        onClick={handleRunBacktest}
        disabled={!isComplete}
        className={cn(
          "w-full h-12 text-base font-semibold transition-all",
          isComplete && "bg-gradient-to-r from-primary to-primary/80 shadow-lg"
        )}
      >
        {entrySignals.length === 0 ? 'Select Entry Signal' : 
         exitRules.length === 0 ? 'Add Exit Rules' : 
         '🚀 Run Backtest'}
      </Button>
    </div>
  );
});
