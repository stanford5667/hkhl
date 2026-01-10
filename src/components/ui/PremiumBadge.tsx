import { Crown, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface PremiumBadgeProps {
  className?: string;
  variant?: 'badge' | 'inline' | 'overlay';
  onUpgrade?: () => void;
}

export function PremiumBadge({ className, variant = 'badge', onUpgrade }: PremiumBadgeProps) {
  if (variant === 'overlay') {
    return (
      <div className={cn(
        "absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-10 rounded-lg",
        className
      )}>
        <div className="flex items-center gap-2 text-primary">
          <Crown className="h-5 w-5" />
          <span className="font-semibold">Premium Data</span>
        </div>
        <p className="text-sm text-muted-foreground text-center max-w-[200px]">
          Upgrade to access real-time market data
        </p>
        {onUpgrade && (
          <Button size="sm" onClick={onUpgrade} className="gap-2">
            <Crown className="h-4 w-4" />
            Upgrade Now
          </Button>
        )}
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn(
            "inline-flex items-center gap-1 text-xs text-amber-500 cursor-help",
            className
          )}>
            <Lock className="h-3 w-3" />
            Premium
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>Upgrade to access this data</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Badge 
      variant="outline" 
      className={cn(
        "bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30 text-amber-500 gap-1",
        className
      )}
    >
      <Crown className="h-3 w-3" />
      Premium
    </Badge>
  );
}

interface PremiumDataPlaceholderProps {
  label?: string;
  onUpgrade?: () => void;
  className?: string;
}

export function PremiumDataPlaceholder({ 
  label = "Premium Data", 
  onUpgrade,
  className 
}: PremiumDataPlaceholderProps) {
  return (
    <div className={cn(
      "flex items-center gap-2 text-muted-foreground",
      className
    )}>
      <span className="text-sm blur-sm select-none">$XX.XX</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <button 
            onClick={onUpgrade}
            className="inline-flex items-center gap-1 text-xs text-amber-500 hover:text-amber-400 transition-colors"
          >
            <Lock className="h-3 w-3" />
            <span>Upgrade</span>
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Upgrade to view {label}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
