import { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";
import { MetricInfoIcon } from "@/components/shared/MetricInfoIcon";

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  change?: number;
  icon: ReactNode;
  variant?: "default" | "success" | "warning" | "destructive";
  /** Key from financialTerms to show educational tooltip */
  termKey?: string;
}

export function MetricCard({
  title,
  value,
  subtitle,
  change,
  icon,
  variant = "default",
  termKey,
}: MetricCardProps) {
  const variantStyles = {
    default: "border-border/50",
    success: "border-success/30 bg-gradient-to-br from-success/10 to-success/5",
    warning: "border-warning/30 bg-gradient-to-br from-warning/10 to-warning/5",
    destructive: "border-destructive/30 bg-gradient-to-br from-destructive/10 to-destructive/5",
  };

  const iconStyles = {
    default: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    destructive: "bg-destructive/10 text-destructive",
  };

  return (
    <Card className={cn("p-3 sm:p-6", variantStyles[variant])}>
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 sm:space-y-2 min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{title}</p>
            {termKey && <MetricInfoIcon termKey={termKey} iconSize={12} />}
          </div>
          <p className="text-lg sm:text-2xl font-bold text-foreground truncate font-mono">{value}</p>
          {subtitle && (
            <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
              {change !== undefined && (
                <span
                  className={cn(
                    "flex items-center gap-0.5 text-xs sm:text-sm font-medium shrink-0",
                    change >= 0 ? "text-success" : "text-destructive"
                  )}
                >
                  {change >= 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {Math.abs(change)}%
                </span>
              )}
              <p className="text-xs sm:text-sm text-muted-foreground truncate">{subtitle}</p>
            </div>
          )}
        </div>
        <div className={cn("p-2 sm:p-3 rounded-lg shrink-0", iconStyles[variant])}>{icon}</div>
      </div>
    </Card>
  );
}
