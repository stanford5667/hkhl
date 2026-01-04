import { useState, useEffect } from "react";
import { Brain, Bell, TrendingUp, Activity, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface StatusData {
  opportunities: number;
  alerts: number;
  sentiment: "bullish" | "bearish" | "neutral";
  lastSync: string | null;
}

export function AIStatusBar() {
  const [status, setStatus] = useState<StatusData>({
    opportunities: 0,
    alerts: 0,
    sentiment: "neutral",
    lastSync: null,
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      // Fetch opportunities count
      const { count: oppCount } = await supabase
        .from("arbitrage_opportunities")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");

      // Fetch alerts count
      const { count: alertCount } = await supabase
        .from("generated_alerts")
        .select("*", { count: "exact", head: true })
        .is("read_at", null);

      // Fetch active markets count for sentiment
      const { count: marketCount } = await supabase
        .from("prediction_markets")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");

      setStatus({
        opportunities: oppCount || 0,
        alerts: alertCount || 0,
        sentiment: "neutral",
        lastSync: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error fetching status:", error);
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    await fetchStatus();
    setIsLoading(false);
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "bullish":
        return "text-emerald-500";
      case "bearish":
        return "text-rose-500";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-violet-500/10 via-purple-500/5 to-transparent border-b border-border/50">
      <div className="flex items-center gap-6">
        {/* AI Status */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Brain className="h-5 w-5 text-violet-500" />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
          </div>
          <span className="text-sm font-medium">AI Active</span>
        </div>

        {/* Quick Stats */}
        <div className="hidden md:flex items-center gap-4 text-sm">
          {status.opportunities > 0 && (
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              <span className="text-muted-foreground">
                {status.opportunities} opportunities
              </span>
            </div>
          )}

          {status.alerts > 0 && (
            <div className="flex items-center gap-1.5">
              <Bell className="h-4 w-4 text-amber-500" />
              <span className="text-muted-foreground">
                {status.alerts} unread alerts
              </span>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <Activity className={cn("h-4 w-4", getSentimentColor(status.sentiment))} />
            <span className="text-muted-foreground capitalize">
              Market: {status.sentiment}
            </span>
          </div>
        </div>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={isLoading}
          className="h-8"
        >
          <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
        </Button>
        <Badge variant="outline" className="hidden sm:flex bg-violet-500/10 border-violet-500/30 text-violet-600 dark:text-violet-400">
          Live
        </Badge>
      </div>
    </div>
  );
}
