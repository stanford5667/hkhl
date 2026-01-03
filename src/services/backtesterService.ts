// Backtester Service - Real historical data from Finnhub
// Aligned with Portfolio Visualizer methodology
// Reference: https://www.portfoliovisualizer.com/faq

import { getCandles, CandleData } from './finnhubService';
import {
  arithmeticMean,
  standardDeviation,
  calculateSharpeRatio as calcSharpe,
  calculateSortinoRatio as calcSortino,
  calculateMaxDrawdown as calcMaxDD,
  calculateBetaAlpha as calcBetaAlpha,
  calculateCAGR,
  annualizedVolatility,
  yearsBetween
} from './portfolioMetricsService';

export interface HistoricalDataPoint {
  date: string;
  price: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
}

export interface Trade {
  date: string;
  type: 'buy' | 'sell';
  symbol: string;
  shares: number;
  price: number;
  value: number;
  reason: string;
}

export interface PortfolioSnapshot {
  date: string;
  cash: number;
  holdings: number;
  totalValue: number;
  shares: number;
}

export interface BacktestResult {
  strategy: string;
  startDate: string;
  endDate: string;
  initialCapital: number;
  finalValue: number;
  totalReturn: number;
  totalReturnPercent: number;
  annualizedReturn: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  winRate: number;
  totalTrades: number;
  profitableTrades: number;
  volatility: number;
  trades: Trade[];
  portfolioHistory: PortfolioSnapshot[];
  benchmarkReturn?: number;
  alpha?: number;
  beta?: number;
  assetPerformance?: { symbol: string; return: number; contribution: number }[];
}

export interface StrategyParams {
  initialCapital: number;
  dcaAmount?: number;
  dcaFrequency?: 'daily' | 'weekly' | 'monthly';
  momentumPeriod?: number;
  momentumThreshold?: number;
  maPeriod?: number;
  deviationThreshold?: number;
  rsiPeriod?: number;
  rsiOversold?: number;
  rsiOverbought?: number;
}

export type StrategyType = 'buy-hold' | 'dca' | 'momentum' | 'mean-reversion' | 'rsi';

export const STRATEGY_INFO: Record<StrategyType, { name: string; description: string }> = {
  'buy-hold': { name: 'Buy & Hold', description: 'Buy at start and hold until end' },
  'dca': { name: 'Dollar Cost Averaging', description: 'Invest fixed amounts at regular intervals' },
  'momentum': { name: 'Momentum', description: 'Buy when price momentum is positive' },
  'mean-reversion': { name: 'Mean Reversion', description: 'Buy below moving average, sell above' },
  'rsi': { name: 'RSI Strategy', description: 'Buy oversold, sell overbought based on RSI' },
};

export interface BacktestConfig {
  assets: { symbol: string; allocation: number }[];
  startDate: string;
  endDate: string;
  initialCapital: number;
  strategy: StrategyType;
  strategyParams?: StrategyParams;
  benchmarkSymbol?: string;
}

export interface MonteCarloResult {
  percentile5: number[];
  percentile25: number[];
  percentile50: number[];
  percentile75: number[];
  percentile95: number[];
  finalValues: number[];
  medianFinalValue: number;
  probabilityOfLoss: number;
}

export interface StressTestResult {
  scenario: string;
  description: string;
  portfolioReturn: number;
  benchmarkReturn: number;
  startDate?: string;
  endDate?: string;
  isHistorical: boolean;
}

export interface CorrelationMatrix {
  symbols: string[];
  matrix: number[][];
}

const RISK_FREE_RATE = 0.05;

// Utility: delay for rate limiting
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetch historical prices from Finnhub
 */
