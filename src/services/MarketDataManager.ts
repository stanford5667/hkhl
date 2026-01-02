import { supabase } from '@/integrations/supabase/client';
import type { QuoteData, MarketIndex } from './marketDataService';
import { isMarketDataEnabled, setDevModeState } from './marketDataService';

// Re-export for convenience
export { setDevModeState };

// ============= Types =============

export interface CachedQuote extends QuoteData {
  ticker: string;
  lastUpdated: Date;
  isStale: boolean;
}

export interface MarketDataConfig {
  pollIntervalMarketOpen: number;  // ms - default 60s
  pollIntervalMarketClosed: number; // ms - default 30min
  indexPollInterval: number; // ms - default 30s for indices
  cacheTimeTTLOpen: number; // ms - 2 min during market hours
  cacheTimeTTLClosed: number; // ms - 4 hours when closed
}

// ============= Market Hours Utilities =============

export function isMarketOpen(): boolean {
  const now = new Date();
  const nyTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const day = nyTime.getDay();
  const hours = nyTime.getHours();
  const minutes = nyTime.getMinutes();
  const timeInMinutes = hours * 60 + minutes;
  
  // Market open 9:30 AM - 4:00 PM ET, Monday-Friday
  const isWeekday = day >= 1 && day <= 5;
  const isMarketHours = timeInMinutes >= 9 * 60 + 30 && timeInMinutes < 16 * 60;
  
  return isWeekday && isMarketHours;
}

export function getMarketStatus(): 'open' | 'pre-market' | 'after-hours' | 'closed' {
  const now = new Date();
  const nyTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const day = nyTime.getDay();
  const hours = nyTime.getHours();
  const minutes = nyTime.getMinutes();
  const timeInMinutes = hours * 60 + minutes;
  
  const isWeekday = day >= 1 && day <= 5;
  
  if (!isWeekday) return 'closed';
  
  // Pre-market: 4:00 AM - 9:30 AM ET
  if (timeInMinutes >= 4 * 60 && timeInMinutes < 9 * 60 + 30) return 'pre-market';
  
  // Market hours: 9:30 AM - 4:00 PM ET
  if (timeInMinutes >= 9 * 60 + 30 && timeInMinutes < 16 * 60) return 'open';
  
  // After-hours: 4:00 PM - 8:00 PM ET
  if (timeInMinutes >= 16 * 60 && timeInMinutes < 20 * 60) return 'after-hours';
  
  return 'closed';
}

export function getCacheTTL(): number {
  return isMarketOpen() ? 2 * 60 * 1000 : 4 * 60 * 60 * 1000; // 2min open, 4hr closed
}

export function getPollInterval(): number {
  return isMarketOpen() ? 60 * 1000 : 30 * 60 * 1000; // 60s open, 30min closed
}

// ============= In-Flight Request Deduplication =============

const inFlightRequests = new Map<string, Promise<any>>();

async function deduplicatedRequest<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
  const existing = inFlightRequests.get(key);
  if (existing) {
    return existing as Promise<T>;
  }
  
  const promise = requestFn().finally(() => {
    inFlightRequests.delete(key);
  });
  
  inFlightRequests.set(key, promise);
  return promise;
}

// ============= Enhanced Cache with Market-Aware TTL =============

interface EnhancedCacheEntry<T> {
  data: T;
  timestamp: number;
  ticker?: string;
}

const quoteCache = new Map<string, EnhancedCacheEntry<QuoteData>>();
const indicesCache: { data: MarketIndex[] | null; timestamp: number } = { data: null, timestamp: 0 };

export function getCachedQuote(ticker: string): CachedQuote | null {
  const entry = quoteCache.get(ticker.toUpperCase());
  if (!entry) return null;
  
  const ttl = getCacheTTL();
  const age = Date.now() - entry.timestamp;
  const isStale = age > ttl;
  
  return {
    ...entry.data,
    ticker: ticker.toUpperCase(),
    lastUpdated: new Date(entry.timestamp),
    isStale,
  };
}

