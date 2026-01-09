// Advanced Risk Metrics Service
// CVaR, Sortino, Liquidity Score, and more institutional metrics
// Aligned with Portfolio Visualizer methodology
// Reference: https://www.portfoliovisualizer.com/faq

import { LIQUIDITY_SCORES } from '@/types/portfolio';
import {
  arithmeticMean,
  geometricMean,
  standardDeviation,
  annualizedVolatility,
  calculateVaR as calcVaR,
  calculateCVaR as calcCVaR,
  calculateSharpeRatio,
  calculateSortinoRatio,
  calculateCalmarRatio as calcCalmar,
  calculateTreynorRatio as calcTreynor,
  calculateInformationRatio as calcIR,
  calculateOmega as calcOmega,
  calculateTailRatio as calcTailRatio,
  calculateSkewness as calcSkewness,
  calculateKurtosis as calcKurtosis,
  calculateUlcerIndex as calcUlcer,
  calculateMaxDrawdown,
  calculateBetaAlpha,
  calculateCAGR
} from './portfolioMetricsService';

export interface AdvancedRiskMetrics {
  // Core Returns
  totalReturn: number; // Total cumulative return %
  cagr: number; // Compound annual growth rate %
  annualizedReturn: number; // Annualized arithmetic return %
  bestYear: number; // Best calendar year return %
  worstYear: number; // Worst calendar year return %
  bestMonth: number; // Best month return %
  worstMonth: number; // Worst month return %
  positiveMonths: number; // % of months with positive returns
  avgMonthlyReturn: number; // Average monthly return %
  monthlyVolatility: number; // Standard deviation of monthly returns %
  
  // Benchmark comparison
  alpha: number; // Jensen's alpha vs benchmark
  beta: number; // Beta vs benchmark
  rSquared: number; // R-squared vs benchmark
  trackingError: number; // Tracking error vs benchmark
  upCapture: number; // Upside capture ratio
  downCapture: number; // Downside capture ratio
  
  // Value at Risk metrics
  var95: number; // 95% VaR
  var99: number; // 99% VaR
  cvar95: number; // Conditional VaR (Expected Shortfall) at 95%
  cvar99: number;
  
