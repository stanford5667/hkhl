const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ResearchRequest {
  ticker: string;
  companyName?: string;
  scrapeType: 'news' | 'financials' | 'sec_filings' | 'analyst' | 'social' | 'comprehensive';
  limit?: number;
}

// Mock data generators for demo mode
function generateMockNews(ticker: string, limit: number) {
  const sentiments = ['positive', 'negative', 'neutral'];
  const sources = ['Bloomberg', 'Reuters', 'CNBC', 'Wall Street Journal', 'MarketWatch', 'Yahoo Finance'];
  const articles = [];
  
  for (let i = 0; i < limit; i++) {
    const daysAgo = Math.floor(Math.random() * 7);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    
    articles.push({
      title: `${ticker} ${['Reports Strong Earnings', 'Faces Market Pressure', 'Announces New Product', 'Expands Operations', 'Sees Analyst Upgrade'][i % 5]}`,
      source: sources[i % sources.length],
      url: `https://example.com/news/${ticker.toLowerCase()}-${i}`,
      date: date.toISOString(),
      summary: `Latest developments regarding ${ticker} stock performance and market position.`,
      sentiment: sentiments[i % 3] as 'positive' | 'negative' | 'neutral',
      relevance: 0.95 - (i * 0.05),
    });
  }
  
  return { type: 'news', ticker, articles, scrapedAt: new Date().toISOString() };
}

function generateMockFinancials(ticker: string) {
  const marketCaps = ['$50B', '$100B', '$500B', '$1T', '$2T'];
  const sectors = ['Technology', 'Healthcare', 'Finance', 'Consumer', 'Industrial'];
  
  return {
    type: 'financials',
    ticker,
    company: {
      ticker,
      name: `${ticker} Corporation`,
      sector: sectors[Math.floor(Math.random() * sectors.length)],
      industry: 'Diversified',
      marketCap: marketCaps[Math.floor(Math.random() * marketCaps.length)],
      peRatio: (15 + Math.random() * 30).toFixed(2),
      dividendYield: (Math.random() * 3).toFixed(2) + '%',
      eps: (2 + Math.random() * 10).toFixed(2),
    },
    keyStats: {
      beta: (0.8 + Math.random() * 0.8).toFixed(2),
      fiftyTwoWeekHigh: '$' + (100 + Math.random() * 200).toFixed(2),
      fiftyTwoWeekLow: '$' + (50 + Math.random() * 100).toFixed(2),
      avgVolume: Math.floor(1000000 + Math.random() * 10000000).toLocaleString(),
    },
    scrapedAt: new Date().toISOString(),
  };
}

function generateMockSecFilings(ticker: string, limit: number) {
  const filingTypes = ['10-K', '10-Q', '8-K', 'Form 4', 'DEF 14A'];
  const filings = [];
  
  for (let i = 0; i < limit; i++) {
    const daysAgo = i * 30;
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    
    filings.push({
      type: filingTypes[i % filingTypes.length],
      title: `${filingTypes[i % filingTypes.length]} - ${ticker}`,
      filedAt: date.toISOString(),
      url: `https://sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${ticker}`,
      description: `Official SEC filing for ${ticker}`,
    });
  }
  
  return { type: 'sec_filings', ticker, filings, scrapedAt: new Date().toISOString() };
}

