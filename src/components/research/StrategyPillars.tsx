import { Link } from 'react-router-dom';
import { TrendingUp, Layers, ShieldCheck, LineChart, ArrowRight, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PILLARS = [
  {
    icon: Layers,
    title: "Top-down allocation",
    body:
      "We start with the macro picture, then work down to sectors, industries and individual names — so every position has a reason to exist inside the portfolio.",
    lessons: ["Building a Top Down Portfolio", "Asset Allocation", "Multi Strategy PM"],
  },
  {
    icon: LineChart,
    title: "Fundamentals first",
    body:
      "Financial statements, SEC filings and unit economics before price targets. We read the balance sheet, margins and cash flow to separate real earnings from accounting noise.",
    lessons: ["Analyzing a Balance Sheet", "Earnings Analysis", "Intro to SEC Filings"],
  },
  {
    icon: TrendingUp,
    title: "Quality growth & moats",
    body:
      "Core positions are durable businesses with pricing power and a widening moat. We size into them on dips and let catalysts do the compounding.",
    lessons: ["Look for a Moat", "Finding Growth Stocks", "When to Buy the Dip"],
  },
  {
    icon: ShieldCheck,
    title: "Risk before return",
    body:
      "Position sizing, beta and volatility constraints set the ceiling on any idea. Options are used to hedge and generate income — never to gamble.",
    lessons: ["Risk Constraints", "Beta & Portfolio Construction", "Covered Calls Strategy"],
  },
];

export function StrategyPillars() {
  return (
    <div>
      <div className="mb-4 sm:mb-5">
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight">
          How we <span className="text-cyan-400">invest</span>
        </h2>
        <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-3xl mt-2 leading-relaxed">
          The same process taught inside the academy — 92 lessons across portfolio management,
          equity research, options and financial accounting, distilled into four rules we run
          every position through.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {PILLARS.map((p) => (
          <div
            key={p.title}
            className="rounded-xl border border-white/[0.12] bg-white/[0.02] p-4 sm:p-5"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-400/30 bg-cyan-400/10">
                <p.icon className="h-4 w-4 text-cyan-400" />
              </span>
              <h3 className="text-base sm:text-lg font-semibold text-white">{p.title}</h3>
            </div>
            <p className="mt-3 text-sm sm:text-[0.95rem] text-muted-foreground leading-relaxed">
              {p.body}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5 border-t border-white/[0.08] pt-3">
              {p.lessons.map((l) => (
                <span
                  key={l}
                  className="rounded-md border border-white/[0.1] bg-white/[0.03] px-2 py-0.5 text-[11px] text-primary/90"
                >
                  {l}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 sm:mt-6 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <Button asChild size="lg" className="w-full sm:w-auto gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
          <Link to="/academy">
            <GraduationCap className="h-4 w-4" />
            Explore the full curriculum
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="w-full sm:w-auto gap-2 border-white/[0.12] bg-white/[0.03] text-white hover:bg-white/[0.06] hover:text-white">
          <Link to="/auth" state={{ mode: 'signup', from: '/research' }}>
            Unlock full access
          </Link>
        </Button>
      </div>
    </div>
  );
}
