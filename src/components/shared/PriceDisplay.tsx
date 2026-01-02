import { useMarketDataQuery, usePriceChangeAnimation } from '@/hooks/useMarketDataQuery';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Clock, RefreshCw, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getStalenessLevel, getStalenessColor, formatStalenessText } from '@/hooks/useManualRefresh';
import { DataPausedState } from '@/components/shared/DataPausedState';

interface PriceDisplayProps {
  ticker: string;
  showChange?: boolean;
  showTimestamp?: boolean;
  showRefresh?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function PriceDisplay({
  ticker,
  showChange = true,
  showTimestamp = false,
  showRefresh = false,
  size = 'md',
  className,
}: PriceDisplayProps) {
  const {
    data,
    isLoading,
    isFetching,
    timeAgo,
    isStale,
    lastUpdated,
    refresh,
    isMarketOpen,
  } = useMarketDataQuery(ticker);
  
  const priceChangeDirection = usePriceChangeAnimation(data?.price);
  
  const isMock = data?.isMock || data?.source === 'mock';
  
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
  
  const stalenessLevel = getStalenessLevel(lastUpdated ?? null);
  const stalenessText = formatStalenessText(lastUpdated ?? null);
  const stalenessColor = getStalenessColor(stalenessLevel);
  
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
      <div className={cn('flex items-center gap-2', className)}>
        <span className={cn('text-muted-foreground', sizeClasses[size].price)}>
          --
        </span>
        {showRefresh && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refresh()}
            className="h-6 px-2"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }
  
  const isPositive = data.changePercent >= 0;
  
  return (
    <div className={cn('flex flex-col', className)}>
      {/* Price with flash animation */}
      <div className="flex items-center gap-2">
        <span
          className={cn(
            sizeClasses[size].price,
            'transition-all duration-300',
            priceChangeDirection === 'up' && 'text-emerald-400 animate-pulse',
            priceChangeDirection === 'down' && 'text-rose-400 animate-pulse',
            !priceChangeDirection && 'text-foreground',
            (isStale || isMock) && 'opacity-75',
            isMock && 'italic'
          )}
        >
          ${data.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        
        {/* Mock data indicator */}
        {isMock && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20">
                <Info className="h-3 w-3" />
                sample
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">This is sample data for development. Click refresh for live prices.</p>
            </TooltipContent>
          </Tooltip>
        )}
        
        {/* Staleness indicator (only show if not mock) */}
        {!isMock && stalenessText && (
          <span className={cn('text-xs', stalenessColor)}>
            ({stalenessText})
          </span>
        )}
        
        {/* Refresh button */}
        {showRefresh && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refresh()}
            disabled={isFetching}
            className="h-6 px-2"
          >
            <RefreshCw className={cn('h-3 w-3', isFetching && 'animate-spin')} />
          </Button>
        )}
      </div>
      
      {/* Change */}
      {showChange && (
        <div
          className={cn(
            'flex items-center gap-1',
            sizeClasses[size].change,
            isPositive ? 'text-emerald-500' : 'text-rose-500',
            isMock && 'opacity-70'
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
  showStaleness?: boolean;
  className?: string;
}

export function InlinePrice({ ticker, showStaleness = true, className }: InlinePriceProps) {
  const { data, isLoading, lastUpdated } = useMarketDataQuery(ticker);
  const priceChangeDirection = usePriceChangeAnimation(data?.price);
  
  const isMock = data?.isMock || data?.source === 'mock';
  const stalenessLevel = getStalenessLevel(lastUpdated ?? null);
  const stalenessText = formatStalenessText(lastUpdated ?? null);
  const stalenessColor = getStalenessColor(stalenessLevel);
  
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
        isMock && 'opacity-75 italic',
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
      {isMock && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-xs text-amber-600 dark:text-amber-400">(sample)</span>
          </TooltipTrigger>
          <TooltipContent>Sample data. Click refresh for live prices.</TooltipContent>
        </Tooltip>
      )}
      {!isMock && showStaleness && stalenessText && (
        <span className={cn('text-xs', stalenessColor)}>
          ({stalenessText})
        </span>
      )}
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
