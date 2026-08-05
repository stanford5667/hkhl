import { EarningsCalendarWidget } from "@/pages/research/components/EarningsCalendarWidget";

export default function EarningsCalendarPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 space-y-3 sm:space-y-4 max-w-[1800px] w-full mx-auto">
        <header className="space-y-1">
          <h1 className="text-lg sm:text-2xl font-bold text-foreground">Earnings Calendar</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Upcoming reports with estimates, timing, and market cap context.
          </p>
        </header>

        <EarningsCalendarWidget />
      </main>
    </div>
  );
}
