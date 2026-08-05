import { MarketMoversWidget } from "@/pages/research/components/MarketMoversWidget";

export default function MarketMoversPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 space-y-3 sm:space-y-4 max-w-[1800px] w-full mx-auto">
        <header className="space-y-1">
          <h1 className="text-lg sm:text-2xl font-bold text-foreground">Market Movers</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Biggest gainers, losers, and most active names in the market today.
          </p>
        </header>

        <MarketMoversWidget />
      </main>
    </div>
  );
}
