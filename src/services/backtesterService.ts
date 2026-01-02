// Backtester Service - Real historical data from Finnhub

import { getCandles, CandleData } from './finnhubService';

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
  const fromTs = Math.floor(new Date(startDate).getTime() / 1000);
  const toTs = Math.floor(new Date(endDate).getTime() / 1000);
  
  console.log(`[Backtester] Fetching data for ${symbol}...`);
  
  const candles = await getCandles(symbol, 'D', fromTs, toTs);
  
  return candles.map(c => ({
    date: c.date,
    price: c.close,
    open: c.open,
    high: c.high,
    low: c.low,
    volume: c.volume,
  }));
}

// Calculate Simple Moving Average
function calculateSMA(prices: number[], period: number): number[] {
  const sma: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      sma.push(0);
    } else {
      const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }
  }
  return sma;
}

// Calculate RSI
function calculateRSI(prices: number[], period: number = 14): number[] {
  const rsi: number[] = [];
  const gains: number[] = [];
  const losses: number[] = [];
  
  for (let i = 0; i < prices.length; i++) {
    if (i === 0) {
      gains.push(0);
      losses.push(0);
      rsi.push(50);
      continue;
    }
    
    const change = prices[i] - prices[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
    
    if (i < period) {
      rsi.push(50);
      continue;
    }
    
    const avgGain = gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
    const avgLoss = losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
    
    if (avgLoss === 0) {
      rsi.push(100);
    } else {
      const rs = avgGain / avgLoss;
      rsi.push(100 - (100 / (1 + rs)));
    }
  }
  
  return rsi;
}

// Calculate daily returns from prices
function calculateDailyReturns(prices: number[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  }
  return returns;
}

// Calculate returns from portfolio history
function calculateReturns(history: PortfolioSnapshot[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < history.length; i++) {
    const dailyReturn = (history[i].totalValue - history[i - 1].totalValue) / history[i - 1].totalValue;
    returns.push(dailyReturn);
  }
  return returns;
}

// Calculate Sharpe Ratio
function calculateSharpeRatio(returns: number[], riskFreeRate: number = 0.05): number {
  if (returns.length === 0) return 0;
  
  const dailyRiskFree = riskFreeRate / 252;
  const excessReturns = returns.map(r => r - dailyRiskFree);
  const meanExcessReturn = excessReturns.reduce((a, b) => a + b, 0) / excessReturns.length;
  
  const variance = excessReturns.reduce((sum, r) => sum + Math.pow(r - meanExcessReturn, 2), 0) / excessReturns.length;
  const stdDev = Math.sqrt(variance);
  
  if (stdDev === 0) return 0;
  
  return (meanExcessReturn / stdDev) * Math.sqrt(252);
}

// Calculate Maximum Drawdown
function calculateMaxDrawdown(history: PortfolioSnapshot[]): { maxDrawdown: number; maxDrawdownPercent: number } {
  let peak = history[0]?.totalValue || 0;
  let maxDrawdown = 0;
  let maxDrawdownPercent = 0;
  
  for (const snapshot of history) {
    if (snapshot.totalValue > peak) {
      peak = snapshot.totalValue;
    }
    const drawdown = peak - snapshot.totalValue;
    const drawdownPercent = peak > 0 ? (drawdown / peak) * 100 : 0;
    
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
      maxDrawdownPercent = drawdownPercent;
    }
  }
  
  return { maxDrawdown, maxDrawdownPercent };
}

// Calculate volatility
function calculateVolatility(returns: number[]): number {
  if (returns.length === 0) return 0;
  
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  
  return Math.sqrt(variance) * Math.sqrt(252) * 100;
}

