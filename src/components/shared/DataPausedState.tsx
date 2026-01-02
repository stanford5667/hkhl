import React from 'react';
import { Pause, Play, RefreshCw, Database, LineChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDevMode } from '@/contexts/DevModeContext';
import { cn } from '@/lib/utils';

interface DataPausedStateProps {
  type: 'search' | 'chart' | 'data' | 'empty';
  title?: string;
  description?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  showEnableButton?: boolean;
  className?: string;
}

export function DataPausedState({
  type,
  title,
  description,
  onRefresh,
  isRefreshing,
  showEnableButton = true,
  className,
}: DataPausedStateProps) {
  const { setMarketDataEnabled, marketDataEnabled } = useDevMode();

  const getContent = () => {
    switch (type) {
      case 'search':
        return {
          icon: Database,
          defaultTitle: 'Live search disabled',
          defaultDescription: 'Showing cached results. Enable live data for real-time search.',
        };
      case 'chart':
        return {
          icon: LineChart,
          defaultTitle: 'Chart unavailable',
          defaultDescription: 'Enable live data to view historical charts.',
        };
      case 'data':
        return {
          icon: Pause,
          defaultTitle: 'Data paused',
          defaultDescription: 'Live market data is paused. Showing cached or sample data.',
        };
      case 'empty':
      default:
        return {
          icon: Database,
          defaultTitle: 'No data available',
          defaultDescription: 'Enable live data and refresh to load content.',
        };
    }
  };

  const content = getContent();
  const Icon = content.icon;

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-6 text-center rounded-lg border border-dashed border-muted-foreground/25 bg-muted/20',
        className
      )}
    >
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      
      <h4 className="font-medium text-foreground mb-1">
        {title || content.defaultTitle}
      </h4>
      
      <p className="text-sm text-muted-foreground max-w-sm mb-4">
        {description || content.defaultDescription}
      </p>

      <div className="flex items-center gap-2">
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn('h-4 w-4 mr-1.5', isRefreshing && 'animate-spin')} />
            Refresh
          </Button>
        )}
        
        {showEnableButton && !marketDataEnabled && (
          <Button
            variant="default"
            size="sm"
            onClick={() => setMarketDataEnabled(true)}
          >
            <Play className="h-4 w-4 mr-1.5" />
            Enable Live Data
          </Button>
        )}
      </div>
    </div>
  );
}

// Inline version for smaller spaces
interface InlinePausedIndicatorProps {
  message?: string;
  onEnable?: () => void;
  className?: string;
}

export function InlinePausedIndicator({
  message = 'Live data paused',
  onEnable,
  className,
}: InlinePausedIndicatorProps) {
  const { setMarketDataEnabled } = useDevMode();

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400',
        className
      )}
    >
      <Pause className="h-3 w-3" />
      <span>{message}</span>
      <button
        onClick={() => {
          onEnable?.();
          setMarketDataEnabled(true);
        }}
        className="underline hover:no-underline"
      >
        Enable
      </button>
    </div>
  );
}

// Empty state for when there's no data at all
interface NoDataPlaceholderProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function NoDataPlaceholder({
  title = 'No data available',
  description = 'Data will appear here once loaded.',
  icon,
  action,
  className,
}: NoDataPlaceholderProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center',
        className
      )}
    >
      {icon || (
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
          <Database className="h-5 w-5 text-muted-foreground" />
        </div>
      )}
      
      <h4 className="font-medium text-foreground mb-1">{title}</h4>
      <p className="text-sm text-muted-foreground max-w-xs">{description}</p>
      
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
