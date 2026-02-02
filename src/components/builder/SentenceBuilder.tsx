/**
 * Sentence Builder Component
 * 
 * Inline sentence-based strategy builder: "When [Indicator] is [Condition] then [Action]"
 * Guides users through building a trading rule with clear, readable syntax.
 */

import { memo, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, X, Check, Plus } from 'lucide-react';
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

export const SentenceBuilder = memo(function SentenceBuilder({
  onAddBlock,
  onComplete,
  className,
}: SentenceBuilderProps) {
  const [indicator, setIndicator] = useState<PaletteBlock | null>(null);
  const [condition, setCondition] = useState<PaletteBlock | null>(null);
  const [action, setAction] = useState<PaletteBlock | null>(null);
  const [exit, setExit] = useState<PaletteBlock | null>(null);
  
  const [addedToCanvas, setAddedToCanvas] = useState(false);

  // Determine which slot should be active (first empty one)
  const activeSlot = !indicator ? 'indicator' : !condition ? 'condition' : !action ? 'action' : !exit ? 'exit' : 'complete';

  const handleIndicatorSelect = (block: PaletteBlock) => {
    setIndicator(block);
  };

  const handleConditionSelect = (block: PaletteBlock) => {
    setCondition(block);
  };

  const handleActionSelect = (block: PaletteBlock) => {
    setAction(block);
  };

  const handleExitSelect = (block: PaletteBlock) => {
    setExit(block);
  };

  const handleAddToCanvas = useCallback(() => {
    if (indicator) onAddBlock(indicator.subtype);
    if (condition) onAddBlock(condition.subtype);
    if (action) onAddBlock(action.subtype);
    if (exit) onAddBlock(exit.subtype);
    setAddedToCanvas(true);
    onComplete?.();
  }, [indicator, condition, action, exit, onAddBlock, onComplete]);

  const handleClear = () => {
    setIndicator(null);
    setCondition(null);
    setAction(null);
    setExit(null);
    setAddedToCanvas(false);
  };

  const isComplete = indicator && condition && action;
  const hasAnySelection = indicator || condition || action || exit;

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
    <div className={cn("p-4 space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Build Your Trading Rule</h3>
        {hasAnySelection && (
          <Button variant="ghost" size="sm" onClick={handleClear} className="h-7 text-xs">
            Clear all
          </Button>
        )}
      </div>

      {/* Sentence structure */}
      <div className="space-y-3">
        {/* Row 1: When indicator is condition */}
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground font-medium">When</span>
          <Slot
            label="Select an Indicator"
            value={indicator}
            options={INDICATOR_BLOCKS}
            onSelect={handleIndicatorSelect}
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
            onSelect={handleConditionSelect}
            onClear={() => setCondition(null)}
            placeholder="Condition"
            color="border-amber-500/50"
            isActive={activeSlot === 'condition'}
          />
        </div>

        {/* Row 2: Then action */}
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground font-medium">Then</span>
          <Slot
            label="Select an Action"
            value={action}
            options={ACTION_BLOCKS}
            onSelect={handleActionSelect}
            onClear={() => setAction(null)}
            placeholder="Action"
            color="border-emerald-500/50"
            isActive={activeSlot === 'action'}
          />
        </div>

        {/* Row 3: With exit (optional) */}
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground font-medium">With</span>
          <Slot
            label="Select Exit Rules (optional)"
            value={exit}
            options={EXIT_BLOCKS}
            onSelect={handleExitSelect}
            onClear={() => setExit(null)}
            placeholder="Exit (optional)"
            color="border-red-500/50"
            isActive={activeSlot === 'exit'}
          />
        </div>
      </div>

      {/* Preview summary */}
      {isComplete && (
        <div className="p-3 bg-muted/50 rounded-lg border border-border/50">
          <div className="text-xs text-muted-foreground mb-1">Your Strategy:</div>
          <div className="text-sm font-medium">
            When <span className="text-blue-500">{indicator?.label}</span> is{' '}
            <span className="text-amber-500">{condition?.label}</span>, then{' '}
            <span className="text-emerald-500">{action?.label}</span>
            {exit && (
              <>
                {' '}with <span className="text-red-500">{exit?.label}</span>
              </>
            )}
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
        ) : (
          `Complete the rule to continue`
        )}
      </Button>

      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-2">
        {[
          { key: 'indicator', filled: !!indicator, label: '1' },
          { key: 'condition', filled: !!condition, label: '2' },
          { key: 'action', filled: !!action, label: '3' },
          { key: 'exit', filled: !!exit, label: '4', optional: true },
        ].map((step, i) => (
          <div
            key={step.key}
            className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all",
              step.filled
                ? "bg-primary text-primary-foreground"
                : step.optional
                ? "bg-muted text-muted-foreground"
                : activeSlot === step.key
                ? "bg-primary/20 text-primary ring-2 ring-primary"
                : "bg-muted text-muted-foreground"
            )}
          >
            {step.filled ? '✓' : step.label}
          </div>
        ))}
      </div>
    </div>
  );
});
