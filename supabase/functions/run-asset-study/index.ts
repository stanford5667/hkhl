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
}

interface PriceBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Seeded random for consistent mock data per ticker
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
    // Skip weekends
    if (current.getDay() !== 0 && current.getDay() !== 6) {
      const dailyReturn = (seededRandom(seed + seedOffset) - 0.48) * 0.03;
      const open = price;
      const change = price * dailyReturn;
      const close = price + change;
      const high = Math.max(open, close) * (1 + seededRandom(seed + seedOffset + 1) * 0.01);
      const low = Math.min(open, close) * (1 - seededRandom(seed + seedOffset + 2) * 0.01);
      
      bars.push({
        date: current.toISOString().split('T')[0],
        open,
        high,
        low,
        close,
        volume: Math.floor(1000000 + seededRandom(seed + seedOffset + 3) * 5000000)
      });
      
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
    const url = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/1/day/${startDate}/${endDate}?adjusted=true&sort=asc&apiKey=${apiKey}`;
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

// Study implementations
function studyCloseAboveOpen(bars: PriceBar[]) {
  const upDays = bars.filter(b => b.close > b.open).length;
  const downDays = bars.filter(b => b.close < b.open).length;
  const unchanged = bars.length - upDays - downDays;
  
  return {
    type: 'percentage',
    percentage: (upDays / bars.length) * 100,
    up_days: upDays,
    down_days: downDays,
    unchanged,
    total_days: bars.length,
    label: 'of days closed above open'
  };
}

function studyCloseAbovePrior(bars: PriceBar[]) {
  let upDays = 0;
  let downDays = 0;
  
  for (let i = 1; i < bars.length; i++) {
    if (bars[i].close > bars[i - 1].close) upDays++;
    else if (bars[i].close < bars[i - 1].close) downDays++;
  }
  
  const total = bars.length - 1;
  return {
    type: 'percentage',
    percentage: (upDays / total) * 100,
    up_days: upDays,
    down_days: downDays,
    unchanged: total - upDays - downDays,
    total_days: total,
    label: 'of days closed above prior close'
  };
}

function studyReturnDistribution(bars: PriceBar[]) {
  const returns: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    returns.push(((bars[i].close - bars[i - 1].close) / bars[i - 1].close) * 100);
  }
  
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  
  const sorted = [...returns].sort((a, b) => a - b);
  const percentiles = {
    p5: sorted[Math.floor(sorted.length * 0.05)],
    p25: sorted[Math.floor(sorted.length * 0.25)],
    p50: sorted[Math.floor(sorted.length * 0.50)],
    p75: sorted[Math.floor(sorted.length * 0.75)],
    p95: sorted[Math.floor(sorted.length * 0.95)]
  };
  
  // Build histogram
  const bucketSize = 0.5;
  const histogram: { range: number; count: number }[] = [];
  const min = Math.floor(sorted[0]);
  const max = Math.ceil(sorted[sorted.length - 1]);
  
  for (let r = min; r <= max; r += bucketSize) {
    const count = returns.filter(ret => ret >= r && ret < r + bucketSize).length;
    if (count > 0) histogram.push({ range: r, count });
  }
  
  return {
    type: 'distribution',
    mean,
    stdDev,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    count: returns.length,
    percentiles,
    histogram
  };
}

function studyStreaks(bars: PriceBar[]) {
  const directions: boolean[] = [];
  for (let i = 1; i < bars.length; i++) {
    directions.push(bars[i].close > bars[i - 1].close);
  }
  
  let maxUp = 0, maxDown = 0;
  let currentUp = 0, currentDown = 0;
  const upStreaks: number[] = [];
  const downStreaks: number[] = [];
  
  for (const isUp of directions) {
    if (isUp) {
      currentUp++;
      if (currentDown > 0) {
        downStreaks.push(currentDown);
        maxDown = Math.max(maxDown, currentDown);
        currentDown = 0;
      }
    } else {
      currentDown++;
      if (currentUp > 0) {
        upStreaks.push(currentUp);
        maxUp = Math.max(maxUp, currentUp);
        currentUp = 0;
      }
    }
  }
  
  if (currentUp > 0) { upStreaks.push(currentUp); maxUp = Math.max(maxUp, currentUp); }
  if (currentDown > 0) { downStreaks.push(currentDown); maxDown = Math.max(maxDown, currentDown); }
  
  const avgUp = upStreaks.length > 0 ? upStreaks.reduce((a, b) => a + b, 0) / upStreaks.length : 0;
  const avgDown = downStreaks.length > 0 ? downStreaks.reduce((a, b) => a + b, 0) / downStreaks.length : 0;
  
  return {
    type: 'streaks',
    maxUpStreak: maxUp,
    maxDownStreak: maxDown,
    avgUpStreak: avgUp,
    avgDownStreak: avgDown,
    currentStreak: currentUp > 0 ? currentUp : currentDown,
    currentDirection: currentUp > 0 ? 'up' : 'down'
  };
}

function studyDayOfWeek(bars: PriceBar[]) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayStats: Record<number, { returns: number[]; wins: number; total: number }> = {};
  
  for (let d = 0; d < 7; d++) {
    dayStats[d] = { returns: [], wins: 0, total: 0 };
  }
  
  for (let i = 1; i < bars.length; i++) {
    const dayOfWeek = new Date(bars[i].date).getDay();
    const ret = ((bars[i].close - bars[i - 1].close) / bars[i - 1].close) * 100;
    dayStats[dayOfWeek].returns.push(ret);
    dayStats[dayOfWeek].total++;
    if (ret > 0) dayStats[dayOfWeek].wins++;
  }
  
  const stats = Object.entries(dayStats)
    .filter(([_, s]) => s.total > 0)
    .map(([day, s]) => ({
      name: days[parseInt(day)],
      avgReturn: s.returns.reduce((a, b) => a + b, 0) / s.returns.length,
      hitRate: (s.wins / s.total) * 100,
      count: s.total
    }));
  
  return { type: 'calendar', period: 'day_of_week', stats };
}

function studyMonthOfYear(bars: PriceBar[]) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthStats: Record<number, { returns: number[]; wins: number; total: number }> = {};
  
  for (let m = 0; m < 12; m++) {
    monthStats[m] = { returns: [], wins: 0, total: 0 };
  }
  
  // Calculate monthly returns
  let currentMonth = new Date(bars[0].date).getMonth();
  let monthStartPrice = bars[0].close;
  
  for (let i = 1; i < bars.length; i++) {
    const barMonth = new Date(bars[i].date).getMonth();
    if (barMonth !== currentMonth) {
      const ret = ((bars[i - 1].close - monthStartPrice) / monthStartPrice) * 100;
      monthStats[currentMonth].returns.push(ret);
      monthStats[currentMonth].total++;
      if (ret > 0) monthStats[currentMonth].wins++;
      
      currentMonth = barMonth;
      monthStartPrice = bars[i].open;
    }
  }
  
  const stats = Object.entries(monthStats)
    .filter(([_, s]) => s.total > 0)
    .map(([month, s]) => ({
      name: months[parseInt(month)],
      avgReturn: s.returns.length > 0 ? s.returns.reduce((a, b) => a + b, 0) / s.returns.length : 0,
      hitRate: s.total > 0 ? (s.wins / s.total) * 100 : 0,
      count: s.total
    }));
  
  return { type: 'calendar', period: 'month_of_year', stats };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const startTime = Date.now();
    const { ticker, studyType, startDate, endDate }: StudyRequest = await req.json();

    if (!ticker || !studyType || !startDate || !endDate) {
      return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Try to get real data, fall back to mock
    let bars = await fetchPolygonBars(ticker.toUpperCase(), startDate, endDate);
    const useMockData = !bars;
    
    if (!bars) {
      bars = generateMockBars(ticker.toUpperCase(), startDate, endDate);
    }

    if (bars.length < 5) {
      return new Response(JSON.stringify({ error: 'Insufficient data for analysis' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let result: any;
    
    switch (studyType) {
      case 'daily_close_gt_open':
        result = studyCloseAboveOpen(bars);
        break;
      case 'daily_close_gt_prior':
        result = studyCloseAbovePrior(bars);
        break;
      case 'daily_return_distribution':
        result = studyReturnDistribution(bars);
        break;
      case 'up_down_streaks':
        result = studyStreaks(bars);
        break;
      case 'day_of_week_returns':
        result = studyDayOfWeek(bars);
        break;
      case 'month_of_year_returns':
        result = studyMonthOfYear(bars);
        break;
      default:
        return new Response(JSON.stringify({ error: `Unknown study type: ${studyType}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    return new Response(JSON.stringify({
      success: true,
      result,
      barsAnalyzed: bars.length,
      useMockData,
      computationTimeMs: Date.now() - startTime
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Study error:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
