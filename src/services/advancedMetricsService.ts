// Advanced Risk Metrics Service
// CVaR, Sortino, Liquidity Score, and more institutional metrics
// Aligned with Portfolio Visualizer methodology
// Reference: https://www.portfoliovisualizer.com/faq

import { LIQUIDITY_SCORES } from '@/types/portfolio';
import {
  arithmeticMean,
  standardDeviation,
  calculateVaR as calcVaR,
  calculateCVaR as calcCVaR,
  calculateSortinoRatio,
  calculateCalmarRatio as calcCalmar,
  calculateTreynorRatio as calcTreynor,
  calculateInformationRatio as calcIR,
  calculateOmega as calcOmega,
  calculateTailRatio as calcTailRatio,
  calculateSkewness as calcSkewness,
  calculateKurtosis as calcKurtosis,
  calculateUlcerIndex as calcUlcer,
  calculateMaxDrawdown
} from './portfolioMetricsService';

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
  return calcCVaR(returns, confidence);
}

/**
 * Calculate Value at Risk
 * The maximum expected loss at X% confidence
 */
export function calculateVaR(returns: number[], confidence: number = 0.95): number {
  return calcVaR(returns, confidence);
}

/**
 * Calculate Sortino Ratio
 * Like Sharpe but uses downside deviation only
 */
export function calculateSortino(
  returns: number[],
  riskFreeRate: number = RISK_FREE_RATE
): number {
  return calculateSortinoRatio(returns, riskFreeRate);
}

/**
 * Calculate Calmar Ratio
 * CAGR / Max Drawdown
 */
export function calculateCalmarRatio(annualizedReturn: number, maxDrawdown: number): number {
  return calcCalmar(annualizedReturn / 100, maxDrawdown);
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
  return calcTreynor(annualizedReturn / 100, beta, riskFreeRate);
}

/**
 * Calculate Information Ratio
 * Active return / Tracking error
 */
export function calculateInformationRatio(
  portfolioReturns: number[],
  benchmarkReturns: number[]
): number {
  return calcIR(portfolioReturns, benchmarkReturns);
}

/**
 * Calculate Omega Ratio
 * Probability-weighted ratio of gains to losses above/below threshold
 */
export function calculateOmega(returns: number[], threshold: number = 0): number {
  return calcOmega(returns, threshold);
}

/**
 * Calculate Tail Ratio
 * Ratio of average gains in top 5% to average losses in bottom 5%
 */
export function calculateTailRatio(returns: number[]): number {
  return calcTailRatio(returns);
}

/**
 * Calculate Skewness
 */
export function calculateSkewness(returns: number[]): number {
  return calcSkewness(returns);
}

/**
 * Calculate Kurtosis (excess kurtosis)
 */
export function calculateKurtosis(returns: number[]): number {
  return calcKurtosis(returns);
}

/**
 * Calculate Ulcer Index
 * Measures depth and duration of drawdowns
 */
export function calculateUlcerIndex(values: number[]): number {
  return calcUlcer(values);
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
