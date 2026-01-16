/**
 * Comprehensive Glossary Registry
 * 
 * Single source of truth for all definitions across:
 * - Quant Lab studies & methodologies
 * - Strategy Explorer investor types & concepts
 * - Market Intel economic data & indicators
 * - Portfolio metrics & risk measures
 */

export interface GlossaryEntry {
  term: string;
  category: string;
  subcategory?: string;
  definition: string;
  formula?: string;
  interpretation?: string;
  example?: string;
  relatedTerms?: string[];
}

// =============================================================================
// QUANT LAB: STUDY METHODOLOGIES
// =============================================================================

export const QUANT_LAB_STUDIES: GlossaryEntry[] = [
  // Basic Statistics
  {
    term: 'Close > Open Analysis',
    category: 'Quant Lab',
    subcategory: 'Basic Statistics',
    definition: 'Measures the percentage of days where the closing price exceeds the opening price, indicating intraday directional bias.',
    formula: 'Percentage = (Days where Close > Open) / Total Days × 100',
    interpretation: 'A value above 50% suggests the asset tends to gain during trading hours.',
    example: 'If AAPL closes higher than it opens on 55% of days, it has a bullish intraday bias.',
  },
  {
    term: 'Close > Prior Analysis',
    category: 'Quant Lab',
    subcategory: 'Basic Statistics',
    definition: 'Measures the frequency of positive daily returns by comparing each close to the prior day\'s close.',
    formula: 'Percentage = (Days where Closeₜ > Closeₜ₋₁) / Total Days × 100',
    interpretation: 'A value significantly above 50% indicates bullish momentum.',
    example: 'A stock closing higher than yesterday 53% of the time suggests slight upward drift.',
  },
  {
    term: 'Return Distribution',
    category: 'Quant Lab',
    subcategory: 'Basic Statistics',
    definition: 'Statistical analysis of daily returns including mean, standard deviation, percentiles, and histogram shape.',
    formula: 'Return = (Closeₜ - Closeₜ₋₁) / Closeₜ₋₁ × 100\nMean = Σ(Returns) / n\nStdDev = √(Σ(Return - Mean)² / n)',
    interpretation: 'Skewness measures asymmetry; kurtosis measures tail risk (fat tails = more extreme moves).',
    relatedTerms: ['Skewness', 'Kurtosis', 'Standard Deviation'],
  },
  {
    term: 'Win/Loss Streaks',
    category: 'Quant Lab',
    subcategory: 'Basic Statistics',
    definition: 'Analysis of consecutive winning and losing days, measuring momentum persistence.',
    formula: 'Streak = consecutive days in same direction\nMax Streak = max(all streaks)\nAvg Streak = Σ(streak lengths) / count',
    interpretation: 'Long winning streaks may indicate trend persistence; long losing streaks may signal capitulation.',
    example: 'A stock with average winning streak of 3.5 days shows moderate momentum.',
  },
  
  // Seasonality
  {
    term: 'Day of Week Returns',
    category: 'Quant Lab',
    subcategory: 'Seasonality',
    definition: 'Analysis of which weekdays historically perform best for a given asset.',
    formula: 'Avg Return(day) = Σ(returns on day) / count\nHit Rate = Positive days / Total days × 100',
    interpretation: 'Some assets exhibit day-of-week effects. Fridays often show positive bias due to position unwinding.',
    example: 'Monday Effect: Some stocks historically underperform on Mondays.',
  },
  {
    term: 'Monthly Seasonality',
    category: 'Quant Lab',
    subcategory: 'Seasonality',
    definition: 'Analysis of which calendar months historically perform best.',
    formula: 'Monthly Return = (Close_end - Close_start) / Close_start × 100',
    interpretation: 'Patterns like "Sell in May" and "Santa Rally" (December) are well-known seasonality effects.',
    example: 'January Effect: Small caps historically outperform in January.',
    relatedTerms: ['Sell in May', 'Santa Rally', 'January Effect'],
  },
  
  // Technical Analysis
  {
    term: 'Moving Average Analysis',
    category: 'Quant Lab',
    subcategory: 'Technical Analysis',
    definition: 'Analysis of Simple Moving Averages (SMA) and Exponential Moving Averages (EMA), including crossover signals.',
    formula: 'SMA = Σ(Close, n) / n\nEMA = Closeₜ × k + EMAₜ₋₁ × (1-k), k = 2/(n+1)',
    interpretation: 'Golden Cross (50 > 200) is bullish; Death Cross (50 < 200) is bearish. Distance from MA indicates overbought/oversold.',
    relatedTerms: ['Golden Cross', 'Death Cross', 'SMA', 'EMA'],
  },
  {
    term: 'RSI Analysis',
    category: 'Quant Lab',
    subcategory: 'Technical Analysis',
    definition: 'Relative Strength Index analysis measuring momentum through overbought/oversold conditions.',
    formula: 'RS = Avg Gain / Avg Loss\nRSI = 100 - (100 / (1 + RS))',
    interpretation: 'RSI > 70 is overbought; RSI < 30 is oversold. Shows how often these conditions occur and what follows.',
    example: 'When RSI drops below 30, historical data shows 65% probability of positive return over next 5 days.',
    relatedTerms: ['Overbought', 'Oversold', 'Momentum'],
  },
  {
    term: 'Trend Strength',
    category: 'Quant Lab',
    subcategory: 'Technical Analysis',
    definition: 'Multi-factor trend scoring combining price position relative to moving averages and MA alignment.',
    formula: 'Score = Points above SMA20 + SMA50 + SMA200 + (SMA20 > SMA50) + (SMA50 > SMA200)',
    interpretation: 'Higher score = stronger uptrend. Score of 5 = maximum bullish alignment.',
    example: 'Score of 4: Price above all MAs, 50 > 200, but 20 < 50 (slight concern).',
  },
  
  // Volatility & Risk
  {
    term: 'Volatility Analysis',
    category: 'Quant Lab',
    subcategory: 'Volatility & Risk',
    definition: 'Analysis of price movement using Average True Range (ATR), daily range, and volatility clustering.',
    formula: 'ATR = EMA(max(H-L, |H-C₋₁|, |L-C₋₁|), 14)\nAnnualized Vol = Daily StdDev × √252',
    interpretation: 'ATR measures average price movement. Volatility clustering means high-vol days tend to follow high-vol days.',
    relatedTerms: ['ATR', 'Volatility Clustering', 'GARCH'],
  },
  {
    term: 'Drawdown Analysis',
    category: 'Quant Lab',
    subcategory: 'Volatility & Risk',
    definition: 'Analysis of peak-to-trough declines and recovery times.',
    formula: 'Drawdown = (Peak - Current) / Peak × 100\nMax DD = max(all drawdowns)',
    interpretation: 'Shows worst historical declines and how long it took to recover to new highs.',
    example: 'Max drawdown of 35% with 18-month recovery means you lost 35% and waited 1.5 years to break even.',
    relatedTerms: ['Maximum Drawdown', 'Recovery Time', 'Underwater Period'],
  },
  {
    term: 'Mean Reversion',
    category: 'Quant Lab',
    subcategory: 'Volatility & Risk',
    definition: 'Analysis of whether prices tend to revert to the mean after extreme moves.',
    formula: 'Autocorrelation = Σ((Rₜ - μ)(Rₜ₋₁ - μ)) / (n × σ²)',
    interpretation: 'Negative autocorrelation suggests mean reversion (reversals); positive suggests momentum (continuation).',
    example: 'Autocorrelation of -0.15 suggests slight mean reversion tendency.',
    relatedTerms: ['Autocorrelation', 'Momentum', 'Reversal'],
  },
  
  // Price Patterns
  {
    term: 'Gap Analysis',
    category: 'Quant Lab',
    subcategory: 'Price Patterns',
    definition: 'Analysis of overnight price gaps and their fill rates.',
    formula: 'Gap % = (Openₜ - Closeₜ₋₁) / Closeₜ₋₁ × 100\nFill Rate = Gaps that filled / Total gaps',
    interpretation: 'Gap fills occur when price retraces to the prior close. Unfilled gaps often indicate strong momentum.',
    example: 'If 70% of gaps fill within the same day, gaps are unreliable as directional signals.',
    relatedTerms: ['Gap Fill', 'Gap and Go', 'Overnight Risk'],
  },
  {
    term: 'Range Analysis',
    category: 'Quant Lab',
    subcategory: 'Price Patterns',
    definition: 'Analysis of inside days, outside days, and doji patterns based on daily ranges.',
    formula: 'Range % = (High - Low) / Close × 100\nBody % = |Close - Open| / Range × 100',
    interpretation: 'Inside days (range within prior range) often precede breakouts. Doji (small body) indicates indecision.',
    relatedTerms: ['Inside Day', 'Outside Day', 'Doji', 'Narrow Range'],
  },
  {
    term: 'New Highs/Lows Analysis',
    category: 'Quant Lab',
    subcategory: 'Price Patterns',
    definition: 'Analysis of 20-day and 52-week high/low breakouts and their follow-through.',
    formula: '20-Day High = Close > max(High, 20 days)\nDistance from High = (Current - 52W High) / 52W High × 100',
    interpretation: 'New highs often continue (momentum effect). Distance from 52-week high shows how extended or beaten-down a stock is.',
    example: 'Stocks making new 52-week highs have historically outperformed the next 6 months.',
  },
  {
    term: 'Close vs Open Analysis',
    category: 'Quant Lab',
    subcategory: 'Price Patterns',
    definition: 'Analyzes where the price closes relative to the daily range and open, measuring buying/selling pressure.',
    formula: 'Close Position = (Close - Low) / (High - Low) × 100\nGreen Day = Close > Open\nDoji = Body % < Threshold',
    interpretation: 'Closes near highs suggest buying pressure; closes near lows suggest selling pressure. Measures follow-through after patterns.',
    example: 'Closing in top 20% of range after a strong green day shows 62% chance of positive next day.',
    relatedTerms: ['Buying Pressure', 'Selling Pressure', 'Doji'],
  },
  
  // Volume Analysis
  {
    term: 'Volume Profile',
    category: 'Quant Lab',
    subcategory: 'Volume Analysis',
    definition: 'Analysis of volume trends, accumulation vs distribution patterns.',
    formula: 'Volume Ratio = Current Vol / Avg Vol\nAccumulation = Up Day Vol > Down Day Vol',
    interpretation: 'Higher volume on up days suggests accumulation (buying); higher volume on down days suggests distribution (selling).',
    relatedTerms: ['Accumulation', 'Distribution', 'On-Balance Volume'],
  },
  
  // Projections
  {
    term: 'Price Targets',
    category: 'Quant Lab',
    subcategory: 'Projections',
    definition: 'Statistical price projections based on historical return distributions.',
    formula: 'Expected = Price × (1 + μ)^n\nBull = Price × (1 + μ + σ)^n\nBear = Price × (1 + μ - σ)^n',
    interpretation: 'Not predictions, but probability-based scenarios. Shows range of reasonable outcomes.',
    example: 'Base case: $150, Bull (+1σ): $180, Bear (-1σ): $125 over 1 year.',
  },
];

