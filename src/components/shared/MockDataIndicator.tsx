import React from 'react';
import { Info, RefreshCw } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { DataSource } from '@/services/mockDataService';

interface MockDataIndicatorProps {
  source: DataSource;
  cachedAt?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  compact?: boolean;
  className?: string;
}

export function MockDataIndicator({
  source,
  cachedAt,
  onRefresh,
  isRefreshing,
  compact = false,
  className,
}: MockDataIndicatorProps) {
  if (source === 'live') return null;

  const isMock = source === 'mock';
  
  const getTimeAgo = () => {
    if (!cachedAt) return 'unknown';
    const date = new Date(cachedAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'yesterday';
    return `${diffDays}d ago`;
  };

  const tooltipContent = isMock
    ? 'This is sample data for development. Click refresh for live prices.'
    : `Cached ${getTimeAgo()}. Click refresh for live data.`;

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              'inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded',
              isMock 
                ? 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20' 
                : 'text-muted-foreground bg-muted/50',
              className
            )}
          >
            <Info className="h-3 w-3" />
            {isMock ? 'sample' : getTimeAgo()}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs">{tooltipContent}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 text-xs rounded-md px-2 py-1',
        isMock
          ? 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
          : 'text-muted-foreground bg-muted/50',
        className
      )}
    >
      <Info className="h-3 w-3 flex-shrink-0" />
      <span>
        {isMock ? '(sample data)' : `Cached ${getTimeAgo()}`}
      </span>
      {onRefresh && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 ml-1"
              onClick={onRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn('h-3 w-3', isRefreshing && 'animate-spin')} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Click to refresh with live data</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

// Wrapper for price displays that need mock styling
interface MockPriceWrapperProps {
  isMock: boolean;
  children: React.ReactNode;
  className?: string;
}

export function MockPriceWrapper({ isMock, children, className }: MockPriceWrapperProps) {
  return (
    <span className={cn(isMock && 'opacity-70 italic', className)}>
      {children}
    </span>
  );
}
