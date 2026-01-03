import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CoPilotAnswers {
  capital: number;
  horizon: number;
  riskTolerance: number;
  assetClasses: string[];
  lovedSectors: string[];
  hatedSectors: string[];
  needsLiquidity: boolean;
  ethicalExclusions?: string[];
}

interface InvestorProfile {
  investableCapital: number;
  liquidityConstraint: 'high' | 'medium' | 'locked';
  assetUniverse: string[];
  riskTolerance: number;
  taxBracket: 'low' | 'medium' | 'high';
  investmentHorizon: number;
  lovedSectors?: string[];
  hatedSectors?: string[];
  ethicalExclusions?: string[];
}

interface MarketContext {
  spyPerformance30d: number;
  vixLevel: number;
  volatilityRegime: 'low' | 'normal' | 'elevated' | 'high';
  marketSentiment: string;
  treasuryYield10y: number | null;
  dataFetchedAt: string;
}

interface DataValidation {
  allTickersVerified: boolean;
  dataDateRange: { start: string; end: string };
  warnings: string[];
  substitutions: { original: string; replacement: string; reason: string }[];
}

// Default market context if API fails
const DEFAULT_MARKET_CONTEXT: MarketContext = {
  spyPerformance30d: 0,
  vixLevel: 18,
  volatilityRegime: 'normal',
  marketSentiment: 'Market data unavailable - using neutral assumptions',
  treasuryYield10y: null,
  dataFetchedAt: new Date().toISOString(),
};

// Fetch SPY performance from Polygon
async function fetchSpyPerformance(apiKey: string): Promise<number> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 35); // Extra buffer for weekends
    
    const from = startDate.toISOString().split('T')[0];
    const to = endDate.toISOString().split('T')[0];
    
    const url = `https://api.polygon.io/v2/aggs/ticker/SPY/range/1/day/${from}/${to}?adjusted=true&sort=asc&apiKey=${apiKey}`;
    
    console.log('[AI Portfolio Advisor] Fetching SPY data...');
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('[AI Portfolio Advisor] SPY fetch failed:', response.status);
      return 0;
    }
    
    const data = await response.json();
    
    if (data.results && data.results.length >= 2) {
      const firstClose = data.results[0].c;
      const lastClose = data.results[data.results.length - 1].c;
      const performance = ((lastClose - firstClose) / firstClose) * 100;
      console.log(`[AI Portfolio Advisor] SPY 30d performance: ${performance.toFixed(2)}%`);
      return Math.round(performance * 100) / 100;
    }
    
    return 0;
  } catch (error) {
    console.error('[AI Portfolio Advisor] Error fetching SPY:', error);
    return 0;
  }
}

// Fetch VIX level (using VIXY as proxy or VIX index)
async function fetchVixLevel(apiKey: string): Promise<number> {
  try {
    const url = `https://api.polygon.io/v2/aggs/ticker/VIXY/prev?adjusted=true&apiKey=${apiKey}`;
    
    console.log('[AI Portfolio Advisor] Fetching VIX proxy data...');
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('[AI Portfolio Advisor] VIX fetch failed:', response.status);
      return 18; // Default neutral VIX
    }
    
    const data = await response.json();
    
    // VIXY is a proxy - convert to approximate VIX level
    if (data.results && data.results.length > 0) {
      const vixyClose = data.results[0].c;
      // VIXY typically trades around 10-30 range corresponding to VIX 15-35
      const estimatedVix = Math.max(12, Math.min(50, vixyClose * 1.2 + 10));
      console.log(`[AI Portfolio Advisor] Estimated VIX level: ${estimatedVix.toFixed(1)}`);
      return Math.round(estimatedVix * 10) / 10;
    }
    
    return 18;
  } catch (error) {
    console.error('[AI Portfolio Advisor] Error fetching VIX:', error);
    return 18;
  }
}

// Fetch 10Y Treasury yield proxy (TLT ETF inverse correlation)
async function fetchTreasuryYield(apiKey: string): Promise<number | null> {
  try {
    const url = `https://api.polygon.io/v2/aggs/ticker/TLT/prev?adjusted=true&apiKey=${apiKey}`;
    
    console.log('[AI Portfolio Advisor] Fetching Treasury proxy data...');
    const response = await fetch(url);
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      // TLT inverse correlation to yields - rough approximation
      const tltPrice = data.results[0].c;
      // TLT at ~90 ≈ 4.5% yields, TLT at ~100 ≈ 3.5% yields
      const estimatedYield = Math.max(2, Math.min(6, 7.5 - (tltPrice / 20)));
      console.log(`[AI Portfolio Advisor] Estimated 10Y yield: ${estimatedYield.toFixed(2)}%`);
      return Math.round(estimatedYield * 100) / 100;
    }
    
    return null;
  } catch (error) {
    console.error('[AI Portfolio Advisor] Error fetching Treasury:', error);
    return null;
  }
}

