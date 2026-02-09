/**
 * Advanced Charting Types
 * TradingView-style chart configuration and state
 */

// Chart Types
export type ChartType = 
  | 'candlestick'
  | 'heikin-ashi'
  | 'ohlc'
  | 'line'
  | 'area'
  | 'baseline'
  | 'bars';

// Timeframe definitions
export type ChartTimeframe = 
  | '1m' | '3m' | '5m' | '15m' | '30m'  // Minutes
  | '1h' | '2h' | '4h'                   // Hours
  | '1D' | '1W' | '1M' | '3M' | '1Y';   // Days/Weeks/Months/Years

export interface TimeframeConfig {
  label: string;
  value: ChartTimeframe;
  resolution: string;
  barCount: number;
}

// OHLCV Data Structure
export interface OHLCVData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Drawing Tool Types
export type DrawingToolType =
  | 'cursor'
  | 'crosshair'
  | 'trendline'
  | 'horizontal-line'
  | 'vertical-line'
  | 'ray'
  | 'extended-line'
  | 'parallel-channel'
  | 'fib-retracement'
  | 'fib-extension'
  | 'fib-fan'
  | 'rectangle'
  | 'ellipse'
  | 'triangle'
  | 'arrow'
  | 'text'
  | 'price-range'
  | 'date-range'
  | 'brush'
  | 'eraser';

export interface DrawingObject {
  id: string;
  type: DrawingToolType;
  points: { time: number; price: number }[];
  style: DrawingStyle;
  visible: boolean;
  locked: boolean;
  label?: string;
}

export interface DrawingStyle {
  color: string;
  lineWidth: number;
  lineStyle: 'solid' | 'dashed' | 'dotted';
  fillColor?: string;
  fillOpacity?: number;
  fontSize?: number;
  fontFamily?: string;
}

// Indicator Types
export type IndicatorType =
  // Trend
  | 'sma' | 'ema' | 'wma' | 'hma' | 'vwma' | 'dema' | 'tema'
  // Oscillators
  | 'rsi' | 'macd' | 'stochastic' | 'williams-r' | 'cci' | 'momentum' | 'roc'
  // Volume
  | 'volume' | 'vwap' | 'obv' | 'mfi' | 'cmf' | 'adl'
  // Volatility
  | 'bollinger-bands' | 'atr' | 'keltner-channels' | 'donchian-channels' | 'std-dev'
  // Other
  | 'ichimoku' | 'pivot-points' | 'zigzag' | 'supertrend';

export interface IndicatorConfig {
  id: string;
  type: IndicatorType;
  name: string;
  params: Record<string, number | string | boolean>;
  style: {
    colors: string[];
    lineWidth: number;
    visible: boolean;
  };
  overlay: boolean; // true = on price chart, false = separate pane
}

export interface IndicatorDefinition {
  type: IndicatorType;
  name: string;
  shortName: string;
  description: string;
  category: 'trend' | 'oscillator' | 'volume' | 'volatility' | 'other';
  overlay: boolean;
  defaultParams: Record<string, number | string | boolean>;
  paramLabels: Record<string, string>;
  defaultColors: string[];
}

// Chart State
export interface ChartState {
  symbol: string;
  timeframe: ChartTimeframe;
  chartType: ChartType;
  indicators: IndicatorConfig[];
  drawings: DrawingObject[];
  priceScale: 'linear' | 'logarithmic' | 'percentage';
  showVolume: boolean;
  showGrid: boolean;
  crosshairMode: 'normal' | 'magnet';
}

// Multi-chart Layout
export type ChartLayoutType = '1x1' | '1x2' | '2x1' | '2x2' | '1x3' | '3x1' | '2x3' | '3x2' | '4x2';

export interface ChartPanelState extends ChartState {
  panelId: string;
  linkedGroup?: string; // For synchronized crosshair
}

export interface WorkspaceState {
  id: string;
  name: string;
  layout: ChartLayoutType;
  panels: ChartPanelState[];
  activePanel: string;
  createdAt: string;
  updatedAt: string;
}

// Alert Configuration
export interface ChartAlert {
  id: string;
  symbol: string;
  type: 'price-above' | 'price-below' | 'price-cross' | 'indicator';
  condition: {
    value?: number;
    indicator?: IndicatorType;
    indicatorParams?: Record<string, number>;
    threshold?: number;
    comparison?: 'above' | 'below' | 'crosses-above' | 'crosses-below';
  };
  active: boolean;
  triggered: boolean;
  triggeredAt?: string;
  notification: {
    sound: boolean;
    push: boolean;
    email: boolean;
  };
  message?: string;
}

// Price formatting
export interface PriceFormatConfig {
  precision: number;
  minMove: number;
  currency: string;
}

// Chart Events
export interface ChartCrosshairData {
  time: number;
  price: number;
  ohlcv?: OHLCVData;
  indicatorValues?: Record<string, number | number[]>;
}

// Saved Templates
export interface ChartTemplate {
  id: string;
  name: string;
  chartType: ChartType;
  indicators: IndicatorConfig[];
  drawings: DrawingObject[];
  style: {
    upColor: string;
    downColor: string;
    backgroundColor: string;
    gridColor: string;
    textColor: string;
  };
}
