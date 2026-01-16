/**
 * Screener Guide Component
 * Interactive guide showing users how to use the portfolio screener
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  HelpCircle,
  Sparkles,
  Filter,
  BarChart3,
  MousePointerClick,
  Lightbulb,
  Target,
  CheckCircle2,
  ArrowRight,
  Star,
  TrendingUp,
  Shield,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface GuideStep {
  title: string;
  description: string;
  icon: any;
  color: string;
  tips?: string[];
}

const GUIDE_STEPS: GuideStep[] = [
  {
    title: '1. Set Your Filters',
    description: 'Use the filters to narrow down portfolios based on your preferences. You can filter by total returns over different time periods (1-5 years), max loss tolerance, and minimum Sharpe ratio.',
    icon: Filter,
    color: 'text-blue-400',
    tips: [
      'Start with "No filter" to see all options',
      'Use "Min Avg Returns" for growth-focused investing',
      'Use "Max Loss" if you want to limit downside risk',
    ],
  },
  {
    title: '2. Review Portfolio Scores',
    description: 'Each portfolio is scored from 1-10 based on its risk-adjusted performance. Higher scores indicate better balance between returns and risk.',
    icon: Star,
    color: 'text-amber-400',
    tips: [
      '9-10: Excellent - Top tier risk-adjusted returns',
      '7-8: Very Good - Strong performance',
      '5-6: Average - Reasonable for most investors',
      'Below 5: Consider other options',
    ],
  },
  {
    title: '3. Understand the Metrics',
    description: 'Click on any metric in the portfolio details to learn what it means, how it\'s calculated, and what ranges are typical.',
    icon: BarChart3,
    color: 'text-emerald-400',
    tips: [
      'Avg Returns: Annualized return over the period',
      'Sharpe: Return per unit of risk (higher is better)',
      'Max Loss: Worst peak-to-trough decline',
      'Risk Level: Based on volatility and drawdown',
    ],
  },
  {
    title: '4. Explore Holdings',
    description: 'Click on any holding (ticker) within a portfolio to see detailed company information, sector data, and run technical studies like RSI and Moving Averages.',
    icon: MousePointerClick,
    color: 'text-violet-400',
    tips: [
      'Each holding shows estimated annual return',
      'Use "Run Studies" tab for technical analysis',
      'Click "Yahoo Finance" for more details',
    ],
  },
  {
    title: '5. Select & Apply',
    description: 'Once you find a portfolio you like, click "Use This Portfolio" to apply it to your investment plan. You can also adjust the initial capital and time horizon.',
    icon: CheckCircle2,
    color: 'text-primary',
    tips: [
      'Set your actual investment amount',
      'Choose your investment horizon (1-30 years)',
      'The portfolio will be added to your dashboard',
    ],
  },
];

const METRIC_EXPLANATIONS = [
  {
    name: 'Avg Returns',
    short: 'Annualized average return',
    detail: 'Shows the compound annual growth rate. A 10% Avg Return means your investment grows by roughly 10% per year on average.',
    icon: TrendingUp,
    color: 'text-emerald-400',
  },
  {
    name: 'Max Loss',
    short: 'Maximum drawdown',
    detail: 'The largest drop from peak to trough during the period. A -30% Max Loss means at worst, the portfolio dropped 30% from its highest point.',
    icon: Shield,
    color: 'text-red-400',
  },
  {
    name: 'Sharpe Ratio',
    short: 'Risk-adjusted return',
    detail: 'Measures return per unit of risk. Above 1.0 is good, above 2.0 is excellent. Higher means better returns for the risk taken.',
    icon: Zap,
    color: 'text-blue-400',
  },
  {
    name: 'Score (1-10)',
    short: 'Overall portfolio quality',
    detail: 'Combines all metrics into a single score. Considers returns, risk, efficiency, and consistency. Use this for quick comparisons.',
    icon: Star,
    color: 'text-amber-400',
  },
];

export function ScreenerGuide() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
          <HelpCircle className="h-3.5 w-3.5" />
          How to Use
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Portfolio Screener Guide
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-100px)] mt-4 pr-4">
          <div className="space-y-6">
            {/* Quick Summary */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-emerald-500/10 border border-primary/20">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <Lightbulb className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm mb-1">Quick Start</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    The Portfolio Screener helps you discover optimal investment portfolios from 100,000+ combinations. 
                    Filter by your preferences, compare scores, and select the best fit for your goals.
                  </p>
                </div>
              </div>
            </div>

            {/* Step by Step Guide */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Step-by-Step Guide
              </h3>
              
              {GUIDE_STEPS.map((step, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "p-3 rounded-lg border transition-all cursor-pointer",
                    activeStep === idx 
                      ? "bg-muted/50 border-primary/30" 
                      : "bg-muted/20 border-border/50 hover:bg-muted/40"
                  )}
                  onClick={() => setActiveStep(idx)}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn("p-1.5 rounded-lg bg-muted", step.color)}>
                      <step.icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-sm mb-1">{step.title}</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {step.description}
                      </p>
                      
                      {activeStep === idx && step.tips && (
                        <div className="mt-3 space-y-1.5">
                          {step.tips.map((tip, tipIdx) => (
                            <div key={tipIdx} className="flex items-start gap-2 text-xs">
                              <ArrowRight className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                              <span className="text-muted-foreground">{tip}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Metric Explanations */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Understanding Metrics
              </h3>
              
              <div className="grid gap-2">
                {METRIC_EXPLANATIONS.map((metric, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-muted/30 border border-border/50"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <metric.icon className={cn("h-4 w-4", metric.color)} />
                      <span className="font-medium text-sm">{metric.name}</span>
                      <Badge variant="secondary" className="text-[9px] ml-auto">
                        {metric.short}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {metric.detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Pro Tips */}
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
                <Star className="h-4 w-4 text-amber-400" />
                Pro Tips
              </h3>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-amber-400 mt-0.5 shrink-0" />
                  <span>Diversify across asset classes (stocks, bonds, international) for lower risk</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-amber-400 mt-0.5 shrink-0" />
                  <span>Higher returns usually come with higher risk - find your comfort level</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-amber-400 mt-0.5 shrink-0" />
                  <span>Sharpe ratio above 1.0 indicates good risk-adjusted performance</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-amber-400 mt-0.5 shrink-0" />
                  <span>Use the "Run Studies" feature to analyze individual holdings</span>
                </li>
              </ul>
            </div>

            <Button 
              className="w-full" 
              onClick={() => setIsOpen(false)}
            >
              Got It, Let's Start!
            </Button>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
