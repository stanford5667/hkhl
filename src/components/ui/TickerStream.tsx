import { useEffect, useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { useBatchQuotes } from '@/hooks/useMarketDataQuery';

interface TickerItem {
  symbol: string;
  price: number;
  change: number;
}

// Default tickers to show in the stream
const STREAM_TICKERS = [
  'SPY', 'QQQ', 'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 
  'META', 'BRK.B', 'JPM', 'V', 'DIA', 'IWM', 'GLD'
];

export function TickerStream({ className }: { className?: string }) {
  const { quotes, isLoading, isFetching, refresh } = useBatchQuotes(STREAM_TICKERS);
  
  // Map quotes to ticker items
  const tickers = useMemo<TickerItem[]>(() => {
    return STREAM_TICKERS.map(symbol => {
      const quote = quotes.get(symbol);
      return {
        symbol,
        price: quote?.price ?? 0,
        change: quote?.changePercent ?? 0,
      };
    }).filter(t => t.price > 0); // Only show tickers with valid prices
  }, [quotes]);

  // Auto-refresh every 60 seconds during market hours
  useEffect(() => {
    const interval = setInterval(() => {
      refresh();
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, [refresh]);

  // Double the tickers for seamless loop
  const displayTickers = [...tickers, ...tickers];

  // Show loading state if no data yet
  if (isLoading && tickers.length === 0) {
    return (
      <div className={cn(
        "w-full overflow-hidden bg-surface-1 border-b border-border/30 py-2",
        className
      )}>
        <div className="flex items-center justify-center gap-2 text-muted-foreground text-xs">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Loading market data...</span>
        </div>
      </div>
    );
  }

  // Don't render if no tickers available
  if (tickers.length === 0) {
    return null;
  }

  return (
    <div className={cn(
      "w-full overflow-hidden bg-surface-1 border-b border-border/30",
      className
    )}>
      <div className="ticker-scroll flex items-center gap-6 py-2 px-4">
        {displayTickers.map((ticker, i) => (
          <div 
            key={`${ticker.symbol}-${i}`}
            className="flex items-center gap-2 shrink-0"
          >
            <span className="ticker-badge text-xs">{ticker.symbol}</span>
            <span className="font-mono text-sm text-foreground">
              ${ticker.price.toFixed(2)}
            </span>
            <span className={cn(
              "flex items-center gap-0.5 text-xs font-medium font-mono",
              ticker.change >= 0 ? "text-emerald-400" : "text-rose-400"
            )}>
              {ticker.change >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {ticker.change >= 0 ? '+' : ''}{ticker.change.toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
      {isFetching && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}