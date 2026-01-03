import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Core tickers for correlation calculation
const CORE_TICKERS = ['SPY', 'QQQ', 'VTI', 'BND', 'GLD', 'VNQ'];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  console.log("[ScheduledSync] Starting daily market data sync...");

  try {
    // Step 1: Find stale tickers (data_end_date older than 1 trading day)
    const yesterday = getDateDaysAgo(1);
    console.log(`[ScheduledSync] Finding tickers with data older than ${yesterday}`);
    
    const { data: staleTickers, error: staleError } = await supabase
      .from('asset_universe')
      .select('ticker')
      .eq('is_active', true)
      .or(`data_end_date.is.null,data_end_date.lt.${yesterday}`);
    
    if (staleError) {
      console.error("[ScheduledSync] Error finding stale tickers:", staleError);
      throw staleError;
    }
    
    const tickersToRefresh = staleTickers?.map(t => t.ticker) || [];
    console.log(`[ScheduledSync] Found ${tickersToRefresh.length} stale tickers`);
    
    let tickersRefreshed = 0;
    let barsInserted = 0;
    let correlationsUpdated = 0;
    let cachesInvalidated = 0;
    
    // Step 2: Call sync-market-data with incremental mode
    if (tickersToRefresh.length > 0) {
      console.log("[ScheduledSync] Invoking sync-market-data function...");
      
      const { data: syncResult, error: syncError } = await supabase.functions.invoke('sync-market-data', {
        body: {
          mode: 'incremental',
          tickers: tickersToRefresh
        }
      });
      
      if (syncError) {
        console.error("[ScheduledSync] sync-market-data error:", syncError);
        throw syncError;
      }
      
      console.log("[ScheduledSync] sync-market-data result:", syncResult);
      
      tickersRefreshed = syncResult?.summary?.tickersSucceeded || 0;
      barsInserted = syncResult?.summary?.barsInserted || 0;
      
      // Step 3: Update asset_universe pre-calculated fields
      if (tickersRefreshed > 0) {
        console.log("[ScheduledSync] Updating asset_universe calculated fields...");
        await updateAssetUniverseFields(supabase, tickersToRefresh);
      }
    }
    
    // Step 4: Recalculate correlations for core tickers
    console.log("[ScheduledSync] Recalculating correlations for core tickers...");
    correlationsUpdated = await recalculateCoreCorrelations(supabase);
    
    // Step 5: Invalidate affected calculation_cache entries
    console.log("[ScheduledSync] Invalidating affected caches...");
    cachesInvalidated = await invalidateAffectedCaches(supabase, tickersToRefresh);
    
    // Step 6: Log results to data_sync_log
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    const { error: logError } = await supabase
      .from('data_sync_log')
      .insert({
        sync_type: 'scheduled',
        status: 'completed',
        started_at: new Date(startTime).toISOString(),
        completed_at: new Date().toISOString(),
        triggered_by: 'pg_cron',
        tickers_total: tickersToRefresh.length,
        tickers_succeeded: tickersRefreshed,
        tickers_failed: tickersToRefresh.length - tickersRefreshed,
        bars_inserted: barsInserted,
        metadata: {
          correlationsUpdated,
          cachesInvalidated,
          durationSeconds: parseFloat(duration),
          coreTickers: CORE_TICKERS
        }
      });
    
    if (logError) {
      console.error("[ScheduledSync] Failed to create sync log:", logError);
    }
    
    const response = {
      success: true,
      tickersRefreshed,
      barsInserted,
      correlationsUpdated,
      cachesInvalidated,
      duration: `${duration}s`
    };
    
    console.log("[ScheduledSync] Complete:", response);
    
    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error: any) {
    console.error("[ScheduledSync] Fatal error:", error);
    
    // Log failed sync
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    await supabase
      .from('data_sync_log')
      .insert({
        sync_type: 'scheduled',
        status: 'failed',
        started_at: new Date(startTime).toISOString(),
        completed_at: new Date().toISOString(),
        triggered_by: 'pg_cron',
        errors: [{ error: error.message }],
        metadata: { durationSeconds: parseFloat(duration) }
      });
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        duration: `${duration}s`
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/**
 * Update asset_universe pre-calculated fields for given tickers
 */
async function updateAssetUniverseFields(supabase: any, tickers: string[]): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const oneWeekAgo = getDateDaysAgo(7);
  const oneMonthAgo = getDateDaysAgo(30);
  const thirtyDaysAgo = getDateDaysAgo(30);
  
  for (const ticker of tickers) {
    try {
      // Get latest close and previous closes for change calculations
      const { data: bars, error } = await supabase
        .from('market_daily_bars')
        .select('bar_date, close, daily_return')
        .eq('ticker', ticker)
        .order('bar_date', { ascending: false })
        .limit(60); // ~2 months of data
      
      if (error || !bars || bars.length === 0) {
        console.log(`[UpdateFields] No data for ${ticker}`);
        continue;
      }
      
      const latestBar = bars[0];
      const lastClose = latestBar.close;
      
      // Find prices at different periods
      let change1d = null;
      let change1w = null;
      let change1m = null;
      
      if (bars.length > 1) {
        const prevClose = bars[1].close;
        if (prevClose > 0) {
          change1d = ((lastClose - prevClose) / prevClose) * 100;
        }
      }
      
      // Find bar from ~1 week ago
      const weekBar = bars.find((b: any) => b.bar_date <= oneWeekAgo);
      if (weekBar && weekBar.close > 0) {
        change1w = ((lastClose - weekBar.close) / weekBar.close) * 100;
      }
      
      // Find bar from ~1 month ago
      const monthBar = bars.find((b: any) => b.bar_date <= oneMonthAgo);
      if (monthBar && monthBar.close > 0) {
        change1m = ((lastClose - monthBar.close) / monthBar.close) * 100;
      }
      
      // Calculate 30-day volatility (annualized)
      const recentBars = bars.filter((b: any) => b.bar_date >= thirtyDaysAgo && b.daily_return !== null);
      let volatility30d = null;
      
      if (recentBars.length >= 10) {
        const returns = recentBars.map((b: any) => b.daily_return);
        const mean = returns.reduce((a: number, b: number) => a + b, 0) / returns.length;
        const variance = returns.reduce((a: number, b: number) => a + Math.pow(b - mean, 2), 0) / returns.length;
        const dailyVol = Math.sqrt(variance);
        volatility30d = dailyVol * Math.sqrt(252) * 100; // Annualized percentage
      }
      
      // Update asset_universe
      const { error: updateError } = await supabase
        .from('asset_universe')
        .update({
          last_close: lastClose,
          change_percent_1d: change1d !== null ? Math.round(change1d * 100) / 100 : null,
          change_percent_1w: change1w !== null ? Math.round(change1w * 100) / 100 : null,
          change_percent_1m: change1m !== null ? Math.round(change1m * 100) / 100 : null,
          volatility_30d: volatility30d !== null ? Math.round(volatility30d * 100) / 100 : null,
          updated_at: new Date().toISOString()
        })
        .eq('ticker', ticker);
      
      if (updateError) {
        console.error(`[UpdateFields] Error updating ${ticker}:`, updateError);
      } else {
        console.log(`[UpdateFields] Updated ${ticker}: close=${lastClose}, 1d=${change1d?.toFixed(2)}%, vol=${volatility30d?.toFixed(2)}%`);
      }
      
    } catch (err: any) {
      console.error(`[UpdateFields] Error processing ${ticker}:`, err);
    }
  }
}

