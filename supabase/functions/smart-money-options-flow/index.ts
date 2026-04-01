import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const POLYGON_BASE = "https://api.polygon.io";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const POLYGON_API_KEY = Deno.env.get("POLYGON_API_KEY");
    if (!POLYGON_API_KEY) throw new Error("POLYGON_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    const tickers = body.tickers || ["SPY", "QQQ", "AAPL", "MSFT", "NVDA", "TSLA", "META", "AMZN", "GOOGL", "AMD"];

    console.log(`[OptionsFlow] Scanning ${tickers.length} tickers for unusual options...`);

    let totalInserted = 0;

    for (const ticker of tickers) {
      try {
        // Get options snapshot for this ticker
        const today = new Date().toISOString().split('T')[0];
        const url = `${POLYGON_BASE}/v3/snapshot/options/${ticker}?limit=50&apiKey=${POLYGON_API_KEY}`;
        const res = await fetch(url);

        if (!res.ok) {
          console.warn(`[OptionsFlow] ${ticker} returned ${res.status}`);
          continue;
        }

        const data = await res.json();
        const contracts = data.results || [];

        // Identify unusual options (volume > 2x open interest, or volume > 1000)
        const unusualContracts = contracts.filter((c: any) => {
          const volume = c.day?.volume || 0;
          const oi = c.open_interest || 1;
          const volumeOiRatio = volume / oi;
          return volume > 1000 || volumeOiRatio > 2;
        });

        if (unusualContracts.length > 0) {
          const inserts = unusualContracts.slice(0, 10).map((c: any) => {
            const details = c.details || {};
            const volume = c.day?.volume || 0;
            const oi = c.open_interest || 0;
            const lastPrice = c.day?.last_price || c.last_quote?.midpoint || 0;
            const contractType = details.contract_type?.toLowerCase() || 'call';
            
            return {
              ticker,
              contract_type: contractType,
              strike: details.strike_price || 0,
              expiration: details.expiration_date || today,
              premium: lastPrice * volume * 100, // approximate total premium
              volume,
              open_interest: oi,
              implied_volatility: c.implied_volatility || null,
              volume_oi_ratio: oi > 0 ? Math.round((volume / oi) * 100) / 100 : null,
              sentiment: contractType === 'call' ? 'bullish' : 'bearish',
              unusual_score: Math.min(100, Math.round((volume / Math.max(oi, 1)) * 10)),
              trade_time: new Date().toISOString(),
              underlying_price: c.underlying_asset?.price || null,
            };
          });

          const { error } = await supabase.from("smart_money_options_flow").insert(inserts);
          if (error) {
            console.error(`[OptionsFlow] Insert error for ${ticker}:`, error);
          } else {
            totalInserted += inserts.length;
          }
        }

        await new Promise(r => setTimeout(r, 250));
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
