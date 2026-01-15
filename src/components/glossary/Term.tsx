/**
 * Term Component & Utilities
 * 
 * A simple component to make any financial term clickable anywhere in the app.
 * Usage: <Term>volatility</Term> or <Term id="expected-return">returns</Term>
 * 
 * Also includes utilities for auto-detecting and linking terms in text.
 */

import { ReactNode, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useGlossary, findTerm, FINANCIAL_TERMS, TermItem } from './FinancialGlossaryProvider';
import { Info } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════════
// TERM COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface TermProps {
  /** The term ID (e.g., 'expected-return') or display text */
  children: ReactNode;
  /** Optional explicit term ID if children is just display text */
  id?: string;
  /** Optional value to show */
  value?: string | number;
  /** Custom className */
  className?: string;
  /** Show info icon on hover */
  showIcon?: boolean;
  /** Variant style */
  variant?: 'inline' | 'badge' | 'button';
  /** Custom color */
  color?: string;
}

export function Term({
  children,
  id,
  value,
  className,
  showIcon = true,
  variant = 'inline',
  color,
}: TermProps) {
  const { openTerm } = useGlossary();
  
  // Find the term definition
  const termDef = useMemo(() => {
    const termId = id || (typeof children === 'string' ? children : '');
    return findTerm(termId);
  }, [id, children]);
  
  const handleClick = () => {
    if (termDef) {
      openTerm({
        id: termDef.id,
        name: termDef.name,
        category: termDef.category,
        value,
        color: color || termDef.color,
      });
    }
  };
  
  if (!termDef) {
    // If term not found, just render children without interaction
    return <>{children}</>;
  }
  
  const termColor = color || termDef.color;
  
  if (variant === 'badge') {
    return (
      <button
        onClick={handleClick}
        className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-sm font-medium",
          "transition-all hover:opacity-80 cursor-pointer",
          className
        )}
        style={{ 
          backgroundColor: `${termColor}20`,
          color: termColor,
        }}
      >
        {children}
        {value && <span className="font-bold">{value}</span>}
        {showIcon && <Info className="h-3 w-3 opacity-60" />}
      </button>
    );
  }
  
  if (variant === 'button') {
    return (
      <button
        onClick={handleClick}
        className={cn(
          "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm",
          "bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer",
          "border border-transparent hover:border-primary/30",
          className
        )}
      >
        {children}
        {value && <span className="font-semibold" style={{ color: termColor }}>{value}</span>}
        <Info className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
    );
  }
  
  // Default inline variant
  return (
    <button
      onClick={handleClick}
      className={cn(
        "inline-flex items-center gap-0.5 font-medium",
        "underline decoration-dotted underline-offset-4 decoration-1",
        "hover:decoration-solid transition-all cursor-pointer group",
        className
      )}
      style={{ 
        color: termColor,
        textDecorationColor: `${termColor}60`,
      }}
    >
      {children}
      {value && <span className="ml-1 font-semibold">{value}</span>}
      {showIcon && (
        <Info className="h-3 w-3 ml-0.5 opacity-0 group-hover:opacity-60 transition-opacity" />
      )}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTO-LINK UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

// Build a sorted list of all term aliases for matching
const buildTermPatterns = () => {
  const patterns: { pattern: string; termId: string; name: string }[] = [];
  
  Object.values(FINANCIAL_TERMS).forEach(term => {
    // Add the canonical name
    patterns.push({ pattern: term.name.toLowerCase(), termId: term.id, name: term.name });
    
    // Add aliases
    term.aliases.forEach(alias => {
      patterns.push({ pattern: alias.toLowerCase(), termId: term.id, name: term.name });
    });
  });
  
  // Sort by length descending to match longer phrases first
  return patterns.sort((a, b) => b.pattern.length - a.pattern.length);
};

const TERM_PATTERNS = buildTermPatterns();

/**
 * Parse text and replace known financial terms with clickable Term components
 */
export function parseTerms(
  text: string,
  options: {
    maxReplacements?: number;
    excludeTerms?: string[];
  } = {}
): ReactNode[] {
  const { maxReplacements = Infinity, excludeTerms = [] } = options;
  
  const result: ReactNode[] = [];
  const excludeSet = new Set(excludeTerms.map(t => t.toLowerCase()));
  let remainingText = text;
  let replacementCount = 0;
  let keyIndex = 0;
  
  while (remainingText.length > 0 && replacementCount < maxReplacements) {
    let foundMatch = false;
    
    for (const { pattern, termId, name } of TERM_PATTERNS) {
      if (excludeSet.has(termId)) continue;
      
      const lowerRemaining = remainingText.toLowerCase();
      const matchIndex = lowerRemaining.indexOf(pattern);
      
      if (matchIndex !== -1) {
        // Check word boundaries
        const charBefore = matchIndex > 0 ? lowerRemaining[matchIndex - 1] : ' ';
        const charAfter = matchIndex + pattern.length < lowerRemaining.length 
          ? lowerRemaining[matchIndex + pattern.length] 
          : ' ';
        
        const isWordBoundaryBefore = /[\s.,;:!?'"()\[\]{}]/.test(charBefore);
        const isWordBoundaryAfter = /[\s.,;:!?'"()\[\]{}]/.test(charAfter);
        
        if (isWordBoundaryBefore && isWordBoundaryAfter) {
          // Add text before match
          if (matchIndex > 0) {
            result.push(remainingText.slice(0, matchIndex));
          }
          
          // Add the Term component (preserve original casing)
          const originalText = remainingText.slice(matchIndex, matchIndex + pattern.length);
          result.push(
            <Term key={`term-${keyIndex++}`} id={termId}>
              {originalText}
            </Term>
          );
          
          // Continue with remaining text
          remainingText = remainingText.slice(matchIndex + pattern.length);
          replacementCount++;
          foundMatch = true;
          break;
        }
      }
    }
    
    if (!foundMatch) {
      // No more matches, add remaining text
      result.push(remainingText);
      break;
    }
  }
  
  return result.length > 0 ? result : [text];
}

/**
 * Higher-order component that auto-links terms in text content
 */
interface AutoLinkTermsProps {
  children: string;
  maxReplacements?: number;
  excludeTerms?: string[];
  className?: string;
}

export function AutoLinkTerms({ 
  children, 
  maxReplacements, 
  excludeTerms,
  className,
}: AutoLinkTermsProps) {
  const parsed = useMemo(
    () => parseTerms(children, { maxReplacements, excludeTerms }),
    [children, maxReplacements, excludeTerms]
  );
  
  return <span className={className}>{parsed}</span>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GLOSSARY SEARCH COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface GlossarySearchTriggerProps {
  className?: string;
}

export function GlossarySearchTrigger({ className }: GlossarySearchTriggerProps) {
  const { openTerm } = useGlossary();
  
  // Open with a default term - could be enhanced with a search modal
  const handleClick = () => {
    openTerm('expected-return'); // Default to expected return
  };
  
  return (
    <button
      onClick={handleClick}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-lg",
        "bg-secondary/50 hover:bg-secondary transition-colors",
        "text-sm text-muted-foreground hover:text-foreground",
        className
      )}
    >
      <Info className="h-4 w-4" />
      <span>Glossary</span>
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUICK GLOSSARY GRID
// ═══════════════════════════════════════════════════════════════════════════════

interface QuickGlossaryProps {
  /** Specific term IDs to show, or leave empty for defaults */
  terms?: string[];
  /** Number of columns */
  columns?: 2 | 3 | 4;
  /** Title */
  title?: string;
  className?: string;
}

export function QuickGlossary({ 
  terms,
  columns = 3,
  title = 'Quick Reference',
  className,
}: QuickGlossaryProps) {
  const { openTerm } = useGlossary();
  
  // Default popular terms if none specified
  const termIds = terms || [
    'expected-return',
    'volatility',
    'sharpe-ratio',
    'max-drawdown',
    'diversification',
    'compound-growth',
    'dollar-cost-averaging',
    'time-horizon',
    'risk-tolerance',
  ];
  
  const termList = termIds
    .map(id => FINANCIAL_TERMS[id])
    .filter(Boolean);
  
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 sm:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-4',
  };
  
  return (
    <div className={cn("space-y-3", className)}>
      {title && (
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Info className="h-4 w-4" />
          {title}
        </div>
      )}
      <div className={cn("grid gap-2", gridCols[columns])}>
        {termList.map(term => (
          <button
            key={term.id}
            onClick={() => openTerm({
              id: term.id,
              name: term.name,
              category: term.category,
              color: term.color,
            })}
            className={cn(
              "flex items-center gap-2 p-2 rounded-lg text-left",
              "bg-secondary/30 hover:bg-secondary/50 transition-colors",
              "group cursor-pointer"
            )}
          >
            <div 
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: term.color }}
            />
            <span className="text-sm font-medium truncate group-hover:text-foreground transition-colors">
              {term.name}
            </span>
            <Info className="h-3 w-3 ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}

export default Term;
