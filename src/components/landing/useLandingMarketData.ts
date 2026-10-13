import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { parseDateOnly } from '@/lib/date';

export const LANDING_SYMBOLS = ['SPY', 'QQQ', 'AAPL', 'MSFT', 'NVDA', 'GLD'];
export const LANDING_RANGES = { '1M': 30, '3M': 90, '6M': 180, '1Y': 365 } as const;
export type LandingRange = keyof typeof LANDING_RANGES;

export function useLandingQuotes() {
  return useQuery({
    queryKey: ['landing-market-strip'],
    queryFn: async () => {
      const { data, error } = await supabase.from('asset_universe')
        .select('ticker,name,last_close,change_percent_1d,data_end_date')
        .in('ticker', LANDING_SYMBOLS);
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useLandingResearch(ticker: string, range: LandingRange) {
  const profile = useQuery({
    queryKey: ['landing-profile', ticker],
    queryFn: async () => {
      const { data, error } = await supabase.from('asset_universe')
        .select('name,ticker,description,short_description,sector,primary_exchange,asset_type,currency')
        .eq('ticker', ticker).maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 30 * 60 * 1000,
  });
  const history = useQuery({
    queryKey: ['landing-price-history', ticker, range],
    queryFn: async () => {
      const start = new Date();
      start.setDate(start.getDate() - LANDING_RANGES[range]);
      const { data, error } = await supabase.from('market_daily_bars')
        .select('bar_date,close,high,low,volume').eq('ticker', ticker)
        .gte('bar_date', start.toISOString().slice(0, 10))
        .order('bar_date', { ascending: true }).limit(400);
      if (!error && data && data.length > 1) return data.map(b => ({ date: parseDateOnly(b.bar_date).getTime(), close: b.close, high: b.high, low: b.low, volume: b.volume }));
      const response = await supabase.functions.invoke('polygon-daily-bars', { body: { ticker, days: LANDING_RANGES[range] } });
      if (response.error || !response.data?.ok) return [];
      const bars: { date: string; close: number; high: number; low: number; volume: number }[] = response.data.bars ?? [];
      return bars.map(b => ({ date: parseDateOnly(b.date).getTime(), close: b.close, high: b.high, low: b.low, volume: b.volume }));
    },
    staleTime: 5 * 60 * 1000,
  });
  return { profile, history };
}