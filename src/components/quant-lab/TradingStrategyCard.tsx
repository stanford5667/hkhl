/**
 * Trading Strategy Card - Explains how to use study results in a trading strategy
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Target, Shield, TrendingUp, TrendingDown, AlertTriangle,
  Zap, Clock, DollarSign, BarChart3, Lightbulb, CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TradingStrategyCardProps {
  studyId: string;
  result: any;
  ticker: string;
}

interface StrategyContent {
  title: string;
  signal: 'bullish' | 'bearish' | 'neutral';
  entryRules: string[];
  exitRules: string[];
  riskManagement: string[];
  bestUseCases: string[];
  warnings: string[];
}

function getStrategyForStudy(studyId: string, result: any, ticker: string): StrategyContent {
  const analysis = result.analysis?.[0];
  const winRate = analysis?.winRate ?? result.win_rate ?? result.winRate ?? 50;
  const avgReturn = analysis?.avgReturn ?? result.avg_move ?? result.avgReturn ?? 0;
  
  // Determine overall signal
  const signal: 'bullish' | 'bearish' | 'neutral' = 
    winRate >= 55 && avgReturn > 0 ? 'bullish' :
    winRate <= 45 || avgReturn < -0.5 ? 'bearish' : 'neutral';

  const strategies: Record<string, StrategyContent> = {
    // Conditional studies
    after_down_x: {
      title: 'Bounce Trade Strategy',
      signal,
      entryRules: [
        `Enter long when ${ticker} drops ${result.params?.threshold || 2}%+ in a single day`,
        `Wait for confirmation: next candle closes green (above open)`,
        `Stronger signal if volume is below average on down day`,
        `Best entries occur when RSI is below 30 (oversold)`
      ],
      exitRules: [
        `Target: +${Math.max(Math.abs(avgReturn * 1.5), 1).toFixed(1)}% gain (1.5x avg move)`,
        `Stop loss: ${Math.abs(analysis?.worst ?? avgReturn * 2).toFixed(1)}% below entry`,
        `Time exit: Close position within ${analysis?.days || 5} trading days`,
        `Scale out: Sell 50% at target, trail stop on remainder`
      ],
      riskManagement: [
        `Position size: Risk max 2% of portfolio per trade`,
        `Only take trades when win rate is above 55%`,
        `Avoid if stock is in confirmed downtrend (below 200 SMA)`,
        `Skip during earnings week or major news events`
      ],
      bestUseCases: [
        'Mean reversion in range-bound markets',
        'Oversold bounces in overall uptrends',
        'Panic selling exhaustion plays',
        'Support level defense trades'
      ],
      warnings: [
        winRate < 50 ? `⚠️ Below 50% win rate - trade cautiously or skip` : '',
        avgReturn < 0 ? `⚠️ Negative avg return - downtrend may continue` : '',
        `Don't catch falling knives in bear markets`
      ].filter(Boolean)
    },

    after_up_x: {
      title: 'Momentum Continuation Strategy',
      signal,
      entryRules: [
        `Enter long on pullback after ${ticker} gains ${result.params?.threshold || 2}%+`,
        `Wait for 1-2 red candles, then enter on first green close`,
        `Stronger if breakout occurs on above-average volume`,
        `Best when price breaks above recent resistance`
      ],
      exitRules: [
        `Target: Next resistance level or +${Math.max(avgReturn * 1.5, 1.5).toFixed(1)}%`,
        `Stop loss: Below the breakout candle's low`,
        `Trail stop after +2% gain, using 20-period EMA`,
        `Time stop: Exit if no follow-through within 5 days`
      ],
      riskManagement: [
        `Smaller positions if win rate is below 55%`,
        `Confirm trend with 50 SMA sloping upward`,
        `Avoid chasing if already extended 5%+ above 20 EMA`,
        `Reduce size late in bull markets`
      ],
      bestUseCases: [
        'Trend continuation after consolidation',
        'Breakout pullback entries',
        'Earnings gap follow-through',
        'Sector rotation momentum'
      ],
      warnings: [
        winRate < 50 ? `⚠️ Momentum often fades - consider mean reversion` : '',
        `Extended moves often reverse - wait for pullback`
      ].filter(Boolean)
    },

    after_consecutive_days: {
      title: result.params?.direction === 'down' ? 'Oversold Reversal Strategy' : 'Trend Exhaustion Strategy',
      signal,
      entryRules: [
        `Watch for ${result.params?.consecutiveDays || 3}+ consecutive ${result.params?.direction || 'down'} days`,
        `Enter on first reversal candle (opposite direction)`,
        `Stronger signal with increasing volume on reversal`,
        `Confirm with RSI divergence or support/resistance`
      ],
      exitRules: [
        `Target: Mean reversion to 10-day moving average`,
        `Stop: Below reversal candle low (or above high for shorts)`,
        `Time limit: 3-5 trading days maximum hold`,
        `Take profits quickly - don't expect full trend reversal`
      ],
      riskManagement: [
        `These are counter-trend trades - use smaller size`,
        `Risk max 1% per trade (half normal size)`,
        `Have clear invalidation level before entry`,
        `Accept that many will fail - it's a numbers game`
      ],
      bestUseCases: [
        'Oversold/overbought mean reversion',
        'Panic selling capitulation',
        'Trend exhaustion at key levels',
        'Technical bounce trades'
      ],
      warnings: [
        result.params?.direction === 'down' && winRate < 50 ? `⚠️ Downtrend may continue - be cautious` : '',
        `Counter-trend trades are higher risk`
      ].filter(Boolean)
    },

    after_high_volume: {
      title: 'Volume Spike Strategy',
      signal,
      entryRules: [
        `Identify days with ${result.params?.volumeMultiplier || 2}x normal volume`,
        `If price up on high volume: trend continuation likely`,
        `If price down on high volume: watch for reversal next day`,
        `Confirm direction with next day's price action`
      ],
      exitRules: [
        `Target: Previous swing high/low or +${Math.max(avgReturn * 1.5, 2).toFixed(1)}%`,
        `Stop: Below high-volume day's range`,
        `Volume should remain above average for follow-through`,
        `Exit if volume dries up significantly`
      ],
      riskManagement: [
        `Volume confirms price moves - respect the signal`,
        `Higher volume = more significant move`,
        `Low volume reversals often fail`,
        `Watch for distribution patterns at highs`
      ],
      bestUseCases: [
        'Institutional accumulation signals',
        'Climactic selling exhaustion',
        'Breakout confirmation',
        'Trend change identification'
      ],
      warnings: [
        `High volume can mean distribution (selling) at tops`,
        `Verify with price action before trading`
      ].filter(Boolean)
    },

    after_rsi_extreme: {
      title: 'RSI Extreme Strategy',
      signal,
      entryRules: [
        `Enter when RSI reaches ${result.params?.threshold || 30} (oversold) or ${100 - (result.params?.threshold || 30)} (overbought)`,
        `Wait for RSI to turn back (cross above 30 or below 70)`,
        `Look for bullish/bearish divergence for stronger signals`,
        `Combine with support/resistance levels`
      ],
      exitRules: [
        `Target: RSI returning to 50 (neutral zone)`,
        `Stop: New extreme (RSI below 20 or above 80)`,
        `Partial exit at first resistance/support`,
        `Trail using RSI - exit if it reverses back to extreme`
      ],
      riskManagement: [
        `RSI can stay extreme longer than expected`,
        `Use in range-bound markets, not strong trends`,
        `Stronger stocks can have higher "normal" RSI`,
        `Combine with other indicators for confirmation`
      ],
      bestUseCases: [
        'Mean reversion in ranges',
        'Oversold bounce trades',
        'Overbought short entries',
        'Divergence trading'
      ],
      warnings: [
        `RSI divergence can persist - use stop losses`,
        `Trending markets can stay overbought/oversold`
      ]
    },

    // Pattern studies
    range_patterns: {
      title: 'Range Pattern Strategy',
      signal,
      entryRules: [
        `Inside days: Enter breakout direction with stop at opposite end`,
        `Outside days: Fade the direction for mean reversion`,
        `Doji days: Wait for next candle confirmation`,
        `Monitor close position within daily range`
      ],
      exitRules: [
        `Inside day breakout: Target 1.5x the range of inside day`,
        `Outside day fade: Target middle of outside day's range`,
        `Use tight stops - patterns can fail quickly`,
        `Time stop: Exit if no follow-through in 2 days`
      ],
      riskManagement: [
        `Inside days often precede big moves - use proper size`,
        `Outside days show volatility - reduce position size`,
        `Doji = indecision - wait for clarity`,
        `Range contraction often precedes expansion`
      ],
      bestUseCases: [
        'Pre-breakout positioning',
        'Volatility expansion trades',
        'Indecision pattern identification',
        'Trend continuation confirmation'
      ],
      warnings: [
        `Pattern failure is common - always use stops`,
        `Context matters more than the pattern alone`
      ]
    },

    // Seasonality
    day_of_week: {
      title: 'Day-of-Week Strategy',
      signal,
      entryRules: [
        `Identify best and worst performing days from analysis`,
        `Enter before strong days, exit before weak days`,
        `Monday effect: Often negative - buy dips`,
        `Friday effect: Often positive - hold into weekend or sell`
      ],
      exitRules: [
        `Exit before historically weak days`,
        `Hold through historically strong days`,
        `Don't fight the seasonal pattern`,
        `Combine with technical setup for timing`
      ],
      riskManagement: [
        `Seasonality is a tendency, not a guarantee`,
        `Recent patterns may differ from historical`,
        `Use as tiebreaker, not primary signal`,
        `Major news trumps seasonal patterns`
      ],
      bestUseCases: [
        'Position timing optimization',
        'Options expiration strategies',
        'Swing trade timing',
        'Risk management around weak periods'
      ],
      warnings: [
        `Historical patterns don't guarantee future results`,
        `Market regime changes can alter patterns`
      ]
    },

    month_of_year: {
      title: 'Seasonal Monthly Strategy',
      signal,
      entryRules: [
        `Increase exposure before historically strong months`,
        `Reduce exposure before historically weak months`,
        `"Sell in May" effect if applicable`,
        `Year-end rally positioning (if pattern supports)`
      ],
      exitRules: [
        `Trim positions before weak seasonal periods`,
        `Hold through strong seasonal tailwinds`,
        `Annual rebalancing around seasonal patterns`,
        `Take profits during euphoric periods`
      ],
      riskManagement: [
        `Macro events can override seasonality`,
        `Election years have different patterns`,
        `Don't ignore technical breakdowns`,
        `Seasonal edge compounds over many years`
      ],
      bestUseCases: [
        'Long-term portfolio allocation',
        'Tax-loss harvesting timing',
        'Sector rotation',
        'Annual trading plan development'
      ],
      warnings: [
        `"This time is different" sometimes is true`,
        `Seasonality works until it doesn't`
      ]
    }
  };

  // Default strategy for studies without specific mapping
  const defaultStrategy: StrategyContent = {
    title: 'Data-Driven Strategy',
    signal,
    entryRules: [
      `Use the ${winRate.toFixed(1)}% win rate as an edge indicator`,
      `Enter when conditions match the study parameters`,
      `Confirm with additional technical analysis`,
      `Wait for price action confirmation before entry`
    ],
    exitRules: [
      `Target: ${Math.max(Math.abs(avgReturn * 1.5), 1).toFixed(1)}% move in expected direction`,
      `Stop loss: Set before entry based on support/resistance`,
      `Time stop: Exit if no movement within expected timeframe`,
      `Scale out to lock in partial profits`
    ],
    riskManagement: [
      `Position size based on stop distance and 2% max risk`,
      `Higher win rate = can use larger positions`,
      `Lower win rate = need larger winners to compensate`,
      `Track your results to verify edge in live trading`
    ],
    bestUseCases: [
      'Building systematic trading rules',
      'Backtesting strategy validation',
      'Finding statistical edges',
      'Developing trading discipline'
    ],
    warnings: [
      winRate < 50 ? `⚠️ Edge may be negative - verify before trading` : '',
      `Past performance doesn't guarantee future results`
    ].filter(Boolean)
  };

  return strategies[studyId] || defaultStrategy;
}

export function TradingStrategyCard({ studyId, result, ticker }: TradingStrategyCardProps) {
  const strategy = getStrategyForStudy(studyId, result, ticker);

  return (
    <Card className={cn(
      "border-2",
      strategy.signal === 'bullish' && "border-emerald-500/20 bg-emerald-500/5",
      strategy.signal === 'bearish' && "border-red-500/20 bg-red-500/5",
      strategy.signal === 'neutral' && "border-border"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className={cn(
              "h-5 w-5",
              strategy.signal === 'bullish' && "text-emerald-500",
              strategy.signal === 'bearish' && "text-red-500",
              strategy.signal === 'neutral' && "text-muted-foreground"
            )} />
            <CardTitle className="text-base">{strategy.title}</CardTitle>
          </div>
          <Badge variant={
            strategy.signal === 'bullish' ? 'default' :
            strategy.signal === 'bearish' ? 'destructive' : 'secondary'
          }>
            {strategy.signal === 'bullish' ? 'Long Bias' :
             strategy.signal === 'bearish' ? 'Caution' : 'Neutral'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Entry Rules */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            <span className="text-sm font-semibold">Entry Rules</span>
          </div>
          <ul className="space-y-1.5">
            {strategy.entryRules.map((rule, i) => (
              <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                {rule}
              </li>
            ))}
          </ul>
        </div>

        <Separator />

        {/* Exit Rules */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-semibold">Exit Rules</span>
          </div>
          <ul className="space-y-1.5">
            {strategy.exitRules.map((rule, i) => (
              <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                <DollarSign className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                {rule}
              </li>
            ))}
          </ul>
        </div>

        <Separator />

        {/* Risk Management */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-semibold">Risk Management</span>
          </div>
          <ul className="space-y-1.5">
            {strategy.riskManagement.map((rule, i) => (
              <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                <Shield className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
                {rule}
              </li>
            ))}
          </ul>
        </div>

        <Separator />

        {/* Best Use Cases */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="h-4 w-4 text-purple-500" />
            <span className="text-sm font-semibold">Best Use Cases</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {strategy.bestUseCases.map((useCase, i) => (
              <Badge key={i} variant="secondary" className="text-[10px]">
                {useCase}
              </Badge>
            ))}
          </div>
        </div>

        {/* Warnings */}
        {strategy.warnings.length > 0 && (
          <>
            <Separator />
            <div>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-sm font-semibold text-red-600">Warnings</span>
              </div>
              <ul className="space-y-1">
                {strategy.warnings.map((warning, i) => (
                  <li key={i} className="text-xs text-red-600 dark:text-red-400">
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
