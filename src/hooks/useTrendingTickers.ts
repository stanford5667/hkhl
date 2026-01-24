import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBatchQuotes } from '@/hooks/useMarketDataQuery';

export interface TrendingTicker {
  symbol: string;
  name: string;
  marketCap: number | null;
  sector: string | null;
  changePercent1d: number | null;
}

/**
 * Fetches trending tickers from asset_universe table.
 * These are real, validated tickers with actual market data.
 */
export function useTrendingTickers(limit: number = 12) {
  const tickersQuery = useQuery({
    queryKey: ['trending-tickers', limit],
    queryFn: async (): Promise<TrendingTicker[]> => {
      // Get tickers with actual daily performance data, sorted by change
      const { data, error } = await supabase
        .from('asset_universe')
        .select('ticker, name, sector, market_cap_tier, avg_daily_volume, change_percent_1d, last_close')
        .eq('is_active', true)
        .not('last_close', 'is', null)
        .not('change_percent_1d', 'is', null)
        .gte('last_close', 2)  // Minimum $2 price to exclude penny stocks
        .gte('avg_daily_volume', 500000)  // Minimum 500K daily volume
        .order('change_percent_1d', { ascending: false, nullsFirst: false })
        .limit(limit * 2); // Fetch more to have variety

      if (error) {
        console.error('[useTrendingTickers] Error:', error);
        // Fallback to well-known tickers
        return getDefaultTickers();
      }

      if (!data || data.length === 0) {
        return getDefaultTickers();
      }

      // Already sorted by daily change from query, just slice
      return data.slice(0, limit).map(item => ({
        symbol: item.ticker,
        name: item.name,
        marketCap: getMarketCapFromTier(item.market_cap_tier),
        sector: item.sector,
        changePercent1d: item.change_percent_1d,
      }));
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get symbols for batch quotes
  const symbols = tickersQuery.data?.map(t => t.symbol) || [];
  const { quotes, isLoading: quotesLoading } = useBatchQuotes(symbols, { 
    enabled: symbols.length > 0 
  });

  // Merge ticker data with live quotes
  const tickersWithQuotes = tickersQuery.data?.map(ticker => ({
    ...ticker,
    price: quotes.get(ticker.symbol)?.price,
    changePercent: quotes.get(ticker.symbol)?.changePercent ?? ticker.changePercent1d,
  })) || [];

  return {
    tickers: tickersWithQuotes,
    isLoading: tickersQuery.isLoading || quotesLoading,
    error: tickersQuery.error,
    refetch: tickersQuery.refetch,
  };
}

function getMarketCapFromTier(tier: string | null): number | null {
  switch (tier) {
    case 'mega_cap': return 500e9;
    case 'large_cap': return 50e9;
    case 'mid_cap': return 10e9;
    case 'small_cap': return 2e9;
    default: return null;
  }
}

function getDefaultTickers(): TrendingTicker[] {
  return [
    { symbol: 'AAPL', name: 'Apple Inc.', marketCap: 3.4e12, sector: 'Technology', changePercent1d: null },
    { symbol: 'MSFT', name: 'Microsoft Corp.', marketCap: 3.1e12, sector: 'Technology', changePercent1d: null },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', marketCap: 2.0e12, sector: 'Technology', changePercent1d: null },
    { symbol: 'AMZN', name: 'Amazon.com', marketCap: 1.9e12, sector: 'Consumer Cyclical', changePercent1d: null },
    { symbol: 'NVDA', name: 'NVIDIA Corp.', marketCap: 3.0e12, sector: 'Technology', changePercent1d: null },
    { symbol: 'TSLA', name: 'Tesla Inc.', marketCap: 800e9, sector: 'Consumer Cyclical', changePercent1d: null },
    { symbol: 'META', name: 'Meta Platforms', marketCap: 1.4e12, sector: 'Technology', changePercent1d: null },
    { symbol: 'SPY', name: 'S&P 500 ETF', marketCap: 500e9, sector: 'ETF', changePercent1d: null },
    { symbol: 'QQQ', name: 'Nasdaq 100 ETF', marketCap: 250e9, sector: 'ETF', changePercent1d: null },
    { symbol: 'JPM', name: 'JPMorgan Chase', marketCap: 600e9, sector: 'Financial', changePercent1d: null },
    { symbol: 'V', name: 'Visa Inc.', marketCap: 550e9, sector: 'Financial', changePercent1d: null },
    { symbol: 'UNH', name: 'UnitedHealth', marketCap: 450e9, sector: 'Healthcare', changePercent1d: null },
  ];
}
