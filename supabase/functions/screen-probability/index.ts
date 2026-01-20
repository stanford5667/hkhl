import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScreenRequest {
  mode?: 'universe' | 'cross_study';

  // Universe screening
  minProbability?: number;
  maxProbability?: number;
  minExpectedReturn?: number | null;
  maxExpectedReturn?: number | null;
  minSampleSize?: number;
  eventTypes?: string[] | null;
  sectors?: string[] | null;
  marketCapTiers?: string[] | null;
  maxDaysUntilEvent?: number | null;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;

  // Cross-study screening
  studyCategories?: string[] | null;
  studyTypes?: string[] | null;
  
  // Enhanced filters
  onlyActiveSignals?: boolean;
  lookforwardDays?: number;
  minConfluence?: number | null;
  
  // NEW: Run real studies
  runRealStudies?: boolean;
}

// Study definitions matching the frontend - organized by category
const STUDY_BY_CATEGORY: Record<string, string[]> = {
  'conditional': ['after_down_x', 'after_up_x', 'after_consecutive_days', 'after_high_volume', 'after_gap', 'below_ma'],
  'basic': ['daily_close_gt_open', 'daily_close_gt_prior', 'daily_return_distribution', 'up_down_streaks'],
  'technical': ['rsi_analysis', 'moving_average_analysis', 'trend_strength', 'macd_analysis', 'bollinger_analysis', 'stochastic_analysis'],
  'volatility': ['volatility_analysis', 'drawdown_analysis', 'mean_reversion'],
  'patterns': ['gap_analysis', 'range_analysis', 'high_low_analysis', 'close_to_open_analysis'],
  'seasonality': ['day_of_week_returns', 'month_of_year_returns'],
  'volume': ['volume_analysis'],
  'projections': ['price_targets'],
};

// All study IDs flattened
const ALL_STUDY_IDS = Object.values(STUDY_BY_CATEGORY).flat();

