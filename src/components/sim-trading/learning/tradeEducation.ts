/**
 * Educational content for sim trading alerts and journal entries.
 * Each topic maps to a concept that appears in pre-trade impact analysis
 * or portfolio journal entries, providing "learn more" depth.
 */

export interface EducationTopic {
  id: string;
  title: string;
  summary: string;
  explanation: string;
  realWorldExample: string;
  keyTakeaway: string;
  furtherReading?: string;
  relatedConcepts: string[];
}

export const EDUCATION_TOPICS: Record<string, EducationTopic> = {
  concentration_risk: {
    id: 'concentration_risk',
    title: 'Position Concentration & Diversification',
    summary: 'Why putting too much in one stock increases risk.',
    explanation:
      `Concentration risk occurs when a large portion of your portfolio is invested in a single asset. ` +
      `Institutional fund managers typically cap individual positions at 5–10% of total portfolio value. ` +
      `This isn't about avoiding big bets — it's about ensuring no single company's bad earnings report, ` +
      `lawsuit, or sector downturn can wipe out a significant portion of your wealth.\n\n` +
      `The math is straightforward: if a stock is 50% of your portfolio and drops 40%, your entire portfolio ` +
      `loses 20%. If that same stock were only 5% of your portfolio, the same 40% drop costs you just 2%.`,
    realWorldExample:
      `In 2022, Meta (Facebook) dropped ~65% from its highs. An investor with 30% of their portfolio in Meta ` +
      `would have lost ~19.5% of their total portfolio from that single position — potentially years of gains erased.`,
    keyTakeaway: 'Keep individual positions under 10% for a diversified portfolio. Only exceed this for truly high-conviction ideas with proper risk management.',
    relatedConcepts: ['hhi_index', 'diversification'],
  },

  risk_budget: {
    id: 'risk_budget',
    title: 'Risk Budget & Cash Deployment',
    summary: 'How much of your portfolio should be invested vs. held in cash.',
    explanation:
      `A risk budget defines the maximum percentage of your portfolio that should be deployed in risk assets ` +
      `(stocks, options, etc.) versus held in cash or equivalents. Professional fund managers maintain cash reserves ` +
      `for three reasons:\n\n` +
      `1. **Opportunity cost**: Cash lets you buy when others are forced to sell during market panics\n` +
      `2. **Margin of safety**: Cash cushions drawdowns and reduces portfolio volatility\n` +
      `3. **Rebalancing**: Cash enables systematic buying during corrections\n\n` +
      `A typical balanced portfolio might target 70–90% deployment, keeping 10–30% in cash. ` +
      `Aggressive growth strategies may push to 95%+, while preservation strategies might stay at 50–60%.`,
    realWorldExample:
      `Warren Buffett's Berkshire Hathaway famously held $157B in cash in early 2024 — about 25% of assets. ` +
      `This "dry powder" allowed him to deploy capital when others couldn't during previous downturns (2008, 2020).`,
    keyTakeaway: 'Set a deployment ceiling that matches your risk tolerance. Having 5-15% cash gives you flexibility to act on opportunities.',
    relatedConcepts: ['max_drawdown', 'preservation_goal'],
  },

  max_drawdown: {
    id: 'max_drawdown',
    title: 'Maximum Drawdown',
    summary: 'The worst peak-to-trough decline your portfolio experiences.',
    explanation:
      `Maximum drawdown (Max DD) measures the largest percentage drop from a portfolio's peak value to its lowest ` +
      `point before a new peak is reached. It's the single most important risk metric because it tells you the ` +
      `worst pain you'd experience.\n\n` +
      `Why it matters more than volatility:\n` +
      `- A 50% drawdown requires a 100% gain just to break even\n` +
      `- A 33% drawdown requires a 50% gain to recover\n` +
      `- A 20% drawdown requires a 25% gain to recover\n\n` +
      `The recovery math is asymmetric — losses hurt more than gains help. This is why professional ` +
      `risk managers obsess over drawdown limits. Setting a max drawdown constraint (e.g., 20%) forces ` +
      `you to size positions and diversify in ways that limit your worst-case scenario.`,
    realWorldExample:
      `During the 2008 financial crisis, the S&P 500 had a max drawdown of ~56%. An investor who started ` +
      `with $100,000 saw it drop to $44,000. It took until 2013 — over 5 years — to fully recover.`,
    keyTakeaway: 'Set a drawdown limit you can emotionally and financially survive. Most professionals target 15-25% max drawdown for moderate-risk portfolios.',
    relatedConcepts: ['risk_budget', 'hhi_index', 'portfolio_drawdown'],
  },

  portfolio_drawdown: {
    id: 'portfolio_drawdown',
    title: 'Portfolio-Level Drawdown Estimation',
    summary: 'How diversification and correlation affect your whole portfolio\'s downside risk.',
    explanation:
      `Portfolio drawdown estimation uses the Herfindahl-Hirschman Index (HHI) and correlation assumptions ` +
      `to estimate how much your entire portfolio could decline in a selloff.\n\n` +
      `**How it works:**\n` +
      `- **Worst case**: If all your positions are 100% correlated (they all drop together), your max drawdown ` +
      `equals your total investment percentage. Fully deployed = 100% potential drawdown.\n` +
      `- **Diversified case**: Realistically, stocks have ~0.5 average correlation. Diversification across ` +
      `uncorrelated assets reduces the portfolio-level drawdown significantly.\n` +
      `- **The formula**: Estimated DD ≈ Worst-case DD × √(HHI + (1-HHI) × avg_correlation)\n\n` +
      `A concentrated portfolio (1-2 stocks) gets almost no diversification benefit. ` +
      `A portfolio with 10+ uncorrelated positions can cut estimated drawdown by 30-50%.`,
    realWorldExample:
      `A portfolio of 5 tech stocks during the 2022 tech selloff behaved almost like a single stock ` +
      `because they were highly correlated (~0.8). But a portfolio mixing tech, healthcare, energy, and ` +
      `consumer staples saw much lower drawdowns because those sectors moved independently.`,
    keyTakeaway: 'Diversification only works when your positions aren\'t all correlated. Spreading across sectors and asset types is more effective than just owning more stocks.',
    relatedConcepts: ['hhi_index', 'concentration_risk', 'max_drawdown'],
  },

  hhi_index: {
    id: 'hhi_index',
    title: 'Herfindahl-Hirschman Index (HHI)',
    summary: 'A measure of portfolio concentration used by regulators and fund managers.',
    explanation:
      `The HHI is calculated by squaring each position's weight and summing them: HHI = Σ(w_i²). ` +
      `It ranges from near 0 (perfectly diversified) to 1 (single position).\n\n` +
      `**Interpreting HHI:**\n` +
      `- **< 0.10**: Well-diversified (10+ equal positions)\n` +
      `- **0.10 – 0.25**: Moderate concentration\n` +
      `- **0.25 – 0.50**: High concentration\n` +
      `- **> 0.50**: Very concentrated (dominated by 1-2 positions)\n\n` +
      `Originally designed by the U.S. Department of Justice to measure market concentration in antitrust cases, ` +
      `it's now widely used in portfolio management to quantify how "spread out" your bets are.`,
    realWorldExample:
      `An equal-weight portfolio of 10 stocks has HHI = 10 × (0.10²) = 0.10. ` +
      `But if one stock is 50% and nine others split the remaining 50% equally (~5.6% each), ` +
      `HHI = 0.50² + 9×(0.056²) = 0.25 + 0.028 = 0.278 — nearly 3x more concentrated.`,
    keyTakeaway: 'Lower HHI = better diversification. Aim for HHI under 0.15 for a well-diversified portfolio.',
    relatedConcepts: ['concentration_risk', 'portfolio_drawdown'],
  },

  diversification: {
    id: 'diversification',
    title: 'Diversification & Idiosyncratic Risk',
    summary: 'How adding more positions reduces company-specific risk.',
    explanation:
      `Every stock has two types of risk:\n` +
      `1. **Systematic risk** (market risk): Affects all stocks — recessions, interest rates, geopolitics. ` +
      `Can't be diversified away.\n` +
      `2. **Idiosyncratic risk** (company-specific): CEO scandal, product failure, lawsuit. ` +
      `CAN be diversified away by holding more positions.\n\n` +
      `Research shows that most idiosyncratic risk is eliminated with 20-30 positions. Beyond that, ` +
      `you're mostly left with market risk. However, the biggest reduction comes from going from ` +
      `1 to 10 positions — the first few additions matter most.\n\n` +
      `True diversification means positions that don't all move together. Five tech stocks ` +
      `is less diversified than owning tech + healthcare + energy + utilities + consumer staples.`,
    realWorldExample:
      `When Enron collapsed in 2001, employees who held 100% of their retirement in Enron stock lost everything. ` +
      `Investors who held Enron as 5% of a diversified portfolio lost just 5%.`,
    keyTakeaway: 'Diversify across at least 10-15 positions in different sectors. The goal is to eliminate company-specific risk while maintaining market exposure.',
    relatedConcepts: ['concentration_risk', 'hhi_index'],
  },

  preservation_goal: {
    id: 'preservation_goal',
    title: 'Capital Preservation Strategy',
    summary: 'An investment approach focused on not losing money.',
    explanation:
      `Capital preservation prioritizes protecting your principal over generating high returns. ` +
      `This strategy is appropriate for:\n` +
      `- Retirement funds you'll need soon\n` +
      `- Emergency reserves\n` +
      `- Risk-averse investors\n\n` +
      `**Key principles:**\n` +
      `- Smaller position sizes (2-5% per position)\n` +
      `- Higher cash allocation (30-50%)\n` +
      `- Lower drawdown tolerance (5-10%)\n` +
      `- Preference for stable, dividend-paying stocks\n` +
      `- Avoiding speculative instruments like options\n\n` +
      `The tradeoff: you likely underperform in bull markets, but you sleep better during crashes.`,
    realWorldExample:
      `During the 2020 COVID crash, a preservation portfolio holding 40% cash and 60% in defensive stocks ` +
      `might have dropped 12-15%, while the S&P 500 dropped 34%. The preservation portfolio also recovered ` +
      `faster because it had cash to deploy at the bottom.`,
    keyTakeaway: 'If your primary goal is not losing money, keep positions small, cash high, and avoid speculative instruments.',
    relatedConcepts: ['risk_budget', 'max_drawdown'],
  },

  income_goal: {
    id: 'income_goal',
    title: 'Income Generation Strategy',
    summary: 'Building a portfolio that produces regular cash flow.',
    explanation:
      `Income-focused investing aims to generate consistent cash returns through:\n` +
      `- **Dividends**: Stocks that pay quarterly dividends (REITs, utilities, dividend aristocrats)\n` +
      `- **Covered calls**: Selling call options on stocks you own to collect premium\n` +
      `- **Cash-secured puts**: Selling put options to collect premium with cash backing\n\n` +
      `**What doesn't generate income:**\n` +
      `- Buying long calls (speculative, growth play)\n` +
      `- Growth stocks that don't pay dividends\n` +
      `- Highly volatile momentum stocks\n\n` +
      `A common metric is "yield on cost" — the annual income divided by what you paid for the position.`,
    realWorldExample:
      `A covered call strategy on a $100 stock might generate $3-5/month in premium (36-60% annualized). ` +
      `Combined with a 3% dividend yield, total income could reach 6-8% annually — significantly above bond yields.`,
    keyTakeaway: 'For income goals, focus on dividend stocks and options-selling strategies. Avoid buying speculative calls that don\'t produce cash flow.',
    relatedConcepts: ['options_risk', 'preservation_goal'],
  },

  options_risk: {
    id: 'options_risk',
    title: 'Options Risk in a Portfolio',
    summary: 'Understanding how options amplify risk and reward.',
    explanation:
      `Options are derivatives that give you the right (but not obligation) to buy or sell a stock ` +
      `at a specific price by a specific date.\n\n` +
      `**Key risks unique to options:**\n` +
      `- **Time decay (theta)**: Options lose value every day just from time passing\n` +
      `- **Total loss risk**: Unlike stocks, options can expire worthless — 100% loss of premium\n` +
      `- **Expiration pressure**: You have a deadline; stocks let you wait indefinitely\n` +
      `- **Complexity**: Greeks (delta, gamma, theta, vega) make behavior non-linear\n\n` +
      `**Position sizing for options:**\n` +
      `Because options can go to zero, most professionals limit options to 1-3% of portfolio per position ` +
      `and 5-10% total options exposure. In a preservation portfolio, options are generally inappropriate ` +
      `unless used for hedging (protective puts).`,
    realWorldExample:
      `A $5 call option on a $100 stock represents $500 of risk for control of 100 shares ($10,000 worth). ` +
      `If the stock moves up 10%, the option might double (+100%). But if the stock is flat at expiration, ` +
      `the option loses 100% of its value — $500 gone.`,
    keyTakeaway: 'Options amplify both gains and losses. Size them at 1-3% of portfolio max and understand that total loss is a real possibility.',
    relatedConcepts: ['concentration_risk', 'income_goal', 'preservation_goal'],
  },

  benchmark_tracking: {
    id: 'benchmark_tracking',
    title: 'Benchmark Tracking & Active Risk',
    summary: 'Measuring your performance against an index like SPY.',
    explanation:
      `When your goal is to beat a benchmark (like SPY or QQQ), every position you take creates ` +
      `"tracking error" — the deviation of your returns from the benchmark's returns.\n\n` +
      `**Active risk concepts:**\n` +
      `- **Overweight**: Holding more of a stock than the benchmark → you outperform if it beats the index\n` +
      `- **Underweight**: Holding less → you outperform if it lags the index\n` +
      `- **Active share**: What % of your portfolio differs from the benchmark (higher = more active bets)\n\n` +
      `Adding to an existing overweight position doubles down on that active bet. If you're right, ` +
      `you beat the benchmark more. If you're wrong, you underperform more. This is "active risk."`,
    realWorldExample:
      `If SPY has 7% in Apple and you hold 15% in Apple, you're 8% overweight. If Apple outperforms ` +
      `the S&P by 10%, your overweight contributes +0.8% excess return. But if Apple underperforms by 10%, ` +
      `you lose 0.8% relative to the benchmark.`,
    keyTakeaway: 'When trying to beat a benchmark, be intentional about your overweights. Each deviation from the index is an active bet that should have a thesis.',
    relatedConcepts: ['concentration_risk', 'diversification'],
  },

  cash_flexibility: {
    id: 'cash_flexibility',
    title: 'Cash as a Strategic Asset',
    summary: 'Why keeping cash isn\'t "doing nothing" — it\'s a deliberate allocation.',
    explanation:
      `Many investors view cash as a drag on returns. But professional fund managers treat cash as ` +
      `a strategic position with distinct advantages:\n\n` +
      `- **Optionality**: Cash gives you the option to buy anything at any time\n` +
      `- **Drawdown cushion**: Cash doesn't lose value in a crash, reducing portfolio-level drawdown\n` +
      `- **Psychological anchor**: Knowing you have reserves reduces panic selling\n\n` +
      `**The 5% rule**: Most professionals keep at least 5% in cash. Below that, you're forced to ` +
      `sell existing positions to fund new ideas — selling at possibly the wrong time.`,
    realWorldExample:
      `During the March 2020 crash, investors with 20% cash could buy high-quality stocks at 30-40% ` +
      `discounts. Those who were fully invested had to either watch the decline or sell at losses ` +
      `to raise cash — exactly the wrong move.`,
    keyTakeaway: 'Maintain at least 5% cash for flexibility. In uncertain markets, 10-20% cash can significantly reduce risk while preserving upside optionality.',
    relatedConcepts: ['risk_budget', 'max_drawdown'],
  },

  win_rate: {
    id: 'win_rate',
    title: 'Win Rate & Expectancy',
    summary: 'Why winning percentage alone doesn\'t determine profitability.',
    explanation:
      `Win rate is the percentage of trades that are profitable. But a high win rate doesn't guarantee ` +
      `positive returns — what matters is **expectancy**: the average amount you win vs. lose.\n\n` +
      `**Expectancy formula:**\n` +
      `E = (Win% × Avg Win) - (Loss% × Avg Loss)\n\n` +
      `You can be profitable with just a 30% win rate if your winners are 4x your losers:\n` +
      `E = (30% × $400) - (70% × $100) = $120 - $70 = +$50 per trade\n\n` +
      `Conversely, a 70% win rate loses money if your losers are 4x your winners:\n` +
      `E = (70% × $100) - (30% × $400) = $70 - $120 = -$50 per trade`,
    realWorldExample:
      `Renaissance Technologies, one of the most successful hedge funds ever, reportedly wins only about ` +
      `50.75% of trades. But their edge comes from making millions of trades with a tiny positive expectancy ` +
      `that compounds over time.`,
    keyTakeaway: 'Focus on expectancy (avg win × win rate - avg loss × loss rate), not just win rate. A few big winners can outweigh many small losses.',
    relatedConcepts: ['max_drawdown', 'benchmark_tracking'],
  },
};

