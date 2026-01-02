import { supabase } from '@/integrations/supabase/client';
import { 
  getMockStock, 
  getMockIndex, 
  getMockIndicator, 
  searchMockStocks,
  MOCK_DATA_DATE,
  type MockQuote,
  type MockIndex,
  type MockIndicator
} from '@/data/mockMarketData';

export type DataSource = 'live' | 'cache' | 'mock';

export interface DataWithSource<T> {
  data: T | null;
  source: DataSource;
  cachedAt?: string;
  isMock: boolean;
  isStale: boolean;
}

const CACHE_MAX_AGE_HOURS = 24;

// Check if cached data is still valid
function isCacheValid(cachedAt: string | null, maxAgeHours = CACHE_MAX_AGE_HOURS): boolean {
  if (!cachedAt) return false;
  const cacheTime = new Date(cachedAt).getTime();
  const now = Date.now();
  const ageHours = (now - cacheTime) / (1000 * 60 * 60);
  return ageHours < maxAgeHours;
}

// Get staleness level
export function getStalenessLevel(cachedAt: string | null): 'fresh' | 'slight' | 'stale' | 'very-stale' {
  if (!cachedAt) return 'very-stale';
  const cacheTime = new Date(cachedAt).getTime();
  const now = Date.now();
  const ageMinutes = (now - cacheTime) / (1000 * 60);
  
  if (ageMinutes < 5) return 'fresh';
  if (ageMinutes < 60) return 'slight';
  if (ageMinutes < 24 * 60) return 'stale';
  return 'very-stale';
}

// Try to get data from Supabase cache
async function getCachedData(cacheKey: string): Promise<{ data: unknown; cachedAt: string } | null> {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.user) return null;

    const { data, error } = await supabase
      .from('cached_api_data')
      .select('data, fetched_at')
      .eq('cache_key', cacheKey)
      .eq('user_id', session.session.user.id)
      .maybeSingle();

    if (error || !data) return null;
    
    return {
      data: data.data,
      cachedAt: data.fetched_at || new Date().toISOString()
    };
  } catch {
    return null;
  }
}

// Get stock quote with fallback chain: cache -> mock
export async function getCachedOrMockQuote(symbol: string): Promise<DataWithSource<MockQuote>> {
  const cacheKey = `quote:${symbol.toUpperCase()}`;
  
  // Try cache first
  const cached = await getCachedData(cacheKey);
  if (cached && isCacheValid(cached.cachedAt)) {
    return {
      data: cached.data as MockQuote,
      source: 'cache',
      cachedAt: cached.cachedAt,
      isMock: false,
      isStale: getStalenessLevel(cached.cachedAt) !== 'fresh'
    };
  }

  // Fall back to mock data
  const mockData = getMockStock(symbol);
  if (mockData) {
    return {
      data: mockData,
      source: 'mock',
      cachedAt: MOCK_DATA_DATE,
      isMock: true,
      isStale: true
    };
  }

  // No data available
  return {
    data: null,
    source: 'mock',
    isMock: true,
    isStale: true
  };
}

// Get index with fallback chain: cache -> mock
export async function getCachedOrMockIndex(symbol: string): Promise<DataWithSource<MockIndex>> {
  const cacheKey = `index:${symbol.toUpperCase()}`;
  
  const cached = await getCachedData(cacheKey);
  if (cached && isCacheValid(cached.cachedAt)) {
    return {
      data: cached.data as MockIndex,
      source: 'cache',
      cachedAt: cached.cachedAt,
      isMock: false,
      isStale: getStalenessLevel(cached.cachedAt) !== 'fresh'
    };
  }

  const mockData = getMockIndex(symbol);
  if (mockData) {
    return {
      data: mockData,
      source: 'mock',
      cachedAt: MOCK_DATA_DATE,
      isMock: true,
      isStale: true
    };
  }

  return {
    data: null,
    source: 'mock',
    isMock: true,
    isStale: true
  };
}

// Get indicator with fallback chain: cache -> mock
export async function getCachedOrMockIndicator(symbol: string): Promise<DataWithSource<MockIndicator>> {
  const cacheKey = `indicator:${symbol.toUpperCase()}`;
  
  const cached = await getCachedData(cacheKey);
  if (cached && isCacheValid(cached.cachedAt)) {
    return {
      data: cached.data as MockIndicator,
      source: 'cache',
      cachedAt: cached.cachedAt,
      isMock: false,
      isStale: getStalenessLevel(cached.cachedAt) !== 'fresh'
    };
  }

  const mockData = getMockIndicator(symbol);
  if (mockData) {
    return {
      data: mockData,
      source: 'mock',
      cachedAt: MOCK_DATA_DATE,
      isMock: true,
      isStale: true
    };
  }

  return {
    data: null,
    source: 'mock',
    isMock: true,
    isStale: true
  };
}

// Search stocks with fallback to mock
export async function searchStocksWithFallback(query: string, liveSearchEnabled: boolean): Promise<{
  results: MockQuote[];
  source: DataSource;
  message?: string;
}> {
  if (!liveSearchEnabled) {
    // Return mock search results
    const mockResults = searchMockStocks(query);
    return {
      results: mockResults,
      source: 'mock',
      message: mockResults.length > 0 
        ? 'Showing sample data. Enable live data for real-time results.'
        : 'No sample data available for this search.'
    };
  }

  // If live search is enabled, we'd call the actual API
  // For now, return mock as fallback
  const mockResults = searchMockStocks(query);
  return {
    results: mockResults,
    source: 'mock',
    message: 'Showing cached results.'
  };
}

// Batch get quotes with fallback
export async function batchGetCachedOrMockQuotes(symbols: string[]): Promise<Map<string, DataWithSource<MockQuote>>> {
  const results = new Map<string, DataWithSource<MockQuote>>();
  
  // Process in parallel
  const promises = symbols.map(async (symbol) => {
    const result = await getCachedOrMockQuote(symbol);
    results.set(symbol.toUpperCase(), result);
  });
  
  await Promise.all(promises);
  return results;
}
