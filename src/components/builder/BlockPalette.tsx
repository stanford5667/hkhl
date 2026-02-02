/**
 * Block Palette Component
 * 
 * Left panel with clear step-by-step flow for building strategies.
 * Uses horizontal tabs on mobile so all steps are visible without scrolling.
 */

import { memo, useState } from 'react';
import { Draggable, Droppable } from '@hello-pangea/dnd';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

interface BlockGridProps {
  blocks: PaletteBlock[];
  droppableId: string;
  compact?: boolean;
  onAddBlock?: (subtype: BlockSubtype) => void;
}

const BlockGrid = memo(function BlockGrid({ 
  blocks, 
  droppableId, 
  compact,
  onAddBlock,
}: BlockGridProps) {
  return (
    <Droppable droppableId={droppableId} isDropDisabled>
      {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={cn(
            "grid gap-1.5",
            compact ? "grid-cols-2 p-2" : "grid-cols-2 p-2"
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
                      "px-2 py-2"
                    )}
                  >
                    <span className="text-base">{block.icon}</span>
                    <span className="text-xs font-medium truncate flex-1">
                      {block.label}
                    </span>
                    <Plus className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                  </div>
                );
              }}
            </Draggable>
          ))}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
});

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
      
      <BlockGrid 
        blocks={blocks}
        droppableId={droppableId}
        compact={compact}
        onAddBlock={onAddBlock}
      />
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

// Step definitions for the tabs
const STEPS = [
  { id: 'indicators', stepNumber: 1, title: 'Indicator', shortTitle: '1. Indicator', subtitle: 'What signal?', blocks: INDICATOR_BLOCKS, droppableId: 'palette-indicators' },
  { id: 'conditions', stepNumber: 2, title: 'Condition', shortTitle: '2. Condition', subtitle: 'When to trigger?', blocks: CONDITION_BLOCKS, droppableId: 'palette-conditions' },
  { id: 'actions', stepNumber: 3, title: 'Action', shortTitle: '3. Action', subtitle: 'BUY or SELL', blocks: ACTION_BLOCKS, droppableId: 'palette-actions' },
  { id: 'exits', stepNumber: 4, title: 'Exit', shortTitle: '4. Exit', subtitle: 'Take profit/stop', blocks: EXIT_BLOCKS, droppableId: 'palette-exits' },
  { id: 'logic', stepNumber: 5, title: 'Logic', shortTitle: '5. Logic', subtitle: 'AND/OR', blocks: LOGIC_BLOCKS, droppableId: 'palette-logic', isOptional: true },
];

// Mobile tabbed palette - no scrolling required
const TabbedPalette = memo(function TabbedPalette({ onAddBlock }: { onAddBlock?: (subtype: BlockSubtype) => void }) {
  const [activeStep, setActiveStep] = useState('indicators');
  
  return (
    <Tabs value={activeStep} onValueChange={setActiveStep} className="flex flex-col h-full">
      {/* Horizontal step tabs - all visible at once */}
      <TabsList className="grid grid-cols-5 h-auto p-1 bg-muted/50 rounded-none border-b">
        {STEPS.map((step) => (
          <TabsTrigger
            key={step.id}
            value={step.id}
            className={cn(
              "flex flex-col items-center gap-0.5 px-1 py-1.5 text-[10px] rounded",
              "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
              step.isOptional && "opacity-70"
            )}
          >
            <span className="font-bold">{step.stepNumber}</span>
            <span className="truncate max-w-full">{step.title}</span>
          </TabsTrigger>
        ))}
      </TabsList>
      
      {/* Tab content - blocks for selected step */}
      {STEPS.map((step) => (
        <TabsContent key={step.id} value={step.id} className="flex-1 m-0 overflow-auto">
          <div className="p-2">
            <p className="text-xs text-muted-foreground mb-2 px-1">
              {step.subtitle} {step.isOptional && '(optional)'}
            </p>
            <BlockGrid
              blocks={step.blocks}
              droppableId={step.droppableId}
              onAddBlock={onAddBlock}
            />
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
});

export const BlockPalette = memo(function BlockPalette({ className, compact, onAddBlock }: BlockPaletteProps) {
  // Use tabbed layout for mobile/compact mode - no scrolling needed
  if (compact) {
    return (
      <div className={cn(
        "flex flex-col border-r border-border bg-card/50 h-full",
        className
      )}>
        <div className="px-2 py-1.5 border-b border-border bg-muted/30">
          <h2 className="text-xs font-bold">Build Your Strategy</h2>
        </div>
        <TabbedPalette onAddBlock={onAddBlock} />
      </div>
    );
  }

  // Desktop: full scrollable list
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
      "flex flex-col border-r border-border bg-card/50 h-full",
      className
    )}>
      <div className="px-3 py-2 border-b border-border bg-muted/30">
        <h2 className="text-sm font-bold">Build Your Strategy</h2>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Follow steps 1→4. Click or drag to add.
        </p>
      </div>
      
      <ScrollArea className="flex-1">
        {content}
      </ScrollArea>
    </div>
  );
});