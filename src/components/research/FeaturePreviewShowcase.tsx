/**
 * Feature Preview Showcase
 * Tabbed, visual "look inside" previews of the platform's best features.
 * The mini panels are illustrative UI previews (clearly labelled) that mirror
 * the real product layouts — every tab deep-links into the live feature.
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles,
  LineChart,
  Filter,
  Landmark,
  GraduationCap,
  MessagesSquare,
  ArrowRight,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AiMiniDemo,
  BacktestMiniDemo,
  ScreenerMiniDemo,
  SmartMoneyMiniDemo,
  AcademyMiniDemo,
  CommunityMiniDemo,
} from "@/components/research/FeatureMiniDemos";
import {
  FEATURE_VIDEOS,
  FeatureVideoPreview,
  type FeatureVideoKey,
} from "@/components/research/FeatureVideoPreview";

type TabKey = "ai" | "backtest" | "screener" | "smart" | "academy" | "community";

interface TabDef {
  key: TabKey;
  label: string;
  icon: typeof Sparkles;
  headline: string;
  blurb: string;
  cta: string;
  to: string;
  accent: string; // text colour token-ish class
  ring: string;
}

const TABS: TabDef[] = [
  {
    key: "backtest",
    label: "Backtester",
    icon: LineChart,
    headline: "Prove the idea before you risk a dollar",
    blurb:
      "Build rules with no code, run them over years of history, and read the metrics that matter — CAGR, Sharpe, drawdown and trade-by-trade detail against a benchmark.",
    cta: "Test a strategy now",
    to: "/stock/SPY?tab=backtest",
    accent: "text-sky-400",
    ring: "ring-sky-400/30",
  },
  {
    key: "ai",
    label: "AI Analysis",
    icon: Sparkles,
    headline: "Institutional-grade research in one search",
    blurb:
      "Type any ticker and get a structured thesis: valuation, catalysts, risks and the numbers behind them — written like a senior analyst memo, not a chatbot answer.",
    cta: "Analyse a ticker",
    to: "/stock/AAPL",
    accent: "text-primary",
    ring: "ring-primary/30",
  },
  {
    key: "screener",
    label: "Screener",
    icon: Filter,
    headline: "Scan the whole market in seconds",
    blurb:
      "Filter thousands of names on price, volume, momentum and quality, then hover any row for an instant chart plus key stats without leaving the table.",
    cta: "Open the screener",
    to: "/research",
    accent: "text-cyan-400",
    ring: "ring-cyan-400/30",
  },
  {
    key: "smart",
    label: "Smart Money",
    icon: Landmark,
    headline: "See what the funds are doing",
    blurb:
      "13F positioning, insider buying and unusual block activity, distilled into signals you can act on — so you know who is accumulating before the headline lands.",
    cta: "Follow the money",
    to: "/smart-money",
    accent: "text-indigo-400",
    ring: "ring-indigo-400/30",
  },
  {
    key: "academy",
    label: "Academy",
    icon: GraduationCap,
    headline: "Learn the process, not just the tickers",
    blurb:
      "Structured lessons from a hedge fund manager covering valuation, risk sizing and strategy design, with progress tracking so you always know what's next.",
    cta: "Start learning free",
    to: "/academy",
    accent: "text-violet-400",
    ring: "ring-violet-400/30",
  },
  {
    key: "community",
    label: "Chatroom",
    icon: MessagesSquare,
    headline: "Trade ideas, pressure-tested live",
    blurb:
      "Share your thesis, get pushback, and follow real-time discussion and livestreams with other serious investors instead of scrolling anonymous noise.",
    cta: "Join the conversation",
    to: "/community",
    accent: "text-teal-400",
    ring: "ring-teal-400/30",
  },
];

/* ───────── Hover / tap peek cards ───────── */

interface PeekDef {
  metrics: { label: string; value: string }[];
  hint: string;
  stroke: string; // tailwind text-* used as currentColor for the thumb
  wash: string;
}

