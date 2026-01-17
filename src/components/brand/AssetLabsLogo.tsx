import { cn } from "@/lib/utils";
import { TrendingUp } from "lucide-react";

interface AssetLabsLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  showTagline?: boolean;
  className?: string;
}

export function AssetLabsLogo({ 
  size = "md", 
  showText = true,
  showTagline = false,
  className 
}: AssetLabsLogoProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
    xl: "w-14 h-14"
  };

  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
    xl: "h-7 w-7"
  };

  const textSizes = {
    sm: "text-base",
    md: "text-lg",
    lg: "text-xl",
    xl: "text-2xl"
  };

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className={cn(
        "rounded-xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 flex items-center justify-center shadow-lg shadow-primary/25",
        sizeClasses[size]
      )}>
        <TrendingUp className={cn("text-primary-foreground", iconSizes[size])} />
      </div>
      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className={cn("font-bold tracking-tight leading-none", textSizes[size])}>
              Asset Labs
            </span>
            <span className={cn(
              "font-bold tracking-tight leading-none bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent",
              textSizes[size]
            )}>
              AI
            </span>
          </div>
          {(showTagline || size === "xl") && (
            <span className="text-xs text-muted-foreground mt-0.5">Intelligent Investing</span>
          )}
        </div>
      )}
    </div>
  );
}