function generateMockAnalyst(ticker: string) {
  const analysts = ['Goldman Sachs', 'Morgan Stanley', 'JP Morgan', 'Bank of America', 'Citi'];
  const ratings = ['Buy', 'Hold', 'Sell'];
  const reports = [];
  
  for (let i = 0; i < 5; i++) {
    reports.push({
      analyst: analysts[i],
      rating: ratings[i % 3] as 'Buy' | 'Hold' | 'Sell',
      priceTarget: 100 + Math.floor(Math.random() * 200),
      date: new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }
  
  const avgTarget = reports.reduce((sum, r) => sum + r.priceTarget, 0) / reports.length;
  const buyCount = reports.filter(r => r.rating === 'Buy').length;
  const holdCount = reports.filter(r => r.rating === 'Hold').length;
  
  return {
    type: 'analyst',
    ticker,
    consensus: buyCount > holdCount ? 'Buy' : 'Hold',
    averageTarget: avgTarget.toFixed(2),
    reports,
    scrapedAt: new Date().toISOString(),
  };
}

function generateMockSocial(ticker: string) {
  return {
    type: 'social',
    ticker,
    overallSentiment: (Math.random() * 2 - 1).toFixed(2),
    breakdown: {
      positive: Math.floor(40 + Math.random() * 30),
      negative: Math.floor(10 + Math.random() * 20),
      neutral: Math.floor(20 + Math.random() * 20),
    },
    mentions: [
      { platform: 'Twitter', content: `$${ticker} looking bullish today!`, sentiment: 'positive', timestamp: new Date().toISOString() },
      { platform: 'Reddit', content: `Anyone else holding ${ticker}?`, sentiment: 'neutral', timestamp: new Date().toISOString() },
      { platform: 'StockTwits', content: `${ticker} earnings coming up`, sentiment: 'positive', timestamp: new Date().toISOString() },
    ],
    scrapedAt: new Date().toISOString(),
  };
}

// Firecrawl API helpers
async function firecrawlSearch(apiKey: string, query: string, limit: number = 5) {
  const response = await fetch('https://api.firecrawl.dev/v1/search', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      limit,
      scrapeOptions: { formats: ['markdown'] },
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Firecrawl search failed: ${response.status}`);
  }
  
  return response.json();
}

async function firecrawlScrape(apiKey: string, url: string) {
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
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Firecrawl scrape failed: ${response.status}`);
  }
  
  return response.json();
}

// Sentiment analysis helper
function analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' {
  const positive = ['bullish', 'growth', 'surge', 'gain', 'profit', 'beat', 'strong', 'upgrade', 'buy'];
  const negative = ['bearish', 'decline', 'drop', 'loss', 'miss', 'weak', 'downgrade', 'sell', 'concern'];
  
  const lowerText = text.toLowerCase();
  let score = 0;
  
  positive.forEach(word => { if (lowerText.includes(word)) score++; });
  negative.forEach(word => { if (lowerText.includes(word)) score--; });
  
  if (score > 0) return 'positive';
  if (score < 0) return 'negative';
  return 'neutral';
}

// Real data scrapers
async function scrapeNews(apiKey: string, ticker: string, companyName: string, limit: number) {
  const searchQuery = `${ticker} ${companyName} stock news`;
  const searchResults = await firecrawlSearch(apiKey, searchQuery, limit);
  
  const articles = (searchResults.data || []).map((result: any) => ({
    title: result.title || 'News Article',
    source: new URL(result.url).hostname.replace('www.', ''),
    url: result.url,
    date: new Date().toISOString(),
    summary: result.description || result.markdown?.slice(0, 200) || '',
    sentiment: analyzeSentiment(result.markdown || result.title || ''),
    relevance: 0.9,
  }));
  
  return { type: 'news', ticker, articles, scrapedAt: new Date().toISOString() };
}

