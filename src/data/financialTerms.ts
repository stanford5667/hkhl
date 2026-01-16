export interface TypicalRange {
  label: string;
  range: string;
  description?: string;
}

export interface FinancialTerm {
  term: string;
  category?: 'RISK' | 'RETURN' | 'EFFICIENCY' | 'GROWTH' | 'INCOME' | 'VALUATION';
  definition: string;
  impact: string;
  howToUse?: string;
  typicalRanges?: TypicalRange[];
  example?: string;
  learnMoreUrl?: string;
}

export const financialTerms: Record<string, FinancialTerm> = {
  totalReturn: {
    term: "Total Return",
    category: "RETURN",
    definition: "The complete gain or loss on your investment over the entire period, including all price changes and dividends. This is the actual percentage your money grew (or shrank).",
    impact: "Total return shows your real-world results. It's what you'd actually see in your account - if you invested $10,000 and now have $15,000, your total return is 50%.",
    howToUse: "Compare total returns across similar time periods. A 100% total return over 10 years is good, but over 2 years is exceptional. Always consider the timeframe.",
    typicalRanges: [
      { label: "0-50%", range: "Conservative", description: "Lower risk, steady growth over time" },
      { label: "50-100%", range: "Moderate", description: "Balanced risk and return" },
      { label: "100%+", range: "Aggressive", description: "Higher risk, potential for significant growth" }
    ],
    example: "If you invested $10,000 five years ago and it's now worth $16,000, your total return is 60%. This is different from annual return, which would be about 10% per year.",
    learnMoreUrl: "https://www.investopedia.com/terms/t/totalreturn.asp"
  },
  
  sharpeRatio: {
    term: "Sharpe Ratio",
    category: "EFFICIENCY",
    definition: "A measure of how much extra return you get for the extra risk you take. Higher is better - it means you're being rewarded more for each unit of risk.",
    impact: "A higher Sharpe Ratio in your portfolio means you're getting better risk-adjusted returns. Aim for above 1.0 for good performance.",
    howToUse: "Use Sharpe Ratio to compare portfolios with different risk levels. A portfolio with a higher Sharpe is more efficient at generating returns per unit of risk.",
    typicalRanges: [
      { label: "< 1.0", range: "Below Average", description: "Risk not adequately compensated" },
      { label: "1.0-2.0", range: "Good", description: "Solid risk-adjusted performance" },
      { label: "2.0+", range: "Excellent", description: "Outstanding efficiency" }
    ],
    example: "If Portfolio A returns 12% with 10% volatility (Sharpe = 1.2) and Portfolio B returns 15% with 20% volatility (Sharpe = 0.75), Portfolio A is actually performing better on a risk-adjusted basis.",
    learnMoreUrl: "https://www.investopedia.com/terms/s/sharperatio.asp"
  },
  
  volatility: {
    term: "Volatility",
    category: "RISK",
    definition: "How much your investment's value bounces up and down over time. High volatility means bigger swings, both up and down.",
    impact: "Higher volatility means your portfolio value will fluctuate more day-to-day. If you check your balance often, high volatility can be stressful.",
    howToUse: "Match volatility to your emotional tolerance. If seeing a 20% drop would make you sell, avoid high-volatility portfolios regardless of their return potential.",
    typicalRanges: [
      { label: "5-10%", range: "Low", description: "Minimal fluctuations, mostly bonds" },
      { label: "10-20%", range: "Moderate", description: "Balanced stock/bond mix" },
      { label: "20%+", range: "High", description: "Aggressive, stock-heavy portfolios" }
    ],
    example: "A stock with 20% volatility could reasonably move up or down 20% in a year. With $10,000 invested, that's a potential swing of $2,000 in either direction.",
    learnMoreUrl: "https://www.investopedia.com/terms/v/volatility.asp"
  },
  
  drawdown: {
    term: "Maximum Drawdown",
    category: "RISK",
    definition: "The largest peak-to-trough decline in portfolio value during a specific period. It measures the worst-case scenario investors may experience historically.",
    impact: "Understanding potential losses is crucial for emotional preparedness. If an investor cannot tolerate a 30% drop, an aggressive portfolio may not be suitable—even if higher returns are desired.",
    howToUse: "Consider: \"If a portfolio dropped this much, would panic selling occur?\" If yes, reducing risk may be appropriate. Behavioral tolerance matters as much as financial capacity.",
    typicalRanges: [
      { label: "5-10%", range: "Conservative", description: "Minimal volatility, mostly bonds" },
      { label: "10-25%", range: "Moderate", description: "Balanced approach" },
      { label: "25-50%", range: "Aggressive", description: "High growth potential, high risk" }
    ],
    example: "If your portfolio grew to $100,000 and then dropped to $70,000 before recovering, your maximum drawdown was 30%.",
    learnMoreUrl: "https://www.investopedia.com/terms/d/drawdown.asp"
  },
  
  maxDrawdown: {
    term: "Maximum Drawdown",
    category: "RISK",
    definition: "The largest peak-to-trough decline in portfolio value during a specific period. It measures the worst-case scenario investors may experience historically.",
    impact: "Understanding potential losses is crucial for emotional preparedness. If an investor cannot tolerate a 30% drop, an aggressive portfolio may not be suitable—even if higher returns are desired.",
    howToUse: "Consider: \"If a portfolio dropped this much, would panic selling occur?\" If yes, reducing risk may be appropriate. Behavioral tolerance matters as much as financial capacity.",
    typicalRanges: [
      { label: "5-10%", range: "Conservative", description: "Minimal volatility, mostly bonds" },
      { label: "10-25%", range: "Moderate", description: "Balanced approach" },
      { label: "25-50%", range: "Aggressive", description: "High growth potential, high risk" }
    ],
    example: "During 2008, the S&P 500's max drawdown was about 55%. If you had $100,000, it would have dropped to $45,000 at the worst point.",
    learnMoreUrl: "https://www.investopedia.com/terms/m/maximum-drawdown-mdd.asp"
  },
  
  correlation: {
    term: "Correlation",
    category: "RISK",
    definition: "How closely two investments move together. A correlation of 1 means they move identically, -1 means they move opposite, and 0 means no relationship.",
    impact: "Holding assets with low or negative correlation helps smooth your returns. When one investment drops, another might rise, reducing your overall risk.",
    howToUse: "Build portfolios with assets that don't all move together. If everything correlates at 1.0, you have no diversification benefit.",
    typicalRanges: [
      { label: "-1 to 0", range: "Inverse/Uncorrelated", description: "Great for hedging" },
      { label: "0 to 0.5", range: "Low", description: "Good diversification" },
      { label: "0.5 to 1", range: "High", description: "Move together, limited diversification" }
    ],
    example: "Stocks and bonds often have low correlation. In 2008, when stocks fell 37%, bonds rose 5%, cushioning the blow for diversified portfolios.",
    learnMoreUrl: "https://www.investopedia.com/terms/c/correlation.asp"
  },
  
  diversification: {
    term: "Diversification",
    category: "RISK",
    definition: "Spreading your investments across different assets so you're not putting all your eggs in one basket. The goal is to reduce risk without sacrificing returns.",
    impact: "A well-diversified portfolio protects you from any single investment tanking your wealth. It's often called 'the only free lunch in investing.'",
    howToUse: "Aim for 15-30 holdings across different asset classes, sectors, and geographies. Beyond that, benefits diminish.",
    example: "Instead of putting $100,000 in one stock, you might put $20,000 each in US stocks, international stocks, bonds, real estate, and commodities.",
    learnMoreUrl: "https://www.investopedia.com/terms/d/diversification.asp"
  },
  
  assetAllocation: {
    term: "Asset Allocation",
    category: "EFFICIENCY",
    definition: "How you divide your money among different asset types like stocks, bonds, and cash. This is the most important decision in building your portfolio.",
    impact: "Studies show asset allocation determines about 90% of your portfolio's performance over time. Getting this right matters more than picking individual stocks.",
    howToUse: "Start with your time horizon and risk tolerance. More time = more stocks. Less tolerance for losses = more bonds.",
    example: "A young investor might use 80% stocks and 20% bonds, while someone near retirement might flip to 40% stocks and 60% bonds.",
    learnMoreUrl: "https://www.investopedia.com/terms/a/assetallocation.asp"
  },
  
  rebalancing: {
    term: "Rebalancing",
    category: "EFFICIENCY",
    definition: "Periodically adjusting your portfolio back to your target allocation. As some investments grow faster than others, your balance shifts and needs resetting.",
    impact: "Rebalancing keeps your risk level consistent and forces you to 'sell high, buy low' by trimming winners and adding to laggards.",
    howToUse: "Rebalance annually or when allocations drift 5%+ from targets. More frequent rebalancing adds costs without much benefit.",
    example: "If your target is 60/40 stocks/bonds, but stocks rally and you're now at 70/30, you'd sell some stocks and buy bonds to get back to 60/40.",
    learnMoreUrl: "https://www.investopedia.com/terms/r/rebalancing.asp"
  },
  
  riskAdjustedReturn: {
    term: "Risk-Adjusted Return",
    category: "EFFICIENCY",
    definition: "A measure of how much return you earned relative to the amount of risk you took. It helps compare investments with different risk levels fairly.",
    impact: "Chasing high returns without considering risk can lead to disaster. Risk-adjusted metrics help you find investments that reward you fairly for the risk.",
    howToUse: "Always consider risk-adjusted returns, not just raw returns. A steadier 10% is often better than a volatile 12%.",
    example: "A fund returning 15% with huge swings might have worse risk-adjusted returns than a steady fund returning 10%.",
    learnMoreUrl: "https://www.investopedia.com/terms/r/riskadjustedreturn.asp"
  },
  
  beta: {
    term: "Beta",
    category: "RISK",
    definition: "How much an investment moves relative to the overall market. A beta of 1 means it moves with the market, above 1 means more volatile, below 1 means less.",
    impact: "High-beta stocks amplify your gains in bull markets but also your losses in bear markets. Choose based on your risk tolerance.",
    howToUse: "Use beta to gauge how sensitive your portfolio is to market swings. A portfolio beta of 0.8 should drop ~8% when the market drops 10%.",
    typicalRanges: [
      { label: "< 0.8", range: "Defensive", description: "Less volatile than market" },
      { label: "0.8-1.2", range: "Market-like", description: "Moves with the market" },
      { label: "> 1.2", range: "Aggressive", description: "Amplifies market moves" }
    ],
    example: "A stock with beta of 1.5 will typically rise 15% when the market rises 10%, but also fall 15% when the market falls 10%.",
    learnMoreUrl: "https://www.investopedia.com/terms/b/beta.asp"
  },
  
  alpha: {
    term: "Alpha",
    category: "RETURN",
    definition: "The extra return an investment generates above what you'd expect given its risk level. Positive alpha means the manager is adding value.",
    impact: "Finding investments with consistent positive alpha is the 'holy grail' of investing. Be skeptical of claims of high alpha - it's rare and hard to sustain.",
    howToUse: "Look for consistent alpha over 5+ years. Short-term alpha often comes from luck, not skill.",
    typicalRanges: [
      { label: "< 0%", range: "Underperforming", description: "Destroying value vs. benchmark" },
      { label: "0-2%", range: "Neutral to Good", description: "Meeting or slightly beating expectations" },
      { label: "> 2%", range: "Excellent", description: "Rare, sustained outperformance" }
    ],
    example: "If a fund returns 12% when similar-risk investments returned 10%, it generated 2% alpha (extra return from skill, not just risk).",
    learnMoreUrl: "https://www.investopedia.com/terms/a/alpha.asp"
  },
  
  expenseRatio: {
    term: "Expense Ratio",
    category: "EFFICIENCY",
    definition: "The annual fee charged by a fund, expressed as a percentage of your investment. This comes out of your returns automatically.",
    impact: "Fees compound over time and can significantly reduce your wealth. A 1% difference in fees can cost you hundreds of thousands over a lifetime.",
    howToUse: "Keep total portfolio expenses under 0.5% if possible. For passive index funds, aim for under 0.1%.",
    typicalRanges: [
      { label: "< 0.2%", range: "Low Cost", description: "Index funds, ETFs" },
      { label: "0.2-1%", range: "Moderate", description: "Active funds" },
      { label: "> 1%", range: "Expensive", description: "May drag on returns" }
    ],
    example: "On a $100,000 investment over 30 years, a 0.1% fee costs about $8,000 total, while a 1% fee costs about $70,000. That's $62,000 difference!",
    learnMoreUrl: "https://www.investopedia.com/terms/e/expenseratio.asp"
  },
  
  taxLossHarvesting: {
    term: "Tax-Loss Harvesting",
    category: "EFFICIENCY",
    definition: "Selling investments at a loss to offset gains and reduce your tax bill, then buying similar (but not identical) investments to maintain your portfolio strategy.",
    impact: "Strategic tax-loss harvesting can add 0.5-1% to your annual after-tax returns. The savings compound significantly over time.",
    howToUse: "Review taxable accounts in December for harvesting opportunities. Avoid wash sale rules by waiting 30 days or buying different securities.",
    example: "If you have $5,000 in gains and $3,000 in losses, you only pay taxes on $2,000. At a 20% tax rate, that saves you $600.",
    learnMoreUrl: "https://www.investopedia.com/terms/t/taxgainlossharvesting.asp"
  },
  
  dollarCostAveraging: {
    term: "Dollar-Cost Averaging",
    category: "EFFICIENCY",
    definition: "Investing a fixed amount regularly regardless of market conditions. You buy more shares when prices are low and fewer when prices are high.",
    impact: "DCA removes the stress of trying to time the market and can lower your average cost per share over time. It's ideal for regular contributions like 401(k)s.",
    howToUse: "Set up automatic investments on a regular schedule. Don't try to time—just invest consistently.",
    example: "Investing $500/month, when shares cost $50 you buy 10 shares, when they cost $25 you buy 20 shares. Your average cost ends up lower than the average price.",
    learnMoreUrl: "https://www.investopedia.com/terms/d/dollarcostaveraging.asp"
  },
  
  compoundInterest: {
    term: "Compound Interest",
    category: "GROWTH",
    definition: "Earning returns on your returns, not just your original investment. Your money grows exponentially over time as gains generate their own gains.",
    impact: "Compound interest is the most powerful force in wealth building. Starting early matters more than investing more - time is your greatest asset.",
    howToUse: "Start investing as early as possible. The first decade of compounding sets the foundation for exponential growth later.",
    example: "$10,000 invested at 7% becomes $20,000 in 10 years, $40,000 in 20 years, and $80,000 in 30 years. The last decade adds $40,000!",
    learnMoreUrl: "https://www.investopedia.com/terms/c/compoundinterest.asp"
  },
  
  cagr: {
    term: "Annual Growth (CAGR)",
    category: "RETURN",
    definition: "The smoothed annual growth rate of an investment over a period, as if it grew at a steady rate each year. It's the best way to compare investment performance.",
    impact: "CAGR shows you the true annual return accounting for compounding. A 100% gain over 10 years is only 7.2% CAGR, not 10%.",
    howToUse: "Use CAGR to compare investments over different time periods. It normalizes returns to an annual basis for fair comparison.",
    typicalRanges: [
      { label: "3-6%", range: "Conservative", description: "Bond-like returns" },
      { label: "6-10%", range: "Moderate", description: "Balanced portfolios" },
      { label: "10%+", range: "Aggressive", description: "Stock-heavy, higher risk" }
    ],
    example: "If your $10,000 grew to $25,000 over 10 years, your CAGR is 9.6% - meaning you averaged 9.6% growth annually, compounded.",
    learnMoreUrl: "https://www.investopedia.com/terms/c/cagr.asp"
  },
  
  marketCap: {
    term: "Market Cap",
    category: "VALUATION",
    definition: "The total value of a company's outstanding shares. Calculated by multiplying share price by number of shares. It indicates company size.",
    impact: "Large-cap stocks (>$10B) tend to be more stable, while small-cap stocks (<$2B) are riskier but may offer higher growth potential.",
    howToUse: "Diversify across market caps. Large caps for stability, small caps for growth potential.",
    typicalRanges: [
      { label: "< $2B", range: "Small Cap", description: "Higher growth, higher risk" },
      { label: "$2-10B", range: "Mid Cap", description: "Balance of growth and stability" },
      { label: "> $10B", range: "Large Cap", description: "Stable, established companies" }
    ],
    example: "Apple with 16 billion shares at $175 each has a market cap of $2.8 trillion, making it one of the world's largest companies.",
    learnMoreUrl: "https://www.investopedia.com/terms/m/marketcapitalization.asp"
  },
  
  dividendYield: {
    term: "Dividend Yield",
    category: "INCOME",
    definition: "The annual dividend payment divided by the stock price, expressed as a percentage. It shows how much income you get relative to your investment.",
    impact: "High dividend yields provide steady income but might indicate a struggling company. Balance yield with growth potential.",
    howToUse: "For income needs, look for sustainable yields (2-4%). Extremely high yields (>8%) often signal trouble ahead.",
    typicalRanges: [
      { label: "0-2%", range: "Growth Focus", description: "Reinvesting in business" },
      { label: "2-4%", range: "Balanced", description: "Sustainable income" },
      { label: "4%+", range: "High Yield", description: "Income-focused, verify sustainability" }
    ],
    example: "A stock paying $2 annual dividend at $50/share has a 4% yield. On a $10,000 investment, you'd receive $400/year in dividends.",
    learnMoreUrl: "https://www.investopedia.com/terms/d/dividendyield.asp"
  },
  
  pe_ratio: {
    term: "P/E Ratio",
    category: "VALUATION",
    definition: "Price-to-Earnings ratio - how much investors pay for each dollar of company earnings. Lower P/E might mean undervalued, higher might mean overvalued or high growth expected.",
    impact: "P/E helps you understand if you're paying a fair price. Compare to industry averages and historical norms, not in isolation.",
    howToUse: "Compare P/E to similar companies and the company's historical average. High P/E needs high growth to justify it.",
    typicalRanges: [
      { label: "< 15", range: "Value", description: "Potentially undervalued" },
      { label: "15-25", range: "Fair Value", description: "Market average range" },
      { label: "> 25", range: "Growth Premium", description: "High expectations priced in" }
    ],
    example: "A stock at $100 with $5 earnings per share has a P/E of 20. The S&P 500 average is around 15-25 historically.",
    learnMoreUrl: "https://www.investopedia.com/terms/p/price-earningsratio.asp"
  },
  
  sortinoRatio: {
    term: "Sortino Ratio",
    category: "EFFICIENCY",
    definition: "Similar to Sharpe Ratio, but only penalizes downside volatility. It recognizes that upside volatility (gains) shouldn't be treated as 'risk.'",
    impact: "Sortino gives a more realistic view of risk-adjusted returns since most investors only worry about losses, not gains.",
    howToUse: "Use Sortino when comparing investments with asymmetric return profiles. It's more relevant than Sharpe for most investors.",
    typicalRanges: [
      { label: "< 1.0", range: "Below Average", description: "Downside risk not compensated" },
      { label: "1.0-2.0", range: "Good", description: "Solid downside-adjusted returns" },
      { label: "> 2.0", range: "Excellent", description: "Strong protection against losses" }
    ],
    example: "A fund with high upside volatility but low downside volatility will have a better Sortino than Sharpe ratio.",
    learnMoreUrl: "https://www.investopedia.com/terms/s/sortinoratio.asp"
  },
  
  // Alias for sortino
  sortino: {
    term: "Sortino Ratio",
    category: "EFFICIENCY",
    definition: "Similar to Sharpe Ratio, but only penalizes downside volatility. It recognizes that upside volatility (gains) shouldn't be treated as 'risk.'",
    impact: "Sortino gives a more realistic view of risk-adjusted returns since most investors only worry about losses, not gains.",
    howToUse: "Use Sortino when comparing investments with asymmetric return profiles. It's more relevant than Sharpe for most investors.",
    typicalRanges: [
      { label: "< 1.0", range: "Below Average", description: "Downside risk not compensated" },
      { label: "1.0-2.0", range: "Good", description: "Solid downside-adjusted returns" },
      { label: "> 2.0", range: "Excellent", description: "Strong protection against losses" }
    ],
    example: "A fund with high upside volatility but low downside volatility will have a better Sortino than Sharpe ratio.",
    learnMoreUrl: "https://www.investopedia.com/terms/s/sortinoratio.asp"
  },
  
  portfolioValue: {
    term: "Portfolio Value",
    category: "VALUATION",
    definition: "The total current market value of all investments in your portfolio. This is what your holdings would be worth if you sold everything today.",
    impact: "Tracking portfolio value shows your wealth growth. Focus on long-term trends rather than daily fluctuations to avoid emotional decisions.",
    howToUse: "Check monthly or quarterly, not daily. Daily checking leads to anxiety and poor decisions.",
    example: "If you own 100 shares of a $50 stock and 200 shares of a $25 stock, your portfolio value is $10,000.",
    learnMoreUrl: "https://www.investopedia.com/terms/p/portfolio.asp"
  },
  
  moic: {
    term: "MOIC (Multiple on Invested Capital)",
    category: "RETURN",
    definition: "The ratio of current value to the amount you originally invested. A 2.0x MOIC means your investment has doubled.",
    impact: "MOIC shows total return regardless of time. Use it alongside IRR to understand both magnitude and speed of returns.",
    howToUse: "Target 2-3x for private equity. For public markets over long periods, 2x every 7-10 years is solid (7% CAGR).",
    typicalRanges: [
      { label: "< 1.5x", range: "Below Target", description: "Underperforming expectations" },
      { label: "1.5-2.5x", range: "On Track", description: "Meeting typical targets" },
      { label: "> 2.5x", range: "Strong", description: "Exceeding expectations" }
    ],
    example: "If you invested $100,000 and it's now worth $250,000, your MOIC is 2.5x - you've made 2.5 times your money.",
    learnMoreUrl: "https://www.investopedia.com/terms/m/multiplesapproach.asp"
  },
  
  irr: {
    term: "IRR (Internal Rate of Return)",
    category: "RETURN",
    definition: "The annualized return rate that accounts for the timing of cash flows. It tells you your effective yearly return.",
    impact: "IRR is crucial for comparing investments of different durations. A 50% return over 5 years (~8.5% IRR) is different from 50% in 1 year.",
    howToUse: "Compare IRR across investments to see which generates better annual returns. Consider alongside MOIC for full picture.",
    typicalRanges: [
      { label: "< 8%", range: "Below Market", description: "Underperforming stocks" },
      { label: "8-15%", range: "Good", description: "Solid long-term returns" },
      { label: "> 15%", range: "Excellent", description: "Outstanding performance" }
    ],
    example: "A 3x MOIC over 10 years = ~11.6% IRR, while the same 3x over 3 years = ~44% IRR. Timing matters!",
    learnMoreUrl: "https://www.investopedia.com/terms/i/irr.asp"
  },
  
  activeDeals: {
    term: "Active Deals",
    definition: "Investment opportunities currently in your pipeline that haven't been closed or passed on yet.",
    impact: "Managing deal flow is essential. Too few deals limits opportunities; too many can dilute focus and due diligence quality.",
    howToUse: "Keep a manageable pipeline. Quality over quantity—better to deeply evaluate fewer deals than superficially review many.",
    example: "If you're evaluating 10 potential investments and have passed on 3, you have 7 active deals in your pipeline."
  },

  standardDeviation: {
    term: "Standard Deviation",
    category: "RISK",
    definition: "A measure of how spread out returns are from the average. Higher standard deviation means more unpredictable performance - your returns could vary widely.",
    impact: "Use this to understand how 'wild' an investment might behave. A 15% standard deviation means returns typically fall within 15% of the average in a given year.",
    howToUse: "Match standard deviation to your comfort level. If a 15% swing would cause sleepless nights, stick to lower volatility options.",
    typicalRanges: [
      { label: "< 10%", range: "Low", description: "Stable, predictable" },
      { label: "10-20%", range: "Moderate", description: "Normal for balanced portfolios" },
      { label: "> 20%", range: "High", description: "Volatile, aggressive" }
    ],
    example: "If an investment averages 8% return with 12% standard deviation, most years you'd see returns between -4% and +20%.",
    learnMoreUrl: "https://www.investopedia.com/terms/s/standarddeviation.asp"
  },

  matchScore: {
    term: "Match Score",
    category: "EFFICIENCY",
    definition: "A percentage showing how well this portfolio fits your screening criteria. It combines all your filters into one easy-to-understand number.",
    impact: "Higher match scores mean the portfolio closely aligns with what you're looking for. Use this to quickly identify portfolios that meet your needs.",
    howToUse: "Sort by match score to see best fits first. But also look at individual metrics—a 90% match might miss on one critical factor.",
    example: "If you set max drawdown 20%, min CAGR 8%, and a portfolio has 15% drawdown and 10% CAGR, it might score 95% because it beats both criteria."
  }
};

// Helper to get term by key
export const getTerm = (key: string): FinancialTerm | undefined => {
  return financialTerms[key];
};

// Get all terms as array
export const getAllTerms = (): FinancialTerm[] => {
  return Object.values(financialTerms);
};
