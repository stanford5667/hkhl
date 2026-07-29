import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import { format, addDays, startOfWeek, endOfWeek } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WidgetCard } from "./WidgetCard";
import { DataTable } from "./DataTable";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type TabId = "today" | "week" | "next";
const PAGE_SIZE = 15;

interface EarningsRow {
  id: string;
  symbol: string;
  company_name: string | null;
  report_date: string;
  time_of_day: string | null;
  eps_estimate: number | null;
  eps_actual: number | null;
  revenue_estimate: number | null;
  market_cap: number | null;
  fiscal_period: string | null;
}

function getRange(tab: TabId): { start: string; end: string } {
  const today = new Date();
  if (tab === "today") {
    const t = format(today, "yyyy-MM-dd");
    return { start: t, end: t };
  }
  if (tab === "week") {
    return {
      start: format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd"),
      end: format(endOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd"),
    };
  }
  // next week
  const next = addDays(today, 7);
  return {
    start: format(startOfWeek(next, { weekStartsOn: 1 }), "yyyy-MM-dd"),
    end: format(endOfWeek(next, { weekStartsOn: 1 }), "yyyy-MM-dd"),
  };
}

function fmtMktCap(v: number | null) {
  if (v == null) return "—";
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
  return `$${v.toLocaleString()}`;
}

export function EarningsCalendarWidget() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabId>("week");
  const [pageIndex, setPageIndex] = useState(0);

  const range = useMemo(() => getRange(tab), [tab]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["research-earnings", range, pageIndex],
    queryFn: async () => {
      const from = pageIndex * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data: rows, count, error } = await supabase
        .from("earnings_calendar")
        .select(
          "id, symbol, company_name, report_date, time_of_day, eps_estimate, eps_actual, revenue_estimate, market_cap, fiscal_period",
          { count: "exact" },
        )
        .gte("report_date", range.start)
        .lte("report_date", range.end)
        .order("market_cap", { ascending: false, nullsFirst: false })
        .order("report_date", { ascending: true })
        .range(from, to);

      if (error) throw error;
      return { rows: (rows as EarningsRow[]) ?? [], total: count ?? 0 };
    },
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  });

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;

  const columns = useMemo<ColumnDef<EarningsRow>[]>(
    () => [
      {
        accessorKey: "symbol",
        header: "Symbol",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-mono text-xs font-semibold text-foreground">{row.original.symbol}</span>
            <span className="text-[10px] text-muted-foreground truncate max-w-[180px]">
              {row.original.company_name || "—"}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "report_date",
        header: "Date",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-foreground">
            {format(new Date(row.original.report_date + "T12:00:00"), "MMM d")}
          </span>
        ),
      },
      {
        accessorKey: "time_of_day",
        header: "Time",
        cell: ({ row }) => {
          const t = row.original.time_of_day;
          const label = t === "bmo" ? "Pre-market" : t === "amc" ? "After-hours" : t || "—";
          return <span className="font-mono text-[11px] text-muted-foreground">{label}</span>;
        },
      },
      {
        accessorKey: "fiscal_period",
        header: "Period",
        cell: ({ row }) => (
          <Badge variant="outline" className="font-mono text-[10px] font-normal border-border/40 text-muted-foreground">
            {row.original.fiscal_period || "—"}
          </Badge>
        ),
      },
      {
        accessorKey: "eps_estimate",
        meta: { numeric: true },
        header: "EPS Est",
        cell: ({ row }) => (
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            {row.original.eps_estimate != null ? `$${row.original.eps_estimate.toFixed(2)}` : "—"}
          </span>
        ),
      },
      {
        accessorKey: "eps_actual",
        meta: { numeric: true },
        header: "EPS Actual",
        cell: ({ row }) => {
          const a = row.original.eps_actual;
          const e = row.original.eps_estimate;
          if (a == null) return <span className="text-muted-foreground">—</span>;
          const beat = e != null && a > e;
          const miss = e != null && a < e;
          return (
            <span
              className={cn(
                "font-mono text-xs tabular-nums font-medium",
                beat && "text-success",
                miss && "text-destructive",
              )}
            >
              ${a.toFixed(2)}
            </span>
          );
        },
      },
      {
        accessorKey: "market_cap",
        meta: { numeric: true },
        header: "Mkt Cap",
        cell: ({ row }) => (
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            {fmtMktCap(row.original.market_cap)}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <WidgetCard
      title="Earnings Calendar"
      subtitle={`${total.toLocaleString()} reports`}
      icon={<CalendarIcon className="h-3.5 w-3.5" />}
      actions={
        <Tabs
          value={tab}
          onValueChange={(v) => {
            setTab(v as TabId);
            setPageIndex(0);
          }}
        >
          <TabsList className="h-7 bg-muted/40">
            <TabsTrigger value="today" className="h-6 text-[11px]">Today</TabsTrigger>
            <TabsTrigger value="week" className="h-6 text-[11px]">This Week</TabsTrigger>
            <TabsTrigger value="next" className="h-6 text-[11px]">Next Week</TabsTrigger>
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
        rowKey={(r) => r.id}
        emptyMessage="No earnings reports in this range."
      />
    </WidgetCard>
  );
}
