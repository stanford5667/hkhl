import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  FileText, 
  RefreshCw, 
  Volume2, 
  VolumeX,
  Calendar,
  TrendingUp,
  TrendingDown,
  Newspaper,
  Target,
  ChevronLeft,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, addDays } from 'date-fns';

interface BriefingData {
  date: string;
  content: string;
  data: {
    marketSummary: {
      totalVolume: number;
      volumeChange: number;
      newMarkets: number;
      resolvedMarkets: number;
      topMovers: Array<{ title: string; change: number; currentPrice: number }>;
    };
    topStories: Array<{ title: string; summary: string; marketImpact: string }>;
    opportunities: {
      arbitrage: Array<{ markets: string[]; profit: number }>;
      tradeIdeas: Array<{ market: string; thesis: string; confidence: number }>;
    };
    upcomingEvents: Array<{ date: string; title: string; category: string }>;
  };
}

export function DailyBriefing() {
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  const fetchBriefing = useCallback(async (date: Date) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('ai-daily-briefing', {
        body: { date: format(date, 'yyyy-MM-dd') }
      });

      if (fnError) throw fnError;

      if (data.success) {
        setBriefing({
          date: data.date,
          content: data.content,
          data: data.data
        });
      } else {
        throw new Error(data.error || 'Failed to generate briefing');
      }
    } catch (err) {
      console.error('Briefing error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load briefing');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBriefing(selectedDate);
  }, [selectedDate, fetchBriefing]);

  const handlePreviousDay = () => {
    setSelectedDate(prev => subDays(prev, 1));
  };

  const handleNextDay = () => {
    const tomorrow = addDays(new Date(), 1);
    if (addDays(selectedDate, 1) <= tomorrow) {
      setSelectedDate(prev => addDays(prev, 1));
    }
  };

  const handleAudioToggle = () => {
    if (isAudioPlaying) {
      window.speechSynthesis.cancel();
      setIsAudioPlaying(false);
    } else if (briefing?.content) {
      const utterance = new SpeechSynthesisUtterance(briefing.content.replace(/[#*📈📉🐋📅💡]/g, ''));
      utterance.onend = () => setIsAudioPlaying(false);
      window.speechSynthesis.speak(utterance);
      setIsAudioPlaying(true);
    }
  };

  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Daily Briefing</CardTitle>
            {isToday && (
              <Badge variant="secondary" className="text-xs">
                <Sparkles className="h-3 w-3 mr-1" />
                Today
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleAudioToggle}
              disabled={!briefing?.content}
            >
              {isAudioPlaying ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fetchBriefing(selectedDate)}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Date Navigation */}
        <div className="flex items-center justify-center gap-2 mt-2">
          <Button variant="ghost" size="icon" onClick={handlePreviousDay}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-md">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {format(selectedDate, 'MMMM d, yyyy')}
            </span>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleNextDay}
            disabled={isToday}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-6 w-1/2 mt-4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => fetchBriefing(selectedDate)}>
              Try Again
            </Button>
          </div>
        ) : briefing ? (
          <div className="space-y-4">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <QuickStat
                icon={<TrendingUp className="h-4 w-4 text-emerald-500" />}
                label="Volume"
                value={`$${(briefing.data.marketSummary.totalVolume / 1000000).toFixed(1)}M`}
              />
              <QuickStat
                icon={<Newspaper className="h-4 w-4 text-blue-500" />}
                label="Stories"
                value={briefing.data.topStories.length.toString()}
              />
              <QuickStat
                icon={<Target className="h-4 w-4 text-amber-500" />}
                label="Opportunities"
                value={(briefing.data.opportunities.arbitrage.length + briefing.data.opportunities.tradeIdeas.length).toString()}
              />
              <QuickStat
                icon={<Calendar className="h-4 w-4 text-purple-500" />}
                label="Events"
                value={briefing.data.upcomingEvents.length.toString()}
              />
            </div>

            {/* Top Movers */}
            {briefing.data.marketSummary.topMovers.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Top Movers</h4>
                <div className="space-y-1">
                  {briefing.data.marketSummary.topMovers.slice(0, 3).map((mover, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                      <span className="truncate flex-1 mr-2">{mover.title}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          {(mover.currentPrice * 100).toFixed(0)}%
                        </span>
                        <Badge variant={mover.change > 0 ? 'default' : 'destructive'} className="text-xs">
                          {mover.change > 0 ? (
                            <TrendingUp className="h-3 w-3 mr-1" />
                          ) : (
                            <TrendingDown className="h-3 w-3 mr-1" />
                          )}
                          {mover.change > 0 ? '+' : ''}{(mover.change * 100).toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Briefing Content */}
            <ScrollArea className="h-[400px] pr-4">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <BriefingContent content={briefing.content} />
              </div>
            </ScrollArea>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function QuickStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
      {icon}
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}

function BriefingContent({ content }: { content: string }) {
  // Parse markdown-like content
  const lines = content.split('\n');
  
  return (
    <div className="space-y-3">
      {lines.map((line, idx) => {
        if (line.startsWith('## ')) {
          return (
            <h3 key={idx} className="text-base font-semibold mt-4 first:mt-0 flex items-center gap-2">
              {line.replace('## ', '')}
            </h3>
          );
        }
        if (line.startsWith('### ')) {
          return (
            <h4 key={idx} className="text-sm font-medium mt-3">
              {line.replace('### ', '')}
            </h4>
          );
        }
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return (
            <p key={idx} className="text-sm text-muted-foreground pl-4 border-l-2 border-muted">
              {line.replace(/^[-*] /, '')}
            </p>
          );
        }
        if (line.trim() === '') {
          return <div key={idx} className="h-2" />;
        }
        return (
          <p key={idx} className="text-sm leading-relaxed">
            {line}
          </p>
        );
      })}
    </div>
  );
}

export default DailyBriefing;
