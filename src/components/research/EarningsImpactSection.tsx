import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Calendar, Target, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EarningsEvent {
  date: string;
  quarter: string;
  epsActual: number;
  epsEstimate: number;
  epsSurprise: number;
  priceReturn5Day: number;
  beatOrMiss: 'beat' | 'miss';
}

interface EarningsImpactSectionProps {
  ticker: string;
  nextEarnings?: string;
}

// Historical earnings data for major tickers
const tickerEarningsData: Record<string, EarningsEvent[]> = {
  AAPL: [
    { date: '2024-05-02', quarter: 'Q2 2024', epsActual: 1.53, epsEstimate: 1.50, epsSurprise: 2.00, priceReturn5Day: 6.0, beatOrMiss: 'beat' },
    { date: '2024-02-01', quarter: 'Q1 2024', epsActual: 2.18, epsEstimate: 2.10, epsSurprise: 3.81, priceReturn5Day: 4.2, beatOrMiss: 'beat' },
    { date: '2023-11-02', quarter: 'Q4 2023', epsActual: 1.46, epsEstimate: 1.39, epsSurprise: 5.04, priceReturn5Day: -2.1, beatOrMiss: 'beat' },
    { date: '2023-08-03', quarter: 'Q3 2023', epsActual: 1.26, epsEstimate: 1.19, epsSurprise: 5.88, priceReturn5Day: -4.8, beatOrMiss: 'beat' },
    { date: '2023-04-27', quarter: 'Q2 2023', epsActual: 1.52, epsEstimate: 1.43, epsSurprise: 6.29, priceReturn5Day: 4.7, beatOrMiss: 'beat' },
    { date: '2023-02-02', quarter: 'Q1 2023', epsActual: 1.88, epsEstimate: 1.94, epsSurprise: -3.09, priceReturn5Day: -2.5, beatOrMiss: 'miss' },
  ],
  META: [
    { date: '2024-04-24', quarter: 'Q1 2024', epsActual: 4.71, epsEstimate: 4.32, epsSurprise: 9.03, priceReturn5Day: -10.6, beatOrMiss: 'beat' },
    { date: '2024-02-01', quarter: 'Q4 2023', epsActual: 5.33, epsEstimate: 4.96, epsSurprise: 7.46, priceReturn5Day: 20.3, beatOrMiss: 'beat' },
    { date: '2023-10-25', quarter: 'Q3 2023', epsActual: 4.39, epsEstimate: 3.63, epsSurprise: 20.94, priceReturn5Day: 3.8, beatOrMiss: 'beat' },
    { date: '2023-07-26', quarter: 'Q2 2023', epsActual: 2.98, epsEstimate: 2.91, epsSurprise: 2.41, priceReturn5Day: 5.2, beatOrMiss: 'beat' },
  ],
  MSFT: [
    { date: '2024-04-25', quarter: 'Q3 2024', epsActual: 2.94, epsEstimate: 2.82, epsSurprise: 4.26, priceReturn5Day: 2.1, beatOrMiss: 'beat' },
    { date: '2024-01-30', quarter: 'Q2 2024', epsActual: 2.93, epsEstimate: 2.78, epsSurprise: 5.40, priceReturn5Day: 1.8, beatOrMiss: 'beat' },
    { date: '2023-10-24', quarter: 'Q1 2024', epsActual: 2.99, epsEstimate: 2.65, epsSurprise: 12.83, priceReturn5Day: -3.8, beatOrMiss: 'beat' },
  ],
  GOOGL: [
    { date: '2024-04-25', quarter: 'Q1 2024', epsActual: 1.89, epsEstimate: 1.51, epsSurprise: 25.17, priceReturn5Day: 10.2, beatOrMiss: 'beat' },
    { date: '2024-01-30', quarter: 'Q4 2023', epsActual: 1.64, epsEstimate: 1.59, epsSurprise: 3.14, priceReturn5Day: -7.5, beatOrMiss: 'beat' },
  ],
  NVDA: [
    { date: '2024-05-22', quarter: 'Q1 2025', epsActual: 6.12, epsEstimate: 5.59, epsSurprise: 9.48, priceReturn5Day: 15.1, beatOrMiss: 'beat' },
    { date: '2024-02-21', quarter: 'Q4 2024', epsActual: 5.16, epsEstimate: 4.64, epsSurprise: 11.21, priceReturn5Day: 8.5, beatOrMiss: 'beat' },
  ],
  TSLA: [
    { date: '2024-04-23', quarter: 'Q1 2024', epsActual: 0.45, epsEstimate: 0.52, epsSurprise: -13.46, priceReturn5Day: 12.1, beatOrMiss: 'miss' },
    { date: '2024-01-24', quarter: 'Q4 2023', epsActual: 0.71, epsEstimate: 0.74, epsSurprise: -4.05, priceReturn5Day: -12.1, beatOrMiss: 'miss' },
  ],
  AMZN: [
    { date: '2024-04-30', quarter: 'Q1 2024', epsActual: 0.98, epsEstimate: 0.83, epsSurprise: 18.07, priceReturn5Day: 3.2, beatOrMiss: 'beat' },
    { date: '2024-02-01', quarter: 'Q4 2023', epsActual: 1.00, epsEstimate: 0.80, epsSurprise: 25.00, priceReturn5Day: 8.1, beatOrMiss: 'beat' },
  ],
};

