import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ChartPoint {
  time: number;
  price: number;
  volume?: number;
}

type TimeRange = '1D' | '1W' | '1M' | '3M' | '6M' | '1Y';

/**
 * Fetches chart data from market_daily_bars table.
 * This uses REAL data stored in the database, not external APIs.
 */
export function useChartData(symbol: string, timeRange: TimeRange) {
  return useQuery({
    queryKey: ['chart-data', symbol, timeRange],
    queryFn: async (): Promise<ChartPoint[]> => {
      if (!symbol) return [];

      const days = getTimeRangeDays(timeRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('market_daily_bars')
        .select('bar_date, close, volume')
        .eq('ticker', symbol.toUpperCase())
        .gte('bar_date', startDateStr)
        .order('bar_date', { ascending: true })
        .limit(500);

      if (error) {
        console.error('[useChartData] Error:', error);
        return [];
      }

      if (!data || data.length === 0) {
        return [];
      }

      return data.map(bar => ({
        time: new Date(bar.bar_date).getTime() / 1000,
        price: bar.close,
        volume: bar.volume,
      }));
    },
    enabled: !!symbol,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useSparklineData(symbol: string, timeRange: TimeRange) {
  const { data, isLoading, error } = useChartData(symbol, timeRange);
  
  return {
    data: data?.map(p => p.price) || [],
    isLoading,
    error,
  };
}

function getTimeRangeDays(range: TimeRange): number {
  switch (range) {
    case '1D': return 1;
    case '1W': return 7;
    case '1M': return 30;
    case '3M': return 90;
    case '6M': return 180;
    case '1Y': return 365;
    default: return 30;
  }
}
