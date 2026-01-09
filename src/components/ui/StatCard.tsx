import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";
import React from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  change?: number;
  icon?: React.ReactNode;
  className?: string;
  variant?: "default" | "positive" | "negative" | "warning";
}

export function StatCard({ 
  label, 
  value, 
  change, 
  icon, 
  className,
  variant = "default"
}: StatCardProps) {
  const variantStyles = {
    default: "border-border/50",
    positive: "border-emerald-500/30 accent-bar-positive",
    negative: "border-rose-500/30 accent-bar-negative",
    warning: "border-amber-500/30 accent-bar-warning",
  };

  return (
    <div className={cn(
      "stat-card overflow-hidden",
      variantStyles[variant],
      className
    )}>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">{label}</span>
          {icon && <span className="text-muted-foreground">{icon}</span>}
        </div>
        
        <span className="metric-medium text-foreground">{value}</span>
        
        {change !== undefined && (
          <div className={cn(
            "flex items-center gap-1 text-sm font-medium",
            change >= 0 ? "text-emerald-400" : "text-rose-400"
          )}>
            {change >= 0 ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" />
            )}
            <span className="font-mono">{change >= 0 ? '+' : ''}{change.toFixed(2)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}
