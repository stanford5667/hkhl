import { cn } from "@/lib/utils";
import { AssetLabsMark } from "./AssetLabsMark";

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
  className,
}: AssetLabsLogoProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
    xl: "w-14 h-14",
  };

  const textSizes = {
    sm: "text-base",
    md: "text-lg",
    lg: "text-xl",
    xl: "text-2xl",
  };

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className={cn(
          "flex items-center justify-center rounded-lg border border-primary/20 text-primary",
          sizeClasses[size]
        )}
      >
        <AssetLabsMark className="h-[72%] w-[72%]" />
      </div>
      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "font-bold leading-none tracking-[-0.02em]",
                textSizes[size]
              )}
            >
              Asset Labs
            </span>
            <span
              className={cn(
                "font-bold leading-none tracking-[-0.02em] text-primary",
                textSizes[size]
              )}
            >
              AI
            </span>
          </div>
          {(showTagline || size === "xl") && (
            <span className="mt-0.5 text-xs text-muted-foreground">
              Intelligent Investing
            </span>
          )}
        </div>
      )}
    </div>
  );
}
