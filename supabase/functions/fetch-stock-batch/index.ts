import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StockData {
  symbol: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface CacheEntry {
  symbol: string;
  data: StockData[];
  fetched_at: string;
  start_date: string;
  end_date: string;
}

const POLYGON_API_KEY = Deno.env.get('POLYGON_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Cache expiry: 24 hours for historical data
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000;

async function fetchFromPolygon(symbol: string, startDate: string, endDate: string): Promise<StockData[]> {
  if (!POLYGON_API_KEY) {
    throw new Error('POLYGON_API_KEY not configured');
  }

  const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/day/${startDate}/${endDate}?adjusted=true&sort=asc&apiKey=${POLYGON_API_KEY}`;
  
  console.log(`[fetch-stock-batch] Fetching ${symbol} from Polygon: ${startDate} to ${endDate}`);
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Polygon API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  
  if (!data.results || data.results.length === 0) {
    console.log(`[fetch-stock-batch] No data for ${symbol}`);
    return [];
  }

  return data.results.map((bar: any) => ({
    symbol,
    date: new Date(bar.t).toISOString().split('T')[0],
    open: bar.o,
    high: bar.h,
    low: bar.l,
    close: bar.c,
    volume: bar.v,
  }));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tickers, startDate, endDate } = await req.json();

    if (!tickers || !Array.isArray(tickers) || tickers.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'tickers array is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (!startDate || !endDate) {
      return new Response(
        JSON.stringify({ success: false, error: 'startDate and endDate are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const results: Record<string, StockData[]> = {};
    let fromCache = 0;
    let fromApi = 0;

    for (const ticker of tickers) {
      const cacheKey = `stock_${ticker}_${startDate}_${endDate}`;
      
      // Check cache
      const { data: cachedData } = await supabase
        .from('cached_api_data')
        .select('*')
        .eq('cache_key', cacheKey)
        .eq('cache_type', 'stock_historical')
        .single();

      if (cachedData) {
        const fetchedAt = new Date(cachedData.fetched_at || cachedData.created_at).getTime();
        const now = Date.now();
        
        if (now - fetchedAt < CACHE_EXPIRY_MS) {
          console.log(`[fetch-stock-batch] Cache hit for ${ticker}`);
          results[ticker] = cachedData.data as StockData[];
          fromCache++;
          continue;
        }
      }

      // Fetch from API
      try {
        const stockData = await fetchFromPolygon(ticker, startDate, endDate);
        results[ticker] = stockData;
        fromApi++;

        // Store in cache
        if (stockData.length > 0) {
          const cacheEntry = {
            cache_key: cacheKey,
            cache_type: 'stock_historical',
            data: stockData,
            entity_id: ticker,
            entity_type: 'stock',
            fetched_at: new Date().toISOString(),
            user_id: '00000000-0000-0000-0000-000000000000', // System user for public cache
          };

          await supabase
            .from('cached_api_data')
            .upsert(cacheEntry, { onConflict: 'cache_key' });
            
          console.log(`[fetch-stock-batch] Cached ${ticker} data (${stockData.length} bars)`);
        }

        // Rate limiting: Polygon free tier is 5 requests/minute
        if (fromApi < tickers.length) {
          await new Promise(resolve => setTimeout(resolve, 250));
        }
      } catch (error) {
        console.error(`[fetch-stock-batch] Error fetching ${ticker}:`, error);
        results[ticker] = [];
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: results,
        summary: {
          total: tickers.length,
          fromCache,
          fromApi,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[fetch-stock-batch] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
