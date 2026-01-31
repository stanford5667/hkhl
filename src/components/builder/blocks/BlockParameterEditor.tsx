/**
 * Block Parameter Editor
 * 
 * Popover-based parameter editor with sliders for easier editing.
 * Designed for better UX in both desktop and compact embedded modes.
 */

import { memo, useCallback, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Settings2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ParameterConfig } from '@/lib/strategyBuilder/types';

interface BlockParameterEditorProps {
  blockId: string;
  blockLabel: string;
  parameters: Record<string, number | string>;
  parameterConfig: ParameterConfig[];
  onParameterChange: (blockId: string, key: string, value: number | string) => void;
  compact?: boolean;
}

export const BlockParameterEditor = memo(function BlockParameterEditor({
  blockId,
  blockLabel,
  parameters,
  parameterConfig,
  onParameterChange,
  compact = false,
}: BlockParameterEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localValues, setLocalValues] = useState<Record<string, number | string>>({});

  // Initialize local values when popover opens
  const handleOpenChange = useCallback((open: boolean) => {
    if (open) {
      // Copy current parameters to local state
      const initial: Record<string, number | string> = {};
      parameterConfig.forEach(config => {
        initial[config.key] = parameters[config.key] ?? config.min ?? 0;
      });
      setLocalValues(initial);
    }
    setIsOpen(open);
  }, [parameters, parameterConfig]);

  // Handle slider change (updates local state immediately)
  const handleSliderChange = useCallback((key: string, values: number[]) => {
    const value = values[0];
    setLocalValues(prev => ({ ...prev, [key]: value }));
    // Also update parent immediately for live preview
    onParameterChange(blockId, key, value);
  }, [blockId, onParameterChange]);

  // Handle input change
  const handleInputChange = useCallback((key: string, value: string, config: ParameterConfig) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      const clampedValue = Math.max(config.min ?? 0, Math.min(config.max ?? 100, numValue));
      setLocalValues(prev => ({ ...prev, [key]: clampedValue }));
      onParameterChange(blockId, key, clampedValue);
    }
  }, [blockId, onParameterChange]);

  if (!parameterConfig || parameterConfig.length === 0) {
    return null;
  }

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <div
          className={cn(
            "w-full rounded-md cursor-pointer",
            "hover:bg-background/60 transition-colors",
            "border border-dashed border-primary/30 hover:border-primary/60"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Show each parameter prominently */}
          <div className="space-y-1 p-1.5">
            {parameterConfig.map(config => {
              const val = parameters[config.key] ?? config.min;
              return (
                <div key={config.key} className="flex items-center justify-between gap-2">
                  <span className="text-[10px] text-muted-foreground truncate">
                    {config.label}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-semibold text-primary">
                      {val}{config.suffix || ''}
                    </span>
                    <Settings2 className="h-2.5 w-2.5 text-muted-foreground" />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="text-[9px] text-center text-muted-foreground pb-1">
            tap to adjust
          </div>
        </div>
      </PopoverTrigger>
      
      <PopoverContent 
        className="w-72 p-4" 
        align="start" 
        side={compact ? "top" : "right"}
        sideOffset={8}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">{blockLabel} Settings</h4>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setIsOpen(false)}
            >
              <Check className="h-3 w-3 mr-1" />
              Done
            </Button>
          </div>
          
          {parameterConfig.map(config => {
            const currentValue = localValues[config.key] ?? parameters[config.key] ?? config.min ?? 0;
            const numValue = typeof currentValue === 'number' ? currentValue : parseFloat(String(currentValue)) || 0;
            
            return (
              <div key={config.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">
                    {config.label}
                  </Label>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={numValue}
                      onChange={(e) => handleInputChange(config.key, e.target.value, config)}
                      min={config.min}
                      max={config.max}
                      step={config.step}
                      className="h-7 w-16 text-xs text-right"
                      onClick={(e) => e.stopPropagation()}
                    />
                    {config.suffix && (
                      <span className="text-xs text-muted-foreground w-4">
                        {config.suffix}
                      </span>
                    )}
                  </div>
                </div>
                
                <Slider
                  value={[numValue]}
                  onValueChange={(values) => handleSliderChange(config.key, values)}
                  min={config.min ?? 0}
                  max={config.max ?? 100}
                  step={config.step ?? 1}
                  className="w-full"
                />
                
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>{config.min ?? 0}{config.suffix}</span>
                  <span>{config.max ?? 100}{config.suffix}</span>
                </div>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
});
