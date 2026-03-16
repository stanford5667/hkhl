/**
 * useValuationEngine - CFA-Aligned Valuation Calculation Engine
 * Derives all values from live API data with robust fallbacks.
 * Uses analyst consensus as Base Case, +/- 25% for Bull/Bear.
 */

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useComprehensiveFundamentals } from '@/hooks/useComprehensiveFundamentals';
import type {
  ValuationInput,
  ScenarioAssumptions,
  ScenarioOutput,
  ValuationScenarios,
  JustifiedPEResult,
  DCFResult,
  FootballFieldRange,
  SensitivityCell,
  ScenarioKey,
} from './types';

const RISK_FREE_RATE = 0.043; // 10Y Treasury
const MARKET_RISK_PREMIUM = 0.055; // Historical equity risk premium

function buildValuationInput(fundamentals: any, financialData: any): ValuationInput {
  const profile = financialData?.profile;
  const ratios = financialData?.ratios;
  const financials = financialData?.financials?.[0];
  const estimates = financialData?.estimates?.[0];
  const balanceSheet = financialData?.balanceSheet;

  const price = fundamentals.price ?? profile?.price ?? null;
  const eps = fundamentals.eps ?? financials?.eps ?? null;
  const marketCap = fundamentals.marketCap ?? profile?.marketCap ?? null;
  const sharesOutstanding = price && marketCap ? marketCap / price : null;

  // Payout ratio: try dividendsPaid, else default 30% if ROE available, else 25% fallback
  const dividendsPerShare =
    (financials as any)?.dividendsPaid && sharesOutstanding
      ? Math.abs((financials as any).dividendsPaid) / sharesOutstanding
      : null;
  const payoutRatio =
    dividendsPerShare && eps && eps > 0
      ? Math.min(dividendsPerShare / eps, 1)
      : 0.3; // Default payout for most companies

  // Forward EPS: prefer estimates, fallback to trailing EPS * (1 + growth)
  const rawForwardEPS = estimates?.estimatedEpsAvg ?? null;
  const epsGrowth = fundamentals.epsGrowthYoY ?? null;
  const forwardEPS =
    rawForwardEPS ??
    (eps != null && epsGrowth != null ? eps * (1 + epsGrowth / 100) : eps);

  // Beta: fallback to 1.0 (market beta)
  const beta = fundamentals.beta ?? 1.0;

  // ROE: derive from net income / equity if not available
  const roe =
    fundamentals.returnOnEquity ??
    (financials?.netIncome && balanceSheet?.totalEquity && balanceSheet.totalEquity > 0
      ? (financials.netIncome / balanceSheet.totalEquity) * 100
      : null);

  // Forward PE: derive if we have price and forward EPS
  const forwardPE =
    fundamentals.forwardPE ??
    (price != null && forwardEPS != null && forwardEPS > 0 ? price / forwardEPS : null);

  // Trailing PE
  const trailingPE =
    fundamentals.pe ??
    (price != null && eps != null && eps > 0 ? price / eps : null);

  // Free Cash Flow: try ratios, then derive from operating income * 0.8
  const freeCashFlow =
    ratios?.freeCashFlow ??
    (financials?.operatingIncome != null ? financials.operatingIncome * 0.8 : null) ??
    (financials?.netIncome != null ? financials.netIncome * 0.9 : null);

  // EPS Growth: derive from historical if not available
  const derivedEPSGrowth =
    epsGrowth ??
    (fundamentals.revenueGrowthYoY != null ? fundamentals.revenueGrowthYoY : 8); // fallback 8%

  return {
    currentPrice: price,
    marketCap,
    sharesOutstanding,
    beta,
    forwardEPS,
    forwardRevenue: estimates?.estimatedRevenueAvg ?? fundamentals.revenue ?? null,
    forwardEPSGrowth: derivedEPSGrowth,
    trailingEPS: eps,
    trailingRevenue: fundamentals.revenue,
    netIncome: financials?.netIncome ?? null,
    freeCashFlow,
    totalEquity: balanceSheet?.totalEquity ?? null,
    totalDebt: balanceSheet
      ? (balanceSheet.longTermDebt ?? 0) + (balanceSheet.shortTermDebt ?? 0)
      : null,
    interestExpense: fundamentals.interestExpense,
    dividendsPerShare,
    trailingPE,
    forwardPE,
    priceToBook: fundamentals.priceToBook,
    evToEbitda: fundamentals.evToEbitda,
    returnOnEquity: roe,
    payoutRatio,
    debtToEquity: fundamentals.debtToEquity,
    isDataDynamic: !fundamentals.useMockData,
    dataSource: fundamentals.source || 'API',
    dataQuality: fundamentals.dataQuality || 1,
  };
}

// CAPM: r = Rf + β(Rm - Rf)
function computeCostOfEquity(beta: number | null): number {
  const b = beta ?? 1.0;
  return RISK_FREE_RATE + b * MARKET_RISK_PREMIUM;
}

