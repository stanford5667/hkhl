/**
 * ValuationInput - Strict TypeScript interface for the CFA-Aligned Valuation Suite
 * ALL initial states are null until live data is received. No hardcoded placeholders.
 */

export interface ValuationInput {
  // Market Data (from API)
  currentPrice: number | null;
  marketCap: number | null;
  sharesOutstanding: number | null;
  beta: number | null;

  // Earnings Estimates (Base Case from analyst consensus)
  forwardEPS: number | null;
  forwardRevenue: number | null;
  forwardEPSGrowth: number | null;

  // Historical Financials
  trailingEPS: number | null;
  trailingRevenue: number | null;
  netIncome: number | null;
  freeCashFlow: number | null;
  totalEquity: number | null;
  totalDebt: number | null;
  interestExpense: number | null;
  dividendsPerShare: number | null;

  // Ratios (from API)
  trailingPE: number | null;
  forwardPE: number | null;
  priceToBook: number | null;
  evToEbitda: number | null;
  returnOnEquity: number | null;
  payoutRatio: number | null;
  debtToEquity: number | null;

  // Data integrity flag
  isDataDynamic: boolean;
  dataSource: string;
  dataQuality: number;
}

export interface ScenarioAssumptions {
  revenueGrowth: number | null;
  epsGrowth: number | null;
  terminalMultiple: number | null;
  discountRate: number | null;
  terminalGrowthRate: number | null;
  marginExpansion: number | null;
}

export interface ScenarioOutput {
  fairValue: number | null;
  impliedReturn: number | null;
  priceTarget: number | null;
}

export interface ValuationScenarios {
  bear: { assumptions: ScenarioAssumptions; output: ScenarioOutput };
  base: { assumptions: ScenarioAssumptions; output: ScenarioOutput };
  bull: { assumptions: ScenarioAssumptions; output: ScenarioOutput };
}

export interface JustifiedPEResult {
  payoutRatio: number | null;
  costOfEquity: number | null;      // r from CAPM
  sustainableGrowth: number | null;  // g = ROE * (1 - payout)
  justifiedPE: number | null;       // Payout / (r - g)
  marketPE: number | null;
  isOvervalued: boolean | null;
}

export interface DCFResult {
  projectedFCFs: number[];
  terminalValue: number | null;
  enterpriseValue: number | null;
  equityValue: number | null;
  impliedPrice: number | null;
  wacc: number | null;
}

export interface FootballFieldRange {
  label: string;
  methodology: 'DCF' | 'Justified P/E' | 'Market Comps';
  low: number | null;
  mid: number | null;
  high: number | null;
}

export interface SensitivityCell {
  wacc: number;
  terminalGrowth: number;
  impliedPrice: number | null;
  isClosestToMarket: boolean;
}

export type ScenarioKey = 'bear' | 'base' | 'bull';
