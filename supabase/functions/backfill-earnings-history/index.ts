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

// Compute 5-trading-day price return around an earnings report date
async function computeFiveTradingDayReturn(
  supabase: any,
  symbol: string,
  reportDate: string,
): Promise<{ price_before: number | null; price_after: number | null; price_change_pct: number | null }> {
  const start = new Date(reportDate + 'T00:00:00Z');
  start.setUTCDate(start.getUTCDate() - 15);
  const end = new Date(reportDate + 'T00:00:00Z');
  end.setUTCDate(end.getUTCDate() + 25);

  const { data: bars, error } = await supabase
    .from('market_daily_bars')
    .select('bar_date, close')
    .eq('ticker', symbol)
    .gte('bar_date', isoDate(start))
    .lte('bar_date', isoDate(end))
    .order('bar_date', { ascending: true })
    .limit(200);

  if (error || !bars || bars.length < 8) {
    return { price_before: null, price_after: null, price_change_pct: null };
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
    return { price_before: null, price_after: null, price_change_pct: null };
  }

  const idxAfter = idxBefore + 5;
  if (idxAfter >= bars.length) {
    return { price_before: null, price_after: null, price_change_pct: null };
  }

  const before = Number(bars[idxBefore].close);
  const after = Number(bars[idxAfter].close);
  if (!Number.isFinite(before) || !Number.isFinite(after) || before <= 0) {
    return { price_before: null, price_after: null, price_change_pct: null };
  }

  return {
    price_before: before,
    price_after: after,
    price_change_pct: calcPctChange(before, after),
  };
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

    if (!SUPABASE_URL) throw new Error('SUPABASE_URL is not configured');
    if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get existing earnings history records for this symbol that need price enrichment
    const { data: existingHistory, error: fetchError } = await supabase
      .from('earnings_history')
      .select('id, symbol, report_date, eps_actual, eps_estimate, price_change_pct')
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

    console.log(`[backfill-earnings-history] Found ${existingHistory.length} records for ${symbol}, enriching with price data...`);

    let enrichedCount = 0;

    // Enrich each record with price change data from market_daily_bars
    for (const record of existingHistory) {
      // Skip if already has price data
      if (record.price_change_pct !== null) {
        continue;
      }

      const price = await computeFiveTradingDayReturn(supabase, symbol, record.report_date);

      if (price.price_change_pct !== null) {
        const { error: updateError } = await supabase
          .from('earnings_history')
          .update({
            price_before: price.price_before,
            price_after: price.price_after,
            price_change_pct: price.price_change_pct,
          })
          .eq('id', record.id);

        if (!updateError) {
          enrichedCount++;
          console.log(`[backfill-earnings-history] Enriched ${symbol} ${record.report_date}: ${price.price_change_pct?.toFixed(2)}%`);
        } else {
          console.error(`[backfill-earnings-history] Update error for ${record.id}:`, updateError.message);
        }
      }
    }

    // Also try to pull estimates from earnings_calendar for matching quarters
    const { data: calendarData } = await supabase
      .from('earnings_calendar')
      .select('report_date, eps_estimate, revenue_estimate')
      .eq('symbol', symbol)
      .not('eps_estimate', 'is', null);

    if (calendarData && calendarData.length > 0) {
      // Create a map of estimates by date
      const estimatesMap = new Map<string, { eps_estimate: number; revenue_estimate: number | null }>();
      for (const cal of calendarData) {
        estimatesMap.set(cal.report_date, {
          eps_estimate: cal.eps_estimate,
          revenue_estimate: cal.revenue_estimate,
        });
      }

      // Update earnings_history records with estimates where available
      for (const record of existingHistory) {
        if (record.eps_estimate !== null) continue; // Already has estimate

        const estimate = estimatesMap.get(record.report_date);
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
            console.log(`[backfill-earnings-history] Added estimate for ${symbol} ${record.report_date}`);
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
        source: 'market_daily_bars + earnings_calendar',
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
