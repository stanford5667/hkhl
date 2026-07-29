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
  tone?: "default" | "positive" | "negative";
}

function HubCard({ to, icon: Icon, title, loading, primary, secondary, tone = "default" }: HubCardProps) {
  return (
    <Link
      to={to}
      className="group rounded-lg border border-border/60 bg-card/40 backdrop-blur-sm hover:border-primary/50 hover:bg-card/60 transition-colors p-3 sm:p-4 flex flex-col gap-2 min-h-[110px]"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary border border-primary/20 shrink-0">
            <Icon className="h-4 w-4" />
          </div>
          <h3 className="text-xs sm:text-sm font-mono font-semibold uppercase tracking-wide truncate text-foreground">
            {title}
          </h3>
        </div>
        <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
      </div>
      <div className="flex-1 flex flex-col justify-end gap-0.5">
        {loading ? (
          <>
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-3 w-32" />
          </>
        ) : (
          <>
            <div
              className={cn(
                "text-base sm:text-lg font-semibold font-mono truncate",
                tone === "positive" && "text-emerald-400",
                tone === "negative" && "text-red-400",
                tone === "default" && "text-foreground",
              )}
            >
              {primary}
            </div>
            {secondary && (
              <div className="text-[11px] text-muted-foreground truncate">{secondary}</div>
            )}
          </>
        )}
      </div>
    </Link>
  );
}

function fmtCurrency(n: number) {
  if (!isFinite(n)) return "—";
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
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
      tone={gain >= 0 ? "positive" : "negative"}
    />
  );
}

function PipelineCard() {
  const { data, isLoading } = useDealPipeline();
  const count = data?.length ?? 0;
  return (
    <HubCard
      to="/pipeline"
      icon={GitBranch}
      title="Pipeline"
      loading={isLoading}
      primary={`${count}`}
      secondary={count === 1 ? "active deal" : "active deals"}
    />
  );
}

function WatchlistCard() {
  const { itemsWithQuotes, isLoading } = useWatchlistWithQuotes() as any;
  const top = (itemsWithQuotes || [])
    .filter((i: any) => typeof i.changePercent === "number")
    .sort((a: any, b: any) => Math.abs(b.changePercent) - Math.abs(a.changePercent))[0];
  const changePct = top?.changePercent ?? 0;
  return (
    <HubCard
      to="/watchlist"
      icon={Eye}
      title="Watchlist"
      loading={isLoading}
      primary={top ? top.item_id : "Empty"}
      secondary={
        top
          ? `${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}% today`
          : "Add tickers to track"
      }
      tone={top ? (changePct >= 0 ? "positive" : "negative") : "default"}
    />
  );
}

function BacktesterCard() {
  const { data, isLoading } = useSavedReports();
  const latest = data?.[0];
  return (
    <HubCard
      to="/backtester"
      icon={LineChart}
      title="Backtester"
      loading={isLoading}
      primary={latest ? latest.theme_title : "Run your first backtest"}
      secondary={
        latest
          ? `Last saved ${new Date(latest.created_at).toLocaleDateString()}`
          : "Test strategies against history"
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
        .select("lesson_id, completed_at")
        .eq("user_id", user!.id);
      if (error) return { completed: 0 };
      const completed = (data || []).filter((r: any) => r.completed_at).length;
      return { completed };
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
  return (
    <HubCard
      to="/smart-money"
      icon={Radar}
      title="Smart Money"
      loading={isLoading}
      primary={data ? `${(data as any).ticker}` : "Latest signals"}
      secondary={
        data
          ? `${(data as any).transaction_type?.toUpperCase()} · ${(data as any).insider_name ?? ""}`.slice(0, 40)
          : "Track 13F & insider trades"
      }
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
      primary={<span className="text-muted-foreground text-sm font-normal">Sign in</span>}
      secondary="to see your data"
    />
  );
}

export function HubOverviewGrid() {
  const { isAuthenticated, loading } = useAuth();

  return (
    <WidgetCard title="Your Hub" subtitle="Live snapshots across the platform">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 p-3 sm:p-4">
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