// =============================================================================
// ECONOMIC INDICATORS & MARKET DATA
// =============================================================================

export const ECONOMIC_INDICATORS: GlossaryEntry[] = [
  {
    term: 'Fed Funds Rate',
    category: 'Economic Indicators',
    subcategory: 'Interest Rates',
    definition: 'The interest rate at which banks lend reserve balances to other banks overnight. The Federal Reserve\'s primary monetary policy tool.',
    interpretation: 'Higher rates slow the economy and typically pressure stock valuations. Lower rates stimulate growth and asset prices.',
    example: 'When the Fed raises rates from 5.25% to 5.50%, borrowing costs increase across the economy.',
    relatedTerms: ['Federal Reserve', 'Monetary Policy', 'FOMC'],
  },
  {
    term: '10-Year Treasury Yield',
    category: 'Economic Indicators',
    subcategory: 'Interest Rates',
    definition: 'The return on 10-year U.S. government bonds. Benchmark for mortgage rates and corporate borrowing.',
    interpretation: 'Rising yields often pressure growth stocks (higher discount rate for future earnings). Falling yields typically support valuations.',
    example: 'A move from 4.0% to 4.5% in the 10Y can cause significant repricing in rate-sensitive sectors.',
    relatedTerms: ['Treasury Bonds', 'Yield Curve', 'Duration Risk'],
  },
  {
    term: '2-Year Treasury Yield',
    category: 'Economic Indicators',
    subcategory: 'Interest Rates',
    definition: 'The return on 2-year U.S. government bonds. Reflects near-term Fed policy expectations.',
    interpretation: 'More sensitive to Fed policy changes than the 10Y. Used to analyze yield curve inversions.',
    relatedTerms: ['Yield Curve Inversion', 'Fed Policy', 'Short-Term Rates'],
  },
  {
    term: 'Yield Curve',
    category: 'Economic Indicators',
    subcategory: 'Interest Rates',
    definition: 'The relationship between interest rates and maturities. Normal: long rates > short rates. Inverted: short rates > long rates.',
    interpretation: 'Inverted yield curve (2Y > 10Y) has historically preceded recessions by 12-24 months.',
    example: 'When 2Y yields 5% and 10Y yields 4.5%, the curve is inverted by 50 basis points.',
    relatedTerms: ['2Y/10Y Spread', 'Recession Indicator', 'Term Premium'],
  },
  {
    term: 'CPI (Consumer Price Index)',
    category: 'Economic Indicators',
    subcategory: 'Inflation',
    definition: 'Measures the average change in prices paid by consumers for goods and services. Primary inflation gauge.',
    interpretation: 'High CPI (>3%) may prompt Fed rate hikes. Low CPI (<2%) may allow rate cuts. Core CPI excludes volatile food/energy.',
    example: 'CPI rising from 3.0% to 3.5% YoY signals accelerating inflation.',
    relatedTerms: ['Inflation', 'Core CPI', 'PCE'],
  },
  {
    term: 'PCE (Personal Consumption Expenditures)',
    category: 'Economic Indicators',
    subcategory: 'Inflation',
    definition: 'The Fed\'s preferred inflation measure. Broader than CPI and adjusts for consumer substitution behavior.',
    interpretation: 'Fed targets 2% Core PCE. Above 2% = hawkish pressure. Below 2% = dovish flexibility.',
    relatedTerms: ['Core PCE', 'Inflation Target', 'Fed Policy'],
  },
  {
    term: 'Unemployment Rate',
    category: 'Economic Indicators',
    subcategory: 'Employment',
    definition: 'Percentage of the labor force that is jobless and actively seeking employment.',
    interpretation: 'Low unemployment (<4%) suggests tight labor market and potential wage inflation. Rising unemployment may signal recession.',
    example: 'Unemployment rising from 3.5% to 4.5% over 6 months often precedes economic slowdown.',
    relatedTerms: ['Nonfarm Payrolls', 'Labor Market', 'Wage Growth'],
  },
  {
    term: 'VIX (Volatility Index)',
    category: 'Economic Indicators',
    subcategory: 'Market Sentiment',
    definition: 'The "fear index" measuring expected 30-day volatility of the S&P 500 based on options prices.',
    interpretation: 'VIX < 15: Complacency. VIX 15-25: Normal. VIX 25-40: Elevated fear. VIX > 40: Panic.',
    example: 'VIX spiked from 12 to 65 during March 2020 COVID crash.',
    relatedTerms: ['Implied Volatility', 'Options Market', 'Fear Gauge'],
  },
  {
    term: 'GDP (Gross Domestic Product)',
    category: 'Economic Indicators',
    subcategory: 'Growth',
    definition: 'Total value of goods and services produced in a country. Primary measure of economic output.',
    interpretation: 'Positive GDP growth = expansion. Negative GDP for 2+ quarters = technical recession.',
    example: 'Q3 GDP of 2.1% annualized indicates moderate economic expansion.',
    relatedTerms: ['Economic Growth', 'Recession', 'GNP'],
  },
  {
    term: 'ISM Manufacturing PMI',
    category: 'Economic Indicators',
    subcategory: 'Business Activity',
    definition: 'Purchasing Managers\' Index measuring manufacturing sector health. Based on surveys of purchasing managers.',
    interpretation: 'Above 50 = expansion. Below 50 = contraction. Leading indicator of economic trends.',
    example: 'PMI of 48.5 suggests manufacturing contraction.',
    relatedTerms: ['PMI', 'Manufacturing', 'Services PMI'],
  },
];

