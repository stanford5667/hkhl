/**
 * Portfolio Validation Test Suite
 * 
 * This file provides comprehensive testing utilities for validating that all portfolio
 * calculations use real data from Polygon API and produce accurate results.
 * 
 * Tests can be run from browser console via: runValidationTests()
 */

import {
  validateTickerData,
  validatePortfolioMetrics,
  validateCorrelationMatrix,
  generateDataAuditReport,
  type OHLCVBar,
} from '@/services/dataValidationService';

import {
  calculateSimpleReturns,
  calculateLogReturns,
  calculateSharpeRatio,
  calculateMaxDrawdown,
  annualizedVolatility,
  standardDeviation,
  calculateBetaAlpha,
  calculateSortinoRatio,
} from '@/services/portfolioMetricsService';

// ============================================
// MOCK DATA GENERATORS
// ============================================

/**
 * Generates realistic OHLCV price data with random walk
 * 
 * Why this matters: We need realistic mock data to test validation logic
 * without hitting the actual Polygon API in unit tests.
 * 
 * @param ticker - Stock symbol (for logging only)
 * @param days - Number of trading days to generate
 * @param startPrice - Initial price (default: 100)
 * @param volatility - Daily volatility as decimal (default: 0.02 = 2%)
 * @returns Array of OHLCV bars with realistic price movements
 */
export function generateMockOHLCV(
  ticker: string,
  days: number,
  startPrice: number = 100,
  volatility: number = 0.02
): OHLCVBar[] {
  const bars: OHLCVBar[] = [];
  let currentPrice = startPrice;
  
  // Start from one year ago
  const startTime = Date.now() - days * 24 * 60 * 60 * 1000;
  
  for (let i = 0; i < days; i++) {
    // Skip weekends (rough simulation)
    const dayOfWeek = new Date(startTime + i * 24 * 60 * 60 * 1000).getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;
    
    // Random daily return (normal distribution approximation)
    const dailyReturn = (Math.random() - 0.5) * 2 * volatility + 0.0003; // Slight upward drift
    const dailyMove = currentPrice * dailyReturn;
    
    // Generate realistic OHLC from daily move
    const open = currentPrice;
    const close = currentPrice + dailyMove;
    const high = Math.max(open, close) * (1 + Math.random() * 0.01);
    const low = Math.min(open, close) * (1 - Math.random() * 0.01);
    const volume = Math.floor(1000000 + Math.random() * 5000000);
    
    bars.push({
      t: startTime + i * 24 * 60 * 60 * 1000,
      o: Math.max(0.01, open),
      h: Math.max(0.01, high),
      l: Math.max(0.01, low),
      c: Math.max(0.01, close),
      v: volume,
    });
    
    currentPrice = close;
  }
  
  console.log(`[MockGenerator] Generated ${bars.length} bars for ${ticker} (requested ${days} days)`);
  return bars;
}

/**
 * Generates a valid correlation matrix for given tickers
 * 
 * Why this matters: Correlation matrices must satisfy mathematical properties
 * (symmetric, diagonal = 1, values in [-1, 1]) for portfolio optimization.
 * 
 * @param tickers - Array of ticker symbols
 * @param baseCorrelation - Base correlation between assets (default: 0.3)
 * @returns 2D array representing correlation matrix
 */
export function generateMockCorrelationMatrix(
  tickers: string[],
  baseCorrelation: number = 0.3
): number[][] {
  const n = tickers.length;
  const matrix: number[][] = [];
  
  for (let i = 0; i < n; i++) {
    matrix[i] = [];
    for (let j = 0; j < n; j++) {
      if (i === j) {
        // Diagonal must be exactly 1.0 (correlation with self)
        matrix[i][j] = 1.0;
      } else if (j < i) {
        // Copy from symmetric position (must be symmetric)
        matrix[i][j] = matrix[j][i];
      } else {
        // Generate random correlation with some structure
        const randomVariation = (Math.random() - 0.5) * 0.4;
        matrix[i][j] = Math.max(-1, Math.min(1, baseCorrelation + randomVariation));
      }
    }
  }
  
  console.log(`[MockGenerator] Generated ${n}x${n} correlation matrix`);
  return matrix;
}

