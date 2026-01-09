/**
 * usePortfolioFromAllocations
 * 
 * Hook that calculates live portfolio metrics directly from saved_portfolios allocations.
 * This ensures the Portfolio page shows accurate data matching what was set in Portfolio Visualizer.
 * 
 * Uses the same ai-calculate-metrics edge function as the Portfolio Builder to ensure
 * consistent metrics (CAGR, Sharpe, Max Drawdown, etc.) across the application.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { getCachedQuotes } from '@/services/quoteCacheService';
import { supabase } from '@/integrations/supabase/client';
import type { SavedPortfolio } from '@/hooks/useActivePortfolio';

// ============ Types ============

export interface PortfolioAllocation {
  symbol: string;
  weight: number;
  name?: string;
  assetClass?: string;
}

// Advanced metrics from Portfolio Builder calculations
export interface AdvancedMetrics {
  // Returns
  totalReturn: number;
  cagr: number;
  annualizedReturn: number;
  
  // Risk
  volatility: number;
  maxDrawdown: number;
  var95: number;
  cvar95: number;
  
  // Risk-Adjusted
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  
  // Benchmark
  beta: number;
  alpha: number;
}

export interface PortfolioMetrics {
  totalValue: number;
  totalCostBasis: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  todayChange: number;
  todayChangePercent: number;
  holdings: PortfolioHolding[];
  positionCount: number;
  
  // Advanced metrics matching Portfolio Builder
  advanced?: AdvancedMetrics;
}

export interface PortfolioHolding {
  symbol: string;
  name: string;
  weight: number;
  quantity: number;
  costBasis: number;
  costPerShare: number;
  currentPrice: number;
  currentValue: number;
  gainLoss: number;
  gainLossPercent: number;
  todayChange: number;
  todayChangePercent: number;
  assetClass: string;
}

// ============ Helper Functions ============

/**
 * Parse allocations from saved portfolio JSON
 */
export function parseAllocations(allocationsJson: unknown): PortfolioAllocation[] {
  if (!allocationsJson) return [];
  
  try {
    if (Array.isArray(allocationsJson)) {
      return allocationsJson.map(a => ({
        symbol: a.symbol || a.ticker || '',
        weight: a.weight || 0,
        name: a.name,
        assetClass: a.assetClass || a.asset_class,
      })).filter(a => a.symbol && a.weight > 0);
    }
  } catch (e) {
    console.error('[parseAllocations] Error parsing:', e);
  }
  
  return [];
}

/**
 * Get investor profile capital from saved portfolio
 */
export function getInvestorCapital(investorProfile: unknown): number {
  if (!investorProfile) return 100000;
  
  try {
    const profile = investorProfile as { investableCapital?: number };
    return profile.investableCapital || 100000;
  } catch {
    return 100000;
  }
}

/**
 * Calculate live portfolio metrics from allocations (without needing synced_positions)
 */
