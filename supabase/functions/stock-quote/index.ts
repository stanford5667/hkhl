import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ========== KILL SWITCH - SET TO FALSE TO DISABLE ALL API CALLS ==========
const ENABLE_PERPLEXITY_API = false;
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
  if (!ENABLE_PERPLEXITY_API) {
    console.log('[API BLOCKED] stock-quote function - Perplexity API disabled');
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'API disabled for testing',
        quote: null,
        isBlocked: true
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { ticker } = await req.json();

    if (!ticker) {
      return new Response(
        JSON.stringify({ success: false, error: 'Ticker is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[API CALL] Perplexity stock-quote: ${ticker}`);

    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    if (!PERPLEXITY_API_KEY) {
      console.error('PERPLEXITY_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'API not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const prompt = `Get the most recent stock quote data for ${ticker}. If markets are closed or it's a holiday, use the most recent available trading data.

Return ONLY a valid JSON object with NO explanations, NO markdown, NO text before or after. The response must start with { and end with }:

{"price":150.25,"change":2.50,"changePercent":1.69,"open":148.00,"high":151.50,"low":147.80,"volume":"45.2M","marketCap":"2.4T","companyName":"Apple Inc.","chartData":[{"time":"9:30","price":148.00},{"time":"10:00","price":149.20},{"time":"11:00","price":150.10},{"time":"12:00","price":150.50}]}

Fill in real data for ${ticker}. Use the last trading day's data if markets are closed.`;

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
            content: 'You are a JSON-only API. Return ONLY valid JSON objects. Never include explanations, markdown code blocks, or any text outside the JSON. Your entire response must be a parseable JSON object starting with { and ending with }. If markets are closed, use the most recent trading data available.'
          },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch stock data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    // Parse JSON from response - extract JSON object even if surrounded by text
    let quote;
    try {
      let cleanContent = content.trim();
      
      // Remove markdown code blocks
      if (cleanContent.startsWith('```json')) cleanContent = cleanContent.slice(7);
      if (cleanContent.startsWith('```')) cleanContent = cleanContent.slice(3);
      if (cleanContent.endsWith('```')) cleanContent = cleanContent.slice(0, -3);
      cleanContent = cleanContent.trim();
      
      // Try to extract JSON object from the response
      const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        quote = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON object found in response');
      }
    } catch (e) {
      console.error('Parse error:', e, 'Content:', content);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to parse stock data. Market may be closed.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, quote }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Stock quote error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to fetch stock quote' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
