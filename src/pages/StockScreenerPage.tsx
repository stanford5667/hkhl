import { UnifiedDiscoveryScreener } from "@/components/research/UnifiedDiscoveryScreener";

export default function StockScreenerPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 space-y-3 sm:space-y-4 max-w-[1800px] w-full mx-auto">
        <header className="space-y-1">
          <h1 className="text-lg sm:text-2xl font-bold text-foreground">Stock Screener</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Filter the full market by price, volume, valuation, and momentum.
          </p>
        </header>

        <UnifiedDiscoveryScreener />
      </main>
    </div>
  );
}
