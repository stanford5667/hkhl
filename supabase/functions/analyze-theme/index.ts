import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, summary, detailedSummary, category, tickers, headlines, chatMode, systemPromptOverride, chatMessages } = await req.json();

    if (!chatMode && !title) {
      return new Response(JSON.stringify({ error: "Missing theme title" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For standard analysis mode, require tickers; for chat mode, tickers are optional
    if (!chatMode && (!tickers || tickers.length === 0)) {
      return new Response(JSON.stringify({ error: "Missing theme tickers" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let messages: { role: string; content: string }[];

    if (chatMode && systemPromptOverride && chatMessages) {
      // Chat mode: use the provided system prompt and message history
      messages = [
        { role: "system", content: systemPromptOverride },
        ...chatMessages,
      ];
    } else {
      // Standard analysis mode
      const tickerList = tickers
        .map((t: any) => `${t.symbol} (${t.name}) — ${t.change >= 0 ? "+" : ""}${t.change.toFixed(1)}% — sentiment: ${t.sentiment}${t.themeRelevance ? ` — relevance: ${t.themeRelevance}` : ""}`)
        .join("\n");

      const headlineList = (headlines || [])
        .map((h: any) => `• ${h.title} (${h.source}, ${h.time})`)
        .join("\n");

      const systemPrompt = `You are a senior equity research analyst writing a comprehensive theme analysis for retail investors. Your writing style is authoritative yet accessible — like a Goldman Sachs research note simplified for a smart individual investor. Use concrete data points, avoid vague language, and provide actionable insight.`;

      const userPrompt = `Analyze this market theme in depth:

**Theme:** ${title}
**Category:** ${category}
**Summary:** ${summary}
**Details:** ${detailedSummary}

**Tickers in this theme:**
${tickerList}

${headlineList ? `**Recent Headlines:**\n${headlineList}` : ""}

Please provide a comprehensive analysis with the following sections (use markdown headers):

## Theme Overview
A 2-3 paragraph executive summary of this theme — what's driving it, why it matters now, and the macro/micro factors at play.

## Key Catalysts
Bullet points of the 3-5 most important near-term catalysts that could move these stocks.

## Ticker-by-Ticker Analysis
For EACH ticker listed above, provide:
### [SYMBOL] — [Company Name]
- **Why it's relevant:** 1-2 sentences on how this company fits the theme
- **Bull case:** The optimistic scenario
- **Bear case:** The key risk
- **Sentiment:** Your read on current market positioning

## Risk Factors
The top 3 risks that could derail this theme.

## Bottom Line
A concise 2-3 sentence conclusion with your overall stance on the theme (bullish/neutral/bearish) and what to watch next.`;

      messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ];
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("analyze-theme error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
