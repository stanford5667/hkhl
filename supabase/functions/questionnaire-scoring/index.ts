import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Types
interface QuestionnaireResponse {
  value: string | number | string[];
  answeredAt?: string;
}

type RiskProfile = 'conservative' | 'moderately-conservative' | 'moderate' | 'moderately-aggressive' | 'aggressive';

interface ScoringResult {
  overallRiskScore: number;
  riskProfile: RiskProfile;
  timeHorizonScore: number;
  riskToleranceScore: number;
  financialCapacityScore: number;
  knowledgeScore: number;
  esgScore: number;
  suggestedAllocation: AssetAllocation;
  insights: string[];
  warnings: string[];
  constraints: InvestmentConstraints;
}

interface AssetAllocation {
  usStocks: number;
  internationalStocks: number;
  emergingMarkets: number;
  bonds: number;
  tips: number;
  reits: number;
  commodities: number;
  gold: number;
  crypto: number;
  cash: number;
}

interface InvestmentConstraints {
  excludedSectors: string[];
  esgPreference: 'none' | 'preferred' | 'required';
  cryptoAllowed: boolean;
  maxCryptoAllocation: number;
  factorTilts: string[];
  sectorOverweights: string[];
  maxSinglePosition: number;
  internationalPreference: 'us-only' | 'mostly-us' | 'balanced' | 'global';
}

// Question weight configurations - MATCHED TO investorQuestionnaire.ts
const QUESTION_WEIGHTS: Record<string, { category: string; weight: number }> = {
  // Goals Section
  'goal-purpose': { category: 'timeHorizon', weight: 20 },
  'goal-timeline': { category: 'timeHorizon', weight: 40 },
  'goal-priority': { category: 'timeHorizon', weight: 15 },
  
  // Risk Section
  'risk-scenario-drop': { category: 'riskTolerance', weight: 30 },
  'risk-max-loss': { category: 'riskTolerance', weight: 25 },
  'risk-knowledge-level': { category: 'knowledge', weight: 25 },
  'risk-regret': { category: 'riskTolerance', weight: 20 },
  
  // Liquidity/Financial Section
  'liquidity-income-stability': { category: 'financialCapacity', weight: 35 },
  'liquidity-emergency-fund': { category: 'financialCapacity', weight: 40 },
  
  // Constraints Section
  'constraints-ethical': { category: 'constraints', weight: 15 },
  'constraints-international': { category: 'constraints', weight: 20 },
  'constraints-volatility-preference': { category: 'riskTolerance', weight: 25 },
  'constraints-crypto': { category: 'constraints', weight: 15 },
  
  // Knowledge Section
  'knowledge-diversification': { category: 'knowledge', weight: 40 },
  'knowledge-rebalancing': { category: 'knowledge', weight: 35 },
};

