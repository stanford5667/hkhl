/**
 * Indicator Pane Component
 * Renders a separate pane for non-overlay indicators (RSI, MACD, etc.)
 */

import { useEffect, useRef, useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { IndicatorConfig, OHLCVData } from '@/types/charting';
import { INDICATOR_DEFINITIONS, calculateRSI, calculateMACD } from '@/lib/charting/indicators';
import { X, Settings, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface IndicatorPaneProps {
  indicator: IndicatorConfig;
  data: OHLCVData[];
  height?: number;
  onRemove?: () => void;
  onSettingsClick?: () => void;
}

export function IndicatorPane({
  indicator,
  data,
  height = 120,
  onRemove,
  onSettingsClick,
}: IndicatorPaneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const definition = INDICATOR_DEFINITIONS[indicator.type];

  // Calculate indicator values
  const indicatorData = useMemo(() => {
    if (!data.length) return null;

    const closes = data.map(d => d.close);

    switch (indicator.type) {
      case 'rsi': {
        const length = (indicator.params.length as number) || 14;
        const values = calculateRSI(closes, length);
        return {
          type: 'line',
          series: [{ values, color: indicator.style.colors[0] || '#7C4DFF', label: 'RSI' }],
          levels: [
            { value: (indicator.params.overbought as number) || 70, color: '#ef4444', label: 'Overbought' },
            { value: (indicator.params.oversold as number) || 30, color: '#22c55e', label: 'Oversold' },
          ],
          range: { min: 0, max: 100 },
        };
      }
      case 'macd': {
        const fast = (indicator.params.fast as number) || 12;
        const slow = (indicator.params.slow as number) || 26;
        const signal = (indicator.params.signal as number) || 9;
        const { macd, signal: signalLine, histogram } = calculateMACD(closes, fast, slow, signal);
        
        const allValues = [...macd, ...signalLine, ...histogram].filter((v): v is number => v !== null);
        const min = Math.min(...allValues);
        const max = Math.max(...allValues);
        const padding = (max - min) * 0.1;

        return {
          type: 'macd',
          series: [
            { values: macd, color: indicator.style.colors[0] || '#2196F3', label: 'MACD' },
            { values: signalLine, color: indicator.style.colors[1] || '#FF9800', label: 'Signal' },
          ],
          histogram: { values: histogram, upColor: '#22c55e', downColor: '#ef4444' },
          range: { min: min - padding, max: max + padding },
        };
      }
      default:
        return null;
    }
  }, [data, indicator]);

  // Draw indicator
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !indicatorData || !isVisible) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = container.clientWidth;
    const actualHeight = height - 24; // Account for header

    canvas.width = width * dpr;
    canvas.height = actualHeight * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${actualHeight}px`;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, width, actualHeight);

    const { range, levels, series, histogram } = indicatorData;
    const padding = { top: 10, bottom: 10, left: 50, right: 10 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = actualHeight - padding.top - padding.bottom;

    // Draw grid lines and levels
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    
    // Horizontal grid lines
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }

    // Draw level lines (e.g., overbought/oversold for RSI)
    if (levels) {
      levels.forEach(level => {
        const y = padding.top + chartHeight - ((level.value - range.min) / (range.max - range.min)) * chartHeight;
        ctx.strokeStyle = level.color + '40';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Label
        ctx.fillStyle = level.color;
        ctx.font = '10px Inter';
        ctx.textAlign = 'left';
        ctx.fillText(level.value.toString(), 5, y + 3);
      });
    }

    // Draw histogram (for MACD)
    if (histogram) {
      const barWidth = Math.max(1, chartWidth / histogram.values.length - 1);
      histogram.values.forEach((value, i) => {
        if (value === null) return;
        const x = padding.left + (i / histogram.values.length) * chartWidth;
        const zeroY = padding.top + chartHeight - ((0 - range.min) / (range.max - range.min)) * chartHeight;
        const valueY = padding.top + chartHeight - ((value - range.min) / (range.max - range.min)) * chartHeight;
        
        ctx.fillStyle = value >= 0 ? histogram.upColor + '80' : histogram.downColor + '80';
        ctx.fillRect(x, Math.min(zeroY, valueY), barWidth, Math.abs(valueY - zeroY));
      });
    }

    // Draw series lines
    series.forEach(s => {
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      let started = false;

      s.values.forEach((value, i) => {
        if (value === null) return;
        const x = padding.left + (i / s.values.length) * chartWidth;
        const y = padding.top + chartHeight - ((value - range.min) / (range.max - range.min)) * chartHeight;

        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
    });

    // Draw Y-axis labels
    ctx.fillStyle = '#9ca3af';
    ctx.font = '10px Inter';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const value = range.max - ((range.max - range.min) / 4) * i;
      const y = padding.top + (chartHeight / 4) * i;
      ctx.fillText(value.toFixed(1), padding.left - 5, y + 3);
    }

  }, [indicatorData, isVisible, height, hoveredIndex]);

  // Handle resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      // Trigger redraw
      const canvas = canvasRef.current;
      if (canvas) canvas.dispatchEvent(new Event('resize'));
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  if (!definition) return null;

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative border-t border-border/50 bg-card/30",
        !isVisible && "h-6"
      )}
      style={{ height: isVisible ? height : 24 }}
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 h-6 flex items-center justify-between px-2 bg-card/50 z-10">
        <div className="flex items-center gap-2">
          <span 
            className="text-xs font-medium"
            style={{ color: indicator.style.colors[0] }}
          >
            {definition.shortName}
          </span>
          <span className="text-xs text-muted-foreground">
            {Object.values(indicator.params).filter(v => typeof v === 'number').join(', ')}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4"
            onClick={() => setIsVisible(!isVisible)}
          >
            {isVisible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4"
            onClick={onSettingsClick}
          >
            <Settings className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4 text-muted-foreground hover:text-destructive"
            onClick={onRemove}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Canvas */}
      {isVisible && (
        <canvas 
          ref={canvasRef}
          className="absolute top-6 left-0 right-0 bottom-0"
        />
      )}
    </div>
  );
}
