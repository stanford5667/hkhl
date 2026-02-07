import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

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

// Static ETF data for common ETFs (expense ratios, holdings counts, etc.)
// This provides fallback data when APIs don't return it
const KNOWN_ETF_DATA: Record<string, Partial<ETFDetails>> = {
// Precious Metals (commodity trusts - single physical holding)
  'SLV': { 
    expenseRatio: 0.0050, 
    holdings: 1, 
    category: 'Precious Metals', 
    issuer: 'iShares (BlackRock)',
    topHoldings: [{ symbol: 'Silver Bullion', name: 'Physical Silver held in trust', weight: 100 }]
  },
  'GLD': { 
    expenseRatio: 0.0040, 
    holdings: 1, 
    category: 'Precious Metals', 
    issuer: 'State Street',
    topHoldings: [{ symbol: 'Gold Bullion', name: 'Physical Gold held in trust', weight: 100 }]
  },
  'IAU': { 
    expenseRatio: 0.0025, 
    holdings: 1, 
    category: 'Precious Metals', 
    issuer: 'iShares (BlackRock)',
    topHoldings: [{ symbol: 'Gold Bullion', name: 'Physical Gold held in trust', weight: 100 }]
  },
  'GLDM': { 
    expenseRatio: 0.0010, 
    holdings: 1, 
    category: 'Precious Metals', 
    issuer: 'State Street',
    topHoldings: [{ symbol: 'Gold Bullion', name: 'Physical Gold held in trust', weight: 100 }]
  },
  
  // Large Cap
  'SPY': { expenseRatio: 0.0009, holdings: 503, category: 'Large Cap Blend', issuer: 'State Street', beta: 1.0 },
  'VOO': { expenseRatio: 0.0003, holdings: 507, category: 'Large Cap Blend', issuer: 'Vanguard', beta: 1.0 },
  'IVV': { expenseRatio: 0.0003, holdings: 503, category: 'Large Cap Blend', issuer: 'iShares (BlackRock)', beta: 1.0 },
  'VTI': { expenseRatio: 0.0003, holdings: 3945, category: 'Total Market', issuer: 'Vanguard', beta: 1.01 },
  
  // Growth/Tech
  'QQQ': { expenseRatio: 0.0020, holdings: 101, category: 'Large Cap Growth', issuer: 'Invesco', beta: 1.18 },
  'QQQM': { expenseRatio: 0.0015, holdings: 101, category: 'Large Cap Growth', issuer: 'Invesco', beta: 1.18 },
  'VGT': { expenseRatio: 0.0010, holdings: 316, category: 'Technology', issuer: 'Vanguard', beta: 1.25 },
  'XLK': { expenseRatio: 0.0009, holdings: 68, category: 'Technology', issuer: 'State Street', beta: 1.24 },
  'ARKK': { expenseRatio: 0.0075, holdings: 35, category: 'Disruptive Innovation', issuer: 'ARK Invest', beta: 1.85 },
  
  // Small Cap
  'IWM': { expenseRatio: 0.0019, holdings: 1978, category: 'Small Cap Blend', issuer: 'iShares (BlackRock)', beta: 1.22 },
  'VB': { expenseRatio: 0.0005, holdings: 1389, category: 'Small Cap Blend', issuer: 'Vanguard', beta: 1.18 },
  
  // International
  'VEU': { expenseRatio: 0.0007, holdings: 3743, category: 'International', issuer: 'Vanguard', beta: 0.85 },
  'VXUS': { expenseRatio: 0.0007, holdings: 8194, category: 'International', issuer: 'Vanguard', beta: 0.84 },
  'EFA': { expenseRatio: 0.0032, holdings: 785, category: 'International Developed', issuer: 'iShares (BlackRock)', beta: 0.82 },
  'VWO': { expenseRatio: 0.0008, holdings: 5864, category: 'Emerging Markets', issuer: 'Vanguard', beta: 0.92 },
  'EEM': { expenseRatio: 0.0068, holdings: 1255, category: 'Emerging Markets', issuer: 'iShares (BlackRock)', beta: 0.95 },
  
  // Fixed Income
  'BND': { expenseRatio: 0.0003, holdings: 10702, category: 'Total Bond Market', issuer: 'Vanguard', beta: 0.05 },
  'AGG': { expenseRatio: 0.0003, holdings: 11856, category: 'Total Bond Market', issuer: 'iShares (BlackRock)', beta: 0.04 },
  'TLT': { expenseRatio: 0.0015, holdings: 41, category: 'Long-Term Treasury', issuer: 'iShares (BlackRock)', beta: -0.15 },
  'HYG': { expenseRatio: 0.0049, holdings: 1231, category: 'High Yield Bond', issuer: 'iShares (BlackRock)', beta: 0.35 },
  
  // Dividend
  'VYM': { expenseRatio: 0.0006, holdings: 538, category: 'High Dividend', issuer: 'Vanguard', beta: 0.82 },
  'SCHD': { expenseRatio: 0.0006, holdings: 103, category: 'Dividend Growth', issuer: 'Charles Schwab', beta: 0.85 },
  'DVY': { expenseRatio: 0.0038, holdings: 100, category: 'High Dividend', issuer: 'iShares (BlackRock)', beta: 0.80 },
  
  // Sector
  'XLE': { expenseRatio: 0.0009, holdings: 23, category: 'Energy', issuer: 'State Street', beta: 1.35 },
  'XLF': { expenseRatio: 0.0009, holdings: 73, category: 'Financials', issuer: 'State Street', beta: 1.15 },
  'XLV': { expenseRatio: 0.0009, holdings: 64, category: 'Healthcare', issuer: 'State Street', beta: 0.72 },
  'XLY': { expenseRatio: 0.0009, holdings: 52, category: 'Consumer Discretionary', issuer: 'State Street', beta: 1.18 },
  'XLP': { expenseRatio: 0.0009, holdings: 38, category: 'Consumer Staples', issuer: 'State Street', beta: 0.58 },
  'XLU': { expenseRatio: 0.0009, holdings: 31, category: 'Utilities', issuer: 'State Street', beta: 0.45 },
  'XLI': { expenseRatio: 0.0009, holdings: 79, category: 'Industrials', issuer: 'State Street', beta: 1.08 },
  'XLB': { expenseRatio: 0.0009, holdings: 28, category: 'Materials', issuer: 'State Street', beta: 1.15 },
  'XLRE': { expenseRatio: 0.0009, holdings: 31, category: 'Real Estate', issuer: 'State Street', beta: 0.95 },
  
  // Bitcoin/Crypto (single digital asset trusts)
  'IBIT': { 
    expenseRatio: 0.0025, 
    holdings: 1, 
    category: 'Cryptocurrency', 
    issuer: 'iShares (BlackRock)',
    topHoldings: [{ symbol: 'BTC', name: 'Bitcoin held in custody', weight: 100 }]
  },
  'GBTC': { 
    expenseRatio: 0.015, 
    holdings: 1, 
    category: 'Cryptocurrency', 
    issuer: 'Grayscale',
    topHoldings: [{ symbol: 'BTC', name: 'Bitcoin held in trust', weight: 100 }]
  },
  'FBTC': { 
    expenseRatio: 0.0025, 
    holdings: 1, 
    category: 'Cryptocurrency', 
    issuer: 'Fidelity',
    topHoldings: [{ symbol: 'BTC', name: 'Bitcoin held in custody', weight: 100 }]
  },
  
  // Leveraged/Inverse
  'TQQQ': { expenseRatio: 0.0086, holdings: 103, category: '3x Leveraged', issuer: 'ProShares', beta: 3.5 },
  'SQQQ': { expenseRatio: 0.0095, holdings: 103, category: '-3x Inverse', issuer: 'ProShares', beta: -3.5 },
  'UPRO': { expenseRatio: 0.0091, holdings: 503, category: '3x Leveraged', issuer: 'ProShares', beta: 3.0 },
  'SPXU': { expenseRatio: 0.0091, holdings: 503, category: '-3x Inverse', issuer: 'ProShares', beta: -3.0 },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const ticker = String(body.ticker || "").toUpperCase().trim();

    if (!ticker) {
      return json({ ok: false, error: "ticker is required" }, 400);
    }

    const POLYGON_API_KEY = Deno.env.get("POLYGON_API_KEY") || Deno.env.get("VITE_POLYGON_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!POLYGON_API_KEY) {
      return json({ ok: false, error: "Polygon API key not configured" }, 500);
    }

    console.log(`[polygon-etf-details] Fetching ETF details for ${ticker}`);

    // Check asset_universe for cached data
    let assetUniverseData: any = null;
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const { data } = await supabase
          .from('asset_universe')
          .select('expense_ratio, aum, beta_spy, avg_daily_volume, description, sector, category')
          .eq('ticker', ticker)
          .single();
        assetUniverseData = data;
      } catch (e) {
        console.log(`[polygon-etf-details] asset_universe lookup failed:`, e);
      }
    }

    // Fetch basic ticker details from Polygon
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

    // Fetch snapshot for current price data
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

    // Get known ETF data if available
    const knownData = KNOWN_ETF_DATA[ticker] || {};
    
    // Extract topHoldings from known data
    const topHoldings = knownData.topHoldings || [];

    // Extract issuer from name
    const name = tickerDetails.name || ticker;
    let issuer = knownData.issuer || "";
    if (!issuer) {
      if (name.includes("iShares")) issuer = "iShares (BlackRock)";
      else if (name.includes("Vanguard")) issuer = "Vanguard";
      else if (name.includes("SPDR") || name.includes("State Street")) issuer = "State Street";
      else if (name.includes("Invesco")) issuer = "Invesco";
      else if (name.includes("Schwab")) issuer = "Charles Schwab";
      else if (name.includes("ProShares")) issuer = "ProShares";
      else if (name.includes("WisdomTree")) issuer = "WisdomTree";
      else if (name.includes("ARK")) issuer = "ARK Invest";
      else if (name.includes("Fidelity")) issuer = "Fidelity";
      else if (name.includes("Grayscale")) issuer = "Grayscale";
    }
    
    // Determine category
    let category = knownData.category || assetUniverseData?.category || "ETF";
    if (category === "ETF") {
      if (name.toLowerCase().includes("silver") || ticker === "SLV") category = "Precious Metals";
      else if (name.toLowerCase().includes("gold") || ticker === "GLD") category = "Precious Metals";
      else if (name.toLowerCase().includes("bitcoin") || ticker.includes("BIT")) category = "Cryptocurrency";
      else if (name.toLowerCase().includes("bond") || name.toLowerCase().includes("treasury")) category = "Fixed Income";
      else if (name.toLowerCase().includes("tech") || name.toLowerCase().includes("technology")) category = "Technology";
      else if (name.toLowerCase().includes("energy")) category = "Energy";
      else if (name.toLowerCase().includes("health")) category = "Healthcare";
      else if (name.toLowerCase().includes("financ")) category = "Financials";
      else if (name.toLowerCase().includes("real estate") || name.toLowerCase().includes("reit")) category = "Real Estate";
      else if (name.toLowerCase().includes("s&p 500") || ticker === "SPY" || ticker === "VOO" || ticker === "IVV") category = "Large Cap Blend";
      else if (name.toLowerCase().includes("nasdaq") || ticker === "QQQ") category = "Large Cap Growth";
      else if (name.toLowerCase().includes("small cap") || name.toLowerCase().includes("russell 2000") || ticker === "IWM") category = "Small Cap Blend";
      else if (name.toLowerCase().includes("dividend")) category = "Dividend";
      else if (name.toLowerCase().includes("total market") || name.toLowerCase().includes("total stock")) category = "Total Market";
      else if (name.toLowerCase().includes("emerging")) category = "Emerging Markets";
      else if (name.toLowerCase().includes("international") || name.toLowerCase().includes("developed")) category = "International";
    }

    // Get AUM - try market cap from Polygon, then snapshot
    let aum = tickerDetails.market_cap || snapshot?.todaysChange?.marketCap || null;
    if (!aum && snapshot?.prevDay?.v && bars.length > 0) {
      // Estimate AUM from price * estimated shares outstanding
      const lastPrice = bars[bars.length - 1]?.c;
      // This is a rough estimate; real AUM would need proper data source
    }

    // Build the ETF details response with data priority: 
    // 1. Known static data (KNOWN_ETF_DATA)
    // 2. asset_universe cached data
    // 3. Calculated/inferred from Polygon
    const etfDetails: ETFDetails = {
      ticker: ticker,
      name: name,
      description: tickerDetails.description || assetUniverseData?.description || "",
      category: category,
      issuer: issuer,
      expenseRatio: knownData.expenseRatio ?? assetUniverseData?.expense_ratio ?? null,
      aum: assetUniverseData?.aum ?? aum ?? null,
      holdings: knownData.holdings ?? null,
      inceptionDate: tickerDetails.list_date || null,
      avgVolume: avgVolume || assetUniverseData?.avg_daily_volume || null,
      beta: knownData.beta ?? assetUniverseData?.beta_spy ?? null,
      dividendYield: null, // Would need dividend endpoint
      ytdReturn: ytdReturn,
      oneYearReturn: oneYearReturn,
      threeYearReturn: null, // Would need more history
      fiveYearReturn: null, // Would need more history
      topHoldings: topHoldings,
      sectorBreakdown: [], // Would need premium holdings endpoint
    };

    console.log(`[polygon-etf-details] Got ETF details for ${ticker}: ${name}, Category: ${category}, Expense: ${etfDetails.expenseRatio}, Holdings: ${etfDetails.holdings}`);

    return json({ ok: true, ticker, etfData: etfDetails }, 200);
  } catch (error) {
    console.error("[polygon-etf-details] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return json({ ok: false, error: message }, 500);
  }
});
