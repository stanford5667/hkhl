/**
 * Hybrid Market Data Service
 * 
 * Data flow:
 * 1. React Query cache (instant, ~5 min TTL)
 * 2. Supabase flat files (fast, primary source)
 * 3. Polygon API (fallback, triggers background sync)
 * 
 * Features:
 * - Automatic refresh on portfolio changes
 * - Real-time Supabase subscriptions for multi-tab sync
 * - Background sync for missing data
 * - Progress tracking for UI feedback
 */

import { supabase } from '@/integrations/supabase/client';
import { QueryClient } from '@tanstack/react-query';
import { POLYGON_CONFIG } from '@/config/apiConfig';

// Types
export interface BarData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vwap?: number;
  dailyReturn?: number;
}

export interface TickerData {
  ticker: string;
  bars: BarData[];
  source: 'cache' | 'supabase' | 'api';
  dataRange: { start: string; end: string };
  lastUpdated: string;
}

export interface FetchProgress {
  status: 'idle' | 'fetching' | 'complete' | 'error';
  current: number;
  total: number;
  currentTicker?: string;
  message?: string;
}

export type ProgressCallback = (progress: FetchProgress) => void;

// Cache configuration
const MEMORY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const memoryCache = new Map<string, { data: TickerData; expiry: number }>();

// Service class
class HybridMarketDataService {
  private queryClient: QueryClient | null = null;
  private subscriptions: Map<string, any> = new Map();
  
  setQueryClient(client: QueryClient) {
    this.queryClient = client;
  }
  
  /**
   * Main entry point: Get data for multiple tickers
   */
  async getTickersData(
    tickers: string[],
    options: {
      startDate?: string;
      endDate?: string;
      forceRefresh?: boolean;
      onProgress?: ProgressCallback;
    } = {}
  ): Promise<Map<string, TickerData>> {
    const {
      startDate = this.getDefaultStartDate(),
      endDate = this.getToday(),
      forceRefresh = false,
      onProgress
    } = options;
    
    const results = new Map<string, TickerData>();
    const tickersToFetch: string[] = [];
    
    onProgress?.({ status: 'fetching', current: 0, total: tickers.length, message: 'Checking cache...' });
    
    // Step 1: Check memory cache
    for (const ticker of tickers) {
      if (!forceRefresh) {
        const cached = this.getFromMemoryCache(ticker, startDate, endDate);
        if (cached) {
          results.set(ticker, cached);
          continue;
        }
      }
      tickersToFetch.push(ticker);
    }
    
    if (tickersToFetch.length === 0) {
      onProgress?.({ status: 'complete', current: tickers.length, total: tickers.length, message: 'All from cache' });
      return results;
    }
    
    // Step 2: Batch fetch from Supabase
    onProgress?.({ status: 'fetching', current: results.size, total: tickers.length, message: 'Loading from database...' });
    
    const supabaseData = await this.fetchFromSupabase(tickersToFetch, startDate, endDate);
    
    const stillMissing: string[] = [];
    
    for (const ticker of tickersToFetch) {
      const data = supabaseData.get(ticker);
      if (data && data.bars.length >= 20) {
        results.set(ticker, data);
        this.saveToMemoryCache(ticker, data, startDate, endDate);
      } else {
        stillMissing.push(ticker);
      }
    }
    
    // Step 3: Fetch missing from API (if any)
    if (stillMissing.length > 0) {
      onProgress?.({ 
        status: 'fetching', 
        current: results.size, 
        total: tickers.length, 
        message: `Fetching ${stillMissing.length} tickers from API...` 
      });
      
      for (let i = 0; i < stillMissing.length; i++) {
        const ticker = stillMissing[i];
        onProgress?.({ 
          status: 'fetching', 
          current: results.size + i, 
          total: tickers.length, 
          currentTicker: ticker 
        });
        
        try {
          const apiData = await this.fetchFromAPI(ticker, startDate, endDate);
          if (apiData) {
            results.set(ticker, apiData);
            this.saveToMemoryCache(ticker, apiData, startDate, endDate);
            
            // Trigger background sync to store in Supabase
            this.triggerBackgroundSync(ticker, startDate, endDate);
          }
        } catch (error) {
          console.error(`[HybridData] Failed to fetch ${ticker}:`, error);
        }
        
        // Rate limit
        if (i < stillMissing.length - 1) {
          await this.sleep(200);
        }
      }
    }
    
    onProgress?.({ status: 'complete', current: tickers.length, total: tickers.length });
    
    return results;
  }
  
