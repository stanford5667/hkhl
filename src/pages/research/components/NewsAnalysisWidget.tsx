import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { type ColumnDef } from "@tanstack/react-table";
import { Newspaper, ExternalLink } from "lucide-react";
import { useMarketNews, type MarketNewsItem } from "@/hooks/useMarketNews";
import { WidgetCard } from "./WidgetCard";
import { DataTable } from "./DataTable";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 15;

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function NewsAnalysisWidget() {
  const navigate = useNavigate();
  const { data: news = [], isLoading } = useMarketNews(100);
  const [pageIndex, setPageIndex] = useState(0);

  const paged = useMemo(
    () => news.slice(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE),
    [news, pageIndex],
  );

  const columns = useMemo<ColumnDef<MarketNewsItem>[]>(
    () => [
      {
        accessorKey: "title",
        header: "Headline",
        cell: ({ row }) => (
          <div className="min-w-0 max-w-[520px]">
            <div className="font-mono text-xs font-semibold text-foreground line-clamp-2">
              {row.original.title}
            </div>
            {row.original.summary && (
              <div className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                {row.original.summary}
              </div>
            )}
          </div>
        ),
      },
      {
        accessorKey: "source",
        header: "Source",
        cell: ({ row }) => (
          <span className="font-mono text-[11px] text-muted-foreground truncate max-w-[120px] inline-block">
            {row.original.source}
          </span>
        ),
      },
      {
        id: "tickers",
        header: "Tickers",
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1 max-w-[160px]">
            {row.original.tickers.slice(0, 3).map((t) => (
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
        ),
      },
      {
        accessorKey: "sentiment",
        header: "Sentiment",
        cell: ({ row }) => {
          const s = row.original.sentiment;
          return (
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] font-normal capitalize border-border/40",
                s === "positive" && "text-success",
                s === "negative" && "text-destructive",
                s === "neutral" && "text-muted-foreground",
              )}
            >
              {s}
            </Badge>
          );
        },
      },
      {
        accessorKey: "publishedAt",
        meta: { numeric: true },
        header: "Time",
        cell: ({ row }) => (
          <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
            {timeAgo(row.original.publishedAt)}
          </span>
        ),
      },
      {
        id: "link",
        header: "",
        cell: ({ row }) =>
          row.original.url ? (
            <a
              href={row.original.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center text-muted-foreground hover:text-primary"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : null,
      },
    ],
    [navigate],
  );

  return (
    <WidgetCard
      title="News & Analysis"
      subtitle="Latest market-moving headlines with sentiment"
      icon={<Newspaper className="h-3.5 w-3.5" />}
    >
      <DataTable
        columns={columns}
        data={paged}
        isLoading={isLoading}
        pageIndex={pageIndex}
        pageSize={PAGE_SIZE}
        totalRows={news.length}
        onPageChange={setPageIndex}
        rowKey={(r) => r.id}
        emptyMessage="No news available right now."
      />
    </WidgetCard>
  );
}
