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

    const { startDate, endDate, symbols } = await req.json();
    
    const polygonKey = Deno.env.get('POLYGON_API_KEY');
    const finnhubKey = Deno.env.get('FINNHUB_API_KEY');
    
    let allEarnings: EarningsEvent[] = [];
    
    const from = startDate || new Date().toISOString().split('T')[0];
    const to = endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Method 1: Finnhub earnings calendar (primary - better free tier)
    if (finnhubKey) {
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
            
            allEarnings = data.earningsCalendar.map((item: any) => ({
              symbol: item.symbol,
              companyName: item.symbol,
              reportDate: item.date,
              fiscalPeriod: `Q${item.quarter || 1}`,
              fiscalYear: item.year || new Date().getFullYear(),
              epsEstimate: item.epsEstimate,
              revenueEstimate: item.revenueEstimate,
              timeOfDay: item.hour === 'bmo' ? 'BMO' : item.hour === 'amc' ? 'AMC' : 'DMT',
            }));
          }
        } else {
          console.error('[EARNINGS] Finnhub error:', response.status);
        }
      } catch (error) {
        console.error('[EARNINGS] Finnhub fetch error:', error);
      }
    }

    // Method 2: Polygon.io (backup)
    if (allEarnings.length === 0 && polygonKey) {
      try {
        console.log('[EARNINGS] Falling back to Polygon');
        
        const polygonUrl = `https://api.polygon.io/vX/reference/tickers/earnings?filing_date.gte=${from}&filing_date.lte=${to}&limit=1000&apiKey=${polygonKey}`;
        const response = await fetch(polygonUrl);
        const data = await response.json();
        
        if (data.results) {
          console.log(`[EARNINGS] Polygon returned ${data.results.length} events`);
          
          allEarnings = data.results.map((item: any) => ({
            symbol: item.ticker,
            companyName: item.company_name || item.ticker,
            reportDate: item.filing_date || item.report_date,
            fiscalPeriod: item.fiscal_period,
            fiscalYear: item.fiscal_year,
            epsEstimate: item.consensus_eps_estimate,
            revenueEstimate: item.consensus_revenue_estimate,
            timeOfDay: item.time_of_day,
          }));
        }
      } catch (error) {
        console.error('[EARNINGS] Polygon fetch error:', error);
      }
    }

    // Filter by symbols if provided
    if (symbols && symbols.length > 0) {
      allEarnings = allEarnings.filter(e => symbols.includes(e.symbol));
    }

    // Filter by date range
    allEarnings = allEarnings.filter(e => e.reportDate >= from && e.reportDate <= to);

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
      JSON.stringify({ success: true, count: 0, earnings: [] }),
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
