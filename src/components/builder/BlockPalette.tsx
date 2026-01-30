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

interface BlockPaletteProps {
  className?: string;
}

interface BlockCategoryProps {
  title: string;
  icon: string;
  blocks: PaletteBlock[];
  droppableId: string;
}

const BlockCategory = memo(function BlockCategory({ title, icon, blocks, droppableId }: BlockCategoryProps) {
  return (
    <Collapsible defaultOpen className="border-b border-border/50 last:border-b-0">
      <CollapsibleTrigger className="flex items-center gap-2 w-full px-3 py-2 hover:bg-accent/50 transition-colors">
        <span>{icon}</span>
        <span className="text-sm font-medium flex-1 text-left">{title}</span>
        <ChevronDown className="h-4 w-4 transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Droppable droppableId={droppableId} isDropDisabled>
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="px-2 pb-2 space-y-1"
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
                        "flex items-center gap-2 px-3 py-2 rounded-md border cursor-grab",
                        "transition-all duration-150",
                        block.color,
                        snapshot.isDragging && "shadow-lg ring-2 ring-primary opacity-90"
                      )}
                    >
                      <span className="text-base">{block.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{block.label}</p>
                        <p className="text-xs text-muted-foreground truncate">{block.description}</p>
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

export const BlockPalette = memo(function BlockPalette({ className }: BlockPaletteProps) {
  return (
    <div className={cn("flex flex-col h-full border-r border-border bg-card/50", className)}>
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold">Strategy Blocks</h2>
        <p className="text-xs text-muted-foreground">Drag blocks to canvas</p>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="divide-y divide-border/50">
          <BlockCategory
            title="Indicators"
            icon="📊"
            blocks={INDICATOR_BLOCKS}
            droppableId="palette-indicators"
          />
          <BlockCategory
            title="Conditions"
            icon="🎯"
            blocks={CONDITION_BLOCKS}
            droppableId="palette-conditions"
          />
          <BlockCategory
            title="Logic"
            icon="🔗"
            blocks={LOGIC_BLOCKS}
            droppableId="palette-logic"
          />
          <BlockCategory
            title="Exit Conditions"
            icon="🛑"
            blocks={EXIT_BLOCKS}
            droppableId="palette-exits"
          />
          <BlockCategory
            title="Actions"
            icon="✅"
            blocks={ACTION_BLOCKS}
            droppableId="palette-actions"
          />
        </div>
      </ScrollArea>
    </div>
  );
});
