import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Economic indicator definitions with FRED series IDs
const FRED_SERIES: Record<string, { name: string; format: string; description: string }> = {
  // Interest Rates
  fed_funds: { name: 'Fed Funds Rate', format: 'percent', description: 'Federal Funds Effective Rate' },
  FEDFUNDS: { name: 'Fed Funds Rate', format: 'percent', description: 'Federal Funds Effective Rate' },
  treasury_10y: { name: '10Y Treasury', format: 'percent', description: '10-Year Treasury Constant Maturity Rate' },
  DGS10: { name: '10Y Treasury', format: 'percent', description: '10-Year Treasury Constant Maturity Rate' },
  treasury_2y: { name: '2Y Treasury', format: 'percent', description: '2-Year Treasury Constant Maturity Rate' },
  DGS2: { name: '2Y Treasury', format: 'percent', description: '2-Year Treasury Constant Maturity Rate' },
  treasury_30y: { name: '30Y Treasury', format: 'percent', description: '30-Year Treasury Constant Maturity Rate' },
  DGS30: { name: '30Y Treasury', format: 'percent', description: '30-Year Treasury Constant Maturity Rate' },
  sofr: { name: 'SOFR', format: 'percent', description: 'Secured Overnight Financing Rate' },
  SOFR: { name: 'SOFR', format: 'percent', description: 'Secured Overnight Financing Rate' },
  prime_rate: { name: 'Prime Rate', format: 'percent', description: 'Bank Prime Loan Rate' },
  DPRIME: { name: 'Prime Rate', format: 'percent', description: 'Bank Prime Loan Rate' },
  ig_spread: { name: 'IG Spread', format: 'bps', description: 'ICE BofA US Corporate Index Option-Adjusted Spread' },
  BAMLC0A0CM: { name: 'IG Spread', format: 'bps', description: 'ICE BofA US Corporate Index Option-Adjusted Spread' },
  hy_spread: { name: 'HY Spread', format: 'bps', description: 'ICE BofA US High Yield Index Option-Adjusted Spread' },
  BAMLH0A0HYM2: { name: 'HY Spread', format: 'bps', description: 'ICE BofA US High Yield Index Option-Adjusted Spread' },
  yield_curve: { name: 'Yield Curve (10Y-2Y)', format: 'percent', description: '10-Year Treasury Constant Maturity Minus 2-Year' },
  T10Y2Y: { name: 'Yield Curve (10Y-2Y)', format: 'percent', description: '10-Year Treasury Constant Maturity Minus 2-Year' },
  breakeven_5y: { name: '5Y Breakeven', format: 'percent', description: '5-Year Breakeven Inflation Rate' },
  T5YIE: { name: '5Y Breakeven', format: 'percent', description: '5-Year Breakeven Inflation Rate' },

  // Economic Indicators
  gdp_growth: { name: 'GDP Growth', format: 'percent', description: 'Real GDP Growth Rate (Quarterly, Annualized)' },
  A191RL1Q225SBEA: { name: 'GDP Growth', format: 'percent', description: 'Real GDP Growth Rate (Quarterly, Annualized)' },
  cpi_yoy: { name: 'CPI (YoY)', format: 'percent', description: 'Consumer Price Index YoY Change' },
  CPIAUCSL: { name: 'CPI (YoY)', format: 'percent', description: 'Consumer Price Index YoY Change' },
  core_pce: { name: 'Core PCE', format: 'percent', description: 'Core PCE Price Index YoY Change' },
  PCEPILFE: { name: 'Core PCE', format: 'percent', description: 'Core PCE Price Index YoY Change' },
  unemployment: { name: 'Unemployment', format: 'percent', description: 'Civilian Unemployment Rate' },
  UNRATE: { name: 'Unemployment', format: 'percent', description: 'Civilian Unemployment Rate' },
  initial_claims: { name: 'Initial Claims', format: 'thousands', description: 'Initial Jobless Claims' },
  ICSA: { name: 'Initial Claims', format: 'thousands', description: 'Initial Jobless Claims' },
  consumer_sentiment: { name: 'Consumer Sentiment', format: 'index', description: 'University of Michigan Consumer Sentiment' },
  UMCSENT: { name: 'Consumer Sentiment', format: 'index', description: 'University of Michigan Consumer Sentiment' },
  housing_starts: { name: 'Housing Starts', format: 'millions', description: 'Housing Starts (Millions, SAAR)' },
  HOUST: { name: 'Housing Starts', format: 'millions', description: 'Housing Starts (Millions, SAAR)' },

  // Market Indicators
  sp500: { name: 'S&P 500', format: 'price', description: 'S&P 500 Index' },
  SP500: { name: 'S&P 500', format: 'price', description: 'S&P 500 Index' },
  vix: { name: 'VIX', format: 'index', description: 'CBOE Volatility Index' },
  VIXCLS: { name: 'VIX', format: 'index', description: 'CBOE Volatility Index' },
  dxy: { name: 'Dollar Index', format: 'index', description: 'Trade Weighted U.S. Dollar Index' },
  DTWEXBGS: { name: 'Dollar Index', format: 'index', description: 'Trade Weighted U.S. Dollar Index' },
  gold: { name: 'Gold', format: 'price', description: 'Gold Fixing Price (London)' },
  GOLDAMGBD228NLBM: { name: 'Gold', format: 'price', description: 'Gold Fixing Price (London)' },
  oil_wti: { name: 'WTI Crude', format: 'price', description: 'Crude Oil Prices: WTI' },
  DCOILWTICO: { name: 'WTI Crude', format: 'price', description: 'Crude Oil Prices: WTI' },
};

