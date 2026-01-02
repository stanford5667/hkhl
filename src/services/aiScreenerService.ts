export interface ScreenerCriteria {
  minMarketCap?: number;
  maxMarketCap?: number;
  minPE?: number;
  maxPE?: number;
  minDividendYield?: number;
  maxDividendYield?: number;
  minPrice?: number;
  maxPrice?: number;
  sectors?: string[];
}

export interface ScreenerResult {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  marketCap: number;
  pe: number | null;
  dividendYield: number;
  matchScore: number;
  matchReasons: string[];
}

export interface ScreenerResponse {
  criteria: ScreenerCriteria;
  results: ScreenerResult[];
  explanation: string;
}

// Parse natural language query into structured criteria
export function parseNaturalLanguageQuery(query: string): ScreenerCriteria {
  const lowerQuery = query.toLowerCase();
  const criteria: ScreenerCriteria = {};

  // Market cap parsing
  if (lowerQuery.includes('large cap') || lowerQuery.includes('large-cap')) {
    criteria.minMarketCap = 10_000_000_000; // 10B
  }
  if (lowerQuery.includes('mid cap') || lowerQuery.includes('mid-cap')) {
    criteria.minMarketCap = 2_000_000_000; // 2B
    criteria.maxMarketCap = 10_000_000_000; // 10B
  }
  if (lowerQuery.includes('small cap') || lowerQuery.includes('small-cap')) {
    criteria.maxMarketCap = 2_000_000_000; // 2B
  }

  // P/E ratio parsing
  if (lowerQuery.includes('low p/e') || lowerQuery.includes('low pe') || lowerQuery.includes('value')) {
    criteria.maxPE = 15;
  }
  if (lowerQuery.includes('high p/e') || lowerQuery.includes('growth')) {
    criteria.minPE = 25;
  }

  // Dividend parsing
  if (lowerQuery.includes('high dividend') || lowerQuery.includes('dividend')) {
    criteria.minDividendYield = 3;
  }

  // Price parsing
  const priceMatch = lowerQuery.match(/under \$?(\d+)/);
  if (priceMatch) {
    criteria.maxPrice = parseInt(priceMatch[1], 10);
  }
  const aboveMatch = lowerQuery.match(/above \$?(\d+)/);
  if (aboveMatch) {
    criteria.minPrice = parseInt(aboveMatch[1], 10);
  }

  // Sector parsing
  const sectorKeywords: Record<string, string[]> = {
    'Technology': ['tech', 'technology', 'software', 'ai', 'semiconductor'],
    'Healthcare': ['health', 'healthcare', 'pharma', 'biotech', 'medical'],
    'Financials': ['finance', 'financial', 'bank', 'banking', 'insurance'],
    'Consumer Discretionary': ['consumer', 'retail', 'e-commerce'],
    'Industrials': ['industrial', 'manufacturing', 'aerospace'],
    'Energy': ['energy', 'oil', 'gas', 'solar', 'renewable'],
    'Utilities': ['utilities', 'utility', 'electric', 'water'],
    'Real Estate': ['real estate', 'reit', 'property'],
    'Materials': ['materials', 'mining', 'chemicals'],
    'Communication Services': ['communication', 'media', 'telecom'],
  };

  const matchedSectors: string[] = [];
  for (const [sector, keywords] of Object.entries(sectorKeywords)) {
    if (keywords.some(kw => lowerQuery.includes(kw))) {
      matchedSectors.push(sector);
    }
  }
  if (matchedSectors.length > 0) {
    criteria.sectors = matchedSectors;
  }

  return criteria;
}

