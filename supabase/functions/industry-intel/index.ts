import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { companyName, industry } = await req.json();

    const apiKey = Deno.env.get('PERPLEXITY_API_KEY');
    if (!apiKey) {
      console.error('PERPLEXITY_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Perplexity connector not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching industry intel for:', companyName, industry);

    // Build search query for relevant news
    const searchQuery = `Latest news and market intelligence for ${industry || 'business'} industry ${companyName ? `related to companies like ${companyName}` : ''} M&A activity, market trends, competitive landscape`;

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { 
            role: 'system', 
            content: `You are a financial analyst specializing in private equity and M&A. Provide relevant industry intelligence and news analysis. Always respond with valid JSON matching this exact structure:
{
  "news": [
    {
      "id": "unique_id",
      "title": "News headline",
      "source": "Source name",
      "url": "URL if available or empty string",
      "date": "Relative date like '2 hours ago' or 'Yesterday'",
      "sentiment": "positive" or "neutral" or "negative",
      "summary": "1-2 sentence summary"
    }
  ],
  "aiSummary": "2-3 paragraph analysis of the industry landscape, key trends, risks, and opportunities",
  "keyMetrics": {
    "marketSize": "$XXB",
    "growthRate": "X.X%",
    "avgMultiple": "X.Xx"
  }
}
Provide 5-7 relevant news items. Focus on M&A activity, market trends, regulatory changes, and competitive dynamics.`
          },
          { role: 'user', content: searchQuery }
        ],
        search_recency_filter: 'week',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Perplexity API error:', data);
      return new Response(
        JSON.stringify({ success: false, error: data.error || `Request failed with status ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const content = data.choices?.[0]?.message?.content;
    const citations = data.citations || [];

    console.log('Perplexity response received, parsing...');

    // Try to parse the JSON response
    let parsedContent;
    try {
      // Extract JSON from the response (it might be wrapped in markdown code blocks)
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      parsedContent = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse Perplexity response as JSON:', parseError);
      // Return a structured fallback with the raw content
      parsedContent = {
        news: [],
        aiSummary: content,
        keyMetrics: null,
        rawResponse: true
      };
    }

    // Add citations to news items if available
    if (parsedContent.news && citations.length > 0) {
      parsedContent.news = parsedContent.news.map((item: any, index: number) => ({
        ...item,
        url: item.url || citations[index] || ''
      }));
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: parsedContent,
        citations 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching industry intel:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch industry intel';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
