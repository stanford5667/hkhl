/**
 * Interactive Concept Card
 * Educational popup that explains financial concepts in plain English
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HelpCircle, Lightbulb, BookOpen, TrendingUp, TrendingDown,
  BarChart3, Target, ExternalLink, X, ChevronRight, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useLearning } from './LearningContext';

interface ConceptCardProps {
  conceptKey: string;
  title: string;
  shortDescription: string;
  fullExplanation: string;
  whyItMatters: string;
  example?: {
    scenario: string;
    bullishCase: string;
    bearishCase: string;
  };
  relatedConcepts?: string[];
  learnMoreUrl?: string;
  children?: React.ReactNode;
  variant?: 'inline' | 'icon' | 'button';
  className?: string;
}

export function ConceptCard({
  conceptKey,
  title,
  shortDescription,
  fullExplanation,
  whyItMatters,
  example,
  relatedConcepts,
  learnMoreUrl,
  children,
  variant = 'inline',
  className,
}: ConceptCardProps) {
  const [open, setOpen] = useState(false);
  const { markConceptLearned, learningMode } = useLearning();

  const handleOpen = () => {
    setOpen(true);
    markConceptLearned(conceptKey);
  };

  if (!learningMode && variant !== 'button') {
    return <>{children}</>;
  }

  return (
    <>
      {variant === 'inline' && (
        <button
          onClick={handleOpen}
          className={cn(
            "inline-flex items-center gap-1 border-b border-dashed border-primary/50",
            "hover:border-primary hover:text-primary transition-colors cursor-help",
            className
          )}
        >
          {children || title}
          <Sparkles className="h-3 w-3 text-primary animate-pulse" />
        </button>
      )}
      
      {variant === 'icon' && (
        <button
          onClick={handleOpen}
          className={cn(
            "inline-flex items-center justify-center p-1 rounded-full",
            "text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all",
            className
          )}
        >
          <HelpCircle className="h-4 w-4" />
        </button>
      )}
      
      {variant === 'button' && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleOpen}
          className={cn("gap-1.5 text-primary hover:text-primary", className)}
        >
          <Lightbulb className="h-4 w-4" />
          What does this mean?
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 rounded-lg bg-primary/10">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              {title}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Short Description */}
            <div className="p-4 bg-muted/50 rounded-lg border">
              <p className="text-base font-medium">{shortDescription}</p>
            </div>

            {/* Full Explanation */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                <BookOpen className="h-4 w-4" />
                How it works
              </div>
              <p className="text-sm text-foreground/90 leading-relaxed">
                {fullExplanation}
              </p>
            </div>

            {/* Why it Matters */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                <Lightbulb className="h-4 w-4" />
                Why it matters to you
              </div>
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <p className="text-sm text-foreground/90 leading-relaxed">
                  {whyItMatters}
                </p>
              </div>
            </div>

            {/* Example */}
            {example && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  <Target className="h-4 w-4" />
                  Real Example
                </div>
                <p className="text-sm text-muted-foreground">{example.scenario}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium text-sm mb-1">
                      <TrendingUp className="h-4 w-4" />
                      Bullish Signal
                    </div>
                    <p className="text-xs text-foreground/80">{example.bullishCase}</p>
                  </div>
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 font-medium text-sm mb-1">
                      <TrendingDown className="h-4 w-4" />
                      Bearish Signal
                    </div>
                    <p className="text-xs text-foreground/80">{example.bearishCase}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Related Concepts */}
            {relatedConcepts && relatedConcepts.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Related concepts:</p>
                <div className="flex flex-wrap gap-1.5">
                  {relatedConcepts.map(concept => (
                    <Badge key={concept} variant="secondary" className="text-xs">
                      {concept}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Learn More */}
            {learnMoreUrl && (
              <a
                href={learnMoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                Learn more
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}

            {/* XP Earned */}
            <div className="flex items-center justify-center pt-2">
              <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
                <Sparkles className="h-3 w-3 mr-1" />
                +10 XP for learning!
              </Badge>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Pre-built concept definitions for common quant terms
export const QUANT_CONCEPTS = {
  rsi: {
    conceptKey: 'rsi',
    title: 'RSI (Relative Strength Index)',
    shortDescription: 'A momentum indicator that measures if a stock is overbought (too expensive) or oversold (too cheap) on a scale of 0-100.',
    fullExplanation: 'RSI compares the magnitude of recent gains to recent losses to determine if a stock has moved too far, too fast. It looks at the past 14 days (typically) and calculates how much of that movement was up vs down. When RSI goes above 70, it suggests buying pressure has been excessive - the stock may be "overbought" and due for a pullback. Below 30 suggests selling has been overdone - the stock may be "oversold" and due for a bounce.',
    whyItMatters: 'RSI helps you avoid buying at the top or selling at the bottom. If you see a stock you like but its RSI is above 70, you might wait for a better entry. If a stock you own drops but RSI hits 30, it might be a buying opportunity rather than time to panic.',
    example: {
      scenario: 'Apple (AAPL) has rallied 15% in 2 weeks',
      bullishCase: 'RSI at 35 after a pullback - stock may be oversold and ready to bounce',
      bearishCase: 'RSI at 82 after the rally - stock may be overbought and due for a pullback',
    },
    relatedConcepts: ['Momentum', 'Overbought', 'Oversold', 'Mean Reversion'],
    learnMoreUrl: 'https://www.investopedia.com/terms/r/rsi.asp',
  },
  movingAverage: {
    conceptKey: 'movingAverage',
    title: 'Moving Averages',
    shortDescription: 'Smoothed lines that show the average price over time, helping you see the trend without the day-to-day noise.',
    fullExplanation: 'A moving average takes the average closing price over X days. The 50-day MA shows the medium-term trend, while the 200-day MA shows the long-term trend. When price is above these averages, the trend is generally up. When the 50-day crosses above the 200-day ("Golden Cross"), it\'s often seen as bullish. The opposite ("Death Cross") is bearish.',
    whyItMatters: 'Moving averages are like guardrails - they help you stay on the right side of the trend. Many professional traders won\'t buy stocks trading below their 200-day average because the long-term trend is down.',
    example: {
      scenario: 'NVDA is trading at $450',
      bullishCase: 'Price above 20, 50, and 200-day MAs, all trending up - strong uptrend confirmed',
      bearishCase: 'Price below all MAs and 50-day just crossed below 200-day - potential trend reversal',
    },
    relatedConcepts: ['Trend', 'Golden Cross', 'Death Cross', 'Support', 'Resistance'],
    learnMoreUrl: 'https://www.investopedia.com/terms/m/movingaverage.asp',
  },
  volatility: {
    conceptKey: 'volatility',
    title: 'Volatility',
    shortDescription: 'How much a stock\'s price swings up and down. High volatility = bigger swings, more risk but also more opportunity.',
    fullExplanation: 'Volatility is measured as the standard deviation of returns, usually annualized. A stock with 20% volatility could reasonably move 20% up or down in a year. Volatility tends to cluster - periods of high volatility are followed by more high volatility, and calm periods tend to continue.',
    whyItMatters: 'Understanding volatility helps you size positions correctly. A stock with 40% volatility should probably be a smaller position than one with 15% volatility. Volatility also affects options prices and helps set realistic expectations for gains and losses.',
    example: {
      scenario: 'You\'re comparing TSLA (high vol) vs PG (low vol)',
      bullishCase: 'Low volatility stock breaking out - unusual move could have legs',
      bearishCase: 'High volatility in a downtrend - could see sharp, fast drops',
    },
    relatedConcepts: ['Risk', 'ATR', 'Standard Deviation', 'Position Sizing'],
    learnMoreUrl: 'https://www.investopedia.com/terms/v/volatility.asp',
  },
  macd: {
    conceptKey: 'macd',
    title: 'MACD (Moving Average Convergence Divergence)',
    shortDescription: 'A momentum indicator that shows when trend momentum is speeding up or slowing down by comparing two moving averages.',
    fullExplanation: 'MACD takes a fast moving average (12-day) and subtracts a slow one (26-day). The result oscillates around zero. When MACD is positive and rising, upward momentum is accelerating. When it crosses above its signal line (9-day average of MACD), it generates a buy signal. The reverse generates sell signals.',
    whyItMatters: 'MACD often signals trend changes before they\'re obvious in price. If price is still rising but MACD is falling, it warns that momentum is fading and a reversal may be coming.',
    example: {
      scenario: 'SPY has been in a choppy range for a month',
      bullishCase: 'MACD crosses above signal line and goes positive - momentum turning bullish',
      bearishCase: 'MACD makes a lower high while price makes a higher high - bearish divergence warning',
    },
    relatedConcepts: ['Momentum', 'Divergence', 'Moving Averages', 'Crossover'],
    learnMoreUrl: 'https://www.investopedia.com/terms/m/macd.asp',
  },
  winRate: {
    conceptKey: 'winRate',
    title: 'Win Rate',
    shortDescription: 'The percentage of days a stock closes higher than it opened or higher than the previous day.',
    fullExplanation: 'Win rate is simply: up days / total days × 100. Most stocks have a win rate around 52-54% because stocks have a long-term upward bias. A win rate above 55% is notably bullish, while below 50% suggests persistent selling pressure.',
    whyItMatters: 'Win rate alone doesn\'t tell you about magnitude - a stock could win 60% of days but lose more on down days. But it\'s a quick way to gauge overall sentiment. Consistent winners tend to have higher win rates.',
    example: {
      scenario: 'Comparing two stocks for your portfolio',
      bullishCase: '58% win rate over 3 years - consistently finds buyers',
      bearishCase: '47% win rate over 3 years - persistent selling pressure',
    },
    relatedConcepts: ['Probability', 'Expected Value', 'Streaks', 'Momentum'],
  },
  drawdown: {
    conceptKey: 'drawdown',
    title: 'Drawdown',
    shortDescription: 'The peak-to-trough decline during a specific period. It shows the worst-case scenario - how much you would have lost if you bought at the peak.',
    fullExplanation: 'Drawdown measures from the highest high to the subsequent lowest low before a new high is made. A 30% drawdown means the stock dropped 30% from its peak. Recovery time is how long it takes to get back to the prior high.',
    whyItMatters: 'This is the most important risk metric. Investors who cannot tolerate a 30% drawdown may find it difficult to hold through volatility. The S&P 500 has had 50%+ drawdowns in 2000 and 2008. Understanding your tolerance is critical.',
    example: {
      scenario: 'Your portfolio hit $100,000 then dropped to $70,000',
      bullishCase: 'Small drawdowns (under 15%) with quick recoveries - resilient stock',
      bearishCase: 'Frequent large drawdowns (30%+) with long recoveries - high risk',
    },
    relatedConcepts: ['Maximum Drawdown', 'Recovery Time', 'Risk', 'Volatility'],
    learnMoreUrl: 'https://www.investopedia.com/terms/d/drawdown.asp',
  },
};

// Quick wrapper for common concepts
export function LearnRSI({ children }: { children?: React.ReactNode }) {
  return <ConceptCard {...QUANT_CONCEPTS.rsi}>{children}</ConceptCard>;
}

export function LearnMA({ children }: { children?: React.ReactNode }) {
  return <ConceptCard {...QUANT_CONCEPTS.movingAverage}>{children}</ConceptCard>;
}

export function LearnVolatility({ children }: { children?: React.ReactNode }) {
  return <ConceptCard {...QUANT_CONCEPTS.volatility}>{children}</ConceptCard>;
}

export function LearnMACD({ children }: { children?: React.ReactNode }) {
  return <ConceptCard {...QUANT_CONCEPTS.macd}>{children}</ConceptCard>;
}

export function LearnWinRate({ children }: { children?: React.ReactNode }) {
  return <ConceptCard {...QUANT_CONCEPTS.winRate}>{children}</ConceptCard>;
}

export function LearnDrawdown({ children }: { children?: React.ReactNode }) {
  return <ConceptCard {...QUANT_CONCEPTS.drawdown}>{children}</ConceptCard>;
}
