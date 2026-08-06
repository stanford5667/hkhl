import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ResearchTopBar } from "@/pages/research/components/ResearchTopBar";
import { ResearchBottomBar } from "@/pages/research/components/ResearchBottomBar";
import { ResearchHero } from "@/components/research/ResearchHero";
import { StockOfTheDay } from "@/components/research/StockOfTheDay";
import { HubOverviewGrid } from "@/components/research/HubOverviewGrid";
import { DemoCarousel } from "@/components/demos/DemoCarousel";
import { AcademyDemo } from "@/components/demos/AcademyDemo";


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


      <main className="flex-1 px-3 sm:px-4 lg:px-6 py-3 sm:py-4 space-y-8 sm:space-y-10 max-w-[1800px] w-full mx-auto">
        <section>
          <ResearchHero />
        </section>

        <section>
          <div className="mb-4 sm:mb-5">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
              Automate investing
            </h2>
            <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-3xl mt-2 leading-relaxed">
              Pick a strategy, see how it actually held up across decades of market data, and understand exactly what drove the result — before you put money behind it.
            </p>
          </div>
          <DemoCarousel />
        </section>

        <section>
          <div className="mb-4 sm:mb-5">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground tracking-tight">
              Everything, in one place
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-3xl mt-2 leading-relaxed">
              Where you left off across the platform.
            </p>
          </div>
          <HubOverviewGrid />
        </section>

        <section>
          <div className="mb-4 sm:mb-5">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
              Learn it properly — not from a thread
            </h2>
            <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-3xl mt-2 leading-relaxed">
              92 video lessons from a hedge fund manager, from first principles through portfolio construction. Go at your own pace, and revisit anything as often as you need.
            </p>
          </div>
          <div className="w-full md:max-w-4xl">
            <AcademyDemo />
          </div>
        </section>

        <StockOfTheDay />

      </main>


      {/* Hidden on mobile — the bottom nav owns that space */}
      <div className="hidden md:block">
        <ResearchBottomBar lastUpdated={lastUpdated} />
      </div>
    </div>
  );
}
