/**
 * Finnhub API Service
 * Free tier: 60 calls/minute
 * https://finnhub.io/
 */

/**
 * Finnhub API Service
 * Free tier: 60 calls/minute
 * https://finnhub.io/
 */

import { API_CONFIG } from '@/config/apiConfig';
import { supabase } from '@/integrations/supabase/client';

const FINNHUB_API_KEY = import.meta.env.VITE_FINNHUB_API_KEY;
const BASE_URL = 'https://finnhub.io/api/v1';

const PROXY_OK_KEY = 'finnhub-proxy-ok';
function markProxyOk() {
  try {
    localStorage.setItem(PROXY_OK_KEY, 'true');
  } catch {
    // ignore
  }
}

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

async function proxyInvoke<T>(action: string, body: Record<string, unknown>): Promise<T | null> {
  try {
    const { data, error } = await supabase.functions.invoke('finnhub-proxy', {
      body: { action, ...body },
    });

    if (error) {
      console.error('[Finnhub Proxy] invoke error:', error);
      return null;
    }

    // shape: { ok: boolean, ... }
    if (data?.ok) {
      markProxyOk();
      return data as T;
    }

    return data as T;
  } catch (e) {
    console.error('[Finnhub Proxy] invoke exception:', e);
    return null;
  }
}

/**
 * Get a single stock quote from Finnhub
 */
export async function getQuote(symbol: string): Promise<StockQuote | null> {
  if (!API_CONFIG.ENABLE_MARKET_DATA) {
    console.log('[Finnhub] Market data disabled via kill switch');
    return null;
  }

  const upper = symbol.toUpperCase();

  // Prefer direct client-side calls if a client key exists (dev/local).
  if (FINNHUB_API_KEY) {
    if (!rateLimiter.canCall()) {
      console.log('[RATE LIMITED] Finnhub - waiting...');
      await new Promise(r => setTimeout(r, 1000));
    }

    rateLimiter.recordCall();

    try {
      const response = await fetch(`${BASE_URL}/quote?symbol=${upper}&token=${FINNHUB_API_KEY}`);

      if (!response.ok) {
        console.error('[Finnhub] Quote request failed:', response.status);
        return null;
      }

      const data = await response.json();
      if (!data || data.c === 0) {
        console.warn('[Finnhub] No data for symbol:', symbol);
        return null;
      }

      return {
        symbol: upper,
        price: data.c,
        change: data.d || 0,
        changePercent: data.dp || 0,
        high: data.h,
        low: data.l,
        open: data.o,
        previousClose: data.pc,
        timestamp: data.t * 1000,
        companyName: upper,
      };
    } catch (error) {
      console.error('[Finnhub] Quote error:', error);
      return null;
    }
  }

  // Otherwise, use the backend proxy (keeps the key off the client).
  const res = await proxyInvoke<{ ok: boolean; quote: StockQuote | null }>('quote', { symbol: upper });
  return res?.quote ?? null;
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
  if (!API_CONFIG.ENABLE_MARKET_DATA) return null;

  const upper = symbol.toUpperCase();

  if (FINNHUB_API_KEY) {
    if (!rateLimiter.canCall()) {
      await new Promise(r => setTimeout(r, 1000));
    }
    rateLimiter.recordCall();

    try {
      const response = await fetch(`${BASE_URL}/stock/profile2?symbol=${upper}&token=${FINNHUB_API_KEY}`);
      if (!response.ok) return null;

      const data = await response.json();
      if (!data || !data.name) return null;

      return {
        name: data.name,
        ticker: data.ticker,
        marketCap: data.marketCapitalization * 1000000,
        exchange: data.exchange,
        industry: data.finnhubIndustry,
      };
    } catch (error) {
      console.error('[Finnhub] Profile error:', error);
      return null;
    }
  }

  const res = await proxyInvoke<{ ok: boolean; profile: any | null }>('profile', { symbol: upper });
  return res?.profile ?? null;
}

/**
 * Get a full quote with company profile info
 */
export async function getFullQuote(symbol: string): Promise<StockQuote | null> {
  const [quote, profile] = await Promise.all([getQuote(symbol), getCompanyProfile(symbol)]);
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
  const upperSymbols = symbols.map(s => s.toUpperCase());

  // If we have a client key, reuse the existing chunked approach.
  if (FINNHUB_API_KEY) {
    const chunks: string[][] = [];
    for (let i = 0; i < upperSymbols.length; i += 10) chunks.push(upperSymbols.slice(i, i + 10));

    for (const chunk of chunks) {
      const quotes = await Promise.all(chunk.map(s => getQuote(s)));
      quotes.forEach((q, i) => {
        if (q) results.set(chunk[i].toUpperCase(), q);
      });

      if (chunks.indexOf(chunk) < chunks.length - 1) {
        await new Promise(r => setTimeout(r, 200));
      }
    }

    return results;
  }

  // Otherwise, use backend proxy batch.
  const res = await proxyInvoke<{ ok: boolean; quotes: Record<string, StockQuote> }>('batch', { symbols: upperSymbols });
  const quotesObj = res?.quotes || {};
  for (const [sym, q] of Object.entries(quotesObj)) {
    if (q) results.set(sym.toUpperCase(), q);
  }
  return results;
}

/**
 * Search for symbols
 */
export async function searchSymbol(query: string): Promise<SymbolSearchResult[]> {
  if (!API_CONFIG.ENABLE_MARKET_DATA || !query) return [];

  if (FINNHUB_API_KEY) {
    if (!rateLimiter.canCall()) return [];
    rateLimiter.recordCall();

    try {
      const response = await fetch(`${BASE_URL}/search?q=${encodeURIComponent(query)}&token=${FINNHUB_API_KEY}`);
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

  const res = await proxyInvoke<{ ok: boolean; results: SymbolSearchResult[] }>('search', { query });
  return res?.results || [];
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
 * - true if a client key exists (local/dev)
 * - OR if we've successfully used the backend proxy in this browser
 */
export function isFinnhubConfigured(): boolean {
  if (FINNHUB_API_KEY) return true;
  try {
    return localStorage.getItem(PROXY_OK_KEY) === 'true';
  } catch {
    return false;
  }
}

