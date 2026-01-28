import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
}

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
  'NU': '0001900715', 'GRAB': '0001855612', 'BABA': '0001577552', 'JD': '0001549802',
  'PDD': '0001737806', 'BIDU': '0001329099', 'BILI': '0001723690', 'LI': '0001791706',
  'XPEV': '0001810997', 'TME': '0001744676',
};

let cikCache: Record<string, string> | null = null;

async function getCIKFromTicker(ticker: string): Promise<string | null> {
  const upperTicker = ticker.toUpperCase();
  
  if (KNOWN_CIKS[upperTicker]) {
    return KNOWN_CIKS[upperTicker];
  }
  
  if (cikCache && cikCache[upperTicker]) {
    return cikCache[upperTicker];
  }
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch('https://www.sec.gov/files/company_tickers.json', {
      headers: { 'User-Agent': 'AssetLabs Research/1.0' },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) return null;
    
    const data = await response.json();
    cikCache = {};
    for (const entry of Object.values(data) as any[]) {
      if (entry.ticker) {
        cikCache[entry.ticker.toUpperCase()] = String(entry.cik_str).padStart(10, '0');
      }
    }
    
    return cikCache[upperTicker] || null;
  } catch {
    return null;
  }
}

async function fetchQuarterlyEPSFromXBRL(ticker: string, cik: string): Promise<QuarterlyEarnings[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    const factsUrl = `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`;
    const response = await fetch(factsUrl, {
      headers: { 'User-Agent': 'AssetLabs Research/1.0' },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) return [];

    const data = await response.json();
    const facts = data.facts?.['us-gaap'];
    
    if (!facts) return [];

    const epsConcepts = [
      'EarningsPerShareDiluted',
      'EarningsPerShareBasic',
      'EarningsPerShareBasicAndDiluted'
    ];
    
    const revenueConcepts = [
      'Revenues',
      'RevenueFromContractWithCustomerExcludingAssessedTax',
      'SalesRevenueNet',
      'TotalRevenuesAndOtherIncome',
      'RevenueFromContractWithCustomerIncludingAssessedTax'
    ];

    const quarterlyData: Map<string, QuarterlyEarnings> = new Map();

    // Get EPS from 10-Q filings
    for (const concept of epsConcepts) {
      const epsData = facts[concept]?.units?.['USD/shares'];
      if (!epsData) continue;

      for (const entry of epsData) {
        if (entry.form !== '10-Q') continue;
        if (!entry.end || entry.val === undefined) continue;
        
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
      if (quarterlyData.size > 0) break;
    }

    // Add revenue data
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

    return Array.from(quarterlyData.values())
      .sort((a, b) => new Date(b.report_date).getTime() - new Date(a.report_date).getTime())
      .slice(0, 16); // Last 16 quarters (4 years)
  } catch {
    return [];
  }
}

async function storeEarningsHistory(
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
          revenue_surprise_pct: earning.revenue_surprise_pct
        }, {
          onConflict: 'symbol,report_date',
          ignoreDuplicates: false
        });

      if (!error) stored++;
    } catch {
      // Continue on error
    }
  }

  return stored;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mode = 'calendar', limit = 50 } = await req.json().catch(() => ({}));
    
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing Supabase credentials' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    let symbolsToProcess: string[] = [];
    
    if (mode === 'calendar') {
      // Get unique symbols from earnings_calendar
      const { data: calendarSymbols, error: calendarError } = await supabase
        .from('earnings_calendar')
        .select('symbol')
        .order('market_cap', { ascending: false, nullsFirst: false });
      
      if (calendarError) {
        console.error('[populate] Error fetching calendar symbols:', calendarError);
      } else if (calendarSymbols) {
        const uniqueSymbols = [...new Set(calendarSymbols.map(s => s.symbol))];
        symbolsToProcess = uniqueSymbols.slice(0, limit);
      }
    } else if (mode === 'top') {
      // Use top tickers from KNOWN_CIKS
      symbolsToProcess = Object.keys(KNOWN_CIKS).slice(0, limit);
    }
    
    if (symbolsToProcess.length === 0) {
      // Fallback to known CIKs
      symbolsToProcess = Object.keys(KNOWN_CIKS).slice(0, limit);
    }
    
    console.log(`[populate] Processing ${symbolsToProcess.length} symbols...`);
    
    const results: Record<string, any> = {};
    let totalStored = 0;
    let processed = 0;
    let failed = 0;
    
    // Process in batches of 5 to avoid overwhelming SEC API
    const batchSize = 5;
    for (let i = 0; i < symbolsToProcess.length; i += batchSize) {
      const batch = symbolsToProcess.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (ticker) => {
        const cik = await getCIKFromTicker(ticker);
        if (!cik) {
          results[ticker] = { success: false, error: 'CIK not found' };
          failed++;
          return;
        }
        
        const earnings = await fetchQuarterlyEPSFromXBRL(ticker, cik);
        if (earnings.length === 0) {
          results[ticker] = { success: false, error: 'No quarterly data found' };
          failed++;
          return;
        }
        
        const stored = await storeEarningsHistory(supabase, earnings);
        totalStored += stored;
        processed++;
        
        results[ticker] = {
          success: true,
          quartersFound: earnings.length,
          quartersStored: stored
        };
      });
      
      await Promise.all(batchPromises);
      
      // Small delay between batches to respect rate limits
      if (i + batchSize < symbolsToProcess.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    console.log(`[populate] Complete: ${processed} succeeded, ${failed} failed, ${totalStored} quarters stored`);

    return new Response(
      JSON.stringify({
        success: true,
        symbolsRequested: symbolsToProcess.length,
        symbolsProcessed: processed,
        symbolsFailed: failed,
        totalQuartersStored: totalStored,
        results,
        source: 'SEC XBRL API',
        fetchedAt: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[populate-earnings-history] Error:', err);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: err instanceof Error ? err.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
