import { useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { ResearchTopBar } from "@/pages/research/components/ResearchTopBar";
import { ResearchBottomBar } from "@/pages/research/components/ResearchBottomBar";
import { ResearchHero } from "@/components/research/ResearchHero";
import { SectionDivider } from "@/components/research/SectionDivider";
import { StrategyPillars } from "@/components/research/StrategyPillars";
import { FeaturedResearch } from "@/components/research/FeaturedResearch";
import { DemoCarousel } from "@/components/demos/DemoCarousel";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";






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

  // Guests: treat ANY interaction on the page content as the call to action,
  // except elements explicitly marked as guest-allowed (e.g. free video previews)
  const gate = useCallback(
    (e: React.SyntheticEvent) => {
      if (user) return false;
      const target = e.target as HTMLElement | null;
      if (target?.closest?.("[data-guest-allow]")) return false;
      e.preventDefault();
      e.stopPropagation();
      navigate("/auth", { state: { mode: "signup", from: "/research" } });
      return true;
    },
    [user, navigate]
  );


  const handleGuestClick = useCallback((e: React.MouseEvent) => gate(e), [gate]);

  // Keyboard activation (Enter / Space) counts as a click
  const handleGuestKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (user) return;
      if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") gate(e);
    },
    [user, gate]
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <ResearchTopBar />


      <main
        onClickCapture={handleGuestClick}
        onAuxClickCapture={handleGuestClick}
        onDoubleClickCapture={handleGuestClick}
        onKeyDownCapture={handleGuestKeyDown}
        onSubmitCapture={gate}
        onChangeCapture={gate}
        onInputCapture={gate}
        onFocusCapture={user ? undefined : (e) => {
          // Focusing an input (tap into a search field) is intent — send them to sign-up
          const el = e.target as HTMLElement;
          if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
            gate(e);
          }
        }}
        className={`flex-1 px-3 sm:px-4 lg:px-6 py-2 sm:py-3 space-y-3 sm:space-y-4 max-w-[1800px] w-full mx-auto ${
          user ? "" : "cursor-pointer [&_*]:cursor-pointer"
        }`}
      >


        <section>
          <ResearchHero />
        </section>

        <SectionDivider />

        <section className="relative -mx-3 sm:-mx-4 lg:-mx-6 px-3 sm:px-4 lg:px-6 py-3 sm:py-6 bg-card border-y border-primary/20 overflow-hidden">
          {/* Strong top accent line — slim on mobile */}
          <div className="absolute top-0 left-0 right-0 h-px sm:h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px sm:h-1 w-24 sm:w-32 bg-primary shadow-[0_0_14px_rgba(59,130,246,0.5)] sm:shadow-[0_0_20px_rgba(59,130,246,0.55)]" />
          {/* Left vertical accent */}
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary via-cyan-400/60 to-transparent" />
          {/* Right vertical accent */}
          <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary via-cyan-400/60 to-transparent" />
          {/* Contrast wash */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] via-transparent to-cyan-400/[0.03] pointer-events-none" />

          <div className="relative">
            <div className="mb-3 sm:mb-4">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
                <span className="text-primary">Automate</span>{" "}
                <span className="text-foreground">your investing</span>
              </h2>
              <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-3xl mt-2 leading-relaxed">
                Research any ticker, then backtest strategies against decades of data.
              </p>
            </div>
            <DemoCarousel />
          </div>
        </section>

        <SectionDivider />

        <section>
          <StrategyPillars />
        </section>

        <SectionDivider />

        <section>
          <FeaturedResearch />
        </section>

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
          <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild size="lg" className="w-full sm:w-auto gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
              <Link to="/auth" state={{ mode: "signup", from: "/research" }}>
                <Sparkles className="h-4 w-4" />
                Get started now
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto gap-2 border-white/[0.12] bg-white/[0.03] text-white hover:bg-white/[0.06] hover:text-white">
              <Link to="/academy">
                Browse the academy
              </Link>
            </Button>
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
