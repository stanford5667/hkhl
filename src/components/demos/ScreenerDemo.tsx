import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DEMO_SCREENER_FILTERS, DEMO_SCREENER_INSIGHTS, DEMO_TICKERS } from './demoData';
import { usePrefersReducedMotion } from './useCountUp';
import {
  AiInsight,
  DemoCard,
  DemoCardHeader,
  DemoVisual,
  SampleBadge,
  DEMO_SPRING,
} from './DemoCard';

export function ScreenerDemo() {
  const reduced = usePrefersReducedMotion();
  const [active, setActive] = useState<string | null>(null);

  const rows = active ? DEMO_TICKERS.filter((t) => t.tags.includes(active)) : DEMO_TICKERS;
  const insight = DEMO_SCREENER_INSIGHTS[active ?? 'all'] ?? DEMO_SCREENER_INSIGHTS.all;

  return (
    <DemoCard>
      <DemoCardHeader
        icon={<Search className="h-4 w-4 text-cyan-400" />}
        category="Screener"
        title="Universe scan"
        subtitle="10,000+ tickers, filtered instantly"
        right={<SampleBadge />}
      />

      <div className="mt-3 flex flex-wrap gap-2">
        {DEMO_SCREENER_FILTERS.map((f) => {
          const isActive = active === f.id;
          return (
            <motion.button
              key={f.id}
              type="button"
              whileTap={{ scale: 0.95 }}
              transition={DEMO_SPRING}
              aria-pressed={isActive}
              onClick={() => setActive(isActive ? null : f.id)}
              className={cn(
                'min-h-[44px] rounded-full border px-3 text-[11px] font-semibold transition-colors',
                isActive
                  ? 'border-cyan-500/50 bg-cyan-500/15 text-cyan-300'
                  : 'border-slate-700 bg-slate-900/70 text-gray-400 hover:border-cyan-500/30 hover:text-gray-200'
              )}
            >
              {f.label}
            </motion.button>
          );
        })}
      </div>

      {/* Reserve height for 5 rows so filtering never shifts the page */}
      <DemoVisual className="mt-3" >
        <div style={{ minHeight: 5 * 52 }}>
          <motion.ul layout className="space-y-1.5">
            <AnimatePresence initial={false}>
              {rows.map((t) => (
                <motion.li
                  key={t.symbol}
                  layout={!reduced}
                  initial={reduced ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduced ? undefined : { opacity: 0, y: -8 }}
                  transition={reduced ? { duration: 0 } : DEMO_SPRING}
                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900/50 px-2.5 py-2"
                >
                  <div className="min-w-0">
                    <div className="font-mono text-xs font-bold text-white">{t.symbol}</div>
                    <div className="truncate text-[10px] text-gray-500">{t.name}</div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <div className="font-mono text-xs text-gray-300">${t.price.toFixed(2)}</div>
                    <div
                      className={cn(
                        'font-mono text-[10px] font-semibold',
                        t.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      )}
                    >
                      {t.changePercent >= 0 ? '+' : ''}
                      {t.changePercent.toFixed(2)}% · {t.volume}
                    </div>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
          {rows.length === 0 && (
            <p className="pt-6 text-center text-xs text-gray-500">No matches — try another filter.</p>
          )}
        </div>
      </DemoVisual>

      <AiInsight text={insight} />
    </DemoCard>
  );
}
