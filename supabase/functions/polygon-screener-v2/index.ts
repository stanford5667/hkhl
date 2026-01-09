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
    const params = new URLSearchParams({
      market: 'stocks',
      active: 'true',
      limit: '250',
      apiKey: POLYGON_API_KEY
    });

    // Add exchange filter
    if (criteria.exchange?.length) {
      params.set('exchange', criteria.exchange[0]);
    }

    // Fetch tickers from Polygon
    const tickersUrl = `https://api.polygon.io/v3/reference/tickers?${params}`;
    const tickersRes = await fetch(tickersUrl);
    const tickersData = await tickersRes.json();

    if (!tickersData.results?.length) {
      return new Response(JSON.stringify({
        criteria,
        results: [],
        totalCount: 0,
        explanation: 'No stocks found matching criteria',
        source: 'polygon',
        timestamp: new Date().toISOString()
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Get snapshots for all tickers (batch)
    const tickers = tickersData.results.map((t: any) => t.ticker).slice(0, 100);
    const snapshotsUrl = `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers?tickers=${tickers.join(',')}&apiKey=${POLYGON_API_KEY}`;
    const snapshotsRes = await fetch(snapshotsUrl);
    const snapshotsData = await snapshotsRes.json();

    if (!snapshotsData.tickers?.length) {
      return new Response(JSON.stringify({
        criteria,
        results: [],
        totalCount: 0,
        explanation: 'No snapshot data available',
        source: 'polygon',
        timestamp: new Date().toISOString()
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Map and filter results
    let results = snapshotsData.tickers
      .map((snapshot: any) => {
        const ticker = tickersData.results.find((t: any) => t.ticker === snapshot.ticker);
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
          marketCap: ticker?.market_cap || 0,
          sharesOutstanding: ticker?.share_class_shares_outstanding || 0,
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
