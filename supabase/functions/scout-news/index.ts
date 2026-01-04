import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuration
const GDELT_SUMMARY_API = "https://api.gdeltproject.org/api/v2/summary/summary";
const EVENT_REGISTRY_API = "https://eventregistry.org/api/v1";
const FINANCIAL_CONCEPTS = ['Business', 'Finance', 'Technology', 'Economy', 'Stock', 'Market', 'Investment', 'Banking', 'Cryptocurrency', 'Fintech'];

interface GdeltTheme {
  theme: string;
  count: number;
}

interface EventRegistryEvent {
  uri: string;
  title: { eng?: string };
  summary: { eng?: string };
  eventDate: string;
  concepts: Array<{ label: { eng?: string }; type: string }>;
  categories: Array<{ label: string }>;
  articleCounts?: { total: number };
  stories?: Array<{ medoidArticle?: { url: string } }>;
}

// =============================================
// GDELT SCOUT: Poll for trending keywords
// =============================================
async function pollGdeltTrending(categories: string[] = ['Economy', 'Tech']): Promise<string[]> {
  console.log(`[GDELT Scout] Polling for trending themes in: ${categories.join(', ')}`);
  
  const trendingKeywords: string[] = [];
  
  for (const category of categories) {
    try {
      // GDELT Summary API for trending themes
      const url = `${GDELT_SUMMARY_API}?d=web&t=theme&ts=24h&svt=topthemes&stc=25&c=${category.toLowerCase()}`;
      console.log(`[GDELT Scout] Fetching: ${url}`);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        console.warn(`[GDELT Scout] Non-200 response for ${category}: ${response.status}`);
        continue;
      }
      
      const data = await response.json();
      
      if (data?.themes) {
        const themes = data.themes as GdeltTheme[];
        const topThemes = themes
          .filter((t: GdeltTheme) => t.count > 5) // Filter by minimum article count
          .slice(0, 10)
          .map((t: GdeltTheme) => t.theme);
        
        console.log(`[GDELT Scout] Found ${topThemes.length} trending themes for ${category}`);
        trendingKeywords.push(...topThemes);
      }
    } catch (error) {
      console.error(`[GDELT Scout] Error polling ${category}:`, error);
    }
  }
  
  // Deduplicate and return
  const uniqueKeywords = [...new Set(trendingKeywords)];
  console.log(`[GDELT Scout] Total unique trending keywords: ${uniqueKeywords.length}`);
  
  return uniqueKeywords;
}

