import React from 'react';
import { Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NewsArticle } from '@/hooks/useNewsIntelligence';

interface ActivityPulseProps {
  articles: NewsArticle[];
}

export function ActivityPulse({ articles }: ActivityPulseProps) {
  // Filter to last hour and limit to 20 dots
  const recentArticles = articles
    .filter(a => {
      const age = Date.now() - new Date(a.detected_at).getTime();
      return age < 60 * 60 * 1000; // Last hour
    })
    .slice(0, 20);

  const signalsLastHour = recentArticles.length;

  const getPosition = (detectedAt: string) => {
    const age = Date.now() - new Date(detectedAt).getTime();
    const minutesAgo = age / (60 * 1000);
    return Math.min((minutesAgo / 60) * 100, 100);
  };

  const isRecent = (detectedAt: string) => {
    const age = Date.now() - new Date(detectedAt).getTime();
    return age < 10 * 60 * 1000; // Less than 10 minutes
  };

  const getSentimentColor = (sentiment: number | null) => {
    if (sentiment === null) return 'bg-slate-500';
    if (sentiment > 0.1) return 'bg-emerald-500';
    if (sentiment < -0.1) return 'bg-rose-500';
    return 'bg-slate-500';
  };

  return (
    <div className="h-full p-4 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-emerald-500" />
          <span className="text-sm font-medium text-slate-300">Live Pulse</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-emerald-500 font-medium">LIVE</span>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 flex items-center">
        <div className="relative w-full h-8">
          {/* Base line */}
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-800 -translate-y-1/2" />
          
          {/* Time markers */}
          <div className="absolute top-1/2 left-0 h-2 w-0.5 bg-slate-700 -translate-y-1/2" />
          <div className="absolute top-1/2 left-1/4 h-1.5 w-0.5 bg-slate-800 -translate-y-1/2" />
          <div className="absolute top-1/2 left-1/2 h-2 w-0.5 bg-slate-700 -translate-y-1/2" />
          <div className="absolute top-1/2 left-3/4 h-1.5 w-0.5 bg-slate-800 -translate-y-1/2" />
          <div className="absolute top-1/2 right-0 h-2 w-0.5 bg-slate-700 -translate-y-1/2" />

          {/* Activity dots */}
          {recentArticles.map((article, index) => {
            const position = getPosition(article.detected_at);
            const recent = isRecent(article.detected_at);
            const size = recent ? 12 : 8;
            const opacity = recent ? 1 : 0.5;

            return (
              <div
                key={article.id}
                className={cn(
                  "absolute top-1/2 -translate-y-1/2 rounded-full transition-all duration-300",
                  getSentimentColor(article.sentiment_score),
                  recent && "animate-scale-in"
                )}
                style={{
                  left: `${100 - position}%`,
                  width: `${size}px`,
                  height: `${size}px`,
                  opacity,
                  transform: 'translate(-50%, -50%)',
                  zIndex: recent ? 10 : 1
                }}
                title={article.title}
              />
            );
          })}
        </div>
      </div>

      {/* Time labels */}
      <div className="flex justify-between text-xs text-slate-600 mt-2">
        <span>60m ago</span>
        <span>30m</span>
        <span>now</span>
      </div>

      {/* Counter */}
      <div className="mt-4 pt-4 border-t border-slate-800 flex items-baseline gap-2">
        <span className="text-3xl font-bold font-mono text-white">{signalsLastHour}</span>
        <span className="text-sm text-slate-500">signals / hour</span>
      </div>
    </div>
  );
}
