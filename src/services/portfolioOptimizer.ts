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

// Defensive and growth asset classifications
const DEFENSIVE_ASSETS = ['GLD', 'IAU', 'TLT', 'TIP', 'VNQ', 'XLRE', 'DBC', 'SCHP', 'BND', 'AGG', 'SHY', 'IEF'];
const GROWTH_ASSETS = ['QQQ', 'XLK', 'VGT', 'IGV', 'ARKK', 'SMH', 'SOXX', 'XLY', 'IWM', 'VBK', 'MTUM'];

/**
 * Graph Neural Network for asset relationship modeling
 */
export class AssetGraphNetwork {
  private adjacencyMatrix: number[][] = [];
  private nodeFeatures: Map<string, number[]> = new Map();
  private tickers: string[] = [];

  /**
   * Build graph from correlation matrix and asset data
   */
  buildGraph(
    correlationMatrix: CorrelationMatrix,
    assetData: Map<string, AssetData>,
    threshold: number = 0.3
  ): void {
    const { symbols, matrix } = correlationMatrix;
    this.tickers = symbols;
    const n = symbols.length;

    // Create adjacency matrix where edges = |correlation| > threshold
    this.adjacencyMatrix = Array(n).fill(null).map(() => Array(n).fill(0));
    
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i !== j && Math.abs(matrix[i][j]) > threshold) {
          this.adjacencyMatrix[i][j] = matrix[i][j];
        }
      }
    }

    // Extract node features for each asset
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
        // Default features if data not available
        this.nodeFeatures.set(ticker, [0.15 * 10, 0.1 * 100, 0, 3 / 10, 15 / 10]);
      }
    }

    console.log('[GNN] Built graph with', n, 'nodes');
  }

  /**
   * Compute embeddings using message passing
   */
  computeEmbeddings(numLayers: number = 2): AssetEmbedding[] {
    const n = this.tickers.length;
    if (n === 0) return [];

    // Initialize embeddings from node features
    let embeddings: number[][] = this.tickers.map(ticker => {
      const features = this.nodeFeatures.get(ticker) || [0, 0, 0, 0, 0];
      return [...features];
    });

    // Message passing layers
    for (let layer = 0; layer < numLayers; layer++) {
      const newEmbeddings: number[][] = [];
      
      for (let i = 0; i < n; i++) {
        const currentEmb = embeddings[i];
        const featureDim = currentEmb.length;
        const aggregated = Array(featureDim).fill(0);
        let weightSum = 0;

        // Aggregate neighbor embeddings weighted by adjacency
        for (let j = 0; j < n; j++) {
          if (this.adjacencyMatrix[i][j] !== 0) {
            const weight = Math.abs(this.adjacencyMatrix[i][j]);
            for (let k = 0; k < featureDim; k++) {
              aggregated[k] += embeddings[j][k] * weight;
            }
            weightSum += weight;
          }
        }

        // Normalize and combine with self
        const combined = currentEmb.map((val, idx) => {
          const neighborVal = weightSum > 0 ? aggregated[idx] / weightSum : 0;
          return val + 0.5 * neighborVal; // Residual connection
        });

        // ReLU activation
        newEmbeddings.push(combined.map(v => Math.max(0, v)));
      }

      embeddings = newEmbeddings;
    }

    // Calculate centrality and cluster assignment
    const results: AssetEmbedding[] = this.tickers.map((ticker, i) => {
      // Centrality: sum of absolute adjacency values
      const centrality = this.adjacencyMatrix[i].reduce((sum, val) => sum + Math.abs(val), 0) / n;
      
      // Cluster based on embedding mean (simple k-means-like assignment)
      const embMean = embeddings[i].reduce((a, b) => a + b, 0) / embeddings[i].length;
      const cluster = embMean < 1 ? 0 : embMean < 3 ? 1 : 2;

      return {
        ticker,
        embedding: embeddings[i],
        centrality,
        cluster
      };
    });

    // Sort by centrality descending
    results.sort((a, b) => b.centrality - a.centrality);

    const centralNodes = results.slice(0, 5).map(r => r.ticker);
    console.log('[GNN] Central nodes:', centralNodes);

    return results;
  }

  /**
   * Get top N nodes by centrality
   */
  getCentralityNodes(topN: number = 5): string[] {
    const embeddings = this.computeEmbeddings();
    return embeddings.slice(0, topN).map(e => e.ticker);
  }
}

/**
 * Hierarchical Risk Parity implementation
 */
