import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface RegionEvent {
  id: string;
  title: string;
  description: string | null;
  source: string | null;
  source_url: string | null;
  category: string | null;
  detected_at: string;
  entities: string[] | null;
  related_markets: string[] | null;
  sentiment_score: number | null;
}

// Map country codes to keywords that would appear in news about that country/region
const COUNTRY_KEYWORDS: Record<string, string[]> = {
  US: ['united states', 'u.s.', 'america', 'fed ', 'federal reserve', 'wall street', 'nasdaq', 's&p 500', 'dow jones', 'congress', 'white house', 'treasury', 'washington', 'biden', 'trump', 'sec '],
  CN: ['china', 'chinese', 'beijing', 'shanghai', 'pboc', 'xi jinping', 'csi 300', 'hang seng', 'shenzhen', 'yuan', 'renminbi', 'trade war'],
  JP: ['japan', 'japanese', 'tokyo', 'nikkei', 'bank of japan', 'boj', 'yen'],
  GB: ['uk ', 'u.k.', 'britain', 'british', 'london', 'ftse', 'bank of england', 'boe', 'sterling', 'pound'],
  DE: ['germany', 'german', 'berlin', 'dax', 'bundesbank', 'frankfurt'],
  FR: ['france', 'french', 'paris', 'cac 40', 'macron'],
  IN: ['india', 'indian', 'mumbai', 'sensex', 'nifty', 'rbi', 'rupee', 'modi'],
  BR: ['brazil', 'brazilian', 'bovespa', 'real ', 'sao paulo'],
  KR: ['south korea', 'korean', 'seoul', 'kospi', 'samsung'],
  AU: ['australia', 'australian', 'sydney', 'asx', 'rba'],
  CA: ['canada', 'canadian', 'toronto', 'tsx', 'bank of canada', 'loonie'],
  CH: ['switzerland', 'swiss', 'zurich', 'snb', 'franc'],
  SG: ['singapore', 'singaporean', 'sti index', 'mas'],
  TW: ['taiwan', 'taiwanese', 'taiex', 'tsmc', 'taipei'],
  NL: ['netherlands', 'dutch', 'amsterdam', 'aex'],
  SE: ['sweden', 'swedish', 'stockholm', 'riksbank'],
  IL: ['israel', 'israeli', 'tel aviv', 'shekel'],
  SA: ['saudi', 'riyadh', 'aramco', 'tadawul', 'opec'],
  AE: ['uae', 'emirates', 'dubai', 'abu dhabi'],
  IR: ['iran', 'iranian', 'tehran'],
  RU: ['russia', 'russian', 'moscow', 'ruble', 'kremlin', 'putin'],
  UA: ['ukraine', 'ukrainian', 'kyiv', 'zelensky'],
  NG: ['nigeria', 'nigerian', 'lagos', 'naira'],
  ZA: ['south africa', 'johannesburg', 'rand', 'jse'],
  TR: ['turkey', 'turkish', 'istanbul', 'lira', 'erdogan'],
  MX: ['mexico', 'mexican', 'peso', 'banxico'],
  EG: ['egypt', 'egyptian', 'cairo'],
  PK: ['pakistan', 'pakistani', 'karachi'],
  ID: ['indonesia', 'indonesian', 'jakarta'],
  TH: ['thailand', 'thai', 'bangkok', 'baht'],
  VN: ['vietnam', 'vietnamese', 'hanoi'],
  PL: ['poland', 'polish', 'warsaw'],
  AR: ['argentina', 'argentine', 'buenos aires'],
  // Broader region keywords
  EU: ['eurozone', 'ecb', 'european central bank', 'euro ', 'europe'],
};

// Also match broader regions to countries
const REGION_GROUPS: Record<string, string[]> = {
  EU: ['DE', 'FR', 'NL', 'SE', 'PL', 'CZ'],
  'Middle East': ['SA', 'AE', 'IR', 'IQ', 'SY', 'YE', 'IL'],
  Asia: ['CN', 'JP', 'KR', 'TW', 'SG', 'TH', 'VN', 'ID'],
  'Latin America': ['BR', 'MX', 'AR'],
  Africa: ['NG', 'ZA', 'KE', 'GH', 'EG'],
};

const REGION_KEYWORDS: Record<string, string[]> = {
  'Middle East': ['middle east', 'opec', 'gulf', 'persian gulf'],
  Asia: ['asia', 'asian', 'apac', 'asia-pacific'],
  'Latin America': ['latin america', 'latam'],
  Africa: ['africa', 'african'],
  EU: ['eurozone', 'ecb', 'european union', 'eu '],
};

function matchesCountry(text: string, countryCode: string): boolean {
  const lower = text.toLowerCase();
  const keywords = COUNTRY_KEYWORDS[countryCode];
  if (keywords) {
    return keywords.some(kw => lower.includes(kw));
  }
  return false;
}

function matchesRegion(text: string, countryCode: string): boolean {
  const lower = text.toLowerCase();
  // Check direct country match
  if (matchesCountry(text, countryCode)) return true;

  // Check if country belongs to a region group that matches
  for (const [region, countries] of Object.entries(REGION_GROUPS)) {
    if (countries.includes(countryCode)) {
      const regionKws = REGION_KEYWORDS[region];
      if (regionKws?.some(kw => lower.includes(kw))) return true;
    }
  }
  return false;
}

/**
 * Fetch news events filtered by region/country code.
 * Uses keyword matching on title + description since events don't store country data.
 */
export function useRegionNews(countryCode: string | null, limit: number = 50) {
  return useQuery({
    queryKey: ['region-news', countryCode, limit],
    queryFn: async (): Promise<RegionEvent[]> => {
      if (!countryCode) return [];

      // Fetch a larger set and filter client-side by keywords
      const { data, error } = await supabase
        .from('real_world_events')
        .select('id, title, description, source, source_url, category, detected_at, entities, related_markets, sentiment_score')
        .order('detected_at', { ascending: false })
        .limit(200);

      if (error) {
        console.error('[useRegionNews] Error:', error);
        return [];
      }

      if (!data) return [];

      // Filter events relevant to this country
      const filtered = data.filter((event) => {
        const text = `${event.title || ''} ${event.description || ''}`;
        return matchesRegion(text, countryCode);
      });

      return filtered.slice(0, limit) as RegionEvent[];
    },
    enabled: !!countryCode,
    staleTime: 60_000,
  });
}

// Also export for use in the global stream with region tagging
export function detectCountries(title: string, description?: string | null): string[] {
  const text = `${title} ${description || ''}`;
  const matched: string[] = [];
  for (const code of Object.keys(COUNTRY_KEYWORDS)) {
    if (matchesCountry(text, code)) matched.push(code);
  }
  return matched;
}