// =============================================================================
// PORTFOLIO METRICS & RISK MEASURES
// =============================================================================

export const PORTFOLIO_METRICS: GlossaryEntry[] = [
  // Return Metrics
  {
    term: 'Total Return',
    category: 'Portfolio Metrics',
    subcategory: 'Returns',
    definition: 'The complete gain or loss on your investment over the entire period, including price changes and dividends.',
    formula: 'Total Return = (End Value - Start Value) / Start Value × 100',
    interpretation: 'Your actual bottom-line result. A 60% total return over 5 years = your money grew 60%.',
    example: 'Invested $10,000, now worth $16,000 = 60% total return.',
  },
  {
    term: 'CAGR (Compound Annual Growth Rate)',
    category: 'Portfolio Metrics',
    subcategory: 'Returns',
    definition: 'The smoothed annual growth rate accounting for compounding. The most accurate annual performance measure.',
    formula: 'CAGR = (End Value / Start Value)^(1/Years) - 1',
    interpretation: 'What you actually earned per year. A 100% gain over 10 years is only 7.2% CAGR, not 10%.',
    example: '$10K → $25K over 10 years: CAGR = (25/10)^(1/10) - 1 = 9.6%',
    relatedTerms: ['Annualized Return', 'Compounding'],
  },
  {
    term: 'Alpha',
    category: 'Portfolio Metrics',
    subcategory: 'Returns',
    definition: 'Extra return generated above what you\'d expect given the risk level. Measures manager skill.',
    formula: 'Alpha = Actual Return - Expected Return (from CAPM)',
    interpretation: 'Positive alpha = outperformance. Consistent alpha > 2% annually is rare and valuable.',
    example: 'Fund returns 12% when similar-risk investments returned 10% = 2% alpha.',
    relatedTerms: ['Jensen\'s Alpha', 'Active Management', 'Benchmark'],
  },
  
  // Risk Metrics
  {
    term: 'Volatility (Standard Deviation)',
    category: 'Portfolio Metrics',
    subcategory: 'Risk',
    definition: 'How much returns bounce up and down. Higher volatility = bigger swings both ways.',
    formula: 'Volatility = StdDev(Daily Returns) × √252',
    interpretation: '15% volatility means your portfolio might swing 15% up or down in a typical year.',
    example: '$100K with 20% volatility could reasonably range from $80K to $120K in a year.',
    relatedTerms: ['Standard Deviation', 'Risk', 'Variance'],
  },
  {
    term: 'Maximum Drawdown',
    category: 'Portfolio Metrics',
    subcategory: 'Risk',
    definition: 'The largest peak-to-trough decline in portfolio value. Your worst historical experience.',
    formula: 'Max DD = (Trough - Peak) / Peak × 100',
    interpretation: 'If you can\'t stomach this loss, you need a different portfolio. THE most important risk metric.',
    example: 'Peak $120K, dropped to $90K before recovering = 25% max drawdown.',
    relatedTerms: ['Drawdown', 'Recovery Time', 'Peak-to-Trough'],
  },
  {
    term: 'Beta',
    category: 'Portfolio Metrics',
    subcategory: 'Risk',
    definition: 'How much an investment moves relative to the overall market. Measures market sensitivity.',
    formula: 'Beta = Covariance(Asset, Market) / Variance(Market)',
    interpretation: 'Beta 1.0 = moves with market. Beta 1.5 = 50% more volatile than market. Beta 0.5 = half as volatile.',
    example: 'Beta 1.5 stock: Market drops 10%, stock drops ~15%.',
    relatedTerms: ['Systematic Risk', 'Market Risk', 'CAPM'],
  },
  {
    term: 'VaR (Value at Risk)',
    category: 'Portfolio Metrics',
    subcategory: 'Risk',
    definition: 'The worst expected loss at a given confidence level (typically 95% or 99%).',
    formula: 'VaR₉₅ = 5th Percentile of Daily Returns',
    interpretation: 'VaR 95% of 2% means: 95% of days, you won\'t lose more than 2%. 1 in 20 days could be worse.',
    example: 'VaR 95% = 1.8% on $100K portfolio = expect losses up to $1,800 on normal bad days.',
    relatedTerms: ['Risk Management', 'Tail Risk', 'Confidence Interval'],
  },
  {
    term: 'CVaR (Conditional VaR / Expected Shortfall)',
    category: 'Portfolio Metrics',
    subcategory: 'Risk',
    definition: 'Average loss on the really bad days (worst 5% or 1%). How bad it gets when VaR is breached.',
    formula: 'CVaR₉₅ = Mean(Worst 5% of Returns)',
    interpretation: 'VaR tells you the threshold, CVaR tells you the average pain when that threshold is exceeded.',
    example: 'Worst 5% of days average -2.3% each = CVaR₉₅ of 2.3%.',
    relatedTerms: ['Expected Shortfall', 'Tail Risk', 'VaR'],
  },
  
  // Risk-Adjusted Metrics
  {
    term: 'Sharpe Ratio',
    category: 'Portfolio Metrics',
    subcategory: 'Risk-Adjusted',
    definition: 'Extra return earned per unit of risk taken. The gold standard for risk-adjusted performance.',
    formula: 'Sharpe = (Return - Risk-Free Rate) / Volatility',
    interpretation: 'Sharpe > 1.0 = good. Sharpe > 2.0 = excellent. Higher = more efficiently rewarded for risk.',
    example: 'Return 12%, Risk-free 5%, Vol 14% → Sharpe = (12-5)/14 = 0.5',
    relatedTerms: ['Risk-Adjusted Return', 'Efficient Frontier'],
  },
  {
    term: 'Sortino Ratio',
    category: 'Portfolio Metrics',
    subcategory: 'Risk-Adjusted',
    definition: 'Like Sharpe but only penalizes downside volatility. Upside swings aren\'t treated as risk.',
    formula: 'Sortino = (Return - MAR) / Downside Deviation',
    interpretation: 'More realistic than Sharpe since investors don\'t mind upside volatility.',
    example: 'A fund with high upside volatility but low downside volatility has better Sortino than Sharpe.',
    relatedTerms: ['Downside Risk', 'Downside Deviation', 'Sharpe Ratio'],
  },
  {
    term: 'Calmar Ratio',
    category: 'Portfolio Metrics',
    subcategory: 'Risk-Adjusted',
    definition: 'Annual return divided by maximum drawdown. Reward vs. worst-case pain.',
    formula: 'Calmar = CAGR / Max Drawdown',
    interpretation: 'Calmar > 1.0 means annual returns exceed your worst-case loss. Directly answers: Is the reward worth the pain?',
    example: 'CAGR 12%, Max DD 20% → Calmar = 0.6',
    relatedTerms: ['Risk/Reward', 'Drawdown', 'Return/Risk'],
  },
  {
    term: 'Correlation',
    category: 'Portfolio Metrics',
    subcategory: 'Diversification',
    definition: 'How closely two investments move together. Ranges from -1 (opposite) to +1 (identical).',
    formula: 'Correlation = Covariance(A,B) / (StdDev(A) × StdDev(B))',
    interpretation: 'Low correlation (< 0.5) provides diversification benefits. 1.0 = no diversification benefit.',
    example: 'Stocks and bonds often have low correlation. In 2008, stocks fell 37%, bonds rose 5%.',
    relatedTerms: ['Diversification', 'Covariance', 'Portfolio Construction'],
  },
];