export class HierarchicalRiskParity {
  /**
   * Compute HRP weights from correlation matrix
   */
  computeWeights(
    correlationMatrix: CorrelationMatrix,
    assetData: Map<string, AssetData>
  ): Map<string, number> {
    console.log('[HRP] Computing weights...');
    
    const { symbols, matrix } = correlationMatrix;
    const n = symbols.length;

    if (n === 0) return new Map();
    if (n === 1) return new Map([[symbols[0], 1]]);

    // Convert correlation to distance: sqrt(2 * (1 - corr))
    const distanceMatrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        distanceMatrix[i][j] = Math.sqrt(2 * (1 - matrix[i][j]));
      }
    }

    // Hierarchical clustering (single linkage) - simplified
    const order = this.getQuasiDiagonalOrder(distanceMatrix, symbols);

    // Get volatilities
    const volatilities = new Map<string, number>();
    for (const ticker of symbols) {
      const data = assetData.get(ticker);
      volatilities.set(ticker, data?.volatility || 0.2);
    }

    // Recursive bisection
    const weights = this.recursiveBisection(order, volatilities, matrix, symbols);

    return weights;
  }

  /**
   * Get quasi-diagonal ordering using hierarchical clustering
   */
  private getQuasiDiagonalOrder(distanceMatrix: number[][], symbols: string[]): string[] {
    const n = symbols.length;
    if (n <= 2) return symbols;

    // Simple ordering based on average distance
    const avgDistances = symbols.map((_, i) => ({
      idx: i,
      avgDist: distanceMatrix[i].reduce((a, b) => a + b, 0) / n
    }));
    
    avgDistances.sort((a, b) => a.avgDist - b.avgDist);
    return avgDistances.map(d => symbols[d.idx]);
  }

  /**
   * Recursive bisection for weight allocation
   */
  private recursiveBisection(
    order: string[],
    volatilities: Map<string, number>,
    corrMatrix: number[][],
    allSymbols: string[]
  ): Map<string, number> {
    const weights = new Map<string, number>();
    
    // Initialize all weights to 0
    order.forEach(ticker => weights.set(ticker, 0));

    // Recursive function
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

      // Split cluster in half
      const mid = Math.floor(items.length / 2);
      const left = items.slice(0, mid);
      const right = items.slice(mid);

      // Calculate variance of each half (simplified: sum of volatilities)
      const leftVar = left.reduce((sum, t) => sum + Math.pow(volatilities.get(t) || 0.2, 2), 0);
      const rightVar = right.reduce((sum, t) => sum + Math.pow(volatilities.get(t) || 0.2, 2), 0);

      // Allocate inversely proportional to variance
      const totalVar = leftVar + rightVar;
      const leftAlloc = allocation * (rightVar / totalVar);
      const rightAlloc = allocation * (leftVar / totalVar);

      allocate(left, leftAlloc);
      allocate(right, rightAlloc);
    };

    allocate(order, 1);
    return weights;
  }

  /**
   * Adjust weights based on market regime
   */
  adjustForRegime(
    baseWeights: Map<string, number>,
    regime: RegimeSignal,
    assetData: Map<string, AssetData>,
    realAssets: string[]
  ): Map<string, number> {
    console.log('[Optimizer] Regime:', regime.regime, 'adjusting weights');

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

    // Normalize to sum to 1
    for (const [ticker, weight] of adjustedWeights) {
      adjustedWeights.set(ticker, weight / total);
    }

    return adjustedWeights;
  }
}

/**
 * Tax-aware portfolio optimizer
 */
export class TaxAwareOptimizer {
  private taxLots: TaxLot[] = [];
  private shortTermRate: number = 0.35;
  private longTermRate: number = 0.15;

  /**
   * Set current holdings
   */
  setHoldings(lots: TaxLot[]): void {
    this.taxLots = lots;
  }

  /**
   * Calculate tax impact of selling shares
   */
  calculateTaxImpact(
    ticker: string,
    sharesToSell: number,
    currentPrice: number
  ): number {
    // Get lots for ticker sorted by date (FIFO)
    const tickerLots = this.taxLots
      .filter(lot => lot.ticker === ticker)
      .sort((a, b) => a.purchaseDate.getTime() - b.purchaseDate.getTime());

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
        // Determine tax rate based on holding period
        const isLongTerm = lot.purchaseDate < oneYearAgo;
        const rate = isLongTerm ? this.longTermRate : this.shortTermRate;
        totalTax += gain * rate;
      }

      remainingToSell -= sharesFromLot;
    }

    return totalTax;
  }
}

/**
 * Combined neuro-symbolic optimizer
 */
export class NeuroSymbolicOptimizer {
  private gnn: AssetGraphNetwork;
  private hrp: HierarchicalRiskParity;
  private taxOptimizer: TaxAwareOptimizer;

  constructor() {
    this.gnn = new AssetGraphNetwork();
    this.hrp = new HierarchicalRiskParity();
    this.taxOptimizer = new TaxAwareOptimizer();
  }

  /**
   * Compute optimal portfolio weights
   */
  computeOptimalWeights(
    assetData: Map<string, AssetData>,
    correlationMatrix: CorrelationMatrix,
    regime: RegimeSignal,
    realAssets: string[],
    currentHoldings?: TaxLot[]
  ): PortfolioWeights {
    // Build GNN and compute embeddings
    this.gnn.buildGraph(correlationMatrix, assetData, 0.3);
    const embeddings = this.gnn.computeEmbeddings(2);

    // Get central nodes for reference
    const centralNodes = this.gnn.getCentralityNodes(5);
    console.log('[Optimizer] Central assets:', centralNodes);

    // Compute HRP base weights
    const baseWeights = this.hrp.computeWeights(correlationMatrix, assetData);

    // Adjust for regime
    const adjustedWeights = this.hrp.adjustForRegime(
      baseWeights,
      regime,
      assetData,
      realAssets
    );

    // Set holdings if provided
    if (currentHoldings) {
      this.taxOptimizer.setHoldings(currentHoldings);
    }

    // Calculate expected return and volatility
    let expectedReturn = 0;
    let expectedVol = 0;
    const weights = adjustedWeights;

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
      weights: adjustedWeights,
      timestamp: new Date(),
      regime: regime.regime,
      expectedReturn: expectedReturn * 100,
      expectedVol: expectedVol * 100,
      sharpeRatio
    };
  }
}