export async function calculateMetricsFromAllocations(
  allocations: PortfolioAllocation[],
  totalCapital: number
): Promise<PortfolioMetrics> {
  if (allocations.length === 0) {
    return {
      totalValue: 0,
      totalCostBasis: 0,
      totalGainLoss: 0,
      totalGainLossPercent: 0,
      todayChange: 0,
      todayChangePercent: 0,
      holdings: [],
      positionCount: 0,
    };
  }
  
  // Get live quotes
  const symbols = allocations.map(a => a.symbol.toUpperCase());
  const quotes = await getCachedQuotes(symbols);
  
  const holdings: PortfolioHolding[] = [];
  let totalValue = 0;
  let totalTodayChange = 0;
  
  for (const alloc of allocations) {
    const symbol = alloc.symbol.toUpperCase();
    const quote = quotes.get(symbol);
    
    // Position sizing
    const positionCostBasis = (alloc.weight / 100) * totalCapital;
    const costPerShare = quote?.price ? quote.price / (1 + (quote.changePercent / 100)) : 100;
    const quantity = positionCostBasis / costPerShare;
    
    // Current values
    const currentPrice = quote?.price || costPerShare;
    const currentValue = quantity * currentPrice;
    const todayChange = quote ? quantity * quote.change : 0;
    
    // Gain/loss
    const gainLoss = currentValue - positionCostBasis;
    const gainLossPercent = positionCostBasis > 0 ? (gainLoss / positionCostBasis) * 100 : 0;
    
    holdings.push({
      symbol,
      name: alloc.name || symbol,
      weight: alloc.weight,
      quantity,
      costBasis: positionCostBasis,
      costPerShare,
      currentPrice,
      currentValue,
      gainLoss,
      gainLossPercent,
      todayChange,
      todayChangePercent: quote?.changePercent || 0,
      assetClass: alloc.assetClass || 'public_equity',
    });
    
    totalValue += currentValue;
    totalTodayChange += todayChange;
  }
  
  const totalGainLoss = totalValue - totalCapital;
  const totalGainLossPercent = totalCapital > 0 ? (totalGainLoss / totalCapital) * 100 : 0;
  const previousValue = totalValue - totalTodayChange;
  const todayChangePercent = previousValue > 0 ? (totalTodayChange / previousValue) * 100 : 0;
  
  return {
    totalValue,
    totalCostBasis: totalCapital,
    totalGainLoss,
    totalGainLossPercent,
    todayChange: totalTodayChange,
    todayChangePercent,
    holdings: holdings.sort((a, b) => b.currentValue - a.currentValue),
    positionCount: holdings.length,
  };
}

/**
 * Fetch advanced metrics from the same edge function used by Portfolio Builder
 * This ensures consistency between Portfolio page and Portfolio Builder
 */
async function fetchAdvancedMetrics(
  allocations: PortfolioAllocation[],
  investableCapital: number
): Promise<AdvancedMetrics | null> {
  if (allocations.length === 0) return null;
  
  try {
    const tickers = allocations.map(a => a.symbol.toUpperCase());
    const rawWeights = allocations.map(a => a.weight);
    const weightSum = rawWeights.reduce((sum, w) => sum + w, 0);
    // Normalize weights to decimals (0-1)
    const weights = weightSum > 1.5 
      ? rawWeights.map(w => w / weightSum) 
      : rawWeights.map(w => w / 100);
    
    const { data, error } = await supabase.functions.invoke('ai-calculate-metrics', {
      body: {
        tickers,
        weights,
        benchmarkTicker: 'SPY',
        investableCapital,
        riskFreeRate: 0.05,
        includeAIAnalysis: false,
        generateTraces: false,
      }
    });
    
    if (error || !data?.success || !data?.metrics) {
      console.warn('[fetchAdvancedMetrics] Edge function returned no metrics:', error || data?.error);
      return null;
    }
    
    return {
      totalReturn: data.metrics.totalReturn ?? 0,
      cagr: data.metrics.cagr ?? 0,
      annualizedReturn: data.metrics.annualizedReturn ?? 0,
      volatility: data.metrics.volatility ?? 0,
      maxDrawdown: data.metrics.maxDrawdown ?? 0,
      var95: data.metrics.var95 ?? 0,
      cvar95: data.metrics.cvar95 ?? 0,
      sharpeRatio: data.metrics.sharpeRatio ?? 0,
      sortinoRatio: data.metrics.sortinoRatio ?? 0,
      calmarRatio: data.metrics.calmarRatio ?? 0,
      beta: data.metrics.beta ?? 0,
      alpha: data.metrics.alpha ?? 0,
    };
  } catch (err) {
    console.error('[fetchAdvancedMetrics] Error:', err);
    return null;
  }
}

// ============ Hook ============

interface UsePortfolioFromAllocationsOptions {
  portfolio: SavedPortfolio | null;
  enabled?: boolean;
}

interface UsePortfolioFromAllocationsReturn {
  // Parsed data
  allocations: PortfolioAllocation[];
  investableCapital: number;
  
  // Live metrics
  metrics: PortfolioMetrics | null;
  holdings: PortfolioHolding[];
  
  // Summary values
  totalValue: number;
  totalCostBasis: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  todayChange: number;
  todayChangePercent: number;
  positionCount: number;
  
