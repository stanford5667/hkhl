import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import { Flame, TrendingUp, TrendingDown, Activity } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WidgetCard } from "./WidgetCard";
import { DataTable } from "./DataTable";
import {
  screenStocksFromPolygon,
  formatVolume,
  formatMarketCap,
  type ScreenerFilters,
  type ScreenerResult,
} from "@/services/polygonScreenerService";
import { cn } from "@/lib/utils";

type Tab = "gainers" | "losers" | "active";
const PAGE_SIZE = 15;

const TAB_FILTERS: Record<Tab, ScreenerFilters> = {
  gainers: { sortBy: "change", sortDirection: "desc", minChange1D: 0, minMarketCap: 500_000_000 },
  losers: { sortBy: "change", sortDirection: "asc", maxChange1D: 0, minMarketCap: 500_000_000 },
  active: { sortBy: "volume", sortDirection: "desc", minMarketCap: 500_000_000 },
};

export function MarketMoversWidget() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("gainers");
  const [pageIndex, setPageIndex] = useState(0);

  const filters = useMemo<ScreenerFilters>(
    () => ({
      ...TAB_FILTERS[tab],
      limit: PAGE_SIZE,
      offset: pageIndex * PAGE_SIZE,
    }),
    [tab, pageIndex],
  );

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["research-movers", tab, pageIndex],
    queryFn: () => screenStocksFromPolygon(filters),
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
  });

  const rows = data?.results ?? [];
  const total = data?.pagination?.total ?? 0;

  const columns = useMemo<ColumnDef<ScreenerResult>[]>(
    () => [
      {
        accessorKey: "symbol",
        header: "Symbol",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-mono text-xs font-semibold text-foreground">{row.original.symbol}</span>
            <span className="text-[10px] text-muted-foreground truncate max-w-[180px]">{row.original.name}</span>
          </div>
        ),
      },
      {
        accessorKey: "price",
        header: "Price",
        cell: ({ row }) => (
          <span className="font-mono text-xs tabular-nums">${row.original.price?.toFixed(2) ?? "—"}</span>
        ),
      },
      {
        accessorKey: "changePercent",
        header: "Change %",
        cell: ({ row }) => {
          const v = row.original.changePercent;
          const positive = (v ?? 0) >= 0;
          return (
            <span
              className={cn(
                "font-mono text-xs tabular-nums font-semibold",
                positive ? "text-success" : "text-destructive",
              )}
            >
              {positive ? "+" : ""}
              {v?.toFixed(2) ?? "—"}%
            </span>
          );
        },
      },
      {
        accessorKey: "volume",
        header: "Volume",
        cell: ({ row }) => (
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            {formatVolume(row.original.volume)}
          </span>
        ),
      },
      {
        accessorKey: "marketCap",
        header: "Mkt Cap",
        cell: ({ row }) => (
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            {formatMarketCap(row.original.marketCap)}
          </span>
        ),
      },
    ],
    [],
  );

  const Icon = tab === "gainers" ? TrendingUp : tab === "losers" ? TrendingDown : Activity;

  return (
    <WidgetCard
      title="Market Movers"
      subtitle="Largest moves & most-traded names"
      icon={<Flame className="h-3.5 w-3.5" />}
      actions={
        <Tabs
          value={tab}
          onValueChange={(v) => {
            setTab(v as Tab);
            setPageIndex(0);
          }}
        >
          <TabsList className="h-7">
            <TabsTrigger value="gainers" className="h-6 text-[11px] font-mono gap-1">
              <TrendingUp className="h-3 w-3" /> Gainers
            </TabsTrigger>
            <TabsTrigger value="losers" className="h-6 text-[11px] font-mono gap-1">
              <TrendingDown className="h-3 w-3" /> Losers
            </TabsTrigger>
            <TabsTrigger value="active" className="h-6 text-[11px] font-mono gap-1">
              <Activity className="h-3 w-3" /> Active
            </TabsTrigger>
          </TabsList>
        </Tabs>
      }
    >
      <DataTable
        columns={columns}
        data={rows}
        isLoading={isLoading || (isFetching && rows.length === 0)}
        pageIndex={pageIndex}
        pageSize={PAGE_SIZE}
        totalRows={total}
        onPageChange={setPageIndex}
        onRowClick={(r) => navigate(`/stock/${r.symbol}`)}
        rowKey={(r) => r.symbol}
        emptyMessage="No movers found."
      />
    </WidgetCard>
  );
}
