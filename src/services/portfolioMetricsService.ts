// Portfolio Metrics Service
// Institutional-grade calculations aligned with Portfolio Visualizer methodology
// Reference: https://www.portfoliovisualizer.com/faq

// Default risk-free rate (use 3-month T-bill rate)
const DEFAULT_RISK_FREE_RATE = 0.05; // 5% annual

/**
 * Calculate simple arithmetic returns from prices
 * Formula: R = (P1 - P0) / P0
 */
export function calculateSimpleReturns(prices: number[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i - 1] > 0) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    } else {
      returns.push(0);
    }
  }
  return returns;
}

/**
 * Calculate log returns from prices
 * Formula: R = ln(P1 / P0)
 */
export function calculateLogReturns(prices: number[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i - 1] > 0 && prices[i] > 0) {
      returns.push(Math.log(prices[i] / prices[i - 1]));
    } else {
      returns.push(0);
    }
  }
  return returns;
}

/**
 * Calculate arithmetic mean of returns
 * Formula: R̄ = (1/n) * Σ Ri
 */
export function arithmeticMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Calculate geometric mean of returns (time-weighted)
 * Formula: ((1+R1)(1+R2)...(1+Rn))^(1/n) - 1
 */
export function geometricMean(returns: number[]): number {
  if (returns.length === 0) return 0;
  
  // Calculate product of (1 + R)
  let product = 1;
  for (const r of returns) {
    product *= (1 + r);
    // Avoid numerical issues
    if (product <= 0) return -1;
  }
  
  return Math.pow(product, 1 / returns.length) - 1;
}

/**
 * Calculate sample standard deviation (n-1 denominator for sample variance)
 * Formula: σ = sqrt((1/(n-1)) * Σ(Ri - R̄)²)
 */
export function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  
  const mean = arithmeticMean(values);
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((sum, v) => sum + v, 0) / (values.length - 1);
  
  return Math.sqrt(variance);
}

/**
 * Calculate annualized return from cumulative return
 * Formula: (1 + CumulativeReturn)^(1/T) - 1
 */
export function annualizedReturn(cumulativeReturn: number, years: number): number {
  if (years <= 0) return 0;
  if (cumulativeReturn <= -1) return -1; // Lost everything
  
  return Math.pow(1 + cumulativeReturn, 1 / years) - 1;
}

/**
 * Calculate CAGR (Compound Annual Growth Rate)
 * Formula: (EndValue / StartValue)^(1/T) - 1
 */
export function calculateCAGR(startValue: number, endValue: number, years: number): number {
  if (years <= 0 || startValue <= 0) return 0;
  return Math.pow(endValue / startValue, 1 / years) - 1;
}

/**
 * Calculate annualized volatility from daily returns
 * Formula: σ_annual = sqrt(252) * σ_daily
 */
export function annualizedVolatility(dailyReturns: number[]): number {
  return standardDeviation(dailyReturns) * Math.sqrt(252);
}

/**
 * Calculate annualized volatility from monthly returns
 * Formula: σ_annual = sqrt(12) * σ_monthly
 */
export function annualizedVolatilityFromMonthly(monthlyReturns: number[]): number {
  return standardDeviation(monthlyReturns) * Math.sqrt(12);
}

/**
 * Calculate Sharpe Ratio
 * Formula: (Rp - Rf) / σp
 * Annualized from daily: (meanDaily - Rf/252) / dailyStdDev * sqrt(252)
 * 
 * Per Portfolio Visualizer FAQ:
 * When the return series for both the portfolio and the risk-free asset are available,
 * the ex-post Sharpe Ratio is calculated from excess returns.
 */
