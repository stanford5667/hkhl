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
import { MiniBacktesterDemo } from "@/components/research/MiniBacktesterDemo";

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

/* ─────────────── Illustrative mini previews (pure UI, no live claims) ─────────────── */

function PreviewFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative rounded-lg border border-border/60 bg-background/60 overflow-hidden">
      <div className="flex items-center gap-1.5 px-3 h-7 border-b border-border/50 bg-muted/20">
        <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
        <span className="h-2 w-2 rounded-full bg-muted-foreground/20" />
        <span className="h-2 w-2 rounded-full bg-muted-foreground/10" />
      </div>
      <div className="p-3 sm:p-4">{children}</div>
    </div>
  );
}

function Bar({ w, tone = "muted" }: { w: string; tone?: "muted" | "accent" | "strong" }) {
  return (
    <span
      className={cn(
        "block h-2 rounded-full",
        tone === "muted" && "bg-muted-foreground/15",
        tone === "strong" && "bg-muted-foreground/30",
        tone === "accent" && "bg-primary/40",
      )}
      style={{ width: w }}
    />
  );
}

function AiPreview() {
  return (
    <PreviewFrame>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-primary/15 border border-primary/25 flex items-center justify-center">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="flex-1 space-y-1.5">
            <Bar w="45%" tone="strong" />
            <Bar w="28%" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {["Valuation", "Catalysts", "Risks"].map((t) => (
            <div key={t} className="rounded-md border border-border/50 bg-muted/20 p-2 space-y-1.5">
              <p className="text-[10px] font-medium text-muted-foreground">{t}</p>
              <Bar w="80%" tone="accent" />
              <Bar w="60%" />
            </div>
          ))}
        </div>
        <div className="space-y-1.5">
          <Bar w="95%" />
          <Bar w="88%" />
          <Bar w="70%" />
        </div>
      </div>
    </PreviewFrame>
  );
}

function ScreenerPreview() {
  return (
    <PreviewFrame>
      <div className="space-y-2">
        <div className="flex gap-1.5 flex-wrap">
          {["Price > $2", "Vol > 500k", "Momentum", "Quality 7+"].map((f) => (
            <span
              key={f}
              className="text-[10px] px-2 py-0.5 rounded-full border border-primary/25 bg-primary/10 text-primary"
            >
              {f}
            </span>
          ))}
        </div>
        <div className="rounded-md border border-border/50 overflow-hidden">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={cn(
                "flex items-center gap-3 px-2.5 py-2 border-b border-border/40 last:border-0",
                i === 1 && "bg-primary/5",
              )}
            >
              <span className="h-2 w-10 rounded bg-muted-foreground/30" />
              <Bar w="18%" />
              <Bar w="14%" />
              <span className="ml-auto">
                <svg width="54" height="16" viewBox="0 0 54 16" className="opacity-80">
                  <path
                    d="M1 12 L10 9 L18 11 L27 5 L36 7 L45 3 L53 4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className={i % 2 === 0 ? "text-emerald-400" : "text-cyan-400"}
                  />
                </svg>
              </span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground">Hover a row for an instant chart + key stats</p>
      </div>
    </PreviewFrame>
  );
}

