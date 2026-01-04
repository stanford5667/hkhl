/**
 * Prediction Market Financial Math Utilities
 * 
 * Pure TypeScript implementations - NO AI dependencies.
 * All financial calculations happen client-side with full transparency.
 */

export interface KellyResult {
  /** Full Kelly fraction (0-1) */
  fullKelly: number;
  /** Half Kelly fraction (0-1) - recommended for most traders */
  halfKelly: number;
  /** Quarter Kelly fraction (0-1) - conservative approach */
  quarterKelly: number;
  /** Whether the bet has positive expected value */
  isPositiveEV: boolean;
  /** Edge over the market (as decimal, e.g., 0.05 = 5% edge) */
  edge: number;
}

export interface ExpectedValueResult {
  /** Expected value per unit bet (as decimal) */
  expectedValue: number;
  /** Expected value as percentage */
  expectedValuePercent: number;
  /** Whether the bet is +EV */
  isPositiveEV: boolean;
}

export interface ImpliedProbabilityResult {
  /** Implied probability as decimal (0-1) */
  probability: number;
  /** Implied probability as percentage (0-100) */
  probabilityPercent: number;
  /** The vig/juice included in the price */
  vig: number;
}

export interface PositionSizeResult {
  /** Recommended position size in dollars */
  positionSize: number;
  /** Position as percentage of bankroll */
  positionPercent: number;
  /** Maximum potential loss in dollars */
  maxLoss: number;
  /** Maximum potential gain in dollars */
  maxGain: number;
  /** Risk/reward ratio */
  riskRewardRatio: number;
}

/**
 * Calculate Kelly Criterion for optimal bet sizing.
 * 
 * Formula: f* = (bp - q) / b
 * where:
 *   f* = fraction of bankroll to bet
 *   b = odds received on the bet (decimal odds - 1)
 *   p = probability of winning
 *   q = probability of losing (1 - p)
 * 
 * @param winProbability - Probability of winning (0-1)
 * @param odds - Decimal odds (e.g., 2.0 for even money, 1.5 for -200)
 * @returns Kelly fractions and edge calculation
 */
export function calculateKellyCriterion(
  winProbability: number,
  odds: number
): KellyResult {
  // Validate inputs
  const p = Math.max(0, Math.min(1, winProbability));
  const b = Math.max(0, odds - 1); // Convert decimal odds to "b" in Kelly formula
  const q = 1 - p;

  // Edge = probability * odds - 1 (expected return per dollar)
  const edge = p * odds - 1;

  // Kelly formula: f* = (bp - q) / b
  // Handle division by zero when odds = 1 (no profit possible)
  let fullKelly = 0;
  if (b > 0) {
    fullKelly = (b * p - q) / b;
  }

  // Clamp to 0-1 range (can't bet negative or more than 100%)
  fullKelly = Math.max(0, Math.min(1, fullKelly));

  return {
    fullKelly,
    halfKelly: fullKelly / 2,
    quarterKelly: fullKelly / 4,
    isPositiveEV: edge > 0,
    edge,
  };
}

/**
 * Calculate Expected Value of a bet.
 * 
 * Formula: EV = (probability * payout) - (1 - probability) * stake
 * Simplified for unit bets: EV = p * (odds - 1) - (1 - p) * 1
 * 
 * @param probability - Probability of winning (0-1)
 * @param payout - Payout multiplier if win (e.g., 2.0 means you get 2x your bet back)
 * @param stake - Optional stake amount (defaults to 1 for percentage calculation)
 * @returns Expected value calculation
 */
export function calculateExpectedValue(
  probability: number,
  payout: number,
  stake: number = 1
): ExpectedValueResult {
  const p = Math.max(0, Math.min(1, probability));
  const q = 1 - p;

  // EV = P(win) * profit - P(lose) * loss
  // For a $1 bet: EV = p * (payout - 1) - q * 1
  const profit = (payout - 1) * stake;
  const loss = stake;
  
  const expectedValue = p * profit - q * loss;
  const expectedValuePercent = (expectedValue / stake) * 100;

  return {
    expectedValue,
    expectedValuePercent,
    isPositiveEV: expectedValue > 0,
  };
}

/**
 * Convert market price to implied probability.
 * 
 * For binary markets: implied probability = price
 * Handles both decimal (0.65) and cents (65) formats.
 * 
 * @param price - Market price (can be 0-1 or 0-100)
 * @param complementPrice - Optional price of the opposite outcome (for vig calculation)
 * @returns Implied probability and vig
 */
