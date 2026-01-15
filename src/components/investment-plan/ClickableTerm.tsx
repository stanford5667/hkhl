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
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
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
        "inline-flex items-center gap-0.5 font-medium",
        "text-blue-400/90 hover:text-blue-300",
        "underline decoration-dotted decoration-blue-400/50 underline-offset-2",
        "hover:decoration-blue-300 transition-all duration-200",
        "cursor-pointer active:scale-[0.98]",
        "focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-400/50 rounded-sm",
        className
      )}
    >
      {children || term}
    </button>
  );
}

// Comprehensive investment terms - greatly expanded
// Maps display terms to concept IDs
export const CLICKABLE_TERMS: Record<string, { id: string; category: ConceptItem['category'] }> = {
  // ═══════════════════════════════════════════════════════════════════════════════
  // METRICS & PERFORMANCE
  // ═══════════════════════════════════════════════════════════════════════════════
  'expected return': { id: 'expected-return', category: 'metric' },
  'expected returns': { id: 'expected-return', category: 'metric' },
  'annual return': { id: 'expected-return', category: 'metric' },
  'annual returns': { id: 'expected-return', category: 'metric' },
  'average return': { id: 'expected-return', category: 'metric' },
  'average returns': { id: 'expected-return', category: 'metric' },
  'total return': { id: 'expected-return', category: 'metric' },
  'rate of return': { id: 'expected-return', category: 'metric' },
  'max drawdown': { id: 'max-drawdown', category: 'risk' },
  'maximum drawdown': { id: 'max-drawdown', category: 'risk' },
  'drawdown': { id: 'max-drawdown', category: 'risk' },
  'peak-to-trough': { id: 'max-drawdown', category: 'risk' },
  'volatility': { id: 'volatility', category: 'risk' },
  'standard deviation': { id: 'volatility', category: 'risk' },
  'variance': { id: 'volatility', category: 'risk' },
  'price swings': { id: 'volatility', category: 'risk' },
  'market volatility': { id: 'volatility', category: 'risk' },
  'sharpe ratio': { id: 'sharpe-ratio', category: 'metric' },
  'risk-adjusted return': { id: 'sharpe-ratio', category: 'metric' },
  'risk-adjusted returns': { id: 'sharpe-ratio', category: 'metric' },
  'sortino ratio': { id: 'sharpe-ratio', category: 'metric' },
  'alpha': { id: 'alpha', category: 'metric' },
  'excess return': { id: 'alpha', category: 'metric' },
  'beta': { id: 'beta', category: 'metric' },
  'market sensitivity': { id: 'beta', category: 'metric' },
  'correlation': { id: 'correlation', category: 'metric' },
  'r-squared': { id: 'correlation', category: 'metric' },
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // TIME & CAPITAL
  // ═══════════════════════════════════════════════════════════════════════════════
  'time horizon': { id: 'time-horizon', category: 'term' },
  'investment horizon': { id: 'time-horizon', category: 'term' },
  'holding period': { id: 'time-horizon', category: 'term' },
  'long-term': { id: 'time-horizon', category: 'term' },
  'short-term': { id: 'time-horizon', category: 'term' },
  'medium-term': { id: 'time-horizon', category: 'term' },
  'investment capital': { id: 'investment-capital', category: 'term' },
  'initial investment': { id: 'investment-capital', category: 'term' },
  'starting capital': { id: 'investment-capital', category: 'term' },
  'principal': { id: 'investment-capital', category: 'term' },
  'lump sum': { id: 'investment-capital', category: 'term' },
  'monthly contribution': { id: 'monthly-contribution', category: 'term' },
  'monthly contributions': { id: 'monthly-contribution', category: 'term' },
  'regular contributions': { id: 'monthly-contribution', category: 'term' },
  'automatic investments': { id: 'monthly-contribution', category: 'term' },
  'recurring investment': { id: 'monthly-contribution', category: 'term' },
  'savings rate': { id: 'monthly-contribution', category: 'term' },
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // ASSET CLASSES - EQUITIES
  // ═══════════════════════════════════════════════════════════════════════════════
  'us equities': { id: 'us-equities', category: 'allocation' },
  'u.s. equities': { id: 'us-equities', category: 'allocation' },
  'domestic stocks': { id: 'us-equities', category: 'allocation' },
  'stocks': { id: 'us-equities', category: 'allocation' },
  'stock market': { id: 'us-equities', category: 'allocation' },
  'equities': { id: 'us-equities', category: 'allocation' },
  'equity': { id: 'us-equities', category: 'allocation' },
  'shares': { id: 'us-equities', category: 'allocation' },
  's&p 500': { id: 'us-equities', category: 'allocation' },
  'large cap': { id: 'large-cap', category: 'allocation' },
  'large-cap': { id: 'large-cap', category: 'allocation' },
  'mid cap': { id: 'mid-cap', category: 'allocation' },
  'mid-cap': { id: 'mid-cap', category: 'allocation' },
  'small cap': { id: 'small-cap', category: 'allocation' },
  'small-cap': { id: 'small-cap', category: 'allocation' },
  'growth stocks': { id: 'growth-stocks', category: 'allocation' },
  'value stocks': { id: 'value-stocks', category: 'allocation' },
  'dividend stocks': { id: 'dividend-stocks', category: 'allocation' },
  'blue chip': { id: 'blue-chip', category: 'allocation' },
  'blue-chip': { id: 'blue-chip', category: 'allocation' },
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // ASSET CLASSES - INTERNATIONAL
  // ═══════════════════════════════════════════════════════════════════════════════
  'international': { id: 'international-equities', category: 'allocation' },
  'international stocks': { id: 'international-equities', category: 'allocation' },
  'international equities': { id: 'international-equities', category: 'allocation' },
  'foreign stocks': { id: 'international-equities', category: 'allocation' },
  'global stocks': { id: 'international-equities', category: 'allocation' },
  'emerging markets': { id: 'emerging-markets', category: 'allocation' },
  'emerging market': { id: 'emerging-markets', category: 'allocation' },
  'developed markets': { id: 'developed-markets', category: 'allocation' },
  'developed market': { id: 'developed-markets', category: 'allocation' },
  'frontier markets': { id: 'emerging-markets', category: 'allocation' },
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // ASSET CLASSES - FIXED INCOME
  // ═══════════════════════════════════════════════════════════════════════════════
  'fixed income': { id: 'fixed-income', category: 'allocation' },
  'bonds': { id: 'fixed-income', category: 'allocation' },
  'bond': { id: 'fixed-income', category: 'allocation' },
  'treasury bonds': { id: 'treasuries', category: 'allocation' },
  'treasuries': { id: 'treasuries', category: 'allocation' },
  'treasury': { id: 'treasuries', category: 'allocation' },
  't-bills': { id: 'treasuries', category: 'allocation' },
  'corporate bonds': { id: 'corporate-bonds', category: 'allocation' },
  'investment-grade': { id: 'corporate-bonds', category: 'allocation' },
  'high-yield bonds': { id: 'high-yield', category: 'allocation' },
  'junk bonds': { id: 'high-yield', category: 'allocation' },
  'municipal bonds': { id: 'municipal-bonds', category: 'allocation' },
  'muni bonds': { id: 'municipal-bonds', category: 'allocation' },
  'munis': { id: 'municipal-bonds', category: 'allocation' },
  'bond yield': { id: 'yield', category: 'metric' },
  'yield': { id: 'yield', category: 'metric' },
  'coupon': { id: 'yield', category: 'metric' },
  'duration': { id: 'duration', category: 'metric' },
  'credit quality': { id: 'credit-quality', category: 'risk' },
  'credit risk': { id: 'credit-quality', category: 'risk' },
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // ASSET CLASSES - ALTERNATIVES
  // ═══════════════════════════════════════════════════════════════════════════════
  'real estate': { id: 'real-estate', category: 'allocation' },
  'reits': { id: 'real-estate', category: 'allocation' },
  'reit': { id: 'real-estate', category: 'allocation' },
  'property': { id: 'real-estate', category: 'allocation' },
  'alternatives': { id: 'alternatives', category: 'allocation' },
  'alternative investments': { id: 'alternatives', category: 'allocation' },
  'commodities': { id: 'commodities', category: 'allocation' },
  'commodity': { id: 'commodities', category: 'allocation' },
  'gold': { id: 'gold', category: 'allocation' },
  'precious metals': { id: 'gold', category: 'allocation' },
  'hedge funds': { id: 'hedge-funds', category: 'allocation' },
  'private equity': { id: 'private-equity', category: 'allocation' },
  'cryptocurrency': { id: 'crypto', category: 'allocation' },
  'crypto': { id: 'crypto', category: 'allocation' },
  'bitcoin': { id: 'crypto', category: 'allocation' },
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // ASSET CLASSES - CASH
  // ═══════════════════════════════════════════════════════════════════════════════
  'cash': { id: 'cash', category: 'allocation' },
  'money market': { id: 'cash', category: 'allocation' },
  'savings': { id: 'cash', category: 'allocation' },
  'liquidity': { id: 'liquidity', category: 'term' },
  'liquid assets': { id: 'liquidity', category: 'term' },
  'emergency fund': { id: 'emergency-fund', category: 'term' },
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // RISK CONCEPTS
  // ═══════════════════════════════════════════════════════════════════════════════
  'risk tolerance': { id: 'risk-tolerance', category: 'risk' },
  'risk appetite': { id: 'risk-tolerance', category: 'risk' },
  'risk averse': { id: 'risk-tolerance', category: 'risk' },
  'risk-averse': { id: 'risk-tolerance', category: 'risk' },
  'risk capacity': { id: 'risk-capacity', category: 'risk' },
  'financial capacity': { id: 'risk-capacity', category: 'risk' },
  'risk required': { id: 'risk-required', category: 'risk' },
  'sequence risk': { id: 'sequence-risk', category: 'risk' },
  'sequence of returns': { id: 'sequence-risk', category: 'risk' },
  'market risk': { id: 'market-risk', category: 'risk' },
  'systematic risk': { id: 'market-risk', category: 'risk' },
  'unsystematic risk': { id: 'unsystematic-risk', category: 'risk' },
  'concentration risk': { id: 'concentration-risk', category: 'risk' },
  'inflation risk': { id: 'inflation-risk', category: 'risk' },
  'inflation': { id: 'inflation-risk', category: 'risk' },
  'purchasing power': { id: 'inflation-risk', category: 'risk' },
  'interest rate risk': { id: 'interest-rate-risk', category: 'risk' },
  'currency risk': { id: 'currency-risk', category: 'risk' },
  'forex risk': { id: 'currency-risk', category: 'risk' },
  'downside risk': { id: 'max-drawdown', category: 'risk' },
  'tail risk': { id: 'tail-risk', category: 'risk' },
  'black swan': { id: 'tail-risk', category: 'risk' },
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // STRATEGY CONCEPTS
  // ═══════════════════════════════════════════════════════════════════════════════
  'asset allocation': { id: 'asset-allocation', category: 'strategy' },
  'allocation': { id: 'asset-allocation', category: 'strategy' },
  'portfolio allocation': { id: 'asset-allocation', category: 'strategy' },
  'strategic allocation': { id: 'asset-allocation', category: 'strategy' },
  'tactical allocation': { id: 'tactical-allocation', category: 'strategy' },
  'diversification': { id: 'diversification', category: 'strategy' },
  'diversified': { id: 'diversification', category: 'strategy' },
  'diversify': { id: 'diversification', category: 'strategy' },
  'spreading risk': { id: 'diversification', category: 'strategy' },
  'rebalancing': { id: 'rebalancing', category: 'strategy' },
  'rebalance': { id: 'rebalancing', category: 'strategy' },
  'portfolio rebalancing': { id: 'rebalancing', category: 'strategy' },
  'compound growth': { id: 'compound-growth', category: 'strategy' },
  'compound interest': { id: 'compound-growth', category: 'strategy' },
  'compounding': { id: 'compound-growth', category: 'strategy' },
  'power of compounding': { id: 'compound-growth', category: 'strategy' },
  'dollar-cost averaging': { id: 'dollar-cost-averaging', category: 'strategy' },
  'dca': { id: 'dollar-cost-averaging', category: 'strategy' },
  'cost averaging': { id: 'dollar-cost-averaging', category: 'strategy' },
  'buy and hold': { id: 'buy-and-hold', category: 'strategy' },
  'passive investing': { id: 'passive-investing', category: 'strategy' },
  'passive': { id: 'passive-investing', category: 'strategy' },
  'active investing': { id: 'active-investing', category: 'strategy' },
  'active management': { id: 'active-investing', category: 'strategy' },
  'index investing': { id: 'index-investing', category: 'strategy' },
  'indexing': { id: 'index-investing', category: 'strategy' },
  'value investing': { id: 'value-investing', category: 'strategy' },
  'growth investing': { id: 'growth-investing', category: 'strategy' },
  'income investing': { id: 'income-investing', category: 'strategy' },
  'dividend investing': { id: 'dividend-investing', category: 'strategy' },
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // INVESTMENT VEHICLES
  // ═══════════════════════════════════════════════════════════════════════════════
  'etf': { id: 'etf', category: 'term' },
  'etfs': { id: 'etf', category: 'term' },
  'exchange-traded fund': { id: 'etf', category: 'term' },
  'exchange-traded funds': { id: 'etf', category: 'term' },
  'mutual fund': { id: 'mutual-fund', category: 'term' },
  'mutual funds': { id: 'mutual-fund', category: 'term' },
  'index fund': { id: 'index-fund', category: 'term' },
  'index funds': { id: 'index-fund', category: 'term' },
  'target date fund': { id: 'target-date-fund', category: 'term' },
  'target-date fund': { id: 'target-date-fund', category: 'term' },
  '401k': { id: '401k', category: 'term' },
  '401(k)': { id: '401k', category: 'term' },
  'ira': { id: 'ira', category: 'term' },
  'roth ira': { id: 'roth-ira', category: 'term' },
  'traditional ira': { id: 'traditional-ira', category: 'term' },
  'brokerage account': { id: 'brokerage-account', category: 'term' },
  'taxable account': { id: 'brokerage-account', category: 'term' },
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // FEES & COSTS
  // ═══════════════════════════════════════════════════════════════════════════════
  'expense ratio': { id: 'expense-ratio', category: 'term' },
  'expense ratios': { id: 'expense-ratio', category: 'term' },
  'management fee': { id: 'expense-ratio', category: 'term' },
  'management fees': { id: 'expense-ratio', category: 'term' },
  'fees': { id: 'expense-ratio', category: 'term' },
  'transaction costs': { id: 'transaction-costs', category: 'term' },
  'trading costs': { id: 'transaction-costs', category: 'term' },
  'tax efficiency': { id: 'tax-efficiency', category: 'term' },
  'tax-efficient': { id: 'tax-efficiency', category: 'term' },
  'capital gains': { id: 'capital-gains', category: 'term' },
  'capital gains tax': { id: 'capital-gains', category: 'term' },
  'tax-loss harvesting': { id: 'tax-loss-harvesting', category: 'term' },
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // PORTFOLIO TERMS
  // ═══════════════════════════════════════════════════════════════════════════════
  'portfolio': { id: 'portfolio', category: 'term' },
  'portfolios': { id: 'portfolio', category: 'term' },
  'position': { id: 'position', category: 'term' },
  'positions': { id: 'position', category: 'term' },
  'holdings': { id: 'position', category: 'term' },
  'weighting': { id: 'weighting', category: 'term' },
  'weight': { id: 'weighting', category: 'term' },
  'benchmark': { id: 'benchmark', category: 'term' },
  'market cap': { id: 'market-cap', category: 'term' },
  'market capitalization': { id: 'market-cap', category: 'term' },
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // BEHAVIORAL FINANCE
  // ═══════════════════════════════════════════════════════════════════════════════
  'behavioral finance': { id: 'behavioral-finance', category: 'strategy' },
  'emotional investing': { id: 'behavioral-finance', category: 'strategy' },
  'panic selling': { id: 'panic-selling', category: 'risk' },
  'fomo': { id: 'fomo', category: 'risk' },
  'fear of missing out': { id: 'fomo', category: 'risk' },
  'market timing': { id: 'market-timing', category: 'risk' },
  'time in the market': { id: 'time-in-market', category: 'strategy' },
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // GENERAL FINANCIAL TERMS
  // ═══════════════════════════════════════════════════════════════════════════════
  'net worth': { id: 'net-worth', category: 'term' },
  'wealth building': { id: 'wealth-building', category: 'term' },
  'financial independence': { id: 'financial-independence', category: 'term' },
  'retirement': { id: 'retirement', category: 'term' },
  'retirement planning': { id: 'retirement', category: 'term' },
  'financial goals': { id: 'financial-goals', category: 'term' },
  'investment goals': { id: 'financial-goals', category: 'term' },
  'bull market': { id: 'bull-market', category: 'term' },
  'bear market': { id: 'bear-market', category: 'term' },
  'market correction': { id: 'correction', category: 'term' },
  'correction': { id: 'correction', category: 'term' },
  'recession': { id: 'recession', category: 'term' },
  'recovery': { id: 'recovery', category: 'term' },
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
  
  // Filter overlapping matches (keep first occurrence)
  const filteredMatches = matches.filter((m, i) => {
    if (i === 0) return true;
    const prev = matches[i - 1];
    return m.index >= prev.index + prev.matchedText.length;
  });
  
  // Build result array
  filteredMatches.forEach((m, i) => {
    // Add text before this match
    if (m.index > lastIndex) {
      result.push(text.slice(lastIndex, m.index));
    }
    
    // Add the clickable term
    const termInfo = CLICKABLE_TERMS[m.term];
    result.push(
      <ClickableTerm
        key={`term-${i}-${m.index}`}
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
