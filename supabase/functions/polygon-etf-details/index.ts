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

// For single-asset trusts (commodity/crypto), external pages rarely have structured holdings data.
// We store the nature of the underlying asset as reference metadata (not financial data).
const SINGLE_ASSET_TRUSTS: Record<string, {
  underlyingAsset: string;
  underlyingName: string;
  category: string;
  issuer: string;
}> = {
  SLV: { underlyingAsset: 'Silver Bullion', underlyingName: 'Physical Silver held in trust', category: 'Precious Metals', issuer: 'iShares (BlackRock)' },
  GLD: { underlyingAsset: 'Gold Bullion', underlyingName: 'Physical Gold held in trust', category: 'Precious Metals', issuer: 'State Street' },
  IAU: { underlyingAsset: 'Gold Bullion', underlyingName: 'Physical Gold held in trust', category: 'Precious Metals', issuer: 'iShares (BlackRock)' },
  GLDM: { underlyingAsset: 'Gold Bullion', underlyingName: 'Physical Gold held in trust', category: 'Precious Metals', issuer: 'State Street' },
  IBIT: { underlyingAsset: 'BTC', underlyingName: 'Bitcoin held in custody', category: 'Cryptocurrency', issuer: 'iShares (BlackRock)' },
  GBTC: { underlyingAsset: 'BTC', underlyingName: 'Bitcoin held in trust', category: 'Cryptocurrency', issuer: 'Grayscale' },
  FBTC: { underlyingAsset: 'BTC', underlyingName: 'Bitcoin held in custody', category: 'Cryptocurrency', issuer: 'Fidelity' },
  BITO: { underlyingAsset: 'BTC Futures', underlyingName: 'Bitcoin futures contracts', category: 'Cryptocurrency', issuer: 'ProShares' },
  ETHE: { underlyingAsset: 'ETH', underlyingName: 'Ethereum held in trust', category: 'Cryptocurrency', issuer: 'Grayscale' },
  USO: { underlyingAsset: 'Crude Oil Futures', underlyingName: 'WTI crude oil futures contracts', category: 'Commodities', issuer: 'USCF' },
  UNG: { underlyingAsset: 'Natural Gas Futures', underlyingName: 'Natural gas futures contracts', category: 'Commodities', issuer: 'USCF' },
};

type FirecrawlSearchResult = { url: string; title?: string; description?: string };

type FirecrawlSearchResponse = {
  success?: boolean;
  data?: Array<FirecrawlSearchResult>;
};

type FirecrawlExtractResponse<T> = {
  success?: boolean;
  data?: T;
};

type ExtractedETFPageData = {
  issuer?: string | null;
  category?: string | null;
  expenseRatioPercent?: number | null;
  aumUSD?: number | null;
  holdingsCount?: number | null;
  topHoldings?: Array<{ symbol?: string | null; name?: string | null; weightPercent?: number | null }> | null;
  sectorBreakdown?: Array<{ sector?: string | null; weightPercent?: number | null }> | null;
};

const FIRECRAWL_BASE_URL = "https://api.firecrawl.dev/v1";

function getFirecrawlApiKey() {
  // prefer connector-managed key if present
  return Deno.env.get("FIRECRAWL_API_KEY_1") || Deno.env.get("FIRECRAWL_API_KEY") || null;
}

function normalizePercentToRatio(percent: number | null | undefined) {
  if (percent == null || !Number.isFinite(percent)) return null;
  // handle either "0.50" (already percent) or "0.005" (ratio mistakenly returned)
  if (percent > 0 && percent < 0.2) return percent; // assume already ratio (e.g. 0.005)
  return percent / 100;
}

function clampWeight(w: number) {
  if (!Number.isFinite(w)) return 0;
  return Math.max(0, Math.min(100, w));
}

