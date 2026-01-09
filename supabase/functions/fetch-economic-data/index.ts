import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Economic indicator definitions with FRED series IDs
const INDICATORS = {
  // Interest Rates
  fed_funds: { 
    name: 'Fed Funds Rate', 
    category: 'rates', 
    fred: 'FEDFUNDS',
    format: 'percent',
    description: 'Federal Funds Effective Rate'
  },
  treasury_10y: { 
    name: '10Y Treasury', 
    category: 'rates', 
    fred: 'DGS10',
    format: 'percent',
    description: '10-Year Treasury Constant Maturity Rate'
  },
  treasury_2y: { 
    name: '2Y Treasury', 
    category: 'rates', 
    fred: 'DGS2',
    format: 'percent',
    description: '2-Year Treasury Constant Maturity Rate'
  },
  treasury_30y: { 
    name: '30Y Treasury', 
    category: 'rates', 
    fred: 'DGS30',
    format: 'percent',
    description: '30-Year Treasury Constant Maturity Rate'
  },
  sofr: { 
    name: 'SOFR', 
    category: 'rates', 
    fred: 'SOFR',
    format: 'percent',
    description: 'Secured Overnight Financing Rate'
  },
  prime_rate: { 
    name: 'Prime Rate', 
    category: 'rates', 
    fred: 'DPRIME',
    format: 'percent',
    description: 'Bank Prime Loan Rate'
  },
  ig_spread: { 
    name: 'IG Spread', 
    category: 'rates', 
    fred: 'BAMLC0A0CM',
    format: 'bps',
    description: 'ICE BofA US Corporate Index Option-Adjusted Spread'
  },
  hy_spread: { 
    name: 'HY Spread', 
    category: 'rates', 
    fred: 'BAMLH0A0HYM2',
    format: 'bps',
    description: 'ICE BofA US High Yield Index Option-Adjusted Spread'
  },
  
  // Economic Indicators
  gdp_growth: { 
    name: 'GDP Growth', 
    category: 'economic', 
    fred: 'A191RL1Q225SBEA',
    format: 'percent',
    description: 'Real GDP Growth Rate (Quarterly, Annualized)'
  },
  cpi_yoy: { 
    name: 'CPI (YoY)', 
    category: 'economic', 
    fred: 'CPIAUCSL',
    format: 'percent_change',
    description: 'Consumer Price Index YoY Change'
  },
  core_pce: { 
    name: 'Core PCE', 
    category: 'economic', 
    fred: 'PCEPILFE',
    format: 'percent_change',
    description: 'Core PCE Price Index YoY Change'
  },
  unemployment: { 
    name: 'Unemployment', 
    category: 'economic', 
    fred: 'UNRATE',
    format: 'percent',
    description: 'Civilian Unemployment Rate'
  },
  initial_claims: { 
    name: 'Initial Claims', 
    category: 'economic', 
    fred: 'ICSA',
    format: 'thousands',
    description: 'Initial Jobless Claims'
  },
  consumer_sentiment: { 
    name: 'Consumer Sentiment', 
    category: 'economic', 
    fred: 'UMCSENT',
    format: 'index',
    description: 'University of Michigan Consumer Sentiment'
  },
  pmi_manufacturing: { 
    name: 'ISM Manufacturing', 
    category: 'economic', 
    fred: 'MANEMP',
    format: 'index',
    description: 'ISM Manufacturing PMI'
  },
  housing_starts: { 
    name: 'Housing Starts', 
    category: 'economic', 
    fred: 'HOUST',
    format: 'millions',
    description: 'Housing Starts (Millions, SAAR)'
  },
  
  // Market Indicators
  sp500: { 
    name: 'S&P 500', 
    category: 'markets', 
    fred: 'SP500',
    format: 'price',
    description: 'S&P 500 Index'
  },
  vix: { 
    name: 'VIX', 
    category: 'markets', 
    fred: 'VIXCLS',
    format: 'index',
    description: 'CBOE Volatility Index'
  },
  dxy: { 
    name: 'Dollar Index', 
    category: 'markets', 
    fred: 'DTWEXBGS',
    format: 'index',
    description: 'Trade Weighted U.S. Dollar Index'
  },
  gold: { 
    name: 'Gold', 
    category: 'markets', 
    fred: 'GOLDAMGBD228NLBM',
    format: 'price',
    description: 'Gold Fixing Price (London)'
  },
  oil_wti: { 
    name: 'WTI Crude', 
    category: 'markets', 
    fred: 'DCOILWTICO',
    format: 'price',
    description: 'Crude Oil Prices: WTI'
  },
  
  // Yield Curve & Credit
  yield_curve: {
    name: 'Yield Curve (10Y-2Y)',
    category: 'rates',
    fred: 'T10Y2Y',
    format: 'percent',
    description: '10-Year Treasury Constant Maturity Minus 2-Year'
  },
  breakeven_5y: {
    name: '5Y Breakeven',
    category: 'rates',
    fred: 'T5YIE',
    format: 'percent',
    description: '5-Year Breakeven Inflation Rate'
  },
};

