import { supabase } from '@/integrations/supabase/client';
import { 
  getMockStock, 
  getMockIndex, 
  MOCK_INDICES,
  MOCK_DATA_DATE,
  type MockQuote 
} from '@/data/mockMarketData';

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
  source?: 'live' | 'cache' | 'mock';
  isMock?: boolean;
}

export interface TickerSearchResult {
  symbol: string;
  name: string;
  exchange: string;
  source?: 'live' | 'cache' | 'mock';
}

export interface MarketIndex {
  name: string;
  symbol: string;
  value: number;
  change: number;
  changePercent: number;
  source?: 'live' | 'cache' | 'mock';
  isMock?: boolean;
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
  source?: 'live' | 'cache' | 'mock';
  isMock?: boolean;
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

const memoryCache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string, ttlMs: number): T | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  
  if (Date.now() - entry.timestamp > ttlMs) {
    memoryCache.delete(key);
    return null;
  }
  
  return entry.data as T;
}

function getCachedAny<T>(key: string): { data: T; timestamp: number } | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  return { data: entry.data as T, timestamp: entry.timestamp };
}

function setCache<T>(key: string, data: T): void {
  memoryCache.set(key, { data, timestamp: Date.now() });
}

// Convert mock quote to QuoteData format
function mockToQuoteData(mock: MockQuote): QuoteData {
  return {
    price: mock.price,
    change: mock.change,
    changePercent: mock.changePercent,
    volume: mock.volume ? mock.volume.toLocaleString() : 'N/A',
    marketCap: mock.marketCap ? `$${(mock.marketCap / 1e9).toFixed(1)}B` : 'N/A',
    high52: mock.price * 1.15,
    low52: mock.price * 0.85,
    source: 'mock',
    isMock: true,
  };
}

// API Functions
export async function getQuote(ticker: string): Promise<QuoteData> {
  const cacheKey = `quote:${ticker.toUpperCase()}`;
  const cached = getCached<QuoteData>(cacheKey, 60 * 1000); // 60 seconds
  if (cached) return { ...cached, source: 'cache' };

  // Check if market data is paused
  if (!isMarketDataEnabled()) {
    // Return cached even if stale
    const staleCache = getCachedAny<QuoteData>(cacheKey);
    if (staleCache) return { ...staleCache.data, source: 'cache' };
    
    // Fall back to mock data
    const mockData = getMockStock(ticker);
    if (mockData) {
      return mockToQuoteData(mockData);
    }
    
    throw new Error('Market data is paused. No cached or mock data available.');
  }

  logApiCall('market-data/quote', { ticker: ticker.toUpperCase() });

  const { data, error } = await supabase.functions.invoke('market-data', {
    body: { type: 'quote', ticker: ticker.toUpperCase() }
  });

  if (error || !data?.success) {
    // Try mock as fallback on error
    const mockData = getMockStock(ticker);
    if (mockData) {
      return mockToQuoteData(mockData);
    }
    throw new Error(error?.message || data?.error || 'Failed to fetch quote');
  }

  const result = { ...data.data, source: 'live', isMock: false };
  setCache(cacheKey, result);
  return result;
}

export async function searchTicker(query: string): Promise<TickerSearchResult[]> {
  if (!query || query.length < 1) return [];
  
  const cacheKey = `search:${query.toLowerCase()}`;
  const cached = getCached<TickerSearchResult[]>(cacheKey, 60 * 60 * 1000); // 1 hour
  if (cached) return cached.map(r => ({ ...r, source: 'cache' as const }));

  // Check if market data is paused - return mock search results
  if (!isMarketDataEnabled()) {
    const staleCache = getCachedAny<TickerSearchResult[]>(cacheKey);
    if (staleCache) return staleCache.data.map(r => ({ ...r, source: 'cache' as const }));
    
    // Search in mock data
    const { searchMockStocks } = await import('@/data/mockMarketData');
    const mockResults = searchMockStocks(query);
    return mockResults.map(m => ({
      symbol: m.symbol,
      name: m.name,
      exchange: 'MOCK',
      source: 'mock' as const,
    }));
  }

  logApiCall('market-data/tickerSearch', { query });

  const { data, error } = await supabase.functions.invoke('market-data', {
    body: { type: 'tickerSearch', query }
  });

  if (error || !data?.success) {
    // Fallback to mock search on error
    const { searchMockStocks } = await import('@/data/mockMarketData');
    const mockResults = searchMockStocks(query);
    return mockResults.map(m => ({
      symbol: m.symbol,
      name: m.name,
      exchange: 'MOCK',
      source: 'mock' as const,
    }));
  }

  const results = data.data.map((r: TickerSearchResult) => ({ ...r, source: 'live' as const }));
  setCache(cacheKey, results);
  return results;
}

