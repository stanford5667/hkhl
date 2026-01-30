import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Extended CIK mappings for common tickers
const KNOWN_CIKS: Record<string, string> = {
  'AAPL': '0000320193', 'MSFT': '0000789019', 'GOOGL': '0001652044', 'GOOG': '0001652044',
  'AMZN': '0001018724', 'META': '0001326801', 'TSLA': '0001318605', 'NVDA': '0001045810',
  'JPM': '0000019617', 'V': '0001403161', 'JNJ': '0000200406', 'WMT': '0000104169',
  'PG': '0000080424', 'MA': '0001141391', 'UNH': '0000731766', 'HD': '0000354950',
  'BAC': '0000070858', 'DIS': '0001744489', 'NFLX': '0001065280', 'CRM': '0001108524',
  'INTC': '0000050863', 'AMD': '0000002488', 'PYPL': '0001633917', 'ADBE': '0000796343',
  'AMAT': '0000006951', 'MU': '0000723125', 'LRCX': '0000707549', 'KLAC': '0000319201',
  'CSCO': '0000858877', 'PEP': '0000077476', 'KO': '0000021344', 'NKE': '0000320187',
  'MRK': '0000310158', 'PFE': '0000078003', 'ABBV': '0001551152', 'TMO': '0000097745',
  'COST': '0000909832', 'ORCL': '0001341439', 'ACN': '0001467373', 'MCD': '0000063908',
  'ABT': '0000001800', 'VZ': '0000732712', 'T': '0000732717', 'QCOM': '0000804328',
  'TXN': '0000097476', 'AVGO': '0001730168', 'LLY': '0000059478', 'CVX': '0000093410',
  'XOM': '0000034088', 'WFC': '0000072971', 'GS': '0000886982', 'MS': '0000895421',
  'BLK': '0001364742', 'SCHW': '0000316709', 'AXP': '0000004962', 'IBM': '0000051143',
  'GE': '0000040545', 'CAT': '0000018230', 'RTX': '0000101829', 'BA': '0000012927',
  'LMT': '0000936468', 'HON': '0000773840', 'MMM': '0000066740', 'UPS': '0001090727',
  'FDX': '0001048911', 'DE': '0000315189', 'LOW': '0000060667', 'TGT': '0000027419',
  'SBUX': '0000829224', 'CMG': '0001058090', 'YUM': '0001041061', 'DPZ': '0001286681',
  'BKNG': '0001075531', 'MAR': '0001048286', 'HLT': '0001585689', 'LVS': '0001300514',
  'WYNN': '0001174922', 'MGM': '0000789570', 'F': '0000037996', 'GM': '0001467858',
  'TM': '0001094517', 'RIVN': '0001874178', 'LCID': '0001811210', 'NIO': '0001736541',
  'COIN': '0001679788', 'SQ': '0001512673', 'SHOP': '0001594805', 'SNOW': '0001640147',
  'PLTR': '0001321655', 'CRWD': '0001535527', 'ZS': '0001713683', 'DDOG': '0001561550',
  'NET': '0001477333', 'OKTA': '0001660134', 'MDB': '0001441816', 'TEAM': '0001650372',
  'NOW': '0001373715', 'WDAY': '0001327811', 'ZM': '0001585521', 'DOCU': '0001261333',
  'UBER': '0001543151', 'LYFT': '0001759509', 'ABNB': '0001559720', 'DASH': '0001792789',
  'SPOT': '0001639920', 'ROKU': '0001428439', 'TTD': '0001671933', 'SNAP': '0001564408',
  'PINS': '0001506293', 'EA': '0000712515', 'ATVI': '0000718877', 'TTWO': '0000946581',
  'RBLX': '0001315098', 'U': '0001810806', 'SE': '0001713445', 'MELI': '0001099590',
  'NU': '0001900715', 'BABA': '0001577552', 'JD': '0001549802', 'PDD': '0001737806',
  'BIDU': '0001329099', 'BILI': '0001723690', 'LI': '0001791706', 'XPEV': '0001810997',
  'LIN': '0001707925', 'GILD': '0000882095', 'SPGI': '0000064040', 'SYK': '0000310764',
  'ETN': '0000031462', 'WELL': '0000766704', 'PH': '0000076334', 'BMY': '0000014272',
  'CVS': '0000064803', 'ADP': '0000008670', 'ICE': '0001571949', 'SO': '0000092122',
  'HOOD': '0001783879', 'DUK': '0001326160', 'HWM': '0001854401', 'MNST': '0000865752',
  'EQIX': '0001101239', 'WMB': '0000107263', 'APO': '0001411494', 'CI': '0000701221',
  'PWR': '0001050915', 'MRVL': '0001058057', 'MSI': '0000068505', 'APD': '0000002969',
  'EOG': '0000821189', 'ADSK': '0000769397', 'AFL': '0000004977', 'VST': '0001584831',
  'MET': '0001099219', 'CAH': '0000721371', 'GWW': '0000277135', 'PSA': '0001393311',
  'EW': '0001099800', 'EXC': '0000008812', 'EBAY': '0001065088', 'AIG': '0000005272',
  'CL': '0000021665', 'CME': '0001156375', 'ZTS': '0001555280', 'MCK': '0000927653',
  'OXY': '0000797468', 'REGN': '0000872589', 'SLB': '0000087347', 'COP': '0001163165',
  'USB': '0000036104', 'PNC': '0000713676', 'TFC': '0000092230', 'COF': '0000927628',
  'AEP': '0000004904', 'D': '0000715957', 'SRE': '0001032208', 'FIS': '0001136893',
  'ITW': '0000049826', 'EMR': '0000032604', 'NSC': '0000702165', 'CSX': '0000277948',
  'KMI': '0001506307', 'WEC': '0000107815',
};

