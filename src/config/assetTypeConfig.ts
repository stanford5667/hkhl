/**
 * Asset Type Configuration System
 * Determines which tabs, metrics, and data to show based on the asset type
 */

import { 
  LayoutDashboard, 
  BarChart3, 
  FlaskConical, 
  Beaker,
  Newspaper, 
  FileText, 
  MessageCircle,
  Layers,
  DollarSign,
  PieChart,
  TrendingUp
} from 'lucide-react';

// Polygon.io asset types mapped to our categories
export type AssetCategory = 'stock' | 'etf' | 'crypto' | 'forex' | 'commodity' | 'index' | 'mutual_fund' | 'unknown';

export interface AssetTypeInfo {
  category: AssetCategory;
  label: string;
  description: string;
  hasFinancials: boolean;      // Income statement, balance sheet, cash flow
  hasEarnings: boolean;        // Earnings reports, earnings impact
  hasSECFilings: boolean;      // 10-K, 10-Q, etc.
  hasHoldings: boolean;        // ETF/fund holdings breakdown
  hasExpenseRatio: boolean;    // ETF/fund expense ratio
  hasAUM: boolean;             // Assets under management
  hasDividends: boolean;       // Dividend info
  hasAnalystRatings: boolean;  // Price targets, buy/sell ratings
  hasRevenueSegments: boolean; // Product/geographic revenue breakdown
  hasPE: boolean;              // P/E ratio is meaningful
  hasBeta: boolean;            // Beta to market
  hasMarketCap: boolean;       // True market cap (not AUM)
}

// Map Polygon "type" field to our asset category
export function getAssetCategory(polygonType: string | undefined, ticker?: string): AssetCategory {
  const type = (polygonType || '').toUpperCase();
  const upperTicker = (ticker || '').toUpperCase();
  
  // Common ETF detection by ticker pattern or Polygon type
  if (type === 'ETF' || type === 'ETV' || type === 'ETN') {
    return 'etf';
  }
  
  // Crypto detection
  if (type === 'CRYPTO' || upperTicker.endsWith('USD') || upperTicker.endsWith('USDT')) {
    return 'crypto';
  }
  
  // Forex detection
  if (type === 'FX' || type === 'FOREX') {
    return 'forex';
  }
  
  // Index detection
  if (type === 'INDEX' || type === 'INDICES') {
    return 'index';
  }
  
  // Mutual fund detection
  if (type === 'FUND' || type === 'OEF' || type === 'CEF') {
    return 'mutual_fund';
  }
  
  // Common stock
  if (type === 'CS' || type === 'COMMON' || type === 'STOCK' || type === '') {
    // Additional ETF detection by well-known tickers
    const etfTickers = [
      'SPY', 'QQQ', 'IWM', 'DIA', 'VTI', 'VOO', 'VT', 'EFA', 'VWO', 'EEM',
      'GLD', 'SLV', 'TLT', 'BND', 'AGG', 'IEF', 'SHY', 'LQD', 'HYG', 'JNK',
      'XLK', 'XLF', 'XLV', 'XLE', 'XLI', 'XLP', 'XLU', 'XLY', 'XLB', 'XLRE',
      'VNQ', 'VGT', 'VIG', 'VYM', 'SCHD', 'DVY', 'ARKK', 'ARKG', 'ARKW',
      'IVV', 'IJH', 'IJR', 'MDY', 'VXF', 'VB', 'VO', 'VV', 'VTV', 'VUG',
      'IBIT', 'BITO', 'GBTC', 'ETHE', 'USO', 'UNG', 'DBC', 'GSG',
      'SPYG', 'SPYV', 'SPLV', 'SPHD', 'NOBL', 'SDY', 'PFF',
      'EMB', 'MUB', 'TIP', 'VCIT', 'VCSH', 'BSV', 'BIV', 'BLV',
    ];
    
    if (etfTickers.includes(upperTicker)) {
      return 'etf';
    }
    
    // Commodity ETFs that track physical commodities
    const commodityETFs = ['GLD', 'SLV', 'USO', 'UNG', 'DBC', 'GSG'];
    if (commodityETFs.includes(upperTicker)) {
      return 'etf'; // Still ETF but might need special handling
    }
    
    return 'stock';
  }
  
  // Preferred stock - treat like stock
  if (type === 'PFD' || type === 'PREFERRED') {
    return 'stock';
  }
  
  // ADR - treat like stock
  if (type === 'ADR' || type === 'ADRC') {
    return 'stock';
  }
  
  // REIT - treat like stock (has financials)
  if (type === 'REIT') {
    return 'stock';
  }
  
  return 'unknown';
}

