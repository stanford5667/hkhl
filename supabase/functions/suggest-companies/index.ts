import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ========== KILL SWITCH - SET TO FALSE TO DISABLE ALL API CALLS ==========
const ENABLE_LOVABLE_AI = false;
// ==========================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // KILL SWITCH - Return early if API is disabled
  if (!ENABLE_LOVABLE_AI) {
    console.log('[API BLOCKED] suggest-companies - Lovable AI disabled');
    return new Response(
      JSON.stringify({ 
        suggestions: [],
        error: 'AI API disabled for testing',
        isBlocked: true
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { query } = await req.json();

    if (!query || query.length < 2) {
      return new Response(
        JSON.stringify({ suggestions: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'API key not configured', suggestions: [] }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching suggestions for query:', query);

    const prompt = `Given this partial company name: "${query}"
    
Suggest 3-5 real companies that match this query. Focus on well-known companies in various industries.
Return ONLY a valid JSON array with this structure:
[
  {"name": "Full Company Name", "industry": "Industry", "hint": "Brief description or notable info"}
]

Rules:
- Return real, existing companies only
- Include a mix of industries if possible
- The hint should be brief (under 50 chars)
- If the query is very specific, include the exact match first
- Return an empty array if no matches found`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a company database assistant. Return only valid JSON arrays.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded', suggestions: [] }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to get suggestions', suggestions: [] }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '[]';
    
    // Parse the JSON response
    let suggestions = [];
    try {
      // Clean up potential markdown formatting
      const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      suggestions = JSON.parse(cleanedContent);
      
      // Validate structure
      if (!Array.isArray(suggestions)) {
        suggestions = [];
      }
      
      // Limit to 5 suggestions
      suggestions = suggestions.slice(0, 5);
    } catch (parseError) {
      console.error('Failed to parse suggestions:', parseError, content);
      suggestions = [];
    }

    console.log('Returning suggestions:', suggestions.length);

    return new Response(
      JSON.stringify({ suggestions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in suggest-companies function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error', suggestions: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
