import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StudyRequest {
  ticker: string;
  studyType: string;
  startDate: string;
  endDate: string;
  params?: Record<string, any>;
}

interface PriceBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

function seededRandom(seed: number) {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

function generateMockBars(ticker: string, startDate: string, endDate: string): PriceBar[] {
  const bars: PriceBar[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  const seed = ticker.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  let price = 100 + seededRandom(seed) * 200;
  let current = new Date(start);
  let seedOffset = 0;
  while (current <= end) {
    if (current.getDay() !== 0 && current.getDay() !== 6) {
      const dailyReturn = (seededRandom(seed + seedOffset) - 0.48) * 0.03;
      const open = price;
      const change = price * dailyReturn;
      const close = price + change;
      const volatility = 0.005 + seededRandom(seed + seedOffset + 1) * 0.015;
      const high = Math.max(open, close) * (1 + volatility);
      const low = Math.min(open, close) * (1 - volatility);
      bars.push({ date: current.toISOString().split('T')[0], open, high, low, close, volume: Math.floor(1000000 + seededRandom(seed + seedOffset + 3) * 5000000) });
      price = close;
      seedOffset++;
    }
    current.setDate(current.getDate() + 1);
  }
  return bars;
}

async function fetchPolygonBars(ticker: string, startDate: string, endDate: string): Promise<PriceBar[] | null> {
  const apiKey = Deno.env.get('POLYGON_API_KEY');
  if (!apiKey) return null;
  try {
    const url = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/1/day/${startDate}/${endDate}?adjusted=true&sort=asc&limit=50000&apiKey=${apiKey}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    if (!data.results || data.results.length === 0) return null;
    return data.results.map((r: any) => ({ date: new Date(r.t).toISOString().split('T')[0], open: r.o, high: r.h, low: r.l, close: r.c, volume: r.v }));
  } catch { return null; }
}

function calculateSMA(values: number[], period: number): number[] {
  const sma: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) sma.push(NaN);
    else sma.push(values.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period);
  }
  return sma;
}

function calculateEMA(values: number[], period: number): number[] {
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) ema.push(NaN);
    else if (i === period - 1) ema.push(values.slice(0, period).reduce((a, b) => a + b, 0) / period);
    else ema.push((values[i] - ema[i - 1]) * multiplier + ema[i - 1]);
  }
  return ema;
}

function calculateRSI(bars: PriceBar[], period: number = 14): number[] {
  const rsi: number[] = [], gains: number[] = [], losses: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    const change = bars[i].close - bars[i - 1].close;
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? -change : 0);
  }
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = 0; i < gains.length; i++) {
    if (i < period - 1) rsi.push(NaN);
    else if (i === period - 1) { const rs = avgLoss === 0 ? 100 : avgGain / avgLoss; rsi.push(100 - (100 / (1 + rs))); }
    else { avgGain = (avgGain * (period - 1) + gains[i]) / period; avgLoss = (avgLoss * (period - 1) + losses[i]) / period; const rs = avgLoss === 0 ? 100 : avgGain / avgLoss; rsi.push(100 - (100 / (1 + rs))); }
  }
  return rsi;
}

function calculateATR(bars: PriceBar[], period: number = 14): number[] {
  const tr: number[] = [], atr: number[] = [];
  for (let i = 0; i < bars.length; i++) {
    if (i === 0) tr.push(bars[i].high - bars[i].low);
    else tr.push(Math.max(bars[i].high - bars[i].low, Math.abs(bars[i].high - bars[i - 1].close), Math.abs(bars[i].low - bars[i - 1].close)));
  }
  for (let i = 0; i < tr.length; i++) {
    if (i < period - 1) atr.push(NaN);
    else if (i === period - 1) atr.push(tr.slice(0, period).reduce((a, b) => a + b, 0) / period);
    else atr.push((atr[i - 1] * (period - 1) + tr[i]) / period);
  }
  return atr;
}

