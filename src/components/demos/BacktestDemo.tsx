import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Activity, Check, HelpCircle, Sparkles, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DEMO_STRATEGIES, DEMO_INITIAL_CAPITAL } from './demoData';
import { useCountUp, usePrefersReducedMotion } from './useCountUp';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';


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

function pointAt(values: number[], i: number, min: number, max: number) {
  const span = max - min || 1;
  const idx = Math.max(0, Math.min(values.length - 1, i));
  return {
    xPct: ((PAD + (idx / (values.length - 1)) * (W - PAD * 2)) / W) * 100,
    yPct: ((H - PAD - ((values[idx] - min) / span) * (H - PAD * 2)) / H) * 100,
  };
}

/** Spring-ish tween between two equal-length numeric arrays. */
function useMorph(target: number[], enabled: boolean, duration = 620) {
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
      // critically damped spring-like settle
      const eased = 1 - Math.exp(-6 * t) * (1 + 6 * t * 0.35);
      setValues(from.map((v, i) => v + (target[i] - v) * Math.min(1, eased)));
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

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  accent: 'emerald' | 'cyan' | 'blue' | 'rose' | 'violet';
}) {
  const styles = {
    emerald: {
      border: 'border-emerald-500/20',
      bg: 'bg-emerald-500/5',
      text: 'text-emerald-400',
      iconBg: 'bg-emerald-500/15',
    },
    cyan: {
      border: 'border-cyan-500/20',
      bg: 'bg-cyan-500/5',
      text: 'text-cyan-400',
      iconBg: 'bg-cyan-500/15',
    },
    blue: {
      border: 'border-blue-500/20',
      bg: 'bg-blue-500/5',
      text: 'text-blue-400',
      iconBg: 'bg-blue-500/15',
    },
    rose: {
      border: 'border-rose-500/20',
      bg: 'bg-rose-500/5',
      text: 'text-rose-400',
      iconBg: 'bg-rose-500/15',
    },
    violet: {
      border: 'border-violet-500/20',
      bg: 'bg-violet-500/5',
      text: 'text-violet-400',
      iconBg: 'bg-violet-500/15',
    },
  }[accent];

  return (
    <div className={cn('rounded-lg border p-2', styles.border, styles.bg)}>
      <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-gray-500">
        {icon && <span className={cn('flex h-4 w-4 items-center justify-center rounded', styles.iconBg, styles.text)}>{icon}</span>}
        {label}
      </div>
      <div className={cn('mt-0.5 font-mono text-sm font-bold', styles.text)}>{value}</div>
    </div>
  );
}

