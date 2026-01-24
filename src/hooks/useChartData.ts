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
 * Fetches chart data with intraday support for 1D view.
 * - 1D: Uses Finnhub intraday bars (5-minute candles)
 * - Other ranges: Uses market_daily_bars from database
 */
export function useChartData(symbol: string, timeRange: TimeRange) {
  return useQuery({
    queryKey: ['chart-data', symbol, timeRange],
    queryFn: async (): Promise<ChartPoint[]> => {
      if (!symbol) return [];

      // For 1D view, use intraday candles from Finnhub
      if (timeRange === '1D') {
        try {
          const candles = await getCandlesForRange(symbol, '1D' as CandleTimeRange);
          
          if (candles && candles.length > 0) {
            return candles.map(candle => ({
              time: candle.time,
              price: candle.close,
              volume: candle.volume,
              open: candle.open,
              high: candle.high,
              low: candle.low,
            }));
          }
        } catch (err) {
          console.warn('[useChartData] Intraday fetch failed, falling back to daily:', err);
        }
      }

      // For other ranges, use daily bars from database
      const days = getTimeRangeDays(timeRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('market_daily_bars')
        .select('bar_date, open, high, low, close, volume')
        .eq('ticker', symbol.toUpperCase())
        .gte('bar_date', startDateStr)
        .order('bar_date', { ascending: true })
        .limit(500);

      if (error) {
        console.error('[useChartData] Error:', error);
        // Fallback to candleService for any range if DB fails
        try {
          const rangeMap: Record<TimeRange, CandleTimeRange> = {
            '1D': '1D', '1W': '1W', '1M': '1M', '3M': '3M', '6M': '6M', '1Y': '1Y'
          };
          const candles = await getCandlesForRange(symbol, rangeMap[timeRange]);
          return candles.map(c => ({
            time: c.time,
            price: c.close,
            volume: c.volume,
            open: c.open,
            high: c.high,
            low: c.low,
          }));
        } catch {
          return [];
        }
      }

      if (!data || data.length === 0) {
        // Try candleService as fallback
        try {
          const rangeMap: Record<TimeRange, CandleTimeRange> = {
            '1D': '1D', '1W': '1W', '1M': '1M', '3M': '3M', '6M': '6M', '1Y': '1Y'
          };
          const candles = await getCandlesForRange(symbol, rangeMap[timeRange]);
          return candles.map(c => ({
            time: c.time,
            price: c.close,
            volume: c.volume,
            open: c.open,
            high: c.high,
            low: c.low,
          }));
        } catch {
          return [];
        }
      }

      return data.map(bar => ({
        time: new Date(bar.bar_date).getTime() / 1000,
        price: bar.close,
        volume: bar.volume,
        open: bar.open,
        high: bar.high,
        low: bar.low,
      }));
    },
    enabled: !!symbol,
    staleTime: timeRange === '1D' ? 60 * 1000 : 5 * 60 * 1000, // 1 min for intraday, 5 min for daily
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
