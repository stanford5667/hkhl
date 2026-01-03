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

interface TickerDetails {
  ticker: string;
  name: string;
  description: string;
  sector: string;
  industry: string;
  marketCap: number | null;
  type: string;
  primaryExchange: string;
  currencyName: string;
  logoUrl: string | null;
  homepageUrl: string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const ticker = String(body.ticker || "").toUpperCase().trim();

    if (!ticker) {
      return json({ ok: false, error: "ticker is required" }, 400);
    }

    const POLYGON_API_KEY = Deno.env.get("POLYGON_API_KEY") || Deno.env.get("VITE_POLYGON_API_KEY");

    if (!POLYGON_API_KEY) {
      return json({ ok: false, error: "Polygon API key not configured" }, 500);
    }

    console.log(`[polygon-ticker-details] Fetching details for ${ticker}`);

    const url = `${BASE_URL}/v3/reference/tickers/${encodeURIComponent(ticker)}?apiKey=${POLYGON_API_KEY}`;
    
    const res = await fetch(url);
    const text = await res.text();

    if (!res.ok) {
      console.error(`[polygon-ticker-details] Polygon API error ${res.status}: ${text}`);
      return json(
        { ok: false, error: "Polygon API error", status: res.status, details: text },
        res.status
      );
    }

    const data = JSON.parse(text);

    if (data.status !== "OK" || !data.results) {
      console.warn(`[polygon-ticker-details] No data for ${ticker}`);
      return json({ ok: false, error: "No data found for ticker", ticker }, 404);
    }

    const r = data.results;
    
    const details: TickerDetails = {
      ticker: r.ticker,
      name: r.name || ticker,
      description: r.description || "",
      sector: r.sic_description || r.sector || "Unknown",
      industry: r.industry || "Unknown",
      marketCap: r.market_cap || null,
      type: r.type || "Unknown",
      primaryExchange: r.primary_exchange || "Unknown",
      currencyName: r.currency_name || "USD",
      logoUrl: r.branding?.logo_url || null,
      homepageUrl: r.homepage_url || null,
    };

    console.log(`[polygon-ticker-details] Got details for ${ticker}: ${details.name}, Sector: ${details.sector}`);

    return json({ ok: true, ticker, details }, 200);
  } catch (error) {
    console.error("[polygon-ticker-details] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return json({ ok: false, error: message }, 500);
  }
});
