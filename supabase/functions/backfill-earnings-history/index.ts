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

interface PolygonEarningsResult {
  fiscal_period: string;
  fiscal_year: string;
  report_date: string;
  eps?: number;
  eps_estimated?: number;
}

// Fetch actual earnings dates from Polygon API
async function fetchPolygonEarningsDates(symbol: string, polygonApiKey: string): Promise<Map<string, string>> {
  const fiscalPeriodToReportDate = new Map<string, string>();
  
  try {
    // Polygon stock financials endpoint has actual filing dates
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
        // filing_date is the actual report date
        const filingDate = result.filing_date || result.acceptance_datetime?.split('T')[0];
        const fiscalPeriod = result.fiscal_period; // "Q1", "Q2", "FY", etc.
        const fiscalYear = result.fiscal_year;
        
        if (filingDate && fiscalPeriod && fiscalYear) {
          const key = `${fiscalPeriod} ${fiscalYear}`;
          fiscalPeriodToReportDate.set(key, filingDate);
          console.log(`[backfill-earnings-history] Polygon: ${symbol} ${key} reported on ${filingDate}`);
          
          // Also map FY (annual) to Q4 since our DB stores Q4 for annual reports
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
): Promise<{
  price_before: number | null;
  price_after: number | null;
  price_change_pct: number | null;
  return_1w: number | null;
  return_2w: number | null;
  return_1m: number | null;
  return_3m: number | null;
}> {
  const start = new Date(reportDate + 'T00:00:00Z');
  start.setUTCDate(start.getUTCDate() - 15);
  const end = new Date(reportDate + 'T00:00:00Z');
  end.setUTCDate(end.getUTCDate() + 90); // Extended to cover 3 months

  const { data: bars, error } = await supabase
    .from('market_daily_bars')
    .select('bar_date, close')
    .eq('ticker', symbol)
    .gte('bar_date', isoDate(start))
    .lte('bar_date', isoDate(end))
    .order('bar_date', { ascending: true })
    .limit(300);

  const result = {
    price_before: null as number | null,
    price_after: null as number | null,
    price_change_pct: null as number | null,
    return_1w: null as number | null,
    return_2w: null as number | null,
    return_1m: null as number | null,
    return_3m: null as number | null,
  };

  if (error || !bars || bars.length < 8) {
    console.log(`[backfill-earnings-history] Insufficient bars for ${symbol} around ${reportDate}: ${bars?.length || 0} bars`);
    return result;
  }

  // Find the last trading day on or before report date
  const idxBefore = (() => {
    let idx = -1;
    for (let i = 0; i < bars.length; i++) {
      if (bars[i].bar_date <= reportDate) idx = i;
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

    // Fetch actual earnings report dates from Polygon
    let polygonDates = new Map<string, string>();
    if (POLYGON_API_KEY) {
      polygonDates = await fetchPolygonEarningsDates(symbol, POLYGON_API_KEY);
      console.log(`[backfill-earnings-history] Got ${polygonDates.size} actual report dates from Polygon for ${symbol}`);
    } else {
      console.log('[backfill-earnings-history] POLYGON_API_KEY not configured, using stored dates');
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

    if (!existingHistory || existingHistory.length === 0) {
      console.log(`[backfill-earnings-history] No existing earnings_history records for ${symbol}`);
      return new Response(JSON.stringify({ 
        success: true, 
        symbol, 
        updated: 0, 
        reason: 'no_existing_records' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[backfill-earnings-history] Found ${existingHistory.length} records for ${symbol}, enriching with multi-period returns...`);

    let enrichedCount = 0;
    let datesCorrected = 0;

    // Enrich each record with price change data from market_daily_bars
    for (const record of existingHistory) {
      // First, check if we have a corrected date from Polygon
      let actualReportDate = record.report_date;
      
      if (record.fiscal_period && polygonDates.size > 0) {
        const polygonDate = polygonDates.get(record.fiscal_period);
        if (polygonDate && polygonDate !== record.report_date) {
          console.log(`[backfill-earnings-history] Correcting ${symbol} ${record.fiscal_period} date: ${record.report_date} -> ${polygonDate}`);
          actualReportDate = polygonDate;
          
          // Update the stored date in earnings_history
          const { error: dateUpdateError } = await supabase
            .from('earnings_history')
            .update({ report_date: polygonDate })
            .eq('id', record.id);
          
          if (!dateUpdateError) {
            datesCorrected++;
          }
        }
      }

      // Now compute returns using the (possibly corrected) date
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

      const returns = await computeMultiPeriodReturns(supabase, symbol, actualReportDate);

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
      // Create maps by both date and fiscal period
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

      // Update earnings_history records with estimates where available
      for (const record of existingHistory) {
        if (record.eps_estimate !== null) continue; // Already has estimate

        // Try matching by fiscal period first, then by date
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
        source: 'polygon_financials + market_daily_bars',
        periods: ['1W', '2W', '1M', '3M'],
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[backfill-earnings-history] Error:', err);
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