const PEEKS: Record<TabKey, PeekDef> = {
  ai: {
    metrics: [
      { label: "Sections", value: "6" },
      { label: "Avg. time", value: "~8s" },
      { label: "Coverage", value: "10k+" },
    ],
    hint: "Valuation, catalysts and risks in one memo",
    stroke: "text-primary",
    wash: "from-primary/15",
  },
  backtest: {
    metrics: [
      { label: "History", value: "20 yrs" },
      { label: "Metrics", value: "18+" },
      { label: "Code", value: "None" },
    ],
    hint: "CAGR, Sharpe and drawdown vs. benchmark",
    stroke: "text-sky-400",
    wash: "from-sky-400/15",
  },
  screener: {
    metrics: [
      { label: "Universe", value: "10k+" },
      { label: "Filters", value: "25+" },
      { label: "Row peek", value: "Instant" },
    ],
    hint: "Hover any row for a chart plus key stats",
    stroke: "text-cyan-400",
    wash: "from-cyan-400/15",
  },
  smart: {
    metrics: [
      { label: "13F funds", value: "500+" },
      { label: "Insiders", value: "Daily" },
      { label: "Blocks", value: "Live" },
    ],
    hint: "See who is accumulating before the headline",
    stroke: "text-indigo-400",
    wash: "from-indigo-400/15",
  },
  academy: {
    metrics: [
      { label: "Lessons", value: "92" },
      { label: "Tracks", value: "6" },
      { label: "Start", value: "Free" },
    ],
    hint: "Structured path from beginner to confident",
    stroke: "text-violet-400",
    wash: "from-violet-400/15",
  },
  community: {
    metrics: [
      { label: "Rooms", value: "Live" },
      { label: "Streams", value: "Weekly" },
      { label: "Notes", value: "Shared" },
    ],
    hint: "Pressure-test a thesis with real investors",
    stroke: "text-teal-400",
    wash: "from-teal-400/15",
  },
};

