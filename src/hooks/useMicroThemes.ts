import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { LucideIcon } from 'lucide-react';
import {
  Flame, Shield, Banknote, Scale, Globe, Truck,
  BarChart3, Building2, TrendingUp, Zap, AlertTriangle,
  Landmark,
} from 'lucide-react';
import type { MarketTheme, ThemeTicker, ThemeNews } from '@/data/marketThemes';

// Category → icon mapping for micro-themes
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  geopolitical: Globe,
  monetary_policy: Landmark,
  earnings: BarChart3,
  regulatory: Scale,
  trade: Truck,
  commodity: Flame,
  sector_rotation: TrendingUp,
  corporate_action: Building2,
  macro_data: Banknote,
  default: Zap,
};

export interface MicroTheme {
  id: string;
  headline: string;
  summary: string;
  source: string | null;
  source_url: string | null;
  published_at: string | null;
  impact_score: number;
  sentiment: string;
  category: string;
  affected_countries: string[];
  affected_tickers: { symbol: string; name: string; direction: string; rationale: string }[];
  asset_class_impacts: Record<string, number>;
  ai_analysis: string | null;
  created_at: string;
  expires_at: string;
}

/**
 * Fetches active micro-themes from the database.
 * These are news-driven, AI-scored specific market events.
 */
export function useMicroThemes() {
  return useQuery({
    queryKey: ['heatmap-micro-themes'],
    queryFn: async (): Promise<MicroTheme[]> => {
      const { data, error } = await supabase
        .from('heatmap_micro_themes' as any)
        .select('*')
        .gt('expires_at', new Date().toISOString())
        .gte('impact_score', 5)
        .order('impact_score', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(15);

      if (error) {
        console.error('Error fetching micro themes:', error);
        return [];
      }

      return (data || []) as unknown as MicroTheme[];
    },
    staleTime: 5 * 60 * 1000, // 5 min
    refetchInterval: 10 * 60 * 1000, // 10 min auto-refresh
    retry: 2,
  });
}

/**
 * Trigger generation of new micro-themes via the edge function.
 */
export function useGenerateMicroThemes() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('generate-heatmap-themes', {
        body: {},
      });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['heatmap-micro-themes'] });
    },
  });
}

/**
 * Convert micro-themes to the MarketTheme format used by the existing UI.
 * This allows seamless integration with ThemesPanel and map components.
 */
export function microThemesToMarketThemes(microThemes: MicroTheme[]): MarketTheme[] {
  return microThemes.map((mt) => {
    const icon = CATEGORY_ICONS[mt.category] || CATEGORY_ICONS.default;
    const sentimentScore = mt.sentiment === 'bullish' ? 0.8 : mt.sentiment === 'bearish' ? 0.2 : 0.5;
    
    const tickers: ThemeTicker[] = (mt.affected_tickers || []).map((t) => ({
      symbol: t.symbol,
      name: t.name,
      change: t.direction === 'LONG' ? mt.impact_score * 0.5 : -mt.impact_score * 0.5,
      sentiment: t.direction === 'LONG' ? 'bullish' as const : t.direction === 'SHORT' ? 'bearish' as const : 'neutral' as const,
      themeRelevance: t.rationale,
    }));

    const headlines: ThemeNews[] = mt.source ? [{
      title: mt.headline,
      source: mt.source,
      time: mt.published_at ? formatTimeAgo(mt.published_at) : 'recently',
      url: mt.source_url || undefined,
    }] : [];

    return {
      id: `micro-${mt.id}`,
      title: mt.headline,
      summary: mt.summary,
      detailedSummary: mt.ai_analysis || mt.summary,
      impactPercent: mt.sentiment === 'bullish' ? mt.impact_score * 0.8 : mt.sentiment === 'bearish' ? -mt.impact_score * 0.8 : 0,
      sentimentScore,
      icon,
      category: mt.category,
      tickers,
      headlines,
      // Extra micro-theme metadata
      _micro: true,
      _impactScore: mt.impact_score,
      _countries: mt.affected_countries,
      _assetImpacts: mt.asset_class_impacts,
    } as MarketTheme & { _micro: boolean; _impactScore: number; _countries: string[]; _assetImpacts: Record<string, number> };
  });
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
