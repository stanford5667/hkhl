/**
 * Financial Glossary Provider
 * 
 * A global context that provides access to financial term definitions
 * anywhere in the application. Includes the detail sheet, hooks, and
 * auto-detection utilities.
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { FinancialTermDetail } from './FinancialTermDetail';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type TermCategory = 
  | 'metric' 
  | 'allocation' 
  | 'risk' 
  | 'strategy' 
  | 'indicator'
  | 'instrument'
  | 'fundamental'
  | 'technical'
  | 'macro'
  | 'behavioral'
  | 'general';

export interface TermItem {
  id: string;
  name: string;
  category: TermCategory;
  value?: string | number;
  color?: string;
  ticker?: string; // For terms with associated tickers (e.g., VIX, SPY)
}

interface GlossaryContextType {
  // State
  selectedTerm: TermItem | null;
  isOpen: boolean;
  
  // Actions
  openTerm: (term: TermItem | string) => void;
  closeTerm: () => void;
  
  // Utilities
  getTermInfo: (termId: string) => TermDefinition | null;
  searchTerms: (query: string) => TermItem[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPREHENSIVE TERM DEFINITIONS (100+ terms)
// ═══════════════════════════════════════════════════════════════════════════════

export interface TermDefinition {
  id: string;
  name: string;
  aliases: string[];
  category: TermCategory;
  icon: string; // Lucide icon name
  color: string;
  
  // Content
  shortDescription: string;
  fullDescription: string;
  whyItMatters: string;
  howToUse: string;
  
  // Educational
  keyPoints: string[];
  commonMistakes?: string[];
  proTips?: string[];
  
  // Data
  ranges?: { label: string; range: string; meaning: string; color?: string }[];
  formula?: string;
  unit?: string;
  
  // Relationships
  relatedTerms: string[];
  oppositeTerms?: string[];
  
  // Market Data
  ticker?: string; // FRED series ID or ticker symbol
  chartType?: 'line' | 'area' | 'bar' | 'candlestick';
  
  // Resources
  videoUrl?: string;
  articleUrl?: string;
  
  // Benchmarks
  benchmarks?: { name: string; value: string; description: string }[];
  
  // Studies available
  availableStudies?: string[];
}

export const FINANCIAL_TERMS: Record<string, TermDefinition> = {
  // ════════════════════════════════════════════════════════════════════════════
  // PORTFOLIO METRICS
  // ════════════════════════════════════════════════════════════════════════════
  'expected-return': {
    id: 'expected-return',
    name: 'Expected Return',
    aliases: ['anticipated return', 'projected return', 'target return', 'annual return'],
    category: 'metric',
    icon: 'TrendingUp',
    color: '#3b82f6',
    shortDescription: 'The anticipated annual percentage gain from a portfolio allocation.',
    fullDescription: 'Expected return is the annualized percentage gain anticipated from a portfolio based on asset allocation and historical performance of similar portfolios. It represents the probability-weighted average of all possible returns.',
    whyItMatters: 'This helps illustrate whether a portfolio allocation may be positioned to meet certain financial goals. A mismatch between expected returns and goals may require adjusting timeline or risk tolerance.',
    howToUse: 'Compare your expected return to your required return (what you need to reach your goal). If there\'s a gap, consider adjusting allocation or extending your timeline.',
    keyPoints: [
      'Based on historical performance and asset allocation',
      'Not a guarantee - actual returns will vary',
      'Higher expected returns typically mean higher risk',
      'Should exceed inflation (3-4%) for real growth',
    ],
    commonMistakes: [
      'Confusing expected return with guaranteed return',
      'Not accounting for fees which reduce actual returns',
      'Chasing high returns without considering risk',
    ],
    proTips: [
      'Use after-fee, after-tax returns for realistic planning',
      'Consider Monte Carlo simulations for range of outcomes',
    ],
    ranges: [
      { label: 'Conservative', range: '4-6%', meaning: 'Capital preservation focus', color: '#3b82f6' },
      { label: 'Moderate', range: '6-8%', meaning: 'Balanced growth', color: '#10b981' },
      { label: 'Aggressive', range: '8-12%', meaning: 'Growth focused', color: '#f59e0b' },
      { label: 'Very Aggressive', range: '12%+', meaning: 'High risk/reward', color: '#ef4444' },
    ],
    formula: 'E(R) = Σ(P × R) where P = probability, R = return',
    unit: '%',
    relatedTerms: ['volatility', 'sharpe-ratio', 'cagr', 'risk-adjusted-return'],
    oppositeTerms: ['realized-return'],
    ticker: 'SP500',
    chartType: 'area',
    benchmarks: [
      { name: 'S&P 500 (1926-2023)', value: '10.5%', description: 'Long-term historical average' },
      { name: '60/40 Portfolio', value: '7.5%', description: 'Classic balanced allocation' },
      { name: '10-Year Treasury', value: '4.5%', description: 'Risk-free benchmark' },
      { name: 'Inflation (CPI)', value: '3.0%', description: 'Minimum to preserve purchasing power' },
    ],
    availableStudies: ['historical_returns', 'rolling_returns', 'decade_comparison'],
  },
  
  'volatility': {
    id: 'volatility',
    name: 'Volatility',
    aliases: ['standard deviation', 'risk', 'variance', 'price swings'],
    category: 'risk',
    icon: 'Activity',
    color: '#8b5cf6',
    shortDescription: 'How much your portfolio value fluctuates over time.',
    fullDescription: 'Volatility measures the degree of variation in portfolio returns over time, typically expressed as annualized standard deviation. Higher volatility means wider swings in both directions - more potential upside but also more downside risk.',
    whyItMatters: 'High volatility tests your emotional resolve. Even if you can financially handle losses, volatility determines if you\'ll sleep at night. It\'s the "price of admission" for higher expected returns.',
    howToUse: 'Match volatility to your temperament and timeline. Young investors with decades ahead can handle 20%+ volatility. Those near retirement should aim for 10% or less.',
    keyPoints: [
      'Measured as annualized standard deviation',
      'Not inherently bad - creates opportunities',
      'Different from permanent loss of capital',
      'Decreases with longer time horizons',
    ],
    commonMistakes: [
      'Equating volatility with risk of total loss',
      'Panic selling during high volatility periods',
      'Ignoring volatility when it\'s low',
    ],
    proTips: [
      'Use the VIX as a real-time volatility gauge',
      'Rebalance into volatile assets after drops',
    ],
    ranges: [
      { label: 'Very Low', range: '< 5%', meaning: 'Money market, short bonds', color: '#3b82f6' },
      { label: 'Low', range: '5-10%', meaning: 'Bond-heavy portfolios', color: '#10b981' },
      { label: 'Moderate', range: '10-15%', meaning: 'Balanced portfolios', color: '#f59e0b' },
      { label: 'High', range: '15-25%', meaning: 'Equity-heavy portfolios', color: '#f97316' },
      { label: 'Very High', range: '25%+', meaning: 'Aggressive/concentrated', color: '#ef4444' },
    ],
    formula: 'σ = √(Σ(Ri - R̄)² / (n-1))',
    unit: '%',
    relatedTerms: ['beta', 'max-drawdown', 'vix', 'standard-deviation'],
    ticker: 'VIXCLS',
    chartType: 'area',
    benchmarks: [
      { name: 'S&P 500', value: '15-20%', description: 'Typical equity volatility' },
      { name: 'Aggregate Bond', value: '4-6%', description: 'Investment grade bonds' },
      { name: '60/40 Portfolio', value: '10-12%', description: 'Balanced allocation' },
      { name: 'VIX Average', value: '~20', description: 'Fear gauge normal level' },
    ],
    availableStudies: ['volatility_regime', 'vol_of_vol', 'correlation_analysis'],
  },

  'sharpe-ratio': {
    id: 'sharpe-ratio',
    name: 'Sharpe Ratio',
    aliases: ['risk-adjusted return', 'reward-to-variability'],
    category: 'metric',
    icon: 'Scale',
    color: '#06b6d4',
    shortDescription: 'How much return you get per unit of risk taken.',
    fullDescription: 'The Sharpe ratio measures risk-adjusted return by calculating excess return (above risk-free rate) per unit of volatility. It helps compare investments on an apples-to-apples basis by accounting for risk.',
    whyItMatters: 'Two portfolios might have the same return, but if one took twice the risk, it\'s actually worse. Sharpe ratio reveals the efficiency of your risk-taking.',
    howToUse: 'Aim for a Sharpe ratio of 0.5 or higher. Above 1.0 is excellent. Below 0.3 suggests you\'re taking too much risk for your returns.',
    keyPoints: [
      'Higher is better - more return per unit of risk',
      'Compares any investment on equal footing',
      'Uses risk-free rate as baseline',
      'Can be negative in down markets',
    ],
    commonMistakes: [
      'Comparing Sharpe ratios across different time periods',
      'Ignoring that it assumes normal distribution',
      'Using it for assets with skewed returns',
    ],
    ranges: [
      { label: 'Poor', range: '< 0.3', meaning: 'Risk not justified', color: '#ef4444' },
      { label: 'Acceptable', range: '0.3-0.7', meaning: 'Reasonable tradeoff', color: '#f59e0b' },
      { label: 'Good', range: '0.7-1.0', meaning: 'Above average efficiency', color: '#10b981' },
      { label: 'Excellent', range: '> 1.0', meaning: 'Exceptional risk-adjusted', color: '#3b82f6' },
    ],
    formula: 'Sharpe = (Rp - Rf) / σp',
    unit: 'ratio',
    relatedTerms: ['sortino-ratio', 'calmar-ratio', 'information-ratio', 'treynor-ratio'],
    benchmarks: [
      { name: 'S&P 500 Historical', value: '0.4-0.5', description: 'Long-term average' },
      { name: 'Top Hedge Funds', value: '1.0-2.0', description: 'Best performers' },
      { name: 'Warren Buffett', value: '~0.76', description: 'Berkshire Hathaway' },
      { name: 'Renaissance Tech', value: '~2.0', description: 'Legendary quant fund' },
    ],
    availableStudies: ['rolling_sharpe', 'sharpe_decomposition', 'peer_comparison'],
  },

  'max-drawdown': {
    id: 'max-drawdown',
    name: 'Maximum Drawdown',
    aliases: ['max drawdown', 'peak-to-trough decline', 'worst loss'],
    category: 'risk',
    icon: 'TrendingDown',
    color: '#ef4444',
    shortDescription: 'The largest peak-to-trough decline in portfolio value.',
    fullDescription: 'Maximum drawdown measures the worst decline from a portfolio peak to a subsequent trough before a new peak is reached. It represents a historical worst-case loss scenario that investors may experience.',
    whyItMatters: 'This is a stress test. If an investor cannot emotionally handle seeing a portfolio drop by this amount, they may panic sell at the worst time. Understanding limits is important.',
    howToUse: 'Consider: "If a portfolio dropped X%, would panic selling occur?" If yes, reducing risk until max drawdown is within tolerance may be worth exploring.',
    keyPoints: [
      'Represents worst historical decline',
      'Recovery time varies significantly',
      'Often happens suddenly and unexpectedly',
      'Sequence of returns matters near retirement',
    ],
    commonMistakes: [
      'Assuming past max drawdown is the worst possible',
      'Not considering recovery time',
      'Ignoring drawdown during accumulation phase',
    ],
    proTips: [
      'Add 10-20% buffer to historical max drawdown',
      'Consider your reaction to 2008 or 2020 as a guide',
    ],
    ranges: [
      { label: 'Conservative', range: '5-10%', meaning: 'Minimal downside', color: '#10b981' },
      { label: 'Moderate', range: '10-20%', meaning: 'Manageable corrections', color: '#3b82f6' },
      { label: 'Growth', range: '20-35%', meaning: 'Bear market exposure', color: '#f59e0b' },
      { label: 'Aggressive', range: '35-50%', meaning: 'Full equity risk', color: '#ef4444' },
    ],
    formula: 'MDD = (Trough - Peak) / Peak',
    unit: '%',
    relatedTerms: ['volatility', 'recovery-time', 'calmar-ratio', 'ulcer-index'],
    benchmarks: [
      { name: '2008 Financial Crisis', value: '-56.8%', description: 'S&P 500 peak to trough' },
      { name: 'COVID Crash 2020', value: '-33.9%', description: 'Fastest crash in history' },
      { name: 'Dot-Com Bubble', value: '-49.1%', description: 'NASDAQ dropped 78%' },
      { name: '60/40 Portfolio 2022', value: '-22%', description: 'Worst year since 1930s' },
    ],
    availableStudies: ['drawdown_analysis', 'recovery_time', 'underwater_chart'],
  },

  'beta': {
    id: 'beta',
    name: 'Beta',
    aliases: ['market beta', 'systematic risk', 'market sensitivity'],
    category: 'risk',
    icon: 'GitCompare',
    color: '#8b5cf6',
    shortDescription: 'How much your portfolio moves relative to the market.',
    fullDescription: 'Beta measures the sensitivity of a portfolio or stock to market movements. A beta of 1.0 means it moves with the market, greater than 1 means more volatile than the market, and less than 1 means less volatile.',
    whyItMatters: 'Beta tells you how exposed you are to market risk. High beta means bigger gains in bull markets but bigger losses in bear markets.',
    howToUse: 'Use beta to understand your market exposure. If you want to reduce market risk, lower your portfolio beta. If you\'re bullish, consider higher beta.',
    keyPoints: [
      'Beta of 1.0 = moves with the market',
      'Beta > 1 = amplified market moves',
      'Beta < 1 = dampened market moves',
      'Beta can be negative (inverse correlation)',
    ],
    ranges: [
      { label: 'Defensive', range: '< 0.8', meaning: 'Less volatile than market', color: '#10b981' },
      { label: 'Market-like', range: '0.8-1.2', meaning: 'Similar to market', color: '#3b82f6' },
      { label: 'Aggressive', range: '1.2-1.5', meaning: 'More volatile', color: '#f59e0b' },
      { label: 'High Beta', range: '> 1.5', meaning: 'Amplified moves', color: '#ef4444' },
    ],
    formula: 'β = Cov(Ri, Rm) / Var(Rm)',
    unit: 'coefficient',
    relatedTerms: ['alpha', 'volatility', 'correlation', 'r-squared'],
    benchmarks: [
      { name: 'S&P 500', value: '1.0', description: 'Market benchmark by definition' },
      { name: 'Utilities Sector', value: '~0.5', description: 'Defensive stocks' },
      { name: 'Tech Sector', value: '~1.3', description: 'Growth stocks' },
      { name: 'Gold', value: '~0', description: 'Near-zero correlation' },
    ],
    availableStudies: ['rolling_beta', 'sector_beta', 'factor_decomposition'],
  },

  'alpha': {
    id: 'alpha',
    name: 'Alpha',
    aliases: ['excess return', 'active return', 'manager skill'],
    category: 'metric',
    icon: 'Sparkles',
    color: '#10b981',
    shortDescription: 'Return above what beta alone would predict.',
    fullDescription: 'Alpha represents the excess return of an investment relative to its benchmark after adjusting for risk (beta). Positive alpha means the investment outperformed what its risk level predicted; negative alpha means underperformance.',
    whyItMatters: 'Alpha is the holy grail of active management - it represents genuine skill in beating the market. Most active managers fail to generate consistent alpha.',
    howToUse: 'Look for consistent alpha over 3-5 years. One-year alpha can be luck. Be skeptical of high alpha claims without understanding the strategy.',
    keyPoints: [
      'Positive alpha = genuine outperformance',
      'Very difficult to achieve consistently',
      'Most alpha is actually disguised factor exposure',
      'Fees often eat up any alpha generated',
    ],
    formula: 'α = Rp - [Rf + β(Rm - Rf)]',
    unit: '%',
    relatedTerms: ['beta', 'information-ratio', 'active-share', 'tracking-error'],
    benchmarks: [
      { name: 'Average Active Fund', value: '-0.5 to 0%', description: 'Most underperform after fees' },
      { name: 'Top Quartile', value: '1-2%', description: 'Skilled managers' },
      { name: 'Warren Buffett', value: '~7%', description: 'Exceptional long-term' },
    ],
    availableStudies: ['alpha_persistence', 'factor_adjusted_alpha'],
  },

  'cagr': {
    id: 'cagr',
    name: 'CAGR',
    aliases: ['compound annual growth rate', 'annualized return', 'geometric return'],
    category: 'metric',
    icon: 'TrendingUp',
    color: '#10b981',
    shortDescription: 'The smoothed annual rate of return over a period.',
    fullDescription: 'CAGR (Compound Annual Growth Rate) is the mean annual growth rate of an investment over a specified time period longer than one year. It represents what the return would have been if it grew at a steady rate each year.',
    whyItMatters: 'CAGR provides a single, comparable number for returns over different time periods. It\'s the standard way to compare investment performance.',
    howToUse: 'Use CAGR to compare investments over similar periods. Remember that CAGR smooths volatility - the actual path may have been much bumpier.',
    keyPoints: [
      'Represents steady-state growth rate',
      'More accurate than average return',
      'Accounts for compounding',
      'Hides volatility and path',
    ],
    formula: 'CAGR = (Ending Value / Beginning Value)^(1/n) - 1',
    unit: '%',
    relatedTerms: ['expected-return', 'compound-growth', 'geometric-mean'],
    benchmarks: [
      { name: 'S&P 500 (1926-2023)', value: '10.5%', description: 'Long-term CAGR' },
      { name: 'Bonds (1926-2023)', value: '5.5%', description: 'Long-term CAGR' },
      { name: 'Inflation', value: '3.0%', description: 'Long-term average' },
    ],
    availableStudies: ['rolling_cagr', 'period_comparison'],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // ASSET CLASSES
  // ════════════════════════════════════════════════════════════════════════════
  'us-equities': {
    id: 'us-equities',
    name: 'US Equities',
    aliases: ['US stocks', 'domestic stocks', 'American stocks', 'equities'],
    category: 'allocation',
    icon: 'Building2',
    color: '#3b82f6',
    shortDescription: 'Ownership shares in US-based companies.',
    fullDescription: 'US equities represent ownership shares in American publicly traded companies. They offer the highest long-term return potential among major asset classes but come with significant volatility.',
    whyItMatters: 'US equities have been the primary wealth-building engine for long-term investors. The US market represents about 60% of global market cap.',
    howToUse: 'Use broad index funds like VTI or ITOT. Allocate based on time horizon - higher percentage for longer horizons.',
    keyPoints: [
      'Highest long-term return potential',
      'Subject to 30-50% drawdowns',
      'Historically 7% real returns',
      'Benefits from US economic strength',
    ],
    ranges: [
      { label: 'Conservative', range: '20-40%', meaning: 'Near retirement', color: '#10b981' },
      { label: 'Moderate', range: '40-60%', meaning: 'Balanced approach', color: '#3b82f6' },
      { label: 'Aggressive', range: '60-80%', meaning: 'Growth focus', color: '#f59e0b' },
      { label: 'Very Aggressive', range: '80-100%', meaning: 'Long horizon', color: '#ef4444' },
    ],
    relatedTerms: ['international-equities', 'small-cap', 'large-cap', 'sp500'],
    ticker: 'SPY',
    benchmarks: [
      { name: 'Historical Return', value: '10.5%', description: 'Long-term average (1926-2023)' },
      { name: 'Volatility', value: '~16%', description: 'Annual standard deviation' },
      { name: 'Dividend Yield', value: '~1.5%', description: 'Current S&P 500' },
    ],
    availableStudies: ['sector_breakdown', 'valuation_history', 'earnings_growth'],
  },

  'international-equities': {
    id: 'international-equities',
    name: 'International Equities',
    aliases: ['foreign stocks', 'ex-US stocks', 'international stocks', 'global stocks'],
    category: 'allocation',
    icon: 'Globe',
    color: '#8b5cf6',
    shortDescription: 'Stocks in companies based outside the United States.',
    fullDescription: 'International equities include developed markets (Europe, Japan, Australia) and emerging markets (China, India, Brazil). They provide diversification from US markets and exposure to global growth.',
    whyItMatters: 'Reduces home country bias. International markets often outperform US markets for extended periods. Emerging markets offer higher growth potential.',
    howToUse: 'Allocate 20-40% of equities to international. Use VXUS for developed + emerging, or split between VEA (developed) and VWO (emerging).',
    keyPoints: [
      'Reduces concentration risk',
      'Currency adds volatility and return',
      'Emerging markets higher risk/reward',
      'Valuations often cheaper than US',
    ],
    relatedTerms: ['us-equities', 'emerging-markets', 'developed-markets', 'currency-risk'],
    ticker: 'VXUS',
    benchmarks: [
      { name: 'Historical Return', value: '8%', description: 'Long-term average' },
      { name: 'Correlation to US', value: '0.85', description: 'High but not perfect' },
      { name: 'Global Market Share', value: '40%', description: 'Ex-US markets' },
    ],
    availableStudies: ['country_breakdown', 'currency_impact', 'valuation_vs_us'],
  },

  'fixed-income': {
    id: 'fixed-income',
    name: 'Fixed Income',
    aliases: ['bonds', 'debt', 'fixed income securities', 'bond funds'],
    category: 'allocation',
    icon: 'Banknote',
    color: '#10b981',
    shortDescription: 'Loans to governments and corporations that pay interest.',
    fullDescription: 'Fixed income investments are loans made to governments, municipalities, or corporations. In exchange, the borrower pays regular interest and returns principal at maturity. Bonds provide income and reduce portfolio volatility.',
    whyItMatters: 'Bonds are the shock absorber in your portfolio. They reduce volatility and provide income. Critical for risk management as you approach goals.',
    howToUse: 'Use aggregate bond funds like BND or AGG. Increase bond allocation as you near retirement or goals. Consider TIPS for inflation protection.',
    keyPoints: [
      'Lower returns than stocks historically',
      'Much lower volatility',
      'Inverse relationship with interest rates',
      'Credit risk varies by issuer',
    ],
    ranges: [
      { label: 'Aggressive', range: '0-20%', meaning: 'Long time horizon', color: '#ef4444' },
      { label: 'Growth', range: '20-40%', meaning: 'Still equity focused', color: '#f59e0b' },
      { label: 'Balanced', range: '40-60%', meaning: 'Moderate risk', color: '#3b82f6' },
      { label: 'Conservative', range: '60-80%', meaning: 'Near goal/retirement', color: '#10b981' },
    ],
    relatedTerms: ['duration', 'yield', 'credit-risk', 'treasuries'],
    ticker: 'BND',
    benchmarks: [
      { name: 'Historical Return', value: '5.5%', description: 'Long-term average' },
      { name: 'Current Yield', value: '4-5%', description: 'Aggregate bonds' },
      { name: 'Volatility', value: '~4%', description: 'Much lower than stocks' },
    ],
    availableStudies: ['yield_history', 'duration_analysis', 'credit_breakdown'],
  },

  'real-estate': {
    id: 'real-estate',
    name: 'Real Estate',
    aliases: ['REITs', 'real estate investment trusts', 'property'],
    category: 'allocation',
    icon: 'Home',
    color: '#f59e0b',
    shortDescription: 'Investments in physical property through REITs.',
    fullDescription: 'Real estate investments, typically through REITs (Real Estate Investment Trusts), provide exposure to commercial and residential property. REITs must distribute 90% of taxable income as dividends.',
    whyItMatters: 'Real estate provides diversification, inflation protection, and income. REITs make real estate accessible without buying property directly.',
    howToUse: 'Allocate 5-15% to REITs using VNQ or similar. Remember that your home already provides real estate exposure.',
    keyPoints: [
      'High dividend yields',
      'Some inflation protection',
      'Interest rate sensitive',
      'Sector diversification',
    ],
    relatedTerms: ['reit', 'dividend-yield', 'inflation-protection', 'alternative-assets'],
    ticker: 'VNQ',
    benchmarks: [
      { name: 'Historical Return', value: '9%', description: 'Long-term REIT average' },
      { name: 'Dividend Yield', value: '4-5%', description: 'REITs typically high yield' },
      { name: 'Correlation to Stocks', value: '0.7', description: 'Moderate correlation' },
    ],
    availableStudies: ['sector_analysis', 'yield_history', 'valuation_metrics'],
  },

  'alternatives': {
    id: 'alternatives',
    name: 'Alternatives',
    aliases: ['alternative assets', 'alternative investments', 'alts'],
    category: 'allocation',
    icon: 'Gem',
    color: '#ec4899',
    shortDescription: 'Non-traditional assets like commodities and hedge funds.',
    fullDescription: 'Alternative investments include commodities (gold, oil), hedge funds, private equity, and other non-traditional assets. They often have low correlation to stocks and bonds.',
    whyItMatters: 'Alternatives can reduce portfolio volatility through diversification. Gold, for example, often rises during crises.',
    howToUse: 'Keep alternatives to 5-15% of portfolio. Use low-cost commodity ETFs like GLD (gold) or DJP (commodities). Avoid high-fee hedge fund products.',
    keyPoints: [
      'Low correlation to traditional assets',
      'Can reduce portfolio volatility',
      'Often more expensive (fees)',
      'Less liquid than stocks/bonds',
    ],
    relatedTerms: ['gold', 'commodities', 'hedge-funds', 'private-equity'],
    benchmarks: [
      { name: 'Gold Historical', value: '7%', description: 'Long-term real return' },
      { name: 'Commodities', value: '3-5%', description: 'Varies significantly' },
      { name: 'Correlation to Stocks', value: '0.1-0.3', description: 'Low correlation' },
    ],
    availableStudies: ['correlation_analysis', 'crisis_performance'],
  },

  'cash': {
    id: 'cash',
    name: 'Cash',
    aliases: ['money market', 'cash equivalents', 'savings', 'short-term reserves'],
    category: 'allocation',
    icon: 'Wallet',
    color: '#6b7280',
    shortDescription: 'Highly liquid, stable-value investments.',
    fullDescription: 'Cash and cash equivalents include money market funds, CDs, and high-yield savings accounts. They provide stability, liquidity, and purchasing power for near-term needs.',
    whyItMatters: 'Cash serves as your emergency fund and opportunity fund. It prevents forced selling of volatile assets during downturns.',
    howToUse: 'Keep 3-6 months expenses in emergency fund. Park cash in high-yield savings (HYSA) or money market funds for better returns than bank accounts.',
    keyPoints: [
      'Zero price volatility',
      'Returns vary with Fed rates',
      'Loses purchasing power to inflation',
      'Essential for emergency fund',
    ],
    ranges: [
      { label: 'Minimal', range: '0-5%', meaning: 'Fully invested', color: '#ef4444' },
      { label: 'Low', range: '5-10%', meaning: 'Small buffer', color: '#f59e0b' },
      { label: 'Moderate', range: '10-20%', meaning: 'Conservative', color: '#3b82f6' },
      { label: 'High', range: '20%+', meaning: 'Very conservative', color: '#10b981' },
    ],
    relatedTerms: ['emergency-fund', 'liquidity', 'money-market', 'opportunity-cost'],
    benchmarks: [
      { name: 'Current Money Market', value: '4-5%', description: 'High rate environment' },
      { name: 'Historical Average', value: '3%', description: 'Long-term average' },
      { name: 'After Inflation', value: '0-1%', description: 'Real return' },
    ],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // MARKET INDICATORS
  // ════════════════════════════════════════════════════════════════════════════
  'vix': {
    id: 'vix',
    name: 'VIX',
    aliases: ['fear index', 'volatility index', 'CBOE VIX', 'fear gauge'],
    category: 'indicator',
    icon: 'Activity',
    color: '#ef4444',
    shortDescription: 'The market\'s "fear gauge" measuring expected volatility.',
    fullDescription: 'The VIX (CBOE Volatility Index) measures the market\'s expectation of 30-day volatility implied by S&P 500 option prices. It\'s often called the "fear index" because it spikes during market stress.',
    whyItMatters: 'VIX helps gauge market sentiment. High VIX often signals fear and potential buying opportunities. Low VIX may indicate complacency.',
    howToUse: 'Watch VIX for sentiment extremes. VIX above 30 = high fear (potential buy). VIX below 15 = complacency (be cautious). Don\'t trade VIX directly - it\'s complex.',
    keyPoints: [
      'Normal range: 15-20',
      'Spikes during market crashes',
      'Mean-reverting over time',
      'Inversely correlated with stocks',
    ],
    commonMistakes: [
      'Trying to trade VIX products long-term (contango decay)',
      'Thinking low VIX means no risk',
      'Using VIX ETFs as a hedge',
    ],
    ranges: [
      { label: 'Low / Complacent', range: '< 15', meaning: 'Calm markets, potential risk', color: '#10b981' },
      { label: 'Normal', range: '15-20', meaning: 'Average conditions', color: '#3b82f6' },
      { label: 'Elevated', range: '20-30', meaning: 'Heightened uncertainty', color: '#f59e0b' },
      { label: 'High / Fear', range: '30-50', meaning: 'Significant fear', color: '#f97316' },
      { label: 'Extreme', range: '50+', meaning: 'Crisis mode', color: '#ef4444' },
    ],
    relatedTerms: ['volatility', 'implied-volatility', 'put-call-ratio'],
    ticker: 'VIXCLS',
    chartType: 'area',
    benchmarks: [
      { name: 'Long-term Average', value: '~19', description: 'Historical mean' },
      { name: 'COVID Spike (2020)', value: '82.69', description: 'All-time intraday high' },
      { name: '2008 Peak', value: '80.86', description: 'Financial crisis' },
      { name: 'Pre-COVID (2019)', value: '~15', description: 'Low volatility period' },
    ],
    availableStudies: ['vix_term_structure', 'vix_seasonality', 'vix_signal_backtest'],
  },

  'yield-curve': {
    id: 'yield-curve',
    name: 'Yield Curve',
    aliases: ['treasury curve', 'term structure', 'interest rate curve'],
    category: 'indicator',
    icon: 'TrendingUp',
    color: '#06b6d4',
    shortDescription: 'The relationship between bond yields and maturities.',
    fullDescription: 'The yield curve plots interest rates of bonds with equal credit quality but different maturities. A normal curve slopes upward (longer-term = higher yield). An inverted curve (short-term > long-term) often predicts recession.',
    whyItMatters: 'The yield curve is one of the best recession indicators. An inverted curve has preceded every recession since 1955 with only one false positive.',
    howToUse: 'Monitor the 2s10s spread (10-year minus 2-year Treasury). Inversion is a warning sign but timing is tricky - recession can be 6-24 months later.',
    keyPoints: [
      'Normal = upward sloping',
      'Flat = uncertainty',
      'Inverted = recession warning',
      '2s10s spread is most watched',
    ],
    relatedTerms: ['duration', 'treasuries', 'fed-funds-rate', '10-year-treasury'],
    ticker: 'T10Y2Y',
    chartType: 'area',
    benchmarks: [
      { name: 'Normal Spread', value: '1-2%', description: '10Y minus 2Y' },
      { name: 'Flat', value: '0-0.5%', description: 'Uncertainty' },
      { name: 'Inverted', value: '< 0%', description: 'Recession signal' },
    ],
    availableStudies: ['recession_prediction', 'fed_policy_impact', 'historical_inversions'],
  },

  'pe-ratio': {
    id: 'pe-ratio',
    name: 'P/E Ratio',
    aliases: ['price-to-earnings', 'PE multiple', 'earnings multiple'],
    category: 'fundamental',
    icon: 'Calculator',
    color: '#f59e0b',
    shortDescription: 'Stock price divided by earnings per share.',
    fullDescription: 'The price-to-earnings (P/E) ratio compares a company\'s stock price to its earnings per share. It tells you how much investors are paying for each dollar of earnings. Higher P/E = higher expectations for growth.',
    whyItMatters: 'P/E helps assess if a stock or market is expensive or cheap relative to earnings. It\'s the most common valuation metric but has important limitations.',
    howToUse: 'Compare P/E to historical averages, peers, and expected growth. High P/E can be justified by high growth. Use forward P/E for better forward-looking view.',
    keyPoints: [
      'Higher P/E = higher growth expectations',
      'Compare to sector peers, not absolute',
      'Trailing vs Forward P/E',
      'Can be distorted by one-time items',
    ],
    ranges: [
      { label: 'Value', range: '< 15', meaning: 'Low expectations', color: '#10b981' },
      { label: 'Fair Value', range: '15-20', meaning: 'Average valuation', color: '#3b82f6' },
      { label: 'Growth', range: '20-30', meaning: 'High expectations', color: '#f59e0b' },
      { label: 'Expensive', range: '30+', meaning: 'Very high expectations', color: '#ef4444' },
    ],
    formula: 'P/E = Stock Price / Earnings Per Share',
    relatedTerms: ['earnings', 'eps', 'peg-ratio', 'cape-ratio'],
    ticker: 'SP500',
    benchmarks: [
      { name: 'S&P 500 Average', value: '~17', description: 'Historical mean' },
      { name: 'Current S&P 500', value: '~22', description: 'As of 2024' },
      { name: 'Tech Sector', value: '~28', description: 'Higher growth' },
      { name: 'Value Stocks', value: '~14', description: 'Lower valuations' },
    ],
    availableStudies: ['valuation_history', 'forward_vs_trailing', 'sector_comparison'],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // STRATEGY CONCEPTS
  // ════════════════════════════════════════════════════════════════════════════
  'diversification': {
    id: 'diversification',
    name: 'Diversification',
    aliases: ['diversify', 'spreading risk', 'not putting eggs in one basket'],
    category: 'strategy',
    icon: 'Shuffle',
    color: '#8b5cf6',
    shortDescription: 'Spreading investments to reduce risk.',
    fullDescription: 'Diversification is spreading investments across different asset classes, sectors, and geographies to reduce risk. It\'s often called the only "free lunch" in investing because it can reduce risk without necessarily reducing expected returns.',
    whyItMatters: 'When one investment falls, others may rise or hold steady. Diversification smooths returns and helps you stay invested through market turbulence.',
    howToUse: 'Own broad index funds across asset classes. Don\'t put more than 5% in any single stock. Include assets with low correlation to each other.',
    keyPoints: [
      'Reduces unsystematic (company-specific) risk',
      'Cannot eliminate systematic (market) risk',
      'Correlation is key - want assets that don\'t move together',
      'Over-diversification can dilute returns',
    ],
    commonMistakes: [
      'Thinking many stocks = diversified (sector concentration)',
      'Ignoring correlation between holdings',
      'Diversifying within a single asset class only',
    ],
    relatedTerms: ['correlation', 'asset-allocation', 'modern-portfolio-theory', 'concentration-risk'],
    benchmarks: [
      { name: 'Single Stock', value: '30-50%', description: 'Volatility of one company' },
      { name: '20 Stocks', value: '~20%', description: 'Most specific risk gone' },
      { name: 'Total Market Fund', value: '~15%', description: 'Fully diversified within asset' },
    ],
    availableStudies: ['correlation_matrix', 'concentration_analysis', 'risk_reduction_curve'],
  },

  'rebalancing': {
    id: 'rebalancing',
    name: 'Rebalancing',
    aliases: ['portfolio rebalancing', 'rebalance'],
    category: 'strategy',
    icon: 'RefreshCw',
    color: '#10b981',
    shortDescription: 'Returning your portfolio to target allocations.',
    fullDescription: 'Rebalancing is the process of periodically adjusting your portfolio back to your target asset allocation. When stocks rise, you sell some and buy bonds. When stocks fall, you sell bonds and buy stocks. It\'s a systematic way to buy low and sell high.',
    whyItMatters: 'Without rebalancing, your portfolio drifts from targets. After a bull market, you might be 80% stocks when you wanted 60%. Rebalancing maintains your intended risk level.',
    howToUse: 'Rebalance when allocations drift 5%+ from targets, or on a regular schedule (quarterly/annually). Use new contributions to rebalance when possible.',
    keyPoints: [
      'Maintains your chosen risk level',
      'Forces buy low, sell high behavior',
      'Can be done with new contributions',
      'Tax implications in taxable accounts',
    ],
    proTips: [
      'Rebalance with new money to avoid taxes',
      'Use tax-advantaged accounts for most rebalancing',
    ],
    relatedTerms: ['asset-allocation', 'drift', 'tax-loss-harvesting'],
    availableStudies: ['rebalancing_frequency', 'threshold_vs_calendar', 'tax_impact'],
  },

  'dollar-cost-averaging': {
    id: 'dollar-cost-averaging',
    name: 'Dollar-Cost Averaging',
    aliases: ['DCA', 'regular investing', 'systematic investing'],
    category: 'strategy',
    icon: 'Calendar',
    color: '#3b82f6',
    shortDescription: 'Investing a fixed amount at regular intervals.',
    fullDescription: 'Dollar-cost averaging (DCA) is investing a fixed dollar amount at regular intervals regardless of market conditions. You buy more shares when prices are low, fewer when high, resulting in a lower average cost over time.',
    whyItMatters: 'DCA removes emotion and timing from investing. You don\'t need to predict the market or worry about buying at peaks. It builds discipline and reduces regret.',
    howToUse: 'Set up automatic investments on payday. Invest the same amount each month. Continue regardless of market conditions or news headlines.',
    keyPoints: [
      'Removes market timing decisions',
      'Reduces impact of volatility',
      'Builds investing discipline',
      'Works well with 401(k) contributions',
    ],
    commonMistakes: [
      'Stopping DCA during market downturns',
      'Thinking DCA guarantees profits',
      'Using DCA as excuse to delay investing lump sum',
    ],
    relatedTerms: ['lump-sum-investing', 'automation', 'compound-growth'],
    benchmarks: [
      { name: 'DCA vs Lump Sum', value: '~67%', description: 'Lump sum wins 2/3 of time' },
      { name: 'DCA Advantage', value: 'Behavioral', description: 'Easier to stick with' },
    ],
    availableStudies: ['dca_vs_lumpsum', 'historical_outcomes', 'optimal_frequency'],
  },

  'compound-growth': {
    id: 'compound-growth',
    name: 'Compound Growth',
    aliases: ['compounding', 'compound interest', 'exponential growth'],
    category: 'strategy',
    icon: 'TrendingUp',
    color: '#10b981',
    shortDescription: 'Earning returns on your returns over time.',
    fullDescription: 'Compound growth is earning returns on your returns, creating exponential rather than linear growth. Albert Einstein allegedly called it the "eighth wonder of the world." Given enough time, even modest returns create life-changing wealth.',
    whyItMatters: 'Compounding is the most powerful force in investing. The longer your money compounds, the more dramatic the results. Starting early matters more than starting with more.',
    howToUse: 'Start investing as early as possible. Reinvest all dividends. Never interrupt compounding unnecessarily. Time in market beats timing the market.',
    keyPoints: [
      'Time is the most important factor',
      'Returns on returns accelerate growth',
      'Rule of 72: 72/return = years to double',
      'Early dollars are worth more than later dollars',
    ],
    formula: 'FV = PV × (1 + r)^n',
    relatedTerms: ['time-value-of-money', 'rule-of-72', 'reinvestment'],
    benchmarks: [
      { name: '$10K at 8% for 30 years', value: '$100,627', description: '10x growth' },
      { name: '$10K at 8% for 40 years', value: '$217,245', description: 'Another 10 years = 2x more' },
      { name: 'Double time at 8%', value: '9 years', description: 'Rule of 72' },
    ],
    availableStudies: ['growth_projection', 'early_vs_late_start', 'reinvestment_impact'],
  },

  'time-horizon': {
    id: 'time-horizon',
    name: 'Time Horizon',
    aliases: ['investment horizon', 'time frame', 'investment timeline'],
    category: 'strategy',
    icon: 'Clock',
    color: '#f59e0b',
    shortDescription: 'How long until you need your money.',
    fullDescription: 'Your investment time horizon is the number of years until you need to access your money. It\'s the single most important factor in determining appropriate asset allocation and risk level.',
    whyItMatters: 'Time is your greatest ally. With 20+ years, you can ride out multiple crashes. With 3 years, a 30% drop could devastate your goals. Match risk to timeline.',
    howToUse: 'Determine when you\'ll need the money. Less than 5 years = conservative. 5-15 years = balanced. 15+ years = can be aggressive.',
    keyPoints: [
      'Longer horizon = more risk capacity',
      'Stocks have never lost over 20-year periods',
      'Shorten horizon = reduce risk',
      'Multiple goals = multiple time horizons',
    ],
    ranges: [
      { label: 'Short-Term', range: '< 3 years', meaning: 'Capital preservation', color: '#10b981' },
      { label: 'Medium-Term', range: '3-10 years', meaning: 'Balanced approach', color: '#3b82f6' },
      { label: 'Long-Term', range: '10-20 years', meaning: 'Growth focus', color: '#f59e0b' },
      { label: 'Very Long', range: '20+ years', meaning: 'Maximum growth', color: '#ef4444' },
    ],
    relatedTerms: ['risk-tolerance', 'asset-allocation', 'sequence-risk', 'target-date-fund'],
    availableStudies: ['historical_rolling_returns', 'probability_of_loss', 'optimal_allocation'],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // RISK CONCEPTS
  // ════════════════════════════════════════════════════════════════════════════
  'risk-tolerance': {
    id: 'risk-tolerance',
    name: 'Risk Tolerance',
    aliases: ['risk appetite', 'risk preference'],
    category: 'risk',
    icon: 'Shield',
    color: '#f59e0b',
    shortDescription: 'Your psychological ability to handle investment losses.',
    fullDescription: 'Risk tolerance is your emotional and psychological ability to handle investment losses without making irrational decisions. It\'s about how you feel when markets drop, not just what you can financially afford.',
    whyItMatters: 'Your emotional response matters more than your financial capacity. If a 20% drop keeps you awake at night, you\'ll likely panic sell at the worst time.',
    howToUse: 'Be honest about how you\'ve reacted to past losses. If you check your portfolio daily and stress about red days, reduce risk until you can sleep at night.',
    keyPoints: [
      'Different from risk capacity',
      'Can change over time',
      'Test with real (small) losses',
      'Sleep-at-night test',
    ],
    ranges: [
      { label: 'Low', range: '0-30', meaning: 'Prefer stability, minimal volatility', color: '#10b981' },
      { label: 'Moderate', range: '30-60', meaning: 'Can handle some swings', color: '#3b82f6' },
      { label: 'High', range: '60-80', meaning: 'Comfortable with volatility', color: '#f59e0b' },
      { label: 'Very High', range: '80-100', meaning: 'Aggressive risk taker', color: '#ef4444' },
    ],
    relatedTerms: ['risk-capacity', 'behavioral-finance', 'loss-aversion'],
    availableStudies: ['questionnaire_analysis', 'behavioral_patterns'],
  },

  'risk-capacity': {
    id: 'risk-capacity',
    name: 'Risk Capacity',
    aliases: ['ability to take risk', 'financial capacity'],
    category: 'risk',
    icon: 'Wallet',
    color: '#10b981',
    shortDescription: 'Your financial ability to absorb investment losses.',
    fullDescription: 'Risk capacity is your objective financial ability to absorb losses based on income, savings, time horizon, and obligations. Unlike risk tolerance (emotional), risk capacity is measurable and fact-based.',
    whyItMatters: 'Even if you\'re emotionally comfortable with risk, you can\'t take it if you need the money soon, lack stable income, or have no emergency fund.',
    howToUse: 'Calculate your financial runway: stable income + emergency fund + time horizon = risk capacity. Young high earners with decades ahead have high capacity.',
    keyPoints: [
      'Objective and measurable',
      'Based on financial situation',
      'Independent of emotional tolerance',
      'Can exceed or lag risk tolerance',
    ],
    relatedTerms: ['risk-tolerance', 'emergency-fund', 'time-horizon', 'income-stability'],
    availableStudies: ['capacity_calculator', 'scenario_analysis'],
  },

  'sequence-risk': {
    id: 'sequence-risk',
    name: 'Sequence Risk',
    aliases: ['sequence of returns risk', 'retirement timing risk'],
    category: 'risk',
    icon: 'AlertTriangle',
    color: '#ef4444',
    shortDescription: 'The danger of poor returns early in retirement.',
    fullDescription: 'Sequence of returns risk is the danger of experiencing poor returns early in retirement when you\'re withdrawing money. The order of returns matters enormously - two investors with identical average returns but different sequences can have wildly different outcomes.',
    whyItMatters: 'A 30% drop in year one of retirement is devastating; the same drop in year 20 matters much less. Early losses deplete the base that compounds.',
    howToUse: 'Reduce equity exposure as you approach retirement. Keep 2-3 years of expenses in stable assets. Consider a "bucket" strategy.',
    keyPoints: [
      'Biggest risk at/near retirement',
      'Order of returns matters when withdrawing',
      'Can\'t be diversified away',
      'Target-date funds address this',
    ],
    relatedTerms: ['retirement-planning', 'safe-withdrawal-rate', 'bucket-strategy', 'glide-path'],
    availableStudies: ['sequence_simulation', 'historical_retirement_cohorts'],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// TERM LOOKUP UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build a lookup map of all term aliases to their canonical IDs
 */
