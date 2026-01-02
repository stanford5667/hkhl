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

// ============= Individual Quote Hook - NO AUTO REFETCH =============

export function useMarketDataQuery(
  ticker: string | null,
  options: {
    enabled?: boolean;
  } = {}
) {
  const { enabled = true } = options;
  const [cachedData, setCachedData] = useState<CachedQuote | null>(null);
  
  // Check for cached data first
  useEffect(() => {
    if (ticker) {
      const cached = getCachedQuote(ticker);
      if (cached) setCachedData(cached);
    }
  }, [ticker]);
  
  // Main query - NO refetchInterval
  const query = useQuery({
    queryKey: marketDataKeys.quote(ticker || ''),
    queryFn: () => getQuoteOptimized(ticker!),
    enabled: enabled && !!ticker,
    staleTime: getStaleTime(),
    refetchInterval: false, // NO automatic polling
    refetchOnWindowFocus: false, // NO auto-refresh on window focus
    placeholderData: cachedData || undefined,
  });
  
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
    
    // Manual refresh only
    refresh: query.refetch,
    
    // Market status
    marketStatus: getMarketStatus(),
    isMarketOpen: isMarketOpen(),
  };
}

// ============= Batch Quotes Hook - NO AUTO REFETCH =============

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
    refetchInterval: false, // NO automatic polling
    refetchOnWindowFocus: false,
  });
  
  return {
    quotes: query.data || new Map<string, QuoteData>(),
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refresh: query.refetch,
  };
}

// ============= Market Indices Hook - NO AUTO REFETCH =============

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
    staleTime: isMarketOpen() ? 30 * 1000 : 5 * 60 * 1000,
    refetchInterval: false, // NO automatic polling
    refetchOnWindowFocus: false,
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

// ============= Prefetch Holdings Hook (manual trigger) =============

export function usePrefetchHoldings(tickers: string[]) {
  const queryClient = useQueryClient();
  
  const prefetch = useCallback(async () => {
    if (tickers.length === 0) return;
    
    await marketDataManager.prefetchHoldings(tickers);
    
    // Update React Query cache
    for (const ticker of tickers) {
      const cached = getCachedQuote(ticker);
      if (cached) {
        queryClient.setQueryData(marketDataKeys.quote(ticker), cached);
      }
    }
  }, [tickers.join(','), queryClient]);
  
  return { prefetch };
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
    
    const timer = setTimeout(() => {
      setPriceChangeDirection(null);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [currentPrice]);
  
  return priceChangeDirection;
}

// ============= Market Status Hook =============

export function useMarketStatus() {
  // DISABLED: Auto-polling removed - status calculated on-demand only
  const [status, setStatus] = useState(getMarketStatus);
  
  // No automatic interval - status is calculated when component mounts
  // User can trigger re-calculation by refreshing the page
  
  return {
    status,
    isOpen: status === 'open',
    isPreMarket: status === 'pre-market',
    isAfterHours: status === 'after-hours',
    isClosed: status === 'closed',
  };
}
