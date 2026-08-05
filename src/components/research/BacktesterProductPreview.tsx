import { Link } from "react-router-dom";
import { LineChart, ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { BacktestDemo } from "@/components/demos/BacktestDemo";

export function BacktesterProductPreview() {
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

        <div className="grid gap-3 sm:gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-center px-3 sm:px-5 pb-4 sm:pb-5">
          {/* Copy side */}
          <div className="order-2 lg:order-1 flex flex-col justify-center gap-2.5 sm:gap-3 pt-1">
            <h3 className="font-display text-[15px] sm:text-xl font-semibold text-sky-400">
              Prove the idea before you risk a dollar
            </h3>
            <p className="text-[13px] sm:text-sm text-muted-foreground leading-relaxed">
              Build rules with no code, run them over years of history, and read the metrics that matter — CAGR, Sharpe, drawdown and trade-by-trade detail against a benchmark.
            </p>
            <Link
              to="/stock/SPY?tab=backtest"
              className="inline-flex w-full sm:w-fit items-center justify-center sm:justify-start gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-2.5 sm:py-2 text-sm font-medium text-cyan-300 transition-colors hover:bg-cyan-500/20 active:scale-[0.99]"
            >
              Test a strategy now
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground/70">
              <LineChart className="h-3 w-3" />
              Interactive sample — try it here, then open the feature for live data
            </p>
          </div>

          {/* Visual preview side */}
          <div className="order-1 lg:order-2 min-w-0">
            <div className="-mx-3 rounded-none border-y border-cyan-500/15 bg-slate-900/50 p-1.5 shadow-inner sm:mx-0 sm:rounded-xl sm:border sm:p-2">
              <BacktestDemo />
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
