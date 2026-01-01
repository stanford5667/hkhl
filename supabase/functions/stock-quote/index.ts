import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ticker } = await req.json();

    if (!ticker) {
      return new Response(
        JSON.stringify({ success: false, error: 'Ticker is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching stock quote for: ${ticker}`);

    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    if (!PERPLEXITY_API_KEY) {
      console.error('PERPLEXITY_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'API not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const prompt = `Get the current stock quote data for ${ticker}. I need the following exact data points in JSON format:
- Current stock price (number)
- Price change today in dollars (number, can be negative)
- Price change percent today (number, can be negative)
- Today's open price (number)
- Today's high price (number)
- Today's low price (number)
- Trading volume (formatted string like "45.2M" or "1.2B")
- Market capitalization (formatted string like "2.8T" or "450B")
- Full company name

Also provide approximate intraday price data for a simple chart showing price movement throughout today (about 8-10 data points from market open to current time, with time labels like "9:30", "10:00", etc.).

Return ONLY valid JSON in this exact format, no markdown:
{
  "price": 150.25,
  "change": 2.50,
  "changePercent": 1.69,
  "open": 148.00,
  "high": 151.50,
  "low": 147.80,
  "volume": "45.2M",
  "marketCap": "2.4T",
  "companyName": "Apple Inc.",
  "chartData": [
    {"time": "9:30", "price": 148.00},
    {"time": "10:00", "price": 149.20},
    {"time": "10:30", "price": 148.80},
    {"time": "11:00", "price": 150.10},
    {"time": "11:30", "price": 149.90},
    {"time": "12:00", "price": 150.50},
    {"time": "12:30", "price": 150.25}
  ]
}`;

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { 
            role: 'system', 
            content: 'You are a financial data API that returns accurate, real-time stock data in valid JSON format only. Never include markdown or explanations, only the JSON object.'
          },
          { role: 'user', content: prompt }
        ],
        search_recency_filter: 'day',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch stock data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    // Parse JSON from response
    let quote;
    try {
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```json')) cleanContent = cleanContent.slice(7);
      if (cleanContent.startsWith('```')) cleanContent = cleanContent.slice(3);
      if (cleanContent.endsWith('```')) cleanContent = cleanContent.slice(0, -3);
      quote = JSON.parse(cleanContent.trim());
    } catch (e) {
      console.error('Parse error:', e, 'Content:', content);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to parse stock data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, quote }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Stock quote error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to fetch stock quote' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