function pickBestIssuerSearchQuery(ticker: string, name: string) {
  const n = name.toLowerCase();
  if (n.includes("ishares")) return `site:ishares.com ${ticker} expense ratio holdings net assets`;
  if (n.includes("vanguard")) return `site:vanguard.com ${ticker} expense ratio holdings net assets`;
  if (n.includes("spdr") || n.includes("state street")) return `site:ssga.com ${ticker} expense ratio holdings net assets`;
  if (n.includes("invesco")) return `site:invesco.com ${ticker} expense ratio holdings`;
  if (n.includes("schwab")) return `site:schwabassetmanagement.com ${ticker} expense ratio holdings`;
  if (n.includes("proshares")) return `site:proshares.com ${ticker} expense ratio holdings`;
  // fallback: broad query, we’ll still validate extracted fields
  return `${ticker} ETF expense ratio holdings net assets issuer`;
}

async function firecrawlSearch(query: string, apiKey: string): Promise<FirecrawlSearchResult[]> {
  const res = await fetch(`${FIRECRAWL_BASE_URL}/search`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      limit: 5,
      timeout: 60000,
    }),
  });

  const text = await res.text();
  let parsed: FirecrawlSearchResponse | null = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    // ignore
  }

  if (!res.ok) {
    throw new Error(`Firecrawl search failed [${res.status}]: ${text.slice(0, 300)}`);
  }

  return parsed?.data || [];
}

async function firecrawlExtract(url: string, apiKey: string): Promise<ExtractedETFPageData | null> {
  // Use Firecrawl extract to pull structured data from the issuer page.
  const schema = {
    type: "object",
    properties: {
      issuer: { type: "string" },
      category: { type: "string" },
      expenseRatioPercent: { type: "number" },
      aumUSD: { type: "number" },
      holdingsCount: { type: "number" },
      topHoldings: {
        type: "array",
        items: {
          type: "object",
          properties: {
            symbol: { type: "string" },
            name: { type: "string" },
            weightPercent: { type: "number" },
          },
        },
      },
      sectorBreakdown: {
        type: "array",
        items: {
          type: "object",
          properties: {
            sector: { type: "string" },
            weightPercent: { type: "number" },
          },
        },
      },
    },
  };

  const prompt =
    "Extract ETF facts from the page. Return: issuer, category, expenseRatioPercent (e.g. 0.50 for 0.50%), aumUSD (numeric USD), holdingsCount, topHoldings (symbol/name/weightPercent), sectorBreakdown (sector/weightPercent). Only return values explicitly present on the page. If unknown, omit or null.";

  const res = await fetch(`${FIRECRAWL_BASE_URL}/extract`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      urls: [url],
      prompt,
      schema,
      timeout: 60000,
    }),
  });

  const text = await res.text();
  let parsed: FirecrawlExtractResponse<ExtractedETFPageData> | null = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    // ignore
  }

  if (!res.ok) {
    throw new Error(`Firecrawl extract failed [${res.status}]: ${text.slice(0, 300)}`);
  }

  return parsed?.data || null;
}

type FirecrawlScrapeResponse = {
  success?: boolean;
  data?: {
    markdown?: string;
  };
};

function parseUsdAmountFromText(text: string): number | null {
  // Examples: "$12.34B", "USD 12.34 billion", "12.34B"
  const cleaned = text.replace(/\s+/g, " ");

  const abbrev = cleaned.match(/\$?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?)\s*([TMB])\b/i);
  if (abbrev) {
    const raw = Number(String(abbrev[1]).replace(/,/g, ""));
    const unit = String(abbrev[2]).toUpperCase();
    const mult = unit === "T" ? 1e12 : unit === "B" ? 1e9 : 1e6;
    return Number.isFinite(raw) ? raw * mult : null;
  }

  const plain = cleaned.match(/\$\s*([0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?)\b/);
  if (plain) {
    const raw = Number(String(plain[1]).replace(/,/g, ""));
    return Number.isFinite(raw) ? raw : null;
  }

  return null;
}

