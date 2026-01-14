import { cn } from "@/lib/utils";

interface LogoMarkProps {
  className?: string;
}

/**
 * Inline SVG logo mark so it can inherit `currentColor` and switch automatically
 * between light/dark themes (white-on-dark, black-on-light).
 */
export function LogoMark({ className }: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 512 512"
      aria-hidden="true"
      focusable="false"
      className={cn("block", className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Beaker/Flask outline */}
      <path
        d="M192 48h128v80l96 192v96c0 26.5-21.5 48-48 48H144c-26.5 0-48-21.5-48-48v-96l96-192V48z"
        stroke="currentColor"
        strokeWidth={24}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Flask neck */}
      <path
        d="M192 48h128"
        stroke="currentColor"
        strokeWidth={24}
        strokeLinecap="round"
      />

      {/* Liquid level */}
      <path
        d="M120 340h272"
        stroke="currentColor"
        strokeWidth={16}
        strokeLinecap="round"
        opacity={0.3}
      />

      {/* Trending up arrow */}
      <path
        d="M160 380l80-100 48 40 80-100"
        stroke="currentColor"
        strokeWidth={24}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Arrow head */}
      <path
        d="M340 220l28 0 0 28"
        stroke="currentColor"
        strokeWidth={24}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
