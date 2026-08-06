import { useMemo, useState } from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  LineChart, 
  BarChart3, 
  FlaskConical, 
  Beaker, 
  Newspaper, 
  FileText, 
  MessageCircle, 
  TrendingUp, 
  TrendingDown,
  Search,
  ArrowRight,
  Sparkles,
  Activity,
  Target,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DemoCard, DemoCardHeader, DemoVisual, SampleBadge } from './DemoCard';
import { useCountUp, usePrefersReducedMotion } from './useCountUp';
import { useChartData } from '@/hooks/useChartData';

const DEMO_TICKER = 'AAPL';
const DEMO_COMPANY = 'Apple Inc.';
const DEMO_PRICE = 243.52;
const DEMO_CHANGE = 4.18;
const DEMO_CHANGE_PERCENT = 1.75;

const TABS = [
  { id: 'overview', label: 'Overview', icon: LineChart, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  { id: 'financials', label: 'Financials', icon: BarChart3, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  { id: 'quant', label: 'Quant Lab', icon: FlaskConical, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
  { id: 'backtest', label: 'Backtest', icon: Beaker, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
  { id: 'news', label: 'News', icon: Newspaper, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  { id: 'sec', label: 'SEC', icon: FileText, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
  { id: 'analyst', label: 'Social', icon: MessageCircle, color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/20' },
];

const METRICS = [
  { label: 'P/E', value: '32.4', icon: BarChart3 },
  { label: 'Market Cap', value: '$3.71T', icon: Activity },
  { label: 'Beta', value: '1.18', icon: Zap },
  { label: 'Avg Move', value: '1.42%', icon: Target },
];

const INSIGHTS = [
  { 
    id: 'rsi', 
    label: 'RSI Oversold', 
    value: '58% bounce rate', 
    sentiment: 'bullish' as const,
    icon: TrendingUp 
  },
  { 
    id: 'streak', 
    label: '3-Day Win Streak', 
    value: '72% reversal odds', 
    sentiment: 'caution' as const,
    icon: Activity 
  },
];

const FALLBACK_POINTS = [218, 225, 222, 230, 228, 235, 232, 240, 238, 245, 242, 248, 244, 252, 249, 243];

const W = 320;
const H = 100;
const PAD = 4;

function toPath(values: number[]) {
  const min = Math.min(...values) - 2;
  const max = Math.max(...values) + 2;
  const span = max - min || 1;
  return values
    .map((v, i) => {
      const x = PAD + (i / (values.length - 1)) * (W - PAD * 2);
      const y = H - PAD - ((v - min) / span) * (H - PAD * 2);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
}

function endPoint(values: number[]) {
  const min = Math.min(...values) - 2;
  const max = Math.max(...values) + 2;
  const span = max - min || 1;
  const last = values[values.length - 1];
  return {
    x: W - PAD,
    y: H - PAD - ((last - min) / span) * (H - PAD * 2),
  };
}

/** Downsample a series to at most `n` evenly spaced points. */
function sample(values: number[], n = 48) {
  if (values.length <= n) return values;
  const step = (values.length - 1) / (n - 1);
  return Array.from({ length: n }, (_, i) => values[Math.round(i * step)]);
}

const RANGES = ['1M', '3M', '6M', '1Y'] as const;

export function StockResearchDemo() {
  const navigate = useNavigate();
  const reduced = usePrefersReducedMotion();
  const [range, setRange] = useState<(typeof RANGES)[number]>('6M');

  const { data: bars, isLoading } = useChartData(DEMO_TICKER, range);

  const points = useMemo(
    () =>
      (bars ?? [])
        .filter((b) => Number.isFinite(b.price))
        .map((b) => ({ t: b.time * 1000, price: b.price })),
    [bars],
  );

  const isLive = points.length > 4;
  const last = isLive ? points[points.length - 1].price : DEMO_PRICE;
  const prev = isLive && points.length > 1 ? points[points.length - 2].price : DEMO_PRICE - DEMO_CHANGE;
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
    <DemoCard accent>
      <div className="flex flex-col gap-4">
        <DemoCardHeader
          icon={<LineChart className="h-4 w-4 text-cyan-400" />}
          category="Individual Stock Analysis"
          title="Research any ticker in depth"
          subtitle="Chart, fundamentals, quant signals, news, filings & more"
          right={<SampleBadge />}
        />

        {/* Mock ticker header */}
        <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 text-sm font-bold text-white">
              {DEMO_TICKER}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{DEMO_COMPANY}</p>
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

        {/* Mini chart */}
        <DemoVisual className="w-full">
          <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-950/60 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Price action</span>
              <span className="text-[10px] text-muted-foreground">{isLive ? '6M · live data' : isLoading ? 'Loading 6M…' : '6M view'}</span>
            </div>
            <div className="relative w-full" style={{ aspectRatio: '320 / 100' }}>
              <svg
                viewBox="0 0 320 100"
                className="h-full w-full"
                preserveAspectRatio="none"
                role="img"
                aria-label="AAPL 6-month price chart"
              >
                <defs>
                  <linearGradient id="demo-stock-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(185 80% 50%)" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="hsl(185 80% 50%)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d={`${toPath(series)} L316,100 4,100 Z`}
                  fill="url(#demo-stock-fill)"
                />
                <motion.path
                  d={toPath(series)}
                  fill="none"
                  stroke="hsl(185 80% 50%)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  initial={reduced ? { pathLength: 1 } : { pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: reduced ? 0 : 1.2, ease: 'easeOut' }}
                />
                {/* End dot */}
                <circle cx={dot.x} cy={dot.y} r="3" fill="hsl(185 80% 50%)" />
              </svg>
            </div>
          </div>
        </DemoVisual>

        {/* Research tabs */}
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Research tools</p>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
            {TABS.map((tab, i) => {
              const Icon = tab.icon;
              return (
                <motion.div
                  key={tab.id}
                  initial={reduced ? false : { opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: reduced ? 0 : 0.35, delay: i * 0.05 }}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-lg border p-2.5 transition-colors',
                    'bg-slate-900/50 hover:bg-slate-800/70',
                    tab.border
                  )}
                >
                  <Icon className={cn('h-4 w-4', tab.color)} />
                  <span className={cn('text-[9px] font-medium text-center leading-tight', tab.color)}>
                    {tab.label}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {METRICS.map((metric, i) => {
            const Icon = metric.icon;
            return (
              <motion.div
                key={metric.label}
                initial={reduced ? false : { opacity: 0, scale: 0.96 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: reduced ? 0 : 0.35, delay: i * 0.05 }}
                className="rounded-lg border border-slate-800 bg-slate-950/60 p-2.5"
              >
                <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                  <Icon className="h-3 w-3" />
                  {metric.label}
                </div>
                <p className="mt-1 text-sm font-bold text-white">{metric.value}</p>
              </motion.div>
            );
          })}
        </div>

        {/* AI insights */}
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">AI-generated insights</p>
          {INSIGHTS.map((insight, i) => {
            const Icon = insight.icon;
            const isBullish = insight.sentiment === 'bullish';
            return (
              <motion.div
                key={insight.id}
                initial={reduced ? false : { opacity: 0, x: -8 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: reduced ? 0 : 0.35, delay: i * 0.1 }}
                className={cn(
                  'flex items-center justify-between rounded-lg border p-2.5',
                  isBullish 
                    ? 'border-emerald-500/20 bg-emerald-500/5' 
                    : 'border-amber-500/20 bg-amber-500/5'
                )}
              >
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full',
                    isBullish ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
                  )}>
                    <Icon className="h-3 w-3" />
                  </span>
                  <div>
                    <p className={cn('text-[11px] font-semibold', isBullish ? 'text-emerald-400' : 'text-amber-400')}>
                      {insight.label}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{insight.value}</p>
                  </div>
                </div>
                <Sparkles className={cn('h-3.5 w-3.5', isBullish ? 'text-emerald-400' : 'text-amber-400')} />
              </motion.div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => navigate('/stock/AAPL')}
            className="flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 text-[11px] font-semibold text-white transition-all hover:from-cyan-400 hover:to-blue-500 active:scale-[0.99]"
          >
            <Search className="h-3.5 w-3.5" />
            Research any ticker
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
          <p className="text-center text-[10px] text-muted-foreground">
            Try it on AAPL, NVDA, TSLA, or any stock / ETF.
          </p>
        </div>
      </div>
    </DemoCard>
  );
}
