import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  Newspaper,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Building2,
  Briefcase,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from "recharts";
import { formatDistanceToNow } from "date-fns";

// Mock news data
const mockNews = [
  {
    id: "1",
    title: "Private Equity Deal Volume Rebounds in Q4 2024",
    source: "Wall Street Journal",
    date: new Date(Date.now() - 2 * 60 * 60 * 1000),
    summary:
      "PE deal activity increased 18% YoY as sponsors deploy dry powder amid improving financing conditions.",
    category: "pipeline",
    sentiment: "positive",
  },
  {
    id: "2",
    title: "Consumer Beauty Sector Sees Record M&A Activity",
    source: "Bloomberg",
    date: new Date(Date.now() - 5 * 60 * 60 * 1000),
    summary:
      "Strategic buyers compete with PE for premium beauty brands, driving multiples to 12-15x EBITDA.",
    category: "portfolio",
    sentiment: "positive",
  },
  {
    id: "3",
    title: "Fed Signals Pause in Rate Cuts for Early 2025",
    source: "Reuters",
    date: new Date(Date.now() - 8 * 60 * 60 * 1000),
    summary:
      "The Federal Reserve indicated it will hold rates steady, citing persistent inflation concerns.",
    category: "pipeline",
    sentiment: "neutral",
  },
  {
    id: "4",
    title: "Healthcare Services Sector Faces Margin Pressure",
    source: "Financial Times",
    date: new Date(Date.now() - 12 * 60 * 60 * 1000),
    summary:
      "Rising labor costs and reimbursement challenges squeeze EBITDA margins across portfolio companies.",
    category: "portfolio",
    sentiment: "negative",
  },
  {
    id: "5",
    title: "New Mezzanine Fund Launches with $2B Target",
    source: "Private Equity International",
    date: new Date(Date.now() - 24 * 60 * 60 * 1000),
    summary:
      "Major credit fund launches new vehicle targeting middle-market sponsor-backed deals.",
    category: "pipeline",
    sentiment: "positive",
  },
  {
    id: "6",
    title: "Software Valuations Stabilize After 2023 Correction",
    source: "TechCrunch",
    date: new Date(Date.now() - 36 * 60 * 60 * 1000),
    summary:
      "Enterprise SaaS multiples hold steady at 8-10x ARR as growth expectations normalize.",
    category: "portfolio",
    sentiment: "neutral",
  },
];

// Economic indicators
const economicIndicators = [
  {
    name: "Fed Funds Rate",
    value: "4.25%",
    change: -0.25,
    trend: "down",
    lastUpdate: "Dec 2024",
  },
  {
    name: "10Y Treasury",
    value: "4.42%",
    change: 0.12,
    trend: "up",
    lastUpdate: "Today",
  },
  {
    name: "S&P 500",
    value: "6,037",
    change: 1.2,
    trend: "up",
    lastUpdate: "Today",
  },
  {
    name: "VIX",
    value: "14.2",
    change: -2.1,
    trend: "down",
    lastUpdate: "Today",
  },
  {
    name: "High Yield Spread",
    value: "285 bps",
    change: -15,
    trend: "down",
    lastUpdate: "Today",
  },
  {
    name: "SOFR",
    value: "4.31%",
    change: 0.0,
    trend: "flat",
    lastUpdate: "Today",
  },
];

// Industry multiples data
const multiplesData = [
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

  const filteredNews =
    newsFilter === "all"
      ? mockNews
      : mockNews.filter((n) => n.category === newsFilter);

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return "text-success";
      case "negative":
        return "text-destructive";
      default:
        return "text-muted-foreground";
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <ArrowUpRight className="h-4 w-4 text-success" />;
      case "down":
        return <ArrowDownRight className="h-4 w-4 text-destructive" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTrendClass = (trend: string, isGoodWhenDown = false) => {
    if (trend === "up") return isGoodWhenDown ? "text-destructive" : "text-success";
    if (trend === "down") return isGoodWhenDown ? "text-success" : "text-destructive";
    return "text-muted-foreground";
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
        <Button variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Data
        </Button>
      </div>

      {/* Economic Indicators */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
          Economic Indicators
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {economicIndicators.map((indicator) => {
            const isVixOrSpread =
              indicator.name === "VIX" || indicator.name === "High Yield Spread";
            return (
              <Card key={indicator.name} className="relative overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground truncate">
                      {indicator.name}
                    </span>
                    {getTrendIcon(indicator.trend)}
                  </div>
                  <p className="text-xl font-bold text-foreground">{indicator.value}</p>
                  <p
                    className={`text-xs font-medium ${getTrendClass(
                      indicator.trend,
                      isVixOrSpread
                    )}`}
                  >
                    {indicator.change > 0 ? "+" : ""}
                    {indicator.change}
                    {indicator.name.includes("%") || indicator.name.includes("Rate")
                      ? "%"
                      : indicator.name === "S&P 500"
                      ? "%"
                      : indicator.name === "VIX"
                      ? "%"
                      : " bps"}
                  </p>
                </CardContent>
              </Card>
            );
          })}
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
                  Industry News
                </CardTitle>
                <Tabs
                  value={newsFilter}
                  onValueChange={(v) => setNewsFilter(v as any)}
                  className="w-auto"
                >
                  <TabsList className="h-8">
                    <TabsTrigger value="all" className="text-xs px-3 h-6">
                      All
                    </TabsTrigger>
                    <TabsTrigger value="portfolio" className="text-xs px-3 h-6">
                      <Briefcase className="h-3 w-3 mr-1" />
                      Portfolio
                    </TabsTrigger>
                    <TabsTrigger value="pipeline" className="text-xs px-3 h-6">
                      <Building2 className="h-3 w-3 mr-1" />
                      Pipeline
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar">
              {filteredNews.map((article) => (
                <div
                  key={article.id}
                  className="p-4 rounded-lg border border-border/50 hover:border-border hover:bg-secondary/30 transition-colors cursor-pointer group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant={article.category === "portfolio" ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {article.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(article.date, { addSuffix: true })}
                        </span>
                      </div>
                      <h3 className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
                        {article.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {article.summary}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-muted-foreground">{article.source}</span>
                        <span className={`text-xs ${getSentimentColor(article.sentiment)}`}>
                          •{" "}
                          {article.sentiment === "positive"
                            ? "Bullish"
                            : article.sentiment === "negative"
                            ? "Bearish"
                            : "Neutral"}
                        </span>
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>
                </div>
              ))}
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
