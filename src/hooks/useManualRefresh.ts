import { useState, useCallback, useEffect, useRef } from 'react';
import { getCachedQuote, setCachedQuote, getQuoteOptimized, type CachedQuote } from '@/services/MarketDataManager';
import type { QuoteData } from '@/services/marketDataService';

export type StalenessLevel = 'fresh' | 'slight' | 'moderate' | 'stale';

export function getStalenessLevel(lastUpdated: Date | null): StalenessLevel {
  if (!lastUpdated) return 'stale';
  
  const ageMs = Date.now() - lastUpdated.getTime();
  const ageMinutes = ageMs / (1000 * 60);
  
  if (ageMinutes < 5) return 'fresh';        // < 5 min: show normally
  if (ageMinutes < 60) return 'slight';      // 5-60 min: subtle gray
  if (ageMinutes < 24 * 60) return 'moderate'; // 1-24 hours: yellow
  return 'stale';                             // > 24 hours: orange
}

export function formatStalenessText(lastUpdated: Date | null): string | null {
  if (!lastUpdated) return 'No data';
  
  const ageMs = Date.now() - lastUpdated.getTime();
  const ageMinutes = Math.floor(ageMs / (1000 * 60));
  const ageHours = Math.floor(ageMinutes / 60);
  
  if (ageMinutes < 5) return null; // Fresh - don't show
  if (ageMinutes < 60) return `${ageMinutes}m ago`;
  if (ageHours < 24) return `${ageHours}h ago`;
  return 'Stale - click to refresh';
}

export function getStalenessColor(level: StalenessLevel): string {
  switch (level) {
    case 'fresh': return '';
    case 'slight': return 'text-muted-foreground';
    case 'moderate': return 'text-yellow-500';
    case 'stale': return 'text-orange-500';
  }
}

interface UseManualRefreshOptions {
  /**
   * If true, will auto-fetch once when data is older than 5 minutes
   * Useful for detail panels
   */
  autoFetchIfStale?: boolean;
  
  /**
   * Cache TTL in minutes before considering data stale for auto-fetch
   */
  staleTTLMinutes?: number;
}

interface UseManualRefreshReturn {
  data: CachedQuote | null;
  isRefreshing: boolean;
  error: string | null;
  lastUpdated: Date | null;
  isStale: boolean;
  stalenessLevel: StalenessLevel;
  stalenessText: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook for manual-only market data refresh.
 * No automatic polling - data only fetched when refresh() is called.
 */
export function useManualRefresh(
  ticker: string | null,
  options: UseManualRefreshOptions = {}
): UseManualRefreshReturn {
  const { autoFetchIfStale = false, staleTTLMinutes = 5 } = options;
  
  const [data, setData] = useState<CachedQuote | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const hasFetchedRef = useRef(false);
  
  // Load from cache on mount/ticker change
  useEffect(() => {
    mountedRef.current = true;
    hasFetchedRef.current = false;
    
    if (ticker) {
      const cached = getCachedQuote(ticker);
      setData(cached);
      setError(null);
    } else {
      setData(null);
    }
    
    return () => {
      mountedRef.current = false;
    };
  }, [ticker]);
  
  // Auto-fetch if stale (for detail panels)
  useEffect(() => {
    if (!autoFetchIfStale || !ticker || hasFetchedRef.current) return;
    
    const cached = getCachedQuote(ticker);
    const ageMinutes = cached?.lastUpdated 
      ? (Date.now() - cached.lastUpdated.getTime()) / (1000 * 60)
      : Infinity;
    
    if (ageMinutes > staleTTLMinutes) {
      hasFetchedRef.current = true;
      refresh();
    }
  }, [ticker, autoFetchIfStale, staleTTLMinutes]);
  
  const refresh = useCallback(async () => {
    if (!ticker || isRefreshing) return;
    
    setIsRefreshing(true);
    setError(null);
    
    try {
      const quote = await getQuoteOptimized(ticker);
      
      if (mountedRef.current) {
        const cached = getCachedQuote(ticker);
        setData(cached);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to refresh');
      }
    } finally {
      if (mountedRef.current) {
        setIsRefreshing(false);
      }
    }
  }, [ticker, isRefreshing]);
  
  const lastUpdated = data?.lastUpdated ?? null;
  const stalenessLevel = getStalenessLevel(lastUpdated);
  const stalenessText = formatStalenessText(lastUpdated);
  const isStale = stalenessLevel !== 'fresh';
  
  return {
    data,
    isRefreshing,
    error,
    lastUpdated,
    isStale,
    stalenessLevel,
    stalenessText,
    refresh,
  };
}

/**
 * Hook for batch manual refresh of multiple tickers
 */
export function useBatchManualRefresh(tickers: string[]) {
  const [quotes, setQuotes] = useState<Map<string, CachedQuote>>(new Map());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const mountedRef = useRef(true);
  
  // Load from cache on mount
  useEffect(() => {
    mountedRef.current = true;
    
    const cached = new Map<string, CachedQuote>();
    for (const ticker of tickers) {
      const quote = getCachedQuote(ticker);
      if (quote) cached.set(ticker.toUpperCase(), quote);
    }
    setQuotes(cached);
    
    return () => {
      mountedRef.current = false;
    };
  }, [tickers.join(',')]);
  
  const refresh = useCallback(async () => {
    if (tickers.length === 0 || isRefreshing) return;
    
    setIsRefreshing(true);
    setError(null);
    
    try {
      // Import dynamically to avoid circular deps
      const { getBatchQuotes } = await import('@/services/MarketDataManager');
      await getBatchQuotes(tickers);
      
      if (mountedRef.current) {
        const updated = new Map<string, CachedQuote>();
        for (const ticker of tickers) {
          const quote = getCachedQuote(ticker);
          if (quote) updated.set(ticker.toUpperCase(), quote);
        }
        setQuotes(updated);
        setLastRefreshed(new Date());
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to refresh');
      }
    } finally {
      if (mountedRef.current) {
        setIsRefreshing(false);
      }
    }
  }, [tickers, isRefreshing]);
  
  // Calculate oldest data age
  const oldestUpdate = Array.from(quotes.values()).reduce<Date | null>((oldest, q) => {
    if (!oldest || (q.lastUpdated && q.lastUpdated < oldest)) {
      return q.lastUpdated;
    }
    return oldest;
  }, null);
  
  const stalenessLevel = getStalenessLevel(oldestUpdate);
  const stalenessText = formatStalenessText(oldestUpdate);
  
  return {
    quotes,
    isRefreshing,
    error,
    lastRefreshed,
    refresh,
    count: quotes.size,
    totalTickers: tickers.length,
    stalenessLevel,
    stalenessText,
  };
}
