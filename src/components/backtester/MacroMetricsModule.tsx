import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Flame, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

const STREAK_DATA = {
  longestWinning: { days: 23, avgReturn: '+1.2%', dates: 'Mar 5 - Apr 2, 2023' },
  current: { days: 5, type: 'winning' as const, avgReturn: '+0.8%' },
  longestLosing: { days: 12, avgReturn: '-1.8%', dates: 'Sep 15 - Oct 1, 2022' },
};

const RETURN_STATISTICS = {
  daily: {
    mean: '0.08%',
    median: '0.05%',
    stdDev: '1.24%',
    skewness: '-0.32',
    kurtosis: '4.12',
    positivePercent: '54.2%',
  },
  weekly: {
    mean: '0.42%',
    median: '0.38%',
    stdDev: '2.85%',
    skewness: '-0.18',
    kurtosis: '3.45',
    positivePercent: '58.1%',
  },
  monthly: {
    mean: '1.54%',
    median: '1.42%',
    stdDev: '4.92%',
    skewness: '-0.08',
    kurtosis: '2.98',
    positivePercent: '62.5%',
  },
};

const MACRO_EVENTS = [
  { id: 'fedRate', label: 'Fed Rate Hikes', icon: TrendingUp },
  { id: 'cpi', label: 'CPI Above 5%', icon: TrendingUp },
  { id: 'earnings', label: 'Earnings Season', icon: Calendar },
  { id: 'election', label: 'Election Years', icon: Calendar },
];

const EVENT_PERFORMANCE_DATA: Record<string, Array<{
  date: string;
  type: string;
  marketReturn: number;
  portfolioReturn: number;
}>> = {
  fedRate: [
    { date: 'Mar 22, 2023', type: 'Rate Hike +25bps', marketReturn: -1.2, portfolioReturn: 0.8 },
    { date: 'May 3, 2023', type: 'Rate Hike +25bps', marketReturn: -0.8, portfolioReturn: 0.2 },
    { date: 'Jul 26, 2023', type: 'Rate Hike +25bps', marketReturn: 0.4, portfolioReturn: 1.1 },
    { date: 'Sep 20, 2023', type: 'Rate Pause', marketReturn: -0.5, portfolioReturn: -0.3 },
  ],
  cpi: [
    { date: 'Jan 12, 2023', type: 'CPI 6.5%', marketReturn: 0.3, portfolioReturn: 1.2 },
    { date: 'Feb 14, 2023', type: 'CPI 6.4%', marketReturn: -1.1, portfolioReturn: -0.4 },
    { date: 'Mar 14, 2023', type: 'CPI 6.0%', marketReturn: 0.8, portfolioReturn: 1.5 },
  ],
  earnings: [
    { date: 'Q1 2023', type: 'Earnings Season', marketReturn: 2.4, portfolioReturn: 3.8 },
    { date: 'Q2 2023', type: 'Earnings Season', marketReturn: 1.8, portfolioReturn: 2.2 },
    { date: 'Q3 2023', type: 'Earnings Season', marketReturn: -1.2, portfolioReturn: -0.5 },
    { date: 'Q4 2023', type: 'Earnings Season', marketReturn: 3.1, portfolioReturn: 4.5 },
  ],
  election: [
    { date: '2020', type: 'Presidential Election', marketReturn: 16.3, portfolioReturn: 22.1 },
    { date: '2022', type: 'Midterm Election', marketReturn: -19.4, portfolioReturn: -12.8 },
  ],
};

