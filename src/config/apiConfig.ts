/**
 * Global API Configuration - Kill Switch for External API Calls
 * 
 * IMPORTANT: Set all values to FALSE to disable API calls during development/testing
 * This prevents unwanted API charges from Perplexity, market data providers, etc.
 */

/**
 * Polygon API Subscription Limits
 * Starter plan: 5 years of historical data
 * Update this if you upgrade/downgrade your Polygon plan
 */
export const POLYGON_CONFIG = {
  // Maximum years of historical data available on current plan
  MAX_HISTORY_YEARS: 5,
  
  // Get the earliest date we can fetch based on plan
  getEarliestDate(): string {
    const date = new Date();
    date.setFullYear(date.getFullYear() - this.MAX_HISTORY_YEARS);
    return date.toISOString().split('T')[0];
  },
  
  // Get date N years ago (capped at plan limit)
  getDateYearsAgo(years: number): string {
    const cappedYears = Math.min(years, this.MAX_HISTORY_YEARS);
    const date = new Date();
    date.setFullYear(date.getFullYear() - cappedYears);
    return date.toISOString().split('T')[0];
  },
} as const;

export const API_CONFIG = {
  // Master kill switch for Perplexity API calls
  ENABLE_PERPLEXITY: false,  // SET TO FALSE - blocks all Perplexity API calls
  
  // Master kill switch for market data API calls
  ENABLE_MARKET_DATA: true, // ENABLED - allows Finnhub market data fetching
  
  // Master kill switch for AI features
  ENABLE_AI_FEATURES: false, // SET TO FALSE - blocks AI summary generation, etc.
  
  // Master kill switch for external scraping
  ENABLE_EXTERNAL_SCRAPING: false, // SET TO FALSE - blocks website scraping
} as const;

/**
 * Check if an API call should be blocked
 * Usage: if (isApiBlocked('perplexity')) return mockData;
 */
export function isApiBlocked(apiType: 'perplexity' | 'market_data' | 'ai' | 'scraping'): boolean {
  switch (apiType) {
    case 'perplexity':
      return !API_CONFIG.ENABLE_PERPLEXITY;
    case 'market_data':
      return !API_CONFIG.ENABLE_MARKET_DATA;
    case 'ai':
      return !API_CONFIG.ENABLE_AI_FEATURES;
    case 'scraping':
      return !API_CONFIG.ENABLE_EXTERNAL_SCRAPING;
    default:
      return true; // Block unknown API types by default
  }
}

/**
 * Log blocked API calls for debugging
 */
export function logBlockedApiCall(functionName: string, params?: unknown): void {
  console.log(`[API BLOCKED] ${functionName}`, params || '');
}

/**
 * Standard response for blocked API calls
 */
export function getBlockedResponse() {
  return {
    success: false,
    error: 'API disabled for testing',
    data: null,
    isBlocked: true,
  };
}
