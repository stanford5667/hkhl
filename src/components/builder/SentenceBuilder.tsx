/**
 * Sentence Builder Component
 * 
 * Inline sentence-based strategy builder with SEPARATE entry and exit rules:
 * Entry: "When [Indicator] is [Condition] then [BUY]"
 * Exit: "Exit with [Take Profit] and [Stop Loss]" (REQUIRED)
 */

import { memo, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChevronDown, X, Check, Plus, ArrowRight } from 'lucide-react';
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
  onAddBlock: (subtype: BlockSubtype) => void;
  onComplete?: () => void;
  className?: string;
}

interface SlotProps {
  label: string;
  value: PaletteBlock | null;
  options: PaletteBlock[];
  onSelect: (block: PaletteBlock) => void;
  onClear: () => void;
  placeholder: string;
  color: string;
  isActive: boolean;
  required?: boolean;
}

const Slot = memo(function Slot({
  label,
  value,
  options,
  onSelect,
  onClear,
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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-dashed transition-all",
            "hover:border-primary hover:bg-primary/5",
            "focus:outline-none focus:ring-2 focus:ring-primary/50",
            value ? "border-solid bg-card shadow-sm" : "border-muted-foreground/30",
            isActive && !value && "border-primary animate-pulse bg-primary/10",
            required && !value && "border-destructive/50",
            color
          )}
        >
          {value ? (
            <>
              <span className="text-base">{value.icon}</span>
              <span className="font-medium text-sm">{value.label}</span>
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
  );
});

// Multi-select slot for exit rules
interface MultiSlotProps {
  label: string;
  values: PaletteBlock[];
  options: PaletteBlock[];
  onToggle: (block: PaletteBlock) => void;
  placeholder: string;
  color: string;
  isActive: boolean;
}

