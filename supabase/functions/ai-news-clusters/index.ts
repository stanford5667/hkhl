import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Article {
  id: string;
  title: string;
  description: string;
  source: string;
  detected_at: string;
  category: string;
  severity: string;
  sentiment_score: number;
  entities: string[];
  related_markets: string[];
  ai_extracted_entities: Record<string, unknown>;
}

interface ClusterSummary {
  narrative_title: string;
  narrative_summary: string;
  key_developments: Array<{ date: string; development: string; significance: string }>;
  main_entities: string[];
  sentiment_arc: string;
  current_state: string;
  likely_next_developments: string[];
  market_implications: string;
  confidence: number;
}

interface MarketCorrelation {
  correlation_assessment: string;
  leading_indicator: boolean;
  lag_time: string;
  price_impact_history: Array<{ date: string; development: string; market: string; price_change: string }>;
  predictive_value: number;
  current_signal: string;
  reasoning: string;
}

// Simple cosine similarity for clustering
function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Simple clustering based on text similarity (entity overlap + category matching)
function clusterArticles(articles: Article[]): Article[][] {
  const clusters: Article[][] = [];
  const assigned = new Set<string>();
  
  for (const article of articles) {
    if (assigned.has(article.id)) continue;
    
    const cluster: Article[] = [article];
    assigned.add(article.id);
    
    // Find similar articles based on entity overlap and category
    for (const other of articles) {
      if (assigned.has(other.id)) continue;
      
      const entityOverlap = calculateEntityOverlap(article, other);
      const categoryMatch = article.category === other.category ? 0.3 : 0;
      const similarityScore = entityOverlap + categoryMatch;
      
      if (similarityScore > 0.4) {
        cluster.push(other);
        assigned.add(other.id);
      }
    }
    
    if (cluster.length >= 2) {
      clusters.push(cluster);
    }
  }
  
  return clusters;
}

function calculateEntityOverlap(a: Article, b: Article): number {
  const entitiesA = new Set(a.entities || []);
  const entitiesB = new Set(b.entities || []);
  
  if (entitiesA.size === 0 || entitiesB.size === 0) return 0;
  
  let overlap = 0;
  for (const entity of entitiesA) {
    if (entitiesB.has(entity)) overlap++;
  }
  
  return overlap / Math.max(entitiesA.size, entitiesB.size);
}

async function callLovableAI(systemPrompt: string, userPrompt: string, apiKey: string): Promise<Record<string, unknown>> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" }
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("AI API error:", error);
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  
  try {
    return JSON.parse(content);
  } catch {
    console.error("Failed to parse AI response:", content);
    return {};
  }
}

async function summarizeCluster(articles: Article[], apiKey: string): Promise<ClusterSummary> {
  const systemPrompt = `You are a news analyst. Summarize this cluster of related news articles into a coherent narrative. Return valid JSON only.`;
  
  const articleList = articles.slice(0, 20).map(a => 
    `[${a.title}] - ${a.source} - ${a.detected_at} - ${(a.description || '').substring(0, 200)}`
  ).join('\n\n');
  
  const userPrompt = `Articles in cluster:\n\n${articleList}\n\nOutput JSON with: narrative_title, narrative_summary (2-3 paragraphs), key_developments (array with date, development, significance), main_entities (array), sentiment_arc (improving|worsening|stable|volatile), current_state, likely_next_developments (array), market_implications, confidence (0-100)`;
  
  const result = await callLovableAI(systemPrompt, userPrompt, apiKey);
  
  return {
    narrative_title: String(result.narrative_title || 'Untitled Narrative'),
    narrative_summary: String(result.narrative_summary || ''),
    key_developments: Array.isArray(result.key_developments) ? result.key_developments : [],
    main_entities: Array.isArray(result.main_entities) ? result.main_entities : [],
    sentiment_arc: String(result.sentiment_arc || 'stable'),
    current_state: String(result.current_state || ''),
    likely_next_developments: Array.isArray(result.likely_next_developments) ? result.likely_next_developments : [],
    market_implications: String(result.market_implications || ''),
    confidence: Number(result.confidence) || 50
  };
}

