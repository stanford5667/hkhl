import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Flame, Sparkles } from "lucide-react";
import {
  StockSwipeCard,
  SwipeActionButtons,
  SwipeStatsBar,
  DiscoveryFilterBar,
  EndOfDeck,
} from "@/components/stock-discovery";
import { useStockDiscoveryFeed, type SwipeDirection } from "@/hooks/useStockDiscoveryFeed";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export default function StockDiscovery() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [sectorFilter, setSectorFilter] = useState<string | null>(null);
  const [assetType, setAssetType] = useState<string | null>(null);

  const {
    cards,
    isLoading,
    stats,
    handleSwipe,
    undoLastSwipe,
    sectors,
    swipeHistory,
  } = useStockDiscoveryFeed({
    sectorFilter,
    assetType,
    limit: 60,
  });

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (cards.length === 0) return;
      const current = cards[0];
      if (!current) return;

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          handleSwipe(current.ticker, "left");
          break;
        case "ArrowRight":
          e.preventDefault();
          handleSwipe(current.ticker, "right");
          break;
        case "ArrowUp":
          e.preventDefault();
          handleSwipe(current.ticker, "up");
          break;
        case "z":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            undoLastSwipe();
          }
          break;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [cards, handleSwipe, undoLastSwipe]);

  const onSwipeFromCard = useCallback(
    (ticker: string, direction: SwipeDirection) => {
      handleSwipe(ticker, direction);

      if (direction === "right") {
        toast({
          description: `💚 Added ${ticker} to your watchlist`,
          duration: 1500,
        });
      }
    },
    [handleSwipe, toast]
  );

  const onButtonSwipe = useCallback(
    (direction: SwipeDirection) => {
      if (cards.length === 0) return;
      onSwipeFromCard(cards[0].ticker, direction);
    },
    [cards, onSwipeFromCard]
  );

  const handleViewDetails = useCallback(() => {
    if (cards.length === 0) return;
    navigate(`/research?ticker=${cards[0].ticker}`);
  }, [cards, navigate]);

  const handleReset = useCallback(() => {
    window.location.reload();
  }, []);

  // Visible cards (top 2 for stack effect)
  const visibleCards = cards.slice(0, 2);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-4 sm:px-6 pt-4 pb-2 space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-orange-500/20 to-pink-500/20 border border-orange-500/30">
            <Flame className="h-6 w-6 text-orange-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              Stock Discovery
            </h1>
            <p className="text-xs text-muted-foreground">
              Swipe right to like · left to pass · up for details
            </p>
          </div>
        </div>

        <DiscoveryFilterBar
          sectors={sectors}
          selectedSector={sectorFilter}
          onSelectSector={setSectorFilter}
          assetType={assetType}
          onSelectAssetType={setAssetType}
        />

        <SwipeStatsBar
          likes={stats.likes}
          passes={stats.passes}
          saves={stats.saves}
          total={stats.total}
          remaining={cards.length}
        />
      </div>

      {/* Card Stack Area */}
      <div className="flex-1 relative min-h-0 px-4 sm:px-6 py-4">
        {isLoading ? (
          <div className="w-full h-full max-w-md mx-auto">
            <Skeleton className="w-full h-full rounded-3xl" />
          </div>
        ) : cards.length === 0 ? (
          <EndOfDeck likesCount={stats.likes} onReset={handleReset} />
        ) : (
          <div className="relative w-full h-full max-w-md mx-auto" style={{ perspective: "1200px" }}>
            <AnimatePresence>
              {visibleCards.map((card, index) => (
                <StockSwipeCard
                  key={card.ticker}
                  card={card}
                  isTop={index === 0}
                  onSwipe={onSwipeFromCard}
                  onTap={(ticker) => navigate(`/research?ticker=${ticker}`)}
                />
              ))}
            </AnimatePresence>

            {/* Background card placeholder for depth */}
            {cards.length > 2 && (
              <div className="absolute inset-0 rounded-3xl bg-muted/30 border border-border/20 -z-10 scale-[0.9] translate-y-2" />
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {cards.length > 0 && !isLoading && (
        <div className="shrink-0 px-4 sm:px-6 pb-6 pt-2">
          <SwipeActionButtons
            onAction={onButtonSwipe}
            onUndo={undoLastSwipe}
            onViewDetails={handleViewDetails}
            canUndo={swipeHistory.length > 0}
          />

          {/* Keyboard hint */}
          <p className="text-[10px] text-muted-foreground/60 text-center mt-3 hidden sm:block">
            ← → ↑ arrows to swipe · Ctrl+Z to undo
          </p>
        </div>
      )}
    </div>
  );
}
