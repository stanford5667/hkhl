import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ========== KILL SWITCH - SET TO FALSE TO DISABLE ALL API CALLS ==========
const ENABLE_PERPLEXITY_API = false;
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

  // KILL SWITCH - Return early if APIs are disabled
  if (!ENABLE_PERPLEXITY_API && !ENABLE_LOVABLE_AI) {
    console.log('[API BLOCKED] scrape-website function - All APIs disabled');
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
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'No URL provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!PERPLEXITY_API_KEY && !LOVABLE_API_KEY) {
      throw new Error('No API key configured');
    }

    // Normalize URL
    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith('http')) {
      normalizedUrl = `https://${normalizedUrl}`;
    }
    normalizedUrl = normalizedUrl.replace(/\/$/, '');

    // Use Perplexity to gather information about the company from their website
    const query = `Analyze the company website at ${normalizedUrl} and extract:
1. Company description and what they do
2. Year founded
3. Headquarters/location
4. Number of employees (if mentioned)
5. CEO and leadership team names
6. Business model
7. Industry they operate in

Search for information about this company from their website and any available public sources.`;

    let extractedData: Record<string, any> = {};
    let pagesScraped: string[] = [normalizedUrl];

    if (PERPLEXITY_API_KEY && ENABLE_PERPLEXITY_API) {
      console.log('[API CALL] Perplexity scrape-website:', normalizedUrl);
      
      const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
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
              content: `You are a company research analyst. Extract structured information about companies from their websites and public sources. 
              
Respond ONLY with valid JSON in this exact format:
{
  "description": {"value": "<company description>", "confidence": 0.9, "excerpt": "<source text>"},
  "founded": {"value": <year as number or null>, "confidence": 0.8, "excerpt": "<source text>"},
  "headquarters": {"value": "<city, state/country>", "confidence": 0.85, "excerpt": "<source text>"},
  "employee_count": {"value": <number or null>, "confidence": 0.7, "excerpt": "<source text>"},
  "ceo_name": {"value": "<name or null>", "confidence": 0.8, "excerpt": "<source text>"},
  "business_model": {"value": "<description>", "confidence": 0.75, "excerpt": "<source text>"},
  "industry": {"value": "<industry>", "confidence": 0.85, "excerpt": "<source text>"},
  "leadership_team": {"value": ["Name - Title", ...] or null, "confidence": 0.7, "excerpt": "<source text>"}
}

Use null for values you cannot find. Set confidence between 0.0-1.0 based on how certain you are.`
            },
            { role: 'user', content: query }
          ],
          search_domain_filter: [new URL(normalizedUrl).hostname],
        }),
      });

      if (perplexityResponse.ok) {
        const perplexityData = await perplexityResponse.json();
        const content = perplexityData.choices?.[0]?.message?.content || '';
        
        try {
          let jsonStr = content.trim();
          if (jsonStr.startsWith('```json')) {
            jsonStr = jsonStr.slice(7);
          } else if (jsonStr.startsWith('```')) {
            jsonStr = jsonStr.slice(3);
          }
          if (jsonStr.endsWith('```')) {
            jsonStr = jsonStr.slice(0, -3);
          }
          extractedData = JSON.parse(jsonStr.trim());
        } catch (parseError) {
          console.error('Failed to parse Perplexity response:', parseError);
        }
      }
    } else if (LOVABLE_API_KEY && ENABLE_LOVABLE_AI) {
      console.log('[API CALL] Lovable AI scrape-website:', normalizedUrl);
      
      // Fallback to Lovable AI with web search context
      const lovableResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { 
              role: 'system', 
              content: `You are a company research analyst. Based on what you know about companies, provide structured information.
              
Respond ONLY with valid JSON in this exact format:
{
  "description": {"value": "<company description>", "confidence": 0.9, "excerpt": "<source text>"},
  "founded": {"value": <year as number or null>, "confidence": 0.8, "excerpt": "<source text>"},
  "headquarters": {"value": "<city, state/country>", "confidence": 0.85, "excerpt": "<source text>"},
  "employee_count": {"value": <number or null>, "confidence": 0.7, "excerpt": "<source text>"},
  "ceo_name": {"value": "<name or null>", "confidence": 0.8, "excerpt": "<source text>"},
  "business_model": {"value": "<description>", "confidence": 0.75, "excerpt": "<source text>"},
  "industry": {"value": "<industry>", "confidence": 0.85, "excerpt": "<source text>"}
}

Use null for values you cannot find. Set confidence between 0.0-1.0 based on how certain you are.`
            },
            { role: 'user', content: `What do you know about the company at ${normalizedUrl}? Extract key company information.` }
          ],
        }),
      });

      if (lovableResponse.ok) {
        const lovableData = await lovableResponse.json();
        const content = lovableData.choices?.[0]?.message?.content || '';
        
        try {
          let jsonStr = content.trim();
          if (jsonStr.startsWith('```json')) {
            jsonStr = jsonStr.slice(7);
          } else if (jsonStr.startsWith('```')) {
            jsonStr = jsonStr.slice(3);
          }
          if (jsonStr.endsWith('```')) {
            jsonStr = jsonStr.slice(0, -3);
          }
          extractedData = JSON.parse(jsonStr.trim());
        } catch (parseError) {
          console.error('Failed to parse Lovable AI response:', parseError);
        }
      }
    }

    console.log(`[scrape-website] Extracted ${Object.keys(extractedData).length} fields from ${normalizedUrl}`);

    return new Response(
      JSON.stringify({
        success: true,
        data: extractedData,
        pagesScraped,
        url: normalizedUrl
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in scrape-website function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
