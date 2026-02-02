/**
 * Study Validation System
 * 
 * Comprehensive validation layer for Quant Lab studies.
 * Evaluates data quality, statistical validity, and result sanity.
 */

// ============================================================
// TYPES
// ============================================================

export interface ValidationResult {
  isValid: boolean;
  overallScore: number; // 0-100
  dataQuality: DataQualityReport;
  statisticalValidity: StatisticalValidityReport;
  sanityChecks: SanityCheckReport;
  warnings: ValidationWarning[];
  errors: ValidationError[];
}

export interface DataQualityReport {
  score: number;
  sampleSize: number;
  minSampleSize: number;
  isSufficientSample: boolean;
  dateRange: {
    start: string;
    end: string;
    tradingDays: number;
    years: number;
  };
  missingDataPoints: number;
  nullValues: number;
  outlierCount: number;
}

export interface StatisticalValidityReport {
  score: number;
  confidenceLevel: 'high' | 'medium' | 'low' | 'insufficient';
  standardError: number;
  marginOfError: number;
  confidenceInterval: { lower: number; upper: number };
  pValue?: number;
  isStatisticallySignificant: boolean;
  effectSize?: number;
}

export interface SanityCheckReport {
  score: number;
  checks: SanityCheck[];
  passedChecks: number;
  totalChecks: number;
}

