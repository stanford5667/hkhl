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
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  const isDownStreak = streakData.direction === 'down';
  const StreakIcon = isDownStreak ? TrendingDown : TrendingUp;
  const streakColor = isDownStreak ? 'text-rose-400' : 'text-emerald-400';
  const streakBgColor = isDownStreak ? 'bg-rose-500/10' : 'bg-emerald-500/10';

  return (
    <Card className="bg-card border-border overflow-hidden">
      <CardHeader className="pb-2 md:pb-3 px-3 md:px-6 pt-3 md:pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 md:gap-2">
            <Zap className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary" />
            <CardTitle className="text-sm md:text-base font-medium">Quick Insights for {ticker}</CardTitle>
          </div>
          <Badge variant="outline" className="text-[10px] md:text-xs font-normal px-1.5 hidden sm:inline-flex">
            5yr data
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3 md:space-y-4 px-3 md:px-6 pb-3 md:pb-6">
        {/* Main Streak Alert */}
        <div className={cn("p-2.5 md:p-4 rounded-lg", streakBgColor)}>
          <div className="flex items-start gap-2 md:gap-3">
            <div className={cn("p-1.5 md:p-2 rounded-full", isDownStreak ? "bg-rose-500/20" : "bg-emerald-500/20")}>
              <StreakIcon className={cn("h-4 w-4 md:h-5 md:w-5", streakColor)} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-1.5 md:gap-2 flex-wrap">
                <span className={cn("text-lg md:text-2xl font-bold", streakColor)}>
                  {streakData.consecutiveDays} {isDownStreak ? 'Down' : 'Up'} Days
                </span>
                <span className={cn("text-xs md:text-sm", streakColor)}>
                  ({streakData.totalChange > 0 ? '+' : ''}{streakData.totalChange.toFixed(1)}%)
                </span>
              </div>
              <p className="text-xs md:text-sm text-muted-foreground mt-0.5 md:mt-1 line-clamp-2 md:line-clamp-none">
                {ticker} has closed {isDownStreak ? 'lower' : 'higher'} for {streakData.consecutiveDays} days. 
                Top <span className="font-medium text-foreground">{streakData.percentile}%</span> of streaks.
              </p>
              <div className="flex items-center gap-3 md:gap-4 mt-2 md:mt-3 text-[10px] md:text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-0.5 md:gap-1">
                  <Clock className="h-3 w-3" />
                  Max: {streakData.maxStreak}d
                </span>
                <span className="flex items-center gap-0.5 md:gap-1">
                  <Activity className="h-3 w-3" />
                  Avg: {streakData.avgStreak.toFixed(1)}d
                </span>
                <span className="hidden sm:flex items-center gap-0.5">
                  <BarChart3 className="h-3 w-3" />
                  {streakData.sampleSize} samples
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-3 gap-2 md:gap-3">
          <div className="p-2 md:p-3 bg-secondary/30 rounded-lg">
            <p className="text-[10px] md:text-xs text-muted-foreground mb-0.5">Streak</p>
            <p className={cn("text-sm md:text-lg font-bold", streakColor)}>
              {streakData.consecutiveDays}d {isDownStreak ? '↓' : '↑'}
            </p>
          </div>
          <div className="p-2 md:p-3 bg-secondary/30 rounded-lg">
            <p className="text-[10px] md:text-xs text-muted-foreground mb-0.5">Percentile</p>
            <p className="text-sm md:text-lg font-bold text-foreground">Top {streakData.percentile}%</p>
          </div>
          <div className="p-2 md:p-3 bg-secondary/30 rounded-lg">
            <p className="text-[10px] md:text-xs text-muted-foreground mb-0.5">Bounce %</p>
            <p className={cn("text-sm md:text-lg font-bold", streakData.bounceProbability >= 55 ? "text-emerald-400" : "text-foreground")}>
              {streakData.bounceProbability}%
            </p>
          </div>
        </div>

        {/* What History Suggests - Compact on mobile */}
        <div className="p-2 md:p-3 bg-secondary/20 rounded-lg border border-border">
          <div className="flex items-center gap-1.5 md:gap-2 mb-1 md:mb-2">
            <Lightbulb className="h-3.5 w-3.5 md:h-4 md:w-4 text-amber-400" />
            <span className="text-xs md:text-sm font-medium">What History Says</span>
          </div>
          <p className="text-[11px] md:text-sm text-muted-foreground leading-relaxed">
            After {streakData.consecutiveDays} {isDownStreak ? 'down' : 'up'} days, {ticker} bounced{' '}
            <span className="text-emerald-400 font-medium">{streakData.bounceProbability}%</span> of the time
            with avg <span className="text-emerald-400 font-medium">+{streakData.avgRecovery.toFixed(1)}%</span> return.
          </p>
        </div>

        {/* Active Patterns - More compact */}
        {activePatterns.length > 0 && (
          <div className="space-y-1.5 md:space-y-2">
            <div className="flex items-center gap-1.5 md:gap-2">
              <Zap className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary" />
              <span className="text-xs md:text-sm font-medium">Active Patterns</span>
            </div>
            <div className="flex flex-wrap gap-1.5 md:gap-2">
              {activePatterns.map((pattern) => (
                <Badge 
                  key={pattern.id}
                  variant="outline" 
                  className={cn(
                    "text-[10px] md:text-xs px-1.5 md:px-2",
                    pattern.winRate >= 60 ? "border-emerald-500/50 text-emerald-400" : "border-amber-500/50 text-amber-400"
                  )}
                >
                  {pattern.name} ({pattern.winRate}%)
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Expandable Current Streak Section */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 hover:bg-secondary/30 rounded-md transition-colors">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Current Streak</span>
            <Info className="h-3.5 w-3.5 text-muted-foreground" />
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 ml-auto text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 ml-auto text-muted-foreground" />
            )}
          </CollapsibleTrigger>
          
          <CollapsibleContent className="pt-3 space-y-4">
            <p className="text-sm text-muted-foreground">
              How {ticker} is performing right now compared to its history
            </p>
            
            {/* Streak Display */}
            <div className={cn("p-4 rounded-lg", streakBgColor)}>
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-full", isDownStreak ? "bg-rose-500/20" : "bg-emerald-500/20")}>
                  <StreakIcon className={cn("h-5 w-5", streakColor)} />
                </div>
                <div>
                  <span className={cn("text-2xl font-bold", streakColor)}>
                    {streakData.consecutiveDays}
                  </span>
                  <span className="text-muted-foreground ml-2">consecutive {isDownStreak ? 'DOWN' : 'UP'} days</span>
                  <p className="text-sm text-muted-foreground">
                    Since {streakData.startDate} ({streakData.totalChange > 0 ? '+' : ''}{streakData.totalChange.toFixed(1)}% total)
                  </p>
                </div>
              </div>
            </div>

            {/* Historical Context */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Historical Context</span>
              </div>
              <p className="text-xs text-muted-foreground">Current vs Maximum Streak</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{streakData.consecutiveDays} of {streakData.maxStreak} days max</span>
              </div>
              <div className="relative">
                <Progress 
                  value={(streakData.consecutiveDays / streakData.maxStreak) * 100} 
                  className="h-3 bg-secondary" 
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>0 days</span>
                  <div className="flex gap-4">
                    <span className="text-primary">● Avg: {streakData.avgStreak.toFixed(1)}d</span>
                    <span>● Max: {streakData.maxStreak}d</span>
                  </div>
                </div>
              </div>
            </div>

            {/* How Often */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">How often does this happen?</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-3xl font-bold">{streakData.sampleSize}</p>
                  <p className="text-xs text-muted-foreground">
                    times {ticker} has been {isDownStreak ? 'down' : 'up'} exactly {streakData.consecutiveDays} days in a row
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold">{Math.round(streakData.sampleSize * 0.7)}</p>
                  <p className="text-xs text-muted-foreground">
                    times it continued beyond {streakData.consecutiveDays} days
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                When {ticker} reached {streakData.consecutiveDays} consecutive {isDownStreak ? 'down' : 'up'} days, 
                it continued to {streakData.consecutiveDays + 1}+ days {Math.round((streakData.sampleSize * 0.7 / streakData.sampleSize) * 100)}% of the time 
                and reversed {100 - Math.round((streakData.sampleSize * 0.7 / streakData.sampleSize) * 100)}% of the time.
              </p>
            </div>

            {/* What Typically Happens Next */}
            <div className="p-3 bg-secondary/20 rounded-lg border border-border">
              <div className="flex items-center gap-2 mb-3">
                <Target className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">What Typically Happens Next</span>
                <Info className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Avg 1-Week Return</p>
                  <p className="text-xl font-bold text-emerald-400">+{streakData.avgRecovery.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Win Rate (1 Week)</p>
                  <p className="text-xl font-bold text-emerald-400">{streakData.bounceProbability}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Sample Size</p>
                  <p className="text-xl font-bold">{streakData.sampleSize}</p>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
