/**
 * Drawing Tools Library
 * Definitions and utilities for chart drawing tools
 */

import { DrawingToolType, DrawingStyle, DrawingObject } from '@/types/charting';

// Drawing Tool Definitions
export interface DrawingToolDefinition {
  type: DrawingToolType;
  name: string;
  icon: string; // Lucide icon name
  category: 'cursor' | 'line' | 'fibonacci' | 'shape' | 'text' | 'measure';
  pointsRequired: number; // -1 for unlimited
  description: string;
  defaultStyle: DrawingStyle;
}

export const DRAWING_TOOL_DEFINITIONS: Record<DrawingToolType, DrawingToolDefinition> = {
  cursor: {
    type: 'cursor',
    name: 'Cursor',
    icon: 'MousePointer2',
    category: 'cursor',
    pointsRequired: 0,
    description: 'Select and manipulate objects',
    defaultStyle: { color: '#ffffff', lineWidth: 1, lineStyle: 'solid' },
  },
  crosshair: {
    type: 'crosshair',
    name: 'Crosshair',
    icon: 'Crosshair',
    category: 'cursor',
    pointsRequired: 0,
    description: 'Show price and time at cursor position',
    defaultStyle: { color: '#ffffff', lineWidth: 1, lineStyle: 'solid' },
  },
  trendline: {
    type: 'trendline',
    name: 'Trend Line',
    icon: 'TrendingUp',
    category: 'line',
    pointsRequired: 2,
    description: 'Draw a line between two points',
    defaultStyle: { color: '#2196F3', lineWidth: 2, lineStyle: 'solid' },
  },
  'horizontal-line': {
    type: 'horizontal-line',
    name: 'Horizontal Line',
    icon: 'Minus',
    category: 'line',
    pointsRequired: 1,
    description: 'Draw a horizontal line at a price level',
    defaultStyle: { color: '#FF9800', lineWidth: 1, lineStyle: 'dashed' },
  },
  'vertical-line': {
    type: 'vertical-line',
    name: 'Vertical Line',
    icon: 'SeparatorVertical',
    category: 'line',
    pointsRequired: 1,
    description: 'Draw a vertical line at a time',
    defaultStyle: { color: '#9C27B0', lineWidth: 1, lineStyle: 'dashed' },
  },
  ray: {
    type: 'ray',
    name: 'Ray',
    icon: 'ArrowUpRight',
    category: 'line',
    pointsRequired: 2,
    description: 'Draw a ray extending from a point',
    defaultStyle: { color: '#4CAF50', lineWidth: 2, lineStyle: 'solid' },
  },
  'extended-line': {
    type: 'extended-line',
    name: 'Extended Line',
    icon: 'MoveHorizontal',
    category: 'line',
    pointsRequired: 2,
    description: 'Draw a line extending in both directions',
    defaultStyle: { color: '#00BCD4', lineWidth: 2, lineStyle: 'solid' },
  },
  'parallel-channel': {
    type: 'parallel-channel',
    name: 'Parallel Channel',
    icon: 'AlignHorizontalDistributeCenter',
    category: 'line',
    pointsRequired: 3,
    description: 'Draw parallel trend lines',
    defaultStyle: { color: '#E91E63', lineWidth: 2, lineStyle: 'solid', fillColor: '#E91E63', fillOpacity: 0.1 },
  },
  'fib-retracement': {
    type: 'fib-retracement',
    name: 'Fibonacci Retracement',
    icon: 'GitBranchPlus',
    category: 'fibonacci',
    pointsRequired: 2,
    description: 'Draw Fibonacci retracement levels',
    defaultStyle: { color: '#FFD700', lineWidth: 1, lineStyle: 'solid' },
  },
  'fib-extension': {
    type: 'fib-extension',
    name: 'Fibonacci Extension',
    icon: 'GitFork',
    category: 'fibonacci',
    pointsRequired: 3,
    description: 'Draw Fibonacci extension levels',
    defaultStyle: { color: '#FFD700', lineWidth: 1, lineStyle: 'solid' },
  },
  'fib-fan': {
    type: 'fib-fan',
    name: 'Fibonacci Fan',
    icon: 'Fan',
    category: 'fibonacci',
    pointsRequired: 2,
    description: 'Draw Fibonacci fan lines',
    defaultStyle: { color: '#FFD700', lineWidth: 1, lineStyle: 'solid' },
  },
  rectangle: {
    type: 'rectangle',
    name: 'Rectangle',
    icon: 'Square',
    category: 'shape',
    pointsRequired: 2,
    description: 'Draw a rectangle (support/resistance zone)',
    defaultStyle: { color: '#2196F3', lineWidth: 1, lineStyle: 'solid', fillColor: '#2196F3', fillOpacity: 0.2 },
  },
  ellipse: {
    type: 'ellipse',
    name: 'Ellipse',
    icon: 'Circle',
    category: 'shape',
    pointsRequired: 2,
    description: 'Draw an ellipse',
    defaultStyle: { color: '#9C27B0', lineWidth: 1, lineStyle: 'solid', fillColor: '#9C27B0', fillOpacity: 0.2 },
  },
  triangle: {
    type: 'triangle',
    name: 'Triangle',
    icon: 'Triangle',
    category: 'shape',
    pointsRequired: 3,
    description: 'Draw a triangle',
    defaultStyle: { color: '#FF5722', lineWidth: 1, lineStyle: 'solid', fillColor: '#FF5722', fillOpacity: 0.2 },
  },
  arrow: {
    type: 'arrow',
    name: 'Arrow',
    icon: 'ArrowUp',
    category: 'shape',
    pointsRequired: 1,
    description: 'Place an arrow marker',
    defaultStyle: { color: '#4CAF50', lineWidth: 2, lineStyle: 'solid' },
  },
  text: {
    type: 'text',
    name: 'Text',
    icon: 'Type',
    category: 'text',
    pointsRequired: 1,
    description: 'Add text annotation',
    defaultStyle: { color: '#ffffff', lineWidth: 1, lineStyle: 'solid', fontSize: 14, fontFamily: 'Inter' },
  },
  'price-range': {
    type: 'price-range',
    name: 'Price Range',
    icon: 'ArrowUpDown',
    category: 'measure',
    pointsRequired: 2,
    description: 'Measure price change between two points',
    defaultStyle: { color: '#00BCD4', lineWidth: 1, lineStyle: 'dashed', fillColor: '#00BCD4', fillOpacity: 0.1 },
  },
  'date-range': {
    type: 'date-range',
    name: 'Date Range',
    icon: 'CalendarRange',
    category: 'measure',
    pointsRequired: 2,
    description: 'Measure time between two points',
    defaultStyle: { color: '#FF9800', lineWidth: 1, lineStyle: 'dashed', fillColor: '#FF9800', fillOpacity: 0.1 },
  },
  brush: {
    type: 'brush',
    name: 'Brush',
    icon: 'Brush',
    category: 'shape',
    pointsRequired: -1,
    description: 'Freehand drawing',
    defaultStyle: { color: '#E91E63', lineWidth: 2, lineStyle: 'solid' },
  },
  eraser: {
    type: 'eraser',
    name: 'Eraser',
    icon: 'Eraser',
    category: 'cursor',
    pointsRequired: 0,
    description: 'Remove drawings',
    defaultStyle: { color: '#ffffff', lineWidth: 1, lineStyle: 'solid' },
  },
};

