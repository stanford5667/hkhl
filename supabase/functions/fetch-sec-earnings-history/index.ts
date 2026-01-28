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
  // Additional large-caps
  'LIN': '0001707925', 'KLAC': '0000319201', 'GILD': '0000882095', 'SPGI': '0000064040',
  'SYK': '0000310764', 'ETN': '0000031462', 'WELL': '0000766704', 'PH': '0000076334',
  'BMY': '0000014272', 'CVS': '0000064803', 'ADP': '0000008670', 'ICE': '0001571949',
  'SO': '0000092122', 'HOOD': '0001783879', 'DUK': '0001326160', 'HWM': '0001854401',
  'ECL': '0000031462', 'MNST': '0000865752', 'EQIX': '0001101239', 'WMB': '0000107263',
  'APO': '0001411494', 'CI': '0000701221', 'PWR': '0001050915', 'MRVL': '0001058057',
  'MSI': '0000068505', 'APD': '0000002969', 'EOG': '0000821189', 'ADSK': '0000769397',
  'AFL': '0000004977', 'VST': '0001584831', 'MET': '0001099219', 'CAH': '0000721371',
  'GWW': '0000277135', 'PSA': '0001393311', 'EW': '0001099800', 'EXC': '0000008812',
  'EBAY': '0001065088', 'AIG': '0000005272', 'CL': '0000021665', 'CME': '0001156375',
  'ZTS': '0001555280', 'MCK': '0000927653', 'OXY': '0000797468', 'REGN': '0000872589',
  'SLB': '0000087347', 'COP': '0001163165', 'USB': '0000036104', 'PNC': '0000713676',
  'TFC': '0000092230', 'COF': '0000927628', 'AEP': '0000004904', 'D': '0000715957',
  'SRE': '0001032208', 'FIS': '0001136893', 'ITW': '0000049826', 'EMR': '0000032604',
  'NSC': '0000702165', 'CSX': '0000277948', 'KMI': '0001506307', 'WEC': '0000107815',
};

// In-memory cache for CIK lookups
let cikCache: Record<string, string> | null = null;

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
      headers: { 'User-Agent': 'AssetLabs Research/1.0' },
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

// Fetch quarterly EPS data from SEC XBRL API
async function fetchQuarterlyEPSFromXBRL(ticker: string, cik: string): Promise<QuarterlyEarnings[]> {
  console.log(`[SEC XBRL] Fetching quarterly EPS for ${ticker} (CIK: ${cik})...`);
  
  try {
    const factsUrl = `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`;
    const response = await fetch(factsUrl, {
      headers: { 'User-Agent': 'AssetLabs Research/1.0' }
    });

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

    // EPS concepts to try
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
        if (!entry.end || !entry.val) continue;
        
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
        } else {
          const existing = quarterlyData.get(key)!;
          if (!existing.eps_actual) {
            existing.eps_actual = entry.val;
          }
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
        if (!entry.end || !entry.val) continue;
        
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
    console.error('[SEC XBRL] Error:', err);
    return [];
  }
}