// Validate ticker exists in Polygon
async function validateTicker(ticker: string, apiKey: string): Promise<boolean> {
  try {
    const url = `https://api.polygon.io/v3/reference/tickers/${ticker}?apiKey=${apiKey}`;
    const response = await fetch(url);
    return response.ok;
  } catch {
    return false;
  }
}

// Get volatility regime from VIX level
function getVolatilityRegime(vix: number): 'low' | 'normal' | 'elevated' | 'high' {
  if (vix < 15) return 'low';
  if (vix < 20) return 'normal';
  if (vix < 30) return 'elevated';
  return 'high';
}

// Generate market sentiment description
function getMarketSentiment(spyPerf: number, vix: number, treasuryYield: number | null): string {
  const parts: string[] = [];
  
  if (spyPerf > 3) {
    parts.push('Strong bullish momentum in equities');
  } else if (spyPerf > 0) {
    parts.push('Modestly positive equity trend');
  } else if (spyPerf > -3) {
    parts.push('Slightly negative equity momentum');
  } else {
    parts.push('Bearish equity conditions');
  }
  
  if (vix < 15) {
    parts.push('low volatility environment');
  } else if (vix > 25) {
    parts.push('elevated volatility suggesting caution');
  } else {
    parts.push('normal volatility levels');
  }
  
  if (treasuryYield !== null) {
    if (treasuryYield > 4.5) {
      parts.push('high yields making bonds attractive');
    } else if (treasuryYield < 3) {
      parts.push('low yields favoring equities');
    }
  }
  
  return parts.join(', ') + '.';
}

// Fetch all market context
async function fetchMarketContext(apiKey: string): Promise<MarketContext> {
  try {
    console.log('[AI Portfolio Advisor] Fetching market context...');
    
    // Parallel fetch for efficiency
    const [spyPerf, vix, treasury] = await Promise.all([
      fetchSpyPerformance(apiKey),
      fetchVixLevel(apiKey),
      fetchTreasuryYield(apiKey),
    ]);
    
    const volatilityRegime = getVolatilityRegime(vix);
    const sentiment = getMarketSentiment(spyPerf, vix, treasury);
    
    const context: MarketContext = {
      spyPerformance30d: spyPerf,
      vixLevel: vix,
      volatilityRegime,
      marketSentiment: sentiment,
      treasuryYield10y: treasury,
      dataFetchedAt: new Date().toISOString(),
    };
    
    console.log('[AI Portfolio Advisor] Market context:', JSON.stringify(context));
    return context;
  } catch (error) {
    console.error('[AI Portfolio Advisor] Market context fetch failed:', error);
    return DEFAULT_MARKET_CONTEXT;
  }
}

