import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

type FmpEarningsRow = {
  date?: string;
  symbol?: string;
  eps?: number | null;
  epsEstimated?: number | null;
  revenue?: number | null;
  revenueEstimated?: number | null;
};

function isoDate(d: Date) {
  return d.toISOString().split('T')[0];
}

function fiscalPeriodFromDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  const q = Math.ceil((d.getUTCMonth() + 1) / 3);
  const y = d.getUTCFullYear();
  return `Q${q} ${y}`;
}

function calcPctChange(before: number, after: number): number {
  if (!before) return 0;
  return ((after - before) / before) * 100;
}

async function fetchFmpEarningsHistory(symbol: string, apiKey: string, limit = 32) {
  // As of 2026, many legacy /api/v3 endpoints are restricted.
  // Use the stable Earnings Report endpoint instead.
  const url = `https://financialmodelingprep.com/stable/earnings?symbol=${encodeURIComponent(symbol)}&limit=${limit}&apikey=${apiKey}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const resp = await fetch(url, { signal: controller.signal });
    if (!resp.ok) {
      const body = await resp.text().catch(() => '');
      throw new Error(`FMP stable earnings failed [${resp.status}]: ${body}`);
    }
    const data = (await resp.json()) as unknown;
    if (!Array.isArray(data)) return [];
    return (data as FmpEarningsRow[])
      .filter(r => (r.symbol || '').toUpperCase() === symbol.toUpperCase() && !!r.date)
      .filter(r => !!r.date)
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  } finally {
    clearTimeout(timeoutId);
  }
}

type FinnhubEarningsRow = {
  symbol?: string;
  year?: number;
  quarter?: number;
  period?: string; // date string
  actual?: number | null;
  estimate?: number | null;
  surprise?: number | null;
  surprisePercent?: number | null;
  revenueActual?: number | null;
  revenueEstimate?: number | null;
};

async function fetchFinnhubEarningsHistory(symbol: string, token: string, limit = 16) {
  const url = `https://finnhub.io/api/v1/stock/earnings?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(token)}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  try {
    const resp = await fetch(url, { signal: controller.signal });
    if (!resp.ok) {
      const body = await resp.text().catch(() => '');
      throw new Error(`Finnhub stock/earnings failed [${resp.status}]: ${body}`);
    }
    const data = (await resp.json()) as unknown;
    if (!Array.isArray(data)) return [];
    return (data as FinnhubEarningsRow[])
      .filter(r => (r.symbol || '').toUpperCase() === symbol.toUpperCase() && !!r.period)
      .sort((a, b) => String(b.period).localeCompare(String(a.period)))
      .slice(0, limit);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function computeFiveTradingDayReturn(
  supabase: any,
  symbol: string,
  reportDate: string,
): Promise<{ price_before: number | null; price_after: number | null; price_change_pct: number | null }> {
  // Pull a small window of daily bars around the report date and compute:
  // price_before = close on the last trading day on/before reportDate
  // price_after  = close 5 trading days after that
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
    const years = Math.max(1, Math.min(8, Number(body?.years ?? 4)));

    if (!symbolRaw) {
      return new Response(JSON.stringify({ success: false, error: 'symbol is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const symbol = symbolRaw.toUpperCase();

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const FMP_API_KEY = Deno.env.get('FMP_API_KEY');
    const FINNHUB_API_KEY = Deno.env.get('VITE_FINNHUB_API_KEY') || Deno.env.get('FINNHUB_API_KEY');

    if (!SUPABASE_URL) throw new Error('SUPABASE_URL is not configured');
    if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
    if (!FMP_API_KEY && !FINNHUB_API_KEY) {
      throw new Error('Neither FMP_API_KEY nor FINNHUB_API_KEY is configured');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const limit = Math.max(4, Math.min(80, years * 12));

    let source: 'fmp' | 'finnhub' = 'finnhub';
    let rows: Array<FmpEarningsRow | FinnhubEarningsRow> = [];

    if (FMP_API_KEY) {
      try {
        console.log(`[backfill-earnings-history] Trying FMP stable earnings (limit=${limit})`);
        rows = await fetchFmpEarningsHistory(symbol, FMP_API_KEY, limit);
        source = 'fmp';
      } catch (e) {
        console.warn('[backfill-earnings-history] FMP unavailable, falling back to Finnhub:', e);
      }
    }

    if (rows.length === 0 && FINNHUB_API_KEY) {
      console.log('[backfill-earnings-history] Fetching from Finnhub stock/earnings');
      rows = await fetchFinnhubEarningsHistory(symbol, FINNHUB_API_KEY, 20);
      source = 'finnhub';
    }

    if (rows.length === 0) {
      return new Response(JSON.stringify({ success: true, symbol, updated: 0, reason: 'no_rows_available' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const capped = rows.slice(0, 20); // cap to keep function fast
    let upserted = 0;
    let enrichedWithPrices = 0;

    for (const r of capped) {
      const report_date = String((r as any).date || (r as any).period || '');
      if (!report_date) continue;

      const eps_actual = (r as any).eps ?? (r as any).actual ?? null;
      const eps_estimate = (r as any).epsEstimated ?? (r as any).estimate ?? null;
      const revenue_actual = (r as any).revenue ?? (r as any).revenueActual ?? null;
      const revenue_estimate = (r as any).revenueEstimated ?? (r as any).revenueEstimate ?? null;

      const eps_surprise_pct =
        eps_actual !== null && eps_estimate !== null && eps_estimate !== 0
          ? ((eps_actual - eps_estimate) / Math.abs(eps_estimate)) * 100
          : null;

      const revenue_surprise_pct =
        revenue_actual !== null && revenue_estimate !== null && revenue_estimate !== 0
          ? ((revenue_actual - revenue_estimate) / revenue_estimate) * 100
          : null;

      const price = await computeFiveTradingDayReturn(supabase, symbol, report_date);

      const { error } = await supabase
        .from('earnings_history')
        .upsert(
          {
            symbol,
            report_date,
            fiscal_period: fiscalPeriodFromDate(report_date),
            eps_actual,
            eps_estimate,
            eps_surprise_pct,
            revenue_actual,
            revenue_estimate,
            revenue_surprise_pct,
            price_before: price.price_before,
            price_after: price.price_after,
            price_change_pct: price.price_change_pct,
          },
          { onConflict: 'symbol,report_date', ignoreDuplicates: false },
        );

      if (!error) {
        upserted++;
        if (price.price_change_pct !== null) enrichedWithPrices++;
      } else {
        console.error(`[backfill-earnings-history] upsert error for ${symbol} ${report_date}:`, error.message);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        symbol,
        fetched: rows.length,
        upserted,
        enrichedWithPrices,
        source: `${source} + market_daily_bars`,
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
