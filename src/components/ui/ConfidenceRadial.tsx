import { cn } from "@/lib/utils";

interface ConfidenceRadialProps {
  confidence: number;
  size?: number;
  className?: string;
  showLabel?: boolean;
}

export function ConfidenceRadial({ 
  confidence, 
  size = 56, 
  className,
  showLabel = true 
}: ConfidenceRadialProps) {
  const radius = (size - 4) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (confidence / 100) * circumference;

  const getColor = () => {
    if (confidence >= 75) return "hsl(160 84% 39%)"; // Emerald
    if (confidence >= 50) return "hsl(38 92% 50%)"; // Amber
    return "hsl(350 89% 60%)"; // Rose
  };

  return (
    <div className={cn("relative flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          className="text-muted"
          strokeWidth="3"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className="transition-all duration-500 ease-out"
          strokeWidth="3"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          stroke={getColor()}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      {showLabel && (
        <span 
          className="absolute font-mono font-semibold"
          style={{ 
            fontSize: size * 0.28,
            color: getColor()
          }}
        >
          {confidence}
        </span>
      )}
    </div>
  );
}
