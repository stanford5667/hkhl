import { useMemo } from 'react';

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
  const priceScaleWidth = showPriceScale ? 45 : 0;
  const chartWidth = width - priceScaleWidth;
  
  const { min, max, range } = useMemo(() => {
    if (!data || data.length < 2) return { min: 0, max: 0, range: 1 };
    const min = Math.min(...data);
    const max = Math.max(...data);
    return { min, max, range: max - min || 1 };
  }, [data]);

  const pathD = useMemo(() => {
    if (!data || data.length < 2) return '';
    
    const padding = 2;
    const effectiveChartWidth = chartWidth - padding * 2;
    const chartHeight = height - padding * 2;
    
    const points = data.map((value, i) => {
      const x = priceScaleWidth + padding + (i / (data.length - 1)) * effectiveChartWidth;
      const y = padding + chartHeight - ((value - min) / range) * chartHeight;
      return `${x},${y}`;
    });
    
    return `M${points.join(' L')}`;
  }, [data, chartWidth, height, min, range, priceScaleWidth]);

  const areaPathD = useMemo(() => {
    if (!data || data.length < 2) return '';
    
    const padding = 2;
    const effectiveChartWidth = chartWidth - padding * 2;
    const chartHeight = height - padding * 2;
    
    const points = data.map((value, i) => {
      const x = priceScaleWidth + padding + (i / (data.length - 1)) * effectiveChartWidth;
      const y = padding + chartHeight - ((value - min) / range) * chartHeight;
      return `${x},${y}`;
    });
    
    const startX = priceScaleWidth + padding;
    const endX = priceScaleWidth + padding + effectiveChartWidth;
    
    return `M${startX},${height - padding} L${points.join(' L')} L${endX},${height - padding} Z`;
  }, [data, chartWidth, height, min, range, priceScaleWidth]);

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
    return ticks.map(price => ({
      price,
      y: 2 + (height - 4) - ((price - min) / range) * (height - 4)
    }));
  }, [showPriceScale, min, max, range, height]);

  if (!data || data.length < 2) {
    return <div className={`${className}`} style={{ width, height }} />;
  }

  const strokeColor = isPositive ? 'hsl(var(--chart-2))' : 'hsl(var(--destructive))';

  return (
    <svg 
      width={width} 
      height={height} 
      className={className}
      viewBox={`0 0 ${width} ${height}`}
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
            x={priceScaleWidth - 4}
            y={tick.y + 3}
            fontSize="8"
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
