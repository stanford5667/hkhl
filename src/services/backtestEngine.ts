import { fetchHistoricalPrices, HistoricalDataPoint, CorrelationMatrix } from './backtesterService';
import { 
  NeuroSymbolicOptimizer, 
  PortfolioWeights, 
  TaxLot,
  AssetData,
  RegimeSignal 
} from './portfolioOptimizer';
import {
  yearsBetween,
  calculateCAGR,
  calculateSharpeRatio,
  calculateSortinoRatio,
  calculateMaxDrawdown,
  calculateCalmarRatio,
  standardDeviation,
  arithmeticMean
} from './portfolioMetricsService';

// Types
export interface BacktestConfig {
  tickers: string[];
  startDate: string;
  endDate: string;
  initialCapital: number;
  rebalanceFrequency: 'daily' | 'weekly' | 'monthly';
  regimeLookback: number;
  taxRate: { shortTerm: number; longTerm: number };
}

export interface BacktestSnapshot {
  date: Date;
  portfolioValue: number;
  dailyReturn: number;
  regime: string;
  turbulenceIndex: number;
  weights: Map<string, number>;
  turnover: number;
  taxPaid: number;
}

export interface BacktestResult {
  snapshots: BacktestSnapshot[];
  metrics: PerformanceMetrics;
  regimeBreakdown: RegimeMetrics[];
}

export interface PerformanceMetrics {
  totalReturn: number;
  cagr: number;
  volatility: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  calmarRatio: number;
  totalTurnover: number;
  totalTaxPaid: number;
  afterTaxReturn: number;
}

export interface RegimeMetrics {
  regime: string;
  daysInRegime: number;
  averageReturn: number;
  volatility: number;
}

const RISK_FREE_RATE = 0.05;

/**
 * Neural-Symbolic Backtest Engine
 */
export class BacktestEngine {
  private config: BacktestConfig;
  private optimizer: NeuroSymbolicOptimizer;
  private assetData: Map<string, HistoricalDataPoint[]> = new Map();
  private portfolioValue: number;
  private currentWeights: Map<string, number> = new Map();
  private taxLots: TaxLot[] = [];
  private currentPrices: Map<string, number> = new Map();
  private shares: Map<string, number> = new Map();
  private cash: number;

  constructor(config: BacktestConfig) {
    this.config = config;
    this.optimizer = new NeuroSymbolicOptimizer();
    this.portfolioValue = config.initialCapital;
    this.cash = config.initialCapital;
  }

