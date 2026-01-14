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
  'expected-return': {
    description: 'The expected return is the annualized percentage gain you can anticipate from your portfolio based on your asset allocation and historical performance of similar portfolios.',
    whyItMatters: 'This helps you understand if your portfolio is positioned to meet your financial goals. A mismatch between expected returns and goals may require adjusting your timeline or risk tolerance.',
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
    description: 'Maximum drawdown is the largest peak-to-trough decline in your portfolio value during a specific period. It measures the worst-case scenario you should be prepared to endure.',
    whyItMatters: 'Understanding potential losses is crucial for emotional preparedness. If you can\'t stomach a 30% drop, you shouldn\'t be in an aggressive portfolio—even if you want the returns.',
    howToUse: 'Ask yourself: "If my portfolio dropped this much, would I panic sell?" If yes, reduce risk. Your behavioral tolerance matters as much as your financial capacity.',
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
  },
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
};

export function InvestmentConceptDetail({ concept, open, onOpenChange }: InvestmentConceptDetailProps) {
  const [activeTab, setActiveTab] = useState('learn');

  if (!concept) return null;

  const explanation = CONCEPT_EXPLANATIONS[concept.id] || {
    description: `${concept.name} is an important investment concept that helps guide your portfolio decisions.`,
    whyItMatters: 'Understanding this concept helps you make more informed investment decisions aligned with your goals.',
    howToUse: 'Consult with a financial advisor to understand how this applies to your specific situation.',
  };

  const getIcon = () => {
    switch (concept.category) {
      case 'metric': return <BarChart3 className="h-6 w-6 text-blue-400" />;
      case 'allocation': return <Scale className="h-6 w-6 text-emerald-400" />;
      case 'risk': return <AlertTriangle className="h-6 w-6 text-rose-400" />;
      case 'strategy': return <Target className="h-6 w-6 text-violet-400" />;
      default: return <Info className="h-6 w-6 text-muted-foreground" />;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-secondary">
              {getIcon()}
            </div>
            <div>
              <SheetTitle className="text-xl flex items-center gap-2">
                {concept.name}
                <Badge variant="outline" className="ml-2 text-xs">
                  {concept.category.toUpperCase()}
                </Badge>
              </SheetTitle>
              <SheetDescription>
                {concept.value && (
                  <span className="text-lg font-bold text-foreground">
                    Your Value: {concept.value}
                  </span>
                )}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2 mb-6">
            <TabsTrigger value="learn" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Learn
            </TabsTrigger>
            <TabsTrigger value="benchmarks" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Benchmarks
            </TabsTrigger>
          </TabsList>

          <TabsContent value="learn" className="space-y-6">
            {/* Definition */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BookOpen className="h-5 w-5 text-primary" />
                  What is {concept.name}?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {explanation.description}
                </p>
              </CardContent>
            </Card>

            {/* Why It Matters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Lightbulb className="h-5 w-5 text-amber-400" />
                  Why It Matters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {explanation.whyItMatters}
                </p>
              </CardContent>
            </Card>

            {/* How To Use */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Target className="h-5 w-5 text-emerald-400" />
                  How To Use This
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {explanation.howToUse}
                </p>
              </CardContent>
            </Card>

            {/* Ranges */}
            {explanation.ranges && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BarChart3 className="h-5 w-5 text-violet-400" />
                    Typical Ranges
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {explanation.ranges.map((range, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                      <Badge variant="outline" className="shrink-0 mt-0.5">
                        {range.range}
                      </Badge>
                      <div>
                        <p className="font-medium">{range.label}</p>
                        <p className="text-sm text-muted-foreground">{range.meaning}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Video Placeholder */}
            <Card className="border-dashed border-2">
              <CardContent className="py-8 text-center">
                <Play className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-muted-foreground font-medium">Educational Video Coming Soon</p>
                <p className="text-sm text-muted-foreground/60 mt-1">
                  We're creating video content to help you understand {concept.name.toLowerCase()}.
                </p>
              </CardContent>
            </Card>

            {/* Related Concepts */}
            {explanation.relatedConcepts && explanation.relatedConcepts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ArrowRight className="h-5 w-5 text-blue-400" />
                    Related Concepts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {explanation.relatedConcepts.map((related, i) => (
                      <Badge key={i} variant="secondary" className="cursor-pointer hover:bg-secondary/80">
                        {related}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="benchmarks" className="space-y-6">
            {explanation.benchmarks ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Reference Benchmarks
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {explanation.benchmarks.map((benchmark, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                      <div>
                        <p className="font-medium">{benchmark.name}</p>
                        <p className="text-sm text-muted-foreground">{benchmark.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold tabular-nums">{benchmark.value}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : (
              <Card className="p-8 text-center">
                <BarChart3 className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-muted-foreground">No benchmarks available for this concept.</p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
