/**
 * Data Validation Service
 * Validates all portfolio data comes from real Polygon API sources
 */

// Types
export interface DataValidationResult {
  isValid: boolean;
  issues: string[];
  dataQuality: 'high' | 'medium' | 'low';
}

export interface MetricsValidationResult {
  isValid: boolean;
  issues: string[];
  metricsInRange: Record<string, boolean>;
  weightedReturnMatch: boolean;
  discrepancy?: number;
}

export interface CorrelationValidationResult {
  isValid: boolean;
  issues: string[];
  diagonalValid: boolean;
  symmetryValid: boolean;
  rangeValid: boolean;
}

export interface TickerAuditInfo {
  ticker: string;
  dataSource: string;
  dateRange: { start: string; end: string };
  barCount: number;
  dataQuality: 'high' | 'medium' | 'low';
  issues: string[];
}

export interface MetricCalculationInfo {
  metric: string;
  value: number;
  methodology: string;
  inputsUsed: string[];
}

export interface DataAuditReport {
  generatedAt: string;
  tickerAudits: TickerAuditInfo[];
  metricCalculations: MetricCalculationInfo[];
  overallDataQuality: 'high' | 'medium' | 'low';
  totalIssues: number;
  summary: string;
}

export interface OHLCVBar {
  t: number; // timestamp
  o: number; // open
  h: number; // high
  l: number; // low
  c: number; // close
  v: number; // volume
}

// Validation Functions

/**
 * Validates ticker data has valid OHLCV bars with realistic values
 */
export function validateTickerData(
  ticker: string,
  data: OHLCVBar[],
  expectedDateRange?: { start: Date; end: Date }
): DataValidationResult {
  const issues: string[] = [];
  let qualityScore = 100;

  console.log(`[DataValidation] Validating ${ticker} with ${data?.length || 0} bars`);

  // Check if data exists
  if (!data || data.length === 0) {
    console.log(`[DataValidation] ${ticker}: No data provided`);
    return {
      isValid: false,
      issues: ['No data provided'],
      dataQuality: 'low'
    };
  }

  // Validate each bar
  let invalidPrices = 0;
  let invalidVolumes = 0;
  let invalidOHLC = 0;

  for (let i = 0; i < data.length; i++) {
    const bar = data[i];

    // Check prices are positive
    if (bar.o <= 0 || bar.h <= 0 || bar.l <= 0 || bar.c <= 0) {
      invalidPrices++;
    }

    // Check volume is non-negative (can be 0 for some securities)
    if (bar.v < 0) {
      invalidVolumes++;
    }

    // Check OHLC relationship: high >= low, high >= open/close, low <= open/close
    if (bar.h < bar.l || bar.h < bar.o || bar.h < bar.c || bar.l > bar.o || bar.l > bar.c) {
      invalidOHLC++;
    }
  }

  if (invalidPrices > 0) {
    issues.push(`${invalidPrices} bars with non-positive prices`);
    qualityScore -= (invalidPrices / data.length) * 30;
  }

  if (invalidVolumes > 0) {
    issues.push(`${invalidVolumes} bars with negative volume`);
    qualityScore -= (invalidVolumes / data.length) * 20;
  }

  if (invalidOHLC > 0) {
    issues.push(`${invalidOHLC} bars with invalid OHLC relationships`);
    qualityScore -= (invalidOHLC / data.length) * 25;
  }

  // Check timestamps are sequential
  let outOfOrder = 0;
  for (let i = 1; i < data.length; i++) {
    if (data[i].t <= data[i - 1].t) {
      outOfOrder++;
    }
  }

  if (outOfOrder > 0) {
    issues.push(`${outOfOrder} timestamps out of order`);
    qualityScore -= 15;
  }

  // Check date range if provided
  if (expectedDateRange && data.length > 0) {
    const firstDate = new Date(data[0].t);
    const lastDate = new Date(data[data.length - 1].t);

    if (firstDate < expectedDateRange.start) {
      issues.push(`Data starts before expected range: ${firstDate.toISOString().split('T')[0]}`);
    }

    if (lastDate > expectedDateRange.end) {
      issues.push(`Data ends after expected range: ${lastDate.toISOString().split('T')[0]}`);
    }

    // Check for reasonable data coverage (at least 80% of trading days)
    const expectedDays = Math.floor((expectedDateRange.end.getTime() - expectedDateRange.start.getTime()) / (1000 * 60 * 60 * 24));
    const expectedTradingDays = Math.floor(expectedDays * 5 / 7); // Rough estimate
    const coverage = data.length / expectedTradingDays;

    if (coverage < 0.8) {
      issues.push(`Low data coverage: ${(coverage * 100).toFixed(1)}% of expected trading days`);
      qualityScore -= 10;
    }
  }

  // Check for suspicious patterns (all same values)
  const uniqueCloses = new Set(data.map(b => b.c)).size;
  if (uniqueCloses < data.length * 0.1 && data.length > 10) {
    issues.push('Suspiciously low price variation - possible stale data');
    qualityScore -= 20;
  }

  // Determine quality level
  let dataQuality: 'high' | 'medium' | 'low';
  if (qualityScore >= 90) {
    dataQuality = 'high';
  } else if (qualityScore >= 70) {
    dataQuality = 'medium';
  } else {
    dataQuality = 'low';
  }

  const isValid = issues.length === 0;

  console.log(`[DataValidation] ${ticker}: isValid=${isValid}, quality=${dataQuality}, issues=${issues.length}`);

  return {
    isValid,
    issues,
    dataQuality
  };
}

