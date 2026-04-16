import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BASE_URL = "https://api.polygon.io";

const EXTERNAL_TIMEOUT_MS = 15000;

// Simple in-memory cache for fundamentals (1 hour TTL)
const fundamentalsCache = new Map<string, { data: TickerFundamentals; timestamp: number }>();
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

function getCachedFundamentals(ticker: string): TickerFundamentals | null {
  const entry = fundamentalsCache.get(ticker);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) {
    return entry.data;
  }
  fundamentalsCache.delete(ticker);
  return null;
}

function setCachedFundamentals(ticker: string, data: TickerFundamentals): void {
  fundamentalsCache.set(ticker, { data, timestamp: Date.now() });
  // Limit cache size
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

// Fetch fundamentals from Polygon for a single ticker
// NOTE: Prefer the newer "financials v1" + "ratios" endpoints for consistency with the rest of the app.
async function fetchTickerFundamentals(ticker: string, apiKey: string, price: number, marketCap: number | null): Promise<TickerFundamentals> {
  const cached = getCachedFundamentals(ticker);
  if (cached) return cached;

  const fundamentals: TickerFundamentals = {
    pe: null,
    forwardPE: null,
    pb: null,
    evEbitda: null,
    debtEquity: null,
    quickRatio: null,
    opMargin: null,
    epsGrowth: null,
    revenueGrowth: null,
  };

  try {
    // (A) Daily ratios endpoint (fast + precomputed)
    // Docs refer to this as "financials ratios" (daily-refreshed snapshot)
    // Example fields: price_to_earnings, price_to_book, debt_to_equity, quick, ev_to_ebitda
    try {
      const ratiosUrl = `${BASE_URL}/stocks/financials/v1/ratios?ticker=${encodeURIComponent(ticker)}&limit=1&apiKey=${apiKey}`;
      const ratiosRes = await fetchWithTimeout(ratiosUrl, {}, 6000);
      if (ratiosRes.ok) {
        const ratiosJson = await ratiosRes.json();
        const r0 = (ratiosJson?.results || [])[0] || null;
        if (r0) {
          fundamentals.pe = typeof r0.price_to_earnings === "number" ? r0.price_to_earnings : fundamentals.pe;
          fundamentals.pb = typeof r0.price_to_book === "number" ? r0.price_to_book : fundamentals.pb;
          fundamentals.debtEquity = typeof r0.debt_to_equity === "number" ? r0.debt_to_equity : fundamentals.debtEquity;
          fundamentals.quickRatio = typeof r0.quick === "number" ? r0.quick : fundamentals.quickRatio;
          fundamentals.evEbitda = typeof r0.ev_to_ebitda === "number" ? r0.ev_to_ebitda : fundamentals.evEbitda;
        }
      }
    } catch (_err) {
      // ignore, we'll fall back to statements
    }

    // (B) Income statements (for Operating Margin + YoY growth)
    const incomeUrl = `${BASE_URL}/stocks/financials/v1/income-statements?tickers=${encodeURIComponent(ticker)}&timeframe=annual&limit=2&sort=period_end&order=desc&apiKey=${apiKey}`;
    const incomeRes = await fetchWithTimeout(incomeUrl, {}, 6000);
    if (incomeRes.ok) {
      const incomeJson = await incomeRes.json();
      const results = incomeJson?.results || [];
      const latest = results[0] || null;
      const previous = results.length > 1 ? results[1] : null;

      const revenue = typeof latest?.revenue === "number" ? latest.revenue : null;
      const opIncome = typeof latest?.operating_income === "number" ? latest.operating_income : null;
      const dilutedEps = typeof latest?.diluted_earnings_per_share === "number" ? latest.diluted_earnings_per_share : null;

      if (revenue && revenue > 0 && opIncome !== null) {
        fundamentals.opMargin = Math.round((opIncome / revenue) * 10000) / 100;
      }

      // If ratios endpoint isn't available, compute a simple P/E from EPS + price
      if (fundamentals.pe == null && price > 0 && dilutedEps && dilutedEps > 0) {
        fundamentals.pe = Math.round((price / dilutedEps) * 100) / 100;
      }

      if (previous) {
        const prevRevenue = typeof previous?.revenue === "number" ? previous.revenue : null;
        const prevEps = typeof previous?.diluted_earnings_per_share === "number" ? previous.diluted_earnings_per_share : null;

        if (prevRevenue && prevRevenue > 0 && revenue && revenue > 0) {
          fundamentals.revenueGrowth = Math.round(((revenue - prevRevenue) / prevRevenue) * 10000) / 100;
        }

        if (prevEps && prevEps > 0 && dilutedEps && dilutedEps > 0) {
          fundamentals.epsGrowth = Math.round(((dilutedEps - prevEps) / Math.abs(prevEps)) * 10000) / 100;
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

// Fetch fundamentals for multiple tickers in parallel (limited batch)
async function fetchBatchFundamentals(
  tickers: { symbol: string; price: number; marketCap: number | null }[],
  apiKey: string,
  maxTickers: number = 20
): Promise<Map<string, TickerFundamentals>> {
  const results = new Map<string, TickerFundamentals>();
  
  // Process in batches to avoid rate limits
  const tickersToFetch = tickers.slice(0, maxTickers);
  
  // Process in smaller chunks to avoid overwhelming the API
  const chunkSize = 10;
  for (let i = 0; i < tickersToFetch.length; i += chunkSize) {
    const chunk = tickersToFetch.slice(i, i + chunkSize);
    const promises = chunk.map(async (t) => {
      const fundamentals = await fetchTickerFundamentals(t.symbol, apiKey, t.price, t.marketCap);
      results.set(t.symbol, fundamentals);
    });
    await Promise.allSettled(promises);
  }
  
  return results;
}

// SIC code to sector mapping
const SIC_TO_SECTOR: Record<string, string> = {
  "1": "Agriculture",
  "10": "Mining",
  "15": "Construction",
  "20": "Manufacturing",
  "35": "Technology",
  "36": "Technology",
  "37": "Industrials",
  "38": "Technology",
  "39": "Consumer Discretionary",
  "40": "Transportation",
  "45": "Transportation",
  "48": "Communication Services",
  "49": "Utilities",
  "50": "Consumer Discretionary",
  "51": "Consumer Discretionary",
  "52": "Consumer Discretionary",
  "53": "Consumer Discretionary",
  "54": "Consumer Staples",
  "55": "Consumer Discretionary",
  "56": "Consumer Discretionary",
  "57": "Consumer Discretionary",
  "58": "Consumer Discretionary",
  "59": "Consumer Discretionary",
  "60": "Financials",
  "61": "Financials",
  "62": "Financials",
  "63": "Financials",
  "64": "Financials",
  "65": "Real Estate",
  "67": "Financials",
  "70": "Consumer Discretionary",
  "72": "Consumer Discretionary",
  "73": "Technology",
  "78": "Communication Services",
  "79": "Communication Services",
  "80": "Healthcare",
  "81": "Technology",
  "82": "Consumer Discretionary",
  "83": "Consumer Discretionary",
  "87": "Technology",
  "99": "Other",
};

function getSectorFromSIC(sicCode: string | null): string {
  if (!sicCode) return "Unknown";
  const prefix = sicCode.substring(0, 2);
  return SIC_TO_SECTOR[prefix] || "Other";
}

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
  
  // Fundamental filters
  minPE?: number;
  maxPE?: number;
  minForwardPE?: number;
  maxForwardPE?: number;
  minPEG?: number;
  maxPEG?: number;
  minPB?: number;
  maxPB?: number;
  minEvEbitda?: number;
  maxEvEbitda?: number;
  minOpMargin?: number;
  maxOpMargin?: number;
  minDebtEquity?: number;
  maxDebtEquity?: number;
  minQuickRatio?: number;
  maxQuickRatio?: number;
  minVolatility?: number;
  maxVolatility?: number;
  minBeta?: number;
  maxBeta?: number;
  minEpsGrowth?: number;
  maxEpsGrowth?: number;
  minRevenueGrowth?: number;
  maxRevenueGrowth?: number;

  // Custom advanced filters with operator support
  customFilters?: {
    peg?: CustomFilter;
    drawdown?: CustomFilter;
    stdDev?: CustomFilter;
  };
}

// ---- Advanced Metrics Computation ----

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
  return Math.round(maxDD * 10000) / 100; // return as percentage e.g. -15.23
}

function calculateStdDev(returns: number[]): number | null {
  if (returns.length < 2) return null;
  const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
  const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / (returns.length - 1);
  return Math.round(Math.sqrt(variance) * 10000) / 10000;
}

// Cache for advanced metrics
const advancedMetricsCache = new Map<string, { data: { peg: number | null; maxDrawdown: number | null; stdDev: number | null }; timestamp: number }>();

async function computeAdvancedMetrics(
  ticker: string,
  apiKey: string,
  pe: number | null,
  epsGrowth: number | null
): Promise<{ peg: number | null; maxDrawdown: number | null; stdDev: number | null }> {
  const cached = advancedMetricsCache.get(ticker);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) return cached.data;

  const peg = calculatePEG(pe, epsGrowth);
  let maxDrawdown: number | null = null;
  let stdDev: number | null = null;

  try {
    // Fetch 252 daily bars for drawdown + last 25 for stddev
    const toDate = new Date().toISOString().split("T")[0];
    const fromDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const aggUrl = `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(ticker)}/range/1/day/${fromDate}/${toDate}?adjusted=true&sort=asc&limit=300&apiKey=${apiKey}`;
    const aggRes = await fetchWithTimeout(aggUrl, {}, 8000);
    if (aggRes.ok) {
      const aggData = await aggRes.json();
      const bars = aggData.results || [];
      if (bars.length > 2) {
        const closes: number[] = bars.map((b: any) => b.c);
        maxDrawdown = calculateMaxDrawdown(closes);

        // Std dev of last 20 daily returns
        const recentCloses = closes.slice(-21);
        if (recentCloses.length >= 2) {
          const dailyReturns: number[] = [];
          for (let i = 1; i < recentCloses.length; i++) {
            if (recentCloses[i - 1] > 0) {
              dailyReturns.push((recentCloses[i] - recentCloses[i - 1]) / recentCloses[i - 1]);
            }
          }
          stdDev = calculateStdDev(dailyReturns);
        }
      }
    }
  } catch (err) {
    console.warn(`[polygon-screener] Error computing advanced metrics for ${ticker}:`, err);
  }

  const result = { peg, maxDrawdown, stdDev };
  advancedMetricsCache.set(ticker, { data: result, timestamp: Date.now() });
  if (advancedMetricsCache.size > 500) {
    const oldest = [...advancedMetricsCache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
    if (oldest) advancedMetricsCache.delete(oldest[0]);
  }
  return result;
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

interface TickerSnapshot {
  ticker: string;
  todaysChange: number;
  todaysChangePerc: number;
  updated: number;
  day: {
    o: number;
    h: number;
    l: number;
    c: number;
    v: number;
    vw: number;
  };
  prevDay: {
    o: number;
    h: number;
    l: number;
    c: number;
    v: number;
    vw: number;
  };
  min?: {
    o: number;
    h: number;
    l: number;
    c: number;
    v: number;
    vw: number;
  };
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

type RefTicker = {
  ticker: string;
  name?: string;
  market_cap?: number;
  sic_code?: string;
  sic_description?: string;
  primary_exchange?: string;
  type?: string;
};

// Helper to apply fundamental filters to results
function applyFundamentalFilters(results: any[], filters: ScreenerFilters): any[] {
  return results.filter(r => {
    // P/E filter
    if (filters.minPE !== undefined && (r.pe === null || r.pe < filters.minPE)) return false;
    if (filters.maxPE !== undefined && r.pe !== null && r.pe > filters.maxPE) return false;
    
    // Forward P/E filter
    if (filters.minForwardPE !== undefined && (r.forwardPE === null || r.forwardPE < filters.minForwardPE)) return false;
    if (filters.maxForwardPE !== undefined && r.forwardPE !== null && r.forwardPE > filters.maxForwardPE) return false;
    
    // PEG filter
    if (filters.minPEG !== undefined && (r.peg === null || r.peg < filters.minPEG)) return false;
    if (filters.maxPEG !== undefined && r.peg !== null && r.peg > filters.maxPEG) return false;
    
    // P/B filter
    if (filters.minPB !== undefined && (r.pb === null || r.pb < filters.minPB)) return false;
    if (filters.maxPB !== undefined && r.pb !== null && r.pb > filters.maxPB) return false;
    
    // EV/EBITDA filter
    if (filters.minEvEbitda !== undefined && (r.evEbitda === null || r.evEbitda < filters.minEvEbitda)) return false;
    if (filters.maxEvEbitda !== undefined && r.evEbitda !== null && r.evEbitda > filters.maxEvEbitda) return false;
    
    // Operating Margin filter
    if (filters.minOpMargin !== undefined && (r.opMargin === null || r.opMargin < filters.minOpMargin)) return false;
    if (filters.maxOpMargin !== undefined && r.opMargin !== null && r.opMargin > filters.maxOpMargin) return false;
    
    // Debt/Equity filter
    if (filters.minDebtEquity !== undefined && (r.debtEquity === null || r.debtEquity < filters.minDebtEquity)) return false;
    if (filters.maxDebtEquity !== undefined && r.debtEquity !== null && r.debtEquity > filters.maxDebtEquity) return false;
    
    // Quick Ratio filter
    if (filters.minQuickRatio !== undefined && (r.quickRatio === null || r.quickRatio < filters.minQuickRatio)) return false;
    if (filters.maxQuickRatio !== undefined && r.quickRatio !== null && r.quickRatio > filters.maxQuickRatio) return false;
    
    // Volatility filter
    if (filters.minVolatility !== undefined && (r.volatility === null || r.volatility < filters.minVolatility)) return false;
    if (filters.maxVolatility !== undefined && r.volatility !== null && r.volatility > filters.maxVolatility) return false;
    
    // Beta filter
    if (filters.minBeta !== undefined && (r.beta === null || r.beta < filters.minBeta)) return false;
    if (filters.maxBeta !== undefined && r.beta !== null && r.beta > filters.maxBeta) return false;
    
    // EPS Growth filter
    if (filters.minEpsGrowth !== undefined && (r.epsGrowth === null || r.epsGrowth < filters.minEpsGrowth)) return false;
    if (filters.maxEpsGrowth !== undefined && r.epsGrowth !== null && r.epsGrowth > filters.maxEpsGrowth) return false;
    
    // Revenue Growth filter
    if (filters.minRevenueGrowth !== undefined && (r.revenueGrowth === null || r.revenueGrowth < filters.minRevenueGrowth)) return false;
    if (filters.maxRevenueGrowth !== undefined && r.revenueGrowth !== null && r.revenueGrowth > filters.maxRevenueGrowth) return false;
    
    return true;
  });
}

// Check if any metric-level filters are active
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

    console.log(`[polygon-screener] Running screen with filters:`, filters);

    // Check if we have fundamental filters that require ticker details
    const hasFundFilters =
      filters.minMarketCap !== undefined ||
      filters.maxMarketCap !== undefined ||
      (filters.sectors && filters.sectors.length > 0) ||
      hasMetricFilters(filters) ||
      hasCustomFilters(filters);

    const metricFiltersActive = hasMetricFilters(filters) || hasCustomFilters(filters);

    // Always try database-first approach (Snapshot API requires higher Polygon plan)
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check if we have data in asset_universe
    const { count } = await supabase
      .from("asset_universe")
      .select("*", { count: "exact", head: true })
      .or("is_active.is.null,is_active.eq.true");

    if (count && count > 100) {
      console.log(`[polygon-screener] Using database-first approach with ${count} tickers`);
      return await screenFromDatabase(supabase, filters, limit, offset, POLYGON_API_KEY);
    }

    // Fallback to API approach only if database has no data
    return await screenFromPolygonAPI(filters, limit, offset, POLYGON_API_KEY);

  } catch (error) {
    console.error("[polygon-screener] Error:", error);
    return json({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

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
  // When metric filters are active, scan a larger slice of the universe, then filter AFTER we enrich
  // with fundamentals. Keep bounded to avoid timeouts.
  const SCAN_LIMIT = scanFromStart ? Math.min(1000, Math.max(offset + limit, 600)) : limit;

  // Build query - include fields needed for result mapping
  let query = supabase
    .from("asset_universe")
    .select(
      "ticker, name, sector, market_cap_tier, last_close, change_percent_1d, avg_daily_volume, avg_daily_dollar_volume, volatility_30d, beta_spy, primary_exchange, asset_type, metadata",
      { count: "exact" }
    )
    // is_active is nullable in schema; treat NULL as active
    .or("is_active.is.null,is_active.eq.true")
    .range(scanFromStart ? 0 : offset, (scanFromStart ? SCAN_LIMIT : limit) + (scanFromStart ? 0 : offset) - 1);

  // Apply market cap filter using tier
  if (filters.minMarketCap !== undefined) {
    const minCap = filters.minMarketCap;
    if (minCap >= 200_000_000_000) {
      query = query.eq("market_cap_tier", "Mega");
    } else if (minCap >= 10_000_000_000) {
      query = query.in("market_cap_tier", ["Mega", "Large"]);
    } else if (minCap >= 2_000_000_000) {
      query = query.in("market_cap_tier", ["Mega", "Large", "Mid"]);
    } else if (minCap >= 300_000_000) {
      query = query.in("market_cap_tier", ["Mega", "Large", "Mid", "Small"]);
    }
  }

  if (filters.maxMarketCap !== undefined) {
    const maxCap = filters.maxMarketCap;
    if (maxCap < 300_000_000) {
      query = query.eq("market_cap_tier", "Micro");
    } else if (maxCap < 2_000_000_000) {
      query = query.in("market_cap_tier", ["Micro", "Small"]);
    } else if (maxCap < 10_000_000_000) {
      query = query.in("market_cap_tier", ["Micro", "Small", "Mid"]);
    } else if (maxCap < 200_000_000_000) {
      query = query.in("market_cap_tier", ["Micro", "Small", "Mid", "Large"]);
    }
  }

  // Apply sector filter
  if (filters.sectors && filters.sectors.length > 0) {
    query = query.in("sector", filters.sectors);
  }

  // Apply price filter
  if (filters.minPrice !== undefined) {
    query = query.gte("last_close", filters.minPrice);
  }
  if (filters.maxPrice !== undefined) {
    query = query.lte("last_close", filters.maxPrice);
  }

  // Apply volume filter
  if (filters.minVolume !== undefined) {
    query = query.gte("avg_daily_volume", filters.minVolume);
  }

  // Apply change filters
  if (!needsLiveChangeData && filters.minChange1D !== undefined) {
    query = query.gte("change_percent_1d", filters.minChange1D);
  }
  if (!needsLiveChangeData && filters.maxChange1D !== undefined) {
    query = query.lte("change_percent_1d", filters.maxChange1D);
  }

  // Apply sorting
  switch (sortBy) {
    case "change":
      query = query.order(needsLiveChangeData ? "avg_daily_volume" : "change_percent_1d", {
        ascending: sortDir === "asc",
        nullsFirst: false,
      });
      break;
    case "price":
      query = query.order("last_close", { ascending: sortDir === "asc", nullsFirst: false });
      break;
    case "marketCap":
      // Sort by tier priority (Mega first)
      query = query.order("avg_daily_dollar_volume", { ascending: sortDir === "asc", nullsFirst: false });
      break;
    case "volume":
    default:
      query = query.order("avg_daily_volume", { ascending: sortDir === "asc", nullsFirst: false });
      break;
  }

  const { data: rows, error: queryError, count: baseCount } = await query;

  if (queryError) {
    console.error("[polygon-screener] Database query error:", queryError);
    return json({ ok: false, error: queryError.message }, 500);
  }

  const dataToProcess = rows || [];
  console.log(
    `[polygon-screener] Base matches: ${baseCount ?? dataToProcess.length}. Processing ${dataToProcess.length} (metric filters: ${metricFiltersActive})`
  );

  // Fetch fresh price data from Polygon for the rows we're processing
  const tickersToFetch = dataToProcess.map((r: any) => r.ticker);

  // Fetch live snapshots for these tickers
  const snapshotMap = new Map<string, any>();

  if (tickersToFetch.length > 0) {
    // Fetch in batches of 50
    for (let i = 0; i < tickersToFetch.length; i += 50) {
      const batch = tickersToFetch.slice(i, i + 50);
      const tickerList = batch.join(",");

      try {
        const snapshotUrl = `${BASE_URL}/v2/snapshot/locale/us/markets/stocks/tickers?tickers=${tickerList}&apiKey=${apiKey}`;
        const res = await fetchWithTimeout(snapshotUrl);
        if (res.ok) {
          const data = await res.json();
          for (const t of data.tickers || []) {
            snapshotMap.set(t.ticker, t);
          }
        }
      } catch (err) {
        console.warn("[polygon-screener] Snapshot batch error:", err);
      }
    }
  }

  const buildBaseResult = (row: any) => {
    const snapshot = snapshotMap.get(row.ticker);
    const marketCap = row.metadata?.market_cap || null;
    const volatility = row.volatility_30d != null ? Number(row.volatility_30d) : null;
    const beta = row.beta_spy != null ? Number(row.beta_spy) : null;

    if (snapshot) {
      const prevClose = snapshot.prevDay?.c || 0;
      const hasLiveDay = snapshot.day?.c && snapshot.day.c > 0;
      const currentPrice = hasLiveDay ? snapshot.day.c : (snapshot.prevDay?.c || row.last_close || 0);
      // Use todaysChange/todaysChangePerc from Polygon – these always reflect the last session's change
      const change = snapshot.todaysChange != null ? snapshot.todaysChange : (prevClose > 0 ? currentPrice - prevClose : 0);
      const changePercent = snapshot.todaysChangePerc != null ? snapshot.todaysChangePerc : (prevClose > 0 ? ((currentPrice - prevClose) / prevClose) * 100 : 0);

      return {
        symbol: row.ticker,
        name: row.name,
        sector: row.sector,
        sicDescription: null,
        price: currentPrice,
        change,
        changePercent,
        volume: (hasLiveDay ? snapshot.day.v : snapshot.prevDay?.v) || row.avg_daily_volume || 0,
        prevVolume: snapshot.prevDay?.v || 0,
        relativeVolume: snapshot.prevDay?.v > 0 && hasLiveDay ? snapshot.day.v / snapshot.prevDay.v : null,
        marketCap,
        high: snapshot.day?.h || 0,
        low: snapshot.day?.l || 0,
        open: snapshot.day?.o || 0,
        vwap: snapshot.day?.vw || null,
        exchange: row.primary_exchange || null,
        type: row.asset_type || null,
        volatility,
        beta,
      };
    }

    return {
      symbol: row.ticker,
      name: row.name,
      sector: row.sector,
      sicDescription: null,
      price: row.last_close || 0,
      change: 0,
      changePercent: row.change_percent_1d || 0,
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
      volatility,
      beta,
    };
  };

  // Enrich + filter
  const enrichedMatches: any[] = [];
  const baseResults = dataToProcess.map(buildBaseResult);

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
        let aVal: number;
        let bVal: number;

        switch (sortBy) {
          case "change":
            aVal = a.changePercent ?? 0;
            bVal = b.changePercent ?? 0;
            break;
          case "price":
            aVal = a.price ?? 0;
            bVal = b.price ?? 0;
            break;
          case "marketCap":
            aVal = a.marketCap ?? 0;
            bVal = b.marketCap ?? 0;
            break;
          case "volume":
          default:
            aVal = a.volume ?? 0;
            bVal = b.volume ?? 0;
            break;
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
    // No metric filters: enrich only what's needed for the page
    const fundamentalsMap = await fetchBatchFundamentals(
      paginatedBaseResults.map((r: any) => ({ symbol: r.symbol, price: r.price, marketCap: r.marketCap })),
      apiKey,
      Math.min(paginatedBaseResults.length, 20)
    );

    const results = await Promise.all(paginatedBaseResults.map(async (r: any) => {
      const f = fundamentalsMap.get(r.symbol);
      const pe = f?.pe ?? null;
      const epsGrowth = f?.epsGrowth ?? null;
      const peg = calculatePEG(pe, epsGrowth);
      return {
        ...r,
        pe,
        forwardPE: f?.forwardPE ?? null,
        peg,
        pb: f?.pb ?? null,
        pCash: null,
        evEbitda: f?.evEbitda ?? null,
        opMargin: f?.opMargin ?? null,
        epsGrowth,
        revenueGrowth: f?.revenueGrowth ?? null,
        debtEquity: f?.debtEquity ?? null,
        quickRatio: f?.quickRatio ?? null,
        sharpe: null,
        maxDrawdown: null,
        stdDev: null,
      };
    }));

    return json({
      ok: true,
      count: totalBaseResults,
      results,
      pagination: {
        offset,
        limit,
        hasMore: totalBaseResults > offset + limit,
        total: totalBaseResults,
      },
      source: "database",
    });
  }

  // Metric filters active: scan through a bounded set and fetch fundamentals in chunks,
  // accumulating matches so filters don't return empty just because the first chunk lacked fundamentals.
  const CHUNK_SIZE = 25;
  for (let i = 0; i < sortedBaseResults.length; i += CHUNK_SIZE) {
    const chunkResults = sortedBaseResults.slice(i, i + CHUNK_SIZE);

    const fundamentalsMap = await fetchBatchFundamentals(
      chunkResults.map((r: any) => ({ symbol: r.symbol, price: r.price, marketCap: r.marketCap })),
      apiKey,
      chunkResults.length
    );

    // Compute advanced metrics for each ticker in the chunk
    const advancedMetricsResults = new Map<string, { peg: number | null; maxDrawdown: number | null; stdDev: number | null }>();
    const advChunks = chunk(chunkResults, 5);
    for (const advChunk of advChunks) {
      await Promise.allSettled(advChunk.map(async (r: any) => {
        const f = fundamentalsMap.get(r.symbol);
        const adv = await computeAdvancedMetrics(r.symbol, apiKey, f?.pe ?? null, f?.epsGrowth ?? null);
        advancedMetricsResults.set(r.symbol, adv);
      }));
    }

    const enrichedChunk = chunkResults.map((r: any) => {
      const f = fundamentalsMap.get(r.symbol);
      const adv = advancedMetricsResults.get(r.symbol);
      return {
        ...r,
        pe: f?.pe ?? null,
        forwardPE: f?.forwardPE ?? null,
        peg: adv?.peg ?? null,
        pb: f?.pb ?? null,
        pCash: null,
        evEbitda: f?.evEbitda ?? null,
        opMargin: f?.opMargin ?? null,
        epsGrowth: f?.epsGrowth ?? null,
        revenueGrowth: f?.revenueGrowth ?? null,
        debtEquity: f?.debtEquity ?? null,
        quickRatio: f?.quickRatio ?? null,
        sharpe: null,
        maxDrawdown: adv?.maxDrawdown ?? null,
        stdDev: adv?.stdDev ?? null,
      };
    });

    // Apply fundamental filters
    let matching = applyFundamentalFilters(enrichedChunk, filters);
    
    // Apply custom filters
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

    // Stop early once we have enough to satisfy the requested page
    if (enrichedMatches.length >= offset + limit) break;
  }

  const results = enrichedMatches.slice(offset, offset + limit);
  const totalCount = enrichedMatches.length;
  const mayHaveMore = (baseCount ?? 0) > SCAN_LIMIT;

  return json({
    ok: true,
    count: totalCount,
    results,
    pagination: {
      offset,
      limit,
      hasMore: offset + limit < totalCount || mayHaveMore,
      total: totalCount,
    },
    source: "database",
  });
}

async function screenFromPolygonAPI(
  filters: ScreenerFilters,
  limit: number,
  offset: number,
  apiKey: string
) {
  console.log("[polygon-screener] Screening from Polygon API...");

  // Step 1: Fetch all ticker snapshots
  const snapshotUrl = `${BASE_URL}/v2/snapshot/locale/us/markets/stocks/tickers?apiKey=${apiKey}`;
  const snapshotRes = await fetchWithTimeout(snapshotUrl);

  if (!snapshotRes.ok) {
    const errorText = await snapshotRes.text();
    console.error(`[polygon-screener] Snapshot API error:`, errorText);

    if (snapshotRes.status === 403 || snapshotRes.status === 401) {
      return json({
        ok: false,
        error: "Polygon Snapshot API requires Stocks Starter plan or higher.",
        fallback: true,
      }, 403);
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

  // Detect if market is closed: if most tickers have no day data, use prevDay
  const tickersWithDayData = tickers.filter(t => t.day && t.day.c && t.day.c > 0).length;
  const marketClosed = tickersWithDayData < tickers.length * 0.1; // <10% have day data = closed
  if (marketClosed) {
    console.log(`[polygon-screener] Market appears closed (${tickersWithDayData}/${tickers.length} have day data), using prevDay`);
  }

  // Step 2: Apply basic filters on snapshot data
  let filteredTickers = tickers.filter((t) => {
    // When market is closed, use prevDay as the "current" data
    const price = marketClosed ? (t.prevDay?.c || 0) : (t.day?.c || 0);
    const volume = marketClosed ? (t.prevDay?.v || 0) : (t.day?.v || 0);
    
    if (price <= 0) return false;
    if (!t.prevDay || !t.prevDay.c || t.prevDay.c <= 0) return false;

    if (filters.minPrice !== undefined && price < filters.minPrice) return false;
    if (filters.maxPrice !== undefined && price > filters.maxPrice) return false;

    // Use todaysChangePerc from snapshot (works even when market is closed)
    const accurateChangePercent = marketClosed ? (t.todaysChangePerc || 0) : ((price - t.prevDay.c) / t.prevDay.c) * 100;
    if (!hasFundamentalFilters) {
      if (filters.minChange1D !== undefined && accurateChangePercent < filters.minChange1D) return false;
      if (filters.maxChange1D !== undefined && accurateChangePercent > filters.maxChange1D) return false;
    }

    if (filters.minVolume !== undefined && volume < filters.minVolume) return false;

    if (!hasFundamentalFilters && filters.minRelativeVolume !== undefined && t.prevDay?.v > 0 && !marketClosed) {
      const relativeVol = (t.day?.v || 0) / t.prevDay.v;
      if (relativeVol < filters.minRelativeVolume) return false;
    }

    return true;
  });

  console.log(`[polygon-screener] After basic filters: ${filteredTickers.length} tickers`);

  // Step 3: Sort and determine how many to fetch details for
  const sortBy = filters.sortBy || "volume";
  const sortDir = filters.sortDirection || "desc";
  const candidateSortBy = hasFundamentalFilters ? "volume" : sortBy;
  const candidateSortDir = hasFundamentalFilters ? "desc" : sortDir;

  filteredTickers.sort((a, b) => {
    let aVal: number, bVal: number;
    const aPrice = marketClosed ? (a.prevDay?.c || 0) : (a.day?.c || 0);
    const bPrice = marketClosed ? (b.prevDay?.c || 0) : (b.day?.c || 0);
    const aChangePercent = marketClosed ? (a.todaysChangePerc || 0) : (a.prevDay?.c > 0 ? ((a.day.c - a.prevDay.c) / a.prevDay.c) * 100 : 0);
    const bChangePercent = marketClosed ? (b.todaysChangePerc || 0) : (b.prevDay?.c > 0 ? ((b.day.c - b.prevDay.c) / b.prevDay.c) * 100 : 0);

    switch (candidateSortBy) {
      case "change":
        aVal = aChangePercent;
        bVal = bChangePercent;
        break;
      case "price":
        aVal = aPrice;
        bVal = bPrice;
        break;
      case "volume":
      default:
        aVal = marketClosed ? (a.prevDay?.v || 0) : (a.day?.v || 0);
        bVal = marketClosed ? (b.prevDay?.v || 0) : (b.day?.v || 0);
        break;
    }

    return candidateSortDir === "desc" ? bVal - aVal : aVal - bVal;
  });

  // Cap candidates to avoid overwhelming the API with detail requests
  const maxCandidates = hasFundamentalFilters ? 500 : 200;
  const candidateTickers = filteredTickers.slice(0, Math.min(filteredTickers.length, maxCandidates));

  console.log(`[polygon-screener] Fetching details for ${candidateTickers.length} tickers...`);

  // Step 4: Fetch ticker details in small batches (10 concurrent) to avoid connection resets
  const batchSize = 10;
  const tickerDetails: Map<string, TickerDetails> = new Map();

  for (let i = 0; i < candidateTickers.length; i += batchSize) {
    const batch = candidateTickers.slice(i, i + batchSize);

    const detailPromises = batch.map(async (t) => {
      try {
        const detailUrl = `${BASE_URL}/v3/reference/tickers/${encodeURIComponent(t.ticker)}?apiKey=${apiKey}`;
        const detailRes = await fetchWithTimeout(detailUrl, {}, 8000);
        const text = await detailRes.text();
        if (!detailRes.ok) return null;
        const data = JSON.parse(text);
        if (data.results) {
          return { ticker: t.ticker, details: data.results as TickerDetails };
        }
      } catch (err) {
        // Silently skip failed detail fetches
      }
      return null;
    });

    const results = await Promise.allSettled(detailPromises);
    results.forEach((r) => {
      if (r.status === "fulfilled" && r.value) tickerDetails.set(r.value.ticker, r.value.details);
    });

    // Brief pause between batches
    if (i + batchSize < candidateTickers.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  console.log(`[polygon-screener] Got details for ${tickerDetails.size} tickers`);

  // Step 5: Apply market cap and sector filters
  let finalResults = candidateTickers.filter((t) => {
    const details = tickerDetails.get(t.ticker);

    if (filters.minMarketCap !== undefined) {
      if (!details?.market_cap || details.market_cap < filters.minMarketCap) return false;
    }
    if (filters.maxMarketCap !== undefined) {
      if (details?.market_cap && details.market_cap > filters.maxMarketCap) return false;
    }

    if (filters.sectors && filters.sectors.length > 0) {
      const sector = getSectorFromSIC(details?.sic_code || null);
      if (!filters.sectors.includes(sector)) return false;
    }

    if (hasFundamentalFilters) {
      const accurateChangePercent = marketClosed ? (t.todaysChangePerc || 0) : (t.prevDay?.c > 0 ? ((t.day.c - t.prevDay.c) / t.prevDay.c) * 100 : 0);
      if (filters.minChange1D !== undefined && accurateChangePercent < filters.minChange1D) return false;
      if (filters.maxChange1D !== undefined && accurateChangePercent > filters.maxChange1D) return false;

      if (filters.minRelativeVolume !== undefined && t.prevDay?.v > 0) {
        const relativeVol = t.day.v / t.prevDay.v;
        if (relativeVol < filters.minRelativeVolume) return false;
      }
    }

    return true;
  });

  console.log(`[polygon-screener] After market cap/sector filters: ${finalResults.length} results`);

  // Step 6: Re-sort final results
  finalResults.sort((a, b) => {
    let aVal: number, bVal: number;
    const aPrice = marketClosed ? (a.prevDay?.c || 0) : (a.day?.c || 0);
    const bPrice = marketClosed ? (b.prevDay?.c || 0) : (b.day?.c || 0);
    const aChangePercent = marketClosed ? (a.todaysChangePerc || 0) : (a.prevDay?.c > 0 ? ((a.day.c - a.prevDay.c) / a.prevDay.c) * 100 : 0);
    const bChangePercent = marketClosed ? (b.todaysChangePerc || 0) : (b.prevDay?.c > 0 ? ((b.day.c - b.prevDay.c) / b.prevDay.c) * 100 : 0);

    switch (sortBy) {
      case "change":
        aVal = aChangePercent;
        bVal = bChangePercent;
        break;
      case "price":
        aVal = aPrice;
        bVal = bPrice;
        break;
      case "marketCap":
        aVal = tickerDetails.get(a.ticker)?.market_cap || 0;
        bVal = tickerDetails.get(b.ticker)?.market_cap || 0;
        break;
      case "volume":
      default:
        aVal = marketClosed ? (a.prevDay?.v || 0) : (a.day?.v || 0);
        bVal = marketClosed ? (b.prevDay?.v || 0) : (b.day?.v || 0);
        break;
    }

    return sortDir === "desc" ? bVal - aVal : aVal - bVal;
  });

  // Step 7: Apply pagination
  const paginatedResults = finalResults.slice(offset, offset + limit);

  // Build initial results
  const initialResults = paginatedResults.map((t) => {
    const details = tickerDetails.get(t.ticker);
    const sector = getSectorFromSIC(details?.sic_code || null);

    // Use prevDay as source when market is closed
    const dayData = marketClosed ? t.prevDay : t.day;
    const prevClose = t.prevDay?.c || 0;
    const currentPrice = dayData?.c || 0;
    const accurateChange = marketClosed ? (t.todaysChange || 0) : (prevClose > 0 ? currentPrice - prevClose : 0);
    const accurateChangePercent = marketClosed ? (t.todaysChangePerc || 0) : (prevClose > 0 ? ((currentPrice - prevClose) / prevClose) * 100 : 0);

    return {
      symbol: t.ticker,
      name: details?.name || t.ticker,
      sector,
      sicDescription: details?.sic_description || null,
      price: currentPrice,
      change: accurateChange,
      changePercent: accurateChangePercent,
      volume: dayData?.v || 0,
      prevVolume: t.prevDay?.v || 0,
      relativeVolume: t.prevDay?.v > 0 && !marketClosed ? (t.day?.v || 0) / t.prevDay.v : null,
      marketCap: details?.market_cap || null,
      high: dayData?.h || 0,
      low: dayData?.l || 0,
      open: dayData?.o || 0,
      vwap: dayData?.vw || null,
      exchange: details?.primary_exchange || null,
      type: details?.type || null,
      volatility: null,
      beta: null,
      marketClosed, // signal to frontend
    };
  });

  // Fetch fundamentals for the displayed results
  console.log(`[polygon-screener] Fetching fundamentals for ${Math.min(initialResults.length, 20)} tickers (API mode)...`);
  const fundamentalsMap = await fetchBatchFundamentals(
    initialResults.map((r: any) => ({ symbol: r.symbol, price: r.price, marketCap: r.marketCap })),
    apiKey
  );

  // Merge fundamentals into results
  const results = initialResults.map((r: any) => {
    const fundamentals = fundamentalsMap.get(r.symbol) || {
      pe: null,
      forwardPE: null,
      pb: null,
      evEbitda: null,
      debtEquity: null,
      quickRatio: null,
      opMargin: null,
      epsGrowth: null,
      revenueGrowth: null,
    };

    return {
      ...r,
      pe: fundamentals.pe,
      forwardPE: fundamentals.forwardPE,
      peg: null,
      pb: fundamentals.pb,
      pCash: null,
      evEbitda: fundamentals.evEbitda,
      opMargin: fundamentals.opMargin,
      epsGrowth: fundamentals.epsGrowth,
      revenueGrowth: fundamentals.revenueGrowth,
      debtEquity: fundamentals.debtEquity,
      quickRatio: fundamentals.quickRatio,
      sharpe: null,
      maxDrawdown: null,
    };
  });

  return json({
    ok: true,
    count: finalResults.length,
    results,
    pagination: {
      offset,
      limit,
      hasMore: offset + limit < finalResults.length,
      total: finalResults.length,
    },
    source: "api",
    marketClosed,
  });
}
