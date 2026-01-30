/**
 * Block Palette Component
 * 
 * Left panel containing draggable strategy blocks organized by category.
 * Now includes tooltips and connection hints for better UX.
 */

import { memo } from 'react';
import { Draggable, Droppable } from '@hello-pangea/dnd';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  INDICATOR_BLOCKS,
  CONDITION_BLOCKS,
  LOGIC_BLOCKS,
  EXIT_BLOCKS,
  ACTION_BLOCKS,
} from '@/lib/strategyBuilder/templates';
import type { PaletteBlock } from '@/lib/strategyBuilder/types';
import { BlockTooltip } from './BlockTooltip';

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
  hint?: string;
  step?: number;
}

const BlockCategory = memo(function BlockCategory({ 
  title, 
  icon, 
  blocks, 
  droppableId, 
  compact,
  hint,
  step,
}: BlockCategoryProps) {
  return (
    <Collapsible defaultOpen={!compact} className="border-b border-border/50 last:border-b-0">
      <CollapsibleTrigger className={cn(
        "flex items-center gap-2 w-full hover:bg-accent/50 transition-colors group",
        compact ? "px-2 py-1.5" : "px-3 py-2"
      )}>
        <span className={compact ? "text-sm" : ""}>{icon}</span>
        <span className={cn("font-medium flex-1 text-left", compact ? "text-xs" : "text-sm")}>
          {title}
        </span>
        {step && !compact && (
          <Badge variant="outline" className="text-[10px] h-4 px-1.5 opacity-60 group-hover:opacity-100">
            Step {step}
          </Badge>
        )}
        <ChevronDown className={cn(
          "transition-transform duration-200 [[data-state=open]>&]:rotate-180", 
          compact ? "h-3 w-3" : "h-4 w-4"
        )} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        {/* Category hint */}
        {hint && !compact && (
          <div className="px-3 pb-2 text-[10px] text-muted-foreground flex items-start gap-1.5">
            <Info className="h-3 w-3 mt-0.5 shrink-0" />
            <span>{hint}</span>
          </div>
        )}
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
                  {(provided, snapshot) => {
                    const blockElement = (
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
                          <p className={cn("font-medium truncate", compact ? "text-xs" : "text-sm")}>
                            {block.label}
                          </p>
                          {!compact && (
                            <p className="text-xs text-muted-foreground truncate">{block.description}</p>
                          )}
                        </div>
                      </div>
                    );

                    // Wrap with tooltip in non-compact mode
                    if (!compact) {
                      return (
                        <BlockTooltip
                          blockType={block.type}
                          blockLabel={block.label}
                          description={block.description}
                        >
                          {blockElement}
                        </BlockTooltip>
                      );
                    }
                    return blockElement;
                  }}
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
        step={1}
        hint="Start here! Indicators measure market conditions like momentum or trend."
      />
      <BlockCategory
        title="Conditions"
        icon="🎯"
        blocks={CONDITION_BLOCKS}
        droppableId="palette-conditions"
        compact={compact}
        step={2}
        hint="Set thresholds for your indicators (e.g., RSI < 30 = oversold)."
      />
      <BlockCategory
        title="Logic"
        icon="🔗"
        blocks={LOGIC_BLOCKS}
        droppableId="palette-logic"
        compact={compact}
        hint="Optional: Combine multiple conditions with AND/OR."
      />
      <BlockCategory
        title="Actions"
        icon="✅"
        blocks={ACTION_BLOCKS}
        droppableId="palette-actions"
        compact={compact}
        step={3}
        hint="Connect your conditions to a BUY signal to enter trades."
      />
      <BlockCategory
        title="Exit Rules"
        icon="🛑"
        blocks={EXIT_BLOCKS}
        droppableId="palette-exits"
        compact={compact}
        step={4}
        hint="Set profit targets and stop losses. These apply automatically!"
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
        {!compact && (
          <p className="text-xs text-muted-foreground">Drag blocks to canvas • Hover for tips</p>
        )}
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
