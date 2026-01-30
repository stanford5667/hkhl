import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BASE_URL = "https://api.polygon.io";

const EXTERNAL_TIMEOUT_MS = 4000;

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
      (filters.sectors && filters.sectors.length > 0);

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

  // Build query
  let query = supabase
    .from("asset_universe")
    .select("ticker, name, sector, market_cap_tier, last_close, change_percent_1d, avg_daily_volume, metadata")
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

  const totalCount = allData?.length || 0;
  const paginatedData = (allData || []).slice(offset, offset + limit);

  console.log(`[polygon-screener] Found ${totalCount} matches, returning ${paginatedData.length}`);

  // Now fetch fresh price data from Polygon for the paginated results
  const tickersToFetch = paginatedData.map((r: any) => r.ticker);

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

  // Build results
  const results = paginatedData.map((row: any) => {
    const snapshot = snapshotMap.get(row.ticker);
    const marketCap = row.metadata?.market_cap || null;

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
    };
  });

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

  const results = paginatedResults.map((t) => {
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
