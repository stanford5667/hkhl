import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Cache TTLs in milliseconds
const CACHE_TTL = {
  quote: 60 * 1000,         // 60 seconds
  indices: 5 * 60 * 1000,   // 5 minutes
  companyInfo: 24 * 60 * 60 * 1000, // 24 hours
  tickerSearch: 60 * 60 * 1000,     // 1 hour
};

type RequestType = 'quote' | 'indices' | 'companyInfo' | 'tickerSearch' | 'batchQuotes';

interface QuoteData {
  price: number;
  change: number;
  changePercent: number;
  volume: string;
  marketCap: string;
  high52: number;
  low52: number;
  open?: number;
  high?: number;
  low?: number;
  previousClose?: number;
}

interface TickerSearchResult {
  symbol: string;
  name: string;
  exchange: string;
}

interface MarketIndex {
  name: string;
  symbol: string;
  value: number;
  change: number;
  changePercent: number;
}

interface CompanyInfo {
  name: string;
  ticker: string;
  exchange: string;
  sector: string;
  industry: string;
  peRatio: number | null;
  eps: number | null;
  dividendYield: number | null;
  description: string;
  employees?: number;
  headquarters?: string;
}

async function getCachedData<T>(supabase: any, cacheKey: string): Promise<T | null> {
  const { data, error } = await supabase
    .from('cached_api_data')
    .select('data, expires_at')
    .eq('cache_key', cacheKey)
    .maybeSingle();

  if (error || !data) return null;

  const now = new Date();
  const expiresAt = new Date(data.expires_at);
  if (now > expiresAt) return null;

  console.log(`[Cache] HIT: ${cacheKey}`);
  return data.data as T;
}

async function setCachedData(
  supabase: any, 
  cacheKey: string, 
  data: any, 
  ttl: number,
  userId: string
): Promise<void> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttl);

  await supabase
    .from('cached_api_data')
    .upsert({
      cache_key: cacheKey,
      cache_type: 'market-data',
      data: data,
      fetched_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      updated_at: now.toISOString(),
      user_id: userId,
    }, {
      onConflict: 'cache_key'
    });
}