interface FredResponse {
  observations: Array<{
    date: string;
    value: string;
  }>;
}

async function fetchFredSeries(seriesId: string, apiKey: string, limit: number = 30): Promise<FredResponse | null> {
  try {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=${limit}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`FRED API error for ${seriesId}: ${response.status}`);
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error fetching ${seriesId}:`, error);
    return null;
  }
}

function parseValue(value: string): number | null {
  if (value === '.' || value === '' || value === 'ND') return null;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : parsed;
}

function calculateChange(current: number | null, previous: number | null, format: string): number {
  if (current === null || previous === null || previous === 0) return 0;
  
  if (format === 'percent_change') {
    return current - previous;
  }
  
  return ((current - previous) / Math.abs(previous)) * 100;
}

function formatValue(value: number | null, format: string): string {
  if (value === null) return 'N/A';
  
  switch (format) {
    case 'percent':
      return `${value.toFixed(2)}%`;
    case 'percent_change':
      return `${value.toFixed(1)}%`;
    case 'bps':
      return `${(value * 100).toFixed(0)} bps`;
    case 'thousands':
      return `${(value / 1000).toFixed(0)}K`;
    case 'millions':
      return `${value.toFixed(2)}M`;
    case 'price':
      return value >= 1000 ? `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : `$${value.toFixed(2)}`;
    case 'index':
      return value.toFixed(1);
    default:
      return value.toFixed(2);
  }
}

interface IndicatorResult {
  id: string;
  indicator_name: string;
  category: string;
  current_value: string;
  current_raw: number | null;
  previous_value: string;
  previous_raw: number | null;
  change_value: number;
  change_formatted: string;
  last_updated: string;
  description: string;
  source: string;
  trend: 'up' | 'down' | 'flat';
}

async function fetchAllIndicators(fredApiKey: string): Promise<IndicatorResult[]> {
  const results: IndicatorResult[] = [];
  
  const indicatorEntries = Object.entries(INDICATORS);
  const batchSize = 10;
  
  for (let i = 0; i < indicatorEntries.length; i += batchSize) {
    const batch = indicatorEntries.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async ([id, config]) => {
      if (!config.fred) return null;
      
      const data = await fetchFredSeries(config.fred, fredApiKey);
      if (!data?.observations?.length) return null;
      
      const validObs = data.observations.filter(o => o.value !== '.' && o.value !== 'ND');
      if (validObs.length < 2) return null;
      
      const currentObs = validObs[0];
      const previousObs = validObs[1];
      
      const currentRaw = parseValue(currentObs.value);
      const previousRaw = parseValue(previousObs.value);
      
      let changeValue = calculateChange(currentRaw, previousRaw, config.format);
      
      let trend: 'up' | 'down' | 'flat' = 'flat';
      if (changeValue > 0.01) trend = 'up';
      else if (changeValue < -0.01) trend = 'down';
      
      return {
        id,
        indicator_name: config.name,
        category: config.category,
        current_value: formatValue(currentRaw, config.format),
        current_raw: currentRaw,
        previous_value: formatValue(previousRaw, config.format),
        previous_raw: previousRaw,
        change_value: parseFloat(changeValue.toFixed(2)),
        change_formatted: `${changeValue >= 0 ? '+' : ''}${changeValue.toFixed(2)}%`,
        last_updated: currentObs.date,
        description: config.description || config.name,
        source: 'FRED',
        trend,
      } as IndicatorResult;
    });
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults.filter((r): r is IndicatorResult => r !== null));
    
    if (i + batchSize < indicatorEntries.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}

