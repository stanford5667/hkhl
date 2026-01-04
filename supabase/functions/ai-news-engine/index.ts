import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NewsSource {
  name: string;
  fetch: () => Promise<RawArticle[]>;
}

interface RawArticle {
  title: string;
  description: string;
  content?: string;
  url: string;
  source: string;
  publishedAt: string;
  category?: string;
}

interface ProcessedArticle {
  title: string;
  description: string;
  full_content: string;
  source: string;
  source_url: string;
  event_date: string;
  detected_at: string;
  category: string;
  content_hash: string;
  ai_extracted_entities: Record<string, unknown>;
  ai_classification: Record<string, unknown>;
  ai_sentiment: Record<string, unknown>;
  ai_market_links: Record<string, unknown>;
  processing_status: string;
  processed_at: string;
  severity: string;
  entities: string[];
  sentiment_score: number;
  related_markets: string[];
}

// Generate a simple hash for content deduplication
function generateContentHash(title: string, content: string): string {
  const text = `${title}|${content.substring(0, 200)}`.toLowerCase();
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

// Call Lovable AI for entity extraction
async function extractEntities(content: string, apiKey: string): Promise<Record<string, unknown>> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: `You are an entity extraction system. Extract all named entities from the news article. Output valid JSON only.`
        },
        {
          role: "user",
          content: `Extract entities from this article:\n\n${content.substring(0, 4000)}\n\nOutput JSON:\n{\n  "people": [{"name": "...", "role": "...", "sentiment_toward": "positive|negative|neutral"}],\n  "organizations": [{"name": "...", "type": "company|government|ngo|other"}],\n  "locations": [{"name": "...", "relevance": "primary|mentioned"}],\n  "events": [{"type": "...", "date": "...", "description": "..."}],\n  "financial_instruments": [{"ticker": "...", "name": "...", "mentioned_context": "..."}],\n  "prediction_market_relevant": true|false,\n  "key_facts": ["fact1", "fact2"]\n}`
        }
      ],
      response_format: { type: "json_object" }
    }),
  });

  if (!response.ok) {
    console.error("Entity extraction failed:", await response.text());
    return { error: "extraction_failed" };
  }

  const data = await response.json();
  try {
    return JSON.parse(data.choices[0].message.content);
  } catch {
    return { raw: data.choices[0].message.content };
  }
}

// Call Lovable AI for classification
async function classifyArticle(content: string, apiKey: string): Promise<Record<string, unknown>> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: `Classify this news article for a prediction market trading system. Output valid JSON only.`
        },
        {
          role: "user",
          content: `Classify this article:\n\n${content.substring(0, 4000)}\n\nOutput JSON:\n{\n  "primary_category": "politics|crypto|economics|sports|entertainment|science|tech|climate",\n  "secondary_categories": [],\n  "event_type": "election|policy|earnings|legal|scientific|weather|conflict|other",\n  "time_sensitivity": "breaking|developing|analysis|historical",\n  "market_relevance_score": 0-100,\n  "actionability": "immediate|short_term|long_term|informational"\n}`
        }
      ],
      response_format: { type: "json_object" }
    }),
  });

  if (!response.ok) {
    console.error("Classification failed:", await response.text());
    return { primary_category: "other", market_relevance_score: 0 };
  }

  const data = await response.json();
  try {
    return JSON.parse(data.choices[0].message.content);
  } catch {
    return { raw: data.choices[0].message.content };
  }
}

// Call Lovable AI for sentiment analysis
async function analyzeSentiment(content: string, apiKey: string): Promise<Record<string, unknown>> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: `Analyze sentiment in this news article from a trading perspective. Output valid JSON only.`
        },
        {
          role: "user",
          content: `Analyze sentiment:\n\n${content.substring(0, 4000)}\n\nOutput JSON:\n{\n  "overall_sentiment": -1.0 to 1.0,\n  "confidence": 0-100,\n  "sentiment_by_entity": {},\n  "market_sentiment_impact": {\n    "direction": "bullish|bearish|neutral|mixed",\n    "strength": "strong|moderate|weak",\n    "reasoning": "..."\n  },\n  "key_quotes": []\n}`
        }
      ],
      response_format: { type: "json_object" }
    }),
  });

  if (!response.ok) {
    console.error("Sentiment analysis failed:", await response.text());
    return { overall_sentiment: 0, confidence: 0 };
  }

  const data = await response.json();
  try {
    return JSON.parse(data.choices[0].message.content);
  } catch {
    return { raw: data.choices[0].message.content };
  }
}