// Mock stock database
const MOCK_STOCKS: Omit<ScreenerResult, 'matchScore' | 'matchReasons'>[] = [
  { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology', price: 178.50, marketCap: 2800000000000, pe: 28.5, dividendYield: 0.5 },
  { symbol: 'MSFT', name: 'Microsoft Corp.', sector: 'Technology', price: 378.20, marketCap: 2810000000000, pe: 35.2, dividendYield: 0.8 },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', sector: 'Technology', price: 141.80, marketCap: 1780000000000, pe: 24.1, dividendYield: 0 },
  { symbol: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare', price: 156.30, marketCap: 378000000000, pe: 15.2, dividendYield: 3.1 },
  { symbol: 'JPM', name: 'JPMorgan Chase', sector: 'Financials', price: 195.40, marketCap: 562000000000, pe: 11.8, dividendYield: 2.3 },
  { symbol: 'XOM', name: 'Exxon Mobil', sector: 'Energy', price: 104.20, marketCap: 415000000000, pe: 12.4, dividendYield: 3.4 },
  { symbol: 'PG', name: 'Procter & Gamble', sector: 'Consumer Discretionary', price: 158.70, marketCap: 373000000000, pe: 25.6, dividendYield: 2.4 },
  { symbol: 'VZ', name: 'Verizon', sector: 'Communication Services', price: 38.50, marketCap: 162000000000, pe: 8.7, dividendYield: 6.8 },
  { symbol: 'T', name: 'AT&T Inc.', sector: 'Communication Services', price: 17.20, marketCap: 123000000000, pe: 6.9, dividendYield: 6.5 },
  { symbol: 'NEE', name: 'NextEra Energy', sector: 'Utilities', price: 72.40, marketCap: 148000000000, pe: 20.3, dividendYield: 2.7 },
  { symbol: 'DUK', name: 'Duke Energy', sector: 'Utilities', price: 98.30, marketCap: 76000000000, pe: 17.8, dividendYield: 4.1 },
  { symbol: 'SO', name: 'Southern Company', sector: 'Utilities', price: 71.50, marketCap: 77000000000, pe: 19.2, dividendYield: 3.9 },
  { symbol: 'INTC', name: 'Intel Corp.', sector: 'Technology', price: 31.20, marketCap: 132000000000, pe: null, dividendYield: 1.6 },
  { symbol: 'F', name: 'Ford Motor', sector: 'Consumer Discretionary', price: 12.40, marketCap: 49000000000, pe: 6.8, dividendYield: 4.8 },
  { symbol: 'GM', name: 'General Motors', sector: 'Consumer Discretionary', price: 35.60, marketCap: 49000000000, pe: 5.2, dividendYield: 1.1 },
  { symbol: 'SCHW', name: 'Charles Schwab', sector: 'Financials', price: 71.30, marketCap: 130000000000, pe: 22.4, dividendYield: 1.4 },
  { symbol: 'PFE', name: 'Pfizer Inc.', sector: 'Healthcare', price: 28.90, marketCap: 163000000000, pe: 12.1, dividendYield: 5.7 },
  { symbol: 'ABBV', name: 'AbbVie Inc.', sector: 'Healthcare', price: 154.20, marketCap: 272000000000, pe: 13.5, dividendYield: 3.9 },
  { symbol: 'CVX', name: 'Chevron Corp.', sector: 'Energy', price: 151.80, marketCap: 280000000000, pe: 11.9, dividendYield: 4.0 },
  { symbol: 'SPG', name: 'Simon Property', sector: 'Real Estate', price: 148.50, marketCap: 48000000000, pe: 19.8, dividendYield: 5.1 },
];

// Screen stocks based on criteria
export function screenStocks(criteria: ScreenerCriteria): ScreenerResult[] {
  return MOCK_STOCKS.map(stock => {
    const matchReasons: string[] = [];
    let score = 50; // Base score

    // Market cap checks
    if (criteria.minMarketCap !== undefined) {
      if (stock.marketCap >= criteria.minMarketCap) {
        score += 10;
        matchReasons.push('Large cap');
      } else {
        score -= 20;
      }
    }
    if (criteria.maxMarketCap !== undefined) {
      if (stock.marketCap <= criteria.maxMarketCap) {
        score += 10;
        matchReasons.push('Small/Mid cap');
      } else {
        score -= 20;
      }
    }

    // P/E checks
    if (criteria.maxPE !== undefined && stock.pe !== null) {
      if (stock.pe <= criteria.maxPE) {
        score += 15;
        matchReasons.push(`Low P/E (${stock.pe.toFixed(1)})`);
      } else {
        score -= 15;
      }
    }
    if (criteria.minPE !== undefined && stock.pe !== null) {
      if (stock.pe >= criteria.minPE) {
        score += 10;
        matchReasons.push(`High P/E (${stock.pe.toFixed(1)})`);
      } else {
        score -= 10;
      }
    }

    // Dividend checks
    if (criteria.minDividendYield !== undefined) {
      if (stock.dividendYield >= criteria.minDividendYield) {
        score += 15;
        matchReasons.push(`High dividend (${stock.dividendYield.toFixed(1)}%)`);
      } else {
        score -= 10;
      }
    }

    // Price checks
    if (criteria.maxPrice !== undefined) {
      if (stock.price <= criteria.maxPrice) {
        score += 10;
        matchReasons.push(`Under $${criteria.maxPrice}`);
      } else {
        score -= 25;
      }
    }
    if (criteria.minPrice !== undefined) {
      if (stock.price >= criteria.minPrice) {
        score += 5;
        matchReasons.push(`Above $${criteria.minPrice}`);
      } else {
        score -= 15;
      }
    }

    // Sector checks
    if (criteria.sectors && criteria.sectors.length > 0) {
      if (criteria.sectors.includes(stock.sector)) {
        score += 20;
        matchReasons.push(`${stock.sector} sector`);
      } else {
        score -= 30;
      }
    }

    return {
      ...stock,
      matchScore: Math.max(0, Math.min(100, score)),
      matchReasons,
    };
  })
    .filter(stock => stock.matchScore >= 40)
    .sort((a, b) => b.matchScore - a.matchScore);
}

// Generate explanation for the screen
function generateExplanation(criteria: ScreenerCriteria, resultCount: number): string {
  const parts: string[] = [];

  if (criteria.minMarketCap && criteria.minMarketCap >= 10_000_000_000) {
    parts.push('large-cap companies');
  } else if (criteria.maxMarketCap && criteria.maxMarketCap <= 2_000_000_000) {
    parts.push('small-cap companies');
  } else if (criteria.minMarketCap && criteria.maxMarketCap) {
    parts.push('mid-cap companies');
  }

  if (criteria.sectors && criteria.sectors.length > 0) {
    parts.push(`in the ${criteria.sectors.join(', ')} sector${criteria.sectors.length > 1 ? 's' : ''}`);
  }

  if (criteria.maxPE) {
    parts.push(`with P/E below ${criteria.maxPE}`);
  }

  if (criteria.minDividendYield) {
    parts.push(`paying dividends of ${criteria.minDividendYield}%+`);
  }

  if (criteria.maxPrice) {
    parts.push(`priced under $${criteria.maxPrice}`);
  }

  if (parts.length === 0) {
    return `Found ${resultCount} stocks matching your criteria.`;
  }

  return `Found ${resultCount} ${parts.join(' ')} matching your criteria.`;
}

// Main AI screening function
export function aiScreenStocks(query: string): ScreenerResponse {
  const criteria = parseNaturalLanguageQuery(query);
  const results = screenStocks(criteria);
  const explanation = generateExplanation(criteria, results.length);

  return {
    criteria,
    results,
    explanation,
  };
}

// Quick screen presets
export const QUICK_SCREENS: Record<string, { query: string; description: string }> = {
  dividendChampions: {
    query: 'high dividend large cap',
    description: 'Large caps with 3%+ dividend yield',
  },
  valuePlays: {
    query: 'value stocks low P/E',
    description: 'Undervalued stocks with P/E under 15',
  },
  growthLeaders: {
    query: 'large cap tech growth',
    description: 'High-growth technology leaders',
  },
};

// Format market cap for display
export function formatMarketCap(value: number): string {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  return `$${value.toLocaleString()}`;
}
