import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function isoDate(d: Date) {
  return d.toISOString().split('T')[0];
}

function calcPctChange(before: number, after: number): number {
  if (!before || before <= 0) return 0;
  return ((after - before) / before) * 100;
}

// Return periods: 1W (5 days), 2W (10 days), 1M (21 days), 3M (63 days)
const RETURN_PERIODS = {
  return_1w: 5,
  return_2w: 10,
  return_1m: 21,
  return_3m: 63,
};

interface PriceBar {
  date: string;
  close: number;
}

// Fetch price bars directly from Polygon API
async function fetchPriceBarsFromPolygon(
  symbol: string,
  startDate: string,
  endDate: string,
  polygonApiKey: string
): Promise<PriceBar[]> {
  try {
    const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/day/${startDate}/${endDate}?adjusted=true&sort=asc&limit=500&apiKey=${polygonApiKey}`;
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    
    if (!response.ok) {
      console.log(`[backfill-earnings-history] Polygon bars API returned ${response.status} for ${symbol}`);
      return [];
    }
    
    const data = await response.json();
    
    if (!data.results || !Array.isArray(data.results)) {
      console.log(`[backfill-earnings-history] No price bars returned from Polygon for ${symbol}`);
      return [];
    }
    
    const bars: PriceBar[] = data.results.map((bar: { t: number; c: number }) => ({
      date: new Date(bar.t).toISOString().split('T')[0],
      close: bar.c,
    }));
    
    console.log(`[backfill-earnings-history] Fetched ${bars.length} price bars from Polygon for ${symbol} (${startDate} to ${endDate})`);
    return bars;
  } catch (err) {
    console.error(`[backfill-earnings-history] Error fetching price bars from Polygon:`, err);
    return [];
  }
}

// Fetch earnings release dates from Polygon's Benzinga earnings endpoint
async function fetchPolygonBenzingaEarningsReleaseDates(symbol: string, polygonApiKey: string): Promise<Map<string, string>> {
  const fiscalPeriodToReportDate = new Map<string, string>();

  try {
    const url = `https://api.polygon.io/benzinga/v1/earnings?ticker=${symbol}&limit=100&sort=date.desc&apiKey=${polygonApiKey}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      console.log(`[backfill-earnings-history] Polygon Benzinga earnings API returned ${response.status}`);
      return fiscalPeriodToReportDate;
    }

    const data = await response.json();

    if (data.results && Array.isArray(data.results)) {
      for (const result of data.results) {
        const reportDate = result.date;
        const fiscalPeriod = result.fiscal_period;
        const fiscalYear = result.fiscal_year;

        if (reportDate && fiscalPeriod && fiscalYear) {
          const key = `${fiscalPeriod} ${fiscalYear}`;
          fiscalPeriodToReportDate.set(key, reportDate);
          console.log(`[backfill-earnings-history] Polygon Benzinga earnings: ${symbol} ${key} reported on ${reportDate}`);

          if (fiscalPeriod === 'FY') {
            fiscalPeriodToReportDate.set(`Q4 ${fiscalYear}`, reportDate);
          }
        }
      }
    }
  } catch (err) {
    console.error('[backfill-earnings-history] Error fetching Polygon Benzinga earnings release dates:', err);
  }

  return fiscalPeriodToReportDate;
}

