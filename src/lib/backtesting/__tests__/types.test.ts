/**
 * Types & Constants Test Suite
 * Ensures type definitions and default values are correct
 */

import { describe, it, expect } from 'vitest';
import {
  PREBUILT_STRATEGIES,
  DEFAULT_ADVANCED_PARAMS,
  ADVANCED_PARAM_PRESETS,
} from '../types';
import type {
  BacktestConfig,
  StrategyDefinition,
  PerformanceMetrics,
  Trade,
  Candle,
  Position,
  AdvancedBacktestParams,
} from '../types';

describe('Type Constants', () => {
  describe('DEFAULT_ADVANCED_PARAMS', () => {
    it('has all required fields', () => {
      const params: AdvancedBacktestParams = DEFAULT_ADVANCED_PARAMS;
      expect(params.entryOrderType).toBe('market');
      expect(params.commissionType).toBe('percent');
      expect(params.commissionValue).toBe(0.1);
      expect(params.slippageTicks).toBe(1);
      expect(params.positionSizingMethod).toBe('percent-equity');
      expect(params.positionSizingValue).toBe(10);
      expect(params.pyramiding).toBe(1);
      expect(params.marginLong).toBe(100);
      expect(params.marginShort).toBe(100);
    });

    it('stop loss is disabled by default', () => {
      expect(DEFAULT_ADVANCED_PARAMS.stopLossEnabled).toBe(false);
    });

    it('take profit is disabled by default', () => {
      expect(DEFAULT_ADVANCED_PARAMS.takeProfitEnabled).toBe(false);
    });

    it('trailing stop is disabled by default', () => {
      expect(DEFAULT_ADVANCED_PARAMS.trailingStopEnabled).toBe(false);
    });

    it('exit tiers are empty by default', () => {
      expect(DEFAULT_ADVANCED_PARAMS.exitTiers).toEqual([]);
    });

    it('contains no mock/hardcoded result data', () => {
      const json = JSON.stringify(DEFAULT_ADVANCED_PARAMS);
      expect(json).not.toContain('mockReturn');
      expect(json).not.toContain('expectedProfit');
    });
  });

  describe('ADVANCED_PARAM_PRESETS', () => {
    it('has realistic, conservative, and aggressive presets', () => {
      expect(ADVANCED_PARAM_PRESETS).toHaveProperty('realistic');
      expect(ADVANCED_PARAM_PRESETS).toHaveProperty('conservative');
      expect(ADVANCED_PARAM_PRESETS).toHaveProperty('aggressive');
    });

    it('each preset has label and description', () => {
      for (const preset of Object.values(ADVANCED_PARAM_PRESETS)) {
        expect(preset.label).toBeTruthy();
        expect(preset.description).toBeTruthy();
        expect(preset.params).toBeDefined();
      }
    });

    it('conservative preset enables stop loss', () => {
      expect(ADVANCED_PARAM_PRESETS.conservative.params.stopLossEnabled).toBe(true);
    });

    it('aggressive preset has higher position sizing', () => {
      expect(ADVANCED_PARAM_PRESETS.aggressive.params.positionSizingValue).toBeGreaterThan(
        ADVANCED_PARAM_PRESETS.conservative.params.positionSizingValue!
      );
    });
  });

  describe('PREBUILT_STRATEGIES', () => {
    const strategyIds = [
      'consecutive_days_reversal',
      'rsi_oversold_bounce',
      'ma_crossover',
      'gap_fill',
      'post_earnings_drift',
      'volatility_breakout',
      'yield_optimizer',
      'macd_divergence',
      'bollinger_reversal',
      'volume_spike',
    ];

    it('contains all expected strategies', () => {
      for (const id of strategyIds) {
        expect(PREBUILT_STRATEGIES).toHaveProperty(id);
      }
    });

    it('RSI strategy has correct default parameters', () => {
      const rsi = PREBUILT_STRATEGIES.rsi_oversold_bounce;
      expect(rsi.defaultParameters.rsiPeriod).toBe(14);
      expect(rsi.defaultParameters.rsiOversold).toBe(30);
      expect(rsi.defaultParameters.rsiOverbought).toBe(50);
    });

    it('MA Crossover has correct default periods', () => {
      const ma = PREBUILT_STRATEGIES.ma_crossover;
      expect(ma.defaultParameters.smaPeriodFast).toBe(50);
      expect(ma.defaultParameters.smaPeriodSlow).toBe(200);
    });

    it('Bollinger has correct default parameters', () => {
      const bb = PREBUILT_STRATEGIES.bollinger_reversal;
      expect(bb.defaultParameters.bollingerPeriod).toBe(20);
      expect(bb.defaultParameters.bollingerStdDev).toBe(2.0);
    });
  });
});
