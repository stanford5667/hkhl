import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  getCachedQuote as getCachedQuoteFinnhub, 
  getCachedFullQuote,
  getCachedQuotes,
  clearQuoteCache as clearFinnhubCache,
} from '@/services/quoteCacheService';
import { searchTickersCancellable } from '@/services/tickerDirectoryService';

// Types compatible with existing usage
export interface QuoteData {
  price: number;
  change: number;
  changePercent: number;
  volume?: string;
  marketCap?: string;
  high52?: number;
  low52?: number;
  open?: number;
  high?: number;
  low?: number;
  previousClose?: number;
  source?: 'live' | 'cache';
  lastUpdated?: Date;
}

export interface TickerSearchResult {
  symbol: string;
  name: string;
  exchange?: string;
  source?: 'live' | 'cache' | 'local' | 'polygon' | 'api';
}

export interface MarketIndex {
  name: string;
  symbol: string;
  value: number;
  change: number;
  changePercent: number;
  source?: 'live' | 'cache';
}

export interface CompanyInfo {
  name: string;
  ticker: string;
  exchange?: string;
  sector?: string;
  industry?: string;
  peRatio?: number | null;
  eps?: number | null;
  dividendYield?: number | null;
  description?: string;
}

// Hook for fetching stock quotes - uses Finnhub via quoteCacheService
export function useStockQuote(ticker: string | null, options: { enabled?: boolean } = {}) {
  const { enabled = true } = options;
  
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  const mountedRef = useRef(true);

  const fetchQuote = useCallback(async (forceRefresh = false) => {
    if (!ticker || !enabled) return;
    
    if (forceRefresh) {
      clearFinnhubCache();
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await getCachedFullQuote(ticker);
      if (mountedRef.current) {
        if (data) {
          setQuote({
            price: data.price,
            change: data.change,
            changePercent: data.changePercent,
            open: data.open,
            high: data.high,
            low: data.low,
            previousClose: data.previousClose,
            marketCap: data.marketCap,
            source: 'live',
            lastUpdated: new Date(),
          });
          setLastUpdated(new Date());
        } else {
          setError('Unable to fetch quote');
        }
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch quote');
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [ticker, enabled]);

  // Auto-fetch on mount
  useEffect(() => {
    mountedRef.current = true;
    if (ticker && enabled) {
      fetchQuote();
    }
    return () => {
      mountedRef.current = false;
    };
  }, [ticker, enabled, fetchQuote]);

  const refresh = useCallback(() => fetchQuote(true), [fetchQuote]);

  return {
    quote,
    isLoading,
    error,
    lastUpdated,
    refresh,
    isUnavailable: error !== null && quote === null,
  };
}

// Hook for debounced ticker search - uses local database first with cancellation
export function useTickerSearchHook(query: string, options: { enabled?: boolean; debounceMs?: number } = {}) {
  const { enabled = true, debounceMs = 250 } = options;
  
  const [results, setResults] = useState<TickerSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastQueryRef = useRef<string>('');
  const searchIdRef = useRef(0);

  useEffect(() => {
    // Skip if same query or disabled
    const trimmedQuery = query.trim();
    if (!enabled || trimmedQuery === lastQueryRef.current) {
      return;
    }
    
    // Clear results for empty query
    if (!trimmedQuery || trimmedQuery.length < 1) {
      setResults([]);
      setIsSearching(false);
      setError(null);
      lastQueryRef.current = '';
      return;
    }
    
    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    setIsSearching(true);
    
    // Generate unique ID for this search
    const searchId = ++searchIdRef.current;
    
    debounceRef.current = setTimeout(async () => {
      // Check if this search is still the latest
      if (searchId !== searchIdRef.current) {
        return;
      }
      
      try {
        const data = await searchTickersCancellable(trimmedQuery);
        
        // Only update if this is still the latest search
        if (searchId === searchIdRef.current) {
          lastQueryRef.current = trimmedQuery;
          setResults(data.map(r => ({
            symbol: r.symbol,
            name: r.name,
            exchange: r.exchange ?? undefined,
            source: r.source,
          })));
          setError(null);
        }
      } catch (err) {
        // Only update error if this is still the latest search
        if (searchId === searchIdRef.current) {
          console.error('[useTickerSearchHook] Search error:', err);
          setError(err instanceof Error ? err.message : 'Search failed');
          // Keep existing results on error rather than clearing
        }
      } finally {
        if (searchId === searchIdRef.current) {
          setIsSearching(false);
        }
      }
    }, debounceMs);
    
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, enabled, debounceMs]);

  // Clear function for external use
  const clear = useCallback(() => {
    setResults([]);
    setError(null);
    setIsSearching(false);
    lastQueryRef.current = '';
    searchIdRef.current++;
  }, []);

  return {
    results,
    isSearching,
    error,
    hasResults: results.length > 0,
    clear,
  };
}

// Hook for market indices - uses Finnhub via quoteCacheService
export function useMarketIndices(options: { enabled?: boolean } = {}) {
  const { enabled = true } = options;
  
  const [indices, setIndices] = useState<MarketIndex[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  const mountedRef = useRef(true);

  const fetchIndices = useCallback(async () => {
    if (!enabled) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch major indices using Finnhub
      const indexSymbols = ['SPY', 'QQQ', 'DIA', 'IWM'];
      const quotes = await getCachedQuotes(indexSymbols);
      
      const indexNames: Record<string, string> = {
        'SPY': 'S&P 500',
        'QQQ': 'NASDAQ 100',
        'DIA': 'Dow Jones',
        'IWM': 'Russell 2000',
      };
      
      const indexData: MarketIndex[] = [];
      quotes.forEach((quote, symbol) => {
        indexData.push({
          name: indexNames[symbol] || symbol,
          symbol,
          value: quote.price,
          change: quote.change,
          changePercent: quote.changePercent,
          source: 'live',
        });
      });
      
      if (mountedRef.current) {
        setIndices(indexData);
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

  // Auto-fetch on mount
  useEffect(() => {
    mountedRef.current = true;
    if (enabled) {
      fetchIndices();
    }
    return () => {
      mountedRef.current = false;
    };
  }, [enabled, fetchIndices]);

  const refresh = useCallback(() => fetchIndices(), [fetchIndices]);

  return {
    indices,
    isLoading,
    error,
    lastUpdated,
    refresh,
  };
}

// Hook for company info - uses Finnhub profile via quoteCacheService
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
      // Use getCachedFullQuote which includes profile info
      const data = await getCachedFullQuote(ticker);
      if (mountedRef.current) {
        if (data) {
          setCompanyInfo({
            name: data.companyName || ticker,
            ticker: ticker.toUpperCase(),
            exchange: undefined,
            sector: undefined,
            industry: undefined,
            peRatio: null,
            eps: null,
            dividendYield: null,
            description: undefined,
          });
        }
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

// Combined hook for a complete stock view - NO automatic fetching
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
