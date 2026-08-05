import { motion } from 'framer-motion';
import { Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DEMO_THEMES, DEMO_THEME_INSIGHT } from './demoData';
import { AiInsight, ConvictionMeter, DemoCard, DemoCardHeader, DemoVisual, DEMO_SPRING } from './DemoCard';
import { usePrefersReducedMotion } from './useCountUp';

export function ThemesDemo() {
  const reduced = usePrefersReducedMotion();

  return (
    <DemoCard>
      <DemoCardHeader
        icon={<Globe className="h-4 w-4 text-cyan-400" />}
        category="Market Themes"
        title="Macro narrative scan"
        subtitle="Five narratives, scored daily"
      />

      <DemoVisual className="mt-3 flex-1 space-y-1.5">
        {DEMO_THEMES.map((theme, i) => {
          const label = theme.sentiment >= 0.6 ? 'Bullish' : theme.sentiment <= 0.4 ? 'Bearish' : 'Neutral';
          const tone =
            theme.sentiment >= 0.6
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : theme.sentiment <= 0.4
              ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
              : 'bg-amber-500/10 border-amber-500/20 text-amber-400';

          return (
            <motion.div
              key={theme.id}
              initial={reduced ? false : { opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={reduced ? { duration: 0 } : { ...DEMO_SPRING, delay: i * 0.07 }}
              whileTap={{ scale: 0.98 }}
              className="rounded-lg border border-slate-800 bg-slate-900/50 p-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-white">{theme.title}</p>
                  <span className="text-[10px] uppercase tracking-wider text-gray-500">{theme.category}</span>
                </div>
                <span className={cn('flex-shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold', tone)}>
                  {label}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span
                  className={cn(
                    'font-mono text-[11px] font-bold',
                    theme.impact >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  )}
                >
                  {theme.impact >= 0 ? '+' : ''}
                  {theme.impact.toFixed(1)}%
                </span>
                <div className="flex gap-1">
                  {theme.tickers.map((t) => (
                    <span
                      key={t}
                      className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-gray-400"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          );
        })}
      </DemoVisual>

      <ConvictionMeter filled={4} value="High" />
      <AiInsight text={DEMO_THEME_INSIGHT} />
    </DemoCard>
  );
}
