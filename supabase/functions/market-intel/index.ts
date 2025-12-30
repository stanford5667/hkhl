import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Different query types for market intel
type IntelType = 'company_news' | 'competitors' | 'industry_trends' | 'ma_activity' | 'market_data' | 'regulatory' | 'earnings_events';

const SYSTEM_PROMPTS: Record<IntelType, string> = {
  company_news: `You are a financial research analyst. Find recent news about the specified company.
Return ONLY valid JSON (no markdown) with this structure:
{
  "articles": [
    {
      "title": "Article headline",
      "summary": "2-3 sentence summary",
      "source": "Publication name",
      "date": "Relative date like '2 days ago'",
      "url": "URL if available",
      "sentiment": "positive" | "negative" | "neutral",
      "relevance": "high" | "medium" | "low"
    }
  ],
  "keyTakeaway": "One sentence summary of what's happening with this company",
  "signalStrength": "strong" | "moderate" | "weak"
}
Provide 5-8 relevant articles. Focus on announcements, products, leadership, financials, and deals.`,

  competitors: `You are a competitive intelligence analyst. Analyze competitor activity.
Return ONLY valid JSON (no markdown) with this structure:
{
  "competitors": [
    {
      "name": "Competitor name",
      "recentNews": [
        {
          "title": "Headline",
          "summary": "Brief summary",
          "date": "Date",
          "impact": "How this might affect the target company",
          "sentiment": "positive" | "negative" | "neutral"
        }
      ],
      "strategicMoves": "Recent strategic direction",
      "threatLevel": "high" | "medium" | "low"
    }
  ],
  "competitiveLandscapeSummary": "Overall competitive dynamics summary",
  "keyThreats": ["List of competitive threats"],
  "keyOpportunities": ["Opportunities based on competitor weaknesses"]
}`,

  industry_trends: `You are a market research analyst. Analyze industry trends and dynamics.
Return ONLY valid JSON (no markdown) with this structure:
{
  "marketOverview": {
    "currentState": "Brief description of current market state",
    "outlook": "positive" | "neutral" | "negative",
    "outlookRationale": "Why this outlook"
  },
  "trends": [
    {
      "name": "Trend name",
      "description": "What is this trend",
      "impact": "How it affects companies",
      "timeframe": "Current" | "Emerging" | "Long-term",
      "sentiment": "tailwind" | "headwind" | "neutral"
    }
  ],
  "growthDrivers": [
    {
      "driver": "Growth driver name",
      "description": "Brief explanation",
      "strength": "strong" | "moderate" | "weak"
    }
  ],
  "headwinds": [
    {
      "challenge": "Challenge name",
      "description": "Brief explanation",
      "severity": "high" | "medium" | "low"
    }
  ],
  "technologyDisruption": "Key tech changes affecting the industry",
  "consolidationTrend": "M&A and consolidation activity"
}`,

  ma_activity: `You are an M&A analyst. Find recent deals and transaction activity.
Return ONLY valid JSON (no markdown) with this structure:
{
  "recentDeals": [
    {
      "dealName": "Acquirer acquires Target",
      "acquirer": "Acquiring company",
      "target": "Target company",
      "dealValue": "Value if disclosed",
      "multiple": "EV/EBITDA or EV/Revenue multiple if available",
      "date": "Announcement date",
      "status": "Announced" | "Completed" | "Pending",
      "rationale": "Strategic rationale",
      "source": "News source"
    }
  ],
  "dealActivity": {
    "trend": "increasing" | "stable" | "decreasing",
    "description": "Overall M&A environment description"
  },
  "valuationTrends": {
    "evEbitdaRange": "Typical EV/EBITDA range",
    "evRevenueRange": "Typical EV/Revenue range",
    "premiumTrends": "Control premium trends"
  },
  "activeBuyers": ["List of active buyers"],
  "hotSubsectors": ["Subsectors seeing most activity"],
  "outlook": "M&A outlook for next 6-12 months"
}`,

  market_data: `You are a market sizing analyst. Find market size and data.
Return ONLY valid JSON (no markdown) with this structure:
{
  "marketSize": {
    "tam": { "value": "Total addressable market in billions", "year": "Year", "source": "Source" },
    "sam": { "value": "Serviceable market", "description": "What SAM represents" }
  },
  "growth": {
    "historicalCagr": "Historical growth rate",
    "projectedCagr": "Projected growth rate",
    "projectionPeriod": "e.g., 2024-2028",
    "source": "Data source"
  },
  "marketStructure": {
    "fragmentation": "Highly fragmented" | "Moderately consolidated" | "Concentrated",
    "topPlayersMarketShare": "Top 5 combined share",
    "description": "Market structure description"
  },
  "keySegments": [
    { "segment": "Segment name", "size": "Size", "growth": "Growth rate", "trend": "Trend" }
  ],
  "geographicBreakdown": {
    "northAmerica": "% or description",
    "europe": "% or description",
    "asiaPacific": "% or description",
    "other": "% or description"
  },
  "dataConfidence": "high" | "medium" | "low",
  "dataSources": ["List of sources"]
}`,

  regulatory: `You are a regulatory analyst. Find regulatory and policy updates.
Return ONLY valid JSON (no markdown) with this structure:
{
  "recentChanges": [
    {
      "title": "Regulation name",
      "description": "What it entails",
      "effectiveDate": "When it takes effect",
      "impact": "How it affects companies",
      "impactLevel": "high" | "medium" | "low",
      "jurisdiction": "US/EU/Global"
    }
  ],
  "pendingLegislation": [
    {
      "name": "Proposed regulation",
      "status": "Current status",
      "likelihood": "Probability of passing",
      "potentialImpact": "What it would mean"
    }
  ],
  "complianceAlerts": ["Key compliance items"],
  "regulatoryEnvironment": {
    "trend": "Increasing regulation" | "Stable" | "Deregulation",
    "description": "Overall regulatory environment"
  },
  "keyAgencies": ["Relevant regulatory bodies"],
  "riskAreas": ["Areas of regulatory risk"]
}`,

  earnings_events: `You are an events calendar analyst. Find earnings and industry events.
Return ONLY valid JSON (no markdown) with this structure:
{
  "upcomingEarnings": [
    { "company": "Company", "date": "Date", "quarter": "Q1/Q2/Q3/Q4 YYYY", "consensus": "Expectations" }
  ],
  "recentEarnings": [
    { "company": "Company", "date": "Date", "highlights": "Key takeaways", "surprise": "Beat/Miss/In-line", "stockReaction": "Reaction" }
  ],
  "industryEvents": [
    { "event": "Event name", "date": "Date", "location": "Location", "relevance": "Why it matters", "keyCompanies": ["Companies"] }
  ],
  "analystDays": [
    { "company": "Company", "date": "Date", "focus": "Expected topics" }
  ]
}`
};

