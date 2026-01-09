import { HelpCircle, TrendingUp, TrendingDown, ArrowRight, Lightbulb, BookOpen, Calculator, ExternalLink } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { financialTerms } from '@/data/financialTerms';

interface MetricInfoIconProps {
  termKey: string;
  className?: string;
  iconSize?: number;
  side?: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * A standardized info icon that shows educational tooltips for financial metrics.
 * Displays: definition, portfolio impact (high vs low), and optional example.
 */
export function MetricInfoIcon({ 
  termKey, 
  className, 
  iconSize = 14,
  side = 'top' 
}: MetricInfoIconProps) {
  const term = financialTerms[termKey];
  
  if (!term) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "inline-flex items-center justify-center rounded-full p-0.5",
            "text-muted-foreground hover:text-primary transition-colors duration-200",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
            className
          )}
          aria-label={`Learn more about ${term.term}`}
        >
          <HelpCircle className="shrink-0" size={iconSize} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          "w-80 p-0 overflow-hidden",
          "bg-card border border-border",
          "shadow-xl",
          "animate-fade-in"
        )}
        sideOffset={8}
        side={side}
        align="start"
      >
        <div className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-start gap-2">
            <div className="p-1.5 rounded-md bg-primary/10 shrink-0">
              <BookOpen className="h-4 w-4 text-primary" />
            </div>
            <h4 className="font-semibold text-foreground text-base leading-tight pt-0.5">
              {term.term}
            </h4>
          </div>

          {/* What is this? */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <span>What is this?</span>
            </div>
            <p className="text-sm text-foreground/90 leading-relaxed">
              {term.definition}
            </p>
          </div>

          {/* Why it matters to your portfolio */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <Lightbulb className="h-3 w-3" />
              <span>Impact on Your Portfolio</span>
            </div>
            <p className="text-sm text-foreground/90 leading-relaxed">
              {term.impact}
            </p>
          </div>

          {/* Example (optional) */}
          {term.example && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <Calculator className="h-3 w-3" />
                <span>Real-World Example</span>
              </div>
              <div className="text-sm text-foreground/80 leading-relaxed bg-muted/50 rounded-md p-2.5 border border-border/50">
                {term.example}
              </div>
            </div>
          )}

          {/* Learn more link (optional) */}
          {term.learnMoreUrl && (
            <a
              href={term.learnMoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "inline-flex items-center gap-1.5 text-sm font-medium",
                "text-primary hover:text-primary/80 transition-colors",
                "group"
              )}
            >
              <span>Learn more</span>
              <ExternalLink className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </a>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface MetricLabelWithInfoProps {
  label: string;
  termKey: string;
  className?: string;
}

/**
 * A label with an attached info icon - use for metric labels that need explanations
 */
export function MetricLabelWithInfo({ label, termKey, className }: MetricLabelWithInfoProps) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <span>{label}</span>
      <MetricInfoIcon termKey={termKey} iconSize={12} />
    </div>
  );
}

export default MetricInfoIcon;