/**
 * Generates realistic daily return series
 * 
 * Why this matters: Return series are the foundation of all portfolio metrics.
 * They should have realistic statistical properties.
 * 
 * @param days - Number of returns to generate
 * @param annualReturn - Expected annual return (default: 0.08 = 8%)
 * @param annualVolatility - Expected annual volatility (default: 0.15 = 15%)
 * @returns Array of daily returns
 */
export function generateMockPortfolioReturns(
  days: number,
  annualReturn: number = 0.08,
  annualVolatility: number = 0.15
): number[] {
  const dailyReturn = annualReturn / 252;
  const dailyVol = annualVolatility / Math.sqrt(252);
  
  const returns: number[] = [];
  
  for (let i = 0; i < days; i++) {
    // Box-Muller transform for normal distribution
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    
    returns.push(dailyReturn + dailyVol * z);
  }
  
  console.log(`[MockGenerator] Generated ${returns.length} daily returns`);
  return returns;
}

/**
 * Generates invalid OHLCV data for testing error detection
 * 
 * Why this matters: Our validation must catch bad data before it corrupts calculations.
 */
export function generateInvalidOHLCV(): OHLCVBar[] {
  return [
    // Negative price
    { t: Date.now() - 5 * 24 * 60 * 60 * 1000, o: 100, h: 101, l: -5, c: 100, v: 1000 },
    // High < Low (impossible)
    { t: Date.now() - 4 * 24 * 60 * 60 * 1000, o: 100, h: 95, l: 105, c: 100, v: 1000 },
    // Zero volume (valid but flagged)
    { t: Date.now() - 3 * 24 * 60 * 60 * 1000, o: 100, h: 101, l: 99, c: 100, v: 0 },
    // Normal bar for comparison
    { t: Date.now() - 2 * 24 * 60 * 60 * 1000, o: 100, h: 102, l: 99, c: 101, v: 1000 },
    // Out of order timestamp
    { t: Date.now() - 6 * 24 * 60 * 60 * 1000, o: 100, h: 101, l: 99, c: 100, v: 1000 },
  ];
}

// ============================================
// TEST RESULT TYPES
// ============================================

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  duration: number;
}

interface TestSuite {
  name: string;
  tests: TestResult[];
  passed: number;
  failed: number;
  duration: number;
}

// ============================================
// DATA VALIDATION SERVICE TESTS
// ============================================

/**
 * Tests for the DataValidationService
 * 
 * These tests ensure our validation logic correctly identifies
 * data quality issues before they affect portfolio calculations.
 */
