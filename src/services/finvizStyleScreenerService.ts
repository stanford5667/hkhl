import { supabase } from '@/integrations/supabase/client';
import type { 
  ScreenerCriteria, 
  ScreenerResponse, 
  ScreenerResult, 
  QuickScreen,
  Sector,
  MarketCapSize 
} from '@/types/screener';

// ============================================
// QUICK SCREENS (30+ Presets)
// ============================================

export const QUICK_SCREENS: Record<string, QuickScreen> = {
  // Market Movers
  top_gainers: {
    name: 'Top Gainers',
    description: 'Stocks up 5%+ today',
    criteria: { minPerfToday: 5, minVolume: 500000, sortBy: 'change', sortOrder: 'desc' },
    category: 'movers'
  },
  top_losers: {
    name: 'Top Losers',
    description: 'Stocks down 5%+ today',
    criteria: { maxPerfToday: -5, minVolume: 500000, sortBy: 'change', sortOrder: 'asc' },
    category: 'movers'
  },
  most_active: {
    name: 'Most Active',
    description: 'Highest volume today',
    criteria: { minVolume: 10000000, sortBy: 'volume', sortOrder: 'desc' },
    category: 'movers'
  },
  unusual_volume: {
    name: 'Unusual Volume',
    description: 'Volume 3x+ above average',
    criteria: { minRelativeVolume: 3, minVolume: 500000 },
    category: 'movers'
  },
  gap_up: {
    name: 'Gap Up',
    description: 'Gapped up 3%+ at open',
    criteria: { minGapUp: 3, minVolume: 500000 },
    category: 'movers'
  },
  gap_down: {
    name: 'Gap Down',
    description: 'Gapped down 3%+ at open',
    criteria: { minGapDown: 3, minVolume: 500000 },
    category: 'movers'
  },

  // Technical
  new_52w_high: {
    name: '52-Week Highs',
    description: 'At or near 52-week highs',
    criteria: { highLow52W: 'new_high', minVolume: 500000 },
    category: 'technical'
  },
  new_52w_low: {
    name: '52-Week Lows',
    description: 'At or near 52-week lows',
    criteria: { highLow52W: 'new_low', minVolume: 500000 },
    category: 'technical'
  },
  oversold_rsi: {
    name: 'Oversold (RSI < 30)',
    description: 'RSI below 30, potentially oversold',
    criteria: { rsiFilter: 'oversold_30', minVolume: 500000 },
    category: 'technical'
  },
  overbought_rsi: {
    name: 'Overbought (RSI > 70)',
    description: 'RSI above 70, potentially overbought',
    criteria: { rsiFilter: 'overbought_70', minVolume: 500000 },
    category: 'technical'
  },
  golden_cross: {
    name: 'Golden Cross',
    description: 'SMA50 crossed above SMA200',
    criteria: { sma50vs200: 'cross_above', minVolume: 500000 },
    category: 'technical'
  },
  death_cross: {
    name: 'Death Cross',
    description: 'SMA50 crossed below SMA200',
    criteria: { sma50vs200: 'cross_below', minVolume: 500000 },
    category: 'technical'
  },
  above_200_sma: {
    name: 'Above 200 SMA',
    description: 'Price above 200-day moving average',
    criteria: { sma200: 'price_above', minVolume: 500000 },
    category: 'technical'
  },
  below_200_sma: {
    name: 'Below 200 SMA',
    description: 'Price below 200-day moving average',
    criteria: { sma200: 'price_below', minVolume: 500000 },
    category: 'technical'
  },

  // Fundamental
  high_dividend: {
    name: 'High Dividend (4%+)',
    description: 'Dividend yield 4% or higher',
    criteria: { minDividendYield: 4, minMarketCap: 1000000000 },
    category: 'fundamental'
  },
  value_stocks: {
    name: 'Value Stocks',
    description: 'Low P/E under 12',
    criteria: { maxPE: 12, minPE: 0, minMarketCap: 1000000000 },
    category: 'fundamental'
  },
  high_growth: {
    name: 'High Growth',
    description: 'EPS growth 25%+',
    criteria: { minEPSGrowthThisYear: 25, minMarketCap: 1000000000 },
    category: 'fundamental'
  },
  low_debt: {
    name: 'Low Debt',
    description: 'Debt/Equity under 0.3',
    criteria: { maxDebtEquity: 0.3, minMarketCap: 1000000000 },
    category: 'fundamental'
  },
  high_roe: {
    name: 'High ROE (20%+)',
    description: 'Return on Equity 20%+',
    criteria: { minROE: 20, minMarketCap: 1000000000 },
    category: 'fundamental'
  },
  undervalued_growth: {
    name: 'Undervalued Growth',
    description: 'PEG ratio under 1',
    criteria: { maxPEG: 1, minPEG: 0, minMarketCap: 1000000000 },
    category: 'fundamental'
  },
  profitable: {
    name: 'Profitable',
    description: 'Positive net margin',
    criteria: { minNetMargin: 0, minMarketCap: 1000000000 },
    category: 'fundamental'
  },

  // Signals
  insider_buying: {
    name: 'Insider Buying',
    description: 'Recent insider purchases',
    criteria: { insiderTransactions: 'buying', minMarketCap: 500000000 },
    category: 'signals'
  },
  institutional_buying: {
    name: 'Institutional Buying',
    description: 'Increased institutional ownership',
    criteria: { institutionalTransactions: 'buying', minMarketCap: 1000000000 },
    category: 'signals'
  },
  analyst_upgrade: {
    name: 'Analyst Upgrades',
    description: 'Recent analyst upgrades',
    criteria: { analystRecentAction: 'upgrade', minMarketCap: 1000000000 },
    category: 'signals'
  },
  heavily_shorted: {
    name: 'Heavily Shorted',
    description: 'Short interest 20%+',
    criteria: { minFloatShort: 20, minVolume: 500000 },
    category: 'signals'
  },
  earnings_this_week: {
    name: 'Earnings This Week',
    description: 'Reporting earnings this week',
    criteria: { earningsDate: 'this_week', minMarketCap: 1000000000 },
    category: 'signals'
  },

  // Market Cap Segments
  mega_cap: {
    name: 'Mega Cap ($200B+)',
    description: 'Largest companies',
    criteria: { marketCap: 'mega' },
    category: 'fundamental'
  },
  large_cap: {
    name: 'Large Cap ($10-200B)',
    description: 'Large established companies',
    criteria: { marketCap: 'large' },
    category: 'fundamental'
  },
  mid_cap: {
    name: 'Mid Cap ($2-10B)',
    description: 'Mid-sized companies',
    criteria: { marketCap: 'mid' },
    category: 'fundamental'
  },
  small_cap: {
    name: 'Small Cap ($300M-2B)',
    description: 'Smaller companies',
    criteria: { marketCap: 'small' },
    category: 'fundamental'
  },

  // Patterns
  double_bottom: {
    name: 'Double Bottom',
    description: 'Double bottom chart pattern',
    criteria: { chartPattern: ['double_bottom'], minVolume: 500000 },
    category: 'patterns'
  },
  breakout: {
    name: 'Breakout',
    description: 'Breaking out of consolidation',
    criteria: { highLow52W: 'new_high', minRelativeVolume: 2, minPerfToday: 2 },
    category: 'patterns'
  }
};

