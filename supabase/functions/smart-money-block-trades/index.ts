import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Uses Polygon v2/aggs to detect high-volume bars as proxy for block trade activity
// The /v3/trades endpoint requires a higher Polygon plan tier

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const POLYGON_API_KEY = Deno.env.get("POLYGON_API_KEY");
    if (!POLYGON_API_KEY) throw new Error("POLYGON_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    const tickers = body.tickers || ["SPY", "QQQ", "AAPL", "MSFT", "NVDA", "TSLA", "META", "AMZN", "GOOGL"];

    console.log(`[BlockTrades] Scanning ${tickers.length} tickers for high-volume activity...`);

    const today = new Date();
    const fiveDaysAgo = new Date(today.getTime() - 5 * 86400000);
    const fromDate = fiveDaysAgo.toISOString().split('T')[0];
    const toDate = today.toISOString().split('T')[0];

    let totalInserted = 0;

    for (const ticker of tickers) {
      try {
        // Use 5-min bars to detect volume spikes (available on Starter plan)
        const url = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/5/minute/${fromDate}/${toDate}?adjusted=true&sort=desc&limit=50&apiKey=${POLYGON_API_KEY}`;
        const res = await fetch(url);

        if (!res.ok) {
          console.warn(`[BlockTrades] ${ticker} returned ${res.status}`);
          continue;
        }

        const data = await res.json();
        const bars = data.results || [];

        if (bars.length === 0) continue;

        // Calculate average volume per bar
        const avgVolume = bars.reduce((sum: number, b: any) => sum + (b.v || 0), 0) / bars.length;

        // Find bars with volume > 3x average (proxy for block-like activity)
        const spikes = bars.filter((b: any) => (b.v || 0) > avgVolume * 3 && (b.v || 0) > 50000);

        if (spikes.length > 0) {
          const inserts = spikes.slice(0, 5).map((b: any) => ({
            ticker,
            shares: b.v || 0,
            price: b.vw || b.c || 0, // volume-weighted avg price
            total_value: (b.v || 0) * (b.vw || b.c || 0),
            trade_time: new Date(b.t).toISOString(),
            exchange: null,
            side: b.c > b.o ? 'buy' : b.c < b.o ? 'sell' : 'unknown',
            metadata: { source: 'polygon_agg_5min', avg_volume: avgVolume, volume_ratio: Math.round((b.v / avgVolume) * 100) / 100 },
          }));

          const { error } = await supabase.from("smart_money_block_trades").insert(inserts);
          if (error) {
            console.error(`[BlockTrades] Insert error for ${ticker}:`, error);
          } else {
            totalInserted += inserts.length;
          }
        }

        await new Promise(r => setTimeout(r, 200));
      } catch (err) {
        console.error(`[BlockTrades] Error for ${ticker}:`, err);
      }
    }

    console.log(`[BlockTrades] Inserted ${totalInserted} high-volume events`);

    return new Response(
      JSON.stringify({ success: true, inserted: totalInserted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[BlockTrades] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