  /**
   * Get portfolio returns (weighted combination)
   */
  async getPortfolioReturns(
    tickers: string[],
    weights: number[],
    options: {
      startDate?: string;
      endDate?: string;
      onProgress?: ProgressCallback;
    } = {}
  ): Promise<{ dates: string[]; returns: number[]; values: number[] }> {
    const {
      startDate = this.getDefaultStartDate(),
      endDate = this.getToday(),
      onProgress
    } = options;
    
    // Normalize weights if they're percentages
    const weightSum = weights.reduce((s, w) => s + w, 0);
    const normalizedWeights = weightSum > 1.5 ? weights.map(w => w / weightSum) : weights;
    
    // Try Supabase function first (most efficient)
    try {
      const { data, error } = await supabase.rpc('get_portfolio_returns', {
        p_tickers: tickers,
        p_weights: normalizedWeights,
        p_start_date: startDate,
        p_end_date: endDate
      });
      
      if (!error && data && data.length > 0) {
        const dates = data.map((d: { bar_date: string }) => d.bar_date);
        const returns = data.map((d: { portfolio_return: number }) => d.portfolio_return);
        
        // Build value series
        let value = 100000;
        const values = [value];
        for (const r of returns) {
          value *= (1 + r);
          values.push(value);
        }
        
        onProgress?.({ status: 'complete', current: 1, total: 1 });
        return { dates, returns, values };
      }
    } catch (e) {
      console.log('[HybridData] Supabase RPC failed, falling back to manual calculation');
    }
    
    // Fallback: Manual calculation
    const tickerData = await this.getTickersData(tickers, { startDate, endDate, onProgress });
    
    // Align by date and calculate weighted returns
    const allDates = new Set<string>();
    const returnsByTicker = new Map<string, Map<string, number>>();
    
    for (const [ticker, data] of tickerData) {
      const tickerReturns = new Map<string, number>();
      for (const bar of data.bars) {
        if (bar.dailyReturn !== undefined) {
          allDates.add(bar.date);
          tickerReturns.set(bar.date, bar.dailyReturn);
        }
      }
      returnsByTicker.set(ticker, tickerReturns);
    }
    
    const sortedDates = Array.from(allDates).sort();
    const portfolioReturns: number[] = [];
    const validDates: string[] = [];
    
    for (const date of sortedDates) {
      let dayReturn = 0;
      let hasAllTickers = true;
      
      for (let i = 0; i < tickers.length; i++) {
        const tickerReturns = returnsByTicker.get(tickers[i]);
        const r = tickerReturns?.get(date);
        
        if (r === undefined) {
          hasAllTickers = false;
          break;
        }
        
        dayReturn += r * weights[i];
      }
      
      if (hasAllTickers) {
        portfolioReturns.push(dayReturn);
        validDates.push(date);
      }
    }
    
    // Build value series
    let value = 100000;
    const values = [value];
    for (const r of portfolioReturns) {
      value *= (1 + r);
      values.push(value);
    }
    
    return {
      dates: validDates,
      returns: portfolioReturns,
      values
    };
  }
  
