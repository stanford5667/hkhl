import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BASE_URL = "https://financialmodelingprep.com/api/v3";

// Cache for 1 hour (fundamentals don't change frequently)
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function getCached(key: string): unknown | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) {
    return entry.data;
  }
  cache.delete(key);
  return null;
}

function setCache(key: string, data: unknown): void {
  cache.set(key, { data, timestamp: Date.now() });
  if (cache.size > 100) {
    const oldest = [...cache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
    if (oldest) cache.delete(oldest[0]);
  }
}

interface IncomeStatement {
  date: string;
  symbol: string;
  revenue: number;
  netIncome: number;
  grossProfit: number;
  operatingIncome: number;
  ebitda: number;
  eps: number;
  period: string;
}

interface CompanyProfile {
  symbol: string;
  companyName: string;
  industry: string;
  sector: string;
  marketCap: number;
  price: number;
  description: string;
  country: string;
  exchange: string;
  ceo: string;
  employees: number;
  website: string;
}

interface ProductSegment {
  name: string;
  revenue: number;
  percentage: number;
}

interface FundamentalsResponse {
  profile: CompanyProfile | null;
  financials: IncomeStatement[];
  useMockData: boolean;
  source: string;
}

async function fetchIncomeStatements(symbol: string, apiKey: string): Promise<IncomeStatement[] | null> {
  const cacheKey = `income_${symbol}`;
  const cached = getCached(cacheKey);
  if (cached) {
    console.log(`[fmp] Cache hit for ${symbol} income statements`);
    return cached as IncomeStatement[];
  }

  const url = `${BASE_URL}/income-statement/${encodeURIComponent(symbol)}?period=annual&limit=5&apikey=${apiKey}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`FMP API error: ${response.status}`);
  }
  
  const data = await response.json();
  
  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }
  
  const results = data.map((item: any) => ({
    date: item.date,
    symbol: item.symbol,
    revenue: item.revenue || 0,
    netIncome: item.netIncome || 0,
    grossProfit: item.grossProfit || 0,
    operatingIncome: item.operatingIncome || 0,
    ebitda: item.ebitda || 0,
    eps: item.eps || 0,
    period: item.period || 'FY',
  }));
  
  setCache(cacheKey, results);
  return results;
}

async function fetchCompanyProfile(symbol: string, apiKey: string): Promise<CompanyProfile | null> {
  const cacheKey = `profile_${symbol}`;
  const cached = getCached(cacheKey);
  if (cached) {
    console.log(`[fmp] Cache hit for ${symbol} profile`);
    return cached as CompanyProfile;
  }

  const url = `${BASE_URL}/profile/${encodeURIComponent(symbol)}?apikey=${apiKey}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`FMP API error: ${response.status}`);
  }
  
  const data = await response.json();
  
  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }
  
  const item = data[0];
  const result: CompanyProfile = {
    symbol: item.symbol,
    companyName: item.companyName,
    industry: item.industry,
    sector: item.sector,
    marketCap: item.mktCap || 0,
    price: item.price || 0,
    description: item.description,
    country: item.country,
    exchange: item.exchange || item.exchangeShortName,
    ceo: item.ceo,
    employees: item.fullTimeEmployees || 0,
    website: item.website,
  };
  
  setCache(cacheKey, result);
  return result;
}

async function fetchProductSegments(symbol: string, apiKey: string): Promise<ProductSegment[]> {
  const cacheKey = `segments_${symbol}`;
  const cached = getCached(cacheKey);
  if (cached) {
    console.log(`[fmp] Cache hit for ${symbol} product segments`);
    return cached as ProductSegment[];
  }

  // Use v4 endpoint for product segmentation
  const url = `https://financialmodelingprep.com/api/v4/revenue-product-segmentation?symbol=${encodeURIComponent(symbol)}&period=annual&structure=flat&apikey=${apiKey}`;
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      console.warn(`[fmp] Product segmentation API returned ${response.status} for ${symbol}`);
      return [];
    }
    
    const data = await response.json();
    
    if (!Array.isArray(data) || data.length === 0) {
      return [];
    }

    // Get the most recent year's data
    const latestData = data[0];
    const segments: ProductSegment[] = [];
    let totalRevenue = 0;

    // Parse the flat structure - each entry has a date key with segment data
    for (const entry of data) {
      const dateKey = Object.keys(entry).find(k => k.match(/^\d{4}-\d{2}-\d{2}$/));
      if (dateKey && entry[dateKey]) {
        const segmentData = entry[dateKey];
        for (const [name, revenue] of Object.entries(segmentData)) {
          if (typeof revenue === 'number' && revenue > 0) {
            const existing = segments.find(s => s.name === name);
            if (!existing) {
              segments.push({ name, revenue, percentage: 0 });
              totalRevenue += revenue;
            }
          }
        }
        break; // Only use latest year
      }
    }

    // Calculate percentages
    if (totalRevenue > 0) {
      for (const segment of segments) {
        segment.percentage = (segment.revenue / totalRevenue) * 100;
      }
    }

    // Sort by revenue descending and limit to top 5
    const results = segments
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    setCache(cacheKey, results);
    return results;
  } catch (err) {
    console.error(`[fmp] Error fetching product segments for ${symbol}:`, err);
    return [];
  }
}

