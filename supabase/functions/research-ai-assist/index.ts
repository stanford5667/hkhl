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

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { action, prompt, content, title } = await req.json();

    if (action === "generate_image") {
      // Generate an image using the image model
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [
            {
              role: "user",
              content: `Generate an image with a split-canvas layout divided perfectly in half vertically. The left half is a high-quality, cinematic photograph related to: ${prompt}. The right half is a solid deep navy blue (#0F172A) background. The photo half should be vivid, sharp, and editorial-quality. The solid color half should be completely clean with no text or elements. Make it modern, premium, and suitable for a financial research publication.`,
            },
          ],
          modalities: ["image", "text"],
        }),
      });

      if (!response.ok) {
        const status = response.status;
        if (status === 429) {
          return new Response(JSON.stringify({ error: "Rate limited, please try again shortly." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const t = await response.text();
        console.error("Image generation error:", status, t);
        throw new Error(`Image generation failed [${status}]`);
      }

      const data = await response.json();
      const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      if (!imageUrl) {
        throw new Error("No image returned from AI");
      }

      return new Response(JSON.stringify({ imageBase64: imageUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Text assistance actions
    let systemPrompt = "";
    let userPrompt = "";

    switch (action) {
      case "full_article":
        systemPrompt =
          "You are an elite financial research writer. Write a complete, publication-ready research article from the given topic. Structure it with:\n\n1. An engaging opening paragraph (no header needed for intro)\n2. Multiple ## sections with clear headers\n3. Bullet points for key data points\n4. Bold text for emphasis on important figures and conclusions\n5. A ## Key Takeaways section at the end\n\nWrite 800-1200 words. Be specific, data-driven, and insightful. Use a professional but engaging tone. Do NOT wrap in code blocks. Do NOT include the title as a header (it's shown separately). Leave placeholder lines like\n\n[IMAGE: description of a relevant chart or illustration]\n\nafter each major section (2-3 total) — these will be replaced with AI-generated images.";
        userPrompt = `Write a complete research article about: ${prompt || title}`;
        break;
      case "expand":
        systemPrompt =
          "You are an expert financial research writer. Expand the given content into a well-structured, detailed research article with multiple sections. Use markdown formatting with ## headers, bullet points, and bold text for emphasis. Write in a professional but accessible tone. Include analysis, context, and actionable insights. Do NOT wrap in code blocks.";
        userPrompt = `Expand this research draft into a full article:\n\nTitle: ${title || "Untitled"}\n\n${content || prompt}`;
        break;
      case "improve":
        systemPrompt =
          "You are a professional financial editor. Improve the writing quality, fix grammar, enhance clarity, and make the analysis more compelling. Keep the same structure and key points but elevate the prose. Use markdown formatting. Do NOT wrap in code blocks.";
        userPrompt = `Improve this research article:\n\n${content}`;
        break;
      case "summarize":
        systemPrompt =
          "You are a financial research analyst. Create a concise executive summary (2-3 paragraphs) of the research content. Highlight the key thesis, supporting evidence, and conclusion. Use markdown formatting.";
        userPrompt = `Summarize this research:\n\n${content}`;
        break;
      case "outline":
        systemPrompt =
          "You are a research writing assistant. Generate a detailed outline for a financial research article based on the given topic. Include suggested sections, key points to cover, and data to reference. Use markdown with ## headers and bullet points.";
        userPrompt = `Create a detailed research article outline for: ${prompt || title}`;
        break;
      case "continue":
        systemPrompt =
          "You are an expert financial research writer. Continue writing the article from where it left off. Match the existing tone, style, and depth. Use markdown formatting. Write 2-4 additional paragraphs.";
        userPrompt = `Continue this research article:\n\nTitle: ${title || "Untitled"}\n\n${content}`;
        break;
      default:
        systemPrompt =
          "You are a helpful financial research writing assistant. Help the user with their request. Use markdown formatting for any article content. Do NOT wrap in code blocks.";
        userPrompt = prompt || content || "Help me write a research post.";
    }

    // Stream the AI response
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI text error:", status, t);
      throw new Error(`AI request failed [${status}]`);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("research-ai-assist error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