// Call Lovable AI for market linking
async function linkToMarkets(content: string, markets: string[], apiKey: string): Promise<Record<string, unknown>> {
  const marketsPreview = markets.slice(0, 50).join("\n");
  
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: `Given a news article and list of active prediction markets, identify which markets are affected. Output valid JSON only.`
        },
        {
          role: "user",
          content: `Article:\n${content.substring(0, 3000)}\n\nActive Markets:\n${marketsPreview}\n\nOutput JSON:\n{\n  "affected_markets": [\n    {\n      "market_title": "...",\n      "relevance_score": 0-100,\n      "expected_impact": "bullish|bearish|neutral",\n      "impact_magnitude": "high|medium|low",\n      "reasoning": "...",\n      "time_to_impact": "immediate|hours|days|weeks"\n    }\n  ],\n  "potential_new_markets": [\n    {"suggested_title": "...", "category": "...", "reasoning": "..."}\n  ]\n}`
        }
      ],
      response_format: { type: "json_object" }
    }),
  });

  if (!response.ok) {
    console.error("Market linking failed:", await response.text());
    return { affected_markets: [], potential_new_markets: [] };
  }

  const data = await response.json();
  try {
    return JSON.parse(data.choices[0].message.content);
  } catch {
    return { raw: data.choices[0].message.content };
  }
}

// Fetch from NewsAPI
async function fetchNewsAPI(apiKey: string, categories: string[]): Promise<RawArticle[]> {
  if (!apiKey) {
    console.log("NewsAPI key not configured, skipping");
    return [];
  }

  const articles: RawArticle[] = [];
  
  for (const category of categories) {
    try {
      const response = await fetch(
        `https://newsapi.org/v2/top-headlines?category=${category}&language=en&pageSize=20`,
        { headers: { 'X-Api-Key': apiKey } }
      );
      
      if (response.ok) {
        const data = await response.json();
        for (const article of data.articles || []) {
          articles.push({
            title: article.title || '',
            description: article.description || '',
            content: article.content || article.description || '',
            url: article.url || '',
            source: article.source?.name || 'NewsAPI',
            publishedAt: article.publishedAt || new Date().toISOString(),
            category
          });
        }
      }
    } catch (error) {
      console.error(`NewsAPI fetch error for ${category}:`, error);
    }
  }
  
  return articles;
}

// Fetch from CryptoPanic
async function fetchCryptoPanic(apiKey: string): Promise<RawArticle[]> {
  if (!apiKey) {
    console.log("CryptoPanic key not configured, skipping");
    return [];
  }

  try {
    const response = await fetch(
      `https://cryptopanic.com/api/v1/posts/?auth_token=${apiKey}&filter=hot&public=true`
    );
    
    if (!response.ok) return [];
    
    const data = await response.json();
    return (data.results || []).map((item: Record<string, unknown>) => ({
      title: item.title as string || '',
      description: (item.title as string) || '',
      content: (item.title as string) || '',
      url: item.url as string || '',
      source: ((item.source as Record<string, unknown>)?.title as string) || 'CryptoPanic',
      publishedAt: item.published_at as string || new Date().toISOString(),
      category: 'crypto'
    }));
  } catch (error) {
    console.error("CryptoPanic fetch error:", error);
    return [];
  }
}

