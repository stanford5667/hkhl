import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMarketThemes } from './useMarketThemes';
import { MARKET_THEMES, type MarketTheme } from '@/data/marketThemes';

// ── Region-to-country mapping for geo visualization ──
export interface RegionThemeData {
  countryCode: string;
  countryName: string;
  sentiment: 'bullish' | 'bearish' | 'neutral' | 'emerging';
  activeThemes: string[];
  themeIntensity: number; // 0-100
  keyStats: { label: string; value: string }[];
}

export interface ThemeTicker {
  symbol: string;
  name: string;
  sector: string;
  themeExposure: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  volume: number | null;
  marketCap: number | null;
}

export interface SectorStat {
  sector: string;
  daily: number | null;
  weekly: number | null;
  monthly: number | null;
  pe: number | null;
  flow: 'inflow' | 'outflow' | 'neutral';
}

// Country mapping from themes
const THEME_COUNTRY_MAP: Record<string, { countries: string[]; sentiment: 'bullish' | 'bearish' | 'neutral' | 'emerging' }> = {
  'Technology': { countries: ['US', 'TW', 'KR', 'JP', 'CN', 'IE', 'NL'], sentiment: 'bullish' },
  'AI & Machine Learning': { countries: ['US', 'CN', 'GB', 'CA', 'IL'], sentiment: 'bullish' },
  'Clean Energy': { countries: ['US', 'CN', 'DE', 'DK', 'NO', 'SE', 'AU'], sentiment: 'emerging' },
  'Semiconductors': { countries: ['US', 'TW', 'KR', 'NL', 'JP'], sentiment: 'bullish' },
  'Healthcare': { countries: ['US', 'CH', 'GB', 'DK', 'JP', 'DE'], sentiment: 'neutral' },
  'Finance': { countries: ['US', 'GB', 'SG', 'HK', 'CH', 'JP'], sentiment: 'neutral' },
  'Energy': { countries: ['US', 'SA', 'RU', 'CA', 'NO', 'AE', 'BR'], sentiment: 'bearish' },
  'Consumer': { countries: ['US', 'CN', 'JP', 'FR', 'DE', 'IN'], sentiment: 'neutral' },
  'Real Estate': { countries: ['US', 'CN', 'AU', 'SG', 'HK', 'GB'], sentiment: 'bearish' },
  'Defense': { countries: ['US', 'GB', 'IL', 'FR', 'KR', 'SE'], sentiment: 'bullish' },
  'Commodities': { countries: ['AU', 'BR', 'CA', 'ZA', 'CL', 'PE', 'RU'], sentiment: 'neutral' },
  'EV & Mobility': { countries: ['US', 'CN', 'DE', 'KR', 'JP', 'SE'], sentiment: 'emerging' },
  'Crypto & Blockchain': { countries: ['US', 'SG', 'CH', 'AE', 'GB'], sentiment: 'emerging' },
  'Infrastructure': { countries: ['US', 'CN', 'IN', 'BR', 'MX', 'ID'], sentiment: 'bullish' },
  'Biotech': { countries: ['US', 'CH', 'DK', 'GB', 'DE', 'JP'], sentiment: 'emerging' },
};

const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States', CN: 'China', JP: 'Japan', KR: 'South Korea',
  TW: 'Taiwan', DE: 'Germany', GB: 'United Kingdom', FR: 'France',
  CA: 'Canada', AU: 'Australia', IN: 'India', BR: 'Brazil',
  IL: 'Israel', CH: 'Switzerland', NL: 'Netherlands', SG: 'Singapore',
  HK: 'Hong Kong', DK: 'Denmark', NO: 'Norway', SE: 'Sweden',
  SA: 'Saudi Arabia', AE: 'UAE', RU: 'Russia', MX: 'Mexico',
  ID: 'Indonesia', ZA: 'South Africa', CL: 'Chile', PE: 'Peru',
  IE: 'Ireland', IT: 'Italy', ES: 'Spain',
};