function percentile(arr: number[], p: number): number {
  const sorted = [...arr].filter(x => !isNaN(x)).sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

function studyCloseAboveOpen(bars: PriceBar[]) { const upDays = bars.filter(b => b.close > b.open).length; const downDays = bars.filter(b => b.close < b.open).length; return { type: 'percentage', percentage: (upDays / bars.length) * 100, up_days: upDays, down_days: downDays, unchanged: bars.length - upDays - downDays, total_days: bars.length, label: 'of days closed above open' }; }

function studyCloseAbovePrior(bars: PriceBar[]) { let upDays = 0, downDays = 0; for (let i = 1; i < bars.length; i++) { if (bars[i].close > bars[i - 1].close) upDays++; else if (bars[i].close < bars[i - 1].close) downDays++; } const total = bars.length - 1; return { type: 'percentage', percentage: (upDays / total) * 100, up_days: upDays, down_days: downDays, unchanged: total - upDays - downDays, total_days: total, label: 'of days closed above prior close' }; }

function studyReturnDistribution(bars: PriceBar[]) { const returns: number[] = []; for (let i = 1; i < bars.length; i++) returns.push(((bars[i].close - bars[i - 1].close) / bars[i - 1].close) * 100); const mean = returns.reduce((a, b) => a + b, 0) / returns.length; const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length; const stdDev = Math.sqrt(variance); const sorted = [...returns].sort((a, b) => a - b); const percentiles = { p5: sorted[Math.floor(sorted.length * 0.05)], p25: sorted[Math.floor(sorted.length * 0.25)], p50: sorted[Math.floor(sorted.length * 0.50)], p75: sorted[Math.floor(sorted.length * 0.75)], p95: sorted[Math.floor(sorted.length * 0.95)] }; const bucketSize = 0.5; const histogram: { range: number; count: number }[] = []; const min = Math.floor(sorted[0]); const max = Math.ceil(sorted[sorted.length - 1]); for (let r = min; r <= max; r += bucketSize) { const count = returns.filter(ret => ret >= r && ret < r + bucketSize).length; if (count > 0) histogram.push({ range: r, count }); } const skewness = returns.reduce((sum, r) => sum + Math.pow((r - mean) / stdDev, 3), 0) / returns.length; const kurtosis = returns.reduce((sum, r) => sum + Math.pow((r - mean) / stdDev, 4), 0) / returns.length - 3; return { type: 'distribution', mean, stdDev, min: sorted[0], max: sorted[sorted.length - 1], count: returns.length, percentiles, histogram, skewness, kurtosis, annualizedVol: stdDev * Math.sqrt(252) }; }

function studyStreaks(bars: PriceBar[]) { const directions: boolean[] = []; for (let i = 1; i < bars.length; i++) directions.push(bars[i].close > bars[i - 1].close); let maxUp = 0, maxDown = 0, currentUp = 0, currentDown = 0; const upStreaks: number[] = [], downStreaks: number[] = []; for (const isUp of directions) { if (isUp) { currentUp++; if (currentDown > 0) { downStreaks.push(currentDown); maxDown = Math.max(maxDown, currentDown); currentDown = 0; } } else { currentDown++; if (currentUp > 0) { upStreaks.push(currentUp); maxUp = Math.max(maxUp, currentUp); currentUp = 0; } } } if (currentUp > 0) { upStreaks.push(currentUp); maxUp = Math.max(maxUp, currentUp); } if (currentDown > 0) { downStreaks.push(currentDown); maxDown = Math.max(maxDown, currentDown); } const avgUp = upStreaks.length > 0 ? upStreaks.reduce((a, b) => a + b, 0) / upStreaks.length : 0; const avgDown = downStreaks.length > 0 ? downStreaks.reduce((a, b) => a + b, 0) / downStreaks.length : 0; const streakDist: Record<number, { up: number; down: number }> = {}; for (const s of upStreaks) { if (!streakDist[s]) streakDist[s] = { up: 0, down: 0 }; streakDist[s].up++; } for (const s of downStreaks) { if (!streakDist[s]) streakDist[s] = { up: 0, down: 0 }; streakDist[s].down++; } const distribution = Object.entries(streakDist).map(([len, counts]) => ({ length: parseInt(len), ...counts })).sort((a, b) => a.length - b.length); return { type: 'streaks', maxUpStreak: maxUp, maxDownStreak: maxDown, avgUpStreak: avgUp, avgDownStreak: avgDown, totalUpStreaks: upStreaks.length, totalDownStreaks: downStreaks.length, currentStreak: currentUp > 0 ? currentUp : -currentDown, currentDirection: currentUp > 0 ? 'up' : 'down', distribution }; }

function studyDayOfWeek(bars: PriceBar[]) { const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']; const dayStats: Record<number, { returns: number[]; wins: number; total: number }> = {}; for (let d = 0; d < 7; d++) dayStats[d] = { returns: [], wins: 0, total: 0 }; for (let i = 1; i < bars.length; i++) { const dayOfWeek = new Date(bars[i].date).getDay(); const ret = ((bars[i].close - bars[i - 1].close) / bars[i - 1].close) * 100; dayStats[dayOfWeek].returns.push(ret); dayStats[dayOfWeek].total++; if (ret > 0) dayStats[dayOfWeek].wins++; } const stats = Object.entries(dayStats).filter(([_, s]) => s.total > 0).map(([day, s]) => { const avgRet = s.returns.reduce((a, b) => a + b, 0) / s.returns.length; return { name: days[parseInt(day)], avgReturn: avgRet, hitRate: (s.wins / s.total) * 100, count: s.total, stdDev: Math.sqrt(s.returns.reduce((sum, r) => sum + Math.pow(r - avgRet, 2), 0) / s.returns.length) }; }); return { type: 'calendar', period: 'day_of_week', stats }; }

function studyMonthOfYear(bars: PriceBar[]) { const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']; const monthStats: Record<number, { returns: number[]; wins: number; total: number }> = {}; for (let m = 0; m < 12; m++) monthStats[m] = { returns: [], wins: 0, total: 0 }; let currentMonth = new Date(bars[0].date).getMonth(); let monthStartPrice = bars[0].close; for (let i = 1; i < bars.length; i++) { const barMonth = new Date(bars[i].date).getMonth(); if (barMonth !== currentMonth) { const ret = ((bars[i - 1].close - monthStartPrice) / monthStartPrice) * 100; monthStats[currentMonth].returns.push(ret); monthStats[currentMonth].total++; if (ret > 0) monthStats[currentMonth].wins++; currentMonth = barMonth; monthStartPrice = bars[i].open; } } const stats = Object.entries(monthStats).filter(([_, s]) => s.total > 0).map(([month, s]) => ({ name: months[parseInt(month)], avgReturn: s.returns.length > 0 ? s.returns.reduce((a, b) => a + b, 0) / s.returns.length : 0, hitRate: s.total > 0 ? (s.wins / s.total) * 100 : 0, count: s.total })); return { type: 'calendar', period: 'month_of_year', stats }; }

function studyGapAnalysis(bars: PriceBar[]) { const gaps: { date: string; gapPercent: number; filled: boolean; continuation: boolean; dayReturn: number }[] = []; for (let i = 1; i < bars.length; i++) { const gapPercent = ((bars[i].open - bars[i - 1].close) / bars[i - 1].close) * 100; if (Math.abs(gapPercent) >= 0.5) { const filled = gapPercent > 0 ? bars[i].low <= bars[i - 1].close : bars[i].high >= bars[i - 1].close; const continuation = gapPercent > 0 ? bars[i].close > bars[i].open : bars[i].close < bars[i].open; const dayReturn = ((bars[i].close - bars[i].open) / bars[i].open) * 100; gaps.push({ date: bars[i].date, gapPercent, filled, continuation, dayReturn }); } } const gapsUp = gaps.filter(g => g.gapPercent > 0); const gapsDown = gaps.filter(g => g.gapPercent < 0); return { type: 'gap_analysis', totalGaps: gaps.length, gapsUp: { count: gapsUp.length, avgGapSize: gapsUp.length > 0 ? gapsUp.reduce((a, b) => a + b.gapPercent, 0) / gapsUp.length : 0, fillRate: gapsUp.length > 0 ? (gapsUp.filter(g => g.filled).length / gapsUp.length) * 100 : 0, continuationRate: gapsUp.length > 0 ? (gapsUp.filter(g => g.continuation).length / gapsUp.length) * 100 : 0, avgDayReturn: gapsUp.length > 0 ? gapsUp.reduce((a, b) => a + b.dayReturn, 0) / gapsUp.length : 0 }, gapsDown: { count: gapsDown.length, avgGapSize: gapsDown.length > 0 ? gapsDown.reduce((a, b) => a + b.gapPercent, 0) / gapsDown.length : 0, fillRate: gapsDown.length > 0 ? (gapsDown.filter(g => g.filled).length / gapsDown.length) * 100 : 0, continuationRate: gapsDown.length > 0 ? (gapsDown.filter(g => g.continuation).length / gapsDown.length) * 100 : 0, avgDayReturn: gapsDown.length > 0 ? gapsDown.reduce((a, b) => a + b.dayReturn, 0) / gapsDown.length : 0 }, recentGaps: gaps.slice(-10) }; }

function studyVolatilityAnalysis(bars: PriceBar[]) { const atr = calculateATR(bars, 14); const validAtr = atr.filter(x => !isNaN(x)); const dailyRanges = bars.map(b => ((b.high - b.low) / b.close) * 100); const returns = bars.slice(1).map((b, i) => Math.abs((b.close - bars[i].close) / bars[i].close) * 100); const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length; const highVolDays = returns.map(r => r > avgReturn * 1.5); let clusters = 0; for (let i = 1; i < highVolDays.length; i++) { if (highVolDays[i] && highVolDays[i - 1]) clusters++; } const clusteringRate = highVolDays.filter(Boolean).length > 0 ? (clusters / highVolDays.filter(Boolean).length) * 100 : 0; const rollingVol: number[] = []; const window = 20; for (let i = window; i < returns.length; i++) { const windowReturns = returns.slice(i - window, i); const mean = windowReturns.reduce((a, b) => a + b, 0) / window; const vol = Math.sqrt(windowReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / window); rollingVol.push(vol * Math.sqrt(252)); } return { type: 'volatility', atr: { current: validAtr[validAtr.length - 1], avg: validAtr.reduce((a, b) => a + b, 0) / validAtr.length, min: Math.min(...validAtr), max: Math.max(...validAtr), percentile: { p25: percentile(validAtr, 25), p50: percentile(validAtr, 50), p75: percentile(validAtr, 75) } }, dailyRange: { avg: dailyRanges.reduce((a, b) => a + b, 0) / dailyRanges.length, min: Math.min(...dailyRanges), max: Math.max(...dailyRanges) }, volatilityClustering: clusteringRate, annualizedVol: { current: rollingVol[rollingVol.length - 1] || 0, avg: rollingVol.length > 0 ? rollingVol.reduce((a, b) => a + b, 0) / rollingVol.length : 0, min: rollingVol.length > 0 ? Math.min(...rollingVol) : 0, max: rollingVol.length > 0 ? Math.max(...rollingVol) : 0 } }; }

function studyDrawdownAnalysis(bars: PriceBar[]) { let peak = bars[0].close; const drawdowns: { startDate: string; endDate: string; maxDrawdown: number; duration: number; recovered: boolean }[] = []; let currentDrawdownStart: string | null = null; let maxDrawdown = 0; let currentMaxDD = 0; for (let i = 0; i < bars.length; i++) { if (bars[i].close > peak) { if (currentDrawdownStart && currentMaxDD > 0.01) { drawdowns.push({ startDate: currentDrawdownStart, endDate: bars[i].date, maxDrawdown: currentMaxDD * 100, duration: drawdowns.length > 0 ? i - bars.findIndex(b => b.date === currentDrawdownStart) : 0, recovered: true }); } peak = bars[i].close; currentDrawdownStart = null; currentMaxDD = 0; } else { const dd = (peak - bars[i].close) / peak; if (dd > currentMaxDD) { currentMaxDD = dd; if (!currentDrawdownStart) currentDrawdownStart = bars[i].date; } if (dd > maxDrawdown) maxDrawdown = dd; } } if (currentDrawdownStart && currentMaxDD > 0.01) { drawdowns.push({ startDate: currentDrawdownStart, endDate: bars[bars.length - 1].date, maxDrawdown: currentMaxDD * 100, duration: bars.length - bars.findIndex(b => b.date === currentDrawdownStart), recovered: false }); } const recoveredDDs = drawdowns.filter(d => d.recovered); const avgRecoveryTime = recoveredDDs.length > 0 ? recoveredDDs.reduce((a, b) => a + b.duration, 0) / recoveredDDs.length : 0; return { type: 'drawdown', maxDrawdown: maxDrawdown * 100, currentDrawdown: currentMaxDD * 100, totalDrawdowns: drawdowns.length, avgDrawdown: drawdowns.length > 0 ? drawdowns.reduce((a, b) => a + b.maxDrawdown, 0) / drawdowns.length : 0, avgRecoveryDays: avgRecoveryTime, longestDrawdown: drawdowns.length > 0 ? Math.max(...drawdowns.map(d => d.duration)) : 0, significantDrawdowns: drawdowns.filter(d => d.maxDrawdown > 5).slice(-5) }; }

function studyMovingAverageAnalysis(bars: PriceBar[], params?: Record<string, any>) { 
  const shortPeriod = params?.shortPeriod || 20;
  const mediumPeriod = params?.mediumPeriod || 50;
  const longPeriod = params?.longPeriod || 200;
  const periods = [shortPeriod, mediumPeriod, longPeriod];
  const closes = bars.map(b => b.close); const results: Record<string, any> = {}; for (const period of periods) { if (bars.length < period) continue; const sma = calculateSMA(closes, period); const ema = calculateEMA(closes, period); let aboveSMA = 0, aboveEMA = 0; for (let i = period - 1; i < bars.length; i++) { if (closes[i] > sma[i]) aboveSMA++; if (closes[i] > ema[i]) aboveEMA++; } const validCount = bars.length - period + 1; const currentAboveSMA = closes[closes.length - 1] > sma[sma.length - 1]; const currentAboveEMA = closes[closes.length - 1] > ema[ema.length - 1]; const distFromSMA = ((closes[closes.length - 1] - sma[sma.length - 1]) / sma[sma.length - 1]) * 100; const distFromEMA = ((closes[closes.length - 1] - ema[ema.length - 1]) / ema[ema.length - 1]) * 100; results[`ma${period}`] = { sma: sma[sma.length - 1], ema: ema[ema.length - 1], pctAboveSMA: (aboveSMA / validCount) * 100, pctAboveEMA: (aboveEMA / validCount) * 100, currentAboveSMA, currentAboveEMA, distFromSMA, distFromEMA }; } if (periods.includes(mediumPeriod) && periods.includes(longPeriod) && bars.length >= longPeriod) { const smaMedium = calculateSMA(closes, mediumPeriod); const smaLong = calculateSMA(closes, longPeriod); const crosses: { date: string; type: 'golden' | 'death' }[] = []; for (let i = longPeriod; i < bars.length; i++) { const prevMediumAboveLong = smaMedium[i - 1] > smaLong[i - 1]; const currMediumAboveLong = smaMedium[i] > smaLong[i]; if (!prevMediumAboveLong && currMediumAboveLong) crosses.push({ date: bars[i].date, type: 'golden' }); else if (prevMediumAboveLong && !currMediumAboveLong) crosses.push({ date: bars[i].date, type: 'death' }); } results.crosses = crosses.slice(-5); results.currentTrend = smaMedium[smaMedium.length - 1] > smaLong[smaLong.length - 1] ? 'bullish' : 'bearish'; } return { type: 'moving_average', params: { shortPeriod, mediumPeriod, longPeriod }, ...results }; }

function studyVolumeAnalysis(bars: PriceBar[], params?: Record<string, any>) { 
  const avgPeriod = params?.avgPeriod || 20;
  const highVolThreshold = params?.highVolThreshold || 1.5;
  const volumes = bars.map(b => b.volume); const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length; const upDaysVolume: number[] = []; const downDaysVolume: number[] = []; for (let i = 1; i < bars.length; i++) { if (bars[i].close > bars[i - 1].close) upDaysVolume.push(bars[i].volume); else if (bars[i].close < bars[i - 1].close) downDaysVolume.push(bars[i].volume); } const avgUpVolume = upDaysVolume.length > 0 ? upDaysVolume.reduce((a, b) => a + b, 0) / upDaysVolume.length : 0; const avgDownVolume = downDaysVolume.length > 0 ? downDaysVolume.reduce((a, b) => a + b, 0) / downDaysVolume.length : 0; const highVolDays = bars.filter(b => b.volume > avgVolume * highVolThreshold); const highVolReturns: number[] = []; for (const hvd of highVolDays) { const idx = bars.findIndex(b => b.date === hvd.date); if (idx > 0) highVolReturns.push(((hvd.close - bars[idx - 1].close) / bars[idx - 1].close) * 100); } const recentAvgVol = volumes.slice(-avgPeriod).reduce((a, b) => a + b, 0) / avgPeriod; const volumeTrend = ((recentAvgVol - avgVolume) / avgVolume) * 100; return { type: 'volume', params: { avgPeriod, highVolThreshold }, avgVolume, currentVolume: volumes[volumes.length - 1], volumeRatio: volumes[volumes.length - 1] / avgVolume, upDayAvgVolume: avgUpVolume, downDayAvgVolume: avgDownVolume, volumeBias: avgUpVolume > avgDownVolume ? 'accumulation' : 'distribution', highVolumeDays: { count: highVolDays.length, avgReturn: highVolReturns.length > 0 ? highVolReturns.reduce((a, b) => a + b, 0) / highVolReturns.length : 0, hitRate: highVolReturns.length > 0 ? (highVolReturns.filter(r => r > 0).length / highVolReturns.length) * 100 : 0 }, volumeTrend, percentiles: { p25: percentile(volumes, 25), p50: percentile(volumes, 50), p75: percentile(volumes, 75), p90: percentile(volumes, 90) } }; }

function studyRSIAnalysis(bars: PriceBar[], params?: Record<string, any>) { 
  const period = params?.period || 14;
  const overboughtLevel = params?.overbought || 70;
  const oversoldLevel = params?.oversold || 30;
  const forwardDays = params?.forwardDays || 5;
  const rsi = calculateRSI(bars, period); const validRSI = rsi.filter(x => !isNaN(x)); const overbought = validRSI.filter(r => r > overboughtLevel).length; const oversold = validRSI.filter(r => r < oversoldLevel).length; const afterOverbought: number[] = []; const afterOversold: number[] = []; for (let i = period; i < bars.length - forwardDays; i++) { if (rsi[i - period] > overboughtLevel) afterOverbought.push(((bars[i + forwardDays].close - bars[i].close) / bars[i].close) * 100); else if (rsi[i - period] < oversoldLevel) afterOversold.push(((bars[i + forwardDays].close - bars[i].close) / bars[i].close) * 100); } const rsiRanges = [{ range: '0-20', count: validRSI.filter(r => r >= 0 && r < 20).length }, { range: '20-30', count: validRSI.filter(r => r >= 20 && r < 30).length }, { range: '30-50', count: validRSI.filter(r => r >= 30 && r < 50).length }, { range: '50-70', count: validRSI.filter(r => r >= 50 && r < 70).length }, { range: '70-80', count: validRSI.filter(r => r >= 70 && r < 80).length }, { range: '80-100', count: validRSI.filter(r => r >= 80 && r <= 100).length }]; return { type: 'rsi', params: { period, overbought: overboughtLevel, oversold: oversoldLevel, forwardDays }, current: validRSI[validRSI.length - 1], avg: validRSI.reduce((a, b) => a + b, 0) / validRSI.length, overboughtPct: (overbought / validRSI.length) * 100, oversoldPct: (oversold / validRSI.length) * 100, afterOverbought: { count: afterOverbought.length, avgReturn: afterOverbought.length > 0 ? afterOverbought.reduce((a, b) => a + b, 0) / afterOverbought.length : 0, hitRate: afterOverbought.length > 0 ? (afterOverbought.filter(r => r > 0).length / afterOverbought.length) * 100 : 0 }, afterOversold: { count: afterOversold.length, avgReturn: afterOversold.length > 0 ? afterOversold.reduce((a, b) => a + b, 0) / afterOversold.length : 0, hitRate: afterOversold.length > 0 ? (afterOversold.filter(r => r > 0).length / afterOversold.length) * 100 : 0 }, distribution: rsiRanges }; }

function studyMeanReversion(bars: PriceBar[], params?: Record<string, any>) { 
  const stdDevThreshold = params?.stdDevThreshold || 2;
  const returns: number[] = []; for (let i = 1; i < bars.length; i++) returns.push(((bars[i].close - bars[i - 1].close) / bars[i - 1].close) * 100); const mean = returns.reduce((a, b) => a + b, 0) / returns.length; const stdDev = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length); const afterLargeUp: number[] = []; const afterLargeDown: number[] = []; for (let i = 0; i < returns.length - 1; i++) { if (returns[i] > mean + stdDevThreshold * stdDev) afterLargeUp.push(returns[i + 1]); else if (returns[i] < mean - stdDevThreshold * stdDev) afterLargeDown.push(returns[i + 1]); } let autocorr = 0; for (let i = 1; i < returns.length; i++) autocorr += (returns[i] - mean) * (returns[i - 1] - mean); autocorr /= (returns.length - 1) * stdDev * stdDev; return { type: 'mean_reversion', params: { stdDevThreshold }, autocorrelation: autocorr, regime: autocorr < -0.1 ? 'mean_reverting' : autocorr > 0.1 ? 'trending' : 'random', afterLargeUp: { count: afterLargeUp.length, avgNextDayReturn: afterLargeUp.length > 0 ? afterLargeUp.reduce((a, b) => a + b, 0) / afterLargeUp.length : 0, reversalRate: afterLargeUp.length > 0 ? (afterLargeUp.filter(r => r < 0).length / afterLargeUp.length) * 100 : 0 }, afterLargeDown: { count: afterLargeDown.length, avgNextDayReturn: afterLargeDown.length > 0 ? afterLargeDown.reduce((a, b) => a + b, 0) / afterLargeDown.length : 0, reversalRate: afterLargeDown.length > 0 ? (afterLargeDown.filter(r => r > 0).length / afterLargeDown.length) * 100 : 0 } }; }

function studyRangeAnalysis(bars: PriceBar[]) { const ranges = bars.map(b => ({ range: b.high - b.low, rangePercent: ((b.high - b.low) / b.close) * 100, bodyPercent: b.high !== b.low ? (Math.abs(b.close - b.open) / (b.high - b.low)) * 100 : 0 })); let insideDays = 0, outsideDays = 0; const afterInsideDays: number[] = []; const afterOutsideDays: number[] = []; for (let i = 1; i < bars.length; i++) { const isInside = bars[i].high <= bars[i - 1].high && bars[i].low >= bars[i - 1].low; const isOutside = bars[i].high > bars[i - 1].high && bars[i].low < bars[i - 1].low; if (isInside) insideDays++; if (isOutside) outsideDays++; if (i < bars.length - 1) { const nextReturn = ((bars[i + 1].close - bars[i].close) / bars[i].close) * 100; if (isInside) afterInsideDays.push(nextReturn); if (isOutside) afterOutsideDays.push(nextReturn); } } const avgRangePercent = ranges.reduce((a, b) => a + b.rangePercent, 0) / ranges.length; const avgBodyPercent = ranges.reduce((a, b) => a + b.bodyPercent, 0) / ranges.length; return { type: 'range', avgDailyRange: ranges.reduce((a, b) => a + b.range, 0) / ranges.length, avgRangePercent, avgBodyPercent, dojiRate: (ranges.filter(r => r.bodyPercent < 10).length / ranges.length) * 100, insideDays: { count: insideDays, rate: (insideDays / (bars.length - 1)) * 100, avgNextDayReturn: afterInsideDays.length > 0 ? afterInsideDays.reduce((a, b) => a + b, 0) / afterInsideDays.length : 0 }, outsideDays: { count: outsideDays, rate: (outsideDays / (bars.length - 1)) * 100, avgNextDayReturn: afterOutsideDays.length > 0 ? afterOutsideDays.reduce((a, b) => a + b, 0) / afterOutsideDays.length : 0 } }; }

function studyHighLowAnalysis(bars: PriceBar[], params?: Record<string, any>) { 
  const lookback = params?.lookbackPeriod || 20;
  const forwardDays = params?.forwardDays || 5;
  let newHighs = 0, newLows = 0; const newHighDates: string[] = []; const newLowDates: string[] = []; const afterNewHigh: number[] = []; const afterNewLow: number[] = []; for (let i = lookback; i < bars.length; i++) { const recentHighs = bars.slice(i - lookback, i).map(b => b.high); const recentLows = bars.slice(i - lookback, i).map(b => b.low); if (bars[i].high > Math.max(...recentHighs)) { newHighs++; newHighDates.push(bars[i].date); if (i < bars.length - forwardDays) afterNewHigh.push(((bars[i + forwardDays].close - bars[i].close) / bars[i].close) * 100); } if (bars[i].low < Math.min(...recentLows)) { newLows++; newLowDates.push(bars[i].date); if (i < bars.length - forwardDays) afterNewLow.push(((bars[i + forwardDays].close - bars[i].close) / bars[i].close) * 100); } } const yearBars = bars.slice(-252); const yearHigh = Math.max(...yearBars.map(b => b.high)); const yearLow = Math.min(...yearBars.map(b => b.low)); const currentPrice = bars[bars.length - 1].close; return { type: 'high_low', params: { lookbackPeriod: lookback, forwardDays }, newHighs: { count: newHighs, rate: (newHighs / (bars.length - lookback)) * 100, avgReturn: afterNewHigh.length > 0 ? afterNewHigh.reduce((a, b) => a + b, 0) / afterNewHigh.length : 0, hitRate: afterNewHigh.length > 0 ? (afterNewHigh.filter(r => r > 0).length / afterNewHigh.length) * 100 : 0 }, newLows: { count: newLows, rate: (newLows / (bars.length - lookback)) * 100, avgReturn: afterNewLow.length > 0 ? afterNewLow.reduce((a, b) => a + b, 0) / afterNewLow.length : 0, hitRate: afterNewLow.length > 0 ? (afterNewLow.filter(r => r > 0).length / afterNewLow.length) * 100 : 0 }, yearHigh, yearLow, distFromHigh: ((currentPrice - yearHigh) / yearHigh) * 100, distFromLow: ((currentPrice - yearLow) / yearLow) * 100, recentNewHighs: newHighDates.slice(-5), recentNewLows: newLowDates.slice(-5) }; }

function studyTrendStrength(bars: PriceBar[], params?: Record<string, any>) { 
  const shortMa = params?.shortMa || 20;
  const mediumMa = params?.mediumMa || 50;
  const longMa = params?.longMa || 200;
  const recentDays = params?.recentDays || 20;
  const closes = bars.map(b => b.close); const smaShort = calculateSMA(closes, shortMa); const smaMedium = calculateSMA(closes, mediumMa); const smaLong = bars.length >= longMa ? calculateSMA(closes, longMa) : []; let score = 0; const curr = bars.length - 1; if (!isNaN(smaShort[curr]) && closes[curr] > smaShort[curr]) score += 1; if (!isNaN(smaMedium[curr]) && closes[curr] > smaMedium[curr]) score += 1; if (smaLong.length > 0 && !isNaN(smaLong[curr]) && closes[curr] > smaLong[curr]) score += 1; if (!isNaN(smaShort[curr]) && !isNaN(smaMedium[curr]) && smaShort[curr] > smaMedium[curr]) score += 1; if (smaLong.length > 0 && !isNaN(smaMedium[curr]) && !isNaN(smaLong[curr]) && smaMedium[curr] > smaLong[curr]) score += 1; const recentBars = bars.slice(-recentDays); let higherHighs = 0, higherLows = 0; for (let i = 1; i < recentBars.length; i++) { if (recentBars[i].high > recentBars[i - 1].high) higherHighs++; if (recentBars[i].low > recentBars[i - 1].low) higherLows++; } const maxScore = smaLong.length > 0 ? 5 : 3; return { type: 'trend_strength', params: { shortMa, mediumMa, longMa, recentDays }, trendScore: score, maxScore, trendDirection: score >= maxScore - 1 ? 'strong_up' : score >= maxScore / 2 ? 'up' : score <= 1 ? 'strong_down' : score <= maxScore / 2 ? 'down' : 'neutral', aboveSMA20: !isNaN(smaShort[curr]) && closes[curr] > smaShort[curr], aboveSMA50: !isNaN(smaMedium[curr]) && closes[curr] > smaMedium[curr], aboveSMA200: smaLong.length > 0 && !isNaN(smaLong[curr]) && closes[curr] > smaLong[curr], sma20AboveSMA50: !isNaN(smaShort[curr]) && !isNaN(smaMedium[curr]) && smaShort[curr] > smaMedium[curr], sma50AboveSMA200: smaLong.length > 0 && !isNaN(smaMedium[curr]) && !isNaN(smaLong[curr]) && smaMedium[curr] > smaLong[curr], higherHighsRate: (higherHighs / (recentBars.length - 1)) * 100, higherLowsRate: (higherLows / (recentBars.length - 1)) * 100 }; }

// Close vs Open Analysis - Analyzes where price closes relative to its open and daily range
function studyCloseToOpenAnalysis(bars: PriceBar[], params?: Record<string, any>) {
  const dojiThreshold = params?.dojiThreshold || 0.1;
  const strongMoveThreshold = params?.strongMoveThreshold || 1.5;
  const forwardDays = params?.forwardDays || 1;
  const closePositions: { date: string; position: number; isGreen: boolean; isDoji: boolean; movePercent: number }[] = [];
  let greenDays = 0, redDays = 0, dojiDays = 0, strongGreenDays = 0, strongRedDays = 0, closedNearHigh = 0, closedNearLow = 0;
  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];
    const range = bar.high - bar.low;
    const closePosition = range > 0 ? ((bar.close - bar.low) / range) * 100 : 50;
    const bodyPercent = range > 0 ? (Math.abs(bar.close - bar.open) / range) * 100 : 0;
    const isDoji = bodyPercent < dojiThreshold * 100;
    const isGreen = bar.close > bar.open;
    const movePercent = ((bar.close - bar.open) / bar.open) * 100;
    closePositions.push({ date: bar.date, position: closePosition, isGreen, isDoji, movePercent });
    if (isDoji) dojiDays++; else if (isGreen) greenDays++; else redDays++;
    if (Math.abs(movePercent) >= strongMoveThreshold) { if (isGreen) strongGreenDays++; else strongRedDays++; }
    if (closePosition >= 75) closedNearHigh++; if (closePosition <= 25) closedNearLow++;
  }
  const afterClosedNearHigh: number[] = [], afterClosedNearLow: number[] = [], afterStrongGreen: number[] = [], afterStrongRed: number[] = [], afterDoji: number[] = [];
  for (let i = 0; i < bars.length - forwardDays; i++) {
    const futureReturn = ((bars[i + forwardDays].close - bars[i].close) / bars[i].close) * 100;
    const bar = bars[i], range = bar.high - bar.low;
    const closePosition = range > 0 ? ((bar.close - bar.low) / range) * 100 : 50;
    const bodyPercent = range > 0 ? (Math.abs(bar.close - bar.open) / range) * 100 : 0;
    const isDoji = bodyPercent < dojiThreshold * 100, isGreen = bar.close > bar.open;
    const movePercent = ((bar.close - bar.open) / bar.open) * 100;
    if (closePosition >= 75) afterClosedNearHigh.push(futureReturn); if (closePosition <= 25) afterClosedNearLow.push(futureReturn);
    if (Math.abs(movePercent) >= strongMoveThreshold && isGreen) afterStrongGreen.push(futureReturn);
    if (Math.abs(movePercent) >= strongMoveThreshold && !isGreen) afterStrongRed.push(futureReturn);
    if (isDoji) afterDoji.push(futureReturn);
  }
  const positionBuckets = [
    { range: '0-10% (At Low)', count: closePositions.filter(p => p.position <= 10).length },
    { range: '10-25%', count: closePositions.filter(p => p.position > 10 && p.position <= 25).length },
    { range: '25-50%', count: closePositions.filter(p => p.position > 25 && p.position <= 50).length },
    { range: '50-75%', count: closePositions.filter(p => p.position > 50 && p.position <= 75).length },
    { range: '75-90%', count: closePositions.filter(p => p.position > 75 && p.position <= 90).length },
    { range: '90-100% (At High)', count: closePositions.filter(p => p.position > 90).length },
  ];
  const movesSorted = closePositions.map(p => p.movePercent).sort((a, b) => a - b);
  const moveSizeDistribution = {
    avgMove: movesSorted.reduce((a, b) => a + Math.abs(b), 0) / movesSorted.length,
    avgUp: closePositions.filter(p => p.isGreen).length > 0 ? closePositions.filter(p => p.isGreen).map(p => p.movePercent).reduce((a, b) => a + b, 0) / closePositions.filter(p => p.isGreen).length : 0,
    avgDown: closePositions.filter(p => !p.isGreen && !p.isDoji).length > 0 ? closePositions.filter(p => !p.isGreen && !p.isDoji).map(p => Math.abs(p.movePercent)).reduce((a, b) => a + b, 0) / closePositions.filter(p => !p.isGreen && !p.isDoji).length : 0,
    largestUp: Math.max(...movesSorted), largestDown: Math.min(...movesSorted),
  };
  const helper = (arr: number[]) => ({ count: arr.length, avgReturn: arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0, hitRate: arr.length > 0 ? (arr.filter(r => r > 0).length / arr.length) * 100 : 0 });
  const recentPatterns = closePositions.slice(-10).map(p => ({ date: p.date, position: Math.round(p.position), type: p.isDoji ? 'doji' : p.isGreen ? 'green' : 'red', move: p.movePercent.toFixed(2) + '%' }));
  const avgClosePosition = closePositions.reduce((a, b) => a + b.position, 0) / closePositions.length;
  const currentDay = closePositions[closePositions.length - 1];
  return {
    type: 'close_to_open', params: { dojiThreshold, strongMoveThreshold, forwardDays },
    summary: { greenDays: { count: greenDays, pct: (greenDays / bars.length) * 100 }, redDays: { count: redDays, pct: (redDays / bars.length) * 100 }, dojiDays: { count: dojiDays, pct: (dojiDays / bars.length) * 100 }, strongGreenDays: { count: strongGreenDays, pct: (strongGreenDays / bars.length) * 100 }, strongRedDays: { count: strongRedDays, pct: (strongRedDays / bars.length) * 100 }, closedNearHigh: { count: closedNearHigh, pct: (closedNearHigh / bars.length) * 100 }, closedNearLow: { count: closedNearLow, pct: (closedNearLow / bars.length) * 100 }, avgClosePosition, bias: greenDays > redDays ? 'bullish' : greenDays < redDays ? 'bearish' : 'neutral' },
    followThrough: { afterClosedNearHigh: helper(afterClosedNearHigh), afterClosedNearLow: helper(afterClosedNearLow), afterStrongGreen: helper(afterStrongGreen), afterStrongRed: helper(afterStrongRed), afterDoji: helper(afterDoji) },
    distribution: positionBuckets, moveSizeDistribution,
    currentDay: { date: currentDay.date, closePosition: Math.round(currentDay.position), type: currentDay.isDoji ? 'doji' : currentDay.isGreen ? 'green' : 'red', move: currentDay.movePercent },
    recentPatterns,
    insights: [
      avgClosePosition > 60 ? `Price tends to close in upper range (avg ${avgClosePosition.toFixed(1)}%), suggesting buying pressure` : avgClosePosition < 40 ? `Price tends to close in lower range (avg ${avgClosePosition.toFixed(1)}%), suggesting selling pressure` : `Price closes near middle of range on average (${avgClosePosition.toFixed(1)}%)`,
      greenDays > redDays * 1.2 ? `Bullish bias: ${((greenDays / bars.length) * 100).toFixed(1)}% green days` : redDays > greenDays * 1.2 ? `Bearish bias: ${((redDays / bars.length) * 100).toFixed(1)}% red days` : `Balanced: roughly equal green/red days`,
      dojiDays > bars.length * 0.1 ? `High indecision: ${((dojiDays / bars.length) * 100).toFixed(1)}% doji days` : null,
    ].filter(Boolean),
  };
}

