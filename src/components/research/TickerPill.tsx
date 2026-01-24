import React from 'react';
import { cn } from '@/lib/utils';

interface TickerPillProps {
  ticker: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  onClick?: () => void;
  logoUrl?: string;
}

export function TickerPill({ ticker, sentiment, onClick, logoUrl }: TickerPillProps) {
  const sentimentStyles = {
    positive: 'shadow-[0_0_12px_hsl(var(--success)/0.4)] border-success/50 text-success',
    negative: 'shadow-[0_0_12px_hsl(var(--destructive)/0.4)] border-destructive/50 text-destructive',
    neutral: 'shadow-[0_0_8px_hsl(var(--muted-foreground)/0.2)] border-border text-muted-foreground',
  };

  const glowStyles = {
    positive: 'bg-success/10',
    negative: 'bg-destructive/10',
    neutral: 'bg-muted/50',
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        // Touch target minimum 44px
        'min-h-[44px] min-w-[44px] px-3 py-2',
        'inline-flex items-center gap-2 rounded-full',
        'border backdrop-blur-sm transition-all duration-200',
        'font-mono text-sm font-medium tracking-tight',
        'hover:scale-105 active:scale-95',
        sentimentStyles[sentiment],
        glowStyles[sentiment]
      )}
    >
      {logoUrl ? (
        <img 
          src={logoUrl} 
          alt={ticker} 
          className="h-5 w-5 rounded-full object-contain"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : (
        <div className={cn(
          'h-2 w-2 rounded-full',
          sentiment === 'positive' && 'bg-success',
          sentiment === 'negative' && 'bg-destructive',
          sentiment === 'neutral' && 'bg-muted-foreground'
        )} />
      )}
      <span>{ticker}</span>
    </button>
  );
}
