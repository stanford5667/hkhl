/**
 * Backtesting Validation Test Suite
 * Tests every validation rule for backtest requests
 */

import { describe, it, expect } from 'vitest';
import { validateBacktestRequest, formatValidationErrors } from '../validation';
import { BacktestRequest, PREBUILT_STRATEGIES } from '../types';

function makeValidRequest(overrides: Partial<BacktestRequest> = {}): BacktestRequest {
  return {
    ticker: 'AAPL',
    strategy: {
      type: 'prebuilt',
      prebuilt: {
        id: 'rsi_oversold_bounce',
        name: 'RSI Oversold Bounce',
        description: 'Buy when RSI < 30',
        category: 'reversal',
        riskLevel: 'moderate',
        parameters: {},
        defaultParameters: { rsiPeriod: 14, rsiOversold: 30, rsiOverbought: 50 },
      },
    },
    config: {
      startDate: '2023-01-01',
      endDate: '2024-01-01',
      startingCapital: 10000,
      positionSizing: { method: 'percent-portfolio', value: 10 },
      riskManagement: {},
      tradingRules: {
        commission: 1,
        slippage: 0.1,
        fillAssumptions: {
          marketOrders: 'next-bar-open',
          limitOrders: 'if-price-reached',
          stopOrders: 'when-triggered',
        },
        tradeDuringMarketHoursOnly: true,
        allowShortSelling: false,
      },
      dataFrequency: 'daily',
    },
    organizationId: 'org-123',
    userId: 'user-456',
    ...overrides,
  };
}

