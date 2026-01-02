import { supabase } from '@/integrations/supabase/client';

// Types
export interface QuoteData {
  price: number;
  change: number;
  changePercent: number;
  volume: string;
  marketCap: string;
  high52: number;
  low52: number;
  open?: number;
  high?: number;
  low?: number;
  previousClose?: number;
}

export interface TickerSearchResult {
  symbol: string;
  name: string;
  exchange: string;
}

export interface MarketIndex {
  name: string;
  symbol: string;
  value: number;
  change: number;
  changePercent: number;
}

export interface CompanyInfo {
  name: string;
  ticker: string;
  exchange: string;
  sector: string;
  industry: string;
  peRatio: number | null;
  eps: number | null;
  dividendYield: number | null;
  description: string;
  employees?: number;
  headquarters?: string;
}

// Dev mode check - returns null if context not available (for use outside React)
let devModeEnabled: boolean | null = null;
let devModeLogApiCall: ((endpoint: string, params?: unknown) => void) | null = null;

export function setDevModeState(enabled: boolean, logFn?: (endpoint: string, params?: unknown) => void) {
  devModeEnabled = enabled;
  devModeLogApiCall = logFn || null;
}

export function isMarketDataEnabled(): boolean {
  return devModeEnabled ?? true;
}

function logApiCall(endpoint: string, params?: unknown) {
  if (devModeLogApiCall) {
    devModeLogApiCall(endpoint, params);
  } else {
    console.log(`[API] ${endpoint}`, params || '');
  }
}

// In-memory cache for client-side caching
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const memoryCache = new Map<string, CacheEntry<any>>();

function getCached<T>(key: string, ttlMs: number): T | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  
  if (Date.now() - entry.timestamp > ttlMs) {
    memoryCache.delete(key);
    return null;
  }
  
  return entry.data as T;
}

function setCache<T>(key: string, data: T): void {
  memoryCache.set(key, { data, timestamp: Date.now() });
}

// API Functions
export async function getQuote(ticker: string): Promise<QuoteData> {
  const cacheKey = `quote:${ticker.toUpperCase()}`;
  const cached = getCached<QuoteData>(cacheKey, 60 * 1000); // 60 seconds
  if (cached) return cached;

  // Check if market data is paused
  if (!isMarketDataEnabled()) {
    // Return cached even if stale, or throw if none
    const staleCache = memoryCache.get(cacheKey);
    if (staleCache) return staleCache.data as QuoteData;
    throw new Error('Market data is paused. Enable live data to fetch quotes.');
  }

  logApiCall('market-data/quote', { ticker: ticker.toUpperCase() });

  const { data, error } = await supabase.functions.invoke('market-data', {
    body: { type: 'quote', ticker: ticker.toUpperCase() }
  });

  if (error || !data?.success) {
    throw new Error(error?.message || data?.error || 'Failed to fetch quote');
  }

  setCache(cacheKey, data.data);
  return data.data;
}

export async function searchTicker(query: string): Promise<TickerSearchResult[]> {
  if (!query || query.length < 1) return [];
  
  const cacheKey = `search:${query.toLowerCase()}`;
  const cached = getCached<TickerSearchResult[]>(cacheKey, 60 * 60 * 1000); // 1 hour
  if (cached) return cached;

  // Check if market data is paused
  if (!isMarketDataEnabled()) {
    const staleCache = memoryCache.get(cacheKey);
    if (staleCache) return staleCache.data as TickerSearchResult[];
    return []; // Return empty for search when paused
  }

  logApiCall('market-data/tickerSearch', { query });

  const { data, error } = await supabase.functions.invoke('market-data', {
    body: { type: 'tickerSearch', query }
  });

  if (error || !data?.success) {
    console.error('Ticker search error:', error || data?.error);
    return [];
  }

  setCache(cacheKey, data.data);
  return data.data;
}

export async function getMarketIndices(): Promise<MarketIndex[]> {
  const cacheKey = 'indices';
  const cached = getCached<MarketIndex[]>(cacheKey, 5 * 60 * 1000); // 5 minutes
  if (cached) return cached;

  // Check if market data is paused
  if (!isMarketDataEnabled()) {
    const staleCache = memoryCache.get(cacheKey);
    if (staleCache) return staleCache.data as MarketIndex[];
    return []; // Return empty for indices when paused
  }

  logApiCall('market-data/indices', {});

  const { data, error } = await supabase.functions.invoke('market-data', {
    body: { type: 'indices' }
  });

  if (error || !data?.success) {
    throw new Error(error?.message || data?.error || 'Failed to fetch indices');
  }

  setCache(cacheKey, data.data);
  return data.data;
}

export async function getCompanyInfo(ticker: string): Promise<CompanyInfo> {
  const cacheKey = `company:${ticker.toUpperCase()}`;
  const cached = getCached<CompanyInfo>(cacheKey, 24 * 60 * 60 * 1000); // 24 hours
  if (cached) return cached;

  // Check if market data is paused
  if (!isMarketDataEnabled()) {
    const staleCache = memoryCache.get(cacheKey);
    if (staleCache) return staleCache.data as CompanyInfo;
    throw new Error('Market data is paused. Enable live data to fetch company info.');
  }

  logApiCall('market-data/companyInfo', { ticker: ticker.toUpperCase() });

  const { data, error } = await supabase.functions.invoke('market-data', {
    body: { type: 'companyInfo', ticker: ticker.toUpperCase() }
  });

  if (error || !data?.success) {
    throw new Error(error?.message || data?.error || 'Failed to fetch company info');
  }

  setCache(cacheKey, data.data);
  return data.data;
}

// Clear cache for a specific ticker
export function clearQuoteCache(ticker: string): void {
  memoryCache.delete(`quote:${ticker.toUpperCase()}`);
}

// Clear all market data cache
export function clearAllCache(): void {
  memoryCache.clear();
}

// Export types
export type { CacheEntry };