// Calculate beta and alpha
function calculateBetaAlpha(
  portfolioReturns: number[],
  benchmarkReturns: number[],
  riskFreeRate: number = 0.05
): { beta: number; alpha: number } {
  if (portfolioReturns.length === 0 || benchmarkReturns.length === 0) {
    return { beta: 1, alpha: 0 };
  }
  
  const minLength = Math.min(portfolioReturns.length, benchmarkReturns.length);
  const pReturns = portfolioReturns.slice(0, minLength);
  const bReturns = benchmarkReturns.slice(0, minLength);
  
  const pMean = pReturns.reduce((a, b) => a + b, 0) / pReturns.length;
  const bMean = bReturns.reduce((a, b) => a + b, 0) / bReturns.length;
  
  let covariance = 0;
  let variance = 0;
  
  for (let i = 0; i < minLength; i++) {
    covariance += (pReturns[i] - pMean) * (bReturns[i] - bMean);
    variance += Math.pow(bReturns[i] - bMean, 2);
  }
  
  covariance /= minLength;
  variance /= minLength;
  
  const beta = variance > 0 ? covariance / variance : 1;
  
  // Annualize returns
  const annualPReturn = pMean * 252;
  const annualBReturn = bMean * 252;
  
  // Alpha = portfolio return - (risk-free + beta * (benchmark - risk-free))
  const alpha = (annualPReturn - (riskFreeRate + beta * (annualBReturn - riskFreeRate))) * 100;
  
  return { beta, alpha };
}

// Buy and Hold Strategy
function runBuyAndHold(
  data: HistoricalDataPoint[],
  params: StrategyParams
): { trades: Trade[]; history: PortfolioSnapshot[] } {
  const trades: Trade[] = [];
  const history: PortfolioSnapshot[] = [];
  
  const firstPrice = data[0].price;
  const shares = Math.floor(params.initialCapital / firstPrice);
  const cash = params.initialCapital - shares * firstPrice;
  
  trades.push({
    date: data[0].date,
    type: 'buy',
    shares,
    price: firstPrice,
    value: shares * firstPrice,
    reason: 'Initial buy - Buy and Hold',
  });
  
  for (const point of data) {
    history.push({
      date: point.date,
      cash,
      holdings: shares * point.price,
      totalValue: cash + shares * point.price,
      shares,
    });
  }
  
  return { trades, history };
}

