import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import OpenAI from "https://esm.sh/openai@4.20.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are a Senior Hedge Fund Manager at a top-tier Event Driven fund. Your task is to find the ALPHA in the provided news event.

Identify Direct Impact: Which ticker symbol is most affected?

Second-Order Effects: If this event happens, which non-obvious asset moves? (e.g., a strike in Chile moves Copper, which moves Freeport-McMoRan).

Confidence Score: Rate 1-100 based on the diversity of sources reporting the event.

Output: Return strictly valid JSON: { "primary_ticker": "string", "thesis": "string", "direction": "bullish|bearish|neutral", "hidden_correlation": "string", "confidence": number }`;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const openai = new OpenAI({ apiKey: openaiApiKey });

    // Get the news event from request body or fetch unprocessed events
    const body = await req.json().catch(() => ({}));
    let newsEvents: any[] = [];

    if (body.news_event_id) {
      // Process a specific news event
      const { data, error } = await supabase
        .from('news_events')
        .select('*')
        .eq('id', body.news_event_id)
        .single();

      if (error) throw new Error(`Failed to fetch news event: ${error.message}`);
      if (data) newsEvents = [data];
    } else if (body.batch) {
      // Process batch of unanalyzed news events
      const { data, error } = await supabase
        .from('news_events')
        .select('*')
        .not('id', 'in', `(SELECT news_event_id FROM ai_insights)`)
        .order('published_at', { ascending: false })
        .limit(body.limit || 10);

      if (error) throw new Error(`Failed to fetch news events: ${error.message}`);
      newsEvents = data || [];
    } else {
      // Default: get the most recent unprocessed event
      const { data, error } = await supabase
        .from('news_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw new Error(`Failed to fetch news events: ${error.message}`);
      newsEvents = data || [];
    }

    if (newsEvents.length === 0) {
      return new Response(JSON.stringify({ 
        message: 'No news events to process',
        processed: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing ${newsEvents.length} news events...`);

    const results: any[] = [];

    for (const newsEvent of newsEvents) {
      try {
        console.log(`Analyzing event: ${newsEvent.title}`);

        // Build the user prompt with news event data
        const userPrompt = `Analyze this news event for trading opportunities:

TITLE: ${newsEvent.title}

SUMMARY: ${newsEvent.summary || 'No summary available'}

SOURCE COUNT: ${newsEvent.raw_concepts?.sourceCount || 'Unknown'} sources reporting

CONCEPTS: ${JSON.stringify(newsEvent.raw_concepts?.concepts || [], null, 2)}

Published: ${newsEvent.published_at || 'Unknown'}`;

        // Call GPT-4o for analysis
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt }
          ],
          response_format: { type: 'json_object' },
          max_tokens: 500,
          temperature: 0.3,
        });

        const analysisText = completion.choices[0]?.message?.content;
        if (!analysisText) {
          console.error(`No response from GPT-4o for event ${newsEvent.id}`);
          continue;
        }

        console.log(`GPT-4o analysis for ${newsEvent.id}:`, analysisText);

        // Parse the JSON response
        let analysis: {
          primary_ticker: string;
          thesis: string;
          direction: string;
          hidden_correlation: string;
          confidence: number;
        };

        try {
          analysis = JSON.parse(analysisText);
        } catch (parseError) {
          console.error(`Failed to parse GPT-4o response: ${parseError}`);
          continue;
        }

        // Generate embedding for the thesis using text-embedding-3-small
        const embeddingResponse = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: analysis.thesis,
        });

        const embedding = embeddingResponse.data[0]?.embedding;
        if (!embedding) {
          console.error(`Failed to generate embedding for event ${newsEvent.id}`);
        }

        // Map direction to sentiment enum
        const sentimentMap: Record<string, string> = {
          'bullish': 'bullish',
          'bearish': 'bearish',
          'neutral': 'neutral',
        };
        const sentiment = sentimentMap[analysis.direction?.toLowerCase()] || 'neutral';

        // Build the insight record
        const insightRecord: any = {
          news_event_id: newsEvent.id,
          impact_score: Math.round(analysis.confidence),
          sentiment: sentiment,
          thesis: analysis.thesis,
          asset_focus: analysis.primary_ticker,
          related_tickers: [analysis.primary_ticker],
          confidence: analysis.confidence / 100,
          model_version: 'gpt-4o',
        };

        // Add embedding if available (format as string for pgvector)
        if (embedding) {
          insightRecord.correlation_vector = `[${embedding.join(',')}]`;
        }

        // Upsert to ai_insights
        const { data: insertedInsight, error: insertError } = await supabase
          .from('ai_insights')
          .upsert(insightRecord, { 
            onConflict: 'news_event_id',
            ignoreDuplicates: false 
          })
          .select()
          .single();

        if (insertError) {
          console.error(`Failed to insert insight: ${insertError.message}`);
          continue;
        }

        console.log(`Successfully processed event ${newsEvent.id}, insight ID: ${insertedInsight.id}`);

        results.push({
          news_event_id: newsEvent.id,
          insight_id: insertedInsight.id,
          primary_ticker: analysis.primary_ticker,
          direction: analysis.direction,
          confidence: analysis.confidence,
          hidden_correlation: analysis.hidden_correlation,
          has_embedding: !!embedding,
        });

      } catch (eventError) {
        console.error(`Error processing event ${newsEvent.id}:`, eventError);
        results.push({
          news_event_id: newsEvent.id,
          error: eventError instanceof Error ? eventError.message : 'Unknown error',
        });
      }
    }

    return new Response(JSON.stringify({
      message: `Processed ${results.length} news events`,
      processed: results.filter(r => !r.error).length,
      errors: results.filter(r => r.error).length,
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('analyze-alpha error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
