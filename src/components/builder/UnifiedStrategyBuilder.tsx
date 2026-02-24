/**
 * Unified Strategy Builder
 * 
 * Combines preset strategies and custom building into one seamless experience.
 * Presets populate the sentence builder for easy customization.
 */

import { memo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Activity,
  TrendingUp,
  Zap,
  Target,
  Sparkles,
} from 'lucide-react';
import { SentenceBuilder, type SentenceBuilderState, type SelectedSignal, type SelectedExit, type BacktestParams } from './SentenceBuilder';
import { EXIT_BLOCKS } from '@/lib/strategyBuilder/templates';
import type { BlockSubtype } from '@/lib/strategyBuilder/types';
import { AdvancedParamsPanel } from '@/components/backtester/AdvancedParamsPanel';
import type { AdvancedBacktestParams } from '@/lib/backtesting/types';

// ═══════════════════════════════════════════════════════════════════════════════
// PRESET STRATEGY DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

interface PresetStrategy {
  id: string;
  name: string;
  shortDesc: string;
  whyItWorks: string;
  riskLevel: 'Conservative' | 'Moderate' | 'Aggressive';
  icon: React.ElementType;
  // Maps to SentenceBuilder state
  signalId: string;
  signalParams: Record<string, number>;
  exitSubtypes: string[];
  exitParams: Record<string, Record<string, number>>;
}

const PRESET_STRATEGIES: PresetStrategy[] = [
  {
    id: 'rsi-bounce',
    name: 'RSI Oversold Bounce',
    shortDesc: 'Buy when oversold (RSI < 30)',
    whyItWorks: 'Catches panic selling reversals',
    riskLevel: 'Moderate',
    icon: Activity,
    signalId: 'rsi-oversold',
    signalParams: { period: 14, threshold: 30 },
    exitSubtypes: ['TAKE_PROFIT', 'STOP_LOSS'],
    exitParams: {
      'TAKE_PROFIT': { percent: 10 },
      'STOP_LOSS': { percent: 5 },
    },
  },
  {
    id: 'ma-crossover',
    name: 'Golden Cross',
    shortDesc: 'Ride momentum trends',
    whyItWorks: 'The trend is your friend',
    riskLevel: 'Moderate',
    icon: TrendingUp,
    signalId: 'price-above-sma',
    signalParams: { period: 50 },
    exitSubtypes: ['TRAILING_STOP', 'STOP_LOSS'],
    exitParams: {
      'TRAILING_STOP': { percent: 8 },
      'STOP_LOSS': { percent: 7 },
    },
  },
  {
    id: 'gap-fill',
    name: 'Gap Fill',
    shortDesc: 'Buy gap downs, sell recovery',
    whyItWorks: 'Gaps fill 70%+ of the time',
    riskLevel: 'Aggressive',
    icon: Zap,
    signalId: 'gap-down',
    signalParams: { threshold: 2 },
    exitSubtypes: ['TAKE_PROFIT', 'TIME_EXIT'],
    exitParams: {
      'TAKE_PROFIT': { percent: 3 },
      'TIME_EXIT': { days: 1 },
    },
  },
  {
    id: 'mean-reversion',
    name: 'Mean Reversion',
    shortDesc: 'Buy after 3+ down days',
    whyItWorks: 'Markets overcorrect short-term',
    riskLevel: 'Conservative',
    icon: Target,
    signalId: 'consecutive-down',
    signalParams: { days: 3 },
    exitSubtypes: ['TIME_EXIT', 'STOP_LOSS'],
    exitParams: {
      'TIME_EXIT': { days: 5 },
      'STOP_LOSS': { percent: 5 },
    },
  },
];

// Signal preset data (copied from SentenceBuilder to map presets)
const SIGNAL_PRESET_MAP: Record<string, {
  label: string;
  icon: string;
  category: 'momentum' | 'trend' | 'pattern';
  indicator: BlockSubtype;
  condition: BlockSubtype;
  parameterConfig: { key: string; label: string; min: number; max: number; step: number; suffix?: string }[];
}> = {
  'rsi-oversold': {
    label: 'RSI Oversold',
    icon: '📉',
    category: 'momentum',
    indicator: 'RSI',
    condition: 'LESS_THAN',
    parameterConfig: [
      { key: 'period', label: 'RSI Period', min: 5, max: 30, step: 1 },
      { key: 'threshold', label: 'Below', min: 10, max: 50, step: 5 },
    ],
  },
  'price-above-sma': {
    label: 'Price Above SMA',
    icon: '↗️',
    category: 'trend',
    indicator: 'SMA',
    condition: 'CROSSES_ABOVE',
    parameterConfig: [
      { key: 'period', label: 'SMA Period', min: 10, max: 200, step: 10 },
    ],
  },
  'gap-down': {
    label: 'Gap Down',
    icon: '⬇️',
    category: 'pattern',
    indicator: 'GAP_DOWN',
    condition: 'GREATER_THAN',
    parameterConfig: [
      { key: 'threshold', label: 'Gap %', min: 1, max: 10, step: 0.5, suffix: '%' },
    ],
  },
  'consecutive-down': {
    label: 'Down Days',
    icon: '📅',
    category: 'pattern',
    indicator: 'CONSECUTIVE_DOWN',
    condition: 'GREATER_THAN',
    parameterConfig: [
      { key: 'days', label: 'Down Days', min: 2, max: 7, step: 1 },
    ],
  },
};

