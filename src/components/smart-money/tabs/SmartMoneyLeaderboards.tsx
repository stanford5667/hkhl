import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Users, Building2 } from "lucide-react";

export function SmartMoneyLeaderboards() {
  const { data: topInsiders, isLoading: insidersLoading } = useQuery({
    queryKey: ['smart-money-top-insiders'],
    queryFn: async () => {
      const { data } = await supabase.rpc('smart_money_top_insiders' as any).limit(10);
      // Fallback: manual query if RPC doesn't exist
      if (!data) {
        const { data: raw } = await supabase
          .from('smart_money_insider_trades')
          .select('insider_name, ticker, total_value')
          .eq('transaction_type', 'buy')
          .order('total_value', { ascending: false })
          .limit(10);
        return raw || [];
      }
      return data;
    },
  });

  const { data: topFunds, isLoading: fundsLoading } = useQuery({
    queryKey: ['smart-money-top-funds'],
    queryFn: async () => {
      const { data } = await supabase
        .from('smart_money_institutional_holdings')
        .select('fund_name, value')
        .order('value', { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Leaderboards</h1>
        <p className="text-muted-foreground text-sm">Top insiders and institutional investors by activity</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Insiders */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" />
              Top Insider Buyers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {insidersLoading ? (
              <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : topInsiders && topInsiders.length > 0 ? (
              <div className="space-y-2">
                {topInsiders.map((insider: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                    <span className="text-lg font-bold text-muted-foreground w-6">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{insider.insider_name}</p>
                      <p className="text-xs text-muted-foreground">{insider.ticker}</p>
                    </div>
                    <span className="text-sm font-medium text-green-500">
                      ${insider.total_value ? (insider.total_value / 1e6).toFixed(2) : '0'}M
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-8 text-muted-foreground text-sm">No insider data yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Top Funds */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-500" />
              Top Institutional Holders
            </CardTitle>
          </CardHeader>
          <CardContent>
            {fundsLoading ? (
              <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : topFunds && topFunds.length > 0 ? (
              <div className="space-y-2">
                {topFunds.map((fund: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                    <span className="text-lg font-bold text-muted-foreground w-6">{i + 1}</span>
                    <p className="text-sm font-medium flex-1 truncate">{fund.fund_name}</p>
                    <span className="text-sm font-medium">
                      ${fund.value ? (fund.value / 1e9).toFixed(2) : '0'}B
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-8 text-muted-foreground text-sm">No institutional data yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
