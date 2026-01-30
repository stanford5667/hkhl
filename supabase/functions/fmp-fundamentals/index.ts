import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BASE_URL = "https://financialmodelingprep.com/api/v3";

// SEC requires a descriptive User-Agent (ideally with contact info)
const SEC_HEADERS = {
  'User-Agent': 'AssetLabs Research (support@assetlabs.ai)',
  'Accept': 'application/json',
};

// Polygon API base URL
const POLYGON_BASE_URL = "https://api.polygon.io";

// Cache SEC ticker->CIK mapping for 24h to avoid re-downloading a large JSON on every request
let secCompanyTickersCache: { data: any[]; fetchedAt: number } | null = null;
const SEC_COMPANY_TICKERS_TTL_MS = 24 * 60 * 60 * 1000;

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  {
    attempts = 3,
    timeoutMs = 8000,
    baseDelayMs = 350,
  }: { attempts?: number; timeoutMs?: number; baseDelayMs?: number } = {}
): Promise<Response> {
  let lastErr: unknown;

  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetchWithTimeout(url, options, timeoutMs);
      if ([429, 500, 502, 503, 504].includes(res.status) && i < attempts - 1) {
        const delay = baseDelayMs * Math.pow(2, i);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      return res;
    } catch (e) {
      lastErr = e;
      if (i < attempts - 1) {
        const delay = baseDelayMs * Math.pow(2, i);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error('Network error');
}

async function getSecCompanyTickers(): Promise<any[]> {
  const now = Date.now();
  if (secCompanyTickersCache && now - secCompanyTickersCache.fetchedAt < SEC_COMPANY_TICKERS_TTL_MS) {
    return secCompanyTickersCache.data;
  }

  const url = 'https://www.sec.gov/files/company_tickers.json';
  const res = await fetchWithRetry(url, { headers: SEC_HEADERS }, { attempts: 3, timeoutMs: 10000 });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`SEC ticker mapping fetch failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const json = await res.json();
  const data = Object.values(json) as any[];
  secCompanyTickersCache = { data, fetchedAt: now };
  return data;
}

// Cache for 1 hour (fundamentals don't change frequently)
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function getCached(key: string): unknown | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) {
    return entry.data;
  }
  cache.delete(key);
  return null;
}

function setCache(key: string, data: unknown): void {
  cache.set(key, { data, timestamp: Date.now() });
  if (cache.size > 100) {
    const oldest = [...cache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
    if (oldest) cache.delete(oldest[0]);
  }
}

interface IncomeStatement {
  date: string;
  symbol: string;
  revenue: number;
  costOfRevenue?: number;
  grossProfit?: number;
  operatingExpenses?: number;
  operatingIncome: number;
  interestExpense?: number;
  otherIncome?: number;
  incomeBeforeTax?: number;
  incomeTax?: number;
  netIncome: number;
  ebitda: number;
  eps: number;
  period: string;
}

interface CompanyProfile {
  symbol: string;
  companyName: string;
  industry: string;
  sector: string;
  marketCap: number;
  price: number;
  description: string;
  country: string;
  exchange: string;
  ceo: string;
  employees: number;
  website: string;
}

interface ProductSegment {
  name: string;
  revenue: number;
  percentage: number;
}

interface AnalystEstimate {
  date: string;
  symbol: string;
  estimatedRevenueLow: number;
  estimatedRevenueHigh: number;
  estimatedRevenueAvg: number;
  estimatedEbitdaLow: number;
  estimatedEbitdaHigh: number;
  estimatedEbitdaAvg: number;
  estimatedEbitLow: number;
  estimatedEbitHigh: number;
  estimatedEbitAvg: number;
  estimatedNetIncomeLow: number;
  estimatedNetIncomeHigh: number;
  estimatedNetIncomeAvg: number;
  estimatedEpsAvg: number;
  estimatedEpsHigh: number;
  estimatedEpsLow: number;
  numberAnalystEstimatedRevenue: number;
  numberAnalystsEstimatedEps: number;
  isEstimate: boolean;
}

// NEW: Balance sheet data structure
interface BalanceSheetData {
  totalAssets: number | null;
  totalLiabilities: number | null;
  totalEquity: number | null;
  currentAssets: number | null;
  currentLiabilities: number | null;
  inventory: number | null;
  cash: number | null;
  longTermDebt: number | null;
  shortTermDebt: number | null;
}

// NEW: Pre-calculated ratios from Polygon
interface FinancialRatios {
  priceToBook: number | null;
  priceToCash: number | null;
  priceToFreeCashFlow: number | null;
  evToEbitda: number | null;
  evToSales: number | null;
  debtToEquity: number | null;
  quickRatio: number | null;
  currentRatio: number | null;
  returnOnAssets: number | null;
  returnOnEquity: number | null;
  enterpriseValue: number | null;
  freeCashFlow: number | null;
}

// NEW: Calculated metrics
interface CalculatedMetrics {
  operatingMargin: number | null;
  grossMargin: number | null;
  netMargin: number | null;
  epsGrowthYoY: number | null;
  revenueGrowthYoY: number | null;
  epsStdDev: number | null;
}

interface FundamentalsResponse {
  profile: CompanyProfile | null;
  financials: IncomeStatement[];
  estimates: AnalystEstimate[];
  balanceSheet: BalanceSheetData | null;
  ratios: FinancialRatios | null;
  metrics: CalculatedMetrics | null;
  useMockData: boolean;
  source: string;
  dataQuality: number; // 1-10 score
}

async function fetchIncomeStatements(symbol: string, apiKey: string): Promise<IncomeStatement[] | null> {
  const cacheKey = `income_${symbol}`;
  const cached = getCached(cacheKey);
  if (cached) {
    console.log(`[fmp] Cache hit for ${symbol} income statements`);
    return cached as IncomeStatement[];
  }

  const url = `${BASE_URL}/income-statement/${encodeURIComponent(symbol)}?period=annual&limit=5&apikey=${apiKey}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`FMP API error: ${response.status}`);
  }
  
  const data = await response.json();
  
  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }
  
  const results = data.map((item: any) => ({
    date: item.date,
    symbol: item.symbol,
    revenue: item.revenue || 0,
    costOfRevenue: item.costOfRevenue || 0,
    grossProfit: item.grossProfit || 0,
    operatingExpenses: item.operatingExpenses || 0,
    operatingIncome: item.operatingIncome || 0,
    interestExpense: item.interestExpense || 0,
    otherIncome: item.totalOtherIncomeExpensesNet || item.otherTotalOperatingIncome || 0,
    incomeBeforeTax: item.incomeBeforeTax || 0,
    incomeTax: item.incomeTaxExpense || 0,
    netIncome: item.netIncome || 0,
    ebitda: item.ebitda || 0,
    eps: item.eps || 0,
    period: item.period || 'FY',
  }));
  
  setCache(cacheKey, results);
  return results;
}

