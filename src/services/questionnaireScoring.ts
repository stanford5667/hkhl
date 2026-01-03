/**
 * Questionnaire Scoring Engine
 * Converts questionnaire responses into risk scores and asset allocation recommendations
 */

import { QuestionnaireResponse, InvestorPolicyStatement } from '@/types/investorPolicy';

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

// Question weight configurations
const QUESTION_WEIGHTS = {
  // Risk tolerance questions
  'risk-scenario-drop': { category: 'riskTolerance', weight: 25 },
  'risk-past-losses': { category: 'riskTolerance', weight: 15 },
  'risk-max-loss': { category: 'riskTolerance', weight: 20 },
  'risk-gain-then-loss': { category: 'riskTolerance', weight: 15 },
  'risk-emotional-vs-financial': { category: 'riskTolerance', weight: 10 },
  'risk-regret': { category: 'riskTolerance', weight: 10 },
  'risk-knowledge-level': { category: 'knowledge', weight: 5 },
  
  // Time horizon
  'goal-timeline': { category: 'timeHorizon', weight: 40 },
  'goal-purpose': { category: 'timeHorizon', weight: 20 },
  'goal-target-specificity': { category: 'timeHorizon', weight: 15 },
  'goal-priority': { category: 'timeHorizon', weight: 15 },
  'goal-other-assets': { category: 'financialCapacity', weight: 10 },
  
  // Financial capacity
  'finance-income-stability': { category: 'financialCapacity', weight: 25 },
  'finance-emergency-fund': { category: 'financialCapacity', weight: 30 },
  'finance-upcoming-expenses': { category: 'financialCapacity', weight: 20 },
  'finance-tax-bracket': { category: 'financialCapacity', weight: 10 },
  'finance-tax-accounts': { category: 'financialCapacity', weight: 15 },
  
  // Knowledge
  'knowledge-bonds-rates': { category: 'knowledge', weight: 25 },
  'knowledge-diversification-underperform': { category: 'knowledge', weight: 25 },
  'knowledge-compound-growth': { category: 'knowledge', weight: 25 },
  'knowledge-beating-market': { category: 'knowledge', weight: 15 },
  'knowledge-rebalancing': { category: 'knowledge', weight: 10 },
} as const;

// Response score mappings
const RESPONSE_SCORES: Record<string, Record<string, number>> = {
  // Risk scenario responses
  'risk-scenario-drop': {
    'sell-all': 10,
    'sell-some': 30,
    'panic-but-hold': 50,
    'hold': 70,
    'buy-more': 90,
  },
  'risk-past-losses': {
    'never-invested': 40,
    'no-losses': 50,
    'loss-devastating': 20,
    'loss-uncomfortable': 50,
    'loss-learning': 80,
  },
  'risk-gain-then-loss': {
    'devastated': 15,
    'frustrated': 35,
    'understand': 65,
    'opportunity': 90,
  },
  'risk-emotional-vs-financial': {
    'both': 20,
    'mostly-emotional': 40,
    'mostly-financial': 50,
    'neither': 90,
  },
  'risk-regret': {
    'regret-missing-out': 75,
    'regret-both-equally': 50,
    'regret-losing-money': 25,
  },
  'risk-knowledge-level': {
    'beginner': 25,
    'intermediate': 50,
    'advanced': 75,
    'professional': 95,
  },
  
  // Timeline responses
  'goal-timeline': {
    'less-than-1': 10,
    '1-3-years': 25,
    '3-5-years': 45,
    '5-10-years': 65,
    '10-20-years': 85,
    'more-than-20': 100,
  },
  'goal-purpose': {
    'house-purchase': 30,
    'education': 40,
    'retirement': 70,
    'wealth-building': 60,
    'income-generation': 50,
    'financial-independence': 75,
  },
  'goal-target-specificity': {
    'very-specific': 30,
    'minimum-threshold': 50,
    'approximate': 65,
    'maximize': 85,
  },
  'goal-priority': {
    'critical': 30,
    'important': 55,
    'nice-to-have': 80,
  },
  
  // Financial capacity
  'goal-other-assets': {
    'this-is-everything': 20,
    'emergency-only': 40,
    'some-savings': 60,
    'significant-other': 85,
  },
  'finance-income-stability': {
    'uncertain': 20,
    'variable': 40,
    'somewhat-stable': 60,
    'very-stable': 85,
    'multiple-sources': 95,
  },
  'finance-emergency-fund': {
    'none': 10,
    '1-2-months': 30,
    '3-6-months': 60,
    '6-12-months': 85,
    'more-than-12': 100,
  },
  'finance-upcoming-expenses': {
    'major-soon': 20,
    'some-planned': 45,
    'minor-only': 70,
    'none-expected': 90,
  },
  'finance-tax-bracket': {
    '10-12': 40,
    '22-24': 55,
    '32-35': 70,
    '37': 85,
    'not-sure': 50,
  },
  'finance-tax-accounts': {
    'no-tax-advantaged': 30,
    'some-tax-advantaged': 60,
    'maxing-contributions': 90,
    'already-maxed': 95,
  },
  
  // Knowledge check
  'knowledge-bonds-rates': {
    'correct-fall': 100,
    'incorrect-rise': 25,
    'incorrect-no-change': 25,
    'unsure': 40,
  },
  'knowledge-diversification-underperform': {
    'correct': 100,
    'incorrect-worse': 30,
    'incorrect-fees': 40,
    'unsure': 40,
  },
  'knowledge-compound-growth': {
    'correct': 100,
    'underestimate': 50,
    'overestimate': 40,
    'unsure': 30,
  },
  'knowledge-beating-market': {
    'correct-few': 100,
    'half': 40,
    'most-beat': 25,
    'unsure': 40,
  },
  'knowledge-rebalancing': {
    'correct': 100,
    'timing': 50,
    'maximize': 30,
    'unsure': 40,
  },
  
  // Preferences
  'constraints-volatility-preference': {
    'steady': 25,
    'moderate': 50,
    'growth': 75,
    'aggressive': 95,
  },
  'constraints-crypto': {
    'no-crypto': 0,
    'small-allocation': 25,
    'moderate-allocation': 50,
    'crypto-enthusiast': 75,
    'already-have': 10,
  },
  'constraints-esg-importance': {
    'not-important': 0,
    'nice-to-have': 33,
    'important': 66,
    'essential': 100,
  },
  'constraints-alternatives': {
    'stocks-bonds-only': 25,
    'some-alternatives': 50,
    'interested': 75,
    'sophisticated': 95,
  },
  'constraints-international': {
    'us-only': 20,
    'mostly-us': 45,
    'balanced': 70,
    'emerging': 90,
  },
};

