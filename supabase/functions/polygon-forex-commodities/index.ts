import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BASE_URL = "https://api.polygon.io";

// Major commodities with their Polygon ticker formats
const COMMODITIES = [
  // Metals
  { symbol: "C:XAUUSD", name: "Gold", unit: "oz", category: "metals" },
  { symbol: "C:XAGUSD", name: "Silver", unit: "oz", category: "metals" },
  { symbol: "C:XPTUSD", name: "Platinum", unit: "oz", category: "metals" },
  { symbol: "C:XPDUSD", name: "Palladium", unit: "oz", category: "metals" },
  { symbol: "C:XCUUSD", name: "Copper", unit: "lb", category: "metals" },
  // Energy
  { symbol: "C:CLUSD", name: "Crude Oil WTI", unit: "bbl", category: "energy" },
  { symbol: "C:BZUSD", name: "Brent Crude", unit: "bbl", category: "energy" },
  { symbol: "C:NGUSD", name: "Natural Gas", unit: "MMBtu", category: "energy" },
  { symbol: "C:RBUSD", name: "Gasoline RBOB", unit: "gal", category: "energy" },
  { symbol: "C:HOUSD", name: "Heating Oil", unit: "gal", category: "energy" },
  // Agriculture
  { symbol: "C:ZCUSD", name: "Corn", unit: "bu", category: "agriculture" },
  { symbol: "C:ZSUSD", name: "Soybeans", unit: "bu", category: "agriculture" },
  { symbol: "C:ZWUSD", name: "Wheat", unit: "bu", category: "agriculture" },
  { symbol: "C:CTUSD", name: "Cotton", unit: "lb", category: "agriculture" },
  { symbol: "C:KCUSD", name: "Coffee", unit: "lb", category: "agriculture" },
  { symbol: "C:SBUSD", name: "Sugar", unit: "lb", category: "agriculture" },
  { symbol: "C:CCUSD", name: "Cocoa", unit: "mt", category: "agriculture" },
  { symbol: "C:LCUSD", name: "Live Cattle", unit: "lb", category: "agriculture" },
  { symbol: "C:LHUSD", name: "Lean Hogs", unit: "lb", category: "agriculture" },
];

// Major currency pairs - reduced to essential pairs for free tier
const FOREX_PAIRS = [
  // Major pairs
  { symbol: "C:EURUSD", name: "EUR/USD", base: "EUR", quote: "USD", category: "major" },
  { symbol: "C:GBPUSD", name: "GBP/USD", base: "GBP", quote: "USD", category: "major" },
  { symbol: "C:USDJPY", name: "USD/JPY", base: "USD", quote: "JPY", category: "major" },
  { symbol: "C:USDCHF", name: "USD/CHF", base: "USD", quote: "CHF", category: "major" },
  { symbol: "C:AUDUSD", name: "AUD/USD", base: "AUD", quote: "USD", category: "major" },
  { symbol: "C:USDCAD", name: "USD/CAD", base: "USD", quote: "CAD", category: "major" },
  { symbol: "C:NZDUSD", name: "NZD/USD", base: "NZD", quote: "USD", category: "major" },
  // Cross pairs
  { symbol: "C:EURGBP", name: "EUR/GBP", base: "EUR", quote: "GBP", category: "cross" },
  { symbol: "C:EURJPY", name: "EUR/JPY", base: "EUR", quote: "JPY", category: "cross" },
  { symbol: "C:GBPJPY", name: "GBP/JPY", base: "GBP", quote: "JPY", category: "cross" },
];

interface TickerSnapshot {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  prevClose: number;
  timestamp: string;
  unit?: string;
  category: string;
  base?: string;
  quote?: string;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Fetch previous day bar for a single ticker using prev endpoint
async function fetchPrevDayBar(
  symbol: string, 
  apiKey: string
): Promise<{ c: number; h: number; l: number; o: number; v: number; t: number } | null> {
  try {
    const url = `${BASE_URL}/v2/aggs/ticker/${encodeURIComponent(symbol)}/prev?adjusted=true&apiKey=${apiKey}`;
    
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[Prev] ${symbol} returned ${res.status}`);
      return null;
    }
    
    const data = await res.json();
    if (data.results && data.results.length > 0) {
      return data.results[0];
    }
    return null;
  } catch (err) {
    console.error(`[Prev] Error fetching ${symbol}:`, err);
    return null;
  }
}

// Fetch previous 2 days to calculate change
async function fetchRecentBars(
  symbol: string, 
  apiKey: string
): Promise<{ current: { c: number; h: number; l: number; o: number; t: number }; previous: { c: number } } | null> {
  try {
    const today = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(today.getDate() - 7);
    
    const fromDate = weekAgo.toISOString().split('T')[0];
    const toDate = today.toISOString().split('T')[0];
    
    const url = `${BASE_URL}/v2/aggs/ticker/${encodeURIComponent(symbol)}/range/1/day/${fromDate}/${toDate}?adjusted=true&sort=desc&limit=3&apiKey=${apiKey}`;
    
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[Bars] ${symbol} returned ${res.status}`);
      return null;
    }
    
