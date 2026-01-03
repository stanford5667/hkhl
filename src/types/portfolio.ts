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

// Asset class ETF mappings
export const ASSET_CLASS_ETFS: Record<AssetClass, string[]> = {
  stocks: ['SPY', 'QQQ', 'IWM', 'VTI', 'VOO', 'SCHD'],
  crypto: ['BITO', 'GBTC', 'ETHE'],
  etfs: ['SPY', 'QQQ', 'IWM', 'DIA', 'VTI'],
  bonds: ['BND', 'AGG', 'TLT', 'IEF', 'LQD', 'HYG'],
  commodities: ['GLD', 'SLV', 'DBC', 'USO', 'UNG'],
  real_estate: ['VNQ', 'XLRE', 'IYR', 'SCHH'],
};

// Liquidity scores for common assets (higher = more liquid)
export const LIQUIDITY_SCORES: Record<string, number> = {
  SPY: 100, QQQ: 99, IWM: 95, DIA: 94,
  AAPL: 98, MSFT: 98, GOOGL: 97, AMZN: 97, NVDA: 96,
  BND: 90, AGG: 90, TLT: 88,
  GLD: 85, VNQ: 80,
  BITO: 60, GBTC: 55,
};
