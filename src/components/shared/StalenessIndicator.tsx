import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  StalenessLevel, 
  getStalenessLevel, 
  formatStalenessText, 
  getStalenessColor 
} from '@/hooks/useManualRefresh';

interface StalenessIndicatorProps {
  lastUpdated: Date | null;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  className?: string;
  showRefreshButton?: boolean;
  compact?: boolean;
}

export function StalenessIndicator({
  lastUpdated,
  onRefresh,
  isRefreshing = false,
  className,
  showRefreshButton = true,
  compact = false,
}: StalenessIndicatorProps) {
  const level = getStalenessLevel(lastUpdated);
  const text = formatStalenessText(lastUpdated);
  const colorClass = getStalenessColor(level);
  
  // Don't show anything if data is fresh
  if (level === 'fresh' && !showRefreshButton) return null;
  
  if (compact) {
    return (
      <span className={cn('text-xs', colorClass, className)}>
        {text && `(${text})`}
      </span>
    );
  }
  
  return (
    <div className={cn('flex items-center gap-2 text-xs', className)}>
      {text && (
        <span className={colorClass}>
          {text}
        </span>
      )}
      {showRefreshButton && onRefresh && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="h-6 px-2 text-xs"
        >
          <RefreshCw className={cn('h-3 w-3', isRefreshing && 'animate-spin')} />
        </Button>
      )}
    </div>
  );
}

interface RefreshButtonProps {
  onRefresh: () => void;
  isRefreshing?: boolean;
  lastUpdated?: Date | null;
  label?: string;
  className?: string;
  size?: 'sm' | 'default';
}

export function RefreshButton({
  onRefresh,
  isRefreshing = false,
  lastUpdated,
  label = 'Refresh',
  className,
  size = 'sm',
}: RefreshButtonProps) {
  const stalenessText = lastUpdated ? formatStalenessText(lastUpdated) : null;
  const level = getStalenessLevel(lastUpdated ?? null);
  const colorClass = getStalenessColor(level);
  
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {stalenessText && (
        <span className={cn('text-xs', colorClass)}>
          {stalenessText}
        </span>
      )}
      <Button
        variant="outline"
        size={size}
        onClick={onRefresh}
        disabled={isRefreshing}
        className="gap-2"
      >
        <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
        {label}
      </Button>
    </div>
  );
}

interface LastUpdatedTextProps {
  lastUpdated: Date | null;
  prefix?: string;
  className?: string;
}

export function LastUpdatedText({
  lastUpdated,
  prefix = 'Last updated',
  className,
}: LastUpdatedTextProps) {
  if (!lastUpdated) return null;
  
  const level = getStalenessLevel(lastUpdated);
  const colorClass = getStalenessColor(level);
  
  return (
    <span className={cn('text-sm', colorClass, className)}>
      {prefix} {lastUpdated.toLocaleTimeString()}
    </span>
  );
}
