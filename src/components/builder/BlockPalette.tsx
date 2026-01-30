/**
 * Block Palette Component
 * 
 * Left panel containing draggable strategy blocks organized by category.
 */

import { memo } from 'react';
import { Draggable, Droppable } from '@hello-pangea/dnd';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  INDICATOR_BLOCKS,
  CONDITION_BLOCKS,
  LOGIC_BLOCKS,
  EXIT_BLOCKS,
  ACTION_BLOCKS,
} from '@/lib/strategyBuilder/templates';
import type { PaletteBlock } from '@/lib/strategyBuilder/types';

export interface BlockPaletteProps {
  className?: string;
  compact?: boolean;
}

interface BlockCategoryProps {
  title: string;
  icon: string;
  blocks: PaletteBlock[];
  droppableId: string;
  compact?: boolean;
}

const BlockCategory = memo(function BlockCategory({ title, icon, blocks, droppableId, compact }: BlockCategoryProps) {
  return (
    <Collapsible defaultOpen={!compact} className="border-b border-border/50 last:border-b-0">
      <CollapsibleTrigger className={cn(
        "flex items-center gap-2 w-full hover:bg-accent/50 transition-colors",
        compact ? "px-2 py-1.5" : "px-3 py-2"
      )}>
        <span className={compact ? "text-sm" : ""}>{icon}</span>
        <span className={cn("font-medium flex-1 text-left", compact ? "text-xs" : "text-sm")}>{title}</span>
        <ChevronDown className={cn("transition-transform duration-200 [[data-state=open]>&]:rotate-180", compact ? "h-3 w-3" : "h-4 w-4")} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Droppable droppableId={droppableId} isDropDisabled>
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={cn("space-y-1", compact ? "px-1.5 pb-1.5" : "px-2 pb-2")}
            >
              {blocks.map((block, index) => (
                <Draggable
                  key={`${droppableId}-${block.subtype}`}
                  draggableId={`palette-${block.subtype}`}
                  index={index}
                >
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={cn(
                        "flex items-center gap-2 rounded-md border cursor-grab",
                        "transition-all duration-150",
                        block.color,
                        snapshot.isDragging && "shadow-lg ring-2 ring-primary opacity-90",
                        compact ? "px-2 py-1" : "px-3 py-2"
                      )}
                    >
                      <span className={compact ? "text-sm" : "text-base"}>{block.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className={cn("font-medium truncate", compact ? "text-xs" : "text-sm")}>{block.label}</p>
                        {!compact && (
                          <p className="text-xs text-muted-foreground truncate">{block.description}</p>
                        )}
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </CollapsibleContent>
    </Collapsible>
  );
});

export const BlockPalette = memo(function BlockPalette({ className, compact }: BlockPaletteProps) {
  // In compact mode, avoid nested ScrollArea to fix @hello-pangea/dnd issues
  const content = (
    <div className="divide-y divide-border/50">
      <BlockCategory
        title="Indicators"
        icon="📊"
        blocks={INDICATOR_BLOCKS}
        droppableId="palette-indicators"
        compact={compact}
      />
      <BlockCategory
        title="Conditions"
        icon="🎯"
        blocks={CONDITION_BLOCKS}
        droppableId="palette-conditions"
        compact={compact}
      />
      <BlockCategory
        title="Logic"
        icon="🔗"
        blocks={LOGIC_BLOCKS}
        droppableId="palette-logic"
        compact={compact}
      />
      <BlockCategory
        title="Exit Conditions"
        icon="🛑"
        blocks={EXIT_BLOCKS}
        droppableId="palette-exits"
        compact={compact}
      />
      <BlockCategory
        title="Actions"
        icon="✅"
        blocks={ACTION_BLOCKS}
        droppableId="palette-actions"
        compact={compact}
      />
    </div>
  );

  return (
    <div className={cn(
      "flex flex-col border-r border-border bg-card/50",
      compact ? "max-h-48" : "h-full",
      className
    )}>
      <div className={cn("border-b border-border", compact ? "px-2 py-1.5" : "px-4 py-3")}>
        <h2 className={cn("font-semibold", compact ? "text-xs" : "text-sm")}>Strategy Blocks</h2>
        {!compact && <p className="text-xs text-muted-foreground">Drag blocks to canvas</p>}
      </div>
      
      {/* In compact mode, use simple overflow-y-auto to avoid nested scroll issues with dnd */}
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
