/**
 * UNIFIED QUESTION OPTIONS
 * 
 * Reusable option components for questionnaires:
 * - Single select cards
 * - Multi-select checkboxes
 * - Slider with labels
 * - Scenario A/B picker
 * - Amount/currency input
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Check, CheckCircle2 } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLE SELECT OPTION
// ═══════════════════════════════════════════════════════════════════════════════

interface OptionCardProps {
  label: string;
  description?: string;
  icon?: React.ReactNode;
  emoji?: string;
  selected?: boolean;
  onClick?: () => void;
  color?: string;
  compact?: boolean;
}

export function OptionCard({
  label,
  description,
  icon,
  emoji,
  selected = false,
  onClick,
  color,
  compact = false,
}: OptionCardProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={cn(
        "w-full rounded-lg sm:rounded-xl border-2 transition-all text-left flex items-start gap-2.5 sm:gap-3",
        compact ? "p-2.5 sm:p-3" : "p-3 sm:p-4",
        selected
          ? "border-primary bg-primary/5 shadow-md"
          : "border-border hover:border-primary/50 bg-card hover:bg-muted/30"
      )}
    >
      {/* Icon or Emoji */}
      {(icon || emoji) && (
        <div className={cn(
          "flex items-center justify-center shrink-0 mt-0.5",
          compact ? "text-lg sm:text-xl" : "text-xl sm:text-2xl",
          icon && "w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-muted"
        )}>
          {emoji || icon}
        </div>
      )}
      
      {/* Label & Description */}
      <div className="flex-1 min-w-0 overflow-hidden">
        <p className={cn(
          "font-medium leading-tight",
          compact ? "text-sm" : "text-sm sm:text-base"
        )}>
          {label}
        </p>
        {description && (
          <p className={cn(
            "text-muted-foreground leading-snug mt-0.5 line-clamp-2",
            compact ? "text-xs" : "text-xs sm:text-sm"
          )}>
            {description}
          </p>
        )}
      </div>
      
      {/* Selection indicator */}
      {selected && (
        <CheckCircle2 className={cn(
          "text-primary shrink-0 mt-0.5",
          compact ? "h-4 w-4" : "h-4 w-4 sm:h-5 sm:w-5"
        )} />
      )}
    </motion.button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MULTI SELECT GRID
// ═══════════════════════════════════════════════════════════════════════════════

interface MultiSelectOption {
  value: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
}

interface MultiSelectGridProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  columns?: 2 | 3;
}