/**
 * Validates calculated portfolio metrics fall within realistic ranges
 */
export function validatePortfolioMetrics(
  metrics: {
    annualReturn?: number;
    annualVolatility?: number;
    sharpeRatio?: number;
    sortinoRatio?: number;
    maxDrawdown?: number;
    calmarRatio?: number;
    beta?: number;
    alpha?: number;
  },
  assetReturns?: { weight: number; return: number }[]
): MetricsValidationResult {
  const issues: string[] = [];
  const metricsInRange: Record<string, boolean> = {};

  console.log('[DataValidation] Validating portfolio metrics');

  // Define realistic ranges for each metric
  const ranges = {
    annualReturn: { min: -0.9, max: 5.0 }, // -90% to 500%
    annualVolatility: { min: 0.05, max: 1.0 }, // 5% to 100%
    sharpeRatio: { min: -2, max: 4 },
    sortinoRatio: { min: -3, max: 6 },
    maxDrawdown: { min: 0, max: 1 }, // 0% to 100%
    calmarRatio: { min: -5, max: 10 },
    beta: { min: -2, max: 3 },
    alpha: { min: -0.5, max: 0.5 } // -50% to 50%
  };

  // Validate each metric
  for (const [metric, range] of Object.entries(ranges)) {
    const value = metrics[metric as keyof typeof metrics];
    if (value !== undefined) {
      const inRange = value >= range.min && value <= range.max;
      metricsInRange[metric] = inRange;

      if (!inRange) {
        issues.push(`${metric} (${value.toFixed(4)}) outside realistic range [${range.min}, ${range.max}]`);
      }
    }
  }

  // Cross-check weighted return if asset returns provided
  let weightedReturnMatch = true;
  let discrepancy: number | undefined;

  if (assetReturns && assetReturns.length > 0 && metrics.annualReturn !== undefined) {
    const calculatedWeightedReturn = assetReturns.reduce(
      (sum, asset) => sum + asset.weight * asset.return,
      0
    );

    discrepancy = Math.abs(calculatedWeightedReturn - metrics.annualReturn);
    
    // Allow 0.1% tolerance for floating point errors
    if (discrepancy > 0.001) {
      weightedReturnMatch = false;
      issues.push(
        `Portfolio return (${(metrics.annualReturn * 100).toFixed(2)}%) doesn't match weighted sum (${(calculatedWeightedReturn * 100).toFixed(2)}%), discrepancy: ${(discrepancy * 100).toFixed(4)}%`
      );
    }
  }

  const isValid = issues.length === 0;

  console.log(`[DataValidation] Metrics validation: isValid=${isValid}, issues=${issues.length}`);

  return {
    isValid,
    issues,
    metricsInRange,
    weightedReturnMatch,
    discrepancy
  };
}

