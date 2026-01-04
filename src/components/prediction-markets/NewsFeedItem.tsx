import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, TrendingDown, Minus, ExternalLink, 
  Sparkles, ChevronRight, Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { NewsArticle } from './NewsIntelligenceDashboard';

interface NewsFeedItemProps {
  article: NewsArticle;
  isSelected: boolean;
  onSelect: () => void;
}

export function NewsFeedItem({ article, isSelected, onSelect }: NewsFeedItemProps) {
  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case 'critical':
        return { color: 'bg-rose-500', label: '🔴 BREAKING', textColor: 'text-rose-500' };
      case 'high':
        return { color: 'bg-amber-500', label: '🟡 DEVELOPING', textColor: 'text-amber-500' };
      case 'medium':
        return { color: 'bg-blue-500', label: '🔵 ANALYSIS', textColor: 'text-blue-500' };
      default:
        return { color: 'bg-muted', label: 'NEWS', textColor: 'text-muted-foreground' };
    }
  };

  const getSentimentIcon = (score: number) => {
    if (score > 0.1) return <TrendingUp className="h-4 w-4 text-emerald-500" />;
    if (score < -0.1) return <TrendingDown className="h-4 w-4 text-rose-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const severityConfig = getSeverityConfig(article.severity);
  const marketsCount = article.related_markets?.length || 0;

  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        isSelected && "ring-2 ring-primary shadow-md",
        article.severity === 'critical' && "border-rose-500/30 bg-rose-500/5"
      )}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Severity Badge */}
            <div className="flex items-center gap-2 mb-2">
              <Badge 
                variant="outline" 
                className={cn("text-xs", severityConfig.textColor)}
              >
                {severityConfig.label}
              </Badge>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(article.detected_at), { addSuffix: true })}
              </span>
            </div>

            {/* Title */}
            <h3 className="font-medium text-sm mb-2 line-clamp-2">{article.title}</h3>

            {/* Metadata Row */}
            <div className="flex items-center gap-3 text-xs">
              {/* Entities */}
              {article.entities && article.entities.length > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">Entities:</span>
                  <div className="flex gap-1">
                    {article.entities.slice(0, 3).map((entity, i) => (
                      <Badge key={i} variant="secondary" className="text-xs py-0">
                        {entity}
                      </Badge>
                    ))}
                    {article.entities.length > 3 && (
                      <Badge variant="secondary" className="text-xs py-0">
                        +{article.entities.length - 3}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Row */}
            <div className="flex items-center gap-4 mt-3">
              {/* Sentiment */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Sentiment:</span>
                <span className={cn(
                  "text-xs font-medium",
                  article.sentiment_score > 0.1 ? "text-emerald-500" : 
                  article.sentiment_score < -0.1 ? "text-rose-500" : "text-muted-foreground"
                )}>
                  {article.sentiment_score > 0 ? '+' : ''}{article.sentiment_score?.toFixed(2) || '0.00'}
                </span>
                {getSentimentIcon(article.sentiment_score)}
              </div>

              {/* Markets Affected */}
              {marketsCount > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">Markets:</span>
                  <Badge variant="outline" className="text-xs">
                    {marketsCount} affected
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                onSelect();
              }}
            >
              <Sparkles className="h-3 w-3 mr-1" />
              Analyze
            </Button>
            {article.source_url && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(article.source_url, '_blank');
                }}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Source
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
