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
    const POLYGON_API_KEY = Deno.env.get("POLYGON_API_KEY") || Deno.env.get("VITE_POLYGON_API_KEY");
    if (!POLYGON_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Polygon API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const ticker = body.ticker;

    if (!ticker || typeof ticker !== "string") {
      return new Response(
        JSON.stringify({ error: "ticker is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = `https://api.polygon.io/v2/reference/news?ticker=${encodeURIComponent(ticker)}&limit=1&order=desc&sort=published_utc&apiKey=${POLYGON_API_KEY}`;

    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      console.error(`[polygon-news] API error for ${ticker}: ${res.status}`, text);
      return new Response(
        JSON.stringify({ article: null }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await res.json();
    const results = data.results || [];

    if (results.length === 0) {
      return new Response(
        JSON.stringify({ article: null }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const article = results[0];
    const publishedAt = article.published_utc || article.published_at || "";
    
    // Check if within last 48 hours
    const publishedDate = new Date(publishedAt);
    const now = new Date();
    const hoursDiff = (now.getTime() - publishedDate.getTime()) / (1000 * 60 * 60);
    
    if (hoursDiff > 48) {
      return new Response(
        JSON.stringify({ article: null }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build short title (5-7 words)
    const fullTitle = article.title || "";
    const words = fullTitle.split(/\s+/);
    const shortTitle = words.length <= 7 ? fullTitle : words.slice(0, 6).join(" ") + "…";

    return new Response(
      JSON.stringify({
        article: {
          title: fullTitle,
          shortTitle,
          source: article.publisher?.name || "Unknown",
          publishedAt,
          url: article.article_url || "",
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[polygon-news] Error:", err);
    return new Response(
      JSON.stringify({ article: null }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
