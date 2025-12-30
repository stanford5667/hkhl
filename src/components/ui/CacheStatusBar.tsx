import { RefreshCw, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface CacheStatusBarProps {
  lastFetched: Date | null;
  expiresAt: Date | null;
  isStale: boolean;
  isLoading: boolean;
  onRefresh: () => void;
  source?: string;
  className?: string;
}

export function CacheStatusBar({
  lastFetched,
  expiresAt,
  isStale,
  isLoading,
  onRefresh,
  source = 'data',
  className
}: CacheStatusBarProps) {
  const timeUntilRefresh = expiresAt ? formatTimeUntil(expiresAt) : null;
  
  return (
    <div className={cn(
      "flex items-center justify-between px-3 py-2 rounded-lg bg-muted/30 border border-border",
      className
    )}>
      <div className="flex items-center gap-2">
        {/* Status Indicator */}
        <div className={cn(
          "h-2 w-2 rounded-full",
          isLoading ? "bg-amber-400 animate-pulse" :
          isStale ? "bg-amber-400" : 
          lastFetched ? "bg-emerald-400" : "bg-muted-foreground"
        )} />
        
        {/* Status Text */}
        {isLoading ? (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <RefreshCw className="h-3 w-3 animate-spin" />
            Fetching {source}...
          </span>
        ) : lastFetched ? (
          <span className="text-xs text-muted-foreground">
            Updated {formatDistanceToNow(lastFetched, { addSuffix: true })}
            {isStale && <span className="text-amber-400 ml-1">(stale)</span>}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">No data cached</span>
        )}
      </div>
      
      <div className="flex items-center gap-3">
        {/* Time until auto-refresh */}
        {timeUntilRefresh && !isStale && !isLoading && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Refreshes in {timeUntilRefresh}
          </span>
        )}
        
        {/* Manual Refresh Button */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onRefresh}
                disabled={isLoading}
                className="h-7 px-2"
              >
                <RefreshCw className={cn(
                  "h-3.5 w-3.5",
                  isLoading && "animate-spin"
                )} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Refresh now</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

function formatTimeUntil(date: Date): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  
  if (diff <= 0) return 'Expired';
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
