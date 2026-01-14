import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface KeyMetrics {
  expectedReturn?: string;
  volatility?: string;
  maxDrawdown?: string;
  sharpRatio?: string;
  timeHorizon?: string;
}

interface InvestorProfile {
  riskScore: number;
  riskLabel: string;
  investorType: string;
  investorTypeName: string;
  timeHorizon: number;
  goalAmount: number;
  keyMetrics?: KeyMetrics;
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

    // Log the received profile data for debugging
    console.log("Received profile:", {
      goalAmount: profile.goalAmount,
      keyMetrics: profile.keyMetrics,
      investmentAmountFromResponses: profile.responses?.investmentAmount,
      goalAmountFromResponses: profile.responses?.['goal-amount'],
    });

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
    const goalPrimary = getVal(profile.responses['goal-purpose'], 'wealth-growth');
    const goalTimeline = getVal(profile.responses['goal-timeline'], 10);
    
    // IMPORTANT: Distinguish between investment amount and goal amount
    // financial-investment-capital = the amount they're actually investing now (scoringKey from questionnaire)
    // goal-amount = their target wealth goal they want to reach
    const savedInvestmentAmount = profile.responses?.investmentAmount;
    // Check both the scoringKey (financial-investment-capital) and legacy key (investment-capital)
    const financialInvestmentCapital = getVal(profile.responses['financial-investment-capital'], null);
    const investmentCapitalFromQ = getVal(profile.responses['investment-capital'], null);
    const goalAmountFromQ = getVal(profile.responses['goal-amount'], null);
    
    // Investment amount (what they have to invest now) - check all possible keys
    // IMPORTANT: allow legitimate small amounts like $1 (avoid "> 0" checks here)
    const investmentAmount =
      (savedInvestmentAmount !== undefined && savedInvestmentAmount !== null && typeof savedInvestmentAmount === 'number')
        ? savedInvestmentAmount
        : (financialInvestmentCapital !== undefined && financialInvestmentCapital !== null && typeof financialInvestmentCapital === 'number')
          ? financialInvestmentCapital
          : (investmentCapitalFromQ !== undefined && investmentCapitalFromQ !== null && typeof investmentCapitalFromQ === 'number')
            ? investmentCapitalFromQ
            : (profile.goalAmount !== undefined && profile.goalAmount !== null && typeof profile.goalAmount === 'number')
              ? profile.goalAmount
              : 50000; // Only use fallback if nothing is provided
    
    // Goal amount (their target/dream number they want to reach)
    const targetGoalAmount = goalAmountFromQ && typeof goalAmountFromQ === 'number' && goalAmountFromQ > 0
      ? goalAmountFromQ
      : 0; // 0 means no specific target was set
      
    // Liquid net worth - check both scoringKey (financial-liquid-net-worth) and legacy key
    const financialLiquidNetWorth = getVal(profile.responses['financial-liquid-net-worth'], null);
    const liquidNetWorth = financialLiquidNetWorth && typeof financialLiquidNetWorth === 'number' 
      ? financialLiquidNetWorth 
      : getVal(profile.responses['liquid-net-worth'], 0);
    
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

    const systemPrompt = `You are a financial education assistant creating an investment education document. You provide general financial concepts and educational frameworks - NOT personalized investment advice.

CRITICAL GUIDELINES:
- This is EDUCATIONAL content with SUGGESTED frameworks, not investment advice
- Use phrases like "consider exploring", "one approach is", "many investors find", "you might explore"
- NEVER say "I recommend", "you should invest", "your plan", or give direct advice
- Do NOT start with any greeting, flattery, or phrases like "It's a privilege" or "I'm honored" or "Dear" - jump straight into the content
- Start directly with the first section header "## Understanding Your Investment Approach"
- The "Current Investment Capital" shown is the amount they plan to invest NOW, not a goal
- The "Target Wealth Goal" (if shown) is their aspirational target they want to grow toward over time
- Make the distinction clear: investment capital = what they have now to invest; goal = what they want to achieve
- Explain concepts and tradeoffs without prescribing specific actions
- Do NOT recommend specific funds, ETFs, or securities by name
- Focus on asset allocation education, behavioral concepts, and investment philosophy
- Be educational and approachable, like a knowledgeable friend explaining concepts`;

