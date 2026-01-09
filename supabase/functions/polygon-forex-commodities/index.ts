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

// Major currency pairs
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
  { symbol: "C:EURCHF", name: "EUR/CHF", base: "EUR", quote: "CHF", category: "cross" },
  { symbol: "C:AUDJPY", name: "AUD/JPY", base: "AUD", quote: "JPY", category: "cross" },
  // Emerging markets
  { symbol: "C:USDMXN", name: "USD/MXN", base: "USD", quote: "MXN", category: "emerging" },
  { symbol: "C:USDBRL", name: "USD/BRL", base: "USD", quote: "BRL", category: "emerging" },
  { symbol: "C:USDZAR", name: "USD/ZAR", base: "USD", quote: "ZAR", category: "emerging" },
  { symbol: "C:USDTRY", name: "USD/TRY", base: "USD", quote: "TRY", category: "emerging" },
  { symbol: "C:USDINR", name: "USD/INR", base: "USD", quote: "INR", category: "emerging" },
  { symbol: "C:USDCNY", name: "USD/CNY", base: "USD", quote: "CNY", category: "emerging" },
  { symbol: "C:USDSGD", name: "USD/SGD", base: "USD", quote: "SGD", category: "emerging" },
  { symbol: "C:USDHKD", name: "USD/HKD", base: "USD", quote: "HKD", category: "emerging" },
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

// Fetch snapshot for a single forex/commodity ticker
async function fetchTickerSnapshot(
  symbol: string, 
  apiKey: string
): Promise<{ ticker: string; lastTrade?: { p: number; t: number }; prevDay?: { c: number; h: number; l: number; o: number } } | null> {
  try {
    // Use the forex/currencies snapshot endpoint
    const url = `${BASE_URL}/v2/snapshot/locale/global/markets/forex/tickers/${encodeURIComponent(symbol)}?apiKey=${apiKey}`;
    
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[Snapshot] ${symbol} returned ${res.status}`);
      return null;
    }
    
    const data = await res.json();
    return data.ticker || null;
  } catch (err) {
    console.error(`[Snapshot] Error fetching ${symbol}:`, err);
    return null;
  }
}

// Fetch latest aggregate bar for a ticker
async function fetchLatestBar(
  symbol: string, 
  apiKey: string
): Promise<{ c: number; h: number; l: number; o: number; v: number; t: number } | null> {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const fromDate = yesterday.toISOString().split('T')[0];
    const toDate = new Date().toISOString().split('T')[0];
    
    const url = `${BASE_URL}/v2/aggs/ticker/${encodeURIComponent(symbol)}/range/1/day/${fromDate}/${toDate}?adjusted=true&sort=desc&limit=2&apiKey=${apiKey}`;
    
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[Aggs] ${symbol} returned ${res.status}`);
      return null;
    }
    
    const data = await res.json();
    if (data.results && data.results.length > 0) {
      return data.results[0];
    }
    return null;
  } catch (err) {
    console.error(`[Aggs] Error fetching ${symbol}:`, err);
    return null;
  }
}

// Get previous close for calculating change
async function fetchPreviousClose(
  symbol: string, 
  apiKey: string
): Promise<number | null> {
  try {
    const url = `${BASE_URL}/v2/aggs/ticker/${encodeURIComponent(symbol)}/prev?adjusted=true&apiKey=${apiKey}`;
    
    const res = await fetch(url);
    if (!res.ok) return null;
    
    const data = await res.json();
    if (data.results && data.results.length > 0) {
      return data.results[0].c;
    }
    return null;
  } catch {
    return null;
  }
}

