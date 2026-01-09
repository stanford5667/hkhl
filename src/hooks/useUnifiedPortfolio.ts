// Unified Portfolio Hook - Single hook with specialized variants
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  UnifiedPortfolioService,
  UnifiedPosition,
  PortfolioSummary,
  createPortfolioService,
  unifiedToAllocation,
  calculateSummary,
} from '@/services/unifiedPortfolioService';
import type { PortfolioAllocation } from '@/types/portfolio';
import type { PositionFormData } from '@/types/positions';

interface UseUnifiedPortfolioOptions {
  portfolioId?: string | null;
  autoFetch?: boolean;
}

interface UseUnifiedPortfolioReturn {
  // Data
  positions: UnifiedPosition[];
  summary: PortfolioSummary;
  allocations: PortfolioAllocation[];
  tickers: string[];
  tickerWeights: Record<string, number>;
  
  // State
  isLoading: boolean;
  error: string | null;
  
  // Actions
  addPosition: (data: PositionFormData, source?: 'manual' | 'csv' | 'visualizer') => Promise<UnifiedPosition>;
  addPositions: (data: PositionFormData[], source?: 'csv' | 'visualizer') => Promise<UnifiedPosition[]>;
  updatePosition: (id: string, data: Partial<PositionFormData>) => Promise<UnifiedPosition>;
  deletePosition: (id: string) => Promise<void>;
  clearPositions: () => Promise<void>;
  syncFromAllocations: (allocations: PortfolioAllocation[], totalValue: number, clearExisting?: boolean) => Promise<UnifiedPosition[]>;
  refetch: () => Promise<void>;
}

// Main unified hook
export function useUnifiedPortfolio(options: UseUnifiedPortfolioOptions = {}): UseUnifiedPortfolioReturn {
  const { portfolioId, autoFetch = true } = options;
  const { user } = useAuth();
  
  const [positions, setPositions] = useState<UnifiedPosition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Service instance
  const service = useMemo(() => {
    if (!user?.id) return null;
    return createPortfolioService(user.id, portfolioId);
  }, [user?.id, portfolioId]);
  
  // Derived data
  const summary = useMemo(() => calculateSummary(positions), [positions]);
  const allocations = useMemo(() => positions.map(p => unifiedToAllocation(p)), [positions]);
  const tickers = useMemo(() => [...new Set(positions.map(p => p.symbol))], [positions]);
  const tickerWeights = useMemo(() => {
    const result: Record<string, number> = {};
    for (const p of positions) {
      result[p.symbol] = p.weight ?? 0;
    }
    return result;
  }, [positions]);
  
  // Fetch positions
  const fetchPositions = useCallback(async () => {
    if (!service) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await service.getPositions();
      setPositions(data);
    } catch (err) {
      console.error('Error fetching positions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch positions');
    } finally {
      setIsLoading(false);
    }
  }, [service]);
  
  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch) {
      fetchPositions();
    }
  }, [autoFetch, fetchPositions]);
  
  // Add single position
  const addPosition = useCallback(async (
    data: PositionFormData, 
    source: 'manual' | 'csv' | 'visualizer' = 'manual'
  ): Promise<UnifiedPosition> => {
    if (!service) throw new Error('Not authenticated');
    
    try {
      const position = await service.addPosition(data, source);
      setPositions(prev => [...prev, position]);
      toast.success(`Added ${data.symbol}`);
      return position;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add position';
      toast.error(message);
      throw err;
    }
  }, [service]);
  
  // Add multiple positions
  const addPositions = useCallback(async (
    data: PositionFormData[], 
    source: 'csv' | 'visualizer' = 'csv'
  ): Promise<UnifiedPosition[]> => {
    if (!service) throw new Error('Not authenticated');
    
    try {
      const newPositions = await service.addPositions(data, source);
      setPositions(prev => [...prev, ...newPositions]);
      toast.success(`Imported ${newPositions.length} positions`);
      return newPositions;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to import positions';
      toast.error(message);
      throw err;
    }
  }, [service]);
  
  // Update position
  const updatePosition = useCallback(async (
    id: string, 
    data: Partial<PositionFormData>
  ): Promise<UnifiedPosition> => {
    if (!service) throw new Error('Not authenticated');
    
    try {
      const updated = await service.updatePosition(id, data);
      setPositions(prev => prev.map(p => p.id === id ? updated : p));
      toast.success('Position updated');
      return updated;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update position';
      toast.error(message);
      throw err;
    }
  }, [service]);
  
  // Delete position
  const deletePosition = useCallback(async (id: string): Promise<void> => {
    if (!service) throw new Error('Not authenticated');
    
    try {
      await service.deletePosition(id);
      setPositions(prev => prev.filter(p => p.id !== id));
      toast.success('Position removed');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete position';
      toast.error(message);
      throw err;
    }
  }, [service]);
  
  // Clear all positions
  const clearPositions = useCallback(async (): Promise<void> => {
    if (!service) throw new Error('Not authenticated');
    
    try {
      await service.clearPositions();
      setPositions([]);
      toast.success('All positions cleared');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to clear positions';
      toast.error(message);
      throw err;
    }
  }, [service]);
  
  // Sync from allocations
  const syncFromAllocations = useCallback(async (
    allocations: PortfolioAllocation[],
    totalValue: number,
    clearExisting = false
  ): Promise<UnifiedPosition[]> => {
    if (!service) throw new Error('Not authenticated');
    
    try {
      const newPositions = await service.syncFromAllocations(allocations, totalValue, clearExisting);
      if (clearExisting) {
        setPositions(newPositions);
      } else {
        setPositions(prev => [...prev, ...newPositions]);
      }
      toast.success('Portfolio saved to positions');
      return newPositions;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sync positions';
      toast.error(message);
      throw err;
    }
  }, [service]);
  
  return {
    positions,
    summary,
    allocations,
    tickers,
    tickerWeights,
    isLoading,
    error,
    addPosition,
    addPositions,
    updatePosition,
    deletePosition,
    clearPositions,
    syncFromAllocations,
    refetch: fetchPositions,
  };
}

// Visualizer variant - adds saveToPortfolio convenience method
interface UsePortfolioForVisualizerReturn extends UseUnifiedPortfolioReturn {
  saveToPortfolio: (allocations: PortfolioAllocation[], totalValue: number) => Promise<UnifiedPosition[]>;
}

export function usePortfolioForVisualizer(portfolioId?: string | null): UsePortfolioForVisualizerReturn {
  const portfolio = useUnifiedPortfolio({ portfolioId });
  
  const saveToPortfolio = useCallback(async (
    allocations: PortfolioAllocation[],
    totalValue: number
  ): Promise<UnifiedPosition[]> => {
    return portfolio.syncFromAllocations(allocations, totalValue, true);
  }, [portfolio]);
  
  return {
    ...portfolio,
    saveToPortfolio,
  };
}

// Backtest variant - simplified, just tickers and weights
interface UsePortfolioForBacktestReturn {
  tickers: string[];
  tickerWeights: Record<string, number>;
  allocations: PortfolioAllocation[];
  isLoading: boolean;
  positionCount: number;
}

export function usePortfolioForBacktest(portfolioId?: string | null): UsePortfolioForBacktestReturn {
  const { tickers, tickerWeights, allocations, isLoading, positions } = useUnifiedPortfolio({ portfolioId });
  
  return {
    tickers,
    tickerWeights,
    allocations,
    isLoading,
    positionCount: positions.length,
  };
}
