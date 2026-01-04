import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface MarketData {
  id: string;
  title: string;
  platform: string;
  category: string;
  current_price: number;
  volume: number;
}

// Tool definitions for the AI
const tools = [
  {
    type: "function",
    function: {
      name: "search_markets",
      description: "Search prediction markets by query. Returns matching markets with current prices and volume.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query for markets" },
          category: { type: "string", description: "Filter by category (politics, crypto, sports, etc.)" },
          platform: { type: "string", description: "Filter by platform (polymarket, kalshi)" }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_market_detail",
      description: "Get detailed information about a specific market including outcomes, volume, and history.",
      parameters: {
        type: "object",
        properties: {
          market_id: { type: "string", description: "The market ID to fetch details for" }
        },
        required: ["market_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_news",
      description: "Get recent news articles and clusters related to prediction markets.",
      parameters: {
        type: "object",
        properties: {
          topic: { type: "string", description: "Topic to search news for" },
          limit: { type: "number", description: "Maximum number of articles to return" }
        },
        required: ["topic"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_whale_activity",
      description: "Get whale (large trader) activity for markets.",
      parameters: {
        type: "object",
        properties: {
          market_id: { type: "string", description: "Optional market ID to filter by" },
          limit: { type: "number", description: "Maximum number of transactions" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_sentiment",
      description: "Get KOL (Key Opinion Leader) sentiment data for markets or topics.",
      parameters: {
        type: "object",
        properties: {
          topic: { type: "string", description: "Topic to get sentiment for" },
          market_id: { type: "string", description: "Optional market ID" }
        },
        required: ["topic"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "calculate_arbitrage",
      description: "Calculate arbitrage opportunities for a market.",
      parameters: {
        type: "object",
        properties: {
          market_id: { type: "string", description: "Market ID to analyze" }
        },
        required: ["market_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "calculate_kelly",
      description: "Calculate optimal position size using Kelly criterion.",
      parameters: {
        type: "object",
        properties: {
          probability: { type: "number", description: "Your estimated probability (0-1)" },
          market_price: { type: "number", description: "Current market price (0-1)" },
          bankroll: { type: "number", description: "Total bankroll amount" }
        },
        required: ["probability", "market_price", "bankroll"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_trade_ideas",
      description: "Get AI-generated trade ideas for prediction markets.",
      parameters: {
        type: "object",
        properties: {
          category: { type: "string", description: "Filter by category" },
          min_confidence: { type: "number", description: "Minimum confidence threshold" },
          limit: { type: "number", description: "Number of ideas to return" }
        }
      }
    }
  }
];

// Tool execution functions
async function executeTools(
  toolCalls: any[],
  supabase: any
): Promise<{ tool_call_id: string; output: string }[]> {
  const results = [];
  
  for (const call of toolCalls) {
    const { id, function: fn } = call;
    const args = JSON.parse(fn.arguments);
    let output: any;
    
    try {
      switch (fn.name) {
        case "search_markets":
          output = await searchMarkets(supabase, args);
          break;
        case "get_market_detail":
          output = await getMarketDetail(supabase, args.market_id);
          break;
        case "get_news":
          output = await getNews(supabase, args);
          break;
        case "get_whale_activity":
          output = await getWhaleActivity(supabase, args);
          break;
        case "get_sentiment":
          output = await getSentiment(supabase, args);
          break;
        case "calculate_arbitrage":
          output = await calculateArbitrage(supabase, args.market_id);
          break;
        case "calculate_kelly":
          output = calculateKelly(args);
          break;
        case "get_trade_ideas":
          output = await getTradeIdeas(supabase, args);
          break;
        default:
          output = { error: `Unknown tool: ${fn.name}` };
      }
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Tool ${fn.name} error:`, error);
      output = { error: `Tool execution failed: ${errorMsg}` };
    }
    
    results.push({
      tool_call_id: id,
      output: JSON.stringify(output)
    });
  }
  
  return results;
}

async function searchMarkets(supabase: any, args: { query: string; category?: string; platform?: string }) {
  let query = supabase
    .from("prediction_markets")
    .select("id, title, description, platform, category, status, close_date")
    .ilike("title", `%${args.query}%`)
    .eq("status", "active")
    .limit(10);
  
  if (args.category) {
    query = query.eq("category", args.category);
  }
  if (args.platform) {
    query = query.eq("platform", args.platform);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  
  // Get outcomes for these markets
  if (data && data.length > 0) {
    const marketIds = data.map((m: any) => m.id);
    const { data: outcomes } = await supabase
      .from("market_outcomes")
      .select("market_id, title, current_price, volume_24h")
      .in("market_id", marketIds);
    
    return data.map((market: any) => ({
      ...market,
      outcomes: outcomes?.filter((o: any) => o.market_id === market.id) || []
    }));
  }
  
  return data || [];
}

async function getMarketDetail(supabase: any, marketId: string) {
  const { data: market, error } = await supabase
    .from("prediction_markets")
    .select("*")
    .eq("id", marketId)
    .single();
  
  if (error) throw error;
  
  const { data: outcomes } = await supabase
    .from("market_outcomes")
    .select("*")
    .eq("market_id", marketId);
  
  const { data: priceHistory } = await supabase
    .from("market_price_history")
    .select("timestamp, price, outcome_id")
    .eq("market_id", marketId)
    .order("timestamp", { ascending: false })
    .limit(100);
  
  return {
    ...market,
    outcomes: outcomes || [],
    price_history: priceHistory || []
  };
}

async function getNews(supabase: any, args: { topic: string; limit?: number }) {
  const { data, error } = await supabase
    .from("news_clusters")
    .select("id, narrative_title, narrative_summary, article_count, momentum_score, sentiment_arc, main_entities, created_at")
    .or(`narrative_title.ilike.%${args.topic}%,narrative_summary.ilike.%${args.topic}%`)
    .order("created_at", { ascending: false })
    .limit(args.limit || 10);
  
  if (error) throw error;
  return data || [];
}

async function getWhaleActivity(supabase: any, args: { market_id?: string; limit?: number }) {
  let query = supabase
    .from("whale_transactions")
    .select("*")
    .order("detected_at", { ascending: false })
    .limit(args.limit || 20);
  
  if (args.market_id) {
    query = query.contains("related_markets", [args.market_id]);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function getSentiment(supabase: any, args: { topic: string; market_id?: string }) {
  let query = supabase
    .from("kol_sentiment")
    .select(`
      id, sentiment_score, confidence, content_snippet, posted_at,
      kol_accounts(username, display_name, influence_score, accuracy_score)
    `)
    .or(`topics.cs.{${args.topic}},content_snippet.ilike.%${args.topic}%`)
    .order("detected_at", { ascending: false })
    .limit(20);
  
  if (args.market_id) {
    query = query.contains("related_markets", [args.market_id]);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  
  // Calculate aggregate sentiment
  const scores = (data || []).map((d: any) => d.sentiment_score).filter(Boolean);
  const avgSentiment = scores.length > 0 
    ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length 
    : 0;
  
  return {
    posts: data || [],
    aggregate_sentiment: avgSentiment,
    bullish_count: scores.filter((s: number) => s > 0.3).length,
    bearish_count: scores.filter((s: number) => s < -0.3).length,
    neutral_count: scores.filter((s: number) => s >= -0.3 && s <= 0.3).length
  };
}

async function calculateArbitrage(supabase: any, marketId: string) {
  const { data: outcomes, error } = await supabase
    .from("market_outcomes")
    .select("id, title, current_price")
    .eq("market_id", marketId);
  
  if (error) throw error;
  if (!outcomes || outcomes.length === 0) {
    return { error: "No outcomes found for this market" };
  }
  
  const totalPrice = outcomes.reduce((sum: number, o: any) => sum + (o.current_price || 0), 0);
  const hasArbitrage = totalPrice < 1.0;
  
  return {
    outcomes: outcomes,
    total_price: totalPrice,
    has_arbitrage: hasArbitrage,
    guaranteed_profit_percent: hasArbitrage ? ((1 - totalPrice) / totalPrice * 100).toFixed(2) : 0,
    recommendation: hasArbitrage 
      ? `Buy all outcomes for $${(totalPrice * 1000).toFixed(0)} to guarantee $1000 at resolution (${((1 - totalPrice) / totalPrice * 100).toFixed(1)}% profit)`
      : "No arbitrage opportunity - sum of prices >= 100%"
  };
}

function calculateKelly(args: { probability: number; market_price: number; bankroll: number }) {
  const { probability, market_price, bankroll } = args;
  const p = probability;
  const q = 1 - p;
  const b = (1 - market_price) / market_price; // Odds
  
  const kelly = (b * p - q) / b;
  const safeKelly = Math.max(0, Math.min(kelly, 0.25)); // Cap at 25%
  const positionSize = safeKelly * bankroll;
  
  const ev = p * (1 - market_price) - (1 - p) * market_price;
  
  return {
    full_kelly: (kelly * 100).toFixed(2) + "%",
    quarter_kelly: (kelly * 25).toFixed(2) + "%",
    recommended_fraction: (safeKelly * 100).toFixed(2) + "%",
    position_size: positionSize.toFixed(2),
    expected_value: (ev * 100).toFixed(2) + "%",
    edge: ((p - market_price) * 100).toFixed(2) + "%",
    recommendation: kelly > 0 
      ? `Bet $${positionSize.toFixed(0)} (${(safeKelly * 100).toFixed(1)}% of bankroll)`
      : "Do not bet - no edge detected"
  };
}

async function getTradeIdeas(supabase: any, args: { category?: string; min_confidence?: number; limit?: number }) {
  let query = supabase
    .from("trade_ideas")
    .select(`
      id, direction, entry_price, target_price, confidence, 
      thesis_summary, risk_level, suggested_allocation, time_horizon,
      prediction_markets(title, platform, category)
    `)
    .eq("status", "active")
    .order("confidence", { ascending: false })
    .limit(args.limit || 5);
  
  if (args.category) {
    query = query.eq("prediction_markets.category", args.category);
  }
  if (args.min_confidence) {
    query = query.gte("confidence", args.min_confidence);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

const systemPrompt = `You are an expert prediction market research assistant. You help users analyze markets, understand news impact, track whale activity, and make informed trading decisions.

Your capabilities:
- Search and analyze prediction markets across platforms
- Fetch and interpret recent news affecting markets
- Track whale (large trader) activity and smart money movements
- Analyze KOL (Key Opinion Leader) sentiment
- Calculate arbitrage opportunities
- Calculate optimal position sizing using Kelly criterion
- Generate and explain trade ideas

When users ask questions:
1. Use the appropriate tools to gather data
2. Synthesize the information into clear, actionable insights
3. Always present balanced views with both bull and bear cases
4. Include specific numbers and sources when available
5. If calculating positions, always emphasize risk management

Format your responses with:
- 📊 for data and statistics
- 📰 for news and information
- 🐋 for whale activity
- 💬 for sentiment
- 💡 for your analysis and recommendations
- ⚠️ for risks and warnings

Be conversational but informative. Help users understand markets deeply, not just surface-level data.`;

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
    
    const { message, conversationHistory = [] } = await req.json();
    
    // Build messages array
    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.slice(-10), // Keep last 10 messages for context
      { role: "user", content: message }
    ];

    console.log("Calling AI with message:", message);

    // Initial AI call with tools
    let response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        tools,
        tool_choice: "auto"
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    let data = await response.json();
    let assistantMessage = data.choices[0].message;
    
    // Handle tool calls iteratively
    let iterations = 0;
    const maxIterations = 5;
    
    while (assistantMessage.tool_calls && iterations < maxIterations) {
      console.log("Processing tool calls:", assistantMessage.tool_calls.map((t: any) => t.function.name));
      
      // Execute all tool calls
      const toolResults = await executeTools(assistantMessage.tool_calls, supabase);
      
      // Add assistant message and tool results to conversation
      messages.push({
        role: "assistant",
        content: assistantMessage.content || "",
        ...({ tool_calls: assistantMessage.tool_calls } as any)
      });
      
      for (const result of toolResults) {
        messages.push({
          role: "tool" as any,
          content: result.output,
          ...({ tool_call_id: result.tool_call_id } as any)
        });
      }
      
      // Call AI again with tool results
      response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages,
          tools,
          tool_choice: "auto"
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("AI API error on tool response:", response.status, errorText);
        throw new Error(`AI API error: ${response.status}`);
      }

      data = await response.json();
      assistantMessage = data.choices[0].message;
      iterations++;
    }

    const finalContent = assistantMessage.content || "I wasn't able to generate a response. Please try again.";
    
    // Extract any suggested follow-up questions from the response
    const suggestedQuestions = extractSuggestedQuestions(finalContent);

    return new Response(
      JSON.stringify({
        message: finalContent,
        suggestedQuestions,
        toolsUsed: iterations > 0
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error in ai-market-chat:", error);
    return new Response(
      JSON.stringify({ 
        error: errorMsg,
        message: "I'm having trouble processing your request. Please try again."
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function extractSuggestedQuestions(content: string): string[] {
  // Try to extract questions that the AI might have embedded
  const questions: string[] = [];
  
  // Common follow-up patterns
  if (content.toLowerCase().includes("whale") || content.toLowerCase().includes("smart money")) {
    questions.push("What are whales buying right now?");
  }
  if (content.toLowerCase().includes("news") || content.toLowerCase().includes("event")) {
    questions.push("What's the latest news?");
  }
  if (content.toLowerCase().includes("arbitrage") || content.toLowerCase().includes("opportunity")) {
    questions.push("Are there any arbitrage opportunities?");
  }
  if (content.toLowerCase().includes("trade") || content.toLowerCase().includes("position")) {
    questions.push("Calculate position size for this");
  }
  
  // Default questions if none detected
  if (questions.length === 0) {
    questions.push("Show me top opportunities");
    questions.push("What's moving today?");
  }
  
  return questions.slice(0, 3);
}
