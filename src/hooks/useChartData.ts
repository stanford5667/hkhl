import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getCandlesForRange, type TimeRange as CandleTimeRange } from '@/services/candleService';

export interface ChartPoint {
  time: number;
  price: number;
  volume?: number;
  open?: number;
  high?: number;
  low?: number;
}

export type TimeRange = '1D' | '1W' | '1M' | '3M' | '6M' | '1Y';

/**
 * Fetches chart data with database-first priority for fast loading.
 * Falls back to candleService (Finnhub) only when DB has no data.
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

      // PRIORITY 1: Always try database first (fast, reliable)
      try {
        const { data, error } = await supabase
          .from('market_daily_bars')
          .select('bar_date, open, high, low, close, volume')
          .eq('ticker', symbol.toUpperCase())
          .gte('bar_date', startDateStr)
          .order('bar_date', { ascending: true })
          .limit(500);

        if (!error && data && data.length > 0) {
          return data.map(bar => ({
            time: new Date(bar.bar_date).getTime() / 1000,
            price: bar.close,
            volume: bar.volume,
            open: bar.open,
            high: bar.high,
            low: bar.low,
          }));
        }
      } catch (dbErr) {
        console.warn('[useChartData] DB query failed:', dbErr);
      }

      // PRIORITY 2: Fallback to candleService (may hit Finnhub API)
      try {
        const rangeMap: Record<TimeRange, CandleTimeRange> = {
          '1D': '1D', '1W': '1W', '1M': '1M', '3M': '3M', '6M': '6M', '1Y': '1Y'
        };
        const candles = await getCandlesForRange(symbol, rangeMap[timeRange]);
        if (candles && candles.length > 0) {
          return candles.map(c => ({
            time: c.time,
            price: c.close,
            volume: c.volume,
            open: c.open,
            high: c.high,
            low: c.low,
          }));
        }
      } catch (apiErr) {
        console.warn('[useChartData] candleService fallback failed:', apiErr);
      }

      return [];
    },
    enabled: !!symbol,
    staleTime: 5 * 60 * 1000, // 5 min cache for all ranges
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 min
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
