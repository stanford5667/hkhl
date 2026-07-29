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

const RECENT_KEY = "research:recent-searches";

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

      <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {/* Page header / search */}
        <section className="border-b border-border/40">
          <ResearchHero
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            onSearch={handleSearch}
            recentSearches={recentSearches}
            onClearRecent={handleClearRecent}
          />
        </section>

        {/* Overview */}
        <section className="pt-8 space-y-6">
          <HubOverviewGrid />
          <StockOfTheDay />
        </section>

        {/* Primary content widgets */}
        <section className="pt-8 mt-8 border-t border-border/40 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MarketThemesWidget />
            <GlobalThemesWidget />
          </div>

          <UnifiedDiscoveryScreener />
          <EarningsCalendarWidget />
          <MarketMoversWidget />
          <DiscoveryFeed />
          <NewsAnalysisWidget />
        </section>
      </main>


      <ResearchBottomBar lastUpdated={lastUpdated} />
    </div>
  );
}
