import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import type { SimTrade } from './SimPortfolioDetail';

interface Props {
  trades: SimTrade[];
}

export function TradeHistory({ trades }: Props) {
  if (trades.length === 0) {
    return <div className="text-center py-12 text-muted-foreground">No trades yet.</div>;
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Ticker</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Action</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {trades.map(t => (
            <TableRow key={t.id}>
              <TableCell className="text-xs">{format(new Date(t.executed_at), 'MMM d, yyyy HH:mm')}</TableCell>
              <TableCell className="font-mono font-bold">{t.ticker}</TableCell>
              <TableCell>
                {t.instrument_type === 'option' ? (
                  <span className={`text-xs px-1.5 py-0.5 rounded ${t.option_type === 'call' ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'}`}>
                    {t.option_type?.toUpperCase()} ${t.strike_price}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">Stock</span>
                )}
              </TableCell>
              <TableCell>
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${t.action === 'buy' ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'}`}>
                  {t.action.toUpperCase()}
                </span>
              </TableCell>
              <TableCell className="text-right font-mono">{t.quantity}</TableCell>
              <TableCell className="text-right font-mono">${t.price_at_execution.toFixed(2)}</TableCell>
              <TableCell className="text-right font-mono">${t.total_cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
