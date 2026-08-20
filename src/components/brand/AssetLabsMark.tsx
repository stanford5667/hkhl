import { cn } from "@/lib/utils";

interface AssetLabsMarkProps {
  className?: string;
  strokeWidth?: number;
  animated?: boolean;
}

/**
 * Asset Labs AI brand mark.
 *
 * A monoline conical flask whose silhouette reads as a capital "A": narrow neck,
 * mirrored shoulder diagonals, wide base. The liquid line sits where the A's
 * crossbar would sit — so the form reads at once as "A" (Asset) and "flask"
 * (Labs), and as testing a hypothesis before risking money.
 *
 * Inherits color from the parent via `currentColor`.
 */
export function AssetLabsMark({
  className,
  strokeWidth = 2.25,
  animated = false,
}: AssetLabsMarkProps) {
  // 1) the rim, 2) the flask body outline (the "A"), 3) the liquid line (crossbar)
  const paths: Array<{ d: string; duration: number }> = [
    { d: "M11.8 5 H20.2", duration: 0.25 },
    {
      d: "M12 5 L12 12 L6.2 24.5 Q5.6 26 7.1 26 H24.9 Q26.4 26 25.8 24.5 L20 12 L20 5",
      duration: 0.65,
    },
    { d: "M8.6 20 H23.4", duration: 0.3 },
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