// In-memory cache for CIK lookups
let cikCache: Record<string, string> | null = null;

interface QuarterlyEarnings {
  symbol: string;
  report_date: string;
  fiscal_period: string;
  eps_actual: number | null;
  eps_estimate: number | null;
  eps_surprise_pct: number | null;
  revenue_actual: number | null;
  revenue_estimate: number | null;
  revenue_surprise_pct: number | null;
  price_before?: number | null;
  price_after?: number | null;
  price_change_pct?: number | null;
  return_1d?: number | null;
  return_5d?: number | null;
  return_1w?: number | null;
  return_2w?: number | null;
  return_1m?: number | null;
  return_3m?: number | null;
}

interface PriceBar {
  date: string;
  close: number;
}

// Return periods: 1D (1 day), 5D (5 days), 1W (5 days alias), 2W (10 days), 1M (21 days), 3M (63 days)
const RETURN_PERIODS = {
  return_1d: 1,
  return_5d: 5,
  return_1w: 5,
  return_2w: 10,
  return_1m: 21,
  return_3m: 63,
};

function isoDate(d: Date) {
  return d.toISOString().split('T')[0];
}

function calcPctChange(before: number, after: number): number {
  if (!before || before <= 0) return 0;
  return ((after - before) / before) * 100;
}

