/**
 * Charting Page
 * Full TradingView-style charting interface
 */

import { useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AdvancedChart } from '@/components/charting/AdvancedChart';
import { ChartToolbar } from '@/components/charting/ChartToolbar';
import { ChartType, ChartTimeframe, DrawingToolType, IndicatorType, IndicatorConfig } from '@/types/charting';
import { INDICATOR_DEFINITIONS } from '@/lib/charting/indicators';
import { toast } from 'sonner';

export default function ChartingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSymbol = searchParams.get('symbol') || 'AAPL';
  
  const [symbol, setSymbol] = useState(initialSymbol);
  const [timeframe, setTimeframe] = useState<ChartTimeframe>('1D');
  const [chartType, setChartType] = useState<ChartType>('candlestick');
  const [activeTool, setActiveTool] = useState<DrawingToolType>('crosshair');
  const [indicators, setIndicators] = useState<IndicatorConfig[]>([]);
  const chartRef = useRef<any>(null);

  const handleSymbolChange = useCallback((newSymbol: string) => {
    setSymbol(newSymbol);
    setSearchParams({ symbol: newSymbol });
  }, [setSearchParams]);

  const handleAddIndicator = useCallback((type: IndicatorType) => {
    const definition = INDICATOR_DEFINITIONS[type];
    if (!definition) return;

    const newIndicator: IndicatorConfig = {
      id: `${type}_${Date.now()}`,
      type,
      name: definition.name,
      params: { ...definition.defaultParams },
      style: {
        colors: [...definition.defaultColors],
        lineWidth: 2,
        visible: true,
      },
      overlay: definition.overlay,
    };

    setIndicators(prev => [...prev, newIndicator]);
    toast.success(`Added ${definition.shortName}`);
  }, []);

  const handleZoomIn = useCallback(() => {
    // Chart zoom handled by AdvancedChart internally
    toast.info('Zoom in');
  }, []);

  const handleZoomOut = useCallback(() => {
    toast.info('Zoom out');
  }, []);

  const handleFitContent = useCallback(() => {
    toast.info('Fit content');
  }, []);

  const handleScreenshot = useCallback(() => {
    toast.success('Screenshot saved');
  }, []);

  const handleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  }, []);

  const handleSaveLayout = useCallback(() => {
    toast.success('Layout saved');
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-background">
      {/* Toolbar - scrollable on mobile */}
      <div className="overflow-x-auto scrollbar-hide">
        <ChartToolbar
          symbol={symbol}
          onSymbolChange={handleSymbolChange}
          timeframe={timeframe}
          onTimeframeChange={setTimeframe}
          chartType={chartType}
          onChartTypeChange={setChartType}
          activeTool={activeTool}
          onToolChange={setActiveTool}
          onAddIndicator={handleAddIndicator}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onFitContent={handleFitContent}
          onScreenshot={handleScreenshot}
          onFullscreen={handleFullscreen}
          onSaveLayout={handleSaveLayout}
          activeIndicators={indicators.map(i => i.type)}
          className="min-w-[600px]"
        />
      </div>

      {/* Chart Area - responsive height */}
      <div className="flex-1 p-1 sm:p-2">
        <AdvancedChart
          symbol={symbol}
          height={600}
          chartType={chartType}
          timeframe={timeframe}
          indicators={indicators}
          showVolume={true}
          showGrid={true}
          className="h-full rounded-lg border border-border/50"
        />
      </div>

      {/* Active Indicators Bar */}
      {indicators.length > 0 && (
        <div className="flex items-center gap-2 px-2 sm:px-4 py-2 bg-card/50 border-t border-border/50 overflow-x-auto scrollbar-hide">
          <span className="text-xs text-muted-foreground shrink-0">Active:</span>
          {indicators.map((ind) => (
            <div
              key={ind.id}
              className="flex items-center gap-1 px-2 py-1 bg-primary/10 rounded text-xs shrink-0"
            >
              <span className="font-medium">{INDICATOR_DEFINITIONS[ind.type]?.shortName}</span>
              <button
                onClick={() => setIndicators(prev => prev.filter(i => i.id !== ind.id))}
                className="ml-1 text-muted-foreground hover:text-foreground"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
