import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Zap, BarChart3, Bell, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NewsStats {
  breakingNews: number;
  avgSentiment: number;
  marketsAffected: number;
  aiAlerts: number;
}

interface NewsStatsCardsProps {
  stats: NewsStats;
}

export function NewsStatsCards({ stats }: NewsStatsCardsProps) {
  const sentimentDirection = stats.avgSentiment >= 0 ? 'positive' : 'negative';
  const SentimentIcon = stats.avgSentiment >= 0 ? TrendingUp : TrendingDown;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card className="bg-gradient-to-br from-rose-500/10 to-rose-600/5 border-rose-500/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Breaking News</p>
              <p className="text-2xl font-bold text-rose-500">{stats.breakingNews}</p>
            </div>
            <div className="p-2 bg-rose-500/20 rounded-lg">
              <Zap className="h-5 w-5 text-rose-500" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">High-impact articles</p>
        </CardContent>
      </Card>

      <Card className={cn(
        "bg-gradient-to-br border-opacity-20",
        sentimentDirection === 'positive' 
          ? "from-emerald-500/10 to-emerald-600/5 border-emerald-500/20"
          : "from-rose-500/10 to-rose-600/5 border-rose-500/20"
      )}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Sentiment Score</p>
              <p className={cn(
                "text-2xl font-bold",
                sentimentDirection === 'positive' ? "text-emerald-500" : "text-rose-500"
              )}>
                {stats.avgSentiment >= 0 ? '+' : ''}{stats.avgSentiment.toFixed(2)}
              </p>
            </div>
            <div className={cn(
              "p-2 rounded-lg",
              sentimentDirection === 'positive' ? "bg-emerald-500/20" : "bg-rose-500/20"
            )}>
              <SentimentIcon className={cn(
                "h-5 w-5",
                sentimentDirection === 'positive' ? "text-emerald-500" : "text-rose-500"
              )} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {sentimentDirection === 'positive' ? 'Bullish' : 'Bearish'} market sentiment
          </p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Markets Affected</p>
              <p className="text-2xl font-bold text-blue-500">{stats.marketsAffected}</p>
            </div>
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Target className="h-5 w-5 text-blue-500" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Linked prediction markets</p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">AI Alerts</p>
              <p className="text-2xl font-bold text-amber-500">{stats.aiAlerts}</p>
            </div>
            <div className="p-2 bg-amber-500/20 rounded-lg">
              <Bell className="h-5 w-5 text-amber-500" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Active in last hour</p>
        </CardContent>
      </Card>
    </div>
  );
}
