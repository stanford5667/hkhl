/**
 * Connection Line Component
 * 
 * SVG bezier curve connecting two blocks.
 */

import { memo } from 'react';

interface ConnectionLineProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  isActive?: boolean;
}

export const ConnectionLine = memo(function ConnectionLine({
  x1,
  y1,
  x2,
  y2,
  isActive = false,
}: ConnectionLineProps) {
  // Calculate control points for bezier curve
  const dx = x2 - x1;
  const controlOffset = Math.min(Math.abs(dx) * 0.5, 80);
  
  const cx1 = x1 + controlOffset;
  const cy1 = y1;
  const cx2 = x2 - controlOffset;
  const cy2 = y2;

  const pathD = `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;

  return (
    <g>
      {/* Shadow/glow effect */}
      <path
        d={pathD}
        fill="none"
        stroke={isActive ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"}
        strokeWidth={isActive ? 4 : 3}
        strokeOpacity={0.2}
        strokeLinecap="round"
      />
      {/* Main line */}
      <path
        d={pathD}
        fill="none"
        stroke={isActive ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"}
        strokeWidth={2}
        strokeLinecap="round"
        strokeDasharray={isActive ? "5,5" : "none"}
        className={isActive ? "animate-pulse" : ""}
      />
      {/* Arrow head at end */}
      {!isActive && (
        <circle
          cx={x2}
          cy={y2}
          r={4}
          fill="hsl(var(--muted-foreground))"
        />
      )}
    </g>
  );
});
