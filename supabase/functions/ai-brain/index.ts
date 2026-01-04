import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AIRequest {
  type: 'chat' | 'analyze_market' | 'analyze_news' | 'trade_ideas' | 'opportunities' | 
        'calculate' | 'generate_alert' | 'generate_briefing' | 'feedback' | 'get_context' | 'update_preferences';
  userId: string;
  payload: Record<string, unknown>;
}

interface UserContext {
  userId: string;
  preferences: {
    riskTolerance: 'conservative' | 'moderate' | 'aggressive';
    preferredCategories: string[];
    notificationFrequency: 'realtime' | 'hourly' | 'daily';
    analysisDepth: 'brief' | 'detailed' | 'comprehensive';
  };
  conversationHistory: Array<{ role: string; content: string; timestamp: string }>;
  watchedMarkets: string[];
  feedbackHistory: Array<{ itemId: string; feedback: string; timestamp: string }>;
  learnings: {
    preferredInsightTypes: string[];
    dismissedCategories: string[];
    engagementPatterns: Record<string, number>;
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase: AnySupabaseClient = createClient(supabaseUrl, supabaseKey);

    const request: AIRequest = await req.json();
    const { type, userId, payload } = request;

    // Load user context
    const userContext = await loadUserContext(supabase, userId);

    let response: unknown;

    switch (type) {
      case 'chat':
        response = await handleChat(supabase, userId, payload, userContext);
        break;
      case 'analyze_market':
        response = await handleAnalyzeMarket(supabase, payload, userContext);
        break;
      case 'analyze_news':
        response = await handleAnalyzeNews(supabase, payload, userContext);
        break;
      case 'trade_ideas':
        response = await handleTradeIdeas(supabase, payload, userContext);
        break;
      case 'opportunities':
        response = await handleOpportunities(supabase, userContext);
        break;
      case 'calculate':
        response = await handleCalculate(payload, userContext);
        break;
      case 'generate_alert':
        response = await handleGenerateAlert(supabase, userId, payload, userContext);
        break;
      case 'generate_briefing':
        response = await handleGenerateBriefing(supabase, userId, payload, userContext);
        break;
      case 'feedback':
        response = await handleFeedback(supabase, userId, payload, userContext);
        break;
      case 'get_context':
        response = { context: userContext };
        break;
      case 'update_preferences':
        response = await handleUpdatePreferences(supabase, userId, payload);
        break;
      default:
        throw new Error(`Unknown request type: ${type}`);
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('AI Brain error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function loadUserContext(supabase: AnySupabaseClient, userId: string): Promise<UserContext> {
  // Try to load existing context from cache
  const { data: cached } = await supabase
    .from('cached_api_data')
    .select('data')
    .eq('user_id', userId)
    .eq('cache_type', 'ai_brain_context')
    .single();

  if (cached?.data) {
    return cached.data as UserContext;
  }

  // Return default context for new users
  return {
    userId,
    preferences: {
      riskTolerance: 'moderate',
      preferredCategories: [],
      notificationFrequency: 'daily',
      analysisDepth: 'detailed',
    },
    conversationHistory: [],
    watchedMarkets: [],
    feedbackHistory: [],
    learnings: {
      preferredInsightTypes: [],
      dismissedCategories: [],
      engagementPatterns: {},
    },
  };
}

async function saveUserContext(supabase: AnySupabaseClient, context: UserContext): Promise<void> {
  await supabase
    .from('cached_api_data')
    .upsert({
      user_id: context.userId,
      cache_type: 'ai_brain_context',
      cache_key: `brain_context_${context.userId}`,
      data: context,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,cache_type' });
}

async function handleChat(
  supabase: AnySupabaseClient,
  userId: string,
  payload: Record<string, unknown>,
  context: UserContext
): Promise<unknown> {
  const message = payload.message as string;
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

  // Add message to conversation history
  context.conversationHistory.push({
    role: 'user',
    content: message,
    timestamp: new Date().toISOString(),
  });

  // Keep only last 20 messages for context
  if (context.conversationHistory.length > 20) {
    context.conversationHistory = context.conversationHistory.slice(-20);
  }

  // Gather relevant market context
  const { data: watchedMarkets } = await supabase
    .from('prediction_markets')
    .select('*')
    .limit(10);

  const { data: recentAlerts } = await supabase
    .from('generated_alerts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5);

  const systemPrompt = `You are an AI assistant for a prediction markets platform. You have access to:
- Market data and prices
- News analysis
- Whale/smart money activity
- User's portfolio and preferences

User's risk tolerance: ${context.preferences.riskTolerance}
Preferred categories: ${context.preferences.preferredCategories.join(', ') || 'All'}
Analysis depth: ${context.preferences.analysisDepth}

Recent conversation context:
${context.conversationHistory.slice(-5).map(m => `${m.role}: ${m.content}`).join('\n')}

Available market context:
${JSON.stringify(watchedMarkets?.slice(0, 5), null, 2)}

Recent alerts:
${JSON.stringify(recentAlerts?.slice(0, 3), null, 2)}

Provide helpful, actionable insights. Be consistent in your analysis style. Always consider both bull and bear cases.`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
    }),
  });

  const data = await response.json();
  const assistantMessage = data.choices?.[0]?.message?.content || 'Unable to process request';

  // Add response to history
  context.conversationHistory.push({
    role: 'assistant',
    content: assistantMessage,
    timestamp: new Date().toISOString(),
  });

  // Save updated context
  await saveUserContext(supabase, context);

  return {
    response: assistantMessage,
    context: {
      conversationLength: context.conversationHistory.length,
      preferences: context.preferences,
    },
  };
}

async function handleAnalyzeMarket(
  supabase: AnySupabaseClient,
  payload: Record<string, unknown>,
  context: UserContext
): Promise<unknown> {
  const marketId = payload.marketId as string;
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

  // Fetch market data
  const { data: market } = await supabase
    .from('prediction_markets')
    .select('*')
    .eq('id', marketId)
    .single();

  const { data: outcomes } = await supabase
    .from('market_outcomes')
    .select('*')
    .eq('market_id', marketId);

  const { data: priceHistory } = await supabase
    .from('market_price_history')
    .select('*')
    .eq('market_id', marketId)
    .order('timestamp', { ascending: false })
    .limit(100);

  const { data: relatedNews } = await supabase
    .from('news_clusters')
    .select('*')
    .contains('related_market_ids', [marketId])
    .limit(5);

  const depthMap: Record<string, string> = {
    brief: '2-3 sentences',
    detailed: '2-3 paragraphs',
    comprehensive: 'full analysis with sections',
  };

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: `Analyze this prediction market. Provide ${depthMap[context.preferences.analysisDepth]} analysis.
Consider the user's ${context.preferences.riskTolerance} risk tolerance.
Always provide both bull and bear cases.`,
        },
        {
          role: 'user',
          content: `Market: ${JSON.stringify(market)}
Outcomes: ${JSON.stringify(outcomes)}
Price History (recent): ${JSON.stringify(priceHistory?.slice(0, 20))}
Related News: ${JSON.stringify(relatedNews)}`,
        },
      ],
    }),
  });

  const data = await response.json();

  return {
    marketId,
    analysis: data.choices?.[0]?.message?.content,
    market,
    outcomes,
    priceHistory: priceHistory?.slice(0, 20),
    relatedNews,
  };
}

