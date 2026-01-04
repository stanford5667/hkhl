import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EVENT_REGISTRY_API_KEY = Deno.env.get('EVENT_REGISTRY_API_KEY');
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

interface TradeIdea {
  ticker: string;
  company_name: string;
  direction: 'LONG' | 'SHORT';
  rationale: string;
  look_through: boolean;
}

interface RelatedArticle {
  id: string;
  title: string;
  summary: string | null;
  published_at: string | null;
  similarity: number;
  relationship: 'supporting' | 'contradictory' | 'supplementary';
}

interface IntelligenceResponse {
  full_text: string;
  ai_memo: {
    executive_summary: string;
    key_catalysts: string[];
    macro_implications: string[];
    look_through_assets: TradeIdea[];
  };
  trade_ideas: TradeIdea[];
  related_articles: RelatedArticle[];
  source_article: {
    uri: string;
    title: string;
    source: string;
    published_at: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { article_uri, news_event_id } = await req.json();

    if (!article_uri && !news_event_id) {
      throw new Error('Either article_uri or news_event_id is required');
    }

    console.log('Processing article intelligence request:', { article_uri, news_event_id });

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Step 1: Fetch full article text from Event Registry
    let fullText = '';
    let articleTitle = '';
    let articleSource = '';
    let articlePublishedAt = '';
    let articleUri = article_uri;

    if (article_uri) {
      console.log('Fetching article from Event Registry:', article_uri);
      
      const eventRegistryUrl = `https://eventregistry.org/api/v1/article/getArticle`;
      const erResponse = await fetch(eventRegistryUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: EVENT_REGISTRY_API_KEY,
          articleUri: article_uri,
          resultType: 'info',
          includeArticleBody: true,
          includeArticleConcepts: true,
        }),
      });

      if (!erResponse.ok) {
        console.error('Event Registry API error:', erResponse.status);
        throw new Error(`Event Registry API error: ${erResponse.status}`);
      }

      const erData = await erResponse.json();
      console.log('Event Registry response received');

      const articleInfo = erData[article_uri]?.info || erData.info;
      if (articleInfo) {
        fullText = articleInfo.body || articleInfo.title || '';
        articleTitle = articleInfo.title || '';
        articleSource = articleInfo.source?.title || '';
        articlePublishedAt = articleInfo.dateTime || '';
      }
    } else if (news_event_id) {
      // Fetch from our database
      const { data: newsEvent } = await supabase
        .from('news_events')
        .select('*')
        .eq('id', news_event_id)
        .single();

      if (newsEvent) {
        fullText = newsEvent.summary || newsEvent.title || '';
        articleTitle = newsEvent.title;
        articleUri = newsEvent.source_id;
        articlePublishedAt = newsEvent.published_at;
      }
    }

    if (!fullText) {
      throw new Error('Could not retrieve article content');
    }

    console.log('Article content retrieved, length:', fullText.length);

    // Step 2: Generate AI Memo using OpenAI GPT-4o
    const memoPrompt = `You are a senior hedge fund analyst. Draft a professional Hedge Fund Research Memo based on this news article.

ARTICLE TEXT:
${fullText}

Your memo MUST include:

1. **Executive Summary** (2-3 sentences capturing the key investment thesis)

2. **Key Catalysts** (3-5 specific events/factors that could move markets)

3. **Macro Implications** (How this affects broader markets, sectors, or the economy)

4. **Look-Through Assets** (CRITICAL: Identify 3 assets NOT mentioned in the article that will move because of this event. Think second-order effects:
   - If news is about iPhone ban → look at Apple suppliers like $QRVO, $SWKS
   - If news is about AI chips → look at power companies serving data centers
   - If news is about EV demand → look at lithium miners, charging networks
   
   For each, specify: ticker, company name, direction (LONG/SHORT), and rationale)

Respond in valid JSON format:
{
  "executive_summary": "...",
  "key_catalysts": ["catalyst 1", "catalyst 2", ...],
  "macro_implications": ["implication 1", "implication 2", ...],
  "look_through_assets": [
    {
      "ticker": "QRVO",
      "company_name": "Qorvo Inc",
      "direction": "SHORT",
      "rationale": "RF component supplier to Apple, will see reduced orders",
      "look_through": true
    }
  ],
  "direct_trade_ideas": [
    {
      "ticker": "AAPL",
      "company_name": "Apple Inc",
      "direction": "SHORT",
      "rationale": "Direct impact from iPhone ban in China",
      "look_through": false
    }
  ]
}`;

    console.log('Calling OpenAI for memo generation...');
    
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are a senior hedge fund research analyst. Always respond with valid JSON.' },
          { role: 'user', content: memoPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!openaiResponse.ok) {
      const errText = await openaiResponse.text();
      console.error('OpenAI API error:', errText);
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const openaiData = await openaiResponse.json();
    const memoContent = openaiData.choices[0]?.message?.content || '';
    
    console.log('OpenAI response received');

    // Parse the memo JSON
    let aiMemo;
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = memoContent.match(/```json\s*([\s\S]*?)\s*```/) || 
                        memoContent.match(/```\s*([\s\S]*?)\s*```/) ||
                        [null, memoContent];
      aiMemo = JSON.parse(jsonMatch[1] || memoContent);
    } catch (e) {
      console.error('Failed to parse memo JSON:', e);
      aiMemo = {
        executive_summary: memoContent.slice(0, 500),
        key_catalysts: [],
        macro_implications: [],
        look_through_assets: [],
        direct_trade_ideas: []
      };
    }

    // Step 3: Generate embedding for semantic search
    console.log('Generating embedding for semantic search...');
    
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: `${articleTitle}. ${fullText.slice(0, 2000)}`,
      }),
    });

    let relatedArticles: RelatedArticle[] = [];

    if (embeddingResponse.ok) {
      const embeddingData = await embeddingResponse.json();
      const queryEmbedding = embeddingData.data[0]?.embedding;

      if (queryEmbedding) {
        console.log('Performing semantic search for related articles...');
        
        // Search for related articles using pgvector
        const { data: similarArticles, error: searchError } = await supabase.rpc(
          'find_similar_insights',
          {
            p_embedding: queryEmbedding,
            p_threshold: 0.5,
            p_limit: 10
          }
        );

        if (searchError) {
          console.error('Semantic search error:', searchError);
        } else if (similarArticles && similarArticles.length > 0) {
          // Get the news events for these insights
          const newsEventIds = similarArticles.map((a: any) => a.news_event_id).filter(Boolean);
          
          if (newsEventIds.length > 0) {
            const { data: newsEvents } = await supabase
              .from('news_events')
              .select('id, title, summary, published_at')
              .in('id', newsEventIds);

            if (newsEvents) {
              // Classify relationships using AI
              const classifyPrompt = `Given the original article summary:
"${fullText.slice(0, 500)}"

Classify each of these related articles as 'supporting' (confirms the thesis), 'contradictory' (challenges the thesis), or 'supplementary' (adds context):

${newsEvents.map((n, i) => `${i + 1}. ${n.title}`).join('\n')}

Respond with a JSON array of classifications: ["supporting", "contradictory", ...]`;

              let classifications: string[] = [];
              try {
                const classifyResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [
                      { role: 'user', content: classifyPrompt }
                    ],
                    temperature: 0.3,
                    max_tokens: 500,
                  }),
                });

                if (classifyResponse.ok) {
                  const classifyData = await classifyResponse.json();
                  const classifyContent = classifyData.choices[0]?.message?.content || '[]';
                  const jsonMatch = classifyContent.match(/\[[\s\S]*\]/);
                  classifications = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
                }
              } catch (e) {
                console.error('Classification error:', e);
              }

              relatedArticles = newsEvents.map((n, i) => ({
                id: n.id,
                title: n.title,
                summary: n.summary,
                published_at: n.published_at,
                similarity: similarArticles.find((a: any) => a.news_event_id === n.id)?.similarity || 0.5,
                relationship: (classifications[i] as 'supporting' | 'contradictory' | 'supplementary') || 'supplementary'
              }));

              // Prioritize contradictory and supplementary articles
              relatedArticles.sort((a, b) => {
                const priority: Record<string, number> = { contradictory: 0, supplementary: 1, supporting: 2 };
                return priority[a.relationship] - priority[b.relationship];
              });

              relatedArticles = relatedArticles.slice(0, 3);
            }
          }
        }
      }
    }

    // Combine trade ideas
    const allTradeIdeas: TradeIdea[] = [
      ...(aiMemo.look_through_assets || []),
      ...(aiMemo.direct_trade_ideas || [])
    ];

    const response: IntelligenceResponse = {
      full_text: fullText,
      ai_memo: {
        executive_summary: aiMemo.executive_summary || '',
        key_catalysts: aiMemo.key_catalysts || [],
        macro_implications: aiMemo.macro_implications || [],
        look_through_assets: aiMemo.look_through_assets || [],
      },
      trade_ideas: allTradeIdeas,
      related_articles: relatedArticles,
      source_article: {
        uri: articleUri,
        title: articleTitle,
        source: articleSource,
        published_at: articlePublishedAt,
      }
    };

    console.log('Intelligence response generated successfully');

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in get-article-intelligence:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : undefined
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
