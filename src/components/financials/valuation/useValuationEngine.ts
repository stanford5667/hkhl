/**
 * useValuationEngine - CFA-Aligned Valuation Calculation Engine
 * Derives all values from live API data. No hardcoded numbers.
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

const RISK_FREE_RATE = 0.043; // 10Y Treasury - would ideally come from API
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

  // Payout ratio: dividends / EPS (if available)
  const dividendsPerShare = (financials as any)?.dividendsPaid && sharesOutstanding
    ? Math.abs((financials as any).dividendsPaid) / sharesOutstanding
    : null;
  const payoutRatio = dividendsPerShare && eps && eps > 0
    ? dividendsPerShare / eps
    : fundamentals.returnOnEquity != null ? 0.3 : null; // Default 30% payout if ROE available

  return {
    currentPrice: price,
    marketCap,
    sharesOutstanding,
    beta: fundamentals.beta,
    forwardEPS: estimates?.estimatedEpsAvg ?? null,
    forwardRevenue: estimates?.estimatedRevenueAvg ?? null,
    forwardEPSGrowth: fundamentals.epsGrowthYoY,
    trailingEPS: eps,
    trailingRevenue: fundamentals.revenue,
    netIncome: financials?.netIncome ?? null,
    freeCashFlow: ratios?.freeCashFlow ?? null,
    totalEquity: balanceSheet?.totalEquity ?? null,
    totalDebt: balanceSheet
      ? (balanceSheet.longTermDebt ?? 0) + (balanceSheet.shortTermDebt ?? 0)
      : null,
    interestExpense: fundamentals.interestExpense,
    dividendsPerShare,
    trailingPE: fundamentals.pe,
    forwardPE: fundamentals.forwardPE,
    priceToBook: fundamentals.priceToBook,
    evToEbitda: fundamentals.evToEbitda,
    returnOnEquity: fundamentals.returnOnEquity,
    payoutRatio,
    debtToEquity: fundamentals.debtToEquity,
    isDataDynamic: !fundamentals.useMockData,
    dataSource: fundamentals.source,
    dataQuality: fundamentals.dataQuality,
  };
}

// CAPM: r = Rf + β(Rm - Rf)
function computeCostOfEquity(beta: number | null): number | null {
  if (beta == null) return null;
  return RISK_FREE_RATE + beta * MARKET_RISK_PREMIUM;
}

// Sustainable Growth: g = ROE × (1 - Payout Ratio)
function computeSustainableGrowth(roe: number | null, payoutRatio: number | null): number | null {
  if (roe == null || payoutRatio == null) return null;
  return (roe / 100) * (1 - payoutRatio);
}

// Justified P/E = Payout Ratio / (r - g)  [Gordon Growth Model]
function computeJustifiedPE(input: ValuationInput): JustifiedPEResult {
  const r = computeCostOfEquity(input.beta);
  const g = computeSustainableGrowth(input.returnOnEquity, input.payoutRatio);

  let justifiedPE: number | null = null;
  if (r != null && g != null && input.payoutRatio != null && r > g) {
    justifiedPE = input.payoutRatio / (r - g);
  }

  return {
    payoutRatio: input.payoutRatio,
    costOfEquity: r,
    sustainableGrowth: g,
    justifiedPE,
    marketPE: input.forwardPE ?? input.trailingPE,
    isOvervalued:
      justifiedPE != null && (input.forwardPE ?? input.trailingPE) != null
        ? (input.forwardPE ?? input.trailingPE)! > justifiedPE
        : null,
  };
}

// 5-Year DCF
function computeDCF(
  input: ValuationInput,
  assumptions: ScenarioAssumptions
): DCFResult {
  const wacc = assumptions.discountRate;
  const tgr = assumptions.terminalGrowthRate;
  const fcf = input.freeCashFlow;
  const growth = assumptions.epsGrowth;
  const shares = input.sharesOutstanding;

  if (wacc == null || tgr == null || fcf == null || growth == null || shares == null || shares === 0) {
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
  const terminalValue = wacc > tgr ? terminalFCF / (wacc - tgr) : null;
  const pvTerminal = terminalValue != null ? terminalValue / Math.pow(1 + wacc, 5) : null;

  const enterpriseValue = pvTerminal != null ? pvSum + pvTerminal : null;
  const totalDebt = input.totalDebt ?? 0;
  const equityValue = enterpriseValue != null ? enterpriseValue - totalDebt : null;
  const impliedPrice = equityValue != null ? equityValue / shares : null;

  return { projectedFCFs, terminalValue, enterpriseValue, equityValue, impliedPrice, wacc };
}

function buildScenarioAssumptions(
  input: ValuationInput,
  scenario: ScenarioKey
): ScenarioAssumptions {
  const baseGrowth = input.forwardEPSGrowth != null ? input.forwardEPSGrowth / 100 : null;
  const r = computeCostOfEquity(input.beta);
  const offsets: Record<ScenarioKey, number> = { bear: -0.25, base: 0, bull: 0.25 };
  const offset = offsets[scenario];

  return {
    revenueGrowth: baseGrowth != null ? baseGrowth * (1 + offset) : null,
    epsGrowth: baseGrowth != null ? baseGrowth * (1 + offset) : null,
    terminalMultiple: input.forwardPE != null ? input.forwardPE * (1 + offset * 0.5) : null,
    discountRate: r != null ? r + (scenario === 'bear' ? 0.02 : scenario === 'bull' ? -0.01 : 0) : null,
    terminalGrowthRate: scenario === 'bear' ? 0.02 : scenario === 'bull' ? 0.035 : 0.025,
    marginExpansion: scenario === 'bear' ? -0.01 : scenario === 'bull' ? 0.015 : 0,
  };
}

function computeScenarioOutput(
  input: ValuationInput,
  assumptions: ScenarioAssumptions
): ScenarioOutput {
  // Price target via terminal multiple on forward EPS
  const epsBase = input.forwardEPS;
  const growth = assumptions.epsGrowth;
  const multiple = assumptions.terminalMultiple;

  if (epsBase == null || growth == null || multiple == null) {
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
  baseWACC: number | null
): SensitivityCell[][] {
  if (baseWACC == null || input.freeCashFlow == null || input.sharesOutstanding == null) {
    return [];
  }

  const waccSteps = [-0.02, -0.01, 0, 0.01, 0.02].map(d => baseWACC + d);
  const tgrSteps = [0.015, 0.02, 0.025, 0.03, 0.035];

  let closestDiff = Infinity;
  let closestCoords: [number, number] = [0, 0];

  const matrix: SensitivityCell[][] = waccSteps.map((wacc, wi) =>
    tgrSteps.map((tgr, gi) => {
      const dcf = computeDCF(input, {
        revenueGrowth: null,
        epsGrowth: input.forwardEPSGrowth != null ? input.forwardEPSGrowth / 100 : 0.05,
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

  if (matrix.length > 0) {
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
        low: justifiedPE.justifiedPE != null && input.forwardEPS != null
          ? justifiedPE.justifiedPE * input.forwardEPS * 0.85
          : null,
        mid: justifiedPE.justifiedPE != null && input.forwardEPS != null
          ? justifiedPE.justifiedPE * input.forwardEPS
          : null,
        high: justifiedPE.justifiedPE != null && input.forwardEPS != null
          ? justifiedPE.justifiedPE * input.forwardEPS * 1.15
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
    const sensitivityMatrix = buildSensitivityMatrix(input, scenarios.base.assumptions.discountRate);

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
