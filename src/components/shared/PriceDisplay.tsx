import { useMarketDataQuery, usePriceChangeAnimation } from '@/hooks/useMarketDataQuery';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Clock } from 'lucide-react';
import { useRef, useEffect } from 'react';

interface PriceDisplayProps {
  ticker: string;
  showChange?: boolean;
  showTimestamp?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function PriceDisplay({
  ticker,
  showChange = true,
  showTimestamp = false,
  size = 'md',
  className,
}: PriceDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const {
    data,
    isLoading,
    timeAgo,
    isStale,
    setObserverElement,
    isMarketOpen,
  } = useMarketDataQuery(ticker, { subscribeToUpdates: true });
  
  const priceChangeDirection = usePriceChangeAnimation(data?.price);
  
  // Set up intersection observer
  useEffect(() => {
    setObserverElement(containerRef.current);
  }, [setObserverElement]);
  
  const sizeClasses = {
    sm: {
      price: 'text-sm font-medium',
      change: 'text-xs',
      timestamp: 'text-[10px]',
    },
    md: {
      price: 'text-lg font-semibold',
      change: 'text-sm',
      timestamp: 'text-xs',
    },
    lg: {
      price: 'text-2xl font-bold',
      change: 'text-base',
      timestamp: 'text-sm',
    },
  };
  
  if (isLoading) {
    return (
      <div className={cn('flex flex-col gap-1', className)}>
        <Skeleton className={cn('h-6 w-20', size === 'lg' && 'h-8 w-24')} />
        {showChange && <Skeleton className="h-4 w-16" />}
      </div>
    );
  }
  
  if (!data) {
    return (
      <div className={cn('text-muted-foreground', sizeClasses[size].price, className)}>
        --
      </div>
    );
  }
  
  const isPositive = data.changePercent >= 0;
  
  return (
    <div ref={containerRef} className={cn('flex flex-col', className)}>
      {/* Price with flash animation */}
      <div
        className={cn(
          sizeClasses[size].price,
          'transition-all duration-300',
          priceChangeDirection === 'up' && 'text-emerald-400 animate-pulse',
          priceChangeDirection === 'down' && 'text-rose-400 animate-pulse',
          !priceChangeDirection && 'text-foreground',
          isStale && 'opacity-75'
        )}
      >
        ${data.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
      
      {/* Change */}
      {showChange && (
        <div
          className={cn(
            'flex items-center gap-1',
            sizeClasses[size].change,
            isPositive ? 'text-emerald-500' : 'text-rose-500'
          )}
        >
          {isPositive ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingDown className="h-3 w-3" />
          )}
          <span>
            {isPositive ? '+' : ''}
            {data.change.toFixed(2)} ({data.changePercent.toFixed(2)}%)
          </span>
        </div>
      )}
      
      {/* Timestamp */}
      {showTimestamp && timeAgo && (
        <div
          className={cn(
            'flex items-center gap-1 text-muted-foreground mt-1',
            sizeClasses[size].timestamp,
            isStale && 'text-amber-500'
          )}
        >
          <Clock className="h-3 w-3" />
          <span>as of {timeAgo}</span>
          {!isMarketOpen && <span className="text-muted-foreground/50">(market closed)</span>}
        </div>
      )}
    </div>
  );
}

// Compact inline price for lists
interface InlinePriceProps {
  ticker: string;
  className?: string;
}

export function InlinePrice({ ticker, className }: InlinePriceProps) {
  const { data, isLoading } = useMarketDataQuery(ticker, { subscribeToUpdates: true });
  const priceChangeDirection = usePriceChangeAnimation(data?.price);
  
  if (isLoading || !data) {
    return <Skeleton className="h-4 w-16 inline-block" />;
  }
  
  const isPositive = data.changePercent >= 0;
  
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium transition-colors duration-300',
        priceChangeDirection === 'up' && 'text-emerald-400',
        priceChangeDirection === 'down' && 'text-rose-400',
        !priceChangeDirection && 'text-foreground',
        className
      )}
    >
      <span>${data.price.toFixed(2)}</span>
      <span
        className={cn(
          'text-xs',
          isPositive ? 'text-emerald-500' : 'text-rose-500'
        )}
      >
        {isPositive ? '+' : ''}{data.changePercent.toFixed(2)}%
      </span>
    </span>
  );
}

// Market status badge
export function MarketStatusBadge({ className }: { className?: string }) {
  const { isMarketOpen, marketStatus } = useMarketDataQuery(null, { enabled: false });
  
  const statusConfig = {
    open: { label: 'Market Open', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    'pre-market': { label: 'Pre-Market', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    'after-hours': { label: 'After Hours', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    closed: { label: 'Market Closed', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
  };
  
  const config = statusConfig[marketStatus];
  
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border',
        config.color,
        className
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          marketStatus === 'open' && 'bg-emerald-400 animate-pulse'
        )}
        style={{
          backgroundColor:
            marketStatus === 'open'
              ? undefined
              : marketStatus === 'pre-market'
              ? '#60a5fa'
              : marketStatus === 'after-hours'
              ? '#fbbf24'
              : '#94a3b8',
        }}
      />
      {config.label}
    </span>
  );
}