/**
 * Calculate category scores from responses
 */
function calculateCategoryScores(responses: Record<string, QuestionnaireResponse>): {
  riskTolerance: number;
  timeHorizon: number;
  financialCapacity: number;
  knowledge: number;
} {
  const categoryTotals: Record<string, { score: number; weight: number }> = {
    riskTolerance: { score: 0, weight: 0 },
    timeHorizon: { score: 0, weight: 0 },
    financialCapacity: { score: 0, weight: 0 },
    knowledge: { score: 0, weight: 0 },
  };

  for (const [questionId, response] of Object.entries(responses)) {
    const config = QUESTION_WEIGHTS[questionId as keyof typeof QUESTION_WEIGHTS];
    if (!config) continue;

    const scoreMap = RESPONSE_SCORES[questionId];
    if (!scoreMap) continue;

    let score = 50; // Default score
    const value = response.value;
    
    if (typeof value === 'string' && scoreMap[value] !== undefined) {
      score = scoreMap[value];
    } else if (typeof value === 'number') {
      // For slider questions like risk-max-loss
      score = Math.min(100, Math.max(0, value * 2.5)); // 5% -> 12.5, 40% -> 100
    }

    const category = config.category;
    if (categoryTotals[category]) {
      categoryTotals[category].score += score * config.weight;
      categoryTotals[category].weight += config.weight;
    }
  }

  const normalize = (cat: string) => {
    const data = categoryTotals[cat];
    return data.weight > 0 ? Math.round(data.score / data.weight) : 50;
  };

  return {
    riskTolerance: normalize('riskTolerance'),
    timeHorizon: normalize('timeHorizon'),
    financialCapacity: normalize('financialCapacity'),
    knowledge: normalize('knowledge'),
  };
}

/**
 * Determine risk profile from overall score
 */
function getRiskProfile(score: number): RiskProfile {
  if (score < 25) return 'conservative';
  if (score < 40) return 'moderately-conservative';
  if (score < 60) return 'moderate';
  if (score < 75) return 'moderately-aggressive';
  return 'aggressive';
}

/**
 * Calculate ESG score from responses
 */
