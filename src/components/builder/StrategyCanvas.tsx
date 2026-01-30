/**
 * Strategy Canvas Component
 * 
 * Center panel with grid background for dropping and connecting blocks.
 * Now includes enhanced empty state and connection hints.
 */

import { memo, useCallback, useRef, useState, useEffect } from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { cn } from '@/lib/utils';
import type { CanvasBlock, Connection } from '@/lib/strategyBuilder/types';
import { CanvasBlockComponent } from './blocks/CanvasBlockComponent';
import { ConnectionLine } from './ConnectionLine';
import { CanvasEmptyState } from './CanvasEmptyState';
import { STRATEGY_TEMPLATES } from '@/lib/strategyBuilder/templates';
import type { StrategyTemplate } from '@/lib/strategyBuilder/templates';

interface StrategyCanvasProps {
  blocks: CanvasBlock[];
  connections: Connection[];
  selectedBlockId: string | null;
  onSelectBlock: (id: string | null) => void;
  onDeleteBlock: (id: string) => void;
  onUpdateBlockPosition: (id: string, position: { x: number; y: number }) => void;
  onUpdateBlockParameter: (blockId: string, key: string, value: number | string) => void;
  onConnect: (fromId: string, toId: string) => void;
  onLoadTemplate?: (template: StrategyTemplate) => void;
  className?: string;
  compact?: boolean;
}

export const StrategyCanvas = memo(function StrategyCanvas({
  blocks,
  connections,
  selectedBlockId,
  onSelectBlock,
  onDeleteBlock,
  onUpdateBlockPosition,
  onUpdateBlockParameter,
  onConnect,
  onLoadTemplate,
  className,
  compact = false,
}: StrategyCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null);
  
  // Connection state
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingFromId, setConnectingFromId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Handle canvas click to deselect
  const handleCanvasClick = useCallback(() => {
    onSelectBlock(null);
    if (isConnecting) {
      setIsConnecting(false);
      setConnectingFromId(null);
    }
  }, [onSelectBlock, isConnecting]);

  // Handle block dragging
  const handleBlockMouseDown = useCallback((e: React.MouseEvent, blockId: string) => {
    if (e.button !== 0) return; // Only left click
    
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;

    const rect = (e.target as HTMLElement).closest('[data-block]')?.getBoundingClientRect();
    if (!rect) return;

    setIsDragging(true);
    setDraggingBlockId(blockId);
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    onSelectBlock(blockId);
  }, [blocks, onSelectBlock]);

  // Handle mouse move for dragging and connecting
  useEffect(() => {
    if (!isDragging && !isConnecting) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current) return;
      const canvasRect = canvasRef.current.getBoundingClientRect();

      if (isDragging && draggingBlockId) {
        const newX = Math.max(0, e.clientX - canvasRect.left - dragOffset.x);
        const newY = Math.max(0, e.clientY - canvasRect.top - dragOffset.y);
        
        // Snap to 20px grid
        const snappedX = Math.round(newX / 20) * 20;
        const snappedY = Math.round(newY / 20) * 20;
        
        onUpdateBlockPosition(draggingBlockId, { x: snappedX, y: snappedY });
      }

      if (isConnecting) {
        setMousePos({
          x: e.clientX - canvasRect.left,
          y: e.clientY - canvasRect.top,
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setDraggingBlockId(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, draggingBlockId, dragOffset, isConnecting, onUpdateBlockPosition]);

  // Handle starting a connection
  const handleStartConnection = useCallback((blockId: string) => {
    setIsConnecting(true);
    setConnectingFromId(blockId);
  }, []);

  // Handle completing a connection
  const handleEndConnection = useCallback((toBlockId: string) => {
    if (connectingFromId && connectingFromId !== toBlockId) {
      onConnect(connectingFromId, toBlockId);
    }
    setIsConnecting(false);
    setConnectingFromId(null);
  }, [connectingFromId, onConnect]);

  // Get block position for connection lines
  const getBlockCenter = useCallback((blockId: string, port: 'input' | 'output') => {
    const block = blocks.find(b => b.id === blockId);
    if (!block) return { x: 0, y: 0 };
    
    const blockWidth = 140;
    const blockHeight = 60; // Approximate
    
    return {
      x: block.position.x + (port === 'output' ? blockWidth : 0),
      y: block.position.y + blockHeight / 2,
    };
  }, [blocks]);

  // Handle template load from empty state
  const handleLoadTemplate = useCallback((template: StrategyTemplate) => {
    if (onLoadTemplate) {
      onLoadTemplate(template);
    }
  }, [onLoadTemplate]);

  return (
    <Droppable droppableId="canvas">
      {(provided, snapshot) => (
        <div
          ref={(el) => {
            provided.innerRef(el);
            (canvasRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
          }}
          {...provided.droppableProps}
          className={cn(
            "relative flex-1 min-h-[500px] overflow-auto",
            "bg-[radial-gradient(circle,_hsl(var(--muted-foreground)/0.15)_1px,_transparent_1px)]",
            "bg-[length:20px_20px]",
            snapshot.isDraggingOver && "ring-2 ring-primary/30 ring-inset",
            className
          )}
          onClick={handleCanvasClick}
        >
          {/* SVG layer for connection lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {/* Existing connections */}
            {connections.map(conn => {
              const from = getBlockCenter(conn.fromBlockId, 'output');
              const to = getBlockCenter(conn.toBlockId, 'input');
              return (
                <ConnectionLine
                  key={conn.id}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                />
              );
            })}
            
            {/* Active connection being drawn */}
            {isConnecting && connectingFromId && (
              <ConnectionLine
                x1={getBlockCenter(connectingFromId, 'output').x}
                y1={getBlockCenter(connectingFromId, 'output').y}
                x2={mousePos.x}
                y2={mousePos.y}
                isActive
              />
            )}
          </svg>

          {/* Canvas blocks */}
          {blocks.map(block => (
            <div
              key={block.id}
              data-block={block.id}
              onMouseDown={(e) => handleBlockMouseDown(e, block.id)}
            >
              <CanvasBlockComponent
                block={block}
                isSelected={selectedBlockId === block.id}
                onSelect={onSelectBlock}
                onDelete={onDeleteBlock}
                onParameterChange={onUpdateBlockParameter}
                onStartConnection={handleStartConnection}
                onEndConnection={handleEndConnection}
                isConnecting={isConnecting}
                connectingFromId={connectingFromId}
              />
            </div>
          ))}

          {/* Enhanced empty state */}
          {blocks.length === 0 && (
            <CanvasEmptyState
              templates={STRATEGY_TEMPLATES}
              onLoadTemplate={handleLoadTemplate}
              compact={compact}
            />
          )}

          {/* Connection hint when dragging */}
          {isConnecting && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-primary text-primary-foreground text-xs rounded-full shadow-lg animate-pulse">
              Click on a block's input port to connect
            </div>
          )}

          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
});
