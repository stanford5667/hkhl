import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface HoverActionOverlayProps {
  symbol: string;
  className?: string;
}

export function HoverActionOverlay({ symbol, className }: HoverActionOverlayProps) {
  const navigate = useNavigate();

  return (
    <div className={cn(
      "absolute inset-0 z-10 flex items-center justify-center gap-2 px-2",
      "bg-background/70 backdrop-blur-md rounded-[inherit]",
      "opacity-0 group-hover:opacity-100 transition-opacity duration-200",
      "pointer-events-none group-hover:pointer-events-auto",
      className
    )}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          navigate(`/stock/${symbol}`);
        }}
        className="inline-flex items-center gap-1.5 font-mono font-semibold text-[11px] sm:text-xs px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-muted/80 text-foreground border border-border/50 hover:bg-muted transition-colors whitespace-nowrap"
      >
        📊 Research
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          navigate(`/stock/${symbol}`, { state: { tab: 'backtest' } });
        }}
        className="inline-flex items-center gap-1.5 font-mono font-semibold text-[11px] sm:text-xs px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-[hsl(175_80%_45%)] text-background hover:bg-[hsl(175_80%_50%)] shadow-[0_0_14px_hsl(175_80%_45%/0.4)] hover:shadow-[0_0_20px_hsl(175_80%_45%/0.6)] transition-all whitespace-nowrap"
      >
        ⚡ Quick Test
      </button>
    </div>
  );
}
