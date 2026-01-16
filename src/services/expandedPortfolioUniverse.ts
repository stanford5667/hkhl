/**
 * Expanded Portfolio Universe Service
 * 
 * Generates 100,000+ unique portfolio combinations using:
 * - 150+ ticker universe with metadata
 * - Algorithmic generation (not static templates)
 * - Fast metric estimation using pre-computed ticker stats
 * - Lazy evaluation for memory efficiency
 * 
 * Storage Strategy:
 * - Ticker stats cached in localStorage (~50KB for 150 tickers)
 * - Portfolios generated on-demand (zero storage)
 * - Pagination for efficient filtering
 */

import { supabase } from '@/integrations/supabase/client';
import {
  calculateSharpeRatio,
  calculateSortinoRatio,
  calculateMaxDrawdown,
  calculateCAGR,
  annualizedVolatility,
  arithmeticMean,
} from './portfolioMetricsService';

// ═══════════════════════════════════════════════════════════════════════════════
// ACCURATE METRICS CALCULATION (for portfolio details)
// ═══════════════════════════════════════════════════════════════════════════════

export interface AccurateMetrics {
  cagr: number;
  totalReturn: number;
  volatility: number;
  sharpe: number;
  sortino: number;
  maxDrawdown: number;
  dataPoints: number;
  dateRange: { start: string; end: string };
}

/**
 * Calculate accurate portfolio metrics by fetching actual daily returns
 * from the database. Use this for portfolio detail views.
 */
