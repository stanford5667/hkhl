/**
 * Metric Definitions Registry
 * 
 * Single source of truth for all portfolio metrics.
 * Each metric includes:
 * - Plain English explanation
 * - Mathematical formula
 * - Step-by-step calculation breakdown
 * - Interpretation ranges
 * - Data sources
 */

export interface MetricDefinition {
  id: string;
  name: string;
  shortName?: string;
  category: 'learn' | 'return' | 'risk' | 'risk_adjusted' | 'tail_risk' | 'liquidity' | 'distribution' | 'benchmark';
  
  // Plain English
  plainEnglish: string;
  whyItMatters: string;
  
  // Technical
  formula: string;
  formulaLatex?: string;
  formulaExplained: string;
  
  // Data sources
  dataInputs: {
    name: string;
    description: string;
    source: 'polygon' | 'calculated' | 'user_input' | 'benchmark';
  }[];
  
  // Interpretation
  format: 'percent' | 'ratio' | 'dollars' | 'score' | 'days';
  precision: number;
  higherIsBetter: boolean | null;
  interpretation: {
    excellent: { min: number; max: number; label: string };
    good: { min: number; max: number; label: string };
    fair: { min: number; max: number; label: string };
    poor: { min: number; max: number; label: string };
  };
  
  // UI
  icon: string;
  color: string;
  
  // Example
  exampleCalculation: string;
}

