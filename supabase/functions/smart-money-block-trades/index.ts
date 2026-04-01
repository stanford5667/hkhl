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
    const tickers = body.tickers || ["SPY", "QQQ", "AAPL", "MSFT", "NVDA", "TSLA", "META", "AMZN", "GOOGL"];

    console.log(`[BlockTrades] Checking ${tickers.length} tickers for large trades...`);

    let totalInserted = 0;

    for (const ticker of tickers) {
      try {
        // Get recent trades and filter for large ones
        const url = `${POLYGON_BASE}/v3/trades/${ticker}?limit=50&order=desc&apiKey=${POLYGON_API_KEY}`;
        const res = await fetch(url);
        
        if (!res.ok) {
          console.warn(`[BlockTrades] ${ticker} returned ${res.status}`);
          continue;
        }

        const data = await res.json();
        const trades = data.results || [];

        // Filter for block trades (>10,000 shares or >$1M value)
        const blockTrades = trades.filter((t: any) => {
          const shares = t.size || 0;
          const price = t.price || 0;
          const value = shares * price;
          return shares >= 10000 || value >= 1000000;
        });

        if (blockTrades.length > 0) {
          const inserts = blockTrades.map((t: any) => ({
            ticker,
            shares: t.size || 0,
            price: t.price || 0,
            total_value: (t.size || 0) * (t.price || 0),
            trade_time: new Date(t.sip_timestamp / 1000000).toISOString(), // nanoseconds to ms
            exchange: t.exchange ? String(t.exchange) : null,
            side: t.conditions?.includes(37) ? 'sell' : t.conditions?.includes(38) ? 'buy' : 'unknown',
          }));

          const { error } = await supabase.from("smart_money_block_trades").insert(inserts);
          if (error) {
            console.error(`[BlockTrades] Insert error for ${ticker}:`, error);
          } else {
            totalInserted += inserts.length;
          }
        }

        // Rate limiting for Polygon
        await new Promise(r => setTimeout(r, 200));
      } catch (err) {
        console.error(`[BlockTrades] Error for ${ticker}:`, err);
      }
    }

    console.log(`[BlockTrades] Inserted ${totalInserted} block trades`);

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