export async function fetchHistoricalPrices(
  symbol: string,
  startDate: string,
  endDate: string
): Promise<HistoricalDataPoint[]> {
  console.log(`[Backtester] Fetching ${symbol} from ${startDate} to ${endDate} via Finnhub...`);
  
  const fromTs = Math.floor(new Date(startDate).getTime() / 1000);
  const toTs = Math.floor(new Date(endDate).getTime() / 1000);
  
  const candles = await getCandles(symbol, 'D', fromTs, toTs);
  
  if (!candles || candles.length === 0) {
    throw new Error(`No data for ${symbol} in date range ${startDate} to ${endDate}`);
  }
  
  console.log(`[Backtester] Got ${candles.length} days for ${symbol}`);
  
  return candles.map(c => ({
    date: c.date,
    price: c.close,
    open: c.open,
    high: c.high,
    low: c.low,
    volume: c.volume,
  }));
}

/**
 * Calculate daily returns from portfolio values
 * Using simple returns: (P1 - P0) / P0
 */
function calculateDailyReturns(values: number[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < values.length; i++) {
    if (values[i - 1] !== 0) {
      returns.push((values[i] - values[i - 1]) / values[i - 1]);
    }
  }
  return returns;
}

// Wrapper for beta/alpha calculation
function calculateBetaAlphaWrapper(
  portfolioReturns: number[],
  benchmarkReturns: number[],
  riskFreeRate: number = RISK_FREE_RATE
): { beta: number; alpha: number } {
  return calcBetaAlpha(portfolioReturns, benchmarkReturns, riskFreeRate);
}

/**
 * Main backtest function with REAL data from Finnhub
 * FIXED: Properly calculates portfolio value based on actual shares held
 */
