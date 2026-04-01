import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SEC_EDGAR_BASE = "https://efts.sec.gov/LATEST/search-index?q=%22form+4%22&dateRange=custom";
const SEC_RSS_URL = "https://efts.sec.gov/LATEST/search-index?q=%224%22&forms=4&dateRange=custom";

// SEC EDGAR owner.xml RSS feed for recent Form 4 filings
const EDGAR_FULL_TEXT = "https://efts.sec.gov/LATEST/search-index";
const EDGAR_FILINGS_URL = "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&type=4&dateb=&owner=include&count=40&search_text=&action=getcompany&output=atom";

// Use the SEC EDGAR full-text search API (free, no key needed)
const EDGAR_SEARCH_API = "https://efts.sec.gov/LATEST/search-index";

// Modern SEC EDGAR XBRL API
const EDGAR_SUBMISSIONS_URL = "https://data.sec.gov/submissions";

interface InsiderFiling {
  ticker: string;
  company_name: string;
  insider_name: string;
  insider_title: string;
  transaction_type: string;
  shares: number;
  price_per_share: number;
  total_value: number;
  filing_date: string;
  transaction_date: string;
  sec_filing_url: string;
  is_significant: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("[SEC EDGAR] Starting insider transactions fetch...");

    // Use SEC EDGAR full-text search for recent Form 4 filings
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 86400000);
    const fromDate = weekAgo.toISOString().split('T')[0];
    const toDate = today.toISOString().split('T')[0];

    const searchUrl = `https://efts.sec.gov/LATEST/search-index?q=%224%22&forms=4&dateRange=custom&startdt=${fromDate}&enddt=${toDate}&hits.hits.total.value=true&hits.hits._source=file_date,display_names,file_num,file_type,form_type,period_of_report&from=0&size=40`;

    // Try the EDGAR full-text search API
    const edgarRes = await fetch(`https://efts.sec.gov/LATEST/search-index?q=%224%22&forms=4&dateRange=custom&startdt=${fromDate}&enddt=${toDate}`, {
      headers: {
        "User-Agent": "AssetLabsAI contact@assetlabs.ai",
        "Accept": "application/json",
      },
    });

    // Alternative: Use the EDGAR XBRL companion API for recent filings
    const recentFilingsUrl = `https://efts.sec.gov/LATEST/search-index?q=%224%22&forms=4&startdt=${fromDate}&enddt=${toDate}`;
    
    // Try fetching recent Form 4 filings via the more reliable EDGAR full-text search
    const ftSearchUrl = `https://efts.sec.gov/LATEST/search-index?q=%22form+type%22+%224%22&forms=4&startdt=${fromDate}&enddt=${toDate}`;

    // For MVP, use the SEC EDGAR REST API for recent filings
    // The EDGAR full-text search API returns filing metadata
    const apiUrl = `https://efts.sec.gov/LATEST/search-index?q=%224%22&forms=4&dateRange=custom&startdt=${fromDate}&enddt=${toDate}`;

    let filings: InsiderFiling[] = [];

    try {
      // Use EDGAR full-text search API (EFTS)
      const response = await fetch(
        `https://efts.sec.gov/LATEST/search-index?q=%224%22&forms=4&dateRange=custom&startdt=${fromDate}&enddt=${toDate}`,
        {
          headers: {
            "User-Agent": "AssetLabsAI contact@assetlabs.ai",
            "Accept": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log("[SEC EDGAR] Got response:", JSON.stringify(data).slice(0, 500));
        
        // Parse the filings from the EFTS response
        if (data.hits?.hits) {
          for (const hit of data.hits.hits.slice(0, 40)) {
            const source = hit._source || {};
            // Extract filing details
            const filing: InsiderFiling = {
              ticker: source.tickers?.[0] || source.display_names?.[0]?.split(' ')?.[0] || 'UNKNOWN',
              company_name: source.display_names?.[0] || source.entity_name || '',
              insider_name: source.display_names?.[1] || 'Unknown Insider',
              insider_title: '',
              transaction_type: 'buy', // Will need deeper parsing
              shares: 0,
              price_per_share: 0,
              total_value: 0,
              filing_date: source.file_date || fromDate,
              transaction_date: source.period_of_report || source.file_date || fromDate,
              sec_filing_url: `https://www.sec.gov/Archives/edgar/data/${source.file_num || ''}`,
              is_significant: false,
            };
            filings.push(filing);
          }
        }
      } else {
        console.log("[SEC EDGAR] EFTS returned:", response.status);
      }
    } catch (err) {
      console.error("[SEC EDGAR] EFTS error:", err);
    }

    // If EFTS didn't return data, try the EDGAR submissions API for well-known tickers
    if (filings.length === 0) {
      console.log("[SEC EDGAR] Falling back to submissions API...");
      
      // Fetch Form 4 filings for major companies
      const majorCIKs = [
        { cik: "0000320193", ticker: "AAPL", name: "Apple Inc." },
        { cik: "0000789019", ticker: "MSFT", name: "Microsoft Corp." },
        { cik: "0001652044", ticker: "GOOGL", name: "Alphabet Inc." },
        { cik: "0001018724", ticker: "AMZN", name: "Amazon.com Inc." },
        { cik: "0001045810", ticker: "NVDA", name: "NVIDIA Corp." },
        { cik: "0001326801", ticker: "META", name: "Meta Platforms" },
        { cik: "0001318605", ticker: "TSLA", name: "Tesla Inc." },
      ];

      for (const company of majorCIKs) {
        try {
          const res = await fetch(
            `https://data.sec.gov/submissions/CIK${company.cik}.json`,
            {
              headers: {
                "User-Agent": "AssetLabsAI contact@assetlabs.ai",
                "Accept": "application/json",
              },
            }
          );

          if (!res.ok) continue;
          const data = await res.json();
          
          // Look for recent Form 4 filings
          const recentFilings = data.filings?.recent;
          if (!recentFilings) continue;

          for (let i = 0; i < Math.min(recentFilings.form?.length || 0, 10); i++) {
            if (recentFilings.form[i] === "4") {
              const filingDate = recentFilings.filingDate?.[i];
              if (!filingDate || filingDate < fromDate) continue;

              filings.push({
                ticker: company.ticker,
                company_name: company.name,
                insider_name: recentFilings.primaryDocument?.[i]?.split('/')?.[0] || 'Insider',
                insider_title: '',
                transaction_type: 'buy',
                shares: 0,
                price_per_share: 0,
                total_value: 0,
                filing_date: filingDate,
                transaction_date: filingDate,
                sec_filing_url: `https://www.sec.gov/Archives/edgar/data/${company.cik}/${recentFilings.accessionNumber?.[i]?.replace(/-/g, '')}`,
                is_significant: false,
              });
            }
          }

          // Rate limit: SEC requires max 10 requests/second
          await new Promise(r => setTimeout(r, 150));
        } catch (err) {
          console.error(`[SEC EDGAR] Error for ${company.ticker}:`, err);
        }
      }
    }

    console.log(`[SEC EDGAR] Parsed ${filings.length} filings`);

    // Upsert into database
    if (filings.length > 0) {
      const { error } = await supabase
        .from("smart_money_insider_trades")
        .upsert(
          filings.map(f => ({
            ticker: f.ticker,
            company_name: f.company_name,
            insider_name: f.insider_name,
            insider_title: f.insider_title,
            transaction_type: f.transaction_type,
            shares: f.shares || null,
            price_per_share: f.price_per_share || null,
            total_value: f.total_value || null,
            filing_date: f.filing_date,
            transaction_date: f.transaction_date || null,
            sec_filing_url: f.sec_filing_url,
            is_significant: f.is_significant,
          })),
          { onConflict: 'id' }
        );

      if (error) {
        console.error("[SEC EDGAR] Upsert error:", error);
      } else {
        console.log(`[SEC EDGAR] Upserted ${filings.length} insider trades`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, count: filings.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[SEC EDGAR] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