// Get full asset type info based on category
export function getAssetTypeInfo(category: AssetCategory): AssetTypeInfo {
  switch (category) {
    case 'stock':
      return {
        category: 'stock',
        label: 'Stock',
        description: 'Common stock or equity security',
        hasFinancials: true,
        hasEarnings: true,
        hasSECFilings: true,
        hasHoldings: false,
        hasExpenseRatio: false,
        hasAUM: false,
        hasDividends: true,
        hasAnalystRatings: true,
        hasRevenueSegments: true,
        hasPE: true,
        hasBeta: true,
        hasMarketCap: true,
      };
    
    case 'etf':
      return {
        category: 'etf',
        label: 'ETF',
        description: 'Exchange-traded fund',
        hasFinancials: false,
        hasEarnings: false,
        hasSECFilings: true, // ETFs have prospectuses
        hasHoldings: true,
        hasExpenseRatio: true,
        hasAUM: true,
        hasDividends: true,
        hasAnalystRatings: false,
        hasRevenueSegments: false,
        hasPE: false,
        hasBeta: true,
        hasMarketCap: false, // Uses AUM instead
      };
    
    case 'crypto':
      return {
        category: 'crypto',
        label: 'Crypto',
        description: 'Cryptocurrency',
        hasFinancials: false,
        hasEarnings: false,
        hasSECFilings: false,
        hasHoldings: false,
        hasExpenseRatio: false,
        hasAUM: false,
        hasDividends: false,
        hasAnalystRatings: false,
        hasRevenueSegments: false,
        hasPE: false,
        hasBeta: true,
        hasMarketCap: true,
      };
    
    case 'forex':
      return {
        category: 'forex',
        label: 'Forex',
        description: 'Foreign exchange currency pair',
        hasFinancials: false,
        hasEarnings: false,
        hasSECFilings: false,
        hasHoldings: false,
        hasExpenseRatio: false,
        hasAUM: false,
        hasDividends: false,
        hasAnalystRatings: false,
        hasRevenueSegments: false,
        hasPE: false,
        hasBeta: false,
        hasMarketCap: false,
      };
    
    case 'commodity':
      return {
        category: 'commodity',
        label: 'Commodity',
        description: 'Physical commodity',
        hasFinancials: false,
        hasEarnings: false,
        hasSECFilings: false,
        hasHoldings: false,
        hasExpenseRatio: false,
        hasAUM: false,
        hasDividends: false,
        hasAnalystRatings: false,
        hasRevenueSegments: false,
        hasPE: false,
        hasBeta: true,
        hasMarketCap: false,
      };
    
    case 'index':
      return {
        category: 'index',
        label: 'Index',
        description: 'Market index',
        hasFinancials: false,
        hasEarnings: false,
        hasSECFilings: false,
        hasHoldings: true, // Index components
        hasExpenseRatio: false,
        hasAUM: false,
        hasDividends: false,
        hasAnalystRatings: false,
        hasRevenueSegments: false,
        hasPE: true, // Index P/E is meaningful
        hasBeta: false,
        hasMarketCap: true, // Aggregate market cap
      };
    
    case 'mutual_fund':
      return {
        category: 'mutual_fund',
        label: 'Mutual Fund',
        description: 'Mutual fund',
        hasFinancials: false,
        hasEarnings: false,
        hasSECFilings: true,
        hasHoldings: true,
        hasExpenseRatio: true,
        hasAUM: true,
        hasDividends: true,
        hasAnalystRatings: false,
        hasRevenueSegments: false,
        hasPE: false,
        hasBeta: true,
        hasMarketCap: false,
      };
    
    default:
      return {
        category: 'unknown',
        label: 'Asset',
        description: 'Unknown asset type',
        hasFinancials: false,
        hasEarnings: false,
        hasSECFilings: false,
        hasHoldings: false,
        hasExpenseRatio: false,
        hasAUM: false,
        hasDividends: false,
        hasAnalystRatings: true, // Show by default
        hasRevenueSegments: false,
        hasPE: false,
        hasBeta: true,
        hasMarketCap: false,
      };
  }
}

// Tab configuration for different asset types
export interface AssetTab {
  id: string;
  label: string;
  icon: React.ElementType;
  shortLabel?: string;
  color?: string;
}

export function getTabsForAssetType(assetInfo: AssetTypeInfo): AssetTab[] {
  const tabs: AssetTab[] = [
    // Overview is always shown
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, color: 'blue' },
    // Backtest is always second
    { id: 'backtest', label: 'Backtest', icon: Beaker, color: 'primary' },
  ];
  
  // Financials tab only for stocks
  if (assetInfo.hasFinancials) {
    tabs.push({ id: 'financials', label: 'Financials', icon: BarChart3, color: 'emerald' });
  }
  
  // Holdings tab for ETFs and mutual funds
  if (assetInfo.hasHoldings) {
    tabs.push({ id: 'holdings', label: 'Holdings', icon: PieChart, shortLabel: 'Holdings', color: 'violet' });
  }
  
  // Quant Lab - useful for most tradable assets
  tabs.push({ id: 'quant-lab', label: 'Quant Lab', icon: FlaskConical, shortLabel: 'Quant', color: 'violet' });
  
  // News is always shown
  tabs.push({ id: 'news', label: 'News', icon: Newspaper, color: 'amber' });
  
  // SEC filings for stocks and regulated funds
  if (assetInfo.hasSECFilings) {
    tabs.push({ id: 'sec', label: 'SEC Filings', icon: FileText, shortLabel: 'SEC', color: 'cyan' });
  }
  
  // Social/Analyst for stocks
  if (assetInfo.hasAnalystRatings) {
    tabs.push({ id: 'analyst-social', label: 'Analyst & Social', icon: MessageCircle, shortLabel: 'Social', color: 'rose' });
  }
  
  return tabs;
}

// Helper to check if a specific feature should be shown
export function shouldShowFeature(
  assetInfo: AssetTypeInfo, 
  feature: keyof Omit<AssetTypeInfo, 'category' | 'label' | 'description'>
): boolean {
  return assetInfo[feature];
}
