import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, TrendingDown, Activity, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface TickerHeatData {
  ticker: string;
  volume_spike: number; // percentage increase
  direction: 'up' | 'down';
  event_count: number;
  last_event?: string;
}

interface HeatmapSidebarProps {
  tickers: TickerHeatData[];
  onTickerClick?: (ticker: string) => void;
  className?: string;
}

export function HeatmapSidebar({ tickers, onTickerClick, className }: HeatmapSidebarProps) {
  const navigate = useNavigate();
  
  // Sort by volume spike (hottest first)
  const sortedTickers = [...tickers].sort((a, b) => b.volume_spike - a.volume_spike);

  const handleTickerClick = (ticker: string) => {
    if (onTickerClick) {
      onTickerClick(ticker);
    } else {
      navigate(`/stock/${ticker}`);
    }
  };

  const getHeatLevel = (spike: number) => {
    if (spike >= 200) return 'extreme';
    if (spike >= 100) return 'high';
    if (spike >= 50) return 'medium';
    return 'low';
  };

  const getHeatColor = (level: string, direction: 'up' | 'down') => {
    if (direction === 'up') {
      switch (level) {
        case 'extreme': return 'bg-emerald-500/30 border-emerald-500/50 text-emerald-400';
        case 'high': return 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400';
        case 'medium': return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400/80';
        default: return 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400/60';
      }
    } else {
      switch (level) {
        case 'extreme': return 'bg-rose-500/30 border-rose-500/50 text-rose-400';
        case 'high': return 'bg-rose-500/20 border-rose-500/40 text-rose-400';
        case 'medium': return 'bg-rose-500/10 border-rose-500/30 text-rose-400/80';
        default: return 'bg-rose-500/5 border-rose-500/20 text-rose-400/60';
      }
    }
  };

  const getPulseAnimation = (level: string) => {
    if (level === 'extreme') return 'animate-pulse';
    return '';
  };

  return (
    <div className={cn(
      "w-20 bg-[#0f0f0f] border-r border-border/30 flex flex-col",
      className
    )}>
      {/* Header */}
      <div className="p-3 border-b border-border/30">
        <div className="flex flex-col items-center gap-1">
          <Activity className="h-4 w-4 text-amber-400" />
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            Heat
          </span>
        </div>
      </div>

      {/* Ticker tape */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1.5">
          <AnimatePresence mode="popLayout">
            {sortedTickers.map((ticker, index) => {
              const heatLevel = getHeatLevel(ticker.volume_spike);
              const heatColor = getHeatColor(heatLevel, ticker.direction);
              const pulseClass = getPulseAnimation(heatLevel);

              return (
                <motion.button
                  key={ticker.ticker}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.05, duration: 0.2 }}
                  onClick={() => handleTickerClick(ticker.ticker)}
                  className={cn(
                    "w-full p-2 rounded-lg border transition-all duration-200",
                    "hover:scale-105 active:scale-95",
                    heatColor,
                    pulseClass
                  )}
                >
                  {/* Ticker symbol */}
                  <div className="font-mono font-bold text-xs mb-1 hover:text-primary transition-colors">
                    ${ticker.ticker}
                  </div>
                  
                  {/* Volume spike indicator */}
                  <div className="flex items-center justify-center gap-0.5">
                    {ticker.direction === 'up' ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    <span className="text-[10px] font-bold tabular-nums">
                      {ticker.volume_spike > 999 ? '999+' : ticker.volume_spike}%
                    </span>
                  </div>

                  {/* Event count */}
                  <div className="mt-1 flex items-center justify-center gap-0.5 text-[9px] text-current opacity-70">
                    {heatLevel === 'extreme' && <Flame className="h-2.5 w-2.5" />}
                    {ticker.event_count} evt
                  </div>
                </motion.button>
              );
            })}
          </AnimatePresence>

          {sortedTickers.length === 0 && (
            <div className="text-center py-4">
              <Activity className="h-5 w-5 mx-auto mb-1 text-muted-foreground/50" />
              <p className="text-[10px] text-muted-foreground">No activity</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