// DCA Strategy
function runDCA(
  data: HistoricalDataPoint[],
  params: StrategyParams
): { trades: Trade[]; history: PortfolioSnapshot[] } {
  const trades: Trade[] = [];
  const history: PortfolioSnapshot[] = [];
  
  const amount = params.dcaAmount || params.initialCapital / 12;
  const frequency = params.dcaFrequency || 'monthly';
  
  let cash = params.initialCapital;
  let shares = 0;
  let lastPurchaseDate: Date | null = null;
  
  for (const point of data) {
    const currentDate = new Date(point.date);
    let shouldBuy = false;
    
    if (!lastPurchaseDate) {
      shouldBuy = true;
    } else {
      const daysDiff = Math.floor((currentDate.getTime() - lastPurchaseDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (frequency === 'daily') shouldBuy = true;
      else if (frequency === 'weekly') shouldBuy = daysDiff >= 7;
      else if (frequency === 'monthly') shouldBuy = daysDiff >= 30;
    }
    
    if (shouldBuy && cash >= amount) {
      const purchaseShares = Math.floor(amount / point.price);
      if (purchaseShares > 0) {
        shares += purchaseShares;
        cash -= purchaseShares * point.price;
        lastPurchaseDate = currentDate;
        
        trades.push({
          date: point.date,
          type: 'buy',
          shares: purchaseShares,
          price: point.price,
          value: purchaseShares * point.price,
          reason: `DCA purchase (${frequency})`,
        });
      }
    }
    
    history.push({
      date: point.date,
      cash,
      holdings: shares * point.price,
      totalValue: cash + shares * point.price,
      shares,
    });
  }
  
  return { trades, history };
}

// Momentum Strategy
function runMomentum(
  data: HistoricalDataPoint[],
  params: StrategyParams
): { trades: Trade[]; history: PortfolioSnapshot[] } {
  const trades: Trade[] = [];
  const history: PortfolioSnapshot[] = [];
  
  const period = params.momentumPeriod || 20;
  const threshold = params.momentumThreshold || 0.02;
  
  let cash = params.initialCapital;
  let shares = 0;
  const prices = data.map(d => d.price);
  
  for (let i = 0; i < data.length; i++) {
    const point = data[i];
    
    if (i >= period) {
      const momentum = (prices[i] - prices[i - period]) / prices[i - period];
      
      if (momentum > threshold && shares === 0 && cash > 0) {
        const buyShares = Math.floor(cash / point.price);
        if (buyShares > 0) {
          shares = buyShares;
          cash -= shares * point.price;
          trades.push({
            date: point.date,
            type: 'buy',
            shares,
            price: point.price,
            value: shares * point.price,
            reason: `Momentum buy (${(momentum * 100).toFixed(1)}% > ${(threshold * 100).toFixed(1)}%)`,
          });
        }
      }
      
      if (momentum < -threshold && shares > 0) {
        const sellValue = shares * point.price;
        trades.push({
          date: point.date,
          type: 'sell',
          shares,
          price: point.price,
          value: sellValue,
          reason: `Momentum sell (${(momentum * 100).toFixed(1)}% < -${(threshold * 100).toFixed(1)}%)`,
        });
        cash += sellValue;
        shares = 0;
      }
    }
    
    history.push({
      date: point.date,
      cash,
      holdings: shares * point.price,
      totalValue: cash + shares * point.price,
      shares,
    });
  }
  
  return { trades, history };
}

// Mean Reversion Strategy
function runMeanReversion(
  data: HistoricalDataPoint[],
  params: StrategyParams
): { trades: Trade[]; history: PortfolioSnapshot[] } {
  const trades: Trade[] = [];
  const history: PortfolioSnapshot[] = [];
  
  const period = params.maPeriod || 20;
  const deviationThreshold = params.deviationThreshold || 0.05;
  
  let cash = params.initialCapital;
  let shares = 0;
  const prices = data.map(d => d.price);
  const sma = calculateSMA(prices, period);
  
  for (let i = 0; i < data.length; i++) {
    const point = data[i];
    
    if (i >= period && sma[i] > 0) {
      const deviation = (point.price - sma[i]) / sma[i];
      
      if (deviation < -deviationThreshold && shares === 0 && cash > 0) {
        const buyShares = Math.floor(cash / point.price);
        if (buyShares > 0) {
          shares = buyShares;
          cash -= shares * point.price;
          trades.push({
            date: point.date,
            type: 'buy',
            shares,
            price: point.price,
            value: shares * point.price,
            reason: `Mean reversion buy (${(deviation * 100).toFixed(1)}% below MA)`,
          });
        }
      }
      
      if (deviation > deviationThreshold && shares > 0) {
        const sellValue = shares * point.price;
        trades.push({
          date: point.date,
          type: 'sell',
          shares,
          price: point.price,
          value: sellValue,
          reason: `Mean reversion sell (${(deviation * 100).toFixed(1)}% above MA)`,
        });
        cash += sellValue;
        shares = 0;
      }
    }
    
    history.push({
      date: point.date,
      cash,
      holdings: shares * point.price,
      totalValue: cash + shares * point.price,
      shares,
    });
  }
  
  return { trades, history };
}

// RSI Strategy
function runRSI(
  data: HistoricalDataPoint[],
  params: StrategyParams
): { trades: Trade[]; history: PortfolioSnapshot[] } {
  const trades: Trade[] = [];
  const history: PortfolioSnapshot[] = [];
  
  const period = params.rsiPeriod || 14;
  const oversold = params.rsiOversold || 30;
  const overbought = params.rsiOverbought || 70;
  
  let cash = params.initialCapital;
  let shares = 0;
  const prices = data.map(d => d.price);
  const rsi = calculateRSI(prices, period);
  
  for (let i = 0; i < data.length; i++) {
    const point = data[i];
    
    if (i >= period) {
      if (rsi[i] < oversold && shares === 0 && cash > 0) {
        const buyShares = Math.floor(cash / point.price);
        if (buyShares > 0) {
          shares = buyShares;
          cash -= shares * point.price;
          trades.push({
            date: point.date,
            type: 'buy',
            shares,
            price: point.price,
            value: shares * point.price,
            reason: `RSI buy (RSI: ${rsi[i].toFixed(1)} < ${oversold})`,
          });
        }
      }
      
      if (rsi[i] > overbought && shares > 0) {
        const sellValue = shares * point.price;
        trades.push({
          date: point.date,
          type: 'sell',
          shares,
          price: point.price,
          value: sellValue,
          reason: `RSI sell (RSI: ${rsi[i].toFixed(1)} > ${overbought})`,
        });
        cash += sellValue;
        shares = 0;
      }
    }
    
    history.push({
      date: point.date,
      cash,
      holdings: shares * point.price,
      totalValue: cash + shares * point.price,
      shares,
    });
  }
  
  return { trades, history };
}

/**
 * Main backtest function with REAL data from Finnhub
 */
export async function runBacktest(config: BacktestConfig): Promise<BacktestResult> {
  const { assets, startDate, endDate, initialCapital, strategy, strategyParams, benchmarkSymbol = 'SPY' } = config;
  
  console.log(`[Backtester] Running backtest from ${startDate} to ${endDate}`);
  console.log(`[Backtester] Assets: ${assets.map(a => `${a.symbol} (${a.allocation}%)`).join(', ')}`);
  
  // Validate allocations sum to 100%
  const totalAllocation = assets.reduce((sum, a) => sum + a.allocation, 0);
  if (Math.abs(totalAllocation - 100) > 0.01) {
    throw new Error(`Allocations must sum to 100% (current: ${totalAllocation.toFixed(1)}%)`);
  }
  
  // Fetch real historical data for all assets
  const assetData: Map<string, HistoricalDataPoint[]> = new Map();
  
  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i];
    console.log(`[Backtester] Fetching ${asset.symbol} (${i + 1}/${assets.length})...`);
    const data = await fetchHistoricalPrices(asset.symbol, startDate, endDate);
    console.log(`[Backtester] Got ${data.length} days for ${asset.symbol}`);
    assetData.set(asset.symbol, data);
    if (i < assets.length - 1) {
      await delay(300); // Rate limit: 300ms between calls (Finnhub: 60/min)
    }
  }
  
  // Fetch benchmark data
  let benchmarkData: HistoricalDataPoint[] = [];
  try {
    benchmarkData = await fetchHistoricalPrices(benchmarkSymbol, startDate, endDate);
  } catch (e) {
    console.warn(`[Backtester] Could not fetch benchmark data for ${benchmarkSymbol}`);
  }
  
  // Find common trading days
  const allDates = new Set<string>();
  assetData.forEach(data => data.forEach(d => allDates.add(d.date)));
  
  const commonDates = Array.from(allDates).filter(date => {
    return Array.from(assetData.values()).every(data => data.some(d => d.date === date));
  }).sort();
  
  console.log(`[Backtester] Found ${commonDates.length} common trading days`);
  
  if (commonDates.length < 2) {
    throw new Error('Not enough common trading days for backtest');
  }
  
  // Calculate initial shares for each asset based on allocation
  const assetShares: Map<string, number> = new Map();
  const firstDate = commonDates[0];
  
  for (const asset of assets) {
    const assetPrices = assetData.get(asset.symbol)!;
    const firstDayData = assetPrices.find(d => d.date === firstDate);
    if (firstDayData) {
      const allocation = (asset.allocation / 100) * initialCapital;
      const shares = allocation / firstDayData.price;
      assetShares.set(asset.symbol, shares);
      console.log(`[Backtester] ${asset.symbol}: $${allocation.toFixed(0)} → ${shares.toFixed(4)} shares @ $${firstDayData.price.toFixed(2)}`);
    }
  }
  
  // Build portfolio data - each day's value is sum of (shares * price) for all assets
  const portfolioData: HistoricalDataPoint[] = commonDates.map(date => {
    let dailyValue = 0;
    for (const asset of assets) {
      const assetPrices = assetData.get(asset.symbol)!;
      const dayData = assetPrices.find(d => d.date === date);
      const shares = assetShares.get(asset.symbol) || 0;
      if (dayData) {
        dailyValue += shares * dayData.price;
      }
    }
    // Return normalized "price" that represents portfolio value relative to initial
    // This allows strategies to work with the combined portfolio
    return { date, price: dailyValue };
  });
  
  console.log(`[Backtester] Initial portfolio value: $${portfolioData[0]?.price.toFixed(2)}`);
  console.log(`[Backtester] Final portfolio value: $${portfolioData[portfolioData.length - 1]?.price.toFixed(2)}`);
  
  // Run strategy
  const params: StrategyParams = {
    initialCapital,
    ...strategyParams,
  };
  
  let result: { trades: Trade[]; history: PortfolioSnapshot[] };
  
  switch (strategy) {
    case 'buy-hold':
      result = runBuyAndHold(portfolioData, params);
      break;
    case 'dca':
      result = runDCA(portfolioData, params);
      break;
    case 'momentum':
      result = runMomentum(portfolioData, params);
      break;
    case 'mean-reversion':
      result = runMeanReversion(portfolioData, params);
      break;
    case 'rsi':
      result = runRSI(portfolioData, params);
      break;
    default:
      throw new Error(`Unknown strategy: ${strategy}`);
  }
  
  const { trades, history } = result;
  const returns = calculateReturns(history);
  const { maxDrawdown, maxDrawdownPercent } = calculateMaxDrawdown(history);
  
  const finalValue = history[history.length - 1]?.totalValue || initialCapital;
  const totalReturn = finalValue - initialCapital;
  const totalReturnPercent = (totalReturn / initialCapital) * 100;
  
  // Calculate annualized return (CAGR)
  const days = history.length;
  const years = days / 252;
  const annualizedReturn = years > 0 ? (Math.pow(finalValue / initialCapital, 1 / years) - 1) * 100 : 0;
  
  // Calculate win rate
  const profitableTrades = trades.filter((t, i) => {
    if (t.type !== 'sell') return false;
    const buyTrade = trades.slice(0, i).reverse().find(bt => bt.type === 'buy');
    return buyTrade ? t.price > buyTrade.price : false;
  }).length;
  const sellTrades = trades.filter(t => t.type === 'sell').length;
  const winRate = sellTrades > 0 ? (profitableTrades / sellTrades) * 100 : 0;
  
  // Calculate benchmark return and alpha/beta
  let benchmarkReturn: number | undefined;
  let alpha = 0;
  let beta = 1;
  
  if (benchmarkData.length >= 2) {
    const benchmarkCommon = benchmarkData.filter(d => commonDates.includes(d.date));
    if (benchmarkCommon.length >= 2) {
      const benchmarkStartPrice = benchmarkCommon[0].price;
      const benchmarkEndPrice = benchmarkCommon[benchmarkCommon.length - 1].price;
      benchmarkReturn = ((benchmarkEndPrice - benchmarkStartPrice) / benchmarkStartPrice) * 100;
      
      const benchmarkPrices = benchmarkCommon.map(d => d.price);
      const benchmarkReturns = calculateDailyReturns(benchmarkPrices);
      const betaAlpha = calculateBetaAlpha(returns, benchmarkReturns);
      alpha = betaAlpha.alpha;
      beta = betaAlpha.beta;
    }
  }
  
  const volatility = calculateVolatility(returns);
  const sharpeRatio = calculateSharpeRatio(returns);
  
  console.log(`[Backtester] Results - CAGR: ${annualizedReturn.toFixed(2)}%, Sharpe: ${sharpeRatio.toFixed(2)}, Max DD: ${maxDrawdownPercent.toFixed(2)}%`);
  
  return {
    strategy,
    startDate: commonDates[0],
    endDate: commonDates[commonDates.length - 1],
    initialCapital,
    finalValue,
    totalReturn,
    totalReturnPercent,
    annualizedReturn,
    sharpeRatio,
    maxDrawdown,
    maxDrawdownPercent,
    winRate,
    totalTrades: trades.length,
    profitableTrades,
    volatility,
    trades,
    portfolioHistory: history,
    benchmarkReturn,
    alpha,
    beta,
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
  // First, run a backtest on recent data to get real volatility and return
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  
  const histConfig = {
    ...config,
    startDate: twoYearsAgo.toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  };
  
  console.log('[Backtester] Running historical backtest for Monte Carlo parameters...');
  
  const historicalResult = await runBacktest(histConfig);
  
  // Get real parameters from historical data
  const annualReturn = historicalResult.annualizedReturn / 100;
  const annualVolatility = historicalResult.volatility / 100;
  
  console.log(`[Monte Carlo] Using real parameters - Return: ${(annualReturn * 100).toFixed(2)}%, Volatility: ${(annualVolatility * 100).toFixed(2)}%`);
  
  const tradingDaysPerYear = 252;
  const totalDays = tradingDaysPerYear * projectionYears;
  const dailyReturn = annualReturn / tradingDaysPerYear;
  const dailyVol = annualVolatility / Math.sqrt(tradingDaysPerYear);
  
  const allPaths: number[][] = [];
  const finalValues: number[] = [];
  
  for (let sim = 0; sim < numSimulations; sim++) {
    const path: number[] = [config.initialCapital];
    let value = config.initialCapital;
    
    for (let day = 0; day < totalDays; day++) {
      // Geometric Brownian motion
      const randomReturn = dailyReturn + dailyVol * (Math.random() * 2 - 1) * 1.5;
      value = value * (1 + randomReturn);
      
      if ((day + 1) % tradingDaysPerYear === 0 || day === totalDays - 1) {
        path.push(value);
      }
    }
    
    allPaths.push(path);
    finalValues.push(value);
  }
  
  // Sort final values for percentile calculation
  finalValues.sort((a, b) => a - b);
  
  const getPercentile = (arr: number[], p: number) => arr[Math.floor(arr.length * p)];
  
  // Calculate percentile paths
  const numPoints = projectionYears + 1;
  const percentile5: number[] = [];
  const percentile25: number[] = [];
  const percentile50: number[] = [];
  const percentile75: number[] = [];
  const percentile95: number[] = [];
  
  for (let i = 0; i < numPoints; i++) {
    const valuesAtPoint = allPaths.map(p => p[i]).sort((a, b) => a - b);
    percentile5.push(getPercentile(valuesAtPoint, 0.05));
    percentile25.push(getPercentile(valuesAtPoint, 0.25));
    percentile50.push(getPercentile(valuesAtPoint, 0.50));
    percentile75.push(getPercentile(valuesAtPoint, 0.75));
    percentile95.push(getPercentile(valuesAtPoint, 0.95));
  }
  
  const probabilityOfLoss = finalValues.filter(v => v < config.initialCapital).length / numSimulations;
  
  return {
    percentile5,
    percentile25,
    percentile50,
    percentile75,
    percentile95,
    finalValues,
    medianFinalValue: getPercentile(finalValues, 0.5),
    probabilityOfLoss,
  };
}

/**
 * Stress test with REAL historical crisis periods
 */
export async function runStressTests(config: BacktestConfig): Promise<StressTestResult[]> {
  const results: StressTestResult[] = [];
  
  const historicalScenarios = [
    { name: 'COVID-19 Crash', start: '2020-02-19', end: '2020-03-23', description: 'COVID-19 market crash' },
    { name: '2022 Bear Market', start: '2022-01-03', end: '2022-10-12', description: '2022 inflation-driven bear market' },
    { name: '2023 Banking Crisis', start: '2023-03-01', end: '2023-03-15', description: 'SVB/regional banking crisis' },
  ];
  
  // Try to fetch real historical data for each scenario
  for (const scenario of historicalScenarios) {
    try {
      console.log(`[Stress Test] Testing ${scenario.name}...`);
      
      const testConfig = {
        ...config,
        startDate: scenario.start,
        endDate: scenario.end,
      };
      
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
      
      await delay(300);
    } catch (e) {
      console.warn(`[Stress Test] Could not fetch data for ${scenario.name}, skipping...`);
    }
  }
  
  // Add hypothetical scenarios (using last known beta if available)
  const hypotheticalScenarios = [
    { name: 'Market Crash -30%', marketMove: -30, description: 'Hypothetical 30% market decline' },
    { name: 'Flash Crash -10%', marketMove: -10, description: 'Hypothetical flash crash' },
    { name: 'Rate Spike +200bps', marketMove: -15, description: 'Sharp interest rate increase' },
  ];
  
  // Get portfolio beta from a recent backtest
  let portfolioBeta = 1;
  try {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    const recentConfig = {
      ...config,
      startDate: oneYearAgo.toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
    };
    
    const recentResult = await runBacktest(recentConfig);
    portfolioBeta = recentResult.beta || 1;
  } catch (e) {
    console.warn('[Stress Test] Could not calculate portfolio beta, using 1.0');
  }
  
  for (const scenario of hypotheticalScenarios) {
    const portfolioReturn = scenario.marketMove * portfolioBeta;
    
    results.push({
      scenario: scenario.name,
      description: `${scenario.description} (beta-adjusted)`,
      portfolioReturn,
      benchmarkReturn: scenario.marketMove,
      isHistorical: false,
    });
  }
  
  return results;
}

/**
 * Calculate correlation matrix from REAL price data
 */
export async function calculateCorrelationMatrix(
  symbols: string[],
  startDate: string,
  endDate: string
): Promise<CorrelationMatrix> {
  console.log(`[Correlation] Calculating matrix for ${symbols.join(', ')}`);
  
  const priceData: Map<string, number[]> = new Map();
  const allDates = new Set<string>();
  
  // Fetch price data for all symbols
  for (let i = 0; i < symbols.length; i++) {
    const symbol = symbols[i];
    try {
      console.log(`[Correlation] Fetching ${symbol} (${i + 1}/${symbols.length})...`);
      const data = await fetchHistoricalPrices(symbol, startDate, endDate);
      data.forEach(d => allDates.add(d.date));
      priceData.set(symbol, []);
      if (i < symbols.length - 1) {
        await delay(300);
      }
    } catch (e) {
      console.warn(`[Correlation] Could not fetch data for ${symbol}`);
    }
  }
  
  // Find common dates and build aligned price arrays
  const sortedDates = Array.from(allDates).sort();
  
  for (const symbol of symbols) {
    try {
      const data = await fetchHistoricalPrices(symbol, startDate, endDate);
      const dataMap = new Map(data.map(d => [d.date, d.price]));
      const prices: number[] = [];
      
      for (const date of sortedDates) {
        if (dataMap.has(date)) {
          prices.push(dataMap.get(date)!);
        }
      }
      
      priceData.set(symbol, prices);
    } catch (e) {
      priceData.set(symbol, []);
    }
  }
  
  // Calculate returns
  const returnsData: Map<string, number[]> = new Map();
  for (const [symbol, prices] of priceData) {
    if (prices.length > 1) {
      returnsData.set(symbol, calculateDailyReturns(prices));
    } else {
      returnsData.set(symbol, []);
    }
  }
  
  // Build correlation matrix
  const n = symbols.length;
  const matrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        matrix[i][j] = 1;
      } else {
        const returns1 = returnsData.get(symbols[i]) || [];
        const returns2 = returnsData.get(symbols[j]) || [];
        
        if (returns1.length > 0 && returns2.length > 0) {
          const minLen = Math.min(returns1.length, returns2.length);
          const r1 = returns1.slice(0, minLen);
          const r2 = returns2.slice(0, minLen);
          
          const mean1 = r1.reduce((a, b) => a + b, 0) / r1.length;
          const mean2 = r2.reduce((a, b) => a + b, 0) / r2.length;
          
          let covariance = 0;
          let var1 = 0;
          let var2 = 0;
          
          for (let k = 0; k < minLen; k++) {
            covariance += (r1[k] - mean1) * (r2[k] - mean2);
            var1 += Math.pow(r1[k] - mean1, 2);
            var2 += Math.pow(r2[k] - mean2, 2);
          }
          
          const std1 = Math.sqrt(var1 / minLen);
          const std2 = Math.sqrt(var2 / minLen);
          
          matrix[i][j] = std1 > 0 && std2 > 0 ? covariance / (minLen * std1 * std2) : 0;
        }
      }
    }
  }
  
  return { symbols, matrix };
}

// Strategy descriptions
export const STRATEGY_INFO: Record<StrategyType, { name: string; description: string }> = {
  'buy-hold': {
    name: 'Buy & Hold',
    description: 'Buy at the start and hold until the end. Simple, low-cost strategy.',
  },
  'dca': {
    name: 'Dollar Cost Averaging',
    description: 'Invest fixed amounts at regular intervals to reduce timing risk.',
  },
  'momentum': {
    name: 'Momentum',
    description: 'Buy when price shows positive momentum, sell on negative momentum.',
  },
  'mean-reversion': {
    name: 'Mean Reversion',
    description: 'Buy when price is below moving average, sell when above.',
  },
  'rsi': {
    name: 'RSI Strategy',
    description: 'Buy when RSI is oversold, sell when overbought.',
  },
};

// Legacy function for compatibility - now throws error
export function generateHistoricalData(): never {
  throw new Error('Mock data generation is disabled. Use fetchHistoricalPrices() with real Finnhub data.');
}
