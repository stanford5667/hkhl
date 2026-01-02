import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const FINNHUB_API_KEY = Deno.env.get('VITE_FINNHUB_API_KEY');

    if (!FINNHUB_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Finnhub API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Accept params via JSON body (preferred) or query string (fallback)
    let symbol: string | null = null;
    let resolution: string | null = null;
    let from: string | null = null;
    let to: string | null = null;

    const contentType = req.headers.get('content-type') || '';
    if (req.method !== 'GET' && contentType.includes('application/json')) {
      const body = await req.json().catch(() => null);
      symbol = body?.symbol ?? null;
      resolution = body?.resolution ?? null;
      from = body?.from != null ? String(body.from) : null;
      to = body?.to != null ? String(body.to) : null;
    }

    if (!symbol) {
      const url = new URL(req.url);
      symbol = url.searchParams.get('symbol');
      resolution = resolution ?? url.searchParams.get('resolution');
      from = from ?? url.searchParams.get('from');
      to = to ?? url.searchParams.get('to');
    }

    resolution = resolution || 'D';

    if (!symbol) {
      return new Response(
        JSON.stringify({ error: 'Symbol is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!from || !to) {
      return new Response(
        JSON.stringify({ error: 'From and to timestamps are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const finnhubUrl = `https://finnhub.io/api/v1/stock/candle?symbol=${symbol.toUpperCase()}&resolution=${resolution}&from=${from}&to=${to}&token=${FINNHUB_API_KEY}`;

    console.log(`[finnhub-candles] Fetching candles for ${symbol} (${resolution})`);

    const response = await fetch(finnhubUrl);

    if (!response.ok) {
      const details = await response.text().catch(() => '');
      console.error(`[finnhub-candles] Finnhub API error: ${response.status}`);
      return new Response(
        JSON.stringify({ error: 'Finnhub API error', status: response.status, details }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[finnhub-candles] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
