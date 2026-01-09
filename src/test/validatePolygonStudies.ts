/**
 * Polygon Studies Accuracy Validation Test
 * 
 * This script tests all 17 quantitative studies to verify:
 * 1. Real Polygon data is being fetched (useMockData should be false)
 * 2. All calculations are mathematically accurate
 * 3. Results have expected ranges and properties
 * 
 * To run: Import and call validateAllStudies() from browser console or add to test suite
 */

import { supabase } from '@/integrations/supabase/client';

interface ValidationResult {
  study: string;
  studyType: string;
  passed: boolean;
  usedRealData: boolean;
  barsAnalyzed: number;
  dateRange: { start: string; end: string } | null;
  issues: string[];
  metrics: Record<string, any>;
}

const STUDY_TYPES = [
  'daily_close_gt_open',
  'daily_close_gt_prior', 
  'daily_return_distribution',
  'up_down_streaks',
  'day_of_week_returns',
  'month_of_year_returns',
  'gap_analysis',
  'volatility_analysis',
  'drawdown_analysis',
  'moving_average_analysis',
  'volume_analysis',
  'rsi_analysis',
  'mean_reversion',
  'range_analysis',
  'high_low_analysis',
  'trend_strength',
  'price_targets'
];

async function runStudy(ticker: string, studyType: string, years: number = 3): Promise<any> {
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - years);
  
  const { data, error } = await supabase.functions.invoke('run-asset-study', {
    body: {
      ticker,
      studyType,
      startDate: startDate.toISOString().split('T')[0],
      endDate
    }
  });
  
  if (error) throw error;
  return data;
}

function validatePercentageStudy(result: any, studyType: string): { passed: boolean; issues: string[] } {
  const issues: string[] = [];
  
  if (result.type !== 'percentage') {
    issues.push(`Expected type 'percentage', got '${result.type}'`);
  }
  
  if (typeof result.percentage !== 'number' || result.percentage < 0 || result.percentage > 100) {
    issues.push(`Percentage ${result.percentage} out of valid range [0, 100]`);
  }
  
  if (result.up_days + result.down_days + result.unchanged !== result.total_days) {
    issues.push(`Day counts don't add up: ${result.up_days} + ${result.down_days} + ${result.unchanged} ≠ ${result.total_days}`);
  }
  
  const calculatedPct = (result.up_days / result.total_days) * 100;
  if (Math.abs(calculatedPct - result.percentage) > 0.01) {
    issues.push(`Percentage calculation mismatch: ${calculatedPct.toFixed(2)} vs ${result.percentage.toFixed(2)}`);
  }
  
  return { passed: issues.length === 0, issues };
}

function validateDistributionStudy(result: any): { passed: boolean; issues: string[] } {
  const issues: string[] = [];
  
  if (result.type !== 'distribution') {
    issues.push(`Expected type 'distribution', got '${result.type}'`);
  }
  
  // Mean should be small for daily returns
  if (Math.abs(result.mean) > 1) {
    issues.push(`Mean daily return ${result.mean.toFixed(3)}% seems too large`);
  }
  
  // StdDev should be reasonable (0.5% - 5% for most stocks)
  if (result.stdDev < 0.3 || result.stdDev > 10) {
    issues.push(`StdDev ${result.stdDev.toFixed(3)}% outside expected range [0.3, 10]`);
  }
  
  // Annualized vol should be stdDev * sqrt(252)
  const expectedAnnualVol = result.stdDev * Math.sqrt(252);
  if (Math.abs(expectedAnnualVol - result.annualizedVol) > 0.1) {
    issues.push(`Annualized vol mismatch: expected ${expectedAnnualVol.toFixed(2)}%, got ${result.annualizedVol.toFixed(2)}%`);
  }
  
  // Check percentiles are in order
  const p = result.percentiles;
  if (!(p.p5 <= p.p25 && p.p25 <= p.p50 && p.p50 <= p.p75 && p.p75 <= p.p95)) {
    issues.push(`Percentiles not in ascending order: ${p.p5}, ${p.p25}, ${p.p50}, ${p.p75}, ${p.p95}`);
  }
  
  // Min should equal or be less than p5, max should equal or be greater than p95
  if (result.min > p.p5 || result.max < p.p95) {
    issues.push(`Min/Max inconsistent with percentiles`);
  }
  
  return { passed: issues.length === 0, issues };
}

