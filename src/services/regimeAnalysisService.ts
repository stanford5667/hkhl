// Macro-Regime Analysis Service - Thin Client Wrapper
// All proprietary algorithms run server-side

import { supabase } from '@/integrations/supabase/client';
import { MacroRegime, RegimeAnalysis } from '@/types/portfolio';

export interface RegimePeriod {
  start: string;
  end: string;
  regime: MacroRegime;
  inflationRate: number;
  volatilityLevel: number;
}

/**
 * Determine regime for a given date (calls edge function)
 */
export async function getRegimeForDate(date: string): Promise<MacroRegime> {
  const { data, error } = await supabase.functions.invoke('regime-analysis', {
    body: { action: 'getRegimeForDate', date }
  });

  if (error) {
    console.error('[RegimeAnalysis] Error getting regime for date:', error);
    return 'fiscal_activism'; // Default fallback
  }

  return data.regime;
}

/**
 * Get all regime periods within a date range (calls edge function)
 */
export async function getRegimePeriodsInRange(
  startDate: string,
  endDate: string
): Promise<{ regime: MacroRegime; start: string; end: string }[]> {
  const { data, error } = await supabase.functions.invoke('regime-analysis', {
    body: { action: 'getRegimePeriodsInRange', startDate, endDate }
  });

  if (error) {
    console.error('[RegimeAnalysis] Error getting regime periods:', error);
    return [];
  }

  return data.periods;
}

/**
 * Calculate portfolio performance by regime (calls edge function)
 */
export async function analyzePerformanceByRegime(
  portfolioHistory: { date: string; value: number }[],
  startValue: number
): Promise<RegimeAnalysis> {
  const { data, error } = await supabase.functions.invoke('regime-analysis', {
    body: { action: 'analyzePerformanceByRegime', portfolioHistory, startValue }
  });

  if (error) {
    console.error('[RegimeAnalysis] Error analyzing performance:', error);
    return {
      currentRegime: 'fiscal_activism',
      fiscalActivismPeriods: [],
      monetaryDominancePeriods: [],
      portfolioPerformanceByRegime: {
        fiscalActivism: { return: 0, volatility: 0, maxDD: 0 },
        monetaryDominance: { return: 0, volatility: 0, maxDD: 0 },
      },
    };
  }

  return data as RegimeAnalysis;
}

/**
 * Get regime stress scenarios based on historical periods (calls edge function)
 */
export async function getRegimeStressScenarios(): Promise<{
  name: string;
  description: string;
  regime: MacroRegime;
  equityImpact: number;
  bondImpact: number;
  commodityImpact: number;
  cryptoImpact: number;
}[]> {
  const { data, error } = await supabase.functions.invoke('regime-analysis', {
    body: { action: 'getRegimeStressScenarios' }
  });

  if (error) {
    console.error('[RegimeAnalysis] Error getting stress scenarios:', error);
    return [];
  }

  return data.scenarios;
}
