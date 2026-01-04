import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BriefingData {
  date: string;
  marketSummary: {
    totalVolume: number;
    volumeChange: number;
    newMarkets: number;
    resolvedMarkets: number;
    topMovers: Array<{ title: string; change: number; currentPrice: number }>;
  };
  topStories: Array<{ title: string; summary: string; marketImpact: string }>;
  whaleActivity: {
    totalVolume: number;
    sentiment: string;
    notableTrades: Array<{ market: string; amount: number; direction: string }>;
  };
  opportunities: {
    arbitrage: Array<{ markets: string[]; profit: number }>;
    tradeIdeas: Array<{ market: string; thesis: string; confidence: number }>;
  };
  upcomingEvents: Array<{ date: string; title: string; category: string }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const { user_id, date } = await req.json();
    
    const briefingDate = date || new Date().toISOString().split('T')[0];

    // Fetch all necessary data in parallel
    const [
      marketsResult,
      newsResult,
      arbitrageResult,
      tradeIdeasResult,
      eventsResult
    ] = await Promise.all([
      supabase.from('prediction_markets').select('*').order('volume_24h', { ascending: false }).limit(50),
      supabase.from('news_clusters').select('*').order('created_at', { ascending: false }).limit(10),
      supabase.from('arbitrage_opportunities').select('*').eq('status', 'active').limit(5),
      supabase.from('trade_ideas').select('*').order('created_at', { ascending: false }).limit(5),
      supabase.from('events').select('*').gte('event_date', briefingDate).order('event_date').limit(10)
    ]);

    // Process market data
    const markets = marketsResult.data || [];
    const totalVolume = markets.reduce((sum, m) => sum + (m.volume_24h || 0), 0);
    
    // Sort by price change to get top movers
    const topMovers = markets
      .filter(m => m.price_change_24h !== null)
      .sort((a, b) => Math.abs(b.price_change_24h || 0) - Math.abs(a.price_change_24h || 0))
      .slice(0, 5)
      .map(m => ({
        title: m.title,
        change: m.price_change_24h || 0,
        currentPrice: m.current_probability || 0
      }));

    // Process news
    const topStories = (newsResult.data || []).slice(0, 5).map(n => ({
      title: n.narrative_title,
      summary: n.narrative_summary || '',
      marketImpact: n.sentiment_arc || 'neutral'
    }));

    // Process opportunities
    const arbitrageOpps = (arbitrageResult.data || []).map(a => ({
      markets: a.markets || [],
      profit: a.profit_potential || 0
    }));

    const tradeIdeas = (tradeIdeasResult.data || []).map((t: Record<string, unknown>) => ({
      market: (t.market_title as string) || 'Unknown Market',
      thesis: (t.thesis as string) || '',
      confidence: (t.confidence as number) || 0
    }));

    // Process events
    const upcomingEvents = (eventsResult.data || []).map(e => ({
      date: e.event_date,
      title: e.title,
      category: e.event_type
    }));

    // Build briefing data
    const briefingData: BriefingData = {
      date: briefingDate,
      marketSummary: {
        totalVolume,
        volumeChange: 0, // Would need historical comparison
        newMarkets: markets.filter(m => m.created_at?.startsWith(briefingDate)).length,
        resolvedMarkets: markets.filter(m => m.status === 'resolved').length,
        topMovers
      },
      topStories,
      whaleActivity: {
        totalVolume: 0,
        sentiment: 'neutral',
        notableTrades: []
      },
      opportunities: {
        arbitrage: arbitrageOpps,
        tradeIdeas
      },
      upcomingEvents
    };

    // Generate AI briefing
    const systemPrompt = `You are a professional prediction market analyst writing a daily briefing. 
Be concise but comprehensive. Write in a professional analyst tone. 
Highlight actionable insights and use markdown formatting.
Structure your response with clear sections using ## headers.
Include emojis sparingly for visual hierarchy (📈 for gains, 📉 for losses, 🐋 for whales, 📅 for events, 💡 for insights).`;

    const userPrompt = `Generate a daily prediction market briefing for ${briefingDate}.

MARKET DATA:
- Total Volume: $${(briefingData.marketSummary.totalVolume / 1000000).toFixed(1)}M
- New Markets: ${briefingData.marketSummary.newMarkets}
- Resolved Markets: ${briefingData.marketSummary.resolvedMarkets}

TOP MOVERS:
${briefingData.marketSummary.topMovers.map(m => 
  `- "${m.title}" - ${m.change > 0 ? '+' : ''}${(m.change * 100).toFixed(1)}% (now ${(m.currentPrice * 100).toFixed(0)}%)`
).join('\n') || 'No significant movers today'}

TOP STORIES:
${briefingData.topStories.map(s => `- ${s.title}: ${s.summary}`).join('\n') || 'No major stories today'}

OPPORTUNITIES:
- Arbitrage: ${briefingData.opportunities.arbitrage.length} opportunities found
${briefingData.opportunities.arbitrage.map(a => `  * ${a.markets.join(' vs ')} - ${(a.profit * 100).toFixed(1)}% profit`).join('\n')}
- Trade Ideas: ${briefingData.opportunities.tradeIdeas.length} ideas
${briefingData.opportunities.tradeIdeas.map(t => `  * ${t.market} (${(t.confidence * 100).toFixed(0)}% confidence)`).join('\n')}

UPCOMING EVENTS:
${briefingData.upcomingEvents.map(e => `- ${e.date}: ${e.title} (${e.category})`).join('\n') || 'No scheduled events'}

Write a comprehensive but concise briefing covering:
1. Market Overview - summary of activity
2. Top Movers - biggest price changes and why
3. Key Developments - important news affecting markets
4. Smart Money Signals - whale activity patterns
5. Today's Opportunities - actionable trades
6. Look Ahead - upcoming catalysts

Keep each section to 2-4 sentences. Be specific with numbers and percentages.`;

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
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiResult = await response.json();
    const briefingContent = aiResult.choices?.[0]?.message?.content || '';

    // Store briefing if user_id provided
    if (user_id) {
      // Could store in a user_briefings table if needed
      console.log('Briefing generated for user:', user_id);
    }

    return new Response(JSON.stringify({
      success: true,
      date: briefingDate,
      content: briefingContent,
      data: briefingData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error generating briefing:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
