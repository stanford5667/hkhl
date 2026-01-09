import { supabase } from '@/integrations/supabase/client';

// =====================
// Types
// =====================

export interface ScreenerFilters {
  query?: string;
  minMarketCap?: number;
  maxMarketCap?: number;
  minPrice?: number;
  maxPrice?: number;
  sectors?: string[];
  minChange1D?: number;
  maxChange1D?: number;
  minVolume?: number;
  minRelativeVolume?: number;
  sortBy?: 'volume' | 'change' | 'price' | 'marketCap';
  sortDirection?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface ScreenerResult {
  symbol: string;
  name: string;
  sector: string;
  sicDescription: string | null;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  prevVolume: number;
  relativeVolume: number | null;
  marketCap: number | null;
  high: number;
  low: number;
  open: number;
  vwap: number | null;
  exchange: string | null;
  type: string | null;
  matchScore?: number;
}

export interface ScreenerResponse {
  ok: boolean;
  count: number;
  results: ScreenerResult[];
  pagination: {
    offset: number;
    limit: number;
    hasMore: boolean;
    total: number;
  };
  error?: string;
  fallback?: boolean;
}

// =====================
// Constants
// =====================

export const MARKET_CAP_TIERS = {
  mega: { min: 200_000_000_000, max: undefined, label: 'Mega Cap ($200B+)' },
  large: { min: 10_000_000_000, max: 200_000_000_000, label: 'Large Cap ($10B-$200B)' },
  mid: { min: 2_000_000_000, max: 10_000_000_000, label: 'Mid Cap ($2B-$10B)' },
  small: { min: 300_000_000, max: 2_000_000_000, label: 'Small Cap ($300M-$2B)' },
  micro: { min: 0, max: 300_000_000, label: 'Micro Cap (<$300M)' },
};

export const SECTORS = [
  'Technology',
  'Healthcare',
  'Financials',
  'Consumer Discretionary',
  'Consumer Staples',
  'Industrials',
  'Energy',
  'Utilities',
  'Real Estate',
  'Materials',
  'Communication Services',
  'Transportation',
  'Agriculture',
  'Mining',
  'Construction',
];

// =====================
// Quick Screens
// =====================

export const QUICK_SCREENS: Record<string, { name: string; description: string; filters: ScreenerFilters }> = {
  topGainers: {
    name: 'Top Gainers',
    description: 'Stocks up 3%+ today',
    filters: { minChange1D: 3, sortBy: 'change', sortDirection: 'desc', limit: 50 },
  },
  topLosers: {
    name: 'Top Losers',
    description: 'Stocks down 3%+ today',
    filters: { maxChange1D: -3, sortBy: 'change', sortDirection: 'asc', limit: 50 },
  },
  mostActive: {
    name: 'Most Active',
    description: 'Highest trading volume',
    filters: { sortBy: 'volume', sortDirection: 'desc', limit: 50 },
  },
  unusualVolume: {
    name: 'Unusual Volume',
    description: '3x+ relative volume vs yesterday',
    filters: { minRelativeVolume: 3, sortBy: 'volume', sortDirection: 'desc', limit: 50 },
  },
  megaCap: {
    name: 'Mega Cap',
    description: '$200B+ market cap',
    filters: { minMarketCap: 200_000_000_000, sortBy: 'marketCap', sortDirection: 'desc', limit: 50 },
  },
  smallCapMomentum: {
    name: 'Small Cap Momentum',
    description: 'Small caps up 5%+ today',
    filters: { maxMarketCap: 2_000_000_000, minChange1D: 5, sortBy: 'change', sortDirection: 'desc', limit: 50 },
  },
  techStocks: {
    name: 'Technology',
    description: 'Tech sector stocks',
    filters: { sectors: ['Technology'], sortBy: 'volume', sortDirection: 'desc', limit: 50 },
  },
  healthcareStocks: {
    name: 'Healthcare',
    description: 'Healthcare & biotech stocks',
    filters: { sectors: ['Healthcare'], sortBy: 'volume', sortDirection: 'desc', limit: 50 },
  },
  under10: {
    name: 'Under $10',
    description: 'Low-priced stocks with volume',
    filters: { maxPrice: 10, minVolume: 100000, sortBy: 'volume', sortDirection: 'desc', limit: 50 },
  },
  over100: {
    name: 'Over $100',
    description: 'Higher-priced stocks',
    filters: { minPrice: 100, sortBy: 'volume', sortDirection: 'desc', limit: 50 },
  },
  financials: {
    name: 'Financials',
    description: 'Banks, insurance, fintech',
    filters: { sectors: ['Financials'], sortBy: 'volume', sortDirection: 'desc', limit: 50 },
  },
  energy: {
    name: 'Energy',
    description: 'Oil, gas, renewables',
    filters: { sectors: ['Energy'], sortBy: 'volume', sortDirection: 'desc', limit: 50 },
  },
};

// =====================
// Natural Language Parser
// =====================

export function parseNaturalLanguageQuery(query: string): ScreenerFilters {
  const lowerQuery = query.toLowerCase();
  const filters: ScreenerFilters = {};

  // Market cap parsing
  if (lowerQuery.includes('mega cap') || lowerQuery.includes('mega-cap')) {
    filters.minMarketCap = 200_000_000_000;
  } else if (lowerQuery.includes('large cap') || lowerQuery.includes('large-cap')) {
    filters.minMarketCap = 10_000_000_000;
    filters.maxMarketCap = 200_000_000_000;
  } else if (lowerQuery.includes('mid cap') || lowerQuery.includes('mid-cap')) {
    filters.minMarketCap = 2_000_000_000;
    filters.maxMarketCap = 10_000_000_000;
  } else if (lowerQuery.includes('small cap') || lowerQuery.includes('small-cap')) {
    filters.minMarketCap = 300_000_000;
    filters.maxMarketCap = 2_000_000_000;
  } else if (lowerQuery.includes('micro cap') || lowerQuery.includes('penny')) {
    filters.maxMarketCap = 300_000_000;
  }

  // Price parsing
  const underMatch = lowerQuery.match(/under \$?(\d+)/);
  if (underMatch) {
    filters.maxPrice = parseInt(underMatch[1], 10);
  }
  const aboveMatch = lowerQuery.match(/(?:above|over) \$?(\d+)/);
  if (aboveMatch) {
    filters.minPrice = parseInt(aboveMatch[1], 10);
  }
  const betweenMatch = lowerQuery.match(/between \$?(\d+) and \$?(\d+)/);
  if (betweenMatch) {
    filters.minPrice = parseInt(betweenMatch[1], 10);
    filters.maxPrice = parseInt(betweenMatch[2], 10);
  }

  // Performance parsing
  if (lowerQuery.includes('gainer') || lowerQuery.includes('up today') || lowerQuery.includes('green')) {
    filters.minChange1D = 0;
    filters.sortBy = 'change';
    filters.sortDirection = 'desc';
  }
  if (lowerQuery.includes('loser') || lowerQuery.includes('down today') || lowerQuery.includes('red')) {
    filters.maxChange1D = 0;
    filters.sortBy = 'change';
    filters.sortDirection = 'asc';
  }
  if (lowerQuery.includes('momentum') || lowerQuery.includes('breakout')) {
    filters.minChange1D = 3;
    filters.minRelativeVolume = 2;
    filters.sortBy = 'change';
    filters.sortDirection = 'desc';
  }

  // Volume parsing
  if (lowerQuery.includes('high volume') || lowerQuery.includes('active') || lowerQuery.includes('most traded')) {
    filters.minRelativeVolume = 1.5;
    filters.sortBy = 'volume';
    filters.sortDirection = 'desc';
  }
  if (lowerQuery.includes('unusual volume') || lowerQuery.includes('volume spike')) {
    filters.minRelativeVolume = 3;
    filters.sortBy = 'volume';
    filters.sortDirection = 'desc';
  }

  // Sector parsing
  const sectorKeywords: Record<string, string[]> = {
    'Technology': ['tech', 'technology', 'software', 'ai', 'semiconductor', 'chip', 'saas', 'cloud'],
    'Healthcare': ['health', 'healthcare', 'pharma', 'biotech', 'medical', 'drug', 'vaccine'],
    'Financials': ['finance', 'financial', 'bank', 'banking', 'insurance', 'fintech'],
    'Consumer Discretionary': ['consumer', 'retail', 'e-commerce', 'ecommerce', 'shopping'],
    'Consumer Staples': ['staples', 'food', 'beverage', 'household'],
    'Industrials': ['industrial', 'manufacturing', 'aerospace', 'defense'],
    'Energy': ['energy', 'oil', 'gas', 'solar', 'renewable', 'clean energy'],
    'Utilities': ['utilities', 'utility', 'electric', 'water', 'power'],
    'Real Estate': ['real estate', 'reit', 'property'],
    'Materials': ['materials', 'mining', 'chemicals', 'metals'],
    'Communication Services': ['communication', 'media', 'telecom', 'streaming'],
  };

  const matchedSectors: string[] = [];
  for (const [sector, keywords] of Object.entries(sectorKeywords)) {
    if (keywords.some(kw => lowerQuery.includes(kw))) {
      matchedSectors.push(sector);
    }
  }
  if (matchedSectors.length > 0) {
    filters.sectors = matchedSectors;
  }

  return filters;
}

// =====================
// API Call
// =====================

export async function screenStocksFromPolygon(filters: ScreenerFilters): Promise<ScreenerResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('polygon-screener', {
      body: { filters },
    });

    if (error) {
      console.error('[polygonScreenerService] Edge function error:', error);
      return {
        ok: false,
        count: 0,
        results: [],
        pagination: { offset: 0, limit: 100, hasMore: false, total: 0 },
        error: error.message,
      };
    }

    if (!data.ok) {
      console.warn('[polygonScreenerService] API returned error:', data.error);
      return {
        ok: false,
        count: 0,
        results: [],
        pagination: { offset: 0, limit: 100, hasMore: false, total: 0 },
        error: data.error,
        fallback: data.fallback,
      };
    }

    return data as ScreenerResponse;
  } catch (err) {
    console.error('[polygonScreenerService] Error:', err);
    return {
      ok: false,
      count: 0,
      results: [],
      pagination: { offset: 0, limit: 100, hasMore: false, total: 0 },
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

// =====================
// Formatting Helpers
// =====================

export function formatMarketCap(value: number | null): string {
  if (value === null) return '—';
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(0)}M`;
  return `$${value.toLocaleString()}`;
}

export function formatVolume(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
  return value.toLocaleString();
}

export function formatChange(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}
