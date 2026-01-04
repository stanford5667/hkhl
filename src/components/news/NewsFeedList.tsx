import React from 'react';
import { Newspaper, Clock, TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import type { NewsArticle } from '@/hooks/useNewsIntelligence';

interface NewsFeedListProps {
  articles: NewsArticle[];
  selectedId: string | null;
  onSelect: (article: NewsArticle) => void;
  isLoading: boolean;
}

const getSeverityConfig = (severity: string | null) => {
  switch (severity) {
    case 'critical':
      return { 
        borderClass: 'border-l-rose-500', 
        label: '🔴 BREAKING', 
        badgeClass: 'bg-rose-500/20 text-rose-400 border-rose-500/30' 
      };
    case 'high':
      return { 
        borderClass: 'border-l-amber-500', 
        label: '🟡 ALERT', 
        badgeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/30' 
      };
    case 'medium':
      return { 
        borderClass: 'border-l-blue-500', 
        label: '🔵 UPDATE', 
        badgeClass: 'bg-blue-500/20 text-blue-400 border-blue-500/30' 
      };
    default:
      return { 
        borderClass: 'border-l-slate-600', 
        label: 'NEWS', 
        badgeClass: 'bg-slate-500/20 text-slate-400 border-slate-500/30' 
      };
  }
};

const getSentimentIndicator = (score: number | null) => {
  if (score === null) return { icon: Minus, color: 'text-slate-500', label: 'N/A' };
  if (score > 0.1) return { icon: TrendingUp, color: 'text-emerald-400', label: `+${(score * 100).toFixed(0)}%` };
  if (score < -0.1) return { icon: TrendingDown, color: 'text-rose-400', label: `${(score * 100).toFixed(0)}%` };
  return { icon: Minus, color: 'text-slate-400', label: '0%' };
};

function NewsCardSkeleton() {
  return (
    <div className="p-4 rounded-lg border-l-4 border-l-slate-600 bg-slate-900/60 border border-slate-800">
      <div className="flex items-center gap-2 mb-2">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="h-5 w-full mb-1" />
      <Skeleton className="h-5 w-3/4 mb-3" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  );
}

export function NewsFeedList({ articles, selectedId, onSelect, isLoading }: NewsFeedListProps) {
  if (isLoading) {
    return (
      <Card className="h-full bg-slate-900/80 border-slate-800 backdrop-blur-sm flex flex-col">
        <CardHeader className="pb-2 flex-shrink-0">
          <CardTitle className="text-sm font-medium text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Newspaper className="h-4 w-4 text-amber-400" />
              Signal Feed
            </span>
            <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          <div className="px-4 pb-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <NewsCardSkeleton key={i} />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full bg-slate-900/80 border-slate-800 backdrop-blur-sm flex flex-col">
      <CardHeader className="pb-2 flex-shrink-0">
        <CardTitle className="text-sm font-medium text-slate-400 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Newspaper className="h-4 w-4 text-amber-400" />
            Signal Feed
          </span>
          <Badge variant="outline" className="text-xs border-slate-700">
            {articles.length} signals
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full px-4 pb-4">
          {articles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <Newspaper className="h-12 w-12 mb-4 opacity-30" />
              <p className="text-sm font-medium">No signals detected</p>
              <p className="text-xs mt-1">Adjust filters or check back later</p>
            </div>
          ) : (
            <div className="space-y-3">
              {articles.map((article, index) => {
                const severityConfig = getSeverityConfig(article.severity);
                const sentiment = getSentimentIndicator(article.sentiment_score);
                const SentimentIcon = sentiment.icon;

                return (
                  <div
                    key={article.id}
                    onClick={() => onSelect(article)}
                    className={cn(
                      "p-4 rounded-lg border-l-4 cursor-pointer transition-all animate-fade-in",
                      "bg-slate-900/60 border border-slate-800 hover:bg-slate-800/60",
                      severityConfig.borderClass,
                      selectedId === article.id && "ring-2 ring-blue-500/50 bg-slate-800/80"
                    )}
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    {/* Header Row */}
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className={cn("text-[10px] uppercase font-semibold", severityConfig.badgeClass)}>
                        {severityConfig.label}
                      </Badge>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(article.detected_at), { addSuffix: true })}
                      </span>
                    </div>

                    {/* Title */}
                    <h4 className="text-sm font-medium text-white line-clamp-2 leading-snug mb-3">
                      {article.title}
                    </h4>

                    {/* Metadata Row */}
                    <div className="flex items-center gap-3 text-xs">
                      {article.source && (
                        <span className="text-slate-500">{article.source}</span>
                      )}
                      <div className={cn("flex items-center gap-1", sentiment.color)}>
                        <SentimentIcon className="h-3 w-3" />
                        <span>{sentiment.label}</span>
                      </div>
                    </div>

                    {/* Entity Badges */}
                    {article.entities && article.entities.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {article.entities.slice(0, 3).map((entity, i) => (
                          <Badge key={i} variant="outline" className="text-[10px] bg-slate-800/50 border-slate-700 text-slate-400">
                            {entity}
                          </Badge>
                        ))}
                        {article.entities.length > 3 && (
                          <Badge variant="outline" className="text-[10px] bg-slate-800/50 border-slate-700 text-slate-500">
                            +{article.entities.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
