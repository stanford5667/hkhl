/**
 * Block Palette Component
 * 
 * Left panel with clear step-by-step flow for building strategies.
 * Visual numbered workflow: 1→2→3→4 makes the process intuitive.
 */

import { memo } from 'react';
import { Draggable, Droppable } from '@hello-pangea/dnd';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronRight, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  INDICATOR_BLOCKS,
  CONDITION_BLOCKS,
  LOGIC_BLOCKS,
  EXIT_BLOCKS,
  ACTION_BLOCKS,
} from '@/lib/strategyBuilder/templates';
import type { PaletteBlock, BlockSubtype } from '@/lib/strategyBuilder/types';

export interface BlockPaletteProps {
  className?: string;
  compact?: boolean;
  onAddBlock?: (subtype: BlockSubtype) => void;
}

interface StepCategoryProps {
  stepNumber: number;
  title: string;
  subtitle: string;
  blocks: PaletteBlock[];
  droppableId: string;
  compact?: boolean;
  isOptional?: boolean;
  onAddBlock?: (subtype: BlockSubtype) => void;
}

const StepCategory = memo(function StepCategory({ 
  stepNumber,
  title, 
  subtitle,
  blocks, 
  droppableId, 
  compact,
  isOptional,
  onAddBlock,
}: StepCategoryProps) {
  return (
    <div className="relative">
      {/* Step indicator */}
      <div className={cn(
        "flex items-center gap-2 border-b border-border/30",
        compact ? "px-2 py-1.5" : "px-3 py-2"
      )}>
        <div className={cn(
          "flex items-center justify-center rounded-full font-bold text-primary-foreground shrink-0",
          isOptional ? "bg-muted text-muted-foreground" : "bg-primary",
          compact ? "h-5 w-5 text-[10px]" : "h-6 w-6 text-xs"
        )}>
          {stepNumber}
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn("font-semibold truncate", compact ? "text-[10px]" : "text-xs")}>
            {title}
            {isOptional && <span className="text-muted-foreground font-normal ml-1">(optional)</span>}
          </p>
          {!compact && (
            <p className="text-[10px] text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>
      </div>
      
      {/* Blocks grid - more compact, easier to scan */}
      <Droppable droppableId={droppableId} isDropDisabled>
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "grid gap-1",
              compact ? "grid-cols-1 p-1" : "grid-cols-2 p-2"
            )}
          >
            {blocks.map((block, index) => (
              <Draggable
                key={`${droppableId}-${block.subtype}`}
                draggableId={`palette-${block.subtype}`}
                index={index}
              >
                {(provided, snapshot) => {
                  const handleClick = (e: React.MouseEvent) => {
                    if (snapshot.isDragging) return;
                    e.stopPropagation();
                    onAddBlock?.(block.subtype);
                  };

                  return (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      onClick={handleClick}
                      className={cn(
                        "flex items-center gap-1.5 rounded border cursor-pointer group",
                        "transition-all duration-150",
                        "hover:ring-2 hover:ring-primary/50 hover:shadow-sm",
                        block.color,
                        snapshot.isDragging && "shadow-lg ring-2 ring-primary",
                        compact ? "px-1.5 py-1" : "px-2 py-1.5"
                      )}
                    >
                      <span className={compact ? "text-xs" : "text-sm"}>{block.icon}</span>
                      <span className={cn(
                        "font-medium truncate flex-1",
                        compact ? "text-[10px]" : "text-xs"
                      )}>
                        {block.label}
                      </span>
                      <Plus className={cn(
                        "shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-primary",
                        compact ? "h-2.5 w-2.5" : "h-3 w-3"
                      )} />
                    </div>
                  );
                }}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
});

// Flow arrow between steps
const FlowArrow = memo(function FlowArrow({ compact }: { compact?: boolean }) {
  if (compact) return null;
  return (
    <div className="flex justify-center py-0.5">
      <ChevronRight className="h-3 w-3 text-muted-foreground/50 rotate-90" />
    </div>
  );
});

export const BlockPalette = memo(function BlockPalette({ className, compact, onAddBlock }: BlockPaletteProps) {
  const content = (
    <div>
      <StepCategory
        stepNumber={1}
        title="Pick an Indicator"
        subtitle="What signal will trigger trades?"
        blocks={INDICATOR_BLOCKS}
        droppableId="palette-indicators"
        compact={compact}
        onAddBlock={onAddBlock}
      />
      <FlowArrow compact={compact} />
      <StepCategory
        stepNumber={2}
        title="Set a Condition"
        subtitle="When should it trigger?"
        blocks={CONDITION_BLOCKS}
        droppableId="palette-conditions"
        compact={compact}
        onAddBlock={onAddBlock}
      />
      <FlowArrow compact={compact} />
      <StepCategory
        stepNumber={3}
        title="Add Action"
        subtitle="BUY when condition is met"
        blocks={ACTION_BLOCKS}
        droppableId="palette-actions"
        compact={compact}
        onAddBlock={onAddBlock}
      />
      <FlowArrow compact={compact} />
      <StepCategory
        stepNumber={4}
        title="Exit Rules"
        subtitle="Take profit & stop loss"
        blocks={EXIT_BLOCKS}
        droppableId="palette-exits"
        compact={compact}
        onAddBlock={onAddBlock}
      />
      <FlowArrow compact={compact} />
      <StepCategory
        stepNumber={5}
        title="Combine Logic"
        subtitle="AND/OR multiple conditions"
        blocks={LOGIC_BLOCKS}
        droppableId="palette-logic"
        compact={compact}
        isOptional
        onAddBlock={onAddBlock}
      />
    </div>
  );

  return (
    <div className={cn(
      "flex flex-col border-r border-border bg-card/50",
      compact ? "max-h-48" : "h-full",
      className
    )}>
      <div className={cn(
        "border-b border-border bg-muted/30",
        compact ? "px-2 py-1.5" : "px-3 py-2"
      )}>
        <h2 className={cn("font-bold", compact ? "text-xs" : "text-sm")}>
          Build Your Strategy
        </h2>
        {!compact && (
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Follow steps 1→4. Click or drag to add.
          </p>
        )}
      </div>
      
      {compact ? (
        <div className="flex-1 overflow-y-auto">
          {content}
        </div>
      ) : (
        <ScrollArea className="flex-1">
          {content}
        </ScrollArea>
      )}
    </div>
  );
});