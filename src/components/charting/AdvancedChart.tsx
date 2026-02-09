/**
 * Advanced Chart Component
 * TradingView-style chart with full functionality
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { 
  ChartType, 
  ChartTimeframe, 
  IndicatorConfig, 
  DrawingObject,
  OHLCVData,
  ChartCrosshairData 
} from '@/types/charting';
import { getCandlesForRange, TIME_RANGES, type TimeRange } from '@/services/candleService';

interface AdvancedChartProps {
  symbol: string;
  height?: number;
  className?: string;
  chartType?: ChartType;
  timeframe?: ChartTimeframe;
  indicators?: IndicatorConfig[];
  drawings?: DrawingObject[];
  showVolume?: boolean;
  showGrid?: boolean;
  priceScale?: 'linear' | 'logarithmic' | 'percentage';
  crosshairMode?: 'normal' | 'magnet';
  onCrosshairMove?: (data: ChartCrosshairData | null) => void;
  onTimeframeChange?: (timeframe: ChartTimeframe) => void;
  onChartTypeChange?: (chartType: ChartType) => void;
  linkedGroupId?: string;
}

// Map our timeframes to candleService ranges
const TIMEFRAME_TO_RANGE: Record<ChartTimeframe, TimeRange> = {
  '1m': '1D',
  '3m': '1D',
  '5m': '1D',
  '15m': '1D',
  '30m': '1W',
  '1h': '1W',
  '2h': '1M',
  '4h': '1M',
  '1D': '3M',
  '1W': '1Y',
  '1M': '1Y',
  '3M': '1Y',
  '1Y': '1Y',
};

export function AdvancedChart({
  symbol,
  height = 500,
  className,
  chartType = 'candlestick',
  timeframe = '1D',
  indicators = [],
  drawings = [],
  showVolume = true,
  showGrid = true,
  priceScale = 'linear',
  crosshairMode = 'normal',
  onCrosshairMove,
  onTimeframeChange,
  onChartTypeChange,
  linkedGroupId,
}: AdvancedChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const mainSeriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);
  const indicatorSeriesRef = useRef<Map<string, any>>(new Map());
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<OHLCVData[]>([]);
  const [currentPrice, setCurrentPrice] = useState<OHLCVData | null>(null);

  // Convert timeframe to data range
  const dataRange = useMemo(() => TIMEFRAME_TO_RANGE[timeframe], [timeframe]);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    let chart: any = null;
    let resizeObserver: ResizeObserver | null = null;

    const initChart = async () => {
      if (!chartContainerRef.current) return;

      const { createChart, ColorType, CrosshairMode, PriceScaleMode } = await import('lightweight-charts');

      const container = chartContainerRef.current;

      chart = createChart(container, {
        width: container.clientWidth,
        height: height,
        layout: {
          background: { type: ColorType.Solid, color: 'transparent' },
          textColor: '#9ca3af',
          fontFamily: 'Inter, sans-serif',
        },
        grid: {
          vertLines: { 
            color: showGrid ? 'rgba(255, 255, 255, 0.04)' : 'transparent',
            style: 1,
          },
          horzLines: { 
            color: showGrid ? 'rgba(255, 255, 255, 0.04)' : 'transparent',
            style: 1,
          },
        },
        crosshair: {
          mode: crosshairMode === 'magnet' ? CrosshairMode.Magnet : CrosshairMode.Normal,
          vertLine: {
            color: 'rgba(255, 255, 255, 0.3)',
            width: 1,
            style: 2,
            labelBackgroundColor: '#1e293b',
          },
          horzLine: {
            color: 'rgba(255, 255, 255, 0.3)',
            width: 1,
            style: 2,
            labelBackgroundColor: '#1e293b',
          },
        },
        rightPriceScale: {
          borderColor: 'rgba(255, 255, 255, 0.1)',
          scaleMargins: {
            top: 0.1,
            bottom: showVolume ? 0.25 : 0.1,
          },
          mode: priceScale === 'logarithmic' ? PriceScaleMode.Logarithmic : 
                priceScale === 'percentage' ? PriceScaleMode.Percentage : 
                PriceScaleMode.Normal,
        },
        timeScale: {
          borderColor: 'rgba(255, 255, 255, 0.1)',
          timeVisible: true,
          secondsVisible: timeframe.includes('m'),
          rightOffset: 5,
          fixRightEdge: false,
          lockVisibleTimeRangeOnResize: true,
          tickMarkFormatter: (time: number) => {
            const date = new Date(time * 1000);
            if (timeframe.includes('m') || timeframe.includes('h')) {
              return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
          },
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

      // Create main series based on chart type
      let mainSeries;
      switch (chartType) {
        case 'candlestick':
        case 'heikin-ashi':
          mainSeries = chart.addCandlestickSeries({
            upColor: '#22c55e',
            downColor: '#ef4444',
            borderUpColor: '#22c55e',
            borderDownColor: '#ef4444',
            wickUpColor: '#22c55e',
            wickDownColor: '#ef4444',
          });
          break;
        case 'ohlc':
        case 'bars':
          mainSeries = chart.addBarSeries({
            upColor: '#22c55e',
            downColor: '#ef4444',
          });
          break;
        case 'line':
          mainSeries = chart.addLineSeries({
            color: '#3b82f6',
            lineWidth: 2,
          });
          break;
        case 'area':
          mainSeries = chart.addAreaSeries({
            lineColor: '#3b82f6',
            topColor: 'rgba(59, 130, 246, 0.4)',
            bottomColor: 'rgba(59, 130, 246, 0)',
            lineWidth: 2,
          });
          break;
        case 'baseline':
          mainSeries = chart.addBaselineSeries({
            baseValue: { type: 'price', price: 0 },
            topLineColor: '#22c55e',
            topFillColor1: 'rgba(34, 197, 94, 0.3)',
            topFillColor2: 'rgba(34, 197, 94, 0)',
            bottomLineColor: '#ef4444',
            bottomFillColor1: 'rgba(239, 68, 68, 0)',
            bottomFillColor2: 'rgba(239, 68, 68, 0.3)',
          });
          break;
        default:
          mainSeries = chart.addCandlestickSeries({
            upColor: '#22c55e',
            downColor: '#ef4444',
            borderUpColor: '#22c55e',
            borderDownColor: '#ef4444',
            wickUpColor: '#22c55e',
            wickDownColor: '#ef4444',
          });
      }

      mainSeriesRef.current = mainSeries;

      // Add volume series
      if (showVolume) {
        const volumeSeries = chart.addHistogramSeries({
          color: '#6366f1',
          priceFormat: { type: 'volume' },
          priceScaleId: 'volume',
        });
        volumeSeries.priceScale().applyOptions({
          scaleMargins: { top: 0.85, bottom: 0 },
        });
        volumeSeriesRef.current = volumeSeries;
      }

      // Handle crosshair move
      chart.subscribeCrosshairMove((param: any) => {
        if (!param.time || !param.point) {
          onCrosshairMove?.(null);
          setCurrentPrice(null);
          return;
        }

        const data = param.seriesData.get(mainSeries);
        if (data) {
          const crosshairData: ChartCrosshairData = {
            time: param.time,
            price: data.close || data.value,
            ohlcv: data.open !== undefined ? {
              time: param.time,
              open: data.open,
              high: data.high,
              low: data.low,
              close: data.close,
              volume: 0,
            } : undefined,
          };
          onCrosshairMove?.(crosshairData);
          setCurrentPrice(crosshairData.ohlcv || null);
        }
      });

      // Handle resize
      resizeObserver = new ResizeObserver(entries => {
        if (entries.length > 0 && chart) {
          const { width } = entries[0].contentRect;
          chart.applyOptions({ width });
        }
      });
      resizeObserver.observe(container);

      chartRef.current = chart;
    };

    initChart();

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      if (chart) chart.remove();
      chartRef.current = null;
      mainSeriesRef.current = null;
      volumeSeriesRef.current = null;
      indicatorSeriesRef.current.clear();
    };
  }, [height, showVolume, showGrid, priceScale, crosshairMode, chartType]);

  // Fetch and update data
  useEffect(() => {
    if (!mainSeriesRef.current) return;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await getCandlesForRange(symbol, dataRange);
        
        if (data.length === 0) {
          setError('No data available');
          return;
        }

        // Transform data based on chart type
        let transformedData = data;
        if (chartType === 'heikin-ashi') {
          transformedData = calculateHeikinAshi(data);
        }

        setChartData(transformedData.map(d => ({
          time: typeof d.time === 'string' ? new Date(d.time).getTime() / 1000 : d.time,
          open: d.open,
          high: d.high,
          low: d.low,
          close: d.close,
          volume: d.volume || 0,
        })));

        // Set main series data
        if (chartType === 'line' || chartType === 'area') {
          mainSeriesRef.current.setData(
            transformedData.map(d => ({
              time: d.time as any,
              value: d.close,
            }))
          );
        } else if (chartType === 'baseline') {
          const avgPrice = transformedData.reduce((sum, d) => sum + d.close, 0) / transformedData.length;
          mainSeriesRef.current.applyOptions({
            baseValue: { type: 'price', price: avgPrice },
          });
          mainSeriesRef.current.setData(
            transformedData.map(d => ({
              time: d.time as any,
              value: d.close,
            }))
          );
        } else {
          mainSeriesRef.current.setData(
            transformedData.map(d => ({
              time: d.time as any,
              open: d.open,
              high: d.high,
              low: d.low,
              close: d.close,
            }))
          );
        }

        // Set volume data
        if (volumeSeriesRef.current) {
          volumeSeriesRef.current.setData(
            transformedData.map(d => ({
              time: d.time as any,
              value: d.volume || 0,
              color: d.close >= d.open ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)',
            }))
          );
        }

        // Fit content
        chartRef.current?.timeScale().fitContent();

      } catch (err) {
        console.error('[AdvancedChart] Error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [symbol, dataRange, chartType]);

  // Calculate Heikin-Ashi candles
  const calculateHeikinAshi = useCallback((data: any[]): any[] => {
    const haData: any[] = [];
    
    for (let i = 0; i < data.length; i++) {
      const current = data[i];
      const prev = haData[i - 1];
      
      const haClose = (current.open + current.high + current.low + current.close) / 4;
      const haOpen = prev 
        ? (prev.open + prev.close) / 2 
        : (current.open + current.close) / 2;
      const haHigh = Math.max(current.high, haOpen, haClose);
      const haLow = Math.min(current.low, haOpen, haClose);
      
      haData.push({
        time: current.time,
        open: haOpen,
        high: haHigh,
        low: haLow,
        close: haClose,
        volume: current.volume,
      });
    }
    
    return haData;
  }, []);

  // Get last price info
  const lastPrice = useMemo(() => {
    if (chartData.length === 0) return null;
    const last = chartData[chartData.length - 1];
    const prev = chartData.length > 1 ? chartData[chartData.length - 2] : last;
    const change = last.close - prev.close;
    const changePercent = (change / prev.close) * 100;
    return { ...last, change, changePercent };
  }, [chartData]);

  return (
    <div className={cn("relative bg-card rounded-lg overflow-hidden", className)}>
      {/* Price Header */}
      {lastPrice && (
        <div className="absolute top-2 left-3 z-20 flex items-baseline gap-2">
          <span className="text-lg font-bold">{symbol}</span>
          <span className="text-2xl font-mono font-bold">
            ${lastPrice.close.toFixed(2)}
          </span>
          <span className={cn(
            "text-sm font-medium",
            lastPrice.change >= 0 ? "text-green-500" : "text-red-500"
          )}>
            {lastPrice.change >= 0 ? '+' : ''}{lastPrice.change.toFixed(2)} 
            ({lastPrice.changePercent >= 0 ? '+' : ''}{lastPrice.changePercent.toFixed(2)}%)
          </span>
        </div>
      )}

      {/* OHLCV Display */}
      {currentPrice && (
        <div className="absolute top-10 left-3 z-20 flex items-center gap-4 text-xs font-mono text-muted-foreground">
          <span>O: <span className="text-foreground">{currentPrice.open.toFixed(2)}</span></span>
          <span>H: <span className="text-green-500">{currentPrice.high.toFixed(2)}</span></span>
          <span>L: <span className="text-red-500">{currentPrice.low.toFixed(2)}</span></span>
          <span>C: <span className="text-foreground">{currentPrice.close.toFixed(2)}</span></span>
        </div>
      )}

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-30">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-muted-foreground">Loading chart...</span>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-30">
          <div className="text-center">
            <p className="text-destructive font-medium">{error}</p>
            <p className="text-sm text-muted-foreground mt-1">Unable to load chart data</p>
          </div>
        </div>
      )}

      {/* Chart container */}
      <div 
        ref={chartContainerRef} 
        className="w-full"
        style={{ height }}
      />
    </div>
  );
}