async function searchSymbols(query: string, apiKey: string): Promise<any[]> {
  const url = `${BASE_URL}/search?query=${encodeURIComponent(query)}&limit=10&apikey=${apiKey}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`FMP API error: ${response.status}`);
  }
  
  const data = await response.json();
  return Array.isArray(data) ? data.map((item: any) => ({
    symbol: item.symbol,
    name: item.name,
    exchange: item.exchangeShortName,
    type: item.type,
  })) : [];
}

// Generate mock data for demo purposes
function generateMockFinancials(symbol: string): IncomeStatement[] {
  const baseRevenue = {
    'AAPL': 383000000000,
    'MSFT': 211000000000,
    'GOOGL': 307000000000,
    'AMZN': 574000000000,
    'META': 134000000000,
    'TSLA': 96000000000,
    'NVDA': 60000000000,
    'JPM': 128000000000,
  }[symbol] || 10000000000;
  
  const years = ['2025', '2024', '2023', '2022', '2021'];
  const growthRates = [0.08, 0.12, 0.15, 0.10, 0.20];
  
  let revenue = baseRevenue;
  return years.map((year, i) => {
    const netMargin = 0.15 + Math.random() * 0.10;
    const result = {
      date: `${year}-12-31`,
      symbol,
      revenue,
      netIncome: Math.round(revenue * netMargin),
      grossProfit: Math.round(revenue * 0.40),
      operatingIncome: Math.round(revenue * 0.25),
      ebitda: Math.round(revenue * 0.30),
      eps: Math.round(revenue * netMargin / 1000000000 * 10) / 10,
      period: 'FY',
    };
    revenue = Math.round(revenue / (1 + growthRates[i]));
    return result;
  });
}

function generateMockProfile(symbol: string): CompanyProfile {
  const profiles: Record<string, Partial<CompanyProfile>> = {
    'AAPL': { companyName: 'Apple Inc.', industry: 'Consumer Electronics', sector: 'Technology', marketCap: 3500000000000 },
    'MSFT': { companyName: 'Microsoft Corporation', industry: 'Software—Infrastructure', sector: 'Technology', marketCap: 3100000000000 },
    'GOOGL': { companyName: 'Alphabet Inc.', industry: 'Internet Content & Information', sector: 'Communication Services', marketCap: 2300000000000 },
    'AMZN': { companyName: 'Amazon.com Inc.', industry: 'Internet Retail', sector: 'Consumer Cyclical', marketCap: 2100000000000 },
    'TSLA': { companyName: 'Tesla Inc.', industry: 'Auto Manufacturers', sector: 'Consumer Cyclical', marketCap: 750000000000 },
  };
  
  const profile = profiles[symbol] || { companyName: symbol, industry: 'Unknown', sector: 'Unknown', marketCap: 10000000000 };
  
  return {
    symbol,
    companyName: profile.companyName || symbol,
    industry: profile.industry || 'Unknown',
    sector: profile.sector || 'Unknown',
    marketCap: profile.marketCap || 10000000000,
    price: 150,
    description: `${profile.companyName} is a publicly traded company.`,
    country: 'US',
    exchange: 'NASDAQ',
    ceo: 'CEO Name',
    employees: 100000,
    website: `https://${symbol.toLowerCase()}.com`,
  };
}

