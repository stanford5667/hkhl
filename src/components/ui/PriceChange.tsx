import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface PriceChangeProps {
  value: number;
  format?: "percent" | "currency" | "number";
  showIcon?: boolean;
  size?: "sm" | "default" | "lg";
  className?: string;
}

export function PriceChange({ 
  value, 
  format = "percent",
  showIcon = true,
  size = "default",
  className 
}: PriceChangeProps) {
  const formatValue = () => {
    const absValue = Math.abs(value);
    switch (format) {
      case "percent":
        return `${value >= 0 ? '+' : '-'}${absValue.toFixed(2)}%`;
      case "currency":
        return `${value >= 0 ? '+' : '-'}$${absValue.toLocaleString()}`;
      case "number":
        return `${value >= 0 ? '+' : ''}${value.toFixed(2)}`;
      default:
        return value.toString();
    }
  };

  const getColor = () => {
    if (value > 0) return "text-emerald-400";
    if (value < 0) return "text-rose-400";
    return "text-muted-foreground";
  };

  const Icon = value > 0 ? TrendingUp : value < 0 ? TrendingDown : Minus;

  const sizeStyles = {
    sm: { text: "text-xs", icon: "h-3 w-3" },
    default: { text: "text-sm", icon: "h-3.5 w-3.5" },
    lg: { text: "text-base", icon: "h-4 w-4" },
  };

  return (
    <div className={cn(
      "flex items-center gap-1 font-mono font-medium",
      getColor(),
      sizeStyles[size].text,
      className
    )}>
      {showIcon && <Icon className={sizeStyles[size].icon} />}
      <span>{formatValue()}</span>
    </div>
  );
}
