import { useState, useEffect, useCallback } from 'react';
import { useWatchlist, WatchlistItem } from './useWatchlist';
import { getCachedQuotes } from '@/services/quoteCacheService';
import { StockQuote } from '@/services/finnhubService';

export interface WatchlistItemWithQuote extends WatchlistItem {
  currentPrice: number | null;
  change: number | null;
  changePercent: number | null;
  isLoading?: boolean;
}

export function useWatchlistWithQuotes() {
  const {
    watchlist,
    isLoading: isWatchlistLoading,
    addToWatchlist,
    removeFromWatchlist,
    isAdding,
    isRemoving,
  } = useWatchlist('stock');

  const [quotes, setQuotes] = useState<Map<string, StockQuote>>(new Map());
  const [isLoadingQuotes, setIsLoadingQuotes] = useState(false);

  const fetchQuotes = useCallback(async () => {
    if (watchlist.length === 0) {
      setQuotes(new Map());
      return;
    }

    const symbols = watchlist.map((item) => item.item_id);
    setIsLoadingQuotes(true);

    try {
      const quotesMap = await getCachedQuotes(symbols);
      setQuotes(quotesMap);
    } catch (error) {
      console.error('Failed to fetch quotes:', error);
    } finally {
      setIsLoadingQuotes(false);
    }
  }, [watchlist]);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  const itemsWithQuotes: WatchlistItemWithQuote[] = watchlist.map((item) => {
    const quote = quotes.get(item.item_id) || quotes.get(item.item_id.toUpperCase());
    return {
      ...item,
      currentPrice: quote?.price ?? null,
      change: quote?.change ?? null,
      changePercent: quote?.changePercent ?? null,
      isLoading: isLoadingQuotes,
    };
  });

  // Stats calculations
  const gainersCount = itemsWithQuotes.filter((i) => (i.change ?? 0) > 0).length;
  const losersCount = itemsWithQuotes.filter((i) => (i.change ?? 0) < 0).length;

  const topMover = itemsWithQuotes.reduce<WatchlistItemWithQuote | null>((top, item) => {
    if (!top) return item;
    const absChange = Math.abs(item.changePercent ?? 0);
    const topAbsChange = Math.abs(top.changePercent ?? 0);
    return absChange > topAbsChange ? item : top;
  }, null);

  return {
    items: itemsWithQuotes,
    isLoading: isWatchlistLoading || isLoadingQuotes,
    addToWatchlist,
    removeFromWatchlist,
    isAdding,
    isRemoving,
    refreshQuotes: fetchQuotes,
    stats: {
      total: watchlist.length,
      gainers: gainersCount,
      losers: losersCount,
      topMover,
    },
  };
}
