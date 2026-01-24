import { useMemo } from 'react';

interface MiniSparklineProps {
  data: number[];
  width?: number;
  height?: number;
  isPositive?: boolean;
  className?: string;
}

export function MiniSparkline({ 
  data, 
  width = 80, 
  height = 32, 
  isPositive = true,
  className = ''
}: MiniSparklineProps) {
  const pathD = useMemo(() => {
    if (!data || data.length < 2) return '';
    
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    
    const padding = 2;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    const points = data.map((value, i) => {
      const x = padding + (i / (data.length - 1)) * chartWidth;
      const y = padding + chartHeight - ((value - min) / range) * chartHeight;
      return `${x},${y}`;
    });
    
    return `M${points.join(' L')}`;
  }, [data, width, height]);

  const gradientId = useMemo(() => `sparkline-gradient-${Math.random().toString(36).substr(2, 9)}`, []);
  const areaPathD = useMemo(() => {
    if (!data || data.length < 2) return '';
    
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    
    const padding = 2;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    const points = data.map((value, i) => {
      const x = padding + (i / (data.length - 1)) * chartWidth;
      const y = padding + chartHeight - ((value - min) / range) * chartHeight;
      return `${x},${y}`;
    });
    
    return `M${padding},${height - padding} L${points.join(' L')} L${width - padding},${height - padding} Z`;
  }, [data, width, height]);

  if (!data || data.length < 2) {
    return <div className={`${className}`} style={{ width, height }} />;
  }

  const strokeColor = isPositive ? 'rgb(16, 185, 129)' : 'rgb(239, 68, 68)';
  const fillColor = isPositive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';

  return (
    <svg 
      width={width} 
      height={height} 
      className={className}
      viewBox={`0 0 ${width} ${height}`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={isPositive ? 'rgb(16, 185, 129)' : 'rgb(239, 68, 68)'} stopOpacity="0.3" />
          <stop offset="100%" stopColor={isPositive ? 'rgb(16, 185, 129)' : 'rgb(239, 68, 68)'} stopOpacity="0" />
        </linearGradient>
      </defs>
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
