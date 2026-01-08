import { cn } from "@/lib/utils";

interface HealthScoreProps {
  score: number;
  size?: "sm" | "default" | "lg";
  showLabel?: boolean;
  className?: string;
}

export function HealthScore({ 
  score, 
  size = "default",
  showLabel = false,
  className 
}: HealthScoreProps) {
  const getColor = () => {
    if (score >= 70) return "text-emerald-400";
    if (score >= 50) return "text-amber-400";
    return "text-rose-400";
  };

  const getLabel = () => {
    if (score >= 70) return "Healthy";
    if (score >= 50) return "Fair";
    return "At Risk";
  };

  const sizeStyles = {
    sm: "text-sm",
    default: "text-lg",
    lg: "text-2xl",
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className={cn(
        "font-mono font-semibold",
        getColor(),
        sizeStyles[size]
      )}>
        {score}
      </span>
      {showLabel && (
        <span className={cn(
          "text-xs text-muted-foreground",
          size === "lg" && "text-sm"
        )}>
          {getLabel()}
        </span>
      )}
    </div>
  );
}