// =============================================================================
// INVESTOR TYPES & BEHAVIORAL CONCEPTS
// =============================================================================

export const INVESTOR_CONCEPTS: GlossaryEntry[] = [
  {
    term: 'Risk Tolerance',
    category: 'Investor Psychology',
    subcategory: 'Behavioral',
    definition: 'Your emotional and psychological ability to handle investment losses without panicking or making poor decisions.',
    interpretation: 'Separate from risk capacity. You may have money to lose but still panic at 20% drops.',
    example: 'If a 20% portfolio drop causes sleepless nights, you have lower risk tolerance regardless of wealth.',
  },
  {
    term: 'Risk Capacity',
    category: 'Investor Psychology',
    subcategory: 'Behavioral',
    definition: 'Your financial ability to absorb losses based on income, savings, time horizon, and obligations.',
    interpretation: 'A 25-year-old with stable income has higher risk capacity than a retiree on fixed income.',
    example: 'Someone with 30 years until retirement and no debt has high risk capacity.',
    relatedTerms: ['Risk Tolerance', 'Time Horizon', 'Financial Goals'],
  },
  {
    term: 'Time Horizon',
    category: 'Investor Psychology',
    subcategory: 'Planning',
    definition: 'How long until you need to access your invested money for a specific goal.',
    interpretation: 'Longer horizons can tolerate more volatility since you have time to recover from downturns.',
    example: 'Retirement in 30 years = long horizon (more risk OK). House down payment in 3 years = short horizon (less risk).',
  },
  {
    term: 'Asset Allocation',
    category: 'Investor Psychology',
    subcategory: 'Portfolio Construction',
    definition: 'How you divide money among different asset types like stocks, bonds, and alternatives.',
    interpretation: 'Determines ~90% of portfolio performance over time. More important than individual stock picks.',
    example: 'Young investor: 80% stocks, 20% bonds. Near retirement: 40% stocks, 60% bonds.',
    relatedTerms: ['Diversification', 'Rebalancing', 'Strategic Allocation'],
  },
  {
    term: 'Rebalancing',
    category: 'Investor Psychology',
    subcategory: 'Portfolio Construction',
    definition: 'Periodically adjusting your portfolio back to target allocation as markets move.',
    interpretation: 'Forces "sell high, buy low" by trimming winners and adding to laggards. Maintains risk level.',
    example: 'Target 60/40 stocks/bonds. Stocks rally to 70/30. Rebalance by selling stocks, buying bonds.',
    relatedTerms: ['Asset Allocation', 'Drift', 'Target Weights'],
  },
  {
    term: 'Dollar-Cost Averaging',
    category: 'Investor Psychology',
    subcategory: 'Strategy',
    definition: 'Investing a fixed amount regularly regardless of market conditions.',
    interpretation: 'Removes timing stress. Buy more shares when cheap, fewer when expensive. Lowers average cost.',
    example: '$500/month: When shares cost $50, buy 10. When $25, buy 20. Average cost < average price.',
    relatedTerms: ['Systematic Investing', 'Lump Sum', 'Timing Risk'],
  },
  {
    term: 'Compound Interest',
    category: 'Investor Psychology',
    subcategory: 'Wealth Building',
    definition: 'Earning returns on your returns. Creates exponential wealth growth over time.',
    interpretation: 'The most powerful force in investing. Starting early matters more than investing more.',
    example: '$10,000 at 7% → $20K in 10 years → $40K in 20 years → $80K in 30 years. Last decade adds $40K!',
    relatedTerms: ['Time Value of Money', 'Rule of 72', 'Exponential Growth'],
  },
];

