// Black-Litterman Model Implementation
// Combines market equilibrium with investor views

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
  targetWeight: number; // User's desired weight (0-1)
  confidence: number; // 0-1, how confident in the view
}

// Risk aversion coefficient (typical institutional range: 2-4)
const RISK_AVERSION = 2.5;

// Market risk premium
const MARKET_RISK_PREMIUM = 0.05; // 5%

// Tau - scalar for uncertainty in prior
const TAU = 0.05;

/**
 * Black-Litterman Optimizer
 * Blends market equilibrium weights with user views
 */
export class BlackLittermanOptimizer {
  /**
   * Compute implied equilibrium returns from market cap weights
   * Pi = δ * Σ * w_mkt
   */
  computeImpliedReturns(
    marketWeights: Map<string, number>,
    covarianceMatrix: number[][],
    symbols: string[],
    riskAversion: number = RISK_AVERSION
  ): Map<string, number> {
    const n = symbols.length;
    const impliedReturns = new Map<string, number>();
    
    for (let i = 0; i < n; i++) {
      let expectedReturn = 0;
      for (let j = 0; j < n; j++) {
        const weight = marketWeights.get(symbols[j]) || 0;
        expectedReturn += riskAversion * covarianceMatrix[i][j] * weight;
      }
      impliedReturns.set(symbols[i], expectedReturn);
    }
    
    return impliedReturns;
  }

  /**
   * Convert correlation matrix to covariance matrix using volatilities
   */
  correlationToCovariance(
    correlationMatrix: CorrelationMatrix,
    assetData: Map<string, AssetData>
  ): number[][] {
    const { symbols, matrix } = correlationMatrix;
    const n = symbols.length;
    const covariance: number[][] = [];
    
    for (let i = 0; i < n; i++) {
      covariance[i] = [];
      const volI = assetData.get(symbols[i])?.volatility || 0.2;
      
      for (let j = 0; j < n; j++) {
        const volJ = assetData.get(symbols[j])?.volatility || 0.2;
        covariance[i][j] = correlationMatrix.matrix[i][j] * volI * volJ;
      }
    }
    
    return covariance;
  }

  /**
   * Apply Black-Litterman model
   * Combines prior (equilibrium) with views
   */
  optimize(
    correlationMatrix: CorrelationMatrix,
    assetData: Map<string, AssetData>,
    investorViews: InvestorView[],
    marketWeights?: Map<string, number>
  ): BlackLittermanResult {
    const { symbols } = correlationMatrix;
    const n = symbols.length;
    
    console.log('[Black-Litterman] Starting optimization with', n, 'assets');
    console.log('[Black-Litterman] Investor views:', investorViews.length);
    
    // If no market weights provided, use equal weights as starting point
    if (!marketWeights) {
      marketWeights = new Map();
      symbols.forEach(s => marketWeights!.set(s, 1 / n));
    }
    
    // Step 1: Convert correlation to covariance
    const covariance = this.correlationToCovariance(correlationMatrix, assetData);
    
    // Step 2: Compute implied equilibrium returns
    const impliedReturns = this.computeImpliedReturns(marketWeights, covariance, symbols);
    
    // Step 3: Build view matrices
    // P = pick matrix (which assets in each view)
    // Q = view returns (what we expect)
    // Omega = confidence in views (diagonal)
    
    const viewSymbols = investorViews.map(v => v.symbol).filter(s => symbols.includes(s));
    
    if (viewSymbols.length === 0) {
      // No views, return equilibrium
      console.log('[Black-Litterman] No valid views, returning equilibrium weights');
      return {
        posteriorReturns: impliedReturns,
        posteriorWeights: marketWeights,
        impliedReturns,
        viewContribution: new Map(),
        blendedRisk: this.calculatePortfolioRisk(marketWeights, covariance, symbols),
        blendedReturn: this.calculatePortfolioReturn(marketWeights, impliedReturns),
      };
    }
    
    // Step 4: Compute posterior returns using Black-Litterman formula
    // E[R] = [(τΣ)^(-1) + P'Ω^(-1)P]^(-1) * [(τΣ)^(-1)π + P'Ω^(-1)Q]
    // Simplified: blend equilibrium with views weighted by confidence
    
    const posteriorReturns = new Map<string, number>();
    const posteriorWeights = new Map<string, number>();
    const viewContribution = new Map<string, number>();
    
    // For each asset, blend equilibrium return with view-implied return
    let totalWeight = 0;
    
    for (const symbol of symbols) {
      const equilibriumReturn = impliedReturns.get(symbol) || 0;
      const view = investorViews.find(v => v.symbol === symbol);
      
      let posteriorReturn: number;
      let weight: number;
      
      if (view) {
        // Asset has a view - blend based on confidence
        const viewWeight = view.targetWeight;
        const confidence = view.confidence;
        
        // Implied return from the view
        const viewImpliedReturn = MARKET_RISK_PREMIUM * viewWeight * n; // Scale by relative weight
        
        // Blend equilibrium and view
        posteriorReturn = (1 - confidence * TAU) * equilibriumReturn + confidence * TAU * viewImpliedReturn;
        
        // Weight is influenced by view
        weight = viewWeight * confidence + (marketWeights.get(symbol) || 0) * (1 - confidence);
        
        viewContribution.set(symbol, viewImpliedReturn - equilibriumReturn);
      } else {
        // No view - use equilibrium
        posteriorReturn = equilibriumReturn;
        weight = marketWeights.get(symbol) || (1 / n);
      }
      
      posteriorReturns.set(symbol, posteriorReturn);
      posteriorWeights.set(symbol, weight);
      totalWeight += weight;
    }
    
    // Normalize weights to sum to 1
    for (const [symbol, weight] of posteriorWeights) {
      posteriorWeights.set(symbol, weight / totalWeight);
    }
    
    // Calculate portfolio risk and return
    const blendedRisk = this.calculatePortfolioRisk(posteriorWeights, covariance, symbols);
    const blendedReturn = this.calculatePortfolioReturn(posteriorWeights, posteriorReturns);
    
    console.log('[Black-Litterman] Posterior weights:', Object.fromEntries(posteriorWeights));
    console.log('[Black-Litterman] Blended risk:', blendedRisk.toFixed(4));
    console.log('[Black-Litterman] Blended return:', blendedReturn.toFixed(4));
    
    return {
      posteriorReturns,
      posteriorWeights,
      impliedReturns,
      viewContribution,
      blendedRisk,
      blendedReturn,
    };
  }

