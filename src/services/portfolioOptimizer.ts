/**
 * Portfolio Optimizer Service - API Wrapper
 * 
 * This is a thin client-side wrapper that delegates all proprietary
 * optimization algorithms to server-side edge functions.
 * 
 * Actual implementations are in:
 * - supabase/functions/portfolio-optimizer-v2
 */

import { supabase } from '@/integrations/supabase/client';
import { CorrelationMatrix } from './backtesterService';

// Types
export interface AssetEmbedding {
  ticker: string;
  embedding: number[];
  centrality: number;
  cluster: number;
}

export interface PortfolioWeights {
  weights: Map<string, number>;
  timestamp: Date;
  regime: string;
  expectedReturn: number;
  expectedVol: number;
  sharpeRatio: number;
}

export interface TaxLot {
  ticker: string;
  shares: number;
  costBasis: number;
  purchaseDate: Date;
}

export interface AssetData {
  ticker: string;
  volatility: number;
  avgReturn: number;
  skewness: number;
  kurtosis: number;
  volume: number;
}

export interface RegimeSignal {
  regime: 'low_vol' | 'normal' | 'high_vol' | 'crisis';
  turbulenceIndex: number;
  volatility: number;
  date: string;
}

// Defensive and growth asset classifications (for reference only)
const DEFENSIVE_ASSETS = ['GLD', 'IAU', 'TLT', 'TIP', 'VNQ', 'XLRE', 'DBC', 'SCHP', 'BND', 'AGG', 'SHY', 'IEF'];
const GROWTH_ASSETS = ['QQQ', 'XLK', 'VGT', 'IGV', 'ARKK', 'SMH', 'SOXX', 'XLY', 'IWM', 'VBK', 'MTUM'];

/**
 * Neuro-Symbolic Portfolio Optimizer
 * All computation is delegated to server-side edge functions
 */
export class NeuroSymbolicOptimizer {
  /**
   * Compute optimal portfolio weights using GNN + HRP + Regime adjustments
   */
  async computeOptimalWeights(
    assetData: Map<string, AssetData>,
    correlationMatrix: CorrelationMatrix,
    regime: RegimeSignal,
    realAssets: string[],
    currentHoldings?: TaxLot[]
  ): Promise<PortfolioWeights> {
    console.log('[Optimizer] Calling server-side optimization...');
    
    // Convert Map to object for JSON serialization
    const assetDataObj: Record<string, AssetData> = {};
    for (const [ticker, data] of assetData) {
      assetDataObj[ticker] = data;
    }

    // Convert TaxLot dates to strings
    const holdingsForApi = currentHoldings?.map(lot => ({
      ...lot,
      purchaseDate: lot.purchaseDate.toISOString()
    }));

    const { data, error } = await supabase.functions.invoke('portfolio-optimizer-v2', {
      body: {
        action: 'optimize',
        tickers: correlationMatrix.symbols,
        correlationMatrix,
        assetData: assetDataObj,
        regime,
        currentHoldings: holdingsForApi
      }
    });

    if (error) throw error;
    if (!data.success) throw new Error(data.error || 'Optimization failed');

    // Convert response back to Map
    const weights = new Map<string, number>();
    for (const [ticker, weight] of Object.entries(data.weights)) {
      weights.set(ticker, weight as number);
    }

    return {
      weights,
      timestamp: new Date(data.timestamp),
      regime: data.regime,
      expectedReturn: data.expectedReturn,
      expectedVol: data.expectedVol,
      sharpeRatio: data.sharpeRatio
    };
  }
}

// Legacy class stubs for backwards compatibility
// These are now no-ops - actual logic is server-side

export class AssetGraphNetwork {
  buildGraph(): void {
    console.warn('[GNN] This method is now server-side only');
  }
  computeEmbeddings(): AssetEmbedding[] {
    console.warn('[GNN] This method is now server-side only');
    return [];
  }
  getCentralityNodes(): string[] {
    console.warn('[GNN] This method is now server-side only');
    return [];
  }
}

export class HierarchicalRiskParity {
  computeWeights(): Map<string, number> {
    console.warn('[HRP] This method is now server-side only');
    return new Map();
  }
  adjustForRegime(): Map<string, number> {
    console.warn('[HRP] This method is now server-side only');
    return new Map();
  }
}

export class TaxAwareOptimizer {
  private holdings: TaxLot[] = [];

  setHoldings(lots: TaxLot[]): void {
    this.holdings = lots;
  }

  async calculateTaxImpact(
    ticker: string,
    sharesToSell: number,
    currentPrice: number
  ): Promise<number> {
    const { data, error } = await supabase.functions.invoke('portfolio-optimizer-v2', {
      body: {
        action: 'tax-impact',
        ticker,
        sharesToSell,
        currentPrice,
        holdings: this.holdings.map(lot => ({
          ...lot,
          purchaseDate: lot.purchaseDate.toISOString()
        }))
      }
    });

    if (error) throw error;
    if (!data.success) throw new Error(data.error);

    return data.taxImpact;
  }
}
