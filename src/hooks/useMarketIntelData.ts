/**
 * Market Intelligence Data Hooks
 * 
 * Hooks for fetching data from Alpha Vantage, FMP, and Finnhub
 * with proper caching, error handling, and performance ranking.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState, useCallback } from 'react';

// ============= Types =============

export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  volume: number;
  timestamp: string;
  source: string;
}

export interface ForexQuote {
  pair: string;
  base: string;
  quote: string;
  rate: number;
  change: number;
  changePercent: number;
  bid: number;
  ask: number;
  timestamp: string;
  source: string;
}

export interface IncomeStatement {
  date: string;
  symbol: string;
  revenue: number;
  netIncome: number;
  grossProfit: number;
  operatingIncome: number;
  ebitda: number;
  eps: number;
  period: string;
}

export interface CompanyProfile {
  symbol: string;
  companyName: string;
  industry: string;
  sector: string;
  marketCap: number;
  price: number;
  description: string;
  country: string;
  exchange: string;
  ceo: string;
  employees: number;
  website: string;
}

export interface EconomicCalendarEvent {
  id: string;
  event_date: string;
  event_time: string | null;
  event_name: string;
  event_type: string;
  description: string | null;
  importance: string;
  actual_value: string | null;
  forecast_value: string | null;
  previous_value: string | null;
  currency: string;
  country: string;
  source: string;
}

export interface PerformanceRank {
  component: string;
  uiPolish: number;
  dataAccuracy: number;
  loadingSpeed: number;
  overall: number;
  issues: string[];
  lastTested: string;
}

// ============= Hooks =============

/**
 * Fetch stock quotes from Alpha Vantage
 */
