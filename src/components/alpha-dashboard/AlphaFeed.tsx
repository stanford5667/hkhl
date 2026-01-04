import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { AlphaFeedCard, AlphaInsight } from "./AlphaFeedCard";
import { RefreshCw, Filter, Zap, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AlphaFeedProps {
  insights: AlphaInsight[];
  isLoading?: boolean;
  onRefresh?: () => void;
  className?: string;
}

type FilterType = 'all' | 'bullish' | 'bearish' | 'high-confidence';

export function AlphaFeed({ insights, isLoading, onRefresh, className }: AlphaFeedProps) {
  const [filter, setFilter] = useState<FilterType>('all');

  const filteredInsights = insights.filter(insight => {
    switch (filter) {
      case 'bullish':
        return insight.direction === 'bullish';
      case 'bearish':
        return insight.direction === 'bearish';
      case 'high-confidence':
        return insight.confidence >= 75;
      default:
        return true;
    }
  });

  const filterCounts = {
    all: insights.length,
    bullish: insights.filter(i => i.direction === 'bullish').length,
    bearish: insights.filter(i => i.direction === 'bearish').length,
    'high-confidence': insights.filter(i => i.confidence >= 75).length,
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/30">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-400" />
            Alpha Feed
          </h2>
          <p className="text-xs text-muted-foreground">
            {filteredInsights.length} insight{filteredInsights.length !== 1 ? 's' : ''} • Ranked by conviction
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="text-xs">
                <Filter className="h-3.5 w-3.5 mr-1.5" />
                {filter === 'all' ? 'All' : filter === 'high-confidence' ? 'High Conf.' : filter}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Filter by</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
                <DropdownMenuRadioItem value="all">
                  All ({filterCounts.all})
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="bullish">
                  <TrendingUp className="h-3.5 w-3.5 mr-2 text-emerald-400" />
                  Bullish ({filterCounts.bullish})
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="bearish">
                  <TrendingDown className="h-3.5 w-3.5 mr-2 text-rose-400" />
                  Bearish ({filterCounts.bearish})
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="high-confidence">
                  <Zap className="h-3.5 w-3.5 mr-2 text-amber-400" />
                  High Confidence ({filterCounts['high-confidence']})
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Refresh button */}
          <Button 
            variant="ghost" 
            size="icon"
            onClick={onRefresh}
            disabled={isLoading}
            className="h-8 w-8"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Feed content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredInsights.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <Zap className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-muted-foreground">No insights match your filter</p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => setFilter('all')}
                >
                  Clear filter
                </Button>
              </motion.div>
            ) : (
              filteredInsights.map((insight, index) => (
                <AlphaFeedCard 
                  key={insight.id} 
                  insight={insight} 
                  index={index}
                />
              ))
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  );
}
