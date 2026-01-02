import { useState, useEffect, useCallback, useMemo } from 'react';
import { useUnifiedData, type Company } from '@/contexts/UnifiedDataContext';
import { 
  calculatePortfolioPerformance, 
  generateDemoHistory,
  getPortfolioHistory,
  type PortfolioPerformanceResult,
  type PortfolioSnapshot,
  type AssetClassData,
} from '@/services/portfolioPerformanceService';
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

export interface PortfolioPerformanceData {
  // Current values
  totalValue: number;
  totalCostBasis: number;
  todayChange: number;
  todayChangePercent: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  
  // By asset class
  byAssetClass: Record<string, AssetClassData>;
  
  // Chart data
  chartData: ChartDataPoint[];
  
  // Period return (e.g., 30-day return)
  periodReturn: number;
  periodReturnPercent: number;
  
  // State
  isLoading: boolean;
  hasHistory: boolean;
  
  // Actions
  refresh: () => Promise<void>;
  generateDemoHistory: () => void;
}

/**
 * Hook for portfolio performance data with live prices
 * @param days Number of days to show in chart (default 30)
 */
export function usePortfolioPerformance(days: number = 30): PortfolioPerformanceData {
  const { companies, isLoading: dataLoading } = useUnifiedData();
  const [performance, setPerformance] = useState<PortfolioPerformanceResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Convert companies to holdings format
  const holdings = useMemo(() => {
    return companies.map(c => ({
      id: c.id,
      name: c.name,
      asset_class: c.asset_class,
      ticker_symbol: c.ticker_symbol,
      shares_owned: c.shares_owned,
      cost_basis: c.cost_basis,
      market_value: c.market_value,
      current_price: c.current_price,
      revenue_ltm: c.revenue_ltm,
      ebitda_ltm: c.ebitda_ltm,
      company_type: c.company_type,
    }));
  }, [companies]);

  // Fetch performance data
  const refresh = useCallback(async () => {
    if (holdings.length === 0) {
      setPerformance({
        totalValue: 0,
        totalCostBasis: 0,
        todayChange: 0,
        totalGainLoss: 0,
        totalGainLossPercent: 0,
        todayChangePercent: 0,
        byAssetClass: {
          public_equity: { value: 0, costBasis: 0, todayChange: 0, holdings: 0 },
          private_equity: { value: 0, costBasis: 0, todayChange: 0, holdings: 0 },
          real_estate: { value: 0, costBasis: 0, todayChange: 0, holdings: 0 },
          credit: { value: 0, costBasis: 0, todayChange: 0, holdings: 0 },
          other: { value: 0, costBasis: 0, todayChange: 0, holdings: 0 },
        },
        history: [],
      });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const result = await calculatePortfolioPerformance(holdings);
      setPerformance(result);
    } catch (e) {
      console.error('[usePortfolioPerformance] Error calculating performance:', e);
    } finally {
      setIsLoading(false);
    }
  }, [holdings]);

  // Initial load
  useEffect(() => {
    if (!dataLoading) {
      refresh();
    }
  }, [dataLoading, refresh]);

  // Generate demo history
  const handleGenerateDemoHistory = useCallback(() => {
    if (!performance) return;
    
    const byAssetClass: Record<string, number> = {};
    Object.entries(performance.byAssetClass).forEach(([key, data]) => {
      byAssetClass[key] = data.value;
    });
    
    const demoHistory = generateDemoHistory(performance.totalValue, byAssetClass);
    setPerformance(prev => prev ? { ...prev, history: demoHistory } : prev);
  }, [performance]);

  // Build chart data from history
  const chartData = useMemo<ChartDataPoint[]>(() => {
    if (!performance) return [];
    
    const history = performance.history;
    if (history.length === 0) {
      // No history, just show today's value
      const today = format(new Date(), 'MMM d');
      return [{
        date: today,
        public_equity: performance.byAssetClass.public_equity?.value || 0,
        private_equity: performance.byAssetClass.private_equity?.value || 0,
        real_estate: performance.byAssetClass.real_estate?.value || 0,
        credit: performance.byAssetClass.credit?.value || 0,
        other: performance.byAssetClass.other?.value || 0,
        total: performance.totalValue,
      }];
    }

    // Filter to requested days
    const cutoffDate = subDays(new Date(), days);
    const filteredHistory = history.filter(h => {
      const date = parseISO(h.date);
      return date >= cutoffDate;
    });

    return filteredHistory.map(h => ({
      date: format(parseISO(h.date), 'MMM d'),
      public_equity: h.byAssetClass.public_equity || 0,
      private_equity: h.byAssetClass.private_equity || 0,
      real_estate: h.byAssetClass.real_estate || 0,
      credit: h.byAssetClass.credit || 0,
      other: h.byAssetClass.other || 0,
      total: h.totalValue,
    }));
  }, [performance, days]);

  // Calculate period return
  const { periodReturn, periodReturnPercent } = useMemo(() => {
    if (!performance || chartData.length < 2) {
      return { periodReturn: 0, periodReturnPercent: 0 };
    }

    const startValue = chartData[0].total;
    const endValue = chartData[chartData.length - 1].total;
    const periodReturn = endValue - startValue;
    const periodReturnPercent = startValue > 0 ? (periodReturn / startValue) * 100 : 0;

    return { periodReturn, periodReturnPercent };
  }, [chartData, performance]);

  return {
    totalValue: performance?.totalValue || 0,
    totalCostBasis: performance?.totalCostBasis || 0,
    todayChange: performance?.todayChange || 0,
    todayChangePercent: performance?.todayChangePercent || 0,
    totalGainLoss: performance?.totalGainLoss || 0,
    totalGainLossPercent: performance?.totalGainLossPercent || 0,
    byAssetClass: performance?.byAssetClass || {},
    chartData,
    periodReturn,
    periodReturnPercent,
    isLoading: isLoading || dataLoading,
    hasHistory: (performance?.history.length || 0) > 1,
    refresh,
    generateDemoHistory: handleGenerateDemoHistory,
  };
}
