import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CategoryCount {
  sector: string;
  count: number;
}

// Map sector names from database to category IDs used in Research page
const SECTOR_TO_CATEGORY: Record<string, string> = {
  'Technology': 'technology',
  'Information Technology': 'technology',
  'Healthcare': 'healthcare',
  'Health Care': 'healthcare',
  'Financials': 'financials',
  'Financial Services': 'financials',
  'Consumer Discretionary': 'consumer',
  'Consumer Staples': 'consumer',
  'Consumer Cyclical': 'consumer',
  'Consumer Defensive': 'consumer',
  'Energy': 'energy',
  'Industrials': 'industrials',
  'Industrial Goods': 'industrials',
  'Basic Materials': 'industrials',
  'Materials': 'industrials',
  'Utilities': 'energy',
  'Real Estate': 'financials',
  'Communication Services': 'technology',
  'Telecommunications': 'technology',
};

/**
 * Fetches stock counts per sector from asset_universe table
 */
export function useCategoryCounts() {
  return useQuery({
    queryKey: ['category-counts'],
    queryFn: async (): Promise<Record<string, number>> => {
      // Query sector counts from asset_universe
      const { data, error } = await supabase
        .from('asset_universe')
        .select('sector')
        .eq('is_active', true)
        .not('sector', 'is', null);

      if (error) {
        console.error('[useCategoryCounts] Error:', error);
        return {};
      }

      if (!data || data.length === 0) {
        return {};
      }

      // Count by sector and map to category IDs
      const categoryMap: Record<string, number> = {};
      
      data.forEach(item => {
        if (!item.sector) return;
        
        const categoryId = SECTOR_TO_CATEGORY[item.sector];
        if (categoryId) {
          categoryMap[categoryId] = (categoryMap[categoryId] || 0) + 1;
        }
      });

      return categoryMap;
    },
    staleTime: 30 * 60 * 1000, // 30 minutes - sector counts don't change often
  });
}

/**
 * Fetches ETF count for the ETFs category
 */
export function useETFCount() {
  return useQuery({
    queryKey: ['etf-count'],
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from('asset_universe')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .eq('asset_type', 'ETF');

      if (error) {
        console.error('[useETFCount] Error:', error);
        return 0;
      }

      return count || 0;
    },
    staleTime: 30 * 60 * 1000,
  });
}
