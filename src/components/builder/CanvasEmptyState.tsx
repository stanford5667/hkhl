/**
 * Canvas Empty State Component
 * 
 * Friendly, visual empty state with clear instructions.
 */

import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { MousePointerClick, GripVertical, ArrowRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StrategyTemplate } from '@/lib/strategyBuilder/templates';

interface CanvasEmptyStateProps {
  templates: StrategyTemplate[];
  onLoadTemplate: (template: StrategyTemplate) => void;
  compact?: boolean;
}

export const CanvasEmptyState = memo(function CanvasEmptyState({
  templates,
  onLoadTemplate,
  compact = false,
}: CanvasEmptyStateProps) {
  const featuredTemplate = templates[0]; // RSI Bounce

  if (compact) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-4">
        <div className="pointer-events-auto space-y-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <GripVertical className="h-4 w-4" />
            <span className="text-sm">Drag blocks here</span>
          </div>
          
          <p className="text-xs text-muted-foreground">or</p>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onLoadTemplate(featuredTemplate)}
            className="gap-2"
          >
            <Sparkles className="h-3 w-3" />
            Try RSI Bounce Template
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="text-center space-y-6 max-w-md pointer-events-auto">
        {/* Main Instruction */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-3 text-muted-foreground">
            <div className="p-2 rounded-lg bg-muted/50">
              <GripVertical className="h-5 w-5" />
            </div>
            <ArrowRight className="h-4 w-4" />
            <div className="p-3 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5">
              <MousePointerClick className="h-6 w-6 text-primary" />
            </div>
          </div>
          <h3 className="text-lg font-medium mt-4">Drag blocks from the left panel</h3>
          <p className="text-sm text-muted-foreground">
            Build your trading strategy by connecting indicator → condition → action
          </p>
        </div>

        {/* Visual Flow Example */}
        <div className="flex items-center justify-center gap-2 text-xs">
          <span className="px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
            📊 RSI
          </span>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <span className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
            {'<'} 30
          </span>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <span className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            🟢 BUY
          </span>
        </div>

        {/* Quick Start */}
        <div className="pt-4 border-t border-border/50">
          <p className="text-xs text-muted-foreground mb-3">
            Or start with a ready-made template:
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {templates.slice(0, 3).map((template) => (
              <Button
                key={template.id}
                variant="outline"
                size="sm"
                onClick={() => onLoadTemplate(template)}
                className="text-xs"
              >
                {template.name}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});
