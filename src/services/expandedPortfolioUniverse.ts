/**
 * Expanded Portfolio Universe Service - DYNAMIC TICKER SOURCING
 * 
 * Key Features:
 * - Dynamically fetches ALL available tickers from market_daily_bars
 * - Builds portfolio families based on actual available data
 * - Limited weight variations (4-5 per combo) for manageability
 * - REAL metrics calculated from historical data
 */

import { supabase } from '@/integrations/supabase/client';
import {
  calculateSharpeRatio,
  calculateSortinoRatio,
  calculateMaxDrawdown,
  calculateCAGR,
  annualizedVolatility,
} from './portfolioMetricsService';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface TickerMeta {
  symbol: string;
  name: string;
  category: string;
  sector?: string;
  isEtf: boolean;
  marketCapTier?: string;
}

export interface RealMetrics {
  cagr: number;
  totalReturn: number;
  periodTotalReturn?: number;
  returnPeriodYears?: number;
  volatility: number;
  sharpe: number;
  sortino: number;
  maxDrawdown: number;
  dataPoints: number;
}

export interface GeneratedPortfolioV2 {
  id: string;
  name: string;
  family: string;
  tickers: string[];
  weights: number[];
  metrics: RealMetrics;
  riskProfile: 'conservative' | 'moderate' | 'growth' | 'aggressive';
  matchScore: number;
}

export interface FilterCriteria {
  maxDrawdown?: number;
  maxVolatility?: number;
  minSharpe?: number;
  minCagr?: number;
  minSortino?: number;
  minTotalReturn?: number;
  returnPeriod?: number;
  riskProfiles?: ('conservative' | 'moderate' | 'growth' | 'aggressive')[];
}