    const data = await res.json();
    if (data.results && data.results.length >= 2) {
      return {
        current: data.results[0],
        previous: { c: data.results[1].c }
      };
    } else if (data.results && data.results.length === 1) {
      // Only one bar, use same as previous
      return {
        current: data.results[0],
        previous: { c: data.results[0].o }
      };
    }
    return null;
  } catch (err) {
    console.error(`[Bars] Error fetching ${symbol}:`, err);
    return null;
  }
}

// Fetch all commodities data using efficient prev endpoint
async function fetchCommodities(apiKey: string): Promise<TickerSnapshot[]> {
  const results: TickerSnapshot[] = [];
  
  // Process all at once with a single batch
  const allPromises = COMMODITIES.map(async (commodity) => {
    const bars = await fetchRecentBars(commodity.symbol, apiKey);
    
    if (!bars) return null;
    
    const { current, previous } = bars;
    const price = current.c;
    const prevClose = previous.c;
    const change = price - prevClose;
    const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;
    
    return {
      symbol: commodity.symbol,
      name: commodity.name,
      price: Math.round(price * 10000) / 10000,
      change: Math.round(change * 10000) / 10000,
      changePercent: Math.round(changePercent * 100) / 100,
      high: current.h,
      low: current.l,
      open: current.o,
      prevClose,
      timestamp: new Date(current.t).toISOString(),
      unit: commodity.unit,
      category: commodity.category,
    };
  });
  
  const batchResults = await Promise.all(allPromises);
  
  for (const result of batchResults) {
    if (result !== null) {
      results.push(result);
    }
  }
  
  return results;
}

// Fetch all forex data
async function fetchForex(apiKey: string): Promise<TickerSnapshot[]> {
  const results: TickerSnapshot[] = [];
  
  const allPromises = FOREX_PAIRS.map(async (pair) => {
    const bars = await fetchRecentBars(pair.symbol, apiKey);
    
    if (!bars) return null;
    
    const { current, previous } = bars;
    const price = current.c;
    const prevClose = previous.c;
    const change = price - prevClose;
    const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;
    
    // Determine decimal places based on pair
    const isJpyPair = pair.quote === 'JPY' || pair.base === 'JPY';
    const decimals = isJpyPair ? 3 : 5;
    const multiplier = Math.pow(10, decimals);
    
    return {
      symbol: pair.symbol,
      name: pair.name,
      price: Math.round(price * multiplier) / multiplier,
      change: Math.round(change * multiplier) / multiplier,
      changePercent: Math.round(changePercent * 100) / 100,
      high: Math.round(current.h * multiplier) / multiplier,
      low: Math.round(current.l * multiplier) / multiplier,
      open: Math.round(current.o * multiplier) / multiplier,
      prevClose: Math.round(prevClose * multiplier) / multiplier,
      timestamp: new Date(current.t).toISOString(),
      category: pair.category,
      base: pair.base,
      quote: pair.quote,
    };
  });
  
  const batchResults = await Promise.all(allPromises);
  
  for (const result of batchResults) {
    if (result !== null) {
      results.push(result);
    }
  }
  
  return results;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { type = "both" } = body; // "commodities", "forex", or "both"

    const POLYGON_API_KEY = Deno.env.get("POLYGON_API_KEY") || Deno.env.get("VITE_POLYGON_API_KEY");

    if (!POLYGON_API_KEY) {
      return json({ ok: false, error: "Polygon API key not configured" }, 500);
    }

    console.log(`[ForexCommodities] Fetching ${type} data...`);

    let commodities: TickerSnapshot[] = [];
    let forex: TickerSnapshot[] = [];

    if (type === "commodities" || type === "both") {
      commodities = await fetchCommodities(POLYGON_API_KEY);
      console.log(`[ForexCommodities] Got ${commodities.length} commodities`);
    }

    if (type === "forex" || type === "both") {
      forex = await fetchForex(POLYGON_API_KEY);
      console.log(`[ForexCommodities] Got ${forex.length} forex pairs`);
    }

    return json({
      ok: true,
      commodities,
      forex,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[ForexCommodities] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return json({ ok: false, error: message }, 500);
  }
});
