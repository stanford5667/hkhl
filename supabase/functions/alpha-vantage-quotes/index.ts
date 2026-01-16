import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BASE_URL = "https://www.alphavantage.co/query";

// In-memory cache for rate limiting (5-min cache)
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCached(key: string): unknown | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) {
    return entry.data;
  }
  cache.delete(key);
  return null;
}

function setCache(key: string, data: unknown): void {
  cache.set(key, { data, timestamp: Date.now() });
  // Limit cache size
  if (cache.size > 100) {
    const oldest = [...cache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
    if (oldest) cache.delete(oldest[0]);
  }
}

interface QuoteResponse {
  symbol: string;
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

interface ForexResponse {
  pair: string;
  base: string;
  quote: string;
  rate: number;
  change: number;
  changePercent: number;
  bid: number;
  ask: number;
  timestamp: string;
  source: string;
}

async function fetchStockQuote(symbol: string, apiKey: string): Promise<QuoteResponse | null> {
  const cacheKey = `stock_${symbol}`;
  const cached = getCached(cacheKey);
  if (cached) {
    console.log(`[alpha-vantage] Cache hit for ${symbol}`);
    return cached as QuoteResponse;
  }

  const url = `${BASE_URL}?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Alpha Vantage API error: ${response.status}`);
  }
  
  const data = await response.json();
  
  if (data.Note || data.Information) {
    console.log(`[alpha-vantage] Rate limit or info message: ${data.Note || data.Information}`);
    return null;
  }
  
  const quote = data["Global Quote"];
  if (!quote || !quote["05. price"]) {
    return null;
  }
  
  const result: QuoteResponse = {
    symbol: quote["01. symbol"],
    price: parseFloat(quote["05. price"]) || 0,
    change: parseFloat(quote["09. change"]) || 0,
    changePercent: parseFloat((quote["10. change percent"] || "0").replace("%", "")) || 0,
    high: parseFloat(quote["03. high"]) || 0,
    low: parseFloat(quote["04. low"]) || 0,
    open: parseFloat(quote["02. open"]) || 0,
    previousClose: parseFloat(quote["08. previous close"]) || 0,
    volume: parseInt(quote["06. volume"]) || 0,
    timestamp: quote["07. latest trading day"],
    source: "Alpha Vantage",
  };
  
  setCache(cacheKey, result);
  return result;
}

async function fetchForexRate(fromCurrency: string, toCurrency: string, apiKey: string): Promise<ForexResponse | null> {
  const pair = `${fromCurrency}/${toCurrency}`;
  const cacheKey = `forex_${pair}`;
  const cached = getCached(cacheKey);
  if (cached) {
    console.log(`[alpha-vantage] Cache hit for ${pair}`);
    return cached as ForexResponse;
  }

  const url = `${BASE_URL}?function=CURRENCY_EXCHANGE_RATE&from_currency=${encodeURIComponent(fromCurrency)}&to_currency=${encodeURIComponent(toCurrency)}&apikey=${apiKey}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Alpha Vantage API error: ${response.status}`);
  }
  
  const data = await response.json();
  
  if (data.Note || data.Information) {
    console.log(`[alpha-vantage] Rate limit or info message: ${data.Note || data.Information}`);
    return null;
  }
  
  const rate = data["Realtime Currency Exchange Rate"];
  if (!rate || !rate["5. Exchange Rate"]) {
    return null;
  }
  
  const currentRate = parseFloat(rate["5. Exchange Rate"]) || 0;
  const bidPrice = parseFloat(rate["8. Bid Price"]) || currentRate;
  const askPrice = parseFloat(rate["9. Ask Price"]) || currentRate;
  
  const result: ForexResponse = {
    pair,
    base: rate["1. From_Currency Code"],
    quote: rate["2. To_Currency Code"],
    rate: currentRate,
    change: 0, // Alpha Vantage doesn't provide change in this endpoint
    changePercent: 0,
    bid: bidPrice,
    ask: askPrice,
    timestamp: rate["6. Last Refreshed"],
    source: "Alpha Vantage",
  };
  
  setCache(cacheKey, result);
  return result;
}

