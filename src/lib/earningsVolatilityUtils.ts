// src/lib/earningsVolatilityUtils.ts

/**
 * Comprehensive volatility and consistency analysis utilities
 */

export interface VolatilityMetrics {
  avgSurprise: number;
  stdDev: number;
  variance: number;
  consistencyScore: number;
  recentAvg: number;
  recentStdDev: number;
  trendStrength: number;
  volatilityChange: number;
  volatilityRating: 'very_low' | 'low' | 'moderate' | 'high' | 'very_high';
  consistencyRating: 'highly_consistent' | 'consistent' | 'moderate' | 'volatile' | 'highly_volatile';
  trendDirection: 'improving' | 'stable' | 'declining';
  dataQuality: 'insufficient' | 'limited' | 'good' | 'excellent';
}

/**
 * Calculate comprehensive volatility metrics from earnings history
 */
export function calculateVolatilityMetrics(
  surprises: number[],
  recentQuarters: number = 4
): VolatilityMetrics | null {
  if (surprises.length < 4) {
    return null; // Need minimum 4 quarters
  }

  // Calculate overall metrics
  const n = surprises.length;
  const avgSurprise = surprises.reduce((sum, val) => sum + val, 0) / n;
  
  const variance = surprises.reduce((sum, val) => 
    sum + Math.pow(val - avgSurprise, 2), 0) / n;
  const stdDev = Math.sqrt(variance);

  // Calculate consistency score (0-1 scale)
  // Assumes 20% std dev is very volatile, 2% is very consistent
  const consistencyScore = Math.max(0, Math.min(1, 1 - (stdDev / 20)));

  // Recent period analysis
  const recentSurprises = surprises.slice(0, Math.min(recentQuarters, n));
  const recentN = recentSurprises.length;
  const recentAvg = recentSurprises.reduce((sum, val) => sum + val, 0) / recentN;

  const recentVariance = recentSurprises.reduce((sum, val) => 
    sum + Math.pow(val - recentAvg, 2), 0) / recentN;
  const recentStdDev = Math.sqrt(recentVariance);

  // Trend strength (in standard deviation units)
  const trendStrength = (recentAvg - avgSurprise) / (stdDev + 0.01);

  // Volatility change
  const volatilityChange = (recentStdDev - stdDev) / (stdDev + 0.01);

  // Ratings
  const volatilityRating = getVolatilityRating(stdDev);
  const consistencyRating = getConsistencyRating(consistencyScore);
  const trendDirection = getTrendDirection(trendStrength);
  const dataQuality = getDataQuality(n);

  return {
    avgSurprise,
    stdDev,
    variance,
    consistencyScore,
    recentAvg,
    recentStdDev,
    trendStrength,
    volatilityChange,
    volatilityRating,
    consistencyRating,
    trendDirection,
    dataQuality,
  };
}

/**
 * Get volatility rating from standard deviation
 */
function getVolatilityRating(stdDev: number): VolatilityMetrics['volatilityRating'] {
  if (stdDev < 3) return 'very_low';
  if (stdDev < 6) return 'low';
  if (stdDev < 10) return 'moderate';
  if (stdDev < 15) return 'high';
  return 'very_high';
}

/**
 * Get consistency rating from consistency score
 */
function getConsistencyRating(score: number): VolatilityMetrics['consistencyRating'] {
  if (score >= 0.85) return 'highly_consistent';
  if (score >= 0.70) return 'consistent';
  if (score >= 0.50) return 'moderate';
  if (score >= 0.30) return 'volatile';
  return 'highly_volatile';
}

/**
 * Determine trend direction from trend strength
 */
function getTrendDirection(trendStrength: number): VolatilityMetrics['trendDirection'] {
  if (trendStrength > 0.5) return 'improving';
  if (trendStrength < -0.5) return 'declining';
  return 'stable';
}

/**
 * Assess data quality based on number of observations
 */
