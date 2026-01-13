import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ================================================================
// EFFICIENT FRONTIER CALCULATION - PROPRIETARY ALGORITHM
// Monte Carlo simulation for portfolio optimization
// ================================================================

interface AssetData {
  ticker: string;
  volatility: number;
  avgReturn: number;
  skewness?: number;
  kurtosis?: number;
  volume?: number;
}

interface CorrelationMatrix {
  symbols: string[];
  matrix: number[][];
}

interface EfficientFrontierPoint {
  risk: number;
  return: number;
  sharpe: number;
  weights: Record<string, number>;
}

const NUM_FRONTIER_POINTS = 50;
const RISK_FREE_RATE = 0.05;

/**
 * Generate random portfolio weights that sum to 1
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
 * Calculate portfolio risk (standard deviation) using proper matrix multiplication
 * Formula: sqrt(w' * Σ * w)
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
 * Cov(i,j) = Corr(i,j) * σi * σj
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
 * Returns are expressed as annualized percentages
 */
function generateEfficientFrontier(
  correlationMatrix: CorrelationMatrix,
  assetData: Map<string, AssetData>,
  numSimulations: number = 5000
): EfficientFrontierPoint[] {
  const { symbols } = correlationMatrix;
  const n = symbols.length;
  
  if (n === 0) return [];
  
  console.log('[EfficientFrontier] Generating frontier for', n, 'assets');
  
  // Get expected returns from asset data (annualized as percentages)
  const expectedReturns = symbols.map(s => {
    const data = assetData.get(s);
    if (data && data.avgReturn !== undefined) {
      return data.avgReturn * 100;
    }
    return 8; // Default 8%
  });
  
  console.log('[EfficientFrontier] Expected returns:', expectedReturns.map(r => r.toFixed(2) + '%'));
  
  // Convert to covariance matrix
  const covariance = correlationToCovariance(correlationMatrix, assetData);
  
  // Monte Carlo simulation
  const portfolios: { risk: number; return: number; sharpe: number; weights: number[] }[] = [];
  
  for (let i = 0; i < numSimulations; i++) {
    const weights = generateRandomWeights(n);
    const ret = portfolioReturn(weights, expectedReturns);
    const risk = portfolioRisk(weights, covariance) * 100; // Convert to %
    
    const sharpe = risk > 0 ? (ret - RISK_FREE_RATE * 100) / risk : 0;
    
    portfolios.push({ risk, return: ret, sharpe, weights });
  }
  
  // Find the efficient frontier (Pareto optimal portfolios)
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
    const best = bucket.reduce((a, b) => a.return > b.return ? a : b);
    
    if (best.return > maxReturnSoFar) {
      maxReturnSoFar = best.return;
      
      const weightsObj: Record<string, number> = {};
      best.weights.forEach((w, i) => weightsObj[symbols[i]] = w);
      
      frontierPoints.push({
        risk: best.risk,
        return: best.return,
        sharpe: best.sharpe,
        weights: weightsObj,
      });
    }
  }
  
  // Sample to target number of points
  if (frontierPoints.length > NUM_FRONTIER_POINTS) {
    const step = Math.floor(frontierPoints.length / NUM_FRONTIER_POINTS);
    const sampled = frontierPoints.filter((_, i) => i % step === 0);
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
function findOptimalPortfolio(
  frontier: EfficientFrontierPoint[],
  riskTolerance: number
): EfficientFrontierPoint | null {
  if (frontier.length === 0) return null;
  
  const index = Math.floor((riskTolerance / 100) * (frontier.length - 1));
  return frontier[Math.max(0, Math.min(index, frontier.length - 1))];
}

/**
 * Find the maximum Sharpe ratio portfolio
 */
function findMaxSharpePortfolio(frontier: EfficientFrontierPoint[]): EfficientFrontierPoint | null {
  if (frontier.length === 0) return null;
  return frontier.reduce((best, p) => p.sharpe > best.sharpe ? p : best);
}

/**
 * Find minimum volatility portfolio
 */
function findMinVolPortfolio(frontier: EfficientFrontierPoint[]): EfficientFrontierPoint | null {
  if (frontier.length === 0) return null;
  return frontier.reduce((min, p) => p.risk < min.risk ? p : min);
}

/**
 * Get portfolio at specific risk level
 */
function getPortfolioAtRisk(
  frontier: EfficientFrontierPoint[],
  targetRisk: number
): EfficientFrontierPoint | null {
  if (frontier.length === 0) return null;
  
  return frontier.reduce((closest, p) => 
    Math.abs(p.risk - targetRisk) < Math.abs(closest.risk - targetRisk) ? p : closest
  );
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
      action = 'generate',
      correlationMatrix,
      assetData: rawAssetData,
      numSimulations = 5000,
      riskTolerance,
      targetRisk,
      frontier: providedFrontier
    } = body;

    console.log(`[Efficient Frontier] Action: ${action}`);

    // Convert raw asset data to Map
    const assetData = new Map<string, AssetData>();
    if (rawAssetData) {
      for (const [ticker, data] of Object.entries(rawAssetData)) {
        assetData.set(ticker, data as AssetData);
      }
    }

    switch (action) {
      case 'generate': {
        if (!correlationMatrix) {
          throw new Error('Correlation matrix is required');
        }

        const frontier = generateEfficientFrontier(correlationMatrix, assetData, numSimulations);
        const maxSharpe = findMaxSharpePortfolio(frontier);
        const minVol = findMinVolPortfolio(frontier);

        return new Response(
          JSON.stringify({
            success: true,
            frontier,
            maxSharpePortfolio: maxSharpe,
            minVolPortfolio: minVol,
            numPoints: frontier.length
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case 'find-optimal': {
        if (!providedFrontier || riskTolerance === undefined) {
          throw new Error('Frontier and riskTolerance are required');
        }

        const optimal = findOptimalPortfolio(providedFrontier, riskTolerance);

        return new Response(
          JSON.stringify({
            success: true,
            portfolio: optimal
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case 'find-at-risk': {
        if (!providedFrontier || targetRisk === undefined) {
          throw new Error('Frontier and targetRisk are required');
        }

        const portfolio = getPortfolioAtRisk(providedFrontier, targetRisk);

        return new Response(
          JSON.stringify({
            success: true,
            portfolio
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case 'find-max-sharpe': {
        if (!providedFrontier) {
          throw new Error('Frontier is required');
        }

        const maxSharpe = findMaxSharpePortfolio(providedFrontier);

        return new Response(
          JSON.stringify({
            success: true,
            portfolio: maxSharpe
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case 'find-min-vol': {
        if (!providedFrontier) {
          throw new Error('Frontier is required');
        }

        const minVol = findMinVolPortfolio(providedFrontier);

        return new Response(
          JSON.stringify({
            success: true,
            portfolio: minVol
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error: any) {
    console.error("[Efficient Frontier] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
