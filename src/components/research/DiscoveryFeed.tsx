import React, { useState } from 'react';
import { Newspaper, RefreshCw, Loader2, AlertCircle, ChevronDown } from 'lucide-react';
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
    <div className="rounded-md bg-background border border-border/40 p-4 space-y-3 animate-pulse">
      <div className="flex justify-between">
        <div className="h-3 w-20 bg-muted rounded" />
        <div className="h-3 w-12 bg-muted rounded" />
      </div>
      <div className="h-5 w-full bg-muted rounded" />
      <div className="h-4 w-3/4 bg-muted rounded" />
    </div>
  );
}

export function DiscoveryFeed({ className }: DiscoveryFeedProps) {
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  
  const { data: articles, isLoading, isRefetching, refetch, error } = usePolygonNews(undefined, 20);

  const handleTickerClick = (ticker: string) => {
    setSelectedTicker(ticker);
    setSheetOpen(true);
  };

  const handleRefresh = () => {
    refetch();
  };

  // Show only 4 articles initially, then all on expand
  const displayArticles = showAll ? articles : articles?.slice(0, 4);

  return (
    <section className={cn('rounded-md border border-border/40 bg-card overflow-hidden shadow-[0_1px_2px_hsl(var(--foreground)/0.02)]', className)}>
      {/* Header */}
      <div className="flex items-center justify-between gap-4 px-4 sm:px-6 h-12 border-b border-border/40">
        <div className="flex items-center gap-2.5 min-w-0">
          <Newspaper className="h-4 w-4 text-muted-foreground shrink-0" />
          <h2 className="text-[11px] sm:text-xs font-semibold text-foreground uppercase tracking-[0.08em]">Market Feed</h2>
          <p className="text-[11px] text-muted-foreground truncate hidden md:block">Real-time market-moving news</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className="font-normal text-[11px] tabular-nums border-border/40 text-muted-foreground">
            {articles?.length ?? 0} stories
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefetching}
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            aria-label="Refresh news"
          >
            <RefreshCw className={cn('h-4 w-4', isRefetching && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Feed Grid - 2 columns on larger screens */}
      <div className="grid md:grid-cols-2 gap-3 p-4 sm:p-6">
        {isLoading ? (
          <>
            <NewsCardSkeleton />
            <NewsCardSkeleton />
            <NewsCardSkeleton />
            <NewsCardSkeleton />
          </>
        ) : error ? (
          <div className="md:col-span-2 flex flex-col items-center justify-center py-12 text-center bg-background rounded-md border border-border/40">
            <AlertCircle className="h-10 w-10 text-destructive/50 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Failed to load news</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="mt-3"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        ) : displayArticles && displayArticles.length > 0 ? (
          displayArticles.map((article, index) => (
            <NewsCard
              key={article.id}
              article={article}
              onTickerClick={handleTickerClick}
              index={index}
            />
          ))
        ) : (
          <div className="md:col-span-2 flex flex-col items-center justify-center py-12 text-center bg-background rounded-md border border-border/40">
            <Newspaper className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No news available</p>
          </div>
        )}
      </div>

      {/* Show More Button */}
      {articles && articles.length > 4 && !showAll && (
        <div className="flex justify-center pb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAll(true)}
            className="text-xs"
          >
            Show More
            <ChevronDown className="h-3 w-3 ml-1" />
          </Button>
        </div>
      )}

      {/* Asset Details Bottom Sheet */}
      <AssetBottomSheet
        ticker={selectedTicker}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </section>
  );
}
