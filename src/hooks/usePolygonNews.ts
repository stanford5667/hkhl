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
 * Fetches news from the news_events table.
 * This is REAL data from the database - no mocks.
 */
export function usePolygonNews(ticker?: string, limit: number = 20) {
  return useQuery({
    queryKey: ['polygon-news', ticker, limit],
    queryFn: async (): Promise<PolygonNewsArticle[]> => {
      // Fetch from news_events table
      const { data, error } = await supabase
        .from('news_events')
        .select('*')
        .order('published_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[usePolygonNews] Supabase error:', error);
        return [];
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Transform news_events to PolygonNewsArticle format
      return data.map((item) => {
        const rawConcepts = item.raw_concepts as Record<string, unknown> | null;
        const tickers: string[] = Array.isArray(rawConcepts?.tickers) 
          ? (rawConcepts.tickers as string[]) 
          : [];
        
        return {
          id: item.id,
          title: item.title,
          description: item.summary || '',
          published_utc: item.published_at,
          article_url: item.url || '#',
          publisher: {
            name: item.source_id || 'Market News',
          },
          tickers,
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