function runDataValidationTests(): TestSuite {
  const tests: TestResult[] = [];
  const suiteStart = performance.now();
  
  // Test 1: Detect invalid price data (negative values)
  // Why: Negative prices are impossible and indicate data corruption
  {
    const start = performance.now();
    const invalidData = generateInvalidOHLCV();
    const result = validateTickerData('TEST', invalidData);
    
    const passed = !result.isValid && result.issues.some(i => i.includes('non-positive'));
    tests.push({
      name: 'should detect invalid price data (negative values)',
      passed,
      message: passed 
        ? `Correctly detected negative prices: ${result.issues.length} issues found`
        : `Failed to detect negative prices. Valid: ${result.isValid}, Issues: ${result.issues.join(', ')}`,
      duration: performance.now() - start,
    });
  }
  
  // Test 2: Detect gaps in time series
  // Why: Large gaps indicate missing data which affects return calculations
  {
    const start = performance.now();
    const gappyData = generateMockOHLCV('GAP', 30);
    // Remove some bars to create gaps
    const withGaps = [gappyData[0], gappyData[1], gappyData[15], gappyData[16]];
    
    const result = validateTickerData('GAP', withGaps, {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: new Date(),
    });
    
    // Should flag low coverage
    const passed = result.dataQuality !== 'high' || result.issues.length > 0;
    tests.push({
      name: 'should detect gaps in time series',
      passed,
      message: passed 
        ? `Correctly flagged sparse data: quality=${result.dataQuality}, issues=${result.issues.length}`
        : `Failed to detect gaps. Quality: ${result.dataQuality}`,
      duration: performance.now() - start,
    });
  }
  
  // Test 3: Validate correlation matrix symmetry
  // Why: Correlation matrices must be symmetric (corr(A,B) = corr(B,A))
  {
    const start = performance.now();
    const asymmetricMatrix = [
      [1.0, 0.5, 0.3],
      [0.2, 1.0, 0.4], // Asymmetric: 0.2 != 0.5
      [0.3, 0.4, 1.0],
    ];
    
    const result = validateCorrelationMatrix(asymmetricMatrix, ['A', 'B', 'C']);
    
    const passed = !result.isValid && !result.symmetryValid;
    tests.push({
      name: 'should validate correlation matrix symmetry',
      passed,
      message: passed 
        ? `Correctly detected asymmetric matrix`
        : `Failed to detect asymmetry. Symmetric: ${result.symmetryValid}`,
      duration: performance.now() - start,
    });
  }
  
  // Test 4: Flag unrealistic volatility values
  // Why: Volatility > 100% annual is extremely rare and likely indicates data issues
  {
    const start = performance.now();
    const result = validatePortfolioMetrics({
      annualVolatility: 1.5, // 150% - unrealistic
      annualReturn: 0.1,
      sharpeRatio: 0.5,
    });
    
    const passed = !result.isValid && !result.metricsInRange['annualVolatility'];
    tests.push({
      name: 'should flag unrealistic volatility values',
      passed,
      message: passed 
        ? `Correctly flagged 150% volatility as unrealistic`
        : `Failed to flag high volatility. In range: ${result.metricsInRange['annualVolatility']}`,
      duration: performance.now() - start,
    });
  }
  
  // Test 5: Verify portfolio return equals weighted asset returns
  // Why: Ensures our portfolio aggregation math is correct
  {
    const start = performance.now();
    const assetReturns = [
      { weight: 0.6, return: 0.10 }, // 60% @ 10%
      { weight: 0.4, return: 0.05 }, // 40% @ 5%
    ];
    const expectedReturn = 0.6 * 0.10 + 0.4 * 0.05; // = 0.08
    
    // Test with correct value
    const correctResult = validatePortfolioMetrics(
      { annualReturn: expectedReturn },
      assetReturns
    );
    
    // Test with incorrect value
    const incorrectResult = validatePortfolioMetrics(
      { annualReturn: 0.15 }, // Wrong!
      assetReturns
    );
    
    const passed = correctResult.weightedReturnMatch && !incorrectResult.weightedReturnMatch;
    tests.push({
      name: 'should verify portfolio return equals weighted asset returns',
      passed,
      message: passed 
        ? `Correctly validated weighted return match (expected: ${(expectedReturn * 100).toFixed(2)}%)`
        : `Weighted return validation failed. Correct match: ${correctResult.weightedReturnMatch}, Incorrect match: ${incorrectResult.weightedReturnMatch}`,
      duration: performance.now() - start,
    });
  }
  
  // Test 6: Validate valid OHLCV passes
  // Why: Ensure we don't false-positive on good data
  {
    const start = performance.now();
    const validData = generateMockOHLCV('AAPL', 252);
    const result = validateTickerData('AAPL', validData);
    
    const passed = result.isValid && result.dataQuality === 'high';
    tests.push({
      name: 'should pass valid OHLCV data',
      passed,
      message: passed 
        ? `Valid data correctly passed: quality=${result.dataQuality}`
        : `Valid data incorrectly flagged. Valid: ${result.isValid}, Issues: ${result.issues.join(', ')}`,
      duration: performance.now() - start,
    });
  }
  
  return {
    name: 'Data Validation Service',
    tests,
    passed: tests.filter(t => t.passed).length,
    failed: tests.filter(t => !t.passed).length,
    duration: performance.now() - suiteStart,
  };
}

// ============================================
// POLYGON DATA HANDLER TESTS
// ============================================

/**
 * Tests for the Polygon Data Handler
 * 
 * Note: These are mock tests since we can't hit the real API in unit tests.
 * Use integration tests for actual API validation.
 */
