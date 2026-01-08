import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Badge } from "./badge";

interface DirectionBadgeProps {
  direction: "bullish" | "bearish" | "neutral";
  showIcon?: boolean;
  className?: string;
  size?: "sm" | "default";
}

export function DirectionBadge({ 
  direction, 
  showIcon = true, 
  className,
  size = "default"
}: DirectionBadgeProps) {
  const config = {
    bullish: {
      icon: TrendingUp,
      label: "Bullish",
      className: "badge-bullish",
    },
    bearish: {
      icon: TrendingDown,
      label: "Bearish",
      className: "badge-bearish",
    },
    neutral: {
      icon: Minus,
      label: "Neutral",
      className: "badge-neutral",
    },
  };

  const { icon: Icon, label, className: badgeClassName } = config[direction];

  return (
    <Badge 
      variant="outline" 
      className={cn(
        badgeClassName,
        size === "sm" && "text-[10px] px-1.5 py-0",
        className
      )}
    >
      {showIcon && <Icon className={cn("mr-1", size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3")} />}
      {label}
    </Badge>
  );
}
