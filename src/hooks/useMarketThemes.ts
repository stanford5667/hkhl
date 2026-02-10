import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { MarketTheme, ThemeTicker, ThemeNews } from '@/data/marketThemes';
import {
  TrendingUp, Sparkles, Zap, Leaf, Cpu, Heart, ShoppingCart,
  Factory, Landmark, Building2, Globe, Shield, Wifi, Car,
  Plane, Home, Pill, Cloud, Lock, Truck, Banknote, Coins,
  BarChart3, Microscope, Brain, Sun, Wind, type LucideIcon,
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  TrendingUp, Sparkles, Zap, Leaf, Cpu, Heart, ShoppingCart,
  Factory, Landmark, Building2, Globe, Shield, Wifi, Car,
  Plane, Home, Pill, Cloud, Lock, Truck, Banknote, Coins,
  BarChart3, Microscope, Brain, Sun, Wind,
};

function mapDbThemeToMarketTheme(row: any): MarketTheme {
  const tickers: ThemeTicker[] = (row.tickers || []).map((t: any) => ({
    symbol: t.symbol || '',
    name: t.name || '',
    change: Number(t.change) || 0,
    sentiment: (['bullish', 'bearish', 'neutral'].includes(t.sentiment) ? t.sentiment : 'neutral') as ThemeTicker['sentiment'],
    themeRelevance: t.themeRelevance || '',
  }));

  const headlines: ThemeNews[] = (row.headlines || []).map((h: any) => ({
    title: h.title || '',
    source: h.source || '',
    time: h.time || '',
    url: h.url,
  }));

  return {
    id: row.theme_id,
    title: row.title,
    summary: row.summary,
    detailedSummary: row.detailed_summary,
    impactPercent: Number(row.impact_percent) || 0,
    sentimentScore: Number(row.sentiment_score) || 0.5,
    icon: ICON_MAP[row.icon_name] || Sparkles,
    category: row.category,
    tickers,
    headlines,
  };
}

export function useMarketThemes() {
  return useQuery({
    queryKey: ['market-themes-daily'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('market_themes')
        .select('*')
        .eq('is_active', true)
        .order('generated_date', { ascending: false })
        .limit(20);

      if (error) throw error;
      if (!data || data.length === 0) return null; // signal to use fallback

      return data.map(mapDbThemeToMarketTheme);
    },
    staleTime: 30 * 60 * 1000, // 30 min
    retry: 1,
  });
}