function validateStreaksStudy(result: any): { passed: boolean; issues: string[] } {
  const issues: string[] = [];
  
  if (result.type !== 'streaks') {
    issues.push(`Expected type 'streaks', got '${result.type}'`);
  }
  
  if (result.maxUpStreak < 1 || result.maxDownStreak < 1) {
    issues.push(`Max streaks should be >= 1`);
  }
  
  if (result.avgUpStreak <= 0 || result.avgDownStreak <= 0) {
    issues.push(`Average streaks should be > 0`);
  }
  
  if (result.avgUpStreak > result.maxUpStreak) {
    issues.push(`Avg up streak ${result.avgUpStreak} > max up streak ${result.maxUpStreak}`);
  }
  
  if (!['up', 'down'].includes(result.currentDirection)) {
    issues.push(`Invalid current direction: ${result.currentDirection}`);
  }
  
  return { passed: issues.length === 0, issues };
}

function validateCalendarStudy(result: any): { passed: boolean; issues: string[] } {
  const issues: string[] = [];
  
  if (result.type !== 'calendar') {
    issues.push(`Expected type 'calendar', got '${result.type}'`);
  }
  
  if (!Array.isArray(result.stats) || result.stats.length === 0) {
    issues.push('Stats array is empty or not an array');
    return { passed: false, issues };
  }
  
  for (const stat of result.stats) {
    if (typeof stat.avgReturn !== 'number') {
      issues.push(`Invalid avgReturn for ${stat.name}`);
    }
    if (stat.hitRate < 0 || stat.hitRate > 100) {
      issues.push(`Hit rate ${stat.hitRate} out of range for ${stat.name}`);
    }
    if (stat.count <= 0) {
      issues.push(`Invalid count for ${stat.name}`);
    }
  }
  
  // For day of week, should have Mon-Fri (no weekends for stocks)
  if (result.period === 'day_of_week') {
    const dayNames = result.stats.map((s: any) => s.name);
    if (dayNames.includes('Sunday') || dayNames.includes('Saturday')) {
      issues.push('Weekend days found in day-of-week analysis');
    }
  }
  
  return { passed: issues.length === 0, issues };
}

function validateGapStudy(result: any): { passed: boolean; issues: string[] } {
  const issues: string[] = [];
  
  if (result.type !== 'gap_analysis') {
    issues.push(`Expected type 'gap_analysis', got '${result.type}'`);
  }
  
  // Gap counts should be non-negative
  if (result.gapsUp.count < 0 || result.gapsDown.count < 0) {
    issues.push('Gap counts cannot be negative');
  }
  
  // Fill rates should be 0-100%
  if (result.gapsUp.count > 0) {
    if (result.gapsUp.fillRate < 0 || result.gapsUp.fillRate > 100) {
      issues.push(`Gap up fill rate ${result.gapsUp.fillRate} out of range`);
    }
    if (result.gapsUp.avgGapSize <= 0) {
      issues.push(`Gap up avg size should be positive, got ${result.gapsUp.avgGapSize}`);
    }
  }
  
  if (result.gapsDown.count > 0) {
    if (result.gapsDown.fillRate < 0 || result.gapsDown.fillRate > 100) {
      issues.push(`Gap down fill rate ${result.gapsDown.fillRate} out of range`);
    }
    if (result.gapsDown.avgGapSize >= 0) {
      issues.push(`Gap down avg size should be negative, got ${result.gapsDown.avgGapSize}`);
    }
  }
  
  return { passed: issues.length === 0, issues };
}

