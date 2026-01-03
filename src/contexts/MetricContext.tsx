/**
 * MetricContext
 * 
 * Provides portfolio metrics state across components:
 * - Wraps usePortfolioCalculations hook
 * - Debounces allocation changes (500ms)
 * - Tracks stale state and lastCalculatedAt
 * - Prevents duplicate API calls
 */

import React, { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { 
  usePortfolioCalculations, 
  PortfolioAllocation, 
  PortfolioMetrics, 
  CalculationTrace, 
  AIAnalysis 
} from '@/hooks/usePortfolioCalculations';

interface MetricContextValue {
  // Portfolio state
  allocations: PortfolioAllocation[];
  setAllocations: (allocations: PortfolioAllocation[]) => void;
  
  // Calculated data
  metrics: PortfolioMetrics | null;
  traces: CalculationTrace[];
  aiAnalysis: AIAnalysis | null;
  correlationMatrix: number[][] | null;
  portfolioValues: number[];
  portfolioReturns: number[];
  dates: string[];
  
  // Status
  isLoading: boolean;
  isError: boolean;
  isStale: boolean;
  lastCalculatedAt: Date | null;
  
  // Actions
  recalculate: () => void;
  getMetricWithTrace: (metricId: string) => { value: number | string | undefined; trace?: CalculationTrace } | null;
  
  // Settings
  investableCapital: number;
  setInvestableCapital: (amount: number) => void;
  benchmarkTicker: string;
  setBenchmarkTicker: (ticker: string) => void;
}

const MetricContext = createContext<MetricContextValue | null>(null);

interface MetricProviderProps {
  children: React.ReactNode;
  initialAllocations?: PortfolioAllocation[];
  initialCapital?: number;
  initialBenchmark?: string;
}

export function MetricProvider({ 
  children, 
  initialAllocations = [],
  initialCapital = 100000,
  initialBenchmark = 'SPY'
}: MetricProviderProps) {
  // User-controlled state
  const [allocations, setAllocationsState] = useState<PortfolioAllocation[]>(initialAllocations);
  const [investableCapital, setInvestableCapital] = useState(initialCapital);
  const [benchmarkTicker, setBenchmarkTicker] = useState(initialBenchmark);
  
  // Debounced allocations for calculations
  const [debouncedAllocations, setDebouncedAllocations] = useState<PortfolioAllocation[]>(initialAllocations);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Stale state tracking
  const [isStale, setIsStale] = useState(false);
  const [lastCalculatedAt, setLastCalculatedAt] = useState<Date | null>(null);
  
  // Create stable allocation key for comparison
  const getAllocationsKey = useCallback((allocs: PortfolioAllocation[]) => {
    return allocs
      .map(a => `${a.ticker}:${a.weight.toFixed(4)}`)
      .sort()
      .join('|');
  }, []);
  
  // Debounced allocation setter
  const setAllocations = useCallback((newAllocations: PortfolioAllocation[]) => {
    setAllocationsState(newAllocations);
    
    // Mark as stale immediately
    const currentKey = getAllocationsKey(debouncedAllocations);
    const newKey = getAllocationsKey(newAllocations);
    if (currentKey !== newKey) {
      setIsStale(true);
    }
    
    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    // Set new debounced value after 500ms
    debounceTimeoutRef.current = setTimeout(() => {
      setDebouncedAllocations(newAllocations);
    }, 500);
  }, [debouncedAllocations, getAllocationsKey]);
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);
  
  // Use the portfolio calculations hook with debounced allocations
  const {
    metrics,
    traces,
    aiAnalysis,
    correlationMatrix,
    portfolioValues,
    portfolioReturns,
    dates,
    isLoading,
    isError,
    recalculate: baseRecalculate,
    getMetricWithTrace: baseGetMetricWithTrace
  } = usePortfolioCalculations({
    allocations: debouncedAllocations,
    investableCapital,
    benchmarkTicker,
    enabled: debouncedAllocations.length > 0,
    includeAIAnalysis: true,
    generateTraces: true
  });
  
  // Update staleness and timestamp when calculation completes
  useEffect(() => {
    if (!isLoading && metrics) {
      setIsStale(false);
      setLastCalculatedAt(new Date());
    }
  }, [isLoading, metrics]);
  
  // Also mark as stale when settings change
  useEffect(() => {
    if (lastCalculatedAt) {
      setIsStale(true);
    }
  }, [investableCapital, benchmarkTicker]);
  
  // Memoized recalculate that also clears stale state
  const recalculate = useCallback(() => {
    // Immediately apply any pending allocations
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      setDebouncedAllocations(allocations);
    }
    baseRecalculate();
  }, [baseRecalculate, allocations]);
  
  // Memoized getMetricWithTrace
  const getMetricWithTrace = useCallback((metricId: string) => {
    return baseGetMetricWithTrace(metricId);
  }, [baseGetMetricWithTrace]);
  
  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo<MetricContextValue>(() => ({
    // Portfolio state
    allocations,
    setAllocations,
    
    // Calculated data
    metrics,
    traces,
    aiAnalysis,
    correlationMatrix,
    portfolioValues,
    portfolioReturns,
    dates,
    
    // Status
    isLoading,
    isError,
    isStale,
    lastCalculatedAt,
    
    // Actions
    recalculate,
    getMetricWithTrace,
    
    // Settings
    investableCapital,
    setInvestableCapital,
    benchmarkTicker,
    setBenchmarkTicker
  }), [
    allocations,
    setAllocations,
    metrics,
    traces,
    aiAnalysis,
    correlationMatrix,
    portfolioValues,
    portfolioReturns,
    dates,
    isLoading,
    isError,
    isStale,
    lastCalculatedAt,
    recalculate,
    getMetricWithTrace,
    investableCapital,
    benchmarkTicker
  ]);
  
  return (
    <MetricContext.Provider value={contextValue}>
      {children}
    </MetricContext.Provider>
  );
}

/**
 * Hook to access MetricContext
 * Throws if used outside of MetricProvider
 */
export function useMetrics(): MetricContextValue {
  const context = useContext(MetricContext);
  
  if (!context) {
    throw new Error('useMetrics must be used within a MetricProvider');
  }
  
  return context;
}

// Export types for consumers
export type { MetricContextValue };
