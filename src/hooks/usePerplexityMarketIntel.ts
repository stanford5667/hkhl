import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cacheService } from '@/services/cacheService';
import { CACHE_TTL } from '@/config/cacheConfig';

export type IntelType = 'company_news' | 'competitors' | 'industry_trends' | 'ma_activity' | 'market_data' | 'regulatory' | 'earnings_events';

// Cache TTLs by intel type (in milliseconds)
const INTEL_CACHE_TTL: Record<IntelType, number> = {
  company_news: 4 * 60 * 60 * 1000,        // 4 hours
  competitors: 6 * 60 * 60 * 1000,         // 6 hours
  industry_trends: 24 * 60 * 60 * 1000,    // 24 hours
  ma_activity: 12 * 60 * 60 * 1000,        // 12 hours
  market_data: 7 * 24 * 60 * 60 * 1000,    // 7 days
  regulatory: 24 * 60 * 60 * 1000,         // 24 hours
  earnings_events: 12 * 60 * 60 * 1000,    // 12 hours
};

interface UseMarketIntelParams {
  type: IntelType;
  companyName?: string;
  companyId?: string;
  industry?: string;
  competitors?: string[];
  enabled?: boolean;
}

interface MarketIntelState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  lastFetched: Date | null;
  isCached: boolean;
  refresh: () => Promise<void>;
}

export function useMarketIntelQuery<T>({
  type,
  companyName,
  companyId,
  industry,
  competitors,
  enabled = true
}: UseMarketIntelParams): MarketIntelState<T> {
  const { user } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [isCached, setIsCached] = useState(false);

  const fetchingRef = useRef(false);
  const mountedRef = useRef(true);

  const cacheKey = `market-intel:${type}:${companyId || industry || 'general'}`;

  const fetchFromAPI = async (): Promise<T> => {
    const { data: responseData, error: fnError } = await supabase.functions.invoke('market-intel', {
      body: { 
        type,
        companyName, 
        industry: industry || 'General Business',
        competitors
      }
    });

    if (fnError) throw new Error(fnError.message);
    if (!responseData?.success) throw new Error(responseData?.error || 'Failed to fetch intel');

    return responseData.data as T;
  };

  const loadData = useCallback(async (forceRefresh = false) => {
    if (!enabled || !user || fetchingRef.current) return;

    fetchingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const result = await cacheService.getOrFetch<T>(
        cacheKey,
        fetchFromAPI,
        {
          ttl: INTEL_CACHE_TTL[type],
          forceRefresh,
          entityType: 'company',
          entityId: companyId,
          userId: user.id
        }
      );

      if (mountedRef.current) {
        setData(result.data);
        setLastFetched(new Date(result.fetchedAt));
        setIsCached(!forceRefresh && !result.isStale);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch market intel');
        console.error(`[MarketIntel:${type}] Error:`, err);
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
      fetchingRef.current = false;
    }
  }, [enabled, user, cacheKey, type, companyName, industry, competitors, companyId]);

  const refresh = useCallback(async () => {
    await loadData(true);
  }, [loadData]);

  useEffect(() => {
    mountedRef.current = true;
    if (user && enabled) {
      loadData(false);
    }

    return () => {
      mountedRef.current = false;
    };
  }, [type, companyId, industry, user?.id, enabled]);

  return {
    data,
    isLoading,
    error,
    lastFetched,
    isCached,
    refresh
  };
}

// Typed hooks for each intel type
export interface CompanyNewsData {
  articles: {
    title: string;
    summary: string;
    source: string;
    date: string;
    url?: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    relevance: 'high' | 'medium' | 'low';
  }[];
  keyTakeaway: string;
  signalStrength: 'strong' | 'moderate' | 'weak';
}

export interface CompetitorIntelData {
  competitors: {
    name: string;
    recentNews: {
      title: string;
      summary: string;
      date: string;
      impact: string;
      sentiment: 'positive' | 'negative' | 'neutral';
    }[];
    strategicMoves: string;
    threatLevel: 'high' | 'medium' | 'low';
  }[];
  competitiveLandscapeSummary: string;
  keyThreats: string[];
  keyOpportunities: string[];
}

