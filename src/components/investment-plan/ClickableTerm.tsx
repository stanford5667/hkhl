/**
 * ClickableTerm Component
 * 
 * An inline clickable term that opens the concept detail sheet.
 * Can be used in markdown content or anywhere investment terms appear.
 */

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { ConceptItem } from './InvestmentConceptDetail';

interface ClickableTermProps {
  term: string;
  conceptId: string;
  category?: ConceptItem['category'];
  value?: string | number;
  color?: string;
  onClick: (concept: ConceptItem) => void;
  children?: ReactNode;
  className?: string;
}

export function ClickableTerm({
  term,
  conceptId,
  category = 'term',
  value,
  color,
  onClick,
  children,
  className,
}: ClickableTermProps) {
  const handleClick = () => {
    onClick({
      id: conceptId,
      name: term,
      category,
      value,
      color,
    });
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "inline-flex items-center gap-1 font-medium underline decoration-dotted underline-offset-4",
        "hover:text-blue-400 hover:decoration-blue-400 transition-colors cursor-pointer",
        className
      )}
    >
      {children || term}
    </button>
  );
}

// Known investment terms that should be clickable
// Maps display terms to concept IDs
export const CLICKABLE_TERMS: Record<string, { id: string; category: ConceptItem['category'] }> = {
  // Metrics
  'expected return': { id: 'expected-return', category: 'metric' },
  'expected returns': { id: 'expected-return', category: 'metric' },
  'annual return': { id: 'expected-return', category: 'metric' },
  'max drawdown': { id: 'max-drawdown', category: 'risk' },
  'maximum drawdown': { id: 'max-drawdown', category: 'risk' },
  'volatility': { id: 'volatility', category: 'risk' },
  'sharpe ratio': { id: 'sharpe-ratio', category: 'metric' },
  'risk-adjusted return': { id: 'sharpe-ratio', category: 'metric' },
  
  // Time & Capital
  'time horizon': { id: 'time-horizon', category: 'term' },
  'investment horizon': { id: 'time-horizon', category: 'term' },
  'investment capital': { id: 'investment-capital', category: 'term' },
  'monthly contribution': { id: 'monthly-contribution', category: 'term' },
  'monthly contributions': { id: 'monthly-contribution', category: 'term' },
  
  // Asset Classes
  'us equities': { id: 'us-equities', category: 'allocation' },
  'u.s. equities': { id: 'us-equities', category: 'allocation' },
  'domestic stocks': { id: 'us-equities', category: 'allocation' },
  'stocks': { id: 'us-equities', category: 'allocation' },
  'equities': { id: 'us-equities', category: 'allocation' },
  'international': { id: 'international', category: 'allocation' },
  'international stocks': { id: 'international', category: 'allocation' },
  'emerging markets': { id: 'international', category: 'allocation' },
  'fixed income': { id: 'fixed-income', category: 'allocation' },
  'bonds': { id: 'fixed-income', category: 'allocation' },
  'treasury bonds': { id: 'fixed-income', category: 'allocation' },
  'corporate bonds': { id: 'fixed-income', category: 'allocation' },
  'real estate': { id: 'real-estate', category: 'allocation' },
  'reits': { id: 'real-estate', category: 'allocation' },
  'alternatives': { id: 'alternatives', category: 'allocation' },
  'alternative investments': { id: 'alternatives', category: 'allocation' },
  'commodities': { id: 'alternatives', category: 'allocation' },
  'cash': { id: 'cash', category: 'allocation' },
  'money market': { id: 'cash', category: 'allocation' },
  
  // Risk Concepts
  'risk tolerance': { id: 'risk-tolerance', category: 'risk' },
  'risk capacity': { id: 'risk-capacity', category: 'risk' },
  'sequence risk': { id: 'sequence-risk', category: 'risk' },
  'sequence of returns': { id: 'sequence-risk', category: 'risk' },
  
  // Strategy Concepts
  'asset allocation': { id: 'asset-allocation', category: 'strategy' },
  'diversification': { id: 'diversification', category: 'strategy' },
  'diversified': { id: 'diversification', category: 'strategy' },
  'rebalancing': { id: 'rebalancing', category: 'strategy' },
  'rebalance': { id: 'rebalancing', category: 'strategy' },
  'compound growth': { id: 'compound-growth', category: 'strategy' },
  'compound interest': { id: 'compound-growth', category: 'strategy' },
  'compounding': { id: 'compound-growth', category: 'strategy' },
  'dollar-cost averaging': { id: 'dollar-cost-averaging', category: 'strategy' },
  'dca': { id: 'dollar-cost-averaging', category: 'strategy' },
};

/**
 * Parses text and replaces known investment terms with clickable components
 * Returns an array of React nodes (text and ClickableTerm components)
 */
export function parseTextForClickableTerms(
  text: string,
  onTermClick: (concept: ConceptItem) => void
): ReactNode[] {
  const result: ReactNode[] = [];
  let lastIndex = 0;
  
  // Sort terms by length (longest first) to avoid partial matches
  const sortedTerms = Object.keys(CLICKABLE_TERMS).sort((a, b) => b.length - a.length);
  
  // Create a regex that matches any of the terms (case-insensitive)
  const termPattern = new RegExp(
    `\\b(${sortedTerms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
    'gi'
  );
  
  let match;
  const matches: { index: number; term: string; matchedText: string }[] = [];
  
  while ((match = termPattern.exec(text)) !== null) {
    const matchedText = match[0];
    const normalizedTerm = matchedText.toLowerCase();
    
    if (CLICKABLE_TERMS[normalizedTerm]) {
      matches.push({
        index: match.index,
        term: normalizedTerm,
        matchedText,
      });
    }
  }
  
  // Sort matches by index
  matches.sort((a, b) => a.index - b.index);
  
  // Build result array
  matches.forEach((m, i) => {
    // Add text before this match
    if (m.index > lastIndex) {
      result.push(text.slice(lastIndex, m.index));
    }
    
    // Add the clickable term
    const termInfo = CLICKABLE_TERMS[m.term];
    result.push(
      <ClickableTerm
        key={`term-${i}`}
        term={m.matchedText}
        conceptId={termInfo.id}
        category={termInfo.category}
        onClick={onTermClick}
      />
    );
    
    lastIndex = m.index + m.matchedText.length;
  });
  
  // Add remaining text
  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex));
  }
  
  return result.length > 0 ? result : [text];
}

export default ClickableTerm;