// Map internal IDs to FRED series IDs
const ID_TO_FRED: Record<string, string> = {
  fed_funds: 'FEDFUNDS',
  treasury_10y: 'DGS10',
  treasury_2y: 'DGS2',
  treasury_30y: 'DGS30',
  sofr: 'SOFR',
  prime_rate: 'DPRIME',
  ig_spread: 'BAMLC0A0CM',
  hy_spread: 'BAMLH0A0HYM2',
  yield_curve: 'T10Y2Y',
  breakeven_5y: 'T5YIE',
  gdp_growth: 'A191RL1Q225SBEA',
  cpi_yoy: 'CPIAUCSL',
  core_pce: 'PCEPILFE',
  unemployment: 'UNRATE',
  initial_claims: 'ICSA',
  consumer_sentiment: 'UMCSENT',
  housing_starts: 'HOUST',
  sp500: 'SP500',
  vix: 'VIXCLS',
  dxy: 'DTWEXBGS',
  gold: 'GOLDAMGBD228NLBM',
  oil_wti: 'DCOILWTICO',
};

interface HistoricalDataPoint {
  date: string;
  value: number;
}

async function fetchFredHistory(
  seriesId: string,
  apiKey: string,
  startDate: string,
  endDate: string
): Promise<HistoricalDataPoint[]> {
  try {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&observation_start=${startDate}&observation_end=${endDate}&sort_order=asc`;
    
    console.log(`[fetch-economic-history] Fetching ${seriesId} from ${startDate} to ${endDate}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`FRED API error for ${seriesId}: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    
    if (!data.observations) {
      return [];
    }
    
    return data.observations
      .filter((obs: any) => obs.value !== '.' && obs.value !== 'ND' && obs.value !== '')
      .map((obs: any) => ({
        date: obs.date,
        value: parseFloat(obs.value),
      }));
  } catch (error) {
    console.error(`Error fetching ${seriesId}:`, error);
    return [];
  }
}

function generateMockHistory(seriesId: string, startDate: string, endDate: string): HistoricalDataPoint[] {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const data: HistoricalDataPoint[] = [];
  
  // Base values for different series
  const baseValues: Record<string, number> = {
    FEDFUNDS: 5.0,
    DGS10: 4.0,
    DGS2: 4.5,
    DGS30: 4.2,
    UNRATE: 4.0,
    CPIAUCSL: 280,
    VIXCLS: 18,
    SP500: 5000,
    DCOILWTICO: 75,
    GOLDAMGBD228NLBM: 2000,
  };
  
  const baseValue = baseValues[seriesId] || 50;
  let currentValue = baseValue;
  
  const current = new Date(start);
  const seed = seriesId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  let seedOffset = 0;
  
  while (current <= end) {
    // Skip weekends for daily data
    if (current.getDay() !== 0 && current.getDay() !== 6) {
      const noise = (Math.sin(seed + seedOffset) * 0.02) - 0.01;
      currentValue = currentValue * (1 + noise);
      
      data.push({
        date: current.toISOString().split('T')[0],
        value: parseFloat(currentValue.toFixed(4)),
      });
      
      seedOffset++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return data;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const startTime = Date.now();
    const { seriesId, startDate, endDate, period } = await req.json();
    
    if (!seriesId) {
      return new Response(
        JSON.stringify({ success: false, error: 'seriesId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Calculate date range based on period if not provided
    const now = new Date();
    let start = startDate;
    let end = endDate || now.toISOString().split('T')[0];
    
    if (!start && period) {
      const startDateObj = new Date(now);
      switch (period) {
        case '1m':
          startDateObj.setMonth(startDateObj.getMonth() - 1);
          break;
        case '3m':
          startDateObj.setMonth(startDateObj.getMonth() - 3);
          break;
        case '6m':
          startDateObj.setMonth(startDateObj.getMonth() - 6);
          break;
        case '1y':
          startDateObj.setFullYear(startDateObj.getFullYear() - 1);
          break;
        case '2y':
          startDateObj.setFullYear(startDateObj.getFullYear() - 2);
          break;
        case '5y':
          startDateObj.setFullYear(startDateObj.getFullYear() - 5);
          break;
        case '10y':
          startDateObj.setFullYear(startDateObj.getFullYear() - 10);
          break;
        case 'max':
          startDateObj.setFullYear(startDateObj.getFullYear() - 30);
          break;
        default:
          startDateObj.setFullYear(startDateObj.getFullYear() - 1);
      }
      start = startDateObj.toISOString().split('T')[0];
    }
    
    if (!start) {
      const defaultStart = new Date(now);
      defaultStart.setFullYear(defaultStart.getFullYear() - 1);
      start = defaultStart.toISOString().split('T')[0];
    }
    
    // Get the actual FRED series ID
    const fredSeriesId = ID_TO_FRED[seriesId] || seriesId;
    const seriesInfo = FRED_SERIES[seriesId] || FRED_SERIES[fredSeriesId] || {
      name: seriesId,
      format: 'number',
      description: seriesId,
    };
    
    const fredApiKey = Deno.env.get('FRED_API_KEY');
    let data: HistoricalDataPoint[];
    let useMockData = false;
    
    if (fredApiKey) {
      data = await fetchFredHistory(fredSeriesId, fredApiKey, start, end);
      
      if (data.length === 0) {
        console.log(`[fetch-economic-history] No FRED data for ${fredSeriesId}, using mock`);
        data = generateMockHistory(fredSeriesId, start, end);
        useMockData = true;
      }
    } else {
      console.log(`[fetch-economic-history] No FRED API key, using mock data`);
      data = generateMockHistory(fredSeriesId, start, end);
      useMockData = true;
    }
    
    // Calculate statistics
    const values = data.map(d => d.value);
    const stats = values.length > 0 ? {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      first: values[0],
      last: values[values.length - 1],
      change: values.length > 1 ? values[values.length - 1] - values[0] : 0,
      changePercent: values.length > 1 && values[0] !== 0 
        ? ((values[values.length - 1] - values[0]) / Math.abs(values[0])) * 100 
        : 0,
    } : null;
    
    return new Response(
      JSON.stringify({
        success: true,
        seriesId: fredSeriesId,
        name: seriesInfo.name,
        description: seriesInfo.description,
        format: seriesInfo.format,
        data,
        stats,
        useMockData,
        dateRange: { start, end },
        dataPoints: data.length,
        computationTimeMs: Date.now() - startTime,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[fetch-economic-history] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
