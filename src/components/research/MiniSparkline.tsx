import { useMemo } from 'react';

import { cn } from '@/lib/utils';

interface MiniSparklineProps {
  data: number[];
  width?: number;
  height?: number;
  isPositive?: boolean;
  className?: string;
  showPriceScale?: boolean;
}

export function MiniSparkline({ 
  data, 
  width = 80, 
  height = 32, 
  isPositive = true,
  className = '',
  showPriceScale = false
}: MiniSparklineProps) {
  const priceScaleWidth = showPriceScale ? 52 : 0;
  const chartWidth = width - priceScaleWidth - 4; // Add right padding
  
  const { min, max, range } = useMemo(() => {
    if (!data || data.length < 2) return { min: 0, max: 0, range: 1 };
    const min = Math.min(...data);
    const max = Math.max(...data);
    return { min, max, range: max - min || 1 };
  }, [data]);

  // Use larger vertical padding to prevent price labels from clipping
  const verticalPadding = showPriceScale ? 10 : 2;
  const horizontalPadding = 4;

  const pathD = useMemo(() => {
    if (!data || data.length < 2) return '';
    
    const effectiveChartWidth = chartWidth - horizontalPadding * 2;
    const chartHeight = height - verticalPadding * 2;
    
    const points = data.map((value, i) => {
      const x = priceScaleWidth + horizontalPadding + (i / (data.length - 1)) * effectiveChartWidth;
      const y = verticalPadding + chartHeight - ((value - min) / range) * chartHeight;
      return `${x},${y}`;
    });
    
    return `M${points.join(' L')}`;
  }, [data, chartWidth, height, min, range, priceScaleWidth, verticalPadding, horizontalPadding]);

  const areaPathD = useMemo(() => {
    if (!data || data.length < 2) return '';
    
    const effectiveChartWidth = chartWidth - horizontalPadding * 2;
    const chartHeight = height - verticalPadding * 2;
    
    const points = data.map((value, i) => {
      const x = priceScaleWidth + horizontalPadding + (i / (data.length - 1)) * effectiveChartWidth;
      const y = verticalPadding + chartHeight - ((value - min) / range) * chartHeight;
      return `${x},${y}`;
    });
    
    const startX = priceScaleWidth + horizontalPadding;
    const endX = priceScaleWidth + horizontalPadding + effectiveChartWidth;
    
    return `M${startX},${height - verticalPadding} L${points.join(' L')} L${endX},${height - verticalPadding} Z`;
  }, [data, chartWidth, height, min, range, priceScaleWidth, verticalPadding, horizontalPadding]);

  const gradientId = useMemo(() => `sparkline-gradient-${Math.random().toString(36).substr(2, 9)}`, []);

  const formatPrice = (price: number) => {
    if (price >= 1000) return `$${(price / 1000).toFixed(1)}k`;
    if (price >= 100) return `$${price.toFixed(0)}`;
    if (price >= 10) return `$${price.toFixed(1)}`;
    return `$${price.toFixed(2)}`;
  };

  const priceTicks = useMemo(() => {
    if (!showPriceScale) return [];
    const ticks = [min, min + range / 2, max];
    const chartHeight = height - verticalPadding * 2;
    return ticks.map(price => ({
      price,
      y: verticalPadding + chartHeight - ((price - min) / range) * chartHeight
    }));
  }, [showPriceScale, min, max, range, height, verticalPadding]);

  if (!data || data.length < 2) {
    return <div className={`${className}`} style={{ width, height }} />;
  }

  const strokeColor = isPositive ? 'hsl(var(--chart-2))' : 'hsl(var(--destructive))';

  return (
    <svg 
      width={width} 
      height={height} 
      className={cn('block max-w-full', className)}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.3" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      
      {/* Price Scale */}
      {showPriceScale && priceTicks.map((tick, i) => (
        <g key={i}>
          <text
            x={priceScaleWidth - 6}
            y={tick.y + 3}
            fontSize="9"
            fill="hsl(var(--muted-foreground))"
            textAnchor="end"
          >
            {formatPrice(tick.price)}
          </text>
          <line
            x1={priceScaleWidth}
            y1={tick.y}
            x2={width - 2}
            y2={tick.y}
            stroke="hsl(var(--border))"
            strokeWidth="0.5"
            strokeDasharray="2,2"
            opacity="0.5"
          />
        </g>
      ))}
      
      <path
        d={areaPathD}
        fill={`url(#${gradientId})`}
      />
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
