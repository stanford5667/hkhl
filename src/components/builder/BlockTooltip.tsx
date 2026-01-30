/**
 * Block Tooltip Component
 * 
 * Provides helpful context and connection hints for strategy blocks.
 */

import { memo } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Info } from 'lucide-react';
import type { BlockType } from '@/lib/strategyBuilder/types';

interface BlockTooltipProps {
  children: React.ReactNode;
  blockType: BlockType;
  blockLabel: string;
  description: string;
}

// Connection guidance by block type
const CONNECTION_HINTS: Record<BlockType, { accepts?: string; outputs?: string; tip: string }> = {
  indicator: {
    outputs: 'Condition or Logic block',
    tip: 'Start of your strategy. Measures a market signal like RSI, price trend, or volume.',
  },
  condition: {
    accepts: 'Indicator',
    outputs: 'Action or Logic block',
    tip: 'Sets the threshold (e.g., "RSI < 30 means oversold"). Connect from an indicator.',
  },
  logic: {
    accepts: 'Conditions',
    outputs: 'Action block',
    tip: 'Combine multiple conditions. AND = all must be true, OR = any can trigger.',
  },
  action: {
    accepts: 'Condition or Logic',
    tip: 'The trade action. BUY enters a position when conditions are met.',
  },
  exit: {
    tip: 'Exit rules run automatically. No connection needed — they apply to all trades.',
  },
};

export const BlockTooltip = memo(function BlockTooltip({
  children,
  blockType,
  blockLabel,
  description,
}: BlockTooltipProps) {
  const hints = CONNECTION_HINTS[blockType];

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs p-3 space-y-2">
          {/* Block Name */}
          <div className="flex items-center gap-2">
            <span className="font-semibold">{blockLabel}</span>
            <Badge variant="outline" className="text-xs capitalize">
              {blockType}
            </Badge>
          </div>

          {/* Description */}
          <p className="text-xs text-muted-foreground">{description}</p>

          {/* Connection Flow */}
          {(hints.accepts || hints.outputs) && (
            <div className="flex items-center gap-1 text-xs pt-1 border-t border-border">
              {hints.accepts && (
                <>
                  <span className="text-muted-foreground">From:</span>
                  <Badge variant="secondary" className="text-xs">{hints.accepts}</Badge>
                </>
              )}
              {hints.accepts && hints.outputs && <ArrowRight className="h-3 w-3 text-muted-foreground mx-1" />}
              {hints.outputs && (
                <>
                  <span className="text-muted-foreground">To:</span>
                  <Badge variant="secondary" className="text-xs">{hints.outputs}</Badge>
                </>
              )}
            </div>
          )}

          {/* Pro Tip */}
          <div className="flex items-start gap-2 text-xs bg-muted/50 rounded p-2">
            <Info className="h-3 w-3 mt-0.5 shrink-0 text-primary" />
            <span>{hints.tip}</span>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});