// Response score mappings - MATCHED TO investorQuestionnaire.ts option values
const RESPONSE_SCORES: Record<string, Record<string, number>> = {
  // Goals Section
  'goal-purpose': {
    'retirement': 70,
    'house-purchase': 35,
    'wealth-building': 60,
    'financial-independence': 80,
  },
  'goal-timeline': {
    'less-than-3': 15,
    '3-7-years': 40,
    '7-15-years': 70,
    'more-than-15': 95,
  },
  'goal-priority': {
    'critical': 25,
    'important': 50,
    'nice-to-have': 80,
  },
  
  // Risk Section
  'risk-scenario-drop': {
    'sell-all': 10,
    'sell-some': 30,
    'hold': 65,
    'buy-more': 95,
  },
  'risk-max-loss': {
    '10': 20,
    '20': 45,
    '30': 70,
    '40': 95,
  },
  'risk-knowledge-level': {
    'beginner': 25,
    'intermediate': 55,
    'advanced': 85,
  },
  'risk-regret': {
    'missing-gains': 80,
    'losing-money': 25,
    'equal': 50,
  },
  
  // Liquidity/Financial Section
  'liquidity-income-stability': {
    'very-stable': 90,
    'mostly-stable': 65,
    'variable': 40,
    'uncertain': 15,
  },
  'liquidity-emergency-fund': {
    'less-than-3': 25,
    '3-6-months': 60,
    'more-than-6': 90,
  },
  
  // Constraints Section
  'constraints-volatility-preference': {
    'steady': 25,
    'moderate': 55,
    'growth': 85,
  },
  'constraints-crypto': {
    'no-crypto': 0,
    'small-allocation': 30,
    'moderate-allocation': 60,
  },
  'constraints-international': {
    'us-only': 25,
    'mostly-us': 50,
    'balanced': 80,
  },
  'constraints-esg-importance': {
    'not-important': 0,
    'nice-to-have': 33,
    'important': 66,
    'essential': 100,
  },
  
  // Knowledge Section
  'knowledge-diversification': {
    'correct': 100,
    'incorrect-worse': 30,
    'unsure': 45,
  },
  'knowledge-rebalancing': {
    'correct': 100,
    'timing': 50,
    'unsure': 35,
  },
};

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

  console.log('[Scoring] Processing responses:', Object.keys(responses));

  for (const [questionId, response] of Object.entries(responses)) {
    const config = QUESTION_WEIGHTS[questionId];
    if (!config) {
      console.log(`[Scoring] No weight config for question: ${questionId}`);
      continue;
    }

    // Skip constraint-category questions from scoring (they affect allocation, not scores)
    if (config.category === 'constraints') {
      continue;
    }

    const scoreMap = RESPONSE_SCORES[questionId];
    if (!scoreMap) {
      console.log(`[Scoring] No score map for question: ${questionId}`);
      continue;
    }

    let score = 50; // default
    const value = response.value;
    
    if (typeof value === 'string' && scoreMap[value] !== undefined) {
      score = scoreMap[value];
      console.log(`[Scoring] ${questionId}: value="${value}" -> score=${score}`);
    } else if (typeof value === 'number') {
      // Handle slider values (like risk-max-loss which might come as a number)
      const stringValue = String(value);
      if (scoreMap[stringValue] !== undefined) {
        score = scoreMap[stringValue];
      } else {
        score = Math.min(100, Math.max(0, value * 2.5));
      }
      console.log(`[Scoring] ${questionId}: numeric value=${value} -> score=${score}`);
    } else {
      console.log(`[Scoring] ${questionId}: unhandled value type, using default 50`);
    }

    const category = config.category;
    if (categoryTotals[category]) {
      categoryTotals[category].score += score * config.weight;
      categoryTotals[category].weight += config.weight;
    }
  }

  const normalize = (cat: string) => {
    const data = categoryTotals[cat];
    const result = data.weight > 0 ? Math.round(data.score / data.weight) : 50;
    console.log(`[Scoring] Category ${cat}: totalScore=${data.score}, totalWeight=${data.weight}, normalized=${result}`);
    return result;
  };

  return {
    riskTolerance: normalize('riskTolerance'),
    timeHorizon: normalize('timeHorizon'),
    financialCapacity: normalize('financialCapacity'),
    knowledge: normalize('knowledge'),
  };
}

function getRiskProfile(score: number): RiskProfile {
  if (score < 25) return 'conservative';
  if (score < 40) return 'moderately-conservative';
  if (score < 60) return 'moderate';
  if (score < 75) return 'moderately-aggressive';
  return 'aggressive';
}

function calculateESGScore(responses: Record<string, QuestionnaireResponse>): number {
  const ethicalExclusions = responses['constraints-ethical']?.value;
  
  let score = 0;
  
  if (Array.isArray(ethicalExclusions)) {
    if (!ethicalExclusions.includes('none') && ethicalExclusions.length > 0) {
      // Each exclusion adds to ESG score
      score = Math.min(100, ethicalExclusions.length * 20);
    }
  }
  
  return score;
}

