// Efficient Frontier Calculation Service
// Generates risk-return tradeoff curve for portfolio optimization

import { CorrelationMatrix } from './backtesterService';
import { AssetData } from './portfolioOptimizer';
import { EfficientFrontierPoint } from '@/types/portfolio';

const NUM_FRONTIER_POINTS = 50;

/**
 * Generate random portfolio weights
 */
function generateRandomWeights(n: number): number[] {
  const weights = Array(n).fill(0).map(() => Math.random());
  const sum = weights.reduce((a, b) => a + b, 0);
  return weights.map(w => w / sum);
}

/**
 * Calculate portfolio return given weights and expected returns
 */
function portfolioReturn(weights: number[], returns: number[]): number {
  return weights.reduce((sum, w, i) => sum + w * returns[i], 0);
}

/**
 * Calculate portfolio risk (standard deviation) given weights and covariance matrix
 */
function portfolioRisk(weights: number[], covariance: number[][]): number {
  let variance = 0;
  const n = weights.length;
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      variance += weights[i] * weights[j] * covariance[i][j];
    }
  }
  
  return Math.sqrt(Math.max(0, variance));
}

/**
 * Convert correlation matrix to covariance using volatilities
 */
function correlationToCovariance(
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

/**
 * Generate efficient frontier using Monte Carlo simulation
 */
export function generateEfficientFrontier(
  correlationMatrix: CorrelationMatrix,
  assetData: Map<string, AssetData>,
  numSimulations: number = 5000
): EfficientFrontierPoint[] {
  const { symbols } = correlationMatrix;
  const n = symbols.length;
  
  if (n === 0) return [];
  
  console.log('[EfficientFrontier] Generating frontier for', n, 'assets');
  
  // Get expected returns from asset data
  const expectedReturns = symbols.map(s => (assetData.get(s)?.avgReturn || 0.08) * 100);
  
  // Convert to covariance matrix
  const covariance = correlationToCovariance(correlationMatrix, assetData);
  
  // Monte Carlo simulation
  const portfolios: { risk: number; return: number; sharpe: number; weights: number[] }[] = [];
  
  for (let i = 0; i < numSimulations; i++) {
    const weights = generateRandomWeights(n);
    const ret = portfolioReturn(weights, expectedReturns);
    const risk = portfolioRisk(weights, covariance) * 100; // Convert to %
    
    // Risk-free rate 5%
    const sharpe = risk > 0 ? (ret - 5) / risk : 0;
    
    portfolios.push({ risk, return: ret, sharpe, weights });
  }
  
  // Find the efficient frontier (Pareto optimal portfolios)
  // Sort by risk and filter for increasing returns
  portfolios.sort((a, b) => a.risk - b.risk);
  
  const frontierPoints: EfficientFrontierPoint[] = [];
  let maxReturnSoFar = -Infinity;
  
  // Bucket by risk level to get smooth frontier
  const riskBuckets = new Map<number, typeof portfolios[0][]>();
  
  for (const p of portfolios) {
    const bucket = Math.round(p.risk * 2) / 2; // 0.5% buckets
    if (!riskBuckets.has(bucket)) {
      riskBuckets.set(bucket, []);
    }
    riskBuckets.get(bucket)!.push(p);
  }
  
  // Take best portfolio from each bucket
  const sortedBuckets = Array.from(riskBuckets.entries()).sort((a, b) => a[0] - b[0]);
  
  for (const [_, bucket] of sortedBuckets) {
    // Find highest return in this risk bucket
    const best = bucket.reduce((a, b) => a.return > b.return ? a : b);
    
    if (best.return > maxReturnSoFar) {
      maxReturnSoFar = best.return;
      
      const weightsMap = new Map<string, number>();
      best.weights.forEach((w, i) => weightsMap.set(symbols[i], w));
      
      frontierPoints.push({
        risk: best.risk,
        return: best.return,
        sharpe: best.sharpe,
        weights: weightsMap,
      });
    }
  }
  
  // Sample to target number of points
  if (frontierPoints.length > NUM_FRONTIER_POINTS) {
    const step = Math.floor(frontierPoints.length / NUM_FRONTIER_POINTS);
    const sampled = frontierPoints.filter((_, i) => i % step === 0);
    // Always include first and last
    if (!sampled.includes(frontierPoints[0])) sampled.unshift(frontierPoints[0]);
    if (!sampled.includes(frontierPoints[frontierPoints.length - 1])) {
      sampled.push(frontierPoints[frontierPoints.length - 1]);
    }
    return sampled;
  }
  
  console.log('[EfficientFrontier] Generated', frontierPoints.length, 'points');
  return frontierPoints;
}

/**
 * Find optimal portfolio on the efficient frontier for a given risk tolerance
 */
export function findOptimalPortfolio(
  frontier: EfficientFrontierPoint[],
  riskTolerance: number // 0-100
): EfficientFrontierPoint | null {
  if (frontier.length === 0) return null;
  
  // Map risk tolerance to position on frontier
  const index = Math.floor((riskTolerance / 100) * (frontier.length - 1));
  return frontier[Math.max(0, Math.min(index, frontier.length - 1))];
}

/**
 * Find the maximum Sharpe ratio portfolio
 */
export function findMaxSharpePortfolio(
  frontier: EfficientFrontierPoint[]
): EfficientFrontierPoint | null {
  if (frontier.length === 0) return null;
  return frontier.reduce((best, p) => p.sharpe > best.sharpe ? p : best);
}

/**
 * Find minimum volatility portfolio
 */
export function findMinVolPortfolio(
  frontier: EfficientFrontierPoint[]
): EfficientFrontierPoint | null {
  if (frontier.length === 0) return null;
  return frontier.reduce((min, p) => p.risk < min.risk ? p : min);
}

/**
 * Get portfolio at specific risk level
 */
export function getPortfolioAtRisk(
  frontier: EfficientFrontierPoint[],
  targetRisk: number
): EfficientFrontierPoint | null {
  if (frontier.length === 0) return null;
  
  // Find closest portfolio to target risk
  return frontier.reduce((closest, p) => 
    Math.abs(p.risk - targetRisk) < Math.abs(closest.risk - targetRisk) ? p : closest
  );
}
