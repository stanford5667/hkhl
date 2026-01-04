import { useState } from "react";
import { 
  Zap, 
  RefreshCw, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  Newspaper,
  Clock,
  ExternalLink,
  Sparkles,
  Target
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useNewsIntelligence, NewsArticle, NewsCategory, NewsSeverity, TimeRange } from "@/hooks/useNewsIntelligence";
import { formatDistanceToNow } from "date-fns";
import { QuickStats } from "@/components/news/QuickStats";
import { ActivityPulse } from "@/components/news/ActivityPulse";

// Breaking News Hero Component
function BreakingNewsHero({ article }: { article: NewsArticle }) {
  return (
    <Card className="bg-gradient-to-r from-rose-950/50 to-slate-900/80 border-rose-500/30 backdrop-blur-sm animate-fade-in">
      <CardContent className="p-4 flex items-center gap-4">
        <div className="p-3 rounded-lg bg-rose-500/20 animate-pulse">
          <AlertTriangle className="h-6 w-6 text-rose-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="destructive" className="text-xs uppercase tracking-wider">
              Breaking
            </Badge>
            <span className="text-xs text-rose-400">
              {formatDistanceToNow(new Date(article.detected_at), { addSuffix: true })}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-white truncate">{article.title}</h3>
          {article.description && (
            <p className="text-sm text-slate-400 line-clamp-1 mt-1">{article.description}</p>
          )}
        </div>
        <Button variant="outline" size="sm" className="border-rose-500/30 text-rose-400 hover:bg-rose-500/10">
          View Details
        </Button>
      </CardContent>
    </Card>
  );
}