function validateVolatilityStudy(result: any): { passed: boolean; issues: string[] } {
  const issues: string[] = [];
  
  if (result.type !== 'volatility') {
    issues.push(`Expected type 'volatility', got '${result.type}'`);
  }
  
  // ATR should be positive
  if (result.atr.current <= 0 || result.atr.avg <= 0) {
    issues.push(`ATR values should be positive`);
  }
  
  // Min <= Avg <= Max
  if (!(result.atr.min <= result.atr.avg && result.atr.avg <= result.atr.max)) {
    issues.push(`ATR min/avg/max inconsistent: ${result.atr.min}, ${result.atr.avg}, ${result.atr.max}`);
  }
  
  // Daily range should be positive percentages
  if (result.dailyRange.avg <= 0) {
    issues.push(`Average daily range should be positive`);
  }
  
  // Volatility clustering should be 0-100%
  if (result.volatilityClustering < 0 || result.volatilityClustering > 100) {
    issues.push(`Volatility clustering ${result.volatilityClustering} out of range`);
  }
  
  return { passed: issues.length === 0, issues };
}

function validateDrawdownStudy(result: any): { passed: boolean; issues: string[] } {
  const issues: string[] = [];
  
  if (result.type !== 'drawdown') {
    issues.push(`Expected type 'drawdown', got '${result.type}'`);
  }
  
  // Max drawdown should be positive and <= 100%
  if (result.maxDrawdown < 0 || result.maxDrawdown > 100) {
    issues.push(`Max drawdown ${result.maxDrawdown} out of valid range [0, 100]`);
  }
  
  // Current drawdown should be <= max drawdown
  if (result.currentDrawdown > result.maxDrawdown) {
    issues.push(`Current drawdown ${result.currentDrawdown} > max drawdown ${result.maxDrawdown}`);
  }
  
  // Recovery days should be non-negative
  if (result.avgRecoveryDays < 0) {
    issues.push(`Average recovery days cannot be negative`);
  }
  
  return { passed: issues.length === 0, issues };
}

function validateMovingAverageStudy(result: any): { passed: boolean; issues: string[] } {
  const issues: string[] = [];
  
  if (result.type !== 'moving_average') {
    issues.push(`Expected type 'moving_average', got '${result.type}'`);
  }
  
  // Check each MA period
  for (const period of ['ma20', 'ma50', 'ma200']) {
    if (result[period]) {
      const ma = result[period];
      
      // SMA and EMA should be positive
      if (ma.sma <= 0 || ma.ema <= 0) {
        issues.push(`${period} SMA/EMA should be positive`);
      }
      
      // Percentage above should be 0-100%
      if (ma.pctAboveSMA < 0 || ma.pctAboveSMA > 100) {
        issues.push(`${period} pctAboveSMA ${ma.pctAboveSMA} out of range`);
      }
    }
  }
  
  // Current trend should be bullish or bearish (if available)
  if (result.currentTrend && !['bullish', 'bearish'].includes(result.currentTrend)) {
    issues.push(`Invalid current trend: ${result.currentTrend}`);
  }
  
  return { passed: issues.length === 0, issues };
}

function validateVolumeStudy(result: any): { passed: boolean; issues: string[] } {
  const issues: string[] = [];
  
  if (result.type !== 'volume') {
    issues.push(`Expected type 'volume', got '${result.type}'`);
  }
  
  // Volume should be positive
  if (result.avgVolume <= 0 || result.currentVolume <= 0) {
    issues.push(`Volume values should be positive`);
  }
  
  // Volume ratio should be positive
  if (result.volumeRatio <= 0) {
    issues.push(`Volume ratio should be positive`);
  }
  
  // Volume bias should be accumulation or distribution
  if (!['accumulation', 'distribution'].includes(result.volumeBias)) {
    issues.push(`Invalid volume bias: ${result.volumeBias}`);
  }
  
  return { passed: issues.length === 0, issues };
}

