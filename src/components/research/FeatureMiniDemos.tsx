/**
 * Feature Mini Demos
 * Lightweight, fully client-side interactive demos used inside the
 * "Look inside" feature showcase on the Research page.
 *
 * IMPORTANT: these are clearly-labelled SAMPLE simulations for preview only.
 * They never call an API and never claim to be live market data — every demo
 * deep-links into the real feature where live data loads.
 */

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import {
  Play,
  RotateCcw,
  Sparkles,
  Landmark,
  Send,
  Check,
  Lock,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/* ───────────────────────── shared shell ───────────────────────── */

export function DemoFrame({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="relative rounded-lg border border-border/60 bg-background/60 overflow-hidden">
      <div className="flex items-center gap-2 px-3 h-8 border-b border-border/50 bg-muted/20">
        <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
        <span className="h-2 w-2 rounded-full bg-muted-foreground/20" />
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
          {title}
        </span>
        <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full border border-border/60 bg-muted/30 text-muted-foreground">
          sample
        </span>
      </div>
      <div className="p-3 sm:p-4 space-y-3">{children}</div>
      {action ? <div className="px-3 sm:px-4 pb-3">{action}</div> : null}
    </div>
  );
}

type ChipTone = "primary" | "sky" | "cyan" | "indigo" | "violet" | "teal";

const CHIP_ACTIVE: Record<ChipTone, string> = {
  primary: "border-primary/40 bg-primary/15 text-primary",
  sky: "border-sky-400/40 bg-sky-400/15 text-sky-300",
  cyan: "border-cyan-400/40 bg-cyan-400/15 text-cyan-300",
  indigo: "border-indigo-400/40 bg-indigo-400/15 text-indigo-300",
  violet: "border-violet-400/40 bg-violet-400/15 text-violet-300",
  teal: "border-teal-400/40 bg-teal-400/15 text-teal-300",
};

function Chip({
  active,
  onClick,
  children,
  tone = "primary",
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  tone?: ChipTone;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
        active
          ? CHIP_ACTIVE[tone]
          : "border-border/50 bg-muted/20 text-muted-foreground hover:text-foreground hover:bg-muted/40",
      )}
    >
      {children}
    </button>
  );
}

