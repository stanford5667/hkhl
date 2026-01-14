// Brokerage Sync Edge Function - Plaid Integration
// Secured with JWT authentication and encrypted token storage
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAuthenticatedUser, unauthorizedResponse, forbiddenResponse } from "../_shared/auth.ts";
import { encrypt, decrypt } from "../_shared/encryption.ts";

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
    const body: PlaidRequest = await req.json();
    const { action } = body;

    // Check config doesn't require auth
    if (action === 'check-config') {
      const configured = !!(PLAID_CLIENT_ID && PLAID_SECRET);
      return new Response(
        JSON.stringify({ configured, env: PLAID_ENV }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // All other actions require authentication
    const { user, error: authError } = await getAuthenticatedUser(req);
    if (authError || !user) {
      return unauthorizedResponse(authError || 'Authentication required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate Plaid credentials
    if (!PLAID_CLIENT_ID || !PLAID_SECRET) {
      return new Response(
        JSON.stringify({ error: 'Plaid not configured. Set PLAID_CLIENT_ID and PLAID_SECRET.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    switch (action) {
      case 'create-link-token': {
        // Use authenticated user's ID instead of trusting client input
        const response = await fetch(`${PLAID_BASE_URL}/link/token/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: PLAID_CLIENT_ID,
            secret: PLAID_SECRET,
            user: { client_user_id: user.id },
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
        const { publicToken, institutionId } = body;
        
        if (!publicToken) {
          return new Response(
            JSON.stringify({ error: 'publicToken required' }),
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

        // SECURITY: Encrypt the access token before storing
        let encryptedToken: string | null = null;
        try {
          encryptedToken = await encrypt(exchangeData.access_token);
        } catch (encryptError) {
          console.error('Failed to encrypt token:', encryptError);
          return new Response(
            JSON.stringify({ error: 'Failed to securely store connection. Contact support.' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Store connection with encrypted token
        const { data: connection, error: insertError } = await supabase
          .from('brokerage_connections')
          .insert({
            user_id: user.id, // Use authenticated user ID
            brokerage_name: institutionName,
            access_token: encryptedToken, // Encrypted token
            connection_status: 'connected',
            metadata: {
              item_id: exchangeData.item_id,
              institution_id: institutionId,
              encrypted: true, // Flag to indicate token is encrypted
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

        // Get connection - SECURITY: Verify ownership
        const { data: connection, error: connError } = await supabase
          .from('brokerage_connections')
          .select('*')
          .eq('id', connectionId)
          .eq('user_id', user.id) // Ensure user owns this connection
          .single();

        if (connError || !connection) {
          // Don't reveal if connection exists but belongs to another user
          return new Response(
            JSON.stringify({ error: 'Connection not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // SECURITY: Decrypt the access token and auto-migrate legacy tokens
        let accessToken: string;
        const isEncrypted = connection.metadata?.encrypted === true;
        
        try {
          if (isEncrypted) {
            accessToken = await decrypt(connection.access_token);
          } else {
            // Legacy unencrypted token - use it but immediately attempt migration
            accessToken = connection.access_token;
            console.warn('Found unencrypted legacy token for connection:', connectionId, '- attempting auto-migration');
            
            // Auto-migrate: encrypt and update the token
            try {
              const encryptedToken = await encrypt(accessToken);
              const updatedMetadata = {
                ...(connection.metadata || {}),
                encrypted: true,
                migrated_at: new Date().toISOString(),
                migration_source: 'auto_sync'
              };
              
              const { error: migrationError } = await supabase
                .from('brokerage_connections')
                .update({
                  access_token: encryptedToken,
                  metadata: updatedMetadata
                })
                .eq('id', connectionId)
                .eq('user_id', user.id);
              
              if (migrationError) {
                console.error('Failed to migrate legacy token:', migrationError);
                // Continue with unencrypted token for this request, but log the issue
              } else {
                console.log('Successfully migrated legacy token to encrypted storage for connection:', connectionId);
              }
            } catch (migrationEncryptError) {
              // Log but don't fail the request - we can still use the plaintext token
              console.error('Encryption failed during migration attempt:', migrationEncryptError);
            }
          }
        } catch (decryptError) {
          console.error('Failed to decrypt token:', decryptError);
          return new Response(
            JSON.stringify({ error: 'Failed to access connection credentials' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Fetch holdings from Plaid
        const holdingsResponse = await fetch(`${PLAID_BASE_URL}/investments/holdings/get`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: PLAID_CLIENT_ID,
            secret: PLAID_SECRET,
            access_token: accessToken,
          }),
        });

        const holdingsData = await holdingsResponse.json();

        if (!holdingsResponse.ok) {
          const errorMsg = holdingsData.error_message || 'Failed to fetch holdings';
          
          // Update connection with error
          await supabase
            .from('brokerage_connections')
            .update({ sync_error: errorMsg })
            .eq('id', connectionId)
            .eq('user_id', user.id); // Double-check ownership

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
            user_id: user.id, // Use authenticated user ID
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

        // Delete existing positions from this connection (only for this user)
        await supabase
          .from('synced_positions')
          .delete()
          .eq('connection_id', connectionId)
          .eq('user_id', user.id);

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
          .eq('id', connectionId)
          .eq('user_id', user.id);

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
