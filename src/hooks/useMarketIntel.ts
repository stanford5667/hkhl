import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Default query options - optimized for performance
// Data is fetched on mount but cached for 10 minutes to prevent redundant requests
const optimizedOptions = {
  staleTime: 10 * 60 * 1000, // 10 minutes - data stays fresh
  gcTime: 30 * 60 * 1000, // 30 minutes - keep in cache
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
};

export function usePortfolioAssets() {
  return useQuery({
    queryKey: ['portfolio-assets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portfolio_assets')
        .select('*')
        .order('current_value', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    ...optimizedOptions,
  });
}

export function useAssetAllocation() {
  return useQuery({
    queryKey: ['asset-allocation'],
    queryFn: async () => {
      const { data, error } = await supabase.from('portfolio_assets').select('asset_type, current_value, invested_capital');
      if (error) throw error;
      const totals: Record<string, { value: number; cost: number }> = {};
      let totalValue = 0;
      data?.forEach((a: any) => {
        if (!totals[a.asset_type]) totals[a.asset_type] = { value: 0, cost: 0 };
        totals[a.asset_type].value += a.current_value || 0;
        totals[a.asset_type].cost += a.invested_capital || 0;
        totalValue += a.current_value || 0;
      });
      return Object.entries(totals).map(([type, v]) => ({
        asset_type: type, current_value: v.value, invested_capital: v.cost,
        allocation_pct: totalValue > 0 ? (v.value / totalValue) * 100 : 0,
        gain_pct: v.cost > 0 ? ((v.value - v.cost) / v.cost) * 100 : 0,
      }));
    },
    ...optimizedOptions,
  });
}

export function usePortfolioTotals() {
  return useQuery({
    queryKey: ['portfolio-totals'],
    queryFn: async () => {
      const { data, error } = await supabase.from('portfolio_assets').select('current_value, invested_capital, irr, moic');
      if (error) throw error;
      return {
        totalValue: data?.reduce((s, a) => s + (a.current_value || 0), 0) || 0,
        totalCost: data?.reduce((s, a) => s + (a.invested_capital || 0), 0) || 0,
        avgIrr: data?.length ? data.reduce((s, a) => s + (a.irr || 0), 0) / data.length : 0,
        avgMoic: data?.length ? data.reduce((s, a) => s + (a.moic || 0), 0) / data.length : 0,
      };
    },
    ...optimizedOptions,
  });
}

export function useCovenants() {
  return useQuery({
    queryKey: ['covenants'],
    queryFn: async () => {
      const { data, error } = await supabase.from('portfolio_covenants').select('*, portfolio_assets(name)').order('is_warning', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    ...optimizedOptions,
  });
}

export function useAlerts() {
  return useQuery({
    queryKey: ['alerts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('alerts').select('*, portfolio_assets(name)').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    ...optimizedOptions,
  });
}

export function useEvents() {
  return useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const { data, error } = await supabase.from('events').select('*').gte('event_date', new Date().toISOString().split('T')[0]).order('event_date').limit(5);
      if (error) throw error;
      return data || [];
    },
    ...optimizedOptions,
  });
}

export function useEconomicIndicators() {
  return useQuery({
    queryKey: ['economic-indicators'],
    queryFn: async () => {
      const { data, error } = await supabase.from('economic_indicators').select('*');
      if (error) throw error;
      return data || [];
    },
    ...optimizedOptions,
  });
}

export function usePEFunds() {
  return useQuery({
    queryKey: ['pe-funds'],
    queryFn: async () => {
      const { data, error } = await supabase.from('pe_funds').select('*').order('current_size', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    ...optimizedOptions,
  });
}

export function useDealPipeline() {
  return useQuery({
    queryKey: ['deal-pipeline'],
    queryFn: async () => {
      const { data, error } = await supabase.from('deal_pipeline').select('*');
      if (error) throw error;
      return data || [];
    },
    ...optimizedOptions,
  });
}

export function useMATransactions() {
  return useQuery({
    queryKey: ['ma-transactions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ma_transactions').select('*').order('transaction_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    ...optimizedOptions,
  });
}
