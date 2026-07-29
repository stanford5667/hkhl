import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Globe, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { THEME_TICKERS } from "@/hooks/useInvestmentHeatmap";
import { WidgetCard } from "./WidgetCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RegionTheme {
  country: string;
  flag: string;
  name: string;
  theme: string;
  sentiment: "bullish" | "bearish" | "neutral";
  intensity: number;
  tickers: string[];
}

function pickTickers(...keys: string[]): string[] {
  for (const k of keys) {
    const v = (THEME_TICKERS as Record<string, any>)[k];
    if (Array.isArray(v) && v.length) {
      return v.map((t) => (typeof t === "string" ? t : t?.symbol)).filter(Boolean);
    }
  }
  return [];
}

const REGIONS: RegionTheme[] = [
  { country: "US", flag: "🇺🇸", name: "United States", theme: "AI & Tech Leadership", sentiment: "bullish", intensity: 88, tickers: pickTickers("AI & Machine Learning", "Technology") },
  { country: "CN", flag: "🇨🇳", name: "China", theme: "US-China Trade Tensions", sentiment: "bearish", intensity: 70, tickers: pickTickers("US-China Trade Tensions") },
  { country: "JP", flag: "🇯🇵", name: "Japan", theme: "Yen Weakness & Reform", sentiment: "bullish", intensity: 68, tickers: pickTickers("Yen Weakness & Corporate Governance Reform") },
  { country: "IR", flag: "🇮🇷", name: "Iran", theme: "Middle East Conflict", sentiment: "bearish", intensity: 85, tickers: pickTickers("Middle East Conflict & Sanctions") },
  { country: "IN", flag: "🇮🇳", name: "India", theme: "Manufacturing Shift", sentiment: "bullish", intensity: 72, tickers: pickTickers("Demographic Dividend & Manufacturing Shift") },
  { country: "UA", flag: "🇺🇦", name: "Ukraine", theme: "War & Reconstruction", sentiment: "bearish", intensity: 90, tickers: pickTickers("War & Reconstruction Demand") },
  { country: "BR", flag: "🇧🇷", name: "Brazil", theme: "Commodity Supercycle", sentiment: "bullish", intensity: 58, tickers: pickTickers("Agribusiness & Commodity Supercycle") },
  { country: "DE", flag: "🇩🇪", name: "Germany", theme: "EU Energy Transition", sentiment: "neutral", intensity: 50, tickers: pickTickers("EU Industrial Policy & Energy Transition") },
];

const SENTIMENT_ICON = { bullish: TrendingUp, bearish: TrendingDown, neutral: Minus };

export function GlobalThemesWidget() {
  const navigate = useNavigate();

  const sorted = useMemo(() => [...REGIONS].sort((a, b) => b.intensity - a.intensity), []);

  return (
    <WidgetCard
      title="Global Investment Themes"
      subtitle="Geopolitical & macro themes driving regions"
      icon={<Globe className="h-3.5 w-3.5" />}
      actions={
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-[11px] border-border/40"
          onClick={() => navigate("/investment-heatmap")}
        >
          Open Map
        </Button>
      }
    >
      <ul className="divide-y divide-border/30">
        {sorted.map((r) => {
          const Icon = SENTIMENT_ICON[r.sentiment];
          return (
            <li
              key={r.country}
              className="flex items-center gap-3 px-4 sm:px-6 py-2.5 hover:bg-muted/20 transition-colors cursor-pointer"
              onClick={() => navigate(`/investment-heatmap?region=${r.country}`)}
            >
              <span className="text-xl leading-none shrink-0">{r.flag}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-foreground truncate">{r.name}</span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 text-[10px] capitalize",
                      r.sentiment === "bullish" && "text-success",
                      r.sentiment === "bearish" && "text-destructive",
                      r.sentiment === "neutral" && "text-muted-foreground",
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    {r.sentiment}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground truncate">{r.theme}</p>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-1">
                  {r.tickers.slice(0, 2).map((t) => (
                    <button
                      key={t}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/stock/${t}`);
                      }}
                      className="px-1.5 py-0.5 rounded border border-border/40 bg-muted/20 hover:border-border hover:bg-muted/50 text-[10px] font-mono text-foreground transition-colors"
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <div className="w-12 h-1 rounded-full bg-muted/40 overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      r.sentiment === "bullish" && "bg-success",
                      r.sentiment === "bearish" && "bg-destructive",
                      r.sentiment === "neutral" && "bg-muted-foreground/60",
                    )}
                    style={{ width: `${r.intensity}%` }}
                  />
                </div>
                <span className="text-[10px] tabular-nums text-muted-foreground w-7 text-right">
                  {r.intensity}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </WidgetCard>
  );
}
