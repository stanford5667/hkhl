import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TradeIdea {
  id: string;
  generated_at: string;
  market_id: string;
  market_title: string;
  platform: string;
  direction: 'buy_yes' | 'buy_no' | 'sell_yes' | 'sell_no';
  current_price: number;
  target_price: number;
  confidence: number;
  suggested_allocation: number;
  kelly_fraction: number;
  max_position: number;
  thesis_summary: string;
  thesis_detailed: string;
  supporting_evidence: Array<{
    type: 'news' | 'sentiment' | 'whale' | 'calibration' | 'arbitrage' | 'technical';
    description: string;
    strength: 'strong' | 'moderate' | 'weak';
    source_id: string;
  }>;
  counter_arguments: Array<{
    argument: string;
    severity: 'high' | 'medium' | 'low';
    mitigation: string;
  }>;
  risk_level: 'low' | 'medium' | 'high' | 'very_high';
  max_loss: number;
  stop_loss_price: number;
  time_horizon: 'hours' | 'days' | 'weeks' | 'until_resolution';
  catalyst_events: Array<{ event: string; date: string; impact: string }>;
  similar_past_ideas: Array<{
    idea_summary: string;
    outcome: 'win' | 'loss';
    return: number;
  }>;
}

interface Opportunity {
  id: string;
  type: 'arbitrage' | 'news' | 'whale' | 'calibration' | 'sentiment';
  market_id: string;
  market_title: string;
  platform: string;
  current_price: number;
  description: string;
  potential_edge: number;
  data: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase credentials not configured');
    }

    const { user_bankroll = 10000, risk_tolerance = 'moderate', max_ideas = 5 } = await req.json();

    console.log('Starting trade idea generation...');

    // Step 1: OPPORTUNITY SCANNING - Gather all potential opportunities
    const opportunities: Opportunity[] = [];

    // Scan arbitrage opportunities
    const arbResponse = await fetch(`${SUPABASE_URL}/rest/v1/arbitrage_opportunities?status=eq.active&order=profit_potential.desc&limit=10`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
      },
    });
    
    if (arbResponse.ok) {
      const arbitrages = await arbResponse.json();
      for (const arb of arbitrages) {
        opportunities.push({
          id: `arb_${arb.id}`,
          type: 'arbitrage',
          market_id: arb.markets?.[0] || 'unknown',
          market_title: `Arbitrage: ${arb.type}`,
          platform: arb.platforms?.join(', ') || 'multiple',
          current_price: 0,
          description: `${arb.type} arbitrage with ${(arb.profit_potential * 100).toFixed(2)}% profit potential`,
          potential_edge: arb.profit_potential,
          data: arb,
        });
      }
    }

    // Scan markets with recent high-impact news
    const newsResponse = await fetch(`${SUPABASE_URL}/rest/v1/news_clusters?is_emerging=eq.true&order=momentum_score.desc&limit=10`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
      },
    });

    if (newsResponse.ok) {
      const newsClusters = await newsResponse.json();
      for (const cluster of newsClusters) {
        if (cluster.related_market_ids?.length > 0) {
          opportunities.push({
            id: `news_${cluster.id}`,
            type: 'news',
            market_id: cluster.related_market_ids[0],
            market_title: cluster.narrative_title || 'News Impact',
            platform: 'multiple',
            current_price: 0,
            description: `Breaking narrative: ${cluster.narrative_title}. Sentiment: ${cluster.sentiment_arc}`,
            potential_edge: Math.abs(cluster.momentum_score || 0) / 100,
            data: cluster,
          });
        }
      }
    }

    // Scan whale activity
    const whaleResponse = await fetch(`${SUPABASE_URL}/rest/v1/whale_transactions?order=created_at.desc&limit=20`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
      },
    });

    if (whaleResponse.ok) {
      const whaleTxs = await whaleResponse.json();
      // Group by market and detect divergence
      const marketWhaleActivity: Record<string, { buys: number; sells: number; volume: number }> = {};
      
      for (const tx of whaleTxs) {
        const marketId = tx.market_id;
        if (!marketId) continue;
        
        if (!marketWhaleActivity[marketId]) {
          marketWhaleActivity[marketId] = { buys: 0, sells: 0, volume: 0 };
        }
        
        if (tx.direction === 'buy') {
          marketWhaleActivity[marketId].buys += tx.amount || 0;
        } else {
          marketWhaleActivity[marketId].sells += tx.amount || 0;
        }
        marketWhaleActivity[marketId].volume += tx.amount || 0;
      }

      for (const [marketId, activity] of Object.entries(marketWhaleActivity)) {
        const buyRatio = activity.buys / (activity.buys + activity.sells + 0.001);
        if (buyRatio > 0.7 || buyRatio < 0.3) {
          opportunities.push({
            id: `whale_${marketId}`,
            type: 'whale',
            market_id: marketId,
            market_title: `Whale Activity Detected`,
            platform: 'unknown',
            current_price: 0,
            description: `Whales ${buyRatio > 0.5 ? 'accumulating' : 'distributing'} with ${(buyRatio * 100).toFixed(0)}% buy ratio`,
            potential_edge: Math.abs(buyRatio - 0.5) * 0.3,
            data: { ...activity, buyRatio },
          });
        }
      }
    }

    // Scan KOL sentiment shifts
    const kolResponse = await fetch(`${SUPABASE_URL}/rest/v1/kol_sentiment?order=detected_at.desc&limit=30`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
      },
    });

    if (kolResponse.ok) {
      const kolSentiments = await kolResponse.json();
      // Aggregate sentiment by related markets
      const marketSentiment: Record<string, { scores: number[]; count: number }> = {};
      
      for (const sentiment of kolSentiments) {
        for (const marketId of (sentiment.related_markets || [])) {
          if (!marketSentiment[marketId]) {
            marketSentiment[marketId] = { scores: [], count: 0 };
          }
          if (sentiment.sentiment_score !== null) {
            marketSentiment[marketId].scores.push(sentiment.sentiment_score);
            marketSentiment[marketId].count++;
          }
        }
      }

      for (const [marketId, data] of Object.entries(marketSentiment)) {
        if (data.count >= 3) {
          const avgSentiment = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
          if (Math.abs(avgSentiment) > 0.3) {
            opportunities.push({
              id: `sentiment_${marketId}`,
              type: 'sentiment',
              market_id: marketId,
              market_title: `KOL Sentiment Signal`,
              platform: 'multiple',
              current_price: 0,
              description: `KOL consensus: ${avgSentiment > 0 ? 'bullish' : 'bearish'} (${avgSentiment.toFixed(2)} avg score from ${data.count} KOLs)`,
              potential_edge: Math.abs(avgSentiment) * 0.2,
              data: { avgSentiment, count: data.count },
            });
          }
        }
      }
    }

    console.log(`Found ${opportunities.length} potential opportunities`);

    if (opportunities.length === 0) {
      return new Response(JSON.stringify({
        trade_ideas: [],
        opportunities_scanned: 0,
        message: 'No opportunities found at this time',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 2: OPPORTUNITY RANKING via LLM
    const rankingPrompt = `You are a quantitative trading analyst. Rank these potential opportunities by expected risk-adjusted return.

Opportunities:
${opportunities.map((opp, i) => `${i + 1}. [${opp.type.toUpperCase()}] ${opp.description} (Edge estimate: ${(opp.potential_edge * 100).toFixed(1)}%)`).join('\n')}

User risk tolerance: ${risk_tolerance}
User bankroll: $${user_bankroll.toLocaleString()}

Output JSON:
{
  "ranked_opportunities": [
    {
      "opportunity_index": <1-based index>,
      "rank": <1 = best>,
      "expected_ev": <0-1>,
      "confidence": <0-100>,
      "reasoning": "<brief reasoning>"
    }
  ],
  "opportunities_to_skip": [
    {"opportunity_index": <index>, "reason": "<why skip>"}
  ]
}`;

    const rankingResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a quantitative trading analyst. Always respond with valid JSON.' },
          { role: 'user', content: rankingPrompt },
        ],
      }),
    });

    if (!rankingResponse.ok) {
      const errorText = await rankingResponse.text();
      console.error('Ranking LLM error:', errorText);
      throw new Error(`Ranking failed: ${rankingResponse.status}`);
    }

    const rankingData = await rankingResponse.json();
    let ranking: { ranked_opportunities: Array<{ opportunity_index: number; rank: number; expected_ev: number; confidence: number; reasoning: string }>; opportunities_to_skip: Array<{ opportunity_index: number; reason: string }> };
    
    try {
      const content = rankingData.choices?.[0]?.message?.content || '{}';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      ranking = jsonMatch ? JSON.parse(jsonMatch[0]) : { ranked_opportunities: [], opportunities_to_skip: [] };
    } catch (e) {
      console.error('Failed to parse ranking:', e);
      ranking = { ranked_opportunities: [], opportunities_to_skip: [] };
    }

    // Sort by rank and take top opportunities
    const topOpportunities = ranking.ranked_opportunities
      .sort((a, b) => a.rank - b.rank)
      .slice(0, max_ideas)
      .map(r => ({
        ...opportunities[r.opportunity_index - 1],
        ranking: r,
      }))
      .filter(o => o !== undefined);

    console.log(`Generating ${topOpportunities.length} trade ideas...`);

    // Step 3: GENERATE DETAILED TRADE IDEAS via LLM
    const tradeIdeas: TradeIdea[] = [];

    for (const opp of topOpportunities) {
      const ideaPrompt = `Generate a detailed trade idea for this opportunity.

Opportunity Type: ${opp.type}
Description: ${opp.description}
Market: ${opp.market_title}
Ranking Reasoning: ${opp.ranking.reasoning}
Expected EV: ${(opp.ranking.expected_ev * 100).toFixed(1)}%
Confidence: ${opp.ranking.confidence}%

User Context:
- Bankroll: $${user_bankroll.toLocaleString()}
- Risk Tolerance: ${risk_tolerance}

Generate a complete trade idea with the following JSON structure:
{
  "direction": "buy_yes" | "buy_no" | "sell_yes" | "sell_no",
  "target_price": <0-1, where you think fair value is>,
  "confidence": <0-100>,
  "suggested_allocation": <percentage of bankroll, e.g., 5 for 5%>,
  "kelly_fraction": <0-1, fraction of kelly to use>,
  "thesis_summary": "<2-3 sentence summary>",
  "thesis_detailed": "<full analysis paragraph>",
  "supporting_evidence": [
    {"type": "${opp.type}", "description": "<evidence>", "strength": "strong|moderate|weak", "source_id": "${opp.id}"}
  ],
  "counter_arguments": [
    {"argument": "<potential flaw>", "severity": "high|medium|low", "mitigation": "<how to handle>"}
  ],
  "risk_level": "low|medium|high|very_high",
  "max_loss_percent": <max loss as percentage of position>,
  "stop_loss_price": <price to exit>,
  "time_horizon": "hours|days|weeks|until_resolution",
  "catalyst_events": [
    {"event": "<upcoming event>", "date": "<date>", "impact": "<expected impact>"}
  ]
}`;

      const ideaResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'You are a quantitative trading analyst generating actionable trade ideas. Always respond with valid JSON.' },
            { role: 'user', content: ideaPrompt },
          ],
        }),
      });

      if (!ideaResponse.ok) {
        console.error(`Failed to generate idea for ${opp.id}`);
        continue;
      }

      const ideaData = await ideaResponse.json();
      
      try {
        const content = ideaData.choices?.[0]?.message?.content || '{}';
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        const ideaJson = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
        
        if (ideaJson) {
          const tradeIdea: TradeIdea = {
            id: crypto.randomUUID(),
            generated_at: new Date().toISOString(),
            market_id: opp.market_id,
            market_title: opp.market_title,
            platform: opp.platform,
            direction: ideaJson.direction || 'buy_yes',
            current_price: opp.current_price,
            target_price: ideaJson.target_price || 0.5,
            confidence: ideaJson.confidence || 50,
            suggested_allocation: ideaJson.suggested_allocation || 2,
            kelly_fraction: ideaJson.kelly_fraction || 0.25,
            max_position: (user_bankroll * (ideaJson.suggested_allocation || 2)) / 100,
            thesis_summary: ideaJson.thesis_summary || '',
            thesis_detailed: ideaJson.thesis_detailed || '',
            supporting_evidence: ideaJson.supporting_evidence || [],
            counter_arguments: ideaJson.counter_arguments || [],
            risk_level: ideaJson.risk_level || 'medium',
            max_loss: (user_bankroll * (ideaJson.suggested_allocation || 2) * (ideaJson.max_loss_percent || 100)) / 10000,
            stop_loss_price: ideaJson.stop_loss_price || 0,
            time_horizon: ideaJson.time_horizon || 'days',
            catalyst_events: ideaJson.catalyst_events || [],
            similar_past_ideas: [], // Would need historical trade idea tracking
          };

          tradeIdeas.push(tradeIdea);
        }
      } catch (e) {
        console.error(`Failed to parse idea for ${opp.id}:`, e);
      }
    }

    // Step 4: FINAL PORTFOLIO CHECK via LLM
    if (tradeIdeas.length > 1) {
      const portfolioCheckPrompt = `Review these trade ideas for portfolio coherence and concentration risk.

Trade Ideas:
${tradeIdeas.map((idea, i) => `${i + 1}. ${idea.market_title}: ${idea.direction} at ${idea.suggested_allocation}% allocation (${idea.risk_level} risk)`).join('\n')}

Total allocation: ${tradeIdeas.reduce((sum, i) => sum + i.suggested_allocation, 0)}%
Risk tolerance: ${risk_tolerance}

Provide brief portfolio-level recommendations in JSON:
{
  "total_risk_assessment": "acceptable|high|too_concentrated",
  "correlation_warning": "<any correlated bets?>",
  "adjustment_suggestions": ["<suggestion 1>", "<suggestion 2>"],
  "overall_portfolio_confidence": <0-100>
}`;

      const portfolioResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'You are a portfolio risk manager. Always respond with valid JSON.' },
            { role: 'user', content: portfolioCheckPrompt },
          ],
        }),
      });

      if (portfolioResponse.ok) {
        const portfolioData = await portfolioResponse.json();
        try {
          const content = portfolioData.choices?.[0]?.message?.content || '{}';
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          const portfolioCheck = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
          
          console.log('Portfolio check:', portfolioCheck);
        } catch (e) {
          console.error('Failed to parse portfolio check:', e);
        }
      }
    }

    console.log(`Generated ${tradeIdeas.length} trade ideas`);

    return new Response(JSON.stringify({
      trade_ideas: tradeIdeas,
      opportunities_scanned: opportunities.length,
      opportunities_ranked: ranking.ranked_opportunities?.length || 0,
      opportunities_skipped: ranking.opportunities_to_skip?.length || 0,
      generation_timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-trade-ideas:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      trade_ideas: [],
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
