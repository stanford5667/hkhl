import { fetchHistoricalPrices, HistoricalDataPoint, CorrelationMatrix } from './backtesterService';
import { supabase } from '@/integrations/supabase/client';

// Types - kept for backwards compatibility
export interface BacktestConfig {
  tickers: string[];
  startDate: string;
  endDate: string;
  initialCapital: number;
  rebalanceFrequency: 'daily' | 'weekly' | 'monthly';
  regimeLookback: number;
  taxRate: { shortTerm: number; longTerm: number };
}

export interface BacktestSnapshot {
  date: Date;
  portfolioValue: number;
  dailyReturn: number;
  regime: string;
  turbulenceIndex: number;
  weights: Map<string, number>;
  turnover: number;
  taxPaid: number;
}

export interface BacktestResult {
  snapshots: BacktestSnapshot[];
  metrics: PerformanceMetrics;
  regimeBreakdown: RegimeMetrics[];
}

export interface PerformanceMetrics {
  totalReturn: number;
  cagr: number;
  volatility: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  calmarRatio: number;
  totalTurnover: number;
  totalTaxPaid: number;
  afterTaxReturn: number;
}

export interface RegimeMetrics {
  regime: string;
  daysInRegime: number;
  averageReturn: number;
  volatility: number;
}

/**
 * Thin client wrapper for BacktestEngine
 * All proprietary algorithms now run server-side
 */
export class BacktestEngine {
  private config: BacktestConfig;

  constructor(config: BacktestConfig) {
    this.config = config;
  }

  /**
   * Run the full backtest via edge function
   */
  async runBacktest(
    onProgress?: (message: string, percent: number) => void
  ): Promise<BacktestResult> {
    const { tickers, startDate, endDate } = this.config;
    
    console.log('[Backtest] Starting...', tickers.length, 'assets');
    onProgress?.('Fetching historical data...', 5);

    // Fetch historical data for all tickers (client-side for caching)
    const historicalData: Record<string, HistoricalDataPoint[]> = {};
    
    for (let i = 0; i < tickers.length; i++) {
      const ticker = tickers[i];
      try {
        const data = await fetchHistoricalPrices(ticker, startDate, endDate);
        historicalData[ticker] = data;
        onProgress?.(`Loaded ${ticker}`, 5 + (i / tickers.length) * 30);
      } catch (error) {
        console.warn(`[Backtest] Failed to fetch ${ticker}:`, error);
      }
      // Rate limiting
      if (i < tickers.length - 1) {
        await new Promise(r => setTimeout(r, 300));
      }
    }

    onProgress?.('Running backtest simulation...', 40);

    // Call edge function for proprietary backtest logic
    const { data, error } = await supabase.functions.invoke('backtest-engine', {
      body: {
        config: this.config,
        historicalData
      }
    });

    if (error) {
      console.error('[Backtest] Edge function error:', error);
      throw new Error(error.message || 'Backtest failed');
    }

    onProgress?.('Processing results...', 90);

    // Convert server response back to client format
    const result = data as {
      snapshots: Array<{
        date: string;
        portfolioValue: number;
        dailyReturn: number;
        regime: string;
        turbulenceIndex: number;
        weights: Record<string, number>;
        turnover: number;
        taxPaid: number;
      }>;
      metrics: PerformanceMetrics;
      regimeBreakdown: RegimeMetrics[];
    };

    // Convert snapshots to expected format with Date objects and Maps
    const snapshots: BacktestSnapshot[] = result.snapshots.map(s => ({
      date: new Date(s.date),
      portfolioValue: s.portfolioValue,
      dailyReturn: s.dailyReturn,
      regime: s.regime,
      turbulenceIndex: s.turbulenceIndex,
      weights: new Map(Object.entries(s.weights)),
      turnover: s.turnover,
      taxPaid: s.taxPaid
    }));

    console.log('[Backtest] Complete! Return:', (result.metrics.totalReturn * 100).toFixed(2) + '%');
    onProgress?.('Complete!', 100);

    return {
      snapshots,
      metrics: result.metrics,
      regimeBreakdown: result.regimeBreakdown
    };
  }
}

/**
 * Convenience function to run backtest
 */
export async function runBacktest(
  tickers: string[],
  startDate: string,
  endDate: string,
  initialCapital: number = 100000,
  onProgress?: (msg: string, pct: number) => void
): Promise<BacktestResult> {
  const config: BacktestConfig = {
    tickers,
    startDate,
    endDate,
    initialCapital,
    rebalanceFrequency: 'monthly',
    regimeLookback: 60,
    taxRate: { shortTerm: 0.35, longTerm: 0.15 }
  };

  const engine = new BacktestEngine(config);
  return engine.runBacktest(onProgress);
}
