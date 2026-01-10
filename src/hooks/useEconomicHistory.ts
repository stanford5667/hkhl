import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface EconomicHistoryDataPoint {
  date: string;
  value: number;
}

export interface EconomicHistoryStats {
  min: number;
  max: number;
  avg: number;
  first: number;
  last: number;
  change: number;
  changePercent: number;
}

export interface EconomicHistoryResponse {
  success: boolean;
  seriesId: string;
  name: string;
  description: string;
  format: string;
  data: EconomicHistoryDataPoint[];
  stats: EconomicHistoryStats | null;
  useMockData: boolean;
  dateRange: { start: string; end: string };
  dataPoints: number;
  computationTimeMs: number;
}

export type HistoryPeriod = '1m' | '3m' | '6m' | '1y' | '2y' | '5y' | '10y' | 'max';

interface UseEconomicHistoryParams {
  seriesId: string;
  period?: HistoryPeriod;
  startDate?: string;
  endDate?: string;
  enabled?: boolean;
}

async function fetchEconomicHistory(params: {
  seriesId: string;
  period?: string;
  startDate?: string;
  endDate?: string;
}): Promise<EconomicHistoryResponse> {
  const { data, error } = await supabase.functions.invoke('fetch-economic-history', {
    body: params,
  });

  if (error) throw error;
  return data as EconomicHistoryResponse;
}

export function useEconomicHistory({
  seriesId,
  period = '1y',
  startDate,
  endDate,
  enabled = true,
}: UseEconomicHistoryParams) {
  return useQuery({
    queryKey: ['economic-history', seriesId, period, startDate, endDate],
    queryFn: () => fetchEconomicHistory({ seriesId, period, startDate, endDate }),
    enabled: enabled && !!seriesId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });
}

// Helper to format values based on format type
export function formatEconomicValue(value: number, format: string): string {
  switch (format) {
    case 'percent':
      return `${value.toFixed(2)}%`;
    case 'bps':
      return `${(value * 100).toFixed(0)} bps`;
    case 'thousands':
      return `${(value / 1000).toFixed(0)}K`;
    case 'millions':
      return `${value.toFixed(2)}M`;
    case 'price':
      return value >= 1000 
        ? `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}` 
        : `$${value.toFixed(2)}`;
    case 'index':
      return value.toFixed(1);
    default:
      return value.toFixed(2);
  }
}

export default useEconomicHistory;