// =============================================================================
// TECHNICAL ANALYSIS TERMS
// =============================================================================

export const TECHNICAL_TERMS: GlossaryEntry[] = [
  {
    term: 'SMA (Simple Moving Average)',
    category: 'Technical Analysis',
    subcategory: 'Trend Indicators',
    definition: 'Average of closing prices over a specified period. Common periods: 20, 50, 200 days.',
    formula: 'SMA = Σ(Close, n) / n',
    interpretation: 'Price above SMA = bullish. Price below = bearish. SMA slope indicates trend direction.',
    relatedTerms: ['EMA', 'Moving Average Crossover', 'Trend'],
  },
  {
    term: 'EMA (Exponential Moving Average)',
    category: 'Technical Analysis',
    subcategory: 'Trend Indicators',
    definition: 'Moving average that gives more weight to recent prices, making it more responsive.',
    formula: 'EMA = Closeₜ × k + EMAₜ₋₁ × (1-k), where k = 2/(n+1)',
    interpretation: 'Reacts faster than SMA to price changes. Better for short-term trading signals.',
    relatedTerms: ['SMA', 'MACD', 'Exponential Smoothing'],
  },
  {
    term: 'Golden Cross',
    category: 'Technical Analysis',
    subcategory: 'Trend Signals',
    definition: 'When a short-term moving average (e.g., 50-day) crosses above a long-term average (e.g., 200-day).',
    interpretation: 'Bullish signal suggesting potential uptrend. More reliable when confirmed by volume.',
    example: '50-day SMA crossing above 200-day SMA on increased volume = strong bullish signal.',
    relatedTerms: ['Death Cross', 'Moving Average Crossover', 'Bull Market'],
  },
  {
    term: 'Death Cross',
    category: 'Technical Analysis',
    subcategory: 'Trend Signals',
    definition: 'When a short-term moving average crosses below a long-term average.',
    interpretation: 'Bearish signal suggesting potential downtrend. Has historically preceded major declines.',
    example: '50-day SMA crossing below 200-day SMA = Death Cross, potential bear market ahead.',
    relatedTerms: ['Golden Cross', 'Bear Market', 'Trend Reversal'],
  },
  {
    term: 'RSI (Relative Strength Index)',
    category: 'Technical Analysis',
    subcategory: 'Momentum Indicators',
    definition: 'Momentum oscillator measuring speed and magnitude of price movements. Ranges from 0 to 100.',
    formula: 'RSI = 100 - (100 / (1 + RS)), where RS = Avg Gain / Avg Loss',
    interpretation: 'RSI > 70 = overbought. RSI < 30 = oversold. Divergences signal potential reversals.',
    relatedTerms: ['Overbought', 'Oversold', 'Momentum', 'Divergence'],
  },
  {
    term: 'MACD (Moving Average Convergence Divergence)',
    category: 'Technical Analysis',
    subcategory: 'Momentum Indicators',
    definition: 'Trend-following momentum indicator showing relationship between two EMAs.',
    formula: 'MACD Line = 12-day EMA - 26-day EMA\nSignal Line = 9-day EMA of MACD Line',
    interpretation: 'MACD crossing above signal line = bullish. Below = bearish. Histogram shows momentum.',
    relatedTerms: ['EMA', 'Momentum', 'Signal Line'],
  },
  {
    term: 'ATR (Average True Range)',
    category: 'Technical Analysis',
    subcategory: 'Volatility Indicators',
    definition: 'Average of true ranges over a period, measuring volatility.',
    formula: 'ATR = EMA(max(H-L, |H-C₋₁|, |L-C₋₁|), 14)',
    interpretation: 'Higher ATR = more volatile. Used for position sizing and stop-loss placement.',
    example: 'ATR of $2 on a $50 stock = 4% average daily range. Set stops 2× ATR away.',
    relatedTerms: ['Volatility', 'True Range', 'Position Sizing'],
  },
  {
    term: 'Bollinger Bands',
    category: 'Technical Analysis',
    subcategory: 'Volatility Indicators',
    definition: 'Volatility bands placed above and below a moving average, typically 2 standard deviations.',
    formula: 'Upper Band = SMA + 2σ\nLower Band = SMA - 2σ',
    interpretation: 'Price touching upper band may be overbought. Lower band may be oversold. Band width shows volatility.',
    relatedTerms: ['Standard Deviation', 'Mean Reversion', 'Volatility Squeeze'],
  },
  {
    term: 'Support',
    category: 'Technical Analysis',
    subcategory: 'Price Levels',
    definition: 'Price level where buying interest is strong enough to prevent further decline.',
    interpretation: 'Prices tend to bounce from support. Breaking support is bearish.',
    example: 'Stock bounced off $45 three times = strong support at $45.',
    relatedTerms: ['Resistance', 'Breakout', 'Breakdown'],
  },
  {
    term: 'Resistance',
    category: 'Technical Analysis',
    subcategory: 'Price Levels',
    definition: 'Price level where selling pressure is strong enough to prevent further rise.',
    interpretation: 'Prices tend to stall at resistance. Breaking resistance is bullish.',
    example: 'Stock failed to break above $60 multiple times = resistance at $60.',
    relatedTerms: ['Support', 'Breakout', 'Ceiling'],
  },
  {
    term: 'Doji',
    category: 'Technical Analysis',
    subcategory: 'Candlestick Patterns',
    definition: 'Candlestick where open and close are nearly equal, creating a cross shape.',
    interpretation: 'Indicates indecision between buyers and sellers. Often precedes reversals.',
    example: 'Doji after a strong uptrend may signal exhaustion and potential reversal.',
    relatedTerms: ['Candlestick', 'Reversal Pattern', 'Indecision'],
  },
];

