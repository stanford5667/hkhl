import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvestorProfile {
  riskScore: number;
  riskLabel: string;
  investorType: string;
  investorTypeName: string;
  timeHorizon: number;
  goalAmount: number;
  allocation: Array<{ category: string; percentage: number }>;
  responses: Record<string, any>;
  userName: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { profile }: { profile: InvestorProfile } = await req.json();

    // Extract response values safely (handle {value: x} format)
    const getVal = (val: any, def: any = null) => {
      if (val === undefined || val === null) return def;
      if (typeof val === 'object' && 'value' in val) return val.value ?? def;
      return val;
    };

    // Extract ALL questionnaire parameters
    const riskScenario = getVal(profile.responses['risk-scenario'], 'hold');
    const incomeStability = getVal(profile.responses['income-stability'], 'stable');
    const emergencyFund = getVal(profile.responses['emergency-fund'], 6);
    const prefStyle = getVal(profile.responses['pref-style'], 'balanced');
    const prefAssets = getVal(profile.responses['pref-assets'], []);
    const riskExperience = getVal(profile.responses['risk-experience'], 'watched');
    const riskTolerance = getVal(profile.responses['risk-tolerance'], 20);
    
    // Additional parameters for comprehensive strategy
    const goalPrimary = getVal(profile.responses['goal-primary'], 'wealth-growth');
    const goalTimeline = getVal(profile.responses['goal-timeline'], 10);
    const goalAmount = getVal(profile.responses['goal-amount'], 50000);
    const existingAssets = getVal(profile.responses['existing-assets'], []);
    const prefInvolvement = getVal(profile.responses['pref-involvement'], 50);
    const prefDiversification = getVal(profile.responses['pref-diversification'], 50);
    const visionSuccess = getVal(profile.responses['vision-success'], '');
    
    // Personality dimension responses
    const personalityJourney = getVal(profile.responses['personality-journey'], null);
    const personalityDinnerParty = getVal(profile.responses['personality-dinner-party'], null);
    const personalityRegret = getVal(profile.responses['personality-regret'], null);
    const personalityRestaurant = getVal(profile.responses['personality-restaurant'], null);
    const personalityGardening = getVal(profile.responses['personality-gardening'], null);
    const personalityWinner = getVal(profile.responses['personality-winner'], null);
    const personalityBuffet = getVal(profile.responses['personality-buffet'], null);
    const personalityWisdom = getVal(profile.responses['personality-wisdom'], null);

    const systemPrompt = `You are a sophisticated financial advisor with expertise in behavioral finance and portfolio construction. Your role is to create deeply personalized, thoughtful investment strategies that feel like they were written by a caring advisor who truly understands the investor.

Your responses should be:
- Warm yet professional - like advice from a trusted mentor
- Specific to their actual situation, not generic
- Psychologically insightful about their investor personality
- Actionable with clear next steps
- Honest about both opportunities and risks they should watch for

CRITICAL: Do NOT recommend specific funds, ETFs, or securities. Focus on asset allocation percentages, investment philosophy, behavioral guidance, and implementation principles.`;

    // Map goal primary to readable text
    const goalPrimaryMap: Record<string, string> = {
      'wealth-growth': 'Long-term wealth accumulation',
      'retirement': 'Building a retirement nest egg',
      'income': 'Generating passive income',
      'preservation': 'Preserving existing wealth'
    };
    const goalPrimaryText = goalPrimaryMap[goalPrimary as string] || 'Wealth growth';

    // Map income stability to readable text
    const incomeStabilityMap: Record<string, string> = {
      'very-stable': 'Very stable (secure employment)',
      'stable': 'Mostly stable with some variability',
      'variable': 'Variable (freelance/commission)',
      'uncertain': 'Uncertain (entrepreneur/startup)'
    };
    const incomeStabilityText = incomeStabilityMap[incomeStability as string] || String(incomeStability);

    // Map investment style to readable text
    const prefStyleMap: Record<string, string> = {
      'passive': 'Index/Passive investing',
      'active': 'Active management',
      'value': 'Value investing',
      'growth': 'Growth investing',
      'income': 'Income/dividend focused'
    };
    const prefStyleText = prefStyleMap[prefStyle as string] || String(prefStyle);

    const userPrompt = `Create a comprehensive, personalized investment strategy for ${profile.userName}.

## INVESTOR PROFILE DATA:
- Risk Score: ${profile.riskScore}/100 (${profile.riskLabel})
- Investor Archetype: ${profile.investorTypeName} (Code: ${profile.investorType})
- Investment Horizon: ${profile.timeHorizon} years
- Target Investment: $${profile.goalAmount?.toLocaleString() || '50,000'}
- Primary Goal: ${goalPrimaryText}

## FINANCIAL SITUATION:
- Income Stability: ${incomeStabilityText}
- Emergency Fund: ${emergencyFund} months of expenses
- Current Holdings: ${Array.isArray(existingAssets) && existingAssets.length > 0 ? existingAssets.join(', ') : 'Starting fresh'}

## BEHAVIORAL INSIGHTS:
- Market Downturn Response: ${riskScenario === 'buy-more' ? 'Would buy more (contrarian)' : riskScenario === 'hold' ? 'Would hold steady' : riskScenario === 'sell-some' ? 'Would sell some (cautious)' : 'Would exit entirely (risk-averse)'}
- Past Experience with Volatility: ${riskExperience === 'bought' ? 'Has bought during dips before' : riskExperience === 'held' ? 'Has held through volatility' : riskExperience === 'watched' ? 'Has watched from sidelines' : 'No prior experience with major drops'}
- Stated Loss Tolerance: Up to ${riskTolerance}% decline

## INVESTMENT PREFERENCES:
- Investment Style: ${prefStyleText}
- Asset Class Interests: ${Array.isArray(prefAssets) && prefAssets.length > 0 ? prefAssets.join(', ') : 'No specific preferences'}
- Desired Involvement Level: ${prefInvolvement < 30 ? 'Hands-off (set and forget)' : prefInvolvement < 70 ? 'Moderate involvement' : 'Very hands-on (active management)'}
- Diversification Preference: ${prefDiversification < 30 ? 'Prefer concentration in best ideas' : prefDiversification < 70 ? 'Balanced diversification' : 'Maximum diversification'}

## INVESTOR PERSONALITY (from behavioral questions):
${personalityJourney ? `- Journey metaphor: ${personalityJourney}` : ''}
${personalityDinnerParty ? `- Information processing: ${personalityDinnerParty}` : ''}
${personalityRegret ? `- Core fear: ${personalityRegret === 'gains' ? 'Missing out on gains' : 'Losing money'}` : ''}
${personalityRestaurant ? `- Decision style: ${personalityRestaurant}` : ''}
${personalityGardening ? `- Management approach: ${personalityGardening}` : ''}
${personalityWinner ? `- Profit taking: ${personalityWinner}` : ''}
${personalityBuffet ? `- Allocation instinct: ${personalityBuffet}` : ''}
${personalityWisdom ? `- Investment philosophy: ${personalityWisdom}` : ''}

## VISION FOR SUCCESS:
${visionSuccess ? `"${visionSuccess}"` : 'Financial independence and security'}

## TARGET ALLOCATION:
${profile.allocation?.map(a => `- ${a.category}: ${a.percentage}%`).join('\n') || 'To be determined based on profile'}

---

Write a comprehensive investment strategy document with these sections (use markdown formatting):

## Your Investment Philosophy
Write 2-3 paragraphs explaining the core investment philosophy suited to their archetype. Make it personal - address them by name. Explain WHY this approach fits their personality, not just what it is. Reference their stated primary goal of "${goalPrimaryText}".

## Portfolio Construction Strategy
Explain the rationale behind their target allocation. Why these percentages make sense for their specific situation, timeline, and goals. Discuss how the allocation balances growth potential with their stated risk tolerance of ${riskTolerance}%.

## Behavioral Guardrails
Based on their archetype (${profile.investorTypeName}) and their stated downturn response, provide 3-4 specific behavioral rules they should follow. These should feel like wisdom from an experienced mentor who knows their tendencies.

## Market Volatility Playbook
Given that they said they would "${riskScenario === 'buy-more' ? 'buy more' : riskScenario === 'hold' ? 'hold' : riskScenario === 'sell-some' ? 'sell some' : 'sell all'}" during a 20% market decline, provide tailored advice for handling volatility. Include specific thresholds and actions.

## Implementation Roadmap
Provide a phased approach to building their portfolio:
1. Immediate actions (Week 1)
2. Short-term setup (Month 1)
3. Ongoing management (Quarterly/Annually)

Their preferred involvement level is ${prefInvolvement < 30 ? 'minimal - they want this to be automated' : prefInvolvement < 70 ? 'moderate - they want some control' : 'high - they enjoy active management'}, so tailor recommendations accordingly.

## Risk Factors to Monitor
List 3-4 specific risks this investor should watch for, given their profile. Be honest but constructive.

## Long-Term Perspective
A closing section with motivational but realistic perspective on their ${profile.timeHorizon}-year journey. ${visionSuccess ? `Connect to their stated vision: "${visionSuccess}"` : ''} Include expected range of outcomes.

Remember: Be specific to THEIR situation. Reference their actual numbers and responses. This should feel like it was written just for them.`;

    console.log("Calling Lovable AI for investment strategy generation...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const strategy = data.choices?.[0]?.message?.content;

    if (!strategy) {
      throw new Error("No strategy content generated");
    }

    console.log("Strategy generated successfully");

    return new Response(
      JSON.stringify({ 
        strategy,
        generatedAt: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error generating investment strategy:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Failed to generate strategy",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
