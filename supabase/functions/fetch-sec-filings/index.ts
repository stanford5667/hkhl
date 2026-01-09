const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SECFilingRequest {
  ticker: string;
  filingTypes?: string[];
  limit?: number;
  fetchContent?: boolean;
  filingUrl?: string; // For fetching a single filing's content
}

interface SECFiling {
  type: string;
  title: string;
  filedAt: string;
  accessionNumber: string;
  url: string;
  description: string;
  documentUrl?: string;
  content?: string;
}

// Get CIK from ticker using SEC mapping
async function getCIKFromTicker(ticker: string): Promise<string | null> {
  try {
    const response = await fetch('https://www.sec.gov/files/company_tickers.json', {
      headers: {
        'User-Agent': 'AssetLabs Research Bot contact@assetlabs.com',
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const tickerUpper = ticker.toUpperCase();
    
    for (const key in data) {
      if (data[key].ticker === tickerUpper) {
        // Pad CIK to 10 digits
        return String(data[key].cik_str).padStart(10, '0');
      }
    }
    return null;
  } catch (error) {
    console.error('Error fetching CIK:', error);
    return null;
  }
}

// Fetch SEC filings list using SEC EDGAR API
async function fetchSECFilingsList(
  ticker: string,
  filingTypes: string[],
  limit: number
): Promise<SECFiling[]> {
  const filings: SECFiling[] = [];
  
  // First get the CIK for this ticker
  const cik = await getCIKFromTicker(ticker);
  if (!cik) {
    console.log(`Could not find CIK for ticker: ${ticker}`);
    return [];
  }
  
  console.log(`Found CIK ${cik} for ticker ${ticker}`);
  
  try {
    // Use SEC EDGAR submissions API (more reliable)
    const url = `https://data.sec.gov/submissions/CIK${cik}.json`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'AssetLabs Research Bot contact@assetlabs.com',
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.error(`SEC API returned ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    const recentFilings = data.filings?.recent;
    
    if (!recentFilings) {
      console.log('No recent filings found');
      return [];
    }
    
    const filingTypesSet = new Set(filingTypes.map(t => t.toUpperCase()));
    
    for (let i = 0; i < recentFilings.form?.length && filings.length < limit; i++) {
      const form = recentFilings.form[i];
      
      // Match filing types (handle variations like 10-K, 10-K/A)
      const matchesType = filingTypesSet.has(form) || 
        [...filingTypesSet].some(t => form.startsWith(t));
      
      if (!matchesType) continue;
      
      const accessionNumber = recentFilings.accessionNumber[i];
      const accessionForUrl = accessionNumber.replace(/-/g, '');
      const primaryDoc = recentFilings.primaryDocument[i];
      
      filings.push({
        type: form,
        title: `${ticker} ${form} - ${recentFilings.primaryDocDescription?.[i] || form}`,
        filedAt: recentFilings.filingDate[i],
        accessionNumber: accessionNumber,
        url: `https://www.sec.gov/Archives/edgar/data/${cik}/${accessionForUrl}/${primaryDoc}`,
        description: recentFilings.primaryDocDescription?.[i] || `${form} filing`,
      });
    }
  } catch (error) {
    console.error('Error fetching SEC filings:', error);
  }
  
  return filings;
}

// Get document URLs from filing page
async function getDocumentUrls(filingPageUrl: string): Promise<{ htmlUrl: string; txtUrl: string } | null> {
  try {
    const response = await fetch(filingPageUrl, {
      headers: {
        'User-Agent': 'AssetLabs Research Bot contact@assetlabs.com',
        'Accept': 'text/html',
      },
    });
    
    if (!response.ok) return null;
    
    const html = await response.text();
    
    // Look for the primary document link (usually .htm)
    const htmMatch = html.match(/href="([^"]+\.htm)"[^>]*>.*?(10-K|10-Q|8-K|DEF\s*14A)/i) ||
                     html.match(/href="([^"]+\.htm)"/i);
    
    // Look for full submission text file
    const txtMatch = html.match(/href="([^"]+\.txt)"/i);
    
    // Build absolute URLs
    const baseUrl = filingPageUrl.replace(/\/[^/]*$/, '/');
    
    return {
      htmlUrl: htmMatch ? (htmMatch[1].startsWith('http') ? htmMatch[1] : `https://www.sec.gov${htmMatch[1].startsWith('/') ? '' : '/'}${htmMatch[1]}`) : '',
      txtUrl: txtMatch ? (txtMatch[1].startsWith('http') ? txtMatch[1] : `${baseUrl}${txtMatch[1]}`) : '',
    };
  } catch (error) {
    console.error('Error getting document URLs:', error);
    return null;
  }
}

