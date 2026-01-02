import { useState, useCallback } from 'react';
import {
  runBacktest,
  fetchHistoricalPrices,
  StrategyType,
  BacktestResult,
  BacktestConfig,
  MonteCarloResult,
  StressTestResult,
  CorrelationMatrix,
  runMonteCarloSimulation,
  runStressTests,
  calculateCorrelationMatrix,
} from '@/services/backtesterService';

interface UseBacktesterOptions {
  defaultBenchmark?: string;
}

export interface BacktestAsset {
  symbol: string;
  allocation: number;
}

export function useBacktester(options: UseBacktesterOptions = {}) {
  const { defaultBenchmark = 'SPY' } = options;

  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [monteCarloResult, setMonteCarloResult] = useState<MonteCarloResult | null>(null);
  const [stressTestResults, setStressTestResults] = useState<StressTestResult[]>([]);
  const [correlationMatrix, setCorrelationMatrix] = useState<CorrelationMatrix | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>('');

  const runTest = useCallback(
    async (
      assets: BacktestAsset[],
      startDate: string,
      endDate: string,
      initialCapital: number,
      strategy: StrategyType = 'buy-hold'
    ): Promise<BacktestResult | null> => {
      setIsRunning(true);
      setError(null);
      setProgress('Fetching historical data...');

      try {
        const config: BacktestConfig = {
          assets,
          startDate,
          endDate,
          initialCapital,
          strategy,
          benchmarkSymbol: defaultBenchmark,
        };

        setProgress('Running backtest...');
        const backTestResult = await runBacktest(config);
        setResult(backTestResult);
        setProgress('');
        return backTestResult;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Backtest failed';
        setError(errorMessage);
        setProgress('');
        return null;
      } finally {
        setIsRunning(false);
      }
    },
    [defaultBenchmark]
  );

  const runMonteCarlo = useCallback(
    async (
      assets: BacktestAsset[],
      initialCapital: number,
      projectionYears: number = 5,
      numSimulations: number = 1000
    ): Promise<MonteCarloResult | null> => {
      setIsRunning(true);
      setError(null);
      setProgress('Running Monte Carlo simulation...');

      try {
        const config: BacktestConfig = {
          assets,
          startDate: '', // Will be set by the function
          endDate: '',
          initialCapital,
          strategy: 'buy-hold',
          benchmarkSymbol: defaultBenchmark,
        };

        const mcResult = await runMonteCarloSimulation(config, numSimulations, projectionYears);
        setMonteCarloResult(mcResult);
        setProgress('');
        return mcResult;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Monte Carlo simulation failed';
        setError(errorMessage);
        setProgress('');
        return null;
      } finally {
        setIsRunning(false);
      }
    },
    [defaultBenchmark]
  );

  const runStress = useCallback(
    async (
      assets: BacktestAsset[],
      initialCapital: number
    ): Promise<StressTestResult[]> => {
      setIsRunning(true);
      setError(null);
      setProgress('Running stress tests...');

      try {
        const config: BacktestConfig = {
          assets,
          startDate: '',
          endDate: '',
          initialCapital,
          strategy: 'buy-hold',
          benchmarkSymbol: defaultBenchmark,
        };

        const results = await runStressTests(config);
        setStressTestResults(results);
        setProgress('');
        return results;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Stress tests failed';
        setError(errorMessage);
        setProgress('');
        return [];
      } finally {
        setIsRunning(false);
      }
    },
    [defaultBenchmark]
  );

  const calculateCorrelations = useCallback(
    async (
      symbols: string[],
      startDate: string,
      endDate: string
    ): Promise<CorrelationMatrix | null> => {
      setIsRunning(true);
      setError(null);
      setProgress('Calculating correlations...');

      try {
        const matrix = await calculateCorrelationMatrix(symbols, startDate, endDate);
        setCorrelationMatrix(matrix);
        setProgress('');
        return matrix;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Correlation calculation failed';
        setError(errorMessage);
        setProgress('');
        return null;
      } finally {
        setIsRunning(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setResult(null);
    setMonteCarloResult(null);
    setStressTestResults([]);
    setCorrelationMatrix(null);
    setError(null);
    setProgress('');
  }, []);

  return {
    isRunning,
    result,
    monteCarloResult,
    stressTestResults,
    correlationMatrix,
    error,
    progress,
    runTest,
    runMonteCarlo,
    runStress,
    calculateCorrelations,
    reset,
  };
}
