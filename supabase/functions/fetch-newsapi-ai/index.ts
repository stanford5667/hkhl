import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NewsAPIArticle {
  uri: string;
  title: string;
  body: string;
  source: { title: string; uri: string };
  url: string;
  dateTime: string;
  dateTimePub: string;
  image?: string;
  sentiment?: number;
  categories?: { uri: string; label: string }[];
  concepts?: { uri: string; label: { eng: string }; type: string }[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const eventRegistryApiKey = Deno.env.get('EVENT_REGISTRY_API_KEY');
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!eventRegistryApiKey) {
      return new Response(JSON.stringify({
        success: false,
        error: 'EVENT_REGISTRY_API_KEY not configured'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { categories = ['business', 'politics', 'technology'], limit = 50 } = await req.json().catch(() => ({}));

    console.log('Fetching from NewsAPI.ai (Event Registry)...');

    // Fetch articles from Event Registry API
    const articlesResponse = await fetch('https://eventregistry.org/api/v1/article/getArticles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: eventRegistryApiKey,
        resultType: 'articles',
        articlesSortBy: 'date',
        articlesCount: limit,
        lang: 'eng',
        includeArticleCategories: true,
        includeArticleConcepts: true,
        includeArticleImage: true,
        includeSourceTitle: true,
        categoryUri: categories.map((c: string) => `news/${c}`),
        dataType: ['news', 'blog'],
      })
    });

    if (!articlesResponse.ok) {
      const errorText = await articlesResponse.text();
      console.error('NewsAPI.ai error:', errorText);
      return new Response(JSON.stringify({
        success: false,
        error: `API error: ${articlesResponse.status}`
      }), {
        status: articlesResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const data = await articlesResponse.json();
    const articles: NewsAPIArticle[] = data.articles?.results || [];
    
    console.log(`Fetched ${articles.length} articles from NewsAPI.ai`);

    let insertedCount = 0;
    let skippedCount = 0;

    for (const article of articles) {
      try {
        // Check for existing article
        const { data: existing } = await supabase
          .from('real_world_events')
          .select('id')
          .eq('source_url', article.url)
          .single();

        if (existing) {
          skippedCount++;
          continue;
        }

        // Extract category from concepts/categories
        const category = determineCategory(article);
        
        // Extract entities from concepts
        const entities = article.concepts
          ?.filter(c => c.type === 'person' || c.type === 'org' || c.type === 'loc')
          .map(c => c.label.eng)
          .slice(0, 10) || [];

        // Generate AI summary if we have content
        let aiSummary = null;
        if (lovableApiKey && article.body && article.body.length > 200) {
          aiSummary = await generateAISummary(article.body, lovableApiKey);
        }

        // Determine severity based on sentiment and content
        const severity = determineSeverity(article.sentiment || 0, article.body?.length || 0);

        // Insert into database
        const { error: insertError } = await supabase
          .from('real_world_events')
          .insert({
            title: article.title.slice(0, 500),
            description: aiSummary || article.body?.slice(0, 500) || null,
            full_content: article.body || null,
            source: article.source?.title || 'NewsAPI.ai',
            source_url: article.url,
            category,
            severity,
            sentiment_score: article.sentiment || null,
            entities,
            detected_at: new Date().toISOString(),
            event_date: article.dateTimePub || article.dateTime,
            ai_extracted_entities: {
              concepts: article.concepts?.slice(0, 20) || [],
              categories: article.categories || []
            },
            ai_classification: {
              primary_category: category,
              source_categories: article.categories?.map(c => c.label) || [],
              time_sensitivity: 'developing'
            },
            ai_sentiment: article.sentiment ? {
              overall_sentiment: article.sentiment,
              confidence: 70,
              market_sentiment_impact: {
                direction: article.sentiment > 0.2 ? 'bullish' : article.sentiment < -0.2 ? 'bearish' : 'neutral',
                strength: Math.abs(article.sentiment) > 0.5 ? 'strong' : 'moderate',
                reasoning: 'Sentiment derived from NewsAPI.ai analysis'
              }
            } : null,
            metadata: {
              uri: article.uri,
              image: article.image,
              source_uri: article.source?.uri,
              ingested_via: 'newsapi-ai'
            }
          });

        if (insertError) {
          console.error('Insert error:', insertError.message);
        } else {
          insertedCount++;
        }

      } catch (articleError) {
        console.warn('Error processing article:', articleError);
      }
    }

    const result = {
      success: true,
      articles_fetched: articles.length,
      articles_inserted: insertedCount,
      articles_skipped: skippedCount,
      timestamp: new Date().toISOString()
    };

    console.log('NewsAPI.ai ingestion complete:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('NewsAPI.ai fetch error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

function determineCategory(article: NewsAPIArticle): string {
  const categories = article.categories || [];
  
  for (const cat of categories) {
    const label = cat.label.toLowerCase();
    if (label.includes('politic') || label.includes('election')) return 'politics';
    if (label.includes('crypto') || label.includes('bitcoin')) return 'crypto';
    if (label.includes('econom') || label.includes('financ') || label.includes('business')) return 'economics';
    if (label.includes('sport')) return 'sports';
    if (label.includes('tech')) return 'tech';
    if (label.includes('science')) return 'science';
    if (label.includes('entertainment')) return 'entertainment';
  }

  // Check concepts for crypto
  const concepts = article.concepts || [];
  for (const concept of concepts) {
    const label = concept.label.eng.toLowerCase();
    if (label.includes('bitcoin') || label.includes('ethereum') || label.includes('cryptocurrency')) {
      return 'crypto';
    }
  }

  return 'economics'; // Default
}

function determineSeverity(sentiment: number, contentLength: number): string {
  const absSentiment = Math.abs(sentiment);
  
  if (absSentiment > 0.7 || contentLength > 3000) return 'high';
  if (absSentiment > 0.4 || contentLength > 1500) return 'medium';
  return 'low';
}

async function generateAISummary(content: string, apiKey: string): Promise<string | null> {
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: "You are a financial news summarizer. Create a concise 2-3 sentence summary highlighting key facts and market implications. Be direct and factual."
          },
          {
            role: "user",
            content: `Summarize this article:\n\n${content.substring(0, 3000)}`
          }
        ],
        max_tokens: 150
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch {
    return null;
  }
}
