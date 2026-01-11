import { useCallback, useMemo, CSSProperties } from 'react';
import { List } from 'react-window';
import { TrendingUp, TrendingDown, Star, ChevronDown, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatMarketCap, formatVolume } from '@/services/finvizStyleScreenerService';
import { cn } from '@/lib/utils';
import type { ScreenerResult } from '@/types/screener';

interface VirtualizedResultsTableProps {
  results: ScreenerResult[];
  isLoading: boolean;
  onAddToWatchlist: (symbol: string, name: string) => void;
  isInWatchlist: (symbol: string) => boolean;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  onSort: (column: string) => void;
  onRowClick: (stock: ScreenerResult) => void;
}

const ROW_HEIGHT = 64;
const MAX_VISIBLE_ROWS = 12;

interface RowData {
  results: ScreenerResult[];
  isInWatchlist: (symbol: string) => boolean;
  onRowClick: (stock: ScreenerResult) => void;
  onAddToWatchlist: (symbol: string, name: string) => void;
}

// Row component for react-window v2
function RowComponent({
  index,
  style,
  results,
  isInWatchlist,
  onRowClick,
  onAddToWatchlist,
}: {
  index: number;
  style: CSSProperties;
  ariaAttributes: { 'aria-posinset': number; 'aria-setsize': number; role: 'listitem' };
} & RowData) {
  const stock = results[index];
  const inWatchlist = isInWatchlist(stock.ticker);
  const isUp = stock.changePercent >= 0;
  
  return (
    <div 
      style={style} 
      className="flex items-center border-b border-border/50 hover:bg-muted/50 cursor-pointer group"
      onClick={() => onRowClick(stock)}
    >
      {/* Stock */}
      <div className="flex-1 min-w-[180px] px-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs">
            {stock.ticker}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[180px]">
          {stock.company}
        </p>
      </div>
      
      {/* Sector - hidden on small screens */}
      <div className="hidden sm:block w-[140px] px-4">
        <Badge variant="secondary" className="text-xs font-normal">
          {stock.sector}
        </Badge>
      </div>
      
      {/* Price */}
      <div className="w-[100px] px-4 text-right">
        <span className="font-medium tabular-nums">
          ${stock.price.toFixed(2)}
        </span>
      </div>
      
      {/* Change */}
      <div className="w-[100px] px-4 text-right">
        <div className={cn(
          "flex items-center justify-end gap-1",
          isUp ? "text-emerald-500" : "text-rose-500"
        )}>
          {isUp ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
          <span className="font-medium tabular-nums">
            {isUp ? '+' : ''}{stock.changePercent.toFixed(2)}%
          </span>
        </div>
      </div>
      
      {/* Volume */}
      <div className="w-[120px] px-4 text-right">
        <span className="font-medium tabular-nums">{formatVolume(stock.volume)}</span>
        {stock.relativeVolume && stock.relativeVolume > 1.5 && (
          <p className="text-xs text-amber-500">
            {stock.relativeVolume.toFixed(1)}x avg
          </p>
        )}
      </div>
      
      {/* Market Cap */}
      <div className="w-[100px] px-4 text-right text-muted-foreground tabular-nums">
        {formatMarketCap(stock.marketCap)}
      </div>
      
      {/* Watchlist button */}
      <div className="w-[48px] px-2">
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-8 w-8',
            inWatchlist
              ? 'text-amber-500'
              : 'opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-amber-500'
          )}
          onClick={(e) => {
            e.stopPropagation();
            onAddToWatchlist(stock.ticker, stock.company);
          }}
          disabled={inWatchlist}
        >
          <Star className={cn('h-4 w-4', inWatchlist && 'fill-amber-500')} />
        </Button>
      </div>
    </div>
  );
}

