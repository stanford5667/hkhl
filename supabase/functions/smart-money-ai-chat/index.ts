import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Create supabase client to query smart money data
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch recent data for context
    const [insiderRes, blockRes, optionsRes] = await Promise.all([
      supabase.from("smart_money_insider_trades").select("*").order("filing_date", { ascending: false }).limit(50),
      supabase.from("smart_money_block_trades").select("*").order("trade_time", { ascending: false }).limit(20),
      supabase.from("smart_money_options_flow").select("*").order("created_at", { ascending: false }).limit(30),
    ]);

    const insiderData = insiderRes.data || [];
    const blockData = blockRes.data || [];
    const optionsData = optionsRes.data || [];

    const dataContext = `
## Available Smart Money Data

### Recent Insider Trades (${insiderData.length} records)
${insiderData.length > 0 ? JSON.stringify(insiderData.slice(0, 20), null, 2) : "No insider trade data available yet."}

### Recent Block Trades (${blockData.length} records)
${blockData.length > 0 ? JSON.stringify(blockData.slice(0, 10), null, 2) : "No block trade data available yet."}

### Recent Unusual Options Flow (${optionsData.length} records)
${optionsData.length > 0 ? JSON.stringify(optionsData.slice(0, 15), null, 2) : "No unusual options flow data available yet."}
`;

    const systemPrompt = `You are an expert Smart Money analyst AI assistant for Asset Labs AI. You help users understand insider transactions, institutional holdings, unusual options activity, and large block trades.

You have access to the following live data from the platform database:

${dataContext}

Guidelines:
- Answer questions using ONLY the data provided above. Do not fabricate data.
- If data is empty, explain that the data pipeline hasn't populated yet and suggest checking back later.
- Format responses with markdown tables when showing tabular data.
- Highlight significant trades (CEO/CFO buys over $1M, unusual volume spikes).
- Provide analysis and context about what the smart money activity might indicate.
- Always include a disclaimer that this is for informational purposes only and not financial advice.
- Be concise but thorough.`;

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
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error("AI gateway error");
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("smart-money-ai-chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