async function handleAnalyzeNews(
  supabase: AnySupabaseClient,
  payload: Record<string, unknown>,
  context: UserContext
): Promise<unknown> {
  const newsId = payload.newsId as string;
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

  const { data: newsCluster } = await supabase
    .from('news_clusters')
    .select('*')
    .eq('id', newsId)
    .single();

  const relatedMarketIds = newsCluster?.related_market_ids || [];
  const { data: relatedMarkets } = await supabase
    .from('prediction_markets')
    .select('*')
    .in('id', relatedMarketIds);

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: 'Analyze this news cluster and its potential impact on prediction markets.',
        },
        {
          role: 'user',
          content: `News: ${JSON.stringify(newsCluster)}
Related Markets: ${JSON.stringify(relatedMarkets)}`,
        },
      ],
    }),
  });

  const data = await response.json();

  return {
    newsId,
    analysis: data.choices?.[0]?.message?.content,
    newsCluster,
    relatedMarkets,
  };
}

async function handleTradeIdeas(
  supabase: AnySupabaseClient,
  payload: Record<string, unknown>,
  context: UserContext
): Promise<unknown> {
  const filters = payload.filters as Record<string, unknown> | undefined;
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

  // Fetch market data
  const { data: markets } = await supabase
    .from('prediction_markets')
    .select('*')
    .eq('status', 'active')
    .limit(50);

  const { data: outcomes } = await supabase
    .from('market_outcomes')
    .select('*');

  const { data: whaleActivity } = await supabase
    .from('kol_sentiment')
    .select('*')
    .order('detected_at', { ascending: false })
    .limit(20);

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: `Generate trade ideas for prediction markets.
User risk tolerance: ${context.preferences.riskTolerance}
Preferred categories: ${context.preferences.preferredCategories.join(', ') || 'All'}
Generate 3-5 ideas with clear rationale.
Return as JSON array with: marketId, direction (yes/no), confidence, rationale, entryPrice, targetPrice, stopLoss`,
        },
        {
          role: 'user',
          content: `Markets: ${JSON.stringify(markets?.slice(0, 20))}
Outcomes: ${JSON.stringify(outcomes?.slice(0, 40))}
Recent Whale Activity: ${JSON.stringify(whaleActivity)}
Filters: ${JSON.stringify(filters || {})}`,
        },
      ],
    }),
  });

  const data = await response.json();
  let ideas = [];
  
  try {
    const content = data.choices?.[0]?.message?.content || '[]';
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      ideas = JSON.parse(jsonMatch[0]);
    }
  } catch {
    ideas = [];
  }

  return { ideas };
}