// Generate realistic mock data when API is unavailable
function generateMockQuote(symbol: string): QuoteResponse {
  const mockPrices: Record<string, number> = {
    'SPY': 593.42,
    'QQQ': 512.78,
    'IWM': 224.15,
    'DIA': 425.80,
    'AAPL': 232.50,
    'MSFT': 418.25,
    'GOOGL': 191.45,
    'AMZN': 218.90,
  };
  
  const basePrice = mockPrices[symbol] || 100;
  const change = (Math.random() - 0.5) * basePrice * 0.02;
  
  return {
    symbol,
    price: basePrice + change,
    change,
    changePercent: (change / basePrice) * 100,
    high: basePrice * 1.01,
    low: basePrice * 0.99,
    open: basePrice - change * 0.5,
    previousClose: basePrice,
    volume: Math.floor(Math.random() * 50000000) + 10000000,
    timestamp: new Date().toISOString().split('T')[0],
    source: "Demo Data",
  };
}

function generateMockForex(base: string, quote: string): ForexResponse {
  const mockRates: Record<string, number> = {
    'EUR/USD': 1.0285,
    'GBP/USD': 1.2195,
    'USD/JPY': 156.42,
    'USD/CHF': 0.9115,
    'AUD/USD': 0.6205,
    'USD/CAD': 1.4385,
  };
  
  const pair = `${base}/${quote}`;
  const rate = mockRates[pair] || 1.0;
  const change = (Math.random() - 0.5) * rate * 0.005;
  
  return {
    pair,
    base,
    quote,
    rate: rate + change,
    change,
    changePercent: (change / rate) * 100,
    bid: rate + change - 0.0002,
    ask: rate + change + 0.0002,
    timestamp: new Date().toISOString(),
    source: "Demo Data",
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ALPHA_VANTAGE_API_KEY = Deno.env.get("ALPHA_VANTAGE_API_KEY") || Deno.env.get("VITE_ALPHA_VANTAGE_API_KEY");
    
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'quotes';
    
    if (action === 'quotes') {
      const symbols: string[] = body.symbols || ['SPY', 'QQQ'];
      const results: QuoteResponse[] = [];
      let useMockData = !ALPHA_VANTAGE_API_KEY;
      
      for (const symbol of symbols.slice(0, 5)) { // Limit to 5 symbols
        try {
          if (ALPHA_VANTAGE_API_KEY) {
            const quote = await fetchStockQuote(symbol.toUpperCase(), ALPHA_VANTAGE_API_KEY);
            if (quote) {
              results.push(quote);
            } else {
              // Fallback to mock if API limit reached
              useMockData = true;
              results.push(generateMockQuote(symbol.toUpperCase()));
            }
          } else {
            results.push(generateMockQuote(symbol.toUpperCase()));
          }
          
          // Small delay between requests to respect rate limits
          if (symbols.length > 1) {
            await new Promise(r => setTimeout(r, 250));
          }
        } catch (err) {
          console.error(`[alpha-vantage] Error fetching ${symbol}:`, err);
          results.push(generateMockQuote(symbol.toUpperCase()));
          useMockData = true;
        }
      }
      
      return new Response(JSON.stringify({
        success: true,
        quotes: results,
        useMockData,
        cachedAt: new Date().toISOString(),
        source: useMockData ? "Demo Data" : "Alpha Vantage",
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    if (action === 'forex') {
      const pairs: string[] = body.pairs || ['EUR/USD'];
      const results: ForexResponse[] = [];
      let useMockData = !ALPHA_VANTAGE_API_KEY;
      
      for (const pair of pairs.slice(0, 5)) { // Limit to 5 pairs
        const [base, quote] = pair.split('/');
        if (!base || !quote) continue;
        
        try {
          if (ALPHA_VANTAGE_API_KEY) {
            const rate = await fetchForexRate(base, quote, ALPHA_VANTAGE_API_KEY);
            if (rate) {
              results.push(rate);
            } else {
              useMockData = true;
              results.push(generateMockForex(base, quote));
            }
          } else {
            results.push(generateMockForex(base, quote));
          }
          
          // Small delay between requests
          if (pairs.length > 1) {
            await new Promise(r => setTimeout(r, 250));
          }
        } catch (err) {
          console.error(`[alpha-vantage] Error fetching ${pair}:`, err);
          results.push(generateMockForex(base, quote));
          useMockData = true;
        }
      }
      
      return new Response(JSON.stringify({
        success: true,
        forex: results,
        useMockData,
        cachedAt: new Date().toISOString(),
        source: useMockData ? "Demo Data" : "Alpha Vantage",
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: `Unknown action: ${action}` 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error("[alpha-vantage-quotes] Error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: String(error),
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