/* deterministic pseudo-random so results are stable per input */
function seeded(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

/* ───────────────────────── 1. Backtest demo ───────────────────────── */

const BT_TICKERS = ["SPY", "AAPL", "NVDA", "QQQ"];
const BT_STRATEGIES = [
  { id: "sma", label: "SMA 20/50 crossover", drift: 0.011, vol: 0.045, win: 62 },
  { id: "rsi", label: "RSI mean reversion", drift: 0.008, vol: 0.032, win: 71 },
  { id: "mom", label: "12-month momentum", drift: 0.014, vol: 0.058, win: 55 },
];

interface BtRun {
  curve: { i: number; label: string; strategy: number; benchmark: number }[];
  netProfit: number;
  cagr: number;
  sharpe: number;
  maxDd: number;
  winRate: number;
  trades: number;
}

function computeBacktest(ticker: string, stratId: string): BtRun {
  const strat = BT_STRATEGIES.find((s) => s.id === stratId)!;
  const rand = seeded(
    ticker.split("").reduce((a, c) => a + c.charCodeAt(0), 0) * 31 +
      stratId.length * 977,
  );
  const months = 72; // 6 years
  let sv = 10000;
  let bv = 10000;
  let peak = 10000;
  let maxDd = 0;
  const rets: number[] = [];
  const curve: BtRun["curve"] = [];

  for (let i = 0; i <= months; i++) {
    if (i > 0) {
      const shock = (rand() - 0.5) * 2 * strat.vol;
      const sr = strat.drift + shock;
      const br = 0.0075 + (rand() - 0.5) * 2 * 0.042;
      sv *= 1 + sr;
      bv *= 1 + br;
      rets.push(sr);
      peak = Math.max(peak, sv);
      maxDd = Math.min(maxDd, (sv - peak) / peak);
    }
    curve.push({
      i,
      label: `${2020 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}`,
      strategy: Math.round(sv),
      benchmark: Math.round(bv),
    });
  }

  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const sd =
    Math.sqrt(rets.reduce((a, b) => a + (b - mean) ** 2, 0) / rets.length) || 1e-6;
  return {
    curve,
    netProfit: (sv / 10000 - 1) * 100,
    cagr: ((sv / 10000) ** (12 / months) - 1) * 100,
    sharpe: (mean / sd) * Math.sqrt(12),
    maxDd: maxDd * 100,
    winRate: strat.win + Math.round(rand() * 6 - 3),
    trades: 28 + Math.round(rand() * 40),
  };
}

export function BacktestMiniDemo() {
  const [ticker, setTicker] = useState("SPY");
  const [stratId, setStratId] = useState("sma");
  const [status, setStatus] = useState<"idle" | "running" | "done">("idle");
  const [run, setRun] = useState<BtRun | null>(null);

  const start = () => {
    setStatus("running");
    setRun(null);
    window.setTimeout(() => {
      setRun(computeBacktest(ticker, stratId));
      setStatus("done");
    }, 700);
  };

  const metrics = run
    ? [
        {
          label: "Net profit",
          value: `${run.netProfit >= 0 ? "+" : ""}${run.netProfit.toFixed(1)}%`,
          good: run.netProfit >= 0,
        },
        { label: "CAGR", value: `${run.cagr.toFixed(1)}%`, good: run.cagr >= 0 },
        { label: "Sharpe", value: run.sharpe.toFixed(2), good: run.sharpe >= 1 },
        { label: "Win rate", value: `${run.winRate}%`, good: run.winRate >= 50 },
        { label: "Max DD", value: `${run.maxDd.toFixed(1)}%`, good: false },
        { label: "Trades", value: String(run.trades), good: true },
      ]
    : [];

  return (
    <DemoFrame title="Strategy backtester">
      <div className="flex flex-wrap items-center gap-1.5">
        {BT_TICKERS.map((t) => (
          <Chip key={t} active={t === ticker} onClick={() => setTicker(t)} tone="sky">
            {t}
          </Chip>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {BT_STRATEGIES.map((s) => (
          <Chip
            key={s.id}
            active={s.id === stratId}
            onClick={() => setStratId(s.id)}
            tone="sky"
          >
            {s.label}
          </Chip>
        ))}
      </div>

      <Button
        size="sm"
        variant="outline"
        onClick={start}
        disabled={status === "running"}
        className="h-8 border-sky-400/30 bg-sky-400/10 text-sky-300 hover:bg-sky-400/20 hover:text-sky-200"
      >
        {status === "running" ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Running 6 years of history…
          </>
        ) : status === "done" ? (
          <>
            <RotateCcw className="h-3.5 w-3.5" /> Run again
          </>
        ) : (
          <>
            <Play className="h-3.5 w-3.5" /> Run sample backtest
          </>
        )}
      </Button>

      {/* metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px rounded-md overflow-hidden bg-border/50">
        {(run ? metrics : Array.from({ length: 6 })).map((m: any, i) => (
          <div key={i} className="bg-background/80 px-2 py-1.5">
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground truncate">
              {m?.label ?? "—"}
            </p>
            {m ? (
              <p
                className={cn(
                  "text-sm font-semibold tabular-nums",
                  m.label === "Max DD"
                    ? "text-red-400"
                    : m.good
                      ? "text-emerald-400"
                      : "text-foreground/70",
                )}
              >
                {m.value}
              </p>
            ) : (
              <span className="mt-1 block h-3.5 w-10 rounded bg-muted-foreground/15" />
            )}
          </div>
        ))}
      </div>

      {/* equity curve */}
      <div className="h-[150px] sm:h-[190px] rounded-md border border-border/50 bg-muted/10 px-1 pt-2">
        {run ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={run.curve} margin={{ top: 4, right: 6, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="demoStratGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(199 89% 60%)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="hsl(199 89% 60%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="demoBenchGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(238 60% 65%)" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="hsl(238 60% 65%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis
                dataKey="label"
                interval={11}
                tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                width={36}
                tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                domain={["dataMin - 500", "dataMax + 500"]}
              />
              <ReferenceLine y={10000} stroke="hsl(var(--border))" strokeDasharray="4 4" />
              <Area
                type="monotone"
                dataKey="benchmark"
                stroke="hsl(238 60% 65%)"
                strokeWidth={1.4}
                fill="url(#demoBenchGrad)"
                dot={false}
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="strategy"
                stroke="hsl(199 89% 60%)"
                strokeWidth={2}
                fill="url(#demoStratGrad)"
                dot={false}
                animationDuration={900}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-[11px] text-muted-foreground">
              {status === "running"
                ? "Building the equity curve…"
                : "Pick a ticker and strategy, then run the sample"}
            </p>
          </div>
        )}
      </div>
      {run && (
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className="h-0.5 w-3 rounded-full bg-[hsl(199_89%_60%)]" /> Strategy
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className="h-0.5 w-3 rounded-full bg-[hsl(238_60%_65%)]" /> {ticker} buy &amp; hold
          </span>
        </div>
      )}
    </DemoFrame>
  );
}

/* ───────────────────────── 2. AI analysis demo ───────────────────────── */

const AI_SAMPLES: Record<string, { verdict: string; tone: string; lines: [string, string][] }> = {
  AAPL: {
    verdict: "Quality compounder · fairly valued",
    tone: "text-sky-400",
    lines: [
      ["Valuation", "28x forward earnings — a premium the services mix has historically earned."],
      ["Catalyst", "Installed-base upgrade cycle plus rising high-margin services revenue."],
      ["Risk", "China demand and regulatory pressure on App Store economics."],
    ],
  },
  NVDA: {
    verdict: "High growth · high expectations",
    tone: "text-emerald-400",
    lines: [
      ["Valuation", "Multiple only works if data-centre growth stays above consensus."],
      ["Catalyst", "Next-gen accelerator ramp and sustained hyperscaler capex."],
      ["Risk", "Customer concentration and any pause in AI infrastructure spend."],
    ],
  },
  KO: {
    verdict: "Defensive income · low volatility",
    tone: "text-violet-400",
    lines: [
      ["Valuation", "Trades near its 10-year average on a stable free-cash-flow base."],
      ["Catalyst", "Pricing power plus emerging-market volume recovery."],
      ["Risk", "FX translation and slow structural volume growth."],
    ],
  },
};

export function AiMiniDemo() {
  const [ticker, setTicker] = useState("AAPL");
  const [revealed, setRevealed] = useState(0);
  const [running, setRunning] = useState(false);
  const sample = AI_SAMPLES[ticker];

  const analyse = () => {
    setRunning(true);
    setRevealed(0);
    sample.lines.forEach((_, i) => {
      window.setTimeout(() => {
        setRevealed(i + 1);
        if (i === sample.lines.length - 1) setRunning(false);
      }, 350 * (i + 1));
    });
  };

  return (
    <DemoFrame title="AI analyst memo">
      <div className="flex flex-wrap items-center gap-1.5">
        {Object.keys(AI_SAMPLES).map((t) => (
          <Chip
            key={t}
            active={t === ticker}
            onClick={() => {
              setTicker(t);
              setRevealed(0);
            }}
            tone="primary"
          >
            {t}
          </Chip>
        ))}
      </div>

      <Button
        size="sm"
        variant="outline"
        onClick={analyse}
        disabled={running}
        className="h-8 border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
      >
        {running ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Analysing {ticker}…
          </>
        ) : (
          <>
            <Sparkles className="h-3.5 w-3.5" /> Generate sample thesis
          </>
        )}
      </Button>

      {revealed > 0 && (
        <p className={cn("text-xs font-semibold", sample.tone)}>{sample.verdict}</p>
      )}

      <div className="space-y-2">
        {sample.lines.map(([label, text], i) => (
          <div
            key={label}
            className={cn(
              "rounded-md border border-border/50 bg-muted/15 p-2.5 transition-all duration-300",
              i < revealed ? "opacity-100 translate-y-0" : "opacity-30 translate-y-1",
            )}
          >
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {label}
            </p>
            {i < revealed ? (
              <p className="text-[11px] leading-relaxed text-foreground/80 mt-1">{text}</p>
            ) : (
              <div className="mt-1.5 space-y-1.5">
                <span className="block h-2 w-[90%] rounded-full bg-muted-foreground/15" />
                <span className="block h-2 w-[60%] rounded-full bg-muted-foreground/10" />
              </div>
            )}
          </div>
        ))}
      </div>
    </DemoFrame>
  );
}

/* ───────────────────────── 3. Screener demo ───────────────────────── */

interface DemoRow {
  ticker: string;
  price: number;
  change: number;
  volume: number; // millions
  quality: number;
  momentum: number;
}

const SCREENER_ROWS: DemoRow[] = [
  { ticker: "NVDA", price: 128.4, change: 3.1, volume: 42.6, quality: 9, momentum: 88 },
  { ticker: "AMD", price: 162.9, change: 1.4, volume: 18.2, quality: 7, momentum: 71 },
  { ticker: "PLTR", price: 34.7, change: -1.9, volume: 26.4, quality: 6, momentum: 64 },
  { ticker: "AAPL", price: 214.2, change: 0.6, volume: 31.8, quality: 9, momentum: 52 },
  { ticker: "F", price: 11.2, change: -0.4, volume: 12.1, quality: 5, momentum: 28 },
  { ticker: "SOFI", price: 8.9, change: 2.2, volume: 9.4, quality: 4, momentum: 58 },
  { ticker: "KO", price: 63.5, change: 0.2, volume: 4.8, quality: 8, momentum: 33 },
  { ticker: "RIVN", price: 1.85, change: -3.4, volume: 15.7, quality: 3, momentum: 12 },
];

const SCREENER_FILTERS = [
  { id: "price", label: "Price > $2", test: (r: DemoRow) => r.price > 2 },
  { id: "vol", label: "Vol > 10M", test: (r: DemoRow) => r.volume > 10 },
  { id: "mom", label: "Momentum > 50", test: (r: DemoRow) => r.momentum > 50 },
  { id: "quality", label: "Quality 7+", test: (r: DemoRow) => r.quality >= 7 },
  { id: "up", label: "Up today", test: (r: DemoRow) => r.change > 0 },
];

function Sparkline({ seed, up }: { seed: number; up: boolean }) {
  const path = useMemo(() => {
    const rand = seeded(seed * 7919);
    let y = 10;
    const pts: string[] = [];
    for (let i = 0; i < 8; i++) {
      y += (rand() - (up ? 0.62 : 0.38)) * 5;
      y = Math.max(2, Math.min(15, y));
      pts.push(`${i * 7.5} ${y.toFixed(1)}`);
    }
    return "M" + pts.join(" L");
  }, [seed, up]);
  return (
    <svg width="56" height="18" viewBox="0 0 56 18" className="shrink-0">
      <path
        d={path}
        fill="none"
        strokeWidth="1.5"
        stroke="currentColor"
        className={up ? "text-emerald-400" : "text-red-400"}
      />
    </svg>
  );
}

export function ScreenerMiniDemo() {
  const [active, setActive] = useState<string[]>(["price", "vol"]);

  const rows = SCREENER_ROWS.filter((r) =>
    active.every((id) => SCREENER_FILTERS.find((f) => f.id === id)!.test(r)),
  );

  const toggle = (id: string) =>
    setActive((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <DemoFrame title="Market screener">
      <div className="flex flex-wrap items-center gap-1.5">
        {SCREENER_FILTERS.map((f) => (
          <Chip key={f.id} active={active.includes(f.id)} onClick={() => toggle(f.id)} tone="cyan">
            {f.label}
          </Chip>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">
        <span className="text-cyan-400 font-semibold tabular-nums">{rows.length}</span> of{" "}
        {SCREENER_ROWS.length} sample names match — toggle filters to watch the list narrow.
      </p>
      <div className="rounded-md border border-border/50 overflow-hidden">
        {rows.length === 0 ? (
          <p className="px-2.5 py-6 text-center text-[11px] text-muted-foreground">
            No matches — loosen a filter.
          </p>
        ) : (
          rows.map((r, i) => (
            <div
              key={r.ticker}
              className={cn(
                "flex items-center gap-2 sm:gap-3 px-2.5 py-2 border-b border-border/40 last:border-0 hover:bg-cyan-400/5 transition-colors",
                i % 2 === 1 && "bg-muted/10",
              )}
            >
              <span className="w-12 text-[11px] font-semibold text-foreground/85">{r.ticker}</span>
              <span className="w-14 text-[11px] tabular-nums text-muted-foreground">
                ${r.price.toFixed(2)}
              </span>
              <span
                className={cn(
                  "w-14 text-[11px] tabular-nums font-medium",
                  r.change >= 0 ? "text-emerald-400" : "text-red-400",
                )}
              >
                {r.change >= 0 ? "+" : ""}
                {r.change.toFixed(1)}%
              </span>
              <span className="hidden sm:inline w-16 text-[11px] tabular-nums text-muted-foreground">
                {r.volume.toFixed(1)}M
              </span>
              <span className="ml-auto flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">Q{r.quality}</span>
                <Sparkline seed={r.ticker.length + r.quality} up={r.change >= 0} />
              </span>
            </div>
          ))
        )}
      </div>
    </DemoFrame>
  );
}

/* ───────────────────────── 4. Smart money demo ───────────────────────── */

const SM_TABS = [
  { id: "13f", label: "13F filings" },
  { id: "insider", label: "Insider buys" },
  { id: "blocks", label: "Block trades" },
];

const SM_DATA: Record<string, { ticker: string; who: string; detail: string; delta: string }[]> = {
  "13f": [
    { ticker: "MSFT", who: "Large-cap growth fund", detail: "Added to position", delta: "+18%" },
    { ticker: "XOM", who: "Value manager", detail: "New position", delta: "New" },
    { ticker: "TSLA", who: "Multi-strategy fund", detail: "Trimmed position", delta: "-24%" },
  ],
  insider: [
    { ticker: "SOFI", who: "CFO", detail: "Open-market purchase", delta: "$1.2M" },
    { ticker: "RIVN", who: "Director cluster (3)", detail: "Purchases same week", delta: "$3.4M" },
    { ticker: "KO", who: "EVP", detail: "Open-market purchase", delta: "$640k" },
  ],
  blocks: [
    { ticker: "NVDA", who: "Dark-pool print", detail: "Above average size", delta: "820k sh" },
    { ticker: "AMD", who: "Sweep", detail: "Repeat prints at ask", delta: "410k sh" },
    { ticker: "PLTR", who: "Block cross", detail: "Single print", delta: "1.1M sh" },
  ],
};

export function SmartMoneyMiniDemo() {
  const [tab, setTab] = useState("13f");
  const rows = SM_DATA[tab];

  return (
    <DemoFrame title="Smart money signals">
      <div className="flex flex-wrap items-center gap-1.5">
        {SM_TABS.map((t) => (
          <Chip key={t.id} active={t.id === tab} onClick={() => setTab(t.id)} tone="indigo">
            {t.label}
          </Chip>
        ))}
      </div>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div
            key={r.ticker + tab}
            className="flex items-center gap-3 rounded-md border border-border/50 bg-muted/15 p-2.5 animate-in fade-in slide-in-from-bottom-1"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="h-8 w-8 rounded-md bg-indigo-400/15 border border-indigo-400/25 flex items-center justify-center shrink-0">
              <Landmark className="h-4 w-4 text-indigo-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-foreground/85">
                {r.ticker} <span className="font-normal text-muted-foreground">· {r.who}</span>
              </p>
              <p className="text-[10px] text-muted-foreground truncate">{r.detail}</p>
            </div>
            <span
              className={cn(
                "text-[11px] font-semibold tabular-nums shrink-0",
                r.delta.startsWith("-") ? "text-red-400" : "text-emerald-400",
              )}
            >
              {r.delta}
            </span>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground/70">
        Switch categories to see how each signal type is presented.
      </p>
    </DemoFrame>
  );
}

/* ───────────────────────── 5. Academy demo ───────────────────────── */

const LESSONS = [
  "How to read a 10-K in 20 minutes",
  "Building a DCF you can defend",
  "Position sizing and risk of ruin",
  "Turning a thesis into rules",
];

export function AcademyMiniDemo() {
  const [done, setDone] = useState<number[]>([0]);
  const pct = Math.round((done.length / LESSONS.length) * 100);
  const dash = 94;

  return (
    <DemoFrame title="Academy progress">
      <div className="flex items-center gap-3">
        <div className="relative h-14 w-14 shrink-0">
          <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90">
            <circle cx="18" cy="18" r="15" fill="none" strokeWidth="3" className="stroke-muted-foreground/15" />
            <circle
              cx="18"
              cy="18"
              r="15"
              fill="none"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={dash}
              strokeDashoffset={dash - (dash * pct) / 100}
              className="stroke-violet-400 transition-all duration-500"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold text-violet-300 tabular-nums">
            {pct}%
          </span>
        </div>
        <div>
          <p className="text-xs font-semibold text-foreground/85">Foundations track</p>
          <p className="text-[11px] text-muted-foreground">
            {done.length} of {LESSONS.length} sample lessons complete — tick one to see progress move.
          </p>
        </div>
      </div>
      <div className="space-y-1.5">
        {LESSONS.map((l, i) => {
          const complete = done.includes(i);
          const locked = i > 1 && !done.includes(i - 1) && !complete;
          return (
            <button
              key={l}
              type="button"
              disabled={locked}
              onClick={() =>
                setDone((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]))
              }
              className={cn(
                "w-full flex items-center gap-2 rounded-md border px-2.5 py-2 text-left transition-colors",
                complete
                  ? "border-violet-400/35 bg-violet-400/10"
                  : "border-border/50 bg-muted/15 hover:bg-muted/30",
                locked && "opacity-50 cursor-not-allowed",
              )}
            >
              <span
                className={cn(
                  "h-4 w-4 rounded-full border flex items-center justify-center shrink-0",
                  complete ? "border-violet-400 bg-violet-400/20" : "border-muted-foreground/30",
                )}
              >
                {complete ? (
                  <Check className="h-2.5 w-2.5 text-violet-300" />
                ) : locked ? (
                  <Lock className="h-2 w-2 text-muted-foreground" />
                ) : null}
              </span>
              <span className="text-[11px] text-foreground/80">{l}</span>
            </button>
          );
        })}
      </div>
    </DemoFrame>
  );
}

/* ───────────────────────── 6. Community demo ───────────────────────── */

const SEED_MESSAGES = [
  { who: "Chris · PM", text: "NVDA setup only works if capex guidance holds. Watching the ramp.", mine: false },
  { who: "You", text: "Sizing it at 2% risk until the next print.", mine: true },
  { who: "Dana", text: "Backtested that entry — 61% hit rate over 5 years, drawdown was the issue.", mine: false },
];

const CANNED_REPLIES = [
  "Fair — post the equity curve and we can pull it apart.",
  "Agreed on sizing. What's your invalidation level?",
  "That matches what the 13F flow showed last quarter.",
];

export function CommunityMiniDemo() {
  const [messages, setMessages] = useState(SEED_MESSAGES);
  const [draft, setDraft] = useState("");

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setMessages((prev) => [...prev, { who: "You", text, mine: true }]);
    setDraft("");
    const reply = CANNED_REPLIES[messages.length % CANNED_REPLIES.length];
    window.setTimeout(
      () => setMessages((prev) => [...prev, { who: "Dana", text: reply, mine: false }]),
      800,
    );
  };

  return (
    <DemoFrame title="Research chatroom">
      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
        {messages.map((m, i) => (
          <div key={i} className={cn("flex gap-2", m.mine && "flex-row-reverse")}>
            <div className="h-7 w-7 rounded-full bg-teal-400/15 border border-teal-400/25 shrink-0" />
            <div
              className={cn(
                "max-w-[78%] rounded-lg border p-2.5",
                m.mine
                  ? "border-teal-400/30 bg-teal-400/10"
                  : "border-border/50 bg-muted/20",
              )}
            >
              <p className="text-[10px] font-medium text-muted-foreground">{m.who}</p>
              <p className="text-[11px] leading-relaxed text-foreground/85 mt-0.5">{m.text}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Try posting a thesis…"
          aria-label="Sample chat message"
          className="flex-1 min-w-0 rounded-md border border-border/60 bg-background/70 px-2.5 py-1.5 text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-teal-400/40"
        />
        <Button
          size="sm"
          variant="outline"
          onClick={send}
          className="h-8 border-teal-400/30 bg-teal-400/10 text-teal-300 hover:bg-teal-400/20 hover:text-teal-200"
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="flex items-center gap-2 rounded-md border border-border/50 bg-muted/15 px-2.5 py-2">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
        <p className="text-[11px] text-foreground/75">Livestream · market open recap</p>
      </div>
    </DemoFrame>
  );
}
