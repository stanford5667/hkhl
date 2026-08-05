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
  // 1) the A itself, 2) the trend-line extension past the apex, 3) the crossbar
  const paths: Array<{ d: string; duration: number }> = [
    { d: "M5 27 L13 11 L21 27", duration: 0.6 },
    { d: "M13 11 L25.5 6", duration: 0.35 },
    { d: "M8.5 21 H17.5", duration: 0.25 },
  ];

  let elapsed = 0;

  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("h-full w-full", animated && "al-mark-draw", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label="Asset Labs AI"
      shapeRendering="geometricPrecision"
    >
      {paths.map(({ d, duration }) => {
        const delay = elapsed;
        elapsed += duration;
        return (
          <path
            key={d}
            d={d}
            pathLength={1}
            style={
              animated
                ? ({
                    "--al-draw-duration": `${duration}s`,
                    "--al-draw-delay": `${delay}s`,
                  } as React.CSSProperties)
                : undefined
            }
          />
        );
      })}
    </svg>
  );
}
