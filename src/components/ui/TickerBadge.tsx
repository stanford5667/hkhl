import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface TickerBadgeProps {
  ticker: string;
  className?: string;
  onClick?: () => void;
  navigateOnClick?: boolean; // defaults to true
}

export function TickerBadge({ 
  ticker, 
  className, 
  onClick, 
  navigateOnClick = true 
}: TickerBadgeProps) {
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (onClick) {
      onClick();
    } else if (navigateOnClick) {
      navigate(`/stock/${ticker}`);
    }
  };

  return (
    <span 
      className={cn(
        "badge-ticker cursor-pointer hover:bg-primary/30 transition-colors",
        className
      )}
      onClick={handleClick}
    >
      ${ticker}
    </span>
  );
}
