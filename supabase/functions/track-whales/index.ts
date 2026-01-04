import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Polymarket CTF Exchange contract on Polygon
const POLYMARKET_CTF_EXCHANGE = '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8D8982D';
const USDC_CONTRACT = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'; // USDC on Polygon

interface WhaleTransaction {
  wallet_address: string;
  transaction_hash: string;
  transaction_type: 'buy' | 'sell';
  market_id?: string;
  amount_usd: number;
  outcome_tokens: number;
  price_per_token: number;
  block_number: number;
  block_timestamp: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const alchemyApiKey = Deno.env.get('ALCHEMY_API_KEY');
    const quicknodeApiKey = Deno.env.get('QUICKNODE_API_KEY');

    const { mode = 'recent', min_amount_usd = 10000 } = await req.json().catch(() => ({}));

    console.log(`Starting whale tracking - mode: ${mode}, min_amount: $${min_amount_usd}`);

    // Check if blockchain RPC is configured
    if (!alchemyApiKey && !quicknodeApiKey) {
      console.log('No blockchain RPC configured - returning mock whale data for demo');
      
      // Generate realistic mock whale data for demonstration
      const mockWhales = await generateMockWhaleData(supabase);
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Using demo data - configure ALCHEMY_API_KEY or QUICKNODE_API_KEY for real blockchain tracking',
        transactions_found: mockWhales.length,
        transactions: mockWhales,
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Build RPC URL
    const rpcUrl = alchemyApiKey 
      ? `https://polygon-mainnet.g.alchemy.com/v2/${alchemyApiKey}`
      : `https://polygon-mainnet.quiknode.pro/${quicknodeApiKey}`;

    console.log('Using RPC:', rpcUrl.replace(/\/[^\/]+$/, '/***'));

    // Get recent blocks
    const blockNumberRes = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_blockNumber',
        params: []
      })
    });

    const { result: latestBlockHex } = await blockNumberRes.json();
    const latestBlock = parseInt(latestBlockHex, 16);
    const fromBlock = latestBlock - 1000; // Last ~30 minutes

    console.log(`Scanning blocks ${fromBlock} to ${latestBlock}`);

    // Get logs for Polymarket CTF Exchange
    const logsRes = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'eth_getLogs',
        params: [{
          address: POLYMARKET_CTF_EXCHANGE,
          fromBlock: '0x' + fromBlock.toString(16),
          toBlock: 'latest',
          // OrderFilled event topic
          topics: ['0x3a3d76847a5c3a7c8fbb3a7f1f35e07c28a3c7f2e9f9b1a7d4c2e5f6a8b9c0d1']
        }]
      })
    });

    const { result: logs } = await logsRes.json();
    console.log(`Found ${logs?.length || 0} exchange events`);

    const transactions: WhaleTransaction[] = [];

    for (const log of logs || []) {
      try {
        // Decode log data (simplified - real implementation would parse ABI)
        const txHash = log.transactionHash;
        const blockNumber = parseInt(log.blockNumber, 16);
        
        // Get transaction details
        const txRes = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 3,
            method: 'eth_getTransactionReceipt',
            params: [txHash]
          })
        });

        const { result: txReceipt } = await txRes.json();
        if (!txReceipt) continue;

        // Look for USDC transfers to estimate trade size
        const usdcTransfers = txReceipt.logs?.filter((l: any) => 
          l.address.toLowerCase() === USDC_CONTRACT.toLowerCase()
        ) || [];

        let totalUsdValue = 0;
        for (const transfer of usdcTransfers) {
          // ERC20 Transfer has value in data
          if (transfer.data && transfer.data.length >= 66) {
            const value = parseInt(transfer.data.slice(0, 66), 16);
            totalUsdValue += value / 1e6; // USDC has 6 decimals
          }
        }

        // Only track whale-sized transactions
        if (totalUsdValue >= min_amount_usd) {
          transactions.push({
            wallet_address: txReceipt.from,
            transaction_hash: txHash,
            transaction_type: 'buy', // Would need more analysis to determine
            amount_usd: totalUsdValue,
            outcome_tokens: 0, // Would need to decode from logs
            price_per_token: 0,
            block_number: blockNumber,
            block_timestamp: new Date().toISOString() // Would get from block
          });
        }
      } catch (err) {
        console.warn('Error processing log:', err);
      }
    }

    console.log(`Found ${transactions.length} whale transactions`);

    // Store transactions in database
    let inserted = 0;
    for (const tx of transactions) {
      // First, ensure wallet exists
      await supabase
        .from('whale_wallets')
        .upsert({
          wallet_address: tx.wallet_address,
          first_seen: new Date().toISOString(),
          last_active: new Date().toISOString()
        }, {
          onConflict: 'wallet_address'
        });

      // Get wallet id
      const { data: wallet } = await supabase
        .from('whale_wallets')
        .select('id')
        .eq('wallet_address', tx.wallet_address)
        .single();

      if (wallet) {
        // Check if transaction already exists
        const { data: existing } = await supabase
          .from('whale_transactions')
          .select('id')
          .eq('transaction_hash', tx.transaction_hash)
          .single();

        if (!existing) {
          await supabase
            .from('whale_transactions')
            .insert({
              wallet_id: wallet.id,
              transaction_hash: tx.transaction_hash,
              transaction_type: tx.transaction_type,
              amount_usd: tx.amount_usd,
              outcome_tokens: tx.outcome_tokens,
              price_per_token: tx.price_per_token,
              block_number: tx.block_number,
              block_timestamp: tx.block_timestamp
            });
          inserted++;
        }
      }
    }

    const result = {
      success: true,
      blocks_scanned: latestBlock - fromBlock,
      transactions_found: transactions.length,
      transactions_inserted: inserted,
      transactions: transactions.slice(0, 20),
      timestamp: new Date().toISOString()
    };

    console.log('Whale tracking complete:', { found: transactions.length, inserted });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Whale tracking error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: errMsg
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function generateMockWhaleData(supabase: any) {
  // Generate realistic mock whale transactions for demo purposes
  const mockWallets = [
    { address: '0x1234...5678', label: 'Smart Money Alpha', win_rate: 0.72 },
    { address: '0xabcd...efgh', label: 'Polymarket Whale', win_rate: 0.68 },
    { address: '0x9876...5432', label: 'Crypto VC Fund', win_rate: 0.81 }
  ];

  const mockTransactions = [];
  const now = Date.now();

  for (const wallet of mockWallets) {
    // Insert/update wallet
    await supabase
      .from('whale_wallets')
      .upsert({
        wallet_address: wallet.address,
        label: wallet.label,
        total_pnl: Math.random() * 500000 + 50000,
        win_rate: wallet.win_rate,
        total_trades: Math.floor(Math.random() * 200 + 50),
        first_seen: new Date(now - 90 * 24 * 60 * 60 * 1000).toISOString(),
        last_active: new Date().toISOString(),
        is_tracked: true
      }, {
        onConflict: 'wallet_address'
      });

    // Generate recent transactions
    for (let i = 0; i < 3; i++) {
      const txTime = new Date(now - Math.random() * 24 * 60 * 60 * 1000);
      mockTransactions.push({
        wallet_address: wallet.address,
        wallet_label: wallet.label,
        amount_usd: Math.floor(Math.random() * 90000 + 10000),
        transaction_type: Math.random() > 0.5 ? 'buy' : 'sell',
        timestamp: txTime.toISOString()
      });
    }
  }

  return mockTransactions;
}
