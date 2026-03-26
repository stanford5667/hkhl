/**
 * useAssetMetrics - Fetches backtest/performance metrics for a single ticker
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AssetMetrics {
  totalReturn: number;
  cagr: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  volatility: number;
  beta: number;
  alpha: number;
  var95: number;
  cvar95: number;
  bestMonth: number;
  worstMonth: number;
  positiveMonths: number;
  avgMonthlyReturn: number;
}

type Period = '1Y' | '3Y' | '5Y' | 'MAX';

export function useAssetMetrics(ticker: string | undefined, period: Period = '3Y') {
  return useQuery<AssetMetrics | null>({
    queryKey: ['asset-metrics', ticker, period],
    queryFn: async () => {
      if (!ticker) return null;

      // Get date range based on period
      const endDate = new Date();
      const startDate = new Date();
      switch (period) {
        case '1Y': startDate.setFullYear(endDate.getFullYear() - 1); break;
        case '3Y': startDate.setFullYear(endDate.getFullYear() - 3); break;
        case '5Y': startDate.setFullYear(endDate.getFullYear() - 5); break;
        case 'MAX': startDate.setFullYear(endDate.getFullYear() - 20); break;
      }

      // Fetch from market_daily_bars
      const { data: bars, error } = await supabase
        .from('market_daily_bars')
        .select('bar_date, close, daily_return')
        .eq('ticker', ticker)
        .gte('bar_date', startDate.toISOString().split('T')[0])
        .lte('bar_date', endDate.toISOString().split('T')[0])
        .order('bar_date', { ascending: true });

      if (error) throw error;

      if (!bars || bars.length < 20) return null;

      const returns = bars
        .filter(b => b.daily_return !== null)
        .map(b => b.daily_return as number);

      if (returns.length < 20) return null;

      // Import calculation functions
      const { 
        calculateSharpeRatio, 
        calculateSortinoRatio, 
        calculateMaxDrawdown,
        calculateBetaAlpha,
        arithmeticMean,
        standardDeviation
      } = await import('@/services/portfolioMetricsService');

      // Build portfolio values from returns
      const portfolioValues: number[] = [10000];
      for (const r of returns) {
        portfolioValues.push(portfolioValues[portfolioValues.length - 1] * (1 + r));
      }

      const startValue = portfolioValues[0];
      const endValue = portfolioValues[portfolioValues.length - 1];
      const totalReturn = ((endValue - startValue) / startValue) * 100;
      
      const years = returns.length / 252;
      const cagr = years > 0 ? (Math.pow(endValue / startValue, 1 / years) - 1) * 100 : 0;
      
      // Fetch benchmark (SPY) for beta/alpha
      const { data: spyBars } = await supabase
        .from('market_daily_bars')
        .select('bar_date, daily_return')
        .eq('ticker', 'SPY')
        .gte('bar_date', startDate.toISOString().split('T')[0])
        .lte('bar_date', endDate.toISOString().split('T')[0])
        .order('bar_date', { ascending: true });

      let beta = 1;
      let alpha = 0;
      
      if (spyBars && spyBars.length > 0) {
        const benchmarkReturns = spyBars
          .filter(b => b.daily_return !== null)
          .map(b => b.daily_return as number);
        
        const minLen = Math.min(returns.length, benchmarkReturns.length);
        if (minLen > 20) {
          const result = calculateBetaAlpha(
            returns.slice(0, minLen),
            benchmarkReturns.slice(0, minLen)
          );
          beta = result.beta;
          alpha = result.alpha;
        }
      }

      // Monthly aggregation
      const monthlyReturns: number[] = [];
      for (let i = 0; i < returns.length; i += 21) {
        const monthSlice = returns.slice(i, Math.min(i + 21, returns.length));
        if (monthSlice.length > 0) {
          const monthReturn = monthSlice.reduce((acc, r) => acc * (1 + r), 1) - 1;
          monthlyReturns.push(monthReturn);
        }
      }

      const sharpe = calculateSharpeRatio(returns);
      const sortino = calculateSortinoRatio(returns);
      const { maxDrawdownPercent } = calculateMaxDrawdown(portfolioValues);
      const volatility = standardDeviation(returns) * Math.sqrt(252) * 100;

      // VaR/CVaR calculations
      const sortedReturns = [...returns].sort((a, b) => a - b);
      const var95Index = Math.floor(returns.length * 0.05);
      const var95 = Math.abs(sortedReturns[var95Index] || 0) * 100;
      const cvar95Returns = sortedReturns.slice(0, var95Index);
      const cvar95 = cvar95Returns.length > 0 
        ? Math.abs(arithmeticMean(cvar95Returns)) * 100 
        : var95;

      return {
        totalReturn,
        cagr,
        sharpeRatio: sharpe,
        sortinoRatio: sortino,
        maxDrawdown: maxDrawdownPercent,
        volatility,
        beta,
        alpha: alpha * 100,
        var95,
        cvar95,
        bestMonth: monthlyReturns.length > 0 ? Math.max(...monthlyReturns) * 100 : 0,
        worstMonth: monthlyReturns.length > 0 ? Math.min(...monthlyReturns) * 100 : 0,
        positiveMonths: monthlyReturns.length > 0 
          ? (monthlyReturns.filter(r => r > 0).length / monthlyReturns.length) * 100 
          : 50,
        avgMonthlyReturn: monthlyReturns.length > 0 ? arithmeticMean(monthlyReturns) * 100 : 0,
      };
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!ticker,
  });
}
