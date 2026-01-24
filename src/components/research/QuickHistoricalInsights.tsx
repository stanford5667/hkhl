import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { TrendingDown, TrendingUp, Activity, Clock, Target, BarChart3, Info, ChevronDown, ChevronUp, Zap, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export interface StreakData {
  direction: 'up' | 'down';
  consecutiveDays: number;
  totalChange: number;
  startDate: string;
  maxStreak: number;
  avgStreak: number;
  sampleSize: number;
  percentile: number;
  bounceProbability: number;
  avgRecovery: number;
  recoveryPeriod: string;
}

export interface HistoricalPattern {
  id: string;
  name: string;
  winRate: number;
}

interface QuickHistoricalInsightsProps {
  ticker: string;
  streakData?: StreakData | null;
  activePatterns?: HistoricalPattern[];
  isLoading?: boolean;
}

function generateMockStreakData(ticker: string): StreakData {
  // Deterministic mock based on ticker
  const hash = ticker.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const direction = hash % 2 === 0 ? 'down' : 'up';
  const consecutiveDays = (hash % 5) + 1;
  
  return {
    direction,
    consecutiveDays,
    totalChange: direction === 'down' ? -(Math.random() * 5 + 1) : (Math.random() * 5 + 1),
    startDate: new Date(Date.now() - consecutiveDays * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    maxStreak: 7 + (hash % 4),
    avgStreak: 2.4 + (hash % 10) / 10,
    sampleSize: 50 + (hash % 50),
    percentile: 20 + (hash % 60),
    bounceProbability: 45 + (hash % 30),
    avgRecovery: 0.8 + (hash % 20) / 10,
    recoveryPeriod: '1 week',
  };
}

function generateMockPatterns(ticker: string): HistoricalPattern[] {
  const hash = ticker.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  const patterns: HistoricalPattern[] = [];
  if (hash % 3 === 0) {
    patterns.push({ id: 'oversold_bounce', name: 'Oversold Bounce Setup', winRate: 58 + (hash % 12) });
  }
  if (hash % 2 === 0) {
    patterns.push({ id: 'january_seasonality', name: 'January Seasonality', winRate: 55 + (hash % 15) });
  }
  if (hash % 5 === 0) {
    patterns.push({ id: 'gap_fill', name: 'Gap Fill Pattern', winRate: 52 + (hash % 18) });
  }
  
  return patterns;
}

export function QuickHistoricalInsights({ 
  ticker, 
  streakData: externalStreakData,
  activePatterns: externalPatterns,
  isLoading = false 
}: QuickHistoricalInsightsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Use external data or generate mock
  const streakData = useMemo(() => {
    return externalStreakData || generateMockStreakData(ticker);
  }, [ticker, externalStreakData]);
  
  const activePatterns = useMemo(() => {
    return externalPatterns || generateMockPatterns(ticker);
  }, [ticker, externalPatterns]);

  if (isLoading) {
    return <Skeleton className="h-16 w-full" />;
  }

  const isDownStreak = streakData.direction === 'down';
  const StreakIcon = isDownStreak ? TrendingDown : TrendingUp;
  const streakColor = isDownStreak ? 'text-rose-400' : 'text-emerald-400';
  const streakBgColor = isDownStreak ? 'bg-rose-500/10' : 'bg-emerald-500/10';

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-2 space-y-2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Zap className="h-3 w-3 text-primary" />
            <span className="text-[10px] md:text-xs font-medium">Quick Insights for {ticker}</span>
          </div>
          <Badge variant="outline" className="text-[8px] font-normal px-1 py-0">5yr data</Badge>
        </div>

        {/* Main Streak Alert - Compact */}
        <div className={cn("p-1.5 rounded", streakBgColor)}>
          <div className="flex items-center gap-2">
            <div className={cn("p-1 rounded-full", isDownStreak ? "bg-rose-500/20" : "bg-emerald-500/20")}>
              <StreakIcon className={cn("h-3 w-3", streakColor)} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-1 flex-wrap">
                <span className={cn("text-sm font-bold", streakColor)}>
                  {streakData.consecutiveDays} {isDownStreak ? 'Down' : 'Up'} Days
                </span>
                <span className={cn("text-[10px]", streakColor)}>
                  ({streakData.totalChange > 0 ? '+' : ''}{streakData.totalChange.toFixed(1)}%)
                </span>
              </div>
              <p className="text-[9px] text-muted-foreground">
                {ticker} has closed {isDownStreak ? 'lower' : 'higher'} for {streakData.consecutiveDays} days. Top <span className="font-medium text-foreground">{streakData.percentile}%</span> of streaks.
              </p>
              <div className="flex items-center gap-2 mt-1 text-[8px] text-muted-foreground">
                <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" /> Max: {streakData.maxStreak}d</span>
                <span className="flex items-center gap-0.5"><Activity className="h-2.5 w-2.5" /> Avg: {streakData.avgStreak.toFixed(1)}d</span>
                <span className="flex items-center gap-0.5"><BarChart3 className="h-2.5 w-2.5" /> {streakData.sampleSize} samples</span>
              </div>
            </div>
          </div>
        </div>

        {/* Key Metrics - Single row */}
        <div className="grid grid-cols-3 gap-1">
          <div className="p-1 bg-secondary/30 rounded text-center">
            <p className="text-[8px] text-muted-foreground">Streak</p>
            <p className={cn("text-xs font-bold", streakColor)}>{streakData.consecutiveDays}d {isDownStreak ? '↓' : '↑'}</p>
          </div>
          <div className="p-1 bg-secondary/30 rounded text-center">
            <p className="text-[8px] text-muted-foreground">Percentile</p>
            <p className="text-xs font-bold">Top {streakData.percentile}%</p>
          </div>
          <div className="p-1 bg-secondary/30 rounded text-center">
            <p className="text-[8px] text-muted-foreground">Bounce %</p>
            <p className={cn("text-xs font-bold", streakData.bounceProbability >= 55 ? "text-emerald-400" : "")}>{streakData.bounceProbability}%</p>
          </div>
        </div>

        {/* What History Says - Compact */}
        <div className="p-1.5 bg-secondary/20 rounded border border-border">
          <div className="flex items-center gap-1 mb-0.5">
            <Lightbulb className="h-3 w-3 text-amber-400" />
            <span className="text-[9px] font-medium">What History Says</span>
          </div>
          <p className="text-[9px] text-muted-foreground">
            After {streakData.consecutiveDays} {isDownStreak ? 'down' : 'up'} days, {ticker} bounced <span className="text-emerald-400 font-medium">{streakData.bounceProbability}%</span> of the time with avg <span className="text-emerald-400 font-medium">+{streakData.avgRecovery.toFixed(1)}%</span> return.
          </p>
        </div>

        {/* Active Patterns - Inline */}
        {activePatterns.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            <Zap className="h-3 w-3 text-primary" />
            <span className="text-[9px] font-medium mr-1">Patterns:</span>
            {activePatterns.map((pattern) => (
              <Badge 
                key={pattern.id}
                variant="outline" 
                className={cn(
                  "text-[8px] px-1 py-0",
                  pattern.winRate >= 60 ? "border-emerald-500/50 text-emerald-400" : "border-amber-500/50 text-amber-400"
                )}
              >
                {pattern.name} ({pattern.winRate}%)
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
