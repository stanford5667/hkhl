import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";
import React from "react";
import { MetricInfoIcon } from "@/components/shared/MetricInfoIcon";

interface StatCardProps {
  label: string;
  value: string | number;
  change?: number;
  icon?: React.ReactNode;
  className?: string;
  variant?: "default" | "positive" | "negative" | "warning";
  /** Key from financialTerms to show educational tooltip */
  termKey?: string;
}

export function StatCard({ 
  label, 
  value, 
  change, 
  icon, 
  className,
  variant = "default",
  termKey
}: StatCardProps) {
  const variantStyles = {
    default: "border-border hover:border-primary/30",
    positive: "border-success/30 accent-bar-positive",
    negative: "border-destructive/30 accent-bar-negative",
    warning: "border-warning/30 accent-bar-warning",
  };

  return (
    <div className={cn(
      "bg-card border rounded-xl p-4 transition-all duration-300 hover:shadow-lg overflow-hidden",
      variantStyles[variant],
      className
    )}>
      <div className="flex flex-col gap-1 sm:gap-2 min-w-0">
        {/* Header with icon */}
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider truncate font-medium">
              {label}
            </span>
            {termKey && <MetricInfoIcon termKey={termKey} iconSize={12} />}
          </div>
          {icon && (
            <span className="text-primary/70 shrink-0">{icon}</span>
          )}
        </div>
        
        {/* Value */}
        <span className="text-lg sm:text-2xl font-bold font-mono text-foreground truncate">
          {value}
        </span>
        
        {/* Change indicator */}
        {change !== undefined && (
          <div className={cn(
            "flex items-center gap-1 text-xs sm:text-sm font-medium",
            change >= 0 ? "text-success" : "text-destructive"
          )}>
            {change >= 0 ? (
              <TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
            ) : (
              <TrendingDown className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
            )}
            <span className="font-mono truncate">
              {change >= 0 ? '+' : ''}{change.toFixed(2)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
