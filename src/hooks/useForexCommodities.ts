/**
 * Hook for fetching real-time commodities and forex data
 * Uses Polygon.io API via edge function
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CommodityData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  prevClose: number;
  timestamp: string;
  unit?: string;
  category: string;
}

export interface ForexData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  prevClose: number;
  timestamp: string;
  category: string;
  base?: string;
  quote?: string;
}

interface ForexCommoditiesResponse {
  ok: boolean;
  commodities: CommodityData[];
  forex: ForexData[];
  timestamp: string;
  error?: string;
}

export function useCommodities() {
  const [data, setData] = useState<CommodityData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data: responseData, error: fetchError } = await supabase.functions.invoke<ForexCommoditiesResponse>(
        'polygon-forex-commodities',
        { body: { type: 'commodities' } }
      );

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      if (!responseData?.ok) {
        throw new Error(responseData?.error || 'Failed to fetch commodities data');
      }

      setData(responseData.commodities || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('[useCommodities] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    
    // Refresh every 60 seconds
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return { data, isLoading, error, lastUpdated, refetch: fetchData };
}

export function useForex() {
  const [data, setData] = useState<ForexData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data: responseData, error: fetchError } = await supabase.functions.invoke<ForexCommoditiesResponse>(
        'polygon-forex-commodities',
        { body: { type: 'forex' } }
      );

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      if (!responseData?.ok) {
        throw new Error(responseData?.error || 'Failed to fetch forex data');
      }

      setData(responseData.forex || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('[useForex] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    
    // Refresh every 60 seconds
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return { data, isLoading, error, lastUpdated, refetch: fetchData };
}

export function useForexAndCommodities() {
  const [commodities, setCommodities] = useState<CommodityData[]>([]);
  const [forex, setForex] = useState<ForexData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data: responseData, error: fetchError } = await supabase.functions.invoke<ForexCommoditiesResponse>(
        'polygon-forex-commodities',
        { body: { type: 'both' } }
      );

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      if (!responseData?.ok) {
        throw new Error(responseData?.error || 'Failed to fetch data');
      }

      setCommodities(responseData.commodities || []);
      setForex(responseData.forex || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('[useForexAndCommodities] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    
    // Refresh every 60 seconds
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return { commodities, forex, isLoading, error, lastUpdated, refetch: fetchData };
}

// Helper function to group commodities by category
export function groupCommoditiesByCategory(commodities: CommodityData[]) {
  return {
    metals: commodities.filter(c => c.category === 'metals'),
    energy: commodities.filter(c => c.category === 'energy'),
    agriculture: commodities.filter(c => c.category === 'agriculture'),
  };
}

// Helper function to group forex by category
export function groupForexByCategory(forex: ForexData[]) {
  return {
    major: forex.filter(f => f.category === 'major'),
    cross: forex.filter(f => f.category === 'cross'),
    emerging: forex.filter(f => f.category === 'emerging'),
  };
}
