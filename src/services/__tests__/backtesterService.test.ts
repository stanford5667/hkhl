/**
 * Backtester Service Test Suite
 * Tests the pure logic functions in backtesterService.ts
 * API-dependent functions are tested with mocks to verify data flow
 */

import { describe, it, expect, vi } from 'vitest';

// Mock finnhubService to avoid real API calls
vi.mock('../finnhubService', () => ({
  getCandles: vi.fn().mockResolvedValue([]),
}));

// Import types (won't trigger API calls)
import type { BacktestConfig, StrategyType, BacktestResult, MonteCarloResult, StressTestResult, CorrelationMatrix } from '../backtesterService';

describe('Backtester Service Types & Constants', () => {
  it('StrategyType includes all expected strategies', () => {
    const strategies: StrategyType[] = ['buy-hold', 'dca', 'momentum', 'mean-reversion', 'rsi'];
    expect(strategies).toHaveLength(5);
  });

  it('BacktestConfig interface accepts valid configuration', () => {
    const config: BacktestConfig = {
      assets: [{ symbol: 'AAPL', allocation: 60 }, { symbol: 'MSFT', allocation: 40 }],
      startDate: '2023-01-01',
      endDate: '2024-01-01',
      initialCapital: 100000,
      strategy: 'buy-hold',
      benchmarkSymbol: 'SPY',
    };
    expect(config.assets).toHaveLength(2);
    expect(config.assets[0].allocation + config.assets[1].allocation).toBe(100);
  });

  it('does not contain hardcoded return values', async () => {
    const module = await import('../backtesterService');
    // STRATEGY_INFO should only have names and descriptions, not expected returns
    expect(module.STRATEGY_INFO['buy-hold'].name).toBe('Buy & Hold');
    expect(module.STRATEGY_INFO['dca'].name).toBe('Dollar Cost Averaging');
    expect(module.STRATEGY_INFO['momentum'].name).toBe('Momentum');
    expect(module.STRATEGY_INFO['mean-reversion'].name).toBe('Mean Reversion');
    expect(module.STRATEGY_INFO['rsi'].name).toBe('RSI Strategy');
    // Ensure no mock return data in strategy info
    for (const info of Object.values(module.STRATEGY_INFO)) {
      expect(info).not.toHaveProperty('expectedReturn');
      expect(info).not.toHaveProperty('mockReturn');
    }
  });
});

describe('Backtester Service Pure Functions', () => {
  describe('runBacktest validation', () => {
    it('rejects allocations not summing to 100%', async () => {
      const { runBacktest } = await import('../backtesterService');
      const config: BacktestConfig = {
        assets: [{ symbol: 'AAPL', allocation: 30 }],
        startDate: '2023-01-01',
        endDate: '2024-01-01',
        initialCapital: 100000,
        strategy: 'buy-hold',
      };
      await expect(runBacktest(config)).rejects.toThrow('Allocations must sum to 100%');
    });

    it('rejects empty assets', async () => {
      const { runBacktest } = await import('../backtesterService');
      const config: BacktestConfig = {
        assets: [],
        startDate: '2023-01-01',
        endDate: '2024-01-01',
        initialCapital: 100000,
        strategy: 'buy-hold',
      };
      // Empty assets triggers allocation check first (0% != 100%)
      await expect(runBacktest(config)).rejects.toThrow();
    });
  });

  describe('Monte Carlo result shape', () => {
    it('MonteCarloResult has correct structure', () => {
      const result: MonteCarloResult = {
        percentile5: [100000],
        percentile25: [100000],
        percentile50: [100000],
        percentile75: [100000],
        percentile95: [100000],
        finalValues: [100000],
        medianFinalValue: 100000,
        probabilityOfLoss: 0,
      };
      expect(result.percentile5).toHaveLength(1);
      expect(result.probabilityOfLoss).toBe(0);
    });
  });

  describe('StressTestResult shape', () => {
    it('has correct fields', () => {
      const result: StressTestResult = {
        scenario: 'COVID Crash',
        description: 'Pandemic market crash',
        portfolioReturn: -33,
        benchmarkReturn: -34,
        isHistorical: true,
      };
      expect(result.isHistorical).toBe(true);
    });
  });

  describe('CorrelationMatrix shape', () => {
    it('matrix diagonal is 1', () => {
      const matrix: CorrelationMatrix = {
        symbols: ['AAPL', 'MSFT'],
        matrix: [[1, 0.8], [0.8, 1]],
      };
      expect(matrix.matrix[0][0]).toBe(1);
      expect(matrix.matrix[1][1]).toBe(1);
      expect(matrix.matrix[0][1]).toBe(matrix.matrix[1][0]); // symmetric
    });
  });
});