const buildAliasMap = (): Map<string, string> => {
  const map = new Map<string, string>();
  
  Object.values(FINANCIAL_TERMS).forEach(term => {
    // Add the canonical name
    map.set(term.name.toLowerCase(), term.id);
    map.set(term.id.toLowerCase(), term.id);
    
    // Add all aliases
    term.aliases.forEach(alias => {
      map.set(alias.toLowerCase(), term.id);
    });
  });
  
  return map;
};

const ALIAS_MAP = buildAliasMap();

/**
 * Find a term by name, alias, or ID
 */
export const findTerm = (query: string): TermDefinition | null => {
  const normalized = query.toLowerCase().trim();
  const termId = ALIAS_MAP.get(normalized);
  
  if (termId) {
    return FINANCIAL_TERMS[termId] || null;
  }
  
  return null;
};

/**
 * Search terms by partial match
 */
export const searchTerms = (query: string, limit = 10): TermDefinition[] => {
  const normalized = query.toLowerCase().trim();
  const results: TermDefinition[] = [];
  const seen = new Set<string>();
  
  // First pass: exact matches
  for (const [alias, termId] of ALIAS_MAP.entries()) {
    if (alias === normalized && !seen.has(termId)) {
      const term = FINANCIAL_TERMS[termId];
      if (term) {
        results.push(term);
        seen.add(termId);
      }
    }
  }
  
  // Second pass: starts with
  for (const [alias, termId] of ALIAS_MAP.entries()) {
    if (alias.startsWith(normalized) && !seen.has(termId)) {
      const term = FINANCIAL_TERMS[termId];
      if (term) {
        results.push(term);
        seen.add(termId);
      }
    }
    if (results.length >= limit) break;
  }
  
  // Third pass: contains
  if (results.length < limit) {
    for (const [alias, termId] of ALIAS_MAP.entries()) {
      if (alias.includes(normalized) && !seen.has(termId)) {
        const term = FINANCIAL_TERMS[termId];
        if (term) {
          results.push(term);
          seen.add(termId);
        }
      }
      if (results.length >= limit) break;
    }
  }
  
  return results;
};