// News Feed List Component
function NewsFeedList({ 
  articles, 
  selectedId,
  onSelect 
}: { 
  articles: NewsArticle[]; 
  selectedId: string | null;
  onSelect: (article: NewsArticle) => void;
}) {
  const getSeverityColor = (severity: string | null) => {
    switch (severity) {
      case 'critical': return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      case 'high': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'medium': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const getSentimentIndicator = (score: number | null) => {
    if (score === null) return null;
    if (score > 0.2) return <TrendingUp className="h-3 w-3 text-emerald-400" />;
    if (score < -0.2) return <TrendingDown className="h-3 w-3 text-rose-400" />;
    return null;
  };

  return (
    <Card className="h-full bg-slate-900/80 border-slate-800 backdrop-blur-sm flex flex-col">
      <CardHeader className="pb-2 flex-shrink-0">
        <CardTitle className="text-sm font-medium text-slate-400 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Newspaper className="h-4 w-4 text-amber-400" />
            News Feed
          </span>
          <Badge variant="outline" className="text-xs">
            {articles.length} items
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full px-4 pb-4">
          <div className="space-y-2">
            {articles.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Newspaper className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No news articles found</p>
              </div>
            ) : (
              articles.map((article, index) => (
                <div
                  key={article.id}
                  onClick={() => onSelect(article)}
                  className={cn(
                    "p-3 rounded-lg border cursor-pointer transition-all animate-fade-in",
                    "hover:bg-slate-800/50 hover:border-slate-700",
                    selectedId === article.id 
                      ? "bg-slate-800 border-emerald-500/50" 
                      : "bg-slate-800/30 border-slate-800"
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {article.severity && (
                          <Badge variant="outline" className={cn("text-[10px] uppercase", getSeverityColor(article.severity))}>
                            {article.severity}
                          </Badge>
                        )}
                        {article.category && (
                          <Badge variant="outline" className="text-[10px] text-slate-500 border-slate-700">
                            {article.category}
                          </Badge>
                        )}
                        {getSentimentIndicator(article.sentiment_score)}
                      </div>
                      <h4 className="text-sm font-medium text-white line-clamp-2 leading-snug">
                        {article.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                        <Clock className="h-3 w-3" />
                        <span>{formatDistanceToNow(new Date(article.detected_at), { addSuffix: true })}</span>
                        {article.source && (
                          <>
                            <span>•</span>
                            <span>{article.source}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// Analysis Panel Component
function AnalysisPanel({ article }: { article: NewsArticle | null }) {
  if (!article) {
    return (
      <Card className="h-full bg-slate-900/80 border-slate-800 backdrop-blur-sm flex items-center justify-center">
        <div className="text-center text-slate-500">
          <Target className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Select an article to view analysis</p>
        </div>
      </Card>
    );
  }

  const sentimentLabel = article.sentiment_score !== null
    ? article.sentiment_score > 0.2 ? 'Positive' : article.sentiment_score < -0.2 ? 'Negative' : 'Neutral'
    : 'Unknown';

  const sentimentColor = article.sentiment_score !== null
    ? article.sentiment_score > 0.2 ? 'text-emerald-400' : article.sentiment_score < -0.2 ? 'text-rose-400' : 'text-slate-400'
    : 'text-slate-400';

  return (
    <Card className="h-full bg-slate-900/80 border-slate-800 backdrop-blur-sm flex flex-col">
      <CardHeader className="pb-2 flex-shrink-0 border-b border-slate-800">
        <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-400" />
          AI Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full p-4">
          <div className="space-y-4">
            {/* Article Title */}
            <div>
              <h3 className="text-lg font-semibold text-white leading-snug">{article.title}</h3>
              {article.source_url && (
                <a 
                  href={article.source_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:underline flex items-center gap-1 mt-1"
                >
                  View source <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>

            {/* Description */}
            {article.description && (
              <div className="p-3 rounded-lg bg-slate-800/50">
                <p className="text-sm text-slate-300 leading-relaxed">{article.description}</p>
              </div>
            )}

            {/* Sentiment Score */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-slate-800/50">
                <div className="text-xs text-slate-500 mb-1">Sentiment</div>
                <div className={cn("text-lg font-bold", sentimentColor)}>
                  {sentimentLabel}
                </div>
                {article.sentiment_score !== null && (
                  <div className="text-xs text-slate-500">
                    Score: {(article.sentiment_score * 100).toFixed(0)}%
                  </div>
                )}
              </div>
              <div className="p-3 rounded-lg bg-slate-800/50">
                <div className="text-xs text-slate-500 mb-1">Severity</div>
                <div className={cn(
                  "text-lg font-bold capitalize",
                  article.severity === 'critical' ? 'text-rose-400' :
                  article.severity === 'high' ? 'text-amber-400' :
                  article.severity === 'medium' ? 'text-blue-400' : 'text-slate-400'
                )}>
                  {article.severity || 'Unknown'}
                </div>
              </div>
            </div>

            {/* Entities */}
            {article.entities && article.entities.length > 0 && (
              <div>
                <div className="text-xs text-slate-500 mb-2">Detected Entities</div>
                <div className="flex flex-wrap gap-2">
                  {article.entities.map((entity, i) => (
                    <Badge key={i} variant="outline" className="text-xs bg-slate-800 border-slate-700">
                      {entity}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Related Markets */}
            {article.related_markets && article.related_markets.length > 0 && (
              <div>
                <div className="text-xs text-slate-500 mb-2">Related Markets</div>
                <div className="flex flex-wrap gap-2">
                  {article.related_markets.map((market, i) => (
                    <Badge key={i} variant="outline" className="text-xs bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
                      {market}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* AI Insight */}
            {article.ai_insight && (
              <div className="p-3 rounded-lg bg-violet-500/10 border border-violet-500/20">
                <div className="text-xs text-violet-400 mb-2 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> AI Thesis
                </div>
                {article.ai_insight.thesis && (
                  <p className="text-sm text-slate-300">{article.ai_insight.thesis}</p>
                )}
                {article.ai_insight.related_tickers && article.ai_insight.related_tickers.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {article.ai_insight.related_tickers.map((ticker, i) => (
                      <Badge key={i} className="text-xs bg-violet-500/20 text-violet-300">
                        ${ticker}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// Main Page Component
export default function NewsIntelligence() {
  const [category, setCategory] = useState<NewsCategory>('all');
  const [severity, setSeverity] = useState<NewsSeverity>('all');
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);

  const { articles, isLoading, stats, refetch } = useNewsIntelligence({
    category,
    severity,
    timeRange,
  });

  // Find breaking news (most recent critical article)
  const breakingNews = articles.find(a => a.severity === 'critical');

  return (
    <div className="p-6 space-y-4 bg-[#0a0a0f] min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Intelligence Feed</h1>
            <p className="text-sm text-slate-500">AI-powered market signal detection</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Live Indicator */}
          <Badge variant="outline" className="bg-emerald-500/10 border-emerald-500/30 text-emerald-400 gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            LIVE
          </Badge>

          {/* Time Range Filter */}
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
            <SelectTrigger className="w-24 bg-slate-900 border-slate-800 text-slate-300 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800">
              <SelectItem value="1h">1 hour</SelectItem>
              <SelectItem value="24h">24 hours</SelectItem>
              <SelectItem value="7d">7 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>

          {/* Category Filter */}
          <Select value={category} onValueChange={(v) => setCategory(v as NewsCategory)}>
            <SelectTrigger className="w-32 bg-slate-900 border-slate-800 text-slate-300 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800">
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="politics">Politics</SelectItem>
              <SelectItem value="crypto">Crypto</SelectItem>
              <SelectItem value="economics">Economics</SelectItem>
              <SelectItem value="tech">Tech</SelectItem>
              <SelectItem value="sports">Sports</SelectItem>
              <SelectItem value="science">Science</SelectItem>
              <SelectItem value="entertainment">Entertainment</SelectItem>
            </SelectContent>
          </Select>

          {/* Severity Filter */}
          <Select value={severity} onValueChange={(v) => setSeverity(v as NewsSeverity)}>
            <SelectTrigger className="w-28 bg-slate-900 border-slate-800 text-slate-300 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800">
              <SelectItem value="all">All Severity</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>

          {/* Refresh Button */}
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => refetch()}
            className="bg-slate-900 border-slate-800 text-slate-400 hover:text-white h-9 w-9"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-12 gap-4">
        {/* Breaking News - spans full width when present */}
        {breakingNews && (
          <div className="col-span-12">
            <BreakingNewsHero article={breakingNews} />
          </div>
        )}
        
        {/* Top Row Widgets */}
        <div className="col-span-12 lg:col-span-6 h-44">
          <ActivityPulse articles={articles} />
        </div>
        <div className="col-span-12 lg:col-span-6 h-44">
          <QuickStats stats={{
            ...stats,
            marketsAffected: articles.filter(a => a.related_markets && a.related_markets.length > 0).length
          }} />
        </div>
        
        {/* Main Content */}
        <div className="col-span-12 lg:col-span-7 h-[500px]">
          <NewsFeedList 
            articles={articles} 
            selectedId={selectedArticle?.id || null}
            onSelect={setSelectedArticle} 
          />
        </div>
        <div className="col-span-12 lg:col-span-5 h-[500px]">
          <AnalysisPanel article={selectedArticle} />
        </div>
      </div>
    </div>
  );
}
