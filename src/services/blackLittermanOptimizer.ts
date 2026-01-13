/**
 * Black-Litterman Model - API Wrapper
 * 
 * This is a thin client-side wrapper that delegates all proprietary
 * Black-Litterman calculations to server-side edge functions.
 * 
 * Actual implementation is in:
 * - supabase/functions/portfolio-optimizer-v2
 */

import { supabase } from '@/integrations/supabase/client';
import { CorrelationMatrix } from './backtesterService';
import { AssetData } from './portfolioOptimizer';

export interface BlackLittermanResult {
  posteriorReturns: Map<string, number>;
  posteriorWeights: Map<string, number>;
  impliedReturns: Map<string, number>;
  viewContribution: Map<string, number>;
  blendedRisk: number;
  blendedReturn: number;
}

export interface InvestorView {
  symbol: string;
  targetWeight: number;
  confidence: number;
}

/**
 * Black-Litterman Optimizer
 * All computation is delegated to server-side edge functions
 */
export class BlackLittermanOptimizer {
  /**
   * Apply Black-Litterman model to blend equilibrium with views
   */
  async optimize(
    correlationMatrix: CorrelationMatrix,
    assetData: Map<string, AssetData>,
    investorViews: InvestorView[],
    marketWeights?: Map<string, number>
  ): Promise<BlackLittermanResult> {
    console.log('[Black-Litterman] Calling server-side optimization...');
    
    // Convert Maps to objects for JSON serialization
    const assetDataObj: Record<string, AssetData> = {};
    for (const [ticker, data] of assetData) {
      assetDataObj[ticker] = data;
    }

    const weightsObj: Record<string, number> | undefined = marketWeights 
      ? Object.fromEntries(marketWeights)
      : undefined;

    const { data, error } = await supabase.functions.invoke('portfolio-optimizer-v2', {
      body: {
        action: 'black-litterman',
        correlationMatrix,
        assetData: assetDataObj,
        investorViews,
        weights: weightsObj
      }
    });

    if (error) throw error;
    if (!data.success) throw new Error(data.error || 'Black-Litterman optimization failed');

    // Convert response back to Maps
    const posteriorReturns = new Map<string, number>(Object.entries(data.posteriorReturns));
    const posteriorWeights = new Map<string, number>(Object.entries(data.posteriorWeights));
    const impliedReturns = new Map<string, number>(Object.entries(data.impliedReturns));
    const viewContribution = new Map<string, number>(Object.entries(data.viewContribution));

    return {
      posteriorReturns,
      posteriorWeights,
      impliedReturns,
      viewContribution,
      blendedRisk: data.blendedRisk,
      blendedReturn: data.blendedReturn
    };
  }

  /**
   * Analyze user-provided weights to determine implied views
   */
  async analyzeUserWeights(
    userWeights: Map<string, number>,
    correlationMatrix: CorrelationMatrix,
    assetData: Map<string, AssetData>
  ): Promise<{
    userRisk: number;
    userExpectedReturn: number;
    impliedViews: Map<string, number>;
    riskContribution: Map<string, number>;
  }> {
    console.log('[Black-Litterman] Analyzing user weights...');
    
    const assetDataObj: Record<string, AssetData> = {};
    for (const [ticker, data] of assetData) {
      assetDataObj[ticker] = data;
    }

    const weightsObj = Object.fromEntries(userWeights);

    const { data, error } = await supabase.functions.invoke('portfolio-optimizer-v2', {
      body: {
        action: 'analyze',
        correlationMatrix,
        assetData: assetDataObj,
        weights: weightsObj
      }
    });

    if (error) throw error;
    if (!data.success) throw new Error(data.error || 'Analysis failed');

    return {
      userRisk: data.userRisk,
      userExpectedReturn: data.userExpectedReturn,
      impliedViews: new Map(Object.entries(data.impliedViews)),
      riskContribution: new Map(Object.entries(data.riskContribution))
    };
  }

  // Legacy synchronous methods - kept for backwards compatibility
  // These now throw errors directing users to use async versions

  computeImpliedReturns(): Map<string, number> {
    console.warn('[Black-Litterman] computeImpliedReturns is now async - use optimize() instead');
    return new Map();
  }

  correlationToCovariance(): number[][] {
    console.warn('[Black-Litterman] correlationToCovariance is now server-side only');
    return [];
  }
}

// Export singleton for backwards compatibility
export const blackLittermanOptimizer = new BlackLittermanOptimizer();
