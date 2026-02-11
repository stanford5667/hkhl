import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ICON_OPTIONS = [
  "TrendingUp", "Sparkles", "Zap", "Leaf", "Cpu", "Heart", "ShoppingCart",
  "Factory", "Landmark", "Building2", "Globe", "Shield", "Wifi", "Car",
  "Plane", "Home", "Pill", "Cloud", "Lock", "Truck", "Banknote", "Coins",
  "BarChart3", "Microscope", "Brain", "Sun", "Wind",
];

const CATEGORIES = [
  "Technology", "Healthcare", "Energy", "Financials", "Consumer",
  "Industrials", "Real Estate", "Geopolitics", "Commodities", "Macro",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
    if (!PERPLEXITY_API_KEY) throw new Error("PERPLEXITY_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if we already generated themes today
    const today = new Date().toISOString().split("T")[0];
    const { count } = await supabase
      .from("market_themes")
      .select("*", { count: "exact", head: true })
      .eq("generated_date", today);

    if (count && count >= 8) {
      return new Response(JSON.stringify({ message: "Themes already generated today", count }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ask Perplexity for current market themes
    const prompt = `You are a financial market analyst. Identify 10 major market themes and narratives that are driving stock markets RIGHT NOW (today: ${today}). For each theme provide:

1. A unique short id (kebab-case, e.g. "ai-data-center-boom")
2. A concise title (under 60 chars)
3. A 1-sentence summary (under 120 chars)
4. A detailed 3-4 sentence analysis
5. Estimated market impact in percent (-10 to +10)
6. Bullish sentiment score (0.0 to 1.0)
7. The best category from: ${CATEGORIES.join(", ")}
8. An icon name from: ${ICON_OPTIONS.join(", ")}
9. 3-5 related stock tickers with:
   - symbol, company name, recent % change, sentiment (bullish/bearish/neutral), and a 1-sentence explanation of relevance
10. 2-3 real recent news headlines with source name and approximate time

Return ONLY valid JSON array. Each item:
{
  "theme_id": "string",
  "title": "string",
  "summary": "string",
  "detailed_summary": "string",
  "impact_percent": number,
  "sentiment_score": number,
  "category": "string",
  "icon_name": "string",
  "tickers": [{"symbol":"string","name":"string","change":number,"sentiment":"bullish|bearish|neutral","themeRelevance":"string"}],
  "headlines": [{"title":"string","source":"string","time":"string"}]
}`;

    console.log("Calling Perplexity for market themes...");

    const perplexityRes = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          { role: "system", content: "You are a financial markets expert. Return only valid JSON arrays with no markdown formatting or code fences." },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 8000,
      }),
    });

    if (!perplexityRes.ok) {
      const errText = await perplexityRes.text();
      throw new Error(`Perplexity API error ${perplexityRes.status}: ${errText}`);
    }

    const perplexityData = await perplexityRes.json();
    const rawContent = perplexityData.choices?.[0]?.message?.content || "";

    // Extract JSON from response (handle potential markdown wrapping)
    let jsonStr = rawContent;
    const jsonMatch = rawContent.match(/\[[\s\S]*\]/);
    if (jsonMatch) jsonStr = jsonMatch[0];

    let themes: any[];
    try {
      themes = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.error("Failed to parse Perplexity response:", rawContent.substring(0, 500));
      throw new Error("Failed to parse themes JSON from Perplexity");
    }

    if (!Array.isArray(themes) || themes.length === 0) {
      throw new Error("No themes returned from Perplexity");
    }

    // Validate and sanitize each theme
    const validThemes = themes
      .filter(t => t.theme_id && t.title && t.summary)
      .map(t => ({
        theme_id: String(t.theme_id),
        title: String(t.title).substring(0, 100),
        summary: String(t.summary).substring(0, 200),
        detailed_summary: String(t.detailed_summary || t.summary).substring(0, 2000),
        impact_percent: Math.max(-10, Math.min(10, Number(t.impact_percent) || 0)),
        sentiment_score: Math.max(0, Math.min(1, Number(t.sentiment_score) || 0.5)),
        category: CATEGORIES.includes(t.category) ? t.category : "Macro",
        icon_name: ICON_OPTIONS.includes(t.icon_name) ? t.icon_name : "Sparkles",
        tickers: Array.isArray(t.tickers) ? t.tickers.slice(0, 5) : [],
        headlines: Array.isArray(t.headlines) ? t.headlines.slice(0, 3) : [],
        generated_date: today,
        is_active: true,
      }));

    console.log(`Inserting ${validThemes.length} themes for ${today}`);

    // Upsert themes (theme_id + generated_date is unique)
    const { error: insertError } = await supabase
      .from("market_themes")
      .upsert(validThemes, { onConflict: "theme_id,generated_date" });

    if (insertError) {
      throw new Error(`DB insert error: ${insertError.message}`);
    }

    // All themes remain active and accumulate over time

    return new Response(JSON.stringify({ 
      success: true, 
      themes_generated: validThemes.length,
      date: today 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-market-themes error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