export interface IndustryTrendsData {
  marketOverview: {
    currentState: string;
    outlook: 'positive' | 'neutral' | 'negative';
    outlookRationale: string;
  };
  trends: {
    name: string;
    description: string;
    impact: string;
    timeframe: string;
    sentiment: 'tailwind' | 'headwind' | 'neutral';
  }[];
  growthDrivers: {
    driver: string;
    description: string;
    strength: 'strong' | 'moderate' | 'weak';
  }[];
  headwinds: {
    challenge: string;
    description: string;
    severity: 'high' | 'medium' | 'low';
  }[];
  technologyDisruption: string;
  consolidationTrend: string;
}

export interface MAActivityData {
  recentDeals: {
    dealName: string;
    acquirer: string;
    target: string;
    dealValue: string;
    multiple: string;
    date: string;
    status: 'Announced' | 'Completed' | 'Pending';
    rationale: string;
    source: string;
  }[];
  dealActivity: {
    trend: 'increasing' | 'stable' | 'decreasing';
    description: string;
  };
  valuationTrends: {
    evEbitdaRange: string;
    evRevenueRange: string;
    premiumTrends: string;
  };
  activeBuyers: string[];
  hotSubsectors: string[];
  outlook: string;
}

export interface MarketDataResult {
  marketSize: {
    tam: { value: string; year: string; source: string };
    sam: { value: string; description: string };
  };
  growth: {
    historicalCagr: string;
    projectedCagr: string;
    projectionPeriod: string;
    source: string;
  };
  marketStructure: {
    fragmentation: string;
    topPlayersMarketShare: string;
    description: string;
  };
  keySegments: {
    segment: string;
    size: string;
    growth: string;
    trend: string;
  }[];
  geographicBreakdown: {
    northAmerica: string;
    europe: string;
    asiaPacific: string;
    other: string;
  };
  dataConfidence: 'high' | 'medium' | 'low';
  dataSources: string[];
}

export interface RegulatoryData {
  recentChanges: {
    title: string;
    description: string;
    effectiveDate: string;
    impact: string;
    impactLevel: 'high' | 'medium' | 'low';
    jurisdiction: string;
  }[];
  pendingLegislation: {
    name: string;
    status: string;
    likelihood: string;
    potentialImpact: string;
  }[];
  complianceAlerts: string[];
  regulatoryEnvironment: {
    trend: string;
    description: string;
  };
  keyAgencies: string[];
  riskAreas: string[];
}

export interface EarningsEventsData {
  upcomingEarnings: {
    company: string;
    date: string;
    quarter: string;
    consensus: string;
  }[];
  recentEarnings: {
    company: string;
    date: string;
    highlights: string;
    surprise: string;
    stockReaction: string;
  }[];
  industryEvents: {
    event: string;
    date: string;
    location: string;
    relevance: string;
    keyCompanies: string[];
  }[];
  analystDays: {
    company: string;
    date: string;
    focus: string;
  }[];
}

// Convenience hooks
export function useCompanyNews(companyName: string, companyId: string, industry: string, enabled = true) {
  return useMarketIntelQuery<CompanyNewsData>({
    type: 'company_news',
    companyName,
    companyId,
    industry,
    enabled
  });
}

export function useCompetitorIntel(companyName: string, companyId: string, industry: string, competitors: string[], enabled = true) {
  return useMarketIntelQuery<CompetitorIntelData>({
    type: 'competitors',
    companyName,
    companyId,
    industry,
    competitors,
    enabled
  });
}

export function useIndustryTrends(industry: string, companyId: string, enabled = true) {
  return useMarketIntelQuery<IndustryTrendsData>({
    type: 'industry_trends',
    industry,
    companyId,
    enabled
  });
}

export function useMAActivity(industry: string, companyId: string, enabled = true) {
  return useMarketIntelQuery<MAActivityData>({
    type: 'ma_activity',
    industry,
    companyId,
    enabled
  });
}

export function useMarketData(industry: string, companyId: string, enabled = true) {
  return useMarketIntelQuery<MarketDataResult>({
    type: 'market_data',
    industry,
    companyId,
    enabled
  });
}

export function useRegulatoryUpdates(industry: string, companyId: string, enabled = true) {
  return useMarketIntelQuery<RegulatoryData>({
    type: 'regulatory',
    industry,
    companyId,
    enabled
  });
}

export function useEarningsEvents(companyName: string, companyId: string, industry: string, competitors: string[], enabled = true) {
  return useMarketIntelQuery<EarningsEventsData>({
    type: 'earnings_events',
    companyName,
    companyId,
    industry,
    competitors,
    enabled
  });
}
