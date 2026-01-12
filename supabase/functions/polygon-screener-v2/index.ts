import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScreenerCriteria {
  exchange?: string[];
  sector?: string[];
  industry?: string[];
  marketCap?: string;
  minMarketCap?: number;
  maxMarketCap?: number;
  minPrice?: number;
  maxPrice?: number;
  minVolume?: number;
  maxVolume?: number;
  minRelativeVolume?: number;
  minPE?: number;
  maxPE?: number;
  minDividendYield?: number;
  minROE?: number;
  maxDebtEquity?: number;
  minNetMargin?: number;
  minPerfToday?: number;
  maxPerfToday?: number;
  minPerfMonth?: number;
  highLow52W?: string;
  rsiFilter?: string;
  sma200?: string;
  sma50vs200?: string;
  minFloatShort?: number;
  minGapUp?: number;
  minGapDown?: number;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: string;
}

const MARKET_CAP_RANGES: Record<string, { min: number; max: number }> = {
  mega: { min: 200e9, max: Infinity },
  large: { min: 10e9, max: 200e9 },
  mid: { min: 2e9, max: 10e9 },
  small: { min: 300e6, max: 2e9 },
  micro: { min: 50e6, max: 300e6 },
  nano: { min: 0, max: 50e6 }
};

// Popular stocks fallback - ensures users always see results
const POPULAR_TICKERS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK.B', 'UNH', 'JNJ',
  'JPM', 'V', 'PG', 'XOM', 'HD', 'CVX', 'MA', 'ABBV', 'MRK', 'LLY',
  'PEP', 'KO', 'COST', 'AVGO', 'TMO', 'WMT', 'MCD', 'CSCO', 'ACN', 'ABT',
  'DHR', 'NKE', 'DIS', 'VZ', 'ADBE', 'TXN', 'CRM', 'NEE', 'PM', 'RTX',
  'CMCSA', 'WFC', 'BMY', 'ORCL', 'INTC', 'AMD', 'QCOM', 'UPS', 'T', 'BA',
  // Tech sector
  'NOW', 'INTU', 'AMAT', 'ADI', 'LRCX', 'KLAC', 'SNPS', 'CDNS', 'MRVL',
  // Healthcare sector
  'PFE', 'GILD', 'AMGN', 'ISRG', 'VRTX', 'REGN', 'BIIB', 'MRNA', 'ZTS', 'SYK',
  // Financial sector
  'GS', 'MS', 'BLK', 'SCHW', 'AXP', 'C', 'USB', 'PNC', 'TFC', 'COF',
  // Energy sector
  'SLB', 'EOG', 'MPC', 'PSX', 'VLO', 'OXY', 'KMI', 'WMB', 'HAL', 'DVN',
  // Consumer sector
  'SBUX', 'TGT', 'LOW', 'TJX', 'BKNG', 'MAR', 'CMG', 'YUM', 'ORLY', 'AZO'
];

