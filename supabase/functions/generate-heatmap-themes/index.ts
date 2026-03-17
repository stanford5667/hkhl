import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const EVENT_REGISTRY_API_KEY = Deno.env.get('EVENT_REGISTRY_API_KEY');
const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

interface MicroTheme {
  headline: string;
  summary: string;
  source: string;
  source_url: string;
  published_at: string;
  impact_score: number;
  sentiment: string;
  category: string;
  affected_countries: string[];
  affected_tickers: { symbol: string; name: string; direction: string; rationale: string }[];
  asset_class_impacts: Record<string, number>;
  ai_analysis: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Step 1: Fetch breaking market-moving news from Event Registry
    console.log('Fetching breaking financial news from Event Registry...');

    const erResponse = await fetch('https://eventregistry.org/api/v1/article/getArticles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: EVENT_REGISTRY_API_KEY,
        resultType: 'articles',
        articlesSortBy: 'socialScore',
        articlesCount: 20,
        lang: 'eng',
        keyword: 'market OR stocks OR economy OR trade OR tariff OR regulation OR earnings OR merger OR acquisition OR IPO OR sanctions OR inflation OR interest rate OR central bank OR oil OR commodity',
        keywordOper: 'or',
        categoryUri: [
          'news/Business',
          'news/Economy',
          'news/Politics',
        ],
        sourceLocationUri: [
          'http://en.wikipedia.org/wiki/United_States',
          'http://en.wikipedia.org/wiki/United_Kingdom',
          'http://en.wikipedia.org/wiki/China',
          'http://en.wikipedia.org/wiki/Germany',
          'http://en.wikipedia.org/wiki/Japan',
        ],
        dateStart: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString().split('T')[0],
        dateEnd: new Date().toISOString().split('T')[0],
        isDuplicateFilter: 'skipDuplicates',
        dataType: ['news'],
      }),
    });

    if (!erResponse.ok) {
      console.error('Event Registry error:', erResponse.status);
      throw new Error(`Event Registry API failed: ${erResponse.status}`);
    }

    const erData = await erResponse.json();
    const articles = erData.articles?.results || [];
    console.log(`Fetched ${articles.length} articles from Event Registry`);

    if (articles.length === 0) {
      return new Response(JSON.stringify({ success: true, themes_generated: 0, message: 'No recent articles found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 2: Build article summaries for Perplexity analysis
    const articleSummaries = articles.slice(0, 15).map((a: any, i: number) => 
      `[${i + 1}] "${a.title}" (${a.source?.title || 'Unknown'}, ${a.dateTime || 'recent'})\n${(a.body || '').slice(0, 300)}`
    ).join('\n\n');

    // Step 3: Use Perplexity to analyze, score, and extract structured micro-themes
    console.log('Sending to Perplexity for deep analysis...');

    const perplexityPrompt = `You are a senior institutional portfolio strategist at a $50B hedge fund. Analyze these breaking news articles and extract SPECIFIC, ACTIONABLE investment micro-themes.

DO NOT produce generic themes like "AI is growing" or "tech stocks rising." Instead extract VERY SPECIFIC events like:
- "EU Imposes $2.1B Fine on Apple Over App Store Rules"
- "TSMC Arizona Fab Delayed 6 Months, Cost Overruns"
- "China Restricts Rare Earth Exports to US"
- "Fed Governor Signals 50bp Cut in March"

For each theme, determine:
1. impact_score (1-10): How much will this move markets? 6+ = significant
2. sentiment: bullish/bearish/neutral
3. affected_countries: ISO 2-letter codes of countries impacted
4. affected_tickers: Specific stocks affected with direction and WHY
5. asset_class_impacts: How this affects equities, bonds, gold, oil, crypto (-1 to 1)
6. category: one of [geopolitical, monetary_policy, earnings, regulatory, trade, commodity, sector_rotation, corporate_action, macro_data]

ARTICLES:
${articleSummaries}

Search the web for the LATEST context on each story to enhance your analysis.

Respond with valid JSON:
{
  "themes": [
    {
      "headline": "specific headline",
      "summary": "2-3 sentence analysis of market implications",
      "source": "original source name",
      "source_url": "url if available",
      "published_at": "ISO date",
      "impact_score": 8,
      "sentiment": "bearish",
      "category": "regulatory",
      "affected_countries": ["US", "EU", "CN"],
      "affected_tickers": [
        {"symbol": "AAPL", "name": "Apple Inc", "direction": "SHORT", "rationale": "Direct regulatory headwind from EU fine"},
        {"symbol": "GOOGL", "name": "Alphabet", "direction": "SHORT", "rationale": "Precedent for similar DMA enforcement"}
      ],
      "asset_class_impacts": {"equities": -0.3, "bonds": 0.1, "gold": 0.2, "oil": 0.0, "crypto": 0.0},
      "ai_analysis": "Deeper 3-4 sentence analysis with second-order effects and historical parallels"
    }
  ]
}

Return ONLY themes with impact_score >= 5. Maximum 12 themes. Be SPECIFIC and PRECISE.`;

    const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          { role: 'system', content: 'You are a senior hedge fund strategist. Always respond with valid JSON. Be extremely specific and data-driven.' },
          { role: 'user', content: perplexityPrompt },
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });

    if (!perplexityResponse.ok) {
      const errText = await perplexityResponse.text();
      console.error('Perplexity API error:', errText);
      throw new Error(`Perplexity API failed: ${perplexityResponse.status}`);
    }

    const perplexityData = await perplexityResponse.json();
    const rawContent = perplexityData.choices?.[0]?.message?.content || '';
    console.log('Perplexity response received, parsing...');

    // Parse the JSON response
    let parsedThemes: MicroTheme[] = [];
    try {
      const jsonMatch = rawContent.match(/```json\s*([\s\S]*?)\s*```/) ||
                        rawContent.match(/```\s*([\s\S]*?)\s*```/) ||
                        [null, rawContent];
      const parsed = JSON.parse(jsonMatch[1] || rawContent);
      parsedThemes = parsed.themes || parsed || [];
    } catch (e) {
      console.error('Failed to parse Perplexity JSON:', e);
      // Try to extract any valid JSON object
      const objectMatch = rawContent.match(/\{[\s\S]*"themes"[\s\S]*\}/);
      if (objectMatch) {
        try {
          parsedThemes = JSON.parse(objectMatch[0]).themes || [];
        } catch { /* give up */ }
      }
    }

    console.log(`Parsed ${parsedThemes.length} micro-themes`);

    // Step 4: Filter by impact score and store in DB
    const highImpactThemes = parsedThemes.filter(t => t.impact_score >= 5);

    if (highImpactThemes.length > 0) {
      // Clean expired themes first
      await supabase
        .from('heatmap_micro_themes')
        .delete()
        .lt('expires_at', new Date().toISOString());

      // Insert new themes
      const rows = highImpactThemes.map(t => ({
        headline: t.headline?.slice(0, 500) || 'Untitled',
        summary: t.summary?.slice(0, 1000) || '',
        source: t.source || null,
        source_url: t.source_url || null,
        published_at: t.published_at || new Date().toISOString(),
        impact_score: Math.min(10, Math.max(1, t.impact_score || 5)),
        sentiment: ['bullish', 'bearish', 'neutral'].includes(t.sentiment) ? t.sentiment : 'neutral',
        category: t.category || 'macro',
        affected_countries: Array.isArray(t.affected_countries) ? t.affected_countries : [],
        affected_tickers: Array.isArray(t.affected_tickers) ? t.affected_tickers : [],
        asset_class_impacts: t.asset_class_impacts || {},
        ai_analysis: t.ai_analysis || null,
        expires_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
      }));

      const { error: insertError } = await supabase
        .from('heatmap_micro_themes')
        .insert(rows);

      if (insertError) {
        console.error('Insert error:', insertError);
        throw new Error(`Failed to insert themes: ${insertError.message}`);
      }

      console.log(`Stored ${rows.length} micro-themes in database`);
    }

    return new Response(JSON.stringify({
      success: true,
      themes_generated: highImpactThemes.length,
      themes: highImpactThemes,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-heatmap-themes:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
