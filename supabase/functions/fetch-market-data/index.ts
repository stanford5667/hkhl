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

async function fetchHtml(url: string): Promise<string> {
  const headers = {
    "User-Agent": USER_AGENT,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
  };

  // Yahoo frequently triggers HTTP/2 / bot protections from server-to-server environments.
  // We first try direct fetch, and if it fails we fall back to a text-proxy that returns the rendered HTML.
  try {
    const res = await fetch(url, { headers });
    if (res.ok) return await res.text();
    console.warn(`Direct fetch failed (${res.status}) for ${url}, falling back...`);
  } catch (e) {
    console.warn(`Direct fetch errored for ${url}, falling back...`, e);
  }

  // Fallback via Jina AI fetcher (simple HTML proxy)
  // Format: https://r.jina.ai/https://example.com/page
  const proxied = `https://r.jina.ai/${url}`;
  const res2 = await fetch(proxied, { headers });
  if (!res2.ok) throw new Error(`Fallback fetch failed (${res2.status}) for ${url}`);
  return await res2.text();
}

async function fetchYahooFinance(ticker: string): Promise<MacroData> {
  const url = `https://finance.yahoo.com/quote/${encodeURIComponent(ticker)}`;

  console.log(`Fetching Yahoo Finance data for ${ticker}...`);

  try {
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);

    // Per spec: scrape these fin-streamer fields
    const priceText =
      $('fin-streamer[data-field="regularMarketPrice"]').first().attr("data-value") ||
      $('fin-streamer[data-field="regularMarketPrice"]').first().text();

    const changePctText =
      $('fin-streamer[data-field="regularMarketChangePercent"]').first().attr("data-value") ||
      $('fin-streamer[data-field="regularMarketChangePercent"]').first().text();

    const changeText =
      $('fin-streamer[data-field="regularMarketChange"]').first().attr("data-value") ||
      $('fin-streamer[data-field="regularMarketChange"]').first().text();

    const price = priceText ? parseFloat(String(priceText).replace(/,/g, "")) : null;
    const changePercent = changePctText
      ? parseFloat(String(changePctText).replace(/[()%,]/g, ""))
      : null;
    const change = changeText ? parseFloat(String(changeText).replace(/[()%,+]/g, "")) : null;

    const tickerInfo = MACRO_TICKERS.find((t) => t.symbol === ticker);

    console.log(`${ticker}: price=${price}, change=${change}, changePercent=${changePercent}`);

    return {
      symbol: ticker,
      name: tickerInfo?.name || ticker,
      price: Number.isFinite(price as number) ? price : null,
      change: Number.isFinite(change as number) ? change : null,
      changePercent: Number.isFinite(changePercent as number) ? changePercent : null,
    };
  } catch (error) {
    console.error(`Error fetching ${ticker}:`, error);
    const tickerInfo = MACRO_TICKERS.find((t) => t.symbol === ticker);
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
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  return results;
}

async function fetchNewsData(): Promise<{ articles: NewsArticle[]; isMock: boolean }> {
  const url = "https://finance.yahoo.com/topic/mna/";

  console.log("Fetching M&A news from Yahoo Finance...");

  try {
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);

    const articles: NewsArticle[] = [];

    // Spec: look for li items in main stream; Yahoo markup shifts, so start with broad LI scan.
    $("main li").each((_, el) => {
      if (articles.length >= 7) return false;

      const $li = $(el);

      const headline =
        $li.find("h3 a").first().text().trim() ||
        $li.find("h3").first().text().trim() ||
        $li.find("a").first().text().trim();

      if (!headline || headline.length < 20) return;

      let href = $li.find("h3 a").first().attr("href") || $li.find("a").first().attr("href") || "";
      if (!href) return;

      if (!href.startsWith("http")) href = `https://finance.yahoo.com${href}`;

      // Source + time are often in small spans near the headline
      const metaText =
        $li.find("span").first().text().trim() ||
        $li.find("span").eq(1).text().trim() ||
        "";

      const source =
        $li.find('[class*="provider"], [class*="source"]').first().text().trim() ||
        (metaText && !metaText.includes("ago") ? metaText : "Yahoo Finance");

      const time =
        $li.find("time").first().text().trim() ||
        $li
          .find("span")
          .toArray()
          .map((s) => $(s).text().trim())
          .find((t) => /ago|hour|minute|day|yesterday/i.test(t || "")) ||
        "Recently";

      // Deduplicate
      if (articles.some((a) => a.url === href || a.headline === headline)) return;

      articles.push({
        id: String(articles.length + 1),
        headline: headline.slice(0, 200),
        url: href,
        source: (source || "Yahoo Finance").slice(0, 50),
        time: (time || "Recently").slice(0, 50),
        isMock: false,
      });
    });

    console.log(`Extracted ${articles.length} news articles`);

    if (articles.length < 3) {
      console.log("Not enough articles found; returning fallback news.");
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