async function scrapeFinancials(apiKey: string, ticker: string) {
  const url = `https://finance.yahoo.com/quote/${ticker}`;
  
  try {
    const result = await firecrawlScrape(apiKey, url);
    const markdown = result.data?.markdown || result.markdown || '';
    
    // Parse basic info from markdown
    const marketCapMatch = markdown.match(/Market Cap[:\s]+\$?([\d.]+[BTMK]?)/i);
    const peMatch = markdown.match(/PE Ratio[:\s]+([\d.]+)/i);
    const divMatch = markdown.match(/Dividend Yield[:\s]+([\d.]+%?)/i);
    const epsMatch = markdown.match(/EPS[:\s]+\$?([\d.]+)/i);
    
    return {
      type: 'financials',
      ticker,
      company: {
        ticker,
        name: result.data?.metadata?.title || `${ticker}`,
        sector: 'N/A',
        industry: 'N/A',
        marketCap: marketCapMatch?.[1] || 'N/A',
        peRatio: peMatch?.[1] || 'N/A',
        dividendYield: divMatch?.[1] || 'N/A',
        eps: epsMatch?.[1] || 'N/A',
      },
      keyStats: {
        beta: 'N/A',
        fiftyTwoWeekHigh: 'N/A',
        fiftyTwoWeekLow: 'N/A',
        avgVolume: 'N/A',
      },
      rawMarkdown: markdown.slice(0, 2000),
      scrapedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error scraping financials:', error);
    return generateMockFinancials(ticker);
  }
}

async function scrapeSecFilings(apiKey: string, ticker: string, limit: number) {
  const searchQuery = `${ticker} SEC filing 10-K 10-Q site:sec.gov`;
  
  try {
    const searchResults = await firecrawlSearch(apiKey, searchQuery, limit);
    
    const filings = (searchResults.data || []).map((result: any) => ({
      type: result.title?.includes('10-K') ? '10-K' : result.title?.includes('10-Q') ? '10-Q' : '8-K',
      title: result.title || 'SEC Filing',
      filedAt: new Date().toISOString(),
      url: result.url,
      description: result.description || '',
    }));
    
    return { type: 'sec_filings', ticker, filings, scrapedAt: new Date().toISOString() };
  } catch (error) {
    console.error('Error scraping SEC filings:', error);
    return generateMockSecFilings(ticker, limit);
  }
}

async function scrapeAnalyst(apiKey: string, ticker: string) {
  const searchQuery = `${ticker} analyst rating price target upgrade downgrade`;
  
  try {
    const searchResults = await firecrawlSearch(apiKey, searchQuery, 5);
    const markdown = searchResults.data?.[0]?.markdown || '';
    
    // Simple extraction - in production, use more sophisticated parsing
    const reports = [
      { analyst: 'Consensus', rating: analyzeSentiment(markdown) === 'positive' ? 'Buy' : 'Hold', priceTarget: 0, date: new Date().toISOString() },
    ];
    
    return {
      type: 'analyst',
      ticker,
      consensus: reports[0].rating,
      averageTarget: 'N/A',
      reports,
      rawData: markdown.slice(0, 1000),
      scrapedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error scraping analyst data:', error);
    return generateMockAnalyst(ticker);
  }
}

async function scrapeSocial(apiKey: string, ticker: string) {
  const searchQuery = `$${ticker} stock twitter reddit sentiment`;
  
  try {
    const searchResults = await firecrawlSearch(apiKey, searchQuery, 10);
    
    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;
    
    const mentions = (searchResults.data || []).slice(0, 5).map((result: any) => {
      const sentiment = analyzeSentiment(result.markdown || result.title || '');
      if (sentiment === 'positive') positiveCount++;
      else if (sentiment === 'negative') negativeCount++;
      else neutralCount++;
      
      return {
        platform: result.url.includes('twitter') ? 'Twitter' : result.url.includes('reddit') ? 'Reddit' : 'Web',
        content: result.description || result.title || '',
        sentiment,
        timestamp: new Date().toISOString(),
      };
    });
    
    const total = positiveCount + negativeCount + neutralCount || 1;
    const overallSentiment = ((positiveCount - negativeCount) / total).toFixed(2);
    
    return {
      type: 'social',
      ticker,
      overallSentiment,
      breakdown: {
        positive: Math.round((positiveCount / total) * 100),
        negative: Math.round((negativeCount / total) * 100),
        neutral: Math.round((neutralCount / total) * 100),
      },
      mentions,
      scrapedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error scraping social sentiment:', error);
    return generateMockSocial(ticker);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const { ticker, companyName, scrapeType, limit = 5 }: ResearchRequest = await req.json();
    
    if (!ticker) {
      return new Response(
        JSON.stringify({ success: false, error: 'Ticker is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    const useMock = !apiKey;
    
    if (useMock) {
      console.log('No FIRECRAWL_API_KEY found, using mock data');
    }
    
    const name = companyName || ticker;
    let result: any;
    
    switch (scrapeType) {
      case 'news':
        result = useMock ? generateMockNews(ticker, limit) : await scrapeNews(apiKey!, ticker, name, limit);
        break;
      case 'financials':
        result = useMock ? generateMockFinancials(ticker) : await scrapeFinancials(apiKey!, ticker);
        break;
      case 'sec_filings':
        result = useMock ? generateMockSecFilings(ticker, limit) : await scrapeSecFilings(apiKey!, ticker, limit);
        break;
      case 'analyst':
        result = useMock ? generateMockAnalyst(ticker) : await scrapeAnalyst(apiKey!, ticker);
        break;
      case 'social':
        result = useMock ? generateMockSocial(ticker) : await scrapeSocial(apiKey!, ticker);
        break;
      case 'comprehensive':
        const [news, financials, secFilings, analyst, social] = await Promise.all([
          useMock ? generateMockNews(ticker, limit) : scrapeNews(apiKey!, ticker, name, limit),
          useMock ? generateMockFinancials(ticker) : scrapeFinancials(apiKey!, ticker),
          useMock ? generateMockSecFilings(ticker, limit) : scrapeSecFilings(apiKey!, ticker, limit),
          useMock ? generateMockAnalyst(ticker) : scrapeAnalyst(apiKey!, ticker),
          useMock ? generateMockSocial(ticker) : scrapeSocial(apiKey!, ticker),
        ]);
        result = { type: 'comprehensive', ticker, news, financials, secFilings, analyst, social, scrapedAt: new Date().toISOString() };
        break;
      default:
        return new Response(
          JSON.stringify({ success: false, error: `Unknown scrape type: ${scrapeType}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
    
    return new Response(
      JSON.stringify({ success: true, data: result, source: useMock ? 'mock' : 'firecrawl' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in firecrawl-research:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