// Fetch all commodities data
async function fetchCommodities(apiKey: string): Promise<TickerSnapshot[]> {
  const results: TickerSnapshot[] = [];
  
  // Fetch in parallel with rate limiting
  const batchSize = 5;
  for (let i = 0; i < COMMODITIES.length; i += batchSize) {
    const batch = COMMODITIES.slice(i, i + batchSize);
    
    const batchResults = await Promise.all(
      batch.map(async (commodity) => {
        // Try snapshot first
        const snapshot = await fetchTickerSnapshot(commodity.symbol, apiKey);
        
        let price = 0;
        let prevClose = 0;
        let high = 0;
        let low = 0;
        let open = 0;
        let timestamp = new Date().toISOString();
        
        if (snapshot?.lastTrade?.p) {
          price = snapshot.lastTrade.p;
          timestamp = new Date(snapshot.lastTrade.t).toISOString();
          
          if (snapshot.prevDay) {
            prevClose = snapshot.prevDay.c;
            high = snapshot.prevDay.h;
            low = snapshot.prevDay.l;
            open = snapshot.prevDay.o;
          }
        } else {
          // Fallback to aggs
          const bar = await fetchLatestBar(commodity.symbol, apiKey);
          if (bar) {
            price = bar.c;
            high = bar.h;
            low = bar.l;
            open = bar.o;
            timestamp = new Date(bar.t).toISOString();
          }
          
          // Get previous close separately
          const prev = await fetchPreviousClose(commodity.symbol, apiKey);
          if (prev) prevClose = prev;
        }
        
        if (price === 0) return null;
        
        const change = prevClose > 0 ? price - prevClose : 0;
        const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;
        
        return {
          symbol: commodity.symbol,
          name: commodity.name,
          price,
          change: Math.round(change * 10000) / 10000,
          changePercent: Math.round(changePercent * 100) / 100,
          high,
          low,
          open,
          prevClose,
          timestamp,
          unit: commodity.unit,
          category: commodity.category,
        };
      })
    );
    
    for (const result of batchResults) {
      if (result !== null) {
        results.push(result);
      }
    }
    
    // Small delay between batches to avoid rate limits
    if (i + batchSize < COMMODITIES.length) {
      await new Promise(r => setTimeout(r, 200));
    }
  }
  
  return results;
}

// Fetch all forex data
async function fetchForex(apiKey: string): Promise<TickerSnapshot[]> {
  const results: TickerSnapshot[] = [];
  
  const batchSize = 5;
  for (let i = 0; i < FOREX_PAIRS.length; i += batchSize) {
    const batch = FOREX_PAIRS.slice(i, i + batchSize);
    
    const batchResults = await Promise.all(
      batch.map(async (pair) => {
        const snapshot = await fetchTickerSnapshot(pair.symbol, apiKey);
        
        let price = 0;
        let prevClose = 0;
        let high = 0;
        let low = 0;
        let open = 0;
        let timestamp = new Date().toISOString();
        
        if (snapshot?.lastTrade?.p) {
          price = snapshot.lastTrade.p;
          timestamp = new Date(snapshot.lastTrade.t).toISOString();
          
          if (snapshot.prevDay) {
            prevClose = snapshot.prevDay.c;
            high = snapshot.prevDay.h;
            low = snapshot.prevDay.l;
            open = snapshot.prevDay.o;
          }
        } else {
          const bar = await fetchLatestBar(pair.symbol, apiKey);
          if (bar) {
            price = bar.c;
            high = bar.h;
            low = bar.l;
            open = bar.o;
            timestamp = new Date(bar.t).toISOString();
          }
          
          const prev = await fetchPreviousClose(pair.symbol, apiKey);
          if (prev) prevClose = prev;
        }
        
        if (price === 0) return null;
        
        const change = prevClose > 0 ? price - prevClose : 0;
        const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;
        
        // Determine decimal places based on pair
        const isJpyPair = pair.quote === 'JPY' || pair.base === 'JPY';
        const decimals = isJpyPair ? 3 : 5;
        
        return {
          symbol: pair.symbol,
          name: pair.name,
          price: Math.round(price * Math.pow(10, decimals)) / Math.pow(10, decimals),
          change: Math.round(change * Math.pow(10, decimals)) / Math.pow(10, decimals),
          changePercent: Math.round(changePercent * 100) / 100,
          high: Math.round(high * Math.pow(10, decimals)) / Math.pow(10, decimals),
          low: Math.round(low * Math.pow(10, decimals)) / Math.pow(10, decimals),
          open: Math.round(open * Math.pow(10, decimals)) / Math.pow(10, decimals),
          prevClose: Math.round(prevClose * Math.pow(10, decimals)) / Math.pow(10, decimals),
          timestamp,
          category: pair.category,
          base: pair.base,
          quote: pair.quote,
        };
      })
    );
    
    for (const result of batchResults) {
      if (result !== null) {
        results.push(result);
      }
    }
    
    if (i + batchSize < FOREX_PAIRS.length) {
      await new Promise(r => setTimeout(r, 200));
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

    const POLYGON_API_KEY = Deno.env.get("VITE_POLYGON_API_KEY") || Deno.env.get("POLYGON_API_KEY");

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
