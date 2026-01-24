import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SentimentStats {
  bullish: number;
  bearish: number;
  neutral: number;
  total: number;
  avgImpact: number;
  avgConfidence: number;
}

export interface TickerSentiment {
  ticker: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  impactScore: number;
  confidence: number;
  thesis: string | null;
}

/**
 * Fetches real sentiment analysis from AI insights table
 */
export function useSentimentAnalysis() {
  return useQuery({
    queryKey: ['sentiment-analysis'],
    queryFn: async (): Promise<SentimentStats> => {
      const { data, error } = await supabase
        .from('ai_insights')
        .select('sentiment, impact_score, confidence')
        .limit(500);

      if (error) {
        console.error('[useSentimentAnalysis] Error:', error);
        return { bullish: 0, bearish: 0, neutral: 0, total: 0, avgImpact: 0, avgConfidence: 0 };
      }

      if (!data || data.length === 0) {
        return { bullish: 0, bearish: 0, neutral: 0, total: 0, avgImpact: 0, avgConfidence: 0 };
      }

      const stats = data.reduce(
        (acc, insight) => {
          acc.total++;
          if (insight.sentiment === 'bullish') acc.bullish++;
          else if (insight.sentiment === 'bearish') acc.bearish++;
          else acc.neutral++;
          
          if (insight.impact_score) acc.totalImpact += insight.impact_score;
          if (insight.confidence) acc.totalConfidence += Number(insight.confidence);
          
          return acc;
        },
        { bullish: 0, bearish: 0, neutral: 0, total: 0, totalImpact: 0, totalConfidence: 0 }
      );

      return {
        bullish: stats.bullish,
        bearish: stats.bearish,
        neutral: stats.neutral,
        total: stats.total,
        avgImpact: stats.total > 0 ? stats.totalImpact / stats.total : 0,
        avgConfidence: stats.total > 0 ? stats.totalConfidence / stats.total : 0,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetches sentiment for a specific ticker from AI insights
 */
export function useTickerSentiment(ticker: string) {
  return useQuery({
    queryKey: ['ticker-sentiment', ticker],
    queryFn: async (): Promise<TickerSentiment | null> => {
      if (!ticker) return null;

      const { data, error } = await supabase
        .from('ai_insights')
        .select('sentiment, impact_score, confidence, thesis, asset_focus, related_tickers')
        .or(`asset_focus.ilike.%${ticker}%,related_tickers.cs.{${ticker}}`)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        ticker,
        sentiment: (data.sentiment as 'bullish' | 'bearish' | 'neutral') || 'neutral',
        impactScore: data.impact_score || 0,
        confidence: data.confidence ? Number(data.confidence) : 0,
        thesis: data.thesis,
      };
    },
    enabled: !!ticker,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetches top bullish/bearish insights from AI insights table
 */
export function useTopInsights(limit: number = 10) {
  return useQuery({
    queryKey: ['top-insights', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_insights')
        .select('id, sentiment, impact_score, confidence, thesis, asset_focus, related_tickers, created_at')
        .order('impact_score', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[useTopInsights] Error:', error);
        return { bullish: [], bearish: [] };
      }

      if (!data) {
        return { bullish: [], bearish: [] };
      }

      const bullish = data
        .filter(i => i.sentiment === 'bullish')
        .slice(0, Math.ceil(limit / 2));
      
      const bearish = data
        .filter(i => i.sentiment === 'bearish')
        .slice(0, Math.ceil(limit / 2));

      return { bullish, bearish };
    },
    staleTime: 5 * 60 * 1000,
  });
}