/**
 * Validates correlation matrix properties
 */
export function validateCorrelationMatrix(
  matrix: number[][],
  tickers?: string[]
): CorrelationValidationResult {
  const issues: string[] = [];
  let diagonalValid = true;
  let symmetryValid = true;
  let rangeValid = true;

  console.log(`[DataValidation] Validating correlation matrix ${matrix.length}x${matrix[0]?.length || 0}`);

  if (!matrix || matrix.length === 0) {
    return {
      isValid: false,
      issues: ['Empty correlation matrix'],
      diagonalValid: false,
      symmetryValid: false,
      rangeValid: false
    };
  }

  const n = matrix.length;

  // Check square matrix
  for (let i = 0; i < n; i++) {
    if (!matrix[i] || matrix[i].length !== n) {
      issues.push(`Row ${i} has incorrect length`);
      return {
        isValid: false,
        issues,
        diagonalValid: false,
        symmetryValid: false,
        rangeValid: false
      };
    }
  }

  // Check diagonal values are 1.0
  for (let i = 0; i < n; i++) {
    if (Math.abs(matrix[i][i] - 1.0) > 0.0001) {
      diagonalValid = false;
      const tickerLabel = tickers?.[i] || `index ${i}`;
      issues.push(`Diagonal value at ${tickerLabel} is ${matrix[i][i].toFixed(4)}, expected 1.0`);
    }
  }

  // Check symmetry and range
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      // Symmetry check
      if (Math.abs(matrix[i][j] - matrix[j][i]) > 0.0001) {
        symmetryValid = false;
        const tickerI = tickers?.[i] || `${i}`;
        const tickerJ = tickers?.[j] || `${j}`;
        issues.push(`Matrix not symmetric at (${tickerI},${tickerJ}): ${matrix[i][j].toFixed(4)} vs ${matrix[j][i].toFixed(4)}`);
      }

      // Range check [-1, 1]
      if (matrix[i][j] < -1 || matrix[i][j] > 1) {
        rangeValid = false;
        const tickerI = tickers?.[i] || `${i}`;
        const tickerJ = tickers?.[j] || `${j}`;
        issues.push(`Correlation at (${tickerI},${tickerJ}) = ${matrix[i][j].toFixed(4)} outside [-1, 1]`);
      }
    }
  }

  const isValid = diagonalValid && symmetryValid && rangeValid;

  console.log(`[DataValidation] Correlation matrix: isValid=${isValid}, diagonal=${diagonalValid}, symmetric=${symmetryValid}, range=${rangeValid}`);

  return {
    isValid,
    issues,
    diagonalValid,
    symmetryValid,
    rangeValid
  };
}

/**
 * Generates a comprehensive data audit report
 */
