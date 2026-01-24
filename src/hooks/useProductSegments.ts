import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProductSegment {
  name: string;
  revenue: number;
  percentage: number;
}

export interface ProductSegmentsData {
  segments: ProductSegment[];
  useMockData: boolean;
  source: string;
}

export function useProductSegments(ticker: string | undefined) {
  return useQuery<ProductSegmentsData | null>({
    queryKey: ['product-segments', ticker],
    queryFn: async () => {
      if (!ticker) return null;
      
      const { data, error } = await supabase.functions.invoke('fmp-fundamentals', {
        body: { action: 'segments', symbol: ticker }
      });
      
      if (error) {
        console.error('[useProductSegments] Error:', error);
        throw error;
      }
      
      if (!data?.success) {
        console.warn('[useProductSegments] No data for', ticker);
        return null;
      }
      
      return {
        segments: data.segments || [],
        useMockData: data.useMockData || false,
        source: data.source || 'Unknown'
      };
    },
    staleTime: 60 * 60 * 1000, // 1 hour - segments don't change often
    enabled: !!ticker,
  });
}
