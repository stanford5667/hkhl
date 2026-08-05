import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ResearchTopBar } from "@/pages/research/components/ResearchTopBar";
import { ResearchBottomBar } from "@/pages/research/components/ResearchBottomBar";
import { MarketThemesWidget } from "@/pages/research/components/MarketThemesWidget";
import { GlobalThemesWidget } from "@/pages/research/components/GlobalThemesRegionWidget";
import { UnifiedDiscoveryScreener } from "@/components/research/UnifiedDiscoveryScreener";
import { EarningsCalendarWidget } from "@/pages/research/components/EarningsCalendarWidget";
import { MarketMoversWidget } from "@/pages/research/components/MarketMoversWidget";
import { NewsAnalysisWidget } from "@/pages/research/components/NewsAnalysisWidget";
import { ResearchHero } from "@/components/research/ResearchHero";
import { StockOfTheDay } from "@/components/research/StockOfTheDay";
import { DiscoveryFeed } from "@/components/research/DiscoveryFeed";
import { HubOverviewGrid } from "@/components/research/HubOverviewGrid";
import { HubTerminalGrid } from "@/components/research/HubTerminalGrid";
import { FeaturePreviewShowcase } from "@/components/research/FeaturePreviewShowcase";


const RECENT_KEY = "research:recent-searches";
const HUB_VARIANT_KEY = "research:hub-variant";
type HubVariant = "cards" | "terminal";


export default function ResearchPage() {
  const navigate = useNavigate();
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [date, setDate] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [hubVariant, setHubVariant] = useState<HubVariant>(() => {
    try {
      return localStorage.getItem(HUB_VARIANT_KEY) === "terminal" ? "terminal" : "cards";
    } catch {
      return "cards";
    }
  });

  const toggleHubVariant = useCallback(() => {
    setHubVariant((prev) => {
      const next: HubVariant = prev === "cards" ? "terminal" : "cards";
      try {
        localStorage.setItem(HUB_VARIANT_KEY, next);
      } catch {}
      return next;
    });
  }, []);


  const handleRefresh = () => {
    setLastUpdated(new Date());
    window.dispatchEvent(new CustomEvent("research:refresh"));
  };

  const handleSearch = useCallback(
    (ticker: string) => {
      const t = ticker.trim().toUpperCase();
      if (!t) return;
      const next = [t, ...recentSearches.filter((r) => r !== t)].slice(0, 8);
      setRecentSearches(next);
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {}
      navigate(`/research?ticker=${encodeURIComponent(t)}`);
    },
    [recentSearches, navigate]
  );

  const handleClearRecent = useCallback(() => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_KEY);
    } catch {}
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <ResearchTopBar onRefresh={handleRefresh} date={date} onDateChange={setDate} />

      <main className="flex-1 px-3 sm:px-4 lg:px-6 py-3 sm:py-4 space-y-3 sm:space-y-4 max-w-[1800px] w-full mx-auto">
        {/* Restored landing-style sections - moved to top */}
        <section>
          <ResearchHero
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            onSearch={handleSearch}
            recentSearches={recentSearches}
            onClearRecent={handleClearRecent}
          />
        </section>

        <div>
          <div className="mb-1 flex justify-end">
            <button
              type="button"
              onClick={toggleHubVariant}
              className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70 underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              hub: {hubVariant} · switch to {hubVariant === "cards" ? "terminal" : "cards"}
            </button>
          </div>
          {hubVariant === "terminal" ? <HubTerminalGrid /> : <HubOverviewGrid />}
        </div>




        <FeaturePreviewShowcase />

        <StockOfTheDay />


        <DiscoveryFeed />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          <MarketThemesWidget />
          <GlobalThemesWidget />
        </div>

        <UnifiedDiscoveryScreener />
        <EarningsCalendarWidget />
        <MarketMoversWidget />
        <NewsAnalysisWidget />
      </main>


      {/* Hidden on mobile — the bottom nav owns that space */}
      <div className="hidden md:block">
        <ResearchBottomBar lastUpdated={lastUpdated} />
      </div>
    </div>
  );
}
