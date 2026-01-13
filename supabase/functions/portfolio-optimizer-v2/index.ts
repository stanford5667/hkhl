import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ================================================================
// PROPRIETARY PORTFOLIO OPTIMIZATION ALGORITHMS
// This code is server-side only for IP protection
// ================================================================

// Asset classification for regime adjustment
const DEFENSIVE_ASSETS = ['GLD', 'IAU', 'TLT', 'TIP', 'VNQ', 'XLRE', 'DBC', 'SCHP', 'BND', 'AGG', 'SHY', 'IEF'];
const GROWTH_ASSETS = ['QQQ', 'XLK', 'VGT', 'IGV', 'ARKK', 'SMH', 'SOXX', 'XLY', 'IWM', 'VBK', 'MTUM'];

interface AssetData {
  ticker: string;
  volatility: number;
  avgReturn: number;
  skewness: number;
  kurtosis: number;
  volume: number;
}

interface RegimeSignal {
  regime: 'low_vol' | 'normal' | 'high_vol' | 'crisis';
  turbulenceIndex: number;
  volatility: number;
}

interface TaxLot {
  ticker: string;
  shares: number;
  costBasis: number;
  purchaseDate: string;
}

interface InvestorView {
  symbol: string;
  targetWeight: number;
  confidence: number;
}

interface CorrelationMatrix {
  symbols: string[];
  matrix: number[][];
}

// ================================================================
// GRAPH NEURAL NETWORK FOR ASSET RELATIONSHIPS
// ================================================================
class AssetGraphNetwork {
  private adjacencyMatrix: number[][] = [];
  private nodeFeatures: Map<string, number[]> = new Map();
  private tickers: string[] = [];

  buildGraph(
    correlationMatrix: CorrelationMatrix,
    assetData: Map<string, AssetData>,
    threshold: number = 0.3
  ): void {
    const { symbols, matrix } = correlationMatrix;
    this.tickers = symbols;
    const n = symbols.length;

    this.adjacencyMatrix = Array(n).fill(null).map(() => Array(n).fill(0));
    
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i !== j && Math.abs(matrix[i][j]) > threshold) {
          this.adjacencyMatrix[i][j] = matrix[i][j];
        }
      }
    }

    for (const ticker of symbols) {
      const data = assetData.get(ticker);
      if (data) {
        this.nodeFeatures.set(ticker, [
          data.volatility * 10,
          data.avgReturn * 100,
          data.skewness,
          data.kurtosis / 10,
          Math.log(Math.max(data.volume, 1)) / 10
        ]);
      } else {
        this.nodeFeatures.set(ticker, [0.15 * 10, 0.1 * 100, 0, 3 / 10, 15 / 10]);
      }
    }
  }

  computeEmbeddings(numLayers: number = 2): { ticker: string; embedding: number[]; centrality: number; cluster: number }[] {
    const n = this.tickers.length;
    if (n === 0) return [];

    let embeddings: number[][] = this.tickers.map(ticker => {
      const features = this.nodeFeatures.get(ticker) || [0, 0, 0, 0, 0];
      return [...features];
    });

    for (let layer = 0; layer < numLayers; layer++) {
      const newEmbeddings: number[][] = [];
      
      for (let i = 0; i < n; i++) {
        const currentEmb = embeddings[i];
        const featureDim = currentEmb.length;
        const aggregated = Array(featureDim).fill(0);
        let weightSum = 0;

        for (let j = 0; j < n; j++) {
          if (this.adjacencyMatrix[i][j] !== 0) {
            const weight = Math.abs(this.adjacencyMatrix[i][j]);
            for (let k = 0; k < featureDim; k++) {
              aggregated[k] += embeddings[j][k] * weight;
            }
            weightSum += weight;
          }
        }

        const combined = currentEmb.map((val, idx) => {
          const neighborVal = weightSum > 0 ? aggregated[idx] / weightSum : 0;
          return val + 0.5 * neighborVal;
        });

        newEmbeddings.push(combined.map(v => Math.max(0, v)));
      }

      embeddings = newEmbeddings;
    }

    return this.tickers.map((ticker, i) => {
      const centrality = this.adjacencyMatrix[i].reduce((sum, val) => sum + Math.abs(val), 0) / n;
      const embMean = embeddings[i].reduce((a, b) => a + b, 0) / embeddings[i].length;
      const cluster = embMean < 1 ? 0 : embMean < 3 ? 1 : 2;

      return { ticker, embedding: embeddings[i], centrality, cluster };
    }).sort((a, b) => b.centrality - a.centrality);
  }

  getCentralityNodes(topN: number = 5): string[] {
    return this.computeEmbeddings().slice(0, topN).map(e => e.ticker);
  }
}