function generatePlaceholderData(ticker: string): EarningsEvent[] {
  const seed = ticker.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const factor = ((seed % 25) - 12) / 100;
  
  return [
    { date: '2024-04-25', quarter: 'Q1 2024', epsActual: 2.50 * (1 + factor), epsEstimate: 2.40, epsSurprise: 4.17 + factor * 10, priceReturn5Day: 3.5 + factor * 5, beatOrMiss: 'beat' },
    { date: '2024-01-25', quarter: 'Q4 2023', epsActual: 2.35 * (1 + factor), epsEstimate: 2.30, epsSurprise: 2.17 + factor * 8, priceReturn5Day: 2.1 + factor * 4, beatOrMiss: 'beat' },
    { date: '2023-10-25', quarter: 'Q3 2023', epsActual: 2.20 * (1 + factor), epsEstimate: 2.25, epsSurprise: -2.22, priceReturn5Day: -3.2, beatOrMiss: 'miss' },
    { date: '2023-07-25', quarter: 'Q2 2023', epsActual: 2.10 * (1 + factor), epsEstimate: 2.05, epsSurprise: 2.44 + factor * 6, priceReturn5Day: 4.0 + factor * 3, beatOrMiss: 'beat' },
  ];
}

export function EarningsImpactSection({ ticker, nextEarnings }: EarningsImpactSectionProps) {
  const earningsHistory = useMemo(() => {
    const upperSymbol = ticker.toUpperCase();
    return tickerEarningsData[upperSymbol] || generatePlaceholderData(upperSymbol);
  }, [ticker]);

  const stats = useMemo(() => {
    const beats = earningsHistory.filter(e => e.beatOrMiss === 'beat');
    const misses = earningsHistory.filter(e => e.beatOrMiss === 'miss');
    
    return {
      totalReports: earningsHistory.length,
      beatCount: beats.length,
      beatRate: ((beats.length / earningsHistory.length) * 100).toFixed(0),
      avgSurprise: (earningsHistory.reduce((sum, e) => sum + e.epsSurprise, 0) / earningsHistory.length).toFixed(1),
      avgReturnOnBeat: beats.length > 0 
        ? (beats.reduce((sum, e) => sum + e.priceReturn5Day, 0) / beats.length).toFixed(1) 
        : '0.0',
      avgReturnOnMiss: misses.length > 0
        ? (misses.reduce((sum, e) => sum + e.priceReturn5Day, 0) / misses.length).toFixed(1)
        : '0.0',
    };
  }, [earningsHistory]);

  // Show all earnings history instead of just recent 3

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-2 space-y-2">
        {/* Header with next earnings */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <BarChart3 className="h-3 w-3 text-primary" />
            <span className="text-[10px] md:text-xs font-medium">Earnings Impact</span>
          </div>
          {nextEarnings && (
            <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
              <Calendar className="h-2.5 w-2.5" />
              <span>Next: {nextEarnings}</span>
            </div>
          )}
        </div>

        {/* Summary Stats Row */}
        <div className="grid grid-cols-4 gap-2 py-1.5 border-b border-border">
          <div className="text-center">
            <p className="text-[7px] md:text-[8px] text-muted-foreground uppercase">Reports</p>
            <p className="text-xs md:text-sm font-bold">{stats.totalReports}</p>
          </div>
          <div className="text-center">
            <p className="text-[7px] md:text-[8px] text-muted-foreground uppercase">Beat Rate</p>
            <p className="text-xs md:text-sm font-bold text-primary">{stats.beatRate}%</p>
          </div>
          <div className="text-center">
            <p className="text-[7px] md:text-[8px] text-muted-foreground uppercase">Avg Surprise</p>
            <p className={cn(
              "text-xs md:text-sm font-bold",
              parseFloat(stats.avgSurprise) >= 0 ? "text-primary" : "text-destructive"
            )}>
              {parseFloat(stats.avgSurprise) >= 0 ? '+' : ''}{stats.avgSurprise}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-[7px] md:text-[8px] text-muted-foreground uppercase">5D on Beat</p>
            <p className={cn(
              "text-xs md:text-sm font-bold",
              parseFloat(stats.avgReturnOnBeat) >= 0 ? "text-primary" : "text-destructive"
            )}>
              {parseFloat(stats.avgReturnOnBeat) >= 0 ? '+' : ''}{stats.avgReturnOnBeat}%
            </p>
          </div>
        </div>

        {/* Beat vs Miss Performance Comparison */}
        <div className="py-1.5 border-b border-border">
          <p className="text-[8px] text-muted-foreground uppercase mb-1.5">Beat vs Miss Performance</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-primary/10 rounded p-2 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingUp className="h-3 w-3 text-primary" />
                <span className="text-[9px] font-medium text-primary">On Beats</span>
              </div>
              <p className={cn(
                "text-sm font-bold",
                parseFloat(stats.avgReturnOnBeat) >= 0 ? "text-primary" : "text-destructive"
              )}>
                {parseFloat(stats.avgReturnOnBeat) >= 0 ? '+' : ''}{stats.avgReturnOnBeat}%
              </p>
              <p className="text-[8px] text-muted-foreground">Avg 5-Day Return</p>
            </div>
            <div className="bg-destructive/10 rounded p-2 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingDown className="h-3 w-3 text-destructive" />
                <span className="text-[9px] font-medium text-destructive">On Misses</span>
              </div>
              <p className={cn(
                "text-sm font-bold",
                parseFloat(stats.avgReturnOnMiss) >= 0 ? "text-primary" : "text-destructive"
              )}>
                {parseFloat(stats.avgReturnOnMiss) >= 0 ? '+' : ''}{stats.avgReturnOnMiss}%
              </p>
              <p className="text-[8px] text-muted-foreground">Avg 5-Day Return</p>
            </div>
          </div>
        </div>

        {/* Full Earnings History */}
        <div className="space-y-1">
          <p className="text-[8px] text-muted-foreground uppercase">Earnings History</p>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {earningsHistory.map((earning, idx) => (
              <div 
                key={idx} 
                className="flex items-center justify-between py-1 px-1.5 bg-secondary/30 rounded text-[9px] md:text-[10px]"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-muted-foreground w-14">{earning.quarter}</span>
                  <Badge 
                    variant={earning.beatOrMiss === 'beat' ? 'default' : 'destructive'} 
                    className="h-4 px-1.5 text-[8px]"
                  >
                    {earning.beatOrMiss === 'beat' ? 'BEAT' : 'MISS'}
                  </Badge>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <Target className="h-2.5 w-2.5 text-muted-foreground" />
                    <span className={cn(
                      "font-medium tabular-nums",
                      earning.epsSurprise >= 0 ? "text-primary" : "text-destructive"
                    )}>
                      {earning.epsSurprise >= 0 ? '+' : ''}{earning.epsSurprise.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {earning.priceReturn5Day >= 0 ? (
                      <TrendingUp className="h-2.5 w-2.5 text-primary" />
                    ) : (
                      <TrendingDown className="h-2.5 w-2.5 text-destructive" />
                    )}
                    <span className={cn(
                      "font-medium tabular-nums",
                      earning.priceReturn5Day >= 0 ? "text-primary" : "text-destructive"
                    )}>
                      {earning.priceReturn5Day >= 0 ? '+' : ''}{earning.priceReturn5Day.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
