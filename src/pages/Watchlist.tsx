import { useState } from 'react';
import { Star, Plus, RefreshCw, Trash2, TrendingUp, TrendingDown, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useWatchlistWithQuotes, WatchlistItemWithQuote } from '@/hooks/useWatchlistWithQuotes';
import { cn } from '@/lib/utils';

function StatCard({ label, value, icon }: { label: string; value: string | number; icon?: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        {icon && <div className="text-muted-foreground">{icon}</div>}
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function AddStockDialog({ onAdd, isAdding }: { onAdd: (symbol: string, name: string) => void; isAdding: boolean }) {
  const [symbol, setSymbol] = useState('');
  const [name, setName] = useState('');
  const [open, setOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (symbol.trim()) {
      onAdd(symbol.toUpperCase().trim(), name.trim() || symbol.toUpperCase().trim());
      setSymbol('');
      setName('');
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Stock
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Stock to Watchlist</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Symbol</label>
            <Input
              placeholder="e.g. AAPL"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Name (optional)</label>
            <Input
              placeholder="e.g. Apple Inc."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
            />
          </div>
          <Button type="submit" className="w-full" disabled={!symbol.trim() || isAdding}>
            {isAdding ? 'Adding...' : 'Add to Watchlist'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function WatchlistRow({
  item,
  onDelete,
  isDeleting,
}: {
  item: WatchlistItemWithQuote;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) {
  const isPositive = (item.change ?? 0) >= 0;

  return (
    <TableRow className="group">
      <TableCell>
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
          <span className="font-medium">{item.item_id}</span>
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">{item.item_name}</TableCell>
      <TableCell>
        {item.isLoading ? (
          <Skeleton className="h-5 w-16" />
        ) : item.currentPrice !== null ? (
          `$${item.currentPrice.toFixed(2)}`
        ) : (
          '—'
        )}
      </TableCell>
      <TableCell className={cn(isPositive ? 'text-emerald-500' : 'text-destructive')}>
        {item.isLoading ? (
          <Skeleton className="h-5 w-14" />
        ) : item.change !== null ? (
          `${isPositive ? '+' : ''}$${item.change.toFixed(2)}`
        ) : (
          '—'
        )}
      </TableCell>
      <TableCell>
        {item.isLoading ? (
          <Skeleton className="h-5 w-16" />
        ) : item.changePercent !== null ? (
          <Badge
            variant="outline"
            className={cn(
              'gap-1',
              isPositive
                ? 'border-emerald-500/50 text-emerald-500 bg-emerald-500/10'
                : 'border-destructive/50 text-destructive bg-destructive/10'
            )}
          >
            {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {isPositive ? '+' : ''}
            {item.changePercent.toFixed(2)}%
          </Badge>
        ) : (
          '—'
        )}
      </TableCell>
      <TableCell>
        <Button
          variant="ghost"
          size="icon"
          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(item.id)}
          disabled={isDeleting}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

export default function Watchlist() {
  const [searchQuery, setSearchQuery] = useState('');
  const { items, isLoading, addToWatchlist, removeFromWatchlist, isAdding, isRemoving, refreshQuotes, stats } =
    useWatchlistWithQuotes();

  const filteredItems = items.filter(
    (item) =>
      item.item_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.item_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAdd = (symbol: string, name: string) => {
    addToWatchlist({ itemType: 'stock', itemId: symbol, itemName: name });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Watchlist</h1>
        <AddStockDialog onAdd={handleAdd} isAdding={isAdding} />
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Watching" value={stats.total} icon={<Star className="h-4 w-4" />} />
        <StatCard label="Gainers" value={stats.gainers} icon={<TrendingUp className="h-4 w-4 text-emerald-500" />} />
        <StatCard label="Losers" value={stats.losers} icon={<TrendingDown className="h-4 w-4 text-destructive" />} />
        <StatCard
          label="Top Mover"
          value={
            stats.topMover
              ? `${stats.topMover.item_id} ${stats.topMover.changePercent !== null ? ((stats.topMover.changePercent >= 0 ? '+' : '') + stats.topMover.changePercent.toFixed(2) + '%') : ''}`
              : '—'
          }
        />
      </div>

      {/* Search + Refresh */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search watchlist..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="icon" onClick={refreshQuotes} disabled={isLoading}>
          <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
        </Button>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Symbol</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Change ($)</TableHead>
              <TableHead>Change (%)</TableHead>
              <TableHead className="w-12">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && items.length === 0 ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-14" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell></TableCell>
                </TableRow>
              ))
            ) : filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {searchQuery ? 'No stocks match your search' : 'Your watchlist is empty. Add a stock to get started.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((item) => (
                <WatchlistRow
                  key={item.id}
                  item={item}
                  onDelete={removeFromWatchlist}
                  isDeleting={isRemoving}
                />
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
