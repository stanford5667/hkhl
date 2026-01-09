import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface TickerItem {
  symbol: string;
  price: number;
  change: number;
}

const mockTickers: TickerItem[] = [
  { symbol: 'SPY', price: 594.32, change: 0.42 },
  { symbol: 'QQQ', price: 518.76, change: 0.67 },
  { symbol: 'AAPL', price: 248.13, change: -0.23 },
  { symbol: 'MSFT', price: 438.92, change: 0.89 },
  { symbol: 'GOOGL', price: 197.45, change: 1.12 },
  { symbol: 'AMZN', price: 224.67, change: 0.34 },
  { symbol: 'NVDA', price: 142.58, change: 2.45 },
  { symbol: 'TSLA', price: 412.34, change: -1.23 },
  { symbol: 'META', price: 612.89, change: 0.78 },
  { symbol: 'BRK.B', price: 468.21, change: 0.15 },
  { symbol: 'JPM', price: 248.56, change: 0.52 },
  { symbol: 'V', price: 318.43, change: 0.31 },
  { symbol: 'DIA', price: 438.12, change: 0.28 },
  { symbol: 'IWM', price: 224.89, change: -0.45 },
  { symbol: 'GLD', price: 242.67, change: 0.89 },
];

export function TickerStream({ className }: { className?: string }) {
  const [tickers, setTickers] = useState<TickerItem[]>(mockTickers);

  // Simulate live updates
  useEffect(() => {
    const interval = setInterval(() => {
      setTickers(prev => prev.map(t => ({
        ...t,
        price: t.price * (1 + (Math.random() - 0.5) * 0.001),
        change: t.change + (Math.random() - 0.5) * 0.1
      })));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Double the tickers for seamless loop
  const displayTickers = [...tickers, ...tickers];

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
    </div>
  );
}
