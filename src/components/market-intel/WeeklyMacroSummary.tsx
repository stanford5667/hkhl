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
  Info,
  LineChart,
  HelpCircle,
  BookOpen,
  History,
  Lightbulb
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

// Clickable data point component with tabbed details
interface ClickableDataPointProps {
  label: string;
  value: string | number | null | undefined;
  icon: React.ReactNode;
  description: string;
  details: string;
  trend?: 'up' | 'down' | 'neutral';
  explainer: string; // Short tooltip explanation
  historicalContext?: string;
  tradingImplications?: string;
}

function ClickableDataPoint({ 
  label, 
  value, 
  icon, 
  description, 
  details, 
  trend, 
  explainer,
  historicalContext,
  tradingImplications 
}: ClickableDataPointProps) {
  if (!value) return null;
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="bg-secondary/30 rounded-lg p-2 text-left hover:bg-secondary/50 transition-colors cursor-pointer group w-full">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            {icon}
            <span>{label}</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-2.5 w-2.5 text-muted-foreground/60 hover:text-primary cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[200px] text-xs">
                  <p>{explainer}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <ExternalLink className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
          </div>
          <p className="font-mono font-semibold text-sm flex items-center gap-1">
            {value}
            {trend === 'up' && <TrendingUp className="h-3 w-3 text-emerald-400" />}
            {trend === 'down' && <TrendingDown className="h-3 w-3 text-rose-400" />}
          </p>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {icon}
            {label}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        
        <div className="p-4 bg-secondary/30 rounded-lg mb-4">
          <p className="text-2xl font-mono font-bold flex items-center gap-2">
            {value}
            {trend === 'up' && <TrendingUp className="h-5 w-5 text-emerald-400" />}
            {trend === 'down' && <TrendingDown className="h-5 w-5 text-rose-400" />}
          </p>
          <p className="text-sm text-muted-foreground mt-1">Current Value</p>
        </div>
        
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview" className="text-xs flex items-center gap-1">
              <BookOpen className="h-3 w-3" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs flex items-center gap-1">
              <History className="h-3 w-3" />
              Context
            </TabsTrigger>
            <TabsTrigger value="trading" className="text-xs flex items-center gap-1">
              <Lightbulb className="h-3 w-3" />
              Trading
            </TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="mt-3">
            <div className="p-3 bg-secondary/20 rounded-lg">
              <p className="text-sm text-foreground/80 leading-relaxed">{details}</p>
            </div>
          </TabsContent>
          <TabsContent value="history" className="mt-3">
            <div className="p-3 bg-secondary/20 rounded-lg">
              <p className="text-sm text-foreground/80 leading-relaxed">
                {historicalContext || "Historical data shows this indicator has been a reliable signal for market direction. During economic expansions, it typically rises, while contractions see declines. Monitor for sudden changes that may precede market moves."}
              </p>
            </div>
          </TabsContent>
          <TabsContent value="trading" className="mt-3">
            <div className="p-3 bg-secondary/20 rounded-lg">
              <p className="text-sm text-foreground/80 leading-relaxed">
                {tradingImplications || "Consider this indicator alongside other macro data for a complete picture. Changes in this metric can affect equity valuations, bond yields, and currency movements. Use as one input in your broader investment thesis."}
              </p>
            </div>
          </TabsContent>
        </Tabs>
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

  // Get upcoming events (next 14 days from today)
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  
  // Filter for upcoming events from today onwards (sorted by date)
  const upcomingEvents = calendarEvents.filter(event => {
    const eventDate = parseISO(event.event_date);
    return eventDate >= today;
  }).slice(0, 10); // Get next 10 upcoming events
  
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
              <div className="w-full text-left mb-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-primary">Daily Macro Summary</span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {format(new Date(), 'MMM d')}
                      </Badge>
                    </div>
                    <div className="text-sm text-foreground/80 leading-relaxed">
                      {(() => {
                        const fullSummary = generateDailySummary(healthScore, keyDataPoints, highImportanceEvents);
                        // Get first ~120 words for preview
                        const words = fullSummary.replace(/\*\*/g, '').split(/\s+/);
                        const previewWords = words.slice(0, 100).join(' ');
                        return (
                          <>
                            <p className="mb-2">{previewWords}...</p>
                            <DialogTrigger asChild>
                              <button className="text-primary hover:text-primary/80 font-medium text-xs flex items-center gap-1 transition-colors">
                                See full summary
                                <ExternalLink className="h-3 w-3" />
                              </button>
                            </DialogTrigger>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
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
                  explainer="The interest rate banks charge each other for overnight loans. Set by the Fed to control inflation and stimulate/slow the economy."
                  historicalContext="The Fed raised rates aggressively from near-zero in 2022 to combat inflation. Historically, rate cuts follow once inflation is controlled. The current rate cycle began in March 2022."
                  tradingImplications="Higher rates typically pressure growth stocks and benefit financials. Rate cuts often spark equity rallies. Bond prices move inversely to rate expectations."
                />
                <ClickableDataPoint
                  label="CPI"
                  value={keyDataPoints.inflation?.current_value}
                  icon={<TrendingUp className="h-3 w-3" />}
                  description="Consumer Price Index (Inflation)"
                  details="The Consumer Price Index measures the average change in prices paid by consumers for goods and services. The Fed targets 2% annual inflation. Higher readings typically lead to tighter monetary policy, while lower readings may support rate cuts."
                  trend={parseFloat(String(keyDataPoints.inflation?.current_value).replace('%', '')) > 3 ? 'up' : 'down'}
                  explainer="Measures how fast prices are rising for everyday goods and services. The Fed's target is 2% annually."
                  historicalContext="CPI peaked at 9.1% in June 2022, the highest since 1981. The path to 2% has been gradual with shelter costs being the stickiest component."
                  tradingImplications="Higher CPI = hawkish Fed = pressure on stocks/bonds. Falling CPI supports 'soft landing' narrative and risk assets. Watch core CPI (ex-food/energy) for trend."
                />
                <ClickableDataPoint
                  label="GDP"
                  value={keyDataPoints.gdp?.current_value}
                  icon={<BarChart3 className="h-3 w-3" />}
                  description="Gross Domestic Product Growth"
                  details="GDP measures the total value of goods and services produced in the economy. Strong GDP growth typically supports equity markets and risk assets, while contraction may signal recession and favor defensive positioning."
                  trend={parseFloat(String(keyDataPoints.gdp?.current_value).replace('%', '')) > 2 ? 'up' : parseFloat(String(keyDataPoints.gdp?.current_value).replace('%', '')) < 0 ? 'down' : 'neutral'}
                  explainer="Total value of all goods and services produced. Shows if the economy is growing or shrinking."
                  historicalContext="Average U.S. GDP growth is around 2-3%. Two consecutive quarters of negative growth technically defines a recession. Consumer spending drives ~70% of GDP."
                  tradingImplications="Strong GDP supports cyclical sectors and risk-on positioning. Weak GDP favors defensives and bonds. Watch GDP revisions—markets react to surprises."
                />
                <ClickableDataPoint
                  label="Unemployment"
                  value={keyDataPoints.unemployment?.current_value}
                  icon={<Target className="h-3 w-3" />}
                  description="U.S. Unemployment Rate"
                  details="The unemployment rate represents the percentage of the labor force that is jobless and actively seeking employment. Low unemployment indicates a strong labor market but may contribute to wage inflation. Rising unemployment often precedes economic downturns."
                  trend={parseFloat(String(keyDataPoints.unemployment?.current_value).replace('%', '')) < 4 ? 'down' : 'up'}
                  explainer="Percentage of people actively looking for work who can't find jobs. Low = strong economy, but can fuel inflation."
                  historicalContext="Pre-pandemic unemployment was 3.5% (50-year low). It spiked to 14.7% in April 2020 and has since recovered. The Fed considers below 4% as 'full employment'."
                  tradingImplications="Rising unemployment often leads to Fed rate cuts (bullish for stocks/bonds). Very low unemployment can pressure wages and inflation, keeping the Fed hawkish."
                />
              </div>
            </TooltipProvider>

            {/* Events & Forecasts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              {/* Upcoming Economic Events Card */}
              <div className="p-3 bg-secondary/20 border border-border/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-medium text-foreground">Upcoming Events</span>
                  <Badge variant="outline" className="text-[9px] ml-auto px-1.5 py-0">
                    {upcomingEvents.length}
                  </Badge>
                </div>
                <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                  {upcomingEvents.length > 0 ? (
                    upcomingEvents.slice(0, 4).map((event, idx) => {
                      const eventDate = parseISO(event.event_date);
                      const dayLabel = isToday(eventDate) ? 'Today' : isTomorrow(eventDate) ? 'Tomorrow' : format(eventDate, 'MMM d');
                      const isHighImportance = event.importance?.toLowerCase() === 'high';
                      
                      return (
                        <div 
                          key={idx}
                          className={cn(
                            "flex items-center gap-1.5 p-1.5 rounded text-xs transition-colors",
                            isHighImportance 
                              ? "bg-rose-500/10 border border-rose-500/20" 
                              : "bg-secondary/30"
                          )}
                        >
                          <div className={cn(
                            "w-1 h-1 rounded-full shrink-0",
                            isHighImportance ? "bg-rose-400" : "bg-primary/60"
                          )} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{event.event_name}</p>
                          </div>
                          <span className="text-[10px] text-muted-foreground shrink-0">{dayLabel}</span>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-2">No upcoming events</p>
                  )}
                </div>
              </div>

              {/* Key Forecasts Card */}
              <div className="p-3 bg-secondary/20 border border-border/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <LineChart className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-medium text-foreground">2026 Forecasts</span>
                  <Badge variant="outline" className="text-[9px] ml-auto px-1.5 py-0">
                    YE
                  </Badge>
                </div>
                <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
                  {[
                    { indicator: 'Fed Rate', current: '4.50%', forecast: '3.50%', change: -22.2 },
                    { indicator: 'S&P 500', current: '6,050', forecast: '6,600', change: 9.1 },
                    { indicator: 'Inflation', current: '3.2%', forecast: '2.2%', change: -31.3 },
                    { indicator: '10Y Yield', current: '4.17%', forecast: '3.60%', change: -13.7 },
                  ].map((item, idx) => (
                    <div 
                      key={idx}
                      className="flex items-center justify-between p-1.5 rounded bg-secondary/30"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{item.indicator}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{item.current}</span>
                        <span className="text-xs">→</span>
                        <span className="text-xs font-semibold">{item.forecast}</span>
                        <span className={cn(
                          "text-[10px] font-medium",
                          item.change >= 0 ? "text-emerald-500" : "text-rose-500"
                        )}>
                          {item.change >= 0 ? '+' : ''}{item.change.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

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
