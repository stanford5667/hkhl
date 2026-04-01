import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("[SEC EDGAR] Starting insider transactions fetch...");

    // Fetch recent Form 4 filings from SEC EDGAR full-text search API
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 86400000);
    const fromDate = weekAgo.toISOString().split('T')[0];
    const toDate = today.toISOString().split('T')[0];

    // Use the EDGAR EFTS API for Form 4 filings
    const eftsUrl = `https://efts.sec.gov/LATEST/search-index?q=%224%22&forms=4&dateRange=custom&startdt=${fromDate}&enddt=${toDate}`;
    
    let filings: any[] = [];

    // Strategy: Use EDGAR submissions API for known companies to get detailed Form 4 data
    const majorCompanies = [
      { cik: "320193", ticker: "AAPL", name: "Apple Inc." },
      { cik: "789019", ticker: "MSFT", name: "Microsoft Corp." },
      { cik: "1652044", ticker: "GOOGL", name: "Alphabet Inc." },
      { cik: "1018724", ticker: "AMZN", name: "Amazon.com Inc." },
      { cik: "1045810", ticker: "NVDA", name: "NVIDIA Corp." },
      { cik: "1326801", ticker: "META", name: "Meta Platforms" },
      { cik: "1318605", ticker: "TSLA", name: "Tesla Inc." },
      { cik: "1067983", ticker: "BRK.B", name: "Berkshire Hathaway" },
      { cik: "1341439", ticker: "ORCL", name: "Oracle Corp." },
      { cik: "1559720", ticker: "ABNB", name: "Airbnb Inc." },
      { cik: "1559720", ticker: "COIN", name: "Coinbase Global" },
      { cik: "1318605", ticker: "TSLA", name: "Tesla Inc." },
      { cik: "1868275", ticker: "RIVN", name: "Rivian Automotive" },
      { cik: "1534701", ticker: "UBER", name: "Uber Technologies" },
      { cik: "1512673", ticker: "CRM", name: "Salesforce Inc." },
    ];

    for (const company of majorCompanies) {
      try {
        const paddedCik = company.cik.padStart(10, '0');
        const res = await fetch(
          `https://data.sec.gov/submissions/CIK${paddedCik}.json`,
          {
            headers: {
              "User-Agent": "AssetLabsAI contact@assetlabs.ai",
              "Accept": "application/json",
            },
          }
        );

        if (!res.ok) {
          console.warn(`[SEC EDGAR] ${company.ticker} returned ${res.status}`);
          continue;
        }

        const data = await res.json();
        const recent = data.filings?.recent;
        if (!recent?.form) continue;

        // Find Form 4 filings
        for (let i = 0; i < Math.min(recent.form.length, 50); i++) {
          if (recent.form[i] !== "4" && recent.form[i] !== "4/A") continue;
          
          const filingDate = recent.filingDate?.[i];
          if (!filingDate || filingDate < fromDate) continue;

          // The primaryDocDescription often contains the insider name
          const accession = recent.accessionNumber?.[i] || '';
          const cleanAccession = accession.replace(/-/g, '');
          
          filings.push({
            ticker: company.ticker,
            company_name: company.name,
            insider_name: recent.primaryDocDescription?.[i] || 'Insider',
            insider_title: '',
            transaction_type: 'buy', // Default — would need XML parsing for exact type
            shares: null,
            price_per_share: null,
            total_value: null,
            filing_date: filingDate,
            transaction_date: recent.reportDate?.[i] || filingDate,
            sec_filing_url: `https://www.sec.gov/Archives/edgar/data/${paddedCik}/${cleanAccession}`,
            is_significant: false,
          });
        }

        // SEC rate limit: 10 req/s
        await new Promise(r => setTimeout(r, 120));
      } catch (err) {
        console.error(`[SEC EDGAR] Error for ${company.ticker}:`, err);
      }
    }

    // Now try to parse individual Form 4 XML for detailed transaction data
    // For each filing, attempt to get the XML to extract actual shares/prices
    for (let i = 0; i < Math.min(filings.length, 20); i++) {
      try {
        const filing = filings[i];
        // Try to get the filing index page to find the XML doc
        const indexUrl = `${filing.sec_filing_url}/index.json`;
        const indexRes = await fetch(indexUrl, {
          headers: { "User-Agent": "AssetLabsAI contact@assetlabs.ai" },
        });

        if (indexRes.ok) {
          const indexData = await indexRes.json();
          const xmlDoc = indexData.directory?.item?.find((item: any) => 
            item.name?.endsWith('.xml') && !item.name?.includes('R')
          );

          if (xmlDoc) {
            const xmlUrl = `${filing.sec_filing_url}/${xmlDoc.name}`;
            const xmlRes = await fetch(xmlUrl, {
              headers: { "User-Agent": "AssetLabsAI contact@assetlabs.ai" },
            });

            if (xmlRes.ok) {
              const xmlText = await xmlRes.text();
              
              // Basic XML parsing for transaction details
              const nameMatch = xmlText.match(/<rptOwnerName>([^<]+)<\/rptOwnerName>/);
              const titleMatch = xmlText.match(/<officerTitle>([^<]+)<\/officerTitle>/);
              const sharesMatch = xmlText.match(/<transactionShares>.*?<value>([^<]+)<\/value>/s);
              const priceMatch = xmlText.match(/<transactionPricePerShare>.*?<value>([^<]+)<\/value>/s);
              const codeMatch = xmlText.match(/<transactionCode>([^<]+)<\/transactionCode>/);
              const adMatch = xmlText.match(/<transactionAcquiredDisposedCode>.*?<value>([^<]+)<\/value>/s);

              if (nameMatch) filing.insider_name = nameMatch[1].trim();
              if (titleMatch) filing.insider_title = titleMatch[1].trim();
              if (sharesMatch) filing.shares = parseInt(sharesMatch[1]);
              if (priceMatch) filing.price_per_share = parseFloat(priceMatch[1]);
              if (filing.shares && filing.price_per_share) {
                filing.total_value = filing.shares * filing.price_per_share;
              }

              // Determine transaction type
              const code = codeMatch?.[1]?.toUpperCase();
              const ad = adMatch?.[1]?.toUpperCase();
              if (code === 'P' || (code === 'A' && ad === 'A')) {
                filing.transaction_type = 'buy';
              } else if (code === 'S' || (code === 'D' && ad === 'D')) {
                filing.transaction_type = 'sell';
              } else if (code === 'M' || code === 'C') {
                filing.transaction_type = 'exercise';
              } else if (code === 'G' || code === 'J') {
                filing.transaction_type = 'gift';
              }

              // Mark significant trades (>$500K buys by C-suite)
              if (filing.transaction_type === 'buy' && filing.total_value && filing.total_value > 500000) {
                const title = (filing.insider_title || '').toLowerCase();
                if (title.includes('ceo') || title.includes('cfo') || title.includes('president') || title.includes('director')) {
                  filing.is_significant = true;
                }
              }
            }
          }
        }

        await new Promise(r => setTimeout(r, 120));
      } catch (err) {
        // Non-critical — we still have the basic filing data
        console.warn(`[SEC EDGAR] XML parse error for filing ${i}:`, err);
      }
    }

    console.log(`[SEC EDGAR] Parsed ${filings.length} Form 4 filings`);

    // Clear old data and insert fresh
    if (filings.length > 0) {
      // Delete filings older than 30 days
      await supabase
        .from("smart_money_insider_trades")
        .delete()
        .lt('filing_date', new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]);

      const { error } = await supabase
        .from("smart_money_insider_trades")
        .insert(filings.map(f => ({
          ticker: f.ticker,
          company_name: f.company_name,
          insider_name: f.insider_name,
          insider_title: f.insider_title || null,
          transaction_type: f.transaction_type,
          shares: f.shares,
          price_per_share: f.price_per_share,
          total_value: f.total_value,
          filing_date: f.filing_date,
          transaction_date: f.transaction_date,
          sec_filing_url: f.sec_filing_url,
          is_significant: f.is_significant,
        })));

      if (error) {
        console.error("[SEC EDGAR] Insert error:", error);
      } else {
        console.log(`[SEC EDGAR] Inserted ${filings.length} insider trades`);
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
