import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Catalyst {
  id: string;
  title: string;
  category: 'earnings' | 'news' | 'analyst' | 'macro' | 'technical' | 'insider' | 'regulatory';
  impactScore: number;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  summary: string;
  details: string;
  source?: string;
  sourceUrl?: string;
  date: string;
}

export interface CatalystResponse {
  ticker: string;
  companyName: string;
  catalysts: Catalyst[];
  lastUpdated: string;
}

export function useStockCatalysts(ticker: string) {
  return useQuery({
    queryKey: ['stock-catalysts', ticker],
    queryFn: async (): Promise<CatalystResponse> => {
      const { data, error } = await supabase.functions.invoke('analyze-stock-catalysts', {
        body: { ticker },
      });

      if (error) {
        console.error('Error fetching catalysts:', error);
        throw new Error(error.message || 'Failed to fetch catalysts');
      }

      return data;
    },
    enabled: !!ticker,
    staleTime: 1000 * 60 * 15, // 15 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    retry: 1,
  });
}
