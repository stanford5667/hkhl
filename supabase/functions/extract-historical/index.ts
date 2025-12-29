import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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

    console.log(`Extracting financial data from: ${file_name}`);
    console.log(`File content preview: ${file_data.substring(0, 500)}`);

    const systemPrompt = `You are a financial data extraction expert. Extract historical financial data from the provided spreadsheet content and return a structured JSON response.

IMPORTANT: Return ONLY valid JSON, no markdown, no code blocks, no explanations.

Extract the following if available:
- Revenue/Net Sales by year
- EBITDA by year  
- Net Income by year
- Accounts Receivable by year
- Inventory by year
- Accounts Payable by year
- Any other key financial metrics

Calculate:
- EBITDA margin (EBITDA / Revenue)
- Year-over-year revenue growth
- Working capital metrics (DSO, DIO, DPO) if balance sheet data available

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
    "depreciation_amortization": {},
    "operating_income": {},
    "net_income": {}
  },
  "balance_sheet": {
    "cash": {},
    "accounts_receivable": {},
    "inventory": {},
    "accounts_payable": {}
  },
  "calculated_metrics": {
    "ebitda_margin_pct": {"2024": 0.22},
    "yoy_revenue_growth": 0.10,
    "dso_days": 45,
    "dio_days": 30,
    "dpo_days": 35
  },
  "data_quality": {
    "completeness_score": "high",
    "missing_items": [],
    "assumptions_made": [],
    "red_flags": []
  }
}

If you cannot find certain data, leave those fields empty or use reasonable estimates based on available data. Note any assumptions in data_quality.assumptions_made.`;

    const userPrompt = `Extract financial data from this file.
Company name hint: ${company_name || 'Unknown'}
File name: ${file_name}

File content:
${file_data.substring(0, 15000)}`;

    console.log('Calling Lovable AI for extraction...');

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
          JSON.stringify({ success: false, error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'AI credits exhausted. Please add credits to continue.' }),
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

    // Parse the JSON response - handle potential markdown code blocks
    let extractedData;
    try {
      // Remove markdown code blocks if present
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.slice(7);
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.slice(3);
      }
      if (cleanContent.endsWith('```')) {
        cleanContent = cleanContent.slice(0, -3);
      }
      
      extractedData = JSON.parse(cleanContent.trim());
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      console.error('Raw content:', content);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to parse extracted data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Ensure success flag is set
    extractedData.success = true;
    
    console.log('Successfully extracted financial data');
    
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