export function calculateSharpeRatio(
  dailyReturns: number[],
  annualRiskFreeRate: number = DEFAULT_RISK_FREE_RATE
): number {
  if (dailyReturns.length < 2) return 0;
  
  const dailyRf = annualRiskFreeRate / 252;
  
  // Calculate daily excess returns
  const excessReturns = dailyReturns.map(r => r - dailyRf);
  
  const meanExcess = arithmeticMean(excessReturns);
  const stdExcess = standardDeviation(excessReturns);
  
  if (stdExcess === 0) return 0;
  
  // Annualize: multiply by sqrt(252)
  return (meanExcess / stdExcess) * Math.sqrt(252);
}

/**
 * Calculate Sortino Ratio
 * Uses downside deviation (only returns below MAR)
 * Formula: (Rp - MAR) / DownsideDeviation
 * 
 * Per Portfolio Visualizer FAQ:
 * L_i = min(0, R_Pi - R_MARi)
 * DownsideDeviation = sqrt((1/n) * Σ L_i²)
 * SortinoRatio = (R_P - R_MAR) / DownsideDeviation
 */
export function calculateSortinoRatio(
  dailyReturns: number[],
  annualMAR: number = DEFAULT_RISK_FREE_RATE
): number {
  if (dailyReturns.length < 2) return 0;
  
  const dailyMAR = annualMAR / 252;
  
  // Calculate downside returns (only negative excess)
  const downsideReturns = dailyReturns.map(r => Math.min(0, r - dailyMAR));
  
  // Downside deviation: sqrt(mean of squared downside returns)
  const downsideSquared = downsideReturns.map(r => r * r);
  const downsideVariance = downsideSquared.reduce((sum, v) => sum + v, 0) / downsideReturns.length;
  const downsideDeviation = Math.sqrt(downsideVariance);
  
  if (downsideDeviation === 0) {
    // No downside - return large positive number if positive mean
    const mean = arithmeticMean(dailyReturns);
    return mean > dailyMAR ? 10 : 0;
  }
  
  // Calculate mean excess return
  const meanExcess = arithmeticMean(dailyReturns) - dailyMAR;
  
  // Annualize
  return (meanExcess / downsideDeviation) * Math.sqrt(252);
}

/**
 * Calculate Maximum Drawdown
 * Formula: MDD = (TroughValue - PeakValue) / PeakValue
 */
export function calculateMaxDrawdown(values: number[]): {
  maxDrawdown: number;
  maxDrawdownPercent: number;
  drawdownLength: number;
  recoveryLength: number;
  peakIndex: number;
  troughIndex: number;
  drawdownSeries: number[];
} {
  if (values.length === 0) {
    return {
      maxDrawdown: 0,
      maxDrawdownPercent: 0,
      drawdownLength: 0,
      recoveryLength: 0,
      peakIndex: 0,
      troughIndex: 0,
      drawdownSeries: []
    };
  }
  
  let peak = values[0];
  let peakIndex = 0;
  let maxDrawdown = 0;
  let maxDrawdownPercent = 0;
  let maxDrawdownPeakIndex = 0;
  let maxDrawdownTroughIndex = 0;
  
  const drawdownSeries: number[] = [];
  
  for (let i = 0; i < values.length; i++) {
    const value = values[i];
    
    if (value > peak) {
      peak = value;
      peakIndex = i;
    }
    
    const drawdown = peak - value;
    const drawdownPercent = peak > 0 ? (drawdown / peak) * 100 : 0;
    
    drawdownSeries.push(-drawdownPercent); // Store as negative
    
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
      maxDrawdownPercent = drawdownPercent;
      maxDrawdownPeakIndex = peakIndex;
      maxDrawdownTroughIndex = i;
    }
  }
  
  // Calculate drawdown length and recovery
  const drawdownLength = maxDrawdownTroughIndex - maxDrawdownPeakIndex;
  
  // Find recovery point (if any)
  let recoveryIndex = values.length;
  const peakValue = values[maxDrawdownPeakIndex];
  for (let i = maxDrawdownTroughIndex; i < values.length; i++) {
    if (values[i] >= peakValue) {
      recoveryIndex = i;
      break;
    }
  }
  const recoveryLength = recoveryIndex - maxDrawdownTroughIndex;
  
  return {
    maxDrawdown,
    maxDrawdownPercent,
    drawdownLength,
    recoveryLength,
    peakIndex: maxDrawdownPeakIndex,
    troughIndex: maxDrawdownTroughIndex,
    drawdownSeries
  };
}

