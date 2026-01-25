import React, { useState } from 'react';
import { Loader2, AlertCircle, RefreshCw, Newspaper, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { usePolygonNews } from '@/hooks/usePolygonNews';
import { ImpactCard } from './ImpactCard';
import { SectorHeatmapStrip } from './SectorHeatmapStrip';
import { AssetBottomSheet } from './AssetBottomSheet';

interface SignalStreamProps {
  className?: string;
}

function ImpactCardSkeleton() {
  return (
    <div className="rounded-xl bg-slate-950/40 backdrop-blur-md border border-slate-800/60 p-4 space-y-3 animate-pulse">
      <div className="flex justify-between">
        <div className="h-3 w-20 bg-slate-800 rounded" />
        <div className="h-3 w-12 bg-slate-800 rounded" />
      </div>
      <div className="h-5 w-full bg-slate-800 rounded" />
      <div className="h-4 w-3/4 bg-slate-800 rounded" />
      <div className="flex gap-2 pt-3 border-t border-slate-800/50">
        <div className="h-8 w-16 bg-slate-800 rounded-full" />
        <div className="h-8 w-16 bg-slate-800 rounded-full" />
        <div className="h-8 w-16 bg-slate-800 rounded-full" />
      </div>
    </div>
  );
}

export function SignalStream({ className }: SignalStreamProps) {
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedSector, setSelectedSector] = useState('all');
  const [showCount, setShowCount] = useState(8);
  
  const { data: articles, isLoading, isRefetching, refetch, error } = usePolygonNews(undefined, 30);

  const handleTickerClick = (ticker: string) => {
    setSelectedTicker(ticker);
    setSheetOpen(true);
  };

  const handleRefresh = () => {
    refetch();
  };

  // Filter articles by sector (simplified - would check ticker sectors in real implementation)
  const filteredArticles = selectedSector === 'all' 
    ? articles 
    : articles?.filter(article => {
        // Simple sector mapping based on common tickers
        const techTickers = ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'META', 'AMZN', 'TSLA'];
        const healthTickers = ['UNH', 'JNJ', 'LLY', 'PFE', 'ABBV', 'MRK'];
        const financeTickers = ['JPM', 'V', 'MA', 'BAC', 'WFC', 'GS'];
        const energyTickers = ['XOM', 'CVX', 'COP', 'SLB', 'OXY'];
        
        const articleTickers = article.tickers || [];
        
        switch (selectedSector) {
          case 'technology':
            return articleTickers.some(t => techTickers.includes(t));
          case 'healthcare':
            return articleTickers.some(t => healthTickers.includes(t));
          case 'financials':
            return articleTickers.some(t => financeTickers.includes(t));
          case 'energy':
            return articleTickers.some(t => energyTickers.includes(t));
          default:
            return true;
        }
      });

  const displayArticles = filteredArticles?.slice(0, showCount);
  const hasMore = (filteredArticles?.length || 0) > showCount;

  return (
    <section className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
            <Zap className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Signal Stream</h2>
            <p className="text-[10px] text-muted-foreground">Real-time market signals & news</p>
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefetching}
          className="h-8 text-xs text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className={cn('h-3.5 w-3.5 mr-1', isRefetching && 'animate-spin')} />
          {articles?.length ?? 0}
        </Button>
      </div>

      {/* Sector Filter Strip */}
      <SectorHeatmapStrip 
        selectedSector={selectedSector} 
        onSectorChange={setSelectedSector} 
      />

      {/* Signal Feed - Single Column */}
      <div className="space-y-3">
        {isLoading ? (
          <>
            <ImpactCardSkeleton />
            <ImpactCardSkeleton />
            <ImpactCardSkeleton />
            <ImpactCardSkeleton />
          </>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 text-center bg-slate-950/40 backdrop-blur-md rounded-xl border border-slate-800/60">
            <AlertCircle className="h-10 w-10 text-destructive/50 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Failed to load signals</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="mt-3 border-slate-700"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        ) : displayArticles && displayArticles.length > 0 ? (
          <>
            {displayArticles.map((article, index) => (
              <ImpactCard
                key={article.id}
                article={article}
                onTickerClick={handleTickerClick}
                index={index}
              />
            ))}
            
            {/* Load More */}
            {hasMore && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCount(prev => prev + 8)}
                className="w-full border-slate-700 bg-slate-950/40 hover:bg-slate-900/60"
              >
                Load More Signals
              </Button>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center bg-slate-950/40 backdrop-blur-md rounded-xl border border-slate-800/60">
            <Newspaper className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              {selectedSector !== 'all' ? 'No signals for this sector' : 'No signals available'}
            </p>
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