async function callPerplexity(prompt: string, systemPrompt: string): Promise<string> {
  const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
  if (!PERPLEXITY_API_KEY) {
    throw new Error('PERPLEXITY_API_KEY not configured');
  }

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Perplexity API error:', response.status, errorText);
    throw new Error(`Perplexity API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

function parseJsonResponse<T>(content: string): T {
  let cleanContent = content.trim();
  
  // Remove markdown code blocks
  if (cleanContent.startsWith('```json')) cleanContent = cleanContent.slice(7);
  if (cleanContent.startsWith('```')) cleanContent = cleanContent.slice(3);
  if (cleanContent.endsWith('```')) cleanContent = cleanContent.slice(0, -3);
  cleanContent = cleanContent.trim();
  
  // Try to extract JSON from response
  const jsonMatch = cleanContent.match(/[\[{][\s\S]*[\]}]/);
  if (!jsonMatch) {
    throw new Error('No JSON found in response');
  }
  
  return JSON.parse(jsonMatch[0]);
}

async function getQuote(ticker: string): Promise<QuoteData> {
  const prompt = `Get the current stock quote for ${ticker}. Return ONLY valid JSON with this exact format:
{"price":150.25,"change":2.50,"changePercent":1.69,"volume":"45.2M","marketCap":"2.4T","high52":182.94,"low52":124.17,"open":148.00,"high":151.50,"low":147.80,"previousClose":147.75}

Use real current market data for ${ticker}. If markets are closed, use the most recent trading session data.`;

  const systemPrompt = 'You are a stock data API. Return ONLY valid JSON objects with no explanations or markdown.';
  
  const content = await callPerplexity(prompt, systemPrompt);
  return parseJsonResponse<QuoteData>(content);
}

async function searchTicker(query: string): Promise<TickerSearchResult[]> {
  const prompt = `Search for stock ticker symbols matching "${query}". Return the top 5 most relevant results as a JSON array:
[{"symbol":"AAPL","name":"Apple Inc.","exchange":"NASDAQ"},{"symbol":"AMZN","name":"Amazon.com Inc.","exchange":"NASDAQ"}]

Return real stock symbols that match "${query}". Only include actively traded US stocks.`;

  const systemPrompt = 'You are a stock search API. Return ONLY valid JSON arrays with no explanations or markdown.';
  
  const content = await callPerplexity(prompt, systemPrompt);
  return parseJsonResponse<TickerSearchResult[]>(content);
}

async function getMarketIndices(): Promise<MarketIndex[]> {
  const prompt = `Get the current values and daily changes for S&P 500, NASDAQ Composite, and Dow Jones Industrial Average.
Return as JSON array:
[{"name":"S&P 500","symbol":"SPX","value":5850.25,"change":25.50,"changePercent":0.44},{"name":"NASDAQ","symbol":"IXIC","value":18500.75,"change":-50.25,"changePercent":-0.27},{"name":"Dow Jones","symbol":"DJI","value":42500.00,"change":150.00,"changePercent":0.35}]

Use current real market data. If markets are closed, use the most recent close.`;

  const systemPrompt = 'You are a market data API. Return ONLY valid JSON arrays with no explanations or markdown.';
  
  const content = await callPerplexity(prompt, systemPrompt);
  return parseJsonResponse<MarketIndex[]>(content);
}

async function getCompanyInfo(ticker: string): Promise<CompanyInfo> {
  const prompt = `Get key information for stock ticker ${ticker}. Return ONLY valid JSON:
{"name":"Apple Inc.","ticker":"AAPL","exchange":"NASDAQ","sector":"Technology","industry":"Consumer Electronics","peRatio":28.5,"eps":6.42,"dividendYield":0.5,"description":"Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide.","employees":164000,"headquarters":"Cupertino, California"}

Get real current data for ${ticker}. Use null for any metrics that are not applicable.`;

  const systemPrompt = 'You are a financial data API. Return ONLY valid JSON objects with no explanations or markdown.';
  
  const content = await callPerplexity(prompt, systemPrompt);
  return parseJsonResponse<CompanyInfo>(content);
}

async function getBatchQuotes(tickers: string[]): Promise<Record<string, QuoteData>> {
  if (tickers.length === 0) return {};
  
  // For batch requests, we make a single prompt with all tickers
  const tickerList = tickers.map(t => t.toUpperCase()).join(', ');
  
  const prompt = `Get the current stock quotes for these tickers: ${tickerList}. 
Return ONLY valid JSON object with ticker symbols as keys:
{"AAPL":{"price":150.25,"change":2.50,"changePercent":1.69,"volume":"45.2M","marketCap":"2.4T","high52":182.94,"low52":124.17},"MSFT":{"price":380.50,"change":-1.25,"changePercent":-0.33,"volume":"22.1M","marketCap":"2.8T","high52":420.82,"low52":309.45}}

Use real current market data. If markets are closed, use the most recent trading session data.`;

  const systemPrompt = 'You are a stock data API. Return ONLY valid JSON objects with no explanations or markdown.';
  
  const content = await callPerplexity(prompt, systemPrompt);
  return parseJsonResponse<Record<string, QuoteData>>(content);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, ticker, tickers, query, userId } = await req.json();

    if (!type) {
      return new Response(
        JSON.stringify({ success: false, error: 'Request type is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const effectiveUserId = userId || 'anonymous';

    console.log(`[MarketData] Request: ${type}, ticker: ${ticker}, tickers: ${tickers?.length || 0}, query: ${query}`);

    let result;
    let cacheKey: string;
    let cacheTtl: number;

    switch (type as RequestType) {
      case 'quote':
        if (!ticker) {
          return new Response(
            JSON.stringify({ success: false, error: 'Ticker is required for quote' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        cacheKey = `market-data:quote:${ticker.toUpperCase()}`;
        cacheTtl = CACHE_TTL.quote;
        
        const cachedQuote = await getCachedData<QuoteData>(supabase, cacheKey);
        if (cachedQuote) {
          result = cachedQuote;
        } else {
          result = await getQuote(ticker);
          await setCachedData(supabase, cacheKey, result, cacheTtl, effectiveUserId);
        }
        break;

      case 'batchQuotes':
        if (!tickers || !Array.isArray(tickers) || tickers.length === 0) {
          return new Response(
            JSON.stringify({ success: false, error: 'Tickers array is required for batch quotes' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Check cache for each ticker first
        const batchResults: Record<string, QuoteData> = {};
        const tickersToFetch: string[] = [];
        
        for (const t of tickers) {
          const key = `market-data:quote:${t.toUpperCase()}`;
          const cached = await getCachedData<QuoteData>(supabase, key);
          if (cached) {
            batchResults[t.toUpperCase()] = cached;
          } else {
            tickersToFetch.push(t);
          }
        }
        
        // Fetch remaining tickers in batch
        if (tickersToFetch.length > 0) {
          console.log(`[MarketData] Batch fetching ${tickersToFetch.length} tickers: ${tickersToFetch.join(', ')}`);
          const fetched = await getBatchQuotes(tickersToFetch);
          
          // Cache each result and merge
          for (const [t, quote] of Object.entries(fetched)) {
            const key = `market-data:quote:${t.toUpperCase()}`;
            await setCachedData(supabase, key, quote, CACHE_TTL.quote, effectiveUserId);
            batchResults[t.toUpperCase()] = quote;
          }
        }
        
        result = batchResults;
        break;

      case 'indices':
        cacheKey = 'market-data:indices';
        cacheTtl = CACHE_TTL.indices;
        
        const cachedIndices = await getCachedData<MarketIndex[]>(supabase, cacheKey);
        if (cachedIndices) {
          result = cachedIndices;
        } else {
          result = await getMarketIndices();
          await setCachedData(supabase, cacheKey, result, cacheTtl, effectiveUserId);
        }
        break;

      case 'companyInfo':
        if (!ticker) {
          return new Response(
            JSON.stringify({ success: false, error: 'Ticker is required for company info' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        cacheKey = `market-data:company:${ticker.toUpperCase()}`;
        cacheTtl = CACHE_TTL.companyInfo;
        
        const cachedInfo = await getCachedData<CompanyInfo>(supabase, cacheKey);
        if (cachedInfo) {
          result = cachedInfo;
        } else {
          result = await getCompanyInfo(ticker);
          await setCachedData(supabase, cacheKey, result, cacheTtl, effectiveUserId);
        }
        break;

      case 'tickerSearch':
        if (!query) {
          return new Response(
            JSON.stringify({ success: false, error: 'Query is required for ticker search' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        cacheKey = `market-data:search:${query.toLowerCase()}`;
        cacheTtl = CACHE_TTL.tickerSearch;
        
        const cachedSearch = await getCachedData<TickerSearchResult[]>(supabase, cacheKey);
        if (cachedSearch) {
          result = cachedSearch;
        } else {
          result = await searchTicker(query);
          await setCachedData(supabase, cacheKey, result, cacheTtl, effectiveUserId);
        }
        break;

      default:
        return new Response(
          JSON.stringify({ success: false, error: `Unknown request type: ${type}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[MarketData] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch market data' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
