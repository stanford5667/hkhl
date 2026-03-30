import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BASE_URL = "https://api.polygon.io";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("POLYGON_API_KEY");
    if (!apiKey) {
      return json({ ok: false, error: "POLYGON_API_KEY not configured" }, 500);
    }

    const { ticker, expirationDate } = await req.json();
    if (!ticker || typeof ticker !== "string") {
      return json({ ok: false, error: "ticker is required" }, 400);
    }

    const upperTicker = ticker.toUpperCase();

    // 1. Fetch stock price (prev day close - works on all plans)
    const quoteRes = await fetch(
      `${BASE_URL}/v2/aggs/ticker/${upperTicker}/prev?adjusted=true&apiKey=${apiKey}`
    );
    const quoteData = quoteRes.ok ? await quoteRes.json() : null;
    const stockPrice = quoteData?.results?.[0]?.c || 0;

    // 2. Fetch contracts list (reference endpoint - works on all plans)
    const params = new URLSearchParams({
      underlying_ticker: upperTicker,
      limit: "250",
      order: "asc",
      sort: "strike_price",
      apiKey,
    });

    if (expirationDate) {
      params.set("expiration_date", expirationDate);
    } else {
      const now = new Date();
      const sixtyDays = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
      params.set("expiration_date.gte", now.toISOString().split("T")[0]);
      params.set("expiration_date.lte", sixtyDays.toISOString().split("T")[0]);
    }

    const contractsRes = await fetch(`${BASE_URL}/v3/reference/options/contracts?${params}`);
    if (!contractsRes.ok) {
      const errText = await contractsRes.text().catch(() => "");
      console.error(`[polygon-options-chain] contracts fetch failed: ${contractsRes.status}`);
      return json({ ok: false, error: `Polygon API error: ${contractsRes.status}` }, 500);
    }

    const contractsData = await contractsRes.json();
    const contracts = contractsData.results || [];

    if (contracts.length === 0) {
      return json({ ok: true, ticker: upperTicker, stockPrice, expirations: [], contracts: [] });
    }

    // 3. Extract unique expirations
    const expirations = [...new Set(contracts.map((c: any) => c.expiration_date))].sort();
    const targetExpiration = expirationDate || expirations[0];
    const targetContracts = contracts.filter((c: any) => c.expiration_date === targetExpiration);

    // 4. Estimate option prices using simple Black-Scholes-like intrinsic + time value
    const now = new Date();
    const enrichedContracts = targetContracts
      .sort((a: any, b: any) => a.strike_price - b.strike_price)
      .map((c: any) => {
        const strike = c.strike_price;
        const isCall = c.contract_type === "call";
        const daysToExp = Math.max(1, (new Date(c.expiration_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        // Intrinsic value
        const intrinsic = isCall 
          ? Math.max(0, stockPrice - strike) 
          : Math.max(0, strike - stockPrice);
        
        // Simple time value estimate (sqrt of days * volatility proxy)
        const moneyness = Math.abs(stockPrice - strike) / stockPrice;
        const timeValue = stockPrice * 0.01 * Math.sqrt(daysToExp / 365) * Math.max(0.1, 1 - moneyness * 3);
        
        const estimatedPrice = Math.max(0.01, intrinsic + timeValue);
        const spread = Math.max(0.01, estimatedPrice * 0.05); // 5% spread estimate
        
        const bid = Math.max(0.01, estimatedPrice - spread / 2);
        const ask = estimatedPrice + spread / 2;
        const mid = (bid + ask) / 2;

        // Estimate delta
        let delta: number;
        if (isCall) {
          if (stockPrice > strike * 1.1) delta = 0.95;
          else if (stockPrice > strike * 1.02) delta = 0.7;
          else if (stockPrice > strike * 0.98) delta = 0.5;
          else if (stockPrice > strike * 0.9) delta = 0.3;
          else delta = 0.05;
        } else {
          if (stockPrice < strike * 0.9) delta = -0.95;
          else if (stockPrice < strike * 0.98) delta = -0.7;
          else if (stockPrice < strike * 1.02) delta = -0.5;
          else if (stockPrice < strike * 1.1) delta = -0.3;
          else delta = -0.05;
        }

        return {
          ticker: c.ticker,
          strike_price: strike,
          contract_type: c.contract_type,
          expiration_date: c.expiration_date,
          shares_per_contract: c.shares_per_contract || 100,
          bid: Math.round(bid * 100) / 100,
          ask: Math.round(ask * 100) / 100,
          mid: Math.round(mid * 100) / 100,
          last_price: Math.round(estimatedPrice * 100) / 100,
          volume: 0,
          open_interest: 0,
          implied_volatility: null,
          delta,
          gamma: null,
          theta: -(estimatedPrice / daysToExp * 0.7),
          vega: null,
          change: 0,
          change_percent: 0,
          is_estimated: true,
        };
      });

    return json({
      ok: true,
      ticker: upperTicker,
      stockPrice,
      expirations,
      selectedExpiration: targetExpiration,
      contracts: enrichedContracts,
      note: "Prices are estimated from stock price. Upgrade Polygon plan for live quotes.",
    });
  } catch (err) {
    console.error("[polygon-options-chain] Error:", err);
    return json({ ok: false, error: err.message || "Unknown error" }, 500);
  }
});
