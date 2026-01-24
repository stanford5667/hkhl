/**
 * Candlestick Chart Component
 * Uses lightweight-charts (TradingView's library)
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getCandlesForRange, TIME_RANGES, type TimeRange, type CandleData } from '@/services/candleService';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

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
  const isInitializedRef = useRef(false);
  
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRange, setSelectedRange] = useState<TimeRange>(defaultRange);
  const [error, setError] = useState<string | null>(null);
  const [chartReady, setChartReady] = useState(false);

  // Initialize chart once on mount
  useEffect(() => {
    if (!chartContainerRef.current || isInitializedRef.current) return;

    let chart: any = null;
    let resizeHandler: (() => void) | null = null;

    const initChart = async () => {
      if (!chartContainerRef.current) return;

      // Dynamically import lightweight-charts
      const { createChart, ColorType, CrosshairMode } = await import('lightweight-charts');

      const container = chartContainerRef.current;
      
      // Create chart with dark theme
      chart = createChart(container, {
        width: container.clientWidth,
        height: height,
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
          rightOffset: 0,
          fixRightEdge: true,
          // Prevent “extra” whitespace on resize/fit operations
          lockVisibleTimeRangeOnResize: true,
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
      resizeHandler = () => {
        if (chartContainerRef.current && chart) {
          chart.applyOptions({ width: chartContainerRef.current.clientWidth });
        }
      };
      window.addEventListener('resize', resizeHandler);

      chartRef.current = chart;
      candleSeriesRef.current = candleSeries;
      volumeSeriesRef.current = volumeSeries;
      isInitializedRef.current = true;
      setChartReady(true);
    };

    initChart();

    return () => {
      if (resizeHandler) {
        window.removeEventListener('resize', resizeHandler);
      }
      if (chart) {
        chart.remove();
      }
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
      isInitializedRef.current = false;
      setChartReady(false);
    };
  }, [height, showVolume]);

  // Fetch and update data when chart is ready or range/symbol changes
  useEffect(() => {
    if (!chartReady || !candleSeriesRef.current) return;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const data = await getCandlesForRange(symbol, selectedRange);
        
        if (candleSeriesRef.current && data.length > 0) {
          const chartData = data.map(c => ({
            time: c.time as any,
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

          // Snap view to the most recent candle (furthest right)
          // and avoid any right-side whitespace.
          chartRef.current?.timeScale().scrollToRealTime();
        }
      } catch (err) {
        console.error('[CandlestickChart] Error:', err);
        const message = err instanceof Error ? err.message : 'Failed to load chart data';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [chartReady, symbol, selectedRange, showVolume]);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    if (chartRef.current) {
      const timeScale = chartRef.current.timeScale();
      const visibleRange = timeScale.getVisibleLogicalRange();
      if (visibleRange) {
        const rangeSize = visibleRange.to - visibleRange.from;
        const newSize = rangeSize * 0.5;
        const center = (visibleRange.from + visibleRange.to) / 2;
        timeScale.setVisibleLogicalRange({
          from: center - newSize / 2,
          to: center + newSize / 2,
        });
      }
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (chartRef.current && candleSeriesRef.current) {
      const timeScale = chartRef.current.timeScale();
      const visibleRange = timeScale.getVisibleLogicalRange();
      
      // Get the full data range from the candle series
      const data = candleSeriesRef.current.data();
      if (!data || data.length === 0 || !visibleRange) return;
      
      const dataLength = data.length;
      const currentRangeSize = visibleRange.to - visibleRange.from;
      
      // If already showing 90%+ of full range, just fit content perfectly
      if (currentRangeSize >= dataLength * 0.9) {
        timeScale.fitContent();
        timeScale.scrollToRealTime();
        return;
      }
      
      // Calculate new size, but cap it at data length
      const newSize = Math.min(currentRangeSize * 2, dataLength);
      
      // Always anchor to end of data (right side) to prevent white space on right
      // Note: lightweight-charts logical range uses a continuous axis; using `dataLength`
      // keeps the last bar flush to the right edge without leaving a gap.
      const newTo = dataLength;
      const newFrom = Math.max(0, newTo - newSize);
      
      timeScale.setVisibleLogicalRange({ from: newFrom, to: newTo });
      timeScale.scrollToRealTime();
    }
  }, []);

  const handleFitContent = useCallback(() => {
    if (chartRef.current) {
      const timeScale = chartRef.current.timeScale();
      timeScale.fitContent();
      timeScale.scrollToRealTime();
    }
  }, []);

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
      {/* Range Selector & Zoom Controls */}
      <div className="flex items-center justify-between mb-2">
        {showRangeSelector && (
          <div className="flex items-center gap-0.5 md:gap-1">
            {(Object.keys(TIME_RANGES) as TimeRange[]).map((range) => (
              <Button
                key={range}
                variant={selectedRange === range ? "secondary" : "ghost"}
                size="sm"
                className={cn(
                  "h-6 md:h-7 px-1.5 md:px-2 text-[10px] md:text-xs",
                  selectedRange === range && "bg-primary/10 text-primary"
                )}
                onClick={() => handleRangeChange(range)}
              >
                {range}
              </Button>
            ))}
          </div>
        )}
        
        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 md:h-7 md:w-7 p-0"
            onClick={handleZoomOut}
            title="Zoom out"
          >
            <ZoomOut className="h-3.5 w-3.5 md:h-4 md:w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 md:h-7 md:w-7 p-0"
            onClick={handleZoomIn}
            title="Zoom in"
          >
            <ZoomIn className="h-3.5 w-3.5 md:h-4 md:w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 md:h-7 md:w-7 p-0"
            onClick={handleFitContent}
            title="Fit to screen"
          >
            <Maximize2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
          </Button>
        </div>
      </div>

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
