/**
 * Premium Questionnaire Data - Investor Types & Glossary
 * 16 investor personality types based on 4 dimensions (like Myers-Briggs)
 */

// Dimension scoring: each ranges from 0-100
// Risk: 0=Guardian (conservative), 100=Pioneer (aggressive)
// Decision: 0=Analytical, 100=Intuitive
// Time: 0=Patient (long-term), 100=Active (short-term)
// Focus: 0=Diversifier, 100=Concentrator

export interface InvestorDimensions {
  risk: number;      // Guardian (0) vs Pioneer (100)
  decision: number;  // Analytical (0) vs Intuitive (100)
  time: number;      // Patient (0) vs Active (100)
  focus: number;     // Diversifier (0) vs Concentrator (100)
}

export interface InvestorType {
  code: string;
  name: string;
  tagline: string;
  description: string;
  strengths: string[];
  challenges: string[];
  famousExamples: string[];
  suggestedAllocation: {
    stocks: number;
    bonds: number;
    alternatives: number;
    cash: number;
  };
}

// 16 Investor Types
export const INVESTOR_TYPES: Record<string, InvestorType> = {
  // Guardian (G) Types - Risk-averse
  'GAPD': {
    code: 'GAPD',
    name: 'The Steward',
    tagline: 'Guardian of wealth through careful stewardship',
    description: 'You are the ultimate wealth preserver. Patient, analytical, and diversified - you believe in the power of compound interest over time. Your portfolio is a fortress designed to withstand any storm.',
    strengths: ['Excellent at capital preservation', 'Disciplined and patient', 'Well-diversified portfolios', 'Low emotional reactivity'],
    challenges: ['May miss high-growth opportunities', 'Can be overly cautious', 'May underperform in bull markets'],
    famousExamples: ['Warren Buffett (in preservation mode)', 'John Bogle'],
    suggestedAllocation: { stocks: 40, bonds: 40, alternatives: 10, cash: 10 }
  },
  'GAPC': {
    code: 'GAPC',
    name: 'The Strategist',
    tagline: 'Concentrated conviction built on deep research',
    description: 'You combine careful analysis with high-conviction bets. While risk-aware, you believe that deep research justifies concentrated positions in your best ideas.',
    strengths: ['Deep research capabilities', 'High-conviction investing', 'Patience to hold winners'],
    challenges: ['Concentration risk', 'May be slow to act', 'Analysis paralysis'],
    famousExamples: ['Charlie Munger', 'Bill Ackman'],
    suggestedAllocation: { stocks: 50, bonds: 30, alternatives: 15, cash: 5 }
  },
  'GIAD': {
    code: 'GIAD',
    name: 'The Guardian',
    tagline: 'Protecting wealth through intuitive diversification',
    description: 'You trust your gut while maintaining a safety-first approach. Your portfolio is well-diversified, but you rely on instinct as much as spreadsheets.',
    strengths: ['Good intuition for risk', 'Flexible thinking', 'Quick to sense danger'],
    challenges: ['May lack analytical rigor', 'Decisions can be inconsistent'],
    famousExamples: ['Paul Tudor Jones (defensive mode)'],
    suggestedAllocation: { stocks: 45, bonds: 35, alternatives: 15, cash: 5 }
  },
  'GIAC': {
    code: 'GIAC',
    name: 'The Sentinel',
    tagline: 'Intuitive focus on proven winners',
    description: 'You combine protective instincts with concentrated positions in companies you trust. Quality over quantity, with an intuitive sense for value.',
    strengths: ['Strong quality focus', 'Intuitive value recognition', 'Patient with winners'],
    challenges: ['May hold losers too long', 'Concentration in comfort zone'],
    famousExamples: ['Philip Fisher'],
    suggestedAllocation: { stocks: 55, bonds: 30, alternatives: 10, cash: 5 }
  },
  'GAAD': {
    code: 'GAAD',
    name: 'The Architect',
    tagline: 'Engineering portfolios with systematic precision',
    description: 'You actively manage a diversified portfolio using analytical frameworks. Factor models, rebalancing rules, and systematic approaches define your style.',
    strengths: ['Systematic approach', 'Risk-managed active trading', 'Data-driven decisions'],
    challenges: ['Over-optimization risk', 'May overthink simple decisions'],
    famousExamples: ['Ray Dalio', 'Cliff Asness'],
    suggestedAllocation: { stocks: 50, bonds: 25, alternatives: 20, cash: 5 }
  },
  'GAAC': {
    code: 'GAAC',
    name: 'The Surgeon',
    tagline: 'Precision trades in concentrated positions',
    description: 'You actively trade with surgical precision, focusing on a select few opportunities analyzed in depth. Every trade is calculated and purposeful.',
    strengths: ['Precision trading', 'Deep position knowledge', 'Active risk management'],
    challenges: ['High transaction costs', 'Concentration risk', 'Stress from active monitoring'],
    famousExamples: ['Michael Burry', 'David Einhorn'],
    suggestedAllocation: { stocks: 60, bonds: 20, alternatives: 15, cash: 5 }
  },
  'GIAD_active': {
    code: 'GIAD',
    name: 'The Tactician',
    tagline: 'Active intuitive diversification',
    description: 'You actively trade across a diversified portfolio, trusting your instincts for timing while spreading risk across many positions.',
    strengths: ['Quick reflexes', 'Broad opportunity set', 'Adaptive to conditions'],
    challenges: ['May overtrade', 'Inconsistent methodology'],
    famousExamples: ['George Soros (defensive trades)'],
    suggestedAllocation: { stocks: 50, bonds: 25, alternatives: 20, cash: 5 }
  },
  'GIAC_active': {
    code: 'GIAC',
    name: 'The Craftsman',
    tagline: 'Hands-on management of core holdings',
    description: 'You actively tend to a concentrated portfolio of companies you know deeply, using intuition and experience to time adjustments.',
    strengths: ['Deep company knowledge', 'Active position management', 'Relationship with holdings'],
    challenges: ['Overconfidence in picks', 'May miss broader trends'],
    famousExamples: ['Peter Lynch'],
    suggestedAllocation: { stocks: 60, bonds: 25, alternatives: 10, cash: 5 }
  },

  // Pioneer (P) Types - Risk-tolerant
  'PAPD': {
    code: 'PAPD',
    name: 'The Visionary',
    tagline: 'Patient analytical approach to growth investing',
    description: 'You pursue high growth through careful analysis and patient holding. Diversified but focused on high-potential opportunities.',
    strengths: ['Long-term growth focus', 'Analytical rigor', 'Diversified risk-taking'],
    challenges: ['May be too patient', 'Growth bias can hurt in downturns'],
    famousExamples: ['Cathie Wood', 'Ron Baron'],
    suggestedAllocation: { stocks: 70, bonds: 15, alternatives: 12, cash: 3 }
  },
  'PAPC': {
    code: 'PAPC',
    name: 'The Pioneer',
    tagline: 'Bold bets backed by deep conviction',
    description: 'You make concentrated bets on transformative opportunities after thorough analysis. High risk, high conviction, high potential reward.',
    strengths: ['Transformational thinking', 'Deep research', 'Conviction to hold'],
    challenges: ['High concentration risk', 'May be early on ideas', 'Drawdown tolerance needed'],
    famousExamples: ['Warren Buffett (growth mode)', 'Stanley Druckenmiller'],
    suggestedAllocation: { stocks: 75, bonds: 10, alternatives: 12, cash: 3 }
  },
  'PIAD': {
    code: 'PIAD',
    name: 'The Adventurer',
    tagline: 'Diverse opportunities through intuitive discovery',
    description: 'You cast a wide net for opportunities, trusting your instincts to find hidden gems across many sectors and asset classes.',
    strengths: ['Opportunity discovery', 'Flexible thinking', 'Diverse exposure'],
    challenges: ['May lack discipline', 'Scattered approach'],
    famousExamples: ['Jim Rogers'],
    suggestedAllocation: { stocks: 65, bonds: 15, alternatives: 17, cash: 3 }
  },
  'PIAC': {
    code: 'PIAC',
    name: 'The Maverick',
    tagline: 'Concentrated bets on intuitive conviction',
    description: 'You trust your gut to identify winners and bet big. Bold, intuitive, and willing to be contrarian.',
    strengths: ['Contrarian thinking', 'Bold action', 'Strong conviction'],
    challenges: ['High risk of large losses', 'May ignore data'],
    famousExamples: ['Carl Icahn', 'Keith Gill'],
    suggestedAllocation: { stocks: 70, bonds: 10, alternatives: 15, cash: 5 }
  },
  'PAAD': {
    code: 'PAAD',
    name: 'The Optimizer',
    tagline: 'Active systematic trading across markets',
    description: 'You actively trade a diversified portfolio using quantitative methods and systematic approaches to capture returns across markets.',
    strengths: ['Systematic edge', 'Diversified alpha', 'Active risk management'],
    challenges: ['Model risk', 'Overfitting', 'High turnover costs'],
    famousExamples: ['Jim Simons', 'David Shaw'],
    suggestedAllocation: { stocks: 55, bonds: 15, alternatives: 27, cash: 3 }
  },
  'PAAC': {
    code: 'PAAC',
    name: 'The Sniper',
    tagline: 'Concentrated active trading with analytical precision',
    description: 'You actively trade concentrated positions with analytical rigor, seeking to capture specific opportunities with precision timing.',
    strengths: ['Precise entry/exit', 'Concentrated alpha', 'Analytical edge'],
    challenges: ['Very high risk', 'Stress intensive', 'High skill required'],
    famousExamples: ['Jesse Livermore', 'Paul Tudor Jones'],
    suggestedAllocation: { stocks: 65, bonds: 10, alternatives: 20, cash: 5 }
  },
  'PIAD_active': {
    code: 'PIAD',
    name: 'The Explorer',
    tagline: 'Active discovery across diverse opportunities',
    description: 'You actively explore and trade across many asset classes, following your intuition and momentum across diverse markets.',
    strengths: ['Opportunistic', 'Adaptable', 'Broad knowledge'],
    challenges: ['May chase trends', 'Lack of focus'],
    famousExamples: ['Mark Cuban'],
    suggestedAllocation: { stocks: 60, bonds: 10, alternatives: 25, cash: 5 }
  },
  'PIAC_active': {
    code: 'PIAC',
    name: 'The Daredevil',
    tagline: 'Bold active trading on concentrated conviction',
    description: 'You actively trade large positions based on intuition and conviction. High risk tolerance with an action-oriented approach.',
    strengths: ['Bold action', 'Quick decisions', 'High conviction'],
    challenges: ['Extreme risk', 'Emotional volatility', 'Potential for large losses'],
    famousExamples: ['Bill Hwang', 'John Paulson'],
    suggestedAllocation: { stocks: 65, bonds: 5, alternatives: 25, cash: 5 }
  }
};

