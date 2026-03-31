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
         content: `Generate a photorealistic editorial photograph that DIRECTLY depicts the specific subject: "${prompt}". 

CRITICAL RULES:
- The image MUST literally show the specific thing described — if it says "semiconductor chips" show actual silicon wafers/chips, if it says "oil rigs" show actual oil rigs, if it says "Federal Reserve" show the actual Fed building
- Shot with a DSLR camera, natural lighting, shallow depth of field
- One clear subject that is DIRECTLY related to the topic — no metaphors, no abstract concepts
- NO text, NO overlays, NO graphics, NO illustrations, NO collages, NO stock photo feel
- Think Reuters/AP wire photo quality — documentary style, specific, concrete
- If the subject is a company or product, show their actual product, factory, storefront, or headquarters
- If the subject is a market sector, show the real-world physical manifestation (actual trading floor, actual factory, actual store)`,
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

    const hedgeFundVoice = `You are a senior analyst at a top-tier hedge fund writing research briefs for sophisticated retail investors who want institutional-grade insights without the jargon. Your writing style:

TONE & VOICE:
- Write like a Goldman Sachs or Bridgewater research note, but translated for a smart retail audience
- Be hyper-specific: name exact companies, ticker symbols, specific financial metrics (P/E, EV/EBITDA, FCF yield, short interest %, etc.), exact dates, and precise price levels
- Reference specific catalysts: earnings dates, FDA decisions, activist positions, insider transactions, macro data releases
- Use hedge fund frameworks: risk/reward asymmetry, margin of safety, catalyst timelines, position sizing rationale, correlation analysis
- Include contrarian angles and what the "consensus is missing"
- Mention specific institutional positioning when relevant (e.g., "13F filings show Citadel increased their position by 40%")
- End with a clear, actionable thesis: bull case, bear case, and base case with specific price targets or ranges

TITLE STYLE:
- Titles should read like hedge fund research desk memos, e.g.:
  "Why Smart Money Is Quietly Accumulating $SOFI Below $8: A Mispriced Fintech Thesis"
  "The Fed Pivot Trade Nobody's Talking About: Regional Banks at 0.6x Book Value"
  "Short Squeeze Setup in $DKS: 22% Short Interest Meets Accelerating Buybacks"
  "Semiconductor Capex Cycle Peak: Why $LRCX Has 35% Downside From Here"

NEVER be generic. Every sentence should contain a specific data point, company name, or actionable insight.`;

    switch (action) {
      case "full_article":
        systemPrompt = hedgeFundVoice + `\n\nYou are writing a research article based DIRECTLY on the user's input. Your #1 job is to deeply honor and expand on EXACTLY what the user wrote — their specific thesis, angle, tickers, claims, and perspective.

CRITICAL RULES:
- The user's input IS the thesis. Do NOT substitute your own topic or angle.
- If the user mentions specific tickers, companies, or sectors — those MUST be the focus. Do NOT pivot to different tickers.
- If the user makes a specific claim (e.g. "NVDA is overvalued"), build the article around THAT claim with supporting data.
- Expand the user's ideas with institutional-grade data, metrics, and analysis — but never replace their core thesis.
- If the user's input is brief (e.g. just a ticker or topic), then you have creative freedom to build a thesis, but it must be tightly about that exact subject.

Structure:
1. A sharp opening paragraph restating the user's thesis with conviction (no header needed)
2. ## The Setup — context for the user's specific thesis
3. ## The Numbers — financial metrics supporting/challenging the user's angle
4. ## The Catalyst — what will prove the user's thesis right or wrong
5. ## Risk Factors — honest bear case
6. ## The Trade — actionable conclusion with bull/bear/base case

Write 800-1200 words. Every paragraph must contain specific data. Do NOT wrap in code blocks. Do NOT include the title as a header (it's shown separately). Leave placeholder lines like

[IMAGE: description of a relevant chart or illustration]

after each major section (2-3 total) — these will be replaced with AI-generated images.`;
        userPrompt = `HERE IS MY EXACT INPUT — build the entire article around THIS specific topic/thesis:

"${prompt || title}"

CRITICAL: Your article MUST be about exactly what I wrote above. The title must reference the specific tickers/topics I mentioned. Do NOT change the subject. Expand on MY thesis with hedge fund-grade data and analysis.

Format: Start your response with "TITLE: [title that reflects MY specific input]" on its own line, then a blank line, then the article body.

Title must include the specific ticker or subject from my input. Example: if I wrote "NVDA earnings play", the title must be about NVDA, not about AI stocks generally.

Include [IMAGE: ...] placeholders with CONCRETE physical subjects related to my specific topic.`;
        break;
      case "expand":
        systemPrompt = hedgeFundVoice + `\n\nExpand the given content into a detailed institutional-quality research article. Add specific financial metrics, comparable analysis, catalyst timelines, and risk/reward frameworks. Use markdown formatting with ## headers, bullet points, and bold text. Do NOT wrap in code blocks.`;
        userPrompt = `Expand this research draft into a full hedge fund-quality article with specific data points and actionable insights:\n\nTitle: ${title || "Untitled"}\n\n${content || prompt}`;
        break;
      case "improve":
        systemPrompt = hedgeFundVoice + `\n\nElevate this article to institutional research quality. Make every claim more specific with data. Replace vague language with precise metrics. Add risk/reward framing. Sharpen the thesis. Use markdown formatting. Do NOT wrap in code blocks.`;
        userPrompt = `Improve this research article to hedge fund quality:\n\n${content}`;
        break;
      case "summarize":
        systemPrompt = hedgeFundVoice + `\n\nCreate a concise executive summary (2-3 paragraphs) in the style of a hedge fund morning briefing. Lead with the actionable thesis, key metrics, and catalyst timeline. Use markdown formatting.`;
        userPrompt = `Summarize this research into a hedge fund morning brief:\n\n${content}`;
        break;
      case "outline":
        systemPrompt = hedgeFundVoice + `\n\nGenerate a detailed research outline structured like an institutional investment memo. Include: Thesis, Setup/Context, Valuation & Metrics, Catalysts & Timeline, Risk Factors, and Trade Structure. Suggest specific data points to include in each section. Use markdown with ## headers and bullet points.`;
        userPrompt = `Create a detailed hedge fund-style research outline for: ${prompt || title}`;
        break;
      case "continue":
        systemPrompt = hedgeFundVoice + `\n\nContinue writing from where the article left off. Match the institutional tone and specificity. Add new data points, deeper analysis, or the next logical section. Use markdown formatting. Write 2-4 additional paragraphs.`;
        userPrompt = `Continue this research article:\n\nTitle: ${title || "Untitled"}\n\n${content}`;
        break;
      default:
        systemPrompt = hedgeFundVoice + `\n\nHelp the user with their research request. Always be specific with data, tickers, and actionable insights. Use markdown formatting. Do NOT wrap in code blocks.`;
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
