import { HelpCircle, BookOpen, Lightbulb, Calculator, ExternalLink } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { financialTerms } from '@/data/financialTerms';

interface MetricEducationalPopoverProps {
  label: string;
  value: string;
  termKey: string;
  isHighlighted?: boolean;
  isNegative?: boolean;
  isPrimary?: boolean;
  className?: string;
}

/**
 * Educational popover for metrics - matches MetricInfoIcon format
 * Used in portfolio results to explain metrics in friendly terms
 */
export function MetricEducationalPopover({
  label,
  value,
  termKey,
  isHighlighted = false,
  isNegative = false,
  isPrimary = false,
  className,
}: MetricEducationalPopoverProps) {
  const term = financialTerms[termKey];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className={cn(
          "p-1.5 rounded bg-muted/50 text-[9px] cursor-pointer hover:bg-muted transition-colors",
          "border border-transparent hover:border-border",
          className
        )}>
          <p className="text-muted-foreground flex items-center justify-center gap-0.5">
            {label}
            <HelpCircle className="h-2.5 w-2.5 opacity-60" />
          </p>
          <p className={cn(
            "font-mono font-bold",
            isPrimary && "text-primary",
            isHighlighted && !isPrimary && "text-emerald-400",
            isNegative && !isHighlighted && "text-rose-400"
          )}>
            {value}
          </p>
        </div>
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          "w-80 p-0 overflow-hidden",
          "bg-card border border-border",
          "shadow-xl",
          "animate-fade-in"
        )}
        sideOffset={8}
        side="top"
        align="center"
      >
        {term ? (
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
        ) : (
          <div className="p-4">
            <p className="font-semibold">{label}</p>
            <p className="text-muted-foreground mt-1 text-sm">No additional information available.</p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export default MetricEducationalPopover;