/**
 * Calculate Calmar Ratio
 * Formula: CAGR / MaxDrawdown
 * Per Portfolio Visualizer: uses 36-month window
 */
export function calculateCalmarRatio(cagr: number, maxDrawdownPercent: number): number {
  if (maxDrawdownPercent === 0) return 0;
  return (cagr * 100) / maxDrawdownPercent;
}

/**
 * Calculate Treynor Ratio
 * Formula: (Rp - Rf) / βp
 */
export function calculateTreynorRatio(
  annualReturn: number,
  beta: number,
  riskFreeRate: number = DEFAULT_RISK_FREE_RATE
): number {
  if (beta === 0) return 0;
  return (annualReturn - riskFreeRate) / beta;
}

/**
 * Calculate Beta and Alpha
 * Beta: Cov(Rp, Rm) / Var(Rm)
 * Alpha: Rp - (Rf + β(Rm - Rf))
 */
export function calculateBetaAlpha(
  portfolioReturns: number[],
  benchmarkReturns: number[],
  riskFreeRate: number = DEFAULT_RISK_FREE_RATE
): { beta: number; alpha: number } {
  const minLen = Math.min(portfolioReturns.length, benchmarkReturns.length);
  if (minLen < 2) return { beta: 1, alpha: 0 };
  
  const pReturns = portfolioReturns.slice(0, minLen);
  const bReturns = benchmarkReturns.slice(0, minLen);
  
  const pMean = arithmeticMean(pReturns);
  const bMean = arithmeticMean(bReturns);
  
  // Calculate covariance and variance
  let covariance = 0;
  let benchVariance = 0;
  
  for (let i = 0; i < minLen; i++) {
    const pDev = pReturns[i] - pMean;
    const bDev = bReturns[i] - bMean;
    covariance += pDev * bDev;
    benchVariance += bDev * bDev;
  }
  
  // Use sample covariance (n-1)
  covariance /= (minLen - 1);
  benchVariance /= (minLen - 1);
  
  const beta = benchVariance > 0 ? covariance / benchVariance : 1;
  
  // Annualize returns for alpha
  const annualPReturn = pMean * 252;
  const annualBReturn = bMean * 252;
  
  // Alpha using CAPM: α = Rp - [Rf + β(Rm - Rf)]
  const alpha = annualPReturn - (riskFreeRate + beta * (annualBReturn - riskFreeRate));
  
  return { beta, alpha: alpha * 100 }; // Alpha in percentage points
}

/**
 * Calculate Information Ratio
 * Formula: (Active Return) / Tracking Error
 */
export function calculateInformationRatio(
  portfolioReturns: number[],
  benchmarkReturns: number[]
): number {
  const minLen = Math.min(portfolioReturns.length, benchmarkReturns.length);
  if (minLen < 2) return 0;
  
  // Calculate active returns (difference)
  const activeReturns = portfolioReturns.slice(0, minLen).map((r, i) => r - benchmarkReturns[i]);
  
  const meanActive = arithmeticMean(activeReturns);
  const trackingError = standardDeviation(activeReturns);
  
  if (trackingError === 0) return 0;
  
  // Annualize
  return (meanActive / trackingError) * Math.sqrt(252);
}

/**
 * Calculate Value at Risk (VaR) - Historical method
 * Returns the loss at the given confidence level
 */