/** Tiny schematic thumbnail per feature — pure SVG, no network cost. */
function PeekThumb({ tab, className }: { tab: TabKey; className?: string }) {
  const stroke = PEEKS[tab].stroke;
  return (
    <svg
      viewBox="0 0 96 56"
      className={cn("h-full w-full", stroke, className)}
      aria-hidden="true"
    >
      <rect x="0" y="0" width="96" height="56" rx="6" className="fill-current opacity-[0.06]" />
      {tab === "ai" && (
        <g>
          <rect x="8" y="10" width="34" height="4" rx="2" className="fill-current opacity-70" />
          <rect x="8" y="20" width="24" height="3" rx="1.5" className="fill-current opacity-30" />
          {[0, 1, 2].map((i) => (
            <rect
              key={i}
              x={8 + i * 27}
              y={30}
              width="22"
              height="16"
              rx="3"
              className="fill-current opacity-20"
            />
          ))}
        </g>
      )}
      {tab === "backtest" && (
        <g fill="none" strokeLinecap="round">
          <path
            d="M8 44 L20 38 L30 41 L42 28 L54 32 L68 20 L88 12"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M8 47 L24 44 L40 45 L58 38 L74 36 L88 30"
            stroke="currentColor"
            strokeWidth="1.2"
            className="opacity-35"
          />
        </g>
      )}
      {tab === "screener" && (
        <g>
          {[0, 1, 2, 3].map((i) => (
            <g key={i}>
              <rect x="8" y={12 + i * 10} width="18" height="4" rx="2" className="fill-current opacity-55" />
              <rect x="31" y={12 + i * 10} width="12" height="4" rx="2" className="fill-current opacity-25" />
              <path
                d={`M52 ${16 + i * 10} L62 ${13 + i * 10} L72 ${17 + i * 10} L88 ${11 + i * 10}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.3"
                className="opacity-70"
              />
            </g>
          ))}
        </g>
      )}
      {tab === "smart" && (
        <g>
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <circle cx="15" cy={16 + i * 14} r="5" className="fill-current opacity-30" />
              <rect x="26" y={13 + i * 14} width={44 - i * 10} height="5" rx="2.5" className="fill-current opacity-45" />
            </g>
          ))}
          {[4, 7, 5, 9, 6, 11].map((h, i) => (
            <rect
              key={i}
              x={76 + i * 3.4}
              y={48 - h * 2.6}
              width="2.2"
              height={h * 2.6}
              rx="1"
              className="fill-current opacity-60"
            />
          ))}
        </g>
      )}
      {tab === "academy" && (
        <g>
          <circle cx="22" cy="28" r="12" fill="none" stroke="currentColor" strokeWidth="3" className="opacity-20" />
          <circle
            cx="22"
            cy="28"
            r="12"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="75"
            strokeDashoffset="30"
            transform="rotate(-90 22 28)"
          />
          {[0, 1, 2].map((i) => (
            <rect key={i} x="44" y={16 + i * 11} width={44 - i * 8} height="5" rx="2.5" className="fill-current opacity-35" />
          ))}
        </g>
      )}
      {tab === "community" && (
        <g>
          <rect x="8" y="12" width="52" height="14" rx="6" className="fill-current opacity-25" />
          <rect x="36" y="30" width="52" height="14" rx="6" className="fill-current opacity-45" />
          <circle cx="86" cy="14" r="3" className="fill-current" />
        </g>
      )}
    </svg>
  );
}

function PeekCard({ tab }: { tab: TabDef }) {
  const peek = PEEKS[tab.key];
  const Icon = tab.icon;
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute left-3 right-3 sm:left-5 top-full z-30 -mt-1 sm:right-auto sm:w-[340px] animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 duration-150"
    >
      <div
        className="relative overflow-hidden rounded-xl border border-border/70 bg-popover p-3 shadow-2xl"
      >
        <span
          aria-hidden="true"
          className={cn("absolute inset-0 bg-gradient-to-br to-transparent", peek.wash)}
        />
        <div className="relative">
        <div className="flex items-start gap-3">
          <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg border border-border/60 bg-background/70">
            <PeekThumb tab={tab.key} />
          </div>
          <div className="min-w-0">
            <p className={cn("flex items-center gap-1.5 text-xs font-semibold", tab.accent)}>
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </p>
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground line-clamp-2">
              {peek.hint}
            </p>
          </div>
        </div>
        <div className="mt-2.5 grid grid-cols-3 gap-px overflow-hidden rounded-md bg-border/50">
          {peek.metrics.map((m) => (
            <div key={m.label} className="bg-background/80 px-2 py-1.5">
              <p className="truncate text-[9px] uppercase tracking-wider text-muted-foreground">
                {m.label}
              </p>
              <p className={cn("text-xs font-semibold tabular-nums", tab.accent)}>{m.value}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 flex items-center gap-1 text-[10px] font-medium text-foreground/70">
          {tab.cta}
          <ArrowRight className="h-3 w-3" />
        </p>
        </div>
      </div>
    </div>
  );
}

function PreviewFor({ tab }: { tab: TabKey }) {
  switch (tab) {
    case "ai":
      return <AiMiniDemo />;
    case "backtest":
      return <BacktestMiniDemo />;
    case "screener":
      return <ScreenerMiniDemo />;
    case "smart":
      return <SmartMoneyMiniDemo />;
    case "academy":
      return <AcademyMiniDemo />;
    case "community":
      return <CommunityMiniDemo />;
  }
}

export function FeaturePreviewShowcase() {
  const [active, setActive] = useState<TabKey>("ai");
  const [peek, setPeek] = useState<TabKey | null>(null);
  const [mode, setMode] = useState<"clip" | "demo">("clip");
  const tab = TABS.find((t) => t.key === active)!;
  const peekTab = peek ? TABS.find((t) => t.key === peek)! : null;
  const clip = FEATURE_VIDEOS[active as FeatureVideoKey] as
    | (typeof FEATURE_VIDEOS)[FeatureVideoKey]
    | undefined;
  const showClip = Boolean(clip) && mode === "clip";

  // Click selects the tab and pins the peek briefly (the touch path); hover
  // just reveals the peek without switching the demo underneath.
  const showPeek = (key: TabKey, select: boolean) => {
    setPeek(key);
    if (select) {
      setActive(key);
      setMode("clip");
      window.setTimeout(() => setPeek((p) => (p === key ? null : p)), 2200);
    }
  };

  return (
    <div className="relative group">
      {/* Ambient neon glow behind the demo section */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -inset-1 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 opacity-20 blur-lg transition duration-1000 group-hover:opacity-35"
      />

      <section className="relative overflow-hidden rounded-xl border border-cyan-500/30 bg-slate-950/85 shadow-[0_24px_60px_-24px_rgb(2_6_23/0.9),0_2px_10px_-4px_rgb(2_6_23/0.6)] backdrop-blur-sm transition-colors hover:border-cyan-500/45">
        {/* Top inner highlight — the surface catching light */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/15 to-transparent"
        />

        <header className="px-3 sm:px-5 pt-3 sm:pt-4 pb-2.5 sm:pb-3">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/25 bg-cyan-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-cyan-400">
            <Sparkles className="h-3 w-3" />
            Product Preview
          </div>
          <h2 className="font-display text-lg sm:text-2xl font-semibold text-foreground mt-2">
            See the platform before you commit
          </h2>
        </header>

        {/* Tab rail — hover (desktop) or tap (mobile) reveals a peek card */}
        <div className="relative z-20 px-3 sm:px-5">
          <div className="flex gap-1.5 overflow-x-auto snap-x pb-3 -mx-1 px-1 scrollbar-none [-webkit-overflow-scrolling:touch]">
            {TABS.map((t) => {
              const Icon = t.icon;
              const isActive = t.key === active;
              const isPeeking = t.key === peek;
              return (
                <div key={t.key} className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => showPeek(t.key, true)}
                    onMouseEnter={() => showPeek(t.key, false)}
                    onMouseLeave={() => setPeek((p) => (p === t.key ? null : p))}
                    onFocus={() => setPeek(t.key)}
                    onBlur={() => setPeek((p) => (p === t.key ? null : p))}
                    aria-pressed={isActive}
                    aria-describedby={isPeeking ? `peek-${t.key}` : undefined}
                    className={cn(
                      "inline-flex snap-start items-center gap-1.5 rounded-full border px-3 py-2 sm:py-1.5 text-xs font-medium transition-all active:scale-[0.97]",
                      isActive
                        ? cn("border-cyan-500/35 bg-cyan-500/10 text-foreground ring-1 ring-cyan-500/30 shadow-[0_0_20px_-6px_rgba(6,182,212,0.25)]", t.accent)
                        : "border-border/50 bg-muted/20 text-muted-foreground hover:text-foreground hover:bg-muted/40",
                    )}
                  >
                    <Icon className={cn("h-3.5 w-3.5", isActive ? t.accent : "")} />
                    {t.label}
                  </button>
                </div>
              );
            })}
          </div>
          {peekTab && (
            <div id={`peek-${peekTab.key}`}>
              <PeekCard tab={peekTab} />
            </div>
          )}
        </div>

        <div className="grid gap-3 sm:gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-center px-3 sm:px-5 pb-4 sm:pb-5">
          {/* Copy side */}
          <div className="order-2 lg:order-1 flex flex-col justify-center gap-2.5 sm:gap-3 pt-1">
            <h3 className={cn("font-display text-[15px] sm:text-xl font-semibold", tab.accent)}>
              {tab.headline}
            </h3>
            <p className="text-[13px] sm:text-sm text-muted-foreground leading-relaxed">{tab.blurb}</p>
            <Link
              to={tab.to}
              className="inline-flex w-full sm:w-fit items-center justify-center sm:justify-start gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-2.5 sm:py-2 text-sm font-medium text-cyan-300 transition-colors hover:bg-cyan-500/20 active:scale-[0.99]"
            >
              {tab.cta}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground/70">
              <Info className="h-3 w-3" />
              {showClip
                ? "13-second silent preview clip — switch to the interactive sample to try it"
                : "Interactive sample — try it here, then open the feature for live data"}
            </p>
          </div>

          {/* Visual preview side */}
          <div className="order-1 lg:order-2 min-w-0">
            {clip && (
              <div className="mb-2 flex items-center gap-1">
                {(["clip", "demo"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    aria-pressed={mode === m}
                    className={cn(
                      "rounded-full border px-3 py-1.5 sm:py-1 text-[11px] sm:text-[10px] font-medium transition-colors",
                      mode === m
                        ? cn("border-cyan-500/35 bg-cyan-500/10 text-foreground ring-1 ring-cyan-500/30", tab.accent)
                        : "border-border/50 bg-muted/20 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {m === "clip" ? "Watch preview" : "Try it yourself"}
                  </button>
                ))}
              </div>
            )}
            <div className="-mx-3 rounded-none border-y border-cyan-500/15 bg-slate-900/50 p-1.5 shadow-inner sm:mx-0 sm:rounded-xl sm:border sm:p-2">
              {showClip && clip ? (
                <FeatureVideoPreview video={clip} accent={tab.accent} />
              ) : (
                <PreviewFor tab={active} />
              )}
            </div>

          </div>
        </div>

        {/* Bottom progress bar accent */}
        <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-900">
          <div className="h-full w-1/3 bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.6)]" />
        </div>
      </section>
    </div>
  );
}
