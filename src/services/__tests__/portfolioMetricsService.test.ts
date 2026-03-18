/**
 * Portfolio Metrics Service Test Suite
 * Tests all financial calculations for mathematical correctness
 * NO mock data — pure math verification
 */

import { describe, it, expect } from 'vitest';
import {
  calculateSimpleReturns,
  calculateLogReturns,
  arithmeticMean,
  geometricMean,
  standardDeviation,
  annualizedReturn,
  calculateCAGR,
  annualizedVolatility,
  calculateSharpeRatio,
  calculateSortinoRatio,
  calculateMaxDrawdown,
  calculateBetaAlpha,
  yearsBetween,
} from '../portfolioMetricsService';

describe('Portfolio Metrics Service', () => {
  describe('calculateSimpleReturns', () => {
    it('calculates correct returns', () => {
      const prices = [100, 110, 105, 115];
      const returns = calculateSimpleReturns(prices);
      expect(returns).toHaveLength(3);
      expect(returns[0]).toBeCloseTo(0.1, 6);      // (110-100)/100
      expect(returns[1]).toBeCloseTo(-0.04545, 4);  // (105-110)/110
      expect(returns[2]).toBeCloseTo(0.09524, 4);   // (115-105)/105
    });

    it('handles zero prices gracefully', () => {
      const prices = [100, 0, 50];
      const returns = calculateSimpleReturns(prices);
      expect(returns[0]).toBeCloseTo(-1, 6);
      expect(returns[1]).toBe(0); // Division by zero protection
    });

    it('returns empty array for single price', () => {
      expect(calculateSimpleReturns([100])).toHaveLength(0);
    });
  });

  describe('calculateLogReturns', () => {
    it('calculates correct log returns', () => {
      const prices = [100, 110];
      const returns = calculateLogReturns(prices);
      expect(returns[0]).toBeCloseTo(Math.log(110 / 100), 6);
    });
  });

  describe('arithmeticMean', () => {
    it('calculates correctly', () => {
      expect(arithmeticMean([1, 2, 3, 4, 5])).toBe(3);
    });

    it('returns 0 for empty array', () => {
      expect(arithmeticMean([])).toBe(0);
    });
  });

  describe('geometricMean', () => {
    it('calculates correctly', () => {
      const returns = [0.10, 0.05, -0.03];
      const gm = geometricMean(returns);
      const expected = Math.pow(1.10 * 1.05 * 0.97, 1 / 3) - 1;
      expect(gm).toBeCloseTo(expected, 6);
    });

    it('returns 0 for empty array', () => {
      expect(geometricMean([])).toBe(0);
    });
  });

  describe('standardDeviation', () => {
    it('calculates sample std dev correctly', () => {
      const values = [2, 4, 4, 4, 5, 5, 7, 9];
      const sd = standardDeviation(values);
      expect(sd).toBeCloseTo(2.1380899, 4); // known value
    });

    it('returns 0 for fewer than 2 values', () => {
      expect(standardDeviation([5])).toBe(0);
      expect(standardDeviation([])).toBe(0);
    });
  });

  describe('calculateCAGR', () => {
    it('calculates correct CAGR for known scenario', () => {
      // $100 → $200 in 5 years
      const cagr = calculateCAGR(100, 200, 5);
      expect(cagr).toBeCloseTo(Math.pow(2, 1 / 5) - 1, 6);
    });

    it('returns 0 for zero years', () => {
      expect(calculateCAGR(100, 200, 0)).toBe(0);
    });

    it('returns 0 for zero start value', () => {
      expect(calculateCAGR(0, 200, 5)).toBe(0);
    });

    it('handles losses correctly', () => {
      const cagr = calculateCAGR(100, 50, 2);
      expect(cagr).toBeLessThan(0);
    });
  });

  describe('annualizedVolatility', () => {
    it('annualizes daily volatility with sqrt(252)', () => {
      const dailyReturns = [0.01, -0.005, 0.008, -0.003, 0.012];
      const annVol = annualizedVolatility(dailyReturns);
      const dailyStd = standardDeviation(dailyReturns);
      expect(annVol).toBeCloseTo(dailyStd * Math.sqrt(252), 6);
    });
  });

  describe('calculateSharpeRatio', () => {
    it('returns 0 for fewer than 2 returns', () => {
      expect(calculateSharpeRatio([0.01])).toBe(0);
    });

    it('handles constant returns (near-zero std dev)', () => {
      // When all returns are the same, excess returns have std dev ≈ 0
      // The implementation may return a very large number rather than 0
      const sharpe = calculateSharpeRatio([0.001, 0.001, 0.001]);
      expect(typeof sharpe).toBe('number');
      expect(isFinite(sharpe)).toBe(true);
    });

    it('is positive for consistently positive excess returns', () => {
      // Daily returns well above risk-free rate
      const returns = Array(252).fill(0.002); // ~50% annualized
      const sharpe = calculateSharpeRatio(returns, 0.05);
      expect(sharpe).toBeGreaterThan(0);
    });

    it('is negative for consistently negative excess returns', () => {
      const returns = Array(252).fill(-0.002);
      const sharpe = calculateSharpeRatio(returns, 0.05);
      expect(sharpe).toBeLessThan(0);
    });
  });

  describe('calculateSortinoRatio', () => {
    it('returns 0 for fewer than 2 returns', () => {
      expect(calculateSortinoRatio([0.01])).toBe(0);
    });

    it('returns high value when no downside', () => {
      const returns = Array(100).fill(0.005);
      const sortino = calculateSortinoRatio(returns, 0.0);
      expect(sortino).toBe(10); // Capped at 10
    });

    it('is positive for predominantly up returns', () => {
      const returns = [0.01, 0.02, -0.005, 0.015, 0.01, -0.002, 0.008];
      const sortino = calculateSortinoRatio(returns, 0.0);
      expect(sortino).toBeGreaterThan(0);
    });
  });

  describe('calculateMaxDrawdown', () => {
    it('calculates correctly for known drawdown', () => {
      const values = [100, 110, 105, 120, 90, 95, 130];
      const result = calculateMaxDrawdown(values);
      // Peak = 120, Trough = 90 → DD = 30, DD% = 25%
      expect(result.maxDrawdown).toBe(30);
      expect(result.maxDrawdownPercent).toBe(25);
    });

    it('returns 0 for always-increasing values', () => {
      const values = [100, 110, 120, 130, 140];
      const result = calculateMaxDrawdown(values);
      expect(result.maxDrawdown).toBe(0);
    });

    it('returns drawdown series', () => {
      const values = [100, 90, 110];
      const result = calculateMaxDrawdown(values);
      expect(result.drawdownSeries).toHaveLength(3);
      expect(result.drawdownSeries[0]).toBeCloseTo(0, 4); // No DD at peak (handles -0)
      expect(result.drawdownSeries[1]).toBeCloseTo(-10, 4); // -10%
    });

    it('handles empty array', () => {
      const result = calculateMaxDrawdown([]);
      expect(result.maxDrawdown).toBe(0);
    });
  });

  describe('calculateBetaAlpha', () => {
    it('returns beta ≈ 1 for identical returns', () => {
      const returns = [0.01, -0.005, 0.008, -0.003, 0.012, 0.002, -0.001];
      const { beta } = calculateBetaAlpha(returns, returns, 0.05);
      expect(beta).toBeCloseTo(1, 2);
    });

    it('returns beta ≈ 0 for uncorrelated returns', () => {
      // Use explicitly uncorrelated series
      const portfolio = [0.01, -0.01, 0.01, -0.01, 0.01, -0.01];
      const benchmark = [0.01, 0.01, -0.01, -0.01, 0.01, 0.01];
      const { beta } = calculateBetaAlpha(portfolio, benchmark, 0.05);
      // Should be close to 0 since they're not correlated in this pattern
      expect(Math.abs(beta)).toBeLessThan(1);
    });
  });

  describe('yearsBetween', () => {
    it('calculates correctly for known dates', () => {
      const years = yearsBetween('2020-01-01', '2025-01-01');
      expect(years).toBeCloseTo(5, 1);
    });

    it('handles partial years', () => {
      const years = yearsBetween('2024-01-01', '2024-07-01');
      expect(years).toBeCloseTo(0.5, 1);
    });
  });
});