function SmartMoneyPreview() {
  return (
    <PreviewFrame>
      <div className="space-y-2.5">
        {["13F accumulation", "Insider cluster buy", "Unusual block prints"].map((t, i) => (
          <div
            key={t}
            className="flex items-center gap-3 rounded-md border border-border/50 bg-muted/15 p-2.5"
          >
            <div className="h-7 w-7 rounded-md bg-indigo-400/15 border border-indigo-400/25 flex items-center justify-center">
              <Landmark className="h-3.5 w-3.5 text-indigo-400" />
            </div>
            <div className="flex-1 space-y-1.5">
              <p className="text-[11px] font-medium text-foreground/80">{t}</p>
              <Bar w={`${70 - i * 12}%`} />
            </div>
            <div className="flex items-end gap-0.5 h-6">
              {[3, 5, 4, 6, 5, 7].map((h, k) => (
                <span
                  key={k}
                  className="w-1 rounded-sm bg-indigo-400/50"
                  style={{ height: `${h * 3}px` }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </PreviewFrame>
  );
}

function AcademyPreview() {
  return (
    <PreviewFrame>
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative h-12 w-12">
            <svg viewBox="0 0 36 36" className="h-12 w-12 -rotate-90">
              <circle cx="18" cy="18" r="15" fill="none" strokeWidth="3" className="stroke-muted-foreground/15" />
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="94"
                strokeDashoffset="38"
                className="stroke-violet-400"
              />
            </svg>
          </div>
          <div className="flex-1 space-y-1.5">
            <Bar w="55%" tone="strong" />
            <Bar w="35%" />
          </div>
        </div>
        <div className="space-y-1.5">
          {["Module 1 · Valuation", "Module 2 · Risk sizing", "Module 3 · Strategy design"].map((m, i) => (
            <div
              key={m}
              className="flex items-center gap-2 rounded-md border border-border/50 bg-muted/15 px-2.5 py-2"
            >
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  i === 0 ? "bg-violet-400" : "bg-muted-foreground/25",
                )}
              />
              <p className="text-[11px] text-foreground/75">{m}</p>
              <span className="ml-auto text-[10px] text-muted-foreground">
                {i === 0 ? "In progress" : "Locked"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </PreviewFrame>
  );
}

function CommunityPreview() {
  return (
    <PreviewFrame>
      <div className="space-y-2.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className={cn("flex gap-2.5", i === 1 && "flex-row-reverse text-right")}>
            <div className="h-7 w-7 rounded-full bg-teal-400/15 border border-teal-400/25 shrink-0" />
            <div className={cn("space-y-1.5 max-w-[75%] rounded-lg border border-border/50 bg-muted/20 p-2.5")}>
              <Bar w={i === 1 ? "70%" : "90%"} tone={i === 1 ? "accent" : "muted"} />
              <Bar w="55%" />
            </div>
          </div>
        ))}
        <div className="flex items-center gap-2 rounded-md border border-border/50 bg-muted/15 px-2.5 py-2">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
          <p className="text-[11px] text-foreground/75">Livestream · market open recap</p>
        </div>
      </div>
    </PreviewFrame>
  );
}

function PreviewFor({ tab }: { tab: TabKey }) {
  switch (tab) {
    case "ai":
      return <AiPreview />;
    case "backtest":
      return (
        <div className="rounded-lg border border-border/60 bg-background/60 overflow-hidden">
          <MiniBacktesterDemo />
        </div>
      );
    case "screener":
      return <ScreenerPreview />;
    case "smart":
      return <SmartMoneyPreview />;
    case "academy":
      return <AcademyPreview />;
    case "community":
      return <CommunityPreview />;
  }
}

export function FeaturePreviewShowcase() {
  const [active, setActive] = useState<TabKey>("ai");
  const tab = TABS.find((t) => t.key === active)!;

  return (
    <section className="rounded-xl border border-border/60 bg-card/40 backdrop-blur-sm overflow-hidden">
      <header className="px-3 sm:px-5 pt-4 pb-3">
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Look inside
        </p>
        <h2 className="font-display text-lg sm:text-2xl font-semibold text-foreground mt-1">
          See the platform before you commit
        </h2>
      </header>

      {/* Tab rail — horizontally scrollable on mobile */}
      <div className="px-3 sm:px-5">
        <div className="flex gap-1.5 overflow-x-auto pb-3 -mx-1 px-1 scrollbar-none">
          {TABS.map((t) => {
            const Icon = t.icon;
            const isActive = t.key === active;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setActive(t.key)}
                aria-pressed={isActive}
                className={cn(
                  "shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                  isActive
                    ? cn("border-border bg-muted/60 text-foreground ring-1", t.ring)
                    : "border-border/50 bg-muted/20 text-muted-foreground hover:text-foreground hover:bg-muted/40",
                )}
              >
                <Icon className={cn("h-3.5 w-3.5", isActive ? t.accent : "")} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] px-3 sm:px-5 pb-5">
        {/* Copy side */}
        <div className="flex flex-col justify-center gap-3">
          <h3 className={cn("font-display text-base sm:text-xl font-semibold", tab.accent)}>
            {tab.headline}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{tab.blurb}</p>
          <Link
            to={tab.to}
            className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3.5 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
          >
            {tab.cta}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground/70">
            <Info className="h-3 w-3" />
            Illustrative preview — live data loads inside the feature
          </p>
        </div>

        {/* Visual preview side */}
        <div className="min-w-0">
          <PreviewFor tab={active} />
        </div>
      </div>
    </section>
  );
}
