interface ProfileStrengthProps {
  percentage: number;
  size?: 'sm' | 'md';
}

export function ProfileStrength({ percentage, size = 'md' }: ProfileStrengthProps) {
  const dimensions = size === 'sm' ? { outer: 48, inner: 18, stroke: 3 } : { outer: 64, inner: 28, stroke: 4 };
  const circumference = 2 * Math.PI * dimensions.inner;
  const strokeDasharray = (percentage / 100) * circumference;

  return (
    <div className="relative" style={{ width: dimensions.outer, height: dimensions.outer }}>
      <svg className="w-full h-full -rotate-90">
        {/* Background circle */}
        <circle
          cx={dimensions.outer / 2}
          cy={dimensions.outer / 2}
          r={dimensions.inner}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={dimensions.stroke}
        />
        {/* Progress circle */}
        <circle
          cx={dimensions.outer / 2}
          cy={dimensions.outer / 2}
          r={dimensions.inner}
          fill="none"
          stroke="hsl(var(--success))"
          strokeWidth={dimensions.stroke}
          strokeDasharray={`${strokeDasharray} ${circumference}`}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <span className={`absolute inset-0 flex items-center justify-center font-bold text-foreground ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
        {percentage}%
      </span>
    </div>
  );
}