interface UnifiedStrategyBuilderProps {
  ticker?: string;
  onRunBacktest?: (params: BacktestParams) => void;
  sentenceState?: SentenceBuilderState;
  onSentenceStateChange?: (state: SentenceBuilderState) => void;
  className?: string;
  advancedParams?: AdvancedBacktestParams;
  onAdvancedParamsChange?: (params: AdvancedBacktestParams) => void;
}

export const UnifiedStrategyBuilder = memo(function UnifiedStrategyBuilder({
  ticker = 'AAPL',
  onRunBacktest,
  sentenceState,
  onSentenceStateChange,
  className,
  advancedParams,
  onAdvancedParamsChange,
}: UnifiedStrategyBuilderProps) {
  
  // Handle preset selection - populates the sentence builder
  const handleSelectPreset = useCallback((preset: PresetStrategy) => {
    if (!onSentenceStateChange) return;
    
    // Build signal from preset
    const signalData = SIGNAL_PRESET_MAP[preset.signalId];
    if (!signalData) return;
    
    const entrySignal: SelectedSignal = {
      preset: {
        id: preset.signalId,
        label: signalData.label,
        description: preset.shortDesc,
        icon: signalData.icon,
        category: signalData.category,
        indicator: signalData.indicator,
        condition: signalData.condition,
        parameters: preset.signalParams,
        parameterConfig: signalData.parameterConfig,
      },
      parameters: { ...preset.signalParams },
    };
    
    // Build exit rules from preset
    const exitRules: SelectedExit[] = preset.exitSubtypes.map(subtype => {
      const block = EXIT_BLOCKS.find(b => b.subtype === subtype);
      if (!block) return null;
      return {
        block,
        parameters: preset.exitParams[subtype] || {},
      };
    }).filter(Boolean) as SelectedExit[];
    
    // Update state
    onSentenceStateChange({
      entrySignals: [entrySignal],
      entryLogic: 'AND',
      exitRules,
      exitLogic: 'OR',
    });
  }, [onSentenceStateChange]);
  
  // Check if a preset is currently active
  const getActivePresetId = useCallback(() => {
    if (!sentenceState || sentenceState.entrySignals.length === 0) return null;
    const firstSignalId = sentenceState.entrySignals[0]?.preset?.id;
    return PRESET_STRATEGIES.find(p => p.signalId === firstSignalId)?.id || null;
  }, [sentenceState]);
  
  const activePresetId = getActivePresetId();
  
  return (
    <ScrollArea className={cn("h-full", className)}>
      <div className="p-3 space-y-4">
        {/* Quick Start Presets */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Quick Start</h3>
            <span className="text-xs text-muted-foreground">Pick a proven strategy</span>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            {PRESET_STRATEGIES.map((preset) => {
              const Icon = preset.icon;
              const isActive = activePresetId === preset.id;
              
              return (
                <button
                  key={preset.id}
                  onClick={() => handleSelectPreset(preset)}
                  className={cn(
                    "flex flex-col items-start p-3 rounded-lg border text-left transition-all",
                    "hover:border-primary/50 hover:bg-primary/5",
                    isActive && "border-primary bg-primary/10 ring-1 ring-primary/50"
                  )}
                >
                  <div className="flex items-center gap-2 w-full mb-1">
                    <div className={cn(
                      "p-1.5 rounded-md",
                      isActive ? "bg-primary/20" : "bg-muted"
                    )}>
                      <Icon className={cn(
                        "h-3.5 w-3.5",
                        isActive ? "text-primary" : "text-muted-foreground"
                      )} />
                    </div>
                    <span className="font-medium text-xs flex-1 truncate">{preset.name}</span>
                    {isActive && (
                      <Badge variant="secondary" className="text-[9px] px-1 py-0">Active</Badge>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground line-clamp-1">{preset.shortDesc}</p>
                  <div className="flex items-center gap-1 mt-1.5">
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-[9px] px-1.5 py-0",
                        preset.riskLevel === 'Conservative' && 'border-emerald-500/50 text-emerald-500',
                        preset.riskLevel === 'Moderate' && 'border-amber-500/50 text-amber-500',
                        preset.riskLevel === 'Aggressive' && 'border-rose-500/50 text-rose-500',
                      )}
                    >
                      {preset.riskLevel}
                    </Badge>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground">or customize</span>
          <Separator className="flex-1" />
        </div>
        
        {/* Sentence Builder for custom/refined strategies */}
        <SentenceBuilder
          onAddBlock={() => {}}
          onRunBacktest={onRunBacktest}
          ticker={ticker}
          state={sentenceState}
          onStateChange={onSentenceStateChange}
        />

        {/* Advanced Parameters - integrated into the builder flow */}
        {advancedParams && onAdvancedParamsChange && (
          <>
            <Separator />
            <AdvancedParamsPanel params={advancedParams} onChange={onAdvancedParamsChange} />
          </>
        )}
      </div>
    </ScrollArea>
  );
});
