import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Major institutional investors to track
const MAJOR_FUNDS = [
  { cik: "1067983", name: "Berkshire Hathaway Inc" },
  { cik: "1336528", name: "Bridgewater Associates LP" },
  { cik: "1350694", name: "Citadel Advisors LLC" },
  { cik: "1037389", name: "Renaissance Technologies LLC" },
  { cik: "1061768", name: "BlackRock Inc" },
  { cik: "1543160", name: "Soros Fund Management LLC" },
  { cik: "1649339", name: "Appaloosa Management LP" },
  { cik: "1510470", name: "Viking Global Investors LP" },
  { cik: "102909",  name: "Vanguard Group Inc" },
  { cik: "1364742", name: "Elliott Investment Management" },
  { cik: "1159159", name: "Third Point LLC" },
  { cik: "1056831", name: "Druckenmiller Stanley" },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("[13F] Starting institutional holdings fetch...");

    let totalInserted = 0;

    for (const fund of MAJOR_FUNDS) {
      try {
        const paddedCik = fund.cik.padStart(10, '0');
        
        // Step 1: Get recent filings to find 13F-HR
        const submissionsUrl = `https://data.sec.gov/submissions/CIK${paddedCik}.json`;
        const subRes = await fetch(submissionsUrl, {
          headers: { "User-Agent": "AssetLabsAI contact@assetlabs.ai", "Accept": "application/json" },
        });

        if (!subRes.ok) {
          console.warn(`[13F] ${fund.name} submissions returned ${subRes.status}`);
          continue;
        }

        const subData = await subRes.json();
        const recent = subData.filings?.recent;
        if (!recent?.form) continue;

        // Find the most recent 13F-HR filing
        let filingIndex = -1;
        for (let i = 0; i < Math.min(recent.form.length, 100); i++) {
          if (recent.form[i] === "13F-HR" || recent.form[i] === "13F-HR/A") {
            filingIndex = i;
            break;
          }
        }

        if (filingIndex === -1) {
          console.log(`[13F] No 13F-HR found for ${fund.name}`);
          continue;
        }

        const accession = recent.accessionNumber[filingIndex];
        const filingDate = recent.filingDate[filingIndex];
        const reportDate = recent.reportDate?.[filingIndex] || filingDate;
        const cleanAccession = accession.replace(/-/g, '');
        const filingUrl = `https://www.sec.gov/Archives/edgar/data/${paddedCik}/${cleanAccession}`;

        console.log(`[13F] Found 13F-HR for ${fund.name}, filed ${filingDate}`);

        // Step 2: Find the infotable XML in the filing index
        await new Promise(r => setTimeout(r, 120));

        const indexUrl = `${filingUrl}/index.json`;
        const indexRes = await fetch(indexUrl, {
          headers: { "User-Agent": "AssetLabsAI contact@assetlabs.ai" },
        });

        if (!indexRes.ok) {
          console.warn(`[13F] Could not fetch index for ${fund.name}`);
          continue;
        }

        const indexData = await indexRes.json();
        const items = indexData.directory?.item || [];

        // Find the infotable XML (contains actual holdings)
        const infoTableDoc = items.find((item: any) =>
          item.name?.toLowerCase().includes('infotable') && item.name?.endsWith('.xml')
        ) || items.find((item: any) =>
          item.name?.toLowerCase().includes('information') && item.name?.endsWith('.xml')
        ) || items.find((item: any) =>
          item.name?.endsWith('.xml') &&
          !item.name?.includes('primary') &&
          !item.name?.includes('R') &&
          !item.name?.toLowerCase().includes('form13f')
        );

        if (!infoTableDoc) {
          console.warn(`[13F] No infotable XML found for ${fund.name}`);
          continue;
        }

        await new Promise(r => setTimeout(r, 120));

        const xmlUrl = `${filingUrl}/${infoTableDoc.name}`;
        const xmlRes = await fetch(xmlUrl, {
          headers: { "User-Agent": "AssetLabsAI contact@assetlabs.ai" },
        });

        if (!xmlRes.ok) {
          console.warn(`[13F] Could not fetch infotable for ${fund.name}: ${xmlRes.status}`);
          continue;
        }

        const xmlText = await xmlRes.text();

        // Step 3: Parse the 13F infotable XML
        // Each <infoTable> entry has nameOfIssuer, titleOfClass, cusip, value, sshPrnamt (shares), etc.
        const holdings: any[] = [];
        
        // Match each infoTable entry - handles both ns1: prefix and no prefix
        const entryPattern = /<(?:ns1:|n1:)?infoTable>([\s\S]*?)<\/(?:ns1:|n1:)?infoTable>/gi;
        let match;
        while ((match = entryPattern.exec(xmlText)) !== null) {
          const entry = match[1];
          
          const nameMatch = entry.match(/<(?:ns1:|n1:)?nameOfIssuer>([^<]+)<\//i);
          const titleMatch = entry.match(/<(?:ns1:|n1:)?titleOfClass>([^<]+)<\//i);
          const cusipMatch = entry.match(/<(?:ns1:|n1:)?cusip>([^<]+)<\//i);
          // Match <value> that's NOT inside <shrsOrPrnAmt> — the top-level <value> is the dollar value in thousands
          // We need to find the value that appears before shrsOrPrnAmt section
          const valueMatch = entry.match(/<(?:ns1:|n1:)?value>\s*(\d+)\s*<\/(?:ns1:|n1:)?value>/i);
          // Match shares inside the shrsOrPrnAmt section
          const sharesMatch = entry.match(/<(?:ns1:|n1:)?sshPrnamt>\s*(\d+)\s*<\/(?:ns1:|n1:)?sshPrnamt>/i);
          
          if (nameMatch && valueMatch) {
            const companyName = nameMatch[1].trim();
            const rawValue = parseInt(valueMatch[1]);
            const value = rawValue * 1000; // 13F values are in thousands of dollars
            const shares = sharesMatch ? parseInt(sharesMatch[1]) : null;
            
            // Only include significant holdings (>$10M)
            if (value > 10000000) {
              holdings.push({
                fund_name: fund.name,
                fund_cik: fund.cik,
                ticker: null, // Will need lookup or leave null
                company_name: companyName,
                shares,
                value,
                change_shares: null,
                change_pct: null,
                weight_pct: null,
                filing_date: filingDate,
                report_date: reportDate,
                filing_type: '13F-HR',
                sec_filing_url: filingUrl,
              });
            }
          }
        }

        if (holdings.length > 0) {
          // Calculate weight percentages
          const totalValue = holdings.reduce((sum, h) => sum + h.value, 0);
          holdings.forEach(h => {
            h.weight_pct = Math.round((h.value / totalValue) * 10000) / 100;
          });

          // Try to map company names to tickers using known mappings
          const tickerMap: Record<string, string> = {
            'APPLE INC': 'AAPL', 'MICROSOFT CORP': 'MSFT', 'AMAZON COM INC': 'AMZN',
            'AMAZON.COM': 'AMZN', 'ALPHABET INC': 'GOOGL', 'META PLATFORMS': 'META',
            'NVIDIA CORP': 'NVDA', 'TESLA INC': 'TSLA', 'BERKSHIRE HATHAWAY': 'BRK.B',
            'JPMORGAN CHASE': 'JPM', 'VISA INC': 'V', 'UNITEDHEALTH': 'UNH',
            'JOHNSON & JOHNSON': 'JNJ', 'JOHNSON &AMP; JOHNSON': 'JNJ',
            'EXXON MOBIL': 'XOM', 'PROCTER & GAMBLE': 'PG', 'PROCTER &AMP; GAMBLE': 'PG',
            'MASTERCARD': 'MA', 'BANK OF AMERICA': 'BAC', 'BANK AMERICA': 'BAC',
            'CHEVRON CORP': 'CVX', 'HOME DEPOT': 'HD', 'COCA COLA': 'KO',
            'COCA-COLA': 'KO', 'PEPSICO': 'PEP', 'SALESFORCE': 'CRM',
            'WALT DISNEY': 'DIS', 'NETFLIX': 'NFLX', 'ADOBE': 'ADBE',
            'COSTCO': 'COST', 'CISCO SYSTEMS': 'CSCO', 'ORACLE CORP': 'ORCL',
            'INTL BUSINESS MACHINES': 'IBM', 'INTEL CORP': 'INTC',
            'ADVANCED MICRO': 'AMD', 'QUALCOMM': 'QCOM', 'COMCAST': 'CMCSA',
            'VERIZON': 'VZ', 'AT&T': 'T', 'AT&AMP;T': 'T', 'PFIZER': 'PFE',
            'ABBVIE': 'ABBV', 'MERCK': 'MRK', 'WELLS FARGO': 'WFC',
            'GOLDMAN SACHS': 'GS', 'MORGAN STANLEY': 'MS', 'CITIGROUP': 'C',
            'AMERICAN EXPRESS': 'AXP', 'CATERPILLAR': 'CAT', 'BOEING': 'BA',
            'UBER TECHNOLOGIES': 'UBER', 'PALANTIR': 'PLTR',
            'SNOWFLAKE': 'SNOW', 'SHOPIFY': 'SHOP', 'SPOTIFY': 'SPOT',
            'OCCIDENTAL': 'OXY', 'KRAFT HEINZ': 'KHC',
            'GENERAL MOTORS': 'GM', 'FORD MOTOR': 'F',
            'BROADCOM': 'AVGO', 'ELI LILLY': 'LLY', 'HALLIBURTON': 'HAL',
            'RIOT PLATFORMS': 'RIOT', 'SERVICENOW': 'NOW', 'CROWDSTRIKE': 'CRWD',
            'RESTAURANT BRANDS': 'QSR', 'DOCUSIGN': 'DOCU', 'DATADOG': 'DDOG',
            'PALO ALTO': 'PANW', 'THERMO FISHER': 'TMO', 'DANAHER': 'DHR',
            'LINDE': 'LIN', 'ACCENTURE': 'ACN', 'T-MOBILE': 'TMUS',
            'NEXTERA': 'NEE', 'STARBUCKS': 'SBUX', 'TARGET': 'TGT',
            'DEERE': 'DE', 'HONEYWELL': 'HON', 'RAYTHEON': 'RTX',
            'LOCKHEED': 'LMT', 'GENERAL ELECTRIC': 'GE', 'GENERAL DYNAMICS': 'GD',
            'UNITED PARCEL': 'UPS', 'FEDEX': 'FDX',
          };

          for (const h of holdings) {
            const upperName = h.company_name.toUpperCase();
            for (const [key, ticker] of Object.entries(tickerMap)) {
              if (upperName.includes(key)) {
                h.ticker = ticker;
                break;
              }
            }
          }

          // Delete existing entries for this fund & filing date
          await supabase
            .from("smart_money_institutional_holdings")
            .delete()
            .eq("fund_cik", fund.cik)
            .eq("filing_date", filingDate);

          // Insert in batches
          const top100 = holdings
            .sort((a, b) => b.value - a.value)
            .slice(0, 100);

          for (let b = 0; b < top100.length; b += 50) {
            const batch = top100.slice(b, b + 50);
            const { error } = await supabase
              .from("smart_money_institutional_holdings")
              .insert(batch);
            if (error) console.error(`[13F] Insert error for ${fund.name}:`, error);
            else totalInserted += batch.length;
          }

          console.log(`[13F] ${fund.name}: ${holdings.length} holdings found, inserted top ${Math.min(100, holdings.length)}`);
        }

        await new Promise(r => setTimeout(r, 200));
      } catch (err) {
        console.error(`[13F] Error for ${fund.name}:`, err);
      }
    }

    console.log(`[13F] Total inserted: ${totalInserted} institutional holdings`);

    return new Response(
      JSON.stringify({ success: true, count: totalInserted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[13F] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
