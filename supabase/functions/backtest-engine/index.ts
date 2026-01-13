import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Types
interface BacktestConfig {
  tickers: string[];
  startDate: string;
  endDate: string;
  initialCapital: number;
  rebalanceFrequency: 'daily' | 'weekly' | 'monthly';
  regimeLookback: number;
  taxRate: { shortTerm: number; longTerm: number };
}

interface BacktestSnapshot {
  date: string;
  portfolioValue: number;
  dailyReturn: number;
  regime: string;
  turbulenceIndex: number;
  weights: Record<string, number>;
  turnover: number;
  taxPaid: number;
}

interface PerformanceMetrics {
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

interface RegimeMetrics {
  regime: string;
  daysInRegime: number;
  averageReturn: number;
  volatility: number;
}

interface BacktestResult {
  snapshots: BacktestSnapshot[];
  metrics: PerformanceMetrics;
  regimeBreakdown: RegimeMetrics[];
}

interface HistoricalDataPoint {
  date: string;
  price: number;
  volume?: number;
}

interface TaxLot {
  ticker: string;
  shares: number;
  costBasis: number;
  purchaseDate: string;
}

const RISK_FREE_RATE = 0.05;

// Utility functions
function yearsBetween(start: Date | string, end: Date | string): number {
  const s = typeof start === 'string' ? new Date(start) : start;
  const e = typeof end === 'string' ? new Date(end) : end;
  return (e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
}

function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function calculateCAGR(initialValue: number, finalValue: number, years: number): number {
  if (years <= 0 || initialValue <= 0) return 0;
  return Math.pow(finalValue / initialValue, 1 / years) - 1;
}

function calculateSharpeRatio(returns: number[], riskFreeRate: number): number {
  if (returns.length < 2) return 0;
  const excessReturns = returns.map(r => r - riskFreeRate / 252);
  const mean = excessReturns.reduce((a, b) => a + b, 0) / excessReturns.length;
  const std = standardDeviation(excessReturns);
  return std > 0 ? (mean * 252) / (std * Math.sqrt(252)) : 0;
}

function calculateSortinoRatio(returns: number[], riskFreeRate: number): number {
  if (returns.length < 2) return 0;
  const targetReturn = riskFreeRate / 252;
  const excessReturns = returns.map(r => r - targetReturn);
  const meanExcess = excessReturns.reduce((a, b) => a + b, 0) / excessReturns.length;
  const downsideReturns = excessReturns.filter(r => r < 0);
  if (downsideReturns.length === 0) return meanExcess > 0 ? Infinity : 0;
  const downsideDeviation = Math.sqrt(downsideReturns.reduce((sum, r) => sum + r * r, 0) / downsideReturns.length);
  return downsideDeviation > 0 ? (meanExcess * 252) / (downsideDeviation * Math.sqrt(252)) : 0;
}

function calculateMaxDrawdown(values: number[]): { maxDrawdownPercent: number; peakIndex: number; troughIndex: number } {
  if (values.length < 2) return { maxDrawdownPercent: 0, peakIndex: 0, troughIndex: 0 };
  let peak = values[0];
  let peakIndex = 0;
  let maxDD = 0;
  let maxDDPeakIdx = 0;
  let maxDDTroughIdx = 0;
  
  for (let i = 1; i < values.length; i++) {
    if (values[i] > peak) {
      peak = values[i];
      peakIndex = i;
    }
    const dd = (peak - values[i]) / peak;
    if (dd > maxDD) {
      maxDD = dd;
      maxDDPeakIdx = peakIndex;
      maxDDTroughIdx = i;
    }
  }
  return { maxDrawdownPercent: maxDD * 100, peakIndex: maxDDPeakIdx, troughIndex: maxDDTroughIdx };
}

function calculateCalmarRatio(cagr: number, maxDrawdownPercent: number): number {
  return maxDrawdownPercent > 0 ? cagr / (maxDrawdownPercent / 100) : 0;
}

// Backtest Engine Class
class BacktestEngine {
  private config: BacktestConfig;
  private assetData: Map<string, HistoricalDataPoint[]> = new Map();
  private portfolioValue: number;
  private currentWeights: Map<string, number> = new Map();
  private taxLots: TaxLot[] = [];
  private currentPrices: Map<string, number> = new Map();
  private shares: Map<string, number> = new Map();
  private cash: number;

  constructor(config: BacktestConfig) {
    this.config = config;
    this.portfolioValue = config.initialCapital;
    this.cash = config.initialCapital;
  }

  async runBacktest(historicalData: Record<string, HistoricalDataPoint[]>): Promise<BacktestResult> {
    const { tickers, initialCapital } = this.config;

    // Load historical data
    for (const ticker of tickers) {
      if (historicalData[ticker] && historicalData[ticker].length > 0) {
        this.assetData.set(ticker, historicalData[ticker]);
      }
    }

    const activeTickers = tickers.filter(t => this.assetData.has(t) && this.assetData.get(t)!.length > 0);
    if (activeTickers.length === 0) {
      throw new Error('No valid data for any tickers');
    }

    const allDates = this.getUniqueDates(activeTickers);

    // Initialize weights
    const initialWeight = 1 / activeTickers.length;
    activeTickers.forEach(ticker => {
      this.currentWeights.set(ticker, initialWeight);
      this.shares.set(ticker, 0);
    });

    this.updatePrices(allDates[0], activeTickers);

    // Initial purchase
    activeTickers.forEach(ticker => {
      const price = this.currentPrices.get(ticker) || 0;
      if (price > 0) {
        const allocation = initialCapital * initialWeight;
        const numShares = Math.floor(allocation / price);
        this.shares.set(ticker, numShares);
        this.cash -= numShares * price;
        this.taxLots.push({
          ticker,
          shares: numShares,
          costBasis: price,
          purchaseDate: allDates[0]
        });
      }
    });

    const snapshots: BacktestSnapshot[] = [];
    let lastRebalanceDate = allDates[0];
    let previousValue = initialCapital;
    let currentRegime = { regime: 'normal', turbulenceIndex: 10, volatility: 15 };
    let totalTurnover = 0;
    let totalTaxPaid = 0;

    for (let i = 1; i < allDates.length; i++) {
      const date = allDates[i];
      this.updatePrices(date, activeTickers);
      this.portfolioValue = this.calculatePortfolioValue(activeTickers);
      const dailyReturn = previousValue > 0 ? (this.portfolioValue - previousValue) / previousValue : 0;

      if (this.shouldRebalance(date, lastRebalanceDate)) {
        const lookbackStart = Math.max(0, i - 252);
        currentRegime = this.calculateRegimeSignal(activeTickers, allDates.slice(Math.max(0, i - 60), i));
        
        // Compute optimal weights using regime-adaptive allocation
        const optimalWeights = this.computeOptimalWeights(activeTickers, currentRegime);

        const { turnover, taxPaid } = this.executeRebalance(optimalWeights, date, activeTickers);
        totalTurnover += turnover;
        totalTaxPaid += taxPaid;
        lastRebalanceDate = date;
      }

      snapshots.push({
        date,
        portfolioValue: this.portfolioValue,
        dailyReturn,
        regime: currentRegime.regime,
        turbulenceIndex: currentRegime.turbulenceIndex,
        weights: Object.fromEntries(this.currentWeights),
        turnover: 0,
        taxPaid: 0
      });

      previousValue = this.portfolioValue;
    }

    const metrics = this.calculatePerformanceMetrics(snapshots, totalTurnover, totalTaxPaid);
    const regimeBreakdown = this.calculateRegimeBreakdown(snapshots);

    return { snapshots, metrics, regimeBreakdown };
  }

  private getUniqueDates(tickers: string[]): string[] {
    const dateSet = new Set<string>();
    tickers.forEach(ticker => {
      const data = this.assetData.get(ticker);
      if (data) data.forEach(d => dateSet.add(d.date));
    });
    const commonDates = Array.from(dateSet).filter(date =>
      tickers.every(ticker => {
        const data = this.assetData.get(ticker);
        return data?.some(d => d.date === date);
      })
    );
    return commonDates.sort();
  }

  private updatePrices(date: string, tickers: string[]): void {
    tickers.forEach(ticker => {
      const data = this.assetData.get(ticker);
      const point = data?.find(d => d.date === date);
      if (point) this.currentPrices.set(ticker, point.price);
    });
  }

  private calculatePortfolioValue(tickers: string[]): number {
    let value = this.cash;
    tickers.forEach(ticker => {
      const shares = this.shares.get(ticker) || 0;
      const price = this.currentPrices.get(ticker) || 0;
      value += shares * price;
    });
    return value;
  }

  private shouldRebalance(currentDate: string, lastRebalanceDate: string): boolean {
    const current = new Date(currentDate);
    const last = new Date(lastRebalanceDate);
    const daysDiff = Math.floor((current.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
    switch (this.config.rebalanceFrequency) {
      case 'daily': return daysDiff >= 1;
      case 'weekly': return daysDiff >= 7;
      case 'monthly': return daysDiff >= 21;
      default: return daysDiff >= 21;
    }
  }

  private computeOptimalWeights(tickers: string[], regime: { regime: string; turbulenceIndex: number; volatility: number }): Map<string, number> {
    const weights = new Map<string, number>();
    const n = tickers.length;
    
    // Regime-adaptive equal weight with volatility adjustment
    const baseWeight = 1 / n;
    const volatilityMultiplier = regime.regime === 'crisis' ? 0.7 : regime.regime === 'high_vol' ? 0.85 : 1;
    
    tickers.forEach(ticker => {
      weights.set(ticker, baseWeight * volatilityMultiplier);
    });
    
    // Allocate remaining to cash (implicit)
    return weights;
  }

  private executeRebalance(targetWeights: Map<string, number>, date: string, tickers: string[]): { turnover: number; taxPaid: number } {
    const totalValue = this.calculatePortfolioValue(tickers);
    let turnover = 0;
    let taxPaid = 0;

    const targetPositions = new Map<string, number>();
    tickers.forEach(ticker => {
      const weight = targetWeights.get(ticker) || 0;
      const targetValue = totalValue * weight;
      const price = this.currentPrices.get(ticker) || 0;
      const targetShares = price > 0 ? Math.floor(targetValue / price) : 0;
      targetPositions.set(ticker, targetShares);
    });

    tickers.forEach(ticker => {
      const currentShares = this.shares.get(ticker) || 0;
      const targetShares = targetPositions.get(ticker) || 0;
      const price = this.currentPrices.get(ticker) || 0;
      const shareDiff = targetShares - currentShares;

      if (shareDiff !== 0 && price > 0) {
        const tradeValue = Math.abs(shareDiff) * price;
        turnover += tradeValue / totalValue;

        if (shareDiff < 0) {
          const sellShares = Math.abs(shareDiff);
          taxPaid += this.calculateTaxOnSale(ticker, sellShares, price, date);
          this.cash += sellShares * price;
        } else {
          this.cash -= shareDiff * price;
          this.taxLots.push({ ticker, shares: shareDiff, costBasis: price, purchaseDate: date });
        }

        this.shares.set(ticker, targetShares);
      }
    });

    tickers.forEach(ticker => {
      const shares = this.shares.get(ticker) || 0;
      const price = this.currentPrices.get(ticker) || 0;
      const weight = totalValue > 0 ? (shares * price) / totalValue : 0;
      this.currentWeights.set(ticker, weight);
    });

    return { turnover, taxPaid };
  }

  private calculateTaxOnSale(ticker: string, sharesToSell: number, currentPrice: number, saleDate: string): number {
    const saleDateObj = new Date(saleDate);
    const tickerLots = this.taxLots
      .filter(lot => lot.ticker === ticker && lot.shares > 0)
      .sort((a, b) => new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime());

    const oneYearAgo = new Date(saleDateObj.getTime() - 365 * 24 * 60 * 60 * 1000);
    let remaining = sharesToSell;
    let totalTax = 0;

    for (const lot of tickerLots) {
      if (remaining <= 0) break;
      const sharesToSellFromLot = Math.min(remaining, lot.shares);
      const gain = (currentPrice - lot.costBasis) * sharesToSellFromLot;
      if (gain > 0) {
        const isLongTerm = new Date(lot.purchaseDate) < oneYearAgo;
        const rate = isLongTerm ? this.config.taxRate.longTerm : this.config.taxRate.shortTerm;
        totalTax += gain * rate;
      }
      lot.shares -= sharesToSellFromLot;
      remaining -= sharesToSellFromLot;
    }

    return totalTax;
  }

  private calculateRegimeSignal(tickers: string[], dates: string[]): { regime: string; turbulenceIndex: number; volatility: number } {
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
      if (count > 0) returns.push(dayReturn / count);
    }

    if (returns.length < 10) {
      return { regime: 'normal', turbulenceIndex: 10, volatility: 15 };
    }

    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance) * Math.sqrt(252) * 100;

    const recentReturns = returns.slice(-5);
    const recentVolatility = Math.sqrt(
      recentReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / recentReturns.length
    ) * Math.sqrt(252) * 100;

    const turbulenceIndex = recentVolatility / Math.max(volatility, 1) * 10;

    let regime: string;
    if (turbulenceIndex > 25) regime = 'crisis';
    else if (turbulenceIndex > 15) regime = 'high_vol';
    else if (turbulenceIndex > 8) regime = 'normal';
    else regime = 'low_vol';

    return { regime, turbulenceIndex: parseFloat(turbulenceIndex.toFixed(2)), volatility: parseFloat(volatility.toFixed(2)) };
  }

  private calculatePerformanceMetrics(snapshots: BacktestSnapshot[], totalTurnover: number, totalTaxPaid: number): PerformanceMetrics {
    if (snapshots.length < 2) {
      return { totalReturn: 0, cagr: 0, volatility: 0, sharpeRatio: 0, sortinoRatio: 0, maxDrawdown: 0, calmarRatio: 0, totalTurnover: 0, totalTaxPaid: 0, afterTaxReturn: 0 };
    }

    const initialValue = this.config.initialCapital;
    const finalValue = snapshots[snapshots.length - 1].portfolioValue;
    const totalReturn = (finalValue - initialValue) / initialValue;

    const startDate = snapshots[0].date;
    const endDate = snapshots[snapshots.length - 1].date;
    const years = yearsBetween(startDate, endDate);
    const cagr = calculateCAGR(initialValue, finalValue, years);

    const returns = snapshots.map(s => s.dailyReturn);
    const volatility = standardDeviation(returns) * Math.sqrt(252);
    const sharpeRatio = calculateSharpeRatio(returns, RISK_FREE_RATE);
    const sortinoRatio = calculateSortinoRatio(returns, RISK_FREE_RATE);

    const portfolioValues = snapshots.map(s => s.portfolioValue);
    const { maxDrawdownPercent } = calculateMaxDrawdown(portfolioValues);
    const maxDrawdown = maxDrawdownPercent / 100;
    const calmarRatio = calculateCalmarRatio(cagr, maxDrawdownPercent);

    const afterTaxReturn = (finalValue - initialValue - totalTaxPaid) / initialValue;

    return { totalReturn, cagr, volatility, sharpeRatio, sortinoRatio, maxDrawdown, calmarRatio, totalTurnover, totalTaxPaid, afterTaxReturn };
  }

  private calculateRegimeBreakdown(snapshots: BacktestSnapshot[]): RegimeMetrics[] {
    const regimeData: Record<string, { returns: number[]; days: number }> = {};
    snapshots.forEach(s => {
      if (!regimeData[s.regime]) regimeData[s.regime] = { returns: [], days: 0 };
      regimeData[s.regime].returns.push(s.dailyReturn);
      regimeData[s.regime].days++;
    });

    return Object.entries(regimeData).map(([regime, data]) => {
      const avgReturn = data.returns.reduce((a, b) => a + b, 0) / data.returns.length * 252;
      const variance = data.returns.reduce((sum, r) => sum + Math.pow(r - avgReturn / 252, 2), 0) / data.returns.length;
      const volatility = Math.sqrt(variance) * Math.sqrt(252);
      return { regime, daysInRegime: data.days, averageReturn: avgReturn, volatility };
    });
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { config, historicalData } = await req.json();

    if (!config || !historicalData) {
      throw new Error('Missing config or historicalData');
    }

    const engine = new BacktestEngine(config);
    const result = await engine.runBacktest(historicalData);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error: unknown) {
    console.error('[backtest-engine] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
