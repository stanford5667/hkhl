import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface TradingRangeBarProps {
  open: number;
  high: number;
  low: number;
  current: number;
  previousClose?: number;
  className?: string;
}

export function TradingRangeBar({ 
  open, 
  high, 
  low, 
  current, 
  previousClose,
  className 
}: TradingRangeBarProps) {
  // Calculate current price position within range (0-100%)
  const range = high - low;
  const position = range > 0 ? ((current - low) / range) * 100 : 50;
  const openPosition = range > 0 ? ((open - low) / range) * 100 : 50;
  const prevClosePosition = previousClose && range > 0 
    ? ((previousClose - low) / range) * 100 
    : null;

  const formatPrice = (price: number) => {
    if (price >= 10000) return `$${(price / 1000).toFixed(0)}k`;
    if (price >= 1000) return `$${(price / 1000).toFixed(1)}k`;
    if (price >= 100) return `$${price.toFixed(0)}`;
    return `$${price.toFixed(2)}`;
  };

  const isAboveOpen = current >= open;

  // Clamp position to prevent overflow
  const clampedPosition = Math.max(5, Math.min(95, position));

  return (
    <div className={cn("bg-card border border-border rounded-xl p-3 overflow-hidden", className)}>
      {/* Labels Row */}
      <div className="flex items-center justify-between mb-2 gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">
            Day Range
          </span>
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
            ({((position).toFixed(0))}%)
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-shrink-0">
          <span className="whitespace-nowrap">O: {formatPrice(open)}</span>
          {previousClose && <span className="whitespace-nowrap hidden sm:inline">PC: {formatPrice(previousClose)}</span>}
        </div>
      </div>

      {/* Range Bar */}
      <div className="relative">
        {/* Low/High Labels */}
        <div className="flex justify-between mb-1">
          <span className="text-xs font-semibold text-destructive tabular-nums">
            L: {formatPrice(low)}
          </span>
          <span className="text-xs font-semibold text-success tabular-nums">
            H: {formatPrice(high)}
          </span>
        </div>

        {/* Track */}
        <div className="relative h-3 bg-secondary/50 rounded-full overflow-hidden">
          {/* Gradient Fill from Low to Current */}
          <motion.div
            className={cn(
              "absolute top-0 left-0 h-full rounded-full",
              isAboveOpen 
                ? "bg-gradient-to-r from-muted via-success/40 to-success" 
                : "bg-gradient-to-r from-muted via-destructive/40 to-destructive"
            )}
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(2, clampedPosition)}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />

          {/* Previous Close Marker */}
          {prevClosePosition !== null && (
            <div
              className="absolute top-0 h-full w-0.5 bg-muted-foreground/50"
              style={{ left: `${prevClosePosition}%` }}
            />
          )}

          {/* Open Marker */}
          <div
            className="absolute top-0 h-full w-0.5 bg-foreground/30"
            style={{ left: `${openPosition}%` }}
          />

          {/* Current Price Indicator */}
          <motion.div
            className={cn(
              "absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 shadow-md",
              isAboveOpen 
                ? "bg-success border-success-foreground" 
                : "bg-destructive border-destructive-foreground"
            )}
            style={{ left: `calc(${clampedPosition}% - 8px)` }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
          >
            {/* Pulse effect */}
            <motion.div
              className={cn(
                "absolute inset-0 rounded-full",
                isAboveOpen ? "bg-success" : "bg-destructive"
              )}
              animate={{ 
                scale: [1, 1.5, 1],
                opacity: [0.5, 0, 0.5]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </motion.div>
        </div>

        {/* Current Price Label */}
        <motion.div
          className="flex justify-center mt-1.5"
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <span className={cn(
            "text-sm font-bold tabular-nums px-2 py-0.5 rounded-md",
            isAboveOpen 
              ? "bg-success/15 text-success" 
              : "bg-destructive/15 text-destructive"
          )}>
            {formatPrice(current)}
          </span>
        </motion.div>
      </div>
    </div>
  );
}
