import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, Minus, BarChart3, Activity, Info, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BasicStatsData {
  avgDailyMove: number;
  avgDailyMovePercent: number;
  upDays: number;
  downDays: number;
  flatDays: number;
  totalDays: number;
  bestDay: { date: string; change: number };
  worstDay: { date: string; change: number };
  topBestDays: number[];
  topWorstDays: number[];
}

interface BasicStatisticsProps {
  ticker: string;
  stats?: BasicStatsData | null;
  timeRange?: '1Y' | '3Y' | '5Y';
  onTimeRangeChange?: (range: '1Y' | '3Y' | '5Y') => void;
  isLoading?: boolean;
}

function generateMockStats(ticker: string, timeRange: string): BasicStatsData {
  const hash = ticker.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const multiplier = timeRange === '1Y' ? 252 : timeRange === '3Y' ? 756 : 1260;
  
  const upDays = Math.round(multiplier * (0.5 + (hash % 10) / 100));
  const downDays = Math.round(multiplier * (0.45 + (hash % 8) / 100));
  const flatDays = multiplier - upDays - downDays;
  
  return {
    avgDailyMove: 2.5 + (hash % 20) / 10,
    avgDailyMovePercent: 1.2 + (hash % 15) / 20,
    upDays,
    downDays,
    flatDays: Math.max(0, flatDays),
    totalDays: multiplier,
    bestDay: { 
      date: 'Nov 10, 2022', 
      change: 8 + (hash % 5) + Math.random() 
    },
    worstDay: { 
      date: 'Sep 13, 2022', 
      change: -(5 + (hash % 4) + Math.random()) 
    },
    topBestDays: [
      8.9 + (hash % 10) / 10,
      7.6 + (hash % 8) / 10,
      7.0 + (hash % 6) / 10,
      6.5 + (hash % 5) / 10,
      5.9 + (hash % 4) / 10,
    ],
    topWorstDays: [
      -(5.9 + (hash % 8) / 10),
      -(4.9 + (hash % 7) / 10),
      -(4.2 + (hash % 6) / 10),
      -(4.0 + (hash % 5) / 10),
      -(3.7 + (hash % 4) / 10),
    ],
  };
}

