import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickStatsTileProps {
  label: string;
  value: string;
  subValue?: string;
  change?: number;
  alert?: boolean;
  onClick?: () => void;
}

export function QuickStatsTile({ label, value, subValue, change, alert, onClick }: QuickStatsTileProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "bg-surface-2 rounded-lg p-4 text-left hover:bg-surface-3 transition-colors group relative",
        alert && "ring-1 ring-destructive/50"
      )}
    >
      {alert && (
        <AlertTriangle className="absolute top-2 right-2 h-3 w-3 text-destructive" />
      )}
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-xl font-semibold text-foreground tabular-nums">{value}</p>
      {subValue && (
        <p className="text-xs text-muted-foreground mt-1">{subValue}</p>
      )}
      {change !== undefined && (
        <div className={cn(
          "flex items-center gap-1 text-xs font-medium mt-1",
          change >= 0 ? "text-success" : "text-destructive"
        )}>
          {change >= 0 ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingDown className="h-3 w-3" />
          )}
          {Math.abs(change)}%
        </div>
      )}
    </button>
  );
}