export async function runBacktest(config: BacktestConfig): Promise<BacktestResult> {
  const { assets, startDate, endDate, initialCapital, strategy, benchmarkSymbol = 'SPY' } = config;
  
  console.log(`[Backtester] ========================================`);
  console.log(`[Backtester] Running backtest from ${startDate} to ${endDate}`);
  console.log(`[Backtester] Strategy: ${strategy}`);
  console.log(`[Backtester] Initial Capital: $${initialCapital.toLocaleString()}`);
  console.log(`[Backtester] Assets: ${assets.map(a => `${a.symbol} (${a.allocation}%)`).join(', ')}`);
  
  // Validate allocations sum to 100%
  const totalAllocation = assets.reduce((sum, a) => sum + a.allocation, 0);
  if (Math.abs(totalAllocation - 100) > 0.1) {
    throw new Error(`Allocations must sum to 100% (current: ${totalAllocation.toFixed(1)}%)`);
  }
  
  if (assets.length === 0) {
    throw new Error('Add at least one asset to the portfolio');
  }
  
  // Fetch real historical data for all assets
  const assetData: Map<string, HistoricalDataPoint[]> = new Map();
  
  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i];
    const data = await fetchHistoricalPrices(asset.symbol, startDate, endDate);
    assetData.set(asset.symbol, data);
    
    if (i < assets.length - 1) {
      await delay(350); // Finnhub rate limit: 60 calls/min
    }
  }
  
  // Fetch benchmark data
  console.log(`[Backtester] Fetching benchmark ${benchmarkSymbol}...`);
  let benchmarkData: HistoricalDataPoint[] = [];
  try {
    await delay(350); // Finnhub rate limit
    benchmarkData = await fetchHistoricalPrices(benchmarkSymbol, startDate, endDate);
  } catch (e) {
    console.warn(`[Backtester] Could not fetch benchmark ${benchmarkSymbol}:`, e);
  }
  
  // Create price lookup maps for quick access
  const priceMaps: Map<string, Map<string, number>> = new Map();
  assetData.forEach((prices, symbol) => {
    const priceMap = new Map<string, number>();
    prices.forEach(p => priceMap.set(p.date, p.price));
    priceMaps.set(symbol, priceMap);
  });
  
  const benchmarkPriceMap = new Map<string, number>();
  benchmarkData.forEach(p => benchmarkPriceMap.set(p.date, p.price));
  
  // Find dates where ALL assets have data
  const allDatesSet = new Set<string>();
  assetData.forEach(data => data.forEach(d => allDatesSet.add(d.date)));
  
  const commonDates = Array.from(allDatesSet)
    .filter(date => {
      // All assets must have data for this date
      return assets.every(a => priceMaps.get(a.symbol)?.has(date));
    })
    .sort();
  
  console.log(`[Backtester] Found ${commonDates.length} trading days with data for all assets`);
  
  if (commonDates.length < 5) {
    throw new Error(`Not enough trading days (${commonDates.length}). Need at least 5 days with data for all assets.`);
  }
  
  // Calculate initial shares for each asset based on allocation and FIRST DAY price
  const firstDate = commonDates[0];
  const sharesPerAsset: Map<string, number> = new Map();
  const trades: Trade[] = [];
  
  for (const asset of assets) {
    const firstPrice = priceMaps.get(asset.symbol)?.get(firstDate);
    if (!firstPrice || firstPrice === 0) {
      throw new Error(`No price data for ${asset.symbol} on ${firstDate}`);
    }
    
    const allocationAmount = (asset.allocation / 100) * initialCapital;
    const shares = allocationAmount / firstPrice;
    sharesPerAsset.set(asset.symbol, shares);
    
    console.log(`[Backtester] ${asset.symbol}: $${allocationAmount.toFixed(0)} / $${firstPrice.toFixed(2)} = ${shares.toFixed(4)} shares`);
    
    trades.push({
      date: firstDate,
      type: 'buy',
      symbol: asset.symbol,
      shares,
      price: firstPrice,
      value: allocationAmount,
      reason: `Initial allocation: ${asset.allocation}%`,
    });
  }
  
  // Build portfolio history - calculate total value each day
  const portfolioHistory: PortfolioSnapshot[] = [];
  const portfolioValues: number[] = [];
  
  for (const date of commonDates) {
    let dayValue = 0;
    
    for (const asset of assets) {
      const shares = sharesPerAsset.get(asset.symbol) || 0;
      const price = priceMaps.get(asset.symbol)?.get(date) || 0;
      dayValue += shares * price;
    }
    
    portfolioValues.push(dayValue);
    portfolioHistory.push({
      date,
      cash: 0, // Buy-and-hold: all invested
      holdings: dayValue,
      totalValue: dayValue,
      shares: 0, // Not applicable for multi-asset
    });
  }
  
  const firstValue = portfolioValues[0];
  const finalValue = portfolioValues[portfolioValues.length - 1];
  
  console.log(`[Backtester] Initial portfolio value: $${firstValue.toFixed(2)}`);
  console.log(`[Backtester] Final portfolio value: $${finalValue.toFixed(2)}`);
  
  // Calculate per-asset performance
  const lastDate = commonDates[commonDates.length - 1];
  
  // Calculate returns
  const dailyReturns = calculateDailyReturns(portfolioValues);
  const totalReturn = finalValue - initialCapital;
  const totalReturnPercent = ((finalValue - initialCapital) / initialCapital) * 100;
  
  // Calculate actual years using calendar days
  const years = yearsBetween(firstDate, lastDate);
  const annualizedReturn = calculateCAGR(initialCapital, finalValue, years) * 100;
  
  // Risk metrics using proper formulas
  const volatility = annualizedVolatility(dailyReturns) * 100;
  const sharpeRatio = calcSharpe(dailyReturns, RISK_FREE_RATE);
  const sortinoRatio = calcSortino(dailyReturns, RISK_FREE_RATE);
  const { maxDrawdown, maxDrawdownPercent } = calcMaxDD(portfolioValues);
  
  // Benchmark comparison
  let benchmarkReturn: number | undefined;
  let alpha = 0;
  let beta = 1;
  
  if (benchmarkData.length >= 2) {
    const benchmarkCommonDates = commonDates.filter(d => benchmarkPriceMap.has(d));
    if (benchmarkCommonDates.length >= 2) {
      const benchStartPrice = benchmarkPriceMap.get(benchmarkCommonDates[0]) || 1;
      const benchEndPrice = benchmarkPriceMap.get(benchmarkCommonDates[benchmarkCommonDates.length - 1]) || 1;
      benchmarkReturn = ((benchEndPrice - benchStartPrice) / benchStartPrice) * 100;
      
      const benchmarkValues = benchmarkCommonDates.map(d => benchmarkPriceMap.get(d) || 0);
      const benchmarkReturns = calculateDailyReturns(benchmarkValues);
      
      // Only calculate if we have matching lengths
      const portfolioReturnsForBeta = dailyReturns.slice(0, benchmarkReturns.length);
      const betaAlpha = calculateBetaAlphaWrapper(portfolioReturnsForBeta, benchmarkReturns);
      alpha = betaAlpha.alpha;
      beta = betaAlpha.beta;
    }
  }
  
  const assetPerformance = assets.map(asset => {
    const firstPrice = priceMaps.get(asset.symbol)?.get(firstDate) || 1;
    const lastPrice = priceMaps.get(asset.symbol)?.get(lastDate) || firstPrice;
    const assetReturn = ((lastPrice - firstPrice) / firstPrice) * 100;
    const contribution = assetReturn * (asset.allocation / 100);
    
    return {
      symbol: asset.symbol,
      return: assetReturn,
      contribution,
    };
  });
  
  console.log(`[Backtester] ========================================`);
  console.log(`[Backtester] RESULTS:`);
  console.log(`[Backtester] Total Return: ${totalReturnPercent.toFixed(2)}%`);
  console.log(`[Backtester] CAGR: ${annualizedReturn.toFixed(2)}%`);
  console.log(`[Backtester] Sharpe Ratio: ${sharpeRatio.toFixed(2)}`);
  console.log(`[Backtester] Sortino Ratio: ${sortinoRatio.toFixed(2)}`);
  console.log(`[Backtester] Max Drawdown: ${maxDrawdownPercent.toFixed(2)}%`);
  console.log(`[Backtester] Volatility: ${volatility.toFixed(2)}%`);
  console.log(`[Backtester] Alpha: ${alpha.toFixed(2)}%`);
  console.log(`[Backtester] Beta: ${beta.toFixed(2)}`);
  if (benchmarkReturn !== undefined) {
    console.log(`[Backtester] Benchmark (${benchmarkSymbol}): ${benchmarkReturn.toFixed(2)}%`);
  }
  console.log(`[Backtester] Per-asset returns:`, assetPerformance.map(a => `${a.symbol}: ${a.return.toFixed(2)}%`).join(', '));
  console.log(`[Backtester] ========================================`);
  
  return {
    strategy,
    startDate: firstDate,
    endDate: lastDate,
    initialCapital,
    finalValue,
    totalReturn,
    totalReturnPercent,
    annualizedReturn,
    sharpeRatio,
    sortinoRatio,
    maxDrawdown,
    maxDrawdownPercent,
    winRate: 0, // N/A for buy-and-hold
    totalTrades: trades.length,
    profitableTrades: 0,
    volatility,
    trades,
    portfolioHistory,
    benchmarkReturn,
    alpha,
    beta,
    assetPerformance,
  };
}