export function BasicStatistics({ 
  ticker, 
  stats: externalStats, 
  timeRange = '3Y',
  onTimeRangeChange,
  isLoading = false 
}: BasicStatisticsProps) {
  const stats = useMemo(() => {
    return externalStats || generateMockStats(ticker, timeRange);
  }, [ticker, externalStats, timeRange]);

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  const upPercent = ((stats.upDays / stats.totalDays) * 100).toFixed(1);
  const downPercent = ((stats.downDays / stats.totalDays) * 100).toFixed(1);
  const flatPercent = ((stats.flatDays / stats.totalDays) * 100).toFixed(1);

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <CardTitle className="text-base font-medium">Basic Statistics</CardTitle>
          </div>
          <Select value={timeRange} onValueChange={(v) => onTimeRangeChange?.(v as any)}>
            <SelectTrigger className="w-24 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1Y">1 Year</SelectItem>
              <SelectItem value="3Y">3 Years</SelectItem>
              <SelectItem value="5Y">5 Years</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Key metrics based on {stats.totalDays} trading days of {ticker} data.{' '}
          <span className="text-primary cursor-pointer hover:underline">Click any metric to learn more.</span>
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Average Daily Move */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-400" />
            <span className="text-sm font-medium text-emerald-400">Average Daily Move</span>
            <Info className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="flex items-baseline gap-2">
            <Zap className="h-5 w-5 text-muted-foreground" />
            <span className="text-3xl font-bold">${stats.avgDailyMove.toFixed(2)}</span>
            <span className="text-muted-foreground">/ day</span>
            <span className="text-muted-foreground">({stats.avgDailyMovePercent.toFixed(2)}%)</span>
          </div>
          <p className="text-sm text-muted-foreground">
            On a typical day, {ticker} moves about ${stats.avgDailyMove.toFixed(2)} (or {stats.avgDailyMovePercent.toFixed(2)}%) 
            from its opening price. This helps you understand how much daily fluctuation to expect.
          </p>
        </div>

        {/* Up Days vs Down Days */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            <span className="text-sm font-medium text-emerald-400">Up Days vs Down Days</span>
            <Info className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            {/* Up Days */}
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-1 text-emerald-400 mb-1">
                <TrendingUp className="h-4 w-4" />
                <span className="text-xs">Up Days</span>
              </div>
              <p className="text-3xl font-bold text-emerald-400">{stats.upDays}</p>
              <p className="text-xs text-emerald-400/70">{upPercent}%</p>
            </div>
            
            {/* Down Days */}
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-1 text-rose-400 mb-1">
                <TrendingDown className="h-4 w-4" />
                <span className="text-xs">Down Days</span>
              </div>
              <p className="text-3xl font-bold text-rose-400">{stats.downDays}</p>
              <p className="text-xs text-rose-400/70">{downPercent}%</p>
            </div>
            
            {/* Flat Days */}
            <div className="bg-secondary/50 border border-border rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <Minus className="h-4 w-4" />
                <span className="text-xs">Flat</span>
              </div>
              <p className="text-3xl font-bold">{stats.flatDays}</p>
              <p className="text-xs text-muted-foreground">{flatPercent}%</p>
            </div>
          </div>
          
          {/* Stacked Bar */}
          <div className="h-3 rounded-full overflow-hidden flex">
            <div 
              className="bg-emerald-500 h-full" 
              style={{ width: `${upPercent}%` }}
            />
            <div 
              className="bg-rose-500 h-full" 
              style={{ width: `${downPercent}%` }}
            />
            <div 
              className="bg-muted h-full" 
              style={{ width: `${flatPercent}%` }}
            />
          </div>
          
          <p className="text-sm text-muted-foreground">
            {ticker} has closed higher than it opened on {upPercent}% of trading days. 
            This means for roughly every {Math.round(Number(upPercent) / (100 - Number(upPercent)))} up days, 
            there has been 1 down day.
          </p>
        </div>

        {/* Extreme Days */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-medium text-amber-400">Extreme Days (Best & Worst)</span>
            <Info className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {/* Best Day */}
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
              <div className="flex items-center gap-1 text-emerald-400 mb-2">
                <TrendingUp className="h-4 w-4" />
                <span className="text-xs font-medium">Best Day</span>
              </div>
              <p className="text-2xl font-bold text-emerald-400">+{stats.bestDay.change.toFixed(2)}%</p>
              <p className="text-xs text-muted-foreground">{stats.bestDay.date}</p>
            </div>
            
            {/* Worst Day */}
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-4">
              <div className="flex items-center gap-1 text-rose-400 mb-2">
                <TrendingDown className="h-4 w-4" />
                <span className="text-xs font-medium">Worst Day</span>
              </div>
              <p className="text-2xl font-bold text-rose-400">{stats.worstDay.change.toFixed(2)}%</p>
              <p className="text-xs text-muted-foreground">{stats.worstDay.date}</p>
            </div>
          </div>
          
          {/* Top 5 Lists */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <p className="text-xs text-muted-foreground mb-2">Top 5 Best Days</p>
              <div className="flex flex-wrap gap-1.5">
                {stats.topBestDays.map((day, i) => (
                  <Badge key={i} variant="outline" className="text-emerald-400 border-emerald-500/30 text-xs">
                    +{day.toFixed(1)}%
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2">Top 5 Worst Days</p>
              <div className="flex flex-wrap gap-1.5">
                {stats.topWorstDays.map((day, i) => (
                  <Badge key={i} variant="outline" className="text-rose-400 border-rose-500/30 text-xs">
                    {day.toFixed(1)}%
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground">
            The best single day saw a gain of +{stats.bestDay.change.toFixed(2)}%, while the worst day dropped {Math.abs(stats.worstDay.change).toFixed(2)}%. 
            These extremes are rare but important to understand when investing.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