export function BacktestDemo() {
  const reduced = usePrefersReducedMotion();
  const navigate = useNavigate();
  const [activeId, setActiveId] = useState(DEMO_STRATEGIES[0].id);
  const strategy = DEMO_STRATEGIES.find((s) => s.id === activeId) ?? DEMO_STRATEGIES[0];

  const values = useMorph(strategy.series.values, !reduced);
  const buyHold = useMorph(strategy.series.buyHold, !reduced);

  const all = [...values, ...buyHold];
  const min = Math.min(...all, DEMO_INITIAL_CAPITAL);
  const max = Math.max(...all);

  const sharpe = useCountUp(strategy.sharpe, true);
  const expected = useCountUp(strategy.expectedReturn, true);
  const historical = useCountUp(strategy.historicalReturn, true);
  const maxDd = useCountUp(strategy.maxDrawdown, true);
  const winDays = useCountUp(strategy.winningDays, true);
  const vol = useCountUp(strategy.volatility, true);

  // Annotations land only after the curve has finished drawing.
  const [showAnnotations, setShowAnnotations] = useState(reduced);
  useEffect(() => {
    if (reduced) {
      setShowAnnotations(true);
      return;
    }
    setShowAnnotations(false);
    const t = window.setTimeout(() => setShowAnnotations(true), 1250);
    return () => window.clearTimeout(t);
  }, [activeId, reduced]);

  return (
    <DemoCard accent>
      <DemoCardHeader
        icon={<Activity className="h-4 w-4 text-cyan-400" />}
        category="AI Strategy Builder"
        title={strategy.name}
        subtitle={`${strategy.techName} · ${strategy.ticker} · 2020–2024 · weekly`}
        
        right={<SampleBadge />}
      />

      {/* Strategy chips — compact, clearly selectable presets */}
      <div className="mt-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-gray-400">Pick a strategy to preview</p>
          <span className="text-[10px] text-gray-500">Tap to switch</span>
        </div>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {DEMO_STRATEGIES.map((s) => {
            const isActive = s.id === activeId;
            return (
              <motion.button
                key={s.id}
                type="button"
                whileTap={{ scale: 0.97 }}
                transition={DEMO_SPRING}
                onClick={() => setActiveId(s.id)}
                aria-pressed={isActive}
                className={cn(
                  'flex min-h-[36px] items-center gap-2 rounded-lg border px-2.5 py-1 text-left transition-colors',
                  isActive
                    ? 'border-cyan-500/50 bg-cyan-500/15 text-cyan-300'
                    : 'border-slate-700 bg-slate-900/70 text-gray-400 hover:border-cyan-500/30 hover:text-gray-200'
                )}
              >
                <span
                  className={cn(
                    'flex h-5 w-5 items-center justify-center rounded',
                    isActive ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-400'
                  )}
                >
                  {isActive ? <Check className="h-3 w-3" /> : <Activity className="h-3 w-3" />}
                </span>
                <div className="flex flex-col leading-tight">
                  <span className="text-xs font-semibold">{s.name}</span>
                  <span className="text-[10px] text-gray-500">{s.techName}</span>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Chart — fixed aspect ratio, zero layout shift */}
      <DemoVisual className="mt-3 w-full">
        <div className="relative w-full" style={{ aspectRatio: `${W} / ${H}` }}>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="h-full w-full"
            preserveAspectRatio="none"
            role="img"
            aria-label="Equity curve versus buy and hold benchmark"
          >
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
              transition={{ duration: reduced ? 0 : 1.15, ease: 'easeOut' }}
            />
          </svg>

          {/* AI annotations, overlaid so the labels stay undistorted */}
          <AnimatePresence>
            {showAnnotations &&
              strategy.annotations.map((a) => {
                const { xPct, yPct } = pointAt(values, a.index, min, max);
                const below = a.dir === 1;
                const flipX = xPct > 60;
                return (
                  <motion.div
                    key={`${strategy.id}-${a.index}`}
                    initial={reduced ? false : { opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={reduced ? { duration: 0 } : { ...DEMO_SPRING, delay: 0.12 }}
                    className="pointer-events-none absolute"
                    style={{ left: `${xPct}%`, top: `${yPct}%` }}
                  >
                    <span className="absolute -left-[3px] -top-[3px] block h-1.5 w-1.5 rounded-full bg-cyan-300 ring-2 ring-cyan-400/25" />
                    <span
                      className={cn(
                        'absolute whitespace-nowrap rounded-md border border-cyan-500/25 bg-slate-950/90 px-1.5 py-0.5 text-[9px] font-medium text-cyan-200/90',
                        below ? 'top-2.5' : 'bottom-2.5',
                        flipX ? 'right-1' : 'left-1'
                      )}
                    >
                      {a.label}
                    </span>
                  </motion.div>
                );
              })}
          </AnimatePresence>
        </div>
      </DemoVisual>

      {/* Condensed stats grid — bordered, accent-colored cards */}
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatCard
          label="Historical return"
          value={`${historical >= 0 ? '+' : ''}${historical.toFixed(1)}%`}
          accent="cyan"
        />
        <StatCard
          label="Expected return"
          value={`${expected >= 0 ? '+' : ''}${expected.toFixed(1)}%`}
          accent="blue"
        />
        <StatCard
          label="Sharpe ratio"
          value={sharpe.toFixed(2)}
          accent="cyan"
        />
        <StatCard
          label="Max drawdown"
          value={`-${maxDd.toFixed(1)}%`}
          icon={<TrendingDown className="h-3 w-3" />}
          accent="rose"
        />
        <StatCard
          label="Winning days"
          value={`${winDays.toFixed(0)}%`}
          accent="emerald"
        />
        <StatCard
          label="Volatility"
          value={`${vol.toFixed(1)}%`}
          accent="violet"
        />
      </div>

      <ConvictionMeter filled={strategy.conviction} value={strategy.convictionLabel} />

      <p className="mt-2.5 flex items-center gap-1.5 text-[10px] text-gray-500">
        <span className="h-1.5 w-4 rounded-full bg-cyan-400" /> Your idea
        <span className="ml-2 h-px w-4 border-t border-dashed border-slate-500" /> Buy &amp; hold
      </p>




      {/* Prompt-bar styled button — clearly an action, not a dead input */}
      <motion.button
        type="button"
        whileTap={{ scale: 0.98 }}
        transition={DEMO_SPRING}
        onClick={() => navigate('/auth', { state: { mode: 'signup' } })}
        className="mt-3 flex min-h-[44px] w-full cursor-pointer items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/70 px-3 text-left text-[11px] text-gray-400 transition-colors hover:border-cyan-500/40 hover:text-gray-200"
      >
        <Sparkles className="h-3.5 w-3.5 flex-shrink-0 text-cyan-400" />
        <span className="truncate">Build my strategy with AI</span>
        <span className="ml-auto flex-shrink-0 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-cyan-300">
          Start free
        </span>
      </motion.button>
    </DemoCard>
  );
}
