export interface FinancialTerm {
  term: string;
  definition: string;
  impact: string;
  example?: string;
  learnMoreUrl?: string;
}

export const financialTerms: Record<string, FinancialTerm> = {
  sharpeRatio: {
    term: "Sharpe Ratio",
    definition: "A measure of how much extra return you get for the extra risk you take. Higher is better - it means you're being rewarded more for each unit of risk.",
    impact: "A higher Sharpe Ratio in your portfolio means you're getting better risk-adjusted returns. Aim for above 1.0 for good performance.",
    example: "If Portfolio A returns 12% with 10% volatility (Sharpe = 1.2) and Portfolio B returns 15% with 20% volatility (Sharpe = 0.75), Portfolio A is actually performing better on a risk-adjusted basis.",
    learnMoreUrl: "https://www.investopedia.com/terms/s/sharperatio.asp"
  },
  
  volatility: {
    term: "Volatility",
    definition: "How much your investment's value bounces up and down over time. High volatility means bigger swings, both up and down.",
    impact: "Higher volatility means your portfolio value will fluctuate more day-to-day. If you check your balance often, high volatility can be stressful.",
    example: "A stock with 20% volatility could reasonably move up or down 20% in a year. With $10,000 invested, that's a potential swing of $2,000 in either direction.",
    learnMoreUrl: "https://www.investopedia.com/terms/v/volatility.asp"
  },
  
  drawdown: {
    term: "Drawdown",
    definition: "The peak-to-trough decline during a specific period. It shows the worst-case scenario - how much you would have lost if you bought at the peak and sold at the bottom.",
    impact: "Understanding maximum drawdown helps you prepare mentally for losses. If a 30% drawdown would cause you to panic-sell, you may need a less risky portfolio.",
    example: "If your portfolio grew to $100,000 and then dropped to $70,000 before recovering, your maximum drawdown was 30%.",
    learnMoreUrl: "https://www.investopedia.com/terms/d/drawdown.asp"
  },
  
  correlation: {
    term: "Correlation",
    definition: "How closely two investments move together. A correlation of 1 means they move identically, -1 means they move opposite, and 0 means no relationship.",
    impact: "Holding assets with low or negative correlation helps smooth your returns. When one investment drops, another might rise, reducing your overall risk.",
    example: "Stocks and bonds often have low correlation. In 2008, when stocks fell 37%, bonds rose 5%, cushioning the blow for diversified portfolios.",
    learnMoreUrl: "https://www.investopedia.com/terms/c/correlation.asp"
  },
  
  diversification: {
    term: "Diversification",
    definition: "Spreading your investments across different assets so you're not putting all your eggs in one basket. The goal is to reduce risk without sacrificing returns.",
    impact: "A well-diversified portfolio protects you from any single investment tanking your wealth. It's often called 'the only free lunch in investing.'",
    example: "Instead of putting $100,000 in one stock, you might put $20,000 each in US stocks, international stocks, bonds, real estate, and commodities.",
    learnMoreUrl: "https://www.investopedia.com/terms/d/diversification.asp"
  },
  
  assetAllocation: {
    term: "Asset Allocation",
    definition: "How you divide your money among different asset types like stocks, bonds, and cash. This is the most important decision in building your portfolio.",
    impact: "Studies show asset allocation determines about 90% of your portfolio's performance over time. Getting this right matters more than picking individual stocks.",
    example: "A young investor might use 80% stocks and 20% bonds, while someone near retirement might flip to 40% stocks and 60% bonds.",
    learnMoreUrl: "https://www.investopedia.com/terms/a/assetallocation.asp"
  },
  
  rebalancing: {
    term: "Rebalancing",
    definition: "Periodically adjusting your portfolio back to your target allocation. As some investments grow faster than others, your balance shifts and needs resetting.",
    impact: "Rebalancing keeps your risk level consistent and forces you to 'sell high, buy low' by trimming winners and adding to laggards.",
    example: "If your target is 60/40 stocks/bonds, but stocks rally and you're now at 70/30, you'd sell some stocks and buy bonds to get back to 60/40.",
    learnMoreUrl: "https://www.investopedia.com/terms/r/rebalancing.asp"
  },
  
  riskAdjustedReturn: {
    term: "Risk-Adjusted Return",
    definition: "A measure of how much return you earned relative to the amount of risk you took. It helps compare investments with different risk levels fairly.",
    impact: "Chasing high returns without considering risk can lead to disaster. Risk-adjusted metrics help you find investments that reward you fairly for the risk.",
    example: "A fund returning 15% with huge swings might have worse risk-adjusted returns than a steady fund returning 10%.",
    learnMoreUrl: "https://www.investopedia.com/terms/r/riskadjustedreturn.asp"
  },
  
  beta: {
    term: "Beta",
    definition: "How much an investment moves relative to the overall market. A beta of 1 means it moves with the market, above 1 means more volatile, below 1 means less.",
    impact: "High-beta stocks amplify your gains in bull markets but also your losses in bear markets. Choose based on your risk tolerance.",
    example: "A stock with beta of 1.5 will typically rise 15% when the market rises 10%, but also fall 15% when the market falls 10%.",
    learnMoreUrl: "https://www.investopedia.com/terms/b/beta.asp"
  },
  
  alpha: {
    term: "Alpha",
    definition: "The extra return an investment generates above what you'd expect given its risk level. Positive alpha means the manager is adding value.",
    impact: "Finding investments with consistent positive alpha is the 'holy grail' of investing. Be skeptical of claims of high alpha - it's rare and hard to sustain.",
    example: "If a fund returns 12% when similar-risk investments returned 10%, it generated 2% alpha (extra return from skill, not just risk).",
    learnMoreUrl: "https://www.investopedia.com/terms/a/alpha.asp"
  },
  
  expenseRatio: {
    term: "Expense Ratio",
    definition: "The annual fee charged by a fund, expressed as a percentage of your investment. This comes out of your returns automatically.",
    impact: "Fees compound over time and can significantly reduce your wealth. A 1% difference in fees can cost you hundreds of thousands over a lifetime.",
    example: "On a $100,000 investment over 30 years, a 0.1% fee costs about $8,000 total, while a 1% fee costs about $70,000. That's $62,000 difference!",
    learnMoreUrl: "https://www.investopedia.com/terms/e/expenseratio.asp"
  },
  
  taxLossHarvesting: {
    term: "Tax-Loss Harvesting",
    definition: "Selling investments at a loss to offset gains and reduce your tax bill, then buying similar (but not identical) investments to maintain your portfolio strategy.",
    impact: "Strategic tax-loss harvesting can add 0.5-1% to your annual after-tax returns. The savings compound significantly over time.",
    example: "If you have $5,000 in gains and $3,000 in losses, you only pay taxes on $2,000. At a 20% tax rate, that saves you $600.",
    learnMoreUrl: "https://www.investopedia.com/terms/t/taxgainlossharvesting.asp"
  },
  
  dollarCostAveraging: {
    term: "Dollar-Cost Averaging",
    definition: "Investing a fixed amount regularly regardless of market conditions. You buy more shares when prices are low and fewer when prices are high.",
    impact: "DCA removes the stress of trying to time the market and can lower your average cost per share over time. It's ideal for regular contributions like 401(k)s.",
    example: "Investing $500/month, when shares cost $50 you buy 10 shares, when they cost $25 you buy 20 shares. Your average cost ends up lower than the average price.",
    learnMoreUrl: "https://www.investopedia.com/terms/d/dollarcostaveraging.asp"
  },
  
  compoundInterest: {
    term: "Compound Interest",
    definition: "Earning returns on your returns, not just your original investment. Your money grows exponentially over time as gains generate their own gains.",
    impact: "Compound interest is the most powerful force in wealth building. Starting early matters more than investing more - time is your greatest asset.",
    example: "$10,000 invested at 7% becomes $20,000 in 10 years, $40,000 in 20 years, and $80,000 in 30 years. The last decade adds $40,000!",
    learnMoreUrl: "https://www.investopedia.com/terms/c/compoundinterest.asp"
  },
  
  cagr: {
    term: "CAGR (Compound Annual Growth Rate)",
    definition: "The smoothed annual growth rate of an investment over a period, as if it grew at a steady rate each year. It's the best way to compare investment performance.",
    impact: "CAGR shows you the true annual return accounting for compounding. A 100% gain over 10 years is only 7.2% CAGR, not 10%.",
    example: "If your $10,000 grew to $25,000 over 10 years, your CAGR is 9.6% - meaning you averaged 9.6% growth annually, compounded.",
    learnMoreUrl: "https://www.investopedia.com/terms/c/cagr.asp"
  },
  
  marketCap: {
    term: "Market Cap",
    definition: "The total value of a company's outstanding shares. Calculated by multiplying share price by number of shares. It indicates company size.",
    impact: "Large-cap stocks (>$10B) tend to be more stable, while small-cap stocks (<$2B) are riskier but may offer higher growth potential.",
    example: "Apple with 16 billion shares at $175 each has a market cap of $2.8 trillion, making it one of the world's largest companies.",
    learnMoreUrl: "https://www.investopedia.com/terms/m/marketcapitalization.asp"
  },
  
  dividendYield: {
    term: "Dividend Yield",
    definition: "The annual dividend payment divided by the stock price, expressed as a percentage. It shows how much income you get relative to your investment.",
    impact: "High dividend yields provide steady income but might indicate a struggling company. Balance yield with growth potential.",
    example: "A stock paying $2 annual dividend at $50/share has a 4% yield. On a $10,000 investment, you'd receive $400/year in dividends.",
    learnMoreUrl: "https://www.investopedia.com/terms/d/dividendyield.asp"
  },
  
  pe_ratio: {
    term: "P/E Ratio",
    definition: "Price-to-Earnings ratio - how much investors pay for each dollar of company earnings. Lower P/E might mean undervalued, higher might mean overvalued or high growth expected.",
    impact: "P/E helps you understand if you're paying a fair price. Compare to industry averages and historical norms, not in isolation.",
    example: "A stock at $100 with $5 earnings per share has a P/E of 20. The S&P 500 average is around 15-25 historically.",
    learnMoreUrl: "https://www.investopedia.com/terms/p/price-earningsratio.asp"
  },
  
  sortinoRatio: {
    term: "Sortino Ratio",
    definition: "Similar to Sharpe Ratio, but only penalizes downside volatility. It recognizes that upside volatility (gains) shouldn't be treated as 'risk.'",
    impact: "Sortino gives a more realistic view of risk-adjusted returns since most investors only worry about losses, not gains.",
    example: "A fund with high upside volatility but low downside volatility will have a better Sortino than Sharpe ratio.",
    learnMoreUrl: "https://www.investopedia.com/terms/s/sortinoratio.asp"
  },
  
  maxDrawdown: {
    term: "Maximum Drawdown",
    definition: "The largest peak-to-trough decline in portfolio value over a specific time period. It measures the worst-case scenario you would have experienced.",
    impact: "This is arguably the most important risk metric. If you can't stomach the max drawdown, you need to reduce risk - regardless of returns.",
    example: "During 2008, the S&P 500's max drawdown was about 55%. If you had $100,000, it would have dropped to $45,000 at the worst point.",
    learnMoreUrl: "https://www.investopedia.com/terms/m/maximum-drawdown-mdd.asp"
  },
  
  portfolioValue: {
    term: "Portfolio Value",
    definition: "The total current market value of all investments in your portfolio. This is what your holdings would be worth if you sold everything today.",
    impact: "Tracking portfolio value shows your wealth growth. Focus on long-term trends rather than daily fluctuations to avoid emotional decisions.",
    example: "If you own 100 shares of a $50 stock and 200 shares of a $25 stock, your portfolio value is $10,000.",
    learnMoreUrl: "https://www.investopedia.com/terms/p/portfolio.asp"
  },
  
  moic: {
    term: "MOIC (Multiple on Invested Capital)",
    definition: "The ratio of current value to the amount you originally invested. A 2.0x MOIC means your investment has doubled.",
    impact: "MOIC shows total return regardless of time. Use it alongside IRR to understand both magnitude and speed of returns.",
    example: "If you invested $100,000 and it's now worth $250,000, your MOIC is 2.5x - you've made 2.5 times your money.",
    learnMoreUrl: "https://www.investopedia.com/terms/m/multiplesapproach.asp"
  },
  
  irr: {
    term: "IRR (Internal Rate of Return)",
    definition: "The annualized return rate that accounts for the timing of cash flows. It tells you your effective yearly return.",
    impact: "IRR is crucial for comparing investments of different durations. A 50% return over 5 years (~8.5% IRR) is different from 50% in 1 year.",
    example: "A 3x MOIC over 10 years = ~11.6% IRR, while the same 3x over 3 years = ~44% IRR. Timing matters!",
    learnMoreUrl: "https://www.investopedia.com/terms/i/irr.asp"
  },
  
  activeDeals: {
    term: "Active Deals",
    definition: "Investment opportunities currently in your pipeline that haven't been closed or passed on yet.",
    impact: "Managing deal flow is essential. Too few deals limits opportunities; too many can dilute focus and due diligence quality.",
    example: "If you're evaluating 10 potential investments and have passed on 3, you have 7 active deals in your pipeline."
  },
  
  totalReturn: {
    term: "Total Return",
    definition: "The complete gain or loss on an investment including price appreciation, dividends, and interest over a period.",
    impact: "Total return gives the full picture of performance. Focusing only on price gains can undervalue income-producing investments.",
    example: "A stock that rose 5% and paid 3% in dividends had a total return of 8%, not just 5%.",
    learnMoreUrl: "https://www.investopedia.com/terms/t/totalreturn.asp"
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