function generateMockIndicators(): IndicatorResult[] {
  const mockData: Record<string, { value: number; change: number }> = {
    fed_funds: { value: 5.33, change: 0 },
    treasury_10y: { value: 4.42, change: -0.08 },
    treasury_2y: { value: 4.28, change: -0.05 },
    treasury_30y: { value: 4.58, change: -0.03 },
    sofr: { value: 5.31, change: 0 },
    prime_rate: { value: 8.50, change: 0 },
    ig_spread: { value: 0.89, change: -0.02 },
    hy_spread: { value: 2.95, change: -0.08 },
    yield_curve: { value: 0.14, change: 0.03 },
    breakeven_5y: { value: 2.35, change: 0.02 },
    gdp_growth: { value: 2.8, change: 0.3 },
    cpi_yoy: { value: 2.9, change: -0.1 },
    core_pce: { value: 2.8, change: 0 },
    unemployment: { value: 4.2, change: 0.1 },
    initial_claims: { value: 219, change: -5 },
    consumer_sentiment: { value: 73.2, change: 1.4 },
    pmi_manufacturing: { value: 49.3, change: -0.5 },
    housing_starts: { value: 1.36, change: 0.02 },
    sp500: { value: 5942, change: 1.2 },
    vix: { value: 16.8, change: -2.1 },
    dxy: { value: 108.2, change: 0.4 },
    gold: { value: 2658, change: 0.8 },
    oil_wti: { value: 73.45, change: -1.5 },
  };
  
  return Object.entries(INDICATORS).map(([id, config]) => {
    const mock = mockData[id] || { value: 0, change: 0 };
    const currentRaw = mock.value;
    const previousRaw = mock.value - (mock.value * mock.change / 100);
    
    let trend: 'up' | 'down' | 'flat' = 'flat';
    if (mock.change > 0) trend = 'up';
    else if (mock.change < 0) trend = 'down';
    
    return {
      id,
      indicator_name: config.name,
      category: config.category,
      current_value: formatValue(currentRaw, config.format),
      current_raw: currentRaw,
      previous_value: formatValue(previousRaw, config.format),
      previous_raw: previousRaw,
      change_value: mock.change,
      change_formatted: `${mock.change >= 0 ? '+' : ''}${mock.change.toFixed(2)}%`,
      last_updated: new Date().toISOString().split('T')[0],
      description: config.description || config.name,
      source: 'Mock',
      trend,
    };
  });
}

async function fetchSectorPerformance(): Promise<any[]> {
  const sectors = [
    { name: 'Technology', symbol: 'XLK', ytd: 28.5 },
    { name: 'Financials', symbol: 'XLF', ytd: 32.1 },
    { name: 'Healthcare', symbol: 'XLV', ytd: 8.2 },
    { name: 'Industrials', symbol: 'XLI', ytd: 18.4 },
    { name: 'Consumer Disc.', symbol: 'XLY', ytd: 22.7 },
    { name: 'Energy', symbol: 'XLE', ytd: -2.8 },
    { name: 'Utilities', symbol: 'XLU', ytd: 24.1 },
    { name: 'Real Estate', symbol: 'XLRE', ytd: 5.3 },
    { name: 'Materials', symbol: 'XLB', ytd: 9.8 },
    { name: 'Comm. Services', symbol: 'XLC', ytd: 35.2 },
    { name: 'Consumer Staples', symbol: 'XLP', ytd: 15.6 },
  ];
  
  return sectors;
}

