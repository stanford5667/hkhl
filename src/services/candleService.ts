/**
 * Finnhub Candle Data Service
 * Fetches OHLCV data for candlestick charts
 * Free tier: 60 calls/minute
 */

import { API_CONFIG } from '@/config/apiConfig';

const FINNHUB_API_KEY = import.meta.env.VITE_FINNHUB_API_KEY;
const BASE_URL = 'https://finnhub.io/api/v1';

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

  if (!FINNHUB_API_KEY) {
    console.warn('[Candles] No Finnhub API key, using mock data');
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
    const url = `${BASE_URL}/stock/candle?symbol=${upperSymbol}&resolution=${resolution}&from=${fromTime}&to=${toTime}&token=${FINNHUB_API_KEY}`;
    
    console.log(`[Candles] Fetching: ${upperSymbol} ${resolution}`);
    const response = await fetch(url);

    if (!response.ok) {
      console.error('[Candles] API error:', response.status);
      return generateMockCandles(symbol, resolution, fromTime, toTime);
    }

    const data = await response.json();

    // Finnhub returns { s: 'ok', c: [], h: [], l: [], o: [], t: [], v: [] }
    if (data.s !== 'ok' || !data.c || data.c.length === 0) {
      console.warn('[Candles] No data returned for', upperSymbol);
      return generateMockCandles(symbol, resolution, fromTime, toTime);
    }

    const candles: CandleData[] = data.t.map((timestamp: number, i: number) => ({
      time: timestamp,
      open: data.o[i],
      high: data.h[i],
      low: data.l[i],
      close: data.c[i],
      volume: data.v?.[i],
    }));

    // Cache the result
    candleCache.set(cacheKey, { data: candles, fetchedAt: Date.now() });

    return candles;
  } catch (error) {
    console.error('[Candles] Fetch error:', error);
    return generateMockCandles(symbol, resolution, fromTime, toTime);
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
  to?: number
): CandleData[] {
  const now = to || Math.floor(Date.now() / 1000);
  const startTime = from || getDefaultFromTime(resolution, now);
  
  // Get a base price based on symbol
  const basePrices: Record<string, number> = {
    AAPL: 185, MSFT: 405, GOOGL: 142, AMZN: 178, META: 485,
    NVDA: 875, TSLA: 245, SPY: 502, QQQ: 446, DIA: 386,
  };
  const basePrice = basePrices[symbol.toUpperCase()] || 100;
  
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
