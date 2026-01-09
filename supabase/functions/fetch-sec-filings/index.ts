const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SECFilingRequest {
  ticker: string;
  filingTypes?: string[]; // ['10-K', '10-Q', '8-K', 'DEF 14A']
  limit?: number;
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

// Get CIK from ticker using SEC EDGAR
async function getCIKFromTicker(ticker: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company=${ticker}&type=&dateb=&owner=include&count=1&search_text=&output=atom`,
      {
        headers: {
          'User-Agent': 'AssetLabs Research Bot contact@assetlabs.com',
          'Accept': 'application/atom+xml',
        },
      }
    );
    
    if (!response.ok) return null;
    
    const text = await response.text();
    // Extract CIK from the response
    const cikMatch = text.match(/CIK=(\d+)/);
    return cikMatch?.[1] || null;
  } catch (error) {
    console.error('Error getting CIK:', error);
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
  
  // Try getting filings from SEC EDGAR RSS feed
  for (const filingType of filingTypes) {
    try {
      const url = `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company=${ticker}&type=${encodeURIComponent(filingType)}&dateb=&owner=include&count=${limit}&output=atom`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'AssetLabs Research Bot contact@assetlabs.com',
          'Accept': 'application/atom+xml',
        },
      });
      
      if (!response.ok) continue;
      
      const text = await response.text();
      
      // Parse the Atom feed
      const entries = text.match(/<entry>[\s\S]*?<\/entry>/g) || [];
      
      for (const entry of entries.slice(0, limit)) {
        const titleMatch = entry.match(/<title[^>]*>([^<]+)<\/title>/);
        const linkMatch = entry.match(/<link[^>]*href="([^"]+)"/);
        const updatedMatch = entry.match(/<updated>([^<]+)<\/updated>/);
        const summaryMatch = entry.match(/<summary[^>]*>([^<]*)<\/summary>/);
        const accessionMatch = entry.match(/accession-number=(\d+-\d+-\d+)/);
        
        if (titleMatch && linkMatch) {
          filings.push({
            type: filingType,
            title: titleMatch[1].replace(/&amp;/g, '&').trim(),
            filedAt: updatedMatch?.[1] || new Date().toISOString(),
            accessionNumber: accessionMatch?.[1] || '',
            url: linkMatch[1],
            description: summaryMatch?.[1]?.replace(/&amp;/g, '&').trim() || '',
          });
        }
      }
    } catch (error) {
      console.error(`Error fetching ${filingType} filings:`, error);
    }
  }
  
  return filings.slice(0, limit);
}

// Use Firecrawl to scrape filing content
async function scrapeFilingContent(apiKey: string, url: string): Promise<string> {
  try {
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
        waitFor: 2000,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Firecrawl scrape failed: ${response.status}`);
    }
    
    const data = await response.json();
    return data.data?.markdown || data.markdown || '';
  } catch (error) {
    console.error('Error scraping filing:', error);
    return '';
  }
}

// Search for SEC filings using Firecrawl
async function searchSECFilings(
  apiKey: string,
  ticker: string,
  filingTypes: string[],
  limit: number
): Promise<SECFiling[]> {
  const filings: SECFiling[] = [];
  
  for (const filingType of filingTypes) {
    try {
      const query = `site:sec.gov ${ticker} ${filingType} filing`;
      
      const response = await fetch('https://api.firecrawl.dev/v1/search', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          limit: Math.ceil(limit / filingTypes.length),
        }),
      });
      
      if (!response.ok) continue;
      
      const data = await response.json();
      
      for (const result of (data.data || [])) {
        // Parse accession number from URL
        const accessionMatch = result.url?.match(/(\d{10}-\d{2}-\d{6})/);
        
        filings.push({
          type: filingType,
          title: result.title || `${ticker} ${filingType}`,
          filedAt: new Date().toISOString(),
          accessionNumber: accessionMatch?.[1] || '',
          url: result.url,
          description: result.description || '',
        });
      }
    } catch (error) {
      console.error(`Error searching ${filingType}:`, error);
    }
  }
  
  return filings.slice(0, limit);
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
    const { ticker, filingTypes = ['10-K', '10-Q', '8-K'], limit = 10 }: SECFilingRequest = await req.json();
    
    if (!ticker) {
      return new Response(
        JSON.stringify({ success: false, error: 'Ticker is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    const tickerUpper = ticker.toUpperCase();
    
    let filings: SECFiling[];
    let source: string;
    
    // Try SEC EDGAR first (works without API key)
    console.log(`Fetching SEC filings for ${tickerUpper}...`);
    filings = await fetchSECFilingsList(tickerUpper, filingTypes, limit);
    source = 'sec_edgar';
    
    // If no results from SEC EDGAR, try Firecrawl search
    if (filings.length === 0 && apiKey) {
      console.log('No SEC EDGAR results, trying Firecrawl search...');
      filings = await searchSECFilings(apiKey, tickerUpper, filingTypes, limit);
      source = 'firecrawl';
    }
    
    // If still no results, use mock data
    if (filings.length === 0) {
      console.log('No results from APIs, using mock data');
      filings = generateMockFilings(tickerUpper, filingTypes, limit);
      source = 'mock';
    }
    
    // If Firecrawl available, scrape content for top filings
    if (apiKey && filings.length > 0) {
      const filingsWithContent = await Promise.all(
        filings.slice(0, 3).map(async (filing) => {
          if (filing.url && !filing.url.includes('browse-edgar')) {
            const content = await scrapeFilingContent(apiKey, filing.url);
            return { ...filing, content: content.slice(0, 5000) }; // Limit content size
          }
          return filing;
        })
      );
      
      // Merge content back
      filings = filings.map((f, i) => 
        i < 3 && filingsWithContent[i]?.content 
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
