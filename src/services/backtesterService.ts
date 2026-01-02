// Backtester Service - Strategy testing with historical data simulation

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
}

export interface StrategyParams {
  initialCapital: number;
  // Buy and Hold
  // (no extra params)
  
  // DCA
  dcaAmount?: number;
  dcaFrequency?: 'daily' | 'weekly' | 'monthly';
  
  // Momentum
  momentumPeriod?: number;
  momentumThreshold?: number;
  
  // Mean Reversion
  maPeriod?: number;
  deviationThreshold?: number;
  
  // RSI
  rsiPeriod?: number;
  rsiOversold?: number;
  rsiOverbought?: number;
}

export type StrategyType = 'buy-hold' | 'dca' | 'momentum' | 'mean-reversion' | 'rsi';

// Generate simulated historical data for a given period
export function generateHistoricalData(
  startPrice: number,
  days: number,
  volatility: number = 0.02,
  drift: number = 0.0003
): HistoricalDataPoint[] {
  const data: HistoricalDataPoint[] = [];
  let price = startPrice;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    
    // Skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    
    // Generate random price movement (geometric Brownian motion)
    const randomReturn = (Math.random() - 0.5) * 2 * volatility + drift;
    price = price * (1 + randomReturn);
    
    const dailyVolatility = volatility * Math.random();
    const open = price * (1 + (Math.random() - 0.5) * dailyVolatility);
    const high = Math.max(open, price) * (1 + Math.random() * dailyVolatility * 0.5);
    const low = Math.min(open, price) * (1 - Math.random() * dailyVolatility * 0.5);
    
    data.push({
      date: date.toISOString().split('T')[0],
      price: parseFloat(price.toFixed(2)),
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      volume: Math.floor(Math.random() * 10000000) + 1000000,
    });
  }
  
  return data;
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

// Calculate returns from portfolio history
function calculateReturns(history: PortfolioSnapshot[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < history.length; i++) {
    const dailyReturn = (history[i].totalValue - history[i - 1].totalValue) / history[i - 1].totalValue;
    returns.push(dailyReturn);
  }
  return returns;
}

// Calculate Sharpe Ratio (assuming risk-free rate of 0.04 annually)
function calculateSharpeRatio(returns: number[], riskFreeRate: number = 0.04): number {
  if (returns.length === 0) return 0;
  
  const dailyRiskFree = riskFreeRate / 252;
  const excessReturns = returns.map(r => r - dailyRiskFree);
  const meanExcessReturn = excessReturns.reduce((a, b) => a + b, 0) / excessReturns.length;
  
  const variance = excessReturns.reduce((sum, r) => sum + Math.pow(r - meanExcessReturn, 2), 0) / excessReturns.length;
  const stdDev = Math.sqrt(variance);
  
  if (stdDev === 0) return 0;
  
  // Annualize
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

// Calculate volatility (annualized standard deviation of returns)
function calculateVolatility(returns: number[]): number {
  if (returns.length === 0) return 0;
  
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  
  return Math.sqrt(variance) * Math.sqrt(252) * 100;
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

// Dollar Cost Averaging Strategy
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
      
      // Buy signal: positive momentum above threshold
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
      
      // Sell signal: negative momentum below negative threshold
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
      
      // Buy signal: price below MA by threshold (oversold)
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
      
      // Sell signal: price above MA by threshold (overbought)
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
      // Buy signal: RSI below oversold level
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
      
      // Sell signal: RSI above overbought level
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

// Main backtest function
export function runBacktest(
  strategy: StrategyType,
  data: HistoricalDataPoint[],
  params: StrategyParams
): BacktestResult {
  if (data.length < 2) {
    throw new Error('Not enough data points for backtest');
  }
  
  let result: { trades: Trade[]; history: PortfolioSnapshot[] };
  
  switch (strategy) {
    case 'buy-hold':
      result = runBuyAndHold(data, params);
      break;
    case 'dca':
      result = runDCA(data, params);
      break;
    case 'momentum':
      result = runMomentum(data, params);
      break;
    case 'mean-reversion':
      result = runMeanReversion(data, params);
      break;
    case 'rsi':
      result = runRSI(data, params);
      break;
    default:
      throw new Error(`Unknown strategy: ${strategy}`);
  }
  
  const { trades, history } = result;
  const returns = calculateReturns(history);
  const { maxDrawdown, maxDrawdownPercent } = calculateMaxDrawdown(history);
  
  const finalValue = history[history.length - 1]?.totalValue || params.initialCapital;
  const totalReturn = finalValue - params.initialCapital;
  const totalReturnPercent = (totalReturn / params.initialCapital) * 100;
  
  // Calculate annualized return
  const days = history.length;
  const years = days / 252;
  const annualizedReturn = years > 0 ? (Math.pow(finalValue / params.initialCapital, 1 / years) - 1) * 100 : 0;
  
  // Calculate win rate
  const profitableTrades = trades.filter((t, i) => {
    if (t.type !== 'sell') return false;
    const buyTrade = trades.slice(0, i).reverse().find(bt => bt.type === 'buy');
    return buyTrade ? t.price > buyTrade.price : false;
  }).length;
  const sellTrades = trades.filter(t => t.type === 'sell').length;
  const winRate = sellTrades > 0 ? (profitableTrades / sellTrades) * 100 : 0;
  
  // Benchmark (buy and hold)
  const benchmarkResult = strategy !== 'buy-hold' ? runBuyAndHold(data, params) : null;
  const benchmarkFinal = benchmarkResult?.history[benchmarkResult.history.length - 1]?.totalValue;
  const benchmarkReturn = benchmarkFinal ? ((benchmarkFinal - params.initialCapital) / params.initialCapital) * 100 : undefined;
  
  return {
    strategy,
    startDate: data[0].date,
    endDate: data[data.length - 1].date,
    initialCapital: params.initialCapital,
    finalValue,
    totalReturn,
    totalReturnPercent,
    annualizedReturn,
    sharpeRatio: calculateSharpeRatio(returns),
    maxDrawdown,
    maxDrawdownPercent,
    winRate,
    totalTrades: trades.length,
    profitableTrades,
    volatility: calculateVolatility(returns),
    trades,
    portfolioHistory: history,
    benchmarkReturn,
  };
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