// Fibonacci Levels
export const FIBONACCI_RETRACEMENT_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
export const FIBONACCI_EXTENSION_LEVELS = [0, 0.618, 1, 1.382, 1.618, 2, 2.618];

/**
 * Create a new drawing object
 */
export function createDrawingObject(
  type: DrawingToolType,
  points: { time: number; price: number }[],
  style?: Partial<DrawingStyle>,
  label?: string
): DrawingObject {
  const definition = DRAWING_TOOL_DEFINITIONS[type];
  return {
    id: generateDrawingId(),
    type,
    points,
    style: { ...definition.defaultStyle, ...style },
    visible: true,
    locked: false,
    label,
  };
}

/**
 * Generate unique drawing ID
 */
function generateDrawingId(): string {
  return `drawing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get tools by category
 */
export function getToolsByCategory(category: DrawingToolDefinition['category']): DrawingToolDefinition[] {
  return Object.values(DRAWING_TOOL_DEFINITIONS).filter(tool => tool.category === category);
}

/**
 * Calculate Fibonacci levels between two points
 */
export function calculateFibonacciLevels(
  startPrice: number,
  endPrice: number,
  levels: number[] = FIBONACCI_RETRACEMENT_LEVELS
): { level: number; price: number }[] {
  const diff = endPrice - startPrice;
  return levels.map(level => ({
    level,
    price: endPrice - diff * level,
  }));
}

/**
 * Calculate price change for measurement tools
 */
export function calculatePriceChange(
  startPrice: number,
  endPrice: number
): { change: number; changePercent: number; direction: 'up' | 'down' } {
  const change = endPrice - startPrice;
  const changePercent = (change / startPrice) * 100;
  return {
    change,
    changePercent,
    direction: change >= 0 ? 'up' : 'down',
  };
}

/**
 * Default colors for drawing tools
 */
export const DRAWING_COLORS = [
  '#2196F3', // Blue
  '#4CAF50', // Green
  '#FF9800', // Orange
  '#E91E63', // Pink
  '#9C27B0', // Purple
  '#00BCD4', // Cyan
  '#FF5722', // Deep Orange
  '#607D8B', // Blue Grey
  '#FFD700', // Gold
  '#ffffff', // White
];

/**
 * Line styles available
 */
export const LINE_STYLES: { value: DrawingStyle['lineStyle']; label: string }[] = [
  { value: 'solid', label: 'Solid' },
  { value: 'dashed', label: 'Dashed' },
  { value: 'dotted', label: 'Dotted' },
];

/**
 * Line widths available
 */
export const LINE_WIDTHS = [1, 2, 3, 4, 5];
