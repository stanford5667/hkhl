import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BASE_URL = "https://api.polygon.io";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface ETFDetails {
  ticker: string;
  name: string;
  description: string;
  category: string;
  issuer: string;
  expenseRatio: number | null;
  aum: number | null;
  holdings: number | null;
  inceptionDate: string | null;
  avgVolume: number | null;
  beta: number | null;
  dividendYield: number | null;
  ytdReturn: number | null;
  oneYearReturn: number | null;
  threeYearReturn: number | null;
  fiveYearReturn: number | null;
  topHoldings: Array<{ symbol: string; name: string; weight: number }>;
  sectorBreakdown: Array<{ sector: string; weight: number }>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const ticker = String(body.ticker || "").toUpperCase().trim();

    if (!ticker) {
      return json({ ok: false, error: "ticker is required" }, 400);
    }

    const POLYGON_API_KEY = Deno.env.get("POLYGON_API_KEY") || Deno.env.get("VITE_POLYGON_API_KEY");

    if (!POLYGON_API_KEY) {
      return json({ ok: false, error: "Polygon API key not configured" }, 500);
    }

    console.log(`[polygon-etf-details] Fetching ETF details for ${ticker}`);

    // Fetch basic ticker details
    const detailsUrl = `${BASE_URL}/v3/reference/tickers/${encodeURIComponent(ticker)}?apiKey=${POLYGON_API_KEY}`;
    const detailsRes = await fetch(detailsUrl);
    const detailsText = await detailsRes.text();
    
    let tickerDetails: any = null;
    if (detailsRes.ok) {
      const data = JSON.parse(detailsText);
      if (data.status === "OK" && data.results) {
        tickerDetails = data.results;
      }
    }

    if (!tickerDetails) {
      console.warn(`[polygon-etf-details] No ticker data for ${ticker}`);
      return json({ ok: false, error: "ETF not found", ticker, notFound: true }, 200);
    }

    // Fetch snapshot for current price data and performance
    const snapshotUrl = `${BASE_URL}/v2/snapshot/locale/us/markets/stocks/tickers/${encodeURIComponent(ticker)}?apiKey=${POLYGON_API_KEY}`;
    const snapshotRes = await fetch(snapshotUrl);
    let snapshot: any = null;
    if (snapshotRes.ok) {
      const snapData = await snapshotRes.json();
      if (snapData.status === "OK" && snapData.ticker) {
        snapshot = snapData.ticker;
      }
    }

    // Fetch daily bars for calculating returns (1 year of data)
    const today = new Date();
    const oneYearAgo = new Date(today);
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    const barsUrl = `${BASE_URL}/v2/aggs/ticker/${encodeURIComponent(ticker)}/range/1/day/${oneYearAgo.toISOString().split('T')[0]}/${today.toISOString().split('T')[0]}?adjusted=true&sort=asc&apiKey=${POLYGON_API_KEY}`;
    const barsRes = await fetch(barsUrl);
    let bars: any[] = [];
    if (barsRes.ok) {
      const barsData = await barsRes.json();
      if (barsData.results && Array.isArray(barsData.results)) {
        bars = barsData.results;
      }
    }

    // Calculate returns from price history
    let ytdReturn: number | null = null;
    let oneYearReturn: number | null = null;
    
    if (bars.length > 0) {
      const currentPrice = bars[bars.length - 1]?.c || 0;
      
      // YTD return (from Jan 1 of current year)
      const janFirst = new Date(today.getFullYear(), 0, 1);
      const ytdBar = bars.find((b: any) => {
        const barDate = new Date(b.t);
        return barDate >= janFirst;
      });
      if (ytdBar && currentPrice > 0) {
        ytdReturn = ((currentPrice - ytdBar.o) / ytdBar.o) * 100;
      }
      
      // 1 year return
      if (bars.length > 200 && currentPrice > 0) {
        const yearAgoPrice = bars[0]?.c || bars[0]?.o || 0;
        if (yearAgoPrice > 0) {
          oneYearReturn = ((currentPrice - yearAgoPrice) / yearAgoPrice) * 100;
        }
      }
    }

    // Calculate average volume from recent bars
    let avgVolume: number | null = null;
    if (bars.length >= 20) {
      const recentBars = bars.slice(-20);
      const totalVolume = recentBars.reduce((sum: number, bar: any) => sum + (bar.v || 0), 0);
      avgVolume = Math.round(totalVolume / 20);
    }

    // Estimate dividend yield from description or other signals
    // Polygon doesn't provide ETF-specific dividend data directly in basic endpoints
    let dividendYield: number | null = null;
    const description = tickerDetails.description || "";
    
    // Try to extract category/issuer from name or description
    let category = "ETF";
    let issuer = "";
    
    const name = tickerDetails.name || ticker;
    if (name.includes("iShares")) {
      issuer = "iShares (BlackRock)";
    } else if (name.includes("Vanguard")) {
      issuer = "Vanguard";
    } else if (name.includes("SPDR") || name.includes("State Street")) {
      issuer = "State Street";
    } else if (name.includes("Invesco")) {
      issuer = "Invesco";
    } else if (name.includes("Schwab")) {
      issuer = "Charles Schwab";
    } else if (name.includes("ProShares")) {
      issuer = "ProShares";
    } else if (name.includes("WisdomTree")) {
      issuer = "WisdomTree";
    } else if (name.includes("ARK")) {
      issuer = "ARK Invest";
    }
    
    // Determine category from name/description
    if (name.toLowerCase().includes("silver") || ticker === "SLV") {
      category = "Precious Metals";
    } else if (name.toLowerCase().includes("gold") || ticker === "GLD") {
      category = "Precious Metals";
    } else if (name.toLowerCase().includes("bitcoin") || ticker.includes("BIT")) {
      category = "Cryptocurrency";
    } else if (name.toLowerCase().includes("bond") || name.toLowerCase().includes("treasury")) {
      category = "Fixed Income";
    } else if (name.toLowerCase().includes("tech") || name.toLowerCase().includes("technology")) {
      category = "Technology";
    } else if (name.toLowerCase().includes("energy")) {
      category = "Energy";
    } else if (name.toLowerCase().includes("health")) {
      category = "Healthcare";
    } else if (name.toLowerCase().includes("financ")) {
      category = "Financials";
    } else if (name.toLowerCase().includes("real estate") || name.toLowerCase().includes("reit")) {
      category = "Real Estate";
    } else if (name.toLowerCase().includes("s&p 500") || ticker === "SPY" || ticker === "VOO" || ticker === "IVV") {
      category = "Large Cap Blend";
    } else if (name.toLowerCase().includes("nasdaq") || ticker === "QQQ") {
      category = "Large Cap Growth";
    } else if (name.toLowerCase().includes("small cap") || name.toLowerCase().includes("russell 2000") || ticker === "IWM") {
      category = "Small Cap Blend";
    } else if (name.toLowerCase().includes("dividend")) {
      category = "Dividend";
    } else if (name.toLowerCase().includes("total market") || name.toLowerCase().includes("total stock")) {
      category = "Total Market";
    } else if (name.toLowerCase().includes("emerging")) {
      category = "Emerging Markets";
    } else if (name.toLowerCase().includes("international") || name.toLowerCase().includes("developed")) {
      category = "International";
    }

    // Build the ETF details response
    const etfDetails: ETFDetails = {
      ticker: ticker,
      name: name,
      description: description,
      category: category,
      issuer: issuer,
      expenseRatio: null, // Would need additional data source
      aum: tickerDetails.market_cap || null, // Market cap is effectively AUM for ETFs
      holdings: null, // Would need holdings endpoint
      inceptionDate: tickerDetails.list_date || null,
      avgVolume: avgVolume,
      beta: null, // Would need to calculate
      dividendYield: dividendYield,
      ytdReturn: ytdReturn,
      oneYearReturn: oneYearReturn,
      threeYearReturn: null, // Would need more history
      fiveYearReturn: null, // Would need more history
      topHoldings: [], // Would need holdings endpoint
      sectorBreakdown: [], // Would need holdings endpoint
    };

    console.log(`[polygon-etf-details] Got ETF details for ${ticker}: ${name}, Category: ${category}`);

    return json({ ok: true, ticker, etfData: etfDetails }, 200);
  } catch (error) {
    console.error("[polygon-etf-details] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return json({ ok: false, error: message }, 500);
  }
});