// ============================================
// NATURAL LANGUAGE PARSER
// ============================================

const SECTOR_KEYWORDS: Record<string, Sector[]> = {
  'tech': ['Technology'],
  'technology': ['Technology'],
  'software': ['Technology'],
  'healthcare': ['Healthcare'],
  'health': ['Healthcare'],
  'biotech': ['Healthcare'],
  'pharma': ['Healthcare'],
  'financial': ['Financial Services'],
  'finance': ['Financial Services'],
  'bank': ['Financial Services'],
  'banks': ['Financial Services'],
  'consumer': ['Consumer Cyclical', 'Consumer Defensive'],
  'retail': ['Consumer Cyclical'],
  'energy': ['Energy'],
  'oil': ['Energy'],
  'utilities': ['Utilities'],
  'utility': ['Utilities'],
  'industrial': ['Industrials'],
  'industrials': ['Industrials'],
  'materials': ['Basic Materials'],
  'real estate': ['Real Estate'],
  'reit': ['Real Estate'],
  'communication': ['Communication Services'],
  'telecom': ['Communication Services']
};

const MARKET_CAP_KEYWORDS: Record<string, MarketCapSize> = {
  'mega': 'mega',
  'mega cap': 'mega',
  'large': 'large',
  'large cap': 'large',
  'mid': 'mid',
  'mid cap': 'mid',
  'small': 'small',
  'small cap': 'small',
  'micro': 'micro',
  'micro cap': 'micro',
  'penny': 'nano',
  'nano': 'nano'
};