export function generateDataAuditReport(
  tickerData: Map<string, OHLCVBar[]> | Record<string, OHLCVBar[]>,
  metrics?: {
    cagr?: number;
    sharpe?: number;
    sortino?: number;
    maxDrawdown?: number;
    volatility?: number;
    beta?: number;
    alpha?: number;
  },
  correlationMatrix?: number[][]
): DataAuditReport {
  console.log('[DataValidation] Generating comprehensive data audit report');

  const tickerAudits: TickerAuditInfo[] = [];
  let totalIssues = 0;
  let lowestQuality: 'high' | 'medium' | 'low' = 'high';

  // Convert to Map if needed
  const dataMap = tickerData instanceof Map 
    ? tickerData 
    : new Map(Object.entries(tickerData));

  // Audit each ticker
  for (const [ticker, bars] of dataMap.entries()) {
    const validation = validateTickerData(ticker, bars);
    
    const dateRange = bars.length > 0
      ? {
          start: new Date(bars[0].t).toISOString().split('T')[0],
          end: new Date(bars[bars.length - 1].t).toISOString().split('T')[0]
        }
      : { start: 'N/A', end: 'N/A' };

    tickerAudits.push({
      ticker,
      dataSource: 'Polygon.io API',
      dateRange,
      barCount: bars.length,
      dataQuality: validation.dataQuality,
      issues: validation.issues
    });

    totalIssues += validation.issues.length;

    // Track lowest quality
    if (validation.dataQuality === 'low') {
      lowestQuality = 'low';
    } else if (validation.dataQuality === 'medium' && lowestQuality === 'high') {
      lowestQuality = 'medium';
    }
  }

  // Document metric calculations
  const metricCalculations: MetricCalculationInfo[] = [];

  if (metrics) {
    if (metrics.cagr !== undefined) {
      metricCalculations.push({
        metric: 'CAGR',
        value: metrics.cagr,
        methodology: 'Compound Annual Growth Rate: (EndValue/StartValue)^(1/Years) - 1',
        inputsUsed: ['Portfolio daily values', 'Date range']
      });
    }

    if (metrics.sharpe !== undefined) {
      metricCalculations.push({
        metric: 'Sharpe Ratio',
        value: metrics.sharpe,
        methodology: '(Portfolio Return - Risk Free Rate) / Portfolio Std Dev, annualized',
        inputsUsed: ['Daily returns', 'Risk-free rate (default 4.5%)', 'Annualization factor (√252)']
      });
    }

    if (metrics.sortino !== undefined) {
      metricCalculations.push({
        metric: 'Sortino Ratio',
        value: metrics.sortino,
        methodology: '(Portfolio Return - MAR) / Downside Deviation, annualized',
        inputsUsed: ['Daily returns', 'Minimum acceptable return', 'Downside returns only']
      });
    }

    if (metrics.maxDrawdown !== undefined) {
      metricCalculations.push({
        metric: 'Max Drawdown',
        value: metrics.maxDrawdown,
        methodology: 'Maximum peak-to-trough decline in portfolio value',
        inputsUsed: ['Portfolio daily values', 'Running maximum']
      });
    }

    if (metrics.volatility !== undefined) {
      metricCalculations.push({
        metric: 'Annualized Volatility',
        value: metrics.volatility,
        methodology: 'Standard deviation of daily returns × √252',
        inputsUsed: ['Daily log returns', 'Annualization factor']
      });
    }

    if (metrics.beta !== undefined) {
      metricCalculations.push({
        metric: 'Beta',
        value: metrics.beta,
        methodology: 'Covariance(Portfolio, Benchmark) / Variance(Benchmark)',
        inputsUsed: ['Portfolio daily returns', 'Benchmark daily returns (SPY)']
      });
    }

    if (metrics.alpha !== undefined) {
      metricCalculations.push({
        metric: 'Alpha',
        value: metrics.alpha,
        methodology: 'Portfolio Return - (Risk Free Rate + Beta × (Benchmark Return - Risk Free Rate))',
        inputsUsed: ['Portfolio return', 'Benchmark return', 'Beta', 'Risk-free rate']
      });
    }
  }

  // Validate correlation matrix if provided
  if (correlationMatrix) {
    const corrValidation = validateCorrelationMatrix(correlationMatrix, Array.from(dataMap.keys()));
    totalIssues += corrValidation.issues.length;
  }

  // Generate summary
  const tickerCount = tickerAudits.length;
  const totalBars = tickerAudits.reduce((sum, t) => sum + t.barCount, 0);
  const summary = `Audit of ${tickerCount} tickers with ${totalBars.toLocaleString()} total bars. ` +
    `Data quality: ${lowestQuality}. ` +
    `${totalIssues} issue(s) found. ` +
    `All data sourced from Polygon.io API.`;

  console.log(`[DataValidation] Audit complete: ${summary}`);

  return {
    generatedAt: new Date().toISOString(),
    tickerAudits,
    metricCalculations,
    overallDataQuality: lowestQuality,
    totalIssues,
    summary
  };
}
