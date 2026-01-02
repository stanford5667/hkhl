import { useState, useEffect, useCallback, useRef } from 'react';
import { useDevMode } from '@/contexts/DevModeContext';
import { 
  getQuote, 
  searchTicker, 
  getMarketIndices, 
  getCompanyInfo,
  clearQuoteCache,
  type QuoteData,
  type TickerSearchResult,
  type MarketIndex,
  type CompanyInfo
} from '@/services/marketDataService';

// Hook for fetching stock quotes with auto-refresh
export function useStockQuote(ticker: string | null, options: { enabled?: boolean; pollInterval?: number } = {}) {
  const { enabled = true, pollInterval = 60000 } = options; // Default 60 second polling
  const { marketDataEnabled } = useDevMode();
  
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  const mountedRef = useRef(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchQuote = useCallback(async (forceRefresh = false) => {
    if (!ticker || !enabled) return;
    
    // Don't fetch if market data is disabled (will use cached data from service)
    if (forceRefresh) {
      clearQuoteCache(ticker);
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await getQuote(ticker);
      if (mountedRef.current) {
        setQuote(data);
        setLastUpdated(new Date());
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch quote');
        // Don't clear existing quote data on error
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [ticker, enabled]);

  const refresh = useCallback(() => fetchQuote(true), [fetchQuote]);

  useEffect(() => {
    mountedRef.current = true;
    
    if (ticker && enabled) {
      fetchQuote();
      
      // Only set up polling if market data is enabled
      if (marketDataEnabled) {
        intervalRef.current = setInterval(() => {
          fetchQuote(true);
        }, pollInterval);
      }
    }
    
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [ticker, enabled, pollInterval, fetchQuote, marketDataEnabled]);

  return {
    quote,
    isLoading,
    error,
    lastUpdated,
    refresh,
    isUnavailable: error !== null && quote === null,
  };
}

// Hook for debounced ticker search
export function useTickerSearch(query: string, options: { enabled?: boolean; debounceMs?: number } = {}) {
  const { enabled = true, debounceMs = 300 } = options;
  
  const [results, setResults] = useState<TickerSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    
    if (!enabled || !query || query.length < 1) {
      setResults([]);
      setIsSearching(false);
      return;
    }
    
    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    setIsSearching(true);
    
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await searchTicker(query);
        if (mountedRef.current) {
          setResults(data);
          setError(null);
        }
      } catch (err) {
        if (mountedRef.current) {
          setError(err instanceof Error ? err.message : 'Search failed');
          setResults([]);
        }
      } finally {
        if (mountedRef.current) {
          setIsSearching(false);
        }
      }
    }, debounceMs);
    
    return () => {
      mountedRef.current = false;
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, enabled, debounceMs]);

  return {
    results,
    isSearching,
    error,
    hasResults: results.length > 0,
  };
}

// Hook for market indices with auto-refresh
export function useMarketIndices(options: { enabled?: boolean; pollInterval?: number } = {}) {
  const { enabled = true, pollInterval = 5 * 60 * 1000 } = options; // Default 5 minute polling
  const { marketDataEnabled } = useDevMode();
  
  const [indices, setIndices] = useState<MarketIndex[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  const mountedRef = useRef(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchIndices = useCallback(async () => {
    if (!enabled) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await getMarketIndices();
      if (mountedRef.current) {
        setIndices(data);
        setLastUpdated(new Date());
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch indices');
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [enabled]);

  const refresh = useCallback(() => fetchIndices(), [fetchIndices]);

  useEffect(() => {
    mountedRef.current = true;
    
    if (enabled) {
      fetchIndices();
      
      // Only set up polling if market data is enabled
      if (marketDataEnabled) {
        intervalRef.current = setInterval(fetchIndices, pollInterval);
      }
    }
    
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, pollInterval, fetchIndices, marketDataEnabled]);

  return {
    indices,
    isLoading,
    error,
    lastUpdated,
    refresh,
  };
}

// Hook for company info (typically one-time fetch)
export function useCompanyInfo(ticker: string | null, options: { enabled?: boolean } = {}) {
  const { enabled = true } = options;
  
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const mountedRef = useRef(true);

  const fetchInfo = useCallback(async () => {
    if (!ticker || !enabled) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await getCompanyInfo(ticker);
      if (mountedRef.current) {
        setCompanyInfo(data);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch company info');
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [ticker, enabled]);

  const refresh = useCallback(() => fetchInfo(), [fetchInfo]);

  useEffect(() => {
    mountedRef.current = true;
    
    if (ticker && enabled) {
      fetchInfo();
    }
    
    return () => {
      mountedRef.current = false;
    };
  }, [ticker, enabled, fetchInfo]);

  return {
    companyInfo,
    isLoading,
    error,
    refresh,
  };
}

// Combined hook for a complete stock view
export function useStockData(ticker: string | null, options: { enabled?: boolean } = {}) {
  const { enabled = true } = options;
  
  const quote = useStockQuote(ticker, { enabled });
  const company = useCompanyInfo(ticker, { enabled });
  
  return {
    // Quote data
    price: quote.quote?.price,
    change: quote.quote?.change,
    changePercent: quote.quote?.changePercent,
    volume: quote.quote?.volume,
    marketCap: quote.quote?.marketCap,
    high52: quote.quote?.high52,
    low52: quote.quote?.low52,
    
    // Company data
    name: company.companyInfo?.name,
    sector: company.companyInfo?.sector,
    industry: company.companyInfo?.industry,
    peRatio: company.companyInfo?.peRatio,
    eps: company.companyInfo?.eps,
    dividendYield: company.companyInfo?.dividendYield,
    description: company.companyInfo?.description,
    
    // Loading states
    isLoading: quote.isLoading || company.isLoading,
    isQuoteLoading: quote.isLoading,
    isCompanyLoading: company.isLoading,
    
    // Errors
    error: quote.error || company.error,
    isUnavailable: quote.isUnavailable,
    
    // Last updated
    lastUpdated: quote.lastUpdated,
    
    // Refresh functions
    refreshQuote: quote.refresh,
    refreshCompany: company.refresh,
    refreshAll: () => {
      quote.refresh();
      company.refresh();
    },
  };
}