// Fetch actual earnings dates from Polygon API (filing dates)
async function fetchPolygonEarningsDates(symbol: string, polygonApiKey: string): Promise<Map<string, string>> {
  const fiscalPeriodToReportDate = new Map<string, string>();
  
  try {
    const url = `https://api.polygon.io/vX/reference/financials?ticker=${symbol}&limit=20&apiKey=${polygonApiKey}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    
    if (!response.ok) {
      console.log(`[backfill-earnings-history] Polygon financials API returned ${response.status}`);
      return fiscalPeriodToReportDate;
    }
    
    const data = await response.json();
    
    if (data.results && Array.isArray(data.results)) {
      for (const result of data.results) {
        const filingDate = result.filing_date || result.acceptance_datetime?.split('T')[0];
        const fiscalPeriod = result.fiscal_period;
        const fiscalYear = result.fiscal_year;
        
        if (filingDate && fiscalPeriod && fiscalYear) {
          const key = `${fiscalPeriod} ${fiscalYear}`;
          fiscalPeriodToReportDate.set(key, filingDate);
          console.log(`[backfill-earnings-history] Polygon: ${symbol} ${key} reported on ${filingDate}`);
          
          if (fiscalPeriod === 'FY') {
            const q4Key = `Q4 ${fiscalYear}`;
            fiscalPeriodToReportDate.set(q4Key, filingDate);
            console.log(`[backfill-earnings-history] Polygon: Also mapping ${q4Key} -> ${filingDate}`);
          }
        }
      }
    }
  } catch (err) {
    console.error('[backfill-earnings-history] Error fetching Polygon earnings dates:', err);
  }
  
  return fiscalPeriodToReportDate;
}

// Compute multiple return periods around an earnings report date
async function computeMultiPeriodReturns(
  supabase: any,
  symbol: string,
  reportDate: string,
  polygonApiKey: string | undefined,
): Promise<{
  price_before: number | null;
  price_after: number | null;
  price_change_pct: number | null;
  return_1w: number | null;
  return_2w: number | null;
  return_1m: number | null;
  return_3m: number | null;
}> {
  // Calculate date range: 30 days before to 180 days after (to cover 3M = 63 trading days)
  const start = new Date(reportDate + 'T00:00:00Z');
  start.setUTCDate(start.getUTCDate() - 30);
  const end = new Date(reportDate + 'T00:00:00Z');
  end.setUTCDate(end.getUTCDate() + 180);

  const startStr = isoDate(start);
  const endStr = isoDate(end);

  const result = {
    price_before: null as number | null,
    price_after: null as number | null,
    price_change_pct: null as number | null,
    return_1w: null as number | null,
    return_2w: null as number | null,
    return_1m: null as number | null,
    return_3m: null as number | null,
  };

  // First try to get bars from our database
  let bars: PriceBar[] = [];
  
  const { data: dbBars, error } = await supabase
    .from('market_daily_bars')
    .select('bar_date, close')
    .eq('ticker', symbol)
    .gte('bar_date', startStr)
    .lte('bar_date', endStr)
    .order('bar_date', { ascending: true })
    .limit(300);

  if (!error && dbBars && dbBars.length > 0) {
    bars = dbBars.map((b: { bar_date: string; close: number }) => ({
      date: b.bar_date,
      close: Number(b.close),
    }));
    console.log(`[backfill-earnings-history] Got ${bars.length} bars from database for ${symbol} around ${reportDate}`);
  }

  // Check if we have any bar on or before report date
  const hasBarOnOrBeforeReport = bars.some(b => b.date <= reportDate);
  
  // If insufficient bars OR no bar on/before report date, fetch from Polygon API
  if ((bars.length < 8 || !hasBarOnOrBeforeReport) && polygonApiKey) {
    console.log(`[backfill-earnings-history] Need Polygon data for ${symbol} (DB bars: ${bars.length}, has bar on/before ${reportDate}: ${hasBarOnOrBeforeReport})`);
    const polygonBars = await fetchPriceBarsFromPolygon(symbol, startStr, endStr, polygonApiKey);
    if (polygonBars.length > bars.length || (!hasBarOnOrBeforeReport && polygonBars.some(b => b.date <= reportDate))) {
      bars = polygonBars;
    }
  }

  if (bars.length < 8) {
    console.log(`[backfill-earnings-history] Still insufficient bars for ${symbol} around ${reportDate}: ${bars.length} bars`);
    return result;
  }

  // Find the last trading day on or before report date
  const idxBefore = (() => {
    let idx = -1;
    for (let i = 0; i < bars.length; i++) {
      if (bars[i].date <= reportDate) idx = i;
    }
    return idx;
  })();

  if (idxBefore < 0) {
    console.log(`[backfill-earnings-history] No bar found on or before ${reportDate} for ${symbol}`);
    return result;
  }

  const before = Number(bars[idxBefore].close);
  if (!Number.isFinite(before) || before <= 0) {
    return result;
  }

  result.price_before = before;

  // Calculate returns for each period
  for (const [key, days] of Object.entries(RETURN_PERIODS)) {
    const idxAfter = idxBefore + days;
    if (idxAfter < bars.length) {
      const after = Number(bars[idxAfter].close);
      if (Number.isFinite(after)) {
        result[key as keyof typeof RETURN_PERIODS] = calcPctChange(before, after);
        
        // Set price_after and price_change_pct for 1W (backwards compatibility)
        if (key === 'return_1w') {
          result.price_after = after;
          result.price_change_pct = result.return_1w;
        }
      }
    }
  }

  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const symbolRaw = String(body?.symbol || '').trim();

    if (!symbolRaw) {
      return new Response(JSON.stringify({ success: false, error: 'symbol is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const symbol = symbolRaw.toUpperCase();

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const POLYGON_API_KEY = Deno.env.get('POLYGON_API_KEY');

    if (!SUPABASE_URL) throw new Error('SUPABASE_URL is not configured');
    if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch earnings dates from Polygon
    let polygonReleaseDates = new Map<string, string>();
    let polygonFilingDates = new Map<string, string>();
    if (POLYGON_API_KEY) {
      polygonReleaseDates = await fetchPolygonBenzingaEarningsReleaseDates(symbol, POLYGON_API_KEY);
      polygonFilingDates = await fetchPolygonEarningsDates(symbol, POLYGON_API_KEY);
      console.log(`[backfill-earnings-history] Got ${polygonReleaseDates.size} earnings release dates and ${polygonFilingDates.size} filing dates from Polygon for ${symbol}`);
    } else {
      console.log('[backfill-earnings-history] POLYGON_API_KEY not configured, using stored dates only');
    }

    // Fetch earnings release dates from our calendar
    const { data: calendarRows, error: calendarErr } = await supabase
      .from('earnings_calendar')
      .select('report_date, fiscal_period, fiscal_year')
      .eq('symbol', symbol)
      .not('fiscal_period', 'is', null)
      .not('fiscal_year', 'is', null)
      .order('report_date', { ascending: false })
      .limit(40);

    if (calendarErr) {
      console.log(`[backfill-earnings-history] earnings_calendar fetch error for ${symbol}: ${calendarErr.message}`);
    }

    const calendarDates = new Map<string, string>();
    if (calendarRows && Array.isArray(calendarRows)) {
      for (const row of calendarRows) {
        const fiscalPeriod = row.fiscal_period;
        const fiscalYear = row.fiscal_year;
        const reportDate = row.report_date;

        if (fiscalPeriod && fiscalYear && reportDate) {
          const key = `${fiscalPeriod} ${fiscalYear}`;
          calendarDates.set(key, reportDate);

          if (fiscalPeriod === 'FY') {
            calendarDates.set(`Q4 ${fiscalYear}`, reportDate);
          }
        }
      }
      console.log(`[backfill-earnings-history] Got ${calendarDates.size} earnings release dates from earnings_calendar for ${symbol}`);
    }

    // Get existing earnings history records for this symbol
    const { data: existingHistory, error: fetchError } = await supabase
      .from('earnings_history')
      .select('id, symbol, report_date, fiscal_period, eps_actual, eps_estimate, price_change_pct, return_1w, return_2w, return_1m, return_3m')
      .eq('symbol', symbol)
      .order('report_date', { ascending: false })
      .limit(20);

    if (fetchError) {
      console.error('[backfill-earnings-history] Error fetching existing records:', fetchError.message);
      return new Response(JSON.stringify({ success: false, error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If no records exist, CREATE them from Polygon filing dates
    if (!existingHistory || existingHistory.length === 0) {
      console.log(`[backfill-earnings-history] No existing earnings_history records for ${symbol}, creating from Polygon data...`);
      
      // Merge all available dates (prefer release dates over filing dates)
      const allDates = new Map<string, string>();
      for (const [key, date] of polygonFilingDates) {
        allDates.set(key, date);
      }
      for (const [key, date] of polygonReleaseDates) {
        allDates.set(key, date); // Release dates override filing dates
      }
      for (const [key, date] of calendarDates) {
        allDates.set(key, date); // Calendar dates take priority
      }
      
      if (allDates.size === 0) {
        console.log(`[backfill-earnings-history] No earnings dates found for ${symbol}`);
        return new Response(JSON.stringify({ 
          success: true, 
          symbol, 
          created: 0, 
          reason: 'no_earnings_data_from_polygon' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // Create earnings_history records from Polygon data
      let createdCount = 0;
      const recordsToInsert: Array<{
        symbol: string;
        report_date: string;
        fiscal_period: string;
        price_before?: number | null;
        price_after?: number | null;
        price_change_pct?: number | null;
        return_1w?: number | null;
        return_2w?: number | null;
        return_1m?: number | null;
        return_3m?: number | null;
      }> = [];
      
      for (const [fiscalPeriod, reportDate] of allDates) {
        // Skip FY entries (we use Q4 for those)
        if (fiscalPeriod.startsWith('FY')) continue;
        
        // Only process historical dates (not future)
        if (new Date(reportDate) > new Date()) continue;
        
        // Compute returns for this earnings date
        const returns = await computeMultiPeriodReturns(supabase, symbol, reportDate, POLYGON_API_KEY);
        
        recordsToInsert.push({
          symbol,
          report_date: reportDate,
          fiscal_period: fiscalPeriod,
          price_before: returns.price_before,
          price_after: returns.price_after,
          price_change_pct: returns.price_change_pct,
          return_1w: returns.return_1w,
          return_2w: returns.return_2w,
          return_1m: returns.return_1m,
          return_3m: returns.return_3m,
        });
        
        console.log(`[backfill-earnings-history] Prepared ${symbol} ${fiscalPeriod} (${reportDate}): 1W=${returns.return_1w?.toFixed(2) ?? 'N/A'}%`);
      }
      
      if (recordsToInsert.length > 0) {
        // Insert all records (use upsert to handle duplicates)
        const { error: insertError, data: insertedData } = await supabase
          .from('earnings_history')
          .upsert(recordsToInsert, { 
            onConflict: 'symbol,report_date',
            ignoreDuplicates: false 
          })
          .select('id');
        
        if (insertError) {
          console.error(`[backfill-earnings-history] Insert error:`, insertError.message);
        } else {
          createdCount = insertedData?.length || recordsToInsert.length;
          console.log(`[backfill-earnings-history] Created ${createdCount} earnings_history records for ${symbol}`);
        }
      }
      
      return new Response(JSON.stringify({ 
        success: true, 
        symbol, 
        created: createdCount,
        reason: 'created_from_polygon' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[backfill-earnings-history] Found ${existingHistory.length} records for ${symbol}, enriching with multi-period returns...`);

    let enrichedCount = 0;
    let datesCorrected = 0;

    // Enrich each record with price change data
    for (const record of existingHistory) {
      // Choose the best "event date" for computing returns
      let actualReportDate = record.report_date;

      const calendarDate = record.fiscal_period ? calendarDates.get(record.fiscal_period) : undefined;
      const polygonDate = record.fiscal_period
        ? (polygonReleaseDates.get(record.fiscal_period) || polygonFilingDates.get(record.fiscal_period))
        : undefined;

      const preferredDate = calendarDate || polygonDate || record.report_date;
      if (preferredDate && preferredDate !== record.report_date) {
        console.log(`[backfill-earnings-history] Correcting ${symbol} ${record.fiscal_period} date: ${record.report_date} -> ${preferredDate} (${calendarDate ? 'earnings_calendar' : 'polygon'})`);
        actualReportDate = preferredDate;

        const { error: dateUpdateError } = await supabase
          .from('earnings_history')
          .update({ report_date: preferredDate })
          .eq('id', record.id);

        if (!dateUpdateError) {
          datesCorrected++;
        }
      }

      // Force recompute if date was corrected or if any return is missing
      const needsEnrichment = 
        actualReportDate !== record.report_date ||
        record.return_1w === null || 
        record.return_2w === null || 
        record.return_1m === null || 
        record.return_3m === null;

      if (!needsEnrichment) {
        continue;
      }

      const returns = await computeMultiPeriodReturns(supabase, symbol, actualReportDate, POLYGON_API_KEY);

      // Build update object with only non-null values
      const updateData: Record<string, number | null> = {};
      if (returns.price_before !== null) updateData.price_before = returns.price_before;
      if (returns.price_after !== null) updateData.price_after = returns.price_after;
      if (returns.price_change_pct !== null) updateData.price_change_pct = returns.price_change_pct;
      if (returns.return_1w !== null) updateData.return_1w = returns.return_1w;
      if (returns.return_2w !== null) updateData.return_2w = returns.return_2w;
      if (returns.return_1m !== null) updateData.return_1m = returns.return_1m;
      if (returns.return_3m !== null) updateData.return_3m = returns.return_3m;

      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from('earnings_history')
          .update(updateData)
          .eq('id', record.id);

        if (!updateError) {
          enrichedCount++;
          console.log(`[backfill-earnings-history] Enriched ${symbol} ${record.fiscal_period} (${actualReportDate}): 1W=${returns.return_1w?.toFixed(2)}%, 2W=${returns.return_2w?.toFixed(2)}%, 1M=${returns.return_1m?.toFixed(2)}%, 3M=${returns.return_3m?.toFixed(2)}%`);
        } else {
          console.error(`[backfill-earnings-history] Update error for ${record.id}:`, updateError.message);
        }
      }
    }

    // Also try to pull estimates from earnings_calendar for matching quarters
    const { data: calendarData } = await supabase
      .from('earnings_calendar')
      .select('report_date, eps_estimate, revenue_estimate, fiscal_period')
      .eq('symbol', symbol)
      .not('eps_estimate', 'is', null);

    if (calendarData && calendarData.length > 0) {
      const estimatesByDate = new Map<string, { eps_estimate: number; revenue_estimate: number | null }>();
      const estimatesByPeriod = new Map<string, { eps_estimate: number; revenue_estimate: number | null }>();
      
      for (const cal of calendarData) {
        estimatesByDate.set(cal.report_date, {
          eps_estimate: cal.eps_estimate,
          revenue_estimate: cal.revenue_estimate,
        });
        if (cal.fiscal_period) {
          estimatesByPeriod.set(cal.fiscal_period, {
            eps_estimate: cal.eps_estimate,
            revenue_estimate: cal.revenue_estimate,
          });
        }
      }

      for (const record of existingHistory) {
        if (record.eps_estimate !== null) continue;

        const estimate = estimatesByPeriod.get(record.fiscal_period || '') || estimatesByDate.get(record.report_date);
        
        if (estimate && estimate.eps_estimate !== null) {
          const epsSurprisePct = record.eps_actual !== null && estimate.eps_estimate !== 0
            ? ((record.eps_actual - estimate.eps_estimate) / Math.abs(estimate.eps_estimate)) * 100
            : null;

          const { error: updateError } = await supabase
            .from('earnings_history')
            .update({
              eps_estimate: estimate.eps_estimate,
              eps_surprise_pct: epsSurprisePct,
              revenue_estimate: estimate.revenue_estimate,
            })
            .eq('id', record.id);

          if (!updateError) {
            console.log(`[backfill-earnings-history] Added estimate for ${symbol} ${record.fiscal_period}`);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        symbol,
        recordsFound: existingHistory.length,
        enrichedWithPrices: enrichedCount,
        datesCorrected,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[backfill-earnings-history] Error:', err);
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