// Enhance with Firecrawl search for analyst estimates
async function enhanceWithEstimates(
  earnings: QuarterlyEarnings[],
  ticker: string,
  firecrawlApiKey: string | undefined
): Promise<QuarterlyEarnings[]> {
  if (!firecrawlApiKey || earnings.length === 0) return earnings;

  console.log(`[Firecrawl] Searching for ${ticker} earnings estimates...`);

  try {
    // Search for historical earnings estimates
    const searchQuery = `${ticker} earnings history EPS estimate actual surprise beat miss`;
    
    const searchResponse = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: searchQuery,
        limit: 3,
        scrapeOptions: {
          formats: ['markdown'],
        },
      }),
    });

    if (!searchResponse.ok) {
      console.error('[Firecrawl] Search failed:', searchResponse.status);
      return earnings;
    }

    const searchData = await searchResponse.json();
    
    if (searchData.data && searchData.data.length > 0) {
      // Try to extract estimates from search results
      for (const result of searchData.data) {
        const markdown = result.markdown || result.content || '';
        
        // Look for patterns like "EPS: $1.23 vs $1.20 expected" or "beat by $0.03"
        const patterns = [
          /Q([1-4])\s*'?(\d{2,4}).*?EPS[:\s]+\$?([\d.]+).*?(?:vs|estimate|expected)[:\s]+\$?([\d.]+)/gi,
          /(\d{4}).*?Q([1-4]).*?EPS[:\s]+\$?([\d.]+).*?(?:beat|miss).*?\$?([\d.]+)/gi
        ];

        for (const pattern of patterns) {
          let match;
          while ((match = pattern.exec(markdown)) !== null) {
            // Try to match with our earnings data
            const quarter = match[1] || match[2];
            const year = match[2] || match[1];
            const fullYear = year.length === 2 ? `20${year}` : year;
            
            for (const earning of earnings) {
              if (earning.fiscal_period.includes(`Q${quarter}`) && 
                  earning.fiscal_period.includes(fullYear)) {
                // Found a match - update estimate if we don't have one
                if (!earning.eps_estimate && match[4]) {
                  earning.eps_estimate = parseFloat(match[4]);
                  if (earning.eps_actual && earning.eps_estimate) {
                    earning.eps_surprise_pct = 
                      ((earning.eps_actual - earning.eps_estimate) / Math.abs(earning.eps_estimate)) * 100;
                  }
                }
              }
            }
          }
        }
      }
    }

    console.log(`[Firecrawl] Enhanced earnings with estimates`);
    return earnings;
  } catch (err) {
    console.error('[Firecrawl] Error enhancing with estimates:', err);
    return earnings;
  }
}

// Store earnings in database
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

      if (error) {
        console.error(`[DB] Error storing ${earning.symbol} ${earning.fiscal_period}:`, error.message);
      } else {
        stored++;
      }
    } catch (err) {
      console.error('[DB] Error:', err);
    }
  }

  return stored;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbols, storeInDb = true } = await req.json();
    
    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'symbols array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Limit to 10 symbols per request
    const tickersToProcess = symbols.slice(0, 10).map((s: string) => s.toUpperCase());
    
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    const supabase = storeInDb && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
      ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      : null;

    const results: Record<string, any> = {};
    let totalStored = 0;

    for (const ticker of tickersToProcess) {
      console.log(`[fetch-sec-earnings-history] Processing ${ticker}...`);
      
      // Get CIK
      const cik = await getCIKFromTicker(ticker);
      if (!cik) {
        results[ticker] = { success: false, error: 'CIK not found' };
        continue;
      }

      // Fetch quarterly EPS from SEC XBRL
      let earnings = await fetchQuarterlyEPSFromXBRL(ticker, cik);
      
      if (earnings.length === 0) {
        results[ticker] = { success: false, error: 'No quarterly earnings found in SEC filings' };
        continue;
      }

      // Enhance with estimates via Firecrawl
      earnings = await enhanceWithEstimates(earnings, ticker, FIRECRAWL_API_KEY);

      // Store in database
      if (supabase && storeInDb) {
        const stored = await storeEarningsHistory(supabase, earnings);
        totalStored += stored;
        results[ticker] = { 
          success: true, 
          quartersFound: earnings.length,
          quartersStored: stored,
          earnings: earnings.slice(0, 8) // Return last 8 quarters
        };
      } else {
        results[ticker] = { 
          success: true, 
          quartersFound: earnings.length,
          earnings: earnings.slice(0, 8)
        };
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        symbolsProcessed: tickersToProcess.length,
        totalQuartersStored: totalStored,
        results,
        source: 'SEC XBRL API (10-Q filings)',
        fetchedAt: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[fetch-sec-earnings-history] Error:', err);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: err instanceof Error ? err.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
