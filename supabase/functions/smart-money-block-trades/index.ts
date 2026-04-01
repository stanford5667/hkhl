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

    console.log(`[BlockTrades] Scanning ${tickers.length} tickers using intraday bars...`);

    let totalInserted = 0;

    // Delete old block trades (>7 days)
    await supabase
      .from("smart_money_block_trades")
      .delete()
      .lt('trade_time', new Date(Date.now() - 7 * 86400000).toISOString());

    // Also delete all old daily-source entries (cleanup from old pipeline)
    await supabase
      .from("smart_money_block_trades")
      .delete()
      .filter('metadata->>source', 'eq', 'polygon_agg_daily');

    for (const ticker of tickers) {
      try {
        // Use 5-minute bars over last 2 trading days to detect volume spikes
        const now = new Date();
        const twoDaysAgo = new Date(now.getTime() - 3 * 86400000);
        const fromDate = twoDaysAgo.toISOString().split('T')[0];
        const toDate = now.toISOString().split('T')[0];

        const url = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/5/minute/${fromDate}/${toDate}?adjusted=true&sort=asc&limit=500&apiKey=${POLYGON_API_KEY}`;
        const res = await fetch(url);

        if (!res.ok) {
          console.warn(`[BlockTrades] ${ticker} returned ${res.status}`);
          continue;
        }

        const data = await res.json();
        const bars = data.results || [];

        if (bars.length < 20) continue;

        // Calculate rolling average volume over the dataset
        const avgVolume = bars.reduce((sum: number, b: any) => sum + (b.v || 0), 0) / bars.length;
        const avgDollarVolume = bars.reduce((sum: number, b: any) => sum + ((b.v || 0) * (b.vw || b.c || 0)), 0) / bars.length;

        // Find 5-min bars with volume > 3x average (these are actual block-trade-like events)
        const spikes = bars.filter((b: any) => {
          const vol = b.v || 0;
          const dollarVol = vol * (b.vw || b.c || 0);
          // Volume must be 3x average AND dollar volume must be significant
          return vol > avgVolume * 3 && dollarVol > 1000000; // >$1M in 5 min
        });

        if (spikes.length > 0) {
          // Check existing to avoid duplicates
          const { data: existing } = await supabase
            .from("smart_money_block_trades")
            .select("trade_time")
            .eq("ticker", ticker);
          const existingTimes = new Set((existing || []).map(e => e.trade_time));

          const inserts = spikes
            .slice(0, 15) // Keep top 15 spikes per ticker
            .map((b: any) => {
              const vol = b.v || 0;
              const vwap = b.vw || b.c || 0;
              const dollarVol = vol * vwap;
              const volumeRatio = Math.round((vol / avgVolume) * 100) / 100;

              return {
                ticker,
                shares: Math.round(vol),
                price: Math.round(vwap * 100) / 100,
                total_value: Math.round(dollarVol * 100) / 100,
                trade_time: new Date(b.t).toISOString(),
                exchange: null,
                side: b.c > b.o ? 'buy' : b.c < b.o ? 'sell' : 'unknown',
                metadata: {
                  source: 'polygon_agg_5min',
                  avg_volume: Math.round(avgVolume),
                  avg_dollar_volume: Math.round(avgDollarVolume),
                  volume_ratio: volumeRatio,
                  bar_open: b.o,
                  bar_close: b.c,
                  bar_high: b.h,
                  bar_low: b.l,
                },
              };
            })
            .filter(i => !existingTimes.has(i.trade_time));

          if (inserts.length > 0) {
            const { error } = await supabase.from("smart_money_block_trades").insert(inserts);
            if (error) console.error(`[BlockTrades] Insert error for ${ticker}:`, error);
            else totalInserted += inserts.length;
          }
        }

        await new Promise(r => setTimeout(r, 250));
      } catch (err) {
        console.error(`[BlockTrades] Error for ${ticker}:`, err);
      }
    }

    console.log(`[BlockTrades] Inserted ${totalInserted} block trade events`);

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
