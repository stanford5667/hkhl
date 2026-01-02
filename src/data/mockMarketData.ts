// Static seed data for offline/development mode
// Prices as of January 2024

export interface MockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  marketCap?: number;
}

export interface MockIndex {
  symbol: string;
  name: string;
  value: number;
  change: number;
  changePercent: number;
}

export interface MockIndicator {
  symbol: string;
  name: string;
  value: number;
  unit: string;
  category: string;
}

// Common stock tickers with sample prices
export const MOCK_STOCKS: Record<string, MockQuote> = {
  // Tech Giants
  AAPL: { symbol: 'AAPL', name: 'Apple Inc.', price: 185.50, change: 1.25, changePercent: 0.68, marketCap: 2890000000000 },
  MSFT: { symbol: 'MSFT', name: 'Microsoft Corporation', price: 405.00, change: 2.50, changePercent: 0.62, marketCap: 3010000000000 },
  GOOGL: { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 142.75, change: -0.85, changePercent: -0.59, marketCap: 1780000000000 },
  AMZN: { symbol: 'AMZN', name: 'Amazon.com Inc.', price: 178.50, change: 1.75, changePercent: 0.99, marketCap: 1860000000000 },
  META: { symbol: 'META', name: 'Meta Platforms Inc.', price: 485.00, change: 4.20, changePercent: 0.87, marketCap: 1240000000000 },
  NVDA: { symbol: 'NVDA', name: 'NVIDIA Corporation', price: 875.50, change: 12.30, changePercent: 1.42, marketCap: 2160000000000 },
  TSLA: { symbol: 'TSLA', name: 'Tesla Inc.', price: 245.00, change: -3.50, changePercent: -1.41, marketCap: 780000000000 },
  
  // More Tech
  NFLX: { symbol: 'NFLX', name: 'Netflix Inc.', price: 565.00, change: 5.80, changePercent: 1.04, marketCap: 245000000000 },
  AMD: { symbol: 'AMD', name: 'Advanced Micro Devices', price: 175.25, change: 2.15, changePercent: 1.24, marketCap: 283000000000 },
  INTC: { symbol: 'INTC', name: 'Intel Corporation', price: 45.80, change: -0.45, changePercent: -0.97, marketCap: 194000000000 },
  CRM: { symbol: 'CRM', name: 'Salesforce Inc.', price: 275.50, change: 1.90, changePercent: 0.69, marketCap: 268000000000 },
  ORCL: { symbol: 'ORCL', name: 'Oracle Corporation', price: 125.75, change: 0.85, changePercent: 0.68, marketCap: 345000000000 },
  ADBE: { symbol: 'ADBE', name: 'Adobe Inc.', price: 585.00, change: 3.25, changePercent: 0.56, marketCap: 262000000000 },
  
  // Finance
  JPM: { symbol: 'JPM', name: 'JPMorgan Chase & Co.', price: 185.25, change: 1.10, changePercent: 0.60, marketCap: 535000000000 },
  BAC: { symbol: 'BAC', name: 'Bank of America Corp.', price: 35.50, change: 0.25, changePercent: 0.71, marketCap: 278000000000 },
  GS: { symbol: 'GS', name: 'Goldman Sachs Group', price: 425.00, change: 3.50, changePercent: 0.83, marketCap: 138000000000 },
  MS: { symbol: 'MS', name: 'Morgan Stanley', price: 95.75, change: 0.65, changePercent: 0.68, marketCap: 156000000000 },
  V: { symbol: 'V', name: 'Visa Inc.', price: 285.50, change: 1.25, changePercent: 0.44, marketCap: 585000000000 },
  MA: { symbol: 'MA', name: 'Mastercard Inc.', price: 465.00, change: 2.80, changePercent: 0.61, marketCap: 435000000000 },
  
  // Healthcare
  JNJ: { symbol: 'JNJ', name: 'Johnson & Johnson', price: 158.25, change: 0.45, changePercent: 0.29, marketCap: 382000000000 },
  UNH: { symbol: 'UNH', name: 'UnitedHealth Group', price: 525.00, change: 2.75, changePercent: 0.53, marketCap: 485000000000 },
  PFE: { symbol: 'PFE', name: 'Pfizer Inc.', price: 28.50, change: -0.15, changePercent: -0.52, marketCap: 160000000000 },
  ABBV: { symbol: 'ABBV', name: 'AbbVie Inc.', price: 165.75, change: 0.95, changePercent: 0.58, marketCap: 293000000000 },
  MRK: { symbol: 'MRK', name: 'Merck & Co.', price: 125.50, change: 0.65, changePercent: 0.52, marketCap: 318000000000 },
  
  // Consumer
  KO: { symbol: 'KO', name: 'Coca-Cola Company', price: 62.25, change: 0.35, changePercent: 0.57, marketCap: 269000000000 },
  PEP: { symbol: 'PEP', name: 'PepsiCo Inc.', price: 172.50, change: 0.85, changePercent: 0.50, marketCap: 237000000000 },
  WMT: { symbol: 'WMT', name: 'Walmart Inc.', price: 165.75, change: 1.15, changePercent: 0.70, marketCap: 446000000000 },
  HD: { symbol: 'HD', name: 'Home Depot Inc.', price: 375.50, change: 2.25, changePercent: 0.60, marketCap: 372000000000 },
  MCD: { symbol: 'MCD', name: "McDonald's Corporation", price: 295.00, change: 1.45, changePercent: 0.49, marketCap: 212000000000 },
  NKE: { symbol: 'NKE', name: 'Nike Inc.', price: 98.50, change: -0.75, changePercent: -0.76, marketCap: 149000000000 },
  
  // Energy
  XOM: { symbol: 'XOM', name: 'Exxon Mobil Corporation', price: 105.25, change: 0.85, changePercent: 0.81, marketCap: 425000000000 },
  CVX: { symbol: 'CVX', name: 'Chevron Corporation', price: 152.75, change: 1.25, changePercent: 0.82, marketCap: 285000000000 },
};

