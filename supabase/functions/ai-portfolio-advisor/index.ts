import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { investorProfile } = await req.json() as { investorProfile: InvestorProfile };
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log('[AI Portfolio Advisor] Processing profile:', JSON.stringify(investorProfile));

    const systemPrompt = `You are an institutional-grade portfolio advisor with expertise in modern portfolio theory, factor investing, and risk management. You provide detailed, actionable portfolio recommendations based on investor profiles.

Your analysis should be grounded in:
- Modern Portfolio Theory (Markowitz)
- Black-Litterman model principles
- Factor investing (Fama-French)
- Risk parity concepts
- J.P. Morgan's 60/40+ framework for alternative allocations

Always provide specific ETF tickers that are liquid and accessible to retail investors.`;

    const userPrompt = `Analyze this investor profile and create an optimal portfolio allocation:

**Investor Profile:**
- Investable Capital: $${investorProfile.investableCapital.toLocaleString()}
- Liquidity Constraint: ${investorProfile.liquidityConstraint} (${investorProfile.liquidityConstraint === 'high' ? 'needs access within 30 days' : investorProfile.liquidityConstraint === 'locked' ? 'can hold 5+ years' : 'moderate flexibility'})
- Asset Universe: ${investorProfile.assetUniverse.join(', ')}
- Risk Tolerance: ${investorProfile.riskTolerance}/100 (${investorProfile.riskTolerance > 70 ? 'aggressive' : investorProfile.riskTolerance > 40 ? 'moderate' : 'conservative'})
- Tax Bracket: ${investorProfile.taxBracket}
- Investment Horizon: ${investorProfile.investmentHorizon} years

Provide your response as a JSON object with this exact structure:
{
  "portfolioName": "Descriptive name for this portfolio strategy",
  "strategy": "Brief description of the overall strategy approach",
  "expectedAnnualReturn": 8.5,
  "expectedVolatility": 12.0,
  "sharpeRatio": 0.58,
  "maxDrawdownEstimate": -25,
  "drawdownRecoveryMonths": 18,
  "allocations": [
    {
      "symbol": "VTI",
      "name": "Vanguard Total Stock Market ETF",
      "weight": 40,
      "assetClass": "stocks",
      "rationale": "Core US equity exposure with low expense ratio...",
      "expectedReturn": 9.5,
      "volatility": 18,
      "idealHoldPeriod": "5+ years"
    }
  ],
  "riskAnalysis": {
    "tailRisk": "Description of tail risk exposure",
    "correlationBenefit": "How assets diversify each other",
    "regimeConsiderations": "How portfolio performs in different market regimes"
  },
  "drawdownScenarios": [
    {
      "scenario": "2008-style Financial Crisis",
      "estimatedDrawdown": -35,
      "recoveryTime": "24-36 months",
      "explanation": "Why this drawdown is expected"
    },
    {
      "scenario": "2020 COVID Crash",
      "estimatedDrawdown": -25,
      "recoveryTime": "6-12 months",
      "explanation": "Why this drawdown is expected"
    }
  ],
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

Ensure all weights sum to 100. Be specific and data-driven in your rationales.`;

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
        max_tokens: 4000,
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

    console.log("[AI Portfolio Advisor] Raw response:", content.substring(0, 500));

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