// Sustainable Growth: g = ROE × (1 - Payout Ratio)
function computeSustainableGrowth(roe: number | null, payoutRatio: number | null): number {
  const r = (roe ?? 15) / 100;
  const p = payoutRatio ?? 0.3;
  return r * (1 - p);
}

// Justified P/E = Payout Ratio / (r - g)  [Gordon Growth Model]
function computeJustifiedPE(input: ValuationInput): JustifiedPEResult {
  const r = computeCostOfEquity(input.beta);
  const g = computeSustainableGrowth(input.returnOnEquity, input.payoutRatio);
  const payout = input.payoutRatio ?? 0.3;

  let justifiedPE: number | null = null;
  if (r > g) {
    justifiedPE = payout / (r - g);
  }

  const marketPE = input.forwardPE ?? input.trailingPE;

  return {
    payoutRatio: payout,
    costOfEquity: r,
    sustainableGrowth: g,
    justifiedPE,
    marketPE,
    isOvervalued:
      justifiedPE != null && marketPE != null ? marketPE > justifiedPE : null,
  };
}

// 5-Year DCF
function computeDCF(
  input: ValuationInput,
  assumptions: ScenarioAssumptions
): DCFResult {
  const wacc = assumptions.discountRate ?? computeCostOfEquity(input.beta);
  const tgr = assumptions.terminalGrowthRate ?? 0.025;
  const growth = assumptions.epsGrowth ?? 0.05;
  const shares = input.sharesOutstanding;

  // Derive FCF from multiple sources
  let fcf = input.freeCashFlow;
  if (fcf == null && input.netIncome != null) {
    fcf = input.netIncome * 0.9; // Approximate FCF from net income
  }
  if (fcf == null && input.trailingEPS != null && shares != null) {
    fcf = input.trailingEPS * shares * 0.85; // Approximate from EPS
  }

  if (fcf == null || shares == null || shares === 0 || wacc <= tgr) {
    return { projectedFCFs: [], terminalValue: null, enterpriseValue: null, equityValue: null, impliedPrice: null, wacc };
  }

  const projectedFCFs: number[] = [];
  let currentFCF = fcf;
  let pvSum = 0;

  for (let i = 1; i <= 5; i++) {
    currentFCF = currentFCF * (1 + growth);
    const pv = currentFCF / Math.pow(1 + wacc, i);
    projectedFCFs.push(currentFCF);
    pvSum += pv;
  }

  const terminalFCF = currentFCF * (1 + tgr);
  const terminalValue = terminalFCF / (wacc - tgr);
  const pvTerminal = terminalValue / Math.pow(1 + wacc, 5);

  const enterpriseValue = pvSum + pvTerminal;
  const totalDebt = input.totalDebt ?? 0;
  const equityValue = enterpriseValue - totalDebt;
  const impliedPrice = equityValue / shares;

  return { projectedFCFs, terminalValue, enterpriseValue, equityValue, impliedPrice: impliedPrice > 0 ? impliedPrice : null, wacc };
}

function buildScenarioAssumptions(
  input: ValuationInput,
  scenario: ScenarioKey
): ScenarioAssumptions {
  const baseGrowth = input.forwardEPSGrowth != null ? input.forwardEPSGrowth / 100 : 0.08;
  const r = computeCostOfEquity(input.beta);
  const offsets: Record<ScenarioKey, number> = { bear: -0.25, base: 0, bull: 0.25 };
  const offset = offsets[scenario];

  // Terminal multiple: use forward PE or derive from trailing PE, fallback to 15x
  const basePE = input.forwardPE ?? input.trailingPE ?? 15;

  return {
    revenueGrowth: baseGrowth * (1 + offset),
    epsGrowth: baseGrowth * (1 + offset),
    terminalMultiple: basePE * (1 + offset * 0.5),
    discountRate: r + (scenario === 'bear' ? 0.02 : scenario === 'bull' ? -0.01 : 0),
    terminalGrowthRate: scenario === 'bear' ? 0.02 : scenario === 'bull' ? 0.035 : 0.025,
    marginExpansion: scenario === 'bear' ? -0.01 : scenario === 'bull' ? 0.015 : 0,
  };
}

function computeScenarioOutput(
  input: ValuationInput,
  assumptions: ScenarioAssumptions
): ScenarioOutput {
  // Price target via terminal multiple on forward EPS
  const epsBase = input.forwardEPS ?? input.trailingEPS;
  const growth = assumptions.epsGrowth ?? 0.08;
  const multiple = assumptions.terminalMultiple ?? 15;

  if (epsBase == null) {
    return { fairValue: null, impliedReturn: null, priceTarget: null };
  }

  const futureEPS = epsBase * (1 + growth);
  const priceTarget = futureEPS * multiple;
  const fairValue = priceTarget;
  const impliedReturn =
    input.currentPrice != null && input.currentPrice > 0
      ? ((priceTarget - input.currentPrice) / input.currentPrice) * 100
      : null;

  return { fairValue, impliedReturn, priceTarget };
}

