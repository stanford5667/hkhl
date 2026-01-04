import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const POLYMARKET_API = 'https://gamma-api.polymarket.com';

interface PolymarketMarket {
  id: string;
  question: string;
  slug: string;
  description: string;
  outcomes: string[];
  outcomePrices: string[];
  volume: string;
  liquidity: string;
  endDate: string;
  active: boolean;
  closed: boolean;
  tags: { slug: string; label: string }[];
  conditionId: string;
  image: string;
}

interface PolymarketEvent {
  id: string;
  title: string;
  slug: string;
  description: string;
  markets: PolymarketMarket[];
  volume: string;
  startDate: string;
  endDate: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { mode = 'full', limit = 100 } = await req.json().catch(() => ({}));

    console.log(`Starting Polymarket sync - mode: ${mode}, limit: ${limit}`);

    // Fetch markets from Polymarket API
    const marketsResponse = await fetch(`${POLYMARKET_API}/markets?limit=${limit}&active=true`);
    
    if (!marketsResponse.ok) {
      throw new Error(`Polymarket API error: ${marketsResponse.status}`);
    }

    const markets: PolymarketMarket[] = await marketsResponse.json();
    console.log(`Fetched ${markets.length} markets from Polymarket`);

    let marketsSynced = 0;
    let outcomesSynced = 0;
    let pricesSynced = 0;
    const errors: string[] = [];

    for (const market of markets) {
      try {
        // Map category from tags
        const category = mapCategory(market.tags?.[0]?.slug || 'other');
        
        // Determine status
        let status = 'active';
        if (market.closed) {
          status = 'resolved';
        } else if (!market.active) {
          status = 'suspended';
        }

        // Upsert market
        const { data: upsertedMarket, error: marketError } = await supabase
          .from('prediction_markets')
          .upsert({
            platform: 'polymarket',
            platform_market_id: market.id,
            title: market.question,
            description: market.description || null,
            category: category,
            status: status,
            resolution_date: market.endDate ? new Date(market.endDate).toISOString() : null,
            total_volume: parseFloat(market.volume || '0'),
            liquidity: parseFloat(market.liquidity || '0'),
            image_url: market.image || null,
            source_url: `https://polymarket.com/event/${market.slug}`,
            metadata: {
              conditionId: market.conditionId,
              tags: market.tags,
              slug: market.slug
            },
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'platform,platform_market_id'
          })
          .select()
          .single();

        if (marketError) {
          console.error(`Error upserting market ${market.id}:`, marketError);
          errors.push(`Market ${market.id}: ${marketError.message}`);
          continue;
        }

        marketsSynced++;
        const marketId = upsertedMarket.id;

        // Upsert outcomes
        if (market.outcomes && market.outcomePrices) {
          for (let i = 0; i < market.outcomes.length; i++) {
            const outcomeName = market.outcomes[i];
            const price = parseFloat(market.outcomePrices[i] || '0');

            const { error: outcomeError } = await supabase
              .from('market_outcomes')
              .upsert({
                market_id: marketId,
                title: outcomeName,
                platform_outcome_id: `${market.id}_${i}`,
                current_price: price,
                updated_at: new Date().toISOString()
              }, {
                onConflict: 'market_id,title'
              });

            if (outcomeError) {
              console.error(`Error upserting outcome:`, outcomeError);
              errors.push(`Outcome ${outcomeName}: ${outcomeError.message}`);
            } else {
              outcomesSynced++;
            }

            // Insert price history
            const { data: outcome } = await supabase
              .from('market_outcomes')
              .select('id')
              .eq('market_id', marketId)
              .eq('title', outcomeName)
              .single();

            if (outcome) {
              const { error: priceError } = await supabase
                .from('market_price_history')
                .insert({
                  market_id: marketId,
                  outcome_id: outcome.id,
                  price: price,
                  timestamp: new Date().toISOString()
                });

              if (!priceError) {
                pricesSynced++;
              }
            }
          }
        }
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error(`Error processing market ${market.id}:`, err);
        errors.push(`Market ${market.id}: ${errMsg}`);
      }
    }

    // Also fetch events for richer data
    try {
      const eventsResponse = await fetch(`${POLYMARKET_API}/events?limit=50&active=true`);
      if (eventsResponse.ok) {
        const events: PolymarketEvent[] = await eventsResponse.json();
        console.log(`Fetched ${events.length} events from Polymarket`);
        
        // Events contain grouped markets - already processed above via /markets endpoint
      }
    } catch (err) {
      console.warn('Could not fetch events:', err);
    }

    const result = {
      success: true,
      markets_synced: marketsSynced,
      outcomes_synced: outcomesSynced,
      prices_synced: pricesSynced,
      errors: errors.slice(0, 10), // Limit error output
      timestamp: new Date().toISOString()
    };

    console.log('Polymarket sync complete:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Polymarket sync error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: errMsg
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

function mapCategory(tag: string): string {
  const categoryMap: Record<string, string> = {
    'politics': 'politics',
    'us-politics': 'politics',
    'elections': 'politics',
    'crypto': 'crypto',
    'bitcoin': 'crypto',
    'ethereum': 'crypto',
    'sports': 'sports',
    'nfl': 'sports',
    'nba': 'sports',
    'soccer': 'sports',
    'science': 'science',
    'ai': 'science',
    'tech': 'science',
    'entertainment': 'entertainment',
    'culture': 'entertainment',
    'finance': 'finance',
    'economics': 'finance',
    'business': 'finance'
  };
  
  return categoryMap[tag.toLowerCase()] || 'other';
}
