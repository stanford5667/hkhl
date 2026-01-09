/**
 * usePortfolioCalculations
 * 
 * Manages portfolio metric calculations with:
 * - Automatic recalculation on ticker/weight changes
 * - Real-time data subscription
 * - Loading and error states
 * - Calculation traces for transparency
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { marketDataService, FetchProgress } from '@/services/hybridMarketDataService';

export interface PortfolioAllocation {
  ticker: string;
  weight: number;
  name?: string;
}

export interface PortfolioMetrics {
  // Returns
  totalReturn: number;
  cagr: number;
  annualizedReturn: number;
  
  // Risk
  volatility: number;
  maxDrawdown: number;
  var95: number;
  cvar95: number;
  var99: number;
  cvar99: number;
  
  // Risk-Adjusted
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  omegaRatio: number;
  informationRatio: number;
  
  // Tail Risk
  tailRatio: number;
  ulcerIndex: number;
  skewness: number;
  kurtosis: number;
  
  // Benchmark
  beta: number;
  alpha: number;
  
  // Human-Readable
  sleepScore: number;
  turbulenceRating: number;
  worstCaseDollars: number;
  
  // Liquidity
  liquidityScore: number;
  daysToLiquidate: number;
}

export interface CalculationTrace {
  metricId: string;
  steps: {
    step: number;
    description: string;
    formula: string;
    inputs: Record<string, number | string>;
    result: number | string;
  }[];
}

export interface AIAnalysis {
  summary: string;
  riskLevel: string;
  strengths: string[];
  concerns: string[];
  suggestions: string[];
  suitableFor: string;
  keyInsight: string;
}

export interface PortfolioCalculationResult {
  metrics: PortfolioMetrics | null;
  traces: CalculationTrace[];
  aiAnalysis: AIAnalysis | null;
  dataInfo: {
    startDate: string;
    endDate: string;
    tradingDays: number;
    dataSource: string;
  } | null;
  correlationMatrix: number[][] | null;
  portfolioValues: number[];
  portfolioReturns: number[];
  dates: string[];
}

interface UsePortfolioCalculationsOptions {
  allocations: PortfolioAllocation[];
  investableCapital: number;
  startDate?: string; // NEW: Pass custom date range
  endDate?: string;   // NEW: Pass custom date range  
  benchmarkTicker?: string;
  riskFreeRate?: number;
  enabled?: boolean;
  includeAIAnalysis?: boolean;
  generateTraces?: boolean;
}

export function usePortfolioCalculations({
  allocations,
  investableCapital,
  startDate,  // NEW
  endDate,    // NEW
  benchmarkTicker = 'SPY',
  riskFreeRate = 0.05,
  enabled = true,
  includeAIAnalysis = true,
  generateTraces = false
}: UsePortfolioCalculationsOptions) {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<FetchProgress>({ status: 'idle', current: 0, total: 0 });
  const previousAllocationsRef = useRef<string>('');
  
  // Create a stable key for the allocations
  const allocationsKey = useMemo(() => {
    return allocations
      .map(a => `${a.ticker}:${a.weight.toFixed(4)}`)
      .sort()
      .join('|');
  }, [allocations]);
  
  // Detect changes and invalidate cache
  useEffect(() => {
    if (previousAllocationsRef.current && previousAllocationsRef.current !== allocationsKey) {
      console.log('[usePortfolioCalculations] Allocations changed, invalidating cache');
      queryClient.invalidateQueries({ queryKey: ['portfolio-calculations'] });
    }
    previousAllocationsRef.current = allocationsKey;
  }, [allocationsKey, queryClient]);
  
  // Main calculation query
  const {
    data: result,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['portfolio-calculations', allocationsKey, investableCapital, benchmarkTicker, startDate, endDate],
    queryFn: async (): Promise<PortfolioCalculationResult> => {
      if (allocations.length === 0) {
        return {
          metrics: null,
          traces: [],
          aiAnalysis: null,
          dataInfo: null,
          correlationMatrix: null,
          portfolioValues: [],
          portfolioReturns: [],
          dates: []
        };
      }
      
      const tickers = allocations.map(a => a.ticker);
      // Ensure weights are in decimal format (0-1), not percentages (0-100)
      const rawWeights = allocations.map(a => a.weight);
      const weightSum = rawWeights.reduce((sum, w) => sum + w, 0);
      // If weights sum to more than 1.5, they're likely percentages - convert them
      const weights = weightSum > 1.5 
        ? rawWeights.map(w => w / weightSum) 
        : rawWeights;
      
      setProgress({ status: 'fetching', current: 0, total: 3, message: 'Loading market data...' });
      
      // Step 1: Call AI calculation engine - NOW WITH DATE RANGE
      const { data, error } = await supabase.functions.invoke('ai-calculate-metrics', {
        body: {
          tickers,
          weights,
          startDate,  // NOW PASSED!
          endDate,    // NOW PASSED!
          benchmarkTicker,
          investableCapital,
          riskFreeRate,
          includeAIAnalysis,
          generateTraces
        }
      });
      
      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Calculation failed');
      
      setProgress({ status: 'fetching', current: 1, total: 3, message: 'Calculating correlations...' });
      
      // Step 2: Get correlation matrix
      const correlationMatrix = await marketDataService.getCorrelationMatrix(tickers);
      
      setProgress({ status: 'fetching', current: 2, total: 3, message: 'Building return series...' });
      
      // Step 3: Get portfolio returns for charting - NOW USING CORRECT DATE RANGE
      const { dates, returns: portfolioReturns, values: portfolioValues } = 
        await marketDataService.getPortfolioReturns(tickers, weights, {
          startDate,
          endDate
        });
      
      setProgress({ status: 'complete', current: 3, total: 3 });
      
      return {
        metrics: data.metrics,
        traces: data.traces || [],
        aiAnalysis: data.aiAnalysis,
        dataInfo: data.dataInfo,
        correlationMatrix,
        portfolioValues,
        portfolioReturns,
        dates
      };
    },
    enabled: enabled && allocations.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 2
  });
  
  // Subscribe to real-time updates
  useEffect(() => {
    if (allocations.length === 0) return;
    
    const tickers = allocations.map(a => a.ticker);
    
    const unsubscribe = marketDataService.subscribeToUpdates(tickers, (updatedTicker) => {
      console.log(`[usePortfolioCalculations] Data updated for ${updatedTicker}, refetching...`);
      refetch();
    });
    
    return unsubscribe;
  }, [allocations, refetch]);
  
  // Force recalculation
  const recalculate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['portfolio-calculations'] });
    refetch();
  }, [queryClient, refetch]);
  
  // Get individual metric with trace
  const getMetricWithTrace = useCallback((metricId: string) => {
    if (!result) return null;
    
    const value = result.metrics?.[metricId as keyof PortfolioMetrics];
    const trace = result.traces.find(t => t.metricId === metricId);
    
    return { value, trace };
  }, [result]);
  
  return {
    // Data
    metrics: result?.metrics ?? null,
    traces: result?.traces ?? [],
    aiAnalysis: result?.aiAnalysis ?? null,
    dataInfo: result?.dataInfo ?? null,
    correlationMatrix: result?.correlationMatrix ?? null,
    portfolioValues: result?.portfolioValues ?? [],
    portfolioReturns: result?.portfolioReturns ?? [],
    dates: result?.dates ?? [],
    
    // Status
    isLoading,
    isError,
    error,
    progress,
    
    // Actions
    recalculate,
    getMetricWithTrace
  };
}

/**
 * Hook for single ticker data
 */
export function useTickerData(ticker: string, enabled = true) {
  return useQuery({
    queryKey: ['ticker-data', ticker],
    queryFn: async () => {
      const data = await marketDataService.getTickersData([ticker]);
      return data.get(ticker);
    },
    enabled: enabled && !!ticker,
    staleTime: 5 * 60 * 1000
  });
}

/**
 * Hook for asset universe search
 */
export function useAssetSearch(query: string) {
  return useQuery({
    queryKey: ['asset-search', query],
    queryFn: async () => {
      if (!query || query.length < 1) return [];
      
      const { data } = await supabase
        .from('asset_universe')
        .select('ticker, name, category, asset_type, sector, liquidity_score')
        .eq('is_active', true)
        .or(`ticker.ilike.%${query}%,name.ilike.%${query}%`)
        .order('liquidity_score', { ascending: false })
        .limit(20);
      
      return data || [];
    },
    enabled: query.length >= 1,
    staleTime: 60 * 1000
  });
}