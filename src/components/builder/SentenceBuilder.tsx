/**
 * Sentence Builder Component
 * 
 * Redesigned to think like a trader: Signal presets combine indicator + condition
 * into unified concepts like "RSI < 30" or "Price crossed above SMA(50)".
 */

import { memo, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ChevronDown, X, Check, Plus, ArrowRight, Settings2 } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  EXIT_BLOCKS,
} from '@/lib/strategyBuilder/templates';
import type { PaletteBlock, BlockSubtype } from '@/lib/strategyBuilder/types';

interface SentenceBuilderProps {
  onAddBlock: (subtype: BlockSubtype, parameters?: Record<string, number>) => void;
  onComplete?: () => void;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRADING SIGNAL PRESETS - How traders actually think
// ═══════════════════════════════════════════════════════════════════════════════

interface SignalPreset {
  id: string;
  label: string;
  description: string;
  icon: string;
  category: 'momentum' | 'trend' | 'pattern';
  // What blocks to create
  indicator: BlockSubtype;
  condition: BlockSubtype;
  // Combined parameters with sensible defaults
  parameters: {
    period?: number;
    threshold?: number;
    days?: number;
  };
  // Parameter configuration
  parameterConfig: {
    key: string;
    label: string;
    min: number;
    max: number;
    step: number;
    suffix?: string;
  }[];
}

const SIGNAL_PRESETS: SignalPreset[] = [
  // RSI Signals
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
  // MA Signals  
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
  // Pattern Signals
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
];

interface SelectedSignal {
  preset: SignalPreset;
  parameters: Record<string, number>;
}

interface SelectedExit {
  block: PaletteBlock;
  parameters: Record<string, number>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIGNAL SELECTOR - Unified indicator + condition in one selection
// ═══════════════════════════════════════════════════════════════════════════════

const SignalSelector = memo(function SignalSelector({
  selected,
  onSelect,
  onClear,
  onParamsChange,
  isActive,
}: {
  selected: SelectedSignal | null;
  onSelect: (preset: SignalPreset) => void;
  onClear: () => void;
  onParamsChange: (params: Record<string, number>) => void;
  isActive: boolean;
}) {
  const [open, setOpen] = useState(false);

  const categories = [
    { id: 'momentum', label: 'Momentum' },
    { id: 'trend', label: 'Trend' },
    { id: 'pattern', label: 'Pattern' },
  ];

  // Format display value
  const getDisplayValue = (preset: SignalPreset, params: Record<string, number>) => {
    const parts: string[] = [];
    preset.parameterConfig.forEach(config => {
      const val = params[config.key];
      if (val !== undefined) {
        parts.push(`${val}${config.suffix || ''}`);
      }
    });
    return parts.join(', ');
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all",
              "hover:border-primary hover:bg-primary/5",
              "focus:outline-none focus:ring-2 focus:ring-primary/50",
              selected ? "border-solid bg-card shadow-md" : "border-dashed border-muted-foreground/30",
              isActive && !selected && "border-primary animate-pulse bg-primary/10",
              !selected && "border-destructive/50"
            )}
          >
            {selected ? (
              <>
                <span className="text-xl">{selected.preset.icon}</span>
                <div className="text-left">
                  <div className="font-semibold text-sm">{selected.preset.label}</div>
                  <div className="text-xs text-muted-foreground font-mono">
                    {getDisplayValue(selected.preset, selected.parameters)}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onClear();
                  }}
                  className="ml-2 p-1 rounded-full hover:bg-destructive/20"
                >
                  <X className="h-3 w-3" />
                </button>
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Select Entry Signal</span>
                <span className="text-destructive text-xs">*</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-3" align="start">
          <div className="text-xs font-medium text-muted-foreground mb-3">
            Choose your entry signal
          </div>
          <div className="space-y-4 max-h-72 overflow-auto">
            {categories.map(cat => (
              <div key={cat.id}>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  {cat.label}
                </div>
                <div className="space-y-1">
                  {SIGNAL_PRESETS.filter(p => p.category === cat.id).map(preset => (
                    <button
                      key={preset.id}
                      onClick={() => {
                        onSelect(preset);
                        setOpen(false);
                      }}
                      className={cn(
                        "flex items-center gap-3 w-full px-3 py-2 rounded-md text-left transition-colors",
                        "hover:bg-muted",
                        selected?.preset.id === preset.id && "bg-primary/10 ring-1 ring-primary"
                      )}
                    >
                      <span className="text-xl">{preset.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{preset.label}</div>
                        <div className="text-xs text-muted-foreground truncate">{preset.description}</div>
                      </div>
                      {selected?.preset.id === preset.id && <Check className="h-4 w-4 text-primary" />}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Inline parameter editor for the selected signal */}
      {selected && selected.preset.parameterConfig.length > 0 && (
        <div className="ml-4 p-3 bg-muted/50 rounded-lg border-l-2 border-primary/50">
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
            <Settings2 className="h-3 w-3" />
            <span className="font-medium">Adjust Parameters</span>
          </div>
          <div className="space-y-3">
            {selected.preset.parameterConfig.map((config) => (
              <div key={config.key} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{config.label}</span>
                  <span className="font-mono font-semibold text-foreground">
                    {selected.parameters[config.key] ?? config.min}
                    {config.suffix || ''}
                  </span>
                </div>
                <Slider
                  value={[selected.parameters[config.key] ?? config.min]}
                  min={config.min}
                  max={config.max}
                  step={config.step}
                  onValueChange={([value]) => onParamsChange({ ...selected.parameters, [config.key]: value })}
                  className="w-full"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// EXIT RULES SELECTOR
// ═══════════════════════════════════════════════════════════════════════════════

const ExitRulesSelector = memo(function ExitRulesSelector({
  values,
  onToggle,
  onParamsChange,
  isActive,
}: {
  values: SelectedExit[];
  onToggle: (block: PaletteBlock) => void;
  onParamsChange: (subtype: string, params: Record<string, number>) => void;
  isActive: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {values.map((selected) => (
          <div
            key={selected.block.subtype}
            className={cn(
              "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-card shadow-sm",
              selected.block.color
            )}
          >
            <span className="text-base">{selected.block.icon}</span>
            <span className="font-medium text-sm">{selected.block.label}</span>
            {selected.block.parameterConfig && selected.block.parameterConfig.length > 0 && (
              <span className="text-xs text-muted-foreground font-mono">
                ({Object.values(selected.parameters).join('')}{selected.block.parameterConfig[0]?.suffix || ''})
              </span>
            )}
            <button
              onClick={() => onToggle(selected.block)}
              className="ml-1 p-0.5 rounded-full hover:bg-destructive/20"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-dashed transition-all",
                "hover:border-primary hover:bg-primary/5",
                "focus:outline-none focus:ring-2 focus:ring-primary/50",
                values.length === 0 && "border-destructive/50",
                isActive && values.length === 0 && "border-primary animate-pulse bg-primary/10"
              )}
            >
              <Plus className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {values.length === 0 ? 'Add Exit Rule' : 'Add'}
              </span>
              {values.length === 0 && <span className="text-destructive text-xs">*</span>}
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="start">
            <div className="text-xs font-medium text-muted-foreground mb-2 px-1">
              Select Exit Rules
            </div>
            <div className="grid gap-1 max-h-48 overflow-auto">
              {EXIT_BLOCKS.map((block) => {
                const isSelected = values.some(v => v.block.subtype === block.subtype);
                return (
                  <button
                    key={block.subtype}
                    onClick={() => onToggle(block)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-md text-left transition-colors",
                      "hover:bg-muted",
                      isSelected && "bg-primary/10 ring-1 ring-primary",
                      block.color
                    )}
                  >
                    <span className="text-lg">{block.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{block.label}</div>
                      <div className="text-xs text-muted-foreground">{block.description}</div>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-primary" />}
                  </button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      </div>
      
      {/* Inline parameter editors for each exit rule */}
      {values.length > 0 && (
        <div className="ml-4 space-y-2">
          {values.map((selected) => (
            selected.block.parameterConfig && selected.block.parameterConfig.length > 0 && (
              <div key={selected.block.subtype} className="p-3 bg-muted/30 rounded-lg border-l-2 border-rose-500/50">
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                  <span className="text-base">{selected.block.icon}</span>
                  <span className="font-medium">{selected.block.label}</span>
                </div>
                {selected.block.parameterConfig.map((config) => (
                  <div key={config.key} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{config.label}</span>
                      <span className="font-mono font-semibold">
                        {selected.parameters[config.key] ?? config.min}
                        {config.suffix || ''}
                      </span>
                    </div>
                    <Slider
                      value={[selected.parameters[config.key] ?? (selected.block.defaultParameters?.[config.key] as number) ?? config.min]}
                      min={config.min}
                      max={config.max}
                      step={config.step}
                      onValueChange={([value]) => onParamsChange(selected.block.subtype, { ...selected.parameters, [config.key]: value })}
                      className="w-full"
                    />
                  </div>
                ))}
              </div>
            )
          ))}
        </div>
      )}
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SENTENCE BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

export const SentenceBuilder = memo(function SentenceBuilder({
  onAddBlock,
  onComplete,
  className,
}: SentenceBuilderProps) {
  // Entry signal (combined indicator + condition)
  const [signal, setSignal] = useState<SelectedSignal | null>(null);
  
  // Exit rules (multiple allowed, at least one required)
  const [exitRules, setExitRules] = useState<SelectedExit[]>([]);

  // State tracking
  const entryComplete = signal !== null;
  const exitComplete = exitRules.length > 0;
  const activeSection = !entryComplete ? 'entry' : !exitComplete ? 'exit' : 'complete';
  const isComplete = entryComplete && exitComplete;
  const hasAnySelection = signal || exitRules.length > 0;

  const handleSelectSignal = (preset: SignalPreset) => {
    setSignal({
      preset,
      parameters: { ...preset.parameters },
    });
  };

  const handleToggleExit = (block: PaletteBlock) => {
    setExitRules(prev => {
      const exists = prev.some(e => e.block.subtype === block.subtype);
      if (exists) {
        return prev.filter(e => e.block.subtype !== block.subtype);
      }
      return [...prev, { block, parameters: { ...block.defaultParameters } as Record<string, number> }];
    });
  };

  const handleExitParamsChange = (subtype: string, params: Record<string, number>) => {
    setExitRules(prev => prev.map(e => 
      e.block.subtype === subtype ? { ...e, parameters: params } : e
    ));
  };

  const handleRunBacktest = useCallback(() => {
    if (!signal) return;
    
    // Map signal parameters to indicator and condition blocks
    const indicatorParams: Record<string, number> = {};
    const conditionParams: Record<string, number> = {};
    
    signal.preset.parameterConfig.forEach(config => {
      const value = signal.parameters[config.key];
      if (value !== undefined) {
        // Route parameters to the right block
        if (config.key === 'period' || config.key === 'days') {
          indicatorParams[config.key] = value;
        } else if (config.key === 'threshold') {
          conditionParams['value'] = value;
        }
      }
    });

    // Add indicator block
    onAddBlock(signal.preset.indicator, indicatorParams);
    
    // Add condition block
    onAddBlock(signal.preset.condition, conditionParams);
    
    // Add BUY action
    onAddBlock('BUY', {});
    
    // Add all exit rule blocks with parameters
    exitRules.forEach(exit => onAddBlock(exit.block.subtype, exit.parameters));
    
    onComplete?.();
  }, [signal, exitRules, onAddBlock, onComplete]);

  const handleClear = () => {
    setSignal(null);
    setExitRules([]);
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

      {/* ENTRY SIGNAL SECTION */}
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
          <span className="font-semibold text-sm">Entry Signal</span>
          <span className="text-xs text-muted-foreground">— When should we buy?</span>
        </div>
        
        <SignalSelector
          selected={signal}
          onSelect={handleSelectSignal}
          onClear={() => setSignal(null)}
          onParamsChange={(params) => setSignal(prev => prev ? { ...prev, parameters: params } : null)}
          isActive={activeSection === 'entry'}
        />
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
        
        <ExitRulesSelector
          values={exitRules}
          onToggle={handleToggleExit}
          onParamsChange={handleExitParamsChange}
          isActive={activeSection === 'exit'}
        />
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
        {!signal ? 'Select Entry Signal' : 
         exitRules.length === 0 ? 'Add Exit Rules' : 
         '🚀 Run Backtest'}
      </Button>
    </div>
  );
});
