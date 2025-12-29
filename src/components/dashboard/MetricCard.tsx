import { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  change?: number;
  icon: ReactNode;
  variant?: "default" | "success" | "warning" | "destructive";
}

export function MetricCard({
  title,
  value,
  subtitle,
  change,
  icon,
  variant = "default",
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
    <Card className={cn("p-6", variantStyles[variant])}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="metric-medium text-foreground">{value}</p>
          {subtitle && (
            <div className="flex items-center gap-2">
              {change !== undefined && (
                <span
                  className={cn(
                    "flex items-center gap-1 text-sm font-medium",
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
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            </div>
          )}
        </div>
        <div className={cn("p-3 rounded-lg", iconStyles[variant])}>{icon}</div>
      </div>
    </Card>
  );
}