export function calculateVaR(
  dailyReturns: number[],
  confidenceLevel: number = 0.95
): number {
  if (dailyReturns.length === 0) return 0;
  
  const sorted = [...dailyReturns].sort((a, b) => a - b);
  const index = Math.floor(sorted.length * (1 - confidenceLevel));
  
  // VaR is a positive number representing loss
  return Math.abs(sorted[index] || 0) * 100;
}

/**
 * Calculate Parametric VaR using normal distribution
 * Formula: VaR = μ - z * σ where z is the z-score for confidence level
 */
export function calculateParametricVaR(
  dailyReturns: number[],
  confidenceLevel: number = 0.95
): number {
  if (dailyReturns.length < 2) return 0;
  
  const mean = arithmeticMean(dailyReturns);
  const stdDev = standardDeviation(dailyReturns);
  
  // Z-scores for common confidence levels
  const zScores: Record<number, number> = {
    0.90: 1.282,
    0.95: 1.645,
    0.99: 2.326,
  };
  
  const z = zScores[confidenceLevel] || 1.645;
  
  // VaR = -(μ - z*σ) when μ - z*σ is negative
  const var95 = mean - z * stdDev;
  return Math.abs(Math.min(0, var95)) * 100;
}

/**
 * Calculate Conditional VaR (CVaR / Expected Shortfall)
 * Average loss in the worst X% of cases
 */
export function calculateCVaR(
  dailyReturns: number[],
  confidenceLevel: number = 0.95
): number {
  if (dailyReturns.length === 0) return 0;
  
  const sorted = [...dailyReturns].sort((a, b) => a - b);
  const cutoffIndex = Math.floor(sorted.length * (1 - confidenceLevel));
  const tailReturns = sorted.slice(0, Math.max(1, cutoffIndex));
  
  const avgTailLoss = arithmeticMean(tailReturns);
  return Math.abs(avgTailLoss) * 100;
}

/**
 * Calculate Skewness
 * Formula: (n/((n-1)(n-2))) * Σ((Ri - R̄)/σ)³
 */
export function calculateSkewness(values: number[]): number {
  if (values.length < 3) return 0;
  
  const n = values.length;
  const mean = arithmeticMean(values);
  const stdDev = standardDeviation(values);
  
  if (stdDev === 0) return 0;
  
  const cubedDeviations = values.map(v => Math.pow((v - mean) / stdDev, 3));
  const sum = cubedDeviations.reduce((a, b) => a + b, 0);
  
  // Adjusted Fisher-Pearson standardized moment coefficient
  return (n / ((n - 1) * (n - 2))) * sum;
}

/**
 * Calculate Excess Kurtosis
 * Formula: adjusted fourth moment - 3
 */
export function calculateKurtosis(values: number[]): number {
  if (values.length < 4) return 0;
  
  const n = values.length;
  const mean = arithmeticMean(values);
  const stdDev = standardDeviation(values);
  
  if (stdDev === 0) return 0;
  
  const fourthPowerDeviations = values.map(v => Math.pow((v - mean) / stdDev, 4));
  const sum = fourthPowerDeviations.reduce((a, b) => a + b, 0);
  
  // Calculate raw kurtosis
  const rawKurtosis = (n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3)) * sum;
  
  // Subtract 3 for excess kurtosis and adjust
  const excessKurtosis = rawKurtosis - (3 * (n - 1) * (n - 1)) / ((n - 2) * (n - 3));
  
  return excessKurtosis;
}

/**
 * Calculate Ulcer Index
 * Measures depth and duration of drawdowns
 * Formula: sqrt(mean of squared percentage drawdowns)
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
 * Calculate Omega Ratio
 * Probability-weighted ratio of gains to losses
 */
export function calculateOmega(
  dailyReturns: number[],
  threshold: number = 0
): number {
  if (dailyReturns.length === 0) return 1;
  
  const gains = dailyReturns
    .filter(r => r > threshold)
    .reduce((sum, r) => sum + (r - threshold), 0);
  
  const losses = dailyReturns
    .filter(r => r < threshold)
    .reduce((sum, r) => sum + (threshold - r), 0);
  
  if (losses === 0) return gains > 0 ? 10 : 1;
  return 1 + (gains / losses);
}

