import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const POLYGON_API_KEY = Deno.env.get("POLYGON_API_KEY");
    if (!POLYGON_API_KEY) throw new Error("POLYGON_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    const tickers = body.tickers || ["SPY", "QQQ", "AAPL", "MSFT", "NVDA", "TSLA", "META", "AMZN", "GOOGL", "JPM", "GS", "BAC"];

    console.log(`[BlockTrades] Scanning ${tickers.length} tickers for high-volume activity...`);

    // Use daily bars to find volume spikes — more reliable on Starter plan
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 86400000);
    const fromDate = thirtyDaysAgo.toISOString().split('T')[0];
    const toDate = today.toISOString().split('T')[0];

    let totalInserted = 0;

    // Delete old block trades first
    await supabase
      .from("smart_money_block_trades")
      .delete()
      .lt('trade_time', new Date(Date.now() - 14 * 86400000).toISOString());

    for (const ticker of tickers) {
      try {
        // Use hourly bars over 5 days for better granularity
        const url = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/1/hour/${fromDate}/${toDate}?adjusted=true&sort=desc&limit=120&apiKey=${POLYGON_API_KEY}`;
        const res = await fetch(url);

        if (!res.ok) {
          console.warn(`[BlockTrades] ${ticker} returned ${res.status}`);
          continue;
        }

        const data = await res.json();
        const bars = data.results || [];

        if (bars.length < 10) continue;

        // Calculate average volume
        const avgVolume = bars.reduce((sum: number, b: any) => sum + (b.v || 0), 0) / bars.length;

        // Find bars with volume > 1.3x average (daily bars have less variance)
        const spikes = bars.filter((b: any) => (b.v || 0) > avgVolume * 1.3);

        if (spikes.length > 0) {
          // Check for existing entries to avoid duplicates
          const { data: existing } = await supabase
            .from("smart_money_block_trades")
            .select("trade_time")
            .eq("ticker", ticker);
          const existingTimes = new Set((existing || []).map(e => e.trade_time));

          const inserts = spikes
            .slice(0, 8)
            .map((b: any) => ({
              ticker,
              shares: Math.round(b.v || 0),
              price: b.vw || b.c || 0,
              total_value: (b.v || 0) * (b.vw || b.c || 0),
              trade_time: new Date(b.t).toISOString(),
              exchange: null,
              side: b.c > b.o ? 'buy' : b.c < b.o ? 'sell' : 'unknown',
              metadata: { source: 'polygon_agg_daily', avg_volume: avgVolume, volume_ratio: Math.round((b.v / avgVolume) * 100) / 100 },
            }))
            .filter(i => !existingTimes.has(i.trade_time));

          if (inserts.length > 0) {
            const { error } = await supabase.from("smart_money_block_trades").insert(inserts);
            if (error) console.error(`[BlockTrades] Insert error for ${ticker}:`, error);
            else totalInserted += inserts.length;
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
