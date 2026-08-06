import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ResearchTopBar } from "@/pages/research/components/ResearchTopBar";
import { ResearchBottomBar } from "@/pages/research/components/ResearchBottomBar";
import { ResearchHero } from "@/components/research/ResearchHero";
import { StockOfTheDay } from "@/components/research/StockOfTheDay";
import { HubOverviewGrid } from "@/components/research/HubOverviewGrid";
import { DemoCarousel } from "@/components/demos/DemoCarousel";
import { StockResearchDemo } from "@/components/demos/StockResearchDemo";
import { cn } from "@/lib/utils";

type Accent = "primary" | "chart-1" | "chart-2" | "chart-3" | "chart-4" | "chart-5";

const ACCENTS: Record<Accent, { border: string; text: string; glow: string }> = {
  primary: { border: "border-l-primary", text: "text-primary", glow: "shadow-primary/5" },
  "chart-1": { border: "border-l-chart-1", text: "text-chart-1", glow: "shadow-chart-1/5" },
  "chart-2": { border: "border-l-chart-2", text: "text-chart-2", glow: "shadow-chart-2/5" },
  "chart-3": { border: "border-l-chart-3", text: "text-chart-3", glow: "shadow-chart-3/5" },
  "chart-4": { border: "border-l-chart-4", text: "text-chart-4", glow: "shadow-chart-4/5" },
  "chart-5": { border: "border-l-chart-5", text: "text-chart-5", glow: "shadow-chart-5/5" },
};

interface SectionCardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  accent?: Accent;
  className?: string;
  noPadding?: boolean;
}

function SectionCard({
  children,
  title,
  subtitle,
  accent = "primary",
  className,
  noPadding,
}: SectionCardProps) {
  const style = ACCENTS[accent];
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border/80 bg-card/80 backdrop-blur-sm shadow-sm",
        "border-l-4",
        style.border,
        style.glow,
        className
      )}
    >
      <div className={cn("relative", !noPadding && "p-4 sm:p-5 lg:p-6")}>
        {(title || subtitle) && (
          <div className="mb-4 sm:mb-5">
            {title && (
              <h2
                className={cn(
                  "text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight",
                  style.text
                )}
              >
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-sm sm:text-base text-muted-foreground max-w-3xl mt-2 leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}

export default function ResearchPage() {
  const queryClient = useQueryClient();
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    // Keep the legacy event for any widget still listening
    window.dispatchEvent(new CustomEvent("research:refresh"));
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["hub-chatrooms-latest"] }),
        queryClient.invalidateQueries({ queryKey: ["hub-academy-progress"] }),
        queryClient.invalidateQueries({ queryKey: ["hub-smart-money-latest"] }),
        queryClient.invalidateQueries({ refetchType: "active" }),
      ]);
    } finally {
      setLastUpdated(new Date());
      setIsRefreshing(false);
    }
  }, [queryClient]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <ResearchTopBar />

      <main className="flex-1 px-3 sm:px-4 lg:px-6 py-3 sm:py-4 space-y-6 sm:space-y-8 max-w-[1800px] w-full mx-auto">
        <SectionCard accent="primary" noPadding>
          <ResearchHero />
        </SectionCard>

        <SectionCard
          title="Automate your investing"
          subtitle="Backtest strategies against decades of data."
          accent="chart-1"
        >
          <DemoCarousel />
        </SectionCard>

        <SectionCard
          title="Research any ticker"
          subtitle="Pull up a stock or ETF and get chart, fundamentals, quant signals, news, SEC filings, and analyst chatter — all in one view."
          accent="chart-2"
          noPadding
        >
          <StockResearchDemo />
        </SectionCard>

        <SectionCard
          title="Everything, in one place"
          subtitle="Where you left off across the platform."
          accent="chart-3"
          noPadding
        >
          <HubOverviewGrid />
        </SectionCard>

        <SectionCard accent="chart-4" noPadding>
          <StockOfTheDay />
        </SectionCard>

        <SectionCard
          title="The tools to find winning ideas"
          subtitle="Great investments don't come from guesswork. Screen thousands of tickers, backtest any thesis against decades of data, and learn the same research process used by top hedge fund managers — so you can find your next winning idea with confidence."
          accent="chart-5"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-2">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Screen, backtest, and research in one integrated workspace — built to help you act with conviction.
              </p>
            </div>
          </div>
        </SectionCard>
      </main>

      {/* Hidden on mobile — the bottom nav owns that space */}
      <div className="hidden md:block">
        <ResearchBottomBar lastUpdated={lastUpdated} />
      </div>
    </div>
  );
}
