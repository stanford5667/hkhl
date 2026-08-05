import { Link } from "react-router-dom";
import { ArrowRight, GraduationCap, BookOpen } from "lucide-react";
import { AcademyDemo } from "@/components/demos/AcademyDemo";

export function AcademyProductPreview() {
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

        <div className="grid gap-3 sm:gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-center px-3 sm:px-5 pt-3 sm:pt-4 pb-4 sm:pb-5">
          {/* Copy side */}
          <div className="order-2 lg:order-1 flex flex-col justify-center gap-2.5 sm:gap-3 pt-1">
            <h3 className="font-display text-[15px] sm:text-xl font-semibold text-sky-400">
              Learn the strategy behind the signals
            </h3>
            <p className="text-[13px] sm:text-sm text-muted-foreground leading-relaxed">
              92 self-paced lessons take you from market fundamentals to automated quant execution — no coding required.
            </p>
            <Link
              to="/academy"
              className="inline-flex w-full sm:w-fit items-center justify-center sm:justify-start gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-2.5 sm:py-2 text-sm font-medium text-cyan-300 transition-colors hover:bg-cyan-500/20 active:scale-[0.99]"
            >
              Explore the Academy
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <p className="flex items-center gap-3 text-[10px] text-muted-foreground/70">
              <span className="flex items-center gap-1.5">
                <BookOpen className="h-3 w-3" />
                Beginner to advanced
              </span>
              <span className="flex items-center gap-1.5">
                <GraduationCap className="h-3 w-3" />
                Video + templates
              </span>
            </p>
          </div>

          {/* Visual preview side */}
          <div className="order-1 lg:order-2 min-w-0">
            <div className="-mx-3 rounded-none border-y border-cyan-500/15 bg-slate-900/50 p-1.5 shadow-inner sm:mx-0 sm:rounded-xl sm:border sm:p-2">
              <AcademyDemo />
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
