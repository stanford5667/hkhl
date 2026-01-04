import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ParsedQuery {
  intent: string;
  filters: Record<string, any>;
  sort?: string;
  limit?: number;
  requires_whale_data?: boolean;
  requires_news_data?: boolean;
  requires_calculation?: boolean;
  comparison_type?: string;
  time_filter?: string;
}

interface SearchResult {
  type: 'market' | 'news' | 'arbitrage' | 'insight';
  data: any;
}

const parseQueryPrompt = `You are a query parser for a prediction markets platform. Parse natural language queries into structured JSON.

INTENTS:
- search_markets: Find prediction markets
- search_news: Find news/narratives
- find_arbitrage: Look for arbitrage opportunities
- compare_markets: Compare markets across platforms or time
- get_recommendations: Trading recommendations
- analyze_movement: What moved and why
- whale_activity: What smart money is doing

FILTERS (use null if not specified):
- category: "crypto" | "politics" | "sports" | "economics" | "entertainment" | null
- platform: "polymarket" | "kalshi" | null
- volume_threshold: "high" (>$1M) | "medium" ($100k-$1M) | "low" (<$100k) | null
- whale_activity: "bullish" | "bearish" | "active" | null
- time_filter: "today" | "this_week" | "this_month" | "resolving_soon" | null
- price_range: { min: number, max: number } | null (0-1 scale)
- mispriced: boolean | null

SORT OPTIONS:
- volume_desc, volume_asc
- price_change_desc, price_change_asc
- closing_soon
- confidence_desc
- relevance

Output valid JSON only, no markdown.`;