function studyPriceTargets(bars: PriceBar[]) { const closes = bars.map(b => b.close); const returns = closes.slice(1).map((c, i) => (c - closes[i]) / closes[i]); const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length; const stdDev = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length); const currentPrice = closes[closes.length - 1]; const projections = { days30: { expected: currentPrice * Math.pow(1 + avgReturn, 30), bull: currentPrice * Math.pow(1 + avgReturn + stdDev, 30), bear: currentPrice * Math.pow(1 + avgReturn - stdDev, 30), best: currentPrice * Math.pow(1 + avgReturn + 2 * stdDev, 30), worst: currentPrice * Math.pow(1 + avgReturn - 2 * stdDev, 30) }, days90: { expected: currentPrice * Math.pow(1 + avgReturn, 90), bull: currentPrice * Math.pow(1 + avgReturn + stdDev, 90), bear: currentPrice * Math.pow(1 + avgReturn - stdDev, 90) }, days252: { expected: currentPrice * Math.pow(1 + avgReturn, 252), bull: currentPrice * Math.pow(1 + avgReturn + stdDev, 252), bear: currentPrice * Math.pow(1 + avgReturn - stdDev, 252) } }; const highs = bars.map(b => b.high); const lows = bars.map(b => b.low); const priceRange = Math.max(...highs) - Math.min(...lows); const bucketSize = priceRange / 50; const volumeProfile: Record<number, number> = {}; for (const bar of bars) { const bucket = Math.floor(bar.close / bucketSize) * bucketSize; volumeProfile[bucket] = (volumeProfile[bucket] || 0) + bar.volume; } const levels = Object.entries(volumeProfile).map(([price, vol]) => ({ price: parseFloat(price), volume: vol })).sort((a, b) => b.volume - a.volume).slice(0, 5).map(l => l.price); return { type: 'price_targets', currentPrice, dailyReturn: avgReturn * 100, dailyVol: stdDev * 100, projections, keyLevels: levels.sort((a, b) => a - b), nearestSupport: levels.filter(l => l < currentPrice).sort((a, b) => b - a)[0] || null, nearestResistance: levels.filter(l => l > currentPrice).sort((a, b) => a - b)[0] || null }; }

