import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ResearchTopBar } from "@/pages/research/components/ResearchTopBar";
import { ResearchBottomBar } from "@/pages/research/components/ResearchBottomBar";
import { ResearchHero } from "@/components/research/ResearchHero";
import { StockOfTheDay } from "@/components/research/StockOfTheDay";
import { HubOverviewGrid } from "@/components/research/HubOverviewGrid";
import { DemoCarousel } from "@/components/demos/DemoCarousel";


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


      <main className="flex-1 px-3 sm:px-4 lg:px-6 py-3 sm:py-4 space-y-3 sm:space-y-4 max-w-[1800px] w-full mx-auto">
        <section>
          <ResearchHero />
        </section>

        <section>
          <div className="mb-4 sm:mb-5">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
              Start automating
            </h2>
            <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-3xl mt-2 leading-relaxed">
              Build systematic, rules-based strategies that run without you. Backtest every idea against decades of data, then put the winners to work — so you can outperform on autopilot.
            </p>
          </div>
          <DemoCarousel />
        </section>

        <HubOverviewGrid />

        <StockOfTheDay />

      </main>


      {/* Hidden on mobile — the bottom nav owns that space */}
      <div className="hidden md:block">
        <ResearchBottomBar lastUpdated={lastUpdated} />
      </div>
    </div>
  );
}