export const METRIC_DEFINITIONS: Record<string, MetricDefinition> = {
  
  // ============================================
  // LEARN METRICS (Human-Readable)
  // ============================================
  
  sleepScore: {
    id: 'sleepScore',
    name: 'Sleep Score',
    category: 'learn',
    plainEnglish: "How well you'll sleep at night with this portfolio. Higher means less stress from market swings.",
    whyItMatters: "If checking your portfolio makes you anxious, you need a higher sleep score. This predicts your stress level based on how much your portfolio bounces around.",
    formula: 'Sleep Score = 100 - (Volatility% × 4)',
    formulaExplained: `
1. Take your portfolio's annualized volatility (how much it swings per year)
2. Multiply by 4 (converts to stress factor)
3. Subtract from 100
Example: 15% volatility → 100 - (15 × 4) = 40
    `,
    dataInputs: [
      { name: 'Daily Returns', description: 'Daily percentage changes', source: 'polygon' },
      { name: 'Annualized Volatility', description: 'Std Dev × √252', source: 'calculated' }
    ],
    format: 'score',
    precision: 0,
    higherIsBetter: true,
    interpretation: {
      excellent: { min: 80, max: 100, label: 'Sleep soundly - rare surprises' },
      good: { min: 60, max: 80, label: 'Minor tossing - occasional bad days' },
      fair: { min: 40, max: 60, label: 'Restless nights - expect some anxiety' },
      poor: { min: 0, max: 40, label: 'White-knuckle ride - only for iron stomachs' }
    },
    icon: 'Moon',
    color: 'indigo',
    exampleCalculation: 'Volatility = 15% → Sleep Score = 100 - (15 × 4) = 40'
  },
  
  worstCaseDollars: {
    id: 'worstCaseDollars',
    name: 'Worst Case Scenario',
    category: 'learn',
    plainEnglish: "The most money you could temporarily lose from a peak, based on historical patterns.",
    whyItMatters: "This is THE most important number. If seeing this loss would cause you to panic-sell, you need a less risky portfolio - no matter what the returns are.",
    formula: 'Worst Case $ = Investment × Max Drawdown%',
    formulaExplained: `
1. Find the highest point your portfolio ever reached (the "peak")
2. Find the lowest point it dropped to before recovering (the "trough")
3. Calculate: (Peak - Trough) / Peak = Max Drawdown %
4. Multiply by your investment amount
The result is your potential temporary loss in dollars.
    `,
    dataInputs: [
      { name: 'Portfolio Values', description: 'Daily value series', source: 'calculated' },
      { name: 'Investment Amount', description: 'Your investable capital', source: 'user_input' }
    ],
    format: 'dollars',
    precision: 0,
    higherIsBetter: false,
    interpretation: {
      excellent: { min: -Infinity, max: 10, label: 'Very conservative - minimal pain' },
      good: { min: 10, max: 20, label: 'Moderate - typical balanced portfolio' },
      fair: { min: 20, max: 35, label: 'Aggressive - need long horizon' },
      poor: { min: 35, max: Infinity, label: 'Extreme - only money you can lose' }
    },
    icon: 'TrendingDown',
    color: 'rose',
    exampleCalculation: '$100,000 investment × 25% drawdown = -$25,000 worst case'
  },
  
  turbulenceRating: {
    id: 'turbulenceRating',
    name: 'Turbulence Rating',
    category: 'learn',
    plainEnglish: "How bumpy the ride will be - like a flight turbulence warning. Higher means more frequent surprises.",
    whyItMatters: "Even if you can handle big losses, frequent ups and downs can wear on you. This tells you how often you'll see uncomfortable moves.",
    formula: 'Turbulence = Volatility + Kurtosis Factor + Skew Penalty',
    formulaExplained: `
1. Start with volatility (base bumpiness)
2. Add kurtosis factor (extra points for fat tails = more extreme days)
3. Add skew penalty (extra points if losses are worse than gains)
Scale: 0-100 where higher = more turbulent
    `,
    dataInputs: [
      { name: 'Volatility', description: 'Annualized standard deviation', source: 'calculated' },
      { name: 'Kurtosis', description: 'Tail fatness measure', source: 'calculated' },
      { name: 'Skewness', description: 'Asymmetry measure', source: 'calculated' }
    ],
    format: 'score',
    precision: 0,
    higherIsBetter: false,
    interpretation: {
      excellent: { min: 0, max: 25, label: 'Smooth sailing - barely notice daily moves' },
      good: { min: 25, max: 45, label: 'Light turbulence - occasional bumps' },
      fair: { min: 45, max: 65, label: 'Moderate turbulence - fasten seatbelt' },
      poor: { min: 65, max: 100, label: 'Severe turbulence - hold on tight' }
    },
    icon: 'Gauge',
    color: 'amber',
    exampleCalculation: 'Vol: 30 + Kurtosis: 10 + Skew: 5 = 45 (Moderate)'
  },
  
  // ============================================
  // RETURN METRICS
  // ============================================
  
  annualizedReturn: {
    id: 'annualizedReturn',
    name: 'Expected Annual Return',
    shortName: 'Ann. Return',
    category: 'return',
    plainEnglish: "How much your portfolio is expected to grow each year based on historical performance.",
    whyItMatters: "This sets realistic expectations. Remember: past performance doesn't guarantee future results, but it gives a reasonable estimate.",
    formula: 'Annual Return = Mean Daily Return × 252',
    formulaExplained: `
1. Calculate the average daily return
2. Multiply by 252 (trading days per year)
This gives the arithmetic annualized return.
    `,
    dataInputs: [
      { name: 'Daily Returns', description: 'All daily percentage returns', source: 'polygon' }
    ],
    format: 'percent',
    precision: 2,
    higherIsBetter: true,
    interpretation: {
      excellent: { min: 12, max: Infinity, label: 'Aggressive growth' },
      good: { min: 8, max: 12, label: 'Solid growth' },
      fair: { min: 4, max: 8, label: 'Conservative' },
      poor: { min: -Infinity, max: 4, label: 'May not beat inflation' }
    },
    icon: 'TrendingUp',
    color: 'emerald',
    exampleCalculation: 'Mean daily return of 0.04% × 252 = 10.08% annual'
  },
  
  cagr: {
    id: 'cagr',
    name: 'CAGR',
    shortName: 'CAGR',
    category: 'return',
    plainEnglish: "Compound Annual Growth Rate - your smoothed annual return accounting for compounding.",
    whyItMatters: "This is the most accurate measure of true annual performance. It shows what you actually earned per year, not just the average.",
    formula: 'CAGR = (End Value / Start Value)^(1/Years) - 1',
    formulaExplained: `
1. Divide your ending value by starting value
2. Raise to the power of (1 / number of years)
3. Subtract 1
This gives the rate that would grow your starting value to the ending value if applied each year.
    `,
    dataInputs: [
      { name: 'Start Value', description: 'Initial portfolio value', source: 'calculated' },
      { name: 'End Value', description: 'Final portfolio value', source: 'calculated' },
      { name: 'Years', description: 'Time period in years', source: 'calculated' }
    ],
    format: 'percent',
    precision: 2,
    higherIsBetter: true,
    interpretation: {
      excellent: { min: 15, max: Infinity, label: 'Outstanding - beating most funds' },
      good: { min: 10, max: 15, label: 'Great - solid long-term performance' },
      fair: { min: 5, max: 10, label: 'Decent - on par with historical averages' },
      poor: { min: -Infinity, max: 5, label: 'Below average - consider alternatives' }
    },
    icon: 'TrendingUp',
    color: 'emerald',
    exampleCalculation: '$100K → $150K over 4 years: (150/100)^(1/4) - 1 = 10.67%'
  },
  
  totalReturn: {
    id: 'totalReturn',
    name: 'Total Return',
    category: 'return',
    plainEnglish: "The complete return over the entire period, including all gains and losses.",
    whyItMatters: "Shows your bottom-line result - how much you actually made or lost in total.",
    formula: 'Total Return = (End Value - Start Value) / Start Value × 100',
    formulaExplained: `
1. Subtract starting value from ending value (profit/loss)
2. Divide by starting value
3. Multiply by 100 for percentage
Simple but powerful - it's your actual result.
    `,
    dataInputs: [
      { name: 'Start Value', description: 'Initial investment', source: 'user_input' },
      { name: 'End Value', description: 'Current value', source: 'calculated' }
    ],
    format: 'percent',
    precision: 2,
    higherIsBetter: true,
    interpretation: {
      excellent: { min: 50, max: Infinity, label: 'Exceptional returns' },
      good: { min: 20, max: 50, label: 'Strong performance' },
      fair: { min: 0, max: 20, label: 'Positive but modest' },
      poor: { min: -Infinity, max: 0, label: 'Negative - review strategy' }
    },
    icon: 'DollarSign',
    color: 'emerald',
    exampleCalculation: '$100K → $125K: (125-100)/100 × 100 = 25%'
  },
  
  // ============================================
  // RISK METRICS
  // ============================================
  
  volatility: {
    id: 'volatility',
    name: 'Volatility',
    shortName: 'Vol',
    category: 'risk',
    plainEnglish: "How much your portfolio bounces up and down. Higher volatility = bigger swings both ways.",
    whyItMatters: "Volatility is the price of admission for returns. Know what level of bouncing you can stomach before you invest.",
    formula: 'Volatility = StdDev(Daily Returns) × √252',
    formulaExplained: `
1. Calculate standard deviation of daily returns
2. Multiply by √252 to annualize (252 trading days)
Result: The typical annual swing in either direction
    `,
    dataInputs: [
      { name: 'Daily Returns', description: 'All daily percentage returns', source: 'polygon' }
    ],
    format: 'percent',
    precision: 2,
    higherIsBetter: false,
    interpretation: {
      excellent: { min: 0, max: 10, label: 'Very stable - bond-like' },
      good: { min: 10, max: 15, label: 'Moderate - balanced portfolio' },
      fair: { min: 15, max: 25, label: 'Elevated - equity-like' },
      poor: { min: 25, max: Infinity, label: 'High - speculative' }
    },
    icon: 'Activity',
    color: 'orange',
    exampleCalculation: 'Daily StdDev of 0.95% × 15.87 = 15.08% annual volatility'
  },
  
  maxDrawdown: {
    id: 'maxDrawdown',
    name: 'Maximum Drawdown',
    shortName: 'Max DD',
    category: 'risk',
    plainEnglish: "The biggest peak-to-bottom drop in your portfolio's history. Your worst experience.",
    whyItMatters: "This is the single most important risk metric. If you can't stomach this loss, you need a different portfolio.",
    formula: 'Max DD = (Trough - Peak) / Peak × 100',
    formulaExplained: `
1. Track the highest value reached so far (peak)
2. Track current value
3. Calculate drawdown at each point: (Peak - Current) / Peak
4. Find the maximum of all drawdowns
This is your worst-case historical experience.
    `,
    dataInputs: [
      { name: 'Portfolio Values', description: 'Daily portfolio value series', source: 'calculated' }
    ],
    format: 'percent',
    precision: 2,
    higherIsBetter: false,
    interpretation: {
      excellent: { min: 0, max: 10, label: 'Minimal pain - very conservative' },
      good: { min: 10, max: 20, label: 'Manageable - typical balanced' },
      fair: { min: 20, max: 35, label: 'Significant - need long horizon' },
      poor: { min: 35, max: Infinity, label: 'Severe - only for risk-tolerant' }
    },
    icon: 'TrendingDown',
    color: 'rose',
    exampleCalculation: 'Peak $120K, Trough $90K: (120-90)/120 = 25%'
  },
  
  var95: {
    id: 'var95',
    name: 'VaR (95%)',
    shortName: 'VaR 95',
    category: 'risk',
    plainEnglish: "The worst daily loss you should expect 95% of the time. On 1 in 20 days, it could be worse.",
    whyItMatters: "Sets expectations for bad days. If VaR is 2%, expect to lose more than 2% about once a month.",
    formula: 'VaR₉₅ = 5th Percentile of Daily Returns',
    formulaExplained: `
1. Sort all daily returns from worst to best
2. Find the 5th percentile (5% from the bottom)
3. This return is your VaR threshold
95% of days, your loss will be less than this.
    `,
    dataInputs: [
      { name: 'Daily Returns', description: 'All daily percentage returns', source: 'polygon' }
    ],
    format: 'percent',
    precision: 2,
    higherIsBetter: false,
    interpretation: {
      excellent: { min: 0, max: 1, label: 'Very low daily risk' },
      good: { min: 1, max: 2, label: 'Typical daily risk' },
      fair: { min: 2, max: 3, label: 'Elevated daily risk' },
      poor: { min: 3, max: Infinity, label: 'High daily risk' }
    },
    icon: 'AlertTriangle',
    color: 'orange',
    exampleCalculation: 'Worst 5% of days average -1.8% → VaR₉₅ = 1.8%'
  },
  
  var99: {
    id: 'var99',
    name: 'VaR (99%)',
    shortName: 'VaR 99',
    category: 'risk',
    plainEnglish: "The worst daily loss you should expect 99% of the time. Extremely rare but important.",
    whyItMatters: "This represents your really bad days - the kind that happen a few times a year.",
    formula: 'VaR₉₉ = 1st Percentile of Daily Returns',
    formulaExplained: `
1. Sort all daily returns from worst to best
2. Find the 1st percentile (1% from the bottom)
3. This return is your extreme VaR threshold
99% of days, your loss will be less than this.
    `,
    dataInputs: [
      { name: 'Daily Returns', description: 'All daily percentage returns', source: 'polygon' }
    ],
    format: 'percent',
    precision: 2,
    higherIsBetter: false,
    interpretation: {
      excellent: { min: 0, max: 2, label: 'Even worst days manageable' },
      good: { min: 2, max: 3.5, label: 'Painful but survivable' },
      fair: { min: 3.5, max: 5, label: 'Significant extreme risk' },
      poor: { min: 5, max: Infinity, label: 'Vulnerable to shocks' }
    },
    icon: 'AlertOctagon',
    color: 'rose',
    exampleCalculation: 'Worst 1% of days average -3.2% → VaR₉₉ = 3.2%'
  },
  
  // ============================================
  // TAIL RISK METRICS
  // ============================================
  
  cvar95: {
    id: 'cvar95',
    name: 'CVaR (95%)',
    shortName: 'CVaR 95',
    category: 'tail_risk',
    plainEnglish: "On the really bad days (worst 5%), how much do you typically lose? This is the average loss on those terrible days.",
    whyItMatters: "VaR tells you the threshold, but CVaR tells you how bad it gets when that threshold is breached. It's the 'expected shortfall.'",
    formula: 'CVaR₉₅ = Mean(Worst 5% of Returns)',
    formulaExplained: `
1. Sort all daily returns from worst to best
2. Take the bottom 5% (worst ~13 days per year)
3. Calculate the average of those worst days
This is your expected loss on a really bad day.
    `,
    dataInputs: [
      { name: 'Daily Returns', description: 'All daily percentage returns', source: 'polygon' }
    ],
    format: 'percent',
    precision: 2,
    higherIsBetter: false,
    interpretation: {
      excellent: { min: 0, max: 1.5, label: 'Mild bad days' },
      good: { min: 1.5, max: 2.5, label: 'Manageable tail risk' },
      fair: { min: 2.5, max: 4, label: 'Significant tail risk' },
      poor: { min: 4, max: Infinity, label: 'Extreme tail risk' }
    },
    icon: 'AlertTriangle',
    color: 'rose',
    exampleCalculation: 'Worst 13 days averaged -2.3% each → CVaR₉₅ = 2.3%'
  },
  
  cvar99: {
    id: 'cvar99',
    name: 'CVaR (99%)',
    shortName: 'CVaR 99',
    category: 'tail_risk',
    plainEnglish: "On the absolute worst days (worst 1%), how bad does it get? This is for 'black swan' type events.",
    whyItMatters: "These extreme days can wipe out years of gains. Understanding your exposure helps you decide if you need protection.",
    formula: 'CVaR₉₉ = Mean(Worst 1% of Returns)',
    formulaExplained: `
1. Sort all daily returns from worst to best
2. Take the bottom 1% (roughly 2-3 worst days per year)
3. Calculate the average of those catastrophic days
This is your expected loss in a crisis.
    `,
    dataInputs: [
      { name: 'Daily Returns', description: 'All daily percentage returns', source: 'polygon' }
    ],
    format: 'percent',
    precision: 2,
    higherIsBetter: false,
    interpretation: {
      excellent: { min: 0, max: 3, label: 'Even worst days are survivable' },
      good: { min: 3, max: 5, label: 'Painful but recoverable' },
      fair: { min: 5, max: 8, label: 'Significant crisis exposure' },
      poor: { min: 8, max: Infinity, label: 'Vulnerable to major crashes' }
    },
    icon: 'AlertOctagon',
    color: 'rose',
    exampleCalculation: 'Worst 3 days averaged -5.1% each → CVaR₉₉ = 5.1%'
  },
  
  tailRatio: {
    id: 'tailRatio',
    name: 'Tail Ratio',
    category: 'tail_risk',
    plainEnglish: "Do your best days make up for your worst days? Compares big gains to big losses.",
    whyItMatters: "A ratio above 1 means your upside tail is fatter than your downside tail - that's asymmetry working in your favor.",
    formula: 'Tail Ratio = Mean(Top 5%) / |Mean(Bottom 5%)|',
    formulaExplained: `
1. Find your best 5% of days, calculate their average
2. Find your worst 5% of days, calculate their average
3. Divide the gains by the (absolute) losses
Ratio > 1 = gains outweigh losses in the extremes
    `,
    dataInputs: [
      { name: 'Daily Returns', description: 'All daily percentage returns', source: 'polygon' }
    ],
    format: 'ratio',
    precision: 2,
    higherIsBetter: true,
    interpretation: {
      excellent: { min: 1.5, max: Infinity, label: 'Big wins exceed big losses' },
      good: { min: 1.1, max: 1.5, label: 'Slight positive skew' },
      fair: { min: 0.8, max: 1.1, label: 'Roughly symmetric' },
      poor: { min: 0, max: 0.8, label: 'Big losses exceed big wins' }
    },
    icon: 'Scale',
    color: 'purple',
    exampleCalculation: 'Best 5%: +2.8%, Worst 5%: -2.1% → Ratio = 1.33'
  },
  
  ulcerIndex: {
    id: 'ulcerIndex',
    name: 'Ulcer Index',
    category: 'tail_risk',
    plainEnglish: "How much 'pain' from drawdowns - measures both depth and duration. Named because long drawdowns give investors ulcers.",
    whyItMatters: "Unlike max drawdown which is one number, this captures the cumulative suffering of all underwater periods.",
    formula: 'Ulcer Index = √(Mean of Squared Drawdowns)',
    formulaExplained: `
1. Calculate drawdown at each point (how far below peak)
2. Square each drawdown (emphasizes larger ones)
3. Take the average
4. Take the square root
Lower = less pain over time
    `,
    dataInputs: [
      { name: 'Portfolio Values', description: 'Daily value series', source: 'calculated' }
    ],
    format: 'ratio',
    precision: 2,
    higherIsBetter: false,
    interpretation: {
      excellent: { min: 0, max: 3, label: 'Very smooth ride' },
      good: { min: 3, max: 7, label: 'Normal discomfort' },
      fair: { min: 7, max: 12, label: 'Extended rough patches' },
      poor: { min: 12, max: Infinity, label: 'Prolonged suffering' }
    },
    icon: 'Frown',
    color: 'orange',
    exampleCalculation: 'Avg squared drawdown = 16 → √16 = 4.0'
  },
  
  // ============================================
  // RISK-ADJUSTED METRICS
  // ============================================
  
  sharpeRatio: {
    id: 'sharpeRatio',
    name: 'Sharpe Ratio',
    category: 'risk_adjusted',
    plainEnglish: "How much extra return you get for each unit of risk taken. The gold standard for risk-adjusted performance.",
    whyItMatters: "Higher Sharpe means you're being compensated better for the risk you take. It's how professionals compare investments fairly.",
    formula: 'Sharpe = (Return - Risk-Free Rate) / Volatility',
    formulaExplained: `
1. Calculate excess return (portfolio return minus risk-free rate)
2. Divide by volatility (standard deviation)
3. Annualize by multiplying by √252
Result: Excess return per unit of risk
    `,
    dataInputs: [
      { name: 'Daily Returns', description: 'Portfolio daily returns', source: 'polygon' },
      { name: 'Risk-Free Rate', description: 'Currently ~5% (T-bill)', source: 'calculated' }
    ],
    format: 'ratio',
    precision: 2,
    higherIsBetter: true,
    interpretation: {
      excellent: { min: 2, max: Infinity, label: 'Exceptional - rare' },
      good: { min: 1, max: 2, label: 'Good - worth the risk' },
      fair: { min: 0.5, max: 1, label: 'Acceptable' },
      poor: { min: -Infinity, max: 0.5, label: 'Poor - not worth the risk' }
    },
    icon: 'Award',
    color: 'emerald',
    exampleCalculation: 'Return 12%, RF 5%, Vol 14% → (12-5)/14 = 0.5, × √252 ≈ 1.11'
  },
  
  sortinoRatio: {
    id: 'sortinoRatio',
    name: 'Sortino Ratio',
    category: 'risk_adjusted',
    plainEnglish: "Like Sharpe, but only punishes downside volatility. Upside swings shouldn't be considered 'risk.'",
    whyItMatters: "More realistic than Sharpe because it recognizes that investors don't mind upside volatility - only losses hurt.",
    formula: 'Sortino = (Return - MAR) / Downside Deviation',
    formulaExplained: `
1. Calculate excess return over Minimum Acceptable Return (MAR)
2. Calculate downside deviation (only returns below MAR)
3. Divide excess return by downside deviation
Ignores upside volatility entirely
    `,
    dataInputs: [
      { name: 'Daily Returns', description: 'Portfolio daily returns', source: 'polygon' },
      { name: 'MAR', description: 'Usually risk-free rate', source: 'calculated' }
    ],
    format: 'ratio',
    precision: 2,
    higherIsBetter: true,
    interpretation: {
      excellent: { min: 2, max: Infinity, label: 'Excellent downside management' },
      good: { min: 1, max: 2, label: 'Good risk/reward' },
      fair: { min: 0.5, max: 1, label: 'Adequate' },
      poor: { min: -Infinity, max: 0.5, label: 'Poor downside-adjusted returns' }
    },
    icon: 'Shield',
    color: 'blue',
    exampleCalculation: 'Excess: 8%, Downside Dev: 6% → Sortino = 1.33'
  },
  
  calmarRatio: {
    id: 'calmarRatio',
    name: 'Calmar Ratio',
    category: 'risk_adjusted',
    plainEnglish: "How much annual return you get for each percent of worst-case loss. Reward vs. pain.",
    whyItMatters: "Directly compares gains to your worst nightmare. Answers: 'Is the potential reward worth the potential pain?'",
    formula: 'Calmar = CAGR / Max Drawdown',
    formulaExplained: `
1. Calculate CAGR (compound annual growth rate)
2. Divide by maximum drawdown
Higher = better reward for the worst-case pain
    `,
    dataInputs: [
      { name: 'CAGR', description: 'Compound annual growth', source: 'calculated' },
      { name: 'Max Drawdown', description: 'Worst peak-to-trough', source: 'calculated' }
    ],
    format: 'ratio',
    precision: 2,
    higherIsBetter: true,
    interpretation: {
      excellent: { min: 1, max: Infinity, label: 'Returns exceed worst-case' },
      good: { min: 0.5, max: 1, label: 'Reasonable risk/reward' },
      fair: { min: 0.25, max: 0.5, label: 'Drawdown may feel too painful' },
      poor: { min: 0, max: 0.25, label: 'Risk disproportionate to reward' }
    },
    icon: 'Scale',
    color: 'teal',
    exampleCalculation: 'CAGR 12%, Max DD 18% → Calmar = 0.67'
  },
  
  omegaRatio: {
    id: 'omegaRatio',
    name: 'Omega Ratio',
    category: 'risk_adjusted',
    plainEnglish: "Compares all gains above threshold to all losses below it. Captures the full return distribution.",
    whyItMatters: "Unlike Sharpe/Sortino which assume normal distributions, Omega captures the actual shape of your returns.",
    formula: 'Omega = 1 + (Sum of Gains / Sum of Losses)',
    formulaExplained: `
1. Sum all returns above threshold (gains)
2. Sum all returns below threshold (losses, as positive)
3. Divide gains by losses
4. Add 1
Omega > 1 = probability-weighted gains exceed losses
    `,
    dataInputs: [
      { name: 'Daily Returns', description: 'All daily returns', source: 'polygon' },
      { name: 'Threshold', description: 'Usually 0 or risk-free', source: 'calculated' }
    ],
    format: 'ratio',
    precision: 2,
    higherIsBetter: true,
    interpretation: {
      excellent: { min: 2, max: Infinity, label: 'Gains strongly outweigh losses' },
      good: { min: 1.5, max: 2, label: 'Favorable profile' },
      fair: { min: 1.1, max: 1.5, label: 'Slightly favorable' },
      poor: { min: 0, max: 1.1, label: 'Losses nearly equal gains' }
    },
    icon: 'PieChart',
    color: 'violet',
    exampleCalculation: 'Gains $8K, Losses $5K → 1 + 8/5 = 2.6'
  },
  
  informationRatio: {
    id: 'informationRatio',
    name: 'Information Ratio',
    category: 'risk_adjusted',
    plainEnglish: "How much extra return vs. benchmark for each unit of deviation from it. Measures active skill.",
    whyItMatters: "If you're not just buying the index, this tells you if your active decisions are paying off.",
    formula: 'IR = (Portfolio Return - Benchmark Return) / Tracking Error',
    formulaExplained: `
1. Calculate active return (how much you beat/lagged benchmark)
2. Calculate tracking error (std dev of active returns)
3. Divide active return by tracking error
Higher = your deviation from benchmark is being rewarded
    `,
    dataInputs: [
      { name: 'Portfolio Returns', description: 'Your daily returns', source: 'calculated' },
      { name: 'Benchmark Returns', description: 'SPY daily returns', source: 'polygon' }
    ],
    format: 'ratio',
    precision: 2,
    higherIsBetter: true,
    interpretation: {
      excellent: { min: 1, max: Infinity, label: 'Exceptional active management' },
      good: { min: 0.5, max: 1, label: 'Active bets paying off' },
      fair: { min: 0, max: 0.5, label: 'Marginal active value' },
      poor: { min: -Infinity, max: 0, label: 'Would be better with index' }
    },
    icon: 'Target',
    color: 'cyan',
    exampleCalculation: 'Beat SPY by 3%, Tracking Error 4% → IR = 0.75'
  },
  
  treynorRatio: {
    id: 'treynorRatio',
    name: 'Treynor Ratio',
    category: 'risk_adjusted',
    plainEnglish: "Excess return per unit of systematic (market) risk. Like Sharpe but uses beta instead of volatility.",
    whyItMatters: "Useful when comparing diversified portfolios - measures reward for market risk specifically.",
    formula: 'Treynor = (Return - Risk-Free) / Beta',
    formulaExplained: `
1. Calculate excess return (portfolio return minus risk-free rate)
2. Divide by portfolio beta
Result: Excess return per unit of market risk
    `,
    dataInputs: [
      { name: 'Portfolio Return', description: 'Annualized return', source: 'calculated' },
      { name: 'Beta', description: 'Market sensitivity', source: 'calculated' },
      { name: 'Risk-Free Rate', description: 'T-bill rate', source: 'calculated' }
    ],
    format: 'ratio',
    precision: 2,
    higherIsBetter: true,
    interpretation: {
      excellent: { min: 0.15, max: Infinity, label: 'Excellent systematic risk compensation' },
      good: { min: 0.08, max: 0.15, label: 'Good market risk reward' },
      fair: { min: 0.03, max: 0.08, label: 'Adequate' },
      poor: { min: -Infinity, max: 0.03, label: 'Poor market risk reward' }
    },
    icon: 'Crosshair',
    color: 'indigo',
    exampleCalculation: 'Return 12%, RF 5%, Beta 1.1 → (12-5)/1.1 = 6.36%'
  },
  
  // ============================================
  // DISTRIBUTION METRICS
  // ============================================
  
  skewness: {
    id: 'skewness',
    name: 'Skewness',
    category: 'distribution',
    plainEnglish: "Are your returns lopsided? Negative = more big drops. Positive = more big jumps.",
    whyItMatters: "Most stocks have negative skew (occasional crashes). Positive skew is desirable - like lottery-ticket upside.",
    formula: 'Skewness = (1/n) × Σ((R - μ) / σ)³',
    formulaExplained: `
1. For each return, calculate deviation from mean
2. Divide by standard deviation
3. Cube (preserves sign, emphasizes extremes)
4. Average
Negative = fat left tail (crashes)
Positive = fat right tail (windfalls)
    `,
    dataInputs: [
      { name: 'Daily Returns', description: 'All daily returns', source: 'polygon' }
    ],
    format: 'ratio',
    precision: 2,
    higherIsBetter: true,
    interpretation: {
      excellent: { min: 0.5, max: Infinity, label: 'Positive skew - lottery upside' },
      good: { min: 0, max: 0.5, label: 'Slightly positive' },
      fair: { min: -0.5, max: 0, label: 'Slightly negative - typical' },
      poor: { min: -Infinity, max: -0.5, label: 'Negative skew - crash-prone' }
    },
    icon: 'GitBranch',
    color: 'purple',
    exampleCalculation: 'Returns bunch left with long right tail → +0.3 skewness'
  },
  
  kurtosis: {
    id: 'kurtosis',
    name: 'Excess Kurtosis',
    category: 'distribution',
    plainEnglish: "How often extreme days happen vs. a 'normal' bell curve. Higher = more surprises.",
    whyItMatters: "Markets have fat tails - extreme days happen more than you'd expect. High kurtosis = more shocking moves.",
    formula: 'Kurtosis = (1/n) × Σ((R - μ) / σ)⁴ - 3',
    formulaExplained: `
1. For each return, calculate deviation from mean
2. Divide by standard deviation
3. Raise to 4th power (heavily emphasizes extremes)
4. Average and subtract 3 (normal distribution's kurtosis)
> 0 = fatter tails than normal
    `,
    dataInputs: [
      { name: 'Daily Returns', description: 'All daily returns', source: 'polygon' }
    ],
    format: 'ratio',
    precision: 2,
    higherIsBetter: false,
    interpretation: {
      excellent: { min: -1, max: 1, label: 'Near-normal distribution' },
      good: { min: 1, max: 3, label: 'Some extra tail risk' },
      fair: { min: 3, max: 6, label: 'Fat tails - more extremes' },
      poor: { min: 6, max: Infinity, label: 'Very fat tails - shock-prone' }
    },
    icon: 'Bell',
    color: 'yellow',
    exampleCalculation: 'Kurtosis of 5 = extreme days happen 5× more than normal'
  },
  
  // ============================================
  // LIQUIDITY METRICS
  // ============================================
  
  liquidityScore: {
    id: 'liquidityScore',
    name: 'Liquidity Score',
    category: 'liquidity',
    plainEnglish: "How quickly you can sell without moving prices. 100 = instant, 0 = potentially stuck.",
    whyItMatters: "In a crisis, everyone runs for the exit. Illiquid holdings can trap you or force fire-sale prices.",
    formula: 'Liquidity = Σ(Weight × Asset Liquidity Score)',
    formulaExplained: `
1. Each asset has a liquidity score (based on daily volume)
   - Large ETFs (SPY): 100
   - Large-cap stocks: 85-95
   - Small-caps: 60-80
2. Weight each by portfolio allocation
3. Sum for total portfolio liquidity
    `,
    dataInputs: [
      { name: 'Asset Weights', description: 'Portfolio allocation', source: 'user_input' },
      { name: 'Trading Volume', description: 'Average daily volume', source: 'polygon' }
    ],
    format: 'score',
    precision: 0,
    higherIsBetter: true,
    interpretation: {
      excellent: { min: 90, max: 100, label: 'Can exit in hours' },
      good: { min: 75, max: 90, label: 'Can exit within a day' },
      fair: { min: 50, max: 75, label: 'May take several days' },
      poor: { min: 0, max: 50, label: 'Significant liquidity risk' }
    },
    icon: 'Droplets',
    color: 'blue',
    exampleCalculation: '70% SPY (100) + 30% small-cap (70) = 91'
  },
  
  daysToLiquidate: {
    id: 'daysToLiquidate',
    name: 'Days to Liquidate',
    category: 'liquidity',
    plainEnglish: "How many days to sell everything without significantly moving prices.",
    whyItMatters: "If you need money fast, can you get it? This estimates time to convert to cash.",
    formula: 'Days = max(Position / (Daily Volume × 10%))',
    formulaExplained: `
1. For each position: Size / (Avg Daily Volume × 10%)
   - 10% = max traded without moving price much
2. Take the maximum across all positions
   - Bottleneck determines total time
    `,
    dataInputs: [
      { name: 'Position Sizes', description: 'Dollar amount per holding', source: 'calculated' },
      { name: 'Daily Volume', description: 'Average dollar volume', source: 'polygon' }
    ],
    format: 'days',
    precision: 0,
    higherIsBetter: false,
    interpretation: {
      excellent: { min: 0, max: 1, label: 'Fully liquid' },
      good: { min: 1, max: 3, label: 'Quick exit possible' },
      fair: { min: 3, max: 7, label: 'Week to fully exit' },
      poor: { min: 7, max: Infinity, label: 'May get trapped in crisis' }
    },
    icon: 'Clock',
    color: 'slate',
    exampleCalculation: 'Largest position needs 3 days based on volume → 3 days'
  },
  
  // ============================================
  // BENCHMARK METRICS
  // ============================================
  
  beta: {
    id: 'beta',
    name: 'Beta',
    category: 'benchmark',
    plainEnglish: "How much your portfolio moves relative to the market. 1 = same as market, >1 = more volatile, <1 = less.",
    whyItMatters: "Beta tells you your market sensitivity. High beta amplifies both gains AND losses in market moves.",
    formula: 'Beta = Covariance(Portfolio, Market) / Variance(Market)',
    formulaExplained: `
1. Calculate how portfolio and market move together (covariance)
2. Divide by how much the market moves on its own (variance)
Beta > 1 = amplified market exposure
Beta < 1 = dampened market exposure
    `,
    dataInputs: [
      { name: 'Portfolio Returns', description: 'Your daily returns', source: 'calculated' },
      { name: 'Market Returns', description: 'SPY daily returns', source: 'polygon' }
    ],
    format: 'ratio',
    precision: 2,
    higherIsBetter: null,
    interpretation: {
      excellent: { min: 0.8, max: 1.2, label: 'Market-like' },
      good: { min: 0.5, max: 0.8, label: 'Defensive' },
      fair: { min: 1.2, max: 1.5, label: 'Aggressive' },
      poor: { min: 1.5, max: Infinity, label: 'Highly leveraged to market' }
    },
    icon: 'GitCompare',
    color: 'blue',
    exampleCalculation: 'If market up 10%, portfolio up 12% → Beta ≈ 1.2'
  },
  
  alpha: {
    id: 'alpha',
    name: 'Alpha',
    category: 'benchmark',
    plainEnglish: "Excess return above what beta alone would predict. Positive alpha = beating the market after adjusting for risk.",
    whyItMatters: "Alpha is the holy grail - return from skill, not just risk. Positive alpha means you're adding value.",
    formula: 'Alpha = Portfolio Return - (Risk-Free + Beta × Market Premium)',
    formulaExplained: `
1. Calculate expected return based on beta:
   Expected = Risk-Free + Beta × (Market Return - Risk-Free)
2. Subtract expected from actual return
Alpha = Your actual return - What beta predicted
    `,
    dataInputs: [
      { name: 'Portfolio Return', description: 'Your annualized return', source: 'calculated' },
      { name: 'Beta', description: 'Market sensitivity', source: 'calculated' },
      { name: 'Market Return', description: 'SPY return', source: 'polygon' }
    ],
    format: 'percent',
    precision: 2,
    higherIsBetter: true,
    interpretation: {
      excellent: { min: 5, max: Infinity, label: 'Exceptional skill' },
      good: { min: 2, max: 5, label: 'Adding value' },
      fair: { min: -2, max: 2, label: 'Market-like performance' },
      poor: { min: -Infinity, max: -2, label: 'Underperforming expectations' }
    },
    icon: 'Star',
    color: 'gold',
    exampleCalculation: 'Returned 15%, expected 12% based on beta → Alpha = 3%'
  },
  
  rSquared: {
    id: 'rSquared',
    name: 'R-Squared',
    shortName: 'R²',
    category: 'benchmark',
    plainEnglish: "What percentage of your portfolio's moves are explained by the market. 100% = pure market exposure.",
    whyItMatters: "Low R² means your portfolio moves independently from the market - true diversification.",
    formula: 'R² = Correlation(Portfolio, Market)²',
    formulaExplained: `
1. Calculate correlation between portfolio and market returns
2. Square the correlation
R² = 100% means portfolio perfectly tracks market
R² = 0% means no relationship to market
    `,
    dataInputs: [
      { name: 'Portfolio Returns', description: 'Your daily returns', source: 'calculated' },
      { name: 'Market Returns', description: 'SPY daily returns', source: 'polygon' }
    ],
    format: 'percent',
    precision: 1,
    higherIsBetter: null,
    interpretation: {
      excellent: { min: 70, max: 95, label: 'Diversified but market-aware' },
      good: { min: 40, max: 70, label: 'Good diversification' },
      fair: { min: 95, max: 100, label: 'Might as well buy index' },
      poor: { min: 0, max: 40, label: 'Very different from market' }
    },
    icon: 'Link',
    color: 'slate',
    exampleCalculation: 'Correlation 0.85 → R² = 72.25%'
  },
  
  trackingError: {
    id: 'trackingError',
    name: 'Tracking Error',
    category: 'benchmark',
    plainEnglish: "How much your returns deviate from the benchmark. Higher = more different from index.",
    whyItMatters: "If you're trying to beat the index, some tracking error is needed. Too much might mean too much risk.",
    formula: 'TE = StdDev(Portfolio Return - Benchmark Return) × √252',
    formulaExplained: `
1. Calculate active return each day (portfolio - benchmark)
2. Calculate standard deviation of active returns
3. Annualize by multiplying by √252
Higher = more deviation from benchmark
    `,
    dataInputs: [
      { name: 'Portfolio Returns', description: 'Your daily returns', source: 'calculated' },
      { name: 'Benchmark Returns', description: 'SPY daily returns', source: 'polygon' }
    ],
    format: 'percent',
    precision: 2,
    higherIsBetter: null,
    interpretation: {
      excellent: { min: 2, max: 6, label: 'Active but controlled' },
      good: { min: 0, max: 2, label: 'Close to benchmark' },
      fair: { min: 6, max: 10, label: 'High active risk' },
      poor: { min: 10, max: Infinity, label: 'Very different strategy' }
    },
    icon: 'ArrowUpDown',
    color: 'orange',
    exampleCalculation: 'Active return std dev 0.4% daily → 6.3% annualized'
  }
};

