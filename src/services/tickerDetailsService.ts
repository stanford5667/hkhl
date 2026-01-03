// Ticker Details Service - Fetch metadata from Polygon.io
import { supabase } from '@/integrations/supabase/client';

export interface TickerDetails {
  ticker: string;
  name: string;
  description: string;
  sector: string;
  industry: string;
  marketCap: number | null;
  type: string;
  primaryExchange: string;
  currencyName: string;
  logoUrl: string | null;
  homepageUrl: string | null;
}

// In-memory cache
const detailsCache = new Map<string, { data: TickerDetails; expiresAt: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export async function fetchTickerDetails(ticker: string): Promise<TickerDetails | null> {
  const upperTicker = ticker.toUpperCase();
  
  // Check cache
  const cached = detailsCache.get(upperTicker);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }
  
  try {
    const { data, error } = await supabase.functions.invoke('polygon-ticker-details', {
      body: { ticker: upperTicker }
    });
    
    if (error) {
      console.error('[TickerDetails] Function error:', error);
      return null;
    }
    
    if (!data?.ok || !data.details) {
      console.warn('[TickerDetails] No data for', upperTicker);
      return null;
    }
    
    const details = data.details as TickerDetails;
    
    // Cache the result
    detailsCache.set(upperTicker, {
      data: details,
      expiresAt: Date.now() + CACHE_TTL,
    });
    
    return details;
  } catch (error) {
    console.error('[TickerDetails] Error fetching:', error);
    return null;
  }
}

export async function fetchMultipleTickerDetails(
  tickers: string[]
): Promise<Map<string, TickerDetails>> {
  const results = new Map<string, TickerDetails>();
  
  // Process in batches to avoid overwhelming the API
  const batchSize = 5;
  for (let i = 0; i < tickers.length; i += batchSize) {
    const batch = tickers.slice(i, i + batchSize);
    
    await Promise.all(
      batch.map(async (ticker) => {
        const details = await fetchTickerDetails(ticker);
        if (details) {
          results.set(ticker.toUpperCase(), details);
        }
      })
    );
    
    // Small delay between batches
    if (i + batchSize < tickers.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  return results;
}

// Clear the cache
export function clearTickerDetailsCache(): void {
  detailsCache.clear();
}