export interface SanityCheck {
  name: string;
  passed: boolean;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ValidationWarning {
  code: string;
  message: string;
  suggestion?: string;
}

export interface ValidationError {
  code: string;
  message: string;
  fatal: boolean;
}

// ============================================================
// CONSTANTS
// ============================================================

export const VALIDATION_THRESHOLDS = {
  // Minimum sample sizes by study type
  minSampleSize: {
    conditional: 10,    // After X% moves need fewer occurrences
    basic: 50,          // Basic stats need more data
    technical: 100,     // Technical indicators need lookback
    seasonality: 36,    // At least 3 years of monthly data
    default: 20,
  },
  
  // Statistical significance
  pValueThreshold: 0.05,
  
  // Win rate bounds (anything outside is suspicious)
  winRate: { min: 20, max: 85 },
  
  // Return bounds (daily %)
  dailyReturn: { min: -15, max: 15 },
  
  // Expected return bounds (should be realistic)
  expectedReturn: { min: -50, max: 100 },
  
  // Confidence levels based on sample size
  confidenceLevels: {
    high: 100,      // 100+ occurrences
    medium: 30,     // 30-99 occurrences
    low: 10,        // 10-29 occurrences
    insufficient: 0, // <10 occurrences
  },
};

// ============================================================
// MAIN VALIDATION FUNCTION
// ============================================================

export function validateStudyResult(
  studyType: string,
  result: any,
  bars?: any[],
): ValidationResult {
  const warnings: ValidationWarning[] = [];
  const errors: ValidationError[] = [];
  
  // Data Quality Assessment
  const dataQuality = assessDataQuality(studyType, result, bars);
  
  // Statistical Validity Assessment
  const statisticalValidity = assessStatisticalValidity(studyType, result, dataQuality.sampleSize);
  
  // Sanity Checks
  const sanityChecks = performSanityChecks(studyType, result);
  
  // Collect warnings and errors
  if (!dataQuality.isSufficientSample) {
    warnings.push({
      code: 'LOW_SAMPLE',
      message: `Sample size (${dataQuality.sampleSize}) is below recommended minimum (${dataQuality.minSampleSize})`,
      suggestion: 'Consider using a longer date range for more reliable results',
    });
  }
  
  if (dataQuality.nullValues > 0) {
    warnings.push({
      code: 'NULL_VALUES',
      message: `${dataQuality.nullValues} null/undefined values detected in results`,
    });
  }
  
  if (dataQuality.outlierCount > dataQuality.sampleSize * 0.05) {
    warnings.push({
      code: 'MANY_OUTLIERS',
      message: `High outlier count (${dataQuality.outlierCount}) may skew results`,
      suggestion: 'Review individual trades for data errors',
    });
  }
  
  if (!statisticalValidity.isStatisticallySignificant) {
    warnings.push({
      code: 'NOT_SIGNIFICANT',
      message: 'Results are not statistically significant',
      suggestion: 'Increase sample size or consider this pattern unreliable',
    });
  }
  
  // Add sanity check failures
  for (const check of sanityChecks.checks) {
    if (!check.passed) {
      if (check.severity === 'error') {
        errors.push({ code: check.name, message: check.message, fatal: false });
      } else if (check.severity === 'warning') {
        warnings.push({ code: check.name, message: check.message });
      }
    }
  }
  
  // Calculate overall score
  const overallScore = calculateOverallScore(dataQuality, statisticalValidity, sanityChecks);
  
  // Determine if valid
  const isValid = overallScore >= 50 && errors.filter(e => e.fatal).length === 0;
  
  return {
    isValid,
    overallScore,
    dataQuality,
    statisticalValidity,
    sanityChecks,
    warnings,
    errors,
  };
}

// ============================================================
// DATA QUALITY ASSESSMENT
// ============================================================

function assessDataQuality(
  studyType: string,
  result: any,
  bars?: any[],
): DataQualityReport {
  const category = getStudyCategory(studyType);
  const minSampleSize = VALIDATION_THRESHOLDS.minSampleSize[category] || 
                        VALIDATION_THRESHOLDS.minSampleSize.default;
  
  // Extract sample size from result
  const sampleSize = extractSampleSize(result);
  
  // Analyze bars if provided
  const dateRange = analyzeDateRange(bars);
  
  // Count null values in result
  const nullValues = countNullValues(result);
  
  // Count outliers if we have return data
  const returns = extractReturns(result);
  const outlierCount = countOutliers(returns);
  
  const isSufficientSample = sampleSize >= minSampleSize;
  
  // Calculate data quality score
  let score = 100;
  if (!isSufficientSample) {
    score -= Math.min(40, (minSampleSize - sampleSize) * 2);
  }
  if (nullValues > 0) {
    score -= Math.min(20, nullValues * 5);
  }
  if (outlierCount > sampleSize * 0.05) {
    score -= 15;
  }
  if (dateRange.years < 1) {
    score -= 10;
  }
  
  return {
    score: Math.max(0, score),
    sampleSize,
    minSampleSize,
    isSufficientSample,
    dateRange,
    missingDataPoints: 0, // Would need to analyze gaps in bars
    nullValues,
    outlierCount,
  };
}

function extractSampleSize(result: any): number {
  // Try various common patterns
  if (result.sampleSize !== undefined) return result.sampleSize;
  if (result.total_days !== undefined) return result.total_days;
  if (result.count !== undefined) return result.count;
  if (result.totalOccurrences !== undefined) return result.totalOccurrences;
  if (result.analysis?.[0]?.occurrences !== undefined) return result.analysis[0].occurrences;
  if (result.afterOversold?.count !== undefined) return result.afterOversold.count + (result.afterOverbought?.count || 0);
  if (result.analysis && Array.isArray(result.analysis)) {
    return result.analysis.reduce((sum: number, a: any) => sum + (a.occurrences || a.count || 0), 0);
  }
  return 0;
}

function analyzeDateRange(bars?: any[]): { start: string; end: string; tradingDays: number; years: number } {
  if (!bars || bars.length === 0) {
    return { start: '', end: '', tradingDays: 0, years: 0 };
  }
  
  const start = bars[0].date;
  const end = bars[bars.length - 1].date;
  const tradingDays = bars.length;
  const years = tradingDays / 252;
  
  return { start, end, tradingDays, years };
}

function countNullValues(obj: any, depth = 0): number {
  if (depth > 5) return 0; // Prevent infinite recursion
  
  let count = 0;
  if (obj === null || obj === undefined) return 1;
  if (typeof obj !== 'object') return 0;
  
  if (Array.isArray(obj)) {
    for (const item of obj) {
      count += countNullValues(item, depth + 1);
    }
  } else {
    for (const key of Object.keys(obj)) {
      const value = obj[key];
      if (value === null || value === undefined || Number.isNaN(value)) {
        count++;
      } else if (typeof value === 'object') {
        count += countNullValues(value, depth + 1);
      }
    }
  }
  
  return count;
}

function extractReturns(result: any): number[] {
  const returns: number[] = [];
  
  // Try to find return data in common places
  if (result.returns && Array.isArray(result.returns)) {
    returns.push(...result.returns);
  }
  if (result.analysis && Array.isArray(result.analysis)) {
    for (const a of result.analysis) {
      if (a.avgReturn !== undefined) returns.push(a.avgReturn);
      if (a.returns && Array.isArray(a.returns)) returns.push(...a.returns);
    }
  }
  if (result.afterOversold?.avgReturn !== undefined) {
    returns.push(result.afterOversold.avgReturn);
  }
  if (result.afterOverbought?.avgReturn !== undefined) {
    returns.push(result.afterOverbought.avgReturn);
  }
  
  return returns.filter(r => typeof r === 'number' && !isNaN(r));
}

function countOutliers(values: number[]): number {
  if (values.length < 4) return 0;
  
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;
  
  return values.filter(v => v < lowerBound || v > upperBound).length;
}

// ============================================================
// STATISTICAL VALIDITY ASSESSMENT
// ============================================================

function assessStatisticalValidity(
  studyType: string,
  result: any,
  sampleSize: number,
): StatisticalValidityReport {
  // Determine confidence level based on sample size
  let confidenceLevel: 'high' | 'medium' | 'low' | 'insufficient' = 'insufficient';
  if (sampleSize >= VALIDATION_THRESHOLDS.confidenceLevels.high) {
    confidenceLevel = 'high';
  } else if (sampleSize >= VALIDATION_THRESHOLDS.confidenceLevels.medium) {
    confidenceLevel = 'medium';
  } else if (sampleSize >= VALIDATION_THRESHOLDS.confidenceLevels.low) {
    confidenceLevel = 'low';
  }
  
  // Calculate standard error for win rate
  const winRate = extractWinRate(result);
  const proportion = (winRate || 50) / 100;
  const standardError = sampleSize > 0 
    ? Math.sqrt((proportion * (1 - proportion)) / sampleSize) * 100
    : 100;
  
  // 95% confidence interval
  const marginOfError = 1.96 * standardError;
  const confidenceInterval = {
    lower: Math.max(0, (winRate || 50) - marginOfError),
    upper: Math.min(100, (winRate || 50) + marginOfError),
  };
  
  // Simple significance test: is the win rate significantly different from 50%?
  const zScore = sampleSize > 0 
    ? ((winRate || 50) - 50) / standardError
    : 0;
  const pValue = 2 * (1 - normalCDF(Math.abs(zScore)));
  const isStatisticallySignificant = pValue < VALIDATION_THRESHOLDS.pValueThreshold;
  
  // Calculate effect size (Cohen's h for proportions)
  const effectSize = 2 * (Math.asin(Math.sqrt(proportion)) - Math.asin(Math.sqrt(0.5)));
  
  // Calculate score
  let score = 0;
  if (confidenceLevel === 'high') score += 40;
  else if (confidenceLevel === 'medium') score += 25;
  else if (confidenceLevel === 'low') score += 10;
  
  if (isStatisticallySignificant) score += 30;
  if (marginOfError < 10) score += 20;
  else if (marginOfError < 20) score += 10;
  
  if (Math.abs(effectSize) > 0.2) score += 10; // Medium effect size
  
  return {
    score: Math.min(100, score),
    confidenceLevel,
    standardError,
    marginOfError,
    confidenceInterval,
    pValue,
    isStatisticallySignificant,
    effectSize,
  };
}

function extractWinRate(result: any): number | undefined {
  if (result.winRate !== undefined) return result.winRate;
  if (result.hitRate !== undefined) return result.hitRate;
  if (result.percentage !== undefined) return result.percentage;
  if (result.analysis?.[0]?.winRate !== undefined) return result.analysis[0].winRate;
  if (result.afterOversold?.hitRate !== undefined) return result.afterOversold.hitRate;
  return undefined;
}

// Standard normal CDF approximation
function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);
  
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  
  return 0.5 * (1.0 + sign * y);
}