// Market Indices
export const MOCK_INDICES: Record<string, MockIndex> = {
  SPX: { symbol: 'SPX', name: 'S&P 500', value: 5021.84, change: 25.50, changePercent: 0.51 },
  '^GSPC': { symbol: '^GSPC', name: 'S&P 500', value: 5021.84, change: 25.50, changePercent: 0.51 },
  NDX: { symbol: 'NDX', name: 'NASDAQ 100', value: 17856.32, change: 145.20, changePercent: 0.82 },
  '^NDX': { symbol: '^NDX', name: 'NASDAQ 100', value: 17856.32, change: 145.20, changePercent: 0.82 },
  DJI: { symbol: 'DJI', name: 'Dow Jones Industrial', value: 38654.42, change: 125.75, changePercent: 0.33 },
  '^DJI': { symbol: '^DJI', name: 'Dow Jones Industrial', value: 38654.42, change: 125.75, changePercent: 0.33 },
  VIX: { symbol: 'VIX', name: 'CBOE Volatility Index', value: 14.52, change: -0.35, changePercent: -2.35 },
  '^VIX': { symbol: '^VIX', name: 'CBOE Volatility Index', value: 14.52, change: -0.35, changePercent: -2.35 },
  RUT: { symbol: 'RUT', name: 'Russell 2000', value: 2045.68, change: 12.30, changePercent: 0.60 },
  '^RUT': { symbol: '^RUT', name: 'Russell 2000', value: 2045.68, change: 12.30, changePercent: 0.60 },
};

