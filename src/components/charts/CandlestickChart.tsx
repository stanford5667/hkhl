/**
 * Candlestick Chart Component
 * Uses lightweight-charts (TradingView's library)
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { getCandlesForRange, TIME_RANGES, type TimeRange, type CandleData } from '@/services/candleService';

interface CandlestickChartProps {
  symbol: string;
  height?: number;
  className?: string;
  showVolume?: boolean;
  showRangeSelector?: boolean;
  defaultRange?: TimeRange;
  onPriceChange?: (price: number, change: number, changePercent: number) => void;
}

export function CandlestickChart({
  symbol,
  height = 400,
  className,
  showVolume = true,
  showRangeSelector = true,
  defaultRange = '3M',
  onPriceChange,
}: CandlestickChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const candleSeriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRange, setSelectedRange] = useState<TimeRange>(defaultRange);
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Load chart library dynamically
  const initChart = useCallback(async () => {
    if (!chartContainerRef.current) return;

    // Dynamically import lightweight-charts
    const { createChart, ColorType, CrosshairMode } = await import('lightweight-charts');

    // Clean up existing chart
    if (chartRef.current) {
      chartRef.current.remove();
    }

    const container = chartContainerRef.current;
    const chartHeight = showVolume ? height : height;
    
    // Create chart with dark theme
    const chart = createChart(container, {
      width: container.clientWidth,
      height: chartHeight,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#9ca3af',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: 'rgba(255, 255, 255, 0.2)',
          width: 1,
          style: 2,
        },
        horzLine: {
          color: 'rgba(255, 255, 255, 0.2)',
          width: 1,
          style: 2,
        },
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        scaleMargins: {
          top: 0.1,
          bottom: showVolume ? 0.25 : 0.1,
        },
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
      handleScale: {
        mouseWheel: true,
        pinch: true,
        axisPressedMouseMove: true,
      },
    });

    // Add candlestick series
    const candleSeries = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    // Add volume series if enabled
    let volumeSeries = null;
    if (showVolume) {
      volumeSeries = chart.addHistogramSeries({
        color: '#6366f1',
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: '',
      });
      
      volumeSeries.priceScale().applyOptions({
        scaleMargins: {
          top: 0.8,
          bottom: 0,
        },
      });
    }

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    // Crosshair move handler for price display
    chart.subscribeCrosshairMove((param: any) => {
      if (param.time && onPriceChange) {
        const data = param.seriesData.get(candleSeries);
        if (data) {
          const firstCandle = candles[0];
          if (firstCandle) {
            const change = data.close - firstCandle.open;
            const changePercent = (change / firstCandle.open) * 100;
            onPriceChange(data.close, change, changePercent);
          }
        }
      }
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [height, showVolume, onPriceChange, candles]);

  // Fetch candle data
  const fetchCandles = useCallback(async (range: TimeRange) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await getCandlesForRange(symbol, range);
      setCandles(data);
      
      // Update chart with new data
      if (candleSeriesRef.current && data.length > 0) {
        const chartData = data.map(c => ({
          time: c.time as any, // lightweight-charts expects UTCTimestamp
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }));
        candleSeriesRef.current.setData(chartData);
        
        if (volumeSeriesRef.current && showVolume) {
          const volumeData = data.map(c => ({
            time: c.time as any,
            value: c.volume || 0,
            color: c.close >= c.open ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)',
          }));
          volumeSeriesRef.current.setData(volumeData);
        }
        
        // Fit content
        chartRef.current?.timeScale().fitContent();
      }
    } catch (err) {
      console.error('[CandlestickChart] Error:', err);
      setError('Failed to load chart data');
    } finally {
      setIsLoading(false);
    }
  }, [symbol, showVolume]);

  // Initialize chart on mount
  useEffect(() => {
    initChart();
  }, [initChart]);

  // Fetch data when range changes
  useEffect(() => {
    if (chartRef.current) {
      fetchCandles(selectedRange);
    }
  }, [selectedRange, fetchCandles, symbol]);

  // Handle range change
  const handleRangeChange = (range: TimeRange) => {
    setSelectedRange(range);
  };

  if (error) {
    return (
      <Card className={cn("p-4", className)}>
        <div className="flex items-center justify-center h-[200px] text-muted-foreground">
          {error}
        </div>
      </Card>
    );
  }

  return (
    <div className={cn("relative", className)}>
      {/* Range Selector */}
      {showRangeSelector && (
        <div className="flex items-center gap-1 mb-2">
          {(Object.keys(TIME_RANGES) as TimeRange[]).map((range) => (
            <Button
              key={range}
              variant={selectedRange === range ? "secondary" : "ghost"}
              size="sm"
              className={cn(
                "h-7 px-2 text-xs",
                selectedRange === range && "bg-primary/10 text-primary"
              )}
              onClick={() => handleRangeChange(range)}
            >
              {range}
            </Button>
          ))}
        </div>
      )}

      {/* Chart Container */}
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-muted-foreground">Loading chart...</span>
            </div>
          </div>
        )}
        <div 
          ref={chartContainerRef} 
          className="w-full rounded-lg overflow-hidden"
          style={{ height }}
        />
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-500 rounded-sm" />
          <span>Up</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-500 rounded-sm" />
          <span>Down</span>
        </div>
        {showVolume && (
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-indigo-500/50 rounded-sm" />
            <span>Volume</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Mini candlestick chart for cards/previews
 */
export function MiniCandlestickChart({
  symbol,
  height = 80,
  className,
}: {
  symbol: string;
  height?: number;
  className?: string;
}) {
  return (
    <CandlestickChart
      symbol={symbol}
      height={height}
      className={className}
      showVolume={false}
      showRangeSelector={false}
      defaultRange="1M"
    />
  );
}