function buildSensitivityMatrix(
  input: ValuationInput,
  baseWACC: number
): SensitivityCell[][] {
  const shares = input.sharesOutstanding;
  if (shares == null || shares === 0) return [];

  // Need some form of cash flow
  let hasFCF = input.freeCashFlow != null || input.netIncome != null || (input.trailingEPS != null && shares != null);
  if (!hasFCF) return [];

  const waccSteps = [-0.02, -0.01, 0, 0.01, 0.02].map(d => baseWACC + d);
  const tgrSteps = [0.015, 0.02, 0.025, 0.03, 0.035];

  let closestDiff = Infinity;
  let closestCoords: [number, number] = [0, 0];

  const matrix: SensitivityCell[][] = waccSteps.map((wacc, wi) =>
    tgrSteps.map((tgr, gi) => {
      if (wacc <= tgr) {
        return { wacc, terminalGrowth: tgr, impliedPrice: null, isClosestToMarket: false };
      }
      const dcf = computeDCF(input, {
        revenueGrowth: null,
        epsGrowth: input.forwardEPSGrowth != null ? input.forwardEPSGrowth / 100 : 0.08,
        terminalMultiple: null,
        discountRate: wacc,
        terminalGrowthRate: tgr,
        marginExpansion: null,
      });
      const price = dcf.impliedPrice;
      if (price != null && input.currentPrice != null) {
        const diff = Math.abs(price - input.currentPrice);
        if (diff < closestDiff) {
          closestDiff = diff;
          closestCoords = [wi, gi];
        }
      }
      return { wacc, terminalGrowth: tgr, impliedPrice: price, isClosestToMarket: false };
    })
  );

  if (matrix.length > 0 && matrix[closestCoords[0]]?.[closestCoords[1]]) {
    matrix[closestCoords[0]][closestCoords[1]].isClosestToMarket = true;
  }

  return matrix;
}

export function useValuationEngine(ticker: string) {
  const fundamentals = useComprehensiveFundamentals(ticker);

  // Fetch raw financial data for balance sheet / FCF
  const { data: financialData, isLoading: financialLoading } = useQuery({
    queryKey: ['financial-statements', ticker],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('fmp-fundamentals', {
        body: { action: 'fundamentals', symbol: ticker },
      });
      if (error) throw error;
      return data;
    },
    staleTime: 30 * 60 * 1000,
    enabled: !!ticker,
  });

  // User-editable scenario overrides
  const [userOverrides, setUserOverrides] = useState<Partial<Record<ScenarioKey, Partial<ScenarioAssumptions>>>>({});

  const isLoading = fundamentals.isLoading || financialLoading;

  const result = useMemo(() => {
    const input = buildValuationInput(fundamentals, financialData);

    // Build scenarios
    const scenarios: ValuationScenarios = (['bear', 'base', 'bull'] as ScenarioKey[]).reduce(
      (acc, key) => {
        const defaults = buildScenarioAssumptions(input, key);
        const overrides = userOverrides[key] || {};
        const assumptions: ScenarioAssumptions = { ...defaults, ...overrides };
        const output = computeScenarioOutput(input, assumptions);
        acc[key] = { assumptions, output };
        return acc;
      },
      {} as ValuationScenarios
    );

    // Justified P/E
    const justifiedPE = computeJustifiedPE(input);

    // DCF for base case
    const baseDCF = computeDCF(input, scenarios.base.assumptions);

    // Football field
    const footballField: FootballFieldRange[] = [
      {
        label: '5-Year DCF',
        methodology: 'DCF',
        low: computeDCF(input, scenarios.bear.assumptions).impliedPrice,
        mid: baseDCF.impliedPrice,
        high: computeDCF(input, scenarios.bull.assumptions).impliedPrice,
      },
      {
        label: 'Justified P/E',
        methodology: 'Justified P/E',
        low:
          justifiedPE.justifiedPE != null && (input.forwardEPS ?? input.trailingEPS) != null
            ? justifiedPE.justifiedPE * (input.forwardEPS ?? input.trailingEPS)! * 0.85
            : null,
        mid:
          justifiedPE.justifiedPE != null && (input.forwardEPS ?? input.trailingEPS) != null
            ? justifiedPE.justifiedPE * (input.forwardEPS ?? input.trailingEPS)!
            : null,
        high:
          justifiedPE.justifiedPE != null && (input.forwardEPS ?? input.trailingEPS) != null
            ? justifiedPE.justifiedPE * (input.forwardEPS ?? input.trailingEPS)! * 1.15
            : null,
      },
      {
        label: 'Market Comps',
        methodology: 'Market Comps',
        low: scenarios.bear.output.priceTarget,
        mid: scenarios.base.output.priceTarget,
        high: scenarios.bull.output.priceTarget,
      },
    ];

    // Sensitivity matrix
    const baseWACC = scenarios.base.assumptions.discountRate ?? computeCostOfEquity(input.beta);
    const sensitivityMatrix = buildSensitivityMatrix(input, baseWACC);

    return {
      input,
      scenarios,
      justifiedPE,
      baseDCF,
      footballField,
      sensitivityMatrix,
      isLoading,
    };
  }, [fundamentals, financialData, userOverrides, isLoading]);

  return {
    ...result,
    setUserOverrides,
    userOverrides,
  };
}
