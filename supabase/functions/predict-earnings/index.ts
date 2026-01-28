import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Signal {
  type: string;
  value: number;
  weight: number;
  description: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      authHeader ? { global: { headers: { Authorization: authHeader } } } : {}
    );

    const serviceSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let userId: string | null = null;
    if (authHeader && !authHeader.includes('anon')) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    }

    const body = await req.json().catch(() => ({}));
    const { symbols, generateMissing = false, limit = 500 } = body;

    let upcomingEarnings: any[] = [];

    // If generateMissing mode, get earnings without predictions using SQL
    if (generateMissing) {
      console.log('[PREDICT] Generating predictions for records missing them...');
      
      const today = new Date().toISOString().split('T')[0];
      const maxDate = new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const { data: allEarnings, error: earningsError } = await serviceSupabase
        .from('earnings_calendar')
        .select('*')
        .gte('report_date', today)
        .lte('report_date', maxDate)
        .order('report_date')
        .limit(10000);
      
      if (earningsError) throw earningsError;
      
      console.log(`[PREDICT] Fetched ${allEarnings?.length || 0} total earnings`);
      
      // Get ALL prediction IDs efficiently by fetching in pages
      const existingIds = new Set<string>();
      let offset = 0;
      const pageSize = 1000;
      
      while (true) {
        const { data: predPage } = await serviceSupabase
          .from('earnings_predictions')
          .select('earnings_calendar_id')
          .range(offset, offset + pageSize - 1);
        
        if (!predPage || predPage.length === 0) break;
        
        predPage.forEach((p: any) => existingIds.add(p.earnings_calendar_id));
        offset += pageSize;
        
        if (predPage.length < pageSize) break;
      }
      
      console.log(`[PREDICT] Found ${existingIds.size} existing predictions`);
      
      // Filter to those without predictions
      upcomingEarnings = (allEarnings || []).filter(e => !existingIds.has(e.id)).slice(0, limit);
      
      console.log(`[PREDICT] Found ${upcomingEarnings.length} earnings without predictions`);
      
    } else if (symbols && symbols.length > 0) {
      // Original mode - get by symbols
      const { data, error: earningsError } = await supabase
        .from('earnings_calendar')
        .select('*')
        .in('symbol', symbols)
        .gte('report_date', new Date().toISOString().split('T')[0])
        .order('report_date');

      if (earningsError) throw earningsError;
      upcomingEarnings = data || [];
    }

    if (upcomingEarnings.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No upcoming earnings found to predict' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[PREDICT] Generating predictions for ${upcomingEarnings.length} earnings`);

    const predictions = [];
    const errors: string[] = [];

    // Process in batches to avoid timeouts
    const batchSize = 50;
    
    for (let i = 0; i < upcomingEarnings.length; i += batchSize) {
      const batch = upcomingEarnings.slice(i, i + batchSize);
      
      // Process batch in parallel
      const batchResults = await Promise.allSettled(
        batch.map(async (earnings) => {
          try {
            const signals = await gatherSignals(serviceSupabase, earnings);
            const prediction = generatePrediction(earnings, signals);

            // Check if prediction already exists
            const { data: existing } = await serviceSupabase
              .from('earnings_predictions')
              .select('id')
              .eq('earnings_calendar_id', earnings.id)
              .maybeSingle();

            let savedPrediction;
            let saveError;

            if (existing) {
              const result = await serviceSupabase
                .from('earnings_predictions')
                .update({
                  predicted_outcome: prediction.outcome,
                  confidence_score: prediction.confidence,
                  signals: prediction.signals,
                  model_version: prediction.modelVersion,
                  generated_at: new Date().toISOString(),
                })
                .eq('id', existing.id)
                .select()
                .single();
              savedPrediction = result.data;
              saveError = result.error;
            } else {
              const result = await serviceSupabase
                .from('earnings_predictions')
                .insert({
                  earnings_calendar_id: earnings.id,
                  symbol: earnings.symbol,
                  report_date: earnings.report_date,
                  predicted_outcome: prediction.outcome,
                  confidence_score: prediction.confidence,
                  signals: prediction.signals,
                  model_version: prediction.modelVersion,
                  user_id: userId,
                })
                .select()
                .single();
              savedPrediction = result.data;
              saveError = result.error;
            }

            if (saveError) {
              throw new Error(`Save error for ${earnings.symbol}: ${saveError.message}`);
            }
            
            return savedPrediction;
          } catch (err) {
            throw new Error(`${earnings.symbol}: ${err instanceof Error ? err.message : 'Unknown error'}`);
          }
        })
      );

      // Collect results
      for (const result of batchResults) {
        if (result.status === 'fulfilled' && result.value) {
          predictions.push(result.value);
        } else if (result.status === 'rejected') {
          errors.push(result.reason?.message || 'Unknown error');
        }
      }
      
      console.log(`[PREDICT] Batch ${Math.floor(i / batchSize) + 1}: ${predictions.length} predictions saved`);
    }

    console.log(`[PREDICT] Generated ${predictions.length} predictions, ${errors.length} errors`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        generated: predictions.length,
        errors: errors.length,
        errorDetails: errors.slice(0, 10) // Return first 10 errors for debugging
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[PREDICT] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function gatherSignals(supabase: any, earnings: any): Promise<Signal[]> {
  const signals: Signal[] = [];
  const symbol = earnings.symbol;

  // 1. Historical earnings surprise pattern with standard deviation analysis
  const { data: history } = await supabase
    .from('earnings_history')
    .select('eps_surprise_pct, report_date')
    .eq('symbol', symbol)
    .order('report_date', { ascending: false })
    .limit(12); // Get more history for better std dev calculation

  if (history && history.length >= 4) {
    const surprises = history.map((h: any) => h.eps_surprise_pct || 0);
    
    // Basic metrics
    const avgSurprise = surprises.reduce((sum: number, val: number) => sum + val, 0) / surprises.length;
    const beatRate = surprises.filter((val: number) => val > 0).length / surprises.length;
    
    // Standard deviation calculation
    const variance = surprises.reduce((sum: number, val: number) => 
      sum + Math.pow(val - avgSurprise, 2), 0) / surprises.length;
    const stdDev = Math.sqrt(variance);
    
    // Consistency score: lower std dev = more consistent = higher score
    // Normalize to 0-1 scale (assume 20% std dev is very volatile, 2% is very consistent)
    const consistencyScore = Math.max(0, Math.min(1, 1 - (stdDev / 20)));
    
    // Recent vs historical deviation (last 4 vs all)
    const recentSurprises = surprises.slice(0, 4);
    const recentAvg = recentSurprises.reduce((sum: number, val: number) => sum + val, 0) / recentSurprises.length;
    const trendStrength = (recentAvg - avgSurprise) / (stdDev + 0.01); // Normalized by volatility
    
    // Detect regime change (recent volatility vs historical)
    let recentVolatility = 0;
    if (recentSurprises.length >= 4) {
      const recentVariance = recentSurprises.reduce((sum: number, val: number) => 
        sum + Math.pow(val - recentAvg, 2), 0) / recentSurprises.length;
      recentVolatility = Math.sqrt(recentVariance);
    }
    const volatilityChange = (recentVolatility - stdDev) / (stdDev + 0.01);
    
    signals.push({
      type: 'historical_beat_rate',
      value: beatRate,
      weight: 0.20,
      description: `${(beatRate * 100).toFixed(0)}% beat rate over last ${history.length} quarters`,
    });

    signals.push({
      type: 'avg_surprise',
      value: Math.max(-1, Math.min(1, avgSurprise / 10)),
      weight: 0.15,
      description: `Average surprise: ${avgSurprise.toFixed(2)}%`,
    });
    
    signals.push({
      type: 'surprise_consistency',
      value: consistencyScore,
      weight: 0.18,
      description: `Consistency score: ${(consistencyScore * 100).toFixed(0)}% (StdDev: ${stdDev.toFixed(2)}%)`,
    });
    
    signals.push({
      type: 'trend_strength',
      value: Math.max(-1, Math.min(1, trendStrength)),
      weight: 0.12,
      description: `Trend: ${trendStrength > 0 ? 'improving' : 'declining'} (${Math.abs(trendStrength).toFixed(2)}σ)`,
    });
    
    signals.push({
      type: 'volatility_regime',
      value: -Math.max(-1, Math.min(1, volatilityChange)), // Negative because increasing volatility = less reliable
      weight: 0.10,
      description: `Volatility ${volatilityChange > 0.2 ? 'increasing' : volatilityChange < -0.2 ? 'decreasing' : 'stable'}`,
    });
  }

  // 2. Market cap tier signal
  if (earnings.market_cap) {
    const marketCapBillions = earnings.market_cap / 1e9;
    let marketCapScore = 0.5;
    
    if (marketCapBillions > 100) {
      marketCapScore = 0.7;
    } else if (marketCapBillions > 10) {
      marketCapScore = 0.6;
    } else if (marketCapBillions > 2) {
      marketCapScore = 0.5;
    } else if (marketCapBillions > 0.3) {
      marketCapScore = 0.4;
    } else {
      marketCapScore = 0.35;
    }

    signals.push({
      type: 'market_cap_tier',
      value: marketCapScore,
      weight: 0.05,
      description: `Market cap: $${marketCapBillions.toFixed(1)}B`,
    });
  }

  // 3. EPS estimate trend signal
  if (earnings.eps_estimate !== null && earnings.eps_estimate !== undefined) {
    const epsScore = earnings.eps_estimate > 0 ? 0.55 : 0.45;
    signals.push({
      type: 'eps_estimate_sign',
      value: epsScore,
      weight: 0.03,
      description: `EPS estimate: $${earnings.eps_estimate.toFixed(2)}`,
    });
  }

  // 4. Time of day signal
  if (earnings.time_of_day) {
    const timeScore = earnings.time_of_day === 'BMO' ? 0.52 : 
                      earnings.time_of_day === 'AMC' ? 0.48 : 0.50;
    signals.push({
      type: 'report_timing',
      value: timeScore,
      weight: 0.02,
      description: `Reports ${earnings.time_of_day}`,
    });
  }

  // Add symbol-based baseline for variation when no historical data
  if (signals.length < 5) {
    const symbolHash = hashSymbol(symbol);
    const hashMod = symbolHash % 100;
    const baselineScore = 0.38 + (hashMod / 100) * 0.24;
    
    signals.push({
      type: 'baseline_estimate',
      value: baselineScore,
      weight: signals.length < 3 ? 0.40 : 0.15,
      description: 'Model baseline estimate',
    });
  }

  return signals;
}

function hashSymbol(symbol: string): number {
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) {
    const char = symbol.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function generatePrediction(
  earnings: any,
  signals: Signal[]
): { outcome: string; confidence: number; signals: any; modelVersion: string } {
  // Calculate weighted score from all signals
  let score = 0.50; // Start at neutral (0.50)
  let totalWeight = 0;
  
  signals.forEach(signal => {
    // Convert signal value to contribution (-1 to 1 range for most signals, 0-1 for beat_rate/consistency)
    let contribution = signal.value;
    
    // For beat rate and consistency, map 0-1 to -0.5 to +0.5 around neutral
    if (signal.type === 'historical_beat_rate' || signal.type === 'surprise_consistency') {
      contribution = (signal.value - 0.5);
    }
    
    score += contribution * signal.weight;
    totalWeight += signal.weight;
  });

  // Normalize score to reasonable range (0.3 to 0.7)
  score = Math.max(0.30, Math.min(0.70, score));

  // Determine outcome using thresholds
  let outcome = 'inline';
  if (score > 0.54) outcome = 'beat';
  else if (score < 0.46) outcome = 'miss';

  // Calculate confidence based on:
  // 1. Distance from neutral (0.50) - further = more confident
  // 2. Signal quality bonus - more signals with low volatility = higher confidence
  const distanceFromNeutral = Math.abs(score - 0.50);
  let baseConfidence = distanceFromNeutral * 2; // 0.0 to 0.4 becomes 0.0 to 0.8

  // Signal quality multiplier
  const signalCount = signals.length;
  const consistencySignal = signals.find(s => s.type === 'surprise_consistency');
  const consistencyBonus = consistencySignal ? consistencySignal.value * 0.15 : 0;
  
  // More signals = more confidence (up to 10% bonus)
  const signalCountBonus = Math.min(0.10, signalCount * 0.02);
  
  const confidence = Math.min(0.95, baseConfidence + 0.35 + consistencyBonus + signalCountBonus);

  return {
    outcome,
    confidence: Math.round(confidence * 100) / 100,
    signals: {
      score: Math.round(score * 1000) / 1000,
      totalWeight: Math.round(totalWeight * 100) / 100,
      signalBreakdown: signals.reduce((acc, s) => {
        acc[s.type] = { value: s.value, weight: s.weight, description: s.description };
        return acc;
      }, {} as Record<string, any>),
      thresholds: {
        beat: 0.54,
        miss: 0.46,
      },
    },
    modelVersion: 'rule-based-v2-stddev',
  };
}