// Calculate investor type code from dimension scores
export function calculateInvestorDimensions(responses: Record<string, any>): InvestorDimensions {
  return {
    risk: responses.risk || 50,
    decision: responses.decision || 50,
    time: responses.time || 50,
    focus: responses.focus || 50
  };
}

export function getInvestorTypeCode(dimensions: InvestorDimensions): string {
  const risk = dimensions.risk >= 50 ? 'P' : 'G';      // Pioneer vs Guardian
  const decision = dimensions.decision >= 50 ? 'I' : 'A';  // Intuitive vs Analytical
  const time = dimensions.time >= 50 ? 'A' : 'P';      // Active vs Patient
  const focus = dimensions.focus >= 50 ? 'C' : 'D';    // Concentrator vs Diversifier
  
  return `${risk}${decision}${time}${focus}`;
}

export function getInvestorType(code: string): InvestorType {
  // Normalize the code to handle variations
  const normalizedCode = code.replace('_active', '');
  return INVESTOR_TYPES[code] || INVESTOR_TYPES[normalizedCode] || INVESTOR_TYPES['GAPD'];
}

// Investment Glossary
export const INVESTMENT_GLOSSARY: Record<string, { term: string; definition: string; example?: string }> = {
  'risk-tolerance': {
    term: 'Risk Tolerance',
    definition: 'Your emotional and psychological ability to handle investment losses without panicking or making poor decisions.',
    example: 'If a 20% portfolio drop would cause you sleepless nights, you have lower risk tolerance.'
  },
  'risk-capacity': {
    term: 'Risk Capacity',
    definition: 'Your financial ability to absorb losses based on your income, savings, time horizon, and financial obligations.',
    example: 'A 25-year-old with stable income has higher risk capacity than a retiree living on savings.'
  },
  'time-horizon': {
    term: 'Time Horizon',
    definition: 'How long until you need to access your invested money for a specific goal.',
    example: 'Retirement in 30 years = long horizon. House down payment in 3 years = short horizon.'
  },
  'diversification': {
    term: 'Diversification',
    definition: 'Spreading investments across different asset classes, sectors, and geographies to reduce risk.',
    example: 'Owning stocks, bonds, real estate, and international investments rather than just one stock.'
  },
  'asset-allocation': {
    term: 'Asset Allocation',
    definition: 'How you divide your portfolio among different asset classes like stocks, bonds, real estate, and cash.',
    example: 'A 60/40 portfolio has 60% stocks and 40% bonds.'
  },
  'compound-growth': {
    term: 'Compound Growth',
    definition: 'Earning returns on your returns. Over time, this creates exponential wealth growth.',
    example: '$10,000 at 7% annual return grows to $76,000 in 30 years without adding money.'
  },
  'rebalancing': {
    term: 'Rebalancing',
    definition: 'Periodically adjusting your portfolio back to your target allocation as markets move.',
    example: 'If stocks surge and become 70% of your portfolio (target 60%), you sell some to restore balance.'
  },
  'volatility': {
    term: 'Volatility',
    definition: 'How much an investment\'s value fluctuates up and down over time.',
    example: 'Tech stocks are more volatile than Treasury bonds - bigger swings both up and down.'
  },
  'liquidity': {
    term: 'Liquidity',
    definition: 'How quickly and easily you can convert an investment to cash without significant loss.',
    example: 'Stocks are liquid (sell in seconds). Real estate is illiquid (can take months to sell).'
  },
  'expense-ratio': {
    term: 'Expense Ratio',
    definition: 'The annual fee charged by funds as a percentage of your investment.',
    example: 'A 0.03% expense ratio costs $3 per year for every $10,000 invested.'
  }
};
