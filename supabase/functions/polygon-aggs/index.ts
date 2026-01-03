import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BASE_URL = "https://api.polygon.io";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// Create Supabase client with service role for cache operations
function getSupabaseClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  if (!supabaseUrl || !serviceRoleKey) {
    console.warn("[polygon-aggs] Supabase credentials not available for caching");
    return null;
  }
  
  return createClient(supabaseUrl, serviceRoleKey);
}

// Check cache for existing data
async function getCachedData(
  supabase: any,
  ticker: string,
  startDate: string,
  endDate: string
) {
  try {
    const { data, error } = await supabase
      .from("stock_price_cache")
      .select("trade_date, open_price, high_price, low_price, close_price, volume")
      .eq("ticker", ticker)
      .gte("trade_date", startDate)
      .lte("trade_date", endDate)
      .order("trade_date", { ascending: true });

    if (error) {
      console.error("[polygon-aggs] Cache read error:", error.message);
      return null;
    }

    return data;
  } catch (err) {
    console.error("[polygon-aggs] Cache read exception:", err);
    return null;
  }
}

// Save fetched data to cache
async function saveToCache(
  supabase: any,
  ticker: string,
  results: any[]
) {
  if (!results || results.length === 0) return;

  try {
    // Convert Polygon results to cache format
    const rows = results.map((r: any) => ({
      ticker,
      trade_date: new Date(r.t).toISOString().split("T")[0],
      open_price: r.o,
      high_price: r.h,
      low_price: r.l,
      close_price: r.c,
      adjusted_close: r.c, // Polygon adjusted=true means c is already adjusted
      volume: r.v,
    }));

    // Upsert in batches of 500
    const batchSize = 500;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      
      const { error } = await supabase
        .from("stock_price_cache")
        .upsert(batch, { 
          onConflict: "ticker,trade_date",
          ignoreDuplicates: false 
        });

      if (error) {
        console.error("[polygon-aggs] Cache write error:", error.message);
        // Continue anyway - caching is best effort
      }
    }

    console.log(`[polygon-aggs] Cached ${rows.length} bars for ${ticker}`);
  } catch (err) {
    console.error("[polygon-aggs] Cache write exception:", err);
  }
}

// Convert cache rows back to Polygon format
function cacheToPolygonFormat(cacheRows: any[]) {
  return cacheRows.map((row) => ({
    t: new Date(row.trade_date).getTime(),
    o: row.open_price,
    h: row.high_price,
    l: row.low_price,
    c: row.close_price,
    v: row.volume,
    vw: row.close_price, // approximate VWAP with close
  }));
}