/**
 * Calculate Tail Ratio
 * Ratio of average gains in top 5% to average losses in bottom 5%
 */
export function calculateTailRatio(dailyReturns: number[]): number {
  if (dailyReturns.length < 20) return 1;
  
  const sorted = [...dailyReturns].sort((a, b) => a - b);
  const cutoff = Math.max(1, Math.floor(sorted.length * 0.05));
  
  const bottomTail = sorted.slice(0, cutoff);
  const topTail = sorted.slice(-cutoff);
  
  const avgLoss = Math.abs(arithmeticMean(bottomTail));
  const avgGain = arithmeticMean(topTail);
  
  if (avgLoss === 0) return avgGain > 0 ? 10 : 1;
  return avgGain / avgLoss;
}

/**
 * Calculate years between two dates
 */
export function yearsBetween(startDate: string | Date, endDate: string | Date): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end.getTime() - start.getTime();
  return diffMs / (365.25 * 24 * 60 * 60 * 1000);
}

/**
 * Calculate all core metrics at once
 */
export interface PortfolioMetrics {
  // Returns
  totalReturn: number;
  totalReturnPercent: number;
  cagr: number;
  
  // Risk
  volatility: number;
  maxDrawdown: number;
  
  // Risk-adjusted
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  
  // Benchmark-relative (optional)
  beta?: number;
  alpha?: number;
  informationRatio?: number;
  
  // Tail risk
  var95: number;
  cvar95: number;
  skewness: number;
  kurtosis: number;
  ulcerIndex: number;
}

export function calculateAllMetrics(
  dailyReturns: number[],
  portfolioValues: number[],
  startDate: string | Date,
  endDate: string | Date,
  benchmarkReturns?: number[],
  riskFreeRate: number = DEFAULT_RISK_FREE_RATE
): PortfolioMetrics {
  const years = yearsBetween(startDate, endDate);
  
  const startValue = portfolioValues[0] || 100000;
  const endValue = portfolioValues[portfolioValues.length - 1] || startValue;
  
  const totalReturn = endValue - startValue;
  const totalReturnPercent = ((endValue - startValue) / startValue) * 100;
  const cagr = calculateCAGR(startValue, endValue, years) * 100;
  
  const volatility = annualizedVolatility(dailyReturns) * 100;
  const { maxDrawdownPercent } = calculateMaxDrawdown(portfolioValues);
  
  const sharpeRatio = calculateSharpeRatio(dailyReturns, riskFreeRate);
  const sortinoRatio = calculateSortinoRatio(dailyReturns, riskFreeRate);
  const calmarRatio = calculateCalmarRatio(cagr / 100, maxDrawdownPercent);
  
  const var95 = calculateVaR(dailyReturns, 0.95);
  const cvar95 = calculateCVaR(dailyReturns, 0.95);
  const skewness = calculateSkewness(dailyReturns);
  const kurtosis = calculateKurtosis(dailyReturns);
  const ulcerIndex = calculateUlcerIndex(portfolioValues);
  
  const result: PortfolioMetrics = {
    totalReturn,
    totalReturnPercent,
    cagr,
    volatility,
    maxDrawdown: maxDrawdownPercent,
    sharpeRatio,
    sortinoRatio,
    calmarRatio,
    var95,
    cvar95,
    skewness,
    kurtosis,
    ulcerIndex,
  };
  
  // Add benchmark metrics if available
  if (benchmarkReturns && benchmarkReturns.length > 0) {
    const { beta, alpha } = calculateBetaAlpha(dailyReturns, benchmarkReturns, riskFreeRate);
    result.beta = beta;
    result.alpha = alpha;
    result.informationRatio = calculateInformationRatio(dailyReturns, benchmarkReturns);
  }
  
  return result;
}