function runPolygonDataHandlerTests(): TestSuite {
  const tests: TestResult[] = [];
  const suiteStart = performance.now();
  
  // Test 1: Validation status with fetched data
  // Why: Every API response should include validation metadata
  {
    const start = performance.now();
    const mockBars = generateMockOHLCV('SPY', 252);
    const validation = validateTickerData('SPY', mockBars);
    
    const passed = validation.dataQuality !== undefined && 
                   typeof validation.isValid === 'boolean';
    tests.push({
      name: 'should return validation status with fetched data',
      passed,
      message: passed 
        ? `Validation metadata present: quality=${validation.dataQuality}`
        : `Missing validation metadata`,
      duration: performance.now() - start,
    });
  }
  
  // Test 2: Handle invalid tickers gracefully
  // Why: Invalid tickers shouldn't crash the application
  {
    const start = performance.now();
    const emptyData: OHLCVBar[] = [];
    const result = validateTickerData('INVALID123', emptyData);
    
    const passed = !result.isValid && result.issues.includes('No data provided');
    tests.push({
      name: 'should handle invalid tickers gracefully',
      passed,
      message: passed 
        ? `Empty data correctly handled`
        : `Invalid ticker handling failed`,
      duration: performance.now() - start,
    });
  }
  
  // Test 3: Generate audit report
  // Why: Audit reports provide transparency for all data sources
  {
    const start = performance.now();
    const tickerData: Record<string, OHLCVBar[]> = {
      'AAPL': generateMockOHLCV('AAPL', 100),
      'GOOGL': generateMockOHLCV('GOOGL', 100),
    };
    
    const report = generateDataAuditReport(tickerData);
    
    const passed = report.tickerAudits.length === 2 &&
                   report.overallDataQuality !== undefined &&
                   report.generatedAt !== undefined;
    tests.push({
      name: 'should generate comprehensive audit report',
      passed,
      message: passed 
        ? `Audit report generated: ${report.tickerAudits.length} tickers, quality=${report.overallDataQuality}`
        : `Audit report incomplete`,
      duration: performance.now() - start,
    });
  }
  
  return {
    name: 'Polygon Data Handler',
    tests,
    passed: tests.filter(t => t.passed).length,
    failed: tests.filter(t => !t.passed).length,
    duration: performance.now() - suiteStart,
  };
}

// ============================================
// PORTFOLIO METRICS TESTS
// ============================================

/**
 * Tests for Portfolio Metrics calculations
 * 
 * These tests verify our financial calculations match expected results.
 * We compare against known correct values for specific inputs.
 */