// ========== CONDITIONAL PROBABILITY STUDIES ==========

// After Down X% - What happens after the stock drops by X%?
function studyAfterDownX(bars: PriceBar[], params?: Record<string, any>) {
  const threshold = params?.threshold || 2;
  const forwardDays = params?.forwardDays || [1, 3, 5, 10];
  const returns: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    returns.push(((bars[i].close - bars[i - 1].close) / bars[i - 1].close) * 100);
  }
  
  const downDays: { idx: number; drop: number }[] = [];
  for (let i = 0; i < returns.length; i++) {
    if (returns[i] <= -threshold) {
      downDays.push({ idx: i + 1, drop: returns[i] });
    }
  }
  
  const forwardReturns: Record<number, { returns: number[]; wins: number }> = {};
  for (const fd of forwardDays) {
    forwardReturns[fd] = { returns: [], wins: 0 };
  }
  
  for (const dd of downDays) {
    for (const fd of forwardDays) {
      if (dd.idx + fd < bars.length) {
        const ret = ((bars[dd.idx + fd].close - bars[dd.idx].close) / bars[dd.idx].close) * 100;
        forwardReturns[fd].returns.push(ret);
        if (ret > 0) forwardReturns[fd].wins++;
      }
    }
  }
  
  const analysis = Object.entries(forwardReturns).map(([days, data]) => ({
    days: parseInt(days),
    occurrences: data.returns.length,
    avgReturn: data.returns.length > 0 ? data.returns.reduce((a, b) => a + b, 0) / data.returns.length : 0,
    winRate: data.returns.length > 0 ? (data.wins / data.returns.length) * 100 : 0,
    median: data.returns.length > 0 ? [...data.returns].sort((a, b) => a - b)[Math.floor(data.returns.length / 2)] : 0,
    best: data.returns.length > 0 ? Math.max(...data.returns) : 0,
    worst: data.returns.length > 0 ? Math.min(...data.returns) : 0
  }));
  
  const recentEvents = downDays.slice(-10).map(dd => ({
    date: bars[dd.idx].date,
    drop: dd.drop.toFixed(2) + '%',
    nextDay: dd.idx + 1 < bars.length ? (((bars[dd.idx + 1].close - bars[dd.idx].close) / bars[dd.idx].close) * 100).toFixed(2) + '%' : 'N/A'
  }));
  
  return {
    type: 'after_down_x',
    params: { threshold, forwardDays },
    totalOccurrences: downDays.length,
    percentOfDays: (downDays.length / returns.length) * 100,
    avgDrop: downDays.length > 0 ? downDays.reduce((a, b) => a + b.drop, 0) / downDays.length : 0,
    analysis,
    recentEvents,
    insight: analysis[0]?.winRate > 55 ? `After ${threshold}%+ drops, stock tends to bounce (${analysis[0]?.winRate.toFixed(1)}% win rate next day)` :
             analysis[0]?.winRate < 45 ? `After ${threshold}%+ drops, stock often continues lower (${analysis[0]?.winRate.toFixed(1)}% win rate)` :
             `After ${threshold}%+ drops, next day is roughly 50/50`
  };
}