// =============================================================================
// ASSET CLASSES
// =============================================================================

export const ASSET_CLASSES: GlossaryEntry[] = [
  {
    term: 'Equities (Stocks)',
    category: 'Asset Classes',
    subcategory: 'Public Markets',
    definition: 'Ownership shares in publicly traded companies. Represent claim on company earnings and assets.',
    interpretation: 'Highest long-term returns but also highest volatility. Best for long horizons.',
    example: 'S&P 500 has returned ~10% annually over long periods, but with 15-20% volatility.',
    relatedTerms: ['Dividends', 'Capital Gains', 'Market Cap'],
  },
  {
    term: 'Fixed Income (Bonds)',
    category: 'Asset Classes',
    subcategory: 'Public Markets',
    definition: 'Debt securities that pay periodic interest and return principal at maturity.',
    interpretation: 'Lower returns than stocks but more stable. Provide income and diversification.',
    example: '10-year Treasury bond paying 4.5% coupon provides steady income with low default risk.',
    relatedTerms: ['Yield', 'Duration', 'Credit Risk', 'Treasuries'],
  },
  {
    term: 'Alternatives',
    category: 'Asset Classes',
    subcategory: 'Alternative Investments',
    definition: 'Non-traditional investments including hedge funds, private equity, real estate, commodities.',
    interpretation: 'Often lower correlation to stocks/bonds. May offer diversification and unique return sources.',
    example: 'Real estate, private equity, hedge funds, commodities, infrastructure.',
    relatedTerms: ['Private Equity', 'Hedge Funds', 'Real Assets'],
  },
  {
    term: 'Commodities',
    category: 'Asset Classes',
    subcategory: 'Real Assets',
    definition: 'Physical goods like gold, oil, agricultural products traded on exchanges.',
    interpretation: 'Hedge against inflation. Often uncorrelated with stocks. Volatile and no income.',
    example: 'Gold as inflation hedge, oil as economic indicator.',
    relatedTerms: ['Gold', 'Oil', 'Inflation Hedge', 'Futures'],
  },
  {
    term: 'Real Estate',
    category: 'Asset Classes',
    subcategory: 'Real Assets',
    definition: 'Physical property including residential, commercial, and industrial real estate.',
    interpretation: 'Provides income (rent) and potential appreciation. Illiquid but inflation-resistant.',
    example: 'REITs offer liquid exposure to real estate with 4-6% dividend yields.',
    relatedTerms: ['REITs', 'Commercial Property', 'Rental Income'],
  },
  {
    term: 'Cash & Equivalents',
    category: 'Asset Classes',
    subcategory: 'Liquid Assets',
    definition: 'Money market funds, T-bills, savings accounts. Highest liquidity, lowest return.',
    interpretation: 'Safety buffer for emergencies and opportunities. Loses purchasing power to inflation.',
    example: 'Money market yielding 5% in high-rate environment. 0% in low-rate environment.',
    relatedTerms: ['Liquidity', 'Emergency Fund', 'Money Market'],
  },
];

