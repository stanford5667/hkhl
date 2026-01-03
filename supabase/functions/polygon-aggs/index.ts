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

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const POLYGON_API_KEY =
      Deno.env.get("POLYGON_API_KEY") || Deno.env.get("VITE_POLYGON_API_KEY");

    if (!POLYGON_API_KEY) {
      return json({ ok: false, error: "Polygon API key not configured" }, 500);
    }

    const body = await req.json().catch(() => ({}));

    const ticker = String(body.ticker || "").toUpperCase().trim();
    const startDate = String(body.startDate || "").trim();
    const endDate = String(body.endDate || "").trim();
    const timespan = String(body.timespan || "day").trim();

    if (!ticker) return json({ ok: false, error: "ticker is required" }, 400);
    if (!startDate || !endDate) return json({ ok: false, error: "startDate and endDate are required" }, 400);

    console.log(`[polygon-aggs] Fetching ${ticker} ${timespan} ${startDate}..${endDate}`);

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

    console.log(`[polygon-aggs] Got ${allResults.length} bars for ${ticker}`);

    return json({ ok: true, ticker, results: allResults }, 200);
  } catch (error) {
    console.error("[polygon-aggs] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return json({ ok: false, error: message }, 500);
  }
});
