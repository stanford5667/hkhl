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
    console.log('[API BLOCKED] extract-company-financials - Lovable AI disabled');
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'AI API disabled for testing',
        extracted_fields: {},
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

    console.log(`Extracting company financials from: ${file_name}`);
    console.log(`File content preview: ${file_data.substring(0, 300)}`);

    const systemPrompt = `You are a financial data extraction expert for private equity due diligence. Extract key financial metrics and company data from the provided document.

EXTRACT THESE FIELDS (use the LATEST/LTM values when available):

FINANCIAL METRICS:
- revenue_ltm: Latest Twelve Months Revenue (in millions USD)
- ebitda_ltm: Latest Twelve Months EBITDA (in millions USD)
- ebitda_margin: EBITDA Margin as percentage (e.g., 25 for 25%)
- gross_margin: Gross Margin as percentage
- net_income: Net Income (in millions USD)
- revenue_growth_yoy: Year-over-year revenue growth as percentage
- revenue_cagr_3yr: 3-year revenue CAGR as percentage
- recurring_revenue_pct: Recurring revenue as percentage of total

BALANCE SHEET:
- total_debt: Total Debt (in millions USD)
- cash: Cash & Equivalents (in millions USD)
- net_debt: Net Debt (in millions USD)

COMPANY INFO:
- employee_count: Number of employees
- customer_count: Number of customers
- customer_concentration: Top 10 customer concentration as percentage
- nrr: Net Revenue Retention as percentage
- churn_rate: Customer churn rate as percentage

DEAL METRICS:
- asking_price: Asking price or enterprise value (in millions USD)
- ev_ebitda_multiple: EV/EBITDA multiple

CRITICAL RULES:
1. Extract ONLY values explicitly stated in the document
2. For financial values, normalize to millions USD
3. For percentages, use the number only (e.g., 25 not 0.25)
4. Include the exact excerpt where you found each value
5. Assign confidence: 0.9+ for clearly stated values, 0.7-0.9 for derived/calculated, 0.5-0.7 for inferred
6. Return ONLY valid JSON, no markdown, no explanations

Return this JSON structure:
{
  "success": true,
  "extracted_fields": {
    "revenue_ltm": { "value": 45.2, "confidence": 0.95, "excerpt": "LTM Revenue of $45.2M" },
    "ebitda_ltm": { "value": 8.5, "confidence": 0.9, "excerpt": "EBITDA: $8.5 million" },
    ...
  },
  "document_type": "cim|financials|model|teaser|presentation|other",
  "fiscal_year_end": "December",
  "currency": "USD",
  "data_as_of": "Q3 2024"
}

If a field cannot be found, DO NOT include it in the response.`;

    const userPrompt = `Extract financial data from this document.
Company: ${company_name || 'Unknown'}
File: ${file_name}

Document content:
${file_data.substring(0, 20000)}`;

    console.log('Calling Lovable AI for financial extraction...');

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
      console.error('Raw content:', content);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to parse extracted data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    extractedData.success = true;
    extractedData.source_file = file_name;
    
    console.log('Successfully extracted company financials:', Object.keys(extractedData.extracted_fields || {}).length, 'fields');
    
    return new Response(
      JSON.stringify(extractedData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in extract-company-financials function:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