function generateAllocation(
  riskScore: number,
  responses: Record<string, QuestionnaireResponse>
): AssetAllocation {
  const profile = getRiskProfile(riskScore);
  const internationalPref = responses['constraints-international']?.value as string;
  const cryptoPref = responses['constraints-crypto']?.value as string;
  const volatilityPref = responses['constraints-volatility-preference']?.value as string;
  
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
    allocation.usStocks += Math.round(allocation.emergingMarkets * 0.5);
  } else if (internationalPref === 'balanced') {
    // Add a bit more international exposure
    const boost = Math.min(3, allocation.usStocks * 0.05);
    allocation.internationalStocks += Math.round(boost);
    allocation.usStocks -= Math.round(boost);
  }
  
  // Add crypto if desired
  if (cryptoPref === 'small-allocation') {
    allocation.crypto = 3;
    allocation.usStocks -= 3;
  } else if (cryptoPref === 'moderate-allocation') {
    allocation.crypto = 7;
    allocation.usStocks -= 5;
    allocation.bonds = Math.max(0, allocation.bonds - 2);
  }
  
  // Adjust for volatility preference
  if (volatilityPref === 'steady') {
    const shiftToBonds = 5;
    allocation.bonds += shiftToBonds;
    allocation.usStocks = Math.max(15, allocation.usStocks - shiftToBonds);
  } else if (volatilityPref === 'growth') {
    const shiftToStocks = Math.min(5, allocation.bonds - 5);
    allocation.usStocks += shiftToStocks;
    allocation.bonds = Math.max(0, allocation.bonds - shiftToStocks);
  }
  
  // Normalize to 100%
  const total = Object.values(allocation).reduce((a, b) => a + b, 0);
  if (total !== 100) {
    const diff = 100 - total;
    allocation.usStocks = Math.max(0, allocation.usStocks + diff);
  }
  
  return allocation;
}

function extractConstraints(responses: Record<string, QuestionnaireResponse>): InvestmentConstraints {
  const ethicalValues = responses['constraints-ethical']?.value;
  const excludedSectors = Array.isArray(ethicalValues) 
    ? ethicalValues.filter(v => v !== 'none') 
    : [];
  
  // ESG preference based on how many sectors are excluded
  const esgPreference = excludedSectors.length >= 3 ? 'required' 
    : excludedSectors.length >= 1 ? 'preferred' 
    : 'none';
  
  const cryptoValue = responses['constraints-crypto']?.value as string;
  const cryptoAllowed = cryptoValue !== 'no-crypto';
  const maxCrypto = cryptoValue === 'moderate-allocation' ? 10 
    : cryptoValue === 'small-allocation' ? 5 : 0;
  
  const intlValue = responses['constraints-international']?.value as string;
  const intlPref = (intlValue === 'us-only' || intlValue === 'mostly-us' || intlValue === 'balanced') 
    ? intlValue as 'us-only' | 'mostly-us' | 'balanced' 
    : 'balanced';
  
  return {
    excludedSectors,
    esgPreference,
    cryptoAllowed,
    maxCryptoAllocation: maxCrypto,
    factorTilts: [],
    sectorOverweights: [],
    maxSinglePosition: 5, // Default 5% max single position
    internationalPreference: intlPref,
  };
}

function generateInsights(
  responses: Record<string, QuestionnaireResponse>,
  scores: ReturnType<typeof calculateCategoryScores>,
  riskScore: number
): string[] {
  const insights: string[] = [];
  
  const profile = getRiskProfile(riskScore);
  const timeline = responses['goal-timeline']?.value as string;
  const purpose = responses['goal-purpose']?.value as string;
  
  const profileLabels: Record<RiskProfile, string> = {
    'conservative': 'conservative',
    'moderately-conservative': 'moderately conservative',
    'moderate': 'balanced',
    'moderately-aggressive': 'growth-oriented',
    'aggressive': 'aggressive growth',
  };
  insights.push(`Your overall profile suggests a ${profileLabels[profile]} investment approach.`);
  
  if (timeline && ['7-15-years', 'more-than-15'].includes(timeline)) {
    insights.push('Your long time horizon allows for more aggressive strategies and recovery from market downturns.');
  } else if (timeline && timeline === 'less-than-3') {
    insights.push('Your short time horizon requires prioritizing capital preservation over growth.');
  }
  
  if (purpose === 'retirement') {
    insights.push('For retirement goals, we recommend a glide path that gradually reduces risk as you approach your target date.');
  } else if (purpose === 'financial-independence') {
    insights.push('FIRE goals often benefit from a higher savings rate combined with tax-efficient investing strategies.');
  } else if (purpose === 'house-purchase') {
    insights.push('For a house down payment, capital preservation is key. Consider more conservative allocations as you approach your target date.');
  }
  
  if (scores.knowledge > 75) {
    insights.push('Your strong investment knowledge means you can handle more sophisticated strategies.');
  } else if (scores.knowledge < 40) {
    insights.push('We\'ll start with simpler, well-diversified index funds while you build your investment knowledge.');
  }
  
  if (Math.abs(scores.riskTolerance - scores.financialCapacity) > 25) {
    if (scores.riskTolerance > scores.financialCapacity) {
      insights.push('Your risk tolerance exceeds your financial capacity - we\'ll optimize for your capacity to protect against unaffordable losses.');
    } else {
      insights.push('Your financial capacity exceeds your comfort with risk - you could take more risk if you wanted to, but we\'ll respect your comfort level.');
    }
  }
  
  return insights;
}

