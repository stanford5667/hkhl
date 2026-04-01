import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, ArrowLeftRight, Building2, Activity } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

function StatCard({ title, value, subtitle, icon: Icon, loading }: {
  title: string; value: string; subtitle?: string; icon: React.ElementType; loading?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            {loading ? (
              <Skeleton className="h-7 w-20 mt-1" />
            ) : (
              <p className="text-2xl font-bold">{value}</p>
            )}
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <Icon className="h-8 w-8 text-muted-foreground/30" />
        </div>
      </CardContent>
    </Card>
  );
}

export function SmartMoneyDashboard() {
  const today = format(new Date(), 'yyyy-MM-dd');
  console.log('[SmartMoneyDashboard] Rendering, today:', today);

  const { data: insiderStats, isLoading: insidersLoading } = useQuery({
    queryKey: ['smart-money-insider-stats'],
    queryFn: async () => {
      const { count: buysToday } = await supabase
        .from('smart_money_insider_trades')
        .select('*', { count: 'exact', head: true })
        .eq('transaction_type', 'buy')
        .gte('filing_date', today);
      
      const { data: largestBuy } = await supabase
        .from('smart_money_insider_trades')
        .select('insider_name, ticker, total_value')
        .eq('transaction_type', 'buy')
        .order('total_value', { ascending: false })
        .limit(1)
        .single();

      const { count: totalThisWeek } = await supabase
        .from('smart_money_insider_trades')
        .select('*', { count: 'exact', head: true })
        .gte('filing_date', format(new Date(Date.now() - 7 * 86400000), 'yyyy-MM-dd'));

      return { buysToday: buysToday || 0, largestBuy, totalThisWeek: totalThisWeek || 0 };
    },
  });

  const { data: blockStats, isLoading: blocksLoading } = useQuery({
    queryKey: ['smart-money-block-stats'],
    queryFn: async () => {
      const { count } = await supabase
        .from('smart_money_block_trades')
        .select('*', { count: 'exact', head: true })
        .gte('trade_time', new Date(Date.now() - 86400000).toISOString());

      const { data: largest } = await supabase
        .from('smart_money_block_trades')
        .select('ticker, total_value')
        .order('total_value', { ascending: false })
        .limit(1)
        .single();

      return { todayCount: count || 0, largest };
    },
  });

  const { data: optionsStats, isLoading: optionsLoading } = useQuery({
    queryKey: ['smart-money-options-stats'],
    queryFn: async () => {
      const { count } = await supabase
        .from('smart_money_options_flow')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 86400000).toISOString());

      return { todayCount: count || 0 };
    },
  });

  const formatCurrency = (val?: number | null) => {
    if (!val) return '$0';
    if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
    if (val >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
    if (val >= 1e3) return `$${(val / 1e3).toFixed(0)}K`;
    return `$${val.toFixed(0)}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Smart Money Dashboard</h1>
        <p className="text-muted-foreground text-sm">Track insider transactions, institutional flows, and unusual activity</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Insider Buys Today"
          value={insiderStats?.buysToday?.toString() || '0'}
          subtitle={insiderStats?.totalThisWeek ? `${insiderStats.totalThisWeek} this week` : undefined}
          icon={Users}
          loading={insidersLoading}
        />
        <StatCard
          title="Largest Insider Buy"
          value={formatCurrency(insiderStats?.largestBuy?.total_value)}
          subtitle={insiderStats?.largestBuy ? `${insiderStats.largestBuy.insider_name} (${insiderStats.largestBuy.ticker})` : 'No data yet'}
          icon={TrendingUp}
          loading={insidersLoading}
        />
        <StatCard
          title="Block Trades (24h)"
          value={blockStats?.todayCount?.toString() || '0'}
          subtitle={blockStats?.largest ? `Largest: ${formatCurrency(blockStats.largest.total_value)} (${blockStats.largest.ticker})` : undefined}
          icon={ArrowLeftRight}
          loading={blocksLoading}
        />
        <StatCard
          title="Unusual Options (24h)"
          value={optionsStats?.todayCount?.toString() || '0'}
          icon={Activity}
          loading={optionsLoading}
        />
      </div>

      {/* Recent Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentInsiderBuys />
        <RecentBlockTrades />
      </div>
    </div>
  );
}

function RecentInsiderBuys() {
  const { data, isLoading } = useQuery({
    queryKey: ['smart-money-recent-insider-buys'],
    queryFn: async () => {
      const { data } = await supabase
        .from('smart_money_insider_trades')
        .select('*')
        .eq('transaction_type', 'buy')
        .order('filing_date', { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4" />
          Recent Insider Buys
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : data && data.length > 0 ? (
          <div className="space-y-2">
            {data.map((trade) => (
              <div key={trade.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium">{trade.ticker} — {trade.insider_name}</p>
                  <p className="text-xs text-muted-foreground">{trade.insider_title}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-green-500">
                    ${trade.total_value ? (trade.total_value / 1e6).toFixed(2) : '0'}M
                  </p>
                  <p className="text-xs text-muted-foreground">{trade.filing_date}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <p>No insider data loaded yet.</p>
            <p className="text-xs mt-1">Data will populate once the SEC EDGAR pipeline runs.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RecentBlockTrades() {
  const { data, isLoading } = useQuery({
    queryKey: ['smart-money-recent-block-trades'],
    queryFn: async () => {
      const { data } = await supabase
        .from('smart_money_block_trades')
        .select('*')
        .order('trade_time', { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ArrowLeftRight className="h-4 w-4" />
          Recent Block Trades
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : data && data.length > 0 ? (
          <div className="space-y-2">
            {data.map((trade) => (
              <div key={trade.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium">{trade.ticker}</p>
                  <p className="text-xs text-muted-foreground">{trade.shares?.toLocaleString()} shares @ ${trade.price}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">
                    ${trade.total_value ? (trade.total_value / 1e6).toFixed(2) : '0'}M
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {trade.trade_time ? format(new Date(trade.trade_time), 'MMM d, HH:mm') : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <p>No block trade data yet.</p>
            <p className="text-xs mt-1">Data will populate once the Polygon pipeline runs.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
