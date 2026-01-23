import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PriceBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    const { ticker, studyId } = await req.json();
    
    if (!ticker || !studyId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Ticker and studyId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[run-single-study] Running ${studyId} for ${ticker}`);

    // Fetch historical data from Polygon
    const bars = await fetchPolygonBars(ticker);
    if (!bars || bars.length < 50) {
      return new Response(
        JSON.stringify({ success: false, error: 'Insufficient historical data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Run the requested study
    const result = runStudy(studyId, bars);
    const executionTime = Date.now() - startTime;

    console.log(`[run-single-study] Completed ${studyId} in ${executionTime}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        ticker,
        studyId,
        result,
        meta: {
          executionTimeMs: executionTime,
          tier: 'MANUAL',
          barsAnalyzed: bars.length
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[run-single-study] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function fetchPolygonBars(ticker: string): Promise<PriceBar[] | null> {
  const apiKey = Deno.env.get('VITE_POLYGON_API_KEY');
  if (!apiKey) {
    console.error('POLYGON_API_KEY not configured');
    return null;
  }

  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  try {
    const url = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/1/day/${startDate}/${endDate}?adjusted=true&sort=asc&limit=50000&apiKey=${apiKey}`;
    const response = await fetch(url);
    
    if (!response.ok) return null;
    
    const data = await response.json();
    if (!data.results || data.results.length === 0) return null;
    
    return data.results.map((r: any) => ({
      date: new Date(r.t).toISOString().split('T')[0],
      open: r.o,
      high: r.h,
      low: r.l,
      close: r.c,
      volume: r.v
    }));
  } catch {
    return null;
  }
}

function runStudy(studyId: string, bars: PriceBar[]): any {
  switch (studyId) {
    // Tier 2 (Manual) studies
    case 'day_of_week_returns': return studyDayOfWeek(bars);
    case 'month_of_year_returns': return studyMonthOfYear(bars);
    case 'macd_analysis': return studyMACD(bars);
    case 'stochastic_analysis': return studyStochastic(bars);
    case 'daily_return_distribution': return studyReturnDistribution(bars);
    case 'drawdown_analysis': return studyDrawdown(bars);
    case 'mean_reversion': return studyMeanReversion(bars);
    case 'range_analysis': return studyRange(bars);
    case 'high_low_analysis': return studyHighLow(bars);
    case 'volume_analysis': return studyVolume(bars);
    case 'volume_price_correlation': return studyVolumePriceCorrelation(bars);
    case 'price_targets': return studyPriceTargets(bars);
    case 'probability_distribution': return studyProbabilityDistribution(bars);
    case 'support_resistance': return studySupportResistance(bars);
    case 'earnings_impact': return studyEarningsImpact(bars);
    case 'sector_correlation': return { message: 'Requires sector data' };
    case 'spy_correlation': return studySPYCorrelation(bars);
    default: return { error: `Unknown study: ${studyId}` };
  }
}

function studyDayOfWeek(bars: PriceBar[]): any {
  const dayStats: Record<number, { wins: number; total: number; returns: number[] }> = {};
  
  for (let i = 1; i < bars.length; i++) {
    const dayOfWeek = new Date(bars[i].date).getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue; // Skip weekends
    
    if (!dayStats[dayOfWeek]) {
      dayStats[dayOfWeek] = { wins: 0, total: 0, returns: [] };
    }
    
    const dailyReturn = (bars[i].close - bars[i - 1].close) / bars[i - 1].close * 100;
    dayStats[dayOfWeek].total++;
    dayStats[dayOfWeek].returns.push(dailyReturn);
    if (dailyReturn > 0) dayStats[dayOfWeek].wins++;
  }
  
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  return {
    analysis: Object.entries(dayStats).map(([day, stats]) => ({
      dayOfWeek: parseInt(day),
      dayName: dayNames[parseInt(day)],
      winRate: Math.round(stats.wins / stats.total * 100),
      avgReturn: Math.round(stats.returns.reduce((a, b) => a + b, 0) / stats.returns.length * 100) / 100,
      occurrences: stats.total
    })).sort((a, b) => b.winRate - a.winRate)
  };
}

function studyMonthOfYear(bars: PriceBar[]): any {
  const monthStats: Record<number, { wins: number; total: number; returns: number[] }> = {};
  
  for (let i = 1; i < bars.length; i++) {
    const month = new Date(bars[i].date).getMonth();
    
    if (!monthStats[month]) {
      monthStats[month] = { wins: 0, total: 0, returns: [] };
    }
    
    const dailyReturn = (bars[i].close - bars[i - 1].close) / bars[i - 1].close * 100;
    monthStats[month].total++;
    monthStats[month].returns.push(dailyReturn);
    if (dailyReturn > 0) monthStats[month].wins++;
  }
  
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
  
  return {
    analysis: Object.entries(monthStats).map(([month, stats]) => ({
      month: parseInt(month) + 1,
      monthName: monthNames[parseInt(month)],
      winRate: Math.round(stats.wins / stats.total * 100),
      avgReturn: Math.round(stats.returns.reduce((a, b) => a + b, 0) / stats.returns.length * 100) / 100,
      occurrences: stats.total
    })).sort((a, b) => b.avgReturn - a.avgReturn)
  };
}

function studyMACD(bars: PriceBar[]): any {
  const ema12 = calculateEMA(bars.map(b => b.close), 12);
  const ema26 = calculateEMA(bars.map(b => b.close), 26);
  
  const macdLine = ema12.map((v, i) => v - ema26[i]);
  const signalLine = calculateEMA(macdLine, 9);
  const histogram = macdLine.map((v, i) => v - signalLine[i]);
  
  const current = histogram[histogram.length - 1];
  const previous = histogram[histogram.length - 2];
  
  // Historical signal analysis
  let bullishSignals = 0, bullishWins = 0;
  let bearishSignals = 0, bearishWins = 0;
  
  for (let i = 1; i < histogram.length - 5; i++) {
    if (histogram[i - 1] < 0 && histogram[i] > 0) {
      bullishSignals++;
      if (bars[i + 5].close > bars[i].close) bullishWins++;
    }
    if (histogram[i - 1] > 0 && histogram[i] < 0) {
      bearishSignals++;
      if (bars[i + 5].close < bars[i].close) bearishWins++;
    }
  }
  
  return {
    macd: Math.round(macdLine[macdLine.length - 1] * 100) / 100,
    signal: Math.round(signalLine[signalLine.length - 1] * 100) / 100,
    histogram: Math.round(current * 100) / 100,
    trend: current > 0 ? 'bullish' : 'bearish',
    momentum: current > previous ? 'increasing' : 'decreasing',
    bullishCrossoverWinRate: bullishSignals > 0 ? Math.round(bullishWins / bullishSignals * 100) : null,
    bearishCrossoverWinRate: bearishSignals > 0 ? Math.round(bearishWins / bearishSignals * 100) : null
  };
}

function studyStochastic(bars: PriceBar[], period = 14): any {
  if (bars.length < period) return { error: 'Insufficient data' };
  
  const stochK: number[] = [];
  
  for (let i = period - 1; i < bars.length; i++) {
    const slice = bars.slice(i - period + 1, i + 1);
    const high = Math.max(...slice.map(b => b.high));
    const low = Math.min(...slice.map(b => b.low));
    const close = bars[i].close;
    
    stochK.push(high !== low ? ((close - low) / (high - low)) * 100 : 50);
  }
  
  const stochD = calculateSMA(stochK, 3);
  
  const currentK = stochK[stochK.length - 1];
  const currentD = stochD[stochD.length - 1];
  
  return {
    k: Math.round(currentK),
    d: Math.round(currentD),
    signal: currentK < 20 ? 'oversold' : currentK > 80 ? 'overbought' : 'neutral',
    crossover: currentK > currentD ? 'bullish' : 'bearish'
  };
}

function studyReturnDistribution(bars: PriceBar[]): any {
  const returns: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    returns.push((bars[i].close - bars[i - 1].close) / bars[i - 1].close * 100);
  }
  
  returns.sort((a, b) => a - b);
  
  const percentiles: Record<string, number> = {
    p5: returns[Math.floor(returns.length * 0.05)],
    p25: returns[Math.floor(returns.length * 0.25)],
    p50: returns[Math.floor(returns.length * 0.5)],
    p75: returns[Math.floor(returns.length * 0.75)],
    p95: returns[Math.floor(returns.length * 0.95)]
  };
  
  return {
    mean: Math.round(returns.reduce((a, b) => a + b, 0) / returns.length * 100) / 100,
    median: Math.round(percentiles.p50 * 100) / 100,
    percentiles: Object.fromEntries(Object.entries(percentiles).map(([k, v]) => [k, Math.round(v * 100) / 100])),
    positiveReturns: Math.round(returns.filter(r => r > 0).length / returns.length * 100),
    totalDays: returns.length
  };
}

function studyDrawdown(bars: PriceBar[]): any {
  let peak = bars[0].close;
  let maxDrawdown = 0;
  let currentDrawdown = 0;
  const drawdowns: { start: string; end: string; depth: number }[] = [];
  let drawdownStart: string | null = null;
  
  for (const bar of bars) {
    if (bar.close > peak) {
      if (drawdownStart && currentDrawdown > 5) {
        drawdowns.push({
          start: drawdownStart,
          end: bar.date,
          depth: Math.round(currentDrawdown * 100) / 100
        });
      }
      peak = bar.close;
      currentDrawdown = 0;
      drawdownStart = null;
    } else {
      const dd = (peak - bar.close) / peak * 100;
      if (dd > currentDrawdown) {
        currentDrawdown = dd;
        if (!drawdownStart) drawdownStart = bar.date;
      }
      if (dd > maxDrawdown) maxDrawdown = dd;
    }
  }
  
  return {
    maxDrawdown: Math.round(maxDrawdown * 100) / 100,
    currentDrawdown: Math.round(currentDrawdown * 100) / 100,
    significantDrawdowns: drawdowns.slice(-5),
    avgRecoveryDays: drawdowns.length > 0 
      ? Math.round(drawdowns.reduce((sum, d) => {
          const startIdx = bars.findIndex(b => b.date === d.start);
          const endIdx = bars.findIndex(b => b.date === d.end);
          return sum + (endIdx - startIdx);
        }, 0) / drawdowns.length)
      : null
  };
}

function studyMeanReversion(bars: PriceBar[]): any {
  const ma20 = calculateSMA(bars.map(b => b.close), 20);
  const current = bars[bars.length - 1].close;
  const currentMa = ma20[ma20.length - 1];
  
  const deviation = (current - currentMa) / currentMa * 100;
  
  // Analyze historical mean reversion
  let reversionEvents = 0, reversionWins = 0;
  
  for (let i = 20; i < bars.length - 10; i++) {
    const localMa = ma20[i];
    const localDev = (bars[i].close - localMa) / localMa * 100;
    
    if (Math.abs(localDev) > 5) {
      reversionEvents++;
      const futureReturn = (bars[i + 10].close - bars[i].close) / bars[i].close * 100;
      if ((localDev > 0 && futureReturn < 0) || (localDev < 0 && futureReturn > 0)) {
        reversionWins++;
      }
    }
  }
  
  return {
    currentDeviation: Math.round(deviation * 100) / 100,
    signal: deviation > 5 ? 'extended_high' : deviation < -5 ? 'extended_low' : 'near_mean',
    meanReversionRate: reversionEvents > 0 ? Math.round(reversionWins / reversionEvents * 100) : null,
    historicalEvents: reversionEvents
  };
}

function studyRange(bars: PriceBar[]): any {
  const ranges = bars.map(b => (b.high - b.low) / b.low * 100);
  const avgRange = ranges.reduce((a, b) => a + b, 0) / ranges.length;
  const recent5Range = ranges.slice(-5).reduce((a, b) => a + b, 0) / 5;
  
  return {
    avgDailyRange: Math.round(avgRange * 100) / 100,
    recent5DayAvgRange: Math.round(recent5Range * 100) / 100,
    rangeExpansion: recent5Range > avgRange * 1.5,
    rangeContraction: recent5Range < avgRange * 0.5
  };
}

function studyHighLow(bars: PriceBar[], lookback = 52): any {
  const recentBars = bars.slice(-lookback * 5); // Approximate trading days in lookback weeks
  const high52 = Math.max(...recentBars.map(b => b.high));
  const low52 = Math.min(...recentBars.map(b => b.low));
  const current = bars[bars.length - 1].close;
  
  return {
    high52Week: Math.round(high52 * 100) / 100,
    low52Week: Math.round(low52 * 100) / 100,
    currentPrice: Math.round(current * 100) / 100,
    percentFromHigh: Math.round((current - high52) / high52 * 10000) / 100,
    percentFromLow: Math.round((current - low52) / low52 * 10000) / 100,
    rangePosition: Math.round((current - low52) / (high52 - low52) * 100)
  };
}

function studyVolume(bars: PriceBar[]): any {
  const volumes = bars.map(b => b.volume);
  const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
  const recent5Volume = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;
  const currentVolume = volumes[volumes.length - 1];
  
  return {
    avgDailyVolume: Math.round(avgVolume),
    recent5DayAvg: Math.round(recent5Volume),
    currentVolume: Math.round(currentVolume),
    volumeRatio: Math.round(currentVolume / avgVolume * 100) / 100,
    signal: currentVolume > avgVolume * 2 ? 'high_volume' : currentVolume < avgVolume * 0.5 ? 'low_volume' : 'normal'
  };
}

function studyVolumePriceCorrelation(bars: PriceBar[]): any {
  let upDayVolume = 0, upDayCount = 0;
  let downDayVolume = 0, downDayCount = 0;
  
  for (let i = 1; i < bars.length; i++) {
    const isUp = bars[i].close > bars[i - 1].close;
    if (isUp) {
      upDayVolume += bars[i].volume;
      upDayCount++;
    } else {
      downDayVolume += bars[i].volume;
      downDayCount++;
    }
  }
  
  const avgUpVolume = upDayCount > 0 ? upDayVolume / upDayCount : 0;
  const avgDownVolume = downDayCount > 0 ? downDayVolume / downDayCount : 0;
  
  return {
    avgUpDayVolume: Math.round(avgUpVolume),
    avgDownDayVolume: Math.round(avgDownVolume),
    volumeRatio: avgDownVolume > 0 ? Math.round(avgUpVolume / avgDownVolume * 100) / 100 : null,
    signal: avgUpVolume > avgDownVolume * 1.2 ? 'accumulation' : avgDownVolume > avgUpVolume * 1.2 ? 'distribution' : 'neutral'
  };
}

function studyPriceTargets(bars: PriceBar[]): any {
  const returns: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    returns.push((bars[i].close - bars[i - 1].close) / bars[i - 1].close);
  }
  
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const stdDev = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length);
  const current = bars[bars.length - 1].close;
  
  return {
    currentPrice: Math.round(current * 100) / 100,
    targets: {
      bearish1Std: Math.round(current * (1 - stdDev * 20) * 100) / 100,
      bearish2Std: Math.round(current * (1 - stdDev * 40) * 100) / 100,
      bullish1Std: Math.round(current * (1 + stdDev * 20) * 100) / 100,
      bullish2Std: Math.round(current * (1 + stdDev * 40) * 100) / 100
    },
    expectedMove20Day: Math.round(stdDev * 20 * Math.sqrt(20) * 10000) / 100
  };
}

function studyProbabilityDistribution(bars: PriceBar[]): any {
  const horizons = [1, 5, 10, 21];
  const results: Record<number, any> = {};
  
  for (const days of horizons) {
    const returns: number[] = [];
    for (let i = 0; i < bars.length - days; i++) {
      returns.push((bars[i + days].close - bars[i].close) / bars[i].close * 100);
    }
    
    returns.sort((a, b) => a - b);
    
    results[days] = {
      winRate: Math.round(returns.filter(r => r > 0).length / returns.length * 100),
      avgReturn: Math.round(returns.reduce((a, b) => a + b, 0) / returns.length * 100) / 100,
      p10: Math.round(returns[Math.floor(returns.length * 0.1)] * 100) / 100,
      p50: Math.round(returns[Math.floor(returns.length * 0.5)] * 100) / 100,
      p90: Math.round(returns[Math.floor(returns.length * 0.9)] * 100) / 100
    };
  }
  
  return { horizons: results };
}

function studySupportResistance(bars: PriceBar[]): any {
  const recent60 = bars.slice(-60);
  const prices = recent60.flatMap(b => [b.high, b.low, b.close]);
  
  // Simple pivot point detection
  const pivots: number[] = [];
  for (let i = 2; i < recent60.length - 2; i++) {
    const isHigh = recent60[i].high > recent60[i - 1].high && 
                   recent60[i].high > recent60[i - 2].high &&
                   recent60[i].high > recent60[i + 1].high && 
                   recent60[i].high > recent60[i + 2].high;
    const isLow = recent60[i].low < recent60[i - 1].low && 
                  recent60[i].low < recent60[i - 2].low &&
                  recent60[i].low < recent60[i + 1].low && 
                  recent60[i].low < recent60[i + 2].low;
    
    if (isHigh) pivots.push(recent60[i].high);
    if (isLow) pivots.push(recent60[i].low);
  }
  
  const current = bars[bars.length - 1].close;
  const support = pivots.filter(p => p < current).sort((a, b) => b - a).slice(0, 3);
  const resistance = pivots.filter(p => p > current).sort((a, b) => a - b).slice(0, 3);
  
  return {
    currentPrice: Math.round(current * 100) / 100,
    nearestSupport: support[0] ? Math.round(support[0] * 100) / 100 : null,
    nearestResistance: resistance[0] ? Math.round(resistance[0] * 100) / 100 : null,
    supportLevels: support.map(s => Math.round(s * 100) / 100),
    resistanceLevels: resistance.map(r => Math.round(r * 100) / 100)
  };
}

function studyEarningsImpact(bars: PriceBar[]): any {
  // Simplified - looks for large gap days which often indicate earnings
  const largeMoves: { date: string; move: number }[] = [];
  
  for (let i = 1; i < bars.length; i++) {
    const gap = (bars[i].open - bars[i - 1].close) / bars[i - 1].close * 100;
    if (Math.abs(gap) > 3) {
      largeMoves.push({ date: bars[i].date, move: Math.round(gap * 100) / 100 });
    }
  }
  
  const positiveGaps = largeMoves.filter(m => m.move > 0);
  const negativeGaps = largeMoves.filter(m => m.move < 0);
  
  return {
    largeGapEvents: largeMoves.length,
    avgPositiveGap: positiveGaps.length > 0 
      ? Math.round(positiveGaps.reduce((a, b) => a + b.move, 0) / positiveGaps.length * 100) / 100 
      : null,
    avgNegativeGap: negativeGaps.length > 0 
      ? Math.round(negativeGaps.reduce((a, b) => a + b.move, 0) / negativeGaps.length * 100) / 100 
      : null,
    recentLargeMoves: largeMoves.slice(-5)
  };
}

function studySPYCorrelation(bars: PriceBar[]): any {
  // Note: This would need SPY data to properly calculate
  // For now, return placeholder
  return {
    message: 'SPY correlation requires benchmark data integration',
    note: 'Consider using the full run-asset-study function with benchmark parameter'
  };
}

// Helper functions
function calculateEMA(data: number[], period: number): number[] {
  const multiplier = 2 / (period + 1);
  const ema: number[] = [data[0]];
  
  for (let i = 1; i < data.length; i++) {
    ema.push((data[i] - ema[i - 1]) * multiplier + ema[i - 1]);
  }
  
  return ema;
}

function calculateSMA(data: number[], period: number): number[] {
  const sma: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      sma.push(data[i]);
    } else {
      const slice = data.slice(i - period + 1, i + 1);
      sma.push(slice.reduce((a, b) => a + b, 0) / period);
    }
  }
  return sma;
}
