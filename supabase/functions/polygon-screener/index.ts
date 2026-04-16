import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BASE_URL = "https://api.polygon.io";

const EXTERNAL_TIMEOUT_MS = 15000;

// Simple in-memory cache (1 hour TTL)
const fundamentalsCache = new Map<string, { data: TickerFundamentals; timestamp: number }>();
const performanceCache = new Map<string, { data: PerformanceMetrics; timestamp: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface TickerFundamentals {
  pe: number | null;
  forwardPE: number | null;
  pb: number | null;
  evEbitda: number | null;
  debtEquity: number | null;
  quickRatio: number | null;
  opMargin: number | null;
  epsGrowth: number | null;
  revenueGrowth: number | null;
}

interface PerformanceMetrics {
  changePercent1W: number | null;
  changePercent1M: number | null;
  changePercentYTD: number | null;
  beta: number | null;
  volatility: number | null;
  maxDrawdown: number | null;
  stdDev: number | null;
  peg: number | null;
  shortDescription: string | null;
}

function getCachedFundamentals(ticker: string): TickerFundamentals | null {
  const entry = fundamentalsCache.get(ticker);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) return entry.data;
  fundamentalsCache.delete(ticker);
  return null;
}

function setCachedFundamentals(ticker: string, data: TickerFundamentals): void {
  fundamentalsCache.set(ticker, { data, timestamp: Date.now() });
  if (fundamentalsCache.size > 500) {
    const oldest = [...fundamentalsCache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
    if (oldest) fundamentalsCache.delete(oldest[0]);
  }
}

async function fetchWithTimeout(url: string, init?: RequestInit, timeoutMs = EXTERNAL_TIMEOUT_MS) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function getPreferredSnapshotBar(snapshot: TickerSnapshot) {
  if (isPositiveNumber(snapshot.day?.c)) return snapshot.day;
  if (isPositiveNumber(snapshot.min?.c)) return snapshot.min;
  return snapshot.prevDay;
}

function hasLiveSnapshotData(snapshot: TickerSnapshot): boolean {
  return isPositiveNumber(snapshot.day?.c) || isPositiveNumber(snapshot.min?.c);
}

function getSnapshotMetrics(snapshot: TickerSnapshot) {
  const preferredBar = getPreferredSnapshotBar(snapshot);
  const prevClose = isPositiveNumber(snapshot.prevDay?.c) ? snapshot.prevDay.c : 0;
  const currentPrice = isPositiveNumber(preferredBar?.c) ? preferredBar.c : prevClose;
  const hasLiveData = hasLiveSnapshotData(snapshot);

  // Prefer Polygon's official todaysChangePerc when available and valid
  // It uses the adjusted previous close which is more accurate
  let changePercent: number;
  let change: number;
  if (hasLiveData && typeof snapshot.todaysChangePerc === "number" && Number.isFinite(snapshot.todaysChangePerc)) {
    changePercent = snapshot.todaysChangePerc;
    change = typeof snapshot.todaysChange === "number" && Number.isFinite(snapshot.todaysChange)
      ? snapshot.todaysChange
      : (prevClose > 0 ? currentPrice - prevClose : 0);
  } else {
    change = prevClose > 0 ? currentPrice - prevClose : 0;
    changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;
  }

  return {
    preferredBar,
    prevClose,
    currentPrice,
    change,
    changePercent,
    hasLiveData,
  };
}

// ---- Calculation Helpers ----

function calculatePEG(pe: number | null, epsGrowth: number | null): number | null {
  if (pe == null || epsGrowth == null || epsGrowth <= 0 || pe <= 0) return null;
  return Math.round((pe / epsGrowth) * 100) / 100;
}

function calculateMaxDrawdown(prices: number[]): number | null {
  if (prices.length < 2) return null;
  let peak = prices[0];
  let maxDD = 0;
  for (let i = 1; i < prices.length; i++) {
    if (prices[i] > peak) peak = prices[i];
    const dd = (prices[i] - peak) / peak;
    if (dd < maxDD) maxDD = dd;
  }
  return Math.round(maxDD * 10000) / 100;
}

function calculateStdDev(returns: number[]): number | null {
  if (returns.length < 2) return null;
  const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
  const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / (returns.length - 1);
  return Math.round(Math.sqrt(variance) * 10000) / 10000;
}

function calculateBeta(stockReturns: number[], benchReturns: number[]): number | null {
  if (stockReturns.length < 10 || stockReturns.length !== benchReturns.length) return null;
  const n = stockReturns.length;
  const meanS = stockReturns.reduce((a, b) => a + b, 0) / n;
  const meanB = benchReturns.reduce((a, b) => a + b, 0) / n;
  let cov = 0, varB = 0;
  for (let i = 0; i < n; i++) {
    cov += (stockReturns[i] - meanS) * (benchReturns[i] - meanB);
    varB += (benchReturns[i] - meanB) ** 2;
  }
  if (varB === 0) return null;
  return Math.round((cov / varB) * 100) / 100;
}

// ---- Compute multi-period performance, beta, volatility from historical bars ----
// SPY bars cache (shared across tickers in a single request)
let spyBarsCache: { bars: any[]; timestamp: number } | null = null;

async function fetchSPYBars(apiKey: string): Promise<any[]> {
  if (spyBarsCache && Date.now() - spyBarsCache.timestamp < CACHE_TTL_MS) return spyBarsCache.bars;
  const toDate = new Date().toISOString().split("T")[0];
  const fromDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  try {
    const url = `${BASE_URL}/v2/aggs/ticker/SPY/range/1/day/${fromDate}/${toDate}?adjusted=true&sort=asc&limit=300&apiKey=${apiKey}`;
    const res = await fetchWithTimeout(url, {}, 8000);
    if (res.ok) {
      const data = await res.json();
      const bars = data.results || [];
      spyBarsCache = { bars, timestamp: Date.now() };
      return bars;
    }
  } catch {}
  return [];
}

async function computePerformanceMetrics(
  ticker: string,
  apiKey: string,
  pe: number | null,
  epsGrowth: number | null,
  spyBars: any[]
): Promise<PerformanceMetrics> {
  const cached = performanceCache.get(ticker);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) return cached.data;

  const result: PerformanceMetrics = {
    changePercent1W: null, changePercent1M: null, changePercentYTD: null,
    beta: null, volatility: null, maxDrawdown: null, stdDev: null,
    peg: calculatePEG(pe, epsGrowth),
    shortDescription: null,
  };

  try {
    const toDate = new Date().toISOString().split("T")[0];
    const fromDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const aggUrl = `${BASE_URL}/v2/aggs/ticker/${encodeURIComponent(ticker)}/range/1/day/${fromDate}/${toDate}?adjusted=true&sort=asc&limit=300&apiKey=${apiKey}`;
    const aggRes = await fetchWithTimeout(aggUrl, {}, 8000);
    if (!aggRes.ok) { performanceCache.set(ticker, { data: result, timestamp: Date.now() }); return result; }

    const aggData = await aggRes.json();
    const bars: any[] = aggData.results || [];
    if (bars.length < 2) { performanceCache.set(ticker, { data: result, timestamp: Date.now() }); return result; }

    const closes: number[] = bars.map((b: any) => b.c);
    const dates: number[] = bars.map((b: any) => b.t); // ms timestamps
    const latestClose = closes[closes.length - 1];

    // 1W: ~5 trading days ago
    if (closes.length > 5) {
      const ref = closes[closes.length - 6];
      if (ref > 0) result.changePercent1W = Math.round(((latestClose - ref) / ref) * 10000) / 100;
    }
    // 1M: ~21 trading days ago
    if (closes.length > 21) {
      const ref = closes[closes.length - 22];
      if (ref > 0) result.changePercent1M = Math.round(((latestClose - ref) / ref) * 10000) / 100;
    }
    // YTD: find first bar of current year
    const currentYear = new Date().getFullYear();
    const ytdStartMs = new Date(`${currentYear}-01-01`).getTime();
    const ytdBar = bars.find((b: any) => b.t >= ytdStartMs);
    if (ytdBar && ytdBar.c > 0) {
      result.changePercentYTD = Math.round(((latestClose - ytdBar.c) / ytdBar.c) * 10000) / 100;
    }

    // Max drawdown
    result.maxDrawdown = calculateMaxDrawdown(closes);

    // Daily returns for volatility + beta
    const dailyReturns: number[] = [];
    for (let i = 1; i < closes.length; i++) {
      if (closes[i - 1] > 0) dailyReturns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
    }

    // Volatility (annualized from last 30 daily returns)
    const recentReturns = dailyReturns.slice(-30);
    const sd = calculateStdDev(recentReturns);
    if (sd != null) {
      result.volatility = Math.round(sd * Math.sqrt(252) * 10000) / 100; // annualized %
      result.stdDev = sd;
    }

    // Beta vs SPY
    if (spyBars.length > 0 && bars.length > 20) {
      // Align by date (ms timestamp)
      const spyMap = new Map<string, number>();
      for (let i = 1; i < spyBars.length; i++) {
        if (spyBars[i - 1].c > 0) {
          const dateKey = new Date(spyBars[i].t).toISOString().split("T")[0];
          spyMap.set(dateKey, (spyBars[i].c - spyBars[i - 1].c) / spyBars[i - 1].c);
        }
      }
      const alignedStock: number[] = [];
      const alignedSpy: number[] = [];
      for (let i = 1; i < bars.length; i++) {
        if (closes[i - 1] > 0) {
          const dateKey = new Date(bars[i].t).toISOString().split("T")[0];
          const spyRet = spyMap.get(dateKey);
          if (spyRet !== undefined) {
            alignedStock.push((closes[i] - closes[i - 1]) / closes[i - 1]);
            alignedSpy.push(spyRet);
          }
        }
      }
      result.beta = calculateBeta(alignedStock, alignedSpy);
    }
  } catch (err) {
    console.warn(`[polygon-screener] Error computing performance for ${ticker}:`, err);
  }

  performanceCache.set(ticker, { data: result, timestamp: Date.now() });
  if (performanceCache.size > 500) {
    const oldest = [...performanceCache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
    if (oldest) performanceCache.delete(oldest[0]);
  }
  return result;
}

// Fetch performance for a batch of tickers (parallel, limited)
async function fetchBatchPerformance(
  tickers: { symbol: string; pe: number | null; epsGrowth: number | null }[],
  apiKey: string,
  maxTickers = 15
): Promise<Map<string, PerformanceMetrics>> {
  const results = new Map<string, PerformanceMetrics>();
  const spyBars = await fetchSPYBars(apiKey);
  const toFetch = tickers.slice(0, maxTickers);
  
  for (const batch of chunk(toFetch, 5)) {
    await Promise.allSettled(batch.map(async (t) => {
      const perf = await computePerformanceMetrics(t.symbol, apiKey, t.pe, t.epsGrowth, spyBars);
      results.set(t.symbol, perf);
    }));
  }
  return results;
}

// Fetch ticker descriptions from Polygon
const descriptionCache = new Map<string, { desc: string | null; timestamp: number }>();

async function fetchTickerDescription(ticker: string, apiKey: string): Promise<string | null> {
  const cached = descriptionCache.get(ticker);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) return cached.desc;
  try {
    const url = `${BASE_URL}/v3/reference/tickers/${encodeURIComponent(ticker)}?apiKey=${apiKey}`;
    const res = await fetchWithTimeout(url, {}, 5000);
    if (res.ok) {
      const data = await res.json();
      const desc = data.results?.description || null;
      // Truncate to first 2 sentences for preview
      let short = desc;
      if (desc && desc.length > 200) {
        const sentences = desc.match(/[^.!?]+[.!?]+/g);
        short = sentences ? sentences.slice(0, 2).join(' ').trim() : desc.slice(0, 200) + '…';
      }
      descriptionCache.set(ticker, { desc: short, timestamp: Date.now() });
      if (descriptionCache.size > 300) {
        const oldest = [...descriptionCache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
        if (oldest) descriptionCache.delete(oldest[0]);
      }
      return short;
    }
  } catch {}
  descriptionCache.set(ticker, { desc: null, timestamp: Date.now() });
  return null;
}

async function fetchBatchDescriptions(tickers: string[], apiKey: string, max = 15): Promise<Map<string, string | null>> {
  const results = new Map<string, string | null>();
  const toFetch = tickers.slice(0, max);
  for (const batch of chunk(toFetch, 5)) {
    await Promise.allSettled(batch.map(async (t) => {
      const desc = await fetchTickerDescription(t, apiKey);
      results.set(t, desc);
    }));
  }
  return results;
}

// ---- Fundamentals ----

async function fetchTickerFundamentals(ticker: string, apiKey: string, price: number, marketCap: number | null): Promise<TickerFundamentals> {
  const cached = getCachedFundamentals(ticker);
  if (cached) return cached;

  const fundamentals: TickerFundamentals = {
    pe: null, forwardPE: null, pb: null, evEbitda: null,
    debtEquity: null, quickRatio: null, opMargin: null,
    epsGrowth: null, revenueGrowth: null,
  };

  try {
    // Use Polygon's vX financials endpoint (correct URL)
    const financialsUrl = `${BASE_URL}/vX/reference/financials?ticker=${encodeURIComponent(ticker)}&timeframe=annual&order=desc&limit=2&sort=period_of_report_date&apiKey=${apiKey}`;
    const financialsRes = await fetchWithTimeout(financialsUrl, {}, 8000);
    if (financialsRes.ok) {
      const financialsJson = await financialsRes.json();
      const results = financialsJson?.results || [];
      const latest = results[0]?.financials || null;
      const previous = results.length > 1 ? results[1]?.financials : null;

      if (latest) {
        // Extract EPS and compute PE
        const dilutedEps = latest.income_statement?.diluted_earnings_per_share?.value;
        if (typeof dilutedEps === "number" && dilutedEps > 0 && price > 0) {
          fundamentals.pe = Math.round((price / dilutedEps) * 100) / 100;
        }

        // Revenue and operating income for margins
        const revenue = latest.income_statement?.revenues?.value;
        const opIncome = latest.income_statement?.operating_income_loss?.value;
        if (typeof revenue === "number" && revenue > 0 && typeof opIncome === "number") {
          fundamentals.opMargin = Math.round((opIncome / revenue) * 10000) / 100;
        }

        // Balance sheet ratios
        const totalDebt = latest.balance_sheet?.long_term_debt?.value ?? latest.balance_sheet?.noncurrent_liabilities?.value;
        const equity = latest.balance_sheet?.equity?.value ?? latest.balance_sheet?.equity_attributable_to_parent?.value;
        if (typeof totalDebt === "number" && typeof equity === "number" && equity > 0) {
          fundamentals.debtEquity = Math.round((totalDebt / equity) * 100) / 100;
        }

        const currentAssets = latest.balance_sheet?.current_assets?.value;
        const inventory = latest.balance_sheet?.inventory?.value ?? 0;
        const currentLiabilities = latest.balance_sheet?.current_liabilities?.value;
        if (typeof currentAssets === "number" && typeof currentLiabilities === "number" && currentLiabilities > 0) {
          fundamentals.quickRatio = Math.round(((currentAssets - (typeof inventory === "number" ? inventory : 0)) / currentLiabilities) * 100) / 100;
        }

        // Book value per share for P/B
        const bookValue = latest.balance_sheet?.equity_attributable_to_parent?.value ?? equity;
        const shares = latest.income_statement?.basic_average_shares?.value ?? latest.income_statement?.diluted_average_shares?.value;
        if (typeof bookValue === "number" && typeof shares === "number" && shares > 0 && price > 0) {
          const bvps = bookValue / shares;
          if (bvps > 0) fundamentals.pb = Math.round((price / bvps) * 100) / 100;
        }

        // EV/EBITDA
        const ebitda = latest.income_statement?.operating_income_loss?.value;
        if (typeof ebitda === "number" && ebitda > 0 && marketCap && marketCap > 0) {
          const ev = marketCap + (typeof totalDebt === "number" ? totalDebt : 0);
          fundamentals.evEbitda = Math.round((ev / ebitda) * 100) / 100;
        }

        // Growth metrics (compare to previous period)
        if (previous) {
          const prevRevenue = previous.income_statement?.revenues?.value;
          const prevEps = previous.income_statement?.diluted_earnings_per_share?.value;
          if (typeof prevRevenue === "number" && prevRevenue > 0 && typeof revenue === "number" && revenue > 0) {
            fundamentals.revenueGrowth = Math.round(((revenue - prevRevenue) / prevRevenue) * 10000) / 100;
          }
          if (typeof prevEps === "number" && prevEps > 0 && typeof dilutedEps === "number" && dilutedEps > 0) {
            fundamentals.epsGrowth = Math.round(((dilutedEps - prevEps) / Math.abs(prevEps)) * 10000) / 100;
          }
        }
      }
    }

    setCachedFundamentals(ticker, fundamentals);
    return fundamentals;
  } catch (err) {
    console.warn(`[polygon-screener] Error fetching fundamentals for ${ticker}:`, err);
    setCachedFundamentals(ticker, fundamentals);
    return fundamentals;
  }
}

async function fetchBatchFundamentals(
  tickers: { symbol: string; price: number; marketCap: number | null }[],
  apiKey: string,
  maxTickers = 20
): Promise<Map<string, TickerFundamentals>> {
  const results = new Map<string, TickerFundamentals>();
  const tickersToFetch = tickers.slice(0, maxTickers);
  for (const ch of chunk(tickersToFetch, 10)) {
    await Promise.allSettled(ch.map(async (t) => {
      const fundamentals = await fetchTickerFundamentals(t.symbol, apiKey, t.price, t.marketCap);
      results.set(t.symbol, fundamentals);
    }));
  }
  return results;
}

// ---- Sector mapping ----

const SIC_TO_SECTOR: Record<string, string> = {
  "1": "Agriculture", "10": "Mining", "15": "Construction",
  "20": "Manufacturing", "35": "Technology", "36": "Technology",
  "37": "Industrials", "38": "Technology", "39": "Consumer Discretionary",
  "40": "Transportation", "45": "Transportation", "48": "Communication Services",
  "49": "Utilities", "50": "Consumer Discretionary", "51": "Consumer Discretionary",
  "52": "Consumer Discretionary", "53": "Consumer Discretionary",
  "54": "Consumer Staples", "55": "Consumer Discretionary",
  "56": "Consumer Discretionary", "57": "Consumer Discretionary",
  "58": "Consumer Discretionary", "59": "Consumer Discretionary",
  "60": "Financials", "61": "Financials", "62": "Financials",
  "63": "Financials", "64": "Financials", "65": "Real Estate",
  "67": "Financials", "70": "Consumer Discretionary",
  "72": "Consumer Discretionary", "73": "Technology",
  "78": "Communication Services", "79": "Communication Services",
  "80": "Healthcare", "81": "Technology", "82": "Consumer Discretionary",
  "83": "Consumer Discretionary", "87": "Technology", "99": "Other",
};

function getSectorFromSIC(sicCode: string | null): string {
  if (!sicCode) return "Unknown";
  const prefix = sicCode.substring(0, 2);
  return SIC_TO_SECTOR[prefix] || "Other";
}

// ---- Filter types ----

interface CustomFilter {
  operator: string;
  value: number;
  value2?: number;
}

interface ScreenerFilters {
  query?: string;
  minMarketCap?: number;
  maxMarketCap?: number;
  minPrice?: number;
  maxPrice?: number;
  sectors?: string[];
  minChange1D?: number;
  maxChange1D?: number;
  minVolume?: number;
  minRelativeVolume?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
  minPE?: number; maxPE?: number;
  minForwardPE?: number; maxForwardPE?: number;
  minPEG?: number; maxPEG?: number;
  minPB?: number; maxPB?: number;
  minEvEbitda?: number; maxEvEbitda?: number;
  minOpMargin?: number; maxOpMargin?: number;
  minDebtEquity?: number; maxDebtEquity?: number;
  minQuickRatio?: number; maxQuickRatio?: number;
  minVolatility?: number; maxVolatility?: number;
  minBeta?: number; maxBeta?: number;
  minEpsGrowth?: number; maxEpsGrowth?: number;
  minRevenueGrowth?: number; maxRevenueGrowth?: number;
  customFilters?: {
    peg?: CustomFilter;
    drawdown?: CustomFilter;
    stdDev?: CustomFilter;
  };
}

function applyCustomFilter(actual: number | null, filter: CustomFilter): boolean {
  if (actual == null) return false;
  const { operator, value, value2 } = filter;
  switch (operator) {
    case '<': return actual < value;
    case '>': return actual > value;
    case '<=': return actual <= value;
    case '>=': return actual >= value;
    case '=': return Math.abs(actual - value) < 0.001;
    case 'between': return value2 != null ? actual >= value && actual <= value2 : actual >= value;
    default: return true;
  }
}

function hasCustomFilters(filters: ScreenerFilters): boolean {
  const cf = filters.customFilters;
  return !!(cf && (cf.peg || cf.drawdown || cf.stdDev));
}

function applyFundamentalFilters(results: any[], filters: ScreenerFilters): any[] {
  return results.filter(r => {
    if (filters.minPE !== undefined && (r.pe === null || r.pe < filters.minPE)) return false;
    if (filters.maxPE !== undefined && r.pe !== null && r.pe > filters.maxPE) return false;
    if (filters.minForwardPE !== undefined && (r.forwardPE === null || r.forwardPE < filters.minForwardPE)) return false;
    if (filters.maxForwardPE !== undefined && r.forwardPE !== null && r.forwardPE > filters.maxForwardPE) return false;
    if (filters.minPEG !== undefined && (r.peg === null || r.peg < filters.minPEG)) return false;
    if (filters.maxPEG !== undefined && r.peg !== null && r.peg > filters.maxPEG) return false;
    if (filters.minPB !== undefined && (r.pb === null || r.pb < filters.minPB)) return false;
    if (filters.maxPB !== undefined && r.pb !== null && r.pb > filters.maxPB) return false;
    if (filters.minEvEbitda !== undefined && (r.evEbitda === null || r.evEbitda < filters.minEvEbitda)) return false;
    if (filters.maxEvEbitda !== undefined && r.evEbitda !== null && r.evEbitda > filters.maxEvEbitda) return false;
    if (filters.minOpMargin !== undefined && (r.opMargin === null || r.opMargin < filters.minOpMargin)) return false;
    if (filters.maxOpMargin !== undefined && r.opMargin !== null && r.opMargin > filters.maxOpMargin) return false;
    if (filters.minDebtEquity !== undefined && (r.debtEquity === null || r.debtEquity < filters.minDebtEquity)) return false;
    if (filters.maxDebtEquity !== undefined && r.debtEquity !== null && r.debtEquity > filters.maxDebtEquity) return false;
    if (filters.minQuickRatio !== undefined && (r.quickRatio === null || r.quickRatio < filters.minQuickRatio)) return false;
    if (filters.maxQuickRatio !== undefined && r.quickRatio !== null && r.quickRatio > filters.maxQuickRatio) return false;
    if (filters.minVolatility !== undefined && (r.volatility === null || r.volatility < filters.minVolatility)) return false;
    if (filters.maxVolatility !== undefined && r.volatility !== null && r.volatility > filters.maxVolatility) return false;
    if (filters.minBeta !== undefined && (r.beta === null || r.beta < filters.minBeta)) return false;
    if (filters.maxBeta !== undefined && r.beta !== null && r.beta > filters.maxBeta) return false;
    if (filters.minEpsGrowth !== undefined && (r.epsGrowth === null || r.epsGrowth < filters.minEpsGrowth)) return false;
    if (filters.maxEpsGrowth !== undefined && r.epsGrowth !== null && r.epsGrowth > filters.maxEpsGrowth) return false;
    if (filters.minRevenueGrowth !== undefined && (r.revenueGrowth === null || r.revenueGrowth < filters.minRevenueGrowth)) return false;
    if (filters.maxRevenueGrowth !== undefined && r.revenueGrowth !== null && r.revenueGrowth > filters.maxRevenueGrowth) return false;
    return true;
  });
}

function hasMetricFilters(filters: ScreenerFilters): boolean {
  return filters.minPE !== undefined || filters.maxPE !== undefined ||
    filters.minForwardPE !== undefined || filters.maxForwardPE !== undefined ||
    filters.minPEG !== undefined || filters.maxPEG !== undefined ||
    filters.minPB !== undefined || filters.maxPB !== undefined ||
    filters.minEvEbitda !== undefined || filters.maxEvEbitda !== undefined ||
    filters.minOpMargin !== undefined || filters.maxOpMargin !== undefined ||
    filters.minDebtEquity !== undefined || filters.maxDebtEquity !== undefined ||
    filters.minQuickRatio !== undefined || filters.maxQuickRatio !== undefined ||
    filters.minVolatility !== undefined || filters.maxVolatility !== undefined ||
    filters.minBeta !== undefined || filters.maxBeta !== undefined ||
    filters.minEpsGrowth !== undefined || filters.maxEpsGrowth !== undefined ||
    filters.minRevenueGrowth !== undefined || filters.maxRevenueGrowth !== undefined;
}

// ---- Enrichment: merge fundamentals + performance into a result ----

function enrichResult(base: any, f: TickerFundamentals | undefined, perf: PerformanceMetrics | undefined, desc: string | null | undefined): any {
  return {
    ...base,
    pe: f?.pe ?? null,
    forwardPE: f?.forwardPE ?? null,
    peg: perf?.peg ?? calculatePEG(f?.pe ?? null, f?.epsGrowth ?? null),
    pb: f?.pb ?? null,
    pCash: null,
    evEbitda: f?.evEbitda ?? null,
    opMargin: f?.opMargin ?? null,
    epsGrowth: f?.epsGrowth ?? null,
    revenueGrowth: f?.revenueGrowth ?? null,
    debtEquity: f?.debtEquity ?? null,
    quickRatio: f?.quickRatio ?? null,
    // Performance
    changePercent1W: perf?.changePercent1W ?? base.changePercent1W ?? null,
    changePercent1M: perf?.changePercent1M ?? base.changePercent1M ?? null,
    changePercentYTD: perf?.changePercentYTD ?? base.changePercentYTD ?? null,
    beta: perf?.beta ?? base.beta ?? null,
    volatility: perf?.volatility ?? base.volatility ?? null,
    // Risk
    sharpe: null,
    maxDrawdown: perf?.maxDrawdown ?? null,
    stdDev: perf?.stdDev ?? null,
    // Description
    shortDescription: desc ?? base.shortDescription ?? null,
  };
}

// ---- Snapshot types ----

interface TickerSnapshot {
  ticker: string;
  todaysChange: number;
  todaysChangePerc: number;
  updated: number;
  day: { o: number; h: number; l: number; c: number; v: number; vw: number };
  prevDay: { o: number; h: number; l: number; c: number; v: number; vw: number };
  min?: { o: number; h: number; l: number; c: number; v: number; vw: number };
}

interface TickerDetails {
  ticker: string;
  name: string;
  market_cap?: number;
  sic_code?: string;
  sic_description?: string;
  primary_exchange?: string;
  type?: string;
  description?: string;
}

// ---- Main handler ----

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const POLYGON_API_KEY = Deno.env.get("POLYGON_API_KEY") || Deno.env.get("VITE_POLYGON_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!POLYGON_API_KEY) {
      return json({ ok: false, error: "Polygon API key not configured" }, 500);
    }

    const body = await req.json().catch(() => ({}));
    const filters: ScreenerFilters = body.filters || {};
    const limit = Math.min(filters.limit || 100, 500);
    const offset = filters.offset || 0;

    console.log(`[polygon-screener] Running screen with filters:`, JSON.stringify(filters).slice(0, 500));

    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { count } = await supabase
      .from("asset_universe")
      .select("*", { count: "exact", head: true })
      .or("is_active.is.null,is_active.eq.true");

    if (count && count > 100) {
      console.log(`[polygon-screener] Using database-first approach with ${count} tickers`);
      return await screenFromDatabase(supabase, filters, limit, offset, POLYGON_API_KEY);
    }

    return await screenFromPolygonAPI(filters, limit, offset, POLYGON_API_KEY);

  } catch (error) {
    console.error("[polygon-screener] Error:", error);
    return json({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

// ---- Database-first screening ----

async function screenFromDatabase(
  supabase: any,
  filters: ScreenerFilters,
  limit: number,
  offset: number,
  apiKey: string
) {
  console.log("[polygon-screener] Screening from database...");

  const metricFiltersActive = hasMetricFilters(filters);
  const sortBy = filters.sortBy || "volume";
  const sortDir = filters.sortDirection || "desc";
  const needsLiveChangeData =
    filters.minChange1D !== undefined ||
    filters.maxChange1D !== undefined ||
    sortBy === "change";
  const scanFromStart = metricFiltersActive || needsLiveChangeData;
  const SCAN_LIMIT = scanFromStart ? 5000 : limit;

  function buildFilteredQuery(selectFields: string, opts?: { count?: "exact" }) {
    let q = supabase
      .from("asset_universe")
      .select(selectFields, opts ? { count: opts.count } : undefined)
      .or("is_active.is.null,is_active.eq.true");

    if (filters.minMarketCap !== undefined) {
      const minCap = filters.minMarketCap;
      if (minCap >= 200_000_000_000) q = q.eq("market_cap_tier", "Mega");
      else if (minCap >= 10_000_000_000) q = q.in("market_cap_tier", ["Mega", "Large"]);
      else if (minCap >= 2_000_000_000) q = q.in("market_cap_tier", ["Mega", "Large", "Mid"]);
      else if (minCap >= 300_000_000) q = q.in("market_cap_tier", ["Mega", "Large", "Mid", "Small"]);
    }
    if (filters.maxMarketCap !== undefined) {
      const maxCap = filters.maxMarketCap;
      if (maxCap < 300_000_000) q = q.eq("market_cap_tier", "Micro");
      else if (maxCap < 2_000_000_000) q = q.in("market_cap_tier", ["Micro", "Small"]);
      else if (maxCap < 10_000_000_000) q = q.in("market_cap_tier", ["Micro", "Small", "Mid"]);
      else if (maxCap < 200_000_000_000) q = q.in("market_cap_tier", ["Micro", "Small", "Mid", "Large"]);
    }
    if (filters.sectors && filters.sectors.length > 0) q = q.in("sector", filters.sectors);
    if (filters.minPrice !== undefined) q = q.gte("last_close", filters.minPrice);
    if (filters.maxPrice !== undefined) q = q.lte("last_close", filters.maxPrice);
    if (filters.minVolume !== undefined) q = q.gte("avg_daily_volume", filters.minVolume);
    if (!needsLiveChangeData && filters.minChange1D !== undefined) q = q.gte("change_percent_1d", filters.minChange1D);
    if (!needsLiveChangeData && filters.maxChange1D !== undefined) q = q.lte("change_percent_1d", filters.maxChange1D);
    return q;
  }

  let sortColumn = "avg_daily_volume";
  switch (sortBy) {
    case "change": sortColumn = needsLiveChangeData ? "avg_daily_volume" : "change_percent_1d"; break;
    case "price": sortColumn = "last_close"; break;
    case "marketCap": sortColumn = "avg_daily_dollar_volume"; break;
  }

  const { count: baseCount } = await buildFilteredQuery("ticker", { count: "exact" });

  const PAGE_SIZE = 1000;
  const totalToFetch = scanFromStart ? Math.min(SCAN_LIMIT, baseCount ?? SCAN_LIMIT) : limit;
  const fetchStart = scanFromStart ? 0 : offset;
  const allRows: any[] = [];

  for (let cursor = fetchStart; cursor < fetchStart + totalToFetch; cursor += PAGE_SIZE) {
    const end = Math.min(cursor + PAGE_SIZE - 1, fetchStart + totalToFetch - 1);
    const q = buildFilteredQuery(
      "ticker, name, sector, market_cap_tier, last_close, change_percent_1d, avg_daily_volume, avg_daily_dollar_volume, primary_exchange, asset_type, metadata, industry"
    )
      .order(sortColumn, { ascending: sortDir === "asc", nullsFirst: false })
      .range(cursor, end);

    const { data: pageRows, error: pageError } = await q;
    if (pageError) {
      console.error("[polygon-screener] Database page error:", pageError);
      return json({ ok: false, error: pageError.message }, 500);
    }
    if (pageRows) allRows.push(...pageRows);
    if (!pageRows || pageRows.length < PAGE_SIZE) break;
  }

  console.log(`[polygon-screener] Base matches: ${baseCount ?? allRows.length}. Processing ${allRows.length}`);

  // Fetch live snapshots
  const snapshotMap = new Map<string, any>();
  const tickersToFetch = allRows.map((r: any) => r.ticker);

  if (tickersToFetch.length > 0) {
    for (let i = 0; i < tickersToFetch.length; i += 50) {
      const batch = tickersToFetch.slice(i, i + 50);
      try {
        const snapshotUrl = `${BASE_URL}/v2/snapshot/locale/us/markets/stocks/tickers?tickers=${batch.join(",")}&apiKey=${apiKey}`;
        const res = await fetchWithTimeout(snapshotUrl);
        if (res.ok) {
          const data = await res.json();
          for (const t of data.tickers || []) snapshotMap.set(t.ticker, t);
        }
      } catch (err) {
        console.warn("[polygon-screener] Snapshot batch error:", err);
      }
    }
  }

  const buildBaseResult = (row: any) => {
    const snapshot = snapshotMap.get(row.ticker);
    const marketCap = row.metadata?.market_cap || null;

    if (snapshot) {
      const { preferredBar, currentPrice, change, changePercent, hasLiveData } = getSnapshotMetrics(snapshot);

      return {
        symbol: row.ticker,
        name: row.name,
        sector: row.sector,
        sicDescription: row.industry || null,
        price: currentPrice,
        change,
        changePercent,
        changePercent1W: null,
        changePercent1M: null,
        changePercentYTD: null,
        volume: preferredBar?.v || row.avg_daily_volume || 0,
        prevVolume: snapshot.prevDay?.v || 0,
        relativeVolume: snapshot.prevDay?.v > 0 && hasLiveData ? (preferredBar?.v || 0) / snapshot.prevDay.v : null,
        marketCap,
        high: preferredBar?.h || 0,
        low: preferredBar?.l || 0,
        open: preferredBar?.o || 0,
        vwap: preferredBar?.vw || null,
        exchange: row.primary_exchange || null,
        type: row.asset_type || null,
        volatility: null,
        beta: null,
        shortDescription: null,
      };
    }

    return {
      symbol: row.ticker,
      name: row.name,
      sector: row.sector,
      sicDescription: row.industry || null,
      price: row.last_close || 0,
      change: 0,
      changePercent: row.change_percent_1d || 0,
      changePercent1W: null,
      changePercent1M: null,
      changePercentYTD: null,
      volume: row.avg_daily_volume || 0,
      prevVolume: 0,
      relativeVolume: null,
      marketCap,
      high: 0,
      low: 0,
      open: 0,
      vwap: null,
      exchange: row.primary_exchange || null,
      type: row.asset_type || null,
      volatility: null,
      beta: null,
      shortDescription: null,
    };
  };

  const baseResults = allRows.map(buildBaseResult);

  const liveFilteredBaseResults = needsLiveChangeData
    ? baseResults.filter((result) => {
        if (!snapshotMap.has(result.symbol)) return false;
        if (filters.minChange1D !== undefined && result.changePercent < filters.minChange1D) return false;
        if (filters.maxChange1D !== undefined && result.changePercent > filters.maxChange1D) return false;
        return true;
      })
    : baseResults;

  const sortedBaseResults = needsLiveChangeData
    ? [...liveFilteredBaseResults].sort((a, b) => {
        let aVal: number, bVal: number;
        switch (sortBy) {
          case "change": aVal = a.changePercent ?? 0; bVal = b.changePercent ?? 0; break;
          case "price": aVal = a.price ?? 0; bVal = b.price ?? 0; break;
          case "marketCap": aVal = a.marketCap ?? 0; bVal = b.marketCap ?? 0; break;
          default: aVal = a.volume ?? 0; bVal = b.volume ?? 0;
        }
        return sortDir === "desc" ? bVal - aVal : aVal - bVal;
      })
    : liveFilteredBaseResults;

  const paginatedBaseResults = scanFromStart
    ? sortedBaseResults.slice(offset, offset + limit)
    : sortedBaseResults;
  const totalBaseResults = scanFromStart
    ? sortedBaseResults.length
    : (baseCount ?? sortedBaseResults.length);

  if (!metricFiltersActive) {
    // Fetch fundamentals
    const fundamentalsMap = await fetchBatchFundamentals(
      paginatedBaseResults.map((r: any) => ({ symbol: r.symbol, price: r.price, marketCap: r.marketCap })),
      apiKey,
      Math.min(paginatedBaseResults.length, 20)
    );

    // Fetch performance metrics (1W, 1M, YTD, beta, volatility) for displayed page
    const perfMap = await fetchBatchPerformance(
      paginatedBaseResults.map((r: any) => ({
        symbol: r.symbol,
        pe: fundamentalsMap.get(r.symbol)?.pe ?? null,
        epsGrowth: fundamentalsMap.get(r.symbol)?.epsGrowth ?? null,
      })),
      apiKey,
      Math.min(paginatedBaseResults.length, 15)
    );

    // Fetch descriptions for tickers missing shortDescription
    const needDesc = paginatedBaseResults.filter((r: any) => !r.shortDescription).map((r: any) => r.symbol);
    const descMap = needDesc.length > 0 ? await fetchBatchDescriptions(needDesc, apiKey, 10) : new Map();

    const results = paginatedBaseResults.map((r: any) => {
      return enrichResult(r, fundamentalsMap.get(r.symbol), perfMap.get(r.symbol), descMap.get(r.symbol));
    });

    return json({
      ok: true,
      count: totalBaseResults,
      results,
      pagination: { offset, limit, hasMore: totalBaseResults > offset + limit, total: totalBaseResults },
      source: "database",
    });
  }

  // Metric filters active: scan in chunks
  const enrichedMatches: any[] = [];
  const CHUNK_SIZE = 25;

  for (let i = 0; i < sortedBaseResults.length; i += CHUNK_SIZE) {
    const chunkResults = sortedBaseResults.slice(i, i + CHUNK_SIZE);

    const fundamentalsMap = await fetchBatchFundamentals(
      chunkResults.map((r: any) => ({ symbol: r.symbol, price: r.price, marketCap: r.marketCap })),
      apiKey,
      chunkResults.length
    );

    const perfMap = await fetchBatchPerformance(
      chunkResults.map((r: any) => ({
        symbol: r.symbol,
        pe: fundamentalsMap.get(r.symbol)?.pe ?? null,
        epsGrowth: fundamentalsMap.get(r.symbol)?.epsGrowth ?? null,
      })),
      apiKey,
      chunkResults.length
    );

    const enrichedChunk = chunkResults.map((r: any) => enrichResult(r, fundamentalsMap.get(r.symbol), perfMap.get(r.symbol), null));

    let matching = applyFundamentalFilters(enrichedChunk, filters);
    if (hasCustomFilters(filters)) {
      const cf = filters.customFilters!;
      matching = matching.filter((r: any) => {
        if (cf.peg && !applyCustomFilter(r.peg, cf.peg)) return false;
        if (cf.drawdown && !applyCustomFilter(r.maxDrawdown, cf.drawdown)) return false;
        if (cf.stdDev && !applyCustomFilter(r.stdDev, cf.stdDev)) return false;
        return true;
      });
    }

    enrichedMatches.push(...matching);
    if (enrichedMatches.length >= offset + limit) break;
  }

  // Fetch descriptions for final page
  const pageResults = enrichedMatches.slice(offset, offset + limit);
  const needDesc = pageResults.filter((r: any) => !r.shortDescription).map((r: any) => r.symbol);
  const descMap = needDesc.length > 0 ? await fetchBatchDescriptions(needDesc, apiKey, 10) : new Map();
  const results = pageResults.map((r: any) => ({
    ...r,
    shortDescription: descMap.get(r.symbol) ?? r.shortDescription ?? null,
  }));

  const totalCount = enrichedMatches.length;
  const mayHaveMore = (baseCount ?? 0) > 5000;

  return json({
    ok: true,
    count: totalCount,
    results,
    pagination: { offset, limit, hasMore: offset + limit < totalCount || mayHaveMore, total: totalCount },
    source: "database",
  });
}

// ---- Polygon API fallback ----

async function screenFromPolygonAPI(
  filters: ScreenerFilters,
  limit: number,
  offset: number,
  apiKey: string
) {
  console.log("[polygon-screener] Screening from Polygon API...");

  const snapshotUrl = `${BASE_URL}/v2/snapshot/locale/us/markets/stocks/tickers?apiKey=${apiKey}`;
  const snapshotRes = await fetchWithTimeout(snapshotUrl);

  if (!snapshotRes.ok) {
    const errorText = await snapshotRes.text();
    console.error(`[polygon-screener] Snapshot API error:`, errorText);
    if (snapshotRes.status === 403 || snapshotRes.status === 401) {
      return json({ ok: false, error: "Polygon Snapshot API requires Stocks Starter plan or higher.", fallback: true }, 403);
    }
    return json({ ok: false, error: `Polygon API error: ${snapshotRes.status}` }, snapshotRes.status);
  }

  const snapshotData = await snapshotRes.json();
  const tickers: TickerSnapshot[] = snapshotData.tickers || [];
  console.log(`[polygon-screener] Got ${tickers.length} tickers from snapshot`);

  const hasFundamentalFilters =
    filters.minMarketCap !== undefined ||
    filters.maxMarketCap !== undefined ||
    (filters.sectors && filters.sectors.length > 0);

  const tickersWithLiveData = tickers.filter((t) => hasLiveSnapshotData(t)).length;
  const marketClosed = tickersWithLiveData < tickers.length * 0.1;

  let filteredTickers = tickers.filter((t) => {
    const { preferredBar, currentPrice, changePercent, hasLiveData } = getSnapshotMetrics(t);
    const price = currentPrice;
    const volume = preferredBar?.v || t.prevDay?.v || 0;
    if (price <= 0 || !t.prevDay || !t.prevDay.c || t.prevDay.c <= 0) return false;
    if (filters.minPrice !== undefined && price < filters.minPrice) return false;
    if (filters.maxPrice !== undefined && price > filters.maxPrice) return false;
    if (!hasFundamentalFilters) {
      if (filters.minChange1D !== undefined && changePercent < filters.minChange1D) return false;
      if (filters.maxChange1D !== undefined && changePercent > filters.maxChange1D) return false;
    }
    if (filters.minVolume !== undefined && volume < filters.minVolume) return false;
    if (!hasFundamentalFilters && filters.minRelativeVolume !== undefined && t.prevDay?.v > 0 && hasLiveData) {
      if ((preferredBar?.v || 0) / t.prevDay.v < filters.minRelativeVolume) return false;
    }
    return true;
  });

  const sortBy = filters.sortBy || "volume";
  const sortDir = filters.sortDirection || "desc";

  filteredTickers.sort((a, b) => {
    let aVal: number, bVal: number;
    const aMetrics = getSnapshotMetrics(a);
    const bMetrics = getSnapshotMetrics(b);
    const aPrice = aMetrics.currentPrice;
    const bPrice = bMetrics.currentPrice;
    switch (sortBy) {
      case "change":
        aVal = aMetrics.changePercent;
        bVal = bMetrics.changePercent;
        break;
      case "price": aVal = aPrice; bVal = bPrice; break;
      default:
        aVal = aMetrics.preferredBar?.v || a.prevDay?.v || 0;
        bVal = bMetrics.preferredBar?.v || b.prevDay?.v || 0;
    }
    return sortDir === "desc" ? bVal - aVal : aVal - bVal;
  });

  const maxCandidates = hasFundamentalFilters ? 500 : 200;
  const candidateTickers = filteredTickers.slice(0, maxCandidates);

  // Fetch ticker details
  const tickerDetails: Map<string, TickerDetails> = new Map();
  for (let i = 0; i < candidateTickers.length; i += 10) {
    const batch = candidateTickers.slice(i, i + 10);
    const results = await Promise.allSettled(batch.map(async (t) => {
      try {
        const url = `${BASE_URL}/v3/reference/tickers/${encodeURIComponent(t.ticker)}?apiKey=${apiKey}`;
        const res = await fetchWithTimeout(url, {}, 8000);
        if (res.ok) {
          const data = await res.json();
          if (data.results) return { ticker: t.ticker, details: data.results as TickerDetails };
        }
      } catch {}
      return null;
    }));
    results.forEach((r) => {
      if (r.status === "fulfilled" && r.value) tickerDetails.set(r.value.ticker, r.value.details);
    });
    if (i + 10 < candidateTickers.length) await new Promise((resolve) => setTimeout(resolve, 100));
  }

  let finalResults = candidateTickers.filter((t) => {
    const details = tickerDetails.get(t.ticker);
    if (filters.minMarketCap !== undefined && (!details?.market_cap || details.market_cap < filters.minMarketCap)) return false;
    if (filters.maxMarketCap !== undefined && details?.market_cap && details.market_cap > filters.maxMarketCap) return false;
    if (filters.sectors && filters.sectors.length > 0) {
      const sector = getSectorFromSIC(details?.sic_code || null);
      if (!filters.sectors.includes(sector)) return false;
    }
    if (hasFundamentalFilters) {
      const cp = getSnapshotMetrics(t).changePercent;
      if (filters.minChange1D !== undefined && cp < filters.minChange1D) return false;
      if (filters.maxChange1D !== undefined && cp > filters.maxChange1D) return false;
      if (filters.minRelativeVolume !== undefined && t.prevDay?.v > 0) {
        const preferredBar = getPreferredSnapshotBar(t);
        if (((preferredBar?.v || 0) / t.prevDay.v) < filters.minRelativeVolume) return false;
      }
    }
    return true;
  });

  finalResults.sort((a, b) => {
    let aVal: number, bVal: number;
    const aMetrics = getSnapshotMetrics(a);
    const bMetrics = getSnapshotMetrics(b);
    switch (sortBy) {
      case "change":
        aVal = aMetrics.changePercent;
        bVal = bMetrics.changePercent;
        break;
      case "price":
        aVal = aMetrics.currentPrice;
        bVal = bMetrics.currentPrice;
        break;
      case "marketCap":
        aVal = tickerDetails.get(a.ticker)?.market_cap || 0;
        bVal = tickerDetails.get(b.ticker)?.market_cap || 0;
        break;
      default:
        aVal = aMetrics.preferredBar?.v || a.prevDay?.v || 0;
        bVal = bMetrics.preferredBar?.v || b.prevDay?.v || 0;
    }
    return sortDir === "desc" ? bVal - aVal : aVal - bVal;
  });

  const paginatedResults = finalResults.slice(offset, offset + limit);

  const initialResults = paginatedResults.map((t) => {
    const details = tickerDetails.get(t.ticker);
    const sector = getSectorFromSIC(details?.sic_code || null);
    const { preferredBar, currentPrice, change, changePercent, hasLiveData } = getSnapshotMetrics(t);
    
    // Truncate description for preview
    let shortDesc: string | null = null;
    if (details?.description) {
      if (details.description.length > 200) {
        const sentences = details.description.match(/[^.!?]+[.!?]+/g);
        shortDesc = sentences ? sentences.slice(0, 2).join(' ').trim() : details.description.slice(0, 200) + '…';
      } else {
        shortDesc = details.description;
      }
    }

    return {
      symbol: t.ticker,
      name: details?.name || t.ticker,
      sector,
      sicDescription: details?.sic_description || null,
      price: currentPrice,
      change,
      changePercent,
      changePercent1W: null,
      changePercent1M: null,
      changePercentYTD: null,
      volume: preferredBar?.v || 0,
      prevVolume: t.prevDay?.v || 0,
      relativeVolume: t.prevDay?.v > 0 && hasLiveData ? (preferredBar?.v || 0) / t.prevDay.v : null,
      marketCap: details?.market_cap || null,
      high: preferredBar?.h || 0,
      low: preferredBar?.l || 0,
      open: preferredBar?.o || 0,
      vwap: preferredBar?.vw || null,
      exchange: details?.primary_exchange || null,
      type: details?.type || null,
      volatility: null,
      beta: null,
      shortDescription: shortDesc,
    };
  });

  // Fetch fundamentals
  const fundamentalsMap = await fetchBatchFundamentals(
    initialResults.map((r: any) => ({ symbol: r.symbol, price: r.price, marketCap: r.marketCap })),
    apiKey
  );

  // Fetch performance metrics
  const perfMap = await fetchBatchPerformance(
    initialResults.map((r: any) => ({
      symbol: r.symbol,
      pe: fundamentalsMap.get(r.symbol)?.pe ?? null,
      epsGrowth: fundamentalsMap.get(r.symbol)?.epsGrowth ?? null,
    })),
    apiKey,
    15
  );

  const results = initialResults.map((r: any) => enrichResult(r, fundamentalsMap.get(r.symbol), perfMap.get(r.symbol), r.shortDescription));

  return json({
    ok: true,
    count: finalResults.length,
    results,
    pagination: { offset, limit, hasMore: offset + limit < finalResults.length, total: finalResults.length },
    source: "api",
    marketClosed,
  });
}
