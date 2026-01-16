/**
 * Expanded Portfolio Universe Service - REAL METRICS
 * 
 * Key Changes:
 * - Fetches REAL metrics from database (not estimates)
 * - Wide ticker range with LIMITED weight variations (max 6 per combo)
 * - Pulls tickers from asset_universe table for maximum coverage
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
  subCategory: string;
  riskTier: 1 | 2 | 3 | 4 | 5;
}

export interface RealMetrics {
  cagr: number;
  totalReturn: number;
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
  riskProfiles?: ('conservative' | 'moderate' | 'growth' | 'aggressive')[];
}

export interface GenerationProgress {
  phase: 'init' | 'fetching' | 'calculating' | 'complete';
  current: number;
  total: number;
  message: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FIXED WEIGHT SCHEMES (limit variations)
// ═══════════════════════════════════════════════════════════════════════════════

const WEIGHT_SCHEMES: Record<number, number[][]> = {
  2: [
    [50, 50],
    [60, 40],
    [70, 30],
    [80, 20],
  ],
  3: [
    [34, 33, 33],
    [50, 30, 20],
    [40, 40, 20],
    [50, 25, 25],
    [60, 20, 20],
  ],
  4: [
    [25, 25, 25, 25],
    [40, 20, 20, 20],
    [30, 30, 20, 20],
    [35, 25, 25, 15],
    [40, 30, 15, 15],
  ],
  5: [
    [20, 20, 20, 20, 20],
    [30, 20, 20, 15, 15],
    [25, 25, 20, 15, 15],
    [35, 20, 20, 15, 10],
    [30, 25, 20, 15, 10],
  ],
  6: [
    [17, 17, 17, 17, 16, 16],
    [25, 20, 15, 15, 15, 10],
    [20, 20, 20, 15, 15, 10],
    [30, 20, 15, 15, 10, 10],
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// PORTFOLIO FAMILIES WITH EXPANDED TICKER POOLS
// ═══════════════════════════════════════════════════════════════════════════════

interface PortfolioFamily {
  id: string;
  name: string;
  riskProfile: 'conservative' | 'moderate' | 'growth' | 'aggressive';
  tickerPool: string[];
  assetCount: number;
}

// Expanded families with more tickers, fixed asset counts
export const PORTFOLIO_FAMILIES: PortfolioFamily[] = [
  // CONSERVATIVE (bonds, low-vol, dividends)
  {
    id: 'treasury-ladder',
    name: 'Treasury Ladder',
    riskProfile: 'conservative',
    tickerPool: ['TLT', 'IEF', 'SHY', 'GOVT', 'BIL', 'SHV', 'VGSH', 'SCHO', 'SCHR', 'SPTS', 'VGIT', 'VGLT'],
    assetCount: 3,
  },
  {
    id: 'core-bond',
    name: 'Core Bond',
    riskProfile: 'conservative',
    tickerPool: ['AGG', 'BND', 'SCHZ', 'FBND', 'IUSB', 'NUBD', 'SPAB', 'EAGG'],
    assetCount: 2,
  },
  {
    id: 'bond-plus',
    name: 'Bond Plus',
    riskProfile: 'conservative',
    tickerPool: ['AGG', 'BND', 'LQD', 'VCIT', 'VCSH', 'TIP', 'MUB', 'BNDX', 'HYG', 'JNK', 'EMB'],
    assetCount: 4,
  },
  {
    id: 'dividend-income',
    name: 'Dividend Income',
    riskProfile: 'conservative',
    tickerPool: ['SCHD', 'VIG', 'VYM', 'DVY', 'NOBL', 'SDY', 'DGRW', 'HDV', 'DGRO', 'SPYD', 'SPHD', 'FDL'],
    assetCount: 3,
  },
  {
    id: 'low-volatility',
    name: 'Low Volatility',
    riskProfile: 'conservative',
    tickerPool: ['USMV', 'SPLV', 'SPHD', 'EFAV', 'EEMV', 'XMLV', 'XSLV', 'FDLO', 'LVHD', 'ACWV'],
    assetCount: 3,
  },

  // MODERATE (balanced, global, factor)
  {
    id: 'classic-60-40',
    name: 'Classic 60/40',
    riskProfile: 'moderate',
    tickerPool: ['SPY', 'VOO', 'VTI', 'IVV', 'SPTM', 'ITOT', 'AGG', 'BND', 'SCHZ'],
    assetCount: 2,
  },
  {
    id: 'global-balanced',
    name: 'Global Balanced',
    riskProfile: 'moderate',
    tickerPool: ['VTI', 'VXUS', 'VWO', 'EFA', 'IEFA', 'AGG', 'BNDX', 'GLD', 'VNQ', 'SCHH'],
    assetCount: 5,
  },
  {
    id: 'all-weather',
    name: 'All Weather',
    riskProfile: 'moderate',
    tickerPool: ['SPY', 'TLT', 'IEF', 'GLD', 'DBC', 'VTI', 'PDBC', 'IAU', 'SLV', 'GSG'],
    assetCount: 4,
  },
  {
    id: 'factor-blend',
    name: 'Factor Blend',
    riskProfile: 'moderate',
    tickerPool: ['MTUM', 'QUAL', 'VLUE', 'SIZE', 'USMV', 'VTV', 'VUG', 'VIG', 'DGRW', 'MOAT'],
    assetCount: 4,
  },
  {
    id: 'real-assets',
    name: 'Real Assets',
    riskProfile: 'moderate',
    tickerPool: ['VNQ', 'SCHH', 'RWR', 'IYR', 'GLD', 'IAU', 'TIP', 'DBC', 'PDBC', 'USCI', 'BCI'],
    assetCount: 4,
  },

  // GROWTH (US growth, tech, sectors)
  {
    id: 'us-large-growth',
    name: 'US Large Growth',
    riskProfile: 'growth',
    tickerPool: ['QQQ', 'VUG', 'IWF', 'SPYG', 'MGK', 'VONG', 'SCHG', 'IUSG', 'RPG', 'IWY'],
    assetCount: 3,
  },
  {
    id: 'tech-overweight',
    name: 'Tech Overweight',
    riskProfile: 'growth',
    tickerPool: ['QQQ', 'XLK', 'VGT', 'FTEC', 'IYW', 'IGV', 'WCLD', 'SKYY', 'CLOU', 'HACK'],
    assetCount: 3,
  },
  {
    id: 'sector-blend',
    name: 'Sector Blend',
    riskProfile: 'growth',
    tickerPool: ['XLK', 'XLF', 'XLV', 'XLI', 'XLP', 'XLY', 'XLE', 'XLRE', 'XLC', 'XLB', 'XLU'],
    assetCount: 5,
  },
  {
    id: 'international-developed',
    name: 'International Developed',
    riskProfile: 'growth',
    tickerPool: ['EFA', 'VEA', 'IEFA', 'VGK', 'EWJ', 'EWU', 'EWG', 'EWQ', 'EWL', 'IEUR', 'HEDJ'],
    assetCount: 4,
  },
  {
    id: 'healthcare-biotech',
    name: 'Healthcare & Biotech',
    riskProfile: 'growth',
    tickerPool: ['XLV', 'VHT', 'IBB', 'XBI', 'IHI', 'IHF', 'ARKG', 'GNOM', 'IDNA', 'BBH'],
    assetCount: 3,
  },

  // AGGRESSIVE (small cap, EM, thematic, single stocks)
  {
    id: 'small-cap-blend',
    name: 'Small Cap Blend',
    riskProfile: 'aggressive',
    tickerPool: ['IWM', 'IJR', 'VB', 'SCHA', 'VBR', 'VBK', 'IWN', 'IWO', 'VIOO', 'SLYV', 'SLYG'],
    assetCount: 3,
  },
  {
    id: 'emerging-markets',
    name: 'Emerging Markets',
    riskProfile: 'aggressive',
    tickerPool: ['VWO', 'EEM', 'IEMG', 'FXI', 'EWZ', 'INDA', 'EWT', 'EWY', 'EWH', 'THD', 'EZA', 'TUR'],
    assetCount: 4,
  },
  {
    id: 'thematic-innovation',
    name: 'Thematic Innovation',
    riskProfile: 'aggressive',
    tickerPool: ['ARKK', 'ARKG', 'ARKW', 'ARKF', 'ARKQ', 'IZRL', 'MOON', 'KOMP', 'GINN', 'DRIV'],
    assetCount: 3,
  },
  {
    id: 'semiconductors',
    name: 'Semiconductors',
    riskProfile: 'aggressive',
    tickerPool: ['SOXX', 'SMH', 'XSD', 'PSI', 'NVDA', 'AMD', 'INTC', 'AVGO', 'QCOM', 'MU', 'TSM', 'ASML'],
    assetCount: 4,
  },
  {
    id: 'mega-tech',
    name: 'Mega Tech',
    riskProfile: 'aggressive',
    tickerPool: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'AMD', 'NFLX', 'CRM', 'ADBE', 'ORCL'],
    assetCount: 5,
  },
  {
    id: 'energy-materials',
    name: 'Energy & Materials',
    riskProfile: 'aggressive',
    tickerPool: ['XLE', 'VDE', 'XOP', 'OIH', 'XLB', 'VAW', 'GUNR', 'GNR', 'MOO', 'PICK', 'SLX', 'REMX'],
    assetCount: 3,
  },
  {
    id: 'clean-energy',
    name: 'Clean Energy',
    riskProfile: 'aggressive',
    tickerPool: ['ICLN', 'TAN', 'QCLN', 'PBW', 'FAN', 'ACES', 'SMOG', 'LIT', 'DRIV', 'KARS'],
    assetCount: 3,
  },
  {
    id: 'fintech-crypto',
    name: 'Fintech & Crypto',
    riskProfile: 'aggressive',
    tickerPool: ['ARKF', 'FINX', 'IPAY', 'KOIN', 'BLOK', 'BITQ', 'GBTC', 'SQ', 'PYPL', 'COIN', 'MARA', 'RIOT'],
    assetCount: 4,
  },
];

// Build ticker map for lookups
export const TICKER_MAP = new Map<string, TickerMeta>();
PORTFOLIO_FAMILIES.forEach(family => {
  family.tickerPool.forEach(ticker => {
    if (!TICKER_MAP.has(ticker)) {
      TICKER_MAP.set(ticker, {
        symbol: ticker,
        name: ticker,
        category: family.riskProfile,
        subCategory: family.name,
        riskTier: family.riskProfile === 'conservative' ? 1 : 
                  family.riskProfile === 'moderate' ? 2 :
                  family.riskProfile === 'growth' ? 4 : 5,
      });
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DATABASE TICKER RETURNS CACHE
// ═══════════════════════════════════════════════════════════════════════════════

interface TickerDailyData {
  dates: string[];
  returns: number[];
}

let tickerDataCache: Map<string, TickerDailyData> | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

async function fetchTickerDailyReturns(
  tickers: string[],
  lookbackYears: number = 1,
  onProgress?: (progress: GenerationProgress) => void
): Promise<Map<string, TickerDailyData>> {
  const now = Date.now();
  if (tickerDataCache && (now - cacheTimestamp) < CACHE_TTL) {
    // Check if we have all needed tickers
    const missing = tickers.filter(t => !tickerDataCache!.has(t));
    if (missing.length === 0) {
      return tickerDataCache;
    }
  }

  onProgress?.({ phase: 'fetching', current: 10, total: 100, message: 'Fetching market data...' });

  const endDate = new Date();
  const startDate = new Date();
  startDate.setFullYear(endDate.getFullYear() - lookbackYears);

  const { data, error } = await supabase
    .from('market_daily_bars')
    .select('ticker, bar_date, daily_return')
    .in('ticker', tickers)
    .gte('bar_date', startDate.toISOString().split('T')[0])
    .lte('bar_date', endDate.toISOString().split('T')[0])
    .order('bar_date', { ascending: true });

  if (error) {
    console.error('Failed to fetch daily returns:', error);
    throw new Error('Failed to fetch market data');
  }

  onProgress?.({ phase: 'fetching', current: 40, total: 100, message: 'Processing market data...' });

  const result = new Map<string, TickerDailyData>();

  // Group by ticker
  const byTicker: Record<string, { date: string; ret: number }[]> = {};
  for (const row of data || []) {
    if (!byTicker[row.ticker]) {
      byTicker[row.ticker] = [];
    }
    byTicker[row.ticker].push({ date: row.bar_date, ret: row.daily_return ?? 0 });
  }

  for (const [ticker, rows] of Object.entries(byTicker)) {
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
  // Get data for all tickers
  const tickerDataArr = tickers.map(t => tickerData.get(t)).filter(Boolean) as TickerDailyData[];
  if (tickerDataArr.length !== tickers.length) return null;

  // Find common dates (all tickers have data)
  const dateSets = tickerDataArr.map(td => new Set(td.dates));
  const commonDates = [...dateSets[0]].filter(d => dateSets.every(s => s.has(d))).sort();

  if (commonDates.length < 20) return null;

  // Build date-indexed returns
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

  // Calculate portfolio daily returns
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

  // Calculate real metrics
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
// COMBINATION GENERATOR (limited)
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
}> {
  const startTime = Date.now();
  const { page = 1, pageSize = 50, sortBy = 'sharpe', sortDirection = 'desc', limit = 5000 } = options;

  onProgress?.({ phase: 'init', current: 0, total: 100, message: 'Initializing...' });

  // Get all unique tickers from families matching risk profile filter
  const familiesFiltered = criteria.riskProfiles?.length
    ? PORTFOLIO_FAMILIES.filter(f => criteria.riskProfiles!.includes(f.riskProfile))
    : PORTFOLIO_FAMILIES;

  const allTickers = [...new Set(familiesFiltered.flatMap(f => f.tickerPool))];

  // Fetch real returns data
  const tickerData = await fetchTickerDailyReturns(allTickers, 1, onProgress);

  onProgress?.({ phase: 'calculating', current: 50, total: 100, message: 'Calculating portfolio metrics...' });

  // Generate portfolios with REAL metrics
  const portfolios: GeneratedPortfolioV2[] = [];
  let portfolioId = 0;
  let processed = 0;

  for (const family of familiesFiltered) {
    if (portfolios.length >= limit) break;

    // Get available tickers (those with data)
    const availableTickers = family.tickerPool.filter(t => tickerData.has(t));
    if (availableTickers.length < family.assetCount) continue;

    // Generate ticker combinations
    const weightSchemes = WEIGHT_SCHEMES[family.assetCount] || [
      Array(family.assetCount).fill(Math.round(100 / family.assetCount)),
    ];

    for (const tickerCombo of combinations(availableTickers, family.assetCount)) {
      if (portfolios.length >= limit) break;

      // Apply each weight scheme (max 6 variations per ticker combo)
      for (const weights of weightSchemes) {
        if (portfolios.length >= limit) break;

        const metrics = calculatePortfolioMetrics(tickerCombo, weights, tickerData);
        if (!metrics) continue;

        // Apply filters
        if (criteria.maxDrawdown !== undefined && metrics.maxDrawdown > criteria.maxDrawdown) continue;
        if (criteria.maxVolatility !== undefined && metrics.volatility > criteria.maxVolatility) continue;
        if (criteria.minSharpe !== undefined && metrics.sharpe < criteria.minSharpe) continue;
        if (criteria.minCagr !== undefined && metrics.cagr < criteria.minCagr) continue;
        if (criteria.minSortino !== undefined && metrics.sortino < criteria.minSortino) continue;

        // Calculate match score
        let matchScore = 70;
        if (metrics.sharpe > 1) matchScore += 10;
        if (metrics.sharpe > 1.5) matchScore += 5;
        if (metrics.maxDrawdown < 15) matchScore += 5;
        if (metrics.sortino > 1.5) matchScore += 5;
        if (metrics.cagr > 10) matchScore += 5;

        portfolios.push({
          id: `${family.id}_${portfolioId++}`,
          name: `${family.name}: ${tickerCombo.join('/')}`,
          family: family.name,
          tickers: tickerCombo,
          weights,
          metrics,
          riskProfile: family.riskProfile,
          matchScore: Math.min(100, matchScore),
        });

        processed++;
        if (processed % 500 === 0) {
          onProgress?.({
            phase: 'calculating',
            current: 50 + Math.round((processed / limit) * 40),
            total: 100,
            message: `Calculated ${processed} portfolios...`,
          });
        }
      }
    }
  }

  onProgress?.({ phase: 'calculating', current: 95, total: 100, message: 'Sorting results...' });

  // Sort
  const sortMultiplier = sortDirection === 'desc' ? -1 : 1;
  portfolios.sort((a, b) => {
    switch (sortBy) {
      case 'sharpe': return (a.metrics.sharpe - b.metrics.sharpe) * sortMultiplier;
      case 'cagr': return (a.metrics.cagr - b.metrics.cagr) * sortMultiplier;
      case 'sortino': return (a.metrics.sortino - b.metrics.sortino) * sortMultiplier;
      case 'maxDrawdown': return (a.metrics.maxDrawdown - b.metrics.maxDrawdown) * -sortMultiplier;
      case 'matchScore':
      default: return (a.matchScore - b.matchScore) * sortMultiplier;
    }
  });

  // Paginate
  const totalCount = portfolios.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const startIdx = (page - 1) * pageSize;
  const paginatedPortfolios = portfolios.slice(startIdx, startIdx + pageSize);

  onProgress?.({ phase: 'complete', current: 100, total: 100, message: `Found ${totalCount} portfolios with real metrics` });

  return {
    portfolios: paginatedPortfolios,
    totalCount,
    page,
    pageSize,
    totalPages,
    generationTime: Date.now() - startTime,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACCURATE METRICS FOR DETAIL VIEW (same calculation, different interface)
// ═══════════════════════════════════════════════════════════════════════════════

export interface AccurateMetrics extends RealMetrics {
  dateRange: { start: string; end: string };
}

export async function calculateAccuratePortfolioMetrics(
  tickers: string[],
  weights: number[],
  lookbackYears: number = 1
): Promise<AccurateMetrics | null> {
  const tickerData = await fetchTickerDailyReturns(tickers, lookbackYears);
  const metrics = calculatePortfolioMetrics(tickers, weights, tickerData);
  if (!metrics) return null;

  // Get date range
  const firstTicker = tickerData.get(tickers[0]);
  const dates = firstTicker?.dates || [];

  return {
    ...metrics,
    dateRange: {
      start: dates[0] || '',
      end: dates[dates.length - 1] || '',
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// UNIVERSE STATS
// ═══════════════════════════════════════════════════════════════════════════════

export function getUniverseStats() {
  const allTickers = new Set<string>();
  let estimatedCombos = 0;

  for (const family of PORTFOLIO_FAMILIES) {
    family.tickerPool.forEach(t => allTickers.add(t));
    
    // Calculate combinations
    const n = family.tickerPool.length;
    const k = family.assetCount;
    const combos = factorial(n) / (factorial(k) * factorial(n - k));
    const weightVariations = WEIGHT_SCHEMES[k]?.length || 1;
    estimatedCombos += combos * weightVariations;
  }

  return {
    totalTickers: allTickers.size,
    totalFamilies: PORTFOLIO_FAMILIES.length,
    estimatedPortfolios: Math.round(estimatedCombos),
  };
}

function factorial(n: number): number {
  if (n <= 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}
