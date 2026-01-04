import { useState, useMemo } from "react";
import { 
  Zap, TrendingUp, TrendingDown, AlertTriangle, Clock, ExternalLink,
  Sparkles, X, BarChart3, Users, Globe, Filter, ChevronRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { 
  useNewsIntelligence, 
  NewsArticle, 
  NewsCategory, 
  NewsSeverity, 
  TimeRange 
} from "@/hooks/useNewsIntelligence";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils";
import { NewsFilters } from "@/components/news";

export default function NewsIntelligence() {
  const [category, setCategory] = useState<NewsCategory>('all');
  const [severity, setSeverity] = useState<NewsSeverity>('all');
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const [showAI, setShowAI] = useState(false);

  const { articles, isLoading, stats, refetch } = useNewsIntelligence({
    category,
    severity,
    timeRange,
  });

  // Compute derived stats
  const derivedStats = useMemo(() => {
    const now = Date.now();
    const lastHour = articles.filter(a => 
      now - new Date(a.detected_at).getTime() < 60 * 60 * 1000
    ).length;
    
    const uniqueTickers = new Set<string>();
    articles.forEach(a => {
      (a.related_markets || []).forEach(t => uniqueTickers.add(t));
    });

    return {
      lastHour,
      uniqueTickers: uniqueTickers.size,
      topTickers: Array.from(uniqueTickers).slice(0, 5),
    };
  }, [articles]);

  return (
    <div className="h-screen flex flex-col bg-slate-950 overflow-hidden">
      {/* Top Metrics Bar */}
      <div className="flex-shrink-0 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 py-3">
          {/* Left: Title + Stats */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500/20">
                <Zap className="h-5 w-5 text-amber-400" />
              </div>
              <span className="font-semibold text-white">Signal Feed</span>
            </div>

            <Separator orientation="vertical" className="h-8 bg-slate-700" />

            {/* Quick Stats */}
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-slate-400">Last hour:</span>
                <span className="font-mono font-bold text-white">{derivedStats.lastHour}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-slate-500" />
                <span className="text-slate-400">Total:</span>
                <span className="font-mono font-bold text-white">{stats.total}</span>
              </div>

              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-500" />
                <span className="text-slate-400">Critical:</span>
                <span className={cn(
                  "font-mono font-bold",
                  stats.critical > 0 ? "text-rose-400" : "text-slate-500"
                )}>{stats.critical}</span>
              </div>

              <div className="flex items-center gap-2">
                {stats.avgSentiment >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-rose-500" />
                )}
                <span className="text-slate-400">Sentiment:</span>
                <span className={cn(
                  "font-mono font-bold",
                  stats.avgSentiment >= 0 ? "text-emerald-400" : "text-rose-400"
                )}>
                  {stats.avgSentiment >= 0 ? "+" : ""}{(stats.avgSentiment * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>

          {/* Right: Filters */}
          <NewsFilters
            category={category}
            setCategory={(v) => setCategory(v as NewsCategory)}
            severity={severity}
            setSeverity={(v) => setSeverity(v as NewsSeverity)}
            timeRange={timeRange}
            setTimeRange={(v) => setTimeRange(v as TimeRange)}
            onRefresh={refetch}
            isRefreshing={isLoading}
          />
        </div>

        {/* Ticker Ribbon */}
        {derivedStats.topTickers.length > 0 && (
          <div className="px-6 pb-3 flex items-center gap-2">
            <span className="text-xs text-slate-500 uppercase tracking-wide">Trending:</span>
            <div className="flex gap-1.5">
              {derivedStats.topTickers.map(ticker => (
                <Badge 
                  key={ticker}
                  variant="outline" 
                  className="bg-slate-800/50 border-slate-700 text-slate-300 font-mono text-xs"
                >
                  {ticker}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: News List */}
        <div className="w-[420px] flex-shrink-0 border-r border-slate-800 flex flex-col">
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {isLoading ? (
                [...Array(8)].map((_, i) => (
                  <div key={i} className="p-3 rounded-lg bg-slate-900/50 animate-pulse">
                    <div className="h-4 w-3/4 bg-slate-800 rounded mb-2" />
                    <div className="h-3 w-1/2 bg-slate-800 rounded" />
                  </div>
                ))
              ) : articles.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <Globe className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No signals detected</p>
                  <p className="text-sm">Check back later or adjust filters</p>
                </div>
              ) : (
                articles.map((article) => (
                  <NewsListItem
                    key={article.id}
                    article={article}
                    isSelected={selectedArticle?.id === article.id}
                    onClick={() => {
                      setSelectedArticle(article);
                      setShowAI(false);
                    }}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right: Detail Panel */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-900/30">
          {!selectedArticle ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-slate-500">
                <Filter className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg">Select an article to view details</p>
                <p className="text-sm mt-1">Click any item from the list</p>
              </div>
            </div>
          ) : (
            <>
              {/* Article Header */}
              <div className="flex-shrink-0 p-6 border-b border-slate-800">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <SeverityBadge severity={selectedArticle.severity} />
                      <span className="text-xs text-slate-500">
                        {format(new Date(selectedArticle.detected_at), "MMM d, h:mm a")}
                      </span>
                      {selectedArticle.source && (
                        <Badge variant="outline" className="text-xs bg-slate-800/50 border-slate-700">
                          {selectedArticle.source}
                        </Badge>
                      )}
                    </div>
                    <h2 className="text-xl font-semibold text-white leading-tight">
                      {selectedArticle.title}
                    </h2>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant={showAI ? "default" : "outline"}
                      size="sm"
                      onClick={() => setShowAI(!showAI)}
                      className={cn(
                        "gap-2",
                        showAI 
                          ? "bg-purple-600 hover:bg-purple-700" 
                          : "border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                      )}
                    >
                      <Sparkles className="h-4 w-4" />
                      AI Analysis
                    </Button>
                    {selectedArticle.source_url && (
                      <Button variant="ghost" size="icon" asChild>
                        <a href={selectedArticle.source_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Content Area */}
              <ScrollArea className="flex-1">
                <div className="p-6 space-y-6">
                  {/* AI Panel (on-demand) */}
                  {showAI && (
                    <Card className="bg-gradient-to-br from-purple-950/40 to-slate-900/60 border-purple-500/20">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm flex items-center gap-2 text-purple-300">
                            <Sparkles className="h-4 w-4" />
                            AI Analysis
                          </CardTitle>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6"
                            onClick={() => setShowAI(false)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <AIAnalysisContent article={selectedArticle} />
                      </CardContent>
                    </Card>
                  )}

                  {/* Description */}
                  {selectedArticle.description && (
                    <div>
                      <h3 className="text-sm font-medium text-slate-400 mb-2">Summary</h3>
                      <p className="text-slate-300 leading-relaxed">
                        {selectedArticle.description}
                      </p>
                    </div>
                  )}

                  {/* Data Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Sentiment Gauge */}
                    <Card className="bg-slate-900/60 border-slate-800">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm text-slate-400">Sentiment</span>
                          <span className={cn(
                            "font-mono font-bold",
                            (selectedArticle.sentiment_score || 0) >= 0 ? "text-emerald-400" : "text-rose-400"
                          )}>
                            {(selectedArticle.sentiment_score || 0) >= 0 ? "+" : ""}
                            {((selectedArticle.sentiment_score || 0) * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div className="absolute inset-0 flex">
                            <div className="flex-1 bg-gradient-to-r from-rose-500 to-rose-500/0" />
                            <div className="flex-1 bg-gradient-to-l from-emerald-500 to-emerald-500/0" />
                          </div>
                          <div 
                            className="absolute top-0 w-3 h-full bg-white rounded-full shadow-lg"
                            style={{ 
                              left: `calc(${50 + (selectedArticle.sentiment_score || 0) * 50}% - 6px)` 
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                          <span>Bearish</span>
                          <span>Bullish</span>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Category */}
                    <Card className="bg-slate-900/60 border-slate-800">
                      <CardContent className="p-4">
                        <span className="text-sm text-slate-400">Category</span>
                        <div className="mt-2 flex items-center gap-2">
                          <Badge className="capitalize bg-slate-800 text-slate-300">
                            {selectedArticle.category || "General"}
                          </Badge>
                          {selectedArticle.severity && (
                            <Badge 
                              variant="outline"
                              className={cn(
                                "capitalize",
                                selectedArticle.severity === 'critical' && "border-rose-500/50 text-rose-400",
                                selectedArticle.severity === 'high' && "border-amber-500/50 text-amber-400",
                                selectedArticle.severity === 'medium' && "border-blue-500/50 text-blue-400"
                              )}
                            >
                              {selectedArticle.severity}
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Entities */}
                  {selectedArticle.entities && selectedArticle.entities.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Key Entities
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedArticle.entities.map((entity, i) => (
                          <Badge 
                            key={i} 
                            variant="secondary"
                            className="bg-slate-800 hover:bg-slate-700 transition-colors cursor-default"
                          >
                            {entity}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Related Markets */}
                  {selectedArticle.related_markets && selectedArticle.related_markets.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Affected Tickers
                      </h3>
                      <div className="grid grid-cols-3 gap-2">
                        {selectedArticle.related_markets.slice(0, 6).map((ticker) => (
                          <Card 
                            key={ticker}
                            className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-colors cursor-pointer"
                          >
                            <CardContent className="p-3 flex items-center justify-between">
                              <span className="font-mono font-bold text-white">{ticker}</span>
                              <ChevronRight className="h-4 w-4 text-slate-500" />
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// News List Item Component
function NewsListItem({ 
  article, 
  isSelected, 
  onClick 
}: { 
  article: NewsArticle; 
  isSelected: boolean; 
  onClick: () => void;
}) {
  const severityColor = {
    critical: "border-l-rose-500 bg-rose-950/20",
    high: "border-l-amber-500 bg-amber-950/10",
    medium: "border-l-blue-500 bg-blue-950/10",
    low: "border-l-slate-600",
  }[article.severity || 'low'] || "border-l-slate-600";

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-3 rounded-lg border-l-4 transition-all",
        severityColor,
        isSelected 
          ? "bg-slate-800 ring-1 ring-blue-500/50" 
          : "hover:bg-slate-800/50"
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <SeverityBadge severity={article.severity} compact />
        <span className="text-[11px] text-slate-500 whitespace-nowrap flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatDistanceToNow(new Date(article.detected_at), { addSuffix: true })}
        </span>
      </div>
      
      <h4 className="text-sm font-medium text-white line-clamp-2 leading-tight mb-1.5">
        {article.title}
      </h4>
      
      <div className="flex items-center gap-2 text-xs">
        {article.source && (
          <span className="text-slate-500 truncate max-w-[120px]">{article.source}</span>
        )}
        {article.sentiment_score !== null && (
          <span className={cn(
            "flex items-center gap-0.5",
            article.sentiment_score >= 0 ? "text-emerald-500" : "text-rose-500"
          )}>
            {article.sentiment_score >= 0 ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {Math.abs(article.sentiment_score * 100).toFixed(0)}%
          </span>
        )}
        {article.related_markets && article.related_markets.length > 0 && (
          <span className="text-slate-500">
            {article.related_markets.length} ticker{article.related_markets.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>
    </button>
  );
}

// Severity Badge Component
function SeverityBadge({ severity, compact }: { severity: string | null; compact?: boolean }) {
  const config = {
    critical: { label: "BREAKING", emoji: "🔴", className: "bg-rose-500/20 text-rose-400 border-rose-500/30" },
    high: { label: "ALERT", emoji: "🟡", className: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
    medium: { label: "UPDATE", emoji: "🔵", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
    low: { label: "NEWS", emoji: "", className: "bg-slate-500/20 text-slate-400 border-slate-500/30" },
  }[severity || 'low'] || { label: "NEWS", emoji: "", className: "bg-slate-500/20 text-slate-400 border-slate-500/30" };

  if (compact) {
    return (
      <span className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border",
        config.className
      )}>
        {config.emoji} {config.label}
      </span>
    );
  }

  return (
    <Badge variant="outline" className={cn("gap-1", config.className)}>
      {config.emoji} {config.label}
    </Badge>
  );
}

// AI Analysis Content Component
function AIAnalysisContent({ article }: { article: NewsArticle }) {
  const aiSentiment = article.ai_sentiment as Record<string, any> | null;
  const aiClassification = article.ai_classification as Record<string, any> | null;
  const aiInsight = article.ai_insight;

  // Check if we have any AI data
  const hasAIData = aiSentiment || aiClassification || aiInsight;

  if (!hasAIData) {
    return (
      <div className="text-center py-6 text-slate-400">
        <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">AI analysis not yet available for this article</p>
        <p className="text-xs text-slate-500 mt-1">Check back later for insights</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* AI Thesis */}
      {aiInsight?.thesis && (
        <div>
          <h4 className="text-xs font-medium text-purple-300 mb-1">Key Insight</h4>
          <p className="text-sm text-slate-300">{aiInsight.thesis}</p>
        </div>
      )}

      {/* Market Sentiment Impact */}
      {aiSentiment?.market_sentiment_impact && (
        <div>
          <h4 className="text-xs font-medium text-purple-300 mb-1">Market Impact</h4>
          <p className="text-sm text-slate-300">{aiSentiment.market_sentiment_impact}</p>
        </div>
      )}

      {/* Confidence & Impact Scores */}
      {(aiInsight?.confidence || aiInsight?.impact_score) && (
        <div className="grid grid-cols-2 gap-3">
          {aiInsight.confidence && (
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">Confidence</span>
                <span className="text-purple-300">{(aiInsight.confidence * 100).toFixed(0)}%</span>
              </div>
              <Progress value={aiInsight.confidence * 100} className="h-1.5 bg-slate-800" />
            </div>
          )}
          {aiInsight.impact_score && (
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">Impact</span>
                <span className="text-purple-300">{aiInsight.impact_score}/10</span>
              </div>
              <Progress value={aiInsight.impact_score * 10} className="h-1.5 bg-slate-800" />
            </div>
          )}
        </div>
      )}

      {/* Related Tickers from AI */}
      {aiInsight?.related_tickers && aiInsight.related_tickers.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-purple-300 mb-2">AI-Identified Tickers</h4>
          <div className="flex flex-wrap gap-1.5">
            {aiInsight.related_tickers.map((ticker: string) => (
              <Badge key={ticker} variant="outline" className="font-mono text-xs border-purple-500/30 text-purple-300">
                {ticker}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
