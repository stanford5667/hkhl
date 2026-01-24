import React, { useState } from 'react';
import { Newspaper, RefreshCw, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { usePolygonNews } from '@/hooks/usePolygonNews';
import { NewsCard } from './NewsCard';
import { AssetBottomSheet } from './AssetBottomSheet';

interface DiscoveryFeedProps {
  className?: string;
}

function NewsCardSkeleton() {
  return (
    <div className="rounded-xl bg-card border border-border p-4 space-y-3 animate-pulse">
      <div className="flex justify-between">
        <div className="h-3 w-20 bg-muted rounded" />
        <div className="h-3 w-12 bg-muted rounded" />
      </div>
      <div className="h-6 w-full bg-muted rounded" />
      <div className="h-4 w-3/4 bg-muted rounded" />
      <div className="flex gap-2 pt-2">
        <div className="h-10 w-16 rounded-full bg-muted" />
        <div className="h-10 w-16 rounded-full bg-muted" />
        <div className="h-10 w-16 rounded-full bg-muted" />
      </div>
    </div>
  );
}

export function DiscoveryFeed({ className }: DiscoveryFeedProps) {
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  
  const { data: articles, isLoading, isRefetching, refetch, error } = usePolygonNews(undefined, 20);

  const handleTickerClick = (ticker: string) => {
    setSelectedTicker(ticker);
    setSheetOpen(true);
  };

  const handleRefresh = () => {
    refetch();
  };

  return (
    <section className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
            <Newspaper className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Market Feed</h2>
            <p className="text-xs text-muted-foreground">Real-time market-moving news</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs border-border text-muted-foreground">
            {articles?.length ?? 0} stories
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefetching}
            className="h-10 w-10 text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={cn('h-4 w-4', isRefetching && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Feed - Vertical Social Style */}
      <div className="space-y-4">
        {isLoading ? (
          // Loading Skeletons
          <>
            <NewsCardSkeleton />
            <NewsCardSkeleton />
            <NewsCardSkeleton />
            <NewsCardSkeleton />
          </>
        ) : error ? (
          // Error State
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <AlertCircle className="h-12 w-12 text-destructive/50 mb-4" />
            <p className="text-sm font-medium text-muted-foreground">Failed to load news</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Please try again later</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="mt-4 min-h-[44px]"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        ) : articles && articles.length > 0 ? (
          // News Cards
          articles.map((article, index) => (
            <NewsCard
              key={article.id}
              article={article}
              onTickerClick={handleTickerClick}
              index={index}
            />
          ))
        ) : (
          // Empty State
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Newspaper className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-sm font-medium text-muted-foreground">No news available</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Check back soon for updates</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="mt-4 min-h-[44px]"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        )}
      </div>

      {/* Asset Details Bottom Sheet */}
      <AssetBottomSheet
        ticker={selectedTicker}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </section>
  );
}
