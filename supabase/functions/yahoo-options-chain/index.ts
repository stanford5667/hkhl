import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const TRADIER_BASE = "https://api.tradier.com/v1";

async function tradierFetch(path: string, token: string) {
  const res = await fetch(`${TRADIER_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Tradier API ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

function mapContract(c: any, contractType: "call" | "put") {
  return {
    ticker: c.symbol || "",
    strike_price: c.strike ?? 0,
    contract_type: contractType,
    expiration_date: c.expiration_date || "",
    shares_per_contract: 100,
    bid: c.bid ?? 0,
    ask: c.ask ?? 0,
    mid: c.bid != null && c.ask != null
      ? Math.round(((c.bid + c.ask) / 2) * 100) / 100
      : c.last ?? 0,
    last_price: c.last ?? 0,
    volume: c.volume ?? 0,
    open_interest: c.open_interest ?? 0,
    implied_volatility: c.greeks?.mid_iv ?? null,
    delta: c.greeks?.delta ?? null,
    gamma: c.greeks?.gamma ?? null,
    theta: c.greeks?.theta ?? null,
    vega: c.greeks?.vega ?? null,
    change: c.change ?? 0,
    change_percent: c.change_percentage ?? 0,
    in_the_money: c.bid > 0 && c.ask > 0,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const token = Deno.env.get("TRADIER_API_TOKEN");
    if (!token) {
      return json({ ok: false, error: "TRADIER_API_TOKEN not configured" }, 500);
    }

    const { ticker, expirationDate } = await req.json();
    if (!ticker || typeof ticker !== "string") {
      return json({ ok: false, error: "ticker is required" }, 400);
    }

    const upperTicker = ticker.toUpperCase();

    // Step 1: Get stock quote for current price
    let stockPrice = 0;
    try {
      const quoteData = await tradierFetch(
        `/markets/quotes?symbols=${upperTicker}&greeks=false`,
        token
      );
      const quote = quoteData?.quotes?.quote;
      stockPrice = quote?.last ?? quote?.close ?? 0;
    } catch (e) {
      console.error("[tradier-options] Quote fetch error:", e);
    }

    // Step 2: Get available expirations
    const expData = await tradierFetch(
      `/markets/options/expirations?symbol=${upperTicker}&includeAllRoots=true&strikes=false`,
      token
    );
    
    let expirations: string[] = [];
    const rawExp = expData?.expirations?.date;
    if (Array.isArray(rawExp)) {
      expirations = rawExp;
    } else if (typeof rawExp === "string") {
      expirations = [rawExp];
    }

    if (expirations.length === 0) {
      return json({
        ok: true,
        ticker: upperTicker,
        stockPrice,
        expirations: [],
        contracts: [],
      });
    }

    const selectedExpiration = expirationDate || expirations[0];

    // Step 3: Get options chain for selected expiration
    const chainData = await tradierFetch(
      `/markets/options/chains?symbol=${upperTicker}&expiration=${selectedExpiration}&greeks=true`,
      token
    );

    let rawOptions = chainData?.options?.option;
    if (!rawOptions) rawOptions = [];
    if (!Array.isArray(rawOptions)) rawOptions = [rawOptions];

    const contracts = rawOptions.map((c: any) =>
      mapContract(c, c.option_type === "call" ? "call" : "put")
    ).sort((a: any, b: any) => a.strike_price - b.strike_price);

    return json({
      ok: true,
      ticker: upperTicker,
      stockPrice,
      expirations,
      selectedExpiration,
      contracts,
    });
  } catch (err) {
    console.error("[tradier-options] Error:", err);
    return json({ ok: false, error: err.message || "Unknown error" }, 500);
  }
});
