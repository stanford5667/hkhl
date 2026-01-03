import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface RegimeSignal {
  date: string;
  turbulenceIndex: number;
  regime: 'low_vol' | 'normal' | 'high_vol' | 'crisis';
  volatility: number;
}

// Calculate covariance matrix
function calculateCovMatrix(returnsMatrix: number[][]): number[][] {
  const n = returnsMatrix[0]?.length || 0;
  const numDays = returnsMatrix.length;
  if (n === 0 || numDays < 2) return [];

  const means = Array(n).fill(0);
  for (const day of returnsMatrix) {
    for (let i = 0; i < n; i++) means[i] += day[i] / numDays;
  }

  const cov: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
  for (const day of returnsMatrix) {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        cov[i][j] += (day[i] - means[i]) * (day[j] - means[j]) / (numDays - 1);
      }
    }
  }
  return cov;
}

// Matrix inversion (Gauss-Jordan)
function invertMatrix(matrix: number[][]): number[][] {
  const n = matrix.length;
  const aug = matrix.map((row, i) => [...row, ...Array(n).fill(0).map((_, j) => i === j ? 1 : 0)]);

  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) maxRow = k;
    }
    [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]];

    const pivot = aug[i][i];
    if (Math.abs(pivot) < 1e-10) {
      return matrix.map((_, i) => Array(n).fill(0).map((_, j) => i === j ? 1 : 0));
    }

    for (let j = 0; j < 2 * n; j++) aug[i][j] /= pivot;
    for (let k = 0; k < n; k++) {
      if (k !== i) {
        const factor = aug[k][i];
        for (let j = 0; j < 2 * n; j++) aug[k][j] -= factor * aug[i][j];
      }
    }
  }
  return aug.map(row => row.slice(n));
}

// Mahalanobis distance (Turbulence Index)
function mahalanobisDistance(returns: number[], covInverse: number[][], means: number[]): number {
  const diff = returns.map((r, i) => r - means[i]);
  let sum = 0;
  for (let i = 0; i < diff.length; i++) {
    for (let j = 0; j < diff.length; j++) {
      sum += diff[i] * covInverse[i][j] * diff[j];
    }
  }
  return Math.sqrt(Math.max(0, sum));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tickers, lookbackDays = 60 } = await req.json();

    if (!tickers || !Array.isArray(tickers) || tickers.length < 3) {
      return new Response(
        JSON.stringify({ success: false, error: 'Need at least 3 tickers for regime detection' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const normalizedTickers = tickers.map((t: string) => t.toUpperCase().trim());

    // Get last 120 days of data from cache
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 150 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    console.log(`[detect-regime] Analyzing ${normalizedTickers.length} tickers`);

    // Fetch from stock_price_cache (your existing table!)
    const priceData: Map<string, Map<string, number>> = new Map();

    for (const ticker of normalizedTickers) {
      const { data, error } = await supabase
        .from('stock_price_cache')
        .select('trade_date, close_price')
        .eq('ticker', ticker)
        .gte('trade_date', startDate)
        .lte('trade_date', endDate)
        .order('trade_date', { ascending: true });

      if (error) {
        console.error(`[detect-regime] Error fetching ${ticker}:`, error);
        continue;
      }

      if (data && data.length > 0) {
        const priceMap = new Map<string, number>();
        data.forEach(row => priceMap.set(row.trade_date, row.close_price));
        priceData.set(ticker, priceMap);
        console.log(`[detect-regime] ${ticker}: ${data.length} days loaded from cache`);
      }
    }

    if (priceData.size < 3) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Insufficient cached data. Run a backtest first to populate the cache.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Find common dates across all tickers
    const allDates = new Set<string>();
    priceData.forEach(data => data.forEach((_, date) => allDates.add(date)));
    const commonDates = Array.from(allDates)
      .filter(date => Array.from(priceData.keys()).every(t => priceData.get(t)?.has(date)))
      .sort();

    console.log(`[detect-regime] Found ${commonDates.length} common trading days`);

    if (commonDates.length < lookbackDays + 10) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Need at least ${lookbackDays + 10} common trading days. Found: ${commonDates.length}` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Build returns matrix
    const activeSymbols = Array.from(priceData.keys());
    const returnsMatrix: number[][] = [];

    for (let i = 1; i < commonDates.length; i++) {
      const dayReturns: number[] = [];
      for (const symbol of activeSymbols) {
        const prevPrice = priceData.get(symbol)?.get(commonDates[i - 1]) || 0;
        const currPrice = priceData.get(symbol)?.get(commonDates[i]) || 0;
        dayReturns.push(prevPrice > 0 ? Math.log(currPrice / prevPrice) : 0);
      }
      returnsMatrix.push(dayReturns);
    }

    // Calculate regime signals for last 30 days
    const signals: RegimeSignal[] = [];

    for (let i = Math.max(lookbackDays, returnsMatrix.length - 30); i < returnsMatrix.length; i++) {
      const window = returnsMatrix.slice(i - lookbackDays, i);
      const currentReturns = returnsMatrix[i];

      // Lookback means
      const means = Array(activeSymbols.length).fill(0);
      for (const day of window) {
        for (let j = 0; j < activeSymbols.length; j++) {
          means[j] += day[j] / lookbackDays;
        }
      }

      const covMatrix = calculateCovMatrix(window);
      const covInverse = invertMatrix(covMatrix);
      const turbulence = mahalanobisDistance(currentReturns, covInverse, means);

      // Realized volatility
      const portfolioReturns = window.map(day => day.reduce((a, b) => a + b, 0) / day.length);
      const avgRet = portfolioReturns.reduce((a, b) => a + b, 0) / portfolioReturns.length;
      const variance = portfolioReturns.reduce((sum, r) => sum + Math.pow(r - avgRet, 2), 0) / portfolioReturns.length;
      const volatility = Math.sqrt(variance) * Math.sqrt(252) * 100;

      // Classify regime
      let regime: RegimeSignal['regime'];
      if (turbulence > 25) regime = 'crisis';
      else if (turbulence > 15) regime = 'high_vol';
      else if (turbulence > 8) regime = 'normal';
      else regime = 'low_vol';

      signals.push({
        date: commonDates[i + 1] || commonDates[i],
        turbulenceIndex: parseFloat(turbulence.toFixed(2)),
        regime,
        volatility: parseFloat(volatility.toFixed(2)),
      });
    }

    const currentRegime = signals[signals.length - 1];
    console.log(`[detect-regime] Current: ${currentRegime?.regime}, Turbulence: ${currentRegime?.turbulenceIndex}`);

    return new Response(
      JSON.stringify({
        success: true,
        currentRegime,
        signals,
        summary: {
          assetsAnalyzed: activeSymbols.length,
          assets: activeSymbols,
          tradingDays: commonDates.length,
          lookbackDays,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[detect-regime] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