// Map ticker to CIK
async function getCIKFromTicker(ticker: string): Promise<string | null> {
  const upperTicker = ticker.toUpperCase();
  
  // Check known mappings first
  if (KNOWN_CIKS[upperTicker]) {
    console.log(`[SEC] Using known CIK for ${upperTicker}: ${KNOWN_CIKS[upperTicker]}`);
    return KNOWN_CIKS[upperTicker];
  }
  
  // Check cache
  if (cikCache && cikCache[upperTicker]) {
    return cikCache[upperTicker];
  }
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    const response = await fetch('https://www.sec.gov/files/company_tickers.json', {
      headers: { 'User-Agent': 'Asset Labs AI (chris@assetlabs.ai)' },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.error(`[SEC] CIK lookup failed with status ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    // Build cache from all entries
    cikCache = {};
    for (const entry of Object.values(data) as any[]) {
      if (entry.ticker) {
        cikCache[entry.ticker.toUpperCase()] = String(entry.cik_str).padStart(10, '0');
      }
    }
    
    return cikCache[upperTicker] || null;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.error('[SEC] CIK lookup timed out');
    } else {
      console.error('[SEC] Error fetching CIK:', err);
    }
    return null;
  }
}

// Fetch quarterly earnings directly from SEC XBRL API
async function fetchSECQuarterlyData(ticker: string, cik: string): Promise<QuarterlyEarnings[]> {
  console.log(`[SEC XBRL] Fetching quarterly data for ${ticker} (CIK: ${cik})...`);
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const factsUrl = `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`;
    const response = await fetch(factsUrl, {
      headers: { 'User-Agent': 'Asset Labs AI (chris@assetlabs.ai)' },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`[SEC XBRL] API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const facts = data.facts?.['us-gaap'];
    
    if (!facts) {
      console.error('[SEC XBRL] No us-gaap facts found');
      return [];
    }

    // EPS concepts to try (in priority order)
    const epsConcepts = [
      'EarningsPerShareDiluted',
      'EarningsPerShareBasic',
      'EarningsPerShareBasicAndDiluted'
    ];
    
    // Revenue concepts to try
    const revenueConcepts = [
      'Revenues',
      'RevenueFromContractWithCustomerExcludingAssessedTax',
      'SalesRevenueNet',
      'TotalRevenuesAndOtherIncome',
      'RevenueFromContractWithCustomerIncludingAssessedTax'
    ];

    // Extract quarterly (10-Q) filings
    const quarterlyData: Map<string, QuarterlyEarnings> = new Map();

    // Get EPS values from 10-Q filings
    for (const concept of epsConcepts) {
      const epsData = facts[concept]?.units?.['USD/shares'];
      if (!epsData) continue;

      for (const entry of epsData) {
        // Only quarterly (10-Q) filings
        if (entry.form !== '10-Q') continue;
        if (!entry.end || entry.val === undefined) continue;
        
        // Calculate fiscal period from the end date
        const endDate = new Date(entry.end);
        const quarter = Math.ceil((endDate.getMonth() + 1) / 3);
        const year = endDate.getFullYear();
        const fiscalPeriod = `Q${quarter} ${year}`;
        const key = `${ticker}-${entry.end}`;
        
        if (!quarterlyData.has(key)) {
          quarterlyData.set(key, {
            symbol: ticker,
            report_date: entry.end,
            fiscal_period: fiscalPeriod,
            eps_actual: entry.val,
            eps_estimate: null,
            eps_surprise_pct: null,
            revenue_actual: null,
            revenue_estimate: null,
            revenue_surprise_pct: null
          });
        }
      }
      
      if (quarterlyData.size > 0) break; // Found EPS data
    }

    // Get Revenue values from 10-Q filings  
    for (const concept of revenueConcepts) {
      const revenueData = facts[concept]?.units?.USD;
      if (!revenueData) continue;

      for (const entry of revenueData) {
        if (entry.form !== '10-Q') continue;
        if (!entry.end || entry.val === undefined) continue;
        
        const key = `${ticker}-${entry.end}`;
        
        if (quarterlyData.has(key)) {
          const existing = quarterlyData.get(key)!;
          if (!existing.revenue_actual) {
            existing.revenue_actual = entry.val;
          }
        }
      }
    }

    // Convert to array and sort by date (most recent first)
    const earnings = Array.from(quarterlyData.values())
      .sort((a, b) => new Date(b.report_date).getTime() - new Date(a.report_date).getTime())
      .slice(0, 12); // Last 12 quarters (3 years)

    console.log(`[SEC XBRL] Found ${earnings.length} quarterly earnings for ${ticker}`);
    return earnings;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.error('[SEC XBRL] Request timed out');
    } else {
      console.error('[SEC XBRL] Error:', err);
    }
    return [];
  }
}

// Fetch analyst estimates from Polygon
async function fetchEstimates(symbol: string, polygonApiKey: string | undefined): Promise<Map<string, { epsEstimate: number | null; revenueEstimate: number | null }>> {
  const estimates = new Map<string, { epsEstimate: number | null; revenueEstimate: number | null }>();
  
  if (!polygonApiKey) return estimates;
  
  try {
    // Fetch historical earnings with estimates
    const url = `https://api.polygon.io/vX/reference/financials?ticker=${symbol}&timeframe=quarterly&limit=16&sort=period_of_report_date&order=desc&apiKey=${polygonApiKey}`;
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    
    if (!response.ok) {
      console.warn(`[fetchEstimates] Polygon returned ${response.status}`);
      return estimates;
    }
    
    const data = await response.json();
    
    if (data.results && Array.isArray(data.results)) {
      for (const result of data.results) {
        const endDate = result.fiscal_period?.end_date || result.end_date;
        if (!endDate) continue;
        
        // Get EPS and revenue from the filing
        const income = result.financials?.income_statement;
        if (income) {
          // Use diluted EPS as the baseline
          const eps = income.diluted_earnings_per_share?.value;
          const revenue = income.revenues?.value;
          
          estimates.set(endDate, {
            epsEstimate: eps || null,
            revenueEstimate: revenue || null
          });
        }
      }
    }
    
    console.log(`[fetchEstimates] Found ${estimates.size} quarters with data for ${symbol}`);
  } catch (err) {
    console.error(`[fetchEstimates] Error:`, err);
  }
  
  return estimates;
}

// Fetch price bars from database or Polygon API
async function fetchPriceBars(
  supabase: any,
  symbol: string,
  startDate: string,
  endDate: string,
  polygonApiKey: string | undefined,
  targetDate?: string  // The date we need bars around
): Promise<PriceBar[]> {
  // First try database
  const { data: dbBars, error } = await supabase
    .from('market_daily_bars')
    .select('bar_date, close')
    .eq('ticker', symbol)
    .gte('bar_date', startDate)
    .lte('bar_date', endDate)
    .order('bar_date', { ascending: true })
    .limit(300);

  // Check if we have bars AND that some are on/before the target date
  const hasRelevantBars = dbBars && dbBars.length > 20 && 
    (!targetDate || dbBars.some((b: { bar_date: string }) => b.bar_date <= targetDate));

  if (!error && hasRelevantBars) {
    console.log(`[fetchPriceBars] Found ${dbBars.length} bars in DB for ${symbol}`);
    return dbBars.map((b: { bar_date: string; close: number }) => ({
      date: b.bar_date,
      close: Number(b.close),
    }));
  }

  console.log(`[fetchPriceBars] DB has ${dbBars?.length || 0} bars for ${symbol} (none before ${targetDate || startDate}), trying Polygon API...`);

  // Fallback to Polygon API
  if (!polygonApiKey) {
    console.warn(`[fetchPriceBars] No Polygon API key available, cannot fetch price data`);
    return [];
  }

  try {
    const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/day/${startDate}/${endDate}?adjusted=true&sort=asc&limit=500&apiKey=${polygonApiKey}`;
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    
    if (!response.ok) {
      console.warn(`[fetchPriceBars] Polygon API returned ${response.status} for ${symbol}`);
      return [];
    }
    
    const data = await response.json();
    
    if (!data.results || !Array.isArray(data.results)) {
      console.warn(`[fetchPriceBars] Polygon returned no results for ${symbol}`);
      return [];
    }
    
    console.log(`[fetchPriceBars] Got ${data.results.length} bars from Polygon for ${symbol}`);
    
    return data.results.map((bar: { t: number; c: number }) => ({
      date: new Date(bar.t).toISOString().split('T')[0],
      close: bar.c,
    }));
  } catch (err) {
    console.error(`[fetchPriceBars] Polygon API error for ${symbol}:`, err);
    return [];
  }
}

// Compute multi-period returns around an earnings date
async function computeReturns(
  supabase: any,
  symbol: string,
  reportDate: string,
  polygonApiKey: string | undefined,
): Promise<{
  price_before: number | null;
  price_after: number | null;
  price_change_pct: number | null;
  return_1d: number | null;
  return_5d: number | null;
  return_1w: number | null;
  return_2w: number | null;
  return_1m: number | null;
  return_3m: number | null;
}> {
  const result = {
    price_before: null as number | null,
    price_after: null as number | null,
    price_change_pct: null as number | null,
    return_1d: null as number | null,
    return_5d: null as number | null,
    return_1w: null as number | null,
    return_2w: null as number | null,
    return_1m: null as number | null,
    return_3m: null as number | null,
  };

  // Calculate date range: 30 days before to 180 days after
  const start = new Date(reportDate + 'T00:00:00Z');
  start.setUTCDate(start.getUTCDate() - 30);
  const end = new Date(reportDate + 'T00:00:00Z');
  end.setUTCDate(end.getUTCDate() + 180);

  const bars = await fetchPriceBars(supabase, symbol, isoDate(start), isoDate(end), polygonApiKey, reportDate);

  if (bars.length < 8) return result;

  // Find the last trading day on or before report date
  let idxBefore = -1;
  for (let i = 0; i < bars.length; i++) {
    if (bars[i].date <= reportDate) idxBefore = i;
  }

  if (idxBefore < 0) return result;

  const before = Number(bars[idxBefore].close);
  if (!Number.isFinite(before) || before <= 0) return result;

  result.price_before = before;

  // Calculate returns for each period
  for (const [key, days] of Object.entries(RETURN_PERIODS)) {
    const idxAfter = idxBefore + days;
    if (idxAfter < bars.length) {
      const after = Number(bars[idxAfter].close);
      if (Number.isFinite(after)) {
        const returnValue = calcPctChange(before, after);
        
        // Explicitly set each return period
        if (key === 'return_1d') result.return_1d = returnValue;
        else if (key === 'return_5d') result.return_5d = returnValue;
        else if (key === 'return_1w') {
          result.return_1w = returnValue;
          result.price_after = after;
          result.price_change_pct = returnValue;
        }
        else if (key === 'return_2w') result.return_2w = returnValue;
        else if (key === 'return_1m') result.return_1m = returnValue;
        else if (key === 'return_3m') result.return_3m = returnValue;
      }
    }
  }

  return result;
}

// Store earnings in database using upsert to handle duplicates
async function storeEarnings(
  supabase: any,
  earnings: QuarterlyEarnings[]
): Promise<number> {
  if (earnings.length === 0) return 0;

  let stored = 0;
  
  for (const earning of earnings) {
    try {
      const { error } = await supabase
        .from('earnings_history')
        .upsert({
          symbol: earning.symbol,
          report_date: earning.report_date,
          fiscal_period: earning.fiscal_period,
          eps_actual: earning.eps_actual,
          eps_estimate: earning.eps_estimate,
          eps_surprise_pct: earning.eps_surprise_pct,
          revenue_actual: earning.revenue_actual,
          revenue_estimate: earning.revenue_estimate,
          revenue_surprise_pct: earning.revenue_surprise_pct,
          price_before: earning.price_before,
          price_after: earning.price_after,
          price_change_pct: earning.price_change_pct,
          return_1d: earning.return_1d,
          return_5d: earning.return_5d,
          return_1w: earning.return_1w,
          return_2w: earning.return_2w,
          return_1m: earning.return_1m,
          return_3m: earning.return_3m,
        }, { onConflict: 'symbol,report_date' });

      if (!error) stored++;
      else console.warn(`[backfill-earnings-history] Upsert error for ${earning.symbol} ${earning.fiscal_period}:`, error.message);
    } catch (err) {
      console.warn(`[backfill-earnings-history] Upsert exception:`, err);
    }
  }

  return stored;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const symbolRaw = String(body?.symbol || '').trim();

    if (!symbolRaw) {
      return new Response(JSON.stringify({ success: false, error: 'symbol is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const symbol = symbolRaw.toUpperCase();

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const POLYGON_API_KEY = Deno.env.get('POLYGON_API_KEY');

    if (!SUPABASE_URL) throw new Error('SUPABASE_URL is not configured');
    if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Step 1: Get CIK for ticker
    const cik = await getCIKFromTicker(symbol);
    if (!cik) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'CIK not found for ticker',
        symbol 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 2: Fetch quarterly earnings from SEC XBRL
    const earnings = await fetchSECQuarterlyData(symbol, cik);
    
    if (earnings.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'No quarterly earnings found in SEC filings',
        symbol,
        cik 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 3: Fetch estimates from earnings_calendar or calculate from prior years
    const { data: calendarEstimates } = await supabase
      .from('earnings_calendar')
      .select('report_date, eps_estimate, revenue_estimate')
      .eq('symbol', symbol);
    
    const estimateMap = new Map<string, { eps: number | null; revenue: number | null }>();
    if (calendarEstimates) {
      for (const e of calendarEstimates) {
        estimateMap.set(e.report_date, { eps: e.eps_estimate, revenue: e.revenue_estimate });
      }
    }
    console.log(`[backfill-earnings-history] Found ${estimateMap.size} estimates from earnings_calendar`);

    // Step 4: Compute price returns for each earnings date
    console.log(`[backfill-earnings-history] Computing returns for ${earnings.length} quarters...`);
    
    for (const earning of earnings) {
      // Try to get estimate from calendar
      const estimate = estimateMap.get(earning.report_date);
      if (estimate?.eps) {
        earning.eps_estimate = estimate.eps;
        if (earning.eps_actual != null && estimate.eps !== 0) {
          earning.eps_surprise_pct = ((earning.eps_actual - estimate.eps) / Math.abs(estimate.eps)) * 100;
        }
      }
      if (estimate?.revenue) {
        earning.revenue_estimate = estimate.revenue;
        if (earning.revenue_actual != null && estimate.revenue !== 0) {
          earning.revenue_surprise_pct = ((earning.revenue_actual - estimate.revenue) / estimate.revenue) * 100;
        }
      }
      
      const returns = await computeReturns(supabase, symbol, earning.report_date, POLYGON_API_KEY);
      earning.price_before = returns.price_before;
      earning.price_after = returns.price_after;
      earning.price_change_pct = returns.price_change_pct;
      earning.return_1d = returns.return_1d;
      earning.return_5d = returns.return_5d;
      earning.return_1w = returns.return_1w;
      earning.return_2w = returns.return_2w;
      earning.return_1m = returns.return_1m;
      earning.return_3m = returns.return_3m;
      
      console.log(`[backfill-earnings-history] ${symbol} ${earning.fiscal_period}: EPS=${earning.eps_actual?.toFixed(2)}, Est=${earning.eps_estimate?.toFixed(2) || 'N/A'}, 1D=${returns.return_1d?.toFixed(1)}%, 5D=${returns.return_5d?.toFixed(1)}%`);
    }

    // Step 4: Store in database
    const stored = await storeEarnings(supabase, earnings);

    console.log(`[backfill-earnings-history] Stored ${stored}/${earnings.length} quarters for ${symbol}`);

    return new Response(JSON.stringify({
      success: true,
      symbol,
      cik,
      quartersFound: earnings.length,
      quartersStored: stored,
      source: 'SEC XBRL API (10-Q filings)',
      fetchedAt: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[backfill-earnings-history] Error:', err);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: err instanceof Error ? err.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
