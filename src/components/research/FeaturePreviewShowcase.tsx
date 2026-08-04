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
        <div className="flex flex-col justify-start gap-3 pt-1">
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
            Interactive sample — try it here, then open the feature for live data
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
