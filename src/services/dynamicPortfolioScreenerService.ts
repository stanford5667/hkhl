/**
 * Dynamic Portfolio Screener Service
 * 
 * Discovers ALL tickers from the database, calculates metrics,
 * and generates ANY portfolio combination that meets user criteria.
 */

import { supabase } from '@/integrations/supabase/client';
import {
  calculateSharpeRatio,
  calculateSortinoRatio,
  calculateMaxDrawdown,
  calculateCAGR,
  annualizedVolatility,
  arithmeticMean,
  standardDeviation,
} from './portfolioMetricsService';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface TickerStats {
  ticker: string;
  name: string;
  category: string;
  dataPoints: number;
  dateRange: { start: string; end: string };
  metrics: {
    cagr: number;
    volatility: number;
    sharpe: number;
    sortino: number;
    maxDrawdown: number;
    avgDailyReturn: number;
  };
  dailyReturns: number[];
}

export interface PortfolioAllocation {
  ticker: string;
  weight: number;
  name: string;
}

export interface GeneratedPortfolio {
  id: string;
  name: string;
  description: string;
  allocations: PortfolioAllocation[];
  metrics: {
    cagr: number;
    volatility: number;
    sharpe: number;
    sortino: number;
    maxDrawdown: number;
  };
  riskLevel: 'conservative' | 'moderate' | 'growth' | 'aggressive';
  matchScore: number;
}

export interface ScreeningCriteria {
  maxDrawdown?: number;
  maxVolatility?: number;
  minSharpe?: number;
  minCagr?: number;
  minSortino?: number;
}