function getDataQuality(n: number): VolatilityMetrics['dataQuality'] {
  if (n < 4) return 'insufficient';
  if (n < 6) return 'limited';
  if (n < 8) return 'good';
  return 'excellent';
}

/**
 * Calculate maximum recommended confidence based on data quality and consistency
 */
export function calculateMaxConfidence(metrics: VolatilityMetrics): number {
  let maxConf = 0.95;

  // Reduce max confidence for limited data
  if (metrics.dataQuality === 'insufficient') return 0.00;
  if (metrics.dataQuality === 'limited') maxConf = 0.70;
  if (metrics.dataQuality === 'good') maxConf = 0.85;

  // Further reduce for high volatility
  if (metrics.volatilityRating === 'very_high') maxConf *= 0.80;
  if (metrics.volatilityRating === 'high') maxConf *= 0.90;

  // Increase for high consistency
  if (metrics.consistencyRating === 'highly_consistent') maxConf = Math.min(0.95, maxConf * 1.05);

  return maxConf;
}

/**
 * Detect regime changes in earnings patterns
 */
export interface RegimeChange {
  detected: boolean;
  type: 'improvement' | 'deterioration' | 'stabilization' | 'destabilization' | null;
  confidence: number;
  description: string;
}

export function detectRegimeChange(metrics: VolatilityMetrics): RegimeChange {
  // Improvement: Positive trend + stable/decreasing volatility
  if (metrics.trendStrength > 1.0 && metrics.volatilityChange <= 0.1) {
    return {
      detected: true,
      type: 'improvement',
      confidence: Math.min(0.90, Math.abs(metrics.trendStrength) * 0.5),
      description: `Strong positive trend (${metrics.trendStrength.toFixed(1)}σ) with stable volatility`,
    };
  }

  // Deterioration: Negative trend + potentially increasing volatility
  if (metrics.trendStrength < -1.0) {
    return {
      detected: true,
      type: 'deterioration',
      confidence: Math.min(0.90, Math.abs(metrics.trendStrength) * 0.5),
      description: `Strong negative trend (${metrics.trendStrength.toFixed(1)}σ)`,
    };
  }

  // Stabilization: Decreasing volatility with improving consistency
  if (metrics.volatilityChange < -0.3 && metrics.consistencyScore > 0.7) {
    return {
      detected: true,
      type: 'stabilization',
      confidence: 0.70,
      description: 'Volatility decreasing, pattern becoming more predictable',
    };
  }

  // Destabilization: Increasing volatility
  if (metrics.volatilityChange > 0.5) {
    return {
      detected: true,
      type: 'destabilization',
      confidence: 0.75,
      description: 'Volatility increasing, pattern becoming less predictable',
    };
  }

  return {
    detected: false,
    type: null,
    confidence: 0,
    description: 'No significant regime change detected',
  };
}

/**
 * Calculate Z-score for a given surprise value
 */
export function calculateZScore(
  surpriseValue: number,
  avgSurprise: number,
  stdDev: number
): number {
  if (stdDev === 0) return 0;
  return (surpriseValue - avgSurprise) / stdDev;
}

/**
 * Predict expected range for next earnings (±1σ, ±2σ)
 */
export function predictEarningsRange(metrics: VolatilityMetrics): {
  mean: number;
  oneSigmaLow: number;
  oneSigmaHigh: number;
  twoSigmaLow: number;
  twoSigmaHigh: number;
  expectedValue: number; // Adjusted for trend
} {
  // Use recent average if strong trend, otherwise historical
  const expectedValue = Math.abs(metrics.trendStrength) > 0.5 
    ? metrics.recentAvg 
    : metrics.avgSurprise;

  // Use recent volatility if regime is changing
  const effectiveStdDev = Math.abs(metrics.volatilityChange) > 0.3
    ? metrics.recentStdDev
    : metrics.stdDev;

  return {
    mean: metrics.avgSurprise,
    oneSigmaLow: expectedValue - effectiveStdDev,
    oneSigmaHigh: expectedValue + effectiveStdDev,
    twoSigmaLow: expectedValue - 2 * effectiveStdDev,
    twoSigmaHigh: expectedValue + 2 * effectiveStdDev,
    expectedValue,
  };
}