// ================================================================
// HIERARCHICAL RISK PARITY (HRP)
// ================================================================
class HierarchicalRiskParity {
  computeWeights(
    correlationMatrix: CorrelationMatrix,
    assetData: Map<string, AssetData>
  ): Map<string, number> {
    const { symbols, matrix } = correlationMatrix;
    const n = symbols.length;

    if (n === 0) return new Map();
    if (n === 1) return new Map([[symbols[0], 1]]);

    const distanceMatrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        distanceMatrix[i][j] = Math.sqrt(2 * (1 - matrix[i][j]));
      }
    }

    const order = this.getQuasiDiagonalOrder(distanceMatrix, symbols);

    const volatilities = new Map<string, number>();
    for (const ticker of symbols) {
      const data = assetData.get(ticker);
      volatilities.set(ticker, data?.volatility || 0.2);
    }

    return this.recursiveBisection(order, volatilities, matrix, symbols);
  }

  private getQuasiDiagonalOrder(distanceMatrix: number[][], symbols: string[]): string[] {
    const n = symbols.length;
    if (n <= 2) return symbols;

    const avgDistances = symbols.map((_, i) => ({
      idx: i,
      avgDist: distanceMatrix[i].reduce((a, b) => a + b, 0) / n
    }));
    
    avgDistances.sort((a, b) => a.avgDist - b.avgDist);
    return avgDistances.map(d => symbols[d.idx]);
  }

  private recursiveBisection(
    order: string[],
    volatilities: Map<string, number>,
    corrMatrix: number[][],
    allSymbols: string[]
  ): Map<string, number> {
    const weights = new Map<string, number>();
    order.forEach(ticker => weights.set(ticker, 0));

    const allocate = (items: string[], allocation: number) => {
      if (items.length === 1) {
        weights.set(items[0], allocation);
        return;
      }

      if (items.length === 2) {
        const vol1 = volatilities.get(items[0]) || 0.2;
        const vol2 = volatilities.get(items[1]) || 0.2;
        const invVol1 = 1 / vol1;
        const invVol2 = 1 / vol2;
        const total = invVol1 + invVol2;
        weights.set(items[0], allocation * (invVol1 / total));
        weights.set(items[1], allocation * (invVol2 / total));
        return;
      }

      const mid = Math.floor(items.length / 2);
      const left = items.slice(0, mid);
      const right = items.slice(mid);

      const leftVar = left.reduce((sum, t) => sum + Math.pow(volatilities.get(t) || 0.2, 2), 0);
      const rightVar = right.reduce((sum, t) => sum + Math.pow(volatilities.get(t) || 0.2, 2), 0);

      const totalVar = leftVar + rightVar;
      const leftAlloc = allocation * (rightVar / totalVar);
      const rightAlloc = allocation * (leftVar / totalVar);

      allocate(left, leftAlloc);
      allocate(right, rightAlloc);
    };

    allocate(order, 1);
    return weights;
  }

  adjustForRegime(
    baseWeights: Map<string, number>,
    regime: RegimeSignal,
    assetData: Map<string, AssetData>
  ): Map<string, number> {
    const multipliers: Record<string, { growth: number; defensive: number }> = {
      'low_vol': { growth: 1.2, defensive: 0.8 },
      'normal': { growth: 1.0, defensive: 1.0 },
      'high_vol': { growth: 0.7, defensive: 1.3 },
      'crisis': { growth: 0.4, defensive: 1.6 }
    };

    const mult = multipliers[regime.regime] || multipliers['normal'];
    const adjustedWeights = new Map<string, number>();
    let total = 0;

    for (const [ticker, weight] of baseWeights) {
      const isDefensive = DEFENSIVE_ASSETS.includes(ticker);
      const isGrowth = GROWTH_ASSETS.includes(ticker);

      let multiplier = 1;
      if (isDefensive) multiplier = mult.defensive;
      else if (isGrowth) multiplier = mult.growth;

      const newWeight = weight * multiplier;
      adjustedWeights.set(ticker, newWeight);
      total += newWeight;
    }

    for (const [ticker, weight] of adjustedWeights) {
      adjustedWeights.set(ticker, weight / total);
    }

    return adjustedWeights;
  }
}

// ================================================================
// TAX-AWARE OPTIMIZER
// ================================================================
class TaxAwareOptimizer {
  private taxLots: TaxLot[] = [];
  private shortTermRate: number = 0.35;
  private longTermRate: number = 0.15;

