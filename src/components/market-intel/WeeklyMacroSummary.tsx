import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  Target,
  Eye,
  Zap,
  Landmark,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEconomicCalendar } from '@/hooks/useEconomicCalendar';
import { useEconomicDataWithRefresh, calculateMarketHealthScore } from '@/hooks/useEconomicData';
import { isToday, isTomorrow, parseISO, format, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';

export function WeeklyMacroSummary() {
  const { data: calendarEvents = [], isLoading: calendarLoading } = useEconomicCalendar(30);
  const { data: economicData, isLoading: dataLoading } = useEconomicDataWithRefresh();
  
  const healthScore = React.useMemo(() => {
    return calculateMarketHealthScore(economicData?.indicators || []);
  }, [economicData?.indicators]);

  // Get this week's high importance events
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  
  const thisWeeksEvents = calendarEvents.filter(event => {
    const eventDate = parseISO(event.event_date);
    return isWithinInterval(eventDate, { start: weekStart, end: weekEnd });
  });
  
  const highImportanceEvents = thisWeeksEvents.filter(
    e => e.importance?.toLowerCase() === 'high'
  );

  // Key data points summary
  const keyDataPoints = React.useMemo(() => {
    const indicators = economicData?.indicators || [];
    const byCategory = economicData?.byCategory || { rates: [], economic: [], markets: [] };
    
    // Find key indicators
    const fedRate = byCategory.rates?.find(r => 
      r.indicator_name?.toLowerCase().includes('fed') || 
      r.indicator_name?.toLowerCase().includes('funds')
    );
    const inflation = byCategory.economic?.find(r => 
      r.indicator_name?.toLowerCase().includes('cpi') || 
      r.indicator_name?.toLowerCase().includes('inflation')
    );
    const gdp = byCategory.economic?.find(r => 
      r.indicator_name?.toLowerCase().includes('gdp')
    );
    const unemployment = byCategory.economic?.find(r => 
      r.indicator_name?.toLowerCase().includes('unemployment') ||
      r.indicator_name?.toLowerCase().includes('jobless')
    );
    
    return { fedRate, inflation, gdp, unemployment };
  }, [economicData]);

  // Generate weekly outlook based on data
  const weeklyOutlook = React.useMemo(() => {
    const points: { text: string; type: 'warning' | 'info' | 'positive' }[] = [];
    
    // Add high importance events as things to watch
    highImportanceEvents.forEach(event => {
      const eventDate = parseISO(event.event_date);
      const dayName = isToday(eventDate) ? 'Today' : isTomorrow(eventDate) ? 'Tomorrow' : format(eventDate, 'EEEE');
      points.push({
        text: `${event.event_name} - ${dayName}`,
        type: 'warning'
      });
    });

    // Add macro insights based on current data
    if (keyDataPoints.fedRate) {
      points.push({
        text: `Fed Funds Rate at ${keyDataPoints.fedRate.current_value} - Monitor for policy signals`,
        type: 'info'
      });
    }

    if (keyDataPoints.inflation) {
      const val = parseFloat(String(keyDataPoints.inflation.current_value)) || 0;
      points.push({
        text: val > 3 
          ? `Inflation elevated at ${keyDataPoints.inflation.current_value} - Hawkish Fed expected`
          : `Inflation at ${keyDataPoints.inflation.current_value} - Trending toward target`,
        type: val > 3 ? 'warning' : 'positive'
      });
    }

    // Add health score insight
    if (healthScore.score >= 60) {
      points.push({ text: 'Market conditions favorable - risk-on environment', type: 'positive' });
    } else if (healthScore.score <= 40) {
      points.push({ text: 'Market conditions cautious - consider defensive positioning', type: 'warning' });
    }

    return points;
  }, [highImportanceEvents, keyDataPoints, healthScore]);

  if (calendarLoading || dataLoading) {
    return (
      <Card className="bg-gradient-to-br from-primary/5 via-card to-secondary/10 border-primary/20">
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-5 bg-secondary/50 rounded w-1/3" />
            <div className="h-4 bg-secondary/50 rounded w-full" />
            <div className="h-4 bg-secondary/50 rounded w-2/3" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-primary/5 via-card to-secondary/10 border-primary/20">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
            <Eye className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <h3 className="font-semibold text-sm sm:text-base">Weekly Macro Summary</h3>
              <Badge variant="outline" className="text-xs">
                {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d')}
              </Badge>
              {highImportanceEvents.length > 0 && (
                <Badge variant="destructive" className="text-xs bg-rose-500/20 text-rose-400 border-rose-500/30">
                  {highImportanceEvents.length} High Impact Event{highImportanceEvents.length > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            
            {/* Key Metrics Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {keyDataPoints.fedRate && (
                <div className="bg-secondary/30 rounded-lg p-2">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <Landmark className="h-3 w-3" />
                    Fed Rate
                  </div>
                  <p className="font-mono font-semibold text-sm">{keyDataPoints.fedRate.current_value}</p>
                </div>
              )}
              {keyDataPoints.inflation && (
                <div className="bg-secondary/30 rounded-lg p-2">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <TrendingUp className="h-3 w-3" />
                    CPI
                  </div>
                  <p className="font-mono font-semibold text-sm">{keyDataPoints.inflation.current_value}</p>
                </div>
              )}
              {keyDataPoints.gdp && (
                <div className="bg-secondary/30 rounded-lg p-2">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <BarChart3 className="h-3 w-3" />
                    GDP
                  </div>
                  <p className="font-mono font-semibold text-sm">{keyDataPoints.gdp.current_value}</p>
                </div>
              )}
              {keyDataPoints.unemployment && (
                <div className="bg-secondary/30 rounded-lg p-2">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <Target className="h-3 w-3" />
                    Unemployment
                  </div>
                  <p className="font-mono font-semibold text-sm">{keyDataPoints.unemployment.current_value}</p>
                </div>
              )}
            </div>

            {/* Watch Items */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">This Week's Focus</p>
              <div className="space-y-1.5">
                {weeklyOutlook.slice(0, 5).map((item, idx) => (
                  <div 
                    key={idx} 
                    className={cn(
                      "flex items-start gap-2 text-sm p-2 rounded-lg",
                      item.type === 'warning' && "bg-amber-500/5 border border-amber-500/20",
                      item.type === 'positive' && "bg-emerald-500/5 border border-emerald-500/20",
                      item.type === 'info' && "bg-blue-500/5 border border-blue-500/20"
                    )}
                  >
                    {item.type === 'warning' && <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />}
                    {item.type === 'positive' && <TrendingUp className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />}
                    {item.type === 'info' && <Zap className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />}
                    <span className="text-sm">{item.text}</span>
                  </div>
                ))}
                {weeklyOutlook.length === 0 && (
                  <p className="text-sm text-muted-foreground">No major events or alerts this week</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