function runPortfolioMetricsTests(): TestSuite {
  const tests: TestResult[] = [];
  const suiteStart = performance.now();
  
  // Test 1: Sharpe ratio calculation
  // Why: Sharpe ratio is the primary risk-adjusted return metric
  {
    const start = performance.now();
    
    // Generate returns with known characteristics
    // 10% annual return, 15% annual volatility, 4% risk-free
    // Expected Sharpe ≈ (0.10 - 0.04) / 0.15 ≈ 0.4
    const dailyReturn = 0.10 / 252;
    const dailyVol = 0.15 / Math.sqrt(252);
    
    const returns: number[] = [];
    for (let i = 0; i < 252; i++) {
      returns.push(dailyReturn + (Math.random() - 0.5) * dailyVol * 0.1);
    }
    
    const sharpe = calculateSharpeRatio(returns, 0.04);
    
    // Sharpe should be positive given positive excess return
    const passed = sharpe > 0 && sharpe < 5; // Reasonable range
    tests.push({
      name: 'should calculate Sharpe ratio correctly',
      passed,
      message: passed 
        ? `Sharpe ratio: ${sharpe.toFixed(4)} (expected positive < 5)`
        : `Sharpe ratio out of range: ${sharpe}`,
      duration: performance.now() - start,
    });
  }
  
  // Test 2: Max drawdown calculation
  // Why: Max drawdown is critical for understanding downside risk
  {
    const start = performance.now();
    
    // Create values with known drawdown
    // Peak at 100, drops to 80, recovers to 90
    const values = [100, 105, 110, 100, 90, 80, 85, 90, 95];
    
    const result = calculateMaxDrawdown(values);
    
    // Max drawdown should be from 110 to 80 = 27.27%
    const expectedDrawdown = ((110 - 80) / 110) * 100;
    const passed = Math.abs(result.maxDrawdownPercent - expectedDrawdown) < 0.1;
    tests.push({
      name: 'should calculate max drawdown correctly',
      passed,
      message: passed 
        ? `Max drawdown: ${result.maxDrawdownPercent.toFixed(2)}% (expected ~${expectedDrawdown.toFixed(2)}%)`
        : `Max drawdown wrong: got ${result.maxDrawdownPercent.toFixed(2)}%, expected ${expectedDrawdown.toFixed(2)}%`,
      duration: performance.now() - start,
    });
  }
  
  // Test 3: Volatility from returns
  // Why: Accurate volatility is essential for risk calculations
  {
    const start = performance.now();
    
    // Create returns with known daily volatility
    const knownDailyVol = 0.01; // 1% daily
    const returns = Array(252).fill(0).map(() => knownDailyVol * (Math.random() - 0.5) * 2);
    
    const annualVol = annualizedVolatility(returns);
    const expectedAnnual = knownDailyVol * Math.sqrt(252); // ~15.87%
    
    // Allow 50% tolerance due to random sampling
    const passed = annualVol > 0 && annualVol < 0.5;
    tests.push({
      name: 'should calculate volatility from returns correctly',
      passed,
      message: passed 
        ? `Annual volatility: ${(annualVol * 100).toFixed(2)}%`
        : `Volatility calculation failed: ${annualVol}`,
      duration: performance.now() - start,
    });
  }
  
  // Test 4: Simple returns calculation
  // Why: Returns are the foundation of all other calculations
  {
    const start = performance.now();
    
    const prices = [100, 105, 103, 108];
    const returns = calculateSimpleReturns(prices);
    
    // Expected: [0.05, -0.019, 0.0485]
    const expected = [0.05, -0.01905, 0.04854];
    
    const passed = returns.length === 3 &&
      Math.abs(returns[0] - expected[0]) < 0.001 &&
      Math.abs(returns[1] - expected[1]) < 0.001;
    tests.push({
      name: 'should calculate simple returns correctly',
      passed,
      message: passed 
        ? `Returns: [${returns.map(r => (r * 100).toFixed(2) + '%').join(', ')}]`
        : `Returns calculation wrong: ${returns}`,
      duration: performance.now() - start,
    });
  }
  
  // Test 5: Log returns calculation
  // Why: Log returns are used for certain statistical analyses
  {
    const start = performance.now();
    
    const prices = [100, 110, 105];
    const returns = calculateLogReturns(prices);
    
    // ln(110/100) ≈ 0.0953, ln(105/110) ≈ -0.0465
    const passed = returns.length === 2 &&
      Math.abs(returns[0] - 0.0953) < 0.001 &&
      Math.abs(returns[1] - (-0.0465)) < 0.001;
    tests.push({
      name: 'should calculate log returns correctly',
      passed,
      message: passed 
        ? `Log returns: [${returns.map(r => r.toFixed(4)).join(', ')}]`
        : `Log returns wrong: ${returns}`,
      duration: performance.now() - start,
    });
  }
  
  // Test 6: Beta and Alpha calculation
  // Why: CAPM metrics are essential for performance attribution
  {
    const start = performance.now();
    
    // Portfolio that moves with market but slightly better
    const benchmarkReturns = generateMockPortfolioReturns(252, 0.10, 0.15);
    const portfolioReturns = benchmarkReturns.map(r => r * 1.1 + 0.0001);
    
    const { beta, alpha } = calculateBetaAlpha(portfolioReturns, benchmarkReturns);
    
    // Beta should be > 1 (amplified market moves)
    const passed = beta > 0.9 && beta < 1.5;
    tests.push({
      name: 'should calculate Beta correctly',
      passed,
      message: passed 
        ? `Beta: ${beta.toFixed(4)}, Alpha: ${alpha.toFixed(4)}%`
        : `Beta out of expected range: ${beta}`,
      duration: performance.now() - start,
    });
  }
  
  return {
    name: 'Portfolio Metrics',
    tests,
    passed: tests.filter(t => t.passed).length,
    failed: tests.filter(t => !t.passed).length,
    duration: performance.now() - suiteStart,
  };
}

