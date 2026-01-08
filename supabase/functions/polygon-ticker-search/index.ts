import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

interface TickerResult {
  ticker: string;
  name: string;
  market: string;
  type: string;
  primaryExchange?: string;
  active: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const query = String(body.query || "").toUpperCase().trim();
    const limit = Math.min(Number(body.limit) || 20, 100);
    const market = body.market || "stocks"; // stocks, crypto, fx, otc

    if (!query || query.length < 1) {
      return json({ ok: false, error: "query is required" }, 400);
    }

    const POLYGON_API_KEY = Deno.env.get("POLYGON_API_KEY") || Deno.env.get("VITE_POLYGON_API_KEY");

    if (!POLYGON_API_KEY) {
      return json({ ok: false, error: "Polygon API key not configured" }, 500);
    }

    console.log(`[polygon-ticker-search] Searching for "${query}" in ${market}`);

    // Use Polygon's Ticker Search endpoint
    // https://polygon.io/docs/stocks/get_v3_reference_tickers
    const url = new URL(`${BASE_URL}/v3/reference/tickers`);
    url.searchParams.set("search", query);
    url.searchParams.set("market", market);
    url.searchParams.set("active", "true");
    url.searchParams.set("limit", limit.toString());
    url.searchParams.set("apiKey", POLYGON_API_KEY);

    const res = await fetch(url.toString());
    const text = await res.text();

    if (!res.ok) {
      console.error(`[polygon-ticker-search] Polygon API error ${res.status}: ${text}`);
      return json(
        { ok: false, error: "Polygon API error", status: res.status },
        res.status
      );
    }

    const data = JSON.parse(text);

    if (data.status !== "OK" && data.status !== "DELAYED") {
      console.warn(`[polygon-ticker-search] Non-OK status: ${data.status}`);
    }

    const results: TickerResult[] = (data.results || []).map((r: any) => ({
      ticker: r.ticker,
      name: r.name || r.ticker,
      market: r.market || market,
      type: r.type || "CS", // CS = Common Stock
      primaryExchange: r.primary_exchange,
      active: r.active !== false,
    }));

    console.log(`[polygon-ticker-search] Found ${results.length} results for "${query}"`);

    return json({ ok: true, query, results, count: results.length }, 200);
  } catch (error) {
    console.error("[polygon-ticker-search] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return json({ ok: false, error: message }, 500);
  }
});
