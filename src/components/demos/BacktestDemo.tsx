import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Line,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Activity, Check, HelpCircle, LineChart, Sparkles, TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DEMO_STRATEGIES, DEMO_INITIAL_CAPITAL, type DemoDataPoint } from './demoData';
import { useCountUp, usePrefersReducedMotion } from './useCountUp';
import { useChartData } from '@/hooks/useChartData';
import {
  DemoCard,
  DemoCardHeader,
  DemoVisual,
  SampleBadge,
  DEMO_SPRING,
} from './DemoCard';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';



/** Format a number safely; fallback to '--' when the value is NaN or undefined. */
function safeFormat(value: number, formatter: (n: number) => string): string {
  return Number.isFinite(value) ? formatter(value) : '--';
}

/** Spring-ish tween between two equal-length series. */
function useMorphSeries(target: DemoDataPoint[], enabled: boolean, duration = 620) {
  const [points, setPoints] = useState<DemoDataPoint[]>(target);
  const fromRef = useRef<DemoDataPoint[]>(target);
  const rafRef = useRef<number>();

  useEffect(() => {
    if (!enabled) {
      fromRef.current = target;
      setPoints(target);
      return;
    }
    const from = fromRef.current;
    if (from.length !== target.length) {
      fromRef.current = target;
      setPoints(target);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.exp(-6 * t) * (1 + 6 * t * 0.35);
      setPoints(
        from.map((p, i) => ({
          ...p,
          equity: p.equity + (target[i].equity - p.equity) * eased,
          benchmark: p.benchmark + (target[i].benchmark - p.benchmark) * eased,
          drawdown: p.drawdown + (target[i].drawdown - p.drawdown) * eased,
        }))
      );
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      fromRef.current = target;
    };
  }, [target, enabled, duration]);

  return points;
}

const STOCK_DEMO_TICKER = 'AAPL';
const STOCK_DEMO_COMPANY = 'Apple Inc.';
const STOCK_RANGES = ['1M', '3M', '6M', '1Y'] as const;

