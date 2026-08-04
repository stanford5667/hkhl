import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { type ColumnDef } from "@tanstack/react-table";
import { Sparkles, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useMarketThemes } from "@/hooks/useMarketThemes";
import { MARKET_THEMES, type MarketTheme } from "@/data/marketThemes";
import { WidgetCard } from "./WidgetCard";
import { DataTable } from "./DataTable";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 8;

function SentimentBadge({ score }: { score: number }) {
  const sentiment = score >= 0.6 ? "bullish" : score <= 0.4 ? "bearish" : "neutral";
  const Icon = sentiment === "bullish" ? TrendingUp : sentiment === "bearish" ? TrendingDown : Minus;
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-mono text-[10px] gap-1 capitalize",
        sentiment === "bullish" && "border-success/40 text-success bg-success/10",
        sentiment === "bearish" && "border-destructive/40 text-destructive bg-destructive/10",
        sentiment === "neutral" && "border-border text-muted-foreground",
      )}
    >
      <Icon className="h-3 w-3" /> {sentiment}
    </Badge>
  );
}

export function MarketThemesWidget() {
  const navigate = useNavigate();
  const { data: liveThemes, isLoading } = useMarketThemes();
  const [pageIndex, setPageIndex] = useState(0);

  const themes: MarketTheme[] = useMemo(() => liveThemes ?? MARKET_THEMES, [liveThemes]);

  const columns = useMemo<ColumnDef<MarketTheme>[]>(
    () => [
      {
        accessorKey: "title",
        header: "Theme",
        cell: ({ row }) => {
          const Icon = row.original.icon;
          return (
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary border border-primary/20">
                <Icon className="h-3 w-3" />
              </div>
              <div className="min-w-0">
                <div className="font-mono text-xs font-semibold text-foreground truncate max-w-[260px]">
                  {row.original.title}
                </div>
                <div className="text-[10px] text-muted-foreground truncate max-w-[260px]">
                  {row.original.summary}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "category",
        header: "Category",
        cell: ({ row }) => (
          <span className="font-mono text-[11px] text-muted-foreground">{row.original.category}</span>
        ),
      },
      {
        accessorKey: "impactPercent",
        header: "Impact",
        cell: ({ row }) => {
          const v = row.original.impactPercent;
          const positive = v >= 0;
          return (
            <span
              className={cn(
                "font-mono text-xs tabular-nums font-semibold",
                positive ? "text-success" : "text-destructive",
              )}
            >
              {positive ? "+" : ""}
              {v.toFixed(1)}%
            </span>
          );
        },
      },
      {
        accessorKey: "sentimentScore",
        header: "Sentiment",
        cell: ({ row }) => <SentimentBadge score={row.original.sentimentScore} />,
      },
      {
        id: "tickers",
        header: "Top Tickers",
        cell: ({ row }) => (
          <div className="flex items-center gap-1 flex-wrap max-w-[260px]">
            {row.original.tickers.slice(0, 3).map((t) => (
              <button
                key={t.symbol}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/stock/${t.symbol}`);
                }}
                className="px-1.5 py-0.5 rounded border border-border/60 bg-muted/30 hover:bg-primary/10 hover:border-primary/30 text-[10px] font-mono text-foreground transition-colors"
              >
                {t.symbol}
              </button>
            ))}
          </div>
        ),
      },
    ],
    [navigate],
  );

  const sorted = useMemo(
    () => [...themes].sort((a, b) => Math.abs(b.impactPercent) - Math.abs(a.impactPercent)),
    [themes],
  );

  const paged = useMemo(
    () => sorted.slice(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE),
    [sorted, pageIndex],
  );

  return (
    <WidgetCard
      title="Major Market Themes"
      subtitle="Highest-impact themes driving today's market"
      icon={<Sparkles className="h-3.5 w-3.5" />}
    >
      <DataTable
        columns={columns}
        data={paged}
        isLoading={isLoading}
        pageIndex={pageIndex}
        pageSize={PAGE_SIZE}
        totalRows={sorted.length}
        onPageChange={setPageIndex}
        onRowClick={(t) => navigate(`/investment-heatmap?theme=${encodeURIComponent(t.id)}`)}
        emptyMessage="No themes available"
      />
    </WidgetCard>
  );
}
