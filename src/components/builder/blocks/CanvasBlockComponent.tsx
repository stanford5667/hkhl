/**
 * Canvas Block Component
 * 
 * Renders a block on the strategy canvas with parameters and connection ports.
 * Now uses popover-based parameter editor for better UX.
 */

import { memo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { X, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CanvasBlock } from '@/lib/strategyBuilder/types';
import { getPaletteBlock } from '@/lib/strategyBuilder/templates';
import { BlockParameterEditor } from './BlockParameterEditor';

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

  if (!paletteBlock) return null;

  const showInputPort = block.type !== 'indicator' && block.type !== 'exit';
  const showOutputPort = block.type !== 'action' && block.type !== 'exit';
  const hasParameters = paletteBlock.parameterConfig && paletteBlock.parameterConfig.length > 0;

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
        minWidth: hasParameters ? 180 : 140,
        maxWidth: 220,
      }}
      onClick={handleClick}
    >
      {/* Compact header */}
      <div className="flex items-center gap-1.5 px-2 py-1.5">
        <GripVertical className="h-3 w-3 text-muted-foreground/50 cursor-grab shrink-0" />
        <span className="text-base">{paletteBlock.icon}</span>
        <span className="text-xs font-semibold flex-1 truncate">{paletteBlock.label}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-4 w-4 hover:bg-destructive/20 shrink-0 opacity-50 hover:opacity-100"
          onClick={handleDelete}
        >
          <X className="h-2.5 w-2.5" />
        </Button>
      </div>

      {/* Parameters - Now using popover-based editor */}
      {hasParameters && (
        <div className="p-2">
          <BlockParameterEditor
            blockId={block.id}
            blockLabel={paletteBlock.label}
            parameters={block.parameters}
            parameterConfig={paletteBlock.parameterConfig!}
            onParameterChange={onParameterChange}
          />
        </div>
      )}

      {/* Connection Ports */}
      {showInputPort && (
        <div
          className={cn(
            "absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2",
            "w-4 h-4 rounded-full border-2 cursor-pointer",
            "bg-background border-muted-foreground/50",
            "hover:border-primary hover:bg-primary/20 hover:scale-125",
            "transition-all duration-150",
            isConnecting && connectingFromId !== block.id && "border-primary bg-primary/30 animate-pulse scale-125"
          )}
          onClick={handleInputClick}
          title="Connect input"
        />
      )}
      
      {showOutputPort && (
        <div
          className={cn(
            "absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2",
            "w-4 h-4 rounded-full border-2 cursor-pointer",
            "bg-background border-muted-foreground/50",
            "hover:border-primary hover:bg-primary/20 hover:scale-125",
            "transition-all duration-150",
            connectingFromId === block.id && "border-primary bg-primary scale-125"
          )}
          onClick={handleOutputClick}
          title="Connect output"
        />
      )}
    </div>
  );
});
