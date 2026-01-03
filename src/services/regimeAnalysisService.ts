// Macro-Regime Analysis Service
// Tags periods as "Monetary Dominance" vs "Fiscal Activism"

import { MacroRegime, RegimeAnalysis } from '@/types/portfolio';

export interface RegimePeriod {
  start: string;
  end: string;
  regime: MacroRegime;
  inflationRate: number;
  volatilityLevel: number;
}

// Historical regime definitions based on economic research
const HISTORICAL_REGIMES: RegimePeriod[] = [
  // Monetary Dominance: Low inflation, central bank control
  { start: '2010-01-01', end: '2019-12-31', regime: 'monetary_dominance', inflationRate: 1.8, volatilityLevel: 12 },
  { start: '2003-01-01', end: '2006-12-31', regime: 'monetary_dominance', inflationRate: 2.5, volatilityLevel: 10 },
  
  // Fiscal Activism: High inflation, government spending dominance
  { start: '2020-03-01', end: '2022-12-31', regime: 'fiscal_activism', inflationRate: 6.5, volatilityLevel: 28 },
  { start: '2008-09-01', end: '2009-03-31', regime: 'fiscal_activism', inflationRate: 4.1, volatilityLevel: 45 },
  { start: '1973-01-01', end: '1982-12-31', regime: 'fiscal_activism', inflationRate: 8.5, volatilityLevel: 18 },
];

// Projected regime for 2025-2036 (fiscal activism expected)
const PROJECTED_REGIME: MacroRegime = 'fiscal_activism';

/**
 * Determine regime for a given date
 */
export function getRegimeForDate(date: string): MacroRegime {
  for (const period of HISTORICAL_REGIMES) {
    if (date >= period.start && date <= period.end) {
      return period.regime;
    }
  }
  
  // Default: If after 2023, project fiscal activism
  if (date >= '2023-01-01') {
    return PROJECTED_REGIME;
  }
  
  return 'monetary_dominance';
}

/**
 * Get all regime periods within a date range
 */
export function getRegimePeriodsInRange(
  startDate: string,
  endDate: string
): { regime: MacroRegime; start: string; end: string }[] {
  const periods: { regime: MacroRegime; start: string; end: string }[] = [];
  
  for (const period of HISTORICAL_REGIMES) {
    // Check if period overlaps with range
    if (period.end >= startDate && period.start <= endDate) {
      periods.push({
        regime: period.regime,
        start: period.start > startDate ? period.start : startDate,
        end: period.end < endDate ? period.end : endDate,
      });
    }
  }
  
  return periods.sort((a, b) => a.start.localeCompare(b.start));
}

/**
 * Calculate portfolio performance by regime
 */
export function analyzePerformanceByRegime(
  portfolioHistory: { date: string; value: number }[],
  startValue: number
): RegimeAnalysis {
  if (portfolioHistory.length === 0) {
    return {
      currentRegime: PROJECTED_REGIME,
      fiscalActivismPeriods: [],
      monetaryDominancePeriods: [],
      portfolioPerformanceByRegime: {
        fiscalActivism: { return: 0, volatility: 0, maxDD: 0 },
        monetaryDominance: { return: 0, volatility: 0, maxDD: 0 },
      },
    };
  }
  
  // Group daily data by regime
  const regimeData: Record<MacroRegime, number[]> = {
    fiscal_activism: [],
    monetary_dominance: [],
  };
  
  for (let i = 1; i < portfolioHistory.length; i++) {
    const { date, value } = portfolioHistory[i];
    const prevValue = portfolioHistory[i - 1].value;
    const dailyReturn = (value - prevValue) / prevValue;
    
    const regime = getRegimeForDate(date);
    regimeData[regime].push(dailyReturn);
  }
  
  // Calculate metrics for each regime
  const calculateRegimeMetrics = (returns: number[]) => {
    if (returns.length === 0) {
      return { return: 0, volatility: 0, maxDD: 0 };
    }
    
    // Cumulative return
    const cumReturn = returns.reduce((cum, r) => cum * (1 + r), 1) - 1;
    
    // Annualized volatility
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / returns.length;
    const volatility = Math.sqrt(variance) * Math.sqrt(252) * 100;
    
    // Max drawdown within regime
    let peak = 1;
    let maxDD = 0;
    let cumValue = 1;
    for (const r of returns) {
      cumValue *= (1 + r);
      if (cumValue > peak) peak = cumValue;
      const dd = (peak - cumValue) / peak;
      if (dd > maxDD) maxDD = dd;
    }
    
    return {
      return: cumReturn * 100,
      volatility,
      maxDD: maxDD * 100,
    };
  };
  
  // Get periods for reporting
  const fiscalPeriods = HISTORICAL_REGIMES
    .filter(p => p.regime === 'fiscal_activism')
    .map(p => ({ start: p.start, end: p.end, impact: -p.volatilityLevel }));
    
  const monetaryPeriods = HISTORICAL_REGIMES
    .filter(p => p.regime === 'monetary_dominance')
    .map(p => ({ start: p.start, end: p.end, impact: p.volatilityLevel }));
  
  // Determine current regime
  const latestDate = portfolioHistory[portfolioHistory.length - 1]?.date || new Date().toISOString().split('T')[0];
  const currentRegime = getRegimeForDate(latestDate);
  
  return {
    currentRegime,
    fiscalActivismPeriods: fiscalPeriods,
    monetaryDominancePeriods: monetaryPeriods,
    portfolioPerformanceByRegime: {
      fiscalActivism: calculateRegimeMetrics(regimeData.fiscal_activism),
      monetaryDominance: calculateRegimeMetrics(regimeData.monetary_dominance),
    },
  };
}

/**
 * Get regime stress scenarios based on historical periods
 */
export function getRegimeStressScenarios(): {
  name: string;
  description: string;
  regime: MacroRegime;
  equityImpact: number;
  bondImpact: number;
  commodityImpact: number;
  cryptoImpact: number;
}[] {
  return [
    {
      name: '1970s Stagflation',
      description: 'High inflation + slow growth (Fiscal Activism)',
      regime: 'fiscal_activism',
      equityImpact: -45,
      bondImpact: -35,
      commodityImpact: +120,
      cryptoImpact: -60, // Proxy from gold behavior
    },
    {
      name: '2020 COVID Crash',
      description: 'Pandemic-driven fiscal expansion',
      regime: 'fiscal_activism',
      equityImpact: -34,
      bondImpact: +8,
      commodityImpact: -30,
      cryptoImpact: -50,
    },
    {
      name: '2022 Inflation Spike',
      description: 'Post-COVID inflation surge',
      regime: 'fiscal_activism',
      equityImpact: -25,
      bondImpact: -18,
      commodityImpact: +25,
      cryptoImpact: -65,
    },
    {
      name: '2010s Bull Market',
      description: 'Low inflation, QE-driven growth',
      regime: 'monetary_dominance',
      equityImpact: +180,
      bondImpact: +45,
      commodityImpact: -10,
      cryptoImpact: +10000, // BTC emergence
    },
    {
      name: '2025-2036 Projection',
      description: 'Expected high inflation/volatility regime',
      regime: 'fiscal_activism',
      equityImpact: -15, // Conservative estimate
      bondImpact: -25,
      commodityImpact: +40,
      cryptoImpact: +50, // Inflation hedge potential
    },
  ];
}
