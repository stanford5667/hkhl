import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Google News RSS feeds (no API key required)
const RSS_FEEDS = [
  { url: 'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx6TVdZU0FtVnVHZ0pWVXlnQVAB', category: 'politics', name: 'US Politics' },
  { url: 'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGRqTVhZU0FtVnVHZ0pWVXlnQVAB', category: 'finance', name: 'Business' },
  { url: 'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNREpxYW5RU0FtVnVHZ0pWVXlnQVAB', category: 'science', name: 'Science' },
  { url: 'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRFp0Y1RjU0FtVnVHZ0pWVXlnQVAB', category: 'entertainment', name: 'Entertainment' },
  { url: 'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRFp1ZEdvU0FtVnVHZ0pWVXlnQVAB', category: 'sports', name: 'Sports' },
  { url: 'https://news.google.com/rss/search?q=cryptocurrency+OR+bitcoin+OR+ethereum&hl=en-US&gl=US&ceid=US:en', category: 'crypto', name: 'Cryptocurrency' },
  { url: 'https://news.google.com/rss/search?q=prediction+market+OR+polymarket+OR+kalshi&hl=en-US&gl=US&ceid=US:en', category: 'prediction_markets', name: 'Prediction Markets' },
  { url: 'https://news.google.com/rss/search?q=election+2024+OR+trump+OR+biden&hl=en-US&gl=US&ceid=US:en', category: 'politics', name: 'Election 2024' },
];

interface RSSItem {
  title: string;
  link: string;
  pubDate: string;
  description?: string;
  source?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { categories } = await req.json().catch(() => ({ categories: null }));

    console.log('Starting Google News RSS ingestion...');

    let totalArticles = 0;
    let insertedArticles = 0;
    const errors: string[] = [];

    const feedsToProcess = categories 
      ? RSS_FEEDS.filter(f => categories.includes(f.category))
      : RSS_FEEDS;

    for (const feed of feedsToProcess) {
      try {
        console.log(`Fetching feed: ${feed.name}`);
        
        const response = await fetch(feed.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)'
          }
        });

        if (!response.ok) {
          errors.push(`Failed to fetch ${feed.name}: ${response.status}`);
          continue;
        }

        const xml = await response.text();
        const items = parseRSSItems(xml);
        
        console.log(`Parsed ${items.length} items from ${feed.name}`);
        totalArticles += items.length;

        for (const item of items) {
          try {
            // Generate a content hash for deduplication
            const contentHash = await generateHash(item.title + item.link);
            
            // Check if article already exists
            const { data: existing } = await supabase
              .from('real_world_events')
              .select('id')
              .eq('source_url', item.link)
              .single();

            if (existing) continue;

            // Extract entities from title (simple extraction)
            const entities = extractEntities(item.title);

            // Insert the event
            const { error: insertError } = await supabase
              .from('real_world_events')
              .insert({
                title: item.title.slice(0, 500),
                description: item.description?.slice(0, 2000) || null,
                source_name: item.source || 'Google News',
                source_url: item.link,
                event_type: 'news',
                category: feed.category,
                published_at: new Date(item.pubDate).toISOString(),
                detected_at: new Date().toISOString(),
                entities: entities,
                metadata: {
                  feed_name: feed.name,
                  content_hash: contentHash
                }
              });

            if (insertError) {
              console.error('Insert error:', insertError);
            } else {
              insertedArticles++;
            }
          } catch (itemError) {
            console.warn('Error processing item:', itemError);
          }
        }
      } catch (feedError: unknown) {
        const errMsg = feedError instanceof Error ? feedError.message : 'Unknown error';
        console.error(`Error processing feed ${feed.name}:`, feedError);
        errors.push(`${feed.name}: ${errMsg}`);
      }
    }

    const result = {
      success: true,
      feeds_processed: feedsToProcess.length,
      articles_found: totalArticles,
      articles_inserted: insertedArticles,
      errors: errors.slice(0, 5),
      timestamp: new Date().toISOString()
    };

    console.log('Google News ingestion complete:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Google News ingestion error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: errMsg
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

function parseRSSItems(xml: string): RSSItem[] {
  const items: RSSItem[] = [];
  
  // Simple XML parsing (regex-based for RSS)
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  
  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];
    
    const title = extractTag(itemXml, 'title');
    const link = extractTag(itemXml, 'link');
    const pubDate = extractTag(itemXml, 'pubDate');
    const description = extractTag(itemXml, 'description');
    const source = extractTag(itemXml, 'source');
    
    if (title && link && pubDate) {
      items.push({
        title: decodeHTMLEntities(title),
        link,
        pubDate,
        description: description ? decodeHTMLEntities(description) : undefined,
        source: source ? decodeHTMLEntities(source) : undefined
      });
    }
  }
  
  return items;
}

function extractTag(xml: string, tag: string): string | null {
  // Handle CDATA sections
  const cdataRegex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`, 'i');
  const cdataMatch = xml.match(cdataRegex);
  if (cdataMatch) return cdataMatch[1].trim();
  
  // Handle regular tags
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]+>/g, ''); // Strip HTML tags
}

function extractEntities(text: string): string[] {
  const entities: string[] = [];
  
  // Extract capitalized words that might be entities
  const words = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g) || [];
  
  // Common non-entity words to filter out
  const stopWords = new Set(['The', 'This', 'That', 'These', 'Those', 'What', 'When', 'Where', 'Why', 'How', 'Will', 'Would', 'Could', 'Should', 'New', 'First', 'Last']);
  
  for (const word of words) {
    if (!stopWords.has(word) && word.length > 2) {
      entities.push(word);
    }
  }
  
  return [...new Set(entities)].slice(0, 10);
}

async function generateHash(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}
