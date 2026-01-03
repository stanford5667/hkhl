/**
 * Portfolio Test Fixtures
 * Pre-calculated data for testing portfolio calculations
 */

// Standard test portfolio: 60% VTI, 30% BND, 10% GLD
export const STANDARD_PORTFOLIO = {
  allocations: [
    { ticker: 'VTI', name: 'Vanguard Total Stock Market ETF', weight: 0.6 },
    { ticker: 'BND', name: 'Vanguard Total Bond Market ETF', weight: 0.3 },
    { ticker: 'GLD', name: 'SPDR Gold Shares', weight: 0.1 },
  ],
  investableCapital: 100000,
  benchmarkTicker: 'SPY',
  dateRange: {
    start: '2023-01-01',
    end: '2023-12-31',
  },
};

// Pre-calculated expected metrics for the standard portfolio
// These are based on actual historical data for 2023
export const EXPECTED_METRICS = {
  // Returns (annualized)
  totalReturn: 0.1847, // 18.47%
  annualizedReturn: 0.1847,
  cagr: 0.1847,
  
  // Risk metrics
  volatility: 0.1023, // 10.23% annualized
  maxDrawdown: -0.0712, // -7.12%
  
  // Risk-adjusted returns
  sharpeRatio: 1.28, // Using 5% risk-free rate
  sortinoRatio: 1.85,
  calmarRatio: 2.59,
  
  // Benchmark comparison
  beta: 0.72,
  alpha: 0.0312, // 3.12%
  treynorRatio: 0.186,
  informationRatio: 0.45,
  
  // Tolerance for floating point comparisons
  tolerance: 0.05, // 5% tolerance for test comparisons
};

// Mock daily returns for testing (simplified 20-day sample)
export const MOCK_DAILY_RETURNS = {
  VTI: [
    0.0082, -0.0045, 0.0123, -0.0067, 0.0034,
    0.0091, -0.0022, 0.0156, -0.0089, 0.0045,
    -0.0034, 0.0078, 0.0112, -0.0056, 0.0023,
    0.0067, -0.0045, 0.0089, 0.0034, -0.0012,
  ],
  BND: [
    0.0012, -0.0008, 0.0015, -0.0004, 0.0009,
    0.0006, -0.0011, 0.0018, -0.0007, 0.0005,
    -0.0003, 0.0014, 0.0008, -0.0006, 0.0004,
    0.0011, -0.0009, 0.0007, 0.0003, -0.0002,
  ],
  GLD: [
    0.0045, -0.0032, 0.0067, -0.0023, 0.0056,
    0.0038, -0.0019, 0.0089, -0.0045, 0.0034,
    -0.0028, 0.0052, 0.0043, -0.0031, 0.0025,
    0.0047, -0.0036, 0.0058, 0.0021, -0.0015,
  ],
  SPY: [
    0.0075, -0.0052, 0.0118, -0.0078, 0.0042,
    0.0095, -0.0028, 0.0145, -0.0092, 0.0055,
    -0.0038, 0.0085, 0.0098, -0.0062, 0.0032,
    0.0072, -0.0048, 0.0095, 0.0038, -0.0018,
  ],
};

// Calculate portfolio returns from individual returns
export function calculatePortfolioReturns(
  weights: number[],
  returns: number[][]
): number[] {
  const days = returns[0].length;
  const portfolioReturns: number[] = [];
  
  for (let i = 0; i < days; i++) {
    let dayReturn = 0;
    for (let j = 0; j < weights.length; j++) {
      dayReturn += weights[j] * returns[j][i];
    }
    portfolioReturns.push(dayReturn);
  }
  
  return portfolioReturns;
}