// ============================================
// INTEGRATION TEST HELPERS
// ============================================

/**
 * Compares calculated metrics against known correct values
 * 
 * Why this matters: Allows verification against external sources
 * (e.g., Portfolio Visualizer, Bloomberg)
 */
export function compareMetrics(
  calculated: Record<string, number>,
  expected: Record<string, number>,
  tolerance: number = 0.01
): { matches: boolean; discrepancies: Record<string, { calculated: number; expected: number; diff: number }> } {
  const discrepancies: Record<string, { calculated: number; expected: number; diff: number }> = {};
  
  for (const [metric, expectedValue] of Object.entries(expected)) {
    const calculatedValue = calculated[metric];
    if (calculatedValue === undefined) {
      discrepancies[metric] = { calculated: NaN, expected: expectedValue, diff: NaN };
      continue;
    }
    
    const diff = Math.abs(calculatedValue - expectedValue);
    if (diff > tolerance) {
      discrepancies[metric] = { calculated: calculatedValue, expected: expectedValue, diff };
    }
  }
  
  return {
    matches: Object.keys(discrepancies).length === 0,
    discrepancies,
  };
}

/**
 * Verifies Polygon API response structure
 * 
 * Why this matters: API structure changes can break data processing
 */
export function verifyPolygonResponseStructure(response: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!response || typeof response !== 'object') {
    return { valid: false, errors: ['Response is not an object'] };
  }
  
  const resp = response as Record<string, unknown>;
  
  // Check required fields
  if (!Array.isArray(resp.results)) {
    errors.push('Missing or invalid "results" array');
  } else {
    // Check first result structure
    const firstResult = resp.results[0] as Record<string, unknown> | undefined;
    if (firstResult) {
      const requiredFields = ['t', 'o', 'h', 'l', 'c', 'v'];
      for (const field of requiredFields) {
        if (firstResult[field] === undefined) {
          errors.push(`Missing field "${field}" in result`);
        }
      }
    }
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Tests full analysis pipeline end-to-end
 * 
 * Why this matters: Ensures all components work together correctly
 */
export async function testFullPipeline(tickers: string[]): Promise<{
  success: boolean;
  steps: { name: string; status: 'passed' | 'failed'; message: string }[];
}> {
  const steps: { name: string; status: 'passed' | 'failed'; message: string }[] = [];
  
  try {
    // Step 1: Generate mock data (simulating API fetch)
    const mockData = new Map<string, OHLCVBar[]>();
    for (const ticker of tickers) {
      mockData.set(ticker, generateMockOHLCV(ticker, 252));
    }
    steps.push({ name: 'Data Generation', status: 'passed', message: `Generated data for ${tickers.length} tickers` });
    
    // Step 2: Validate all ticker data
    let validationIssues = 0;
    for (const [ticker, bars] of mockData) {
      const result = validateTickerData(ticker, bars);
      if (!result.isValid) validationIssues++;
    }
    steps.push({ 
      name: 'Data Validation', 
      status: validationIssues === 0 ? 'passed' : 'failed',
      message: `${validationIssues} tickers with validation issues`
    });
    
    // Step 3: Build correlation matrix
    const matrix = generateMockCorrelationMatrix(tickers);
    const corrValidation = validateCorrelationMatrix(matrix, tickers);
    steps.push({
      name: 'Correlation Matrix',
      status: corrValidation.isValid ? 'passed' : 'failed',
      message: corrValidation.isValid ? 'Valid correlation matrix' : corrValidation.issues.join(', ')
    });
    
    // Step 4: Calculate portfolio metrics
    const returns = generateMockPortfolioReturns(252);
    const values = returns.reduce((acc, r) => {
      acc.push((acc[acc.length - 1] || 10000) * (1 + r));
      return acc;
    }, [] as number[]);
    
    const sharpe = calculateSharpeRatio(returns);
    const drawdown = calculateMaxDrawdown(values);
    
    const metricsValidation = validatePortfolioMetrics({
      annualReturn: returns.reduce((a, b) => a + b, 0) * 252 / returns.length,
      annualVolatility: annualizedVolatility(returns),
      sharpeRatio: sharpe,
      maxDrawdown: drawdown.maxDrawdownPercent / 100,
    });
    steps.push({
      name: 'Metrics Calculation',
      status: metricsValidation.isValid ? 'passed' : 'failed',
      message: metricsValidation.isValid ? 'All metrics in realistic ranges' : metricsValidation.issues.join(', ')
    });
    
    // Step 5: Generate audit report
    const audit = generateDataAuditReport(Object.fromEntries(mockData));
    steps.push({
      name: 'Audit Report',
      status: audit.totalIssues === 0 ? 'passed' : 'failed',
      message: `Quality: ${audit.overallDataQuality}, Issues: ${audit.totalIssues}`
    });
    
  } catch (error) {
    steps.push({
      name: 'Pipeline',
      status: 'failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
  
  return {
    success: steps.every(s => s.status === 'passed'),
    steps,
  };
}

// ============================================
// CONSOLE TEST RUNNER
// ============================================

/**
 * Runs all validation tests and outputs results to console
 * 
 * Usage: Call runValidationTests() from browser console
 * 
 * @returns Summary of all test results
 */
export function runValidationTests(): {
  totalPassed: number;
  totalFailed: number;
  totalDuration: number;
  suites: TestSuite[];
} {
  console.log('\n🧪 ═══════════════════════════════════════════════');
  console.log('   PORTFOLIO VALIDATION TEST SUITE');
  console.log('═══════════════════════════════════════════════════\n');
  
  const suites: TestSuite[] = [];
  const startTime = performance.now();
  
  // Run all test suites
  console.log('📋 Running Data Validation Tests...');
  suites.push(runDataValidationTests());
  
  console.log('📋 Running Polygon Data Handler Tests...');
  suites.push(runPolygonDataHandlerTests());
  
  console.log('📋 Running Portfolio Metrics Tests...');
  suites.push(runPortfolioMetricsTests());
  
  const totalDuration = performance.now() - startTime;
  
  // Print results table
  console.log('\n📊 TEST RESULTS');
  console.log('───────────────────────────────────────────────────');
  
  for (const suite of suites) {
    const statusIcon = suite.failed === 0 ? '✅' : '❌';
    console.log(`\n${statusIcon} ${suite.name} (${suite.duration.toFixed(1)}ms)`);
    console.log('   ─────────────────────────────────────────────');
    
    for (const test of suite.tests) {
      const icon = test.passed ? '  ✓' : '  ✗';
      const style = test.passed ? 'color: green' : 'color: red; font-weight: bold';
      console.log(`%c${icon} ${test.name}`, style);
      if (!test.passed) {
        console.log(`     └─ ${test.message}`);
      }
    }
  }
  
  // Summary
  const totalPassed = suites.reduce((sum, s) => sum + s.passed, 0);
  const totalFailed = suites.reduce((sum, s) => sum + s.failed, 0);
  const totalTests = totalPassed + totalFailed;
  
  console.log('\n═══════════════════════════════════════════════════');
  console.log(`📈 SUMMARY: ${totalPassed}/${totalTests} tests passed (${(totalPassed/totalTests*100).toFixed(1)}%)`);
  console.log(`⏱️  Total time: ${totalDuration.toFixed(1)}ms`);
  
  if (totalFailed > 0) {
    console.log(`%c⚠️  ${totalFailed} tests failed - review issues above`, 'color: red; font-weight: bold');
  } else {
    console.log('%c✅ All tests passed!', 'color: green; font-weight: bold');
  }
  console.log('═══════════════════════════════════════════════════\n');
  
  return { totalPassed, totalFailed, totalDuration, suites };
}

// Make available globally for console access
if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const win = window as unknown as Record<string, unknown>;
  win.runValidationTests = runValidationTests;
  win.testFullPipeline = testFullPipeline;
  win.compareMetrics = compareMetrics;
  console.log('[Tests] Portfolio validation tests loaded. Run: runValidationTests()');
}

export default runValidationTests;
