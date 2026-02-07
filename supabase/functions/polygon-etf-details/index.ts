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
// Expense ratios are regulatory/prospectus data that rarely changes - acceptable as reference.
const ETF_REFERENCE_DATA: Record<string, {
  underlyingAsset?: string;
  underlyingName?: string;
  category: string;
  issuer: string;
  expenseRatio: number; // As decimal (e.g., 0.0050 = 0.50%)
  holdings?: number;
}> = {
  // Precious Metals
  SLV: { underlyingAsset: 'Silver Bullion', underlyingName: 'Physical Silver held in trust', category: 'Precious Metals', issuer: 'iShares (BlackRock)', expenseRatio: 0.0050, holdings: 1 },
  GLD: { underlyingAsset: 'Gold Bullion', underlyingName: 'Physical Gold held in trust', category: 'Precious Metals', issuer: 'State Street', expenseRatio: 0.0040, holdings: 1 },
  IAU: { underlyingAsset: 'Gold Bullion', underlyingName: 'Physical Gold held in trust', category: 'Precious Metals', issuer: 'iShares (BlackRock)', expenseRatio: 0.0025, holdings: 1 },
  GLDM: { underlyingAsset: 'Gold Bullion', underlyingName: 'Physical Gold held in trust', category: 'Precious Metals', issuer: 'State Street', expenseRatio: 0.0010, holdings: 1 },
  PHYS: { underlyingAsset: 'Gold Bullion', underlyingName: 'Physical Gold held in trust', category: 'Precious Metals', issuer: 'Sprott', expenseRatio: 0.0040, holdings: 1 },
  PSLV: { underlyingAsset: 'Silver Bullion', underlyingName: 'Physical Silver held in trust', category: 'Precious Metals', issuer: 'Sprott', expenseRatio: 0.0060, holdings: 1 },
  // Cryptocurrency
  IBIT: { underlyingAsset: 'BTC', underlyingName: 'Bitcoin held in custody', category: 'Cryptocurrency', issuer: 'iShares (BlackRock)', expenseRatio: 0.0025, holdings: 1 },
  GBTC: { underlyingAsset: 'BTC', underlyingName: 'Bitcoin held in trust', category: 'Cryptocurrency', issuer: 'Grayscale', expenseRatio: 0.0150, holdings: 1 },
  FBTC: { underlyingAsset: 'BTC', underlyingName: 'Bitcoin held in custody', category: 'Cryptocurrency', issuer: 'Fidelity', expenseRatio: 0.0025, holdings: 1 },
  BITO: { underlyingAsset: 'BTC Futures', underlyingName: 'Bitcoin futures contracts', category: 'Cryptocurrency', issuer: 'ProShares', expenseRatio: 0.0095, holdings: 1 },
  ETHE: { underlyingAsset: 'ETH', underlyingName: 'Ethereum held in trust', category: 'Cryptocurrency', issuer: 'Grayscale', expenseRatio: 0.0250, holdings: 1 },
  ETHA: { underlyingAsset: 'ETH', underlyingName: 'Ethereum held in custody', category: 'Cryptocurrency', issuer: 'iShares (BlackRock)', expenseRatio: 0.0025, holdings: 1 },
  // Commodities
  USO: { underlyingAsset: 'Crude Oil Futures', underlyingName: 'WTI crude oil futures contracts', category: 'Commodities', issuer: 'USCF', expenseRatio: 0.0079, holdings: 1 },
  UNG: { underlyingAsset: 'Natural Gas Futures', underlyingName: 'Natural gas futures contracts', category: 'Commodities', issuer: 'USCF', expenseRatio: 0.0107, holdings: 1 },
  // Major US Equity ETFs
  SPY: { category: 'Large Cap Blend', issuer: 'State Street', expenseRatio: 0.00095, holdings: 503 },
  VOO: { category: 'Large Cap Blend', issuer: 'Vanguard', expenseRatio: 0.0003, holdings: 504 },
  IVV: { category: 'Large Cap Blend', issuer: 'iShares (BlackRock)', expenseRatio: 0.0003, holdings: 504 },
  VTI: { category: 'Total Market', issuer: 'Vanguard', expenseRatio: 0.0003, holdings: 3600 },
  QQQ: { category: 'Large Cap Growth', issuer: 'Invesco', expenseRatio: 0.0020, holdings: 101 },
  QQQM: { category: 'Large Cap Growth', issuer: 'Invesco', expenseRatio: 0.0015, holdings: 101 },
  IWM: { category: 'Small Cap Blend', issuer: 'iShares (BlackRock)', expenseRatio: 0.0019, holdings: 2000 },
  VTV: { category: 'Large Cap Value', issuer: 'Vanguard', expenseRatio: 0.0004, holdings: 350 },
  VUG: { category: 'Large Cap Growth', issuer: 'Vanguard', expenseRatio: 0.0004, holdings: 200 },
  VB: { category: 'Small Cap Blend', issuer: 'Vanguard', expenseRatio: 0.0005, holdings: 1400 },
  // International & Emerging
  VEA: { category: 'Developed International', issuer: 'Vanguard', expenseRatio: 0.0005, holdings: 4000 },
  VXUS: { category: 'Total International', issuer: 'Vanguard', expenseRatio: 0.0007, holdings: 8000 },
  VWO: { category: 'Emerging Markets', issuer: 'Vanguard', expenseRatio: 0.0008, holdings: 5600 },
  EEM: { category: 'Emerging Markets', issuer: 'iShares (BlackRock)', expenseRatio: 0.0069, holdings: 1200 },
  EFA: { category: 'Developed International', issuer: 'iShares (BlackRock)', expenseRatio: 0.0032, holdings: 800 },
  IEMG: { category: 'Emerging Markets', issuer: 'iShares (BlackRock)', expenseRatio: 0.0009, holdings: 2800 },
  // Fixed Income
  BND: { category: 'Total Bond', issuer: 'Vanguard', expenseRatio: 0.0003, holdings: 10000 },
  AGG: { category: 'Total Bond', issuer: 'iShares (BlackRock)', expenseRatio: 0.0003, holdings: 12000 },
  TLT: { category: 'Long-Term Treasury', issuer: 'iShares (BlackRock)', expenseRatio: 0.0015, holdings: 40 },
  SHY: { category: 'Short-Term Treasury', issuer: 'iShares (BlackRock)', expenseRatio: 0.0015, holdings: 80 },
  LQD: { category: 'Corporate Bond', issuer: 'iShares (BlackRock)', expenseRatio: 0.0014, holdings: 2700 },
  HYG: { category: 'High Yield Bond', issuer: 'iShares (BlackRock)', expenseRatio: 0.0049, holdings: 1200 },
  VCIT: { category: 'Corporate Bond', issuer: 'Vanguard', expenseRatio: 0.0004, holdings: 2000 },
  // Sector ETFs
  XLK: { category: 'Technology', issuer: 'State Street', expenseRatio: 0.0009, holdings: 65 },
  XLF: { category: 'Financials', issuer: 'State Street', expenseRatio: 0.0009, holdings: 70 },
  XLE: { category: 'Energy', issuer: 'State Street', expenseRatio: 0.0009, holdings: 23 },
  XLV: { category: 'Healthcare', issuer: 'State Street', expenseRatio: 0.0009, holdings: 60 },
  XLY: { category: 'Consumer Discretionary', issuer: 'State Street', expenseRatio: 0.0009, holdings: 50 },
  XLP: { category: 'Consumer Staples', issuer: 'State Street', expenseRatio: 0.0009, holdings: 40 },
  XLI: { category: 'Industrials', issuer: 'State Street', expenseRatio: 0.0009, holdings: 75 },
  XLU: { category: 'Utilities', issuer: 'State Street', expenseRatio: 0.0009, holdings: 30 },
  XLB: { category: 'Materials', issuer: 'State Street', expenseRatio: 0.0009, holdings: 28 },
  XLRE: { category: 'Real Estate', issuer: 'State Street', expenseRatio: 0.0009, holdings: 30 },
  XLC: { category: 'Communication Services', issuer: 'State Street', expenseRatio: 0.0009, holdings: 25 },
  // ARK ETFs
  ARKK: { category: 'Innovation', issuer: 'ARK Invest', expenseRatio: 0.0075, holdings: 35 },
  ARKW: { category: 'Next Gen Internet', issuer: 'ARK Invest', expenseRatio: 0.0075, holdings: 35 },
  ARKF: { category: 'Fintech', issuer: 'ARK Invest', expenseRatio: 0.0075, holdings: 35 },
  ARKG: { category: 'Genomics', issuer: 'ARK Invest', expenseRatio: 0.0075, holdings: 35 },
  // Dividend ETFs  
  VIG: { category: 'Dividend Growth', issuer: 'Vanguard', expenseRatio: 0.0006, holdings: 340 },
  VYM: { category: 'High Dividend', issuer: 'Vanguard', expenseRatio: 0.0006, holdings: 460 },
  SCHD: { category: 'Dividend', issuer: 'Charles Schwab', expenseRatio: 0.0006, holdings: 100 },
  DVY: { category: 'Dividend', issuer: 'iShares (BlackRock)', expenseRatio: 0.0038, holdings: 100 },
  // Other popular ETFs
  DIA: { category: 'Large Cap Blend', issuer: 'State Street', expenseRatio: 0.0016, holdings: 30 },
  RSP: { category: 'Equal Weight', issuer: 'Invesco', expenseRatio: 0.0020, holdings: 503 },
  VNQ: { category: 'Real Estate', issuer: 'Vanguard', expenseRatio: 0.0012, holdings: 160 },
  JEPI: { category: 'Covered Call', issuer: 'JPMorgan', expenseRatio: 0.0035, holdings: 130 },
  JEPQ: { category: 'Covered Call', issuer: 'JPMorgan', expenseRatio: 0.0035, holdings: 90 },
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
  // Prefer the issuer’s canonical product/fund pages first (they most reliably contain Net Assets/AUM).
  if (n.includes("ishares")) {
    // iShares product pages are typically under /us/products/...
    return `site:ishares.com/us/products ${ticker} (\"Net Assets\" OR \"Total Net Assets\" OR \"Net assets\")`;
  }
  if (n.includes("vanguard")) {
    // Vanguard fund profiles
    return `site:investor.vanguard.com ${ticker} (\"Net assets\" OR \"Net Assets\")`;
  }
  if (n.includes("spdr") || n.includes("state street")) {
    // SSGA/SPDR fund pages
    return `site:ssga.com ${ticker} (\"Net assets\" OR \"Net Assets\")`;
  }
  if (n.includes("invesco")) return `site:invesco.com ${ticker} expense ratio holdings`;
  if (n.includes("schwab")) return `site:schwabassetmanagement.com ${ticker} expense ratio holdings`;
  if (n.includes("proshares")) return `site:proshares.com ${ticker} expense ratio holdings`;
  // fallback: broad query, we’ll still validate extracted fields
  return `${ticker} ETF net assets AUM expense ratio holdings issuer`;
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
  // Handles examples like:
  // "$12.34B", "USD 12.34 billion", "12.34B", "$12,345,678,901", "12.3 million"
  const cleaned = text.replace(/\s+/g, " ").trim();

  // $12.34B / 12.34B
  const abbrev = cleaned.match(/\$?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?)\s*([TMB])\b/i);
  if (abbrev) {
    const raw = Number(String(abbrev[1]).replace(/,/g, ""));
    const unit = String(abbrev[2]).toUpperCase();
    const mult = unit === "T" ? 1e12 : unit === "B" ? 1e9 : 1e6;
    return Number.isFinite(raw) ? raw * mult : null;
  }

  // 12.34 billion/million/trillion
  const wordUnit = cleaned.match(/\$?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?)\s*(trillion|billion|million)\b/i);
  if (wordUnit) {
    const raw = Number(String(wordUnit[1]).replace(/,/g, ""));
    const unit = String(wordUnit[2]).toLowerCase();
    const mult = unit === "trillion" ? 1e12 : unit === "billion" ? 1e9 : 1e6;
    return Number.isFinite(raw) ? raw * mult : null;
  }

  // $12,345,678,901 or $12345
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
  // Try to find a "Net Assets"-style label and parse the first USD-looking amount nearby.
  const candidates = [
    /Net Assets[^\n\r]{0,140}?(\$?\s*[0-9][0-9.,\s]*(?:[TMB])?\b)/i,
    /Total Net Assets[^\n\r]{0,140}?(\$?\s*[0-9][0-9.,\s]*(?:[TMB])?\b)/i,
    /Fund Net Assets[^\n\r]{0,140}?(\$?\s*[0-9][0-9.,\s]*(?:[TMB])?\b)/i,
    /Net assets[^\n\r]{0,140}?(\$?\s*[0-9][0-9.,\s]*(?:[TMB])?\b)/i,
    /AUM[^\n\r]{0,140}?(\$?\s*[0-9][0-9.,\s]*(?:[TMB])?\b)/i,
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

    // Fetch daily bars for calculating returns (5 years of data for multi-year returns)
    const today = new Date();
    const fiveYearsAgo = new Date(today);
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

    const barsUrl = `${BASE_URL}/v2/aggs/ticker/${encodeURIComponent(ticker)}/range/1/day/${fiveYearsAgo.toISOString().split('T')[0]}/${today.toISOString().split('T')[0]}?adjusted=true&sort=asc&limit=50000&apiKey=${POLYGON_API_KEY}`;
    const barsRes = await fetch(barsUrl);
    let bars: any[] = [];
    if (barsRes.ok) {
      const barsData = await barsRes.json();
      if (barsData.results && Array.isArray(barsData.results)) {
        bars = barsData.results;
      }
    }
    
    console.log(`[polygon-etf-details] Fetched ${bars.length} bars for ${ticker}`);

    // Calculate returns from price history
    let ytdReturn: number | null = null;
    let oneYearReturn: number | null = null;
    let threeYearReturn: number | null = null;
    let fiveYearReturn: number | null = null;

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

      // 1 year return - find bar closest to 1 year ago
      const oneYearAgoDate = new Date(today);
      oneYearAgoDate.setFullYear(oneYearAgoDate.getFullYear() - 1);
      const oneYearBar = bars.find((b: any) => new Date(b.t) >= oneYearAgoDate);
      if (oneYearBar && currentPrice > 0) {
        const yearAgoPrice = oneYearBar.o || oneYearBar.c || 0;
        if (yearAgoPrice > 0) {
          oneYearReturn = ((currentPrice - yearAgoPrice) / yearAgoPrice) * 100;
        }
      }

      // 3 year return
      const threeYearsAgoDate = new Date(today);
      threeYearsAgoDate.setFullYear(threeYearsAgoDate.getFullYear() - 3);
      const threeYearBar = bars.find((b: any) => new Date(b.t) >= threeYearsAgoDate);
      if (threeYearBar && currentPrice > 0) {
        const threeYearAgoPrice = threeYearBar.o || threeYearBar.c || 0;
        if (threeYearAgoPrice > 0 && bars.length > 700) { // Ensure we have ~3 years of data
          threeYearReturn = ((currentPrice - threeYearAgoPrice) / threeYearAgoPrice) * 100;
        }
      }

      // 5 year return
      if (bars.length > 1200 && currentPrice > 0) { // Ensure we have ~5 years of data
        const fiveYearAgoPrice = bars[0]?.o || bars[0]?.c || 0;
        if (fiveYearAgoPrice > 0) {
          fiveYearReturn = ((currentPrice - fiveYearAgoPrice) / fiveYearAgoPrice) * 100;
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

    // Fetch beta and dividend yield from Finnhub
    let finnhubBeta: number | null = null;
    let finnhubDividendYield: number | null = null;
    const finnhubApiKey = Deno.env.get("VITE_FINNHUB_API_KEY");
    if (finnhubApiKey) {
      try {
        const finnhubUrl = `https://finnhub.io/api/v1/stock/metric?symbol=${ticker}&metric=all&token=${finnhubApiKey}`;
        const finnhubRes = await fetch(finnhubUrl);
        if (finnhubRes.ok) {
          const finnhubData = await finnhubRes.json();
          const metrics = finnhubData.metric || {};
          finnhubBeta = metrics.beta || null;
          finnhubDividendYield = metrics.dividendYieldIndicatedAnnual || null;
          console.log(`[polygon-etf-details] Finnhub metrics for ${ticker}: beta=${finnhubBeta}, divYield=${finnhubDividendYield}`);
        }
      } catch (e) {
        console.warn(`[polygon-etf-details] Finnhub fetch failed for ${ticker}:`, e);
      }
    }

    // If Finnhub didn't provide dividend yield, calculate from Polygon dividends data
    let calculatedDividendYield: number | null = null;
    if (finnhubDividendYield == null && bars.length > 0) {
      try {
        const oneYearAgoDate = new Date(today);
        oneYearAgoDate.setFullYear(oneYearAgoDate.getFullYear() - 1);
        const dividendUrl = `${BASE_URL}/v3/reference/dividends?ticker=${ticker}&ex_dividend_date.gte=${oneYearAgoDate.toISOString().split('T')[0]}&limit=50&apiKey=${POLYGON_API_KEY}`;
        const divRes = await fetch(dividendUrl);
        if (divRes.ok) {
          const divData = await divRes.json();
          const results = Array.isArray(divData.results) ? divData.results : [];

          // If Polygon reports no cash distributions in the last 12 months, the real dividend yield is 0.
          if (results.length === 0) {
            calculatedDividendYield = 0;
            console.log(`[polygon-etf-details] Polygon dividends for ${ticker}: none in last 12 months → yield=0.00%`);
          } else {
            const totalDividends = results.reduce((sum: number, d: any) => sum + (d.cash_amount || 0), 0);
            const currentPrice = bars[bars.length - 1]?.c || 0;
            if (currentPrice > 0) {
              calculatedDividendYield = totalDividends > 0 ? (totalDividends / currentPrice) * 100 : 0;
              console.log(`[polygon-etf-details] Polygon dividends for ${ticker}: yield=${calculatedDividendYield.toFixed(2)}% (${results.length} dividends, $${totalDividends.toFixed(2)} total)`);
            }
          }
        }
      } catch (e) {
        console.warn(`[polygon-etf-details] Polygon dividend fetch failed for ${ticker}:`, e);
      }
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

    // Baseline AUM:
    // 1) DB cache (asset_universe.aum)
    // 2) Polygon-provided market_cap when available
    // 3) Otherwise derive from shares outstanding × current price (real Polygon data)
    const sharesOutstanding =
      (typeof tickerDetails.weighted_shares_outstanding === "number" ? tickerDetails.weighted_shares_outstanding : null) ??
      (typeof tickerDetails.share_class_shares_outstanding === "number" ? tickerDetails.share_class_shares_outstanding : null) ??
      (typeof tickerDetails.shares_outstanding === "number" ? tickerDetails.shares_outstanding : null);

    const derivedPrice =
      snapshot?.lastTrade?.p ??
      snapshot?.day?.c ??
      (bars.length > 0 ? bars[bars.length - 1]?.c : null);

    const derivedAum =
      sharesOutstanding && derivedPrice && sharesOutstanding > 0 && derivedPrice > 0
        ? sharesOutstanding * derivedPrice
        : null;

    const baseAum = assetUniverseData?.aum ?? tickerDetails.market_cap ?? derivedAum ?? null;

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

    // Apply reference data from our ETF registry (expense ratios, category, issuer, holdings)
    const refData = ETF_REFERENCE_DATA[ticker];
    if (refData) {
      if (!enriched.issuer) enriched.issuer = refData.issuer;
      if (!enriched.category || enriched.category === "ETF") enriched.category = refData.category;
      if (enriched.expenseRatio == null) enriched.expenseRatio = refData.expenseRatio;
      if (enriched.holdings == null && refData.holdings) enriched.holdings = refData.holdings;
      // For single-asset trusts, set top holdings
      if (refData.underlyingAsset && (!enriched.topHoldings || enriched.topHoldings.length === 0)) {
        enriched.topHoldings = [{
          symbol: refData.underlyingAsset,
          name: refData.underlyingName || refData.underlyingAsset,
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
      beta: finnhubBeta ?? assetUniverseData?.beta_spy ?? null,
      dividendYield: finnhubDividendYield ?? calculatedDividendYield ?? null,
      ytdReturn,
      oneYearReturn,
      threeYearReturn,
      fiveYearReturn,
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
