import { cn } from "@/lib/utils";

interface TickerBadgeProps {
  ticker: string;
  className?: string;
  onClick?: () => void;
}

export function TickerBadge({ ticker, className, onClick }: TickerBadgeProps) {
  return (
    <span 
      className={cn(
        "badge-ticker cursor-default",
        onClick && "cursor-pointer hover:bg-primary/30 transition-colors",
        className
      )}
      onClick={onClick}
    >
      ${ticker}
    </span>
  );
}
