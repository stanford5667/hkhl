/**
 * Canvas Block Component
 * 
 * Renders a block on the strategy canvas with parameters and connection ports.
 */

import { memo, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CanvasBlock, PaletteBlock } from '@/lib/strategyBuilder/types';
import { getPaletteBlock } from '@/lib/strategyBuilder/templates';

interface CanvasBlockComponentProps {
  block: CanvasBlock;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onParameterChange: (blockId: string, key: string, value: number | string) => void;
  onStartConnection: (blockId: string, port: 'output') => void;
  onEndConnection: (blockId: string, port: 'input') => void;
  isConnecting: boolean;
  connectingFromId: string | null;
}

export const CanvasBlockComponent = memo(function CanvasBlockComponent({
  block,
  isSelected,
  onSelect,
  onDelete,
  onParameterChange,
  onStartConnection,
  onEndConnection,
  isConnecting,
  connectingFromId,
}: CanvasBlockComponentProps) {
  const paletteBlock = getPaletteBlock(block.subtype);
  
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(block.id);
  }, [block.id, onSelect]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(block.id);
  }, [block.id, onDelete]);

  const handleOutputClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onStartConnection(block.id, 'output');
  }, [block.id, onStartConnection]);

  const handleInputClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (isConnecting && connectingFromId !== block.id) {
      onEndConnection(block.id, 'input');
    }
  }, [block.id, isConnecting, connectingFromId, onEndConnection]);

  const handleParamChange = useCallback((key: string, value: string) => {
    const numValue = parseFloat(value);
    onParameterChange(block.id, key, isNaN(numValue) ? value : numValue);
  }, [block.id, onParameterChange]);

  if (!paletteBlock) return null;

  const showInputPort = block.type !== 'indicator' && block.type !== 'exit';
  const showOutputPort = block.type !== 'action' && block.type !== 'exit';

  return (
    <div
      className={cn(
        "absolute cursor-move select-none",
        "rounded-lg border-2 shadow-lg backdrop-blur-sm",
        "transition-all duration-150",
        paletteBlock.color,
        isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
        isConnecting && connectingFromId !== block.id && showInputPort && "ring-2 ring-primary/50 animate-pulse"
      )}
      style={{
        left: block.position.x,
        top: block.position.y,
        minWidth: 140,
      }}
      onClick={handleClick}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/50">
        <GripVertical className="h-3 w-3 text-muted-foreground cursor-grab" />
        <span className="text-lg">{paletteBlock.icon}</span>
        <span className="text-sm font-medium flex-1">{paletteBlock.label}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 hover:bg-destructive/20"
          onClick={handleDelete}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>

      {/* Parameters */}
      {paletteBlock.parameterConfig && paletteBlock.parameterConfig.length > 0 && (
        <div className="p-2 space-y-2">
          {paletteBlock.parameterConfig.map(config => (
            <div key={config.key} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-16 truncate">
                {config.label}
              </span>
              <div className="relative flex-1">
                <Input
                  type="number"
                  value={block.parameters[config.key] ?? config.min}
                  onChange={(e) => handleParamChange(config.key, e.target.value)}
                  min={config.min}
                  max={config.max}
                  step={config.step}
                  className="h-7 text-xs pr-6"
                  onClick={(e) => e.stopPropagation()}
                />
                {config.suffix && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    {config.suffix}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Connection Ports */}
      {showInputPort && (
        <div
          className={cn(
            "absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2",
            "w-3 h-3 rounded-full border-2 cursor-pointer",
            "bg-background border-muted-foreground/50",
            "hover:border-primary hover:bg-primary/20",
            isConnecting && connectingFromId !== block.id && "border-primary bg-primary/30 animate-pulse"
          )}
          onClick={handleInputClick}
          title="Connect input"
        />
      )}
      
      {showOutputPort && (
        <div
          className={cn(
            "absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2",
            "w-3 h-3 rounded-full border-2 cursor-pointer",
            "bg-background border-muted-foreground/50",
            "hover:border-primary hover:bg-primary/20",
            connectingFromId === block.id && "border-primary bg-primary"
          )}
          onClick={handleOutputClick}
          title="Connect output"
        />
      )}
    </div>
  );
});