  setHoldings(lots: TaxLot[]): void {
    this.taxLots = lots;
  }

  calculateTaxImpact(ticker: string, sharesToSell: number, currentPrice: number): number {
    const tickerLots = this.taxLots
      .filter(lot => lot.ticker === ticker)
      .sort((a, b) => new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime());

    if (tickerLots.length === 0) return 0;

    const now = new Date();
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    
    let remainingToSell = sharesToSell;
    let totalTax = 0;

    for (const lot of tickerLots) {
      if (remainingToSell <= 0) break;

      const sharesFromLot = Math.min(remainingToSell, lot.shares);
      const gain = (currentPrice - lot.costBasis) * sharesFromLot;

      if (gain > 0) {
        const isLongTerm = new Date(lot.purchaseDate) < oneYearAgo;
        const rate = isLongTerm ? this.longTermRate : this.shortTermRate;
        totalTax += gain * rate;
      }

      remainingToSell -= sharesFromLot;
    }

    return totalTax;
  }
}

// ================================================================
// BLACK-LITTERMAN MODEL
// ================================================================
class BlackLittermanOptimizer {
  private RISK_AVERSION = 2.5;
  private MARKET_RISK_PREMIUM = 0.05;
  private TAU = 0.05;

  computeImpliedReturns(
    marketWeights: Map<string, number>,
    covarianceMatrix: number[][],
    symbols: string[]
  ): Map<string, number> {
    const n = symbols.length;
    const impliedReturns = new Map<string, number>();
    
    for (let i = 0; i < n; i++) {
      let expectedReturn = 0;
      for (let j = 0; j < n; j++) {
        const weight = marketWeights.get(symbols[j]) || 0;
        expectedReturn += this.RISK_AVERSION * covarianceMatrix[i][j] * weight;
      }
      impliedReturns.set(symbols[i], expectedReturn);
    }
    
    return impliedReturns;
  }

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
        covariance[i][j] = matrix[i][j] * volI * volJ;
      }
    }
    
    return covariance;
  }

  optimize(
    correlationMatrix: CorrelationMatrix,
    assetData: Map<string, AssetData>,
    investorViews: InvestorView[],
    marketWeights?: Map<string, number>
  ): {
    posteriorReturns: Map<string, number>;
    posteriorWeights: Map<string, number>;
    impliedReturns: Map<string, number>;
    viewContribution: Map<string, number>;
    blendedRisk: number;
    blendedReturn: number;
  } {
    const { symbols } = correlationMatrix;
    const n = symbols.length;
    
    if (!marketWeights) {
      marketWeights = new Map();
      symbols.forEach(s => marketWeights!.set(s, 1 / n));
    }
    
    const covariance = this.correlationToCovariance(correlationMatrix, assetData);
    const impliedReturns = this.computeImpliedReturns(marketWeights, covariance, symbols);
    
    const viewSymbols = investorViews.map(v => v.symbol).filter(s => symbols.includes(s));
    
    if (viewSymbols.length === 0) {
      return {
        posteriorReturns: impliedReturns,
        posteriorWeights: marketWeights,
        impliedReturns,
        viewContribution: new Map(),
        blendedRisk: this.calculatePortfolioRisk(marketWeights, covariance, symbols),
        blendedReturn: this.calculatePortfolioReturn(marketWeights, impliedReturns),
      };
    }
    
    const posteriorReturns = new Map<string, number>();
    const posteriorWeights = new Map<string, number>();
    const viewContribution = new Map<string, number>();
    
    let totalWeight = 0;
    
    for (const symbol of symbols) {
      const equilibriumReturn = impliedReturns.get(symbol) || 0;
      const view = investorViews.find(v => v.symbol === symbol);
      
      let posteriorReturn: number;
      let weight: number;
      
      if (view) {
        const viewWeight = view.targetWeight;
        const confidence = view.confidence;
        const viewImpliedReturn = this.MARKET_RISK_PREMIUM * viewWeight * n;
        
        posteriorReturn = (1 - confidence * this.TAU) * equilibriumReturn + confidence * this.TAU * viewImpliedReturn;
        weight = viewWeight * confidence + (marketWeights.get(symbol) || 0) * (1 - confidence);
        
        viewContribution.set(symbol, viewImpliedReturn - equilibriumReturn);
      } else {
        posteriorReturn = equilibriumReturn;
        weight = marketWeights.get(symbol) || (1 / n);
      }
      
      posteriorReturns.set(symbol, posteriorReturn);
      posteriorWeights.set(symbol, weight);
      totalWeight += weight;
    }
    
    for (const [symbol, weight] of posteriorWeights) {
      posteriorWeights.set(symbol, weight / totalWeight);
    }
    
    return {
      posteriorReturns,
      posteriorWeights,
      impliedReturns,
      viewContribution,
      blendedRisk: this.calculatePortfolioRisk(posteriorWeights, covariance, symbols),
      blendedReturn: this.calculatePortfolioReturn(posteriorWeights, posteriorReturns),
    };
  }

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
    
    const eqWeights = new Map<string, number>();
    symbols.forEach(s => eqWeights.set(s, 1 / symbols.length));
    
    const impliedReturns = this.computeImpliedReturns(eqWeights, covariance, symbols);
    
    const userRisk = this.calculatePortfolioRisk(userWeights, covariance, symbols);
    const userExpectedReturn = this.calculatePortfolioReturn(userWeights, impliedReturns);
    
    const impliedViews = new Map<string, number>();
    for (const symbol of symbols) {
      const userW = userWeights.get(symbol) || 0;
      const eqW = eqWeights.get(symbol) || 0;
      impliedViews.set(symbol, userW - eqW);
    }
    
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
    
    return { userRisk, userExpectedReturn, impliedViews, riskContribution };
  }
}

