/**
 * Mini Backtester Demo
 * A compact, read-only version of the backtester for the marketing section.
 * Uses static data to showcase the platform's actual UI patterns.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { TrendingUp, Activity, Shield, Target, BarChart3, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Static equity curve data (simulated SMA crossover on SPY 2019–2024) ──
const equityCurve = [
  { date: '2019-01', portfolio: 10000, benchmark: 10000 },
  { date: '2019-04', portfolio: 10820, benchmark: 10640 },
  { date: '2019-07', portfolio: 11400, benchmark: 11100 },
  { date: '2019-10', portfolio: 11050, benchmark: 10800 },
  { date: '2020-01', portfolio: 12200, benchmark: 11900 },
  { date: '2020-04', portfolio: 9800, benchmark: 8400 },
  { date: '2020-07', portfolio: 11600, benchmark: 10900 },
  { date: '2020-10', portfolio: 12300, benchmark: 11500 },
  { date: '2021-01', portfolio: 13800, benchmark: 12800 },
  { date: '2021-04', portfolio: 14600, benchmark: 13900 },
  { date: '2021-07', portfolio: 15200, benchmark: 14600 },
  { date: '2021-10', portfolio: 15800, benchmark: 15300 },
  { date: '2022-01', portfolio: 16400, benchmark: 15100 },
  { date: '2022-04', portfolio: 14200, benchmark: 13200 },
  { date: '2022-07', portfolio: 14800, benchmark: 13800 },
  { date: '2022-10', portfolio: 13600, benchmark: 12400 },
  { date: '2023-01', portfolio: 14900, benchmark: 13500 },
  { date: '2023-04', portfolio: 15600, benchmark: 14200 },
  { date: '2023-07', portfolio: 16800, benchmark: 15000 },
  { date: '2023-10', portfolio: 16200, benchmark: 14400 },
  { date: '2024-01', portfolio: 17800, benchmark: 15800 },
  { date: '2024-04', portfolio: 18600, benchmark: 16500 },
  { date: '2024-07', portfolio: 19400, benchmark: 17200 },
  { date: '2024-10', portfolio: 20200, benchmark: 17800 },
];

const metrics = [
  { label: 'Net Profit', value: '+102.0%', color: 'text-emerald-400', icon: TrendingUp },
  { label: 'CAGR', value: '12.8%', color: 'text-emerald-400', icon: BarChart3 },
  { label: 'Sharpe', value: '1.42', color: 'text-blue-400', icon: Activity },
  { label: 'Win Rate', value: '68.3%', color: 'text-emerald-400', icon: Target },
  { label: 'Max DD', value: '-18.4%', color: 'text-red-400', icon: Shield },
  { label: 'Trades', value: '47', color: 'text-white/70', icon: Zap },
];

const strategyParams = [
  { label: 'Strategy', value: 'SMA Crossover' },
  { label: 'Ticker', value: 'SPY' },
  { label: 'Period', value: '2019 – 2024' },
  { label: 'Fast / Slow', value: '20 / 50' },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900/95 border border-white/10 rounded-lg px-3 py-2 text-xs shadow-xl backdrop-blur-sm">
      <p className="text-white/40 mb-1 font-mono">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="font-mono" style={{ color: p.color }}>
          {p.name}: ${p.value.toLocaleString()}
        </p>
      ))}
    </div>
  );
};

export function MiniBacktesterDemo() {
  const [hoveredMetric, setHoveredMetric] = useState<number | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="mb-12 sm:mb-20"
    >
      <p className="text-left sm:text-center text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.2em] sm:tracking-[0.25em] text-white/20 mb-4 sm:mb-6">
        See it in action
      </p>

      <div className="relative rounded-xl sm:rounded-2xl overflow-hidden border border-white/[0.08] bg-[#0a0f1a] shadow-[0_20px_80px_-20px_rgba(0,220,220,0.12)]">
        {/* Header bar */}
        <div className="flex items-center justify-between px-3 sm:px-5 py-2.5 sm:py-3 border-b border-white/[0.06] bg-white/[0.02]">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
            </div>
            <span className="text-[10px] sm:text-xs font-mono text-white/30 hidden sm:inline">
              Strategy Backtester
            </span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            {strategyParams.map((p) => (
              <span
                key={p.label}
                className="text-[8px] sm:text-[10px] font-mono px-1.5 sm:px-2 py-0.5 rounded bg-white/[0.05] border border-white/[0.08] text-white/40"
              >
                <span className="text-white/20">{p.label}:</span> {p.value}
              </span>
            ))}
          </div>
        </div>

        {/* Metrics row */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-px bg-white/[0.04]">
          {metrics.map((m, i) => (
            <div
              key={m.label}
              className={cn(
                "px-2 sm:px-4 py-2 sm:py-3 bg-[#0a0f1a] transition-colors duration-200",
                hoveredMetric === i && "bg-white/[0.03]"
              )}
              onMouseEnter={() => setHoveredMetric(i)}
              onMouseLeave={() => setHoveredMetric(null)}
            >
              <div className="flex items-center gap-1 mb-0.5">
                <m.icon className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white/20" />
                <span className="text-[8px] sm:text-[10px] text-white/30 font-mono uppercase tracking-wider">
                  {m.label}
                </span>
              </div>
              <span className={cn("text-sm sm:text-lg font-bold font-mono", m.color)}>
                {m.value}
              </span>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="px-2 sm:px-4 pt-3 sm:pt-4 pb-2 sm:pb-3">
          <div className="h-[180px] sm:h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equityCurve} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="miniPortfolioGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(185 80% 50%)" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="hsl(185 80% 50%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="miniBenchmarkGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(270 70% 60%)" stopOpacity={0.1} />
                    <stop offset="100%" stopColor="hsl(270 70% 60%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.04)"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.2)' }}
                  tickLine={false}
                  axisLine={false}
                  interval={5}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.2)' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  domain={['dataMin - 500', 'dataMax + 500']}
                  width={40}
                />
                <RechartsTooltip content={<CustomTooltip />} />
                <ReferenceLine
                  y={10000}
                  stroke="rgba(255,255,255,0.08)"
                  strokeDasharray="4 4"
                />
                <Area
                  type="monotone"
                  dataKey="benchmark"
                  name="SPY (Buy & Hold)"
                  stroke="hsl(270 70% 60%)"
                  strokeWidth={1.5}
                  fill="url(#miniBenchmarkGrad)"
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="portfolio"
                  name="Strategy"
                  stroke="hsl(185 80% 50%)"
                  strokeWidth={2}
                  fill="url(#miniPortfolioGrad)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 sm:gap-6 mt-1 sm:mt-2 pb-1">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 rounded-full bg-[hsl(185_80%_50%)]" />
              <span className="text-[9px] sm:text-[10px] text-white/30 font-mono">Strategy</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 rounded-full bg-[hsl(270_70%_60%)]" />
              <span className="text-[9px] sm:text-[10px] text-white/30 font-mono">SPY (Benchmark)</span>
            </div>
          </div>
        </div>

        {/* Inner ring overlay */}
        <div className="absolute inset-0 rounded-xl sm:rounded-2xl ring-1 ring-inset ring-white/[0.06] pointer-events-none" />
      </div>
    </motion.div>
  );
}