function calculateESGScore(responses: Record<string, QuestionnaireResponse>): number {
  const esgImportance = responses['constraints-esg-importance']?.value;
  const ethicalExclusions = responses['constraints-ethical']?.value;
  
  let score = RESPONSE_SCORES['constraints-esg-importance']?.[esgImportance as string] ?? 0;
  
  // Add points for ethical exclusions
  if (Array.isArray(ethicalExclusions) && ethicalExclusions.length > 0) {
    if (!ethicalExclusions.includes('none')) {
      score += Math.min(30, ethicalExclusions.length * 10);
    }
  }
  
  return Math.min(100, score);
}

/**
 * Generate asset allocation based on scores
 */
function generateAllocation(
  riskScore: number,
  responses: Record<string, QuestionnaireResponse>
): AssetAllocation {
  const profile = getRiskProfile(riskScore);
  const internationalPref = responses['constraints-international']?.value as string;
  const cryptoPref = responses['constraints-crypto']?.value as string;
  const alternativesPref = responses['constraints-alternatives']?.value as string;
  const volatilityPref = responses['constraints-volatility-preference']?.value as string;
  
  // Base allocations by risk profile
  const baseAllocations: Record<RiskProfile, AssetAllocation> = {
    'conservative': {
      usStocks: 25,
      internationalStocks: 10,
      emergingMarkets: 0,
      bonds: 45,
      tips: 10,
      reits: 5,
      commodities: 0,
      gold: 3,
      crypto: 0,
      cash: 2,
    },
    'moderately-conservative': {
      usStocks: 35,
      internationalStocks: 12,
      emergingMarkets: 3,
      bonds: 35,
      tips: 5,
      reits: 5,
      commodities: 2,
      gold: 2,
      crypto: 0,
      cash: 1,
    },
    'moderate': {
      usStocks: 45,
      internationalStocks: 15,
      emergingMarkets: 5,
      bonds: 25,
      tips: 0,
      reits: 5,
      commodities: 2,
      gold: 2,
      crypto: 0,
      cash: 1,
    },
    'moderately-aggressive': {
      usStocks: 50,
      internationalStocks: 20,
      emergingMarkets: 8,
      bonds: 12,
      tips: 0,
      reits: 5,
      commodities: 3,
      gold: 1,
      crypto: 0,
      cash: 1,
    },
    'aggressive': {
      usStocks: 55,
      internationalStocks: 22,
      emergingMarkets: 12,
      bonds: 5,
      tips: 0,
      reits: 3,
      commodities: 2,
      gold: 0,
      crypto: 0,
      cash: 1,
    },
  };
  
  const allocation = { ...baseAllocations[profile] };
  
  // Adjust for international preference
  if (internationalPref === 'us-only') {
    allocation.usStocks += allocation.internationalStocks + allocation.emergingMarkets;
    allocation.internationalStocks = 0;
    allocation.emergingMarkets = 0;
  } else if (internationalPref === 'mostly-us') {
    const intlReduction = Math.round(allocation.internationalStocks * 0.3);
    allocation.usStocks += intlReduction;
    allocation.internationalStocks -= intlReduction;
    allocation.emergingMarkets = Math.round(allocation.emergingMarkets * 0.5);
    allocation.usStocks += allocation.emergingMarkets;
    allocation.emergingMarkets = Math.round(allocation.emergingMarkets * 0.5);
  } else if (internationalPref === 'emerging') {
    const emBoost = Math.min(5, allocation.usStocks * 0.1);
    allocation.emergingMarkets += Math.round(emBoost);
    allocation.usStocks -= Math.round(emBoost);
  }
  
  // Add crypto if desired
  if (cryptoPref === 'small-allocation') {
    allocation.crypto = 2;
    allocation.usStocks -= 2;
  } else if (cryptoPref === 'moderate-allocation') {
    allocation.crypto = 5;
    allocation.usStocks -= 5;
  } else if (cryptoPref === 'crypto-enthusiast') {
    allocation.crypto = 10;
    allocation.usStocks -= 7;
    allocation.bonds -= 3;
  }
  
  // Adjust for alternatives preference
  if (alternativesPref === 'stocks-bonds-only') {
    const altTotal = allocation.reits + allocation.commodities + allocation.gold;
    allocation.usStocks += Math.round(altTotal * 0.6);
    allocation.bonds += Math.round(altTotal * 0.4);
    allocation.reits = 0;
    allocation.commodities = 0;
    allocation.gold = 0;
  } else if (alternativesPref === 'sophisticated') {
    allocation.commodities += 2;
    allocation.gold += 2;
    allocation.bonds -= 4;
  }
  
  // Adjust for volatility preference
  if (volatilityPref === 'steady') {
    const shiftToBonds = 5;
    allocation.bonds += shiftToBonds;
    allocation.usStocks -= shiftToBonds;
  } else if (volatilityPref === 'aggressive') {
    const shiftToStocks = Math.min(5, allocation.bonds - 5);
    allocation.usStocks += shiftToStocks;
    allocation.bonds -= shiftToStocks;
  }
  
  // Normalize to 100%
  const total = Object.values(allocation).reduce((a, b) => a + b, 0);
  if (total !== 100) {
    const diff = 100 - total;
    allocation.usStocks += diff;
  }
  
  return allocation;
}

