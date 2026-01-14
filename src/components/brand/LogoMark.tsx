import { cn } from "@/lib/utils";

interface LogoMarkProps {
  className?: string;
}

/**
 * Inline SVG logo mark so it can inherit `currentColor` and switch automatically
 * between light/dark themes (white-on-dark, black-on-light).
 * Features a beaker with trending chart, arrow, and mathematical formulas.
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
        strokeWidth={20}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Flask neck top bar */}
      <path
        d="M180 48h152"
        stroke="currentColor"
        strokeWidth={20}
        strokeLinecap="round"
      />

      {/* Liquid level line */}
      <path
        d="M115 320h282"
        stroke="currentColor"
        strokeWidth={12}
        strokeLinecap="round"
        opacity={0.25}
      />

      {/* Greek letters and formulas inside beaker (above liquid) */}
      <text
        x="175"
        y="195"
        fill="currentColor"
        fontSize="42"
        fontFamily="serif"
        fontStyle="italic"
        opacity={0.4}
      >
        σ
      </text>
      <text
        x="235"
        y="175"
        fill="currentColor"
        fontSize="36"
        fontFamily="serif"
        fontStyle="italic"
        opacity={0.35}
      >
        μ
      </text>
      <text
        x="290"
        y="200"
        fill="currentColor"
        fontSize="32"
        fontFamily="serif"
        fontStyle="italic"
        opacity={0.3}
      >
        α
      </text>
      <text
        x="200"
        y="250"
        fill="currentColor"
        fontSize="28"
        fontFamily="serif"
        fontStyle="italic"
        opacity={0.25}
      >
        β
      </text>
      <text
        x="265"
        y="260"
        fill="currentColor"
        fontSize="24"
        fontFamily="serif"
        fontStyle="italic"
        opacity={0.2}
      >
        Σ
      </text>

      {/* Trending up chart line */}
      <path
        d="M140 400 L200 355 L260 380 L330 310"
        stroke="currentColor"
        strokeWidth={18}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Arrow head pointing up-right */}
      <path
        d="M330 310 L358 305 L353 333"
        stroke="currentColor"
        strokeWidth={18}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Small decorative plus signs representing formulas */}
      <g opacity={0.2} stroke="currentColor" strokeWidth={6} strokeLinecap="round">
        <path d="M320 170 v16 M312 178 h16" />
        <path d="M165 235 v12 M159 241 h12" />
      </g>
    </svg>
  );
}
