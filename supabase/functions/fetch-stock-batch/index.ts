import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const POLYGON_API_KEY = Deno.env.get('POLYGON_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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

    if (!POLYGON_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'POLYGON_API_KEY not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const normalizedTickers = tickers.map((t: string) => t.toUpperCase().trim());

    // Calculate expected trading days
    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const expectedTradingDays = Math.floor(totalDays * 252 / 365);

    console.log(`[fetch-stock-batch] Fetching ${normalizedTickers.length} tickers from ${startDate} to ${endDate}`);
    console.log(`[fetch-stock-batch] Expected ~${expectedTradingDays} trading days`);

    const results: Record<string, { fromCache: boolean; rowCount: number; dateRange?: { first: string; last: string } }> = {};
    let fromCache = 0;
    let fromApi = 0;

    for (const ticker of normalizedTickers) {
      // Check existing cache in stock_price_cache table
      const { data: existingData, error: cacheError } = await supabase
        .from('stock_price_cache')
        .select('trade_date')
        .eq('ticker', ticker)
        .gte('trade_date', startDate)
        .lte('trade_date', endDate)
        .order('trade_date', { ascending: true });

      if (cacheError) {
        console.error(`[fetch-stock-batch] Cache check error for ${ticker}:`, cacheError);
      }

      const cachedCount = existingData?.length || 0;
      const completeness = expectedTradingDays > 0 ? cachedCount / expectedTradingDays : 0;

      console.log(`[fetch-stock-batch] ${ticker}: ${cachedCount} cached rows (${Math.round(completeness * 100)}% complete)`);

      // If we have >90% of expected data, use cache
      if (completeness > 0.9) {
        results[ticker] = { 
          fromCache: true, 
          rowCount: cachedCount,
          dateRange: existingData && existingData.length > 0 ? {
            first: existingData[0].trade_date,
            last: existingData[existingData.length - 1].trade_date
          } : undefined
        };
        fromCache++;
        console.log(`[fetch-stock-batch] ${ticker}: Using cached data`);
        continue;
      }

      // Fetch from Polygon API
      console.log(`[fetch-stock-batch] ${ticker}: Fetching from Polygon API...`);
      
      try {
        const url = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/1/day/${startDate}/${endDate}?adjusted=true&sort=asc&limit=50000&apiKey=${POLYGON_API_KEY}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[fetch-stock-batch] Polygon API error for ${ticker}: ${response.status} - ${errorText}`);
          results[ticker] = { fromCache: false, rowCount: 0 };
          continue;
        }

        const data = await response.json();
        
        // Accept both OK and DELAYED status (DELAYED = free tier with valid data)
        const validStatus = data.status === 'OK' || data.status === 'DELAYED';
        
        if (!validStatus || !data.results || data.results.length === 0) {
          console.warn(`[fetch-stock-batch] No data from Polygon for ${ticker}: status=${data.status}, resultsCount=${data.resultsCount}`);
          results[ticker] = { fromCache: false, rowCount: 0 };
          continue;
        }
        
        console.log(`[fetch-stock-batch] ${ticker}: Polygon status=${data.status}, received ${data.results.length} bars`);

        console.log(`[fetch-stock-batch] ${ticker}: Received ${data.results.length} bars from Polygon`);

        // Transform to stock_price_cache schema
        const bars = data.results.map((bar: any) => ({
          ticker,
          trade_date: new Date(bar.t).toISOString().split('T')[0],
          open_price: bar.o,
          high_price: bar.h,
          low_price: bar.l,
          close_price: bar.c,
          adjusted_close: bar.c, // Polygon adjusted=true means close is already adjusted
          volume: bar.v,
        }));

        // Batch insert in chunks of 500
        const BATCH_SIZE = 500;
        let insertedCount = 0;

        for (let i = 0; i < bars.length; i += BATCH_SIZE) {
          const batch = bars.slice(i, i + BATCH_SIZE);
          
          const { error: insertError } = await supabase
            .from('stock_price_cache')
            .upsert(batch, { 
              onConflict: 'ticker,trade_date',
              ignoreDuplicates: false 
            });

          if (insertError) {
            console.error(`[fetch-stock-batch] Insert error for ${ticker} batch ${i}:`, insertError);
          } else {
            insertedCount += batch.length;
          }
        }

        console.log(`[fetch-stock-batch] ${ticker}: Inserted ${insertedCount} rows into stock_price_cache`);

        results[ticker] = { 
          fromCache: false, 
          rowCount: insertedCount,
          dateRange: bars.length > 0 ? {
            first: bars[0].trade_date,
            last: bars[bars.length - 1].trade_date
          } : undefined
        };
        fromApi++;

        // Rate limiting: Polygon free tier is 5 requests/minute
        await new Promise(resolve => setTimeout(resolve, 250));

      } catch (fetchError) {
        console.error(`[fetch-stock-batch] Fetch error for ${ticker}:`, fetchError);
        results[ticker] = { fromCache: false, rowCount: 0 };
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          total: normalizedTickers.length,
          fromCache,
          fromApi,
          expectedTradingDays
        },
        results
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
