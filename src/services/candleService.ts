/**
 * Finnhub Candle Data Service
 * Fetches OHLCV data for candlestick charts via edge function
 * Free tier: 60 calls/minute
 */

import { API_CONFIG } from '@/config/apiConfig';
import { supabase } from '@/integrations/supabase/client';
import { getQuote } from '@/services/finnhubService';

export interface CandleData {
  time: number; // Unix timestamp
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface CandleResponse {
  candles: CandleData[];
  symbol: string;
  resolution: string;
  fromDate: Date;
  toDate: Date;
}

export type Resolution = '1' | '5' | '15' | '30' | '60' | 'D' | 'W' | 'M';

// Cache for candle data
const candleCache = new Map<string, { data: CandleData[]; fetchedAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get candle data from Finnhub
 * @param symbol Stock symbol (e.g., 'AAPL')
 * @param resolution Candle resolution: 1, 5, 15, 30, 60 (minutes), D (daily), W (weekly), M (monthly)
 * @param from Start timestamp (Unix)
 * @param to End timestamp (Unix)
 */
export async function getCandles(
  symbol: string,
  resolution: Resolution = 'D',
  from?: number,
  to?: number
): Promise<CandleData[]> {
  if (!API_CONFIG.ENABLE_MARKET_DATA) {
    console.log('[Candles] Market data disabled');
    return generateMockCandles(symbol, resolution, from, to);
  }

  const upperSymbol = symbol.toUpperCase();

  // Default time range based on resolution
  const now = Math.floor(Date.now() / 1000);
  const defaultFrom = getDefaultFromTime(resolution, now);
  const fromTime = from || defaultFrom;
  const toTime = to || now;

  // Check cache
  const cacheKey = `${upperSymbol}-${resolution}-${fromTime}-${toTime}`;
  const cached = candleCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    console.log(`[Candles] Cache hit: ${cacheKey}`);
    return cached.data;
  }

  try {
    console.log(`[Candles] Fetching via finnhub-proxy: ${upperSymbol} ${resolution}`);

    const res = await supabase.functions.invoke('finnhub-proxy', {
      body: {
        action: 'candles',
        symbol: upperSymbol,
        resolution,
        from: fromTime,
        to: toTime,
      },
    });

    if (res.error) {
      throw new Error(res.error.message || 'Failed to fetch candle data');
    }

    const payload = (res.data as any) || {};
    if (!payload.ok) {
      throw new Error(payload.error || 'Failed to fetch candle data');
    }

    const finnhub = payload.candles;

    // Finnhub returns { s: 'ok', c: [], h: [], l: [], o: [], t: [], v: [] }
    if (finnhub?.s !== 'ok' || !finnhub?.c || finnhub.c.length === 0) {
      const status = finnhub?.s ?? 'unknown';
      throw new Error(`No candle data returned (status: ${status})`);
    }

    const candles: CandleData[] = finnhub.t.map((timestamp: number, i: number) => ({
      time: timestamp,
      open: finnhub.o[i],
      high: finnhub.h[i],
      low: finnhub.l[i],
      close: finnhub.c[i],
      volume: finnhub.v?.[i],
    }));

    candleCache.set(cacheKey, { data: candles, fetchedAt: Date.now() });
    return candles;
  } catch (err) {
    // If Finnhub candles are blocked/rate-limited, create a synthetic series anchored to the live quote.
    console.warn('[Candles] Falling back to quote-anchored candles:', err);

    try {
      const quote = await getQuote(upperSymbol);
      if (quote?.price) {
        const fallback = generateMockCandles(symbol, resolution, fromTime, toTime, quote.price);
        candleCache.set(cacheKey, { data: fallback, fetchedAt: Date.now() });
        return fallback;
      }
    } catch (e) {
      console.warn('[Candles] Quote fallback failed:', e);
    }

    // Last resort
    const fallback = generateMockCandles(symbol, resolution, fromTime, toTime);
    candleCache.set(cacheKey, { data: fallback, fetchedAt: Date.now() });
    return fallback;
  }
}

/**
 * Get default "from" time based on resolution
 */
function getDefaultFromTime(resolution: Resolution, now: number): number {
  const day = 24 * 60 * 60;
  
  switch (resolution) {
    case '1':
    case '5':
      return now - day; // 1 day for minute charts
    case '15':
    case '30':
      return now - 5 * day; // 5 days
    case '60':
      return now - 10 * day; // 10 days
    case 'D':
      return now - 365 * day; // 1 year for daily
    case 'W':
      return now - 2 * 365 * day; // 2 years for weekly
    case 'M':
      return now - 5 * 365 * day; // 5 years for monthly
    default:
      return now - 365 * day;
  }
}

/**
 * Generate mock candle data for development/fallback
 */
function generateMockCandles(
  symbol: string,
  resolution: Resolution,
  from?: number,
  to?: number,
  basePriceOverride?: number
): CandleData[] {
  const now = to || Math.floor(Date.now() / 1000);
  const startTime = from || getDefaultFromTime(resolution, now);
  
  // Get a base price based on symbol
  const basePrices: Record<string, number> = {
    AAPL: 185, MSFT: 405, GOOGL: 142, AMZN: 178, META: 485,
    NVDA: 875, TSLA: 245, SPY: 502, QQQ: 446, DIA: 386,
  };
  const basePrice = basePriceOverride ?? basePrices[symbol.toUpperCase()] ?? 100;
  
  // Calculate interval based on resolution
  const intervals: Record<Resolution, number> = {
    '1': 60, '5': 300, '15': 900, '30': 1800,
    '60': 3600, 'D': 86400, 'W': 604800, 'M': 2592000,
  };
  const interval = intervals[resolution];
  
  const candles: CandleData[] = [];
  let price = basePrice;
  
  for (let time = startTime; time <= now; time += interval) {
    // Random walk
    const change = (Math.random() - 0.48) * price * 0.02; // Slight upward bias
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) * (1 + Math.random() * 0.01);
    const low = Math.min(open, close) * (1 - Math.random() * 0.01);
    const volume = Math.floor(1000000 + Math.random() * 5000000);
    
    candles.push({ time, open, high, low, close, volume });
    price = close;
  }
  
