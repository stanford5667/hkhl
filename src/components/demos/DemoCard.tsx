import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStreamingText } from './useStreamingText';
import { usePrefersReducedMotion } from './useCountUp';

const SPRING = { type: 'spring' as const, stiffness: 220, damping: 26, mass: 0.9 };

/** ~2.5% grain, inlined so it costs no request. */
const NOISE_URL =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/></filter><rect width='120' height='120' filter='url(%23n)' opacity='0.55'/></svg>\")";

interface DemoCardProps {
  children: ReactNode;
  accent?: boolean;
  className?: string;
}

/** Shared shell for the product demos — lit slate surface, grain, ambient depth. */
export function DemoCard({ children, accent, className }: DemoCardProps) {
  const reduced = usePrefersReducedMotion();
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={reduced ? { duration: 0 } : SPRING}
      whileTap={{ scale: 0.995 }}
      className={cn(
        'relative isolate flex h-full flex-col overflow-hidden rounded-2xl border p-4 [font-variant-numeric:tabular-nums]',
        'border-slate-800/90 bg-slate-950/85 transition-colors',
        'shadow-[0_24px_60px_-24px_rgb(2_6_23/0.9),0_2px_10px_-4px_rgb(2_6_23/0.6)]',
        'hover:border-cyan-500/25 focus-within:border-cyan-500/35',
        accent && 'border-cyan-500/20',
        className
      )}
    >
      {/* top inner highlight — the surface catching light */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.09] to-transparent"
      />
      {/* grain */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.035] mix-blend-overlay"
        style={{ backgroundImage: NOISE_URL, backgroundSize: '120px 120px' }}
      />
      {children}
    </motion.div>
  );
}

/** Soft radial cyan light behind a demo's primary visual only. */
export function DemoVisual({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('relative', className)}>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(60% 70% at 50% 55%, hsl(185 80% 50% / 0.13), transparent 70%)',
        }}
      />
      {children}
    </div>
  );
}

interface DemoCardHeaderProps {
  icon: ReactNode;
  category?: string;
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  className?: string;
}

export function DemoCardHeader({ icon, category, title, subtitle, right, className }: DemoCardHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-2', className)}>
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-cyan-500/20 bg-cyan-500/10">
          {icon}
        </div>
        <div className="min-w-0">
          {category && (
            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-cyan-400/70">
              {category}
            </p>
          )}
          {title && <h3 className="truncate text-sm font-semibold tracking-[-0.01em] text-white">{title}</h3>}
          {subtitle && <p className="truncate text-[11px] text-gray-500">{subtitle}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}


/** Honest label for demos running on hardcoded sample data. */
export function SampleBadge({ label = 'Sample' }: { label?: string }) {
  return (
    <span className="flex flex-shrink-0 items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-600" />
      {label}
    </span>
  );
}

/** Pulsing dot — only for genuinely live data. */
export function LivePulse({ label = 'Live' }: { label?: string }) {
  return (
    <span className="flex flex-shrink-0 items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
      </span>
      {label}
    </span>
  );
}

/** Streaming analyst read-out. Restarts (and cancels) whenever `text` changes. */
export function AiInsight({ text, active = true }: { text: string; active?: boolean }) {
  const { shown, done } = useStreamingText(text, active);
  return (
    <div className="mt-3 rounded-xl border border-cyan-500/15 bg-cyan-500/[0.04] p-2.5">
      <div className="flex items-center gap-1.5">
        <Sparkles className="h-3 w-3 text-cyan-400" />
        <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-cyan-400/70">
          Analysis
        </span>
      </div>
      {/* min-height reserves two lines so streaming never shifts layout */}
      <p className="mt-1 min-h-[2.6rem] text-[11px] leading-[1.45] text-gray-300" aria-live="polite">
        {shown}
        {!done && <span className="ml-0.5 inline-block h-3 w-[2px] translate-y-[2px] animate-pulse bg-cyan-400" />}
      </p>
    </div>
  );
}

/** Understated 5-segment instrumentation meter. */
export function ConvictionMeter({
  filled,
  label = 'Conviction',
  value,
}: {
  filled: number;
  label?: string;
  value: string;
}) {
  const reduced = usePrefersReducedMotion();
  return (
    <div className="mt-3 flex items-center justify-between gap-3">
      <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-gray-500">
        {label}
      </span>
      <div className="flex flex-1 items-center gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <motion.span
            key={i}
            className={cn(
              'h-1 flex-1 rounded-full',
              i < filled ? 'bg-cyan-400/80' : 'bg-slate-800'
            )}
            initial={reduced ? false : { opacity: 0, scaleX: 0.4 }}
            whileInView={{ opacity: 1, scaleX: 1 }}
            viewport={{ once: true }}
            transition={reduced ? { duration: 0 } : { ...SPRING, delay: i * 0.06 }}
            style={{ originX: 0 }}
          />
        ))}
      </div>
      <span className="text-[10px] font-semibold text-cyan-300">{value}</span>
    </div>
  );
}

export { SPRING as DEMO_SPRING };
