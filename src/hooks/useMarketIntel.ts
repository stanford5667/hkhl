import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Types matching the new schema
export interface PortfolioAsset {
  id: string;
  name: string;
  asset_type: 'pe' | 'real_estate' | 'public_equity' | 'credit' | 'alternatives';
  sector: string | null;
  invested_capital: number;
  current_value: number;
  irr: number | null;
  moic: number | null;
  vintage_year: number | null;
  health_score: number | null;
  revenue_growth: number | null;
  ebitda_margin: number | null;
  debt_service_coverage: number | null;
  created_at: string;
}

export interface PortfolioCovenant {
  id: string;
  asset_id: string | null;
  covenant_type: string;
  current_value: number;
  limit_value: number;
  is_warning: boolean;
  created_at: string;
}

export interface Alert {
  id: string;
  asset_id: string | null;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string | null;
  is_read: boolean;
  created_at: string;
}

export interface Event {
  id: string;
  title: string;
  event_type: 'macro' | 'portfolio' | 'internal';
  event_date: string;
  created_at: string;
}

export interface PEFund {
  id: string;
  fund_name: string;
  manager_name: string;
  fund_type: string;
  target_size: number | null;
  current_size: number | null;
  status: string;
  prior_fund_irr: number | null;
  prior_fund_moic: number | null;
  created_at: string;
}

export interface DealPipeline {
  id: string;
  company_name: string;
  sector: string | null;
  revenue: number | null;
  ebitda: number | null;
  asking_multiple: number | null;
  fit_score: 'high' | 'medium' | 'low' | null;
  stage: string;
  created_at: string;
}

export interface MATransaction {
  id: string;
  target_name: string;
  acquirer_name: string | null;
  sector: string | null;
  enterprise_value: number | null;
  ebitda_multiple: number | null;
  transaction_date: string | null;
  created_at: string;
}

export interface EconomicIndicator {
  id: string;
  indicator_name: string;
  current_value: string;
  change_value: number | null;
  category: 'rates' | 'economic' | 'markets' | null;
  updated_at: string;
}

// Hooks
export function usePortfolioAssets() {
  return useQuery({
    queryKey: ["portfolio_assets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portfolio_assets")
        .select("*")
        .order("current_value", { ascending: false });
      
      if (error) throw error;
      return data as PortfolioAsset[];
    },
  });
}

export function useAssetAllocation() {
  const { data: assets } = usePortfolioAssets();
  
  if (!assets || assets.length === 0) {
    return { allocation: [], totalValue: 0 };
  }
  
  const totalValue = assets.reduce((sum, asset) => sum + (asset.current_value || 0), 0);
  
  const typeMap = assets.reduce((acc, asset) => {
    const type = asset.asset_type || "Other";
    acc[type] = (acc[type] || 0) + (asset.current_value || 0);
    return acc;
  }, {} as Record<string, number>);
  
  const allocation = Object.entries(typeMap).map(([name, value]) => ({
    name: name.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    value,
    percentage: ((value / totalValue) * 100).toFixed(1),
  }));
  
  return { allocation, totalValue };
}

export function usePortfolioTotals() {
  const { data: assets } = usePortfolioAssets();
  
  if (!assets || assets.length === 0) {
    return {
      totalInvested: 0,
      totalValue: 0,
      totalReturn: 0,
      returnPct: 0,
      companyCount: 0,
      avgMoic: 0,
    };
  }
  
  const totalInvested = assets.reduce((sum, asset) => sum + (asset.invested_capital || 0), 0);
  const totalValue = assets.reduce((sum, asset) => sum + (asset.current_value || 0), 0);
  const totalReturn = totalValue - totalInvested;
  const returnPct = totalInvested > 0 ? ((totalReturn / totalInvested) * 100) : 0;
  const moics = assets.filter(a => a.moic).map(a => a.moic!);
  const avgMoic = moics.length > 0 ? moics.reduce((a, b) => a + b, 0) / moics.length : 0;
  
  return {
    totalInvested,
    totalValue,
    totalReturn,
    returnPct,
    companyCount: assets.length,
    avgMoic,
  };
}

export function useCovenants() {
  return useQuery({
    queryKey: ["portfolio_covenants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portfolio_covenants")
        .select("*, portfolio_assets(name)")
        .order("is_warning", { ascending: false });
      
      if (error) throw error;
      return data as (PortfolioCovenant & { portfolio_assets: { name: string } | null })[];
    },
  });
}

export function useAlerts(unreadOnly = false) {
  return useQuery({
    queryKey: ["alerts", unreadOnly],
    queryFn: async () => {
      let query = supabase
        .from("alerts")
        .select("*, portfolio_assets(name)")
        .order("created_at", { ascending: false });
      
      if (unreadOnly) {
        query = query.eq("is_read", false);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as (Alert & { portfolio_assets: { name: string } | null })[];
    },
  });
}

export function useMarkAlertRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from("alerts")
        .update({ is_read: true })
        .eq("id", alertId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
    },
  });
}

export function useEvents() {
  return useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .gte("event_date", new Date().toISOString().split('T')[0])
        .order("event_date", { ascending: true });
      
      if (error) throw error;
      return data as Event[];
    },
  });
}

export function useEconomicIndicators() {
  return useQuery({
    queryKey: ["economic_indicators"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("economic_indicators")
        .select("*")
        .order("category", { ascending: true });
      
      if (error) throw error;
      return data as EconomicIndicator[];
    },
  });
}

export function usePEFunds() {
  return useQuery({
    queryKey: ["pe_funds"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pe_funds")
        .select("*")
        .order("current_size", { ascending: false });
      
      if (error) throw error;
      return data as PEFund[];
    },
  });
}

export function useDealPipeline() {
  return useQuery({
    queryKey: ["deal_pipeline"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_pipeline")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as DealPipeline[];
    },
  });
}

export function useMATransactions() {
  return useQuery({
    queryKey: ["ma_transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ma_transactions")
        .select("*")
        .order("transaction_date", { ascending: false });
      
      if (error) throw error;
      return data as MATransaction[];
    },
  });
}
