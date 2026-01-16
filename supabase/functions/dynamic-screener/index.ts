import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface FilterCriteria {
  maxDrawdown?: number;
  maxVolatility?: number;
  minSharpe?: number;
  minCagr?: number;
  minSortino?: number;
  riskProfiles?: ('conservative' | 'moderate' | 'growth' | 'aggressive')[];
}

interface RequestBody {
  criteria: FilterCriteria;
  page?: number;
  pageSize?: number;
  sortBy?: 'sharpe' | 'cagr' | 'maxDrawdown' | 'matchScore' | 'sortino' | 'volatility';
  sortDirection?: 'asc' | 'desc';
  limit?: number;
  useCache?: boolean;
  refreshCache?: boolean;
}

interface RealMetrics {
  cagr: number;
  totalReturn: number;
  volatility: number;
  sharpe: number;
  sortino: number;
  maxDrawdown: number;
  dataPoints: number;
}

interface GeneratedPortfolio {
  id: string;
  name: string;
  family: string;
  tickers: string[];
  weights: number[];
  metrics: RealMetrics;
  riskProfile: 'conservative' | 'moderate' | 'growth' | 'aggressive';
  matchScore: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// WEIGHT SCHEMES
// ═══════════════════════════════════════════════════════════════════════════════

const WEIGHT_SCHEMES: Record<number, number[][]> = {
  2: [[50, 50], [60, 40], [70, 30], [80, 20], [75, 25]],
  3: [[34, 33, 33], [50, 30, 20], [40, 40, 20], [50, 25, 25], [60, 25, 15]],
  4: [[25, 25, 25, 25], [40, 20, 20, 20], [30, 30, 20, 20], [35, 25, 25, 15]],
  5: [[20, 20, 20, 20, 20], [30, 20, 20, 15, 15], [25, 25, 20, 15, 15]],
};

// ═══════════════════════════════════════════════════════════════════════════════
// TICKER CATEGORIES
// ═══════════════════════════════════════════════════════════════════════════════

const TICKER_CATEGORIES: Record<string, { riskProfile: 'conservative' | 'moderate' | 'growth' | 'aggressive'; category: string }> = {
  TLT: { category: 'Treasury', riskProfile: 'conservative' },
  IEF: { category: 'Treasury', riskProfile: 'conservative' },
  SHY: { category: 'Treasury', riskProfile: 'conservative' },
  GOVT: { category: 'Treasury', riskProfile: 'conservative' },
  AGG: { category: 'Bond', riskProfile: 'conservative' },
  BND: { category: 'Bond', riskProfile: 'conservative' },
  LQD: { category: 'Corporate Bond', riskProfile: 'conservative' },
  HYG: { category: 'High Yield', riskProfile: 'moderate' },
  TIP: { category: 'TIPS', riskProfile: 'conservative' },
  DVY: { category: 'Dividend', riskProfile: 'conservative' },
  VIG: { category: 'Dividend', riskProfile: 'conservative' },
  VYM: { category: 'Dividend', riskProfile: 'conservative' },
  SCHD: { category: 'Dividend', riskProfile: 'conservative' },
  SPLV: { category: 'Low Volatility', riskProfile: 'conservative' },
  SPY: { category: 'US Large Cap', riskProfile: 'moderate' },
  VOO: { category: 'US Large Cap', riskProfile: 'moderate' },
  VTI: { category: 'Total Market', riskProfile: 'moderate' },
  DIA: { category: 'US Large Cap', riskProfile: 'moderate' },
  SPYG: { category: 'Growth', riskProfile: 'growth' },
  VWO: { category: 'Emerging Markets', riskProfile: 'aggressive' },
  EEM: { category: 'Emerging Markets', riskProfile: 'aggressive' },
  EFA: { category: 'Developed International', riskProfile: 'moderate' },
  VEA: { category: 'Developed International', riskProfile: 'moderate' },
  VXUS: { category: 'International', riskProfile: 'moderate' },
  GLD: { category: 'Gold', riskProfile: 'moderate' },
  VNQ: { category: 'Real Estate', riskProfile: 'moderate' },
  DBC: { category: 'Commodities', riskProfile: 'moderate' },
  XLK: { category: 'Technology', riskProfile: 'growth' },
  XLF: { category: 'Financials', riskProfile: 'growth' },
  XLV: { category: 'Healthcare', riskProfile: 'growth' },
  XLI: { category: 'Industrials', riskProfile: 'growth' },
  XLP: { category: 'Consumer Staples', riskProfile: 'moderate' },
  XLY: { category: 'Consumer Discretionary', riskProfile: 'growth' },
  XLE: { category: 'Energy', riskProfile: 'aggressive' },
  XLU: { category: 'Utilities', riskProfile: 'conservative' },
  QQQ: { category: 'Nasdaq', riskProfile: 'growth' },
  IWM: { category: 'Small Cap', riskProfile: 'aggressive' },
  AAPL: { category: 'Mega Tech', riskProfile: 'growth' },
  MSFT: { category: 'Mega Tech', riskProfile: 'growth' },
  GOOGL: { category: 'Mega Tech', riskProfile: 'growth' },
  AMZN: { category: 'Mega Tech', riskProfile: 'growth' },
  NVDA: { category: 'Semiconductors', riskProfile: 'aggressive' },
  META: { category: 'Mega Tech', riskProfile: 'growth' },
  INTC: { category: 'Semiconductors', riskProfile: 'growth' },
  AMAT: { category: 'Semiconductors', riskProfile: 'aggressive' },
  JNJ: { category: 'Healthcare', riskProfile: 'moderate' },
  UNH: { category: 'Healthcare', riskProfile: 'moderate' },
  JPM: { category: 'Financials', riskProfile: 'moderate' },
  V: { category: 'Financials', riskProfile: 'growth' },
  BITO: { category: 'Crypto', riskProfile: 'aggressive' },
  IBIT: { category: 'Crypto', riskProfile: 'aggressive' },
  ETHA: { category: 'Crypto', riskProfile: 'aggressive' },
  GME: { category: 'Meme', riskProfile: 'aggressive' },
};

// ═══════════════════════════════════════════════════════════════════════════════
// METRICS CALCULATION
// ═══════════════════════════════════════════════════════════════════════════════

function calculateMetrics(portfolioReturns: number[], riskFreeRate = 0.05): RealMetrics {
  if (portfolioReturns.length < 20) {
    return { cagr: 0, totalReturn: 0, volatility: 0, sharpe: 0, sortino: 0, maxDrawdown: 0, dataPoints: 0 };
  }

  const meanDailyReturn = portfolioReturns.reduce((a, b) => a + b, 0) / portfolioReturns.length;
  const annualizedReturn = meanDailyReturn * 252 * 100;

  const variance = portfolioReturns.reduce((sum, r) => sum + Math.pow(r - meanDailyReturn, 2), 0) / (portfolioReturns.length - 1);
  const dailyStd = Math.sqrt(variance);
  const volatility = dailyStd * Math.sqrt(252) * 100;

  // Max drawdown
  let peak = 1;
  let maxDrawdown = 0;
  let cumulative = 1;
  for (const r of portfolioReturns) {
    cumulative *= (1 + r);
    if (cumulative > peak) peak = cumulative;
    const dd = (peak - cumulative) / peak;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }

  // CAGR
  const years = portfolioReturns.length / 252;
  const cagr = years > 0 ? (Math.pow(cumulative, 1 / years) - 1) * 100 : 0;
  const totalReturn = (cumulative - 1) * 100;

  // Sharpe
  const dailyRf = riskFreeRate / 252;
  const excessReturns = portfolioReturns.map(r => r - dailyRf);
  const meanExcess = excessReturns.reduce((a, b) => a + b, 0) / excessReturns.length;
  const excessStd = Math.sqrt(excessReturns.reduce((sum, r) => sum + Math.pow(r - meanExcess, 2), 0) / (excessReturns.length - 1));
  const sharpe = excessStd > 0 ? (meanExcess / excessStd) * Math.sqrt(252) : 0;

  // Sortino
  const negativeReturns = excessReturns.filter(r => r < 0);
  const downsideDeviation = negativeReturns.length > 0
    ? Math.sqrt(negativeReturns.reduce((sum, r) => sum + r * r, 0) / negativeReturns.length) * Math.sqrt(252)
    : 0.01;
  const sortino = downsideDeviation > 0 ? (meanExcess * 252) / downsideDeviation : 0;

  return {
    cagr: Math.round(cagr * 100) / 100,
    totalReturn: Math.round(totalReturn * 100) / 100,
    volatility: Math.round(volatility * 100) / 100,
    sharpe: Math.round(sharpe * 100) / 100,
    sortino: Math.round(sortino * 100) / 100,
    maxDrawdown: Math.round(maxDrawdown * 10000) / 100,
    dataPoints: portfolioReturns.length,
  };
}

function determineRiskProfile(tickers: string[]): 'conservative' | 'moderate' | 'growth' | 'aggressive' {
  let conservativeCount = 0;
  let aggressiveCount = 0;
  let growthCount = 0;

  for (const ticker of tickers) {
    const cat = TICKER_CATEGORIES[ticker];
    if (!cat) { growthCount++; continue; }
    switch (cat.riskProfile) {
      case 'conservative': conservativeCount++; break;
      case 'aggressive': aggressiveCount++; break;
      case 'growth': growthCount++; break;
    }
  }

  const total = tickers.length;
  if (aggressiveCount >= total / 2) return 'aggressive';
  if (conservativeCount >= total / 2) return 'conservative';
  if (growthCount >= total / 2) return 'growth';
  return 'moderate';
}

function calculateMatchScore(metrics: RealMetrics, criteria: FilterCriteria): number {
  let score = 50;
  if (criteria.minSharpe !== undefined && metrics.sharpe >= criteria.minSharpe) score += 15;
  if (criteria.minCagr !== undefined && metrics.cagr >= criteria.minCagr) score += 15;
  if (criteria.maxDrawdown !== undefined && metrics.maxDrawdown <= criteria.maxDrawdown) score += 10;
  if (criteria.maxVolatility !== undefined && metrics.volatility <= criteria.maxVolatility) score += 10;
  if (criteria.minSortino !== undefined && metrics.sortino >= criteria.minSortino) score += 10;
  return Math.min(100, score);
}

// Check if portfolio meets all filter criteria
function meetsFilterCriteria(metrics: RealMetrics, criteria: FilterCriteria): boolean {
  if (criteria.minCagr !== undefined && metrics.cagr < criteria.minCagr) return false;
  if (criteria.maxDrawdown !== undefined && metrics.maxDrawdown > criteria.maxDrawdown) return false;
  if (criteria.maxVolatility !== undefined && metrics.volatility > criteria.maxVolatility) return false;
  if (criteria.minSharpe !== undefined && metrics.sharpe < criteria.minSharpe) return false;
  if (criteria.minSortino !== undefined && metrics.sortino < criteria.minSortino) return false;
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMBINATION GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

function* combinations<T>(arr: T[], k: number): Generator<T[]> {
  if (k === 0) { yield []; return; }
  if (arr.length < k) return;

  function* backtrack(start: number, current: T[]): Generator<T[]> {
    if (current.length === k) { yield [...current]; return; }
    for (let i = start; i <= arr.length - (k - current.length); i++) {
      current.push(arr[i]);
      yield* backtrack(i + 1, current);
      current.pop();
    }
  }
  yield* backtrack(0, []);
}

// ═══════════════════════════════════════════════════════════════════════════════
// DIVERSITY HELPER
// ═══════════════════════════════════════════════════════════════════════════════

function createDiversePortfolioSet(
  portfolios: GeneratedPortfolio[],
  sortBy: string,
  sortDirection: string
): GeneratedPortfolio[] {
  const buckets: Record<string, GeneratedPortfolio[]> = {
    conservative: [], moderate: [], growth: [], aggressive: [],
  };

  for (const p of portfolios) buckets[p.riskProfile]?.push(p);

  const sortMultiplier = sortDirection === 'desc' ? -1 : 1;
  for (const key of Object.keys(buckets)) {
    buckets[key].sort((a, b) => {
      const aVal = sortBy === 'matchScore' ? a.matchScore : (a.metrics as any)[sortBy] ?? 0;
      const bVal = sortBy === 'matchScore' ? b.matchScore : (b.metrics as any)[sortBy] ?? 0;
      return (aVal - bVal) * sortMultiplier;
    });
  }

  const result: GeneratedPortfolio[] = [];
  const maxLen = Math.max(...Object.values(buckets).map(b => b.length));
  for (let i = 0; i < maxLen; i++) {
    for (const key of ['conservative', 'moderate', 'growth', 'aggressive']) {
      if (i < buckets[key].length) result.push(buckets[key][i]);
    }
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const body: RequestBody = await req.json();
    const {
      criteria = {},
      page = 1,
      pageSize = 20,
      sortBy = 'sharpe',
      sortDirection = 'desc',
      limit = 50000,
      useCache = true,
      refreshCache = false,
    } = body;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ═══════════════════════════════════════════════════════════════════════════
    // CHECK CACHE FIRST (unless refresh requested)
    // ═══════════════════════════════════════════════════════════════════════════
    if (useCache && !refreshCache) {
      const nowIso = new Date().toISOString();

      const applyCacheFilters = (q: any) => {
        let query = q.gt('expires_at', nowIso);

        if (criteria.riskProfiles?.length) {
          query = query.in('risk_profile', criteria.riskProfiles);
        }
        if (criteria.maxDrawdown !== undefined) {
          query = query.lte('max_drawdown', criteria.maxDrawdown);
        }
        if (criteria.maxVolatility !== undefined) {
          query = query.lte('volatility', criteria.maxVolatility);
        }
        if (criteria.minSharpe !== undefined) {
          query = query.gte('sharpe', criteria.minSharpe);
        }
        if (criteria.minCagr !== undefined) {
          query = query.gte('cagr', criteria.minCagr);
        }
        if (criteria.minSortino !== undefined) {
          query = query.gte('sortino', criteria.minSortino);
        }

        return query;
      };

      // Count matching cached portfolios (with filters)
      const { count: totalCount, error: countError } = await applyCacheFilters(
        supabase.from('screened_portfolios_cache').select('id', { count: 'exact', head: true })
      );

      if (!countError && (totalCount ?? 0) > 0) {
        console.log(`Using cached data: ${totalCount} portfolios (filtered)`);

        // Fetch current page
        let pageQuery = applyCacheFilters(
          supabase.from('screened_portfolios_cache').select('*')
        );

        // matchScore is criteria-dependent, so we can't sort it in SQL.
        // We approximate by sorting on sharpe when matchScore is requested.
        const sortColumn =
          sortBy === 'matchScore'
            ? 'sharpe'
            : sortBy === 'maxDrawdown'
              ? 'max_drawdown'
              : sortBy;

        pageQuery = pageQuery
          .order(sortColumn, { ascending: sortDirection === 'asc' })
          .range((page - 1) * pageSize, page * pageSize - 1);

        const { data: cachedPortfolios, error } = await pageQuery;

        if (!error && cachedPortfolios) {
          const portfolios: GeneratedPortfolio[] = cachedPortfolios.map((row: any) => ({
            id: row.id,
            name: row.name,
            family: row.family,
            tickers: row.tickers,
            weights: row.weights.map(Number),
            metrics: {
              cagr: Number(row.cagr),
              totalReturn: Number(row.total_return),
              volatility: Number(row.volatility),
              sharpe: Number(row.sharpe),
              sortino: Number(row.sortino),
              maxDrawdown: Number(row.max_drawdown),
              dataPoints: row.data_points,
            },
            riskProfile: row.risk_profile as GeneratedPortfolio['riskProfile'],
            matchScore: calculateMatchScore(
              {
                cagr: Number(row.cagr),
                totalReturn: Number(row.total_return),
                volatility: Number(row.volatility),
                sharpe: Number(row.sharpe),
                sortino: Number(row.sortino),
                maxDrawdown: Number(row.max_drawdown),
                dataPoints: row.data_points,
              },
              criteria
            ),
          }));

          return new Response(
            JSON.stringify({
              portfolios,
              totalCount: totalCount ?? portfolios.length,
              page,
              pageSize,
              totalPages: Math.ceil((totalCount ?? portfolios.length) / pageSize),
              generationTime: Date.now() - startTime,
              availableTickers: 0,
              fromCache: true,
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // GENERATE PORTFOLIOS ON-DEMAND
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('Generating portfolios on-demand...');

    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(endDate.getFullYear() - 1);
    const startDateStr = startDate.toISOString().split('T')[0];

    // ═══════════════════════════════════════════════════════════════════════════
    // DISCOVER ALL AVAILABLE TICKERS USING PAGINATION
    // ═══════════════════════════════════════════════════════════════════════════
    const discoveredTickers = new Set<string>();
    const PAGE_SIZE = 1000;
    const TARGET_TICKERS = 200; // Target number of unique tickers
    let offset = 0;
    const maxIterations = 50;
    
    for (let i = 0; i < maxIterations && discoveredTickers.size < TARGET_TICKERS; i++) {
      const { data: tickerRows, error: tickerError } = await supabase
        .from('market_daily_bars')
        .select('ticker')
        .gte('bar_date', startDateStr)
        .order('ticker', { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1);

      if (tickerError || !tickerRows || tickerRows.length === 0) break;

      for (const row of tickerRows) {
        if (row.ticker) discoveredTickers.add(row.ticker);
      }

      if (tickerRows.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }

    const availableTickers = [...discoveredTickers].sort();
    console.log(`Discovered ${availableTickers.length} unique tickers`);

    if (availableTickers.length === 0) {
      return new Response(JSON.stringify({
        portfolios: [],
        totalCount: 0,
        page, pageSize, totalPages: 0,
        generationTime: Date.now() - startTime,
        availableTickers: 0,
        fromCache: false,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // FETCH RETURNS FOR ALL TICKERS (CHUNKED + PAGINATED)
    // ═══════════════════════════════════════════════════════════════════════════
    const tickerData: Record<string, { date: string; ret: number }[]> = {};
    const TICKER_CHUNK_SIZE = 20;
    const DATA_PAGE_SIZE = 1000;

    for (let i = 0; i < availableTickers.length; i += TICKER_CHUNK_SIZE) {
      const tickerChunk = availableTickers.slice(i, i + TICKER_CHUNK_SIZE);
      let dataOffset = 0;
      let hasMore = true;

      while (hasMore) {
        const { data: rows, error: dataError } = await supabase
          .from('market_daily_bars')
          .select('ticker, bar_date, daily_return')
          .in('ticker', tickerChunk)
          .gte('bar_date', startDateStr)
          .order('bar_date', { ascending: true })
          .range(dataOffset, dataOffset + DATA_PAGE_SIZE - 1);

        if (dataError || !rows || rows.length === 0) {
          hasMore = false;
          break;
        }

        for (const row of rows) {
          if (!tickerData[row.ticker]) tickerData[row.ticker] = [];
          tickerData[row.ticker].push({ date: row.bar_date, ret: row.daily_return ?? 0 });
        }

        if (rows.length < DATA_PAGE_SIZE) {
          hasMore = false;
        } else {
          dataOffset += DATA_PAGE_SIZE;
        }
      }
    }

    const validTickers = Object.keys(tickerData).filter(t => tickerData[t].length >= 50);
    console.log(`Valid tickers with sufficient data: ${validTickers.length}`);

    // Generate portfolios
    const allPortfolios: GeneratedPortfolio[] = [];
    let portfolioCount = 0;

    // IMPORTANT: when caching is enabled we generate an unfiltered universe,
    // then apply criteria only when returning results. This avoids caching only
    // the first criteria the user happened to run.
    const filterDuringGeneration = !useCache;

    // 2-asset combinations
    for (const combo of combinations(validTickers, 2)) {
      if (portfolioCount >= limit) break;
      for (const weights of WEIGHT_SCHEMES[2]) {
        if (portfolioCount >= limit) break;

        const metrics = calculatePortfolioMetricsFromData(combo, weights, tickerData);
        if (!metrics) continue;

        const riskProfile = determineRiskProfile(combo);

        if (filterDuringGeneration) {
          if (!meetsFilterCriteria(metrics, criteria)) continue;
          if (criteria.riskProfiles?.length && !criteria.riskProfiles.includes(riskProfile)) continue;
        }

        const matchScore = calculateMatchScore(metrics, criteria);

        allPortfolios.push({
          id: `pair-${combo.join('-')}-${weights.join('-')}`,
          name: `Pair (${combo.join('/')})`,
          family: 'Cross-Ticker Pairs',
          tickers: combo,
          weights,
          metrics,
          riskProfile,
          matchScore,
        });
        portfolioCount++;
      }
    }

    // 3-asset combinations (limited for performance)
    const maxThreeAsset = Math.min(20000, limit - portfolioCount);
    let threeCount = 0;
    for (const combo of combinations(validTickers, 3)) {
      if (threeCount >= maxThreeAsset) break;
      for (const weights of WEIGHT_SCHEMES[3]) {
        if (threeCount >= maxThreeAsset) break;

        const metrics = calculatePortfolioMetricsFromData(combo, weights, tickerData);
        if (!metrics) continue;

        const riskProfile = determineRiskProfile(combo);

        if (filterDuringGeneration) {
          if (!meetsFilterCriteria(metrics, criteria)) continue;
          if (criteria.riskProfiles?.length && !criteria.riskProfiles.includes(riskProfile)) continue;
        }

        const matchScore = calculateMatchScore(metrics, criteria);

        allPortfolios.push({
          id: `trio-${combo.join('-')}-${weights.join('-')}`,
          name: `Trio (${combo.join('/')})`,
          family: 'Cross-Ticker Trios',
          tickers: combo,
          weights,
          metrics,
          riskProfile,
          matchScore,
        });
        threeCount++;
      }
    }

    console.log(`Generated ${allPortfolios.length} portfolios`);

    // Apply criteria on the *result set* (always), so UI filters are respected
    // even when cache generation is unfiltered.
    const filteredPortfolios = allPortfolios.filter((p) => {
      if (!meetsFilterCriteria(p.metrics, criteria)) return false;
      if (criteria.riskProfiles?.length && !criteria.riskProfiles.includes(p.riskProfile)) return false;
      return true;
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // SAVE TO CACHE (if refreshing or cache was empty)
    // ═══════════════════════════════════════════════════════════════════════════
    if (refreshCache || useCache) {
      console.log('Saving to cache...');

      // Clear old cache
      await supabase.from('screened_portfolios_cache').delete().lt('expires_at', new Date().toISOString());

      // Insert in batches
      const batchSize = 500;
      for (let i = 0; i < allPortfolios.length; i += batchSize) {
        const batch = allPortfolios.slice(i, i + batchSize).map(p => ({
          id: p.id,
          name: p.name,
          family: p.family,
          tickers: p.tickers,
          weights: p.weights,
          risk_profile: p.riskProfile,
          cagr: p.metrics.cagr,
          total_return: p.metrics.totalReturn,
          volatility: p.metrics.volatility,
          sharpe: p.metrics.sharpe,
          sortino: p.metrics.sortino,
          max_drawdown: p.metrics.maxDrawdown,
          data_points: p.metrics.dataPoints,
        }));

        await supabase.from('screened_portfolios_cache').upsert(batch, { onConflict: 'id' });
      }
      console.log('Cache updated');
    }

    // Apply diversity sorting (on filtered results)
    const diversePortfolios = createDiversePortfolioSet(filteredPortfolios, sortBy, sortDirection);

    // Paginate
    const totalCount = diversePortfolios.length,
      startIdx = (page - 1) * pageSize,
      paginatedPortfolios = diversePortfolios.slice(startIdx, startIdx + pageSize);

    return new Response(JSON.stringify({
      portfolios: paginatedPortfolios,
      totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
      generationTime: Date.now() - startTime,
      availableTickers: validTickers.length,
      fromCache: false,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Dynamic screener error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
      portfolios: [],
      totalCount: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0,
      generationTime: Date.now() - startTime,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// CALCULATE METRICS FROM TICKER DATA
// ═══════════════════════════════════════════════════════════════════════════════

function calculatePortfolioMetricsFromData(
  tickers: string[],
  weights: number[],
  tickerData: Record<string, { date: string; ret: number }[]>
): RealMetrics | null {
  const tickerDataArr = tickers.map(t => tickerData[t]).filter(Boolean);
  if (tickerDataArr.length !== tickers.length) return null;

  const dateSets = tickerDataArr.map(td => new Set(td.map(d => d.date)));
  const commonDates = [...dateSets[0]].filter(d => dateSets.every(s => s.has(d))).sort();

  if (commonDates.length < 20) return null;

  const dateToReturns: Record<string, number[]> = {};
  for (let i = 0; i < tickers.length; i++) {
    for (const row of tickerDataArr[i]) {
      if (!dateToReturns[row.date]) dateToReturns[row.date] = new Array(tickers.length).fill(0);
      dateToReturns[row.date][i] = row.ret;
    }
  }

  const portfolioReturns: number[] = [];
  for (const date of commonDates) {
    const tickerReturns = dateToReturns[date];
    if (!tickerReturns) continue;
    let dayReturn = 0;
    for (let i = 0; i < tickers.length; i++) {
      dayReturn += (weights[i] / 100) * (tickerReturns[i] ?? 0);
    }
    portfolioReturns.push(dayReturn);
  }

  return calculateMetrics(portfolioReturns);
}