describe('validateBacktestRequest', () => {
  describe('Ticker Validation', () => {
    it('passes for valid tickers (AAPL, MSFT, BRK.B, etc.)', () => {
      for (const ticker of ['AAPL', 'MSFT', 'BRK.B', 'SPY', 'QQQ', 'NVDA']) {
        const result = validateBacktestRequest(makeValidRequest({ ticker }));
        const tickerErrors = result.errors.filter(e => e.field === 'ticker');
        expect(tickerErrors).toHaveLength(0);
      }
    });

    it('fails for empty ticker', () => {
      const result = validateBacktestRequest(makeValidRequest({ ticker: '' }));
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'TICKER_REQUIRED')).toBe(true);
    });

    it('fails for ticker longer than 10 characters', () => {
      const result = validateBacktestRequest(makeValidRequest({ ticker: 'VERYLONGTICKER' }));
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'TICKER_TOO_LONG')).toBe(true);
    });

    it('fails for ticker with special characters', () => {
      const result = validateBacktestRequest(makeValidRequest({ ticker: 'AA$L' }));
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'TICKER_INVALID_FORMAT')).toBe(true);
    });
  });

  describe('Strategy Validation', () => {
    it('passes for all prebuilt strategy IDs', () => {
      const strategyIds = Object.keys(PREBUILT_STRATEGIES);
      expect(strategyIds.length).toBeGreaterThanOrEqual(10); // we have 10 prebuilt

      for (const id of strategyIds) {
        const config = PREBUILT_STRATEGIES[id as keyof typeof PREBUILT_STRATEGIES];
        const req = makeValidRequest({
          strategy: {
            type: 'prebuilt',
            prebuilt: {
              id: id as any,
              name: config.name,
              description: config.description,
              category: config.category,
              riskLevel: config.riskLevel,
              parameters: {},
              defaultParameters: config.defaultParameters,
            },
          },
        });
        const result = validateBacktestRequest(req);
        const stratErrors = result.errors.filter(e => e.field.includes('strategy'));
        expect(stratErrors).toHaveLength(0);
      }
    });

    it('fails when strategy type is missing', () => {
      const req = makeValidRequest({
        strategy: { type: '' as any },
      });
      const result = validateBacktestRequest(req);
      expect(result.valid).toBe(false);
    });

    it('fails for unknown prebuilt strategy ID', () => {
      const req = makeValidRequest({
        strategy: {
          type: 'prebuilt',
          prebuilt: {
            id: 'nonexistent_strategy' as any,
            name: 'Fake',
            description: 'Fake',
            category: 'reversal',
            riskLevel: 'moderate',
            parameters: {},
            defaultParameters: {},
          },
        },
      });
      const result = validateBacktestRequest(req);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'STRATEGY_ID_UNKNOWN')).toBe(true);
    });

    it('fails when prebuilt config is missing', () => {
      const req = makeValidRequest({
        strategy: { type: 'prebuilt' },
      });
      const result = validateBacktestRequest(req);
      expect(result.valid).toBe(false);
    });

    it('fails for custom strategy without code', () => {
      const req = makeValidRequest({
        strategy: {
          type: 'custom',
          custom: { code: '', name: 'Empty' },
        },
      });
      const result = validateBacktestRequest(req);
      expect(result.valid).toBe(false);
    });

    it('fails for custom strategy with prohibited patterns', () => {
      const prohibited = ['eval(', 'Function(', 'require(', 'import(', 'fetch('];
      for (const pattern of prohibited) {
        const req = makeValidRequest({
          strategy: {
            type: 'custom',
            custom: {
              code: `function onBar(ctx) { ${pattern}"bad") }`,
              name: 'Bad',
            },
          },
        });
        const result = validateBacktestRequest(req);
        expect(result.errors.some(e => e.code === 'PROHIBITED_CODE_PATTERN')).toBe(true);
      }
    });

    it('fails for custom strategy without onBar function', () => {
      const req = makeValidRequest({
        strategy: {
          type: 'custom',
          custom: {
            code: 'function doSomething() { return 1; }',
            name: 'Missing onBar',
          },
        },
      });
      const result = validateBacktestRequest(req);
      expect(result.errors.some(e => e.code === 'MISSING_ONBAR_FUNCTION')).toBe(true);
    });
  });

  describe('Parameter Validation', () => {
    it('fails for RSI period out of range', () => {
      const req = makeValidRequest({
        strategy: {
          type: 'prebuilt',
          prebuilt: {
            id: 'rsi_oversold_bounce',
            name: 'RSI',
            description: '',
            category: 'reversal',
            riskLevel: 'moderate',
            parameters: { rsiPeriod: 100 },
            defaultParameters: {},
          },
        },
      });
      const result = validateBacktestRequest(req);
      expect(result.errors.some(e => e.code === 'RSI_PERIOD_OUT_OF_RANGE')).toBe(true);
    });

    it('fails for RSI oversold out of range', () => {
      const req = makeValidRequest({
        strategy: {
          type: 'prebuilt',
          prebuilt: {
            id: 'rsi_oversold_bounce',
            name: 'RSI',
            description: '',
            category: 'reversal',
            riskLevel: 'moderate',
            parameters: { rsiOversold: 5 },
            defaultParameters: {},
          },
        },
      });
      const result = validateBacktestRequest(req);
      expect(result.errors.some(e => e.code === 'RSI_OVERSOLD_OUT_OF_RANGE')).toBe(true);
    });

    it('fails for RSI overbought out of range', () => {
      const req = makeValidRequest({
        strategy: {
          type: 'prebuilt',
          prebuilt: {
            id: 'rsi_oversold_bounce',
            name: 'RSI',
            description: '',
            category: 'reversal',
            riskLevel: 'moderate',
            parameters: { rsiOverbought: 95 },
            defaultParameters: {},
          },
        },
      });
      const result = validateBacktestRequest(req);
      expect(result.errors.some(e => e.code === 'RSI_OVERBOUGHT_OUT_OF_RANGE')).toBe(true);
    });
  });

  describe('formatValidationErrors', () => {
    it('returns human-readable error messages', () => {
      const result = validateBacktestRequest(makeValidRequest({ ticker: '' }));
      const formatted = formatValidationErrors(result);
      expect(formatted.length).toBeGreaterThan(0);
      expect(formatted[0]).toContain('ticker');
    });

    it('returns empty array for valid request', () => {
      const result = validateBacktestRequest(makeValidRequest());
      const formatted = formatValidationErrors(result);
      expect(formatted).toHaveLength(0);
    });
  });
});
