// Stress Test Service - Calculate portfolio performance during historical crisis periods
import { polygonData, OHLCVBar } from './polygonDataHandler';

export interface StressTestPeriod {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  marketDrawdown: number; // S&P 500 drawdown during this period
}

export interface StressTestResult {
  period: StressTestPeriod;
  portfolioDrawdown: number;
  portfolioReturn: number;
  dollarLoss: number;
  recoveryDays: number | null;
  assetBreakdown: Map<string, { drawdown: number; return: number }>;
}

// Historical stress test periods
export const STRESS_TEST_PERIODS: StressTestPeriod[] = [
  {
    id: 'covid-2020',
    name: 'COVID Crash (2020)',
    description: 'Rapid market selloff followed by V-shaped recovery',
    startDate: '2020-02-19', // S&P 500 peak
    endDate: '2020-03-23', // S&P 500 trough
    marketDrawdown: -33.9,
  },
  {
    id: 'bear-2022',
    name: '2022 Bear Market',
    description: 'Rate hikes caused prolonged decline in growth stocks',
    startDate: '2022-01-03', // Year start peak
    endDate: '2022-10-12', // Market bottom
    marketDrawdown: -25.4,
  },
  {
    id: 'normal',
    name: 'Normal Market',
    description: 'Average market conditions (last 12 months)',
    startDate: '', // Will be calculated dynamically
    endDate: '',
    marketDrawdown: 0,
  },
];

// Calculate drawdown from price series
function calculateMaxDrawdown(prices: number[]): number {
  if (prices.length < 2) return 0;
  
  let peak = prices[0];
  let maxDrawdown = 0;
  
  for (const price of prices) {
    if (price > peak) {
      peak = price;
    }
    const drawdown = (price - peak) / peak;
    if (drawdown < maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }
  
  return maxDrawdown * 100; // Convert to percentage
}

// Calculate return from first to last price
function calculateReturn(prices: number[]): number {
  if (prices.length < 2) return 0;
  return ((prices[prices.length - 1] - prices[0]) / prices[0]) * 100;
}

// Run stress test for a specific period
export async function runStressTest(
  allocations: Map<string, number>, // ticker -> weight (0-1)
  period: StressTestPeriod,
  investableCapital: number
): Promise<StressTestResult> {
  const tickers = Array.from(allocations.keys());
  const assetBreakdown = new Map<string, { drawdown: number; return: number }>();
  
  let startDate = period.startDate;
  let endDate = period.endDate;
  
  // For 'normal' period, use last 12 months
  if (period.id === 'normal') {
    const now = new Date();
    endDate = now.toISOString().split('T')[0];
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    startDate = oneYearAgo.toISOString().split('T')[0];
  }
  
  // Fetch historical data for all assets
  let portfolioValue: number[] = [];
  let firstValidLength = 0;
  
  for (const ticker of tickers) {
    try {
      const { bars } = await polygonData.fetchHistory(ticker, startDate, endDate);
      
      if (bars.length === 0) {
        console.warn(`[StressTest] No data for ${ticker} during ${period.name}`);
        assetBreakdown.set(ticker, { drawdown: 0, return: 0 });
        continue;
      }
      
      const prices = bars.map(b => b.close);
      const weight = allocations.get(ticker) || 0;
      
      // Calculate asset-level metrics
      const assetDrawdown = calculateMaxDrawdown(prices);
      const assetReturn = calculateReturn(prices);
      assetBreakdown.set(ticker, { drawdown: assetDrawdown, return: assetReturn });
      
      // Initialize portfolio value array
      if (portfolioValue.length === 0) {
        portfolioValue = new Array(prices.length).fill(0);
        firstValidLength = prices.length;
      }
      
      // Add weighted contribution to portfolio
      const minLength = Math.min(portfolioValue.length, prices.length);
      for (let i = 0; i < minLength; i++) {
        // Normalize to portfolio contribution
        const normalizedPrice = (prices[i] / prices[0]) * weight * investableCapital;
        portfolioValue[i] += normalizedPrice;
      }
    } catch (error) {
      console.error(`[StressTest] Error fetching ${ticker}:`, error);
      assetBreakdown.set(ticker, { drawdown: 0, return: 0 });
    }
  }
  
  // Calculate portfolio-level metrics
  const portfolioDrawdown = portfolioValue.length > 0 ? calculateMaxDrawdown(portfolioValue) : 0;
  const portfolioReturn = portfolioValue.length > 0 ? calculateReturn(portfolioValue) : 0;
  const dollarLoss = investableCapital * (portfolioDrawdown / 100);
  
  // Estimate recovery days (simplified - actual would need extended date range)
  let recoveryDays: number | null = null;
  if (period.id === 'covid-2020') {
    recoveryDays = 148; // S&P 500 recovered by Aug 2020
  } else if (period.id === 'bear-2022') {
    recoveryDays = null; // Recovery ongoing
  }
  
  return {
    period,
    portfolioDrawdown,
    portfolioReturn,
    dollarLoss: Math.abs(dollarLoss),
    recoveryDays,
    assetBreakdown,
  };
}

// Check liquidity risk based on time horizon and drawdown history
export interface LiquidityRiskResult {
  ticker: string;
  maxHistoricalDrawdown: number;
  isLiquidityRisk: boolean;
  reason: string;
}

export async function checkLiquidityRisks(
  tickers: string[],
  timeHorizonYears: number,
  drawdownThreshold: number = 20
): Promise<LiquidityRiskResult[]> {
  const results: LiquidityRiskResult[] = [];
  
  // Only flag liquidity risks for short time horizons
  const isShortHorizon = timeHorizonYears < 2;
  
  // Fetch 2-year historical data
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 730 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  for (const ticker of tickers) {
    try {
      const { bars } = await polygonData.fetchHistory(ticker, startDate, endDate);
      
      if (bars.length === 0) {
        results.push({
          ticker,
          maxHistoricalDrawdown: 0,
          isLiquidityRisk: false,
          reason: 'Insufficient historical data',
        });
        continue;
      }
      
      const prices = bars.map(b => b.close);
      const maxDrawdown = Math.abs(calculateMaxDrawdown(prices));
      
      const isRisk = isShortHorizon && maxDrawdown > drawdownThreshold;
      
      results.push({
        ticker,
        maxHistoricalDrawdown: maxDrawdown,
        isLiquidityRisk: isRisk,
        reason: isRisk 
          ? `Historical drawdown of ${maxDrawdown.toFixed(1)}% exceeds ${drawdownThreshold}% threshold for your ${timeHorizonYears}-year horizon`
          : maxDrawdown > drawdownThreshold 
            ? `High volatility (${maxDrawdown.toFixed(1)}% drawdown) but acceptable for ${timeHorizonYears}-year horizon`
            : 'Within acceptable volatility range',
      });
    } catch (error) {
      console.error(`[LiquidityCheck] Error for ${ticker}:`, error);
      results.push({
        ticker,
        maxHistoricalDrawdown: 0,
        isLiquidityRisk: false,
        reason: 'Error fetching historical data',
      });
    }
  }
  
  return results;
}

// Get stress test results for multiple periods
export async function runAllStressTests(
  allocations: Map<string, number>,
  investableCapital: number
): Promise<StressTestResult[]> {
  const results: StressTestResult[] = [];
  
  for (const period of STRESS_TEST_PERIODS) {
    const result = await runStressTest(allocations, period, investableCapital);
    results.push(result);
  }
  
  return results;
}
