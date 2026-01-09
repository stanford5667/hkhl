import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getCachedQuotes } from '@/services/quoteCacheService';
import { format, subDays, parseISO } from 'date-fns';

export interface ChartDataPoint {
  date: string;
  public_equity: number;
  private_equity: number;
  real_estate: number;
  credit: number;
  other: number;
  total: number;
}

export interface PortfolioAllocationInput {
  symbol: string;
  weight: number;
  assetClass?: string;
  name?: string;
}

export interface AssetClassData {
  value: number;
  costBasis: number;
  todayChange: number;
  holdings: number;
}

export interface PortfolioPerformanceData {
  totalValue: number;
  totalCostBasis: number;
  todayChange: number;
  todayChangePercent: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  byAssetClass: Record<string, AssetClassData>;
  chartData: ChartDataPoint[];
  periodReturn: number;
  periodReturnPercent: number;
  isLoading: boolean;
  hasHistory: boolean;
  positionCount: number;
  refresh: () => Promise<void>;
  generateDemoHistory: () => void;
}

interface UsePortfolioPerformanceOptions {
  days?: number;
  portfolioId?: string | null;
  allocations?: PortfolioAllocationInput[];
}

interface PositionData {
  id: string;
  symbol: string;
  name: string | null;
  quantity: number;
  cost_basis: number | null;
  cost_per_share: number | null;
  current_price: number | null;
  current_value: number | null;
  asset_type: string;
  last_price_update: string | null;
}

interface HistorySnapshot {
  date: string;
  totalValue: number;
  byAssetClass: Record<string, number>;
}

const HISTORY_KEY_PREFIX = 'portfolio-perf-history';
const MAX_HISTORY_DAYS = 365;

function getHistoryKey(portfolioId?: string | null): string {
  return portfolioId ? `${HISTORY_KEY_PREFIX}-${portfolioId}` : HISTORY_KEY_PREFIX;
}

