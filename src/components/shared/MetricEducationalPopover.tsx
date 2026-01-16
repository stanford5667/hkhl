import { HelpCircle, BookOpen, Lightbulb, Target, BarChart3, ExternalLink } from 'lucide-react';
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

const categoryColors: Record<string, string> = {
  RISK: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  RETURN: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  EFFICIENCY: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  GROWTH: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  INCOME: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  VALUATION: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
};

/**
 * Educational popover for metrics - rich format with sections
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
          "w-[340px] p-0 overflow-hidden",
          "bg-card border border-border",
          "shadow-xl",
          "animate-fade-in"
        )}
        sideOffset={8}
        side="top"
        align="center"
      >
        {term ? (
          <div className="space-y-0">
            {/* Header with category badge and value */}
            <div className="p-4 pb-3 border-b border-border/50 bg-muted/30">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-primary/10 shrink-0">
                    <BarChart3 className="h-4 w-4 text-primary" />
                  </div>
                  <h4 className="font-semibold text-foreground text-base leading-tight">
                    {term.term}
                  </h4>
                </div>
                {term.category && (
                  <span className={cn(
                    "text-[10px] font-semibold px-2 py-0.5 rounded border",
                    categoryColors[term.category] || 'bg-muted text-muted-foreground'
                  )}>
                    {term.category}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Your Value: <span className={cn(
                  "font-semibold",
                  isPrimary && "text-primary",
                  isHighlighted && !isPrimary && "text-emerald-400",
                  isNegative && !isHighlighted && "text-rose-400"
                )}>{value}</span>
              </p>
            </div>

            {/* Content sections */}
            <div className="p-4 space-y-4">
              {/* What is this? */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <BookOpen className="h-3.5 w-3.5 text-primary" />
                  <span>What is {term.term}?</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed pl-5">
                  {term.definition}
                </p>
              </div>

              {/* Why it matters */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Lightbulb className="h-3.5 w-3.5 text-amber-400" />
                  <span>Why It Matters</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed pl-5">
                  {term.impact}
                </p>
              </div>

              {/* How to use this */}
              {term.howToUse && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Target className="h-3.5 w-3.5 text-emerald-400" />
                    <span>How To Use This</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed pl-5">
                    {term.howToUse}
                  </p>
                </div>
              )}

              {/* Typical Ranges */}
              {term.typicalRanges && term.typicalRanges.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <BarChart3 className="h-3.5 w-3.5 text-blue-400" />
                    <span>Typical Ranges</span>
                  </div>
                  <div className="pl-5 space-y-1.5">
                    {term.typicalRanges.map((range, index) => (
                      <div 
                        key={index}
                        className="flex items-center gap-2 text-xs"
                      >
                        <span className="font-mono text-muted-foreground w-16 shrink-0">
                          {range.label}
                        </span>
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-medium",
                          index === 0 && "bg-emerald-500/20 text-emerald-400",
                          index === 1 && "bg-amber-500/20 text-amber-400",
                          index === 2 && "bg-rose-500/20 text-rose-400"
                        )}>
                          {range.range}
                        </span>
                        {range.description && (
                          <span className="text-muted-foreground truncate">
                            {range.description}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Learn more link */}
              {term.learnMoreUrl && (
                <a
                  href={term.learnMoreUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "inline-flex items-center gap-1.5 text-sm font-medium",
                    "text-primary hover:text-primary/80 transition-colors",
                    "group mt-2"
                  )}
                >
                  <span>Learn more</span>
                  <ExternalLink className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </a>
              )}
            </div>
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
