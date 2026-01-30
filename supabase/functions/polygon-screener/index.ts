import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BASE_URL = "https://api.polygon.io";

const EXTERNAL_TIMEOUT_MS = 4000;

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
    // Fetch quarterly financials for the most recent data
    const url = `${BASE_URL}/vX/reference/financials?ticker=${encodeURIComponent(ticker)}&timeframe=annual&limit=2&sort=period_of_report_date&order=desc&apiKey=${apiKey}`;
    const res = await fetchWithTimeout(url, {}, 6000);
    
    if (!res.ok) {
      setCachedFundamentals(ticker, fundamentals);
      return fundamentals;
    }
    
    const data = await res.json();
    const results = data.results || [];
    
    if (results.length === 0) {
      setCachedFundamentals(ticker, fundamentals);
      return fundamentals;
    }

    const latest = results[0].financials;
    const previous = results.length > 1 ? results[1].financials : null;

    // Income statement metrics
    const income = latest?.income_statement;
    const balance = latest?.balance_sheet;
    const prevIncome = previous?.income_statement;

    if (income) {
      const revenue = income.revenues?.value || 0;
      const operatingIncome = income.operating_income?.value || 0;
      const netIncome = income.net_income_loss?.value || 0;
      const dilutedEPS = income.diluted_earnings_per_share?.value;

      // Operating Margin
      if (revenue > 0 && operatingIncome) {
        fundamentals.opMargin = Math.round((operatingIncome / revenue) * 10000) / 100;
      }

      // P/E Ratio
      if (price > 0 && dilutedEPS && dilutedEPS > 0) {
        fundamentals.pe = Math.round((price / dilutedEPS) * 100) / 100;
      }

      // Revenue Growth YoY
      if (prevIncome) {
        const prevRevenue = prevIncome.revenues?.value || 0;
        if (prevRevenue > 0 && revenue > 0) {
          fundamentals.revenueGrowth = Math.round(((revenue - prevRevenue) / prevRevenue) * 10000) / 100;
        }

        // EPS Growth YoY
        const prevEPS = prevIncome.diluted_earnings_per_share?.value;
        if (prevEPS && prevEPS > 0 && dilutedEPS && dilutedEPS > 0) {
          fundamentals.epsGrowth = Math.round(((dilutedEPS - prevEPS) / Math.abs(prevEPS)) * 10000) / 100;
        }
      }

      // EV/EBITDA
      const ebitda = income.ebitda?.value || 
        ((income.operating_income?.value || 0) + (income.depreciation_and_amortization?.value || 0));
      
      if (marketCap && marketCap > 0 && balance && ebitda > 0) {
        const totalDebt = (balance.long_term_debt?.value || 0) + (balance.short_term_debt?.value || 0);
        const cash = balance.cash_and_cash_equivalents?.value || balance.cash?.value || 0;
        const enterpriseValue = marketCap + totalDebt - cash;
        fundamentals.evEbitda = Math.round((enterpriseValue / ebitda) * 100) / 100;
      }
    }

    if (balance) {
      const totalEquity = balance.equity?.value || balance.equity_attributable_to_parent?.value || 0;
      const currentAssets = balance.current_assets?.value || 0;
      const currentLiabilities = balance.current_liabilities?.value || 0;
      const inventory = balance.inventory?.value || 0;
      const longTermDebt = balance.long_term_debt?.value || balance.noncurrent_liabilities?.value || 0;
      const shortTermDebt = balance.short_term_debt?.value || 0;
      const totalDebt = longTermDebt + shortTermDebt;

      // Price to Book
      if (marketCap && marketCap > 0 && totalEquity > 0) {
        fundamentals.pb = Math.round((marketCap / totalEquity) * 100) / 100;
      }

      // Debt to Equity
      if (totalEquity > 0 && totalDebt > 0) {
        fundamentals.debtEquity = Math.round((totalDebt / totalEquity) * 100) / 100;
      }

      // Quick Ratio
      if (currentLiabilities > 0) {
        const quickAssets = currentAssets - inventory;
        fundamentals.quickRatio = Math.round((quickAssets / currentLiabilities) * 100) / 100;
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
    const hasFundamentalFilters =
      filters.minMarketCap !== undefined ||
      filters.maxMarketCap !== undefined ||
      (filters.sectors && filters.sectors.length > 0) ||
      filters.minPE !== undefined || filters.maxPE !== undefined ||
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

    // Try database-first approach for fundamental filters
    if (hasFundamentalFilters) {
      const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      // Check if we have data in asset_universe
      const { count } = await supabase
        .from("asset_universe")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      if (count && count > 100) {
        console.log(`[polygon-screener] Using database-first approach with ${count} tickers`);
        return await screenFromDatabase(supabase, filters, limit, offset, POLYGON_API_KEY);
      }
    }

    // Fallback to API approach
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

  // Build query - include fundamental metrics available in database
  let query = supabase
    .from("asset_universe")
    .select("ticker, name, sector, market_cap_tier, last_close, change_percent_1d, avg_daily_volume, volatility_30d, beta_spy, metadata")
    .eq("is_active", true);

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
  if (filters.minChange1D !== undefined) {
    query = query.gte("change_percent_1d", filters.minChange1D);
  }
  if (filters.maxChange1D !== undefined) {
    query = query.lte("change_percent_1d", filters.maxChange1D);
  }

  // Apply sorting
  const sortBy = filters.sortBy || "volume";
  const sortDir = filters.sortDirection || "desc";

  switch (sortBy) {
    case "change":
      query = query.order("change_percent_1d", { ascending: sortDir === "asc", nullsFirst: false });
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

  // Fetch all matching for count, then paginate
  const { data: allData, error: countError } = await query;

  if (countError) {
    console.error("[polygon-screener] Database query error:", countError);
    return json({ ok: false, error: countError.message }, 500);
  }

  // Check if metric filters are active - if so, we need to fetch fundamentals before filtering
  const metricFiltersActive = hasMetricFilters(filters);
  
  // When metric filters are active, we need to fetch fundamentals for more tickers
  // to ensure we have enough results after filtering
  const fetchLimit = metricFiltersActive ? Math.min(allData?.length || 0, 100) : limit;
  const dataToProcess = metricFiltersActive 
    ? (allData || []).slice(0, fetchLimit)
    : (allData || []).slice(offset, offset + limit);

  console.log(`[polygon-screener] Found ${allData?.length || 0} matches, processing ${dataToProcess.length} for fundamentals`);

  // Now fetch fresh price data from Polygon for the data to process
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

  // Build initial results with price data
  const initialResults = dataToProcess.map((row: any) => {
    const snapshot = snapshotMap.get(row.ticker);
    const marketCap = row.metadata?.market_cap || null;
    
    // Extract available fundamental metrics from database
    const volatility = row.volatility_30d != null ? Number(row.volatility_30d) : null;
    const beta = row.beta_spy != null ? Number(row.beta_spy) : null;

    if (snapshot) {
      const prevClose = snapshot.prevDay?.c || 0;
      const currentPrice = snapshot.day?.c || row.last_close || 0;
      const change = prevClose > 0 ? currentPrice - prevClose : 0;
      const changePercent = prevClose > 0 ? ((currentPrice - prevClose) / prevClose) * 100 : 0;

      return {
        symbol: row.ticker,
        name: row.name,
        sector: row.sector,
        sicDescription: null,
        price: currentPrice,
        change,
        changePercent,
        volume: snapshot.day?.v || row.avg_daily_volume || 0,
        prevVolume: snapshot.prevDay?.v || 0,
        relativeVolume: snapshot.prevDay?.v > 0 ? snapshot.day?.v / snapshot.prevDay?.v : null,
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

    // Fallback to database values
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
      exchange: null,
      type: null,
      volatility,
      beta,
    };
  });

  // Fetch fundamentals for the results (parallel, limited to avoid rate limits)
  // Fetch more when metric filters are active
  const fundamentalFetchCount = metricFiltersActive ? Math.min(initialResults.length, 50) : Math.min(initialResults.length, 20);
  console.log(`[polygon-screener] Fetching fundamentals for ${fundamentalFetchCount} tickers (metric filters: ${metricFiltersActive})...`);
  
  const fundamentalsMap = await fetchBatchFundamentals(
    initialResults.slice(0, fundamentalFetchCount).map((r: any) => ({ symbol: r.symbol, price: r.price, marketCap: r.marketCap })),
    apiKey,
    fundamentalFetchCount
  );

  // Merge fundamentals into results
  let resultsWithFundamentals = initialResults.map((r: any) => {
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
      peg: null, // Would need additional calculation
      pb: fundamentals.pb,
      pCash: null, // Would need additional data
      evEbitda: fundamentals.evEbitda,
      opMargin: fundamentals.opMargin,
      epsGrowth: fundamentals.epsGrowth,
      revenueGrowth: fundamentals.revenueGrowth,
      debtEquity: fundamentals.debtEquity,
      quickRatio: fundamentals.quickRatio,
      sharpe: null, // Would need historical return calculation
      maxDrawdown: null, // Would need historical price data
    };
  });

  // Apply fundamental filters if active
  if (metricFiltersActive) {
    const beforeCount = resultsWithFundamentals.length;
    resultsWithFundamentals = applyFundamentalFilters(resultsWithFundamentals, filters);
    console.log(`[polygon-screener] After fundamental filters: ${resultsWithFundamentals.length} (was ${beforeCount})`);
  }

  // For metric-filtered results, paginate AFTER filtering
  const totalCount = metricFiltersActive ? resultsWithFundamentals.length : (allData?.length || 0);
  const results = metricFiltersActive 
    ? resultsWithFundamentals.slice(offset, offset + limit)
    : resultsWithFundamentals;

  return json({
    ok: true,
    count: totalCount,
    results,
    pagination: {
      offset,
      limit,
      hasMore: offset + limit < totalCount,
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

  // Step 2: Apply basic filters on snapshot data
  let filteredTickers = tickers.filter((t) => {
    if (!t.day || !t.day.c || t.day.c <= 0) return false;
    if (!t.prevDay || !t.prevDay.c || t.prevDay.c <= 0) return false;

    if (filters.minPrice !== undefined && t.day.c < filters.minPrice) return false;
    if (filters.maxPrice !== undefined && t.day.c > filters.maxPrice) return false;

    const accurateChangePercent = ((t.day.c - t.prevDay.c) / t.prevDay.c) * 100;

    if (!hasFundamentalFilters) {
      if (filters.minChange1D !== undefined && accurateChangePercent < filters.minChange1D) return false;
      if (filters.maxChange1D !== undefined && accurateChangePercent > filters.maxChange1D) return false;
    }

    if (filters.minVolume !== undefined && t.day.v < filters.minVolume) return false;

    if (!hasFundamentalFilters && filters.minRelativeVolume !== undefined && t.prevDay?.v > 0) {
      const relativeVol = t.day.v / t.prevDay.v;
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
    const aChangePercent = a.prevDay?.c > 0 ? ((a.day.c - a.prevDay.c) / a.prevDay.c) * 100 : 0;
    const bChangePercent = b.prevDay?.c > 0 ? ((b.day.c - b.prevDay.c) / b.prevDay.c) * 100 : 0;

    switch (candidateSortBy) {
      case "change":
        aVal = aChangePercent;
        bVal = bChangePercent;
        break;
      case "price":
        aVal = a.day?.c || 0;
        bVal = b.day?.c || 0;
        break;
      case "volume":
      default:
        aVal = a.day?.v || 0;
        bVal = b.day?.v || 0;
        break;
    }

    return candidateSortDir === "desc" ? bVal - aVal : aVal - bVal;
  });

  const maxCandidates = hasFundamentalFilters ? 3000 : 500;
  const candidateTickers = filteredTickers.slice(0, Math.min(filteredTickers.length, maxCandidates));

  console.log(`[polygon-screener] Fetching details for ${candidateTickers.length} tickers...`);

  // Step 4: Fetch ticker details in batches
  const batchSize = 100;
  const tickerDetails: Map<string, TickerDetails> = new Map();

  for (let i = 0; i < candidateTickers.length; i += batchSize) {
    const batch = candidateTickers.slice(i, i + batchSize);

    const detailPromises = batch.map(async (t) => {
      try {
        const detailUrl = `${BASE_URL}/v3/reference/tickers/${encodeURIComponent(t.ticker)}?apiKey=${apiKey}`;
        const detailRes = await fetchWithTimeout(detailUrl);
        const text = await detailRes.text();
        if (!detailRes.ok) return null;
        const data = JSON.parse(text);
        if (data.results) {
          return { ticker: t.ticker, details: data.results as TickerDetails };
        }
      } catch (err) {
        console.warn(`[polygon-screener] Failed to fetch details for ${t.ticker}:`, err);
      }
      return null;
    });

    const results = await Promise.all(detailPromises);
    results.forEach((r) => {
      if (r) tickerDetails.set(r.ticker, r.details);
    });

    if (i + batchSize < candidateTickers.length) {
      await new Promise((resolve) => setTimeout(resolve, 50));
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
      const accurateChangePercent = t.prevDay?.c > 0 ? ((t.day.c - t.prevDay.c) / t.prevDay.c) * 100 : 0;
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
    const aChangePercent = a.prevDay?.c > 0 ? ((a.day.c - a.prevDay.c) / a.prevDay.c) * 100 : 0;
    const bChangePercent = b.prevDay?.c > 0 ? ((b.day.c - b.prevDay.c) / b.prevDay.c) * 100 : 0;

    switch (sortBy) {
      case "change":
        aVal = aChangePercent;
        bVal = bChangePercent;
        break;
      case "price":
        aVal = a.day?.c || 0;
        bVal = b.day?.c || 0;
        break;
      case "marketCap":
        aVal = tickerDetails.get(a.ticker)?.market_cap || 0;
        bVal = tickerDetails.get(b.ticker)?.market_cap || 0;
        break;
      case "volume":
      default:
        aVal = a.day?.v || 0;
        bVal = b.day?.v || 0;
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

    const prevClose = t.prevDay?.c || 0;
    const currentPrice = t.day?.c || 0;
    const accurateChange = prevClose > 0 ? currentPrice - prevClose : 0;
    const accurateChangePercent = prevClose > 0 ? ((currentPrice - prevClose) / prevClose) * 100 : 0;

    return {
      symbol: t.ticker,
      name: details?.name || t.ticker,
      sector,
      sicDescription: details?.sic_description || null,
      price: currentPrice,
      change: accurateChange,
      changePercent: accurateChangePercent,
      volume: t.day?.v || 0,
      prevVolume: t.prevDay?.v || 0,
      relativeVolume: t.prevDay?.v > 0 ? t.day.v / t.prevDay.v : null,
      marketCap: details?.market_cap || null,
      high: t.day?.h || 0,
      low: t.day?.l || 0,
      open: t.day?.o || 0,
      vwap: t.day?.vw || null,
      exchange: details?.primary_exchange || null,
      type: details?.type || null,
      volatility: null,
      beta: null,
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
  });
}