async function fetchCompanyProfile(symbol: string, apiKey: string): Promise<CompanyProfile | null> {
  const cacheKey = `profile_${symbol}`;
  const cached = getCached(cacheKey);
  if (cached) {
    console.log(`[fmp] Cache hit for ${symbol} profile`);
    return cached as CompanyProfile;
  }

  const url = `${BASE_URL}/profile/${encodeURIComponent(symbol)}?apikey=${apiKey}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`FMP API error: ${response.status}`);
  }
  
  const data = await response.json();
  
  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }
  
  const item = data[0];
  const result: CompanyProfile = {
    symbol: item.symbol,
    companyName: item.companyName,
    industry: item.industry,
    sector: item.sector,
    marketCap: item.mktCap || 0,
    price: item.price || 0,
    description: item.description,
    country: item.country,
    exchange: item.exchange || item.exchangeShortName,
    ceo: item.ceo,
    employees: item.fullTimeEmployees || 0,
    website: item.website,
  };
  
  setCache(cacheKey, result);
  return result;
}

// Fetch real-time profile data from Polygon.io
async function fetchPolygonProfile(symbol: string, apiKey: string): Promise<Partial<CompanyProfile> | null> {
  const cacheKey = `polygon_profile_${symbol}`;
  const cached = getCached(cacheKey);
  if (cached) {
    console.log(`[polygon] Cache hit for ${symbol} profile`);
    return cached as Partial<CompanyProfile>;
  }

  try {
    // Fetch ticker details for company info
    const detailsUrl = `${POLYGON_BASE_URL}/v3/reference/tickers/${encodeURIComponent(symbol)}?apiKey=${apiKey}`;
    const detailsRes = await fetchWithTimeout(detailsUrl, {}, 5000);
    
    if (!detailsRes.ok) {
      console.warn(`[polygon] Ticker details failed for ${symbol}: ${detailsRes.status}`);
      return null;
    }
    
    const detailsData = await detailsRes.json();
    const details = detailsData.results;
    
    if (!details) {
      return null;
    }

    // Fetch current price from previous day close
    const priceUrl = `${POLYGON_BASE_URL}/v2/aggs/ticker/${encodeURIComponent(symbol)}/prev?adjusted=true&apiKey=${apiKey}`;
    const priceRes = await fetchWithTimeout(priceUrl, {}, 5000);
    
    let currentPrice = 0;
    let marketCap = details.market_cap || 0;
    
    if (priceRes.ok) {
      const priceData = await priceRes.json();
      if (priceData.results && priceData.results.length > 0) {
        currentPrice = priceData.results[0].c || 0;
        
        // Calculate market cap from price * shares if not available
        if (!marketCap && details.share_class_shares_outstanding && currentPrice) {
          marketCap = currentPrice * details.share_class_shares_outstanding;
        } else if (!marketCap && details.weighted_shares_outstanding && currentPrice) {
          marketCap = currentPrice * details.weighted_shares_outstanding;
        }
      }
    }

    const profile: Partial<CompanyProfile> = {
      symbol: details.ticker,
      companyName: details.name,
      industry: details.sic_description || 'Unknown',
      sector: details.sic_description?.split(' ')[0] || 'Unknown',
      marketCap: marketCap,
      price: currentPrice,
      description: details.description || '',
      country: details.locale?.toUpperCase() || 'US',
      exchange: details.primary_exchange || 'Unknown',
      website: details.homepage_url || '',
    };

    console.log(`[polygon] Got profile for ${symbol}: price=$${currentPrice?.toFixed(2)}, marketCap=$${(marketCap/1e9).toFixed(1)}B`);
    
    setCache(cacheKey, profile);
    return profile;
  } catch (err) {
    console.error(`[polygon] Error fetching profile for ${symbol}:`, err);
    return null;
  }
}

// NEW: Fetch balance sheet data from Polygon financials API
async function fetchPolygonBalanceSheet(symbol: string, apiKey: string): Promise<BalanceSheetData | null> {
  const cacheKey = `polygon_balance_${symbol}`;
  const cached = getCached(cacheKey);
  if (cached) {
    console.log(`[polygon] Cache hit for ${symbol} balance sheet`);
    return cached as BalanceSheetData;
  }

  try {
    const url = `${POLYGON_BASE_URL}/vX/reference/financials?ticker=${encodeURIComponent(symbol)}&timeframe=annual&limit=1&sort=period_of_report_date&order=desc&apiKey=${apiKey}`;
    const res = await fetchWithTimeout(url, {}, 8000);
    
    if (!res.ok) {
      console.warn(`[polygon] Balance sheet API returned ${res.status} for ${symbol}`);
      return null;
    }
    
    const data = await res.json();
    const results = data.results;
    
    if (!results || results.length === 0) {
      console.warn(`[polygon] No balance sheet data for ${symbol}`);
      return null;
    }

    const bs = results[0].financials?.balance_sheet;
    if (!bs) {
      console.warn(`[polygon] No balance_sheet in financials for ${symbol}`);
      return null;
    }

    const balanceSheet: BalanceSheetData = {
      totalAssets: bs.assets?.value || null,
      totalLiabilities: bs.liabilities?.value || null,
      totalEquity: bs.equity?.value || bs.equity_attributable_to_parent?.value || null,
      currentAssets: bs.current_assets?.value || null,
      currentLiabilities: bs.current_liabilities?.value || null,
      inventory: bs.inventory?.value || null,
      cash: bs.cash_and_cash_equivalents?.value || bs.cash?.value || null,
      longTermDebt: bs.long_term_debt?.value || bs.noncurrent_liabilities?.value || null,
      shortTermDebt: bs.short_term_debt?.value || null,
    };

    console.log(`[polygon] Got balance sheet for ${symbol}: assets=$${((balanceSheet.totalAssets || 0)/1e9).toFixed(1)}B, equity=$${((balanceSheet.totalEquity || 0)/1e9).toFixed(1)}B`);
    
    setCache(cacheKey, balanceSheet);
    return balanceSheet;
  } catch (err) {
    console.error(`[polygon] Error fetching balance sheet for ${symbol}:`, err);
    return null;
  }
}

// NEW: Fetch quarterly EPS for standard deviation calculation
async function fetchQuarterlyEPS(symbol: string, apiKey: string): Promise<number[]> {
  const cacheKey = `quarterly_eps_${symbol}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return cached as number[];
  }

  try {
    const url = `${POLYGON_BASE_URL}/vX/reference/financials?ticker=${encodeURIComponent(symbol)}&timeframe=quarterly&limit=8&sort=period_of_report_date&order=desc&apiKey=${apiKey}`;
    const res = await fetchWithTimeout(url, {}, 8000);
    
    if (!res.ok) {
      return [];
    }
    
    const data = await res.json();
    const results = data.results || [];
    
    const epsValues: number[] = [];
    for (const quarter of results) {
      const eps = quarter.financials?.income_statement?.diluted_earnings_per_share?.value;
      if (eps !== undefined && eps !== null) {
        epsValues.push(eps);
      }
    }
    
    setCache(cacheKey, epsValues);
    return epsValues;
  } catch {
    return [];
  }
}

