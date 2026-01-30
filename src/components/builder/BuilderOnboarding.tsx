/**
 * Builder Onboarding Component
 * 
 * Step-by-step guide for first-time users of the Visual Strategy Builder.
 */

import { memo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Lightbulb, 
  ArrowRight, 
  Zap,
  Target,
  Link2,
  Play,
  X,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StrategyTemplate } from '@/lib/strategyBuilder/templates';

interface BuilderOnboardingProps {
  templates: StrategyTemplate[];
  onLoadTemplate: (template: StrategyTemplate) => void;
  onDismiss: () => void;
  compact?: boolean;
}

const STEPS = [
  {
    icon: Target,
    title: '1. Pick Your Signal',
    description: 'Drag an indicator (like RSI or SMA) to detect market conditions',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
  },
  {
    icon: Link2,
    title: '2. Set Entry Rules',
    description: 'Add conditions (< or >) and connect to a BUY action',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
  },
  {
    icon: Zap,
    title: '3. Define Your Exit',
    description: 'Add Stop Loss & Take Profit blocks for risk management',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
  },
  {
    icon: Play,
    title: '4. Test It',
    description: 'Hit "Test Strategy" to see how it performs historically',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
  },
];

export const BuilderOnboarding = memo(function BuilderOnboarding({
  templates,
  onLoadTemplate,
  onDismiss,
  compact = false,
}: BuilderOnboardingProps) {
  const [showSteps, setShowSteps] = useState(false);

  if (compact) {
    return (
      <div className="p-3 space-y-3">
        {/* Quick Start Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Quick Start</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onDismiss} className="h-6 w-6 p-0">
            <X className="h-3 w-3" />
          </Button>
        </div>

        {/* One-Click Templates */}
        <div className="grid grid-cols-2 gap-2">
          {templates.slice(0, 4).map((template) => (
            <Button
              key={template.id}
              variant="outline"
              size="sm"
              onClick={() => onLoadTemplate(template)}
              className="h-auto py-2 px-2 text-left justify-start flex-col items-start gap-0.5"
            >
              <span className="text-xs font-medium truncate w-full">{template.name}</span>
              <span className="text-[10px] text-muted-foreground truncate w-full">
                {template.blocks.length} blocks ready
              </span>
            </Button>
          ))}
        </div>

        {/* How It Works Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSteps(!showSteps)}
          className="w-full h-7 text-xs text-muted-foreground"
        >
          <Lightbulb className="h-3 w-3 mr-1" />
          {showSteps ? 'Hide' : 'How does this work?'}
        </Button>

        {/* Collapsible Steps */}
        {showSteps && (
          <div className="space-y-2 pt-1">
            {STEPS.map((step, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <div className={cn("p-1 rounded", step.bgColor)}>
                  <step.icon className={cn("h-3 w-3", step.color)} />
                </div>
                <div>
                  <p className="font-medium">{step.title}</p>
                  <p className="text-muted-foreground text-[10px]">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Full-size onboarding
  return (
    <Card className="border-dashed border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <CardContent className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Build Your First Strategy</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Create trading rules visually — no coding required
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onDismiss}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Quick Start Templates */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
            One-Click Templates
          </p>
          <div className="grid grid-cols-2 gap-2">
            {templates.map((template) => (
              <Button
                key={template.id}
                variant="outline"
                onClick={() => onLoadTemplate(template)}
                className="h-auto py-3 px-3 text-left justify-start flex-col items-start gap-1 hover:border-primary hover:bg-primary/5 transition-all"
              >
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {template.blocks.length} blocks
                  </Badge>
                </div>
                <span className="text-sm font-medium">{template.name}</span>
                <span className="text-xs text-muted-foreground line-clamp-1">
                  {template.description}
                </span>
              </Button>
            ))}
          </div>
        </div>

        {/* Steps */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">
            Or Build From Scratch
          </p>
          <div className="grid grid-cols-2 gap-3">
            {STEPS.map((step, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg",
                  step.bgColor
                )}
              >
                <step.icon className={cn("h-5 w-5 mt-0.5 shrink-0", step.color)} />
                <div>
                  <p className="text-sm font-medium">{step.title}</p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Visual Flow Hint */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg py-3">
          <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-400">Indicator</span>
          <ArrowRight className="h-4 w-4" />
          <span className="px-2 py-1 rounded bg-amber-500/20 text-amber-400">Condition</span>
          <ArrowRight className="h-4 w-4" />
          <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-400">BUY</span>
          <span className="mx-2">+</span>
          <span className="px-2 py-1 rounded bg-rose-500/20 text-rose-400">Exit Rules</span>
        </div>
      </CardContent>
    </Card>
  );
});
