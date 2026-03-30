/**
 * Market Data Service (Polygon.io)
 * All market data now flows through Polygon edge functions.
 * This file preserves the original API surface for backward compatibility.
 */

import { API_CONFIG } from '@/config/apiConfig';
import { supabase } from '@/integrations/supabase/client';

export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  timestamp: number;
  volume?: string;
  marketCap?: string;
  companyName?: string;
  chartData?: { time: string; price: number }[];
}

export interface SymbolSearchResult {
  symbol: string;
  description: string;
}

export interface CandleData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: number;
}

function formatMarketCap(value: number): string {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  return `$${value.toLocaleString()}`;
}

export async function getQuote(symbol: string): Promise<StockQuote | null> {
  if (!API_CONFIG.ENABLE_MARKET_DATA) {
    console.log('[MarketData] Market data disabled via kill switch');
    return null;
  }

  const upper = symbol.toUpperCase();

  try {
    const { data, error } = await supabase.functions.invoke('polygon-stock-quotes', {
      body: { symbols: [upper] },
    });

    if (error || !data?.success || !data.quotes?.length) {
      console.warn('[MarketData] Quote fetch failed:', error || 'No data');
      return null;
    }

    const q = data.quotes[0];
    return {
      symbol: upper,
      price: q.price,
      change: q.change,
      changePercent: q.changePercent,
      high: q.high,
      low: q.low,
      open: q.open,
      previousClose: q.previousClose,
      timestamp: new Date(q.timestamp).getTime(),
      companyName: q.name || upper,
    };
  } catch (err) {
    console.error('[MarketData] Quote error:', err);
    return null;
  }
}

export async function getCompanyProfile(symbol: string): Promise<{
  name: string;
  ticker: string;
  marketCap: number;
  exchange: string;
  industry: string;
} | null> {
  if (!API_CONFIG.ENABLE_MARKET_DATA) return null;

  const upper = symbol.toUpperCase();

  try {
    const { data, error } = await supabase.functions.invoke('polygon-ticker-details', {
      body: { ticker: upper },
    });

    if (error || !data?.ok || !data.details) return null;

    const d = data.details;
    return {
      name: d.name,
      ticker: d.ticker,
      marketCap: d.marketCap || 0,
      exchange: d.primaryExchange || '',
      industry: d.industry || d.sector || '',
    };
  } catch (err) {
    console.error('[MarketData] Profile error:', err);
    return null;
  }
}

export async function getFullQuote(symbol: string): Promise<StockQuote | null> {
  const [quote, profile] = await Promise.all([getQuote(symbol), getCompanyProfile(symbol)]);
  if (!quote) return null;

  return {
    ...quote,
    companyName: profile?.name || symbol.toUpperCase(),
    marketCap: profile?.marketCap ? formatMarketCap(profile.marketCap) : undefined,
  };
}

export async function getBatchQuotes(symbols: string[]): Promise<Map<string, StockQuote>> {
  const results = new Map<string, StockQuote>();
  const upperSymbols = symbols.map(s => s.toUpperCase());

  if (!API_CONFIG.ENABLE_MARKET_DATA || upperSymbols.length === 0) return results;

  try {
    // Polygon edge function handles up to 10 at a time; chunk if needed
    const chunks: string[][] = [];
    for (let i = 0; i < upperSymbols.length; i += 10) {
      chunks.push(upperSymbols.slice(i, i + 10));
    }

    for (const chunk of chunks) {
      const { data, error } = await supabase.functions.invoke('polygon-stock-quotes', {
        body: { symbols: chunk },
      });

      if (error || !data?.success) continue;

      for (const q of data.quotes || []) {
        results.set(q.symbol.toUpperCase(), {
          symbol: q.symbol,
          price: q.price,
          change: q.change,
          changePercent: q.changePercent,
          high: q.high,
          low: q.low,
          open: q.open,
          previousClose: q.previousClose,
          timestamp: new Date(q.timestamp).getTime(),
          companyName: q.name || q.symbol,
        });
      }
    }
  } catch (err) {
    console.error('[MarketData] Batch quotes error:', err);
  }

  return results;
}

export async function searchSymbol(query: string): Promise<SymbolSearchResult[]> {
  if (!API_CONFIG.ENABLE_MARKET_DATA || !query) return [];

  try {
    const { data, error } = await supabase.functions.invoke('polygon-ticker-search', {
      body: { query, limit: 10 },
    });

    if (error || !data?.ok) return [];

    return (data.results || []).map((r: any) => ({
      symbol: r.ticker,
      description: r.name,
    }));
  } catch (err) {
    console.error('[MarketData] Search error:', err);
    return [];
  }
}

export async function getCandles(
  symbol: string,
  resolution: string,
  from: number,
  to: number
): Promise<CandleData[]> {
  if (!API_CONFIG.ENABLE_MARKET_DATA) {
    throw new Error('Market data is disabled');
  }

  const upper = symbol.toUpperCase();
  const startDate = new Date(from * 1000).toISOString().split('T')[0];
  const endDate = new Date(to * 1000).toISOString().split('T')[0];

  // Map resolution to Polygon timespan
  const r = resolution.toUpperCase();
  let timespan = 'day';
  if (r === 'W') timespan = 'week';
  else if (r === 'M') timespan = 'month';
  else if (['1', '5', '15', '30', '60'].includes(r)) timespan = 'minute';

  console.log(`[MarketData] Fetching candles for ${upper} from ${startDate} to ${endDate}`);

  try {
    const { data, error } = await supabase.functions.invoke('polygon-aggs', {
      body: { ticker: upper, startDate, endDate, timespan },
    });

    if (error) {
      throw new Error(`Failed to fetch candles: ${error.message}`);
    }

    if (!data?.ok || !data.results || data.results.length === 0) {
      throw new Error(`No historical data available for ${symbol}`);
    }

    const candles: CandleData[] = data.results.map((r: any) => {
      const date = new Date(r.t);
      return {
        date: date.toISOString().split('T')[0],
        open: r.o,
        high: r.h,
        low: r.l,
        close: r.c,
        volume: r.v,
        timestamp: Math.floor(r.t / 1000),
      };
    });

    console.log(`[MarketData] Retrieved ${candles.length} candles for ${upper}`);
    return candles;
  } catch (err) {
    console.error('[MarketData] Candles error:', err);
    throw err;
  }
}

export function isFinnhubConfigured(): boolean {
  return true;
}