// Economic Indicators
export const MOCK_INDICATORS: Record<string, MockIndicator> = {
  US10Y: { symbol: 'US10Y', name: '10-Year Treasury', value: 4.25, unit: '%', category: 'rates' },
  US2Y: { symbol: 'US2Y', name: '2-Year Treasury', value: 4.65, unit: '%', category: 'rates' },
  US30Y: { symbol: 'US30Y', name: '30-Year Treasury', value: 4.45, unit: '%', category: 'rates' },
  FEDFUNDS: { symbol: 'FEDFUNDS', name: 'Fed Funds Rate', value: 5.33, unit: '%', category: 'rates' },
  PRIME: { symbol: 'PRIME', name: 'Prime Rate', value: 8.50, unit: '%', category: 'rates' },
  
  CPI: { symbol: 'CPI', name: 'Consumer Price Index', value: 3.1, unit: '%', category: 'inflation' },
  PPI: { symbol: 'PPI', name: 'Producer Price Index', value: 1.8, unit: '%', category: 'inflation' },
  PCE: { symbol: 'PCE', name: 'PCE Price Index', value: 2.6, unit: '%', category: 'inflation' },
  
  WTI: { symbol: 'WTI', name: 'WTI Crude Oil', value: 78.50, unit: '$/bbl', category: 'commodities' },
  BRENT: { symbol: 'BRENT', name: 'Brent Crude', value: 82.75, unit: '$/bbl', category: 'commodities' },
  NATGAS: { symbol: 'NATGAS', name: 'Natural Gas', value: 2.45, unit: '$/MMBtu', category: 'commodities' },
  GOLD: { symbol: 'GOLD', name: 'Gold', value: 2045.50, unit: '$/oz', category: 'commodities' },
  SILVER: { symbol: 'SILVER', name: 'Silver', value: 23.15, unit: '$/oz', category: 'commodities' },
  COPPER: { symbol: 'COPPER', name: 'Copper', value: 3.85, unit: '$/lb', category: 'commodities' },
  
  BTC: { symbol: 'BTC', name: 'Bitcoin', value: 62500, unit: '$', category: 'crypto' },
  ETH: { symbol: 'ETH', name: 'Ethereum', value: 3450, unit: '$', category: 'crypto' },
  
  USDEUR: { symbol: 'USDEUR', name: 'USD/EUR', value: 0.92, unit: '', category: 'forex' },
  USDJPY: { symbol: 'USDJPY', name: 'USD/JPY', value: 148.50, unit: '', category: 'forex' },
  USDGBP: { symbol: 'USDGBP', name: 'USD/GBP', value: 0.79, unit: '', category: 'forex' },
  DXY: { symbol: 'DXY', name: 'US Dollar Index', value: 104.25, unit: '', category: 'forex' },
  
  UNRATE: { symbol: 'UNRATE', name: 'Unemployment Rate', value: 3.7, unit: '%', category: 'employment' },
  NFP: { symbol: 'NFP', name: 'Nonfarm Payrolls', value: 216, unit: 'K', category: 'employment' },
  GDP: { symbol: 'GDP', name: 'GDP Growth Rate', value: 3.3, unit: '%', category: 'growth' },
};

// Mock data timestamp (when this mock data was created)
export const MOCK_DATA_DATE = '2024-01-15';

// Helper to get mock stock data
export function getMockStock(symbol: string): MockQuote | null {
  const upper = symbol.toUpperCase();
  return MOCK_STOCKS[upper] || null;
}

// Helper to get mock index data
export function getMockIndex(symbol: string): MockIndex | null {
  const upper = symbol.toUpperCase();
  return MOCK_INDICES[upper] || MOCK_INDICES[`^${upper}`] || null;
}

// Helper to get mock indicator data
export function getMockIndicator(symbol: string): MockIndicator | null {
  const upper = symbol.toUpperCase();
  return MOCK_INDICATORS[upper] || null;
}

// Search mock stocks by name or symbol
export function searchMockStocks(query: string): MockQuote[] {
  const lower = query.toLowerCase();
  return Object.values(MOCK_STOCKS).filter(
    stock => 
      stock.symbol.toLowerCase().includes(lower) ||
      stock.name.toLowerCase().includes(lower)
  );
}

// Get all available mock symbols
export function getAllMockSymbols(): string[] {
  return [
    ...Object.keys(MOCK_STOCKS),
    ...Object.keys(MOCK_INDICES),
    ...Object.keys(MOCK_INDICATORS),
  ];
}
