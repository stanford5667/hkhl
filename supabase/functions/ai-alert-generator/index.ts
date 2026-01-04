import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AlertEvent {
  type: 'news_impact' | 'whale_movement' | 'arbitrage' | 'price_movement' | 'sentiment_shift' | 'resolution';
  market_id?: string;
  data: Record<string, unknown>;
  user_id: string;
}

interface GeneratedAlert {
  headline: string;
  summary: string;
  why_it_matters: string;
  suggested_actions: Array<{ action: string; description: string }>;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
}

async function generateAlertWithAI(event: AlertEvent, context: Record<string, unknown>): Promise<GeneratedAlert> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY not configured");
  }

  const systemPrompt = `You are an AI that generates smart, contextual notifications for a prediction market intelligence platform.

Each alert should:
1. Have a compelling headline with relevant emoji
2. Provide a clear, informative summary
3. Explain why this matters to the user
4. Suggest 2-4 possible actions
5. Assess urgency (low, medium, high, critical)
6. Provide a confidence score (0-1)

Alert types and their characteristics:
- news_impact: High-impact news affecting markets. Include news summary and expected impact.
- whale_movement: Large trades by smart money. Include pattern detection and wallet track record.
- arbitrage: New opportunities detected. Time-sensitive with profit calculations.
- price_movement: Significant price changes. Include context (news-driven vs organic).
- sentiment_shift: KOL sentiment changing. Include divergence from market price.
- resolution: Markets approaching resolution. Include position reminders.

Respond with valid JSON only.`;

  const userPrompt = `Generate a smart alert notification for this market event:

Event Type: ${event.type}
Event Data: ${JSON.stringify(event.data, null, 2)}
Context: ${JSON.stringify(context, null, 2)}

Generate a contextual, actionable alert. Response format:
{
  "headline": "emoji + compelling headline",
  "summary": "2-3 sentence summary",
  "why_it_matters": "Why the user should care",
  "suggested_actions": [
    {"action": "Action Name", "description": "What this action does"}
  ],
  "urgency": "low|medium|high|critical",
  "confidence": 0.0-1.0
}`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("AI API error:", errorText);
    throw new Error("Failed to generate alert with AI");
  }

  const aiResponse = await response.json();
  const content = aiResponse.choices?.[0]?.message?.content;
  
  if (!content) {
    throw new Error("No content in AI response");
  }

  // Parse JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("No JSON found in AI response");
  }

  return JSON.parse(jsonMatch[0]);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchEventContext(
  supabase: any,
  event: AlertEvent
): Promise<Record<string, unknown>> {
  const context: Record<string, unknown> = {};

  // Fetch market details if market_id provided
  if (event.market_id) {
    const { data: market } = await supabase
      .from('prediction_markets')
      .select('*, market_outcomes(*)')
      .eq('id', event.market_id)
      .single();
    
    if (market) {
      context.market = market;
    }
  }

  // Fetch recent news for context
  if (event.type === 'news_impact' || event.type === 'price_movement') {
    const { data: news } = await supabase
      .from('news_clusters')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (news) {
      context.recent_news = news;
    }
  }

  // Fetch whale activity for context
  if (event.type === 'whale_movement' || event.type === 'price_movement') {
    const { data: whaleActivity } = await supabase
      .from('kol_sentiment')
      .select('*, kol_accounts(*)')
      .order('detected_at', { ascending: false })
      .limit(10);
    
    if (whaleActivity) {
      context.whale_activity = whaleActivity;
    }
  }

  // Fetch arbitrage opportunities
  if (event.type === 'arbitrage') {
    const { data: arb } = await supabase
      .from('arbitrage_opportunities')
      .select('*')
      .eq('status', 'active')
      .order('profit_potential', { ascending: false })
      .limit(5);
    
    if (arb) {
      context.arbitrage_opportunities = arb;
    }
  }

  return context;
}

