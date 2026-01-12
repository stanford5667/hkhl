/**
 * Result Interpreter Component
 * Provides detailed, educational explanations of study results
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Lightbulb, TrendingUp, TrendingDown, HelpCircle, 
  BookOpen, Target, AlertTriangle, CheckCircle2,
  ArrowRight, Sparkles, Brain
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useLearning } from './LearningContext';

interface ResultInterpreterProps {
  studyId: string;
  studyName: string;
  result: {
    interpretation?: string;
    [key: string]: any;
  };
  ticker: string;
}

// Detailed interpretations for each study type
const STUDY_INTERPRETATIONS: Record<string, (result: any, ticker: string) => {
  headline: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  explanation: string;
  actionItems: string[];
  watchFor: string[];
  relatedStudies: string[];
}> = {
  rsi_analysis: (result, ticker) => {
    const rsi = result.currentRsi || result.rsi || 50;
    const sentiment = rsi > 70 ? 'bearish' : rsi < 30 ? 'bullish' : 'neutral';
    return {
      headline: rsi > 70 
        ? `${ticker} appears OVERBOUGHT` 
        : rsi < 30 
          ? `${ticker} appears OVERSOLD` 
          : `${ticker} is in neutral territory`,
      sentiment,
      explanation: rsi > 70
        ? `With an RSI of ${rsi.toFixed(1)}, ${ticker} has seen strong buying pressure recently. Historically, when stocks reach these levels, they often pull back or consolidate as buyers take profits.`
        : rsi < 30
          ? `With an RSI of ${rsi.toFixed(1)}, ${ticker} has been heavily sold. This often represents capitulation, and many mean-reversion strategies look to buy at these levels.`
          : `With an RSI of ${rsi.toFixed(1)}, ${ticker} is neither overbought nor oversold. The stock is in a balanced state between buyers and sellers.`,
      actionItems: rsi > 70
        ? ['Consider waiting for RSI to drop below 70 before buying', 'If you own it, this might be a good time to take partial profits', 'Watch for divergence - if price makes new high but RSI doesn\'t, that\'s bearish']
        : rsi < 30
          ? ['This could be a buying opportunity for long-term investors', 'Wait for RSI to turn back up before entering (confirmation)', 'Set a stop-loss below recent lows']
          : ['No immediate action needed from RSI perspective', 'Monitor for breakouts above 70 or below 30', 'Combine with trend analysis for better signals'],
      watchFor: rsi > 70
        ? ['Price failing to make new highs', 'RSI divergence', 'Increased selling volume']
        : rsi < 30
          ? ['RSI turning back up', 'Hammer or doji candles', 'Decreasing selling volume']
          : ['Break above 70 for momentum play', 'Drop below 30 for reversal opportunity'],
      relatedStudies: ['MACD Momentum', 'Moving Averages', 'Volume Profile'],
    };
  },
  trend_strength: (result, ticker) => {
    const score = result.score || result.trendScore || 3;
    const sentiment = score >= 4 ? 'bullish' : score <= 1 ? 'bearish' : 'neutral';
    return {
      headline: score >= 4 
        ? `${ticker} has a STRONG uptrend` 
        : score <= 1 
          ? `${ticker} has a WEAK or downtrend` 
          : `${ticker} has a mixed/neutral trend`,
      sentiment,
      explanation: score >= 4
        ? `With a trend score of ${score}/5, ${ticker} is showing strength across multiple timeframes. Price is above key moving averages and the averages are properly aligned (short above medium above long).`
        : score <= 1
          ? `With a trend score of ${score}/5, ${ticker} is showing weakness. Price may be below key moving averages, suggesting a downtrend or transition period.`
          : `With a trend score of ${score}/5, ${ticker} is showing mixed signals. Some indicators are bullish while others are bearish - this often happens during trend transitions.`,
      actionItems: score >= 4
        ? ['Strong trends tend to continue - consider buying dips', 'Use pullbacks to moving averages as entry points', 'Trail your stop-loss to lock in gains']
        : score <= 1
          ? ['Avoid buying until trend improves', 'If you own it, consider reducing position', 'Wait for score to improve to 3+ before considering entry']
          : ['Wait for clarity before making big moves', 'Watch for trend resolution in either direction', 'Consider smaller position sizes due to uncertainty'],
      watchFor: score >= 4
        ? ['Price staying above 20-day MA', 'Higher highs and higher lows', 'Strong volume on up days']
        : score <= 1
          ? ['Death cross (50-day crossing below 200-day)', 'Lower lows continuation', 'Failed rally attempts']
          : ['Golden or death cross forming', 'Breakout from consolidation range', 'Volume surge'],
      relatedStudies: ['Moving Averages', 'RSI Analysis', 'Breakout Analysis'],
    };
  },
  volatility_analysis: (result, ticker) => {
    const vol = result.annualizedVolatility || result.volatility || 25;
    const sentiment = vol > 40 ? 'bearish' : vol < 20 ? 'bullish' : 'neutral';
    return {
      headline: vol > 40 
        ? `${ticker} is HIGHLY volatile` 
        : vol < 20 
          ? `${ticker} has LOW volatility` 
          : `${ticker} has MODERATE volatility`,
      sentiment,
      explanation: vol > 40
        ? `With ${vol.toFixed(1)}% annualized volatility, ${ticker} can swing significantly. In a year, you might see 40%+ moves in either direction. This requires careful position sizing.`
        : vol < 20
          ? `With ${vol.toFixed(1)}% annualized volatility, ${ticker} is relatively stable. This is typical of large, mature companies or utilities.`
          : `With ${vol.toFixed(1)}% annualized volatility, ${ticker} has typical market-like risk. The S&P 500 averages about 15-20% volatility.`,
      actionItems: vol > 40
        ? ['Reduce position size to account for volatility', 'Use wider stop-losses to avoid being stopped out', 'Consider options for defined-risk exposure']
        : vol < 20
          ? ['Can take larger position sizes', 'Good for income-focused portfolios', 'Consider if low vol will persist or if breakout is coming']
          : ['Standard position sizing is appropriate', 'Monitor for volatility expansion or contraction', 'Use for core portfolio positions'],
      watchFor: vol > 40
        ? ['Volatility clustering - more vol begets more vol', 'Major gaps on news', 'Potential for large drawdowns']
        : vol < 20
          ? ['Volatility breakouts (quiet periods often precede big moves)', 'Earnings announcements', 'Sector rotation']
          : ['Changes in volatility trend', 'Correlation with market volatility'],
      relatedStudies: ['Drawdown Analysis', 'Mean Reversion', 'ATR'],
    };
  },
  drawdown_analysis: (result, ticker) => {
    const maxDD = result.maxDrawdown || result.maxDrawdownPercent || 20;
    const sentiment = maxDD > 30 ? 'bearish' : maxDD < 15 ? 'bullish' : 'neutral';
    return {
      headline: maxDD > 30 
        ? `${ticker} has had LARGE drawdowns (${maxDD.toFixed(1)}%)` 
        : maxDD < 15 
          ? `${ticker} has had SMALL drawdowns (${maxDD.toFixed(1)}%)` 
          : `${ticker} has had MODERATE drawdowns (${maxDD.toFixed(1)}%)`,
      sentiment,
      explanation: maxDD > 30
        ? `The worst drop was ${maxDD.toFixed(1)}% from peak to trough. If you invested $10,000 at the wrong time, you would have seen it drop to $${(10000 * (1 - maxDD/100)).toFixed(0)} before recovering.`
        : maxDD < 15
          ? `The worst drop was only ${maxDD.toFixed(1)}%. This relatively shallow drawdown suggests a stable stock that doesn't panic-sell easily.`
          : `The worst drop was ${maxDD.toFixed(1)}%. This is fairly typical for stocks and manageable for most long-term investors.`,
      actionItems: maxDD > 30
        ? ['Ask yourself: could you hold through a 30%+ drop?', 'Consider using stop-losses to limit downside', 'Dollar-cost average to reduce timing risk']
        : maxDD < 15
          ? ['Good candidate for a larger portfolio allocation', 'May be suitable for conservative investors', 'Check if low drawdowns came at cost of returns']
          : ['Typical risk profile - size position accordingly', 'Have a plan for what to do if drawdown occurs', 'Consider it normal market behavior'],
      watchFor: maxDD > 30
        ? ['Signs of another drawdown starting', 'Support levels where previous declines stopped', 'Recovery patterns from past drawdowns']
        : maxDD < 15
          ? ['Unusual spikes in volatility', 'Sector-wide problems that could increase drawdown', 'Complacency - even stable stocks can have big drops']
          : ['Similar drawdown patterns', 'Time to recovery', 'Current position vs recent highs'],
      relatedStudies: ['Volatility Profile', 'Trend Strength', 'Mean Reversion'],
    };
  },
};

// Default interpretation for studies without specific logic
const getDefaultInterpretation = (result: any, ticker: string, studyName: string) => ({
  headline: result.interpretation || `${studyName} analysis complete for ${ticker}`,
  sentiment: result.interpretation?.includes('🟢') ? 'bullish' as const 
    : result.interpretation?.includes('🔴') ? 'bearish' as const 
    : 'neutral' as const,
  explanation: result.interpretation || `The ${studyName} study has been completed. Review the metrics below to understand the current state of ${ticker}.`,
  actionItems: [
    'Review the key metrics in the results',
    'Compare with other stocks you\'re analyzing',
    'Consider running related studies for a complete picture'
  ],
  watchFor: [
    'Changes in these metrics over time',
    'Unusual readings compared to historical averages',
    'Confirmation from other indicators'
  ],
  relatedStudies: ['Trend Strength', 'Volume Profile', 'RSI Analysis'],
});

export function ResultInterpreter({ studyId, studyName, result, ticker }: ResultInterpreterProps) {
  const [open, setOpen] = useState(false);
  const { learningMode, markConceptLearned, addXp } = useLearning();

  const getInterpretation = STUDY_INTERPRETATIONS[studyId] || ((r: any, t: string) => getDefaultInterpretation(r, t, studyName));
  const interpretation = getInterpretation(result, ticker);

  const handleOpen = () => {
    setOpen(true);
    markConceptLearned(`result_${studyId}`);
    addXp(5);
  };

  const sentimentConfig = {
    bullish: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: TrendingUp, color: 'text-emerald-600 dark:text-emerald-400' },
    bearish: { bg: 'bg-red-500/10', border: 'border-red-500/30', icon: TrendingDown, color: 'text-red-600 dark:text-red-400' },
    neutral: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: Target, color: 'text-amber-600 dark:text-amber-400' },
  };

  const config = sentimentConfig[interpretation.sentiment];
  const SentimentIcon = config.icon;

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleOpen}
        className="gap-1.5 text-primary hover:text-primary"
      >
        <Brain className="h-4 w-4" />
        What does this mean?
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className={cn("p-2 rounded-lg", config.bg)}>
                <SentimentIcon className={cn("h-5 w-5", config.color)} />
              </div>
              Understanding Your Results
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Headline */}
            <div className={cn("p-4 rounded-lg border-2", config.bg, config.border)}>
              <p className={cn("text-lg font-semibold", config.color)}>
                {interpretation.headline}
              </p>
            </div>

            {/* Explanation */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                <BookOpen className="h-4 w-4" />
                What this means
              </div>
              <p className="text-sm text-foreground/90 leading-relaxed">
                {interpretation.explanation}
              </p>
            </div>

            {/* Action Items */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                <Target className="h-4 w-4" />
                What you can do
              </div>
              <div className="space-y-2">
                {interpretation.actionItems.map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-start gap-2 text-sm"
                  >
                    <ArrowRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Watch For */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                <AlertTriangle className="h-4 w-4" />
                What to watch for
              </div>
              <div className="grid grid-cols-1 gap-2">
                {interpretation.watchFor.map((item, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm p-2 bg-muted/50 rounded">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Related Studies */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Related studies to consider:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {interpretation.relatedStudies.map(study => (
                  <Badge key={study} variant="secondary" className="text-xs">
                    {study}
                  </Badge>
                ))}
              </div>
            </div>

            {/* XP Earned */}
            <div className="flex items-center justify-center pt-2">
              <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 gap-1">
                <Sparkles className="h-3 w-3" />
                +5 XP for learning!
              </Badge>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
