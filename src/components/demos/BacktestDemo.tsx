import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DEMO_STRATEGIES, DEMO_INITIAL_CAPITAL } from './demoData';
import { useCountUp, usePrefersReducedMotion } from './useCountUp';
import { DemoCard, DemoCardHeader, LivePulse } from './DemoCard';

const W = 320;
const H = 120;
const PAD = 6;

function toPath(values: number[], min: number, max: number) {
  const span = max - min || 1;
  return values
    .map((v, i) => {
      const x = PAD + (i / (values.length - 1)) * (W - PAD * 2);
      const y = H - PAD - ((v - min) / span) * (H - PAD * 2);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
}

/** rAF tween between two equal-length numeric arrays. */
function useMorph(target: number[], enabled: boolean, duration = 550) {
  const [values, setValues] = useState<number[]>(target);
  const fromRef = useRef<number[]>(target);
  const rafRef = useRef<number>();

  useEffect(() => {
    if (!enabled) {
      fromRef.current = target;
      setValues(target);
      return;
    }
    const from = fromRef.current;
    if (from.length !== target.length) {
      fromRef.current = target;
      setValues(target);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValues(from.map((v, i) => v + (target[i] - v) * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      fromRef.current = target;
    };
  }, [target, enabled, duration]);

  return values;
}

export function BacktestDemo() {
  const reduced = usePrefersReducedMotion();
  const [activeId, setActiveId] = useState(DEMO_STRATEGIES[0].id);
  const strategy = DEMO_STRATEGIES.find((s) => s.id === activeId) ?? DEMO_STRATEGIES[0];

  const values = useMorph(strategy.series.values, !reduced);
  const buyHold = useMorph(strategy.series.buyHold, !reduced);

  const all = [...values, ...buyHold];
  const min = Math.min(...all, DEMO_INITIAL_CAPITAL);
  const max = Math.max(...all);

  const ret = useCountUp(strategy.totalReturn, true);
  const sharpe = useCountUp(strategy.sharpe, true);

  return (
    <DemoCard accent>
      <DemoCardHeader
        icon={<Activity className="h-4 w-4 text-cyan-400" />}
        title="Backtester"
        subtitle={`${strategy.ticker} · 2020–2024 · weekly`}
        right={<LivePulse />}
      />

      {/* Strategy chips — 44px tap targets */}
      <div className="mt-3 flex flex-wrap gap-2">
        {DEMO_STRATEGIES.map((s) => (
          <motion.button
            key={s.id}
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveId(s.id)}
            aria-pressed={s.id === activeId}
            className={cn(
              'min-h-[44px] rounded-full border px-3 text-[11px] font-semibold transition-colors',
              s.id === activeId
                ? 'border-cyan-500/50 bg-cyan-500/15 text-cyan-300'
                : 'border-slate-700 bg-slate-900/70 text-gray-400 hover:border-cyan-500/30 hover:text-gray-200'
            )}
          >
            {s.name}
          </motion.button>
        ))}
      </div>

      {/* Chart — fixed aspect ratio, zero layout shift */}
      <div className="mt-3 w-full" style={{ aspectRatio: `${W} / ${H}` }}>
        <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" preserveAspectRatio="none" role="img" aria-label="Equity curve versus buy and hold benchmark">
          <defs>
            <linearGradient id="demo-eq-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(185 80% 50%)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="hsl(185 80% 50%)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d={`${toPath(values, min, max)} L${W - PAD},${H} L${PAD},${H} Z`}
            fill="url(#demo-eq-fill)"
          />
          <path
            d={toPath(buyHold, min, max)}
            fill="none"
            stroke="rgb(100 116 139)"
            strokeWidth="1.25"
            strokeDasharray="4 4"
          />
          <motion.path
            d={toPath(values, min, max)}
            fill="none"
            stroke="hsl(185 80% 50%)"
            strokeWidth="2"
            strokeLinecap="round"
            initial={reduced ? { pathLength: 1 } : { pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ duration: reduced ? 0 : 1.3, ease: 'easeOut' }}
          />
        </svg>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2.5">
          <div className="text-[10px] uppercase tracking-wider text-gray-500">Total return</div>
          <div className="flex items-center gap-1 font-mono text-lg font-bold text-emerald-400">
            <TrendingUp className="h-3.5 w-3.5" />
            {ret >= 0 ? '+' : ''}
            {ret.toFixed(1)}%
          </div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2.5">
          <div className="text-[10px] uppercase tracking-wider text-gray-500">Sharpe ratio</div>
          <div className="font-mono text-lg font-bold text-white">{sharpe.toFixed(2)}</div>
        </div>
      </div>

      <p className="mt-2.5 flex items-center gap-1.5 text-[10px] text-gray-500">
        <span className="h-1.5 w-4 rounded-full bg-cyan-400" /> Strategy
        <span className="ml-2 h-px w-4 border-t border-dashed border-slate-500" /> Buy &amp; hold
      </p>
    </DemoCard>
  );
}
