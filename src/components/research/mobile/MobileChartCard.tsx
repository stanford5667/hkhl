import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Settings2, Maximize2 } from 'lucide-react';

export type ChartTimeframe = '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | '5Y' | 'ALL';

interface TimeframeOption {
  label: string;
  value: ChartTimeframe;
}

const TIMEFRAMES: TimeframeOption[] = [
  { label: '1D', value: '1D' },
  { label: '1W', value: '1W' },
  { label: '1M', value: '1M' },
  { label: '3M', value: '3M' },
  { label: '1Y', value: '1Y' },
  { label: 'ALL', value: 'ALL' },
];

interface MobileChartCardProps {
  children: React.ReactNode;
  defaultTimeframe?: ChartTimeframe;
  onTimeframeChange?: (timeframe: ChartTimeframe) => void;
  onSettingsClick?: () => void;
  onExpandClick?: () => void;
  showTools?: boolean;
}

export function MobileChartCard({
  children,
  defaultTimeframe = '3M',
  onTimeframeChange,
  onSettingsClick,
  onExpandClick,
  showTools = true,
}: MobileChartCardProps) {
  const [activeTimeframe, setActiveTimeframe] = useState<ChartTimeframe>(defaultTimeframe);
  const [startX, setStartX] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTimeframeChange = (timeframe: ChartTimeframe) => {
    setActiveTimeframe(timeframe);
    onTimeframeChange?.(timeframe);
  };

  // Swipe gesture for timeframe switching
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (startX === null) return;
    
    const endX = e.changedTouches[0].clientX;
    const diff = endX - startX;
    const threshold = 50;

    if (Math.abs(diff) > threshold) {
      const currentIndex = TIMEFRAMES.findIndex(t => t.value === activeTimeframe);
      if (diff > 0 && currentIndex > 0) {
        // Swipe right - go to previous timeframe
        handleTimeframeChange(TIMEFRAMES[currentIndex - 1].value);
      } else if (diff < 0 && currentIndex < TIMEFRAMES.length - 1) {
        // Swipe left - go to next timeframe
        handleTimeframeChange(TIMEFRAMES[currentIndex + 1].value);
      }
    }
    
    setStartX(null);
  }, [startX, activeTimeframe]);

  return (
    <motion.div
      ref={containerRef}
      className="bg-card border border-border rounded-xl overflow-hidden"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Timeframe Pills - Above Chart */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.value}
              onClick={() => handleTimeframeChange(tf.value)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap",
                "touch-manipulation active:scale-95",
                activeTimeframe === tf.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              {tf.label}
            </button>
          ))}
        </div>

        {/* Tools */}
        {showTools && (
          <div className="flex items-center gap-1 shrink-0 ml-2">
            {onSettingsClick && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={onSettingsClick}
              >
                <Settings2 className="h-4 w-4" />
              </Button>
            )}
            {onExpandClick && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={onExpandClick}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Chart Area with Gesture Support */}
      <div
        className="relative touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {children}
        
        {/* Swipe Hint Overlay (shows briefly on first visit) */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 pointer-events-none">
          <motion.div
            initial={{ opacity: 0.8 }}
            animate={{ opacity: 0 }}
            transition={{ delay: 2, duration: 1 }}
            className="text-[10px] text-muted-foreground bg-background/80 px-2 py-1 rounded-full"
          >
            Swipe to change timeframe
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
