// Alpha Vantage Service - FREE historical data
// Free tier: 25 calls/day, 5 calls/minute

const ALPHA_VANTAGE_API_KEY = import.meta.env.VITE_ALPHA_VANTAGE_API_KEY || 'demo';
const BASE_URL = 'https://www.alphavantage.co/query';

export interface DailyPrice {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// In-memory cache to reduce API calls
const priceCache = new Map<string, { data: DailyPrice[]; timestamp: number }>();
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

export function isAlphaVantageConfigured(): boolean {
  const key = import.meta.env.VITE_ALPHA_VANTAGE_API_KEY;
  return !!key && key !== 'demo';
}

export async function getHistoricalDaily(symbol: string): Promise<DailyPrice[]> {
  // Check cache first
  const cached = priceCache.get(symbol);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log('[AlphaVantage] Using cached data for', symbol);
    return cached.data;
  }

  const url = `${BASE_URL}?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=full&apikey=${ALPHA_VANTAGE_API_KEY}`;
  
  console.log('[AlphaVantage] Fetching daily data for', symbol);
  
  const response = await fetch(url);
  const data = await response.json();
  
  // Check for errors
  if (data['Error Message']) {
    throw new Error(`Invalid symbol: ${symbol}`);
  }
  
  if (data['Note']) {
    throw new Error('Alpha Vantage rate limit hit. Free tier: 25 calls/day. Wait and try again.');
  }

  if (data['Information']) {
    throw new Error('Alpha Vantage API limit reached. Please wait a moment and try again.');
  }
  
  const timeSeries = data['Time Series (Daily)'];
  if (!timeSeries) {
    console.error('[AlphaVantage] Response:', data);
    throw new Error(`No data returned for ${symbol}. Check if the symbol is valid.`);
  }
  
  // Convert to array sorted by date ascending
  const prices: DailyPrice[] = Object.entries(timeSeries)
    .map(([date, values]: [string, any]) => ({
      date,
      open: parseFloat(values['1. open']),
      high: parseFloat(values['2. high']),
      low: parseFloat(values['3. low']),
      close: parseFloat(values['4. close']),
      volume: parseInt(values['5. volume']),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
  
  console.log('[AlphaVantage] Got', prices.length, 'days for', symbol);
  
  // Cache the result
  priceCache.set(symbol, { data: prices, timestamp: Date.now() });
  
  return prices;
}

// Filter prices to date range
export function filterPricesByDateRange(
  prices: DailyPrice[], 
  startDate: string, 
  endDate: string
): DailyPrice[] {
  return prices.filter(p => p.date >= startDate && p.date <= endDate);
}

// Clear cache (useful for testing)
export function clearAlphaVantageCache(): void {
  priceCache.clear();
  console.log('[AlphaVantage] Cache cleared');
}
