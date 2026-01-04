import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { RefreshCw, Filter, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { UnifiedFeedCard, FeedItem, FeedItemType } from "./UnifiedFeedCard";
import { toast } from "sonner";

interface LiveFeedProps {
  selectedItem: FeedItem | null;
  onSelectItem: (item: FeedItem | null) => void;
  onAskAI: (context: string) => void;
}

const filterOptions: { id: FeedItemType | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "news", label: "News" },
  { id: "opportunity", label: "Opportunities" },
  { id: "alert", label: "Alerts" },
  { id: "insight", label: "Insights" },
  { id: "whale", label: "Whales" },
];

export function LiveFeed({ selectedItem, onSelectItem, onAskAI }: LiveFeedProps) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [filter, setFilter] = useState<FeedItemType | "all">("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchFeedItems();

    // Set up real-time subscription
    const channel = supabase
      .channel("feed-updates")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "prediction_markets" },
        (payload) => {
          const newItem = transformMarketToFeedItem(payload.new);
          if (newItem) {
            setItems((prev) => [newItem, ...prev]);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "arbitrage_opportunities" },
        (payload) => {
          const newItem = transformOpportunityToFeedItem(payload.new);
          if (newItem) {
            setItems((prev) => [newItem, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchFeedItems = async () => {
    setIsLoading(true);
    try {
      const feedItems: FeedItem[] = [];

      // Fetch markets as news/updates
      const { data: markets } = await supabase
        .from("prediction_markets")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(20);

      if (markets) {
        markets.forEach((market) => {
          const item = transformMarketToFeedItem(market);
          if (item) feedItems.push(item);
        });
      }

      // Fetch opportunities
      const { data: opportunities } = await supabase
        .from("arbitrage_opportunities")
        .select("*")
        .eq("status", "active")
        .order("detected_at", { ascending: false })
        .limit(10);

      if (opportunities) {
        opportunities.forEach((opp) => {
          const item = transformOpportunityToFeedItem(opp);
          if (item) feedItems.push(item);
        });
      }

      // Fetch alerts
      const { data: alerts } = await supabase
        .from("generated_alerts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      if (alerts) {
        alerts.forEach((alert) => {
          feedItems.push({
            id: `alert-${alert.id}`,
            type: "alert",
            title: alert.headline,
            summary: alert.summary || "",
            timestamp: alert.created_at || new Date().toISOString(),
            urgency: alert.urgency === "critical" ? "high" : alert.urgency === "high" ? "medium" : "low",
            metadata: { badge: alert.alert_type },
          });
        });
      }

      // Sort all items by timestamp
      feedItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setItems(feedItems);
    } catch (error) {
      console.error("Error fetching feed items:", error);
      toast.error("Failed to load feed");
    } finally {
      setIsLoading(false);
    }
  };

  const transformMarketToFeedItem = (market: Record<string, unknown>): FeedItem | null => {
    if (!market) return null;
    return {
      id: `market-${market.id}`,
      type: "news",
      title: String(market.title || "Market Update"),
      summary: String(market.description || `Market on ${market.platform}`),
      timestamp: String(market.updated_at || new Date().toISOString()),
      metadata: { 
        badge: market.category,
        platform: market.platform,
      },
    };
  };

  const transformOpportunityToFeedItem = (opp: Record<string, unknown>): FeedItem | null => {
    if (!opp) return null;
    return {
      id: `opp-${opp.id}`,
      type: "opportunity",
      title: `${String(opp.type || "Arbitrage")} Opportunity`,
      summary: `${Number(opp.profit_potential || 0).toFixed(1)}% profit potential across ${(opp.platforms as string[])?.join(", ") || "markets"}`,
      timestamp: String(opp.detected_at || new Date().toISOString()),
      urgency: Number(opp.profit_potential) > 3 ? "high" : "medium",
      metadata: { 
        badge: `${Number(opp.profit_potential || 0).toFixed(1)}%`,
        confidence: opp.confidence,
      },
    };
  };

  const filteredItems = filter === "all" 
    ? items 
    : items.filter((item) => item.type === filter);

  const handleAction = (item: FeedItem, action: string) => {
    if (action === "ask_ai") {
      onAskAI(`Tell me more about: ${item.title}`);
    } else if (action === "view" || action === "analyze" || action === "details") {
      onSelectItem(item);
    } else if (action === "dismiss") {
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      toast.success("Dismissed");
    } else if (action === "watch") {
      toast.success("Added to watchlist");
    } else if (action === "execute") {
      onSelectItem(item);
      toast.info("Opening execution panel...");
    }
  };

  const handleDismiss = (item: FeedItem) => {
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    if (selectedItem?.id === item.id) {
      onSelectItem(null);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-semibold">Live Feed</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchFeedItems}
          disabled={isLoading}
        >
          <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 p-3 border-b overflow-x-auto">
        {filterOptions.map((option) => (
          <Badge
            key={option.id}
            variant={filter === option.id ? "default" : "outline"}
            className="cursor-pointer whitespace-nowrap"
            onClick={() => setFilter(option.id)}
          >
            {option.label}
          </Badge>
        ))}
      </div>

      {/* Feed Items */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No items in feed</p>
              <p className="text-sm mt-1">Sync market data to get started</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {filteredItems.map((item) => (
                <UnifiedFeedCard
                  key={item.id}
                  item={item}
                  isSelected={selectedItem?.id === item.id}
                  onSelect={() => onSelectItem(item)}
                  onAction={(action) => handleAction(item, action)}
                  onDismiss={() => handleDismiss(item)}
                  onWatch={() => toast.success("Added to watchlist")}
                />
              ))}
            </AnimatePresence>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