// =============================================
// EVENT REGISTRY: Deep dive for event objects
// =============================================
async function fetchEventRegistryEvents(keywords: string[], apiKey: string): Promise<EventRegistryEvent[]> {
  console.log(`[Event Registry] Fetching events for ${keywords.length} keywords`);
  
  const allEvents: EventRegistryEvent[] = [];
  
  // Process in batches to avoid rate limits
  const batchSize = 5;
  for (let i = 0; i < keywords.length; i += batchSize) {
    const batch = keywords.slice(i, i + batchSize);
    const keyword = batch.join(' OR ');
    
    try {
      const requestBody = {
        apiKey,
        action: "getEvents",
        resultType: "events",
        eventsSortBy: "date",
        eventsCount: 20,
        keyword,
        lang: "eng",
        dateStart: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        includeEventConcepts: true,
        includeEventCategories: true,
        includeEventStories: true,
        includeStoryMedoidArticle: true,
      };
      
      console.log(`[Event Registry] Querying batch ${Math.floor(i / batchSize) + 1} with keyword: ${keyword.substring(0, 50)}...`);
      
      const response = await fetch(`${EVENT_REGISTRY_API}/event/getEvents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        console.warn(`[Event Registry] Non-200 response: ${response.status}`);
        continue;
      }
      
      const data = await response.json();
      
      if (data?.events?.results) {
        allEvents.push(...data.events.results);
        console.log(`[Event Registry] Found ${data.events.results.length} events in batch`);
      }
      
      // Small delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      console.error(`[Event Registry] Error fetching events:`, error);
    }
  }
  
  console.log(`[Event Registry] Total events fetched: ${allEvents.length}`);
  return allEvents;
}

// =============================================
// FINANCIAL FILTER: Only process relevant events
// =============================================
function applyFinancialFilter(events: EventRegistryEvent[]): EventRegistryEvent[] {
  console.log(`[Financial Filter] Filtering ${events.length} events`);
  
  const filtered = events.filter(event => {
    // Check concepts for financial relevance
    const conceptLabels = event.concepts?.map(c => c.label?.eng || '').join(' ').toLowerCase() || '';
    const categoryLabels = event.categories?.map(c => c.label).join(' ').toLowerCase() || '';
    const combined = `${conceptLabels} ${categoryLabels}`;
    
    return FINANCIAL_CONCEPTS.some(concept => 
      combined.includes(concept.toLowerCase())
    );
  });
  
  console.log(`[Financial Filter] ${filtered.length} events passed filter (${events.length - filtered.length} filtered out)`);
  return filtered;
}

// =============================================
// UPSERT LOGIC: Store in news_events table
// =============================================
async function upsertNewsEvents(
  supabase: any,
  events: EventRegistryEvent[]
): Promise<{ inserted: number; updated: number; errors: number }> {
  console.log(`[Upsert] Processing ${events.length} events`);
  
  const stats = { inserted: 0, updated: 0, errors: 0 };
  
  for (const event of events) {
    try {
      const sourceId = event.uri;
      const sourceCount = event.articleCounts?.total || 1;
      
      // Extract primary URL from stories
      const primaryUrl = event.stories?.[0]?.medoidArticle?.url || null;
      
      // Build raw_concepts JSONB
      const rawConcepts = {
        concepts: event.concepts?.map(c => ({
          label: c.label?.eng,
          type: c.type,
        })) || [],
        categories: event.categories?.map(c => c.label) || [],
        sourceCount,
        signalStrength: Math.min(100, Math.floor(Math.log10(sourceCount + 1) * 30)),
      };
      
      // Check if exists
      const { data: existing } = await supabase
        .from('news_events')
        .select('id, raw_concepts')
        .eq('source_id', sourceId)
        .maybeSingle();
      
      if (existing) {
        // Update with merged concepts
        const existingConcepts = (existing as any).raw_concepts as Record<string, unknown> || {};
        const mergedConcepts = {
          ...existingConcepts,
          ...rawConcepts,
          sourceCount: Math.max(
            (existingConcepts.sourceCount as number) || 0,
            sourceCount
          ),
        };
        
        const { error } = await supabase
          .from('news_events')
          .update({
            raw_concepts: mergedConcepts,
            updated_at: new Date().toISOString(),
          })
          .eq('id', (existing as any).id);
        
        if (error) throw error;
        stats.updated++;
        console.log(`[Upsert] Updated: ${sourceId} (source count: ${sourceCount})`);
      } else {
        // Insert new
        const { error } = await supabase
          .from('news_events')
          .insert({
            source_id: sourceId,
            title: event.title?.eng || 'Untitled Event',
            summary: event.summary?.eng || null,
            url: primaryUrl,
            published_at: event.eventDate ? new Date(event.eventDate).toISOString() : new Date().toISOString(),
            raw_concepts: rawConcepts,
          });
        
        if (error) throw error;
        stats.inserted++;
        console.log(`[Upsert] Inserted: ${sourceId} (source count: ${sourceCount})`);
      }
    } catch (error) {
      console.error(`[Upsert] Error processing event ${event.uri}:`, error);
      stats.errors++;
    }
  }
  
  console.log(`[Upsert] Complete - Inserted: ${stats.inserted}, Updated: ${stats.updated}, Errors: ${stats.errors}`);
  return stats;
}

// =============================================
// MAIN HANDLER
// =============================================
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log(`[Scout News] ====== Starting signal scout at ${new Date().toISOString()} ======`);

  try {
    // Get API keys
    const eventRegistryKey = Deno.env.get('EVENT_REGISTRY_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!eventRegistryKey) {
      throw new Error('EVENT_REGISTRY_API_KEY not configured');
    }
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase credentials not configured');
    }
    
    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Parse optional parameters from request
    let categories = ['Economy', 'Tech'];
    try {
      const body = await req.json();
      if (body?.categories) {
        categories = body.categories;
      }
    } catch {
      // Use defaults if no body
    }
    
    // Step 1: Poll GDELT for trending keywords
    console.log(`[Scout News] Step 1: Polling GDELT...`);
    const trendingKeywords = await pollGdeltTrending(categories);
    
    if (trendingKeywords.length === 0) {
      console.log(`[Scout News] No trending keywords found, exiting`);
      return new Response(JSON.stringify({
        success: true,
        message: 'No trending keywords found',
        stats: { keywords: 0, events: 0, inserted: 0, updated: 0 },
        durationMs: Date.now() - startTime,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Step 2: Fetch detailed events from Event Registry
    console.log(`[Scout News] Step 2: Fetching Event Registry events...`);
    const events = await fetchEventRegistryEvents(trendingKeywords, eventRegistryKey);
    
    // Step 3: Apply financial filter
    console.log(`[Scout News] Step 3: Applying financial filter...`);
    const filteredEvents = applyFinancialFilter(events);
    
    if (filteredEvents.length === 0) {
      console.log(`[Scout News] No events passed financial filter, exiting`);
      return new Response(JSON.stringify({
        success: true,
        message: 'No financially relevant events found',
        stats: { keywords: trendingKeywords.length, events: events.length, filtered: 0, inserted: 0, updated: 0 },
        durationMs: Date.now() - startTime,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Step 4: Upsert to database
    console.log(`[Scout News] Step 4: Upserting to database...`);
    const upsertStats = await upsertNewsEvents(supabase, filteredEvents);
    
    const result = {
      success: true,
      message: `Scouted ${filteredEvents.length} signals`,
      stats: {
        keywords: trendingKeywords.length,
        eventsFound: events.length,
        eventsFiltered: filteredEvents.length,
        ...upsertStats,
      },
      durationMs: Date.now() - startTime,
      sampleKeywords: trendingKeywords.slice(0, 5),
    };
    
    console.log(`[Scout News] ====== Complete in ${result.durationMs}ms ======`);
    console.log(`[Scout News] Result:`, JSON.stringify(result, null, 2));
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Scout News] Fatal error:`, error);
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
      durationMs: Date.now() - startTime,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