async function analyzeMarketCorrelation(
  summary: ClusterSummary, 
  developments: Array<{ date: string; development: string }>,
  markets: Array<{ id: string; title: string }>,
  apiKey: string
): Promise<MarketCorrelation> {
  if (markets.length === 0) {
    return {
      correlation_assessment: 'none',
      leading_indicator: false,
      lag_time: 'unknown',
      price_impact_history: [],
      predictive_value: 0,
      current_signal: 'neutral',
      reasoning: 'No related markets found'
    };
  }

  const systemPrompt = `Analyze the relationship between this narrative and prediction market movements. Return valid JSON only.`;
  
  const userPrompt = `Narrative: ${summary.narrative_summary}
Timeline: ${developments.map(d => `${d.date}: ${d.development}`).join('\n')}
Related Markets: ${markets.map(m => m.title).join(', ')}

Output JSON with: correlation_assessment (strong|moderate|weak|none), leading_indicator (boolean), lag_time (hours|days|weeks), price_impact_history (array), predictive_value (0-100), current_signal (bullish|bearish|neutral), reasoning`;

  const result = await callLovableAI(systemPrompt, userPrompt, apiKey);
  
  return {
    correlation_assessment: String(result.correlation_assessment || 'weak'),
    leading_indicator: Boolean(result.leading_indicator),
    lag_time: String(result.lag_time || 'days'),
    price_impact_history: Array.isArray(result.price_impact_history) ? result.price_impact_history : [],
    predictive_value: Number(result.predictive_value) || 0,
    current_signal: String(result.current_signal || 'neutral'),
    reasoning: String(result.reasoning || '')
  };
}

