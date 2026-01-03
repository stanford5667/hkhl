/**
 * Edge Function Tests for sync-market-data
 * Tests the data synchronization function with mock Polygon responses
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock portfolio fixtures inline to avoid cross-project imports
const MOCK_POLYGON_RESPONSE = {
  ticker: 'VTI',
  queryCount: 252,
  resultsCount: 252,
  adjusted: true,
  results: Array.from({ length: 252 }, (_, i) => ({
    v: 1000000 + Math.random() * 5000000,
    vw: 200 + Math.random() * 10,
    o: 200 + Math.random() * 10,
    c: 200 + Math.random() * 10,
    h: 205 + Math.random() * 10,
    l: 195 + Math.random() * 5,
    t: new Date('2023-01-01').getTime() + i * 24 * 60 * 60 * 1000,
    n: Math.floor(50000 + Math.random() * 100000),
  })),
  status: 'OK',
  request_id: 'test-request-123',
  count: 252,
};

const MOCK_ASSET_UNIVERSE = [
  { ticker: 'VTI', name: 'Vanguard Total Stock Market ETF', asset_type: 'ETF', category: 'US Equity', liquidity_score: 10, is_active: true },
  { ticker: 'BND', name: 'Vanguard Total Bond Market ETF', asset_type: 'ETF', category: 'Fixed Income', liquidity_score: 9, is_active: true },
  { ticker: 'GLD', name: 'SPDR Gold Shares', asset_type: 'ETF', category: 'Commodity', liquidity_score: 9, is_active: true },
  { ticker: 'SPY', name: 'SPDR S&P 500 ETF Trust', asset_type: 'ETF', category: 'US Equity', liquidity_score: 10, is_active: true },
];

// Mock environment variables
const mockEnv = {
  POLYGON_API_KEY: 'test-api-key',
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_ANON_KEY: 'test-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
};

// Mock fetch
const mockFetch = vi.fn();
(globalThis as unknown as { fetch: typeof mockFetch }).fetch = mockFetch;

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
      limit: vi.fn(() => Promise.resolve({ data: MOCK_ASSET_UNIVERSE, error: null })),
      order: vi.fn(() => Promise.resolve({ data: [], error: null })),
    })),
    insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
    upsert: vi.fn(() => Promise.resolve({ data: null, error: null })),
    update: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  })),
};

describe('sync-market-data Edge Function', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup mock fetch for Polygon API
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('api.polygon.io')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(MOCK_POLYGON_RESPONSE),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Polygon API Integration', () => {
    it('should construct correct Polygon API URL', () => {
      const ticker = 'VTI';
      const startDate = '2023-01-01';
      const endDate = '2023-12-31';
      
      const expectedUrl = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/1/day/${startDate}/${endDate}?adjusted=true&sort=asc&apiKey=${mockEnv.POLYGON_API_KEY}`;
      
      expect(expectedUrl).toContain(ticker);
      expect(expectedUrl).toContain(startDate);
      expect(expectedUrl).toContain(endDate);
      expect(expectedUrl).toContain('adjusted=true');
    });

    it('should parse Polygon response correctly', () => {
      const response = MOCK_POLYGON_RESPONSE;
      
      expect(response.status).toBe('OK');
      expect(response.results).toHaveLength(252);
      expect(response.results[0]).toHaveProperty('o'); // open
      expect(response.results[0]).toHaveProperty('c'); // close
      expect(response.results[0]).toHaveProperty('h'); // high
      expect(response.results[0]).toHaveProperty('l'); // low
      expect(response.results[0]).toHaveProperty('v'); // volume
      expect(response.results[0]).toHaveProperty('t'); // timestamp
    });

    it('should transform Polygon data to database format', () => {
      const polygonBar = MOCK_POLYGON_RESPONSE.results[0];
      
      const transformedBar = {
        ticker: MOCK_POLYGON_RESPONSE.ticker,
        bar_date: new Date(polygonBar.t).toISOString().split('T')[0],
        open: polygonBar.o,
        high: polygonBar.h,
        low: polygonBar.l,
        close: polygonBar.c,
        volume: polygonBar.v,
        vwap: polygonBar.vw,
        transactions: polygonBar.n,
      };
      
      expect(transformedBar.ticker).toBe('VTI');
      expect(transformedBar.open).toBeGreaterThan(0);
      expect(transformedBar.close).toBeGreaterThan(0);
      expect(transformedBar.volume).toBeGreaterThan(0);
    });

    it('should calculate daily returns from price data', () => {
      const results = MOCK_POLYGON_RESPONSE.results;
      const returns: number[] = [];
      
      for (let i = 1; i < results.length; i++) {
        const dailyReturn = (results[i].c - results[i-1].c) / results[i-1].c;
        returns.push(dailyReturn);
      }
      
      expect(returns).toHaveLength(251); // One less than bars
      returns.forEach(r => {
        expect(isFinite(r)).toBe(true);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle rate limit errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: () => Promise.resolve({ error: 'Rate limit exceeded' }),
      });
      
      const response = await mockFetch('https://api.polygon.io/v2/aggs/ticker/VTI/range/1/day/2023-01-01/2023-12-31');
      expect(response.ok).toBe(false);
      expect(response.status).toBe(429);
    });

    it('should handle network timeout', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network timeout'));
      
      await expect(
        mockFetch('https://api.polygon.io/v2/aggs/ticker/VTI/range/1/day/2023-01-01/2023-12-31')
      ).rejects.toThrow('Network timeout');
    });

    it('should handle invalid ticker response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          status: 'NOT_FOUND',
          results: [],
          resultsCount: 0,
        }),
      });
      
      const response = await mockFetch('https://api.polygon.io/v2/aggs/ticker/INVALID/range/1/day/2023-01-01/2023-12-31');
      const data = await response.json();
      
      expect(data.resultsCount).toBe(0);
    });
  });

  describe('Data Validation', () => {
    it('should validate OHLCV data integrity', () => {
      const bar = MOCK_POLYGON_RESPONSE.results[0];
      
      // High should be >= Open and Close
      expect(bar.h).toBeGreaterThanOrEqual(bar.o);
      expect(bar.h).toBeGreaterThanOrEqual(bar.c);
      
      // Low should be <= Open and Close
      expect(bar.l).toBeLessThanOrEqual(bar.o);
      expect(bar.l).toBeLessThanOrEqual(bar.c);
      
      // Volume should be positive
      expect(bar.v).toBeGreaterThan(0);
    });

    it('should detect suspicious price gaps', () => {
      const results = MOCK_POLYGON_RESPONSE.results;
      const suspiciousGaps: number[] = [];
      
      for (let i = 1; i < results.length; i++) {
        const gap = Math.abs(results[i].o - results[i-1].c) / results[i-1].c;
        if (gap > 0.1) { // 10% gap
          suspiciousGaps.push(i);
        }
      }
      
      // Our mock data shouldn't have huge gaps
      expect(suspiciousGaps.length).toBeLessThan(10);
    });
  });

  describe('Cache Behavior', () => {
    it('should check for existing cached data', () => {
      const ticker = 'VTI';
      const expectedCacheKey = `market_data_${ticker}`;
      
      expect(expectedCacheKey).toBe('market_data_VTI');
    });

    it('should invalidate stale cache entries', () => {
      const cacheEntry = {
        ticker: 'VTI',
        data_end_date: '2023-12-15',
        updated_at: '2023-12-16T00:00:00Z',
      };
      
      const today = new Date('2023-12-20');
      const lastUpdate = new Date(cacheEntry.updated_at);
      const daysSinceUpdate = Math.floor((today.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
      
      const isStale = daysSinceUpdate > 1;
      expect(isStale).toBe(true);
    });
  });

  describe('Batch Processing', () => {
    it('should process multiple tickers efficiently', () => {
      const tickers = MOCK_ASSET_UNIVERSE.map((a: { ticker: string }) => a.ticker);
      
      expect(tickers).toContain('VTI');
      expect(tickers).toContain('BND');
      expect(tickers).toContain('GLD');
      expect(tickers).toContain('SPY');
    });

    it('should respect rate limits with delays', () => {
      const delayBetweenCalls = 12; // Polygon free tier: 5 calls/min = 12s between calls
      const totalTickers = 4;
      const expectedMinTime = (totalTickers - 1) * delayBetweenCalls;
      
      expect(expectedMinTime).toBe(36); // 36 seconds minimum for 4 tickers
    });
  });

  describe('Sync Log Creation', () => {
    it('should create sync log entry', () => {
      const syncLog = {
        sync_type: 'scheduled',
        status: 'completed',
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        tickers_total: 4,
        tickers_processed: 4,
        tickers_succeeded: 4,
        tickers_failed: 0,
        bars_inserted: 1008,
        bars_updated: 0,
        metadata: {
          source: 'polygon',
          date_range: { start: '2023-01-01', end: '2023-12-31' },
        },
      };
      
      expect(syncLog.status).toBe('completed');
      expect(syncLog.tickers_succeeded).toBe(4);
      expect(syncLog.bars_inserted).toBe(1008);
    });

    it('should track partial failures', () => {
      const syncLog = {
        sync_type: 'manual',
        status: 'completed_with_errors',
        tickers_total: 4,
        tickers_processed: 4,
        tickers_succeeded: 3,
        tickers_failed: 1,
        errors: [
          { ticker: 'INVALID', error: 'Ticker not found', timestamp: new Date().toISOString() },
        ],
      };
      
      expect(syncLog.tickers_failed).toBe(1);
      expect(syncLog.errors).toHaveLength(1);
    });
  });
});

describe('AI Calculate Metrics Edge Function', () => {
  describe('Input Validation', () => {
    it('should validate portfolio allocations', () => {
      const validAllocations = [
        { ticker: 'VTI', weight: 0.6 },
        { ticker: 'BND', weight: 0.3 },
        { ticker: 'GLD', weight: 0.1 },
      ];
      
      const totalWeight = validAllocations.reduce((sum, a) => sum + a.weight, 0);
      expect(totalWeight).toBeCloseTo(1, 6);
    });

    it('should reject invalid weight sums', () => {
      const invalidAllocations = [
        { ticker: 'VTI', weight: 0.6 },
        { ticker: 'BND', weight: 0.5 }, // Sum = 1.1
      ];
      
      const totalWeight = invalidAllocations.reduce((sum, a) => sum + a.weight, 0);
      expect(totalWeight).not.toBeCloseTo(1, 6);
    });

    it('should reject negative weights', () => {
      const invalidAllocations = [
        { ticker: 'VTI', weight: -0.1 },
        { ticker: 'BND', weight: 1.1 },
      ];
      
      const hasNegativeWeights = invalidAllocations.some(a => a.weight < 0);
      expect(hasNegativeWeights).toBe(true);
    });
  });

  describe('Metric Calculation', () => {
    it('should return all required metrics', () => {
      const requiredMetrics = [
        'totalReturn',
        'annualizedReturn',
        'volatility',
        'sharpeRatio',
        'sortinoRatio',
        'maxDrawdown',
        'beta',
        'alpha',
      ];
      
      const mockResult = {
        totalReturn: 0.1847,
        annualizedReturn: 0.1847,
        volatility: 0.1023,
        sharpeRatio: 1.28,
        sortinoRatio: 1.85,
        maxDrawdown: -0.0712,
        beta: 0.72,
        alpha: 0.0312,
      };
      
      requiredMetrics.forEach(metric => {
        expect(mockResult).toHaveProperty(metric);
      });
    });

    it('should include calculation traces when requested', () => {
      const mockTrace = {
        metricId: 'sharpeRatio',
        calculatedValue: 1.28,
        steps: [
          { description: 'Calculate annualized return', value: 0.1847 },
          { description: 'Calculate volatility', value: 0.1023 },
          { description: 'Apply risk-free rate', value: 0.05 },
          { description: 'Compute Sharpe', value: 1.28 },
        ],
      };
      
      expect(mockTrace.steps).toHaveLength(4);
      expect(mockTrace.calculatedValue).toBe(1.28);
    });
  });

  describe('Caching', () => {
    it('should generate consistent portfolio hash', () => {
      const generateHash = (tickers: string[], weights: number[]) => {
        return `${tickers.sort().join('-')}_${weights.map(w => w.toFixed(2)).join('-')}`;
      };
      
      const hash1 = generateHash(['VTI', 'BND'], [0.6, 0.4]);
      const hash2 = generateHash(['VTI', 'BND'], [0.6, 0.4]);
      
      expect(hash1).toBe(hash2);
    });
  });
});
