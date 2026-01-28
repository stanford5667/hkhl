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
    const { startDate, endDate, forceRefresh } = body;
    
    // API keys
    const polygonKey = Deno.env.get('POLYGON_API_KEY') || Deno.env.get('VITE_POLYGON_API_KEY');
    const fmpKey = Deno.env.get('FMP_API_KEY');
    const finnhubKey = Deno.env.get('FINNHUB_API_KEY') || Deno.env.get('VITE_FINNHUB_API_KEY');
    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
    
    console.log('[EARNINGS] API Keys available:', { 
      polygon: !!polygonKey,
      fmp: !!fmpKey,
      finnhub: !!finnhubKey,
      firecrawl: !!firecrawlKey
    });
    
    let allEarnings: EarningsEvent[] = [];
    
    // Default to 90 days of earnings data
    const from = startDate || new Date().toISOString().split('T')[0];
    const toDate = endDate ? new Date(endDate) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    const to = toDate.toISOString().split('T')[0];

    console.log(`[EARNINGS] Fetching earnings from ${from} to ${to}`);

    // ============================================
    // METHOD 1: POLYGON.IO (PRIMARY SOURCE)
    // ============================================
    if (polygonKey && allEarnings.length === 0) {
      try {
        console.log('[EARNINGS] Trying Polygon.io stock financials...');
        
        // Polygon doesn't have a direct earnings calendar endpoint on basic plans
        // But we can use the grouped daily endpoint to get active tickers
        // and cross-reference with FMP or Finnhub
        
        // First, get a list of the most traded stocks to check for earnings
        const snapshotUrl = `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers?apiKey=${polygonKey}`;
        const snapshotResp = await fetch(snapshotUrl);
        
        if (snapshotResp.ok) {
          const snapshotData = await snapshotResp.json();
          
          if (snapshotData.tickers && Array.isArray(snapshotData.tickers)) {
            // Extract tickers with highest volume (most likely to have earnings coverage)
            const topTickers = snapshotData.tickers
              .filter((t: any) => t.day?.v > 500000 && t.ticker && !t.ticker.includes('.'))
              .sort((a: any, b: any) => (b.day?.v || 0) - (a.day?.v || 0))
              .slice(0, 500)
              .map((t: any) => ({
                symbol: t.ticker,
                marketCap: t.market_cap || null,
                price: t.day?.c || t.prevDay?.c || null,
              }));
            
            console.log(`[EARNINGS] Got ${topTickers.length} active tickers from Polygon`);
            
            // Now fetch ticker details in batches to get market cap if not in snapshot
            const tickerDetailsMap: Record<string, any> = {};
            const batchSize = 10;
            
            for (let i = 0; i < Math.min(topTickers.length, 100); i += batchSize) {
              const batch = topTickers.slice(i, i + batchSize);
              const detailPromises = batch.map(async (t: any) => {
                try {
                  const url = `https://api.polygon.io/v3/reference/tickers/${t.symbol}?apiKey=${polygonKey}`;
                  const resp = await fetch(url);
                  if (resp.ok) {
                    const data = await resp.json();
                    if (data.results) {
                      return {
                        symbol: t.symbol,
                        name: data.results.name || t.symbol,
                        marketCap: data.results.market_cap || t.marketCap,
                      };
                    }
                  }
                } catch {
                  // ignore individual failures
                }
                return { symbol: t.symbol, name: t.symbol, marketCap: t.marketCap };
              });
              
              const details = await Promise.all(detailPromises);
              details.forEach(d => {
                if (d) tickerDetailsMap[d.symbol] = d;
              });
            }
            
            console.log(`[EARNINGS] Enriched ${Object.keys(tickerDetailsMap).length} tickers with details`);
            
            // Store ticker info for later use with other APIs
            // We'll use FMP or Finnhub to get actual earnings dates for these tickers
          }
        } else {
          console.log('[EARNINGS] Polygon snapshot not available, continuing to other sources');
        }
      } catch (error) {
        console.error('[EARNINGS] Polygon fetch error:', error);
      }
    }

    // ============================================
    // METHOD 2: FINANCIAL MODELING PREP
    // ============================================
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

    // ============================================
    // METHOD 3: FINNHUB (BACKUP)
    // ============================================
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

    // ============================================
    // METHOD 4: FIRECRAWL (LAST RESORT FALLBACK)
    // Scrape earnings calendars from financial sites
    // ============================================
    if (firecrawlKey && allEarnings.length === 0) {
      try {
        console.log('[EARNINGS] Attempting Firecrawl scrape of earnings calendars...');
        
        // Try scraping Yahoo Finance earnings calendar
        const yahooUrl = 'https://finance.yahoo.com/calendar/earnings';
        
        const firecrawlResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${firecrawlKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: yahooUrl,
            formats: ['markdown'],
            onlyMainContent: true,
            waitFor: 3000,
          }),
        });
        
        if (firecrawlResponse.ok) {
          const scrapeData = await firecrawlResponse.json();
          
          if (scrapeData.success && scrapeData.data?.markdown) {
            console.log('[EARNINGS] Firecrawl scraped Yahoo Finance earnings');
            
            // Parse the markdown for earnings data
            const markdown = scrapeData.data.markdown;
            const lines = markdown.split('\n');
            
            // Look for patterns like "AAPL | Apple Inc | Feb 15"
            const earningsRegex = /\|?\s*([A-Z]{1,5})\s*\|.*?(\d{1,2}[\/\-]\d{1,2}|\w{3}\s+\d{1,2})/gi;
            const symbolDatePairs: Array<{symbol: string, date: string}> = [];
            
            for (const line of lines) {
              // Try to extract symbol and date from table-like structures
              const match = line.match(/^[|\s]*([A-Z]{1,5})[|\s]+/);
              if (match) {
                const symbol = match[1];
                // Look for a date pattern in the same line
                const dateMatch = line.match(/(\d{4}-\d{2}-\d{2})|(\w{3}\s+\d{1,2},?\s*\d{4}?)|(\d{1,2}\/\d{1,2})/);
                if (dateMatch) {
                  symbolDatePairs.push({ symbol, date: dateMatch[0] });
                }
              }
            }
            
            console.log(`[EARNINGS] Extracted ${symbolDatePairs.length} earnings from Firecrawl`);
            
            // Convert to our format
            for (const pair of symbolDatePairs) {
              let reportDate = pair.date;
              // Try to normalize the date
              try {
                const parsed = new Date(pair.date);
                if (!isNaN(parsed.getTime())) {
                  reportDate = parsed.toISOString().split('T')[0];
                }
              } catch {
                // Keep original if parsing fails
              }
              
              allEarnings.push({
                symbol: pair.symbol,
                companyName: pair.symbol,
                reportDate,
                fiscalPeriod: 'Q1',
                fiscalYear: new Date().getFullYear(),
                timeOfDay: 'DMT',
                marketCap: null,
              });
            }
          }
        } else {
          console.error('[EARNINGS] Firecrawl error:', firecrawlResponse.status);
        }
        
        // If Yahoo didn't work, try Nasdaq
        if (allEarnings.length === 0) {
          console.log('[EARNINGS] Trying Nasdaq earnings calendar via Firecrawl...');
          
          const nasdaqUrl = 'https://www.nasdaq.com/market-activity/earnings';
          
          const nasdaqResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${firecrawlKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url: nasdaqUrl,
              formats: ['markdown'],
              onlyMainContent: true,
              waitFor: 3000,
            }),
          });
          
          if (nasdaqResponse.ok) {
            const nasdaqData = await nasdaqResponse.json();
            if (nasdaqData.success && nasdaqData.data?.markdown) {
              console.log('[EARNINGS] Firecrawl scraped Nasdaq earnings');
              // Similar parsing logic would go here
            }
          }
        }
      } catch (error) {
        console.error('[EARNINGS] Firecrawl error:', error);
      }
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
          dateRange: { from, to },
          earnings: insertedData || earningsToInsert,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        count: 0, 
        dateRange: { from, to },
        earnings: [],
        message: 'No earnings found. Check API keys are configured correctly.',
        apiStatus: {
          polygon: !!polygonKey,
          fmp: !!fmpKey,
          finnhub: !!finnhubKey,
          firecrawl: !!firecrawlKey
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