// After Up X% - What happens after the stock rises by X%?
function studyAfterUpX(bars: PriceBar[], params?: Record<string, any>) {
  const threshold = params?.threshold || 2;
  const forwardDays = params?.forwardDays || [1, 3, 5, 10];
  const returns: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    returns.push(((bars[i].close - bars[i - 1].close) / bars[i - 1].close) * 100);
  }
  
  const upDays: { idx: number; gain: number }[] = [];
  for (let i = 0; i < returns.length; i++) {
    if (returns[i] >= threshold) {
      upDays.push({ idx: i + 1, gain: returns[i] });
    }
  }
  
  const forwardReturns: Record<number, { returns: number[]; wins: number }> = {};
  for (const fd of forwardDays) {
    forwardReturns[fd] = { returns: [], wins: 0 };
  }
  
  for (const ud of upDays) {
    for (const fd of forwardDays) {
      if (ud.idx + fd < bars.length) {
        const ret = ((bars[ud.idx + fd].close - bars[ud.idx].close) / bars[ud.idx].close) * 100;
        forwardReturns[fd].returns.push(ret);
        if (ret > 0) forwardReturns[fd].wins++;
      }
    }
  }
  
  const analysis = Object.entries(forwardReturns).map(([days, data]) => ({
    days: parseInt(days),
    occurrences: data.returns.length,
    avgReturn: data.returns.length > 0 ? data.returns.reduce((a, b) => a + b, 0) / data.returns.length : 0,
    winRate: data.returns.length > 0 ? (data.wins / data.returns.length) * 100 : 0,
    median: data.returns.length > 0 ? [...data.returns].sort((a, b) => a - b)[Math.floor(data.returns.length / 2)] : 0,
    best: data.returns.length > 0 ? Math.max(...data.returns) : 0,
    worst: data.returns.length > 0 ? Math.min(...data.returns) : 0
  }));
  
  const recentEvents = upDays.slice(-10).map(ud => ({
    date: bars[ud.idx].date,
    gain: ud.gain.toFixed(2) + '%',
    nextDay: ud.idx + 1 < bars.length ? (((bars[ud.idx + 1].close - bars[ud.idx].close) / bars[ud.idx].close) * 100).toFixed(2) + '%' : 'N/A'
  }));
  
  return {
    type: 'after_up_x',
    params: { threshold, forwardDays },
    totalOccurrences: upDays.length,
    percentOfDays: (upDays.length / returns.length) * 100,
    avgGain: upDays.length > 0 ? upDays.reduce((a, b) => a + b.gain, 0) / upDays.length : 0,
    analysis,
    recentEvents,
    insight: analysis[0]?.winRate > 55 ? `After ${threshold}%+ gains, momentum continues (${analysis[0]?.winRate.toFixed(1)}% win rate next day)` :
             analysis[0]?.winRate < 45 ? `After ${threshold}%+ gains, stock often pulls back (${analysis[0]?.winRate.toFixed(1)}% win rate)` :
             `After ${threshold}%+ gains, next day is roughly 50/50`
  };
}

