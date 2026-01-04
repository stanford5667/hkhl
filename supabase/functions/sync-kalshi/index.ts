import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const KALSHI_API = 'https://trading-api.kalshi.com/trade-api/v2';

interface KalshiMarket {
  ticker: string;
  title: string;
  subtitle: string;
  status: string;
  yes_bid: number;
  yes_ask: number;
  no_bid: number;
  no_ask: number;
  last_price: number;
  volume: number;
  volume_24h: number;
  open_interest: number;
  close_time: string;
  result: string;
  category: string;
  series_ticker: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const kalshiApiKey = Deno.env.get('KALSHI_API_KEY');
    const kalshiApiSecret = Deno.env.get('KALSHI_API_SECRET');

    const { mode = 'full', limit = 100 } = await req.json().catch(() => ({}));

    console.log(`Starting Kalshi sync - mode: ${mode}, limit: ${limit}`);

    // Check if API keys are configured
    if (!kalshiApiKey || !kalshiApiSecret) {
      console.log('Kalshi API keys not configured - using demo/public data approach');
      
      // Kalshi has some public data we can access without auth
      // For now, return a message about needing API keys
      return new Response(JSON.stringify({
        success: false,
        error: 'KALSHI_API_KEY and KALSHI_API_SECRET not configured',
        message: 'Please add Kalshi API credentials to sync market data. You can get API keys from https://kalshi.com/api',
        markets_synced: 0
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create Basic auth header
    const authHeader = 'Basic ' + btoa(`${kalshiApiKey}:${kalshiApiSecret}`);

    // Fetch markets from Kalshi API
    const marketsResponse = await fetch(`${KALSHI_API}/markets?limit=${limit}&status=open`, {
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      }
    });

    if (!marketsResponse.ok) {
      const errorText = await marketsResponse.text();
      throw new Error(`Kalshi API error: ${marketsResponse.status} - ${errorText}`);
    }

    const { markets }: { markets: KalshiMarket[] } = await marketsResponse.json();
    console.log(`Fetched ${markets.length} markets from Kalshi`);

    let marketsSynced = 0;
    let outcomesSynced = 0;
    let pricesSynced = 0;
    const errors: string[] = [];

    for (const market of markets) {
      try {
        // Map Kalshi status to our status
        const status = mapKalshiStatus(market.status, market.result);
        const category = mapKalshiCategory(market.category);

        // Calculate mid prices
        const yesPrice = market.last_price || ((market.yes_bid + market.yes_ask) / 2) / 100;
        const noPrice = 1 - yesPrice;

        // Upsert market
        const { data: upsertedMarket, error: marketError } = await supabase
          .from('prediction_markets')
          .upsert({
            platform: 'kalshi',
            platform_market_id: market.ticker,
            title: market.title,
            description: market.subtitle || null,
            category: category,
            status: status,
            resolution_date: market.close_time ? new Date(market.close_time).toISOString() : null,
            total_volume: market.volume || 0,
            open_interest: market.open_interest || 0,
            source_url: `https://kalshi.com/markets/${market.ticker}`,
            metadata: {
              series_ticker: market.series_ticker,
              yes_bid: market.yes_bid,
              yes_ask: market.yes_ask,
              no_bid: market.no_bid,
              no_ask: market.no_ask,
              volume_24h: market.volume_24h
            },
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'platform,platform_market_id'
          })
          .select()
          .single();

        if (marketError) {
          console.error(`Error upserting market ${market.ticker}:`, marketError);
          errors.push(`Market ${market.ticker}: ${marketError.message}`);
          continue;
        }

        marketsSynced++;
        const marketId = upsertedMarket.id;

        // Kalshi markets are binary (Yes/No)
        const outcomes = [
          { title: 'Yes', price: yesPrice, outcomeId: `${market.ticker}_yes` },
          { title: 'No', price: noPrice, outcomeId: `${market.ticker}_no` }
        ];

        for (const outcome of outcomes) {
          const { error: outcomeError } = await supabase
            .from('market_outcomes')
            .upsert({
              market_id: marketId,
              title: outcome.title,
              platform_outcome_id: outcome.outcomeId,
              current_price: outcome.price,
              volume_24h: market.volume_24h || 0,
              open_interest: market.open_interest || 0,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'market_id,title'
            });

          if (outcomeError) {
            errors.push(`Outcome ${outcome.title}: ${outcomeError.message}`);
          } else {
            outcomesSynced++;
          }

          // Insert price history
          const { data: outcomeData } = await supabase
            .from('market_outcomes')
            .select('id')
            .eq('market_id', marketId)
            .eq('title', outcome.title)
            .single();

          if (outcomeData) {
            const { error: priceError } = await supabase
              .from('market_price_history')
              .insert({
                market_id: marketId,
                outcome_id: outcomeData.id,
                price: outcome.price,
                timestamp: new Date().toISOString()
              });

            if (!priceError) {
              pricesSynced++;
            }
          }
        }
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error(`Error processing market ${market.ticker}:`, err);
        errors.push(`Market ${market.ticker}: ${errMsg}`);
      }
    }

    const result = {
      success: true,
      markets_synced: marketsSynced,
      outcomes_synced: outcomesSynced,
      prices_synced: pricesSynced,
      errors: errors.slice(0, 10),
      timestamp: new Date().toISOString()
    };

    console.log('Kalshi sync complete:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Kalshi sync error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: errMsg
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

function mapKalshiStatus(status: string, result: string): string {
  if (result && result !== '') return 'resolved';
  
  const statusMap: Record<string, string> = {
    'open': 'active',
    'closed': 'resolved',
    'settled': 'resolved',
    'halted': 'suspended'
  };
  
  return statusMap[status.toLowerCase()] || 'active';
}

function mapKalshiCategory(category: string): string {
  const categoryMap: Record<string, string> = {
    'Politics': 'politics',
    'Economics': 'finance',
    'Finance': 'finance',
    'Crypto': 'crypto',
    'Climate': 'science',
    'Science': 'science',
    'Tech': 'science',
    'Sports': 'sports',
    'Entertainment': 'entertainment',
    'Culture': 'entertainment'
  };
  
  return categoryMap[category] || 'other';
}
