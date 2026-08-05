import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface DemoCardProps {
  children: ReactNode;
  accent?: boolean;
  className?: string;
}

/** Shared shell for the product demos — dark slate surface with a subtle cyan glow. */
export function DemoCard({ children, accent, className }: DemoCardProps) {
  return (
    <motion.div
      whileTap={{ scale: 0.995 }}
      className={cn(
        'flex h-full flex-col rounded-2xl border border-slate-800 bg-slate-950/80 p-4 transition-colors',
        'hover:border-cyan-500/30 focus-within:border-cyan-500/40',
        accent
          ? 'border-cyan-500/25 shadow-[0_0_40px_hsl(185_80%_50%/0.1)]'
          : 'hover:shadow-[0_0_40px_hsl(185_80%_50%/0.07)]',
        className
      )}
    >
      {children}
    </motion.div>
  );
}

interface DemoCardHeaderProps {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  right?: ReactNode;
}

export function DemoCardHeader({ icon, title, subtitle, right }: DemoCardHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-cyan-500/20 bg-cyan-500/10">
          {icon}
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-white">{title}</h3>
          {subtitle && <p className="truncate text-[11px] text-gray-500">{subtitle}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}

/** Small pulsing dot conveying live data. */
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