// Calculate standard deviation
function calculateStdDev(values: number[]): number | null {
  if (values.length < 2) return null;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

// Fetch shares outstanding from Polygon for EPS calculation
async function fetchSharesOutstanding(symbol: string, apiKey: string): Promise<number | null> {
  const cacheKey = `shares_outstanding_${symbol}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return cached as number;
  }

  try {
    const url = `${POLYGON_BASE_URL}/v3/reference/tickers/${encodeURIComponent(symbol)}?apiKey=${apiKey}`;
    const res = await fetchWithTimeout(url, {}, 5000);
    
    if (!res.ok) return null;
    
    const data = await res.json();
    const shares = data.results?.share_class_shares_outstanding || 
                   data.results?.weighted_shares_outstanding || 
                   null;
    
    if (shares) {
      setCache(cacheKey, shares);
      console.log(`[polygon] Shares outstanding for ${symbol}: ${(shares/1e9).toFixed(2)}B`);
    }
    
    return shares;
  } catch {
    return null;
  }
}

// Fetch TTM EPS from Polygon financials API
async function fetchTTMEPS(symbol: string, apiKey: string): Promise<number | null> {
  const cacheKey = `ttm_eps_${symbol}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return cached as number;
  }

  try {
    const url = `${POLYGON_BASE_URL}/vX/reference/financials?ticker=${encodeURIComponent(symbol)}&timeframe=quarterly&limit=4&sort=period_of_report_date&order=desc&apiKey=${apiKey}`;
    const res = await fetchWithTimeout(url, {}, 8000);
    
    if (!res.ok) {
      console.warn(`[polygon] TTM EPS API returned ${res.status} for ${symbol}`);
      return null;
    }
    
    const data = await res.json();
    const results = data.results;
    
    if (!results || results.length === 0) {
      console.warn(`[polygon] No quarterly financials for ${symbol}`);
      return null;
    }

    let ttmEPS = 0;
    let quartersFound = 0;
    
    for (const quarter of results) {
      const eps = quarter.financials?.income_statement?.diluted_earnings_per_share?.value;
      if (eps !== undefined && eps !== null) {
        ttmEPS += eps;
        quartersFound++;
        console.log(`[polygon] ${symbol} Q${quartersFound}: EPS=$${eps.toFixed(2)}, period=${quarter.fiscal_period}`);
      }
    }
    
    if (quartersFound >= 4) {
      console.log(`[polygon] TTM EPS for ${symbol}: $${ttmEPS.toFixed(2)} (from ${quartersFound} quarters)`);
      setCache(cacheKey, ttmEPS);
      return Math.round(ttmEPS * 100) / 100;
    } else if (quartersFound > 0) {
      const annualizedEPS = (ttmEPS / quartersFound) * 4;
      console.log(`[polygon] Annualized EPS for ${symbol}: $${annualizedEPS.toFixed(2)} (from ${quartersFound} quarters)`);
      setCache(cacheKey, annualizedEPS);
      return Math.round(annualizedEPS * 100) / 100;
    }
    
    return null;
  } catch (err) {
    console.error(`[polygon] Error fetching TTM EPS for ${symbol}:`, err);
    return null;
  }
}