async function handleOpportunities(
  supabase: AnySupabaseClient,
  context: UserContext
): Promise<unknown> {
  // Fetch arbitrage opportunities
  const { data: arbitrage } = await supabase
    .from('arbitrage_opportunities')
    .select('*')
    .eq('status', 'active')
    .order('profit_potential', { ascending: false })
    .limit(10);

  // Fetch markets with high KOL sentiment divergence
  const { data: kolData } = await supabase
    .from('kol_sentiment')
    .select('*')
    .order('detected_at', { ascending: false })
    .limit(20);

  return {
    arbitrage: arbitrage || [],
    sentimentDivergence: kolData || [],
    riskLevel: context.preferences.riskTolerance,
  };
}

async function handleCalculate(
  payload: Record<string, unknown>,
  context: UserContext
): Promise<unknown> {
  const calcType = payload.type as string;
  const params = payload.params as Record<string, number>;

  switch (calcType) {
    case 'kelly': {
      const { probability, odds } = params;
      const kellyFraction = (probability * odds - (1 - probability)) / odds;
      const adjustedKelly = Math.max(0, kellyFraction * 0.25); // Quarter Kelly
      return {
        fullKelly: kellyFraction,
        quarterKelly: adjustedKelly,
        recommendedSize: adjustedKelly,
        riskAdjustment: context.preferences.riskTolerance === 'conservative' ? 0.5 : 
                        context.preferences.riskTolerance === 'aggressive' ? 1.5 : 1.0,
      };
    }
    case 'ev': {
      const { probability, payout, stake } = params;
      const ev = probability * payout - (1 - probability) * stake;
      return { expectedValue: ev, isPositive: ev > 0 };
    }
    case 'arbitrage': {
      const { price1, price2 } = params;
      const impliedProb = price1 / 100 + price2 / 100;
      const isArb = impliedProb < 1;
      const profit = isArb ? (1 - impliedProb) * 100 : 0;
      return { isArbitrage: isArb, profit, impliedProbability: impliedProb };
    }
    default:
      throw new Error(`Unknown calculation type: ${calcType}`);
  }
}