// ================================================================
// NEURO-SYMBOLIC OPTIMIZER (COMBINED)
// ================================================================
class NeuroSymbolicOptimizer {
  private gnn = new AssetGraphNetwork();
  private hrp = new HierarchicalRiskParity();
  private taxOptimizer = new TaxAwareOptimizer();
  private blOptimizer = new BlackLittermanOptimizer();

  computeOptimalWeights(
    assetData: Map<string, AssetData>,
    correlationMatrix: CorrelationMatrix,
    regime: RegimeSignal,
    currentHoldings?: TaxLot[],
    investorViews?: InvestorView[]
  ): {
    weights: Map<string, number>;
    timestamp: Date;
    regime: string;
    expectedReturn: number;
    expectedVol: number;
    sharpeRatio: number;
    centralAssets: string[];
    methodology: string;
  } {
    this.gnn.buildGraph(correlationMatrix, assetData, 0.3);
    const embeddings = this.gnn.computeEmbeddings(2);
    const centralNodes = this.gnn.getCentralityNodes(5);

    // Start with HRP base weights
    let weights = this.hrp.computeWeights(correlationMatrix, assetData);

    // Adjust for regime
    weights = this.hrp.adjustForRegime(weights, regime, assetData);

    // If investor views provided, blend with Black-Litterman
    let methodology = 'GNN + HRP + Regime';
    if (investorViews && investorViews.length > 0) {
      const blResult = this.blOptimizer.optimize(correlationMatrix, assetData, investorViews, weights);
      weights = blResult.posteriorWeights;
      methodology = 'GNN + HRP + Regime + Black-Litterman';
    }

    // Set holdings if provided
    if (currentHoldings) {
      this.taxOptimizer.setHoldings(currentHoldings);
      methodology += ' + Tax-Aware';
    }

    // Calculate expected return and volatility
    let expectedReturn = 0;
    let expectedVol = 0;

    for (const [ticker, weight] of weights) {
      const data = assetData.get(ticker);
      if (data) {
        expectedReturn += weight * data.avgReturn;
        expectedVol += Math.pow(weight * data.volatility, 2);
      }
    }
    
    expectedVol = Math.sqrt(expectedVol);
    const sharpeRatio = expectedVol > 0 ? (expectedReturn - 0.04) / expectedVol : 0;

    return {
      weights,
      timestamp: new Date(),
      regime: regime.regime,
      expectedReturn: expectedReturn * 100,
      expectedVol: expectedVol * 100,
      sharpeRatio,
      centralAssets: centralNodes,
      methodology
    };
  }

  analyzeWeights(
    userWeights: Map<string, number>,
    correlationMatrix: CorrelationMatrix,
    assetData: Map<string, AssetData>
  ) {
    return this.blOptimizer.analyzeUserWeights(userWeights, correlationMatrix, assetData);
  }

  calculateTaxImpact(ticker: string, sharesToSell: number, currentPrice: number): number {
    return this.taxOptimizer.calculateTaxImpact(ticker, sharesToSell, currentPrice);
  }
}