  /**
   * Run the full backtest
   */
  async runBacktest(
    onProgress?: (message: string, percent: number) => void
  ): Promise<BacktestResult> {
    const { tickers, startDate, endDate, initialCapital } = this.config;
    
    console.log('[Backtest] Starting...', tickers.length, 'assets');
    onProgress?.('Fetching historical data...', 5);

    // Fetch historical data for all tickers
    for (let i = 0; i < tickers.length; i++) {
      const ticker = tickers[i];
      try {
        const data = await fetchHistoricalPrices(ticker, startDate, endDate);
        this.assetData.set(ticker, data);
        onProgress?.(`Loaded ${ticker}`, 5 + (i / tickers.length) * 30);
      } catch (error) {
        console.warn(`[Backtest] Failed to fetch ${ticker}:`, error);
      }
      // Rate limiting
      if (i < tickers.length - 1) {
        await new Promise(r => setTimeout(r, 300));
      }
    }

    // Filter to only tickers with data
    const activeTickers = tickers.filter(t => this.assetData.has(t) && this.assetData.get(t)!.length > 0);
    if (activeTickers.length === 0) {
      throw new Error('No valid data for any tickers');
    }

    console.log('[Backtest] Active tickers:', activeTickers);
    onProgress?.('Processing trading days...', 40);

    // Get unique trading dates
    const allDates = this.getUniqueDates(activeTickers);
    console.log('[Backtest] Trading days:', allDates.length);

    // Initialize with equal weights
    const initialWeight = 1 / activeTickers.length;
    activeTickers.forEach(ticker => {
      this.currentWeights.set(ticker, initialWeight);
      this.shares.set(ticker, 0);
    });

    // Update initial prices
    this.updatePrices(allDates[0], activeTickers);

    // Initial purchase - equal weight
    activeTickers.forEach(ticker => {
      const price = this.currentPrices.get(ticker) || 0;
      if (price > 0) {
        const allocation = initialCapital * initialWeight;
        const numShares = Math.floor(allocation / price);
        this.shares.set(ticker, numShares);
        this.cash -= numShares * price;
        
        // Record tax lot
        this.taxLots.push({
          ticker,
          shares: numShares,
          costBasis: price,
          purchaseDate: new Date(allDates[0])
        });
      }
    });

    const snapshots: BacktestSnapshot[] = [];
    let lastRebalanceDate = allDates[0];
    let previousValue = initialCapital;
    let currentRegime: RegimeSignal = { regime: 'normal', turbulenceIndex: 10, volatility: 15, date: allDates[0] };
    let totalTurnover = 0;
    let totalTaxPaid = 0;

    // Loop through each trading day
    for (let i = 1; i < allDates.length; i++) {
      const date = allDates[i];
      const progress = 40 + (i / allDates.length) * 50;
      
      if (i % 20 === 0) {
        console.log('[Backtest] Processing', date);
        onProgress?.(`Processing ${date}...`, progress);
      }

      // Update prices
      this.updatePrices(date, activeTickers);

      // Calculate current portfolio value
      this.portfolioValue = this.calculatePortfolioValue(activeTickers);
      const dailyReturn = previousValue > 0 ? (this.portfolioValue - previousValue) / previousValue : 0;

      // Check if rebalance needed
      if (this.shouldRebalance(date, lastRebalanceDate)) {
        console.log('[Backtest] Rebalancing - Regime:', currentRegime.regime);
        
        // Build rolling correlation matrix (last 252 days or available)
        const lookbackStart = Math.max(0, i - 252);
        const correlationMatrix = this.buildCorrelationMatrix(activeTickers, allDates.slice(lookbackStart, i));
        
        // Calculate regime signal from recent volatility
        currentRegime = this.calculateRegimeSignal(activeTickers, allDates.slice(Math.max(0, i - 60), i));
        
        // Build asset data for optimizer
        const assetDataMap = this.buildAssetData(activeTickers, allDates.slice(lookbackStart, i));
        
        // Compute optimal weights
        const optimalWeights = this.optimizer.computeOptimalWeights(
          assetDataMap,
          correlationMatrix,
          currentRegime,
          activeTickers
        );

        // Execute rebalance
        const { turnover, taxPaid } = this.executeRebalance(optimalWeights.weights, new Date(date), activeTickers);
        totalTurnover += turnover;
        totalTaxPaid += taxPaid;
        
        lastRebalanceDate = date;
      }

      // Record snapshot
      snapshots.push({
        date: new Date(date),
        portfolioValue: this.portfolioValue,
        dailyReturn,
        regime: currentRegime.regime,
        turbulenceIndex: currentRegime.turbulenceIndex,
        weights: new Map(this.currentWeights),
        turnover: 0,
        taxPaid: 0
      });

      previousValue = this.portfolioValue;
    }

    onProgress?.('Calculating metrics...', 95);

    // Calculate final metrics
    const metrics = this.calculatePerformanceMetrics(snapshots, totalTurnover, totalTaxPaid);
    const regimeBreakdown = this.calculateRegimeBreakdown(snapshots);

    console.log('[Backtest] Complete! Return:', (metrics.totalReturn * 100).toFixed(2) + '%');
    onProgress?.('Complete!', 100);

    return { snapshots, metrics, regimeBreakdown };
  }

  /**
   * Get unique dates across all assets
   */
  private getUniqueDates(tickers: string[]): string[] {
    const dateSet = new Set<string>();
    tickers.forEach(ticker => {
      const data = this.assetData.get(ticker);
      if (data) {
        data.forEach(d => dateSet.add(d.date));
      }
    });

    // Find dates where ALL tickers have data
    const commonDates = Array.from(dateSet).filter(date => 
      tickers.every(ticker => {
        const data = this.assetData.get(ticker);
        return data?.some(d => d.date === date);
      })
    );

    return commonDates.sort();
  }

  /**
   * Update current prices for a given date
   */
  private updatePrices(date: string, tickers: string[]): void {
    tickers.forEach(ticker => {
      const data = this.assetData.get(ticker);
      const point = data?.find(d => d.date === date);
      if (point) {
        this.currentPrices.set(ticker, point.price);
      }
    });
  }

