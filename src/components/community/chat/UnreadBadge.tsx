import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface UnreadBadgeProps {
  count: number;
  className?: string;
}

export function UnreadBadge({ count, className }: UnreadBadgeProps) {
  if (count === 0) return null;

  const displayCount = count > 99 ? '99+' : count.toString();

  return (
    <Badge
      variant="destructive"
      className={cn(
        "h-5 min-w-[20px] px-1.5 text-[10px] font-bold",
        "flex items-center justify-center",
        className
      )}
    >
      {displayCount}
    </Badge>
  );
}
