/**
 * Featured Insight Card
 * 
 * Surfaces probability and market impact analysis on the main dashboard
 * to help users discover these powerful features exist.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Target, 
  Activity, 
  TrendingUp, 
  TrendingDown,
  ChevronRight,
  Sparkles,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { EventDetailSheet } from '@/components/market-intel/EventDetailSheet';
import type { CalendarEvent } from '@/hooks/useEconomicCalendar';

// Current Fed Rate data (Jan 2026)
const FED_RATE_DATA = {
  currentTargetLow: 4.25,
  currentTargetHigh: 4.50,
  effectiveRate: 4.33,
  lastUpdated: 'Jan 2026',
};

// Simulated rate probabilities for next meeting
const rateProbabilities = [
  { rate: '4.00-4.25%', change: -25, probability: 15 },
  { rate: '4.25-4.50%', change: 0, probability: 72 },
  { rate: '4.50-4.75%', change: 25, probability: 13 },
];

// Recent market impact data
const recentImpacts = [
  { indicator: 'CPI', date: 'Jan 15', spyChange: -0.42, direction: 'bearish' as const },
  { indicator: 'NFP', date: 'Jan 10', spyChange: 0.87, direction: 'bullish' as const },
  { indicator: 'FOMC', date: 'Dec 18', spyChange: -1.23, direction: 'bearish' as const },
];

export function FeaturedInsightCard() {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [eventDetailOpen, setEventDetailOpen] = useState(false);

  const handleExploreClick = () => {
    // Create a sample FOMC event to open the detail sheet
    const fomcEvent: CalendarEvent = {
      id: 'featured-fomc',
      event_date: '2026-01-29',
      event_time: '14:00',
      event_name: 'Fed Interest Rate Decision',
      event_type: 'FOMC',
      description: 'Federal Reserve monetary policy decision',
      importance: 'high',
      actual_value: null,
      forecast_value: '4.25-4.50%',
      previous_value: '4.25-4.50%',
      currency: 'USD',
      country: 'US',
    };
    setSelectedEvent(fomcEvent);
    setEventDetailOpen(true);
  };

  // Calculate aggregate probabilities
  const cutProbability = rateProbabilities.filter(p => p.change < 0).reduce((sum, p) => sum + p.probability, 0);
  const holdProbability = rateProbabilities.find(p => p.change === 0)?.probability || 0;
  const hikeProbability = rateProbabilities.filter(p => p.change > 0).reduce((sum, p) => sum + p.probability, 0);

  return (
    <>
      <Card className="bg-gradient-to-br from-primary/5 via-card to-secondary/20 border-primary/20 overflow-hidden">
        <CardHeader className="p-3 sm:pb-2 sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <div className="p-1 sm:p-1.5 rounded-md bg-primary/10 shrink-0">
                <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-sm sm:text-base truncate">Featured Insight</CardTitle>
                <CardDescription className="text-[10px] sm:text-xs truncate">Fed Rate & Market Impact</CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-[9px] sm:text-[10px] bg-primary/10 text-primary border-primary/30 shrink-0 px-1.5">
              Live
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0 space-y-3 sm:space-y-4">
          {/* Fed Rate Probabilities Mini View */}
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-400 shrink-0" />
                <span className="text-xs sm:text-sm font-medium truncate">Next FOMC</span>
              </div>
              <span className="text-[10px] sm:text-xs text-muted-foreground shrink-0">Jan 29</span>
            </div>
            
            {/* Current Rate */}
            <div className="p-2 sm:p-3 rounded-lg bg-secondary/50 flex items-center justify-between gap-2">
              <span className="text-[10px] sm:text-xs text-muted-foreground">Target</span>
              <span className="font-mono font-semibold text-xs sm:text-sm">
                {FED_RATE_DATA.currentTargetLow.toFixed(2)}-{FED_RATE_DATA.currentTargetHigh.toFixed(2)}%
              </span>
            </div>
            
            {/* Probability Summary */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              <div className="text-center p-1.5 sm:p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <div className="text-[9px] sm:text-[10px] text-muted-foreground">Cut</div>
                <div className="text-xs sm:text-sm font-bold text-emerald-400">{cutProbability}%</div>
              </div>
              <div className="text-center p-1.5 sm:p-2 rounded-lg bg-primary/10 border border-primary/20">
                <div className="text-[9px] sm:text-[10px] text-muted-foreground">Hold</div>
                <div className="text-xs sm:text-sm font-bold text-primary">{holdProbability}%</div>
              </div>
              <div className="text-center p-1.5 sm:p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
                <div className="text-[9px] sm:text-[10px] text-muted-foreground">Hike</div>
                <div className="text-xs sm:text-sm font-bold text-rose-400">{hikeProbability}%</div>
              </div>
            </div>
          </div>
          
          {/* Divider */}
          <div className="h-px bg-border" />
          
          {/* Market Impact Preview */}
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-400 shrink-0" />
              <span className="text-xs sm:text-sm font-medium">Recent Reactions</span>
            </div>
            
            <div className="space-y-1.5 sm:space-y-2">
              {recentImpacts.map((impact, i) => (
                <div 
                  key={i} 
                  className="flex items-center justify-between p-1.5 sm:p-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors gap-2"
                >
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                    <Badge variant="outline" className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 shrink-0">
                      {impact.indicator}
                    </Badge>
                    <span className="text-[10px] sm:text-xs text-muted-foreground truncate">{impact.date}</span>
                  </div>
                  <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                    {impact.direction === 'bullish' ? (
                      <ArrowUpRight className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-emerald-400" />
                    ) : (
                      <ArrowDownRight className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-rose-400" />
                    )}
                    <span className={cn(
                      "text-[10px] sm:text-xs font-mono font-medium",
                      impact.spyChange >= 0 ? "text-emerald-400" : "text-rose-400"
                    )}>
                      {impact.spyChange >= 0 ? '+' : ''}{impact.spyChange.toFixed(2)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* CTA */}
          <Button 
            variant="outline" 
            className="w-full group h-8 sm:h-9 text-xs sm:text-sm"
            onClick={handleExploreClick}
          >
            <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
            <span className="truncate">Explore Analysis</span>
            <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 ml-auto group-hover:translate-x-1 transition-transform shrink-0" />
          </Button>
        </CardContent>
      </Card>

      {/* Event Detail Sheet */}
      <EventDetailSheet
        event={selectedEvent}
        open={eventDetailOpen}
        onOpenChange={setEventDetailOpen}
      />
    </>
  );
}