export interface GenerationProgress {
  phase: 'init' | 'fetching' | 'calculating' | 'complete';
  current: number;
  total: number;
  message: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPANDED WEIGHT SCHEMES (more variations for 10K+ combos)
// ═══════════════════════════════════════════════════════════════════════════════

const WEIGHT_SCHEMES: Record<number, number[][]> = {
  2: [
    [50, 50],
    [60, 40],
    [70, 30],
    [80, 20],
    [90, 10],
    [75, 25],
    [65, 35],
    [55, 45],
  ],
  3: [
    [34, 33, 33],
    [50, 30, 20],
    [40, 40, 20],
    [50, 25, 25],
    [60, 25, 15],
    [45, 35, 20],
    [55, 30, 15],
    [70, 20, 10],
  ],
  4: [
    [25, 25, 25, 25],
    [40, 20, 20, 20],
    [30, 30, 20, 20],
    [35, 25, 25, 15],
    [50, 20, 20, 10],
    [40, 30, 20, 10],
    [45, 25, 20, 10],
    [35, 30, 25, 10],
  ],
  5: [
    [20, 20, 20, 20, 20],
    [30, 20, 20, 15, 15],
    [25, 25, 20, 15, 15],
    [35, 20, 20, 15, 10],
    [40, 20, 15, 15, 10],
    [30, 25, 20, 15, 10],
    [35, 25, 15, 15, 10],
    [25, 20, 20, 20, 15],
  ],
  6: [
    [17, 17, 17, 17, 16, 16],
    [25, 20, 15, 15, 15, 10],
    [20, 20, 20, 15, 15, 10],
    [30, 20, 15, 15, 10, 10],
    [35, 20, 15, 12, 10, 8],
    [25, 25, 15, 15, 10, 10],
    [30, 25, 15, 12, 10, 8],
    [20, 18, 18, 18, 14, 12],
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// TICKER CATEGORIZATION (by known characteristics)
// ═══════════════════════════════════════════════════════════════════════════════

interface TickerCategory {
  category: string;
  riskProfile: 'conservative' | 'moderate' | 'growth' | 'aggressive';
  keywords: string[];
}

// Map known tickers to categories
const TICKER_CATEGORIES: Record<string, TickerCategory> = {
  // Treasury/Bond ETFs (Conservative)
  TLT: { category: 'Treasury', riskProfile: 'conservative', keywords: ['long', 'treasury'] },
  IEF: { category: 'Treasury', riskProfile: 'conservative', keywords: ['intermediate', 'treasury'] },
  SHY: { category: 'Treasury', riskProfile: 'conservative', keywords: ['short', 'treasury'] },
  GOVT: { category: 'Treasury', riskProfile: 'conservative', keywords: ['treasury'] },
  AGG: { category: 'Bond', riskProfile: 'conservative', keywords: ['aggregate', 'bond'] },
  BND: { category: 'Bond', riskProfile: 'conservative', keywords: ['total', 'bond'] },
  LQD: { category: 'Corporate Bond', riskProfile: 'conservative', keywords: ['corporate', 'bond'] },
  HYG: { category: 'High Yield', riskProfile: 'moderate', keywords: ['high', 'yield'] },
  TIP: { category: 'TIPS', riskProfile: 'conservative', keywords: ['inflation', 'protected'] },
  
  // Dividend (Conservative)
  DVY: { category: 'Dividend', riskProfile: 'conservative', keywords: ['dividend'] },
  VIG: { category: 'Dividend', riskProfile: 'conservative', keywords: ['dividend', 'growth'] },
  VYM: { category: 'Dividend', riskProfile: 'conservative', keywords: ['high', 'yield'] },
  SCHD: { category: 'Dividend', riskProfile: 'conservative', keywords: ['dividend'] },
  
  // Low Volatility (Conservative)
  SPLV: { category: 'Low Volatility', riskProfile: 'conservative', keywords: ['low', 'volatility'] },
  
  // Broad Market ETFs (Moderate)
  SPY: { category: 'US Large Cap', riskProfile: 'moderate', keywords: ['s&p', '500'] },
  VOO: { category: 'US Large Cap', riskProfile: 'moderate', keywords: ['s&p', '500'] },
  VTI: { category: 'Total Market', riskProfile: 'moderate', keywords: ['total', 'market'] },
  DIA: { category: 'US Large Cap', riskProfile: 'moderate', keywords: ['dow', 'jones'] },
  SPYG: { category: 'Growth', riskProfile: 'growth', keywords: ['growth'] },
  
  // International (Moderate/Growth)
  VWO: { category: 'Emerging Markets', riskProfile: 'aggressive', keywords: ['emerging'] },
  EEM: { category: 'Emerging Markets', riskProfile: 'aggressive', keywords: ['emerging'] },
  EFA: { category: 'Developed International', riskProfile: 'moderate', keywords: ['developed'] },
  VEA: { category: 'Developed International', riskProfile: 'moderate', keywords: ['developed'] },
  VXUS: { category: 'International', riskProfile: 'moderate', keywords: ['international'] },
  
  // Alternatives (Moderate)
  GLD: { category: 'Gold', riskProfile: 'moderate', keywords: ['gold'] },
  VNQ: { category: 'Real Estate', riskProfile: 'moderate', keywords: ['real', 'estate'] },
  DBC: { category: 'Commodities', riskProfile: 'moderate', keywords: ['commodities'] },
  
  // Sectors (Growth)
  XLK: { category: 'Technology', riskProfile: 'growth', keywords: ['technology'] },
  XLF: { category: 'Financials', riskProfile: 'growth', keywords: ['financials'] },
  XLV: { category: 'Healthcare', riskProfile: 'growth', keywords: ['healthcare'] },
  XLI: { category: 'Industrials', riskProfile: 'growth', keywords: ['industrials'] },
  XLP: { category: 'Consumer Staples', riskProfile: 'moderate', keywords: ['staples'] },
  XLY: { category: 'Consumer Discretionary', riskProfile: 'growth', keywords: ['consumer'] },
  XLE: { category: 'Energy', riskProfile: 'aggressive', keywords: ['energy'] },
  XLU: { category: 'Utilities', riskProfile: 'conservative', keywords: ['utilities'] },
  
  // Tech Heavy (Growth/Aggressive)
  QQQ: { category: 'Nasdaq', riskProfile: 'growth', keywords: ['nasdaq', 'tech'] },
  IWM: { category: 'Small Cap', riskProfile: 'aggressive', keywords: ['small', 'cap'] },
  
  // Mega Cap Stocks (Growth/Aggressive)
  AAPL: { category: 'Mega Tech', riskProfile: 'growth', keywords: ['apple', 'tech'] },
  MSFT: { category: 'Mega Tech', riskProfile: 'growth', keywords: ['microsoft', 'tech'] },
  GOOGL: { category: 'Mega Tech', riskProfile: 'growth', keywords: ['google', 'tech'] },
  AMZN: { category: 'Mega Tech', riskProfile: 'growth', keywords: ['amazon', 'tech'] },
  NVDA: { category: 'Semiconductors', riskProfile: 'aggressive', keywords: ['nvidia', 'ai'] },
  META: { category: 'Mega Tech', riskProfile: 'growth', keywords: ['meta', 'social'] },
  INTC: { category: 'Semiconductors', riskProfile: 'growth', keywords: ['intel', 'chip'] },
  AMAT: { category: 'Semiconductors', riskProfile: 'aggressive', keywords: ['applied', 'chip'] },
  
  // Healthcare
  JNJ: { category: 'Healthcare', riskProfile: 'moderate', keywords: ['johnson', 'pharma'] },
  UNH: { category: 'Healthcare', riskProfile: 'moderate', keywords: ['unitedhealth'] },
  
  // Financials
  JPM: { category: 'Financials', riskProfile: 'moderate', keywords: ['jpmorgan', 'bank'] },
  V: { category: 'Financials', riskProfile: 'growth', keywords: ['visa', 'payments'] },
  
  // Crypto/Speculative (Aggressive)
  BITO: { category: 'Crypto', riskProfile: 'aggressive', keywords: ['bitcoin', 'crypto'] },
  IBIT: { category: 'Crypto', riskProfile: 'aggressive', keywords: ['bitcoin', 'crypto'] },
  ETHA: { category: 'Crypto', riskProfile: 'aggressive', keywords: ['ethereum', 'crypto'] },
  BITF: { category: 'Crypto', riskProfile: 'aggressive', keywords: ['bitcoin', 'mining'] },
  MSOS: { category: 'Cannabis', riskProfile: 'aggressive', keywords: ['cannabis'] },
  GME: { category: 'Meme', riskProfile: 'aggressive', keywords: ['gamestop'] },
  UPST: { category: 'Fintech', riskProfile: 'aggressive', keywords: ['upstart'] },
  
  // Other
  DRI: { category: 'Consumer', riskProfile: 'moderate', keywords: ['darden', 'restaurant'] },
  GRAB: { category: 'Emerging Tech', riskProfile: 'aggressive', keywords: ['grab', 'asia'] },
  MUFG: { category: 'Financials', riskProfile: 'moderate', keywords: ['mitsubishi', 'bank'] },
  MITSY: { category: 'Industrial', riskProfile: 'moderate', keywords: ['mitsubishi'] },
  SDGR: { category: 'Biotech', riskProfile: 'aggressive', keywords: ['schrodinger'] },
  SIDU: { category: 'Small Cap', riskProfile: 'aggressive', keywords: ['sidus'] },
  IONR: { category: 'Small Cap', riskProfile: 'aggressive', keywords: ['ioneer'] },
};

// ═══════════════════════════════════════════════════════════════════════════════
// DYNAMIC PORTFOLIO FAMILY BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

interface DynamicFamily {
  id: string;
  name: string;
  riskProfile: 'conservative' | 'moderate' | 'growth' | 'aggressive';
  tickerPool: string[];
  assetCount: number;
}

function buildDynamicFamilies(availableTickers: string[]): DynamicFamily[] {
  // Group tickers by category
  const conservative: string[] = [];
  const moderate: string[] = [];
  const growth: string[] = [];
  const aggressive: string[] = [];
  
  // Specific groupings
  const treasury: string[] = [];
  const bonds: string[] = [];
  const dividend: string[] = [];
  const broadMarket: string[] = [];
  const international: string[] = [];
  const alternatives: string[] = [];
  const sectors: string[] = [];
  const tech: string[] = [];
  const stocks: string[] = [];
  
  for (const ticker of availableTickers) {
    const cat = TICKER_CATEGORIES[ticker];
    if (!cat) {
      // Unknown ticker - assume moderate growth
      growth.push(ticker);
      stocks.push(ticker);
      continue;
    }
    
    switch (cat.riskProfile) {
      case 'conservative': conservative.push(ticker); break;
      case 'moderate': moderate.push(ticker); break;
      case 'growth': growth.push(ticker); break;
      case 'aggressive': aggressive.push(ticker); break;
    }
    
    // Specific groupings
    if (cat.category === 'Treasury') treasury.push(ticker);
    if (cat.category.includes('Bond') || cat.category === 'TIPS') bonds.push(ticker);
    if (cat.category === 'Dividend') dividend.push(ticker);
    if (cat.category.includes('Cap') || cat.category === 'Total Market') broadMarket.push(ticker);
    if (cat.category.includes('International') || cat.category.includes('Emerging') || cat.category.includes('Developed')) international.push(ticker);
    if (cat.category === 'Gold' || cat.category === 'Commodities' || cat.category === 'Real Estate') alternatives.push(ticker);
    if (cat.category.includes('Technology') || cat.category.includes('Financials') || cat.category.includes('Healthcare') || 
        cat.category.includes('Industrial') || cat.category.includes('Energy') || cat.category.includes('Utilities') ||
        cat.category.includes('Consumer')) sectors.push(ticker);
    if (cat.category === 'Nasdaq' || cat.category === 'Mega Tech' || cat.category === 'Semiconductors') tech.push(ticker);
    if (cat.category === 'Mega Tech' || cat.category === 'Semiconductors' || cat.category === 'Financials' || cat.category === 'Healthcare') stocks.push(ticker);
  }
  
  const families: DynamicFamily[] = [];
  
  // Conservative families
  if (treasury.length >= 2) {
    families.push({
      id: 'treasury-ladder',
      name: 'Treasury Ladder',
      riskProfile: 'conservative',
      tickerPool: treasury,
      assetCount: Math.min(3, treasury.length),
    });
  }
  
  if (bonds.length >= 2) {
    families.push({
      id: 'core-bond',
      name: 'Core Bond',
      riskProfile: 'conservative',
      tickerPool: bonds,
      assetCount: Math.min(3, bonds.length),
    });
  }
  
  if (dividend.length >= 2) {
    families.push({
      id: 'dividend-income',
      name: 'Dividend Income',
      riskProfile: 'conservative',
      tickerPool: dividend,
      assetCount: Math.min(3, dividend.length),
    });
  }
  
  if (conservative.length >= 3) {
    families.push({
      id: 'conservative-blend',
      name: 'Conservative Blend',
      riskProfile: 'conservative',
      tickerPool: conservative,
      assetCount: Math.min(4, conservative.length),
    });
  }
  
  // Moderate families
  if (broadMarket.length >= 1 && (bonds.length >= 1 || conservative.length >= 1)) {
    const pool = [...new Set([...broadMarket, ...bonds.slice(0, 2)])];
    if (pool.length >= 2) {
      families.push({
        id: 'classic-60-40',
        name: 'Classic 60/40',
        riskProfile: 'moderate',
        tickerPool: pool,
        assetCount: 2,
      });
    }
  }
  
  if (broadMarket.length >= 2) {
    families.push({
      id: 'us-core',
      name: 'US Core Equity',
      riskProfile: 'moderate',
      tickerPool: broadMarket,
      assetCount: Math.min(3, broadMarket.length),
    });
  }
  
  if (international.length >= 2) {
    families.push({
      id: 'global-equity',
      name: 'Global Equity',
      riskProfile: 'moderate',
      tickerPool: [...broadMarket.slice(0, 2), ...international],
      assetCount: Math.min(4, broadMarket.length + international.length),
    });
  }
  
  if (alternatives.length >= 2) {
    families.push({
      id: 'real-assets',
      name: 'Real Assets',
      riskProfile: 'moderate',
      tickerPool: alternatives,
      assetCount: Math.min(3, alternatives.length),
    });
  }
  
  // All-weather (mix of everything)
  const allWeatherPool = [...broadMarket.slice(0, 2), ...bonds.slice(0, 2), ...alternatives.slice(0, 2)];
  if (allWeatherPool.length >= 4) {
    families.push({
      id: 'all-weather',
      name: 'All Weather',
      riskProfile: 'moderate',
      tickerPool: [...new Set(allWeatherPool)],
      assetCount: Math.min(4, allWeatherPool.length),
    });
  }
  
  if (moderate.length >= 3) {
    families.push({
      id: 'moderate-blend',
      name: 'Moderate Blend',
      riskProfile: 'moderate',
      tickerPool: moderate,
      assetCount: Math.min(4, moderate.length),
    });
  }
  
  // Growth families
  if (sectors.length >= 3) {
    families.push({
      id: 'sector-rotation',
      name: 'Sector Rotation',
      riskProfile: 'growth',
      tickerPool: sectors,
      assetCount: Math.min(4, sectors.length),
    });
  }
  
  if (tech.length >= 2) {
    families.push({
      id: 'tech-leaders',
      name: 'Tech Leaders',
      riskProfile: 'growth',
      tickerPool: tech,
      assetCount: Math.min(4, tech.length),
    });
  }
  
  if (stocks.length >= 3) {
    families.push({
      id: 'blue-chip-stocks',
      name: 'Blue Chip Stocks',
      riskProfile: 'growth',
      tickerPool: stocks,
      assetCount: Math.min(5, stocks.length),
    });
  }
  
  if (growth.length >= 3) {
    families.push({
      id: 'growth-blend',
      name: 'Growth Blend',
      riskProfile: 'growth',
      tickerPool: growth,
      assetCount: Math.min(4, growth.length),
    });
  }
  
  // Aggressive families
  if (aggressive.length >= 2) {
    families.push({
      id: 'aggressive-growth',
      name: 'Aggressive Growth',
      riskProfile: 'aggressive',
      tickerPool: aggressive,
      assetCount: Math.min(4, aggressive.length),
    });
  }
  
  // High conviction (all tickers)
  if (availableTickers.length >= 5) {
    families.push({
      id: 'diversified-all',
      name: 'Diversified All-Asset',
      riskProfile: 'moderate',
      tickerPool: availableTickers,
      assetCount: 5,
    });
  }
  
  // Create more combinations with mixed profiles
  if (conservative.length >= 2 && growth.length >= 2) {
    families.push({
      id: 'barbell',
      name: 'Barbell Strategy',
      riskProfile: 'moderate',
      tickerPool: [...conservative.slice(0, 3), ...growth.slice(0, 3)],
      assetCount: 4,
    });
  }
  
  return families;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATABASE TICKER RETURNS CACHE
// ═══════════════════════════════════════════════════════════════════════════════

interface TickerDailyData {
  dates: string[];
  returns: number[];
}

let tickerDataCache: Map<string, TickerDailyData> | null = null;
let availableTickersCache: string[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

const TARGET_TICKERS = 200; // enough breadth for 100k+ portfolio combos
const TICKER_DISCOVERY_DAYS = 30; // sample recent market days to discover tickers broadly
const POSTGREST_PAGE_SIZE = 1000;
const TICKER_CHUNK_SIZE = 50; // keep queries reasonably sized

// Fetch available tickers from database (avoid "limit 1000 rows" bias by sampling recent bars)
async function fetchAvailableTickers(): Promise<string[]> {
  const now = Date.now();
  if (availableTickersCache && (now - cacheTimestamp) < CACHE_TTL) {
    return availableTickersCache;
  }

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - TICKER_DISCOVERY_DAYS);

  const unique = new Set<string>();
  let from = 0;

  // Pull pages of recent bars, ordered by most recent date first, and dedupe tickers.
  // This yields many distinct tickers quickly (as opposed to ordering by ticker which clusters duplicates).
  while (unique.size < TARGET_TICKERS) {
    const { data, error } = await supabase
      .from('market_daily_bars')
      .select('ticker, bar_date')
      .gte('bar_date', startDate.toISOString().split('T')[0])
      .lte('bar_date', endDate.toISOString().split('T')[0])
      .order('bar_date', { ascending: false })
      .range(from, from + POSTGREST_PAGE_SIZE - 1);

    if (error) {
      console.error('Failed to fetch available tickers:', error);
      return [];
    }

    const rows = data ?? [];
    if (rows.length === 0) break;

    for (const row of rows) unique.add(row.ticker);

    if (rows.length < POSTGREST_PAGE_SIZE) break;
    from += POSTGREST_PAGE_SIZE;
  }

  const tickers = [...unique].sort();
  availableTickersCache = tickers;
  cacheTimestamp = now;

  console.log(`[ExpandedUniverse] Discovered ${tickers.length} tickers from last ${TICKER_DISCOVERY_DAYS} days`);
  return tickers;
}

async function fetchTickerDailyReturns(
  tickers: string[],
  lookbackYears: number = 1,
  onProgress?: (progress: GenerationProgress) => void
): Promise<Map<string, TickerDailyData>> {
  const now = Date.now();
  if (tickerDataCache && (now - cacheTimestamp) < CACHE_TTL) {
    const missing = tickers.filter(t => !tickerDataCache!.has(t));
    if (missing.length === 0) {
      return tickerDataCache;
    }
  }

  onProgress?.({ phase: 'fetching', current: 10, total: 100, message: 'Fetching market data...' });

  const endDate = new Date();
  const startDate = new Date();
  startDate.setFullYear(endDate.getFullYear() - lookbackYears);

  const byTicker: Record<string, { date: string; ret: number }[]> = {};

  const chunks: string[][] = [];
  for (let i = 0; i < tickers.length; i += TICKER_CHUNK_SIZE) {
    chunks.push(tickers.slice(i, i + TICKER_CHUNK_SIZE));
  }

  for (let c = 0; c < chunks.length; c++) {
    const chunk = chunks[c];

    let from = 0;
    // Pull all rows for this chunk across multiple pages to bypass the default 1000 row cap.
    while (true) {
      const { data, error } = await supabase
        .from('market_daily_bars')
        .select('ticker, bar_date, daily_return')
        .in('ticker', chunk)
        .gte('bar_date', startDate.toISOString().split('T')[0])
        .lte('bar_date', endDate.toISOString().split('T')[0])
        .order('bar_date', { ascending: true })
        .range(from, from + POSTGREST_PAGE_SIZE - 1);

      if (error) {
        console.error('Failed to fetch daily returns:', error);
        throw new Error('Failed to fetch market data');
      }

      const rows = data ?? [];
      for (const row of rows) {
        if (!byTicker[row.ticker]) byTicker[row.ticker] = [];
        byTicker[row.ticker].push({ date: row.bar_date, ret: row.daily_return ?? 0 });
      }

      if (rows.length < POSTGREST_PAGE_SIZE) break;
      from += POSTGREST_PAGE_SIZE;
    }

    const pct = 10 + Math.round(((c + 1) / chunks.length) * 30);
    onProgress?.({ phase: 'fetching', current: pct, total: 100, message: `Loaded market data (${c + 1}/${chunks.length})...` });
  }

  onProgress?.({ phase: 'fetching', current: 40, total: 100, message: 'Processing market data...' });

  const result = new Map<string, TickerDailyData>();
  for (const [ticker, rows] of Object.entries(byTicker)) {
    if (!rows.length) continue;
    result.set(ticker, {
      dates: rows.map(r => r.date),
      returns: rows.map(r => r.ret),
    });
  }

  tickerDataCache = result;
  cacheTimestamp = now;

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REAL PORTFOLIO METRICS CALCULATION
// ═══════════════════════════════════════════════════════════════════════════════

function calculatePortfolioMetrics(
  tickers: string[],
  weights: number[],
  tickerData: Map<string, TickerDailyData>
): RealMetrics | null {
  const tickerDataArr = tickers.map(t => tickerData.get(t)).filter(Boolean) as TickerDailyData[];
  if (tickerDataArr.length !== tickers.length) return null;

  const dateSets = tickerDataArr.map(td => new Set(td.dates));
  const commonDates = [...dateSets[0]].filter(d => dateSets.every(s => s.has(d))).sort();

  if (commonDates.length < 20) return null;

  const dateToReturns: Record<string, number[]> = {};
  for (let i = 0; i < tickers.length; i++) {
    const td = tickerDataArr[i];
    for (let j = 0; j < td.dates.length; j++) {
      if (!dateToReturns[td.dates[j]]) {
        dateToReturns[td.dates[j]] = new Array(tickers.length).fill(0);
      }
      dateToReturns[td.dates[j]][i] = td.returns[j];
    }
  }

  const portfolioReturns: number[] = [];
  const portfolioValues: number[] = [100000];

  for (const date of commonDates) {
    const tickerReturns = dateToReturns[date];
    if (!tickerReturns) continue;

    let dayReturn = 0;
    for (let i = 0; i < tickers.length; i++) {
      dayReturn += (weights[i] / 100) * (tickerReturns[i] ?? 0);
    }
    portfolioReturns.push(dayReturn);
    portfolioValues.push(portfolioValues[portfolioValues.length - 1] * (1 + dayReturn));
  }

  if (portfolioReturns.length < 20) return null;

  const years = portfolioReturns.length / 252;
  const finalValue = portfolioValues[portfolioValues.length - 1];
  const cagr = calculateCAGR(100000, finalValue, years) * 100;
  const totalReturn = ((finalValue - 100000) / 100000) * 100;
  const volatility = annualizedVolatility(portfolioReturns) * 100;
  const sharpe = calculateSharpeRatio(portfolioReturns, 0.05);
  const sortino = calculateSortinoRatio(portfolioReturns, 0.05);
  const { maxDrawdownPercent } = calculateMaxDrawdown(portfolioValues);

  return {
    cagr: Math.round(cagr * 100) / 100,
    totalReturn: Math.round(totalReturn * 100) / 100,
    volatility: Math.round(volatility * 100) / 100,
    sharpe: Math.round(sharpe * 100) / 100,
    sortino: Math.round(sortino * 100) / 100,
    maxDrawdown: Math.round(maxDrawdownPercent * 100) / 100,
    dataPoints: portfolioReturns.length,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMBINATION GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

function* combinations<T>(arr: T[], k: number): Generator<T[]> {
  if (k === 0) { yield []; return; }
  if (arr.length < k) return;

  function* backtrack(start: number, current: T[]): Generator<T[]> {
    if (current.length === k) {
      yield [...current];
      return;
    }
    for (let i = start; i <= arr.length - (k - current.length); i++) {
      current.push(arr[i]);
      yield* backtrack(i + 1, current);
      current.pop();
    }
  }

  yield* backtrack(0, []);
}

// ═══════════════════════════════════════════════════════════════════════════════
// DETERMINE RISK PROFILE FOR AD-HOC COMBINATIONS
// ═══════════════════════════════════════════════════════════════════════════════

function determineRiskProfile(tickers: string[]): 'conservative' | 'moderate' | 'growth' | 'aggressive' {
  let conservativeCount = 0;
  let aggressiveCount = 0;
  let growthCount = 0;
  
  for (const ticker of tickers) {
    const cat = TICKER_CATEGORIES[ticker];
    if (!cat) {
      growthCount++; // Unknown tickers default to growth
      continue;
    }
    switch (cat.riskProfile) {
      case 'conservative': conservativeCount++; break;
      case 'aggressive': aggressiveCount++; break;
      case 'growth': growthCount++; break;
    }
  }
  
  const total = tickers.length;
  if (aggressiveCount >= total / 2) return 'aggressive';
  if (conservativeCount >= total / 2) return 'conservative';
  if (growthCount >= total / 2) return 'growth';
  return 'moderate';
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET AVAILABLE TICKER COUNT (for UI display)
// ═══════════════════════════════════════════════════════════════════════════════

export async function getAvailableTickerCount(): Promise<{ count: number; tickers: string[] }> {
  const tickers = await fetchAvailableTickers();
  return { count: tickers.length, tickers };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SCREENING FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

export async function screenPortfoliosV2(
  criteria: FilterCriteria,
  options: {
    page?: number;
    pageSize?: number;
    sortBy?: 'sharpe' | 'cagr' | 'maxDrawdown' | 'matchScore' | 'sortino';
    sortDirection?: 'asc' | 'desc';
    limit?: number;
  } = {},
  onProgress?: (progress: GenerationProgress) => void
): Promise<{
  portfolios: GeneratedPortfolioV2[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  generationTime: number;
  availableTickers: number;
}> {
  const startTime = Date.now();
  const { page = 1, pageSize = 20, sortBy = 'sharpe', sortDirection = 'desc', limit = 100000 } = options;

  const meetsFilterCriteria = (metrics: RealMetrics): boolean => {
    if (criteria.minCagr !== undefined && metrics.cagr < criteria.minCagr) return false;
    if (criteria.maxDrawdown !== undefined && metrics.maxDrawdown > criteria.maxDrawdown) return false;
    if (criteria.maxVolatility !== undefined && metrics.volatility > criteria.maxVolatility) return false;
    if (criteria.minSharpe !== undefined && metrics.sharpe < criteria.minSharpe) return false;
    if (criteria.minSortino !== undefined && metrics.sortino < criteria.minSortino) return false;

    if (criteria.minTotalReturn !== undefined) {
      const period = criteria.returnPeriod || 1;
      const estimatedTotalReturn = (Math.pow(1 + metrics.cagr / 100, period) - 1) * 100;
      if (estimatedTotalReturn < criteria.minTotalReturn) return false;
    }

    return true;
  };

  const calculateMatchScore = (metrics: RealMetrics): number => {
    let score = 50;
    if (criteria.minSharpe !== undefined && metrics.sharpe >= criteria.minSharpe) score += 15;
    if (criteria.minCagr !== undefined && metrics.cagr >= criteria.minCagr) score += 15;
    if (criteria.maxDrawdown !== undefined && metrics.maxDrawdown <= criteria.maxDrawdown) score += 10;
    if (criteria.maxVolatility !== undefined && metrics.volatility <= criteria.maxVolatility) score += 10;
    if (criteria.minSortino !== undefined && metrics.sortino >= criteria.minSortino) score += 10;
    if (criteria.minTotalReturn !== undefined) {
      const period = criteria.returnPeriod || 1;
      const estimatedTotalReturn = (Math.pow(1 + metrics.cagr / 100, period) - 1) * 100;
      if (estimatedTotalReturn >= criteria.minTotalReturn) score += 15;
    }
    return Math.min(100, score);
  };

  onProgress?.({ phase: 'init', current: 0, total: 100, message: 'Discovering available tickers...' });

  // Step 1: Get all available tickers from database
  const availableTickers = await fetchAvailableTickers();
  
  if (availableTickers.length === 0) {
    return {
      portfolios: [],
      totalCount: 0,
      page,
      pageSize,
      totalPages: 0,
      generationTime: Date.now() - startTime,
      availableTickers: 0,
    };
  }

  onProgress?.({ phase: 'init', current: 5, total: 100, message: `Found ${availableTickers.length} tickers with data` });

  // Step 2: Build dynamic families based on available tickers
  const families = buildDynamicFamilies(availableTickers);
  
  onProgress?.({ phase: 'init', current: 10, total: 100, message: `Built ${families.length} portfolio families` });

  // Step 3: Fetch all ticker data at once
  const tickerData = await fetchTickerDailyReturns(availableTickers, 1, onProgress);

  onProgress?.({ phase: 'calculating', current: 50, total: 100, message: 'Generating portfolios...' });

  // Step 4: Generate ALL portfolios without filtering (filter later for diversity)
  const allPortfolios: GeneratedPortfolioV2[] = [];
  let portfolioCount = 0;

  // Phase 1: Family-based portfolios
  for (const family of families) {
    if (portfolioCount >= limit) break;
    
    const validTickers = family.tickerPool.filter(t => tickerData.has(t));
    if (validTickers.length < 2) continue;

    const assetCount = Math.min(family.assetCount, validTickers.length);
    const weightSchemes = WEIGHT_SCHEMES[assetCount] || [[100 / assetCount].fill(100 / assetCount).slice(0, assetCount)];

    for (const combo of combinations(validTickers, assetCount)) {
      if (portfolioCount >= limit) break;
      
      for (const weights of weightSchemes) {
        if (portfolioCount >= limit) break;

        const metrics = calculatePortfolioMetrics(combo, weights, tickerData);
        if (!metrics) continue;

        // Only filter by risk profiles if specified - no metric filtering during generation
        if (criteria.riskProfiles?.length && !criteria.riskProfiles.includes(family.riskProfile)) continue;

        const matchScore = calculateMatchScore(metrics);

        allPortfolios.push({
          id: `${family.id}-${combo.join('-')}-${weights.join('-')}`,
          name: `${family.name} (${combo.join('/')})`,
          family: family.name,
          tickers: combo,
          weights,
          metrics,
          riskProfile: family.riskProfile,
          matchScore: Math.min(100, matchScore),
        });
        portfolioCount++;
      }
    }
  }

  onProgress?.({ phase: 'calculating', current: 65, total: 100, message: `Family portfolios: ${portfolioCount}. Generating cross-ticker combos...` });

  // Phase 2: Direct cross-ticker combinations (for 10K+ combos)
  const allValidTickers = availableTickers.filter(t => tickerData.has(t));
  
  // Generate 2-asset combinations from all tickers (no filtering)
  if (portfolioCount < limit && allValidTickers.length >= 2) {
    for (const combo of combinations(allValidTickers, 2)) {
      if (portfolioCount >= limit) break;
      
      for (const weights of WEIGHT_SCHEMES[2]) {
        if (portfolioCount >= limit) break;
        
        const metrics = calculatePortfolioMetrics(combo, weights, tickerData);
        if (!metrics) continue;

        const riskProfile = determineRiskProfile(combo);
        if (criteria.riskProfiles?.length && !criteria.riskProfiles.includes(riskProfile)) continue;

        const matchScore = calculateMatchScore(metrics);

        allPortfolios.push({
          id: `pair-${combo.join('-')}-${weights.join('-')}`,
          name: `Pair (${combo.join('/')})`,
          family: 'Cross-Ticker Pairs',
          tickers: combo,
          weights,
          metrics,
          riskProfile,
          matchScore: Math.min(100, matchScore),
        });
        portfolioCount++;
      }
    }
  }

  onProgress?.({ phase: 'calculating', current: 75, total: 100, message: `2-asset combos done. Adding 3-asset...` });

  // Generate 3-asset combinations (sample for performance)
  if (portfolioCount < limit && allValidTickers.length >= 3) {
    let threeAssetCount = 0;
    const maxThreeAsset = Math.min(50000, limit - portfolioCount); // Allow more 3-asset combos
    
    for (const combo of combinations(allValidTickers, 3)) {
      if (threeAssetCount >= maxThreeAsset || portfolioCount >= limit) break;
      
      // Use all weight schemes for 3-asset
      for (const weights of WEIGHT_SCHEMES[3]) {
        if (threeAssetCount >= maxThreeAsset || portfolioCount >= limit) break;
        
        const metrics = calculatePortfolioMetrics(combo, weights, tickerData);
        if (!metrics) continue;

        const riskProfile = determineRiskProfile(combo);
        if (criteria.riskProfiles?.length && !criteria.riskProfiles.includes(riskProfile)) continue;

        const matchScore = calculateMatchScore(metrics);

        allPortfolios.push({
          id: `trio-${combo.join('-')}-${weights.join('-')}`,
          name: `Trio (${combo.join('/')})`,
          family: 'Cross-Ticker Trios',
          tickers: combo,
          weights,
          metrics,
          riskProfile,
          matchScore: Math.min(100, matchScore),
        });
        portfolioCount++;
        threeAssetCount++;
      }
    }
  }

  onProgress?.({ phase: 'calculating', current: 80, total: 100, message: 'Diversifying results across risk spectrum...' });

  // Step 5: Apply filters, then create diversity-prioritized sort
  const filteredPortfolios = allPortfolios.filter((p) => meetsFilterCriteria(p.metrics));

  // First, bucket portfolios by risk profile and metric ranges to ensure full spectrum coverage
  const diversePortfolios = createDiversePortfolioSet(filteredPortfolios, sortBy, sortDirection);

  // Step 6: Paginate
  const totalCount = diversePortfolios.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const startIdx = (page - 1) * pageSize;
  const endIdx = startIdx + pageSize;
  const paginatedPortfolios = diversePortfolios.slice(startIdx, endIdx);

  onProgress?.({ phase: 'complete', current: 100, total: 100, message: `Generated ${totalCount} portfolios across full risk spectrum` });

  return {
    portfolios: paginatedPortfolios,
    totalCount,
    page,
    pageSize,
    totalPages,
    generationTime: Date.now() - startTime,
    availableTickers: availableTickers.length,
  };
}

/**
 * Creates a diverse portfolio set ensuring coverage across all risk profiles and metric ranges
 */
function createDiversePortfolioSet(
  portfolios: GeneratedPortfolioV2[],
  sortBy: string,
  sortDirection: string
): GeneratedPortfolioV2[] {
  // Bucket by risk profile
  const buckets: Record<string, GeneratedPortfolioV2[]> = {
    conservative: [],
    moderate: [],
    growth: [],
    aggressive: [],
  };

  for (const p of portfolios) {
    buckets[p.riskProfile]?.push(p);
  }

  // Sort each bucket by the requested field
  const sortMultiplier = sortDirection === 'desc' ? -1 : 1;
  for (const key of Object.keys(buckets)) {
    buckets[key].sort((a, b) => {
      const aVal = sortBy === 'matchScore' ? a.matchScore : a.metrics[sortBy as keyof RealMetrics] as number;
      const bVal = sortBy === 'matchScore' ? b.matchScore : b.metrics[sortBy as keyof RealMetrics] as number;
      return (aVal - bVal) * sortMultiplier;
    });
  }

  // Interleave from each bucket to ensure diversity in first pages
  const result: GeneratedPortfolioV2[] = [];
  const maxLen = Math.max(...Object.values(buckets).map(b => b.length));
  
  for (let i = 0; i < maxLen; i++) {
    for (const key of ['conservative', 'moderate', 'growth', 'aggressive']) {
      if (i < buckets[key].length) {
        result.push(buckets[key][i]);
      }
    }
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEGACY EXPORTS FOR COMPATIBILITY
// ═══════════════════════════════════════════════════════════════════════════════

export const PORTFOLIO_FAMILIES: { id: string; name: string }[] = [];
export const TICKER_MAP = new Map<string, TickerMeta>();

// ═══════════════════════════════════════════════════════════════════════════════
// UNIVERSE STATS (dynamic placeholder - actual stats loaded at runtime)
// ═══════════════════════════════════════════════════════════════════════════════

export function getUniverseStats() {
  return {
    totalTickers: 200,
    totalFamilies: 10,
    estimatedPortfolios: 100000,
  };
}
