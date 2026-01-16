import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Polygon API base
const POLYGON_BASE = "https://api.polygon.io";

// FRED API base  
const FRED_BASE = "https://api.stlouisfed.org/fred/series/observations";

// Commodities to sync
const COMMODITIES = [
  { symbol: "C:XAUUSD", name: "Gold", category: "metals" },
  { symbol: "C:XAGUSD", name: "Silver", category: "metals" },
  { symbol: "C:XPTUSD", name: "Platinum", category: "metals" },
  { symbol: "C:XCUUSD", name: "Copper", category: "metals" },
  { symbol: "C:CLUSD", name: "Crude Oil WTI", category: "energy" },
  { symbol: "C:BZUSD", name: "Brent Crude", category: "energy" },
  { symbol: "C:NGUSD", name: "Natural Gas", category: "energy" },
  { symbol: "C:ZCUSD", name: "Corn", category: "agriculture" },
  { symbol: "C:ZSUSD", name: "Soybeans", category: "agriculture" },
  { symbol: "C:ZWUSD", name: "Wheat", category: "agriculture" },
];

// Forex pairs to sync
const FOREX = [
  { symbol: "C:EURUSD", name: "EUR/USD", category: "major" },
  { symbol: "C:GBPUSD", name: "GBP/USD", category: "major" },
  { symbol: "C:USDJPY", name: "USD/JPY", category: "major" },
  { symbol: "C:USDCHF", name: "USD/CHF", category: "major" },
  { symbol: "C:AUDUSD", name: "AUD/USD", category: "major" },
  { symbol: "C:USDCAD", name: "USD/CAD", category: "major" },
];

// Economic indicators from FRED
const ECONOMIC_INDICATORS = [
  { id: "FEDFUNDS", name: "Fed Funds Rate", category: "rates", unit: "%" },
  { id: "DGS10", name: "10Y Treasury", category: "rates", unit: "%" },
  { id: "DGS2", name: "2Y Treasury", category: "rates", unit: "%" },
  { id: "CPIAUCSL", name: "CPI", category: "inflation", unit: "index" },
  { id: "UNRATE", name: "Unemployment Rate", category: "economic", unit: "%" },
  { id: "VIXCLS", name: "VIX", category: "indices", unit: "index" },
];

async function updateSyncStatus(
  supabase: any,
  syncType: string,
  status: string,
  recordsUpdated: number = 0,
  errorMessage: string | null = null
) {
  await supabase
    .from("data_sync_status")
    .update({
      status,
      last_sync_at: new Date().toISOString(),
      next_sync_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Next day
      records_updated: recordsUpdated,
      error_message: errorMessage,
      updated_at: new Date().toISOString(),
    })
    .eq("sync_type", syncType);
}

async function syncPolygonData(apiKey: string, items: typeof COMMODITIES, indicatorType: string) {
  const results: any[] = [];
  
  for (const item of items) {
    try {
      const today = new Date();
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const fromDate = weekAgo.toISOString().split("T")[0];
      const toDate = today.toISOString().split("T")[0];

      const url = `${POLYGON_BASE}/v2/aggs/ticker/${encodeURIComponent(item.symbol)}/range/1/day/${fromDate}/${toDate}?adjusted=true&sort=desc&limit=3&apiKey=${apiKey}`;
      
      const res = await fetch(url);
      if (!res.ok) continue;
      
      const data = await res.json();
      if (data.results && data.results.length >= 1) {
        const current = data.results[0];
        const previous = data.results[1] || current;
        const changeValue = current.c - previous.c;
        const changePercent = (changeValue / previous.c) * 100;

        results.push({
          symbol: item.symbol.replace("C:", ""),
          name: item.name,
          indicator_type: indicatorType,
          category: item.category,
          current_value: current.c,
          previous_value: previous.c,
          change_value: changeValue,
          change_percent: changePercent,
          source: "polygon",
          updated_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error(`Error fetching ${item.symbol}:`, err);
    }
  }
  
  return results;
}

async function syncFredData(apiKey: string) {
  const results: any[] = [];
  
  for (const indicator of ECONOMIC_INDICATORS) {
    try {
      const url = `${FRED_BASE}?series_id=${indicator.id}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=2`;
      
      const res = await fetch(url);
      if (!res.ok) continue;
      
      const data = await res.json();
      if (data.observations && data.observations.length >= 1) {
        const current = parseFloat(data.observations[0].value);
        const previous = data.observations[1] ? parseFloat(data.observations[1].value) : current;
        const changeValue = current - previous;
        const changePercent = previous !== 0 ? (changeValue / previous) * 100 : 0;

        results.push({
          symbol: indicator.id,
          name: indicator.name,
          indicator_type: "rate",
          category: indicator.category,
          current_value: current,
          previous_value: previous,
          change_value: changeValue,
          change_percent: changePercent,
          unit: indicator.unit,
          source: "fred",
          updated_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error(`Error fetching FRED ${indicator.id}:`, err);
    }
  }
  
  return results;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const polygonKey = Deno.env.get("POLYGON_API_KEY");
    const fredKey = Deno.env.get("FRED_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { syncType = "all" } = await req.json().catch(() => ({}));

    const syncResults: Record<string, { success: boolean; records: number; error?: string }> = {};

    // Sync commodities
    if ((syncType === "all" || syncType === "commodities") && polygonKey) {
      await updateSyncStatus(supabase, "commodities", "running");
      try {
        const commodityData = await syncPolygonData(polygonKey, COMMODITIES, "commodity");
        
        for (const item of commodityData) {
          await supabase
            .from("economic_indicators")
            .upsert(item, { onConflict: "symbol" });
        }
        
        await updateSyncStatus(supabase, "commodities", "success", commodityData.length);
        syncResults.commodities = { success: true, records: commodityData.length };
      } catch (err: any) {
        await updateSyncStatus(supabase, "commodities", "failed", 0, err.message);
        syncResults.commodities = { success: false, records: 0, error: err.message };
      }
    }

    // Sync forex
    if ((syncType === "all" || syncType === "forex") && polygonKey) {
      await updateSyncStatus(supabase, "forex", "running");
      try {
        const forexData = await syncPolygonData(polygonKey, FOREX as any, "currency");
        
        for (const item of forexData) {
          await supabase
            .from("economic_indicators")
            .upsert(item, { onConflict: "symbol" });
        }
        
        await updateSyncStatus(supabase, "forex", "success", forexData.length);
        syncResults.forex = { success: true, records: forexData.length };
      } catch (err: any) {
        await updateSyncStatus(supabase, "forex", "failed", 0, err.message);
        syncResults.forex = { success: false, records: 0, error: err.message };
      }
    }

    // Sync economic data from FRED
    if ((syncType === "all" || syncType === "economic") && fredKey) {
      await updateSyncStatus(supabase, "economic", "running");
      try {
        const economicData = await syncFredData(fredKey);
        
        for (const item of economicData) {
          await supabase
            .from("economic_indicators")
            .upsert(item, { onConflict: "symbol" });
        }
        
        await updateSyncStatus(supabase, "economic", "success", economicData.length);
        syncResults.economic = { success: true, records: economicData.length };
      } catch (err: any) {
        await updateSyncStatus(supabase, "economic", "failed", 0, err.message);
        syncResults.economic = { success: false, records: 0, error: err.message };
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Data sync completed",
        results: syncResults,
        syncedAt: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Sync error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