  return candles;
}

/**
 * Presets for common time ranges
 */
export const TIME_RANGES = {
  '1D': { resolution: '5' as Resolution, label: '1 Day' },
  '1W': { resolution: '15' as Resolution, label: '1 Week' },
  '1M': { resolution: '60' as Resolution, label: '1 Month' },
  '3M': { resolution: 'D' as Resolution, label: '3 Months' },
  '6M': { resolution: 'D' as Resolution, label: '6 Months' },
  '1Y': { resolution: 'D' as Resolution, label: '1 Year' },
  '5Y': { resolution: 'W' as Resolution, label: '5 Years' },
} as const;

export type TimeRange = keyof typeof TIME_RANGES;

/**
 * Get candles for a preset time range
 */
export async function getCandlesForRange(
  symbol: string,
  range: TimeRange
): Promise<CandleData[]> {
  const { resolution } = TIME_RANGES[range];
  const now = Math.floor(Date.now() / 1000);
  const day = 24 * 60 * 60;
  
  const fromTimes: Record<TimeRange, number> = {
    '1D': now - day,
    '1W': now - 7 * day,
    '1M': now - 30 * day,
    '3M': now - 90 * day,
    '6M': now - 180 * day,
    '1Y': now - 365 * day,
    '5Y': now - 5 * 365 * day,
  };
  
  return getCandles(symbol, resolution, fromTimes[range], now);
}

/**
 * Clear candle cache
 */
export function clearCandleCache() {
  candleCache.clear();
  console.log('[Candles] Cache cleared');
}