// Use Firecrawl to scrape filing content as markdown
async function scrapeFilingContent(apiKey: string, url: string): Promise<string> {
  try {
    console.log(`Scraping content from: ${url}`);
    
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: ['markdown'],
        onlyMainContent: true,
        waitFor: 3000,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Firecrawl scrape failed: ${response.status}`, errorText);
      throw new Error(`Firecrawl scrape failed: ${response.status}`);
    }
    
    const data = await response.json();
    return data.data?.markdown || data.markdown || '';
  } catch (error) {
    console.error('Error scraping filing:', error);
    return '';
  }
}

// Generate mock SEC filings for demo
function generateMockFilings(ticker: string, filingTypes: string[], limit: number): SECFiling[] {
  const filings: SECFiling[] = [];
  const descriptions: Record<string, string> = {
    '10-K': 'Annual report with comprehensive overview of the business and financial condition',
    '10-Q': 'Quarterly report with unaudited financial statements',
    '8-K': 'Current report on material events',
    'DEF 14A': 'Definitive proxy statement for annual shareholder meeting',
    'Form 4': 'Statement of changes in beneficial ownership',
  };
  
  let count = 0;
  for (let year = 2024; year >= 2020 && count < limit; year--) {
    for (const filingType of filingTypes) {
      if (count >= limit) break;
      
      const quarters = filingType === '10-Q' ? [1, 2, 3] : [0];
      for (const q of quarters) {
        if (count >= limit) break;
        
        const month = filingType === '10-K' ? 2 : (q * 3 + 1);
        const date = new Date(year, month, 15);
        
        filings.push({
          type: filingType,
          title: `${ticker} ${filingType}${q > 0 ? ` Q${q}` : ''} ${year}`,
          filedAt: date.toISOString(),
          accessionNumber: `0001234567-${year.toString().slice(2)}-${String(count + 1).padStart(6, '0')}`,
          url: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${ticker}&type=${filingType}`,
          description: descriptions[filingType] || `Official ${filingType} filing`,
          content: `# ${ticker} ${filingType} ${year}\n\n## Business Overview\n\nThis is sample content for demonstration purposes. The actual SEC filing would contain detailed financial information, risk factors, management discussion and analysis, and audited financial statements.\n\n## Financial Highlights\n\n- Revenue: $X.X billion\n- Net Income: $X.X million\n- EPS: $X.XX\n\n## Risk Factors\n\n1. Market competition\n2. Regulatory changes\n3. Economic conditions\n\n*This is mock data for demonstration.*`,
        });
        count++;
      }
    }
  }
  
  return filings;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const { 
      ticker, 
      filingTypes = ['10-K', '10-Q', '8-K'], 
      limit = 10,
      fetchContent = false,
      filingUrl,
    }: SECFilingRequest = await req.json();
    
    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    
    // If fetching content for a single filing
    if (filingUrl) {
      console.log(`Fetching content for filing: ${filingUrl}`);
      
      if (!apiKey) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Firecrawl API key not configured. Please connect Firecrawl in Settings → Connectors.' 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Try to get the actual document URL from the filing page
      const documentUrls = await getDocumentUrls(filingUrl);
      const scrapeUrl = documentUrls?.htmlUrl || filingUrl;
      
      console.log(`Scraping document at: ${scrapeUrl}`);
      const content = await scrapeFilingContent(apiKey, scrapeUrl);
      
      return new Response(
        JSON.stringify({
          success: true,
          content,
          scrapeUrl,
          scrapedAt: new Date().toISOString(),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!ticker) {
      return new Response(
        JSON.stringify({ success: false, error: 'Ticker is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const tickerUpper = ticker.toUpperCase();
    
    let filings: SECFiling[];
    let source: string;
    
    // Try SEC EDGAR first (works without API key)
    console.log(`Fetching SEC filings for ${tickerUpper}...`);
    filings = await fetchSECFilingsList(tickerUpper, filingTypes, limit);
    source = 'sec_edgar';
    
    // If no results, use mock data
    if (filings.length === 0) {
      console.log('No results from SEC EDGAR, using mock data');
      filings = generateMockFilings(tickerUpper, filingTypes, limit);
      source = 'mock';
    }
    
    // If fetchContent is true and Firecrawl is available, scrape content for filings
    if (fetchContent && apiKey && filings.length > 0) {
      console.log('Fetching content for filings...');
      const filingsWithContent = await Promise.all(
        filings.slice(0, 5).map(async (filing) => {
          if (filing.url) {
            // Get document URLs from filing page
            const documentUrls = await getDocumentUrls(filing.url);
            const scrapeUrl = documentUrls?.htmlUrl || filing.url;
            
            if (scrapeUrl && !scrapeUrl.includes('browse-edgar?action=getcompany')) {
              const content = await scrapeFilingContent(apiKey, scrapeUrl);
              return { ...filing, content, documentUrl: scrapeUrl };
            }
          }
          return filing;
        })
      );
      
      filings = filings.map((f, i) => 
        i < 5 && filingsWithContent[i]?.content 
          ? filingsWithContent[i] 
          : f
      );
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        ticker: tickerUpper,
        filings,
        count: filings.length,
        source,
        scrapedAt: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in fetch-sec-filings:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
