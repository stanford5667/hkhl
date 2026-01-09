import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ========== KILL SWITCH - SET TO FALSE TO DISABLE ALL API CALLS ==========
const ENABLE_PERPLEXITY_API = true;
// ==========================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RESEARCH_PROMPTS: Record<string, (ticker: string) => string> = {
  overview: (ticker) => `Provide a comprehensive overview of ${ticker} stock. Include: company description, sector/industry, market cap, key products/services, and recent developments. Be concise but informative.`,
  financials: (ticker) => `Analyze the financial health of ${ticker}. Include: recent revenue trends, profitability metrics (margins, EPS), debt levels, cash flow, and key financial ratios. Use the most recent data available.`,
  news: (ticker) => `Summarize the latest significant news about ${ticker} from the past week. Include: major announcements, earnings reports, executive changes, product launches, and market-moving events.`,
  analysis: (ticker) => `Provide investment analysis for ${ticker}. Include: analyst ratings consensus, price targets, key investment thesis (bull/bear cases), valuation metrics, and technical analysis insights.`,
  competitors: (ticker) => `Analyze ${ticker}'s competitive landscape. Include: main competitors, market share comparison, competitive advantages/disadvantages, and how it stacks up in its industry.`,
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // KILL SWITCH - Return early if API is disabled
  if (!ENABLE_PERPLEXITY_API) {
    console.log('[API BLOCKED] research-asset function - Perplexity API disabled');
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'API disabled for testing',
        data: null,
        isBlocked: true
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { ticker, researchType } = await req.json();

    if (!ticker || !researchType) {
      return new Response(
        JSON.stringify({ success: false, error: 'Ticker and researchType are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[API CALL] Perplexity research-asset: ${ticker} - ${researchType}`);

    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    if (!PERPLEXITY_API_KEY) {
      console.error('PERPLEXITY_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Perplexity API not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const promptFn = RESEARCH_PROMPTS[researchType];
    if (!promptFn) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid research type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const prompt = promptFn(ticker);

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { 
            role: 'system', 
            content: 'You are a professional financial analyst providing accurate, up-to-date research on publicly traded assets. Be precise, cite data, and present information clearly.' 
          },
          { role: 'user', content: prompt }
        ],
        search_recency_filter: 'week',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: 'Research API error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || 'No research data available.';
    const citations = data.citations || [];

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          content,
          citations,
          generatedAt: new Date().toISOString(),
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Research error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to fetch research' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
