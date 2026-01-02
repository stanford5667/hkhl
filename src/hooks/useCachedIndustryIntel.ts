import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useDevMode } from '@/contexts/DevModeContext';
import { cacheService, CacheEntry } from '@/services/cacheService';
import { CACHE_TTL, CACHE_KEYS } from '@/config/cacheConfig';
import { API_CONFIG, logBlockedApiCall } from '@/config/apiConfig';

export interface IndustryIntelData {
  summary: string;
  metrics: {
    marketSize: string;
    growth: string;
    avgMultiple: string;
    dealVolume: string;
  };
  news: Array<{
    title: string;
    source: string;
    date: string;
    url: string;
    sentiment: 'positive' | 'negative' | 'neutral';
  }>;
  sources: string[];
}

interface UseCachedIndustryIntelOptions {
  enabled?: boolean;
}

interface UseCachedIndustryIntelReturn {
  data: IndustryIntelData | null;
  isLoading: boolean;
  error: string | null;
  lastFetched: Date | null;
  expiresAt: Date | null;
  isStale: boolean;
  refresh: () => Promise<void>;
  timeUntilRefresh: string;
}

export function useCachedIndustryIntel(
  companyId: string,
  companyName: string,
  industry: string | null,
  options: UseCachedIndustryIntelOptions = {}
): UseCachedIndustryIntelReturn {
  const { enabled = true } = options;
  const { user } = useAuth();
  const { marketDataEnabled, logApiCall } = useDevMode();
  
  const [data, setData] = useState<IndustryIntelData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [isStale, setIsStale] = useState(false);
  
  const fetchingRef = useRef(false);
  const mountedRef = useRef(true);
  
  const cacheKey = CACHE_KEYS.perplexityIndustryIntel(companyId);
  
  // The actual API call to edge function
  const fetchFromAPI = async (): Promise<IndustryIntelData> => {
    // KILL SWITCH - Block all Perplexity API calls
    if (!API_CONFIG.ENABLE_PERPLEXITY) {
      logBlockedApiCall(`Perplexity industry-intel: ${companyName}`);
      throw new Error('Perplexity API disabled for testing');
    }
    
    // Block API calls when market data is disabled
    if (!marketDataEnabled) {
      throw new Error('Market data is paused. Enable live data to fetch.');
    }
    
    logApiCall(`Perplexity industry-intel: ${companyName}`);
    
    const { data: responseData, error: fnError } = await supabase.functions.invoke('industry-intel', {
      body: { 
        companyName, 
        industry: industry || 'General Business' 
      }
    });
    
    if (fnError) throw new Error(fnError.message);
    if (!responseData?.success) throw new Error(responseData?.error || 'Failed to fetch intel');
    
    // Extract the nested data and map to our expected format
    const apiData = responseData.data;
    return {
      summary: apiData.aiSummary || '',
      metrics: {
        marketSize: apiData.keyMetrics?.marketSize || 'N/A',
        growth: apiData.keyMetrics?.growthRate || 'N/A',
        avgMultiple: apiData.keyMetrics?.avgMultiple || 'N/A',
        dealVolume: apiData.keyMetrics?.dealVolume || 'N/A'
      },
      news: (apiData.news || []).map((item: any) => ({
        title: item.title,
        source: item.source,
        date: item.date,
        url: item.url || '',
        sentiment: item.sentiment || 'neutral'
      })),
      sources: responseData.citations || []
    };
  };
  
  // Load data (from cache or API)
  const loadData = useCallback(async (forceRefresh = false) => {
    if (!enabled || !companyId || !user || fetchingRef.current) return;
    
    // If market data is disabled and we're forcing a refresh, show error
    if (!marketDataEnabled && forceRefresh) {
      setError('Market data is paused. Enable live data to refresh.');
      return;
    }
    
    fetchingRef.current = true;
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await cacheService.getOrFetch<IndustryIntelData>(
        cacheKey,
        fetchFromAPI,
        {
          ttl: CACHE_TTL.PERPLEXITY_INDUSTRY_INTEL,
          forceRefresh,
          entityType: 'company',
          entityId: companyId,
          userId: user.id
        }
      );
      
      if (mountedRef.current) {
        setData(result.data);
        setLastFetched(new Date(result.fetchedAt));
        setExpiresAt(new Date(result.expiresAt));
        setIsStale(result.isStale);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch industry intel');
        console.error('[IndustryIntel] Error:', err);
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
      fetchingRef.current = false;
    }
  }, [enabled, companyId, user, cacheKey, companyName, industry]);
  
  // Manual refresh
  const refresh = useCallback(async () => {
    await loadData(true);
  }, [loadData]);
  
  // Calculate time until refresh
  const timeUntilRefresh = expiresAt 
    ? formatTimeUntil(expiresAt) 
    : 'Unknown';
  
  // Initial load
  useEffect(() => {
    mountedRef.current = true;
    if (user) {
      loadData(false);
    }
    
    return () => {
      mountedRef.current = false;
    };
  }, [companyId, user?.id]);
  
  return {
    data,
    isLoading,
    error,
    lastFetched,
    expiresAt,
    isStale,
    refresh,
    timeUntilRefresh
  };
}

function formatTimeUntil(date: Date): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  
  if (diff <= 0) return 'Expired';
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
