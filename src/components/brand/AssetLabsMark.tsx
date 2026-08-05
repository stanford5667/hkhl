import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AssetLabsMarkProps {
  className?: string;
  strokeWidth?: number;
  animated?: boolean;
}

/**
 * Asset Labs AI brand mark.
 *
 * A geometric monoline "A" whose right stroke continues past the apex as an
 * ascending trend line, so it reads at once as the letter and as market growth.
 * The crossbar sits as a horizontal baseline.
 *
 * Inherits color from the parent via `currentColor`.
 */
export function AssetLabsMark({
  className,
  strokeWidth = 2.25,
  animated = false,
}: AssetLabsMarkProps) {
  const reduceMotion = useReducedMotion();
  const play = animated && !reduceMotion;

  const shared = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  // 1) the A itself, 2) the trend-line extension past the apex, 3) the crossbar
  const paths = [
    "M5 27 L13 11 L21 27",
    "M13 11 L25.5 6",
    "M8.5 21 H17.5",
  ];

  const durations = [0.55, 0.35, 0.25];

  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("h-full w-full", className)}
      role="img"
      aria-label="Asset Labs AI"
      shapeRendering="geometricPrecision"
    >
      {paths.map((d, i) =>
        play ? (
          <motion.path
            key={d}
            d={d}
            {...shared}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{
              duration: durations[i],
              delay: durations.slice(0, i).reduce((a, b) => a + b, 0),
              ease: "easeInOut",
            }}
          />
        ) : (
          <path key={d} d={d} {...shared} />
        )
      )}
    </svg>
  );
}