export function setCachedQuote(ticker: string, data: QuoteData): void {
  quoteCache.set(ticker.toUpperCase(), {
    data,
    timestamp: Date.now(),
    ticker: ticker.toUpperCase(),
  });
}

export function getCachedIndices(): MarketIndex[] | null {
  if (!indicesCache.data) return null;
  const ttl = isMarketOpen() ? 30 * 1000 : 5 * 60 * 1000; // 30s open, 5min closed
  if (Date.now() - indicesCache.timestamp > ttl) return null;
  return indicesCache.data;
}

export function setCachedIndices(data: MarketIndex[]): void {
  indicesCache.data = data;
  indicesCache.timestamp = Date.now();
}

// ============= Batch Quote Fetching =============

export async function getBatchQuotes(tickers: string[]): Promise<Map<string, QuoteData>> {
  if (tickers.length === 0) return new Map();
  
  const uniqueTickers = [...new Set(tickers.map(t => t.toUpperCase()))];
  const results = new Map<string, QuoteData>();
  const tickersToFetch: string[] = [];
  
  // Check cache first
  for (const ticker of uniqueTickers) {
    const cached = getCachedQuote(ticker);
    if (cached && !cached.isStale) {
      results.set(ticker, cached);
    } else {
      tickersToFetch.push(ticker);
    }
  }
  
  if (tickersToFetch.length === 0) {
    return results;
  }
  
  // Batch fetch remaining tickers
  try {
    // Skip API call if market data is paused
    if (!isMarketDataEnabled()) {
      console.log('[MarketData] Skipping batch fetch - market data paused');
      // Return stale cache for unfetched tickers
      for (const ticker of tickersToFetch) {
        const stale = getCachedQuote(ticker);
        if (stale) {
          results.set(ticker, stale);
        }
      }
      return results;
    }

    const batchKey = `batch:${tickersToFetch.sort().join(',')}`;
    
    console.log(`[API] market-data/batchQuotes`, { tickers: tickersToFetch });

    const response = await deduplicatedRequest(batchKey, async () => {
      const { data, error } = await supabase.functions.invoke('market-data', {
        body: { type: 'batchQuotes', tickers: tickersToFetch }
      });
      
      if (error) throw error;
      return data;
    });
    
    if (response?.success && response?.data) {
      for (const [ticker, quote] of Object.entries(response.data as Record<string, QuoteData>)) {
        results.set(ticker.toUpperCase(), quote as QuoteData);
        setCachedQuote(ticker, quote as QuoteData);
      }
    }
  } catch (error) {
    console.error('Batch quote fetch error:', error);
    // Return cached stale data for tickers that failed
    for (const ticker of tickersToFetch) {
      const stale = getCachedQuote(ticker);
      if (stale) {
        results.set(ticker, stale);
      }
    }
  }
  
  return results;
}

// ============= Single Quote with Deduplication =============

export async function getQuoteOptimized(ticker: string): Promise<QuoteData> {
  const upperTicker = ticker.toUpperCase();
  const cached = getCachedQuote(upperTicker);
  
  // Return fresh cache immediately
  if (cached && !cached.isStale) {
    return cached;
  }

  // If market data is paused, return stale cache or throw
  if (!isMarketDataEnabled()) {
    if (cached) return cached;
    throw new Error('Market data is paused. Enable live data to fetch quotes.');
  }
  
  const requestKey = `quote:${upperTicker}`;
  
  console.log(`[API] market-data/quote`, { ticker: upperTicker });
  
  return deduplicatedRequest(requestKey, async () => {
    const { data, error } = await supabase.functions.invoke('market-data', {
      body: { type: 'quote', ticker: upperTicker }
    });
    
    if (error || !data?.success) {
      // Return stale cache on error
      if (cached) return cached;
      throw new Error(error?.message || data?.error || 'Failed to fetch quote');
    }
    
    setCachedQuote(upperTicker, data.data);
    return data.data;
  });
}

// ============= Market Indices with Deduplication =============

