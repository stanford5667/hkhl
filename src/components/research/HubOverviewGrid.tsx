import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Briefcase,
  MessagesSquare,
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

} from "@/hooks/useMarketIntel";
import { useWatchlistWithQuotes } from "@/hooks/useWatchlistWithQuotes";
import { useSavedReports } from "@/hooks/useSavedReports";

type Accent = "emerald" | "violet" | "amber" | "teal" | "indigo" | "rose";

/**
 * Cohesive "Slate Electric" accent family — everything sits in the
 * blue / cyan / indigo range so the six cards read as one system on a
 * dark slate surface instead of six unrelated colours.
 */
const ACCENTS: Record<Accent, { bar: string; badge: string; ring: string; text: string; glow: string; wash: string }> = {
  indigo: {
    bar: "bg-indigo-400/60",
    badge: "bg-indigo-500/10 border-indigo-400/25 text-indigo-300",
    ring: "hover:border-indigo-400/40",
    text: "text-indigo-300",
    glow: "hover:shadow-indigo-500/10",
    wash: "from-indigo-500/[0.07]",
  },
  violet: {
    bar: "bg-violet-400/60",
    badge: "bg-violet-500/10 border-violet-400/25 text-violet-300",
    ring: "hover:border-violet-400/40",
    text: "text-violet-300",
    glow: "hover:shadow-violet-500/10",
    wash: "from-violet-500/[0.07]",
  },
  teal: {
    bar: "bg-cyan-400/60",
    badge: "bg-cyan-500/10 border-cyan-400/25 text-cyan-300",
    ring: "hover:border-cyan-400/40",
    text: "text-cyan-300",
    glow: "hover:shadow-cyan-500/10",
    wash: "from-cyan-500/[0.07]",
  },
  emerald: {
    bar: "bg-sky-400/60",
    badge: "bg-sky-500/10 border-sky-400/25 text-sky-300",
    ring: "hover:border-sky-400/40",
    text: "text-sky-300",
    glow: "hover:shadow-sky-500/10",
    wash: "from-sky-500/[0.07]",
  },
  amber: {
    bar: "bg-blue-400/60",
    badge: "bg-blue-500/10 border-blue-400/25 text-blue-300",
    ring: "hover:border-blue-400/40",
    text: "text-blue-300",
    glow: "hover:shadow-blue-500/10",
    wash: "from-blue-500/[0.07]",
  },
  rose: {
    bar: "bg-teal-400/60",
    badge: "bg-teal-500/10 border-teal-400/25 text-teal-300",
    ring: "hover:border-teal-400/40",
    text: "text-teal-300",
    glow: "hover:shadow-teal-500/10",
    wash: "from-teal-500/[0.07]",
  },
};

