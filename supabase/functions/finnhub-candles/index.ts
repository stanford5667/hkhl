import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type PolygonTimespan = "minute" | "day" | "week" | "month";

function toIsoDateFromUnixSeconds(unix: string): string {
  return new Date(Number(unix) * 1000).toISOString().split("T")[0];
}

function resolutionToPolygonRange(resolution: string): { multiplier: number; timespan: PolygonTimespan } {
  const r = resolution.toUpperCase();

  if (r === "W") return { multiplier: 1, timespan: "week" };
  if (r === "M") return { multiplier: 1, timespan: "month" };
  if (r === "D") return { multiplier: 1, timespan: "day" };

  const minute = Number(r);
  if (Number.isFinite(minute) && minute > 0) {
    return { multiplier: minute, timespan: "minute" };
  }

  return { multiplier: 1, timespan: "day" };
}

function polygonToFinnhubCandles(results: any[] | undefined) {
  if (!Array.isArray(results) || results.length === 0) {
    return { s: "no_data" };
  }

  return {
    s: "ok",
    c: results.map((r) => r.c),
    h: results.map((r) => r.h),
    l: results.map((r) => r.l),
    o: results.map((r) => r.o),
    v: results.map((r) => r.v),
    t: results.map((r) => Math.floor((r.t ?? 0) / 1000)),
  };
}

async function fetchPolygonFallback(
  symbol: string,
  resolution: string,
  from: string,
  to: string,
  polygonApiKey: string,
) {
  const { multiplier, timespan } = resolutionToPolygonRange(resolution);
  const fromDate = toIsoDateFromUnixSeconds(from);
  const toDate = toIsoDateFromUnixSeconds(to);

  const polygonUrl = `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(
    symbol.toUpperCase(),
  )}/range/${multiplier}/${timespan}/${fromDate}/${toDate}?adjusted=true&sort=asc&limit=50000&apiKey=${polygonApiKey}`;

  console.log(`[finnhub-candles] Falling back to Polygon for ${symbol} (${resolution})`);
  const response = await fetch(polygonUrl);

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`Polygon ${response.status}: ${details.slice(0, 300)}`);
  }

  const polygonData = await response.json();
  if (polygonData?.status !== "OK" && polygonData?.status !== "DELAYED") {
    throw new Error(`Polygon status: ${polygonData?.status || "unknown"}`);
  }

  return polygonToFinnhubCandles(polygonData?.results);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const FINNHUB_API_KEY = Deno.env.get("VITE_FINNHUB_API_KEY") || Deno.env.get("FINNHUB_API_KEY");
    const POLYGON_API_KEY = Deno.env.get("VITE_POLYGON_API_KEY") || Deno.env.get("POLYGON_API_KEY");

    // Accept params via JSON body (preferred) or query string (fallback)
    let symbol: string | null = null;
    let resolution: string | null = null;
    let from: string | null = null;
    let to: string | null = null;

    const contentType = req.headers.get("content-type") || "";
    if (req.method !== "GET" && contentType.includes("application/json")) {
      const body = await req.json().catch(() => null);
      symbol = body?.symbol ?? null;
      resolution = body?.resolution ?? null;
      from = body?.from != null ? String(body.from) : null;
      to = body?.to != null ? String(body.to) : null;
    }

    if (!symbol) {
      const url = new URL(req.url);
      symbol = url.searchParams.get("symbol");
      resolution = resolution ?? url.searchParams.get("resolution");
      from = from ?? url.searchParams.get("from");
      to = to ?? url.searchParams.get("to");
    }

    resolution = resolution || "D";

    if (!symbol) {
      return new Response(JSON.stringify({ error: "Symbol is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!from || !to) {
      return new Response(JSON.stringify({ error: "From and to timestamps are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!FINNHUB_API_KEY && !POLYGON_API_KEY) {
      return new Response(JSON.stringify({ error: "No market data provider configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prefer Finnhub when available
    if (FINNHUB_API_KEY) {
      const finnhubUrl = `https://finnhub.io/api/v1/stock/candle?symbol=${symbol.toUpperCase()}&resolution=${resolution}&from=${from}&to=${to}&token=${FINNHUB_API_KEY}`;
      console.log(`[finnhub-candles] Fetching candles for ${symbol} (${resolution})`);

      const response = await fetch(finnhubUrl);

      if (response.ok) {
        const data = await response.json();
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const details = await response.text().catch(() => "");
      console.error(`[finnhub-candles] Finnhub API error: ${response.status}`);

      // Fall back automatically for plan/rate-limit errors
      if (POLYGON_API_KEY && [401, 403, 429].includes(response.status)) {
        const fallback = await fetchPolygonFallback(symbol, resolution, from, to, POLYGON_API_KEY);
        return new Response(JSON.stringify(fallback), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({ error: "Finnhub API error", status: response.status, details }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Finnhub key missing -> use Polygon directly
    const fallback = await fetchPolygonFallback(symbol, resolution, from, to, POLYGON_API_KEY!);
    return new Response(JSON.stringify(fallback), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[finnhub-candles] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
