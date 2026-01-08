import { cn } from "@/lib/utils";
import { Button } from "./button";
import { RefreshCw, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  lastFetched?: Date;
  onRefresh?: () => void;
  isLoading?: boolean;
  className?: string;
  actions?: React.ReactNode;
}

export function SectionHeader({ 
  title, 
  subtitle, 
  icon,
  lastFetched, 
  onRefresh,
  isLoading,
  className,
  actions 
}: SectionHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      <div className="flex items-center gap-3">
        {icon}
        <div className="flex flex-col">
          <h2 className="text-xl font-semibold text-foreground">{title}</h2>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {lastFetched && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {formatDistanceToNow(lastFetched, { addSuffix: true })}
          </span>
        )}
        {onRefresh && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRefresh}
            disabled={isLoading}
            className="gap-1.5"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
            Refresh
          </Button>
        )}
        {actions}
      </div>
    </div>
  );
}
