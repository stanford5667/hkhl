import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface HoverActionOverlayProps {
  symbol: string;
  className?: string;
}

export function HoverActionOverlay({ symbol, className }: HoverActionOverlayProps) {
  const navigate = useNavigate();

  return (
    <div
      className={cn(
        "absolute inset-0 z-20 flex items-center justify-center gap-2.5 px-3",
        "bg-black/60 backdrop-blur-sm rounded-[inherit]",
        "opacity-0 group-hover:opacity-100 transition-all duration-250",
        "pointer-events-none group-hover:pointer-events-auto",
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          navigate(`/stock/${symbol}`);
        }}
        className="inline-flex items-center gap-1.5 font-mono font-semibold text-[11px] sm:text-xs px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/10 text-white border border-white/20 hover:bg-white/20 hover:border-white/30 transition-all whitespace-nowrap backdrop-blur-sm"
      >
        📊 Research
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          navigate(`/stock/${symbol}`, { state: { tab: 'backtest' } });
        }}
        className="inline-flex items-center gap-1.5 font-mono font-semibold text-[11px] sm:text-xs px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-[hsl(175_80%_45%)] text-background hover:bg-[hsl(175_80%_50%)] shadow-[0_0_16px_hsl(175_80%_45%/0.5)] hover:shadow-[0_0_24px_hsl(175_80%_45%/0.7)] transition-all whitespace-nowrap"
      >
        ⚡ Quick Test
      </button>
    </div>
  );
}