function buildQuery(type: IntelType, params: { companyName?: string; industry?: string; competitors?: string[] }): string {
  const { companyName, industry, competitors } = params;
  
  switch (type) {
    case 'company_news':
      return `Find the latest news and updates about "${companyName}" company in the ${industry || 'business'} industry. Focus on recent announcements, product launches, leadership changes, financial updates, strategic moves, partnerships, and deals.`;
    
    case 'competitors':
      const competitorList = competitors?.length ? competitors.join(', ') : `major competitors in the ${industry} industry`;
      return `Analyze recent news and activity for competitors of "${companyName}" in the ${industry} industry. Focus on: ${competitorList}. Include their strategic moves and how they might impact ${companyName}.`;
    
    case 'industry_trends':
      return `Analyze current trends and dynamics in the ${industry} industry. Include market state, growth drivers, headwinds, technology disruption, and consolidation trends.`;
    
    case 'ma_activity':
      return `Find recent M&A activity, deals, and transactions in the ${industry} industry. Include deal values, multiples, active buyers, and outlook.`;
    
    case 'market_data':
      return `Find market size and data for the ${industry} industry. Include TAM, SAM, growth rates, market structure, key segments, and geographic breakdown.`;
    
    case 'regulatory':
      return `Find recent regulatory changes, policy updates, and compliance news affecting the ${industry} industry. Include pending legislation and risk areas.`;
    
    case 'earnings_events':
      return `Find upcoming earnings releases, conferences, and industry events relevant to ${industry} industry. ${companyName ? `Companies to track: ${companyName}${competitors?.length ? ', ' + competitors.join(', ') : ''}` : ''}`;
    
    default:
      return `Analyze the ${industry} industry for ${companyName}.`;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, companyName, industry, competitors } = await req.json() as {
      type: IntelType;
      companyName?: string;
      industry?: string;
      competitors?: string[];
    };

    const apiKey = Deno.env.get('PERPLEXITY_API_KEY');
    if (!apiKey) {
      console.error('PERPLEXITY_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Perplexity connector not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const intelType = type || 'company_news';
    console.log(`Fetching ${intelType} intel for:`, companyName, industry);

    const systemPrompt = SYSTEM_PROMPTS[intelType];
    const query = buildQuery(intelType, { companyName, industry, competitors });

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { role: 'system', content: systemPrompt + `\nToday's date is ${new Date().toISOString().split('T')[0]}. Focus on recent information from the last 30 days.` },
          { role: 'user', content: query }
        ],
        search_recency_filter: intelType === 'market_data' ? 'month' : 'week',
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Perplexity API error:', response.status, errorData);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ success: false, error: `API error: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    const citations = data.citations || [];

    console.log('Perplexity response received, parsing...');

    let parsedContent;
    try {
      let jsonStr = content.trim();
      if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7);
      else if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3);
      if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3);
      
      parsedContent = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error('Failed to parse response as JSON:', parseError);
      console.error('Raw content:', content?.substring(0, 500));
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to parse API response',
          rawContent: content?.substring(0, 1000)
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully parsed ${intelType} intel`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        type: intelType,
        data: parsedContent,
        citations,
        fetchedAt: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in market-intel function:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
