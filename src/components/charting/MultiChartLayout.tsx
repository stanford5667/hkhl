/**
 * Multi-Chart Layout Component
 * TradingView-style grid layouts for multiple charts
 */

import { useState, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { AdvancedChart } from './AdvancedChart';
import { ChartLayoutType, ChartPanelState, ChartTimeframe, ChartType } from '@/types/charting';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Grid2X2, 
  LayoutGrid, 
  Square, 
  Rows2, 
  Columns2,
  Link2,
  Link2Off,
  Maximize2,
  X
} from 'lucide-react';

interface MultiChartLayoutProps {
  defaultSymbol?: string;
  className?: string;
}

const LAYOUT_CONFIGS: Record<ChartLayoutType, { rows: number; cols: number; label: string; icon: React.ReactNode }> = {
  '1x1': { rows: 1, cols: 1, label: '1×1', icon: <Square className="h-4 w-4" /> },
  '1x2': { rows: 1, cols: 2, label: '1×2', icon: <Columns2 className="h-4 w-4" /> },
  '2x1': { rows: 2, cols: 1, label: '2×1', icon: <Rows2 className="h-4 w-4" /> },
  '2x2': { rows: 2, cols: 2, label: '2×2', icon: <Grid2X2 className="h-4 w-4" /> },
  '1x3': { rows: 1, cols: 3, label: '1×3', icon: <LayoutGrid className="h-4 w-4" /> },
  '3x1': { rows: 3, cols: 1, label: '3×1', icon: <LayoutGrid className="h-4 w-4" /> },
  '2x3': { rows: 2, cols: 3, label: '2×3', icon: <LayoutGrid className="h-4 w-4" /> },
  '3x2': { rows: 3, cols: 2, label: '3×2', icon: <LayoutGrid className="h-4 w-4" /> },
  '4x2': { rows: 4, cols: 2, label: '4×2', icon: <LayoutGrid className="h-4 w-4" /> },
};

const DEFAULT_SYMBOLS = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'NVDA', 'META', 'TSLA', 'AMD'];