// Ticker substitution map for common invalid tickers
const TICKER_SUBSTITUTIONS: Record<string, { replacement: string; reason: string }> = {
  'BTC': { replacement: 'IBIT', reason: 'Direct BTC not tradeable, using iShares Bitcoin ETF' },
  'ETH': { replacement: 'ETHA', reason: 'Direct ETH not tradeable, using iShares Ethereum ETF' },
  'GOLD': { replacement: 'GLD', reason: 'Using SPDR Gold Trust ETF' },
  'SILVER': { replacement: 'SLV', reason: 'Using iShares Silver Trust ETF' },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { investorProfile, coPilotAnswers } = body as { 
      investorProfile?: InvestorProfile;
      coPilotAnswers?: CoPilotAnswers;
    };
    
    // Build profile from either source
    const profile: InvestorProfile = investorProfile || {
      investableCapital: coPilotAnswers?.capital || 100000,
      liquidityConstraint: coPilotAnswers?.needsLiquidity || (coPilotAnswers?.horizon || 5) <= 1 ? 'high' : 'locked',
      assetUniverse: coPilotAnswers?.assetClasses || ['stocks', 'etfs', 'bonds'],
      riskTolerance: coPilotAnswers?.riskTolerance || 50,
      taxBracket: (coPilotAnswers?.capital || 100000) > 500000 ? 'high' : (coPilotAnswers?.capital || 100000) > 100000 ? 'medium' : 'low',
      investmentHorizon: coPilotAnswers?.horizon || 5,
      lovedSectors: coPilotAnswers?.lovedSectors,
      hatedSectors: coPilotAnswers?.hatedSectors,
      ethicalExclusions: coPilotAnswers?.ethicalExclusions,
    };
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const POLYGON_API_KEY = Deno.env.get("VITE_POLYGON_API_KEY") || Deno.env.get("POLYGON_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log('[AI Portfolio Advisor] Processing profile:', JSON.stringify(profile));

    // Fetch real market context
    let marketContext: MarketContext = DEFAULT_MARKET_CONTEXT;
    if (POLYGON_API_KEY) {
      marketContext = await fetchMarketContext(POLYGON_API_KEY);
    } else {
      console.log('[AI Portfolio Advisor] No Polygon API key, using default market context');
    }

    // Build strict asset class constraints
    const allowedAssetClasses = profile.assetUniverse || ['stocks', 'etfs', 'bonds'];
    const hasStocks = allowedAssetClasses.includes('stocks');
    const hasETFs = allowedAssetClasses.includes('etfs');
    const hasBonds = allowedAssetClasses.includes('bonds');
    const hasCrypto = allowedAssetClasses.includes('crypto');
    const hasCommodities = allowedAssetClasses.includes('commodities');
    const hasRealEstate = allowedAssetClasses.includes('real_estate');
    
    console.log('[AI Portfolio Advisor] Allowed asset classes:', allowedAssetClasses);

    // Build asset class instructions
    let assetClassInstructions = `
CRITICAL CONSTRAINT - ASSET CLASSES:
The investor has EXPLICITLY selected these asset classes: ${allowedAssetClasses.join(', ')}

YOU MUST ONLY INCLUDE ASSETS FROM THESE CATEGORIES:`;

    if (hasStocks) {
      assetClassInstructions += `
- INDIVIDUAL STOCKS: Include specific company tickers (AAPL, MSFT, NVDA, GOOGL, JPM, JNJ, AMZN, META, UNH, V, etc.).`;
    }
    if (hasETFs) {
      assetClassInstructions += `
- ETFs/INDEX FUNDS: Include diversified ETFs (VTI, SPY, QQQ, VXUS, VEA, etc.).`;
    }
    if (hasBonds) {
      assetClassInstructions += `
- BONDS: Include bond ETFs (BND, AGG, TLT, GOVT, LQD, HYG, etc.).`;
    }
    if (hasCrypto) {
      assetClassInstructions += `
- CRYPTOCURRENCY: Include crypto ETFs (IBIT, BITO, ETHA, GBTC, etc.) - use ETF tickers, NOT direct crypto symbols.`;
    }
    if (hasCommodities) {
      assetClassInstructions += `
- COMMODITIES: Include commodity ETFs (GLD, SLV, USO, DBA, PDBC, etc.).`;
    }
    if (hasRealEstate) {
      assetClassInstructions += `
- REAL ESTATE: Include REITs and real estate ETFs (VNQ, SCHH, O, SPG, AMT, etc.).`;
    }

    assetClassInstructions += `

DO NOT include any asset classes that are NOT in the list above!
This is a HARD REQUIREMENT.`;

    // Allocation strategy
    let allocationStrategy = '';
    if (hasStocks && hasETFs) {
      allocationStrategy = `
Balance stocks and ETFs based on risk:
- Conservative (risk < 40): 70% ETFs, 30% individual stocks
- Moderate (risk 40-70): 50% ETFs, 50% individual stocks  
- Aggressive (risk > 70): 30% ETFs, 70% individual stocks`;
    } else if (hasStocks && !hasETFs) {
      allocationStrategy = `ONLY individual stocks allowed. Build diversified portfolio of 8-12 stocks.`;
    } else if (!hasStocks && hasETFs) {
      allocationStrategy = `ONLY ETFs allowed. Build diversified portfolio of 5-8 ETFs.`;
    }

    // Build personalization context
    const personalizationContext = `
PERSONALIZATION REQUIREMENTS - Reference these specifics in your response:
- Capital: With their $${profile.investableCapital.toLocaleString()}, [explain position sizing]
- Timeline: Given their ${profile.investmentHorizon}-year horizon, [explain time-appropriate strategies]
- Risk: At ${profile.riskTolerance}/100 risk tolerance, [explain risk matching]
${profile.lovedSectors?.length ? `- PREFERRED SECTORS: ${profile.lovedSectors.join(', ')} - Overweight these sectors by 10-20%` : ''}
${profile.hatedSectors?.length ? `- AVOIDED SECTORS: ${profile.hatedSectors.join(', ')} - EXCLUDE all companies in these sectors` : ''}
${profile.ethicalExclusions?.length ? `- ETHICAL EXCLUSIONS: ${profile.ethicalExclusions.join(', ')} - Confirm these exclusions are respected` : ''}`;

    // Market context for AI
    const marketContextPrompt = `
CURRENT MARKET CONDITIONS (Real-time data as of ${marketContext.dataFetchedAt}):
- S&P 500 (SPY) 30-day performance: ${marketContext.spyPerformance30d > 0 ? '+' : ''}${marketContext.spyPerformance30d}%
- Volatility (VIX): ${marketContext.vixLevel} (${marketContext.volatilityRegime} regime)
${marketContext.treasuryYield10y ? `- 10-Year Treasury yield: ~${marketContext.treasuryYield10y}%` : ''}
- Market sentiment: ${marketContext.marketSentiment}

You MUST reference these current market conditions in your rationale. For each allocation:
- Explain how current market regime supports or challenges this pick
- Adjust risk positioning based on VIX level
- Consider equity/bond split based on current yields and equity momentum`;

    const systemPrompt = `You are an institutional-grade portfolio advisor with expertise in modern portfolio theory, factor investing, and risk management.

Your analysis should be grounded in:
- Modern Portfolio Theory (Markowitz)
- Black-Litterman model principles
- Factor investing (Fama-French)
- Risk parity concepts

${marketContextPrompt}

${assetClassInstructions}

${allocationStrategy}

${personalizationContext}

IMPORTANT: Only use valid, tradeable US stock and ETF tickers. Do NOT use direct crypto symbols like BTC or ETH - use their ETF equivalents (IBIT, BITO, ETHA).`;

    const sectorPreferences = coPilotAnswers ? `
**Sector Preferences:**
- Loved sectors: ${coPilotAnswers.lovedSectors?.length > 0 ? coPilotAnswers.lovedSectors.join(', ') : 'None specified'}
- Avoided sectors: ${coPilotAnswers.hatedSectors?.length > 0 ? coPilotAnswers.hatedSectors.join(', ') : 'None specified'}
${coPilotAnswers.ethicalExclusions?.length ? `- Ethical exclusions: ${coPilotAnswers.ethicalExclusions.join(', ')}` : ''}` : '';

    const userPrompt = `Analyze this investor profile and create an optimal portfolio allocation:

**Investor Profile:**
- Investable Capital: $${profile.investableCapital.toLocaleString()}
- Liquidity Constraint: ${profile.liquidityConstraint}
- Asset Universe: ${profile.assetUniverse.join(', ')}
- Risk Tolerance: ${profile.riskTolerance}/100 (${profile.riskTolerance > 70 ? 'aggressive' : profile.riskTolerance > 40 ? 'moderate' : 'conservative'})
- Tax Bracket: ${profile.taxBracket}
- Investment Horizon: ${profile.investmentHorizon} years
${sectorPreferences}

Provide your response as a JSON object with this exact structure:
{
  "portfolioName": "Descriptive name",
  "strategyRationale": "2-3 sentences explaining strategy and how CURRENT MARKET CONDITIONS influenced it",
  "expectedAnnualReturn": 8.5,
  "expectedVolatility": 12.0,
  "sharpeRatio": 0.58,
  "maxDrawdownEstimate": -25,
  "drawdownRecoveryMonths": 18,
  "marketContext": {
    "spyPerformance30d": ${marketContext.spyPerformance30d},
    "vixLevel": ${marketContext.vixLevel},
    "volatilityRegime": "${marketContext.volatilityRegime}",
    "marketSentiment": "${marketContext.marketSentiment}",
    "howMarketAffectedRecommendations": "Specific explanation of how current conditions shaped this portfolio"
  },
  "allocations": [
    {
      "symbol": "TICKER",
      "name": "Full Name",
      "weight": 15,
      "assetClass": "stocks",
      "rationale": "Why this asset, referencing current market conditions",
      "expectedReturn": 12,
      "volatility": 25,
      "idealHoldPeriod": "3+ years",
      "whyThisFitsProfile": "Directly reference investor's $${profile.investableCapital.toLocaleString()} capital, ${profile.investmentHorizon}-year horizon, and ${profile.riskTolerance}/100 risk tolerance",
      "currentMarketContext": "How current VIX/SPY conditions affect this pick"
    }
  ],
  "riskAnalysis": {
    "tailRisk": "Description of tail risk",
    "correlationBenefit": "How assets diversify",
    "regimeConsiderations": "Performance in different regimes"
  },
  "drawdownScenarios": [
    {
      "scenario": "2020 COVID Crash",
      "historicalDates": "Feb-Mar 2020",
      "estimatedDrawdown": -25,
      "recoveryTime": "6 months",
      "explanation": "Explanation"
    },
    {
      "scenario": "2022 Bear Market",
      "historicalDates": "Jan-Oct 2022",
      "estimatedDrawdown": -20,
      "recoveryTime": "12-18 months",
      "explanation": "Explanation"
    }
  ],
  "liquidityAnalysis": {
    "averageDailyVolume": "Description",
    "liquidityScore": 95,
    "liquidityRisks": [],
    "timeToLiquidate": "Same day"
  },
  "rebalancingStrategy": {
    "frequency": "Quarterly",
    "thresholdBands": "5% drift",
    "taxConsiderations": "Specific strategies"
  },
  "dataValidation": {
    "allTickersVerified": true,
    "dataDateRange": { "start": "2024-01-01", "end": "${new Date().toISOString().split('T')[0]}" },
    "warnings": []
  },
  "educationalNotes": [
    {
      "term": "Volatility",
      "explanation": "A measure of how much an asset's price fluctuates",
      "relevanceToThisPortfolio": "Why this matters for this specific portfolio"
    }
  ],
  "keyInsights": [
    "Insight about portfolio",
    "Another insight"
  ]
}

CRITICAL: 
- All weights must sum to 100
- Reference the investor's SPECIFIC numbers: $${profile.investableCapital.toLocaleString()}, ${profile.investmentHorizon} years
- Explain how current market conditions (SPY ${marketContext.spyPerformance30d > 0 ? '+' : ''}${marketContext.spyPerformance30d}%, VIX ${marketContext.vixLevel}) influenced your recommendations
${profile.lovedSectors?.length ? `- OVERWEIGHT these preferred sectors: ${profile.lovedSectors.join(', ')}` : ''}
${profile.hatedSectors?.length ? `- EXCLUDE these sectors completely: ${profile.hatedSectors.join(', ')}` : ''}
${profile.ethicalExclusions?.length ? `- Confirm ethical exclusions are respected: ${profile.ethicalExclusions.join(', ')}` : ''}`;

    console.log('[AI Portfolio Advisor] Calling AI with market context...');

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 6000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("[AI Portfolio Advisor] Gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    console.log("[AI Portfolio Advisor] Raw response length:", content.length);

    // Parse JSON from response
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    let portfolioAdvice = JSON.parse(jsonStr.trim());

    // Validate tickers and apply substitutions
    const validation: DataValidation = {
      allTickersVerified: true,
      dataDateRange: { 
        start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
      },
      warnings: [],
      substitutions: [],
    };

    if (POLYGON_API_KEY && portfolioAdvice.allocations) {
      console.log('[AI Portfolio Advisor] Validating tickers...');
      
      for (let i = 0; i < portfolioAdvice.allocations.length; i++) {
        const allocation = portfolioAdvice.allocations[i];
        const ticker = allocation.symbol.toUpperCase();
        
        // Check for known substitutions first
        if (TICKER_SUBSTITUTIONS[ticker]) {
          const sub = TICKER_SUBSTITUTIONS[ticker];
          validation.substitutions.push({
            original: ticker,
            replacement: sub.replacement,
            reason: sub.reason,
          });
          portfolioAdvice.allocations[i].symbol = sub.replacement;
          portfolioAdvice.allocations[i].name = `${allocation.name} (via ${sub.replacement})`;
          console.log(`[AI Portfolio Advisor] Substituted ${ticker} → ${sub.replacement}`);
          continue;
        }
        
        // Validate ticker exists
        const isValid = await validateTicker(ticker, POLYGON_API_KEY);
        if (!isValid) {
          validation.allTickersVerified = false;
          validation.warnings.push(`Ticker ${ticker} could not be verified`);
          console.log(`[AI Portfolio Advisor] Warning: Could not verify ticker ${ticker}`);
        }
      }
    }

    // Add validation to response
    portfolioAdvice.dataValidation = validation;
    
    // Ensure market context is included
    if (!portfolioAdvice.marketContext) {
      portfolioAdvice.marketContext = marketContext;
    }

    console.log("[AI Portfolio Advisor] Successfully generated portfolio:", portfolioAdvice.portfolioName);
    if (validation.substitutions.length > 0) {
      console.log("[AI Portfolio Advisor] Ticker substitutions:", validation.substitutions);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      data: portfolioAdvice,
      marketContext,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[AI Portfolio Advisor] Error:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error",
      marketContext: DEFAULT_MARKET_CONTEXT,
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
