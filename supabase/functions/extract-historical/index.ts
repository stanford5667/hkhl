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
    console.log('[API BLOCKED] extract-historical - Lovable AI disabled');
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'AI API disabled for testing',
        data: null,
        isBlocked: true
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { file_data, file_name, company_name } = await req.json();

    if (!file_data) {
      return new Response(
        JSON.stringify({ success: false, error: 'No file data provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Extracting historical financials from: ${file_name}`);
    console.log(`File content preview: ${file_data.substring(0, 500)}`);

    const systemPrompt = `You are a financial data extraction expert. Extract ONLY HISTORICAL (actual/reported) financial data from the provided spreadsheet content.

CRITICAL RULES:
1. ONLY extract data from ACTUAL/HISTORICAL years - typically labeled as "Actual", "Historical", "FY", or past calendar years
2. DO NOT extract any PROJECTED, FORECASTED, or ESTIMATED values - ignore columns labeled "Projected", "Forecast", "Budget", "Plan", "Est", or future years
3. If a year has both actual and projected values, only use the actual values
4. Return ONLY valid JSON, no markdown, no code blocks, no explanations

Extract these line items for HISTORICAL years only:
- Revenue/Net Sales
- EBITDA  
- Net Income
- Depreciation & Amortization
- Capital Expenditures (CapEx)
- Accounts Receivable
- Inventory
- Accounts Payable
- Total Debt
- Cash & Equivalents

Calculate from historical data:
- EBITDA margin (EBITDA / Revenue) for each year
- Average year-over-year revenue growth
- Working capital metrics if balance sheet data available

Return this exact JSON structure:
{
  "success": true,
  "company_name": "Company Name",
  "currency": "USD",
  "units": "millions",
  "historical_years": ["2022", "2023", "2024"],
  "income_statement": {
    "revenue": {"2022": 100, "2023": 110, "2024": 121},
    "ebitda": {"2022": 20, "2023": 23, "2024": 27},
    "cogs": {},
    "gross_profit": {},
    "depreciation_amortization": {"2022": 5, "2023": 6, "2024": 7},
    "operating_income": {},
    "interest_expense": {},
    "net_income": {}
  },
  "balance_sheet": {
    "cash": {},
    "accounts_receivable": {},
    "inventory": {},
    "accounts_payable": {},
    "total_debt": {}
  },
  "cash_flow": {
    "capex": {},
    "operating_cash_flow": {},
    "free_cash_flow": {}
  },
  "calculated_metrics": {
    "ebitda_margin_pct": {"2022": 0.20, "2023": 0.21, "2024": 0.22},
    "avg_revenue_growth": 0.10,
    "latest_revenue": 121,
    "latest_ebitda": 27,
    "dso_days": 45,
    "dio_days": 30,
    "dpo_days": 35
  },
  "data_quality": {
    "completeness_score": "high",
    "years_extracted": 3,
    "missing_items": [],
    "assumptions_made": [],
    "excluded_projections": ["2025E", "2026E"]
  }
}

If you cannot find certain data, leave those fields empty. Note any projections you excluded in data_quality.excluded_projections.`;

    const userPrompt = `Extract ONLY historical financial data from this file. Exclude any projected/forecasted values.
Company name hint: ${company_name || 'Unknown'}
File name: ${file_name}

File content:
${file_data.substring(0, 15000)}`;

    console.log('Calling Lovable AI for historical extraction...');

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
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'AI credits exhausted.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ success: false, error: 'AI extraction failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      console.error('No content in AI response');
      return new Response(
        JSON.stringify({ success: false, error: 'No extraction result' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('AI response:', content.substring(0, 500));

    let extractedData;
    try {
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```json')) cleanContent = cleanContent.slice(7);
      else if (cleanContent.startsWith('```')) cleanContent = cleanContent.slice(3);
      if (cleanContent.endsWith('```')) cleanContent = cleanContent.slice(0, -3);
      
      extractedData = JSON.parse(cleanContent.trim());
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to parse extracted data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    extractedData.success = true;
    
    console.log('Successfully extracted historical financials');
    
    return new Response(
      JSON.stringify(extractedData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in extract-historical function:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