async function firecrawlScrapeMarkdown(url: string, apiKey: string): Promise<string | null> {
  const res = await fetch(`${FIRECRAWL_BASE_URL}/scrape`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      formats: ["markdown"],
      timeout: 60000,
    }),
  });

  const text = await res.text();
  let parsed: FirecrawlScrapeResponse | null = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    // ignore
  }

  if (!res.ok) {
    throw new Error(`Firecrawl scrape failed [${res.status}]: ${text.slice(0, 300)}`);
  }

  return parsed?.data?.markdown || null;
}

function tryParseAumFromMarkdown(markdown: string): number | null {
  const candidates = [
    /Net Assets[^\n\r]{0,80}([\$0-9.,\s]+[TMB])\b/i,
    /Total Net Assets[^\n\r]{0,80}([\$0-9.,\s]+[TMB])\b/i,
    /AUM[^\n\r]{0,80}([\$0-9.,\s]+[TMB])\b/i,
  ];

  for (const re of candidates) {
    const m = markdown.match(re);
    if (m?.[1]) {
      const parsed = parseUsdAmountFromText(m[1]);
      if (parsed != null) return parsed;
    }
  }

  return null;
}

async function enrichFromIssuerPages(params: {
  ticker: string;
  name: string;
  want: {
    expenseRatio: boolean;
    aum: boolean;
    holdings: boolean;
    topHoldings: boolean;
    sectorBreakdown: boolean;
    issuer: boolean;
    category: boolean;
  };
}): Promise<Partial<ETFDetails>> {
  const apiKey = getFirecrawlApiKey();
  if (!apiKey) {
    console.log(`[polygon-etf-details] No Firecrawl API key found, skipping enrichment`);
    return {};
  }

  const query = pickBestIssuerSearchQuery(params.ticker, params.name);
  console.log(`[polygon-etf-details] Firecrawl search query: "${query}"`);
  
  let results: FirecrawlSearchResult[] = [];
  try {
    results = await firecrawlSearch(query, apiKey);
  } catch (e) {
    console.warn(`[polygon-etf-details] Firecrawl search failed for ${params.ticker}:`, e);
    return {};
  }
  
  console.log(`[polygon-etf-details] Firecrawl search returned ${results.length} results`);
  if (!results.length) return {};

  const out: Partial<ETFDetails> = {};

  const stillWant = () => ({
    issuer: params.want.issuer && !out.issuer,
    category: params.want.category && !out.category,
    expenseRatio: params.want.expenseRatio && out.expenseRatio == null,
    aum: params.want.aum && out.aum == null,
    holdings: params.want.holdings && out.holdings == null,
    topHoldings: params.want.topHoldings && (!out.topHoldings || out.topHoldings.length === 0),
    sectorBreakdown: params.want.sectorBreakdown && (!out.sectorBreakdown || out.sectorBreakdown.length === 0),
  });

  const isSatisfied = () => {
    const w = stillWant();
    return !w.issuer && !w.category && !w.expenseRatio && !w.aum && !w.holdings && !w.topHoldings && !w.sectorBreakdown;
  };

  // Try a few candidate URLs until we’ve filled the missing fields.
  for (const candidate of results.slice(0, 3)) {
    if (isSatisfied()) break;
    if (!candidate?.url) continue;

    let extracted: ExtractedETFPageData | null = null;
    try {
      extracted = await firecrawlExtract(candidate.url, apiKey);
    } catch (e) {
      console.warn(`[polygon-etf-details] Firecrawl extract failed for ${params.ticker} (${candidate.url}):`, e);
      continue;
    }

    if (!extracted) continue;

    const w = stillWant();

    if (w.issuer && extracted.issuer) out.issuer = extracted.issuer;
    if (w.category && extracted.category) out.category = extracted.category;

    if (w.expenseRatio) {
      const ratio = normalizePercentToRatio(extracted.expenseRatioPercent);
      if (ratio != null) out.expenseRatio = ratio;
    }

    if (w.aum && extracted.aumUSD != null && Number.isFinite(extracted.aumUSD)) {
      out.aum = extracted.aumUSD;
    }

    // Some issuer pages render AUM/Net Assets dynamically; fall back to scraping markdown + regex.
    if (w.aum && out.aum == null) {
      try {
        const md = await firecrawlScrapeMarkdown(candidate.url, apiKey);
        if (md) {
          const parsedAum = tryParseAumFromMarkdown(md);
          if (parsedAum != null) out.aum = parsedAum;
        }
      } catch (e) {
        console.warn(`[polygon-etf-details] Firecrawl scrape AUM parse failed for ${params.ticker} (${candidate.url}):`, e);
      }
    }

    if (w.holdings && extracted.holdingsCount != null && Number.isFinite(extracted.holdingsCount)) {
      out.holdings = extracted.holdingsCount;
    }

    if (w.topHoldings && Array.isArray(extracted.topHoldings) && extracted.topHoldings.length > 0) {
      out.topHoldings = extracted.topHoldings
        .filter((h) => (h.symbol || h.name) && h.weightPercent != null)
        .slice(0, 15)
        .map((h) => ({
          symbol: String(h.symbol || "").trim() || String(h.name || "").trim(),
          name: String(h.name || "").trim() || String(h.symbol || "").trim(),
          weight: clampWeight(Number(h.weightPercent)),
        }));
    }

    if (w.sectorBreakdown && Array.isArray(extracted.sectorBreakdown) && extracted.sectorBreakdown.length > 0) {
      out.sectorBreakdown = extracted.sectorBreakdown
        .filter((s) => s.sector && s.weightPercent != null)
        .slice(0, 25)
        .map((s) => ({
          sector: String(s.sector).trim(),
          weight: clampWeight(Number(s.weightPercent)),
        }));
    }
  }

  return out;
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

    const name = tickerDetails.name || ticker;

    // Infer issuer from fund name if not in DB
    let baseIssuer = "";
    const nameLower = name.toLowerCase();
    if (nameLower.includes("ishares")) baseIssuer = "iShares (BlackRock)";
    else if (nameLower.includes("vanguard")) baseIssuer = "Vanguard";
    else if (nameLower.includes("spdr") || nameLower.includes("state street")) baseIssuer = "State Street";
    else if (nameLower.includes("invesco")) baseIssuer = "Invesco";
    else if (nameLower.includes("schwab")) baseIssuer = "Charles Schwab";
    else if (nameLower.includes("proshares")) baseIssuer = "ProShares";
    else if (nameLower.includes("wisdomtree")) baseIssuer = "WisdomTree";
    else if (nameLower.includes("ark")) baseIssuer = "ARK Invest";
    else if (nameLower.includes("fidelity")) baseIssuer = "Fidelity";
    else if (nameLower.includes("grayscale")) baseIssuer = "Grayscale";

    // Infer category from fund name
    let baseCategory = assetUniverseData?.category || "";
    if (!baseCategory || baseCategory === "stock") {
      if (nameLower.includes("silver")) baseCategory = "Precious Metals";
      else if (nameLower.includes("gold")) baseCategory = "Precious Metals";
      else if (nameLower.includes("bitcoin") || nameLower.includes("btc")) baseCategory = "Cryptocurrency";
      else if (nameLower.includes("ethereum") || nameLower.includes("eth")) baseCategory = "Cryptocurrency";
      else if (nameLower.includes("bond") || nameLower.includes("treasury")) baseCategory = "Fixed Income";
      else if (nameLower.includes("tech") || nameLower.includes("technology")) baseCategory = "Technology";
      else if (nameLower.includes("energy")) baseCategory = "Energy";
      else if (nameLower.includes("health")) baseCategory = "Healthcare";
      else if (nameLower.includes("financ")) baseCategory = "Financials";
      else if (nameLower.includes("real estate") || nameLower.includes("reit")) baseCategory = "Real Estate";
      else if (nameLower.includes("s&p 500") || nameLower.includes("s&p500")) baseCategory = "Large Cap Blend";
      else if (nameLower.includes("nasdaq") || nameLower.includes("qqq")) baseCategory = "Large Cap Growth";
      else if (nameLower.includes("small cap") || nameLower.includes("russell 2000")) baseCategory = "Small Cap Blend";
      else if (nameLower.includes("dividend")) baseCategory = "Dividend";
      else if (nameLower.includes("total market") || nameLower.includes("total stock")) baseCategory = "Total Market";
      else if (nameLower.includes("emerging")) baseCategory = "Emerging Markets";
      else if (nameLower.includes("international") || nameLower.includes("developed")) baseCategory = "International";
      else baseCategory = "ETF";
    }

    // Baseline AUM from DB cache or Polygon's market_cap (not always true AUM, but it is real Polygon data)
    const baseAum = assetUniverseData?.aum ?? tickerDetails.market_cap ?? null;

    // Decide what we still need
    const want = {
      expenseRatio: assetUniverseData?.expense_ratio == null,
      aum: baseAum == null,
      holdings: true,
      topHoldings: true,
      sectorBreakdown: true,
      issuer: baseIssuer === "",
      category: baseCategory === "ETF" || baseCategory == null,
    };

    let enriched: Partial<ETFDetails> = {};
    try {
      enriched = await enrichFromIssuerPages({ ticker, name, want });
      console.log(`[polygon-etf-details] Firecrawl enrichment for ${ticker}: issuer=${enriched.issuer}, category=${enriched.category}, expenseRatio=${enriched.expenseRatio}, aum=${enriched.aum}, holdings=${enriched.holdings}, topHoldings=${enriched.topHoldings?.length || 0}`);
    } catch (e) {
      console.warn(`[polygon-etf-details] Firecrawl enrichment failed for ${ticker}:`, e);
    }

    // For single-asset trusts (commodities, crypto), apply reference metadata if external enrichment didn't find data
    const singleAsset = SINGLE_ASSET_TRUSTS[ticker];
    if (singleAsset) {
      if (!enriched.issuer) enriched.issuer = singleAsset.issuer;
      if (!enriched.category || enriched.category === "ETF") enriched.category = singleAsset.category;
      if (!enriched.holdings) enriched.holdings = 1;
      if (!enriched.topHoldings || enriched.topHoldings.length === 0) {
        enriched.topHoldings = [{
          symbol: singleAsset.underlyingAsset,
          name: singleAsset.underlyingName,
          weight: 100,
        }];
      }
    }

    const etfDetails: ETFDetails = {
      ticker,
      name,
      description: tickerDetails.description || assetUniverseData?.description || "",
      category: enriched.category || baseCategory || "ETF",
      issuer: enriched.issuer || baseIssuer || "",
      expenseRatio: enriched.expenseRatio ?? assetUniverseData?.expense_ratio ?? null,
      aum: enriched.aum ?? baseAum ?? null,
      holdings: enriched.holdings ?? null,
      inceptionDate: tickerDetails.list_date || null,
      avgVolume: avgVolume || assetUniverseData?.avg_daily_volume || null,
      beta: assetUniverseData?.beta_spy ?? null,
      dividendYield: null,
      ytdReturn,
      oneYearReturn,
      threeYearReturn: null,
      fiveYearReturn: null,
      topHoldings: enriched.topHoldings || [],
      sectorBreakdown: enriched.sectorBreakdown || [],
    };

    console.log(`[polygon-etf-details] ETF details ready for ${ticker}: category=${etfDetails.category}, issuer=${etfDetails.issuer}, expenseRatio=${etfDetails.expenseRatio}, aum=${etfDetails.aum}, holdings=${etfDetails.holdings}, topHoldings=${etfDetails.topHoldings.length}`);

    return json({ ok: true, ticker, etfData: etfDetails }, 200);
  } catch (error) {
    console.error("[polygon-etf-details] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return json({ ok: false, error: message }, 500);
  }
});
