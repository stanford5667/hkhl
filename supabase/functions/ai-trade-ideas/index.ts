import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TradeIdea {
  id: string;
  market_id: string;
  generated_at: string;
  direction: 'buy_yes' | 'buy_no' | 'sell_yes' | 'sell_no';
  entry_price: number;
  target_price: number;
  stop_loss_price: number;
  confidence: number;
  thesis_summary: string;
  thesis_detailed: string;
  supporting_evidence: Array<{
    type: string;
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
  suggested_allocation: number;
  kelly_fraction: number;
  max_position: number;
  expected_value: number;
  time_horizon: 'hours' | 'days' | 'weeks' | 'until_resolution';
  catalyst_events: Array<{ event: string; date: string; impact: string }>;
  market_title: string;
  platform: string;
  category: string;
  status: string;
  similar_past_ideas: Array<{
    idea_summary: string;
    outcome: 'win' | 'loss';
    return_pct: number;
  }>;
}

interface Opportunity {
  id: string;
  type: 'arbitrage' | 'news' | 'whale' | 'calibration' | 'sentiment';
  market_id: string;
  market_title: string;
  platform: string;
  category: string;
  current_price: number;
  description: string;
  potential_edge: number;
  data: Record<string, unknown>;
}

// Kelly Criterion calculation
function calculateKelly(probability: number, marketPrice: number, maxFraction: number = 0.25): {
  full_kelly: number;
  half_kelly: number;
  quarter_kelly: number;
  expected_value: number;
  edge: number;
} {
  const edge = probability - marketPrice;
  const odds = (1 - marketPrice) / marketPrice;
  const fullKelly = edge > 0 ? (edge * odds) / (odds + 1) : 0;
  
  return {
    full_kelly: Math.min(fullKelly, 1),
    half_kelly: Math.min(fullKelly * 0.5, maxFraction),
    quarter_kelly: Math.min(fullKelly * 0.25, maxFraction),
    expected_value: edge,
    edge: edge,
  };
}

// Expected value calculation
function calculateExpectedValue(probability: number, price: number, position: number): {
  expected_profit: number;
  max_loss: number;
  max_gain: number;
  probability_of_profit: number;
} {
  const payout = position / price;
  const maxGain = payout - position;
  const maxLoss = position;
  const expectedProfit = probability * maxGain - (1 - probability) * maxLoss;
  
  return {
    expected_profit: expectedProfit,
    max_loss: maxLoss,
    max_gain: maxGain,
    probability_of_profit: probability,
  };
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

    const body = await req.json();
    const {
      mode = 'generate_new',
      filters = {},
      count = 5,
      user_context = { bankroll: 10000, risk_tolerance: 'moderate', existing_positions: [] }
    } = body;

    const { categories, min_confidence = 50, max_risk = 'high', platforms } = filters;
    const { bankroll, risk_tolerance, existing_positions } = user_context;

    console.log(`Starting trade idea generation: mode=${mode}, count=${count}`);

    // STEP 1: OPPORTUNITY SCANNING
    const opportunities: Opportunity[] = [];

    // Scan arbitrage opportunities
    const arbResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/arbitrage_opportunities?status=eq.active&order=profit_potential.desc&limit=15`,
      {
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
        },
      }
    );
    
    if (arbResponse.ok) {
      const arbitrages = await arbResponse.json();
      for (const arb of arbitrages) {
        opportunities.push({
          id: `arb_${arb.id}`,
          type: 'arbitrage',
          market_id: arb.markets?.[0] || arb.id,
          market_title: `Arbitrage: ${arb.type}`,
          platform: arb.platforms?.join(', ') || 'multiple',
          category: 'arbitrage',
          current_price: 0.5,
          description: `${arb.type} arbitrage with ${(arb.profit_potential * 100).toFixed(2)}% profit potential`,
          potential_edge: arb.profit_potential || 0,
          data: arb,
        });
      }
    }

    // Scan high-momentum news clusters
    const newsResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/news_clusters?order=momentum_score.desc&limit=15`,
      {
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
        },
      }
    );

    if (newsResponse.ok) {
      const clusters = await newsResponse.json();
      for (const cluster of clusters) {
        if (cluster.related_market_ids?.length > 0) {
          opportunities.push({
            id: `news_${cluster.id}`,
            type: 'news',
            market_id: cluster.related_market_ids[0],
            market_title: cluster.narrative_title || 'News-Driven Opportunity',
            platform: 'multiple',
            category: 'news',
            current_price: 0.5,
            description: `${cluster.narrative_title}: ${cluster.sentiment_arc} sentiment, momentum ${cluster.momentum_score?.toFixed(1) || 'N/A'}`,
            potential_edge: Math.abs(cluster.momentum_score || 0) / 100,
            data: cluster,
          });
        }
      }
    }

    // Scan whale activity
    const whaleResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/whale_transactions?order=created_at.desc&limit=30`,
      {
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
        },
      }
    );

    if (whaleResponse.ok) {
      const whaleTxs = await whaleResponse.json();
      const marketActivity: Record<string, { buys: number; sells: number; totalVolume: number; txCount: number }> = {};
      
      for (const tx of whaleTxs) {
        const mktId = tx.market_id;
        if (!mktId) continue;
        if (!marketActivity[mktId]) {
          marketActivity[mktId] = { buys: 0, sells: 0, totalVolume: 0, txCount: 0 };
        }
        const amt = tx.amount || 0;
        if (tx.direction === 'buy') {
          marketActivity[mktId].buys += amt;
        } else {
          marketActivity[mktId].sells += amt;
        }
        marketActivity[mktId].totalVolume += amt;
        marketActivity[mktId].txCount++;
      }

      for (const [mktId, activity] of Object.entries(marketActivity)) {
        if (activity.txCount < 2) continue;
        const buyRatio = activity.buys / (activity.buys + activity.sells + 0.001);
        if (buyRatio > 0.65 || buyRatio < 0.35) {
          opportunities.push({
            id: `whale_${mktId}`,
            type: 'whale',
            market_id: mktId,
            market_title: 'Whale Divergence Signal',
            platform: 'unknown',
            category: 'whale',
            current_price: 0.5,
            description: `Smart money ${buyRatio > 0.5 ? 'accumulating' : 'distributing'}: ${(buyRatio * 100).toFixed(0)}% buy ratio across ${activity.txCount} txs`,
            potential_edge: Math.abs(buyRatio - 0.5) * 0.4,
            data: { ...activity, buyRatio },
          });
        }
      }
    }

    // Scan KOL sentiment
    const kolResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/kol_sentiment?order=detected_at.desc&limit=40`,
      {
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
        },
      }
    );

    if (kolResponse.ok) {
      const sentiments = await kolResponse.json();
      const marketSentiment: Record<string, { scores: number[]; count: number }> = {};
      
      for (const s of sentiments) {
        for (const mktId of (s.related_markets || [])) {
          if (!marketSentiment[mktId]) {
            marketSentiment[mktId] = { scores: [], count: 0 };
          }
          if (s.sentiment_score !== null) {
            marketSentiment[mktId].scores.push(s.sentiment_score);
            marketSentiment[mktId].count++;
          }
        }
      }

      for (const [mktId, data] of Object.entries(marketSentiment)) {
        if (data.count >= 2) {
          const avg = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
          if (Math.abs(avg) > 0.25) {
            opportunities.push({
              id: `sentiment_${mktId}`,
              type: 'sentiment',
              market_id: mktId,
              market_title: 'KOL Sentiment Signal',
              platform: 'multiple',
              category: 'sentiment',
              current_price: 0.5,
              description: `KOL consensus: ${avg > 0 ? 'bullish' : 'bearish'} (avg ${avg.toFixed(2)} from ${data.count} KOLs)`,
              potential_edge: Math.abs(avg) * 0.25,
              data: { avgSentiment: avg, count: data.count },
            });
          }
        }
      }
    }

    // Apply filters
    let filteredOpportunities = opportunities;
    if (categories?.length) {
      filteredOpportunities = filteredOpportunities.filter(o => categories.includes(o.category) || categories.includes(o.type));
    }
    if (platforms?.length) {
      filteredOpportunities = filteredOpportunities.filter(o => platforms.some((p: string) => o.platform.toLowerCase().includes(p.toLowerCase())));
    }

    console.log(`Found ${filteredOpportunities.length} opportunities after filtering`);

    if (filteredOpportunities.length === 0) {
      return new Response(JSON.stringify({
        trade_ideas: [],
        opportunities_scanned: opportunities.length,
        market_summary: 'No opportunities match your criteria at this time.',
        portfolio_recommendation: 'Consider relaxing your filters or checking back later.',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // STEP 2: OPPORTUNITY RANKING via LLM
    const rankingPrompt = `You are a quantitative trading analyst. Rank these opportunities by expected risk-adjusted return.

Opportunities:
${filteredOpportunities.slice(0, 20).map((o, i) => `${i + 1}. [${o.type.toUpperCase()}] ${o.description} | Edge est: ${(o.potential_edge * 100).toFixed(1)}%`).join('\n')}

User profile:
- Risk tolerance: ${risk_tolerance}
- Bankroll: $${bankroll.toLocaleString()}
- Existing positions: ${existing_positions.length} active
- Min confidence required: ${min_confidence}%
- Max risk level: ${max_risk}

Return JSON:
{
  "ranked_opportunities": [
    {"index": <1-based>, "rank": <1=best>, "expected_ev": <0-0.5>, "confidence": <0-100>, "reasoning": "<brief>"}
  ],
  "skip": [{"index": <num>, "reason": "<why>"}]
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
          { role: 'system', content: 'You are a quantitative analyst. Respond only with valid JSON.' },
          { role: 'user', content: rankingPrompt },
        ],
      }),
    });

    if (!rankingResponse.ok) {
      throw new Error(`Ranking failed: ${rankingResponse.status}`);
    }

    const rankingData = await rankingResponse.json();
    let ranking: { ranked_opportunities: Array<{ index: number; rank: number; expected_ev: number; confidence: number; reasoning: string }>; skip?: Array<{ index: number; reason: string }> };
    
    try {
      const content = rankingData.choices?.[0]?.message?.content || '{}';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      ranking = jsonMatch ? JSON.parse(jsonMatch[0]) : { ranked_opportunities: [] };
    } catch {
      ranking = { ranked_opportunities: [] };
    }

    // Get top opportunities
    const topOpps = ranking.ranked_opportunities
      ?.filter(r => r.confidence >= min_confidence)
      .sort((a, b) => a.rank - b.rank)
      .slice(0, count)
      .map(r => ({ ...filteredOpportunities[r.index - 1], ranking: r }))
      .filter(Boolean) || [];

    console.log(`Processing ${topOpps.length} top opportunities for deep analysis`);

    // STEP 3: DEEP ANALYSIS + STEP 4: CALCULATIONS + STEP 5: SIMILAR TRADE LOOKUP
    const tradeIdeas: TradeIdea[] = [];

    // Fetch similar past ideas for comparison
    const pastIdeasResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/trade_ideas?status=in.(resolved,closed)&order=generated_at.desc&limit=50`,
      {
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
        },
      }
    );
    const pastIdeas = pastIdeasResponse.ok ? await pastIdeasResponse.json() : [];

    for (const opp of topOpps) {
      // Find similar past ideas by type
      const similarPast = pastIdeas
        .filter((p: Record<string, unknown>) => p.category === opp.category || p.risk_level === opp.ranking.expected_ev > 0.1 ? 'high' : 'medium')
        .slice(0, 3)
        .map((p: Record<string, unknown>) => ({
          idea_summary: p.thesis_summary as string || 'Past trade',
          outcome: (p.outcome as string) || 'unknown',
          return_pct: (p.actual_return as number) || 0,
        }));

      // Calculate historical accuracy for this type
      const typeIdeas = pastIdeas.filter((p: Record<string, unknown>) => p.category === opp.type);
      const wins = typeIdeas.filter((p: Record<string, unknown>) => p.outcome === 'win').length;
      const historicalAccuracy = typeIdeas.length > 0 ? wins / typeIdeas.length : 0.5;

      // Deep analysis prompt
      const deepPrompt = `Generate a complete trade idea with full analysis.

Opportunity:
- Type: ${opp.type}
- Description: ${opp.description}
- Market: ${opp.market_title}
- Estimated edge: ${(opp.potential_edge * 100).toFixed(1)}%
- Initial confidence: ${opp.ranking.confidence}%
- Ranking reasoning: ${opp.ranking.reasoning}

Raw Data:
${JSON.stringify(opp.data, null, 2)}

Historical Context:
- Similar ideas accuracy: ${(historicalAccuracy * 100).toFixed(0)}% (${typeIdeas.length} samples)
- Past similar trades: ${JSON.stringify(similarPast)}

User Profile:
- Bankroll: $${bankroll.toLocaleString()}
- Risk tolerance: ${risk_tolerance}
- Existing positions: ${existing_positions.length}

Generate complete trade analysis JSON:
{
  "direction": "buy_yes" | "buy_no",
  "estimated_probability": <0-1, your true probability estimate>,
  "target_price": <0-1>,
  "stop_loss_price": <0-1>,
  "confidence": <0-100, adjusted for historical accuracy>,
  "thesis_summary": "<2-3 sentence summary>",
  "thesis_detailed": "<full analysis, 2-3 paragraphs>",
  "supporting_evidence": [
    {"type": "${opp.type}", "description": "<evidence>", "strength": "strong|moderate|weak", "source_id": "${opp.id}"}
  ],
  "counter_arguments": [
    {"argument": "<potential flaw>", "severity": "high|medium|low", "mitigation": "<mitigation>"}
  ],
  "risk_level": "low|medium|high|very_high",
  "time_horizon": "hours|days|weeks|until_resolution",
  "catalyst_events": [{"event": "<event>", "date": "<date>", "impact": "<impact>"}],
  "exit_strategy": "<when to exit>"
}`;

      const deepResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'You are a quantitative trading analyst. Respond with valid JSON only.' },
            { role: 'user', content: deepPrompt },
          ],
        }),
      });

      if (!deepResponse.ok) {
        console.error(`Deep analysis failed for ${opp.id}`);
        continue;
      }

      const deepData = await deepResponse.json();
      
      try {
        const content = deepData.choices?.[0]?.message?.content || '{}';
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        const analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
        
        if (!analysis) continue;

        // STEP 4: Calculate precise sizing using Kelly
        const estimatedProb = analysis.estimated_probability || 0.55;
        const marketPrice = opp.current_price || 0.5;
        const kelly = calculateKelly(estimatedProb, marketPrice);
        
        // Adjust kelly based on risk tolerance
        let kellyMultiplier = 0.25; // quarter kelly default
        if (risk_tolerance === 'aggressive') kellyMultiplier = 0.5;
        if (risk_tolerance === 'conservative') kellyMultiplier = 0.125;
        
        const suggestedAllocation = Math.min(kelly.full_kelly * kellyMultiplier * 100, 10); // max 10%
        const maxPosition = bankroll * (suggestedAllocation / 100);
        
        const ev = calculateExpectedValue(estimatedProb, marketPrice, maxPosition);

        const tradeIdea: TradeIdea = {
          id: crypto.randomUUID(),
          market_id: opp.market_id,
          generated_at: new Date().toISOString(),
          direction: analysis.direction || 'buy_yes',
          entry_price: marketPrice,
          target_price: analysis.target_price || estimatedProb,
          stop_loss_price: analysis.stop_loss_price || marketPrice * 0.8,
          confidence: Math.round(analysis.confidence * (0.5 + historicalAccuracy * 0.5)), // Adjust for track record
          thesis_summary: analysis.thesis_summary || '',
          thesis_detailed: analysis.thesis_detailed || '',
          supporting_evidence: analysis.supporting_evidence || [],
          counter_arguments: analysis.counter_arguments || [],
          risk_level: analysis.risk_level || 'medium',
          suggested_allocation: suggestedAllocation,
          kelly_fraction: kellyMultiplier,
          max_position: maxPosition,
          expected_value: ev.expected_profit,
          time_horizon: analysis.time_horizon || 'days',
          catalyst_events: analysis.catalyst_events || [],
          market_title: opp.market_title,
          platform: opp.platform,
          category: opp.type,
          status: 'active',
          similar_past_ideas: similarPast,
        };

        // Filter by risk level
        const riskOrder = { low: 1, medium: 2, high: 3, very_high: 4 };
        const maxRiskNum = riskOrder[max_risk as keyof typeof riskOrder] || 3;
        const ideaRiskNum = riskOrder[tradeIdea.risk_level] || 2;
        
        if (ideaRiskNum <= maxRiskNum) {
          tradeIdeas.push(tradeIdea);
        }
      } catch (e) {
        console.error(`Failed to process ${opp.id}:`, e);
      }
    }

    // Save trade ideas to database
    if (tradeIdeas.length > 0) {
      const insertResponse = await fetch(`${SUPABASE_URL}/rest/v1/trade_ideas`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify(tradeIdeas.map(idea => ({
          id: idea.id,
          market_id: idea.market_id,
          direction: idea.direction,
          entry_price: idea.entry_price,
          target_price: idea.target_price,
          stop_loss_price: idea.stop_loss_price,
          confidence: idea.confidence,
          thesis_summary: idea.thesis_summary,
          thesis_detailed: idea.thesis_detailed,
          supporting_evidence: idea.supporting_evidence,
          counter_arguments: idea.counter_arguments,
          risk_level: idea.risk_level,
          suggested_allocation: idea.suggested_allocation,
          kelly_fraction: idea.kelly_fraction,
          max_position: idea.max_position,
          expected_value: idea.expected_value,
          time_horizon: idea.time_horizon,
          catalyst_events: idea.catalyst_events,
          market_title: idea.market_title,
          platform: idea.platform,
          category: idea.category,
          status: 'active',
          is_public: true,
        }))),
      });

      if (!insertResponse.ok) {
        console.error('Failed to save trade ideas:', await insertResponse.text());
      }
    }

    // Generate portfolio-level summary
    const totalAllocation = tradeIdeas.reduce((sum, i) => sum + i.suggested_allocation, 0);
    const avgConfidence = tradeIdeas.length > 0 
      ? tradeIdeas.reduce((sum, i) => sum + i.confidence, 0) / tradeIdeas.length 
      : 0;
    const highConviction = tradeIdeas.filter(i => i.confidence >= 75).length;

    const marketSummary = tradeIdeas.length > 0
      ? `Found ${tradeIdeas.length} trade opportunities. ${highConviction} high-conviction ideas (75%+ confidence). Average confidence: ${avgConfidence.toFixed(0)}%. Total suggested allocation: ${totalAllocation.toFixed(1)}% of bankroll.`
      : 'No high-quality trade ideas found matching your criteria.';

    const portfolioRec = tradeIdeas.length > 1
      ? `Consider diversifying across ${new Set(tradeIdeas.map(i => i.category)).size} different signal types. Highest conviction: "${tradeIdeas[0]?.market_title}" at ${tradeIdeas[0]?.confidence}% confidence.`
      : tradeIdeas.length === 1
        ? `Single high-quality opportunity identified. Consider position sizing at ${tradeIdeas[0].suggested_allocation.toFixed(1)}% of bankroll.`
        : 'Stay patient and wait for clearer signals.';

    console.log(`Generated ${tradeIdeas.length} trade ideas`);

    return new Response(JSON.stringify({
      trade_ideas: tradeIdeas,
      opportunities_scanned: opportunities.length,
      opportunities_filtered: filteredOpportunities.length,
      market_summary: marketSummary,
      portfolio_recommendation: portfolioRec,
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
