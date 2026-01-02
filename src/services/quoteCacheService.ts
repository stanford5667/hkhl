/**
 * Multi-layer Quote Cache Service
 * Layer 1: In-memory cache (instant, survives within session)
 * Layer 2: LocalStorage cache (survives page refresh)
 */

import { getQuote, getBatchQuotes, getCompanyProfile, type StockQuote } from './finnhubService';

interface CachedQuote {
  quote: StockQuote;
  fetchedAt: number;
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
 * Get a single quote with multi-layer caching
 */
export async function getCachedQuote(symbol: string): Promise<StockQuote | null> {
  const upperSymbol = symbol.toUpperCase();

  // Check memory cache first
  const memCached = memoryCache.get(upperSymbol);
  if (memCached && isCacheValid(memCached)) {
    console.log(`[CACHE HIT] Memory: ${upperSymbol}`);
    return memCached.quote;
  }

  // Check localStorage
  const localCache = getLocalCache();
  const localCached = localCache[upperSymbol];
  if (localCached && isCacheValid(localCached)) {
    console.log(`[CACHE HIT] Local: ${upperSymbol}`);
    // Promote to memory cache
    memoryCache.set(upperSymbol, localCached);
    return localCached.quote;
  }

  // Cache miss - fetch from API
  console.log(`[CACHE MISS] Fetching: ${upperSymbol}`);
  const quote = await getQuote(upperSymbol);

  if (quote) {
    const cached = { quote, fetchedAt: Date.now() };
    memoryCache.set(upperSymbol, cached);
    localCache[upperSymbol] = cached;
    setLocalCache(localCache);
  }

  return quote;
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
 * Batch fetch with cache awareness
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
    const fetched = await getBatchQuotes(toFetch);
    const updatedLocalCache = getLocalCache();

    fetched.forEach((quote, symbol) => {
      results.set(symbol, quote);
      const cached = { quote, fetchedAt: Date.now() };
      memoryCache.set(symbol.toUpperCase(), cached);
      updatedLocalCache[symbol.toUpperCase()] = cached;
    });

    setLocalCache(updatedLocalCache);
  } else {
    console.log(`[BATCH CACHE HIT] All ${symbols.length} symbols from cache`);
  }

  return results;
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
