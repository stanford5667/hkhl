import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const COOLDOWN_MINUTES = 15; // Don't re-analyze markets within this window
const PRICE_CHANGE_THRESHOLD = 5; // 5% minimum change to trigger analysis

interface MarketWithPriceChange {
  market_id: string;
  title: string;
  category: string;
  current_price: number;
  previous_price: number;
  price_change_percent: number;
  last_ai_analyzed_at: string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const perplexityKey = Deno.env.get("PERPLEXITY_API_KEY");
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json().catch(() => ({}));
    const { market_id, force = false } = body;

    console.log(`[analyze-market-movement] Starting analysis. market_id: ${market_id}, force: ${force}`);

    // Step 1: Find markets with significant price movements
    let marketsToAnalyze: MarketWithPriceChange[] = [];

    if (market_id) {
      // Analyze specific market
      const market = await getMarketWithPriceChange(supabase, market_id);
      if (market) marketsToAnalyze = [market];
    } else {
      // Find all markets with >5% price change in last hour
      marketsToAnalyze = await findMarketsWithSignificantMovement(supabase);
    }

    console.log(`[analyze-market-movement] Found ${marketsToAnalyze.length} markets to analyze`);

    const results = [];

    for (const market of marketsToAnalyze) {
      // Step 2: Check cooldown
      if (!force && market.last_ai_analyzed_at) {
        const lastAnalyzed = new Date(market.last_ai_analyzed_at);
        const cooldownExpiry = new Date(lastAnalyzed.getTime() + COOLDOWN_MINUTES * 60 * 1000);
        
        if (new Date() < cooldownExpiry) {
          console.log(`[analyze-market-movement] Skipping ${market.market_id} - cooldown active until ${cooldownExpiry.toISOString()}`);
          results.push({
            market_id: market.market_id,
            status: "skipped",
            reason: "cooldown_active",
            cooldown_expires: cooldownExpiry.toISOString(),
          });
          continue;
        }
      }

      // Step 3: Search for relevant news via Perplexity
      let newsArticles: any[] = [];
      
      if (perplexityKey) {
        newsArticles = await searchNewsWithPerplexity(perplexityKey, market.title, market.category);
        console.log(`[analyze-market-movement] Found ${newsArticles.length} news articles for "${market.title}"`);
      } else {
        console.warn("[analyze-market-movement] PERPLEXITY_API_KEY not set, skipping news search");
      }

      // Step 4: Save news to raw_signals
      const savedSignals = [];
      for (const article of newsArticles) {
        const { data: signal, error } = await supabase
          .from("raw_signals")
          .insert({
            content: article.content || article.snippet,
            source_url: article.url,
            source_type: "news",
            published_at: article.published_at || new Date().toISOString(),
            metadata: {
              title: article.title,
              source: article.source,
              market_id: market.market_id,
              search_query: market.title,
            },
          })
          .select()
          .single();

        if (!error && signal) {
          savedSignals.push(signal);
        }
      }

      console.log(`[analyze-market-movement] Saved ${savedSignals.length} signals to raw_signals`);

      // Step 5: Use AI to determine if news explains the price move
      let aiAnalysis = null;
      let marketDriversCreated = 0;

      if (lovableKey && savedSignals.length > 0) {
        aiAnalysis = await analyzeWithAI(
          lovableKey,
          market,
          savedSignals
        );

        // Step 6: Create market_drivers entries for signals that explain the move
        if (aiAnalysis?.drivers) {
          for (const driver of aiAnalysis.drivers) {
            const signal = savedSignals.find((s) => s.id === driver.signal_id);
            if (!signal) continue;

            const { error } = await supabase.from("market_drivers").insert({
              market_id: market.market_id,
              signal_id: driver.signal_id,
              impact_score: driver.impact_score,
              direction: driver.direction,
              ai_reasoning: driver.reasoning,
              confidence: driver.confidence,
            });

            if (!error) marketDriversCreated++;
          }
        }
      }

      // Step 7: Update last_ai_analyzed_at
      await supabase
        .from("prediction_markets")
        .update({ last_ai_analyzed_at: new Date().toISOString() })
        .eq("id", market.market_id);

      results.push({
        market_id: market.market_id,
        title: market.title,
        price_change_percent: market.price_change_percent,
        status: "analyzed",
        signals_saved: savedSignals.length,
        drivers_created: marketDriversCreated,
        ai_summary: aiAnalysis?.summary || null,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        analyzed_count: results.filter((r) => r.status === "analyzed").length,
        skipped_count: results.filter((r) => r.status === "skipped").length,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[analyze-market-movement] Error:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function getMarketWithPriceChange(
  supabase: any,
  marketId: string
): Promise<MarketWithPriceChange | null> {
  // Get market details
  const { data: market, error: marketError } = await supabase
    .from("prediction_markets")
    .select("id, title, category, last_ai_analyzed_at")
    .eq("id", marketId)
    .single();

  if (marketError || !market) return null;

  // Get recent price history
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: prices } = await supabase
    .from("market_price_history")
    .select("price, timestamp")
    .eq("market_id", marketId)
    .gte("timestamp", oneHourAgo)
    .order("timestamp", { ascending: true });

  if (!prices || prices.length < 2) return null;

  const previousPrice = prices[0].price;
  const currentPrice = prices[prices.length - 1].price;
  const priceChangePercent = ((currentPrice - previousPrice) / previousPrice) * 100;

  return {
    market_id: market.id,
    title: market.title,
    category: market.category || "general",
    current_price: currentPrice,
    previous_price: previousPrice,
    price_change_percent: priceChangePercent,
    last_ai_analyzed_at: market.last_ai_analyzed_at,
  };
}

async function findMarketsWithSignificantMovement(
  supabase: any
): Promise<MarketWithPriceChange[]> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  // Get all active markets
  const { data: markets, error } = await supabase
    .from("prediction_markets")
    .select("id, title, category, last_ai_analyzed_at")
    .eq("status", "active");

  if (error || !markets) return [];

  const marketsWithMovement: MarketWithPriceChange[] = [];

  for (const market of markets) {
    // Get price history for this market
    const { data: prices } = await supabase
      .from("market_price_history")
      .select("price, timestamp")
      .eq("market_id", market.id)
      .gte("timestamp", oneHourAgo)
      .order("timestamp", { ascending: true });

    if (!prices || prices.length < 2) continue;

    const previousPrice = prices[0].price;
    const currentPrice = prices[prices.length - 1].price;
    const priceChangePercent = ((currentPrice - previousPrice) / previousPrice) * 100;

    if (Math.abs(priceChangePercent) >= PRICE_CHANGE_THRESHOLD) {
      marketsWithMovement.push({
        market_id: market.id,
        title: market.title,
        category: market.category || "general",
        current_price: currentPrice,
        previous_price: previousPrice,
        price_change_percent: priceChangePercent,
        last_ai_analyzed_at: market.last_ai_analyzed_at,
      });
    }
  }

  return marketsWithMovement;
}

async function searchNewsWithPerplexity(
  apiKey: string,
  marketTitle: string,
  category: string
): Promise<any[]> {
  try {
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          {
            role: "system",
            content: `You are a news researcher. Find recent news articles (within the last hour) related to the topic. Return a JSON array of articles with fields: title, snippet, url, source.`,
          },
          {
            role: "user",
            content: `Find the latest breaking news about: "${marketTitle}" in the ${category} category. Focus on events that could affect predictions or betting markets.`,
          },
        ],
        search_recency_filter: "day",
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "news_articles",
            schema: {
              type: "object",
              properties: {
                articles: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      snippet: { type: "string" },
                      url: { type: "string" },
                      source: { type: "string" },
                    },
                    required: ["title", "snippet"],
                  },
                },
              },
              required: ["articles"],
            },
          },
        },
      }),
    });

    if (!response.ok) {
      console.error("[Perplexity] API error:", response.status);
      return [];
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (content) {
      const parsed = JSON.parse(content);
      return parsed.articles || [];
    }

    return [];
  } catch (error) {
    console.error("[Perplexity] Error searching news:", error);
    return [];
  }
}