// Determine severity based on AI analysis
function determineSeverity(
  classification: Record<string, unknown>,
  sentiment: Record<string, unknown>
): string {
  const relevanceScore = (classification.market_relevance_score as number) || 0;
  const actionability = classification.actionability as string;
  const sentimentStrength = (sentiment.market_sentiment_impact as Record<string, unknown>)?.strength as string;
  
  if (relevanceScore > 80 && actionability === 'immediate') return 'critical';
  if (relevanceScore > 60 || sentimentStrength === 'strong') return 'high';
  if (relevanceScore > 40) return 'medium';
  return 'low';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    const { sources = ['newsapi'], process_last_hours = 24, force_reprocess = false } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    const newsApiKey = Deno.env.get('NEWSAPI_KEY');
    const cryptoPanicKey = Deno.env.get('CRYPTOPANIC_API_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log(`Starting news ingestion for sources: ${sources.join(', ')}`);
    
    // Fetch active prediction markets for linking
    const { data: activeMarkets } = await supabase
      .from('prediction_markets')
      .select('id, title, category')
      .eq('status', 'active')
      .limit(100);
    
    const marketTitles = (activeMarkets || []).map(m => `[${m.category}] ${m.title}`);
    
    // Fetch existing content hashes for deduplication
    const cutoffTime = new Date(Date.now() - process_last_hours * 60 * 60 * 1000).toISOString();
    const { data: existingHashes } = await supabase
      .from('real_world_events')
      .select('content_hash')
      .gte('detected_at', cutoffTime);
    
    const hashSet = new Set((existingHashes || []).map(h => h.content_hash));
    
    // Fetch articles from sources
    let rawArticles: RawArticle[] = [];
    
    if (sources.includes('newsapi')) {
      const newsApiArticles = await fetchNewsAPI(newsApiKey || '', ['business', 'technology', 'politics', 'science']);
      rawArticles = [...rawArticles, ...newsApiArticles];
    }
    
    if (sources.includes('cryptopanic')) {
      const cryptoArticles = await fetchCryptoPanic(cryptoPanicKey || '');
      rawArticles = [...rawArticles, ...cryptoArticles];
    }
    
    console.log(`Fetched ${rawArticles.length} raw articles`);
    
    let articlesIngested = 0;
    let duplicatesFound = 0;
    let articlesProcessed = 0;
    let marketsLinked = 0;
    let highImpactArticles = 0;
    let alertsGenerated = 0;
    
    // Process each article
    for (const article of rawArticles) {
      try {
        const contentHash = generateContentHash(article.title, article.content || article.description);
        
        // Check for duplicates
        if (hashSet.has(contentHash) && !force_reprocess) {
          duplicatesFound++;
          continue;
        }
        
        hashSet.add(contentHash);
        articlesIngested++;
        
        const fullContent = `${article.title}\n\n${article.content || article.description}`;
        
        // AI Processing Pipeline
        console.log(`Processing: ${article.title.substring(0, 50)}...`);
        
        // Run AI analysis in parallel for efficiency
        const [entities, classification, sentiment] = await Promise.all([
          extractEntities(fullContent, lovableApiKey),
          classifyArticle(fullContent, lovableApiKey),
          analyzeSentiment(fullContent, lovableApiKey)
        ]);
        
        // Market linking (depends on content understanding)
        const marketLinks = await linkToMarkets(fullContent, marketTitles, lovableApiKey);
        
        // Determine severity
        const severity = determineSeverity(classification, sentiment);
        if (severity === 'critical' || severity === 'high') {
          highImpactArticles++;
        }
        
        // Count linked markets
        const affectedMarkets = (marketLinks.affected_markets as unknown[]) || [];
        marketsLinked += affectedMarkets.length;
        
        // Extract entity names for the entities array
        const entityNames: string[] = [
          ...((entities.people as { name: string }[]) || []).map(p => p.name),
          ...((entities.organizations as { name: string }[]) || []).map(o => o.name),
        ];
        
        // Prepare processed article
        const processedArticle: ProcessedArticle = {
          title: article.title,
          description: article.description,
          full_content: fullContent,
          source: article.source,
          source_url: article.url,
          event_date: article.publishedAt,
          detected_at: new Date().toISOString(),
          category: (classification.primary_category as string) || article.category || 'other',
          content_hash: contentHash,
          ai_extracted_entities: entities,
          ai_classification: classification,
          ai_sentiment: sentiment,
          ai_market_links: marketLinks,
          processing_status: 'completed',
          processed_at: new Date().toISOString(),
          severity,
          entities: entityNames,
          sentiment_score: (sentiment.overall_sentiment as number) || 0,
          related_markets: affectedMarkets
            .filter((m: unknown) => (m as { relevance_score: number }).relevance_score > 50)
            .map((m: unknown) => (m as { market_title: string }).market_title)
        };
        
        // Insert into database
        const { error: insertError } = await supabase
          .from('real_world_events')
          .upsert(processedArticle, { onConflict: 'id' });
        
        if (insertError) {
          console.error('Insert error:', insertError);
        } else {
          articlesProcessed++;
        }
        
        // Generate alerts for high-impact articles
        if (severity === 'critical' && affectedMarkets.length > 0) {
          alertsGenerated++;
          console.log(`🚨 High-impact alert: ${article.title}`);
        }
        
        // Rate limiting - small delay between articles
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        console.error(`Error processing article "${article.title}":`, error);
      }
    }
    
    const processingTime = Date.now() - startTime;
    
    const result = {
      articles_ingested: articlesIngested,
      duplicates_found: duplicatesFound,
      articles_processed: articlesProcessed,
      markets_linked: marketsLinked,
      high_impact_articles: highImpactArticles,
      processing_time_ms: processingTime,
      alerts_generated: alertsGenerated,
      sources_queried: sources
    };
    
    console.log('News ingestion complete:', result);
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('AI News Engine error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
