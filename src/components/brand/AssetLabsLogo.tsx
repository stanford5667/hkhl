import { cn } from "@/lib/utils";
import logoIcon from "@/assets/logo-icon-new.png";

interface AssetLabsLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

export function AssetLabsLogo({ 
  size = "md", 
  showText = true,
  className 
}: AssetLabsLogoProps) {
  const iconSizes = {
    sm: "w-7 h-7",
    md: "w-9 h-9",
    lg: "w-12 h-12"
  };

  const textSizes = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg"
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <img 
        src={logoIcon} 
        alt="Asset Labs" 
        className={cn("object-contain", iconSizes[size])}
      />
      {showText && (
        <span className={cn("font-bold text-foreground tracking-tight", textSizes[size])}>
          Asset Labs
        </span>
      )}
    </div>
  );
}
