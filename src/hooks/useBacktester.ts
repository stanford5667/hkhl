import { useState, useCallback } from 'react';
import {
  runBacktest,
  generateHistoricalData,
  StrategyType,
  StrategyParams,
  BacktestResult,
  HistoricalDataPoint,
} from '@/services/backtesterService';

interface UseBacktesterOptions {
  defaultDays?: number;
  defaultStartPrice?: number;
  defaultVolatility?: number;
}

export function useBacktester(options: UseBacktesterOptions = {}) {
  const {
    defaultDays = 252, // 1 year of trading days
    defaultStartPrice = 100,
    defaultVolatility = 0.02,
  } = options;

  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [historicalData, setHistoricalData] = useState<HistoricalDataPoint[]>([]);
  const [error, setError] = useState<string | null>(null);

  const generateData = useCallback(
    (days: number = defaultDays, startPrice: number = defaultStartPrice, volatility: number = defaultVolatility) => {
      const data = generateHistoricalData(startPrice, days, volatility);
      setHistoricalData(data);
      return data;
    },
    [defaultDays, defaultStartPrice, defaultVolatility]
  );

  const runTest = useCallback(
    async (
      strategy: StrategyType,
      params: StrategyParams,
      data?: HistoricalDataPoint[]
    ): Promise<BacktestResult | null> => {
      setIsRunning(true);
      setError(null);

      try {
        const testData = data || historicalData.length > 0 ? (data || historicalData) : generateData();
        
        // Simulate async operation for UI responsiveness
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const backTestResult = runBacktest(strategy, testData, params);
        setResult(backTestResult);
        return backTestResult;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Backtest failed';
        setError(errorMessage);
        return null;
      } finally {
        setIsRunning(false);
      }
    },
    [historicalData, generateData]
  );

  const compareStrategies = useCallback(
    async (
      strategies: StrategyType[],
      params: StrategyParams,
      data?: HistoricalDataPoint[]
    ): Promise<BacktestResult[]> => {
      setIsRunning(true);
      setError(null);

      try {
        const testData = data || historicalData.length > 0 ? (data || historicalData) : generateData();
        
        const results: BacktestResult[] = [];
        for (const strategy of strategies) {
          await new Promise(resolve => setTimeout(resolve, 50));
          results.push(runBacktest(strategy, testData, params));
        }
        
        return results;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Strategy comparison failed';
        setError(errorMessage);
        return [];
      } finally {
        setIsRunning(false);
      }
    },
    [historicalData, generateData]
  );

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setHistoricalData([]);
  }, []);

  return {
    isRunning,
    result,
    historicalData,
    error,
    generateData,
    runTest,
    compareStrategies,
    reset,
  };
}
