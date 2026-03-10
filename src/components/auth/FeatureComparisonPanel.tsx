import { Check, X } from "lucide-react";

const FEATURES = [
  { name: "Stock Overview & Charts", free: true, pro: true },
  { name: "Trending Tickers", free: true, pro: true },
  { name: "Earnings Calendar", free: true, pro: true },
  { name: "AI Stock Analysis", free: false, pro: true },
  { name: "AI Trading Bot", free: false, pro: true },
  { name: "AI Stock Backtesting", free: false, pro: true },
  { name: "Strategy Builder (20+ indicators)", free: false, pro: true },
  { name: "Trade Ideas & Signals", free: false, pro: true },
  { name: "Full Video Course Library", free: false, pro: true },
  { name: "Market Screener", free: false, pro: true },
];

export function FeatureComparisonPanel() {
  return (
    <div className="space-y-3">
      <h3 className="text-base font-semibold text-foreground text-center">What you get</h3>
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto] gap-0 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/50 px-3 py-2 border-b border-border">
          <span>Feature</span>
          <span className="w-12 text-center">Free</span>
          <span className="w-12 text-center text-primary">Pro</span>
        </div>
        <div className="divide-y divide-border/50">
          {FEATURES.map((feature) => (
            <div key={feature.name} className="grid grid-cols-[1fr_auto_auto] gap-0 items-center px-3 py-2 hover:bg-muted/30 transition-colors">
              <span className="text-xs text-foreground/80">{feature.name}</span>
              <span className="w-12 flex justify-center">
                {feature.free ? (
                  <Check className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <X className="h-3.5 w-3.5 text-muted-foreground/40" />
                )}
              </span>
              <span className="w-12 flex justify-center">
                <Check className="h-3.5 w-3.5 text-primary" />
              </span>
            </div>
          ))}
        </div>
      </div>
      <p className="text-center text-[10px] text-muted-foreground">
        Pro starts at <span className="font-semibold text-foreground">$58/mo</span> (billed annually)
      </p>
    </div>
  );
}
