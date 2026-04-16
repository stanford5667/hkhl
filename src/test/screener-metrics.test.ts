import { describe, it, expect } from "vitest";

// Pure calculation functions extracted for testing
function calculatePEG(pe: number | null, epsGrowth: number | null): number | null {
  if (pe == null || epsGrowth == null || epsGrowth <= 0 || pe <= 0) return null;
  return Math.round((pe / epsGrowth) * 100) / 100;
}

function calculateMaxDrawdown(prices: number[]): number | null {
  if (prices.length < 2) return null;
  let peak = prices[0];
  let maxDD = 0;
  for (let i = 1; i < prices.length; i++) {
    if (prices[i] > peak) peak = prices[i];
    const dd = (prices[i] - peak) / peak;
    if (dd < maxDD) maxDD = dd;
  }
  return Math.round(maxDD * 10000) / 100;
}

function calculateStdDev(returns: number[]): number | null {
  if (returns.length < 2) return null;
  const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
  const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / (returns.length - 1);
  return Math.round(Math.sqrt(variance) * 10000) / 10000;
}

function applyCustomFilter(actual: number | null, filter: { operator: string; value: number; value2?: number }): boolean {
  if (actual == null) return false;
  const { operator, value, value2 } = filter;
  switch (operator) {
    case '<': return actual < value;
    case '>': return actual > value;
    case '<=': return actual <= value;
    case '>=': return actual >= value;
    case '=': return Math.abs(actual - value) < 0.001;
    case 'between': return value2 != null ? actual >= value && actual <= value2 : actual >= value;
    default: return true;
  }
}

describe("calculatePEG", () => {
  it("returns correct PEG for known inputs", () => {
    expect(calculatePEG(20, 10)).toBe(2);
    expect(calculatePEG(15, 30)).toBe(0.5);
  });
  it("returns null for invalid inputs", () => {
    expect(calculatePEG(null, 10)).toBeNull();
    expect(calculatePEG(20, null)).toBeNull();
    expect(calculatePEG(20, 0)).toBeNull();
    expect(calculatePEG(-5, 10)).toBeNull();
  });
});

describe("calculateMaxDrawdown", () => {
  it("computes peak-to-trough correctly", () => {
    const prices = [100, 110, 90, 95, 80, 105];
    const dd = calculateMaxDrawdown(prices);
    // Peak=110, trough=80 => -27.27%
    expect(dd).toBeCloseTo(-27.27, 1);
  });
  it("returns 0 for monotonically increasing", () => {
    expect(calculateMaxDrawdown([10, 20, 30, 40])).toBe(0);
  });
  it("returns null for insufficient data", () => {
    expect(calculateMaxDrawdown([100])).toBeNull();
    expect(calculateMaxDrawdown([])).toBeNull();
  });
});

describe("calculateStdDev", () => {
  it("computes std dev of returns", () => {
    const returns = [0.01, -0.02, 0.03, -0.01, 0.02];
    const sd = calculateStdDev(returns);
    expect(sd).not.toBeNull();
    expect(sd!).toBeGreaterThan(0);
    expect(sd!).toBeLessThan(0.1);
  });
  it("returns null for insufficient data", () => {
    expect(calculateStdDev([0.01])).toBeNull();
    expect(calculateStdDev([])).toBeNull();
  });
});

describe("applyCustomFilter", () => {
  it("handles < operator", () => {
    expect(applyCustomFilter(1.0, { operator: '<', value: 1.5 })).toBe(true);
    expect(applyCustomFilter(2.0, { operator: '<', value: 1.5 })).toBe(false);
  });
  it("handles between operator", () => {
    expect(applyCustomFilter(5, { operator: 'between', value: 1, value2: 10 })).toBe(true);
    expect(applyCustomFilter(15, { operator: 'between', value: 1, value2: 10 })).toBe(false);
  });
  it("returns false for null actual", () => {
    expect(applyCustomFilter(null, { operator: '<', value: 1 })).toBe(false);
  });
});
