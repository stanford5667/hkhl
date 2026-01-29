/**
 * Ticker Directory Service
 * Local-first search that queries the database before falling back to Polygon API
 * Supports ALL Polygon tickers (10,000+ US stocks, ETFs, REITs)
 */

import { supabase } from '@/integrations/supabase/client';
import { getCachedQuote } from './quoteCacheService';
import type { StockQuote } from './finnhubService';

export interface TickerInfo {
  symbol: string;
  name: string;
  exchange: string | null;
  sector: string | null;
  industry: string | null;
  market_cap_tier: string | null;
  is_etf: boolean;
}

export interface SearchResult {
  symbol: string;
  name: string;
  exchange?: string | null;
  sector?: string | null;
  type?: string;
  quote?: StockQuote;
  source: 'local' | 'polygon' | 'api';
}

/**
 * Search tickers using Polygon API (supports 10,000+ tickers)
 */
async function searchPolygonTickers(query: string): Promise<SearchResult[]> {
  try {
    const { data, error } = await supabase.functions.invoke('polygon-ticker-search', {
      body: { query, limit: 20, market: 'stocks' }
    });

    if (error || !data?.ok) {
      console.error('[TickerDirectory] Polygon search error:', error || data?.error);
      return [];
    }

    return (data.results || []).map((r: any) => ({
      symbol: r.ticker,
      name: r.name,
      exchange: r.primaryExchange,
      type: r.type,
      source: 'polygon' as const,
    }));
  } catch (e) {
    console.error('[TickerDirectory] Polygon search exception:', e);
    return [];
  }
}
// Track in-flight requests to cancel stale ones
let currentSearchController: AbortController | null = null;

/**
 * Search tickers - local database first, then Polygon API fallback
 * This enables access to ALL Polygon-supported tickers (10,000+)
 */
export async function searchTickers(query: string, signal?: AbortSignal): Promise<SearchResult[]> {
  if (!query || query.length < 1) return [];

  const upperQuery = query.toUpperCase().trim();

  // First, search local database (instant, free)
  // Improved query: prioritize exact symbol match, then prefix, then name contains
  const { data: localResults, error } = await supabase
    .from('ticker_directory')
    .select('symbol, name, exchange, sector')
    .or(`symbol.eq.${upperQuery},symbol.ilike.${upperQuery}%,name.ilike.%${query}%`)
    .eq('is_active', true)
    .order('market_cap_tier', { ascending: true }) // mega first
    .limit(15);

  // Check if this search was cancelled
  if (signal?.aborted) {
    console.log('[TickerDirectory] Search cancelled for:', query);
    return [];
  }

  if (error) {
    console.error('[TickerDirectory] Local search error:', error);
  }

  // Sort local results: exact match first, then prefix match, then others
  const localMapped: SearchResult[] = (localResults || [])
    .sort((a, b) => {
      const aExact = a.symbol === upperQuery ? 0 : 1;
      const bExact = b.symbol === upperQuery ? 0 : 1;
      if (aExact !== bExact) return aExact - bExact;
      
      const aPrefix = a.symbol.startsWith(upperQuery) ? 0 : 1;
      const bPrefix = b.symbol.startsWith(upperQuery) ? 0 : 1;
      return aPrefix - bPrefix;
    })
    .map(r => ({
      symbol: r.symbol,
      name: r.name,
      exchange: r.exchange,
      sector: r.sector,
      source: 'local' as const,
    }));

  // If we found enough locally (5+) or have exact match, skip API
  const hasExactMatch = localMapped.some(r => r.symbol === upperQuery);
  if (localMapped.length >= 5 || (hasExactMatch && localMapped.length >= 1)) {
    console.log(`[TickerDirectory] Using ${localMapped.length} local results for: ${query}`);
    return localMapped;
  }

  // Check cancellation before API call
  if (signal?.aborted) return [];

  // Fallback to Polygon API for comprehensive ticker search
  console.log(`[TickerDirectory] Only ${localMapped.length} local results, searching Polygon for: ${query}`);
  
  const polygonResults = await searchPolygonTickers(query);
  
  // Check cancellation after API call
  if (signal?.aborted) return [];
  
  // Merge and deduplicate - prioritize local results
  const merged: SearchResult[] = [...localMapped];
  for (const pr of polygonResults) {
    if (!merged.some(m => m.symbol === pr.symbol)) {
      merged.push(pr);
    }
  }

  // Final sort: exact matches first
  return merged
    .sort((a, b) => {
      const aExact = a.symbol === upperQuery ? 0 : 1;
      const bExact = b.symbol === upperQuery ? 0 : 1;
      if (aExact !== bExact) return aExact - bExact;
      
      const aPrefix = a.symbol.startsWith(upperQuery) ? 0 : 1;
      const bPrefix = b.symbol.startsWith(upperQuery) ? 0 : 1;
      return aPrefix - bPrefix;
    })
    .slice(0, 15);
}

