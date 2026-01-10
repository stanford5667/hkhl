import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, X, Crown } from 'lucide-react';
import { PremiumBadge } from '@/components/ui/PremiumBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { NewsArticle } from '@/hooks/useNewsIntelligence';

interface TickerHeatmapProps {
  articles: NewsArticle[];
  onTickerClick: (ticker: string | null) => void;
  selectedTicker: string | null;
}

export function TickerHeatmap({ articles, onTickerClick, selectedTicker }: TickerHeatmapProps) {
  const navigate = useNavigate();
  
  const tickerData = useMemo(() => {
    const tickerMap = new Map<string, { count: number; sentiment: number[] }>();
    
    articles.forEach(article => {
      (article.related_markets || []).forEach(ticker => {
        const existing = tickerMap.get(ticker) || { count: 0, sentiment: [] };
        existing.count++;
        if (article.sentiment_score != null) {
          existing.sentiment.push(article.sentiment_score);
        }
        tickerMap.set(ticker, existing);
      });
    });
    
    return Array.from(tickerMap.entries())
      .map(([ticker, data]) => ({
        ticker,
        count: data.count,
        avgSentiment: data.sentiment.length > 0 
          ? data.sentiment.reduce((a, b) => a + b, 0) / data.sentiment.length 
          : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
  }, [articles]);

  const maxCount = Math.max(...tickerData.map(t => t.count), 1);

  if (tickerData.length === 0) {
    return (
      <Card className="h-full bg-slate-900/80 border-slate-800 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-cyan-400" />
            Ticker Heatmap
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-24 gap-1">
          <Crown className="h-5 w-5 text-amber-500/50" />
          <p className="text-xs font-medium">Premium Feature</p>
          <PremiumBadge variant="inline" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full bg-slate-900/80 border-slate-800 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-slate-400 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-cyan-400" />
            Ticker Heatmap
          </span>
          {selectedTicker && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-slate-400 hover:text-white"
              onClick={() => onTickerClick(null)}
            >
              <X className="h-3 w-3 mr-1" />
              Clear filter
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="grid grid-cols-4 gap-2">
          {tickerData.map((item) => {
            const intensity = (item.count / maxCount) * 0.5 + 0.2;
            const isPositive = item.avgSentiment >= 0;
            
            return (
              <button
                key={item.ticker}
                onClick={() => onTickerClick(selectedTicker === item.ticker ? null : item.ticker)}
                className={cn(
                  "p-2 rounded-lg border transition-all hover:scale-105",
                  "border-slate-700 hover:border-slate-600",
                  selectedTicker === item.ticker && "ring-2 ring-blue-500 border-blue-500"
                )}
                style={{
                  backgroundColor: isPositive
                    ? `rgba(16, 185, 129, ${Math.abs(item.avgSentiment) * 0.4 + 0.1})`
                    : `rgba(239, 68, 68, ${Math.abs(item.avgSentiment) * 0.4 + 0.1})`,
                  opacity: intensity + 0.3
                }}
              >
                <div 
                  className="text-xs font-mono font-bold text-white hover:text-cyan-300 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/stock/${item.ticker}`);
                  }}
                >
                  ${item.ticker}
                </div>
                <div className="text-[10px] text-white/60">{item.count} signals</div>
                {/* Activity bar */}
                <div className="mt-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full rounded-full",
                      isPositive ? "bg-emerald-400" : "bg-rose-400"
                    )}
                    style={{ width: `${(item.count / maxCount) * 100}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
