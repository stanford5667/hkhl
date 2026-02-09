/**
 * Drawing Canvas Overlay
 * Handles drawing tools on top of the chart
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { DrawingObject, DrawingToolType, DrawingStyle } from '@/types/charting';
import { DRAWING_TOOL_DEFINITIONS } from '@/lib/charting/drawingTools';

const DEFAULT_DRAWING_STYLE: DrawingStyle = {
  color: '#2196F3',
  lineWidth: 2,
  lineStyle: 'solid',
};

interface DrawingCanvasProps {
  activeTool: DrawingToolType;
  drawings: DrawingObject[];
  onDrawingsChange: (drawings: DrawingObject[]) => void;
  priceToY: (price: number) => number;
  yToPrice: (y: number) => number;
  timeToX: (time: number) => number;
  xToTime: (x: number) => number;
  width: number;
  height: number;
  className?: string;
}

interface DrawingPoint {
  x: number;
  y: number;
  time: number;
  price: number;
}

export function DrawingCanvas({
  activeTool,
  drawings,
  onDrawingsChange,
  priceToY,
  yToPrice,
  timeToX,
  xToTime,
  width,
  height,
  className,
}: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<DrawingPoint[]>([]);
  const [selectedDrawing, setSelectedDrawing] = useState<string | null>(null);
  const [hoveredDrawing, setHoveredDrawing] = useState<string | null>(null);

  const toolConfig = DRAWING_TOOL_DEFINITIONS[activeTool];

  // Convert screen coordinates to chart coordinates
  const screenToChart = useCallback((e: React.MouseEvent | MouseEvent): DrawingPoint => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, time: 0, price: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    return {
      x,
      y,
      time: xToTime(x),
      price: yToPrice(y),
    };
  }, [xToTime, yToPrice]);

  // Start drawing
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (activeTool === 'cursor' || activeTool === 'crosshair') return;
    if (!toolConfig) return;

    const point = screenToChart(e);
    setIsDrawing(true);
    setCurrentPoints([point]);
  }, [activeTool, toolConfig, screenToChart]);

  // Continue drawing
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDrawing || currentPoints.length === 0) return;

    const point = screenToChart(e);
    
    // For most tools, we just need start and end points
    if (currentPoints.length === 1) {
      setCurrentPoints([currentPoints[0], point]);
    } else {
      setCurrentPoints([currentPoints[0], point]);
    }
  }, [isDrawing, currentPoints, screenToChart]);

  // Finish drawing
  const handleMouseUp = useCallback(() => {
    if (!isDrawing || currentPoints.length < 2) {
      setIsDrawing(false);
      setCurrentPoints([]);
      return;
    }

    // Create new drawing object
    const newDrawing: DrawingObject = {
      id: `drawing-${Date.now()}`,
      type: activeTool,
      points: currentPoints.map(p => ({ time: p.time, price: p.price })),
      style: { ...DEFAULT_DRAWING_STYLE },
      visible: true,
      locked: false,
    };

    onDrawingsChange([...drawings, newDrawing]);
    setIsDrawing(false);
    setCurrentPoints([]);
  }, [isDrawing, currentPoints, activeTool, drawings, onDrawingsChange]);

  // Draw on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw existing drawings
    drawings.forEach(drawing => {
      if (!drawing.visible) return;
      drawObject(ctx, drawing, drawing.id === hoveredDrawing || drawing.id === selectedDrawing);
    });

    // Draw current drawing in progress
    if (isDrawing && currentPoints.length >= 2) {
      const tempDrawing: DrawingObject = {
        id: 'temp',
        type: activeTool,
        points: currentPoints.map(p => ({ time: p.time, price: p.price })),
        style: { ...DEFAULT_DRAWING_STYLE },
        visible: true,
        locked: false,
      };
      drawObject(ctx, tempDrawing, true);
    }
  }, [drawings, currentPoints, isDrawing, activeTool, width, height, hoveredDrawing, selectedDrawing, timeToX, priceToY]);

  // Draw a single object
  const drawObject = useCallback((ctx: CanvasRenderingContext2D, drawing: DrawingObject, highlighted: boolean) => {
    const points = drawing.points.map(p => ({
      x: timeToX(p.time),
      y: priceToY(p.price),
    }));

    if (points.length < 2) return;

    ctx.strokeStyle = highlighted ? '#fff' : drawing.style.color;
    ctx.lineWidth = drawing.style.lineWidth * (highlighted ? 1.5 : 1);
    ctx.setLineDash(
      drawing.style.lineStyle === 'dashed' ? [5, 5] :
      drawing.style.lineStyle === 'dotted' ? [2, 2] : []
    );

    switch (drawing.type) {
      case 'trendline':
      case 'ray':
      case 'extended-line':
        drawTrendline(ctx, points, drawing.type, width);
        break;

      case 'horizontal-line':
        ctx.beginPath();
        ctx.moveTo(0, points[0].y);
        ctx.lineTo(width, points[0].y);
        ctx.stroke();
        
        // Price label
        ctx.fillStyle = drawing.style.color;
        ctx.font = '10px Inter';
        ctx.fillText(drawing.points[0].price.toFixed(2), width - 50, points[0].y - 5);
        break;

      case 'vertical-line':
        ctx.beginPath();
        ctx.moveTo(points[0].x, 0);
        ctx.lineTo(points[0].x, height);
        ctx.stroke();
        break;

      case 'rectangle':
        const rectWidth = points[1].x - points[0].x;
        const rectHeight = points[1].y - points[0].y;
        
        if (drawing.style.fillColor) {
          ctx.fillStyle = drawing.style.fillColor + (drawing.style.fillOpacity !== undefined ? 
            Math.round(drawing.style.fillOpacity * 255).toString(16).padStart(2, '0') : '40');
          ctx.fillRect(points[0].x, points[0].y, rectWidth, rectHeight);
        }
        ctx.strokeRect(points[0].x, points[0].y, rectWidth, rectHeight);
        break;

      case 'fib-retracement':
        drawFibonacci(ctx, points, width, drawing.style);
        break;

      case 'parallel-channel':
        drawParallelChannel(ctx, points, drawing.style);
        break;

      default:
        // Simple line for other tools
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        ctx.lineTo(points[1].x, points[1].y);
        ctx.stroke();
    }

    ctx.setLineDash([]);

    // Draw control points for selected drawings
    if (highlighted) {
      points.forEach(p => {
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = drawing.style.color;
        ctx.lineWidth = 1;
        ctx.stroke();
      });
    }
  }, [timeToX, priceToY, width, height]);

  // Draw trendline with extensions
  function drawTrendline(
    ctx: CanvasRenderingContext2D, 
    points: { x: number; y: number }[], 
    type: DrawingToolType,
    canvasWidth: number
  ) {
    const [p1, p2] = points;
    
    if (type === 'trendline') {
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    } else {
      // Calculate slope
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      
      if (dx === 0) {
        // Vertical line
        ctx.beginPath();
        ctx.moveTo(p1.x, 0);
        ctx.lineTo(p1.x, height);
        ctx.stroke();
      } else {
        const slope = dy / dx;
        
        if (type === 'ray') {
          // Extend only to the right
          const endX = canvasWidth;
          const endY = p1.y + slope * (endX - p1.x);
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(endX, endY);
          ctx.stroke();
        } else {
          // Extended line (both directions)
          const startX = 0;
          const startY = p1.y + slope * (startX - p1.x);
          const endX = canvasWidth;
          const endY = p1.y + slope * (endX - p1.x);
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.stroke();
        }
      }
    }
  }

  // Draw Fibonacci retracement
  function drawFibonacci(
    ctx: CanvasRenderingContext2D,
    points: { x: number; y: number }[],
    canvasWidth: number,
    style: DrawingStyle
  ) {
    const [p1, p2] = points;
    const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
    const priceRange = p2.y - p1.y;

    levels.forEach((level, i) => {
      const y = p1.y + priceRange * level;
      const alpha = level === 0 || level === 1 ? 0.8 : 0.5;
      
      ctx.strokeStyle = style.color + Math.round(alpha * 255).toString(16).padStart(2, '0');
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvasWidth, y);
      ctx.stroke();

      // Level label
      ctx.fillStyle = style.color;
      ctx.font = '10px Inter';
      ctx.fillText(`${(level * 100).toFixed(1)}%`, 5, y - 3);
    });
  }

  // Draw parallel channel
  function drawParallelChannel(
    ctx: CanvasRenderingContext2D,
    points: { x: number; y: number }[],
    style: DrawingStyle
  ) {
    if (points.length < 2) return;
    const [p1, p2] = points;
    
    // Calculate perpendicular offset (simplified - uses fixed offset)
    const offset = 50;
    
    // Draw main line
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();

    // Draw parallel lines
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y - offset);
    ctx.lineTo(p2.x, p2.y - offset);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y + offset);
    ctx.lineTo(p2.x, p2.y + offset);
    ctx.stroke();

    // Fill area
    if (style.fillColor) {
      ctx.fillStyle = style.fillColor + '20';
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y - offset);
      ctx.lineTo(p2.x, p2.y - offset);
      ctx.lineTo(p2.x, p2.y + offset);
      ctx.lineTo(p1.x, p1.y + offset);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Cursor style based on tool
  const cursorStyle = activeTool === 'cursor' ? 'default' : 
                      activeTool === 'crosshair' ? 'crosshair' : 
                      'crosshair';

  return (
    <canvas
      ref={canvasRef}
      className={cn("absolute inset-0 z-10", className)}
      style={{ cursor: cursorStyle }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    />
  );
}
