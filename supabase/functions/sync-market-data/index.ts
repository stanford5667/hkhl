import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SyncRequest {
  mode: 'full' | 'incremental' | 'single_ticker' | 'validate';
  tickers?: string[];
  startDate?: string;
  endDate?: string;
  forceRefresh?: boolean;
}

interface BarData {
  ticker: string;
  bar_date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vwap: number | null;
  transactions: number | null;
  daily_return: number | null;
  log_return: number | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  
  const polygonApiKey = Deno.env.get("POLYGON_API_KEY");
  
  if (!polygonApiKey) {
    console.error("[SyncMarketData] POLYGON_API_KEY not configured");
    return new Response(
      JSON.stringify({ error: "POLYGON_API_KEY not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { mode, tickers, startDate, endDate, forceRefresh }: SyncRequest = await req.json();
    
    console.log(`[SyncMarketData] Starting ${mode} sync`, { tickers: tickers?.length, startDate, endDate });
    
    // Create sync log entry
    const { data: syncLog, error: logError } = await supabase
      .from('data_sync_log')
      .insert({
        sync_type: mode,
        status: 'running',
        started_at: new Date().toISOString(),
        triggered_by: 'api_request',
        metadata: { tickers, startDate, endDate, forceRefresh }
      })
      .select()
      .single();
    
    if (logError) {
      console.error("[SyncMarketData] Failed to create sync log:", logError);
      throw logError;
    }
    
    console.log(`[SyncMarketData] Created sync log: ${syncLog.id}`);
    
    // Determine tickers to sync
    let tickersToSync: string[] = [];
    
    if (mode === 'single_ticker' && tickers?.length) {
      tickersToSync = tickers;
    } else if (mode === 'incremental') {
      // Get tickers that need refresh (stale data > 1 day old)
      const { data: staleTickers, error: staleError } = await supabase
        .from('asset_universe')
        .select('ticker')
        .eq('is_active', true)
        .or('data_end_date.is.null,data_end_date.lt.' + getDateDaysAgo(1));
      
      if (staleError) {
        console.error("[SyncMarketData] Error fetching stale tickers:", staleError);
      }
      tickersToSync = staleTickers?.map((t: any) => t.ticker) || [];
    } else if (mode === 'full') {
      // Get all active tickers from universe
      const { data: allTickers, error: allError } = await supabase
        .from('asset_universe')
        .select('ticker')
        .eq('is_active', true);
      
      if (allError) {
        console.error("[SyncMarketData] Error fetching all tickers:", allError);
      }
      tickersToSync = allTickers?.map(t => t.ticker) || [];
    } else if (mode === 'validate') {
      // Validate existing data without fetching
      return await validateExistingData(supabase, syncLog.id, corsHeaders);
    }
    
    console.log(`[SyncMarketData] Syncing ${tickersToSync.length} tickers`);
    
    if (tickersToSync.length === 0) {
      await supabase
        .from('data_sync_log')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          tickers_total: 0,
          metadata: { message: 'No tickers to sync' }
        })
        .eq('id', syncLog.id);
      
      return new Response(
        JSON.stringify({ success: true, message: 'No tickers to sync', syncId: syncLog.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Update log with total count
    await supabase
      .from('data_sync_log')
      .update({ tickers_total: tickersToSync.length })
      .eq('id', syncLog.id);
    
    // Calculate date range
    const end = endDate || new Date().toISOString().split('T')[0];
    const start = startDate || getDateYearsAgo(5); // 5 years of history
    
    console.log(`[SyncMarketData] Date range: ${start} to ${end}`);
    
    // Process in batches
    const BATCH_SIZE = 5; // Polygon rate limit friendly
    let totalBarsInserted = 0;
    let totalBarsUpdated = 0;
    let tickersSucceeded = 0;
    let tickersFailed = 0;
    const errors: any[] = [];
    const warnings: any[] = [];
    
    for (let i = 0; i < tickersToSync.length; i += BATCH_SIZE) {
      const batch = tickersToSync.slice(i, i + BATCH_SIZE);
      
      console.log(`[SyncMarketData] Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(tickersToSync.length/BATCH_SIZE)}: ${batch.join(', ')}`);
      
      const results = await Promise.allSettled(
        batch.map(ticker => 
          syncTickerData(supabase, polygonApiKey, ticker, start, end, forceRefresh)
        )
      );
      
      for (let j = 0; j < results.length; j++) {
        const result = results[j];
        const ticker = batch[j];
        
        if (result.status === 'fulfilled') {
          totalBarsInserted += result.value.inserted;
          totalBarsUpdated += result.value.updated;
          tickersSucceeded++;
          
          console.log(`[SyncMarketData] ✓ ${ticker}: ${result.value.inserted} bars inserted`);
          
          // Update asset_universe with latest data info
          const { error: updateError } = await supabase
            .from('asset_universe')
            .update({
              is_validated: true,
              validation_date: new Date().toISOString(),
              data_start_date: start,
              data_end_date: result.value.lastDate || end,
              total_bars: result.value.totalBars,
              updated_at: new Date().toISOString()
            })
            .eq('ticker', ticker);
          
          if (updateError) {
            warnings.push({ ticker, warning: 'Failed to update asset_universe', error: updateError.message });
          }
            
        } else {
          tickersFailed++;
          const errorMsg = result.reason?.message || 'Unknown error';
          errors.push({
            ticker,
            error: errorMsg
          });
          console.error(`[SyncMarketData] ✗ ${ticker}: ${errorMsg}`);
        }
      }
      
      // Update progress
      await supabase
        .from('data_sync_log')
        .update({
          tickers_processed: i + batch.length,
          tickers_succeeded: tickersSucceeded,
          tickers_failed: tickersFailed,
          bars_inserted: totalBarsInserted,
          bars_updated: totalBarsUpdated
        })
        .eq('id', syncLog.id);
      
      // Rate limit pause (Polygon allows 5 requests/minute on free, more on paid)
      if (i + BATCH_SIZE < tickersToSync.length) {
        console.log('[SyncMarketData] Rate limit pause...');
        await sleep(1200); // 1.2 seconds between batches
      }
    }
    
    // Calculate correlations for synced tickers (if more than 1 and not single ticker mode)
    if (tickersToSync.length > 1 && mode !== 'single_ticker') {
      console.log('[SyncMarketData] Calculating correlations...');
      try {
        await calculateCorrelations(supabase, tickersToSync, 252); // 1 year
        console.log('[SyncMarketData] Correlations calculated successfully');
      } catch (corrError: any) {
        console.error('[SyncMarketData] Correlation calculation failed:', corrError);
        warnings.push({ warning: 'Correlation calculation failed', error: corrError.message });
      }
    }
    
    // Mark sync complete
    const finalStatus = tickersFailed > 0 
      ? (tickersSucceeded > 0 ? 'partial' : 'failed')
      : 'completed';
      
    await supabase
      .from('data_sync_log')
      .update({
        status: finalStatus,
        completed_at: new Date().toISOString(),
        errors: errors.length > 0 ? errors : null,
        warnings: warnings.length > 0 ? warnings : null
      })
      .eq('id', syncLog.id);
    
    console.log(`[SyncMarketData] Complete: ${tickersSucceeded} succeeded, ${tickersFailed} failed, ${totalBarsInserted} bars inserted`);
    
    return new Response(
      JSON.stringify({
        success: true,
        syncId: syncLog.id,
        status: finalStatus,
        summary: {
          tickersProcessed: tickersToSync.length,
          tickersSucceeded,
          tickersFailed,
          barsInserted: totalBarsInserted,
          barsUpdated: totalBarsUpdated
        },
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error: any) {
    console.error("[SyncMarketData] Fatal error:", error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function syncTickerData(
  supabase: any,
  apiKey: string,
  ticker: string,
  startDate: string,
  endDate: string,
  forceRefresh?: boolean
): Promise<{ inserted: number; updated: number; totalBars: number; lastDate: string | null }> {
  
  // Check existing data range if not forcing refresh
  let adjustedStart = startDate;
  if (!forceRefresh) {
    const { data: existing } = await supabase
      .from('market_daily_bars')
      .select('bar_date')
      .eq('ticker', ticker)
      .order('bar_date', { ascending: false })
      .limit(1)
      .single();
    
    if (existing?.bar_date) {
      // Only fetch data after last known date
      const nextDay = addDays(existing.bar_date, 1);
      if (nextDay >= endDate) {
        // Data is up to date
        const { count } = await supabase
          .from('market_daily_bars')
          .select('*', { count: 'exact', head: true })
          .eq('ticker', ticker);
        
        return { inserted: 0, updated: 0, totalBars: count || 0, lastDate: existing.bar_date };
      }
      adjustedStart = nextDay;
    }
  }
  
  // Fetch from Polygon
  const url = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/1/day/${adjustedStart}/${endDate}?adjusted=true&sort=asc&limit=50000&apiKey=${apiKey}`;
  
  console.log(`[SyncTicker] Fetching ${ticker} from ${adjustedStart} to ${endDate}`);
  
  const response = await fetch(url);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Polygon API error for ${ticker}: ${response.status} - ${errorText}`);
  }
  
  const data = await response.json();
  
  if (data.status === 'ERROR') {
    throw new Error(`Polygon error: ${data.error || data.message || 'Unknown error'}`);
  }
  
  if (!data.results || data.results.length === 0) {
    // No new data - get current count
    const { count } = await supabase
      .from('market_daily_bars')
      .select('*', { count: 'exact', head: true })
      .eq('ticker', ticker);
    
    return { inserted: 0, updated: 0, totalBars: count || 0, lastDate: null };
  }
  
  console.log(`[SyncTicker] ${ticker}: received ${data.results.length} bars from Polygon`);
  
  // Transform and calculate returns
  const bars: BarData[] = [];
  let prevClose: number | null = null;
  
  // If we have existing data, get the last close for return calculation
  if (adjustedStart !== startDate) {
    const { data: lastBar } = await supabase
      .from('market_daily_bars')
      .select('close')
      .eq('ticker', ticker)
      .order('bar_date', { ascending: false })
      .limit(1)
      .single();
    
    if (lastBar) {
      prevClose = lastBar.close;
    }
  }
  
  for (const bar of data.results) {
    const barDate = new Date(bar.t).toISOString().split('T')[0];
    const close = bar.c;
    
    let dailyReturn: number | null = null;
    let logReturn: number | null = null;
    
    if (prevClose && prevClose > 0) {
      dailyReturn = (close - prevClose) / prevClose;
      logReturn = Math.log(close / prevClose);
    }
    
    bars.push({
      ticker,
      bar_date: barDate,
      open: bar.o,
      high: bar.h,
      low: bar.l,
      close: close,
      volume: bar.v,
      vwap: bar.vw || null,
      transactions: bar.n || null,
      daily_return: dailyReturn,
      log_return: logReturn
    });
    
    prevClose = close;
  }
  
  // Upsert to database in chunks to avoid payload limits
  const CHUNK_SIZE = 500;
  let totalInserted = 0;
  
  for (let i = 0; i < bars.length; i += CHUNK_SIZE) {
    const chunk = bars.slice(i, i + CHUNK_SIZE);
    
    const { error } = await supabase
      .from('market_daily_bars')
      .upsert(chunk, { 
        onConflict: 'ticker,bar_date'
      });
    
    if (error) {
      console.error(`[SyncTicker] Upsert error for ${ticker}:`, error);
      throw error;
    }
    
    totalInserted += chunk.length;
  }
  
  // Get total bar count
  const { count } = await supabase
    .from('market_daily_bars')
    .select('*', { count: 'exact', head: true })
    .eq('ticker', ticker);
  
  return {
    inserted: bars.length,
    updated: 0, // Upsert doesn't differentiate
    totalBars: count || bars.length,
    lastDate: bars[bars.length - 1]?.bar_date || null
  };
}

async function calculateCorrelations(
  supabase: any,
  tickers: string[],
  periodDays: number
): Promise<void> {
  // Get returns for all tickers
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = getDateDaysAgo(periodDays);
  
  const returnsMap = new Map<string, number[]>();
  const datesMap = new Map<string, string[]>();
  
  // Limit to first 50 tickers to avoid timeout
  const limitedTickers = tickers.slice(0, 50);
  
  for (const ticker of limitedTickers) {
    const { data, error } = await supabase
      .from('market_daily_bars')
      .select('bar_date, daily_return')
      .eq('ticker', ticker)
      .gte('bar_date', startDate)
      .lte('bar_date', endDate)
      .not('daily_return', 'is', null)
      .order('bar_date');
    
    if (error) {
      console.error(`[Correlations] Error fetching returns for ${ticker}:`, error);
      continue;
    }
    
    if (data && data.length > 0) {
      returnsMap.set(ticker, data.map((d: any) => d.daily_return));
      datesMap.set(ticker, data.map((d: any) => d.bar_date));
    }
  }
  
  // Calculate pairwise correlations
  const correlations: { ticker_a: string; ticker_b: string; correlation: number; period_days: number }[] = [];
  
  const tickerList = Array.from(returnsMap.keys());
  
  console.log(`[Correlations] Calculating correlations for ${tickerList.length} tickers`);
  
  for (let i = 0; i < tickerList.length; i++) {
    for (let j = i + 1; j < tickerList.length; j++) {
      const tickerA = tickerList[i];
      const tickerB = tickerList[j];
      
      // Ensure A < B for consistent ordering
      const [first, second] = tickerA < tickerB ? [tickerA, tickerB] : [tickerB, tickerA];
      
      const returnsA = returnsMap.get(first)!;
      const returnsB = returnsMap.get(second)!;
      const datesA = datesMap.get(first)!;
      const datesB = datesMap.get(second)!;
      
      // Align by date
      const { alignedA, alignedB } = alignReturnsByDate(returnsA, datesA, returnsB, datesB);
      
      if (alignedA.length >= 20) { // Minimum 20 data points
        const corr = pearsonCorrelation(alignedA, alignedB);
        if (!isNaN(corr)) {
          correlations.push({
            ticker_a: first,
            ticker_b: second,
            correlation: Math.round(corr * 10000) / 10000,
            period_days: periodDays
          });
        }
      }
    }
  }
  
  console.log(`[Correlations] Calculated ${correlations.length} correlation pairs`);
  
  // Upsert correlations in chunks
  if (correlations.length > 0) {
    const CHUNK_SIZE = 100;
    for (let i = 0; i < correlations.length; i += CHUNK_SIZE) {
      const chunk = correlations.slice(i, i + CHUNK_SIZE);
      const { error } = await supabase
        .from('ticker_correlations')
        .upsert(chunk, { onConflict: 'ticker_a,ticker_b,period_days' });
      
      if (error) {
        console.error('[Correlations] Upsert error:', error);
      }
    }
  }
}

function alignReturnsByDate(
  returnsA: number[], datesA: string[],
  returnsB: number[], datesB: string[]
): { alignedA: number[]; alignedB: number[] } {
  const alignedA: number[] = [];
  const alignedB: number[] = [];
  
  for (let i = 0; i < datesA.length; i++) {
    const idx = datesB.indexOf(datesA[i]);
    if (idx !== -1) {
      alignedA.push(returnsA[i]);
      alignedB.push(returnsB[idx]);
    }
  }
  
  return { alignedA, alignedB };
}

function pearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n !== y.length || n < 2) return NaN;
  
  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;
  
  let num = 0;
  let denX = 0;
  let denY = 0;
  
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  
  const den = Math.sqrt(denX * denY);
  return den === 0 ? 0 : num / den;
}

async function validateExistingData(supabase: any, syncLogId: number, corsHeaders: Record<string, string>) {
  const issues: string[] = [];
  const stats: any = {};
  
  try {
    // Get overall stats
    const { count: totalBars } = await supabase
      .from('market_daily_bars')
      .select('*', { count: 'exact', head: true });
    
    stats.totalBars = totalBars;
    
    // Get ticker count
    const { data: tickerData } = await supabase
      .from('market_daily_bars')
      .select('ticker')
      .limit(1);
    
    // Check for tickers with missing returns
    const { data: missingReturns } = await supabase
      .from('market_daily_bars')
      .select('ticker')
      .is('daily_return', null)
      .limit(100);
    
    if (missingReturns && missingReturns.length > 0) {
      const uniqueTickers = [...new Set(missingReturns.map((r: any) => r.ticker))];
      issues.push(`${uniqueTickers.length} tickers have bars with missing returns`);
    }
    
    // Get date range
    const { data: dateRange } = await supabase
      .from('market_daily_bars')
      .select('bar_date')
      .order('bar_date', { ascending: true })
      .limit(1)
      .single();
    
    const { data: latestDate } = await supabase
      .from('market_daily_bars')
      .select('bar_date')
      .order('bar_date', { ascending: false })
      .limit(1)
      .single();
    
    stats.earliestDate = dateRange?.bar_date;
    stats.latestDate = latestDate?.bar_date;
    
    console.log('[Validate] Stats:', stats);
    console.log('[Validate] Issues:', issues);
    
  } catch (error: any) {
    issues.push(`Validation error: ${error.message}`);
  }
  
  await supabase
    .from('data_sync_log')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      metadata: { validation: true, issues, stats }
    })
    .eq('id', syncLogId);
  
  return new Response(
    JSON.stringify({ success: true, issues, stats }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// Utility functions
function getDateYearsAgo(years: number): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() - years);
  return date.toISOString().split('T')[0];
}

function getDateDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
