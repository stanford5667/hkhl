import { supabase } from "@/integrations/supabase/client";

export interface MatchedInsight {
  id: string;
  news_event_id: string;
  primary_ticker: string | null;
  thesis: string | null;
  sentiment: string | null;
  impact_score: number;
  confidence: number;
  asset_focus: string | null;
  related_tickers: string[];
  created_at: string;
  match_type: 'hard' | 'semantic';
  relevance_score: number;
  age_hours: number;
}

interface RankingParams {
  impact_score: number;
  confidence: number;
  created_at: string;
}

/**
 * Calculate the relevance score: (impact_score * confidence) / age_in_hours
 * Higher scores = fresher + higher conviction
 */
function calculateRelevanceScore({ impact_score, confidence, created_at }: RankingParams): number {
  const createdDate = new Date(created_at);
  const now = new Date();
  const ageMs = now.getTime() - createdDate.getTime();
  const ageHours = Math.max(ageMs / (1000 * 60 * 60), 0.1); // Minimum 0.1 hours to avoid division issues
  
  const normalizedConfidence = confidence / 100; // Assuming confidence is 0-100
  const normalizedImpact = impact_score / 10; // Assuming impact_score is 0-10
  
  return (normalizedImpact * normalizedConfidence) / ageHours;
}

/**
 * Get age in hours from a timestamp
 */
function getAgeInHours(created_at: string): number {
  const createdDate = new Date(created_at);
  const now = new Date();
  return (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60);
}

/**
 * Hard Match: Get insights where primary_ticker or related_tickers match user's portfolio
 */
export async function getHardMatchInsights(userTickers: string[]): Promise<MatchedInsight[]> {
  if (userTickers.length === 0) return [];

  // Query insights where asset_focus (primary ticker) matches user tickers
  // or where any related_tickers overlap
  const { data, error } = await supabase
    .from('ai_insights')
    .select(`
      id,
      news_event_id,
      asset_focus,
      thesis,
      sentiment,
      impact_score,
      confidence,
      related_tickers,
      created_at
    `)
    .or(
      userTickers.map(ticker => `asset_focus.ilike.%${ticker}%`).join(',') + 
      ',' + 
      userTickers.map(ticker => `related_tickers.cs.{${ticker}}`).join(',')
    )
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Error fetching hard match insights:', error);
    return [];
  }

  return (data || []).map(insight => ({
    id: insight.id,
    news_event_id: insight.news_event_id,
    primary_ticker: insight.asset_focus,
    thesis: insight.thesis,
    sentiment: insight.sentiment,
    impact_score: insight.impact_score || 0,
    confidence: insight.confidence || 0,
    asset_focus: insight.asset_focus,
    related_tickers: insight.related_tickers || [],
    created_at: insight.created_at || new Date().toISOString(),
    match_type: 'hard' as const,
    relevance_score: calculateRelevanceScore({
      impact_score: insight.impact_score || 0,
      confidence: insight.confidence || 0,
      created_at: insight.created_at || new Date().toISOString()
    }),
    age_hours: getAgeInHours(insight.created_at || new Date().toISOString())
  }));
}

/**
 * Semantic Match: Find insights whose correlation_vector is similar to the user's holdings
 * Uses pgvector similarity search via RPC
 */
export async function getSemanticMatchInsights(
  userTickers: string[], 
  excludeIds: string[] = [],
  threshold: number = 0.7
): Promise<MatchedInsight[]> {
  if (userTickers.length === 0) return [];

  // Call edge function for semantic search (handles vector similarity)
  const { data, error } = await supabase.functions.invoke('semantic-insight-match', {
    body: { 
      tickers: userTickers,
      exclude_ids: excludeIds,
      similarity_threshold: threshold,
      limit: 50
    }
  });

  if (error) {
    console.error('Error fetching semantic match insights:', error);
    return [];
  }

  return (data?.insights || []).map((insight: any) => ({
    id: insight.id,
    news_event_id: insight.news_event_id,
    primary_ticker: insight.asset_focus,
    thesis: insight.thesis,
    sentiment: insight.sentiment,
    impact_score: insight.impact_score || 0,
    confidence: insight.confidence || 0,
    asset_focus: insight.asset_focus,
    related_tickers: insight.related_tickers || [],
    created_at: insight.created_at || new Date().toISOString(),
    match_type: 'semantic' as const,
    relevance_score: calculateRelevanceScore({
      impact_score: insight.impact_score || 0,
      confidence: insight.confidence || 0,
      created_at: insight.created_at || new Date().toISOString()
    }) * (insight.similarity || 0.5), // Weight by similarity
    age_hours: getAgeInHours(insight.created_at || new Date().toISOString())
  }));
}

/**
 * Get user's portfolio tickers
 */
export async function getUserPortfolioTickers(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('user_portfolios')
    .select('ticker')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching user portfolio:', error);
    return [];
  }

  return (data || []).map(p => p.ticker).filter(Boolean);
}

/**
 * Main function: Get all matched insights for the current user
 * Combines hard matches and semantic matches, ranks by relevance
 */
export async function getMatchedInsightsForUser(userId: string): Promise<MatchedInsight[]> {
  // 1. Get user's tickers
  const userTickers = await getUserPortfolioTickers(userId);
  
  if (userTickers.length === 0) {
    console.log('User has no tickers in portfolio');
    return [];
  }

  // 2. Get hard matches first
  const hardMatches = await getHardMatchInsights(userTickers);
  const hardMatchIds = hardMatches.map(m => m.id);

  // 3. Get semantic matches (excluding hard matches to avoid duplicates)
  const semanticMatches = await getSemanticMatchInsights(userTickers, hardMatchIds);

  // 4. Combine and rank by relevance score
  const allMatches = [...hardMatches, ...semanticMatches];
  
  // Sort by relevance score (highest first)
  allMatches.sort((a, b) => b.relevance_score - a.relevance_score);

  return allMatches;
}

/**
 * Get top N most relevant insights for the user
 */
export async function getTopInsightsForUser(userId: string, limit: number = 10): Promise<MatchedInsight[]> {
  const allMatches = await getMatchedInsightsForUser(userId);
  return allMatches.slice(0, limit);
}

/**
 * Real-time subscription to new insights matching user's portfolio
 */
export function subscribeToUserInsights(
  userId: string,
  userTickers: string[],
  onNewInsight: (insight: MatchedInsight) => void
) {
  const channel = supabase
    .channel('user-insights')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'ai_insights'
      },
      async (payload) => {
        const insight = payload.new as any;
        
        // Check if this insight matches user's tickers (hard match)
        const matchesTicker = userTickers.some(ticker => 
          insight.asset_focus?.toLowerCase().includes(ticker.toLowerCase()) ||
          (insight.related_tickers || []).some((t: string) => 
            t.toLowerCase() === ticker.toLowerCase()
          )
        );

        if (matchesTicker) {
          onNewInsight({
            id: insight.id,
            news_event_id: insight.news_event_id,
            primary_ticker: insight.asset_focus,
            thesis: insight.thesis,
            sentiment: insight.sentiment,
            impact_score: insight.impact_score || 0,
            confidence: insight.confidence || 0,
            asset_focus: insight.asset_focus,
            related_tickers: insight.related_tickers || [],
            created_at: insight.created_at || new Date().toISOString(),
            match_type: 'hard',
            relevance_score: calculateRelevanceScore({
              impact_score: insight.impact_score || 0,
              confidence: insight.confidence || 0,
              created_at: insight.created_at || new Date().toISOString()
            }),
            age_hours: getAgeInHours(insight.created_at || new Date().toISOString())
          });
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
