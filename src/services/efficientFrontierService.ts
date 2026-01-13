/**
 * Efficient Frontier Service
 * 
 * Synchronous client-side implementation for backwards compatibility.
 * For maximum IP protection, use the server-side edge function instead.
 */

import { CorrelationMatrix } from './backtesterService';
import { AssetData } from './portfolioOptimizer';
import { EfficientFrontierPoint } from '@/types/portfolio';

const NUM_FRONTIER_POINTS = 50;
const RISK_FREE_RATE = 0.05;

function generateRandomWeights(n: number): number[] {
  const weights = Array(n).fill(0).map(() => Math.random());
  const sum = weights.reduce((a, b) => a + b, 0);
  return weights.map(w => w / sum);
}

function portfolioReturn(weights: number[], returns: number[]): number {
  return weights.reduce((sum, w, i) => sum + w * returns[i], 0);
}

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

function correlationToCovariance(correlationMatrix: CorrelationMatrix, assetData: Map<string, AssetData>): number[][] {
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

export function generateEfficientFrontier(
  correlationMatrix: CorrelationMatrix,
  assetData: Map<string, AssetData>,
  numSimulations: number = 5000
): EfficientFrontierPoint[] {
  const { symbols } = correlationMatrix;
  const n = symbols.length;
  if (n === 0) return [];

  const expectedReturns = symbols.map(s => {
    const data = assetData.get(s);
    return data?.avgReturn !== undefined ? data.avgReturn * 100 : 8;
  });

  const covariance = correlationToCovariance(correlationMatrix, assetData);
  const portfolios: { risk: number; return: number; sharpe: number; weights: number[] }[] = [];

  for (let i = 0; i < numSimulations; i++) {
    const weights = generateRandomWeights(n);
    const ret = portfolioReturn(weights, expectedReturns);
    const risk = portfolioRisk(weights, covariance) * 100;
    const sharpe = risk > 0 ? (ret - 5) / risk : 0;
    portfolios.push({ risk, return: ret, sharpe, weights });
  }

  portfolios.sort((a, b) => a.risk - b.risk);
  const frontierPoints: EfficientFrontierPoint[] = [];
  let maxReturnSoFar = -Infinity;
  const riskBuckets = new Map<number, typeof portfolios[0][]>();

  for (const p of portfolios) {
    const bucket = Math.round(p.risk * 2) / 2;
    if (!riskBuckets.has(bucket)) riskBuckets.set(bucket, []);
    riskBuckets.get(bucket)!.push(p);
  }

  for (const [_, bucket] of Array.from(riskBuckets.entries()).sort((a, b) => a[0] - b[0])) {
    const best = bucket.reduce((a, b) => a.return > b.return ? a : b);
    if (best.return > maxReturnSoFar) {
      maxReturnSoFar = best.return;
      const weightsMap = new Map<string, number>();
      best.weights.forEach((w, i) => weightsMap.set(symbols[i], w));
      frontierPoints.push({ risk: best.risk, return: best.return, sharpe: best.sharpe, weights: weightsMap });
    }
  }

  if (frontierPoints.length > NUM_FRONTIER_POINTS) {
    const step = Math.floor(frontierPoints.length / NUM_FRONTIER_POINTS);
    return frontierPoints.filter((_, i) => i % step === 0);
  }
  return frontierPoints;
}

export function findOptimalPortfolio(frontier: EfficientFrontierPoint[], riskTolerance: number): EfficientFrontierPoint | null {
  if (frontier.length === 0) return null;
  const index = Math.floor((riskTolerance / 100) * (frontier.length - 1));
  return frontier[Math.max(0, Math.min(index, frontier.length - 1))];
}

export function findMaxSharpePortfolio(frontier: EfficientFrontierPoint[]): EfficientFrontierPoint | null {
  if (frontier.length === 0) return null;
  return frontier.reduce((best, p) => p.sharpe > best.sharpe ? p : best);
}

export function findMinVolPortfolio(frontier: EfficientFrontierPoint[]): EfficientFrontierPoint | null {
  if (frontier.length === 0) return null;
  return frontier.reduce((min, p) => p.risk < min.risk ? p : min);
}

export function getPortfolioAtRisk(frontier: EfficientFrontierPoint[], targetRisk: number): EfficientFrontierPoint | null {
  if (frontier.length === 0) return null;
  return frontier.reduce((closest, p) => Math.abs(p.risk - targetRisk) < Math.abs(closest.risk - targetRisk) ? p : closest);
}
