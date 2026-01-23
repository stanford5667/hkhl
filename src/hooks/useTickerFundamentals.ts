import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CompanyProfile {
  symbol: string;
  companyName: string;
  industry: string;
  sector: string;
  marketCap: number;
  price: number;
  description: string;
  country: string;
  exchange: string;
  ceo: string;
  employees: number;
  website: string;
}

export interface IncomeStatement {
  date: string;
  symbol: string;
  revenue: number;
  netIncome: number;
  grossProfit: number;
  operatingIncome: number;
  ebitda: number;
  eps: number;
  period: string;
}

export interface FundamentalsData {
  profile: CompanyProfile | null;
  financials: IncomeStatement[];
  // Derived values
  peRatio: number | null;
  eps: number | null;
  marketCap: number | null;
  revenueGrowth: number | null;
  netIncomeGrowth: number | null;
  useMockData: boolean;
  source: string;
}

export function useTickerFundamentals(ticker: string | undefined) {
  return useQuery<FundamentalsData | null>({
    queryKey: ['ticker-fundamentals', ticker],
    queryFn: async () => {
      if (!ticker) return null;
      
      const { data, error } = await supabase.functions.invoke('fmp-fundamentals', {
        body: { action: 'fundamentals', symbol: ticker }
      });
      
      if (error) {
        console.error('[useTickerFundamentals] Error:', error);
        throw error;
      }
      
      if (!data?.success) {
        console.warn('[useTickerFundamentals] No data for', ticker);
        return null;
      }
      
      const profile = data.profile as CompanyProfile | null;
      const financials = (data.financials || []) as IncomeStatement[];
      
      // Calculate derived metrics
      let peRatio: number | null = null;
      let eps: number | null = null;
      let revenueGrowth: number | null = null;
      let netIncomeGrowth: number | null = null;
      
      if (financials.length > 0) {
        eps = financials[0].eps || null;
        
        if (profile?.price && eps && eps > 0) {
          peRatio = Math.round((profile.price / eps) * 100) / 100;
        }
        
        // Calculate YoY growth if we have 2+ years
        if (financials.length >= 2) {
          const currentRevenue = financials[0].revenue;
          const priorRevenue = financials[1].revenue;
          const currentIncome = financials[0].netIncome;
          const priorIncome = financials[1].netIncome;
          
          if (priorRevenue > 0) {
            revenueGrowth = Math.round(((currentRevenue - priorRevenue) / priorRevenue) * 10000) / 100;
          }
          if (priorIncome > 0) {
            netIncomeGrowth = Math.round(((currentIncome - priorIncome) / priorIncome) * 10000) / 100;
          }
        }
      }
      
      return {
        profile,
        financials,
        peRatio,
        eps,
        marketCap: profile?.marketCap || null,
        revenueGrowth,
        netIncomeGrowth,
        useMockData: data.useMockData || false,
        source: data.source || 'Unknown'
      };
    },
    staleTime: 60 * 60 * 1000, // 1 hour - fundamentals don't change often
    enabled: !!ticker,
  });
}
