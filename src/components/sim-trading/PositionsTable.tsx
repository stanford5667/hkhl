import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { format } from 'date-fns';
import type { Position } from './SimPortfolioDetail';

interface Props {
  positions: Position[];
  onClose: (pos: Position) => void;
  onRowClick?: (pos: Position) => void;
}

export function PositionsTable({ positions, onClose, onRowClick }: Props) {
  if (positions.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No open positions. Execute a trade to get started.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ticker</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Avg Cost</TableHead>
            <TableHead className="text-right">Current</TableHead>
            <TableHead className="text-right">Value</TableHead>
            <TableHead className="text-right">P&L</TableHead>
            <TableHead className="text-right">P&L %</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {positions.map((pos, i) => (
            <TableRow key={i} className={onRowClick ? 'cursor-pointer hover:bg-accent/50' : ''} onClick={() => onRowClick?.(pos)}>
              <TableCell className="font-mono font-bold">{pos.ticker}</TableCell>
              <TableCell>
                {pos.instrument_type === 'option' ? (
                  <div>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${pos.option_type === 'call' ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'}`}>
                      {pos.option_type?.toUpperCase()}
                    </span>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      ${pos.strike_price} • {pos.expiration_date ? format(new Date(pos.expiration_date), 'MM/dd/yy') : ''}
                    </div>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">Stock</span>
                )}
              </TableCell>
              <TableCell className="text-right font-mono">{pos.quantity}</TableCell>
              <TableCell className="text-right font-mono">${pos.avg_cost.toFixed(2)}</TableCell>
              <TableCell className="text-right font-mono">
                {pos.current_price ? `$${pos.current_price.toFixed(2)}` : '—'}
              </TableCell>
              <TableCell className="text-right font-mono">
                {pos.current_value ? `$${pos.current_value.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
              </TableCell>
              <TableCell className={`text-right font-mono ${(pos.pnl ?? 0) >= 0 ? 'text-success' : 'text-destructive'}`}>
                {pos.pnl !== null ? `${pos.pnl >= 0 ? '+' : ''}$${pos.pnl.toFixed(2)}` : '—'}
              </TableCell>
              <TableCell className={`text-right font-mono ${(pos.pnl_pct ?? 0) >= 0 ? 'text-success' : 'text-destructive'}`}>
                {pos.pnl_pct !== null ? `${pos.pnl_pct >= 0 ? '+' : ''}${pos.pnl_pct.toFixed(2)}%` : '—'}
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="icon" onClick={() => onClose(pos)} title="Close position">
                  <X className="w-4 h-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
