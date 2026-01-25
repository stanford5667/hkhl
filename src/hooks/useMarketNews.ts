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
 * Fetches market news from real_world_events table with AI insights.
 * This is REAL data from the database, no mocks.
 */
export function useMarketNews(limit: number = 20) {
  return useQuery({
    queryKey: ['market-news', limit],
    queryFn: async (): Promise<MarketNewsItem[]> => {
      // Fetch news from real_world_events table (has actual data)
      const { data: newsData, error: newsError } = await supabase
        .from('real_world_events')
        .select(`
          id,
          title,
          description,
          detected_at,
          source,
          source_url,
          entities,
          related_markets,
          sentiment_score
        `)
        .order('detected_at', { ascending: false, nullsFirst: false })
        .limit(limit);

      if (newsError) {
        console.error('[useMarketNews] Error:', newsError);
        return [];
      }

      if (!newsData || newsData.length === 0) {
        return [];
      }

      return newsData.map(item => {
        // Extract tickers from related_markets or entities
        const relatedMarkets = item.related_markets as string[] | null;
        const entities = item.entities as string[] | null;
        const tickers: string[] = relatedMarkets || entities?.filter(e => /^[A-Z]{1,5}$/.test(e)) || [];

        // Determine sentiment from score
        const score = item.sentiment_score ?? 0;
        const sentiment: 'positive' | 'negative' | 'neutral' = 
          score > 0.2 ? 'positive' : score < -0.2 ? 'negative' : 'neutral';

        return {
          id: item.id,
          title: item.title,
          summary: item.description,
          publishedAt: item.detected_at,
          source: item.source || 'Market News',
          url: item.source_url,
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
      // Query real_world_events which has actual data (news_events is empty)
      const { data, error } = await supabase
        .from('real_world_events')
        .select('id, title, detected_at')
        .order('detected_at', { ascending: false, nullsFirst: false })
        .limit(limit);

      if (error) {
        console.error('[useLatestHeadlines] Error:', error);
        return [];
      }

      return data?.map(item => ({
        id: item.id,
        headline: item.title,
        time: formatRelativeTime(item.detected_at),
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
