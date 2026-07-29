import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Briefcase,
  GitBranch,
  Eye,
  LineChart,
  GraduationCap,
  Radar,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { WidgetCard } from "@/pages/research/components/WidgetCard";
import { cn } from "@/lib/utils";
import {
  usePortfolioTotals,
  useDealPipeline,
} from "@/hooks/useMarketIntel";
import { useWatchlistWithQuotes } from "@/hooks/useWatchlistWithQuotes";
import { useSavedReports } from "@/hooks/useSavedReports";

interface HubCardProps {
  to: string;
  icon: React.ElementType;
  title: string;
  loading?: boolean;
  primary?: React.ReactNode;
  secondary?: React.ReactNode;
  extra?: React.ReactNode;
  visual?: React.ReactNode;
  tone?: "default" | "positive" | "negative";
}

function HubCard({
  to,
  icon: Icon,
  title,
  loading,
  primary,
  secondary,
  extra,
  visual,
  tone = "default",
}: HubCardProps) {
  return (
    <Link
      to={to}
      className={cn(
        "group relative rounded-md border border-border/40 bg-background",
        "p-4 flex flex-col gap-3 min-h-[128px] overflow-hidden",
        "transition-colors duration-150",
        "hover:border-border hover:bg-muted/20",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 items-center justify-center rounded border border-border/50 bg-muted/30 text-muted-foreground shrink-0 transition-colors group-hover:text-foreground">
            <Icon className="h-4 w-4" strokeWidth={1.75} />
          </div>
          <h3 className="text-[11px] font-medium uppercase tracking-[0.08em] truncate text-muted-foreground group-hover:text-foreground transition-colors">
            {title}
          </h3>
        </div>
        <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors shrink-0" />
      </div>

      <div className="flex-1 flex flex-col justify-end gap-1">
        {loading ? (
          <>
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-3 w-32" />
          </>
        ) : (
          <>
            <div className="flex items-end justify-between gap-2">
              <div
                className={cn(
                  "text-lg font-semibold tracking-tight tabular-nums truncate",
                  tone === "positive" && "text-success",
                  tone === "negative" && "text-destructive",
                  tone === "default" && "text-foreground",
                )}
              >
                {primary}
              </div>
              {visual && <div className="shrink-0">{visual}</div>}
            </div>
            {secondary && (
              <div className="text-[11px] text-muted-foreground truncate">{secondary}</div>
            )}
            {extra && (
              <div
                className={cn(
                  "text-[11px] text-muted-foreground/80 truncate overflow-hidden transition-all duration-150",
                  "max-h-0 opacity-0 group-hover:max-h-6 group-hover:opacity-100 group-focus-visible:max-h-6 group-focus-visible:opacity-100",
                )}
              >
                {extra}
              </div>
            )}
          </>
        )}
      </div>
    </Link>
  );
}

function fmtCurrency(n: number) {
  if (!isFinite(n)) return "—";
  if (Math.abs(n) >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function ChangeChip({ pct }: { pct: number }) {
  const up = pct >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[11px] font-medium tabular-nums",
        up ? "text-success" : "text-destructive",
      )}
    >
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {up ? "+" : ""}
      {pct.toFixed(2)}%
    </span>
  );
}

function Sparkline({ points, positive }: { points: number[]; positive: boolean }) {
  if (!points || points.length < 2) return null;
  const w = 60;
  const h = 20;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const step = w / (points.length - 1);
  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${(i * step).toFixed(1)} ${(h - ((p - min) / range) * h).toFixed(1)}`)
    .join(" ");
  return (
    <svg width={w} height={h} className="overflow-visible">
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={positive ? "text-success" : "text-destructive"}
      />
    </svg>
  );
}

function PortfolioCard() {
  const { data, isLoading } = usePortfolioTotals();
  const gain = data && data.totalCost > 0 ? ((data.totalValue - data.totalCost) / data.totalCost) * 100 : 0;
  return (
    <HubCard
      to="/assets"
      icon={Briefcase}
      title="Portfolio"
      loading={isLoading}
      primary={data ? fmtCurrency(data.totalValue) : "—"}
      secondary={data ? `${gain >= 0 ? "+" : ""}${gain.toFixed(2)}% total return` : undefined}
      extra={data ? `IRR ${(data.avgIrr || 0).toFixed(1)}% · MOIC ${(data.avgMoic || 0).toFixed(2)}x` : undefined}
      visual={data ? <ChangeChip pct={gain} /> : null}
      tone={gain >= 0 ? "positive" : "negative"}
    />
  );
}

function PipelineCard() {
  const { data, isLoading } = useDealPipeline();
  const count = data?.length ?? 0;
  const next = (data?.[0] as any) || null;
  const nextName = next?.company_name || next?.name || next?.deal_name || null;
  return (
    <HubCard
      to="/pipeline"
      icon={GitBranch}
      title="Pipeline"
      loading={isLoading}
      primary={`${count}`}
      secondary={count === 1 ? "active deal" : "active deals"}
      extra={nextName ? `Next up: ${nextName}` : undefined}
    />
  );
}

function WatchlistCard() {
  const { itemsWithQuotes, isLoading } = useWatchlistWithQuotes() as any;
  const sorted = (itemsWithQuotes || [])
    .filter((i: any) => typeof i.changePercent === "number")
    .sort((a: any, b: any) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
  const top = sorted[0];
  const others = sorted.slice(1, 3);
  const changePct = top?.changePercent ?? 0;
  return (
    <HubCard
      to="/watchlist"
      icon={Eye}
      title="Watchlist"
      loading={isLoading}
      primary={top ? top.item_id : "Empty"}
      secondary={top ? `${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}% today` : "Add tickers to track"}
      extra={
        others.length
          ? others
              .map((o: any) => `${o.item_id} ${o.changePercent >= 0 ? "+" : ""}${o.changePercent.toFixed(1)}%`)
              .join(" · ")
          : undefined
      }
      visual={top ? <ChangeChip pct={changePct} /> : null}
      tone={top ? (changePct >= 0 ? "positive" : "negative") : "default"}
    />
  );
}

function BacktesterCard() {
  const { data, isLoading } = useSavedReports();
  const latest = data?.[0];
  // Try to pull a returns series out of the saved report for a sparkline
  const series: number[] = (() => {
    if (!latest) return [];
    const td: any = latest.theme_data || {};
    const candidates =
      td.equityCurve || td.equity_curve || td.returns || td.performance || td.series || [];
    if (Array.isArray(candidates)) {
      const nums = candidates
        .map((v: any) => (typeof v === "number" ? v : v?.value ?? v?.equity ?? v?.close))
        .filter((v: any) => typeof v === "number");
      return nums.slice(-30);
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
    <HubCard
      to="/backtester"
      icon={LineChart}
      title="Backtester"
      loading={isLoading}
      primary={latest ? latest.theme_title : "Run your first"}
      secondary={
        latest
          ? `Saved ${new Date(latest.created_at).toLocaleDateString()}`
          : "Test strategies vs history"
      }
      extra={
        latest
          ? `${latest.theme_category || "Strategy"}${returnPct !== null ? ` · ${returnPct >= 0 ? "+" : ""}${returnPct.toFixed(1)}%` : ""}`
          : undefined
      }
      visual={series.length >= 2 ? <Sparkline points={series} positive={(returnPct ?? 0) >= 0} /> : null}
    />
  );
}

function AcademyCard() {
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
      const completed = rows.filter((r) => r.completed_at).length;
      const lastCourse = rows[0]?.course_id ?? null;
      return { completed, lastCourse };
    },
    staleTime: 5 * 60 * 1000,
  });
  return (
    <HubCard
      to="/academy"
      icon={GraduationCap}
      title="Academy"
      loading={isLoading}
      primary={data ? `${data.completed}` : "0"}
      secondary={data && data.completed > 0 ? "lessons completed" : "Continue learning"}
      extra={data?.lastCourse ? `Resume: ${String(data.lastCourse).slice(0, 32)}` : undefined}
    />
  );
}

function SmartMoneyCard() {
  const { data, isLoading } = useQuery({
    queryKey: ["hub-smart-money-latest"],
    queryFn: async () => {
      const { data } = await supabase
        .from("smart_money_insider_trades")
        .select("ticker, insider_name, transaction_type, total_value, filing_date")
        .order("filing_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
  const d: any = data;
  const isBuy = d?.transaction_type?.toLowerCase() === "buy";
  return (
    <HubCard
      to="/smart-money"
      icon={Radar}
      title="Smart Money"
      loading={isLoading}
      primary={d ? d.ticker : "Latest signals"}
      secondary={
        d
          ? `${(d.transaction_type || "").toUpperCase()} · ${d.insider_name ?? ""}`.slice(0, 44)
          : "Track 13F & insider trades"
      }
      extra={
        d?.total_value
          ? `${fmtCurrency(Number(d.total_value))} · ${new Date(d.filing_date).toLocaleDateString()}`
          : undefined
      }
      tone={d ? (isBuy ? "positive" : "negative") : "default"}
    />
  );
}

function TeaserCard({
  to,
  icon,
  title,
}: {
  to: string;
  icon: React.ElementType;
  title: string;
}) {
  return (
    <HubCard
      to={to}
      icon={icon}
      title={title}
      primary={<span className="text-sm font-normal text-muted-foreground">Sign in</span>}
      secondary="to see your data"
    />
  );
}

export function HubOverviewGrid() {
  const { isAuthenticated, loading } = useAuth();

  return (
    <WidgetCard title="Your Hub" subtitle="Live snapshots across the platform">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 p-4 sm:p-6">
        {!isAuthenticated && !loading ? (
          <>
            <TeaserCard to="/auth" icon={Briefcase} title="Portfolio" />
            <TeaserCard to="/auth" icon={GitBranch} title="Pipeline" />
            <TeaserCard to="/auth" icon={Eye} title="Watchlist" />
            <TeaserCard to="/backtester" icon={LineChart} title="Backtester" />
            <TeaserCard to="/academy" icon={GraduationCap} title="Academy" />
            <TeaserCard to="/smart-money" icon={Radar} title="Smart Money" />
          </>
        ) : (
          <>
            <PortfolioCard />
            <PipelineCard />
            <WatchlistCard />
            <BacktesterCard />
            <AcademyCard />
            <SmartMoneyCard />
          </>
        )}
      </div>
    </WidgetCard>
  );
}