async function analyzeWithAI(
  apiKey: string,
  market: MarketWithPriceChange,
  signals: any[]
): Promise<{ summary: string; drivers: any[] } | null> {
  try {
    const signalsSummary = signals
      .map((s, i) => `[${i + 1}] ${s.metadata?.title || "News"}: ${s.content?.substring(0, 200)}...`)
      .join("\n");

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
            content: `You are a prediction market analyst. Analyze whether recent news explains a significant price movement in a prediction market.

You must respond with a JSON object containing:
- summary: A brief explanation of what's driving the market movement
- drivers: An array of objects, each with:
  - signal_index: The 1-based index of the news article
  - impact_score: 0-100 rating of how much this news explains the movement
  - direction: "bullish", "bearish", or "neutral"
  - reasoning: Brief explanation
  - confidence: 0-1 rating of your confidence

Only include articles that actually explain the price movement.`,
          },
          {
            role: "user",
            content: `Market: "${market.title}"
Category: ${market.category}
Price Change: ${market.price_change_percent.toFixed(2)}% (from ${market.previous_price} to ${market.current_price})

Recent News:
${signalsSummary}

Analyze which news articles (if any) explain this price movement.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_market_drivers",
              description: "Analyze which news articles explain the market price movement",
              parameters: {
                type: "object",
                properties: {
                  summary: {
                    type: "string",
                    description: "Brief summary of what's driving the market",
                  },
                  drivers: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        signal_index: { type: "number" },
                        impact_score: { type: "number" },
                        direction: { type: "string", enum: ["bullish", "bearish", "neutral"] },
                        reasoning: { type: "string" },
                        confidence: { type: "number" },
                      },
                      required: ["signal_index", "impact_score", "direction", "reasoning", "confidence"],
                    },
                  },
                },
                required: ["summary", "drivers"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "analyze_market_drivers" } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Lovable AI] API error:", response.status, errorText);
      return null;
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      const analysis = JSON.parse(toolCall.function.arguments);
      
      // Map signal_index back to actual signal IDs
      return {
        summary: analysis.summary,
        drivers: analysis.drivers.map((d: any) => ({
          signal_id: signals[d.signal_index - 1]?.id,
          impact_score: Math.min(100, Math.max(0, d.impact_score)),
          direction: d.direction,
          reasoning: d.reasoning,
          confidence: Math.min(1, Math.max(0, d.confidence)),
        })).filter((d: any) => d.signal_id),
      };
    }

    return null;
  } catch (error) {
    console.error("[Lovable AI] Error analyzing market:", error);
    return null;
  }
}
