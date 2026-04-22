import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { type ColumnDef, type SortingState } from "@tanstack/react-table";
import { Filter, X, BarChart3 } from "lucide-react";
import { WidgetCard } from "./WidgetCard";
import { DataTable } from "./DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  screenStocksFromPolygon,
  formatMarketCap,
  formatVolume,
  type ScreenerFilters,
  type ScreenerResult,
} from "@/services/polygonScreenerService";
import { cn } from "@/lib/utils";

const QUICK_FILTERS: { id: string; label: string; filters: Partial<ScreenerFilters> }[] = [
  { id: "all", label: "All", filters: {} },
  { id: "gainers", label: "Top Gainers", filters: { sortBy: "change", sortDirection: "desc", minChange1D: 0 } },
  { id: "losers", label: "Top Losers", filters: { sortBy: "change", sortDirection: "asc", maxChange1D: 0 } },
  { id: "active", label: "Most Active", filters: { sortBy: "volume", sortDirection: "desc" } },
  { id: "largecap", label: "Large Cap", filters: { minMarketCap: 10_000_000_000 } },
  { id: "smallcap", label: "Small Cap", filters: { maxMarketCap: 2_000_000_000 } },
];

interface CustomFilter {
  field: keyof ScreenerFilters;
  label: string;
  value: number;
}

const PAGE_SIZE = 25;