/**
 * Extract investment constraints from responses
 */
function extractConstraints(responses: Record<string, QuestionnaireResponse>): InvestmentConstraints {
  const ethicalValues = responses['constraints-ethical']?.value;
  const excludedSectors = Array.isArray(ethicalValues) 
    ? ethicalValues.filter(v => v !== 'none') 
    : [];
  
  const esgValue = responses['constraints-esg-importance']?.value as string;
  const esgPreference = esgValue === 'essential' ? 'required' 
    : (esgValue === 'important' || esgValue === 'nice-to-have') ? 'preferred' 
    : 'none';
  
  const cryptoValue = responses['constraints-crypto']?.value as string;
  const cryptoAllowed = cryptoValue !== 'no-crypto';
  const maxCrypto = cryptoValue === 'crypto-enthusiast' ? 15 
    : cryptoValue === 'moderate-allocation' ? 10 
    : cryptoValue === 'small-allocation' ? 3 : 0;
  
  const factorValues = responses['constraints-factor-investing']?.value;
  const factorTilts = Array.isArray(factorValues) 
    ? factorValues.filter(v => v !== 'no-preference') 
    : [];
  
  const sectorValues = responses['constraints-sector-interests']?.value;
  const sectorOverweights = Array.isArray(sectorValues) 
    ? sectorValues.filter(v => v !== 'no-preference') 
    : [];
  
  const concentrationValue = responses['constraints-single-stock-limit']?.value as string;
  const maxPosition = concentrationValue === 'very-diversified' ? 3 
    : concentrationValue === 'moderate' ? 5 
    : concentrationValue === 'concentrated' ? 10 : 25;
  
  const intlValue = responses['constraints-international']?.value as string;
  const intlPref = (intlValue === 'us-only' || intlValue === 'mostly-us' || intlValue === 'balanced') 
    ? intlValue as 'us-only' | 'mostly-us' | 'balanced' 
    : 'global';
  
  return {
    excludedSectors,
    esgPreference,
    cryptoAllowed,
    maxCryptoAllocation: maxCrypto,
    factorTilts,
    sectorOverweights,
    maxSinglePosition: maxPosition,
    internationalPreference: intlPref,
  };
}

/**
 * Generate insights based on responses
 */
function generateInsights(
  responses: Record<string, QuestionnaireResponse>,
  scores: ReturnType<typeof calculateCategoryScores>,
  riskScore: number
): string[] {
  const insights: string[] = [];
  
  const profile = getRiskProfile(riskScore);
  const timeline = responses['goal-timeline']?.value as string;
  const purpose = responses['goal-purpose']?.value as string;
  
  // Profile insight
  const profileLabels = {
    'conservative': 'conservative',
    'moderately-conservative': 'moderately conservative',
    'moderate': 'balanced',
    'moderately-aggressive': 'growth-oriented',
    'aggressive': 'aggressive growth',
  };
  insights.push(`Your overall profile suggests a ${profileLabels[profile]} investment approach.`);
  
  // Time horizon insight
  if (timeline && ['10-20-years', 'more-than-20'].includes(timeline)) {
    insights.push('Your long time horizon allows for more aggressive strategies and recovery from market downturns.');
  } else if (timeline && ['less-than-1', '1-3-years'].includes(timeline)) {
    insights.push('Your short time horizon requires prioritizing capital preservation over growth.');
  }
  
  // Purpose-specific insights
  if (purpose === 'retirement') {
    insights.push('For retirement goals, we recommend a glide path that gradually reduces risk as you approach your target date.');
  } else if (purpose === 'financial-independence') {
    insights.push('FIRE goals often benefit from a higher savings rate combined with tax-efficient investing strategies.');
  }
  
  // Knowledge-based insight
  if (scores.knowledge > 75) {
    insights.push('Your strong investment knowledge means you can handle more sophisticated strategies.');
  } else if (scores.knowledge < 40) {
    insights.push('We\'ll start with simpler, well-diversified index funds while you build your investment knowledge.');
  }
  
  // Risk tolerance vs capacity insight
  if (Math.abs(scores.riskTolerance - scores.financialCapacity) > 25) {
    if (scores.riskTolerance > scores.financialCapacity) {
      insights.push('Your risk tolerance exceeds your financial capacity - we\'ll optimize for your capacity to protect against unaffordable losses.');
    } else {
      insights.push('Your financial capacity exceeds your comfort with risk - you could take more risk if you wanted to, but we\'ll respect your comfort level.');
    }
  }
  
  return insights;
}

