import React from 'react';
import { Clock, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TickerPill } from './TickerPill';
import type { PolygonNewsArticle } from '@/hooks/usePolygonNews';
import { formatNewsTime } from '@/hooks/usePolygonNews';

interface NewsCardProps {
  article: PolygonNewsArticle;
  onTickerClick: (ticker: string) => void;
  index: number;
}

export function NewsCard({ article, onTickerClick, index }: NewsCardProps) {
  const hasImage = !!article.image_url;

  return (
    <article
      className={cn(
        // Glass card styling
        'relative overflow-hidden rounded-xl',
        'bg-slate-900/50 dark:bg-slate-900/50 light:bg-card/80',
        'border border-slate-800 dark:border-slate-800',
        'backdrop-blur-md',
        // Animation
        'opacity-0 animate-fade-up',
        // Hover effects
        'transition-all duration-300',
        'hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5'
      )}
      style={{ 
        animationDelay: `${index * 80}ms`,
        animationFillMode: 'forwards'
      }}
    >
      {/* Optional Hero Image */}
      {hasImage && (
        <div className="relative h-40 overflow-hidden">
          <img
            src={article.image_url}
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 to-transparent" />
        </div>
      )}

      <div className="p-4 space-y-3">
        {/* Meta Row: Publisher & Time */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-500 font-medium uppercase tracking-wider">
            {article.publisher.name}
          </span>
          <span className="flex items-center gap-1 text-slate-600 dark:text-slate-600">
            <Clock className="h-3 w-3" />
            <span className="font-mono">{formatNewsTime(article.published_utc)}</span>
          </span>
        </div>

        {/* Title - Bold, largest element */}
        <h3 className="text-lg font-bold leading-tight text-foreground font-sans">
          {article.title}
        </h3>

        {/* Summary - 2 lines max */}
        {article.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {article.description}
          </p>
        )}

        {/* Impact Strip - Ticker Pills with Sentiment Glow */}
        {article.tickers && article.tickers.length > 0 && (
          <div className="pt-2 border-t border-slate-800/50">
            <div className="flex flex-wrap gap-2">
              {article.tickers.slice(0, 5).map((ticker) => {
                const insight = article.insights?.find((i) => i.ticker === ticker);
                const sentiment = insight?.sentiment || 'neutral';
                
                return (
                  <TickerPill
                    key={ticker}
                    ticker={ticker}
                    sentiment={sentiment}
                    onClick={() => onTickerClick(ticker)}
                  />
                );
              })}
              {article.tickers.length > 5 && (
                <span className="flex items-center text-xs text-slate-500 font-mono">
                  +{article.tickers.length - 5} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Read More Link */}
        <a
          href={article.article_url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'inline-flex items-center gap-1.5 text-xs text-primary',
            'hover:text-primary/80 transition-colors',
            'min-h-[44px] py-2' // Touch target
          )}
        >
          Read full article
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </article>
  );
}
