import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";
import { format } from "date-fns";

export function OptionsFlowDashboard() {
  const [search, setSearch] = useState("");
  const [sentiment, setSentiment] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ['smart-money-options-flow', search, sentiment],
    queryFn: async () => {
      let query = supabase
        .from('smart_money_options_flow')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (search) query = query.ilike('ticker', `%${search}%`);
      if (sentiment !== 'all') query = query.eq('sentiment', sentiment);

      const { data } = await query;
      return data || [];
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Unusual Options Flow</h1>
        <p className="text-muted-foreground text-sm">Options trades with significantly above-average volume</p>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search ticker..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={sentiment} onValueChange={setSentiment}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="bullish">Bullish</SelectItem>
              <SelectItem value="bearish">Bearish</SelectItem>
              <SelectItem value="neutral">Neutral</SelectItem>
            </SelectContent>
          </Select>
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
                  <TableHead>Ticker</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Strike</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead className="text-right">Premium</TableHead>
                  <TableHead className="text-right">Volume</TableHead>
                  <TableHead className="text-right">OI</TableHead>
                  <TableHead>Sentiment</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">{o.ticker}</TableCell>
                    <TableCell>
                      <Badge variant={o.contract_type === 'call' ? 'default' : 'destructive'}>
                        {o.contract_type.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>${o.strike}</TableCell>
                    <TableCell className="text-xs">{o.expiration}</TableCell>
                    <TableCell className="text-right">${o.premium?.toLocaleString() || '—'}</TableCell>
                    <TableCell className="text-right">{o.volume?.toLocaleString() || '—'}</TableCell>
                    <TableCell className="text-right">{o.open_interest?.toLocaleString() || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={o.sentiment === 'bullish' ? 'default' : o.sentiment === 'bearish' ? 'destructive' : 'secondary'}>
                        {o.sentiment}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {o.trade_time ? format(new Date(o.trade_time), 'MMM d, HH:mm') : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>No unusual options flow data yet.</p>
              <p className="text-xs mt-1">Data will populate once the Polygon options pipeline runs.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