function calculateMomentum(articles: Article[], existingCluster: Record<string, unknown> | null): number {
  // Calculate momentum based on article recency and count
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  
  let recentCount = 0;
  let olderCount = 0;
  
  for (const article of articles) {
    const articleDate = new Date(article.detected_at).getTime();
    const ageInDays = (now - articleDate) / dayMs;
    
    if (ageInDays < 1) recentCount++;
    else if (ageInDays < 3) olderCount++;
  }
  
  // Momentum: more recent articles = positive momentum
  const momentum = ((recentCount - olderCount) / Math.max(articles.length, 1)) * 100;
  
  // If we have an existing cluster, factor in growth
  if (existingCluster) {
    const previousCount = Number(existingCluster.article_count) || 0;
    const growthFactor = articles.length > previousCount ? 20 : -10;
    return Math.max(-100, Math.min(100, momentum + growthFactor));
  }
  
  return Math.max(-100, Math.min(100, momentum));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { days_back = 7, force_recluster = false } = await req.json().catch(() => ({}));
    
    console.log(`Starting news clustering for last ${days_back} days...`);
    
    // Step 1: Fetch recent articles
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days_back);
    
    const { data: articles, error: articlesError } = await supabase
      .from('real_world_events')
      .select('*')
      .gte('detected_at', cutoffDate.toISOString())
      .order('detected_at', { ascending: false })
      .limit(500);
    
    if (articlesError) {
      console.error('Error fetching articles:', articlesError);
      throw articlesError;
    }
    
    if (!articles || articles.length === 0) {
      return new Response(JSON.stringify({
        clusters_identified: 0,
        narratives_updated: 0,
        new_narratives: 0,
        emerging_narratives: 0,
        dying_narratives: 0,
        market_signals: []
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    console.log(`Found ${articles.length} articles to cluster`);
    
    // Step 2: Cluster articles
    const clusters = clusterArticles(articles as Article[]);
    console.log(`Identified ${clusters.length} clusters`);
    
    // Step 3: Get existing clusters for comparison
    const { data: existingClusters } = await supabase
      .from('news_clusters')
      .select('*')
      .gte('cluster_date', cutoffDate.toISOString().split('T')[0]);
    
    const existingClusterMap = new Map(
      (existingClusters || []).map(c => [c.narrative_title, c])
    );
    
    // Step 4: Fetch related markets for correlation analysis
    const { data: markets } = await supabase
      .from('prediction_markets')
      .select('id, title, category')
      .eq('status', 'active')
      .limit(100);
    
    const results = {
      clusters_identified: clusters.length,
      narratives_updated: 0,
      new_narratives: 0,
      emerging_narratives: 0,
      dying_narratives: 0,
      market_signals: [] as Array<{ narrative: string; signal: string; markets: string[]; confidence: number }>
    };
    
    // Step 5: Process each cluster
    for (const cluster of clusters) {
      try {
        // Summarize cluster with AI
        const summary = await summarizeCluster(cluster, lovableApiKey);
        
        // Find related markets based on entities
        const clusterEntities = new Set(summary.main_entities.map(e => e.toLowerCase()));
        const relatedMarkets = (markets || []).filter(m => {
          const marketTitle = m.title.toLowerCase();
          for (const entity of clusterEntities) {
            if (marketTitle.includes(entity)) return true;
          }
          return false;
        });
        
        // Calculate momentum
        const existingCluster = existingClusterMap.get(summary.narrative_title);
        const momentum = calculateMomentum(cluster, existingCluster);
        
        // Determine if emerging (small cluster with high growth potential)
        const isEmerging = cluster.length < 5 && momentum > 30;
        
        // Analyze market correlation
        const correlation = await analyzeMarketCorrelation(
          summary,
          summary.key_developments,
          relatedMarkets,
          lovableApiKey
        );
        
        // Prepare cluster record
        const clusterRecord = {
          cluster_date: new Date().toISOString().split('T')[0],
          narrative_title: summary.narrative_title,
          narrative_summary: summary.narrative_summary,
          key_developments: summary.key_developments,
          main_entities: summary.main_entities,
          sentiment_arc: summary.sentiment_arc,
          article_ids: cluster.map(a => a.id),
          article_count: cluster.length,
          related_market_ids: relatedMarkets.map(m => m.id),
          market_correlation: correlation,
          momentum_score: momentum,
          is_emerging: isEmerging,
          last_updated: new Date().toISOString()
        };
        
        // Upsert cluster
        if (existingCluster) {
          await supabase
            .from('news_clusters')
            .update(clusterRecord)
            .eq('id', existingCluster.id);
          results.narratives_updated++;
        } else {
          const { data: newCluster } = await supabase
            .from('news_clusters')
            .insert({
              ...clusterRecord,
              first_detected: new Date().toISOString()
            })
            .select('id')
            .single();
          
          results.new_narratives++;
          
          // Add timeline entries for key developments
          if (newCluster && summary.key_developments.length > 0) {
            const timelineEntries = summary.key_developments.map(dev => ({
              cluster_id: newCluster.id,
              event_date: dev.date || new Date().toISOString(),
              development: dev.development,
              significance: dev.significance || 'medium',
              sentiment_change: 0
            }));
            
            await supabase.from('narrative_timeline').insert(timelineEntries);
          }
        }
        
        if (isEmerging) {
          results.emerging_narratives++;
        }
        
        // Add market signal if correlation is strong
        if (correlation.correlation_assessment === 'strong' || correlation.predictive_value > 70) {
          results.market_signals.push({
            narrative: summary.narrative_title,
            signal: correlation.current_signal,
            markets: relatedMarkets.map(m => m.title),
            confidence: correlation.predictive_value
          });
        }
        
      } catch (clusterError) {
        console.error('Error processing cluster:', clusterError);
      }
    }
    
    // Step 6: Identify dying narratives (existing clusters with no new articles)
    const currentClusterTitles = new Set(
      clusters.map(c => c[0]?.title || '')
    );
    
    for (const [title, existingCluster] of existingClusterMap) {
      if (!currentClusterTitles.has(title)) {
        // Mark as dying if momentum is very negative
        const existingMomentum = Number(existingCluster.momentum_score) || 0;
        if (existingMomentum < -30) {
          results.dying_narratives++;
        }
      }
    }
    
    console.log('Clustering complete:', results);
    
    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Error in ai-news-clusters:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