/**
 * Monte Carlo simulation using REAL historical volatility
 */
export async function runMonteCarloSimulation(
  config: BacktestConfig,
  numSimulations: number = 1000,
  projectionYears: number = 5
): Promise<MonteCarloResult> {
  console.log('[Monte Carlo] Starting simulation...');
  
  // Get real historical parameters from last 2 years
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  
  let annualReturn = 0.08; // Default 8%
  let annualVolatility = 0.16; // Default 16%
  
  try {
    const histConfig = {
      ...config,
      startDate: twoYearsAgo.toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
    };
    
    const historicalResult = await runBacktest(histConfig);
    annualReturn = historicalResult.annualizedReturn / 100;
    annualVolatility = Math.max(historicalResult.volatility / 100, 0.05);
    
    console.log(`[Monte Carlo] Using REAL parameters - Return: ${(annualReturn * 100).toFixed(2)}%, Volatility: ${(annualVolatility * 100).toFixed(2)}%`);
  } catch (e) {
    console.warn('[Monte Carlo] Could not get historical data, using defaults:', e);
  }
  
  const tradingDaysPerYear = 252;
  const dailyReturn = annualReturn / tradingDaysPerYear;
  const dailyVol = annualVolatility / Math.sqrt(tradingDaysPerYear);
  
  const allPaths: number[][] = [];
  const finalValues: number[] = [];
  
  for (let sim = 0; sim < numSimulations; sim++) {
    const path: number[] = [config.initialCapital];
    let value = config.initialCapital;
    
    for (let year = 0; year < projectionYears; year++) {
      for (let day = 0; day < tradingDaysPerYear; day++) {
        // Box-Muller transform for normal distribution
        const u1 = Math.random();
        const u2 = Math.random();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        
        const dailyChange = dailyReturn + z * dailyVol;
        value *= (1 + dailyChange);
        value = Math.max(0, value);
      }
      path.push(Math.round(value));
    }
    
    allPaths.push(path);
    finalValues.push(value);
  }
  
  // Calculate percentiles for each year
  const percentile5: number[] = [];
  const percentile25: number[] = [];
  const percentile50: number[] = [];
  const percentile75: number[] = [];
  const percentile95: number[] = [];
  
  for (let year = 0; year <= projectionYears; year++) {
    const valuesAtYear = allPaths.map(path => path[year]).sort((a, b) => a - b);
    percentile5.push(valuesAtYear[Math.floor(numSimulations * 0.05)]);
    percentile25.push(valuesAtYear[Math.floor(numSimulations * 0.25)]);
    percentile50.push(valuesAtYear[Math.floor(numSimulations * 0.50)]);
    percentile75.push(valuesAtYear[Math.floor(numSimulations * 0.75)]);
    percentile95.push(valuesAtYear[Math.floor(numSimulations * 0.95)]);
  }
  
  const sortedFinals = [...finalValues].sort((a, b) => a - b);
  const medianFinalValue = sortedFinals[Math.floor(numSimulations / 2)];
  const lossCount = finalValues.filter(v => v < config.initialCapital).length;
  
  console.log(`[Monte Carlo] Median final value: $${medianFinalValue.toLocaleString()}`);
  console.log(`[Monte Carlo] Probability of loss: ${((lossCount / numSimulations) * 100).toFixed(1)}%`);
  
  return {
    percentile5,
    percentile25,
    percentile50,
    percentile75,
    percentile95,
    finalValues: sortedFinals,
    medianFinalValue,
    probabilityOfLoss: (lossCount / numSimulations) * 100,
  };
}

