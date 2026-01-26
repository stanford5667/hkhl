import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";

interface AnalystRecommendation {
  buy: number;
  hold: number;
  sell: number;
  strongBuy: number;
  strongSell: number;
  period: string;
}

interface PriceTarget {
  targetHigh: number;
  targetLow: number;
  targetMean: number;
  targetMedian: number;
  lastUpdated: string;
}

interface EarningsCalendarItem {
  date: string;
  epsActual: number | null;
  epsEstimate: number | null;
  hour: string;
  quarter: number;
  year: number;
  symbol: string;
}

interface BasicFinancials {
  dividendYieldIndicatedAnnual: number | null;
  beta: number | null;
  '52WeekHigh': number | null;
  '52WeekLow': number | null;
  peRatio: number | null;
  forwardPE: number | null;
  epsAnnual: number | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ticker, action = 'all' } = await req.json();
    
    if (!ticker) {
      return new Response(
        JSON.stringify({ success: false, error: 'Ticker is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('VITE_FINNHUB_API_KEY');
    if (!apiKey) {
      console.error('FINNHUB_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Finnhub API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[finnhub-ticker-fundamentals] Fetching data for ${ticker}`);

    // Fetch all data in parallel
    const [recommendations, priceTarget, earnings, basicFinancials] = await Promise.all([
      fetchRecommendations(apiKey, ticker),
      fetchPriceTarget(apiKey, ticker),
      fetchEarningsCalendar(apiKey, ticker),
      fetchBasicFinancials(apiKey, ticker),
    ]);

    // Process analyst rating
    const analystData = processAnalystRecommendations(recommendations);
    
    // Find next earnings date
    const nextEarnings = findNextEarnings(earnings);

    const result = {
      success: true,
      ticker,
      analyst: analystData,
      priceTarget: priceTarget,
      nextEarnings: nextEarnings,
      financials: basicFinancials,
      fetchedAt: new Date().toISOString(),
    };

    console.log(`[finnhub-ticker-fundamentals] Successfully fetched data for ${ticker}`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[finnhub-ticker-fundamentals] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Fast timeout fetch helper - fail fast to prevent blocking UI
async function fetchWithTimeout(url: string, timeoutMs = 5000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

async function fetchRecommendations(apiKey: string, ticker: string): Promise<AnalystRecommendation[]> {
  try {
    const url = `${FINNHUB_BASE_URL}/stock/recommendation?symbol=${ticker}&token=${apiKey}`;
    const response = await fetchWithTimeout(url, 4000);
    
    if (!response.ok) {
      console.error(`Finnhub recommendations error: ${response.status}`);
      return [];
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    return [];
  }
}

async function fetchPriceTarget(apiKey: string, ticker: string): Promise<PriceTarget | null> {
  try {
    const url = `${FINNHUB_BASE_URL}/stock/price-target?symbol=${ticker}&token=${apiKey}`;
    const response = await fetchWithTimeout(url, 4000);
    
    if (!response.ok) {
      console.error(`Finnhub price target error: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    if (!data.targetMean) return null;
    
    return {
      targetHigh: data.targetHigh,
      targetLow: data.targetLow,
      targetMean: data.targetMean,
      targetMedian: data.targetMedian,
      lastUpdated: data.lastUpdated,
    };
  } catch (error) {
    console.error('Error fetching price target:', error);
    return null;
  }
}

async function fetchEarningsCalendar(apiKey: string, ticker: string): Promise<EarningsCalendarItem[]> {
  try {
    // Get earnings for the next 90 days
    const from = new Date().toISOString().split('T')[0];
    const to = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const url = `${FINNHUB_BASE_URL}/calendar/earnings?from=${from}&to=${to}&symbol=${ticker}&token=${apiKey}`;
    const response = await fetchWithTimeout(url, 4000);
    
    if (!response.ok) {
      console.error(`Finnhub earnings calendar error: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    return data.earningsCalendar || [];
  } catch (error) {
    console.error('Error fetching earnings calendar:', error);
    return [];
  }
}

async function fetchBasicFinancials(apiKey: string, ticker: string): Promise<BasicFinancials | null> {
  try {
    const url = `${FINNHUB_BASE_URL}/stock/metric?symbol=${ticker}&metric=all&token=${apiKey}`;
    const response = await fetchWithTimeout(url, 4000);
    
    if (!response.ok) {
      console.error(`Finnhub basic financials error: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    const metrics = data.metric || {};
    
    return {
      dividendYieldIndicatedAnnual: metrics.dividendYieldIndicatedAnnual || null,
      beta: metrics.beta || null,
      '52WeekHigh': metrics['52WeekHigh'] || null,
      '52WeekLow': metrics['52WeekLow'] || null,
      peRatio: metrics.peExclExtraTTM || metrics.peTTM || null,
      forwardPE: metrics.forwardPE || null,
      epsAnnual: metrics.epsAnnual || metrics.epsInclExtraItemsTTM || null,
    };
  } catch (error) {
    console.error('Error fetching basic financials:', error);
    return null;
  }
}

function processAnalystRecommendations(recommendations: AnalystRecommendation[]): {
  rating: 'Strong Buy' | 'Buy' | 'Hold' | 'Sell' | 'Strong Sell' | null;
  score: number | null;
  totalAnalysts: number;
  breakdown: { strongBuy: number; buy: number; hold: number; sell: number; strongSell: number } | null;
} {
  if (!recommendations || recommendations.length === 0) {
    return { rating: null, score: null, totalAnalysts: 0, breakdown: null };
  }

  // Get the most recent recommendation
  const latest = recommendations[0];
  const total = latest.strongBuy + latest.buy + latest.hold + latest.sell + latest.strongSell;
  
  if (total === 0) {
    return { rating: null, score: null, totalAnalysts: 0, breakdown: null };
  }

  // Calculate weighted score (1-5 scale where 5 is Strong Buy)
  const weightedScore = (
    (latest.strongBuy * 5) +
    (latest.buy * 4) +
    (latest.hold * 3) +
    (latest.sell * 2) +
    (latest.strongSell * 1)
  ) / total;

  // Determine rating based on score
  let rating: 'Strong Buy' | 'Buy' | 'Hold' | 'Sell' | 'Strong Sell';
  if (weightedScore >= 4.5) rating = 'Strong Buy';
  else if (weightedScore >= 3.5) rating = 'Buy';
  else if (weightedScore >= 2.5) rating = 'Hold';
  else if (weightedScore >= 1.5) rating = 'Sell';
  else rating = 'Strong Sell';

  return {
    rating,
    score: Math.round(weightedScore * 100) / 100,
    totalAnalysts: total,
    breakdown: {
      strongBuy: latest.strongBuy,
      buy: latest.buy,
      hold: latest.hold,
      sell: latest.sell,
      strongSell: latest.strongSell,
    },
  };
}

function findNextEarnings(earnings: EarningsCalendarItem[]): {
  date: string;
  formatted: string;
  hour: string;
  quarter: number;
  year: number;
} | null {
  if (!earnings || earnings.length === 0) return null;

  const now = new Date();
  const futureEarnings = earnings
    .filter(e => new Date(e.date) >= now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (futureEarnings.length === 0) return null;

  const next = futureEarnings[0];
  const date = new Date(next.date);
  
  return {
    date: next.date,
    formatted: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    hour: next.hour || 'TBD',
    quarter: next.quarter,
    year: next.year,
  };
}