// Fetch analyst estimates from FMP
async function fetchAnalystEstimates(symbol: string, apiKey: string): Promise<AnalystEstimate[]> {
  const cacheKey = `estimates_${symbol}`;
  const cached = getCached(cacheKey);
  if (cached) {
    console.log(`[fmp] Cache hit for ${symbol} analyst estimates`);
    return cached as AnalystEstimate[];
  }

  const url = `${BASE_URL}/analyst-estimates/${encodeURIComponent(symbol)}?period=annual&limit=5&apikey=${apiKey}`;
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      console.warn(`[fmp] Analyst estimates API returned ${response.status} for ${symbol}`);
      return [];
    }
    
    const data = await response.json();
    
    if (!Array.isArray(data) || data.length === 0) {
      return [];
    }
    
    const today = new Date();
    const currentYear = today.getFullYear();
    
    const results: AnalystEstimate[] = data
      .filter((item: any) => {
        const estimateYear = parseInt(item.date?.split('-')[0] || '0');
        return estimateYear >= currentYear;
      })
      .slice(0, 3)
      .map((item: any) => ({
        date: item.date,
        symbol: item.symbol,
        estimatedRevenueLow: item.estimatedRevenueLow || 0,
        estimatedRevenueHigh: item.estimatedRevenueHigh || 0,
        estimatedRevenueAvg: item.estimatedRevenueAvg || 0,
        estimatedEbitdaLow: item.estimatedEbitdaLow || 0,
        estimatedEbitdaHigh: item.estimatedEbitdaHigh || 0,
        estimatedEbitdaAvg: item.estimatedEbitdaAvg || 0,
        estimatedEbitLow: item.estimatedEbitLow || 0,
        estimatedEbitHigh: item.estimatedEbitHigh || 0,
        estimatedEbitAvg: item.estimatedEbitAvg || 0,
        estimatedNetIncomeLow: item.estimatedNetIncomeLow || 0,
        estimatedNetIncomeHigh: item.estimatedNetIncomeHigh || 0,
        estimatedNetIncomeAvg: item.estimatedNetIncomeAvg || 0,
        estimatedEpsAvg: item.estimatedEpsAvg || 0,
        estimatedEpsHigh: item.estimatedEpsHigh || 0,
        estimatedEpsLow: item.estimatedEpsLow || 0,
        numberAnalystEstimatedRevenue: item.numberAnalystEstimatedRevenue || 0,
        numberAnalystsEstimatedEps: item.numberAnalystsEstimatedEps || 0,
        isEstimate: true,
      }));
    
    console.log(`[fmp] Got ${results.length} analyst estimates for ${symbol}`);
    setCache(cacheKey, results);
    return results;
  } catch (err) {
    console.error(`[fmp] Error fetching analyst estimates for ${symbol}:`, err);
    return [];
  }
}

async function fetchProductSegments(symbol: string, apiKey: string): Promise<ProductSegment[]> {
  const cacheKey = `segments_${symbol}`;
  const cached = getCached(cacheKey);
  if (cached) {
    console.log(`[fmp] Cache hit for ${symbol} product segments`);
    return cached as ProductSegment[];
  }

  const url = `https://financialmodelingprep.com/api/v4/revenue-product-segmentation?symbol=${encodeURIComponent(symbol)}&period=annual&structure=flat&apikey=${apiKey}`;
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      console.warn(`[fmp] Product segmentation API returned ${response.status} for ${symbol}`);
      return [];
    }
    
    const data = await response.json();
    
    if (!Array.isArray(data) || data.length === 0) {
      return [];
    }

    const segments: ProductSegment[] = [];
    let totalRevenue = 0;

    for (const entry of data) {
      const dateKey = Object.keys(entry).find(k => k.match(/^\d{4}-\d{2}-\d{2}$/));
      if (dateKey && entry[dateKey]) {
        const segmentData = entry[dateKey];
        for (const [name, revenue] of Object.entries(segmentData)) {
          if (typeof revenue === 'number' && revenue > 0) {
            const existing = segments.find(s => s.name === name);
            if (!existing) {
              segments.push({ name, revenue, percentage: 0 });
              totalRevenue += revenue;
            }
          }
        }
        break;
      }
    }

    if (totalRevenue > 0) {
      for (const segment of segments) {
        segment.percentage = (segment.revenue / totalRevenue) * 100;
      }
    }

    const results = segments
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    setCache(cacheKey, results);
    return results;
  } catch (err) {
    console.error(`[fmp] Error fetching product segments for ${symbol}:`, err);
    return [];
  }
}

