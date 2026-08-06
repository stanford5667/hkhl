import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { ResearchTopBar } from "@/pages/research/components/ResearchTopBar";
import { ResearchBottomBar } from "@/pages/research/components/ResearchBottomBar";
import { ResearchHero } from "@/components/research/ResearchHero";
import { StockOfTheDay } from "@/components/research/StockOfTheDay";
import { SectionDivider } from "@/components/research/SectionDivider";
import { StrategyPillars } from "@/components/research/StrategyPillars";
import { DemoCarousel } from "@/components/demos/DemoCarousel";






export default function ResearchPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
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

  // Guests: any interaction on the page content routes to the sign-up form
  const handleGuestGate = useCallback(
    (e: React.MouseEvent) => {
      if (user) return;
      e.preventDefault();
      e.stopPropagation();
      navigate("/auth", { state: { mode: "signup", from: "/research" } });
    },
    [user, navigate]
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <ResearchTopBar />


      <main
        onClickCapture={handleGuestGate}
        className="flex-1 px-3 sm:px-4 lg:px-6 py-3 sm:py-4 space-y-8 sm:space-y-10 max-w-[1800px] w-full mx-auto"
      >

        <section>
          <ResearchHero />
        </section>

        <SectionDivider />

        <section>
          <div className="mb-4 sm:mb-5">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight">
              Automate your investing
            </h2>
            <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-3xl mt-2 leading-relaxed">
              Research any ticker, then backtest strategies against decades of data.
            </p>
          </div>
          <DemoCarousel />
        </section>

        <SectionDivider />

        <StockOfTheDay />

        <SectionDivider />

        <section>
          <div className="mb-4 sm:mb-5">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight">
              The tools to find winning ideas
            </h2>
            <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-3xl mt-2 leading-relaxed">
              Great investments don't come from guesswork. Screen thousands of tickers, backtest any thesis against decades of data, and learn the same research process used by top hedge fund managers — so you can find your next winning idea with confidence.
            </p>
          </div>
        </section>

        <SectionDivider />
      </main>



      {/* Hidden on mobile — the bottom nav owns that space */}

      <div className="hidden md:block">
        <ResearchBottomBar lastUpdated={lastUpdated} />
      </div>
    </div>
  );
}
