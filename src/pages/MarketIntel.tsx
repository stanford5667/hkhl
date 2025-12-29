import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart3,
  Newspaper,
  TrendingUp,
  ExternalLink,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Building2,
  Briefcase,
  Loader2,
  AlertCircle,
} from "lucide-react";
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
  fetchLiveMarketData,
  fetchIndustryMultiples,
  fetchMarketNews,
  fallbackMacroIndicators,
  fallbackNews,
  type MacroIndicator,
  type NewsArticle,
  type IndustryMultiples,
} from "@/services/marketData";

// Industry multiples chart data (historical trend)
const defaultMultiplesData = [
  { period: "Q1 2023", consumer: 9.2, healthcare: 11.5, tech: 12.8, industrial: 7.5 },
  { period: "Q2 2023", consumer: 8.8, healthcare: 11.2, tech: 11.5, industrial: 7.2 },
  { period: "Q3 2023", consumer: 8.5, healthcare: 10.8, tech: 10.2, industrial: 7.0 },
  { period: "Q4 2023", consumer: 8.9, healthcare: 11.0, tech: 10.8, industrial: 7.3 },
  { period: "Q1 2024", consumer: 9.1, healthcare: 11.4, tech: 11.2, industrial: 7.6 },
  { period: "Q2 2024", consumer: 9.4, healthcare: 11.8, tech: 11.8, industrial: 7.8 },
  { period: "Q3 2024", consumer: 9.8, healthcare: 12.2, tech: 12.5, industrial: 8.0 },
  { period: "Q4 2024", consumer: 10.2, healthcare: 12.5, tech: 13.0, industrial: 8.2 },
];