// ============================================================
// SANITY CHECKS
// ============================================================

function performSanityChecks(studyType: string, result: any): SanityCheckReport {
  const checks: SanityCheck[] = [];
  
  // Win rate bounds check
  const winRate = extractWinRate(result);
  if (winRate !== undefined) {
    const inBounds = winRate >= VALIDATION_THRESHOLDS.winRate.min && 
                     winRate <= VALIDATION_THRESHOLDS.winRate.max;
    checks.push({
      name: 'WIN_RATE_BOUNDS',
      passed: inBounds,
      message: inBounds 
        ? `Win rate (${winRate.toFixed(1)}%) is within expected bounds`
        : `Win rate (${winRate.toFixed(1)}%) is outside expected bounds (${VALIDATION_THRESHOLDS.winRate.min}%-${VALIDATION_THRESHOLDS.winRate.max}%)`,
      severity: inBounds ? 'info' : 'warning',
    });
  }
  
  // Expected return bounds check
  const returns = extractReturns(result);
  for (const ret of returns) {
    if (Math.abs(ret) > 50) {
      checks.push({
        name: 'EXTREME_RETURN',
        passed: false,
        message: `Extreme return value detected: ${ret.toFixed(2)}%`,
        severity: 'warning',
      });
      break;
    }
  }
  if (!checks.some(c => c.name === 'EXTREME_RETURN')) {
    checks.push({
      name: 'RETURN_BOUNDS',
      passed: true,
      message: 'All return values are within expected bounds',
      severity: 'info',
    });
  }
  
  // Sample consistency check
  const sampleSize = extractSampleSize(result);
  if (sampleSize > 0) {
    checks.push({
      name: 'HAS_DATA',
      passed: true,
      message: `Study has ${sampleSize} data points`,
      severity: 'info',
    });
  } else {
    checks.push({
      name: 'NO_DATA',
      passed: false,
      message: 'No data points found in study results',
      severity: 'error',
    });
  }
  
  // Conditional study specific checks
  if (studyType.startsWith('after_')) {
    const analysis = result.analysis || [];
    if (Array.isArray(analysis) && analysis.length > 0) {
      // Check for decreasing sample size over time horizons (expected)
      const occurrences = analysis.map((a: any) => a.occurrences || 0);
      const isDecreasing = occurrences.every((v: number, i: number) => 
        i === 0 || v <= occurrences[i - 1] * 1.2 // Allow some variance
      );
      checks.push({
        name: 'TIME_HORIZON_CONSISTENCY',
        passed: isDecreasing,
        message: isDecreasing 
          ? 'Sample sizes across time horizons are consistent'
          : 'Unexpected sample size pattern across time horizons',
        severity: isDecreasing ? 'info' : 'warning',
      });
    }
  }
  
  // RSI specific checks
  if (studyType === 'rsi_analysis') {
    const current = result.current;
    if (current !== undefined) {
      const validRSI = current >= 0 && current <= 100;
      checks.push({
        name: 'VALID_RSI',
        passed: validRSI,
        message: validRSI 
          ? `Current RSI (${current.toFixed(1)}) is valid`
          : `Invalid RSI value: ${current}`,
        severity: validRSI ? 'info' : 'error',
      });
    }
  }
  
  // Gap analysis specific checks
  if (studyType === 'gap_analysis' || studyType === 'after_gap') {
    const gapStats = result.gapsUp || result.gapUps;
    if (gapStats) {
      const fillRate = gapStats.fillRate;
      if (fillRate !== undefined && (fillRate < 0 || fillRate > 100)) {
        checks.push({
          name: 'INVALID_FILL_RATE',
          passed: false,
          message: `Invalid gap fill rate: ${fillRate}%`,
          severity: 'error',
        });
      } else {
        checks.push({
          name: 'VALID_FILL_RATE',
          passed: true,
          message: 'Gap fill rate is valid',
          severity: 'info',
        });
      }
    }
  }
  
  // Calculate score
  const passedChecks = checks.filter(c => c.passed).length;
  const totalChecks = checks.length;
  const score = totalChecks > 0 ? (passedChecks / totalChecks) * 100 : 0;
  
  return {
    score,
    checks,
    passedChecks,
    totalChecks,
  };
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function getStudyCategory(studyType: string): string {
  const categoryMap: Record<string, string> = {
    'after_down_x': 'conditional',
    'after_up_x': 'conditional',
    'after_consecutive_days': 'conditional',
    'after_high_volume': 'conditional',
    'after_gap': 'conditional',
    'below_ma': 'conditional',
    'after_drawdown': 'conditional',
    'daily_close_gt_open': 'basic',
    'daily_close_gt_prior': 'basic',
    'daily_return_distribution': 'basic',
    'up_down_streaks': 'basic',
    'day_of_week_returns': 'seasonality',
    'month_of_year_returns': 'seasonality',
    'rsi_analysis': 'technical',
    'moving_average_analysis': 'technical',
    'trend_strength': 'technical',
    'macd_analysis': 'technical',
    'bollinger_analysis': 'technical',
    'stochastic_analysis': 'technical',
    'volatility_analysis': 'technical',
  };
  
  return categoryMap[studyType] || 'default';
}

function calculateOverallScore(
  dataQuality: DataQualityReport,
  statisticalValidity: StatisticalValidityReport,
  sanityChecks: SanityCheckReport,
): number {
  // Weighted average
  const weights = {
    dataQuality: 0.35,
    statisticalValidity: 0.35,
    sanityChecks: 0.30,
  };
  
  return Math.round(
    dataQuality.score * weights.dataQuality +
    statisticalValidity.score * weights.statisticalValidity +
    sanityChecks.score * weights.sanityChecks
  );
}

// ============================================================
// BATCH VALIDATION
// ============================================================

export interface BatchValidationResult {
  totalStudies: number;
  validStudies: number;
  invalidStudies: number;
  averageScore: number;
  byStudyType: Record<string, ValidationResult>;
  crossStudyIssues: CrossStudyIssue[];
}

export interface CrossStudyIssue {
  type: 'conflict' | 'inconsistency' | 'anomaly';
  studies: string[];
  message: string;
}

export function validateBatchStudies(
  results: Record<string, any>,
  bars?: any[],
): BatchValidationResult {
  const validations: Record<string, ValidationResult> = {};
  let totalScore = 0;
  let validCount = 0;
  let invalidCount = 0;
  
  for (const [studyType, result] of Object.entries(results)) {
    if (!result || result.error) continue;
    
    const validation = validateStudyResult(studyType, result, bars);
    validations[studyType] = validation;
    totalScore += validation.overallScore;
    
    if (validation.isValid) {
      validCount++;
    } else {
      invalidCount++;
    }
  }
  
  const totalStudies = validCount + invalidCount;
  
  // Detect cross-study issues
  const crossStudyIssues = detectCrossStudyIssues(validations);
  
  return {
    totalStudies,
    validStudies: validCount,
    invalidStudies: invalidCount,
    averageScore: totalStudies > 0 ? Math.round(totalScore / totalStudies) : 0,
    byStudyType: validations,
    crossStudyIssues,
  };
}

function detectCrossStudyIssues(validations: Record<string, ValidationResult>): CrossStudyIssue[] {
  const issues: CrossStudyIssue[] = [];
  
  // Check for conflicting signals
  // e.g., RSI says overbought but after_up_x says momentum continues
  
  // Check for inconsistent sample sizes
  const sampleSizes = Object.entries(validations)
    .map(([study, v]) => ({ study, size: v.dataQuality.sampleSize }))
    .filter(s => s.size > 0);
  
  if (sampleSizes.length > 1) {
    const maxSize = Math.max(...sampleSizes.map(s => s.size));
    const minSize = Math.min(...sampleSizes.map(s => s.size));
    
    // Flag if there's a huge disparity (might indicate data issues)
    if (maxSize > minSize * 10) {
      issues.push({
        type: 'inconsistency',
        studies: sampleSizes.map(s => s.study),
        message: `Large sample size disparity (${minSize} to ${maxSize}) across studies`,
      });
    }
  }
  
  return issues;
}

// ============================================================
// VALIDATION SUMMARY COMPONENT DATA
// ============================================================

export function getValidationSummary(validation: ValidationResult): {
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  color: string;
  label: string;
  description: string;
} {
  const { overallScore } = validation;
  
  if (overallScore >= 80) {
    return { 
      grade: 'A', 
      color: 'emerald', 
      label: 'High Confidence',
      description: 'Statistically robust with sufficient data',
    };
  } else if (overallScore >= 65) {
    return { 
      grade: 'B', 
      color: 'green', 
      label: 'Good Confidence',
      description: 'Generally reliable but some limitations',
    };
  } else if (overallScore >= 50) {
    return { 
      grade: 'C', 
      color: 'yellow', 
      label: 'Moderate Confidence',
      description: 'Use with caution, limited sample or significance',
    };
  } else if (overallScore >= 35) {
    return { 
      grade: 'D', 
      color: 'orange', 
      label: 'Low Confidence',
      description: 'Insufficient data for reliable conclusions',
    };
  } else {
    return { 
      grade: 'F', 
      color: 'red', 
      label: 'Unreliable',
      description: 'Results should not be trusted',
    };
  }
}