/**
 * Run stress tests using REAL historical crash periods
 */
export async function runStressTests(config: BacktestConfig): Promise<StressTestResult[]> {
  console.log('[Stress Tests] Running historical stress tests...');
  
  const results: StressTestResult[] = [];
  
  const historicalScenarios = [
    { name: 'COVID Crash (2020)', start: '2020-02-19', end: '2020-03-23', description: 'Pandemic market crash' },
    { name: '2022 Bear Market', start: '2022-01-03', end: '2022-10-12', description: 'Fed rate hikes bear market' },
    { name: '2018 Q4 Selloff', start: '2018-10-01', end: '2018-12-24', description: 'Trade war and Fed concerns' },
  ];
  
  for (const scenario of historicalScenarios) {
    try {
      const testConfig = { ...config, startDate: scenario.start, endDate: scenario.end };
      const result = await runBacktest(testConfig);
      
      results.push({
        scenario: scenario.name,
        description: scenario.description,
        portfolioReturn: result.totalReturnPercent,
        benchmarkReturn: result.benchmarkReturn || 0,
        startDate: scenario.start,
        endDate: scenario.end,
        isHistorical: true,
      });
      
      await delay(500);
    } catch (e) {
      console.warn(`[Stress Tests] Could not run ${scenario.name}:`, e);
    }
  }
  
  // Add hypothetical scenarios
  results.push({
    scenario: 'Hypothetical -30% Crash',
    description: 'Severe market correction',
    portfolioReturn: -30,
    benchmarkReturn: -30,
    isHistorical: false,
  });
  
  results.push({
    scenario: 'Stagflation Scenario',
    description: 'Low growth + high inflation',
    portfolioReturn: -15,
    benchmarkReturn: -12,
    isHistorical: false,
  });
  
  console.log(`[Stress Tests] Completed ${results.length} scenarios`);
  
  return results;
}

