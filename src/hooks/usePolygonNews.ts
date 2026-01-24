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

export interface PolygonNewsResponse {
  results: PolygonNewsArticle[];
  status: string;
  count: number;
  next_url?: string;
}

// Mock data for when API is unavailable
const MOCK_NEWS: PolygonNewsArticle[] = [
  {
    id: 'mock-1',
    title: 'NVIDIA Announces Next-Gen AI Chips, Stock Surges 8%',
    description: 'NVIDIA unveiled its latest generation of AI accelerators, promising 2x performance improvements. Wall Street analysts raised price targets across the board.',
    published_utc: new Date(Date.now() - 15 * 60000).toISOString(),
    article_url: '#',
    publisher: { name: 'Reuters' },
    tickers: ['NVDA', 'AMD', 'INTC'],
    insights: [
      { ticker: 'NVDA', sentiment: 'positive' },
      { ticker: 'AMD', sentiment: 'negative' },
      { ticker: 'INTC', sentiment: 'negative' },
    ],
  },
  {
    id: 'mock-2',
    title: 'Federal Reserve Signals Potential Rate Cuts in Q2',
    description: 'Fed Chair hints at possible rate reductions if inflation continues to cool. Bond markets rally on the news.',
    published_utc: new Date(Date.now() - 45 * 60000).toISOString(),
    article_url: '#',
    publisher: { name: 'Bloomberg' },
    tickers: ['SPY', 'TLT', 'JPM', 'BAC'],
    insights: [
      { ticker: 'SPY', sentiment: 'positive' },
      { ticker: 'TLT', sentiment: 'positive' },
      { ticker: 'JPM', sentiment: 'positive' },
      { ticker: 'BAC', sentiment: 'positive' },
    ],
  },
  {
    id: 'mock-3',
    title: 'Apple Reports Record Services Revenue, Hardware Misses',
    description: 'iPhone sales disappoint but App Store and subscription services hit all-time highs. Mixed reaction from investors.',
    published_utc: new Date(Date.now() - 2 * 3600000).toISOString(),
    article_url: '#',
    publisher: { name: 'CNBC' },
    tickers: ['AAPL', 'GOOGL', 'MSFT'],
    insights: [
      { ticker: 'AAPL', sentiment: 'neutral' },
      { ticker: 'GOOGL', sentiment: 'positive' },
    ],
  },
  {
    id: 'mock-4',
    title: 'Tesla Deliveries Beat Expectations, China Demand Strong',
    description: 'Electric vehicle maker reports Q4 deliveries above analyst estimates. Shanghai factory output hits record levels.',
    published_utc: new Date(Date.now() - 4 * 3600000).toISOString(),
    article_url: '#',
    publisher: { name: 'MarketWatch' },
    tickers: ['TSLA', 'NIO', 'RIVN'],
    insights: [
      { ticker: 'TSLA', sentiment: 'positive' },
      { ticker: 'NIO', sentiment: 'negative' },
      { ticker: 'RIVN', sentiment: 'negative' },
    ],
  },
  {
    id: 'mock-5',
    title: 'Microsoft Cloud Revenue Growth Accelerates on AI Demand',
    description: 'Azure cloud platform sees 30% growth as enterprise AI adoption accelerates. Copilot subscriptions exceed expectations.',
    published_utc: new Date(Date.now() - 6 * 3600000).toISOString(),
    article_url: '#',
    publisher: { name: 'The Wall Street Journal' },
    tickers: ['MSFT', 'AMZN', 'GOOGL'],
    insights: [
      { ticker: 'MSFT', sentiment: 'positive' },
      { ticker: 'AMZN', sentiment: 'neutral' },
      { ticker: 'GOOGL', sentiment: 'neutral' },
    ],
  },
  {
    id: 'mock-6',
    title: 'Oil Prices Surge on Middle East Supply Concerns',
    description: 'Brent crude jumps 4% amid geopolitical tensions. Energy stocks rally while airlines face headwinds.',
    published_utc: new Date(Date.now() - 8 * 3600000).toISOString(),
    article_url: '#',
    publisher: { name: 'Financial Times' },
    tickers: ['XOM', 'CVX', 'DAL', 'UAL'],
    insights: [
      { ticker: 'XOM', sentiment: 'positive' },
      { ticker: 'CVX', sentiment: 'positive' },
      { ticker: 'DAL', sentiment: 'negative' },
      { ticker: 'UAL', sentiment: 'negative' },
    ],
  },
  {
    id: 'mock-7',
    title: 'Meta Platforms Beats on Ad Revenue, Metaverse Losses Narrow',
    description: 'Social media giant reports strong advertising growth. Reality Labs division shows improved efficiency.',
    published_utc: new Date(Date.now() - 12 * 3600000).toISOString(),
    article_url: '#',
    publisher: { name: 'TechCrunch' },
    tickers: ['META', 'SNAP', 'PINS'],
    insights: [
      { ticker: 'META', sentiment: 'positive' },
      { ticker: 'SNAP', sentiment: 'neutral' },
      { ticker: 'PINS', sentiment: 'neutral' },
    ],
  },
  {
    id: 'mock-8',
    title: 'Amazon Web Services Launches New AI Tools for Developers',
    description: 'AWS announces suite of generative AI services at re:Invent. Competes directly with Microsoft and Google offerings.',
    published_utc: new Date(Date.now() - 18 * 3600000).toISOString(),
    article_url: '#',
    publisher: { name: 'Ars Technica' },
    tickers: ['AMZN', 'MSFT', 'GOOGL'],
    insights: [
      { ticker: 'AMZN', sentiment: 'positive' },
      { ticker: 'MSFT', sentiment: 'neutral' },
      { ticker: 'GOOGL', sentiment: 'neutral' },
    ],
  },
];

export function usePolygonNews(ticker?: string, limit: number = 20) {
  return useQuery({
    queryKey: ['polygon-news', ticker, limit],
    queryFn: async (): Promise<PolygonNewsArticle[]> => {
      try {
        // Try to fetch from news_events table first (our cached news)
        const { data, error } = await supabase
          .from('news_events')
          .select('*')
          .order('published_at', { ascending: false })
          .limit(limit);

        if (error) {
          console.error('[usePolygonNews] Supabase error:', error);
          return MOCK_NEWS.slice(0, limit);
        }

        if (data && data.length > 0) {
          // Transform news_events to PolygonNewsArticle format
          // Extract tickers from raw_concepts if available
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
                name: item.source_id || 'Unknown',
              },
              tickers,
              insights: tickers.map((t: string) => ({
                ticker: t,
                sentiment: 'neutral' as const,
              })),
            };
          });
        }

        // Return mock data if no real data available
        return MOCK_NEWS.slice(0, limit);
      } catch (err) {
        console.error('[usePolygonNews] Error:', err);
        return MOCK_NEWS.slice(0, limit);
      }
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