// Default studies to run when nothing selected (most reliable ones)
const DEFAULT_STUDY_IDS = [
  'daily_close_gt_open',
  'daily_close_gt_prior', 
  'rsi_analysis',
  'moving_average_analysis',
  'after_down_x',
  'after_up_x',
  'gap_analysis',
  'volatility_analysis',
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: ScreenRequest = await req.json();
    console.log('Screen request:', JSON.stringify(body));

    const {
      mode = 'universe',
      minProbability = 50,
      maxProbability = 100,
      minExpectedReturn = null,
      maxExpectedReturn = null,
      minSampleSize = 5,
      eventTypes = null,
      sectors = null,
      marketCapTiers = null,
      maxDaysUntilEvent = null,
      sortBy = 'probability_score',
      sortOrder = 'DESC',
      limit = 50,
      offset = 0,
      studyCategories = null,
      studyTypes = null,
      onlyActiveSignals = false,
      lookforwardDays = 5,
      minConfluence = null,
      runRealStudies = true,
    } = body;

    // -------------------------------------------------
    // Cross-study screening - Run REAL studies
    // -------------------------------------------------
    if (mode === 'cross_study') {
      console.log('Running cross-study screen with real studies');
      console.log(`Filters: minProb=${minProbability}, maxProb=${maxProbability}, minSample=${minSampleSize}, categories=${studyCategories?.join(',') || 'all'}`);
      
      // Get tickers from universe
      const tickers = await getScreeningTickers(supabase, sectors, marketCapTiers, Math.min(limit * 2, 30));
      console.log(`Got ${tickers.length} tickers for screening`);
      
      if (tickers.length === 0) {
        return new Response(
          JSON.stringify({ results: [], totalCount: 0, source: 'empty' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Determine which studies to run based on filters
      let selectedStudies: string[] = [];
      
      if (studyTypes?.length) {
        // Specific study types requested
        selectedStudies = studyTypes;
      } else if (studyCategories?.length) {
        // Map categories to study IDs
        selectedStudies = studyCategories.flatMap(cat => STUDY_BY_CATEGORY[cat] || []);
      } else {
        // Default: run the most reliable studies
        selectedStudies = DEFAULT_STUDY_IDS;
      }
      
      console.log(`Running ${selectedStudies.length} studies: ${selectedStudies.join(', ')}`);
      
      // Run real studies for each ticker and collect results
      const results = await runRealStudiesForTickers(
        supabaseUrl,
        supabaseServiceKey,
        tickers,
        selectedStudies,
        {
          minProbability,
          maxProbability,
          minExpectedReturn,
          maxExpectedReturn,
          minSampleSize,
          lookforwardDays,
          onlyActiveSignals,
        }
      );

      // Sort results
      const ascending = sortOrder === 'ASC';
      results.sort((a, b) => {
        const va = a[sortBy as keyof typeof a] ?? 0;
        const vb = b[sortBy as keyof typeof b] ?? 0;
        return ascending ? Number(va) - Number(vb) : Number(vb) - Number(va);
      });

      const finalResults = results.slice(0, limit);
      console.log(`Returning ${finalResults.length} real study results`);

      return new Response(
        JSON.stringify({
          results: finalResults,
          totalCount: finalResults.length,
          source: 'real_studies',
          filters: body,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try to use the database function first
    const { data: funcResults, error: funcError } = await supabase.rpc('screen_universe', {
      min_probability: minProbability,
      max_probability: maxProbability,
      min_expected_return: minExpectedReturn,
      max_expected_return: maxExpectedReturn,
      min_sample_size: minSampleSize,
      event_types: eventTypes,
      sectors: sectors,
      market_cap_tiers: marketCapTiers,
      max_days_until_event: maxDaysUntilEvent,
      sort_by: sortBy,
      sort_order: sortOrder,
      result_limit: limit,
      result_offset: offset,
    });

    if (!funcError && funcResults && funcResults.length > 0) {
      console.log(`Database function returned ${funcResults.length} results`);
      return new Response(
        JSON.stringify({
          results: funcResults,
          totalCount: funcResults.length,
          source: 'database',
          filters: body,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fallback: Direct query if function returns no results
    console.log('Database function returned no results, using direct query');
    
    let query = supabase
      .from('universe_probability_scores')
      .select(`
        symbol,
        event_type,
        probability_score,
        expected_return,
        sample_size,
        win_rate,
        avg_gain,
        avg_loss,
        days_until_event,
        next_event_date,
        confidence_level,
        ticker_universe!inner (
          name,
          sector,
          market_cap_tier,
          is_active
        )
      `)
      .gte('probability_score', minProbability)
      .lte('probability_score', maxProbability)
      .gte('sample_size', minSampleSize)
      .eq('ticker_universe.is_active', true);

    if (minExpectedReturn !== null) {
      query = query.gte('expected_return', minExpectedReturn);
    }
    if (maxExpectedReturn !== null) {
      query = query.lte('expected_return', maxExpectedReturn);
    }
    if (eventTypes && eventTypes.length > 0) {
      query = query.in('event_type', eventTypes);
    }
    if (maxDaysUntilEvent !== null) {
      query = query.lte('days_until_event', maxDaysUntilEvent);
    }

    // Sorting
    const order = sortOrder === 'ASC';
    query = query.order(sortBy, { ascending: order }).limit(limit);

    const { data: directResults, error: directError } = await query;

    if (directError) {
      console.error('Direct query error:', directError);
      
      // If no data exists, generate demo data
      console.log('Generating demo data for empty database');
      const demoResults = generateDemoResults(minProbability, limit, eventTypes, sectors, maxDaysUntilEvent);
      
      return new Response(
        JSON.stringify({
          results: demoResults,
          totalCount: demoResults.length,
          source: 'demo',
          filters: body,
          note: 'Demo data - sync universe to get real results',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Transform results to flatten the structure
    const transformedResults = (directResults || []).map((r: any) => ({
      symbol: r.symbol,
      name: r.ticker_universe?.name || r.symbol,
      sector: r.ticker_universe?.sector || null,
      market_cap_tier: r.ticker_universe?.market_cap_tier || null,
      event_type: r.event_type,
      probability_score: r.probability_score,
      expected_return: r.expected_return,
      sample_size: r.sample_size,
      win_rate: r.win_rate,
      avg_gain: r.avg_gain,
      avg_loss: r.avg_loss,
      days_until_event: r.days_until_event,
      next_event_date: r.next_event_date,
      confidence_level: r.confidence_level,
    }));

    // Apply sector/market cap filters if needed
    let filteredResults = transformedResults;
    if (sectors && sectors.length > 0) {
      filteredResults = filteredResults.filter((r: any) => sectors.includes(r.sector));
    }
    if (marketCapTiers && marketCapTiers.length > 0) {
      filteredResults = filteredResults.filter((r: any) => marketCapTiers.includes(r.market_cap_tier));
    }

    if (filteredResults.length === 0) {
      console.log('No results found, returning demo data');
      const demoResults = generateDemoResults(minProbability, limit, eventTypes, sectors, maxDaysUntilEvent);
      return new Response(
        JSON.stringify({
          results: demoResults,
          totalCount: demoResults.length,
          source: 'demo',
          filters: body,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Returning ${filteredResults.length} results`);
    return new Response(
      JSON.stringify({
        results: filteredResults,
        totalCount: filteredResults.length,
        source: 'database',
        filters: body,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Screen probability error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: 'Failed to screen universe',
        details: errorMessage,
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// ============================================================
// HELPER FUNCTIONS FOR REAL STUDY EXECUTION
// ============================================================

interface TickerInfo {
  ticker: string;
  name: string | null;
  sector: string | null;
  market_cap_tier: string | null;
}

interface ScreenerResult {
  symbol: string;
  name: string;
  sector: string | null;
  market_cap_tier: string | null;
  study_id: string;
  study_name: string;
  study_category: string;
  probability_score: number;
  expected_return: number;
  sample_size: number;
  win_rate: number;
  avg_gain: number;
  avg_loss: number;
  confidence_level: string;
  signal_active: boolean;
  last_signal_date: string | null;
  movement_probabilities?: any;
}

// Get tickers for screening from asset_universe
async function getScreeningTickers(
  supabase: any,
  sectors: string[] | null,
  marketCapTiers: string[] | null,
  limit: number
): Promise<TickerInfo[]> {
  let query = supabase
    .from('asset_universe')
    .select('ticker, name, sector, market_cap_tier')
    .eq('is_active', true)
    .limit(limit);

  if (sectors?.length) {
    query = query.in('sector', sectors);
  }
  if (marketCapTiers?.length) {
    query = query.in('market_cap_tier', marketCapTiers);
  }

  const { data, error } = await query;

  if (error || !data?.length) {
    // Fallback to hardcoded list
    return [
      { ticker: 'AAPL', name: 'Apple Inc.', sector: 'Technology', market_cap_tier: 'mega' },
      { ticker: 'MSFT', name: 'Microsoft Corp.', sector: 'Technology', market_cap_tier: 'mega' },
      { ticker: 'GOOGL', name: 'Alphabet Inc.', sector: 'Communication Services', market_cap_tier: 'mega' },
      { ticker: 'AMZN', name: 'Amazon.com Inc.', sector: 'Consumer Cyclical', market_cap_tier: 'mega' },
      { ticker: 'NVDA', name: 'NVIDIA Corp.', sector: 'Technology', market_cap_tier: 'mega' },
      { ticker: 'META', name: 'Meta Platforms Inc.', sector: 'Communication Services', market_cap_tier: 'mega' },
      { ticker: 'TSLA', name: 'Tesla Inc.', sector: 'Consumer Cyclical', market_cap_tier: 'mega' },
      { ticker: 'JPM', name: 'JPMorgan Chase', sector: 'Financial Services', market_cap_tier: 'mega' },
    ].slice(0, limit);
  }

  return data.map((r: any) => ({
    ticker: r.ticker,
    name: r.name || r.ticker,
    sector: r.sector || null,
    market_cap_tier: r.market_cap_tier || null,
  }));
}

// Run real studies for each ticker by calling the run-asset-study function
async function runRealStudiesForTickers(
  supabaseUrl: string,
  supabaseServiceKey: string,
  tickers: TickerInfo[],
  studyTypes: string[],
  filters: {
    minProbability: number;
    maxProbability: number;
    minExpectedReturn: number | null;
    maxExpectedReturn: number | null;
    minSampleSize: number;
    lookforwardDays: number;
    onlyActiveSignals: boolean;
  }
): Promise<ScreenerResult[]> {
  const results: ScreenerResult[] = [];
  const endDate = new Date().toISOString().split('T')[0];
  // Match Quant Lab's 3-year default to ensure studies have sufficient data
  const startDate = new Date(Date.now() - 756 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 756 trading days (~3 years)

  // Process tickers in parallel batches
  const batchSize = 5;
  for (let i = 0; i < tickers.length; i += batchSize) {
    const batch = tickers.slice(i, i + batchSize);
    
    const batchPromises = batch.flatMap(ticker => 
      studyTypes.map(async studyType => {
        try {
          const response = await fetch(`${supabaseUrl}/functions/v1/run-asset-study`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ticker: ticker.ticker,
              studyType,
              startDate,
              endDate,
              // IMPORTANT: match Quant Lab default params + forwardDays behavior
              params: getStudyParams(studyType, filters.lookforwardDays),
            }),
          });

          if (!response.ok) {
            console.error(`Study failed for ${ticker.ticker}/${studyType}: ${response.status}`);
            return null;
          }

          const data = await response.json();
          const result = data.result;
          const movementProbs = data.movementProbabilities;
          
          // Extract STUDY-SPECIFIC probability (not generic forward movement)
          const studyMetrics = extractStudyProbability(studyType, result, filters.lookforwardDays);
          
          if (!studyMetrics) {
            // Fallback to movement probabilities if study doesn't have specific metrics
            const horizonKey =
              filters.lookforwardDays === 1 ? 'days1' :
              filters.lookforwardDays <= 5 ? 'days5' :
              filters.lookforwardDays <= 10 ? 'days10' : 'days21';
            
            const probData = movementProbs?.[horizonKey];
            if (!probData) {
              console.log(`No probability data for ${ticker.ticker}/${studyType}`);
              return null;
            }
            
            // Use general movement probability as fallback
            const probabilityScore = probData.overallUpProbability ?? 50;
            const expectedReturn = probData.expectedMove ?? 0;
            const sampleSize = probData.sampleSize ?? 0;
            
            console.log(`${ticker.ticker}/${studyType} (fallback): prob=${probabilityScore.toFixed(1)}%, exp=${expectedReturn.toFixed(2)}%, sample=${sampleSize}`);
            
            if (probabilityScore < filters.minProbability || probabilityScore > filters.maxProbability) return null;
            if (sampleSize < filters.minSampleSize) return null;
            if (filters.minExpectedReturn !== null && expectedReturn < filters.minExpectedReturn) return null;
            
            const signalActive = checkIfSignalActive(studyType, result ?? data);
            if (filters.onlyActiveSignals && !signalActive) return null;
            
            return {
              symbol: ticker.ticker,
              name: ticker.name || ticker.ticker,
              sector: ticker.sector,
              market_cap_tier: ticker.market_cap_tier,
              study_id: studyType,
              study_name: getStudyName(studyType),
              study_category: getStudyCategory(studyType),
              probability_score: probabilityScore,
              expected_return: expectedReturn,
              sample_size: sampleSize,
              win_rate: probabilityScore,
              avg_gain: probData.thresholds?.[0]?.avgMoveWhenUp || expectedReturn,
              avg_loss: -(probData.thresholds?.[0]?.avgMoveWhenDown || Math.abs(expectedReturn)),
              confidence_level: sampleSize >= 250 ? 'high' : sampleSize >= 100 ? 'medium' : 'low',
              signal_active: signalActive,
              last_signal_date: new Date().toISOString(),
              movement_probabilities: movementProbs,
            } as ScreenerResult;
          }
          
          // Use study-specific probability
          const { probabilityScore, expectedReturn, sampleSize, signalActive: studySignalActive } = studyMetrics;
          
          console.log(`${ticker.ticker}/${studyType} (study-specific): prob=${probabilityScore.toFixed(1)}%, exp=${expectedReturn.toFixed(2)}%, sample=${sampleSize}`);
          
          // Apply filters
          if (probabilityScore < filters.minProbability || probabilityScore > filters.maxProbability) {
            console.log(`  -> FILTERED: prob ${probabilityScore.toFixed(1)} not in [${filters.minProbability}, ${filters.maxProbability}]`);
            return null;
          }
          if (sampleSize < filters.minSampleSize) {
            console.log(`  -> FILTERED: sample ${sampleSize} < ${filters.minSampleSize}`);
            return null;
          }
          if (filters.minExpectedReturn !== null && expectedReturn < filters.minExpectedReturn) {
            console.log(`  -> FILTERED: exp return ${expectedReturn.toFixed(2)} < ${filters.minExpectedReturn}`);
            return null;
          }
          if (filters.maxExpectedReturn !== null && expectedReturn > filters.maxExpectedReturn) {
            return null;
          }
          
          if (filters.onlyActiveSignals && !studySignalActive) {
            console.log(`  -> FILTERED: signal not active`);
            return null;
          }
          
          console.log(`  -> PASSED: ${ticker.ticker}/${studyType}`);

          return {
            symbol: ticker.ticker,
            name: ticker.name || ticker.ticker,
            sector: ticker.sector,
            market_cap_tier: ticker.market_cap_tier,
            study_id: studyType,
            study_name: getStudyName(studyType),
            study_category: getStudyCategory(studyType),
            probability_score: probabilityScore,
            expected_return: expectedReturn,
            sample_size: sampleSize,
            win_rate: probabilityScore,
            avg_gain: expectedReturn > 0 ? expectedReturn : 0,
            avg_loss: expectedReturn < 0 ? expectedReturn : 0,
            confidence_level: sampleSize >= 250 ? 'high' : sampleSize >= 100 ? 'medium' : 'low',
            signal_active: studySignalActive,
            last_signal_date: new Date().toISOString(),
            movement_probabilities: movementProbs,
          } as ScreenerResult;
        } catch (err) {
          console.error(`Error running study for ${ticker.ticker}/${studyType}:`, err);
          return null;
        }
      })
    );

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults.filter((r): r is ScreenerResult => r !== null));
  }

  return results;
}

// Extract study-specific probability metrics from the result
// This is the KEY function that gets the actual study win rate, not just general price movement
interface StudyMetrics {
  probabilityScore: number;
  expectedReturn: number;
  sampleSize: number;
  signalActive: boolean;
}

function extractStudyProbability(studyType: string, result: any, lookforwardDays: number): StudyMetrics | null {
  if (!result) return null;
  
  // Handle conditional studies with analysis array (after_down_x, after_up_x, etc.)
  if (result.analysis && Array.isArray(result.analysis)) {
    // Find the analysis entry matching the lookforward days
    const matchingAnalysis = result.analysis.find((a: any) => a.days === lookforwardDays) 
      || result.analysis.find((a: any) => a.days <= lookforwardDays)
      || result.analysis[0];
    
    if (matchingAnalysis && matchingAnalysis.occurrences >= 5) {
      return {
        probabilityScore: matchingAnalysis.winRate || 0,
        expectedReturn: matchingAnalysis.avgReturn || 0,
        sampleSize: matchingAnalysis.occurrences || 0,
        signalActive: result.totalOccurrences > 0,
      };
    }
  }
  
  // Handle basic percentage studies (daily_close_gt_open, daily_close_gt_prior)
  if (result.percentage !== undefined && result.total_days) {
    return {
      probabilityScore: result.percentage,
      expectedReturn: result.avgReturn || result.avgUpReturn || 0,
      sampleSize: result.total_days,
      signalActive: false, // Basic stats don't have active signals
    };
  }
  
  // Handle RSI analysis - return the more favorable condition
  if (result.afterOversold || result.afterOverbought) {
    const oversold = result.afterOversold;
    const overbought = result.afterOverbought;
    
    // Pick the one with higher hit rate
    if (oversold?.count >= 5 && (!overbought || oversold.hitRate >= (overbought?.hitRate || 0))) {
      return {
        probabilityScore: oversold.hitRate || 0,
        expectedReturn: oversold.avgReturn || 0,
        sampleSize: oversold.count,
        signalActive: result.current < 30,
      };
    }
    if (overbought?.count >= 5) {
      return {
        probabilityScore: overbought.hitRate || 0,
        expectedReturn: overbought.avgReturn || 0,
        sampleSize: overbought.count,
        signalActive: result.current > 70,
      };
    }
  }
  
  // Handle moving average analysis
  if (result.maStats) {
    const stats = result.maStats;
    if (stats.aboveMA?.count >= 5) {
      return {
        probabilityScore: stats.aboveMA.winRate || 0,
        expectedReturn: stats.aboveMA.avgReturn || 0,
        sampleSize: stats.aboveMA.count,
        signalActive: result.currentStatus?.includes('above') || false,
      };
    }
  }
  
  // Handle gap analysis
  if (result.gapUp || result.gapDown) {
    const gapUp = result.gapUp;
    const gapDown = result.gapDown;
    
    if (gapUp?.count >= 5 && (!gapDown || gapUp.fillRate >= (gapDown?.fillRate || 0))) {
      return {
        probabilityScore: gapUp.fillRate || 0,
        expectedReturn: gapUp.avgReturn || 0,
        sampleSize: gapUp.count,
        signalActive: false,
      };
    }
    if (gapDown?.count >= 5) {
      return {
        probabilityScore: gapDown.fillRate || 0,
        expectedReturn: gapDown.avgReturn || 0,
        sampleSize: gapDown.count,
        signalActive: false,
      };
    }
  }
  
  // Handle volatility analysis
  if (result.volatilityStats) {
    const stats = result.volatilityStats;
    if (stats.highVolDays?.count >= 5) {
      return {
        probabilityScore: stats.highVolDays.winRate || 0,
        expectedReturn: stats.highVolDays.avgReturn || 0,
        sampleSize: stats.highVolDays.count,
        signalActive: result.currentVolatility === 'high',
      };
    }
  }
  
  // No study-specific metrics found
  return null;
}

// Get default params for each study type (match Quant Lab defaults)
function getStudyParams(studyType: string, lookforwardDays: number): Record<string, any> {
  // Quant Lab stores forwardDays as a single value (e.g. "5") but sends an ARRAY to the backend.
  const allPeriods = [1, 3, 5, 10, 21, 63, 126, 252];
  const fd = Number.isFinite(lookforwardDays) ? Number(lookforwardDays) : 5;
  const forwardDays = [...new Set(allPeriods.filter(p => p <= fd || p === 1 || p === fd))].sort((a, b) => a - b);

  switch (studyType) {
    // Conditional
    case 'after_down_x':
      return { threshold: 2, direction: 'down', forwardDays };
    case 'after_up_x':
      return { threshold: 2, direction: 'up', forwardDays };
    case 'after_consecutive_days':
      return { days: 3, direction: 'down', forwardDays };
    case 'after_high_volume':
      return { multiplier: 2, avgPeriod: 20, forwardDays };
    case 'after_gap':
      return { minGap: 1, forwardDays };
    case 'below_ma':
      return { maPeriod: 50, threshold: 5, forwardDays };

    // Technical
    case 'rsi_analysis':
      return { period: 14, forwardDays };
    case 'moving_average_analysis':
      return { shortPeriod: 20, mediumPeriod: 50, longPeriod: 200, forwardDays };

    default:
      return { forwardDays };
  }
}

// Check if signal is currently active
function checkIfSignalActive(studyType: string, data: any): boolean {
  switch (studyType) {
    case 'rsi_analysis':
      return (data.current < 30 || data.current > 70);
    case 'moving_average_analysis':
      return data.currentStatus?.includes('bullish') || data.currentStatus?.includes('bearish');
    case 'trend_strength':
      return Math.abs(data.score || 0) > 50;
    case 'after_down_x':
    case 'after_up_x':
      return data.totalOccurrences > 0 && data.analysis?.length > 0;
    default:
      return false;
  }
}

// Get human-readable study name
function getStudyName(studyType: string): string {
  const names: Record<string, string> = {
    'daily_close_gt_open': 'Intraday Direction',
    'daily_close_gt_prior': 'Daily Win Rate',
    'rsi_analysis': 'RSI Analysis',
    'moving_average_analysis': 'Moving Averages',
    'trend_strength': 'Trend Strength',
    'volatility_analysis': 'Volatility Profile',
    'drawdown_analysis': 'Drawdown Analysis',
    'mean_reversion': 'Mean Reversion',
    'gap_analysis': 'Gap Analysis',
    'after_down_x': 'After Down X%',
    'after_up_x': 'After Up X%',
  };
  return names[studyType] || studyType;
}

// Get study category
function getStudyCategory(studyType: string): string {
  const categories: Record<string, string> = {
    'daily_close_gt_open': 'basic',
    'daily_close_gt_prior': 'basic',
    'rsi_analysis': 'technical',
    'moving_average_analysis': 'technical',
    'trend_strength': 'technical',
    'volatility_analysis': 'volatility',
    'drawdown_analysis': 'volatility',
    'mean_reversion': 'volatility',
    'gap_analysis': 'patterns',
    'after_down_x': 'conditional',
    'after_up_x': 'conditional',
  };
  return categories[studyType] || 'basic';
}

// Generate demo results when database is empty
function generateDemoResults(
  minProbability: number,
  limit: number,
  eventTypes: string[] | null,
  sectors: string[] | null,
  maxDays: number | null
): any[] {
  const demoStocks = [
    { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology', mcap: 'mega' },
    { symbol: 'MSFT', name: 'Microsoft Corp.', sector: 'Technology', mcap: 'mega' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', sector: 'Communication Services', mcap: 'mega' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', sector: 'Consumer Cyclical', mcap: 'mega' },
    { symbol: 'NVDA', name: 'NVIDIA Corp.', sector: 'Technology', mcap: 'mega' },
    { symbol: 'META', name: 'Meta Platforms Inc.', sector: 'Communication Services', mcap: 'mega' },
    { symbol: 'TSLA', name: 'Tesla Inc.', sector: 'Consumer Cyclical', mcap: 'mega' },
    { symbol: 'JPM', name: 'JPMorgan Chase', sector: 'Financial Services', mcap: 'mega' },
    { symbol: 'V', name: 'Visa Inc.', sector: 'Financial Services', mcap: 'mega' },
    { symbol: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare', mcap: 'mega' },
    { symbol: 'UNH', name: 'UnitedHealth Group', sector: 'Healthcare', mcap: 'mega' },
    { symbol: 'PG', name: 'Procter & Gamble', sector: 'Consumer Defensive', mcap: 'mega' },
    { symbol: 'XOM', name: 'Exxon Mobil', sector: 'Energy', mcap: 'mega' },
    { symbol: 'CVX', name: 'Chevron Corp.', sector: 'Energy', mcap: 'large' },
    { symbol: 'HD', name: 'Home Depot', sector: 'Consumer Cyclical', mcap: 'large' },
    { symbol: 'PFE', name: 'Pfizer Inc.', sector: 'Healthcare', mcap: 'large' },
    { symbol: 'ABBV', name: 'AbbVie Inc.', sector: 'Healthcare', mcap: 'large' },
    { symbol: 'KO', name: 'Coca-Cola Co.', sector: 'Consumer Defensive', mcap: 'large' },
    { symbol: 'PEP', name: 'PepsiCo Inc.', sector: 'Consumer Defensive', mcap: 'large' },
    { symbol: 'MRK', name: 'Merck & Co.', sector: 'Healthcare', mcap: 'large' },
    { symbol: 'COST', name: 'Costco Wholesale', sector: 'Consumer Defensive', mcap: 'large' },
    { symbol: 'DIS', name: 'Walt Disney Co.', sector: 'Communication Services', mcap: 'large' },
    { symbol: 'NFLX', name: 'Netflix Inc.', sector: 'Communication Services', mcap: 'large' },
    { symbol: 'AMD', name: 'Advanced Micro Devices', sector: 'Technology', mcap: 'large' },
    { symbol: 'INTC', name: 'Intel Corp.', sector: 'Technology', mcap: 'large' },
    { symbol: 'CRM', name: 'Salesforce Inc.', sector: 'Technology', mcap: 'large' },
    { symbol: 'ORCL', name: 'Oracle Corp.', sector: 'Technology', mcap: 'large' },
    { symbol: 'BA', name: 'Boeing Co.', sector: 'Industrials', mcap: 'large' },
    { symbol: 'CAT', name: 'Caterpillar Inc.', sector: 'Industrials', mcap: 'large' },
    { symbol: 'GE', name: 'General Electric', sector: 'Industrials', mcap: 'large' },
  ];

  const events = eventTypes && eventTypes.length > 0 
    ? eventTypes 
    : ['earnings', 'dividend', 'fomc'];

  const results = [];
  const usedSymbols = new Set();

  for (let i = 0; i < Math.min(limit, demoStocks.length * events.length); i++) {
    const stock = demoStocks[i % demoStocks.length];
    const event = events[Math.floor(i / demoStocks.length) % events.length];
    const key = `${stock.symbol}-${event}`;

    if (usedSymbols.has(key)) continue;
    usedSymbols.add(key);

    // Skip if sector filter doesn't match
    if (sectors && sectors.length > 0 && !sectors.includes(stock.sector)) continue;

    // Generate deterministic but varied values
    const hash = (stock.symbol.charCodeAt(0) * 17 + event.charCodeAt(0) * 31) % 100;
    const probability = Math.max(minProbability, Math.min(95, 65 + (hash % 30)));
    const expectedReturn = (2 + (hash % 80) / 10).toFixed(2);
    const winRate = Math.min(probability + 5, 95);
    const sampleSize = 10 + (hash % 40);
    const daysUntil = maxDays ? Math.min(maxDays, 1 + (hash % 14)) : 1 + (hash % 30);
    const avgGain = (3 + (hash % 50) / 10).toFixed(1);
    const avgLoss = (-1 - (hash % 30) / 10).toFixed(1);

    results.push({
      symbol: stock.symbol,
      name: stock.name,
      sector: stock.sector,
      market_cap_tier: stock.mcap,
      event_type: event,
      probability_score: probability,
      expected_return: parseFloat(expectedReturn),
      sample_size: sampleSize,
      win_rate: winRate,
      avg_gain: parseFloat(avgGain),
      avg_loss: parseFloat(avgLoss),
      days_until_event: daysUntil,
      next_event_date: new Date(Date.now() + daysUntil * 86400000).toISOString().split('T')[0],
      confidence_level: sampleSize >= 25 ? 'high' : sampleSize >= 15 ? 'medium' : 'low',
    });
  }

  // Sort by probability
  results.sort((a, b) => b.probability_score - a.probability_score);

  return results.slice(0, limit);
}

type CrossStudyOptions = {
  minProbability: number;
  maxProbability: number;
  minExpectedReturn: number | null;
  maxExpectedReturn: number | null;
  minSampleSize: number;
  sectors: string[] | null;
  marketCapTiers: string[] | null;
  sortBy: string;
  sortOrder: 'ASC' | 'DESC';
  limit: number;
  offset: number;
  studyCategories: string[] | null;
  studyTypes: string[] | null;
  onlyActiveSignals?: boolean;
  lookforwardDays?: number | null;
  minConfluence?: number | null;
};

// Query real study probability scores from database
async function queryRealStudyProbabilities(supabase: any, opts: CrossStudyOptions) {
  const {
    minProbability, maxProbability, minExpectedReturn, maxExpectedReturn,
    minSampleSize, sectors, marketCapTiers, sortBy, sortOrder, limit,
    studyCategories, studyTypes, onlyActiveSignals, lookforwardDays, minConfluence,
  } = opts;

  try {
    // Use the database function if available
    const { data, error } = await supabase.rpc('screen_study_probabilities', {
      min_probability: minProbability,
      max_probability: maxProbability,
      min_expected_return: minExpectedReturn,
      max_expected_return: maxExpectedReturn,
      min_sample_size: minSampleSize,
      study_categories: studyCategories,
      study_types: studyTypes,
      sectors: sectors,
      market_cap_tiers: marketCapTiers,
      only_active_signals: onlyActiveSignals || false,
      lookforward_days_filter: lookforwardDays,
      sort_by: sortBy,
      sort_order: sortOrder,
      result_limit: limit,
      result_offset: 0,
    });

    if (error) {
      console.error('RPC error:', error);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    // If minConfluence is set, filter for tickers with multiple studies
    if (minConfluence && minConfluence > 1) {
      const { data: confluenceData } = await supabase.rpc('analyze_study_confluence', {
        min_probability: minProbability,
        lookforward_days_filter: lookforwardDays || 5,
        only_active_signals: onlyActiveSignals || false,
      });

      if (confluenceData) {
        const highConfluenceTickers = new Set(
          confluenceData.filter((c: any) => c.study_count >= minConfluence).map((c: any) => c.ticker)
        );
        return data.filter((r: any) => highConfluenceTickers.has(r.ticker));
      }
    }

    return data;
  } catch (err) {
    console.error('Query error:', err);
    return null;
  }
}

// Cross-study results generator.
// IMPORTANT: We generate deterministic "synthetic" probabilities per (ticker, study_id)
// until a dedicated cross-study scores table exists.
async function generateCrossStudyResults(supabase: any, opts: CrossStudyOptions) {
  const {
    minProbability,
    maxProbability,
    minExpectedReturn,
    maxExpectedReturn,
    minSampleSize,
    sectors,
    marketCapTiers,
    sortBy,
    sortOrder,
    limit,
    offset,
    studyTypes,
  } = opts;

  // Study IDs must match Quant Lab STUDY_DEFINITIONS ids.
  const fallbackStudyIds = [
    'daily_close_gt_open',
    'daily_close_gt_prior',
    'daily_return_distribution',
    'up_down_streaks',
    'day_of_week_returns',
    'month_of_year_returns',
    'rsi_analysis',
    'moving_average_analysis',
    'trend_strength',
    'macd_analysis',
    'bollinger_analysis',
    'stochastic_analysis',
    'volatility_analysis',
    'drawdown_analysis',
    'mean_reversion',
    'gap_analysis',
    'range_analysis',
    'high_low_analysis',
    'close_to_open_analysis',
    'volume_analysis',
    'price_targets',
    'after_down_x',
    'after_up_x',
    'after_consecutive_days',
    'after_high_volume',
    'after_gap',
    'below_ma',
  ];

  const selectedStudyIds = (studyTypes && studyTypes.length > 0 ? studyTypes : fallbackStudyIds).filter(Boolean);

  // Pull a small universe slice (fast + predictable) and then generate cross-product results.
  // Prefer asset_universe if present; fall back to ticker_universe (older) and then hardcoded.
  let tickers: Array<{ ticker: string; name?: string | null; sector?: string | null; market_cap_tier?: string | null }> = [];

  // Try asset_universe (already exists in this backend)
  const { data: assetUniverse, error: assetUniverseError } = await supabase
    .from('asset_universe')
    .select('ticker,name,sector,market_cap_tier,is_active')
    .eq('is_active', true)
    .limit(250);

  if (!assetUniverseError && assetUniverse?.length) {
    tickers = assetUniverse.map((r: any) => ({
      ticker: r.ticker,
      name: r.name ?? null,
      sector: r.sector ?? null,
      market_cap_tier: r.market_cap_tier ?? null,
    }));
  } else {
    // Try ticker_universe (if present)
    const { data: tickerUniverse } = await supabase
      .from('ticker_universe')
      .select('symbol,name,sector,market_cap_tier,is_active')
      .eq('is_active', true)
      .limit(250);

    if (tickerUniverse?.length) {
      tickers = tickerUniverse.map((r: any) => ({
        ticker: r.symbol,
        name: r.name ?? null,
        sector: r.sector ?? null,
        market_cap_tier: r.market_cap_tier ?? null,
      }));
    }
  }

  if (!tickers.length) {
    tickers = [
      { ticker: 'AAPL', name: 'Apple Inc.', sector: 'Technology', market_cap_tier: 'mega' },
      { ticker: 'MSFT', name: 'Microsoft', sector: 'Technology', market_cap_tier: 'mega' },
      { ticker: 'NVDA', name: 'NVIDIA', sector: 'Technology', market_cap_tier: 'mega' },
      { ticker: 'META', name: 'Meta Platforms', sector: 'Communication Services', market_cap_tier: 'mega' },
      { ticker: 'AMZN', name: 'Amazon', sector: 'Consumer Cyclical', market_cap_tier: 'mega' },
    ];
  }

  // Apply optional filters
  if (sectors && sectors.length > 0) {
    tickers = tickers.filter(t => t.sector && sectors.includes(t.sector));
  }
  if (marketCapTiers && marketCapTiers.length > 0) {
    tickers = tickers.filter(t => t.market_cap_tier && marketCapTiers.includes(t.market_cap_tier));
  }

  const results: any[] = [];

  // Generate scores per ticker x a few studies (cap for perf)
  const studiesPerTicker = Math.min(6, selectedStudyIds.length);

  for (const t of tickers) {
    const baseHash = hashToInt(`${t.ticker}`);

    // deterministically pick a window of studies for each ticker
    for (let i = 0; i < studiesPerTicker; i++) {
      const idx = (baseHash + i * 13) % selectedStudyIds.length;
      const studyId = selectedStudyIds[idx];

      const h = hashToInt(`${t.ticker}:${studyId}`);
      const prob = clamp(55 + (h % 45), minProbability, maxProbability);
      const expectedReturn = round2((-1 + ((h % 160) / 10)) as number); // -1% to +15%
      const sampleSize = 5 + (h % 70);
      const winRate = clamp(prob - (h % 6), 0, 100);
      const avgGain = round2(1 + ((h % 80) / 10));
      const avgLoss = round2(-(0.5 + ((h % 35) / 10)));

      // Filter
      if (prob < minProbability || prob > maxProbability) continue;
      if (sampleSize < minSampleSize) continue;
      if (minExpectedReturn !== null && expectedReturn < minExpectedReturn) continue;
      if (maxExpectedReturn !== null && expectedReturn > maxExpectedReturn) continue;

      results.push({
        symbol: t.ticker,
        name: t.name ?? t.ticker,
        sector: t.sector ?? null,
        market_cap_tier: t.market_cap_tier ?? null,
        study_id: studyId,
        probability_score: prob,
        expected_return: expectedReturn,
        sample_size: sampleSize,
        win_rate: winRate,
        avg_gain: avgGain,
        avg_loss: avgLoss,
        confidence_level: sampleSize >= 25 ? 'high' : sampleSize >= 15 ? 'medium' : 'low',
        last_signal_date: new Date(Date.now() - (h % 14) * 86400000).toISOString(),
        signal_active: (h % 10) >= 3,
      });
    }
  }

  // Sorting + pagination
  const ascending = sortOrder === 'ASC';
  results.sort((a, b) => {
    const va = a[sortBy] ?? 0;
    const vb = b[sortBy] ?? 0;
    return ascending ? va - vb : vb - va;
  });

  return results.slice(offset, offset + limit);
}

function hashToInt(input: string) {
  // Simple deterministic hash
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h << 5) - h + input.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