export function MacroMetricsModule() {
  const [activeEvents, setActiveEvents] = useState<string[]>([]);

  const toggleEvent = (eventId: string) => {
    setActiveEvents((prev) =>
      prev.includes(eventId)
        ? prev.filter((id) => id !== eventId)
        : [...prev, eventId]
    );
  };

  const getActiveEventsData = () => {
    return activeEvents.flatMap((eventId) => 
      (EVENT_PERFORMANCE_DATA[eventId] || []).map((event) => ({
        ...event,
        eventType: eventId,
      }))
    );
  };

  return (
    <div className="space-y-6">
      {/* Section 1: Streak Tracking */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Streak Tracking</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Longest Winning Streak */}
          <Card className="border-emerald-500/20 bg-emerald-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Flame className="h-4 w-4 text-emerald-500" />
                <span className="text-sm text-muted-foreground">Longest Winning Streak</span>
              </div>
              <p className="text-3xl font-bold text-emerald-500">{STREAK_DATA.longestWinning.days} days</p>
              <div className="mt-2 space-y-1">
                <p className="text-sm">Avg. daily return: <span className="text-emerald-500 font-medium">{STREAK_DATA.longestWinning.avgReturn}</span></p>
                <p className="text-xs text-muted-foreground">{STREAK_DATA.longestWinning.dates}</p>
              </div>
            </CardContent>
          </Card>

          {/* Current Streak */}
          <Card className={cn(
            'border-2',
            STREAK_DATA.current.type === 'winning' 
              ? 'border-emerald-500/30 bg-emerald-500/5' 
              : 'border-destructive/30 bg-destructive/5'
          )}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                {STREAK_DATA.current.type === 'winning' ? (
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-destructive" />
                )}
                <span className="text-sm text-muted-foreground">Current Streak</span>
                <Badge variant="outline" className={cn(
                  'ml-auto',
                  STREAK_DATA.current.type === 'winning' ? 'text-emerald-500 border-emerald-500/30' : 'text-destructive border-destructive/30'
                )}>
                  {STREAK_DATA.current.type}
                </Badge>
              </div>
              <p className={cn(
                'text-3xl font-bold',
                STREAK_DATA.current.type === 'winning' ? 'text-emerald-500' : 'text-destructive'
              )}>
                {STREAK_DATA.current.days} days
              </p>
              <p className="text-sm mt-2">
                Avg. daily return: <span className={cn(
                  'font-medium',
                  STREAK_DATA.current.type === 'winning' ? 'text-emerald-500' : 'text-destructive'
                )}>{STREAK_DATA.current.avgReturn}</span>
              </p>
            </CardContent>
          </Card>

          {/* Longest Losing Streak */}
          <Card className="border-destructive/20 bg-destructive/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="h-4 w-4 text-destructive" />
                <span className="text-sm text-muted-foreground">Longest Losing Streak</span>
              </div>
              <p className="text-3xl font-bold text-destructive">{STREAK_DATA.longestLosing.days} days</p>
              <div className="mt-2 space-y-1">
                <p className="text-sm">Avg. daily return: <span className="text-destructive font-medium">{STREAK_DATA.longestLosing.avgReturn}</span></p>
                <p className="text-xs text-muted-foreground">{STREAK_DATA.longestLosing.dates}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Section 2: Return Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Return Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm text-muted-foreground">
                  <th className="pb-3 font-medium">Metric</th>
                  <th className="pb-3 font-medium text-right">Daily</th>
                  <th className="pb-3 font-medium text-right">Weekly</th>
                  <th className="pb-3 font-medium text-right">Monthly</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                <tr className="border-b">
                  <td className="py-3 font-medium">Mean Return</td>
                  <td className="py-3 text-right text-emerald-500">{RETURN_STATISTICS.daily.mean}</td>
                  <td className="py-3 text-right text-emerald-500">{RETURN_STATISTICS.weekly.mean}</td>
                  <td className="py-3 text-right text-emerald-500">{RETURN_STATISTICS.monthly.mean}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 font-medium">Median Return</td>
                  <td className="py-3 text-right">{RETURN_STATISTICS.daily.median}</td>
                  <td className="py-3 text-right">{RETURN_STATISTICS.weekly.median}</td>
                  <td className="py-3 text-right">{RETURN_STATISTICS.monthly.median}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 font-medium">Std Deviation</td>
                  <td className="py-3 text-right">{RETURN_STATISTICS.daily.stdDev}</td>
                  <td className="py-3 text-right">{RETURN_STATISTICS.weekly.stdDev}</td>
                  <td className="py-3 text-right">{RETURN_STATISTICS.monthly.stdDev}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 font-medium">Skewness</td>
                  <td className="py-3 text-right">{RETURN_STATISTICS.daily.skewness}</td>
                  <td className="py-3 text-right">{RETURN_STATISTICS.weekly.skewness}</td>
                  <td className="py-3 text-right">{RETURN_STATISTICS.monthly.skewness}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 font-medium">Kurtosis</td>
                  <td className="py-3 text-right">{RETURN_STATISTICS.daily.kurtosis}</td>
                  <td className="py-3 text-right">{RETURN_STATISTICS.weekly.kurtosis}</td>
                  <td className="py-3 text-right">{RETURN_STATISTICS.monthly.kurtosis}</td>
                </tr>
                <tr>
                  <td className="py-3 font-medium">% Positive Days</td>
                  <td className="py-3 text-right text-emerald-500">{RETURN_STATISTICS.daily.positivePercent}</td>
                  <td className="py-3 text-right text-emerald-500">{RETURN_STATISTICS.weekly.positivePercent}</td>
                  <td className="py-3 text-right text-emerald-500">{RETURN_STATISTICS.monthly.positivePercent}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Macro Event Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Macro Event Performance Filter</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Event Toggles */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {MACRO_EVENTS.map((event) => (
              <div
                key={event.id}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg border transition-colors',
                  activeEvents.includes(event.id)
                    ? 'border-primary bg-primary/5'
                    : 'border-border'
                )}
              >
                <div className="flex items-center gap-2">
                  <event.icon className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor={event.id} className="text-sm cursor-pointer">
                    {event.label}
                  </Label>
                </div>
                <Switch
                  id={event.id}
                  checked={activeEvents.includes(event.id)}
                  onCheckedChange={() => toggleEvent(event.id)}
                />
              </div>
            ))}
          </div>

          {/* Performance Table */}
          {activeEvents.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm text-muted-foreground">
                    <th className="pb-3 font-medium">Event Date</th>
                    <th className="pb-3 font-medium">Type</th>
                    <th className="pb-3 font-medium text-right">Market Return</th>
                    <th className="pb-3 font-medium text-right">Portfolio Return</th>
                    <th className="pb-3 font-medium text-right">Outperformance</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {getActiveEventsData().map((event, i) => {
                    const outperformance = event.portfolioReturn - event.marketReturn;
                    const isOutperforming = outperformance > 0;
                    return (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-3 pr-4">{event.date}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{event.type}</td>
                        <td className={cn(
                          'py-3 pr-4 text-right',
                          event.marketReturn >= 0 ? 'text-emerald-500' : 'text-destructive'
                        )}>
                          {event.marketReturn >= 0 ? '+' : ''}{event.marketReturn.toFixed(1)}%
                        </td>
                        <td className={cn(
                          'py-3 pr-4 text-right font-medium',
                          event.portfolioReturn >= 0 ? 'text-emerald-500' : 'text-destructive'
                        )}>
                          {event.portfolioReturn >= 0 ? '+' : ''}{event.portfolioReturn.toFixed(1)}%
                        </td>
                        <td className="py-3 text-right">
                          <Badge
                            variant="outline"
                            className={cn(
                              isOutperforming
                                ? 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10'
                                : 'text-destructive border-destructive/30 bg-destructive/10'
                            )}
                          >
                            {isOutperforming ? '+' : ''}{outperformance.toFixed(1)}%
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {activeEvents.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>Toggle events above to see portfolio performance during those periods.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