const formatResultsPrompt = `You are a helpful prediction markets assistant. Format search results into a clear, actionable response.

Guidelines:
- Lead with the most important finding
- Use emojis for visual scanning (📊 data, 🔥 hot/trending, 💰 opportunity, ⚠️ risk, 🐋 whales)
- Include specific numbers and percentages
- Keep it concise but informative
- End with a relevant insight or suggestion

Output natural language summary followed by key findings.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const { query, context } = await req.json();

    if (!query || typeof query !== 'string') {
      throw new Error("Query is required");
    }

    console.log("Processing query:", query);

    // Step 1: Parse the query
    const parseResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: parseQueryPrompt },
          { role: "user", content: `Parse this query: "${query}"` }
        ],
        temperature: 0.1,
      }),
    });

    if (!parseResponse.ok) {
      throw new Error(`Parse API error: ${parseResponse.status}`);
    }

    const parseData = await parseResponse.json();
    let parsedQuery: ParsedQuery;

    try {
      const content = parseData.choices[0].message.content;
      // Clean potential markdown
      const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsedQuery = JSON.parse(jsonStr);
    } catch (e) {
      console.error("Failed to parse query response:", e);
      // Default fallback
      parsedQuery = {
        intent: "search_markets",
        filters: {},
        sort: "volume_desc",
        limit: 10
      };
    }

    console.log("Parsed query:", parsedQuery);

    // Step 2: Execute query based on intent
    const results: SearchResult[] = [];
    
    switch (parsedQuery.intent) {
      case "search_markets":
        const markets = await searchMarkets(supabase, parsedQuery);
        results.push(...markets.map((m: any) => ({ type: 'market' as const, data: m })));
        break;
        
      case "search_news":
        const news = await searchNews(supabase, parsedQuery);
        results.push(...news.map((n: any) => ({ type: 'news' as const, data: n })));
        break;
        
      case "find_arbitrage":
        const arbs = await findArbitrage(supabase, parsedQuery);
        results.push(...arbs.map((a: any) => ({ type: 'arbitrage' as const, data: a })));
        break;
        
      case "compare_markets":
        const comparison = await compareMarkets(supabase, parsedQuery);
        results.push({ type: 'insight', data: comparison });
        break;
        
      case "get_recommendations":
        const recs = await getRecommendations(supabase, parsedQuery, context);
        results.push(...recs.map((r: any) => ({ type: 'market' as const, data: r })));
        break;
        
      case "analyze_movement":
        const movements = await analyzeMovements(supabase, parsedQuery);
        results.push(...movements.map((m: any) => ({ type: 'insight' as const, data: m })));
        break;
        
      case "whale_activity":
        const whales = await getWhaleActivity(supabase, parsedQuery);
        results.push(...whales.map((w: any) => ({ type: 'insight' as const, data: w })));
        break;
        
      default:
        // Default to market search
        const defaultMarkets = await searchMarkets(supabase, parsedQuery);
        results.push(...defaultMarkets.map((m: any) => ({ type: 'market' as const, data: m })));
    }

    // Step 3: Format results
    const formatResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: formatResultsPrompt },
          { 
            role: "user", 
            content: `Query: "${query}"\n\nResults (${results.length} found):\n${JSON.stringify(results.slice(0, 5), null, 2)}` 
          }
        ],
      }),
    });

    let summary = "Here are the results for your query.";
    if (formatResponse.ok) {
      const formatData = await formatResponse.json();
      summary = formatData.choices[0].message.content;
    }

    // Generate quick filter suggestions
    const suggestedFilters = generateFilterSuggestions(parsedQuery, results);

    return new Response(
      JSON.stringify({
        query,
        parsedQuery,
        summary,
        results,
        suggestedFilters,
        totalResults: results.length
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error in ai-query-parser:", error);
    return new Response(
      JSON.stringify({ error: errorMsg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function searchMarkets(supabase: any, parsed: ParsedQuery) {
  let query = supabase
    .from("prediction_markets")
    .select(`
      id, title, description, platform, category, status, close_date, created_at,
      market_outcomes(id, title, current_price, volume_24h, volume_total, price_change_24h)
    `)
    .eq("status", "active");

  // Apply filters
  if (parsed.filters.category) {
    query = query.eq("category", parsed.filters.category);
  }
  if (parsed.filters.platform) {
    query = query.eq("platform", parsed.filters.platform);
  }
  if (parsed.filters.time_filter === "resolving_soon") {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    query = query.lte("close_date", nextWeek.toISOString());
  }

  // Apply sort
  switch (parsed.sort) {
    case "closing_soon":
      query = query.order("close_date", { ascending: true });
      break;
    case "volume_asc":
      query = query.order("created_at", { ascending: true });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }

  query = query.limit(parsed.limit || 10);

  const { data, error } = await query;
  if (error) {
    console.error("Market search error:", error);
    return [];
  }

  // Post-process for volume filtering
  let results = data || [];
  
  if (parsed.filters.volume_threshold) {
    results = results.filter((m: any) => {
      const totalVolume = m.market_outcomes?.reduce(
        (sum: number, o: any) => sum + (o.volume_total || 0), 0
      ) || 0;
      
      switch (parsed.filters.volume_threshold) {
        case "high": return totalVolume >= 1000000;
        case "medium": return totalVolume >= 100000 && totalVolume < 1000000;
        case "low": return totalVolume < 100000;
        default: return true;
      }
    });
  }

  if (parsed.filters.price_range) {
    const { min, max } = parsed.filters.price_range;
    results = results.filter((m: any) => {
      const prices = m.market_outcomes?.map((o: any) => o.current_price) || [];
      return prices.some((p: number) => p >= min && p <= max);
    });
  }

  return results;
}

async function searchNews(supabase: any, parsed: ParsedQuery) {
  let query = supabase
    .from("news_clusters")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(parsed.limit || 10);

  if (parsed.filters.category) {
    query = query.contains("main_entities", [parsed.filters.category]);
  }

  const { data, error } = await query;
  if (error) {
    console.error("News search error:", error);
    return [];
  }
  return data || [];
}

async function findArbitrage(supabase: any, parsed: ParsedQuery) {
  let query = supabase
    .from("arbitrage_opportunities")
    .select("*")
    .eq("status", "active")
    .order("profit_potential", { ascending: false })
    .limit(parsed.limit || 10);

  if (parsed.filters.platform) {
    query = query.contains("platforms", [parsed.filters.platform]);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Arbitrage search error:", error);
    return [];
  }
  return data || [];
}

async function compareMarkets(supabase: any, parsed: ParsedQuery) {
  // Get markets for comparison
  const { data: markets } = await supabase
    .from("prediction_markets")
    .select(`
      id, title, platform, category,
      market_outcomes(title, current_price, volume_total)
    `)
    .eq("status", "active")
    .limit(20);

  // Group by similar titles for cross-platform comparison
  const grouped: Record<string, any[]> = {};
  (markets || []).forEach((m: any) => {
    const key = m.title.toLowerCase().slice(0, 30);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(m);
  });

  const comparisons = Object.entries(grouped)
    .filter(([_, markets]) => markets.length > 1)
    .map(([key, markets]) => ({
      topic: markets[0].title,
      markets: markets.map((m: any) => ({
        platform: m.platform,
        outcomes: m.market_outcomes,
        total_volume: m.market_outcomes?.reduce((s: number, o: any) => s + (o.volume_total || 0), 0)
      }))
    }));

  return {
    type: "comparison",
    comparisons: comparisons.slice(0, 5)
  };
}

async function getRecommendations(supabase: any, parsed: ParsedQuery, context?: any) {
  // Get trade ideas
  const { data: ideas } = await supabase
    .from("trade_ideas")
    .select(`
      id, direction, entry_price, target_price, confidence, 
      thesis_summary, risk_level, suggested_allocation,
      prediction_markets(id, title, platform, category)
    `)
    .eq("status", "active")
    .order("confidence", { ascending: false })
    .limit(5);

  // Filter by risk if context provided
  let results = ideas || [];
  if (context?.risk_tolerance === "conservative") {
    results = results.filter((i: any) => i.risk_level === "low" || i.risk_level === "medium");
  } else if (context?.risk_tolerance === "aggressive") {
    results = results.filter((i: any) => i.confidence >= 70);
  }

  return results;
}

async function analyzeMovements(supabase: any, parsed: ParsedQuery) {
  // Get recent price history
  const since = new Date();
  since.setHours(since.getHours() - 24);

  const { data: movements } = await supabase
    .from("market_outcomes")
    .select(`
      id, title, current_price, price_change_24h, volume_24h,
      prediction_markets(id, title, platform, category)
    `)
    .not("price_change_24h", "is", null)
    .order("price_change_24h", { ascending: false })
    .limit(10);

  // Get related news
  const { data: news } = await supabase
    .from("news_clusters")
    .select("id, narrative_title, narrative_summary, momentum_score")
    .gte("created_at", since.toISOString())
    .order("momentum_score", { ascending: false })
    .limit(5);

  return [
    { type: "top_movers", data: movements || [] },
    { type: "related_news", data: news || [] }
  ];
}

async function getWhaleActivity(supabase: any, parsed: ParsedQuery) {
  const { data: transactions } = await supabase
    .from("whale_transactions")
    .select("*")
    .order("detected_at", { ascending: false })
    .limit(20);

  // Aggregate by direction
  const bullish = (transactions || []).filter((t: any) => t.direction === "buy").length;
  const bearish = (transactions || []).filter((t: any) => t.direction === "sell").length;

  return [{
    type: "whale_summary",
    total_transactions: (transactions || []).length,
    bullish_count: bullish,
    bearish_count: bearish,
    sentiment: bullish > bearish ? "bullish" : bearish > bullish ? "bearish" : "neutral",
    recent: (transactions || []).slice(0, 5)
  }];
}

function generateFilterSuggestions(parsed: ParsedQuery, results: SearchResult[]): string[] {
  const suggestions: string[] = [];

  // Suggest based on what wasn't filtered
  if (!parsed.filters.category) {
    const categories = [...new Set(results.map(r => r.data?.category).filter(Boolean))];
    if (categories.length > 0) {
      suggestions.push(`Filter by: ${categories[0]}`);
    }
  }

  if (!parsed.filters.platform) {
    suggestions.push("Compare across platforms");
  }

  if (!parsed.filters.volume_threshold) {
    suggestions.push("High volume only");
  }

  if (parsed.intent === "search_markets") {
    suggestions.push("Show whale activity");
    suggestions.push("Find arbitrage");
  }

  return suggestions.slice(0, 4);
}
