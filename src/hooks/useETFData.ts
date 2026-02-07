/**
 * Hook to fetch ETF-specific data from Polygon
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ETFData {
  expenseRatio?: number;
  aum?: number;
  holdings?: number;
  category?: string;
  inceptionDate?: string;
  issuer?: string;
  avgVolume?: number;
  beta?: number;
  dividendYield?: number;
  ytdReturn?: number;
  oneYearReturn?: number;
  threeYearReturn?: number;
  fiveYearReturn?: number;
  topHoldings?: Array<{
    symbol: string;
    name: string;
    weight: number;
  }>;
  sectorBreakdown?: Array<{
    sector: string;
    weight: number;
  }>;
}

interface ETFDataResponse {
  ok: boolean;
  ticker: string;
  etfData?: ETFData;
  error?: string;
  notFound?: boolean;
}

async function fetchETFData(ticker: string): Promise<ETFData | null> {
  const { data, error } = await supabase.functions.invoke('polygon-etf-details', {
    body: { ticker: ticker.toUpperCase() }
  });

  if (error) {
    console.error('[useETFData] Function error:', error);
    return null;
  }

  const response = data as ETFDataResponse;
  
  if (!response?.ok || !response.etfData) {
    console.warn('[useETFData] No ETF data for', ticker);
    return null;
  }

  return response.etfData;
}

export function useETFData(ticker: string, enabled = true) {
  return useQuery({
    queryKey: ['etf-data', ticker.toUpperCase()],
    queryFn: () => fetchETFData(ticker),
    enabled: enabled && !!ticker,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}
