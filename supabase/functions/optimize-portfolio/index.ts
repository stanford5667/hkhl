import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Asset classification for regime adjustment
const DEFENSIVE_ASSETS = ['GLD', 'IAU', 'TLT', 'TIP', 'VNQ', 'XLRE', 'DBC', 'SCHP', 'BND', 'AGG'];
const GROWTH_ASSETS = ['QQQ', 'XLK', 'VGT', 'IGV', 'ARKK', 'SMH', 'SOXX', 'XLY'];

function calculateCorrelation(returns1: number[], returns2: number[]): number {
  const n = Math.min(returns1.length, returns2.length);
  if (n < 20) return 0;

  const mean1 = returns1.slice(0, n).reduce((a, b) => a + b, 0) / n;
  const mean2 = returns2.slice(0, n).reduce((a, b) => a + b, 0) / n;

  let cov = 0, var1 = 0, var2 = 0;
  for (let i = 0; i < n; i++) {
    cov += (returns1[i] - mean1) * (returns2[i] - mean2);
    var1 += Math.pow(returns1[i] - mean1, 2);
    var2 += Math.pow(returns2[i] - mean2, 2);
  }

  return var1 > 0 && var2 > 0 ? cov / Math.sqrt(var1 * var2) : 0;
}

function calculateVolatility(returns: number[]): number {
  if (returns.length < 2) return 0.20;
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  return Math.sqrt(variance) * Math.sqrt(252);
}

// HRP: Inverse volatility weighting
function hrpWeights(volatilities: Map<string, number>): Map<string, number> {
  const weights = new Map<string, number>();
  let totalInvVol = 0;

  for (const [ticker, vol] of volatilities) {
    const invVol = 1 / Math.max(vol, 0.05);
    weights.set(ticker, invVol);
    totalInvVol += invVol;
  }

  for (const [ticker, w] of weights) {
    weights.set(ticker, w / totalInvVol);
  }

  return weights;
}

// Adjust weights based on regime
function adjustForRegime(weights: Map<string, number>, regime: string): Map<string, number> {
  const multipliers: Record<string, { growth: number; defensive: number }> = {
    'low_vol': { growth: 1.25, defensive: 0.75 },
    'normal': { growth: 1.0, defensive: 1.0 },
    'high_vol': { growth: 0.6, defensive: 1.4 },
    'crisis': { growth: 0.35, defensive: 1.65 },
  };

  const mult = multipliers[regime] || multipliers['normal'];
  const adjusted = new Map<string, number>();
  let total = 0;

  for (const [ticker, weight] of weights) {
    const isDefensive = DEFENSIVE_ASSETS.includes(ticker);
    const isGrowth = GROWTH_ASSETS.includes(ticker);

    let m = 1;
    if (isDefensive) m = mult.defensive;
    else if (isGrowth) m = mult.growth;

    const newWeight = weight * m;
    adjusted.set(ticker, newWeight);
    total += newWeight;
  }

  // Normalize to 100%
  for (const [ticker, w] of adjusted) {
    adjusted.set(ticker, w / total);
  }

  return adjusted;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tickers, regime = 'normal' } = await req.json();

    if (!tickers || !Array.isArray(tickers) || tickers.length < 2) {
      return new Response(
        JSON.stringify({ success: false, error: 'Need at least 2 tickers' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const normalizedTickers = tickers.map((t: string) => t.toUpperCase().trim());

    // Fetch last 252 trading days from cache
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    console.log(`[optimize-portfolio] Optimizing ${normalizedTickers.length} tickers, regime: ${regime}`);

    // Fetch from stock_price_cache
    const priceData: Map<string, number[]> = new Map();
    const dateMap: Map<string, Map<string, number>> = new Map();

    for (const ticker of normalizedTickers) {
      const { data, error } = await supabase
        .from('stock_price_cache')
        .select('trade_date, close_price')
        .eq('ticker', ticker)
        .gte('trade_date', startDate)
        .lte('trade_date', endDate)
        .order('trade_date', { ascending: true });

      if (error || !data || data.length < 50) {
        console.warn(`[optimize-portfolio] Insufficient data for ${ticker}: ${data?.length || 0} rows`);
        continue;
      }

      const prices: number[] = [];
      const tickerDates = new Map<string, number>();
      
      data.forEach(d => {
        prices.push(d.close_price);
        tickerDates.set(d.trade_date, d.close_price);
      });
      
      priceData.set(ticker, prices);
      dateMap.set(ticker, tickerDates);
      console.log(`[optimize-portfolio] ${ticker}: ${data.length} days loaded`);
    }

    if (priceData.size < 2) {
      return new Response(
        JSON.stringify({ success: false, error: 'Insufficient cached data. Run a backtest first.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const activeTickers = Array.from(priceData.keys());

    // Calculate returns and volatilities
    const returnsMap: Map<string, number[]> = new Map();
    const volatilities: Map<string, number> = new Map();

    for (const ticker of activeTickers) {
      const prices = priceData.get(ticker)!;
      const returns: number[] = [];
      for (let i = 1; i < prices.length; i++) {
        if (prices[i - 1] > 0) {
          returns.push(Math.log(prices[i] / prices[i - 1]));
        }
      }
      returnsMap.set(ticker, returns);
      volatilities.set(ticker, calculateVolatility(returns));
    }

    // Calculate correlation matrix
    const correlationMatrix: Record<string, Record<string, number>> = {};
    for (const t1 of activeTickers) {
      correlationMatrix[t1] = {};
      for (const t2 of activeTickers) {
        if (t1 === t2) {
          correlationMatrix[t1][t2] = 1;
        } else {
          const corr = calculateCorrelation(returnsMap.get(t1)!, returnsMap.get(t2)!);
          correlationMatrix[t1][t2] = parseFloat(corr.toFixed(3));
        }
      }
    }

    // Calculate HRP weights
    let weights = hrpWeights(volatilities);

    // Adjust for regime
    weights = adjustForRegime(weights, regime);

    // Convert to percentage object
    const weightsObj: Record<string, number> = {};
    for (const [ticker, w] of weights) {
      weightsObj[ticker] = parseFloat((w * 100).toFixed(2));
    }

    // Calculate expected portfolio volatility
    let portVol = 0;
    for (const t1 of activeTickers) {
      for (const t2 of activeTickers) {
        const w1 = weights.get(t1) || 0;
        const w2 = weights.get(t2) || 0;
        const v1 = volatilities.get(t1) || 0.2;
        const v2 = volatilities.get(t2) || 0.2;
        const corr = correlationMatrix[t1]?.[t2] || 0;
        portVol += w1 * w2 * v1 * v2 * corr;
      }
    }
    portVol = Math.sqrt(Math.max(0, portVol)) * 100;

    // Volatilities as percentages
    const volObj: Record<string, number> = {};
    for (const [ticker, vol] of volatilities) {
      volObj[ticker] = parseFloat((vol * 100).toFixed(2));
    }

    console.log(`[optimize-portfolio] Portfolio Vol: ${portVol.toFixed(2)}%`);

    return new Response(
      JSON.stringify({
        success: true,
        weights: weightsObj,
        regime,
        expectedVolatility: parseFloat(portVol.toFixed(2)),
        methodology: 'HRP (Inverse Volatility) + Regime Adjustment',
        correlationMatrix,
        volatilities: volObj,
        assetsOptimized: activeTickers,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[optimize-portfolio] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
