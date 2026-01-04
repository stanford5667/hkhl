import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ConfidenceRadialProps {
  confidence: number; // 0-100
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function ConfidenceRadial({ 
  confidence, 
  size = 56, 
  strokeWidth = 4,
  className 
}: ConfidenceRadialProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (confidence / 100) * circumference;
  
  // Color based on confidence level
  const getColor = () => {
    if (confidence >= 75) return "hsl(160 84% 39%)"; // Emerald - high confidence
    if (confidence >= 50) return "hsl(38 92% 50%)"; // Amber - medium confidence
    return "hsl(350 89% 60%)"; // Rose - low confidence
  };

  const color = getColor();

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="hsl(215 28% 17%)"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
          style={{
            filter: `drop-shadow(0 0 6px ${color})`
          }}
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.span 
          className="text-sm font-bold tabular-nums text-foreground"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.5 }}
        >
          {confidence}
        </motion.span>
      </div>
    </div>
  );
}