// Fetch SEC financials (unchanged from original)
async function fetchSECFinancials(ticker: string): Promise<IncomeStatement[]> {
  console.log(`[SEC XBRL] Fetching company facts for ${ticker}...`);
  
  try {
    const cikData = await getSecCompanyTickers();
    let cik: string | null = null;

    for (const entry of cikData) {
      if (entry.ticker?.toUpperCase() === ticker.toUpperCase()) {
        cik = String(entry.cik_str).padStart(10, '0');
        break;
      }
    }
    
    if (!cik) {
      console.error(`[SEC XBRL] Could not find CIK for ${ticker}`);
      return [];
    }

    const factsUrl = `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`;
    const response = await fetchWithRetry(factsUrl, { headers: SEC_HEADERS }, { attempts: 3, timeoutMs: 10000 });

    if (!response.ok) {
      console.error(`[SEC XBRL] API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const facts = data.facts?.['us-gaap'];
    
    if (!facts) {
      console.error('[SEC XBRL] No us-gaap facts found');
      return [];
    }

    const getAnnualValues = (concept: string): Map<string, number> => {
      const values = new Map<string, { val: number; duration: number; frame?: string }>();
      const conceptData = facts[concept]?.units?.USD;
      
      if (!conceptData) return new Map();
      
      for (const entry of conceptData) {
        if (entry.form === '10-K' && entry.fy && entry.val != null) {
          const year = String(entry.fy);
          
          let duration = 0;
          if (entry.start && entry.end) {
            const startDate = new Date(entry.start);
            const endDate = new Date(entry.end);
            duration = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          }
          
          const hasAnnualFrame = entry.frame && !entry.frame.includes('Q');
          
          const existing = values.get(year);
          const isAnnualDuration = duration >= 350 && duration <= 380;
          const existingIsAnnual = existing && existing.duration >= 350 && existing.duration <= 380;
          
          if (!existing || 
              (isAnnualDuration && !existingIsAnnual) ||
              (hasAnnualFrame && !existing.frame?.includes('FY') && !existing.frame?.includes('CY')) ||
              duration > existing.duration) {
            values.set(year, { val: entry.val, duration, frame: entry.frame });
          }
        }
      }
      
      const result = new Map<string, number>();
      for (const [year, d] of values) {
        result.set(year, d.val);
      }
      return result;
    };

    const findValues = (concepts: string[], logName?: string): Map<string, number> => {
      for (const concept of concepts) {
        const values = getAnnualValues(concept);
        if (values.size > 0) {
          if (logName) {
            console.log(`[SEC XBRL] ${logName} using concept: ${concept}, years: ${[...values.keys()].join(', ')}`);
          }
          return values;
        }
      }
      return new Map();
    };

    const revenueValues = findValues([
      'RevenueFromContractWithCustomerExcludingAssessedTax',
      'Revenues',
      'Revenue', 
      'SalesRevenueNet',
      'SalesRevenueGoodsNet',
      'TotalRevenuesAndOtherIncome',
      'NetSales',
    ], 'Revenue');
    
    const costOfRevenueValues = findValues(['CostOfRevenue', 'CostOfGoodsAndServicesSold', 'CostOfGoodsSold', 'CostOfSales']);
    const grossProfitValues = findValues(['GrossProfit']);
    const operatingIncomeValues = findValues(['OperatingIncomeLoss', 'IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest']);
    const netIncomeValues = findValues(['NetIncomeLoss', 'ProfitLoss', 'NetIncome']);
    const epsValues = findValues(['EarningsPerShareDiluted', 'EarningsPerShareBasic']);

    const years = [...new Set([...revenueValues.keys(), ...netIncomeValues.keys()])]
      .sort((a, b) => parseInt(b) - parseInt(a))
      .slice(0, 5);
    
    console.log(`[SEC XBRL] Found years: ${years.join(', ')} with revenue values: ${[...revenueValues.entries()].map(([y, v]) => `${y}=${(v/1e9).toFixed(1)}B`).join(', ')}`);

    const financials: IncomeStatement[] = [];

    for (const year of years) {
      const revenue = revenueValues.get(year) || 0;
      if (revenue === 0) continue;
      
      const costOfRevenue = costOfRevenueValues.get(year) || Math.round(revenue * 0.6);
      const grossProfit = grossProfitValues.get(year) || (revenue - costOfRevenue);
      const operatingIncome = operatingIncomeValues.get(year) || Math.round(grossProfit * 0.3);
      const netIncome = netIncomeValues.get(year) || Math.round(operatingIncome * 0.75);
      const eps = epsValues.get(year) || 0;

      const operatingExpenses = grossProfit - operatingIncome;
      const interestExpense = Math.round(revenue * 0.01);
      const otherIncome = Math.round(revenue * 0.005);
      const incomeBeforeTax = operatingIncome - interestExpense + otherIncome;
      const incomeTax = incomeBeforeTax - netIncome;
      const ebitda = Math.round(operatingIncome * 1.15);

      financials.push({
        date: `${year}-12-31`,
        symbol: ticker,
        revenue,
        costOfRevenue,
        grossProfit,
        operatingExpenses,
        operatingIncome,
        interestExpense,
        otherIncome,
        incomeBeforeTax,
        incomeTax,
        netIncome,
        ebitda,
        eps,
        period: 'FY',
      });
    }

    console.log(`[SEC XBRL] Extracted ${financials.length} years of data for ${ticker}`);
    return financials;
  } catch (err) {
    console.error('[SEC XBRL] Error:', err);
    return [];
  }
}

// NEW: Fetch SEC balance sheet concepts
async function fetchSECBalanceSheet(ticker: string): Promise<BalanceSheetData | null> {
  const cacheKey = `sec_balance_${ticker}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return cached as BalanceSheetData;
  }

  try {
    const cikData = await getSecCompanyTickers();
    let cik: string | null = null;

    for (const entry of cikData) {
      if (entry.ticker?.toUpperCase() === ticker.toUpperCase()) {
        cik = String(entry.cik_str).padStart(10, '0');
        break;
      }
    }
    
    if (!cik) return null;

    const factsUrl = `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`;
    const response = await fetchWithRetry(factsUrl, { headers: SEC_HEADERS }, { attempts: 2, timeoutMs: 8000 });

    if (!response.ok) return null;

    const data = await response.json();
    const facts = data.facts?.['us-gaap'];
    
    if (!facts) return null;

    // Get most recent value for a concept
    const getLatestValue = (concepts: string[]): number | null => {
      for (const concept of concepts) {
        const entries = facts[concept]?.units?.USD;
        if (entries && entries.length > 0) {
          // Get most recent 10-K entry
          const sorted = entries
            .filter((e: any) => e.form === '10-K')
            .sort((a: any, b: any) => new Date(b.end || '').getTime() - new Date(a.end || '').getTime());
          if (sorted.length > 0) {
            return sorted[0].val;
          }
        }
      }
      return null;
    };

    const balanceSheet: BalanceSheetData = {
      totalAssets: getLatestValue(['Assets']),
      totalLiabilities: getLatestValue(['Liabilities']),
      totalEquity: getLatestValue(['StockholdersEquity', 'StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest']),
      currentAssets: getLatestValue(['AssetsCurrent']),
      currentLiabilities: getLatestValue(['LiabilitiesCurrent']),
      inventory: getLatestValue(['InventoryNet', 'Inventories']),
      cash: getLatestValue(['CashAndCashEquivalentsAtCarryingValue', 'Cash']),
      longTermDebt: getLatestValue(['LongTermDebt', 'LongTermDebtNoncurrent']),
      shortTermDebt: getLatestValue(['ShortTermBorrowings', 'DebtCurrent']),
    };

    setCache(cacheKey, balanceSheet);
    return balanceSheet;
  } catch {
    return null;
  }
}

async function searchSymbols(query: string, apiKey: string): Promise<any[]> {
  const url = `${BASE_URL}/search?query=${encodeURIComponent(query)}&limit=10&apikey=${apiKey}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`FMP API error: ${response.status}`);
  }
  
  const data = await response.json();
  return Array.isArray(data) ? data.map((item: any) => ({
    symbol: item.symbol,
    name: item.name,
    exchange: item.exchangeShortName,
    type: item.type,
  })) : [];
}

// Mock data generators (simplified - kept for fallback only)
function generateMockProfile(symbol: string): CompanyProfile {
  return {
    symbol,
    companyName: symbol,
    industry: 'Unknown',
    sector: 'Unknown',
    marketCap: 0,
    price: 0,
    description: '',
    country: 'US',
    exchange: 'Unknown',
    ceo: '',
    employees: 0,
    website: '',
  };
}

function generateMockSegments(symbol: string): ProductSegment[] {
  return [];
}

// Calculate financial ratios from available data
function calculateRatios(
  profile: CompanyProfile | null,
  financials: IncomeStatement[],
  balanceSheet: BalanceSheetData | null,
  sharesOutstanding: number | null
): FinancialRatios {
  const ratios: FinancialRatios = {
    priceToBook: null,
    priceToCash: null,
    priceToFreeCashFlow: null,
    evToEbitda: null,
    evToSales: null,
    debtToEquity: null,
    quickRatio: null,
    currentRatio: null,
    returnOnAssets: null,
    returnOnEquity: null,
    enterpriseValue: null,
    freeCashFlow: null,
  };

  if (!profile || !balanceSheet) return ratios;

  const { marketCap, price } = profile;
  const { totalAssets, totalLiabilities, totalEquity, currentAssets, currentLiabilities, inventory, cash, longTermDebt, shortTermDebt } = balanceSheet;

  // Price to Book = Market Cap / Total Equity
  if (marketCap > 0 && totalEquity && totalEquity > 0) {
    ratios.priceToBook = Math.round((marketCap / totalEquity) * 100) / 100;
  }

  // Price to Cash = Market Cap / Cash
  if (marketCap > 0 && cash && cash > 0) {
    ratios.priceToCash = Math.round((marketCap / cash) * 100) / 100;
  }

  // Debt to Equity
  if (totalEquity && totalEquity > 0) {
    const totalDebt = (longTermDebt || 0) + (shortTermDebt || 0);
    if (totalDebt > 0) {
      ratios.debtToEquity = Math.round((totalDebt / totalEquity) * 100) / 100;
    }
  }

  // Quick Ratio = (Current Assets - Inventory) / Current Liabilities
  if (currentAssets && currentLiabilities && currentLiabilities > 0) {
    const quickAssets = currentAssets - (inventory || 0);
    ratios.quickRatio = Math.round((quickAssets / currentLiabilities) * 100) / 100;
  }

  // Current Ratio
  if (currentAssets && currentLiabilities && currentLiabilities > 0) {
    ratios.currentRatio = Math.round((currentAssets / currentLiabilities) * 100) / 100;
  }

  // ROA = Net Income / Total Assets
  if (financials.length > 0 && totalAssets && totalAssets > 0) {
    const netIncome = financials[0].netIncome;
    ratios.returnOnAssets = Math.round((netIncome / totalAssets) * 10000) / 100;
  }

  // ROE = Net Income / Total Equity
  if (financials.length > 0 && totalEquity && totalEquity > 0) {
    const netIncome = financials[0].netIncome;
    ratios.returnOnEquity = Math.round((netIncome / totalEquity) * 10000) / 100;
  }

  // Enterprise Value = Market Cap + Total Debt - Cash
  if (marketCap > 0) {
    const totalDebt = (longTermDebt || 0) + (shortTermDebt || 0);
    ratios.enterpriseValue = marketCap + totalDebt - (cash || 0);

    // EV/EBITDA
    if (financials.length > 0 && financials[0].ebitda > 0) {
      ratios.evToEbitda = Math.round((ratios.enterpriseValue / financials[0].ebitda) * 100) / 100;
    }

    // EV/Sales
    if (financials.length > 0 && financials[0].revenue > 0) {
      ratios.evToSales = Math.round((ratios.enterpriseValue / financials[0].revenue) * 100) / 100;
    }
  }

  return ratios;
}

// Calculate derived metrics from financials
function calculateMetrics(financials: IncomeStatement[], quarterlyEPS: number[]): CalculatedMetrics {
  const metrics: CalculatedMetrics = {
    operatingMargin: null,
    grossMargin: null,
    netMargin: null,
    epsGrowthYoY: null,
    revenueGrowthYoY: null,
    epsStdDev: null,
  };

  if (financials.length === 0) return metrics;

  const latest = financials[0];
  const { revenue, grossProfit, operatingIncome, netIncome } = latest;

  // Margins
  if (revenue > 0) {
    if (operatingIncome) {
      metrics.operatingMargin = Math.round((operatingIncome / revenue) * 10000) / 100;
    }
    if (grossProfit) {
      metrics.grossMargin = Math.round((grossProfit / revenue) * 10000) / 100;
    }
    if (netIncome) {
      metrics.netMargin = Math.round((netIncome / revenue) * 10000) / 100;
    }
  }

  // YoY Growth
  if (financials.length >= 2) {
    const prior = financials[1];
    
    // Revenue Growth
    if (prior.revenue > 0) {
      metrics.revenueGrowthYoY = Math.round(((revenue - prior.revenue) / prior.revenue) * 10000) / 100;
    }

    // EPS Growth
    if (prior.eps && prior.eps !== 0 && latest.eps) {
      metrics.epsGrowthYoY = Math.round(((latest.eps - prior.eps) / Math.abs(prior.eps)) * 10000) / 100;
    }
  }

  // EPS Standard Deviation (from quarterly data)
  if (quarterlyEPS.length >= 4) {
    metrics.epsStdDev = calculateStdDev(quarterlyEPS);
    if (metrics.epsStdDev !== null) {
      metrics.epsStdDev = Math.round(metrics.epsStdDev * 100) / 100;
    }
  }

  return metrics;
}

// Calculate data quality score (1-10)
function calculateDataQuality(
  financials: IncomeStatement[],
  balanceSheet: BalanceSheetData | null,
  ratios: FinancialRatios | null,
  metrics: CalculatedMetrics | null,
  source: string
): number {
  let score = 0;

  // Base score from source
  if (source.includes('Polygon') || source.includes('SEC XBRL')) {
    score += 3;
  } else if (source.includes('Curated')) {
    score += 2;
  } else if (source.includes('Demo')) {
    score += 0;
  }

  // Financial data completeness
  if (financials.length >= 5) score += 2;
  else if (financials.length >= 3) score += 1;

  // Balance sheet available
  if (balanceSheet && balanceSheet.totalAssets && balanceSheet.totalEquity) {
    score += 2;
  }

  // Ratios calculated
  if (ratios) {
    const ratioCount = Object.values(ratios).filter(v => v !== null).length;
    if (ratioCount >= 8) score += 2;
    else if (ratioCount >= 4) score += 1;
  }

  // Metrics calculated
  if (metrics) {
    const metricCount = Object.values(metrics).filter(v => v !== null).length;
    if (metricCount >= 4) score += 1;
  }

  return Math.min(10, Math.max(1, score));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    const body = await req.json();
    const action = body.action || 'fundamentals';
    
    const FMP_API_KEY = Deno.env.get("FMP_API_KEY");
    const POLYGON_API_KEY = Deno.env.get("POLYGON_API_KEY");
    
    if (action === 'search') {
      const query = body.query;
      if (!query || !FMP_API_KEY) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Query and API key required' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      const results = await searchSymbols(query, FMP_API_KEY);
      return new Response(JSON.stringify({
        success: true,
        results,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    if (action === 'fundamentals') {
      const symbol = (body.symbol || '').toUpperCase();
      if (!symbol) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Symbol is required' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      console.log(`[fmp-fundamentals] Processing fundamentals for ${symbol}`);
      
      let profile: CompanyProfile | null = null;
      let financials: IncomeStatement[] = [];
      let estimates: AnalystEstimate[] = [];
      let balanceSheet: BalanceSheetData | null = null;
      let ratios: FinancialRatios | null = null;
      let metrics: CalculatedMetrics | null = null;
      let useMockData = false;
      let source = 'Unknown';
      let quarterlyEPS: number[] = [];
      let sharesOutstanding: number | null = null;
      
      // Fetch FMP data if available
      if (FMP_API_KEY) {
        try {
          const [fmpFinancials, fmpProfile, fmpEstimates] = await Promise.all([
            fetchIncomeStatements(symbol, FMP_API_KEY),
            fetchCompanyProfile(symbol, FMP_API_KEY),
            fetchAnalystEstimates(symbol, FMP_API_KEY),
          ]);
          
          if (fmpFinancials && fmpFinancials.length > 0) {
            financials = fmpFinancials;
            source = 'FMP';
          }
          
          if (fmpProfile) {
            profile = fmpProfile;
          }
          
          estimates = fmpEstimates;
        } catch (err) {
          console.warn(`[fmp] FMP fetch failed for ${symbol}:`, err);
        }
      }
      
      // Fetch Polygon data (primary source)
      if (POLYGON_API_KEY) {
        try {
          const [polygonProfile, polygonBalance, polygonShares, polygonTTMEPS, polygonQuarterlyEPS, secFinancials, secBalance] = await Promise.all([
            fetchPolygonProfile(symbol, POLYGON_API_KEY),
            fetchPolygonBalanceSheet(symbol, POLYGON_API_KEY),
            fetchSharesOutstanding(symbol, POLYGON_API_KEY),
            fetchTTMEPS(symbol, POLYGON_API_KEY),
            fetchQuarterlyEPS(symbol, POLYGON_API_KEY),
            fetchSECFinancials(symbol),
            fetchSECBalanceSheet(symbol),
          ]);
          
          sharesOutstanding = polygonShares;
          quarterlyEPS = polygonQuarterlyEPS;
          
          // Use Polygon profile if available (more accurate price/marketCap)
          if (polygonProfile && polygonProfile.price && polygonProfile.marketCap) {
            profile = {
              symbol: polygonProfile.symbol || symbol,
              companyName: polygonProfile.companyName || profile?.companyName || symbol,
              industry: polygonProfile.industry || profile?.industry || 'Unknown',
              sector: polygonProfile.sector || profile?.sector || 'Unknown',
              marketCap: polygonProfile.marketCap,
              price: polygonProfile.price,
              description: polygonProfile.description || profile?.description || '',
              country: polygonProfile.country || 'US',
              exchange: polygonProfile.exchange || 'Unknown',
              ceo: profile?.ceo || '',
              employees: profile?.employees || 0,
              website: polygonProfile.website || profile?.website || '',
            };
            source = source === 'FMP' ? 'FMP + Polygon' : 'Polygon';
          }
          
          // Use Polygon balance sheet, fallback to SEC
          if (polygonBalance && polygonBalance.totalAssets) {
            balanceSheet = polygonBalance;
            console.log(`[fmp-fundamentals] Using Polygon balance sheet for ${symbol}`);
          } else if (secBalance && secBalance.totalAssets) {
            balanceSheet = secBalance;
            console.log(`[fmp-fundamentals] Using SEC balance sheet for ${symbol}`);
          }
          
          // If no FMP financials, use SEC
          if (financials.length === 0 && secFinancials.length > 0) {
            financials = secFinancials;
            source = 'SEC XBRL';
            console.log(`[fmp-fundamentals] Using SEC financials for ${symbol}`);
          }
          
          // Update TTM EPS
          if (polygonTTMEPS && financials.length > 0) {
            financials[0].eps = polygonTTMEPS;
            console.log(`[fmp-fundamentals] Using TTM EPS for ${symbol}: $${polygonTTMEPS.toFixed(2)}`);
          }
          
          // Calculate EPS from net income if missing
          if (sharesOutstanding) {
            for (const f of financials) {
              if ((!f.eps || f.eps === 0) && f.netIncome) {
                f.eps = Math.round((f.netIncome / sharesOutstanding) * 100) / 100;
              }
            }
          }
        } catch (err) {
          console.error(`[fmp-fundamentals] Polygon/SEC fetch error for ${symbol}:`, err);
        }
      }
      
      // Fallback to mock if no data
      if (!profile) {
        profile = generateMockProfile(symbol);
        useMockData = true;
        source = 'Demo Data';
      }
      
      if (financials.length === 0) {
        useMockData = true;
        source = 'Demo Data';
      }
      
      // Calculate ratios and metrics
      ratios = calculateRatios(profile, financials, balanceSheet, sharesOutstanding);
      metrics = calculateMetrics(financials, quarterlyEPS);
      
      // Calculate data quality score
      const dataQuality = calculateDataQuality(financials, balanceSheet, ratios, metrics, source);
      
      const response: FundamentalsResponse = {
        profile,
        financials,
        estimates,
        balanceSheet,
        ratios,
        metrics,
        useMockData,
        source,
        dataQuality,
      };
      
      console.log(`[fmp-fundamentals] ${symbol} complete: source=${source}, quality=${dataQuality}/10, hasBalanceSheet=${!!balanceSheet}, ratioCount=${Object.values(ratios || {}).filter(v => v !== null).length}`);
      
      return new Response(JSON.stringify({
        success: true,
        ...response,
        cachedAt: new Date().toISOString(),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    if (action === 'segments') {
      const symbol = (body.symbol || '').toUpperCase();
      if (!symbol) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Symbol is required' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      let segments: ProductSegment[] = [];
      let useMockData = !FMP_API_KEY;
      
      if (FMP_API_KEY) {
        segments = await fetchProductSegments(symbol, FMP_API_KEY);
        
        if (segments.length === 0) {
          useMockData = true;
          segments = generateMockSegments(symbol);
        }
      } else {
        segments = generateMockSegments(symbol);
      }
      
      return new Response(JSON.stringify({
        success: true,
        segments,
        useMockData,
        source: useMockData ? "Demo Data" : "FMP",
        cachedAt: new Date().toISOString(),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: `Unknown action: ${action}` 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error("[fmp-fundamentals] Error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: String(error),
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