    // Map goal primary to readable text
    const goalPrimaryMap: Record<string, string> = {
      'wealth-growth': 'Long-term wealth accumulation',
      'wealth-building': 'Building wealth over time',
      'retirement': 'Building a retirement nest egg',
      'financial-independence': 'Achieving financial independence',
      'house-purchase': 'Saving for a major purchase',
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

    // Format amounts nicely for the prompt
    const formatAmount = (amount: number): string => {
      if (amount >= 1000000) {
        return `$${(amount / 1000000).toFixed(amount % 1000000 === 0 ? 0 : 1)} million`;
      } else if (amount >= 1000) {
        return `$${(amount / 1000).toFixed(0)},000`;
      }
      return `$${amount.toLocaleString()}`;
    };
    
    const formattedInvestmentAmount = formatAmount(investmentAmount);
    const formattedGoalAmount = targetGoalAmount > 0 ? formatAmount(targetGoalAmount) : 'Not specified';
    const formattedLiquidNetWorth = liquidNetWorth > 0 ? formatAmount(liquidNetWorth) : 'Not specified';

    // Get key metrics from profile or calculate defaults
    const keyMetrics = profile.keyMetrics || {};
    const targetReturn = keyMetrics.expectedReturn || `${(4 + profile.riskScore * 0.06).toFixed(1)}%`;
    const targetVolatility = keyMetrics.volatility || `${(6 + profile.riskScore * 0.14).toFixed(1)}%`;
    const targetMaxDrawdown = keyMetrics.maxDrawdown || `-${(10 + profile.riskScore * 0.25).toFixed(0)}%`;
    const targetSharpe = keyMetrics.sharpRatio || '0.50';

    const userPrompt = `Create an educational investment framework document for ${profile.userName}.

CRITICAL: Start directly with "## Understanding Your Investment Approach" - NO greeting, NO flattery, NO "Dear", NO "It's a privilege".

IMPORTANT DISTINCTION:
- "Current Investment Capital" (${formattedInvestmentAmount}) = The amount they have available to invest NOW
- "Target Wealth Goal" (${formattedGoalAmount}) = What they WANT their wealth to grow to over time (this is an aspiration, not what they have)
Make this distinction clear throughout the document.

## INVESTOR PROFILE DATA:
- Risk Score: ${profile.riskScore}/100 (${profile.riskLabel})
- Investor Archetype: ${profile.investorTypeName} (Code: ${profile.investorType})
- Investment Horizon: ${profile.timeHorizon} years
- Current Investment Capital: ${formattedInvestmentAmount} (amount available to invest now)
${targetGoalAmount > 0 ? `- Target Wealth Goal: ${formattedGoalAmount} (aspirational target to grow toward)` : ''}
${liquidNetWorth > 0 ? `- Liquid Net Worth: ${formattedLiquidNetWorth}` : ''}
- Primary Goal: ${goalPrimaryText}

## TARGET PERFORMANCE METRICS (suggested based on profile):
- Suggested Annual Return Target: ${targetReturn}
- Suggested Max Drawdown Tolerance: ${targetMaxDrawdown}
- Expected Volatility Range: ${targetVolatility}
- Target Sharpe Ratio: ${targetSharpe}

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

## SUGGESTED ALLOCATION FRAMEWORK:
${profile.allocation?.map(a => `- ${a.category}: ${a.percentage}%`).join('\n') || 'To be determined based on profile'}

---

Write an educational investment framework document with these sections (use markdown formatting):

CRITICAL: Start the document immediately with "## Understanding Your Investment Approach" - do NOT include any greeting, salutation, or introductory flattery.

## Understanding Your Investment Approach
Write 2-3 paragraphs explaining the investment philosophy concepts suited to their archetype. Make it educational - explain WHY this approach commonly fits this personality type. Reference their stated primary goal of "${goalPrimaryText}". Use phrases like "investors with your profile often find" rather than "you should".

## Suggested Portfolio Framework
Explain the rationale behind the suggested allocation. With their current investment capital of ${formattedInvestmentAmount} and a ${profile.timeHorizon}-year timeline, explain why these percentages are commonly used.${targetGoalAmount > 0 ? ` Note: Their target wealth goal is ${formattedGoalAmount} - this is what they're working TOWARD, not what they currently have.` : ''}

Reference their target metrics:
- Goal annual return of ${targetReturn} (realistic given their ${profile.riskLabel} risk profile)
- Maximum drawdown tolerance of ${targetMaxDrawdown}
- Expected volatility of ${targetVolatility}
- Target Sharpe ratio of ${targetSharpe}

Discuss how the allocation balances growth potential with their stated risk tolerance of ${riskTolerance}%. Compare these goals to historical S&P 500 benchmarks where relevant (historical ~10% annualized return, ~15% volatility, 30-50% drawdowns in crashes).

## What to Track: Your Monitoring Dashboard

### Daily Check-ins (2-3 minutes)
Explain what they should briefly glance at daily:
- **Portfolio pulse**: Quick check if anything unusual happened (major single-day moves > 3%)
- **Market headlines**: Brief scan of major financial news (Fed announcements, earnings surprises)
- Why this matters: Early awareness prevents panic; you'll see context before others explain it

### Weekly Reviews (15-20 minutes)
What they should review weekly:
- **Portfolio performance**: Compare against their benchmark (e.g., S&P 500 for US equities portion)
- **Sector rotation**: Which sectors are leading/lagging (Technology, Healthcare, Financials, Energy)
- **Currency movements**: USD strength/weakness affects international holdings
- **Bond yields**: 10-year Treasury yield direction (rising yields = bond prices fall, affects rate-sensitive stocks)
- Suggested day: Sunday evening or Monday morning

### Monthly Deep Dives (1-2 hours)
What they should analyze monthly:
- **Economic indicators**:
  - Inflation (CPI, PCE): Affects Fed policy and purchasing power
  - Employment (jobs report, unemployment rate): Economic health indicator
  - Consumer sentiment: Leading indicator of spending patterns
  - PMI (Purchasing Managers Index): Manufacturing/services expansion or contraction
- **Interest rate outlook**: Fed meeting outcomes and forward guidance
- **Global markets**: International equity performance, emerging markets trends
- **Commodity prices**: Oil, gold, copper (economic bellwethers)
- **Portfolio rebalancing check**: Has any allocation drifted more than 5% from target?

### Quarterly Strategy Sessions (2-3 hours)
What they should do quarterly:
- Full portfolio rebalancing if needed
- Tax-loss harvesting review (especially Q4)
- Review of any life changes affecting investment goals
- Earnings season analysis for major holdings
- Adjust target allocation if circumstances have changed

### Key Economic Calendar Events to Watch
Teach them about important recurring dates:
- **First Friday of month**: Jobs report (Non-Farm Payrolls)
- **Mid-month**: CPI inflation data
- **Every 6 weeks**: Federal Reserve FOMC meetings
- **Quarterly**: GDP releases, earnings seasons (Jan, Apr, Jul, Oct)

## Behavioral Considerations
Based on their archetype (${profile.investorTypeName}) and their stated downturn response, explain 3-4 behavioral patterns they may want to be aware of. Frame these as "investors with this profile often benefit from..." rather than direct advice.

## Volatility Framework
Given that they said they would "${riskScenario === 'buy-more' ? 'buy more' : riskScenario === 'hold' ? 'hold' : riskScenario === 'sell-some' ? 'sell some' : 'sell all'}" during a 20% market decline, provide educational context about handling volatility. Explain what different approaches look like and their tradeoffs.

## Suggested Implementation Framework
Provide a general phased approach that investors often use:
1. Getting started considerations (Week 1)
2. Initial setup concepts (Month 1)
3. Ongoing review concepts (Quarterly/Annually)

Their preferred involvement level is ${prefInvolvement < 30 ? 'minimal - they prefer hands-off approaches' : prefInvolvement < 70 ? 'moderate - they want some involvement' : 'high - they enjoy active engagement'}, so tailor the framework accordingly.

## Risk Factors to Be Aware Of
List 3-4 specific risks this type of investor profile typically considers. Be educational and informative. Include both portfolio-specific concepts and macroeconomic factors.

## Learning Resources
Provide 2-3 educational concepts they may want to learn about:
- Topics relevant to their allocation (e.g., if bonds: duration risk, yield curves)
- How to interpret the indicators mentioned above
- Building financial literacy over time

## Long-Term Perspective
A closing section with perspective on long-term investing over their ${profile.timeHorizon}-year horizon. ${visionSuccess ? `Reference their stated vision: "${visionSuccess}"` : ''} Include historical context about market returns.

## Important Disclaimer
End with: "**Disclaimer:** This document is for educational purposes only and does not constitute personalized investment advice. Past performance does not guarantee future results. Consider consulting with a qualified financial advisor before making investment decisions."

Remember: This is EDUCATIONAL content. Use phrases like "consider", "one approach", "investors often", "you may want to explore" instead of "you should" or "I recommend". Reference their profile data to make it relevant, but frame everything as education, not advice.`;

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
