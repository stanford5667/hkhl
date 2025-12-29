import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import * as cheerio from "https://esm.sh/cheerio@1.0.0-rc.12";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

interface MacroData {
  symbol: string;
  name: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
}

interface MultiplesData {
  [industry: string]: number;
}

interface NewsArticle {
  id: string;
  headline: string;
  url: string;
  source: string;
  time: string;
  isMock: boolean;
}

// Updated tickers with Silver and Bitcoin
const MACRO_TICKERS = [
  { symbol: "^TNX", name: "10Y Treasury" },
  { symbol: "^GSPC", name: "S&P 500" },
  { symbol: "CL=F", name: "Crude Oil" },
  { symbol: "GC=F", name: "Gold" },
  { symbol: "SI=F", name: "Silver" },
  { symbol: "BTC-USD", name: "Bitcoin" },
];

// Fallback news data
const fallbackNews: NewsArticle[] = [
  {
    id: "1",
    headline: "Private Equity Deal Volume Rebounds in Q4 2024",
    url: "https://finance.yahoo.com/topic/mna/",
    source: "Wall Street Journal",
    time: "2 hours ago",
    isMock: true,
  },
  {
    id: "2",
    headline: "Consumer Beauty Sector Sees Record M&A Activity",
    url: "https://finance.yahoo.com/topic/mna/",
    source: "Bloomberg",
    time: "5 hours ago",
    isMock: true,
  },
  {
    id: "3",
    headline: "Fed Signals Pause in Rate Cuts for Early 2025",
    url: "https://finance.yahoo.com/topic/mna/",
    source: "Reuters",
    time: "8 hours ago",
    isMock: true,
  },
  {
    id: "4",
    headline: "Healthcare Services Sector Faces Margin Pressure",
    url: "https://finance.yahoo.com/topic/mna/",
    source: "Financial Times",
    time: "12 hours ago",
    isMock: true,
  },
  {
    id: "5",
    headline: "New Mezzanine Fund Launches with $2B Target",
    url: "https://finance.yahoo.com/topic/mna/",
    source: "Private Equity International",
    time: "1 day ago",
    isMock: true,
  },
];