function generateMockSegments(symbol: string): ProductSegment[] {
  const segmentsBySymbol: Record<string, ProductSegment[]> = {
    'AAPL': [
      { name: 'iPhone', revenue: 200000000000, percentage: 52 },
      { name: 'Services', revenue: 85000000000, percentage: 22 },
      { name: 'Mac', revenue: 35000000000, percentage: 9 },
      { name: 'iPad', revenue: 30000000000, percentage: 8 },
      { name: 'Wearables & Accessories', revenue: 33000000000, percentage: 9 },
    ],
    'MSFT': [
      { name: 'Intelligent Cloud', revenue: 87000000000, percentage: 41 },
      { name: 'Productivity & Business', revenue: 69000000000, percentage: 33 },
      { name: 'Personal Computing', revenue: 55000000000, percentage: 26 },
    ],
    'GOOGL': [
      { name: 'Google Search & Ads', revenue: 175000000000, percentage: 57 },
      { name: 'YouTube Ads', revenue: 31000000000, percentage: 10 },
      { name: 'Google Cloud', revenue: 33000000000, percentage: 11 },
      { name: 'Google Network', revenue: 32000000000, percentage: 10 },
      { name: 'Other Bets', revenue: 36000000000, percentage: 12 },
    ],
    'AMZN': [
      { name: 'Online Stores', revenue: 220000000000, percentage: 38 },
      { name: 'AWS', revenue: 90000000000, percentage: 16 },
      { name: 'Third-Party Seller Services', revenue: 140000000000, percentage: 24 },
      { name: 'Advertising', revenue: 47000000000, percentage: 8 },
      { name: 'Subscriptions', revenue: 40000000000, percentage: 7 },
    ],
    'TSLA': [
      { name: 'Automotive Sales', revenue: 78000000000, percentage: 81 },
      { name: 'Energy Generation', revenue: 6000000000, percentage: 6 },
      { name: 'Automotive Leasing', revenue: 2500000000, percentage: 3 },
      { name: 'Services & Other', revenue: 9500000000, percentage: 10 },
    ],
    'META': [
      { name: 'Advertising', revenue: 131000000000, percentage: 98 },
      { name: 'Reality Labs', revenue: 2000000000, percentage: 1 },
      { name: 'Other Revenue', revenue: 1000000000, percentage: 1 },
    ],
    'NVDA': [
      { name: 'Data Center', revenue: 47000000000, percentage: 78 },
      { name: 'Gaming', revenue: 10000000000, percentage: 17 },
      { name: 'Professional Visualization', revenue: 1500000000, percentage: 2 },
      { name: 'Automotive', revenue: 1500000000, percentage: 3 },
    ],
  };
  
  return segmentsBySymbol[symbol] || [
    { name: 'Primary Products', revenue: 5000000000, percentage: 60 },
    { name: 'Services', revenue: 2500000000, percentage: 30 },
    { name: 'Other', revenue: 800000000, percentage: 10 },
  ];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const FMP_API_KEY = Deno.env.get("FMP_API_KEY");
    
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'fundamentals';
    
    if (action === 'search') {
      const query = body.query || '';
      if (!query.trim()) {
        return new Response(JSON.stringify({ success: true, results: [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (!FMP_API_KEY) {
        // Return mock search results
        const mockResults = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'NVDA', 'JPM']
          .filter(s => s.toLowerCase().includes(query.toLowerCase()))
          .map(s => ({ symbol: s, name: generateMockProfile(s).companyName, exchange: 'NASDAQ', type: 'stock' }));
        
        return new Response(JSON.stringify({ 
          success: true, 
          results: mockResults,
          useMockData: true,
          source: "Demo Data",
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      const results = await searchSymbols(query, FMP_API_KEY);
      return new Response(JSON.stringify({ 
        success: true, 
        results,
        useMockData: false,
        source: "FMP",
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    if (action === 'fundamentals') {
      const symbol = (body.symbol || '').toUpperCase();
      if (!symbol) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Symbol is required' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      let useMockData = !FMP_API_KEY;
      let profile: CompanyProfile | null = null;
      let financials: IncomeStatement[] = [];
      
      if (FMP_API_KEY) {
        try {
          [profile, financials] = await Promise.all([
            fetchCompanyProfile(symbol, FMP_API_KEY),
            fetchIncomeStatements(symbol, FMP_API_KEY).then(r => r || []),
          ]);
          
          if (!profile && financials.length === 0) {
            useMockData = true;
            profile = generateMockProfile(symbol);
            financials = generateMockFinancials(symbol);
          }
        } catch (err) {
          console.error(`[fmp] Error fetching ${symbol}:`, err);
          useMockData = true;
          profile = generateMockProfile(symbol);
          financials = generateMockFinancials(symbol);
        }
      } else {
        profile = generateMockProfile(symbol);
        financials = generateMockFinancials(symbol);
      }
      
      const response: FundamentalsResponse = {
        profile,
        financials,
        useMockData,
        source: useMockData ? "Demo Data" : "FMP",
      };
      
      return new Response(JSON.stringify({
        success: true,
        ...response,
        cachedAt: new Date().toISOString(),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    if (action === 'segments') {
      const symbol = (body.symbol || '').toUpperCase();
      if (!symbol) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Symbol is required' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      let segments: ProductSegment[] = [];
      let useMockData = !FMP_API_KEY;
      
      if (FMP_API_KEY) {
        segments = await fetchProductSegments(symbol, FMP_API_KEY);
        
        // If no segments returned, use mock data
        if (segments.length === 0) {
          useMockData = true;
          segments = generateMockSegments(symbol);
        }
      } else {
        segments = generateMockSegments(symbol);
      }
      
      return new Response(JSON.stringify({
        success: true,
        segments,
        useMockData,
        source: useMockData ? "Demo Data" : "FMP",
        cachedAt: new Date().toISOString(),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: `Unknown action: ${action}` 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error("[fmp-fundamentals] Error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: String(error),
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
