/**
 * Chart Toolbar Component
 * TradingView-style toolbar with all chart controls
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  Search,
  ChevronDown,
  CandlestickChart,
  LineChart,
  AreaChart,
  BarChart3,
  TrendingUp,
  Minus,
  Square,
  Circle,
  Triangle,
  Type,
  ArrowUpDown,
  Crosshair,
  MousePointer2,
  Pencil,
  Eraser,
  Settings,
  Layers,
  Save,
  Camera,
  Share2,
  Maximize2,
  Grid3X3,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Play,
  GitBranchPlus,
  ArrowUpRight,
  MoveHorizontal,
  SeparatorVertical,
} from 'lucide-react';
import { ChartType, ChartTimeframe, DrawingToolType, IndicatorType } from '@/types/charting';
import { INDICATOR_DEFINITIONS, getIndicatorsByCategory } from '@/lib/charting/indicators';
import { DRAWING_TOOL_DEFINITIONS, getToolsByCategory } from '@/lib/charting/drawingTools';

interface ChartToolbarProps {
  symbol: string;
  onSymbolChange: (symbol: string) => void;
  timeframe: ChartTimeframe;
  onTimeframeChange: (timeframe: ChartTimeframe) => void;
  chartType: ChartType;
  onChartTypeChange: (chartType: ChartType) => void;
  activeTool: DrawingToolType;
  onToolChange: (tool: DrawingToolType) => void;
  onAddIndicator: (indicator: IndicatorType) => void;
  onScreenshot?: () => void;
  onFullscreen?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onFitContent?: () => void;
  onSaveLayout?: () => void;
  activeIndicators?: IndicatorType[];
  className?: string;
}

const TIMEFRAMES: { value: ChartTimeframe; label: string }[] = [
  { value: '1m', label: '1m' },
  { value: '3m', label: '3m' },
  { value: '5m', label: '5m' },
  { value: '15m', label: '15m' },
  { value: '30m', label: '30m' },
  { value: '1h', label: '1H' },
  { value: '2h', label: '2H' },
  { value: '4h', label: '4H' },
  { value: '1D', label: '1D' },
  { value: '1W', label: '1W' },
  { value: '1M', label: '1M' },
];

const CHART_TYPES: { value: ChartType; label: string; icon: React.ReactNode }[] = [
  { value: 'candlestick', label: 'Candles', icon: <CandlestickChart className="h-4 w-4" /> },
  { value: 'heikin-ashi', label: 'Heikin Ashi', icon: <CandlestickChart className="h-4 w-4" /> },
  { value: 'bars', label: 'Bars', icon: <BarChart3 className="h-4 w-4" /> },
  { value: 'line', label: 'Line', icon: <LineChart className="h-4 w-4" /> },
  { value: 'area', label: 'Area', icon: <AreaChart className="h-4 w-4" /> },
  { value: 'baseline', label: 'Baseline', icon: <TrendingUp className="h-4 w-4" /> },
];

// Icon mapping for drawing tools
const getToolIcon = (iconName: string) => {
  const icons: Record<string, React.ReactNode> = {
    MousePointer2: <MousePointer2 className="h-4 w-4" />,
    Crosshair: <Crosshair className="h-4 w-4" />,
    TrendingUp: <TrendingUp className="h-4 w-4" />,
    Minus: <Minus className="h-4 w-4" />,
    SeparatorVertical: <SeparatorVertical className="h-4 w-4" />,
    ArrowUpRight: <ArrowUpRight className="h-4 w-4" />,
    MoveHorizontal: <MoveHorizontal className="h-4 w-4" />,
    GitBranchPlus: <GitBranchPlus className="h-4 w-4" />,
    Square: <Square className="h-4 w-4" />,
    Circle: <Circle className="h-4 w-4" />,
    Triangle: <Triangle className="h-4 w-4" />,
    Type: <Type className="h-4 w-4" />,
    ArrowUpDown: <ArrowUpDown className="h-4 w-4" />,
    Brush: <Pencil className="h-4 w-4" />,
    Eraser: <Eraser className="h-4 w-4" />,
  };
  return icons[iconName] || <Pencil className="h-4 w-4" />;
};

export function ChartToolbar({
  symbol,
  onSymbolChange,
  timeframe,
  onTimeframeChange,
  chartType,
  onChartTypeChange,
  activeTool,
  onToolChange,
  onAddIndicator,
  onScreenshot,
  onFullscreen,
  onZoomIn,
  onZoomOut,
  onFitContent,
  onSaveLayout,
  activeIndicators = [],
  className,
}: ChartToolbarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [indicatorSearch, setIndicatorSearch] = useState('');

  const lineTools = getToolsByCategory('line');
  const fibTools = getToolsByCategory('fibonacci');
  const shapeTools = getToolsByCategory('shape');
  const measureTools = getToolsByCategory('measure');

  const trendIndicators = getIndicatorsByCategory('trend');
  const oscillatorIndicators = getIndicatorsByCategory('oscillator');
  const volumeIndicators = getIndicatorsByCategory('volume');
  const volatilityIndicators = getIndicatorsByCategory('volatility');

  const filteredIndicators = indicatorSearch
    ? Object.values(INDICATOR_DEFINITIONS).filter(
        ind => 
          ind.name.toLowerCase().includes(indicatorSearch.toLowerCase()) ||
          ind.shortName.toLowerCase().includes(indicatorSearch.toLowerCase())
      )
    : [];

  return (
    <div className={cn(
      "flex items-center gap-1 px-2 py-1.5 bg-card/50 border-b border-border/50",
      className
    )}>
      {/* Symbol Search */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 px-3 font-bold text-base">
            {symbol}
            <ChevronDown className="ml-1 h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="start">
          <div className="flex items-center gap-2 mb-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search symbol..."
              className="h-8"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchQuery.trim()) {
                  onSymbolChange(searchQuery.toUpperCase().trim());
                  setSearchQuery('');
                }
              }}
            />
          </div>
          <div className="text-xs text-muted-foreground">
            Press Enter to search
          </div>
        </PopoverContent>
      </Popover>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Timeframe Selector */}
      <div className="flex items-center gap-0.5">
        {TIMEFRAMES.slice(0, 6).map((tf) => (
          <Button
            key={tf.value}
            variant={timeframe === tf.value ? "secondary" : "ghost"}
            size="sm"
            className={cn(
              "h-7 px-2 text-xs",
              timeframe === tf.value && "bg-primary/10 text-primary"
            )}
            onClick={() => onTimeframeChange(tf.value)}
          >
            {tf.label}
          </Button>
        ))}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2">
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {TIMEFRAMES.slice(6).map((tf) => (
              <DropdownMenuItem
                key={tf.value}
                onClick={() => onTimeframeChange(tf.value)}
              >
                {tf.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Chart Type */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 px-2 gap-1">
            {CHART_TYPES.find(ct => ct.value === chartType)?.icon}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {CHART_TYPES.map((ct) => (
            <DropdownMenuItem
              key={ct.value}
              onClick={() => onChartTypeChange(ct.value)}
              className="gap-2"
            >
              {ct.icon}
              {ct.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Drawing Tools */}
      <div className="flex items-center gap-0.5">
        <Button
          variant={activeTool === 'cursor' ? "secondary" : "ghost"}
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => onToolChange('cursor')}
          title="Cursor"
        >
          <MousePointer2 className="h-4 w-4" />
        </Button>
        <Button
          variant={activeTool === 'crosshair' ? "secondary" : "ghost"}
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => onToolChange('crosshair')}
          title="Crosshair"
        >
          <Crosshair className="h-4 w-4" />
        </Button>

        {/* Line Tools Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant={lineTools.some(t => t.type === activeTool) ? "secondary" : "ghost"}
              size="sm" 
              className="h-8 px-2 gap-1"
            >
              <TrendingUp className="h-4 w-4" />
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Line Tools</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {lineTools.map((tool) => (
              <DropdownMenuItem
                key={tool.type}
                onClick={() => onToolChange(tool.type)}
                className="gap-2"
              >
                {getToolIcon(tool.icon)}
                {tool.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Fibonacci Tools Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant={fibTools.some(t => t.type === activeTool) ? "secondary" : "ghost"}
              size="sm" 
              className="h-8 px-2 gap-1"
            >
              <GitBranchPlus className="h-4 w-4" />
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Fibonacci</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {fibTools.map((tool) => (
              <DropdownMenuItem
                key={tool.type}
                onClick={() => onToolChange(tool.type)}
                className="gap-2"
              >
                {getToolIcon(tool.icon)}
                {tool.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Shape Tools Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant={shapeTools.some(t => t.type === activeTool) ? "secondary" : "ghost"}
              size="sm" 
              className="h-8 px-2 gap-1"
            >
              <Square className="h-4 w-4" />
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Shapes</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {shapeTools.map((tool) => (
              <DropdownMenuItem
                key={tool.type}
                onClick={() => onToolChange(tool.type)}
                className="gap-2"
              >
                {getToolIcon(tool.icon)}
                {tool.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant={activeTool === 'text' ? "secondary" : "ghost"}
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => onToolChange('text')}
          title="Text"
        >
          <Type className="h-4 w-4" />
        </Button>

        <Button
          variant={activeTool === 'eraser' ? "secondary" : "ghost"}
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => onToolChange('eraser')}
          title="Eraser"
        >
          <Eraser className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Indicators */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 px-3 gap-1">
            <Layers className="h-4 w-4" />
            Indicators
            {activeIndicators.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-primary/20 text-primary text-xs rounded">
                {activeIndicators.length}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <div className="p-3 border-b">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                value={indicatorSearch}
                onChange={(e) => setIndicatorSearch(e.target.value)}
                placeholder="Search indicators..."
                className="h-8"
              />
            </div>
          </div>
          
          <div className="max-h-80 overflow-y-auto">
            {indicatorSearch ? (
              <div className="p-2">
                {filteredIndicators.length > 0 ? (
                  filteredIndicators.map((ind) => (
                    <Button
                      key={ind.type}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start h-9 px-3"
                      onClick={() => {
                        onAddIndicator(ind.type);
                        setIndicatorSearch('');
                      }}
                    >
                      <span className="font-medium">{ind.shortName}</span>
                      <span className="ml-2 text-muted-foreground text-xs">{ind.name}</span>
                    </Button>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No indicators found
                  </p>
                )}
              </div>
            ) : (
              <>
                <div className="p-2">
                  <p className="text-xs font-medium text-muted-foreground mb-2 px-2">TREND</p>
                  {trendIndicators.map((ind) => (
                    <Button
                      key={ind.type}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start h-8 px-3"
                      onClick={() => onAddIndicator(ind.type)}
                    >
                      <span className="font-medium">{ind.shortName}</span>
                      <span className="ml-2 text-muted-foreground text-xs truncate">{ind.name}</span>
                    </Button>
                  ))}
                </div>
                <Separator />
                <div className="p-2">
                  <p className="text-xs font-medium text-muted-foreground mb-2 px-2">OSCILLATORS</p>
                  {oscillatorIndicators.map((ind) => (
                    <Button
                      key={ind.type}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start h-8 px-3"
                      onClick={() => onAddIndicator(ind.type)}
                    >
                      <span className="font-medium">{ind.shortName}</span>
                      <span className="ml-2 text-muted-foreground text-xs truncate">{ind.name}</span>
                    </Button>
                  ))}
                </div>
                <Separator />
                <div className="p-2">
                  <p className="text-xs font-medium text-muted-foreground mb-2 px-2">VOLUME</p>
                  {volumeIndicators.map((ind) => (
                    <Button
                      key={ind.type}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start h-8 px-3"
                      onClick={() => onAddIndicator(ind.type)}
                    >
                      <span className="font-medium">{ind.shortName}</span>
                      <span className="ml-2 text-muted-foreground text-xs truncate">{ind.name}</span>
                    </Button>
                  ))}
                </div>
                <Separator />
                <div className="p-2">
                  <p className="text-xs font-medium text-muted-foreground mb-2 px-2">VOLATILITY</p>
                  {volatilityIndicators.map((ind) => (
                    <Button
                      key={ind.type}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start h-8 px-3"
                      onClick={() => onAddIndicator(ind.type)}
                    >
                      <span className="font-medium">{ind.shortName}</span>
                      <span className="ml-2 text-muted-foreground text-xs truncate">{ind.name}</span>
                    </Button>
                  ))}
                </div>
              </>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side controls */}
      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={onZoomOut}
          title="Zoom Out"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={onZoomIn}
          title="Zoom In"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={onFitContent}
          title="Fit Content"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6 mx-1" />

        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={onScreenshot}
          title="Screenshot"
        >
          <Camera className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={onSaveLayout}
          title="Save Layout"
        >
          <Save className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={onFullscreen}
          title="Fullscreen"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Settings"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
