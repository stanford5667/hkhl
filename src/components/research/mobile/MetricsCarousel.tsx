import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Activity, BarChart3, Users, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRef, useState } from 'react';

export interface MetricData {
  id: string;
  title: string;
  value: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  comparison?: string;
  icon?: 'performance' | 'volatility' | 'sentiment' | 'fundamentals' | 'volume' | 'price';
}

interface MetricsCarouselProps {
  metrics: MetricData[];
  onMetricTap?: (metric: MetricData) => void;
}

const iconMap = {
  performance: TrendingUp,
  volatility: Activity,
  sentiment: Users,
  fundamentals: BarChart3,
  volume: BarChart3,
  price: DollarSign,
};

export function MetricsCarousel({ metrics, onMetricTap }: MetricsCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const scrollLeft = scrollRef.current.scrollLeft;
    const cardWidth = 160 + 12; // card width + gap
    const newIndex = Math.round(scrollLeft / cardWidth);
    setActiveIndex(Math.min(newIndex, metrics.length - 1));
  };

  return (
    <div className="space-y-3">
      {/* Scrollable Cards */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory px-4 pb-2 -mx-4"
        style={{ scrollPaddingLeft: '1rem' }}
      >
        {metrics.map((metric, index) => {
          const Icon = iconMap[metric.icon || 'performance'];
          const isActive = index === activeIndex;
          
          return (
            <motion.button
              key={metric.id}
              onClick={() => onMetricTap?.(metric)}
              className={cn(
                "flex-shrink-0 w-40 snap-start rounded-xl p-4 text-left transition-all",
                "bg-card border border-border hover:border-primary/30",
                "active:scale-[0.98] touch-manipulation",
                isActive && "ring-1 ring-primary/50"
              )}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              {/* Icon & Title */}
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <Icon className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide truncate">
                  {metric.title}
                </span>
              </div>

              {/* Value */}
              <p className="text-xl font-bold tabular-nums text-foreground mb-1">
                {metric.value}
              </p>

              {/* Trend */}
              {metric.trend && metric.trendValue && (
                <div className="flex items-center gap-1">
                  {metric.trend === 'up' ? (
                    <TrendingUp className="h-3 w-3 text-success" />
                  ) : metric.trend === 'down' ? (
                    <TrendingDown className="h-3 w-3 text-destructive" />
                  ) : null}
                  <span className={cn(
                    "text-xs font-medium tabular-nums",
                    metric.trend === 'up' && "text-success",
                    metric.trend === 'down' && "text-destructive",
                    metric.trend === 'neutral' && "text-muted-foreground"
                  )}>
                    {metric.trendValue}
                  </span>
                </div>
              )}

              {/* Comparison */}
              {metric.comparison && (
                <p className="text-[10px] text-muted-foreground mt-1 truncate">
                  {metric.comparison}
                </p>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Dot Indicators */}
      <div className="flex justify-center gap-1.5">
        {metrics.map((_, index) => (
          <div
            key={index}
            className={cn(
              "h-1.5 rounded-full transition-all",
              index === activeIndex ? "w-4 bg-primary" : "w-1.5 bg-muted/50"
            )}
          />
        ))}
      </div>
    </div>
  );
}