  // Risk-adjusted returns
  sharpeRatio: number;
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
 * Convert daily returns to monthly returns
 * Uses actual ~21 trading days per month average
 */
function aggregateToMonthly(dailyReturns: number[], tradingDaysPerMonth: number = 21): number[] {
  if (dailyReturns.length < tradingDaysPerMonth) {
    // Not enough data for even one month - return empty
    return [];
  }
  
  const monthlyReturns: number[] = [];
  for (let i = 0; i < dailyReturns.length; i += tradingDaysPerMonth) {
    const monthSlice = dailyReturns.slice(i, Math.min(i + tradingDaysPerMonth, dailyReturns.length));
    if (monthSlice.length >= tradingDaysPerMonth * 0.5) { // At least half a month
      // Compound daily returns to get monthly return
      const monthReturn = monthSlice.reduce((acc, r) => acc * (1 + r), 1) - 1;
      monthlyReturns.push(monthReturn);
    }
  }
  return monthlyReturns;
}

/**
 * Convert daily returns to yearly returns
 */
function aggregateToYearly(dailyReturns: number[], tradingDaysPerYear: number = 252): number[] {
  if (dailyReturns.length < tradingDaysPerYear * 0.5) {
    // Not enough data for even half a year - return empty
    return [];
  }
  
  const yearlyReturns: number[] = [];
  for (let i = 0; i < dailyReturns.length; i += tradingDaysPerYear) {
    const yearSlice = dailyReturns.slice(i, Math.min(i + tradingDaysPerYear, dailyReturns.length));
    if (yearSlice.length >= tradingDaysPerYear * 0.5) { // At least half a year
      const yearReturn = yearSlice.reduce((acc, r) => acc * (1 + r), 1) - 1;
      yearlyReturns.push(yearReturn);
    }
  }
  return yearlyReturns;
}

/**
 * Calculate upside/downside capture ratios
 */
function calculateCaptureRatios(
  portfolioReturns: number[],
  benchmarkReturns: number[]
): { upCapture: number; downCapture: number } {
  const minLen = Math.min(portfolioReturns.length, benchmarkReturns.length);
  if (minLen < 2) return { upCapture: 100, downCapture: 100 };
  
  let upPortfolioSum = 0;
  let upBenchmarkSum = 0;
  let upCount = 0;
  
  let downPortfolioSum = 0;
  let downBenchmarkSum = 0;
  let downCount = 0;
  
  for (let i = 0; i < minLen; i++) {
    if (benchmarkReturns[i] > 0) {
      upPortfolioSum += portfolioReturns[i];
      upBenchmarkSum += benchmarkReturns[i];
      upCount++;
    } else if (benchmarkReturns[i] < 0) {
      downPortfolioSum += portfolioReturns[i];
      downBenchmarkSum += benchmarkReturns[i];
      downCount++;
    }
  }
  
  const upCapture = upCount > 0 && upBenchmarkSum !== 0 
    ? (upPortfolioSum / upBenchmarkSum) * 100 
    : 100;
  const downCapture = downCount > 0 && downBenchmarkSum !== 0 
    ? (downPortfolioSum / downBenchmarkSum) * 100 
    : 100;
  
  return { upCapture, downCapture };
}

/**
 * Calculate R-squared between portfolio and benchmark
 */
function calculateRSquared(
  portfolioReturns: number[],
  benchmarkReturns: number[]
): number {
  const minLen = Math.min(portfolioReturns.length, benchmarkReturns.length);
  if (minLen < 2) return 0;
  
  const pReturns = portfolioReturns.slice(0, minLen);
  const bReturns = benchmarkReturns.slice(0, minLen);
  
  const pMean = arithmeticMean(pReturns);
  const bMean = arithmeticMean(bReturns);
  
  let covariance = 0;
  let pVariance = 0;
  let bVariance = 0;
  
  for (let i = 0; i < minLen; i++) {
    const pDev = pReturns[i] - pMean;
    const bDev = bReturns[i] - bMean;
    covariance += pDev * bDev;
    pVariance += pDev * pDev;
    bVariance += bDev * bDev;
  }
  
  if (pVariance === 0 || bVariance === 0) return 0;
  
  const correlation = covariance / Math.sqrt(pVariance * bVariance);
  return correlation * correlation * 100; // Return as percentage
}

/**
 * Calculate all advanced metrics
 */
export function calculateAllAdvancedMetrics(
  dailyReturns: number[],
  portfolioValues: number[],
  weights: Map<string, number>,
  inputAnnualizedReturn: number,
  maxDrawdown: number,
  beta: number = 1,
  benchmarkReturns?: number[]
): AdvancedRiskMetrics {
  // Calculate monthly and yearly returns
  const monthlyReturns = aggregateToMonthly(dailyReturns);
  const yearlyReturns = aggregateToYearly(dailyReturns);
  
  // Total return from portfolio values
  const startValue = portfolioValues[0] || 100000;
  const endValue = portfolioValues[portfolioValues.length - 1] || startValue;
  const totalReturn = ((endValue - startValue) / startValue) * 100;
  
  // CAGR calculation (assuming ~252 trading days per year)
  const years = dailyReturns.length / 252;
  const cagr = years > 0 ? (Math.pow(endValue / startValue, 1 / years) - 1) * 100 : 0;
  
  // Monthly statistics
  const avgMonthlyReturn = monthlyReturns.length > 0 ? arithmeticMean(monthlyReturns) * 100 : 0;
  const monthlyVolatility = monthlyReturns.length > 1 ? standardDeviation(monthlyReturns) * 100 : 0;
  const positiveMonths = monthlyReturns.length > 0 
    ? (monthlyReturns.filter(r => r > 0).length / monthlyReturns.length) * 100 
    : 50;
  
  // Best/Worst periods
  const bestMonth = monthlyReturns.length > 0 ? Math.max(...monthlyReturns) * 100 : 0;
  const worstMonth = monthlyReturns.length > 0 ? Math.min(...monthlyReturns) * 100 : 0;
  const bestYear = yearlyReturns.length > 0 ? Math.max(...yearlyReturns) * 100 : 0;
  const worstYear = yearlyReturns.length > 0 ? Math.min(...yearlyReturns) * 100 : 0;
  
  // Benchmark comparisons
  let alpha = 0;
  let rSquared = 0;
  let trackingError = 0;
  let upCapture = 100;
  let downCapture = 100;
  
  if (benchmarkReturns && benchmarkReturns.length > 0) {
    const betaAlpha = calculateBetaAlpha(dailyReturns, benchmarkReturns);
    alpha = betaAlpha.alpha;
    beta = betaAlpha.beta;
    rSquared = calculateRSquared(dailyReturns, benchmarkReturns);
    
    // Tracking error
    const minLen = Math.min(dailyReturns.length, benchmarkReturns.length);
    const activeReturns = dailyReturns.slice(0, minLen).map((r, i) => r - benchmarkReturns[i]);
    trackingError = standardDeviation(activeReturns) * Math.sqrt(252) * 100;
    
    // Capture ratios (use monthly for more meaningful results)
    const benchmarkMonthly = aggregateToMonthly(benchmarkReturns);
    const captureResult = calculateCaptureRatios(monthlyReturns, benchmarkMonthly);
    upCapture = captureResult.upCapture;
    downCapture = captureResult.downCapture;
  }
  
  // Sharpe ratio
  const sharpeRatio = calculateSharpeRatio(dailyReturns);
  
  return {
    // Core returns
    totalReturn,
    cagr,
    annualizedReturn: inputAnnualizedReturn,
    bestYear,
    worstYear,
    bestMonth,
    worstMonth,
    positiveMonths,
    avgMonthlyReturn,
    monthlyVolatility,
    
    // Benchmark comparison
    alpha,
    beta,
    rSquared,
    trackingError,
    upCapture,
    downCapture,
    
    // VaR metrics
    var95: calculateVaR(dailyReturns, 0.95),
    var99: calculateVaR(dailyReturns, 0.99),
    cvar95: calculateCVaR(dailyReturns, 0.95),
    cvar99: calculateCVaR(dailyReturns, 0.99),
    
    // Risk-adjusted
    sharpeRatio,
    sortinoRatio: calculateSortinoRatio(dailyReturns),
    calmarRatio: calculateCalmarRatio(inputAnnualizedReturn, maxDrawdown),
    treynorRatio: calculateTreynorRatio(inputAnnualizedReturn, beta),
    informationRatio: benchmarkReturns ? calculateInformationRatio(dailyReturns, benchmarkReturns) : 0,
    omega: calculateOmega(dailyReturns),
    
    // Tail risk
    tailRatio: calculateTailRatio(dailyReturns),
    skewness: calculateSkewness(dailyReturns),
    kurtosis: calculateKurtosis(dailyReturns),
    
    // Drawdown
    maxDrawdown,
    avgDrawdown: 0,
    ulcerIndex: calculateUlcerIndex(portfolioValues),
    
    // Liquidity
    liquidityScore: calculateLiquidityScore(weights),
    daysToLiquidate: 1,
  };
}