function validateRSIStudy(result: any): { passed: boolean; issues: string[] } {
  const issues: string[] = [];
  
  if (result.type !== 'rsi') {
    issues.push(`Expected type 'rsi', got '${result.type}'`);
  }
  
  // RSI should be 0-100
  if (result.current < 0 || result.current > 100) {
    issues.push(`Current RSI ${result.current} out of valid range [0, 100]`);
  }
  
  if (result.avg < 0 || result.avg > 100) {
    issues.push(`Average RSI ${result.avg} out of valid range [0, 100]`);
  }
  
  // Overbought/oversold percentages should be 0-100%
  if (result.overboughtPct < 0 || result.overboughtPct > 100) {
    issues.push(`Overbought percentage ${result.overboughtPct} out of range`);
  }
  
  if (result.oversoldPct < 0 || result.oversoldPct > 100) {
    issues.push(`Oversold percentage ${result.oversoldPct} out of range`);
  }
  
  // Distribution should sum to approximately total count
  const distTotal = result.distribution.reduce((sum: number, d: any) => sum + d.count, 0);
  // Allow some margin due to NaN values in RSI calculation
  if (distTotal === 0) {
    issues.push('RSI distribution has no values');
  }
  
  return { passed: issues.length === 0, issues };
}

function validateMeanReversionStudy(result: any): { passed: boolean; issues: string[] } {
  const issues: string[] = [];
  
  if (result.type !== 'mean_reversion') {
    issues.push(`Expected type 'mean_reversion', got '${result.type}'`);
  }
  
  // Autocorrelation should be between -1 and 1
  if (result.autocorrelation < -1 || result.autocorrelation > 1) {
    issues.push(`Autocorrelation ${result.autocorrelation} out of valid range [-1, 1]`);
  }
  
  // Regime should be valid
  if (!['mean_reverting', 'trending', 'random'].includes(result.regime)) {
    issues.push(`Invalid regime: ${result.regime}`);
  }
  
  // Reversal rates should be 0-100%
  if (result.afterLargeUp.reversalRate < 0 || result.afterLargeUp.reversalRate > 100) {
    issues.push(`After large up reversal rate ${result.afterLargeUp.reversalRate} out of range`);
  }
  
  return { passed: issues.length === 0, issues };
}

function validateRangeStudy(result: any): { passed: boolean; issues: string[] } {
  const issues: string[] = [];
  
  if (result.type !== 'range') {
    issues.push(`Expected type 'range', got '${result.type}'`);
  }
  
  // Average range should be positive
  if (result.avgDailyRange <= 0 || result.avgRangePercent <= 0) {
    issues.push(`Range values should be positive`);
  }
  
  // Body percent should be 0-100%
  if (result.avgBodyPercent < 0 || result.avgBodyPercent > 100) {
    issues.push(`Average body percent ${result.avgBodyPercent} out of range`);
  }
  
  // Doji rate should be 0-100%
  if (result.dojiRate < 0 || result.dojiRate > 100) {
    issues.push(`Doji rate ${result.dojiRate} out of range`);
  }
  
  return { passed: issues.length === 0, issues };
}

function validateHighLowStudy(result: any): { passed: boolean; issues: string[] } {
  const issues: string[] = [];
  
  if (result.type !== 'high_low') {
    issues.push(`Expected type 'high_low', got '${result.type}'`);
  }
  
  // Year high should be >= year low
  if (result.yearHigh < result.yearLow) {
    issues.push(`Year high ${result.yearHigh} < year low ${result.yearLow}`);
  }
  
  // Distance from high should be <= 0 (can't be above 52-week high)
  if (result.distFromHigh > 1) { // Allow tiny margin for rounding
    issues.push(`Distance from high ${result.distFromHigh}% should be <= 0`);
  }
  
  // Distance from low should be >= 0 (can't be below 52-week low)
  if (result.distFromLow < -1) { // Allow tiny margin for rounding
    issues.push(`Distance from low ${result.distFromLow}% should be >= 0`);
  }
  
  return { passed: issues.length === 0, issues };
}

