import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PolygonNewsArticle {
  id: string;
  title: string;
  description: string;
  published_utc: string;
  article_url: string;
  image_url?: string;
  publisher: {
    name: string;
    logo_url?: string;
    favicon_url?: string;
  };
  tickers: string[];
  keywords?: string[];
  insights?: {
    ticker: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    sentiment_reasoning?: string;
  }[];
}

/**
 * Fetches news from the real_world_events table.
 * This is REAL data from the database - no mocks.
 */
export function usePolygonNews(ticker?: string, limit: number = 20) {
  return useQuery({
    queryKey: ['polygon-news', ticker, limit],
    queryFn: async (): Promise<PolygonNewsArticle[]> => {
      // Fetch from real_world_events table (has actual data)
      const { data, error } = await supabase
        .from('real_world_events')
        .select('id, title, description, source, source_url, category, detected_at, entities, related_markets')
        .order('detected_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[usePolygonNews] Supabase error:', error);
        return [];
      }

      if (!data || data.length === 0) {
        console.log('[usePolygonNews] No data from real_world_events');
        return [];
      }

      // Transform real_world_events to PolygonNewsArticle format
      return data.map((item) => {
        // Extract tickers from entities or related_markets
        const entities = item.entities as string[] | null;
        const relatedMarkets = item.related_markets as string[] | null;
        const tickers: string[] = relatedMarkets || entities?.filter(e => /^[A-Z]{1,5}$/.test(e)) || [];
        
        return {
          id: item.id,
          title: item.title,
          description: item.description || '',
          published_utc: item.detected_at,
          article_url: item.source_url || '#',
          publisher: {
            name: item.source || item.category || 'Market News',
          },
          tickers,
          keywords: [item.category].filter(Boolean) as string[],
          insights: tickers.map((t: string) => ({
            ticker: t,
            sentiment: 'neutral' as const,
          })),
        };
      });
    },
    staleTime: 60000, // 1 minute
    refetchInterval: 120000, // Refetch every 2 minutes
  });
}

export function formatNewsTime(dateString: string): string {
  const now = new Date();
  const published = new Date(dateString);
  const diffMs = now.getTime() - published.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;
  return published.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