// Sector to tickers mapping for better filtering
const SECTOR_TICKERS: Record<string, string[]> = {
  'Technology': ['AAPL', 'MSFT', 'GOOGL', 'NVDA', 'META', 'AVGO', 'CSCO', 'ADBE', 'CRM', 'ORCL', 'INTC', 'AMD', 'QCOM', 'TXN', 'NOW', 'INTU', 'AMAT', 'ADI', 'LRCX', 'KLAC', 'SNPS', 'CDNS', 'MRVL', 'MU', 'NXPI'],
  'Healthcare': ['UNH', 'JNJ', 'LLY', 'ABBV', 'MRK', 'PFE', 'TMO', 'ABT', 'DHR', 'BMY', 'AMGN', 'GILD', 'ISRG', 'VRTX', 'REGN', 'BIIB', 'MRNA', 'ZTS', 'SYK', 'MDT', 'BDX', 'EW', 'A', 'IQV', 'CI'],
  'Financial Services': ['JPM', 'V', 'MA', 'BAC', 'WFC', 'GS', 'MS', 'BLK', 'SCHW', 'AXP', 'C', 'USB', 'PNC', 'TFC', 'COF', 'CME', 'ICE', 'AON', 'MMC', 'MCO'],
  'Consumer Cyclical': ['AMZN', 'TSLA', 'HD', 'MCD', 'NKE', 'LOW', 'SBUX', 'TGT', 'TJX', 'BKNG', 'MAR', 'CMG', 'YUM', 'ORLY', 'AZO', 'ROST', 'DHI', 'LEN', 'GM', 'F'],
  'Communication Services': ['GOOGL', 'META', 'DIS', 'CMCSA', 'VZ', 'T', 'NFLX', 'TMUS', 'CHTR', 'EA', 'TTWO', 'WBD', 'PARA', 'OMC', 'IPG'],
  'Industrials': ['UPS', 'RTX', 'HON', 'UNP', 'BA', 'CAT', 'GE', 'DE', 'LMT', 'MMM', 'FDX', 'NSC', 'CSX', 'EMR', 'ITW', 'ETN', 'PH', 'ROK', 'JCI', 'GD'],
  'Consumer Defensive': ['PG', 'PEP', 'KO', 'COST', 'WMT', 'PM', 'MO', 'CL', 'MDLZ', 'KMB', 'GIS', 'K', 'HSY', 'SJM', 'CAG', 'KHC', 'STZ', 'TAP', 'BF.B', 'EL'],
  'Energy': ['XOM', 'CVX', 'SLB', 'EOG', 'MPC', 'PSX', 'VLO', 'OXY', 'KMI', 'WMB', 'HAL', 'DVN', 'COP', 'PXD', 'FANG', 'HES', 'BKR', 'MRO', 'APA', 'OVV'],
  'Utilities': ['NEE', 'DUK', 'SO', 'D', 'AEP', 'SRE', 'EXC', 'XEL', 'ED', 'PEG', 'WEC', 'ES', 'AWK', 'DTE', 'EIX', 'FE', 'PPL', 'CMS', 'AEE', 'EVRG'],
  'Real Estate': ['PLD', 'AMT', 'EQIX', 'CCI', 'PSA', 'SPG', 'O', 'WELL', 'DLR', 'AVB', 'EQR', 'VTR', 'ARE', 'MAA', 'UDR', 'ESS', 'PEAK', 'BXP', 'KIM', 'REG'],
  'Basic Materials': ['LIN', 'APD', 'SHW', 'FCX', 'ECL', 'NEM', 'DOW', 'NUE', 'PPG', 'DD', 'VMC', 'MLM', 'ALB', 'CTVA', 'CF', 'MOS', 'IFF', 'CE', 'EMN', 'LYB']
};

// Safe JSON parsing helper
async function safeJsonParse(
  response: Response
): Promise<{ data: any; error: string | null; rawText: string; contentType: string | null }> {
  const contentType = response.headers.get('content-type');
  const rawText = await response.text();

  if (!rawText || rawText.trim() === '') {
    return { data: null, error: 'Empty response from API', rawText: '', contentType };
  }

  if (contentType && !contentType.toLowerCase().includes('application/json')) {
    const snippet = rawText.slice(0, 220);
    return {
      data: null,
      error: `Non-JSON response (content-type: ${contentType}). Snippet: ${snippet}`,
      rawText,
      contentType,
    };
  }

  try {
    const data = JSON.parse(rawText);
    return { data, error: null, rawText, contentType };
  } catch (e) {
    const snippet = rawText.slice(0, 220);
    return {
      data: null,
      error: `${e instanceof Error ? e.message : 'JSON parse error'}; Snippet: ${snippet}`,
      rawText,
      contentType,
    };
  }
}

// Get tickers for screening based on criteria
function getTargetTickers(criteria: ScreenerCriteria): string[] {
  let tickers: string[] = [];

  // If sector is specified, use sector-specific tickers
  if (criteria.sector?.length) {
    for (const sector of criteria.sector) {
      const sectorTickers = SECTOR_TICKERS[sector];
      if (sectorTickers) {
        tickers.push(...sectorTickers);
      }
    }
    // Remove duplicates
    tickers = [...new Set(tickers)];
  }

  // If no sector specified or no tickers found, use popular tickers
  if (tickers.length === 0) {
    tickers = [...POPULAR_TICKERS];
  }

  return tickers.slice(0, 100); // Polygon snapshot limit
}

