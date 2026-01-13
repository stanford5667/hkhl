/**
 * Questionnaire Scoring Service
 * Client wrapper that calls the server-side scoring engine
 */

import { supabase } from '@/integrations/supabase/client';
import { QuestionnaireResponse } from '@/types/investorPolicy';

// Score ranges for different investor profiles
export type RiskProfile = 'conservative' | 'moderately-conservative' | 'moderate' | 'moderately-aggressive' | 'aggressive';

export interface ScoringResult {
  overallRiskScore: number; // 0-100
  riskProfile: RiskProfile;
  timeHorizonScore: number; // 0-100
  riskToleranceScore: number; // 0-100
  financialCapacityScore: number; // 0-100
  knowledgeScore: number; // 0-100
  esgScore: number; // 0-100
  suggestedAllocation: AssetAllocation;
  insights: string[];
  warnings: string[];
  constraints: InvestmentConstraints;
}

export interface AssetAllocation {
  usStocks: number;
  internationalStocks: number;
  emergingMarkets: number;
  bonds: number;
  tips: number; // Treasury Inflation-Protected Securities
  reits: number;
  commodities: number;
  gold: number;
  crypto: number;
  cash: number;
}

export interface InvestmentConstraints {
  excludedSectors: string[];
  esgPreference: 'none' | 'preferred' | 'required';
  cryptoAllowed: boolean;
  maxCryptoAllocation: number;
  factorTilts: string[];
  sectorOverweights: string[];
  maxSinglePosition: number;
  internationalPreference: 'us-only' | 'mostly-us' | 'balanced' | 'global';
}

/**
 * Main scoring function - calculates all scores and generates recommendations
 * Calls the server-side scoring engine
 */
export async function scoreQuestionnaire(responses: Record<string, QuestionnaireResponse>): Promise<ScoringResult> {
  const { data, error } = await supabase.functions.invoke('questionnaire-scoring', {
    body: {
      action: 'score',
      responses,
    },
  });

  if (error) {
    console.error('Questionnaire scoring error:', error);
    throw new Error(`Scoring failed: ${error.message}`);
  }

  return data as ScoringResult;
}

/**
 * Get a human-readable summary of the scoring result
 */
export async function getScoringSummary(result: ScoringResult): Promise<string> {
  const { data, error } = await supabase.functions.invoke('questionnaire-scoring', {
    body: {
      action: 'summary',
      result,
    },
  });

  if (error) {
    console.error('Scoring summary error:', error);
    throw new Error(`Summary failed: ${error.message}`);
  }

  return data.summary;
}

// Legacy synchronous function name for backwards compatibility
// Now just a re-export of the async function
export default scoreQuestionnaire;