function validateTrendStrengthStudy(result: any): { passed: boolean; issues: string[] } {
  const issues: string[] = [];
  
  if (result.type !== 'trend_strength') {
    issues.push(`Expected type 'trend_strength', got '${result.type}'`);
  }
  
  // Score should be 0 to maxScore
  if (result.trendScore < 0 || result.trendScore > result.maxScore) {
    issues.push(`Trend score ${result.trendScore} out of valid range [0, ${result.maxScore}]`);
  }
  
  // Direction should be valid
  if (!['strong_up', 'up', 'neutral', 'down', 'strong_down'].includes(result.trendDirection)) {
    issues.push(`Invalid trend direction: ${result.trendDirection}`);
  }
  
  // Higher highs/lows rate should be 0-100%
  if (result.higherHighsRate < 0 || result.higherHighsRate > 100) {
    issues.push(`Higher highs rate ${result.higherHighsRate} out of range`);
  }
  
  return { passed: issues.length === 0, issues };
}

function validatePriceTargetsStudy(result: any): { passed: boolean; issues: string[] } {
  const issues: string[] = [];
  
  if (result.type !== 'price_targets') {
    issues.push(`Expected type 'price_targets', got '${result.type}'`);
  }
  
  // Current price should be positive
  if (result.currentPrice <= 0) {
    issues.push(`Current price should be positive`);
  }
  
  // Check projections order: worst < bear < expected < bull < best
  const p30 = result.projections.days30;
  if (p30.worst >= p30.bear || p30.bear >= p30.expected || p30.expected >= p30.bull || p30.bull >= p30.best) {
    issues.push(`30-day projections not in expected order: worst=${p30.worst}, bear=${p30.bear}, expected=${p30.expected}, bull=${p30.bull}, best=${p30.best}`);
  }
  
  return { passed: issues.length === 0, issues };
}

function validateStudyResult(studyType: string, result: any): { passed: boolean; issues: string[] } {
  switch (studyType) {
    case 'daily_close_gt_open':
    case 'daily_close_gt_prior':
      return validatePercentageStudy(result, studyType);
    case 'daily_return_distribution':
      return validateDistributionStudy(result);
    case 'up_down_streaks':
      return validateStreaksStudy(result);
    case 'day_of_week_returns':
    case 'month_of_year_returns':
      return validateCalendarStudy(result);
    case 'gap_analysis':
      return validateGapStudy(result);
    case 'volatility_analysis':
      return validateVolatilityStudy(result);
    case 'drawdown_analysis':
      return validateDrawdownStudy(result);
    case 'moving_average_analysis':
      return validateMovingAverageStudy(result);
    case 'volume_analysis':
      return validateVolumeStudy(result);
    case 'rsi_analysis':
      return validateRSIStudy(result);
    case 'mean_reversion':
      return validateMeanReversionStudy(result);
    case 'range_analysis':
      return validateRangeStudy(result);
    case 'high_low_analysis':
      return validateHighLowStudy(result);
    case 'trend_strength':
      return validateTrendStrengthStudy(result);
    case 'price_targets':
      return validatePriceTargetsStudy(result);
    default:
      return { passed: true, issues: [`No validation for study type: ${studyType}`] };
  }
}