export function calculateImpliedProbability(
  price: number,
  complementPrice?: number
): ImpliedProbabilityResult {
  // Normalize price to 0-1 range
  let normalizedPrice = price;
  if (price > 1 && price <= 100) {
    normalizedPrice = price / 100;
  }
  normalizedPrice = Math.max(0, Math.min(1, normalizedPrice));

  // Calculate vig if complement price is provided
  let vig = 0;
  if (complementPrice !== undefined) {
    let normalizedComplement = complementPrice;
    if (complementPrice > 1 && complementPrice <= 100) {
      normalizedComplement = complementPrice / 100;
    }
    // Vig = sum of probabilities - 1
    const totalImplied = normalizedPrice + normalizedComplement;
    vig = Math.max(0, totalImplied - 1);
  }

  return {
    probability: normalizedPrice,
    probabilityPercent: normalizedPrice * 100,
    vig,
  };
}

/**
 * Calculate position size with risk management parameters.
 * 
 * @param bankroll - Total bankroll
 * @param kellyFraction - Kelly fraction to use (from calculateKellyCriterion)
 * @param entryPrice - Entry price (0-1)
 * @param targetPrice - Target exit price
 * @param stopLossPrice - Stop loss price
 * @param existingExposure - Amount already committed to other positions
 * @returns Position sizing recommendation
 */
export function calculatePositionSize(
  bankroll: number,
  kellyFraction: number,
  entryPrice: number,
  targetPrice: number,
  stopLossPrice: number,
  existingExposure: number = 0
): PositionSizeResult {
  const effectiveBankroll = Math.max(0, bankroll - existingExposure);
  const positionSize = effectiveBankroll * kellyFraction;
  const positionPercent = (positionSize / bankroll) * 100;

  // Calculate max gain/loss based on price movement
  const gainPercent = ((targetPrice - entryPrice) / entryPrice);
  const lossPercent = ((entryPrice - stopLossPrice) / entryPrice);

  const maxGain = positionSize * gainPercent;
  const maxLoss = positionSize * lossPercent;

  // Risk/reward ratio (how much you stand to gain per unit of risk)
  const riskRewardRatio = maxLoss > 0 ? maxGain / maxLoss : 0;

  return {
    positionSize: Math.max(0, positionSize),
    positionPercent: Math.max(0, positionPercent),
    maxLoss: Math.max(0, maxLoss),
    maxGain: Math.max(0, maxGain),
    riskRewardRatio,
  };
}

/**
 * Convert American odds to decimal odds.
 * 
 * @param americanOdds - American odds (e.g., +150, -200)
 * @returns Decimal odds
 */
export function americanToDecimalOdds(americanOdds: number): number {
  if (americanOdds > 0) {
    return (americanOdds / 100) + 1;
  } else {
    return (100 / Math.abs(americanOdds)) + 1;
  }
}

/**
 * Convert decimal odds to American odds.
 * 
 * @param decimalOdds - Decimal odds (e.g., 2.5)
 * @returns American odds
 */
export function decimalToAmericanOdds(decimalOdds: number): number {
  if (decimalOdds >= 2) {
    return (decimalOdds - 1) * 100;
  } else {
    return -100 / (decimalOdds - 1);
  }
}

/**
 * Convert market price to decimal odds.
 * 
 * @param price - Market price (0-1)
 * @returns Decimal odds
 */
export function priceToDecimalOdds(price: number): number {
  // Normalize price
  let normalizedPrice = price;
  if (price > 1 && price <= 100) {
    normalizedPrice = price / 100;
  }
  
  if (normalizedPrice <= 0) return Infinity;
  if (normalizedPrice >= 1) return 1;
  
  return 1 / normalizedPrice;
}

/**
 * Calculate the break-even probability for given odds.
 * 
 * @param decimalOdds - Decimal odds
 * @returns Break-even probability (0-1)
 */
export function calculateBreakevenProbability(decimalOdds: number): number {
  if (decimalOdds <= 0) return 1;
  return 1 / decimalOdds;
}

/**
 * Calculate edge: difference between estimated probability and implied probability.
 * 
 * @param estimatedProbability - Your estimated probability of winning (0-1)
 * @param impliedProbability - Market's implied probability (0-1)
 * @returns Edge as decimal (e.g., 0.05 = 5% edge)
 */
export function calculateEdge(
  estimatedProbability: number,
  impliedProbability: number
): number {
  return estimatedProbability - impliedProbability;
}
