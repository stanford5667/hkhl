import React from 'react';
import { Clock, ExternalLink, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PolygonNewsArticle } from '@/hooks/usePolygonNews';
import { formatNewsTime } from '@/hooks/usePolygonNews';

interface ImpactCardProps {
  article: PolygonNewsArticle;
  onTickerClick: (ticker: string) => void;
  index: number;
}

interface ConsensusPillProps {
  ticker: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  hasConsensus?: boolean; // Multiple sources agree
  onClick: () => void;
}

function ConsensusPill({ ticker, sentiment, hasConsensus = false, onClick }: ConsensusPillProps) {
  const sentimentColors = {
    positive: 'border-success/50 text-success bg-success/10',
    negative: 'border-destructive/50 text-destructive bg-destructive/10',
    neutral: 'border-slate-700 text-muted-foreground bg-slate-800/50',
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full',
        'font-mono text-xs font-medium transition-all duration-200',
        'border backdrop-blur-sm min-h-[32px]',
        'hover:scale-105 active:scale-95',
        sentimentColors[sentiment],
        // Verified Consensus glow effect
        hasConsensus && sentiment === 'positive' && [
          'shadow-[0_0_16px_hsl(var(--success)/0.5),0_0_32px_hsl(var(--success)/0.25)]',
          'border-success animate-pulse',
          'ring-1 ring-success/30'
        ],
        hasConsensus && sentiment === 'negative' && [
          'shadow-[0_0_16px_hsl(var(--destructive)/0.5),0_0_32px_hsl(var(--destructive)/0.25)]',
          'border-destructive animate-pulse',
          'ring-1 ring-destructive/30'
        ]
      )}
    >
      {/* Consensus indicator dot */}
      <div className={cn(
        'h-1.5 w-1.5 rounded-full',
        sentiment === 'positive' && 'bg-success',
        sentiment === 'negative' && 'bg-destructive',
        sentiment === 'neutral' && 'bg-muted-foreground',
        hasConsensus && 'animate-pulse'
      )} />
      <span>{ticker}</span>
      {hasConsensus && (
        <Sparkles className="h-3 w-3" />
      )}
    </button>
  );
}

export function ImpactCard({ article, onTickerClick, index }: ImpactCardProps) {
  // Generate a 1-sentence AI summary (simplified version)
  const generateSummary = (title: string, description: string): string => {
    if (description && description.length > 50) {
      // Truncate to first sentence
      const firstSentence = description.split(/[.!?]/)[0];
      return firstSentence.length > 100 
        ? firstSentence.substring(0, 100) + '...' 
        : firstSentence + '.';
    }
    // Fallback to shortened title
    return title.length > 80 ? title.substring(0, 80) + '...' : title;
  };

  const summary = generateSummary(article.title, article.description);
  
  // Simulate consensus detection (in real implementation, check multiple API sources)
  const getTickerConsensus = (ticker: string): boolean => {
    // Simulate: tickers appearing in first position or with strong sentiment get "consensus"
    const insight = article.insights?.find(i => i.ticker === ticker);
    if (!insight) return false;
    // Mark as consensus if sentiment is not neutral (simulating multi-source agreement)
    return insight.sentiment !== 'neutral' && article.tickers.indexOf(ticker) < 2;
  };

  return (
    <article
      className={cn(
        // Glassmorphism styling
        'relative overflow-hidden rounded-xl',
        'bg-slate-950/40 backdrop-blur-md',
        'border border-slate-800/60',
        // Animation
        'opacity-0 animate-fade-up',
        // Hover effects
        'transition-all duration-300',
        'hover:border-primary/30 hover:bg-slate-900/50'
      )}
      style={{ 
        animationDelay: `${index * 60}ms`,
        animationFillMode: 'forwards'
      }}
    >
      <div className="p-4 space-y-3">
        {/* Meta Row: Publisher & Time */}
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-muted-foreground font-medium uppercase tracking-wider">
            {article.publisher.name}
          </span>
          <span className="flex items-center gap-1 text-muted-foreground font-mono">
            <Clock className="h-3 w-3" />
            {formatNewsTime(article.published_utc)}
          </span>
        </div>

        {/* Headline - Bold, primary text */}
        <h3 className="text-base font-bold leading-tight text-foreground line-clamp-2">
          {article.title}
        </h3>

        {/* AI Summary - Single sentence */}
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-1">
          {summary}
        </p>

        {/* Causality Strip - Ticker Pills with Consensus Glow */}
        {article.tickers && article.tickers.length > 0 && (
          <div className="pt-3 border-t border-slate-800/50">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Impact
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {article.tickers.slice(0, 6).map((ticker) => {
                const insight = article.insights?.find((i) => i.ticker === ticker);
                const sentiment = insight?.sentiment || 'neutral';
                const hasConsensus = getTickerConsensus(ticker);
                
                return (
                  <ConsensusPill
                    key={ticker}
                    ticker={ticker}
                    sentiment={sentiment}
                    hasConsensus={hasConsensus}
                    onClick={() => onTickerClick(ticker)}
                  />
                );
              })}
              {article.tickers.length > 6 && (
                <span className="flex items-center text-[10px] text-muted-foreground font-mono px-2">
                  +{article.tickers.length - 6}
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
            'inline-flex items-center gap-1 text-[11px] text-primary/80',
            'hover:text-primary transition-colors',
            'font-medium'
          )}
        >
          Read full article
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </article>
  );
}