/**
 * Calculate correlation matrix using REAL price data
 */
export async function calculateCorrelationMatrix(
  symbols: string[],
  startDate: string,
  endDate: string
): Promise<CorrelationMatrix> {
  console.log(`[Correlation] Calculating matrix for: ${symbols.join(', ')}`);
  
  const priceData: Map<string, Map<string, number>> = new Map();
  
  for (let i = 0; i < symbols.length; i++) {
    try {
      const prices = await fetchHistoricalPrices(symbols[i], startDate, endDate);
      const priceMap = new Map<string, number>();
      prices.forEach(p => priceMap.set(p.date, p.price));
      priceData.set(symbols[i], priceMap);
      
      if (i < symbols.length - 1) {
        await delay(350);
      }
    } catch (e) {
      console.warn(`[Correlation] Could not fetch ${symbols[i]}:`, e);
    }
  }
  
  // Find common dates
  const allDates = new Set<string>();
  priceData.forEach(data => data.forEach((_, date) => allDates.add(date)));
  const commonDates = Array.from(allDates)
    .filter(date => symbols.every(s => priceData.get(s)?.has(date)))
    .sort();
  
  // Calculate returns
  const returnsMap: Map<string, number[]> = new Map();
  
  for (const symbol of symbols) {
    const prices = commonDates.map(d => priceData.get(symbol)?.get(d) || 0);
    const returns = calculateDailyReturns(prices);
    returnsMap.set(symbol, returns);
  }
  
  // Build correlation matrix
  const matrix: number[][] = [];
  
  for (let i = 0; i < symbols.length; i++) {
    const row: number[] = [];
    const returns1 = returnsMap.get(symbols[i]) || [];
    
    for (let j = 0; j < symbols.length; j++) {
      if (i === j) {
        row.push(1);
        continue;
      }
      
      const returns2 = returnsMap.get(symbols[j]) || [];
      
      if (returns1.length < 10 || returns2.length < 10) {
        row.push(0);
        continue;
      }
      
      const n = Math.min(returns1.length, returns2.length);
      const mean1 = returns1.slice(0, n).reduce((a, b) => a + b, 0) / n;
      const mean2 = returns2.slice(0, n).reduce((a, b) => a + b, 0) / n;
      
      let cov = 0, var1 = 0, var2 = 0;
      for (let k = 0; k < n; k++) {
        cov += (returns1[k] - mean1) * (returns2[k] - mean2);
        var1 += Math.pow(returns1[k] - mean1, 2);
        var2 += Math.pow(returns2[k] - mean2, 2);
      }
      
      const correlation = var1 > 0 && var2 > 0 ? cov / Math.sqrt(var1 * var2) : 0;
      row.push(correlation);
    }
    
    matrix.push(row);
  }
  
  console.log(`[Correlation] Matrix calculated for ${symbols.length} assets`);
  
  return { symbols, matrix };
}