function getStoredHistory(portfolioId?: string | null): HistorySnapshot[] {
  try {
    const key = getHistoryKey(portfolioId);
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function storeSnapshot(snapshot: HistorySnapshot, portfolioId?: string | null) {
  try {
    const key = getHistoryKey(portfolioId);
    let history = getStoredHistory(portfolioId);
    const existingIndex = history.findIndex(h => h.date === snapshot.date);
    
    if (existingIndex >= 0) {
      history[existingIndex] = snapshot;
    } else {
      history.push(snapshot);
    }
    
    history.sort((a, b) => a.date.localeCompare(b.date));
    if (history.length > MAX_HISTORY_DAYS) {
      history = history.slice(-MAX_HISTORY_DAYS);
    }
    
    localStorage.setItem(key, JSON.stringify(history));
  } catch (e) {
    console.warn('[usePortfolioPerformance] Failed to store snapshot:', e);
  }
}

function mapAssetType(assetType: string): string {
  switch (assetType) {
    case 'stock':
    case 'etf':
      return 'public_equity';
    case 'bond':
      return 'credit';
    case 'crypto':
    case 'other':
      return 'other';
    case 'real_estate':
      return 'real_estate';
    case 'private':
      return 'private_equity';
    default:
      return 'public_equity';
  }
}

export function usePortfolioPerformance(
  optionsOrDays: number | UsePortfolioPerformanceOptions = 30
): PortfolioPerformanceData {
  const options: UsePortfolioPerformanceOptions = typeof optionsOrDays === 'number' 
    ? { days: optionsOrDays } 
    : optionsOrDays;
  
  const { days = 30, portfolioId } = options;
  const { user } = useAuth();
  
  const [positions, setPositions] = useState<PositionData[]>([]);
  const [liveQuotes, setLiveQuotes] = useState<Map<string, { price: number; change: number; changePercent: number }>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [history, setHistory] = useState<HistorySnapshot[]>([]);

  // Fetch positions from synced_positions table
  const fetchPositions = useCallback(async () => {
    if (!user?.id) {
      setPositions([]);
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    try {
      let query = supabase
        .from('synced_positions')
        .select('*')
        .eq('user_id', user.id);
      
      // If portfolioId is specified, filter by it
      // Otherwise, get ALL positions for this user (including those without portfolio_id)
      if (portfolioId) {
        query = query.eq('portfolio_id', portfolioId);
      }
      // If no portfolioId filter, we get all user positions
      
      const { data, error } = await query;
      if (error) throw error;
      
      console.log('[usePortfolioPerformance] Fetched positions:', data?.length, 'portfolioId:', portfolioId);
      setPositions((data || []) as PositionData[]);
    } catch (err) {
      console.error('[usePortfolioPerformance] Error fetching positions:', err);
      setPositions([]);
    }
  }, [user?.id, portfolioId]);

  // Fetch live quotes for positions
  const fetchQuotes = useCallback(async (symbols: string[]) => {
    if (symbols.length === 0) return;
    
    try {
      const quotes = await getCachedQuotes(symbols);
      setLiveQuotes(quotes);
    } catch (err) {
      console.error('[usePortfolioPerformance] Error fetching quotes:', err);
    }
  }, []);

  // Initial data load
  useEffect(() => {
    fetchPositions();
    setHistory(getStoredHistory(portfolioId));
  }, [fetchPositions, portfolioId]);

  // Fetch quotes when positions change
  useEffect(() => {
    const symbols = positions
      .filter(p => ['stock', 'etf'].includes(p.asset_type))
      .map(p => p.symbol.toUpperCase());
    
    if (symbols.length > 0) {
      fetchQuotes([...new Set(symbols)]);
    }
    setIsLoading(false);
  }, [positions, fetchQuotes]);

  // Calculate all metrics from positions + quotes
  const metrics = useMemo(() => {
    const byAssetClass: Record<string, AssetClassData> = {
      public_equity: { value: 0, costBasis: 0, todayChange: 0, holdings: 0 },
      private_equity: { value: 0, costBasis: 0, todayChange: 0, holdings: 0 },
      real_estate: { value: 0, costBasis: 0, todayChange: 0, holdings: 0 },
      credit: { value: 0, costBasis: 0, todayChange: 0, holdings: 0 },
      other: { value: 0, costBasis: 0, todayChange: 0, holdings: 0 },
    };

    let totalValue = 0;
    let totalCostBasis = 0;
    let totalTodayChange = 0;

    positions.forEach(pos => {
      const assetClass = mapAssetType(pos.asset_type);
      const quote = liveQuotes.get(pos.symbol.toUpperCase());
      
      const price = quote?.price ?? pos.current_price ?? 0;
      const dailyChange = quote?.change ?? 0;
      const value = pos.quantity * price;
      const costBasis = pos.cost_basis ?? (pos.cost_per_share ? pos.cost_per_share * pos.quantity : 0);
      const todayChange = pos.quantity * dailyChange;

      byAssetClass[assetClass].value += value;
      byAssetClass[assetClass].costBasis += costBasis;
      byAssetClass[assetClass].todayChange += todayChange;
      byAssetClass[assetClass].holdings += 1;

      totalValue += value;
      totalCostBasis += costBasis;
      totalTodayChange += todayChange;
    });

    const totalGainLoss = totalValue - totalCostBasis;
    const totalGainLossPercent = totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0;
    const previousValue = totalValue - totalTodayChange;
    const todayChangePercent = previousValue > 0 ? (totalTodayChange / previousValue) * 100 : 0;

    return {
      totalValue,
      totalCostBasis,
      todayChange: totalTodayChange,
      todayChangePercent,
      totalGainLoss,
      totalGainLossPercent,
      byAssetClass,
    };
  }, [positions, liveQuotes]);

  // Store today's snapshot whenever metrics change
  useEffect(() => {
    if (metrics.totalValue > 0) {
      const today = new Date().toISOString().split('T')[0];
      const snapshot: HistorySnapshot = {
        date: today,
        totalValue: metrics.totalValue,
        byAssetClass: Object.fromEntries(
          Object.entries(metrics.byAssetClass).map(([k, v]) => [k, v.value])
        ),
      };
      storeSnapshot(snapshot, portfolioId);
      setHistory(getStoredHistory(portfolioId));
    }
  }, [metrics.totalValue, portfolioId]);

  // Build chart data from history
  const chartData = useMemo<ChartDataPoint[]>(() => {
    if (history.length === 0) {
      // Show current state as single point
      const today = format(new Date(), 'MMM d');
      return [{
        date: today,
        public_equity: metrics.byAssetClass.public_equity?.value || 0,
        private_equity: metrics.byAssetClass.private_equity?.value || 0,
        real_estate: metrics.byAssetClass.real_estate?.value || 0,
        credit: metrics.byAssetClass.credit?.value || 0,
        other: metrics.byAssetClass.other?.value || 0,
        total: metrics.totalValue,
      }];
    }

    const cutoffDate = subDays(new Date(), days);
    const filtered = history.filter(h => parseISO(h.date) >= cutoffDate);

    return filtered.map(h => ({
      date: format(parseISO(h.date), 'MMM d'),
      public_equity: h.byAssetClass.public_equity || 0,
      private_equity: h.byAssetClass.private_equity || 0,
      real_estate: h.byAssetClass.real_estate || 0,
      credit: h.byAssetClass.credit || 0,
      other: h.byAssetClass.other || 0,
      total: h.totalValue,
    }));
  }, [history, days, metrics]);

  // Calculate period return
  const { periodReturn, periodReturnPercent } = useMemo(() => {
    if (chartData.length < 2) {
      return { periodReturn: 0, periodReturnPercent: 0 };
    }
    const startValue = chartData[0].total;
    const endValue = chartData[chartData.length - 1].total;
    const periodReturn = endValue - startValue;
    const periodReturnPercent = startValue > 0 ? (periodReturn / startValue) * 100 : 0;
    return { periodReturn, periodReturnPercent };
  }, [chartData]);

  // Refresh action
  const refresh = useCallback(async () => {
    setIsLoading(true);
    await fetchPositions();
    const symbols = positions
      .filter(p => ['stock', 'etf'].includes(p.asset_type))
      .map(p => p.symbol.toUpperCase());
    if (symbols.length > 0) {
      await fetchQuotes([...new Set(symbols)]);
    }
    setIsLoading(false);
  }, [fetchPositions, fetchQuotes, positions]);

  // Generate demo history
  const handleGenerateDemoHistory = useCallback(() => {
    const today = new Date();
    const demoHistory: HistorySnapshot[] = [];
    
    for (let i = 90; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      
      const progress = (90 - i) / 90;
      const baseVariance = 0.15;
      const variance = (1 - baseVariance) + (baseVariance * progress) + (Math.random() - 0.5) * 0.02;
      
      demoHistory.push({
        date: dateString,
        totalValue: metrics.totalValue * variance,
        byAssetClass: {
          public_equity: (metrics.byAssetClass.public_equity?.value || 0) * variance,
          private_equity: (metrics.byAssetClass.private_equity?.value || 0) * (0.98 + Math.random() * 0.04),
          real_estate: (metrics.byAssetClass.real_estate?.value || 0) * (0.99 + Math.random() * 0.02),
          credit: (metrics.byAssetClass.credit?.value || 0) * (0.995 + Math.random() * 0.01),
          other: (metrics.byAssetClass.other?.value || 0) * (0.98 + Math.random() * 0.04),
        },
      });
    }
    
    const key = getHistoryKey(portfolioId);
    localStorage.setItem(key, JSON.stringify(demoHistory));
    setHistory(demoHistory);
  }, [metrics, portfolioId]);

  return {
    ...metrics,
    chartData,
    periodReturn,
    periodReturnPercent,
    isLoading,
    hasHistory: history.length > 1,
    positionCount: positions.length,
    refresh,
    generateDemoHistory: handleGenerateDemoHistory,
  };
}