export interface GenerationConfig {
  minAssets: number;
  maxAssets: number;
  weightStep: number; // e.g., 10 means weights are 10%, 20%, etc.
  maxPortfolios: number;
  includeCategories?: string[];
  excludeCategories?: string[];
  requireDiversification?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TICKER METADATA - Categorization for known tickers
// ═══════════════════════════════════════════════════════════════════════════════

const TICKER_METADATA: Record<string, { name: string; category: string }> = {
  // Core US Equity ETFs
  SPY: { name: 'S&P 500', category: 'US Large Cap' },
  VOO: { name: 'S&P 500 (Vanguard)', category: 'US Large Cap' },
  VTI: { name: 'Total US Market', category: 'US Total Market' },
  QQQ: { name: 'NASDAQ 100', category: 'US Large Cap Growth' },
  DIA: { name: 'Dow Jones', category: 'US Large Cap' },
  IWM: { name: 'Russell 2000', category: 'US Small Cap' },
  IWF: { name: 'Russell 1000 Growth', category: 'US Large Cap Growth' },
  IWD: { name: 'Russell 1000 Value', category: 'US Large Cap Value' },
  SPYG: { name: 'S&P 500 Growth', category: 'US Large Cap Growth' },
  SPYV: { name: 'S&P 500 Value', category: 'US Large Cap Value' },
  SPLV: { name: 'S&P 500 Low Vol', category: 'US Low Volatility' },
  SPHD: { name: 'S&P 500 High Dividend Low Vol', category: 'US Low Volatility' },
  
  // International Equity
  EFA: { name: 'Developed Markets', category: 'International Developed' },
  VEA: { name: 'Developed Markets (Vanguard)', category: 'International Developed' },
  VWO: { name: 'Emerging Markets (Vanguard)', category: 'Emerging Markets' },
  EEM: { name: 'Emerging Markets (iShares)', category: 'Emerging Markets' },
  IEMG: { name: 'Emerging Markets Core', category: 'Emerging Markets' },
  VGK: { name: 'European Stocks', category: 'International - Europe' },
  EWJ: { name: 'Japan Stocks', category: 'International - Japan' },
  FXI: { name: 'China Large Cap', category: 'International - China' },
  
  // Sector ETFs
  XLK: { name: 'Technology Select', category: 'Sector - Tech' },
  XLF: { name: 'Financials Select', category: 'Sector - Financials' },
  XLE: { name: 'Energy Select', category: 'Sector - Energy' },
  XLV: { name: 'Healthcare Select', category: 'Sector - Healthcare' },
  XLI: { name: 'Industrials Select', category: 'Sector - Industrials' },
  XLP: { name: 'Consumer Staples', category: 'Sector - Staples' },
  XLU: { name: 'Utilities Select', category: 'Sector - Utilities' },
  XLY: { name: 'Consumer Discretionary', category: 'Sector - Discretionary' },
  XLB: { name: 'Materials Select', category: 'Sector - Materials' },
  XLRE: { name: 'Real Estate Select', category: 'Sector - Real Estate' },
  XLC: { name: 'Communication Services', category: 'Sector - Communication' },
  
  // Thematic/Factor ETFs
  MTUM: { name: 'Momentum Factor', category: 'Factor - Momentum' },
  QUAL: { name: 'Quality Factor', category: 'Factor - Quality' },
  USMV: { name: 'Minimum Volatility', category: 'Factor - Low Vol' },
  SIZE: { name: 'Size Factor', category: 'Factor - Size' },
  VLUE: { name: 'Value Factor', category: 'Factor - Value' },
  
  // Dividend ETFs
  SCHD: { name: 'Schwab US Dividend', category: 'Dividend Growth' },
  VIG: { name: 'Dividend Appreciation', category: 'Dividend Growth' },
  VYM: { name: 'High Dividend Yield', category: 'High Dividend' },
  DVY: { name: 'Dividend Select', category: 'High Dividend' },
  HDV: { name: 'High Dividend', category: 'High Dividend' },
  DGRO: { name: 'Dividend Growth', category: 'Dividend Growth' },
  
  // Fixed Income
  AGG: { name: 'Aggregate Bond', category: 'Bonds - Core' },
  BND: { name: 'Total Bond Market', category: 'Bonds - Core' },
  TLT: { name: 'Long Treasury 20Y+', category: 'Bonds - Long Treasury' },
  IEF: { name: 'Treasury 7-10Y', category: 'Bonds - Intermediate Treasury' },
  SHY: { name: 'Treasury 1-3Y', category: 'Bonds - Short Treasury' },
  GOVT: { name: 'Treasury Bond', category: 'Bonds - Treasury' },
  LQD: { name: 'Investment Grade Corporate', category: 'Bonds - Corporate IG' },
  HYG: { name: 'High Yield Corporate', category: 'Bonds - Corporate HY' },
  JNK: { name: 'High Yield Bonds', category: 'Bonds - Corporate HY' },
  TIP: { name: 'TIPS', category: 'Bonds - TIPS' },
  EMB: { name: 'Emerging Markets Bonds', category: 'Bonds - EM' },
  MUB: { name: 'Municipal Bonds', category: 'Bonds - Muni' },
  VCSH: { name: 'Short-Term Corp Bond', category: 'Bonds - Short Term' },
  VCIT: { name: 'Intermediate Corp Bond', category: 'Bonds - Corporate IG' },
  
  // Commodities
  GLD: { name: 'Gold', category: 'Commodities - Gold' },
  SLV: { name: 'Silver', category: 'Commodities - Silver' },
  DBC: { name: 'Commodities Basket', category: 'Commodities - Broad' },
  USO: { name: 'Oil', category: 'Commodities - Oil' },
  UNG: { name: 'Natural Gas', category: 'Commodities - NatGas' },
  PDBC: { name: 'Commodities Broad', category: 'Commodities - Broad' },
  
  // Real Estate
  VNQ: { name: 'Real Estate (Vanguard)', category: 'Real Estate - REITs' },
  IYR: { name: 'Real Estate (iShares)', category: 'Real Estate - REITs' },
  
  // Crypto
  BITO: { name: 'Bitcoin Strategy', category: 'Crypto - Bitcoin' },
  GBTC: { name: 'Bitcoin Trust', category: 'Crypto - Bitcoin' },
  ETHE: { name: 'Ethereum Trust', category: 'Crypto - Ethereum' },
  
  // Individual Stocks (commonly held)
  AAPL: { name: 'Apple', category: 'Stock - Tech' },
  MSFT: { name: 'Microsoft', category: 'Stock - Tech' },
  GOOGL: { name: 'Alphabet', category: 'Stock - Tech' },
  AMZN: { name: 'Amazon', category: 'Stock - Tech' },
  META: { name: 'Meta', category: 'Stock - Tech' },
  NVDA: { name: 'NVIDIA', category: 'Stock - Semiconductors' },
  TSLA: { name: 'Tesla', category: 'Stock - Auto' },
  BRK: { name: 'Berkshire Hathaway', category: 'Stock - Conglomerate' },
  JPM: { name: 'JPMorgan', category: 'Stock - Financial' },
  V: { name: 'Visa', category: 'Stock - Financial' },
  JNJ: { name: 'Johnson & Johnson', category: 'Stock - Healthcare' },
  UNH: { name: 'UnitedHealth', category: 'Stock - Healthcare' },
  HD: { name: 'Home Depot', category: 'Stock - Retail' },
  PG: { name: 'Procter & Gamble', category: 'Stock - Consumer' },
  KO: { name: 'Coca-Cola', category: 'Stock - Consumer' },
  DIS: { name: 'Disney', category: 'Stock - Entertainment' },
  INTC: { name: 'Intel', category: 'Stock - Semiconductors' },
  AMD: { name: 'AMD', category: 'Stock - Semiconductors' },
  AMAT: { name: 'Applied Materials', category: 'Stock - Semiconductors' },
};

// ═══════════════════════════════════════════════════════════════════════════════
// DATA FETCHING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Discover all tickers available in the database with sufficient data
 */
export async function discoverAvailableTickers(minDataPoints: number = 200): Promise<string[]> {
  const { data, error } = await supabase
    .from('market_daily_bars')
    .select('ticker')
    .order('ticker');
  
  if (error) throw error;
  
  // Count data points per ticker
  const tickerCounts: Record<string, number> = {};
  for (const row of (data || [])) {
    tickerCounts[row.ticker] = (tickerCounts[row.ticker] || 0) + 1;
  }
  
  // Filter by minimum data points
  return Object.entries(tickerCounts)
    .filter(([_, count]) => count >= minDataPoints)
    .map(([ticker]) => ticker)
    .sort();
}

/**
 * Fetch all available tickers with their data point counts
 */
export async function fetchTickerCounts(): Promise<{ ticker: string; count: number }[]> {
  // Use a simple aggregation query
  const { data, error } = await supabase
    .from('market_daily_bars')
    .select('ticker');
  
  if (error) throw error;
  
  const counts: Record<string, number> = {};
  for (const row of (data || [])) {
    counts[row.ticker] = (counts[row.ticker] || 0) + 1;
  }
  
  return Object.entries(counts)
    .map(([ticker, count]) => ({ ticker, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Fetch daily return data for specified tickers
 */
export async function fetchTickerData(
  tickers: string[],
  lookbackYears: number = 1
): Promise<Record<string, { date: string; return: number }[]>> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setFullYear(endDate.getFullYear() - lookbackYears);
  
  const startStr = startDate.toISOString().split('T')[0];
  const endStr = endDate.toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('market_daily_bars')
    .select('ticker, bar_date, close, daily_return')
    .in('ticker', tickers)
    .gte('bar_date', startStr)
    .lte('bar_date', endStr)
    .order('bar_date', { ascending: true });
  
  if (error) throw error;
  
  const result: Record<string, { date: string; return: number }[]> = {};
  for (const row of (data || [])) {
    if (!result[row.ticker]) result[row.ticker] = [];
    result[row.ticker].push({
      date: row.bar_date,
      return: row.daily_return || 0,
    });
  }
  
  return result;
}

/**
 * Calculate individual ticker statistics
 */
export function calculateTickerStats(
  ticker: string,
  returns: { date: string; return: number }[]
): TickerStats {
  const dailyReturns = returns.map(r => r.return);
  const dates = returns.map(r => r.date);
  
  // Calculate portfolio values for drawdown
  const values: number[] = [100000];
  for (const r of dailyReturns) {
    values.push(values[values.length - 1] * (1 + r));
  }
  
  const years = dailyReturns.length / 252;
  const cagr = calculateCAGR(100000, values[values.length - 1], years) * 100;
  const volatility = annualizedVolatility(dailyReturns) * 100;
  const sharpe = calculateSharpeRatio(dailyReturns, 0.05);
  const sortino = calculateSortinoRatio(dailyReturns, 0.05);
  const { maxDrawdownPercent } = calculateMaxDrawdown(values);
  
  const meta = TICKER_METADATA[ticker] || { name: ticker, category: 'Unknown' };
  
  return {
    ticker,
    name: meta.name,
    category: meta.category,
    dataPoints: dailyReturns.length,
    dateRange: { start: dates[0] || '', end: dates[dates.length - 1] || '' },
    metrics: {
      cagr: Math.round(cagr * 100) / 100,
      volatility: Math.round(volatility * 100) / 100,
      sharpe: Math.round(sharpe * 100) / 100,
      sortino: Math.round(sortino * 100) / 100,
      maxDrawdown: Math.round(maxDrawdownPercent * 100) / 100,
      avgDailyReturn: arithmeticMean(dailyReturns),
    },
    dailyReturns,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PORTFOLIO GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate portfolio combinations from available tickers
 */
export function* generatePortfolioCombinations(
  tickerStats: TickerStats[],
  config: GenerationConfig
): Generator<PortfolioAllocation[]> {
  const { minAssets, maxAssets, weightStep } = config;
  const tickers = tickerStats.map(t => t.ticker);
  
  // Generate all combinations of tickers
  for (let numAssets = minAssets; numAssets <= Math.min(maxAssets, tickers.length); numAssets++) {
    const tickerCombinations = getCombinations(tickers, numAssets);
    
    for (const tickerCombo of tickerCombinations) {
      // Generate weight combinations that sum to 100
      const weightCombinations = getWeightCombinations(numAssets, weightStep);
      
      for (const weights of weightCombinations) {
        const allocations: PortfolioAllocation[] = tickerCombo.map((ticker, i) => {
          const meta = TICKER_METADATA[ticker] || { name: ticker };
          return { ticker, weight: weights[i], name: meta.name };
        });
        
        yield allocations;
      }
    }
  }
}

/**
 * Get all k-combinations of an array
 */
function getCombinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  
  const result: T[][] = [];
  
  function backtrack(start: number, current: T[]) {
    if (current.length === k) {
      result.push([...current]);
      return;
    }
    
    for (let i = start; i < arr.length; i++) {
      current.push(arr[i]);
      backtrack(i + 1, current);
      current.pop();
    }
  }
  
  backtrack(0, []);
  return result;
}

/**
 * Get all weight combinations that sum to 100
 */
function getWeightCombinations(numAssets: number, step: number): number[][] {
  const result: number[][] = [];
  const minWeight = step; // Minimum weight per asset
  
  function backtrack(remaining: number, current: number[], depth: number) {
    if (depth === numAssets - 1) {
      if (remaining >= minWeight) {
        result.push([...current, remaining]);
      }
      return;
    }
    
    const maxWeight = remaining - (numAssets - depth - 1) * minWeight;
    for (let w = minWeight; w <= maxWeight; w += step) {
      current.push(w);
      backtrack(remaining - w, current, depth + 1);
      current.pop();
    }
  }
  
  backtrack(100, [], 0);
  return result;
}

/**
 * Calculate portfolio metrics from allocations (simplified estimation)
 */
export function calculatePortfolioMetrics(
  allocations: PortfolioAllocation[],
  tickerStatsMap: Map<string, TickerStats>
): GeneratedPortfolio['metrics'] | null {
  const stats = allocations.map(a => ({
    ...a,
    stats: tickerStatsMap.get(a.ticker),
  })).filter(a => a.stats);
  
  if (stats.length !== allocations.length) return null;
  
  // Weighted average returns (approximation)
  let portfolioCagr = 0;
  let portfolioVolSquared = 0;
  
  for (const { weight, stats: s } of stats) {
    const w = weight / 100;
    portfolioCagr += w * s!.metrics.cagr;
    portfolioVolSquared += (w * s!.metrics.volatility) ** 2;
  }
  
  // Add correlation adjustment (simplified - assumes 0.5 avg correlation)
  const avgCorrelation = 0.5;
  let crossTerms = 0;
  for (let i = 0; i < stats.length; i++) {
    for (let j = i + 1; j < stats.length; j++) {
      const wi = stats[i].weight / 100;
      const wj = stats[j].weight / 100;
      const volI = stats[i].stats!.metrics.volatility;
      const volJ = stats[j].stats!.metrics.volatility;
      crossTerms += 2 * wi * wj * volI * volJ * avgCorrelation;
    }
  }
  
  const portfolioVol = Math.sqrt(portfolioVolSquared + crossTerms);
  
  // Estimate Sharpe (simplified)
  const riskFreeRate = 5; // 5%
  const portfolioSharpe = portfolioVol > 0 ? (portfolioCagr - riskFreeRate) / portfolioVol : 0;
  
  // Estimate max drawdown (weighted average - simplified)
  let portfolioMaxDD = 0;
  for (const { weight, stats: s } of stats) {
    portfolioMaxDD += (weight / 100) * s!.metrics.maxDrawdown;
  }
  // Diversification reduces drawdown somewhat
  portfolioMaxDD *= 0.85;
  
  // Estimate Sortino (simplified)
  const portfolioSortino = portfolioSharpe * 1.3;
  
  return {
    cagr: Math.round(portfolioCagr * 100) / 100,
    volatility: Math.round(portfolioVol * 100) / 100,
    sharpe: Math.round(portfolioSharpe * 100) / 100,
    sortino: Math.round(portfolioSortino * 100) / 100,
    maxDrawdown: Math.round(portfolioMaxDD * 100) / 100,
  };
}

/**
 * Calculate EXACT portfolio metrics using aligned daily returns
 */
export function calculateExactPortfolioMetrics(
  allocations: PortfolioAllocation[],
  tickerData: Record<string, { date: string; return: number }[]>
): GeneratedPortfolio['metrics'] | null {
  // Find common dates
  const dateSets = allocations.map(a => new Set(
    (tickerData[a.ticker] || []).map(d => d.date)
  ));
  
  if (dateSets.some(s => s.size === 0)) return null;
  
  const commonDates = [...dateSets[0]].filter(date =>
    dateSets.every(s => s.has(date))
  ).sort();
  
  if (commonDates.length < 50) return null;
  
  // Calculate weighted portfolio returns
  const portfolioReturns: number[] = [];
  const portfolioValues: number[] = [100000];
  
  for (const date of commonDates) {
    let dayReturn = 0;
    for (const alloc of allocations) {
      const dayData = tickerData[alloc.ticker]?.find(d => d.date === date);
      if (dayData) {
        dayReturn += (alloc.weight / 100) * dayData.return;
      }
    }
    portfolioReturns.push(dayReturn);
    portfolioValues.push(portfolioValues[portfolioValues.length - 1] * (1 + dayReturn));
  }
  
  // Calculate exact metrics
  const years = commonDates.length / 252;
  const cagr = calculateCAGR(100000, portfolioValues[portfolioValues.length - 1], years) * 100;
  const volatility = annualizedVolatility(portfolioReturns) * 100;
  const sharpe = calculateSharpeRatio(portfolioReturns, 0.05);
  const sortino = calculateSortinoRatio(portfolioReturns, 0.05);
  const { maxDrawdownPercent } = calculateMaxDrawdown(portfolioValues);
  
  return {
    cagr: Math.round(cagr * 100) / 100,
    volatility: Math.round(volatility * 100) / 100,
    sharpe: Math.round(sharpe * 100) / 100,
    sortino: Math.round(sortino * 100) / 100,
    maxDrawdown: Math.round(maxDrawdownPercent * 100) / 100,
  };
}

/**
 * Determine risk level from metrics
 */
function getRiskLevel(metrics: GeneratedPortfolio['metrics']): GeneratedPortfolio['riskLevel'] {
  if (metrics.volatility < 10 && metrics.maxDrawdown < 15) return 'conservative';
  if (metrics.volatility < 15 && metrics.maxDrawdown < 25) return 'moderate';
  if (metrics.volatility < 22 && metrics.maxDrawdown < 35) return 'growth';
  return 'aggressive';
}

/**
 * Generate portfolio name from allocations
 */
function generatePortfolioName(allocations: PortfolioAllocation[]): string {
  if (allocations.length === 1) return allocations[0].name;
  
  // Find dominant categories
  const categoryWeights: Record<string, number> = {};
  for (const a of allocations) {
    const meta = TICKER_METADATA[a.ticker];
    const category = meta?.category || 'Mixed';
    const baseCategory = category.split(' - ')[0];
    categoryWeights[baseCategory] = (categoryWeights[baseCategory] || 0) + a.weight;
  }
  
  const sorted = Object.entries(categoryWeights).sort((a, b) => b[1] - a[1]);
  const top1 = sorted[0]?.[0] || 'Mixed';
  const top2 = sorted[1]?.[0];
  
  if (sorted[0][1] >= 60) return `${top1} Focus`;
  if (top2) return `${top1}/${top2} Blend`;
  return 'Diversified Mix';
}

/**
 * Generate portfolio description from metrics
 */
function generatePortfolioDescription(
  allocations: PortfolioAllocation[],
  metrics: GeneratedPortfolio['metrics']
): string {
  const parts: string[] = [];
  
  if (metrics.sharpe > 0.8) parts.push('High risk-adjusted returns');
  else if (metrics.sharpe > 0.5) parts.push('Solid risk-adjusted returns');
  
  if (metrics.maxDrawdown < 15) parts.push('low drawdown');
  else if (metrics.maxDrawdown > 30) parts.push('higher volatility');
  
  if (metrics.cagr > 10) parts.push('strong growth');
  else if (metrics.cagr > 5) parts.push('moderate growth');
  
  const tickers = allocations.slice(0, 3).map(a => a.ticker).join(', ');
  const more = allocations.length > 3 ? ` +${allocations.length - 3} more` : '';
  
  return `${parts.join(', ')} (${tickers}${more})`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SCREENING FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

export interface ScreeningResult {
  portfolios: GeneratedPortfolio[];
  tickerStats: TickerStats[];
  totalGenerated: number;
  totalMatched: number;
  screeningTime: number;
}

export interface ScreeningProgress {
  phase: 'fetching' | 'calculating' | 'generating' | 'filtering' | 'complete';
  current: number;
  total: number;
  message: string;
}

/**
 * Screen all possible portfolios against criteria
 * Uses a callback for progress updates
 */
export async function screenAllPortfolios(
  criteria: ScreeningCriteria,
  config: GenerationConfig,
  lookbackYears: number = 1,
  onProgress?: (progress: ScreeningProgress) => void
): Promise<ScreeningResult> {
  const startTime = Date.now();
  
  // Phase 1: Fetch available tickers
  onProgress?.({ phase: 'fetching', current: 0, total: 100, message: 'Discovering available tickers...' });
  
  const tickerCounts = await fetchTickerCounts();
  const validTickers = tickerCounts
    .filter(t => t.count >= 200) // At least 200 data points (~1 year)
    .slice(0, 50) // Limit to top 50 tickers to keep generation manageable
    .map(t => t.ticker);
  
  onProgress?.({ phase: 'fetching', current: 50, total: 100, message: `Found ${validTickers.length} tickers with sufficient data` });
  
  // Phase 2: Fetch data for all tickers
  const tickerData = await fetchTickerData(validTickers, lookbackYears);
  
  onProgress?.({ phase: 'calculating', current: 0, total: validTickers.length, message: 'Calculating individual ticker metrics...' });
  
  // Phase 3: Calculate individual ticker stats
  const tickerStats: TickerStats[] = [];
  const tickerStatsMap = new Map<string, TickerStats>();
  
  for (let i = 0; i < validTickers.length; i++) {
    const ticker = validTickers[i];
    const data = tickerData[ticker];
    if (data && data.length >= 50) {
      const stats = calculateTickerStats(ticker, data);
      tickerStats.push(stats);
      tickerStatsMap.set(ticker, stats);
    }
    
    if (i % 10 === 0) {
      onProgress?.({ 
        phase: 'calculating', 
        current: i, 
        total: validTickers.length, 
        message: `Calculated ${i}/${validTickers.length} ticker metrics` 
      });
    }
  }
  
  // Phase 4: Generate and filter portfolios
  onProgress?.({ phase: 'generating', current: 0, total: 100, message: 'Generating portfolio combinations...' });
  
  const matchingPortfolios: GeneratedPortfolio[] = [];
  let totalGenerated = 0;
  let portfolioId = 0;
  
  // Limit generation to avoid excessive computation
  const maxToGenerate = config.maxPortfolios * 100; // Generate up to 100x the limit, filter down
  
  const generator = generatePortfolioCombinations(tickerStats, config);
  
  for (const allocations of generator) {
    if (totalGenerated >= maxToGenerate) break;
    totalGenerated++;
    
    // Calculate exact metrics using aligned data
    const metrics = calculateExactPortfolioMetrics(allocations, tickerData);
    if (!metrics) continue;
    
    // Check if meets criteria
    const meetsDrawdown = criteria.maxDrawdown === undefined || metrics.maxDrawdown <= criteria.maxDrawdown;
    const meetsVolatility = criteria.maxVolatility === undefined || metrics.volatility <= criteria.maxVolatility;
    const meetsSharpe = criteria.minSharpe === undefined || metrics.sharpe >= criteria.minSharpe;
    const meetsCagr = criteria.minCagr === undefined || metrics.cagr >= criteria.minCagr;
    const meetsSortino = criteria.minSortino === undefined || metrics.sortino >= criteria.minSortino;
    
    if (meetsDrawdown && meetsVolatility && meetsSharpe && meetsCagr && meetsSortino) {
      const portfolio: GeneratedPortfolio = {
        id: `gen-${portfolioId++}`,
        name: generatePortfolioName(allocations),
        description: generatePortfolioDescription(allocations, metrics),
        allocations,
        metrics,
        riskLevel: getRiskLevel(metrics),
        matchScore: calculateMatchScore(metrics, criteria),
      };
      
      matchingPortfolios.push(portfolio);
      
      if (matchingPortfolios.length >= config.maxPortfolios) break;
    }
    
    if (totalGenerated % 1000 === 0) {
      onProgress?.({ 
        phase: 'generating', 
        current: Math.min(totalGenerated / maxToGenerate * 100, 100), 
        total: 100, 
        message: `Generated ${totalGenerated} combinations, found ${matchingPortfolios.length} matches` 
      });
    }
  }
  
  // Sort by match score
  matchingPortfolios.sort((a, b) => b.matchScore - a.matchScore);
  
  onProgress?.({ phase: 'complete', current: 100, total: 100, message: 'Screening complete!' });
  
  return {
    portfolios: matchingPortfolios,
    tickerStats,
    totalGenerated,
    totalMatched: matchingPortfolios.length,
    screeningTime: Date.now() - startTime,
  };
}

/**
 * Calculate how well a portfolio matches the criteria
 */
function calculateMatchScore(
  metrics: GeneratedPortfolio['metrics'],
  criteria: ScreeningCriteria
): number {
  let score = 70; // Base score
  
  // Bonus for exceeding criteria
  if (criteria.maxDrawdown && metrics.maxDrawdown < criteria.maxDrawdown) {
    score += Math.min(10, (criteria.maxDrawdown - metrics.maxDrawdown) / 2);
  }
  if (criteria.maxVolatility && metrics.volatility < criteria.maxVolatility) {
    score += Math.min(10, (criteria.maxVolatility - metrics.volatility) / 2);
  }
  if (criteria.minSharpe && metrics.sharpe > criteria.minSharpe) {
    score += Math.min(10, (metrics.sharpe - criteria.minSharpe) * 10);
  }
  if (criteria.minCagr && metrics.cagr > criteria.minCagr) {
    score += Math.min(10, (metrics.cagr - criteria.minCagr) / 2);
  }
  
  return Math.min(100, Math.round(score));
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUICK SCREENING (Preset-based, faster)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Quick screen using preset portfolio templates
 * Much faster than full generation
 */
export async function quickScreenPortfolios(
  criteria: ScreeningCriteria,
  lookbackYears: number = 1,
  onProgress?: (progress: ScreeningProgress) => void
): Promise<ScreeningResult> {
  const startTime = Date.now();
  
  // Common portfolio templates
  const templates = generateCommonTemplates();
  
  onProgress?.({ phase: 'fetching', current: 0, total: 100, message: 'Loading portfolio templates...' });
  
  // Get all tickers used in templates
  const allTickers = [...new Set(templates.flatMap(t => t.allocations.map(a => a.ticker)))];
  
  onProgress?.({ phase: 'fetching', current: 50, total: 100, message: `Fetching data for ${allTickers.length} tickers...` });
  
  const tickerData = await fetchTickerData(allTickers, lookbackYears);
  
  onProgress?.({ phase: 'calculating', current: 0, total: templates.length, message: 'Calculating portfolio metrics...' });
  
  const results: GeneratedPortfolio[] = [];
  const tickerStats: TickerStats[] = [];
  
  // Calculate stats for all tickers
  for (const ticker of allTickers) {
    const data = tickerData[ticker];
    if (data && data.length >= 50) {
      tickerStats.push(calculateTickerStats(ticker, data));
    }
  }
  
  // Evaluate each template
  for (let i = 0; i < templates.length; i++) {
    const template = templates[i];
    const metrics = calculateExactPortfolioMetrics(template.allocations, tickerData);
    
    if (!metrics) continue;
    
    // Check criteria
    const meetsDrawdown = criteria.maxDrawdown === undefined || metrics.maxDrawdown <= criteria.maxDrawdown;
    const meetsVolatility = criteria.maxVolatility === undefined || metrics.volatility <= criteria.maxVolatility;
    const meetsSharpe = criteria.minSharpe === undefined || metrics.sharpe >= criteria.minSharpe;
    const meetsCagr = criteria.minCagr === undefined || metrics.cagr >= criteria.minCagr;
    
    if (meetsDrawdown && meetsVolatility && meetsSharpe && meetsCagr) {
      results.push({
        ...template,
        metrics,
        riskLevel: getRiskLevel(metrics),
        matchScore: calculateMatchScore(metrics, criteria),
      });
    }
    
    onProgress?.({ 
      phase: 'calculating', 
      current: i + 1, 
      total: templates.length, 
      message: `Evaluated ${i + 1}/${templates.length} templates` 
    });
  }
  
  results.sort((a, b) => b.matchScore - a.matchScore);
  
  onProgress?.({ phase: 'complete', current: 100, total: 100, message: 'Screening complete!' });
  
  return {
    portfolios: results,
    tickerStats,
    totalGenerated: templates.length,
    totalMatched: results.length,
    screeningTime: Date.now() - startTime,
  };
}

/**
 * Generate common portfolio templates
 */
function generateCommonTemplates(): Omit<GeneratedPortfolio, 'metrics' | 'riskLevel' | 'matchScore'>[] {
  return [
    // Conservative
    { id: 't1', name: 'Treasury Shield', description: 'Maximum safety with treasury focus', allocations: [
      { ticker: 'TLT', weight: 50, name: 'Long Treasury' },
      { ticker: 'IEF', weight: 30, name: 'Intermediate Treasury' },
      { ticker: 'SHY', weight: 20, name: 'Short Treasury' },
    ]},
    { id: 't2', name: 'Bond Core', description: 'Diversified bond allocation', allocations: [
      { ticker: 'AGG', weight: 60, name: 'Aggregate Bond' },
      { ticker: 'TLT', weight: 25, name: 'Long Treasury' },
      { ticker: 'GLD', weight: 15, name: 'Gold' },
    ]},
    { id: 't3', name: 'Capital Guard', description: 'Bond-heavy preservation', allocations: [
      { ticker: 'AGG', weight: 45, name: 'Aggregate Bond' },
      { ticker: 'TLT', weight: 25, name: 'Long Treasury' },
      { ticker: 'SPY', weight: 20, name: 'S&P 500' },
      { ticker: 'GLD', weight: 10, name: 'Gold' },
    ]},
    
    // Moderate
    { id: 't4', name: 'Classic 60/40', description: 'Traditional balanced allocation', allocations: [
      { ticker: 'SPY', weight: 40, name: 'S&P 500' },
      { ticker: 'VTI', weight: 20, name: 'Total Market' },
      { ticker: 'AGG', weight: 30, name: 'Aggregate Bond' },
      { ticker: 'GLD', weight: 10, name: 'Gold' },
    ]},
    { id: 't5', name: 'All Weather', description: 'Ray Dalio inspired balance', allocations: [
      { ticker: 'SPY', weight: 30, name: 'S&P 500' },
      { ticker: 'TLT', weight: 40, name: 'Long Treasury' },
      { ticker: 'GLD', weight: 15, name: 'Gold' },
      { ticker: 'DBC', weight: 15, name: 'Commodities' },
    ]},
    { id: 't6', name: 'Global Diversified', description: 'Worldwide exposure', allocations: [
      { ticker: 'VTI', weight: 35, name: 'US Stocks' },
      { ticker: 'VWO', weight: 15, name: 'Emerging Markets' },
      { ticker: 'EFA', weight: 15, name: 'Developed Markets' },
      { ticker: 'AGG', weight: 25, name: 'US Bonds' },
      { ticker: 'GLD', weight: 10, name: 'Gold' },
    ]},
    { id: 't7', name: 'Dividend Growth', description: 'Income with growth potential', allocations: [
      { ticker: 'SCHD', weight: 40, name: 'Dividend ETF' },
      { ticker: 'VIG', weight: 30, name: 'Dividend Appreciation' },
      { ticker: 'AGG', weight: 20, name: 'Bonds' },
      { ticker: 'VNQ', weight: 10, name: 'Real Estate' },
    ]},
    
    // Growth
    { id: 't8', name: 'Growth Builder', description: 'Equity-focused long-term', allocations: [
      { ticker: 'VTI', weight: 45, name: 'Total Market' },
      { ticker: 'QQQ', weight: 25, name: 'NASDAQ 100' },
      { ticker: 'SPY', weight: 15, name: 'S&P 500' },
      { ticker: 'AGG', weight: 15, name: 'Bonds' },
    ]},
    { id: 't9', name: 'Tech Forward', description: 'Technology-heavy growth', allocations: [
      { ticker: 'QQQ', weight: 45, name: 'NASDAQ 100' },
      { ticker: 'XLK', weight: 25, name: 'Tech Sector' },
      { ticker: 'SPY', weight: 20, name: 'S&P 500' },
      { ticker: 'AGG', weight: 10, name: 'Bonds' },
    ]},
    { id: 't10', name: 'Factor Tilt', description: 'Multi-factor approach', allocations: [
      { ticker: 'MTUM', weight: 25, name: 'Momentum' },
      { ticker: 'QUAL', weight: 25, name: 'Quality' },
      { ticker: 'USMV', weight: 25, name: 'Low Vol' },
      { ticker: 'VTI', weight: 25, name: 'Total Market' },
    ]},
    
    // Aggressive
    { id: 't11', name: 'Max Growth', description: 'All-equity for maximum returns', allocations: [
      { ticker: 'QQQ', weight: 40, name: 'NASDAQ 100' },
      { ticker: 'SPY', weight: 30, name: 'S&P 500' },
      { ticker: 'VTI', weight: 20, name: 'Total Market' },
      { ticker: 'IWM', weight: 10, name: 'Small Cap' },
    ]},
    { id: 't12', name: 'Tech Aggressive', description: 'Heavy tech exposure', allocations: [
      { ticker: 'QQQ', weight: 50, name: 'NASDAQ 100' },
      { ticker: 'XLK', weight: 30, name: 'Tech Sector' },
      { ticker: 'VTI', weight: 20, name: 'Total Market' },
    ]},
    { id: 't13', name: 'Small Cap Growth', description: 'Higher risk small companies', allocations: [
      { ticker: 'IWM', weight: 40, name: 'Russell 2000' },
      { ticker: 'VTI', weight: 35, name: 'Total Market' },
      { ticker: 'QQQ', weight: 25, name: 'NASDAQ 100' },
    ]},
    
    // Specialty
    { id: 't14', name: 'Real Assets', description: 'Inflation protection', allocations: [
      { ticker: 'VNQ', weight: 30, name: 'Real Estate' },
      { ticker: 'GLD', weight: 25, name: 'Gold' },
      { ticker: 'DBC', weight: 20, name: 'Commodities' },
      { ticker: 'SPY', weight: 25, name: 'S&P 500' },
    ]},
    { id: 't15', name: 'Income Focus', description: 'High dividend yield', allocations: [
      { ticker: 'VYM', weight: 35, name: 'High Dividend' },
      { ticker: 'HYG', weight: 25, name: 'High Yield Bonds' },
      { ticker: 'VNQ', weight: 20, name: 'Real Estate' },
      { ticker: 'AGG', weight: 20, name: 'Bonds' },
    ]},
    
    // Single asset
    { id: 't16', name: 'S&P 500 Pure', description: 'Simple index exposure', allocations: [
      { ticker: 'SPY', weight: 100, name: 'S&P 500' },
    ]},
    { id: 't17', name: 'Total Market', description: 'Broad US market', allocations: [
      { ticker: 'VTI', weight: 100, name: 'Total Market' },
    ]},
    { id: 't18', name: 'Bond Only', description: 'Fixed income only', allocations: [
      { ticker: 'AGG', weight: 100, name: 'Aggregate Bond' },
    ]},
    
    // More combinations
    { id: 't19', name: 'Sector Rotation', description: 'Multi-sector allocation', allocations: [
      { ticker: 'XLK', weight: 25, name: 'Tech' },
      { ticker: 'XLV', weight: 20, name: 'Healthcare' },
      { ticker: 'XLF', weight: 20, name: 'Financials' },
      { ticker: 'XLI', weight: 20, name: 'Industrials' },
      { ticker: 'XLP', weight: 15, name: 'Staples' },
    ]},
    { id: 't20', name: 'EM Growth', description: 'Emerging markets focus', allocations: [
      { ticker: 'VWO', weight: 40, name: 'EM Vanguard' },
      { ticker: 'EEM', weight: 30, name: 'EM iShares' },
      { ticker: 'VTI', weight: 20, name: 'US Stocks' },
      { ticker: 'AGG', weight: 10, name: 'Bonds' },
    ]},
  ];
}

export default {
  discoverAvailableTickers,
  fetchTickerCounts,
  fetchTickerData,
  calculateTickerStats,
  screenAllPortfolios,
  quickScreenPortfolios,
  calculateExactPortfolioMetrics,
};