  // Advanced metrics (from Portfolio Builder calculations)
  advancedMetrics: AdvancedMetrics | null;
  cagr: number;
  sharpeRatio: number;
  maxDrawdown: number;
  volatility: number;
  alpha: number;
  beta: number;
  
  // State
  isLoading: boolean;
  isLoadingAdvanced: boolean;
  error: string | null;
  
  // Actions
  refresh: () => Promise<void>;
}

export function usePortfolioFromAllocations(
  options: UsePortfolioFromAllocationsOptions
): UsePortfolioFromAllocationsReturn {
  const { portfolio, enabled = true } = options;
  
  // Parse allocations from portfolio
  const allocations = useMemo(() => {
    if (!portfolio?.allocations) return [];
    return parseAllocations(portfolio.allocations);
  }, [portfolio?.allocations]);
  
  // Get investable capital from investor profile
  const investableCapital = useMemo(() => {
    if (!portfolio?.investor_profile) return 100000;
    return getInvestorCapital(portfolio.investor_profile);
  }, [portfolio?.investor_profile]);
  
  // Create stable key for allocations
  const allocationsKey = useMemo(() => {
    return allocations
      .map(a => `${a.symbol}:${a.weight.toFixed(4)}`)
      .sort()
      .join('|');
  }, [allocations]);
  
  // Calculate live metrics (holdings, today's change, etc.)
  const {
    data: metrics,
    isLoading: isLoadingBasic,
    error: basicError,
    refetch: refetchBasic,
  } = useQuery({
    queryKey: ['portfolio-live-metrics', portfolio?.id, allocationsKey],
    queryFn: async () => {
      if (allocations.length === 0) {
        return {
          totalValue: 0,
          totalCostBasis: 0,
          totalGainLoss: 0,
          totalGainLossPercent: 0,
          todayChange: 0,
          todayChangePercent: 0,
          holdings: [],
          positionCount: 0,
        } as PortfolioMetrics;
      }
      
      return calculateMetricsFromAllocations(allocations, investableCapital);
    },
    enabled: enabled && allocations.length > 0,
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });
  
  // Fetch advanced metrics from same edge function as Portfolio Builder
  const {
    data: advancedMetrics,
    isLoading: isLoadingAdvanced,
    refetch: refetchAdvanced,
  } = useQuery({
    queryKey: ['portfolio-advanced-metrics', portfolio?.id, allocationsKey, investableCapital],
    queryFn: () => fetchAdvancedMetrics(allocations, investableCapital),
    enabled: enabled && allocations.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes cache
    retry: 1,
  });
  
  const refresh = useCallback(async () => {
    await Promise.all([refetchBasic(), refetchAdvanced()]);
  }, [refetchBasic, refetchAdvanced]);
  
  return {
    allocations,
    investableCapital,
    metrics: metrics || null,
    holdings: metrics?.holdings || [],
    totalValue: metrics?.totalValue || 0,
    totalCostBasis: metrics?.totalCostBasis || investableCapital,
    totalGainLoss: metrics?.totalGainLoss || 0,
    totalGainLossPercent: metrics?.totalGainLossPercent || 0,
    todayChange: metrics?.todayChange || 0,
    todayChangePercent: metrics?.todayChangePercent || 0,
    positionCount: metrics?.positionCount || allocations.length,
    
    // Advanced metrics matching Portfolio Builder
    advancedMetrics: advancedMetrics || null,
    cagr: advancedMetrics?.cagr ?? 0,
    sharpeRatio: advancedMetrics?.sharpeRatio ?? 0,
    maxDrawdown: advancedMetrics?.maxDrawdown ?? 0,
    volatility: advancedMetrics?.volatility ?? 0,
    alpha: advancedMetrics?.alpha ?? 0,
    beta: advancedMetrics?.beta ?? 0,
    
    isLoading: isLoadingBasic,
    isLoadingAdvanced,
    error: basicError ? (basicError as Error).message : null,
    refresh,
  };
}

export default usePortfolioFromAllocations;