export async function getIndicesOptimized(): Promise<MarketIndex[]> {
  const cached = getCachedIndices();
  if (cached) return cached;

  // If market data is paused, return empty
  if (!isMarketDataEnabled()) {
    console.log('[MarketData] Skipping indices fetch - market data paused');
    return [];
  }
  
  console.log(`[API] market-data/indices`);
  
  return deduplicatedRequest('indices', async () => {
    const { data, error } = await supabase.functions.invoke('market-data', {
      body: { type: 'indices' }
    });
    
    if (error || !data?.success) {
      throw new Error(error?.message || data?.error || 'Failed to fetch indices');
    }
    
    setCachedIndices(data.data);
    return data.data;
  });
}

// ============= Subscription Manager Singleton =============

type SubscriptionCallback = (quotes: Map<string, CachedQuote>) => void;

class MarketDataSubscriptionManager {
  private static instance: MarketDataSubscriptionManager;
  
  private subscribedTickers = new Set<string>();
  private callbacks = new Map<string, Set<SubscriptionCallback>>();
  
  private constructor() {
    // No automatic polling - manual refresh only
  }
  
  static getInstance(): MarketDataSubscriptionManager {
    if (!MarketDataSubscriptionManager.instance) {
      MarketDataSubscriptionManager.instance = new MarketDataSubscriptionManager();
    }
    return MarketDataSubscriptionManager.instance;
  }
  
  /**
   * Subscribe to updates for a ticker - NO automatic polling.
   * Updates only happen when prefetchHoldings or manual refresh is called.
   */
  subscribe(ticker: string, callback: SubscriptionCallback): () => void {
    const upperTicker = ticker.toUpperCase();
    this.subscribedTickers.add(upperTicker);
    
    if (!this.callbacks.has(upperTicker)) {
      this.callbacks.set(upperTicker, new Set());
    }
    this.callbacks.get(upperTicker)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      const tickerCallbacks = this.callbacks.get(upperTicker);
      if (tickerCallbacks) {
        tickerCallbacks.delete(callback);
        if (tickerCallbacks.size === 0) {
          this.subscribedTickers.delete(upperTicker);
          this.callbacks.delete(upperTicker);
        }
      }
    };
  }
  
  // Mark ticker as visible in viewport (for future optimization)
  markVisible(ticker: string): void {
    // No-op - no automatic polling
  }
  
  // Mark ticker as not visible
  markHidden(ticker: string): void {
    // No-op - no automatic polling
  }
  
  /**
   * Manually refresh quotes for specified tickers
   */
  async refreshTickers(tickers: string[]): Promise<Map<string, CachedQuote>> {
    if (tickers.length === 0) return new Map();
    
    const quotes = await getBatchQuotes(tickers);
    const cachedQuotes = new Map<string, CachedQuote>();
    
    for (const [ticker, quote] of quotes.entries()) {
      const cached = getCachedQuote(ticker);
      if (cached) cachedQuotes.set(ticker, cached);
    }
    
    // Notify subscribers
    for (const [ticker, callbackSet] of this.callbacks.entries()) {
      if (cachedQuotes.has(ticker)) {
        const singleQuoteMap = new Map([[ticker, cachedQuotes.get(ticker)!]]);
        for (const cb of callbackSet) {
          cb(singleQuoteMap);
        }
      }
    }
    
    return cachedQuotes;
  }
  
  /**
   * Prefetch quotes for holdings - called manually, not automatically
   */
  async prefetchHoldings(tickers: string[]): Promise<void> {
    if (tickers.length === 0) return;
    await getBatchQuotes(tickers);
  }
  
  getSubscribedTickers(): string[] {
    return [...this.subscribedTickers];
  }
  
  cleanup(): void {
    this.subscribedTickers.clear();
    this.callbacks.clear();
  }
}

export const marketDataManager = MarketDataSubscriptionManager.getInstance();

// ============= Utility Exports =============

export function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 120) return '1 min ago';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 7200) return '1 hour ago';
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return date.toLocaleDateString();
}

export function clearMarketDataCache(): void {
  quoteCache.clear();
  indicesCache.data = null;
  indicesCache.timestamp = 0;
}
