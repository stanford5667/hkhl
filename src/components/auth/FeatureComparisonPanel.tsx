import { Check, X, Star } from "lucide-react";
import { cn } from "@/lib/utils";

const FEATURES = [
  { name: "Full Video Course Library", free: false, pro: true, highlight: true },
  { name: "Live Trade Ideas Chatroom", free: false, pro: true, highlight: true },
  { name: "AI Stock Backtesting", free: false, pro: true, highlight: true },
  { name: "Strategy Builder (20+ indicators)", free: false, pro: true, highlight: true },
  { name: "AI Trading Bot", free: false, pro: true },
  { name: "AI Stock Analysis", free: false, pro: true },
  { name: "Market Screener", free: false, pro: true },
  { name: "Stock Overview & Charts", free: true, pro: true },
  { name: "Trending Tickers", free: true, pro: true },
  { name: "Earnings Calendar", free: true, pro: true },
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
            <div key={feature.name} className={cn(
              "grid grid-cols-[1fr_auto_auto] gap-0 items-center px-3 py-2 transition-colors",
              feature.highlight
                ? "bg-primary/5 hover:bg-primary/10"
                : "hover:bg-muted/30"
            )}>
              <span className={cn(
                "text-xs",
                feature.highlight
                  ? "text-foreground font-semibold flex items-center gap-1.5"
                  : "text-foreground/80"
              )}>
                {feature.highlight && <Star className="h-3 w-3 text-amber-400 fill-amber-400 flex-shrink-0" />}
                {feature.name}
              </span>
              <span className="w-12 flex justify-center">
                {feature.free ? (
                  <Check className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <X className="h-3.5 w-3.5 text-muted-foreground/40" />
                )}
              </span>
              <span className="w-12 flex justify-center">
                <Check className={cn("h-3.5 w-3.5", feature.highlight ? "text-amber-400" : "text-primary")} />
              </span>
            </div>
          ))}
        </div>
      </div>
      <p className="text-center text-[10px] text-muted-foreground">
        Pro starts at <span className="font-semibold text-foreground">$83/mo</span> (billed annually)
      </p>
    </div>
  );
}