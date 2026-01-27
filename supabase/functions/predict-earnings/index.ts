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
    if (!authHeader) throw new Error('Missing authorization header');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get user
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) throw new Error('Unauthorized');
    
    const userId = claimsData.claims.sub;

    const { symbols, useBulkPrediction = false } = await req.json();

    // Fetch upcoming earnings for these symbols
    const { data: upcomingEarnings, error: earningsError } = await supabase
      .from('earnings_calendar')
      .select('*')
      .in('symbol', symbols)
      .gte('report_date', new Date().toISOString().split('T')[0])
      .order('report_date');

    if (earningsError) throw earningsError;
    if (!upcomingEarnings || upcomingEarnings.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No upcoming earnings found for these symbols' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[PREDICT] Generating predictions for ${upcomingEarnings.length} earnings`);

    const predictions = [];

    for (const earnings of upcomingEarnings) {
      // Gather signals for prediction
      const signals = await gatherSignals(supabase, earnings.symbol);
      
      // Generate prediction
      const prediction = await generateRuleBasedPrediction(earnings, signals);

      // Store prediction using service role for insert
      const serviceSupabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const { data: savedPrediction, error: saveError } = await serviceSupabase
        .from('earnings_predictions')
        .upsert({
          earnings_calendar_id: earnings.id,
          symbol: earnings.symbol,
          report_date: earnings.report_date,
          predicted_outcome: prediction.outcome,
          confidence_score: prediction.confidence,
          signals: prediction.signals,
          model_version: prediction.modelVersion,
          user_id: userId,
        }, {
          onConflict: 'earnings_calendar_id,user_id',
        })
        .select()
        .single();

      if (saveError) {
        console.error('[PREDICT] Error saving prediction:', saveError);
      } else {
        predictions.push(savedPrediction);
      }
    }

    console.log(`[PREDICT] Generated ${predictions.length} predictions`);

    return new Response(
      JSON.stringify({ success: true, predictions }),
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

async function gatherSignals(supabase: any, symbol: string): Promise<Signal[]> {
  const signals: Signal[] = [];

  // 1. Historical earnings surprise pattern
  const { data: history } = await supabase
    .from('earnings_history')
    .select('eps_surprise_pct')
    .eq('symbol', symbol)
    .order('report_date', { ascending: false })
    .limit(8);

  if (history && history.length > 0) {
    const avgSurprise = history.reduce((sum: number, h: any) => sum + (h.eps_surprise_pct || 0), 0) / history.length;
    const beatRate = history.filter((h: any) => (h.eps_surprise_pct || 0) > 0).length / history.length;
    
    signals.push({
      type: 'historical_beat_rate',
      value: beatRate,
      weight: 0.35,
      description: `${(beatRate * 100).toFixed(0)}% beat rate over last ${history.length} quarters`,
    });

    signals.push({
      type: 'avg_surprise',
      value: avgSurprise / 100, // Normalize
      weight: 0.25,
      description: `Average surprise: ${avgSurprise.toFixed(2)}%`,
    });
  } else {
    // Default signals when no history
    signals.push({
      type: 'historical_beat_rate',
      value: 0.5, // Assume 50% if no data
      weight: 0.35,
      description: 'No historical data - using baseline',
    });
  }

  // 2. Check price momentum from market_daily_bars
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const { data: priceData } = await supabase
    .from('market_daily_bars')
    .select('close_price')
    .eq('ticker', symbol)
    .gte('bar_date', thirtyDaysAgo.toISOString().split('T')[0])
    .order('bar_date', { ascending: false })
    .limit(30);

  if (priceData && priceData.length >= 5) {
    const recent = priceData[0].close_price;
    const older = priceData[priceData.length - 1].close_price;
    const momentum = (recent - older) / older;
    
    signals.push({
      type: 'price_momentum',
      value: Math.max(-1, Math.min(1, momentum)), // Clamp to [-1, 1]
      weight: 0.20,
      description: `30-day momentum: ${(momentum * 100).toFixed(2)}%`,
    });
  } else {
    signals.push({
      type: 'price_momentum',
      value: 0,
      weight: 0.20,
      description: 'Insufficient price data',
    });
  }

  // 3. Analyst count as quality signal
  const { data: earnings } = await supabase
    .from('earnings_calendar')
    .select('analyst_count')
    .eq('symbol', symbol)
    .order('report_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (earnings?.analyst_count) {
    const analystScore = Math.min(earnings.analyst_count / 20, 1); // Normalize: 20+ analysts = 1.0
    signals.push({
      type: 'analyst_coverage',
      value: analystScore,
      weight: 0.10,
      description: `${earnings.analyst_count} analysts covering`,
    });
  }

  return signals;
}

function generateRuleBasedPrediction(
  earnings: any,
  signals: Signal[]
): { outcome: string; confidence: number; signals: any; modelVersion: string } {
  // Calculate weighted score
  let totalWeight = 0;
  let weightedSum = 0;
  
  signals.forEach(signal => {
    weightedSum += signal.value * signal.weight;
    totalWeight += signal.weight;
  });

  const normalizedScore = totalWeight > 0 ? weightedSum / totalWeight : 0.5;
  
  // Map score to prediction
  // Score > 0.55 = beat, < 0.45 = miss, otherwise inline
  let outcome = 'inline';
  if (normalizedScore > 0.55) outcome = 'beat';
  else if (normalizedScore < 0.45) outcome = 'miss';

  // Confidence based on how far from 0.5 (neutral)
  const confidence = Math.min(0.95, Math.abs(normalizedScore - 0.5) * 2 + 0.3);

  return {
    outcome,
    confidence: Math.round(confidence * 100) / 100,
    signals: signals.reduce((acc, s) => {
      acc[s.type] = { value: s.value, weight: s.weight, description: s.description };
      return acc;
    }, {} as Record<string, any>),
    modelVersion: 'rule-based-v1',
  };
}
