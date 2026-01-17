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
  BarChart3,
  FileText,
  ExternalLink,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEconomicCalendar } from '@/hooks/useEconomicCalendar';
import { useEconomicDataWithRefresh, calculateMarketHealthScore } from '@/hooks/useEconomicData';
import { isToday, isTomorrow, parseISO, format, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Generate daily macro summary text based on current data
function generateDailySummary(
  healthScore: { score: number; label?: string; trend?: string; factors?: any[] },
  keyDataPoints: { fedRate: any; inflation: any; gdp: any; unemployment: any },
  highImportanceEvents: any[]
): string {
  const today = new Date();
  const dateStr = format(today, 'MMMM d, yyyy');
  
  let summary = `**Macro Overview - ${dateStr}**\n\n`;
  
  // Market health assessment
  if (healthScore.score >= 70) {
    summary += `Markets are showing strong resilience with a health score of ${healthScore.score}/100. Risk-on conditions prevail with favorable fundamentals supporting equity exposure. `;
  } else if (healthScore.score >= 50) {
    summary += `Markets are displaying mixed signals with a neutral health score of ${healthScore.score}/100. A balanced approach is warranted as we navigate crosscurrents. `;
  } else {
    summary += `Caution is advised with market health at ${healthScore.score}/100. Defensive positioning and reduced risk exposure may be prudent. `;
  }
  
  // Fed and rates context
  if (keyDataPoints.fedRate) {
    const rate = keyDataPoints.fedRate.current_value;
    summary += `\n\nThe Fed Funds rate stands at ${rate}, `;
    const rateNum = parseFloat(String(rate).replace('%', ''));
    if (rateNum > 5) {
      summary += `reflecting a restrictive monetary policy stance. Watch for any dovish pivots in Fed communication. `;
    } else if (rateNum > 3) {
      summary += `indicating a moderately tight policy environment. Rate cut expectations remain in focus. `;
    } else {
      summary += `suggesting accommodative conditions that support growth assets. `;
    }
  }
  
  // Inflation context
  if (keyDataPoints.inflation) {
    const cpi = keyDataPoints.inflation.current_value;
    const cpiNum = parseFloat(String(cpi).replace('%', ''));
    if (cpiNum > 3.5) {
      summary += `Inflation remains elevated at ${cpi}, keeping pressure on the Fed to maintain restrictive policy. `;
    } else if (cpiNum > 2.5) {
      summary += `Inflation at ${cpi} is trending toward the Fed's 2% target, supporting potential policy easing. `;
    } else {
      summary += `With inflation at ${cpi}, disinflation progress is evident, opening the door for accommodative shifts. `;
    }
  }
  
  // GDP context
  if (keyDataPoints.gdp) {
    const gdp = keyDataPoints.gdp.current_value;
    const gdpNum = parseFloat(String(gdp).replace('%', ''));
    if (gdpNum > 2.5) {
      summary += `GDP growth of ${gdp} signals robust economic expansion. `;
    } else if (gdpNum > 0) {
      summary += `GDP at ${gdp} shows moderate growth momentum. `;
    } else {
      summary += `GDP contraction at ${gdp} raises recession concerns. `;
    }
  }
  
  // Unemployment context
  if (keyDataPoints.unemployment) {
    const unemp = keyDataPoints.unemployment.current_value;
    const unempNum = parseFloat(String(unemp).replace('%', ''));
    if (unempNum < 4) {
      summary += `Labor markets remain tight with unemployment at ${unemp}. `;
    } else if (unempNum < 5) {
      summary += `Unemployment at ${unemp} reflects healthy labor conditions. `;
    } else {
      summary += `Rising unemployment at ${unemp} warrants monitoring for broader economic stress. `;
    }
  }
  
  // Key events
  if (highImportanceEvents.length > 0) {
    summary += `\n\n**Key Events This Week:** `;
    const eventList = highImportanceEvents.slice(0, 3).map(e => e.event_name).join(', ');
    summary += `${eventList}. These releases could drive significant market volatility.`;
  }
  
  // Trading implications
  summary += `\n\n**Trading Implications:** `;
  if (healthScore.score >= 60) {
    summary += `Favor growth over value, consider quality tech and cyclicals. Maintain standard position sizing.`;
  } else if (healthScore.score >= 40) {
    summary += `Balance between growth and defensive sectors. Consider reducing position sizes until clarity emerges.`;
  } else {
    summary += `Favor defensive sectors, utilities, and consumer staples. Consider hedging equity exposure.`;
  }
  
  return summary;
}

// Clickable data point component
interface ClickableDataPointProps {
  label: string;
  value: string | number | null | undefined;
  icon: React.ReactNode;
  description: string;
  details: string;
  trend?: 'up' | 'down' | 'neutral';
}

function ClickableDataPoint({ label, value, icon, description, details, trend }: ClickableDataPointProps) {
  if (!value) return null;
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="bg-secondary/30 rounded-lg p-2 text-left hover:bg-secondary/50 transition-colors cursor-pointer group w-full">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            {icon}
            {label}
            <ExternalLink className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <p className="font-mono font-semibold text-sm flex items-center gap-1">
            {value}
            {trend === 'up' && <TrendingUp className="h-3 w-3 text-emerald-400" />}
            {trend === 'down' && <TrendingDown className="h-3 w-3 text-rose-400" />}
          </p>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {icon}
            {label}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-4 bg-secondary/30 rounded-lg">
            <p className="text-2xl font-mono font-bold">{value}</p>
            <p className="text-sm text-muted-foreground mt-1">Current Value</p>
          </div>
          <p className="text-sm text-foreground/80 leading-relaxed">{details}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

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
            
            {/* Daily Summary */}
            <Dialog>
              <DialogTrigger asChild>
                <button className="w-full text-left mb-4 p-3 bg-primary/5 hover:bg-primary/10 border border-primary/20 rounded-lg transition-colors cursor-pointer group">
                  <div className="flex items-start gap-2">
                    <FileText className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-primary">Daily Macro Summary</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {format(new Date(), 'MMM d')}
                        </Badge>
                        <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                      </div>
                      <p className="text-sm text-foreground/80 line-clamp-2">
                        {healthScore.score >= 60 
                          ? `Markets showing strength (Health: ${healthScore.score}/100). Risk-on conditions with favorable fundamentals...`
                          : healthScore.score >= 40
                          ? `Mixed market signals (Health: ${healthScore.score}/100). Balanced positioning recommended...`
                          : `Caution warranted (Health: ${healthScore.score}/100). Consider defensive positioning...`
                        }
                      </p>
                    </div>
                  </div>
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Daily Macro Summary
                  </DialogTitle>
                  <DialogDescription>
                    Updated daily at market open • {format(new Date(), 'MMMM d, yyyy')}
                  </DialogDescription>
                </DialogHeader>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {generateDailySummary(healthScore, keyDataPoints, highImportanceEvents).split('\n\n').map((paragraph, idx) => (
                    <p key={idx} className="text-sm leading-relaxed mb-3">
                      {paragraph.startsWith('**') ? (
                        <>
                          <strong className="text-foreground">{paragraph.replace(/\*\*/g, '').split(':')[0]}:</strong>
                          {paragraph.replace(/\*\*/g, '').split(':').slice(1).join(':')}
                        </>
                      ) : paragraph}
                    </p>
                  ))}
                </div>
              </DialogContent>
            </Dialog>

            {/* Key Metrics Row - Now Clickable */}
            <TooltipProvider>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <ClickableDataPoint
                  label="Fed Rate"
                  value={keyDataPoints.fedRate?.current_value}
                  icon={<Landmark className="h-3 w-3" />}
                  description="Federal Funds Target Rate"
                  details="The Federal Funds Rate is the target interest rate set by the FOMC at which commercial banks borrow and lend their excess reserves to each other overnight. This rate influences all other interest rates in the economy and is a primary tool of monetary policy."
                  trend="neutral"
                />
                <ClickableDataPoint
                  label="CPI"
                  value={keyDataPoints.inflation?.current_value}
                  icon={<TrendingUp className="h-3 w-3" />}
                  description="Consumer Price Index (Inflation)"
                  details="The Consumer Price Index measures the average change in prices paid by consumers for goods and services. The Fed targets 2% annual inflation. Higher readings typically lead to tighter monetary policy, while lower readings may support rate cuts."
                  trend={parseFloat(String(keyDataPoints.inflation?.current_value).replace('%', '')) > 3 ? 'up' : 'down'}
                />
                <ClickableDataPoint
                  label="GDP"
                  value={keyDataPoints.gdp?.current_value}
                  icon={<BarChart3 className="h-3 w-3" />}
                  description="Gross Domestic Product Growth"
                  details="GDP measures the total value of goods and services produced in the economy. Strong GDP growth typically supports equity markets and risk assets, while contraction may signal recession and favor defensive positioning."
                  trend={parseFloat(String(keyDataPoints.gdp?.current_value).replace('%', '')) > 2 ? 'up' : parseFloat(String(keyDataPoints.gdp?.current_value).replace('%', '')) < 0 ? 'down' : 'neutral'}
                />
                <ClickableDataPoint
                  label="Unemployment"
                  value={keyDataPoints.unemployment?.current_value}
                  icon={<Target className="h-3 w-3" />}
                  description="U.S. Unemployment Rate"
                  details="The unemployment rate represents the percentage of the labor force that is jobless and actively seeking employment. Low unemployment indicates a strong labor market but may contribute to wage inflation. Rising unemployment often precedes economic downturns."
                  trend={parseFloat(String(keyDataPoints.unemployment?.current_value).replace('%', '')) < 4 ? 'down' : 'up'}
                />
              </div>
            </TooltipProvider>

            {/* Watch Items - Now Clickable */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">This Week's Focus</p>
              <div className="space-y-1.5">
                {weeklyOutlook.slice(0, 5).map((item, idx) => (
                  <Tooltip key={idx}>
                    <TooltipTrigger asChild>
                      <button
                        className={cn(
                          "flex items-start gap-2 text-sm p-2 rounded-lg w-full text-left hover:opacity-80 transition-opacity cursor-pointer",
                          item.type === 'warning' && "bg-amber-500/5 border border-amber-500/20",
                          item.type === 'positive' && "bg-emerald-500/5 border border-emerald-500/20",
                          item.type === 'info' && "bg-blue-500/5 border border-blue-500/20"
                        )}
                      >
                        {item.type === 'warning' && <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />}
                        {item.type === 'positive' && <TrendingUp className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />}
                        {item.type === 'info' && <Zap className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />}
                        <span className="text-sm">{item.text}</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      <p className="text-xs">
                        {item.type === 'warning' && "High-impact event that could drive significant market volatility."}
                        {item.type === 'positive' && "Favorable condition supporting risk assets and growth exposure."}
                        {item.type === 'info' && "Key data point to monitor for trading decisions."}
                      </p>
                    </TooltipContent>
                  </Tooltip>
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
