import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { query, includeMarkets = true, includeSignals = true, limit = 10 } = await req.json();

    if (!query || typeof query !== "string") {
      return new Response(
        JSON.stringify({ error: "Query is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Generate embedding using Lovable AI
    const embeddingResponse = await fetch("https://api.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: query,
      }),
    });

    if (!embeddingResponse.ok) {
      // Fallback to text search if embedding fails
      console.log("Embedding API failed, falling back to text search");
      return await fallbackTextSearch(query, includeMarkets, includeSignals, limit);
    }

    const embeddingData = await embeddingResponse.json();
    const embedding = embeddingData.data?.[0]?.embedding;

    if (!embedding) {
      return await fallbackTextSearch(query, includeMarkets, includeSignals, limit);
    }

    // Connect to Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const results: {
      markets: any[];
      signals: any[];
      summary: string;
    } = {
      markets: [],
      signals: [],
      summary: "",
    };

    // Search markets using semantic function
    if (includeMarkets) {
      const { data: markets, error: marketsError } = await supabase
        .rpc("search_markets_semantic", {
          query_embedding: JSON.stringify(embedding),
          match_threshold: 0.3,
          match_count: limit,
        });

      if (!marketsError && markets) {
        // Fetch outcome prices for matched markets
        const marketIds = markets.map((m: any) => m.id);
        const { data: outcomes } = await supabase
          .from("market_outcomes")
          .select("market_id, current_price, price_change_24h")
          .in("market_id", marketIds);

        const outcomeMap = new Map();
        outcomes?.forEach((o: any) => {
          if (!outcomeMap.has(o.market_id)) {
            outcomeMap.set(o.market_id, o);
          }
        });

        results.markets = markets.map((m: any) => ({
          ...m,
          current_price: outcomeMap.get(m.id)?.current_price ?? null,
          price_change_24h: outcomeMap.get(m.id)?.price_change_24h ?? null,
        }));
      }
    }

    // Search signals using semantic function
    if (includeSignals) {
      const { data: signals, error: signalsError } = await supabase
        .rpc("search_signals_semantic", {
          query_embedding: JSON.stringify(embedding),
          match_threshold: 0.3,
          match_count: limit,
        });

      if (!signalsError && signals) {
        results.signals = signals;
      }
    }

    // Generate AI summary if we have results
    if (results.markets.length > 0 || results.signals.length > 0) {
      try {
        const summaryPrompt = buildSummaryPrompt(query, results);
        
        const summaryResponse = await fetch("https://api.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content: "You are a concise market analyst. Provide a single sentence summary of the current state of play for the given topic based on the markets and news provided. Be specific about probabilities and trends.",
              },
              {
                role: "user",
                content: summaryPrompt,
              },
            ],
            max_tokens: 150,
          }),
        });

        if (summaryResponse.ok) {
          const summaryData = await summaryResponse.json();
          results.summary = summaryData.choices?.[0]?.message?.content || "";
        }
      } catch (summaryError) {
        console.error("Summary generation failed:", summaryError);
      }
    }

    return new Response(
      JSON.stringify(results),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Semantic search error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildSummaryPrompt(query: string, results: { markets: any[]; signals: any[] }): string {
  let prompt = `Topic: "${query}"\n\n`;

  if (results.markets.length > 0) {
    prompt += "Relevant Markets:\n";
    results.markets.slice(0, 5).forEach((m) => {
      const price = m.current_price ? `${(m.current_price * 100).toFixed(0)}%` : "N/A";
      const change = m.price_change_24h 
        ? `${m.price_change_24h >= 0 ? "+" : ""}${(m.price_change_24h * 100).toFixed(1)}%`
        : "";
      prompt += `- ${m.title} (${price} ${change})\n`;
    });
  }

  if (results.signals.length > 0) {
    prompt += "\nRecent News:\n";
    results.signals.slice(0, 3).forEach((s) => {
      prompt += `- ${s.content?.substring(0, 200)}...\n`;
    });
  }

  prompt += "\nProvide a single sentence summary of the current state of play for this topic.";
  return prompt;
}

async function fallbackTextSearch(
  query: string,
  includeMarkets: boolean,
  includeSignals: boolean,
  limit: number
) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const results: { markets: any[]; signals: any[]; summary: string } = {
    markets: [],
    signals: [],
    summary: "",
  };

  // Text search on markets
  if (includeMarkets) {
    const { data: markets } = await supabase
      .from("prediction_markets")
      .select(`
        id,
        title,
        platform,
        category,
        total_volume,
        market_outcomes (current_price, price_change_24h)
      `)
      .eq("status", "active")
      .ilike("title", `%${query}%`)
      .order("total_volume", { ascending: false })
      .limit(limit);

    results.markets = markets?.map((m: any) => ({
      id: m.id,
      title: m.title,
      platform: m.platform,
      category: m.category,
      total_volume: m.total_volume,
      current_price: m.market_outcomes?.[0]?.current_price ?? null,
      price_change_24h: m.market_outcomes?.[0]?.price_change_24h ?? null,
      similarity: null,
    })) || [];
  }

  // Text search on signals
  if (includeSignals) {
    const { data: signals } = await supabase
      .from("raw_signals")
      .select("id, content, source_url, source_type, published_at")
      .ilike("content", `%${query}%`)
      .order("published_at", { ascending: false })
      .limit(limit);

    results.signals = signals || [];
  }

  return new Response(
    JSON.stringify(results),
    { 
      headers: { 
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Content-Type": "application/json" 
      } 
    }
  );
}