export function parseNaturalLanguageQuery(query: string): ScreenerCriteria {
  const lowerQuery = query.toLowerCase();
  const criteria: ScreenerCriteria = {};

  // Market Cap
  for (const [keyword, size] of Object.entries(MARKET_CAP_KEYWORDS)) {
    if (lowerQuery.includes(keyword)) {
      criteria.marketCap = size;
      break;
    }
  }

  // Sectors
  for (const [keyword, sectors] of Object.entries(SECTOR_KEYWORDS)) {
    if (lowerQuery.includes(keyword)) {
      criteria.sector = sectors;
      break;
    }
  }

  // Performance keywords
  if (lowerQuery.includes('gainer') || lowerQuery.includes('up') || lowerQuery.includes('green')) {
    criteria.minPerfToday = 0;
  }
  if (lowerQuery.includes('loser') || lowerQuery.includes('down') || lowerQuery.includes('red')) {
    criteria.maxPerfToday = 0;
  }
  if (lowerQuery.includes('momentum') || lowerQuery.includes('hot')) {
    criteria.minPerfMonth = 10;
  }

  // Technical keywords
  if (lowerQuery.includes('oversold') || lowerQuery.includes('rsi under 30') || lowerQuery.includes('rsi below 30')) {
    criteria.rsiFilter = 'oversold_30';
  }
  if (lowerQuery.includes('overbought') || lowerQuery.includes('rsi over 70') || lowerQuery.includes('rsi above 70')) {
    criteria.rsiFilter = 'overbought_70';
  }
  if (lowerQuery.includes('golden cross')) {
    criteria.sma50vs200 = 'cross_above';
  }
  if (lowerQuery.includes('death cross')) {
    criteria.sma50vs200 = 'cross_below';
  }
  if (lowerQuery.includes('above 200') || lowerQuery.includes('above sma')) {
    criteria.sma200 = 'price_above';
  }
  if (lowerQuery.includes('52 week high') || lowerQuery.includes('52-week high') || lowerQuery.includes('new high')) {
    criteria.highLow52W = 'new_high';
  }
  if (lowerQuery.includes('52 week low') || lowerQuery.includes('52-week low') || lowerQuery.includes('new low')) {
    criteria.highLow52W = 'new_low';
  }
  if (lowerQuery.includes('breakout')) {
    criteria.highLow52W = 'new_high';
    criteria.minRelativeVolume = 2;
  }

  // Fundamental keywords
  if (lowerQuery.includes('dividend') || lowerQuery.includes('income') || lowerQuery.includes('yield')) {
    criteria.minDividendYield = 3;
  }
  if (lowerQuery.includes('high dividend')) {
    criteria.minDividendYield = 4;
  }
  if (lowerQuery.includes('value') || lowerQuery.includes('cheap') || lowerQuery.includes('low p/e') || lowerQuery.includes('low pe')) {
    criteria.maxPE = 15;
  }
  if (lowerQuery.includes('growth')) {
    criteria.minEPSGrowthThisYear = 15;
  }
  if (lowerQuery.includes('profitable')) {
    criteria.minNetMargin = 0;
  }
  if (lowerQuery.includes('high roe')) {
    criteria.minROE = 15;
  }
  if (lowerQuery.includes('low debt')) {
    criteria.maxDebtEquity = 0.5;
  }

  // Volume keywords
  if (lowerQuery.includes('volume spike') || lowerQuery.includes('unusual volume') || lowerQuery.includes('high volume')) {
    criteria.minRelativeVolume = 3;
  }
  if (lowerQuery.includes('active') || lowerQuery.includes('liquid')) {
    criteria.minVolume = 1000000;
  }

  // Gap keywords
  if (lowerQuery.includes('gap up')) {
    criteria.minGapUp = 3;
  }
  if (lowerQuery.includes('gap down')) {
    criteria.minGapDown = 3;
  }

  // Shorted keywords
  if (lowerQuery.includes('shorted') || lowerQuery.includes('short squeeze') || lowerQuery.includes('short interest')) {
    criteria.minFloatShort = 15;
  }
  if (lowerQuery.includes('heavily shorted')) {
    criteria.minFloatShort = 20;
  }

  // Default minimum volume for liquidity
  if (!criteria.minVolume) {
    criteria.minVolume = 100000;
  }

  return criteria;
}

