import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CalculationRequest {
  tickers: string[];
  weights: number[];
  startDate?: string;
  endDate?: string;
  benchmarkTicker?: string;
  investableCapital?: number;
  riskFreeRate?: number;
  includeAIAnalysis?: boolean;
  generateTraces?: boolean;
}

interface PortfolioMetrics {
  // Core Returns
  totalReturn: number;
  cagr: number;
  annualizedReturn: number;
  
  // Risk Metrics
  volatility: number;
  maxDrawdown: number;
  var95: number;
  var99: number;
  cvar95: number;
  cvar99: number;
  
  // Risk-Adjusted
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  omegaRatio: number;
  informationRatio: number;
  treynorRatio: number;
  
  // Tail Risk
  tailRatio: number;
  ulcerIndex: number;
  skewness: number;
  kurtosis: number;
  
  // Liquidity
  liquidityScore: number;
  daysToLiquidate: number;
  
  // Benchmark
  beta: number;
  alpha: number;
  rSquared: number;
  trackingError: number;
  
  // Human-Readable
  sleepScore: number;
  turbulenceRating: number;
  worstCaseDollars: number;
}

interface CalculationTrace {
  metricId: string;
  steps: {
    step: number;
    description: string;
    formula: string;
    inputs: Record<string, any>;
    result: any;
  }[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  
  try {
    const request: CalculationRequest = await req.json();
    const {
      tickers,
      weights,
      startDate = getOneYearAgo(),
      endDate = getToday(),
      benchmarkTicker = 'SPY',
      investableCapital = 100000,
      riskFreeRate = 0.05,
      includeAIAnalysis = true,
      generateTraces = false
    } = request;
    
    console.log(`[AICalculate] Calculating metrics for ${tickers.length} tickers:`, tickers);
    console.log(`[AICalculate] Date range: ${startDate} to ${endDate}`);
    
    // Validate inputs
    if (!tickers || tickers.length === 0) {
      throw new Error('At least one ticker is required');
    }
    
    if (tickers.length !== weights.length) {
      throw new Error('Tickers and weights must have same length');
    }
    
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    if (Math.abs(totalWeight - 1) > 0.01) {
      throw new Error(`Weights must sum to 1, got ${totalWeight.toFixed(4)}`);
    }
    
    // Check cache first
    const portfolioHash = generatePortfolioHash(tickers, weights);
    console.log(`[AICalculate] Portfolio hash: ${portfolioHash}`);
    
    const { data: cached } = await supabase
      .from('calculation_cache')
      .select('*')
      .eq('portfolio_hash', portfolioHash)
      .eq('start_date', startDate)
      .eq('end_date', endDate)
      .eq('is_valid', true)
      .gt('expires_at', new Date().toISOString())
      .single();
    
    if (cached && !generateTraces) {
      console.log('[AICalculate] Cache hit! Returning cached results');
      return new Response(
        JSON.stringify({
          success: true,
          fromCache: true,
          metrics: cached.metrics,
          aiAnalysis: cached.ai_interpretation,
          dataInfo: {
            startDate,
            endDate,
            calculatedAt: cached.calculated_at
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Fetch portfolio returns from flat file database
    console.log('[AICalculate] Fetching portfolio returns from database...');
    
    const { data: portfolioReturns, error: returnsError } = await supabase.rpc(
      'get_portfolio_returns',
      {
        p_tickers: tickers,
        p_weights: weights,
        p_start_date: startDate,
        p_end_date: endDate
      }
    );
    
    if (returnsError) {
      console.error('[AICalculate] Error fetching portfolio returns:', returnsError);
      throw new Error(`Failed to fetch portfolio returns: ${returnsError.message}`);
    }
    
    if (!portfolioReturns || portfolioReturns.length < 20) {
      console.error(`[AICalculate] Insufficient data: ${portfolioReturns?.length || 0} days`);
      throw new Error(`Insufficient data: only ${portfolioReturns?.length || 0} trading days available. Need at least 20 days.`);
    }
    
    console.log(`[AICalculate] Retrieved ${portfolioReturns.length} trading days of data`);
    
    // Fetch benchmark returns
    const { data: benchmarkData, error: benchmarkError } = await supabase
      .from('market_daily_bars')
      .select('bar_date, daily_return')
      .eq('ticker', benchmarkTicker)
      .gte('bar_date', startDate)
      .lte('bar_date', endDate)
      .not('daily_return', 'is', null)
      .order('bar_date');
    
    if (benchmarkError) {
      console.warn('[AICalculate] Benchmark fetch error:', benchmarkError);
    }
    
    const benchmarkReturns = benchmarkData?.map(d => d.daily_return) || [];
    const returns = portfolioReturns.map((d: any) => d.portfolio_return);
    
    console.log(`[AICalculate] Benchmark (${benchmarkTicker}): ${benchmarkReturns.length} days`);
    
    // Calculate all metrics locally (fast)
    console.log('[AICalculate] Calculating metrics...');
    const metrics = calculateAllMetrics(
      returns,
      benchmarkReturns,
      riskFreeRate,
      investableCapital,
      tickers,
      weights
    );
    
    console.log('[AICalculate] Metrics calculated:', {
      sharpe: metrics.sharpeRatio.toFixed(2),
      volatility: metrics.volatility.toFixed(2),
      maxDD: metrics.maxDrawdown.toFixed(2)
    });
    
    // Generate calculation traces if requested
    let traces: CalculationTrace[] | undefined;
    if (generateTraces) {
      console.log('[AICalculate] Generating calculation traces...');
      traces = generateAllTraces(returns, benchmarkReturns, riskFreeRate, investableCapital);
    }
    
    // Get AI analysis if requested
    let aiAnalysis: any = null;
    if (includeAIAnalysis) {
      console.log('[AICalculate] Getting AI analysis...');
      aiAnalysis = await getAIAnalysis(metrics, tickers, weights, investableCapital);
      console.log('[AICalculate] AI analysis complete:', aiAnalysis ? 'success' : 'skipped');
    }
    
    // Cache the results
    console.log('[AICalculate] Caching results...');
    const { error: cacheError } = await supabase
      .from('calculation_cache')
      .upsert({
        portfolio_hash: portfolioHash,
        tickers,
        weights,
        start_date: startDate,
        end_date: endDate,
        benchmark_ticker: benchmarkTicker,
        risk_free_rate: riskFreeRate,
        metrics,
        calculation_traces: traces,
        ai_interpretation: aiAnalysis,
        is_valid: true,
        calculated_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }, {
        onConflict: 'portfolio_hash,start_date,end_date,benchmark_ticker'
      });
    
    if (cacheError) {
      console.warn('[AICalculate] Cache upsert warning:', cacheError);
    }
    
    console.log('[AICalculate] Complete!');
    
    return new Response(
      JSON.stringify({
        success: true,
        fromCache: false,
        metrics,
        traces,
        aiAnalysis,
        dataInfo: {
          startDate,
          endDate,
          tradingDays: returns.length,
          benchmarkDays: benchmarkReturns.length,
          calculatedAt: new Date().toISOString()
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error: any) {
    console.error("[AICalculate] Error:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error occurred',
        details: error.toString()
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ============================================
// CORE CALCULATION FUNCTIONS
// ============================================

function calculateAllMetrics(
  returns: number[],
  benchmarkReturns: number[],
  riskFreeRate: number,
  investableCapital: number,
  tickers: string[],
  weights: number[]
): PortfolioMetrics {
  const n = returns.length;
  const dailyRf = riskFreeRate / 252;
  
  // Build portfolio value series
  let value = investableCapital;
  const values: number[] = [value];
  for (const r of returns) {
    value *= (1 + r);
    values.push(value);
  }
  
  // Core returns
  const totalReturn = (values[values.length - 1] - investableCapital) / investableCapital;
  const years = n / 252;
  const cagr = years > 0 ? Math.pow(1 + totalReturn, 1 / years) - 1 : 0;
  const annualizedReturn = mean(returns) * 252;
  
  // Volatility
  const volatility = stdDev(returns) * Math.sqrt(252);
  
  // Max Drawdown
  const { maxDrawdown, drawdownSeries } = calculateMaxDrawdown(values);
  
  // VaR & CVaR
  const sortedReturns = [...returns].sort((a, b) => a - b);
  const var95Index = Math.floor(n * 0.05);
  const var99Index = Math.floor(n * 0.01);
  
  const var95 = Math.abs(sortedReturns[var95Index] || 0) * 100;
  const var99 = Math.abs(sortedReturns[var99Index] || 0) * 100;
  
  const cvar95 = Math.abs(mean(sortedReturns.slice(0, Math.max(1, var95Index)))) * 100;
  const cvar99 = Math.abs(mean(sortedReturns.slice(0, Math.max(1, var99Index)))) * 100;
  
  // Sharpe Ratio
  const excessReturns = returns.map(r => r - dailyRf);
  const stdExcess = stdDev(excessReturns);
  const sharpeRatio = stdExcess > 0 ? (mean(excessReturns) / stdExcess) * Math.sqrt(252) : 0;
  
  // Sortino Ratio
  const downsideReturns = returns.map(r => Math.min(0, r - dailyRf));
  const downsideDeviation = Math.sqrt(mean(downsideReturns.map(r => r * r)));
  const sortinoRatio = downsideDeviation > 0 
    ? (mean(returns) - dailyRf) / downsideDeviation * Math.sqrt(252)
    : sharpeRatio > 0 ? 10 : 0;
  
  // Calmar Ratio
  const calmarRatio = maxDrawdown > 0 ? (cagr * 100) / maxDrawdown : 0;
  
  // Omega Ratio
  const gains = returns.filter(r => r > 0).reduce((a, b) => a + b, 0);
  const losses = Math.abs(returns.filter(r => r < 0).reduce((a, b) => a + b, 0));
  const omegaRatio = losses > 0 ? 1 + (gains / losses) : (gains > 0 ? 10 : 1);
  
  // Tail Ratio
  const top5Pct = sortedReturns.slice(-Math.max(1, Math.floor(n * 0.05)));
  const bottom5Pct = sortedReturns.slice(0, Math.max(1, Math.floor(n * 0.05)));
  const tailRatio = Math.abs(mean(bottom5Pct)) > 0 
    ? mean(top5Pct) / Math.abs(mean(bottom5Pct))
    : 1;
  
  // Ulcer Index
  const ulcerIndex = Math.sqrt(mean(drawdownSeries.map(d => d * d)));
  
  // Skewness & Kurtosis
  const meanRet = mean(returns);
  const stdRet = stdDev(returns);
  
  let skewness = 0;
  let kurtosis = 0;
  
  if (stdRet > 0 && n > 2) {
    skewness = (n / ((n - 1) * (n - 2))) * 
      returns.reduce((sum, r) => sum + Math.pow((r - meanRet) / stdRet, 3), 0);
  }
  
  if (stdRet > 0 && n > 3) {
    kurtosis = ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * 
      returns.reduce((sum, r) => sum + Math.pow((r - meanRet) / stdRet, 4), 0) -
      (3 * (n - 1) * (n - 1)) / ((n - 2) * (n - 3));
  }
  
  // Benchmark metrics
  let beta = 1, alpha = 0, rSquared = 0, trackingError = 0, informationRatio = 0, treynorRatio = 0;
  
  if (benchmarkReturns.length > 20) {
    const minLen = Math.min(returns.length, benchmarkReturns.length);
    const pRet = returns.slice(0, minLen);
    const bRet = benchmarkReturns.slice(0, minLen);
    
    // Beta
    const covar = covariance(pRet, bRet);
    const bVar = variance(bRet);
    beta = bVar > 0 ? covar / bVar : 1;
    
    // Alpha (annualized)
    alpha = (mean(pRet) - beta * mean(bRet)) * 252 * 100;
    
    // R-squared
    const stdP = stdDev(pRet);
    const stdB = stdDev(bRet);
    if (stdP > 0 && stdB > 0) {
      const correlation = covar / (stdP * stdB);
      rSquared = Math.min(100, Math.max(0, correlation * correlation * 100));
    }
    
    // Tracking Error
    const activeReturns = pRet.map((r, i) => r - bRet[i]);
    trackingError = stdDev(activeReturns) * Math.sqrt(252) * 100;
    
    // Information Ratio
    informationRatio = trackingError > 0 
      ? (mean(activeReturns) * 252 * 100) / trackingError
      : 0;
    
    // Treynor Ratio
    treynorRatio = Math.abs(beta) > 0.01 
      ? (annualizedReturn - riskFreeRate) / beta
      : 0;
  }
  
  // Liquidity Score (simplified - would use actual volume data in production)
  const liquidityScore = 85;
  const daysToLiquidate = 1;
  
  // Human-readable metrics
  const sleepScore = Math.max(0, Math.min(100, 100 - volatility * 100 * 4));
  const turbulenceRating = Math.min(100, 
    volatility * 100 * 2 + 
    Math.max(0, kurtosis) * 5 + 
    Math.max(0, -skewness) * 10
  );
  const worstCaseDollars = investableCapital * (maxDrawdown / 100);
  
  return {
    totalReturn: roundTo(totalReturn * 100, 4),
    cagr: roundTo(cagr * 100, 4),
    annualizedReturn: roundTo(annualizedReturn * 100, 4),
    volatility: roundTo(volatility * 100, 4),
    maxDrawdown: roundTo(maxDrawdown, 4),
    var95: roundTo(var95, 4),
    var99: roundTo(var99, 4),
    cvar95: roundTo(cvar95, 4),
    cvar99: roundTo(cvar99, 4),
    sharpeRatio: roundTo(sharpeRatio, 4),
    sortinoRatio: roundTo(sortinoRatio, 4),
    calmarRatio: roundTo(calmarRatio, 4),
    omegaRatio: roundTo(omegaRatio, 4),
    informationRatio: roundTo(informationRatio, 4),
    treynorRatio: roundTo(treynorRatio, 4),
    tailRatio: roundTo(tailRatio, 4),
    ulcerIndex: roundTo(ulcerIndex, 4),
    skewness: roundTo(skewness, 4),
    kurtosis: roundTo(kurtosis, 4),
    beta: roundTo(beta, 4),
    alpha: roundTo(alpha, 4),
    rSquared: roundTo(rSquared, 2),
    trackingError: roundTo(trackingError, 4),
    liquidityScore,
    daysToLiquidate,
    sleepScore: roundTo(sleepScore, 0),
    turbulenceRating: roundTo(turbulenceRating, 0),
    worstCaseDollars: roundTo(worstCaseDollars, 2)
  };
}

function calculateMaxDrawdown(values: number[]): { maxDrawdown: number; drawdownSeries: number[] } {
  let peak = values[0];
  let maxDD = 0;
  const ddSeries: number[] = [];
  
  for (const value of values) {
    if (value > peak) peak = value;
    const dd = peak > 0 ? (peak - value) / peak * 100 : 0;
    ddSeries.push(dd);
    if (dd > maxDD) maxDD = dd;
  }
  
  return { maxDrawdown: maxDD, drawdownSeries: ddSeries };
}

// ============================================
// AI ANALYSIS FUNCTION
// ============================================

async function getAIAnalysis(
  metrics: PortfolioMetrics,
  tickers: string[],
  weights: number[],
  investableCapital: number
): Promise<any> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    console.log('[AICalculate] No LOVABLE_API_KEY configured, skipping AI analysis');
    return null;
  }
  
  const portfolioBreakdown = tickers
    .map((t, i) => `- ${t}: ${(weights[i] * 100).toFixed(1)}%`)
    .join('\n');
  
  const prompt = `You are an expert financial analyst. Analyze this portfolio and provide insights.

PORTFOLIO COMPOSITION:
${portfolioBreakdown}
Total Investment: $${investableCapital.toLocaleString()}

KEY PERFORMANCE METRICS:
- Total Return: ${metrics.totalReturn.toFixed(2)}%
- CAGR: ${metrics.cagr.toFixed(2)}%
- Annualized Return: ${metrics.annualizedReturn.toFixed(2)}%
- Volatility: ${metrics.volatility.toFixed(2)}%

RISK METRICS:
- Sharpe Ratio: ${metrics.sharpeRatio.toFixed(2)}
- Sortino Ratio: ${metrics.sortinoRatio.toFixed(2)}
- Max Drawdown: ${metrics.maxDrawdown.toFixed(2)}%
- Value at Risk (95%): ${metrics.var95.toFixed(2)}%
- CVaR (95%): ${metrics.cvar95.toFixed(2)}%
- Beta: ${metrics.beta.toFixed(2)}
- Alpha: ${metrics.alpha.toFixed(2)}%

INVESTOR METRICS:
- Sleep Score: ${metrics.sleepScore.toFixed(0)}/100 (higher = less volatility, easier to hold)
- Worst Case Loss: $${metrics.worstCaseDollars.toLocaleString()}

Provide your analysis as a JSON object with this exact structure:
{
  "summary": "2-3 sentence overall assessment of the portfolio",
  "riskLevel": "conservative|moderate|aggressive|very-aggressive",
  "strengths": ["specific strength 1 referencing actual metrics", "strength 2", "strength 3"],
  "concerns": ["specific concern 1 if any", "concern 2 if any"],
  "suggestions": ["actionable suggestion 1", "actionable suggestion 2"],
  "suitableFor": "description of what type of investor this portfolio suits",
  "keyInsight": "one unique insight about this specific portfolio combination"
}

Be specific and reference the actual numbers. Keep responses concise and actionable.`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { 
            role: "system", 
            content: "You are a quantitative portfolio analyst. Always respond with valid JSON only, no markdown formatting." 
          },
          { role: "user", content: prompt }
        ],
        max_tokens: 1000
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[AICalculate] AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return { error: "Rate limit exceeded. Please try again later." };
      }
      if (response.status === 402) {
        return { error: "AI credits exhausted. Please add credits." };
      }
      return null;
    }
    
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      console.warn('[AICalculate] No content in AI response');
      return null;
    }
    
    // Parse JSON from response (handle potential markdown code blocks)
    let cleanContent = content.trim();
    if (cleanContent.startsWith('```json')) {
      cleanContent = cleanContent.slice(7);
    } else if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.slice(3);
    }
    if (cleanContent.endsWith('```')) {
      cleanContent = cleanContent.slice(0, -3);
    }
    
    const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        console.warn('[AICalculate] JSON parse error:', parseError);
        return { summary: content };
      }
    }
    
    return { summary: content };
    
  } catch (error: any) {
    console.error('[AICalculate] AI analysis error:', error);
    return { error: error.message || 'AI analysis failed' };
  }
}

// ============================================
// CALCULATION TRACE GENERATION
// ============================================

function generateAllTraces(
  returns: number[],
  benchmarkReturns: number[],
  riskFreeRate: number,
  investableCapital: number
): CalculationTrace[] {
  const traces: CalculationTrace[] = [];
  
  // Sharpe Ratio trace
  traces.push(generateSharpeTrace(returns, riskFreeRate));
  
  // Volatility trace
  traces.push(generateVolatilityTrace(returns));
  
  // Max Drawdown trace
  traces.push(generateMaxDrawdownTrace(returns, investableCapital));
  
  // Sortino Ratio trace
  traces.push(generateSortinoTrace(returns, riskFreeRate));
  
  return traces;
}

function generateSharpeTrace(returns: number[], riskFreeRate: number): CalculationTrace {
  const n = returns.length;
  const dailyRf = riskFreeRate / 252;
  const meanReturn = mean(returns);
  const excessReturns = returns.map(r => r - dailyRf);
  const meanExcess = mean(excessReturns);
  const stdExcess = stdDev(excessReturns);
  const sharpe = stdExcess > 0 ? (meanExcess / stdExcess) * Math.sqrt(252) : 0;
  
  return {
    metricId: 'sharpeRatio',
    steps: [
      {
        step: 1,
        description: 'Convert annual risk-free rate to daily',
        formula: 'rf_daily = rf_annual / 252',
        inputs: { rf_annual: riskFreeRate, tradingDays: 252 },
        result: roundTo(dailyRf, 6)
      },
      {
        step: 2,
        description: 'Calculate mean daily portfolio return',
        formula: 'μ = (1/n) × Σ Rᵢ',
        inputs: { n, sumReturns: roundTo(returns.reduce((a, b) => a + b, 0), 6) },
        result: roundTo(meanReturn, 6)
      },
      {
        step: 3,
        description: 'Calculate daily excess returns (return minus risk-free)',
        formula: 'excess_i = Rᵢ - rf_daily',
        inputs: { meanReturn: roundTo(meanReturn, 6), dailyRf: roundTo(dailyRf, 6) },
        result: roundTo(meanExcess, 6)
      },
      {
        step: 4,
        description: 'Calculate standard deviation of excess returns',
        formula: 'σ = √[(1/(n-1)) × Σ(excessᵢ - μ_excess)²]',
        inputs: { n },
        result: roundTo(stdExcess, 6)
      },
      {
        step: 5,
        description: 'Annualize Sharpe Ratio',
        formula: 'Sharpe = (μ_excess / σ) × √252',
        inputs: { 
          meanExcess: roundTo(meanExcess, 6), 
          stdExcess: roundTo(stdExcess, 6), 
          sqrtDays: roundTo(Math.sqrt(252), 4) 
        },
        result: roundTo(sharpe, 4)
      }
    ]
  };
}

function generateVolatilityTrace(returns: number[]): CalculationTrace {
  const n = returns.length;
  const meanReturn = mean(returns);
  const dailyVol = stdDev(returns);
  const annualVol = dailyVol * Math.sqrt(252);
  
  return {
    metricId: 'volatility',
    steps: [
      {
        step: 1,
        description: 'Calculate mean daily return',
        formula: 'μ = (1/n) × Σ Rᵢ',
        inputs: { n },
        result: roundTo(meanReturn, 6)
      },
      {
        step: 2,
        description: 'Calculate squared deviations from mean',
        formula: 'dev² = (Rᵢ - μ)²',
        inputs: { sampleSize: n },
        result: 'For each day'
      },
      {
        step: 3,
        description: 'Calculate variance (sample)',
        formula: 'Var = (1/(n-1)) × Σ(Rᵢ - μ)²',
        inputs: { n: n - 1 },
        result: roundTo(dailyVol * dailyVol, 8)
      },
      {
        step: 4,
        description: 'Take square root for daily volatility',
        formula: 'σ_daily = √Var',
        inputs: {},
        result: roundTo(dailyVol, 6)
      },
      {
        step: 5,
        description: 'Annualize volatility',
        formula: 'σ_annual = σ_daily × √252',
        inputs: { dailyVol: roundTo(dailyVol, 6), sqrtDays: roundTo(Math.sqrt(252), 4) },
        result: roundTo(annualVol * 100, 2) + '%'
      }
    ]
  };
}

function generateMaxDrawdownTrace(returns: number[], investableCapital: number): CalculationTrace {
  let value = investableCapital;
  const values: number[] = [value];
  for (const r of returns) {
    value *= (1 + r);
    values.push(value);
  }
  
  let peak = values[0];
  let maxDD = 0;
  let maxDDDate = 0;
  
  for (let i = 0; i < values.length; i++) {
    if (values[i] > peak) peak = values[i];
    const dd = (peak - values[i]) / peak * 100;
    if (dd > maxDD) {
      maxDD = dd;
      maxDDDate = i;
    }
  }
  
  return {
    metricId: 'maxDrawdown',
    steps: [
      {
        step: 1,
        description: 'Start with initial portfolio value',
        formula: 'V₀ = Initial Investment',
        inputs: { initialValue: investableCapital },
        result: investableCapital
      },
      {
        step: 2,
        description: 'Compound daily returns to build value series',
        formula: 'Vₜ = Vₜ₋₁ × (1 + Rₜ)',
        inputs: { days: returns.length },
        result: `${returns.length} daily values`
      },
      {
        step: 3,
        description: 'Track running peak value',
        formula: 'Peak_t = max(V₀, V₁, ..., Vₜ)',
        inputs: {},
        result: roundTo(peak, 2)
      },
      {
        step: 4,
        description: 'Calculate drawdown at each point',
        formula: 'DD_t = (Peak_t - Vₜ) / Peak_t × 100',
        inputs: {},
        result: 'Daily drawdowns'
      },
      {
        step: 5,
        description: 'Find maximum drawdown',
        formula: 'MaxDD = max(DD₀, DD₁, ..., DD_n)',
        inputs: { peakValue: roundTo(peak, 2) },
        result: roundTo(maxDD, 2) + '%'
      }
    ]
  };
}

function generateSortinoTrace(returns: number[], riskFreeRate: number): CalculationTrace {
  const dailyRf = riskFreeRate / 252;
  const meanReturn = mean(returns);
  const downsideReturns = returns.map(r => Math.min(0, r - dailyRf));
  const downsideVar = mean(downsideReturns.map(r => r * r));
  const downsideDeviation = Math.sqrt(downsideVar);
  const sortino = downsideDeviation > 0 
    ? (meanReturn - dailyRf) / downsideDeviation * Math.sqrt(252)
    : 0;
  
  const negativeCount = returns.filter(r => r < dailyRf).length;
  
  return {
    metricId: 'sortinoRatio',
    steps: [
      {
        step: 1,
        description: 'Identify downside returns (below risk-free rate)',
        formula: 'downside_i = min(0, Rᵢ - rf_daily)',
        inputs: { 
          dailyRf: roundTo(dailyRf, 6),
          negativeReturns: negativeCount
        },
        result: `${negativeCount} downside days out of ${returns.length}`
      },
      {
        step: 2,
        description: 'Square downside returns',
        formula: 'downside²_i = (downside_i)²',
        inputs: {},
        result: 'Squared deviations'
      },
      {
        step: 3,
        description: 'Calculate downside variance',
        formula: 'Var_down = (1/n) × Σ downside²_i',
        inputs: { n: returns.length },
        result: roundTo(downsideVar, 8)
      },
      {
        step: 4,
        description: 'Calculate downside deviation',
        formula: 'DD = √Var_down',
        inputs: {},
        result: roundTo(downsideDeviation, 6)
      },
      {
        step: 5,
        description: 'Annualize Sortino Ratio',
        formula: 'Sortino = ((μ - rf_daily) / DD) × √252',
        inputs: { 
          excessReturn: roundTo(meanReturn - dailyRf, 6),
          downsideDev: roundTo(downsideDeviation, 6)
        },
        result: roundTo(sortino, 4)
      }
    ]
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function variance(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return arr.reduce((sum, x) => sum + (x - m) ** 2, 0) / (arr.length - 1);
}

function stdDev(arr: number[]): number {
  return Math.sqrt(variance(arr));
}

function covariance(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;
  const mx = mean(x.slice(0, n));
  const my = mean(y.slice(0, n));
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += (x[i] - mx) * (y[i] - my);
  }
  return sum / (n - 1);
}

function roundTo(num: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(num * factor) / factor;
}

function generatePortfolioHash(tickers: string[], weights: number[]): string {
  const sorted = tickers
    .map((t, i) => `${t}:${weights[i].toFixed(6)}`)
    .sort()
    .join('|');
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < sorted.length; i++) {
    const char = sorted.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(16, '0');
}

function getOneYearAgo(): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 1);
  return date.toISOString().split('T')[0];
}

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}