/**
 * Recalculate correlations for core tickers
 */
async function recalculateCoreCorrelations(supabase: any): Promise<number> {
  const periodDays = 252;
  const startDate = getDateDaysAgo(periodDays);
  const endDate = new Date().toISOString().split('T')[0];
  
  const returnsMap = new Map<string, number[]>();
  const datesMap = new Map<string, string[]>();
  
  // Fetch returns for core tickers
  for (const ticker of CORE_TICKERS) {
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
  
  for (let i = 0; i < tickerList.length; i++) {
    for (let j = i + 1; j < tickerList.length; j++) {
      const tickerA = tickerList[i];
      const tickerB = tickerList[j];
      
      const [first, second] = tickerA < tickerB ? [tickerA, tickerB] : [tickerB, tickerA];
      
      const returnsA = returnsMap.get(first)!;
      const returnsB = returnsMap.get(second)!;
      const datesA = datesMap.get(first)!;
      const datesB = datesMap.get(second)!;
      
      const { alignedA, alignedB } = alignReturnsByDate(returnsA, datesA, returnsB, datesB);
      
      if (alignedA.length >= 20) {
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
  
  // Upsert correlations
  if (correlations.length > 0) {
    const { error } = await supabase
      .from('ticker_correlations')
      .upsert(correlations, { onConflict: 'ticker_a,ticker_b,period_days' });
    
    if (error) {
      console.error("[Correlations] Upsert error:", error);
    } else {
      console.log(`[Correlations] Upserted ${correlations.length} correlation pairs`);
    }
  }
  
  return correlations.length;
}

/**
 * Invalidate calculation caches affected by updated tickers
 */
async function invalidateAffectedCaches(supabase: any, updatedTickers: string[]): Promise<number> {
  if (updatedTickers.length === 0) return 0;
  
  // Find caches that contain any of the updated tickers
  const { data: affectedCaches, error: fetchError } = await supabase
    .from('calculation_cache')
    .select('id, tickers')
    .eq('is_valid', true);
  
  if (fetchError) {
    console.error("[InvalidateCache] Error fetching caches:", fetchError);
    return 0;
  }
  
  const cacheIdsToInvalidate: string[] = [];
  
  for (const cache of affectedCaches || []) {
    const cacheTickers = cache.tickers || [];
    const hasAffectedTicker = cacheTickers.some((t: string) => updatedTickers.includes(t));
    if (hasAffectedTicker) {
      cacheIdsToInvalidate.push(cache.id);
    }
  }
  
  if (cacheIdsToInvalidate.length > 0) {
    const { error: updateError } = await supabase
      .from('calculation_cache')
      .update({ is_valid: false })
      .in('id', cacheIdsToInvalidate);
    
    if (updateError) {
      console.error("[InvalidateCache] Error invalidating caches:", updateError);
    } else {
      console.log(`[InvalidateCache] Invalidated ${cacheIdsToInvalidate.length} caches`);
    }
  }
  
  return cacheIdsToInvalidate.length;
}

// Utility functions
function getDateDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

function alignReturnsByDate(
  returnsA: number[],
  datesA: string[],
  returnsB: number[],
  datesB: string[]
): { alignedA: number[]; alignedB: number[] } {
  const dateMapB = new Map(datesB.map((d, i) => [d, returnsB[i]]));
  const alignedA: number[] = [];
  const alignedB: number[] = [];
  
  for (let i = 0; i < datesA.length; i++) {
    const dateA = datesA[i];
    if (dateMapB.has(dateA)) {
      alignedA.push(returnsA[i]);
      alignedB.push(dateMapB.get(dateA)!);
    }
  }
  
  return { alignedA, alignedB };
}

function pearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n !== y.length || n === 0) return NaN;
  
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
  const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
  const sumY2 = y.reduce((acc, yi) => acc + yi * yi, 0);
  
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  
  return denominator === 0 ? 0 : numerator / denominator;
}