export function useStockQuotes(symbols: string[] = ['SPY', 'QQQ']) {
  return useQuery({
    queryKey: ['stock-quotes', symbols.join(',')],
    queryFn: async () => {
      const startTime = performance.now();
      
      const { data, error } = await supabase.functions.invoke('alpha-vantage-quotes', {
        body: { action: 'quotes', symbols }
      });
      
      if (error) throw error;
      
      const loadTime = performance.now() - startTime;
      
      return {
        quotes: (data?.quotes || []) as StockQuote[],
        useMockData: data?.useMockData || false,
        source: data?.source || 'Unknown',
        cachedAt: data?.cachedAt,
        loadTimeMs: loadTime,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Fetch forex quotes from Alpha Vantage
 */
export function useForexQuotes(pairs: string[] = ['EUR/USD']) {
  return useQuery({
    queryKey: ['forex-quotes', pairs.join(',')],
    queryFn: async () => {
      const startTime = performance.now();
      
      const { data, error } = await supabase.functions.invoke('alpha-vantage-quotes', {
        body: { action: 'forex', pairs }
      });
      
      if (error) throw error;
      
      const loadTime = performance.now() - startTime;
      
      return {
        forex: (data?.forex || []) as ForexQuote[],
        useMockData: data?.useMockData || false,
        source: data?.source || 'Unknown',
        cachedAt: data?.cachedAt,
        loadTimeMs: loadTime,
      };
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Fetch company fundamentals from FMP
 */
export function useCompanyFundamentals(symbol: string) {
  return useQuery({
    queryKey: ['company-fundamentals', symbol],
    queryFn: async () => {
      if (!symbol) return null;
      
      const startTime = performance.now();
      
      const { data, error } = await supabase.functions.invoke('fmp-fundamentals', {
        body: { action: 'fundamentals', symbol }
      });
      
      if (error) throw error;
      
      const loadTime = performance.now() - startTime;
      
      return {
        profile: data?.profile as CompanyProfile | null,
        financials: (data?.financials || []) as IncomeStatement[],
        useMockData: data?.useMockData || false,
        source: data?.source || 'Unknown',
        cachedAt: data?.cachedAt,
        loadTimeMs: loadTime,
      };
    },
    enabled: !!symbol,
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 2 * 60 * 60 * 1000, // 2 hours
    refetchOnWindowFocus: false,
  });
}

/**
 * Search for company symbols via FMP
 */
export function useCompanySearch() {
  const [query, setQuery] = useState('');
  
  const searchQuery = useQuery({
    queryKey: ['company-search', query],
    queryFn: async () => {
      if (!query.trim()) return { results: [], useMockData: false, source: 'None' };
      
      const { data, error } = await supabase.functions.invoke('fmp-fundamentals', {
        body: { action: 'search', query }
      });
      
      if (error) throw error;
      
      return {
        results: data?.results || [],
        useMockData: data?.useMockData || false,
        source: data?.source || 'Unknown',
      };
    },
    enabled: query.length >= 1,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
  
  return { ...searchQuery, query, setQuery };
}

/**
 * Fetch economic calendar from Finnhub
 */
export function useFinnhubCalendar(daysAhead: number = 90) {
  return useQuery({
    queryKey: ['finnhub-calendar', daysAhead],
    queryFn: async () => {
      const startTime = performance.now();
      
      const { data, error } = await supabase.functions.invoke('finnhub-calendar', {
        body: { action: 'fetch', daysAhead }
      });
      
      if (error) throw error;
      
      const loadTime = performance.now() - startTime;
      
      return {
        events: (data?.events || []) as EconomicCalendarEvent[],
        count: data?.count || 0,
        useMockData: data?.useMockData || false,
        source: data?.source || 'Unknown',
        dateRange: data?.dateRange,
        cachedAt: data?.cachedAt,
        loadTimeMs: loadTime,
      };
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// ============= Performance Tracking =============

const performanceStore: Record<string, PerformanceRank> = {};

export function usePerformanceTracker() {
  const [ranks, setRanks] = useState<PerformanceRank[]>([]);
  
  const trackPerformance = useCallback((
    component: string, 
    loadTimeMs: number, 
    dataAccuracy: number, 
    issues: string[] = []
  ) => {
    // Calculate scores
    const loadingSpeed = Math.max(0, Math.min(10, 10 - (loadTimeMs / 500))); // 0-500ms = 10-0
    const uiPolish = issues.length === 0 ? 10 : Math.max(0, 10 - issues.length * 2);
    const overall = Math.round((uiPolish + dataAccuracy + loadingSpeed) / 3 * 10) / 10;
    
    const rank: PerformanceRank = {
      component,
      uiPolish,
      dataAccuracy,
      loadingSpeed: Math.round(loadingSpeed * 10) / 10,
      overall,
      issues,
      lastTested: new Date().toISOString(),
    };
    
    performanceStore[component] = rank;
    setRanks(Object.values(performanceStore));
    
    return rank;
  }, []);
  
  return { ranks, trackPerformance };
}

/**
 * Validate Fed rate data accuracy for Jan 2026
 */
export function validateFedRateData(data: any): { 
  isValid: boolean; 
  accuracy: number; 
  issues: string[] 
} {
  const issues: string[] = [];
  
  // Expected values for Jan 2026
  const EXPECTED_TARGET_RANGE = '3.50% - 3.75%';
  const EXPECTED_EFFECTIVE_RATE = 3.64;
  
  // Check if data contains correct Fed rate information
  if (data?.currentRange !== EXPECTED_TARGET_RANGE && 
      !data?.currentRange?.includes('3.50') && 
      !data?.currentRange?.includes('3.75')) {
    issues.push(`Fed target range mismatch: expected ${EXPECTED_TARGET_RANGE}`);
  }
  
  if (data?.effectiveRate && Math.abs(data.effectiveRate - EXPECTED_EFFECTIVE_RATE) > 0.05) {
    issues.push(`Effective rate mismatch: expected ${EXPECTED_EFFECTIVE_RATE}%`);
  }
  
  const accuracy = issues.length === 0 ? 10 : Math.max(0, 10 - issues.length * 3);
  
  return {
    isValid: issues.length === 0,
    accuracy,
    issues,
  };
}
