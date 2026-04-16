import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BASE_URL = "https://api.polygon.io";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getMarketCapTier(marketCap: number | null): string {
  if (!marketCap) return "Unknown";
  if (marketCap >= 200_000_000_000) return "Mega";
  if (marketCap >= 10_000_000_000) return "Large";
  if (marketCap >= 2_000_000_000) return "Mid";
  if (marketCap >= 300_000_000) return "Small";
  return "Micro";
}

const SIC_TO_SECTOR: Record<string, string> = {
  "1": "Agriculture", "10": "Mining", "15": "Construction", "20": "Manufacturing",
  "35": "Technology", "36": "Technology", "37": "Industrials", "38": "Technology",
  "39": "Consumer Discretionary", "40": "Transportation", "45": "Transportation",
  "48": "Communication Services", "49": "Utilities", "50": "Consumer Discretionary",
  "51": "Consumer Discretionary", "52": "Consumer Discretionary", "53": "Consumer Discretionary",
  "54": "Consumer Staples", "55": "Consumer Discretionary", "56": "Consumer Discretionary",
  "57": "Consumer Discretionary", "58": "Consumer Discretionary", "59": "Consumer Discretionary",
  "60": "Financials", "61": "Financials", "62": "Financials", "63": "Financials",
  "64": "Financials", "65": "Real Estate", "67": "Financials", "70": "Consumer Discretionary",
  "72": "Consumer Discretionary", "73": "Technology", "78": "Communication Services",
  "79": "Communication Services", "80": "Healthcare", "81": "Technology",
  "82": "Consumer Discretionary", "83": "Consumer Discretionary", "87": "Technology", "99": "Other",
};

function getSectorFromSIC(sicCode: string | null): string {
  if (!sicCode) return "Unknown";
  const prefix = sicCode.substring(0, 2);
  return SIC_TO_SECTOR[prefix] || "Other";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const POLYGON_API_KEY = Deno.env.get("POLYGON_API_KEY") || Deno.env.get("VITE_POLYGON_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!POLYGON_API_KEY) {
      return json({ ok: false, error: "Polygon API key not configured" }, 500);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log("[sync-ticker-universe] Starting sync...");

    // Step 1: Fetch all US stock snapshots
    const snapshotUrl = `${BASE_URL}/v2/snapshot/locale/us/markets/stocks/tickers?apiKey=${POLYGON_API_KEY}`;
    const snapshotRes = await fetch(snapshotUrl);

    if (!snapshotRes.ok) {
      const errorText = await snapshotRes.text();
      console.error("[sync-ticker-universe] Snapshot error:", errorText);
      return json({ ok: false, error: `Polygon snapshot error: ${snapshotRes.status}` }, snapshotRes.status);
    }

    const snapshotData = await snapshotRes.json();
    const tickers = snapshotData.tickers || [];

    console.log(`[sync-ticker-universe] Got ${tickers.length} tickers from snapshot`);

    // Step 2: Fetch details for top tickers by volume (limit to avoid rate limits)
    // Include ALL tickers with valid price data — no cap
    const sortedByVolume = tickers
      .filter((t: any) => (t.day?.v > 0 && t.day?.c > 0) || (t.prevDay?.v > 0 && t.prevDay?.c > 0))
      .sort((a: any, b: any) => (b.day?.v || b.prevDay?.v || 0) - (a.day?.v || a.prevDay?.v || 0));

    console.log(`[sync-ticker-universe] Fetching details for ${sortedByVolume.length} tickers...`);

    const upsertRows: any[] = [];
    const batchSize = 50;

    for (let i = 0; i < sortedByVolume.length; i += batchSize) {
      const batch = sortedByVolume.slice(i, i + batchSize);

      const detailPromises = batch.map(async (t: any) => {
        try {
          const detailUrl = `${BASE_URL}/v3/reference/tickers/${encodeURIComponent(t.ticker)}?apiKey=${POLYGON_API_KEY}`;
          const detailRes = await fetch(detailUrl);
          if (!detailRes.ok) return null;
          const data = await detailRes.json();
          return { ticker: t.ticker, snapshot: t, details: data.results };
        } catch {
          return null;
        }
      });

      const results = await Promise.all(detailPromises);

      for (const r of results) {
        if (!r || !r.details) continue;

        const { ticker, snapshot, details } = r;
        const prevClose = snapshot.prevDay?.c || 0;
        const currentPrice = snapshot.day?.c || 0;
        const changePercent1D = prevClose > 0 ? ((currentPrice - prevClose) / prevClose) * 100 : null;

        upsertRows.push({
          ticker,
          name: details.name || ticker,
          asset_type: details.type || "CS",
          category: "stock",
          sector: getSectorFromSIC(details.sic_code || null),
          industry: details.sic_description || null,
          primary_exchange: details.primary_exchange || null,
          market_cap_tier: getMarketCapTier(details.market_cap),
          last_close: currentPrice,
          change_percent_1d: changePercent1D,
          avg_daily_volume: snapshot.day?.v || null,
          avg_daily_dollar_volume: (snapshot.day?.v || 0) * currentPrice,
          is_active: true,
          is_validated: true,
          validation_date: new Date().toISOString().split("T")[0],
          updated_at: new Date().toISOString(),
          metadata: {
            market_cap: details.market_cap,
            sic_code: details.sic_code,
          },
        });
      }

      // Small delay to avoid rate limits
      if (i + batchSize < sortedByVolume.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      console.log(`[sync-ticker-universe] Processed ${Math.min(i + batchSize, sortedByVolume.length)}/${sortedByVolume.length}`);
    }

    console.log(`[sync-ticker-universe] Upserting ${upsertRows.length} tickers...`);

    // Upsert in batches
    const upsertBatchSize = 100;
    let upsertedCount = 0;

    for (let i = 0; i < upsertRows.length; i += upsertBatchSize) {
      const batch = upsertRows.slice(i, i + upsertBatchSize);
      const { error } = await supabase
        .from("asset_universe")
        .upsert(batch, { onConflict: "ticker" });

      if (error) {
        console.error(`[sync-ticker-universe] Upsert error at batch ${i}:`, error);
      } else {
        upsertedCount += batch.length;
      }
    }

    console.log(`[sync-ticker-universe] Sync complete. Upserted ${upsertedCount} tickers.`);

    return json({
      ok: true,
      synced: upsertedCount,
      totalFromSnapshot: tickers.length,
    });

  } catch (error) {
    console.error("[sync-ticker-universe] Error:", error);
    return json({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