async function checkUserAlertConfig(
  userId: string,
  alertType: string
): Promise<{ enabled: boolean; config: Record<string, unknown> }> {
  // For now, return default enabled - in production this would check user_alerts table
  // The user_alerts table has a different schema (config alerts, not generated alerts)
  return { enabled: true, config: {} };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { event, generate_sample } = await req.json() as { 
      event?: AlertEvent; 
      generate_sample?: boolean;
    };

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase configuration missing");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Generate sample alerts for demo
    if (generate_sample) {
      const sampleAlerts: GeneratedAlert[] = [
        {
          headline: "🚀 Bitcoin $100k market surges 9 points on ETF news",
          summary: "The market jumped from 42% to 51% after BlackRock's IBIT reported record inflows. Smart money appears to be accumulating.",
          why_it_matters: "This is the largest single-day move in this market. Strong institutional interest suggests momentum could continue.",
          suggested_actions: [
            { action: "Analyze", description: "Review the full trade thesis" },
            { action: "Size", description: "Calculate your position size" },
            { action: "Pass", description: "Wait for a pullback" }
          ],
          urgency: "high",
          confidence: 0.78
        },
        {
          headline: "🐋 Smart whale accumulating Fed rate cut position",
          summary: "Wallet 0x7f2... (89% historical accuracy) just placed $150k on 'Fed cuts by March'. This follows 3 similar large bets.",
          why_it_matters: "This whale has correctly predicted 8 of the last 9 Fed-related markets. Their conviction trade deserves attention.",
          suggested_actions: [
            { action: "Follow", description: "Mirror the whale position" },
            { action: "Research", description: "Analyze Fed meeting schedule" },
            { action: "Dismiss", description: "Ignore this signal" }
          ],
          urgency: "medium",
          confidence: 0.72
        },
        {
          headline: "💰 2.3% arbitrage opportunity detected",
          summary: "Price discrepancy found between Polymarket and Kalshi on the same election outcome. Buy YES on one, NO on other for risk-free profit.",
          why_it_matters: "Time-sensitive opportunity. Arbitrage gaps typically close within 1-2 hours as traders exploit them.",
          suggested_actions: [
            { action: "Execute", description: "Place the arbitrage trade" },
            { action: "Calculate", description: "See detailed breakdown" },
            { action: "Skip", description: "Too small to bother" }
          ],
          urgency: "critical",
          confidence: 0.95
        },
        {
          headline: "📊 Sentiment divergence on crypto regulation market",
          summary: "KOL sentiment turned 72% bullish while market price sits at 45%. 5 high-accuracy influencers posted positive takes.",
          why_it_matters: "Historical data shows sentiment-price divergence often precedes 10%+ moves within 48 hours.",
          suggested_actions: [
            { action: "Buy", description: "Trade the divergence" },
            { action: "Monitor", description: "Add to watchlist" },
            { action: "Analyze", description: "Review KOL posts" }
          ],
          urgency: "medium",
          confidence: 0.65
        },
        {
          headline: "⏰ Market resolving in 24 hours - Bitcoin ETF Decision",
          summary: "The 'Bitcoin ETF approved by Jan 15' market resolves tomorrow. Current price: 92%. Your position: None.",
          why_it_matters: "Last chance to take a position before resolution. High conviction bettors are adding to YES positions.",
          suggested_actions: [
            { action: "Trade", description: "Enter a position" },
            { action: "Watch", description: "Wait for resolution" }
          ],
          urgency: "high",
          confidence: 0.88
        }
      ];

      return new Response(
        JSON.stringify({ 
          success: true, 
          alerts: sampleAlerts,
          message: "Sample alerts generated"
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!event) {
      throw new Error("Event data required");
    }

    // Check user's alert configuration
    const alertConfig = await checkUserAlertConfig(event.user_id, event.type);
    
    if (!alertConfig.enabled) {
      return new Response(
        JSON.stringify({ 
          success: false,
          message: "Alert type disabled for this user" 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch context for the event
    const context = await fetchEventContext(supabase, event);

    // Generate alert with AI
    const generatedAlert = await generateAlertWithAI(event, context);

    // Store the alert
    const { data: storedAlert, error: insertError } = await supabase
      .from('generated_alerts')
      .insert({
        user_id: event.user_id,
        alert_type: event.type,
        headline: generatedAlert.headline,
        summary: generatedAlert.summary,
        why_it_matters: generatedAlert.why_it_matters,
        ai_analysis: { 
          context, 
          event_data: event.data 
        },
        related_market_id: event.market_id,
        urgency: generatedAlert.urgency,
        confidence: generatedAlert.confidence,
        suggested_actions: generatedAlert.suggested_actions,
        status: 'unread'
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error storing alert:", insertError);
      throw insertError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        alert: storedAlert,
        generated: generatedAlert
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error("Error in ai-alert-generator:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});