// After Consecutive Days - What happens after N consecutive up/down days?
function studyAfterConsecutiveDays(bars: PriceBar[], params?: Record<string, any>) {
  const consecutiveDays = params?.consecutiveDays || 3;
  const direction = params?.direction || 'down';
  const forwardDays = params?.forwardDays || [1, 3, 5];
  
  const returns: boolean[] = [];
  for (let i = 1; i < bars.length; i++) {
    returns.push(bars[i].close > bars[i - 1].close);
  }
  
  const streakEnds: number[] = [];
  let currentStreak = 0;
  const isTargetDirection = direction === 'up';
  
  for (let i = 0; i < returns.length; i++) {
    if (returns[i] === isTargetDirection) {
      currentStreak++;
    } else {
      if (currentStreak >= consecutiveDays) {
        streakEnds.push(i);
      }
      currentStreak = 0;
    }
  }
  if (currentStreak >= consecutiveDays) {
    streakEnds.push(returns.length);
  }
  
  const forwardReturns: Record<number, { returns: number[]; wins: number }> = {};
  for (const fd of forwardDays) {
    forwardReturns[fd] = { returns: [], wins: 0 };
  }
  
  for (const idx of streakEnds) {
    const barIdx = idx + 1;
    for (const fd of forwardDays) {
      if (barIdx + fd < bars.length) {
        const ret = ((bars[barIdx + fd].close - bars[barIdx].close) / bars[barIdx].close) * 100;
        forwardReturns[fd].returns.push(ret);
        if (ret > 0) forwardReturns[fd].wins++;
      }
    }
  }
  
  const analysis = Object.entries(forwardReturns).map(([days, data]) => ({
    days: parseInt(days),
    occurrences: data.returns.length,
    avgReturn: data.returns.length > 0 ? data.returns.reduce((a, b) => a + b, 0) / data.returns.length : 0,
    winRate: data.returns.length > 0 ? (data.wins / data.returns.length) * 100 : 0,
    median: data.returns.length > 0 ? [...data.returns].sort((a, b) => a - b)[Math.floor(data.returns.length / 2)] : 0
  }));
  
  return {
    type: 'after_consecutive_days',
    params: { consecutiveDays, direction, forwardDays },
    totalOccurrences: streakEnds.length,
    analysis,
    insight: direction === 'down' ? 
      (analysis[0]?.winRate > 55 ? `After ${consecutiveDays}+ down days, bounces are likely (${analysis[0]?.winRate.toFixed(1)}% win rate)` : `After ${consecutiveDays}+ down days, weakness may continue`) :
      (analysis[0]?.winRate > 55 ? `After ${consecutiveDays}+ up days, momentum continues (${analysis[0]?.winRate.toFixed(1)}% win rate)` : `After ${consecutiveDays}+ up days, pullbacks are likely`)
  };
}

