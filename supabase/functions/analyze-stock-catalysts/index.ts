import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Catalyst {
  id: string;
  title: string;
  category: 'earnings' | 'news' | 'analyst' | 'macro' | 'technical' | 'insider' | 'regulatory';
  impactScore: number; // 1-10
  sentiment: 'bullish' | 'bearish' | 'neutral';
  summary: string;
  details: string;
  source?: string;
  sourceUrl?: string;
  date: string;
}

interface CatalystResponse {
  ticker: string;
  companyName: string;
  catalysts: Catalyst[];
  lastUpdated: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ticker } = await req.json();
    
    if (!ticker) {
      console.error('No ticker provided');
      return new Response(
        JSON.stringify({ error: 'Ticker is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Analyzing catalysts for ${ticker}`);

    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
    
    if (!perplexityApiKey) {
      console.error('Perplexity API key not configured');
      return new Response(
        JSON.stringify({ error: 'Perplexity API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const prompt = `Analyze the key catalysts currently moving ${ticker} stock. For each catalyst, provide:
1. A clear title
2. Category (earnings, news, analyst, macro, technical, insider, or regulatory)
3. Impact score (1-10, where 10 is highest impact)
4. Sentiment (bullish, bearish, or neutral)
5. A brief summary (1-2 sentences)
6. Detailed explanation (2-3 sentences)
7. Source name and URL if available

Focus on the most impactful and recent catalysts. Include earnings announcements, analyst upgrades/downgrades, major news, regulatory changes, insider activity, and macroeconomic factors affecting this stock.

Return exactly 5 catalysts ranked by impact score.`;

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { 
            role: 'system', 
            content: `You are a financial analyst providing structured data about stock catalysts. Always respond with valid JSON matching this schema:
{
  "companyName": "string",
  "catalysts": [
    {
      "id": "string (unique)",
      "title": "string",
      "category": "earnings|news|analyst|macro|technical|insider|regulatory",
      "impactScore": number (1-10),
      "sentiment": "bullish|bearish|neutral",
      "summary": "string",
      "details": "string",
      "source": "string (optional)",
      "sourceUrl": "string (optional)",
      "date": "string (ISO date or relative like 'Today', 'Yesterday', '2 days ago')"
    }
  ]
}` 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'stock_catalysts',
            schema: {
              type: 'object',
              properties: {
                companyName: { type: 'string' },
                catalysts: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      title: { type: 'string' },
                      category: { type: 'string' },
                      impactScore: { type: 'number' },
                      sentiment: { type: 'string' },
                      summary: { type: 'string' },
                      details: { type: 'string' },
                      source: { type: 'string' },
                      sourceUrl: { type: 'string' },
                      date: { type: 'string' }
                    },
                    required: ['id', 'title', 'category', 'impactScore', 'sentiment', 'summary', 'details', 'date']
                  }
                }
              },
              required: ['companyName', 'catalysts']
            }
          }
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Perplexity API error: ${response.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch catalyst data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('Perplexity response received');

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      console.error('No content in Perplexity response');
      return new Response(
        JSON.stringify({ error: 'No analysis returned' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let parsedContent;
    try {
      parsedContent = JSON.parse(content);
    } catch (e) {
      console.error('Failed to parse Perplexity response:', content);
      return new Response(
        JSON.stringify({ error: 'Invalid response format' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result: CatalystResponse = {
      ticker,
      companyName: parsedContent.companyName || ticker,
      catalysts: parsedContent.catalysts || [],
      lastUpdated: new Date().toISOString(),
    };

    // Add citations if available
    if (data.citations && data.citations.length > 0) {
      result.catalysts = result.catalysts.map((catalyst: Catalyst, index: number) => ({
        ...catalyst,
        sourceUrl: catalyst.sourceUrl || data.citations[index] || undefined,
      }));
    }

    console.log(`Successfully analyzed ${result.catalysts.length} catalysts for ${ticker}`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error analyzing catalysts:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
