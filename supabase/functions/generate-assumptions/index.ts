import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ========== KILL SWITCH - SET TO FALSE TO DISABLE ALL API CALLS ==========
const ENABLE_LOVABLE_AI = false;
// ==========================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // KILL SWITCH - Return early if API is disabled
  if (!ENABLE_LOVABLE_AI) {
    console.log('[API BLOCKED] generate-assumptions - Lovable AI disabled');
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'AI API disabled for testing',
        assumptions: null,
        isBlocked: true
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { historical_data, interview_responses, company_name } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating assumptions for:', company_name);
    console.log('Interview responses:', JSON.stringify(interview_responses));

    const systemPrompt = `You are a private equity financial modeling expert. Based on the historical financial data and management interview responses, generate realistic projection assumptions for a 5-year cash flow model.

IMPORTANT: Return ONLY valid JSON, no markdown, no code blocks.

Consider:
1. Historical trends and margins from the data
2. Management's growth expectations and strategic plans
3. Industry benchmarks and realistic constraints
4. Capital expenditure needs based on growth plans
5. Working capital requirements

Return this exact JSON structure with assumptions as decimals (e.g., 10% = 0.10):
{
  "success": true,
  "assumptions": {
    "revenue_growth": 0.10,
    "ebitda_margin": 0.20,
    "capex_pct": 0.03,
    "nwc_pct": 0.10,
    "tax_rate": 0.25,
    "da_pct": 0.04,
    "interest_rate": 0.08
  },
  "rationale": {
    "revenue_growth": "Based on historical 8% growth and management's expansion plans, projecting 10% CAGR",
    "ebitda_margin": "Historical margins of 18-20%, expecting slight improvement to 20% with scale",
    "capex_pct": "Maintenance capex of ~3% of revenue based on asset base",
    "nwc_pct": "Historical NWC/Revenue of 10%, expecting stable working capital cycle",
    "tax_rate": "Blended corporate tax rate of 25%",
    "da_pct": "D&A at 4% of revenue based on PP&E depreciation schedule",
    "interest_rate": "Current borrowing rate on senior debt facilities"
  },
  "key_drivers": [
    "New market expansion driving revenue acceleration",
    "Operational improvements supporting margin expansion",
    "Limited capex needs due to asset-light model"
  ],
  "risks": [
    "Execution risk on expansion plans",
    "Potential margin pressure from competition",
    "Working capital build from growth"
  ]
}`;

    const historicalSummary = historical_data ? `
Historical Financial Data:
- Revenue (latest): $${historical_data.calculated_metrics?.latest_revenue || 'N/A'}M
- EBITDA (latest): $${historical_data.calculated_metrics?.latest_ebitda || 'N/A'}M
- Historical EBITDA Margins: ${JSON.stringify(historical_data.calculated_metrics?.ebitda_margin_pct || {})}
- Avg Revenue Growth: ${((historical_data.calculated_metrics?.avg_revenue_growth || 0) * 100).toFixed(1)}%
- Years of data: ${historical_data.historical_years?.join(', ') || 'N/A'}
` : 'No historical data provided';

    const interviewSummary = interview_responses ? `
Management Interview Responses:
${Object.entries(interview_responses).map(([q, a]) => `- ${q}: ${a}`).join('\n')}
` : 'No interview responses provided';

    const userPrompt = `Generate projection assumptions for ${company_name}.

${historicalSummary}

${interviewSummary}

Based on this information, provide realistic 5-year projection assumptions.`;

    console.log('Calling Lovable AI for assumptions generation...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limit exceeded. Please try again.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ success: false, error: 'AI generation failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ success: false, error: 'No response from AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('AI response:', content.substring(0, 500));

    // Parse JSON response
    let result;
    try {
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```json')) cleanContent = cleanContent.slice(7);
      else if (cleanContent.startsWith('```')) cleanContent = cleanContent.slice(3);
      if (cleanContent.endsWith('```')) cleanContent = cleanContent.slice(0, -3);
      
      result = JSON.parse(cleanContent.trim());
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to parse assumptions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    result.success = true;
    
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
