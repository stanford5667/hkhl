import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, TrendingUp, TrendingDown } from "lucide-react";

export function InstitutionalHoldings() {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ['smart-money-institutional', search],
    queryFn: async () => {
      let query = supabase
        .from('smart_money_institutional_holdings')
        .select('*')
        .order('filing_date', { ascending: false })
        .limit(100);

      if (search) {
        query = query.or(`ticker.ilike.%${search}%,fund_name.ilike.%${search}%,company_name.ilike.%${search}%`);
      }

      const { data } = await query;
      return data || [];
    },
  });

  const formatValue = (val?: number | null) => {
    if (!val) return '—';
    if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
    if (val >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
    return `$${(val / 1e3).toFixed(0)}K`;
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Institutional Holdings</h1>
        <p className="text-muted-foreground text-sm">13F filings — top institutional investors and their position changes</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search fund or ticker..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : data && data.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fund</TableHead>
                  <TableHead>Ticker</TableHead>
                  <TableHead className="text-right">Shares</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="text-right">Change</TableHead>
                  <TableHead className="text-right">Weight</TableHead>
                  <TableHead>Filing Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="font-medium max-w-[200px] truncate" title={h.fund_name}>{h.fund_name}</TableCell>
                    <TableCell>
                      {h.ticker ? (
                        <Badge variant="outline" className="font-mono">{h.ticker}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground" title={h.company_name}>{h.company_name?.slice(0, 20) || '—'}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{h.shares?.toLocaleString() || '—'}</TableCell>
                    <TableCell className="text-right">{formatValue(h.value)}</TableCell>
                    <TableCell className="text-right">
                      {h.change_pct ? (
                        <span className={`flex items-center justify-end gap-1 ${Number(h.change_pct) > 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {Number(h.change_pct) > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {Number(h.change_pct).toFixed(1)}%
                        </span>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-right text-xs">{h.weight_pct ? `${Number(h.weight_pct).toFixed(2)}%` : '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{h.filing_date}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>No institutional holdings data yet.</p>
              <p className="text-xs mt-1">Data will populate once 13F filings are processed.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