// ═══════════════════════════════════════════════════════════════════════════════
// CONTEXT
// ═══════════════════════════════════════════════════════════════════════════════

const GlossaryContext = createContext<GlossaryContextType | null>(null);

export function FinancialGlossaryProvider({ children }: { children: ReactNode }) {
  const [selectedTerm, setSelectedTerm] = useState<TermItem | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  
  const openTerm = useCallback((termOrId: TermItem | string) => {
    if (typeof termOrId === 'string') {
      // Find the term by ID or alias
      const termDef = findTerm(termOrId);
      if (termDef) {
        setSelectedTerm({
          id: termDef.id,
          name: termDef.name,
          category: termDef.category,
          color: termDef.color,
        });
        setIsOpen(true);
      }
    } else {
      setSelectedTerm(termOrId);
      setIsOpen(true);
    }
  }, []);
  
  const closeTerm = useCallback(() => {
    setIsOpen(false);
  }, []);
  
  const getTermInfo = useCallback((termId: string) => {
    return FINANCIAL_TERMS[termId] || findTerm(termId);
  }, []);
  
  const searchTermsCallback = useCallback((query: string) => {
    return searchTerms(query).map(t => ({
      id: t.id,
      name: t.name,
      category: t.category,
      color: t.color,
    }));
  }, []);
  
  return (
    <GlossaryContext.Provider value={{
      selectedTerm,
      isOpen,
      openTerm,
      closeTerm,
      getTermInfo,
      searchTerms: searchTermsCallback,
    }}>
      {children}
      <FinancialTermDetail
        term={selectedTerm}
        open={isOpen}
        onOpenChange={setIsOpen}
        onTermChange={(term) => openTerm(term)}
      />
    </GlossaryContext.Provider>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export function useGlossary() {
  const context = useContext(GlossaryContext);
  if (!context) {
    throw new Error('useGlossary must be used within a FinancialGlossaryProvider');
  }
  return context;
}

export default FinancialGlossaryProvider;
