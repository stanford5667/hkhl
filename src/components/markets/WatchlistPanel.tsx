import { useState } from 'react';
import { Star, Trash2, TrendingUp, TrendingDown, ExternalLink, Plus, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useWatchlist, WatchlistItem, WatchlistItemType } from '@/hooks/useWatchlist';
import { useEconomicIndicators, EconomicIndicator } from '@/hooks/useEconomicIndicators';
import { cn } from '@/lib/utils';

interface WatchlistItemCardProps {
  item: WatchlistItem;
  indicator?: EconomicIndicator;
  onRemove: (id: string) => void;
  isRemoving: boolean;
}

function WatchlistItemCard({ item, indicator, onRemove, isRemoving }: WatchlistItemCardProps) {
  const changeValue = indicator?.change_value ?? 0;
  const changePercent = indicator?.change_percent ?? 0;
  const isPositive = changeValue >= 0;

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors group">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-bold text-primary">{item.item_id.slice(0, 3)}</span>
        </div>
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{item.item_name}</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{item.item_id}</span>
            <Badge variant="outline" className="text-[10px] px-1 py-0">
              {item.item_type}
            </Badge>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        {indicator && (
          <div className="text-right">
            <p className="font-medium text-sm">
              {indicator.unit === '$' && '$'}
              {indicator.current_value?.toLocaleString()}
              {indicator.unit === '%' && '%'}
            </p>
            <div className={cn(
              "flex items-center gap-1 text-xs",
              isPositive ? "text-green-500" : "text-red-500"
            )}>
              {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              <span>{isPositive ? '+' : ''}{changeValue.toFixed(2)}</span>
            </div>
          </div>
        )}
        
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => onRemove(item.id)}
          disabled={isRemoving}
        >
          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
        </Button>
      </div>
    </div>
  );
}

function EmptyWatchlist({ type }: { type: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
        <Star className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="font-medium text-sm mb-1">No {type} in watchlist</h3>
      <p className="text-xs text-muted-foreground max-w-[200px]">
        Add {type} to your watchlist to track them here
      </p>
    </div>
  );
}

function WatchlistSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-lg" />
            <div>
              <Skeleton className="h-4 w-24 mb-1" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <Skeleton className="h-6 w-16" />
        </div>
      ))}
    </div>
  );
}

export function WatchlistPanel() {
  const [searchQuery, setSearchQuery] = useState('');
  const { watchlist, isLoading, removeFromWatchlist, isRemoving } = useWatchlist();
  const { data: indicators = [] } = useEconomicIndicators();

  const indicatorMap = indicators.reduce((acc, ind) => {
    acc[ind.symbol] = ind;
    return acc;
  }, {} as Record<string, EconomicIndicator>);

  const filteredWatchlist = watchlist.filter((item) =>
    item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.item_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stockItems = filteredWatchlist.filter((item) => item.item_type === 'stock');
  const indicatorItems = filteredWatchlist.filter((item) => item.item_type === 'indicator');
  const commodityItems = filteredWatchlist.filter((item) => item.item_type === 'commodity');
  const companyItems = filteredWatchlist.filter((item) => item.item_type === 'company');

  const renderItems = (items: WatchlistItem[], type: string) => {
    if (isLoading) return <WatchlistSkeleton />;
    if (items.length === 0) return <EmptyWatchlist type={type} />;

    return (
      <div className="space-y-2">
        {items.map((item) => (
          <WatchlistItemCard
            key={item.id}
            item={item}
            indicator={indicatorMap[item.item_id]}
            onRemove={removeFromWatchlist}
            isRemoving={isRemoving}
          />
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
            Watchlist
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {watchlist.length} items
          </Badge>
        </div>
        <div className="relative mt-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search watchlist..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="w-full grid grid-cols-4 h-8 mb-3">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="stocks" className="text-xs">Stocks</TabsTrigger>
            <TabsTrigger value="indicators" className="text-xs">Indicators</TabsTrigger>
            <TabsTrigger value="commodities" className="text-xs">Commodities</TabsTrigger>
          </TabsList>
          
          <ScrollArea className="h-[300px]">
            <TabsContent value="all" className="mt-0">
              {isLoading ? (
                <WatchlistSkeleton />
              ) : filteredWatchlist.length === 0 ? (
                <EmptyWatchlist type="items" />
              ) : (
                <div className="space-y-2">
                  {filteredWatchlist.map((item) => (
                    <WatchlistItemCard
                      key={item.id}
                      item={item}
                      indicator={indicatorMap[item.item_id]}
                      onRemove={removeFromWatchlist}
                      isRemoving={isRemoving}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="stocks" className="mt-0">
              {renderItems(stockItems, 'stocks')}
            </TabsContent>
            
            <TabsContent value="indicators" className="mt-0">
              {renderItems(indicatorItems, 'indicators')}
            </TabsContent>
            
            <TabsContent value="commodities" className="mt-0">
              {renderItems(commodityItems, 'commodities')}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </CardContent>
    </Card>
  );
}
