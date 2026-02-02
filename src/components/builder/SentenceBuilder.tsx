/**
 * Sentence Builder Component
 * 
 * Inline sentence-based strategy builder with SEPARATE entry and exit rules.
 * Parameters are editable INLINE - no separate screen needed.
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
  INDICATOR_BLOCKS,
  CONDITION_BLOCKS,
  ACTION_BLOCKS,
  EXIT_BLOCKS,
} from '@/lib/strategyBuilder/templates';
import type { PaletteBlock, BlockSubtype } from '@/lib/strategyBuilder/types';

interface SentenceBuilderProps {
  onAddBlock: (subtype: BlockSubtype, parameters?: Record<string, number>) => void;
  onComplete?: () => void;
  className?: string;
}

interface SelectedBlock {
  block: PaletteBlock;
  parameters: Record<string, number>;
}

// Inline parameter editor
const ParameterEditor = memo(function ParameterEditor({
  block,
  parameters,
  onChange,
}: {
  block: PaletteBlock;
  parameters: Record<string, number>;
  onChange: (params: Record<string, number>) => void;
}) {
  if (!block.parameterConfig || block.parameterConfig.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 p-2 bg-muted/50 rounded-md space-y-2">
      {block.parameterConfig.map((config) => (
        <div key={config.key} className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{config.label}</span>
            <span className="font-mono font-medium">
              {parameters[config.key] ?? config.min}
              {config.suffix || ''}
            </span>
          </div>
          <Slider
            value={[parameters[config.key] ?? (block.defaultParameters?.[config.key] as number) ?? config.min]}
            min={config.min}
            max={config.max}
            step={config.step}
            onValueChange={([value]) => onChange({ ...parameters, [config.key]: value })}
            className="w-full"
          />
        </div>
      ))}
    </div>
  );
});

interface SlotProps {
  label: string;
  selected: SelectedBlock | null;
  options: PaletteBlock[];
  onSelect: (block: PaletteBlock) => void;
  onClear: () => void;
  onParamsChange: (params: Record<string, number>) => void;
  placeholder: string;
  color: string;
  isActive: boolean;
  required?: boolean;
}

const Slot = memo(function Slot({
  label,
  selected,
  options,
  onSelect,
  onClear,
  onParamsChange,
  placeholder,
  color,
  isActive,
  required = true,
}: SlotProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (block: PaletteBlock) => {
    onSelect(block);
    setOpen(false);
  };

  return (
    <div className="inline-block">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-dashed transition-all",
              "hover:border-primary hover:bg-primary/5",
              "focus:outline-none focus:ring-2 focus:ring-primary/50",
              selected ? "border-solid bg-card shadow-sm" : "border-muted-foreground/30",
              isActive && !selected && "border-primary animate-pulse bg-primary/10",
              required && !selected && "border-destructive/50",
              color
            )}
          >
            {selected ? (
              <>
                <span className="text-base">{selected.block.icon}</span>
                <span className="font-medium text-sm">{selected.block.label}</span>
                {selected.block.parameterConfig && selected.block.parameterConfig.length > 0 && (
                  <span className="text-xs text-muted-foreground font-mono">
                    ({Object.values(selected.parameters).join(', ')})
                  </span>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onClear();
                  }}
                  className="ml-1 p-0.5 rounded-full hover:bg-destructive/20"
                >
                  <X className="h-3 w-3" />
                </button>
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{placeholder}</span>
                {required && <span className="text-destructive text-xs">*</span>}
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="start">
          <div className="text-xs font-medium text-muted-foreground mb-2 px-1">
            {label}
          </div>
          <div className="grid gap-1 max-h-48 overflow-auto">
            {options.map((block) => (
              <button
                key={block.subtype}
                onClick={() => handleSelect(block)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-left transition-colors",
                  "hover:bg-muted",
                  block.color
                )}
              >
                <span className="text-lg">{block.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{block.label}</div>
                </div>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      
      {/* Inline parameter editor */}
      {selected && selected.block.parameterConfig && selected.block.parameterConfig.length > 0 && (
        <ParameterEditor
          block={selected.block}
          parameters={selected.parameters}
          onChange={onParamsChange}
        />
      )}
    </div>
  );
});

// Multi-select slot for exit rules with inline params
interface MultiSlotProps {
  label: string;
  values: SelectedBlock[];
  options: PaletteBlock[];
  onToggle: (block: PaletteBlock) => void;
  onParamsChange: (subtype: string, params: Record<string, number>) => void;
  placeholder: string;
  color: string;
  isActive: boolean;
}

