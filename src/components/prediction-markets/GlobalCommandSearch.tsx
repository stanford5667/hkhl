import React, { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  Newspaper,
  X,
  Loader2,
  ExternalLink,
  Command
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface MarketResult {
  id: string;
  title: string;
  platform: string;
  category: string;
  total_volume: number;
  current_price: number | null;
  price_change_24h: number | null;
  similarity: number | null;
}

interface SignalResult {
  id: string;
  content: string;
  source_url: string | null;
  source_type: string;
  published_at: string;
  similarity: number | null;
}

interface SearchResults {
  markets: MarketResult[];
  signals: SignalResult[];
  summary: string;
}

const PlatformIcon = ({ platform }: { platform: string }) => {
  const iconMap: Record<string, string> = {
    polymarket: "🔮",
    kalshi: "📊",
    metaculus: "🎯",
  };
  return <span className="text-base">{iconMap[platform?.toLowerCase()] || "📈"}</span>;
};

export const GlobalCommandSearch: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([
    "Fed interest rate",
    "Trump election",
    "Bitcoin price",
  ]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut to open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setResults(null);

    try {
      const { data, error } = await supabase.functions.invoke("semantic-search", {
        body: { 
          query: searchQuery,
          includeMarkets: true,
          includeSignals: true,
          limit: 10 
        },
      });

      if (error) throw error;

      setResults(data);

      // Add to recent searches
      setRecentSearches((prev) => {
        const updated = [searchQuery, ...prev.filter((s) => s !== searchQuery)].slice(0, 5);
        return updated;
      });
    } catch (error) {
      console.error("Search error:", error);
      setResults({ markets: [], signals: [], summary: "" });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query);
  };

  const formatPrice = (price: number | null) => {
    if (price === null) return "—";
    return `${(price * 100).toFixed(0)}%`;
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) return `$${(volume / 1000000).toFixed(1)}M`;
    if (volume >= 1000) return `$${(volume / 1000).toFixed(1)}K`;
    return `$${volume.toFixed(0)}`;
  };

  return (
    <>
      {/* Search Trigger Button */}
      <Button
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="relative h-10 w-full max-w-sm justify-start text-sm text-muted-foreground"
      >
        <Search className="mr-2 h-4 w-4" />
        <span className="flex-1 text-left">Search markets & news...</span>
        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      {/* Search Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl p-0 gap-0 overflow-hidden">
          {/* Search Header */}
          <div className="flex items-center border-b px-4 py-3">
            <Search className="h-5 w-5 text-muted-foreground mr-3" />
            <form onSubmit={handleSubmit} className="flex-1">
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search markets and news semantically..."
                className="border-0 focus-visible:ring-0 text-base"
              />
            </form>
            {isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
          </div>

          {/* Results Area */}
          <ScrollArea className="max-h-[70vh]">
            <div className="p-4 space-y-4">
              {/* AI Summary */}
              {results?.summary && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-lg bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-md bg-violet-500/20">
                      <Sparkles className="h-4 w-4 text-violet-400" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-violet-400 mb-1">AI Summary</p>
                      <p className="text-sm">{results.summary}</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Loading State */}
              {isLoading && (
                <div className="space-y-3">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              )}

              {/* No Query State */}
              {!query && !results && !isLoading && (
                <div className="text-center py-8">
                  <Command className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground mb-4">
                    Type to search prediction markets and news
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {recentSearches.map((search, i) => (
                      <Badge
                        key={i}
                        variant="secondary"
                        className="cursor-pointer hover:bg-secondary/80"
                        onClick={() => {
                          setQuery(search);
                          performSearch(search);
                        }}
                      >
                        {search}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* No Results */}
              {results && results.markets.length === 0 && results.signals.length === 0 && !isLoading && (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No results found for "{query}"</p>
                  <p className="text-sm mt-1">Try a different search term</p>
                </div>
              )}

              {/* Markets Results */}
              {results && results.markets.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Markets ({results.markets.length})
                  </h3>
                  <div className="space-y-2">
                    <AnimatePresence>
                      {results.markets.map((market, index) => (
                        <motion.div
                          key={market.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <Card 
                            className="cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => {
                              // Navigate to market or show details
                              setIsOpen(false);
                            }}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-center gap-3">
                                <PlatformIcon platform={market.platform} />
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">
                                    {market.title}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="outline" className="text-xs">
                                      {market.category || "General"}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {formatVolume(market.total_volume || 0)}
                                    </span>
                                    {market.similarity && (
                                      <span className="text-xs text-violet-400">
                                        {(market.similarity * 100).toFixed(0)}% match
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-mono font-bold">
                                    {formatPrice(market.current_price)}
                                  </p>
                                  {market.price_change_24h !== null && (
                                    <p className={cn(
                                      "text-xs font-mono flex items-center justify-end gap-0.5",
                                      market.price_change_24h >= 0 ? "text-emerald-500" : "text-rose-500"
                                    )}>
                                      {market.price_change_24h >= 0 ? (
                                        <TrendingUp className="h-3 w-3" />
                                      ) : (
                                        <TrendingDown className="h-3 w-3" />
                                      )}
                                      {market.price_change_24h >= 0 ? "+" : ""}
                                      {(market.price_change_24h * 100).toFixed(1)}%
                                    </p>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {/* Signals Results */}
              {results && results.signals.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                    <Newspaper className="h-4 w-4" />
                    Recent Signals ({results.signals.length})
                  </h3>
                  <div className="space-y-2">
                    <AnimatePresence>
                      {results.signals.map((signal, index) => (
                        <motion.div
                          key={signal.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <Card className="hover:bg-muted/50 transition-colors">
                            <CardContent className="p-3">
                              <div className="flex items-start gap-3">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm line-clamp-2">{signal.content}</p>
                                  <div className="flex items-center gap-2 mt-2">
                                    <Badge variant="outline" className="text-xs">
                                      {signal.source_type}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {formatDistanceToNow(new Date(signal.published_at), { addSuffix: true })}
                                    </span>
                                    {signal.similarity && (
                                      <span className="text-xs text-violet-400">
                                        {(signal.similarity * 100).toFixed(0)}% match
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {signal.source_url && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="shrink-0 h-8 w-8"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      window.open(signal.source_url!, "_blank");
                                    }}
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="border-t px-4 py-2 flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-muted">↵</kbd> to search
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-muted">esc</kbd> to close
              </span>
            </div>
            <span className="flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Semantic AI Search
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default GlobalCommandSearch;
