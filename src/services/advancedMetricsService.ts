// Advanced Risk Metrics Service
// CVaR, Sortino, Liquidity Score, and more institutional metrics

import { LIQUIDITY_SCORES } from '@/types/portfolio';

export interface AdvancedRiskMetrics {
  // Value at Risk metrics
  var95: number; // 95% VaR
  var99: number; // 99% VaR
  cvar95: number; // Conditional VaR (Expected Shortfall) at 95%
  cvar99: number;
  
  // Risk-adjusted returns
  sortinoRatio: number;
  calmarRatio: number;
  treynorRatio: number;
  informationRatio: number;
  omega: number;
  
  // Tail risk
  tailRatio: number; // Ratio of gains to losses in tails
  skewness: number;
  kurtosis: number;
  
  // Drawdown metrics
  maxDrawdown: number;
  avgDrawdown: number;
  ulcerIndex: number; // Sqrt of mean squared drawdowns
  
  // Liquidity
  liquidityScore: number; // Weighted average 0-100
  daysToLiquidate: number; // Estimated days to liquidate portfolio
}

const RISK_FREE_RATE = 0.05; // 5% annual

/**
 * Calculate Conditional Value at Risk (CVaR / Expected Shortfall)
 * Average loss in the worst X% of cases
 */
export function calculateCVaR(returns: number[], confidence: number = 0.95): number {
  if (returns.length === 0) return 0;
  
  const sorted = [...returns].sort((a, b) => a - b);
  const cutoffIndex = Math.floor(sorted.length * (1 - confidence));
  const tailReturns = sorted.slice(0, Math.max(1, cutoffIndex));
  
  const cvar = tailReturns.reduce((sum, r) => sum + r, 0) / tailReturns.length;
  return Math.abs(cvar) * 100; // Return as positive percentage
}

/**
 * Calculate Value at Risk
 * The maximum expected loss at X% confidence
 */
export function calculateVaR(returns: number[], confidence: number = 0.95): number {
  if (returns.length === 0) return 0;
  
  const sorted = [...returns].sort((a, b) => a - b);
  const index = Math.floor(sorted.length * (1 - confidence));
  
  return Math.abs(sorted[index] || 0) * 100;
}

/**
 * Calculate Sortino Ratio
 * Like Sharpe but uses downside deviation only
 */
export function calculateSortinoRatio(
  returns: number[],
  riskFreeRate: number = RISK_FREE_RATE
): number {
  if (returns.length === 0) return 0;
  
  const dailyRf = riskFreeRate / 252;
  const excessReturns = returns.map(r => r - dailyRf);
  const meanExcess = excessReturns.reduce((a, b) => a + b, 0) / excessReturns.length;
  
  // Downside deviation - only negative returns
  const negativeReturns = excessReturns.filter(r => r < 0);
  if (negativeReturns.length === 0) return meanExcess > 0 ? 10 : 0;
  
  const downsideVariance = negativeReturns.reduce((sum, r) => sum + r * r, 0) / negativeReturns.length;
  const downsideDeviation = Math.sqrt(downsideVariance);
  
  if (downsideDeviation === 0) return 0;
  return (meanExcess / downsideDeviation) * Math.sqrt(252);
}

/**
 * Calculate Calmar Ratio
 * CAGR / Max Drawdown
 */
export function calculateCalmarRatio(annualizedReturn: number, maxDrawdown: number): number {
  if (maxDrawdown === 0) return 0;
  return annualizedReturn / maxDrawdown;
}

/**
 * Calculate Treynor Ratio
 * Excess return per unit of systematic risk (beta)
 */
export function calculateTreynorRatio(
  annualizedReturn: number,
  beta: number,
  riskFreeRate: number = RISK_FREE_RATE
): number {
  if (beta === 0) return 0;
  return (annualizedReturn / 100 - riskFreeRate) / beta;
}

/**
 * Calculate Information Ratio
 * Active return / Tracking error
 */
export function calculateInformationRatio(
  portfolioReturns: number[],
  benchmarkReturns: number[]
): number {
  if (portfolioReturns.length === 0 || benchmarkReturns.length === 0) return 0;
  
  const minLen = Math.min(portfolioReturns.length, benchmarkReturns.length);
  const activeReturns = portfolioReturns.slice(0, minLen).map((r, i) => r - benchmarkReturns[i]);
  
  const meanActive = activeReturns.reduce((a, b) => a + b, 0) / activeReturns.length;
  const variance = activeReturns.reduce((sum, r) => sum + (r - meanActive) ** 2, 0) / activeReturns.length;
  const trackingError = Math.sqrt(variance);
  
  if (trackingError === 0) return 0;
  return (meanActive / trackingError) * Math.sqrt(252);
}

/**
 * Calculate Omega Ratio
 * Probability-weighted ratio of gains to losses above/below threshold
 */
export function calculateOmega(returns: number[], threshold: number = 0): number {
  const gains = returns.filter(r => r > threshold).reduce((sum, r) => sum + (r - threshold), 0);
  const losses = returns.filter(r => r < threshold).reduce((sum, r) => sum + (threshold - r), 0);
  
  if (losses === 0) return gains > 0 ? 10 : 1;
  return 1 + (gains / losses);
}

/**
 * Calculate Tail Ratio
 * Ratio of average gains in top 5% to average losses in bottom 5%
 */
