/**
 * Integrated Stock Chart with Drawing Tools
 * Full TradingView-style charting for the stock research page
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { getCandlesForRange, TIME_RANGES, type TimeRange } from '@/services/candleService';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  RefreshCw,
  Minus,
  TrendingUp,
  Square,
  Trash2,
  MousePointer,
  Crosshair,
  ChevronDown,
  BarChart3,
  LineChart,
  ChartCandlestick,
  Activity,
  Layers
} from 'lucide-react';
import { DrawingObject, DrawingToolType, ChartType } from '@/types/charting';
import { DRAWING_TOOL_DEFINITIONS } from '@/lib/charting/drawingTools';
import { calculateSMA, calculateEMA, calculateRSI, calculateMACD, calculateBollingerBands } from '@/lib/charting/indicators';

// Simple indicator config for this component
interface SimpleIndicatorConfig {
  id: string;
  type: 'sma' | 'ema' | 'rsi' | 'macd' | 'bollinger' | 'vwap';
  name: string;
  params: Record<string, number>;
  color: string;
  enabled: boolean;
}

interface IntegratedStockChartProps {
  symbol: string;
  height?: number;
  className?: string;
  showVolume?: boolean;
  defaultRange?: TimeRange;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  hideRangeSelector?: boolean;
}

// Chart type options
const CHART_TYPES: { type: ChartType; label: string; icon: React.ReactNode }[] = [
  { type: 'candlestick', label: 'Candlestick', icon: <ChartCandlestick className="h-4 w-4" /> },
  { type: 'heikin-ashi', label: 'Heikin-Ashi', icon: <ChartCandlestick className="h-4 w-4" /> },
  { type: 'ohlc', label: 'OHLC/Bars', icon: <BarChart3 className="h-4 w-4" /> },
  { type: 'line', label: 'Line', icon: <LineChart className="h-4 w-4" /> },
  { type: 'area', label: 'Area', icon: <Activity className="h-4 w-4" /> },
];

// Drawing tool categories
const DRAWING_CATEGORIES = [
  {
    name: 'Lines',
    tools: ['trendline', 'ray', 'horizontal-line', 'vertical-line', 'extended-line'] as DrawingToolType[],
  },
  {
    name: 'Fibonacci',
    tools: ['fib-retracement', 'fib-extension'] as DrawingToolType[],
  },
  {
    name: 'Shapes',
    tools: ['rectangle', 'parallel-channel'] as DrawingToolType[],
  },
];

// Popular indicators for quick access
const POPULAR_INDICATORS = [
  { id: 'sma', name: 'SMA (20)', type: 'sma' as const, params: { period: 20 } },
  { id: 'ema', name: 'EMA (21)', type: 'ema' as const, params: { period: 21 } },
  { id: 'rsi', name: 'RSI (14)', type: 'rsi' as const, params: { period: 14 } },
  { id: 'macd', name: 'MACD', type: 'macd' as const, params: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 } },
  { id: 'bollinger', name: 'Bollinger Bands', type: 'bollinger' as const, params: { period: 20, stdDev: 2 } },
];

export function IntegratedStockChart({
  symbol,
  height = 320,
  className,
  showVolume = true,
  defaultRange = '3M',
  onRefresh,
  isRefreshing = false,
  hideRangeSelector = false,
}: IntegratedStockChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const mainSeriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);
  const indicatorSeriesRef = useRef<Map<string, any>>(new Map());
  
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRange, setSelectedRange] = useState<TimeRange>(defaultRange);

  // Sync selectedRange when parent changes defaultRange (e.g. MobileChartCard timeframe pills)
  useEffect(() => {
    setSelectedRange(defaultRange);
  }, [defaultRange]);
  const [chartType, setChartType] = useState<ChartType>('candlestick');
  const [activeTool, setActiveTool] = useState<DrawingToolType>('cursor');
  const [drawings, setDrawings] = useState<DrawingObject[]>([]);
  const [activeIndicators, setActiveIndicators] = useState<SimpleIndicatorConfig[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [chartReady, setChartReady] = useState(false);
  const [chartData, setChartData] = useState<any[]>([]);

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
          vertLines: { color: 'rgba(255, 255, 255, 0.04)' },
          horzLines: { color: 'rgba(255, 255, 255, 0.04)' },
        },
        crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: {
            color: 'rgba(255, 255, 255, 0.2)',
            width: 1,
            style: 2,
            labelBackgroundColor: '#1e293b',
          },
          horzLine: {
            color: 'rgba(255, 255, 255, 0.2)',
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
        },
        timeScale: {
          borderColor: 'rgba(255, 255, 255, 0.1)',
          timeVisible: true,
          secondsVisible: false,
          rightOffset: 0,
          fixRightEdge: true,
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

      chartRef.current = chart;
      setChartReady(true);

      // Handle resize
      resizeObserver = new ResizeObserver(entries => {
        if (entries.length > 0 && chart) {
          const { width } = entries[0].contentRect;
          chart.applyOptions({ width });
        }
      });
      resizeObserver.observe(container);
    };

    initChart();

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      if (chart) chart.remove();
      chartRef.current = null;
      mainSeriesRef.current = null;
      volumeSeriesRef.current = null;
      indicatorSeriesRef.current.clear();
      setChartReady(false);
    };
  }, [height, showVolume]);

  // Create/update main series when chart type changes
  useEffect(() => {
    if (!chartRef.current || !chartReady) return;

    // Remove existing main series
    if (mainSeriesRef.current) {
      chartRef.current.removeSeries(mainSeriesRef.current);
    }
    if (volumeSeriesRef.current) {
      chartRef.current.removeSeries(volumeSeriesRef.current);
    }

    // Create new series based on chart type
    let mainSeries;
    switch (chartType) {
      case 'candlestick':
      case 'heikin-ashi':
        mainSeries = chartRef.current.addCandlestickSeries({
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
        mainSeries = chartRef.current.addBarSeries({
          upColor: '#22c55e',
          downColor: '#ef4444',
        });
        break;
      case 'line':
        mainSeries = chartRef.current.addLineSeries({
          color: '#3b82f6',
          lineWidth: 2,
        });
        break;
      case 'area':
        mainSeries = chartRef.current.addAreaSeries({
          lineColor: '#3b82f6',
          topColor: 'rgba(59, 130, 246, 0.4)',
          bottomColor: 'rgba(59, 130, 246, 0)',
          lineWidth: 2,
        });
        break;
      default:
        mainSeries = chartRef.current.addCandlestickSeries({
          upColor: '#22c55e',
          downColor: '#ef4444',
          borderUpColor: '#22c55e',
          borderDownColor: '#ef4444',
          wickUpColor: '#22c55e',
          wickDownColor: '#ef4444',
        });
    }
    mainSeriesRef.current = mainSeries;

    // Add volume
    if (showVolume) {
      const volumeSeries = chartRef.current.addHistogramSeries({
        color: '#6366f1',
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume',
      });
      volumeSeries.priceScale().applyOptions({
        scaleMargins: { top: 0.85, bottom: 0 },
      });
      volumeSeriesRef.current = volumeSeries;
    }

    // Data will be re-applied by the unified chartData effect
  }, [chartType, chartReady, showVolume]);

  // Apply data to chart
  const applyChartData = useCallback((data: any[]) => {
    if (!mainSeriesRef.current) return;

    let transformedData = data;
    if (chartType === 'heikin-ashi') {
      transformedData = calculateHeikinAshi(data);
    }

    if (chartType === 'line' || chartType === 'area') {
      mainSeriesRef.current.setData(
        transformedData.map((d: any) => ({
          time: d.time,
          value: d.close,
        }))
      );
    } else {
      mainSeriesRef.current.setData(
        transformedData.map((d: any) => ({
          time: d.time,
          open: d.open,
          high: d.high,
          low: d.low,
          close: d.close,
        }))
      );
    }

    if (volumeSeriesRef.current) {
      volumeSeriesRef.current.setData(
        transformedData.map((d: any) => ({
          time: d.time,
          value: d.volume || 0,
          color: d.close >= d.open ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)',
        }))
      );
    }

    chartRef.current?.timeScale().scrollToRealTime();
  }, [chartType]);

  // Fetch data when symbol, range, or chart readiness changes
  useEffect(() => {
    if (!chartReady || !mainSeriesRef.current) return;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const data = await getCandlesForRange(symbol, selectedRange);
        
        if (data.length > 0) {
          setChartData(data);
        }
      } catch (err) {
        console.error('[IntegratedStockChart] Error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load chart data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [chartReady, symbol, selectedRange]);

  // Calculate Heikin-Ashi
  const calculateHeikinAshi = (data: any[]): any[] => {
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
  };

  // Update indicators on chart
  const updateIndicators = useCallback((data: any[]) => {
    if (!chartRef.current) return;

    // Remove old indicator series
    indicatorSeriesRef.current.forEach((series) => {
      try {
        chartRef.current.removeSeries(series);
      } catch (e) {
        // Series might already be removed
      }
    });
    indicatorSeriesRef.current.clear();

    // Add active indicators
    activeIndicators.forEach((indicator) => {
      const closes = data.map((d: any) => d.close);
      let result: (number | null)[] = [];
      
      switch (indicator.type) {
        case 'sma':
          result = calculateSMA(closes, indicator.params.period || 20);
          break;
        case 'ema':
          result = calculateEMA(closes, indicator.params.period || 21);
          break;
        case 'rsi':
          result = calculateRSI(closes, indicator.params.period || 14);
          break;
        case 'macd':
          const macdResult = calculateMACD(closes, 12, 26, 9);
          result = macdResult.macd;
          break;
        case 'bollinger':
          const bbResult = calculateBollingerBands(closes, indicator.params.period || 20, indicator.params.stdDev || 2);
          result = bbResult.middle;
          break;
        default:
          result = calculateSMA(closes, 20);
      }
      
      if (result && result.length > 0) {
        const lineSeries = chartRef.current.addLineSeries({
          color: indicator.color,
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: false,
        });

        const indicatorData = result
          .map((value, index) => ({
            time: data[index]?.time,
            value: value,
          }))
          .filter((d: any) => d.value !== null && d.value !== undefined && !isNaN(d.value));

        lineSeries.setData(indicatorData);
        indicatorSeriesRef.current.set(indicator.id, lineSeries);
      }
    });
  }, [activeIndicators]);

  // Apply chart data + indicators whenever chartData, chartType, or indicators change
  useEffect(() => {
    if (!mainSeriesRef.current || chartData.length === 0) return;
    applyChartData(chartData);
    updateIndicators(chartData);
  }, [chartData, applyChartData, updateIndicators]);

  // Toggle indicator
  const toggleIndicator = (indicatorDef: typeof POPULAR_INDICATORS[0]) => {
    setActiveIndicators(prev => {
      const exists = prev.find(i => i.id === indicatorDef.id);
      if (exists) {
        return prev.filter(i => i.id !== indicatorDef.id);
      }
      const colors = ['#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
      const newIndicator: SimpleIndicatorConfig = {
        id: indicatorDef.id,
        type: indicatorDef.type,
        name: indicatorDef.name,
        params: indicatorDef.params,
        enabled: true,
        color: colors[prev.length % colors.length],
      };
      return [...prev, newIndicator];
    });
  };

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
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
      chartRef.current.timeScale().scrollToRealTime();
    }
  }, []);

  const handleFitContent = useCallback(() => {
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
      chartRef.current.timeScale().scrollToRealTime();
    }
  }, []);

  // Clear all drawings
  const clearDrawings = () => {
    setDrawings([]);
    setActiveTool('cursor');
  };

  // Get tool icon
  const getToolIcon = (tool: DrawingToolType) => {
    switch (tool) {
      case 'cursor': return <MousePointer className="h-3.5 w-3.5" />;
      case 'crosshair': return <Crosshair className="h-3.5 w-3.5" />;
      case 'trendline': case 'ray': case 'horizontal-line': case 'vertical-line': case 'extended-line':
        return <Minus className="h-3.5 w-3.5" />;
      case 'fib-retracement': case 'fib-extension':
        return <TrendingUp className="h-3.5 w-3.5" />;
      case 'rectangle': case 'parallel-channel':
        return <Square className="h-3.5 w-3.5" />;
      default: return <Minus className="h-3.5 w-3.5" />;
    }
  };

  if (error) {
    return (
      <div className={cn("flex items-center justify-center h-[200px] text-muted-foreground", className)}>
        {error}
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 mb-2 px-2 pt-2 overflow-x-auto">
        {/* Left: Range selector */}
        {!hideRangeSelector && (
          <div className="flex items-center gap-0.5">
            {(Object.keys(TIME_RANGES) as TimeRange[]).map((range) => (
              <Button
                key={range}
                variant={selectedRange === range ? "secondary" : "ghost"}
                size="sm"
                className={cn(
                  "h-6 px-1.5 text-[10px]",
                  selectedRange === range && "bg-primary/10 text-primary"
                )}
                onClick={() => setSelectedRange(range)}
              >
                {range}
              </Button>
            ))}
            {onRefresh && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 ml-1"
                onClick={onRefresh}
                disabled={isRefreshing}
                title="Refresh data"
              >
                <RefreshCw className={cn("h-3 w-3", isRefreshing && "animate-spin")} />
              </Button>
            )}
          </div>
        )}

        {/* Center: Drawing tools + Chart type + Indicators */}
        <div className="flex items-center gap-1">
          {/* Chart Type Selector */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 px-2 gap-1 text-[10px]">
                {CHART_TYPES.find(t => t.type === chartType)?.icon}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-40 p-1" align="start">
              {CHART_TYPES.map((type) => (
                <Button
                  key={type.type}
                  variant={chartType === type.type ? "secondary" : "ghost"}
                  size="sm"
                  className="w-full justify-start h-7 text-xs gap-2"
                  onClick={() => setChartType(type.type)}
                >
                  {type.icon}
                  {type.label}
                </Button>
              ))}
            </PopoverContent>
          </Popover>

          <Separator orientation="vertical" className="h-4" />

          {/* Drawing Tools */}
          <Button
            variant={activeTool === 'cursor' ? "secondary" : "ghost"}
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setActiveTool('cursor')}
            title="Cursor"
          >
            <MousePointer className="h-3.5 w-3.5" />
          </Button>

          <Button
            variant={activeTool === 'crosshair' ? "secondary" : "ghost"}
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setActiveTool('crosshair')}
            title="Crosshair"
          >
            <Crosshair className="h-3.5 w-3.5" />
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant={activeTool !== 'cursor' && activeTool !== 'crosshair' ? "secondary" : "ghost"} 
                size="sm" 
                className="h-6 px-2 gap-1 text-[10px]"
              >
                {getToolIcon(activeTool !== 'cursor' && activeTool !== 'crosshair' ? activeTool : 'trendline')}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="start">
              <div className="space-y-2">
                {DRAWING_CATEGORIES.map((category) => (
                  <div key={category.name}>
                    <div className="text-[10px] text-muted-foreground mb-1 font-medium">
                      {category.name}
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {category.tools.map((tool) => {
                        const def = DRAWING_TOOL_DEFINITIONS[tool];
                        if (!def) return null;
                        return (
                          <Button
                            key={tool}
                            variant={activeTool === tool ? "secondary" : "ghost"}
                            size="sm"
                            className="h-7 text-[10px] justify-start gap-1"
                            onClick={() => setActiveTool(tool)}
                          >
                            {getToolIcon(tool)}
                            {def.name}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {drawings.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-destructive"
              onClick={clearDrawings}
              title="Clear drawings"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}

          <Separator orientation="vertical" className="h-4" />

          {/* Indicators */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 px-2 gap-1 text-[10px]">
                <Layers className="h-3.5 w-3.5" />
                {activeIndicators.length > 0 && (
                  <span className="bg-primary/20 text-primary px-1 rounded text-[8px]">
                    {activeIndicators.length}
                  </span>
                )}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="start">
              <div className="text-[10px] text-muted-foreground mb-2 font-medium">
                Technical Indicators
              </div>
              <div className="space-y-1">
                {POPULAR_INDICATORS.map((indicator) => {
                  const isActive = activeIndicators.some(i => i.id === indicator.id);
                  return (
                    <Button
                      key={indicator.id}
                      variant={isActive ? "secondary" : "ghost"}
                      size="sm"
                      className="w-full h-7 text-[10px] justify-start"
                      onClick={() => toggleIndicator(indicator)}
                    >
                      {indicator.name}
                      {isActive && (
                        <span className="ml-auto text-primary">✓</span>
                      )}
                    </Button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Right: Zoom controls */}
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={handleZoomOut}
            title="Zoom out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={handleZoomIn}
            title="Zoom in"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={handleFitContent}
            title="Fit to screen"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Chart Container */}
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-muted-foreground">Loading chart...</span>
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
      <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground flex-wrap">
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 bg-green-500 rounded-sm" />
          <span>Up</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 bg-red-500 rounded-sm" />
          <span>Down</span>
        </div>
        {showVolume && (
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 bg-indigo-500/50 rounded-sm" />
            <span>Volume</span>
          </div>
        )}
        {activeIndicators.map((indicator) => (
          <div key={indicator.id} className="flex items-center gap-1">
            <div 
              className="w-2.5 h-2.5 rounded-sm" 
              style={{ backgroundColor: indicator.color }}
            />
            <span>{indicator.type.toUpperCase()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