  /**
   * Calculate total portfolio value
   */
  private calculatePortfolioValue(tickers: string[]): number {
    let value = this.cash;
    tickers.forEach(ticker => {
      const shares = this.shares.get(ticker) || 0;
      const price = this.currentPrices.get(ticker) || 0;
      value += shares * price;
    });
    return value;
  }

  /**
   * Check if rebalancing is needed
   */
  private shouldRebalance(currentDate: string, lastRebalanceDate: string): boolean {
    const current = new Date(currentDate);
    const last = new Date(lastRebalanceDate);
    const daysDiff = Math.floor((current.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));

    switch (this.config.rebalanceFrequency) {
      case 'daily':
        return daysDiff >= 1;
      case 'weekly':
        return daysDiff >= 7;
      case 'monthly':
        return daysDiff >= 21; // ~21 trading days
      default:
        return daysDiff >= 21;
    }
  }

  /**
   * Execute rebalance to target weights
   */
  private executeRebalance(
    targetWeights: Map<string, number>,
    date: Date,
    tickers: string[]
  ): { turnover: number; taxPaid: number } {
    const totalValue = this.calculatePortfolioValue(tickers);
    let turnover = 0;
    let taxPaid = 0;

    // Calculate target positions
    const targetPositions = new Map<string, number>();
    tickers.forEach(ticker => {
      const weight = targetWeights.get(ticker) || 0;
      const targetValue = totalValue * weight;
      const price = this.currentPrices.get(ticker) || 0;
      const targetShares = price > 0 ? Math.floor(targetValue / price) : 0;
      targetPositions.set(ticker, targetShares);
    });

    // Execute trades
    tickers.forEach(ticker => {
      const currentShares = this.shares.get(ticker) || 0;
      const targetShares = targetPositions.get(ticker) || 0;
      const price = this.currentPrices.get(ticker) || 0;
      const shareDiff = targetShares - currentShares;

      if (shareDiff !== 0 && price > 0) {
        const tradeValue = Math.abs(shareDiff) * price;
        turnover += tradeValue / totalValue;

        if (shareDiff < 0) {
          // Selling - calculate tax
          const sellShares = Math.abs(shareDiff);
          taxPaid += this.calculateTaxOnSale(ticker, sellShares, price, date);
          this.cash += sellShares * price;
        } else {
          // Buying
          this.cash -= shareDiff * price;
          this.taxLots.push({
            ticker,
            shares: shareDiff,
            costBasis: price,
            purchaseDate: date
          });
        }

        this.shares.set(ticker, targetShares);
      }
    });

    // Update weights
    tickers.forEach(ticker => {
      const shares = this.shares.get(ticker) || 0;
      const price = this.currentPrices.get(ticker) || 0;
      const weight = totalValue > 0 ? (shares * price) / totalValue : 0;
      this.currentWeights.set(ticker, weight);
    });

    return { turnover, taxPaid };
  }

  /**
   * Calculate tax on sale using FIFO
   */
  private calculateTaxOnSale(
    ticker: string,
    sharesToSell: number,
    currentPrice: number,
    saleDate: Date
  ): number {
    const tickerLots = this.taxLots
      .filter(lot => lot.ticker === ticker && lot.shares > 0)
      .sort((a, b) => a.purchaseDate.getTime() - b.purchaseDate.getTime());

    const oneYearAgo = new Date(saleDate.getTime() - 365 * 24 * 60 * 60 * 1000);
    let remaining = sharesToSell;
    let totalTax = 0;

    for (const lot of tickerLots) {
      if (remaining <= 0) break;

      const sharesToSellFromLot = Math.min(remaining, lot.shares);
      const gain = (currentPrice - lot.costBasis) * sharesToSellFromLot;

      if (gain > 0) {
        const isLongTerm = lot.purchaseDate < oneYearAgo;
        const rate = isLongTerm ? this.config.taxRate.longTerm : this.config.taxRate.shortTerm;
        totalTax += gain * rate;
      }

      lot.shares -= sharesToSellFromLot;
      remaining -= sharesToSellFromLot;
    }

    return totalTax;
  }