function generateWarnings(
  responses: Record<string, QuestionnaireResponse>,
  scores: ReturnType<typeof calculateCategoryScores>
): string[] {
  const warnings: string[] = [];
  
  const timeline = responses['goal-timeline']?.value as string;
  const riskScenario = responses['risk-scenario-drop']?.value as string;
  const emergencyFund = responses['liquidity-emergency-fund']?.value as string;
  const volatilityPref = responses['constraints-volatility-preference']?.value as string;
  const cryptoPref = responses['constraints-crypto']?.value as string;
  
  // Short timeline + aggressive risk behavior
  if (timeline === 'less-than-3' && ['buy-more', 'hold'].includes(riskScenario)) {
    warnings.push('Your short timeline conflicts with your stated high risk tolerance. Short-term investors should prioritize stability.');
  }
  
  // No emergency fund
  if (emergencyFund === 'less-than-3') {
    warnings.push('Without adequate emergency savings, you may be forced to sell investments at the worst time. Consider building 3-6 months of expenses first.');
  }
  
  // Crypto with short timeline
  if (cryptoPref === 'moderate-allocation' && timeline === 'less-than-3') {
    warnings.push('Cryptocurrency is highly volatile and may not suit your shorter time horizon. Consider reducing crypto exposure.');
  }
  
  // Growth preference but low financial capacity
  if (volatilityPref === 'growth' && scores.financialCapacity < 40) {
    warnings.push('Your preference for growth investing may not align with your current financial situation. Consider a more moderate approach.');
  }
  
  return warnings;
}

function scoreQuestionnaire(responses: Record<string, QuestionnaireResponse>): ScoringResult {
  console.log('[Scoring] Starting questionnaire scoring');
  console.log('[Scoring] All response keys:', Object.keys(responses));
  console.log('[Scoring] Full responses:', JSON.stringify(responses, null, 2));
  
  const categoryScores = calculateCategoryScores(responses);
  
  const overallRiskScore = Math.round(
    categoryScores.riskTolerance * 0.35 +
    categoryScores.timeHorizon * 0.30 +
    categoryScores.financialCapacity * 0.25 +
    categoryScores.knowledge * 0.10
  );
  
  console.log('[Scoring] Category scores:', categoryScores);
  console.log('[Scoring] Overall risk score:', overallRiskScore);
  
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

function getScoringSummary(result: ScoringResult): string {
  const { riskProfile, overallRiskScore, suggestedAllocation } = result;
  
  const profileDescriptions: Record<RiskProfile, string> = {
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, responses, result } = await req.json();

    console.log('[Scoring] Received action:', action);

    let responseData;

    switch (action) {
      case 'score':
        if (!responses) {
          throw new Error('responses is required for score action');
        }
        responseData = scoreQuestionnaire(responses);
        break;

      case 'summary':
        if (!result) {
          throw new Error('result is required for summary action');
        }
        responseData = { summary: getScoringSummary(result) };
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Questionnaire scoring error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