/**
 * Cancellable search - cancels previous in-flight request
 */
export async function searchTickersCancellable(query: string): Promise<SearchResult[]> {
  // Cancel previous search
  if (currentSearchController) {
    currentSearchController.abort();
  }
  
  // Create new controller for this search
  currentSearchController = new AbortController();
  const signal = currentSearchController.signal;
  
  try {
    return await searchTickers(query, signal);
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      return [];
    }
    throw e;
  }
}

/**
 * Get ticker info from local database
 */
export async function getTickerInfo(symbol: string): Promise<TickerInfo | null> {
  const { data, error } = await supabase
    .from('ticker_directory')
    .select('*')
    .eq('symbol', symbol.toUpperCase())
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    console.error('[TickerDirectory] Lookup error:', error);
    return null;
  }

  return data;
}

/**
 * Check if a ticker exists in local directory
 */
export async function tickerExists(symbol: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('ticker_directory')
    .select('*', { count: 'exact', head: true })
    .eq('symbol', symbol.toUpperCase())
    .eq('is_active', true);

  if (error) return false;
  return (count || 0) > 0;
}

/**
 * Search with enriched quotes (for autocomplete)
 */
export async function searchTickersWithQuotes(query: string): Promise<SearchResult[]> {
  const results = await searchTickers(query);

  // Enrich first 5 results with cached quotes (don't fetch new ones)
  const enriched = await Promise.all(
    results.slice(0, 5).map(async (r) => {
      try {
        const quote = await getCachedQuote(r.symbol);
        return { ...r, quote: quote || undefined };
      } catch {
        return r;
      }
    })
  );

  return [...enriched, ...results.slice(5)];
}

/**
 * Get popular tickers by sector
 */
export async function getTickersBySector(sector: string, limit = 20): Promise<TickerInfo[]> {
  const { data, error } = await supabase
    .from('ticker_directory')
    .select('*')
    .eq('sector', sector)
    .eq('is_active', true)
    .order('market_cap_tier', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('[TickerDirectory] Sector lookup error:', error);
    return [];
  }

  return data || [];
}

/**
 * Get all ETFs
 */
export async function getETFs(limit = 50): Promise<TickerInfo[]> {
  const { data, error } = await supabase
    .from('ticker_directory')
    .select('*')
    .eq('is_etf', true)
    .eq('is_active', true)
    .order('market_cap_tier', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('[TickerDirectory] ETF lookup error:', error);
    return [];
  }

  return data || [];
}

/**
 * Get mega-cap stocks
 */
export async function getMegaCaps(limit = 50): Promise<TickerInfo[]> {
  const { data, error } = await supabase
    .from('ticker_directory')
    .select('*')
    .eq('market_cap_tier', 'mega')
    .eq('is_etf', false)
    .eq('is_active', true)
    .limit(limit);

  if (error) {
    console.error('[TickerDirectory] Mega-cap lookup error:', error);
    return [];
  }

  return data || [];
}