async function fetchYahooFinance(ticker: string): Promise<MacroData> {
  const url = `https://finance.yahoo.com/quote/${encodeURIComponent(ticker)}`;
  
  console.log(`Fetching Yahoo Finance data for ${ticker}...`);
  
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });

    if (!response.ok) {
      console.error(`Yahoo Finance returned ${response.status} for ${ticker}`);
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    let price: number | null = null;
    let changePercent: number | null = null;
    let change: number | null = null;

    // Selector for price - Yahoo Finance uses fin-streamer elements
    const priceSelector = `fin-streamer[data-symbol="${ticker}"][data-field="regularMarketPrice"]`;
    const priceEl = $(priceSelector);
    if (priceEl.length > 0) {
      const priceText = priceEl.attr("data-value") || priceEl.text();
      price = parseFloat(priceText.replace(/,/g, ""));
    }

    // Fallback: look for the price in the header section
    if (!price) {
      const headerPrice = $('[data-testid="qsp-price"]').first();
      if (headerPrice.length > 0) {
        price = parseFloat(headerPrice.text().replace(/,/g, ""));
      }
    }

    // Additional fallback using JSON patterns in page
    if (!price) {
      const priceMatch = html.match(/"regularMarketPrice":{"raw":([\d.]+)/);
      if (priceMatch) {
        price = parseFloat(priceMatch[1]);
      }
    }

    // Selector for change percent
    const changePercentSelector = `fin-streamer[data-symbol="${ticker}"][data-field="regularMarketChangePercent"]`;
    const changePercentEl = $(changePercentSelector);
    if (changePercentEl.length > 0) {
      const changeText = changePercentEl.attr("data-value") || changePercentEl.text();
      changePercent = parseFloat(changeText.replace(/[()%,]/g, ""));
    }

    // Fallback for change percent from JSON in page
    if (!changePercent) {
      const changeMatch = html.match(/"regularMarketChangePercent":{"raw":([-\d.]+)/);
      if (changeMatch) {
        changePercent = parseFloat(changeMatch[1]);
      }
    }

    // Get absolute change
    const changeSelector = `fin-streamer[data-symbol="${ticker}"][data-field="regularMarketChange"]`;
    const changeEl = $(changeSelector);
    if (changeEl.length > 0) {
      const changeText = changeEl.attr("data-value") || changeEl.text();
      change = parseFloat(changeText.replace(/[()%,+]/g, ""));
    }

    if (!change) {
      const absChangeMatch = html.match(/"regularMarketChange":{"raw":([-\d.]+)/);
      if (absChangeMatch) {
        change = parseFloat(absChangeMatch[1]);
      }
    }

    const tickerInfo = MACRO_TICKERS.find(t => t.symbol === ticker);
    
    console.log(`${ticker}: price=${price}, change=${change}, changePercent=${changePercent}`);

    return {
      symbol: ticker,
      name: tickerInfo?.name || ticker,
      price,
      change,
      changePercent,
    };
  } catch (error) {
    console.error(`Error fetching ${ticker}:`, error);
    const tickerInfo = MACRO_TICKERS.find(t => t.symbol === ticker);
    return {
      symbol: ticker,
      name: tickerInfo?.name || ticker,
      price: null,
      change: null,
      changePercent: null,
    };
  }
}

async function fetchMacroData(): Promise<MacroData[]> {
  console.log("Fetching macro data from Yahoo Finance...");
  
  const results: MacroData[] = [];
  
  // Fetch sequentially to avoid rate limiting
  for (const ticker of MACRO_TICKERS) {
    const data = await fetchYahooFinance(ticker.symbol);
    results.push(data);
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  return results;
}

async function fetchNewsData(): Promise<{ articles: NewsArticle[]; isMock: boolean }> {
  const url = "https://finance.yahoo.com/topic/mna/";
  
  console.log("Fetching M&A news from Yahoo Finance...");
  
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });

    if (!response.ok) {
      console.error(`Yahoo Finance news returned ${response.status}`);
      return { articles: fallbackNews, isMock: true };
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const articles: NewsArticle[] = [];

    // Try multiple selectors for news items
    const newsSelectors = [
      'li.stream-item',
      'li[class*="stream"]',
      'div[class*="stream"] li',
      'article',
      '[data-testid="story-item"]',
    ];

    for (const selector of newsSelectors) {
      if (articles.length >= 7) break;
      
      $(selector).each((index, element) => {
        if (articles.length >= 7) return false;

        const $el = $(element);
        
        // Try different selectors for headline
        let headline = 
          $el.find('h3 a').text().trim() ||
          $el.find('h3').text().trim() ||
          $el.find('a[class*="title"]').text().trim() ||
          $el.find('[class*="headline"]').text().trim() ||
          $el.find('a').first().text().trim();

        // Skip if no valid headline
        if (!headline || headline.length < 15) return;

        // Try different selectors for URL
        let articleUrl = 
          $el.find('h3 a').attr('href') ||
          $el.find('a[class*="title"]').attr('href') ||
          $el.find('a').first().attr('href') || '';

        // Prepend domain if relative URL
        if (articleUrl && !articleUrl.startsWith('http')) {
          articleUrl = `https://finance.yahoo.com${articleUrl}`;
        }

        // Try different selectors for source
        let source = 
          $el.find('[class*="provider"]').text().trim() ||
          $el.find('[class*="source"]').text().trim() ||
          $el.find('span').filter((_, el) => {
            const text = $(el).text();
            return text.length < 30 && !text.includes('ago') && !text.includes('•');
          }).first().text().trim() ||
          'Yahoo Finance';

        // Try different selectors for time
        let time = 
          $el.find('time').text().trim() ||
          $el.find('[class*="time"]').text().trim() ||
          $el.find('span').filter((_, el) => {
            const text = $(el).text();
            return text.includes('ago') || text.includes('hour') || text.includes('minute') || text.includes('day');
          }).text().trim() ||
          'Recently';

        // Clean up source (remove time if it got mixed in)
        if (source.includes('ago') || source.includes('hour')) {
          source = 'Yahoo Finance';
        }

        articles.push({
          id: `${articles.length + 1}`,
          headline: headline.substring(0, 200),
          url: articleUrl || 'https://finance.yahoo.com/topic/mna/',
          source: source.substring(0, 50) || 'Yahoo Finance',
          time: time || 'Recently',
          isMock: false,
        });
      });
    }

    // Alternative approach: look for any news links
    if (articles.length < 3) {
      console.log("Trying alternative news extraction...");
      
      $('a[href*="/news/"]').each((index, element) => {
        if (articles.length >= 7) return false;
        
        const $el = $(element);
        const headline = $el.text().trim();
        const href = $el.attr('href') || '';
        
        // Skip if already captured or too short
        if (headline.length < 20 || headline.length > 300) return;
        if (articles.some(a => a.headline === headline)) return;
        
        articles.push({
          id: `alt-${articles.length + 1}`,
          headline,
          url: href.startsWith('http') ? href : `https://finance.yahoo.com${href}`,
          source: 'Yahoo Finance',
          time: 'Recently',
          isMock: false,
        });
      });
    }

    console.log(`Extracted ${articles.length} news articles`);

    if (articles.length === 0) {
      console.log("No articles found, returning fallback");
      return { articles: fallbackNews, isMock: true };
    }

    return { articles, isMock: false };
  } catch (error) {
    console.error("Error fetching news:", error);
    return { articles: fallbackNews, isMock: true };
  }
}

async function fetchDamodaranMultiples(): Promise<MultiplesData> {
  const url = "https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/vebitda.html";
  
  console.log("Fetching Damodaran EV/EBITDA multiples...");
  
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const multiples: MultiplesData = {};

    // Find the main data table
    const tables = $("table");
    console.log(`Found ${tables.length} tables`);

    tables.each((tableIndex, table) => {
      const rows = $(table).find("tr");
      
      rows.each((rowIndex, row) => {
        const cells = $(row).find("td");
        
        if (cells.length >= 5) {
          const industryName = $(cells[0]).text().trim();
          const evEbitdaText = $(cells[4]).text().trim();
          
          if (industryName && industryName !== "Industry Name" && industryName.toLowerCase() !== "industry") {
            const evEbitda = parseFloat(evEbitdaText.replace(/,/g, ""));
            
            if (!isNaN(evEbitda) && evEbitda > 0 && evEbitda < 100) {
              multiples[industryName] = Math.round(evEbitda * 100) / 100;
            }
          }
        }
      });
    });

    console.log(`Extracted ${Object.keys(multiples).length} industry multiples`);
    
    if (Object.keys(multiples).length === 0) {
      console.log("No multiples extracted, returning fallback data");
      return getFallbackMultiples();
    }
    
    return multiples;
  } catch (error) {
    console.error("Error fetching Damodaran data:", error);
    return getFallbackMultiples();
  }
}

