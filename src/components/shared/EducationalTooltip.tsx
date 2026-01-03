import { useState } from 'react';
import { HelpCircle, ExternalLink, Lightbulb, BookOpen, Calculator } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface EducationalTooltipProps {
  term: string;
  definition: string;
  impact: string;
  example?: string;
  learnMoreUrl?: string;
  className?: string;
  iconSize?: number;
}

export function EducationalTooltip({
  term,
  definition,
  impact,
  example,
  learnMoreUrl,
  className,
  iconSize = 14,
}: EducationalTooltipProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "inline-flex items-center justify-center rounded-full p-0.5",
            "text-muted-foreground hover:text-primary transition-colors duration-200",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
            className
          )}
          aria-label={`Learn more about ${term}`}
        >
          <HelpCircle className="shrink-0" size={iconSize} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          "w-80 p-0 overflow-hidden",
          "bg-card border-0",
          "shadow-xl",
          "animate-fade-in"
        )}
        sideOffset={8}
        align="start"
      >
        {/* Gradient border effect */}
        <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-purple-500/20 via-blue-500/20 to-emerald-500/20 -z-10" />
        <div className="absolute inset-[1px] rounded-lg bg-card -z-10" />
        
        <div className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-start gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <BookOpen className="h-4 w-4 text-primary" />
            </div>
            <h4 className="font-semibold text-foreground text-base leading-tight pt-0.5">
              {term}
            </h4>
          </div>

          {/* What is this? */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <span>What is this?</span>
            </div>
            <p className="text-sm text-foreground/90 leading-relaxed">
              {definition}
            </p>
          </div>

          {/* Why it matters */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <Lightbulb className="h-3 w-3" />
              <span>Why it matters to you</span>
            </div>
            <p className="text-sm text-foreground/90 leading-relaxed">
              {impact}
            </p>
          </div>

          {/* Example (optional) */}
          {example && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <Calculator className="h-3 w-3" />
                <span>Example</span>
              </div>
              <div className="text-sm text-foreground/80 leading-relaxed bg-muted/50 rounded-md p-2.5 border border-border/50">
                {example}
              </div>
            </div>
          )}

          {/* Learn more link (optional) */}
          {learnMoreUrl && (
            <a
              href={learnMoreUrl}
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

// TermHighlight sub-component
interface TermHighlightProps {
  term: string;
  definition: string;
  impact: string;
  example?: string;
  learnMoreUrl?: string;
  children: React.ReactNode;
  className?: string;
}

export function TermHighlight({
  term,
  definition,
  impact,
  example,
  learnMoreUrl,
  children,
  className,
}: TermHighlightProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "inline border-b border-dotted border-muted-foreground/50",
            "hover:border-primary hover:text-primary transition-colors duration-200",
            "cursor-help focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            className
          )}
          aria-label={`Learn more about ${term}`}
        >
          {children}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          "w-80 p-0 overflow-hidden",
          "bg-card border-0",
          "shadow-xl",
          "animate-fade-in"
        )}
        sideOffset={8}
        align="start"
      >
        {/* Gradient border effect */}
        <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-purple-500/20 via-blue-500/20 to-emerald-500/20 -z-10" />
        <div className="absolute inset-[1px] rounded-lg bg-card -z-10" />
        
        <div className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-start gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <BookOpen className="h-4 w-4 text-primary" />
            </div>
            <h4 className="font-semibold text-foreground text-base leading-tight pt-0.5">
              {term}
            </h4>
          </div>

          {/* What is this? */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <span>What is this?</span>
            </div>
            <p className="text-sm text-foreground/90 leading-relaxed">
              {definition}
            </p>
          </div>

          {/* Why it matters */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <Lightbulb className="h-3 w-3" />
              <span>Why it matters to you</span>
            </div>
            <p className="text-sm text-foreground/90 leading-relaxed">
              {impact}
            </p>
          </div>

          {/* Example (optional) */}
          {example && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <Calculator className="h-3 w-3" />
                <span>Example</span>
              </div>
              <div className="text-sm text-foreground/80 leading-relaxed bg-muted/50 rounded-md p-2.5 border border-border/50">
                {example}
              </div>
            </div>
          )}

          {/* Learn more link (optional) */}
          {learnMoreUrl && (
            <a
              href={learnMoreUrl}
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

// Convenience component that uses the financialTerms data
interface QuickTermProps {
  termKey: string;
  children?: React.ReactNode;
  showIcon?: boolean;
  className?: string;
}

import { financialTerms } from '@/data/financialTerms';

export function QuickTerm({ termKey, children, showIcon = true, className }: QuickTermProps) {
  const termData = financialTerms[termKey];
  
  if (!termData) {
    console.warn(`Financial term "${termKey}" not found in financialTerms`);
    return <span className={className}>{children}</span>;
  }

  if (showIcon) {
    return (
      <span className={cn("inline-flex items-center gap-1", className)}>
        {children || termData.term}
        <EducationalTooltip
          term={termData.term}
          definition={termData.definition}
          impact={termData.impact}
          example={termData.example}
          learnMoreUrl={termData.learnMoreUrl}
        />
      </span>
    );
  }

  return (
    <TermHighlight
      term={termData.term}
      definition={termData.definition}
      impact={termData.impact}
      example={termData.example}
      learnMoreUrl={termData.learnMoreUrl}
      className={className}
    >
      {children || termData.term}
    </TermHighlight>
  );
}

export default EducationalTooltip;