export function MultiChartLayout({ 
  defaultSymbol = 'AAPL',
  className 
}: MultiChartLayoutProps) {
  const [layout, setLayout] = useState<ChartLayoutType>('2x2');
  const [panels, setPanels] = useState<ChartPanelState[]>(() => 
    createPanels('2x2', defaultSymbol)
  );
  const [activePanel, setActivePanel] = useState<string>(panels[0]?.panelId || '');
  const [linkedGroup, setLinkedGroup] = useState<string | null>('default');
  const [maximizedPanel, setMaximizedPanel] = useState<string | null>(null);

  // Create panels for a layout
  function createPanels(layoutType: ChartLayoutType, symbol: string): ChartPanelState[] {
    const config = LAYOUT_CONFIGS[layoutType];
    const count = config.rows * config.cols;
    const newPanels: ChartPanelState[] = [];

    for (let i = 0; i < count; i++) {
      newPanels.push({
        panelId: `panel-${i}-${Date.now()}`,
        symbol: DEFAULT_SYMBOLS[i] || symbol,
        timeframe: '1D',
        chartType: 'candlestick',
        indicators: [],
        drawings: [],
        priceScale: 'linear',
        showVolume: true,
        showGrid: true,
        crosshairMode: 'normal',
        linkedGroup: 'default',
      });
    }

    return newPanels;
  }

  // Handle layout change
  const handleLayoutChange = useCallback((newLayout: ChartLayoutType) => {
    const config = LAYOUT_CONFIGS[newLayout];
    const count = config.rows * config.cols;

    setPanels(prev => {
      // Keep existing panels, add new ones if needed
      if (prev.length >= count) {
        return prev.slice(0, count);
      }
      
      const newPanels = [...prev];
      for (let i = prev.length; i < count; i++) {
        newPanels.push({
          panelId: `panel-${i}-${Date.now()}`,
          symbol: DEFAULT_SYMBOLS[i] || defaultSymbol,
          timeframe: '1D',
          chartType: 'candlestick',
          indicators: [],
          drawings: [],
          priceScale: 'linear',
          showVolume: true,
          showGrid: true,
          crosshairMode: 'normal',
          linkedGroup: linkedGroup || undefined,
        });
      }
      return newPanels;
    });

    setLayout(newLayout);
  }, [defaultSymbol, linkedGroup]);

  // Update panel symbol
  const handleSymbolChange = useCallback((panelId: string, symbol: string) => {
    setPanels(prev => prev.map(p => 
      p.panelId === panelId ? { ...p, symbol: symbol.toUpperCase() } : p
    ));
  }, []);

  // Update panel timeframe
  const handleTimeframeChange = useCallback((panelId: string, timeframe: ChartTimeframe) => {
    if (linkedGroup) {
      // Update all linked panels
      setPanels(prev => prev.map(p => ({ ...p, timeframe })));
    } else {
      setPanels(prev => prev.map(p => 
        p.panelId === panelId ? { ...p, timeframe } : p
      ));
    }
  }, [linkedGroup]);

  // Toggle linking
  const toggleLinking = useCallback(() => {
    if (linkedGroup) {
      setLinkedGroup(null);
      setPanels(prev => prev.map(p => ({ ...p, linkedGroup: undefined })));
    } else {
      setLinkedGroup('default');
      setPanels(prev => prev.map(p => ({ ...p, linkedGroup: 'default' })));
    }
  }, [linkedGroup]);

  const layoutConfig = LAYOUT_CONFIGS[layout];

  // Get visible panels (all or just maximized)
  const visiblePanels = useMemo(() => {
    if (maximizedPanel) {
      return panels.filter(p => p.panelId === maximizedPanel);
    }
    return panels;
  }, [panels, maximizedPanel]);

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* Layout Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-card/50">
        <div className="flex items-center gap-2">
          {/* Layout Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                {LAYOUT_CONFIGS[layout].icon}
                <span>{LAYOUT_CONFIGS[layout].label}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {(Object.entries(LAYOUT_CONFIGS) as [ChartLayoutType, typeof LAYOUT_CONFIGS['1x1']][]).map(([key, config]) => (
                <DropdownMenuItem 
                  key={key}
                  onClick={() => handleLayoutChange(key)}
                  className="gap-2"
                >
                  {config.icon}
                  <span>{config.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Link Toggle */}
          <Button
            variant={linkedGroup ? "default" : "outline"}
            size="sm"
            onClick={toggleLinking}
            className="gap-2"
          >
            {linkedGroup ? <Link2 className="h-4 w-4" /> : <Link2Off className="h-4 w-4" />}
            <span>{linkedGroup ? 'Linked' : 'Unlinked'}</span>
          </Button>
        </div>

        {/* Maximized panel controls */}
        {maximizedPanel && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMaximizedPanel(null)}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            <span>Exit Fullscreen</span>
          </Button>
        )}
      </div>

      {/* Chart Grid */}
      <div 
        className="flex-1 grid gap-1 p-1"
        style={{
          gridTemplateColumns: maximizedPanel ? '1fr' : `repeat(${layoutConfig.cols}, 1fr)`,
          gridTemplateRows: maximizedPanel ? '1fr' : `repeat(${layoutConfig.rows}, 1fr)`,
        }}
      >
        {visiblePanels.map((panel) => (
          <div 
            key={panel.panelId}
            className={cn(
              "relative rounded-lg border bg-card overflow-hidden",
              activePanel === panel.panelId && "ring-2 ring-primary"
            )}
            onClick={() => setActivePanel(panel.panelId)}
          >
            {/* Panel Header */}
            <div className="absolute top-0 left-0 right-0 z-20 flex items-center gap-2 px-2 py-1 bg-card/80 backdrop-blur-sm border-b border-border/30">
              <Input
                value={panel.symbol}
                onChange={(e) => handleSymbolChange(panel.panelId, e.target.value)}
                className="h-6 w-20 text-xs font-mono bg-transparent border-none p-0 focus-visible:ring-0"
              />
              
              <select
                value={panel.timeframe}
                onChange={(e) => handleTimeframeChange(panel.panelId, e.target.value as ChartTimeframe)}
                className="h-6 text-xs bg-transparent border-none text-muted-foreground"
              >
                <option value="1m">1m</option>
                <option value="5m">5m</option>
                <option value="15m">15m</option>
                <option value="1h">1H</option>
                <option value="4h">4H</option>
                <option value="1D">1D</option>
                <option value="1W">1W</option>
                <option value="1M">1M</option>
              </select>

              <div className="flex-1" />

              {!maximizedPanel && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMaximizedPanel(panel.panelId);
                  }}
                >
                  <Maximize2 className="h-3 w-3" />
                </Button>
              )}
            </div>

            {/* Chart */}
            <AdvancedChart
              symbol={panel.symbol}
              timeframe={panel.timeframe}
              chartType={panel.chartType}
              indicators={panel.indicators}
              showVolume={panel.showVolume}
              showGrid={panel.showGrid}
              height={maximizedPanel ? window.innerHeight - 120 : 300}
              linkedGroupId={panel.linkedGroup}
              className="pt-8"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
