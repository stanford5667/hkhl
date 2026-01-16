/**
 * Portfolio Screener API Client
 * 
 * Calls the dynamic-screener edge function for server-side portfolio generation.
 * Falls back to client-side generation if the edge function is unavailable.
 */

import { supabase } from '@/integrations/supabase/client';
import {
  FilterCriteria,
  GeneratedPortfolioV2,
  GenerationProgress,
  screenPortfoliosV2 as clientScreenPortfolios,
} from './expandedPortfolioUniverse';

interface ScreenerApiResponse {
  portfolios: GeneratedPortfolioV2[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  generationTime: number;
  availableTickers: number;
  fromCache?: boolean;
  error?: string;
}

interface ScreenerApiOptions {
  page?: number;
  pageSize?: number;
  sortBy?: 'sharpe' | 'cagr' | 'maxDrawdown' | 'matchScore' | 'sortino' | 'volatility';
  sortDirection?: 'asc' | 'desc';
  limit?: number;
  useCache?: boolean;
  refreshCache?: boolean;
}

/**
 * Screen portfolios using the server-side edge function.
 * Falls back to client-side generation if the edge function fails.
 */
export async function screenPortfoliosServer(
  criteria: FilterCriteria,
  options: ScreenerApiOptions = {},
  onProgress?: (progress: GenerationProgress) => void
): Promise<ScreenerApiResponse> {
  const {
    page = 1,
    pageSize = 20,
    sortBy = 'sharpe',
    sortDirection = 'desc',
    // Keep server work bounded to avoid WORKER_LIMIT timeouts
    limit = 5000,
    useCache = true,
    refreshCache = false,
  } = options;

  onProgress?.({
    phase: 'fetching',
    current: 10,
    total: 100,
    message: 'Connecting to screening server...',
  });

  try {
    const { data, error } = await supabase.functions.invoke('dynamic-screener', {
      body: {
        criteria,
        page,
        pageSize,
        sortBy,
        sortDirection,
        limit,
        useCache,
        refreshCache,
      },
    });

    if (error) {
      console.warn('Edge function error, falling back to client:', error);
      throw error;
    }

    onProgress?.({
      phase: 'complete',
      current: 100,
      total: 100,
      message: data.fromCache 
        ? `Loaded ${data.totalCount.toLocaleString()} portfolios from cache`
        : `Generated ${data.totalCount.toLocaleString()} portfolios`,
    });

    return {
      portfolios: data.portfolios || [],
      totalCount: data.totalCount || 0,
      page: data.page || page,
      pageSize: data.pageSize || pageSize,
      totalPages: data.totalPages || 0,
      generationTime: data.generationTime || 0,
      availableTickers: data.availableTickers || 0,
      fromCache: data.fromCache || false,
    };

  } catch (err) {
    console.warn('Falling back to client-side screening:', err);
    
    onProgress?.({
      phase: 'calculating',
      current: 30,
      total: 100,
      message: 'Using local processing...',
    });

    // Fall back to client-side generation
    const clientResult = await clientScreenPortfolios(
      criteria,
      {
        page,
        pageSize,
        sortBy: sortBy as any,
        sortDirection,
        limit,
      },
      onProgress
    );

    return {
      portfolios: clientResult.portfolios,
      totalCount: clientResult.totalCount,
      page: clientResult.page,
      pageSize: clientResult.pageSize,
      totalPages: clientResult.totalPages,
      generationTime: clientResult.generationTime,
      availableTickers: clientResult.availableTickers,
      fromCache: false,
    };
  }
}

/**
 * Refresh the server-side portfolio cache.
 * Call this periodically or when market data updates.
 */
export async function refreshPortfolioCache(): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('dynamic-screener', {
      body: {
        criteria: {},
        page: 1,
        pageSize: 1,
        limit: 50000,
        useCache: true,
        refreshCache: true,
      },
    });

    if (error) throw error;

    return {
      success: true,
      count: data.totalCount,
    };
  } catch (err) {
    console.error('Failed to refresh cache:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Check if cached portfolios are available and fresh.
 */
export async function checkCacheStatus(): Promise<{ 
  available: boolean; 
  count: number; 
  expiresAt?: string;
}> {
  try {
    const { count, error } = await supabase
      .from('screened_portfolios_cache')
      .select('id', { count: 'exact', head: true })
      .gt('expires_at', new Date().toISOString());

    if (error) throw error;

    return {
      available: (count ?? 0) > 0,
      count: count ?? 0,
    };
  } catch (err) {
    console.error('Failed to check cache status:', err);
    return {
      available: false,
      count: 0,
    };
  }
}
