/**
 * usePortfolioFromAllocations
 * 
 * Hook that calculates live portfolio metrics directly from saved_portfolios allocations.
 * This ensures the Portfolio page shows accurate data matching what was set in Portfolio Visualizer.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { getCachedQuotes } from '@/services/quoteCacheService';
import type { SavedPortfolio } from '@/hooks/useActivePortfolio';

// ============ Types ============

export interface PortfolioAllocation {
  symbol: string;
  weight: number;
  name?: string;
  assetClass?: string;
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
  
  // State
  isLoading: boolean;
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
  
  // Calculate live metrics
  const {
    data: metrics,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['portfolio-live-metrics', portfolio?.id, allocations.length],
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
  
  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);
  
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
    isLoading,
    error: error ? (error as Error).message : null,
    refresh,
  };
}

export default usePortfolioFromAllocations;
