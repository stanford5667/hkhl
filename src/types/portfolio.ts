// Portfolio Visualizer Types - Institutional Framework

export type LiquidityConstraint = 'high' | 'locked';
export type AssetClass = 'stocks' | 'crypto' | 'etfs' | 'bonds' | 'commodities' | 'real_estate';
export type PortfolioMode = 'manual' | 'ai';
export type MacroRegime = 'monetary_dominance' | 'fiscal_activism';

export interface InvestorProfile {
  investableCapital: number;
  liquidityConstraint: LiquidityConstraint;
  assetUniverse: AssetClass[];
  riskTolerance: number; // 0-100 scale
  taxBracket: 'low' | 'medium' | 'high';
  investmentHorizon: number; // years
}

export interface PortfolioAllocation {
  symbol: string;
  weight: number; // 0-100
  assetClass: AssetClass;
  name?: string;
}

export interface BlackLittermanView {
  symbol: string;
  viewWeight: number; // User's manual weight as "view"
  confidence: number; // 0-100, for manual = 100
  impliedRisk: number;
}

export interface EfficientFrontierPoint {
  risk: number; // volatility %
  return: number; // expected return %
  sharpe: number;
  weights: Map<string, number>;
}

export interface AdvancedMetrics {
  cvar95: number; // Conditional VaR at 95%
  cvar99: number;
  sortinoRatio: number;
  calmarRatio: number;
  liquidityScore: number; // 0-100
  informationRatio: number;
  treynorRatio: number;
  omega: number;
  tailRatio: number;
  ulcerIndex: number;
}

export interface RegimeAnalysis {
  currentRegime: MacroRegime;
  fiscalActivismPeriods: { start: string; end: string; impact: number }[];
  monetaryDominancePeriods: { start: string; end: string; impact: number }[];
  portfolioPerformanceByRegime: {
    fiscalActivism: { return: number; volatility: number; maxDD: number };
    monetaryDominance: { return: number; volatility: number; maxDD: number };
  };
}

export interface TaxLot {
  symbol: string;
  shares: number;
  costBasis: number;
  purchaseDate: Date;
  isLongTerm: boolean;
}

export interface RebalanceRecommendation {
  symbol: string;
  action: 'buy' | 'sell' | 'hold';
  shares: number;
  value: number;
  estimatedTax: number;
  isLongTermGain: boolean;
}

export interface OptimizationResult {
  mode: PortfolioMode;
  allocations: PortfolioAllocation[];
  efficientFrontier: EfficientFrontierPoint[];
  selectedPoint: EfficientFrontierPoint;
  metrics: AdvancedMetrics;
  regimeAnalysis: RegimeAnalysis;
  blackLittermanAdjustment?: {
    originalWeights: Map<string, number>;
    adjustedWeights: Map<string, number>;
    impliedReturns: Map<string, number>;
  };
  rebalanceRecommendations?: RebalanceRecommendation[];
}

// JP Morgan 60/40+ Rule defaults
export const JPMORGAN_DEFAULTS = {
  traditionalEquity: 0.40,
  fixedIncome: 0.30,
  alternatives: 0.30, // Real Estate, Commodities, Crypto
  expectedSharpeImprovement: 0.25, // 25% improvement vs pure 60/40
};

// Asset class ETF mappings - Expanded Universe
export const ASSET_CLASS_ETFS: Record<AssetClass, string[]> = {
  stocks: ['SPY', 'QQQ', 'IWM', 'VTI', 'VOO', 'DIA', 'SPYG', 'SPLV', 'GOOGL', 'AMZN', 'META', 'INTC', 'AMAT'],
  crypto: ['BITO', 'GBTC', 'ETHE', 'IBIT'],
  etfs: ['SPY', 'QQQ', 'IWM', 'DIA', 'VTI', 'VOO', 'EFA', 'VWO', 'EEM', 'SCHD', 'VIG', 'VYM', 'DVY'],
  bonds: ['BND', 'AGG', 'TLT', 'IEF', 'SHY', 'LQD', 'HYG'],
  commodities: ['GLD', 'SLV', 'DBC', 'USO', 'UNG'],
  real_estate: ['VNQ', 'XLRE', 'IYR', 'SCHH'],
};

// Sector ETF mappings
export const SECTOR_ETFS = {
  technology: 'XLK',
  financials: 'XLF',
  healthcare: 'XLV',
  energy: 'XLE',
  industrials: 'XLI',
  consumerStaples: 'XLP',
  utilities: 'XLU',
  consumerDiscretionary: 'XLY',
} as const;

// Liquidity scores for common assets (higher = more liquid)
export const LIQUIDITY_SCORES: Record<string, number> = {
  // Core ETFs
  SPY: 100, QQQ: 99, IWM: 95, DIA: 94, VTI: 98, VOO: 97,
  // International
  EFA: 92, VWO: 90, EEM: 89,
  // Sectors
  XLK: 88, XLF: 87, XLV: 86, XLE: 85, XLI: 84, XLP: 83, XLU: 82, XLY: 81,
  // Dividend
  SCHD: 85, VIG: 84, VYM: 83, DVY: 82,
  // Bonds
  AGG: 90, TLT: 88, IEF: 87, SHY: 86, HYG: 80, LQD: 79,
  // Commodities & Real Assets
  GLD: 85, DBC: 75, VNQ: 80,
  // Crypto
  BITO: 60, GBTC: 55,
  // Stocks
  AAPL: 98, MSFT: 98, GOOGL: 97, AMZN: 97, NVDA: 96, META: 95,
};
