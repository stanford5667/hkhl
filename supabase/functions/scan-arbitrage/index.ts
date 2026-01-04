import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ArbitrageOpportunity {
  type: 'combinatorial' | 'cross_platform';
  markets: string[];
  platforms: string[];
  profit_potential: number;
  confidence: number;
  details: Record<string, unknown>;
  expires_at?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting arbitrage scan...');

    const opportunities: ArbitrageOpportunity[] = [];

    // 1. COMBINATORIAL ARBITRAGE: Check if outcome prices sum to != 1.0
    const { data: markets, error: marketsError } = await supabase
      .from('prediction_markets')
      .select(`
        id,
        title,
        platform,
        category,
        resolution_date,
        market_outcomes (
          id,
          title,
          current_price
        )
      `)
      .eq('status', 'active');

    if (marketsError) {
      throw new Error(`Failed to fetch markets: ${marketsError.message}`);
    }

    console.log(`Scanning ${markets?.length || 0} active markets for arbitrage`);

    // Check combinatorial arbitrage
    for (const market of markets || []) {
      const outcomes = market.market_outcomes || [];
      if (outcomes.length < 2) continue;

      const priceSum = outcomes.reduce((sum: number, o: any) => sum + (o.current_price || 0), 0);

      // If sum < 0.98 (buy all for guaranteed profit) or > 1.02 (sell all)
      if (priceSum < 0.98) {
        const profitPotential = (1 - priceSum) * 100; // Convert to percentage
        opportunities.push({
          type: 'combinatorial',
          markets: [market.id],
          platforms: [market.platform],
          profit_potential: profitPotential,
          confidence: calculateConfidence(profitPotential, outcomes.length),
          details: {
            market_title: market.title,
            price_sum: priceSum,
            strategy: 'BUY_ALL',
            outcomes: outcomes.map((o: any) => ({ title: o.title, price: o.current_price })),
            expected_profit_per_100: profitPotential
          },
          expires_at: market.resolution_date
        });
      } else if (priceSum > 1.02) {
        const profitPotential = (priceSum - 1) * 100;
        opportunities.push({
          type: 'combinatorial',
          markets: [market.id],
          platforms: [market.platform],
          profit_potential: profitPotential,
          confidence: calculateConfidence(profitPotential, outcomes.length),
          details: {
            market_title: market.title,
            price_sum: priceSum,
            strategy: 'SELL_ALL',
            outcomes: outcomes.map((o: any) => ({ title: o.title, price: o.current_price })),
            expected_profit_per_100: profitPotential
          },
          expires_at: market.resolution_date
        });
      }
    }

    // 2. CROSS-PLATFORM ARBITRAGE: Find matching markets across platforms
    const polymarketMarkets = markets?.filter(m => m.platform === 'polymarket') || [];
    const kalshiMarkets = markets?.filter(m => m.platform === 'kalshi') || [];

    console.log(`Cross-platform check: ${polymarketMarkets.length} Polymarket, ${kalshiMarkets.length} Kalshi`);

    for (const pmMarket of polymarketMarkets) {
      for (const kMarket of kalshiMarkets) {
        // Check if markets might be related (same category, similar timing)
        if (pmMarket.category !== kMarket.category) continue;
        
        // Fuzzy title matching
        const similarity = calculateTitleSimilarity(pmMarket.title, kMarket.title);
        if (similarity < 0.5) continue;

        // Check resolution dates are within 7 days
        if (pmMarket.resolution_date && kMarket.resolution_date) {
          const pmDate = new Date(pmMarket.resolution_date);
          const kDate = new Date(kMarket.resolution_date);
          const daysDiff = Math.abs(pmDate.getTime() - kDate.getTime()) / (1000 * 60 * 60 * 24);
          if (daysDiff > 7) continue;
        }

        // Compare prices for matching outcomes
        const pmOutcomes = pmMarket.market_outcomes || [];
        const kOutcomes = kMarket.market_outcomes || [];

        // For binary markets (Yes/No)
        const pmYes = pmOutcomes.find((o: any) => o.title.toLowerCase() === 'yes');
        const kYes = kOutcomes.find((o: any) => o.title.toLowerCase() === 'yes');

        if (pmYes && kYes) {
          const priceDiff = Math.abs((pmYes.current_price || 0) - (kYes.current_price || 0));
          
          // If spread > 3%, there's an opportunity
          if (priceDiff > 0.03) {
            const lowerPlatform = (pmYes.current_price || 0) < (kYes.current_price || 0) ? 'polymarket' : 'kalshi';
            const higherPlatform = lowerPlatform === 'polymarket' ? 'kalshi' : 'polymarket';
            
            opportunities.push({
              type: 'cross_platform',
              markets: [pmMarket.id, kMarket.id],
              platforms: ['polymarket', 'kalshi'],
              profit_potential: priceDiff * 100,
              confidence: similarity * calculateConfidence(priceDiff * 100, 2),
              details: {
                polymarket_title: pmMarket.title,
                kalshi_title: kMarket.title,
                title_similarity: similarity,
                polymarket_yes_price: pmYes.current_price,
                kalshi_yes_price: kYes.current_price,
                price_difference: priceDiff,
                strategy: `BUY YES on ${lowerPlatform}, SELL YES on ${higherPlatform}`,
                expected_profit_per_100: priceDiff * 100
              },
              expires_at: pmMarket.resolution_date || kMarket.resolution_date
            });
          }
        }
      }
    }

    console.log(`Found ${opportunities.length} arbitrage opportunities`);

    // 3. Insert/update opportunities in database
    let inserted = 0;
    let updated = 0;

    for (const opp of opportunities) {
      // Check if similar opportunity already exists
      const { data: existing } = await supabase
        .from('arbitrage_opportunities')
        .select('id')
        .eq('type', opp.type)
        .contains('markets', opp.markets)
        .eq('status', 'active')
        .single();

      if (existing) {
        // Update existing
        await supabase
          .from('arbitrage_opportunities')
          .update({
            profit_potential: opp.profit_potential,
            confidence: opp.confidence,
            details: opp.details,
            expires_at: opp.expires_at
          })
          .eq('id', existing.id);
        updated++;
      } else {
        // Insert new
        await supabase
          .from('arbitrage_opportunities')
          .insert({
            type: opp.type,
            markets: opp.markets,
            platforms: opp.platforms,
            profit_potential: opp.profit_potential,
            confidence: opp.confidence,
            details: opp.details,
            status: 'active',
            expires_at: opp.expires_at
          });
        inserted++;
      }
    }

    // 4. Mark old opportunities as expired
    await supabase
      .from('arbitrage_opportunities')
      .update({ status: 'expired' })
      .eq('status', 'active')
      .lt('expires_at', new Date().toISOString());

    const result = {
      success: true,
      opportunities_found: opportunities.length,
      inserted: inserted,
      updated: updated,
      opportunities: opportunities.slice(0, 10), // Return top 10
      timestamp: new Date().toISOString()
    };

    console.log('Arbitrage scan complete:', { found: opportunities.length, inserted, updated });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Arbitrage scan error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: errMsg
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

function calculateConfidence(profitPotential: number, outcomeCount: number): number {
  // Higher profit = more suspicious (might be stale data)
  // More outcomes = more complex = lower confidence
  let confidence = 0.8;
  
  if (profitPotential > 10) confidence -= 0.2;
  if (profitPotential > 20) confidence -= 0.2;
  if (outcomeCount > 3) confidence -= 0.1;
  
  return Math.max(0.3, Math.min(0.95, confidence));
}

function calculateTitleSimilarity(title1: string, title2: string): number {
  const clean1 = title1.toLowerCase().replace(/[^a-z0-9\s]/g, '');
  const clean2 = title2.toLowerCase().replace(/[^a-z0-9\s]/g, '');
  
  const words1 = new Set(clean1.split(/\s+/).filter(w => w.length > 2));
  const words2 = new Set(clean2.split(/\s+/).filter(w => w.length > 2));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size; // Jaccard similarity
}
