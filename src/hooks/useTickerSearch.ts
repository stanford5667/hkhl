import { useState, useCallback, useRef, useEffect } from 'react';
import { searchTickersWithQuotes, type SearchResult } from '@/services/tickerDirectoryService';
import { getCachedQuote } from '@/services/quoteCacheService';
import type { StockQuote } from '@/services/finnhubService';

export function useTickerSearch(debounceMs = 300) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<StockQuote | null>(null);
  
  const debounceRef = useRef<NodeJS.Timeout>();
  const lastQueryRef = useRef<string>('');
  
  // Request coalescing - if same query is in flight, don't duplicate
  const inFlightRef = useRef<Map<string, Promise<SearchResult[]>>>(new Map());
  
  const search = useCallback(async (q: string) => {
    if (q.length < 1) {
      setResults([]);
      return;
    }
    
    const upperQ = q.toUpperCase();
    
    // Check if request already in flight
    if (inFlightRef.current.has(upperQ)) {
      const existing = await inFlightRef.current.get(upperQ);
      setResults(existing || []);
      return;
    }
    
    // Use local-first search (queries database first, then API fallback)
    const promise = searchTickersWithQuotes(q);
    
    inFlightRef.current.set(upperQ, promise);
    
    try {
      const searchResults = await promise;
      setResults(searchResults);
    } finally {
      inFlightRef.current.delete(upperQ);
    }
  }, []);
  
  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    if (!query) {
      setResults([]);
      setIsSearching(false);
      return;
    }
    
    // If query is same as last, skip
    if (query === lastQueryRef.current) return;
    
    setIsSearching(true);
    
    debounceRef.current = setTimeout(async () => {
      lastQueryRef.current = query;
      await search(query);
      setIsSearching(false);
    }, debounceMs);
    
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, debounceMs, search]);
  
  const selectTicker = useCallback(async (symbol: string) => {
    const quote = await getCachedQuote(symbol);
    setSelectedQuote(quote);
    return quote;
  }, []);
  
  const clear = useCallback(() => {
    setQuery('');
    setResults([]);
    setSelectedQuote(null);
    lastQueryRef.current = '';
  }, []);
  
  return {
    query,
    setQuery,
    results,
    isSearching,
    selectedQuote,
    selectTicker,
    clear,
  };
}