// Fetch individual ticker quotes as fallback
async function fetchTickerQuotes(tickers: string[], apiKey: string): Promise<any[]> {
  const results: any[] = [];
  
  // Try snapshot endpoint first (requires paid plan)
  try {
    const snapshotUrl = `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers?tickers=${tickers.join(',')}&apiKey=${apiKey}`;
    const response = await fetch(snapshotUrl);
    const { data, error } = await safeJsonParse(response);
    
    if (!error && data?.tickers?.length) {
      console.log(`Snapshot returned ${data.tickers.length} results`);
      return data.tickers;
    }
    
    // Log the error for debugging
    if (error) {
      console.log('Snapshot endpoint error (may need paid plan):', error);
    }
  } catch (e) {
    console.log('Snapshot endpoint failed:', e);
  }

  // Fallback: fetch individual previous day aggregates (works on free plan)
  console.log('Falling back to individual aggregates...');
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  // Skip weekends
  while (yesterday.getDay() === 0 || yesterday.getDay() === 6) {
    yesterday.setDate(yesterday.getDate() - 1);
  }

  // Batch fetch to avoid rate limits - do 10 at a time with small delays
  for (let i = 0; i < tickers.length; i += 10) {
    const batch = tickers.slice(i, i + 10);
    
    const batchResults = await Promise.all(
      batch.map(async (ticker) => {
        try {
          const url = `https://api.polygon.io/v2/aggs/ticker/${ticker}/prev?adjusted=true&apiKey=${apiKey}`;
          const response = await fetch(url);
          const { data } = await safeJsonParse(response);
          
          if (data?.results?.[0]) {
            const r = data.results[0];
            return {
              ticker,
              day: { c: r.c, h: r.h, l: r.l, o: r.o, v: r.v, vw: r.vw },
              prevDay: { c: r.c, v: r.v }, // Using same as prev since it's previous day data
              todaysChange: 0,
              todaysChangePerc: 0,
            };
          }
        } catch (e) {
          console.log(`Failed to fetch ${ticker}:`, e);
        }
        return null;
      })
    );

    results.push(...batchResults.filter(Boolean));
    
    // Small delay between batches to respect rate limits
    if (i + 10 < tickers.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return results;
}

// Generate mock/simulated data for tickers when API fails
function generateSimulatedData(tickers: string[]): any[] {
  // Simulated market data based on typical values
  const mockData: Record<string, { price: number; marketCap: number; sector: string }> = {
    'AAPL': { price: 185, marketCap: 2.9e12, sector: 'Technology' },
    'MSFT': { price: 378, marketCap: 2.8e12, sector: 'Technology' },
    'GOOGL': { price: 140, marketCap: 1.7e12, sector: 'Technology' },
    'AMZN': { price: 155, marketCap: 1.6e12, sector: 'Consumer Cyclical' },
    'NVDA': { price: 495, marketCap: 1.2e12, sector: 'Technology' },
    'META': { price: 360, marketCap: 920e9, sector: 'Technology' },
    'TSLA': { price: 245, marketCap: 780e9, sector: 'Consumer Cyclical' },
    'JPM': { price: 172, marketCap: 495e9, sector: 'Financial Services' },
    'V': { price: 275, marketCap: 520e9, sector: 'Financial Services' },
    'JNJ': { price: 156, marketCap: 375e9, sector: 'Healthcare' },
    'UNH': { price: 525, marketCap: 485e9, sector: 'Healthcare' },
    'XOM': { price: 105, marketCap: 420e9, sector: 'Energy' },
    'PG': { price: 152, marketCap: 358e9, sector: 'Consumer Defensive' },
    'HD': { price: 345, marketCap: 343e9, sector: 'Consumer Cyclical' },
    'MA': { price: 420, marketCap: 390e9, sector: 'Financial Services' },
  };

  return tickers.map(ticker => {
    const mock = mockData[ticker];
    const basePrice = mock?.price || 50 + Math.random() * 150;
    const change = (Math.random() - 0.5) * 6; // -3% to +3%
    const volume = Math.floor(1e6 + Math.random() * 50e6);
    
    return {
      ticker,
      company: ticker,
      sector: mock?.sector || 'Unknown',
      price: basePrice,
      change: basePrice * change / 100,
      changePercent: change,
      volume,
      avgVolume: volume * (0.8 + Math.random() * 0.4),
      relativeVolume: 0.8 + Math.random() * 1.5,
      marketCap: mock?.marketCap || (1e9 + Math.random() * 100e9),
      high52W: basePrice * 1.3,
      low52W: basePrice * 0.7,
      pctFrom52WkHigh: -5 - Math.random() * 20,
      pctFrom52WkLow: 10 + Math.random() * 30,
    };
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { criteria }: { criteria: ScreenerCriteria } = await req.json();
    const POLYGON_API_KEY = Deno.env.get('POLYGON_API_KEY');

    if (!POLYGON_API_KEY) {
      throw new Error('POLYGON_API_KEY not configured');
    }

    const limit = Math.min(criteria.limit || 50, 100);
    const offset = criteria.offset || 0;

    // Get target tickers based on criteria
    const targetTickers = getTargetTickers(criteria);
    console.log(`Screening ${targetTickers.length} tickers for criteria:`, JSON.stringify(criteria));

    // Fetch quotes
    let snapshots = await fetchTickerQuotes(targetTickers, POLYGON_API_KEY);
    
    // If still no data, use simulated data so user sees something
    if (!snapshots.length) {
      console.log('Using simulated data as fallback');
      const simData = generateSimulatedData(targetTickers);
      
      // Map to same format as processed results below
      let results = simData;
      
      // Apply filters to simulated data
      if (criteria.minPrice) {
        results = results.filter((s: any) => s.price >= criteria.minPrice!);
      }
      if (criteria.maxPrice) {
        results = results.filter((s: any) => s.price <= criteria.maxPrice!);
      }
      if (criteria.minPerfToday !== undefined) {
        results = results.filter((s: any) => s.changePercent >= criteria.minPerfToday!);
      }
      if (criteria.maxPerfToday !== undefined) {
        results = results.filter((s: any) => s.changePercent <= criteria.maxPerfToday!);
      }
      if (criteria.marketCap && MARKET_CAP_RANGES[criteria.marketCap]) {
        const range = MARKET_CAP_RANGES[criteria.marketCap];
        results = results.filter((s: any) => s.marketCap >= range.min && s.marketCap < range.max);
      }

      // Sort
      const sortBy = criteria.sortBy || 'volume';
      const sortOrder = criteria.sortOrder || 'desc';
      results.sort((a: any, b: any) => {
        const aVal = a[sortBy] ?? 0;
        const bVal = b[sortBy] ?? 0;
        return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
      });

      const totalCount = results.length;
      results = results.slice(offset, offset + limit);

      return new Response(JSON.stringify({
        criteria,
        results,
        totalCount,
        explanation: `Found ${totalCount} stocks (demo data - upgrade Polygon plan for live data)`,
        source: 'simulated',
        timestamp: new Date().toISOString()
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Process real snapshot data
    let results = snapshots.map((snapshot: any) => {
      const day = snapshot.day || {};
      const prevDay = snapshot.prevDay || {};
      
      const price = day.c || 0;
      const prevClose = prevDay.c || price;
      const change = snapshot.todaysChange ?? (price - prevClose);
      const changePercent = snapshot.todaysChangePerc ?? (prevClose > 0 ? (change / prevClose) * 100 : 0);
      const volume = day.v || 0;
      const avgVolume = prevDay.v || volume;
      const relativeVolume = avgVolume > 0 ? volume / avgVolume : 1;

      // Find sector from our mapping
      let sector = 'Unknown';
      for (const [sectorName, sectorTickers] of Object.entries(SECTOR_TICKERS)) {
        if (sectorTickers.includes(snapshot.ticker)) {
          sector = sectorName;
          break;
        }
      }

      return {
        ticker: snapshot.ticker,
        company: snapshot.ticker, // Will be enriched later if needed
        sector,
        industry: sector,
        country: 'US',
        exchange: 'US',
        price,
        change,
        changePercent,
        volume,
        avgVolume,
        relativeVolume,
        marketCap: null, // Not available from snapshot
        high52W: snapshot.max?.h || price * 1.2,
        low52W: snapshot.min?.l || price * 0.8,
        pctFrom52WkHigh: snapshot.max?.h ? ((price - snapshot.max.h) / snapshot.max.h) * 100 : -10,
        pctFrom52WkLow: snapshot.min?.l ? ((price - snapshot.min.l) / snapshot.min.l) * 100 : 10,
        perfToday: changePercent,
        matchScore: 100
      };
    }).filter((stock: any) => stock.price > 0);

    // Apply filters
    if (criteria.minPrice) {
      results = results.filter((s: any) => s.price >= criteria.minPrice!);
    }
    if (criteria.maxPrice) {
      results = results.filter((s: any) => s.price <= criteria.maxPrice!);
    }
    if (criteria.minVolume) {
      results = results.filter((s: any) => s.volume >= criteria.minVolume!);
    }
    if (criteria.minRelativeVolume) {
      results = results.filter((s: any) => s.relativeVolume >= criteria.minRelativeVolume!);
    }
    if (criteria.minPerfToday !== undefined) {
      results = results.filter((s: any) => s.changePercent >= criteria.minPerfToday!);
    }
    if (criteria.maxPerfToday !== undefined) {
      results = results.filter((s: any) => s.changePercent <= criteria.maxPerfToday!);
    }
    if (criteria.highLow52W === 'new_high') {
      results = results.filter((s: any) => s.pctFrom52WkHigh >= -5);
    }
    if (criteria.highLow52W === 'new_low') {
      results = results.filter((s: any) => s.pctFrom52WkLow <= 5);
    }

    // Sort results
    const sortBy = criteria.sortBy || 'volume';
    const sortOrder = criteria.sortOrder || 'desc';
    results.sort((a: any, b: any) => {
      const aVal = a[sortBy] ?? 0;
      const bVal = b[sortBy] ?? 0;
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });

    const totalCount = results.length;
    results = results.slice(offset, offset + limit);

    // Generate explanation
    const parts: string[] = [];
    if (criteria.marketCap) parts.push(`${criteria.marketCap} cap`);
    if (criteria.sector?.length) parts.push(criteria.sector.join('/'));
    if (criteria.minPerfToday !== undefined && criteria.minPerfToday > 0) parts.push('gaining');
    if (criteria.maxPerfToday !== undefined && criteria.maxPerfToday < 0) parts.push('declining');
    if (criteria.highLow52W === 'new_high') parts.push('at 52-week highs');
    if (criteria.minRelativeVolume && criteria.minRelativeVolume > 2) parts.push('unusual volume');
    
    const description = parts.length > 0 ? parts.join(' ') : 'matching';
    const explanation = `Found ${totalCount} ${description} stocks`;

    return new Response(JSON.stringify({
      criteria,
      results,
      totalCount,
      explanation,
      source: 'polygon',
      timestamp: new Date().toISOString()
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: unknown) {
    console.error('Screener error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Return simulated data on error so user sees something
    const fallbackTickers = POPULAR_TICKERS.slice(0, 20);
    const simResults = generateSimulatedData(fallbackTickers);
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      results: simResults,
      totalCount: simResults.length,
      explanation: `Showing ${simResults.length} popular stocks (API error: ${errorMessage})`,
      source: 'fallback',
      timestamp: new Date().toISOString()
    }), { 
      status: 200, // Return 200 so UI shows data
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
