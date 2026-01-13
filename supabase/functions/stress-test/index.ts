import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Types
interface StressTestPeriod {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  marketDrawdown: number;
}

interface StressTestResult {
  period: StressTestPeriod;
  portfolioDrawdown: number;
  portfolioReturn: number;
  dollarLoss: number;
  recoveryDays: number | null;
  assetBreakdown: Record<string, { drawdown: number; return: number }>;
}

interface LiquidityRiskResult {
  ticker: string;
  maxHistoricalDrawdown: number;
  isLiquidityRisk: boolean;
  reason: string;
}

// Historical stress test periods
const STRESS_TEST_PERIODS: StressTestPeriod[] = [
  {
    id: 'covid-2020',
    name: 'COVID Crash (2020)',
    description: 'Rapid market selloff followed by V-shaped recovery',
    startDate: '2020-02-19',
    endDate: '2020-03-23',
    marketDrawdown: -33.9,
  },
  {
    id: 'bear-2022',
    name: '2022 Bear Market',
    description: 'Rate hikes caused prolonged decline in growth stocks',
    startDate: '2022-01-03',
    endDate: '2022-10-12',
    marketDrawdown: -25.4,
  },
  {
    id: 'normal',
    name: 'Normal Market',
    description: 'Average market conditions (last 12 months)',
    startDate: '',
    endDate: '',
    marketDrawdown: 0,
  },
];

function calculateMaxDrawdown(prices: number[]): number {
  if (prices.length < 2) return 0;
  let peak = prices[0];
  let maxDrawdown = 0;
  for (const price of prices) {
    if (price > peak) peak = price;
    const drawdown = (price - peak) / peak;
    if (drawdown < maxDrawdown) maxDrawdown = drawdown;
  }
  return maxDrawdown * 100;
}

function calculateReturn(prices: number[]): number {
  if (prices.length < 2) return 0;
  return ((prices[prices.length - 1] - prices[0]) / prices[0]) * 100;
}

function runStressTest(
  allocations: Record<string, number>,
  historicalData: Record<string, { date: string; close: number }[]>,
  period: StressTestPeriod,
  investableCapital: number
): StressTestResult {
  const tickers = Object.keys(allocations);
  const assetBreakdown: Record<string, { drawdown: number; return: number }> = {};

  let startDate = period.startDate;
  let endDate = period.endDate;

  if (period.id === 'normal') {
    const now = new Date();
    endDate = now.toISOString().split('T')[0];
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    startDate = oneYearAgo.toISOString().split('T')[0];
  }

  let portfolioValue: number[] = [];

  for (const ticker of tickers) {
    const bars = historicalData[ticker] || [];
    const filteredBars = bars.filter(b => b.date >= startDate && b.date <= endDate);

    if (filteredBars.length === 0) {
      assetBreakdown[ticker] = { drawdown: 0, return: 0 };
      continue;
    }

    const prices = filteredBars.map(b => b.close);
    const weight = allocations[ticker] || 0;

    const assetDrawdown = calculateMaxDrawdown(prices);
    const assetReturn = calculateReturn(prices);
    assetBreakdown[ticker] = { drawdown: assetDrawdown, return: assetReturn };

    if (portfolioValue.length === 0) {
      portfolioValue = new Array(prices.length).fill(0);
    }

    const minLength = Math.min(portfolioValue.length, prices.length);
    for (let i = 0; i < minLength; i++) {
      const normalizedPrice = (prices[i] / prices[0]) * weight * investableCapital;
      portfolioValue[i] += normalizedPrice;
    }
  }

  const portfolioDrawdown = portfolioValue.length > 0 ? calculateMaxDrawdown(portfolioValue) : 0;
  const portfolioReturn = portfolioValue.length > 0 ? calculateReturn(portfolioValue) : 0;
  const dollarLoss = Math.abs(investableCapital * (portfolioDrawdown / 100));

  let recoveryDays: number | null = null;
  if (period.id === 'covid-2020') recoveryDays = 148;
  else if (period.id === 'bear-2022') recoveryDays = null;

  return {
    period,
    portfolioDrawdown,
    portfolioReturn,
    dollarLoss,
    recoveryDays,
    assetBreakdown,
  };
}

function checkLiquidityRisks(
  historicalData: Record<string, { date: string; close: number }[]>,
  tickers: string[],
  timeHorizonYears: number,
  drawdownThreshold: number = 20
): LiquidityRiskResult[] {
  const results: LiquidityRiskResult[] = [];
  const isShortHorizon = timeHorizonYears < 2;

  for (const ticker of tickers) {
    const bars = historicalData[ticker] || [];

    if (bars.length === 0) {
      results.push({
        ticker,
        maxHistoricalDrawdown: 0,
        isLiquidityRisk: false,
        reason: 'Insufficient historical data',
      });
      continue;
    }

    const prices = bars.map(b => b.close);
    const maxDrawdown = Math.abs(calculateMaxDrawdown(prices));
    const isRisk = isShortHorizon && maxDrawdown > drawdownThreshold;

    results.push({
      ticker,
      maxHistoricalDrawdown: maxDrawdown,
      isLiquidityRisk: isRisk,
      reason: isRisk
        ? `Historical drawdown of ${maxDrawdown.toFixed(1)}% exceeds ${drawdownThreshold}% threshold for your ${timeHorizonYears}-year horizon`
        : maxDrawdown > drawdownThreshold
          ? `High volatility (${maxDrawdown.toFixed(1)}% drawdown) but acceptable for ${timeHorizonYears}-year horizon`
          : 'Within acceptable volatility range',
    });
  }

  return results;
}

function runAllStressTests(
  allocations: Record<string, number>,
  historicalData: Record<string, { date: string; close: number }[]>,
  investableCapital: number
): StressTestResult[] {
  return STRESS_TEST_PERIODS.map(period =>
    runStressTest(allocations, historicalData, period, investableCapital)
  );
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, allocations, historicalData, investableCapital, period, tickers, timeHorizonYears, drawdownThreshold } = await req.json();

    let result;

    switch (action) {
      case 'runStressTest':
        result = runStressTest(allocations, historicalData, period, investableCapital);
        break;
      case 'runAllStressTests':
        result = { results: runAllStressTests(allocations, historicalData, investableCapital) };
        break;
      case 'checkLiquidityRisks':
        result = { results: checkLiquidityRisks(historicalData, tickers, timeHorizonYears, drawdownThreshold) };
        break;
      case 'getStressTestPeriods':
        result = { periods: STRESS_TEST_PERIODS };
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error: unknown) {
    console.error('[stress-test] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
