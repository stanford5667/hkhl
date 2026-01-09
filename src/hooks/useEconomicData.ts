import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCallback } from 'react';

export interface EconomicIndicator {
  id: string;
  indicator_name: string;
  category: 'rates' | 'economic' | 'markets';
  current_value: string;
  current_raw: number | null;
  previous_value: string;
  previous_raw: number | null;
  change_value: number;
  change_formatted: string;
  last_updated: string;
  description: string;
  source: string;
  trend: 'up' | 'down' | 'flat';
}

export interface YieldCurvePoint {
  name: string;
  yield: number;
}

export interface YieldCurveData {
  curve: YieldCurvePoint[];
  inverted: boolean;
  spread_10y_2y: number;
}

export interface SectorData {
  name: string;
  symbol: string;
  ytd: number;
}

export interface EconomicCalendarEvent {
  type: string;
  name: string;
  date: string;
  importance: 'high' | 'medium' | 'low';
  daysUntil: number;
}

export interface EconomicDataResponse {
  success: boolean;
  useMockData: boolean;
  timestamp: string;
  computationTimeMs: number;
  indicators: EconomicIndicator[];
  yieldCurve: YieldCurveData;
  sectors: SectorData[];
  calendar: EconomicCalendarEvent[];
  byCategory: {
    rates: EconomicIndicator[];
    economic: EconomicIndicator[];
    markets: EconomicIndicator[];
  };
}

async function fetchEconomicData(): Promise<EconomicDataResponse> {
  const { data, error } = await supabase.functions.invoke('fetch-economic-data', {
    body: {},
  });
  
  if (error) throw error;
  return data as EconomicDataResponse;
}

// Main hook for all economic data
export function useEconomicData() {
  return useQuery({
    queryKey: ['economic-data-live'],
    queryFn: fetchEconomicData,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
    refetchOnWindowFocus: false,
  });
}

// Hook for just indicators
export function useLiveEconomicIndicators() {
  const { data, ...rest } = useEconomicData();
  
  return {
    data: data?.indicators || [],
    byCategory: data?.byCategory || { rates: [], economic: [], markets: [] },
    useMockData: data?.useMockData ?? true,
    lastUpdated: data?.timestamp,
    ...rest,
  };
}

// Hook for yield curve data
export function useYieldCurve() {
  const { data, ...rest } = useEconomicData();
  
  return {
    data: data?.yieldCurve,
    isInverted: data?.yieldCurve?.inverted ?? false,
    spread: data?.yieldCurve?.spread_10y_2y ?? 0,
    ...rest,
  };
}

// Hook for sector performance
export function useSectorPerformance() {
  const { data, ...rest } = useEconomicData();
  
  return {
    data: data?.sectors || [],
    ...rest,
  };
}

// Hook for economic calendar
export function useEconomicCalendar() {
  const { data, ...rest } = useEconomicData();
  
  return {
    data: data?.calendar || [],
    ...rest,
  };
}

// Hook with manual refresh capability
export function useEconomicDataWithRefresh() {
  const queryClient = useQueryClient();
  const query = useEconomicData();
  
  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['economic-data-live'] });
  }, [queryClient]);
  
  return {
    ...query,
    byCategory: query.data?.byCategory || { rates: [], economic: [], markets: [] },
    useMockData: query.data?.useMockData ?? true,
    lastUpdated: query.data?.timestamp,
    refresh,
    isStale: query.isStale,
    dataUpdatedAt: query.dataUpdatedAt,
  };
}