function getFallbackMultiples(): MultiplesData {
  return {
    "Software (System & Application)": 19.4,
    "Healthcare Products": 15.2,
    "Retail (Building Supply)": 12.8,
    "Financial Services (Non-bank)": 10.5,
    "Air Transport": 6.8,
    "Auto & Truck": 5.2,
    "Banks (Regional)": 8.1,
    "Biotechnology": 14.5,
    "Broadcasting": 9.3,
    "Chemical (Basic)": 7.8,
    "Computer Services": 12.1,
    "Electronics (Consumer & Office)": 10.2,
    "Entertainment": 11.5,
    "Food Processing": 10.8,
    "Healthcare Support Services": 13.2,
    "Homebuilding": 8.5,
    "Hotel/Gaming": 11.2,
    "Insurance (General)": 9.8,
    "Machinery": 10.4,
    "Oil/Gas (Integrated)": 5.5,
    "Pharmaceuticals": 12.8,
    "Restaurant/Dining": 14.2,
    "Semiconductor": 15.8,
    "Telecom (Wireless)": 7.2,
    "Transportation": 8.9,
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type } = await req.json();
    
    console.log(`Received request for type: ${type}`);

    if (type === "macro") {
      const data = await fetchMacroData();
      return new Response(
        JSON.stringify({
          success: true,
          data,
          source: "Yahoo Finance",
          timestamp: new Date().toISOString(),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } 
    
    if (type === "news") {
      const { articles, isMock } = await fetchNewsData();
      return new Response(
        JSON.stringify({
          success: true,
          data: articles,
          isMock,
          source: isMock ? "Mock Data" : "Yahoo Finance",
          timestamp: new Date().toISOString(),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } 
    
    if (type === "multiples") {
      const data = await fetchDamodaranMultiples();
      return new Response(
        JSON.stringify({
          success: true,
          data,
          source: "NYU Stern (Damodaran)",
          timestamp: new Date().toISOString(),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: "Invalid type. Use 'macro', 'news', or 'multiples'.",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in fetch-market-data:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
