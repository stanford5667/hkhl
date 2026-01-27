import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EarningsEvent {
  symbol: string;
  companyName: string;
  reportDate: string;
  fiscalPeriod: string;
  fiscalYear: number;
  epsEstimate?: number;
  revenueEstimate?: number;
  analystCount?: number;
  timeOfDay?: string;
  marketCap?: number | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json().catch(() => ({}));
    const { startDate, endDate, symbols } = body;
    
    // Check multiple possible API key names
    const finnhubKey = Deno.env.get('FINNHUB_API_KEY') || Deno.env.get('VITE_FINNHUB_API_KEY');
    const polygonKey = Deno.env.get('POLYGON_API_KEY') || Deno.env.get('VITE_POLYGON_API_KEY');
    const fmpKey = Deno.env.get('FMP_API_KEY');
    
    console.log('[EARNINGS] API Keys available:', { 
      finnhub: !!finnhubKey, 
      polygon: !!polygonKey,
      fmp: !!fmpKey 
    });
    
    let allEarnings: EarningsEvent[] = [];
    
    const from = startDate || new Date().toISOString().split('T')[0];
    const to = endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Method 1: Financial Modeling Prep (most reliable for earnings)
    if (fmpKey && allEarnings.length === 0) {
      try {
        console.log(`[EARNINGS] Fetching from FMP: ${from} to ${to}`);
        
        const fmpUrl = `https://financialmodelingprep.com/api/v3/earning_calendar?from=${from}&to=${to}&apikey=${fmpKey}`;
        const response = await fetch(fmpUrl);
        
        if (response.ok) {
          const data = await response.json();
          
        if (Array.isArray(data) && data.length > 0) {
            console.log(`[EARNINGS] FMP returned ${data.length} events`);
            
            // Collect unique symbols to fetch market caps
            const uniqueSymbols = [...new Set(data.map((item: any) => item.symbol).filter(Boolean))];
            
            // Fetch market caps in batch (up to 100 at a time)
            const marketCapMap: Record<string, number> = {};
            for (let i = 0; i < uniqueSymbols.length; i += 100) {
              const batch = uniqueSymbols.slice(i, i + 100).join(',');
              try {
                const mcUrl = `https://financialmodelingprep.com/api/v3/quote/${batch}?apikey=${fmpKey}`;
                const mcResp = await fetch(mcUrl);
                if (mcResp.ok) {
                  const mcData = await mcResp.json();
                  if (Array.isArray(mcData)) {
                    mcData.forEach((q: any) => {
                      if (q.symbol && q.marketCap) {
                        marketCapMap[q.symbol] = q.marketCap;
                      }
                    });
                  }
                }
              } catch (mcErr) {
                console.error('[EARNINGS] Market cap fetch error:', mcErr);
              }
            }
            console.log(`[EARNINGS] Fetched market caps for ${Object.keys(marketCapMap).length} symbols`);
            
            allEarnings = data.map((item: any) => ({
              symbol: item.symbol,
              companyName: item.symbol,
              reportDate: item.date,
              fiscalPeriod: item.fiscalDateEnding ? `Q${Math.ceil((new Date(item.fiscalDateEnding).getMonth() + 1) / 3)}` : 'Q1',
              fiscalYear: item.fiscalDateEnding ? new Date(item.fiscalDateEnding).getFullYear() : new Date().getFullYear(),
              epsEstimate: item.epsEstimated,
              revenueEstimate: item.revenueEstimated,
              timeOfDay: item.time === 'bmo' ? 'BMO' : item.time === 'amc' ? 'AMC' : 'DMT',
              marketCap: marketCapMap[item.symbol] || null,
            }));
          } else {
            console.log('[EARNINGS] FMP returned no data or empty array');
          }
        } else {
          console.error('[EARNINGS] FMP error:', response.status, await response.text());
        }
      } catch (error) {
        console.error('[EARNINGS] FMP fetch error:', error);
      }
    }

    // Method 2: Finnhub earnings calendar (backup)
    if (finnhubKey && allEarnings.length === 0) {
      try {
        console.log(`[EARNINGS] Fetching from Finnhub: ${from} to ${to}`);
        
        const finnhubUrl = `https://finnhub.io/api/v1/calendar/earnings?from=${from}&to=${to}&token=${finnhubKey}`;
        const response = await fetch(finnhubUrl, {
          headers: { 'User-Agent': 'AssetLabs Research/1.0' }
        });
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.earningsCalendar && data.earningsCalendar.length > 0) {
            console.log(`[EARNINGS] Finnhub returned ${data.earningsCalendar.length} events`);
            
            // Collect unique symbols to fetch market caps via Polygon
            const uniqueSymbols: string[] = [...new Set(data.earningsCalendar.map((item: any) => item.symbol).filter(Boolean))] as string[];
            const marketCapMap: Record<string, number> = {};
            
            if (polygonKey) {
              console.log(`[EARNINGS] Fetching market caps for ${uniqueSymbols.length} symbols via Polygon`);
              // Polygon requires one call per ticker for market cap, so batch in parallel (max 20 concurrent)
              const batchSize = 20;
              for (let i = 0; i < Math.min(uniqueSymbols.length, 200); i += batchSize) {
                const batch = uniqueSymbols.slice(i, i + batchSize);
                const results = await Promise.all(
                  batch.map(async (symbol: string) => {
                    try {
                      const url = `https://api.polygon.io/v3/reference/tickers/${symbol}?apiKey=${polygonKey}`;
                      const resp = await fetch(url);
                      if (resp.ok) {
                        const d = await resp.json();
                        if (d.results?.market_cap) {
                          return { symbol, marketCap: d.results.market_cap };
                        }
                      }
                    } catch {
                      // ignore
                    }
                    return null;
                  })
                );
                results.filter(Boolean).forEach((r: any) => {
                  marketCapMap[r.symbol] = r.marketCap;
                });
              }
              console.log(`[EARNINGS] Fetched market caps for ${Object.keys(marketCapMap).length} symbols`);
            }
            
            allEarnings = data.earningsCalendar.map((item: any) => ({
              symbol: item.symbol,
              companyName: item.symbol,
              reportDate: item.date,
              fiscalPeriod: `Q${item.quarter || 1}`,
              fiscalYear: item.year || new Date().getFullYear(),
              epsEstimate: item.epsEstimate,
              revenueEstimate: item.revenueEstimate,
              timeOfDay: item.hour === 'bmo' ? 'BMO' : item.hour === 'amc' ? 'AMC' : 'DMT',
              marketCap: marketCapMap[item.symbol] || null,
            }));
          } else {
            console.log('[EARNINGS] Finnhub returned no data');
          }
        } else {
          console.error('[EARNINGS] Finnhub error:', response.status, await response.text());
        }
      } catch (error) {
        console.error('[EARNINGS] Finnhub fetch error:', error);
      }
    }

    // Method 3: Polygon.io stock splits/dividends as proxy (limited earnings data)
    if (polygonKey && allEarnings.length === 0) {
      try {
        console.log('[EARNINGS] Trying Polygon ticker events');
        
        // Use ticker news as a fallback to find companies with upcoming events
        const polygonUrl = `https://api.polygon.io/v2/reference/news?limit=100&apiKey=${polygonKey}`;
        const response = await fetch(polygonUrl);
        const data = await response.json();
        
        console.log('[EARNINGS] Polygon news response status:', response.status);
      } catch (error) {
        console.error('[EARNINGS] Polygon fetch error:', error);
      }
    }

    // Filter by symbols if provided
    if (symbols && symbols.length > 0) {
      allEarnings = allEarnings.filter(e => symbols.includes(e.symbol));
    }

    // Filter by date range and valid symbols (US stocks typically)
    allEarnings = allEarnings.filter(e => {
      const isValidDate = e.reportDate >= from && e.reportDate <= to;
      const isUSStock = e.symbol && !e.symbol.includes('.') && e.symbol.length <= 5;
      return isValidDate && isUSStock;
    });

    // Deduplicate by symbol + date
    const seen = new Set<string>();
    allEarnings = allEarnings.filter(e => {
      const key = `${e.symbol}-${e.reportDate}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    console.log(`[EARNINGS] After filtering: ${allEarnings.length} events`);

    // Upsert into database
    const earningsToInsert = allEarnings.map(e => ({
      symbol: e.symbol,
      company_name: e.companyName,
      report_date: e.reportDate,
      fiscal_period: e.fiscalPeriod,
      fiscal_year: e.fiscalYear,
      eps_estimate: e.epsEstimate,
      revenue_estimate: e.revenueEstimate,
      analyst_count: e.analystCount,
      time_of_day: e.timeOfDay,
      market_cap: e.marketCap,
      updated_at: new Date().toISOString(),
    }));

    if (earningsToInsert.length > 0) {
      console.log(`[EARNINGS] Upserting ${earningsToInsert.length} events`);
      
      const { data: insertedData, error: insertError } = await supabase
        .from('earnings_calendar')
        .upsert(earningsToInsert, {
          onConflict: 'symbol,report_date,fiscal_period',
          ignoreDuplicates: false,
        })
        .select();

      if (insertError) {
        console.error('[EARNINGS] Insert error:', insertError);
        throw insertError;
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          count: insertedData?.length || earningsToInsert.length,
          earnings: insertedData || earningsToInsert,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        count: 0, 
        earnings: [],
        message: 'No earnings found. Check API keys are configured correctly.',
        apiStatus: {
          fmp: !!fmpKey,
          finnhub: !!finnhubKey,
          polygon: !!polygonKey
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[EARNINGS] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