/**
 * Generate warnings for potential issues
 */
function generateWarnings(
  responses: Record<string, QuestionnaireResponse>,
  scores: ReturnType<typeof calculateCategoryScores>
): string[] {
  const warnings: string[] = [];
  
  const timeline = responses['goal-timeline']?.value as string;
  const riskScenario = responses['risk-scenario-drop']?.value as string;
  const emergencyFund = responses['finance-emergency-fund']?.value as string;
  const volatilityPref = responses['constraints-volatility-preference']?.value as string;
  const cryptoPref = responses['constraints-crypto']?.value as string;
  
  // Timeline vs risk tolerance mismatch
  if (['less-than-1', '1-3-years'].includes(timeline) && ['buy-more', 'hold'].includes(riskScenario)) {
    warnings.push('Your short timeline conflicts with your stated high risk tolerance. Short-term investors should prioritize stability.');
  }
  
  // No emergency fund warning
  if (emergencyFund === 'none') {
    warnings.push('Without an emergency fund, you may be forced to sell investments at the worst time. Consider building 3-6 months of expenses first.');
  }
  
  // High crypto with short timeline
  if (['crypto-enthusiast', 'moderate-allocation'].includes(cryptoPref) && ['less-than-1', '1-3-years', '3-5-years'].includes(timeline)) {
    warnings.push('Cryptocurrency is highly volatile and may not suit your shorter time horizon. Consider reducing crypto exposure.');
  }
  
  // Aggressive preference with low capacity
  if (volatilityPref === 'aggressive' && scores.financialCapacity < 40) {
    warnings.push('Your preference for aggressive investing may not align with your current financial situation. Consider a more moderate approach.');
  }
  
  return warnings;
}

/**
 * Main scoring function - calculates all scores and generates recommendations
 */
export function scoreQuestionnaire(responses: Record<string, QuestionnaireResponse>): ScoringResult {
  const categoryScores = calculateCategoryScores(responses);
  
  // Calculate overall risk score - weighted average
  const overallRiskScore = Math.round(
    categoryScores.riskTolerance * 0.35 +
    categoryScores.timeHorizon * 0.30 +
    categoryScores.financialCapacity * 0.25 +
    categoryScores.knowledge * 0.10
  );
  
  const riskProfile = getRiskProfile(overallRiskScore);
  const esgScore = calculateESGScore(responses);
  const suggestedAllocation = generateAllocation(overallRiskScore, responses);
  const constraints = extractConstraints(responses);
  const insights = generateInsights(responses, categoryScores, overallRiskScore);
  const warnings = generateWarnings(responses, categoryScores);
  
  return {
    overallRiskScore,
    riskProfile,
    timeHorizonScore: categoryScores.timeHorizon,
    riskToleranceScore: categoryScores.riskTolerance,
    financialCapacityScore: categoryScores.financialCapacity,
    knowledgeScore: categoryScores.knowledge,
    esgScore,
    suggestedAllocation,
    insights,
    warnings,
    constraints,
  };
}

/**
 * Get a human-readable summary of the scoring result
 */
export function getScoringummary(result: ScoringResult): string {
  const { riskProfile, overallRiskScore, suggestedAllocation } = result;
  
  const profileDescriptions = {
    'conservative': 'prioritizing capital preservation with modest growth',
    'moderately-conservative': 'balancing stability with some growth potential',
    'moderate': 'seeking balanced growth with manageable risk',
    'moderately-aggressive': 'focusing on growth while accepting higher volatility',
    'aggressive': 'maximizing long-term growth potential',
  };
  
  const stockTotal = suggestedAllocation.usStocks + suggestedAllocation.internationalStocks + suggestedAllocation.emergingMarkets;
  const bondTotal = suggestedAllocation.bonds + suggestedAllocation.tips;
  
  return `Based on your responses (risk score: ${overallRiskScore}/100), you're a ${riskProfile} investor ${profileDescriptions[riskProfile]}. We recommend approximately ${stockTotal}% in stocks, ${bondTotal}% in bonds, and the rest in alternative assets.`;
}

export default scoreQuestionnaire;
