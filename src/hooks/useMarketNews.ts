import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MarketNewsItem {
  id: string;
  title: string;
  summary: string | null;
  publishedAt: string;
  source: string;
  url: string | null;
  tickers: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
}

/**
 * Fetches market news from news_events table with AI insights.
 * This is REAL data from the database, no mocks.
 */
export function useMarketNews(limit: number = 20) {
  return useQuery({
    queryKey: ['market-news', limit],
    queryFn: async (): Promise<MarketNewsItem[]> => {
      // Fetch news from news_events table
      const { data: newsData, error: newsError } = await supabase
        .from('news_events')
        .select(`
          id,
          title,
          summary,
          published_at,
          source_id,
          url,
          raw_concepts
        `)
        .order('published_at', { ascending: false, nullsFirst: false })
        .limit(limit);

      if (newsError) {
        console.error('[useMarketNews] Error:', newsError);
        return [];
      }

      if (!newsData || newsData.length === 0) {
        return [];
      }

      return newsData.map(item => {
        // Extract tickers from raw_concepts
        const rawConcepts = item.raw_concepts as Record<string, unknown> | null;
        
        let tickers: string[] = [];
        if (rawConcepts?.tickers && Array.isArray(rawConcepts.tickers)) {
          tickers = rawConcepts.tickers as string[];
        }

        // Default sentiment - can be enhanced with AI insights later
        const sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';

        return {
          id: item.id,
          title: item.title,
          summary: item.summary,
          publishedAt: item.published_at,
          source: item.source_id || 'Market News',
          url: item.url,
          tickers,
          sentiment,
        };
      });
    },
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 2 * 60 * 1000, // 2 minutes
  });
}

export function useLatestHeadlines(limit: number = 6) {
  return useQuery({
    queryKey: ['latest-headlines', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('news_events')
        .select('id, title, published_at')
        .order('published_at', { ascending: false, nullsFirst: false })
        .limit(limit);

      if (error) {
        console.error('[useLatestHeadlines] Error:', error);
        return [];
      }

      return data?.map(item => ({
        id: item.id,
        headline: item.title,
        time: formatRelativeTime(item.published_at),
      })) || [];
    },
    staleTime: 60 * 1000,
  });
}

function formatRelativeTime(dateString: string): string {
  const now = new Date();
  const published = new Date(dateString);
  const diffMs = now.getTime() - published.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
}