  /**
   * Get correlation matrix for tickers
   */
  async getCorrelationMatrix(
    tickers: string[],
    periodDays: number = 252
  ): Promise<number[][]> {
    // Try to get pre-calculated correlations
    const { data: correlations } = await supabase
      .from('ticker_correlations')
      .select('ticker_a, ticker_b, correlation')
      .in('ticker_a', tickers)
      .in('ticker_b', tickers)
      .eq('period_days', periodDays);
    
    // Build matrix
    const n = tickers.length;
    const matrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
    
    // Diagonal is 1
    for (let i = 0; i < n; i++) {
      matrix[i][i] = 1;
    }
    
    // Fill from database
    if (correlations) {
      for (const c of correlations) {
        const i = tickers.indexOf(c.ticker_a);
        const j = tickers.indexOf(c.ticker_b);
        if (i >= 0 && j >= 0) {
          matrix[i][j] = c.correlation;
          matrix[j][i] = c.correlation;
        }
      }
    }
    
    // Calculate any missing pairs
    const tickerData = await this.getTickersData(tickers);
    
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (matrix[i][j] === 0) {
          const dataA = tickerData.get(tickers[i]);
          const dataB = tickerData.get(tickers[j]);
          
          if (dataA && dataB) {
            const corr = this.calculateCorrelation(
              dataA.bars.filter(b => b.dailyReturn !== undefined).map(b => b.dailyReturn!),
              dataB.bars.filter(b => b.dailyReturn !== undefined).map(b => b.dailyReturn!)
            );
            matrix[i][j] = corr;
            matrix[j][i] = corr;
          }
        }
      }
    }
    
    return matrix;
  }
  
  /**
   * Get single ticker data with latest price
   */
  async getTickerWithLatestPrice(ticker: string): Promise<TickerData | null> {
    const data = await this.getTickersData([ticker]);
    return data.get(ticker) || null;
  }
  
  /**
   * Subscribe to real-time data updates
   */
  subscribeToUpdates(tickers: string[], callback: (ticker: string) => void): () => void {
    const channelName = `market-data-${tickers.sort().join('-').slice(0, 50)}`;
    
    // Unsubscribe from existing channel if any
    const existing = this.subscriptions.get(channelName);
    if (existing) {
      existing.unsubscribe();
    }
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'market_daily_bars'
        },
        (payload) => {
          const ticker = payload.new?.ticker as string;
          if (ticker && tickers.includes(ticker)) {
            // Invalidate cache
            this.invalidateCache(ticker);
            callback(ticker);
          }
        }
      )
      .subscribe();
    
    this.subscriptions.set(channelName, channel);
    
    return () => {
      channel.unsubscribe();
      this.subscriptions.delete(channelName);
    };
  }
  
  /**
   * Invalidate cache for a ticker (call when data changes)
   */
  invalidateCache(ticker: string) {
    // Clear memory cache entries containing this ticker
    for (const [key] of memoryCache) {
      if (key.startsWith(`${ticker}:`)) {
        memoryCache.delete(key);
      }
    }
    
    // Invalidate React Query cache
    if (this.queryClient) {
      this.queryClient.invalidateQueries({ queryKey: ['market-data', ticker] });
      this.queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    }
  }
  
  /**
   * Clear all caches
   */
  clearAllCaches() {
    memoryCache.clear();
    if (this.queryClient) {
      this.queryClient.invalidateQueries({ queryKey: ['market-data'] });
      this.queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    }
  }
  
  /**
   * Get cache statistics for debugging
   */
  getCacheStats(): { memorySize: number; entries: string[] } {
    return {
      memorySize: memoryCache.size,
      entries: Array.from(memoryCache.keys())
    };
  }
  
  // ============================================
  // PRIVATE METHODS
  // ============================================
  
  private getFromMemoryCache(ticker: string, start: string, end: string): TickerData | null {
    const key = `${ticker}:${start}:${end}`;
    const cached = memoryCache.get(key);
    
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }
    
    memoryCache.delete(key);
    return null;
  }
  
  private saveToMemoryCache(ticker: string, data: TickerData, start: string, end: string) {
    const key = `${ticker}:${start}:${end}`;
    memoryCache.set(key, {
      data,
      expiry: Date.now() + MEMORY_CACHE_TTL
    });
  }
  
  private async fetchFromSupabase(
    tickers: string[],
    startDate: string,
    endDate: string
  ): Promise<Map<string, TickerData>> {
    const results = new Map<string, TickerData>();
    
    // Supabase has 1000 row limit, so we may need to batch
    const BATCH_SIZE = 10;
    
    for (let i = 0; i < tickers.length; i += BATCH_SIZE) {
      const batch = tickers.slice(i, i + BATCH_SIZE);
      
      const { data, error } = await supabase
        .from('market_daily_bars')
        .select('ticker, bar_date, open, high, low, close, volume, vwap, daily_return')
        .in('ticker', batch)
        .gte('bar_date', startDate)
        .lte('bar_date', endDate)
        .order('bar_date', { ascending: true })
        .limit(50000);
      
      if (error || !data) {
        console.error('[HybridData] Supabase fetch error:', error);
        continue;
      }
      
      // Group by ticker
      const grouped = new Map<string, typeof data>();
      for (const bar of data) {
        if (!grouped.has(bar.ticker)) {
          grouped.set(bar.ticker, []);
        }
        grouped.get(bar.ticker)!.push(bar);
      }
      
      for (const [ticker, bars] of grouped) {
        results.set(ticker, {
          ticker,
          bars: bars.map(b => ({
            date: b.bar_date,
            open: b.open,
            high: b.high,
            low: b.low,
            close: b.close,
            volume: b.volume,
            vwap: b.vwap ?? undefined,
            dailyReturn: b.daily_return ?? undefined
          })),
          source: 'supabase',
          dataRange: { start: startDate, end: endDate },
          lastUpdated: new Date().toISOString()
        });
      }
    }
    
    return results;
  }
  
  private async fetchFromAPI(
    ticker: string,
    startDate: string,
    endDate: string
  ): Promise<TickerData | null> {
    try {
      const { data, error } = await supabase.functions.invoke('polygon-aggs', {
        body: { ticker, startDate, endDate, timespan: 'day' }
      });
      
      if (error || !data?.results) {
        console.warn(`[HybridData] API returned no data for ${ticker}`);
        return null;
      }
      
      const bars: BarData[] = [];
      let prevClose: number | null = null;
      
      for (const bar of data.results) {
        const dailyReturn = prevClose ? (bar.c - prevClose) / prevClose : undefined;
        
        bars.push({
          date: new Date(bar.t).toISOString().split('T')[0],
          open: bar.o,
          high: bar.h,
          low: bar.l,
          close: bar.c,
          volume: bar.v,
          vwap: bar.vw,
          dailyReturn
        });
        
        prevClose = bar.c;
      }
      
      return {
        ticker,
        bars,
        source: 'api',
        dataRange: { start: startDate, end: endDate },
        lastUpdated: new Date().toISOString()
      };
    } catch (e) {
      console.error(`[HybridData] API fetch failed for ${ticker}:`, e);
      return null;
    }
  }
  
  private triggerBackgroundSync(ticker: string, startDate: string, endDate: string) {
    // Fire and forget - sync data to Supabase in background
    supabase.functions.invoke('sync-market-data', {
      body: {
        mode: 'single_ticker',
        tickers: [ticker],
        startDate,
        endDate
      }
    }).catch(e => {
      console.warn(`[HybridData] Background sync failed for ${ticker}:`, e);
    });
  }
  
  private calculateCorrelation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    if (n < 2) return 0;
    
    const mx = x.slice(0, n).reduce((a, b) => a + b, 0) / n;
    const my = y.slice(0, n).reduce((a, b) => a + b, 0) / n;
    
    let num = 0, dx2 = 0, dy2 = 0;
    
    for (let i = 0; i < n; i++) {
      const dx = x[i] - mx;
      const dy = y[i] - my;
      num += dx * dy;
      dx2 += dx * dx;
      dy2 += dy * dy;
    }
    
    const den = Math.sqrt(dx2 * dy2);
    return den === 0 ? 0 : num / den;
  }
  
  private getDefaultStartDate(): string {
    // Use full history available on Polygon plan (5 years for Starter)
    return POLYGON_CONFIG.getEarliestDate();
  }
  
  private getToday(): string {
    return new Date().toISOString().split('T')[0];
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const marketDataService = new HybridMarketDataService();

// React Query integration hook
export function useMarketDataService() {
  return marketDataService;
}
