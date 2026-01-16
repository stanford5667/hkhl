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
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Featured Insight</CardTitle>
                <CardDescription className="text-xs">Fed Rate Probabilities & Market Impact</CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
              Live Analysis
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Fed Rate Probabilities Mini View */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-400" />
                <span className="text-sm font-medium">Next FOMC Decision</span>
              </div>
              <span className="text-xs text-muted-foreground">Jan 29, 2026</span>
            </div>
            
            {/* Current Rate */}
            <div className="p-3 rounded-lg bg-secondary/50 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Current Target</span>
              <span className="font-mono font-semibold">
                {FED_RATE_DATA.currentTargetLow.toFixed(2)}-{FED_RATE_DATA.currentTargetHigh.toFixed(2)}%
              </span>
            </div>
            
            {/* Probability Summary */}
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <div className="text-[10px] text-muted-foreground">Cut</div>
                <div className="text-sm font-bold text-emerald-400">{cutProbability}%</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-primary/10 border border-primary/20">
                <div className="text-[10px] text-muted-foreground">Hold</div>
                <div className="text-sm font-bold text-primary">{holdProbability}%</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
                <div className="text-[10px] text-muted-foreground">Hike</div>
                <div className="text-sm font-bold text-rose-400">{hikeProbability}%</div>
              </div>
            </div>
          </div>
          
          {/* Divider */}
          <div className="h-px bg-border" />
          
          {/* Market Impact Preview */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-purple-400" />
              <span className="text-sm font-medium">Recent Market Reactions</span>
            </div>
            
            <div className="space-y-2">
              {recentImpacts.map((impact, i) => (
                <div 
                  key={i} 
                  className="flex items-center justify-between p-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] px-1.5">
                      {impact.indicator}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{impact.date}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {impact.direction === 'bullish' ? (
                      <ArrowUpRight className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3 text-rose-400" />
                    )}
                    <span className={cn(
                      "text-xs font-mono font-medium",
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
            className="w-full group"
            onClick={handleExploreClick}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Explore Full Analysis
            <ChevronRight className="h-4 w-4 ml-auto group-hover:translate-x-1 transition-transform" />
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
