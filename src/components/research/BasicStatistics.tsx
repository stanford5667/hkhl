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
    <Card className="bg-card border-border p-2">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <BarChart3 className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-medium">Basic Statistics</span>
        </div>
        <Select value={timeRange} onValueChange={(v) => onTimeRangeChange?.(v as any)}>
          <SelectTrigger className="w-16 h-6 text-[10px] px-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1Y" className="text-xs">1Y</SelectItem>
            <SelectItem value="3Y" className="text-xs">3Y</SelectItem>
            <SelectItem value="5Y" className="text-xs">5Y</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-3">
        {/* Average Daily Move */}
        <div className="p-2 bg-secondary/20 rounded border border-border">
          <div className="flex items-center gap-1.5 mb-1">
            <Activity className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-xs font-medium text-emerald-400">Average Daily Move</span>
          </div>
          <div className="flex items-baseline gap-1.5 mb-1">
            <span className="text-xl font-bold">${stats.avgDailyMove.toFixed(2)}</span>
            <span className="text-[10px] text-muted-foreground">/ day</span>
            <span className="text-[10px] text-muted-foreground">({stats.avgDailyMovePercent.toFixed(2)}%)</span>
          </div>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            On a typical day, {ticker} moves about ${stats.avgDailyMove.toFixed(2)} ({stats.avgDailyMovePercent.toFixed(2)}%) 
            from its opening price. This helps you understand how much daily fluctuation to expect.
          </p>
        </div>

        {/* Up Days vs Down Days */}
        <div className="p-2 bg-secondary/20 rounded border border-border">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-xs font-medium text-emerald-400">Up Days vs Down Days</span>
          </div>
          
          <div className="grid grid-cols-3 gap-1.5 mb-2">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded p-2 text-center">
              <div className="flex items-center justify-center gap-0.5 text-emerald-400 mb-0.5">
                <TrendingUp className="h-3 w-3" />
                <span className="text-[9px]">Up</span>
              </div>
              <p className="text-lg font-bold text-emerald-400">{stats.upDays}</p>
              <p className="text-[9px] text-emerald-400/70">{upPercent}%</p>
            </div>
            
            <div className="bg-rose-500/10 border border-rose-500/20 rounded p-2 text-center">
              <div className="flex items-center justify-center gap-0.5 text-rose-400 mb-0.5">
                <TrendingDown className="h-3 w-3" />
                <span className="text-[9px]">Down</span>
              </div>
              <p className="text-lg font-bold text-rose-400">{stats.downDays}</p>
              <p className="text-[9px] text-rose-400/70">{downPercent}%</p>
            </div>
            
            <div className="bg-secondary/50 border border-border rounded p-2 text-center">
              <div className="flex items-center justify-center gap-0.5 text-muted-foreground mb-0.5">
                <Minus className="h-3 w-3" />
                <span className="text-[9px]">Flat</span>
              </div>
              <p className="text-lg font-bold">{stats.flatDays}</p>
              <p className="text-[9px] text-muted-foreground">{flatPercent}%</p>
            </div>
          </div>
          
          {/* Stacked Bar */}
          <div className="h-2 rounded-full overflow-hidden flex mb-2">
            <div className="bg-emerald-500 h-full" style={{ width: `${upPercent}%` }} />
            <div className="bg-rose-500 h-full" style={{ width: `${downPercent}%` }} />
            <div className="bg-muted h-full" style={{ width: `${flatPercent}%` }} />
          </div>
          
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            {ticker} has closed higher than it opened on <span className="font-medium text-foreground">{upPercent}%</span> of trading days. 
            For roughly every {Math.max(1, Math.round(Number(upPercent) / Math.max(1, 100 - Number(upPercent))))} up days, there has been 1 down day.
          </p>
        </div>

        {/* Extreme Days */}
        <div className="p-2 bg-secondary/20 rounded border border-border">
          <div className="flex items-center gap-1.5 mb-2">
            <Zap className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-xs font-medium text-amber-400">Extreme Days (Best & Worst)</span>
          </div>
          
          <div className="grid grid-cols-2 gap-1.5 mb-2">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded p-2">
              <div className="flex items-center gap-1 text-emerald-400 mb-1">
                <TrendingUp className="h-3 w-3" />
                <span className="text-[9px] font-medium">Best Day</span>
              </div>
              <p className="text-base font-bold text-emerald-400">+{stats.bestDay.change.toFixed(2)}%</p>
              <p className="text-[9px] text-muted-foreground">{stats.bestDay.date}</p>
            </div>
            
            <div className="bg-rose-500/10 border border-rose-500/20 rounded p-2">
              <div className="flex items-center gap-1 text-rose-400 mb-1">
                <TrendingDown className="h-3 w-3" />
                <span className="text-[9px] font-medium">Worst Day</span>
              </div>
              <p className="text-base font-bold text-rose-400">{stats.worstDay.change.toFixed(2)}%</p>
              <p className="text-[9px] text-muted-foreground">{stats.worstDay.date}</p>
            </div>
          </div>
          
          {/* Top 5 Lists */}
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <p className="text-[9px] text-muted-foreground mb-1">Top 5 Best</p>
              <div className="flex flex-wrap gap-1">
                {stats.topBestDays.map((day, i) => (
                  <Badge key={i} variant="outline" className="text-emerald-400 border-emerald-500/30 text-[9px] px-1 py-0">
                    +{day.toFixed(1)}%
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[9px] text-muted-foreground mb-1">Top 5 Worst</p>
              <div className="flex flex-wrap gap-1">
                {stats.topWorstDays.map((day, i) => (
                  <Badge key={i} variant="outline" className="text-rose-400 border-rose-500/30 text-[9px] px-1 py-0">
                    {day.toFixed(1)}%
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            The best single day saw a gain of <span className="font-medium text-emerald-400">+{stats.bestDay.change.toFixed(2)}%</span>, while the worst day dropped <span className="font-medium text-rose-400">{Math.abs(stats.worstDay.change).toFixed(2)}%</span>. 
            These extremes are rare but important to understand when investing.
          </p>
        </div>
      </div>
    </Card>
  );
}