interface HubCardProps {
  to: string;
  icon: React.ElementType;
  title: string;
  accent: Accent;
  blurb: string;
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
  accent,
  blurb,
  loading,
  primary,
  secondary,
  extra,
  visual,
  tone = "default",
}: HubCardProps) {
  const a = ACCENTS[accent];
  return (
    <Link
      to={to}
      className={cn(
        "group relative rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm overflow-hidden",
        "p-3 sm:p-3.5 flex flex-col gap-2 sm:gap-2.5 min-h-[120px] sm:min-h-[140px]",
        "transition-all duration-200 will-change-transform",
        "active:scale-[0.985] hover:-translate-y-0.5 hover:bg-card/70 hover:shadow-lg",
        a.ring,
        a.glow,
      )}
    >
      {/* Soft directional wash keeps the accent subtle on dark slate */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent opacity-70 transition-opacity duration-300 group-hover:opacity-100",
          a.wash,
        )}
      />
      <div className={cn("absolute inset-x-0 top-0 h-px", a.bar)} />

      {/* Watermark icon */}
      <Icon
        aria-hidden
        className={cn(
          "pointer-events-none absolute -bottom-4 -right-3 h-20 w-20 opacity-[0.04] transition-all duration-300 group-hover:opacity-[0.08] group-hover:scale-105",
          a.text,
        )}
        strokeWidth={1}
      />

      {/* Icon badge — left rail on mobile, top on desktop */}
      <div
        className={cn(
          "relative z-10 flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg border transition-transform duration-200 group-hover:scale-105",
          a.badge,
        )}
      >
        <Icon className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={1.9} />
      </div>

      <div className="relative z-10 min-w-0 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-sm sm:text-[15px] font-semibold tracking-tight text-foreground truncate">
            {title}
          </h3>
          <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground/60 transition-all duration-200 group-hover:text-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>

        <p className="mt-0.5 text-[11px] sm:text-xs leading-relaxed text-muted-foreground line-clamp-2 sm:line-clamp-2">
          {blurb}
        </p>

        <div className="mt-2 sm:mt-auto sm:pt-2 flex flex-col gap-1">
          {loading ? (
            <>
              <Skeleton className="h-4 w-20 rounded-md" />
              <Skeleton className="h-3 w-28 rounded-md" />
            </>
          ) : primary ? (
            <>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span
                  className={cn(
                    "inline-flex max-w-full items-center rounded-md border px-1.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-tight truncate",
                    tone === "positive" && "border-emerald-400/25 bg-emerald-500/10 text-emerald-300",
                    tone === "negative" && "border-red-400/25 bg-red-500/10 text-red-300",
                    tone === "default" && a.badge,
                  )}
                >
                  {primary}
                </span>
                {secondary && (
                  <span className="text-[10px] text-muted-foreground/80 truncate">{secondary}</span>
                )}
                {visual && <div className="ml-auto shrink-0 opacity-80">{visual}</div>}
              </div>

              {extra && (
                <div
                  className={cn(
                    "text-[10px] truncate overflow-hidden transition-all duration-200",
                    "max-h-0 opacity-0 group-hover:max-h-5 group-hover:opacity-100 group-focus-visible:max-h-5 group-focus-visible:opacity-100",
                    a.text,
                  )}
                >
                  {extra}
                </div>
              )}
            </>
          ) : null}

          <div
            className={cn(
              "flex items-center gap-1 text-[10px] font-semibold tracking-tight",
              a.text,
            )}
          >
            <span className="truncate">{CTAS[title] ?? `Open ${title}`}</span>
            <ArrowUpRight className="h-3 w-3 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
        </div>
      </div>
    </Link>
  );
}


const CTAS: Record<string, string> = {
  Academy: "Start learning free",
  Chatroom: "Join the conversation",
  Backtester: "Test a strategy now",
  Portfolio: "Track my portfolio",
  Watchlist: "Build my watchlist",
  "Smart Money": "See what funds bought",
};

const BLURBS = {
  academy:
    "Go from beginner to confident investor with guided courses on valuation, technicals, options and risk — bite-sized lessons that track your progress.",
  chatroom:
    "Trade ideas in real time with the community: live ticker rooms, analyst commentary, shared research notes and livestreamed market sessions.",
  backtester:
    "Build strategies with a no-code node builder and prove them against years of real market data — slippage-adjusted returns, drawdowns and equity curves.",
  portfolio:
    "One live view of everything you own: real-time values, total return, IRR and MOIC, so you always know exactly how your capital is performing.",
  watchlist:
    "Your personal market radar — live quotes, daily movers and instant one-click access to full AI research on any ticker you follow.",
  smartMoney:
    "Follow the institutions: 13F holdings, insider buys and sells and block trades, decoded into signals you can act on before the crowd.",
} as const;



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
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-mono font-semibold",
        up ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400",
      )}
    >
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {up ? "+" : ""}
      {pct.toFixed(2)}%
    </div>
  );
}