// Limit date range based on Polygon plan
// Stocks Starter ($29/mo) = 5 years, Stocks Developer ($79/mo) = 10 years
// Default to 5 years for safety (covers Starter plan)
function limitToPolygonPlanDates(startDate: string, endDate: string): { start: string; end: string; wasLimited: boolean; invalidRange: boolean } {
  const now = new Date();
  // Stocks Starter plan ($29/mo) has access to 5 years of historical data
  const maxHistoryYears = 5;
  const maxHistoryDate = new Date(now);
  maxHistoryDate.setFullYear(maxHistoryDate.getFullYear() - maxHistoryYears);
  
  let start = new Date(startDate);
  const end = new Date(endDate);
  
  const wasLimited = start < maxHistoryDate;
  
  // If start date is before max history, limit it
  if (wasLimited) {
    start = maxHistoryDate;
    console.log(`[polygon-aggs] Limiting start date from ${startDate} to ${start.toISOString().split('T')[0]} (max ${maxHistoryYears} years on Starter plan)`);
  }
  
  // Check if the limited start is now after the end date
  const invalidRange = start > end;
  if (invalidRange) {
    console.log(`[polygon-aggs] Invalid range after limiting: start ${start.toISOString().split('T')[0]} > end ${end.toISOString().split('T')[0]}`);
  }
  
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
    wasLimited,
    invalidRange
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));

    const ticker = String(body.ticker || "").toUpperCase().trim();
    const requestedStartDate = String(body.startDate || "").trim();
    const requestedEndDate = String(body.endDate || "").trim();
    const timespan = String(body.timespan || "day").trim();
    const skipCache = body.skipCache === true;

    if (!ticker) return json({ ok: false, error: "ticker is required" }, 400);
    if (!requestedStartDate || !requestedEndDate) return json({ ok: false, error: "startDate and endDate are required" }, 400);

    // Limit dates to plan range
    const { start: startDate, end: endDate, wasLimited, invalidRange } = limitToPolygonPlanDates(requestedStartDate, requestedEndDate);
    
    // If the entire requested range is outside the plan's history, return empty results gracefully
    if (invalidRange) {
      console.log(`[polygon-aggs] Requested range entirely outside plan limits for ${ticker}, returning empty results`);
      return json({ 
        ok: true, 
        ticker, 
        results: [], 
        fromCache: false, 
        dateLimited: true,
        message: "Requested date range is beyond plan's historical data limit (5 years)" 
      }, 200);
    }
    
    if (wasLimited) {
      console.log(`[polygon-aggs] Date range limited for ${ticker} due to plan restrictions`);
    }

    // Only cache daily data
    const canCache = timespan === "day";
    const supabase = canCache ? getSupabaseClient() : null;

    // Try cache first (unless skipCache is set)
    if (supabase && !skipCache) {
      console.log(`[polygon-aggs] Checking cache for ${ticker} ${startDate}..${endDate}`);
      
      const cachedData = await getCachedData(supabase, ticker, startDate, endDate);
      
      if (cachedData && cachedData.length > 0) {
        // Calculate expected trading days (rough estimate: ~252 per year)
        const start = new Date(startDate);
        const end = new Date(endDate);
        const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        const expectedTradingDays = Math.floor(daysDiff * (252 / 365));
        
        // If we have at least 80% of expected data, use cache
        const cacheRatio = cachedData.length / Math.max(expectedTradingDays, 1);
        
        if (cacheRatio >= 0.8) {
          console.log(`[polygon-aggs] Cache hit for ${ticker}: ${cachedData.length} bars (${(cacheRatio * 100).toFixed(0)}% coverage)`);
          
          const results = cacheToPolygonFormat(cachedData);
          return json({ ok: true, ticker, results, fromCache: true, dateLimited: wasLimited }, 200);
        } else {
          console.log(`[polygon-aggs] Cache partial for ${ticker}: ${cachedData.length} bars (${(cacheRatio * 100).toFixed(0)}% coverage), fetching fresh data`);
        }
      }
    }

    // Fetch from Polygon API
    // Prefer VITE_POLYGON_API_KEY if present (often the actively-maintained key),
    // but allow POLYGON_API_KEY for backwards compatibility.
    const POLYGON_API_KEY =
      Deno.env.get("VITE_POLYGON_API_KEY") || Deno.env.get("POLYGON_API_KEY");

    if (!POLYGON_API_KEY) {
      return json({ ok: false, error: "Polygon API key not configured" }, 500);
    }

    console.log(
      `[polygon-aggs] Using API key from ${Deno.env.get("VITE_POLYGON_API_KEY") ? "VITE_POLYGON_API_KEY" : "POLYGON_API_KEY"}`
    );

    console.log(`[polygon-aggs] Fetching ${ticker} ${timespan} ${startDate}..${endDate} from Polygon API`);

    const allResults: any[] = [];
    let url: string | null = `${BASE_URL}/v2/aggs/ticker/${encodeURIComponent(
      ticker
    )}/range/1/${encodeURIComponent(timespan)}/${encodeURIComponent(
      startDate
    )}/${encodeURIComponent(endDate)}?adjusted=true&sort=asc&limit=50000&apiKey=${POLYGON_API_KEY}`;

    while (url) {
      const res = await fetch(url);
      const text = await res.text();

      if (!res.ok) {
        console.error(`[polygon-aggs] Polygon API error ${res.status}: ${text}`);
        return json(
          { ok: false, error: "Polygon API error", status: res.status, details: text },
          res.status
        );
      }

      const data = JSON.parse(text);

      const validStatus = data.status === "OK" || data.status === "DELAYED";
      if (!validStatus) {
        console.warn(`[polygon-aggs] Non-OK status for ${ticker}: ${data.status}`);
      }

      if (Array.isArray(data.results)) {
        allResults.push(...data.results);
      }

      url = data.next_url ? `${data.next_url}&apiKey=${POLYGON_API_KEY}` : null;
      if (url) await sleep(200);
    }

    console.log(`[polygon-aggs] Got ${allResults.length} bars for ${ticker} from API`);

    // Cache the results for future use
    if (supabase && allResults.length > 0) {
      // Don't await - let it run in background
      saveToCache(supabase, ticker, allResults).catch((err) => {
        console.error("[polygon-aggs] Background cache save failed:", err);
      });
    }

    return json({ ok: true, ticker, results: allResults, fromCache: false, dateLimited: wasLimited }, 200);
  } catch (error) {
    console.error("[polygon-aggs] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return json({ ok: false, error: message }, 500);
  }
});
