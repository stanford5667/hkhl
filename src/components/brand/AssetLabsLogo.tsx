import { cn } from "@/lib/utils";
import { LogoMark } from "@/components/brand/LogoMark";

interface AssetLabsLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

export function AssetLabsLogo({
  size = "md",
  showText = true,
  className,
}: AssetLabsLogoProps) {
  const iconSizes = {
    sm: "w-10 h-10",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  };

  const textSizes = {
    sm: "text-base",
    md: "text-lg",
    lg: "text-xl",
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className={cn("text-foreground", iconSizes[size])} aria-label="Asset Labs">
        <LogoMark className="w-full h-full" />
      </span>
      {showText && (
        <span className={cn("font-bold text-foreground tracking-tight", textSizes[size])}>
          Asset Labs
        </span>
      )}
    </div>
  );
}

