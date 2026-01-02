/**
 * Multi-layer Quote Cache Service
 * Layer 1: In-memory cache (instant, survives within session)
 * Layer 2: LocalStorage cache (survives page refresh)
 * Layer 3: Mock data fallback when API unavailable
 */

import { getQuote, getBatchQuotes, getCompanyProfile, type StockQuote } from './finnhubService';
import { getMockStock, getMockIndex, type MockQuote } from '@/data/mockMarketData';

// ETF to Index mapping for mock data
const ETF_TO_INDEX: Record<string, string> = {
  'SPY': 'SPX',
  'QQQ': 'NDX',
  'DIA': 'DJI',
  'IWM': 'RUT',
};

interface CachedQuote {
  quote: StockQuote;
  fetchedAt: number;
  isMock?: boolean;
}

interface CachedProfile {
  profile: {
    name: string;
    marketCap: number;
  } | null;
  fetchedAt: number;
}

// Layer 1: In-memory cache (instant, survives within session)
const memoryCache = new Map<string, CachedQuote>();
const profileMemoryCache = new Map<string, CachedProfile>();

// Layer 2: LocalStorage cache (survives page refresh)
const STORAGE_KEY = 'quote-cache';
const PROFILE_STORAGE_KEY = 'profile-cache';

function getLocalCache(): Record<string, CachedQuote> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function setLocalCache(cache: Record<string, CachedQuote>) {
  try {
    // Keep only last 500 quotes to avoid storage limits
    const entries = Object.entries(cache);
    if (entries.length > 500) {
      entries.sort((a, b) => b[1].fetchedAt - a[1].fetchedAt);
      cache = Object.fromEntries(entries.slice(0, 500));
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // Storage full, clear it
    localStorage.removeItem(STORAGE_KEY);
  }
}

function getProfileLocalCache(): Record<string, CachedProfile> {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function setProfileLocalCache(cache: Record<string, CachedProfile>) {
  try {
    const entries = Object.entries(cache);
    if (entries.length > 500) {
      entries.sort((a, b) => b[1].fetchedAt - a[1].fetchedAt);
      cache = Object.fromEntries(entries.slice(0, 500));
    }
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(cache));
  } catch {
    localStorage.removeItem(PROFILE_STORAGE_KEY);
  }
}

// Cache TTL based on market hours
function getCacheTTL(): number {
  const now = new Date();
  const hour = now.getUTCHours() - 5; // EST
  const day = now.getUTCDay();

  const isWeekend = day === 0 || day === 6;
  const isMarketHours = hour >= 9.5 && hour < 16;

  if (isWeekend) return 4 * 60 * 60 * 1000; // 4 hours on weekends
  if (!isMarketHours) return 60 * 60 * 1000; // 1 hour after hours
  return 30 * 1000; // 30 seconds during market hours
}

// Profile cache TTL (24 hours - company info rarely changes)
function getProfileCacheTTL(): number {
  return 24 * 60 * 60 * 1000;
}

function isCacheValid(cached: CachedQuote): boolean {
  return Date.now() - cached.fetchedAt < getCacheTTL();
}

function isProfileCacheValid(cached: CachedProfile): boolean {
  return Date.now() - cached.fetchedAt < getProfileCacheTTL();
}

/**
 * Get a single quote with multi-layer caching + mock fallback
 */
export async function getCachedQuote(symbol: string): Promise<StockQuote | null> {
  const upperSymbol = symbol.toUpperCase();

  // Check memory cache first
  const memCached = memoryCache.get(upperSymbol);
  if (memCached && isCacheValid(memCached)) {
    console.log(`[CACHE HIT] Memory: ${upperSymbol}${memCached.isMock ? ' (mock)' : ''}`);
    return memCached.quote;
  }

  // Check localStorage
  const localCache = getLocalCache();
  const localCached = localCache[upperSymbol];
  if (localCached && isCacheValid(localCached)) {
    console.log(`[CACHE HIT] Local: ${upperSymbol}${localCached.isMock ? ' (mock)' : ''}`);
    // Promote to memory cache
    memoryCache.set(upperSymbol, localCached);
    return localCached.quote;
  }

  // Try Finnhub first (service will transparently use backend proxy if needed)
  console.log(`[CACHE MISS] Fetching from Finnhub: ${upperSymbol}`);
  const quote = await getQuote(upperSymbol);

  if (quote) {
    const cached = { quote, fetchedAt: Date.now(), isMock: false };
    memoryCache.set(upperSymbol, cached);
    localCache[upperSymbol] = cached;
    setLocalCache(localCache);
    return quote;
  }

  // Fallback to mock data
  const mockQuote = getMockQuote(upperSymbol);
  if (mockQuote) {
    console.log(`[MOCK DATA] Using mock for: ${upperSymbol}`);
    const cached = { quote: mockQuote, fetchedAt: Date.now(), isMock: true };
    memoryCache.set(upperSymbol, cached);
    localCache[upperSymbol] = cached;
    setLocalCache(localCache);
    return mockQuote;
  }

  console.log(`[NO DATA] No quote available for: ${upperSymbol}`);
  return null;
}

/**
 * Convert mock data to StockQuote format
 */
function getMockQuote(symbol: string): StockQuote | null {
  const upperSymbol = symbol.toUpperCase();
  
  // Check if it's an ETF that maps to an index
  const indexSymbol = ETF_TO_INDEX[upperSymbol];
  if (indexSymbol) {
    const indexData = getMockIndex(indexSymbol);
    if (indexData) {
      // ETFs trade at a fraction of index value: SPY ~1/10 of SPX, QQQ ~1/40 of NDX, etc.
      const divisor = indexSymbol === 'SPX' ? 10 : indexSymbol === 'NDX' ? 40 : indexSymbol === 'DJI' ? 100 : 10;
      const etfPrice = indexData.value / divisor;
      const etfChange = indexData.change / divisor;
      
      return {
        symbol: upperSymbol,
        price: etfPrice,
        change: etfChange,
        changePercent: indexData.changePercent,
        high: etfPrice * 1.005,
        low: etfPrice * 0.995,
        open: etfPrice - etfChange,
        previousClose: etfPrice - etfChange,
        timestamp: Date.now(),
        companyName: `${indexData.name} ETF`,
        isMock: true,
      } as StockQuote & { isMock: boolean };
    }
  }

  // Check regular stocks
  const stockData = getMockStock(upperSymbol);
  if (stockData) {
    return {
      symbol: upperSymbol,
      price: stockData.price,
      change: stockData.change,
      changePercent: stockData.changePercent,
      high: stockData.price * 1.01,
      low: stockData.price * 0.99,
      open: stockData.price - stockData.change,
      previousClose: stockData.price - stockData.change,
      timestamp: Date.now(),
      companyName: stockData.name,
      marketCap: stockData.marketCap ? formatMarketCap(stockData.marketCap) : undefined,
      isMock: true,
    } as StockQuote & { isMock: boolean };
  }

  return null;
}

/**
 * Get company profile with caching (24h TTL)
 */
async function getCachedProfile(symbol: string): Promise<{ name: string; marketCap: number } | null> {
  const upperSymbol = symbol.toUpperCase();

  // Check memory cache
  const memCached = profileMemoryCache.get(upperSymbol);
  if (memCached && isProfileCacheValid(memCached)) {
    console.log(`[PROFILE CACHE HIT] Memory: ${upperSymbol}`);
    return memCached.profile;
  }

  // Check localStorage
  const localCache = getProfileLocalCache();
  const localCached = localCache[upperSymbol];
  if (localCached && isProfileCacheValid(localCached)) {
    console.log(`[PROFILE CACHE HIT] Local: ${upperSymbol}`);
    profileMemoryCache.set(upperSymbol, localCached);
    return localCached.profile;
  }

  // Fetch from API
  console.log(`[PROFILE CACHE MISS] Fetching: ${upperSymbol}`);
  const profile = await getCompanyProfile(upperSymbol);

  const cached = {
    profile: profile ? { name: profile.name, marketCap: profile.marketCap } : null,
    fetchedAt: Date.now(),
  };
  profileMemoryCache.set(upperSymbol, cached);
  localCache[upperSymbol] = cached;
  setProfileLocalCache(localCache);

  return cached.profile;
}

/**
 * Get a full quote with company profile - both cached
 */
export async function getCachedFullQuote(symbol: string): Promise<StockQuote | null> {
  const [quote, profile] = await Promise.all([
    getCachedQuote(symbol),
    getCachedProfile(symbol),
  ]);

  if (!quote) return null;

  return {
    ...quote,
    companyName: profile?.name || symbol.toUpperCase(),
    marketCap: profile?.marketCap ? formatMarketCap(profile.marketCap) : undefined,
  };
}

/**
 * Batch fetch with cache awareness + mock fallback
 */
export async function getCachedQuotes(symbols: string[]): Promise<Map<string, StockQuote>> {
  const results = new Map<string, StockQuote>();
  const toFetch: string[] = [];
  const localCache = getLocalCache();

  // Check cache for each symbol
  for (const symbol of symbols) {
    const upperSymbol = symbol.toUpperCase();
    
    // Check memory first
    const memCached = memoryCache.get(upperSymbol);
    if (memCached && isCacheValid(memCached)) {
      results.set(symbol, memCached.quote);
      continue;
    }

    // Check localStorage
    const localCached = localCache[upperSymbol];
    if (localCached && isCacheValid(localCached)) {
      results.set(symbol, localCached.quote);
      memoryCache.set(upperSymbol, localCached); // Promote to memory
      continue;
    }

    toFetch.push(symbol);
  }

  // Fetch only what we need
  if (toFetch.length > 0) {
    console.log(`[BATCH FETCH] ${toFetch.length} symbols (${symbols.length - toFetch.length} cached)`);

    const updatedLocalCache = getLocalCache();

    let fetched = new Map<string, StockQuote>();
    try {
      fetched = await getBatchQuotes(toFetch);
    } catch (e) {
      console.warn('[BATCH FETCH] Finnhub fetch failed, falling back to mock for missing', e);
    }

    fetched.forEach((quote, symbol) => {
      results.set(symbol, quote);
      const cached = { quote, fetchedAt: Date.now(), isMock: false };
      memoryCache.set(symbol.toUpperCase(), cached);
      updatedLocalCache[symbol.toUpperCase()] = cached;
    });

    // For any symbols that weren't fetched (or if fetch failed), use mock
    const fetchedSymbols = new Set([...fetched.keys()].map(s => s.toUpperCase()));
    const stillMissing = toFetch.filter(s => !fetchedSymbols.has(s.toUpperCase()));

    for (const symbol of stillMissing) {
      const mockQuote = getMockQuote(symbol.toUpperCase());
      if (mockQuote) {
        results.set(symbol, mockQuote);
        const cached = { quote: mockQuote, fetchedAt: Date.now(), isMock: true };
        memoryCache.set(symbol.toUpperCase(), cached);
        updatedLocalCache[symbol.toUpperCase()] = cached;
      }
    }

    setLocalCache(updatedLocalCache);
  } else {
    console.log(`[BATCH CACHE HIT] All ${symbols.length} symbols from cache`);
  }

  return results;
}

/**
 * Check if a cached quote is using mock data
 */
export function isQuoteMock(symbol: string): boolean {
  const cached = memoryCache.get(symbol.toUpperCase());
  return cached?.isMock ?? false;
}

/**
 * Check if any quotes are using mock data
 */
export function hasAnyMockData(): boolean {
  for (const cached of memoryCache.values()) {
    if (cached.isMock) return true;
  }
  return false;
}

/**
 * Clear all caches (for testing/debugging)
 */
export function clearQuoteCache() {
  memoryCache.clear();
  profileMemoryCache.clear();
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(PROFILE_STORAGE_KEY);
  console.log('[CACHE] Cleared all quote caches');
}

/**
 * Get cache stats for debugging
 */
export function getCacheStats() {
  const localCache = getLocalCache();
  const profileCache = getProfileLocalCache();
  const ttl = getCacheTTL();

  return {
    memoryQuotes: memoryCache.size,
    localQuotes: Object.keys(localCache).length,
    memoryProfiles: profileMemoryCache.size,
    localProfiles: Object.keys(profileCache).length,
    ttlSeconds: ttl / 1000,
    isMarketHours: ttl === 30 * 1000,
  };
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