const MultiSlot = memo(function MultiSlot({
  label,
  values,
  options,
  onToggle,
  placeholder,
  color,
  isActive,
}: MultiSlotProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {values.map((block) => (
        <div
          key={block.subtype}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-card shadow-sm",
            block.color
          )}
        >
          <span className="text-base">{block.icon}</span>
          <span className="font-medium text-sm">{block.label}</span>
          <button
            onClick={() => onToggle(block)}
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
              {values.length === 0 ? placeholder : 'Add more'}
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
              const isSelected = values.some(v => v.subtype === block.subtype);
              return (
                <button
                  key={block.subtype}
                  onClick={() => {
                    onToggle(block);
                    if (!isSelected && values.length === 0) {
                      // Keep open for more selections
                    }
                  }}
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
  );
});

export const SentenceBuilder = memo(function SentenceBuilder({
  onAddBlock,
  onComplete,
  className,
}: SentenceBuilderProps) {
  // Entry rule state
  const [indicator, setIndicator] = useState<PaletteBlock | null>(null);
  const [condition, setCondition] = useState<PaletteBlock | null>(null);
  const [action, setAction] = useState<PaletteBlock | null>(null);
  
  // Exit rules state (multiple allowed, at least one required)
  const [exitRules, setExitRules] = useState<PaletteBlock[]>([]);
  
  const [addedToCanvas, setAddedToCanvas] = useState(false);

  // Determine which section is active
  const entryComplete = indicator && condition && action;
  const exitComplete = exitRules.length > 0;
  const activeSection = !entryComplete ? 'entry' : !exitComplete ? 'exit' : 'complete';
  const activeSlot = !indicator ? 'indicator' : !condition ? 'condition' : !action ? 'action' : 'exit';

  const handleToggleExit = (block: PaletteBlock) => {
    setExitRules(prev => {
      const exists = prev.some(e => e.subtype === block.subtype);
      if (exists) {
        return prev.filter(e => e.subtype !== block.subtype);
      }
      return [...prev, block];
    });
  };

  const handleAddToCanvas = useCallback(() => {
    // Add entry rule blocks
    if (indicator) onAddBlock(indicator.subtype);
    if (condition) onAddBlock(condition.subtype);
    if (action) onAddBlock(action.subtype);
    
    // Add all exit rule blocks
    exitRules.forEach(exit => onAddBlock(exit.subtype));
    
    setAddedToCanvas(true);
    onComplete?.();
  }, [indicator, condition, action, exitRules, onAddBlock, onComplete]);

  const handleClear = () => {
    setIndicator(null);
    setCondition(null);
    setAction(null);
    setExitRules([]);
    setAddedToCanvas(false);
  };

  const isComplete = entryComplete && exitComplete;
  const hasAnySelection = indicator || condition || action || exitRules.length > 0;

  if (addedToCanvas) {
    return (
      <div className={cn("p-4 space-y-3", className)}>
        <div className="flex items-center gap-2 text-green-500">
          <Check className="h-5 w-5" />
          <span className="font-medium">Strategy added to canvas!</span>
        </div>
        <Button variant="outline" size="sm" onClick={handleClear}>
          Build another rule
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("p-4 space-y-5", className)}>
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
            "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
            entryComplete ? "bg-emerald-500 text-white" : "bg-primary text-primary-foreground"
          )}>
            {entryComplete ? '✓' : '1'}
          </div>
          <span className="font-semibold text-sm">Entry Rule</span>
          <span className="text-xs text-muted-foreground">(When to BUY)</span>
        </div>
        
        <div className="space-y-2">
          {/* When indicator is condition */}
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground font-medium">When</span>
            <Slot
              label="Select an Indicator"
              value={indicator}
              options={INDICATOR_BLOCKS}
              onSelect={setIndicator}
              onClear={() => setIndicator(null)}
              placeholder="Indicator"
              color="border-blue-500/50"
              isActive={activeSlot === 'indicator'}
            />
            <span className="text-muted-foreground font-medium">is</span>
            <Slot
              label="Select a Condition"
              value={condition}
              options={CONDITION_BLOCKS}
              onSelect={setCondition}
              onClear={() => setCondition(null)}
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
              value={action}
              options={ACTION_BLOCKS.filter(a => a.subtype === 'BUY')}
              onSelect={setAction}
              onClear={() => setAction(null)}
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
          "h-5 w-5 rotate-90",
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
            "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
            exitComplete ? "bg-emerald-500 text-white" : entryComplete ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          )}>
            {exitComplete ? '✓' : '2'}
          </div>
          <span className="font-semibold text-sm">Exit Rules</span>
          <span className="text-xs text-destructive font-medium">(Required)</span>
        </div>
        
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground font-medium">Exit with</span>
            <MultiSlot
              label="Select Exit Rules (at least one required)"
              values={exitRules}
              options={EXIT_BLOCKS}
              onToggle={handleToggleExit}
              placeholder="Exit Rule"
              color="border-rose-500/50"
              isActive={activeSection === 'exit'}
            />
          </div>
          <p className="text-xs text-muted-foreground pl-12">
            Select at least one: Take Profit, Stop Loss, or Time Exit
          </p>
        </div>
      </div>

      {/* Preview summary */}
      {isComplete && (
        <div className="p-3 bg-muted/50 rounded-lg border border-border/50">
          <div className="text-xs text-muted-foreground mb-1">Your Strategy:</div>
          <div className="text-sm space-y-1">
            <div>
              <span className="text-muted-foreground">Entry:</span>{' '}
              When <span className="text-blue-500 font-medium">{indicator?.label}</span> is{' '}
              <span className="text-amber-500 font-medium">{condition?.label}</span>, then{' '}
              <span className="text-emerald-500 font-medium">{action?.label}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Exit:</span>{' '}
              {exitRules.map((exit, i) => (
                <span key={exit.subtype}>
                  {i > 0 && <span className="text-muted-foreground"> + </span>}
                  <span className="text-rose-500 font-medium">{exit.label}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Action button */}
      <Button
        onClick={handleAddToCanvas}
        disabled={!isComplete}
        className="w-full"
        size="lg"
      >
        {isComplete ? (
          <>
            <Check className="h-4 w-4 mr-2" />
            Add to Canvas & Run Backtest
          </>
        ) : !entryComplete ? (
          'Complete entry rule first'
        ) : (
          'Add at least one exit rule'
        )}
      </Button>
    </div>
  );
});
