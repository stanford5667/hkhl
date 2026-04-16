import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const POLYGON_API_KEY = Deno.env.get("POLYGON_API_KEY") || Deno.env.get("VITE_POLYGON_API_KEY");
    if (!POLYGON_API_KEY) {
      return new Response(JSON.stringify({ ok: false, error: "No API key" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const ticker = (body.ticker || "").toUpperCase().trim();
    const days = Math.min(Math.max(body.days || 45, 1), 730);

    if (!ticker || ticker.length > 10) {
      return new Response(JSON.stringify({ ok: false, error: "Invalid ticker" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const toDate = new Date().toISOString().split("T")[0];
    const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const url = `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(ticker)}/range/1/day/${fromDate}/${toDate}?adjusted=true&sort=asc&limit=5000&apiKey=${POLYGON_API_KEY}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[polygon-daily-bars] API error ${res.status}: ${errText.slice(0, 200)}`);
      return new Response(JSON.stringify({ ok: false, error: `Polygon API error: ${res.status}` }), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const results = data.results || [];

    const bars = results.map((bar: any) => ({
      date: new Date(bar.t).toISOString().split("T")[0],
      open: bar.o,
      high: bar.h,
      low: bar.l,
      close: bar.c,
      volume: bar.v,
      vwap: bar.vw || null,
    }));

    console.log(`[polygon-daily-bars] ${ticker}: ${bars.length} bars (${days}d)`);

    return new Response(JSON.stringify({ ok: true, ticker, bars }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[polygon-daily-bars] Error:", err);
    return new Response(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
