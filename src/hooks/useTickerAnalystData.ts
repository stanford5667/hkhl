import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AnalystBreakdown {
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
}

export interface AnalystData {
  rating: 'Strong Buy' | 'Buy' | 'Hold' | 'Sell' | 'Strong Sell' | null;
  score: number | null;
  totalAnalysts: number;
  breakdown: AnalystBreakdown | null;
}

export interface PriceTargetData {
  targetHigh: number;
  targetLow: number;
  targetMean: number;
  targetMedian: number;
  lastUpdated: string;
}

export interface NextEarningsData {
  date: string;
  formatted: string;
  hour: string;
  quarter: number;
  year: number;
}

export interface BasicFinancialsData {
  dividendYieldIndicatedAnnual: number | null;
  beta: number | null;
  '52WeekHigh': number | null;
  '52WeekLow': number | null;
  peRatio: number | null;
  forwardPE: number | null;
  epsAnnual: number | null;
}

export interface TickerAnalystDataResult {
  success: boolean;
  ticker: string;
  analyst: AnalystData;
  priceTarget: PriceTargetData | null;
  nextEarnings: NextEarningsData | null;
  financials: BasicFinancialsData | null;
  fetchedAt: string;
}

export function useTickerAnalystData(ticker: string | undefined) {
  return useQuery<TickerAnalystDataResult | null>({
    queryKey: ['ticker-analyst-data', ticker],
    queryFn: async () => {
      if (!ticker) return null;
      
      const { data, error } = await supabase.functions.invoke('finnhub-ticker-fundamentals', {
        body: { ticker }
      });
      
      if (error) {
        console.error('Error fetching analyst data:', error);
        throw error;
      }
      
      if (!data?.success) {
        console.error('Analyst data fetch failed:', data?.error);
        return null;
      }
      
      return data as TickerAnalystDataResult;
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
    enabled: !!ticker,
  });
}