const MultiSlot = memo(function MultiSlot({
  label,
  values,
  options,
  onToggle,
  onParamsChange,
  placeholder,
  color,
  isActive,
}: MultiSlotProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {values.map((selected) => (
          <div
            key={selected.block.subtype}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-card shadow-sm",
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
                isActive && values.length === 0 && "border-primary animate-pulse bg-primary/10",
                color
              )}
            >
              <Plus className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {values.length === 0 ? placeholder : 'Add'}
              </span>
              {values.length === 0 && <span className="text-destructive text-xs">*</span>}
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="start">
            <div className="text-xs font-medium text-muted-foreground mb-2 px-1">
              {label}
            </div>
            <div className="grid gap-1 max-h-48 overflow-auto">
              {options.map((block) => {
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
      {values.map((selected) => (
        selected.block.parameterConfig && selected.block.parameterConfig.length > 0 && (
          <div key={selected.block.subtype} className="ml-4 p-2 bg-muted/30 rounded-md border-l-2 border-rose-500/50">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
              <Settings2 className="h-3 w-3" />
              {selected.block.label}
            </div>
            {selected.block.parameterConfig.map((config) => (
              <div key={config.key} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{config.label}</span>
                  <span className="font-mono font-medium">
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
  );
});

export const SentenceBuilder = memo(function SentenceBuilder({
  onAddBlock,
  onComplete,
  className,
}: SentenceBuilderProps) {
  // Entry rule state with parameters
  const [indicator, setIndicator] = useState<SelectedBlock | null>(null);
  const [condition, setCondition] = useState<SelectedBlock | null>(null);
  const [action, setAction] = useState<SelectedBlock | null>(null);
  
  // Exit rules state (multiple allowed, at least one required)
  const [exitRules, setExitRules] = useState<SelectedBlock[]>([]);

  // Determine which section is active
  const entryComplete = indicator && condition && action;
  const exitComplete = exitRules.length > 0;
  const activeSection = !entryComplete ? 'entry' : !exitComplete ? 'exit' : 'complete';
  const activeSlot = !indicator ? 'indicator' : !condition ? 'condition' : !action ? 'action' : 'exit';

  const handleSelectBlock = (setter: (val: SelectedBlock | null) => void) => (block: PaletteBlock) => {
    setter({
      block,
      parameters: { ...block.defaultParameters } as Record<string, number>,
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
    // Add entry rule blocks with their parameters
    if (indicator) onAddBlock(indicator.block.subtype, indicator.parameters);
    if (condition) onAddBlock(condition.block.subtype, condition.parameters);
    if (action) onAddBlock(action.block.subtype, action.parameters);
    
    // Add all exit rule blocks with parameters
    exitRules.forEach(exit => onAddBlock(exit.block.subtype, exit.parameters));
    
    onComplete?.();
  }, [indicator, condition, action, exitRules, onAddBlock, onComplete]);

  const handleClear = () => {
    setIndicator(null);
    setCondition(null);
    setAction(null);
    setExitRules([]);
  };

  const isComplete = entryComplete && exitComplete;
  const hasAnySelection = indicator || condition || action || exitRules.length > 0;

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

      {/* ENTRY RULES SECTION */}
      <div className={cn(
        "p-3 rounded-lg border-2 transition-all",
        activeSection === 'entry' ? "border-primary bg-primary/5" : entryComplete ? "border-emerald-500/50 bg-emerald-500/5" : "border-border"
      )}>
        <div className="flex items-center gap-2 mb-3">
          <div className={cn(
            "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
            entryComplete ? "bg-emerald-500 text-white" : "bg-primary text-primary-foreground"
          )}>
            {entryComplete ? '✓' : '1'}
          </div>
          <span className="font-semibold text-sm">Entry Rule</span>
        </div>
        
        <div className="space-y-3">
          {/* When indicator is condition */}
          <div className="flex flex-wrap items-start gap-2 text-sm">
            <span className="text-muted-foreground font-medium pt-1.5">When</span>
            <Slot
              label="Select an Indicator"
              selected={indicator}
              options={INDICATOR_BLOCKS}
              onSelect={handleSelectBlock(setIndicator)}
              onClear={() => setIndicator(null)}
              onParamsChange={(params) => setIndicator(prev => prev ? { ...prev, parameters: params } : null)}
              placeholder="Indicator"
              color="border-blue-500/50"
              isActive={activeSlot === 'indicator'}
            />
            <span className="text-muted-foreground font-medium pt-1.5">is</span>
            <Slot
              label="Select a Condition"
              selected={condition}
              options={CONDITION_BLOCKS}
              onSelect={handleSelectBlock(setCondition)}
              onClear={() => setCondition(null)}
              onParamsChange={(params) => setCondition(prev => prev ? { ...prev, parameters: params } : null)}
              placeholder="Condition"
              color="border-amber-500/50"
              isActive={activeSlot === 'condition'}
            />
          </div>

          {/* Then action */}
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground font-medium">Then</span>
            <Slot
              label="Select Entry Action"
              selected={action}
              options={ACTION_BLOCKS.filter(a => a.subtype === 'BUY')}
              onSelect={handleSelectBlock(setAction)}
              onClear={() => setAction(null)}
              onParamsChange={(params) => setAction(prev => prev ? { ...prev, parameters: params } : null)}
              placeholder="BUY"
              color="border-emerald-500/50"
              isActive={activeSlot === 'action'}
            />
          </div>
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
        "p-3 rounded-lg border-2 transition-all",
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
        
        <div className="flex flex-wrap items-start gap-2 text-sm">
          <span className="text-muted-foreground font-medium pt-1.5">Exit with</span>
          <MultiSlot
            label="Select Exit Rules"
            values={exitRules}
            options={EXIT_BLOCKS}
            onToggle={handleToggleExit}
            onParamsChange={handleExitParamsChange}
            placeholder="Exit Rule"
            color="border-rose-500/50"
            isActive={activeSection === 'exit'}
          />
        </div>
      </div>

      {/* Action button */}
      <Button
        onClick={handleRunBacktest}
        disabled={!isComplete}
        className="w-full"
        size="lg"
      >
        {isComplete ? (
          <>
            <Check className="h-4 w-4 mr-2" />
            Test Strategy
          </>
        ) : !entryComplete ? (
          'Complete entry rule'
        ) : (
          'Add exit rule'
        )}
      </Button>
    </div>
  );
});