/**
 * Maps alert categories/keywords to relevant education topics
 */
export function getRelevantTopics(alertTitle: string, alertDetail: string, alertType: string): string[] {
  const text = `${alertTitle} ${alertDetail}`.toLowerCase();
  const topics: string[] = [];

  if (text.includes('concentration') || text.includes('% of portfolio') || text.includes('position size'))
    topics.push('concentration_risk');
  if (text.includes('risk budget') || text.includes('deployed'))
    topics.push('risk_budget');
  if (text.includes('drawdown'))
    topics.push(text.includes('portfolio') ? 'portfolio_drawdown' : 'max_drawdown');
  if (text.includes('diversif') || text.includes('new position') || text.includes('idiosyncratic'))
    topics.push('diversification');
  if (text.includes('hhi') || text.includes('herfindahl'))
    topics.push('hhi_index');
  if (text.includes('preservation'))
    topics.push('preservation_goal');
  if (text.includes('income') || text.includes('covered call') || text.includes('cash-secured'))
    topics.push('income_goal');
  if (text.includes('option') || text.includes('premium') || text.includes('expiration'))
    topics.push('options_risk');
  if (text.includes('benchmark') || text.includes('active risk') || text.includes('tracking'))
    topics.push('benchmark_tracking');
  if (text.includes('cash') && (text.includes('flexibility') || text.includes('below 5%')))
    topics.push('cash_flexibility');
  if (text.includes('win rate') || text.includes('win:'))
    topics.push('win_rate');

  // Deduplicate
  return [...new Set(topics)];
}

/**
 * Gets education topics for journal entry sections
 */
export function getJournalTopics(content: string): string[] {
  const text = content.toLowerCase();
  const topics: string[] = [];

  if (text.includes('performance') || text.includes('return'))
    topics.push('win_rate');
  if (text.includes('drawdown') || text.includes('breached'))
    topics.push('max_drawdown');
  if (text.includes('concentration') || text.includes('exceed'))
    topics.push('concentration_risk');
  if (text.includes('allocation') || text.includes('risk budget'))
    topics.push('risk_budget');
  if (text.includes('backtest'))
    topics.push('benchmark_tracking');
  if (text.includes('option'))
    topics.push('options_risk');
  if (text.includes('cash'))
    topics.push('cash_flexibility');

  return [...new Set(topics)];
}