// ============================================
// SCREENER EXECUTION
// ============================================

export async function executeScreen(criteria: ScreenerCriteria): Promise<ScreenerResponse> {
  const startTime = Date.now();
  
  try {
    const { data, error } = await supabase.functions.invoke('polygon-screener-v2', {
      body: { criteria }
    });

    if (error) throw error;

    return {
      ...data,
      executionTimeMs: Date.now() - startTime
    };
  } catch (error) {
    console.error('Screener error:', error);
    throw error;
  }
}

export async function runQuickScreen(screenKey: string): Promise<ScreenerResponse> {
  const screen = QUICK_SCREENS[screenKey];
  if (!screen) {
    throw new Error(`Quick screen "${screenKey}" not found`);
  }
  return executeScreen(screen.criteria);
}

export function getQuickScreensByCategory(category: QuickScreen['category']): Record<string, QuickScreen> {
  return Object.fromEntries(
    Object.entries(QUICK_SCREENS).filter(([_, screen]) => screen.category === category)
  );
}

// ============================================
// RESULT FORMATTING HELPERS
// ============================================

export function formatMarketCap(value: number): string {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  return `$${value.toLocaleString()}`;
}

export function formatVolume(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value.toLocaleString();
}

export function formatPercent(value: number | null): string {
  if (value === null) return '-';
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

export function generateExplanation(criteria: ScreenerCriteria, count: number): string {
  const parts: string[] = [];
  
  if (criteria.marketCap) {
    parts.push(`${criteria.marketCap} cap`);
  }
  if (criteria.sector?.length) {
    parts.push(criteria.sector.join('/'));
  }
  if (criteria.minPerfToday !== undefined && criteria.minPerfToday > 0) {
    parts.push('gaining');
  }
  if (criteria.maxPerfToday !== undefined && criteria.maxPerfToday < 0) {
    parts.push('declining');
  }
  if (criteria.highLow52W === 'new_high') {
    parts.push('at 52-week highs');
  }
  if (criteria.highLow52W === 'new_low') {
    parts.push('at 52-week lows');
  }
  if (criteria.rsiFilter?.includes('oversold')) {
    parts.push('oversold');
  }
  if (criteria.rsiFilter?.includes('overbought')) {
    parts.push('overbought');
  }
  if (criteria.minDividendYield) {
    parts.push(`${criteria.minDividendYield}%+ dividend`);
  }
  if (criteria.minRelativeVolume && criteria.minRelativeVolume > 2) {
    parts.push('unusual volume');
  }

  const description = parts.length > 0 ? parts.join(' ') : 'matching';
  return `Found ${count} ${description} stocks`;
}
