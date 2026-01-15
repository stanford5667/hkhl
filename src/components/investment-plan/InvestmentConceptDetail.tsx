/**
 * Investment Concept Detail Modal
 * Market Intel-style sheet for investment terms/concepts with definitions,
 * educational content, and eventually videos
 */

import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  BookOpen,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  BarChart3,
  Play,
  ArrowRight,
  DollarSign,
  Clock,
  Target,
  Shield,
  LineChart,
  Percent,
  Scale,
  Info,
  Zap,
  Globe,
  Building2,
  Coins,
  PiggyBank,
  TrendingDown,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ConceptItem {
  id: string;
  name: string;
  category: 'metric' | 'allocation' | 'risk' | 'strategy' | 'term';
  value?: string | number;
  color?: string;
}

interface InvestmentConceptDetailProps {
  concept: ConceptItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Comprehensive educational content for investment concepts
const CONCEPT_EXPLANATIONS: Record<string, {
  description: string;
  whyItMatters: string;
  howToUse: string;
  ranges?: { label: string; range: string; meaning: string }[];
  relatedConcepts?: string[];
  benchmarks?: { name: string; value: string; description: string }[];
}> = {
  // ═══════════════════════════════════════════════════════════════════════════════
  // METRICS & PERFORMANCE
  // ═══════════════════════════════════════════════════════════════════════════════
  'expected-return': {
    description: 'The expected return is the annualized percentage gain anticipated from a portfolio based on asset allocation and historical performance of similar portfolios.',
    whyItMatters: 'This helps illustrate whether a portfolio allocation may be positioned to meet certain financial goals. A mismatch between expected returns and goals may require adjusting timeline or risk tolerance.',
    howToUse: 'Compare your expected return to your required return (what you need to reach your goal). If there\'s a gap, consider adjusting allocation or extending your timeline.',
    ranges: [
      { label: 'Conservative', range: '4-6%', meaning: 'Lower risk, preserves capital, may not outpace inflation significantly' },
      { label: 'Moderate', range: '6-8%', meaning: 'Balanced approach, reasonable growth with manageable volatility' },
      { label: 'Aggressive', range: '8-12%', meaning: 'Higher potential but more volatility, requires longer horizon' },
    ],
    relatedConcepts: ['Volatility', 'Sharpe Ratio', 'Time Horizon'],
    benchmarks: [
      { name: 'S&P 500 Historical', value: '10.5%', description: 'Long-term average annual return' },
      { name: '60/40 Portfolio', value: '7.5%', description: 'Classic balanced allocation' },
      { name: 'Treasury Bonds', value: '4.5%', description: 'Risk-free rate benchmark' },
    ],
  },
  'max-drawdown': {
    description: 'Maximum drawdown is the largest peak-to-trough decline in portfolio value during a specific period. It measures the worst-case scenario investors may experience historically.',
    whyItMatters: 'Understanding potential losses is crucial for emotional preparedness. If an investor cannot tolerate a 30% drop, an aggressive portfolio may not be suitable—even if higher returns are desired.',
    howToUse: 'Consider: "If a portfolio dropped this much, would panic selling occur?" If yes, reducing risk may be appropriate. Behavioral tolerance matters as much as financial capacity.',
    ranges: [
      { label: 'Conservative', range: '5-10%', meaning: 'Minimal volatility, mostly bonds and stable assets' },
      { label: 'Moderate', range: '10-20%', meaning: 'Balanced portfolio, expect this every 3-5 years' },
      { label: 'Aggressive', range: '20-40%', meaning: 'Heavy equity exposure, 2008-style drops possible' },
    ],
    relatedConcepts: ['Volatility', 'Risk Tolerance', 'Recovery Time'],
    benchmarks: [
      { name: '2008 Financial Crisis (S&P)', value: '-56.8%', description: 'Worst modern market crash' },
      { name: 'COVID Crash 2020', value: '-33.9%', description: 'Fast crash, fast recovery' },
      { name: 'Dot-Com Bubble', value: '-49.1%', description: 'Tech-heavy portfolios hit hardest' },
    ],
  },
  'volatility': {
    description: 'Volatility measures how much your portfolio\'s returns fluctuate over time. It\'s expressed as a percentage—the higher the number, the wider the swings in both directions.',
    whyItMatters: 'High volatility means a bumpier ride. While it can lead to higher returns, it also tests your resolve. Volatility is the "price of admission" for higher expected returns.',
    howToUse: 'Match volatility to your temperament and timeline. Young investors with decades ahead can handle 20%+ volatility. Those near retirement should aim for 10% or less.',
    ranges: [
      { label: 'Low', range: '5-10%', meaning: 'Stable, mostly fixed income, minimal daily swings' },
      { label: 'Medium', range: '10-15%', meaning: 'Balanced, typical diversified portfolio' },
      { label: 'High', range: '15-25%', meaning: 'Equity-heavy, expect 10%+ monthly swings' },
    ],
    relatedConcepts: ['Max Drawdown', 'Beta', 'Standard Deviation'],
    benchmarks: [
      { name: 'S&P 500', value: '15-20%', description: 'Typical large-cap equity volatility' },
      { name: 'Aggregate Bond Index', value: '4-6%', description: 'Investment-grade bonds' },
      { name: 'Small Cap Stocks', value: '20-25%', description: 'Higher risk, higher potential' },
    ],
  },
  'sharpe-ratio': {
    description: 'The Sharpe ratio measures risk-adjusted return—how much excess return you get per unit of risk taken. It\'s calculated as (Portfolio Return - Risk-Free Rate) / Portfolio Volatility.',
    whyItMatters: 'Two portfolios might have the same return, but if one took twice the risk, it\'s actually worse. Sharpe ratio helps you compare apples to apples.',
    howToUse: 'Aim for a Sharpe ratio of 0.5 or higher. Above 1.0 is excellent. Below 0.3 suggests you\'re taking too much risk for your returns.',
    ranges: [
      { label: 'Poor', range: '< 0.3', meaning: 'Returns don\'t justify the risk taken' },
      { label: 'Acceptable', range: '0.3-0.7', meaning: 'Reasonable risk-return tradeoff' },
      { label: 'Good', range: '0.7-1.0', meaning: 'Above-average efficiency' },
      { label: 'Excellent', range: '> 1.0', meaning: 'Exceptional risk-adjusted returns' },
    ],
    relatedConcepts: ['Expected Return', 'Volatility', 'Sortino Ratio'],
    benchmarks: [
      { name: 'S&P 500 Long-Term', value: '0.4-0.5', description: 'Historical average' },
      { name: 'Top Hedge Funds', value: '1.0-2.0', description: 'Best risk-adjusted performers' },
      { name: 'Ray Dalio All Weather', value: '0.7-0.9', description: 'Famous balanced strategy' },
    ],
  },
  'alpha': {
    description: 'Alpha measures the excess return of an investment relative to its benchmark index. A positive alpha means the investment outperformed; negative alpha means underperformance.',
    whyItMatters: 'Alpha represents skill or luck in beating the market. Most active funds have negative alpha after fees, which is why index investing has become so popular.',
    howToUse: 'Look for consistent positive alpha over 5+ years. Be skeptical of short-term alpha—it\'s often luck. Consider if alpha justifies higher fees.',
    benchmarks: [
      { name: 'Average Active Fund', value: '-1.0%', description: 'After fees, most underperform' },
      { name: 'Top Quartile Funds', value: '+1-2%', description: 'Rare consistent outperformers' },
      { name: 'Index Fund', value: '0%', description: 'By definition, matches benchmark' },
    ],
    relatedConcepts: ['Beta', 'Benchmark', 'Active Management'],
  },
  'beta': {
    description: 'Beta measures how much an investment moves relative to the market. A beta of 1.0 means it moves with the market; above 1.0 means more volatile; below 1.0 means less volatile.',
    whyItMatters: 'Beta helps you understand your market exposure. High-beta stocks amplify both gains and losses. Low-beta investments provide stability but may lag in bull markets.',
    howToUse: 'Match beta to your risk tolerance. Aggressive investors can handle beta > 1.0. Conservative investors should seek beta < 0.8. Bonds often have beta near 0.',
    ranges: [
      { label: 'Low', range: '< 0.8', meaning: 'Less volatile than market, defensive' },
      { label: 'Neutral', range: '0.8-1.2', meaning: 'Moves roughly with the market' },
      { label: 'High', range: '> 1.2', meaning: 'More volatile, amplifies market moves' },
    ],
    relatedConcepts: ['Volatility', 'Market Risk', 'Alpha'],
  },
  'correlation': {
    description: 'Correlation measures how two investments move in relation to each other. +1.0 means they move together perfectly; -1.0 means they move opposite; 0 means no relationship.',
    whyItMatters: 'Low or negative correlations are the key to true diversification. When assets aren\'t correlated, one can go up while another goes down, smoothing your overall returns.',
    howToUse: 'Build portfolios with assets that have low correlations to each other. Stocks and bonds historically have low correlation. International stocks add some diversification benefit.',
    ranges: [
      { label: 'Negative', range: '-1.0 to -0.3', meaning: 'Move in opposite directions, great for diversification' },
      { label: 'Low', range: '-0.3 to 0.3', meaning: 'Minimal relationship, good diversification' },
      { label: 'Moderate', range: '0.3-0.7', meaning: 'Some relationship, limited diversification' },
      { label: 'High', range: '0.7-1.0', meaning: 'Move together, little diversification benefit' },
    ],
    relatedConcepts: ['Diversification', 'Asset Allocation', 'Portfolio Construction'],
  },
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // TIME & CAPITAL
  // ═══════════════════════════════════════════════════════════════════════════════
  'time-horizon': {
    description: 'Your investment time horizon is the number of years until you need to access your money. It\'s the single most important factor in determining appropriate asset allocation.',
    whyItMatters: 'Time is your greatest ally. With 20+ years, you can ride out multiple crashes. With 3 years, a 30% drop could devastate your goals.',
    howToUse: 'Match risk to timeline: <5 years = conservative, 5-15 years = balanced, 15+ years = aggressive. Never take more risk than your timeline allows.',
    ranges: [
      { label: 'Short-Term', range: '0-5 years', meaning: 'Capital preservation focus, mostly bonds and cash' },
      { label: 'Medium-Term', range: '5-15 years', meaning: 'Balanced growth, can weather 1-2 corrections' },
      { label: 'Long-Term', range: '15+ years', meaning: 'Maximum equity exposure, time to recover from crashes' },
    ],
    relatedConcepts: ['Compound Growth', 'Asset Allocation', 'Sequence Risk'],
  },
  'investment-capital': {
    description: 'Your investment capital is the initial lump sum you\'re putting to work. This is your starting point for compound growth calculations.',
    whyItMatters: 'The initial investment sets the foundation. Thanks to compounding, early dollars have the most time to grow. A larger initial investment dramatically accelerates wealth building.',
    howToUse: 'Invest as much as you can comfortably spare while maintaining 3-6 months emergency fund. Avoid investing money you might need within 5 years.',
    benchmarks: [
      { name: 'Average American Starter', value: '$5,000-10,000', description: 'Typical first investment' },
      { name: 'Rule of 72', value: 'Years to double', description: '72 ÷ Return % = Years to 2x' },
    ],
    relatedConcepts: ['Monthly Contribution', 'Compound Growth', 'Lump Sum'],
  },
  'monthly-contribution': {
    description: 'Monthly contribution is the amount you add to your portfolio each month. Consistent contributions are often more powerful than the initial investment due to dollar-cost averaging.',
    whyItMatters: 'Regular contributions smooth out volatility (buying more shares when prices drop) and build the habit of wealth accumulation. Most millionaires were made by consistent saving, not timing.',
    howToUse: 'Aim to save 15-20% of income. Automate contributions on payday. Even $200/month at 8% for 30 years = $298,000.',
    benchmarks: [
      { name: '$500/mo for 30 years', value: '$745,180', description: 'At 8% annual return' },
      { name: '$1,000/mo for 20 years', value: '$589,020', description: 'At 8% annual return' },
      { name: '$200/mo for 40 years', value: '$621,620', description: 'Time beats amount' },
    ],
    relatedConcepts: ['Dollar-Cost Averaging', 'Savings Rate', 'Compound Growth'],
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // ASSET CLASSES
  // ═══════════════════════════════════════════════════════════════════════════════
  'us-equities': {
    description: 'US Equities represent ownership in American companies. They\'re the growth engine of most portfolios, historically returning ~10% annually but with significant volatility.',
    whyItMatters: 'US markets are the deepest, most liquid in the world. Major indices like the S&P 500 represent the backbone of global capitalism and long-term wealth creation.',
    howToUse: 'Core allocation for most investors. Use low-cost index funds (VOO, VTI). Higher risk tolerance = higher allocation. Never 0%, rarely 100%.',
    benchmarks: [
      { name: 'S&P 500 (1957-2024)', value: '10.5%', description: 'Annualized total return' },
      { name: 'Best Year (1995)', value: '+37.6%', description: 'Tech boom peak' },
      { name: 'Worst Year (2008)', value: '-37.0%', description: 'Financial crisis' },
    ],
    relatedConcepts: ['International Equities', 'Market Cap', 'Growth vs Value'],
  },
  'large-cap': {
    description: 'Large-cap stocks are shares of companies with market capitalization over $10 billion. They include household names like Apple, Microsoft, and Amazon.',
    whyItMatters: 'Large-caps offer stability and consistent dividends. They\'re less volatile than small-caps and form the core of most indices. They\'re the "safe" end of equity investing.',
    howToUse: 'Use as your core equity holding. S&P 500 index funds provide broad large-cap exposure. Good for stability seekers who still want equity growth.',
    benchmarks: [
      { name: 'S&P 500 Returns', value: '10.5%', description: 'Long-term average' },
      { name: 'Volatility', value: '15-18%', description: 'Lower than small-caps' },
    ],
    relatedConcepts: ['Small Cap', 'Mid Cap', 'Market Capitalization'],
  },
  'small-cap': {
    description: 'Small-cap stocks are shares of companies with market capitalization between $300 million and $2 billion. They offer higher growth potential but with more volatility.',
    whyItMatters: 'Historically, small-caps have outperformed large-caps over very long periods (the "size premium"). But they\'re more volatile and can underperform for years.',
    howToUse: 'Allocate 10-20% of equity portfolio. Use index funds like VB or IWM. Best for young investors with long horizons. Expect 25%+ swings.',
    benchmarks: [
      { name: 'Russell 2000 Returns', value: '11.5%', description: 'Long-term average, higher than large-cap' },
      { name: 'Volatility', value: '22-28%', description: 'Higher risk, higher reward' },
    ],
    relatedConcepts: ['Large Cap', 'Growth Stocks', 'Volatility'],
  },
  'growth-stocks': {
    description: 'Growth stocks are shares of companies expected to grow earnings faster than the market average. They often reinvest profits rather than paying dividends.',
    whyItMatters: 'Growth stocks drive much of the market\'s gains but are more volatile. Tech stocks are typically growth stocks. They excel in bull markets but crash harder in downturns.',
    howToUse: 'Balance with value stocks for diversification. Growth works best with long horizons. Expect higher volatility but potentially higher returns.',
    benchmarks: [
      { name: 'Growth vs Value (2010-2020)', value: 'Growth +4%/yr', description: 'Growth outperformed' },
      { name: 'Growth vs Value (2000-2010)', value: 'Value +6%/yr', description: 'Value outperformed' },
    ],
    relatedConcepts: ['Value Stocks', 'P/E Ratio', 'Tech Stocks'],
  },
  'value-stocks': {
    description: 'Value stocks are shares of companies trading below their intrinsic value based on fundamentals. They often pay dividends and have lower P/E ratios.',
    whyItMatters: 'Value investing was pioneered by Benjamin Graham and Warren Buffett. Historically, value has outperformed growth over the very long term, though cycles vary.',
    howToUse: 'Use for diversification and income. Value works best when growth is expensive. Expect lower volatility than growth stocks.',
    benchmarks: [
      { name: 'Value Premium (Historical)', value: '+2-3%', description: 'Over very long periods' },
      { name: 'Dividend Yield', value: '2-4%', description: 'Income component' },
    ],
    relatedConcepts: ['Growth Stocks', 'Dividend Investing', 'P/E Ratio'],
  },
  'fixed-income': {
    description: 'Fixed income (bonds) are loans to governments or corporations that pay regular interest. They provide stability and income, acting as a ballast during equity crashes.',
    whyItMatters: 'Bonds reduce portfolio volatility and provide income. When stocks crash, high-quality bonds often rise, protecting your portfolio. The 60/40 portfolio exists for this reason.',
    howToUse: 'Increase bond allocation as you age or near goals. "Age in bonds" is a rough rule. Quality matters—stick to investment-grade or Treasuries.',
    benchmarks: [
      { name: 'US Aggregate Bond Index', value: '5.0%', description: 'Long-term average return' },
      { name: '10-Year Treasury (Current)', value: '4.3%', description: 'Risk-free rate benchmark' },
      { name: '2022 Bond Crash', value: '-13%', description: 'Worst year on record' },
    ],
    relatedConcepts: ['Duration', 'Yield', 'Credit Quality'],
  },
  'treasuries': {
    description: 'Treasury securities are bonds issued by the US government. They\'re considered risk-free because they\'re backed by the full faith and credit of the US government.',
    whyItMatters: 'Treasuries are the safest investment in the world. They set the "risk-free rate" used to evaluate all other investments. They\'re a safe haven in market crashes.',
    howToUse: 'Use for safety and as a benchmark. T-bills for cash, longer-term Treasuries for income. Consider TIPS for inflation protection.',
    benchmarks: [
      { name: '10-Year Treasury', value: '4.3%', description: 'Current yield' },
      { name: 'T-Bill (3-month)', value: '5.0%', description: 'Short-term rate' },
    ],
    relatedConcepts: ['Fixed Income', 'Risk-Free Rate', 'Duration'],
  },
  'corporate-bonds': {
    description: 'Corporate bonds are debt securities issued by companies. They pay higher interest than Treasuries but carry credit risk—the company might default.',
    whyItMatters: 'Corporate bonds offer higher yields for accepting credit risk. Investment-grade bonds from blue-chip companies are relatively safe. High-yield "junk" bonds are riskier.',
    howToUse: 'Stick to investment-grade for safety. High-yield for more aggressive investors. Use bond funds for diversification.',
    benchmarks: [
      { name: 'Investment-Grade Spread', value: '1.0-1.5%', description: 'Over Treasuries' },
      { name: 'High-Yield Spread', value: '3-5%', description: 'For accepting more risk' },
    ],
    relatedConcepts: ['Fixed Income', 'Credit Quality', 'Yield'],
  },
  'international-equities': {
    description: 'International equities are stocks from companies outside the US—both developed markets (Europe, Japan) and emerging markets (China, India, Brazil).',
    whyItMatters: 'Diversification beyond US borders reduces country-specific risk. At times, international markets outperform the US (2000-2010). You\'re betting on global growth, not just America.',
    howToUse: 'Typically 20-40% of equity allocation. Use funds like VXUS or IXUS. Emerging markets (10-20%) add growth potential with higher volatility.',
    benchmarks: [
      { name: 'MSCI EAFE (Developed)', value: '7.5%', description: 'Long-term average' },
      { name: 'MSCI Emerging Markets', value: '9.0%', description: 'Higher risk, higher reward' },
      { name: 'US vs Intl Correlation', value: '0.85', description: 'High but not perfect' },
    ],
    relatedConcepts: ['Currency Risk', 'Emerging Markets', 'Developed Markets'],
  },
  'emerging-markets': {
    description: 'Emerging markets are developing economies like China, India, Brazil, and others. They offer higher growth potential but with more political and economic risk.',
    whyItMatters: 'Emerging markets can deliver exceptional returns but with extreme volatility. They\'re where the world\'s fastest-growing consumers live.',
    howToUse: 'Keep allocation modest (5-15%). Use diversified EM funds. Expect 30%+ drawdowns. Best for long horizons.',
    benchmarks: [
      { name: 'MSCI Emerging Markets', value: '9.0%', description: 'Long-term average' },
      { name: 'Volatility', value: '25-30%', description: 'Much higher than developed' },
    ],
    relatedConcepts: ['International Equities', 'Currency Risk', 'Political Risk'],
  },
  'real-estate': {
    description: 'Real estate in portfolios typically means REITs (Real Estate Investment Trusts)—companies that own income-producing properties like apartments, offices, and warehouses.',
    whyItMatters: 'REITs offer exposure to property markets without buying buildings. They provide income (dividends), inflation protection, and diversification from stocks and bonds.',
    howToUse: 'Typically 5-15% of portfolio. Use REIT index funds (VNQ, SCHH). Treat as a diversifier, not a core holding. Already have rental property? Reduce REIT allocation.',
    benchmarks: [
      { name: 'FTSE NAREIT All REITs', value: '9.5%', description: 'Long-term average return' },
      { name: 'REIT Dividend Yield', value: '4-5%', description: 'Income component' },
      { name: 'Correlation to S&P 500', value: '0.65', description: 'Moderate diversification' },
    ],
    relatedConcepts: ['Dividend Yield', 'Property Types', 'Inflation Hedge'],
  },
  'alternatives': {
    description: 'Alternatives include commodities (gold, oil), private equity, hedge funds, and other non-traditional investments that behave differently from stocks and bonds.',
    whyItMatters: 'Alternatives can provide true diversification—assets that zig when others zag. Gold, for example, often rises during crises. But they come with complexity and often higher fees.',
    howToUse: 'Keep alternatives small (5-10%). Focus on accessible options like gold ETFs (GLD) or commodity funds. Avoid complex products you don\'t fully understand.',
    benchmarks: [
      { name: 'Gold (Long-Term)', value: '7.5%', description: 'Annualized return since 1971' },
      { name: 'Commodities Index', value: '3-4%', description: 'Lower returns, diversification benefit' },
      { name: 'Correlation to Stocks', value: '0.1-0.3', description: 'Low, providing diversification' },
    ],
    relatedConcepts: ['Commodities', 'Hedge Funds', 'Inflation Protection'],
  },
  'gold': {
    description: 'Gold is a precious metal that has served as a store of value for thousands of years. It\'s often considered a safe haven during economic uncertainty.',
    whyItMatters: 'Gold tends to rise when everything else falls. It\'s a hedge against currency devaluation, inflation, and geopolitical crises. It has low correlation with stocks.',
    howToUse: 'Keep allocation small (2-10%). Use gold ETFs (GLD, IAU) for convenience. Don\'t expect income—gold pays no dividends.',
    benchmarks: [
      { name: 'Gold Since 1971', value: '7.5%', description: 'Annualized return' },
      { name: 'Correlation to S&P 500', value: '0.05', description: 'Almost uncorrelated' },
    ],
    relatedConcepts: ['Alternatives', 'Inflation Hedge', 'Safe Haven'],
  },
  'commodities': {
    description: 'Commodities are raw materials like oil, natural gas, agricultural products, and metals. They can provide inflation protection and diversification.',
    whyItMatters: 'Commodity prices often rise with inflation, protecting purchasing power. They have low correlation with stocks and bonds, providing true diversification.',
    howToUse: 'Use commodity index funds for broad exposure. Keep allocation modest (5-10%). Understand that commodity returns are driven by different factors than stocks.',
    benchmarks: [
      { name: 'Bloomberg Commodity Index', value: '3-4%', description: 'Long-term average' },
      { name: 'Volatility', value: '15-20%', description: 'Similar to stocks' },
    ],
    relatedConcepts: ['Alternatives', 'Inflation', 'Gold'],
  },
  'cash': {
    description: 'Cash includes money market funds, high-yield savings, and short-term Treasury bills. It provides liquidity and stability but loses purchasing power to inflation.',
    whyItMatters: 'Cash is a strategic tool, not just idle money. It provides optionality—capital to deploy during market crashes. But too much cash is a silent wealth killer through inflation.',
    howToUse: 'Keep 2-5% in portfolio for rebalancing and opportunities. Maintain separate emergency fund (3-6 months expenses). In rising rate environments, T-bills beat savings accounts.',
    benchmarks: [
      { name: 'High-Yield Savings', value: '4.5%', description: 'Current rates' },
      { name: 'Inflation (Historical)', value: '3.5%', description: 'Eats into cash value' },
      { name: 'Real Return', value: '0-1%', description: 'After inflation' },
    ],
    relatedConcepts: ['Liquidity', 'Opportunity Cost', 'Emergency Fund'],
  },
  'liquidity': {
    description: 'Liquidity is how quickly an asset can be converted to cash without significant loss in value. Stocks are liquid; real estate is illiquid.',
    whyItMatters: 'Liquid assets let you access money when needed. Illiquid investments may offer higher returns but lock up your capital. Balance liquidity with returns.',
    howToUse: 'Keep enough liquid assets for emergencies and opportunities. Taxable brokerage accounts are liquid. 401(k)s and real estate are less liquid.',
    relatedConcepts: ['Cash', 'Emergency Fund', 'Market Depth'],
  },
  'emergency-fund': {
    description: 'An emergency fund is 3-6 months of expenses saved in a liquid, safe account. It\'s your financial safety net before investing.',
    whyItMatters: 'Without an emergency fund, you might need to sell investments at the worst time—during a crisis when you lose your job AND the market crashes.',
    howToUse: 'Build this BEFORE investing in stocks. Keep in high-yield savings. Only use for true emergencies. Replenish immediately after use.',
    benchmarks: [
      { name: 'Common Amount', value: '3-6 months expenses', description: 'Depends on job stability' },
      { name: 'Where to Keep', value: 'High-yield savings', description: 'Safe and accessible' },
    ],
    relatedConcepts: ['Cash', 'Liquidity', 'Financial Security'],
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // RISK CONCEPTS
  // ═══════════════════════════════════════════════════════════════════════════════
  'risk-tolerance': {
    description: 'Risk tolerance is your emotional and psychological ability to handle investment losses. It\'s how you feel when your portfolio drops 20%—can you sleep at night?',
    whyItMatters: 'If your risk tolerance is lower than your portfolio\'s volatility, you\'ll panic sell at the worst times. The best portfolio is one you can stick with through crashes.',
    howToUse: 'Be honest with yourself. If 2020\'s 35% drop made you sell, your tolerance is lower than you thought. Match your portfolio to your actual behavior, not aspirational behavior.',
    ranges: [
      { label: 'Low', range: '0-30', meaning: 'Significant anxiety during market drops' },
      { label: 'Moderate', range: '30-60', meaning: 'Uncomfortable but can hold during corrections' },
      { label: 'High', range: '60-100', meaning: 'Views drops as buying opportunities' },
    ],
    relatedConcepts: ['Risk Capacity', 'Behavioral Finance', 'Max Drawdown'],
  },
  'risk-capacity': {
    description: 'Risk capacity is the financial ability to take risk. It depends on income stability, emergency fund, debt levels, and time horizon—objective factors, not feelings.',
    whyItMatters: 'Someone with $10M and no debt has high capacity regardless of tolerance. A retiree living on savings has low capacity. Capacity sets the upper limit of risk that may be appropriate.',
    howToUse: 'Calculate: Stable income + long timeline + low debt + large emergency fund = high capacity. Unstable income + short timeline + high debt = low capacity. Understanding capacity helps inform allocation decisions.',
    ranges: [
      { label: 'Low', range: '0-30', meaning: 'Limited buffer, needs capital preservation' },
      { label: 'Moderate', range: '30-60', meaning: 'Can absorb some losses without life impact' },
      { label: 'High', range: '60-100', meaning: 'Strong financial position, can weather any storm' },
    ],
    relatedConcepts: ['Risk Tolerance', 'Emergency Fund', 'Financial Stability'],
  },
  'risk-required': {
    description: 'Risk required is the amount of risk you need to take to achieve your financial goals. If you need 10% returns to retire comfortably, your required risk is high.',
    whyItMatters: 'Sometimes there\'s a gap: you might need high risk but have low tolerance. This forces hard choices: save more, work longer, or accept lower goals. Ignoring this gap leads to failure.',
    howToUse: 'Calculate your required return: (Goal Amount / Current Savings)^(1/Years) - 1. If required risk exceeds your tolerance, adjust your goals or increase savings rate.',
    relatedConcepts: ['Financial Goals', 'Expected Return', 'Savings Rate'],
  },
  'sequence-risk': {
    description: 'Sequence risk is the danger of experiencing bad returns early in retirement when you\'re withdrawing money. The order of returns matters as much as the average.',
    whyItMatters: 'Two identical average returns can have very different outcomes. Bad returns early devastate portfolios because you\'re selling low. This is why retirees need bonds.',
    howToUse: 'Reduce equity allocation as you approach and enter retirement. Keep 2-3 years of expenses in stable assets. Consider bucket strategies.',
    relatedConcepts: ['Retirement', 'Asset Allocation', 'Withdrawal Rate'],
  },
  'market-risk': {
    description: 'Market risk (systematic risk) is the risk of the entire market declining. It affects all stocks and cannot be diversified away within equities.',
    whyItMatters: 'In 2008, even diversified stock portfolios lost 50%. Market risk is the price you pay for equity returns. Only bonds and alternatives reduce it.',
    howToUse: 'Accept market risk as part of investing. Use bonds to reduce it. Time horizon determines how much you can tolerate. Young investors can ride out crashes.',
    relatedConcepts: ['Volatility', 'Beta', 'Diversification'],
  },
  'inflation-risk': {
    description: 'Inflation risk is the danger that your money loses purchasing power over time. Even at 3% inflation, $100 becomes worth only $74 in 10 years.',
    whyItMatters: 'Safe investments like cash and bonds may not keep up with inflation. Too conservative = guaranteed slow wealth destruction. Stocks are the best long-term inflation hedge.',
    howToUse: 'Always consider real returns (after inflation). Over long periods, equities beat inflation. TIPS and I-Bonds provide direct inflation protection.',
    benchmarks: [
      { name: 'Historical Inflation', value: '3.5%', description: 'Long-term average' },
      { name: 'Recent Spike (2022)', value: '9.1%', description: 'Highest in 40 years' },
    ],
    relatedConcepts: ['Purchasing Power', 'Real Returns', 'TIPS'],
  },
  'tail-risk': {
    description: 'Tail risk refers to rare but extreme market events—"black swans"—that fall outside normal statistical expectations. Think 2008 financial crisis or COVID crash.',
    whyItMatters: 'Normal models underestimate tail risk. These events happen more often than statistics predict and can destroy portfolios. Diversification helps but doesn\'t eliminate it.',
    howToUse: 'Accept that crashes will happen. Maintain emergency fund. Keep some bonds. Don\'t use leverage. Have a plan for how you\'ll react.',
    relatedConcepts: ['Max Drawdown', 'Volatility', 'Risk Management'],
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // STRATEGY CONCEPTS
  // ═══════════════════════════════════════════════════════════════════════════════
  'asset-allocation': {
    description: 'Asset allocation is the strategic distribution of your portfolio across different asset classes (stocks, bonds, real estate, etc.). Studies show it determines over 90% of portfolio performance.',
    whyItMatters: 'Your allocation decision is more important than which specific stocks you pick. A good allocation matched to your risk profile and timeline is the foundation of investing success.',
    howToUse: 'Start with your risk score to determine equity/bond split. Then diversify within each category. Rebalance when allocations drift more than 5% from targets.',
    relatedConcepts: ['Diversification', 'Rebalancing', 'Risk Profile'],
    benchmarks: [
      { name: 'Conservative (30/70)', value: '~5% return', description: '30% stocks, 70% bonds' },
      { name: 'Moderate (60/40)', value: '~7% return', description: 'Classic balanced portfolio' },
      { name: 'Aggressive (90/10)', value: '~9% return', description: '90% stocks, 10% bonds' },
    ],
  },
  'diversification': {
    description: 'Diversification means spreading investments across different assets so that poor performance in one area doesn\'t devastate your entire portfolio. It\'s the only "free lunch" in investing.',
    whyItMatters: 'No one can predict which asset will perform best. Diversification ensures you capture returns wherever they occur while reducing the impact of any single failure.',
    howToUse: 'Diversify across: asset classes (stocks, bonds, real estate), geographies (US, international), sectors (tech, healthcare, finance), and company sizes (large, small cap).',
    relatedConcepts: ['Asset Allocation', 'Correlation', 'Portfolio Construction'],
  },
  'rebalancing': {
    description: 'Rebalancing is the process of adjusting your portfolio back to your target allocation. As markets move, your allocations drift—rebalancing sells winners and buys losers to maintain your plan.',
    whyItMatters: 'Without rebalancing, a portfolio naturally becomes riskier over time as stocks outpace bonds. Rebalancing enforces discipline and a systematic "sell high, buy low" approach.',
    howToUse: 'Rebalance annually or when allocations drift 5%+ from targets. Use new contributions to rebalance tax-efficiently. Keep records for tax purposes.',
    relatedConcepts: ['Asset Allocation', 'Tax Efficiency', 'Portfolio Drift'],
  },
  'compound-growth': {
    description: 'Compound growth is earnings generating more earnings over time—interest on interest. Einstein allegedly called it the "eighth wonder of the world." It\'s why time in the market beats timing.',
    whyItMatters: '$10,000 at 8% for 30 years becomes $100,627 without adding a penny. The same at 10% becomes $174,494. Small rate differences compound into huge wealth differences.',
    howToUse: 'Start early—even small amounts. Stay invested—avoid breaks. Minimize fees—even 1% annually destroys compounding. Use the Rule of 72: 72 ÷ rate = years to double.',
    benchmarks: [
      { name: 'Rule of 72 at 8%', value: '9 years', description: 'Time to double your money' },
      { name: 'Rule of 72 at 10%', value: '7.2 years', description: 'Time to double your money' },
      { name: '$10K for 30 years @ 8%', value: '$100,627', description: 'Power of compounding' },
    ],
    relatedConcepts: ['Time Value of Money', 'Interest Rates', 'Patience'],
  },
  'dollar-cost-averaging': {
    description: 'Dollar-cost averaging (DCA) is investing fixed amounts at regular intervals regardless of market conditions. You buy more shares when prices are low and fewer when high, lowering average cost.',
    whyItMatters: 'DCA removes emotion from investing. You don\'t need to time the market—you\'re always investing. In volatile markets, you actually benefit from drops.',
    howToUse: 'Set up automatic investments on each payday. Don\'t check prices—just keep contributing. Over time, your average purchase price will be lower than the market average.',
    relatedConcepts: ['Monthly Contribution', 'Market Timing', 'Systematic Investing'],
    benchmarks: [
      { name: 'Lump Sum vs DCA', value: 'Lump sum wins 66%', description: 'But DCA reduces regret' },
    ],
  },
  'passive-investing': {
    description: 'Passive investing is a buy-and-hold strategy using index funds to match market returns. It minimizes trading and fees, accepting average returns rather than trying to beat the market.',
    whyItMatters: 'Most active managers underperform index funds after fees. Passive investing is simple, low-cost, and outperforms 80%+ of active funds over long periods.',
    howToUse: 'Use low-cost index funds like VTI or VOO. Hold for decades. Ignore market noise. Focus on asset allocation, not stock picking.',
    benchmarks: [
      { name: 'Active Funds Underperforming', value: '80%+', description: 'Over 20 years' },
      { name: 'Index Fund Expense Ratio', value: '0.03-0.10%', description: 'Very low cost' },
    ],
    relatedConcepts: ['Index Investing', 'Buy and Hold', 'Low-Cost Investing'],
  },
  'active-investing': {
    description: 'Active investing attempts to beat the market through stock picking, market timing, or tactical asset allocation. It requires more research, trading, and typically higher fees.',
    whyItMatters: 'While some active managers do outperform, identifying them in advance is nearly impossible. After fees and taxes, most active strategies lose to passive investing.',
    howToUse: 'If you must actively invest, limit it to a small portion of your portfolio. Track your performance honestly against benchmarks. Consider if the time investment is worth it.',
    relatedConcepts: ['Alpha', 'Stock Picking', 'Market Timing'],
  },
  'buy-and-hold': {
    description: 'Buy and hold is an investment strategy where you purchase securities and hold them for a long time regardless of market fluctuations. It\'s the opposite of active trading.',
    whyItMatters: 'Time in the market beats timing the market. Trading costs and taxes eat into returns. Emotional trading usually leads to poor outcomes.',
    howToUse: 'Buy diversified index funds. Commit to holding for 10+ years. Only sell for rebalancing or when you need the money. Ignore daily market news.',
    relatedConcepts: ['Passive Investing', 'Long-Term Investing', 'Compound Growth'],
  },
  'market-timing': {
    description: 'Market timing is the attempt to predict market movements to buy low and sell high. It sounds great but is nearly impossible to execute consistently.',
    whyItMatters: 'Missing just the 10 best days in 20 years cuts your returns in half. No one can consistently predict which days those are. Time in the market beats timing the market.',
    howToUse: 'Don\'t try to time the market. Stay invested. If you must make tactical adjustments, make them small and infrequent. Accept that you can\'t predict the future.',
    benchmarks: [
      { name: 'Missing Best 10 Days', value: '-50% returns', description: 'Over 20 years' },
      { name: 'Market Timing Success Rate', value: '< 5%', description: 'Of investors' },
    ],
    relatedConcepts: ['Buy and Hold', 'Behavioral Finance', 'Dollar-Cost Averaging'],
  },
  'time-in-market': {
    description: 'Time in the market refers to the principle that staying invested over long periods is more important than trying to perfectly time when to buy and sell.',
    whyItMatters: 'Markets trend upward over time. Short-term volatility is noise. The longer you stay invested, the higher your probability of positive returns.',
    howToUse: 'Start investing as early as possible. Stay invested through downturns. Don\'t panic sell. Let compound growth work over decades.',
    benchmarks: [
      { name: '1-Year Holding', value: '73% positive', description: 'Historical probability' },
      { name: '10-Year Holding', value: '95% positive', description: 'Much higher probability' },
      { name: '20-Year Holding', value: '100% positive', description: 'Historically never lost' },
    ],
    relatedConcepts: ['Buy and Hold', 'Compound Growth', 'Long-Term Investing'],
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // INVESTMENT VEHICLES
  // ═══════════════════════════════════════════════════════════════════════════════
  'etf': {
    description: 'An ETF (Exchange-Traded Fund) is a basket of securities that trades on an exchange like a stock. ETFs offer diversification, low costs, and tax efficiency.',
    whyItMatters: 'ETFs revolutionized investing by making diversification cheap and easy. A single ETF like VTI gives you exposure to the entire US stock market.',
    howToUse: 'Use ETFs as your primary investment vehicle. Look for low expense ratios (<0.20%). Choose broad market ETFs for core holdings. Sector ETFs for tactical allocation.',
    benchmarks: [
      { name: 'Average ETF Expense Ratio', value: '0.15%', description: 'Much lower than mutual funds' },
      { name: 'Number of ETFs', value: '3,000+', description: 'Wide variety available' },
    ],
    relatedConcepts: ['Index Fund', 'Expense Ratio', 'Diversification'],
  },
  'mutual-fund': {
    description: 'A mutual fund pools money from many investors to buy a portfolio of securities. Unlike ETFs, mutual funds are priced once daily and often have higher fees.',
    whyItMatters: 'Mutual funds offer diversification and professional management. However, high fees often outweigh benefits. Index mutual funds are a low-cost exception.',
    howToUse: 'Prefer index mutual funds with low expense ratios. Avoid funds with front-end loads or high fees. In 401(k)s, mutual funds may be your only option.',
    benchmarks: [
      { name: 'Average Expense Ratio', value: '0.50%', description: 'Higher than ETFs' },
      { name: 'Active Funds Underperforming', value: '80%', description: 'After 20 years' },
    ],
    relatedConcepts: ['ETF', 'Expense Ratio', 'Active Management'],
  },
  'index-fund': {
    description: 'An index fund is a mutual fund or ETF that tracks a market index like the S&P 500. It provides broad market exposure with minimal fees and no stock-picking.',
    whyItMatters: 'Index funds have outperformed 80%+ of actively managed funds over 20 years. They\'re the backbone of modern portfolio theory and passive investing.',
    howToUse: 'Use broad market index funds (VTI, VOO, VXUS) as your core holdings. Add sector or factor funds for tilts. Keep costs under 0.20%.',
    benchmarks: [
      { name: 'S&P 500 Index (SPY)', value: '0.09%', description: 'Expense ratio' },
      { name: 'Total Market (VTI)', value: '0.03%', description: 'Lowest cost option' },
    ],
    relatedConcepts: ['ETF', 'Passive Investing', 'Expense Ratio'],
  },
  'expense-ratio': {
    description: 'The expense ratio is the annual fee charged by a fund as a percentage of your investment. It covers management, administration, and operating costs.',
    whyItMatters: 'Fees compound negatively just like returns compound positively. 1% annual fee over 30 years costs you 26% of your final value. Low fees = more money for you.',
    howToUse: 'Always check expense ratios before investing. Index funds should be under 0.20%. Avoid any fund over 1%. In 401(k)s, choose the lowest-cost options.',
    ranges: [
      { label: 'Excellent', range: '< 0.10%', meaning: 'Best-in-class index funds' },
      { label: 'Good', range: '0.10-0.30%', meaning: 'Reasonable for most funds' },
      { label: 'High', range: '0.50-1.00%', meaning: 'Eating into your returns' },
      { label: 'Avoid', range: '> 1.00%', meaning: 'Too expensive for most investors' },
    ],
    relatedConcepts: ['Fees', 'Index Fund', 'Total Cost'],
  },
  '401k': {
    description: 'A 401(k) is an employer-sponsored retirement account with tax advantages. Contributions are pre-tax (traditional) or post-tax (Roth), and many employers match contributions.',
    whyItMatters: 'The employer match is free money—always contribute enough to get the full match. Tax-deferred growth significantly boosts long-term wealth.',
    howToUse: 'Contribute at least enough to get full employer match. Prefer low-cost index funds within the plan. Consider Roth 401(k) if available and appropriate.',
    benchmarks: [
      { name: '2024 Contribution Limit', value: '$23,000', description: 'Under age 50' },
      { name: 'Catch-up (50+)', value: '+$7,500', description: 'Additional contribution' },
      { name: 'Average Match', value: '3-6%', description: 'Of salary' },
    ],
    relatedConcepts: ['IRA', 'Employer Match', 'Tax-Deferred'],
  },
  'ira': {
    description: 'An IRA (Individual Retirement Account) is a tax-advantaged retirement account you open yourself. Traditional IRA contributions are tax-deductible; Roth IRA withdrawals are tax-free.',
    whyItMatters: 'IRAs offer more investment choices than 401(k)s. They\'re essential for self-employed people and useful for supplementing 401(k) contributions.',
    howToUse: 'Max out 401(k) match first, then contribute to IRA. Choose Roth if you expect higher taxes in retirement. Traditional if you want tax deduction now.',
    benchmarks: [
      { name: '2024 Contribution Limit', value: '$7,000', description: 'Under age 50' },
      { name: 'Catch-up (50+)', value: '+$1,000', description: 'Additional contribution' },
    ],
    relatedConcepts: ['401(k)', 'Roth IRA', 'Tax-Advantaged'],
  },
  'roth-ira': {
    description: 'A Roth IRA is a retirement account where you contribute after-tax money, but all withdrawals in retirement are completely tax-free—including investment gains.',
    whyItMatters: 'Tax-free growth for decades is incredibly powerful. If you\'re young or expect higher taxes later, Roth is often the better choice.',
    howToUse: 'Contribute when your income allows. Favor Roth when in lower tax brackets. Great for young investors with long horizons.',
    benchmarks: [
      { name: 'Income Limit (Single)', value: '$161,000', description: 'For 2024 full contribution' },
      { name: 'Income Limit (Married)', value: '$240,000', description: 'For 2024 full contribution' },
    ],
    relatedConcepts: ['IRA', 'Tax-Free Growth', 'Retirement Planning'],
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // BEHAVIORAL FINANCE
  // ═══════════════════════════════════════════════════════════════════════════════
  'behavioral-finance': {
    description: 'Behavioral finance studies how emotions and cognitive biases affect financial decisions. It explains why investors often act irrationally, buying high and selling low.',
    whyItMatters: 'Understanding your biases helps you avoid them. The average investor significantly underperforms the market because of behavioral mistakes.',
    howToUse: 'Create rules before emotions hit. Automate investing. Don\'t check your portfolio daily. Have a written investment policy statement.',
    relatedConcepts: ['Panic Selling', 'FOMO', 'Emotional Investing'],
  },
  'panic-selling': {
    description: 'Panic selling is selling investments in response to fear during market downturns. It locks in losses and often happens at the worst possible time.',
    whyItMatters: 'Panic sellers turn temporary paper losses into permanent real losses. They also miss the recovery, which often happens suddenly and unexpectedly.',
    howToUse: 'Have a plan before downturns. Keep emergency fund so you\'re never forced to sell. Remember: every crash in history has been followed by recovery.',
    benchmarks: [
      { name: 'Average Investor Returns', value: '3-4%', description: 'Due to bad timing' },
      { name: 'S&P 500 Returns', value: '10%', description: 'For those who stayed invested' },
    ],
    relatedConcepts: ['Behavioral Finance', 'Market Timing', 'Volatility'],
  },
  'fomo': {
    description: 'FOMO (Fear Of Missing Out) is the anxiety that you\'re missing profitable opportunities. It leads to chasing hot stocks, sectors, or trends after they\'ve already risen.',
    whyItMatters: 'FOMO drives buying at peaks. By the time "everyone" is talking about an investment, the easy gains are gone. Chasing performance destroys returns.',
    howToUse: 'Stick to your allocation plan. Don\'t check what\'s hot. Remember that diversification means some parts will always be lagging. That\'s okay.',
    relatedConcepts: ['Behavioral Finance', 'Chasing Performance', 'Discipline'],
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // INVESTOR DNA DIMENSIONS
  // ═══════════════════════════════════════════════════════════════════════════════
  'guardian-pioneer': {
    description: 'This dimension measures your position on the risk spectrum—from Guardian (capital preservation focus) to Pioneer (growth-seeking mindset). It reflects your psychological comfort with investment risk.',
    whyItMatters: 'Your position on this spectrum directly determines your asset allocation. Guardians sleep better with bonds; Pioneers thrive on equity volatility. Neither is wrong—it\'s about self-awareness.',
    howToUse: 'If you\'re on the Guardian side, prioritize stable dividend payers and bonds. Pioneers can embrace growth stocks and emerging markets. The key is matching portfolio to personality.',
    ranges: [
      { label: 'Guardian (0-25)', range: '0-25', meaning: 'Strong preference for capital preservation over growth' },
      { label: 'Moderate (25-50)', range: '25-50', meaning: 'Lean toward stability but accept some risk for growth' },
      { label: 'Balanced (50-75)', range: '50-75', meaning: 'Comfortable with volatility for growth potential' },
      { label: 'Pioneer (75-100)', range: '75-100', meaning: 'Actively seeks growth, comfortable with high volatility' },
    ],
    relatedConcepts: ['Risk Tolerance', 'Asset Allocation', 'Volatility'],
  },
  'analytical-intuitive': {
    description: 'This dimension reflects your decision-making style—from Analytical (data-driven, methodical) to Intuitive (gut-feel, pattern-recognition). It shapes how you evaluate investments.',
    whyItMatters: 'Analytical investors excel at due diligence but may suffer analysis paralysis. Intuitive investors act quickly but risk emotional decisions. Understanding your style helps compensate for blind spots.',
    howToUse: 'Analytical types: Set decision deadlines to avoid over-analysis. Build systematic rules. Intuitive types: Create checklists to validate gut feelings. Both: Review past decisions to improve.',
    ranges: [
      { label: 'Highly Analytical', range: '0-25', meaning: 'Decisions require extensive research and data' },
      { label: 'Lean Analytical', range: '25-50', meaning: 'Data-focused with some intuitive validation' },
      { label: 'Lean Intuitive', range: '50-75', meaning: 'Trust instincts but verify with data' },
      { label: 'Highly Intuitive', range: '75-100', meaning: 'Pattern recognition drives decisions' },
    ],
    relatedConcepts: ['Investment Research', 'Decision Making', 'Behavioral Finance'],
  },
  'patient-active': {
    description: 'This dimension measures your trading temperament—from Patient (buy-and-hold, long-term focus) to Active (tactical, frequent adjustments). It affects transaction costs and tax efficiency.',
    whyItMatters: 'Patient investors benefit from compound growth and lower costs. Active investors can capture opportunities but face higher taxes and transaction costs. Studies show most active traders underperform.',
    howToUse: 'Patient: Set it and forget it with index funds. Rebalance annually. Active: If you must trade, limit to 10% "play money" portfolio. Track your performance honestly against benchmarks.',
    ranges: [
      { label: 'Very Patient', range: '0-25', meaning: 'Multi-decade holder, ignores short-term noise' },
      { label: 'Patient', range: '25-50', meaning: 'Annual rebalancing, rarely sells individual positions' },
      { label: 'Tactical', range: '50-75', meaning: 'Adjusts quarterly, responds to market conditions' },
      { label: 'Active', range: '75-100', meaning: 'Frequent trading, seeks short-term opportunities' },
    ],
    relatedConcepts: ['Transaction Costs', 'Tax Efficiency', 'Rebalancing'],
  },
  'diversifier-concentrator': {
    description: 'This dimension shows your portfolio construction preference—from Diversifier (broad exposure, many positions) to Concentrator (high-conviction, focused bets). It affects your risk profile.',
    whyItMatters: 'Diversifiers reduce individual stock risk but cap upside. Concentrators can achieve exceptional returns but face higher variance. Warren Buffett concentrates; Ray Dalio diversifies. Both are billionaires.',
    howToUse: 'Diversifiers: Low-cost index funds are your friend. Own the market. Concentrators: If you concentrate, ensure deep research and accept potential 50%+ drawdowns on positions.',
    ranges: [
      { label: 'Strong Diversifier', range: '0-25', meaning: 'Broad index funds, 100+ positions' },
      { label: 'Diversifier', range: '25-50', meaning: 'Multiple ETFs across asset classes' },
      { label: 'Focused', range: '50-75', meaning: '15-30 high-conviction positions' },
      { label: 'Concentrator', range: '75-100', meaning: '<10 positions, very high conviction' },
    ],
    relatedConcepts: ['Portfolio Construction', 'Position Sizing', 'Concentration Risk'],
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // GENERAL TERMS
  // ═══════════════════════════════════════════════════════════════════════════════
  'portfolio': {
    description: 'A portfolio is your complete collection of investments—all your stocks, bonds, funds, and other assets across all accounts. It\'s your total investable wealth.',
    whyItMatters: 'Think holistically about your portfolio, not individual accounts. Your 401(k), IRA, and brokerage accounts together form one portfolio with one asset allocation.',
    howToUse: 'Track all accounts together. Optimize allocation across accounts for tax efficiency. Rebalance at the portfolio level, not account by account.',
    relatedConcepts: ['Asset Allocation', 'Diversification', 'Rebalancing'],
  },
  'benchmark': {
    description: 'A benchmark is a standard against which you measure your portfolio\'s performance. The most common is the S&P 500 for US stocks or a blended benchmark matching your allocation.',
    whyItMatters: 'Without a benchmark, you don\'t know if you\'re doing well. Beating the market sounds great until you realize you took 3x the risk. Compare apples to apples.',
    howToUse: 'Choose a benchmark matching your allocation. If you\'re 60/40, use a 60/40 benchmark. Track performance honestly over long periods (5+ years).',
    relatedConcepts: ['Alpha', 'Performance Measurement', 'Index'],
  },
  'bull-market': {
    description: 'A bull market is a prolonged period of rising stock prices, typically 20%+ gains from recent lows. It\'s characterized by optimism, economic growth, and investor confidence.',
    whyItMatters: 'Bull markets can last years and make everyone feel like a genius. The danger is becoming complacent and overexposed to risk when the inevitable correction comes.',
    howToUse: 'Stay diversified even in bull markets. Don\'t abandon your allocation because "stocks only go up." Rebalance to lock in gains. Prepare mentally for the next bear.',
    benchmarks: [
      { name: 'Average Bull Market', value: '4-5 years', description: 'Historical average' },
      { name: '2009-2020 Bull', value: '11 years', description: 'Longest in history' },
    ],
    relatedConcepts: ['Bear Market', 'Market Cycle', 'Correction'],
  },
  'bear-market': {
    description: 'A bear market is a prolonged decline of 20%+ from recent highs. It\'s characterized by pessimism, fear, and often economic recession. Everything feels hopeless—but they always end.',
    whyItMatters: 'Bear markets test your resolve. Those who stay invested and even buy more are rewarded when the market recovers. Those who panic sell lock in losses.',
    howToUse: 'Have a plan before the bear arrives. Keep emergency fund so you\'re never forced to sell. Consider buying more if you have long horizon. Remember: every bear has ended.',
    benchmarks: [
      { name: 'Average Bear Market', value: '13 months', description: 'Much shorter than bulls' },
      { name: 'Average Decline', value: '-35%', description: 'Painful but temporary' },
    ],
    relatedConcepts: ['Bull Market', 'Panic Selling', 'Recovery'],
  },
  'correction': {
    description: 'A correction is a decline of 10-20% from recent highs. It\'s a normal part of healthy markets and happens roughly once per year on average.',
    whyItMatters: 'Corrections are opportunities, not disasters. They reset valuations and shake out weak hands. Long-term investors should welcome them as buying opportunities.',
    howToUse: 'Expect corrections annually. Don\'t panic. Consider adding to positions if you have spare cash. Never sell just because prices dropped 10%.',
    benchmarks: [
      { name: 'Frequency', value: 'Once per year', description: 'On average' },
      { name: 'Recovery Time', value: '3-4 months', description: 'Usually quick' },
    ],
    relatedConcepts: ['Bear Market', 'Volatility', 'Buying Opportunities'],
  },
  'financial-goals': {
    description: 'Financial goals are the specific objectives you\'re investing for—retirement, house down payment, education, financial independence. They drive your investment strategy.',
    whyItMatters: 'Without clear goals, you can\'t create an appropriate strategy. Different goals require different risk levels and time horizons.',
    howToUse: 'Define specific goals with target amounts and dates. Assign separate accounts to different goals. Match risk to each goal\'s timeline.',
    relatedConcepts: ['Time Horizon', 'Asset Allocation', 'Financial Planning'],
  },
  'retirement': {
    description: 'Retirement is the phase of life when you stop working and live off your accumulated wealth. Planning for it requires decades of saving and investing.',
    whyItMatters: 'Retirement is most people\'s biggest financial goal. It requires replacing your income for 20-30+ years. Starting early is crucial due to compounding.',
    howToUse: 'Start saving in your 20s. Max out tax-advantaged accounts. Reduce risk as you approach retirement. Plan for healthcare costs.',
    benchmarks: [
      { name: 'Target Savings', value: '25x expenses', description: '4% withdrawal rule' },
      { name: 'Average Retirement Age', value: '62-65', description: 'But varies widely' },
    ],
    relatedConcepts: ['401(k)', 'IRA', 'Time Horizon', 'Sequence Risk'],
  },
  'yield': {
    description: 'Yield is the income generated by an investment, expressed as a percentage of its price. Bond yields are interest payments; stock yields are dividends.',
    whyItMatters: 'Yield provides regular income regardless of price movements. High yield can be attractive but may indicate higher risk. Focus on total return, not just yield.',
    howToUse: 'Compare yields to benchmarks. Be wary of unusually high yields—they often signal distress. Consider after-tax yield in taxable accounts.',
    relatedConcepts: ['Fixed Income', 'Dividends', 'Total Return'],
  },
  'duration': {
    description: 'Duration measures a bond\'s sensitivity to interest rate changes. Higher duration = more price volatility when rates move. A bond with 10-year duration loses ~10% if rates rise 1%.',
    whyItMatters: 'Rising rates hurt existing bonds. The 2022 bond crash was caused by rising rates hitting long-duration bonds. Duration risk is often underestimated.',
    howToUse: 'Keep duration shorter if you expect rising rates. Match duration to your holding period. Short-duration bonds are more stable but have lower yields.',
    ranges: [
      { label: 'Short', range: '0-3 years', meaning: 'Low rate sensitivity, stable prices' },
      { label: 'Intermediate', range: '3-7 years', meaning: 'Moderate sensitivity' },
      { label: 'Long', range: '7+ years', meaning: 'High sensitivity to rate changes' },
    ],
    relatedConcepts: ['Fixed Income', 'Interest Rate Risk', 'Bond Prices'],
  },
  'tax-efficiency': {
    description: 'Tax efficiency is minimizing the taxes paid on investment returns through smart account placement, holding periods, and investment selection.',
    whyItMatters: 'Taxes can eat 20-40% of your returns if you\'re not careful. Tax-efficient investing can add 1-2% annually to your after-tax returns.',
    howToUse: 'Hold stocks in taxable accounts (lower rates). Hold bonds in tax-advantaged accounts. Hold investments for 1+ years for long-term capital gains rates. Use tax-loss harvesting.',
    relatedConcepts: ['Capital Gains', 'Tax-Loss Harvesting', 'Asset Location'],
  },
  'capital-gains': {
    description: 'Capital gains are profits from selling an investment for more than you paid. Short-term gains (held <1 year) are taxed as income; long-term gains (1+ years) get lower rates.',
    whyItMatters: 'Long-term capital gains rates (0-20%) are much lower than income tax rates (up to 37%). Holding for 1+ year can save you significant taxes.',
    howToUse: 'Hold winning positions for at least 1 year before selling. Consider tax impact when rebalancing. Use tax-advantaged accounts for frequent trading.',
    benchmarks: [
      { name: 'Short-Term Rate', value: 'Up to 37%', description: 'Same as income' },
      { name: 'Long-Term Rate', value: '0-20%', description: 'Depends on income' },
    ],
    relatedConcepts: ['Tax Efficiency', 'Holding Period', 'Tax-Loss Harvesting'],
  },
};

export function InvestmentConceptDetail({ concept, open, onOpenChange }: InvestmentConceptDetailProps) {
  const [activeTab, setActiveTab] = useState('learn');

  if (!concept) return null;

  const explanation = CONCEPT_EXPLANATIONS[concept.id] || {
    description: `${concept.name} is an important investment concept that helps guide your portfolio decisions.`,
    whyItMatters: 'Understanding this concept helps you make more informed investment decisions aligned with your goals.',
    howToUse: 'Consult with a financial professional to understand how this applies to your specific situation.',
  };

  const getIcon = () => {
    switch (concept.category) {
      case 'metric': return <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-blue-400" />;
      case 'allocation': return <Scale className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-400" />;
      case 'risk': return <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-rose-400" />;
      case 'strategy': return <Target className="h-5 w-5 sm:h-6 sm:w-6 text-violet-400" />;
      default: return <Info className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />;
    }
  };

  const getCategoryColor = () => {
    switch (concept.category) {
      case 'metric': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'allocation': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'risk': return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      case 'strategy': return 'bg-violet-500/20 text-violet-300 border-violet-500/30';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-xl md:max-w-2xl p-0 flex flex-col"
      >
        {/* Header - Fixed */}
        <SheetHeader className="p-4 sm:p-6 pb-2 sm:pb-4 border-b border-border/50 shrink-0">
          <div className="flex items-start gap-3">
            <div className="p-2.5 sm:p-3 rounded-xl bg-secondary shrink-0">
              {getIcon()}
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-lg sm:text-xl flex flex-wrap items-center gap-2">
                <span className="break-words">{concept.name}</span>
                <Badge variant="outline" className={cn("text-[10px] sm:text-xs shrink-0", getCategoryColor())}>
                  {concept.category.toUpperCase()}
                </Badge>
              </SheetTitle>
              <SheetDescription className="mt-1">
                {concept.value && (
                  <span className="text-base sm:text-lg font-bold text-foreground">
                    Your Value: {concept.value}
                  </span>
                )}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Tabs - Fixed */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid grid-cols-2 mx-4 sm:mx-6 mt-4 shrink-0">
            <TabsTrigger value="learn" className="gap-1.5 sm:gap-2 text-sm">
              <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Learn
            </TabsTrigger>
            <TabsTrigger value="benchmarks" className="gap-1.5 sm:gap-2 text-sm">
              <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Benchmarks
            </TabsTrigger>
          </TabsList>

          {/* Scrollable Content */}
          <ScrollArea className="flex-1 px-4 sm:px-6 pb-6">
            <TabsContent value="learn" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
              {/* Definition */}
              <Card className="border-border/50">
                <CardHeader className="pb-2 sm:pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
                  <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                    <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
                    What is {concept.name}?
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                    {explanation.description}
                  </p>
                </CardContent>
              </Card>

              {/* Why It Matters */}
              <Card className="border-border/50">
                <CardHeader className="pb-2 sm:pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
                  <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                    <Lightbulb className="h-4 w-4 sm:h-5 sm:w-5 text-amber-400 shrink-0" />
                    Why It Matters
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                    {explanation.whyItMatters}
                  </p>
                </CardContent>
              </Card>

              {/* How To Use */}
              <Card className="border-border/50">
                <CardHeader className="pb-2 sm:pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
                  <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                    <Target className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400 shrink-0" />
                    How To Use This
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                    {explanation.howToUse}
                  </p>
                </CardContent>
              </Card>

              {/* Ranges */}
              {explanation.ranges && (
                <Card className="border-border/50">
                  <CardHeader className="pb-2 sm:pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
                    <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                      <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-violet-400 shrink-0" />
                      Typical Ranges
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 sm:space-y-3 px-4 sm:px-6 pb-4 sm:pb-6">
                    {explanation.ranges.map((range, i) => (
                      <div key={i} className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3 p-3 rounded-lg bg-secondary/50">
                        <Badge variant="outline" className="shrink-0 self-start text-xs">
                          {range.range}
                        </Badge>
                        <div>
                          <p className="font-medium text-sm">{range.label}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground">{range.meaning}</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Video Placeholder */}
              <Card className="border-dashed border-2 border-border/50">
                <CardContent className="py-6 sm:py-8 text-center">
                  <Play className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-muted-foreground font-medium text-sm sm:text-base">Educational Video Coming Soon</p>
                  <p className="text-xs sm:text-sm text-muted-foreground/60 mt-1">
                    We're creating video content to help you understand {concept.name.toLowerCase()}.
                  </p>
                </CardContent>
              </Card>

              {/* Related Concepts */}
              {explanation.relatedConcepts && explanation.relatedConcepts.length > 0 && (
                <Card className="border-border/50">
                  <CardHeader className="pb-2 sm:pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
                    <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                      <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400 shrink-0" />
                      Related Concepts
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                    <div className="flex flex-wrap gap-2">
                      {explanation.relatedConcepts.map((related, i) => (
                        <Badge key={i} variant="secondary" className="text-xs sm:text-sm cursor-pointer hover:bg-secondary/80 transition-colors">
                          {related}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="benchmarks" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
              {explanation.benchmarks ? (
                <Card className="border-border/50">
                  <CardHeader className="pb-2 sm:pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
                    <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                      <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
                      Reference Benchmarks
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6 pb-4 sm:pb-6">
                    {explanation.benchmarks.map((benchmark, i) => (
                      <div key={i} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 sm:p-4 rounded-lg bg-secondary/50">
                        <div className="flex-1">
                          <p className="font-medium text-sm sm:text-base">{benchmark.name}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground">{benchmark.description}</p>
                        </div>
                        <div className="text-left sm:text-right">
                          <p className="text-base sm:text-lg font-bold tabular-nums">{benchmark.value}</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ) : (
                <Card className="p-6 sm:p-8 text-center border-border/50">
                  <BarChart3 className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-muted-foreground text-sm sm:text-base">No benchmarks available for this concept.</p>
                </Card>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
