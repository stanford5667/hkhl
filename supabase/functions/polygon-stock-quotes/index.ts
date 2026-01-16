import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BASE_URL = "https://api.polygon.io";

// Major US indices/ETFs
const STOCK_INFO: Record<string, { name: string; type: string }> = {
  'SPY': { name: 'S&P 500 ETF', type: 'ETF' },
  'QQQ': { name: 'Nasdaq 100 ETF', type: 'ETF' },
  'DIA': { name: 'Dow Jones ETF', type: 'ETF' },
  'IWM': { name: 'Russell 2000 ETF', type: 'ETF' },
  'VTI': { name: 'Total Market ETF', type: 'ETF' },
  'AAPL': { name: 'Apple Inc.', type: 'Stock' },
  'MSFT': { name: 'Microsoft Corp.', type: 'Stock' },
  'GOOGL': { name: 'Alphabet Inc.', type: 'Stock' },
  'AMZN': { name: 'Amazon.com Inc.', type: 'Stock' },
  'NVDA': { name: 'NVIDIA Corp.', type: 'Stock' },
  'META': { name: 'Meta Platforms', type: 'Stock' },
  'TSLA': { name: 'Tesla Inc.', type: 'Stock' },
};

interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  volume: number;
  timestamp: string;
  source: string;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Fetch previous day data for a stock
async function fetchStockData(
  symbol: string, 
  apiKey: string
): Promise<StockQuote | null> {
  try {
    const today = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(today.getDate() - 7);
    
    const fromDate = weekAgo.toISOString().split('T')[0];
    const toDate = today.toISOString().split('T')[0];
    
    const url = `${BASE_URL}/v2/aggs/ticker/${encodeURIComponent(symbol)}/range/1/day/${fromDate}/${toDate}?adjusted=true&sort=desc&limit=2&apiKey=${apiKey}`;
    
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[Stock] ${symbol} returned ${res.status}`);
      return null;
    }
    
    const data = await res.json();
    if (!data.results || data.results.length < 1) {
      console.warn(`[Stock] No data for ${symbol}`);
      return null;
    }
    
    const current = data.results[0];
    const previous = data.results.length > 1 ? data.results[1] : { c: current.o };
    
    const price = current.c;
    const prevClose = previous.c;
    const change = price - prevClose;
    const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;
    
    const info = STOCK_INFO[symbol] || { name: symbol, type: 'Stock' };
    
    return {
      symbol,
      name: info.name,
      price: Math.round(price * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      high: Math.round(current.h * 100) / 100,
      low: Math.round(current.l * 100) / 100,
      open: Math.round(current.o * 100) / 100,
      previousClose: Math.round(prevClose * 100) / 100,
      volume: current.v || 0,
      timestamp: new Date(current.t).toISOString(),
      source: "Polygon.io",
    };
  } catch (err) {
    console.error(`[Stock] Error fetching ${symbol}:`, err);
    return null;
  }
}

// Real-time mock data as a fallback
function generateMockQuote(symbol: string): StockQuote {
  const mockPrices: Record<string, number> = {
    'SPY': 594.85,
    'QQQ': 516.42,
    'IWM': 226.30,
    'DIA': 428.15,
    'VTI': 287.50,
    'AAPL': 234.20,
    'MSFT': 422.80,
    'GOOGL': 195.30,
    'AMZN': 224.15,
    'NVDA': 142.65,
    'META': 612.40,
    'TSLA': 398.25,
  };
  
  const basePrice = mockPrices[symbol] || 100;
  const change = (Math.random() - 0.3) * basePrice * 0.015; // Slight positive bias
  const info = STOCK_INFO[symbol] || { name: symbol, type: 'Stock' };
  
  return {
    symbol,
    name: info.name,
    price: Math.round((basePrice + change) * 100) / 100,
    change: Math.round(change * 100) / 100,
    changePercent: Math.round((change / basePrice) * 100 * 100) / 100,
    high: Math.round(basePrice * 1.008 * 100) / 100,
    low: Math.round(basePrice * 0.994 * 100) / 100,
    open: Math.round((basePrice - change * 0.3) * 100) / 100,
    previousClose: Math.round(basePrice * 100) / 100,
    volume: Math.floor(Math.random() * 50000000) + 20000000,
    timestamp: new Date().toISOString(),
    source: "Demo Data",
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    const body = await req.json().catch(() => ({}));
    const symbols: string[] = body.symbols || ['SPY', 'QQQ', 'DIA', 'IWM'];

    const POLYGON_API_KEY = Deno.env.get("POLYGON_API_KEY") || Deno.env.get("VITE_POLYGON_API_KEY");

    let quotes: StockQuote[] = [];
    let useMockData = false;

    if (!POLYGON_API_KEY) {
      console.log("[StockQuotes] No API key, using mock data");
      useMockData = true;
      quotes = symbols.map(s => generateMockQuote(s.toUpperCase()));
    } else {
      console.log(`[StockQuotes] Fetching ${symbols.length} symbols...`);
      
      // Fetch all in parallel
      const promises = symbols.slice(0, 10).map(s => fetchStockData(s.toUpperCase(), POLYGON_API_KEY));
      const results = await Promise.all(promises);
      
      for (let i = 0; i < results.length; i++) {
        if (results[i]) {
          quotes.push(results[i]!);
        } else {
          // Fallback to mock for failed symbols
          quotes.push(generateMockQuote(symbols[i].toUpperCase()));
          useMockData = true;
        }
      }
    }

    const loadTimeMs = Date.now() - startTime;
    console.log(`[StockQuotes] Returning ${quotes.length} quotes in ${loadTimeMs}ms`);

    return json({
      success: true,
      quotes,
      useMockData,
      source: useMockData ? "Demo Data" : "Polygon.io",
      cachedAt: new Date().toISOString(),
      loadTimeMs,
    });
  } catch (error) {
    console.error("[StockQuotes] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return json({ success: false, error: message }, 500);
  }
});
