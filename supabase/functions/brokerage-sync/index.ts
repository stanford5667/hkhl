// Brokerage Sync Edge Function - Plaid Integration
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Plaid configuration
const PLAID_CLIENT_ID = Deno.env.get('PLAID_CLIENT_ID');
const PLAID_SECRET = Deno.env.get('PLAID_SECRET');
const PLAID_ENV = Deno.env.get('PLAID_ENV') || 'sandbox';

const PLAID_BASE_URL = {
  sandbox: 'https://sandbox.plaid.com',
  development: 'https://development.plaid.com',
  production: 'https://production.plaid.com',
}[PLAID_ENV] || 'https://sandbox.plaid.com';

interface PlaidRequest {
  action: 'check-config' | 'create-link-token' | 'exchange-token' | 'sync-positions';
  userId?: string;
  publicToken?: string;
  connectionId?: string;
  portfolioId?: string;
  institutionId?: string;
  accountId?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: PlaidRequest = await req.json();
    const { action } = body;

    // Check if Plaid is configured
    if (action === 'check-config') {
      const configured = !!(PLAID_CLIENT_ID && PLAID_SECRET);
      return new Response(
        JSON.stringify({ configured, env: PLAID_ENV }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate Plaid credentials
    if (!PLAID_CLIENT_ID || !PLAID_SECRET) {
      return new Response(
        JSON.stringify({ error: 'Plaid not configured. Set PLAID_CLIENT_ID and PLAID_SECRET.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    switch (action) {
      case 'create-link-token': {
        const { userId } = body;
        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'userId required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const response = await fetch(`${PLAID_BASE_URL}/link/token/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: PLAID_CLIENT_ID,
            secret: PLAID_SECRET,
            user: { client_user_id: userId },
            client_name: 'Portfolio Manager',
            products: ['investments'],
            country_codes: ['US'],
            language: 'en',
          }),
        });

        const data = await response.json();
        
        if (!response.ok) {
          console.error('Plaid link token error:', data);
          return new Response(
            JSON.stringify({ error: data.error_message || 'Failed to create link token' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ link_token: data.link_token }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'exchange-token': {
        const { userId, publicToken, institutionId } = body;
        
        if (!userId || !publicToken) {
          return new Response(
            JSON.stringify({ error: 'userId and publicToken required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Exchange public token for access token
        const exchangeResponse = await fetch(`${PLAID_BASE_URL}/item/public_token/exchange`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: PLAID_CLIENT_ID,
            secret: PLAID_SECRET,
            public_token: publicToken,
          }),
        });

        const exchangeData = await exchangeResponse.json();
        
        if (!exchangeResponse.ok) {
          console.error('Plaid exchange error:', exchangeData);
          return new Response(
            JSON.stringify({ error: exchangeData.error_message || 'Failed to exchange token' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get institution info
        let institutionName = 'Unknown Institution';
        if (institutionId) {
          try {
            const instResponse = await fetch(`${PLAID_BASE_URL}/institutions/get_by_id`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                client_id: PLAID_CLIENT_ID,
                secret: PLAID_SECRET,
                institution_id: institutionId,
                country_codes: ['US'],
              }),
            });
            const instData = await instResponse.json();
            institutionName = instData.institution?.name || institutionName;
          } catch (err) {
            console.error('Error getting institution:', err);
          }
        }

        // Store connection in database
        // NOTE: In production, encrypt the access_token before storing!
        const { data: connection, error: insertError } = await supabase
          .from('brokerage_connections')
          .insert({
            user_id: userId,
            brokerage_name: institutionName,
            access_token: exchangeData.access_token, // ENCRYPT THIS IN PRODUCTION!
            connection_status: 'connected',
            metadata: {
              item_id: exchangeData.item_id,
              institution_id: institutionId,
            },
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error storing connection:', insertError);
          return new Response(
            JSON.stringify({ error: 'Failed to store connection' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ connectionId: connection.id, institutionName }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'sync-positions': {
        const { connectionId, portfolioId } = body;
        
        if (!connectionId) {
          return new Response(
            JSON.stringify({ error: 'connectionId required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get connection with access token
        const { data: connection, error: connError } = await supabase
          .from('brokerage_connections')
          .select('*')
          .eq('id', connectionId)
          .single();

        if (connError || !connection) {
          return new Response(
            JSON.stringify({ error: 'Connection not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Fetch holdings from Plaid
        const holdingsResponse = await fetch(`${PLAID_BASE_URL}/investments/holdings/get`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: PLAID_CLIENT_ID,
            secret: PLAID_SECRET,
            access_token: connection.access_token,
          }),
        });

        const holdingsData = await holdingsResponse.json();

        if (!holdingsResponse.ok) {
          const errorMsg = holdingsData.error_message || 'Failed to fetch holdings';
          
          // Update connection with error
          await supabase
            .from('brokerage_connections')
            .update({ sync_error: errorMsg })
            .eq('id', connectionId);

          return new Response(
            JSON.stringify({ error: errorMsg }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Map Plaid holdings to our position format
        interface PlaidSecurity {
          security_id: string;
          ticker_symbol?: string;
          name?: string;
          close_price?: number;
          type?: string;
        }
        
        const securities = new Map<string, PlaidSecurity>(
          (holdingsData.securities as PlaidSecurity[] || []).map((s) => [s.security_id, s])
        );

        const positions = (holdingsData.holdings as Array<{
          security_id: string;
          quantity?: number;
          cost_basis?: number;
        }> || []).map((holding) => {
          const security = securities.get(holding.security_id);
          const quantity = holding.quantity || 0;
          const costBasis = holding.cost_basis || 0;
          const currentPrice = security?.close_price || 0;
          const currentValue = quantity * currentPrice;
          const unrealizedGain = currentValue - costBasis;

          return {
            user_id: connection.user_id,
            portfolio_id: portfolioId || null,
            connection_id: connectionId,
            symbol: security?.ticker_symbol || security?.name?.substring(0, 10) || 'UNKNOWN',
            name: security?.name || null,
            quantity,
            cost_basis: costBasis,
            cost_per_share: quantity > 0 ? costBasis / quantity : null,
            current_price: currentPrice,
            current_value: currentValue,
            unrealized_gain: unrealizedGain,
            unrealized_gain_percent: costBasis > 0 ? (unrealizedGain / costBasis) * 100 : null,
            asset_type: mapSecurityType(security?.type || null),
            source: 'brokerage',
            last_price_update: new Date().toISOString(),
          };
        });

        // Delete existing positions from this connection
        await supabase
          .from('synced_positions')
          .delete()
          .eq('connection_id', connectionId);

        // Insert new positions
        if (positions.length > 0) {
          const { error: insertError } = await supabase
            .from('synced_positions')
            .insert(positions);

          if (insertError) {
            console.error('Error inserting positions:', insertError);
            return new Response(
              JSON.stringify({ error: 'Failed to save positions' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }

        // Update connection sync time
        await supabase
          .from('brokerage_connections')
          .update({
            last_sync_at: new Date().toISOString(),
            sync_error: null,
          })
          .eq('id', connectionId);

        return new Response(
          JSON.stringify({ 
            positionCount: positions.length,
            accounts: holdingsData.accounts?.length || 0,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error: unknown) {
    console.error('Brokerage sync error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Map Plaid security types to our asset types
function mapSecurityType(plaidType: string | null): string {
  const typeMap: Record<string, string> = {
    'equity': 'stock',
    'etf': 'etf',
    'mutual fund': 'mutual_fund',
    'fixed income': 'bond',
    'cash': 'cash',
    'derivative': 'option',
    'cryptocurrency': 'crypto',
  };
  return typeMap[plaidType?.toLowerCase() || ''] || 'stock';
}
