import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type NewsCategory = 'politics' | 'crypto' | 'economics' | 'sports' | 'tech' | 'science' | 'entertainment' | 'all';
export type NewsSeverity = 'critical' | 'high' | 'medium' | 'low' | 'all';
export type TimeRange = '1h' | '24h' | '7d' | 'all';

export interface NewsArticle {
  id: string;
  title: string;
  description: string | null;
  source: string | null;
  source_url: string | null;
  category: string | null;
  severity: string | null;
  sentiment_score: number | null;
  entities: string[] | null;
  related_markets: string[] | null;
  detected_at: string;
  ai_extracted_entities: Record<string, unknown> | null;
  ai_classification: Record<string, unknown> | null;
  ai_sentiment: Record<string, unknown> | null;
  ai_market_links: Record<string, unknown> | null;
  // AI insights (if available)
  ai_insight?: {
    thesis: string | null;
    sentiment: string | null;
    impact_score: number | null;
    confidence: number | null;
    asset_focus: string | null;
    related_tickers: string[] | null;
  } | null;
}

export interface NewsStats {
  total: number;
  critical: number;
  avgSentiment: number;
}

interface UseNewsIntelligenceOptions {
  category?: NewsCategory;
  severity?: NewsSeverity;
  searchQuery?: string;
  timeRange?: TimeRange;
}

function getTimeFilter(timeRange: TimeRange): Date | null {
  const now = new Date();
  switch (timeRange) {
    case '1h':
      return new Date(now.getTime() - 60 * 60 * 1000);
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case 'all':
    default:
      return null;
  }
}

export function useNewsIntelligence(options: UseNewsIntelligenceOptions = {}) {
  const {
    category = 'all',
    severity = 'all',
    searchQuery = '',
    timeRange = 'all',
  } = options;

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['news-intelligence', category, severity, searchQuery, timeRange],
    queryFn: async () => {
      // Build query for real_world_events
      let query = supabase
        .from('real_world_events')
        .select('*')
        .order('detected_at', { ascending: false })
        .limit(100);

      // Apply category filter
      if (category !== 'all') {
        query = query.eq('category', category);
      }

      // Apply severity filter
      if (severity !== 'all') {
        query = query.eq('severity', severity);
      }

      // Apply time range filter
      const timeFilter = getTimeFilter(timeRange);
      if (timeFilter) {
        query = query.gte('detected_at', timeFilter.toISOString());
      }

      // Apply search filter
      if (searchQuery.trim()) {
        query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }

      const { data: articles, error } = await query;
      if (error) throw error;

      // Fetch AI insights separately
      const { data: aiInsights } = await supabase
        .from('ai_insights')
        .select('news_event_id, thesis, sentiment, impact_score, confidence, asset_focus, related_tickers')
        .limit(200);

      // Create a map for quick lookup by news_event_id
      const insightsMap = new Map<string, typeof aiInsights[0]>();
      if (aiInsights) {
        aiInsights.forEach(insight => {
          insightsMap.set(insight.news_event_id, insight);
        });
      }

      // Enhance articles with AI insights if available
      const enhancedArticles: NewsArticle[] = (articles || []).map(article => ({
        ...article,
        ai_extracted_entities: article.ai_extracted_entities as Record<string, unknown> | null,
        ai_classification: article.ai_classification as Record<string, unknown> | null,
        ai_sentiment: article.ai_sentiment as Record<string, unknown> | null,
        ai_market_links: article.ai_market_links as Record<string, unknown> | null,
        ai_insight: insightsMap.has(article.id) ? {
          thesis: insightsMap.get(article.id)?.thesis || null,
          sentiment: insightsMap.get(article.id)?.sentiment || null,
          impact_score: insightsMap.get(article.id)?.impact_score || null,
          confidence: insightsMap.get(article.id)?.confidence ? Number(insightsMap.get(article.id)?.confidence) : null,
          asset_focus: insightsMap.get(article.id)?.asset_focus || null,
          related_tickers: insightsMap.get(article.id)?.related_tickers || null,
        } : null,
      }));

      return enhancedArticles;
    },
    refetchInterval: 60000, // Auto-refresh every 60 seconds
    staleTime: 30000, // Consider data stale after 30 seconds
  });

  // Calculate stats
  const stats: NewsStats = {
    total: data?.length || 0,
    critical: data?.filter(a => a.severity === 'critical').length || 0,
    avgSentiment: data && data.length > 0
      ? data.reduce((sum, a) => sum + (a.sentiment_score || 0), 0) / data.filter(a => a.sentiment_score !== null).length || 0
      : 0,
  };

  return {
    articles: data || [],
    isLoading,
    error,
    refetch,
    stats,
  };
}
