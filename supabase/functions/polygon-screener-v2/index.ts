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

// Exchange codes used by Polygon (MIC codes)
const EXCHANGE_MAP: Record<string, string> = {
  NYSE: 'XNYS',
  NASDAQ: 'XNAS',
  AMEX: 'XASE',
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

  // If the server clearly didn't return JSON, don't attempt JSON.parse.
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

    // Build Polygon tickers endpoint query
    // NOTE: Polygon's /v3/reference/tickers does not provide a native "sector" filter.
    // We request a broad universe and then apply our own filters.
    // IMPORTANT: Polygon does NOT support sort=market_cap on this endpoint (will 400).
    const params = new URLSearchParams({
      market: 'stocks',
      active: 'true',
      // Use a stable, supported sort (or omit sorting entirely) and sort client-side later.
      sort: 'ticker',
      order: 'asc',
      limit: '1000',
      apiKey: POLYGON_API_KEY,
    });

    // Add exchange filter (UI uses NYSE/NASDAQ/AMEX; Polygon expects MIC codes)
    if (criteria.exchange?.length) {
      const mic = EXCHANGE_MAP[criteria.exchange[0]];
      if (mic) params.set('exchange', mic);
    }

    // Fetch tickers from Polygon
    const tickersUrl = `https://api.polygon.io/v3/reference/tickers?${params}`;
    const tickersRes = await fetch(tickersUrl);

    const { data: tickersData, error: tickersParseError, rawText: tickersRaw } = await safeJsonParse(tickersRes);

    if (tickersParseError || !tickersRes.ok) {
      const bodySnippet = (tickersRaw || '').slice(0, 220);
      console.error('Tickers API error:', tickersParseError, 'Status:', tickersRes.status, 'URL:', tickersUrl, 'Body snippet:', bodySnippet);
      return new Response(
        JSON.stringify({
          criteria,
          results: [],
          totalCount: 0,
          explanation: `Ticker universe fetch failed: ${tickersParseError || `HTTP ${tickersRes.status}`}`,
          source: 'polygon',
          timestamp: new Date().toISOString(),
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!tickersData?.results?.length) {
      return new Response(
        JSON.stringify({
          criteria,
          results: [],
          totalCount: 0,
          explanation: 'No stocks found matching criteria',
          source: 'polygon',
          timestamp: new Date().toISOString(),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Pre-filter the ticker universe BEFORE snapshots (improves relevance + avoids sampling bias)
    const sectorKeywordMap: Record<string, string[]> = {
      Technology: ['tech', 'software', 'semiconductor', 'computer', 'electronic', 'it'],
      Healthcare: ['health', 'medical', 'pharma', 'pharmaceutical', 'biotech', 'biotechnology'],
      'Financial Services': ['bank', 'financial', 'insurance', 'capital markets', 'brokerage'],
      'Consumer Cyclical': ['retail', 'auto', 'automotive', 'travel', 'leisure', 'apparel', 'restaurant'],
      'Consumer Defensive': ['food', 'beverage', 'household', 'personal products', 'tobacco'],
      'Communication Services': ['telecom', 'communications', 'media', 'entertainment'],
      Industrials: ['industrial', 'aerospace', 'defense', 'machinery', 'transportation', 'airline', 'logistics'],
      Energy: ['energy', 'oil', 'gas', 'petroleum', 'pipeline'],
      'Basic Materials': ['materials', 'chemical', 'mining', 'metals', 'paper', 'forest'],
      'Real Estate': ['real estate', 'reit', 'property'],
      Utilities: ['utility', 'utilities', 'electric', 'water', 'gas utility'],
    };

    const normalize = (v?: string | null) => (v ?? '').toLowerCase();
    const sectorMatches = (ticker: any, desiredSectors: string[]) => {
      if (!desiredSectors.length) return true;
      const sicDesc = normalize(ticker?.sic_description);
      const name = normalize(ticker?.name);

      // Polygon doesn't give a clean "sector" field in this endpoint; use SIC description heuristics.
      // Fallback to company name keywords when SIC data is missing.
      return desiredSectors.some((sectorName) => {
        const needles = sectorKeywordMap[sectorName] || [sectorName.toLowerCase()];
        if (sicDesc) return needles.some((needle) => sicDesc.includes(needle));
        if (name) return needles.some((needle) => name.includes(needle));
        return true; // don't over-filter if we have no text fields
      });
    };

    const industryMatches = (ticker: any, desiredIndustries: string[]) => {
      if (!desiredIndustries.length) return true;
      const sicDesc = normalize(ticker?.sic_description);
      const name = normalize(ticker?.name);
      if (sicDesc) return desiredIndustries.some((i) => sicDesc.includes(i.toLowerCase()));
      if (name) return desiredIndustries.some((i) => name.includes(i.toLowerCase()));
      return true;
    };

    let candidateTickers = tickersData.results as any[];

    const hasMarketCapData = candidateTickers.some(
      (t: any) => typeof t?.market_cap === 'number' && t.market_cap > 0
    );

    // Client-side sort by market cap (descending) when available.
    // Polygon's tickers endpoint may not include market_cap for all plans/fields.
    if (hasMarketCapData) {
      candidateTickers.sort((a: any, b: any) => (b.market_cap ?? 0) - (a.market_cap ?? 0));
    }

    // Market cap filters (only if market cap data is present).
    if (hasMarketCapData) {
      if (criteria.marketCap && MARKET_CAP_RANGES[criteria.marketCap]) {
        const range = MARKET_CAP_RANGES[criteria.marketCap];
        candidateTickers = candidateTickers.filter((t) => (t.market_cap ?? 0) >= range.min && (t.market_cap ?? 0) < range.max);
      }
      if (criteria.minMarketCap) {
        candidateTickers = candidateTickers.filter((t) => (t.market_cap ?? 0) >= criteria.minMarketCap!);
      }
      if (criteria.maxMarketCap) {
        candidateTickers = candidateTickers.filter((t) => (t.market_cap ?? 0) <= criteria.maxMarketCap!);
      }
    }

    // Sector / Industry filters (heuristic)
    if (criteria.sector?.length) {
      candidateTickers = candidateTickers.filter((t) => sectorMatches(t, criteria.sector!));
    }
    if (criteria.industry?.length) {
      candidateTickers = candidateTickers.filter((t) => industryMatches(t, criteria.industry!));
    }

    // Snapshot endpoint only supports up to 100 tickers per request.
    const tickers = candidateTickers.map((t: any) => t.ticker).filter(Boolean).slice(0, 100);

    if (!tickers.length) {
      return new Response(
        JSON.stringify({
          criteria,
          results: [],
          totalCount: 0,
          explanation: 'No stocks found matching criteria (after applying sector/market cap filters)',
          source: 'polygon',
          timestamp: new Date().toISOString(),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const snapshotsUrl = `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers?tickers=${tickers.join(',')}&apiKey=${POLYGON_API_KEY}`;
    const snapshotsRes = await fetch(snapshotsUrl);
    
    const { data: snapshotsData, error: snapshotsParseError } = await safeJsonParse(snapshotsRes);

    if (snapshotsParseError || !snapshotsRes.ok) {
      console.error('Snapshots API error:', snapshotsParseError, 'Status:', snapshotsRes.status);
      return new Response(
        JSON.stringify({
          criteria,
          results: [],
          totalCount: 0,
          explanation: `Snapshot fetch failed: ${snapshotsParseError || `HTTP ${snapshotsRes.status}`}`,
          source: 'polygon',
          timestamp: new Date().toISOString(),
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!snapshotsData?.tickers?.length) {
      return new Response(
        JSON.stringify({
          criteria,
          results: [],
          totalCount: 0,
          explanation: 'No snapshot data available',
          source: 'polygon',
          timestamp: new Date().toISOString(),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tickerBySymbol = new Map<string, any>(candidateTickers.map((t: any) => [t.ticker, t]));

    // Map and filter results
    let results = snapshotsData.tickers
      .map((snapshot: any) => {
        const ticker = tickerBySymbol.get(snapshot.ticker);
        const day = snapshot.day || {};
        const prevDay = snapshot.prevDay || {};
        const min = snapshot.min || {};
        
        const price = day.c || min.c || 0;
        const prevClose = prevDay.c || price;
        const change = price - prevClose;
        const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;
        const volume = day.v || 0;
        const avgVolume = prevDay.v || volume;
        const relativeVolume = avgVolume > 0 ? volume / avgVolume : 1;

        return {
          ticker: snapshot.ticker,
          company: ticker?.name || snapshot.ticker,
          sector: ticker?.sic_description || 'Unknown',
          industry: ticker?.sic_description || 'Unknown',
          country: 'US',
          exchange: ticker?.primary_exchange || 'Unknown',
          price,
          change,
          changePercent,
           volume,
           avgVolume,
           relativeVolume,
           marketCap: typeof ticker?.market_cap === 'number' ? ticker.market_cap : null,
           sharesOutstanding: typeof ticker?.share_class_shares_outstanding === 'number' ? ticker.share_class_shares_outstanding : 0,
           float: 0,
          floatShort: 0,
          pe: null,
          forwardPE: null,
          peg: null,
          ps: null,
          pb: null,
          evEbitda: null,
          dividendYield: null,
          roe: null,
          roa: null,
          netMargin: null,
          debtEquity: null,
          sma20: null,
          sma50: null,
          sma200: null,
          rsi: null,
          beta: null,
          atr: null,
          high52W: snapshot.max?.h || price,
          low52W: snapshot.min?.l || price,
          pctFrom52WkHigh: snapshot.max?.h ? ((price - snapshot.max.h) / snapshot.max.h) * 100 : 0,
          pctFrom52WkLow: snapshot.min?.l ? ((price - snapshot.min.l) / snapshot.min.l) * 100 : 0,
          perfToday: changePercent,
          perfWeek: null,
          perfMonth: null,
          perfQuarter: null,
          perfYear: null,
          perfYTD: null,
          matchScore: 100
        };
      })
      .filter((stock: any) => stock.price > 0);

    // Apply filters
    const hasResultMarketCap = results.some(
      (s: any) => typeof s.marketCap === 'number' && s.marketCap > 0
    );

    // Market cap filters only when market cap is available.
    if (hasResultMarketCap) {
      if (criteria.marketCap && MARKET_CAP_RANGES[criteria.marketCap]) {
        const range = MARKET_CAP_RANGES[criteria.marketCap];
        results = results.filter((s: any) => s.marketCap >= range.min && s.marketCap < range.max);
      }
      if (criteria.minMarketCap) {
        results = results.filter((s: any) => s.marketCap >= criteria.minMarketCap!);
      }
      if (criteria.maxMarketCap) {
        results = results.filter((s: any) => s.marketCap <= criteria.maxMarketCap!);
      }
    }
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
    return new Response(JSON.stringify({ 
      error: errorMessage,
      results: [],
      totalCount: 0
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
