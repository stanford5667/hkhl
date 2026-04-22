import { useState } from "react";
import { ResearchTopBar } from "@/pages/research/components/ResearchTopBar";
import { ResearchBottomBar } from "@/pages/research/components/ResearchBottomBar";
import { MarketThemesWidget } from "@/pages/research/components/MarketThemesWidget";
import { GlobalThemesWidget } from "@/pages/research/components/GlobalThemesRegionWidget";
import { StockScreenerWidget } from "@/pages/research/components/StockScreenerWidget";
import { EarningsCalendarWidget } from "@/pages/research/components/EarningsCalendarWidget";
import { MarketMoversWidget } from "@/pages/research/components/MarketMoversWidget";
import { NewsAnalysisWidget } from "@/pages/research/components/NewsAnalysisWidget";

export default function ResearchPage() {
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const handleRefresh = () => {
    setLastUpdated(new Date());
    window.dispatchEvent(new CustomEvent("research:refresh"));
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <ResearchTopBar onRefresh={handleRefresh} lastUpdated={lastUpdated} />

      <main className="flex-1 px-3 sm:px-4 lg:px-6 py-3 sm:py-4 space-y-3 sm:space-y-4 max-w-[1800px] w-full mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          <MarketThemesWidget />
          <GlobalThemesWidget />
        </div>

        <StockScreenerWidget />
        <EarningsCalendarWidget />
        <MarketMoversWidget />
        <NewsAnalysisWidget />
      </main>

      <ResearchBottomBar lastUpdated={lastUpdated} />
    </div>
  );
}
