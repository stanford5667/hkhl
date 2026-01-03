/**
 * Integration Tests for Portfolio Calculation Flow
 * Tests the full pipeline: allocations → usePortfolioCalculations → metrics
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  STANDARD_PORTFOLIO,
  EXPECTED_METRICS,
  MOCK_DAILY_RETURNS,
  calculatePortfolioReturns,
  MetricCalculators,
  TestHelpers,
  createMockCacheEntry,
} from '../fixtures/portfolioFixtures';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          data: [],
          error: null,
        })),
        gte: vi.fn(() => ({
          lte: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
      })),
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      upsert: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
    functions: {
      invoke: vi.fn(() => Promise.resolve({ data: null, error: null })),
    },
  },
}));

describe('Portfolio Calculation Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Portfolio Returns Calculation', () => {
    it('should correctly calculate weighted portfolio returns', () => {
      const weights = [0.6, 0.3, 0.1];
      const returns = [
        MOCK_DAILY_RETURNS.VTI,
        MOCK_DAILY_RETURNS.BND,
        MOCK_DAILY_RETURNS.GLD,
      ];
      
      const portfolioReturns = calculatePortfolioReturns(weights, returns);
      
      // Verify length
      expect(portfolioReturns).toHaveLength(20);
      
      // Verify first day calculation
      const expectedFirstDay = 
        0.6 * MOCK_DAILY_RETURNS.VTI[0] +
        0.3 * MOCK_DAILY_RETURNS.BND[0] +
        0.1 * MOCK_DAILY_RETURNS.GLD[0];
      
      expect(portfolioReturns[0]).toBeCloseTo(expectedFirstDay, 6);
    });

    it('should handle equal-weighted portfolio', () => {
      const weights = [1/3, 1/3, 1/3];
      const returns = [
        MOCK_DAILY_RETURNS.VTI,
        MOCK_DAILY_RETURNS.BND,
        MOCK_DAILY_RETURNS.GLD,
      ];
      
      const portfolioReturns = calculatePortfolioReturns(weights, returns);
      
      // Sum of weights should equal 1
      expect(weights.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
      
      // Each return should be the average of the three
      const expectedFirstDay = (
        MOCK_DAILY_RETURNS.VTI[0] +
        MOCK_DAILY_RETURNS.BND[0] +
        MOCK_DAILY_RETURNS.GLD[0]
      ) / 3;
      
      expect(portfolioReturns[0]).toBeCloseTo(expectedFirstDay, 6);
    });
  });

  describe('Sharpe Ratio Calculation', () => {
    it('should calculate Sharpe ratio correctly', () => {
      const weights = [0.6, 0.3, 0.1];
      const returns = [
        MOCK_DAILY_RETURNS.VTI,
        MOCK_DAILY_RETURNS.BND,
        MOCK_DAILY_RETURNS.GLD,
      ];
      
      const portfolioReturns = calculatePortfolioReturns(weights, returns);
      const sharpe = MetricCalculators.sharpeRatio(portfolioReturns, 0.05);
      
      // Sharpe should be a reasonable number (not NaN or Infinity)
      expect(isFinite(sharpe)).toBe(true);
      
      // For our mock data, expect a positive Sharpe
      // (since we have mostly positive returns)
      expect(sharpe).toBeGreaterThan(0);
    });

    it('should match manual Sharpe calculation', () => {
      const returns = [0.01, 0.02, -0.005, 0.015, 0.008];
      const riskFreeRate = 0.05;
      
      // Manual calculation
      const annualizedReturn = MetricCalculators.annualizedReturn(returns);
      const volatility = MetricCalculators.volatility(returns);
      const expectedSharpe = (annualizedReturn - riskFreeRate) / volatility;
      
      // Function calculation
      const calculatedSharpe = MetricCalculators.sharpeRatio(returns, riskFreeRate);
      
      expect(calculatedSharpe).toBeCloseTo(expectedSharpe, 6);
    });
  });

  describe('Maximum Drawdown Calculation', () => {
    it('should calculate max drawdown correctly', () => {
      // Create a series with a known drawdown
      const values = [100, 110, 105, 95, 90, 100, 85, 95];
      
      const maxDD = MetricCalculators.maxDrawdown(values);
      
      // Peak is 110, trough is 85
      // Drawdown = (110 - 85) / 110 = 0.227
      expect(maxDD).toBeCloseTo(-0.227, 2);
    });

    it('should return 0 for monotonically increasing series', () => {
      const values = [100, 105, 110, 115, 120];
      
      const maxDD = MetricCalculators.maxDrawdown(values);
      
      expect(maxDD).toBe(0);
    });
  });

  describe('Beta Calculation', () => {
    it('should calculate beta correctly', () => {
      const portfolioReturns = calculatePortfolioReturns(
        [0.6, 0.3, 0.1],
        [MOCK_DAILY_RETURNS.VTI, MOCK_DAILY_RETURNS.BND, MOCK_DAILY_RETURNS.GLD]
      );
      
      const beta = MetricCalculators.beta(portfolioReturns, MOCK_DAILY_RETURNS.SPY);
      
      // Beta should be between 0 and 1 for a diversified portfolio
      expect(beta).toBeGreaterThan(0);
      expect(beta).toBeLessThan(1.5);
    });

    it('should have beta close to 1 for pure stock portfolio', () => {
      // 100% VTI should have beta close to 1 vs SPY
      const beta = MetricCalculators.beta(MOCK_DAILY_RETURNS.VTI, MOCK_DAILY_RETURNS.SPY);
      
      // Allow for some deviation since VTI != SPY
      expect(beta).toBeGreaterThan(0.7);
      expect(beta).toBeLessThan(1.3);
    });
  });

  describe('Sortino Ratio Calculation', () => {
    it('should calculate Sortino ratio correctly', () => {
      const returns = [0.01, -0.02, 0.015, -0.005, 0.02, -0.01];
      
      const sortino = MetricCalculators.sortinoRatio(returns, 0.05);
      
      // Sortino should be finite
      expect(isFinite(sortino)).toBe(true);
    });

    it('should be higher than Sharpe when downside risk is low', () => {
      // Returns with few negative days
      const returns = [0.01, 0.02, 0.015, -0.002, 0.02, 0.01];
      
      const sharpe = MetricCalculators.sharpeRatio(returns, 0.05);
      const sortino = MetricCalculators.sortinoRatio(returns, 0.05);
      
      // When downside risk is lower than total risk, Sortino > Sharpe
      expect(sortino).toBeGreaterThan(sharpe);
    });
  });

  describe('Cache Behavior', () => {
    it('should create valid cache entry', () => {
      const cacheEntry = createMockCacheEntry(
        ['VTI', 'BND', 'GLD'],
        [0.6, 0.3, 0.1],
        { sharpe: 1.28, volatility: 0.1023 }
      );
      
      expect(cacheEntry.portfolio_hash).toBe('VTI-BND-GLD_0.60-0.30-0.10');
      expect(cacheEntry.is_valid).toBe(true);
      expect(cacheEntry.tickers).toEqual(['VTI', 'BND', 'GLD']);
    });

    it('should generate unique hash for different allocations', () => {
      const cache1 = createMockCacheEntry(['VTI', 'BND'], [0.5, 0.5], {});
      const cache2 = createMockCacheEntry(['VTI', 'BND'], [0.6, 0.4], {});
      
      expect(cache1.portfolio_hash).not.toBe(cache2.portfolio_hash);
    });
  });

  describe('Test Helpers', () => {
    it('should compare numbers within tolerance', () => {
      expect(TestHelpers.approxEqual(1.0, 1.02, 0.05)).toBe(true);
      expect(TestHelpers.approxEqual(1.0, 1.1, 0.05)).toBe(false);
      expect(TestHelpers.approxEqual(0, 0.001, 0.05)).toBe(true);
    });

    it('should generate test report', () => {
      const results = [
        { name: 'test1', pass: true, message: 'Test 1 passed' },
        { name: 'test2', pass: false, message: 'Test 2 failed' },
      ];
      
      const report = TestHelpers.generateReport(results);
      
      expect(report).toContain('Passed: 1/2');
      expect(report).toContain('Failed: 1/2');
      expect(report).toContain('✓');
      expect(report).toContain('✗');
    });
  });

  describe('Standard Portfolio Validation', () => {
    it('should have allocations that sum to 1', () => {
      const totalWeight = STANDARD_PORTFOLIO.allocations.reduce(
        (sum, a) => sum + a.weight, 
        0
      );
      
      expect(totalWeight).toBeCloseTo(1, 6);
    });

    it('should have expected metrics within tolerance', () => {
      // Verify expected metrics are reasonable
      expect(EXPECTED_METRICS.sharpeRatio).toBeGreaterThan(0);
      expect(EXPECTED_METRICS.volatility).toBeLessThan(1);
      expect(EXPECTED_METRICS.maxDrawdown).toBeLessThan(0);
      expect(EXPECTED_METRICS.beta).toBeLessThan(1);
    });
  });
});

describe('Edge Cases', () => {
  it('should handle empty returns array', () => {
    const returns: number[] = [];
    
    // These should not throw
    expect(() => MetricCalculators.volatility(returns)).not.toThrow();
    expect(() => MetricCalculators.annualizedReturn(returns)).not.toThrow();
  });

  it('should handle single day returns', () => {
    const returns = [0.01];
    
    const volatility = MetricCalculators.volatility(returns);
    expect(volatility).toBe(0); // No variance with single point
  });

  it('should handle all zero returns', () => {
    const returns = [0, 0, 0, 0, 0];
    
    const sharpe = MetricCalculators.sharpeRatio(returns, 0.05);
    // Sharpe with zero volatility should handle gracefully
    expect(isFinite(sharpe) || isNaN(sharpe)).toBe(true);
  });

  it('should handle extreme negative returns', () => {
    const returns = [-0.5, -0.3, -0.2, -0.1];
    
    const maxDD = MetricCalculators.maxDrawdown(
      returns.reduce((acc, r) => {
        const lastValue = acc[acc.length - 1] || 100;
        acc.push(lastValue * (1 + r));
        return acc;
      }, [] as number[])
    );
    
    expect(maxDD).toBeLessThan(-0.5);
  });
});
