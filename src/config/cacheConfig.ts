// Cache TTL (time-to-live) configuration in milliseconds
export const CACHE_TTL = {
  // Perplexity / AI summaries - refresh daily or on-demand
  PERPLEXITY_COMPANY_NEWS: 24 * 60 * 60 * 1000,      // 24 hours
  PERPLEXITY_INDUSTRY_INTEL: 24 * 60 * 60 * 1000,   // 24 hours
  PERPLEXITY_COMPANY_SUMMARY: 7 * 24 * 60 * 60 * 1000, // 7 days (unless docs change)
  
  // Market data - refresh more frequently
  MARKET_DATA_REALTIME: 15 * 60 * 1000,              // 15 minutes
  MARKET_DATA_DAILY: 24 * 60 * 60 * 1000,            // 24 hours
  
  // News - refresh every few hours
  NEWS_COMPANY: 4 * 60 * 60 * 1000,                  // 4 hours
  NEWS_INDUSTRY: 6 * 60 * 60 * 1000,                 // 6 hours
  
  // Competitor data
  COMPETITOR_DATA: 7 * 24 * 60 * 60 * 1000,          // 7 days
};

export const CACHE_KEYS = {
  perplexityCompanyNews: (companyId: string) => `perplexity:company:${companyId}:news`,
  perplexityIndustryIntel: (companyId: string) => `perplexity:company:${companyId}:industry`,
  perplexityCompanySummary: (companyId: string) => `perplexity:company:${companyId}:summary`,
  marketData: (symbol: string) => `market:${symbol}`,
  newsCompany: (companyId: string) => `news:company:${companyId}`,
  newsIndustry: (industry: string) => `news:industry:${industry}`,
};