/**
 * Calculate confidence intervals
 */
export function calculateConfidenceInterval(
  surprises: number[],
  confidenceLevel: number = 0.95
): { lower: number; upper: number; mean: number } {
  const n = surprises.length;
  const mean = surprises.reduce((sum, val) => sum + val, 0) / n;
  const variance = surprises.reduce((sum, val) => 
    sum + Math.pow(val - mean, 2), 0) / (n - 1);
  const stdError = Math.sqrt(variance / n);

  // Z-scores for common confidence levels
  const zScores: { [key: number]: number } = {
    0.90: 1.645,
    0.95: 1.960,
    0.99: 2.576,
  };

  const z = zScores[confidenceLevel] || 1.960;
  const margin = z * stdError;

  return {
    lower: mean - margin,
    upper: mean + margin,
    mean,
  };
}

/**
 * Perform moving average analysis to detect trends
 */
export function calculateMovingAverages(
  surprises: number[],
  periods: number[] = [3, 6, 9]
): { [period: number]: number[] } {
  const result: { [period: number]: number[] } = {};

  periods.forEach(period => {
    const ma: number[] = [];
    for (let i = 0; i <= surprises.length - period; i++) {
      const slice = surprises.slice(i, i + period);
      const avg = slice.reduce((sum, val) => sum + val, 0) / period;
      ma.push(avg);
    }
    result[period] = ma;
  });

  return result;
}

/**
 * Calculate autocorrelation (do surprises follow patterns?)
 */
export function calculateAutocorrelation(
  surprises: number[],
  lag: number = 1
): number {
  if (surprises.length <= lag) return 0;

  const n = surprises.length - lag;
  const mean = surprises.reduce((sum, val) => sum + val, 0) / surprises.length;

  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    numerator += (surprises[i] - mean) * (surprises[i + lag] - mean);
  }

  for (let i = 0; i < surprises.length; i++) {
    denominator += Math.pow(surprises[i] - mean, 2);
  }

  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Format volatility metrics for display
 */
export function formatVolatilityMetrics(metrics: VolatilityMetrics): {
  [key: string]: string;
} {
  return {
    'Avg Surprise': `${metrics.avgSurprise.toFixed(2)}%`,
    'Std Deviation': `${metrics.stdDev.toFixed(2)}%`,
    'Consistency Score': `${(metrics.consistencyScore * 100).toFixed(0)}%`,
    'Recent Trend': `${metrics.trendStrength > 0 ? '+' : ''}${metrics.trendStrength.toFixed(2)}σ`,
    'Volatility Change': `${metrics.volatilityChange > 0 ? '+' : ''}${(metrics.volatilityChange * 100).toFixed(1)}%`,
    'Rating': metrics.consistencyRating.replace('_', ' '),
    'Data Quality': metrics.dataQuality,
  };
}

/**
 * Get color class for volatility rating
 */
export function getVolatilityColor(rating: VolatilityMetrics['volatilityRating']): string {
  const colors = {
    very_low: 'text-green-600',
    low: 'text-green-500',
    moderate: 'text-yellow-600',
    high: 'text-orange-600',
    very_high: 'text-red-600',
  };
  return colors[rating];
}

/**
 * Get color class for consistency rating
 */
export function getConsistencyColor(rating: VolatilityMetrics['consistencyRating']): string {
  const colors = {
    highly_consistent: 'text-green-600',
    consistent: 'text-green-500',
    moderate: 'text-yellow-600',
    volatile: 'text-orange-600',
    highly_volatile: 'text-red-600',
  };
  return colors[rating];
}