export function VirtualizedResultsTable({
  results,
  isLoading,
  onAddToWatchlist,
  isInWatchlist,
  sortBy,
  sortDirection,
  onSort,
  onRowClick,
}: VirtualizedResultsTableProps) {
  
  const SortableHeader = useCallback(({ column, children, className }: { column: string; children: React.ReactNode; className?: string }) => (
    <div 
      className={cn("cursor-pointer hover:bg-muted/50 transition-colors px-4 py-3 text-sm font-medium text-muted-foreground", className)}
      onClick={() => onSort(column)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortBy === column && (
          <ChevronDown className={cn("h-4 w-4", sortDirection === 'asc' && "rotate-180")} />
        )}
      </div>
    </div>
  ), [onSort, sortBy, sortDirection]);

  const listHeight = useMemo(() => {
    const visibleRows = Math.min(results.length, MAX_VISIBLE_ROWS);
    return visibleRows * ROW_HEIGHT;
  }, [results.length]);

  const rowProps = useMemo<RowData>(() => ({
    results,
    isInWatchlist,
    onRowClick,
    onAddToWatchlist,
  }), [results, isInWatchlist, onRowClick, onAddToWatchlist]);

  if (isLoading) {
    return (
      <Card className="bg-card border-border/50">
        <div className="border-b border-border/50">
          <div className="flex items-center h-12">
            <div className="flex-1 min-w-[180px] px-4 text-sm font-medium text-muted-foreground">Stock</div>
            <div className="hidden sm:block w-[140px] px-4 text-sm font-medium text-muted-foreground">Sector</div>
            <div className="w-[100px] px-4 text-sm font-medium text-muted-foreground text-right">Price</div>
            <div className="w-[100px] px-4 text-sm font-medium text-muted-foreground text-right">Change</div>
            <div className="w-[120px] px-4 text-sm font-medium text-muted-foreground text-right">Volume</div>
            <div className="w-[100px] px-4 text-sm font-medium text-muted-foreground text-right">Market Cap</div>
            <div className="w-[48px]"></div>
          </div>
        </div>
        <div className="divide-y divide-border/50">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex items-center h-16 px-4">
              <div className="flex-1 min-w-[180px]"><Skeleton className="h-5 w-24" /></div>
              <div className="hidden sm:block w-[140px]"><Skeleton className="h-5 w-20" /></div>
              <div className="w-[100px] flex justify-end"><Skeleton className="h-5 w-16" /></div>
              <div className="w-[100px] flex justify-end"><Skeleton className="h-5 w-16" /></div>
              <div className="w-[120px] flex justify-end"><Skeleton className="h-5 w-16" /></div>
              <div className="w-[100px] flex justify-end"><Skeleton className="h-5 w-16" /></div>
              <div className="w-[48px]"></div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (results.length === 0) {
    return (
      <Card className="bg-card border-border/50">
        <CardContent className="py-16 text-center">
          <Sparkles className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="font-medium mb-1">No results yet</h3>
          <p className="text-sm text-muted-foreground">
            Enter a natural language query or pick a quick screen to find stocks
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border/50 overflow-hidden">
      {/* Header */}
      <div className="border-b border-border/50 bg-muted/30">
        <div className="flex items-center">
          <div className="flex-1 min-w-[180px] px-4 py-3 text-sm font-medium text-muted-foreground">Stock</div>
          <div className="hidden sm:block w-[140px] px-4 py-3 text-sm font-medium text-muted-foreground">Sector</div>
          <SortableHeader column="price" className="w-[100px] text-right">Price</SortableHeader>
          <SortableHeader column="change" className="w-[100px] text-right">Change</SortableHeader>
          <SortableHeader column="volume" className="w-[120px] text-right">Volume</SortableHeader>
          <SortableHeader column="marketCap" className="w-[100px] text-right">Market Cap</SortableHeader>
          <div className="w-[48px]"></div>
        </div>
      </div>
      
      {/* Virtualized List */}
      <List
        style={{ height: listHeight, width: '100%' }}
        rowCount={results.length}
        rowHeight={ROW_HEIGHT}
        rowComponent={RowComponent}
        rowProps={rowProps}
        className="scrollbar-hide"
      />
      
      {/* Show count if more than visible */}
      {results.length > MAX_VISIBLE_ROWS && (
        <div className="border-t border-border/50 px-4 py-2 text-xs text-muted-foreground text-center bg-muted/30">
          Showing {MAX_VISIBLE_ROWS} of {results.length} results • Scroll for more
        </div>
      )}
    </Card>
  );
}