// Helper functions

export function getMetricDefinition(id: string): MetricDefinition | undefined {
  return METRIC_DEFINITIONS[id];
}

export function getMetricsByCategory(category: MetricDefinition['category']): MetricDefinition[] {
  return Object.values(METRIC_DEFINITIONS).filter(m => m.category === category);
}

export function formatMetricValue(value: number, definition: MetricDefinition): string {
  const { format, precision } = definition;
  
  switch (format) {
    case 'percent':
      return `${value >= 0 ? '' : ''}${value.toFixed(precision)}%`;
    case 'dollars':
      return value < 0 
        ? `-$${Math.abs(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
        : `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    case 'ratio':
      return value.toFixed(precision);
    case 'score':
      return value.toFixed(precision);
    case 'days':
      return `${value.toFixed(0)} day${value !== 1 ? 's' : ''}`;
    default:
      return value.toFixed(precision);
  }
}

export function getInterpretation(value: number, definition: MetricDefinition): {
  level: 'excellent' | 'good' | 'fair' | 'poor';
  label: string;
  color: string;
} {
  const { interpretation } = definition;
  
  for (const level of ['excellent', 'good', 'fair', 'poor'] as const) {
    const range = interpretation[level];
    if (value >= range.min && value < range.max) {
      const colors = {
        excellent: 'emerald',
        good: 'blue',
        fair: 'amber',
        poor: 'rose'
      };
      return { level, label: range.label, color: colors[level] };
    }
  }
  
  return { level: 'fair', label: 'Unknown', color: 'gray' };
}

export function getAllMetricIds(): string[] {
  return Object.keys(METRIC_DEFINITIONS);
}

export function getMetricCategories(): MetricDefinition['category'][] {
  return ['learn', 'return', 'risk', 'risk_adjusted', 'tail_risk', 'distribution', 'liquidity', 'benchmark'];
}

export function getCategoryLabel(category: MetricDefinition['category']): string {
  const labels: Record<MetricDefinition['category'], string> = {
    learn: 'Easy to Understand',
    return: 'Returns',
    risk: 'Risk',
    risk_adjusted: 'Risk-Adjusted',
    tail_risk: 'Tail Risk',
    distribution: 'Distribution',
    liquidity: 'Liquidity',
    benchmark: 'vs Benchmark'
  };
  return labels[category];
}
