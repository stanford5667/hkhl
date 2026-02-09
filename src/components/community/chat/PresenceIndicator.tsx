import { UserPresenceStatus } from '@/types/community';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface PresenceIndicatorProps {
  status: UserPresenceStatus;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  className?: string;
}

const statusColors: Record<UserPresenceStatus, string> = {
  online: 'bg-green-500',
  idle: 'bg-amber-500',
  offline: 'bg-muted-foreground/50',
};

const statusLabels: Record<UserPresenceStatus, string> = {
  online: 'Online',
  idle: 'Idle',
  offline: 'Offline',
};

const sizeClasses = {
  sm: 'h-2 w-2',
  md: 'h-2.5 w-2.5',
  lg: 'h-3 w-3',
};

export function PresenceIndicator({
  status,
  size = 'sm',
  showTooltip = true,
  className,
}: PresenceIndicatorProps) {
  const indicator = (
    <span
      className={cn(
        'rounded-full ring-2 ring-background',
        statusColors[status],
        sizeClasses[size],
        className
      )}
    />
  );

  if (!showTooltip) return indicator;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {indicator}
      </TooltipTrigger>
      <TooltipContent side="right" className="text-xs">
        {statusLabels[status]}
      </TooltipContent>
    </Tooltip>
  );
}
