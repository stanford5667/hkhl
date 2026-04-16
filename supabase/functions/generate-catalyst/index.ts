import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { ticker, name, sector, changePercent, price, marketCap } = body;

    if (!ticker || typeof ticker !== "string") {
      return new Response(
        JSON.stringify({ error: "ticker is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 1: Try Polygon news first
    const POLYGON_API_KEY = Deno.env.get("POLYGON_API_KEY") || Deno.env.get("VITE_POLYGON_API_KEY");
    if (POLYGON_API_KEY) {
      try {
        const url = `https://api.polygon.io/v2/reference/news?ticker=${encodeURIComponent(ticker)}&limit=1&order=desc&sort=published_utc&apiKey=${POLYGON_API_KEY}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const results = data.results || [];
          if (results.length > 0) {
            const article = results[0];
            const publishedAt = article.published_utc || article.published_at || "";
            const publishedDate = new Date(publishedAt);
            const now = new Date();
            const hoursDiff = (now.getTime() - publishedDate.getTime()) / (1000 * 60 * 60);
            
            if (hoursDiff <= 72) {
              const fullTitle = article.title || "";
              const words = fullTitle.split(/\s+/);
              const shortTitle = words.length <= 7 ? fullTitle : words.slice(0, 6).join(" ") + "…";
              return new Response(
                JSON.stringify({
                  catalyst: {
                    title: fullTitle,
                    shortTitle,
                    source: article.publisher?.name || "News",
                    publishedAt,
                    url: article.article_url || "",
                    type: "news",
                  },
                }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }
          }
        }
      } catch (e) {
        console.warn("[generate-catalyst] Polygon news failed:", e);
      }
    }

    // Step 2: Generate AI catalyst
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ catalyst: null }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const changeDir = (changePercent ?? 0) >= 0 ? "up" : "down";
    const changeMag = Math.abs(changePercent ?? 0).toFixed(1);
    const mcFormatted = marketCap ? (marketCap >= 1e9 ? `$${(marketCap / 1e9).toFixed(1)}B` : `$${(marketCap / 1e6).toFixed(0)}M`) : "unknown";

    const prompt = `You are a concise financial analyst. Generate a single, brief catalyst statement (1-2 sentences, max 120 chars) explaining what is likely driving ${ticker} (${name || "unknown company"}) stock price ${changeDir} ${changeMag}% today.

Context:
- Sector: ${sector || "unknown"}
- Price: $${price || "N/A"}
- Market Cap: ${mcFormatted}

Consider sector-wide trends, macro factors, earnings expectations, analyst actions, regulatory changes, or competitive dynamics. Be specific and actionable. Do NOT say "I don't know" or hedge. Give a plausible, informed take.

Return ONLY the catalyst statement, no quotes, no prefix.`;

    try {
      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            { role: "system", content: "You are a concise financial news writer. Output only the catalyst headline." },
            { role: "user", content: prompt },
          ],
          max_tokens: 80,
          temperature: 0.7,
        }),
      });

      if (!aiRes.ok) {
        if (aiRes.status === 429 || aiRes.status === 402) {
          console.warn(`[generate-catalyst] AI rate limited: ${aiRes.status}`);
        }
        return new Response(
          JSON.stringify({ catalyst: null }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const aiData = await aiRes.json();
      const content = aiData.choices?.[0]?.message?.content?.trim();

      if (!content) {
        return new Response(
          JSON.stringify({ catalyst: null }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          catalyst: {
            title: content,
            shortTitle: content.length > 50 ? content.slice(0, 47) + "…" : content,
            source: "AI Analysis",
            publishedAt: new Date().toISOString(),
            url: "",
            type: "ai",
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (aiErr) {
      console.error("[generate-catalyst] AI error:", aiErr);
      return new Response(
        JSON.stringify({ catalyst: null }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (err) {
    console.error("[generate-catalyst] Error:", err);
    return new Response(
      JSON.stringify({ catalyst: null }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});