// Utility functions for display
export function formatIndicatorChange(indicator: EconomicIndicator): {
  text: string;
  color: string;
  icon: 'up' | 'down' | 'flat';
} {
  const change = indicator.change_value;
  
  if (Math.abs(change) < 0.01) {
    return { text: '—', color: 'text-muted-foreground', icon: 'flat' };
  }
  
  // For some indicators, down is good (unemployment, inflation, spreads)
  const invertedIndicators = ['cpi_yoy', 'core_pce', 'unemployment', 'ig_spread', 'hy_spread', 'vix', 'initial_claims'];
  const isInverted = invertedIndicators.includes(indicator.id);
  
  if (change > 0) {
    return {
      text: `+${change.toFixed(2)}%`,
      color: isInverted ? 'text-rose-400' : 'text-emerald-400',
      icon: 'up',
    };
  } else {
    return {
      text: `${change.toFixed(2)}%`,
      color: isInverted ? 'text-emerald-400' : 'text-rose-400',
      icon: 'down',
    };
  }
}

// Get key indicators for dashboard summary
export function getKeyIndicators(indicators: EconomicIndicator[]): EconomicIndicator[] {
  const keyIds = ['fed_funds', 'treasury_10y', 'sp500', 'vix', 'cpi_yoy', 'unemployment'];
  return keyIds
    .map(id => indicators.find(i => i.id === id))
    .filter((i): i is EconomicIndicator => i !== undefined);
}

// Market health score based on indicators
export function calculateMarketHealthScore(indicators: EconomicIndicator[]): {
  score: number;
  label: string;
  factors: { name: string; impact: 'positive' | 'negative' | 'neutral' }[];
} {
  const factors: { name: string; impact: 'positive' | 'negative' | 'neutral' }[] = [];
  let score = 50; // Start neutral
  
  const vix = indicators.find(i => i.id === 'vix');
  if (vix?.current_raw) {
    if (vix.current_raw < 15) {
      score += 10;
      factors.push({ name: 'Low VIX', impact: 'positive' });
    } else if (vix.current_raw > 25) {
      score -= 15;
      factors.push({ name: 'High VIX', impact: 'negative' });
    } else {
      factors.push({ name: 'Moderate VIX', impact: 'neutral' });
    }
  }
  
  const yieldCurve = indicators.find(i => i.id === 'yield_curve');
  if (yieldCurve?.current_raw) {
    if (yieldCurve.current_raw < 0) {
      score -= 10;
      factors.push({ name: 'Inverted Yield Curve', impact: 'negative' });
    } else if (yieldCurve.current_raw > 0.5) {
      score += 5;
      factors.push({ name: 'Steep Yield Curve', impact: 'positive' });
    }
  }
  
  const unemployment = indicators.find(i => i.id === 'unemployment');
  if (unemployment?.current_raw) {
    if (unemployment.current_raw < 4) {
      score += 10;
      factors.push({ name: 'Low Unemployment', impact: 'positive' });
    } else if (unemployment.current_raw > 5.5) {
      score -= 10;
      factors.push({ name: 'High Unemployment', impact: 'negative' });
    }
  }
  
  const gdp = indicators.find(i => i.id === 'gdp_growth');
  if (gdp?.current_raw) {
    if (gdp.current_raw > 2.5) {
      score += 10;
      factors.push({ name: 'Strong GDP Growth', impact: 'positive' });
    } else if (gdp.current_raw < 0) {
      score -= 15;
      factors.push({ name: 'Negative GDP', impact: 'negative' });
    }
  }
  
  const cpi = indicators.find(i => i.id === 'cpi_yoy');
  if (cpi?.current_raw) {
    if (cpi.current_raw < 2.5) {
      score += 5;
      factors.push({ name: 'Controlled Inflation', impact: 'positive' });
    } else if (cpi.current_raw > 4) {
      score -= 10;
      factors.push({ name: 'High Inflation', impact: 'negative' });
    }
  }
  
  // Clamp score
  score = Math.max(0, Math.min(100, score));
  
  let label = 'Neutral';
  if (score >= 70) label = 'Bullish';
  else if (score >= 55) label = 'Slightly Bullish';
  else if (score <= 30) label = 'Bearish';
  else if (score <= 45) label = 'Slightly Bearish';
  
  return { score, label, factors };
}

export default useEconomicData;
