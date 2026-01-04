import React from 'react';
import { Activity, AlertTriangle, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickStatsProps {
  stats: {
    total: number;
    critical: number;
    avgSentiment: number;
    marketsAffected: number;
  };
}

export function QuickStats({ stats }: QuickStatsProps) {
  const sentimentIcon = stats.avgSentiment >= 0 ? TrendingUp : TrendingDown;
  const SentimentIcon = sentimentIcon;
  const sentimentFormatted = `${stats.avgSentiment >= 0 ? '+' : ''}${(stats.avgSentiment * 100).toFixed(1)}%`;

  return (
    <div className="grid grid-cols-2 gap-3 h-full">
      {/* Total Signals */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="h-4 w-4 text-slate-500" />
          <span className="text-xs text-slate-500 uppercase tracking-wide">Signals Today</span>
        </div>
        <div className="text-2xl font-bold font-mono text-white">{stats.total}</div>
      </div>

      {/* Critical Alerts */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className={cn(
            "h-4 w-4",
            stats.critical > 0 ? "text-rose-500" : "text-slate-500"
          )} />
          <span className="text-xs text-slate-500 uppercase tracking-wide">Critical</span>
        </div>
        <div className={cn(
          "text-2xl font-bold font-mono",
          stats.critical > 0 ? "text-rose-500 animate-pulse" : "text-white"
        )}>
          {stats.critical}
        </div>
      </div>

      {/* Market Sentiment */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-2">
          <SentimentIcon className={cn(
            "h-4 w-4",
            stats.avgSentiment >= 0 ? "text-emerald-500" : "text-rose-500"
          )} />
          <span className="text-xs text-slate-500 uppercase tracking-wide">Avg Sentiment</span>
        </div>
        <div className={cn(
          "text-2xl font-bold font-mono",
          stats.avgSentiment >= 0 ? "text-emerald-500" : "text-rose-500"
        )}>
          {sentimentFormatted}
        </div>
      </div>

      {/* Markets Affected */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 className="h-4 w-4 text-blue-500" />
          <span className="text-xs text-slate-500 uppercase tracking-wide">Markets</span>
        </div>
        <div className="text-2xl font-bold font-mono text-blue-500">{stats.marketsAffected}</div>
      </div>
    </div>
  );
}