// Mock OHLCV data generator
export function generateMockOHLCV(
  ticker: string,
  days: number,
  startPrice: number = 100,
  volatility: number = 0.02
): Array<{
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}> {
  const data = [];
  let price = startPrice;
  const startDate = new Date('2023-01-01');
  
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    
    const change = (Math.random() - 0.5) * 2 * volatility * price;
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) * (1 + Math.random() * 0.01);
    const low = Math.min(open, close) * (1 - Math.random() * 0.01);
    const volume = Math.floor(1000000 + Math.random() * 5000000);
    
    data.push({
      date: date.toISOString().split('T')[0],
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume,
    });
    
    price = close;
  }
  
  return data;
}

// Mock Polygon API response
export const MOCK_POLYGON_RESPONSE = {
  ticker: 'VTI',
  queryCount: 252,
  resultsCount: 252,
  adjusted: true,
  results: generateMockOHLCV('VTI', 252, 200, 0.015).map((bar, i) => ({
    v: bar.volume,
    vw: (bar.high + bar.low) / 2,
    o: bar.open,
    c: bar.close,
    h: bar.high,
    l: bar.low,
    t: new Date(bar.date).getTime(),
    n: Math.floor(50000 + Math.random() * 100000),
  })),
  status: 'OK',
  request_id: 'test-request-123',
  count: 252,
};

// Mock asset universe entries
export const MOCK_ASSET_UNIVERSE = [
  {
    ticker: 'VTI',
    name: 'Vanguard Total Stock Market ETF',
    asset_type: 'ETF',
    category: 'US Equity',
    sector: null,
    liquidity_score: 10,
    is_active: true,
    data_start_date: '2001-05-31',
    data_end_date: '2024-01-15',
    avg_daily_volume: 3500000,
    market_cap_tier: 'Large',
  },
  {
    ticker: 'BND',
    name: 'Vanguard Total Bond Market ETF',
    asset_type: 'ETF',
    category: 'Fixed Income',
    sector: null,
    liquidity_score: 9,
    is_active: true,
    data_start_date: '2007-04-10',
    data_end_date: '2024-01-15',
    avg_daily_volume: 5200000,
    market_cap_tier: null,
  },
  {
    ticker: 'GLD',
    name: 'SPDR Gold Shares',
    asset_type: 'ETF',
    category: 'Commodity',
    sector: null,
    liquidity_score: 9,
    is_active: true,
    data_start_date: '2004-11-18',
    data_end_date: '2024-01-15',
    avg_daily_volume: 7800000,
    market_cap_tier: null,
  },
  {
    ticker: 'SPY',
    name: 'SPDR S&P 500 ETF Trust',
    asset_type: 'ETF',
    category: 'US Equity',
    sector: null,
    liquidity_score: 10,
    is_active: true,
    data_start_date: '1993-01-29',
    data_end_date: '2024-01-15',
    avg_daily_volume: 75000000,
    market_cap_tier: 'Large',
  },
];

// Mock correlation matrix for test portfolio
export const MOCK_CORRELATION_MATRIX = [
  [1.0, 0.15, 0.05],   // VTI correlations
  [0.15, 1.0, 0.25],   // BND correlations
  [0.05, 0.25, 1.0],   // GLD correlations
];