export function StockScreenerWidget() {
  const navigate = useNavigate();
  const [activeQuick, setActiveQuick] = useState("gainers");
  const [search, setSearch] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [sorting, setSorting] = useState<SortingState>([{ id: "changePercent", desc: true }]);
  const [customFilters, setCustomFilters] = useState<CustomFilter[]>([]);
  const [showFilterBuilder, setShowFilterBuilder] = useState(false);

  const filters = useMemo<ScreenerFilters>(() => {
    const quick = QUICK_FILTERS.find((q) => q.id === activeQuick)?.filters ?? {};
    const custom: Partial<ScreenerFilters> = {};
    for (const c of customFilters) {
      (custom as any)[c.field] = c.value;
    }
    const sortBy = sorting[0];
    const sortMap: Record<string, ScreenerFilters["sortBy"]> = {
      changePercent: "change",
      volume: "volume",
      price: "price",
      marketCap: "marketCap",
    };
    return {
      query: search.trim() || undefined,
      ...quick,
      ...custom,
      sortBy: sortBy ? (sortMap[sortBy.id] ?? quick.sortBy ?? "volume") : quick.sortBy ?? "volume",
      sortDirection: sortBy ? (sortBy.desc ? "desc" : "asc") : quick.sortDirection ?? "desc",
      limit: PAGE_SIZE,
      offset: pageIndex * PAGE_SIZE,
    };
  }, [activeQuick, customFilters, search, sorting, pageIndex]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["research-screener", filters],
    queryFn: () => screenStocksFromPolygon(filters),
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
  });

  const rows = data?.results ?? [];
  const total = data?.pagination?.total ?? rows.length;

  const columns = useMemo<ColumnDef<ScreenerResult>[]>(
    () => [
      {
        accessorKey: "symbol",
        header: "Symbol",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-mono text-xs font-semibold text-foreground">{row.original.symbol}</span>
            <span className="text-[10px] text-muted-foreground truncate max-w-[160px]">{row.original.name}</span>
          </div>
        ),
        enableSorting: false,
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
          if (v == null) return <span className="text-muted-foreground">—</span>;
          const positive = v >= 0;
          return (
            <span
              className={cn(
                "font-mono text-xs tabular-nums font-semibold",
                positive ? "text-success" : "text-destructive",
              )}
            >
              {positive ? "+" : ""}
              {v.toFixed(2)}%
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
      {
        accessorKey: "sector",
        header: "Sector",
        cell: ({ row }) => (
          <span className="font-mono text-[11px] text-muted-foreground truncate max-w-[140px] inline-block">
            {row.original.sector || "—"}
          </span>
        ),
        enableSorting: false,
      },
    ],
    [],
  );

  const onQuickClick = (id: string) => {
    setActiveQuick(id);
    setPageIndex(0);
  };

  return (
    <WidgetCard
      title="Stock Screener"
      subtitle={`${total.toLocaleString()} matches`}
      icon={<BarChart3 className="h-3.5 w-3.5" />}
      collapsible
      actions={
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2 gap-1 text-[11px] font-mono"
          onClick={() => setShowFilterBuilder((v) => !v)}
        >
          <Filter className="h-3 w-3" /> Filters
        </Button>
      }
    >
      <div className="px-3 sm:px-4 py-2.5 border-b border-border/50 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPageIndex(0);
            }}
            placeholder="Filter by symbol or name…"
            className="h-8 max-w-xs text-xs font-mono"
          />
          <div className="flex flex-wrap gap-1">
            {QUICK_FILTERS.map((q) => (
              <button
                key={q.id}
                onClick={() => onQuickClick(q.id)}
                className={cn(
                  "h-7 px-2.5 rounded-md text-[11px] font-mono transition-colors border",
                  activeQuick === q.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/30 text-muted-foreground border-border/60 hover:bg-muted/50 hover:text-foreground",
                )}
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>

        {customFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {customFilters.map((c, i) => (
              <Badge key={i} variant="outline" className="font-mono text-[10px] gap-1 pr-1">
                {c.label}
                <button
                  onClick={() => setCustomFilters((prev) => prev.filter((_, idx) => idx !== i))}
                  className="hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        {showFilterBuilder && (
          <CustomFilterRow
            onAdd={(f) => {
              setCustomFilters((prev) => [...prev, f]);
              setPageIndex(0);
            }}
          />
        )}
      </div>

      <DataTable
        columns={columns}
        data={rows}
        isLoading={isLoading || (isFetching && rows.length === 0)}
        pageIndex={pageIndex}
        pageSize={PAGE_SIZE}
        totalRows={total}
        onPageChange={setPageIndex}
        sorting={sorting}
        onSortingChange={setSorting}
        manualSorting
        onRowClick={(r) => navigate(`/stock/${r.symbol}`)}
        rowKey={(r) => r.symbol}
        emptyMessage="No matches. Try different filters."
      />
    </WidgetCard>
  );
}

const FILTER_FIELDS: { value: keyof ScreenerFilters; label: string; placeholder: string }[] = [
  { value: "minMarketCap", label: "Min Mkt Cap", placeholder: "e.g. 1000000000" },
  { value: "maxMarketCap", label: "Max Mkt Cap", placeholder: "e.g. 100000000000" },
  { value: "minPrice", label: "Min Price", placeholder: "$" },
  { value: "maxPrice", label: "Max Price", placeholder: "$" },
  { value: "minChange1D", label: "Min Change %", placeholder: "%" },
  { value: "maxChange1D", label: "Max Change %", placeholder: "%" },
  { value: "minVolume", label: "Min Volume", placeholder: "shares" },
  { value: "minPE", label: "Min P/E", placeholder: "" },
  { value: "maxPE", label: "Max P/E", placeholder: "" },
];

function CustomFilterRow({ onAdd }: { onAdd: (f: CustomFilter) => void }) {
  const [field, setField] = useState<keyof ScreenerFilters>("minMarketCap");
  const [value, setValue] = useState("");

  const submit = () => {
    const num = Number(value);
    if (!Number.isFinite(num)) return;
    const meta = FILTER_FIELDS.find((f) => f.value === field)!;
    onAdd({ field, label: `${meta.label}: ${num.toLocaleString()}`, value: num });
    setValue("");
  };

  return (
    <div className="flex flex-wrap items-center gap-2 pt-1.5 border-t border-border/40">
      <span className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">Add filter:</span>
      <select
        value={field}
        onChange={(e) => setField(e.target.value as keyof ScreenerFilters)}
        className="h-7 rounded-md border border-border/60 bg-background px-2 text-[11px] font-mono"
      >
        {FILTER_FIELDS.map((f) => (
          <option key={f.value} value={f.value}>
            {f.label}
          </option>
        ))}
      </select>
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder={FILTER_FIELDS.find((f) => f.value === field)?.placeholder}
        className="h-7 max-w-[180px] text-xs font-mono"
      />
      <Button size="sm" variant="outline" className="h-7 text-[11px] font-mono" onClick={submit}>
        Add
      </Button>
    </div>
  );
}