async function fetchYieldCurve(fredApiKey: string): Promise<any> {
  const maturities = [
    { name: '1M', fred: 'DGS1MO' },
    { name: '3M', fred: 'DGS3MO' },
    { name: '6M', fred: 'DGS6MO' },
    { name: '1Y', fred: 'DGS1' },
    { name: '2Y', fred: 'DGS2' },
    { name: '3Y', fred: 'DGS3' },
    { name: '5Y', fred: 'DGS5' },
    { name: '7Y', fred: 'DGS7' },
    { name: '10Y', fred: 'DGS10' },
    { name: '20Y', fred: 'DGS20' },
    { name: '30Y', fred: 'DGS30' },
  ];
  
  if (!fredApiKey) {
    return {
      curve: [
        { name: '1M', yield: 5.45 },
        { name: '3M', yield: 5.38 },
        { name: '6M', yield: 5.15 },
        { name: '1Y', yield: 4.68 },
        { name: '2Y', yield: 4.28 },
        { name: '5Y', yield: 4.18 },
        { name: '10Y', yield: 4.42 },
        { name: '30Y', yield: 4.58 },
      ],
      inverted: true,
      spread_10y_2y: 0.14,
    };
  }
  
  const promises = maturities.map(async (m) => {
    const data = await fetchFredSeries(m.fred, fredApiKey, 1);
    const value = data?.observations?.[0]?.value;
    return {
      name: m.name,
      yield: parseValue(value || '') || 0,
    };
  });
  
  const curve = await Promise.all(promises);
  const y2 = curve.find(c => c.name === '2Y')?.yield || 0;
  const y10 = curve.find(c => c.name === '10Y')?.yield || 0;
  
  return {
    curve: curve.filter(c => c.yield > 0),
    inverted: y2 > y10,
    spread_10y_2y: y10 - y2,
  };
}

function getEconomicCalendar(): any[] {
  const today = new Date();
  const events = [
    { 
      type: 'FOMC', 
      name: 'FOMC Meeting', 
      dates: ['2026-01-28', '2026-01-29', '2026-03-18', '2026-03-19', '2026-05-06', '2026-05-07'],
      importance: 'high'
    },
    { 
      type: 'CPI', 
      name: 'CPI Release', 
      dates: ['2026-01-14', '2026-02-12', '2026-03-12'],
      importance: 'high'
    },
    { 
      type: 'NFP', 
      name: 'Nonfarm Payrolls', 
      dates: ['2026-01-10', '2026-02-07', '2026-03-07'],
      importance: 'high'
    },
    { 
      type: 'GDP', 
      name: 'GDP Release', 
      dates: ['2026-01-30', '2026-02-27', '2026-03-27'],
      importance: 'medium'
    },
    { 
      type: 'PCE', 
      name: 'PCE Price Index', 
      dates: ['2026-01-31', '2026-02-28', '2026-03-28'],
      importance: 'high'
    },
  ];
  
  const upcoming: any[] = [];
  events.forEach(event => {
    event.dates.forEach(dateStr => {
      const date = new Date(dateStr);
      if (date >= today) {
        upcoming.push({
          type: event.type,
          name: event.name,
          date: dateStr,
          importance: event.importance,
          daysUntil: Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
        });
      }
    });
  });
  
  return upcoming.sort((a, b) => a.daysUntil - b.daysUntil).slice(0, 10);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const startTime = Date.now();
    const url = new URL(req.url);
    const dataType = url.searchParams.get('type') || 'all';
    
    const fredApiKey = Deno.env.get('FRED_API_KEY') || '';
    const useMockData = !fredApiKey;
    
    let response: any = {
      success: true,
      useMockData,
      timestamp: new Date().toISOString(),
    };
    
    switch (dataType) {
      case 'indicators':
        response.indicators = useMockData 
          ? generateMockIndicators() 
          : await fetchAllIndicators(fredApiKey);
        break;
        
      case 'yield_curve':
        response.yieldCurve = await fetchYieldCurve(fredApiKey);
        break;
        
      case 'sectors':
        response.sectors = await fetchSectorPerformance();
        break;
        
      case 'calendar':
        response.calendar = getEconomicCalendar();
        break;
        
      case 'all':
      default:
        const [indicators, yieldCurve, sectors] = await Promise.all([
          useMockData ? generateMockIndicators() : fetchAllIndicators(fredApiKey),
          fetchYieldCurve(fredApiKey),
          fetchSectorPerformance(),
        ]);
        
        response.indicators = indicators;
        response.yieldCurve = yieldCurve;
        response.sectors = sectors;
        response.calendar = getEconomicCalendar();
        
        response.byCategory = {
          rates: indicators.filter((i: any) => i.category === 'rates'),
          economic: indicators.filter((i: any) => i.category === 'economic'),
          markets: indicators.filter((i: any) => i.category === 'markets'),
        };
        break;
    }
    
    response.computationTimeMs = Date.now() - startTime;
    
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error: any) {
    console.error('Economic data error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        useMockData: true,
        indicators: generateMockIndicators(),
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