function StockChartPreview() {
  const reduced = usePrefersReducedMotion();
  const [range, setRange] = useState<(typeof STOCK_RANGES)[number]>('6M');
  const { data: bars, isLoading } = useChartData(STOCK_DEMO_TICKER, range);

  const points = useMemo(
    () =>
      (bars ?? [])
        .filter((b) => Number.isFinite(b.price))
        .map((b) => ({ t: b.time * 1000, price: b.price })),
    [bars],
  );

  const isLive = points.length > 4;
  const last = isLive ? points[points.length - 1].price : 243.52;
  const prev = isLive && points.length > 1 ? points[points.length - 2].price : 243.52 - 4.18;
  const change = last - prev;
  const changePercent = prev ? (change / prev) * 100 : 0;

  const domain = useMemo(() => {
    if (!isLive) return undefined;
    const vals = points.map((p) => p.price);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = (max - min) * 0.08 || 1;
    return [min - pad, max + pad] as [number, number];
  }, [points, isLive]);

  const price = useCountUp(last, true);
  const isPositive = change >= 0;
  const fmtDate = (t: number) =>
    new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div className="relative overflow-hidden rounded-xl border border-white/[0.12] bg-slate-950/60 shadow-sm">
      {/* Mock ticker header */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 text-sm font-bold text-white">
            {STOCK_DEMO_TICKER}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{STOCK_DEMO_COMPANY}</p>
            <p className="text-[10px] text-muted-foreground">NASDAQ · Technology</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold tabular-nums text-white">${price.toFixed(2)}</p>
          <p className={cn(
            'flex items-center justify-end gap-1 text-[11px] font-medium',
            isPositive ? 'text-emerald-400' : 'text-rose-400'
          )}>
            {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {isPositive ? '+' : ''}{change.toFixed(2)} ({isPositive ? '+' : ''}{changePercent.toFixed(2)}%)
          </p>
        </div>
      </div>

      {/* Price action chart */}
      <div className="p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-white/50">Price action</span>
          <div className="flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.04] p-0.5">
            {STOCK_RANGES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={cn(
                  'rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors',
                  range === r ? 'bg-primary text-white' : 'text-white/50 hover:text-white',
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <div className="relative h-[140px] w-full sm:h-[180px]">
          {points.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={points} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="demo-stock-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="t"
                  type="number"
                  scale="time"
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={fmtDate}
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={40}
                />
                <YAxis
                  domain={domain ?? ['auto', 'auto']}
                  orientation="right"
                  width={44}
                  tickFormatter={(v: number) => `$${v.toFixed(0)}`}
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                />
                <ReTooltip
                  contentStyle={{
                    background: '#111827',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                  labelFormatter={(t) => fmtDate(Number(t))}
                  formatter={(v: number) => [`$${Number(v).toFixed(2)}`, 'Close']}
                />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke="hsl(var(--chart-1))"
                  strokeWidth={1.5}
                  fill="url(#demo-stock-fill)"
                  isAnimationActive={!reduced}
                  animationDuration={900}
                  dot={false}
                  activeDot={{ r: 3, fill: 'hsl(var(--chart-1))', stroke: 'none' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-[11px] text-white/40">
              {isLoading ? 'Loading AAPL price history…' : 'Price history unavailable'}
            </div>
          )}
        </div>
        <p className="mt-1 text-right text-[9px] text-white/35">
          {isLive ? `${STOCK_DEMO_TICKER} · ${range} · live market data` : `${STOCK_DEMO_TICKER} daily closes`}
        </p>
      </div>
    </div>
  );
}


function StatCard({
  label,
  value,
  icon,
  accent,
  tooltip,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  accent: 'emerald' | 'cyan' | 'blue' | 'rose' | 'violet';
  tooltip?: string;
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
    <div className={cn('rounded-lg border border-white/[0.12] p-2 shadow-sm', styles.border, styles.bg)}>
      <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-gray-500">
        {icon && <span className={cn('flex h-4 w-4 items-center justify-center rounded', styles.iconBg, styles.text)}>{icon}</span>}
        <span className="truncate">{label}</span>
        {tooltip && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={`What is ${label}?`}
                className={cn('ml-auto flex h-5 w-5 items-center justify-center rounded-full opacity-60 transition-opacity hover:opacity-100 focus-visible:opacity-100', styles.iconBg)}
              >
                <HelpCircle className={cn('h-3 w-3', styles.text)} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[220px] normal-case text-[10px] leading-relaxed">
              {tooltip}
            </TooltipContent>
          </Tooltip>
        )}
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

  const points = useMorphSeries(strategy.series.points, !reduced);

  const min = useMemo(
    () => Math.min(DEMO_INITIAL_CAPITAL, ...points.map((p) => p.equity)),
    [points]
  );
  const max = useMemo(() => Math.max(...points.map((p) => p.equity)), [points]);

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
      <DemoVisual className="w-full">
        <StockChartPreview />
      </DemoVisual>

      {/* Divider between the live ticker and the backtested strategy */}
      <div className="mt-4 flex items-center gap-3">
        <span className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700 to-slate-700" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Then test a strategy</span>
        <span className="h-px flex-1 bg-gradient-to-l from-transparent via-slate-700 to-slate-700" />
      </div>

      <DemoCardHeader
        className="mt-4"
        icon={<Activity className="h-4 w-4 text-blue-400" />}
        category="Backtested strategy"
        title={strategy.name}
        subtitle={`${strategy.techName} · ${strategy.ticker} · 2020–2024 · weekly`}
        right={<SampleBadge label="Backtest" />}
      />

      <p className="mt-1 text-[10px] leading-relaxed text-white/50">
        This is a simulated backtest. The curve and stats are predictions based on historical rules, not actual trades.
      </p>


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
                  'flex min-h-[26px] items-center gap-1 rounded-md border px-1.5 py-0.5 text-left transition-colors shadow-sm',
                  isActive
                    ? 'border-white/[0.20] bg-blue-500/[0.12] text-blue-400 ring-1 ring-white/[0.06]'
                    : 'border-white/[0.10] bg-slate-900/70 text-gray-400 hover:border-white/[0.18] hover:text-gray-200'
                )}
              >
                <span
                  className={cn(
                    'flex h-3.5 w-3.5 items-center justify-center rounded-sm',
                    isActive ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-400'
                  )}
                >
                  {isActive ? <Check className="h-2.5 w-2.5" /> : <Activity className="h-2.5 w-2.5" />}
                </span>
                <div className="flex flex-col leading-tight">
                  <span className="text-[10px] font-semibold">{s.name}</span>
                  <span className="text-[8px] text-gray-500">{s.techName}</span>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Chart — proper time-based axes, benchmark overlay, and trade markers */}
      <DemoVisual className="mt-3 w-full rounded-xl border border-white/[0.12] bg-slate-950/40 p-2 shadow-sm">
        <div className="relative h-[180px] w-full sm:h-[220px]">
          <div className="absolute right-2 top-2 z-10 flex items-center gap-3 text-[9px]">
            <span className="flex items-center gap-1.5 text-white/60">
              <span className="h-2 w-4 rounded-full bg-[hsl(var(--chart-1))]" />
              Strategy
            </span>
            <span className="flex items-center gap-1.5 text-white/40">
              <span className="h-px w-4 border-t border-dashed border-white/40" />
              Buy & hold
            </span>
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 24, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="demo-eq-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="timestamp"
                type="number"
                scale="time"
                domain={['dataMin', 'dataMax']}
                tickFormatter={(t: number) =>
                  new Date(t).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
                }
                tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }}
                axisLine={false}
                tickLine={false}
                minTickGap={50}
              />
              <YAxis
                dataKey="equity"
                orientation="right"
                width={52}
                domain={[min, max]}
                tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }}
                axisLine={false}
                tickLine={false}
              />
              <ReTooltip
                contentStyle={{
                  background: '#111827',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 8,
                  fontSize: 11,
                }}
                labelFormatter={(t: number) =>
                  new Date(Number(t)).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                }
                formatter={(v: number, name: string) => {
                  if (name === 'equity') return [`$${Number(v).toLocaleString()}`, 'Strategy'];
                  if (name === 'benchmark') return [`$${Number(v).toLocaleString()}`, 'Buy & hold'];
                  return [v, name];
                }}
              />
              <Area
                type="monotone"
                dataKey="equity"
                stroke="hsl(var(--chart-1))"
                strokeWidth={2}
                fill="url(#demo-eq-fill)"
                isAnimationActive={!reduced}
                animationDuration={1000}
                dot={false}
                activeDot={{ r: 3, fill: 'hsl(var(--chart-1))', stroke: 'none' }}
              />
              <Line
                type="monotone"
                dataKey="benchmark"
                stroke="rgba(255,255,255,0.35)"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                isAnimationActive={false}
              />
              {showAnnotations &&
                strategy.annotations.map((a) => (
                  <ReferenceDot
                    key={`${strategy.id}-${a.index}`}
                    x={strategy.series.points[a.index].timestamp}
                    y={strategy.series.points[a.index].equity}
                    r={3}
                    fill="hsl(var(--chart-1))"
                    stroke="none"
                    label={{
                      value: a.label,
                      position: a.dir === 1 ? 'bottom' : 'top',
                      fill: 'rgba(255,255,255,0.85)',
                      fontSize: 9,
                    }}
                  />
                ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </DemoVisual>

      {/* Condensed stats grid — bordered, accent-colored cards */}
      <TooltipProvider delayDuration={200}>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <StatCard
            label="Historical return"
            value={safeFormat(historical, (v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`)}
            accent="blue"
            tooltip="Total percentage return the strategy produced during the backtested history window."
          />
          <StatCard
            label="Expected return"
            value={safeFormat(expected, (v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`)}
            accent="blue"
            tooltip="Annualized return forecast based on the strategy's historical risk/return profile."
          />
          <StatCard
            label="Sharpe ratio"
            value={safeFormat(sharpe, (v) => v.toFixed(2))}
            accent="blue"
            tooltip="Return earned per unit of risk; a ratio above 1.0 generally means the return justifies the volatility."
          />
          <StatCard
            label="Max drawdown"
            value={safeFormat(maxDd, (v) => `-${v.toFixed(1)}%`)}
            icon={<TrendingDown className="h-3 w-3" />}
            accent="rose"
            tooltip="The largest peak-to-trough decline during the period; a measure of worst-case downside."
          />
          <StatCard
            label="Winning days"
            value={safeFormat(winDays, (v) => `${v.toFixed(0)}%`)}
            accent="blue"
            tooltip="Percentage of trading days that closed with a positive P&L for the strategy."
          />
          <StatCard
            label="Volatility"
            value={safeFormat(vol, (v) => `${v.toFixed(1)}%`)}
            accent="blue"
            tooltip="Standard deviation of returns; higher values mean the strategy swings more sharply."
          />
        </div>
      </TooltipProvider>

      {/* Prompt-bar styled button — clearly an action, not a dead input */}
      <motion.button
        type="button"
        whileTap={{ scale: 0.98 }}
        transition={DEMO_SPRING}
        onClick={() => navigate('/auth', { state: { mode: 'signup' } })}
        className="mt-3 flex min-h-[44px] w-full cursor-pointer items-center gap-2 rounded-xl border border-white/[0.14] bg-slate-900/70 px-3 text-left text-[11px] text-gray-400 transition-colors shadow-sm hover:border-white/25 hover:text-gray-200"
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
