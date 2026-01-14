import { cn } from "@/lib/utils";
import logoWithText from "@/assets/logo-with-text.png";
import logoIcon from "@/assets/logo-icon.png";

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
    sm: "h-8",
    md: "h-10",
    lg: "h-14"
  };

  const logoWithTextSizes = {
    sm: "h-8",
    md: "h-10",
    lg: "h-14"
  };

  if (showText) {
    return (
      <div className={cn("flex items-center", className)}>
        <img 
          src={logoWithText} 
          alt="Asset Labs" 
          className={cn("object-contain", logoWithTextSizes[size])}
        />
      </div>
    );
  }

  return (
    <div className={cn("flex items-center", className)}>
      <img 
        src={logoIcon} 
        alt="Asset Labs" 
        className={cn("object-contain", iconSizes[size])}
      />
    </div>
  );
}
