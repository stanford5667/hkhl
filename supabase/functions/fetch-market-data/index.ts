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

async function fetchYahooQuotes(symbols: string[]): Promise<Record<string, any>> {
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(
    symbols.join(",")
  )}&lang=en-US&region=US&corsDomain=finance.yahoo.com`;
  console.log(`Fetching Yahoo quote JSON for ${symbols.join(", ")}`);

  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      "Accept": "application/json,text/plain,*/*",
      "Accept-Language": "en-US,en;q=0.5",
      "Referer": "https://finance.yahoo.com/",
    },
  });

  console.log(`Quote endpoint status: ${res.status}`);

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`Yahoo quote endpoint failed (${res.status}): ${body.slice(0, 300)}`);
    throw new Error(`Yahoo quote endpoint failed (${res.status})`);
  }

  const json = await res.json();
  const results: any[] = json?.quoteResponse?.result ?? [];
  console.log(`Quote endpoint returned ${results.length} results`);

  const bySymbol: Record<string, any> = {};
  for (const item of results) {
    if (item?.symbol) bySymbol[item.symbol] = item;
  }
  return bySymbol;
}

async function fetchMacroData(): Promise<MacroData[]> {
  console.log("Fetching macro data from Yahoo Finance quote endpoint...");

  try {
    const symbols = MACRO_TICKERS.map((t) => t.symbol);
    const bySymbol = await fetchYahooQuotes(symbols);

    return MACRO_TICKERS.map((t) => {
      const q = bySymbol[t.symbol];
      const price = typeof q?.regularMarketPrice === "number" ? q.regularMarketPrice : null;
      const change = typeof q?.regularMarketChange === "number" ? q.regularMarketChange : null;
      const changePercent =
        typeof q?.regularMarketChangePercent === "number" ? q.regularMarketChangePercent : null;

      return {
        symbol: t.symbol,
        name: t.name,
        price,
        change,
        changePercent,
      };
    });
  } catch (e) {
    console.error("Macro quote endpoint failed, returning nulls:", e);
    return MACRO_TICKERS.map((t) => ({
      symbol: t.symbol,
      name: t.name,
      price: null,
      change: null,
      changePercent: null,
    }));
  }
}

async function fetchNewsData(): Promise<{ articles: NewsArticle[]; isMock: boolean }> {
  // Use Yahoo Finance search endpoint for news to avoid HTML bot blocks.
  const url = "https://query1.finance.yahoo.com/v1/finance/search?q=mergers%20acquisitions&newsCount=7&quotesCount=0&listsCount=0";
  console.log("Fetching M&A news from Yahoo Finance search endpoint...");

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "application/json,text/plain,*/*",
        "Accept-Language": "en-US,en;q=0.5",
        "Referer": "https://finance.yahoo.com/",
        "Origin": "https://finance.yahoo.com",
      },
    });

    if (!res.ok) {
      console.error(`Yahoo news endpoint returned ${res.status}`);
      return { articles: fallbackNews, isMock: true };
    }

    const json = await res.json();
    const items: any[] = json?.news ?? [];

    const articles: NewsArticle[] = items.slice(0, 7).map((n, idx) => {
      const headline = String(n?.title ?? "").trim();
      let articleUrl = String(n?.link ?? "").trim();
      if (articleUrl && !articleUrl.startsWith("http")) {
        articleUrl = `https://finance.yahoo.com${articleUrl}`;
      }

      const source = String(n?.publisher ?? n?.provider_name ?? "Yahoo Finance").trim() || "Yahoo Finance";
      const ts = n?.providerPublishTime ?? n?.provider_publish_time;
      const time = ts ? new Date(Number(ts) * 1000).toLocaleString() : "";

      return {
        id: String(n?.uuid ?? n?.id ?? idx + 1),
        headline: headline || `Article ${idx + 1}`,
        url: articleUrl || "https://finance.yahoo.com/topic/mna/",
        source: source.slice(0, 50),
        time: time || "Recently",
        isMock: false,
      };
    }).filter(a => a.headline && a.url);

    if (articles.length < 3) {
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
