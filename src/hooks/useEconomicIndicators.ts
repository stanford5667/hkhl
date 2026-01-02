import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type IndicatorType = 'rate' | 'index' | 'commodity' | 'currency' | 'crypto';
export type IndicatorCategory = 'inflation' | 'rates' | 'energy' | 'metals' | 'agriculture' | 'currency' | 'crypto' | 'indices';

export interface EconomicIndicator {
  id: string;
  indicator_type: IndicatorType;
  symbol: string;
  name: string;
  category: IndicatorCategory;
  current_value: number | null;
  previous_value: number | null;
  change_value: number | null;
  change_percent: number | null;
  unit: string;
  updated_at: string;
  source: string | null;
}

interface UseEconomicIndicatorsOptions {
  category?: IndicatorCategory;
  type?: IndicatorType;
  symbols?: string[];
}

// Default query options - NO automatic fetching
const noAutoFetchOptions = {
  staleTime: Infinity,
  refetchOnWindowFocus: false,
  refetchOnMount: false,
  refetchOnReconnect: false,
};

export function useEconomicIndicators(options: UseEconomicIndicatorsOptions = {}) {
  const { category, type, symbols } = options;

  return useQuery({
    queryKey: ['economic-indicators', category, type, symbols],
    queryFn: async () => {
      let query = supabase
        .from('economic_indicators')
        .select('*')
        .order('category')
        .order('name');

      if (category) {
        query = query.eq('category', category);
      }

      if (type) {
        query = query.eq('indicator_type', type);
      }

      if (symbols && symbols.length > 0) {
        query = query.in('symbol', symbols);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as EconomicIndicator[];
    },
    ...noAutoFetchOptions,
  });
}

export function useIndicatorsByCategory() {
  const { data: indicators = [], ...rest } = useEconomicIndicators();

  const groupedIndicators = indicators.reduce((acc, indicator) => {
    if (!acc[indicator.category]) {
      acc[indicator.category] = [];
    }
    acc[indicator.category].push(indicator);
    return acc;
  }, {} as Record<IndicatorCategory, EconomicIndicator[]>);

  return { groupedIndicators, indicators, ...rest };
}

export function useIndicator(symbol: string) {
  return useQuery({
    queryKey: ['economic-indicator', symbol],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('economic_indicators')
        .select('*')
        .eq('symbol', symbol)
        .maybeSingle();

      if (error) throw error;
      return data as EconomicIndicator | null;
    },
    enabled: !!symbol,
    ...noAutoFetchOptions,
  });
}

// Category display names
export const categoryLabels: Record<IndicatorCategory, string> = {
  rates: 'Rates & Yields',
  inflation: 'Inflation',
  energy: 'Energy',
  metals: 'Precious Metals',
  agriculture: 'Agriculture',
  currency: 'Currencies',
  crypto: 'Crypto',
  indices: 'Market Indices',
};

// Category icons (lucide icon names)
export const categoryIcons: Record<IndicatorCategory, string> = {
  rates: 'Percent',
  inflation: 'TrendingUp',
  energy: 'Fuel',
  metals: 'Gem',
  agriculture: 'Wheat',
  currency: 'DollarSign',
  crypto: 'Bitcoin',
  indices: 'BarChart3',
};
