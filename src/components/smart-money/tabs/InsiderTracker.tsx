import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ExternalLink } from "lucide-react";

export function InsiderTracker() {
  const [search, setSearch] = useState("");
  const [txType, setTxType] = useState<string>("all");

  const { data: trades, isLoading } = useQuery({
    queryKey: ['smart-money-insider-trades', search, txType],
    queryFn: async () => {
      let query = supabase
        .from('smart_money_insider_trades')
        .select('*')
        .order('filing_date', { ascending: false })
        .limit(100);

      if (search) {
        query = query.or(`ticker.ilike.%${search}%,insider_name.ilike.%${search}%,company_name.ilike.%${search}%`);
      }
      if (txType !== 'all') {
        query = query.eq('transaction_type', txType);
      }

      const { data } = await query;
      return data || [];
    },
  });

  const formatValue = (val?: number | null) => {
    if (!val) return '—';
    if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
    if (val >= 1e3) return `$${(val / 1e3).toFixed(0)}K`;
    return `$${val.toFixed(0)}`;
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Insider Transactions</h1>
        <p className="text-muted-foreground text-sm">SEC EDGAR insider buys, sells, and exercises</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search ticker, insider, or company..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={txType} onValueChange={setTxType}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Transaction Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="buy">Buys Only</SelectItem>
                <SelectItem value="sell">Sells Only</SelectItem>
                <SelectItem value="exercise">Exercises</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">{[...Array(10)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : trades && trades.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticker</TableHead>
                  <TableHead>Insider</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Shares</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trades.map((t) => (
                  <TableRow key={t.id} className={t.is_significant ? "bg-primary/5" : ""}>
                    <TableCell className="font-medium">{t.ticker}</TableCell>
                    <TableCell>{t.insider_name}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{t.insider_title || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={t.transaction_type === 'buy' ? 'default' : t.transaction_type === 'sell' ? 'destructive' : 'secondary'}>
                        {t.transaction_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{t.shares?.toLocaleString() || '—'}</TableCell>
                    <TableCell className="text-right font-medium">{formatValue(t.total_value)}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{t.filing_date}</TableCell>
                    <TableCell>
                      {t.sec_filing_url && (
                        <a href={t.sec_filing_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                        </a>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>No insider transactions found.</p>
              <p className="text-xs mt-1">Data will populate once the SEC EDGAR pipeline runs.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