// After High Volume Day - What happens after unusually high volume?
function studyAfterHighVolume(bars: PriceBar[], params?: Record<string, any>) {
  const volumeMultiplier = params?.volumeMultiplier || 2;
  const avgPeriod = params?.avgPeriod || 20;
  const forwardDays = params?.forwardDays || [1, 3, 5];
  
  const volumes = bars.map(b => b.volume);
  const highVolDays: { idx: number; volRatio: number; dayReturn: number }[] = [];
  
  for (let i = avgPeriod; i < bars.length; i++) {
    const avgVol = volumes.slice(i - avgPeriod, i).reduce((a, b) => a + b, 0) / avgPeriod;
    const volRatio = bars[i].volume / avgVol;
    if (volRatio >= volumeMultiplier) {
      const dayReturn = i > 0 ? ((bars[i].close - bars[i - 1].close) / bars[i - 1].close) * 100 : 0;
      highVolDays.push({ idx: i, volRatio, dayReturn });
    }
  }
  
  const upVolDays = highVolDays.filter(d => d.dayReturn > 0);
  const downVolDays = highVolDays.filter(d => d.dayReturn < 0);
  
  const analyzeForward = (days: { idx: number }[]) => {
    const results: Record<number, { returns: number[]; wins: number }> = {};
    for (const fd of forwardDays) {
      results[fd] = { returns: [], wins: 0 };
    }
    for (const d of days) {
      for (const fd of forwardDays) {
        if (d.idx + fd < bars.length) {
          const ret = ((bars[d.idx + fd].close - bars[d.idx].close) / bars[d.idx].close) * 100;
          results[fd].returns.push(ret);
          if (ret > 0) results[fd].wins++;
        }
      }
    }
    return Object.entries(results).map(([days, data]) => ({
      days: parseInt(days),
      avgReturn: data.returns.length > 0 ? data.returns.reduce((a, b) => a + b, 0) / data.returns.length : 0,
      winRate: data.returns.length > 0 ? (data.wins / data.returns.length) * 100 : 0,
      count: data.returns.length
    }));
  };
  
  return {
    type: 'after_high_volume',
    params: { volumeMultiplier, avgPeriod, forwardDays },
    totalHighVolDays: highVolDays.length,
    percentOfDays: (highVolDays.length / (bars.length - avgPeriod)) * 100,
    highVolUpDays: { count: upVolDays.length, avgGain: upVolDays.length > 0 ? upVolDays.reduce((a, b) => a + b.dayReturn, 0) / upVolDays.length : 0, forwardAnalysis: analyzeForward(upVolDays) },
    highVolDownDays: { count: downVolDays.length, avgLoss: downVolDays.length > 0 ? downVolDays.reduce((a, b) => a + b.dayReturn, 0) / downVolDays.length : 0, forwardAnalysis: analyzeForward(downVolDays) },
    recentEvents: highVolDays.slice(-10).map(d => ({ date: bars[d.idx].date, volRatio: d.volRatio.toFixed(1) + 'x', dayReturn: d.dayReturn.toFixed(2) + '%' }))
  };
}

// After Gap - What happens after gap up/down?
function studyAfterGap(bars: PriceBar[], params?: Record<string, any>) {
  const minGapPercent = params?.minGapPercent || 1;
  const forwardDays = params?.forwardDays || [1, 3, 5];
  
  const gapUps: { idx: number; gap: number }[] = [];
  const gapDowns: { idx: number; gap: number }[] = [];
  
  for (let i = 1; i < bars.length; i++) {
    const gapPercent = ((bars[i].open - bars[i - 1].close) / bars[i - 1].close) * 100;
    if (gapPercent >= minGapPercent) {
      gapUps.push({ idx: i, gap: gapPercent });
    } else if (gapPercent <= -minGapPercent) {
      gapDowns.push({ idx: i, gap: gapPercent });
    }
  }
  
  const analyzeGaps = (gaps: { idx: number; gap: number }[]) => {
    const results: Record<number, { returns: number[]; wins: number }> = {};
    for (const fd of forwardDays) {
      results[fd] = { returns: [], wins: 0 };
    }
    for (const g of gaps) {
      for (const fd of forwardDays) {
        if (g.idx + fd < bars.length) {
          const ret = ((bars[g.idx + fd].close - bars[g.idx].close) / bars[g.idx].close) * 100;
          results[fd].returns.push(ret);
          if (ret > 0) results[fd].wins++;
        }
      }
    }
    return Object.entries(results).map(([days, data]) => ({
      days: parseInt(days),
      avgReturn: data.returns.length > 0 ? data.returns.reduce((a, b) => a + b, 0) / data.returns.length : 0,
      winRate: data.returns.length > 0 ? (data.wins / data.returns.length) * 100 : 0,
      count: data.returns.length
    }));
  };
  
  // Check gap fill rate
  const gapUpFills = gapUps.filter(g => bars[g.idx].low <= bars[g.idx - 1].close).length;
  const gapDownFills = gapDowns.filter(g => bars[g.idx].high >= bars[g.idx - 1].close).length;
  
  return {
    type: 'after_gap',
    params: { minGapPercent, forwardDays },
    gapUps: { count: gapUps.length, avgGap: gapUps.length > 0 ? gapUps.reduce((a, b) => a + b.gap, 0) / gapUps.length : 0, fillRate: gapUps.length > 0 ? (gapUpFills / gapUps.length) * 100 : 0, forwardAnalysis: analyzeGaps(gapUps) },
    gapDowns: { count: gapDowns.length, avgGap: gapDowns.length > 0 ? gapDowns.reduce((a, b) => a + b.gap, 0) / gapDowns.length : 0, fillRate: gapDowns.length > 0 ? (gapDownFills / gapDowns.length) * 100 : 0, forwardAnalysis: analyzeGaps(gapDowns) },
    recentGapUps: gapUps.slice(-5).map(g => ({ date: bars[g.idx].date, gap: g.gap.toFixed(2) + '%' })),
    recentGapDowns: gapDowns.slice(-5).map(g => ({ date: bars[g.idx].date, gap: g.gap.toFixed(2) + '%' }))
  };
}

