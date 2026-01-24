import { useQuery } from '@tanstack/react-query';
import { screenStocksFromPolygon } from '@/services/polygonScreenerService';

export interface TrendingTicker {
  symbol: string;
  name: string;
  marketCap: number | null;
  sector: string | null;
  changePercent1d: number | null;
  price?: number;
  changePercent?: number;
}

/**
 * Fetches trending tickers from live Polygon snapshot/screener data.
 * IMPORTANT: No mock/hardcoded fallback. If the request fails, the UI should show an empty state.
 */
export function useTrendingTickers(limit: number = 12) {
  const tickersQuery = useQuery({
    queryKey: ['trending-tickers', limit],
    queryFn: async (): Promise<TrendingTicker[]> => {
      // “Trending Now” = highest attention (volume), with real intraday % change.
      const res = await screenStocksFromPolygon({
        minPrice: 2,
        minVolume: 500000,
        sortBy: 'volume',
        sortDirection: 'desc',
        limit: Math.max(limit * 3, 50),
      });

      return (res.results || []).slice(0, limit).map((r) => ({
        symbol: r.symbol,
        name: r.name,
        sector: r.sector || null,
        marketCap: r.marketCap ?? null,
        changePercent1d: r.changePercent,
        price: r.price,
        changePercent: r.changePercent,
      }));
    },
    staleTime: 60 * 1000,
  });

  return {
    tickers: tickersQuery.data || [],
    isLoading: tickersQuery.isLoading,
    error: tickersQuery.error,
    refetch: tickersQuery.refetch,
  };
}
