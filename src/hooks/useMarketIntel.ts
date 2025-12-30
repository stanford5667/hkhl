import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Types
export interface PortfolioAsset {
  id: string;
  user_id: string;
  company_name: string;
  industry: string;
  investment_date: string;
  investment_amount: number;
  current_value: number;
  ownership_pct: number;
  status: string;
  revenue_ltm: number | null;
  ebitda_ltm: number | null;
  employee_count: number | null;
  health_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface PortfolioCovenant {
  id: string;
  user_id: string;
  asset_id: string | null;
  company_name: string;
  covenant_type: string;
  threshold: number;
  current_value: number;
  status: string;
  next_test_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Alert {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  severity: string;
  category: string;
  source: string | null;
  is_read: boolean;
  created_at: string;
}

export interface Event {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  event_type: string;
  event_date: string;
  company_name: string | null;
  created_at: string;
}

export interface PEFund {
  id: string;
  user_id: string;
  fund_name: string;
  manager: string;
  strategy: string;
  vintage_year: number;
  fund_size: number;
  status: string;
  irr: number | null;
  tvpi: number | null;
  dpi: number | null;
  created_at: string;
}

export interface DealPipeline {
  id: string;
  user_id: string;
  company_name: string;
  industry: string;
  deal_type: string;
  stage: string;
  ev_range: string | null;
  ev_ebitda: number | null;
  source: string | null;
  priority: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MATransaction {
  id: string;
  user_id: string;
  target_name: string;
  acquirer_name: string;
  industry: string;
  deal_value: number | null;
  ev_ebitda: number | null;
  ev_revenue: number | null;
  announced_date: string;
  status: string;
  created_at: string;
}

export interface EconomicIndicator {
  id: string;
  user_id: string;
  indicator_name: string;
  category: string;
  current_value: number;
  previous_value: number | null;
  change_pct: number | null;
  unit: string;
  source: string | null;
  as_of_date: string;
  created_at: string;
}

// Hooks
export function usePortfolioAssets() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["portfolio_assets", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portfolio_assets")
        .select("*")
        .order("current_value", { ascending: false });
      
      if (error) throw error;
      return data as PortfolioAsset[];
    },
    enabled: !!user,
  });
}

export function useAssetAllocation() {
  const { data: assets } = usePortfolioAssets();
  
  if (!assets || assets.length === 0) {
    return { allocation: [], totalValue: 0 };
  }
  
  const totalValue = assets.reduce((sum, asset) => sum + asset.current_value, 0);
  
  const industryMap = assets.reduce((acc, asset) => {
    const industry = asset.industry || "Other";
    acc[industry] = (acc[industry] || 0) + asset.current_value;
    return acc;
  }, {} as Record<string, number>);
  
  const allocation = Object.entries(industryMap).map(([name, value]) => ({
    name,
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
    };
  }
  
  const totalInvested = assets.reduce((sum, asset) => sum + asset.investment_amount, 0);
  const totalValue = assets.reduce((sum, asset) => sum + asset.current_value, 0);
  const totalReturn = totalValue - totalInvested;
  const returnPct = totalInvested > 0 ? ((totalReturn / totalInvested) * 100) : 0;
  
  return {
    totalInvested,
    totalValue,
    totalReturn,
    returnPct,
    companyCount: assets.length,
  };
}

export function useCovenants() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["portfolio_covenants", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portfolio_covenants")
        .select("*")
        .order("next_test_date", { ascending: true });
      
      if (error) throw error;
      return data as PortfolioCovenant[];
    },
    enabled: !!user,
  });
}

export function useAlerts(unreadOnly = false) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["alerts", user?.id, unreadOnly],
    queryFn: async () => {
      let query = supabase
        .from("alerts")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (unreadOnly) {
        query = query.eq("is_read", false);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Alert[];
    },
    enabled: !!user,
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
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["events", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .gte("event_date", new Date().toISOString())
        .order("event_date", { ascending: true });
      
      if (error) throw error;
      return data as Event[];
    },
    enabled: !!user,
  });
}

export function useEconomicIndicators() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["economic_indicators", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("economic_indicators")
        .select("*")
        .order("category", { ascending: true });
      
      if (error) throw error;
      return data as EconomicIndicator[];
    },
    enabled: !!user,
  });
}

export function usePEFunds() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["pe_funds", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pe_funds")
        .select("*")
        .order("vintage_year", { ascending: false });
      
      if (error) throw error;
      return data as PEFund[];
    },
    enabled: !!user,
  });
}

export function useDealPipeline() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["deal_pipeline", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_pipeline")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as DealPipeline[];
    },
    enabled: !!user,
  });
}

export function useMATransactions() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["ma_transactions", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ma_transactions")
        .select("*")
        .order("announced_date", { ascending: false });
      
      if (error) throw error;
      return data as MATransaction[];
    },
    enabled: !!user,
  });
}
