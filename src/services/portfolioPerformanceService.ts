/**
 * Portfolio Performance Service
 * Calculates real portfolio values from holdings with live price data
 */

import { getCachedQuotes } from './quoteCacheService';

export interface PortfolioHolding {
  id: string;
  name: string;
  asset_class: string | null;
  ticker_symbol: string | null;
  shares_owned: number | null;
  cost_basis: number | null;
  market_value: number | null;
  current_price: number | null;
  revenue_ltm: number | null;
  ebitda_ltm: number | null;
  company_type: string | null;
}

export interface AssetClassData {
  value: number;
  costBasis: number;
  todayChange: number;
  holdings: number;
}

export interface PortfolioSnapshot {
  date: string; // YYYY-MM-DD
  totalValue: number;
  byAssetClass: Record<string, number>;
}

export interface PortfolioPerformanceResult {
  totalValue: number;
  totalCostBasis: number;
  todayChange: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  todayChangePercent: number;
  byAssetClass: Record<string, AssetClassData>;
  history: PortfolioSnapshot[];
}

const PORTFOLIO_HISTORY_KEY = 'portfolio-history';
const MAX_HISTORY_DAYS = 365;

/**
 * Get stored portfolio history from localStorage
 */
function getStoredHistory(cacheKey: string = PORTFOLIO_HISTORY_KEY): PortfolioSnapshot[] {
  try {
    const stored = localStorage.getItem(cacheKey);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Store portfolio snapshot to history
 */
function storeSnapshot(snapshot: PortfolioSnapshot, cacheKey: string = PORTFOLIO_HISTORY_KEY) {
  try {
    let history = getStoredHistory(cacheKey);
    
    // Check if we already have today's snapshot
    const existingIndex = history.findIndex(h => h.date === snapshot.date);
    if (existingIndex >= 0) {
      history[existingIndex] = snapshot;
    } else {
      history.push(snapshot);
    }
    
    // Keep only last MAX_HISTORY_DAYS entries
    history.sort((a, b) => a.date.localeCompare(b.date));
    if (history.length > MAX_HISTORY_DAYS) {
      history = history.slice(-MAX_HISTORY_DAYS);
    }
    
    localStorage.setItem(cacheKey, JSON.stringify(history));
  } catch (e) {
    console.warn('[PortfolioPerformance] Failed to store snapshot:', e);
  }
}

/**
 * Get today's date in YYYY-MM-DD format
 */
function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Calculate value for a single holding based on asset class
 */
function calculateHoldingValue(
  holding: PortfolioHolding,
  livePrice?: number,
  liveChange?: number
): { value: number; todayChange: number; costBasis: number } {
  const assetClass = holding.asset_class || 'other';
  let value = 0;
  let todayChange = 0;
  const costBasis = holding.cost_basis || 0;

  switch (assetClass) {
    case 'public_equity':
      // Use live price × shares if available
      const price = livePrice || holding.current_price || 0;
      const shares = holding.shares_owned || 0;
      value = shares * price;
      todayChange = shares * (liveChange || 0);
      break;

    case 'private_equity':
      // Priority: market_value > ebitda × 8 > revenue × 2 > cost_basis
      if (holding.market_value && holding.market_value > 0) {
        value = holding.market_value;
      } else if (holding.ebitda_ltm && holding.ebitda_ltm > 0) {
        value = holding.ebitda_ltm * 8;
      } else if (holding.revenue_ltm && holding.revenue_ltm > 0) {
        value = holding.revenue_ltm * 2;
      } else {
        value = costBasis;
      }
      break;

    case 'real_estate':
    case 'credit':
    default:
      // Use market_value if available, otherwise cost_basis
      value = holding.market_value || costBasis;
      break;
  }

  return { value, todayChange, costBasis };
}

/**
 * Calculate full portfolio performance from holdings
 */
export async function calculatePortfolioPerformance(
  holdings: PortfolioHolding[],
  cacheKey: string = PORTFOLIO_HISTORY_KEY
): Promise<PortfolioPerformanceResult> {
  // Filter to portfolio holdings only
  const portfolioHoldings = holdings.filter(h => h.company_type === 'portfolio');
  
  // Get unique tickers for public equities
  const publicEquityTickers = portfolioHoldings
    .filter(h => h.asset_class === 'public_equity' && h.ticker_symbol)
    .map(h => h.ticker_symbol!.toUpperCase());
  
  const uniqueTickers = [...new Set(publicEquityTickers)];
  
  // Fetch live quotes for public equities
  let quotes = new Map<string, { price: number; change: number }>();
  if (uniqueTickers.length > 0) {
    try {
      const fetchedQuotes = await getCachedQuotes(uniqueTickers);
      fetchedQuotes.forEach((quote, symbol) => {
        quotes.set(symbol.toUpperCase(), {
          price: quote.price,
          change: quote.change,
        });
      });
    } catch (e) {
      console.warn('[PortfolioPerformance] Failed to fetch quotes:', e);
    }
  }

  // Initialize asset class totals
  const byAssetClass: Record<string, AssetClassData> = {
    public_equity: { value: 0, costBasis: 0, todayChange: 0, holdings: 0 },
    private_equity: { value: 0, costBasis: 0, todayChange: 0, holdings: 0 },
    real_estate: { value: 0, costBasis: 0, todayChange: 0, holdings: 0 },
    credit: { value: 0, costBasis: 0, todayChange: 0, holdings: 0 },
    other: { value: 0, costBasis: 0, todayChange: 0, holdings: 0 },
  };

  let totalValue = 0;
  let totalCostBasis = 0;
  let totalTodayChange = 0;

  // Calculate value for each holding
  for (const holding of portfolioHoldings) {
    const assetClass = holding.asset_class || 'other';
    const normalizedClass = byAssetClass[assetClass] ? assetClass : 'other';
    
    // Get live quote if public equity
    let livePrice: number | undefined;
    let liveChange: number | undefined;
    if (assetClass === 'public_equity' && holding.ticker_symbol) {
      const quote = quotes.get(holding.ticker_symbol.toUpperCase());
      if (quote) {
        livePrice = quote.price;
        liveChange = quote.change;
      }
    }

    const { value, todayChange, costBasis } = calculateHoldingValue(
      holding,
      livePrice,
      liveChange
    );

    byAssetClass[normalizedClass].value += value;
    byAssetClass[normalizedClass].costBasis += costBasis;
    byAssetClass[normalizedClass].todayChange += todayChange;
    byAssetClass[normalizedClass].holdings += 1;

    totalValue += value;
    totalCostBasis += costBasis;
    totalTodayChange += todayChange;
  }

  // Calculate percentages
  const totalGainLoss = totalValue - totalCostBasis;
  const totalGainLossPercent = totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0;
  const todayChangePercent = totalValue > 0 ? (totalTodayChange / (totalValue - totalTodayChange)) * 100 : 0;

  // Store today's snapshot
  const todayString = getTodayString();
  const snapshot: PortfolioSnapshot = {
    date: todayString,
    totalValue,
    byAssetClass: {
      public_equity: byAssetClass.public_equity.value,
      private_equity: byAssetClass.private_equity.value,
      real_estate: byAssetClass.real_estate.value,
      credit: byAssetClass.credit.value,
      other: byAssetClass.other.value,
    },
  };
  storeSnapshot(snapshot, cacheKey);

  // Get historical data
  const history = getStoredHistory(cacheKey);

  return {
    totalValue,
    totalCostBasis,
    todayChange: totalTodayChange,
    totalGainLoss,
    totalGainLossPercent,
    todayChangePercent,
    byAssetClass,
    history,
  };
}

/**
 * Generate demo historical data for testing
 */
export function generateDemoHistory(
  currentValue: number, 
  byAssetClass: Record<string, number>,
  cacheKey: string = PORTFOLIO_HISTORY_KEY
): PortfolioSnapshot[] {
  const today = new Date();
  const history: PortfolioSnapshot[] = [];
  
  // Generate 90 days of demo data
  for (let i = 90; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateString = date.toISOString().split('T')[0];
    
    // Create variance that trends towards current value
    const progress = (90 - i) / 90;
    const baseVariance = 0.15; // 15% max variance from current
    const variance = (1 - baseVariance) + (baseVariance * progress) + (Math.random() - 0.5) * 0.02;
    
    history.push({
      date: dateString,
      totalValue: currentValue * variance,
      byAssetClass: {
        public_equity: (byAssetClass.public_equity || 0) * variance,
        private_equity: (byAssetClass.private_equity || 0) * (0.98 + Math.random() * 0.04), // Less volatile
        real_estate: (byAssetClass.real_estate || 0) * (0.99 + Math.random() * 0.02),
        credit: (byAssetClass.credit || 0) * (0.995 + Math.random() * 0.01),
        other: (byAssetClass.other || 0) * (0.98 + Math.random() * 0.04),
      },
    });
  }
  
  // Store the generated history
  try {
    localStorage.setItem(cacheKey, JSON.stringify(history));
  } catch (e) {
    console.warn('[PortfolioPerformance] Failed to store demo history:', e);
  }
  
  return history;
}

/**
 * Clear portfolio history
 */
export function clearPortfolioHistory() {
  localStorage.removeItem(PORTFOLIO_HISTORY_KEY);
}

/**
 * Get portfolio history
 */
export function getPortfolioHistory(): PortfolioSnapshot[] {
  return getStoredHistory();
}