export default function MarketIntel() {
  const [newsFilter, setNewsFilter] = useState<"all" | "portfolio" | "pipeline">("all");
  const [indicators, setIndicators] = useState<MacroIndicator[]>(fallbackMacroIndicators);
  const [news, setNews] = useState<NewsArticle[]>(fallbackNews);
  const [multiplesData] = useState(defaultMultiplesData);
  const [industryMultiples, setIndustryMultiples] = useState<IndustryMultiples>({});
  const [loadingMacro, setLoadingMacro] = useState(true);
  const [loadingNews, setLoadingNews] = useState(true);
  const [loadingMultiples, setLoadingMultiples] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [newsIsLive, setNewsIsLive] = useState(false);

  const loadMacroData = async () => {
    setLoadingMacro(true);
    try {
      const result = await fetchLiveMarketData();
      setIndicators(result.data);
      if (result.timestamp) {
        setLastUpdated(result.timestamp);
      }
      if (result.isLive) {
        toast.success("Market data updated");
      } else {
        toast.info("Using cached market data");
      }
    } catch (error) {
      console.error("Error fetching macro data:", error);
      toast.error("Could not fetch live data, using cached values");
    } finally {
      setLoadingMacro(false);
    }
  };

  const loadNewsData = async () => {
    setLoadingNews(true);
    try {
      const result = await fetchMarketNews();
      setNews(result.data);
      setNewsIsLive(result.isLive);
      if (result.isLive) {
        toast.success(`Loaded ${result.data.length} news articles`);
      }
    } catch (error) {
      console.error("Error fetching news:", error);
    } finally {
      setLoadingNews(false);
    }
  };

  const loadMultiplesData = async () => {
    setLoadingMultiples(true);
    try {
      const result = await fetchIndustryMultiples();
      setIndustryMultiples(result.data);
      if (result.isLive) {
        console.log("Fetched industry multiples:", Object.keys(result.data).length);
      }
    } catch (error) {
      console.error("Error fetching multiples:", error);
    } finally {
      setLoadingMultiples(false);
    }
  };

  const handleRefresh = () => {
    loadMacroData();
    loadNewsData();
    loadMultiplesData();
  };

  // Fetch on mount
  useEffect(() => {
    loadMacroData();
    loadNewsData();
  }, []);

  const getTrendIcon = (changePercent: number | null) => {
    if (changePercent === null) return <Minus className="h-4 w-4 text-muted-foreground" />;
    if (changePercent > 0) return <ArrowUpRight className="h-4 w-4 text-success" />;
    if (changePercent < 0) return <ArrowDownRight className="h-4 w-4 text-destructive" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getTrendClass = (changePercent: number | null) => {
    if (changePercent === null) return "text-muted-foreground";
    if (changePercent > 0) return "text-success";
    if (changePercent < 0) return "text-destructive";
    return "text-muted-foreground";
  };

  const formatPrice = (indicator: MacroIndicator) => {
    if (indicator.price === null) return "—";
    
    if (indicator.symbol === "^TNX") {
      return `${indicator.price.toFixed(2)}%`;
    }
    if (indicator.symbol === "BTC-USD") {
      return `$${indicator.price.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    }
    if (indicator.price >= 1000) {
      return indicator.price.toLocaleString(undefined, { maximumFractionDigits: 0 });
    }
    return indicator.price.toFixed(2);
  };

  const handleNewsClick = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="p-6 space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="h1 flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-primary" />
            Market Intelligence
          </h1>
          <p className="text-muted-foreground mt-1">
            Industry news, economic indicators, and market trends
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loadingMacro || loadingNews}>
          {(loadingMacro || loadingNews) ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh Data
        </Button>
      </div>

      {/* Economic Indicators */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Market Indicators
          </h2>
          {lastUpdated && (
            <span className="text-xs text-muted-foreground">
              Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {loadingMacro ? (
            // Skeleton loaders
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="relative overflow-hidden">
                <CardContent className="p-4">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-6 w-16 mb-1" />
                  <Skeleton className="h-3 w-12" />
                </CardContent>
              </Card>
            ))
          ) : (
            indicators.map((indicator) => (
              <Card key={indicator.symbol} className="relative overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground truncate">
                      {indicator.name}
                    </span>
                    {getTrendIcon(indicator.changePercent)}
                  </div>
                  <p className="text-xl font-bold text-foreground">
                    {formatPrice(indicator)}
                  </p>
                  <p className={`text-xs font-medium ${getTrendClass(indicator.changePercent)}`}>
                    {indicator.changePercent !== null
                      ? `${indicator.changePercent > 0 ? "+" : ""}${indicator.changePercent.toFixed(2)}%`
                      : "—"}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* News Feed */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Newspaper className="h-5 w-5 text-primary" />
                  M&A News
                  {!newsIsLive && !loadingNews && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Mock Data
                    </Badge>
                  )}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar">
              {loadingNews ? (
                // Skeleton loaders for news
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="p-4 rounded-lg border border-border/50">
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-5 w-full mb-2" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                ))
              ) : (
                news.map((article) => (
                  <div
                    key={article.id}
                    onClick={() => handleNewsClick(article.url)}
                    className="p-4 rounded-lg border border-border/50 hover:border-primary/50 hover:bg-secondary/30 transition-all cursor-pointer group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary" className="text-xs">
                            {article.source}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {article.time}
                          </span>
                          {article.isMock && (
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              Sample
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
                          {article.headline}
                        </h3>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Industry Multiples Chart */}
        <div>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-5 w-5 text-primary" />
                Industry Multiples (EV/EBITDA)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[420px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={multiplesData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey="period"
                      className="text-xs"
                      tick={{ fill: "hsl(var(--muted-foreground))" }}
                      tickLine={{ stroke: "hsl(var(--border))" }}
                    />
                    <YAxis
                      domain={[6, 14]}
                      className="text-xs"
                      tick={{ fill: "hsl(var(--muted-foreground))" }}
                      tickLine={{ stroke: "hsl(var(--border))" }}
                      tickFormatter={(v) => `${v}x`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => [`${value}x`, ""]}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="tech"
                      stroke="hsl(var(--chart-1))"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      name="Technology"
                    />
                    <Line
                      type="monotone"
                      dataKey="healthcare"
                      stroke="hsl(var(--chart-2))"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      name="Healthcare"
                    />
                    <Line
                      type="monotone"
                      dataKey="consumer"
                      stroke="hsl(var(--chart-3))"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      name="Consumer"
                    />
                    <Line
                      type="monotone"
                      dataKey="industrial"
                      stroke="hsl(var(--chart-4))"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      name="Industrial"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Legend Stats */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-secondary/50">
                  <p className="text-xs text-muted-foreground">Highest Multiple</p>
                  <p className="text-sm font-medium text-foreground">Technology: 13.0x</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/50">
                  <p className="text-xs text-muted-foreground">YoY Change</p>
                  <p className="text-sm font-medium text-success">+1.8x avg</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
