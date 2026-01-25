import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Activity, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface ChartPoint {
  date: string;
  value: number;
}

const TIMEFRAMES = ['1W', '1M', '3M', 'YTD'] as const;
type Timeframe = typeof TIMEFRAMES[number];

export function AggregatedPerformanceChart() {
  const [timeframe, setTimeframe] = useState<Timeframe>('1M');
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [performance, setPerformance] = useState<{ value: number; change: number }>({ value: 0, change: 0 });

  useEffect(() => {
    const fetchAggregatedPerformance = async () => {
      setIsLoading(true);
      try {
        // Calculate date range
        const endDate = new Date();
        const startDate = new Date();
        switch (timeframe) {
          case '1W': startDate.setDate(endDate.getDate() - 7); break;
          case '1M': startDate.setMonth(endDate.getMonth() - 1); break;
          case '3M': startDate.setMonth(endDate.getMonth() - 3); break;
          case 'YTD': startDate.setMonth(0); startDate.setDate(1); break;
        }

        // Fetch SPY as market proxy for aggregated performance
        const { data } = await supabase
          .from('market_daily_bars')
          .select('bar_date, close')
          .eq('ticker', 'SPY')
          .gte('bar_date', startDate.toISOString().split('T')[0])
          .lte('bar_date', endDate.toISOString().split('T')[0])
          .order('bar_date', { ascending: true });

        if (data && data.length > 1) {
          const normalized = data.map(d => ({
            date: d.bar_date,
            value: ((d.close / data[0].close) - 1) * 100,
          }));
          setChartData(normalized);
          
          const first = data[0].close;
          const last = data[data.length - 1].close;
          setPerformance({
            value: last,
            change: ((last - first) / first) * 100,
          });
        }
      } catch (error) {
        console.error('Error fetching aggregated performance:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAggregatedPerformance();
  }, [timeframe]);

  // Calculate SVG path
  const pathData = useMemo(() => {
    if (chartData.length < 2) return '';
    
    const width = 240;
    const height = 60;
    const padding = 4;
    
    const minVal = Math.min(...chartData.map(d => d.value));
    const maxVal = Math.max(...chartData.map(d => d.value));
    const range = maxVal - minVal || 1;

    const points = chartData.map((d, i) => {
      const x = padding + (i / (chartData.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((d.value - minVal) / range) * (height - 2 * padding);
      return `${x},${y}`;
    });

    return `M ${points.join(' L ')}`;
  }, [chartData]);

  const isPositive = performance.change >= 0;

  if (isLoading) {
    return (
      <div className="bg-card/60 backdrop-blur-sm rounded-xl border border-border/40 p-4">
        <Skeleton className="h-4 w-32 mb-3" />
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="bg-card/60 backdrop-blur-sm rounded-xl border border-border/40 p-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <span className="text-[11px] font-medium text-foreground">Market Performance</span>
        </div>
        <div className="flex items-center gap-1">
          {TIMEFRAMES.map(tf => (
            <Button
              key={tf}
              variant={timeframe === tf ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTimeframe(tf)}
              className={cn(
                "h-5 px-1.5 text-[9px]",
                timeframe === tf ? "bg-primary/20 text-primary" : "text-muted-foreground"
              )}
            >
              {tf}
            </Button>
          ))}
        </div>
      </div>

      {/* Performance Summary */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          {isPositive ? (
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-500" />
          )}
          <span className={cn(
            "text-lg font-bold font-mono",
            isPositive ? "text-emerald-500" : "text-red-500"
          )}>
            {isPositive ? '+' : ''}{performance.change.toFixed(2)}%
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground">
          S&P 500 ({timeframe})
        </span>
      </div>

      {/* Chart */}
      <div className="relative h-16">
        <svg viewBox="0 0 240 60" className="w-full h-full" preserveAspectRatio="none">
          {/* Gradient fill */}
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={isPositive ? '#10b981' : '#ef4444'} stopOpacity="0.3" />
              <stop offset="100%" stopColor={isPositive ? '#10b981' : '#ef4444'} stopOpacity="0" />
            </linearGradient>
          </defs>
          
          {/* Fill area */}
          {pathData && (
            <path
              d={`${pathData} L 236,60 L 4,60 Z`}
              fill="url(#chartGradient)"
            />
          )}
          
          {/* Line */}
          <motion.path
            d={pathData}
            fill="none"
            stroke={isPositive ? '#10b981' : '#ef4444'}
            strokeWidth="2"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
          
          {/* Zero line */}
          <line
            x1="4"
            y1="30"
            x2="236"
            y2="30"
            stroke="currentColor"
            strokeWidth="0.5"
            strokeDasharray="4 2"
            className="text-muted-foreground/30"
          />
        </svg>
      </div>

      {/* Date labels */}
      <div className="flex justify-between mt-1">
        <span className="text-[9px] text-muted-foreground">
          {chartData[0]?.date ?? ''}
        </span>
        <span className="text-[9px] text-muted-foreground">
          {chartData[chartData.length - 1]?.date ?? ''}
        </span>
      </div>
    </div>
  );
}
