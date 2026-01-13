// Stress Test Service - Thin Client Wrapper
// All proprietary algorithms run server-side

import { supabase } from '@/integrations/supabase/client';
import { polygonData } from './polygonDataHandler';

export interface StressTestPeriod {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  marketDrawdown: number;
}

export interface StressTestResult {
  period: StressTestPeriod;
  portfolioDrawdown: number;
  portfolioReturn: number;
  dollarLoss: number;
  recoveryDays: number | null;
  assetBreakdown: Map<string, { drawdown: number; return: number }>;
}

export interface LiquidityRiskResult {
  ticker: string;
  maxHistoricalDrawdown: number;
  isLiquidityRisk: boolean;
  reason: string;
}

// Historical stress test periods (kept for reference)
export const STRESS_TEST_PERIODS: StressTestPeriod[] = [
  {
    id: 'covid-2020',
    name: 'COVID Crash (2020)',
    description: 'Rapid market selloff followed by V-shaped recovery',
    startDate: '2020-02-19',
    endDate: '2020-03-23',
    marketDrawdown: -33.9,
  },
  {
    id: 'bear-2022',
    name: '2022 Bear Market',
    description: 'Rate hikes caused prolonged decline in growth stocks',
    startDate: '2022-01-03',
    endDate: '2022-10-12',
    marketDrawdown: -25.4,
  },
  {
    id: 'normal',
    name: 'Normal Market',
    description: 'Average market conditions (last 12 months)',
    startDate: '',
    endDate: '',
    marketDrawdown: 0,
  },
];

/**
 * Fetch historical data and run stress test via edge function
 */
export async function runStressTest(
  allocations: Map<string, number>,
  period: StressTestPeriod,
  investableCapital: number
): Promise<StressTestResult> {
  const tickers = Array.from(allocations.keys());
  
  let startDate = period.startDate;
  let endDate = period.endDate;
  
  if (period.id === 'normal') {
    const now = new Date();
    endDate = now.toISOString().split('T')[0];
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    startDate = oneYearAgo.toISOString().split('T')[0];
  }

  // Fetch historical data client-side (for caching)
  const historicalData: Record<string, { date: string; close: number }[]> = {};
  
  for (const ticker of tickers) {
    try {
      const { bars } = await polygonData.fetchHistory(ticker, startDate, endDate);
      historicalData[ticker] = bars.map(b => ({ 
        date: new Date(b.timestamp).toISOString().split('T')[0], 
        close: b.close 
      }));
    } catch (error) {
      console.warn(`[StressTest] Failed to fetch ${ticker}:`, error);
      historicalData[ticker] = [];
    }
  }

  // Call edge function for proprietary stress test logic
  const { data, error } = await supabase.functions.invoke('stress-test', {
    body: {
      action: 'runStressTest',
      allocations: Object.fromEntries(allocations),
      historicalData,
      period,
      investableCapital
    }
  });

  if (error) {
    console.error('[StressTest] Edge function error:', error);
    return {
      period,
      portfolioDrawdown: 0,
      portfolioReturn: 0,
      dollarLoss: 0,
      recoveryDays: null,
      assetBreakdown: new Map()
    };
  }

  // Convert response back to client format
  return {
    ...data,
    assetBreakdown: new Map(Object.entries(data.assetBreakdown || {}))
  };
}

/**
 * Check liquidity risks via edge function
 */
export async function checkLiquidityRisks(
  tickers: string[],
  timeHorizonYears: number,
  drawdownThreshold: number = 20
): Promise<LiquidityRiskResult[]> {
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 730 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Fetch historical data client-side
  const historicalData: Record<string, { date: string; close: number }[]> = {};
  
  for (const ticker of tickers) {
    try {
      const { bars } = await polygonData.fetchHistory(ticker, startDate, endDate);
      historicalData[ticker] = bars.map(b => ({ 
        date: new Date(b.timestamp).toISOString().split('T')[0], 
        close: b.close 
      }));
    } catch (error) {
      console.warn(`[LiquidityCheck] Failed to fetch ${ticker}:`, error);
      historicalData[ticker] = [];
    }
  }

  const { data, error } = await supabase.functions.invoke('stress-test', {
    body: {
      action: 'checkLiquidityRisks',
      historicalData,
      tickers,
      timeHorizonYears,
      drawdownThreshold
    }
  });

  if (error) {
    console.error('[LiquidityCheck] Edge function error:', error);
    return tickers.map(ticker => ({
      ticker,
      maxHistoricalDrawdown: 0,
      isLiquidityRisk: false,
      reason: 'Error fetching data'
    }));
  }

  return data.results;
}

/**
 * Run all stress tests via edge function
 */
export async function runAllStressTests(
  allocations: Map<string, number>,
  investableCapital: number
): Promise<StressTestResult[]> {
  const results: StressTestResult[] = [];
  
  for (const period of STRESS_TEST_PERIODS) {
    const result = await runStressTest(allocations, period, investableCapital);
    results.push(result);
  }
  
  return results;
}
