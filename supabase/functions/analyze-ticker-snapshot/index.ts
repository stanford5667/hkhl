import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Tier 1 AUTO studies - fast execution, high viral value
const AUTO_STUDIES = [
  'rsi_analysis',
  'trend_strength',
  'moving_average_analysis',
  'after_down_x',
  'after_up_x',
  'up_down_streaks',
  'gap_analysis',
  'consecutive_days',
  'daily_close_gt_open',
  'daily_close_gt_prior',
  'volatility_analysis',
  'bollinger_analysis',
  'extreme_days',
  'year_range',
];

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
    const { ticker } = await req.json();
    
    if (!ticker) {
      return new Response(
        JSON.stringify({ success: false, error: 'Ticker is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[analyze-ticker-snapshot] Starting snapshot for ${ticker}`);

    // Fetch historical data from Polygon
    const bars = await fetchPolygonBars(ticker);
    if (!bars || bars.length < 50) {
      return new Response(
        JSON.stringify({ success: false, error: 'Insufficient historical data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Run all Tier 1 studies synchronously (they are CPU-bound, not async)
    const studyResults = AUTO_STUDIES.map(studyId => {
      try {
        const result = runStudyInternal(studyId, bars);
        return { studyId, result, success: true };
      } catch (error) {
        return { studyId, error: error instanceof Error ? error.message : 'Unknown error', success: false };
      }
    });

    

    // Build results object
    const autoStudies: Record<string, any> = {};
    let successCount = 0;
    
    for (const { studyId, result, success } of studyResults) {
      if (success) {
        autoStudies[studyId] = result;
        successCount++;
      }
    }

    const currentPrice = bars[bars.length - 1].close;
    const dailyVolatility = calculateDailyVolatility(bars);
    const executionTime = Date.now() - startTime;

    console.log(`[analyze-ticker-snapshot] Completed ${successCount}/${AUTO_STUDIES.length} studies in ${executionTime}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        ticker,
        currentPrice,
        dailyVolatility,
        autoStudies,
        meta: {
          studiesRun: AUTO_STUDIES.length,
          studiesSucceeded: successCount,
          executionTimeMs: executionTime,
          tier: 'AUTO'
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[analyze-ticker-snapshot] Error:', error);
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
    
    if (!response.ok) {
      console.error(`Polygon API error: ${response.status}`);
      return null;
    }
    
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
  } catch (error) {
    console.error('Error fetching Polygon data:', error);
    return null;
  }
}

function calculateDailyVolatility(bars: PriceBar[]): number {
  if (bars.length < 20) return 0;
  
  const returns = [];
  for (let i = 1; i < bars.length; i++) {
    returns.push((bars[i].close - bars[i - 1].close) / bars[i - 1].close * 100);
  }
  
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  
  return Math.sqrt(variance);
}

// ============================================================
// STUDY IMPLEMENTATIONS (Simplified for speed)
// ============================================================

function runStudyInternal(studyId: string, bars: PriceBar[]): any {
  switch (studyId) {
    case 'rsi_analysis': return studyRSI(bars);
    case 'trend_strength': return studyTrendStrength(bars);
    case 'moving_average_analysis': return studyMovingAverages(bars);
    case 'after_down_x': return studyAfterMove(bars, 'down');
    case 'after_up_x': return studyAfterMove(bars, 'up');
    case 'up_down_streaks': return studyStreaks(bars);
    case 'gap_analysis': return studyGaps(bars);
    case 'consecutive_days': return studyConsecutiveDays(bars);
    case 'daily_close_gt_open': return studyCloseVsOpen(bars);
    case 'daily_close_gt_prior': return studyCloseVsPrior(bars);
    case 'volatility_analysis': return studyVolatility(bars);
    case 'bollinger_analysis': return studyBollinger(bars);
    case 'extreme_days': return studyExtremeDays(bars);
    case 'year_range': return studyYearRange(bars);
    default: return { error: 'Unknown study' };
  }
}

function studyRSI(bars: PriceBar[], period = 14): any {
  if (bars.length < period + 1) return { error: 'Insufficient data' };
  
  let gains = 0, losses = 0;
  for (let i = bars.length - period; i < bars.length; i++) {
    const change = bars[i].close - bars[i - 1].close;
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }
  
  const avgGain = gains / period;
  const avgLoss = losses / period;
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));
  
  // Historical analysis for oversold/overbought
  const oversoldBounces = analyzeRSIBounces(bars, 30, period);
  const overboughtDrops = analyzeRSIBounces(bars, 70, period, true);
  
  return {
    currentRSI: Math.round(rsi * 100) / 100,
    signal: rsi < 30 ? 'oversold' : rsi > 70 ? 'overbought' : 'neutral',
    oversoldBounces,
    overboughtDrops,
    winRate: rsi < 30 ? oversoldBounces.winRate : rsi > 70 ? overboughtDrops.winRate : null
  };
}

function analyzeRSIBounces(bars: PriceBar[], threshold: number, period: number, isOverbought = false): any {
  let wins = 0, total = 0;
  const gains: number[] = [];
  
  for (let i = period + 1; i < bars.length - 5; i++) {
    // Calculate RSI at this point
    let gains_ = 0, losses_ = 0;
    for (let j = i - period; j < i; j++) {
      const change = bars[j].close - bars[j - 1].close;
      if (change > 0) gains_ += change;
      else losses_ += Math.abs(change);
    }
    const rs = losses_ === 0 ? 100 : gains_ / losses_ / period;
    const rsi = 100 - (100 / (1 + rs));
    
    const triggered = isOverbought ? rsi > threshold : rsi < threshold;
    if (triggered) {
      total++;
      const futureReturn = (bars[i + 5].close - bars[i].close) / bars[i].close * 100;
      gains.push(futureReturn);
      if (isOverbought ? futureReturn < 0 : futureReturn > 0) wins++;
    }
  }
  
  return {
    occurrences: total,
    winRate: total > 0 ? Math.round(wins / total * 100) : 0,
    avgReturn: gains.length > 0 ? Math.round(gains.reduce((a, b) => a + b, 0) / gains.length * 100) / 100 : 0
  };
}

function studyTrendStrength(bars: PriceBar[]): any {
  const ma20 = calculateSMA(bars, 20);
  const ma50 = calculateSMA(bars, 50);
  const ma200 = calculateSMA(bars, 200);
  const current = bars[bars.length - 1].close;
  
  let score = 0;
  if (current > ma20) score += 25;
  if (current > ma50) score += 25;
  if (current > ma200) score += 25;
  if (ma20 > ma50) score += 12.5;
  if (ma50 > ma200) score += 12.5;
  
  return {
    score: Math.round(score),
    trend: score >= 75 ? 'strong_uptrend' : score >= 50 ? 'uptrend' : score >= 25 ? 'neutral' : 'downtrend',
    priceVsMa20: Math.round((current / ma20 - 1) * 10000) / 100,
    priceVsMa50: Math.round((current / ma50 - 1) * 10000) / 100,
    priceVsMa200: ma200 ? Math.round((current / ma200 - 1) * 10000) / 100 : null
  };
}

function studyMovingAverages(bars: PriceBar[]): any {
  const current = bars[bars.length - 1].close;
  const ma20 = calculateSMA(bars, 20);
  const ma50 = calculateSMA(bars, 50);
  const ma200 = calculateSMA(bars, 200);
  
  return {
    current,
    ma20: Math.round(ma20 * 100) / 100,
    ma50: Math.round(ma50 * 100) / 100,
    ma200: ma200 ? Math.round(ma200 * 100) / 100 : null,
    aboveMa20: current > ma20,
    aboveMa50: current > ma50,
    aboveMa200: ma200 ? current > ma200 : null,
    distanceFromMa20: Math.round((current - ma20) / ma20 * 10000) / 100,
    distanceFromMa50: Math.round((current - ma50) / ma50 * 10000) / 100
  };
}

function studyAfterMove(bars: PriceBar[], direction: 'up' | 'down'): any {
  const thresholds = [3, 5, 7];
  const results: any[] = [];
  
  for (const thresh of thresholds) {
    let wins = 0, total = 0;
    const returns: number[] = [];
    
    for (let i = 1; i < bars.length - 5; i++) {
      const dailyReturn = (bars[i].close - bars[i - 1].close) / bars[i - 1].close * 100;
      const triggered = direction === 'down' ? dailyReturn <= -thresh : dailyReturn >= thresh;
      
      if (triggered) {
        total++;
        const futureReturn = (bars[i + 5].close - bars[i].close) / bars[i].close * 100;
        returns.push(futureReturn);
        if (direction === 'down' ? futureReturn > 0 : futureReturn < 0) wins++;
      }
    }
    
    results.push({
      threshold: thresh,
      occurrences: total,
      winRate: total > 0 ? Math.round(wins / total * 100) : 0,
      avgReturn: returns.length > 0 ? Math.round(returns.reduce((a, b) => a + b, 0) / returns.length * 100) / 100 : 0
    });
  }
  
  return { direction, analysis: results };
}

function studyStreaks(bars: PriceBar[]): any {
  let currentStreak = 0;
  let streakStartIndex = bars.length - 1;
  const streakStats: Record<number, { wins: number; total: number; returns: number[] }> = {};
  
  // Track all streaks with their start/end indices for historical analysis
  const allStreaks: { streak: number; startIdx: number; endIdx: number; totalChange: number }[] = [];
  let tempStreakStart = 1;
  let tempStreak = 0;
  
  for (let i = 1; i < bars.length; i++) {
    const isUp = bars[i].close > bars[i - 1].close;
    const prevStreak = currentStreak;
    
    if (isUp) {
      currentStreak = currentStreak > 0 ? currentStreak + 1 : 1;
    } else {
      currentStreak = currentStreak < 0 ? currentStreak - 1 : -1;
    }
    
    // Detect streak changes to record completed streaks
    if (i > 1) {
      const wasUp = tempStreak > 0;
      const nowUp = currentStreak > 0;
      
      if ((wasUp && !nowUp) || (!wasUp && nowUp && tempStreak !== 0)) {
        // Streak ended, record it
        const streakEndIdx = i - 1;
        const streakTotalChange = ((bars[streakEndIdx].close - bars[tempStreakStart - 1].close) / bars[tempStreakStart - 1].close) * 100;
        allStreaks.push({
          streak: tempStreak,
          startIdx: tempStreakStart,
          endIdx: streakEndIdx,
          totalChange: streakTotalChange
        });
        tempStreakStart = i;
      }
    }
    tempStreak = currentStreak;
    
    // Update streak start for current streak
    if (Math.abs(currentStreak) === 1) {
      streakStartIndex = i;
    }
    
    // Record stats for this streak length
    if (i < bars.length - 1) {
      const streakKey = currentStreak;
      if (!streakStats[streakKey]) {
        streakStats[streakKey] = { wins: 0, total: 0, returns: [] };
      }
      
      const nextReturn = (bars[i + 1].close - bars[i].close) / bars[i].close * 100;
      streakStats[streakKey].total++;
      streakStats[streakKey].returns.push(nextReturn);
      if ((currentStreak > 0 && nextReturn > 0) || (currentStreak < 0 && nextReturn < 0)) {
        streakStats[streakKey].wins++;
      }
    }
  }
  
  // Calculate actual total change for current streak
  const streakStartBar = bars[streakStartIndex - 1] || bars[0];
  const currentBar = bars[bars.length - 1];
  const actualTotalChange = ((currentBar.close - streakStartBar.close) / streakStartBar.close) * 100;
  const streakStartDate = bars[streakStartIndex]?.date || bars[bars.length - 1].date;
  
  // Calculate average recovery time after similar streaks
  const similarStreaks = allStreaks.filter(s => s.streak === currentStreak);
  let avgRecoveryDays = 0;
  let recoveryCount = 0;
  
  for (const streak of similarStreaks) {
    // Find how many days until price returned to pre-streak level
    const preStreakPrice = bars[streak.startIdx - 1]?.close || bars[streak.startIdx].close;
    for (let j = streak.endIdx + 1; j < Math.min(streak.endIdx + 20, bars.length); j++) {
      const recovered = streak.streak < 0 
        ? bars[j].close >= preStreakPrice 
        : bars[j].close <= preStreakPrice;
      if (recovered) {
        avgRecoveryDays += (j - streak.endIdx);
        recoveryCount++;
        break;
      }
    }
  }
  
  const avgRecovery = recoveryCount > 0 ? Math.round(avgRecoveryDays / recoveryCount) : null;
  
  const analysis = Object.entries(streakStats)
    .filter(([_, v]) => v.total >= 5)
    .map(([streak, stats]) => ({
      streak: parseInt(streak),
      occurrences: stats.total,
      continuationRate: Math.round(stats.wins / stats.total * 100),
      avgNextDayReturn: Math.round(stats.returns.reduce((a, b) => a + b, 0) / stats.returns.length * 100) / 100
    }))
    .sort((a, b) => Math.abs(b.streak) - Math.abs(a.streak));
  
  return { 
    currentStreak, 
    analysis,
    // New fields for real data
    streakStartDate,
    actualTotalChange: Math.round(actualTotalChange * 100) / 100,
    avgRecoveryDays: avgRecovery,
    historicalStreakCount: allStreaks.filter(s => s.streak === currentStreak).length
  };
}

function studyGaps(bars: PriceBar[]): any {
  const gaps: { date: string; gapPercent: number; filled: boolean; daysToFill: number | null }[] = [];
  
  for (let i = 1; i < bars.length; i++) {
    const gapPercent = (bars[i].open - bars[i - 1].close) / bars[i - 1].close * 100;
    
    if (Math.abs(gapPercent) >= 1) {
      let filled = false;
      let daysToFill: number | null = null;
      
      for (let j = i; j < bars.length && j < i + 20; j++) {
        if (gapPercent > 0 && bars[j].low <= bars[i - 1].close) {
          filled = true;
          daysToFill = j - i;
          break;
        }
        if (gapPercent < 0 && bars[j].high >= bars[i - 1].close) {
          filled = true;
          daysToFill = j - i;
          break;
        }
      }
      
      gaps.push({ date: bars[i].date, gapPercent: Math.round(gapPercent * 100) / 100, filled, daysToFill });
    }
  }
  
  const upGaps = gaps.filter(g => g.gapPercent > 0);
  const downGaps = gaps.filter(g => g.gapPercent < 0);
  
  return {
    totalGaps: gaps.length,
    upGapFillRate: upGaps.length > 0 ? Math.round(upGaps.filter(g => g.filled).length / upGaps.length * 100) : 0,
    downGapFillRate: downGaps.length > 0 ? Math.round(downGaps.filter(g => g.filled).length / downGaps.length * 100) : 0,
    avgDaysToFill: gaps.filter(g => g.daysToFill !== null).length > 0 
      ? Math.round(gaps.filter(g => g.daysToFill !== null).reduce((a, g) => a + (g.daysToFill || 0), 0) / gaps.filter(g => g.daysToFill !== null).length)
      : null,
    recentGaps: gaps.slice(-5).reverse()
  };
}

function studyConsecutiveDays(bars: PriceBar[]): any {
  const consecutiveStats: Record<number, { wins: number; total: number }> = {};
  let consecutive = 0;
  
  for (let i = 1; i < bars.length - 1; i++) {
    const isUp = bars[i].close > bars[i - 1].close;
    
    if (isUp) {
      consecutive = consecutive > 0 ? consecutive + 1 : 1;
    } else {
      consecutive = consecutive < 0 ? consecutive - 1 : -1;
    }
    
    if (!consecutiveStats[consecutive]) {
      consecutiveStats[consecutive] = { wins: 0, total: 0 };
    }
    
    consecutiveStats[consecutive].total++;
    const nextUp = bars[i + 1].close > bars[i].close;
    if (nextUp) consecutiveStats[consecutive].wins++;
  }
  
  return {
    currentConsecutive: consecutive,
    analysis: Object.entries(consecutiveStats)
      .filter(([_, v]) => v.total >= 5)
      .map(([days, stats]) => ({
        consecutiveDays: parseInt(days),
        occurrences: stats.total,
        nextDayUpRate: Math.round(stats.wins / stats.total * 100)
      }))
      .sort((a, b) => Math.abs(b.consecutiveDays) - Math.abs(a.consecutiveDays))
  };
}

function studyCloseVsOpen(bars: PriceBar[]): any {
  let bullishDays = 0;
  const returns: number[] = [];
  
  for (const bar of bars) {
    const isBullish = bar.close > bar.open;
    if (isBullish) bullishDays++;
    returns.push((bar.close - bar.open) / bar.open * 100);
  }
  
  return {
    bullishPercentage: Math.round(bullishDays / bars.length * 100),
    avgIntradayMove: Math.round(returns.reduce((a, b) => a + b, 0) / returns.length * 100) / 100,
    totalDays: bars.length
  };
}

function studyCloseVsPrior(bars: PriceBar[]): any {
  let upDays = 0;
  const returns: number[] = [];
  
  for (let i = 1; i < bars.length; i++) {
    const isUp = bars[i].close > bars[i - 1].close;
    if (isUp) upDays++;
    returns.push((bars[i].close - bars[i - 1].close) / bars[i - 1].close * 100);
  }
  
  return {
    winRate: Math.round(upDays / (bars.length - 1) * 100),
    avgDailyReturn: Math.round(returns.reduce((a, b) => a + b, 0) / returns.length * 100) / 100,
    totalDays: bars.length - 1
  };
}

function studyVolatility(bars: PriceBar[]): any {
  const returns: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    returns.push((bars[i].close - bars[i - 1].close) / bars[i - 1].close * 100);
  }
  
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  
  // Calculate for different periods
  const recent20 = returns.slice(-20);
  const recent20StdDev = Math.sqrt(recent20.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / recent20.length);
  
  return {
    annualizedVolatility: Math.round(stdDev * Math.sqrt(252) * 100) / 100,
    dailyVolatility: Math.round(stdDev * 100) / 100,
    recent20DayVol: Math.round(recent20StdDev * Math.sqrt(252) * 100) / 100,
    volatilityRank: recent20StdDev > stdDev * 1.5 ? 'high' : recent20StdDev < stdDev * 0.7 ? 'low' : 'normal'
  };
}

function studyBollinger(bars: PriceBar[], period = 20, stdDevMultiplier = 2): any {
  if (bars.length < period) return { error: 'Insufficient data' };
  
  const closes = bars.slice(-period).map(b => b.close);
  const sma = closes.reduce((a, b) => a + b, 0) / period;
  const variance = closes.reduce((sum, c) => sum + Math.pow(c - sma, 2), 0) / period;
  const stdDev = Math.sqrt(variance);
  
  const upper = sma + stdDevMultiplier * stdDev;
  const lower = sma - stdDevMultiplier * stdDev;
  const current = bars[bars.length - 1].close;
  
  const percentB = (current - lower) / (upper - lower) * 100;
  
  // Analyze historical touches
  let lowerTouches = 0, lowerBounces = 0;
  let upperTouches = 0, upperRejections = 0;
  
  for (let i = period; i < bars.length - 5; i++) {
    const localCloses = bars.slice(i - period, i).map(b => b.close);
    const localSma = localCloses.reduce((a, b) => a + b, 0) / period;
    const localVar = localCloses.reduce((sum, c) => sum + Math.pow(c - localSma, 2), 0) / period;
    const localStdDev = Math.sqrt(localVar);
    const localLower = localSma - stdDevMultiplier * localStdDev;
    const localUpper = localSma + stdDevMultiplier * localStdDev;
    
    if (bars[i].close <= localLower) {
      lowerTouches++;
      if (bars[i + 5].close > bars[i].close) lowerBounces++;
    }
    if (bars[i].close >= localUpper) {
      upperTouches++;
      if (bars[i + 5].close < bars[i].close) upperRejections++;
    }
  }
  
  return {
    current,
    upper: Math.round(upper * 100) / 100,
    middle: Math.round(sma * 100) / 100,
    lower: Math.round(lower * 100) / 100,
    percentB: Math.round(percentB),
    signal: percentB < 0 ? 'oversold' : percentB > 100 ? 'overbought' : 'neutral',
    lowerBounceRate: lowerTouches > 0 ? Math.round(lowerBounces / lowerTouches * 100) : null,
    upperRejectionRate: upperTouches > 0 ? Math.round(upperRejections / upperTouches * 100) : null
  };
}

function calculateSMA(bars: PriceBar[], period: number): number {
  if (bars.length < period) return bars[bars.length - 1].close;
  const slice = bars.slice(-period);
  return slice.reduce((sum, bar) => sum + bar.close, 0) / period;
}

function studyExtremeDays(bars: PriceBar[]): any {
  if (bars.length < 10) return { error: 'Insufficient data' };
  
  const dailyChanges: { date: string; change: number; changePercent: number }[] = [];
  let upDays = 0;
  let downDays = 0;
  let flatDays = 0;
  
  for (let i = 1; i < bars.length; i++) {
    const change = bars[i].close - bars[i - 1].close;
    const changePercent = (change / bars[i - 1].close) * 100;
    dailyChanges.push({ date: bars[i].date, change, changePercent });
    
    if (changePercent > 0.05) {
      upDays++;
    } else if (changePercent < -0.05) {
      downDays++;
    } else {
      flatDays++;
    }
  }
  
  // Sort by change percent to find extremes
  const sorted = [...dailyChanges].sort((a, b) => b.changePercent - a.changePercent);
  
  const topBest = sorted.slice(0, 5).map(d => ({ date: d.date, change: Math.round(d.changePercent * 100) / 100 }));
  const topWorst = sorted.slice(-5).reverse().map(d => ({ date: d.date, change: Math.round(d.changePercent * 100) / 100 }));
  
  const avgDailyMovePercent = dailyChanges.reduce((sum, d) => sum + Math.abs(d.changePercent), 0) / dailyChanges.length;
  const currentPrice = bars[bars.length - 1].close;
  const avgDailyMove = currentPrice * (avgDailyMovePercent / 100);
  
  return {
    bestDay: topBest[0] || { date: 'N/A', change: 0 },
    worstDay: topWorst[0] || { date: 'N/A', change: 0 },
    topBest,
    topWorst,
    avgDailyMove: Math.round(avgDailyMove * 100) / 100,
    avgDailyMovePercent: Math.round(avgDailyMovePercent * 100) / 100,
    upDays,
    downDays,
    flatDays,
    totalDays: dailyChanges.length
  };
}

function studyYearRange(bars: PriceBar[]): any {
  // Get last 252 trading days (approximately 1 year)
  const yearBars = bars.slice(-252);
  
  if (yearBars.length < 20) return { error: 'Insufficient data for year range' };
  
  let week52High = -Infinity;
  let week52Low = Infinity;
  
  for (const bar of yearBars) {
    if (bar.high > week52High) week52High = bar.high;
    if (bar.low < week52Low) week52Low = bar.low;
  }
  
  const currentPrice = bars[bars.length - 1].close;
  const range = week52High - week52Low;
  const currentPosition = range > 0 ? ((currentPrice - week52Low) / range) * 100 : 50;
  
  const distanceFromHigh = ((week52High - currentPrice) / currentPrice) * 100;
  const distanceFromLow = ((currentPrice - week52Low) / currentPrice) * 100;
  
  return {
    week52High: Math.round(week52High * 100) / 100,
    week52Low: Math.round(week52Low * 100) / 100,
    currentPosition: Math.round(currentPosition),
    distanceFromHigh: Math.round(distanceFromHigh * 100) / 100,
    distanceFromLow: Math.round(distanceFromLow * 100) / 100
  };
}
