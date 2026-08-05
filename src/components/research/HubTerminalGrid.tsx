import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { usePortfolioTotals } from "@/hooks/useMarketIntel";
import { useWatchlistWithQuotes } from "@/hooks/useWatchlistWithQuotes";
import { useSavedReports } from "@/hooks/useSavedReports";

/* ------------------------------------------------------------------ */
/* Primitives                                                          */
/* ------------------------------------------------------------------ */

const NUM = "font-mono text-[12px] sm:text-[13px] [font-variant-numeric:tabular-nums] tracking-tight";

function fmtCurrency(n: number) {
  if (!isFinite(n)) return "—";
  if (Math.abs(n) >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function fmtDelta(pct: number) {
  return `${pct >= 0 ? "+" : "−"}${Math.abs(pct).toFixed(2)}%`;
}

/** Single row. No card, no radius, hairline rule, cyan left marker on hover/focus. */
function TerminalRow({
  to,
  label,
  value,
  delta,
  loading,
}: {
  to: string;
  label: string;
  value?: string | null;
  /** percentage delta; null/undefined renders an em dash */
  delta?: number | null;
  loading?: boolean;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "group relative flex min-h-[44px] items-center gap-3 border-b border-border/40 px-3 sm:px-4",
        "py-2.5 rounded-none outline-none transition-colors",
        "hover:bg-foreground/[0.035] focus-visible:bg-foreground/[0.05]",
      )}
    >
      {/* cyan active-row marker */}
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-[2px] bg-cyan-400 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
      />

      <span className="min-w-0 flex-1 truncate text-[13px] sm:text-sm font-medium text-foreground">
        {label}
      </span>

      {loading ? (
        <>
          <span className="h-[10px] w-20 bg-muted-foreground/20" />
          <span className="h-[10px] w-12 bg-muted-foreground/15" />
        </>
      ) : (
        <>
          <span
            className={cn(
              NUM,
              "w-[104px] sm:w-[132px] shrink-0 text-right",
              value ? "text-cyan-400" : "text-muted-foreground",
            )}
          >
            {value || "—"}
          </span>
          <span
            className={cn(
              NUM,
              "w-[68px] sm:w-[80px] shrink-0 text-right",
              typeof delta === "number"
                ? delta >= 0
                  ? "text-emerald-500/90"
                  : "text-red-500/90"
                : "text-muted-foreground/50",
            )}
          >
            {typeof delta === "number" ? fmtDelta(delta) : "—"}
          </span>
        </>
      )}

      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground" />
    </Link>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-border/40 px-3 sm:px-4 pb-1.5 pt-4">
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      <span aria-hidden className="h-px flex-1 bg-border/40" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Rows (same hooks/queries as HubOverviewGrid)                        */
/* ------------------------------------------------------------------ */

function AcademyRow() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["hub-academy-progress", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lesson_progress" as any)
        .select("lesson_id, completed_at, course_id, updated_at")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false });
      if (error) return { completed: 0, lastCourse: null as string | null };
      const rows = (data || []) as any[];
      return {
        completed: rows.filter((r) => r.completed_at).length,
        lastCourse: rows[0]?.course_id ?? null,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
  return (
    <TerminalRow
      to="/academy"
      label="Academy"
      loading={isLoading}
      value={data ? `${data.completed} DONE` : "0 DONE"}
      delta={data ? Math.min(100, ((data.completed ?? 0) / 20) * 100) : null}
    />
  );
}

function ChatroomRow() {
  const { data, isLoading } = useQuery({
    queryKey: ["hub-chatrooms-latest"],
    queryFn: async () => {
      const [{ data: rooms }, { count }] = await Promise.all([
        supabase
          .from("chat_rooms")
          .select("name, member_count, is_live")
          .eq("is_admin_only", false)
          .order("member_count", { ascending: false })
          .limit(3),
        supabase
          .from("chat_messages")
          .select("id", { count: "exact", head: true })
          .gte("created_at", new Date(Date.now() - 86_400_000).toISOString()),
      ]);
      return { rooms: rooms || [], todayMessages: count ?? 0 };
    },
    staleTime: 5 * 60 * 1000,
  });
  return (
    <TerminalRow
      to="/community"
      label="Chatroom"
      loading={isLoading}
      value={data ? `${data.todayMessages} MSG/24H` : null}
      delta={null}
    />
  );
}

function BacktesterRow() {
  const { data, isLoading } = useSavedReports();
  const latest = data?.[0];
  const series: number[] = (() => {
    if (!latest) return [];
    const td: any = latest.theme_data || {};
    const candidates = td.equityCurve || td.equity_curve || td.returns || td.performance || td.series || [];
    if (Array.isArray(candidates)) {
      return candidates
        .map((v: any) => (typeof v === "number" ? v : v?.value ?? v?.equity ?? v?.close))
        .filter((v: any) => typeof v === "number")
        .slice(-30);
    }
    return [];
  })();
  const returnPct: number | null = (() => {
    if (series.length >= 2) {
      const start = series[0];
      const end = series[series.length - 1];
      if (start) return ((end - start) / Math.abs(start)) * 100;
    }
    const td: any = latest?.theme_data;
    if (typeof td?.totalReturn === "number") return td.totalReturn;
    return null;
  })();
  return (
    <TerminalRow
      to="/backtester"
      label="Backtester"
      loading={isLoading}
      value={data ? `${data.length} SAVED` : "0 SAVED"}
      delta={returnPct}
    />
  );
}

function SimTradingRow() {
  return <TerminalRow to="/sim-trading" label="Sim Trading" value={null} delta={null} />;
}

function PortfolioRow() {
  const { data, isLoading } = usePortfolioTotals();
  const gain = data && data.totalCost > 0 ? ((data.totalValue - data.totalCost) / data.totalCost) * 100 : null;
  return (
    <TerminalRow
      to="/assets"
      label="Portfolio"
      loading={isLoading}
      value={data ? fmtCurrency(data.totalValue) : null}
      delta={gain}
    />
  );
}

function WatchlistRow() {
  const wl = useWatchlistWithQuotes() as any;
  const items = wl.items ?? wl.itemsWithQuotes ?? [];
  const sorted = items
    .filter((i: any) => typeof i.changePercent === "number")
    .sort((a: any, b: any) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
  const top = sorted[0];
  return (
    <TerminalRow
      to="/watchlist"
      label="Watchlist"
      loading={wl.isLoading}
      value={top ? `${top.item_id}` : `${items.length} TICKERS`}
      delta={top ? top.changePercent : null}
    />
  );
}

/* ------------------------------------------------------------------ */

export function HubTerminalGrid() {
  const { isAuthenticated, loading } = useAuth();
  const isGuest = !isAuthenticated && !loading;

  return (
    <section className="border-y border-border/40">
      <div className="flex items-baseline justify-between gap-3 border-b border-border/40 px-3 sm:px-4 py-2.5">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-foreground">
          Your Hub
        </h2>
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground [font-variant-numeric:tabular-nums]">
          {isGuest ? "guest session" : "live"}
        </span>
      </div>

      {isGuest && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 px-3 sm:px-4 py-2">
          <p className="text-[12px] text-muted-foreground">
            Guest session — sign in to stream your portfolio, watchlist and progress.
          </p>
          <Link
            to="/auth"
            className="font-mono text-[11px] uppercase tracking-wider text-cyan-400 underline-offset-4 hover:underline"
          >
            sign in
          </Link>
        </div>
      )}

      <SectionHeader label="Learn" />
      {isGuest ? (
        <>
          <TerminalRow to="/academy" label="Academy" value={null} delta={null} />
          <TerminalRow to="/community" label="Chatroom" value={null} delta={null} />
        </>
      ) : (
        <>
          <AcademyRow />
          <ChatroomRow />
        </>
      )}

      <SectionHeader label="Test" />
      {isGuest ? (
        <TerminalRow to="/backtester" label="Backtester" value={null} delta={null} />
      ) : (
        <BacktesterRow />
      )}
      <SimTradingRow />

      <SectionHeader label="Track" />
      {isGuest ? (
        <>
          <TerminalRow to="/auth" label="Portfolio" value={null} delta={null} />
          <TerminalRow to="/auth" label="Watchlist" value={null} delta={null} />
        </>
      ) : (
        <>
          <PortfolioRow />
          <WatchlistRow />
        </>
      )}
    </section>
  );
}