export function calculateTailRatio(returns: number[]): number {
  if (returns.length < 20) return 1;
  
  const sorted = [...returns].sort((a, b) => a - b);
  const cutoff = Math.max(1, Math.floor(sorted.length * 0.05));
  
  const bottomTail = sorted.slice(0, cutoff);
  const topTail = sorted.slice(-cutoff);
  
  const avgLoss = Math.abs(bottomTail.reduce((a, b) => a + b, 0) / bottomTail.length);
  const avgGain = topTail.reduce((a, b) => a + b, 0) / topTail.length;
  
  if (avgLoss === 0) return avgGain > 0 ? 10 : 1;
  return avgGain / avgLoss;
}

/**
 * Calculate Ulcer Index
 * Measures depth and duration of drawdowns
 */
export function calculateUlcerIndex(values: number[]): number {
  if (values.length === 0) return 0;
  
  let peak = values[0];
  let sumSquaredDrawdowns = 0;
  
  for (const value of values) {
    if (value > peak) peak = value;
    const drawdownPercent = peak > 0 ? ((peak - value) / peak) * 100 : 0;
    sumSquaredDrawdowns += drawdownPercent * drawdownPercent;
  }
  
  return Math.sqrt(sumSquaredDrawdowns / values.length);
}

/**
 * Calculate Skewness
 */
export function calculateSkewness(returns: number[]): number {
  if (returns.length < 3) return 0;
  
  const n = returns.length;
  const mean = returns.reduce((a, b) => a + b, 0) / n;
  const variance = returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / n;
  const stdDev = Math.sqrt(variance);
  
  if (stdDev === 0) return 0;
  
  const skewSum = returns.reduce((sum, r) => sum + ((r - mean) / stdDev) ** 3, 0);
  return (n / ((n - 1) * (n - 2))) * skewSum;
}

/**
 * Calculate Kurtosis (excess kurtosis)
 */
export function calculateKurtosis(returns: number[]): number {
  if (returns.length < 4) return 0;
  
  const n = returns.length;
  const mean = returns.reduce((a, b) => a + b, 0) / n;
  const variance = returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / n;
  const stdDev = Math.sqrt(variance);
  
  if (stdDev === 0) return 0;
  
  const kurtSum = returns.reduce((sum, r) => sum + ((r - mean) / stdDev) ** 4, 0);
  const kurtosis = (kurtSum / n);
  
  return kurtosis - 3; // Excess kurtosis
}

/**
 * Calculate portfolio liquidity score (0-100)
 */
export function calculateLiquidityScore(
  weights: Map<string, number>,
  customScores?: Map<string, number>
): number {
  let totalScore = 0;
  let totalWeight = 0;
  
  for (const [symbol, weight] of weights) {
    const score = customScores?.get(symbol) ?? LIQUIDITY_SCORES[symbol] ?? 50;
    totalScore += weight * score;
    totalWeight += weight;
  }
  
  return totalWeight > 0 ? totalScore / totalWeight : 50;
}

/**
 * Estimate days to liquidate portfolio
 * Based on average daily volume and position sizes
 */
export function estimateLiquidationDays(
  portfolioValue: number,
  weights: Map<string, number>,
  avgDailyVolumes: Map<string, number>,
  prices: Map<string, number>,
  maxDailyPercent: number = 0.1 // Max 10% of daily volume
): number {
  let maxDays = 0;
  
  for (const [symbol, weight] of weights) {
    const positionValue = portfolioValue * weight;
    const avgVolume = avgDailyVolumes.get(symbol) || 1000000;
    const price = prices.get(symbol) || 100;
    
    const avgDailyDollarVolume = avgVolume * price;
    const maxDailyLiquidation = avgDailyDollarVolume * maxDailyPercent;
    
    const daysToLiquidate = positionValue / maxDailyLiquidation;
    maxDays = Math.max(maxDays, daysToLiquidate);
  }
  
  return Math.ceil(maxDays);
}

/**
 * Calculate all advanced metrics
 */
export function calculateAllAdvancedMetrics(
  dailyReturns: number[],
  portfolioValues: number[],
  weights: Map<string, number>,
  annualizedReturn: number,
  maxDrawdown: number,
  beta: number = 1,
  benchmarkReturns?: number[]
): AdvancedRiskMetrics {
  return {
    var95: calculateVaR(dailyReturns, 0.95),
    var99: calculateVaR(dailyReturns, 0.99),
    cvar95: calculateCVaR(dailyReturns, 0.95),
    cvar99: calculateCVaR(dailyReturns, 0.99),
    sortinoRatio: calculateSortinoRatio(dailyReturns),
    calmarRatio: calculateCalmarRatio(annualizedReturn, maxDrawdown),
    treynorRatio: calculateTreynorRatio(annualizedReturn, beta),
    informationRatio: benchmarkReturns ? calculateInformationRatio(dailyReturns, benchmarkReturns) : 0,
    omega: calculateOmega(dailyReturns),
    tailRatio: calculateTailRatio(dailyReturns),
    skewness: calculateSkewness(dailyReturns),
    kurtosis: calculateKurtosis(dailyReturns),
    maxDrawdown,
    avgDrawdown: 0, // Would need drawdown series
    ulcerIndex: calculateUlcerIndex(portfolioValues),
    liquidityScore: calculateLiquidityScore(weights),
    daysToLiquidate: 1, // Default
  };
}
