import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useCallback, useState } from 'react';
import {
  marketDataManager,
  getQuoteOptimized,
  getIndicesOptimized,
  getBatchQuotes,
  getCachedQuote,
  getCachedIndices,
  isMarketOpen,
  getMarketStatus,
  getPollInterval,
  getCacheTTL,
  formatTimeAgo,
  type CachedQuote,
} from '@/services/MarketDataManager';
import type { QuoteData, MarketIndex } from '@/services/marketDataService';

// ============= Query Keys =============

export const marketDataKeys = {
  all: ['marketData'] as const,
  quotes: () => [...marketDataKeys.all, 'quotes'] as const,
  quote: (ticker: string) => [...marketDataKeys.quotes(), ticker.toUpperCase()] as const,
  batchQuotes: (tickers: string[]) => [...marketDataKeys.quotes(), 'batch', tickers.sort().join(',')] as const,
  indices: () => [...marketDataKeys.all, 'indices'] as const,
};

// ============= Market-Hours-Aware Stale Time =============

function getStaleTime(): number {
  return getCacheTTL();
}

function getRefetchInterval(): number | false {
  // Don't auto-refetch if in the background
  if (typeof document !== 'undefined' && document.hidden) {
    return false;
  }
  return getPollInterval();
}

// ============= Individual Quote Hook =============

export function useMarketDataQuery(
  ticker: string | null,
  options: {
    enabled?: boolean;
    subscribeToUpdates?: boolean;
  } = {}
) {
  const { enabled = true, subscribeToUpdates = true } = options;
  const [cachedData, setCachedData] = useState<CachedQuote | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const elementRef = useRef<HTMLElement | null>(null);
  
  // Check for cached data first
  useEffect(() => {
    if (ticker) {
      const cached = getCachedQuote(ticker);
      if (cached) setCachedData(cached);
    }
  }, [ticker]);
  
  // Main query
  const query = useQuery({
    queryKey: marketDataKeys.quote(ticker || ''),
    queryFn: () => getQuoteOptimized(ticker!),
    enabled: enabled && !!ticker,
    staleTime: getStaleTime(),
    refetchInterval: subscribeToUpdates ? getRefetchInterval() : false,
    refetchOnWindowFocus: true,
    placeholderData: cachedData || undefined,
  });
  
  // Subscribe to manager updates
  useEffect(() => {
    if (!ticker || !subscribeToUpdates || !enabled) return;
    
    const unsubscribe = marketDataManager.subscribe(ticker, (quotes) => {
      const quote = quotes.get(ticker.toUpperCase());
      if (quote) {
        setCachedData(quote);
      }
    });
    
    return unsubscribe;
  }, [ticker, subscribeToUpdates, enabled]);
  
  // Intersection observer for viewport-based polling
  const setObserverElement = useCallback((element: HTMLElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }
    
    if (!element || !ticker) return;
    
    elementRef.current = element;
    
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            marketDataManager.markVisible(ticker);
          } else {
            marketDataManager.markHidden(ticker);
          }
        });
      },
      { threshold: 0.1 }
    );
    
    observerRef.current.observe(element);
  }, [ticker]);
  
  // Cleanup observer
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (ticker) {
        marketDataManager.markHidden(ticker);
      }
    };
  }, [ticker]);
  
  // Compute display values
  const displayData = query.data || cachedData;
  const lastUpdated = cachedData?.lastUpdated;
  const timeAgo = lastUpdated ? formatTimeAgo(lastUpdated) : null;
  const isStale = cachedData?.isStale ?? false;
  
  return {
    // Query data
    data: displayData,
    isLoading: query.isLoading && !cachedData,
    isFetching: query.isFetching,
    error: query.error,
    
    // Cache info
    lastUpdated,
    timeAgo,
    isStale,
    
    // Refresh
    refresh: query.refetch,
    
    // For viewport observation
    setObserverElement,
    
    // Market status
    marketStatus: getMarketStatus(),
    isMarketOpen: isMarketOpen(),
  };
}

// ============= Batch Quotes Hook =============

export function useBatchQuotes(
  tickers: string[],
  options: { enabled?: boolean } = {}
) {
  const { enabled = true } = options;
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: marketDataKeys.batchQuotes(tickers),
    queryFn: async () => {
      const results = await getBatchQuotes(tickers);
      
      // Update individual query caches
      for (const [ticker, quote] of results.entries()) {
        queryClient.setQueryData(marketDataKeys.quote(ticker), quote);
      }
      
      return results;
    },
    enabled: enabled && tickers.length > 0,
    staleTime: getStaleTime(),
    refetchInterval: getRefetchInterval(),
  });
  
  return {
    quotes: query.data || new Map<string, QuoteData>(),
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refresh: query.refetch,
  };
}

// ============= Market Indices Hook =============

export function useMarketIndicesQuery(options: { enabled?: boolean } = {}) {
  const { enabled = true } = options;
  const [cachedData, setCachedData] = useState<MarketIndex[] | null>(null);
  
  // Check cache first
  useEffect(() => {
    const cached = getCachedIndices();
    if (cached) setCachedData(cached);
  }, []);
  
  const query = useQuery({
    queryKey: marketDataKeys.indices(),
    queryFn: getIndicesOptimized,
    enabled,
    staleTime: isMarketOpen() ? 30 * 1000 : 5 * 60 * 1000, // 30s open, 5min closed
    refetchInterval: isMarketOpen() ? 30 * 1000 : 5 * 60 * 1000,
    placeholderData: cachedData || undefined,
  });
  
  return {
    indices: query.data || cachedData || [],
    isLoading: query.isLoading && !cachedData,
    isFetching: query.isFetching,
    error: query.error,
    refresh: query.refetch,
    marketStatus: getMarketStatus(),
  };
}

// ============= Prefetch Holdings Hook =============

export function usePrefetchHoldings(tickers: string[]) {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    if (tickers.length === 0) return;
    
    // Prefetch all holdings on mount
    marketDataManager.prefetchHoldings(tickers).then(() => {
      // Update React Query cache
      for (const ticker of tickers) {
        const cached = getCachedQuote(ticker);
        if (cached) {
          queryClient.setQueryData(marketDataKeys.quote(ticker), cached);
        }
      }
    });
  }, [tickers.join(','), queryClient]);
}

// ============= Price Change Animation Hook =============

export function usePriceChangeAnimation(currentPrice: number | undefined) {
  const prevPriceRef = useRef<number | undefined>(currentPrice);
  const [priceChangeDirection, setPriceChangeDirection] = useState<'up' | 'down' | null>(null);
  
  useEffect(() => {
    if (currentPrice === undefined || prevPriceRef.current === undefined) {
      prevPriceRef.current = currentPrice;
      return;
    }
    
    if (currentPrice > prevPriceRef.current) {
      setPriceChangeDirection('up');
    } else if (currentPrice < prevPriceRef.current) {
      setPriceChangeDirection('down');
    }
    
    prevPriceRef.current = currentPrice;
    
    // Clear animation after a short delay
    const timer = setTimeout(() => {
      setPriceChangeDirection(null);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [currentPrice]);
  
  return priceChangeDirection;
}

// ============= Market Status Hook =============

export function useMarketStatus() {
  const [status, setStatus] = useState(getMarketStatus);
  
  useEffect(() => {
    // Check every minute
    const interval = setInterval(() => {
      setStatus(getMarketStatus());
    }, 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  return {
    status,
    isOpen: status === 'open',
    isPreMarket: status === 'pre-market',
    isAfterHours: status === 'after-hours',
    isClosed: status === 'closed',
  };
}