export async function getMarketIndices(): Promise<MarketIndex[]> {
  const cacheKey = 'indices';
  const cached = getCached<MarketIndex[]>(cacheKey, 5 * 60 * 1000); // 5 minutes
  if (cached) return cached.map(i => ({ ...i, source: 'cache' as const }));

  // Check if market data is paused
  if (!isMarketDataEnabled()) {
    const staleCache = getCachedAny<MarketIndex[]>(cacheKey);
    if (staleCache) return staleCache.data.map(i => ({ ...i, source: 'cache' as const }));
    
    // Return mock indices
    return Object.values(MOCK_INDICES).map(idx => ({
      name: idx.name,
      symbol: idx.symbol,
      value: idx.value,
      change: idx.change,
      changePercent: idx.changePercent,
      source: 'mock' as const,
      isMock: true,
    }));
  }

  logApiCall('market-data/indices', {});

  const { data, error } = await supabase.functions.invoke('market-data', {
    body: { type: 'indices' }
  });

  if (error || !data?.success) {
    // Fallback to mock indices on error
    return Object.values(MOCK_INDICES).map(idx => ({
      name: idx.name,
      symbol: idx.symbol,
      value: idx.value,
      change: idx.change,
      changePercent: idx.changePercent,
      source: 'mock' as const,
      isMock: true,
    }));
  }

  const results = data.data.map((i: MarketIndex) => ({ ...i, source: 'live' as const, isMock: false }));
  setCache(cacheKey, results);
  return results;
}

export async function getCompanyInfo(ticker: string): Promise<CompanyInfo> {
  const cacheKey = `company:${ticker.toUpperCase()}`;
  const cached = getCached<CompanyInfo>(cacheKey, 24 * 60 * 60 * 1000); // 24 hours
  if (cached) return { ...cached, source: 'cache' };

  // Check if market data is paused
  if (!isMarketDataEnabled()) {
    const staleCache = getCachedAny<CompanyInfo>(cacheKey);
    if (staleCache) return { ...staleCache.data, source: 'cache' };
    
    // Create mock company info from stock data
    const mockStock = getMockStock(ticker);
    if (mockStock) {
      return {
        name: mockStock.name,
        ticker: mockStock.symbol,
        exchange: 'MOCK',
        sector: 'Technology',
        industry: 'Software',
        peRatio: null,
        eps: null,
        dividendYield: null,
        description: `${mockStock.name} - Sample data for development.`,
        source: 'mock',
        isMock: true,
      };
    }
    
    throw new Error('Market data is paused. No cached or mock data available.');
  }

  logApiCall('market-data/companyInfo', { ticker: ticker.toUpperCase() });

  const { data, error } = await supabase.functions.invoke('market-data', {
    body: { type: 'companyInfo', ticker: ticker.toUpperCase() }
  });

  if (error || !data?.success) {
    // Try mock as fallback
    const mockStock = getMockStock(ticker);
    if (mockStock) {
      return {
        name: mockStock.name,
        ticker: mockStock.symbol,
        exchange: 'MOCK',
        sector: 'Technology',
        industry: 'Software',
        peRatio: null,
        eps: null,
        dividendYield: null,
        description: `${mockStock.name} - Sample data for development.`,
        source: 'mock',
        isMock: true,
      };
    }
    throw new Error(error?.message || data?.error || 'Failed to fetch company info');
  }

  const result = { ...data.data, source: 'live', isMock: false };
  setCache(cacheKey, result);
  return result;
}

// Clear cache for a specific ticker
export function clearQuoteCache(ticker: string): void {
  memoryCache.delete(`quote:${ticker.toUpperCase()}`);
}

// Clear all market data cache
export function clearAllCache(): void {
  memoryCache.clear();
}

// Get cache timestamp for a key
export function getCacheTimestamp(key: string): number | null {
  const entry = memoryCache.get(key);
  return entry?.timestamp ?? null;
}

// Export types
export type { CacheEntry };
