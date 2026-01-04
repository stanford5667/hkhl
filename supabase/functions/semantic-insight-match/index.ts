import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tickers, exclude_ids = [], similarity_threshold = 0.7, limit = 50 } = await req.json();

    if (!tickers || !Array.isArray(tickers) || tickers.length === 0) {
      return new Response(
        JSON.stringify({ error: 'tickers array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Generate embeddings for user's tickers to use as query vectors
    const tickerEmbeddings: number[][] = [];
    
    if (openaiApiKey) {
      for (const ticker of tickers.slice(0, 5)) { // Limit to 5 tickers for performance
        try {
          const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openaiApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'text-embedding-3-small',
              input: `Stock ticker ${ticker} and related market movements, supply chain, competitors, and industry trends`
            }),
          });

          if (embeddingResponse.ok) {
            const embeddingData = await embeddingResponse.json();
            tickerEmbeddings.push(embeddingData.data[0].embedding);
          }
        } catch (err) {
          console.error(`Error generating embedding for ${ticker}:`, err);
        }
      }
    }

    let insights: any[] = [];

    if (tickerEmbeddings.length > 0) {
      // Use vector similarity search via RPC if embeddings available
      // First, try to find insights with similar correlation vectors
      for (const embedding of tickerEmbeddings) {
        try {
          const { data, error } = await supabase.rpc('match_insights_by_vector', {
            query_embedding: embedding,
            match_threshold: similarity_threshold,
            match_count: Math.ceil(limit / tickerEmbeddings.length)
          });

          if (!error && data) {
            insights.push(...data.map((d: any) => ({ ...d, similarity: d.similarity })));
          }
        } catch (err) {
          console.log('Vector search RPC not available, falling back to text search');
        }
      }
    }

    // Fallback: text-based similarity using thesis content
    if (insights.length === 0) {
      // Search for insights mentioning related terms
      const searchTerms = tickers.flatMap(ticker => [
        ticker,
        ticker.toLowerCase(),
        // Add common related terms
        ...(ticker === 'NVDA' ? ['nvidia', 'gpu', 'ai chips', 'tsmc', 'semiconductor'] : []),
        ...(ticker === 'AAPL' ? ['apple', 'iphone', 'ios', 'foxconn', 'qualcomm'] : []),
        ...(ticker === 'TSLA' ? ['tesla', 'ev', 'electric vehicle', 'lithium', 'panasonic'] : []),
        ...(ticker === 'MSFT' ? ['microsoft', 'azure', 'openai', 'cloud', 'windows'] : []),
        ...(ticker === 'GOOGL' ? ['google', 'alphabet', 'android', 'youtube', 'search'] : []),
        ...(ticker === 'AMZN' ? ['amazon', 'aws', 'ecommerce', 'prime', 'retail'] : []),
      ]);

      // Build OR query for thesis containing any of the search terms
      let query = supabase
        .from('ai_insights')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      // Add text search filter
      const textFilters = searchTerms
        .slice(0, 20) // Limit terms for query size
        .map(term => `thesis.ilike.%${term}%`)
        .join(',');
      
      if (textFilters) {
        query = query.or(textFilters);
      }

      // Exclude already matched insights
      if (exclude_ids.length > 0) {
        query = query.not('id', 'in', `(${exclude_ids.join(',')})`);
      }

      const { data, error } = await query;

      if (!error && data) {
        insights = data.map(d => ({ ...d, similarity: 0.6 })); // Assign moderate similarity for text matches
      }
    }

    // Remove duplicates and excluded IDs
    const uniqueInsights = insights
      .filter((insight, index, self) => 
        self.findIndex(i => i.id === insight.id) === index &&
        !exclude_ids.includes(insight.id)
      )
      .slice(0, limit);

    console.log(`Found ${uniqueInsights.length} semantic matches for tickers: ${tickers.join(', ')}`);

    return new Response(
      JSON.stringify({ insights: uniqueInsights }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in semantic-insight-match:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
