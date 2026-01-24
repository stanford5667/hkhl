/**
 * AutoStudiesSection - Compact display of AUTO tier studies for Overview
 * Shows key technical signals from the ticker snapshot
 */

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Activity,
  BarChart3,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTickerSnapshot } from '@/hooks/useTickerSnapshot';

interface AutoStudy {
  id: string;
  name: string;
  signal: 'bullish' | 'bearish' | 'neutral';
  value: string;
  winRate?: number;
  description: string;
}

interface AutoStudiesSectionProps {
  ticker: string;
}

export function AutoStudiesSection({ ticker }: AutoStudiesSectionProps) {
  const { data: snapshot, isLoading } = useTickerSnapshot(ticker);

  const autoStudies: AutoStudy[] = useMemo(() => {
    if (!snapshot) return [];

    const studies: AutoStudy[] = [];

    // RSI Analysis
    if (snapshot.rsi) {
      const rsiValue = snapshot.rsi.currentRSI;
      let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
      let winRate: number | undefined;
      
      if (rsiValue <= 30) {
        signal = 'bullish';
        winRate = snapshot.rsi.oversoldBounces?.winRate;
      } else if (rsiValue >= 70) {
        signal = 'bearish';
        winRate = snapshot.rsi.overboughtDrops?.winRate;
      }

      studies.push({
        id: 'rsi',
        name: 'RSI',
        signal,
        value: `${rsiValue?.toFixed(0) || '—'}`,
        winRate,
        description: signal === 'bullish' ? 'Oversold' : signal === 'bearish' ? 'Overbought' : 'Neutral'
      });
    }

    // Bollinger Bands
    if (snapshot.bollinger) {
      const percentB = snapshot.bollinger.percentB;
      let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
      let winRate: number | undefined;
      
      if (percentB <= 20) {
        signal = 'bullish';
        winRate = snapshot.bollinger.lowerBounceRate || undefined;
      } else if (percentB >= 80) {
        signal = 'bearish';
        winRate = snapshot.bollinger.upperRejectionRate || undefined;
      }

      studies.push({
        id: 'bollinger',
        name: 'Bollinger',
        signal,
        value: `${percentB?.toFixed(0) || '—'}%B`,
        winRate,
        description: signal === 'bullish' ? 'Near Lower' : signal === 'bearish' ? 'Near Upper' : 'Mid-Band'
      });
    }

    // Trend Strength
    if (snapshot.trendStrength) {
      const score = snapshot.trendStrength.score;
      const trend = snapshot.trendStrength.trend;
      const signal: 'bullish' | 'bearish' | 'neutral' = 
        trend === 'bullish' ? 'bullish' : 
        trend === 'bearish' ? 'bearish' : 'neutral';

      studies.push({
        id: 'trend',
        name: 'Trend',
        signal,
        value: `${score?.toFixed(0) || '—'}`,
        description: trend === 'bullish' ? 'Uptrend' : trend === 'bearish' ? 'Downtrend' : 'Sideways'
      });
    }

    // Gap Analysis
    if (snapshot.gaps && snapshot.gaps.recentGaps?.length > 0) {
      const unfilledGaps = snapshot.gaps.recentGaps.filter(g => !g.filled);
      if (unfilledGaps.length > 0) {
        const lastGap = unfilledGaps[0];
        const isUpGap = lastGap.gapPercent > 0;
        studies.push({
          id: 'gaps',
          name: 'Gap',
          signal: isUpGap ? 'bearish' : 'bullish', // Gaps tend to fill
          value: `${unfilledGaps.length} Open`,
          winRate: isUpGap ? snapshot.gaps.upGapFillRate : snapshot.gaps.downGapFillRate,
          description: `${isUpGap ? 'Up' : 'Down'} gap unfilled`
        });
      }
    }

    // Streak Analysis
    if (snapshot.streaks && Math.abs(snapshot.streaks.currentStreak) >= 3) {
      const streak = snapshot.streaks.currentStreak;
      const isWinStreak = streak > 0;
      studies.push({
        id: 'streak',
        name: 'Streak',
        signal: isWinStreak ? 'bearish' : 'bullish', // Mean reversion
        value: `${Math.abs(streak)} Days`,
        description: isWinStreak ? `${streak} up days` : `${Math.abs(streak)} down days`
      });
    }

    // 52-Week Position
    if (snapshot.yearRange) {
      const pos = snapshot.yearRange.currentPosition;
      let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
      
      if (pos <= 20) signal = 'bullish';
      else if (pos >= 80) signal = 'bearish';

      studies.push({
        id: '52w',
        name: '52W Range',
        signal,
        value: `${pos?.toFixed(0) || '—'}%`,
        description: pos <= 20 ? 'Near 52W Low' : pos >= 80 ? 'Near 52W High' : 'Mid-Range'
      });
    }

    return studies;
  }, [snapshot]);

  const signalConfig = {
    bullish: {
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/30',
      icon: TrendingUp
    },
    bearish: {
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
      borderColor: 'border-destructive/30',
      icon: TrendingDown
    },
    neutral: {
      color: 'text-muted-foreground',
      bgColor: 'bg-secondary/50',
      borderColor: 'border-border',
      icon: Minus
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Auto Studies</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (autoStudies.length === 0) {
    return null;
  }

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Auto Studies</span>
          <Badge variant="outline" className="text-[9px] ml-auto">
            TIER 1 • INSTANT
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {autoStudies.map((study) => {
            const config = signalConfig[study.signal];
            const Icon = config.icon;
            
            return (
              <div
                key={study.id}
                className={cn(
                  "p-2 rounded-lg border transition-all",
                  config.bgColor,
                  config.borderColor
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-medium text-muted-foreground">{study.name}</span>
                  <Icon className={cn("h-3 w-3", config.color)} />
                </div>
                <div className={cn("text-sm font-bold", config.color)}>
                  {study.value}
                </div>
                <div className="text-[9px] text-muted-foreground truncate">
                  {study.description}
                </div>
                {study.winRate && (
                  <div className="text-[8px] text-muted-foreground mt-0.5">
                    {study.winRate.toFixed(0)}% hist. win
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default AutoStudiesSection;
