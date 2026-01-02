/**
 * Finnhub API Service
 * Free tier: 60 calls/minute
 * https://finnhub.io/
 */

const FINNHUB_API_KEY = import.meta.env.VITE_FINNHUB_API_KEY;
const BASE_URL = 'https://finnhub.io/api/v1';

// Rate limiter: max 60 calls per minute
const rateLimiter = {
  calls: [] as number[],
  canCall(): boolean {
    const now = Date.now();
    this.calls = this.calls.filter(t => now - t < 60000);
    return this.calls.length < 60;
  },
  recordCall() {
    this.calls.push(Date.now());
  }
};

export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  timestamp: number;
  // Extended fields for compatibility
  volume?: string;
  marketCap?: string;
  companyName?: string;
  chartData?: { time: string; price: number }[];
}

export interface SymbolSearchResult {
  symbol: string;
  description: string;
}

/**
 * Get a single stock quote from Finnhub
 */
export async function getQuote(symbol: string): Promise<StockQuote | null> {
  if (!FINNHUB_API_KEY) {
    console.warn('[Finnhub] No API key configured');
    return null;
  }

  if (!rateLimiter.canCall()) {
    console.log('[RATE LIMITED] Finnhub - waiting...');
    await new Promise(r => setTimeout(r, 1000));
  }

  rateLimiter.recordCall();

  try {
    const response = await fetch(
      `${BASE_URL}/quote?symbol=${symbol.toUpperCase()}&token=${FINNHUB_API_KEY}`
    );

    if (!response.ok) {
      console.error('[Finnhub] Quote request failed:', response.status);
      return null;
    }

    const data = await response.json();

    // Finnhub returns: c (current), d (change), dp (change%), h, l, o, pc (prev close), t (timestamp)
    // If c is 0, the symbol might not be valid or market is closed with no data
    if (!data || data.c === 0) {
      console.warn('[Finnhub] No data for symbol:', symbol);
      return null;
    }

    return {
      symbol: symbol.toUpperCase(),
      price: data.c,
      change: data.d || 0,
      changePercent: data.dp || 0,
      high: data.h,
      low: data.l,
      open: data.o,
      previousClose: data.pc,
      timestamp: data.t * 1000,
      // For compatibility with existing components
      companyName: symbol.toUpperCase(),
    };
  } catch (error) {
    console.error('[Finnhub] Quote error:', error);
    return null;
  }
}

/**
 * Get company profile for extended info
 */
export async function getCompanyProfile(symbol: string): Promise<{
  name: string;
  ticker: string;
  marketCap: number;
  exchange: string;
  industry: string;
} | null> {
  if (!FINNHUB_API_KEY) return null;

  if (!rateLimiter.canCall()) {
    await new Promise(r => setTimeout(r, 1000));
  }
  rateLimiter.recordCall();

  try {
    const response = await fetch(
      `${BASE_URL}/stock/profile2?symbol=${symbol.toUpperCase()}&token=${FINNHUB_API_KEY}`
    );

    if (!response.ok) return null;

    const data = await response.json();
    if (!data || !data.name) return null;

    return {
      name: data.name,
      ticker: data.ticker,
      marketCap: data.marketCapitalization * 1000000, // Finnhub returns in millions
      exchange: data.exchange,
      industry: data.finnhubIndustry,
    };
  } catch (error) {
    console.error('[Finnhub] Profile error:', error);
    return null;
  }
}

/**
 * Get a full quote with company profile info
 */
export async function getFullQuote(symbol: string): Promise<StockQuote | null> {
  const [quote, profile] = await Promise.all([
    getQuote(symbol),
    getCompanyProfile(symbol),
  ]);

  if (!quote) return null;

  return {
    ...quote,
    companyName: profile?.name || symbol.toUpperCase(),
    marketCap: profile?.marketCap ? formatMarketCap(profile.marketCap) : undefined,
  };
}

/**
 * Get quotes for multiple symbols
 */
export async function getBatchQuotes(symbols: string[]): Promise<Map<string, StockQuote>> {
  const results = new Map<string, StockQuote>();

  // Finnhub doesn't have batch endpoint on free tier, parallel fetch in chunks
  const chunks: string[][] = [];
  for (let i = 0; i < symbols.length; i += 10) {
    chunks.push(symbols.slice(i, i + 10));
  }

  for (const chunk of chunks) {
    const quotes = await Promise.all(chunk.map(s => getQuote(s)));
    quotes.forEach((q, i) => {
      if (q) results.set(chunk[i].toUpperCase(), q);
    });

    // Small delay between chunks to respect rate limit
    if (chunks.indexOf(chunk) < chunks.length - 1) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  return results;
}

/**
 * Search for symbols
 */
export async function searchSymbol(query: string): Promise<SymbolSearchResult[]> {
  if (!FINNHUB_API_KEY || !query) return [];

  if (!rateLimiter.canCall()) return [];
  rateLimiter.recordCall();

  try {
    const response = await fetch(
      `${BASE_URL}/search?q=${encodeURIComponent(query)}&token=${FINNHUB_API_KEY}`
    );

    if (!response.ok) return [];

    const data = await response.json();
    return (data.result || []).slice(0, 10).map((r: any) => ({
      symbol: r.symbol,
      description: r.description,
    }));
  } catch (error) {
    console.error('[Finnhub] Search error:', error);
    return [];
  }
}

/**
 * Format market cap for display
 */
function formatMarketCap(value: number): string {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  return `$${value.toLocaleString()}`;
}

/**
 * Check if Finnhub API is configured
 */
export function isFinnhubConfigured(): boolean {
  return !!FINNHUB_API_KEY;
}