// ================================================================
// EDGE FUNCTION HANDLER
// ================================================================
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { 
      action, 
      tickers, 
      weights,
      regime = { regime: 'normal', turbulenceIndex: 0, volatility: 0.15 },
      investorViews = [],
      currentHoldings = [],
      correlationMatrix,
      assetData: rawAssetData
    } = body;

    console.log(`[Portfolio Optimizer V2] Action: ${action}, Tickers: ${tickers?.length || 0}`);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Convert raw asset data to Map
    const assetData = new Map<string, AssetData>();
    if (rawAssetData) {
      for (const [ticker, data] of Object.entries(rawAssetData)) {
        assetData.set(ticker, data as AssetData);
      }
    }

    const optimizer = new NeuroSymbolicOptimizer();

    switch (action) {
      case 'optimize': {
        if (!correlationMatrix || !tickers || tickers.length < 2) {
          throw new Error('Need correlation matrix and at least 2 tickers');
        }

        const result = optimizer.computeOptimalWeights(
          assetData,
          correlationMatrix,
          regime,
          currentHoldings.length > 0 ? currentHoldings : undefined,
          investorViews.length > 0 ? investorViews : undefined
        );

        // Convert Map to object for JSON response
        const weightsObj: Record<string, number> = {};
        for (const [ticker, weight] of result.weights) {
          weightsObj[ticker] = weight;
        }

        return new Response(
          JSON.stringify({
            success: true,
            weights: weightsObj,
            regime: result.regime,
            expectedReturn: result.expectedReturn,
            expectedVol: result.expectedVol,
            sharpeRatio: result.sharpeRatio,
            centralAssets: result.centralAssets,
            methodology: result.methodology,
            timestamp: result.timestamp.toISOString()
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case 'analyze': {
        if (!correlationMatrix || !weights) {
          throw new Error('Need correlation matrix and weights for analysis');
        }

        const userWeights = new Map<string, number>();
        for (const [ticker, weight] of Object.entries(weights)) {
          userWeights.set(ticker, weight as number);
        }

        const analysis = optimizer.analyzeWeights(userWeights, correlationMatrix, assetData);

        // Convert Maps to objects
        const impliedViewsObj: Record<string, number> = {};
        const riskContributionObj: Record<string, number> = {};
        for (const [k, v] of analysis.impliedViews) impliedViewsObj[k] = v;
        for (const [k, v] of analysis.riskContribution) riskContributionObj[k] = v;

        return new Response(
          JSON.stringify({
            success: true,
            userRisk: analysis.userRisk,
            userExpectedReturn: analysis.userExpectedReturn,
            impliedViews: impliedViewsObj,
            riskContribution: riskContributionObj
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case 'tax-impact': {
        const { ticker, sharesToSell, currentPrice, holdings } = body;
        if (!ticker || !sharesToSell || !currentPrice) {
          throw new Error('Need ticker, sharesToSell, and currentPrice');
        }

        const taxOptimizer = new TaxAwareOptimizer();
        if (holdings) taxOptimizer.setHoldings(holdings);
        
        const taxImpact = taxOptimizer.calculateTaxImpact(ticker, sharesToSell, currentPrice);

        return new Response(
          JSON.stringify({ success: true, taxImpact }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case 'black-litterman': {
        if (!correlationMatrix || !investorViews) {
          throw new Error('Need correlation matrix and investor views');
        }

        const blOptimizer = new BlackLittermanOptimizer();
        const marketWeights = weights ? new Map(Object.entries(weights)) as Map<string, number> : undefined;
        
        const result = blOptimizer.optimize(correlationMatrix, assetData, investorViews, marketWeights);

        // Convert Maps to objects
        const posteriorReturnsObj: Record<string, number> = {};
        const posteriorWeightsObj: Record<string, number> = {};
        const impliedReturnsObj: Record<string, number> = {};
        const viewContributionObj: Record<string, number> = {};
        
        for (const [k, v] of result.posteriorReturns) posteriorReturnsObj[k] = v;
        for (const [k, v] of result.posteriorWeights) posteriorWeightsObj[k] = v;
        for (const [k, v] of result.impliedReturns) impliedReturnsObj[k] = v;
        for (const [k, v] of result.viewContribution) viewContributionObj[k] = v;

        return new Response(
          JSON.stringify({
            success: true,
            posteriorReturns: posteriorReturnsObj,
            posteriorWeights: posteriorWeightsObj,
            impliedReturns: impliedReturnsObj,
            viewContribution: viewContributionObj,
            blendedRisk: result.blendedRisk,
            blendedReturn: result.blendedReturn
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error: any) {
    console.error("[Portfolio Optimizer V2] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