  /**
   * Calculate portfolio risk (standard deviation)
   */
  private calculatePortfolioRisk(
    weights: Map<string, number>,
    covariance: number[][],
    symbols: string[]
  ): number {
    let variance = 0;
    const n = symbols.length;
    
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const wi = weights.get(symbols[i]) || 0;
        const wj = weights.get(symbols[j]) || 0;
        variance += wi * wj * covariance[i][j];
      }
    }
    
    return Math.sqrt(variance);
  }

  /**
   * Calculate expected portfolio return
   */
  private calculatePortfolioReturn(
    weights: Map<string, number>,
    returns: Map<string, number>
  ): number {
    let portfolioReturn = 0;
    
    for (const [symbol, weight] of weights) {
      portfolioReturn += weight * (returns.get(symbol) || 0);
    }
    
    return portfolioReturn;
  }

  /**
   * Compare user weights vs optimal weights
   * Shows implied risk of user's selection
   */
  analyzeUserWeights(
    userWeights: Map<string, number>,
    correlationMatrix: CorrelationMatrix,
    assetData: Map<string, AssetData>
  ): {
    userRisk: number;
    userExpectedReturn: number;
    impliedViews: Map<string, number>;
    riskContribution: Map<string, number>;
  } {
    const { symbols } = correlationMatrix;
    const covariance = this.correlationToCovariance(correlationMatrix, assetData);
    
    // Equilibrium weights (equal weight as proxy for market)
    const eqWeights = new Map<string, number>();
    symbols.forEach(s => eqWeights.set(s, 1 / symbols.length));
    
    const impliedReturns = this.computeImpliedReturns(eqWeights, covariance, symbols);
    
    // User's portfolio risk and return
    const userRisk = this.calculatePortfolioRisk(userWeights, covariance, symbols);
    const userExpectedReturn = this.calculatePortfolioReturn(userWeights, impliedReturns);
    
    // Implied views = user weights - equilibrium weights
    const impliedViews = new Map<string, number>();
    for (const symbol of symbols) {
      const userW = userWeights.get(symbol) || 0;
      const eqW = eqWeights.get(symbol) || 0;
      impliedViews.set(symbol, userW - eqW);
    }
    
    // Marginal risk contribution
    const riskContribution = new Map<string, number>();
    for (let i = 0; i < symbols.length; i++) {
      const symbol = symbols[i];
      const weight = userWeights.get(symbol) || 0;
      
      let marginalRisk = 0;
      for (let j = 0; j < symbols.length; j++) {
        marginalRisk += (userWeights.get(symbols[j]) || 0) * covariance[i][j];
      }
      
      riskContribution.set(symbol, weight * marginalRisk / (userRisk * userRisk) * 100);
    }
    
    return {
      userRisk,
      userExpectedReturn,
      impliedViews,
      riskContribution,
    };
  }
}

export const blackLittermanOptimizer = new BlackLittermanOptimizer();
