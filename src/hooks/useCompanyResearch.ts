import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Types
export interface NewsArticle {
  title: string;
  source: string;
  url: string;
  date: string;
  summary: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  relevance: number;
}

export interface NewsData {
  type: 'news';
  ticker: string;
  articles: NewsArticle[];
  scrapedAt: string;
}

export interface FinancialsData {
  type: 'financials';
  ticker: string;
  company: {
    ticker: string;
    name: string;
    sector: string;
    industry: string;
    marketCap: string;
    peRatio: string;
    dividendYield: string;
    eps: string;
  };
  keyStats: {
    beta: string;
    fiftyTwoWeekHigh: string;
    fiftyTwoWeekLow: string;
    avgVolume?: string;
  };
  scrapedAt: string;
}

export interface SecFiling {
  type: string;
  title: string;
  filedAt: string;
  url: string;
  description: string;
}

export interface SecFilingsData {
  type: 'sec_filings';
  ticker: string;
  filings: SecFiling[];
  scrapedAt: string;
}

export interface AnalystReport {
  analyst: string;
  rating: 'Buy' | 'Hold' | 'Sell';
  priceTarget: number;
  date: string;
}

export interface AnalystData {
  type: 'analyst';
  ticker: string;
  consensus: string;
  averageTarget: string;
  reports: AnalystReport[];
  scrapedAt: string;
}

export interface SocialMention {
  platform: string;
  content: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  timestamp: string;
}

export interface SocialData {
  type: 'social';
  ticker: string;
  overallSentiment: string;
  breakdown: {
    positive: number;
    negative: number;
    neutral: number;
  };
  mentions: SocialMention[];
  scrapedAt: string;
}

export interface ComprehensiveData {
  type: 'comprehensive';
  ticker: string;
  news: NewsData;
  financials: FinancialsData;
  secFilings: SecFilingsData;
  analyst: AnalystData;
  social: SocialData;
  scrapedAt: string;
}

export type ResearchResponse<T> = {
  success: boolean;
  data: T;
  source: 'firecrawl' | 'mock';
  error?: string;
};

// API call
async function fetchResearch<T>(
  ticker: string,
  scrapeType: string,
  companyName?: string,
  limit?: number
): Promise<ResearchResponse<T>> {
  const { data, error } = await supabase.functions.invoke('firecrawl-research', {
    body: { ticker, companyName, scrapeType, limit },
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as ResearchResponse<T>;
}

// Hooks
export function useCompanyNews(ticker: string, companyName?: string, limit = 10, enabled = true) {
  return useQuery({
    queryKey: ['company-research', 'news', ticker, limit],
    queryFn: () => fetchResearch<NewsData>(ticker, 'news', companyName, limit),
    enabled: enabled && !!ticker,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCompanyFinancials(ticker: string, enabled = true) {
  return useQuery({
    queryKey: ['company-research', 'financials', ticker],
    queryFn: () => fetchResearch<FinancialsData>(ticker, 'financials'),
    enabled: enabled && !!ticker,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSecFilings(ticker: string, limit = 5, enabled = true) {
  return useQuery({
    queryKey: ['company-research', 'sec_filings', ticker, limit],
    queryFn: () => fetchResearch<SecFilingsData>(ticker, 'sec_filings', undefined, limit),
    enabled: enabled && !!ticker,
    staleTime: 30 * 60 * 1000, // 30 minutes - SEC filings don't change often
  });
}

export function useAnalystReports(ticker: string, limit = 5, enabled = true) {
  return useQuery({
    queryKey: ['company-research', 'analyst', ticker],
    queryFn: () => fetchResearch<AnalystData>(ticker, 'analyst', undefined, limit),
    enabled: enabled && !!ticker,
    staleTime: 15 * 60 * 1000,
  });
}

export function useSocialSentiment(ticker: string, limit = 10, enabled = true) {
  return useQuery({
    queryKey: ['company-research', 'social', ticker, limit],
    queryFn: () => fetchResearch<SocialData>(ticker, 'social', undefined, limit),
    enabled: enabled && !!ticker,
    staleTime: 5 * 60 * 1000,
  });
}

export function useComprehensiveResearch(ticker: string, companyName?: string, limit = 5, enabled = true) {
  return useQuery({
    queryKey: ['company-research', 'comprehensive', ticker, limit],
    queryFn: () => fetchResearch<ComprehensiveData>(ticker, 'comprehensive', companyName, limit),
    enabled: enabled && !!ticker,
    staleTime: 5 * 60 * 1000,
  });
}

export function useRefreshResearch() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ ticker, scrapeType }: { ticker: string; scrapeType: string }) => {
      return fetchResearch(ticker, scrapeType);
    },
    onSuccess: (_, { ticker }) => {
      queryClient.invalidateQueries({ queryKey: ['company-research', ticker] });
    },
  });
}

// Utility functions
export function getSentimentColor(sentiment: 'positive' | 'negative' | 'neutral'): string {
  switch (sentiment) {
    case 'positive': return 'text-emerald-400';
    case 'negative': return 'text-rose-400';
    default: return 'text-muted-foreground';
  }
}

export function getSentimentBgColor(sentiment: 'positive' | 'negative' | 'neutral'): string {
  switch (sentiment) {
    case 'positive': return 'bg-emerald-500/20';
    case 'negative': return 'bg-rose-500/20';
    default: return 'bg-muted';
  }
}

export function getRatingColor(rating: string): string {
  switch (rating.toLowerCase()) {
    case 'buy': return 'text-emerald-400';
    case 'sell': return 'text-rose-400';
    default: return 'text-yellow-400';
  }
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