// Below Moving Average X% - What happens when price is X% below MA?
function studyBelowMA(bars: PriceBar[], params?: Record<string, any>) {
  const maPeriod = params?.maPeriod || 50;
  const threshold = params?.threshold || 5;
  const forwardDays = params?.forwardDays || [1, 5, 10, 20];
  
  const closes = bars.map(b => b.close);
  const sma = calculateSMA(closes, maPeriod);
  
  const belowMADays: { idx: number; deviation: number }[] = [];
  
  for (let i = maPeriod - 1; i < bars.length; i++) {
    const deviation = ((closes[i] - sma[i]) / sma[i]) * 100;
    if (deviation <= -threshold) {
      belowMADays.push({ idx: i, deviation });
    }
  }
  
  const forwardReturns: Record<number, { returns: number[]; wins: number }> = {};
  for (const fd of forwardDays) {
    forwardReturns[fd] = { returns: [], wins: 0 };
  }
  
  for (const d of belowMADays) {
    for (const fd of forwardDays) {
      if (d.idx + fd < bars.length) {
        const ret = ((bars[d.idx + fd].close - bars[d.idx].close) / bars[d.idx].close) * 100;
        forwardReturns[fd].returns.push(ret);
        if (ret > 0) forwardReturns[fd].wins++;
      }
    }
  }
  
  const analysis = Object.entries(forwardReturns).map(([days, data]) => ({
    days: parseInt(days),
    occurrences: data.returns.length,
    avgReturn: data.returns.length > 0 ? data.returns.reduce((a, b) => a + b, 0) / data.returns.length : 0,
    winRate: data.returns.length > 0 ? (data.wins / data.returns.length) * 100 : 0,
    median: data.returns.length > 0 ? [...data.returns].sort((a, b) => a - b)[Math.floor(data.returns.length / 2)] : 0
  }));
  
  const currentDeviation = sma.length > 0 ? ((closes[closes.length - 1] - sma[sma.length - 1]) / sma[sma.length - 1]) * 100 : 0;
  
  return {
    type: 'below_ma',
    params: { maPeriod, threshold, forwardDays },
    totalOccurrences: belowMADays.length,
    percentOfDays: (belowMADays.length / (bars.length - maPeriod + 1)) * 100,
    avgDeviation: belowMADays.length > 0 ? belowMADays.reduce((a, b) => a + b.deviation, 0) / belowMADays.length : 0,
    currentDeviation,
    currentlyBelow: currentDeviation <= -threshold,
    analysis,
    insight: analysis[1]?.winRate > 55 ? `When ${threshold}%+ below ${maPeriod}MA, bounces are likely (${analysis[1]?.winRate.toFixed(1)}% win rate over ${analysis[1]?.days} days)` :
             `Being ${threshold}%+ below ${maPeriod}MA doesn't strongly predict bounces in this stock`
  };
}

// After Drawdown X% - What happens after a drawdown of X% from peak?
function studyAfterDrawdown(bars: PriceBar[], params?: Record<string, any>) {
  const drawdownThreshold = params?.drawdownThreshold || 10;
  const forwardDays = params?.forwardDays || [5, 10, 20, 60];
  
  let peak = bars[0].close;
  const drawdownEvents: { idx: number; drawdown: number }[] = [];
  let inDrawdown = false;
  
  for (let i = 0; i < bars.length; i++) {
    if (bars[i].close > peak) {
      peak = bars[i].close;
      inDrawdown = false;
    }
    const drawdown = ((peak - bars[i].close) / peak) * 100;
    if (drawdown >= drawdownThreshold && !inDrawdown) {
      drawdownEvents.push({ idx: i, drawdown });
      inDrawdown = true;
    }
  }
  
  const forwardReturns: Record<number, { returns: number[]; wins: number }> = {};
  for (const fd of forwardDays) {
    forwardReturns[fd] = { returns: [], wins: 0 };
  }
  
  for (const d of drawdownEvents) {
    for (const fd of forwardDays) {
      if (d.idx + fd < bars.length) {
        const ret = ((bars[d.idx + fd].close - bars[d.idx].close) / bars[d.idx].close) * 100;
        forwardReturns[fd].returns.push(ret);
        if (ret > 0) forwardReturns[fd].wins++;
      }
    }
  }
  
  const analysis = Object.entries(forwardReturns).map(([days, data]) => ({
    days: parseInt(days),
    occurrences: data.returns.length,
    avgReturn: data.returns.length > 0 ? data.returns.reduce((a, b) => a + b, 0) / data.returns.length : 0,
    winRate: data.returns.length > 0 ? (data.wins / data.returns.length) * 100 : 0
  }));
  
  // Calculate current drawdown
  let currentPeak = bars[0].close;
  for (const bar of bars) {
    if (bar.close > currentPeak) currentPeak = bar.close;
  }
  const currentDrawdown = ((currentPeak - bars[bars.length - 1].close) / currentPeak) * 100;
  
  return {
    type: 'after_drawdown',
    params: { drawdownThreshold, forwardDays },
    totalOccurrences: drawdownEvents.length,
    currentDrawdown,
    currentlyInDrawdown: currentDrawdown >= drawdownThreshold,
    analysis,
    recentEvents: drawdownEvents.slice(-5).map(d => ({ date: bars[d.idx].date, drawdown: d.drawdown.toFixed(1) + '%' })),
    insight: analysis[2]?.winRate > 60 ? `After ${drawdownThreshold}%+ drawdowns, recovery is likely (${analysis[2]?.avgReturn.toFixed(1)}% avg return over ${analysis[2]?.days} days)` :
             `${drawdownThreshold}%+ drawdowns don't strongly predict quick recoveries`
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const startTime = Date.now();
    const { ticker, studyType, startDate, endDate, params }: StudyRequest = await req.json();
    if (!ticker || !studyType || !startDate || !endDate) return new Response(JSON.stringify({ error: 'Missing required parameters' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    let bars = await fetchPolygonBars(ticker.toUpperCase(), startDate, endDate);
    const useMockData = !bars;
    if (!bars) bars = generateMockBars(ticker.toUpperCase(), startDate, endDate);
    if (bars.length < 20) return new Response(JSON.stringify({ error: 'Insufficient data for analysis (need at least 20 bars)' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    let result: any;
    switch (studyType) {
      case 'daily_close_gt_open': result = studyCloseAboveOpen(bars); break;
      case 'daily_close_gt_prior': result = studyCloseAbovePrior(bars); break;
      case 'daily_return_distribution': result = studyReturnDistribution(bars); break;
      case 'up_down_streaks': result = studyStreaks(bars); break;
      case 'day_of_week_returns': result = studyDayOfWeek(bars); break;
      case 'month_of_year_returns': result = studyMonthOfYear(bars); break;
      case 'gap_analysis': result = studyGapAnalysis(bars); break;
      case 'volatility_analysis': result = studyVolatilityAnalysis(bars); break;
      case 'drawdown_analysis': result = studyDrawdownAnalysis(bars); break;
      case 'moving_average_analysis': result = studyMovingAverageAnalysis(bars, params); break;
      case 'volume_analysis': result = studyVolumeAnalysis(bars, params); break;
      case 'rsi_analysis': result = studyRSIAnalysis(bars, params); break;
      case 'mean_reversion': result = studyMeanReversion(bars, params); break;
      case 'range_analysis': result = studyRangeAnalysis(bars); break;
      case 'high_low_analysis': result = studyHighLowAnalysis(bars, params); break;
      case 'trend_strength': 
      case 'trend_analysis': result = studyTrendStrength(bars, params); break;
      case 'price_targets': result = studyPriceTargets(bars); break;
      case 'close_to_open_analysis': result = studyCloseToOpenAnalysis(bars, params); break;
      // Conditional probability studies
      case 'after_down_x': result = studyAfterDownX(bars, params); break;
      case 'after_up_x': result = studyAfterUpX(bars, params); break;
      case 'after_consecutive_days': result = studyAfterConsecutiveDays(bars, params); break;
      case 'after_high_volume': result = studyAfterHighVolume(bars, params); break;
      case 'after_gap': result = studyAfterGap(bars, params); break;
      case 'below_ma': result = studyBelowMA(bars, params); break;
      case 'after_drawdown': result = studyAfterDrawdown(bars, params); break;
      default: return new Response(JSON.stringify({ error: `Unknown study type: ${studyType}` }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({ success: true, result, barsAnalyzed: bars.length, useMockData, computationTimeMs: Date.now() - startTime, dateRange: { start: bars[0].date, end: bars[bars.length - 1].date } }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: any) {
    console.error('Study error:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
