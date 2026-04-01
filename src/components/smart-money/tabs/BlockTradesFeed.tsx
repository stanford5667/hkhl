import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";
import { format } from "date-fns";
import { SortableTableHead, useSort, sortData } from "../SortableTableHead";

export function BlockTradesFeed() {
  const [search, setSearch] = useState("");
  const { sort, onSort } = useSort("trade_time");

  const { data, isLoading } = useQuery({
    queryKey: ['smart-money-block-trades-full', search],
    queryFn: async () => {
      let query = supabase
        .from('smart_money_block_trades')
        .select('*')
        .order('trade_time', { ascending: false })
        .limit(100);

      if (search) query = query.ilike('ticker', `%${search}%`);

      const { data } = await query;
      return data || [];
    },
    refetchInterval: 30000,
  });

  const sorted = sortData(data || [], sort);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Block Trades</h1>
        <p className="text-muted-foreground text-sm">Large trades (&gt;10,000 shares or &gt;$1M)</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Filter by ticker..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : sorted.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead column="ticker" label="Ticker" sort={sort} onSort={onSort} />
                  <SortableTableHead column="side" label="Side" sort={sort} onSort={onSort} />
                  <SortableTableHead column="shares" label="Shares" sort={sort} onSort={onSort} className="text-right" />
                  <SortableTableHead column="price" label="Price" sort={sort} onSort={onSort} className="text-right" />
                  <SortableTableHead column="total_value" label="Total Value" sort={sort} onSort={onSort} className="text-right" />
                  <SortableTableHead column="exchange" label="Exchange" sort={sort} onSort={onSort} />
                  <SortableTableHead column="trade_time" label="Time" sort={sort} onSort={onSort} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.ticker}</TableCell>
                    <TableCell>
                      <Badge variant={t.side === 'buy' ? 'default' : t.side === 'sell' ? 'destructive' : 'secondary'}>
                        {t.side || 'unknown'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{t.shares?.toLocaleString()}</TableCell>
                    <TableCell className="text-right">${Number(t.price).toFixed(2)}</TableCell>
                    <TableCell className="text-right font-medium">
                      ${t.total_value >= 1e6 ? `${(t.total_value / 1e6).toFixed(2)}M` : `${(t.total_value / 1e3).toFixed(0)}K`}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{t.exchange || '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {t.trade_time ? format(new Date(t.trade_time), 'MMM d, HH:mm:ss') : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>No block trade data yet.</p>
              <p className="text-xs mt-1">Data will populate once the Polygon block trades pipeline runs.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