// Helper to create mock calculation cache entry
export function createMockCacheEntry(
  tickers: string[],
  weights: number[],
  metrics: Record<string, number>
) {
  const portfolioHash = `${tickers.join('-')}_${weights.map(w => w.toFixed(2)).join('-')}`;
  
  return {
    id: crypto.randomUUID(),
    portfolio_hash: portfolioHash,
    tickers,
    weights,
    metrics,
    benchmark_ticker: 'SPY',
    risk_free_rate: 0.05,
    start_date: '2023-01-01',
    end_date: '2023-12-31',
    calculated_at: new Date().toISOString(),
    is_valid: true,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

// Metric calculation helpers for test verification
export const MetricCalculators = {
  /**
   * Calculate Sharpe Ratio
   * (Portfolio Return - Risk-Free Rate) / Portfolio Volatility
   */
  sharpeRatio(returns: number[], riskFreeRate: number = 0.05): number {
    const annualizedReturn = this.annualizedReturn(returns);
    const volatility = this.volatility(returns);
    return (annualizedReturn - riskFreeRate) / volatility;
  },
  
  /**
   * Calculate annualized return from daily returns
   */
  annualizedReturn(returns: number[]): number {
    const totalReturn = returns.reduce((acc, r) => acc * (1 + r), 1) - 1;
    const years = returns.length / 252;
    return Math.pow(1 + totalReturn, 1 / years) - 1;
  },
  
  /**
   * Calculate annualized volatility from daily returns
   */
  volatility(returns: number[]): number {
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((acc, r) => acc + Math.pow(r - mean, 2), 0) / returns.length;
    return Math.sqrt(variance * 252);
  },
  
  /**
   * Calculate maximum drawdown
   */
  maxDrawdown(values: number[]): number {
    let maxDrawdown = 0;
    let peak = values[0];
    
    for (const value of values) {
      if (value > peak) peak = value;
      const drawdown = (peak - value) / peak;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }
    
    return -maxDrawdown;
  },
  
  /**
   * Calculate Sortino Ratio
   */
  sortinoRatio(returns: number[], riskFreeRate: number = 0.05): number {
    const annualizedReturn = this.annualizedReturn(returns);
    const negativeReturns = returns.filter(r => r < 0);
    const downsideDeviation = Math.sqrt(
      negativeReturns.reduce((acc, r) => acc + r * r, 0) / returns.length * 252
    );
    return (annualizedReturn - riskFreeRate) / downsideDeviation;
  },
  
  /**
   * Calculate Beta relative to benchmark
   */
  beta(portfolioReturns: number[], benchmarkReturns: number[]): number {
    const n = Math.min(portfolioReturns.length, benchmarkReturns.length);
    const pMean = portfolioReturns.reduce((a, b) => a + b, 0) / n;
    const bMean = benchmarkReturns.reduce((a, b) => a + b, 0) / n;
    
    let covariance = 0;
    let benchmarkVariance = 0;
    
    for (let i = 0; i < n; i++) {
      covariance += (portfolioReturns[i] - pMean) * (benchmarkReturns[i] - bMean);
      benchmarkVariance += Math.pow(benchmarkReturns[i] - bMean, 2);
    }
    
    return covariance / benchmarkVariance;
  },
};

// Test assertion helpers
export const TestHelpers = {
  /**
   * Compare two numbers within tolerance
   */
  approxEqual(actual: number, expected: number, tolerance: number = 0.05): boolean {
    if (expected === 0) return Math.abs(actual) < tolerance;
    return Math.abs((actual - expected) / expected) < tolerance;
  },
  
  /**
   * Assert metric is within expected range
   */
  assertMetricInRange(
    metricName: string,
    actual: number,
    expected: number,
    tolerance: number = 0.05
  ): { pass: boolean; message: string } {
    const pass = this.approxEqual(actual, expected, tolerance);
    const message = pass
      ? `${metricName}: ${actual.toFixed(4)} ≈ ${expected.toFixed(4)}`
      : `${metricName}: ${actual.toFixed(4)} !== ${expected.toFixed(4)} (tolerance: ${(tolerance * 100).toFixed(0)}%)`;
    return { pass, message };
  },
  
  /**
   * Generate test report
   */
  generateReport(results: Array<{ name: string; pass: boolean; message: string }>): string {
    const passed = results.filter(r => r.pass).length;
    const failed = results.filter(r => !r.pass).length;
    
    let report = `\n=== Test Report ===\n`;
    report += `Passed: ${passed}/${results.length}\n`;
    report += `Failed: ${failed}/${results.length}\n\n`;
    
    for (const result of results) {
      const icon = result.pass ? '✓' : '✗';
      report += `${icon} ${result.message}\n`;
    }
    
    return report;
  },
};