export function MultiSelectGrid({
  options,
  selected,
  onChange,
  columns = 2,
}: MultiSelectGridProps) {
  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <div className={cn(
      "grid gap-2 sm:gap-3",
      columns === 2 && "grid-cols-2",
      columns === 3 && "grid-cols-2 sm:grid-cols-3"
    )}>
      {options.map(option => (
        <motion.button
          key={option.value}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => toggle(option.value)}
          className={cn(
            "p-3 sm:p-4 rounded-xl border-2 transition-all text-center",
            selected.includes(option.value)
              ? "border-primary bg-primary/10"
              : "border-border hover:border-primary/50 bg-card"
          )}
        >
          {option.icon && (
            <div className="flex justify-center mb-2">
              {option.icon}
            </div>
          )}
          <p className="font-medium text-sm">{option.label}</p>
          {option.description && (
            <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
          )}
          {selected.includes(option.value) && (
            <div className="flex justify-center mt-2">
              <Check className="h-4 w-4 text-primary" />
            </div>
          )}
        </motion.button>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LABELED SLIDER
// ═══════════════════════════════════════════════════════════════════════════════

interface LabeledSliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  labels?: { value: number; label: string }[];
  formatValue?: (value: number) => string;
  showValue?: boolean;
}

export function LabeledSlider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  labels,
  formatValue,
  showValue = true,
}: LabeledSliderProps) {
  const displayValue = formatValue ? formatValue(value) : value.toString();

  return (
    <div className="space-y-4">
      {showValue && (
        <div className="text-center">
          <span className="text-3xl sm:text-4xl font-bold text-primary">
            {displayValue}
          </span>
        </div>
      )}
      
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={step}
        className="w-full"
      />
      
      {labels && (
        <div className="flex justify-between text-xs text-muted-foreground px-1">
          {labels.map(l => (
            <span key={l.value}>{l.label}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCENARIO PICKER (A/B Choice)
// ═══════════════════════════════════════════════════════════════════════════════

interface ScenarioOption {
  id: 'A' | 'B';
  label: string;
  description: string;
  traits?: string[];
  icon?: React.ReactNode;
}

interface ScenarioPickerProps {
  optionA: ScenarioOption;
  optionB: ScenarioOption;
  selected?: 'A' | 'B' | null;
  onChange: (choice: 'A' | 'B') => void;
}

export function ScenarioPicker({
  optionA,
  optionB,
  selected,
  onChange,
}: ScenarioPickerProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
      {[optionA, optionB].map(option => (
        <motion.button
          key={option.id}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onChange(option.id)}
          className={cn(
            "p-4 sm:p-6 rounded-xl border-2 transition-all text-left",
            selected === option.id
              ? "border-primary bg-primary/5 shadow-lg"
              : "border-border hover:border-primary/50 bg-card"
          )}
        >
          {option.icon && (
            <div className="mb-3">
              {option.icon}
            </div>
          )}
          <h4 className="font-semibold mb-2">{option.label}</h4>
          <p className="text-sm text-muted-foreground mb-3">{option.description}</p>
          
          {option.traits && (
            <div className="flex flex-wrap gap-1.5">
              {option.traits.map(trait => (
                <span
                  key={trait}
                  className={cn(
                    "text-xs px-2 py-0.5 rounded-full",
                    selected === option.id
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {trait}
                </span>
              ))}
            </div>
          )}
        </motion.button>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// AMOUNT INPUT (Currency)
// ═══════════════════════════════════════════════════════════════════════════════

interface AmountInputProps {
  value: number;
  onChange: (value: number) => void;
  presets?: number[];
  min?: number;
  max?: number;
  currency?: string;
}

export function AmountInput({
  value,
  onChange,
  presets = [10000, 50000, 100000, 250000, 500000, 1000000],
  min = 0,
  max = 10000000,
  currency = 'USD',
}: AmountInputProps) {
  const [customValue, setCustomValue] = React.useState('');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleCustomChange = (input: string) => {
    const numericValue = input.replace(/[^0-9]/g, '');
    setCustomValue(numericValue);
    if (numericValue) {
      const parsed = parseInt(numericValue, 10);
      if (parsed >= min && parsed <= max) {
        onChange(parsed);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Preset Grid */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {presets.map(amount => (
          <motion.button
            key={amount}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              onChange(amount);
              setCustomValue('');
            }}
            className={cn(
              "p-3 sm:p-4 rounded-xl border-2 transition-all text-center",
              value === amount && !customValue
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50 bg-card"
            )}
          >
            <span className="text-sm sm:text-base font-bold whitespace-nowrap">
              {formatCurrency(amount)}
            </span>
          </motion.button>
        ))}
      </div>
      
      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-card px-4 text-sm text-muted-foreground">
            or enter custom amount
          </span>
        </div>
      </div>
      
      {/* Custom Input */}
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
          $
        </span>
        <Input
          type="text"
          value={customValue}
          onChange={(e) => handleCustomChange(e.target.value)}
          placeholder="Enter amount"
          className="pl-8 h-14 text-xl"
        />
      </div>
      
      {/* Display Value */}
      <div className="text-center p-4 rounded-xl bg-muted/50 border border-border">
        <p className="text-sm text-muted-foreground">Selected amount</p>
        <p className="text-3xl font-bold text-emerald-500">{formatCurrency(value)}</p>
      </div>
    </div>
  );
}