// Theme → Representative tickers
const THEME_TICKERS: Record<string, { symbol: string; name: string; sector: string }[]> = {
  'Technology': [
    { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology' },
    { symbol: 'MSFT', name: 'Microsoft Corp.', sector: 'Technology' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', sector: 'Technology' },
    { symbol: 'META', name: 'Meta Platforms', sector: 'Technology' },
  ],
  'AI & Machine Learning': [
    { symbol: 'NVDA', name: 'NVIDIA Corp.', sector: 'Semiconductors' },
    { symbol: 'MSFT', name: 'Microsoft Corp.', sector: 'Technology' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', sector: 'Technology' },
    { symbol: 'AMD', name: 'AMD Inc.', sector: 'Semiconductors' },
    { symbol: 'PLTR', name: 'Palantir Technologies', sector: 'Technology' },
  ],
  'Clean Energy': [
    { symbol: 'ENPH', name: 'Enphase Energy', sector: 'Energy' },
    { symbol: 'FSLR', name: 'First Solar', sector: 'Energy' },
    { symbol: 'NEE', name: 'NextEra Energy', sector: 'Utilities' },
    { symbol: 'PLUG', name: 'Plug Power', sector: 'Industrials' },
  ],
  'Semiconductors': [
    { symbol: 'NVDA', name: 'NVIDIA Corp.', sector: 'Semiconductors' },
    { symbol: 'TSM', name: 'TSMC', sector: 'Semiconductors' },
    { symbol: 'ASML', name: 'ASML Holding', sector: 'Semiconductors' },
    { symbol: 'AVGO', name: 'Broadcom Inc.', sector: 'Semiconductors' },
  ],
  'Healthcare': [
    { symbol: 'UNH', name: 'UnitedHealth', sector: 'Healthcare' },
    { symbol: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare' },
    { symbol: 'LLY', name: 'Eli Lilly', sector: 'Healthcare' },
    { symbol: 'PFE', name: 'Pfizer Inc.', sector: 'Healthcare' },
  ],
  'Finance': [
    { symbol: 'JPM', name: 'JPMorgan Chase', sector: 'Financials' },
    { symbol: 'GS', name: 'Goldman Sachs', sector: 'Financials' },
    { symbol: 'V', name: 'Visa Inc.', sector: 'Financials' },
    { symbol: 'BRK.B', name: 'Berkshire Hathaway', sector: 'Financials' },
  ],
  'Energy': [
    { symbol: 'XOM', name: 'Exxon Mobil', sector: 'Energy' },
    { symbol: 'CVX', name: 'Chevron Corp.', sector: 'Energy' },
    { symbol: 'COP', name: 'ConocoPhillips', sector: 'Energy' },
    { symbol: 'SLB', name: 'Schlumberger', sector: 'Energy' },
  ],
  'EV & Mobility': [
    { symbol: 'TSLA', name: 'Tesla Inc.', sector: 'Consumer Cyclical' },
    { symbol: 'RIVN', name: 'Rivian Automotive', sector: 'Consumer Cyclical' },
    { symbol: 'LI', name: 'Li Auto', sector: 'Consumer Cyclical' },
    { symbol: 'NIO', name: 'NIO Inc.', sector: 'Consumer Cyclical' },
  ],
  'Defense': [
    { symbol: 'LMT', name: 'Lockheed Martin', sector: 'Industrials' },
    { symbol: 'RTX', name: 'RTX Corp.', sector: 'Industrials' },
    { symbol: 'NOC', name: 'Northrop Grumman', sector: 'Industrials' },
    { symbol: 'GD', name: 'General Dynamics', sector: 'Industrials' },
  ],
  'Biotech': [
    { symbol: 'AMGN', name: 'Amgen Inc.', sector: 'Healthcare' },
    { symbol: 'GILD', name: 'Gilead Sciences', sector: 'Healthcare' },
    { symbol: 'REGN', name: 'Regeneron', sector: 'Healthcare' },
    { symbol: 'VRTX', name: 'Vertex Pharma', sector: 'Healthcare' },
  ],
};

const SECTOR_ETFS: Record<string, string> = {
  'Technology': 'XLK', 'Healthcare': 'XLV', 'Financials': 'XLF',
  'Energy': 'XLE', 'Consumer Discretionary': 'XLY', 'Consumer Staples': 'XLP',
  'Industrials': 'XLI', 'Materials': 'XLB', 'Utilities': 'XLU',
  'Real Estate': 'XLRE', 'Communication Services': 'XLC',
};

// ── Main hook: region heat data ──
export function useRegionHeatData(themes: MarketTheme[] | null) {
  return useQuery({
    queryKey: ['region-heat-data', themes?.map(t => t.id).join(',')],
    queryFn: () => {
      if (!themes || themes.length === 0) return [] as RegionThemeData[];
      
      const countryMap = new Map<string, RegionThemeData>();

      for (const theme of themes) {
        const category = theme.category || 'Technology';
        const mapping = THEME_COUNTRY_MAP[category] || THEME_COUNTRY_MAP['Technology'];

        for (const code of mapping.countries) {
          const existing = countryMap.get(code);
          if (existing) {
            existing.activeThemes.push(theme.title);
            existing.themeIntensity = Math.min(100, existing.themeIntensity + 15);
            // Upgrade sentiment priority: bullish > emerging > neutral > bearish
            if (mapping.sentiment === 'bullish' && existing.sentiment !== 'bullish') {
              existing.sentiment = 'bullish';
            } else if (mapping.sentiment === 'emerging' && existing.sentiment === 'neutral') {
              existing.sentiment = 'emerging';
            }
          } else {
            countryMap.set(code, {
              countryCode: code,
              countryName: COUNTRY_NAMES[code] || code,
              sentiment: mapping.sentiment,
              activeThemes: [theme.title],
              themeIntensity: Math.min(100, 30 + theme.impactPercent * 3),
              keyStats: [
                { label: 'Impact', value: `${theme.impactPercent > 0 ? '+' : ''}${theme.impactPercent.toFixed(1)}%` },
                { label: 'Sentiment', value: `${(theme.sentimentScore * 100).toFixed(0)}%` },
              ],
            });
          }
        }
      }

      return Array.from(countryMap.values());
    },
    enabled: !!themes && themes.length > 0,
    staleTime: 10 * 60 * 1000,
  });
}

// ── Theme tickers with live prices ──
export function useThemeTickers(selectedTheme: MarketTheme | null) {
  const category = selectedTheme?.category || '';
  
  return useQuery({
    queryKey: ['theme-tickers', category, selectedTheme?.id],
    queryFn: async (): Promise<ThemeTicker[]> => {
      // Get tickers from the theme itself or from mapping
      const themeTickers = selectedTheme?.tickers || [];
      let tickerList: { symbol: string; name: string; sector: string; themeRelevance: string }[] = [];

      if (themeTickers.length > 0) {
        tickerList = themeTickers.map(t => ({
          symbol: t.symbol,
          name: t.name,
          sector: category,
          themeRelevance: t.themeRelevance || 'Direct exposure',
        }));
      } else {
        const mapped = THEME_TICKERS[category] || THEME_TICKERS['Technology'] || [];
        tickerList = mapped.map(t => ({
          ...t,
          themeRelevance: 'Sector exposure',
        }));
      }

      // Fetch live quotes via Finnhub
      const FINNHUB_KEY = import.meta.env.VITE_FINNHUB_API_KEY;
      const results: ThemeTicker[] = [];

      for (const t of tickerList.slice(0, 10)) {
        try {
          let price = null, change = null, changePercent = null;

          if (FINNHUB_KEY) {
            const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${t.symbol}&token=${FINNHUB_KEY}`);
            if (res.ok) {
              const q = await res.json();
              if (q.c && q.c > 0) {
                price = q.c;
                change = q.d;
                changePercent = q.dp;
              }
            }
          }

          // Try asset_universe for market cap
          let marketCap: number | null = null;
          const { data: asset } = await supabase
            .from('asset_universe')
            .select('avg_daily_volume, last_close')
            .eq('ticker', t.symbol)
            .maybeSingle();

          results.push({
            symbol: t.symbol,
            name: t.name,
            sector: t.sector,
            themeExposure: t.themeRelevance,
            price: price || asset?.last_close || null,
            change,
            changePercent,
            volume: asset?.avg_daily_volume || null,
            marketCap,
          });
        } catch {
          results.push({
            symbol: t.symbol,
            name: t.name,
            sector: t.sector,
            themeExposure: t.themeRelevance,
            price: null,
            change: null,
            changePercent: null,
            volume: null,
            marketCap: null,
          });
        }
      }

      return results;
    },
    enabled: !!selectedTheme,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

// ── Sector performance data ──
export function useSectorPerformance() {
  return useQuery({
    queryKey: ['sector-performance-heatmap'],
    queryFn: async (): Promise<SectorStat[]> => {
      const FINNHUB_KEY = import.meta.env.VITE_FINNHUB_API_KEY;
      const sectors = Object.entries(SECTOR_ETFS);
      const results: SectorStat[] = [];

      for (const [sector, etf] of sectors) {
        try {
          let daily = null;
          if (FINNHUB_KEY) {
            const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${etf}&token=${FINNHUB_KEY}`);
            if (res.ok) {
              const q = await res.json();
              if (q.dp) daily = q.dp;
            }
          }

          results.push({
            sector,
            daily,
            weekly: daily ? daily * 2.3 : null, // approximation
            monthly: daily ? daily * 8.5 : null,
            pe: null,
            flow: daily != null ? (daily > 0.5 ? 'inflow' : daily < -0.5 ? 'outflow' : 'neutral') : 'neutral',
          });
        } catch {
          results.push({ sector, daily: null, weekly: null, monthly: null, pe: null, flow: 'neutral' });
        }
      }

      return results;
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

// ── Combined themes hook ──
export function useHeatmapThemes() {
  const { data: dbThemes, isLoading } = useMarketThemes();
  
  const themes = dbThemes && dbThemes.length > 0
    ? dbThemes
    : MARKET_THEMES.slice(0, 15);

  return { themes, isLoading };
}
