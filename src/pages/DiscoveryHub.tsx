import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { 
  Compass, 
  Search, 
  Info, 
  TrendingUp, 
  TrendingDown,
  Fish,
  AlertTriangle,
  Filter,
  ExternalLink,
  Newspaper
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// Platform icons mapping
const PlatformIcon = ({ platform }: { platform: string }) => {
  const iconMap: Record<string, string> = {
    polymarket: "🔮",
    kalshi: "📊",
    metaculus: "🎯",
  };
  return <span className="text-lg">{iconMap[platform.toLowerCase()] || "📈"}</span>;
};

interface MarketWithDetails {
  id: string;
  title: string;
  platform: string;
  category: string;
  total_volume: number;
  current_price: number | null;
  price_change_24h: number | null;
  has_whale_activity: boolean;
  has_ai_driver: boolean;
  ai_reasoning: string | null;
  divergence_score: number | null;
  outcome_id: string | null;
}

interface RawSignal {
  id: string;
  content: string;
  source_url: string | null;
  source_type: string;
  published_at: string;
}

export default function DiscoveryHub() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMarket, setSelectedMarket] = useState<MarketWithDetails | null>(null);
  const [filters, setFilters] = useState({
    highVolume: false,
    whaleActivity: false,
    highDivergence: false,
  });

  // Fetch markets with outcomes and signals
  const { data: markets, isLoading: marketsLoading } = useQuery({
    queryKey: ["discovery-markets"],
    queryFn: async () => {
      // Get markets with their primary outcome
      const { data: marketsData, error: marketsError } = await supabase
        .from("prediction_markets")
        .select(`
          id,
          title,
          platform,
          category,
          total_volume,
          market_outcomes (
            id,
            current_price,
            price_change_24h
          )
        `)
        .eq("status", "active")
        .order("total_volume", { ascending: false })
        .limit(100);

      if (marketsError) throw marketsError;

      // Get whale transactions from last 12 hours
      const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
      const { data: whaleData } = await supabase
        .from("whale_transactions")
        .select("market_id")
        .gte("timestamp", twelveHoursAgo);

      const whaleMarketIds = new Set(whaleData?.map(w => w.market_id) || []);

      // Get markets with AI drivers
      const { data: driversData } = await supabase
        .from("market_drivers")
        .select("market_id, ai_reasoning")
        .order("created_at", { ascending: false });

      const driverMap = new Map<string, string>();
      driversData?.forEach(d => {
        if (!driverMap.has(d.market_id)) {
          driverMap.set(d.market_id, d.ai_reasoning || "");
        }
      });

      // Get divergence scores from trade_ideas
      const { data: tradeIdeas } = await supabase
        .from("trade_ideas")
        .select("market_id, divergence_score");

      const divergenceMap = new Map<string, number>();
      tradeIdeas?.forEach(t => {
        if (t.market_id && t.divergence_score) {
          divergenceMap.set(t.market_id, t.divergence_score);
        }
      });

      // Combine all data
      return marketsData?.map(market => {
        const primaryOutcome = market.market_outcomes?.[0];
        return {
          id: market.id,
          title: market.title,
          platform: market.platform,
          category: market.category || "Other",
          total_volume: market.total_volume || 0,
          current_price: primaryOutcome?.current_price ?? null,
          price_change_24h: primaryOutcome?.price_change_24h ?? null,
          has_whale_activity: whaleMarketIds.has(market.id),
          has_ai_driver: driverMap.has(market.id),
          ai_reasoning: driverMap.get(market.id) || null,
          divergence_score: divergenceMap.get(market.id) || null,
          outcome_id: primaryOutcome?.id || null,
        } as MarketWithDetails;
      }) || [];
    },
    staleTime: 30000,
  });

  // Fetch raw signals for selected market
  const { data: rawSignals, isLoading: signalsLoading } = useQuery({
    queryKey: ["market-signals", selectedMarket?.id],
    queryFn: async () => {
      if (!selectedMarket?.id) return [];
      
      // Get signal IDs from market_drivers
      const { data: drivers } = await supabase
        .from("market_drivers")
        .select("signal_id")
        .eq("market_id", selectedMarket.id);

      if (!drivers?.length) return [];

      const signalIds = drivers.map(d => d.signal_id);
      
      const { data: signals } = await supabase
        .from("raw_signals")
        .select("id, content, source_url, source_type, published_at")
        .in("id", signalIds)
        .order("published_at", { ascending: false });

      return signals || [];
    },
    enabled: !!selectedMarket?.id,
  });

  // Filter markets
  const filteredMarkets = useMemo(() => {
    if (!markets) return [];
    
    return markets.filter(market => {
      // Search filter
      if (searchQuery && !market.title.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      // Volume filter (>$10k)
      if (filters.highVolume && market.total_volume < 10000) {
        return false;
      }
      
      // Whale activity filter
      if (filters.whaleActivity && !market.has_whale_activity) {
        return false;
      }
      
      // High divergence filter
      if (filters.highDivergence && (!market.divergence_score || market.divergence_score < 0.15)) {
        return false;
      }
      
      return true;
    });
  }, [markets, searchQuery, filters]);

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) return `$${(volume / 1000000).toFixed(1)}M`;
    if (volume >= 1000) return `$${(volume / 1000).toFixed(1)}K`;
    return `$${volume.toFixed(0)}`;
  };

  const formatPrice = (price: number | null) => {
    if (price === null) return "—";
    return `${(price * 100).toFixed(1)}%`;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600">
            <Compass className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Market Discovery</h1>
            <p className="text-muted-foreground">
              High-density terminal view • {filteredMarkets.length} active markets
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search markets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="highVolume"
                  checked={filters.highVolume}
                  onCheckedChange={(checked) => 
                    setFilters(f => ({ ...f, highVolume: checked === true }))
                  }
                />
                <label htmlFor="highVolume" className="text-sm cursor-pointer">
                  Volume &gt; $10K
                </label>
              </div>
              
              <div className="flex items-center gap-2">
                <Checkbox
                  id="whaleActivity"
                  checked={filters.whaleActivity}
                  onCheckedChange={(checked) => 
                    setFilters(f => ({ ...f, whaleActivity: checked === true }))
                  }
                />
                <label htmlFor="whaleActivity" className="text-sm cursor-pointer flex items-center gap-1">
                  <Fish className="h-3 w-3" /> Whale Activity
                </label>
              </div>
              
              <div className="flex items-center gap-2">
                <Checkbox
                  id="highDivergence"
                  checked={filters.highDivergence}
                  onCheckedChange={(checked) => 
                    setFilters(f => ({ ...f, highDivergence: checked === true }))
                  }
                />
                <label htmlFor="highDivergence" className="text-sm cursor-pointer flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> High Divergence
                </label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Grid */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Active Markets
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {marketsLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[400px]">Market</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">24h Change</TableHead>
                  <TableHead className="text-right">Volume</TableHead>
                  <TableHead className="text-center">Signals</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMarkets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No markets match your filters
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMarkets.map((market) => (
                    <TableRow 
                      key={market.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedMarket(market)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <PlatformIcon platform={market.platform} />
                          <div className="min-w-0">
                            <p className="font-medium truncate max-w-[350px]">
                              {market.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {market.category}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatPrice(market.current_price)}
                      </TableCell>
                      <TableCell className="text-right">
                        {market.price_change_24h !== null ? (
                          <span className={`flex items-center justify-end gap-1 font-mono ${
                            market.price_change_24h >= 0 
                              ? "text-emerald-500" 
                              : "text-rose-500"
                          }`}>
                            {market.price_change_24h >= 0 ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : (
                              <TrendingDown className="h-3 w-3" />
                            )}
                            {market.price_change_24h >= 0 ? "+" : ""}
                            {(market.price_change_24h * 100).toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {formatVolume(market.total_volume)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          {market.has_whale_activity && (
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                                  <Fish className="h-3 w-3" />
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                Smart money activity in last 12h
                              </TooltipContent>
                            </Tooltip>
                          )}
                          
                          {market.divergence_score && market.divergence_score > 0.15 && (
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                                  <AlertTriangle className="h-3 w-3" />
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                High divergence: {(market.divergence_score * 100).toFixed(0)}%
                              </TooltipContent>
                            </Tooltip>
                          )}
                          
                          {market.has_ai_driver && (
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge variant="secondary" className="bg-violet-500/10 text-violet-500 border-violet-500/20">
                                  <Info className="h-3 w-3" />
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-sm">
                                <p className="font-medium mb-1">AI Explanation</p>
                                <p className="text-xs">{market.ai_reasoning || "Analysis available"}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Signal Drawer */}
      <Sheet open={!!selectedMarket} onOpenChange={() => setSelectedMarket(null)}>
        <SheetContent className="w-[500px] sm:max-w-[500px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <PlatformIcon platform={selectedMarket?.platform || ""} />
              <span className="truncate">{selectedMarket?.title}</span>
            </SheetTitle>
            <SheetDescription>
              AI analysis sources and raw signals
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-6 space-y-4">
            {/* Market Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Current Price</p>
                <p className="text-lg font-bold font-mono">
                  {formatPrice(selectedMarket?.current_price ?? null)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">24h Change</p>
                <p className={`text-lg font-bold font-mono ${
                  (selectedMarket?.price_change_24h ?? 0) >= 0 
                    ? "text-emerald-500" 
                    : "text-rose-500"
                }`}>
                  {selectedMarket?.price_change_24h != null 
                    ? `${(selectedMarket.price_change_24h * 100).toFixed(1)}%`
                    : "—"
                  }
                </p>
              </div>
            </div>

            {/* AI Reasoning */}
            {selectedMarket?.ai_reasoning && (
              <div className="p-4 rounded-lg bg-violet-500/10 border border-violet-500/20">
                <p className="text-sm font-medium text-violet-400 mb-2 flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  AI Analysis
                </p>
                <p className="text-sm">{selectedMarket.ai_reasoning}</p>
              </div>
            )}

            {/* Raw Signals */}
            <div>
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Newspaper className="h-4 w-4" />
                Source Signals ({rawSignals?.length || 0})
              </h3>
              
              {signalsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : rawSignals && rawSignals.length > 0 ? (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {rawSignals.map((signal: RawSignal) => (
                    <Card key={signal.id} className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm line-clamp-3">{signal.content}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">
                              {signal.source_type}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(signal.published_at), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                        {signal.source_url && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0"
                            onClick={() => window.open(signal.source_url!, "_blank")}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Newspaper className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No source signals found</p>
                  <p className="text-xs">AI hasn't analyzed this market yet</p>
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