async function handleGenerateAlert(
  supabase: AnySupabaseClient,
  userId: string,
  payload: Record<string, unknown>,
  _context: UserContext
): Promise<unknown> {
  const event = payload.event as Record<string, unknown>;
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: `Generate an alert for this market event. User risk tolerance: ${_context.preferences.riskTolerance}.
Return JSON with: headline, summary, why_it_matters, suggested_actions (array), urgency (low/medium/high), confidence (0-1)`,
        },
        { role: 'user', content: JSON.stringify(event) },
      ],
    }),
  });

  const data = await response.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let alert: any = null;

  try {
    const content = data.choices?.[0]?.message?.content || '{}';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      alert = JSON.parse(jsonMatch[0]);
    }
  } catch {
    alert = { headline: 'Market Event', summary: 'An event occurred', urgency: 'low' };
  }

  // Store alert
  if (alert) {
    await supabase.from('generated_alerts').insert({
      user_id: userId,
      alert_type: (event.type as string) || 'market_event',
      headline: alert.headline,
      summary: alert.summary,
      why_it_matters: alert.why_it_matters,
      suggested_actions: alert.suggested_actions,
      urgency: alert.urgency,
      confidence: alert.confidence,
      ai_analysis: alert,
    });
  }

  return { alert };
}

async function handleGenerateBriefing(
  supabase: AnySupabaseClient,
  _userId: string,
  payload: Record<string, unknown>,
  context: UserContext
): Promise<unknown> {
  const briefingType = (payload.type as string) || 'daily';
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

  // Gather data
  const { data: markets } = await supabase
    .from('prediction_markets')
    .select('*')
    .limit(20);

  const { data: newsClusters } = await supabase
    .from('news_clusters')
    .select('*')
    .order('cluster_date', { ascending: false })
    .limit(10);

  const { data: arbitrage } = await supabase
    .from('arbitrage_opportunities')
    .select('*')
    .eq('status', 'active')
    .limit(5);

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: `Generate a ${briefingType} briefing for prediction markets.
User preferences: ${JSON.stringify(context.preferences)}
Include: Market Overview, Top Movers, Key Developments, Opportunities, Look Ahead.
Format as markdown.`,
        },
        {
          role: 'user',
          content: `Markets: ${JSON.stringify(markets)}
News: ${JSON.stringify(newsClusters)}
Opportunities: ${JSON.stringify(arbitrage)}`,
        },
      ],
    }),
  });

  const data = await response.json();

  return {
    type: briefingType,
    content: data.choices?.[0]?.message?.content || 'Unable to generate briefing',
    generatedAt: new Date().toISOString(),
  };
}

async function handleFeedback(
  supabase: AnySupabaseClient,
  _userId: string,
  payload: Record<string, unknown>,
  context: UserContext
): Promise<unknown> {
  const { itemId, feedback, itemType } = payload as { itemId: string; feedback: string; itemType: string };

  // Add to feedback history
  context.feedbackHistory.push({
    itemId,
    feedback,
    timestamp: new Date().toISOString(),
  });

  // Keep only last 100 feedback items
  if (context.feedbackHistory.length > 100) {
    context.feedbackHistory = context.feedbackHistory.slice(-100);
  }

  // Update learnings based on feedback
  if (feedback === 'helpful') {
    context.learnings.engagementPatterns[itemType] = (context.learnings.engagementPatterns[itemType] || 0) + 1;
    if (!context.learnings.preferredInsightTypes.includes(itemType)) {
      context.learnings.preferredInsightTypes.push(itemType);
    }
  } else if (feedback === 'not_helpful') {
    context.learnings.engagementPatterns[itemType] = Math.max(0, (context.learnings.engagementPatterns[itemType] || 0) - 1);
  } else if (feedback === 'dismiss') {
    if (!context.learnings.dismissedCategories.includes(itemType)) {
      context.learnings.dismissedCategories.push(itemType);
    }
  }

  // Save updated context
  await saveUserContext(supabase, context);

  return { success: true, learnings: context.learnings };
}

async function handleUpdatePreferences(
  supabase: AnySupabaseClient,
  userId: string,
  payload: Record<string, unknown>
): Promise<unknown> {
  const preferences = payload.preferences as UserContext['preferences'];
  
  const context = await loadUserContext(supabase, userId);
  context.preferences = { ...context.preferences, ...preferences };
  await saveUserContext(supabase, context);

  return { success: true, preferences: context.preferences };
}
