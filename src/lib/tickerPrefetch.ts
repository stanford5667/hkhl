/**
 * Ticker Data Prefetcher
 * Warms up edge functions and caches before the user navigates to /stock/:ticker
 */
import { supabase } from '@/integrations/supabase/client';

const prefetched = new Set<string>();

/**
 * Prefetch ticker details + quote data on hover.
 * Safe to call multiple times — deduplicates automatically.
 */
export function prefetchTickerData(ticker: string) {
  if (!ticker || prefetched.has(ticker)) return;
  prefetched.add(ticker);

  // Fire and forget — warm up edge function + populate browser cache
  supabase.functions.invoke('polygon-ticker-details', {
    body: { ticker },
  }).catch(() => {});

  // Also warm up the quote cache
  import('@/services/quoteCacheService').then(({ getCachedQuote }) => {
    getCachedQuote(ticker).catch(() => {});
  });
}

/**
 * Returns an onMouseEnter handler for elements linking to /stock/:ticker
 */
export function usePrefetchTicker(ticker: string | undefined) {
  if (!ticker) return undefined;
  return () => prefetchTickerData(ticker);
}
