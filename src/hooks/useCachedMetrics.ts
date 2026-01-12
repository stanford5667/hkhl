/**
 * useCachedMetrics
 * 
 * Centralized metrics calculation hook using React Query for:
 * - Automatic deduplication of identical metric requests
 * - Cross-component cache sharing
 * - Reduced edge function calls
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Query key factory
export const metricsKeys = {
  all: ['portfolio-metrics'] as const,
  byHash: (hash: string) => [...metricsKeys.all, hash] as const,
  byPortfolio: (portfolioId: string) => [...metricsKeys.all, 'portfolio', portfolioId] as const,
};

export interface MetricsInput {
  tickers: string[];
  weights: number[];
  startDate: string;
  endDate: string;
  benchmarkTicker?: string;
  investableCapital?: number;
  riskFreeRate?: number;
  includeAIAnalysis?: boolean;
  generateTraces?: boolean;
}

export interface AdvancedMetrics {
  totalReturn: number;
  cagr: number;
  annualizedReturn: number;
  volatility: number;
  maxDrawdown: number;
  var95: number;
  var99: number;
  cvar95: number;
  cvar99: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  beta: number;
  alpha: number;
  rSquared: number;
  trackingError: number;
  informationRatio: number;
  treynorRatio: number;
  omegaRatio: number;
  tailRatio: number;
  skewness: number;
  kurtosis: number;
  ulcerIndex: number;
  sleepScore: number;
  turbulenceRating: number;
  liquidityScore: number;
  daysToLiquidate: number;
  worstCaseDollars: number;
}

export interface MetricsResult {
  success: boolean;
  fromCache: boolean;
  metrics: AdvancedMetrics;
  aiAnalysis?: {
    summary: string;
    riskLevel: string;
    keyInsight: string;
    strengths: string[];
    concerns: string[];
    suggestions: string[];
    suitableFor: string;
  };
  dataInfo: {
    startDate: string;
    endDate: string;
    calculatedAt: string;
  };
}

/**
 * Create a stable hash from metrics input for cache key
 */
function createMetricsHash(input: MetricsInput): string {
  const key = `${input.tickers.sort().join(',')}_${input.weights.join(',')}_${input.startDate}_${input.endDate}_${input.benchmarkTicker || 'SPY'}`;
  return btoa(key).substring(0, 32);
}

/**
 * Hook for fetching portfolio metrics with automatic deduplication
 * Same parameters = same request = single edge function call
 */
export function useCachedMetrics(input: MetricsInput | null, options?: { enabled?: boolean }) {
  const { enabled = true } = options || {};
  const { user } = useAuth();
  
  const hash = input ? createMetricsHash(input) : '';
  
  return useQuery({
    queryKey: metricsKeys.byHash(hash),
    queryFn: async (): Promise<MetricsResult | null> => {
      if (!input || input.tickers.length === 0) return null;
      
      const { data, error } = await supabase.functions.invoke('ai-calculate-metrics', {
        body: {
          tickers: input.tickers,
          weights: input.weights,
          startDate: input.startDate,
          endDate: input.endDate,
          benchmarkTicker: input.benchmarkTicker || 'SPY',
          investableCapital: input.investableCapital || 100000,
          riskFreeRate: input.riskFreeRate ?? 0.05,
          includeAIAnalysis: input.includeAIAnalysis ?? false,
          generateTraces: input.generateTraces ?? false,
        },
      });
      
      if (error) throw error;
      return data as MetricsResult;
    },
    enabled: enabled && !!user && !!input && input.tickers.length > 0,
    staleTime: 10 * 60 * 1000, // 10 minutes - metrics don't change unless portfolio changes
    gcTime: 60 * 60 * 1000, // Keep in cache for 1 hour
    retry: 1,
  });
}

/**
 * Get cached metrics without triggering a fetch
 * Useful for checking if data is already available
 */
export function useGetCachedMetrics() {
  const queryClient = useQueryClient();
  
  return (input: MetricsInput): MetricsResult | undefined => {
    const hash = createMetricsHash(input);
    return queryClient.getQueryData<MetricsResult>(metricsKeys.byHash(hash));
  };
}

/**
 * Invalidate metrics cache for a specific portfolio
 */
export function useInvalidateMetrics() {
  const queryClient = useQueryClient();
  
  return (portfolioId?: string) => {
    if (portfolioId) {
      queryClient.invalidateQueries({ queryKey: metricsKeys.byPortfolio(portfolioId) });
    } else {
      queryClient.invalidateQueries({ queryKey: metricsKeys.all });
    }
  };
}
