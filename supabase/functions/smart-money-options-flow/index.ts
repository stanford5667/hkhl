import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Uses Polygon v3/reference/options/contracts + v2/aggs for options volume detection
// The /v3/snapshot/options endpoint requires a higher Polygon plan

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const POLYGON_API_KEY = Deno.env.get("POLYGON_API_KEY");
    if (!POLYGON_API_KEY) throw new Error("POLYGON_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    const tickers = body.tickers || ["SPY", "QQQ", "AAPL", "MSFT", "NVDA", "TSLA", "META", "AMZN"];

    console.log(`[OptionsFlow] Scanning ${tickers.length} tickers...`);

    let totalInserted = 0;
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    for (const ticker of tickers) {
      try {
        // Get options contracts for this ticker
        const contractsUrl = `https://api.polygon.io/v3/reference/options/contracts?underlying_ticker=${ticker}&expired=false&limit=50&order=desc&sort=open_interest&apiKey=${POLYGON_API_KEY}`;
        const res = await fetch(contractsUrl);

        if (!res.ok) {
          console.warn(`[OptionsFlow] ${ticker} contracts returned ${res.status}`);
          continue;
        }

        const data = await res.json();
        const contracts = data.results || [];

        if (contracts.length === 0) continue;

        // Get the underlying stock's last price
        const priceUrl = `https://api.polygon.io/v2/aggs/ticker/${ticker}/prev?adjusted=true&apiKey=${POLYGON_API_KEY}`;
        const priceRes = await fetch(priceUrl);
        let underlyingPrice = 0;
        if (priceRes.ok) {
          const priceData = await priceRes.json();
          underlyingPrice = priceData.results?.[0]?.c || 0;
        }

        // For each contract, get its recent trading volume from aggregates
        const unusualContracts: any[] = [];

        for (const contract of contracts.slice(0, 10)) {
          try {
            const optTicker = contract.ticker;
            const aggUrl = `https://api.polygon.io/v2/aggs/ticker/${optTicker}/prev?adjusted=true&apiKey=${POLYGON_API_KEY}`;
            const aggRes = await fetch(aggUrl);

            if (!aggRes.ok) continue;
            const aggData = await aggRes.json();
            const bar = aggData.results?.[0];
            if (!bar) continue;

            const volume = bar.v || 0;
            const oi = contract.open_interest || 1;
            const ratio = volume / oi;

            // Flag as unusual if volume > OI or volume > 500
            if (volume > 500 || ratio > 1) {
              unusualContracts.push({
                ticker,
                contract_type: contract.contract_type?.toLowerCase() || 'call',
                strike: contract.strike_price || 0,
                expiration: contract.expiration_date || todayStr,
                premium: (bar.c || 0) * volume * 100,
                volume,
                open_interest: contract.open_interest || 0,
                implied_volatility: null,
                volume_oi_ratio: Math.round(ratio * 100) / 100,
                sentiment: contract.contract_type?.toLowerCase() === 'call' ? 'bullish' : 'bearish',
                unusual_score: Math.min(100, Math.round(ratio * 20)),
                trade_time: new Date(bar.t).toISOString(),
                underlying_price: underlyingPrice,
              });
            }

            await new Promise(r => setTimeout(r, 150));
          } catch {
            // Skip individual contract errors
          }
        }

        if (unusualContracts.length > 0) {
          const { error } = await supabase.from("smart_money_options_flow").insert(unusualContracts);
          if (error) {
            console.error(`[OptionsFlow] Insert error for ${ticker}:`, error);
          } else {
            totalInserted += unusualContracts.length;
          }
        }

        await new Promise(r => setTimeout(r, 200));
      } catch (err) {
        console.error(`[OptionsFlow] Error for ${ticker}:`, err);
      }
    }

    console.log(`[OptionsFlow] Inserted ${totalInserted} unusual options`);

    return new Response(
      JSON.stringify({ success: true, inserted: totalInserted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[OptionsFlow] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