// =============================================================================
// COMBINED GLOSSARY EXPORT
// =============================================================================

export const COMPREHENSIVE_GLOSSARY: GlossaryEntry[] = [
  ...QUANT_LAB_STUDIES,
  ...ECONOMIC_INDICATORS,
  ...PORTFOLIO_METRICS,
  ...INVESTOR_CONCEPTS,
  ...TECHNICAL_TERMS,
  ...ASSET_CLASSES,
];

// Get all unique categories
export const GLOSSARY_CATEGORIES = [
  'Quant Lab',
  'Economic Indicators',
  'Portfolio Metrics',
  'Investor Psychology',
  'Technical Analysis',
  'Asset Classes',
];

// Search function
export function searchGlossary(query: string): GlossaryEntry[] {
  const lowerQuery = query.toLowerCase();
  return COMPREHENSIVE_GLOSSARY.filter(entry => 
    entry.term.toLowerCase().includes(lowerQuery) ||
    entry.definition.toLowerCase().includes(lowerQuery) ||
    entry.category.toLowerCase().includes(lowerQuery) ||
    (entry.subcategory?.toLowerCase().includes(lowerQuery)) ||
    (entry.relatedTerms?.some(t => t.toLowerCase().includes(lowerQuery)))
  );
}

// Get entries by category
export function getGlossaryByCategory(category: string): GlossaryEntry[] {
  return COMPREHENSIVE_GLOSSARY.filter(entry => entry.category === category);
}

// Get entry by term
export function getGlossaryEntry(term: string): GlossaryEntry | undefined {
  return COMPREHENSIVE_GLOSSARY.find(entry => 
    entry.term.toLowerCase() === term.toLowerCase()
  );
}
