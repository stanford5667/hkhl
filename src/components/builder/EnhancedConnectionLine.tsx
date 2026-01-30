/**
 * Enhanced Connection Line Component
 * 
 * SVG bezier curve with animated flow effect, hover states,
 * and click-to-delete functionality.
 */

import { memo, useState } from 'react';
import { cn } from '@/lib/utils';

interface EnhancedConnectionLineProps {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  isActive?: boolean;
  isSelected?: boolean;
  onDelete?: (id: string) => void;
}

export const EnhancedConnectionLine = memo(function EnhancedConnectionLine({
  id,
  x1,
  y1,
  x2,
  y2,
  isActive = false,
  isSelected = false,
  onDelete,
}: EnhancedConnectionLineProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Calculate control points for smooth bezier curve
  const dx = x2 - x1;
  const dy = y2 - y1;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const controlOffset = Math.min(Math.abs(dx) * 0.6, 100, distance * 0.4);
  
  const cx1 = x1 + controlOffset;
  const cy1 = y1;
  const cx2 = x2 - controlOffset;
  const cy2 = y2;

  const pathD = `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;

  // Calculate midpoint for delete button
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete && !isActive) {
      onDelete(id);
    }
  };

  return (
    <g 
      className={cn(
        "transition-all duration-200",
        !isActive && "cursor-pointer"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      {/* Invisible wider path for easier clicking */}
      {!isActive && (
        <path
          d={pathD}
          fill="none"
          stroke="transparent"
          strokeWidth={20}
          className="cursor-pointer"
        />
      )}

      {/* Glow/shadow effect */}
      <path
        d={pathD}
        fill="none"
        stroke={
          isActive 
            ? "hsl(var(--primary))" 
            : isHovered 
              ? "hsl(var(--destructive))" 
              : "hsl(var(--primary))"
        }
        strokeWidth={isHovered ? 8 : 6}
        strokeOpacity={0.15}
        strokeLinecap="round"
        className="transition-all duration-200"
      />

      {/* Main connection line */}
      <path
        d={pathD}
        fill="none"
        stroke={
          isActive 
            ? "hsl(var(--primary))" 
            : isHovered 
              ? "hsl(var(--destructive))" 
              : "hsl(var(--primary))"
        }
        strokeWidth={isHovered ? 3 : 2}
        strokeLinecap="round"
        strokeDasharray={isActive ? "8,4" : "none"}
        className={cn(
          "transition-all duration-200",
          isActive && "animate-flow"
        )}
      />

      {/* Animated flow dots for active connections */}
      {isActive && (
        <>
          <circle r={4} fill="hsl(var(--primary))">
            <animateMotion dur="1s" repeatCount="indefinite" path={pathD} />
          </circle>
        </>
      )}

      {/* Arrow head at destination */}
      {!isActive && (
        <circle
          cx={x2}
          cy={y2}
          r={isHovered ? 6 : 5}
          fill={isHovered ? "hsl(var(--destructive))" : "hsl(var(--primary))"}
          className="transition-all duration-200"
        />
      )}

      {/* Flow indicator at source */}
      <circle
        cx={x1}
        cy={y1}
        r={3}
        fill={isActive ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"}
        className={isActive ? "animate-pulse" : ""}
      />

      {/* Delete indicator on hover */}
      {isHovered && !isActive && (
        <g transform={`translate(${midX}, ${midY})`}>
          <circle
            r={12}
            fill="hsl(var(--destructive))"
            className="animate-scale-in"
          />
          <text
            textAnchor="middle"
            dominantBaseline="central"
            fill="white"
            fontSize={14}
            fontWeight="bold"
          >
            ×
          </text>
        </g>
      )}
    </g>
  );
});

// Add CSS for flow animation
const flowAnimationStyles = `
@keyframes flow {
  from {
    stroke-dashoffset: 24;
  }
  to {
    stroke-dashoffset: 0;
  }
}

.animate-flow {
  animation: flow 0.8s linear infinite;
}

@keyframes scale-in {
  from {
    transform: scale(0);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.animate-scale-in {
  animation: scale-in 0.15s ease-out;
}
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleId = 'enhanced-connection-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = flowAnimationStyles;
    document.head.appendChild(style);
  }
}