export async function calculateAccuratePortfolioMetrics(
  tickers: string[],
  weights: number[],
  lookbackYears: number = 1
): Promise<AccurateMetrics | null> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setFullYear(endDate.getFullYear() - lookbackYears);
  
  const startStr = startDate.toISOString().split('T')[0];
  const endStr = endDate.toISOString().split('T')[0];
  
  // Fetch daily returns for all tickers
  const { data, error } = await supabase
    .from('market_daily_bars')
    .select('ticker, bar_date, daily_return')
    .in('ticker', tickers)
    .gte('bar_date', startStr)
    .lte('bar_date', endStr)
    .order('bar_date', { ascending: true });
  
  if (error || !data) {
    console.error('Failed to fetch ticker data:', error);
    return null;
  }
  
  // Group by date to find common trading days
  const dateData: Record<string, Record<string, number>> = {};
  
  for (const row of data) {
    if (!dateData[row.bar_date]) {
      dateData[row.bar_date] = {};
    }
    dateData[row.bar_date][row.ticker] = row.daily_return ?? 0;
  }
  
  // Filter to only dates where ALL tickers have data
  const commonDates = Object.entries(dateData)
    .filter(([_, tickerReturns]) => tickers.every(t => t in tickerReturns))
    .sort((a, b) => a[0].localeCompare(b[0]));
  
  if (commonDates.length < 20) {
    console.warn('Insufficient overlapping data:', commonDates.length);
    return null;
  }
  
  // Calculate portfolio returns for each day
  const portfolioReturns: number[] = [];
  const portfolioValues: number[] = [100000];
  
  for (const [_, tickerReturns] of commonDates) {
    let dayReturn = 0;
    for (let i = 0; i < tickers.length; i++) {
      const tickerReturn = tickerReturns[tickers[i]] ?? 0;
      dayReturn += (weights[i] / 100) * tickerReturn;
    }
    portfolioReturns.push(dayReturn);
    
    const prevValue = portfolioValues[portfolioValues.length - 1];
    portfolioValues.push(prevValue * (1 + dayReturn));
  }
  
  // Calculate metrics
  const years = portfolioReturns.length / 252;
  const finalValue = portfolioValues[portfolioValues.length - 1];
  const cagr = calculateCAGR(100000, finalValue, years) * 100;
  const totalReturn = ((finalValue - 100000) / 100000) * 100;
  const volatility = annualizedVolatility(portfolioReturns) * 100;
  const sharpe = calculateSharpeRatio(portfolioReturns, 0.05);
  const sortino = calculateSortinoRatio(portfolioReturns, 0.05);
  const { maxDrawdownPercent } = calculateMaxDrawdown(portfolioValues);
  
  return {
    cagr: Math.round(cagr * 100) / 100,
    totalReturn: Math.round(totalReturn * 100) / 100,
    volatility: Math.round(volatility * 100) / 100,
    sharpe: Math.round(sharpe * 100) / 100,
    sortino: Math.round(sortino * 100) / 100,
    maxDrawdown: Math.round(maxDrawdownPercent * 100) / 100,
    dataPoints: portfolioReturns.length,
    dateRange: { 
      start: commonDates[0]?.[0] ?? '', 
      end: commonDates[commonDates.length - 1]?.[0] ?? '' 
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPANDED TICKER UNIVERSE (150+ tickers)
// ═══════════════════════════════════════════════════════════════════════════════

export interface TickerMeta {
  symbol: string;
  name: string;
  category: string;
  subCategory: string;
  riskTier: 1 | 2 | 3 | 4 | 5; // 1=lowest risk, 5=highest
  liquidityScore: number; // 1-100
}

// Comprehensive ticker universe organized by asset class
export const TICKER_UNIVERSE: TickerMeta[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // CORE US EQUITY (20 tickers)
  // ═══════════════════════════════════════════════════════════════════════════
  { symbol: 'SPY', name: 'S&P 500 ETF', category: 'US Equity', subCategory: 'Large Cap Blend', riskTier: 3, liquidityScore: 100 },
  { symbol: 'VOO', name: 'Vanguard S&P 500', category: 'US Equity', subCategory: 'Large Cap Blend', riskTier: 3, liquidityScore: 98 },
  { symbol: 'VTI', name: 'Total Stock Market', category: 'US Equity', subCategory: 'Total Market', riskTier: 3, liquidityScore: 98 },
  { symbol: 'IVV', name: 'iShares S&P 500', category: 'US Equity', subCategory: 'Large Cap Blend', riskTier: 3, liquidityScore: 97 },
  { symbol: 'QQQ', name: 'NASDAQ 100', category: 'US Equity', subCategory: 'Large Cap Growth', riskTier: 4, liquidityScore: 99 },
  { symbol: 'DIA', name: 'Dow Jones Industrial', category: 'US Equity', subCategory: 'Large Cap Value', riskTier: 3, liquidityScore: 95 },
  { symbol: 'IWM', name: 'Russell 2000', category: 'US Equity', subCategory: 'Small Cap Blend', riskTier: 4, liquidityScore: 96 },
  { symbol: 'IWF', name: 'Russell 1000 Growth', category: 'US Equity', subCategory: 'Large Cap Growth', riskTier: 4, liquidityScore: 92 },
  { symbol: 'IWD', name: 'Russell 1000 Value', category: 'US Equity', subCategory: 'Large Cap Value', riskTier: 3, liquidityScore: 90 },
  { symbol: 'VUG', name: 'Vanguard Growth', category: 'US Equity', subCategory: 'Large Cap Growth', riskTier: 4, liquidityScore: 88 },
  { symbol: 'VTV', name: 'Vanguard Value', category: 'US Equity', subCategory: 'Large Cap Value', riskTier: 3, liquidityScore: 87 },
  { symbol: 'IJH', name: 'S&P Mid-Cap 400', category: 'US Equity', subCategory: 'Mid Cap Blend', riskTier: 4, liquidityScore: 85 },
  { symbol: 'IJR', name: 'S&P Small-Cap 600', category: 'US Equity', subCategory: 'Small Cap Blend', riskTier: 4, liquidityScore: 84 },
  { symbol: 'SPYG', name: 'S&P 500 Growth', category: 'US Equity', subCategory: 'Large Cap Growth', riskTier: 4, liquidityScore: 82 },
  { symbol: 'SPYV', name: 'S&P 500 Value', category: 'US Equity', subCategory: 'Large Cap Value', riskTier: 3, liquidityScore: 80 },
  { symbol: 'MGK', name: 'Vanguard Mega Cap Growth', category: 'US Equity', subCategory: 'Large Cap Growth', riskTier: 4, liquidityScore: 78 },
  { symbol: 'VBK', name: 'Vanguard Small Cap Growth', category: 'US Equity', subCategory: 'Small Cap Growth', riskTier: 5, liquidityScore: 75 },
  { symbol: 'VBR', name: 'Vanguard Small Cap Value', category: 'US Equity', subCategory: 'Small Cap Value', riskTier: 4, liquidityScore: 74 },
  { symbol: 'RSP', name: 'Equal Weight S&P 500', category: 'US Equity', subCategory: 'Large Cap Blend', riskTier: 3, liquidityScore: 80 },
  { symbol: 'SCHX', name: 'Schwab Large Cap', category: 'US Equity', subCategory: 'Large Cap Blend', riskTier: 3, liquidityScore: 78 },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTOR ETFs (15 tickers)
  // ═══════════════════════════════════════════════════════════════════════════
  { symbol: 'XLK', name: 'Technology Select', category: 'Sector', subCategory: 'Technology', riskTier: 4, liquidityScore: 95 },
  { symbol: 'XLF', name: 'Financial Select', category: 'Sector', subCategory: 'Financials', riskTier: 4, liquidityScore: 93 },
  { symbol: 'XLE', name: 'Energy Select', category: 'Sector', subCategory: 'Energy', riskTier: 5, liquidityScore: 92 },
  { symbol: 'XLV', name: 'Healthcare Select', category: 'Sector', subCategory: 'Healthcare', riskTier: 3, liquidityScore: 91 },
  { symbol: 'XLI', name: 'Industrial Select', category: 'Sector', subCategory: 'Industrials', riskTier: 3, liquidityScore: 89 },
  { symbol: 'XLP', name: 'Consumer Staples', category: 'Sector', subCategory: 'Staples', riskTier: 2, liquidityScore: 88 },
  { symbol: 'XLU', name: 'Utilities Select', category: 'Sector', subCategory: 'Utilities', riskTier: 2, liquidityScore: 85 },
  { symbol: 'XLY', name: 'Consumer Discretionary', category: 'Sector', subCategory: 'Discretionary', riskTier: 4, liquidityScore: 87 },
  { symbol: 'XLB', name: 'Materials Select', category: 'Sector', subCategory: 'Materials', riskTier: 4, liquidityScore: 82 },
  { symbol: 'XLRE', name: 'Real Estate Select', category: 'Sector', subCategory: 'Real Estate', riskTier: 3, liquidityScore: 80 },
  { symbol: 'XLC', name: 'Communication Services', category: 'Sector', subCategory: 'Communication', riskTier: 4, liquidityScore: 83 },
  { symbol: 'VGT', name: 'Vanguard Tech', category: 'Sector', subCategory: 'Technology', riskTier: 4, liquidityScore: 90 },
  { symbol: 'VHT', name: 'Vanguard Healthcare', category: 'Sector', subCategory: 'Healthcare', riskTier: 3, liquidityScore: 82 },
  { symbol: 'VFH', name: 'Vanguard Financials', category: 'Sector', subCategory: 'Financials', riskTier: 4, liquidityScore: 78 },
  { symbol: 'VDE', name: 'Vanguard Energy', category: 'Sector', subCategory: 'Energy', riskTier: 5, liquidityScore: 75 },

  // ═══════════════════════════════════════════════════════════════════════════
  // INTERNATIONAL EQUITY (15 tickers)
  // ═══════════════════════════════════════════════════════════════════════════
  { symbol: 'EFA', name: 'Developed Markets', category: 'International', subCategory: 'Developed', riskTier: 3, liquidityScore: 95 },
  { symbol: 'VEA', name: 'Vanguard Developed', category: 'International', subCategory: 'Developed', riskTier: 3, liquidityScore: 92 },
  { symbol: 'IEFA', name: 'iShares Core EAFE', category: 'International', subCategory: 'Developed', riskTier: 3, liquidityScore: 90 },
  { symbol: 'VWO', name: 'Vanguard Emerging', category: 'International', subCategory: 'Emerging', riskTier: 5, liquidityScore: 93 },
  { symbol: 'EEM', name: 'iShares Emerging', category: 'International', subCategory: 'Emerging', riskTier: 5, liquidityScore: 94 },
  { symbol: 'IEMG', name: 'iShares Core EM', category: 'International', subCategory: 'Emerging', riskTier: 5, liquidityScore: 91 },
  { symbol: 'VGK', name: 'Vanguard Europe', category: 'International', subCategory: 'Europe', riskTier: 4, liquidityScore: 85 },
  { symbol: 'EWJ', name: 'iShares Japan', category: 'International', subCategory: 'Japan', riskTier: 4, liquidityScore: 88 },
  { symbol: 'FXI', name: 'iShares China', category: 'International', subCategory: 'China', riskTier: 5, liquidityScore: 90 },
  { symbol: 'EWZ', name: 'iShares Brazil', category: 'International', subCategory: 'Brazil', riskTier: 5, liquidityScore: 85 },
  { symbol: 'INDA', name: 'iShares India', category: 'International', subCategory: 'India', riskTier: 5, liquidityScore: 82 },
  { symbol: 'EWT', name: 'iShares Taiwan', category: 'International', subCategory: 'Taiwan', riskTier: 4, liquidityScore: 80 },
  { symbol: 'EWY', name: 'iShares South Korea', category: 'International', subCategory: 'Korea', riskTier: 4, liquidityScore: 78 },
  { symbol: 'VXUS', name: 'Vanguard Total Intl', category: 'International', subCategory: 'Total Intl', riskTier: 4, liquidityScore: 92 },
  { symbol: 'ACWX', name: 'MSCI ACWI ex US', category: 'International', subCategory: 'Total Intl', riskTier: 4, liquidityScore: 85 },

  // ═══════════════════════════════════════════════════════════════════════════
  // FIXED INCOME (25 tickers)
  // ═══════════════════════════════════════════════════════════════════════════
  { symbol: 'AGG', name: 'Aggregate Bond', category: 'Fixed Income', subCategory: 'Core Bond', riskTier: 1, liquidityScore: 98 },
  { symbol: 'BND', name: 'Vanguard Total Bond', category: 'Fixed Income', subCategory: 'Core Bond', riskTier: 1, liquidityScore: 97 },
  { symbol: 'TLT', name: 'Long Treasury 20Y+', category: 'Fixed Income', subCategory: 'Long Treasury', riskTier: 2, liquidityScore: 96 },
  { symbol: 'IEF', name: 'Treasury 7-10Y', category: 'Fixed Income', subCategory: 'Intermediate Treasury', riskTier: 1, liquidityScore: 95 },
  { symbol: 'SHY', name: 'Treasury 1-3Y', category: 'Fixed Income', subCategory: 'Short Treasury', riskTier: 1, liquidityScore: 94 },
  { symbol: 'GOVT', name: 'Treasury Bond', category: 'Fixed Income', subCategory: 'Treasury', riskTier: 1, liquidityScore: 90 },
  { symbol: 'LQD', name: 'Investment Grade Corp', category: 'Fixed Income', subCategory: 'Corporate IG', riskTier: 2, liquidityScore: 93 },
  { symbol: 'VCIT', name: 'Intermediate Corp', category: 'Fixed Income', subCategory: 'Corporate IG', riskTier: 2, liquidityScore: 88 },
  { symbol: 'VCSH', name: 'Short-Term Corp', category: 'Fixed Income', subCategory: 'Corporate IG', riskTier: 1, liquidityScore: 87 },
  { symbol: 'HYG', name: 'High Yield Corp', category: 'Fixed Income', subCategory: 'High Yield', riskTier: 3, liquidityScore: 92 },
  { symbol: 'JNK', name: 'High Yield Bonds', category: 'Fixed Income', subCategory: 'High Yield', riskTier: 3, liquidityScore: 90 },
  { symbol: 'TIP', name: 'TIPS', category: 'Fixed Income', subCategory: 'Inflation Protected', riskTier: 1, liquidityScore: 88 },
  { symbol: 'STIP', name: 'Short-Term TIPS', category: 'Fixed Income', subCategory: 'Inflation Protected', riskTier: 1, liquidityScore: 78 },
  { symbol: 'EMB', name: 'EM Bonds USD', category: 'Fixed Income', subCategory: 'Emerging Market', riskTier: 3, liquidityScore: 85 },
  { symbol: 'EMLC', name: 'EM Bonds Local', category: 'Fixed Income', subCategory: 'Emerging Market', riskTier: 4, liquidityScore: 75 },
  { symbol: 'MUB', name: 'Municipal Bonds', category: 'Fixed Income', subCategory: 'Municipal', riskTier: 1, liquidityScore: 85 },
  { symbol: 'VTEB', name: 'Vanguard Tax-Exempt', category: 'Fixed Income', subCategory: 'Municipal', riskTier: 1, liquidityScore: 82 },
  { symbol: 'BIL', name: 'T-Bill 1-3M', category: 'Fixed Income', subCategory: 'Ultra Short', riskTier: 1, liquidityScore: 90 },
  { symbol: 'SHV', name: 'Short Treasury', category: 'Fixed Income', subCategory: 'Ultra Short', riskTier: 1, liquidityScore: 88 },
  { symbol: 'BNDX', name: 'Intl Bond', category: 'Fixed Income', subCategory: 'International', riskTier: 2, liquidityScore: 80 },
  { symbol: 'BWX', name: 'Intl Treasury', category: 'Fixed Income', subCategory: 'International', riskTier: 2, liquidityScore: 75 },
  { symbol: 'SCHO', name: 'Schwab Short-Term', category: 'Fixed Income', subCategory: 'Short Treasury', riskTier: 1, liquidityScore: 78 },
  { symbol: 'SCHR', name: 'Schwab Intermediate', category: 'Fixed Income', subCategory: 'Intermediate Treasury', riskTier: 1, liquidityScore: 76 },
  { symbol: 'SCHZ', name: 'Schwab Aggregate', category: 'Fixed Income', subCategory: 'Core Bond', riskTier: 1, liquidityScore: 80 },
  { symbol: 'VGSH', name: 'Vanguard Short Treasury', category: 'Fixed Income', subCategory: 'Short Treasury', riskTier: 1, liquidityScore: 82 },

  // ═══════════════════════════════════════════════════════════════════════════
  // COMMODITIES & ALTERNATIVES (15 tickers)
  // ═══════════════════════════════════════════════════════════════════════════
  { symbol: 'GLD', name: 'Gold', category: 'Commodities', subCategory: 'Precious Metals', riskTier: 3, liquidityScore: 98 },
  { symbol: 'IAU', name: 'iShares Gold', category: 'Commodities', subCategory: 'Precious Metals', riskTier: 3, liquidityScore: 92 },
  { symbol: 'SLV', name: 'Silver', category: 'Commodities', subCategory: 'Precious Metals', riskTier: 4, liquidityScore: 88 },
  { symbol: 'DBC', name: 'Commodities Basket', category: 'Commodities', subCategory: 'Broad', riskTier: 4, liquidityScore: 82 },
  { symbol: 'PDBC', name: 'Optimized Commodity', category: 'Commodities', subCategory: 'Broad', riskTier: 4, liquidityScore: 80 },
  { symbol: 'GSG', name: 'S&P GSCI Commodity', category: 'Commodities', subCategory: 'Broad', riskTier: 4, liquidityScore: 78 },
  { symbol: 'USO', name: 'Oil Fund', category: 'Commodities', subCategory: 'Energy', riskTier: 5, liquidityScore: 85 },
  { symbol: 'UNG', name: 'Natural Gas', category: 'Commodities', subCategory: 'Energy', riskTier: 5, liquidityScore: 80 },
  { symbol: 'VNQ', name: 'Vanguard REIT', category: 'Real Assets', subCategory: 'REITs', riskTier: 4, liquidityScore: 95 },
  { symbol: 'IYR', name: 'iShares Real Estate', category: 'Real Assets', subCategory: 'REITs', riskTier: 4, liquidityScore: 90 },
  { symbol: 'SCHH', name: 'Schwab REIT', category: 'Real Assets', subCategory: 'REITs', riskTier: 4, liquidityScore: 82 },
  { symbol: 'REM', name: 'Mortgage REITs', category: 'Real Assets', subCategory: 'Mortgage REITs', riskTier: 5, liquidityScore: 75 },
  { symbol: 'VNQI', name: 'Intl Real Estate', category: 'Real Assets', subCategory: 'Intl REITs', riskTier: 4, liquidityScore: 70 },
  { symbol: 'COMT', name: 'Commodity Strategy', category: 'Commodities', subCategory: 'Broad', riskTier: 4, liquidityScore: 72 },
  { symbol: 'GLDM', name: 'Gold Mini', category: 'Commodities', subCategory: 'Precious Metals', riskTier: 3, liquidityScore: 85 },

  // ═══════════════════════════════════════════════════════════════════════════
  // FACTOR & SMART BETA (15 tickers)
  // ═══════════════════════════════════════════════════════════════════════════
  { symbol: 'MTUM', name: 'Momentum Factor', category: 'Factor', subCategory: 'Momentum', riskTier: 4, liquidityScore: 88 },
  { symbol: 'QUAL', name: 'Quality Factor', category: 'Factor', subCategory: 'Quality', riskTier: 3, liquidityScore: 85 },
  { symbol: 'USMV', name: 'Min Volatility US', category: 'Factor', subCategory: 'Low Vol', riskTier: 2, liquidityScore: 90 },
  { symbol: 'EFAV', name: 'Min Volatility Intl', category: 'Factor', subCategory: 'Low Vol', riskTier: 2, liquidityScore: 78 },
  { symbol: 'VLUE', name: 'Value Factor', category: 'Factor', subCategory: 'Value', riskTier: 3, liquidityScore: 82 },
  { symbol: 'SIZE', name: 'Size Factor', category: 'Factor', subCategory: 'Size', riskTier: 4, liquidityScore: 70 },
  { symbol: 'SPLV', name: 'S&P 500 Low Vol', category: 'Factor', subCategory: 'Low Vol', riskTier: 2, liquidityScore: 88 },
  { symbol: 'SPHD', name: 'High Div Low Vol', category: 'Factor', subCategory: 'Low Vol', riskTier: 2, liquidityScore: 82 },
  { symbol: 'NOBL', name: 'Dividend Aristocrats', category: 'Factor', subCategory: 'Dividend', riskTier: 3, liquidityScore: 80 },
  { symbol: 'SDY', name: 'High Yield Dividend', category: 'Factor', subCategory: 'Dividend', riskTier: 3, liquidityScore: 78 },
  { symbol: 'DGRW', name: 'Dividend Growth', category: 'Factor', subCategory: 'Dividend', riskTier: 3, liquidityScore: 75 },
  { symbol: 'SCHD', name: 'Schwab Dividend', category: 'Factor', subCategory: 'Dividend', riskTier: 3, liquidityScore: 92 },
  { symbol: 'VIG', name: 'Vanguard Dividend App', category: 'Factor', subCategory: 'Dividend', riskTier: 3, liquidityScore: 90 },
  { symbol: 'VYM', name: 'Vanguard High Dividend', category: 'Factor', subCategory: 'Dividend', riskTier: 3, liquidityScore: 88 },
  { symbol: 'DVY', name: 'Dividend Select', category: 'Factor', subCategory: 'Dividend', riskTier: 3, liquidityScore: 82 },

  // ═══════════════════════════════════════════════════════════════════════════
  // THEMATIC (15 tickers)
  // ═══════════════════════════════════════════════════════════════════════════
  { symbol: 'ARKK', name: 'ARK Innovation', category: 'Thematic', subCategory: 'Innovation', riskTier: 5, liquidityScore: 90 },
  { symbol: 'ARKG', name: 'ARK Genomic', category: 'Thematic', subCategory: 'Healthcare', riskTier: 5, liquidityScore: 82 },
  { symbol: 'ARKW', name: 'ARK Internet', category: 'Thematic', subCategory: 'Technology', riskTier: 5, liquidityScore: 78 },
  { symbol: 'ICLN', name: 'Clean Energy', category: 'Thematic', subCategory: 'Clean Energy', riskTier: 5, liquidityScore: 85 },
  { symbol: 'TAN', name: 'Solar Energy', category: 'Thematic', subCategory: 'Solar', riskTier: 5, liquidityScore: 80 },
  { symbol: 'QCLN', name: 'Clean Edge Green', category: 'Thematic', subCategory: 'Clean Energy', riskTier: 5, liquidityScore: 75 },
  { symbol: 'SOXX', name: 'Semiconductors', category: 'Thematic', subCategory: 'Semiconductors', riskTier: 5, liquidityScore: 92 },
  { symbol: 'SMH', name: 'Semiconductor VanEck', category: 'Thematic', subCategory: 'Semiconductors', riskTier: 5, liquidityScore: 90 },
  { symbol: 'IBB', name: 'Biotech', category: 'Thematic', subCategory: 'Biotech', riskTier: 5, liquidityScore: 88 },
  { symbol: 'XBI', name: 'Biotech SPDR', category: 'Thematic', subCategory: 'Biotech', riskTier: 5, liquidityScore: 86 },
  { symbol: 'BOTZ', name: 'Robotics & AI', category: 'Thematic', subCategory: 'AI & Robotics', riskTier: 5, liquidityScore: 78 },
  { symbol: 'ROBO', name: 'Robotics ETF', category: 'Thematic', subCategory: 'AI & Robotics', riskTier: 5, liquidityScore: 72 },
  { symbol: 'SKYY', name: 'Cloud Computing', category: 'Thematic', subCategory: 'Cloud', riskTier: 5, liquidityScore: 75 },
  { symbol: 'FINX', name: 'FinTech', category: 'Thematic', subCategory: 'FinTech', riskTier: 5, liquidityScore: 70 },
  { symbol: 'HACK', name: 'Cybersecurity', category: 'Thematic', subCategory: 'Cybersecurity', riskTier: 4, liquidityScore: 78 },

  // ═══════════════════════════════════════════════════════════════════════════
  // INDIVIDUAL STOCKS - MEGA CAP (30 tickers)
  // ═══════════════════════════════════════════════════════════════════════════
  { symbol: 'AAPL', name: 'Apple', category: 'Stock', subCategory: 'Tech Mega Cap', riskTier: 3, liquidityScore: 100 },
  { symbol: 'MSFT', name: 'Microsoft', category: 'Stock', subCategory: 'Tech Mega Cap', riskTier: 3, liquidityScore: 100 },
  { symbol: 'GOOGL', name: 'Alphabet', category: 'Stock', subCategory: 'Tech Mega Cap', riskTier: 4, liquidityScore: 99 },
  { symbol: 'AMZN', name: 'Amazon', category: 'Stock', subCategory: 'Tech Mega Cap', riskTier: 4, liquidityScore: 99 },
  { symbol: 'NVDA', name: 'NVIDIA', category: 'Stock', subCategory: 'Semiconductors', riskTier: 5, liquidityScore: 98 },
  { symbol: 'META', name: 'Meta Platforms', category: 'Stock', subCategory: 'Tech Mega Cap', riskTier: 4, liquidityScore: 98 },
  { symbol: 'TSLA', name: 'Tesla', category: 'Stock', subCategory: 'Auto', riskTier: 5, liquidityScore: 99 },
  { symbol: 'BRK.B', name: 'Berkshire Hathaway', category: 'Stock', subCategory: 'Conglomerate', riskTier: 3, liquidityScore: 95 },
  { symbol: 'JPM', name: 'JPMorgan Chase', category: 'Stock', subCategory: 'Financials', riskTier: 3, liquidityScore: 96 },
  { symbol: 'V', name: 'Visa', category: 'Stock', subCategory: 'Financials', riskTier: 3, liquidityScore: 95 },
  { symbol: 'MA', name: 'Mastercard', category: 'Stock', subCategory: 'Financials', riskTier: 3, liquidityScore: 94 },
  { symbol: 'JNJ', name: 'Johnson & Johnson', category: 'Stock', subCategory: 'Healthcare', riskTier: 2, liquidityScore: 94 },
  { symbol: 'UNH', name: 'UnitedHealth', category: 'Stock', subCategory: 'Healthcare', riskTier: 3, liquidityScore: 93 },
  { symbol: 'HD', name: 'Home Depot', category: 'Stock', subCategory: 'Retail', riskTier: 3, liquidityScore: 92 },
  { symbol: 'PG', name: 'Procter & Gamble', category: 'Stock', subCategory: 'Consumer', riskTier: 2, liquidityScore: 93 },
  { symbol: 'KO', name: 'Coca-Cola', category: 'Stock', subCategory: 'Consumer', riskTier: 2, liquidityScore: 92 },
  { symbol: 'PEP', name: 'PepsiCo', category: 'Stock', subCategory: 'Consumer', riskTier: 2, liquidityScore: 91 },
  { symbol: 'WMT', name: 'Walmart', category: 'Stock', subCategory: 'Retail', riskTier: 2, liquidityScore: 92 },
  { symbol: 'DIS', name: 'Disney', category: 'Stock', subCategory: 'Entertainment', riskTier: 4, liquidityScore: 92 },
  { symbol: 'INTC', name: 'Intel', category: 'Stock', subCategory: 'Semiconductors', riskTier: 4, liquidityScore: 90 },
  { symbol: 'AMD', name: 'AMD', category: 'Stock', subCategory: 'Semiconductors', riskTier: 5, liquidityScore: 95 },
  { symbol: 'CRM', name: 'Salesforce', category: 'Stock', subCategory: 'Tech', riskTier: 4, liquidityScore: 90 },
  { symbol: 'NFLX', name: 'Netflix', category: 'Stock', subCategory: 'Entertainment', riskTier: 4, liquidityScore: 92 },
  { symbol: 'ADBE', name: 'Adobe', category: 'Stock', subCategory: 'Tech', riskTier: 4, liquidityScore: 88 },
  { symbol: 'COST', name: 'Costco', category: 'Stock', subCategory: 'Retail', riskTier: 3, liquidityScore: 88 },
  { symbol: 'ABBV', name: 'AbbVie', category: 'Stock', subCategory: 'Healthcare', riskTier: 3, liquidityScore: 88 },
  { symbol: 'MRK', name: 'Merck', category: 'Stock', subCategory: 'Healthcare', riskTier: 3, liquidityScore: 90 },
  { symbol: 'LLY', name: 'Eli Lilly', category: 'Stock', subCategory: 'Healthcare', riskTier: 4, liquidityScore: 92 },
  { symbol: 'XOM', name: 'ExxonMobil', category: 'Stock', subCategory: 'Energy', riskTier: 4, liquidityScore: 93 },
  { symbol: 'CVX', name: 'Chevron', category: 'Stock', subCategory: 'Energy', riskTier: 4, liquidityScore: 92 },
];

// Create lookup maps for fast access
export const TICKER_MAP = new Map(TICKER_UNIVERSE.map(t => [t.symbol, t]));
export const CATEGORY_TICKERS = new Map<string, string[]>();

// Build category -> tickers lookup
for (const ticker of TICKER_UNIVERSE) {
  const existing = CATEGORY_TICKERS.get(ticker.category) || [];
  existing.push(ticker.symbol);
  CATEGORY_TICKERS.set(ticker.category, existing);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TICKER STATS CACHE
// ═══════════════════════════════════════════════════════════════════════════════

export interface CachedTickerStats {
  symbol: string;
  cagr: number;
  volatility: number;
  sharpe: number;
  sortino: number;
  maxDrawdown: number;
  avgReturn: number;
  dataPoints: number;
  lastUpdated: string;
}

const CACHE_KEY = 'portfolio_ticker_stats_v2';
const CACHE_EXPIRY_HOURS = 24;

export function getCachedStats(): Map<string, CachedTickerStats> | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const parsed = JSON.parse(cached);
    const cacheAge = (Date.now() - new Date(parsed.timestamp).getTime()) / (1000 * 60 * 60);
    
    if (cacheAge > CACHE_EXPIRY_HOURS) return null;
    
    return new Map(parsed.stats.map((s: CachedTickerStats) => [s.symbol, s]));
  } catch {
    return null;
  }
}

export function setCachedStats(stats: CachedTickerStats[]): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      timestamp: new Date().toISOString(),
      stats,
    }));
  } catch (e) {
    console.warn('Failed to cache ticker stats:', e);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PORTFOLIO FAMILIES (Curated Strategy Templates)
// ═══════════════════════════════════════════════════════════════════════════════

interface PortfolioFamily {
  id: string;
  name: string;
  description: string;
  tickerPool: string[];
  assetCount: [number, number]; // [min, max]
  weightStep: number;
  riskProfile: 'conservative' | 'moderate' | 'growth' | 'aggressive';
}

export const PORTFOLIO_FAMILIES: PortfolioFamily[] = [
  // Conservative families
  {
    id: 'treasury-core',
    name: 'Treasury Core',
    description: 'Government bond focused',
    tickerPool: ['TLT', 'IEF', 'SHY', 'GOVT', 'BIL', 'SHV', 'VGSH', 'SCHO', 'SCHR'],
    assetCount: [2, 4],
    weightStep: 10,
    riskProfile: 'conservative',
  },
  {
    id: 'bond-diversified',
    name: 'Bond Diversified',
    description: 'Mixed fixed income',
    tickerPool: ['AGG', 'BND', 'LQD', 'VCIT', 'VCSH', 'TIP', 'MUB', 'SCHZ', 'BNDX'],
    assetCount: [2, 5],
    weightStep: 10,
    riskProfile: 'conservative',
  },
  {
    id: 'income-focus',
    name: 'Income Focus',
    description: 'Dividend and yield',
    tickerPool: ['SCHD', 'VIG', 'VYM', 'DVY', 'NOBL', 'SDY', 'DGRW', 'AGG', 'LQD'],
    assetCount: [3, 5],
    weightStep: 10,
    riskProfile: 'conservative',
  },
  {
    id: 'low-volatility',
    name: 'Low Volatility',
    description: 'Minimum variance focus',
    tickerPool: ['USMV', 'SPLV', 'SPHD', 'EFAV', 'XLP', 'XLU', 'VIG', 'BND'],
    assetCount: [3, 5],
    weightStep: 10,
    riskProfile: 'conservative',
  },
  
  // Moderate families
  {
    id: 'classic-balanced',
    name: 'Classic Balanced',
    description: 'Traditional stock/bond mix',
    tickerPool: ['SPY', 'VOO', 'VTI', 'AGG', 'BND', 'GLD', 'TLT', 'IEF'],
    assetCount: [3, 5],
    weightStep: 10,
    riskProfile: 'moderate',
  },
  {
    id: 'global-diversified',
    name: 'Global Diversified',
    description: 'Worldwide allocation',
    tickerPool: ['VTI', 'VXUS', 'VWO', 'EFA', 'AGG', 'BNDX', 'GLD', 'VNQ'],
    assetCount: [4, 6],
    weightStep: 10,
    riskProfile: 'moderate',
  },
  {
    id: 'factor-tilt',
    name: 'Factor Tilt',
    description: 'Smart beta factors',
    tickerPool: ['MTUM', 'QUAL', 'VLUE', 'SIZE', 'USMV', 'VTI', 'VIG', 'AGG'],
    assetCount: [3, 5],
    weightStep: 10,
    riskProfile: 'moderate',
  },
  {
    id: 'all-weather',
    name: 'All Weather',
    description: 'Risk parity inspired',
    tickerPool: ['SPY', 'TLT', 'IEF', 'GLD', 'DBC', 'VTI', 'PDBC'],
    assetCount: [4, 5],
    weightStep: 10,
    riskProfile: 'moderate',
  },
  {
    id: 'real-assets',
    name: 'Real Assets',
    description: 'Inflation protection',
    tickerPool: ['VNQ', 'GLD', 'TIP', 'DBC', 'IAU', 'PDBC', 'SPY', 'SCHH'],
    assetCount: [3, 5],
    weightStep: 10,
    riskProfile: 'moderate',
  },
  
  // Growth families
  {
    id: 'us-growth-core',
    name: 'US Growth Core',
    description: 'Growth-tilted US equity',
    tickerPool: ['QQQ', 'VTI', 'SPY', 'VUG', 'IWF', 'SPYG', 'MGK', 'VGT'],
    assetCount: [3, 5],
    weightStep: 10,
    riskProfile: 'growth',
  },
  {
    id: 'tech-forward',
    name: 'Tech Forward',
    description: 'Technology overweight',
    tickerPool: ['QQQ', 'XLK', 'VGT', 'SOXX', 'SMH', 'SPY', 'VTI', 'ARKK'],
    assetCount: [3, 5],
    weightStep: 10,
    riskProfile: 'growth',
  },
  {
    id: 'sector-rotation',
    name: 'Sector Rotation',
    description: 'Multi-sector allocation',
    tickerPool: ['XLK', 'XLF', 'XLV', 'XLI', 'XLP', 'XLY', 'XLE', 'XLRE', 'XLC'],
    assetCount: [4, 6],
    weightStep: 10,
    riskProfile: 'growth',
  },
  {
    id: 'international-growth',
    name: 'International Growth',
    description: 'Global ex-US focus',
    tickerPool: ['EFA', 'VWO', 'EEM', 'VGK', 'EWJ', 'INDA', 'EWT', 'VXUS'],
    assetCount: [3, 5],
    weightStep: 10,
    riskProfile: 'growth',
  },
  
  // Aggressive families
  {
    id: 'max-growth',
    name: 'Max Growth',
    description: 'All equity aggressive',
    tickerPool: ['QQQ', 'SPY', 'VTI', 'IWM', 'VUG', 'IWF', 'MGK', 'VBK'],
    assetCount: [3, 5],
    weightStep: 10,
    riskProfile: 'aggressive',
  },
  {
    id: 'small-cap-focus',
    name: 'Small Cap Focus',
    description: 'Small company exposure',
    tickerPool: ['IWM', 'IJR', 'VBK', 'VBR', 'VTI', 'SPY', 'QQQ'],
    assetCount: [3, 5],
    weightStep: 10,
    riskProfile: 'aggressive',
  },
  {
    id: 'thematic-innovation',
    name: 'Thematic Innovation',
    description: 'Disruptive technology',
    tickerPool: ['ARKK', 'ARKG', 'ARKW', 'SOXX', 'IBB', 'BOTZ', 'ICLN', 'FINX'],
    assetCount: [3, 5],
    weightStep: 10,
    riskProfile: 'aggressive',
  },
  {
    id: 'emerging-markets',
    name: 'Emerging Markets',
    description: 'EM equity focus',
    tickerPool: ['VWO', 'EEM', 'IEMG', 'FXI', 'EWZ', 'INDA', 'EWT', 'EWY'],
    assetCount: [3, 5],
    weightStep: 10,
    riskProfile: 'aggressive',
  },
  {
    id: 'mega-cap-tech',
    name: 'Mega Cap Tech',
    description: 'Top tech giants',
    tickerPool: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'AMD'],
    assetCount: [3, 6],
    weightStep: 10,
    riskProfile: 'aggressive',
  },
  {
    id: 'semiconductor',
    name: 'Semiconductor',
    description: 'Chip maker focus',
    tickerPool: ['NVDA', 'AMD', 'INTC', 'SOXX', 'SMH', 'AVGO', 'QCOM', 'MU'],
    assetCount: [3, 5],
    weightStep: 10,
    riskProfile: 'aggressive',
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// WEIGHT COMBINATION GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

function* generateWeights(n: number, step: number, minWeight: number = 5): Generator<number[]> {
  if (n === 1) {
    yield [100];
    return;
  }
  
  function* backtrack(remaining: number, current: number[], depth: number): Generator<number[]> {
    if (depth === n - 1) {
      if (remaining >= minWeight) {
        yield [...current, remaining];
      }
      return;
    }
    
    const maxWeight = remaining - (n - depth - 1) * minWeight;
    for (let w = minWeight; w <= maxWeight; w += step) {
      current.push(w);
      yield* backtrack(remaining - w, current, depth + 1);
      current.pop();
    }
  }
  
  yield* backtrack(100, [], 0);
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMBINATION GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

function* combinations<T>(arr: T[], k: number): Generator<T[]> {
  if (k === 0) {
    yield [];
    return;
  }
  if (arr.length < k) return;
  
  function* backtrack(start: number, current: T[]): Generator<T[]> {
    if (current.length === k) {
      yield [...current];
      return;
    }
    
    for (let i = start; i <= arr.length - (k - current.length); i++) {
      current.push(arr[i]);
      yield* backtrack(i + 1, current);
      current.pop();
    }
  }
  
  yield* backtrack(0, []);
}

// ═══════════════════════════════════════════════════════════════════════════════
// PORTFOLIO METRIC ESTIMATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface EstimatedMetrics {
  cagr: number;
  volatility: number;
  sharpe: number;
  sortino: number;
  maxDrawdown: number;
  diversificationScore: number;
}

export function estimatePortfolioMetrics(
  tickers: string[],
  weights: number[],
  tickerStats: Map<string, CachedTickerStats>,
  avgCorrelation: number = 0.5
): EstimatedMetrics | null {
  const stats = tickers.map((t, i) => ({
    ticker: t,
    weight: weights[i] / 100,
    stats: tickerStats.get(t),
  })).filter(s => s.stats);
  
  if (stats.length !== tickers.length) return null;
  
  // Weighted average CAGR
  let cagr = 0;
  let volSquared = 0;
  let maxDDWeighted = 0;
  
  for (const { weight, stats: s } of stats) {
    cagr += weight * s!.cagr;
    volSquared += (weight * s!.volatility) ** 2;
    maxDDWeighted += weight * s!.maxDrawdown;
  }
  
  // Add correlation adjustment for volatility
  let crossTerms = 0;
  for (let i = 0; i < stats.length; i++) {
    for (let j = i + 1; j < stats.length; j++) {
      const wi = stats[i].weight;
      const wj = stats[j].weight;
      const volI = stats[i].stats!.volatility;
      const volJ = stats[j].stats!.volatility;
      crossTerms += 2 * wi * wj * volI * volJ * avgCorrelation;
    }
  }
  
  const volatility = Math.sqrt(volSquared + crossTerms);
  
  // Estimate risk-adjusted metrics
  const riskFreeRate = 5;
  const sharpe = volatility > 0 ? (cagr - riskFreeRate) / volatility : 0;
  const sortino = sharpe * 1.3; // Simplified estimate
  
  // Diversification reduces drawdown
  const diversificationFactor = 1 - (stats.length - 1) * 0.05;
  const maxDrawdown = maxDDWeighted * Math.max(0.7, diversificationFactor);
  
  // Diversification score based on category spread
  const categories = new Set(tickers.map(t => TICKER_MAP.get(t)?.category));
  const diversificationScore = Math.min(100, categories.size * 15 + stats.length * 5);
  
  return {
    cagr: Math.round(cagr * 100) / 100,
    volatility: Math.round(volatility * 100) / 100,
    sharpe: Math.round(sharpe * 100) / 100,
    sortino: Math.round(sortino * 100) / 100,
    maxDrawdown: Math.round(maxDrawdown * 100) / 100,
    diversificationScore: Math.round(diversificationScore),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// GENERATED PORTFOLIO TYPE
// ═══════════════════════════════════════════════════════════════════════════════

export interface GeneratedPortfolioV2 {
  id: string;
  name: string;
  family: string;
  tickers: string[];
  weights: number[];
  metrics: EstimatedMetrics;
  riskProfile: 'conservative' | 'moderate' | 'growth' | 'aggressive';
  matchScore: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FILTER CRITERIA
// ═══════════════════════════════════════════════════════════════════════════════

export interface FilterCriteria {
  maxDrawdown?: number;
  maxVolatility?: number;
  minSharpe?: number;
  minCagr?: number;
  minSortino?: number;
  riskProfiles?: ('conservative' | 'moderate' | 'growth' | 'aggressive')[];
  categories?: string[];
  minDiversification?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PORTFOLIO GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

export function* generatePortfoliosFromFamilies(
  tickerStats: Map<string, CachedTickerStats>,
  criteria: FilterCriteria,
  limit: number = 100000
): Generator<GeneratedPortfolioV2> {
  let count = 0;
  let id = 0;
  
  for (const family of PORTFOLIO_FAMILIES) {
    // Skip if risk profile doesn't match filter
    if (criteria.riskProfiles && !criteria.riskProfiles.includes(family.riskProfile)) {
      continue;
    }
    
    // Get available tickers (those with stats)
    const availableTickers = family.tickerPool.filter(t => tickerStats.has(t));
    if (availableTickers.length < family.assetCount[0]) continue;
    
    // Generate ticker combinations
    for (let numAssets = family.assetCount[0]; numAssets <= Math.min(family.assetCount[1], availableTickers.length); numAssets++) {
      for (const tickerCombo of combinations(availableTickers, numAssets)) {
        // Generate weight combinations
        for (const weights of generateWeights(numAssets, family.weightStep)) {
          if (count >= limit) return;
          
          // Estimate metrics
          const metrics = estimatePortfolioMetrics(tickerCombo, weights, tickerStats);
          if (!metrics) continue;
          
          // Apply filters
          if (criteria.maxDrawdown !== undefined && metrics.maxDrawdown > criteria.maxDrawdown) continue;
          if (criteria.maxVolatility !== undefined && metrics.volatility > criteria.maxVolatility) continue;
          if (criteria.minSharpe !== undefined && metrics.sharpe < criteria.minSharpe) continue;
          if (criteria.minCagr !== undefined && metrics.cagr < criteria.minCagr) continue;
          if (criteria.minSortino !== undefined && metrics.sortino < criteria.minSortino) continue;
          if (criteria.minDiversification !== undefined && metrics.diversificationScore < criteria.minDiversification) continue;
          
          // Calculate match score
          let matchScore = 70;
          if (criteria.maxDrawdown && metrics.maxDrawdown < criteria.maxDrawdown) {
            matchScore += Math.min(10, (criteria.maxDrawdown - metrics.maxDrawdown) / 2);
          }
          if (criteria.maxVolatility && metrics.volatility < criteria.maxVolatility) {
            matchScore += Math.min(10, (criteria.maxVolatility - metrics.volatility) / 2);
          }
          if (criteria.minSharpe && metrics.sharpe > criteria.minSharpe) {
            matchScore += Math.min(10, (metrics.sharpe - criteria.minSharpe) * 10);
          }
          
          const portfolioId = `${family.id}_${id++}`;
          
          yield {
            id: portfolioId,
            name: `${family.name}: ${tickerCombo.slice(0, 3).join('/')}${tickerCombo.length > 3 ? '...' : ''}`,
            family: family.name,
            tickers: tickerCombo,
            weights,
            metrics,
            riskProfile: family.riskProfile,
            matchScore: Math.min(100, Math.round(matchScore)),
          };
          
          count++;
        }
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCREENING FUNCTION WITH PAGINATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface GenerationProgress {
  phase: 'init' | 'generating' | 'filtering' | 'complete';
  current: number;
  total: number;
  message: string;
}

export async function screenPortfoliosV2(
  criteria: FilterCriteria,
  options: {
    page?: number;
    pageSize?: number;
    sortBy?: 'sharpe' | 'cagr' | 'maxDrawdown' | 'matchScore';
    sortDirection?: 'asc' | 'desc';
    limit?: number;
  } = {},
  onProgress?: (progress: GenerationProgress) => void
): Promise<{
  portfolios: GeneratedPortfolioV2[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  generationTime: number;
}> {
  const startTime = Date.now();
  const { page = 1, pageSize = 50, sortBy = 'matchScore', sortDirection = 'desc', limit = 100000 } = options;
  
  onProgress?.({ phase: 'init', current: 0, total: 100, message: 'Loading ticker statistics...' });
  
  // Get or fetch ticker stats
  let tickerStats = getCachedStats();
  
  if (!tickerStats) {
    onProgress?.({ phase: 'init', current: 10, total: 100, message: 'Fetching ticker data from database...' });
    tickerStats = await fetchAndCacheTickerStats(onProgress);
  }
  
  onProgress?.({ phase: 'generating', current: 20, total: 100, message: 'Generating portfolios...' });
  
  // Generate and collect portfolios
  const portfolios: GeneratedPortfolioV2[] = [];
  let generated = 0;
  
  for (const portfolio of generatePortfoliosFromFamilies(tickerStats, criteria, limit)) {
    portfolios.push(portfolio);
    generated++;
    
    if (generated % 5000 === 0) {
      onProgress?.({
        phase: 'generating',
        current: 20 + Math.round((generated / limit) * 60),
        total: 100,
        message: `Generated ${generated.toLocaleString()} portfolios...`,
      });
    }
  }
  
  onProgress?.({ phase: 'filtering', current: 85, total: 100, message: `Sorting ${portfolios.length.toLocaleString()} portfolios...` });
  
  // Sort portfolios
  const sortMultiplier = sortDirection === 'desc' ? -1 : 1;
  portfolios.sort((a, b) => {
    switch (sortBy) {
      case 'sharpe': return (a.metrics.sharpe - b.metrics.sharpe) * sortMultiplier;
      case 'cagr': return (a.metrics.cagr - b.metrics.cagr) * sortMultiplier;
      case 'maxDrawdown': return (a.metrics.maxDrawdown - b.metrics.maxDrawdown) * -sortMultiplier;
      case 'matchScore':
      default: return (a.matchScore - b.matchScore) * sortMultiplier;
    }
  });
  
  // Paginate
  const totalCount = portfolios.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const startIdx = (page - 1) * pageSize;
  const paginatedPortfolios = portfolios.slice(startIdx, startIdx + pageSize);
  
  onProgress?.({ phase: 'complete', current: 100, total: 100, message: `Found ${totalCount.toLocaleString()} portfolios` });
  
  return {
    portfolios: paginatedPortfolios,
    totalCount,
    page,
    pageSize,
    totalPages,
    generationTime: Date.now() - startTime,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FETCH AND CACHE TICKER STATS
// ═══════════════════════════════════════════════════════════════════════════════

async function fetchAndCacheTickerStats(
  onProgress?: (progress: GenerationProgress) => void
): Promise<Map<string, CachedTickerStats>> {
  const tickers = TICKER_UNIVERSE.map(t => t.symbol);
  const endDate = new Date();
  const startDate = new Date();
  startDate.setFullYear(endDate.getFullYear() - 1);
  
  const startStr = startDate.toISOString().split('T')[0];
  const endStr = endDate.toISOString().split('T')[0];
  
  // Fetch data in batches
  const batchSize = 50;
  const stats: CachedTickerStats[] = [];
  
  for (let i = 0; i < tickers.length; i += batchSize) {
    const batch = tickers.slice(i, i + batchSize);
    
    const { data, error } = await supabase
      .from('market_daily_bars')
      .select('ticker, bar_date, daily_return')
      .in('ticker', batch)
      .gte('bar_date', startStr)
      .lte('bar_date', endStr)
      .order('bar_date', { ascending: true });
    
    if (error) continue;
    
    // Group by ticker
    const tickerData: Record<string, number[]> = {};
    for (const row of data || []) {
      if (!tickerData[row.ticker]) tickerData[row.ticker] = [];
      tickerData[row.ticker].push(row.daily_return || 0);
    }
    
    // Calculate stats for each ticker
    for (const [ticker, returns] of Object.entries(tickerData)) {
      if (returns.length < 50) continue;
      
      const values: number[] = [100000];
      for (const r of returns) {
        values.push(values[values.length - 1] * (1 + r));
      }
      
      const years = returns.length / 252;
      const cagr = calculateCAGR(100000, values[values.length - 1], years) * 100;
      const volatility = annualizedVolatility(returns) * 100;
      const sharpe = calculateSharpeRatio(returns, 0.05);
      const sortino = calculateSortinoRatio(returns, 0.05);
      const { maxDrawdownPercent } = calculateMaxDrawdown(values);
      
      stats.push({
        symbol: ticker,
        cagr: Math.round(cagr * 100) / 100,
        volatility: Math.round(volatility * 100) / 100,
        sharpe: Math.round(sharpe * 100) / 100,
        sortino: Math.round(sortino * 100) / 100,
        maxDrawdown: Math.round(maxDrawdownPercent * 100) / 100,
        avgReturn: arithmeticMean(returns),
        dataPoints: returns.length,
        lastUpdated: new Date().toISOString(),
      });
    }
    
    onProgress?.({
      phase: 'init',
      current: Math.round(10 + (i / tickers.length) * 10),
      total: 100,
      message: `Fetched ${Math.min(i + batchSize, tickers.length)}/${tickers.length} tickers`,
    });
  }
  
  // Cache the results
  setCachedStats(stats);
  
  return new Map(stats.map(s => [s.symbol, s]));
}

// ═══════════════════════════════════════════════════════════════════════════════
// UNIVERSE STATISTICS
// ═══════════════════════════════════════════════════════════════════════════════

export function getUniverseStats(): {
  totalTickers: number;
  totalFamilies: number;
  estimatedPortfolios: number;
  categoryCounts: Record<string, number>;
} {
  // Calculate estimated portfolios
  let estimatedPortfolios = 0;
  
  for (const family of PORTFOLIO_FAMILIES) {
    const n = family.tickerPool.length;
    for (let k = family.assetCount[0]; k <= family.assetCount[1]; k++) {
      if (k > n) continue;
      
      // C(n, k) combinations of tickers
      const tickerCombos = factorial(n) / (factorial(k) * factorial(n - k));
      
      // Approximate weight combinations
      let weightCombos = 0;
      for (const _ of generateWeights(k, family.weightStep)) {
        weightCombos++;
      }
      
      estimatedPortfolios += tickerCombos * weightCombos;
    }
  }
  
  const categoryCounts: Record<string, number> = {};
  for (const ticker of TICKER_UNIVERSE) {
    categoryCounts[ticker.category] = (categoryCounts[ticker.category] || 0) + 1;
  }
  
  return {
    totalTickers: TICKER_UNIVERSE.length,
    totalFamilies: PORTFOLIO_FAMILIES.length,
    estimatedPortfolios,
    categoryCounts,
  };
}

function factorial(n: number): number {
  if (n <= 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

export default {
  TICKER_UNIVERSE,
  TICKER_MAP,
  PORTFOLIO_FAMILIES,
  screenPortfoliosV2,
  estimatePortfolioMetrics,
  calculateAccuratePortfolioMetrics,
  getUniverseStats,
  getCachedStats,
  setCachedStats,
};