function Sparkline({ points, positive }: { points: number[]; positive: boolean }) {
  if (!points || points.length < 2) return null;
  const w = 64;
  const h = 22;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const step = w / (points.length - 1);
  const coords = points.map((p, i) => [i * step, h - ((p - min) / range) * h] as const);
  const d = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${d} L ${w} ${h} L 0 ${h} Z`;
  const gid = `spark-${positive ? "up" : "dn"}-${points.length}-${Math.round(min)}`;
  return (
    <svg width={w} height={h} className={cn("overflow-visible", positive ? "text-emerald-400" : "text-red-400")}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity={0.35} />
          <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} stroke="none" />
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={coords[coords.length - 1][0]} cy={coords[coords.length - 1][1]} r={1.8} fill="currentColor" />
    </svg>
  );
}

/** Small vertical bar chart — values are normalized to the tallest bar. */
function MiniBars({ values, className }: { values: number[]; className?: string }) {
  const vals = values.filter((v) => isFinite(v)).slice(0, 5);
  if (!vals.length) return null;
  const max = Math.max(...vals.map(Math.abs)) || 1;
  return (
    <div className={cn("flex items-end gap-[3px] h-5", className)}>
      {vals.map((v, i) => (
        <div
          key={i}
          className="w-[5px] rounded-sm bg-current transition-all duration-300"
          style={{ height: `${Math.max(15, (Math.abs(v) / max) * 100)}%`, opacity: 0.35 + (0.65 * (5 - i)) / 5 }}
        />
      ))}
    </div>
  );
}

/** Circular progress ring, pct 0-1. */
function ProgressRing({ pct, label, className }: { pct: number; label?: string; className?: string }) {
  const r = 11;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, pct));
  return (
    <div className={cn("relative h-7 w-7", className)}>
      <svg width={28} height={28} viewBox="0 0 28 28" className="-rotate-90">
        <circle cx={14} cy={14} r={r} fill="none" stroke="currentColor" strokeWidth={2.5} opacity={0.15} />
        <circle
          cx={14}
          cy={14}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped)}
          className="transition-all duration-500"
        />
      </svg>
      {label && (
        <span className="absolute inset-0 flex items-center justify-center text-[8px] font-mono font-semibold">
          {label}
        </span>
      )}
    </div>
  );
}

/** Pulsing live dot + count of active rooms. */
function LiveDots({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: Math.max(1, Math.min(3, count)) }).map((_, i) => (
        <span key={i} className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
        </span>
      ))}
    </div>
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
      accent="emerald"
      blurb={BLURBS.portfolio}
      loading={isLoading}
      primary={data ? fmtCurrency(data.totalValue) : "—"}
      secondary={data ? `${gain >= 0 ? "+" : ""}${gain.toFixed(2)}% total return` : undefined}
      extra={data ? `IRR ${(data.avgIrr || 0).toFixed(1)}% · MOIC ${(data.avgMoic || 0).toFixed(2)}x` : undefined}
      visual={
        data ? (
          <div className="flex items-center gap-2">
            <MiniBars
              values={[data.totalCost || 1, data.totalValue || 1]}
              className={gain >= 0 ? "text-emerald-400" : "text-red-400"}
            />
            <ChangeChip pct={gain} />
          </div>
        ) : null
      }

      tone={gain >= 0 ? "positive" : "negative"}
    />
  );
}

function ChatroomCard() {
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
  const top = data?.rooms?.[0] as any;
  const others = (data?.rooms || []).slice(1, 3) as any[];
  return (
    <HubCard
      to="/community"
      icon={MessagesSquare}
      title="Chatroom"
      accent="violet"
      blurb={BLURBS.chatroom}
      loading={isLoading}
      primary={top ? top.name : "Join the room"}
      secondary={
        data
          ? `${data.todayMessages} messages in the last 24h`
          : "Live rooms, ideas & analyst chat"
      }
      extra={others.length ? others.map((r) => r.name).join(" · ") : undefined}
      visual={
        data ? (
          <div className="flex items-center gap-2 text-violet-400">
            <MiniBars values={(data.rooms || []).map((r: any) => r.member_count || 1)} />
            <LiveDots count={(data.rooms || []).filter((r: any) => r.is_live).length || 1} />
          </div>
        ) : null
      }

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
      accent="amber"
      blurb={BLURBS.watchlist}
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
      visual={
        top ? (
          <div className="flex items-center gap-2">
            <MiniBars
              values={sorted.slice(0, 5).map((s: any) => s.changePercent)}
              className={changePct >= 0 ? "text-emerald-400" : "text-red-400"}
            />
            <ChangeChip pct={changePct} />
          </div>
        ) : null
      }

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
      to="/stock/SPY?tab=backtest"
      icon={LineChart}
      title="Backtester"
      accent="teal"
      blurb={BLURBS.backtester}
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
      visual={
        series.length >= 2 ? (
          <Sparkline points={series} positive={(returnPct ?? 0) >= 0} />
        ) : (
          <Sparkline points={[8, 6, 9, 7, 11, 10, 14, 13, 17]} positive />
        )
      }

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
      accent="indigo"
      blurb={BLURBS.academy}
      loading={isLoading}

      primary={data ? `${data.completed}` : "0"}
      secondary={data && data.completed > 0 ? "lessons completed" : "Continue learning"}
      extra={data?.lastCourse ? `Resume: ${String(data.lastCourse).slice(0, 32)}` : undefined}
      visual={
        <ProgressRing
          pct={Math.min(1, (data?.completed ?? 0) / 20)}
          label={`${Math.round(Math.min(1, (data?.completed ?? 0) / 20) * 100)}`}
          className="text-indigo-400"
        />
      }

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
      accent="rose"
      blurb={BLURBS.smartMoney}
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
      visual={
        d ? (
          <div
            className={cn(
              "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-mono font-semibold",
              isBuy ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400",
            )}
          >
            {isBuy ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {d.total_value ? fmtCurrency(Number(d.total_value)) : isBuy ? "BUY" : "SELL"}
          </div>
        ) : (
          <LiveDots count={3} />
        )
      }

    />
  );
}

function TeaserCard({
  to,
  icon,
  title,
  accent,
  blurb,
}: {
  to: string;
  icon: React.ElementType;
  title: string;
  accent: Accent;
  blurb: string;
}) {
  return (
    <HubCard
      to={to}
      icon={icon}
      title={title}
      accent={accent}
      blurb={blurb}
    />
  );
}

export function HubOverviewGrid() {
  const { isAuthenticated, loading } = useAuth();

  const isGuest = !isAuthenticated && !loading;

  return (
    <WidgetCard title="Your Hub" subtitle="Everything the platform can do, live">
      {isGuest && (
        <div className="mx-2.5 sm:mx-3 mt-2 sm:mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/25 bg-primary/[0.06] px-2.5 py-2">
          <p className="text-[11px] sm:text-xs text-muted-foreground">
            You're browsing as a guest — sign in to see your live portfolio, watchlist and progress.
          </p>
          <Link
            to="/auth"
            className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Sign in free
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-2.5 p-2.5 sm:p-3">
        {isGuest ? (
          <>
            <TeaserCard to="/academy" icon={GraduationCap} title="Academy" accent="indigo" blurb={BLURBS.academy} />
            <TeaserCard to="/community" icon={MessagesSquare} title="Chatroom" accent="violet" blurb={BLURBS.chatroom} />
            <TeaserCard to="/stock/SPY?tab=backtest" icon={LineChart} title="Backtester" accent="teal" blurb={BLURBS.backtester} />
            <TeaserCard to="/auth" icon={Briefcase} title="Portfolio" accent="emerald" blurb={BLURBS.portfolio} />
            <TeaserCard to="/auth" icon={Eye} title="Watchlist" accent="amber" blurb={BLURBS.watchlist} />
            <TeaserCard to="/smart-money" icon={Radar} title="Smart Money" accent="rose" blurb={BLURBS.smartMoney} />
          </>
        ) : (
          <>
            <AcademyCard />
            <ChatroomCard />
            <BacktesterCard />
            <PortfolioCard />
            <WatchlistCard />
            <SmartMoneyCard />
          </>
        )}
      </div>
    </WidgetCard>
  );
}