  /**
   * Build correlation matrix from historical data
   */
  private buildCorrelationMatrix(tickers: string[], dates: string[]): CorrelationMatrix {
    const n = tickers.length;
    const matrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));

    // Calculate returns for each ticker
    const returns: Map<string, number[]> = new Map();
    tickers.forEach(ticker => {
      const data = this.assetData.get(ticker);
      if (!data) return;

      const tickerReturns: number[] = [];
      for (let i = 1; i < dates.length; i++) {
        const prev = data.find(d => d.date === dates[i - 1]);
        const curr = data.find(d => d.date === dates[i]);
        if (prev && curr && prev.price > 0) {
          tickerReturns.push(Math.log(curr.price / prev.price));
        }
      }
      returns.set(ticker, tickerReturns);
    });

    // Calculate correlations
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          matrix[i][j] = 1;
        } else {
          const r1 = returns.get(tickers[i]) || [];
          const r2 = returns.get(tickers[j]) || [];
          matrix[i][j] = this.correlation(r1, r2);
        }
      }
    }

    return { symbols: tickers, matrix };
  }

  /**
   * Calculate correlation between two return series
   */
  private correlation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    if (n < 5) return 0;

    const meanX = x.slice(0, n).reduce((a, b) => a + b, 0) / n;
    const meanY = y.slice(0, n).reduce((a, b) => a + b, 0) / n;

    let cov = 0, varX = 0, varY = 0;
    for (let i = 0; i < n; i++) {
      cov += (x[i] - meanX) * (y[i] - meanY);
      varX += Math.pow(x[i] - meanX, 2);
      varY += Math.pow(y[i] - meanY, 2);
    }

    return varX > 0 && varY > 0 ? cov / Math.sqrt(varX * varY) : 0;
  }

  /**
   * Calculate regime signal from recent data
   */
  private calculateRegimeSignal(tickers: string[], dates: string[]): RegimeSignal {
    // Calculate average portfolio volatility
    const returns: number[] = [];
    
    for (let i = 1; i < dates.length; i++) {
      let dayReturn = 0;
      let count = 0;
      
      tickers.forEach(ticker => {
        const data = this.assetData.get(ticker);
        const prev = data?.find(d => d.date === dates[i - 1]);
        const curr = data?.find(d => d.date === dates[i]);
        if (prev && curr && prev.price > 0) {
          dayReturn += Math.log(curr.price / prev.price);
          count++;
        }
      });

      if (count > 0) {
        returns.push(dayReturn / count);
      }
    }

    if (returns.length < 10) {
      return { regime: 'normal', turbulenceIndex: 10, volatility: 15, date: dates[dates.length - 1] };
    }

    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance) * Math.sqrt(252) * 100;

    // Simple turbulence approximation
    const recentReturns = returns.slice(-5);
    const recentVolatility = Math.sqrt(
      recentReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / recentReturns.length
    ) * Math.sqrt(252) * 100;

    const turbulenceIndex = recentVolatility / Math.max(volatility, 1) * 10;

    let regime: RegimeSignal['regime'];
    if (turbulenceIndex > 25) regime = 'crisis';
    else if (turbulenceIndex > 15) regime = 'high_vol';
    else if (turbulenceIndex > 8) regime = 'normal';
    else regime = 'low_vol';

    return {
      regime,
      turbulenceIndex: parseFloat(turbulenceIndex.toFixed(2)),
      volatility: parseFloat(volatility.toFixed(2)),
      date: dates[dates.length - 1]
    };
  }

  /**
   * Build asset data for optimizer
   */
  private buildAssetData(tickers: string[], dates: string[]): Map<string, AssetData> {
    const assetDataMap = new Map<string, AssetData>();

    tickers.forEach(ticker => {
      const data = this.assetData.get(ticker);
      if (!data || data.length < 10) return;

      // Calculate returns
      const returns: number[] = [];
      for (let i = 1; i < dates.length; i++) {
        const prev = data.find(d => d.date === dates[i - 1]);
        const curr = data.find(d => d.date === dates[i]);
        if (prev && curr && prev.price > 0) {
          returns.push(Math.log(curr.price / prev.price));
        }
      }

      if (returns.length < 5) return;

      const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length * 252;
      const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn / 252, 2), 0) / returns.length;
      const volatility = Math.sqrt(variance) * Math.sqrt(252);

      // Skewness
      const stdDev = Math.sqrt(variance);
      const skewness = stdDev > 0 
        ? returns.reduce((sum, r) => sum + Math.pow((r - avgReturn / 252) / stdDev, 3), 0) / returns.length
        : 0;

      // Kurtosis
      const kurtosis = stdDev > 0
        ? returns.reduce((sum, r) => sum + Math.pow((r - avgReturn / 252) / stdDev, 4), 0) / returns.length
        : 3;

      // Average volume
      const volumes = data.filter(d => d.volume).map(d => d.volume || 0);
      const avgVolume = volumes.length > 0 ? volumes.reduce((a, b) => a + b, 0) / volumes.length : 1000000;

      assetDataMap.set(ticker, {
        ticker,
        volatility,
        avgReturn,
        skewness,
        kurtosis,
        volume: avgVolume
      });
    });

    return assetDataMap;
  }

  /**
   * Calculate performance metrics
   */
  private calculatePerformanceMetrics(
    snapshots: BacktestSnapshot[],
    totalTurnover: number,
    totalTaxPaid: number
  ): PerformanceMetrics {
    if (snapshots.length < 2) {
      return {
        totalReturn: 0, cagr: 0, volatility: 0, sharpeRatio: 0, sortinoRatio: 0,
        maxDrawdown: 0, calmarRatio: 0, totalTurnover: 0, totalTaxPaid: 0, afterTaxReturn: 0
      };
    }

    const initialValue = this.config.initialCapital;
    const finalValue = snapshots[snapshots.length - 1].portfolioValue;
    const totalReturn = (finalValue - initialValue) / initialValue;

    // Use actual calendar dates for CAGR calculation
    const startDate = snapshots[0].date;
    const endDate = snapshots[snapshots.length - 1].date;
    const years = yearsBetween(startDate, endDate);
    const cagr = calculateCAGR(initialValue, finalValue, years);

    // Daily returns for metrics
    const returns = snapshots.map(s => s.dailyReturn);
    
    // Volatility using sample standard deviation, annualized
    const volatility = standardDeviation(returns) * Math.sqrt(252);

    // Sharpe Ratio (proper formula)
    const sharpeRatio = calculateSharpeRatio(returns, RISK_FREE_RATE);

    // Sortino Ratio (proper formula with downside deviation)
    const sortinoRatio = calculateSortinoRatio(returns, RISK_FREE_RATE);

    // Max Drawdown
    const portfolioValues = snapshots.map(s => s.portfolioValue);
    const { maxDrawdownPercent } = calculateMaxDrawdown(portfolioValues);
    const maxDrawdown = maxDrawdownPercent / 100;

    // Calmar Ratio
    const calmarRatio = calculateCalmarRatio(cagr, maxDrawdownPercent);

    // After-tax return
    const afterTaxReturn = (finalValue - initialValue - totalTaxPaid) / initialValue;

    return {
      totalReturn,
      cagr,
      volatility,
      sharpeRatio,
      sortinoRatio,
      maxDrawdown,
      calmarRatio,
      totalTurnover,
      totalTaxPaid,
      afterTaxReturn
    };
  }

  /**
   * Calculate regime breakdown
   */
  private calculateRegimeBreakdown(snapshots: BacktestSnapshot[]): RegimeMetrics[] {
    const regimeData: Record<string, { returns: number[]; days: number }> = {};

    snapshots.forEach(s => {
      if (!regimeData[s.regime]) {
        regimeData[s.regime] = { returns: [], days: 0 };
      }
      regimeData[s.regime].returns.push(s.dailyReturn);
      regimeData[s.regime].days++;
    });

    return Object.entries(regimeData).map(([regime, data]) => {
      const avgReturn = data.returns.reduce((a, b) => a + b, 0) / data.returns.length * 252;
      const variance = data.returns.reduce((sum, r) => sum + Math.pow(r - avgReturn / 252, 2), 0) / data.returns.length;
      const volatility = Math.sqrt(variance) * Math.sqrt(252);

      return {
        regime,
        daysInRegime: data.days,
        averageReturn: avgReturn,
        volatility
      };
    });
  }
}

/**
 * Convenience function to run backtest
 */
export async function runBacktest(
  tickers: string[],
  startDate: string,
  endDate: string,
  initialCapital: number = 100000,
  onProgress?: (msg: string, pct: number) => void
): Promise<BacktestResult> {
  const config: BacktestConfig = {
    tickers,
    startDate,
    endDate,
    initialCapital,
    rebalanceFrequency: 'monthly',
    regimeLookback: 60,
    taxRate: { shortTerm: 0.35, longTerm: 0.15 }
  };

  const engine = new BacktestEngine(config);
  return engine.runBacktest(onProgress);
}
