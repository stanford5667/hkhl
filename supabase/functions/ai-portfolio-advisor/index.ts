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
}

interface InvestorProfile {
  investableCapital: number;
  liquidityConstraint: 'high' | 'medium' | 'locked';
  assetUniverse: string[];
  riskTolerance: number;
  taxBracket: 'low' | 'medium' | 'high';
  investmentHorizon: number;
}

interface PortfolioSuggestion {
  symbol: string;
  name: string;
  weight: number;
  assetClass: string;
  rationale: string;
  expectedReturn: number;
  volatility: number;
  idealHoldPeriod: string;
  whyThisFitsProfile: string;
}

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
    };
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log('[AI Portfolio Advisor] Processing profile:', JSON.stringify(profile));
    if (coPilotAnswers) {
      console.log('[AI Portfolio Advisor] Co-Pilot answers:', JSON.stringify(coPilotAnswers));
    }

    const systemPrompt = `You are an institutional-grade portfolio advisor with expertise in modern portfolio theory, factor investing, and risk management. You provide detailed, actionable portfolio recommendations based on investor profiles.

Your analysis should be grounded in:
- Modern Portfolio Theory (Markowitz)
- Black-Litterman model principles
- Factor investing (Fama-French)
- Risk parity concepts
- J.P. Morgan's 60/40+ framework for alternative allocations

IMPORTANT: Create a DIVERSIFIED portfolio that includes BOTH:
1. Individual stocks (at least 3-5 specific company tickers like AAPL, MSFT, NVDA, GOOGL, JPM, JNJ, etc.) for alpha generation
2. ETFs/Index funds for broad market exposure and diversification

The mix should depend on the investor's risk profile:
- Conservative (risk < 40): 70% ETFs, 30% individual stocks
- Moderate (risk 40-70): 50% ETFs, 50% individual stocks  
- Aggressive (risk > 70): 30% ETFs, 70% individual stocks

When selecting individual stocks, consider:
- Blue-chip quality companies with strong fundamentals
- Sector alignment with the investor's loved/hated sectors
- Growth vs value based on risk tolerance
- Dividend stocks for income-focused conservative investors

When explaining why each asset fits the profile, be specific about how it relates to their risk tolerance, time horizon, and preferences.`;

    const sectorPreferences = coPilotAnswers ? `
**Sector Preferences:**
- Loved sectors: ${coPilotAnswers.lovedSectors?.length > 0 ? coPilotAnswers.lovedSectors.join(', ') : 'None specified'}
- Avoided sectors: ${coPilotAnswers.hatedSectors?.length > 0 ? coPilotAnswers.hatedSectors.join(', ') : 'None specified'}` : '';

    const userPrompt = `Analyze this investor profile and create an optimal portfolio allocation:

**Investor Profile:**
- Investable Capital: $${profile.investableCapital.toLocaleString()}
- Liquidity Constraint: ${profile.liquidityConstraint} (${profile.liquidityConstraint === 'high' ? 'needs access within 30 days' : profile.liquidityConstraint === 'locked' ? 'can hold 5+ years' : 'moderate flexibility'})
- Asset Universe: ${profile.assetUniverse.join(', ')}
- Risk Tolerance: ${profile.riskTolerance}/100 (${profile.riskTolerance > 70 ? 'aggressive' : profile.riskTolerance > 40 ? 'moderate' : 'conservative'})
- Tax Bracket: ${profile.taxBracket}
- Investment Horizon: ${profile.investmentHorizon} years
${sectorPreferences}

Provide your response as a JSON object with this exact structure:
{
  "portfolioName": "Descriptive name for this portfolio strategy",
  "strategyRationale": "2-3 sentences explaining the overall strategy approach and why it fits this investor",
  "expectedAnnualReturn": 8.5,
  "expectedVolatility": 12.0,
  "sharpeRatio": 0.58,
  "maxDrawdownEstimate": -25,
  "drawdownRecoveryMonths": 18,
  "allocations": [
    {
      "symbol": "AAPL",
      "name": "Apple Inc.",
      "weight": 12,
      "assetClass": "stocks",
      "rationale": "Market leader in consumer tech with strong cash flow and ecosystem lock-in",
      "expectedReturn": 12,
      "volatility": 25,
      "idealHoldPeriod": "3+ years",
      "whyThisFitsProfile": "As a growth-oriented blue chip, AAPL balances your appetite for returns with quality. Its consistent performance suits your moderate risk tolerance."
    },
    {
      "symbol": "VTI",
      "name": "Vanguard Total Stock Market ETF",
      "weight": 30,
      "assetClass": "etf",
      "rationale": "Core US equity exposure with low expense ratio providing broad market access",
      "expectedReturn": 9.5,
      "volatility": 18,
      "idealHoldPeriod": "5+ years",
      "whyThisFitsProfile": "With your 5-year horizon and moderate risk tolerance, VTI provides growth potential while the diversification reduces single-stock risk."
    }
  ],
  "riskAnalysis": {
    "tailRisk": "Description of tail risk exposure",
    "correlationBenefit": "How assets diversify each other",
    "regimeConsiderations": "How portfolio performs in different market regimes"
  },
  "drawdownScenarios": [
    {
      "scenario": "2020 COVID Crash",
      "historicalDates": "Feb-Mar 2020",
      "estimatedDrawdown": -25,
      "recoveryTime": "6 months",
      "explanation": "Rapid selloff but quick recovery due to Fed intervention"
    },
    {
      "scenario": "2022 Bear Market",
      "historicalDates": "Jan-Oct 2022",
      "estimatedDrawdown": -20,
      "recoveryTime": "12-18 months",
      "explanation": "Interest rate hikes caused prolonged drawdown in growth assets"
    }
  ],
  "liquidityAnalysis": {
    "averageDailyVolume": "High - all selected assets trade millions of shares daily",
    "liquidityScore": 95,
    "liquidityRisks": ["None - all assets are highly liquid ETFs"],
    "timeToLiquidate": "Same day for full portfolio"
  },
  "rebalancingStrategy": {
    "frequency": "Quarterly",
    "thresholdBands": "5% drift tolerance",
    "taxConsiderations": "Specific tax optimization strategies"
  },
  "keyInsights": [
    "Important insight about the portfolio",
    "Another key consideration"
  ]
}

CRITICAL: 
- All weights must sum to 100
- Be specific and data-driven in your rationales
- The "whyThisFitsProfile" field should directly reference the investor's specific inputs (time horizon, risk tolerance, sector preferences)
- Include realistic drawdown scenarios based on actual 2020 COVID and 2022 bear market data`;

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
        max_tokens: 5000,
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

    // Parse JSON from response (handle markdown code blocks)
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    const portfolioAdvice = JSON.parse(jsonStr.trim());

    console.log("[AI Portfolio Advisor] Successfully generated portfolio:", portfolioAdvice.portfolioName);

    return new Response(JSON.stringify({ 
      success: true, 
      data: portfolioAdvice 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[AI Portfolio Advisor] Error:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