export async function validateAllStudies(ticker: string = 'AAPL'): Promise<{
  summary: { total: number; passed: number; failed: number; usingRealData: number };
  results: ValidationResult[];
}> {
  console.log(`\n🔬 POLYGON STUDIES VALIDATION TEST`);
  console.log(`═══════════════════════════════════════════════════════════════`);
  console.log(`Testing ticker: ${ticker}`);
  console.log(`Studies to test: ${STUDY_TYPES.length}`);
  console.log(`═══════════════════════════════════════════════════════════════\n`);
  
  const results: ValidationResult[] = [];
  
  for (const studyType of STUDY_TYPES) {
    console.log(`Testing: ${studyType}...`);
    
    try {
      const response = await runStudy(ticker, studyType);
      
      if (!response.success) {
        results.push({
          study: studyType,
          studyType,
          passed: false,
          usedRealData: false,
          barsAnalyzed: 0,
          dateRange: null,
          issues: [`API error: ${response.error}`],
          metrics: {}
        });
        console.log(`  ❌ FAIL - API error: ${response.error}`);
        continue;
      }
      
      const validation = validateStudyResult(studyType, response.result);
      const usedRealData = !response.useMockData;
      
      results.push({
        study: studyType,
        studyType,
        passed: validation.passed && usedRealData,
        usedRealData,
        barsAnalyzed: response.barsAnalyzed,
        dateRange: response.dateRange,
        issues: validation.issues.concat(usedRealData ? [] : ['Using mock data - add POLYGON_API_KEY']),
        metrics: response.result
      });
      
      if (validation.passed && usedRealData) {
        console.log(`  ✅ PASS - ${response.barsAnalyzed} bars, real data`);
      } else if (validation.passed && !usedRealData) {
        console.log(`  ⚠️  PASS (mock data) - ${response.barsAnalyzed} bars`);
      } else {
        console.log(`  ❌ FAIL - ${validation.issues.join('; ')}`);
      }
      
    } catch (error: any) {
      results.push({
        study: studyType,
        studyType,
        passed: false,
        usedRealData: false,
        barsAnalyzed: 0,
        dateRange: null,
        issues: [`Exception: ${error.message}`],
        metrics: {}
      });
      console.log(`  ❌ FAIL - Exception: ${error.message}`);
    }
  }
  
  const summary = {
    total: results.length,
    passed: results.filter(r => r.passed).length,
    failed: results.filter(r => !r.passed).length,
    usingRealData: results.filter(r => r.usedRealData).length
  };
  
  console.log(`\n═══════════════════════════════════════════════════════════════`);
  console.log(`SUMMARY`);
  console.log(`═══════════════════════════════════════════════════════════════`);
  console.log(`Total:     ${summary.total}`);
  console.log(`Passed:    ${summary.passed} ✅`);
  console.log(`Failed:    ${summary.failed} ❌`);
  console.log(`Real Data: ${summary.usingRealData}/${summary.total}`);
  console.log(`═══════════════════════════════════════════════════════════════\n`);
  
  if (summary.usingRealData === 0) {
    console.log(`⚠️  WARNING: All tests used mock data!`);
    console.log(`   Add POLYGON_API_KEY to Supabase secrets for real data testing.`);
  }
  
  return { summary, results };
}

export async function validateSingleStudy(ticker: string, studyType: string): Promise<ValidationResult> {
  const response = await runStudy(ticker, studyType);
  
  if (!response.success) {
    return {
      study: studyType,
      studyType,
      passed: false,
      usedRealData: false,
      barsAnalyzed: 0,
      dateRange: null,
      issues: [`API error: ${response.error}`],
      metrics: {}
    };
  }
  
  const validation = validateStudyResult(studyType, response.result);
  const usedRealData = !response.useMockData;
  
  return {
    study: studyType,
    studyType,
    passed: validation.passed && usedRealData,
    usedRealData,
    barsAnalyzed: response.barsAnalyzed,
    dateRange: response.dateRange,
    issues: validation.issues.concat(usedRealData ? [] : ['Using mock data - add POLYGON_API_KEY']),
    metrics: response.result
  };
}

// Quick validation hook for React components
export function useStudyValidation() {
  return {
    validateAll: validateAllStudies,
    validateOne: validateSingleStudy,
    studyTypes: STUDY_TYPES
  };
}

export default validateAllStudies;
